# Research: 利用規約・プライバシーポリシー・お問い合わせ/通報フォーム

**Feature**: 019-legal-pages-contact-form
**Date**: 2026-06-07

## Decision 1: 法的ページの実装形式

**Decision**: Next.js App Router の Server Component としてハードコードした JSX で実装する

**Rationale**: 法的ページは更新頻度が低く（数ヶ月〜年単位）、MDX/CMS などの外部依存を増やすメリットがない。コード内の TypeScript + JSX として管理することで、Next.js の静的最適化が自動適用され、追加ライブラリ不要でシンプルに保てる。

**Alternatives considered**:
- MDX（`@next/mdx`）: マークダウンで書けるが設定コストあり。更新頻度が低いため不採用
- Contentful / Sanity などの CMS: 過剰。法的文書は頻繁に変わらない
- 環境変数でコンテンツを持つ: 長文には不適

---

## Decision 2: 通報ボタンの認証チェック方法

**Decision**: `PostCard` を Server Component のまま維持し、`isLoggedIn` を Props として `page.tsx → Timeline → PostCard` の順に渡す。`ReportButton` のみ `"use client"` にする

**Rationale**: `PostCard` を Client Component に変えると `Timeline` の再レンダリング最適化が崩れる。既存の `Timeline` は既に `"use client"` のため、`isLoggedIn` を Props で渡すパターンがコードベースの慣例（`BottomNav`・`FabButton` も同様）と一致する。

**Alternatives considered**:
- `ReportButton` 内で `useSession()` でセッションを取得: クライアント側で追加の API リクエストが発生するため不採用
- `PostCard` を Client Component に変換: 既存の Server Component 設計を崩すため不採用

---

## Decision 3: Google フォーム URL 管理

**Decision**: `NEXT_PUBLIC_CONTACT_FORM_URL` と `NEXT_PUBLIC_REPORT_FORM_URL` の 2 つの環境変数で管理する

**Rationale**: `NEXT_PUBLIC_` プレフィックスにより Next.js がクライアント側にバンドルする。URL が変わっても（Google フォームを再作成した場合など）コード変更なしに Vercel の環境変数設定だけで対応できる。

**Alternatives considered**:
- コード内定数: URL 変更のたびにコード変更・デプロイが必要なため不採用

---

## Decision 4: 通報 URL のクエリパラメータ形式

**Decision**: `${NEXT_PUBLIC_REPORT_FORM_URL}?usp=pp_url&entry.XXXXXXX=postId:${postId}` 形式で開く

**Rationale**: Google フォームは `entry.FIELD_ID=値` 形式でプリフィル可能。実際の `entry.XXXXXXX` の ID は Google フォーム作成後に確認して差し替える（HTML ソース確認または URL から取得）。

**Note**: コード実装では `entry.PLACEHOLDER` としてプレースホルダーを使用し、Google フォーム作成後に実際の `entry.ID` に置き換える。

---

## Decision 5: Footer コンポーネントの配置

**Decision**: `src/components/Footer.tsx` を Server Component として作成し、`layout.tsx` の `<BottomNav />` の上（`pb-20` スペースの前）に配置する

**Rationale**: BottomNav は固定フッターナビゲーション（`position: fixed`）のため、Footer は通常フローの末尾に配置する。法的リンクはページ最下部に配置する慣例に従う。

**Styling**: 既存ダークテーマに合わせ `bg-slate-950/80 text-indigo-300/50` 系でシンプルに実装する。
