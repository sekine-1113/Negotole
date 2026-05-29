# Tasks: DB整合性改善・ヘルスチェック

**Input**: Design documents from `/specs/014-db-integrity-health/`

**Prerequisites**: plan.md ✅, spec.md ✅, research.md ✅, data-model.md ✅, contracts/ ✅

**Tests**: テスト自動化は要件に含まれていないため省略（手動検証タスクを最終フェーズに含む）

**Organization**: タスクはユーザーストーリー単位で整理。US1（DB整合性）と US2（ヘルスチェック）は完全独立。

## Format: `[ID] [P?] [Story] Description`

- **[P]**: 並列実行可（異なるファイル、依存なし）
- **[Story]**: 対応するユーザーストーリー（US1, US2）

---

## Phase 1: Setup

**Purpose**: ビルドベースラインを確認し、実装前の状態を保証する

- [x] T001 `negotole/` で `pnpm build` を実行し現在のビルドがエラーなく通ることを確認する

**Checkpoint**: ベースライン確認完了 — US1・US2 の実装を開始できる

---

## Phase 2: Foundational（なし）

US1 と US2 は完全に独立しており、共通の前提処理は不要。Phase 1 完了後すぐに両ストーリーの実装に入れる。

---

## Phase 3: User Story 1 — DB整合性とクエリ性能の改善 (Priority: P1) 🎯 MVP

**Goal**: Drizzle スキーマに FK 制約とインデックスを追加し、マイグレーションを生成・適用する。ユーザー削除時の孤立レコード防止とクエリ高速化を実現する。

**Independent Test**: マイグレーション適用後、`pnpm drizzle-kit studio` またはDB クライアントで外部キー制約とインデックスが存在することを確認する。

### Implementation for User Story 1

- [x] T002 [US1] `negotole/src/lib/db/schema.ts` を更新する。`import` に `index` を追加し（`drizzle-orm/pg-core` から）、`userPoints` テーブルの `userId` に `.references(() => users.id, { onDelete: "cascade" })` を追加、第3引数に `(t) => [index("user_point_user_id_idx").on(t.userId), index("user_point_expires_at_idx").on(t.expiresAt)]` を追加する。`posts` テーブルの `userId` に `.references(() => users.id, { onDelete: "cascade" })` を追加、第3引数に `(t) => [index("post_hidden_at_idx").on(t.hiddenAt)]` を追加する。`campaigns` テーブルに第3引数 `(t) => [index("campaign_starts_ends_idx").on(t.startsAt, t.endsAt)]` を追加する
- [x] T003 [US1] `negotole/` で `pnpm drizzle-kit generate` を実行し、FK 制約とインデックスを含む SQL マイグレーションファイルを `negotole/drizzle/` に生成する（T002 完了後に実施）
- [x] T004 [US1] `negotole/` で `pnpm drizzle-kit migrate` を実行し、生成されたマイグレーションを Neon DB に適用する（T003 完了後に実施、`DATABASE_URL_UNPOOLED` 環境変数が必要）

**Checkpoint**: US1 完了 — DB に FK 制約とインデックスが適用されている

---

## Phase 4: User Story 2 — ヘルスチェックエンドポイント (Priority: P2)

**Goal**: `GET /api/health` を新設し、認証不要で DB 疎通状態を返す。監視サービスから利用可能にする。

**Independent Test**: `curl http://localhost:3000/api/health` で HTTP 200 と `{"status":"ok","db":"ok"}` が返ることを確認する。

### Implementation for User Story 2

- [x] T005 [P] [US2] `negotole/src/app/api/health/route.ts` を新規作成する。`db` と `sql` を `drizzle-orm` からインポートし、`export async function GET()` で `db.execute(sql\`SELECT 1\`)` を try/catch で実行する。成功時は `NextResponse.json({ status: "ok", db: "ok" })` を返し、失敗時は `NextResponse.json({ status: "error", db: "error" }, { status: 503 })` を返す。`auth()` は呼ばない（認証不要）

**Checkpoint**: US2 完了 — `/api/health` が認証なしで DB 疎通結果を返す

---

## Phase 5: Polish & Cross-Cutting Concerns

**Purpose**: ビルド確認と手動検証

- [x] T006 `negotole/` で `pnpm build` を実行し TypeScript 型チェックとビルドが成功することを確認する
- [ ] T007 ブラウザまたは curl で動作確認する。`GET /api/health` にアクセスし HTTP 200 と `{"status":"ok","db":"ok"}` が返ることを確認する
- [ ] T008 DB クライアント（drizzle-kit studio または Neon コンソール）で確認する。`user_point`・`post` テーブルに FK 制約が存在すること、各インデックスが作成されていることを確認する

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (Phase 1)**: 依存なし — 即開始可能
- **US1 (Phase 3)**: Phase 1 完了後に開始
- **US2 (Phase 4)**: Phase 1 完了後に開始（US1 と並行可）
- **Polish (Phase 5)**: US1・US2 の必要な部分が完了した後

### User Story Dependencies

- **US1 (P1)**: T002 → T003 → T004 の順（schema 変更 → 生成 → 適用）
- **US2 (P2)**: T005 は単独タスク（依存なし）

### Within Each User Story

- US1: schema.ts 変更 → drizzle-kit generate → drizzle-kit migrate（逐次）
- US2: route.ts 新規作成のみ（並列実行可）

### Parallel Opportunities

- T002〜T004（US1）と T005（US2）は異なるファイルのため並列実行可
- T005 は T002 完了を待たずに開始できる

---

## Parallel Example

```bash
# US1 と US2 を並列開始可:
Task: T002 "Update negotole/src/lib/db/schema.ts with FK + indexes"
Task: T005 "Create negotole/src/app/api/health/route.ts"

# T002 完了後:
Task: T003 "Run pnpm drizzle-kit generate"

# T003 完了後:
Task: T004 "Run pnpm drizzle-kit migrate"
```

---

## Implementation Strategy

### MVP First (User Story 1 Only)

1. Phase 1: ビルド確認
2. Phase 3 (US1): スキーマ更新 → マイグレーション生成 → 適用（T002 → T003 → T004）
3. **STOP and VALIDATE**: DB に FK・インデックスが存在することを確認
4. デモ可能な状態

### Incremental Delivery

1. Phase 1: ベースライン確認
2. US1 完了 → DB 整合性・性能改善 → MVP リリース可
3. US2 完了 → ヘルスチェック対応 → 監視サービス連携可能
4. Polish: ビルド・手動検証

---

## Notes

- [P] タスクは異なるファイルを扱い依存なし（並列実行可）
- US1 の T002〜T004 は順序依存のため逐次実行
- T004 の `drizzle-kit migrate` には `DATABASE_URL_UNPOOLED` 環境変数が必要
- `SELECT 1` クエリは DB への最軽量な疎通確認
- 認証バイパスは middleware.ts が存在しないため `auth()` を呼ばないだけで実現できる
