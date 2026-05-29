# Implementation Plan: DB整合性改善・ヘルスチェック

**Branch**: `014-db-integrity-health` | **Date**: 2026-05-30 | **Spec**: [spec.md](./spec.md)

**Input**: Feature specification from `specs/014-db-integrity-health/spec.md`

## Summary

Drizzle スキーマに外部キー制約（user_point・post → app_user、onDelete: cascade）とクエリ最適化インデックス（user_id, expires_at, hidden_at, starts_at/ends_at）を追加し、drizzle-kit でマイグレーションを生成・適用する。あわせて認証不要の `GET /api/health` エンドポイントを新設してアプリケーションとDB の疎通確認を提供する。

## Technical Context

**Language/Version**: TypeScript (Node.js 20)

**Primary Dependencies**:
- Next.js 16.2.6 (App Router)
- Drizzle ORM 0.45.2 + drizzle-kit 0.31.10
- @neondatabase/serverless (PostgreSQL)

**Storage**: PostgreSQL (Neon Serverless)

**Testing**: Vitest（既存）— 今回は手動確認のみ

**Target Platform**: Vercel (Node.js runtime)

**Project Type**: Web application (Next.js monorepo)

**Performance Goals**: インデックス追加後、ポイント集計クエリと投稿フィルタクエリがフルスキャンを回避する

**Constraints**: マイグレーション適用中の DB ロック最小化（`CREATE INDEX` は Neon で短時間ロック）

**Scale/Scope**: 小規模（現状のユーザー数）→ インデックスは将来の性能劣化を予防

## Constitution Check

Constitution が未設定のため省略。違反なし。

## Project Structure

### Documentation (this feature)

```text
specs/014-db-integrity-health/
├── plan.md              # This file
├── research.md          # Phase 0 output
├── data-model.md        # Phase 1 output
├── contracts/
│   └── health-api.md    # Phase 1 output
└── tasks.md             # Phase 2 output (/speckit-tasks command)
```

### Source Code (変更ファイル)

```text
negotole/
├── src/
│   ├── lib/
│   │   └── db/
│   │       └── schema.ts                    # FK + インデックス追加
│   └── app/
│       └── api/
│           └── health/
│               └── route.ts                 # 新規: ヘルスチェックエンドポイント
└── drizzle/
    └── XXXX_add_fk_indexes.sql              # 自動生成されるマイグレーション
```

## Implementation Details

### T1: schema.ts — FK + インデックス追加

`negotole/src/lib/db/schema.ts` を以下のように更新する：

1. インポートに `index` を追加:
   ```typescript
   import { bigint, index, integer, pgTable, text, timestamp, varchar } from "drizzle-orm/pg-core";
   ```

2. `userPoints` テーブル:
   - `userId` カラムに `.references(() => users.id, { onDelete: "cascade" })` を追加
   - 第3引数に `(t) => [index("user_point_user_id_idx").on(t.userId), index("user_point_expires_at_idx").on(t.expiresAt)]`

3. `posts` テーブル:
   - `userId` カラムに `.references(() => users.id, { onDelete: "cascade" })` を追加
   - 第3引数に `(t) => [index("post_hidden_at_idx").on(t.hiddenAt)]`

4. `campaigns` テーブル:
   - 第3引数に `(t) => [index("campaign_starts_ends_idx").on(t.startsAt, t.endsAt)]`

**注意**: `users` テーブルが `userPoints` / `posts` より前に定義されているので循環参照なし。

### T2: マイグレーション生成・適用

```bash
cd negotole
pnpm drizzle-kit generate   # SQL ファイルを drizzle/ に生成
pnpm drizzle-kit migrate    # Neon DB に適用（DATABASE_URL_UNPOOLED が必要）
```

生成される SQL の想定内容:
```sql
ALTER TABLE "user_point" ADD CONSTRAINT "user_point_user_id_app_user_id_fk"
  FOREIGN KEY ("user_id") REFERENCES "app_user"("id") ON DELETE CASCADE;

ALTER TABLE "post" ADD CONSTRAINT "post_user_id_app_user_id_fk"
  FOREIGN KEY ("user_id") REFERENCES "app_user"("id") ON DELETE CASCADE;

CREATE INDEX "user_point_user_id_idx" ON "user_point" ("user_id");
CREATE INDEX "user_point_expires_at_idx" ON "user_point" ("expires_at");
CREATE INDEX "post_hidden_at_idx" ON "post" ("hidden_at");
CREATE INDEX "campaign_starts_ends_idx" ON "campaign" ("starts_at","ends_at");
```

### T3: /api/health エンドポイント

`negotole/src/app/api/health/route.ts` を新規作成：

```typescript
import { db } from "@/lib/db";
import { sql } from "drizzle-orm";
import { NextResponse } from "next/server";

export async function GET() {
  try {
    await db.execute(sql`SELECT 1`);
    return NextResponse.json({ status: "ok", db: "ok" });
  } catch {
    return NextResponse.json({ status: "error", db: "error" }, { status: 503 });
  }
}
```

**認証**: `auth()` を呼ばないため認証不要。middleware.ts が存在しないため追加設定不要。

## Complexity Tracking

違反なし。追加ファイル1件（route.ts）、既存スキーマファイル変更1件、マイグレーション自動生成のみ。
