# Tasks: レート制限の追加

**Input**: Design documents from `specs/004-add-rate-limit/`

**Prerequisites**: plan.md, spec.md, research.md, data-model.md, contracts/rate-limit.md

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel (different files, no dependencies)
- **[Story]**: Which user story this task belongs to

---

## Phase 1: Setup（パッケージインストール）

**Purpose**: Upstash 依存関係のインストールと環境変数の準備

- [x] T001 `@upstash/ratelimit` と `@upstash/redis` を `negotole/package.json` に追加する（`pnpm add @upstash/ratelimit @upstash/redis` を `negotole/` ディレクトリで実行）
- [x] T002 [P] Upstash Redis インスタンスのセットアップ手順をドキュメント化する（`docs/setup-upstash.md` に作成。環境変数 `UPSTASH_REDIS_REST_URL`, `UPSTASH_REDIS_REST_TOKEN` の取得方法を記載）
- [x] T003 `.env.local.example` が存在しない場合は `negotole/.env.local.example` を作成し、`UPSTASH_REDIS_REST_URL` と `UPSTASH_REDIS_REST_TOKEN` のプレースホルダーを追記する

---

## Phase 2: Foundational（共通基盤）

**Purpose**: すべてのユーザーストーリーが依存するレート制限ユーティリティの実装

**⚠️ CRITICAL**: このフェーズが完了するまでユーザーストーリーの実装を始めない

- [x] T004 `negotole/src/lib/ratelimit.ts` を新規作成し、Upstash Redis クライアントと 3 つのリミッターインスタンス（`postWriteLimiter`・`authLimiter`・`adminLimiter`）をエクスポートする。各リミッターは `Ratelimit.slidingWindow()` を使用し、`research.md` の制限値を適用する
- [x] T005 `negotole/middleware.ts` に `/api/:path*` を matcher に追加し、リクエストパスに応じて適切なリミッターを呼び出す基本構造を実装する（429 レスポンス形式は `contracts/rate-limit.md` に従う）

**Checkpoint**: `src/lib/ratelimit.ts` が正しくエクスポートされ、middleware がコンパイルエラーなく動作すること

---

## Phase 3: User Story 1 - 投稿 API へのレート制限（Priority: P1）🎯 MVP

**Goal**: `POST /api/posts` に対してユーザー ID 単位のレート制限を実装する（10 回/60 秒）

**Independent Test**: 同一ユーザーとして 11 回連続で `POST /api/posts` を呼び出したとき、11 回目が 429 を返すことを確認する

### Implementation for User Story 1

- [x] T006 [US1] `negotole/middleware.ts` の `/api/posts` ルートに対し POST メソッドのみ `postWriteLimiter` を適用する。識別子は `req.auth?.user?.id`（ユーザー ID）とし、未認証の場合は制限をスキップする（401 は Route Handler に委ねる）
- [x] T007 [US1] 429 レスポンスに `Retry-After` ヘッダーと `{ "error": "Too many requests", "retryAfter": N }` ボディを含めることを確認する（`contracts/rate-limit.md` 準拠）
- [x] T008 [US1] `pnpm tsc --noEmit` と `pnpm lint` が通ることを確認し、必要に応じてエラーを修正する

**Checkpoint**: User Story 1 完了 — 投稿 API でユーザー単位のレート制限が動作する

---

## Phase 4: User Story 2 - 認証エンドポイントへのレート制限（Priority: P2）

**Goal**: `/api/auth/*` に対して IP アドレス単位のレート制限を実装する（20 回/60 秒）

**Independent Test**: 同一 IP から 21 回連続で `/api/auth/signin` を呼び出したとき、21 回目が 429 を返すことを確認する

### Implementation for User Story 2

- [x] T009 [US2] `negotole/middleware.ts` の `/api/auth/:path*` ルートに `authLimiter` を適用する。識別子は `req.headers.get('x-forwarded-for') ?? req.headers.get('x-real-ip') ?? 'unknown'` とする
- [x] T010 [US2] `pnpm tsc --noEmit` と `pnpm lint` が通ることを確認する

**Checkpoint**: User Story 2 完了 — 認証エンドポイントで IP 単位のレート制限が動作する

---

## Phase 5: User Story 3 - 管理者 API へのレート制限（Priority: P3）

**Goal**: `/api/admin/*` に対してユーザー ID 単位のレート制限を実装する（30 回/60 秒）

**Independent Test**: 管理者ユーザーとして 31 回連続で `/api/admin/campaigns` を呼び出したとき、31 回目が 429 を返すことを確認する

### Implementation for User Story 3

- [x] T011 [US3] `negotole/middleware.ts` の `/api/admin/:path*` ルートに `adminLimiter` を適用する。識別子は `req.auth?.user?.id`（管理者ユーザー ID）とする
- [x] T012 [US3] `pnpm tsc --noEmit` と `pnpm lint` が通ることを確認する

**Checkpoint**: User Story 3 完了 — すべての API グループにレート制限が適用された

---

## Phase 6: Polish & Cross-Cutting Concerns

**Purpose**: ドキュメント更新と最終確認

- [x] T013 [P] `docs/api.md` に各エンドポイントグループの 429 エラーレスポンスを追記する（`contracts/rate-limit.md` の内容をもとに）
- [x] T014 [P] `docs/todo.md` の item #3（レート制限なし）を対応済みとしてマークする
- [x] T015 `pnpm test` を実行し、全テストが通過することを確認する（SC-004）
- [x] T016 [P] `negotole/.env.local.example`（またはプロジェクト README）に Upstash Redis のセットアップ手順を記載する

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (Phase 1)**: すぐ開始可能
- **Foundational (Phase 2)**: Phase 1 完了後 — すべてのユーザーストーリーをブロック
- **US1 (Phase 3)**: Foundational 完了後
- **US2 (Phase 4)**: Foundational 完了後（US1 と並列可能）
- **US3 (Phase 5)**: Foundational 完了後（US1・US2 と並列可能）
- **Polish (Phase 6)**: すべての US 完了後

### User Story Dependencies

- **US1 (P1)**: Foundational 完了後、他 US に依存しない
- **US2 (P2)**: Foundational 完了後、他 US に依存しない
- **US3 (P3)**: Foundational 完了後、他 US に依存しない

### Parallel Opportunities

- T002, T003 は T001 と並列実行可能
- T006, T007, T008（US1）と T009, T010（US2）と T011, T012（US3）は T005 完了後に並列実行可能
- T013, T014, T016（Polish）は互いに並列実行可能

---

## Parallel Example: Foundational 完了後

```bash
# US1, US2, US3 を同時進行可能:
Task: "T006 [US1] middleware に postWriteLimiter を適用"
Task: "T009 [US2] middleware に authLimiter を適用"
Task: "T011 [US3] middleware に adminLimiter を適用"
```

---

## Implementation Strategy

### MVP First（User Story 1 のみ）

1. Phase 1: パッケージインストール（T001）
2. Phase 2: ratelimit.ts 作成 + middleware 基本構造（T004, T005）
3. Phase 3: 投稿 API のみに制限を適用（T006, T007, T008）
4. **STOP and VALIDATE**: 投稿 API のレート制限を手動確認
5. 問題なければ US2・US3 へ続行

### Incremental Delivery

1. Setup + Foundational → 基盤完成
2. US1 → 投稿 API 保護（最高優先）
3. US2 → 認証エンドポイント保護
4. US3 → 管理者 API 保護
5. Polish → ドキュメント更新と最終確認

---

## Notes

- `middleware.ts` は全フェーズで同一ファイルを更新するため、各 US の変更を順次マージする
- Upstash Redis の接続情報（`UPSTASH_REDIS_REST_URL`, `UPSTASH_REDIS_REST_TOKEN`）は実際の環境変数として設定が必要（CI 環境ではモックが必要な場合あり）
- `pnpm test` はインメモリモックを使用しているため、Upstash の接続なしで既存テストは通過する
