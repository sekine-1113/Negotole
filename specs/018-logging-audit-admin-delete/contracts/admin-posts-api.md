# API Contract: DELETE /api/admin/posts/[id]

## エンドポイント

```
DELETE /api/admin/posts/:id
```

## 認証・認可

- **認証**: セッション必須（未認証 → 401）
- **認可**: `role === "admin"` のみ（一般ユーザー → 403）

## パスパラメータ

| パラメータ | 型 | 説明 |
|---|---|---|
| `id` | 整数文字列 | 削除対象の投稿 ID |

## 処理内容

1. 投稿が存在し、かつ `deleted_at IS NULL` であることを確認
2. 対象投稿の `deleted_at` に現在日時を設定（論理削除）
3. `admin_audit_log` に `post.delete` イベントを記録
4. 構造化ログに `post.deleted_by_admin` イベントを出力

## レスポンス

### 200 OK

```json
{ "success": true }
```

### 400 Bad Request

パス ID が数値でない場合:

```json
{ "error": "Invalid id" }
```

### 401 Unauthorized

```json
{ "error": "Unauthorized" }
```

### 403 Forbidden

```json
{ "error": "Forbidden" }
```

### 404 Not Found

投稿が存在しない、または既に削除済みの場合:

```json
{ "error": "Post not found" }
```

## 重要事項

- **物理削除は行わない**。`post` テーブルのレコードはそのまま保持する
- 論理削除された投稿は `fetchPosts()` の `isNull(posts.deletedAt)` フィルタにより自動的にタイムラインから除外される
- 削除処理は `admin_audit_log` に必ず記録する
