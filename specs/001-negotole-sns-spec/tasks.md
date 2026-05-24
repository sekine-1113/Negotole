# Tasks: Negotole SNS

**Input**: Design documents from `/specs/001-negotole-sns-spec/`

**Prerequisites**: plan.md ✅ | spec.md ✅ | research.md ✅ | data-model.md ✅ | contracts/ ✅

**Organization**: Phase 1 → Phase 2（基盤）→ Phase 3（US1）→ Phase 4（US2）→ Phase 5（US3）→ Phase 6（仕上げ）

## Format: `[ID] [P?] [Story?] Description`

- **[P]**: 並列実行可（異なるファイル・依存なし）
- **[Story]**: 対応するユーザーストーリー（US1/US2/US3）

---

## Phase 1: Setup（プロジェクト初期化）

**Purpose**: 追加パッケージのインストールと設定ファイルの整備

- [x] T001 `negotole/` で追加パッケージをインストールする: `pnpm add next-auth@5 @auth/drizzle-adapter drizzle-orm @neondatabase/serverless` および `pnpm add -D drizzle-kit`
- [x] T002 `negotole/drizzle.config.ts` を作成し、`DATABASE_URL_UNPOOLED` を使う Drizzle Kit 設定を記述する
- [x] T003 [P] `negotole/.env.local` に `AUTH_SECRET`・`AUTH_GOOGLE_ID`・`AUTH_GOOGLE_SECRET` の環境変数キーを追記する（値はローカル開発用）

---

## Phase 2: Foundational（全ユーザーストーリーの前提基盤）

**Purpose**: DB スキーマ・接続・ポイントユーティリティ・認証設定を確立する

**⚠️ CRITICAL**: このフェーズが完了するまでユーザーストーリーの実装を開始しない

- [x] T004 `negotole/src/lib/db/schema.ts` を作成し、Drizzle ORM で `user`・`user_point`・`post` の 3 テーブルを定義する（`docs/database.md` および `specs/001-negotole-sns-spec/data-model.md` を参照）
- [x] T005 `negotole/src/lib/db/index.ts` を作成し、`@neondatabase/serverless` を使った Neon 接続インスタンス（`DATABASE_URL` 使用）を実装する
- [x] T006 [P] `negotole/src/lib/points.ts` を作成し、ポイント残高計算（`expires_at IS NULL OR expires_at > NOW()`）・デイリーポイント重複チェック・1pt 消費（トランザクション）の 3 関数を実装する
- [x] T007 [P] `negotole/src/lib/auth.ts` を作成し、NextAuth.js v5 の Google OAuth 設定（`providers: [Google]`）と `signIn` コールバック骨格（ユーザー作成・デイリーポイント付与は T016 で実装）を記述する
- [x] T008 `pnpm drizzle-kit generate` でマイグレーションファイルを生成し、`pnpm drizzle-kit migrate` で Neon に適用する

**Checkpoint**: `user`・`user_point`・`post` テーブルが Neon 上に存在することを確認する

---

## Phase 3: User Story 1 - 匿名タイムライン閲覧（Priority: P1）🎯 MVP

**Goal**: ログインなしでトップページを開くと有効期限内の投稿が新着順に表示される

**Independent Test**: `http://localhost:3000` を未ログイン状態で開き、投稿一覧と残り時間カウントダウンが表示されることを確認する

### Implementation for User Story 1

- [x] T009 [US1] `negotole/src/app/api/posts/route.ts` に `GET /api/posts` を実装する（`hidden_at > NOW() AND deleted_at IS NULL`・ID カーソルページネーション・投稿者情報なし。`contracts/api.md` を参照）
- [x] T010 [P] [US1] `negotole/src/components/CountdownTimer.tsx` を作成する（`'use client'`・`hiddenAt: string` を props で受け取り `setInterval` で残り時間を表示）
- [x] T011 [P] [US1] `negotole/src/components/PostCard.tsx` を作成する（本文と `CountdownTimer` のみ表示。投稿者情報は一切含めない）
- [x] T012 [US1] `negotole/src/components/Timeline.tsx` を作成する（`PostCard` リスト + 「もっと見る」カーソルページネーション。T010・T011 に依存）
- [x] T013 [US1] `negotole/src/app/page.tsx` を実装する（Server Component で `GET /api/posts` を fetch し `Timeline` を render）
- [x] T014 [P] [US1] `negotole/src/app/layout.tsx` を更新し、Header 部分のプレースホルダー（後で差し替え）とグローバルスタイルを設定する

**Checkpoint**: 未ログインで `http://localhost:3000` にアクセスし、匿名の投稿一覧と残り時間が表示されることを確認する（投稿がなければ空表示で OK）

---

## Phase 4: User Story 2 - Google ログインとアカウント作成（Priority: P2）

**Goal**: Google でログインするとユーザーが作成され、デイリーポイント 10pt が付与される。ヘッダーにポイント残量が表示される

**Independent Test**: Google ログインを完了し、ヘッダーに「10pt」が表示されることを確認する。再ログインしても重複付与されないことを確認する

### Implementation for User Story 2

- [x] T015 [US2] `negotole/src/app/api/auth/[...nextauth]/route.ts` を作成し、NextAuth.js v5 の Route Handler（`GET`・`POST` を export）を実装する（`src/lib/auth.ts` の設定を使用）
- [x] T016 [US2] `negotole/src/lib/auth.ts` の `signIn` コールバックを完成させる（`user` レコードの作成または取得 → 当日デイリーポイント未付与なら `user_point` に `+10` INSERT。`src/lib/points.ts` の関数を使用）
- [x] T017 [P] [US2] `negotole/src/app/api/users/me/route.ts` を作成し、`GET /api/users/me` を実装する（セッション検証 → ユーザー情報 + ポイント残高返却。`contracts/api.md` を参照）
- [x] T018 [P] [US2] `negotole/src/components/PointBadge.tsx` を作成する（`total: number` を props で受け取りポイント残量を表示）
- [x] T019 [US2] `negotole/src/components/Header.tsx` を作成する（未ログイン: ログインボタン / ログイン済み: `PointBadge` + ログアウトボタン。T018 に依存）
- [x] T020 [US2] `negotole/src/app/layout.tsx` を更新し、Phase 3 で置いたプレースホルダーを `Header` コンポーネントに差し替える（T019 に依存）

**Checkpoint**: Google ログイン → ヘッダーに `10pt` 表示 → ログアウト → 再ログイン → 重複付与なし（`10pt` のまま）を確認する

---

## Phase 5: User Story 3 - 時間限定投稿の作成（Priority: P3）

**Goal**: ログイン済みユーザーが本文と制限時間を選んで投稿でき、1pt 消費されてタイムラインに表示される

**Independent Test**: ログイン → `/post/new` で投稿 → タイムラインに表示 → ポイントが 1pt 減っていることを確認する

### Implementation for User Story 3

- [x] T021 [US3] `negotole/src/app/api/posts/route.ts` に `POST /api/posts` を追加する（セッション検証 → ポイント残高確認 → `hidden_at` 計算 → DB トランザクション内で post INSERT + user_point に `-1` INSERT。`contracts/api.md` を参照）
- [x] T022 [P] [US3] `negotole/middleware.ts` を作成し、`/post/new` への未認証アクセスを `/api/auth/signin` へリダイレクトする（NextAuth v5 の `auth()` を使用）
- [x] T023 [US3] `negotole/src/components/PostForm.tsx` を作成する（`'use client'`・テキスト入力 255 文字カウント・制限時間ラジオ選択（60/180/360/720/1440）・残ポイント表示・ポイント不足時にボタン非活性）
- [x] T024 [US3] `negotole/src/app/post/new/page.tsx` を実装する（Server Component で `GET /api/users/me` を fetch してポイントを取得し `PostForm` に渡す）
- [x] T025 [US3] `negotole/src/components/Header.tsx` にログイン済み時の「投稿する」ボタン（`/post/new` へのリンク）を追加する（T019 の更新）

**Checkpoint**: ログイン → `/post/new` → 本文入力 + 制限時間選択 → 投稿 → タイムラインに表示 + ポイント 1pt 減を確認する

---

## Phase 6: Polish & Cross-Cutting Concerns

**Purpose**: UX 改善・エラーハンドリング・仕上げ

- [x] T026 [P] `negotole/src/components/PostCard.tsx` を更新し、残り時間 1 時間未満の投稿を視覚的に強調表示する（色変更等）
- [x] T027 全ページにローディング状態（Suspense / skeleton）とエラー状態を追加する（`negotole/src/app/` 配下の各 `loading.tsx`・`error.tsx`）
- [x] T028 [P] `negotole/src/app/post/new/page.tsx` に投稿後のタイムラインへのリダイレクト処理（`router.push('/')`）を追加する
- [x] T029 Tailwind CSS でモバイルレスポンシブ対応を確認し、各コンポーネントのブレークポイントを調整する
- [x] T030 `specs/001-negotole-sns-spec/quickstart.md` の動作確認チェックリストを実行し全項目が通ることを確認する

---

## Dependencies & Execution Order

### Phase Dependencies

- **Phase 1（Setup）**: 依存なし。即開始可能
- **Phase 2（Foundational）**: Phase 1 完了後。**全ユーザーストーリーをブロック**
- **Phase 3（US1）**: Phase 2 完了後に開始可能（US2・US3 との並列実行可）
- **Phase 4（US2）**: Phase 2 完了後に開始可能（US1・US3 との並列実行可）
- **Phase 5（US3）**: Phase 2 + US1（T009）+ US2（T015–T017）完了後に開始可能
- **Phase 6（Polish）**: Phase 3・4・5 完了後

### User Story Dependencies

- **US1（P1）**: Phase 2 完了後に独立して実装・テスト可能
- **US2（P2）**: Phase 2 完了後に独立して実装・テスト可能
- **US3（P3）**: `GET /api/posts`（T009）と認証基盤（T015–T017）に依存。US1・US2 が完了してから進める

### Within Each User Story

- モデル・ユーティリティ → サービス/API → コンポーネント → ページ の順で進める
- 各フェーズ末の **Checkpoint** で独立動作を確認してから次フェーズへ

---

## Parallel Opportunities

### Phase 2 内の並列実行

```
T004（スキーマ定義）
  → T008（マイグレーション）

T006（ポイントユーティリティ）[P]   ← 同時に進められる
T007（認証設定）[P]                ← 同時に進められる
T005（DB 接続）                    ← 同時に進められる
```

### Phase 3（US1）内の並列実行

```
T009（GET /api/posts）
T010（CountdownTimer）[P]   ← 同時に進められる
T011（PostCard）[P]         ← 同時に進められる
  → T012（Timeline）
    → T013（page.tsx）
T014（layout.tsx）[P]       ← 他と並列可
```

---

## Implementation Strategy

### MVP First（User Story 1 のみ）

1. Phase 1: Setup 完了
2. Phase 2: Foundational 完了（DB・接続・ユーティリティ）
3. Phase 3: US1（匿名タイムライン）完了
4. **STOP & VALIDATE**: `http://localhost:3000` で動作確認
5. 動作確認後に Phase 4（ログイン）へ進む

### Incremental Delivery

1. Setup + Foundational → 基盤完成
2. US1 → 匿名タイムライン完成（MVP）
3. US2 → Google ログイン + ポイント付与完成
4. US3 → 投稿作成完成（フル機能）
5. Polish → 品質向上

---

## Notes

- `[P]` タスクは異なるファイルを編集するため並列実行可
- Next.js 16 は破壊的変更あり。実装前に `negotole/node_modules/next/dist/docs/` を確認すること（`AGENTS.md` 参照）
- `DATABASE_URL_UNPOOLED` はマイグレーションのみに使用し、ランタイムは `DATABASE_URL` を使う
- 各 Checkpoint で git commit を推奨する
