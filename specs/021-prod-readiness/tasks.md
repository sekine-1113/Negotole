---
description: "Tasks for 021-prod-readiness"
---

# Tasks: 本番公開準備（レートリミット・ページネーション・APIテスト）

**Input**: `specs/021-prod-readiness/plan.md`, `spec.md`, `research.md`, `contracts/api.md`

**Format**: `- [ ] [TaskID] [P?] [Story?] Description — file path`

- **[P]**: 他の並行タスクと別ファイルかつ依存なし
- **[Story]**: 対応する user story（US1〜US4）
- ファイルパスは `negotole/src/` からの相対で記載

---

## Phase 1: Setup

**Purpose**: 前提確認（新規パッケージ・DB変更・環境セットアップは不要）

- [x] T001 ratelimit.ts・vitest 設定・テスト環境が使用可能であることを確認（`negotole/src/lib/ratelimit.ts` と `negotole/vitest.config.ts` を読む）

---

## Phase 2: Foundational

> 前提条件（`ratelimit.ts`・Drizzle スキーマ・NextAuth）は全て実装済み。各 user story は独立して開始可能。

（タスクなし）

---

## Phase 3: User Story 1 - 投稿APIへのレートリミット適用（Priority: P1）🎯 MVP

**Goal**: `ratelimit.ts` で定義済みの limiter を全ての対象ルートに接続する

**Independent Test**: Upstash 環境で `POST /api/posts` を 11 回連続送信し、11 回目に 429 が返ること

**実装パターン**（全タスク共通、research.md Decision 2 参照）:
```ts
if (adminLimiter) {
  try {
    const { success } = await adminLimiter.limit(`user:${userId}`);
    if (!success) return NextResponse.json({ error: "Too Many Requests" }, { status: 429 });
  } catch (e) {
    log("warn", "ratelimit.check_failed", { userId, error: String(e) });
  }
}
```

### Implementation for User Story 1

- [x] T002 [US1] `POST` ハンドラの `auth()` 取得直後に `postWriteLimiter` を fail-open パターンで適用 — `negotole/src/app/api/posts/route.ts`
- [x] T003 [P] [US1] `GET` ハンドラの `auth()` 取得・認可チェック直後に `adminLimiter` を fail-open パターンで適用 — `negotole/src/app/api/admin/users/route.ts`
- [x] T004 [P] [US1] `POST` ハンドラの認可チェック直後に `adminLimiter` を fail-open パターンで適用 — `negotole/src/app/api/admin/users/[id]/freeze/route.ts`
- [x] T005 [P] [US1] `POST` ハンドラの認可チェック直後に `adminLimiter` を fail-open パターンで適用 — `negotole/src/app/api/admin/users/[id]/unfreeze/route.ts`
- [x] T006 [P] [US1] `DELETE` ハンドラの認可チェック直後に `adminLimiter` を fail-open パターンで適用 — `negotole/src/app/api/admin/posts/[id]/route.ts`

**Checkpoint**: T002〜T006 完了後、全対象ルートでレートリミットが機能する

---

## Phase 4: User Story 2 - お問い合わせ・通報フォームURL確認（Priority: P1）

**Goal**: デプロイ前チェックリストでフォームURL設定が確認できることを確認する

**Independent Test**: 本番環境でお問い合わせ・通報リンクが正しいGoogleフォームURLを指すこと（手動確認）

> **注意**: コード変更なし（research.md Decision 4 参照）。デプロイチェックリストが既に存在することを確認して完了とする。

### Implementation for User Story 2

- [x] T007 [US2] `docs/prod-deploy-tasks.md` を開き、`NEXT_PUBLIC_CONTACT_FORM_URL` と `NEXT_PUBLIC_REPORT_FORM_URL` の確認項目がデプロイチェックリストに存在することを確認する（コード変更なし・確認のみ）

**Checkpoint**: チェックリスト項目の存在を確認済み

---

## Phase 5: User Story 3 - 管理者ユーザー一覧のページネーション（Priority: P2）

**Goal**: `/admin/users` が全件取得でなくカーソルベースで返すようになる

**Independent Test**: `/admin/users` を開いてページ件数が制限され「次へ」リンクが機能すること

> **依存**: T003（US1 の adminLimiter 適用）が完了していること（同一ファイルを変更するため）

### Implementation for User Story 3

- [x] T008 [US3] `GET` ハンドラを `limit`/`cursor`/`frozen` パラメータ対応のカーソルページネーションに書き換え（`campaigns/route.ts` と同パターン、昇順 ID）。レスポンス形式を `{ users: [...], nextCursor: string | null }` に変更 — `negotole/src/app/api/admin/users/route.ts`
- [x] T009 [US3] `searchParams` から `cursor` と `frozen` を受け取り、「次のページへ」リンクを表示するページネーション UI を追加 — `negotole/src/app/admin/users/page.tsx`

**Checkpoint**: ページネーションが機能し、凍結フィルタと組み合わせても正常動作すること

---

## Phase 6: User Story 4 - 管理系 API ユニットテスト（Priority: P2）

**Goal**: freeze/unfreeze/users-list API の権限チェック・正常系・異常系をテストで自動検出できる

**Independent Test**: `pnpm test` を実行してこのフェーズで追加した全テストケースがグリーンになること

> **依存**: T008（ページネーション実装）が完了していること（GET /admin/users のテストはページネーション済みレスポンス形式を期待するため）

**モック方針**（`campaigns/__tests__/route.test.ts` と同一パターン）:
```ts
vi.mock("@/lib/ratelimit", () => ({ adminLimiter: null, postWriteLimiter: null }));
vi.mock("@/lib/auth", () => ({ auth: mockAuth }));
vi.mock("@/lib/db", () => ({ db: { select: mockSelect, update: mockUpdate, insert: mockInsert } }));
vi.mock("next/cache", () => ({ revalidateTag: vi.fn() }));
vi.mock("@/lib/logger", () => ({ log: vi.fn() }));
```

### Implementation for User Story 4

- [x] T010 [P] [US4] `GET /api/admin/users` のテストファイルを作成。カバーするケース: 未認証→403、一般ユーザー→403、管理者・正常取得→200（`{ users, nextCursor }`）、不正カーソル→400 — `negotole/src/app/api/admin/users/__tests__/route.test.ts`
- [x] T011 [P] [US4] `POST /api/admin/users/[id]/freeze` のテストファイルを作成。カバーするケース: 未認証→403、一般ユーザー→403、存在しない ID→404、既凍結→409、正常凍結→200 — `negotole/src/app/api/admin/users/[id]/freeze/__tests__/route.test.ts`
- [x] T012 [P] [US4] `POST /api/admin/users/[id]/unfreeze` のテストファイルを作成。カバーするケース: 未認証→403、一般ユーザー→403、非凍結ユーザーを解除→409、正常解除→200 — `negotole/src/app/api/admin/users/[id]/unfreeze/__tests__/route.test.ts`

**Checkpoint**: `pnpm test` で T010〜T012 の全ケースがグリーン

---

## Phase 7: Polish & 検証

- [x] T013 `pnpm build` を実行して TypeScript 型エラー・ビルドエラーがないことを確認
- [x] T014 `pnpm test` を実行して追加したテスト（T010〜T012）を含む全テストがグリーンであることを確認

---

## Dependencies & Execution Order

### Phase Dependencies

- **Phase 1 (Setup)**: 即時開始可能
- **Phase 3 (US1)**: Phase 1 完了後。T003〜T006 は互いに並行可能（別ファイル）
- **Phase 4 (US2)**: Phase 3 と並行可能（コード変更なし）
- **Phase 5 (US3)**: T003 完了後（同一ファイルのため）
- **Phase 6 (US4)**: T008 完了後（レスポンス形式が決定してからテストを書く）
- **Phase 7 (Polish)**: Phase 6 完了後

### Task-Level Dependencies

| Task | 依存 | 理由 |
|------|------|------|
| T002 | T001 | セットアップ確認後 |
| T003〜T006 | T001 | セットアップ確認後（互いに並行可） |
| T007 | T002〜T006 | US1 完了確認 |
| T008 | T003 | 同一ファイル（adminLimiter 適用済みの状態で書き換え） |
| T009 | T008 | route.ts のレスポンス形式確定後に UI を実装 |
| T010 | T008 | ページネーション済み GET のテストを書く |
| T011 | T004 | freeze route.ts の最終形確定後 |
| T012 | T005 | unfreeze route.ts の最終形確定後 |
| T013 | T009, T010, T011, T012 | 全実装完了後にビルド確認 |
| T014 | T013 | ビルド確認後にテスト実行 |

### Parallel Opportunities

```bash
# Phase 3: US1 の admin ルートはすべて並行実行可能
T003: adminLimiter → negotole/src/app/api/admin/users/route.ts
T004: adminLimiter → negotole/src/app/api/admin/users/[id]/freeze/route.ts
T005: adminLimiter → negotole/src/app/api/admin/users/[id]/unfreeze/route.ts
T006: adminLimiter → negotole/src/app/api/admin/posts/[id]/route.ts

# Phase 6: US4 のテストは T008 完了後に並行実行可能
T010: users/__tests__/route.test.ts
T011: freeze/__tests__/route.test.ts
T012: unfreeze/__tests__/route.test.ts
```

---

## Implementation Strategy

### MVP First（US1 のみ）

1. T001: セットアップ確認
2. T002〜T006: レートリミット接続（P1 完了）
3. T007: フォームURL確認
4. **STOP & VALIDATE**: 本番ライクな環境でレートリミット動作確認

### Incremental Delivery

1. US1（レートリミット）→ セキュリティ強化完了
2. US2（フォームURL）→ 確認完了（コード変更なし）
3. US3（ページネーション）→ 管理画面スケーラビリティ確保
4. US4（テスト）→ リグレッション防止体制確立
5. Polish → ビルド・テスト全通過確認

---

## Notes

- `ratelimit.ts` の `createLimiters()` は env 未設定時に `null` を返す。各タスクで `if (limiter)` による null チェックが必須
- US3 の route.ts ページネーションはカーソル ID が**昇順**（campaigns は降順と異なる）
- US4 のテストでは `vi.mock("@/lib/ratelimit", () => ({ adminLimiter: null }))` でレートリミットを無効化
- T008 で GET /api/admin/users のレスポンス形式が変わる（`rows` → `{ users, nextCursor }`）ため、page.tsx（T009）はT008 完了後に修正
