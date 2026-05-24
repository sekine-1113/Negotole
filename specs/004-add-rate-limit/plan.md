# Implementation Plan: レート制限の追加

**Branch**: `004-add-rate-limit` | **Date**: 2026-05-25 | **Spec**: [spec.md](spec.md)

**Input**: Feature specification from `specs/004-add-rate-limit/spec.md`

## Summary

ログイン試行・投稿 API・管理者 API にレート制限が存在しないため、Upstash Redis をバックエンドとした `@upstash/ratelimit` を Next.js ミドルウェアに統合する。スライディングウィンドウアルゴリズムでユーザー ID / IP 単位の制限を適用し、429 Too Many Requests を返す。スキーマ変更なし。

## Technical Context

**Language/Version**: TypeScript 5 / Node.js 20

**Primary Dependencies**: Next.js App Router (middleware), `@upstash/ratelimit`, `@upstash/redis`

**Storage**: Upstash Redis（レート制限カウンタ専用、HTTP API 経由）

**Testing**: Vitest（既存テストの通過確認）

**Target Platform**: Vercel Serverless Functions

**Project Type**: Web サービス（Next.js Route Handlers + Middleware）

**Performance Goals**: レート制限チェックによる追加レイテンシ 100ms 未満（SC-002）

**Constraints**: Upstash 無料プラン（10k commands/day）の範囲内で動作すること

**Scale/Scope**: `middleware.ts` の拡張 + `src/lib/ratelimit.ts` の新規作成（2 ファイル変更）

## Constitution Check

constitution はプレースホルダーのため、プロジェクト固有のゲートは適用なし。  
既存テストがすべて通ることを確認する（SC-004）。

## Project Structure

### Documentation (this feature)

```text
specs/004-add-rate-limit/
├── plan.md              # This file
├── research.md          # Phase 0 output
├── data-model.md        # Phase 1 output
├── contracts/
│   └── rate-limit.md    # 429 コントラクト
└── checklists/
    └── requirements.md  # 仕様品質チェックリスト（全項目 pass）
```

### Source Code (repository root)

```text
negotole/
├── src/
│   ├── lib/
│   │   └── ratelimit.ts          # 新規作成: Upstash Redis クライアント + 制限ルール定義
│   └── middleware.ts              # 変更: /api/* へのレート制限チェックを追加
├── .env.local                    # UPSTASH_REDIS_REST_URL / TOKEN を追加（手動）
└── package.json                  # @upstash/ratelimit, @upstash/redis を追加
```

**Structure Decision**: ミドルウェアによる集中管理。個別 Route Handler の変更なし。

## 実装詳細メモ

### src/lib/ratelimit.ts（新規）

- `@upstash/redis` で Redis クライアントを初期化（環境変数 `UPSTASH_REDIS_REST_URL`, `UPSTASH_REDIS_REST_TOKEN` 使用）
- `Ratelimit.slidingWindow()` で 3 種類のリミッターを定義:
  - `postWriteLimiter`: 10 回 / 60 秒（ユーザー ID 単位）
  - `authLimiter`: 20 回 / 60 秒（IP 単位）
  - `adminLimiter`: 30 回 / 60 秒（ユーザー ID 単位）

### middleware.ts（変更）

- matcher に `/api/:path*` を追加
- リクエストパスに応じて適切なリミッターを選択:
  - `/api/posts` POST → `postWriteLimiter`（識別子: `token.userId`）
  - `/api/auth/*` → `authLimiter`（識別子: `x-forwarded-for` or `x-real-ip`）
  - `/api/admin/*` → `adminLimiter`（識別子: `token.userId`）
  - その他の GET リクエスト → 制限なし
- 制限超過時は `429` + `Retry-After` ヘッダー + JSON ボディを返す

## Complexity Tracking

> No Constitution violations.
