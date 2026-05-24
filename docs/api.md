# API 仕様

Next.js App Router の Route Handlers で実装する。Route Handlers が BFF（Backend for Frontend）層として機能し、ブラウザと Neon PostgreSQL の間に位置する。ブラウザは直接 DB に接続しない。

## 共通仕様

- レスポンス形式: JSON
- 認証が必要なエンドポイントで未ログインの場合は `401` を返す
- バリデーションエラーは `400`、サーバーエラーは `500` を返す
- 論理削除済み（`deleted_at IS NOT NULL`）のレコードはすべて除外する

---

## エンドポイント一覧

### 認証

NextAuth.js が `/api/auth/[...nextauth]` を自動処理する。Google OAuth プロバイダーを使用。

---

### 投稿

#### `GET /api/posts`

タイムラインを取得する。**認証不要。**

**Query Parameters**

| パラメータ | 型 | 必須 | 説明 |
|---|---|---|---|
| `cursor` | string | no | ページネーション用カーソル（前回レスポンスの `nextCursor`） |
| `limit` | number | no | 取得件数（デフォルト 20、最大 50） |

**レスポンス `200`**

```json
{
  "posts": [
    {
      "id": 1,
      "content": "投稿本文",
      "hiddenAt": "2024-01-01T12:00:00Z",
      "createdAt": "2024-01-01T09:00:00Z"
    }
  ],
  "nextCursor": "cursor_string_or_null"
}
```

**クエリ条件**

```sql
WHERE hidden_at > NOW() AND deleted_at IS NULL
ORDER BY created_at DESC
```

---

#### `POST /api/posts`

投稿を作成する。**認証必須。**

**リクエストボディ**

| フィールド | 型 | 必須 | 説明 |
|---|---|---|---|
| `content` | string | yes | 投稿本文（1〜255文字） |
| `duration` | number | yes | 表示制限時間（分単位）。選択肢は下記参照 |

**`duration` の選択肢（分単位）**

| 表示ラベル | 値 |
|---|---|
| 1時間 | 60 |
| 3時間 | 180 |
| 6時間 | 360 |
| 12時間 | 720 |
| 24時間 | 1440 |

**処理フロー**

1. ポイント残高を確認（`user_point` の `get_point` 合計、`expires_at IS NULL OR expires_at > NOW()`）
2. 残高不足なら `402` を返す
3. `hidden_at = NOW() + duration（分）` を計算してレコードを作成
4. `user_point` にポイント消費レコード（`get_point` に負の値）を挿入

**消費ポイント**: 投稿 1 回 = 1pt（固定）

**レスポンス `201`**

```json
{
  "post": {
    "id": 1,
    "content": "投稿本文",
    "hiddenAt": "2024-01-01T12:00:00Z",
    "createdAt": "2024-01-01T09:00:00Z"
  }
}
```

**エラーレスポンス**

| ステータス | 条件 |
|---|---|
| `400` | `content` が空または 255 文字超、`duration` が選択肢外 |
| `401` | 未ログイン |
| `402` | ポイント残高不足 |

---

### ユーザー

#### `GET /api/users/me`

ログイン中のユーザー情報とポイント残高を取得する。**認証必須。**

**レスポンス `200`**

```json
{
  "user": {
    "id": 1,
    "name": "ユーザー名"
  },
  "points": {
    "daily": 8,
    "permanent": 5,
    "total": 13
  }
}
```

`daily`: 当日限定ポイント残高（`expires_at` が本日中のもの）  
`permanent`: 恒久ポイント残高（`expires_at IS NULL` のもの）  
`total`: `daily + permanent`

---

## デイリーポイント付与

デイリーポイントの付与はログイン時にサーバーサイドで自動処理する（API エンドポイントは持たない）。

**処理条件**: 当日付与済みのデイリーポイントレコードが存在しない場合のみ付与する。

**付与量**: 10pt / 日  
**`expires_at`**: 付与当日の `23:59:59`
