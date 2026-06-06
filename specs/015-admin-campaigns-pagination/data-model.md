# Data Model: 管理者キャンペーン一覧のページネーション

## 既存エンティティ（変更なし）

### Campaign (`campaign` テーブル)

| カラム | 型 | 制約 | 備考 |
|---|---|---|---|
| `id` | BIGINT | PK, GENERATED ALWAYS AS IDENTITY | カーソルとして使用 |
| `name` | VARCHAR(255) | NOT NULL | |
| `description` | TEXT | NULL 許容 | |
| `starts_at` | TIMESTAMP | NOT NULL | |
| `ends_at` | TIMESTAMP | NOT NULL | |
| `bonus_points` | INTEGER | NOT NULL, DEFAULT 100 | |
| `created_at` | TIMESTAMP | NOT NULL, DEFAULT NOW() | ソートキー |
| `updated_at` | TIMESTAMP | NULL 許容 | |
| `deleted_at` | TIMESTAMP | NULL 許容 | 論理削除 |

**既存インデックス**: `campaign_starts_ends_idx ON (starts_at, ends_at)`

スキーマ変更なし。ページネーションはアプリケーション層で実装する。

---

## ページネーションカーソル

### エンコード仕様

```
cursor = base64(String(campaign.id))
```

`campaign.id` は連番整数（BIGINT）であり、`createdAt DESC` の順序と一致する。
カーソルは不透明なトークンとして扱い、クライアントは内部構造を意識しない。

### デコードと検証

```
decoded = Number(Buffer.from(cursor, "base64").toString())
valid   = Number.isSafeInteger(decoded) && decoded > 0
```

検証に失敗した場合は 400 Bad Request を返す。

---

## クエリパターン

### 初回取得（カーソルなし）

```sql
SELECT * FROM campaign
WHERE deleted_at IS NULL
ORDER BY id DESC
LIMIT :limit + 1
```

### カーソル指定取得

```sql
SELECT * FROM campaign
WHERE deleted_at IS NULL
  AND id < :cursorId     -- id DESC ソートなので "id が cursor より小さい" が次ページ
ORDER BY id DESC
LIMIT :limit + 1
```

`limit + 1` 件取得し、実際に返すのは `limit` 件。取得件数が `limit + 1` の場合は `hasMore = true`。

---

## レスポンス型

### `CampaignItem`

```typescript
type CampaignItem = {
  id: number;
  name: string;
  description: string | null;
  startsAt: string;   // ISO 8601
  endsAt: string;     // ISO 8601
  bonusPoints: number;
  createdAt: string;  // ISO 8601
  isActive: boolean;  // 派生値: startsAt <= now <= endsAt
};
```

### `PaginatedCampaignsResponse`

```typescript
type PaginatedCampaignsResponse = {
  campaigns: CampaignItem[];
  nextCursor: string | null;  // null = 最終ページ
};
```
