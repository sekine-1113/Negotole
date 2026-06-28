# Tasks: タイムライン UX 機能群

**Input**: Design documents from `specs/031-timeline-ux-features/`

**Prerequisites**: plan.md ✓, spec.md ✓, research.md ✓, data-model.md ✓, contracts/ ✓

**Tests**: 明示的に要求されていないため省略。TypeScript 型チェックと既存 Vitest スイートで品質担保。

**Organization**: 5 ユーザーストーリーを優先度順にフェーズ化。US1・US3〜US5 は独立実装可能。US2 は Foundational フェーズ完了後に独立実装可能。

## Format: `[ID] [P?] [Story?] Description`

- **[P]**: 異なるファイルへの変更で並列実行可能
- **[Story]**: どのユーザーストーリーに属するか（US1〜US5）
- ファイルパスは `negotole/src/` 以下の相対パスで記載

---

## Phase 1: Foundational（ブロッカー解消）

**Purpose**: US1・US2 が両方依存する `lib/posts.ts` の型・クエリ拡張。この変更がすべての後続ストーリーのブロッカーとなる。

**⚠️ CRITICAL**: US1・US2 はこのフェーズの完了後のみ着手可能

- [x] T001 `negotole/src/lib/posts.ts` を拡張: `FetchPostsOptions` に `order?: "newest" | "random"` 追加、`FetchPostsResult` に `totalActive: number` 追加、`fetchPosts` 内で `order === "random"` のとき `orderBy(sql\`RANDOM()\`)` を使用し `ORDER BY id DESC` との切り替えを実装、`totalActive` 用に `SELECT COUNT(*) FROM posts WHERE hiddenAt > NOW() AND deletedAt IS NULL` を `Promise.all` で並列実行して結果を返す

**Checkpoint**: `npx tsc --noEmit` が通ること

---

## Phase 2: User Story 1 — ランダムタイムライン (Priority: P1) 🎯 MVP

**Goal**: タイムラインの表示順をランダムに切り替えるモードを提供する

**Independent Test**: タイムラインで「ランダム」ボタンを押してページを数回リロードし、投稿の並び順が毎回異なることを確認する

- [x] T002 [US1] `negotole/src/app/api/posts/route.ts` に `?order=random` パラメータ処理を追加: `searchParams.get("order")` で取得し `"random"` のみ許可（それ以外は 400）、`order=random` と `since` の同時指定を 400 で拒否、`fetchPosts({ order })` に渡す

- [x] T003 [US1] `negotole/src/components/Timeline.tsx` にランダムモードを実装: `order` state（`"newest" | "random"`）を追加、フィルターボタン群の先頭に「ランダム」ボタンを追加（既存フィルターと同一スタイル）、ポーリング用 ref を `topPostIdRef` から `maxSeenIdRef`（取得した全投稿の最大 ID を追跡）に変更、`loadMore` と初回フェッチで `?order=random` を `order=random` 時に付与、ランダムモードでの「もっと見る」は cursor なしで `?order=random&limit=20` のみで再取得（重複許容）

**Checkpoint**: ランダムボタンを押してリロードを繰り返すと順序が変わる

---

## Phase 3: User Story 2 — アクティブ投稿数バナー (Priority: P2)

**Goal**: タイムライン上部に現在アクティブな投稿総数を「今 N 件の言葉が生きています」と表示する

**Independent Test**: 投稿が存在する状態でタイムラインを開き、バナーに正確な件数が表示されることを確認する

- [x] T004 [P] [US2] `negotole/src/app/(app)/page.tsx` の `HomePage` を修正: `fetchPosts()` のレスポンスから `totalActive` を取得し `<Timeline initialTotalActive={data.totalActive} />` として渡す

- [x] T005 [US2] `negotole/src/components/Timeline.tsx` にバナーを追加: `initialTotalActive: number` prop を追加し `totalActive` state で管理、ポーリング成功時にレスポンスの `totalActive` で state を更新、フィルターボタン行の上部に `totalActive > 0` のときのみ「今 {totalActive} 件の言葉が生きています」を表示（スタイル: `text-xs text-indigo-300/40 text-center py-1`）

**Checkpoint**: タイムラインを開いたとき件数バナーが表示され、ポーリング後に件数が更新される

---

## Phase 4: User Story 3 — 深夜タイムライン（夜の寝言）(Priority: P2)

**Goal**: JST 22:00〜翌5:00 に投稿されたものだけを表示するフィルターを追加する

**Independent Test**: 「夜の寝言」フィルターを選択し、昼間帯の投稿が非表示になることを確認する

- [x] T006 [US3] `negotole/src/components/Timeline.tsx` に深夜フィルターを追加: `Filter` 型に `"night"` を追加、`FILTER_LABELS` に `{ value: "night", label: "夜の寝言" }` を追加、`applyFilter` の `night` ケースで `const jstHour = (new Date(p.createdAt).getUTCHours() + 9) % 24` を計算し `jstHour >= 22 || jstHour < 5` の投稿のみ返す

**Checkpoint**: 「夜の寝言」フィルター選択時に昼間の投稿が除外される

---

## Phase 5: User Story 4 — ブラインドポスト（本人識別禁止）(Priority: P3)

**Goal**: タイムライン上で自分の投稿が他の投稿と完全に同じ見た目であることを設計上明示する

**Independent Test**: ログイン済みで自分の投稿を確認し、他の投稿と見た目に差がないことを目視確認する

- [x] T007 [P] [US4] `negotole/src/lib/posts.ts` の `fetchPosts` SELECT クエリと `PostRow` 型を確認: `userId` フィールドが含まれていないことを確認し、`PostRow` 型定義の直前に `// ブラインドポスト設計原則: userId は意図的に含まない` コメントを追加する

- [x] T008 [P] [US4] `negotole/src/components/PostCard.tsx` を確認: `post` オブジェクトから `userId` や自己識別に使える情報を参照していないことを確認し、`Props` 型定義に `// userId は受け取らない（ブラインドポスト設計原則）` コメントを追加する

**Checkpoint**: `PostCard` が `userId` を受け取らず、タイムライン上で投稿者識別が不可能であることを確認

---

## Phase 6: User Story 5 — 消えかけ投稿のゆらぎアニメーション (Priority: P3)

**Goal**: 残り時間が 5 分以内の投稿テキストに微細な揺らぎ CSS アニメーションを適用する

**Independent Test**: 残り時間が 5 分以内の投稿カードのテキストが微細に揺れていることを確認する

- [x] T009 [P] [US5] `negotole/src/app/globals.css` に wobble アニメーションを追加: `@keyframes wobble` を定義（0%,100%: translateX(0) translateY(0)、20%: translateX(0.8px) translateY(-0.6px)、40%: translateX(-0.6px) translateY(0.8px)、60%: translateX(0.6px) translateY(0.4px)、80%: translateX(-0.8px) translateY(-0.4px)）、`@theme` ブロックに `--animate-wobble: wobble 2.4s ease-in-out infinite;` を追加

- [x] T010 [P] [US5] `negotole/src/components/CountdownTimer.tsx` に `onNearExpiry?: () => void` prop を追加: `nearExpiredRef = useRef(false)` を追加し、tick 処理内で `rem <= 300_000 && !nearExpiredRef.current` のとき `nearExpiredRef.current = true; onNearExpiry?.()` を呼ぶ

- [x] T011 [US5] `negotole/src/components/PostCard.tsx` に揺らぎアニメーションを適用: `isNearExpiry` state を `useState(() => new Date(post.hiddenAt).getTime() - Date.now() <= 300_000)` で初期化、CountdownTimer の `hidden` ラッパーに `onNearExpiry={() => setIsNearExpiry(true)}` を追加、`post.content` の `<p>` 要素に `isNearExpiry ? "animate-wobble" : ""` クラスを適用（T009, T010 完了後に実施）

**Checkpoint**: 残り 5 分以内の投稿カードで wobble アニメーションが視認できる

---

## Phase 7: Polish & 最終確認

- [x] T012 [P] `npx tsc --noEmit` で TypeScript 型エラーがないことを確認
- [x] T013 [P] `npx vitest run` で既存テスト 98 件がすべて通ることを確認
- [x] T014 `docs/next-phase-todo.md` の「実装済み」セクションに #1, #5, #6, #8, #14 を追記

---

## Dependencies & Execution Order

### Phase Dependencies

- **Foundational (Phase 1)**: 即時開始可能
- **US1 (Phase 2)**: Foundational 完了後（T001 → T002 → T003）
- **US2 (Phase 3)**: Foundational 完了後、US1 と並列可能（T004, T005 は Timeline.tsx を触るためUS1 Phase 完了後推奨）
- **US3 (Phase 4)**: Foundational 不要、US1/US2 と並列可能（ただし Timeline.tsx を共有するため順次実施を推奨）
- **US4 (Phase 5)**: すべてのフェーズから独立（確認のみ）
- **US5 (Phase 6)**: Foundational 不要、T009/T010 は並列可能

### User Story Dependencies

- **US1**: T001 完了が必須
- **US2**: T001 完了が必須、T004 → T005 の順
- **US3**: 独立（Timeline.tsx 変更のみ）
- **US4**: 独立（確認・コメント追記のみ）
- **US5**: T009, T010 は独立並列可能、T011 は両者完了後

### Parallel Opportunities

- T004 [US2] と T007 [US4] と T008 [US4] は別ファイルで完全並列可能
- T009 [US5] と T010 [US5] は別ファイルで完全並列可能
- T012 と T013 は別コマンドで並列実行可能

---

## Parallel Example: User Story 5

```
# T009 と T010 を並列実行（別ファイル）:
Task: "globals.css に @keyframes wobble と --animate-wobble を追加"
Task: "CountdownTimer.tsx に onNearExpiry callback を追加"

# 両方完了後:
Task: "PostCard.tsx に isNearExpiry state と animate-wobble クラスを適用"
```

---

## Implementation Strategy

### MVP First (User Story 1 のみ)

1. Phase 1: Foundational（T001）
2. Phase 2: US1（T002 → T003）
3. **STOP & VALIDATE**: ランダムモードで順序が変わることを確認
4. デプロイ/デモ可能

### Incremental Delivery

1. Foundational (T001) → US1 完了 → タイムラインのランダム化
2. US2 追加 → アクティブ件数バナー表示
3. US3 追加 → 深夜フィルター
4. US4 確認 → ブラインドポスト設計文書化
5. US5 追加 → 揺らぎアニメーション

---

## Notes

- Timeline.tsx は US1/US2/US3 で複数回変更されるため、フェーズ順に実施すること
- `lib/posts.ts` の変更（T001）は US1・US2 の両方に必要なため Foundational にまとめた
- US4（ブラインドポスト）は実装変更なし。確認とコメント追記のみ
- `animate-wobble` クラスは Tailwind v4 の `@theme` 変数経由で使用する
