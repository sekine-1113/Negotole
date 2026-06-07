# Implementation Plan: 本番公開準備（レートリミット・ページネーション・APIテスト）

**Branch**: `021-prod-readiness` | **Date**: 2026-06-07 | **Spec**: specs/021-prod-readiness/spec.md

## Summary

`ratelimit.ts` に定義済みの Upstash レートリミッターを `POST /api/posts` と `/api/admin/*` ルートに接続し、`GET /api/admin/users` にカーソルベースページネーションを追加し、凍結・解除・ユーザー一覧 API に Vitest ユニットテストを追加する。フォーム URL 確認はデプロイチェックリスト済みのためコード変更なし。

## Technical Context

**Language/Version**: TypeScript 5 / Node.js 22

**Primary Dependencies**:
- Next.js 16 App Router (`proxy.ts` ベースのミドルウェア)
- Upstash `@upstash/ratelimit` + `@upstash/redis` — `src/lib/ratelimit.ts` に `postWriteLimiter`, `adminLimiter` を export 済み
- Drizzle ORM — `src/lib/db/schema.ts` の `users` テーブルに `bannedAt` カラム追加済み
- Vitest — 既存の `campaigns/__tests__/route.test.ts` パターンを踏襲

**Storage**: Neon PostgreSQL（DB変更なし） + Upstash Redis（レートリミットバケット）

**Testing**: Vitest + `vi.mock` / `vi.hoisted`

**Target Platform**: Vercel（Next.js 16 Edge / Node.js runtime）

**Performance Goals**: 429 レスポンスは 50ms 以内

**Constraints**:
- Redis 障害時は fail-open（スキップして通す）
- `ratelimit.ts` の `createLimiters()` が env 未設定時に `null` を返すため、各 API ルートは null チェック必須

## Constitution Check

- 既存テーブルへの変更なし → スキーマ変更 0
- 新規ファイルは `__tests__/route.test.ts` のみ（既存パターンの踏襲）
- 外部依存の追加なし（既インストール済み）

ゲート違反: なし

## Project Structure

### Documentation (this feature)

```text
specs/021-prod-readiness/
├── plan.md              # This file
├── spec.md              # Feature specification
├── research.md          # 5 decisions
├── data-model.md        # No DB changes
├── contracts/
│   └── api.md           # API contract changes
└── tasks.md             # /speckit-tasks で生成
```

### Source Code (変更・作成するファイル)

```text
negotole/src/
├── app/
│   ├── api/
│   │   ├── posts/
│   │   │   └── route.ts                    # MODIFY: postWriteLimiter 追加
│   │   └── admin/
│   │       ├── users/
│   │       │   ├── route.ts                # MODIFY: ページネーション + adminLimiter
│   │       │   ├── [id]/
│   │       │   │   ├── freeze/
│   │       │   │   │   ├── route.ts        # MODIFY: adminLimiter 追加
│   │       │   │   │   └── __tests__/
│   │       │   │   │       └── route.test.ts  # CREATE: freeze テスト
│   │       │   │   └── unfreeze/
│   │       │   │       ├── route.ts        # MODIFY: adminLimiter 追加
│   │       │   │       └── __tests__/
│   │       │   │           └── route.test.ts  # CREATE: unfreeze テスト
│   │       │   └── __tests__/
│   │       │       └── route.test.ts       # CREATE: GET /admin/users テスト
│   │       └── posts/
│   │           └── [id]/
│   │               └── route.ts            # MODIFY: adminLimiter 追加
│   └── admin/
│       └── users/
│           └── page.tsx                    # MODIFY: ページネーション対応 UI
└── lib/
    └── ratelimit.ts                        # NO CHANGE（既存のまま使用）
```

## Implementation Strategy

### US1: レートリミット適用

**対象ファイルと変更内容**

各ルートに以下のパターンを適用する（`research.md` Decision 2 の fail-open パターン）:

```ts
import { postWriteLimiter } from "@/lib/ratelimit"; // または adminLimiter
import { log } from "@/lib/logger";

// session 取得後、メイン処理の前に挿入
const userId = Number(session.user.id);
if (postWriteLimiter) {
  try {
    const { success } = await postWriteLimiter.limit(`user:${userId}`);
    if (!success) return NextResponse.json({ error: "Too Many Requests" }, { status: 429 });
  } catch (e) {
    log("warn", "ratelimit.check_failed", { userId, error: String(e) });
  }
}
```

**適用箇所**:
1. `src/app/api/posts/route.ts` — `POST` ハンドラ: `postWriteLimiter`
2. `src/app/api/admin/users/route.ts` — `GET` ハンドラ: `adminLimiter`
3. `src/app/api/admin/users/[id]/freeze/route.ts` — `POST` ハンドラ: `adminLimiter`
4. `src/app/api/admin/users/[id]/unfreeze/route.ts` — `POST` ハンドラ: `adminLimiter`
5. `src/app/api/admin/posts/[id]/route.ts` — `DELETE` ハンドラ: `adminLimiter`

識別子は `session.user.id`（認証済みルートのため常に取得可能）。

---

### US3: /admin/users ページネーション

**`src/app/api/admin/users/route.ts` の変更**

既存の全件取得を、`campaigns/route.ts` のカーソルパターンと同じ実装に置き換える:

```ts
const { searchParams } = new URL(req.url);
const rawLimit = Number(searchParams.get("limit") ?? 20);
const limit = Number.isInteger(rawLimit) && rawLimit >= 1 ? Math.min(rawLimit, 100) : 20;
const cursor = searchParams.get("cursor");
const frozen = searchParams.get("frozen") === "true";

let cursorId: number | null = null;
if (cursor) {
  const decoded = Number(Buffer.from(cursor, "base64").toString());
  if (!Number.isSafeInteger(decoded) || decoded <= 0) {
    return NextResponse.json({ error: "Invalid cursor" }, { status: 400 });
  }
  cursorId = decoded;
}

const rows = await db
  .select({ id, name, email, role, bannedAt, createdAt })
  .from(users)
  .where(and(
    cursorId ? gt(users.id, cursorId) : undefined,
    frozen ? isNotNull(users.bannedAt) : undefined,
  ))
  .orderBy(users.id)
  .limit(limit + 1);

const hasMore = rows.length > limit;
const items = hasMore ? rows.slice(0, limit) : rows;
const nextCursor = hasMore
  ? Buffer.from(String(items[items.length - 1].id)).toString("base64")
  : null;

return NextResponse.json({ users: items, nextCursor });
```

**注意**: ユーザー ID は昇順（`id > cursorId`）でページングする（campaigns は降順だが users は昇順の方が自然）。

**`src/app/admin/users/page.tsx` の変更**

`searchParams` から `cursor` と `frozen` を受け取り、API に渡してページネーション UI を追加する:

```tsx
// props: { searchParams: { cursor?: string; frozen?: string } }
// 次ページリンク: ?cursor=<nextCursor>&frozen=<frozen>
// 前ページは実装しない（シンプル化のため）
```

---

### US4: ユニットテスト

**テストファイル構成** (`campaigns/__tests__/route.test.ts` と同一パターン)

**freeze テスト** (`__tests__/route.test.ts` in `freeze/`):
```ts
vi.hoisted(() => ({
  mockAuth: vi.fn(),
  mockSelect: vi.fn(),
  mockUpdate: vi.fn(),
  mockInsert: vi.fn(),
}));
vi.mock("@/lib/auth", ...);
vi.mock("@/lib/db", ...);
vi.mock("next/cache", () => ({ revalidateTag: vi.fn() }));
vi.mock("@/lib/logger", () => ({ log: vi.fn() }));

// テストケース:
// - 未認証 → 401（sessionなし）
// - 一般ユーザー → 403
// - 存在しない ID → 404
// - 既凍結 → 409
// - 正常凍結 → 200 { success: true }
```

**unfreeze テスト** (`__tests__/route.test.ts` in `unfreeze/`):
```
// テストケース:
// - 未認証 → 401
// - 一般ユーザー → 403
// - 正常解除 → 200 { success: true }
// - 非凍結ユーザーを解除 → 409 (すでに解除済み扱い)
```

**users GET テスト** (`__tests__/route.test.ts` in `users/`):
```
// テストケース:
// - 未認証 → 401
// - 一般ユーザー → 403
// - 正常取得 → 200 { users: [...], nextCursor: null }
// - 不正カーソル → 400
```

**テストのモック方針**:
- `ratelimit` は `vi.mock("@/lib/ratelimit", () => ({ adminLimiter: null }))` で null 返却（レートリミット無効化）
- `db.select().from().where().orderBy().limit()` はチェーン呼び出しをモック
- `db.update().set().where()` はチェーン呼び出しをモック

---

## Complexity Tracking

なし（既存パターンの踏襲のみ）
