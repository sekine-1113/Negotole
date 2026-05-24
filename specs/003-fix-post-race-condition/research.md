# Research: 投稿作成の競合状態・整合性バグ修正

**Date**: 2026-05-25

---

## 1. アトミックなポイント残高チェックと消費の実装方法

**Decision**: `db.transaction()` 内で `SELECT ... FOR UPDATE` を使用し、残高チェック・投稿作成・ポイント消費を単一トランザクションで実行する。

**Rationale**:
- `SELECT ... FOR UPDATE` は対象行に排他ロックをかけるため、トランザクション A が保持中はトランザクション B が同じ行を読み取れない（待機する）
- トランザクション A がコミットした後にトランザクション B が残高を再読み取りするため、残高が正確に反映される
- Drizzle ORM の `db.transaction(tx => ...)` は PostgreSQL のトランザクションと 1:1 対応しており、コールバック内で例外が発生した場合は自動ロールバックされる

**Alternatives considered**:
- `INSERT INTO user_point ... WHERE (SELECT SUM(get_point) ...) >= 1`（サブクエリ型 INSERT）: ポイント消費は原子化できるが、投稿レコードの作成と一体化できない
- 楽観的ロック（バージョンカラム追加）: スキーマ変更が必要で今回のスコープ外。リトライ実装も必要
- アプリケーション層のセマフォ（Redis / Upstash）: サーバーレス環境では複数インスタンス間で共有できないため不適切

---

## 2. Drizzle ORM でのトランザクション内 raw SQL 実行

**Decision**: `tx.execute(sql`...`)` で PostgreSQL のロック付き集計クエリを実行する。

**Rationale**:
- Drizzle の `for()` DSL（`.for("update")`）は 2024 年時点でサポートされているが、`SUM()` アグリゲーションと組み合わせた場合の型安全性に制限がある
- `sql` テンプレートリテラルによる raw SQL は型が `Record<string, unknown>[]` になるため、`as unknown` を経由してキャストが必要
- 実際のクエリ: `SELECT COALESCE(SUM(get_point), 0) AS total FROM user_point WHERE user_id = $1 AND deleted_at IS NULL AND (expires_at IS NULL OR expires_at > NOW()) FOR UPDATE`

**Alternatives considered**:
- Drizzle `.for("update")` DSL: アグリゲーション + `FOR UPDATE` の組み合わせで型推論が複雑になるため今回は raw SQL を選択

---

## 3. 投稿作成とポイント消費の原子性

**Decision**: トランザクション内で `tx.insert(posts)` → `tx.insert(userPoints)` を順次実行する。

**Rationale**:
- いずれかが失敗した場合、Drizzle のトランザクションが自動ロールバックするため「投稿だけ残る」「ポイントだけ減る」状態が存在しない
- `consumeOnePoint()` の外部関数は使わず、トランザクション参照 `tx` を直接使うことで DB 接続が同一トランザクション内に留まる

---

## 4. Neon Serverless PostgreSQL でのトランザクション対応

**Decision**: Neon の接続プール（`DATABASE_URL`）は HTTP ベースのため、トランザクションは WebSocket 経由の接続を使用する。

**Rationale**:
- `@neondatabase/serverless` ドライバーは `neonConfig.fetchConnectionCache = true` の設定で接続を再利用する
- Drizzle の `db.transaction()` は Neon の WebSocket 接続を自動的に使用するため、追加設定不要
- Vercel Serverless Functions の実行時間制限（10〜60 秒）内にトランザクションが完了することを確認

---

## 結論

`db.transaction()` + `SELECT ... FOR UPDATE` による実装が最も適切。スキーマ変更なし、追加依存なし、実装が最小限でリスクが低い。
