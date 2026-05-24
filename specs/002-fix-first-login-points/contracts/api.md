# API Contracts: 初回ログインポイント付与バグ修正 & キャンペーン恒久ポイント

## 共通ルール

- 全エンドポイントは JSON を返す
- 管理者エンドポイント (`/api/admin/**`) は `user.role = 'admin'` のセッションが必須
- 認証エラーは `401 Unauthorized`、権限エラーは `403 Forbidden`
- バリデーションエラーは `400 Bad Request` + `{ error: string }`
- 競合エラーは `409 Conflict` + `{ error: string }`

---

## 管理者向けキャンペーン API

### GET /api/admin/campaigns

キャンペーン一覧を返す（削除済みを除く、新しい順）。

**Request**: 認証セッション（admin ロール）のみ

**Response 200**:
```json
{
  "campaigns": [
    {
      "id": 1,
      "name": "新規登録キャンペーン2026",
      "description": "期間中の初回登録者に100ptプレゼント",
      "startsAt": "2026-05-01T00:00:00.000Z",
      "endsAt": "2026-05-31T23:59:59.000Z",
      "bonusPoints": 100,
      "isActive": true,
      "createdAt": "2026-04-20T10:00:00.000Z"
    }
  ]
}
```

`isActive`: `NOW() BETWEEN starts_at AND ends_at` の計算値（読み取り専用）

---

### POST /api/admin/campaigns

新規キャンペーンを作成する。

**Request Body**:
```json
{
  "name": "新規登録キャンペーン2026",
  "description": "期間中の初回登録者に100ptプレゼント",
  "startsAt": "2026-05-01T00:00:00.000Z",
  "endsAt": "2026-05-31T23:59:59.000Z",
  "bonusPoints": 100
}
```

**バリデーション**:
- `name`: 必須、1〜255 文字
- `startsAt`: 必須、ISO 8601 日時
- `endsAt`: 必須、ISO 8601 日時、`startsAt` より後
- `bonusPoints`: 必須、1 以上の整数

**Response 201**:
```json
{
  "campaign": { /* 作成したキャンペーン（上記と同形式） */ }
}
```

**Response 409** (重複アクティブキャンペーンあり):
```json
{
  "error": "既にアクティブなキャンペーンが存在します。終了してから作成してください。"
}
```

---

### PATCH /api/admin/campaigns/[id]

キャンペーンを更新する。

**Request Body** (部分更新可):
```json
{
  "name": "更新後のキャンペーン名",
  "startsAt": "2026-06-01T00:00:00.000Z",
  "endsAt": "2026-06-30T23:59:59.000Z",
  "bonusPoints": 150
}
```

**Response 200**:
```json
{
  "campaign": { /* 更新後のキャンペーン */ }
}
```

**Response 404**: キャンペーンが存在しない（または削除済み）
**Response 409**: 更新後の期間が他のアクティブキャンペーンと重複する

---

### DELETE /api/admin/campaigns/[id]

キャンペーンを論理削除する（`deleted_at` を設定）。

**Response 200**:
```json
{ "success": true }
```

**Response 404**: キャンペーンが存在しない

---

## 既存 API の変更

### GET /api/users/me（変更）

レスポンスに `role` を追加する。

**Response 200** (変更後):
```json
{
  "id": "1",
  "name": "山田太郎",
  "email": "taro@example.com",
  "role": "user",
  "points": {
    "daily": 10,
    "permanent": 100,
    "total": 110
  }
}
```

---

## 認証フロー（変更）

### サインイン時の jwt コールバック（修正後の動作）

```
1. profile?.email が存在する（OAuth サインイン時）:
   a. users テーブルで email を検索
   b. 存在しない場合: INSERT → token.isNewUser = true
   c. 存在する場合: token.isNewUser = false
   d. token.userId = userId
   e. token.role = user.role

2. token.userId が存在する（毎回のトークン処理）:
   a. try { hasDailyPointToday → false なら grantDailyPoints }
   b. catch (e) { console.error; ログインはブロックしない }

3. token.isNewUser === true かつ profile 処理直後:
   a. try { getActiveCampaign → 存在すれば grantCampaignPoints }
   b. catch (e) { console.error; ログインはブロックしない }
   c. token.isNewUser = false（次のトークン更新で再実行しないよう）
```
