# Research: 管理者用アカウント凍結機能

## Decision 1: 凍結状態のストレージ

**Decision**: `users` テーブルに `banned_at timestamp` カラムを追加（nullable）

**Rationale**:
- `null` = 有効ユーザー、`not null` = 凍結ユーザー というシンプルな設計
- 別テーブル（AccountFreeze）は不要。凍結履歴は `admin_audit_log` が担う
- `bannedAt` の値が凍結日時を兼ねる

**Alternatives considered**:
- `is_banned boolean` フラグ: 凍結日時が取れないため却下
- 別テーブル: 凍結中の判定に JOIN が必要で複雑になるため却下

---

## Decision 2: セッション無効化の仕組み

**Decision**: NextAuth の `jwt` callback で DB の `bannedAt` を確認し、`unstable_cache` + `revalidateTag` でキャッシュする

**Rationale**:
- `jwt` callback は `auth()` 呼び出しのたびに実行される（NextAuth v5 + JWT strategy）
- `unstable_cache` に `user-frozen-{userId}` タグを付け、freeze/unfreeze 時に `revalidateTag` で即時無効化
- Redis 不使用でシンプル。negotole の規模では DB クエリ増加は問題なし
- Next.js の既存キャッシュパターン（`points.ts`）と統一

**Alternatives considered**:
- Redis（Upstash）でキャッシュ: 高速だが設計が複雑・依存追加になるため却下
- JWT の有効期限切れを待つ: 最大24時間遅延でスペック要件を満たさないため却下

---

## Decision 3: 凍結ユーザーの体験

**Decision**: 凍結ユーザーが任意のページにアクセスした際、`middleware.ts` で `/account-suspended` にリダイレクトする

**Rationale**:
- Next.js の middleware は全リクエストを捕捉できる
- ページ・API どちらにも適用できる
- 既存の `admin/layout.tsx` のような個別チェックより網羅的

**Alternatives considered**:
- root `layout.tsx` でチェック: API ルートをカバーできないため却下
- signOut 自動実行: ユーザーに凍結理由を表示できないため却下

---

## Decision 4: ログイン時の凍結ブロック

**Decision**: NextAuth の `signIn` callback で `bannedAt` を DB チェックし、凍結ユーザーのログインを拒否する

**Rationale**:
- `jwt` callback のキャッシュがリセットされても二重に防衛できる
- NextAuth の `signIn` callback で `false` を返すとログインが中断される

---

## Decision 5: 管理 UI の場所

**Decision**: 新規ページ `/admin/users` を作成。既存の admin nav にリンクを追加

**Rationale**:
- キャンペーン管理・投稿管理と同様の構造で実装できる
- 将来的なユーザー管理機能（ロール変更など）の基盤にもなる

---

## Decision 6: ファイル構成

```
新規作成:
  negotole/src/app/admin/users/page.tsx               # 管理ページ（一覧 + 凍結ボタン）
  negotole/src/app/admin/users/FreezeButton.tsx        # 凍結/解除クライアントコンポーネント
  negotole/src/app/api/admin/users/route.ts            # GET /api/admin/users
  negotole/src/app/api/admin/users/[id]/freeze/route.ts   # POST 凍結
  negotole/src/app/api/admin/users/[id]/unfreeze/route.ts # POST 解除
  negotole/src/app/account-suspended/page.tsx          # 凍結通知ページ
  negotole/drizzle/migrations/                         # bannedAt 追加マイグレーション

変更:
  negotole/src/lib/db/schema.ts     # bannedAt カラム追加
  negotole/src/lib/auth.ts          # jwt/signIn callback に凍結チェック追加
  negotole/src/app/admin/layout.tsx # users リンク追加
  negotole/src/middleware.ts        # 新規作成: 凍結ユーザーをリダイレクト
  negotole/src/types/next-auth.d.ts # isFrozen 型追加
```
