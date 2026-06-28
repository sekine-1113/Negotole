# API Contract: GET /api/posts

## 変更点

### 新クエリパラメータ

| パラメータ | 型 | 必須 | 説明 |
|-----------|---|------|------|
| `order` | `"random"` | No | 指定時にランダム順で投稿を返す。未指定は新着順（DESC） |

既存パラメータ `cursor`, `since`, `limit` は引き続き有効。

### レスポンス形状（変更後）

```json
{
  "posts": [
    {
      "id": 123,
      "content": "寝言テキスト",
      "hiddenAt": "2026-06-29T10:00:00.000Z",
      "createdAt": "2026-06-28T22:30:00.000Z"
    }
  ],
  "nextCursor": "base64encodedId or null",
  "totalActive": 42
}
```

### 後方互換性

- `totalActive` フィールドは追加のみ（既存クライアントは無視できる）
- `order=random` は新規パラメータ（未送信時は従来通り）
- `order=random` と `cursor` を同時指定した場合、cursor は無視される（random モードでカーソルは意味をなさない）

### バリデーション

- `order` が `"random"` 以外の値で送られた場合 → 400 Bad Request
- `order=random` と `since` は同時指定不可 → 400 Bad Request（新着ポーリングはランダムモード対象外）
