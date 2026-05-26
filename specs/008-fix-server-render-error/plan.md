# Implementation Plan: 本番 Server Components レンダーエラーの修正

**Branch**: `008-fix-server-render-error` | **Date**: 2026-05-26 | **Spec**: [spec.md](./spec.md)

**Input**: Feature specification from `specs/008-fix-server-render-error/spec.md`

## Summary

本番環境で `An error occurred in the Server Components render` が発生する原因は、`src/app/page.tsx` が SSR 時に `process.env.NEXTAUTH_URL ?? "http://localhost:3000"` を使って自身の API エンドポイントへ HTTP フェッチしていること。next-auth v5 では `NEXTAUTH_URL` は deprecated のため Vercel 未設定 → `http://localhost:3000` へのフェッチ失敗 → クラッシュ。

修正：投稿取得 DB クエリを `src/lib/posts.ts` に抽出し、Server Component から直接呼ぶ。クライアント側の無限スクロールは引き続き `/api/posts` エンドポイントを使用。

## Technical Context

**Language/Version**: TypeScript 5 / Node.js 20

**Primary Dependencies**: Next.js 16.2.6 (App Router), React 19.2.4, Drizzle ORM 0.45.2, @neondatabase/serverless 1.1.0, next-auth 5.0.0-beta.31

**Storage**: Neon PostgreSQL (pooled接続: `DATABASE_URL`)

**Testing**: Vitest 2.x — `pnpm test` in `negotole/`

**Target Platform**: Vercel (サーバーレス関数)

**Project Type**: Web アプリケーション (Next.js App Router)

**Performance Goals**: Server Component のレンダーが正常に完了すること（エラー率 0%）

**Constraints**: 既存の 23 テストを全てパスすること。クライアント側の無限スクロール動作を維持すること。

**Scale/Scope**: 変更ファイル数 3 件（新規1件、既存2件の最小変更）

## Constitution Check

Constitution はプレースホルダー状態のため固有のゲートは存在しない。以下の一般原則を適用:

- [x] 変更スコープは最小限（3ファイル）
- [x] 既存テストを破壊しない
- [x] デグレなし（クライアント側の無限スクロールは変更不要）

## Project Structure

### Documentation (this feature)

```text
specs/008-fix-server-render-error/
├── plan.md        ← このファイル
├── research.md    ← Phase 0 出力
├── contracts/
│   └── posts-query.md  ← Phase 1 出力（共有関数のインターフェース）
└── tasks.md       ← /speckit-tasks コマンドで生成
```

### Source Code (repository root)

```text
negotole/src/
├── lib/
│   └── posts.ts          ← 新規作成: fetchPosts() 共有関数
├── app/
│   ├── page.tsx          ← 変更: HTTP fetch → fetchPosts() 直接呼び出し
│   └── api/
│       └── posts/
│           └── route.ts  ← 変更: GET ハンドラ内で fetchPosts() 使用
```

**Structure Decision**: Single project（Next.js App Router の既存構造に準拠）。新規ファイルは `src/lib/` に配置（既存の `db/index.ts`・`auth.ts`・`ratelimit.ts`・`points.ts` と同階層）。

## Feature Name

fix-server-render-error
