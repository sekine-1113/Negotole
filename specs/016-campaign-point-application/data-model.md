# Data Model: キャンペーンポイント適用ロジック

## 既存テーブル変更

### `campaign` テーブル — `pointsType` カラム追加

| カラム | 型 | 制約 | 備考 |
|---|---|---|---|
| `id` | BIGINT | PK | |
| `name` | VARCHAR(255) | NOT NULL | |
| `description` | TEXT | NULL 許容 | |
| `starts_at` | TIMESTAMP | NOT NULL | |
| `ends_at` | TIMESTAMP | NOT NULL | ポイント期限の基準日 |
| `bonus_points` | INTEGER | NOT NULL, DEFAULT 100 | |
| **`points_type`** | **VARCHAR(20)** | **NOT NULL, DEFAULT 'permanent'** | **`'permanent'` または `'limited'`** |
| `created_at` | TIMESTAMP | NOT NULL, DEFAULT NOW() | |
| `updated_at` | TIMESTAMP | NULL 許容 | |
| `deleted_at` | TIMESTAMP | NULL 許容 | 論理削除 |

**後方互換性**: DEFAULT `'permanent'` を設定するため、既存レコードの `points_type` は自動的に `'permanent'` になる。

---

## 新規テーブル

### `campaign_application`（キャンペーン適用履歴）

| カラム | 型 | 制約 | 備考 |
|---|---|---|---|
| `id` | BIGINT | PK, GENERATED ALWAYS AS IDENTITY | |
| `campaign_id` | BIGINT | NOT NULL, FK → `campaign.id` (CASCADE) | |
| `user_id` | BIGINT | NOT NULL, FK → `app_user.id` (CASCADE) | |
| `created_at` | TIMESTAMP | NOT NULL, DEFAULT NOW() | 適用日時 |

**ユニーク制約**: `(campaign_id, user_id)` — 同一キャンペーン・同一ユーザーの重複付与を DB レベルで防ぐ

---

## ポイント付与ロジック

### `pointsType` による `user_point.expires_at` の決定

| `campaign.pointsType` | `user_point.expiresAt` |
|---|---|
| `'permanent'` | `null`（無期限） |
| `'limited'` | `campaign.endsAt`（キャンペーン終了日時） |

---

## TypeScript 型定義（Drizzle ORM）

```typescript
// schema.ts に追加
export const campaignApplications = pgTable("campaign_application", {
  id: bigint("id", { mode: "number" }).primaryKey().generatedAlwaysAsIdentity(),
  campaignId: bigint("campaign_id", { mode: "number" }).notNull()
    .references(() => campaigns.id, { onDelete: "cascade" }),
  userId: bigint("user_id", { mode: "number" }).notNull()
    .references(() => users.id, { onDelete: "cascade" }),
  createdAt: timestamp("created_at").notNull().defaultNow(),
}, (t) => [
  uniqueIndex("campaign_application_campaign_user_idx").on(t.campaignId, t.userId),
]);

// campaign テーブルに pointsType を追加
pointsType: varchar("points_type", { length: 20 }).notNull().default("permanent"),
```

---

## マイグレーション SQL（想定）

```sql
-- campaign テーブルに points_type カラムを追加
ALTER TABLE "campaign"
  ADD COLUMN "points_type" varchar(20) NOT NULL DEFAULT 'permanent';

-- campaign_application テーブルを新規作成
CREATE TABLE "campaign_application" (
  "id" bigint PRIMARY KEY GENERATED ALWAYS AS IDENTITY,
  "campaign_id" bigint NOT NULL REFERENCES "campaign"("id") ON DELETE CASCADE,
  "user_id" bigint NOT NULL REFERENCES "app_user"("id") ON DELETE CASCADE,
  "created_at" timestamp NOT NULL DEFAULT NOW()
);

CREATE UNIQUE INDEX "campaign_application_campaign_user_idx"
  ON "campaign_application" ("campaign_id", "user_id");
```
