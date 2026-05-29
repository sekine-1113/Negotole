# Research: ゲストログイン限定化 & PWA対応

**Branch**: `013-guest-login-pwa` | **Date**: 2026-05-28

## 1. ゲスト認証実装方式

**Decision**: NextAuth v5 beta の `Credentials` プロバイダーを追加し、ゲストログイン時にDBへゲストユーザーレコードを生成する方式を採用

**Rationale**:
- `posts.userId` が `NOT NULL` であるため、投稿するにはDB上のユーザーIDが必須
- `users.email` が nullable かつ unique（PostgreSQL は複数の NULL を unique と見なさない）なので、スキーママイグレーション不要
- NextAuth の既存 JWT セッション基盤を再利用でき、ポイント付与などの既存ロジックをほぼそのまま使える

**Implementation**:
- `src/lib/auth.ts` に `Credentials` プロバイダーを追加
- `authorize()` 内で `name = "ゲスト"`, `email = null` のユーザーをDBに INSERT し userId を返す
- JWT callback に `if (user?.id && !profile)` ブランチを追加してゲストの userId をセット
- Header.tsx のログインフォームを "Googleでログイン" → "ゲストとしてログイン" に変更（Google フォームは削除）

**Alternatives considered**:
- **DBなし完全ステートレスゲスト**: JWT に仮 userId を載せ DB を使わない案 → posts/user_points の外部キー制約を満たせないため却下
- **Google は維持してゲストを追加（併存）**: プロトタイプ要件が「Googleを非表示にする」なので併存は要件不適合、却下

---

## 2. PWA マニフェスト生成

**Decision**: Next.js App Router 標準の `app/manifest.ts`（`MetadataRoute.Manifest`）を使用

**Rationale**:
- Next.js 16 公式 PWA ガイドに明示されている方法
- 追加パッケージ不要、`/manifest.webmanifest` エンドポイントが自動生成される
- 既存の CSP ヘッダー設定と干渉しない

**Alternatives considered**:
- `next-pwa` npm パッケージ: 長期間メンテナンスされておらず Next.js 15+ との互換性に問題あり、却下
- `@ducanh2912/next-pwa`: 有力な代替だが本機能のキャッシュ要件がシンプルなためオーバースペック、却下

---

## 3. サービスワーカー実装

**Decision**: `public/sw.js` に手動でサービスワーカーを実装し、ルートレイアウトにクライアントコンポーネントで登録する

**Caching Strategy**: Cache-first（静的アセット向け）— `install` イベントで JS/CSS/フォント/アイコンをキャッシュに登録、`fetch` イベントでキャッシュヒット時はキャッシュから返し、ミス時はネットワークへフォールバック

**Rationale**:
- スペック Q2 でキャッシュ対象は「静的アセットのみ」と決定済み
- API レスポンスはキャッシュしないため、タイムラインの一貫性が保たれる
- 手動実装により Workbox などの追加依存なしに最小限のコードで実現可能

**Service Worker Registration**:
- `app/layout.tsx` に `ServiceWorkerRegistrar` クライアントコンポーネントを追加
- `useEffect` 内で `navigator.serviceWorker.register('/sw.js')` を呼ぶ
- `next.config.ts` に `/sw.js` 向けヘッダーを追加（`Content-Type: application/javascript`, `Cache-Control: no-cache`）

**Alternatives considered**:
- Serwist (Next.js + Workbox): webpack 設定が必要で現在の Turbopack 環境と相性が悪い、却下

---

## 4. PWA アイコン生成

**Decision**: Node.js の組み込み機能のみで SVG → PNG を生成するスクリプトを作成し、`public/icons/` に配置する

**Icon Design**: ブランドカラー（インディゴ #6366f1 → パープル #9333ea）のグラデーション円形背景に白い月アイコン（Unicode ☽ 文字を SVG text 要素で表現）

**Sizes**: 192×192、512×512（PWA 要件の最低基準）

**Rationale**:
- `sharp` や `canvas` npm パッケージなしに PNG バイナリを直接生成するには複雑なため、実装では SVG → PNG 変換に Node.js の基本機能を使う
- ただし `sharp` がなければ代替として SVG アイコンを PNG として保存する形式（ブラウザが受け入れる方法）を使用

---

## 5. CSP（Content Security Policy）更新

**Decision**: `next.config.ts` に `/sw.js` 専用ヘッダーを追加するのみ。既存のグローバル CSP 変更は不要

**Rationale**:
- サービスワーカーはオリジン自身から提供されるため `script-src 'self'` で動作
- ゲスト認証は `Credentials` プロバイダーを通じてサーバーサイドで動作するため CSP の `form-action` 変更不要（`form-action 'self'` で十分）
- `manifest.webmanifest` は Next.js サーバーが同一オリジンから配信するため追加設定不要

**Next.js 16 PWA ガイドに従うヘッダー**:
```
/sw.js → Content-Type: application/javascript; charset=utf-8
         Cache-Control: no-cache, no-store, must-revalidate
         Content-Security-Policy: default-src 'self'; script-src 'self'
```

---

## 6. 既存セッションとの共存

**Decision**: Google ログインセッションは維持。auth.ts への Google プロバイダーはそのまま残す

**Rationale**:
- FR-004「既存の Google ログインセッションを持つユーザーは引き続き利用できる」
- バックエンドの Google OAuth 設定は変更しない（プロトタイプ要件）
- 変更するのは Header.tsx の UI のみ（Google ログインボタンを削除し、ゲストボタンのみ表示）
- 既存 Google セッションを持つユーザーはログアウトするまで利用継続できる
