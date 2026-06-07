# Research: 本番公開準備

**Branch**: `021-prod-readiness` | **Date**: 2026-06-07

---

## Decision 1: レートリミット識別子の戦略

**Decision**: 認証済みルートはユーザー ID（`user:${userId}`）、未認証ルートは IP アドレス（`ip:${ip}`）をキーとする

**Rationale**:
- POST /api/posts・管理 API はログイン済みユーザーのみ呼び出す。IP より user ID の方が NAT・プロキシの影響を受けず公平
- `ratelimit.ts` の各 limiter の `prefix` が役割を分離しているため、識別子の形式は呼び出し側で決める設計になっている
- Upstash Ratelimit の `limiter.limit(identifier)` に渡す文字列を `"user:${userId}"` にするだけで実現できる

**Alternatives considered**:
- IP のみ: シンプルだが共有 IP での誤ブロックリスクあり
- IP + user ID の二重チェック: 過剰に複雑

---

## Decision 2: Redis 障害時の挙動（fail-open）

**Decision**: `limiter.limit()` が例外を投げた場合は try-catch でスキップし、リクエストを通す（fail-open）

**Rationale**:
- 既存の `ratelimit.ts` が env vars 未設定時に `null` を返して素通りする設計と一致する
- Redis の一時的な障害でサービス全体が止まることを防ぐ優先度が高い
- ログにエラーを記録することで障害の検出は可能

**Implementation pattern**:
```ts
if (limiter) {
  try {
    const { success } = await limiter.limit(`user:${userId}`);
    if (!success) return NextResponse.json({ error: "Too Many Requests" }, { status: 429 });
  } catch (e) {
    log("warn", "ratelimit.check_failed", { userId, error: String(e) });
    // fail-open: proceed
  }
}
```

**Alternatives considered**:
- fail-closed（503 を返す）: 安全性は高いが可用性が下がる。プロトタイプ段階では過剰

---

## Decision 3: /admin/users ページネーション方式

**Decision**: カーソルベースページネーション（ユーザー ID 降順・base64 エンコード）、1 ページあたり 20 件

**Rationale**:
- 既存の `/api/admin/campaigns` と同一パターンを使用して実装コストを最小化
- ユーザー ID は単調増加で一意のため、カーソルとして安定
- `searchParams` ベースのカーソルは Server Component の `page.tsx` から直接扱える

**Key pattern** (`/api/admin/campaigns` の流用):
```ts
const rows = await query.limit(limit + 1);
const hasMore = rows.length > limit;
const nextCursor = hasMore
  ? Buffer.from(String(items.at(-1)!.id)).toString("base64")
  : null;
```

**Pagination in Server Component**: `?cursor=<base64>` と `?frozen=true` を searchParams で受け取り、`/api/admin/users` の Server Side fetch に渡す（または直接 DB クエリ）。

---

## Decision 4: フォームURL確認（#4）の対応方針

**Decision**: コード変更なし。`docs/prod-deploy-tasks.md` のデプロイチェックリストに既に記載済みのため、タスクとしてのコード実装は不要

**Rationale**:
- 既に `prod-deploy-tasks.md` に以下のチェック項目が存在する:
  - `NEXT_PUBLIC_CONTACT_FORM_URL が設定され、Google フォームが正常に動作する`
  - `NEXT_PUBLIC_REPORT_FORM_URL が設定され、通報リンクに postId が付与される`
- `NEXT_PUBLIC_` 変数はサーバー側で検証不可能（ビルド時埋め込みのため）
- デプロイ担当者が手動確認するのが適切

---

## Decision 5: テストの実装パターン

**Decision**: 既存の `campaigns/__tests__/route.test.ts` パターン（Vitest + `vi.mock` でモック）を踏襲

**Key mocks**:
```ts
vi.mock("@/lib/auth", () => ({ auth: mockAuth }));
vi.mock("@/lib/db", () => ({ db: { select: mockSelect, update: mockUpdate } }));
vi.mock("next/cache", () => ({ revalidateTag: vi.fn() }));
vi.mock("@/lib/logger", () => ({ log: vi.fn() }));
```

**Test scope** (新規追加のみ):
- `GET /api/admin/users`: 認証・認可（401/403）+ ページネーション + 凍結フィルタ
- `POST /api/admin/users/[id]/freeze`: 認可・正常系・既凍結・存在しない ID
- `POST /api/admin/users/[id]/unfreeze`: 認可・正常系・非凍結ユーザー
