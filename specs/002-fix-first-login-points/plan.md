# Implementation Plan: 初回ログインポイント付与バグ修正 & キャンペーン恒久ポイント

**Branch**: `002-fix-first-login-points` | **Date**: 2026-05-24 | **Spec**: [spec.md](./spec.md)

**Input**: Feature specification from `specs/002-fix-first-login-points/spec.md`

---

## Summary

1. **バグ修正（P1）**: NextAuth v5 の `jwt` コールバックで `profile?.email` を条件にしているため、OAuth サインイン時のみデイリーポイントが付与される。トークンリフレッシュ時は `profile` が `undefined` となりポイントチェックが走らない。`token.userId` が存在する場合は常にデイリーポイントチェックを実行するよう修正する。

2. **キャンペーン機能（P2）**: `campaign` テーブルを新設し、管理者（`user.role = 'admin'`）が `/admin/campaigns` から CRUD 操作できるようにする。キャンペーン期間中の初回ログイン（アカウント新規作成）時に恒久ポイント 100pt を付与する。

---

## Technical Context

**Language/Version**: TypeScript 5 / Node.js 22

**Primary Dependencies**: Next.js 16.2.6 (App Router), NextAuth.js v5 beta, Drizzle ORM, @neondatabase/serverless, Tailwind CSS 4

**Storage**: Neon PostgreSQL (Serverless) — pooled接続（`DATABASE_URL`）をランタイムに使用、unpooled（`DATABASE_URL_UNPOOLED`）をマイグレーションに使用

**Testing**: Vitest 2.x（ユニットテスト）、ビルド確認（`pnpm build`）

**Target Platform**: Vercel（Next.js フルスタック）

**Project Type**: Web アプリケーション（BFF パターン: Next.js Route Handlers が DB と通信、ブラウザは Route Handlers のみ呼ぶ）

**Performance Goals**: ログイン完了からポイント表示まで 1 分以内

**Constraints**: 管理画面は `user.role = 'admin'` ユーザーのみアクセス可。同時アクティブキャンペーンは 1 件のみ。

**Scale/Scope**: 小規模 SNS（数百〜数千ユーザー想定）

---

## Constitution Check

constitution.md はテンプレートのままで実効的なルールが未定義のため、プロジェクト固有の制約として以下を確認する:

- ✅ BFF パターン維持（ブラウザから直接 DB 接続しない）
- ✅ 管理者機能は既存 Google OAuth フロー上に構築（新規認証基盤を設けない）
- ✅ JWT セッション戦略を維持（DrizzleAdapter は使用しない）
- ✅ Drizzle ORM のスキーマ変更はマイグレーションを通じて適用

---

## Project Structure

### Documentation (this feature)

```text
specs/002-fix-first-login-points/
├── plan.md              ← このファイル
├── research.md          ← Phase 0 output
├── data-model.md        ← Phase 1 output
├── quickstart.md        ← Phase 1 output
├── contracts/           ← Phase 1 output
│   └── api.md
└── tasks.md             ← /speckit-tasks で生成
```

### Source Code Changes

```text
negotole/
├── src/
│   ├── lib/
│   │   ├── db/
│   │   │   └── schema.ts          # user.role 追加、campaign テーブル新設
│   │   ├── auth.ts                # jwt コールバック修正（バグ修正 + キャンペーン判定）
│   │   └── points.ts              # grantCampaignPoints, getActiveCampaign 追加
│   ├── app/
│   │   ├── admin/
│   │   │   └── campaigns/
│   │   │       ├── page.tsx               # キャンペーン一覧
│   │   │       ├── new/
│   │   │       │   └── page.tsx           # 新規作成フォーム
│   │   │       └── [id]/
│   │   │           └── edit/
│   │   │               └── page.tsx       # 編集フォーム
│   │   └── api/
│   │       └── admin/
│   │           └── campaigns/
│   │               ├── route.ts           # GET（一覧）/ POST（作成）
│   │               └── [id]/
│   │                   └── route.ts       # PATCH（更新）/ DELETE（削除）
│   └── middleware.ts              # /admin/** を admin ロール限定に追加
├── drizzle/                       # 新マイグレーションファイル
└── src/lib/__tests__/
    ├── points.test.ts             # 既存テスト更新 + campaign 関数テスト追加
    └── campaigns.test.ts          # 新規テスト（campaign ロジック）
```

---

## Complexity Tracking

Constitution 違反なし。追加機能の複雑さは仕様要件（管理者ロール、キャンペーン DB 管理）から直接導かれるもの。
