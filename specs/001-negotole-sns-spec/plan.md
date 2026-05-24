# Implementation Plan: Negotole SNS

**Branch**: `001-negotole-sns-spec` | **Date**: 2026-05-24 | **Spec**: [spec.md](spec.md)

**Input**: Feature specification from `/specs/001-negotole-sns-spec/spec.md`

---

## Summary

時間限定投稿 SNS「Negotole」の初期実装。匿名タイムライン閲覧（ログイン不要）・Google OAuth 認証・デイリーポイント制の投稿作成の 3 機能を Next.js App Router + BFF パターンで構築する。DB は Vercel Neon（Drizzle ORM）、認証は NextAuth.js v5。

---

## Technical Context

**Language/Version**: TypeScript 5

**Primary Dependencies**:
- Next.js 16.2.6（App Router）
- React 19.2.4
- Tailwind CSS 4
- NextAuth.js v5（Auth.js）+ Google OAuth provider
- Drizzle ORM + drizzle-kit（Neon Serverless driver）
- @neondatabase/serverless

**Storage**: Neon PostgreSQL on Vercel（Serverless）

**Testing**: Vitest + @testing-library/react（ユニット・統合テスト）

**Target Platform**: Web ブラウザ（モバイルレスポンシブ対応）

**Project Type**: Web アプリケーション（Next.js フルスタック、BFF パターン）

**Performance Goals**: タイムライン初期表示 2 秒以内（SC-001）、投稿完了まで 3 分以内（SC-002）

**Constraints**: ブラウザから DB へ直接接続しない（BFF 必須）、論理削除のみ（物理削除禁止）

**Scale/Scope**: 初期 MVP。ユーザー数・投稿数は小〜中規模想定

---

## Constitution Check

*constitution.md はテンプレート未記入のため、プロジェクト固有のゲートはなし。以下は自律的に設定するゲート。*

- [x] ブラウザから DB への直接アクセスなし（BFF Route Handlers 経由のみ）
- [x] 論理削除（`deleted_at`）の一貫した使用
- [x] 認証必須エンドポイントでのセッション検証
- [x] 投稿者情報はタイムラインレスポンスに含めない

---

## Project Structure

### Documentation (this feature)

```text
specs/001-negotole-sns-spec/
├── plan.md              # This file
├── research.md          # Phase 0 output
├── data-model.md        # Phase 1 output
├── quickstart.md        # Phase 1 output
├── contracts/
│   └── api.md           # Phase 1 output
└── tasks.md             # Phase 2 output (/speckit-tasks)
```

### Source Code (repository root)

```text
negotole/
├── src/
│   ├── app/
│   │   ├── layout.tsx              # ルートレイアウト（Header 含む）
│   │   ├── page.tsx                # タイムライン（/）
│   │   ├── post/
│   │   │   └── new/
│   │   │       └── page.tsx        # 投稿フォーム（/post/new）
│   │   └── api/
│   │       ├── posts/
│   │       │   └── route.ts        # BFF: GET /api/posts, POST /api/posts
│   │       ├── users/
│   │       │   └── me/
│   │       │       └── route.ts    # BFF: GET /api/users/me
│   │       └── auth/
│   │           └── [...nextauth]/
│   │               └── route.ts   # NextAuth.js ハンドラ
│   ├── components/
│   │   ├── Header.tsx
│   │   ├── Timeline.tsx
│   │   ├── PostCard.tsx
│   │   ├── PostForm.tsx
│   │   ├── PointBadge.tsx
│   │   └── CountdownTimer.tsx
│   └── lib/
│       ├── db/
│       │   ├── index.ts            # Neon 接続
│       │   └── schema.ts           # Drizzle スキーマ定義
│       ├── auth.ts                 # NextAuth 設定
│       └── points.ts               # ポイント計算ユーティリティ
├── middleware.ts                   # 認証ガード（/post/new）
└── drizzle.config.ts               # Drizzle Kit 設定（マイグレーション）
```

**Structure Decision**: Next.js App Router の単一プロジェクト構成。`src/app/api/` が BFF 層として全 DB アクセスを担い、`src/lib/db/` でスキーマと接続を集約する。

---

## Complexity Tracking

Constitution 違反なし。記載不要。
