# API Contract: Negotole BFF

BFF（Route Handlers）が外部（ブラウザ）に公開するインターフェース契約。詳細仕様は `docs/api.md` を参照。

---

## 共通規約

- レスポンス: `Content-Type: application/json`
- エラー形式: `{ "error": "<message>" }`
- 認証: NextAuth.js v5 のセッション Cookie を使用
- 認証なしアクセスに対して認証必須エンドポイントは `401` を返す

---

## エンドポイント契約

### `GET /api/posts`

**認証**: 不要  
**目的**: 有効期限内の投稿一覧をカーソルページネーションで返す

**Request**

| パラメータ | 種別 | 型 | 必須 | 説明 |
|---|---|---|---|---|
| `cursor` | query | string | no | 前回レスポンスの `nextCursor`（base64 encoded ID） |
| `limit` | query | number | no | 件数（デフォルト 20、最大 50） |

**Response 200**

```json
{
  "posts": [
    {
      "id": 1,
      "content": "string (1-255)",
      "hiddenAt": "ISO 8601 datetime",
      "createdAt": "ISO 8601 datetime"
    }
  ],
  "nextCursor": "string | null"
}
```

**制約**:
- `posts` 配列に投稿者情報を含めない（匿名性を保証）
- `hidden_at > NOW()` AND `deleted_at IS NULL` のみ返す

---

### `POST /api/posts`

**認証**: 必須  
**目的**: 新規投稿を作成し、1pt を消費する

**Request Body**

```json
{
  "content": "string (1-255文字)",
  "duration": 60 | 180 | 360 | 720 | 1440
}
```

**Response 201**

```json
{
  "post": {
    "id": 1,
    "content": "string",
    "hiddenAt": "ISO 8601 datetime",
    "createdAt": "ISO 8601 datetime"
  }
}
```

**Errors**

| Status | Condition |
|---|---|
| 400 | `content` が空・255 文字超・`duration` が選択肢外 |
| 401 | 未認証 |
| 402 | ポイント残高不足（total < 1） |

**副作用**:
1. `post` レコード INSERT（`hidden_at = NOW() + duration minutes`）
2. `user_point` に `-1` レコード INSERT（デイリー優先消費）
- 上記は単一トランザクションで実行する

---

### `GET /api/users/me`

**認証**: 必須  
**目的**: 自分のユーザー情報とポイント残高を返す

**Response 200**

```json
{
  "user": {
    "id": 1,
    "name": "string"
  },
  "points": {
    "daily": 8,
    "permanent": 5,
    "total": 13
  }
}
```

**Errors**

| Status | Condition |
|---|---|
| 401 | 未認証 |

---

## 認証コールバック（内部処理）

`/api/auth/[...nextauth]` は NextAuth.js v5 が処理する。`signIn` コールバックで以下を実行する:

1. `user` レコードを作成または取得
2. 当日のデイリーポイント未付与なら `user_point` に `+10` INSERT（`expires_at = 当日 23:59:59`）

この処理はエンドポイントとして外部公開しない。
