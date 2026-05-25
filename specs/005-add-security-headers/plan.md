# Implementation Plan: セキュリティヘッダーの追加

**Branch**: `005-add-security-headers` | **Date**: 2026-05-25 | **Spec**: [spec.md](spec.md)

**Input**: Feature specification from `specs/005-add-security-headers/spec.md`

## Summary

Next.js 16 の `next.config.ts` `headers()` 関数を使用して、`X-Frame-Options`・`X-Content-Type-Options`・`Referrer-Policy`・`Permissions-Policy`・`Content-Security-Policy` の 5 種類のセキュリティヘッダーをすべてのレスポンスに付与する。あわせて、Next.js 16 で非推奨となった `middleware.ts` を `proxy.ts` に移行する。

## Technical Context

**Language/Version**: TypeScript / Next.js 16.2.6

**Primary Dependencies**: なし（next.config.ts のみ変更）

**Storage**: N/A

**Testing**: vitest（既存スイートの継続パス確認）

**Target Platform**: Next.js App Router（Vercel / Node.js サーバー）

**Project Type**: Web アプリケーション（BFF + フロントエンド一体型）

**Performance Goals**: ヘッダー追加による性能劣化なし（静的設定のため）

**Constraints**: 既存機能（Google OAuth・投稿・タイムライン・管理者画面）を壊さないこと

**Scale/Scope**: 単一ファイル変更（`next.config.ts` + `middleware.ts` → `proxy.ts`）

## Constitution Check

Constitution は未設定のためゲートチェックはスキップ。

## Project Structure

### Documentation (this feature)

```text
specs/005-add-security-headers/
├── plan.md              # このファイル
├── research.md          # Phase 0 出力（設定方法・CSP 構成の決定）
├── contracts/
│   └── security-headers.md  # セキュリティヘッダーの期待値仕様
└── tasks.md             # /speckit-tasks で生成
```

### Source Code

```text
negotole/
├── next.config.ts           # headers() でセキュリティヘッダーを追加
├── proxy.ts                 # middleware.ts から移行（認証 + レート制限 + セキュリティヘッダー補完）
└── middleware.ts            # 削除（proxy.ts に移行）
```

## Feature Name

セキュリティヘッダーの追加（Add Security Headers）

## Implementation Notes

1. **`next.config.ts` の `headers()`**: `source: '/(.*)'` で全ルートに適用。CSP はノンスなし（`'unsafe-inline'` 許可）。開発環境では `'unsafe-eval'` も追加。

2. **`middleware.ts` → `proxy.ts` 移行**:
   - ファイル名変更: `negotole/middleware.ts` → `negotole/proxy.ts`
   - エクスポート変更: `export default auth(...)` → `export async function proxy(request)` に変更し、auth セッション取得を内部で行う
   - `config.matcher` は `config` のまま維持

3. **CSP の `form-action`**: Google OAuth redirect のため `https://accounts.google.com` を許可

4. **`X-Frame-Options` と `frame-ancestors`**: 両方設定する（`X-Frame-Options` は CSP 未対応の古いブラウザ向け後方互換）

## Complexity Tracking

変更は `next.config.ts` の `headers()` 追加と `proxy.ts` への移行のみ。複雑な追加はなし。
