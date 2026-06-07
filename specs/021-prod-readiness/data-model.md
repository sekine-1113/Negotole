# Data Model: 本番公開準備

**Branch**: `021-prod-readiness` | **Date**: 2026-06-07

---

## DB スキーマ変更

**なし** — 本フィーチャーは既存テーブルを変更しない。

---

## レートリミットバケット（Upstash Redis 上）

DB テーブルではなく Upstash Redis 内にスライディングウィンドウで管理される。

| フィールド | 型 | 説明 |
|---|---|---|
| key | string | `ratelimit:<prefix>:<identifier>` の形式。識別子はユーザー ID または IP |
| count | number | 現在の時間窓内のリクエスト数 |
| window | 60 秒 | スライディングウィンドウのサイズ |

**識別子の形式**:
- 認証済みルート（POST /api/posts、管理 API）: `user:${userId}`
- 未認証ルート（将来追加時）: `ip:${ipAddress}`

**Prefix 対応**:
| limiter | prefix | 閾値 |
|---|---|---|
| postWriteLimiter | `ratelimit:post_write` | 10 回 / 60 秒 |
| adminLimiter | `ratelimit:admin` | 30 回 / 60 秒 |

---

## ページカーソル（/api/admin/users）

DB に保存しない。レスポンス JSON として返す。

| フィールド | 型 | 説明 |
|---|---|---|
| nextCursor | string \| null | 次ページ先頭ユーザー ID の base64 エンコード値。最終ページは null |

**エンコード方式**: `Buffer.from(String(userId)).toString("base64")`（既存の campaigns API と同一）

---

## 型定義変更

**なし** — 既存の型で対応可能。
