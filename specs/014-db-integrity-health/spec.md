# Feature Specification: DB整合性改善・ヘルスチェック

**Feature Branch**: `014-db-integrity-health`

**Created**: 2026-05-30

**Status**: Draft

**Input**: docs/todo.md の未対応項目 #10（外部キー制約なし）、#11（インデックスなし）、#15（ヘルスチェックエンドポイントなし）

## User Scenarios & Testing *(mandatory)*

### User Story 1 - DB整合性とクエリ性能の改善 (Priority: P1)

運用者として、データベースのレコードが孤立しないことを保証し、ユーザー数増加後もタイムライン・ポイント集計が遅延なく動作することを求める。

**Why this priority**: ユーザー数が増えるにつれてポイント集計やタイムライン取得が顕著に遅化する。外部キー制約がないため、ユーザー削除時に関連レコードが残り続けてデータ不整合が生まれる。どちらもプロトタイプ→本番移行前に修正すべき基盤的な問題。

**Independent Test**: DBマイグレーション実行後、ユーザーを削除したとき関連ポイントレコードが自動削除（またはエラーで保護）されることと、EXPLAIN ANALYZEでインデックスが使用されることを確認できる。

**Acceptance Scenarios**:

1. **Given** app_user テーブルのユーザーが削除される、**When** 削除操作が完了する、**Then** そのユーザーに紐づく user_point レコードがカスケード削除される
2. **Given** ポイント残高集計クエリが実行される、**When** user_point テーブルに大量レコードが存在する、**Then** user_id インデックスによりフルスキャンを回避して結果が返る
3. **Given** タイムライン取得クエリが実行される、**When** post テーブルに大量レコードが存在する、**Then** hidden_at インデックスによりフィルタリングが高速化される
4. **Given** キャンペーン有効期間判定クエリが実行される、**When** campaign テーブルに複数レコードが存在する、**Then** starts_at・ends_at インデックスにより範囲検索が最適化される

---

### User Story 2 - ヘルスチェックエンドポイント (Priority: P2)

運用者として、外部監視サービスやデプロイパイプラインからアプリケーションの死活状態を確認できることを求める。

**Why this priority**: 本番運用において監視サービス（UptimeRobot 等）や CI/CD の smoke test で HTTP ベースの死活確認が必要。現状 /api/health が存在しないため外部から正常動作を確認する手段がない。

**Independent Test**: `GET /api/health` にリクエストを送り、HTTP 200 と JSON レスポンスが返ることを確認できる。

**Acceptance Scenarios**:

1. **Given** アプリケーションが正常稼働中、**When** `GET /api/health` にアクセスする、**Then** HTTP 200 と `{"status": "ok"}` が返る
2. **Given** DBへの接続が確立している、**When** `GET /api/health` にアクセスする、**Then** DB疎通確認結果を含むレスポンスが返る
3. **Given** 認証なしのリクエスト、**When** `GET /api/health` にアクセスする、**Then** 認証不要で応答が返る（監視サービスは認証情報を持たない）

---

### Edge Cases

- app_user を削除する際、投稿（post）が残留しても問題ないか？ → post.userId も FK で保護し、削除前に投稿を先に削除するフローとする
- インデックス追加マイグレーション実行中に本番DB がロックされないか？ → Neon/PostgreSQL は CREATE INDEX CONCURRENTLY オプションで無停止追加が可能（Drizzle マイグレーション経由で適用）
- ヘルスチェックが DB 接続を毎回確認するとコネクションを消費しすぎないか → 軽量クエリ（`SELECT 1`）のみ使用

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: DB スキーマに外部キー制約を追加し、user_point.user_id → app_user.id のカスケード削除を保証する
- **FR-002**: DB スキーマに外部キー制約を追加し、post.user_id → app_user.id の参照整合性を保証する
- **FR-003**: user_point テーブルの user_id カラムおよび expires_at カラムにインデックスを追加する
- **FR-004**: post テーブルの hidden_at カラムにインデックスを追加する
- **FR-005**: campaign テーブルの starts_at・ends_at カラムにインデックスを追加する
- **FR-006**: `GET /api/health` エンドポイントを追加し、認証なしでアクセス可能にする
- **FR-007**: ヘルスチェックレスポンスには稼働状態（ok/error）と DB 疎通結果を含める

### Key Entities

- **app_user**: ユーザー。FK の参照先。削除時に関連レコードをカスケード削除する
- **user_point**: ポイント履歴。user_id に FK + インデックス、expires_at にインデックスを追加
- **post**: 投稿。user_id に FK 追加、hidden_at にインデックスを追加
- **campaign**: キャンペーン。starts_at・ends_at に複合インデックスを追加

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: DB マイグレーション適用後、ユーザー削除操作が関連ポイントレコードをカスケード削除することをテストで確認できる
- **SC-002**: `GET /api/health` が HTTP 200 を 500ms 以内に返す
- **SC-003**: `GET /api/health` が認証なしでアクセス可能である
- **SC-004**: インデックス追加後、ポイント集計クエリが全レコードスキャンを行わないことを EXPLAIN で確認できる

## Assumptions

- Drizzle ORM の `.references()` および `index()` でスキーマを定義し、`drizzle-kit generate` + `drizzle-kit migrate` でマイグレーションを適用する
- カスケード削除ポリシーは `onDelete: "cascade"` とする（user_point, post ともに）
- post の FK 追加は既存の NULL/非NULL 状態と整合する（post.userId が NOT NULL であることを前提とする）
- ヘルスチェックエンドポイントは軽量に保つ（DB に対して `SELECT 1` のみ実行）
- エラートラッキング（Sentry、#9）および構造化ログ（Pino、#7）は本 Feature のスコープ外
