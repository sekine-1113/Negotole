# Feature Specification: 環境変数の起動時バリデーション

**Feature Branch**: `007-add-env-validation`

**Created**: 2026-05-26

**Status**: Draft

**Input**: User description: "docs/todo.md の環境変数の起動時バリデーションなしを対応して。"

## User Scenarios & Testing *(mandatory)*

### User Story 1 - 必須環境変数の未設定を起動時に検出 (Priority: P1)

開発者またはインフラ担当者がサーバーを起動したとき、必須環境変数（認証シークレット・DB接続文字列・Redisトークンなど）が未設定の場合、サーバーは起動を中断してどの変数が欠けているかを明示したエラーメッセージを出力する。

**Why this priority**: 未設定の環境変数が実行時にはじめて発覚すると、ユーザー向けエラーや予期しない挙動を引き起こす。起動時に即座に検出することで問題の発見を早め、本番障害を防ぐ。

**Independent Test**: 必須環境変数のいずれかを `.env.local` から削除してサーバーを起動し、どの変数が欠けているかを示すエラーメッセージが表示されてサーバーが起動しないことを確認する。

**Acceptance Scenarios**:

1. **Given** 必須環境変数がすべて設定されている, **When** サーバーを起動する, **Then** 正常に起動する（既存動作を維持）
2. **Given** `AUTH_SECRET` が未設定, **When** サーバーを起動する, **Then** 「AUTH_SECRET が未設定」を示すエラーで起動を中断する
3. **Given** `DATABASE_URL` が未設定, **When** サーバーを起動する, **Then** 「DATABASE_URL が未設定」を示すエラーで起動を中断する
4. **Given** `UPSTASH_REDIS_REST_URL` が未設定, **When** サーバーを起動する, **Then** 「UPSTASH_REDIS_REST_URL が未設定」を示すエラーで起動を中断する
5. **Given** 複数の必須環境変数が未設定, **When** サーバーを起動する, **Then** 欠けているすべての変数名を一度に列挙したエラーで起動を中断する

---

### Edge Cases

- 環境変数が設定されているが空文字列の場合はどうなるか？→ 未設定と同様にエラーとして扱う
- 任意の環境変数（将来追加分）が追加された場合は？→ バリデーション定義に追加するだけで対応可能な設計にする
- テスト実行時に本番環境変数が不要な場合はどうなるか？→ テスト環境ではモックを使用するため影響しない（既存テスト構成を維持）

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: システムは起動プロセスの最初の段階で必須環境変数の存在と非空値を検証しなければならない
- **FR-002**: 必須環境変数として以下を検証しなければならない: `AUTH_SECRET`・`AUTH_GOOGLE_ID`・`AUTH_GOOGLE_SECRET`・`DATABASE_URL`・`DATABASE_URL_UNPOOLED`・`UPSTASH_REDIS_REST_URL`・`UPSTASH_REDIS_REST_TOKEN`
- **FR-003**: 検証に失敗した場合、欠けている変数名を具体的に示すエラーメッセージを出力しなければならない
- **FR-004**: 複数の変数が未設定の場合、すべての欠如を一度に報告しなければならない（1件ずつではなく）
- **FR-005**: 検証に失敗した場合、サーバーは起動を中断しなければならない
- **FR-006**: 検証に成功した場合、サーバーは既存と同じ動作で正常に起動しなければならない

### Key Entities

- **環境変数スキーマ**: アプリケーションが必要とする環境変数の名前・型・必須/任意の定義一覧
- **バリデーション結果**: 起動時チェックの成否と、失敗した場合の欠如変数リスト

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: 必須環境変数が 1 つでも欠けた状態でサーバーを起動すると、100% のケースで起動が中断される
- **SC-002**: エラーメッセージにより、どの変数が欠けているかを 30 秒以内に特定できる
- **SC-003**: 必須環境変数がすべて設定されている場合、起動時間の増加が 100ms 未満である
- **SC-004**: 既存のすべてのテスト（pnpm test）が引き続きパスする

## Clarifications

### Session 2026-05-26

- Q: バリデーションのトリガータイミング（`next.config.ts` vs `instrumentation.ts`） → A: `next.config.ts` に import してビルド時・起動時の両方で検証する。Vercel では env vars がビルド時にも利用可能なため、CI/CD での早期検出が可能。

## Assumptions

- 検証対象の必須環境変数は `.env.local.example` に記載されている 7 変数とする
- テスト実行時（Vitest）は環境変数のモックを使用するため、バリデーションの影響を受けない
- バリデーションは `next.config.ts` からのインポートにより、ビルド時（`pnpm build`）・サーバー起動時の両方で実行される。Vercel 環境では env vars はビルド時にも利用可能なため、この動作が適切
- 任意の環境変数（あれば）は将来の拡張として扱い、本フィーチャーのスコープ外
