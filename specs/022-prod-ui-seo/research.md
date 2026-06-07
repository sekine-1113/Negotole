# Research: 本番公開 UI/SEO 整備

**Date**: 2026-06-07

---

## US1: OGP メタタグ

### Decision: Next.js Metadata オブジェクト（静的）

- **Rationale**: Root `layout.tsx` に `export const metadata: Metadata` を追加するだけで全ページに継承される。`openGraph` / `twitter` フィールドを追加すれば OGP・Twitter Card が両方カバーできる。
- **Alternatives considered**: `generateMetadata` 関数（動的取得が不要なので不採用）
- **Key finding**: `layout.tsx` はすでに `title: "negotole"` / `description: "儚く消える、夜のつぶやき"` を持つ。`openGraph` と `twitter` ブロックを追記するだけでよい。
- **OGP image URL**: `${NEXT_PUBLIC_APP_URL}/og-image.png`（`public/` 直下に配置）
- **NEXT_PUBLIC_APP_URL フォールバック**: `process.env.NEXT_PUBLIC_APP_URL ?? "https://negotole.vercel.app"`

```ts
// layout.tsx に追記する metadata の差分
export const metadata: Metadata = {
  title: "negotole",
  description: "儚く消える、夜のつぶやき",
  openGraph: {
    title: "negotole",
    description: "儚く消える、夜のつぶやき",
    url: "https://negotole.vercel.app",
    siteName: "negotole",
    images: [{ url: "https://negotole.vercel.app/og-image.png", width: 1200, height: 630 }],
    locale: "ja_JP",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "negotole",
    description: "儚く消える、夜のつぶやき",
    images: ["https://negotole.vercel.app/og-image.png"],
  },
};
```

### OGP 画像

- **Decision**: PNG ファイルを `negotole/public/og-image.png` に配置（1200×630px）
- **Rationale**: 静的ファイルとして配信するのが最もシンプル。`next/og` による動的生成は過剰。
- **Alternatives considered**: `next/og`（動的生成）→ 不採用（シンプルなテキスト画像で十分）

---

## US2: カスタム 404

### Decision: `src/app/not-found.tsx`

- **Rationale**: Next.js App Router の標準規約。`app/not-found.tsx` を配置するだけでグローバル 404 として機能する。Root Layout を継承するため、ダークテーマ（`globals.css` の `bg-slate-950` 等）が自動適用される。
- **Key finding**: `global-not-found.js` は experimental フラグが必要なため不採用。通常の `not-found.tsx` を使用。
- **UI**: ダークテーマ対応済みの Root Layout 内でレンダリングされるため追加のスタイル設定は最小限でよい。

---

## US3: robots.ts / sitemap.ts

### Decision: App Router の `robots.ts` / `sitemap.ts` ファイル規約を使用

- **Rationale**: `src/app/robots.ts` を配置するだけで `/robots.txt` として配信される。`MetadataRoute.Robots` 型で型安全に記述できる。
- **Key finding**: `sitemap.ts` の `id` は v16 から `Promise<string>` に変更（v16.0.0 changelog）。単一ファイルの場合は引数なしの関数で OK。

```ts
// robots.ts
import type { MetadataRoute } from "next";

export default function robots(): MetadataRoute.Robots {
  return {
    rules: {
      userAgent: "*",
      allow: "/",
      disallow: ["/admin/", "/mypage", "/account-suspended", "/api/"],
    },
    sitemap: "https://negotole.vercel.app/sitemap.xml",
  };
}
```

```ts
// sitemap.ts
import type { MetadataRoute } from "next";

const BASE_URL = process.env.NEXT_PUBLIC_APP_URL ?? "https://negotole.vercel.app";

export default function sitemap(): MetadataRoute.Sitemap {
  return [
    { url: BASE_URL, changeFrequency: "daily", priority: 1 },
    { url: `${BASE_URL}/terms`, changeFrequency: "yearly", priority: 0.3 },
    { url: `${BASE_URL}/privacy`, changeFrequency: "yearly", priority: 0.3 },
    { url: `${BASE_URL}/contact`, changeFrequency: "yearly", priority: 0.3 },
  ];
}
```

---

## US4: account-suspended レイアウト分離

### Decision: Route Group `(app)` の導入

- **Rationale**: Next.js App Router では Root Layout は必ずすべての子に適用される。`account-suspended` からナビを排除するには Root Layout をナビなしの最小構成に変更し、Header/BottomNav/FAB を Route Group `(app)` の Layout に移す必要がある。
- **Alternatives considered**:
  1. Root Layout での条件分岐（path 判定）→ Server Component で `usePathname` 不可、ハック的
  2. `account-suspended/layout.tsx` で独立した HTML 構造を再定義 → Root Layout が必ず上位に適用されるため Header 等は消えない
- **Impact of Route Group approach**:
  - URL は変化しない（Route Group `(app)` はルーティングに影響しない）
  - `page.tsx`, `post/`, `mypage/`, `contact/`, `terms/`, `privacy/`, `admin/`, `loading.tsx`, `error.tsx` を `(app)/` 配下に移動
  - Root `layout.tsx`：`import { Header }` 等を削除、OGP metadata を追加、html/body/fonts/analytics のみ残す
  - `(app)/layout.tsx`：Header, BottomNav, FAB, auth check を持つ（旧 Root Layout の処理）
  - `account-suspended/page.tsx`：変更なし
