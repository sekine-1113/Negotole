---
description: "Task list for UI ダークテーマへのデザイン刷新"
---

# Tasks: UI ダークテーマへのデザイン刷新

**Input**: Design documents from `specs/012-ui-redesign-dark/`

**Branch**: `012-ui-redesign-dark`

**Organization**: 4つのユーザーストーリーに対応した最小変更セット（既存コンポーネント更新 + BottomNav・mypage 新規追加）

## Format: `[ID] [P?] [Story] Description`

- **[P]**: 並列実行可能（異なるファイル、依存なし）
- **[US1]**: User Story 1（ダークテーマの全画面適用）
- **[US2]**: User Story 2（ボトムナビバー）
- **[US3]**: User Story 3（投稿カードのダークテーマ）
- **[US4]**: User Story 4（マイページのポイント内訳）

---

## Phase 1: Setup（パッケージインストール）

**Purpose**: Lucide アイコンライブラリの追加（ヘッダー・バッジ・ボタンで使用）

- [x] T001 `negotole/` ディレクトリで `pnpm add lucide-react` を実行して Lucide アイコンをインストールする

---

## Phase 2: Foundational（全 US 共通の前提条件）

**Purpose**: グローバル CSS とレイアウトフォントの変更。すべてのユーザーストーリーの基盤となる。

- [x] T002 [P] `negotole/src/app/globals.css` を更新する: `:root` 変数を削除し、`@keyframes float`（4s、上下 -8px）・`@keyframes star-pulse`（3s、opacity 0.2-0.8）を追加し、`@theme { --animate-float: float 4s ease-in-out infinite; --animate-star-pulse: star-pulse 3s ease-in-out infinite; }` を追加し、`body` スタイルを `background: linear-gradient(135deg, #0b0f19 0%, #111827 50%, #1e1b4b 100%); background-attachment: fixed; color: #e2e8f0; font-family: 'M PLUS Rounded 1c', 'Inter', sans-serif;` に変更し、カスタムスクロールバー（`::-webkit-scrollbar`）スタイルを追加する
- [x] T003 `negotole/src/app/layout.tsx` を更新する: `Geist` / `Geist_Mono` インポートを削除し、`import { M_PLUS_Rounded_1c, Inter } from "next/font/google"` を追加して `subsets: ["latin"]`・適切な `weight`・`variable` を設定し、`<html>` の `className` を新フォント変数（`${mPlusRounded.variable} ${inter.variable}`）に変更する

**Checkpoint**: `pnpm build` が通り、全ページの body 背景がダークグラデーションになること

---

## Phase 3: User Story 1 - ダークテーマの全画面適用（Priority: P1）🎯 MVP

**Goal**: Header とポイントバッジがダークグラスモーフィズムデザインになり、サービスの世界観を体現する。

**Independent Test**: ログイン済み状態でトップページを開き、Header がグラスモーフィズム（半透明+ぼかし）で表示され、浮遊する月ロゴ・グラデーションブランド名・アンバー星ポイントバッジが確認できること。

### Implementation for User Story 1

- [x] T004 [P] [US1] `negotole/src/components/Header.tsx` を全面再設計する: `import { Moon } from "lucide-react"` を追加し、`<header>` を `sticky top-0 z-40 backdrop-blur-md bg-slate-950/60 border-b border-indigo-950/50 px-4 py-3` に変更し、ロゴを `w-9 h-9 rounded-full bg-gradient-to-tr from-indigo-500 to-purple-600 flex items-center justify-center shadow-lg animate-float` の円形 Moon アイコンに変更し、ブランド名を `text-xl font-black bg-gradient-to-r from-indigo-300 via-purple-300 to-pink-300 bg-clip-text text-transparent` に変更し、サブタイトル `寝言る - 夢うつつのタイムライン` を追加し、ログアウトボタンを `text-xs text-indigo-300/80 hover:text-indigo-100` スタイルに変更し、ログインボタンを `bg-gradient-to-r from-indigo-500 to-purple-600 rounded-full` スタイルに変更する
- [x] T005 [P] [US1] `negotole/src/components/PointBadge.tsx` を更新する: `import { Star } from "lucide-react"` を追加し、外側 `<span>` を `bg-indigo-950/60 border border-indigo-500/30 rounded-full px-3.5 py-1.5 flex items-center gap-2 backdrop-blur-sm` に変更し、`<Star className="w-2.5 h-2.5 text-amber-400 fill-amber-400" />` アイコンを追加し、数値テキストを `text-amber-300 text-sm font-black` に変更し、`pt` テキストを `text-xs text-indigo-100 font-bold` に変更する

**Checkpoint**: この時点でヘッダーがダークグラスモーフィズム表示になること（T004・T005 完了後）

---

## Phase 4: User Story 2 - ボトムナビバーで画面間を移動できる（Priority: P1）🎯 MVP

**Goal**: 全ページ下部に固定ナビバーが表示され、タイムライン・投稿・マイページへ移動できる。

**Independent Test**: 任意のページで画面下部にボトムナビが表示され、各タブをタップするとページ遷移が行われ、現在ページのアイコンがハイライト表示されること。admin ユーザーには「管理」タブも表示されること。

### Implementation for User Story 2

- [x] T006 [P] [US2] `negotole/src/components/BottomNav.tsx` を新規作成する: `"use client"` を先頭に追加し、`import { usePathname } from "next/navigation"` と `import { AlignLeft, Send, User, ShieldAlert } from "lucide-react"` を追加し、Props に `isAdmin: boolean` を定義し、`usePathname()` でアクティブパスを判定し、`fixed bottom-0 left-0 right-0 z-40 backdrop-blur-md bg-slate-950/60 border-t border-indigo-950/50 pb-safe` の固定バーをレンダリングし、`max-w-xl mx-auto px-2 py-2 flex items-center justify-around` のコンテナで タイムライン(`/`・`AlignLeft`)・投稿(`/post/new`・`Send`)・マイページ(`/mypage`・`User`)の3タブを配置し、アクティブタブは `text-indigo-400` / 非アクティブは `text-slate-500` で表示し、`isAdmin` が true の場合は管理(`/admin/campaigns`・`ShieldAlert`)タブを追加する
- [x] T007 [US2] `negotole/src/app/layout.tsx` を更新する（T003・T006 完了後）: `import { auth } from "@/lib/auth"` と `import { BottomNav } from "@/components/BottomNav"` を追加し、RootLayout を async 関数に変更して `const session = await auth()` と `const isAdmin = session?.user?.role === "admin"` を追加し、`<body>` に `pb-16` クラスを追加し、`<Header />` の後に `<BottomNav isAdmin={isAdmin} />` を追加する
- [x] T008 [P] [US2] `negotole/src/app/page.tsx` を更新する: `<main>` のクラスを `px-4 py-6 max-w-xl mx-auto relative z-10` に変更する
- [x] T009 [P] [US2] `negotole/src/app/post/new/page.tsx` を更新する: `<main>` のクラスを `px-4 py-6 max-w-xl mx-auto relative z-10` に変更し、`<h1>` を `text-xl font-bold mb-6 text-indigo-200` に変更する
- [x] T010 [P] [US2] `negotole/src/app/admin/layout.tsx` を更新する: `<nav>` を `bg-slate-900/80 backdrop-blur-md border-b border-indigo-950/50 text-indigo-100 px-6 py-3 flex gap-4 items-center` に変更し、リンクと「管理パネル」テキストを `text-indigo-200 hover:text-indigo-100` に変更する

**Checkpoint**: ボトムナビが全ページで表示され、タブナビゲーションが動作すること（T006・T007 完了後）

---

## Phase 5: User Story 3 - 投稿カードのダークテーマ（Priority: P2）

**Goal**: タイムラインの投稿カード・投稿フォームがダークテーマにマッチした表示になる。

**Independent Test**: トップページでポスト一覧がダークグラスモーフィズムカードで表示され、各カードにインジゴ系プログレスバーと「あと X 時間」が表示されること。`/post/new` でフォームがダークスタイルで表示されること。

### Implementation for User Story 3

- [x] T011 [P] [US3] `negotole/src/components/PostCard.tsx` を更新する: `<article>` を `bg-slate-900/60 border border-indigo-950/70 rounded-2xl p-4 backdrop-blur-md shadow-xl relative overflow-hidden` に変更し、`<article>` 内先頭に `<div className="absolute top-0 left-0 right-0 h-[1px] bg-gradient-to-r from-transparent via-indigo-500/40 to-transparent" />` を追加し、コンテンツテキストを `text-slate-100 whitespace-pre-wrap break-words text-sm` に変更し、`<CountdownTimer>` に `createdAt={post.createdAt}` prop を追加して渡す
- [x] T012 [P] [US3] `negotole/src/components/CountdownTimer.tsx` を更新する: Props に `createdAt: string` を追加し、経過時間を `(Date.now() - new Date(createdAt).getTime()) / (new Date(hiddenAt).getTime() - new Date(createdAt).getTime()) * 100` で計算し `progress` state を追加し、`setInterval` コールバックで `progress` も更新し、テキストカラーを `remaining < 3600 * 1000 ? "text-pink-400 font-bold" : "text-indigo-300 text-sm"` に変更し、テキストの下に `<div className="w-full bg-slate-800 rounded-full h-1 mt-2"><div className="bg-gradient-to-r from-indigo-500 to-purple-600 h-1 rounded-full transition-all duration-1000" style={{ width: \`\${100 - Math.min(progress, 100)}%\` }} /></div>` を追加する
- [x] T013 [P] [US3] `negotole/src/components/PostForm.tsx` を更新する: `import { Send } from "lucide-react"` を追加し、`<textarea>` クラスを `w-full bg-slate-950/80 border border-indigo-950/80 rounded-xl p-3 text-slate-100 placeholder-slate-500 focus:outline-none focus:ring-1 focus:ring-indigo-500 focus:border-indigo-500 text-sm resize-none transition` に変更し、文字数カウントを `text-right text-xs text-slate-400` に変更し、「表示時間」ラベルを `text-xs text-indigo-300 font-bold` に変更し、各 duration ボタンの非選択クラスを `py-2 rounded-lg border border-indigo-950/80 bg-slate-950/40 text-slate-400 hover:text-slate-200 text-xs font-bold transition-all` に、選択中クラスを `py-2 rounded-lg border border-indigo-500/50 bg-indigo-950/40 text-indigo-200 text-xs font-bold shadow-md` に変更し、残ポイント表示を `text-xs text-slate-400` に変更し、エラーテキストを `text-xs text-pink-400` に変更し、投稿ボタンを `bg-gradient-to-r from-indigo-500 to-purple-600 hover:from-indigo-600 hover:to-purple-700 text-white font-bold text-sm py-2.5 px-6 rounded-full shadow-lg flex items-center gap-1.5 justify-center disabled:opacity-40` に変更して `<Send className="w-3.5 h-3.5" />` アイコンを追加する
- [x] T014 [P] [US3] `negotole/src/components/Timeline.tsx` を更新する: 空状態メッセージを `text-center text-indigo-300/60 py-12` に変更し、「もっと見る」ボタンを `w-full py-2.5 text-sm text-indigo-300/70 border border-indigo-950/50 rounded-2xl hover:bg-slate-900/40 backdrop-blur-sm disabled:opacity-50 transition` に変更する

**Checkpoint**: タイムライン・投稿フォームが完全にダークテーマで表示されること（T011-T014 完了後）

---

## Phase 6: User Story 4 - マイページのポイント内訳（Priority: P2）

**Goal**: `/mypage` ページでポイント内訳（期間限定・恒久）がダークテーマの専用カードで表示される。

**Independent Test**: `/mypage` にアクセスし、期間限定ポイント（ピンク系カード・「本日中有効」バッジ）と恒久ポイント（インジゴ系カード・「期限なし」バッジ）が表示されること。未ログイン時はログインページへリダイレクトされること。

### Implementation for User Story 4

- [x] T015 [US4] `negotole/src/app/mypage/page.tsx` を新規作成する: Server Component として `auth()` で認証確認（未ログイン時は `redirect("/")` で `import { redirect } from "next/navigation"` を使用）し、`getPointBalance(userId)` でポイントを取得し、ページ構造を `<main className="px-4 py-6 max-w-xl mx-auto relative z-10">` にし、ポイントカードセクション（`bg-slate-900/60 border border-indigo-950/70 rounded-2xl p-6 backdrop-blur-md`）を作成し、期間限定ポイントを `border-pink-500/20` カードに `text-pink-400 text-2xl font-black` 数値と `bg-pink-500/10 text-pink-400 text-[9px] rounded-full` の「本日中有効」バッジで表示し、恒久ポイントを `border-indigo-500/20` カードに `text-indigo-300 text-2xl font-black` 数値と `bg-indigo-500/10 text-indigo-400 text-[9px] rounded-full` の「期限なし」バッジで表示する

**Checkpoint**: `/mypage` でポイント内訳がダークテーマ表示されること（T015 完了後）

---

## Phase 7: Polish & Cross-Cutting Concerns

**Purpose**: ビルド確認と最終検証

- [x] T016 [P] `negotole/` ディレクトリで `pnpm test --run` を実行し、既存の全テストがパスすることを確認する（デグレなし）
- [x] T017 [P] `negotole/` ディレクトリで `pnpm build` を実行し、本番ビルドが警告・エラーなく完了することを確認する（TypeScript 型チェック含む）
- [ ] T018 手動テスト確認項目: (1) 全ページのダークグラデーション背景が表示されること、(2) Header のグラスモーフィズム・浮遊ロゴ・グラデーションテキスト・アンバーバッジが表示されること、(3) ボトムナビが全ページで表示され遷移が動作すること、(4) タイムラインの投稿カードがダークスタイルでプログレスバー付きで表示されること、(5) `/post/new` のフォームがダークスタイルで表示されること、(6) `/mypage` でポイント内訳が表示されること

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (Phase 1)**: 依存なし — 即時開始可能
- **Foundational (Phase 2)**: T001 完了後に開始可能（T002・T003 は並列実行可能）
- **US1 (Phase 3)**: T001（lucide インストール）完了後 — T002・T003 とは独立して並列実行可能
- **US2 (Phase 4)**: T001 完了後。ただし T007 は T003・T006 の完了が必要
- **US3 (Phase 5)**: T001 完了後 — T002 完了後が望ましい（CSS クラスが globals.css に依存）
- **US4 (Phase 6)**: T002・T003 完了後
- **Polish (Phase 7)**: Phase 3-6 の全タスク完了後

### Critical Dependencies

- **T007** は T003（layout.tsx のフォント変更）と T006（BottomNav.tsx 作成）の両方に依存
- **T011** は T012（CountdownTimer の型変更）の前に実施 — PostCard が `createdAt` を渡す実装が先
- **T016・T017** は全実装タスク完了後に実施

### Parallel Opportunities

- T002・T003 は並列実行可能（異なるファイル）
- T004・T005・T006 は並列実行可能（T001 完了後）
- T008・T009・T010 は並列実行可能（異なるファイル）
- T011・T012・T013・T014 は並列実行可能（異なるファイル）
- T016・T017 は並列実行可能（Polish 内）

---

## Parallel Example: Foundational + US1 の実装

```bash
# T001 完了後、並列実行可能:
Task: "globals.css を更新"        # T002
Task: "layout.tsx フォント変更"   # T003

# T001 完了後（T002・T003 と並列）:
Task: "Header.tsx 全面再設計"     # T004
Task: "PointBadge.tsx 更新"       # T005
Task: "BottomNav.tsx 新規作成"    # T006

# T003・T006 完了後:
Task: "layout.tsx BottomNav 追加" # T007

# T007 完了後 (US3・US4 + Polish):
Task: "PostCard.tsx 更新"         # T011
Task: "CountdownTimer.tsx 更新"   # T012
Task: "PostForm.tsx 更新"         # T013
Task: "Timeline.tsx 更新"         # T014
Task: "mypage/page.tsx 新規作成"  # T015
```

---

## Implementation Strategy

### MVP First（US1 + US2 のみ）

1. T001（lucide インストール）
2. T002・T003 を並列実行（globals.css + layout.tsx フォント）
3. T004・T005 を並列実行（Header + PointBadge）
4. T006（BottomNav.tsx 作成）
5. T007（layout.tsx に BottomNav 追加）
6. T008・T009・T010 を並列実行（各ページ調整）
7. **STOP and VALIDATE**: ダークテーマヘッダーとボトムナビの動作確認
8. Phase 5（T011-T014）、Phase 6（T015）に進む
9. Phase 7（T016-T018）でビルド・テスト・手動確認

### Incremental Delivery

1. US1 完了 → ダークヘッダー・アンバーバッジ（MVP ビジュアル改善）
2. US2 追加 → ボトムナビ（モバイルナビゲーション改善）
3. US3 追加 → ダーク投稿カード・フォーム（コンテンツ表示の世界観統一）
4. US4 追加 → マイページ（ポイント管理 UI 追加）
5. Polish → ビルド・テスト確認

---

## Notes

- 変更対象: `negotole/src/` 配下の 10 ファイル（既存 8 更新 + 新規 2 作成）
- `pnpm test --run` は `negotole/` ディレクトリで実行すること
- `pnpm build` は `negotole/` ディレクトリで実行すること
- Tailwind v4 では `animate-float` は `@theme { --animate-float: ... }` で定義した後にクラスとして使用可能
- `M_PLUS_Rounded_1c` は next/font/google でスペース・プラスをアンダースコアに変換したインポート名
- `BottomNav.tsx` は `"use client"` + `usePathname()` を使用するため Client Component
- `mypage/page.tsx` は Server Component として `getPointBalance` を直接呼び出す
