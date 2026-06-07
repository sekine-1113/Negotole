# Tasks: 利用規約・プライバシーポリシー・お問い合わせ/通報フォーム

**Input**: Design documents from `specs/019-legal-pages-contact-form/`

**Prerequisites**: plan.md ✓, spec.md ✓, research.md ✓, quickstart.md ✓

**Organization**: User Story 別にタスクを整理。US1〜US3 は Setup・Foundational 完了後に並列実行可能。

## Format: `[ID] [P?] [Story] Description`

- **[P]**: 異なるファイル・依存なし → 並列実行可能
- **[Story]**: 対象 User Story（US1, US2, US3）

---

## Phase 1: Setup（環境変数設定）

**Purpose**: Google フォーム URL の環境変数をプロジェクトに追加する

- [x] T001 `negotole/.env.local` に `NEXT_PUBLIC_CONTACT_FORM_URL=https://forms.gle/PLACEHOLDER_CONTACT` と `NEXT_PUBLIC_REPORT_FORM_URL=https://docs.google.com/forms/d/PLACEHOLDER/viewform` を追加する。また `negotole/.env.local.example`（存在する場合）にも同じキーをプレースホルダー付きで追加する

---

## Phase 2: Foundational（共通 Footer コンポーネント）

**Purpose**: 全ページのフッターリンクに必要な Footer コンポーネントを作成する

**⚠️ CRITICAL**: この Phase が完了するまで US1〜US3 のレイアウト確認はできない（ページ自体の作成は並列可）

- [x] T002 新規 Server Component `negotole/src/components/Footer.tsx` を作成する。利用規約（`/terms`）・プライバシーポリシー（`/privacy`）・お問い合わせ（`/contact`）への `<Link>` を含む。スタイルは `text-indigo-300/50 hover:text-indigo-300` 系のダークテーマ
- [x] T003 `negotole/src/app/layout.tsx` の `<body>` 内に `<Footer />` コンポーネントを追加する。`<BottomNav />` の前（`pb-20` のスペースを侵食しないよう）に配置する

---

## Phase 3: User Story 1 — 利用規約を確認できる（Priority: P1） 🎯

**Goal**: `/terms` に利用規約ページを設置し、禁止事項・削除権限・著作権・ログ保持の 4 セクションを含める

**Independent Test**: `http://localhost:3000/terms` に未ログインでアクセスして全 4 セクションが表示される

### Implementation for User Story 1

- [x] T004 [P] [US1] 新規 Server Component `negotole/src/app/terms/page.tsx` を作成する。以下のセクションを含む日本語テキストのページ:
  - 禁止事項（不正アクセス・誹謗中傷・著作権侵害・スパム等）
  - 投稿削除権限（運営は不適切投稿を予告なく削除できる旨）
  - 著作権の扱い（投稿者の著作権は投稿者に帰属、サービス利用許諾の明記）
  - ログ保持ポリシー（ログイン履歴を 3 年間保持する旨）
  - 最終更新日の明記
  - `export const metadata` で title を「利用規約 | negotole」に設定

**Checkpoint**: `/terms` にアクセスして 4 セクションすべてが表示されれば US1 完了

---

## Phase 4: User Story 2 — プライバシーポリシーを確認できる（Priority: P1）

**Goal**: `/privacy` にプライバシーポリシーページを設置し、個人情報の収集・利用目的・外部サービス・ログ保持期間を記載する

**Independent Test**: `http://localhost:3000/privacy` にアクセスしてログ保持期間（3年）と外部サービス一覧が確認できる

### Implementation for User Story 2

- [x] T005 [P] [US2] 新規 Server Component `negotole/src/app/privacy/page.tsx` を作成する。以下のセクションを含む日本語テキストのページ:
  - 収集する個人情報の種類（メールアドレス・ログイン IP・ユーザーエージェント等）
  - 利用目的（サービス提供・不正防止・法的対応）
  - 第三者提供（原則しない。法的要請を除く）
  - ログ保持期間（ログイン履歴は 3 年間保持）
  - 外部サービス一覧（Google OAuth、Neon / PostgreSQL、Upstash Redis、Vercel）
  - 問い合わせ先（お問い合わせフォームへのリンク）
  - 最終更新日の明記
  - `export const metadata` で title を「プライバシーポリシー | negotole」に設定

**Checkpoint**: `/privacy` にアクセスして 3 年保持・外部サービス一覧が明記されていれば US2 完了

---

## Phase 5: User Story 3 — 運営にお問い合わせ・不適切投稿を通報できる（Priority: P1）

**Goal**: `/contact` ページと各投稿の通報ボタン（ログインユーザーのみ表示）を実装する

**Independent Test**: ログイン状態で投稿の通報ボタンを押すと Google フォームが新しいタブで開く。未ログインでは通報ボタンが非表示

### Implementation for User Story 3

- [x] T006 [P] [US3] 新規 Server Component `negotole/src/app/contact/page.tsx` を作成する。お問い合わせの説明テキストと `process.env.NEXT_PUBLIC_CONTACT_FORM_URL` を使った Google フォームへの外部リンクを含む（`target="_blank" rel="noopener noreferrer"`）。`export const metadata` で title を「お問い合わせ | negotole」に設定
- [x] T007 [P] [US3] 新規 Client Component `negotole/src/components/ReportButton.tsx` を作成する（`"use client"` ディレクティブ）。Props: `postId: number`。`process.env.NEXT_PUBLIC_REPORT_FORM_URL` に `?entry.PLACEHOLDER=${postId}` を付加した URL を新しいタブで開く `<a>` タグまたはボタンを実装。スタイルは小さめのテキストボタン（`text-xs text-indigo-300/40 hover:text-indigo-300/70`）
- [x] T008 [US3] `negotole/src/components/PostCard.tsx` を更新する。Props に `isLoggedIn: boolean` を追加し、`isLoggedIn` が `true` の場合のみ `<ReportButton postId={post.id} />` を表示する。`ReportButton` は `import` して使用する
- [x] T009 [US3] `negotole/src/components/Timeline.tsx` を更新する。Props に `isLoggedIn: boolean` を追加し、`PostCard` に `isLoggedIn={isLoggedIn}` を渡す
- [x] T010 [US3] `negotole/src/app/page.tsx` を更新する。`auth()` から取得したセッション情報を元に `const isLoggedIn = !!session?.user` を求め、`<Timeline isLoggedIn={isLoggedIn} ... />` として渡す（`auth()` はすでに呼ばれている場合は再利用する）

**Checkpoint**: ログイン状態でタイムラインを確認し、通報ボタンの表示・クリック動作・未ログイン時の非表示を確認すれば US3 完了

---

## Phase 6: Polish（ビルド確認）

**Purpose**: 静的ページとしてビルドが通ることを確認する

- [x] T011 `negotole/` ディレクトリで `pnpm build` を実行し、`/terms`・`/privacy`・`/contact` が `○ (Static)` として出力されることを確認する。エラーがあれば修正する

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (Phase 1)**: 即座に開始可能
- **Foundational (Phase 2)**: Setup 完了後（T002 → T003 の順）
- **US1, US2, US3 (Phase 3〜5)**: Phase 1 完了後に並列実行可能（ページ自体の作成は Footer 不要）
- **Polish (Phase 6)**: 全 US 完了後

### User Story Dependencies

- **US1 (Phase 3)**: T001 完了後に独立して開始可能
- **US2 (Phase 4)**: T001 完了後に独立して開始可能（US1 と並列可）
- **US3 (Phase 5)**: T001 完了後に T006・T007 は並列開始可。T008→T009→T010 は順次

### US3 内部の依存関係

```
T006 [P] ─ contact page (独立)
T007 [P] ─ ReportButton.tsx (独立)
          └→ T008 PostCard.tsx
               └→ T009 Timeline.tsx
                    └→ T010 page.tsx
```

### Parallel Opportunities

```bash
# Phase 1 完了後、以下を並列実行:
T002: Footer.tsx 作成
T004: terms/page.tsx 作成（US1）
T005: privacy/page.tsx 作成（US2）
T006: contact/page.tsx 作成（US3）
T007: ReportButton.tsx 作成（US3）

# T002 完了後:
T003: layout.tsx に Footer 追加

# T007 完了後（順次）:
T008 → T009 → T010
```

---

## Implementation Strategy

### MVP First

1. Phase 1: 環境変数追加（T001）
2. Phase 2: Footer 作成（T002 → T003）
3. Phase 3: 利用規約ページ（T004） ← **最小公開要件**
4. Phase 4: プライバシーポリシーページ（T005）← **最小公開要件**
5. Phase 5: お問い合わせ + 通報（T006 → T007 → T008 → T009 → T010）
6. Phase 6: ビルド確認（T011）

### 推奨実行順（1人実装の場合）

```
T001 → T002 → T003 → T004 → T005 → T006 → T007 → T008 → T009 → T010 → T011
```

---

## Notes

- Google フォームの実際の URL と `entry.PLACEHOLDER` の ID は、フォーム作成後に差し替える
- 法的テキストの内容（文章）は開発者が確定する。コンプライアンス観点でのレビューを推奨
- `pnpm build` で `/terms`、`/privacy`、`/contact` が動的ページ（`λ`）ではなく静的（`○`）になることを確認する
