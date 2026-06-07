# Tasks: 管理者用アカウント凍結機能

**Input**: Design documents from `specs/020-admin-account-freeze/`

**Prerequisites**: plan.md, spec.md, research.md, data-model.md, contracts/api.md

---

## Phase 1: Setup (Shared Infrastructure)

*このフィーチャーは既存の Next.js プロジェクトへの追加のため、新規セットアップは不要。*

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: 全 User Story が依存する DB スキーマ変更・認証フロー変更・ミドルウェアを完了させる

**⚠️ CRITICAL**: このフェーズが完了するまで User Story の実装を開始できない

- [x] T001 `users` テーブルに `bannedAt` カラムを追加（nullable timestamp）— `negotole/src/lib/db/schema.ts`
- [x] T002 Drizzle マイグレーションを生成・適用して `banned_at` カラムをDBに追加 — `negotole/drizzle/migrations/`
- [x] T003 [P] JWT / Session 型に `isFrozen?: boolean` を追加 — `negotole/src/types/next-auth.d.ts`
- [x] T004 auth.ts の `jwt` callback に凍結チェックを追加（`unstable_cache` で `bannedAt` をキャッシュし `token.isFrozen` をセット） — `negotole/src/lib/auth.ts`
- [x] T005 auth.ts の `signIn` callback に凍結ユーザーのログイン拒否処理を追加（DB で `bannedAt` を確認し `false` を返す） — `negotole/src/lib/auth.ts`
- [x] T006 凍結ユーザーを `/account-suspended` にリダイレクトする middleware を新規作成 — `negotole/src/middleware.ts`
- [x] T007 [P] 凍結通知ページを新規作成（「アカウントが停止されています」とサインアウトボタン） — `negotole/src/app/account-suspended/page.tsx`

**Checkpoint**: DB に `banned_at` カラムが存在し、凍結済みユーザーが `/account-suspended` にリダイレクトされることを確認

---

## Phase 3: User Story 1 - 管理者がアカウントを凍結する (Priority: P1) 🎯 MVP

**Goal**: 管理者が `/admin/users` でユーザーを選択して凍結でき、対象ユーザーのセッションが即座に無効化される

**Independent Test**: 管理者が任意ユーザーの凍結ボタンを押す → DB の `bannedAt` が更新される → 対象ユーザーが次のリクエストで `/account-suspended` にリダイレクトされる

### Implementation for User Story 1

- [x] T008 [US1] GET `/api/admin/users` を実装（全ユーザー一覧を `bannedAt` 含めて返す、管理者のみ許可） — `negotole/src/app/api/admin/users/route.ts`
- [x] T009 [US1] POST `/api/admin/users/[id]/freeze` を実装（`bannedAt` 更新・`revalidateTag` 実行・`admin_audit_log` 記録） — `negotole/src/app/api/admin/users/[id]/freeze/route.ts`
- [x] T010 [P] [US1] 凍結ボタン Client Component を新規作成（凍結 API を呼び出し・ローディング状態・エラーハンドリング） — `negotole/src/app/admin/users/FreezeButton.tsx`
- [x] T011 [US1] 管理者ユーザー一覧ページを新規作成（ユーザー名・ID・凍結状態を表示し `FreezeButton` を配置） — `negotole/src/app/admin/users/page.tsx`
- [x] T012 [US1] 管理パネル nav に「ユーザー管理」リンクを追加 — `negotole/src/app/admin/layout.tsx`

**Checkpoint**: 管理者が凍結ボタンを押すと DB が更新され、対象ユーザーがアクセス不可になることを確認

---

## Phase 4: User Story 2 - 管理者が凍結を解除する (Priority: P2)

**Goal**: 管理者が凍結済みユーザーの凍結を解除でき、ユーザーが再度ログインできるようになる

**Independent Test**: 凍結済みユーザーの解除ボタンを押す → DB の `bannedAt` が null になる → 対象ユーザーが通常通りログインできる

### Implementation for User Story 2

- [x] T013 [US2] POST `/api/admin/users/[id]/unfreeze` を実装（`bannedAt = null` 更新・`revalidateTag` 実行・`admin_audit_log` 記録） — `negotole/src/app/api/admin/users/[id]/unfreeze/route.ts`
- [x] T014 [US2] `FreezeButton` に解除アクションを追加（凍結中ユーザーには「解除」ボタン、有効ユーザーには「凍結」ボタンを表示） — `negotole/src/app/admin/users/FreezeButton.tsx`

**Checkpoint**: 凍結・解除の双方向操作が正しく動作することを確認

---

## Phase 5: User Story 3 - 管理者が凍結済みアカウントを一覧確認する (Priority: P3)

**Goal**: 管理者が凍結中のアカウントのみをフィルタして一目で把握できる

**Independent Test**: 凍結中ユーザーが複数いる状態で絞り込みフィルタを ON にする → 凍結ユーザーのみが表示される

### Implementation for User Story 3

- [x] T015 [US3] `/admin/users` ページに凍結中フィルタ UI を追加（`searchParams` で `?frozen=true` を受け取り一覧を絞り込み） — `negotole/src/app/admin/users/page.tsx`

**Checkpoint**: 凍結中フィルタが正しく動作し、理由・日時が確認できることを確認

---

## Phase 6: Polish & Cross-Cutting Concerns

- [x] T016 `pnpm build` を実行して型エラー・ビルドエラーがないことを確認 — `negotole/`

---

## Dependencies & Execution Order

### Phase Dependencies

- **Foundational (Phase 2)**: T001 → T002 → T003-T007（T003, T007 は並列可）、T004 は T001 完了後、T005 は T001 完了後、T006 は T004 完了後
- **US1 (Phase 3)**: Phase 2 完了後 — T008 → T009 → T010（並列可）→ T011 → T012
- **US2 (Phase 4)**: Phase 2 完了後 — T013 → T014
- **US3 (Phase 5)**: T011 完了後 — T015
- **Polish (Phase 6)**: 全フェーズ完了後

### Parallel Opportunities

- T003, T007 は Phase 2 内で並列実行可
- T009, T010 は Phase 3 内で並列実行可
- US1 完了後、US2 と US3 は並列実行可

---

## Implementation Strategy

### MVP First (User Story 1 のみ)

1. Phase 2: Foundational 完了（T001〜T007）
2. Phase 3: US1 完了（T008〜T012）
3. **STOP & VALIDATE**: 凍結フローをエンドツーエンドで確認
4. 問題なければ US2・US3 に進む

### Incremental Delivery

1. Foundational → 凍結セッション無効化が機能する
2. US1 → 凍結操作 UI が動作する（MVP）
3. US2 → 解除操作が動作する
4. US3 → フィルタ UI が動作する
