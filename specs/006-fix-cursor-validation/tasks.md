---
description: "Task list for cursor parameter validation fix"
---

# Tasks: cursor パラメータの入力検証強化

**Input**: Design documents from `specs/006-fix-cursor-validation/`

**Branch**: `006-fix-cursor-validation`

**Organization**: 単一ユーザーストーリー（P1）に対応する最小変更セット

## Format: `[ID] [P?] [Story] Description`

- **[P]**: 並列実行可能（異なるファイル、依存なし）
- **[US1]**: User Story 1 に対応するタスク

---

## Phase 1: Setup（共有インフラ）

**Purpose**: 既存プロジェクトへの変更のため新規セットアップは不要。既存環境の確認のみ。

- [x] T001 Vitest が動作することを確認する（`pnpm test` をプロジェクトルートの `negotole/` で実行）

---

## Phase 2: Foundational（ブロッキング前提条件）

**Purpose**: この変更は単一ファイルへの局所的な修正のため、ブロッキング前提条件なし。Phase 1 完了後すぐに US1 へ着手可能。

**⚠️ CRITICAL**: Phase 1 完了後に US1 実装を開始すること

---

## Phase 3: User Story 1 - 不正な cursor 値によるエラー防止（Priority: P1）🎯 MVP

**Goal**: `GET /api/posts` の cursor クエリパラメータに `Number.isSafeInteger(n) && n > 0` 検証を追加し、不正な値（NaN・浮動小数・0・負数・2^53超の大整数）を 400 Bad Request で拒否する

**Independent Test**: `curl "http://localhost:3000/api/posts?cursor=aW52YWxpZA=="` （"invalid" の base64）を送信し、`{"error":"Invalid cursor"}` と HTTP 400 が返ることを確認する

### Implementation for User Story 1

- [x] T002 [US1] `negotole/src/app/api/posts/route.ts` の cursor デコード処理（15行目）を `Number.isSafeInteger(decoded) && decoded > 0` チェック付きの早期リターンパターンに書き換える
- [x] T003 [P] [US1] `negotole/src/app/api/posts/__tests__/route.test.ts` を新規作成し、以下のケースを網羅する Vitest テストを追加する：
  - 不正な base64 文字列 → 400
  - デコード結果が非数値（例: base64("abc")） → 400
  - デコード結果が浮動小数（例: base64("1.5")） → 400
  - デコード結果が 0（例: base64("0")） → 400
  - デコード結果が負数（例: base64("-1")） → 400
  - デコード結果が 2^53超の大整数 → 400
  - cursor なし → 200（既存動作維持）
  - 正常な cursor（例: base64("1")） → 200（既存動作維持）
- [x] T004 [US1] `pnpm test` を実行し、T003 で追加したすべてのテストがパスすることを確認する
- [x] T005 [US1] `specs/006-fix-cursor-validation/research.md` の実装サンプルコードを `Number.isSafeInteger` に更新する（clarification Q1 の反映）

**Checkpoint**: この時点で `GET /api/posts?cursor=<invalid>` → 400、正常な cursor → 200 が確認できること

---

## Phase 4: Polish & Cross-Cutting Concerns

**Purpose**: 残課題の整理

- [x] T006 [P] `docs/todo.md` の項目 5（cursor パラメータの検証が甘い）を対応済みとしてマークする（`~~` で打ち消し、`（対応済み: specs/006-fix-cursor-validation）` を追記）

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (Phase 1)**: 依存なし - 即時開始可能
- **Foundational (Phase 2)**: 前提条件なし - US1 と並行して進める必要なし
- **User Story 1 (Phase 3)**: Phase 1 完了後に開始
- **Polish (Phase 4)**: Phase 3 のすべてのタスク完了後

### User Story Dependencies

- **User Story 1 (P1)**: T001 完了後すぐに着手可能。他の User Story への依存なし。

### Within User Story 1

- T002（実装） と T003（テスト作成）は並列実行可能（別ファイル）
- T004（テスト実行）は T002 と T003 の両方が完了してから実行
- T005（research.md 更新）は T002 と並列実行可能

---

## Parallel Example: User Story 1

```bash
# T002 と T003 は並列実行可能:
Task: "route.ts の cursor 検証ロジックを書き換える"
Task: "route.test.ts を新規作成してテストケースを追加する"

# T002 と T003 が完了してから:
Task: "pnpm test を実行してテストパスを確認する"
```

---

## Implementation Strategy

### MVP First（User Story 1 のみ）

1. Phase 1 完了: Vitest 動作確認
2. Phase 3 (T002 + T003 並列 → T004 → T005): cursor 検証実装とテスト
3. **STOP and VALIDATE**: 手動 curl テストで 400 / 200 を確認
4. Phase 4 (T006): todo.md の完了マーク

---

## Notes

- [P] タスクは異なるファイルを対象とするため並列実行可能
- [US1] ラベルはすべて User Story 1（単一ストーリー）に対応
- テストは T002（実装）と同時または先に T003 を書いても可
- `pnpm test` は `negotole/` ディレクトリで実行すること
- 変更対象ファイルは `negotole/src/app/api/posts/route.ts` の 1 箇所のみ
