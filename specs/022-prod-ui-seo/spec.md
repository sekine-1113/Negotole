# Feature Specification: 本番公開 UI/SEO 整備（OGP・404・robots/sitemap・凍結レイアウト）

**Feature Branch**: `022-prod-ui-seo`

**Created**: 2026-06-07

**Status**: Draft

**Input**: docs/prod-deploy-tasks.md の #3, #5, #6, #9 を対応する

## User Scenarios & Testing *(mandatory)*

### User Story 1 - OGP・ソーシャルカードの設定 (Priority: P1)

SNS（X / LINE / Slack など）でサービス URL がシェアされたとき、サービス名・説明・OGP 画像が正しく表示される。

**Why this priority**: SNS シェアは新規ユーザー獲得の主要経路。OGP 未設定のままだと URL だけが表示され、クリック率が著しく低下する。プロトタイプ公開前に必須。

**Independent Test**: SNS や OGP 確認ツール（例: Card Validator）でサービス URL を入力し、画像・タイトル・説明が正しく表示されること。

**Acceptance Scenarios**:

1. **Given** X（旧 Twitter）のポストに negotole の URL が貼られている、**When** カードが展開される、**Then** サービス名・説明文・1200×630px の OGP 画像が表示される
2. **Given** LINE や Slack で URL がシェアされる、**When** リンクプレビューが生成される、**Then** サービス名と OGP 画像が表示される
3. **Given** OGP 画像ファイルが存在しない、**When** SNS がカードを取得しようとする、**Then** 画像なしのカードが表示される（クラッシュしない）

---

### User Story 2 - 存在しないページへのアクセス（カスタム 404）(Priority: P1)

ユーザーが存在しない URL にアクセスしたとき、サービスのデザインに合った 404 ページが表示され、トップページに戻れる。

**Why this priority**: デフォルトの白い 404 ページはダークテーマのサービスと視覚的に断絶し、ユーザーが離脱しやすくなる。ブランド一貫性のためプロトタイプ公開前に対応する。

**Independent Test**: 存在しないパス（例: `/xyz-invalid`）にアクセスし、ダークテーマのカスタム 404 ページとトップへのリンクが表示されること。

**Acceptance Scenarios**:

1. **Given** ユーザーが存在しない URL にアクセスする、**When** ページが表示される、**Then** ダークテーマのデザインに合った 404 メッセージが表示される
2. **Given** カスタム 404 ページが表示されている、**When** ユーザーがトップへのリンクをクリックする、**Then** トップページに遷移する
3. **Given** ログインしていないユーザーが存在しないパスにアクセスする、**When** ページが表示される、**Then** ログイン状態に関わらず 404 ページが正しく表示される

---

### User Story 3 - 検索エンジン向け robots / sitemap の設定 (Priority: P2)

検索エンジンがサービスをクロールするとき、管理者ページ・マイページ・API エンドポイントなどの非公開ページがインデックスされず、公開ページだけが適切にインデックスされる。

**Why this priority**: `/admin/*` や `/mypage` が検索結果に露出することはプライバシー・セキュリティ上のリスク。プロトタイプ公開後すぐに対応が必要。

**Independent Test**: `/robots.txt` にアクセスし、非公開パスが Disallow されていること。`/sitemap.xml` に公開ページの URL が列挙されていること。

**Acceptance Scenarios**:

1. **Given** 検索エンジンが `/robots.txt` を取得する、**When** ルールを読む、**Then** `/admin/`・`/mypage`・`/account-suspended`・`/api/` が Disallow されている
2. **Given** 検索エンジンが `/sitemap.xml` を取得する、**When** URL リストを読む、**Then** `/`・`/terms`・`/privacy`・`/contact` が含まれている
3. **Given** `/sitemap.xml` が存在する、**When** 検索エンジンがアクセスする、**Then** 投稿 URL は含まれていない（揮発するコンテンツのため）

---

### User Story 4 - アカウント凍結ページのレイアウト分離 (Priority: P2)

凍結されたユーザーがアカウント停止ページ（`/account-suspended`）を見るとき、ナビゲーション要素（ヘッダー・ボトムナビ・FAB ボタン）が表示されず、停止状態であることが明確に伝わる。

**Why this priority**: 現状は root layout を引き継ぐため、凍結ユーザーにもナビゲーションが表示される。クリックしても proxy でリダイレクトされるだけで UX が混乱しやすい。

**Independent Test**: テストアカウントを凍結した状態で `/account-suspended` を開き、Header・BottomNav・FAB が表示されないことを確認する。

**Acceptance Scenarios**:

1. **Given** アカウントが凍結されたユーザーが `/account-suspended` を表示する、**When** ページが読み込まれる、**Then** Header・BottomNav・FAB ボタンが一切表示されない
2. **Given** 凍結ページが最小限のレイアウトで表示される、**When** ユーザーがサインアウトボタンを押す、**Then** サインアウトが正常に実行され、ログインページへ遷移する
3. **Given** 非凍結ユーザーが `/account-suspended` に直接アクセスする、**When** ページが表示される、**Then** 停止メッセージのみが表示される（ナビなし）

---

### Edge Cases

- OGP 画像（`/og-image.png`）が存在しない場合、SNS カードは画像なしで表示されること（クラッシュしない）
- `/robots.txt` の Disallow はサブパスにも適用されること（例: `/admin/users` も対象）
- sitemap に含まれるドメインは本番 URL であること（`localhost` や Preview URL を含まない）
- `account-suspended` レイアウトからはサインアウト以外のナビゲーション操作ができないこと

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: OGP メタタグ（`og:title`・`og:description`・`og:image`・`og:url`・`twitter:card` 等）がすべてのページに設定されなければならない
- **FR-002**: OGP 画像ファイル（1200×630px）が `/og-image.png` として配信されなければならない
- **FR-003**: 存在しないパスへのアクセスでは、ダークテーマのカスタム 404 ページが表示されなければならない
- **FR-004**: カスタム 404 ページにはトップページへの導線が含まれなければならない
- **FR-005**: `/robots.txt` が提供され、`/admin/`・`/mypage`・`/account-suspended`・`/api/` の各パスが Disallow されなければならない
- **FR-006**: `/sitemap.xml` が提供され、公開ページ（`/`・`/terms`・`/privacy`・`/contact`）が列挙されなければならない
- **FR-007**: `/account-suspended` ページは、root layout の Header・BottomNav・FAB を表示しない独立したレイアウトで表示されなければならない
- **FR-008**: `/account-suspended` からサインアウト機能は引き続き動作しなければならない

### Key Entities

- **OGP 画像**: 静的アセット（1200×630px PNG）、サービス全体の OGP カードに使用
- **sitemap エントリ**: URL、変更頻度（公開静的ページのみ）

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: X / LINE / Slack で negotole の URL をシェアしたとき、OGP 画像・タイトル・説明が表示される
- **SC-002**: 存在しない URL にアクセスしたとき、ダークテーマの 404 ページとトップへのリンクが表示される（デフォルトの白い 404 ページは表示されない）
- **SC-003**: `/robots.txt` に `/admin/`・`/mypage`・`/account-suspended`・`/api/` の Disallow エントリが存在する
- **SC-004**: `/sitemap.xml` に `/`・`/terms`・`/privacy`・`/contact` の 4 件が含まれ、投稿 URL・管理者 URL は含まれない
- **SC-005**: 凍結ユーザーが `/account-suspended` を表示したとき、Header・BottomNav・FAB が表示されない

## Assumptions

- OGP 画像はシンプルなテキスト画像（サービス名 + キャッチコピー「儚く消える、夜のつぶやき」）で代替可能。デザイン品質は後回しでよい
- OGP および SNS カードの description テキストは「儚く消える、夜のつぶやき」を使用する
- サービスの本番ドメインは環境変数（`NEXT_PUBLIC_APP_URL`）から取得する。本番 URL は `https://negotole.vercel.app`
- sitemap は静的ページのみを列挙し、投稿（動的・揮発コンテンツ）は含めない
- `account-suspended` レイアウトは既存の `page.tsx` のサインアウトアクションを維持する
- 非凍結ユーザーが直接 `/account-suspended` にアクセスした場合の proxy 制御はスコープ外

## Clarifications

### Session 2026-06-07

- Q: OGP の SNS カードに表示する description テキスト（サービスのキャッチコピー）は何にするか？ → A: 「儚く消える、夜のつぶやき」
