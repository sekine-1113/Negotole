# Data Model: レート制限の追加

**Date**: 2026-05-25

DB スキーマ変更なし。レート制限の状態は Upstash Redis（外部 KV ストア）で管理する。

---

## レート制限エントリ（Redis）

各制限ルールは Redis キーとして管理される。`@upstash/ratelimit` が内部的に以下のキー形式を使用する。

| キー形式 | 用途 |
|---|---|
| `ratelimit:post_write:<userId>` | 投稿 API（`POST /api/posts`）のユーザー単位カウンタ |
| `ratelimit:auth:<ip>` | 認証エンドポイントの IP 単位カウンタ |
| `ratelimit:admin:<userId>` | 管理者 API のユーザー単位カウンタ |

各エントリの TTL はウィンドウサイズ（1 分）に合わせて自動設定される。

---

## 制限ルール定義（コード内定数）

```
エンドポイントグループ: POST /api/posts
識別子:   ユーザー ID（認証必須）
上限:     10 リクエスト
ウィンドウ: 60 秒（スライディング）

エンドポイントグループ: /api/auth/*
識別子:   IP アドレス
上限:     20 リクエスト
ウィンドウ: 60 秒（スライディング）

エンドポイントグループ: /api/admin/*
識別子:   ユーザー ID（認証必須）
上限:     30 リクエスト
ウィンドウ: 60 秒（スライディング）
```

---

## 429 レスポンス形式

```json
{
  "error": "Too many requests",
  "retryAfter": 42
}
```

`retryAfter`: 次にリクエスト可能になるまでの秒数。`Retry-After` HTTP ヘッダーにも同値を設定する。
