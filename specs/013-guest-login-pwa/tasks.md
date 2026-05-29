# Tasks: ゲストログイン限定化 & PWA対応

**Input**: Design documents from `/specs/013-guest-login-pwa/`

**Prerequisites**: plan.md ✅, spec.md ✅, research.md ✅, data-model.md ✅

**Tests**: テスト自動化は要件に含まれていないため省略（手動検証タスクを最終フェーズに含む）

**Organization**: タスクはユーザーストーリー単位で整理。US1（ゲストログイン）と US2（PWA）は完全独立。

## Format: `[ID] [P?] [Story] Description`

- **[P]**: 並列実行可（異なるファイル、依存なし）
- **[Story]**: 対応するユーザーストーリー（US1, US2）

---

## Phase 1: Setup

**Purpose**: ビルドベースラインを確認し、実装前の状態を保証する

- [x] T001 negotole/ で `pnpm build` を実行し現在のビルドがエラーなく通ることを確認する

**Checkpoint**: ベースライン確認完了 — US1・US2 の実装を開始できる

---

## Phase 2: Foundational（なし）

US1 と US2 は完全に独立しており、DB スキーマ変更・新規パッケージ追加も不要。Phase 1 完了後すぐに両ストーリーの実装に入れる。

---

## Phase 3: User Story 1 — ゲストとしてサービスを利用する (Priority: P1) 🎯 MVP

**Goal**: Googleログインボタンを非表示にし、「ゲストとしてログイン」ボタンのみを表示。ゲストとしてタイムラインにアクセスできる。

**Independent Test**: ブラウザでログイン画面を開き、Googleボタンが消えてゲストボタンのみ表示されること、タップ後タイムラインへ遷移することを確認。

### Implementation for User Story 1

- [x] T002 [US1] `negotole/src/lib/auth.ts` に Credentials プロバイダーを追加する。`import Credentials from "next-auth/providers/credentials"` を追加し、`providers` 配列に `Credentials({ credentials: {}, async authorize() { const [guest] = await db.insert(users).values({ name: "ゲスト" }).returning({ id: users.id, role: users.role }); return { id: String(guest.id), name: "ゲスト", role: guest.role }; } })` を追加する
- [x] T003 [US1] `negotole/src/lib/auth.ts` の `jwt` コールバックを更新する。`profile?.email` のブランチの後に `else if (user?.id) { token.userId = Number(user.id); token.role = user.role as string; }` ブランチを追加してゲストセッションの userId をセットする（T002 完了後に実施）
- [x] T004 [US1] `negotole/src/components/Header.tsx` を更新する。Google の `signIn("google", ...)` フォームを削除し、代わりに `signIn("credentials", { redirectTo: "/" })` を呼ぶゲストログインフォームを追加する。ボタンラベルは「ゲストとしてログイン」、スタイルは既存の「Google でログイン」ボタンと同じグラデーション（T003 完了後に実施）

**Checkpoint**: US1 完了 — ゲストとしてのログインとタイムライン閲覧が機能する

---

## Phase 4: User Story 2 — スマートフォンにアプリとしてインストールする (Priority: P2)

**Goal**: PWA マニフェスト・サービスワーカー・アイコンを設置し、ブラウザの「ホームに追加」でインストール可能にする。インストール後はスタンドアローンモードで起動する。

**Independent Test**: Chrome DevTools > Application > Manifest でマニフェストが正常に読み込まれること、Lighthouse の PWA 監査をパスすることを確認。

### Implementation for User Story 2

- [x] T005 [P] [US2] `negotole/src/app/manifest.ts` を新規作成する。`MetadataRoute.Manifest` 型を使い、name="negotole"、short_name="negotole"、description="儚く消える、夜のつぶやき"、start_url="/"、display="standalone"、background_color="#0b0f19"、theme_color="#6366f1"、icons に `/icons/icon-192x192.png`（192x192）と `/icons/icon-512x512.png`（512x512）を設定する
- [x] T006 [P] [US2] `negotole/public/icons/` ディレクトリを作成し、192x192 と 512x512 の PNG アイコンを生成して配置する。デザインはインディゴ（#6366f1）〜パープル（#9333ea）グラデーションの円形背景に白い「N」文字。Node.js スクリプト（`scripts/generate-icons.mjs`）またはシンプルなバイナリ書き込みで PNG ファイルを生成し `negotole/public/icons/icon-192x192.png` と `negotole/public/icons/icon-512x512.png` として保存する
- [x] T007 [P] [US2] `negotole/public/sw.js` を新規作成する。`install` イベントで `skipWaiting()` を呼び、`activate` イベントで古いキャッシュを削除し、`fetch` イベントで `/_next/static/` と `/icons/` パスへのリクエストに Cache-first 戦略（キャッシュヒット → キャッシュ返却、ミス → fetch してキャッシュ保存）を適用する。それ以外のリクエストはキャッシュせずネットワークに委譲する
- [x] T008 [P] [US2] `negotole/src/components/ServiceWorkerRegistrar.tsx` を新規作成する。`"use client"` ディレクティブを付け、`useEffect` 内で `'serviceWorker' in navigator` を確認後に `navigator.serviceWorker.register('/sw.js', { scope: '/', updateViaCache: 'none' })` を呼ぶ。コンポーネントは `null` をレンダリングする
- [x] T009 [US2] `negotole/src/app/layout.tsx` を更新する。`ServiceWorkerRegistrar` コンポーネントを import し、`<body>` 内（既存コンテンツの後）に `<ServiceWorkerRegistrar />` を追加する（T008 完了後に実施）
- [x] T010 [P] [US2] `negotole/next.config.ts` の `headers()` 関数に `/sw.js` 専用ルールを追加する。`source: "/sw.js"` として `Content-Type: application/javascript; charset=utf-8`、`Cache-Control: no-cache, no-store, must-revalidate`、`Content-Security-Policy: default-src 'self'; script-src 'self'` の3ヘッダーを設定する

**Checkpoint**: US2 完了 — PWA マニフェストが配信され、サービスワーカーが登録される

---

## Phase 5: Polish & Cross-Cutting Concerns

**Purpose**: ビルド確認と手動検証

- [x] T011 negotole/ で `pnpm build` を実行し TypeScript 型チェックとビルドが成功することを確認する
- [ ] T012 ブラウザで動作確認する。未ログイン状態でアクセスし、Googleログインボタンが表示されないこと・ゲストログインボタンが表示されること・タップ後にタイムラインへ遷移することを確認する
- [ ] T013 Chrome DevTools の Application タブで PWA を確認する。Manifest セクションでアイコント・名前・display が正しく表示されること、Service Workers セクションで sw.js が登録されていることを確認する

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (Phase 1)**: 依存なし — 即開始可能
- **US1 (Phase 3)**: Phase 1 完了後に開始
- **US2 (Phase 4)**: Phase 1 完了後に開始（US1 と並行可）
- **Polish (Phase 5)**: US1・US2 の必要な部分が完了した後

### User Story Dependencies

- **US1 (P1)**: T002 → T003 → T004 の順（同一ファイル変更のため逐次）
- **US2 (P2)**: T005・T006・T007・T008・T010 は並列可、T009 は T008 完了後

### Within Each User Story

- US1: auth.ts の Credentials 追加 → JWT コールバック更新 → Header.tsx 変更
- US2: マニフェスト・アイコン・SW・Registrar コンポーネントは並列 → layout.tsx に Registrar 追加

### Parallel Opportunities

- T005, T006, T007, T008, T010: すべて異なるファイルで US2 内並列実行可
- US1 全体と US2 全体: 異なるファイルのため並列実行可（T002〜T004 と T005〜T010 を同時進行可）

---

## Parallel Example: User Story 2

```bash
# US2 内で並列実行できるタスク（T009 は T008 完了後）:
Task: T005 "Create negotole/src/app/manifest.ts"
Task: T006 "Create negotole/public/icons/ and PNG icons"
Task: T007 "Create negotole/public/sw.js service worker"
Task: T008 "Create negotole/src/components/ServiceWorkerRegistrar.tsx"
Task: T010 "Add /sw.js headers to negotole/next.config.ts"
# 以下は T008 完了後:
Task: T009 "Update negotole/src/app/layout.tsx"
```

---

## Implementation Strategy

### MVP First (User Story 1 Only)

1. Phase 1: ビルド確認
2. Phase 3 (US1): ゲストログイン実装（T002 → T003 → T004）
3. **STOP and VALIDATE**: ゲストログインが機能することを確認
4. デモ可能な状態

### Incremental Delivery

1. Phase 1: ベースライン確認
2. US1 完了 → ゲストログイン動作 → MVP リリース可
3. US2 完了 → PWA インストール対応 → エンゲージメント向上
4. Polish: ビルド・手動検証

---

## Notes

- [P] タスクは異なるファイルを扱い依存なし（並列実行可）
- US1 の T002・T003 は同一ファイル（auth.ts）のため逐次実行
- DB スキーマ変更なし（マイグレーション不要）
- 新規 npm パッケージ追加なし
- 既存 Google セッションは維持（バックエンドは変更しない）
- T006 の PNG アイコン生成: Node.js スクリプトで SVG→PNG 変換または最小 PNG バイナリ直接生成で対応
