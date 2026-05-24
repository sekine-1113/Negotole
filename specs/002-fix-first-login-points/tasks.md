# Tasks: 初回ログインポイント付与バグ修正 & キャンペーン恒久ポイント

**Input**: Design documents from `specs/002-fix-first-login-points/`

**Prerequisites**: plan.md ✅ | spec.md ✅ | research.md ✅ | data-model.md ✅ | contracts/ ✅

**Organization**: Phase 1（Setup）→ Phase 2（Foundational）→ Phase 3（US1 バグ修正）→ Phase 4（US2 キャンペーン）→ Phase 5（Polish）

## Format: `[ID] [P?] [Story?] Description`

- **[P]**: 並列実行可（異なるファイル・依存なし）
- **[Story]**: 対応するユーザーストーリー（US1/US2）

---

## Phase 1: Setup（プロジェクト初期化）

**Purpose**: NextAuth 型拡張ファイルの準備

- [x] T001 `negotole/src/types/next-auth.d.ts` を新規作成し、JWT 型に `userId?: number`・`isNewUser?: boolean`・`role?: string` を、Session.user に `role?: string` を追加する（`research.md` R-006 参照）

---

## Phase 2: Foundational（全ユーザーストーリーの前提基盤）

**Purpose**: DB スキーマ変更・マイグレーション適用（US1・US2 の前提）

**⚠️ CRITICAL**: このフェーズが完了するまでユーザーストーリーの実装を開始しない

- [x] T002 `negotole/src/lib/db/schema.ts` の `users` テーブルに `role: varchar("role", { length: 20 }).notNull().default("user")` カラムを追加する（`data-model.md` 参照）
- [x] T003 [P] `negotole/src/lib/db/schema.ts` に `campaign` テーブルを新設する（`id`・`name`・`description`・`startsAt`・`endsAt`・`bonusPoints`・`createdAt`・`updatedAt`・`deletedAt` カラム。`data-model.md` 参照）
- [x] T004 `negotole/` で `set -a && source .env.local && set +a && pnpm drizzle-kit generate && pnpm drizzle-kit migrate` を実行し、Neon DB に `user.role` カラムと `campaign` テーブルを適用する

**Checkpoint**: `user` テーブルに `role` カラム、`campaign` テーブルが Neon 上に存在することを確認する

---

## Phase 3: User Story 1 - デイリーポイント付与バグ修正（Priority: P1）🎯 MVP

**Goal**: ログイン時（初回・再ログイン・トークンリフレッシュ）に毎回デイリーポイントチェックが実行され、当日未付与であれば 10pt が付与される

**Independent Test**: シークレットウィンドウで新規 Google アカウントでログインし、ヘッダーに「10pt」が表示されることを確認する

### Implementation for User Story 1

- [x] T005 [US1] `negotole/src/lib/auth.ts` の `jwt` コールバックを修正する（`research.md` R-001 のパターンに従い: ① `if (profile?.email)` ブロック内で `token.isNewUser`・`token.role` を設定、② `if (token.userId)` ブロックを独立させ `try/catch` で保護したデイリーポイントチェックを毎回実行）
- [x] T006 [P] [US1] `negotole/src/lib/__tests__/points.test.ts` を更新し、`hasDailyPointToday` が `false` を返す場合に `grantDailyPoints` が呼ばれること・`true` を返す場合は呼ばれないことをテストするケースを追加する

**Checkpoint**: `pnpm test` 通過 + `pnpm build` 通過 + 新規ログインで「10pt」表示・同日再ログインで重複付与なしを確認する

---

## Phase 4: User Story 2 - キャンペーン恒久ポイント（Priority: P2）

**Goal**: 管理者がキャンペーン期間を CRUD 管理でき、期間中に初回ログインしたユーザーに恒久ポイント 100pt が付与される

**Independent Test**: キャンペーン期間中に新規 Google アカウントでログインし、ヘッダーに「110pt」（デイリー 10pt ＋ キャンペーン 100pt）が表示されることを確認する

### Implementation for User Story 2

- [x] T007 [US2] `negotole/src/lib/points.ts` に `getActiveCampaign()` 関数（`NOW() BETWEEN starts_at AND ends_at AND deleted_at IS NULL` で 1 件取得）と `grantCampaignPoints(userId, bonusPoints)` 関数（`expiresAt: null` で `user_point` に INSERT）を追加する（`contracts/api.md` 認証フロー参照）
- [x] T008 [US2] `negotole/src/lib/auth.ts` の `jwt` コールバックに、`token.isNewUser === true` の場合に `getActiveCampaign` を呼び、アクティブキャンペーンがあれば `grantCampaignPoints` を実行するロジックを追加する（`try/catch` で保護、失敗してもログインはブロックしない。処理後に `token.isNewUser = false` をセット）
- [x] T009 [P] [US2] `negotole/src/app/api/admin/campaigns/route.ts` を新規作成し、`GET`（削除済み除く一覧、`isActive` 計算値を含む）と `POST`（新規作成、重複アクティブチェック → 409）を実装する（`contracts/api.md` 参照）
- [x] T010 [P] [US2] `negotole/src/app/api/admin/campaigns/[id]/route.ts` を新規作成し、`PATCH`（部分更新、重複アクティブチェック → 409）と `DELETE`（論理削除、`deleted_at` 設定）を実装する（`contracts/api.md` 参照）
- [x] T011 [P] [US2] `negotole/src/app/api/users/me/route.ts` を更新し、レスポンスに `role` フィールドを追加する（`contracts/api.md` 参照）
- [x] T012 [P] [US2] `negotole/middleware.ts` を更新し、`/admin/:path*` パスに対して `session.user.role !== 'admin'` の場合は `/` にリダイレクトするガードを追加する（`research.md` R-004 参照）
- [x] T013 [US2] `negotole/src/app/admin/layout.tsx` を新規作成する（Server Component、管理者セッション確認・非管理者は `/` にリダイレクト、管理者用ナビゲーション）
- [x] T014 [US2] `negotole/src/app/admin/campaigns/page.tsx` を新規作成する（Server Component、`GET /api/admin/campaigns` を fetch してキャンペーン一覧を表示。アクティブ状態をバッジで表示）
- [x] T015 [P] [US2] `negotole/src/app/admin/campaigns/new/page.tsx` を新規作成する（`'use client'`、フォーム：キャンペーン名・説明・開始日時・終了日時・付与ポイント入力、`POST /api/admin/campaigns` を呼び、成功後に `/admin/campaigns` にリダイレクト）
- [x] T016 [P] [US2] `negotole/src/app/admin/campaigns/[id]/edit/page.tsx` を新規作成する（`'use client'`、既存データをフォームに表示、`PATCH /api/admin/campaigns/[id]` で更新、削除ボタンで `DELETE /api/admin/campaigns/[id]` を呼ぶ）
- [x] T017 [P] [US2] `negotole/src/lib/__tests__/campaigns.test.ts` を新規作成し、`getActiveCampaign`（アクティブあり / なし）と `grantCampaignPoints`（DB mock で +100pt expiresAt=null INSERT を確認）のユニットテストを追加する

**Checkpoint**: キャンペーン CRUD が `/admin/campaigns` で動作 + 期間中の新規ログインで「110pt」表示 + 既存ユーザーは「10pt」のみを確認する

---

## Phase 5: Polish & Cross-Cutting Concerns

**Purpose**: 最終確認・品質担保

- [x] T018 [P] `pnpm test` を実行して全テスト（T006・T017 含む）が通ることを確認する
- [x] T019 [P] `pnpm build` を実行してビルドエラーがないことを確認する
- [x] T020 `specs/002-fix-first-login-points/quickstart.md` の全シナリオ（バグ修正確認・管理者設定・キャンペーン CRUD・期間中初回ログイン）を実行して全項目が通ることを確認する

---

## Dependencies & Execution Order

### Phase Dependencies

- **Phase 1（Setup）**: 依存なし。即開始可能
- **Phase 2（Foundational）**: Phase 1 完了後。**US1・US2 をブロック**
- **Phase 3（US1）**: Phase 2 完了後に開始可能
- **Phase 4（US2）**: Phase 2 ＋ Phase 3（T005 の auth.ts 修正）完了後に開始可能
- **Phase 5（Polish）**: Phase 3・4 完了後

### User Story Dependencies

- **US1（P1）**: Phase 2 完了後に独立して実装・テスト可能
- **US2（P2）**: Phase 2 ＋ T005（jwt コールバック修正）完了後に開始。T007（getActiveCampaign）→ T008（auth.ts キャンペーン付与）の順序を守る

### Within Each User Story

- T002 → T003（スキーマ）→ T004（マイグレーション）の順序を守る
- T007（points.ts）→ T008（auth.ts への組み込み）の順序を守る
- T009・T010（API）は T007 完了後に並列実行可
- T013（layout）→ T014（一覧）→ T015・T016（フォーム）の順序を守る

---

## Parallel Opportunities

### Phase 2 内の並列実行

```
T002（user.role 追加）
T003（campaign テーブル追加）[P]  ← 同時に進められる
  → T004（マイグレーション）
```

### Phase 4（US2）内の並列実行

```
T007（points.ts 関数追加）
  → T008（auth.ts 組み込み）

T009（GET+POST /api/admin/campaigns）[P]  ← T007 完了後に並列
T010（PATCH+DELETE /api/admin/campaigns/[id]）[P]  ← 同時に進められる
T011（GET /api/users/me 更新）[P]  ← 同時に進められる
T012（middleware.ts 更新）[P]  ← 同時に進められる
T017（campaigns.test.ts）[P]  ← 同時に進められる

T013（admin layout）
  → T014（campaigns 一覧）
T015（new フォーム）[P]  ← T013 完了後に並列
T016（edit フォーム）[P]  ← 同時に進められる
```

---

## Implementation Strategy

### MVP First（User Story 1 のみ）

1. Phase 1: Setup 完了
2. Phase 2: Foundational 完了（DB スキーマ・マイグレーション）
3. Phase 3: US1（バグ修正）完了
4. **STOP & VALIDATE**: 新規ログインで 10pt 付与を確認
5. 動作確認後に Phase 4（キャンペーン機能）へ進む

### Incremental Delivery

1. Setup + Foundational → スキーマ完成
2. US1 → デイリーポイントバグ修正完成
3. US2 → キャンペーン管理 + 恒久ポイント付与完成

---

## Notes

- `[P]` タスクは異なるファイルを編集するため並列実行可
- 管理者の初期設定は手動 SQL（`UPDATE "app_user" SET role = 'admin' WHERE email = '...'`）で行う
- `token.isNewUser` のフラグは NextAuth の JWT リフレッシュ時に再実行されないよう、処理後に `false` をセットすること
- `DATABASE_URL_UNPOOLED` はマイグレーションのみ、ランタイムは `DATABASE_URL` を使用
