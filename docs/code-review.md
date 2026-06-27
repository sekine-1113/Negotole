# コードレビュー結果 — dev ブランチ（028 マージ後）

対象: `dev` ブランチ（PR #300 マージ後の状態）
レビュー日: 2026-06-28

> 過去のレビュー結果（026 ブランチ対象）は `archive/code-review-result.md` に移動済み。
> 026 で指摘された 15 件はすべて修正済みであることを確認。

---

## 発見一覧

### 🟠 HIGH

#### 1. `auth.ts:12-26` — `checkUserFrozen` のキャッシュが機能しない

`unstable_cache` を関数スコープ内で毎回呼び出しているため、Next.js のキャッシュが有効にならない。
`unstable_cache` はモジュールレベルで定義しないとリクエスト間でキャッシュが共有されない。
結果として凍結チェックが毎リクエスト DB クエリになり、`proxy.ts` が全リクエストで走るため高負荷になる。

```ts
// 現状（キャッシュが効かない）
async function checkUserFrozen(userId: number) {
  const check = unstable_cache(          // ← 毎回新しいインスタンス
    async () => { ... },
    [`user-frozen-${userId}`],
    { tags: [`user-frozen-${userId}`] },
  );
  return check();
}
```

**修正:** `checkUserFrozen` 自体を廃止し、`jwt` コールバック内でキャッシュされたクエリを直接呼ぶか、
モジュールレベルで `userId` を引数とするキャッシュ関数を別途定義する。

---

#### 2. `lib/points.ts:56-85` — `hasDailyPointToday` + `grantDailyPoints` の TOCTOU 競合

check-then-act が DB レベルで非アトミック。同一ユーザーへの並行リクエストが来ると二重付与の可能性がある。
`bug-fix.md`（archive）の Bug 3 で指摘済みだが未修正。

```
[リクエスト A] hasDailyPointToday() → false
[リクエスト B] hasDailyPointToday() → false  ← A の INSERT 前に読んでしまう
[リクエスト A] grantDailyPoints() → INSERT 10pt
[リクエスト B] grantDailyPoints() → INSERT 10pt  ← 二重付与
```

**修正案:**
```sql
-- user_point テーブルに部分 UNIQUE 制約を追加
CREATE UNIQUE INDEX user_point_daily_grant_uidx
  ON user_point (user_id, DATE(created_at AT TIME ZONE 'Asia/Tokyo'))
  WHERE get_point > 0 AND expires_at IS NOT NULL;
```
これにより DB レベルで 1日1件の付与が保証される。
または `INSERT ... ON CONFLICT DO NOTHING` パターンで競合を無視する。

---

### 🟡 MEDIUM

#### 3. `lib/db/schema.ts:99` — `report` の UNIQUE 制約と `onDelete: "set null"` の相性

```ts
reporterId: bigint(...).references(() => users.id, { onDelete: "set null" }),
// ...
uniqueIndex("report_post_reporter_uidx").on(t.postId, t.reporterId),
```

ユーザーが削除されると `reporterId = NULL` になる。PostgreSQL では NULL 同士は UNIQUE 制約で衝突しないため、
同一 `postId` に複数の `(postId, NULL)` エントリが存在できる。
ユーザー削除が多発する場合、1つの投稿に大量の匿名通報が積み上がる恐れがある。

**修正:** 部分 UNIQUE インデックス（`WHERE reporter_id IS NOT NULL`）に変更するか、
`onDelete: "cascade"` に変更して通報者削除時に通報も削除する。

---

#### 4. `components/GuestLoginButton.tsx:6` / `components/GuestPersistenceHandler.tsx:5` — 定数重複

```ts
// GuestLoginButton.tsx
const GUEST_TOKEN_KEY = "negotole_guest_token";

// GuestPersistenceHandler.tsx
const GUEST_TOKEN_KEY = "negotole_guest_token";
```

片方だけ変更するとゲスト永続化が壊れる。

**修正:** `lib/constants.ts` に `export const GUEST_TOKEN_KEY = "negotole_guest_token"` として切り出す。

---

### 🔵 LOW

#### 5. `auth.ts:164` / `app/api/posts/route.ts:129` — `revalidateTag` の第二引数

```ts
revalidateTag(`user-points-${token.userId}`, "max");
```

標準 Next.js の `revalidateTag(tag: string)` は1引数のみ。`"max"` は型エラーになるはずだが、
AGENTS.md に「This is NOT the Next.js you know」とあるため、カスタムビルドの可能性がある。
意図の明示またはコメントが欲しい。

---

#### 6. `lib/posts.ts:48` — サーバー専用 `Buffer.from` のコメントなし

```ts
const nextCursor = hasMore
  ? Buffer.from(String(raw[raw.length - 1].id)).toString("base64")
  : null;
```

`fetchPosts` はサーバー側専用で問題ないが、クライアント側では `btoa` を使うという方針が
コード内で一貫していない。（`Timeline.tsx` では `btoa` を使用）
ドキュメントコメントとして「サーバー専用」と書いておくと誤用を防げる。

---

## 修正優先度サマリー

| # | 重大度 | ファイル | 概要 |
|---|--------|----------|------|
| 1 | 🟠 HIGH | `auth.ts` | `unstable_cache` キャッシュ無効 |
| 2 | 🟠 HIGH | `lib/points.ts` | デイリーポイント二重付与 TOCTOU |
| 3 | 🟡 MEDIUM | `schema.ts` | report UNIQUE + onDelete 相性問題 |
| 4 | 🟡 MEDIUM | `GuestLoginButton.tsx` / `GuestPersistenceHandler.tsx` | 定数重複 |
| 5 | 🔵 LOW | `auth.ts` / `posts/route.ts` | `revalidateTag` 第二引数 |
| 6 | 🔵 LOW | `lib/posts.ts` | `Buffer.from` サーバー専用の明示なし |
