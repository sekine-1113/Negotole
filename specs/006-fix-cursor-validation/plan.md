# Implementation Plan: cursor パラメータの入力検証強化

**Branch**: `006-fix-cursor-validation` | **Date**: 2026-05-25 | **Spec**: [spec.md](./spec.md)

**Input**: Feature specification from `specs/006-fix-cursor-validation/spec.md`

## Summary

`GET /api/posts` の cursor クエリパラメータを base64 デコード後、`Number.isInteger()` と正値チェックにより不正値（NaN・浮動小数・負数・0）を検出し、400 Bad Request を返す。対象ファイルは `negotole/src/app/api/posts/route.ts` の 1 行のみ（+ バリデーションロジックの追加）。

## Technical Context

**Language/Version**: TypeScript / Node.js 20 (Next.js 16.2.6)

**Primary Dependencies**: Next.js (App Router), Drizzle ORM 0.45, @neondatabase/serverless

**Storage**: PostgreSQL (Neon Serverless)

**Testing**: Vitest 2.x

**Target Platform**: Vercel (Edge / Node.js runtime)

**Project Type**: Web application (Next.js App Router)

**Performance Goals**: 検証処理は同期で完結するためオーバーヘッドなし

**Constraints**: NaN・非整数・0・負の整数がDBクエリに渡ってはならない

**Scale/Scope**: 単一ファイルへの局所的な変更

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

constitution.md がテンプレートのまま（未記入）のため、プロジェクト固有のゲートなし。
一般的なゲート（セキュリティ・データ整合性）は本フィーチャー自体が修正対象であるため適合。

## Project Structure

### Documentation (this feature)

```text
specs/006-fix-cursor-validation/
├── plan.md              # This file
├── research.md          # Phase 0 output
├── data-model.md        # Phase 1 output (スキーマ変更なし、省略)
├── contracts/           # Phase 1 output
│   └── api-posts-get.md
└── tasks.md             # Phase 2 output (/speckit-tasks command)
```

### Source Code (repository root)

```text
negotole/
├── src/
│   └── app/
│       └── api/
│           └── posts/
│               └── route.ts   # 変更対象: cursor 検証ロジック追加
└── src/
    └── app/
        └── api/
            └── posts/
                └── __tests__/
                    └── route.test.ts   # 新規: cursor 検証のユニットテスト
```

**Structure Decision**: 単一プロジェクト（Next.js App Router）。変更は `route.ts` 1ファイルのみ、テストを `__tests__/route.test.ts` に追加。

## Complexity Tracking

> 本フィーチャーは Constitution Check に違反なし。このセクションは適用外。
