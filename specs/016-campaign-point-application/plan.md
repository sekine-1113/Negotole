# Implementation Plan: キャンペーンポイント適用ロジック

**Branch**: `016-campaign-point-application` | **Date**: 2026-06-07 | **Spec**: [spec.md](./spec.md)

**Input**: Feature specification from `specs/016-campaign-point-application/spec.md`

## Summary

現状「新規ユーザーのみ・常に恒久」だったキャンペーンポイント付与を「全ユーザー・1キャンペーン1回・恒久または期間限定」に刷新する。`campaign_application` テーブルで重複防止、`campaign.pointsType` カラムでポイント種別管理、ログイン時に全ユーザーを対象に未適用チェック付き付与を行う。

## Technical Context

**Language/Version**: TypeScript (Node.js 20)

**Primary Dependencies**:
- Next.js (App Router) — Server Components + Route Handlers + Client Components
- Drizzle ORM (`uniqueIndex`, `references` 等の既存パターン)
- `@neondatabase/serverless` (PostgreSQL)
- drizzle-kit（マイグレーション生成・適用）

**Storage**: PostgreSQL (Neon Serverless)

**Testing**: Vitest（既存）— 今回は手動確認のみ

**Target Platform**: Vercel (Node.js runtime)

**Project Type**: Web application (Next.js monorepo — `negotole/` 配下)

**Performance Goals**: ログイン時のキャンペーン付与チェックが 200ms 以内

**Constraints**: 既存キャンペーンデータとの後方互換性を維持（DEFAULT `'permanent'`）

**Scale/Scope**: 小規模。キャンペーンは同時1件のみ（既存制約）、ユーザー数は現時点では少量。

## Constitution Check

Constitution が未設定のため省略。違反なし。

## Project Structure

### Documentation (this feature)

```text
specs/016-campaign-point-application/
├── plan.md              # This file
├── research.md          # Phase 0 output
├── data-model.md        # Phase 1 output
├── contracts/
│   └── campaigns-api.md # Phase 1 output
└── tasks.md             # Phase 2 output (/speckit-tasks command)
```

### Source Code (変更ファイル)

```text
negotole/
├── src/
│   ├── lib/
│   │   ├── db/
│   │   │   └── schema.ts              # campaign.pointsType 追加、campaignApplications テーブル追加
│   │   ├── points.ts                  # hasCampaignApplied()・grantCampaignPoints() 更新
│   │   └── auth.ts                    # JWT コールバックのキャンペーン付与ロジック修正
│   └── app/
│       ├── api/
│       │   └── admin/
│       │       └── campaigns/
│       │           ├── route.ts       # POST: pointsType バリデーション追加
│       │           └── [id]/
│       │               └── route.ts   # PATCH: pointsType バリデーション追加
│       └── admin/
│           └── campaigns/
│               ├── new/
│               │   └── page.tsx       # pointsType フィールド追加
│               └── [id]/
│                   └── edit/
│                       └── page.tsx   # pointsType フィールド追加・表示
└── drizzle/
    └── XXXX_add_campaign_application.sql  # 自動生成
```

## Implementation Details

### T1: schema.ts — テーブル・カラム追加

`negotole/src/lib/db/schema.ts` を更新する：

1. `uniqueIndex` を `drizzle-orm/pg-core` のインポートに追加
2. `campaigns` テーブルに `pointsType` カラムを追加:
   ```typescript
   pointsType: varchar("points_type", { length: 20 }).notNull().default("permanent"),
   ```
3. `campaignApplications` テーブルを新規追加（`campaigns` テーブルの後に定義）:
   ```typescript
   export const campaignApplications = pgTable("campaign_application", {
     id: bigint("id", { mode: "number" }).primaryKey().generatedAlwaysAsIdentity(),
     campaignId: bigint("campaign_id", { mode: "number" }).notNull()
       .references(() => campaigns.id, { onDelete: "cascade" }),
     userId: bigint("user_id", { mode: "number" }).notNull()
       .references(() => users.id, { onDelete: "cascade" }),
     createdAt: timestamp("created_at").notNull().defaultNow(),
   }, (t) => [
     uniqueIndex("campaign_application_campaign_user_idx").on(t.campaignId, t.userId),
   ]);
   export type CampaignApplication = typeof campaignApplications.$inferSelect;
   ```

### T2: マイグレーション生成・適用

```bash
cd negotole
pnpm drizzle-kit generate
pnpm drizzle-kit migrate   # DATABASE_URL_UNPOOLED が必要
```

### T3: points.ts — 関数の更新

`negotole/src/lib/points.ts` を更新する：

1. `campaignApplications` を schema からインポートに追加（`eq` も追加）
2. `hasCampaignApplied(userId, campaignId)` 関数を追加
3. `grantCampaignPoints` のシグネチャを変更し、トランザクションで適用履歴とポイント付与を原子的に実行:
   ```typescript
   export async function grantCampaignPoints(
     userId: number,
     campaignId: number,
     bonusPoints: number,
     pointsType: string,
     endsAt: Date,
   ): Promise<void> {
     const expiresAt = pointsType === "limited" ? endsAt : null;
     await db.transaction(async (tx) => {
       await tx.insert(campaignApplications).values({ campaignId, userId });
       await tx.insert(userPoints).values({ userId, getPoint: bonusPoints, expiresAt });
     });
   }
   ```
   UNIQUE 制約違反（重複付与）は呼び出し元の catch でサイレント処理。

### T4: auth.ts — キャンペーン付与ロジック修正

`negotole/src/lib/auth.ts` を更新する：

- `hasCampaignApplied` を `points.ts` からインポートに追加
- `isNewUser === true` の条件ブロックを削除
- 全ユーザーに対してキャンペーン付与チェックを行うブロックを追加（`token.userId` 確定後）:
  ```typescript
  if (token.userId) {
    try {
      const campaign = await getActiveCampaign();
      if (campaign) {
        const alreadyApplied = await hasCampaignApplied(Number(token.userId), campaign.id);
        if (!alreadyApplied) {
          await grantCampaignPoints(
            Number(token.userId),
            campaign.id,
            campaign.bonusPoints,
            campaign.pointsType,
            campaign.endsAt,
          );
        }
      }
    } catch (e) {
      console.error("[auth] campaign point grant failed:", e);
    }
  }
  ```

### T5: API — pointsType バリデーション追加

`POST /api/admin/campaigns` (`route.ts`):
- `const { name, description, startsAt, endsAt, bonusPoints, pointsType } = body;`
- `pointsType` が指定されている場合、`["permanent", "limited"].includes(pointsType)` でバリデーション（失敗時 400）
- INSERT 時に `pointsType: pointsType ?? "permanent"` を追加

`PATCH /api/admin/campaigns/[id]` (`[id]/route.ts`):
- `body.pointsType` が指定されている場合、同様にバリデーション
- `updates.pointsType` に設定
- `updates` の型定義に `pointsType?: string` を追加

### T6: UI フォーム — pointsType 選択 UI 追加

`new/page.tsx`:
- `data.pointsType` を `handleSubmit` で収集するよう更新
- ポイント種別ラジオボタンを追加（デフォルト: `permanent`）

`[id]/edit/page.tsx`:
- `Campaign` 型に `pointsType: string` を追加
- `data.pointsType` を `handleSubmit` で収集
- ポイント種別ラジオボタンを追加（`campaign.pointsType` を初期値に設定）

**共通 UI（ダークテーマ対応）**:
```tsx
<div>
  <label className="block text-sm font-medium mb-2">ポイント種別 *</label>
  <div className="flex gap-6">
    <label className="flex items-center gap-2 cursor-pointer">
      <input type="radio" name="pointsType" value="permanent" defaultChecked={...} className="accent-indigo-500" />
      <span className="text-sm">恒久（無期限）</span>
    </label>
    <label className="flex items-center gap-2 cursor-pointer">
      <input type="radio" name="pointsType" value="limited" defaultChecked={...} className="accent-indigo-500" />
      <span className="text-sm">期間限定（キャンペーン終了日まで）</span>
    </label>
  </div>
</div>
```

## Complexity Tracking

違反なし。変更ファイル8件（schema.ts・points.ts・auth.ts・route.ts×2・page.tsx×2）＋マイグレーション自動生成。新規ファイルなし（マイグレーション除く）。
