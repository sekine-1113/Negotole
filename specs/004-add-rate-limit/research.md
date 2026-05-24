# Research: レート制限の追加

**Date**: 2026-05-25

---

## 1. レート制限ライブラリの選択

**Decision**: `@upstash/ratelimit` + `@upstash/redis` を使用する。

**Rationale**:
- Vercel Serverless Functions はリクエストをまたいで状態を保持できないため、インメモリのレート制限（Map など）は複数インスタンス間で共有できない
- Upstash Redis は HTTP ベースの Serverless Redis であり、Vercel 環境で追加の接続設定なしに使える
- `@upstash/ratelimit` は Upstash Redis をバックエンドとした Serverless 向けレート制限ライブラリで、スライディングウィンドウ・固定ウィンドウ・トークンバケットのアルゴリズムを提供する
- Next.js の Edge Runtime・Node.js Runtime 両方で動作する

**Alternatives considered**:
- `express-rate-limit`: Node.js 向けミドルウェアで Vercel Serverless 環境では状態共有不可。除外。
- `rate-limiter-flexible`: Node.js 向けで同様の問題あり。除外。
- Vercel Edge Middleware + KV: Vercel KV（Upstash Redis ベース）でも同等だが、プロジェクトは Neon PostgreSQL を使用しており Vercel KV は追加コスト。Upstash 直接接続が柔軟。
- DB（Neon PostgreSQL）でのレート制限管理: レートチェックのたびに DB クエリが発生し、レイテンシとコストが増大する。除外。

---

## 2. 実装場所の選択

**Decision**: Next.js ミドルウェア（`middleware.ts`）でレート制限を適用する。

**Rationale**:
- ミドルウェアは Route Handler が実行される前に動作し、すべての API リクエストを一箇所でフィルタリングできる
- 現在の `middleware.ts` はすでに `auth()` wrapper を使っており、認証情報が利用可能
- matcher を `/api/:path*` に拡張することで、投稿・認証・管理者 API すべてに対して共通ロジックを適用できる
- Route Handler 内での個別実装より保守性が高い

**Alternatives considered**:
- 各 Route Handler 内に個別に実装: 重複コードが増え、漏れが発生しやすい。除外。
- Vercel Edge Middleware のみ: 現在のプロジェクト構成では認証情報の取得が複雑になる。除外。

---

## 3. 制限アルゴリズムの選択

**Decision**: スライディングウィンドウ（Sliding Window）アルゴリズムを使用する。

**Rationale**:
- 固定ウィンドウはウィンドウ境界でバーストが発生しやすい（ウィンドウ開始直後に集中攻撃が可能）
- スライディングウィンドウは時間的に均等なレート制限を実現し、ユーザー体験が予測可能
- `@upstash/ratelimit` の `slidingWindow()` が対応しており、実装が容易

---

## 4. 制限識別子の設計

**Decision**:
- 認証済みエンドポイント（`POST /api/posts`, `/api/admin/*`）: ユーザー ID を識別子とする
- 認証エンドポイント（`/api/auth/*`）: IP アドレスを識別子とする

**Rationale**:
- ユーザー ID ベースの制限: 同一ユーザーが複数デバイスから送るリクエストを合算できる。VPN・プロキシを使った IP 変更による制限回避を防止できる
- IP ベースの制限（認証エンドポイント）: 未認証状態ではユーザー ID が不明なため IP で制限する

---

## 5. 制限値の設計

| エンドポイントグループ | 識別子 | 制限 | ウィンドウ |
|---|---|---|---|
| `POST /api/posts` | ユーザー ID | 10 回 | 1 分 |
| `GET /api/posts` | — | 制限なし（読み取り専用・重い処理なし） |
| `/api/auth/*` | IP アドレス | 20 回 | 1 分 |
| `/api/admin/*` | ユーザー ID | 30 回 | 1 分 |

**Rationale**:
- `POST /api/posts` の 10 回/分: 通常の人間が 1 分に 10 回以上投稿するケースは非現実的。ポイント残高が 0 になった後の連続試行も防止
- 認証の 20 回/分: Google OAuth の正常フローは 1 回のリダイレクトで完結するため、20 回は十分余裕がある
- 管理者 API の 30 回/分: 一括操作やデバッグ用途を考慮してやや緩め

---

## 6. 必要な環境変数

```
UPSTASH_REDIS_REST_URL=https://xxx.upstash.io
UPSTASH_REDIS_REST_TOKEN=xxx
```

Upstash のダッシュボードで無料プラン（10k commands/day）を利用可能。

---

## 結論

`@upstash/ratelimit` をミドルウェアに統合する方針が最適。スキーマ変更なし、追加インフラは Upstash Redis のみ。実装は `middleware.ts` の拡張と `src/lib/ratelimit.ts` の新規作成で対応する。
