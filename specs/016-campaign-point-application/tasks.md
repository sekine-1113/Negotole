# Tasks: キャンペーンポイント適用ロジック

**Input**: Design documents from `/specs/016-campaign-point-application/`

**Prerequisites**: plan.md ✅, spec.md ✅, research.md ✅, data-model.md ✅, contracts/ ✅

**Tests**: テスト自動化は要件に含まれていないため省略（手動検証タスクを最終フェーズに含む）

**Organization**: Foundational（スキーマ・マイグレーション）→ US1（全ユーザー対象の付与ロジック）→ US2（ポイント種別 UI）の順で実施する。US1 は Foundational 完了後に開始。US2 は US1 と並列可能な部分もある。

## Format: `[ID] [P?] [Story] Description`

- **[P]**: 並列実行可（異なるファイル、依存なし）
- **[Story]**: 対応するユーザーストーリー（US1, US2）

---

## Phase 1: Setup

**Purpose**: ビルドベースラインを確認する

- [x] T001 `negotole/` で `pnpm build` を実行し現在のビルドがエラーなく通ることを確認する

**Checkpoint**: ベースライン確認完了

---

## Phase 2: Foundational — スキーマ変更・マイグレーション

**Purpose**: US1・US2 の両方が依存するDB スキーマ変更とマイグレーションを完了させる

**⚠️ CRITICAL**: このフェーズが完了するまで US1・US2 の実装を開始しない

- [x] T002 `negotole/src/lib/db/schema.ts` を更新する。`uniqueIndex` を `drizzle-orm/pg-core` のインポートに追加する。`campaigns` テーブルの `bonusPoints` の後に `pointsType: varchar("points_type", { length: 20 }).notNull().default("permanent")` を追加する。`campaigns` テーブル定義の後（ファイル末尾の type export の前）に `campaignApplications` テーブルを追加する: `export const campaignApplications = pgTable("campaign_application", { id: bigint("id", { mode: "number" }).primaryKey().generatedAlwaysAsIdentity(), campaignId: bigint("campaign_id", { mode: "number" }).notNull().references(() => campaigns.id, { onDelete: "cascade" }), userId: bigint("user_id", { mode: "number" }).notNull().references(() => users.id, { onDelete: "cascade" }), createdAt: timestamp("created_at").notNull().defaultNow() }, (t) => [uniqueIndex("campaign_application_campaign_user_idx").on(t.campaignId, t.userId)]); export type CampaignApplication = typeof campaignApplications.$inferSelect;`
- [x] T003 `negotole/` で `pnpm drizzle-kit generate` を実行し、`campaign.points_type` カラム追加と `campaign_application` テーブル作成の SQL マイグレーションファイルを `negotole/drizzle/` に生成する（T002 完了後）
- [x] T004 `negotole/` で `pnpm drizzle-kit migrate` を実行し、生成されたマイグレーションを Neon DB に適用する（T003 完了後、`DATABASE_URL_UNPOOLED` 環境変数が必要）

**Checkpoint**: Foundational 完了 — US1・US2 の実装を開始できる

---

## Phase 3: User Story 1 — キャンペーン期間中にログインしたユーザーがボーナスポイントを受け取る (Priority: P1) 🎯 MVP

**Goal**: 全ユーザー（新規・既存問わず）がアクティブなキャンペーン期間中にログインしたとき、未適用であれば自動でボーナスポイントが付与される。同一ユーザー・同一キャンペーンは1回のみ。

**Independent Test**: アクティブなキャンペーンがある状態で既存ユーザーがログインし、ポイント残高にキャンペーンボーナスが加算されることを確認する。再ログインでは加算されないことを確認する。

### Implementation for User Story 1

- [x] T005 [US1] `negotole/src/lib/points.ts` を更新する。インポートに `campaignApplications` を `@/lib/db/schema` から追加し、`eq` を `drizzle-orm` のインポートに追加する。`hasCampaignApplied(userId: number, campaignId: number): Promise<boolean>` 関数を追加する: `return (await db.select({ id: campaignApplications.id }).from(campaignApplications).where(and(eq(campaignApplications.userId, userId), eq(campaignApplications.campaignId, campaignId))).limit(1)).length > 0`。既存の `grantCampaignPoints(userId, bonusPoints)` のシグネチャを `grantCampaignPoints(userId: number, campaignId: number, bonusPoints: number, pointsType: string, endsAt: Date): Promise<void>` に変更し、関数本体を `const expiresAt = pointsType === "limited" ? endsAt : null; await db.transaction(async (tx) => { await tx.insert(campaignApplications).values({ campaignId, userId }); await tx.insert(userPoints).values({ userId, getPoint: bonusPoints, expiresAt }); });` に置き換える
- [x] T006 [US1] `negotole/src/lib/auth.ts` を更新する。`hasCampaignApplied` を `@/lib/points` のインポートに追加する。JWT コールバック内の `if (token.isNewUser === true) { ... }` ブロックを完全に削除する。`token.userId` が確定した後（デイリーポイント付与ブロックの後）に、全ユーザー向けのキャンペーン付与ブロックを追加する: `if (token.userId) { try { const campaign = await getActiveCampaign(); if (campaign) { const alreadyApplied = await hasCampaignApplied(Number(token.userId), campaign.id); if (!alreadyApplied) { await grantCampaignPoints(Number(token.userId), campaign.id, campaign.bonusPoints, campaign.pointsType, campaign.endsAt); } } } catch (e) { console.error("[auth] campaign point grant failed:", e); } }`
- [x] T007 [US1] `negotole/` で `pnpm build` を実行し TypeScript の型エラーがないことを確認する（T005・T006 完了後）

**Checkpoint**: US1 完了 — 既存ユーザーもキャンペーンポイントを受け取れる

---

## Phase 4: User Story 2 — キャンペーンのポイントに期限を設定できる (Priority: P2)

**Goal**: 管理者がキャンペーン作成・編集フォームでポイント種別（恒久/期間限定）を選択できる。API もバリデーションを追加する。

**Independent Test**: キャンペーン作成フォームに「ポイント種別」のラジオボタンが表示され、「期間限定」を選択して保存したキャンペーンのポイントが付与されたとき、有効期限がキャンペーン終了日になることを確認する。

### Implementation for User Story 2

- [x] T008 [P] [US2] `negotole/src/app/api/admin/campaigns/route.ts` の `POST` ハンドラを更新する。`const { name, description, startsAt, endsAt, bonusPoints, pointsType } = body;` に `pointsType` を追加する。`pointsType` の値が `undefined` でない場合、`["permanent", "limited"].includes(pointsType)` でバリデーションし、失敗時は `NextResponse.json({ error: "pointsType は permanent または limited を指定してください。" }, { status: 400 })` を返す。`db.insert(campaigns).values(...)` に `pointsType: pointsType ?? "permanent"` を追加する
- [x] T009 [P] [US2] `negotole/src/app/api/admin/campaigns/[id]/route.ts` の `PATCH` ハンドラを更新する。`updates` オブジェクトの型定義 `Partial<{...}>` に `pointsType?: string` を追加する。`body.pointsType` が存在する場合、`["permanent", "limited"].includes(body.pointsType)` でバリデーションし、失敗時は 400 を返す。合格時は `updates.pointsType = body.pointsType` を設定する
- [x] T010 [P] [US2] `negotole/src/app/admin/campaigns/new/page.tsx` を更新する。`data` オブジェクトに `pointsType: (form.elements.namedItem("pointsType") as HTMLInputElement).value` を追加する（`handleSubmit` 内）。フォームに `pointsType` ラジオボタンを追加する（`bonusPoints` フィールドの下）: `<div><label className="block text-sm font-medium mb-2">ポイント種別 <span className="text-red-500">*</span></label><div className="flex gap-6"><label className="flex items-center gap-2 cursor-pointer"><input type="radio" name="pointsType" value="permanent" defaultChecked className="accent-indigo-500" /><span className="text-sm">恒久（無期限）</span></label><label className="flex items-center gap-2 cursor-pointer"><input type="radio" name="pointsType" value="limited" className="accent-indigo-500" /><span className="text-sm">期間限定（キャンペーン終了日まで）</span></label></div></div>`
- [x] T011 [US2] `negotole/src/app/admin/campaigns/[id]/edit/page.tsx` を更新する。`Campaign` 型に `pointsType: string` を追加する。`data` オブジェクトに `pointsType: (form.elements.namedItem("pointsType") as HTMLInputElement).value` を追加する（`handleSubmit` 内）。フォームに `pointsType` ラジオボタンを追加する（`bonusPoints` フィールドの下）。各 `defaultChecked` を `campaign!.pointsType === "permanent"` と `campaign!.pointsType === "limited"` で設定する

**Checkpoint**: US2 完了 — ポイント種別を選択してキャンペーンを作成・編集できる

---

## Phase 5: Polish & Cross-Cutting Concerns

**Purpose**: 最終ビルド確認と手動動作検証

- [x] T012 `negotole/` で `pnpm build` を実行し TypeScript 型チェックとビルドが成功することを確認する
- [ ] T013 [P] 既存ユーザー（Google ログイン）でアクティブなキャンペーン期間中にログインし、ポイント残高にキャンペーンボーナスが加算されることをブラウザで確認する。再ログインでは加算されないことも確認する
- [ ] T014 [P] 管理画面でキャンペーン新規作成フォームを開き、「ポイント種別」ラジオボタンが表示され、「期間限定」を選択して保存できることを確認する

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (Phase 1)**: 依存なし — 即開始可能
- **Foundational (Phase 2)**: Phase 1 完了後 — US1・US2 の両方をブロック
- **US1 (Phase 3)**: Phase 2 完了後に開始
- **US2 (Phase 4)**: Phase 2 完了後に開始（US1 と並行可）
- **Polish (Phase 5)**: US1・US2 の両方が完了した後

### User Story Dependencies

- **US1 (P1)**: T005（points.ts）→ T006（auth.ts）→ T007（ビルド確認）の順
- **US2 (P2)**: T008・T009・T010 は並列実行可。T011 は独立して実施可

### Within Each User Story

- US1: points.ts 更新（T005）→ auth.ts 更新（T006）— auth.ts は更新された grantCampaignPoints を使うため T005 が先
- US2: API（T008・T009）と UI・new（T010）は並列可。edit（T011）は独立

### Parallel Opportunities

- T002（schema.ts）は他に依存しないため即開始可
- T008・T009・T010 は異なるファイルなので並列実行可
- T013・T014 の手動確認は独立して並列実施可

---

## Parallel Example

```bash
# Foundational 内は逐次（スキーマ → 生成 → 適用）:
T002 → T003 → T004

# US1 と US2 の一部を並列開始:
Task: T005 "Update negotole/src/lib/points.ts"
Task: T008 "Update negotole/src/app/api/admin/campaigns/route.ts (POST pointsType)"
Task: T009 "Update negotole/src/app/api/admin/campaigns/[id]/route.ts (PATCH pointsType)"
Task: T010 "Update negotole/src/app/admin/campaigns/new/page.tsx"

# T005 完了後:
Task: T006 "Update negotole/src/lib/auth.ts"
```

---

## Implementation Strategy

### MVP First (User Story 1 Only)

1. Phase 1: ビルド確認（T001）
2. Phase 2: スキーマ変更 + マイグレーション（T002 → T003 → T004）
3. Phase 3 (US1): points.ts + auth.ts 更新（T005 → T006 → T007）
4. **STOP and VALIDATE**: 既存ユーザーでキャンペーンポイントが付与されることを確認
5. デモ可能な状態

### Incremental Delivery

1. Setup + Foundational → DB スキーマ準備
2. US1 完了 → 全ユーザー対象キャンペーンポイント付与が機能
3. US2 完了 → 管理者がポイント種別を選択可能に
4. Polish: ビルド・手動検証

---

## Notes

- [P] タスクは異なるファイルを扱い依存なし（並列実行可）
- T004（`drizzle-kit migrate`）には `DATABASE_URL_UNPOOLED` 環境変数が必要
- T006 では `isNewUser` 関連のコードを完全に削除する（`token.isNewUser = false` の行も不要になる）
- `grantCampaignPoints` の UNIQUE 制約違反は catch でサイレント処理済みなので、T006 では特別な対処不要
- T011 の編集フォームは `campaign.pointsType` が初期値として必要なため、API レスポンスに `pointsType` が含まれることが前提（T008 完了後に API 側で返されるようになる）
