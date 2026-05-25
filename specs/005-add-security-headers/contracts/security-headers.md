# Contract: セキュリティヘッダー

すべての HTTP レスポンス（ページ・API）に含まれるべきセキュリティヘッダーの期待値定義。

## 必須ヘッダー一覧

| ヘッダー名 | 期待値 | 適用範囲 |
|---|---|---|
| `X-Frame-Options` | `DENY` | 全ルート |
| `X-Content-Type-Options` | `nosniff` | 全ルート |
| `Referrer-Policy` | `strict-origin-when-cross-origin` | 全ルート |
| `Permissions-Policy` | `camera=(), microphone=(), geolocation=(), browsing-topics=()` | 全ルート |
| `Content-Security-Policy` | 下記参照 | 全ルート |

## CSP 期待値（本番環境）

```
default-src 'self'; script-src 'self' 'unsafe-inline'; style-src 'self' 'unsafe-inline'; img-src 'self' blob: data:; font-src 'self'; object-src 'none'; base-uri 'self'; form-action 'self' https://accounts.google.com; frame-ancestors 'none'; upgrade-insecure-requests;
```

## CSP 期待値（開発環境）

```
default-src 'self'; script-src 'self' 'unsafe-inline' 'unsafe-eval'; style-src 'self' 'unsafe-inline'; img-src 'self' blob: data:; font-src 'self'; object-src 'none'; base-uri 'self'; form-action 'self' https://accounts.google.com; frame-ancestors 'none';
```

## テスト方法

```bash
# 開発サーバー起動後、curl でヘッダー確認
curl -I http://localhost:3000/

# 期待するヘッダーが含まれていることを確認
curl -I http://localhost:3000/ | grep -E "x-frame-options|x-content-type-options|referrer-policy|permissions-policy|content-security-policy"
```

## 非機能要件

- ヘッダーはすべて小文字で返却（HTTP/2 の慣例）
- 既存の認証・レート制限の動作に影響しないこと
- `pnpm test` が引き続き通過すること
