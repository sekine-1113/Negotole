# Feature Specification: cursor パラメータの入力検証強化

**Feature Branch**: `006-fix-cursor-validation`

**Created**: 2026-05-25

**Status**: Draft

**Input**: User description: "docs/todo.md の、cursor パラメータの検証が甘い項目対応"

## User Scenarios & Testing *(mandatory)*

### User Story 1 - 不正な cursor 値によるエラー防止 (Priority: P1)

投稿一覧を無限スクロールで閲覧するユーザーが、改ざん・破損した cursor クエリパラメータを送信しても、サーバーがエラーを返さず安全に処理される。

**Why this priority**: NaN がDBクエリに渡るとクエリエラーや予期しない結果を引き起こす可能性があり、セキュリティ・安定性の両面で最優先。

**Independent Test**: curl や Postman で `GET /api/posts?cursor=invalidbase64!!!` を送信し、400 エラーまたは cursor なしの正常な投稿一覧が返ること。

**Acceptance Scenarios**:

1. **Given** cursor パラメータが不正な base64 文字列の場合, **When** GET /api/posts?cursor=<invalid> を送信, **Then** 400 Bad Request を返す
2. **Given** base64 デコード結果が整数でない場合（例：デコード結果が "abc"）, **When** GET /api/posts?cursor=<invalid> を送信, **Then** 400 Bad Request を返す
3. **Given** cursor パラメータが正常な base64 エンコードされた整数の場合, **When** GET /api/posts?cursor=<valid> を送信, **Then** 正常にページネーションされた投稿一覧を返す
4. **Given** cursor パラメータが省略された場合, **When** GET /api/posts を送信, **Then** 最新の投稿一覧を返す（既存動作を維持）

---

### Edge Cases

- base64 デコード結果が空文字列の場合はどうなるか？→ 400 を返す
- base64 デコード結果が 0 や負の整数の場合はどうなるか？→ 400 を返す（投稿IDは正の整数）
- cursor が非常に大きい整数値（`Number.MAX_SAFE_INTEGER` = 2^53 - 1 超）の場合は？→ `Number.isSafeInteger()` が `false` を返すため 400 を返す
- cursor パラメータに null バイトや特殊文字が含まれる場合は？→ 400 を返す

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: システムは cursor クエリパラメータを受信した際、base64 デコード後の値が `Number.isSafeInteger(n) && n > 0` を満たす安全な正の整数であることを検証しなければならない（2^53 - 1 を超える値は拒否）
- **FR-002**: システムは cursor の検証に失敗した場合、400 Bad Request を返さなければならない
- **FR-003**: システムは有効な cursor（正の整数を base64 エンコードした値）に対して、従来通りページネーション付き投稿一覧を返さなければならない
- **FR-004**: システムは cursor パラメータが省略された場合、最新の投稿一覧を返す既存の動作を維持しなければならない
- **FR-005**: システムは NaN・Infinity・浮動小数・2^53 超の大整数など、安全でない数値が DB クエリに渡らないようにしなければならない

### Key Entities

- **cursor**: ページネーション用の不透明トークン。内部的には投稿 ID を base64 エンコードした文字列。クライアントはこれを次のページ取得時のクエリパラメータとして使用する。
- **cursorId**: cursor をデコードして得られる投稿 ID（正の整数）。DB クエリの WHERE 条件に使用される。

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: 不正な cursor 値（非 base64、非整数、0、負の数）を送信した場合、100% のケースで 400 エラーが返る
- **SC-002**: 正常な cursor 値を使ったページネーションが、既存と同じ応答時間・形式で動作する（リグレッションなし）
- **SC-003**: NaN や不正値が DB クエリに渡るケースが 0 件になる

## Clarifications

### Session 2026-05-25

- Q: 整数の境界チェック方法（`Number.isInteger` vs `Number.isSafeInteger`） → A: `Number.isSafeInteger(n) && n > 0` を採用。2^53 超の大整数による精度損失を防ぎ、spec の Edge Case 要件（オーバーフロー → 400）を正確に実装するため。
- Q: バリデーション失敗時のログ出力 → A: ログなし（スコープ外）。構造化ログは別フィーチャー（todo.md #7）で対応予定のため本フィーチャーには含めない。

## Assumptions

- 投稿 ID は常に正の整数（1以上）であることが保証されている
- cursor の形式は「投稿 ID の文字列表現を base64 エンコード」という既存仕様を変更しない
- クライアント（フロントエンド）はサーバーが返す nextCursor をそのまま次のリクエストに使用する（改ざんするケースは異常系として扱う）
- limit パラメータの検証は既存の実装（`Math.min(Number(...), 50)`）で十分であり、本フィーチャーのスコープ外
- バリデーション失敗時のログ出力は対象外。構造化ログ導入は todo.md #7 で別途対応する
