# Feature Specification: API ルートのテスト追加

**Feature Branch**: `017-api-route-tests`

**Created**: 2026-06-07

**Status**: Draft

**Input**: `docs/claude_todo.md` #18 — 認証フロー・API ルート・ミドルウェアのテストが存在しない

## User Scenarios & Testing *(mandatory)*

### User Story 1 — 主要 API ルートが認証・認可を正しく検証する (Priority: P1)

開発者として、主要な API エンドポイントが未認証リクエストを拒否し、権限のないユーザーのアクセスを適切に弾くことを自動テストで保証したい。

**Why this priority**: 認証バイパスは重大なセキュリティリスクであり、コード変更時のリグレッション防止に最も優先度が高い。現在の手動確認では変更の都度確認が必要で、ミスが発生しやすい。

**Independent Test**: 未認証リクエストに対する各 API の 401 応答と、一般ユーザーによる管理者 API アクセスに対する 403 応答が自動テストで確認できる。

**Acceptance Scenarios**:

1. **Given** 未認証のリクエストが `POST /api/posts` に送られる、**When** リクエストが処理される、**Then** 401 Unauthorized が返る
2. **Given** 未認証のリクエストが `GET /api/admin/campaigns` に送られる、**When** リクエストが処理される、**Then** 401 Unauthorized が返る
3. **Given** 一般ユーザーが `GET /api/admin/campaigns` にアクセスする、**When** リクエストが処理される、**Then** 403 Forbidden が返る
4. **Given** 未認証のリクエストが `GET /api/users/me` に送られる、**When** リクエストが処理される、**Then** 401 Unauthorized が返る

---

### User Story 2 — API ルートの入力バリデーションを自動テストで検証する (Priority: P2)

開発者として、各 API エンドポイントが不正な入力値を適切に拒否し、正常な入力では期待通りの応答を返すことを自動テストで確認したい。

**Why this priority**: 入力バリデーションのバグはデータ不整合やエラーにつながる。認証テストに次ぐ優先度として、境界値・異常値のカバレッジを確保する。

**Independent Test**: `POST /api/admin/campaigns` に各種不正な入力（空の名前、不正な日付形式、負のボーナスポイント）を送ったとき 400 Bad Request が返り、正常な入力では 201 Created が返ることを自動テストで確認できる。

**Acceptance Scenarios**:

1. **Given** 管理者が `POST /api/admin/campaigns` に空の `name` フィールドを送る、**When** リクエストが処理される、**Then** 400 Bad Request が返る
2. **Given** 管理者が `POST /api/admin/campaigns` に `endsAt < startsAt` の日時を送る、**When** リクエストが処理される、**Then** 400 Bad Request が返る
3. **Given** 管理者が `POST /api/admin/campaigns` に有効なデータを送る、**When** リクエストが処理される、**Then** 201 Created と作成されたキャンペーン情報が返る
4. **Given** 管理者が `GET /api/admin/campaigns` に不正な `cursor` を送る、**When** リクエストが処理される、**Then** 400 Bad Request が返る
5. **Given** `GET /api/health` にリクエストを送る、**When** リクエストが処理される、**Then** 200 OK と稼働状態が返る

---

### Edge Cases

- 既にアクティブなキャンペーンが存在するときに `POST /api/admin/campaigns` を実行すると 409 Conflict が返る
- `POST /api/posts` でポイント残高が不足しているとき 402 Payment Required が返る
- テストは実際の DB・外部サービスに接続しない（モックで代替する）
- 既存の `GET /api/posts` cursor バリデーションテストは変更しない

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: `POST /api/posts` の認証チェック（未認証 → 401）をテストする
- **FR-002**: `GET /api/admin/campaigns` の認証・認可チェック（未認証 → 401、一般ユーザー → 403）をテストする
- **FR-003**: `POST /api/admin/campaigns` の認証チェックと主要バリデーション（name 空・日付不正・bonusPoints 不正）をテストする
- **FR-004**: `PATCH /api/admin/campaigns/[id]` の認証チェックと存在しない ID の処理（404）をテストする
- **FR-005**: `DELETE /api/admin/campaigns/[id]` の認証チェックをテストする
- **FR-006**: `GET /api/health` が 200 を返すことをテストする
- **FR-007**: `GET /api/users/me` の認証チェック（未認証 → 401）をテストする
- **FR-008**: テストは DB・外部 API に接続せず、すべてモックで実行できる
- **FR-009**: 既存のテスト（`GET /api/posts` cursor バリデーション、lib テスト）はそのまま通過する

### Key Entities

- **API ルート**: テスト対象のエンドポイント群（posts, admin/campaigns, health, users/me）
- **テストケース**: 認証・認可・バリデーション・正常系の各シナリオ

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: `pnpm test` が 0 件のエラーで完了し、新規テストが全件パスする
- **SC-002**: 主要 API ルート 5 本（posts, admin/campaigns GET/POST, admin/campaigns/[id] PATCH/DELETE, health, users/me）それぞれに認証テストが存在する
- **SC-003**: `POST /api/admin/campaigns` に 3 種類以上のバリデーションエラーケースのテストが存在する
- **SC-004**: テストがモックのみで実行でき、実際の DB 接続を必要としない

## Assumptions

- 既存テストと同じパターン（Vitest + `vi.mock`）を踏襲する
- テストはユニットレベルのルートハンドラーテストとし、HTTP サーバーを起動しない
- `NextRequest` を直接インスタンス化してルートハンドラー関数を呼び出す既存パターンを継続する
- `GET /api/admin/campaigns` のページネーション詳細（nextCursor の検証等）は P2 の範囲
- `POST /api/posts` の投稿成功ケース（ポイント消費フロー全体）はモックが複雑なため、認証チェックのみを対象とする
