# Research: 構造化ログ・監査ログ・管理者投稿削除機能

## 構造化ログの実装方針

**Decision**: Pino/Winston は導入せず、`console.log/warn/error` を薄くラップした `logger.ts` を作成する。

**Rationale**:
- 追加パッケージ不要でコストゼロ
- Vercel の標準ログ（7日間）に自動的に JSON が表示される
- Pino は Edge Runtime と相性が悪い場合があり、本プロジェクトのシンプルな用途には過剰

---

## IPアドレスの取得方法

**Decision**: Credentials プロバイダーの `authorize` 関数内で `next/headers` の `headers()` を使って `x-forwarded-for` を取得する。Google ログインは JWT コールバックの `profile` が存在するタイミングで `headers()` を試みる。

**Rationale**:
- Next.js の Server Actions/Route Handlers では `headers()` が利用可能
- NextAuth の `authorize` 関数はサーバーサイドで実行されるため `headers()` が使える
- JWT コールバックでも `headers()` が呼べる（Next.js 16 では非同期対応）
- IP 取得に失敗した場合は `null` を記録してログイン自体は継続する

---

## login_log テーブルの設計

**Decision**: `users` テーブルに IP を追加するのではなく、独立した `login_log` テーブルを新設する。

**Rationale**:
- ユーザーは複数デバイス・複数回ログインするため、1:N の関係が正しい
- IP アドレスは個人情報のため、ユーザー情報と分離して管理するほうが清潔
- 保持期間が来たら login_log のみ削除できる

---

## admin_audit_log テーブルの設計

**Decision**: `payload` カラムに JSONB で変更内容のスナップショットを保存する。

**Rationale**:
- キャンペーン名・期間・ポイント数などの変更前後を記録できる
- Drizzle ORM は `json()` カラム型で JSONB を扱える

---

## 管理者投稿削除の実装方針

**Decision**: 
1. 管理画面に `/admin/posts` ページを新設してすべての投稿を一覧表示する
2. `DELETE /api/admin/posts/[id]` Route Handler を新設し、`deleted_at` を設定する論理削除を行う
3. `fetchPosts()` は既に `isNull(posts.deletedAt)` でフィルタしているため、論理削除した投稿は自動的にタイムラインから消える

**Rationale**:
- `posts.ts` の `fetchPosts` を確認: `isNull(posts.deletedAt)` フィルタ済み ✅
- スキーマの `posts` テーブルに `deletedAt` カラムは既に存在する（`commonColumns` より） ✅
- 物理削除を防ぐため、API は PATCH（deleted_at のみ更新）で実装する

---

## 管理者ナビゲーションへの追加

**Decision**: `admin/layout.tsx` の Nav に「投稿管理」リンクを追加する。

---

## 変更ファイル一覧

| ファイル | 変更種別 | 内容 |
|---|---|---|
| `src/lib/logger.ts` | 新規 | 構造化ログ関数 |
| `src/lib/db/schema.ts` | 更新 | `loginLogs`・`adminAuditLogs` テーブル追加 |
| `src/lib/auth.ts` | 更新 | logger 適用・loginLog 記録 |
| `src/app/api/posts/route.ts` | 更新 | logger 適用 |
| `src/app/api/admin/campaigns/route.ts` | 更新 | logger 適用・audit log 記録 |
| `src/app/api/admin/campaigns/[id]/route.ts` | 更新 | logger 適用・audit log 記録 |
| `src/app/api/admin/posts/[id]/route.ts` | 新規 | 投稿論理削除 API |
| `src/app/admin/posts/page.tsx` | 新規 | 投稿管理画面 |
| `src/app/admin/layout.tsx` | 更新 | 「投稿管理」ナビリンク追加 |
| `drizzle/` | 自動生成 | マイグレーション SQL |
