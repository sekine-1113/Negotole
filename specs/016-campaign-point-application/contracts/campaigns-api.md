# API Contract: キャンペーン作成・更新 — pointsType 追加

## POST /api/admin/campaigns（変更点）

### リクエストボディ（追加フィールド）

| フィールド | 型 | 必須 | デフォルト | 説明 |
|---|---|---|---|---|
| `pointsType` | `"permanent" \| "limited"` | No | `"permanent"` | ポイント種別。恒久または期間限定 |

### バリデーション

- `pointsType` を指定する場合は `"permanent"` または `"limited"` のいずれか。それ以外は 400 Bad Request

### レスポンス変更（201 Created）

```json
{
  "campaign": {
    "id": 1,
    "name": "夏のボーナスキャンペーン",
    "pointsType": "limited",
    ...
  }
}
```

---

## PATCH /api/admin/campaigns/[id]（変更点）

### リクエストボディ（追加フィールド）

| フィールド | 型 | 必須 | 説明 |
|---|---|---|---|
| `pointsType` | `"permanent" \| "limited"` | No | 変更時のみ指定 |

### バリデーション

- `pointsType` を指定する場合は `"permanent"` または `"limited"` のいずれか

---

## GET /api/admin/campaigns（変更点）

### レスポンス

`campaigns` 配列の各要素に `pointsType` フィールドが追加される（既存フィールドはそのまま）。

```json
{
  "campaigns": [
    {
      "id": 1,
      "name": "...",
      "pointsType": "permanent",
      "nextCursor": null,
      ...
    }
  ]
}
```

---

## 後方互換性

- `pointsType` は省略可能（既存クライアントに変更なし）
- 省略時は `"permanent"` がデフォルト値として使用される
