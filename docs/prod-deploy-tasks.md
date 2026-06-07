# 本番デプロイ前後タスク一覧

**作成日**: 2026-06-07  
**対象ブランチ**: main（020 マージ後の状態を基準）  
**調査範囲**: negotole/ アプリ全体のコード・仕様・既存ドキュメント  
**方針**: プロトタイプ公開のため、#2（Sentry）・#7（Cron クリーンアップ）・#11（E2E テスト）は今回対応しない

---

## 凡例

| 優先度 | 意味 |
|--------|------|
| 🔴 P1 | **デプロイ前に必須** — 未対応のまま公開するとセキュリティ・法的リスクあり |
| 🟡 P2 | **デプロイ直後に対応** — ユーザー体験・運用に影響する問題 |
| 🟢 P3 | **運用安定後に対応** — テスト・将来の拡張性 |

---

## 🔴 P1 — デプロイ前に必須

### 1. レートリミッターを API ルートに実際に適用する

**現状**: `src/lib/ratelimit.ts` に `postWriteLimiter` / `authLimiter` / `adminLimiter` が定義され、Upstash Redis との接続コードも完備している。`src/env.ts` でも `UPSTASH_REDIS_REST_URL` / `UPSTASH_REDIS_REST_TOKEN` を必須として起動時検証している。  
**問題**: 上記 3 つのリミッターを実際に呼び出している API ルートが **0 件**。定義だけで適用されていない。  
**対応**:
- `POST /api/posts` → `postWriteLimiter`（IP ベース or ユーザー ID ベース）
- `POST /api/auth/*`（NextAuth エンドポイント） → `authLimiter`
- `POST /api/admin/*` 系 → `adminLimiter`

各ルート先頭で `await limiter.limit(identifier)` を呼び、`success === false` のとき `429 Too Many Requests` を返す。

---

### ~~2. Sentry エラートラッキングの統合~~ — 今回対応しない（プロトタイプ）

**スキップ理由**: プロトタイプ公開のため見送り。Vercel の標準ログで運用し、ユーザー数・エラー頻度が増えた段階で統合する。

---

### 3. OGP / ソーシャルカードメタデータの設定

**現状**: `src/app/layout.tsx` の `metadata` に `openGraph` / `twitter` フィールドが未設定。SNS でシェアされても画像・説明が表示されない。  
**対応**: `layout.tsx` の `metadata` に以下を追加:

```ts
openGraph: {
  title: "negotole",
  description: "儚く消える、夜のつぶやき",
  url: "https://<ドメイン>",
  siteName: "negotole",
  images: [{ url: "/og-image.png", width: 1200, height: 630 }],
  locale: "ja_JP",
  type: "website",
},
twitter: {
  card: "summary_large_image",
  title: "negotole",
  description: "儚く消える、夜のつぶやき",
  images: ["/og-image.png"],
},
```

加えて `public/og-image.png`（1200×630px）を作成する。

---

### 4. `NEXT_PUBLIC_CONTACT_FORM_URL` / `NEXT_PUBLIC_REPORT_FORM_URL` の確認

**現状**: 2 つの `NEXT_PUBLIC_` 環境変数は `src/env.ts` のバリデーション対象外。未設定だと contact ページのリンクが `href="#"` となり、通報ボタンが機能しない。  
**対応**: Vercel プロジェクトの環境変数に両 URL が設定済みであることを本番デプロイ前に確認する（`env.ts` のサーバー検証には追加できないため、デプロイチェックリストで管理する）。

---

## 🟡 P2 — デプロイ直後に対応

### 5. カスタム 404 ページ（`not-found.tsx`）の追加

**現状**: `src/app/error.tsx` はあるが `src/app/not-found.tsx` がない。存在しないパスへのアクセスで Next.js デフォルトの白い 404 が表示され、デザイン統一が崩れる。  
**対応**: `src/app/not-found.tsx` を作成し、ダークテーマのデザインに合わせた 404 メッセージ＋トップへのリンクを表示する。

---

### 6. `robots.ts` / `sitemap.ts` の追加

**現状**: `robots.txt`・`sitemap.xml` が存在しない。検索エンジンが `/admin/*` や `/mypage` などをクロールしてしまう。  
**対応**:
- `src/app/robots.ts` → `/admin/*`、`/mypage`、`/account-suspended`、`/api/*` を `Disallow`
- `src/app/sitemap.ts` → `/`、`/terms`、`/privacy`、`/contact` を列挙（投稿は揮発するため除外）

---

### ~~7. 期限切れレコードのクリーンアップ Cron Job~~ — 今回対応しない（プロトタイプ）

**スキップ理由**: プロトタイプ公開のため見送り。`hidden_at` インデックスにより表示クエリの速度は維持されるため、当面は DB 肥大化の影響が出にくい。ユーザー数が増えた段階で Vercel Cron Jobs で対応する。

---

### 8. `/admin/users` ページのページネーション追加

**現状**: `GET /api/admin/users` と `/admin/users/page.tsx` はユーザー全件を `LIMIT` なしで取得している。ユーザー数が増えると DB・メモリ・転送量すべてに悪影響が出る。  
**対応**: カーソルベースのページネーションを追加する（`/api/admin/campaigns` の実装パターンを流用）。

---

### 9. `account-suspended` ページのレイアウト分離

**現状**: `/account-suspended` は root layout を引き継ぐため、Header・BottomNav・FAB が表示される。凍結されたユーザーがこれらのリンクをクリックしても proxy でリダイレクトされ戻るが、UX が混乱しやすい。  
**対応**: `src/app/account-suspended/layout.tsx` を作成して root layout から独立させ、最小限の表示のみにする（または root layout でパスを条件分岐する）。

---

## 🟢 P3 — 運用安定後に対応

### 10. API ルートテストの追加

**現状**: 以下のルートにテストがない:
- `POST /api/admin/users/[id]/freeze`
- `POST /api/admin/users/[id]/unfreeze`
- `GET /api/admin/users`
- `DELETE /api/admin/posts/[id]`

**対応**: 既存の `src/app/api/admin/campaigns/__tests__/route.test.ts` パターンを参考に Vitest + `msw` でモックテストを追加する。特に凍結フローと権限チェックのテストを優先する。

---

### ~~11. E2E テストの追加~~ — 今回対応しない（プロトタイプ）

**スキップ理由**: プロトタイプ公開のため見送り。手動確認で運用し、機能が安定した段階で Playwright を導入する。

---

## デプロイチェックリスト（最終確認用）

本番公開直前に手動で確認する項目:

```
[ ] UPSTASH_REDIS_REST_URL / TOKEN が Vercel 環境変数に設定されている
[ ] NEXT_PUBLIC_CONTACT_FORM_URL が設定され、Google フォームが正常に動作する
[ ] NEXT_PUBLIC_REPORT_FORM_URL が設定され、通報リンクに postId が付与される
[ ] AUTH_SECRET が安全なランダム値（openssl rand -base64 32 で生成）
[ ] カスタムドメインに HTTPS が適用されている（Vercel は自動）
[ ] /api/health にアクセスして {"status":"ok","db":"ok"} が返ること
[ ] 管理者アカウント（role = "admin"）が DB に存在すること
[ ] 利用規約・プライバシーポリシーページが表示されること
[ ] P1 #1 レートリミット: 短時間に連続投稿して 429 が返ること
```

---

## 参考：対応済み項目（本ドキュメント作成時点）

| 領域 | 実装内容 | specs |
|------|----------|-------|
| セキュリティ | CSP・X-Frame-Options 等のセキュリティヘッダー | 005 |
| セキュリティ | 投稿作成の Race Condition 修正（DB トランザクション） | 003 |
| セキュリティ | カーソルパラメータのバリデーション | 006 |
| 認証 | Google OAuth / ゲストログイン | 001, 013 |
| 認証 | アカウント凍結（bannedAt・proxy リダイレクト） | 020 |
| 環境変数 | 起動時 Zod バリデーション（env.ts） | 007 |
| ログ | 構造化ログ（logger.ts + console[level]） | 018 |
| ログ | ログイン IP の login_log 記録 | 018 |
| 監査 | 管理者操作の admin_audit_log 記録 | 018 |
| DB | 外部キー制約・インデックス追加 | 014 |
| DB | ヘルスチェックエンドポイント（/api/health） | 014 |
| DB 縮退 | 接続エラー時のフォールバック（空表示） | 008 |
| 可観測性 | Vercel Analytics + Speed Insights | — |
| レート制限 | Upstash Ratelimit ライブラリ定義（未適用） | 004 |
| ページネーション | /api/admin/campaigns カーソルページネーション | 015 |
| ポイント | キャンペーン・日次ポイント付与ロジック | 016 |
| 管理 | 投稿論理削除 + 監査ログ | 018 |
| 法的ページ | 利用規約・プライバシーポリシー・お問い合わせ | 019 |
| PWA | Service Worker・Web App Manifest | 013 |
