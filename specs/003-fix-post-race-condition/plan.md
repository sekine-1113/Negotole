# Implementation Plan: 投稿作成の競合状態・整合性バグ修正

**Branch**: `003-fix-post-race-condition` | **Date**: 2026-05-25 | **Spec**: [spec.md](spec.md)

**Input**: Feature specification from `specs/003-fix-post-race-condition/spec.md`

## Summary

`POST /api/posts` において、ポイント残高チェックと消費が非アトミックであったため、並列リクエスト時にポイントがマイナスになる競合状態が存在した。`db.transaction()` + `SELECT ... FOR UPDATE` で残高チェック・投稿作成・ポイント消費を単一トランザクションに包み、原子性を保証する。

## Technical Context

**Language/Version**: TypeScript 5, Node.js 20

**Primary Dependencies**: Next.js App Router, Drizzle ORM, Neon PostgreSQL (Serverless)

**Storage**: Neon PostgreSQL（接続プール用 `DATABASE_URL`）

**Testing**: Vitest（単体テスト）

**Target Platform**: Vercel（Serverless Functions）

**Project Type**: Web サービス（BFF パターン、Route Handlers が API 層）

**Performance Goals**: 通常の 1 リクエストフローで既存レスポンス時間を維持（SC-004）

**Constraints**: Serverless 環境のため長時間トランザクション不可（実行時間は短い）

**Scale/Scope**: 単一エンドポイント修正（`src/app/api/posts/route.ts`）

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

constitution はプレースホルダーのため、プロジェクト固有のゲートは適用なし。  
既存テストがすべて通ることを確認済み（SC-003 達成）。

## Project Structure

### Documentation (this feature)

```text
specs/003-fix-post-race-condition/
├── plan.md              # This file
├── research.md          # Phase 0 output
├── data-model.md        # Phase 1 output
├── checklists/
│   └── requirements.md  # 仕様品質チェックリスト（全項目 pass）
└── tasks.md             # Phase 2 output（/speckit-tasks で生成）
```

### Source Code (repository root)

```text
negotole/src/
├── app/
│   └── api/
│       └── posts/
│           └── route.ts          # ← 競合状態修正の唯一の変更ファイル
└── lib/
    └── points.ts                 # consumeOnePoint / getPointBalance（参照のみ）

docs/
├── api.md                        # トランザクション仕様・管理者 API 追記
├── database.md                   # app_user rename・campaign table・トランザクション方針追記
└── todo.md                       # items #1, #2 を対応済みとしてマーク
```

**Structure Decision**: 単一ファイル修正。既存の `db.transaction()` API（Drizzle ORM）を利用。

## Complexity Tracking

> No Constitution violations.
