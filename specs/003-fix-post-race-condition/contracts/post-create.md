# Contract: POST /api/posts

**Version**: 2.0 (競合状態修正後)

---

## リクエスト

```
POST /api/posts
Content-Type: application/json
Authorization: Session Cookie (NextAuth)
```

```json
{
  "content": "string (1-255文字)",
  "duration": 60 | 180 | 360 | 720 | 1440
}
```

---

## レスポンス

### 201 Created — 投稿成功

```json
{
  "post": {
    "id": 1,
    "content": "投稿本文",
    "hiddenAt": "2024-01-01T12:00:00.000Z",
    "createdAt": "2024-01-01T09:00:00.000Z"
  }
}
```

**保証**: `post` レコードと `user_point(-1)` レコードが両方作成されている。

### 400 Bad Request — バリデーションエラー

```json
{ "error": "content must be 1-255 characters" }
{ "error": "Invalid duration" }
{ "error": "Invalid JSON" }
```

### 401 Unauthorized — 未ログイン

```json
{ "error": "Unauthorized" }
```

### 402 Payment Required — ポイント残高不足

```json
{ "error": "Insufficient points" }
```

**保証**: `post` レコードは作成されていない（ロールバック済み）。

---

## 変更点（v1 → v2）

| 項目 | v1（修正前） | v2（修正後） |
|---|---|---|
| 残高チェック | トランザクション外（非アトミック） | トランザクション内 + FOR UPDATE |
| 投稿作成 | トランザクション外 | トランザクション内 |
| ポイント消費 | トランザクション外 | トランザクション内 |
| API インターフェース | — | 変更なし（FR-004 準拠） |

---

## 不変条件

1. `POST /api/posts` が 201 を返した場合: `post` レコードと `user_point(-1)` レコードが必ず両方存在する
2. `POST /api/posts` が 402 を返した場合: いかなるレコードも作成されていない
3. 同一ユーザーが残高 1pt で同時に N 件のリクエストを送った場合: 成功は最大 1 件、残高は 0pt になる（負にはならない）
