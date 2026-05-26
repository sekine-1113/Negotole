# Research: 本番 Server Components レンダーエラー修正

## 根本原因の分析

### Decision: 原因は `page.tsx` の HTTP 自己フェッチ

**Rationale**:
`src/app/page.tsx` が SSR 時に自身の API エンドポイントへ HTTP リクエストを送っている。

```typescript
const baseUrl = process.env.NEXTAUTH_URL ?? "http://localhost:3000";
const res = await fetch(`${baseUrl}/api/posts`, { cache: "no-store" });
```

問題点：
1. `NEXTAUTH_URL` が Vercel の本番環境変数に未設定の場合（next-auth v5 ではこの変数は不要として deprecation された）、`http://localhost:3000` にフェッチ → 本番サーバーレス環境では到達不可 → `fetch` がネットワークエラーでスロー → Server Components クラッシュ
2. 仮に正しい URL が設定されていても、Vercel サーバーレス関数から自分自身への HTTP 呼び出しはコールドスタート連鎖・ループ接続・タイムアウト等のリスクがある
3. ローカル開発では `next dev` が常駐サーバーとして動作するため自己フェッチは問題なく動作する

**Alternatives considered**:
- `NEXTAUTH_URL` を Vercel に設定する: 一時的な回避策にはなるが、Server Component → API 自己呼び出しという anti-pattern は残る
- `VERCEL_URL` 環境変数を使う: Vercel が自動設定する変数だが、`https://` プレフィックスがなく加工が必要で根本解決ではない

---

## 修正アーキテクチャの調査

### Decision: DB クエリロジックを共有ライブラリ関数に切り出す

**Rationale**:
Next.js App Router の Server Components は DB やファイルシステムへ**直接**アクセスすべきで、自身の API Route を HTTP 経由で呼ぶべきではない。

```
Before:
  HomePage (Server Component)
    → fetch("http://localhost:3000/api/posts")   ← HTTP リクエスト（問題）
      → route.ts GET → DB クエリ

After:
  HomePage (Server Component)
    → fetchPosts() ← 直接関数呼び出し（正解）
      → DB クエリ

  Client (ブラウザ、無限スクロール)
    → fetch("/api/posts")
      → route.ts GET → fetchPosts() → DB クエリ
```

`src/lib/posts.ts` に `fetchPosts({ cursor?, limit? })` を定義し、Server Component と API Route の両方から呼ぶ。

**Alternatives considered**:
- Server Action を使う: 投稿取得は GET 相当の操作であり、Server Action（POST ベース）は適切でない
- Route Handler を `"use server"` 化する: Route Handler と Server Action は共存できない

---

## 影響範囲

### 変更対象ファイル
| ファイル | 変更内容 |
|----------|----------|
| `negotole/src/lib/posts.ts` | **新規作成**: `fetchPosts()` 関数 |
| `negotole/src/app/page.tsx` | HTTP fetch を `fetchPosts()` 直接呼び出しに置換 |
| `negotole/src/app/api/posts/route.ts` | GET ハンドラを `fetchPosts()` 呼び出しにリファクタリング |

### 変更しないもの
- クライアント側の無限スクロール (`Timeline` コンポーネント) は `/api/posts` への HTTP fetch を継続使用 → 変更不要
- POST ハンドラ・レートリミット・認証ロジック → 変更不要
- `env.ts` 等の環境変数バリデーション → 変更不要

---

## テスト戦略

- 既存の 23 テスト（`pnpm test` in `negotole/`）は `@/lib/db` を `vi.mock` しているためデグレしない
- `fetchPosts()` の直接呼び出しパスを既存の API route テスト（`route.test.ts`）がカバーし続ける
