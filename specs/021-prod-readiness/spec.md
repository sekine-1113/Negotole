# Feature Specification: 本番公開準備（レートリミット・フォームURL・ページネーション・APIテスト）

**Feature Branch**: `021-prod-readiness`

**Created**: 2026-06-07

**Status**: Draft

**Input**: docs/prod-deploy-tasks.md の項目 #1, #4, #8, #10 を対応する

## User Scenarios & Testing *(mandatory)*

### User Story 1 - 投稿APIへのレートリミット適用 (Priority: P1)

悪意あるユーザーまたはボットが短時間に大量リクエストを送信したとき、サービスが正常に動作し続ける。

**Why this priority**: レートリミッターのコードは既に完成しているが未適用のため、公開前に接続するだけでセキュリティが大幅に向上する。

**Independent Test**: 同一 IP から POST /api/posts を 10 回超の短時間連続送信し、429 が返ること。

**Acceptance Scenarios**:

1. **Given** 一般ユーザーが通常ペースで投稿している、**When** POST /api/posts を実行する、**Then** 正常に投稿が作成される
2. **Given** ボットが 60 秒以内に 11 回以上 POST /api/posts を送信する、**When** 11 回目のリクエストが届く、**Then** 429 Too Many Requests が返る
3. **Given** 管理者が管理 API を連続操作する、**When** 60 秒以内に 31 回以上リクエストを送信する、**Then** 429 が返る

---

### User Story 2 - お問い合わせ・通報フォームの動作確認 (Priority: P1)

エンドユーザーが「お問い合わせ」または「通報」ボタンを押したとき、設定済みの Google フォームが正しく開く。

**Why this priority**: 環境変数が未設定のままデプロイすると、通報機能がサイレントに機能不全となり法的・運用リスクが生じる。

**Independent Test**: 本番環境でお問い合わせページを開き、リンクが Google フォームの正しい URL を指していること。通報ボタンのリンクに投稿 ID が付与されていること。

**Acceptance Scenarios**:

1. **Given** 本番環境でフォーム URL が設定されている、**When** お問い合わせページを開く、**Then** ボタンが有効な Google フォーム URL を開く
2. **Given** 本番環境でフォーム URL が設定されている、**When** タイムラインの通報ボタンを押す、**Then** Google フォームが投稿 ID パラメータ付きで開く
3. **Given** フォーム URL が未設定の状態でデプロイされている、**When** お問い合わせページを開く、**Then** ボタンが `#`（機能しないリンク）を指しており、問題が視覚的に分かる

---

### User Story 3 - 管理者ユーザー一覧のページネーション (Priority: P2)

管理者がユーザー一覧ページを開いたとき、大量のユーザーが登録されていても画面が遅延なく表示される。

**Why this priority**: 現状は全件取得のため、ユーザー増加時に管理画面が重くなるリスクがある。プロトタイプ公開後のユーザー数増加を見越して早めに対応する。

**Independent Test**: 管理者として /admin/users にアクセスし、ページあたり件数が制限され次ページへのナビゲーションが機能すること。

**Acceptance Scenarios**:

1. **Given** ユーザーが多数登録されている、**When** 管理者が /admin/users を開く、**Then** 最初の N 件のみ表示され、次ページへのリンクが表示される
2. **Given** 管理者が 1 ページ目を表示している、**When** 次ページへ移動する、**Then** 続きのユーザーが表示される
3. **Given** 管理者が凍結フィルタを ON にしている、**When** ページネーションを操作する、**Then** フィルタ条件を維持したままページングが機能する

---

### User Story 4 - 管理系 API のユニットテスト追加 (Priority: P2)

開発者が管理系 API（凍結・解除・ユーザー一覧・投稿削除）を変更したとき、既存の挙動が壊れていないことをテストで確認できる。

**Why this priority**: 凍結・解除は重要な管理操作であり、権限チェックのバグがセキュリティリスクになる。テストで変更時のリグレッションを自動検出できるようにする。

**Independent Test**: `pnpm test` を実行し、freeze/unfreeze/users 系のテストケースがすべてグリーンであること。

**Acceptance Scenarios**:

1. **Given** 管理者でない一般ユーザーがアクセスする、**When** POST /api/admin/users/[id]/freeze を呼ぶ、**Then** 403 Forbidden が返る
2. **Given** 管理者が有効なユーザー ID で凍結を実行する、**When** POST /api/admin/users/[id]/freeze を呼ぶ、**Then** 200 OK と `{success: true}` が返る
3. **Given** 管理者が凍結済みユーザーを再度凍結しようとする、**When** POST /api/admin/users/[id]/freeze を呼ぶ、**Then** 409 Conflict が返る
4. **Given** 管理者が凍結済みユーザーを解除する、**When** POST /api/admin/users/[id]/unfreeze を呼ぶ、**Then** 200 OK が返る
5. **Given** 管理者でないユーザーがユーザー一覧を取得しようとする、**When** GET /api/admin/users を呼ぶ、**Then** 403 が返る

---

### Edge Cases

- レートリミット中にリクエストが届いた場合、既存のレスポンス JSON と同じ形式で `429` を返す
- Upstash Redis が一時的に応答しない場合、レートリミットをスキップしてリクエストを通す（fail-open）
- ページネーションで最終ページより先を要求した場合、空配列が返る（エラーにならない）
- 凍結対象のユーザー ID が存在しない場合、404 が返る
- フォーム URL が設定されていない環境で通報を試みた場合、クラッシュせず `#` リンクが表示される

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: システムは POST /api/posts に対してユーザー ID ベースのレートリミットを適用し、短時間に閾値を超えたリクエストに 429 を返さなければならない（認証済みユーザーのみが呼び出すため、IP より公平で NAT・プロキシの影響を受けない）
- **FR-002**: システムは管理系 API（/api/admin/\*）に対してユーザー ID ベースのレートリミットを適用しなければならない
- **FR-003**: レートリミット超過時のレスポンスは `{"error": "Too Many Requests"}` 形式でなければならない
- **FR-004**: お問い合わせ・通報フォームの URL が本番環境変数に設定されていることをデプロイチェックリストで確認できなければならない
- **FR-005**: /admin/users ページはカーソルベースのページネーションで一度に表示する件数を制限しなければならない
- **FR-006**: /admin/users のページネーションは凍結フィルタ（`?frozen=true`）と組み合わせて機能しなければならない
- **FR-007**: POST /api/admin/users/[id]/freeze のテストは、管理者・非管理者・既凍結・存在しない ID の各ケースをカバーしなければならない
- **FR-008**: POST /api/admin/users/[id]/unfreeze のテストは、管理者・非管理者・非凍結ユーザーの各ケースをカバーしなければならない
- **FR-009**: GET /api/admin/users のテストは、管理者・非管理者のアクセス制御ケースをカバーしなければならない

### Key Entities

- **レートリミットバケット**: ユーザー ID をキーに、時間窓内のリクエスト数を管理する（認証済みルート）。未認証ルートは IP アドレスをキーとする
- **ページカーソル**: ユーザー ID ベースのカーソルでページ位置を表現する（既存の campaigns API と同形式）

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: POST /api/posts への短時間連続リクエストが閾値を超えた場合、429 が返る（閾値: 60 秒で 10 回）
- **SC-002**: 管理 API への短時間連続リクエストが閾値を超えた場合、429 が返る（閾値: 60 秒で 30 回）
- **SC-003**: /admin/users ページの初期表示で取得件数が 50 件以下に制限される
- **SC-004**: 凍結・解除・ユーザー一覧の全 API テストケースが `pnpm test` でグリーンになる
- **SC-005**: 本番環境でお問い合わせ・通報リンクが正しい URL を指していることをデプロイ前に確認できる

## Clarifications

### Session 2026-06-07

- Q: 投稿 API のレートリミット識別子を何にするか → A: 認証済みルート（POST /api/posts・管理 API）はユーザー ID ベース、未認証ルートは IP ベース
- Q: Redis 障害時のレートリミット挙動 → A: fail-open（障害時はリクエストを通す。サービス継続を優先）

## Assumptions

- レートリミッターの実装（`src/lib/ratelimit.ts`）と Upstash Redis の接続設定は完了済みで、API ルートへの組み込みのみが未完了
- Redis 障害時は fail-open（スキップ）とし、サービス継続を優先する（既存の env vars 未設定時の挙動と一致）
- ページネーションは既存の `/api/admin/campaigns` と同じカーソルベース方式を採用する
- テストは既存の `src/app/api/admin/campaigns/__tests__/route.test.ts` パターン（Vitest + モック）に倣う
- フォーム URL の確認はコード変更ではなく、デプロイチェックリストへの追記で対応する
- レートリミットの閾値は既存の `ratelimit.ts` の設定値（投稿: 10回/60秒、管理: 30回/60秒）をそのまま使用する
