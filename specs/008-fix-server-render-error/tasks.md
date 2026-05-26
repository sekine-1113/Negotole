---
description: "Task list for fix-server-render-error"
---

# Tasks: 本番 Server Components レンダーエラーの修正

**Input**: Design documents from `specs/008-fix-server-render-error/`

**Branch**: `008-fix-server-render-error`

**Organization**: 2つのユーザーストーリー（P1 が MVP）に対応した最小変更セット

## Format: `[ID] [P?] [Story] Description`

- **[P]**: 並列実行可能（異なるファイル、依存なし）
- **[US1]**: User Story 1（本番でアプリが正常表示）に対応
- **[US2]**: User Story 2（エラー発生時に原因を特定）に対応

---

## Phase 1: Setup（共有インフラ）

**Purpose**: 新規依存パッケージなし。既存のコードを活用するため追加セットアップ不要。

*(該当タスクなし)*

---

## Phase 2: Foundational（ブロッキング前提条件）

**Purpose**: US1・US2 の両方が依存する `fetchPosts()` 共有関数を先に作成する。

**⚠️ CRITICAL**: T001（fetchPosts 関数作成）完了後に US1 実装を開始すること

- [x] T001 `negotole/src/lib/posts.ts` を新規作成する。`fetchPosts({ cursorId?: number | null, limit?: number })` 関数を定義し、`negotole/src/app/api/posts/route.ts` の GET ハンドラにある DB クエリ（posts テーブルから `hiddenAt > NOW()` かつ `deletedAt IS NULL` で取得、`id DESC` 順、cursor ページネーション、`limit + 1` 件取得で hasMore 判定）をそのまま移植する。戻り値は `{ posts: Array<{id, content, hiddenAt, createdAt}>, nextCursor: string | null }`

---

## Phase 3: User Story 1 - 本番環境でアプリが正常に表示される（Priority: P1）🎯 MVP

**Goal**: `page.tsx` の HTTP 自己フェッチを排除し、`fetchPosts()` の直接呼び出しに置き換えることで、Vercel 本番環境でのレンダーエラーを解消する。

**Independent Test**: `NEXTAUTH_URL` を環境変数から削除した状態で `pnpm build && pnpm start` を実行し、`http://localhost:3000/` へのアクセスが正常に完了することを確認する。

### Implementation for User Story 1

- [x] T002 [P] [US1] `negotole/src/app/page.tsx` を更新する。`process.env.NEXTAUTH_URL` と `fetch(...)` の呼び出しを削除し、`import { fetchPosts } from "@/lib/posts"` を追加する。`fetchPosts()` を try/catch で呼び出し、例外が発生した場合は `console.error("[HomePage] Failed to fetch posts:", e)` でログを記録した上で `{ posts: [], nextCursor: null }` にフォールバックする
- [x] T003 [P] [US1] `negotole/src/app/api/posts/route.ts` の GET ハンドラを更新する。インラインの DB クエリを `import { fetchPosts } from "@/lib/posts"` に置き換え、cursor 検証（既存の `Number.isSafeInteger` チェック）は route.ts に残し、検証済みの `cursorId` を `fetchPosts({ cursorId, limit })` に渡す形にリファクタリングする
- [x] T004 [US1] `pnpm test` を `negotole/` で実行し、既存の 23 テストがすべてパスすることを確認する（`route.test.ts` の vi.mock が fetchPosts 経由でも機能することを確認）

**Checkpoint**: この時点で `NEXTAUTH_URL` 未設定の本番環境でも `/` ページが正常にレンダーされること

---

## Phase 4: User Story 2 - エラー発生時に原因を特定できる（Priority: P2）

**Goal**: DB 障害等でエラーが発生した場合に、サーバーログからコンポーネント名・エラー内容を素早く特定できるようにする。

**Independent Test**: `fetchPosts()` が例外をスローするようにモックした状態でページにアクセスし、サーバーログに `[HomePage]` を含むエラーメッセージが記録されることを確認する。

### Implementation for User Story 2

- [x] T005 [US2] T002 で追加した `console.error` のフォーマットを確認・調整する。`negotole/src/app/page.tsx` の catch ブロックのログに、コンポーネント識別子（`[HomePage]`）とエラーメッセージが含まれていることを確認し、不足があれば補完する
- [x] T006 [US2] `pnpm build` を `negotole/` で実行し、本番ビルドが警告・エラーなく完了することを確認する

**Checkpoint**: この時点でエラー発生時のサーバーログに `[HomePage] Failed to fetch posts:` が記録され、原因特定が可能であること

---

## Phase 5: Polish & Cross-Cutting Concerns

**Purpose**: 残課題の整理

- [x] T007 [P] `docs/todo.md` の TODO リストに本件（本番 Server Components エラー）の参照を追加する（項目 15 相当の可観測性に関連するため、修正済みの追記または新項目として `~~本番 Server Components の HTTP 自己フェッチによるレンダーエラー~~（対応済み: specs/008-fix-server-render-error）` を追記する）

---

## Dependencies & Execution Order

### Phase Dependencies

- **Foundational (Phase 2)**: 依存なし - 即時開始可能
- **User Story 1 (Phase 3)**: T001 完了後に開始
- **User Story 2 (Phase 4)**: T002 完了後に開始（T005 は T002 の成果物を確認する）
- **Polish (Phase 5)**: Phase 4 の全タスク完了後

### Within User Story 1

- T002（page.tsx 変更）と T003（route.ts 変更）は T001 完了後に**並列**実行可能（別ファイル）
- T004（pnpm test）は T002・T003 両方の完了後に実行

### Within User Story 2

- T005（ログフォーマット確認）は T002 完了後に実行
- T006（pnpm build）は T003 完了後に実行（並列可能）

---

## Parallel Example: User Story 1

```bash
# T001 完了後、T002 と T003 は並列実行可能:
Task: "page.tsx の HTTP fetch を fetchPosts() 直接呼び出しに置換"
Task: "route.ts GET ハンドラを fetchPosts() 呼び出しにリファクタリング"

# T002, T003 が完了してから:
Task: "pnpm test で 23 テストがパスすることを確認"
```

---

## Implementation Strategy

### MVP First（User Story 1 のみ）

1. Phase 2 完了: `fetchPosts()` 関数を `src/lib/posts.ts` に作成
2. Phase 3（T002 + T003 並列 → T004）: page.tsx と route.ts を更新、テスト確認
3. **STOP and VALIDATE**: `NEXTAUTH_URL` なしで `pnpm build && pnpm start` して `/` にアクセス
4. Phase 4（T005, T006）: エラーログ確認とビルド確認
5. Phase 5（T007）: todo.md 更新

---

## Notes

- [P] タスクは異なるファイルを対象とするため並列実行可能
- `pnpm test` と `pnpm build` は `negotole/` ディレクトリで実行すること
- T003 で cursor 検証ロジック（`Number.isSafeInteger` チェック + 400 レスポンス）は route.ts に残す（HTTP 層の関心事）
- `fetchPosts()` は DB クエリのみを担当し、HTTP の詳細（ステータスコード、レスポンス形式）は呼び出し側が管理する
- 変更対象ファイル: `src/lib/posts.ts`（新規）・`src/app/page.tsx`・`src/app/api/posts/route.ts`
