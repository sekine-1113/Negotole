# Research: Negotole SNS

**Date**: 2026-05-24

---

## 1. ORM 選定

**Decision**: Drizzle ORM + `@neondatabase/serverless`

**Rationale**:
- Neon のサーバーレスドライバと公式統合がある
- 型安全なスキーマ定義と SQL に近い Query Builder を持つ
- マイグレーションは `drizzle-kit` で管理でき、`DATABASE_URL_UNPOOLED` を使った接続プールなし環境で安全に実行できる
- Prisma と比較して依存が軽量で Next.js App Router との相性が良い

**Alternatives considered**:
- Prisma: 機能豊富だが生成 client の cold start が重く Serverless 環境で不利
- 生 SQL（`@vercel/postgres`）: 型安全性が低く、スキーマ管理が煩雑になる

---

## 2. NextAuth.js バージョン

**Decision**: NextAuth.js v5（Auth.js）

**Rationale**:
- App Router の Route Handlers・Server Components に対応した公式 v5 が Next.js 16 で推奨
- `next-auth` パッケージ名で v5 をインストール（`npm i next-auth@beta` は不要。`next-auth@5` で安定版）
- Google OAuth プロバイダーは v5 で標準提供

**Alternatives considered**:
- v4: App Router に対応するボイラープレートが多く、コールバックの型が変わっており移行コストがかかる

---

## 3. カーソルベースページネーション方式

**Decision**: 投稿 ID ベースのカーソル（`id < cursor` の降順クエリ）

**Rationale**:
- 投稿は時系列降順（新着順）なので ID 降順で一意にページングできる
- `created_at` はミリ秒衝突の可能性があるため ID を使う方が安全
- カーソルは `id` を文字列 base64 エンコードして不透明にする

**Alternatives considered**:
- offset ページネーション: 投稿の追加・消滅が頻繁なため件数ずれが起きやすい
- `created_at` カーソル: 同時刻の投稿で重複取得リスクがある

---

## 4. デイリーポイントの重複防止

**Decision**: `user_point` テーブルの当日付与レコード存在チェック（`DATE(created_at) = TODAY AND get_point > 0 AND expires_at IS NOT NULL`）

**Rationale**:
- DB 側でべき等チェックを行い、アプリ層での二重処理を防止する
- NextAuth コールバック（`signIn` or `jwt`）で毎回チェック・付与する

---

## 5. 残り時間のカウントダウン表示

**Decision**: クライアントサイドの `setInterval`（1 秒更新）+ `hiddenAt` の ISO 文字列をデータとして渡す

**Rationale**:
- サーバーサイドでレンダリングするとユーザーのローカル時刻とのずれが起きるため、クライアントで計算する
- `CountdownTimer` コンポーネントは `use client` ディレクティブを付与し、`hiddenAt` を props で受け取る

---

## 6. ポイント消費の排他制御

**Decision**: 投稿作成を DB トランザクション内で行う（残高チェック → 投稿 INSERT → ポイント消費 INSERT）

**Rationale**:
- Neon Serverless は HTTP セッション上でトランザクションをサポートする
- `DATABASE_URL_UNPOOLED` を使った `neon()` 接続でトランザクションを発行することで整合性を担保する

---

## 7. 認証ガード（`/post/new`）

**Decision**: `middleware.ts` でセッション有無を確認し、未認証なら `/api/auth/signin` へリダイレクト

**Rationale**:
- Next.js の `middleware.ts` はエッジランタイムで動作し、ページ到達前に認証チェックができる
- NextAuth v5 の `auth()` ヘルパーを middleware から呼び出せる

---

## 8. Next.js 16 固有の注意点

`negotole/AGENTS.md` に「このバージョンは破壊的変更がある。実装前に `node_modules/next/dist/docs/` を参照せよ」との警告あり。実装時は必ず当該ドキュメントを確認すること。
