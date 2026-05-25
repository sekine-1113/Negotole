# API Contract: GET /api/posts

**Version**: 2.0 (cursor validation added)
**Endpoint**: `GET /api/posts`

## Query Parameters

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `cursor`  | string (base64) | No | ページネーション用カーソル。前のレスポンスの `nextCursor` をそのまま使用する |
| `limit`   | number | No | 1リクエストで取得する最大件数（デフォルト: 20、上限: 50） |

### cursor パラメータの制約

- base64 エンコードされた正の整数であること
- デコード結果が `Number.isInteger(n) && n > 0` を満たすこと
- サーバーが返した `nextCursor` 以外の値を渡した場合の動作は未定義

## Response

### 200 OK

```json
{
  "posts": [
    {
      "id": 42,
      "content": "投稿内容",
      "hiddenAt": "2026-05-25T12:00:00.000Z",
      "createdAt": "2026-05-25T11:00:00.000Z"
    }
  ],
  "nextCursor": "NDI=" // または null（最終ページの場合）
}
```

### 400 Bad Request

cursor パラメータが不正な場合に返る。

```json
{
  "error": "Invalid cursor"
}
```

## 変更点（v1 → v2）

- cursor パラメータの検証を追加
- 不正な cursor 値に対して 400 Bad Request を返すようになった（v1 では NaN がDBに渡り未定義動作だった）
- 正常ケースの動作・レスポンス形式は変更なし
