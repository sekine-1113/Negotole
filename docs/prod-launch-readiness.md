# 本番公開レディネス評価

**調査日**: 2026-06-07  
**調査ブランチ**: `022-prod-ui-seo`  
**結論**: **条件付き公開可能** — P1 対処事項が 1 件（CSP 修正）あり、対応後にデプロイ推奨

---

## 総合判定

| カテゴリ | 状態 | 詳細 |
|---------|------|------|
| セキュリティヘッダー | ⚠️ 要修正 | CSP `connect-src` 不足（下記参照） |
| 認証・認可 | ✅ 問題なし | Google OAuth + ゲストログイン、凍結チェック実装済み |
| レート制限 | ✅ 問題なし | postWriteLimiter / adminLimiter 適用済み（fail-open） |
| 法的ページ | ✅ 問題なし | 利用規約・プライバシーポリシー・お問い合わせ 実装済み |
| SEO / OGP | ✅ 問題なし（画像除く） | robots.txt・sitemap.xml・OGP メタタグ 実装済み |
| カスタム 404 | ✅ 問題なし | not-found.tsx 実装済み |
| account-suspended | ✅ 問題なし | Route Group でナビ分離済み |
| 環境変数バリデーション | ✅ 問題なし | env.ts で Zod 起動時チェック済み |
| Google フォーム URL | ⚠️ デプロイ前に手動確認 | Vercel 環境変数の設定状況不明 |
| OGP 画像 | ℹ️ 後日差し替え推奨 | 現在はダーク単色プレースホルダー |
| ゲストユーザー蓄積 | ℹ️ 監視推奨 | Cron クリーンアップ未対応のため蓄積 |

---

## P1 — デプロイ前に修正すべき事項

### CSP `connect-src` の不足（Vercel Analytics/Speed Insights が機能しない）

**問題**: `next.config.ts` の CSP には `connect-src` ディレクティブが設定されていない。`default-src 'self'` がフォールバックとなり、`@vercel/analytics` と `@vercel/speed-insights` が `https://vitals.vercel-insights.com` に送信するビーコンが CSP 違反でブロックされる。

**影響**: Vercel ダッシュボードのアクセス統計・Core Web Vitals データが収集されない。

**修正箇所**: `negotole/next.config.ts`

```diff
 const cspValue = [
   "default-src 'self'",
   isDev
     ? "script-src 'self' 'unsafe-inline' 'unsafe-eval'"
     : "script-src 'self' 'unsafe-inline'",
   "style-src 'self' 'unsafe-inline'",
   "img-src 'self' blob: data:",
   "font-src 'self'",
+  "connect-src 'self' https://vitals.vercel-insights.com",
   "object-src 'none'",
   "base-uri 'self'",
   "form-action 'self' https://accounts.google.com",
   "frame-ancestors 'none'",
   ...(isDev ? [] : ["upgrade-insecure-requests"]),
 ]
```

---

## デプロイ前に手動確認すべき事項

### Google フォーム URL の設定

**確認項目**:
- Vercel プロジェクトの環境変数に `NEXT_PUBLIC_CONTACT_FORM_URL` が実在する Google フォーム URL で設定されているか
- Vercel プロジェクトの環境変数に `NEXT_PUBLIC_REPORT_FORM_URL` が実在する Google フォーム URL で設定されているか（クエリパラメータ `?entry.1354923048={postId}` が付与される形式）

**未設定時の挙動**: contact ページのボタンと通報ボタンが `href="#"` のダミーリンクになる（クラッシュはしない）

**参考**: `.env.local.example` にフォーマット例あり

---

## デプロイ後に確認すべき事項

既存の `docs/prod-deploy-tasks.md` のデプロイチェックリスト全項目に加え、以下を確認:

```
[ ] NEXT_PUBLIC_CONTACT_FORM_URL が動作する（フォームが実際に開けるか）
[ ] NEXT_PUBLIC_REPORT_FORM_URL が動作する（postId が URL に付与されるか）
[ ] Vercel Analytics / Speed Insights がダッシュボードでデータを受信しているか
[ ] ゲストログインでユーザーが作成できるか（認証フロー確認）
```

---

## 追加情報（運用上の注意）

### ゲストユーザーの蓄積

ゲストログイン (`Credentials` provider) はログインのたびに `users` テーブルに新規レコードを挿入する。クリーンアップ Cron Job は今回スキップのため、ゲストユーザーが蓄積し続ける。`name = "ゲスト"` かつ `email IS NULL` なレコードが増加していくため、定期的な DB 監視を推奨する。

### OGP 画像の差し替え

`public/og-image.png` は現在ダーク単色の 1200×630px プレースホルダー。SNS でシェアされた際に目を引くよう、サービス名・キャッチコピーを入れたテキスト入り画像への差し替えを推奨。

---

## 既存タスクの対応状況サマリー

| タスク | ステータス | spec |
|--------|-----------|------|
| レートリミッター適用 | ✅ 対応済み | 021 |
| Sentry 統合 | ⏭️ 今回スキップ | — |
| OGP メタタグ | ✅ 対応済み | 022 |
| Google フォーム URL 確認 | ⚠️ デプロイ前に手動確認 | — |
| カスタム 404 | ✅ 対応済み | 022 |
| robots.txt / sitemap.xml | ✅ 対応済み | 022 |
| Cron クリーンアップ | ⏭️ 今回スキップ | — |
| /admin/users ページネーション | ✅ 対応済み | 021 |
| account-suspended レイアウト分離 | ✅ 対応済み | 022 |
| API ルートテスト | ✅ 対応済み | 021 |
| E2E テスト | ⏭️ 今回スキップ | — |
