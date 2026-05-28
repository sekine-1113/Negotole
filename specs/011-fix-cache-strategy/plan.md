# Implementation Plan: キャッシュ戦略修正

**Branch**: `011-fix-cache-strategy` | **Date**: 2026-05-28 | **Spec**: [spec.md](./spec.md)

**Input**: Feature specification from `specs/011-fix-cache-strategy/spec.md`

## Summary

ポイント残高表示の全ページ同期（Header の `getPointBalance` を `unstable_cache` でタグ付きキャッシュ化し、ポイント変動時に `revalidateTag` で全ページ横断的に無効化）と、GET `/api/posts` への `Cache-Control: no-store` 付与による投稿一覧のキャッシュ動作明示化を行う。変更対象ファイルは 2 ファイル（`src/lib/points.ts`、`src/app/api/posts/route.ts`）のみ。

## Technical Context

**Language/Version**: TypeScript 5.x

**Primary Dependencies**: Next.js 16.2.6（App Router）、Drizzle ORM、NextAuth.js v5

**Storage**: Neon PostgreSQL（Drizzle ORM 経由）

**Testing**: Vitest（`pnpm test`、`negotole/` ディレクトリで実行）

**Target Platform**: Vercel（サーバーレス、SSR）

**Project Type**: Web サービス（Next.js App Router フルスタック）

**Performance Goals**: Header のポイント表示はリクエストごとに正確な最新値を反映すること

**Constraints**:
- `cacheComponents` フラグは `next.config.ts` に未設定 → `use cache` / `cacheTag` は利用不可
- `unstable_cache` を使用（Next.js 16 で deprecated だが `cacheComponents` 未有効化環境では唯一の手段）
- `revalidateTag` は Server Action または Route Handler から呼び出す必要がある

**Scale/Scope**: 変更ファイル 2 件、テスト 1 件追加

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

コンスティテューションは未記入テンプレートのため、ゲート違反なし。プロジェクト固有の制約として以下を確認:

- ✅ 変更対象は既存ファイルのみ（新規ファイル最小限）
- ✅ 既存のテスト構成（Vitest）を維持
- ✅ `pnpm test` で全 23 テストがパスし続けること

## Project Structure

### Documentation (this feature)

```text
specs/011-fix-cache-strategy/
├── plan.md              # This file
├── research.md          # Phase 0 output
├── data-model.md        # Phase 1 output
├── contracts/           # Phase 1 output
│   └── api-posts-get.md
└── tasks.md             # Phase 2 output (/speckit-tasks)
```

### Source Code (repository root)

```text
negotole/src/
├── lib/
│   └── points.ts              # getPointBalance を unstable_cache でラップ
└── app/
    └── api/
        └── posts/
            └── route.ts       # Cache-Control ヘッダー追加、revalidateTag に置き換え
```

## Complexity Tracking

> Constitution Check 違反なし。Complexity Tracking 不要。
