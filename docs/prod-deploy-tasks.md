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

### ~~1. レートリミッターを API ルートに実際に適用する~~ ✅ 対応済み（021）

**対応内容**（021 でマージ済み）:
- `POST /api/posts` → `postWriteLimiter`（ユーザー ID ベース、10回/60秒、fail-open）
- `GET /api/admin/users`・`POST freeze/unfreeze`・`DELETE /api/admin/posts/[id]` → `adminLimiter`（ユーザー ID ベース、30回/60秒、fail-open）
- Redis 障害時は fail-open（スキップして通す）
- `authLimiter` は NextAuth 管理エンドポイントへの適用が困難なため未適用（NextAuth の route handler は直接編集不可）

---

### ~~2. Sentry エラートラッキングの統合~~ — 今回対応しない（プロトタイプ）

**スキップ理由**: プロトタイプ公開のため見送り。Vercel の標準ログで運用し、ユーザー数・エラー頻度が増えた段階で統合する。

---

### ~~3. OGP / ソーシャルカードメタデータの設定~~ ✅ 対応済み（022）

**対応内容**（022 でマージ済み）:
- `src/app/layout.tsx` に `openGraph` + `twitter` フィールドを追加（title: "negotole", description: "儚く消える、夜のつぶやき", url: `https://negotole.vercel.app`）
- `public/og-image.png`（1200×630px）を追加（現在はダーク単色プレースホルダー。後でテキスト入り画像に差し替え推奨）
- `NEXT_PUBLIC_APP_URL` 環境変数で URL を制御（未設定時は `https://negotole.vercel.app` にフォールバック）

---

### 4. `NEXT_PUBLIC_CONTACT_FORM_URL` / `NEXT_PUBLIC_REPORT_FORM_URL` の確認

**現状**: 2 つの `NEXT_PUBLIC_` 環境変数は `src/env.ts` のバリデーション対象外。未設定だと contact ページのリンクが `href="#"` となり、通報ボタンが機能しない。  
**対応**: Vercel プロジェクトの環境変数に両 URL が設定済みであることを本番デプロイ前に確認する（`env.ts` のサーバー検証には追加できないため、デプロイチェックリストで管理する）。

---

## 🟡 P2 — デプロイ直後に対応

### ~~5. カスタム 404 ページ（`not-found.tsx`）の追加~~ ✅ 対応済み（022）

**対応内容**（022 でマージ済み）:
- `src/app/not-found.tsx` を新規作成（`bg-slate-950` ダークテーマ・「ページが見つかりません」・トップへのリンク）

---

### ~~6. `robots.ts` / `sitemap.ts` の追加~~ ✅ 対応済み（022）

**対応内容**（022 でマージ済み）:
- `src/app/robots.ts` → `Disallow: ["/admin/", "/mypage", "/account-suspended", "/api/"]`、sitemap URL 付き
- `src/app/sitemap.ts` → `/`・`/terms`・`/privacy`・`/contact` の 4 件を収録（投稿は揮発するため除外）

---

### ~~7. 期限切れレコードのクリーンアップ Cron Job~~ — 今回対応しない（プロトタイプ）

**スキップ理由**: プロトタイプ公開のため見送り。`hidden_at` インデックスにより表示クエリの速度は維持されるため、当面は DB 肥大化の影響が出にくい。ユーザー数が増えた段階で Vercel Cron Jobs で対応する。

---

### ~~8. `/admin/users` ページのページネーション追加~~ ✅ 対応済み（021）

**対応内容**（021 でマージ済み）:
- `GET /api/admin/users` をカーソルベースページネーションに書き換え（`limit`/`cursor`/`frozen` パラメータ対応、レスポンス `{ users, nextCursor }`）
- `/admin/users/page.tsx` に「次のページへ」ナビゲーションを追加（凍結フィルタとの組み合わせも対応）

---

### ~~9. `account-suspended` ページのレイアウト分離~~ ✅ 対応済み（022）

**対応内容**（022 でマージ済み）:
- Route Group `src/app/(app)/` を導入し、Root Layout をナビなし最小構成に変更
- 既存ページ（home・post・mypage・contact・terms・privacy・admin）を `(app)/` 配下に移動（URL 変化なし）
- `account-suspended` は Root Layout のみ適用され、Header・BottomNav・FAB が表示されない状態を実現

---

## 🟢 P3 — 運用安定後に対応

### ~~10. API ルートテストの追加~~ ✅ 対応済み（021）

**対応内容**（021 でマージ済み）:
- `POST /api/admin/users/[id]/freeze`（5 ケース: 403・403・404・409・200）
- `POST /api/admin/users/[id]/unfreeze`（4 ケース: 403・403・409・200）
- `GET /api/admin/users`（4 ケース: 403・403・200・400）
- 全 60 テストが `pnpm test` でグリーン

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
| レート制限 | postWriteLimiter・adminLimiter を API ルートに接続（fail-open） | 021 |
| ページネーション | /api/admin/campaigns カーソルページネーション | 015 |
| ページネーション | /api/admin/users カーソルページネーション + UI | 021 |
| テスト | freeze・unfreeze・users GET Vitest ユニットテスト（計 13 ケース） | 021 |
| SEO | OGP メタタグ（openGraph + twitter）・og-image.png（1200×630px） | 022 |
| SEO | robots.txt（Disallow 4 件）・sitemap.xml（公開 4 ページ） | 022 |
| UX | カスタム 404 ページ（ダークテーマ + トップリンク） | 022 |
| UX | account-suspended レイアウト分離（Route Group 導入、ナビなし） | 022 |
| ポイント | キャンペーン・日次ポイント付与ロジック | 016 |
| 管理 | 投稿論理削除 + 監査ログ | 018 |
| 法的ページ | 利用規約・プライバシーポリシー・お問い合わせ | 019 |
| PWA | Service Worker・Web App Manifest | 013 |
