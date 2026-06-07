# Implementation Plan: 管理者用アカウント凍結機能

**Branch**: `020-admin-account-freeze` | **Date**: 2026-06-07 | **Spec**: [spec.md](./spec.md)

## Summary

管理者が `/admin/users` ページからユーザーを凍結・解除できる機能を実装する。凍結は `users.bannedAt` タイムスタンプと Redis キー (`user:frozen:{userId}`) の二重管理で、次回リクエスト時にセッションを無効化する。ミドルウェアで凍結ユーザーを `/account-suspended` にリダイレクトし、ログイン試行は `signIn` callback で DB チェックして拒否する。

## Technical Context

**Language/Version**: TypeScript / Next.js 16 App Router (Turbopack)

**Primary Dependencies**: Drizzle ORM, NextAuth v5 (JWT strategy), Upstash Redis (@upstash/redis)

**Storage**: Neon PostgreSQL（`users.banned_at` カラム追加）+ Next.js `unstable_cache`（凍結状態キャッシュ）

**Target Platform**: Vercel (Edge Middleware 対応)

**Project Type**: Web application (フルスタック Next.js)

**Performance Goals**: 凍結チェック Redis GET < 5ms

**Constraints**: 凍結後の次リクエストで即時無効化

## Constitution Check

constitution.md は未記入（プレースホルダー状態）のため、ゲートチェックなし。

## Project Structure

### Documentation (this feature)

```text
specs/020-admin-account-freeze/
├── plan.md          # This file
├── research.md      # Phase 0 完了
├── data-model.md    # Phase 1 完了
├── contracts/
│   └── api.md       # Phase 1 完了
└── tasks.md         # /speckit-tasks で生成
```

### Source Code (repository root)

```text
negotole/
├── src/
│   ├── middleware.ts                              # 新規: 凍結ユーザーリダイレクト
│   ├── lib/
│   │   ├── db/schema.ts                          # 変更: banned_at カラム追加
│   │   └── auth.ts                               # 変更: jwt/signIn callback
│   ├── types/
│   │   └── next-auth.d.ts                        # 変更: isFrozen 型追加
│   ├── app/
│   │   ├── account-suspended/
│   │   │   └── page.tsx                          # 新規: 凍結通知ページ
│   │   ├── admin/
│   │   │   ├── layout.tsx                        # 変更: ユーザー管理リンク追加
│   │   │   └── users/
│   │   │       ├── page.tsx                      # 新規: ユーザー一覧 + 凍結UI
│   │   │       └── FreezeButton.tsx              # 新規: 凍結/解除クライアントコンポーネント
│   │   └── api/
│   │       └── admin/
│   │           └── users/
│   │               ├── route.ts                  # 新規: GET /api/admin/users
│   │               └── [id]/
│   │                   ├── freeze/
│   │                   │   └── route.ts          # 新規: POST freeze
│   │                   └── unfreeze/
│   │                       └── route.ts          # 新規: POST unfreeze
└── drizzle/
    └── migrations/                               # 新規: banned_at migration
```

## Key Design Decisions

1. **凍結状態の管理**: DB (`bannedAt`) を source of truth とし、`unstable_cache` でキャッシュ
   - freeze/unfreeze 実行時に `revalidateTag("user-frozen-{userId}")` で即時無効化
   - Redis 不使用でシンプル、negotole 規模では十分な性能

2. **セッション無効化フロー**:
   ```
   管理者が凍結実行
   → DB: users.bannedAt = now()
   → revalidateTag("user-frozen-{userId}") でキャッシュ無効化
   → 対象ユーザーの次リクエスト時
   → middleware.ts が auth() を呼び出し
   → jwt callback が DB チェック（unstable_cache 経由）→ token.isFrozen = true
   → middleware が /account-suspended にリダイレクト
   ```

3. **ログイン時の凍結ブロック**: NextAuth の `signIn` callback で `bannedAt` を DB チェック（キャッシュバイパス）
