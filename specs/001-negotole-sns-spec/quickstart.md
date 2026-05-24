# Quickstart: Negotole 開発環境セットアップ

---

## 前提条件

- Node.js 20+
- pnpm
- Vercel アカウント（Neon DB 作成済み）
- Google Cloud Console でプロジェクト作成済み（OAuth クライアント ID）

---

## 1. 依存パッケージのインストール

```bash
cd negotole
pnpm install

# 追加パッケージ（未インストールのもの）
pnpm add next-auth@5 @auth/drizzle-adapter
pnpm add drizzle-orm @neondatabase/serverless
pnpm add -D drizzle-kit
```

---

## 2. 環境変数の設定

`.env.local` は Vercel Neon から自動生成済み。以下を追記する:

```bash
# NextAuth
AUTH_SECRET=<openssl rand -base64 32 で生成>
AUTH_GOOGLE_ID=<Google OAuth クライアント ID>
AUTH_GOOGLE_SECRET=<Google OAuth クライアントシークレット>
```

---

## 3. Drizzle スキーマの作成とマイグレーション

```bash
# スキーマ定義後にマイグレーションファイルを生成
pnpm drizzle-kit generate

# Neon に適用（DATABASE_URL_UNPOOLED を使用）
pnpm drizzle-kit migrate
```

---

## 4. 開発サーバーの起動

```bash
pnpm dev
```

ブラウザで `http://localhost:3000` を開く。

---

## 5. Google OAuth の設定

Google Cloud Console で以下を設定:

- 承認済みリダイレクト URI: `http://localhost:3000/api/auth/callback/google`
- 本番用: `https://<your-domain>/api/auth/callback/google`

---

## ディレクトリ構成（実装後）

```
negotole/
├── src/
│   ├── app/                 # Pages + BFF Route Handlers
│   ├── components/          # React コンポーネント
│   └── lib/
│       ├── db/
│       │   ├── index.ts     # Neon 接続インスタンス
│       │   └── schema.ts    # Drizzle テーブル定義
│       ├── auth.ts          # NextAuth 設定
│       └── points.ts        # ポイント集計ユーティリティ
├── middleware.ts             # 認証ガード
├── drizzle.config.ts
└── .env.local
```

---

## 動作確認チェックリスト

- [ ] `http://localhost:3000` でタイムラインが表示される（ログイン不要）
- [ ] Google でログインするとポイント（10pt）が付与される
- [ ] `/post/new` でテキストと制限時間を選択して投稿できる
- [ ] 投稿後、ポイントが 1pt 減っている
- [ ] タイムラインに投稿が表示され、残り時間がカウントダウンされる
