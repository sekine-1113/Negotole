# Data Model: Negotole SNS

詳細スキーマは `docs/database.md` を正とする。ここでは Drizzle ORM での実装形式と、各エンティティの制約・状態管理を記述する。

---

## 共通カラム（全テーブル）

| カラム | 型 | 制約 |
|---|---|---|
| `created_at` | `timestamp` | NOT NULL, DEFAULT NOW() |
| `updated_at` | `timestamp` | NULL, ON UPDATE |
| `deleted_at` | `timestamp` | NULL（論理削除用） |

**論理削除ルール**: 削除操作はすべて `deleted_at = NOW()` をセットする。クエリには必ず `WHERE deleted_at IS NULL` を含める。

---

## テーブル定義

### `user`

| カラム | 型 | 制約 | 説明 |
|---|---|---|---|
| `id` | `bigint` | PK, serial | 自動採番 |
| `name` | `varchar(255)` | NOT NULL | 表示名（Google から取得） |
| `birth_year` | `integer` | NOT NULL | 生年（> 1900） |

- Google OAuth の sub（ユーザー識別子）を別途管理するためのカラムが必要になる可能性あり。NextAuth v5 のセッションでは Google sub を `user.id` に紐付けるアダプタが必要（実装時に検討）
- `birth_year` は Google OAuth からは取得できないため、初回ログイン後の onboarding フォームで入力させる or デフォルト値を設定する（v1 はデフォルト値 0 で暫定対応）

### `user_point`

| カラム | 型 | 制約 | 説明 |
|---|---|---|---|
| `id` | `bigint` | PK, serial | 自動採番 |
| `user_id` | `bigint` | NOT NULL, FK → user.id | |
| `get_point` | `integer` | NOT NULL | 正 = 付与、負 = 消費 |
| `expires_at` | `timestamp` | NULL | NULL = 恒久ポイント。デイリーは当日 23:59:59 |

**ポイント残高計算**:

```sql
SELECT SUM(get_point) AS balance
FROM user_point
WHERE user_id = :userId
  AND deleted_at IS NULL
  AND (expires_at IS NULL OR expires_at > NOW())
```

**デイリーポイント重複チェック**:

```sql
SELECT COUNT(*) FROM user_point
WHERE user_id = :userId
  AND get_point > 0
  AND expires_at IS NOT NULL
  AND DATE(created_at AT TIME ZONE 'Asia/Tokyo') = CURRENT_DATE AT TIME ZONE 'Asia/Tokyo'
  AND deleted_at IS NULL
```

### `post`

| カラム | 型 | 制約 | 説明 |
|---|---|---|---|
| `id` | `bigint` | PK, serial | 自動採番 |
| `user_id` | `bigint` | NOT NULL, FK → user.id | |
| `content` | `varchar(255)` | NOT NULL | 投稿本文 |
| `hidden_at` | `timestamp` | NOT NULL | タイムラインから消える時刻 |

**タイムラインクエリ**:

```sql
SELECT id, content, hidden_at, created_at
FROM post
WHERE hidden_at > NOW()
  AND deleted_at IS NULL
  AND id < :cursor          -- カーソルページネーション（初回は MAX BIGINT）
ORDER BY id DESC
LIMIT :limit
```

---

## エンティティ関係

```
user (1) ──── (N) user_point
user (1) ──── (N) post
```

---

## 状態管理

### 投稿の状態

| 状態 | 条件 |
|---|---|
| 表示中 | `hidden_at > NOW() AND deleted_at IS NULL` |
| 期限切れ | `hidden_at <= NOW() AND deleted_at IS NULL` |
| 削除済み | `deleted_at IS NOT NULL` |

### ポイントの状態

| 状態 | 条件 |
|---|---|
| 有効（デイリー） | `expires_at > NOW() AND deleted_at IS NULL` |
| 有効（恒久） | `expires_at IS NULL AND deleted_at IS NULL` |
| 失効 | `expires_at <= NOW()` |

---

## Drizzle スキーマ実装方針

- ファイル: `negotole/src/lib/db/schema.ts`
- `pgTable` を使い、上記テーブルを TypeScript 型として定義する
- `drizzle.config.ts` で `DATABASE_URL_UNPOOLED` を使用（マイグレーション用）
- ランタイムは `DATABASE_URL`（接続プール）を使用
