# Research: DB整合性改善・ヘルスチェック

**Feature**: 014-db-integrity-health
**Date**: 2026-05-30

---

## Decision 1: Drizzle ORM 外部キー制約の定義方法

**Decision**: カラム定義にインラインで `.references(() => users.id, { onDelete: "cascade" })` を付与する

**Rationale**:
- Drizzle v0.45.2 はカラムへのインライン `.references()` を完全サポート
- `onDelete: "cascade"` により app_user 削除時に user_point・post をカスケード削除できる
- drizzle-kit generate が FK 制約を含む SQL マイグレーションを自動生成する

**Alternatives considered**:
- テーブル定義の第2引数でのリレーション定義（`foreignKey()`）→ 冗長になるためインライン方式を選択

---

## Decision 2: インデックス定義の Drizzle 構文

**Decision**: `pgTable` の第3引数（コールバック）で配列形式により `index("name").on(table.col)` を定義する

**Rationale**:
- Drizzle v0.45.2 では `pgTable("name", cols, (t) => [index(...).on(t.col)])` の配列形式が推奨
- `index` は `drizzle-orm/pg-core` からインポートする（既存インポートに追加するだけ）
- 複合インデックスは `.on(t.startsAt, t.endsAt)` で1行で定義できる

**Alternatives considered**:
- 旧オブジェクト形式 `(t) => ({ idx: index(...) })` → 非推奨のため採用しない

**Index 一覧**:
| テーブル | カラム | インデックス名 | 用途 |
|--------|--------|------------|------|
| user_point | user_id | `user_point_user_id_idx` | ポイント集計クエリ |
| user_point | expires_at | `user_point_expires_at_idx` | 有効期限フィルタ |
| post | hidden_at | `post_hidden_at_idx` | タイムライン取得フィルタ |
| campaign | starts_at, ends_at | `campaign_starts_ends_idx` | アクティブキャンペーン判定 |

---

## Decision 3: ヘルスチェックエンドポイントの認証バイパス

**Decision**: `auth()` を呼ばずに実装する（ミドルウェアなし、ルートに認証ガードを置かない）

**Rationale**:
- 当プロジェクトは `middleware.ts` が存在せず、認証は各ルートが個別に `const session = await auth()` で行う
- ヘルスチェックルートで `auth()` を呼ばなければ、認証なしでアクセス可能になる
- 監視サービスは Bearer トークンなどを持たないため、認証不要が必須

**Alternatives considered**:
- Next.js `middleware.ts` で `/api/health` をパブリックパスに指定する → ミドルウェアが存在しないため追加コストが不要なインライン方式を選択

---

## Decision 4: ヘルスチェックの DB 疎通確認クエリ

**Decision**: `sql\`SELECT 1\`` を `db.execute()` で実行してエラーハンドリングする

**Rationale**:
- 最も軽量なクエリでコネクション確認が可能
- Drizzle の `sql` タグと `db.execute()` で型安全に記述できる
- try/catch で DB エラーを拾い `{ status: "error", db: "error" }` を返す

---

## Decision 5: カスケード削除ポリシー

**Decision**: `user_point` と `post` の両テーブルに `onDelete: "cascade"` を採用する

**Rationale**:
- ユーザーが退会・削除された場合、ポイント履歴と投稿は不要になる
- `onDelete: "restrict"` だとユーザー削除前に関連レコードの手動削除が必要になり運用コストが高い
- ゲストユーザーも同じスキーマを使用するため、ゲスト削除時の孤立防止にも有効

---

## Decision 6: マイグレーション適用手順

**Decision**: `pnpm drizzle-kit generate` でマイグレーション SQL を生成し `pnpm drizzle-kit migrate` で適用する

**Rationale**:
- 既存の drizzle.config.ts が `DATABASE_URL_UNPOOLED` を参照する設定で運用中
- `drizzle-kit generate` は schema.ts との差分から ALTER TABLE / CREATE INDEX SQL を自動生成
- 本番 Neon DB への適用は `migrate` コマンド1つで完結

**注意**: `CREATE INDEX` は PostgreSQL でデフォルトがロックありだが、Neon Serverless (v6+) は短時間ロック後すぐリリースするため通常運用に支障なし。ユーザー数が大規模になった場合は CONCURRENTLY オプションを検討する。
