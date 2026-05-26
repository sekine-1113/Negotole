---
description: "Task list for mobile-responsive"
---

# Tasks: レスポンシブデザイン対応（モバイルファースト）

**Input**: Design documents from `specs/009-mobile-responsive/`

**Branch**: `009-mobile-responsive`

**Organization**: 2つのユーザーストーリー（P1 が MVP）に対応した最小変更セット（Tailwind CSS クラス変更のみ）

## Format: `[ID] [P?] [Story] Description`

- **[P]**: 並列実行可能（異なるファイル、依存なし）
- **[US1]**: User Story 1（スマートフォンでタイムライン閲覧・投稿）に対応
- **[US2]**: User Story 2（管理画面がタブレット・スマートフォンで使える）に対応

---

## Phase 1: Setup（共有インフラ）

**Purpose**: 新規依存パッケージなし。Tailwind CSS 4 は導入済み。追加セットアップ不要。

*(該当タスクなし)*

---

## Phase 2: Foundational（ブロッキング前提条件）

**Purpose**: 全コンポーネントが独立して変更可能なため、ブロッキング前提条件なし。

*(該当タスクなし — US1・US2 は即時開始可能)*

---

## Phase 3: User Story 1 - スマートフォンでタイムラインを閲覧・投稿できる（Priority: P1）🎯 MVP

**Goal**: 画面幅 375px でヘッダーがオーバーフローせず、投稿フォームの iOS ズームが発生しない状態にする。

**Independent Test**: Chrome DevTools で iPhone SE（375px）サイズに設定し、(1) ヘッダーが横スクロールなしに全要素が表示される、(2) テキストエリアをタップしてもページがズームしない、を確認する。

### Implementation for User Story 1

- [x] T001 [P] [US1] `negotole/src/components/Header.tsx` を更新する。外側 `<header>` の `px-4 gap-3` を `px-3 gap-2 sm:px-4 sm:gap-3` に変更し、ログイン済み時の各ボタンに `min-h-[44px]` を追加する。具体的変更: PointBadge の className を `px-2 py-0.5 text-xs min-h-[44px] sm:px-3 sm:py-1 sm:text-sm` に、「投稿する」ボタンを `px-3 py-1 text-xs min-h-[44px] sm:px-4 sm:py-1.5 sm:text-sm` に、「ログアウト」ボタンを `text-xs min-h-[44px] sm:text-sm` に変更する。未ログイン時の「Google でログイン」ボタンも `text-xs min-h-[44px] sm:text-sm` に変更する。
- [x] T002 [P] [US1] `negotole/src/components/PostForm.tsx` を更新する。`<textarea>` の `text-sm`（14px）を `text-base`（16px）に変更して iOS でのフォームズームを防止する（FR-005 対応）。
- [x] T003 [US1] `pnpm test` を `negotole/` ディレクトリで実行し、既存の 23 テストがすべてパスすることを確認する（スタイル変更のみのため既存テストに影響なし）。

**Checkpoint**: この時点で iPhone SE（375px）でヘッダーが崩れず、PostForm でズームが発生しないこと

---

## Phase 4: User Story 2 - 管理画面がタブレット・スマートフォンで使える（Priority: P2）

**Goal**: 管理者がスマートフォン・タブレットでキャンペーン一覧を横スクロールで確認でき、管理画面全体のパディングがモバイルに最適化される。

**Independent Test**: Chrome DevTools で iPhone SE（375px）サイズで `/admin/campaigns` にアクセスし、テーブルが横スクロール可能な状態で表示され、「編集」リンクが操作できることを確認する。

### Implementation for User Story 2

- [x] T004 [P] [US2] `negotole/src/app/admin/layout.tsx` を更新する。`<main>` タグの `className="p-6"` を `className="p-4 sm:p-6"` に変更する（モバイルで左右パディングを削減）。
- [x] T005 [P] [US2] `negotole/src/app/admin/campaigns/page.tsx` を更新する。既存の `<table>` タグを `<div className="overflow-x-auto">` で囲み、テーブルが小画面でも横スクロールで全列を表示できるようにする。
- [x] T006 [US2] `pnpm test` を `negotole/` ディレクトリで実行し、既存の 23 テストがすべてパスすることを確認する（デグレなし）。

**Checkpoint**: この時点で US1・US2 の両方がスマートフォン・タブレットで正常表示されること

---

## Phase 5: Polish & Cross-Cutting Concerns

**Purpose**: ビルド確認と最終検証

- [x] T007 [P] `pnpm build` を `negotole/` ディレクトリで実行し、本番ビルドが警告・エラーなく完了することを確認する。
- [ ] T008 [P] Chrome DevTools で画面幅 320px（最小）・375px・768px・1024px の各ブレークポイントで横スクロールが発生しないことを目視確認する（SC-001 対応）。

---

## Dependencies & Execution Order

### Phase Dependencies

- **Foundational (Phase 2)**: 該当なし（即時開始可能）
- **User Story 1 (Phase 3)**: 依存なし — 即時開始可能
- **User Story 2 (Phase 4)**: 依存なし — US1 と並列実行可能
- **Polish (Phase 5)**: Phase 3・4 の全タスク完了後

### Within User Story 1

- T001（Header.tsx 変更）と T002（PostForm.tsx 変更）は**並列**実行可能（別ファイル）
- T003（pnpm test）は T001・T002 両方の完了後に実行

### Within User Story 2

- T004（admin/layout.tsx 変更）と T005（campaigns/page.tsx 変更）は**並列**実行可能（別ファイル）
- T006（pnpm test）は T004・T005 両方の完了後に実行

### Parallel Opportunities

- T001・T002 は並列実行可能（US1 内）
- T004・T005 は並列実行可能（US2 内）
- T007・T008 は並列実行可能（Polish 内）
- US1（Phase 3）と US2（Phase 4）は共有依存なしのため**並列実行可能**

---

## Parallel Example: User Story 1 + User Story 2 を並列実行

```bash
# US1 と US2 は独立しているため並列実行可能:
Task: "Header.tsx のモバイルコンパクトスタイル + min-h-[44px] 追加"  # T001
Task: "PostForm.tsx textarea を text-base（16px）に変更"              # T002
Task: "admin/layout.tsx を p-4 sm:p-6 に変更"                        # T004
Task: "campaigns/page.tsx テーブルを overflow-x-auto ラッパーで囲む" # T005

# 上記 4 タスク完了後:
Task: "pnpm test で 23 テストがパスすることを確認"  # T003 or T006
```

---

## Implementation Strategy

### MVP First（User Story 1 のみ）

1. T001 + T002 を並列実行（Header + PostForm 変更）
2. T003（pnpm test 確認）
3. **STOP and VALIDATE**: iPhone SE サイズでヘッダー崩れ・ズームがないことを確認
4. Phase 4（T004 + T005 → T006）に進む
5. Phase 5（T007 + T008）でビルド・目視確認

### Incremental Delivery

1. US1 完了 → スマートフォンでのタイムライン閲覧・投稿が快適になる（MVP）
2. US2 追加 → 管理者がモバイルで管理画面を使えるようになる
3. Polish → ビルド確認・全ブレークポイント目視確認

---

## Notes

- [P] タスクは異なるファイルを対象とするため並列実行可能
- `pnpm test` は `negotole/` ディレクトリで実行すること
- `pnpm build` は `negotole/` ディレクトリで実行すること
- 変更はすべて Tailwind CSS クラス文字列の編集のみ（新規ファイルなし）
- `sm:` プレフィックス付きクラスでデスクトップの既存スタイルを維持すること
- Header の `min-h-[44px]` は視覚サイズではなくタップ領域の確保（FR-002 対応）
