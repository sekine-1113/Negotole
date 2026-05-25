# Tasks: セキュリティヘッダーの追加

**Input**: Design documents from `specs/005-add-security-headers/`

**Prerequisites**: plan.md, spec.md, research.md, contracts/security-headers.md

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel (different files, no dependencies)
- **[Story]**: Which user story this task belongs to

---

## Phase 1: Setup（前提確認）

**Purpose**: 変更前の型チェック・lint が通ることを確認する

- [x] T001 `negotole/` ディレクトリで `pnpm tsc --noEmit` と `pnpm lint` を実行し、既存エラーがないことを確認する

---

## Phase 2: Foundational（proxy.ts 移行）

**Purpose**: Next.js 16 の非推奨対応。すべてのユーザーストーリーの前提条件

**⚠️ CRITICAL**: このフェーズが完了するまでユーザーストーリーの実装を始めない

- [x] T002 `negotole/middleware.ts` を `negotole/proxy.ts` にリネームし、エクスポートを `export default auth(...)` から `export const proxy = auth(...)` に変更する（既存の認証・レート制限ロジックはそのまま維持）
- [x] T003 `pnpm tsc --noEmit` と `pnpm lint` が通ることを確認し、必要に応じてエラーを修正する

**Checkpoint**: `proxy.ts` が `middleware.ts` の機能を完全に引き継いでいること。認証リダイレクト・レート制限が動作すること

---

## Phase 3: User Story 1 - クリックジャッキング・コンテンツ盗用からの保護（Priority: P1）🎯 MVP

**Goal**: `X-Frame-Options: DENY` と `X-Content-Type-Options: nosniff` をすべてのレスポンスに付与する

**Independent Test**: `curl -I http://localhost:3000/` で両ヘッダーが含まれていることを確認する

### Implementation for User Story 1

- [x] T004 [US1] `negotole/next.config.ts` に `headers()` async 関数を追加し、`source: '/(.*)'` に対して `X-Frame-Options: DENY` と `X-Content-Type-Options: nosniff` を設定する
- [x] T005 [US1] `pnpm tsc --noEmit` が通ることを確認し、開発サーバーで `curl -I http://localhost:3000/` を実行して両ヘッダーの存在を検証する

**Checkpoint**: User Story 1 完了 — クリックジャッキング・MIME スニッフィング防御が有効

---

## Phase 4: User Story 2 - 参照元情報の適切な制御（Priority: P2）

**Goal**: `Referrer-Policy: strict-origin-when-cross-origin` をすべてのレスポンスに付与する

**Independent Test**: `curl -I http://localhost:3000/` で `referrer-policy` ヘッダーが含まれていることを確認する

### Implementation for User Story 2

- [x] T006 [US2] `negotole/next.config.ts` の `headers()` に `Referrer-Policy: strict-origin-when-cross-origin` を追記する
- [x] T007 [US2] `pnpm tsc --noEmit` が通ることを確認し、`curl -I http://localhost:3000/` でヘッダーを検証する

**Checkpoint**: User Story 2 完了 — 外部サイトへの参照元情報が制御されている

---

## Phase 5: User Story 3 - ブラウザ機能へのアクセス制限（Priority: P3）

**Goal**: `Permissions-Policy` でカメラ・マイク・位置情報等を無効化する

**Independent Test**: `curl -I http://localhost:3000/` で `permissions-policy` ヘッダーが含まれていることを確認する

### Implementation for User Story 3

- [x] T008 [US3] `negotole/next.config.ts` の `headers()` に `Permissions-Policy: camera=(), microphone=(), geolocation=(), browsing-topics=()` を追記する
- [x] T009 [US3] `pnpm tsc --noEmit` が通ることを確認し、`curl -I http://localhost:3000/` でヘッダーを検証する

**Checkpoint**: User Story 3 完了 — 不要なブラウザ機能が無効化されている

---

## Phase 6: User Story 4 - コンテンツセキュリティポリシー（Priority: P4）

**Goal**: `Content-Security-Policy` ヘッダーで許可するコンテンツオリジンを明示する

**Independent Test**: ブラウザコンソールで CSP 違反エラーが出ないことを確認しながら、`curl -I http://localhost:3000/` でヘッダー存在を確認する

### Implementation for User Story 4

- [x] T010 [US4] `negotole/next.config.ts` の冒頭に CSP 文字列を定義する。本番用: `default-src 'self'; script-src 'self' 'unsafe-inline'; style-src 'self' 'unsafe-inline'; img-src 'self' blob: data:; font-src 'self'; object-src 'none'; base-uri 'self'; form-action 'self' https://accounts.google.com; frame-ancestors 'none'; upgrade-insecure-requests;` 開発用: `script-src` に `'unsafe-eval'` を追加（`process.env.NODE_ENV === 'development'` で切り替え）
- [x] T011 [US4] `headers()` の `source: '/(.*)'` に `Content-Security-Policy` ヘッダーを追記する（CSP 文字列の改行を除去して 1 行にする）
- [x] T012 [US4] `pnpm tsc --noEmit` が通ることを確認し、開発サーバーでブラウザを使って主要ページ（`/`・`/post/new`・`/admin`）を閲覧し、コンソールに CSP 違反が出ないことを確認する
- [x] T013 [US4] Google OAuth サインイン画面（`/api/auth/signin`）が CSP によってブロックされないことを確認する

**Checkpoint**: User Story 4 完了 — すべての 5 種類のセキュリティヘッダーが設定されている

---

## Phase 7: Polish & Cross-Cutting Concerns

**Purpose**: ドキュメント更新と最終確認

- [x] T014 [P] `docs/todo.md` の item #4（セキュリティヘッダー未設定）を対応済みとしてマークする（`（対応済み: specs/005-add-security-headers）` を追記）
- [x] T015 `pnpm test` を実行し、全テストが通過することを確認する
- [x] T016 `pnpm lint` を実行し、lint エラーがないことを確認する

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (Phase 1)**: すぐ開始可能
- **Foundational (Phase 2)**: Phase 1 完了後 — すべてのユーザーストーリーをブロック
- **US1 (Phase 3)**: Foundational 完了後
- **US2 (Phase 4)**: US1 完了後（同一ファイル編集のため順次実行）
- **US3 (Phase 5)**: US2 完了後（同一ファイル編集のため順次実行）
- **US4 (Phase 6)**: US3 完了後（同一ファイル編集のため順次実行）
- **Polish (Phase 7)**: US4 完了後

### User Story Dependencies

- **US1 (P1)**: Foundational 完了後、他 US に依存しない
- **US2 (P2)**: US1 完了後（`next.config.ts` の同一ファイルに追記するため）
- **US3 (P3)**: US2 完了後（同上）
- **US4 (P4)**: US3 完了後（同上）

### Parallel Opportunities

- T014（docs 更新）は T015・T016 と並列実行可能
- US1〜US4 は同一ファイル（`next.config.ts`）編集のため順次実行が必須

---

## Implementation Strategy

### MVP First（User Story 1 のみ）

1. Phase 1: 前提確認（T001）
2. Phase 2: proxy.ts 移行（T002, T003）
3. Phase 3: X-Frame-Options + X-Content-Type-Options 追加（T004, T005）
4. **STOP and VALIDATE**: curl でヘッダー確認
5. 問題なければ US2・US3・US4 へ続行

### Incremental Delivery

1. Setup + Foundational → proxy.ts 移行完了
2. US1 → クリックジャッキング防御（最高優先）
3. US2 → 参照元情報制御
4. US3 → ブラウザ機能制限
5. US4 → CSP 設定（最も慎重に）
6. Polish → docs 更新・最終確認

---

## Notes

- `next.config.ts` は US1〜US4 で同一ファイルを逐次更新するため、各 US の変更を順次マージする
- CSP の開発/本番切り替えは `process.env.NODE_ENV === 'development'` で制御する
- `proxy.ts` へのリネームは Git の `git mv` ではなくファイル作成 + 削除でも可（内容が同一であれば）
- `pnpm test` はインメモリモックを使用しているため、Upstash の接続なしで既存テストは通過する
