# Implementation Plan: 利用規約・プライバシーポリシー・お問い合わせ/通報フォーム

**Branch**: `019-legal-pages-contact-form` | **Date**: 2026-06-07 | **Spec**: [spec.md](./spec.md)

**Input**: Feature specification from `specs/019-legal-pages-contact-form/spec.md`

## Summary

利用規約（`/terms`）・プライバシーポリシー（`/privacy`）・お問い合わせページ（`/contact`）の静的ページを追加し、フッターコンポーネントから各ページへのリンクを設置する。投稿の通報機能は Google フォームへの外部リンクとして実装し、通報ボタンはログインユーザーにのみ表示する。新規 DB スキーマ・API ルートは不要。

## Technical Context

**Language/Version**: TypeScript 5.x / Next.js 16 (App Router)

**Primary Dependencies**: Next.js (Server Components, App Router), NextAuth v5, Tailwind CSS

**Storage**: N/A（静的ページのため DB 不使用）

**Testing**: Vitest（既存の Route Handler テストは影響なし）

**Target Platform**: Vercel（Next.js 16 App Router）

**Project Type**: Web アプリケーション（静的コンテンツページ追加）

**Performance Goals**: 静的ページのため特別な要件なし（Next.js デフォルトの静的最適化で十分）

**Constraints**:
- 通報ボタンは PostCard（サーバーコンポーネント）に配置するが、ログイン状態の判定は `page.tsx` から Props で渡す
- Google フォーム URL は `NEXT_PUBLIC_*` 環境変数で管理
- 既存ダークテーマ（`bg-slate-900`, `text-indigo-300` 系）に準拠

**Scale/Scope**: 新規ファイル 5 件（3 ページ + Footer + ReportButton）、既存ファイル変更 3 件（layout.tsx, PostCard.tsx, Timeline.tsx）

## Constitution Check

*Constitution はプレースホルダーのため実質的な制約なし。以下は本プロジェクトの慣例に基づくゲート確認。*

- [x] 新規 DB マイグレーション不要（静的ページ）
- [x] 既存 NextAuth 認証フローへの変更なし
- [x] `"use client"` は ReportButton のみに限定（Footer・法的ページはサーバーコンポーネント）
- [x] 環境変数は `NEXT_PUBLIC_` プレフィックスで公開側に設置
- [x] テスト対象なし（静的ページ・外部リンクのためユニットテスト不要）

**Constitution Check**: PASS（違反なし）

## Project Structure

### Documentation (this feature)

```text
specs/019-legal-pages-contact-form/
├── plan.md              # This file
├── research.md          # Phase 0 output
├── quickstart.md        # Phase 1 output
└── tasks.md             # Phase 2 output (/speckit-tasks command)
```

### Source Code

```text
negotole/src/
├── app/
│   ├── terms/
│   │   └── page.tsx           # 新規: 利用規約ページ（Server Component）
│   ├── privacy/
│   │   └── page.tsx           # 新規: プライバシーポリシーページ（Server Component）
│   ├── contact/
│   │   └── page.tsx           # 新規: お問い合わせページ（Server Component）
│   └── layout.tsx             # 変更: Footer コンポーネントを追加
├── components/
│   ├── Footer.tsx              # 新規: フッターコンポーネント（Server Component）
│   ├── ReportButton.tsx        # 新規: 通報ボタン（Client Component）
│   ├── PostCard.tsx            # 変更: isLoggedIn prop 追加 + ReportButton 組み込み
│   └── Timeline.tsx            # 変更: isLoggedIn prop を PostCard に渡す
└── app/
    └── page.tsx               # 変更: isLoggedIn を Timeline に渡す
```

**環境変数（`.env.local` に追加）**:
```
NEXT_PUBLIC_CONTACT_FORM_URL=https://forms.gle/PLACEHOLDER_CONTACT
NEXT_PUBLIC_REPORT_FORM_URL=https://docs.google.com/forms/d/PLACEHOLDER/viewform
```

## Complexity Tracking

*Constitution Check 違反なし。複雑性追跡不要。*
