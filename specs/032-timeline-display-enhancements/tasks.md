# Tasks: タイムライン表示強化機能群

**Input**: Design documents from `specs/032-timeline-display-enhancements/`

**Prerequisites**: plan.md ✓, spec.md ✓, research.md ✓, data-model.md ✓, contracts/ ✓

**Organization**: ユーザーストーリー別にフェーズを分割。US1(P2)・US2(P2) → US3-US7(P3) の順で実装。

## Format: `[ID] [P?] [Story] Description`

- **[P]**: 並列実行可能（異なるファイル、依存なし）
- **[Story]**: 対応するユーザーストーリー（US1〜US7）

---

## Phase 1: Foundational（共通ライブラリ拡張）

**Purpose**: US2・US6・US7 が依存する `lib/posts.ts` と API route の更新。US1/US3/US4/US5 はこのフェーズに依存しない。

**⚠️ US2・US6・US7 の実装前に完了必須**

- [x] T001 `negotole/src/lib/posts.ts` の `FetchPostsResult` 型に `expiredToday: number` を追加し、`fetchPosts` の `Promise.all` に当日消滅件数クエリ（JST 0:00 〜 NOW() の `hidden_at <= NOW()` 件数）を追加
- [x] T002 [P] `negotole/src/lib/posts.ts` に `getPostHourDistribution(userId: number): Promise<number[]>` 関数を追加（`EXTRACT(HOUR FROM created_at AT TIME ZONE 'Asia/Tokyo')` でグループ集計、24 要素配列で返す）
- [x] T003 [P] `negotole/src/lib/posts.ts` に `getRandomExpiredPost(userId: number): Promise<{ content: string } | null>` 関数を追加（`hidden_at <= NOW() AND deleted_at IS NULL ORDER BY RANDOM() LIMIT 1`）
- [x] T004 `negotole/src/app/api/posts/route.ts` の GET ハンドラーレスポンスに `expiredToday: data.expiredToday` を追加（`contracts/api-posts.md` 準拠）

**Checkpoint**: `pnpm build` でビルドエラーなし。`FetchPostsResult.expiredToday` の型が通ること

---

## Phase 2: US1 — 自動スクロールモード B-2（Priority: P2）

**Goal**: タイムラインがエンドロールのように自動スクロールするモードを追加する

**Independent Test**: 自動スクロールボタンをオンにして何も操作せずに放置し、画面が下に流れる。末尾で静かに停止する。`prefers-reduced-motion` 設定時は起動しない。

- [x] T005 [US1] `negotole/src/components/Timeline.tsx` に `autoScroll` state（boolean、初期値 false）・`rafRef`（`useRef<number | null>`）を追加し、設定パネルに「自動スクロール」オン/オフボタンを追加（トグルスイッチ UI）
- [x] T006 [US1] `negotole/src/components/Timeline.tsx` に RAF ループ実装 — `autoScroll` が true のとき `window.scrollBy(0, 0.5)` を毎フレーム実行、末尾到達で `setAutoScroll(false)` 停止、`prefers-reduced-motion` を `window.matchMedia` でチェックして有効な場合は起動しない
- [x] T007 [US1] `negotole/src/components/Timeline.tsx` に手動スクロール停止イベントを追加 — `wheel` と `touchmove` イベントで `setAutoScroll(false)`（どちらも `{ passive: true }`）

**Checkpoint**: dev サーバーで自動スクロール動作・停止・末尾停止・手動キャンセルを目視確認

---

## Phase 3: US2 — 消えた言葉の気配バナー B-4（Priority: P2）

**Goal**: タイムライン末尾に「今日、N 件の言葉がここを旅立った」を表示する

**Independent Test**: 当日に期限切れになった投稿が存在する状態でタイムラインを開き、末尾に正しい件数が表示される（0 件のときは非表示）

**依存**: Foundational Phase（T001・T004）完了後に実施

- [x] T008 [US2] `negotole/src/app/(app)/page.tsx` の `fetchPosts` 呼び出し結果から `data.expiredToday` を取得し、`<Timeline>` に `initialExpiredToday={data.expiredToday}` prop を追加
- [x] T009 [US2] `negotole/src/components/Timeline.tsx` に `initialExpiredToday: number` prop を追加・state 化（`expiredToday`）し、ポーリング時に `data.expiredToday` で更新、`expiredToday > 0` のとき投稿リスト末尾に `<p>今日、{expiredToday} 件の言葉がここを旅立った</p>` を薄く表示（`text-xs text-indigo-300/20 text-center py-4 italic`）

**Checkpoint**: 当日消滅済み投稿がある DB 環境でタイムライン末尾のバナーを目視確認、0 件時に非表示であること

---

## Phase 4: US3 — 文字数連動フォントサイズ B-8（Priority: P3）

**Goal**: 投稿本文の文字数が少ないほど大きいフォントで表示される

**Independent Test**: 文字数が異なる複数の投稿があるタイムラインで、短い投稿が明らかに大きいフォントで表示されることを目視確認

- [x] T010 [P] [US3] `negotole/src/components/PostCard.tsx` に `contentFontSize(length: number): string` ヘルパー関数（≤30: `"text-xl"`、31-80: `"text-base"`、81-150: `"text-sm"`、151+: `"text-xs"`）を追加し、本文 `<p>` の `text-sm` を `contentFontSize(post.content.length)` に置き換える

**Checkpoint**: 短い投稿と長い投稿を並べてタイムラインに表示し、フォントサイズの差を目視確認

---

## Phase 5: US4 — カラーモード 3 択 B-9（Priority: P3）

**Goal**: ノーマル / モノクロ / セピアの 3 択カラーモードに拡張し、既存のモノクロ設定を移行する

**Independent Test**: セピアを選択してページを再起動し、セピアモードが維持されている。既存のモノクロ設定ユーザーが初回起動でモノクロが保持される。

- [x] T011 [US4] `negotole/src/components/Timeline.tsx` の `LS_KEYS` を更新 — `grayscale: "negotole_grayscale"` を削除し `colorMode: "negotole_color_mode"` を追加。`ColorMode = "normal" | "grayscale" | "sepia"` 型を定義。`grayscale` state を `colorMode` state（`useSyncExternalStore` で `negotole_color_mode` キーを読む）に置き換える
- [x] T012 [US4] `negotole/src/components/Timeline.tsx` に旧キーマイグレーション処理（`useEffect(() => { if (localStorage.getItem("negotole_grayscale") === "1") { localStorage.setItem("negotole_color_mode", "grayscale"); localStorage.removeItem("negotole_grayscale"); ... } }, [])`）を追加
- [x] T013 [US4] `negotole/src/components/Timeline.tsx` の設定パネルのモノクロトグルを 3 択セレクター UI（ノーマル / モノクロ / セピア ボタン群）に置き換え、投稿リスト `<div>` のスタイルを `filter: grayscale ? "grayscale(1)" : ""` から `colorMode === "grayscale" ? "grayscale(1)" : colorMode === "sepia" ? "sepia(0.7)" : undefined` に更新

**Checkpoint**: 3 択を切り替えて視覚的に差異があること。設定がページリロード後も保持されること

---

## Phase 6: US5 — 深夜フォントウェイト B-10（Priority: P3）

**Goal**: JST 22:00〜翌 5:00 は投稿テキストが細いフォントで表示される

**Independent Test**: JST 深夜帯にタイムラインを開き（または時刻をモックして）、投稿テキストが細くなっていることを目視確認

- [x] T014 [US5] `negotole/src/components/Timeline.tsx` に `isNightTime` state（`useState(() => { const h = (new Date().getUTCHours() + 9) % 24; return h >= 22 || h < 5; })`）を追加し、投稿リストコンテナ `<div>` に `isNightTime ? "font-light" : ""` クラスを追加

**Checkpoint**: 深夜帯（またはモック）でフォントの細さが変わることを目視確認

---

## Phase 7: US6 — 投稿時間帯ヒートマップ B-11（Priority: P3）

**Goal**: マイページに自分の投稿時間帯（0〜23 時）を棒グラフで表示する

**Independent Test**: 複数の異なる時間帯に投稿した履歴があるユーザーのマイページで、時間帯の相対的なバー高さが正しく表示される。投稿履歴ゼロの場合は非表示。

**依存**: Foundational Phase（T002）完了後に実施

- [x] T015 [P] [US6] `negotole/src/components/PostHeatmap.tsx` を新規作成 — `hourCounts: number[]` prop を受け取り、24 本のバーを `flex items-end` で並べる。`max = Math.max(...hourCounts, 1)` で正規化、各バーの `height` を `(count / max) * 100 + "%"` でインライン指定。0/6/12/18 時のみ軸ラベルを表示
- [x] T016 [US6] `negotole/src/app/(app)/mypage/page.tsx` で `getPostHourDistribution(userId)` を呼び出し、`hourCounts.some(n => n > 0)` のときのみ `<PostHeatmap hourCounts={hourCounts} />` をポイントセクションの下に追加。`import { getPostHourDistribution } from "@/lib/posts"` を追加

**Checkpoint**: マイページを開き、投稿時間帯のバーグラフが表示される。縦軸に数値がないことを確認

---

## Phase 8: US7 — 書く前に読む B-12（Priority: P3）

**Goal**: 投稿フォームを開いたとき、過去の消えた自分の投稿が 1 件薄く表示される

**Independent Test**: 過去に投稿して期限切れになった投稿があるユーザーで `/post/new` を開き、フォーム上部に過去の投稿が薄く表示される。過去投稿ゼロ・未ログインは非表示。

**依存**: Foundational Phase（T003）完了後に実施

- [x] T017 [P] [US7] `negotole/src/components/PostForm.tsx` に `pastPost?: { content: string } | null` prop を追加し、フォーム最上部に `pastPost` が存在するとき `<p className="text-xs text-indigo-300/20 italic mb-3 leading-relaxed whitespace-pre-wrap break-words">{pastPost.content}</p>` を表示。`Props` 型を更新
- [x] T018 [US7] `negotole/src/app/(app)/post/new/page.tsx` で `getRandomExpiredPost(userId)` を呼び出し（`try/catch` で null フォールバック）、`<PostForm totalPoints={totalPoints} pastPost={pastPost} />` に渡す。`import { getRandomExpiredPost } from "@/lib/posts"` を追加

**Checkpoint**: 期限切れ投稿がある DB 環境で `/post/new` を開き、フォーム上部に薄い過去投稿が表示される

---

## Phase 9: Polish & 横断確認

- [x] T019 [P] `pnpm --filter negotole lint` でリントエラーがないことを確認し、発見した ESLint エラーをすべて修正
- [x] T020 `pnpm --filter negotole build` でビルドエラー・TypeScript 型エラーがないことを確認
- [ ] T021 dev サーバーで全 7 機能（B-2/B-4/B-8/B-9/B-10/B-11/B-12）を実際に操作して動作を確認。特に B-9 カラーモード移行（旧モノクロ設定の保持）を重点確認

---

## Dependencies & Execution Order

### フェーズ依存関係

- **Phase 1 (Foundational)**: なし。即開始可能
- **Phase 2 (US1)**: Phase 1 に依存しない（T005〜T007 は lib 変更不要）。即開始可能
- **Phase 3 (US2)**: T001・T004 完了後に実施
- **Phase 4 (US3)**: 依存なし。即開始可能（PostCard.tsx のみ）
- **Phase 5 (US4)**: 依存なし。即開始可能（Timeline.tsx のみ）
- **Phase 6 (US5)**: 依存なし。即開始可能（Timeline.tsx のみ）
- **Phase 7 (US6)**: T002 完了後に実施
- **Phase 8 (US7)**: T003 完了後に実施
- **Phase 9 (Polish)**: 全フェーズ完了後

### 並列実行の機会

```bash
# 同時開始可能（別ファイル・依存なし）
Task: T001-T004 (Phase 1) + T005-T007 (Phase 2) + T010 (US3 / PostCard.tsx)

# Phase 1 完了後に並列開始可能
Task: T008-T009 (US2) ← T001+T004 完了後
Task: T015 (PostHeatmap.tsx 新規作成) ← T002 完了後
Task: T017 (PostForm.tsx 修正) ← T003 完了後

# 独立して並列実行可能
Task: T014 (US5 深夜フォント / Timeline.tsx)
Task: T015 (US6 PostHeatmap.tsx 新規)
Task: T017 (US7 PostForm.tsx 修正)
```

**注意**: US4 (T011-T013) と US5 (T014) はどちらも `Timeline.tsx` を編集するため逐次実行。

---

## Implementation Strategy

### MVP（P2 機能から開始）

1. Phase 1 Foundational を完了
2. Phase 2 US1（自動スクロール）を追加 → 目視確認
3. Phase 3 US2（気配バナー）を追加 → 目視確認
4. **STOP & VALIDATE**: P2 機能が動作することを確認してからP3へ

### Incremental Delivery

1. Phase 1 → 2 → 3 で P2 機能完成
2. Phase 4 (US3) → Phase 5 (US4) → Phase 6 (US5) を順次追加
3. Phase 7 (US6) + Phase 8 (US7) を追加
4. Phase 9 でポリッシュ・ビルド確認

---

## Notes

- `[P]` タスクは異なるファイルを操作するため並列実行可能
- US4（B-9）と US5（B-10）はどちらも `Timeline.tsx` を編集するため、どちらかが完了してから次を実施
- B-9 移行処理（T012）は先にテストすること（既存のモノクロユーザーの設定が消えないか）
- `PostForm.tsx` の `pastPost` 表示（T017）は `PostForm` が Client Component のため、prop として受け取るだけ。サーバー側クエリは `page.tsx`（T018）で実施
