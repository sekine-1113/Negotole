# Feature Specification: セキュリティヘッダーの追加

**Feature Branch**: `005-add-security-headers`

**Created**: 2026-05-25

**Status**: Draft

**Input**: User description: "docs/todo.mdに記載のセキュリティヘッダー未設定の対応をしてください。"

## Clarifications

### Session 2026-05-25

- Q: `middleware.ts` → `proxy.ts` への移行はこの spec のスコープに含めますか？ → A: 同一 spec に含める（移行 + ヘッダー追加を一括実施）
- Q: `proxy.ts` 移行後の next-auth 呼び出し方式は？ → A: `export const proxy = auth(async (req) => {...})` 形式で維持（変更最小）

## User Scenarios & Testing *(mandatory)*

### User Story 1 - クリックジャッキング・コンテンツ盗用からの保護 (Priority: P1)

悪意あるサイトが Negotole のページを iframe に埋め込んでクリックジャッキング攻撃を行ったり、ブラウザがコンテンツタイプを誤って解釈してコンテンツインジェクション攻撃が発生するリスクを排除する。

**Why this priority**: クリックジャッキングとコンテンツタイプスニッフィングは既知の攻撃手法であり、ヘッダー追加だけで防御できる。ユーザーのアカウントと投稿データを守るために最優先で対応が必要。

**Independent Test**: 任意のページにアクセスしてレスポンスヘッダーを確認することで独立してテスト可能。

**Acceptance Scenarios**:

1. **Given** ブラウザが Negotole のページをリクエストする、**When** レスポンスを受け取る、**Then** `X-Frame-Options: DENY` ヘッダーが含まれている
2. **Given** ブラウザが Negotole のページをリクエストする、**When** レスポンスを受け取る、**Then** `X-Content-Type-Options: nosniff` ヘッダーが含まれている
3. **Given** 悪意あるサイトが Negotole を iframe に埋め込もうとする、**When** ブラウザがそのページを読み込む、**Then** ブラウザが iframe 表示をブロックする

---

### User Story 2 - 参照元情報の適切な制御 (Priority: P2)

ユーザーが外部リンクをクリックして Negotole を離れる際に、Referer ヘッダーで詳細な URL が外部サイトに送信されないようにする。

**Why this priority**: ユーザーのプライバシー保護に寄与する。実装はヘッダー 1 行で完結するため、P1 と同時に対応できる。

**Independent Test**: ブラウザの開発者ツールでレスポンスヘッダーを確認する。

**Acceptance Scenarios**:

1. **Given** ユーザーが Negotole のページから外部リンクをクリックする、**When** 外部サイトにリクエストが送られる、**Then** Referer はオリジンのみが送信され完全な URL は漏れない
2. **Given** ブラウザが Negotole のページをリクエストする、**When** レスポンスを受け取る、**Then** `Referrer-Policy: strict-origin-when-cross-origin` ヘッダーが含まれている

---

### User Story 3 - ブラウザ機能へのアクセス制限 (Priority: P3)

カメラ・マイク・位置情報など、Negotole が必要としないブラウザ機能へのアクセスを明示的に禁止し、悪意あるスクリプトやサードパーティが不必要な権限を取得できないようにする。

**Why this priority**: Negotole はテキスト投稿 SNS であり、メディア系 API は一切使用しない。明示的な制限によりセキュリティの深さが増す。

**Independent Test**: ブラウザの開発者ツールでレスポンスヘッダーを確認する。

**Acceptance Scenarios**:

1. **Given** ブラウザが Negotole のページをリクエストする、**When** レスポンスを受け取る、**Then** `Permissions-Policy` ヘッダーが含まれており、カメラ・マイク・位置情報が無効化されている

---

### User Story 4 - コンテンツセキュリティポリシー（CSP）の設定 (Priority: P4)

許可されていないオリジンからのスクリプト・スタイル・画像の読み込みを禁止し、XSS 攻撃のリスクを低減する。

**Why this priority**: CSP は設定ミスによって正規コンテンツを壊すリスクがあるため、他のヘッダーより後に慎重に設定する。

**Independent Test**: ブラウザのコンソールで CSP 違反レポートが出ないことを確認しながら、不正スクリプトのインジェクションを試みる。

**Acceptance Scenarios**:

1. **Given** ページが読み込まれる、**When** 未許可のオリジンからスクリプトを実行しようとする、**Then** ブラウザがブロックし CSP 違反をコンソールに表示する
2. **Given** 正規の Next.js アプリが動作している、**When** ページを閲覧する、**Then** CSP 違反エラーが発生せず正常に表示される

---

### User Story 5 - middleware.ts から proxy.ts への移行 (Priority: P0)

Next.js 16 で非推奨となった `middleware.ts` ファイルを `proxy.ts` に移行し、既存の認証・レート制限ロジックを維持しながら将来のバージョンアップに対応する。

**Why this priority**: P0（前提条件）。セキュリティヘッダーの一部を proxy.ts 内に統合するため、移行が先決。非推奨のままでは将来の破壊的変更リスクがある。

**Independent Test**: アプリを起動し、認証・レート制限が移行前と同一動作することを確認する。

**Acceptance Scenarios**:

1. **Given** `proxy.ts` が `middleware.ts` に代わって配置されている、**When** 認証が必要なページにアクセスする、**Then** 認証リダイレクトが正常に動作する
2. **Given** `proxy.ts` が配置されている、**When** レート制限を超えたリクエストを送信する、**Then** 429 レスポンスが返る
3. **Given** `middleware.ts` が削除されている、**When** `pnpm build` を実行する、**Then** ビルドエラーが発生しない

---

### Edge Cases

- CSP で Next.js の inline スクリプト（`_NEXT_DATA_` など）が誤ってブロックされないか
- 開発環境と本番環境で CSP の設定が異なる場合の対処
- 既存の Google OAuth（サインイン画面）が CSP によって壊れないか
- `proxy.ts` 移行後に既存の next-auth セッション取得が正常に動作するか

## Requirements *(mandatory)*

### Functional Requirements

- **FR-000**: `middleware.ts` を `proxy.ts` に移行し、既存の認証・レート制限ロジックを維持すること（Next.js 16 の非推奨対応）
- **FR-001**: すべてのページレスポンスに `X-Frame-Options: DENY` ヘッダーを含め、iframe 埋め込みを禁止すること
- **FR-002**: すべてのページレスポンスに `X-Content-Type-Options: nosniff` ヘッダーを含め、MIME タイプスニッフィングを防止すること
- **FR-003**: すべてのページレスポンスに `Referrer-Policy: strict-origin-when-cross-origin` ヘッダーを含め、外部への参照元情報送信を制限すること
- **FR-004**: すべてのページレスポンスに `Permissions-Policy` ヘッダーを含め、不要なブラウザ機能（カメラ・マイク・位置情報等）を無効化すること
- **FR-005**: すべてのページレスポンスに `Content-Security-Policy` ヘッダーを含め、許可するコンテンツオリジンを明示すること
- **FR-006**: CSP 設定は、Next.js の正常動作（静的アセット・SSR・Google OAuth）を妨げないこと
- **FR-007**: セキュリティヘッダーは API エンドポイント（`/api/*`）のレスポンスにも適用されること

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-000**: `proxy.ts` が `middleware.ts` の機能（認証チェック・レート制限）を完全に引き継ぎ、既存テストが通過する
- **SC-001**: 主要ページ（`/`、`/post/new`、`/admin`）のレスポンスヘッダーに定義された 5 種類のセキュリティヘッダーがすべて含まれている
- **SC-002**: 既存機能（ログイン・投稿・タイムライン閲覧・管理者画面）が CSP 適用後も正常に動作する
- **SC-003**: `pnpm build` および `pnpm test` が引き続き通過する
- **SC-004**: securityheaders.com などのスキャンツールで A 評価以上を取得できる

## Assumptions

- セキュリティヘッダーはサーバーの HTTP レスポンスヘッダーとして設定し、HTML の `<meta>` タグではなくヘッダーレベルで定義する
- `X-Frame-Options` は `DENY`（すべての iframe 埋め込みを禁止）を採用する
- CSP の `script-src` では `unsafe-eval` を禁止し（開発環境除く）、`unsafe-inline` は Next.js ハイドレーションのため許容する
- Google OAuth によるリダイレクトのため `form-action` に `https://accounts.google.com` を許可する
- Negotole は外部フォントや CDN からの画像を使用していないため、`font-src` と `img-src` は自オリジンのみに制限できる
- `proxy.ts` への移行では `export const proxy = auth(async (req) => {...})` の形式を維持し、変更量を最小に抑える
