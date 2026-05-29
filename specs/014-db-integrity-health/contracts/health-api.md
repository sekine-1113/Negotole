# Contract: GET /api/health

**Feature**: 014-db-integrity-health
**Type**: HTTP API Endpoint

## Endpoint

```
GET /api/health
```

## Authentication

**None** — 認証不要。監視サービスからの無認証アクセスを許可する。

## Request

No request body or parameters required.

## Response

### 200 OK — 正常稼働

```json
{
  "status": "ok",
  "db": "ok"
}
```

### 503 Service Unavailable — DB 接続エラー

```json
{
  "status": "error",
  "db": "error"
}
```

## Response Fields

| フィールド | 型 | 値 | 説明 |
|-----------|----|----|------|
| status | string | "ok" \| "error" | アプリケーション全体の状態 |
| db | string | "ok" \| "error" | DB 疎通確認結果 |

## Behavior

1. `SELECT 1` クエリを DB に対して実行する
2. クエリ成功 → HTTP 200、`{ status: "ok", db: "ok" }` を返す
3. クエリ失敗（タイムアウト・接続エラー等）→ HTTP 503、`{ status: "error", db: "error" }` を返す

## Acceptance Test

```bash
# 正常ケース
curl -s http://localhost:3000/api/health
# → HTTP 200、{"status":"ok","db":"ok"}

# 認証なしでアクセス可能なこと
curl -s -o /dev/null -w "%{http_code}" http://localhost:3000/api/health
# → 200（401 でないこと）
```
