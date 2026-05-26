# Contract: fetchPosts 共有関数

## 概要

`src/lib/posts.ts` に定義する `fetchPosts()` 関数のインターフェース。
Server Component（`page.tsx`）と API Route（`route.ts`）の両方から呼ばれる。

## 関数シグネチャ

```typescript
type FetchPostsOptions = {
  cursor?: string | null;  // base64 エンコードされた投稿 ID
  limit?: number;          // デフォルト 20、最大 50
};

type FetchPostsResult = {
  posts: Array<{
    id: number;
    content: string;
    hiddenAt: Date;
    createdAt: Date;
  }>;
  nextCursor: string | null;  // base64 エンコードされた次ページカーソル
};

export async function fetchPosts(options?: FetchPostsOptions): Promise<FetchPostsResult>
```

## 動作仕様

- `cursor` が指定された場合: base64 デコード → `Number.isSafeInteger()` かつ `> 0` を検証し、不正な場合は `Error` をスロー（呼び出し側でハンドリング）
- `limit` は `Math.min(limit, 50)` で上限適用、デフォルト 20
- 非表示・削除済み投稿を除外（`hiddenAt > NOW()`、`deletedAt IS NULL`）
- `id DESC` 順でページネーション

## 呼び出し元別の利用方法

### Server Component（`page.tsx`）

```typescript
import { fetchPosts } from "@/lib/posts";
const { posts, nextCursor } = await fetchPosts();
```

### API Route（`route.ts` GET ハンドラ）

```typescript
import { fetchPosts } from "@/lib/posts";
const cursor = searchParams.get("cursor");
const limit = Number(searchParams.get("limit") ?? 20);
const result = await fetchPosts({ cursor, limit });
return NextResponse.json(result);
```

## 既存の GET /api/posts エンドポイント仕様（変更なし）

クライアント（無限スクロール）からは引き続き HTTP API を使用する。エンドポイントの仕様は変更しない。

| 項目 | 値 |
|------|-----|
| メソッド | GET |
| パス | `/api/posts` |
| クエリパラメータ | `cursor` (optional), `limit` (optional, default 20, max 50) |
| レスポンス | `{ posts: Post[], nextCursor: string \| null }` |
| エラー（不正 cursor） | `{ error: "Invalid cursor" }` 400 |
