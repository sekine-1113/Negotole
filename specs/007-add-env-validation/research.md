# Research: 環境変数の起動時バリデーション

**Date**: 2026-05-26
**Feature**: 環境変数の起動時バリデーション

## バリデーション方式の決定

### Decision
Zod の `z.object().safeParse(process.env)` を使用し、失敗時に欠如変数を列挙してプロセスを終了させる。

### Rationale
- `safeParse()` はすべての検証エラーを一度に収集 → FR-004（複数変数を一括報告）を自然に満たせる
- Zod のエラー形式（`fieldErrors`）で変数名と理由を明確に表示できる
- 型安全な環境変数オブジェクトを export できるため、既存コードの `process.env.X!` を置き換え可能

### Alternatives Considered

| 選択肢 | 評価 | 却下理由 |
|--------|------|---------|
| 手動 `if (!process.env.X) throw` | 可 | 変数が増えるたびに条件追加が必要 |
| `t3-oss/env-nextjs` ライブラリ | 過剰 | 追加依存を増やすほどの機能差がない |
| `dotenv/config` の validate | 不適合 | Next.js は自前で env ロードするため |

## バリデーション実行タイミング

### Decision
`negotole/src/env.ts` を作成し、`next.config.ts` の先頭でインポートする。

### Rationale
`next.config.ts` はビルド時・サーバー起動時の両方で最初に実行されるため、リクエスト処理前に確実にバリデーションが走る。

### Implementation

```typescript
// negotole/src/env.ts
import { z } from "zod";

const envSchema = z.object({
  AUTH_SECRET: z.string().min(1, "AUTH_SECRET is required"),
  AUTH_GOOGLE_ID: z.string().min(1, "AUTH_GOOGLE_ID is required"),
  AUTH_GOOGLE_SECRET: z.string().min(1, "AUTH_GOOGLE_SECRET is required"),
  DATABASE_URL: z.string().min(1, "DATABASE_URL is required"),
  DATABASE_URL_UNPOOLED: z.string().min(1, "DATABASE_URL_UNPOOLED is required"),
  UPSTASH_REDIS_REST_URL: z.string().min(1, "UPSTASH_REDIS_REST_URL is required"),
  UPSTASH_REDIS_REST_TOKEN: z.string().min(1, "UPSTASH_REDIS_REST_TOKEN is required"),
});

const parsed = envSchema.safeParse(process.env);

if (!parsed.success) {
  console.error("❌ Missing required environment variables:");
  const { fieldErrors } = parsed.error.flatten();
  for (const [key, errors] of Object.entries(fieldErrors)) {
    console.error(`  - ${key}: ${errors?.join(", ")}`);
  }
  throw new Error("Server startup failed: missing required environment variables.");
}

export const env = parsed.data;
```

```typescript
// negotole/next.config.ts の先頭に追加
import "./src/env"; // 起動時バリデーション
```

## Zod の依存関係

Zod は `next-auth` の transitive dependency として `node_modules` に存在するが、direct dependency として追加すべき。

```bash
pnpm add zod --filter negotole
```

## テスト方針

`env.ts` のユニットテストは Vitest で `process.env` をモックして検証する。
- 全変数設定済み → バリデーション成功・`env` オブジェクト返却
- 一部変数欠如 → `Error` がスローされる
- 空文字列 → 欠如と同様に扱われる
