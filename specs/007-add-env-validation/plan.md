# Implementation Plan: 環境変数の起動時バリデーション

**Branch**: `007-add-env-validation` | **Date**: 2026-05-26 | **Spec**: [spec.md](./spec.md)

**Input**: Feature specification from `specs/007-add-env-validation/spec.md`

## Summary

`negotole/src/env.ts` に Zod スキーマを定義し、`next.config.ts` からインポートすることでサーバー起動時に必須環境変数（AUTH_SECRET・AUTH_GOOGLE_ID/SECRET・DATABASE_URL・DATABASE_URL_UNPOOLED・UPSTASH_REDIS_REST_URL/TOKEN）を検証する。失敗時は欠如変数名を列挙してプロセスを終了させる。

## Technical Context

**Language/Version**: TypeScript / Node.js 20 (Next.js 16.2.6)

**Primary Dependencies**: Zod（direct dependency として追加）, Next.js

**Storage**: N/A（バリデーションのみ）

**Testing**: Vitest 2.x

**Target Platform**: Vercel (Node.js runtime)

**Project Type**: Web application (Next.js App Router)

**Performance Goals**: 起動時バリデーションのオーバーヘッド 100ms 未満

**Constraints**: `next.config.ts` は ESM で実行されるため、CommonJS 互換の書き方を避ける

**Scale/Scope**: 2ファイル変更（`next.config.ts`・`env.ts` 新規作成）+ 依存追加 + テスト

## Constitution Check

constitution.md がテンプレートのまま（未記入）のため、プロジェクト固有のゲートなし。
セキュリティ強化（必須資格情報の未設定検出）のフィーチャーであり、一般的なゲートに適合。

## Project Structure

### Documentation (this feature)

```text
specs/007-add-env-validation/
├── plan.md              # This file
├── research.md          # Phase 0 output
└── tasks.md             # Phase 2 output (/speckit-tasks command)
```

### Source Code (repository root)

```text
negotole/
├── src/
│   ├── env.ts                   # 新規作成: Zod による環境変数バリデーション
│   └── env.test.ts              # 新規作成: Vitest ユニットテスト
└── next.config.ts               # 変更: 先頭に import "./src/env" を追加
```

**Structure Decision**: 単一プロジェクト（Next.js）。`env.ts` は `src/` 直下（アプリのグローバル設定のため `lib/` より適切）。

## Complexity Tracking

> 本フィーチャーは Constitution Check に違反なし。このセクションは適用外。
