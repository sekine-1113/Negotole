# Feature Specification: 構造化ログ・監査ログ・管理者投稿削除機能

**Feature Branch**: `018-logging-audit-admin-delete`

**Created**: 2026-06-07

**Status**: Draft

**Input**: `docs/production-logging-design.md` フェーズ1・フェーズ2（Vercel Log Drains 除く）

## User Scenarios & Testing *(mandatory)*

### User Story 1 — アプリケーションの動作ログを構造化して記録する (Priority: P1)

開発者・運用者として、ログイン・投稿・エラーなどのイベントが構造化された形式で記録されることで、本番で発生した問題を迅速に特定・調査できることを求める。

**Why this priority**: 現状は非構造化の `console.error` のみで本番ログが追いにくい。構造化ログはすべての他の監査機能の基盤となるため最初に整える必要がある。

**Independent Test**: ログイン・投稿・エラー各イベントが `{ ts, level, event, ... }` の JSON 形式で出力されることをローカルで確認できる。

**Acceptance Scenarios**:

1. **Given** ユーザーがログインする、**When** 認証処理が完了する、**Then** `auth.login.success` イベントが userId・provider を含む JSON 形式で記録される
2. **Given** ユーザーが投稿を作成する、**When** 投稿処理が完了する、**Then** `post.created` イベントが userId・postId を含む JSON 形式で記録される
3. **Given** API でエラーが発生する、**When** エラー処理が行われる、**Then** `api.error` イベントがエラー内容を含む JSON 形式で記録される
4. **Given** ポイント付与が実行される、**When** 付与が成功・失敗する、**Then** 結果が JSON 形式で記録される

---

### User Story 2 — ログイン時のIPアドレスを法的証跡として記録する (Priority: P2)

運用者として、ユーザーがいつどこからログインしたかをデータベースに保存することで、発信者情報開示請求や警察の捜査照会に対応できることを求める。

**Why this priority**: プロトタイプの本番公開前に、プロバイダ責任制限法の要件を満たす最低限の証跡を確保する必要がある。

**Independent Test**: ログイン後にデータベースを確認し、`login_log` テーブルに userId・IPアドレス・User-Agent・ログイン日時が記録されていることを確認できる。

**Acceptance Scenarios**:

1. **Given** ユーザーがゲストログインする、**When** ログイン処理が完了する、**Then** `login_log` テーブルにIPアドレスと日時が記録される
2. **Given** ユーザーが Google アカウントでログインする、**When** ログイン処理が完了する、**Then** `login_log` テーブルにIPアドレスと日時が記録される
3. **Given** ログイン記録が蓄積される、**When** 発信者情報開示請求が来る、**Then** 対象ユーザーのログイン履歴を照会できる

---

### User Story 3 — 管理者操作を監査ログとして記録する (Priority: P2)

運用者として、管理者がキャンペーンに対して行った操作（作成・更新・削除）が記録されることで、誰がいつ何を変更したかを事後に追跡できることを求める。

**Why this priority**: 管理者の誤操作や不正変更を後から確認できる仕組みが本番運用に必要。

**Independent Test**: 管理者がキャンペーンを作成・更新・削除した後に `admin_audit_log` テーブルを確認し、操作内容・管理者ID・日時が記録されていることを確認できる。

**Acceptance Scenarios**:

1. **Given** 管理者がキャンペーンを作成する、**When** 作成が完了する、**Then** `admin_audit_log` に `campaign.create` イベントと操作内容が記録される
2. **Given** 管理者がキャンペーンを更新する、**When** 更新が完了する、**Then** `admin_audit_log` に `campaign.update` イベントが記録される
3. **Given** 管理者がキャンペーンを削除する、**When** 削除が完了する、**Then** `admin_audit_log` に `campaign.delete` イベントが記録される

---

### User Story 4 — 管理者が問題のある投稿を削除できる (Priority: P2)

管理者として、誹謗中傷や不適切な投稿を発見した際に、管理画面から当該投稿を削除できることを求める。削除後も投稿データはデータベースに残り、法的証跡として保持される。

**Why this priority**: 本番公開後のコンテンツモデレーション手段として、管理者用削除機能が必要。通報対応・開示請求対応にも使われる。

**Independent Test**: 管理者が管理画面から特定の投稿を削除操作したとき、タイムラインから該当投稿が消え、かつデータベースには `deleted_at` が設定された状態でレコードが残ることを確認できる。

**Acceptance Scenarios**:

1. **Given** 管理者が不適切な投稿を発見する、**When** 管理者が削除ボタンを押し確認ダイアログで削除を確定する、**Then** その投稿がタイムラインに表示されなくなる
2. **Given** 管理者が投稿を削除する、**When** データベースを確認する、**Then** 投稿レコードの `deleted_at` に削除日時が設定されており、内容は保持されている（論理削除）
3. **Given** 管理者が投稿を削除する、**When** 削除処理が完了する、**Then** `admin_audit_log` に `post.delete` イベント・対象投稿ID・管理者IDが記録される

---

### Edge Cases

- ログ記録に失敗してもメイン処理（ログイン・投稿・管理操作）は継続する（ログのサイレント失敗）
- IPアドレスが取得できない場合（プロキシ環境等）は null として記録する
- 管理者が既に削除済みの投稿を再度削除しようとしたときは適切なエラーを返す
- `admin_audit_log` への書き込みに失敗した場合、投稿削除はロールバックされ管理者にエラーが返る（`login_log` 等の構造化ログ失敗とは異なる扱い）
- ログイン記録は毎回新規レコードとして追加し、上書きしない（複数デバイスからのログインもすべて記録）

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: イベントを `{ ts, level, event, ...data }` の JSON 形式で出力する共通ログ関数を設ける
- **FR-002**: 認証処理（ログイン成功・失敗・ポイント付与）のログを構造化形式に移行する
- **FR-003**: 投稿作成・ポイント不足のログを構造化形式に移行する
- **FR-004**: API エラーのログを構造化形式に移行する
- **FR-005**: 初回サインイン時（Google OAuth または Credentials による新規ログイン）に userId・IPアドレス・User-Agent・日時をデータベースに記録する。セッショントークンの更新時は記録しない
- **FR-006**: 管理者操作（キャンペーン作成・更新・削除）をデータベースの監査ログテーブルに記録する
- **FR-007**: 管理者が管理画面から投稿を削除できる。一覧には期限切れを含む全投稿（論理削除済みは除く）を表示する
- **FR-008**: 投稿削除は論理削除（`deleted_at` に日時を設定）とし、投稿内容はデータベースに保持する
- **FR-009**: 投稿削除時に `admin_audit_log` テーブルへの記録を行う
- **FR-010**: 構造化ログ（`console.log` 出力）の失敗はサイレントに処理し、メイン機能に影響を与えない
- **FR-011**: 投稿削除時の `admin_audit_log` 書き込みは例外なし。書き込みが失敗した場合は投稿削除（`deleted_at` 更新）をロールバックし、管理者にエラーを返す

### Key Entities

- **StructuredLog**: JSON 形式のアプリケーションログ。`ts`・`level`・`event` を必須フィールドとして持つ
- **LoginLog（新規）**: ログイン履歴。`userId`・`ipAddress`（String/TEXT、IPv4・IPv6）・`userAgent`・`createdAt` を持つ。レコードは3年間保持
- **AdminAuditLog（新規）**: 管理者操作ログ。`adminId`・`action`・`targetType`・`targetId`・`payload`（JSON、操作後の主要フィールド）・`ipAddress`（String/TEXT、IPv4・IPv6）・`createdAt` を持つ。レコードは3年間保持

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: ログイン・投稿・エラーの各イベントが JSON 形式で出力され、ローカルでログの内容を確認できる
- **SC-002**: ログイン後に `login_log` テーブルを確認し、当該ユーザーのログイン記録が存在する
- **SC-003**: 管理者がキャンペーンを操作した後に `admin_audit_log` テーブルを確認し、操作記録が存在する
- **SC-004**: 管理者が投稿を削除した後、タイムラインから消えているが DB に `deleted_at` 付きでレコードが残っている
- **SC-005**: ログ記録が失敗しても、ログイン・投稿・管理操作の本来の処理は成功する

## Clarifications

### Session 2026-06-07

- Q: `login_log` を記録するタイミングはいつか？ → A: 初回サインイン時のみ（JWT コールバックで `profile`（Google）または `user`（ゲスト）が存在する場合に限定し、トークン更新時は記録しない）
- Q: 投稿管理画面に表示する投稿の範囲は？ → A: 全投稿（期限切れ含む、論理削除済みは除く）
- Q: `login_log` および `admin_audit_log` の保持期間は？ → A: 3年保持（発信者情報開示請求対応を考慮）
- Q: `admin_audit_log` 書き込み失敗時の投稿削除の扱いは？ → A: ロールバック（監査ログ書き込み失敗時は削除もキャンセルする）
- Q: `admin_audit_log` の `payload` フィールドに格納する内容は？ → A: 操作後の状態の主要フィールドのみ（例: キャンペーン操作は `{ campaignId, title }`、投稿削除は `{ postId }`）
- Q: 管理者投稿削除時の確認ダイアログは必要か？ → A: 表示する（"この投稿を削除しますか？" の確認ダイアログを挟む）
- Q: `ipAddress` フィールドのデータ型は？ → A: `String`（TEXT）— IPv4・IPv6 を文字列としてそのまま格納

### Non-Functional Requirements（追記）

- **NFR-001**: `login_log` および `admin_audit_log` のレコードは記録日から3年間保持する（発信者情報開示請求・警察照会への対応期間として設定）

## Assumptions

- Vercel Log Drains は今回のスコープ外（有料のため）。ログは `console.log` を通じて Vercel の標準ログ（7日間保持）に出力する
- IPアドレスは `x-forwarded-for` リクエストヘッダーから取得する（Vercel 経由）
- 管理者投稿削除は管理画面（`/admin`）に新しいページまたは既存ページに機能を追加する形で実装する
- 削除対象の投稿の特定には投稿ID を使用する
- 投稿削除機能は管理者ロールのみがアクセスできる
- 投稿のタイムライン表示は既存の `hiddenAt` フィルタに加え、`deleted_at IS NULL` フィルタをすでに使用しているため、論理削除すれば自動的に非表示になる（既存動作を確認する）
