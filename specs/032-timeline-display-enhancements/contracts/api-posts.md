# Contract: GET /api/posts — レスポンス変更

**Feature**: 032-timeline-display-enhancements
**Change type**: 後方互換追加（新フィールド追加のみ）

---

## 変更内容

### レスポンス (`200 OK`)

**Before**:
```json
{
  "posts": [...],
  "nextCursor": "base64string | null",
  "totalActive": 42
}
```

**After**:
```json
{
  "posts": [...],
  "nextCursor": "base64string | null",
  "totalActive": 42,
  "expiredToday": 7
}
```

### 新フィールド: `expiredToday`

| フィールド | 型 | 説明 |
|-----------|-----|------|
| `expiredToday` | `number` | 当日 JST 0:00 以降に `hidden_at` を過ぎた投稿の件数。削除済み（`deleted_at IS NOT NULL`）は含まない |

**後方互換性**: クライアントが `expiredToday` を無視しても動作に支障なし。既存クライアントコードの変更不要。

---

## クエリパラメータ（変更なし）

| パラメータ | 型 | 説明 |
|-----------|-----|------|
| `cursor` | `string` (base64) | カーソルページネーション |
| `since` | `string` (base64) | ポーリング用 sinceId |
| `order` | `"newest"` / `"random"` | 表示順 |
| `limit` | `number` (max 50) | 取得件数 |
