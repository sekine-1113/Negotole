# Feature Specification: 管理者キャンペーン一覧のページネーション

**Feature Branch**: `015-admin-campaigns-pagination`

**Created**: 2026-06-06

**Status**: Draft

**Input**: `docs/claude_todo.md` #17 — `GET /api/admin/campaigns` にページネーションなし

## User Scenarios & Testing *(mandatory)*

### User Story 1 - キャンペーン一覧を分割して閲覧する (Priority: P1)

管理者として、キャンペーン一覧画面に多数のキャンペーンが蓄積された場合も、ページ単位で素早く閲覧できることを求める。

**Why this priority**: 全件取得では運用期間が長くなるにつれ応答が遅くなり、管理者の操作性が低下する。ページネーションはその根本解決となる。

**Independent Test**: キャンペーンが 30 件以上存在する状態で `/admin/campaigns` を開き、最初のページに件数上限のみが表示され、次のページへ移動できることを確認する。

**Acceptance Scenarios**:

1. **Given** キャンペーンが 30 件存在する、**When** 管理者が `/admin/campaigns` を開く、**Then** 先頭から 20 件が表示され「次のページ」へのナビゲーションが表示される
2. **Given** 1ページ目を表示している、**When** 管理者が「次のページ」をクリックする、**Then** 残りのキャンペーンが表示される
3. **Given** 最終ページを表示している、**When** 管理者が画面を確認する、**Then** 「次のページ」ナビゲーションが非表示または無効になる
4. **Given** キャンペーンが 0 件、**When** 管理者が一覧を開く、**Then** 「キャンペーンがありません」というメッセージが表示される

---

### User Story 2 - API 経由でページネーション付きキャンペーン一覧を取得する (Priority: P2)

開発者・外部ツールとして、`GET /api/admin/campaigns` に `limit` と `cursor` パラメータを指定することで、任意のページのデータを取得できることを求める。

**Why this priority**: API のページネーション対応が先に必要で、UI はその上に構築される。API 単体でも動作確認可能。

**Independent Test**: `curl` で `GET /api/admin/campaigns?limit=10` を実行し、最大 10 件のキャンペーンと次ページ用カーソルが含まれるレスポンスが返ることを確認する。

**Acceptance Scenarios**:

1. **Given** キャンペーンが 25 件存在する、**When** `GET /api/admin/campaigns?limit=10` を実行する、**Then** 10 件のキャンペーンと `nextCursor` が返る
2. **Given** 前のレスポンスで `nextCursor` を取得した、**When** `GET /api/admin/campaigns?limit=10&cursor=<nextCursor>` を実行する、**Then** 次の 10 件が返る
3. **Given** 最後のページを取得した、**When** レスポンスを確認する、**Then** `nextCursor` が `null` で返る
4. **Given** `limit` パラメータを省略した、**When** API を呼び出す、**Then** デフォルトの件数（20 件）で結果が返る
5. **Given** 管理者以外のユーザーがアクセスした、**When** API を呼び出す、**Then** 403 Forbidden が返る

---

### Edge Cases

- `limit` に負の値や非整数が指定された場合はデフォルト値（20 件）にフォールバックする
- `cursor` に無効な値が指定された場合は 400 Bad Request を返す
- キャンペーンの作成・削除がページ閲覧中に発生した場合、次ページに重複または欠落が生じる可能性があるが、管理画面の性質上許容する

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: `GET /api/admin/campaigns` は `limit`（整数、省略時20、最大100）と `cursor`（不透明なカーソル文字列、省略時は先頭から）クエリパラメータを受け付ける
- **FR-002**: レスポンスに `campaigns`（配列）と `nextCursor`（次ページカーソル、最終ページは `null`）を含める
- **FR-003**: キャンペーン一覧画面は API から取得した `nextCursor` を使って次ページを読み込めるナビゲーションを提供する
- **FR-004**: `limit` が 1〜100 の整数でない場合はデフォルト値 20 を使用する
- **FR-005**: `cursor` が不正な値の場合は 400 エラーを返す
- **FR-006**: 既存の認証・認可（管理者ロール必須）は変更しない
- **FR-007**: 一覧の並び順（`createdAt` 降順）はページネーション後も保持する

### Key Entities

- **Campaign**: キャンペーン。`id`、`name`、`startsAt`、`endsAt`、`bonusPoints`、`deletedAt`（論理削除）を持つ。`isActive`（現在日時が期間内か）は派生値
- **Cursor**: カーソルベースのページネーション用トークン。内部的には `createdAt + id` の組み合わせをエンコードした文字列。API の利用者は中身を意識しない

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: キャンペーンが 100 件存在する場合でも、管理者の一覧表示が 1 秒以内に完了する
- **SC-002**: `GET /api/admin/campaigns?limit=20` のレスポンスに `campaigns`（最大20件）と `nextCursor` が含まれる
- **SC-003**: ページネーション操作（次のページへ移動）が 2 回以内のクリックで完了できる
- **SC-004**: 既存のキャンペーン作成・編集・削除機能に影響を与えない

## Assumptions

- カーソルベースのページネーションを採用する（オフセット方式よりも大量データに適する）
- 1ページあたりのデフォルト件数は 20 件とする（現在の運用規模に対して十分）
- `cursor` の実装は `createdAt` + `id` のエンコードを想定するが、仕様上は不透明なトークン扱いとする
- UI は Server Component のページ遷移方式（URL にページ情報を保持）を採用する
- 管理画面のページネーション UI は既存のデザインシステム（Tailwind CSS）に合わせる
- 最大件数は 100 件とし、それ以上の `limit` はサーバー側で 100 に制限する
