# Feature Specification: 本番環境 Server Components レンダーエラーの修正

**Feature Branch**: `008-fix-server-render-error`

**Created**: 2026-05-26

**Status**: Draft

**Input**: User description: "本番環境にて、installHook.js:1 Error: An error occurred in the Server Components render. The specific message is omitted in production builds to avoid leaking sensitive details. A digest property is included on this error instance which may provide additional details about the nature of the error.というエラーログが出ています。修正可能ですか？"

## User Scenarios & Testing *(mandatory)*

### User Story 1 - 本番環境でアプリが正常に表示される（Priority: P1）

ユーザーが本番環境の Negotole にアクセスした際、Server Components のレンダーエラーが発生せず、タイムラインや各ページが正常に表示される。

**Why this priority**: 現在の本番環境でエラーが発生しており、ユーザーがアプリを利用できない可能性がある最重要障害。

**Independent Test**: 本番環境（または本番相当のローカル環境）で `pnpm build && pnpm start` を実行し、主要ページへのアクセスがエラーなく成功することを確認する。

**Acceptance Scenarios**:

1. **Given** 本番環境のサーバーが起動している状態で、**When** ユーザーがトップページ（`/`）にアクセスする、**Then** Server Components のレンダーエラーなしにページが表示される
2. **Given** 本番環境のサーバーが起動している状態で、**When** 認証済みユーザーが投稿タイムラインにアクセスする、**Then** 投稿一覧がエラーなく表示される
3. **Given** 必須環境変数がすべて設定された状態で、**When** サーバーが起動する、**Then** 起動時エラーなく正常に起動する

---

### User Story 2 - エラー発生時に原因を特定できる（Priority: P2）

開発者が本番環境でエラーが発生した場合、エラーの digest 値や構造化されたログからエラーの原因を特定できる。

**Why this priority**: Next.js は本番環境でエラー詳細を意図的に隠す。問題の再発時に迅速に原因特定できる仕組みが必要。

**Independent Test**: 本番ビルドのログ出力に、エラー種別・発生箇所・原因を識別できる情報が含まれることを確認する。

**Acceptance Scenarios**:

1. **Given** Server Components でエラーが発生した場合、**When** サーバーログを確認する、**Then** エラーの種類・発生したコンポーネント・digest 値が記録されている
2. **Given** 環境変数が未設定の場合、**When** サーバーが起動を試みる、**Then** 不足している変数名とその影響が明示的なメッセージとしてログに出力される

---

### Edge Cases

- 環境変数がビルド時には存在するが実行時（サーバーレス関数の cold start 時）に存在しない場合
- データベース接続が成功するが認証設定が不正な場合
- 複数の Server Components が連鎖的にエラーを引き起こす場合
- `fetchPosts()` が DB 障害等で例外をスローした場合 → try/catch で空リストを返し、エラーをサーバーログに記録する（ユーザーには空タイムラインを表示）

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: 本番環境の主要ページ（`/`、`/admin` 等）がエラーなく表示されること
- **FR-002**: Server Components のレンダーエラーの根本原因を特定し修正すること
- **FR-003**: 必須環境変数がすべて本番環境（Vercel）に設定されていることを検証すること
- **FR-004**: `fetchPosts()` が例外をスローした場合、`page.tsx` は try/catch でエラーを補足し、空の投稿リスト（`{ posts: [], nextCursor: null }`）を返すこと。エラー内容は `console.error` でサーバーログに記録し、ユーザーには空のタイムラインを表示する（`src/app/error.tsx` は変更しない）
- **FR-005**: エラーログに、エラーの種別・発生箇所・digest 値が含まれること

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: 本番環境の主要ページで Server Components レンダーエラーが発生しない（エラー率 0%）
- **SC-002**: 本番ビルド（`pnpm build`）が警告なく完了する
- **SC-003**: エラー発生時に開発者がサーバーログから原因を 5 分以内に特定できる
- **SC-004**: 既存の 23 テストがすべてパスする（デグレなし）

## Assumptions

- 本番環境は Vercel にデプロイされており、Next.js Server Components を使用している
- エラーは直近のデプロイ（`007-add-env-validation` の `env.ts` 追加）と関連している可能性が高い
- Vercel の環境変数設定に7つの必須変数（AUTH_SECRET、AUTH_GOOGLE_ID、AUTH_GOOGLE_SECRET、DATABASE_URL、DATABASE_URL_UNPOOLED、UPSTASH_REDIS_REST_URL、UPSTASH_REDIS_REST_TOKEN）が設定されているはず
- エラーの根本原因は、環境変数の欠如・データベース接続失敗・認証設定の不正のいずれかと推測する

## Clarifications

### Session 2026-05-26

- Q: エラーはいつから発生しているか（直近のデプロイ後か、それ以前から） → A: 調査により判断（`007-add-env-validation` デプロイ後と仮定）
- Q: `fetchPosts()` が DB 障害等で例外をスローした場合、`page.tsx` はどう処理すべきか → A: Option A — try/catch で空の投稿リストを返し、エラーは console.error でログ記録（サイレントフォールバック）
