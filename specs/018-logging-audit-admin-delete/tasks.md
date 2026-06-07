# Tasks: 構造化ログ・監査ログ・管理者投稿削除機能

**Input**: Design documents from `/specs/018-logging-audit-admin-delete/`

**Prerequisites**: plan.md ✅, spec.md ✅, research.md ✅, data-model.md ✅, contracts/admin-posts-api.md ✅

**Tests**: スペックでテスト自動化は要求されていないため、テストタスクは含めない（手動確認のみ）。

**Organization**: タスクはユーザーストーリー単位でグループ化し、各ストーリーを独立して実装・検証できるようにする。

## Format: `[ID] [P?] [Story] Description`

- **[P]**: 並行実行可能（異なるファイル・未完了タスクへの依存なし）
- **[Story]**: 対象ユーザーストーリー（US1〜US4）
- ファイルパスは `negotole/src/` 以下を起点として記載

---

## Phase 1: Setup（共有インフラ）

**Purpose**: 全ストーリーが依存する構造化ログ関数を作成する

- [x] T001 `negotole/src/lib/logger.ts` を新規作成し `log(level, event, data?)` 関数を実装する（`{ ts, level, event, ...data }` を JSON 文字列として `console[level]` に出力）

**Checkpoint**: `log("info", "test", { x: 1 })` を呼ぶと `{"ts":"...","level":"info","event":"test","x":1}` が出力される

---

## Phase 2: Foundational（ブロッキング前提条件）

**Purpose**: US2・US3・US4 が依存する DB テーブルのスキーマ追加とマイグレーション適用

**⚠️ CRITICAL**: このフェーズが完了するまで US2〜US4 の DB 操作は実装できない

- [x] T002 `negotole/src/lib/db/schema.ts` に `loginLogs` テーブル定義を追加する（`userId`, `ipAddress varchar(45)`, `userAgent`, `createdAt`、`login_log_user_id_idx` インデックス付き。data-model.md の Drizzle ORM 型定義を参照）
- [x] T003 `negotole/src/lib/db/schema.ts` に `adminAuditLogs` テーブル定義を追加する（`adminId`, `action varchar(50)`, `targetType`, `targetId`, `payload json`, `ipAddress varchar(45)`, `createdAt`、3インデックス付き。T002 と同ファイルのため T002 完了後に実施）
- [x] T004 `negotole/` で `pnpm drizzle-kit generate` を実行してマイグレーション SQL を生成する（T002・T003 完了後）
- [x] T005 `negotole/` で `pnpm drizzle-kit migrate` を実行してマイグレーションを Neon DB に適用する（T004 完了後）

**Checkpoint**: `login_log` と `admin_audit_log` テーブルが DB に存在することを確認

---

## Phase 3: User Story 1 — アプリケーションの動作ログを構造化して記録する（Priority: P1）🎯 MVP

**Goal**: 既存の `console.error` / `console.log` を `log()` 関数に置き換え、ログイン・投稿・エラーのイベントを JSON 形式で出力する

**Independent Test**: ローカルでログイン・投稿・エラー発生時のサーバーログに `{ ts, level, event, ... }` 形式の JSON が出力されることを目視確認

- [x] T006 [P] [US1] `negotole/src/lib/auth.ts` の `console.error` 呼び出しを `log()` 関数に置き換える（`auth.daily_points_failed`・`auth.campaign_points_failed` イベント等。data-model.md のイベント一覧を参照）
- [x] T007 [P] [US1] `negotole/src/app/api/posts/route.ts` の `console` 出力を `log()` 関数に置き換える（`post.created`・`post.insufficient_points` イベント等）

**Checkpoint**: ログイン・投稿・エラー各操作時にサーバーログで JSON 形式の出力が確認できる

---

## Phase 4: User Story 2 — ログイン時のIPアドレスを法的証跡として記録する（Priority: P2）

**Goal**: 初回サインイン時（Google OAuth・ゲストログイン）に userId・IPアドレス・User-Agent・日時を `login_log` テーブルに記録する

**Independent Test**: Google ログイン・ゲストログイン後に `login_log` テーブルに userId・ipAddress・userAgent・createdAt を持つレコードが存在することを確認。トークン更新時にはレコードが増えないことも確認

- [x] T008 [US2] `negotole/src/lib/auth.ts` の JWT コールバックに `loginLogs` への DB 挿入処理を追加する（`profile`（Google）または `user`（ゲスト）が存在する初回サインイン時のみ記録。`x-forwarded-for` / `x-real-ip` ヘッダーから IP を取得し取得できない場合は null。DB 挿入失敗はサイレント失敗でログイン処理はそのまま継続。T006 完了後に同ファイルを編集）

**Checkpoint**: ログイン後に `login_log` テーブルに新規レコードが存在する。再ログインで行が増える。トークン更新では行が増えない

---

## Phase 5: User Story 3 — 管理者操作を監査ログとして記録する（Priority: P2）

**Goal**: キャンペーン作成・更新・削除操作を `admin_audit_log` テーブルに記録する

**Independent Test**: 管理者がキャンペーンを作成・更新・削除した後、`admin_audit_log` テーブルに対応する action・adminId・targetId を持つレコードが存在することを確認

- [x] T009 [P] [US3] `negotole/src/app/api/admin/campaigns/route.ts` の POST ハンドラ成功後に `adminAuditLogs` への挿入を追加する（`action: "campaign.create"`、`payload: { campaignId, name }` 形式。挿入失敗はサイレント失敗でキャンペーン作成はそのまま成功させる）
- [x] T010 [P] [US3] `negotole/src/app/api/admin/campaigns/[id]/route.ts` の PATCH・DELETE ハンドラ成功後にそれぞれ `adminAuditLogs` への挿入を追加する（`campaign.update`・`campaign.delete` イベント。挿入失敗はサイレント失敗）

**Checkpoint**: キャンペーン作成・更新・削除後に `admin_audit_log` テーブルに対応レコードが存在する

---

## Phase 6: User Story 4 — 管理者が問題のある投稿を削除できる（Priority: P2）

**Goal**: 管理画面に投稿一覧ページを追加し、確認ダイアログ付きの論理削除機能を提供する。削除と同時に `admin_audit_log` に記録し、audit log 書き込み失敗時は削除をロールバックする

**Independent Test**: 管理者が `/admin/posts` で投稿を削除すると、タイムラインから消え、DB に `deleted_at` が設定されたレコードが残り、`admin_audit_log` に `post.delete` レコードが存在することを確認

- [x] T011 [US4] `negotole/src/app/api/admin/posts/[id]/route.ts` を新規作成し DELETE ハンドラを実装する（①認証チェック→401、②管理者ロールチェック→403、③パス ID バリデーション→400、④投稿存在確認（`deleted_at IS NULL`）→404、⑤`deleted_at` 更新、⑥`adminAuditLogs` 挿入 — ⑥が失敗した場合は⑤をロールバックして500を返す。contracts/admin-posts-api.md のレスポンス仕様に準拠）
- [x] T012 [P] [US4] `negotole/src/app/admin/layout.tsx` の Nav セクションに「投稿管理」リンク（`href="/admin/posts"`）を追加する
- [x] T013 [US4] `negotole/src/app/admin/posts/page.tsx` を新規作成する（論理削除済みを除く全投稿の一覧をサーバーコンポーネントで表示。各行に確認ダイアログ付き削除ボタンをクライアントコンポーネントとして実装し `DELETE /api/admin/posts/[id]` を呼び出す。削除後は投稿一覧を再取得。ダークテーマに合わせたスタイル。T011 完了後に実施）

**Checkpoint**: 管理者が `/admin/posts` で投稿を削除でき、タイムラインから消えて DB に `deleted_at` と audit log レコードが残る

---

## Phase 7: Polish & 横断的な確認

**Purpose**: 型安全性の確認と全ストーリーの統合確認

- [x] T014 [P] `negotole/` で `pnpm tsc --noEmit` を実行し型エラーがないことを確認する
- [x] T015 [P] `logger.ts` 内で例外が発生してもメイン処理が継続することをローカルで確認する（`log()` が throw しない設計であることを確認）

---

## Dependencies & Execution Order

### Phase Dependencies

| フェーズ | 先行条件 | 備考 |
|---|---|---|
| Phase 1 (Setup) | なし | 即時開始可 |
| Phase 2 (Foundational) | Phase 1 完了 | US2〜US4 をブロック |
| Phase 3 (US1) | Phase 1 完了 | Phase 2 と並行実行可 |
| Phase 4 (US2) | Phase 2 完了 | US3・US4 と並行実行可 |
| Phase 5 (US3) | Phase 2 完了 | US2・US4 と並行実行可 |
| Phase 6 (US4) | Phase 2 完了 | US2・US3 と並行実行可 |
| Phase 7 (Polish) | Phase 3〜6 完了 | |

### User Story Dependencies

| ストーリー | auth.ts の編集順 | 他ストーリーへの依存 |
|---|---|---|
| US1 (T006) | 先に実施 | なし |
| US2 (T008) | T006 完了後に同ファイル編集 | なし（変更箇所は別セクション） |
| US3 (T009・T010) | 別ファイル | なし |
| US4 (T011→T013) | 別ファイル | T011 完了後に T013 |

### Parallel Opportunities

```bash
# Phase 3 の並行実行（異なるファイル）:
T006: negotole/src/lib/auth.ts の logger 適用
T007: negotole/src/app/api/posts/route.ts の logger 適用

# Phase 5 の並行実行（異なるファイル）:
T009: negotole/src/app/api/admin/campaigns/route.ts
T010: negotole/src/app/api/admin/campaigns/[id]/route.ts

# Phase 6 の部分的並行実行:
T011: api/admin/posts/[id]/route.ts（先行）
T012: admin/layout.tsx（T011 と並行可）
T013: admin/posts/page.tsx（T011 完了後）
```

---

## Implementation Strategy

### MVP First（User Story 1 のみ）

1. Phase 1 完了: `logger.ts` を作成
2. Phase 3 完了 (US1): 既存コードに `log()` を適用
3. **STOP & VALIDATE**: ローカルサーバーで JSON ログ出力を確認
4. この時点でデプロイ可能（DB 変更なし）

### Incremental Delivery

1. Phase 1 → Phase 3: 構造化ログ → 確認 → デプロイ（DB 変更なし）
2. Phase 2: DB スキーマ適用（マイグレーション）
3. Phase 4 (US2): ログイン IP 記録 → 確認 → デプロイ
4. Phase 5 (US3): 管理者監査ログ → 確認 → デプロイ
5. Phase 6 (US4): 投稿削除管理画面 → 確認 → デプロイ

### Parallel Team Strategy（複数人の場合）

1. 全員で Phase 1 を完了
2. 1人が Phase 2（マイグレーション）を担当しながら、別の人が Phase 3 (US1) を並行実施
3. Phase 2 完了後: US2・US3・US4 を別々の人が並行実装

---

## Notes

- `[P]` タスク = 異なるファイルを扱い、未完了タスクへの依存がないもの
- `[Story]` ラベルでタスクとユーザーストーリーのトレーサビリティを確保
- `admin_audit_log` への書き込みポリシー:
  - 投稿削除（US4）: 必須。失敗時は削除をロールバック（FR-011）
  - キャンペーン操作（US3）: ベストエフォート。失敗時はサイレント失敗
- `login_log` への書き込みは常にサイレント失敗（ログイン自体をブロックしない）
- drizzle-kit コマンドは `negotole/` ディレクトリで実行すること
- `admin_audit_log` と `login_log` のレコードは記録日から3年間保持する（NFR-001）
