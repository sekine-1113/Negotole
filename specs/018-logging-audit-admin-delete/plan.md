# Implementation Plan: 構造化ログ・監査ログ・管理者投稿削除機能

**Branch**: `018-logging-audit-admin-delete` | **Date**: 2026-06-07 | **Spec**: [spec.md](./spec.md)

**Input**: Feature specification from `specs/018-logging-audit-admin-delete/spec.md`

## Summary

4 つの機能を段階的に実装する。(1) `logger.ts` で JSON 構造化ログを導入し既存の `console.error` を置き換える。(2) `login_log` テーブルでログイン時の IP アドレスを記録する。(3) `admin_audit_log` テーブルでキャンペーン操作を記録する。(4) 管理画面に投稿一覧・論理削除機能を追加し、削除ログを監査テーブルに記録する。

## Technical Context

**Language/Version**: TypeScript (Node.js 20)

**Primary Dependencies**:
- Next.js (App Router) — Server Components + Route Handlers
- Drizzle ORM (`json`, `index` 等の既存パターン)
- `next/headers` — `headers()` で IP アドレスを取得
- `@neondatabase/serverless` (PostgreSQL)
- drizzle-kit（マイグレーション生成・適用）

**Storage**: PostgreSQL (Neon Serverless)

**Testing**: Vitest（既存）— 今回は手動確認のみ

**Target Platform**: Vercel (Node.js runtime)

**Project Type**: Web application (Next.js monorepo — `negotole/` 配下)

**Performance Goals**: ログ記録はメイン処理に影響を与えない（サイレント失敗）

**Constraints**: Vercel Log Drains は使用しない。投稿の物理削除は行わない。

## Constitution Check

Constitution が未設定のため省略。違反なし。

## Project Structure

### Documentation (this feature)

```text
specs/018-logging-audit-admin-delete/
├── plan.md              # This file
├── research.md          # Phase 0 output
├── data-model.md        # Phase 1 output
├── contracts/
│   └── admin-posts-api.md  # Phase 1 output
└── tasks.md             # Phase 2 output (/speckit-tasks command)
```

### Source Code (変更・追加ファイル)

```text
negotole/src/
├── lib/
│   ├── logger.ts                        # 新規: 構造化ログ関数
│   ├── db/
│   │   └── schema.ts                   # 更新: loginLogs・adminAuditLogs テーブル追加
│   └── auth.ts                         # 更新: logger 適用・loginLog 記録
├── app/
│   ├── api/
│   │   ├── posts/
│   │   │   └── route.ts               # 更新: logger 適用
│   │   └── admin/
│   │       ├── campaigns/
│   │       │   ├── route.ts           # 更新: audit log 記録
│   │       │   └── [id]/
│   │       │       └── route.ts       # 更新: audit log 記録
│   │       └── posts/
│   │           └── [id]/
│   │               └── route.ts       # 新規: 論理削除 API
│   └── admin/
│       ├── layout.tsx                  # 更新: 「投稿管理」ナビリンク
│       └── posts/
│           └── page.tsx               # 新規: 投稿管理画面
└── drizzle/
    └── XXXX_add_logging_tables.sql    # 自動生成
```

## Implementation Details

### T1: logger.ts — 構造化ログ関数

```typescript
// src/lib/logger.ts
type LogLevel = "info" | "warn" | "error";

export function log(level: LogLevel, event: string, data?: Record<string, unknown>): void {
  const entry = { ts: new Date().toISOString(), level, event, ...data };
  console[level](JSON.stringify(entry));
}
```

### T2: schema.ts — テーブル追加

`drizzle-orm/pg-core` に `json` を追加インポートし、`loginLogs`・`adminAuditLogs` テーブルを追加する。

### T3: マイグレーション生成・適用

```bash
cd negotole
pnpm drizzle-kit generate
pnpm drizzle-kit migrate
```

### T4: auth.ts — logger 適用 + loginLog 記録

```typescript
import { log } from "./logger";
import { headers } from "next/headers";

// ログイン成功後に loginLog を記録
const headersList = await headers();
const ip = headersList.get("x-forwarded-for")?.split(",")[0]?.trim()
  ?? headersList.get("x-real-ip")
  ?? null;
const userAgent = headersList.get("user-agent") ?? null;

try {
  await db.insert(loginLogs).values({ userId, ipAddress: ip, userAgent });
} catch {
  // サイレント失敗
}

log("info", "auth.login.success", { userId, provider: profile ? "google" : "guest" });
```

既存の `console.error("[auth] ...")` を `log("error", "auth.daily_points_failed", ...)` に置き換える。

### T5: api/posts/route.ts — logger 適用

`console` による出力箇所を `log()` 関数に置き換える。

### T6: api/admin/campaigns/route.ts — audit log 記録

キャンペーン作成（POST）成功後に audit log を INSERT する。管理者の IP は `headers()` から取得。

```typescript
await db.insert(adminAuditLogs).values({
  adminId: Number(session.user.id),
  action: "campaign.create",
  targetType: "campaign",
  targetId: created.id,
  payload: { name, bonusPoints, pointsType },
  ipAddress: ip,
});
```

### T7: api/admin/campaigns/[id]/route.ts — audit log 記録

PATCH（更新）・DELETE（削除）の成功後にそれぞれ audit log を INSERT する。

### T8: api/admin/posts/[id]/route.ts — 投稿論理削除 API（新規）

```typescript
export async function DELETE(_req, { params }) {
  // 認証・認可チェック
  const { id } = await params;
  const postId = Number(id);

  // 存在確認
  const [existing] = await db.select().from(posts)
    .where(and(eq(posts.id, postId), isNull(posts.deletedAt))).limit(1);
  if (!existing) return 404;

  // 論理削除
  await db.update(posts).set({ deletedAt: new Date() }).where(eq(posts.id, postId));

  // 監査ログ
  await db.insert(adminAuditLogs).values({
    adminId, action: "post.delete", targetType: "post", targetId: postId,
    payload: { content: existing.content, userId: existing.userId },
    ipAddress: ip,
  });

  log("info", "post.deleted_by_admin", { postId, adminId });
  return { success: true };
}
```

### T9: admin/posts/page.tsx — 投稿管理画面（新規）

全投稿（削除済み除く）を一覧表示し、各行に「削除」ボタンを設置する。ダークテーマに合わせたスタイルとする。削除ボタンは Client Component として実装する。

### T10: admin/layout.tsx — ナビリンク追加

```tsx
<Link href="/admin/posts" className="text-indigo-300 hover:text-indigo-100 text-sm transition">
  投稿管理
</Link>
```

## Complexity Tracking

違反なし。新規ファイル4件（logger.ts・admin/posts/[id]/route.ts・admin/posts/page.tsx、マイグレーション）、既存ファイル5件更新。
