# Data Model: 構造化ログ・監査ログ・管理者投稿削除機能

## 既存テーブル（変更なし）

### `post` テーブル
`deletedAt` カラムが `commonColumns` に既存。`fetchPosts()` は `isNull(posts.deletedAt)` でフィルタ済みのため、論理削除すれば自動的にタイムラインから非表示になる。

---

## 新規テーブル

### `login_log`（ログイン履歴）

| カラム | 型 | 制約 | 備考 |
|---|---|---|---|
| `id` | BIGINT | PK, GENERATED ALWAYS AS IDENTITY | |
| `user_id` | BIGINT | NOT NULL, FK → `app_user.id` (CASCADE) | |
| `ip_address` | VARCHAR(45) | NULL 許容 | IPv6 対応、取得できない場合は NULL |
| `user_agent` | TEXT | NULL 許容 | |
| `created_at` | TIMESTAMP | NOT NULL, DEFAULT NOW() | ログイン日時 |

**インデックス**: `(user_id)` — ユーザーのログイン履歴検索用

---

### `admin_audit_log`（管理者監査ログ）

| カラム | 型 | 制約 | 備考 |
|---|---|---|---|
| `id` | BIGINT | PK, GENERATED ALWAYS AS IDENTITY | |
| `admin_id` | BIGINT | NOT NULL, FK → `app_user.id` (CASCADE) | 操作した管理者 |
| `action` | VARCHAR(50) | NOT NULL | 例: `campaign.create`, `campaign.delete`, `post.delete` |
| `target_type` | VARCHAR(30) | NULL 許容 | 例: `campaign`, `post` |
| `target_id` | BIGINT | NULL 許容 | 対象リソースの ID |
| `payload` | JSONB | NULL 許容 | 変更内容のスナップショット |
| `ip_address` | VARCHAR(45) | NULL 許容 | 操作時の IP アドレス |
| `created_at` | TIMESTAMP | NOT NULL, DEFAULT NOW() | 操作日時 |

**インデックス**: `(admin_id)`, `(action)`, `(created_at DESC)` — 監査ログ検索用

---

## StructuredLog（アプリケーションログの形式）

DB テーブルではなく、`console.log` への出力形式の仕様。

```typescript
type LogEntry = {
  ts: string;         // ISO 8601
  level: "info" | "warn" | "error";
  event: string;      // ドット区切りのイベント名
  [key: string]: unknown;  // 追加コンテキスト
};
```

**主要イベント一覧**:

| event | level | 追加フィールド |
|---|---|---|
| `auth.login.success` | info | userId, provider |
| `auth.login.guest` | info | userId |
| `auth.daily_points_granted` | info | userId, points |
| `auth.daily_points_skipped` | info | userId |
| `auth.campaign_points_granted` | info | userId, campaignId, points |
| `auth.daily_points_failed` | error | userId, error |
| `auth.campaign_points_failed` | error | userId, error |
| `post.created` | info | userId, postId |
| `post.insufficient_points` | warn | userId |
| `post.deleted_by_admin` | info | postId, adminId |
| `admin.campaign.created` | info | adminId, campaignId |
| `admin.campaign.updated` | info | adminId, campaignId |
| `admin.campaign.deleted` | info | adminId, campaignId |

---

## TypeScript 型定義（Drizzle ORM）

```typescript
export const loginLogs = pgTable("login_log", {
  id: bigint("id", { mode: "number" }).primaryKey().generatedAlwaysAsIdentity(),
  userId: bigint("user_id", { mode: "number" }).notNull()
    .references(() => users.id, { onDelete: "cascade" }),
  ipAddress: varchar("ip_address", { length: 45 }),
  userAgent: text("user_agent"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
}, (t) => [
  index("login_log_user_id_idx").on(t.userId),
]);

export const adminAuditLogs = pgTable("admin_audit_log", {
  id: bigint("id", { mode: "number" }).primaryKey().generatedAlwaysAsIdentity(),
  adminId: bigint("admin_id", { mode: "number" }).notNull()
    .references(() => users.id, { onDelete: "cascade" }),
  action: varchar("action", { length: 50 }).notNull(),
  targetType: varchar("target_type", { length: 30 }),
  targetId: bigint("target_id", { mode: "number" }),
  payload: json("payload"),
  ipAddress: varchar("ip_address", { length: 45 }),
  createdAt: timestamp("created_at").notNull().defaultNow(),
}, (t) => [
  index("admin_audit_log_admin_id_idx").on(t.adminId),
  index("admin_audit_log_action_idx").on(t.action),
  index("admin_audit_log_created_at_idx").on(t.createdAt),
]);
```
