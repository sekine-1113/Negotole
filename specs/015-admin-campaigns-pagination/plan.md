# Implementation Plan: 管理者キャンペーン一覧のページネーション

**Branch**: `015-admin-campaigns-pagination` | **Date**: 2026-06-06 | **Spec**: [spec.md](./spec.md)

**Input**: Feature specification from `specs/015-admin-campaigns-pagination/spec.md`

## Summary

`GET /api/admin/campaigns` が全キャンペーンを一括取得しており、運用期間が長くなると遅くなる問題を解決する。既存の `fetchPosts` と同じ ID ベースカーソルページネーションパターンを API と管理画面の両方に適用する。スキーマ変更なし、後方互換性を維持しながら `limit`・`cursor` クエリパラメータと `nextCursor` レスポンスフィールドを追加する。

## Technical Context

**Language/Version**: TypeScript (Node.js 20)

**Primary Dependencies**:
- Next.js (App Router) — Server Components + Route Handlers
- Drizzle ORM (`lt`, `desc`, `isNull` 等の既存インポート)
- `@neondatabase/serverless` (PostgreSQL)

**Storage**: PostgreSQL (Neon Serverless)

**Testing**: Vitest（既存）— 今回は手動確認のみ

**Target Platform**: Vercel (Node.js runtime)

**Project Type**: Web application (Next.js monorepo — `negotole/` 配下)

**Performance Goals**: 100 件キャンペーン時でも一覧表示が 1 秒以内

**Constraints**: 後方互換性を維持（既存 `campaigns` キーは変更しない）

**Scale/Scope**: 管理者のみが使用する画面。現時点のキャンペーン件数は少量だが将来的な増加に備える。

## Constitution Check

Constitution が未設定のため省略。違反なし。

## Project Structure

### Documentation (this feature)

```text
specs/015-admin-campaigns-pagination/
├── plan.md              # This file
├── research.md          # Phase 0 output
├── data-model.md        # Phase 1 output
├── contracts/
│   └── admin-campaigns-api.md   # Phase 1 output
└── tasks.md             # Phase 2 output (/speckit-tasks command)
```

### Source Code (変更ファイル)

```text
negotole/
└── src/
    └── app/
        ├── api/
        │   └── admin/
        │       └── campaigns/
        │           └── route.ts        # GET にページネーション追加
        └── admin/
            └── campaigns/
                └── page.tsx            # searchParams 対応 + ページナビゲーション UI 追加
```

## Implementation Details

### T1: `GET /api/admin/campaigns` のページネーション対応

`negotole/src/app/api/admin/campaigns/route.ts` の `GET` 関数を更新する:

```typescript
export async function GET(req: NextRequest) {
  // 認証・認可は既存のまま

  const { searchParams } = new URL(req.url);
  const rawLimit = Number(searchParams.get("limit") ?? 20);
  const limit = Number.isInteger(rawLimit) && rawLimit >= 1 ? Math.min(rawLimit, 100) : 20;
  const cursor = searchParams.get("cursor");

  let cursorId: number | null = null;
  if (cursor) {
    const decoded = Number(Buffer.from(cursor, "base64").toString());
    if (!Number.isSafeInteger(decoded) || decoded <= 0) {
      return NextResponse.json({ error: "Invalid cursor" }, { status: 400 });
    }
    cursorId = decoded;
  }

  const now = new Date();
  const rows = await db
    .select()
    .from(campaigns)
    .where(
      and(
        isNull(campaigns.deletedAt),
        cursorId ? lt(campaigns.id, cursorId) : undefined
      )
    )
    .orderBy(desc(campaigns.id))
    .limit(limit + 1);

  const hasMore = rows.length > limit;
  const items = hasMore ? rows.slice(0, limit) : rows;
  const nextCursor = hasMore
    ? Buffer.from(String(items[items.length - 1].id)).toString("base64")
    : null;

  const result = items.map((c) => ({
    ...c,
    isActive: c.startsAt <= now && c.endsAt >= now,
  }));

  return NextResponse.json({ campaigns: result, nextCursor });
}
```

**変更ポイント**:
- `lt` を `drizzle-orm` からインポートに追加
- `orderBy(desc(campaigns.createdAt))` → `orderBy(desc(campaigns.id))` に変更（ID は createdAt と一致）
- `limit + 1` 件取得して `hasMore` を判定
- レスポンスに `nextCursor` を追加

### T2: `/admin/campaigns/page.tsx` のページナビゲーション対応

`negotole/src/app/admin/campaigns/page.tsx` を更新する:

```typescript
type Props = {
  searchParams: Promise<{ cursor?: string; limit?: string }>;
};

export default async function AdminCampaignsPage({ searchParams }: Props) {
  const session = await auth();
  if (!session?.user || session.user.role !== "admin") {
    redirect("/");
  }

  const { cursor, limit: rawLimit } = await searchParams;
  const limit = 20;

  // DB を直接クエリ（API 経由ではなく Server Component として直接取得）
  let cursorId: number | null = null;
  if (cursor) {
    const decoded = Number(Buffer.from(cursor, "base64").toString());
    if (Number.isSafeInteger(decoded) && decoded > 0) {
      cursorId = decoded;
    }
  }

  const rows = await db
    .select()
    .from(campaigns)
    .where(
      and(
        isNull(campaigns.deletedAt),
        cursorId ? lt(campaigns.id, cursorId) : undefined
      )
    )
    .orderBy(desc(campaigns.id))
    .limit(limit + 1);

  const hasMore = rows.length > limit;
  const now = new Date();
  const items = (hasMore ? rows.slice(0, limit) : rows).map((c) => ({
    ...c,
    isActive: c.startsAt <= now && c.endsAt >= now,
  }));
  const nextCursor = hasMore
    ? Buffer.from(String(items[items.length - 1].id)).toString("base64")
    : null;

  // JSX: 既存のテーブルを維持しつつ「次のページ」リンクを追加
}
```

**ページナビゲーション UI**（テーブル下部に追加）:

```tsx
{nextCursor && (
  <div className="mt-4 flex justify-end">
    <Link
      href={`/admin/campaigns?cursor=${nextCursor}`}
      className="px-4 py-2 text-sm bg-gray-100 hover:bg-gray-200 rounded"
    >
      次のページ →
    </Link>
  </div>
)}
```

**注意**: Next.js App Router の `searchParams` は非同期（`Promise<...>`）なので `await` が必要。

## Complexity Tracking

違反なし。変更ファイル2件（route.ts、page.tsx）、スキーマ変更なし、新規ファイルなし。
