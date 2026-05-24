# Data Model: 初回ログインポイント付与バグ修正 & キャンペーン恒久ポイント

## 既存テーブルの変更

### user（変更）

`role` カラムを追加する。

```
user
├── id              BIGINT PK GENERATED ALWAYS AS IDENTITY
├── name            VARCHAR(255) NOT NULL
├── email           VARCHAR(255) UNIQUE
├── role            VARCHAR(20) NOT NULL DEFAULT 'user'   ← 追加
├── birth_year      INTEGER NOT NULL DEFAULT 0
├── created_at      TIMESTAMP NOT NULL DEFAULT NOW()
├── updated_at      TIMESTAMP
└── deleted_at      TIMESTAMP
```

**role の値**:
- `'user'`  — 一般ユーザー（デフォルト）
- `'admin'` — 管理者。`/admin/**` へのアクセス権を持つ

**Migration**:
```sql
ALTER TABLE "user" ADD COLUMN "role" varchar(20) NOT NULL DEFAULT 'user';
```

---

## 新規テーブル

### campaign（新規）

キャンペーン期間を管理する。同時にアクティブな件数は 1 件のみ（アプリ層で強制）。

```
campaign
├── id              BIGINT PK GENERATED ALWAYS AS IDENTITY
├── name            VARCHAR(255) NOT NULL               -- キャンペーン名（管理用）
├── description     TEXT                               -- 説明（任意）
├── starts_at       TIMESTAMP NOT NULL                 -- 開始日時
├── ends_at         TIMESTAMP NOT NULL                 -- 終了日時（境界値含む）
├── bonus_points    INTEGER NOT NULL DEFAULT 100       -- 付与ポイント数
├── created_at      TIMESTAMP NOT NULL DEFAULT NOW()
├── updated_at      TIMESTAMP
└── deleted_at      TIMESTAMP
```

**制約**:
- `starts_at < ends_at`（アプリ層でバリデーション）
- `bonus_points > 0`（アプリ層でバリデーション）
- 論理削除のみ（`deleted_at` を設定）

**アクティブキャンペーン判定**:
```sql
SELECT * FROM campaign
WHERE NOW() BETWEEN starts_at AND ends_at
  AND deleted_at IS NULL
ORDER BY starts_at DESC
LIMIT 1;
```

---

## 既存テーブル（変更なし）

### user_point（変更なし）

キャンペーンポイント（恒久）は `expiresAt = NULL` の `get_point = 100` レコードとして挿入される。

```
user_point
├── id              BIGINT PK GENERATED ALWAYS AS IDENTITY
├── user_id         BIGINT NOT NULL  (→ user.id)
├── get_point       INTEGER NOT NULL
│                   +10: デイリーポイント
│                   +100: キャンペーン恒久ポイント
│                   -1: 投稿消費
├── expires_at      TIMESTAMP NULL
│                   NULL: 恒久ポイント（キャンペーンボーナス）
│                   当日 23:59:59: デイリーポイント
├── created_at      TIMESTAMP NOT NULL DEFAULT NOW()
├── updated_at      TIMESTAMP
└── deleted_at      TIMESTAMP
```

---

## エンティティ関係

```
user (1) ──── (N) user_point
                   get_point=-1: 投稿消費
                   get_point=+10, expires_at=当日23:59: デイリー
                   get_point=+100, expires_at=NULL: キャンペーン恒久

campaign (独立)
  → ログイン時にアクティブなキャンペーンを照会
  → 初回ログイン（isNewUser=true）かつアクティブキャンペーン存在時に
    user_point に +100 (expiresAt=NULL) を INSERT
```

---

## JWT トークン型拡張

`src/types/next-auth.d.ts` を新設して NextAuth の型を拡張する。

```typescript
// JWT に追加するフィールド
interface JWT {
  userId?: number;     // user.id（数値）
  isNewUser?: boolean; // 今回のサインインでアカウントを新規作成したか
  role?: string;       // user.role（'user' | 'admin'）
}

// Session に公開するフィールド
interface Session {
  user: {
    id: string;
    role?: string;
  } & DefaultSession["user"];
}
```
