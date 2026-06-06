# API Contract: GET /api/admin/campaigns（ページネーション対応版）

## エンドポイント

```
GET /api/admin/campaigns
```

## 認証・認可

- **認証**: セッション必須（未認証 → 401）
- **認可**: `role === "admin"` のみ（一般ユーザー → 403）

## クエリパラメータ

| パラメータ | 型 | 必須 | デフォルト | 説明 |
|---|---|---|---|---|
| `limit` | 整数文字列 | No | `20` | 1回の取得件数（1〜100）。範囲外はデフォルト値に丸める |
| `cursor` | 文字列 | No | なし（先頭から） | 前のレスポンスで返された `nextCursor` の値 |

## レスポンス

### 200 OK

```json
{
  "campaigns": [
    {
      "id": 42,
      "name": "夏のボーナスキャンペーン",
      "description": "期間中の投稿で追加ポイント付与",
      "startsAt": "2026-07-01T00:00:00.000Z",
      "endsAt": "2026-07-31T23:59:59.000Z",
      "bonusPoints": 200,
      "createdAt": "2026-06-01T12:00:00.000Z",
      "isActive": false
    }
  ],
  "nextCursor": "NDI="
}
```

- `campaigns`: 取得したキャンペーンの配列（`createdAt` 降順）
- `nextCursor`: 次ページ取得用カーソル。最終ページの場合は `null`

### 400 Bad Request

`cursor` パラメータが不正な値の場合:

```json
{ "error": "Invalid cursor" }
```

### 401 Unauthorized

```json
{ "error": "Unauthorized" }
```

### 403 Forbidden

```json
{ "error": "Forbidden" }
```

## 変更点（既存からの差分）

| 項目 | 変更前 | 変更後 |
|---|---|---|
| クエリパラメータ | なし | `limit`, `cursor` を追加 |
| レスポンスキー | `campaigns` のみ | `campaigns` + `nextCursor` |
| 取得件数 | 全件 | `limit` 件（最大 100） |

## 後方互換性

- `limit`・`cursor` は省略可能なため、既存の呼び出し側は変更不要
- レスポンスに `nextCursor` が追加されるが、既存の `campaigns` キーはそのまま維持される
