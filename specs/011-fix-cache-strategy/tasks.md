---
description: "Task list for キャッシュ戦略修正"
---

# Tasks: キャッシュ戦略修正

**Input**: Design documents from `specs/011-fix-cache-strategy/`

**Branch**: `011-fix-cache-strategy`

**Organization**: 2つのユーザーストーリーに対応した最小変更セット（`points.ts`・`Header.tsx`・`route.ts` の3ファイルのみ）

## Format: `[ID] [P?] [Story] Description`

- **[P]**: 並列実行可能（異なるファイル、依存なし）
- **[US1]**: User Story 1（Header ポイント表示のリアルタイム同期）に対応
- **[US2]**: User Story 2（投稿一覧のキャッシュ動作の明示化）に対応

---

## Phase 1: Setup（共有インフラ）

**Purpose**: 新規パッケージなし。`unstable_cache` および `revalidateTag` は `next/cache` から利用可能。追加セットアップ不要。

*(該当タスクなし)*

---

## Phase 2: Foundational（ブロッキング前提条件）

**Purpose**: `getPointBalance`（`negotole/src/lib/points.ts`）・`Header.tsx`・`route.ts` はすべて実装済み。ブロッキング前提条件なし。

*(該当タスクなし — US1・US2 は即時開始可能)*

---

## Phase 3: User Story 1 - Header ポイント表示のリアルタイム同期（Priority: P1）🎯 MVP

**Goal**: ポイント消費後にどのページへ遷移しても、Header に表示されるポイント残高が次のページロード時に正確な最新値を反映する状態にする。

**Independent Test**: `/post/new` で投稿（ポイント消費）後に `/admin/campaigns` へ遷移し、Header のポイント残高が消費後の正確な値を表示することを確認する。

### Implementation for User Story 1

- [x] T001 [US1] `negotole/src/lib/points.ts` に `getCachedPointBalance` 関数を追加する。`import { unstable_cache } from "next/cache"` を追加し、以下の関数をファイル末尾に追加する: `export function getCachedPointBalance(userId: number) { return unstable_cache(() => getPointBalance(userId), [\`point-balance-${userId}\`], { tags: [\`user-points-${userId}\`], revalidate: false })(); }`
- [x] T002 [US1] `negotole/src/components/Header.tsx` のインポートを更新し、`getPointBalance` の呼び出しを `getCachedPointBalance` に変更する。`import { getPointBalance, hasDailyPointToday, grantDailyPoints } from "@/lib/points"` を `import { getCachedPointBalance, hasDailyPointToday, grantDailyPoints } from "@/lib/points"` に変更し、`getPointBalance(Number(session.user.id))` を `getCachedPointBalance(Number(session.user.id))` に変更する。
- [x] T003 [US1] `negotole/src/app/api/posts/route.ts` の POST ハンドラーを更新する。`import { revalidatePath } from "next/cache"` を `import { revalidatePath, revalidateTag } from "next/cache"` に変更し、`revalidatePath("/"); revalidatePath("/post/new");` を `revalidateTag(\`user-points-${userId}\`, "max");` に置き換える。
- [x] T004 [US1] `negotole/` ディレクトリで `pnpm test` を実行し、既存の全テストがパスすることを確認する（デグレなし、SC-003 対応）。

**Checkpoint**: この時点で、任意のページからポイント消費後に別ページへ遷移するとヘッダーポイントが更新される（US1 達成）

---

## Phase 4: User Story 2 - 投稿一覧のキャッシュ動作の明示化（Priority: P2）

**Goal**: GET `/api/posts` のレスポンスに `Cache-Control: no-store` を付与し、ブラウザおよび CDN が投稿一覧をキャッシュしない状態にする。

**Note**: T003 で `negotole/src/app/api/posts/route.ts` を変更済みのため、T005 は T003 完了後に実施すること（同一ファイルの競合防止）。

**Independent Test**: GET `/api/posts` へのリクエストのレスポンスヘッダーに `Cache-Control: no-store` が含まれることを確認する（SC-002 対応）。

### Implementation for User Story 2

- [x] T005 [US2] `negotole/src/app/api/posts/route.ts` の GET ハンドラーを更新する。`return NextResponse.json(result);` を `return NextResponse.json(result, { headers: { "Cache-Control": "no-store" } });` に変更する。

**Checkpoint**: この時点で US1・US2 の両方が達成されていること

---

## Phase 5: Polish & Cross-Cutting Concerns

**Purpose**: ビルド確認と最終検証

- [x] T006 [P] `negotole/` ディレクトリで `pnpm build` を実行し、本番ビルドが警告・エラーなく完了することを確認する（TypeScript 型チェック含む）。
- [ ] T007 [P] 手動テスト確認項目: (1) 投稿作成後に `/admin/campaigns` へ遷移してヘッダーポイントが更新されること（SC-001）、(2) GET `/api/posts` レスポンスヘッダーに `Cache-Control: no-store` が含まれること（SC-002）、(3) 同日中に複数回リロードしてもポイント重複付与されないこと。

---

## Dependencies & Execution Order

### Phase Dependencies

- **Foundational (Phase 2)**: 該当なし（即時開始可能）
- **User Story 1 (Phase 3)**: 依存なし — 即時開始可能
- **User Story 2 (Phase 4)**: T003 完了後（同一ファイル競合防止のため）
- **Polish (Phase 5)**: Phase 3・4 の全タスク完了後

### Within User Story 1

- T001（points.ts 変更）が先
- T002（Header.tsx）と T003（route.ts POST）は T001 完了後に**並列**実行可能（異なるファイル）
- T004（pnpm test）は T001・T002・T003 すべての完了後に実行

### Parallel Opportunities

- T002 と T003 は並列実行可能（異なるファイル、T001 完了後）
- T006 と T007 は並列実行可能（Polish 内）

---

## Parallel Example: User Story 1 の実装

```bash
# T001 完了後、並列実行可能:
Task: "Header.tsx の import を getCachedPointBalance に更新"  # T002
Task: "route.ts POST ハンドラーを revalidateTag に更新"       # T003

# T002・T003 完了後:
Task: "pnpm test で全テストがパスすることを確認"               # T004

# T004 完了後 (US2 + Polish):
Task: "route.ts GET ハンドラーに Cache-Control 追加"          # T005
Task: "pnpm build で本番ビルド確認"                           # T006
```

---

## Implementation Strategy

### MVP First（User Story 1 のみ）

1. T001（points.ts に getCachedPointBalance 追加）
2. T002・T003 を並列実行（Header.tsx + route.ts 変更）
3. T004（pnpm test 確認）
4. **STOP and VALIDATE**: ポイント消費後の別ページ遷移でヘッダーポイントが更新されることを確認
5. Phase 4（T005）に進む
6. Phase 5（T006 + T007）でビルド・手動テスト確認

### Incremental Delivery

1. US1 完了 → ヘッダーポイントが全ページで同期（MVP）
2. US2 追加 → 投稿一覧の Cache-Control 明示化
3. Polish → ビルド確認・手動テスト

---

## Notes

- 変更対象は `negotole/src/lib/points.ts`・`negotole/src/components/Header.tsx`・`negotole/src/app/api/posts/route.ts` の **3 ファイルのみ**
- `pnpm test` は `negotole/` ディレクトリで実行すること
- `pnpm build` は `negotole/` ディレクトリで実行すること
- `revalidateTag` の第 2 引数 `"max"` は stale-while-revalidate セマンティクス（Next.js 16 推奨）
- `getCachedPointBalance` はユーザー別キャッシュキー・タグを使用するため、他ユーザーへの影響なし
