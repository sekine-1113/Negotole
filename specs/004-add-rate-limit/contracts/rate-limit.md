# Contract: レート制限レスポンス

**Version**: 1.0

---

## 適用エンドポイント

| エンドポイント | 識別子 | 上限 | ウィンドウ |
|---|---|---|---|
| `POST /api/posts` | ユーザー ID | 10 回 | 60 秒 |
| `/api/auth/*` | IP アドレス | 20 回 | 60 秒 |
| `/api/admin/*` | ユーザー ID | 30 回 | 60 秒 |

---

## 429 Too Many Requests レスポンス

### ヘッダー

| ヘッダー | 値 |
|---|---|
| `Content-Type` | `application/json` |
| `Retry-After` | 待機秒数（整数） |
| `X-RateLimit-Limit` | 上限回数 |
| `X-RateLimit-Remaining` | 残りリクエスト数（0） |
| `X-RateLimit-Reset` | リセット時刻（Unix 秒） |

### ボディ

```json
{
  "error": "Too many requests",
  "retryAfter": 42
}
```

`retryAfter`: 次にリクエスト可能になるまでの秒数（整数）

---

## 正常レスポンス時のヘッダー（任意）

制限内リクエストには以下のレスポンスヘッダーを付与しても良い（実装の判断に委ねる）:

| ヘッダー | 値 |
|---|---|
| `X-RateLimit-Limit` | 上限回数 |
| `X-RateLimit-Remaining` | 残りリクエスト数 |
| `X-RateLimit-Reset` | リセット時刻（Unix 秒） |

---

## 既存エンドポイントへの影響

| エンドポイント | 既存レスポンスコード | 追加レスポンスコード |
|---|---|---|
| `POST /api/posts` | 201, 400, 401, 402 | **429 追加** |
| `/api/auth/*` | — | **429 追加** |
| `/api/admin/*` | 200/201, 400, 401, 403, 404, 409 | **429 追加** |

既存のリクエスト・レスポンス形式は変更しない（FR-007 準拠）。
