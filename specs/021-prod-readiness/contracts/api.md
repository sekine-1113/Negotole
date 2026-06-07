# API Contracts: 本番公開準備

**Branch**: `021-prod-readiness` | **Date**: 2026-06-07

---

## 変更される既存エンドポイント

### POST /api/posts

**変更内容**: レートリミットを追加（既存の認証チェック・DB ロジックは変更なし）

**Rate Limit**: ユーザー ID ベース、10 回 / 60 秒

**追加レスポンス**:

| Status | Body | 条件 |
|--------|------|------|
| 429 | `{"error": "Too Many Requests"}` | 閾値超過時 |

---

### GET /api/admin/users

**変更内容**: ページネーション追加 + レートリミット追加

**認証**: 管理者のみ（既存と同じ）

**Rate Limit**: ユーザー ID ベース、30 回 / 60 秒

**Request**:
```
GET /api/admin/users?limit=20&cursor=<base64>&frozen=true
```

| パラメータ | 型 | 必須 | 説明 |
|---|---|---|---|
| limit | number | No | 1ページあたりの件数（デフォルト 20、最大 100） |
| cursor | string | No | base64 エンコードされたカーソル（前ページレスポンスの nextCursor） |
| frozen | string | No | `"true"` のとき凍結ユーザーのみ返す |

**Response** (200):
```json
{
  "users": [
    {
      "id": 1,
      "name": "ユーザー名",
      "email": "user@example.com",
      "role": "user",
      "bannedAt": null,
      "createdAt": "2026-01-01T00:00:00.000Z"
    }
  ],
  "nextCursor": "base64string or null"
}
```

**追加レスポンス**:

| Status | Body | 条件 |
|--------|------|------|
| 400 | `{"error": "Invalid cursor"}` | cursor が不正な値の場合 |
| 429 | `{"error": "Too Many Requests"}` | 閾値超過時 |

---

### POST /api/admin/users/[id]/freeze

**変更内容**: レートリミット追加（既存ロジックは変更なし）

**Rate Limit**: ユーザー ID ベース（管理者の ID）、30 回 / 60 秒

**追加レスポンス**:

| Status | Body | 条件 |
|--------|------|------|
| 429 | `{"error": "Too Many Requests"}` | 閾値超過時 |

---

### POST /api/admin/users/[id]/unfreeze

**変更内容**: レートリミット追加（既存ロジックは変更なし）

**Rate Limit**: ユーザー ID ベース（管理者の ID）、30 回 / 60 秒

**追加レスポンス**:

| Status | Body | 条件 |
|--------|------|------|
| 429 | `{"error": "Too Many Requests"}` | 閾値超過時 |

---

## 変更なしのエンドポイント

- `POST /api/admin/campaigns` — 既存ロジック・レスポンス変更なし
- `DELETE /api/admin/posts/[id]` — 既存ロジック・レスポンス変更なし
