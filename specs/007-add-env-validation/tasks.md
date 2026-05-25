---
description: "Task list for env var startup validation"
---

# Tasks: 環境変数の起動時バリデーション

**Input**: Design documents from `specs/007-add-env-validation/`

**Branch**: `007-add-env-validation`

**Organization**: 単一ユーザーストーリー（P1）に対応した最小変更セット

## Format: `[ID] [P?] [Story] Description`

- **[P]**: 並列実行可能（異なるファイル、依存なし）
- **[US1]**: User Story 1 に対応するタスク

---

## Phase 1: Setup（共有インフラ）

**Purpose**: Zod を direct dependency として追加する

- [x] T001 `negotole/` ディレクトリで `pnpm add zod` を実行し、`negotole/package.json` の dependencies に `zod` を追加する

---

## Phase 2: Foundational（ブロッキング前提条件）

**Purpose**: T001 完了後すぐに US1 へ着手可能。ブロッキング前提条件なし。

**⚠️ CRITICAL**: T001（zod インストール）完了後に US1 実装を開始すること

---

## Phase 3: User Story 1 - 必須環境変数の未設定を起動時に検出（Priority: P1）🎯 MVP

**Goal**: `negotole/src/env.ts` に Zod スキーマを定義し、`next.config.ts` からインポートすることで、ビルド時・サーバー起動時の両方で必須環境変数（7変数）を検証する。失敗時は欠如変数名を列挙してプロセスを中断する。

**Independent Test**: `AUTH_SECRET` を環境から削除して `pnpm build` または `pnpm dev` を実行し、「AUTH_SECRET: Required」のようなエラーが表示されて起動が中断されることを確認する。

### Implementation for User Story 1

- [x] T002 [US1] `negotole/src/env.ts` を新規作成する。Zod の `z.object()` で以下の7変数（AUTH_SECRET・AUTH_GOOGLE_ID・AUTH_GOOGLE_SECRET・DATABASE_URL・DATABASE_URL_UNPOOLED・UPSTASH_REDIS_REST_URL・UPSTASH_REDIS_REST_TOKEN）を `z.string().min(1)` で定義し、`safeParse(process.env)` で検証、失敗時は欠如変数を列挙して `throw new Error(...)` で中断、成功時は `export const env = parsed.data` でエクスポートする
- [x] T003 [P] [US1] `negotole/next.config.ts` の先頭（既存の import より前）に `import "./src/env";` を追加する（ビルド時・起動時の両方でバリデーションが実行されるようにする）
- [x] T004 [P] [US1] `negotole/src/lib/db/index.ts` の `process.env.DATABASE_URL!` を、`import { env } from "@/env"` を追加した上で `env.DATABASE_URL` に置き換える（非null アサーション `!` を除去する）
- [x] T005 [US1] `pnpm test` を `negotole/` で実行し、既存の 23 テストがすべてパスすることを確認する（env バリデーションが Vitest のモック機構と干渉しないことを確認）

**Checkpoint**: この時点で必須変数を 1 つでも削除すると `pnpm build` または `pnpm dev` が即座に中断され、欠如変数名が表示されること

---

## Phase 4: Polish & Cross-Cutting Concerns

**Purpose**: 残課題の整理

- [x] T006 [P] `docs/todo.md` の項目 6（環境変数の起動時バリデーションなし）を対応済みとしてマークする（`~~` で打ち消し、`（対応済み: specs/007-add-env-validation）` を追記）

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (Phase 1)**: 依存なし - 即時開始可能
- **User Story 1 (Phase 3)**: T001 完了後に開始
- **Polish (Phase 4)**: Phase 3 のすべてのタスク完了後

### Within User Story 1

- T002（env.ts 作成）は T001 完了後に着手
- T003（next.config.ts 変更）と T004（db/index.ts 変更）は T002 と並列実行可能（別ファイル）
- T005（pnpm test）は T002・T003・T004 がすべて完了してから実行

---

## Parallel Example: User Story 1

```bash
# T002 完了後、T003 と T004 は並列実行可能:
Task: "next.config.ts に import './src/env' を追加"
Task: "db/index.ts を env.DATABASE_URL に更新"

# T002, T003, T004 が完了してから:
Task: "pnpm test で 23 テストがパスすることを確認"
```

---

## Implementation Strategy

### MVP First（User Story 1 のみ）

1. Phase 1 完了: `pnpm add zod`
2. Phase 3 (T002 → T003 + T004 並列 → T005): env バリデーション実装と確認
3. **STOP and VALIDATE**: 変数を 1 つ削除して `pnpm build` でエラーを確認
4. Phase 4 (T006): todo.md の完了マーク

---

## Notes

- [P] タスクは異なるファイルを対象とするため並列実行可能
- `pnpm test` は `negotole/` ディレクトリで実行すること
- Vitest のモック（`vi.mock("@/lib/db", ...)`）により既存テストは env バリデーションの影響を受けない
- `env.ts` 自体のテストが必要な場合は `vi.stubEnv()` を使用して個別にテストできる（本フィーチャーでは必須ではない）
- 変更対象ファイル: `src/env.ts`（新規）・`next.config.ts`・`src/lib/db/index.ts`
