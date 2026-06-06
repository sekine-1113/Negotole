# Research: 管理者キャンペーン一覧のページネーション

## ページネーション方式の選定

**Decision**: ID ベースのカーソルページネーション（既存の `fetchPosts` と同一パターン）を採用する

**Rationale**:
- `campaign.id` は `BIGINT GENERATED ALWAYS AS IDENTITY`（連番）であり、`createdAt DESC` の順序と一致する
- `fetchPosts` で実績のある `Buffer.from(String(id)).toString("base64")` エンコードをそのまま踏襲できる
- オフセット方式（`OFFSET N`）は大量データ時にフルスキャンコストが増加するため不採用
- keyset pagination（`createdAt < cursor_time AND id < cursor_id`）は `createdAt` が秒単位精度の場合に同一秒内の重複リスクがあるため、ID 単体のほうがシンプルで安全

**Alternatives considered**:
- オフセット方式: OFFSET が大きくなると DB スキャンコストが線形増加するため不採用
- `createdAt` + `id` の複合キーセット: 実装が複雑になりメリットが薄い（ID で十分）

---

## 管理者 UI のページネーション実装方式

**Decision**: URL クエリパラメータ (`?cursor=...`) を持つ Server Component + `<Link>` ナビゲーション

**Rationale**:
- 既存の `/admin/campaigns/page.tsx` は Server Component（`async function`）
- Next.js App Router の慣用パターン: `searchParams` prop を受け取り、DB を直接クエリする
- クライアントサイド状態管理不要でシンプルに実装できる
- URL にページ状態が含まれるためブラウザバックが自然に動作する

**Alternatives considered**:
- API 経由のクライアントサイドフェッチ: `use client` + `useState` が必要になり複雑化するため不採用
- 無限スクロール: 管理画面の性質上（全件把握が目的）にはページ送りのほうが適切

---

## Admin ページと API の重複実装

**Decision**: API (`GET /api/admin/campaigns`) と管理ページの両方を独立してページネーション対応する

**Rationale**:
- 現在の管理ページは API を経由せず DB を直接クエリしている（Server Component の特性を活かしている）
- API にページネーションを追加することで外部ツールや将来的な利用に対応
- 管理ページは Server Component のまま直接 DB クエリで実装することで余分な HTTP ラウンドトリップを避ける

---

## カーソルの最大 limit 値

**Decision**: デフォルト 20 件、最大 100 件（`Math.min(limit, 100)` でクランプ）

**Rationale**:
- `fetchPosts` は `Math.min(limit, 50)` を採用しているが、管理画面は運用者が使用するため 100 件まで許容
- 100 件以上は管理画面の UX として非現実的であり、DB 負荷も増大するため上限を設ける

---

## 既存コードへの影響

- `GET /api/admin/campaigns`: クエリパラメータ `limit`・`cursor` を追加、レスポンスに `nextCursor` を追加
- `POST /api/admin/campaigns`: 変更なし
- `/admin/campaigns/page.tsx`: `searchParams` を受け取り、cursor ベースで DB クエリ、Next/Prev リンクを追加
- `negotole/src/lib/db/schema.ts`: 変更なし（既存インデックスで対応可）
