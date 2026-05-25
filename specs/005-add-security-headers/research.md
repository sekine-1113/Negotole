# Research: セキュリティヘッダーの追加

## 決定事項

### 1. セキュリティヘッダーの設定方法

**Decision**: `next.config.ts` の `headers()` 関数ですべてのセキュリティヘッダーを設定する（CSP はノンスなし）

**Rationale**:
- Next.js 16 では `next.config.ts` の `headers()` が全ルートへのヘッダー適用をサポート
- ノンスベース CSP は **すべてのページを動的レンダリングに強制** し、CDN キャッシュが無効になる（パフォーマンス劣化）
- 本プロジェクトは機密データを扱わない SNS のため、`'unsafe-inline'` を許容した実用的 CSP で十分
- `next.config.ts` での設定はビルド時に解決され、追加のランタイムコストがない

**Alternatives considered**:
- **ノンスベース CSP (`proxy.ts` で per-request 生成)**: より厳格だが全ページ動的レンダリング必須→CDN キャッシュ不可、サーバー負荷増大
- **`proxy.ts` ですべて設定**: Next.js 16 では `proxy.ts` での静的ヘッダー設定も可能だが、`next.config.ts` の方がシンプルで静的解析しやすい

---

### 2. middleware.ts → proxy.ts への移行

**Decision**: `middleware.ts` を `proxy.ts` に名称変更し、既存の認証・レート制限ロジックを移行する

**Rationale**:
- Next.js 16 公式ドキュメント: "The `middleware` file convention is deprecated and has been renamed to `proxy`."
- 既存の `middleware.ts` には auth + rate limit ロジックが実装済み（スペック 003・004 の成果物）
- `proxy.ts` でも同一の `NextRequest`/`NextResponse` API が使用可能
- エクスポート名を `default auth(...)` から `export async function proxy(...)` に変更するだけで移行可能

**Alternatives considered**:
- **移行しない**: 非推奨のまま動作は継続するが、将来のバージョンアップで破壊的変更が発生するリスク

---

### 3. CSP の構成

**Decision**: `'unsafe-inline'` を script-src・style-src に許可した実用的 CSP を `next.config.ts` で設定する

```
default-src 'self';
script-src 'self' 'unsafe-inline' [dev: 'unsafe-eval'];
style-src 'self' 'unsafe-inline';
img-src 'self' blob: data:;
font-src 'self';
object-src 'none';
base-uri 'self';
form-action 'self' https://accounts.google.com;
frame-ancestors 'none';
upgrade-insecure-requests;
```

**Rationale**:
- Next.js App Router の SSR はハイドレーション時にインラインスクリプトを使用するため `unsafe-inline` が必要
- `next/font/google` はビルド時にフォントをセルフホストするため、外部フォント CDN 不要（`font-src 'self'` のみで OK）
- Google OAuth の redirect のため `form-action` に `https://accounts.google.com` を追加
- `frame-ancestors 'none'` は CSP での iframe 制限（`X-Frame-Options: DENY` と同等だが CSP の方がモダン）
- 開発環境では React の eval 使用のため `unsafe-eval` も追加（本番では不要）

**Alternatives considered**:
- **SRI（Subresource Integrity）ベース**: ビルド時にハッシュ生成→静的生成と両立可能だが Experimental 機能。今回は見送り
- **`unsafe-inline` なし + ノンス**: 本来理想的だが、動的レンダリング強制による性能劣化と CDN 非対応が問題

---

### 4. 実装対象ヘッダーの確定値

| ヘッダー | 値 | 根拠 |
|---|---|---|
| `X-Frame-Options` | `DENY` | iframe 埋め込みを全禁止（CSP の `frame-ancestors` で重複設定するが後方互換のため残す） |
| `X-Content-Type-Options` | `nosniff` | MIME スニッフィング防止（唯一の有効値） |
| `Referrer-Policy` | `strict-origin-when-cross-origin` | 同一オリジンは完全 URL、クロスオリジンはオリジンのみ送信 |
| `Permissions-Policy` | `camera=(), microphone=(), geolocation=(), browsing-topics=()` | Negotole では不要なブラウザ機能を無効化 |
| `Content-Security-Policy` | 上記 CSP 文字列 | Next.js 動作要件を満たしつつ XSS リスクを低減 |
