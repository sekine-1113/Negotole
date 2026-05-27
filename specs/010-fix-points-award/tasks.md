---
description: "Task list for デイリーポイント付与バグ修正"
---

# Tasks: デイリーポイント付与バグ修正

**Input**: Design documents from `specs/010-fix-points-award/`

**Branch**: `010-fix-points-award`

**Organization**: 2つのユーザーストーリー（P1 が MVP）に対応した最小変更セット（`Header.tsx` 1ファイルのみ）

## Format: `[ID] [P?] [Story] Description`

- **[P]**: 並列実行可能（異なるファイル、依存なし）
- **[US1]**: User Story 1（翌日の訪問で自動的にデイリーポイントが付与される）に対応
- **[US2]**: User Story 2（再ログイン時に当日未取得の場合はポイントが付与される）に対応

---

## Phase 1: Setup（共有インフラ）

**Purpose**: 新規パッケージなし。既存の `hasDailyPointToday` / `grantDailyPoints` 関数はそのまま利用する。追加セットアップ不要。

*(該当タスクなし)*

---

## Phase 2: Foundational（ブロッキング前提条件）

**Purpose**: ポイント付与ロジック（`hasDailyPointToday` / `grantDailyPoints`）は `negotole/src/lib/points.ts` に実装済みで正常動作している。変更対象の `Header.tsx` はすでに `@/lib/points` から `getPointBalance` をインポートしている。ブロッキング前提条件なし。

*(該当タスクなし — US1・US2 は即時開始可能)*

---

## Phase 3: User Story 1 - 翌日の訪問で自動的にデイリーポイントが付与される（Priority: P1）🎯 MVP

**Goal**: セッションを維持したまま翌日にページを訪問したとき、再ログインなしにデイリーポイント（10pt）が自動付与される状態にする。

**Independent Test**: ログイン済み状態で前日にポイントを受け取った後、JST 日付変更後にページをリロードし、ポイント残高に 10pt が追加されることを確認する（ログアウト操作なし）。

### Implementation for User Story 1

- [x] T001 [US1] `negotole/src/components/Header.tsx` のインポートを更新する。`import { getPointBalance } from "@/lib/points"` を `import { getPointBalance, hasDailyPointToday, grantDailyPoints } from "@/lib/points"` に変更する。
- [x] T002 [US1] `negotole/src/components/Header.tsx` にデイリーポイント付与チェックを追加する。`session?.user?.id` が存在するとき、既存の `getPointBalance` try/catch ブロックの**前**（`let totalPoints = 0` の直後）に以下を追加する: `if (session?.user?.id) { try { const alreadyGranted = await hasDailyPointToday(Number(session.user.id)); if (!alreadyGranted) await grantDailyPoints(Number(session.user.id)); } catch { /* サイレント失敗 — ユーザー操作を阻害しない（FR-005） */ } }` これにより、全ページのレンダリング時に当日のポイント付与チェックが行われる。
- [x] T003 [US1] `negotole/` ディレクトリで `pnpm test` を実行し、既存の 23 テストがすべてパスすることを確認する（デグレなし、SC-004 対応）。

**Checkpoint**: この時点で、セッション継続のまま翌日ページを訪問しても 10pt が付与される（US1 達成）

---

## Phase 4: User Story 2 - 再ログイン時に当日未取得の場合はポイントが付与される（Priority: P2）

**Goal**: 再ログイン後にページを訪問した際、当日分のデイリーポイントが付与されること。

**Note**: T001・T002 の変更により US2 も自動的に達成される。`Header.tsx` はログイン後のリダイレクト先でもレンダリングされるため、再ログイン時にも `hasDailyPointToday` チェックが実行される。`auth.ts` の `jwt` コールバックはサインイン直後の付与として引き続き機能し、変更不要。

**Independent Test**: 前日にポイントを受け取った後にログアウトし、翌日 JST で再ログインして、ポイント残高に 10pt が追加されることを確認する。

### Verification for User Story 2

- [x] T004 [US2] `negotole/src/lib/auth.ts` を確認し、`jwt` コールバックのポイント付与ロジック（`hasDailyPointToday` / `grantDailyPoints`）が変更されていないことを確認する（読み取り専用・コード変更なし）。

**Checkpoint**: この時点で US1・US2 の両方が達成されていること

---

## Phase 5: Polish & Cross-Cutting Concerns

**Purpose**: ビルド確認と最終検証

- [x] T005 [P] `negotole/` ディレクトリで `pnpm build` を実行し、本番ビルドが警告・エラーなく完了することを確認する（TypeScript 型チェック含む）。
- [ ] T006 [P] 手動テスト確認項目: (1) ログイン済みユーザーが JST 翌日にページをリロードして 10pt 付与されること（SC-001）、(2) 同日中に複数回リロードしても重複付与されないこと（SC-002）、(3) 未ログインユーザーでページ表示エラーが発生しないこと。

---

## Dependencies & Execution Order

### Phase Dependencies

- **Foundational (Phase 2)**: 該当なし（即時開始可能）
- **User Story 1 (Phase 3)**: 依存なし — 即時開始可能
- **User Story 2 (Phase 4)**: T001・T002 完了後（同一変更で達成されるため）
- **Polish (Phase 5)**: Phase 3・4 の全タスク完了後

### Within User Story 1

- T001（import 変更）と T002（ロジック追加）は**順次**実行（同一ファイル・T001 が先）
- T003（pnpm test）は T001・T002 両方の完了後に実行

### Parallel Opportunities

- T005・T006 は並列実行可能（Polish 内）
- T001 と T004 は並列実行可能（異なるファイル）

---

## Parallel Example: User Story 1 の実装

```bash
# T001 → T002 の順（同一ファイル）:
Task: "Header.tsx の import を更新"               # T001
Task: "Header.tsx にデイリーポイントチェック追加" # T002

# T002 完了後:
Task: "pnpm test で 23 テストがパスすることを確認" # T003

# T003 完了後（並列実行可能）:
Task: "pnpm build で本番ビルド確認"               # T005
Task: "手動テスト確認"                            # T006
```

---

## Implementation Strategy

### MVP First（User Story 1 のみ）

1. T001（import 更新）→ T002（ロジック追加）の順で `Header.tsx` を変更
2. T003（pnpm test 確認）
3. **STOP and VALIDATE**: セッション継続のまま翌日訪問でポイント付与されることを確認
4. Phase 4（T004 確認）に進む
5. Phase 5（T005 + T006）でビルド・手動テスト確認

### Incremental Delivery

1. US1 完了 → セッション継続のまま翌日訪問でデイリーポイントが付与される（MVP）
2. US2 確認 → 再ログイン時のポイント付与も保証される
3. Polish → ビルド確認・手動テスト

---

## Notes

- 変更対象は `negotole/src/components/Header.tsx` の **1 ファイルのみ**
- `negotole/src/lib/points.ts` および `negotole/src/lib/auth.ts` は変更しない
- `pnpm test` は `negotole/` ディレクトリで実行すること
- `pnpm build` は `negotole/` ディレクトリで実行すること
- ポイント付与失敗時はサイレント失敗（catch ブロック空）— ユーザー操作を阻害しない（FR-005）
- `session?.user?.id` は既存の `getPointBalance` 呼び出しと同じフィールドを使用する
