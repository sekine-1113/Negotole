# Research: 初回ログインポイント付与バグ修正 & キャンペーン恒久ポイント

## R-001: バグ根本原因 — NextAuth v5 jwt コールバックの挙動

**Decision**: `profile?.email` を条件にしているため、トークンリフレッシュ時にデイリーポイントが付与されない。修正方法は `token.userId` が存在する場合は常にデイリーポイントチェックを実行すること。

**Rationale**:
NextAuth v5 の `jwt` コールバックは以下の場面で呼ばれる:
1. OAuth サインイン時: `profile` に Google プロフィール情報が入る
2. セッション取得時（`getServerSession` / `auth()`）: `profile` は `undefined`
3. JWT トークンリフレッシュ時: `profile` は `undefined`

現行コード `if (profile?.email)` は 1 の場合のみデイリーポイントを付与する。しかしトークンリフレッシュ時（2, 3）は `profile` が undefined なのでスキップされる。**初回ログイン時に付与されない別の原因**として、JWT コールバック内の非同期エラーが NextAuth に握り潰される可能性もある（try/catch なしで DB エラーが発生すると静かに失敗）。

**Fix Pattern**:
```typescript
async jwt({ token, profile }) {
  // サインイン時: profile がある → ユーザー find-or-create
  if (profile?.email) {
    // ... user find-or-create ...
    token.userId = userId;
    token.isNewUser = existing.length === 0; // 初回フラグ
  }

  // 毎回: userId があればデイリーポイントチェック（try/catchで保護）
  if (token.userId) {
    try {
      const alreadyGranted = await hasDailyPointToday(Number(token.userId));
      if (!alreadyGranted) await grantDailyPoints(Number(token.userId));
    } catch (e) {
      console.error("[auth] daily point grant failed:", e);
      // ログインはブロックしない
    }
  }
  return token;
}
```

**Alternatives considered**:
- API Route でポイント付与（クライアントから `POST /api/points/daily` を呼ぶ）: フロントへの変更が必要で影響範囲が広い
- Middleware でポイント付与: Middleware はエッジランタイムで Neon serverless との相性が悪い

---

## R-002: キャンペーン期間中の「初回ログイン」判定方法

**Decision**: `token.isNewUser = true`（今回のサインインでユーザーレコードを新規 INSERT した）を JWT トークンに記録し、その時点でキャンペーンポイントを付与する。

**Rationale**:
- 「初回ログイン = アカウント作成日がそのログイン」という仕様の通り、`find-or-create` の結果で判定できる
- トークンリフレッシュ時は `isNewUser` をチェックせず、サインイン直後の 1 回のみ付与する
- 付与済みチェックは `user_point` テーブルに「永久ポイント」レコードが存在するかで行う（`getPoint > 0 AND expiresAt IS NULL`）

**Alternatives considered**:
- `user.campaign_granted_at` カラムで管理: カラム追加が必要で、キャンペーン終了後に残り続ける不要カラムになる
- `user_point` レコードで管理: 既存のポイント構造を流用でき、追加カラム不要

---

## R-003: 管理者ロール判定 — user.role カラム

**Decision**: `user` テーブルに `role varchar(20) DEFAULT 'user'` を追加。管理者は `'admin'` を設定。

**Rationale**:
- シンプルな RBAC（Role-Based Access Control）の最小実装
- 将来的に `'moderator'` などの追加も容易
- JWT トークンに `role` を含めることで、リクエストごとに DB 照会なしでロール確認できる

**Migration**:
```sql
ALTER TABLE "user" ADD COLUMN "role" varchar(20) NOT NULL DEFAULT 'user';
```
既存ユーザーは全員 `'user'` になる。管理者は手動で DB 上で `'admin'` に変更する（初期運用）。

---

## R-004: 管理者ルートの保護 — middleware.ts

**Decision**: `middleware.ts` を拡張し、`/admin/**` パスは JWT トークンの `role === 'admin'` のみアクセス許可。非管理者は `/` にリダイレクト。

**Pattern**:
```typescript
// middleware.ts
export default auth((req) => {
  const path = req.nextUrl.pathname;
  
  if (path.startsWith("/post/new") && !req.auth) {
    return NextResponse.redirect(new URL("/api/auth/signin", req.url));
  }
  
  if (path.startsWith("/admin") && req.auth?.user?.role !== "admin") {
    return NextResponse.redirect(new URL("/", req.url));
  }
});

export const config = { matcher: ["/post/new", "/admin/:path*"] };
```

---

## R-005: キャンペーンテーブル設計

**Decision**: `campaign` テーブルに `starts_at`・`ends_at`・`bonus_points`・`is_active` を持たせる。「同時 1 件のみ」はアプリ層で INSERT 前にチェックする（DB の UNIQUE 制約では期間重複を表現できないため）。

**Schema**:
```sql
CREATE TABLE campaign (
  id BIGINT PRIMARY KEY GENERATED ALWAYS AS IDENTITY,
  name VARCHAR(255) NOT NULL,
  description TEXT,
  starts_at TIMESTAMP NOT NULL,
  ends_at TIMESTAMP NOT NULL,
  bonus_points INTEGER NOT NULL DEFAULT 100,
  created_at TIMESTAMP NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP,
  deleted_at TIMESTAMP
);
```

**Active campaign query**:
```sql
SELECT * FROM campaign
WHERE NOW() BETWEEN starts_at AND ends_at
  AND deleted_at IS NULL
LIMIT 1;
```

**同時1件のみの保証**: 新規作成・更新時に上記クエリで既存アクティブキャンペーンを確認し、存在する場合は 409 エラーを返す。

---

## R-006: JWT トークン型拡張

**Decision**: NextAuth の `JWT` 型を拡張して `userId`, `isNewUser`, `role` を追加する。

**Pattern** (`src/types/next-auth.d.ts`):
```typescript
import "next-auth/jwt";

declare module "next-auth/jwt" {
  interface JWT {
    userId?: number;
    isNewUser?: boolean;
    role?: string;
  }
}

declare module "next-auth" {
  interface Session {
    user: {
      id: string;
      role?: string;
    } & DefaultSession["user"];
  }
}
```
