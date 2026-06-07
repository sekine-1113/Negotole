# API Contracts: 管理者用アカウント凍結機能

全エンドポイント共通:
- **認証**: `session.user.role === "admin"` 必須
- **エラー形式**: `{ "error": "<message>" }`

---

## GET /api/admin/users

ユーザー一覧を返す。

### Query Parameters

| パラメータ | 型 | 必須 | 説明 |
|---|---|---|---|
| frozen | `"true"` \| `"false"` | No | 凍結中のみ絞り込み |

### Response 200

```json
{
  "users": [
    {
      "id": 1,
      "name": "ゲスト",
      "email": null,
      "role": "user",
      "bannedAt": null,
      "createdAt": "2026-01-01T00:00:00.000Z"
    },
    {
      "id": 2,
      "name": "Alice",
      "email": "alice@example.com",
      "role": "user",
      "bannedAt": "2026-06-07T10:00:00.000Z",
      "createdAt": "2026-01-15T00:00:00.000Z"
    }
  ]
}
```

### Errors

| Status | Condition |
|---|---|
| 401 | 未認証 |
| 403 | 管理者以外 |

---

## POST /api/admin/users/[id]/freeze

指定ユーザーを凍結する。

### Request Body

```json
{
  "reason": "不適切な投稿を繰り返したため"
}
```

| フィールド | 型 | 必須 | 説明 |
|---|---|---|---|
| reason | string | No | 凍結理由（省略時: "理由未記載"） |

### Response 200

```json
{ "success": true }
```

### Errors

| Status | Condition |
|---|---|
| 400 | 無効なユーザーID / 管理者自身を凍結しようとした / すでに凍結済み |
| 401 | 未認証 |
| 403 | 管理者以外 |
| 404 | 対象ユーザーが存在しない |

---

## POST /api/admin/users/[id]/unfreeze

指定ユーザーの凍結を解除する。

### Request Body

なし

### Response 200

```json
{ "success": true }
```

### Errors

| Status | Condition |
|---|---|
| 400 | 無効なユーザーID / 凍結されていないユーザー |
| 401 | 未認証 |
| 403 | 管理者以外 |
| 404 | 対象ユーザーが存在しない |
