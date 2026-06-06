# Tasks: API ルートのテスト追加

**Input**: Design documents from `/specs/017-api-route-tests/`

**Prerequisites**: plan.md ✅, spec.md ✅, research.md ✅

**Tests**: このフィーチャー自体がテスト追加作業。TDD は不適用。

**Organization**: US1（認証・認可テスト）と US2（バリデーション・正常系テスト）はファイル単位で分離可能。ビルドベースライン確認 → テスト追加 → テスト実行確認の順で進める。

## Format: `[ID] [P?] [Story] Description`

- **[P]**: 並列実行可（異なるファイル、依存なし）
- **[Story]**: 対応するユーザーストーリー（US1, US2）

---

## Phase 1: Setup

**Purpose**: テスト実行ベースラインを確認する

- [ ] T001 `negotole/` で `pnpm test` を実行し既存テストがすべてパスすることを確認する

**Checkpoint**: ベースライン確認完了 — テスト追加を開始できる

---

## Phase 2: Foundational（なし）

US1・US2 は完全に独立したファイルを扱うため、共通前提処理は不要。Phase 1 完了後すぐに並列実装できる。

---

## Phase 3: User Story 1 — 主要 API ルートの認証・認可テスト (Priority: P1) 🎯 MVP

**Goal**: 未認証・権限不足のリクエストに対して各 API が 401/403 を返すことを自動テストで保証する。

**Independent Test**: `pnpm test` を実行し、新規追加した認証・認可テストがすべてパスすることを確認する。

### Implementation for User Story 1

- [ ] T002 [P] [US1] `negotole/src/app/api/health/__tests__/route.test.ts` を新規作成する。`vi.mock("@/lib/db", () => ({ db: { execute: mockExecute } }))` でDBをモックし、`GET /api/health` が正常時に 200 と `{ status: "ok", db: "ok" }` を返すこと、DB 例外時に 503 と `{ status: "error", db: "error" }` を返すことをテストする
- [ ] T003 [P] [US1] `negotole/src/app/api/users/me/__tests__/route.test.ts` を新規作成する。`vi.mock("@/lib/auth")` と `vi.mock("@/lib/db")`・`vi.mock("@/lib/points")` でモックし、未認証（`auth` が null）→ 401、認証済みでユーザーが存在する → 200 + `{ user, points }` を返すことをテストする
- [ ] T004 [P] [US1] `negotole/src/app/api/posts/__tests__/route.test.ts` に `POST /api/posts` の認証テストを追記する。`vi.mock("@/lib/auth")` を追加し、未認証 → 401 となることをテストする。既存の GET テストには手を加えない
- [ ] T005 [P] [US1] `negotole/src/app/api/admin/campaigns/__tests__/route.test.ts` を新規作成する（認証・認可部分のみ）。`GET`: 未認証 → 401、一般ユーザー → 403。`POST`: 未認証 → 401、一般ユーザー → 403 をテストする
- [ ] T006 [P] [US1] `negotole/src/app/api/admin/campaigns/[id]/__tests__/route.test.ts` を新規作成する（認証部分のみ）。`PATCH`: 未認証 → 401。`DELETE`: 未認証 → 401 をテストする

**Checkpoint**: US1 完了 — 認証・認可テストがすべてパスする

---

## Phase 4: User Story 2 — バリデーション・正常系テスト (Priority: P2)

**Goal**: 入力バリデーションエラーと正常系のレスポンスを自動テストで検証する。

**Independent Test**: `pnpm test` を実行し、バリデーション・正常系テストがすべてパスすることを確認する。

### Implementation for User Story 2

- [ ] T007 [US2] `negotole/src/app/api/admin/campaigns/__tests__/route.test.ts` に US2 のテストケースを追記する（T005 と同じファイル）。`GET`: 管理者 + 不正な cursor → 400。`POST`: 管理者 + name 空 → 400、管理者 + endsAt <= startsAt → 400、管理者 + bonusPoints が 0 → 400、管理者 + 既存アクティブキャンペーン → 409、管理者 + 正常入力（既存なし）→ 201 をテストする。DB モックは `mockSelect`（既存確認用）と `mockInsert`（INSERT 用）を使う
- [ ] T008 [US2] `negotole/src/app/api/admin/campaigns/[id]/__tests__/route.test.ts` に US2 のテストケースを追記する（T006 と同じファイル）。`PATCH`: 管理者 + 存在しない ID → 404 をテストする。DB モックで存在確認クエリが空配列を返すよう設定する

**Checkpoint**: US2 完了 — バリデーション・正常系テストがすべてパスする

---

## Phase 5: Polish & Cross-Cutting Concerns

**Purpose**: 全テスト実行確認と TypeScript 型チェック

- [ ] T009 `negotole/` で `pnpm test` を実行し全テスト（既存 + 新規）がパスすることを確認する
- [ ] T010 `negotole/` で `pnpm tsc --noEmit` を実行し型エラーがないことを確認する

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (Phase 1)**: 依存なし — 即開始可能
- **US1 (Phase 3)**: Phase 1 完了後に開始
- **US2 (Phase 4)**: Phase 1 完了後に開始（US1 と並行可）
- **Polish (Phase 5)**: US1・US2 の両方が完了した後

### User Story Dependencies

- **US1 (P1)**: T002〜T006 は異なるファイルなので並列実行可
- **US2 (P2)**: T007 は T005 と同じファイル（T005 完了後）、T008 は T006 と同じファイル（T006 完了後）

### Parallel Opportunities

- T002・T003・T004・T005・T006 は異なるファイルのため並列実行可
- T007 は T005、T008 は T006 と同じファイルなので順次

---

## Parallel Example

```bash
# US1 の 5 タスクを並列開始:
Task: T002 "Create negotole/src/app/api/health/__tests__/route.test.ts"
Task: T003 "Create negotole/src/app/api/users/me/__tests__/route.test.ts"
Task: T004 "Add POST auth test to negotole/src/app/api/posts/__tests__/route.test.ts"
Task: T005 "Create negotole/src/app/api/admin/campaigns/__tests__/route.test.ts (auth)"
Task: T006 "Create negotole/src/app/api/admin/campaigns/[id]/__tests__/route.test.ts (auth)"

# T005 完了後:
Task: T007 "Add validation tests to campaigns/__tests__/route.test.ts"

# T006 完了後:
Task: T008 "Add 404 test to campaigns/[id]/__tests__/route.test.ts"
```

---

## Implementation Strategy

### MVP First (User Story 1 Only)

1. Phase 1: テスト実行ベースライン確認（T001）
2. Phase 3 (US1): 認証・認可テスト5ファイル（T002〜T006）
3. **STOP and VALIDATE**: `pnpm test` で新規テストがパスすることを確認
4. デモ可能な状態（主要 API の認証テストがある）

### Incremental Delivery

1. Setup: ベースライン確認
2. US1 完了 → 認証リグレッション検知が可能に → MVP
3. US2 完了 → バリデーション・正常系まで網羅
4. Polish: 型チェック・全テスト確認

---

## Notes

- [P] タスクは異なるファイルを扱い依存なし（並列実行可）
- T004 は既存ファイルへの**追記**のみ — 既存の describe ブロックを変更しない
- T007・T008 は US1 と同じファイルへの追記なので、T005・T006 完了後に実施
- `POST /api/posts` の正常系テストはモックが複雑なためスコープ外（E2E #19 で対応）
- 各テストファイルで `vi.clearAllMocks()` を `beforeEach` に必ず含める
