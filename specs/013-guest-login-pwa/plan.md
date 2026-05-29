# Implementation Plan: ゲストログイン限定化 & PWA対応

**Branch**: `013-guest-login-pwa` | **Date**: 2026-05-28 | **Spec**: [spec.md](spec.md)

**Input**: Feature specification from `specs/013-guest-login-pwa/spec.md`

## Summary

プロトタイプ版として Google ログインを UI から非表示にし、「ゲストとしてログイン」のみを提供する。NextAuth v5 beta に Credentials プロバイダーを追加して DB にゲストユーザーレコードを生成しセッションを発行する。合わせて Next.js 16 標準の `app/manifest.ts` と手動サービスワーカー（静的アセットのみキャッシュ）で PWA 対応を実現する。

## Technical Context

**Language/Version**: TypeScript 5, Node.js 20

**Primary Dependencies**:
- Next.js 16.2.6（App Router）
- next-auth 5.0.0-beta.31（Credentials プロバイダー追加）
- drizzle-orm 0.45.2 + @neondatabase/serverless（DB アクセス）
- Tailwind CSS v4（CSS-first config）

**Storage**: NeonDB (PostgreSQL) — スキーマ変更なし

**Testing**: Vitest

**Target Platform**: Web（iOS Safari + Android Chrome PWA インストール対応）

**Performance Goals**: ゲストログイン → タイムライン表示まで 3 秒以内。2 回目以降は静的アセットキャッシュで高速化。

**Constraints**: サービスワーカーは静的アセットのみキャッシュ（API データはキャッシュしない）

**Scale/Scope**: 既存ユーザーベースに対して影響なし（既存 Google セッションは維持）

## Constitution Check

constitution.md がテンプレート状態のためプロジェクト固有の制約なし。以下の一般原則に準拠:
- **既存機能を壊さない**: Google 認証バックエンドは維持、UI のみ変更
- **最小変更原則**: DB スキーマ変更なし、既存ページ・コンポーネントへの影響最小化
- **セキュリティ**: CSP ヘッダーを維持・強化（sw.js 専用ヘッダー追加）

## Project Structure

### Documentation (this feature)

```text
specs/013-guest-login-pwa/
├── plan.md              # This file
├── research.md          # Phase 0 output
├── data-model.md        # Phase 1 output
└── tasks.md             # Phase 2 output (/speckit-tasks)
```

### Source Code Changes

```text
negotole/
├── src/
│   ├── lib/
│   │   └── auth.ts                        # MODIFY: Credentials プロバイダー追加、JWT callback 更新
│   ├── app/
│   │   ├── manifest.ts                    # CREATE: PWA マニフェスト
│   │   └── layout.tsx                     # MODIFY: ServiceWorkerRegistrar 追加
│   └── components/
│       ├── Header.tsx                     # MODIFY: Google ボタン削除、ゲストボタン追加
│       └── ServiceWorkerRegistrar.tsx     # CREATE: サービスワーカー登録 Client Component
├── public/
│   ├── sw.js                              # CREATE: サービスワーカー（静的アセットキャッシュ）
│   └── icons/
│       ├── icon-192x192.png               # CREATE: PWA アイコン 192px
│       └── icon-512x512.png               # CREATE: PWA アイコン 512px
└── next.config.ts                         # MODIFY: sw.js 専用 CSP ヘッダー追加
```

**Structure Decision**: 既存の Next.js App Router 構造を維持。新規ファイルは機能に応じた適切なディレクトリに配置。

## Implementation Details

### US1: ゲストとしてログイン

#### auth.ts の変更点

```typescript
// 追加: Credentials プロバイダー
import Credentials from "next-auth/providers/credentials";

providers: [
  Google,  // 既存（バックエンドは維持）
  Credentials({
    credentials: {},
    async authorize() {
      const [guest] = await db
        .insert(users)
        .values({ name: "ゲスト" })  // email は null（デフォルト）
        .returning({ id: users.id, role: users.role });
      return { id: String(guest.id), name: "ゲスト", role: guest.role };
    },
  }),
],

// JWT callback に追加ブランチ
async jwt({ token, user, profile }) {
  if (profile?.email) {
    // 既存 Google ログインロジック（変更なし）
  } else if (user?.id) {
    // Credentials（ゲスト）ログイン
    token.userId = Number(user.id);
    token.role = user.role as string;
  }
  // 以降: 既存の日次ポイント付与ロジック（変更なし）
}
```

#### Header.tsx の変更点

- Google フォーム（`signIn("google", ...)`）を削除
- ゲストログインフォームを追加（`signIn("credentials", { redirectTo: "/" })`）
- ボタンラベル: "ゲストとしてログイン"
- デザイン: 既存の「Google でログイン」ボタンと同様のスタイル（インディゴ〜パープルグラデーション）

---

### US2: PWA 対応

#### app/manifest.ts

```typescript
import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "negotole",
    short_name: "negotole",
    description: "儚く消える、夜のつぶやき",
    start_url: "/",
    display: "standalone",
    background_color: "#0b0f19",
    theme_color: "#6366f1",
    icons: [
      { src: "/icons/icon-192x192.png", sizes: "192x192", type: "image/png" },
      { src: "/icons/icon-512x512.png", sizes: "512x512", type: "image/png" },
    ],
  };
}
```

#### public/sw.js（静的アセット Cache-first）

```javascript
const CACHE_NAME = "negotole-static-v1";
const STATIC_ASSETS = ["/_next/static/", "/icons/"];

self.addEventListener("install", (event) => {
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(keys.filter((k) => k !== CACHE_NAME).map((k) => caches.delete(k)))
    )
  );
});

self.addEventListener("fetch", (event) => {
  const url = new URL(event.request.url);
  const isStatic = STATIC_ASSETS.some((p) => url.pathname.startsWith(p));
  if (!isStatic) return; // ネットワーク委譲（API・ページなど）
  event.respondWith(
    caches.match(event.request).then(
      (cached) => cached ?? fetch(event.request).then((res) => {
        const clone = res.clone();
        caches.open(CACHE_NAME).then((cache) => cache.put(event.request, clone));
        return res;
      })
    )
  );
});
```

#### ServiceWorkerRegistrar.tsx

```typescript
"use client";
import { useEffect } from "react";

export function ServiceWorkerRegistrar() {
  useEffect(() => {
    if ("serviceWorker" in navigator) {
      navigator.serviceWorker.register("/sw.js", { scope: "/", updateViaCache: "none" });
    }
  }, []);
  return null;
}
```

#### next.config.ts 追加ヘッダー

```typescript
{
  source: "/sw.js",
  headers: [
    { key: "Content-Type", value: "application/javascript; charset=utf-8" },
    { key: "Cache-Control", value: "no-cache, no-store, must-revalidate" },
    { key: "Content-Security-Policy", value: "default-src 'self'; script-src 'self'" },
  ],
},
```

#### PWA アイコン生成

`scripts/generate-icons.mjs` として Node.js スクリプトを作成し、SVG → PNG 変換で `public/icons/` にアイコンを生成。アイコンデザイン: インディゴ〜パープルグラデーション円形に白い「N」文字。

## Complexity Tracking

Constitution Check に違反なし。

| 変更 | 理由 |
|------|------|
| Credentials プロバイダー追加 | ゲスト認証に必須（代替なし） |
| サービスワーカー手動実装 | next-pwa 非対応のため Next.js 標準パターンを採用 |
