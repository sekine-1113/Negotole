# Contract: GET /api/posts

**Version**: v2 (キャッシュ戦略修正後)
**Date**: 2026-05-28

## 概要

タイムライン投稿一覧を取得するエンドポイント。

## リクエスト

```
GET /api/posts?cursor=<base64-encoded-cursor>&limit=<number>
```

| パラメータ | 型 | 必須 | 説明 |
|-----------|-----|------|------|
| cursor | string (base64) | No | ページネーションカーソル |
| limit | number | No | 取得件数（デフォルト: 20, 最大: 50） |

## レスポンス

### 成功 (200 OK)

```json
{
  "posts": [
    {
      "id": 123,
      "content": "投稿内容",
      "hiddenAt": "2026-05-28T12:00:00.000Z",
      "createdAt": "2026-05-28T10:00:00.000Z"
    }
  ],
  "nextCursor": "<base64-encoded-id-or-null>"
}
```

### エラー (400 Bad Request)

```json
{ "error": "Invalid cursor" }
```

## レスポンスヘッダー（変更点）

| ヘッダー | 値 | 説明 |
|---------|-----|------|
| `Cache-Control` | `no-store` | **【追加】** ブラウザ・CDN によるキャッシュを禁止 |

## 変更前後の比較

| 項目 | 変更前 | 変更後 |
|------|--------|--------|
| Cache-Control | 未設定（デフォルト動作） | `no-store` |
| その他ヘッダー | 変更なし | 変更なし |
| レスポンスボディ | 変更なし | 変更なし |
