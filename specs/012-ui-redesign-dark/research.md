# Research: UI ダークテーマへのデザイン刷新

**Date**: 2026-05-28  
**Feature**: 012-ui-redesign-dark

---

## 1. Tailwind v4 カスタムアニメーションの定義方法

**Decision**: `globals.css` に `@keyframes` + `@theme { --animate-* }` で定義する

**Rationale**: Tailwind v4 は CSS-first 設定。`tailwind.config.ts` が存在せず、`@theme` ブロックで CSS 変数として設計トークンを登録する。`--animate-foo: keyframe-name duration timing-function iteration-count` 形式で登録すると `animate-foo` クラスとして使用可能。

**Alternatives considered**: `tailwind.config.ts` の `theme.extend.animation` — v4 では `tailwind.config.ts` が存在しないため不可。

---

## 2. next/font/google での M PLUS Rounded 1c 読み込み

**Decision**: `layout.tsx` で `M_PLUS_Rounded_1c` を `next/font/google` でインポートし、CSS 変数として登録する

**Rationale**: CDN 経由ではなく `next/font` を使用することで、フォントの最適化（プリロード、サブセット、no-FOUT）が得られる。関数名は `M_PLUS_Rounded_1c`（スペース・プラスをアンダースコアに変換）。

```ts
import { M_PLUS_Rounded_1c, Inter } from "next/font/google";
const mPlusRounded = M_PLUS_Rounded_1c({
  subsets: ["latin"],
  weight: ["400", "700", "900"],
  variable: "--font-rounded",
});
const inter = Inter({
  subsets: ["latin"],
  weight: ["300", "400", "600"],
  variable: "--font-inter",
});
```

**Alternatives considered**: Google Fonts CDN — `next/font` の方がパフォーマンスが良いため不採用。

---

## 3. BottomNav の Server/Client 境界

**Decision**: BottomNav を 2 層構造にする。
- 外側 `BottomNav` (Server Component): `auth()` で role 取得 → `BottomNavClient` に props として渡す
- 内側 `BottomNavClient` ("use client"): `usePathname()` でアクティブ状態を判定

**Rationale**: `auth()` は Server Component でのみ呼べる。`usePathname()` は Client Component でのみ使える。この 2 つを同一コンポーネントで使うことはできないため、分離する。

**Alternatives considered**: Server Component 内で pathname を取得 → App Router では Server Component から直接 pathname を取得する標準的な方法がない（`headers()` を使う回避策はあるが複雑）。

---

## 4. lucide-react のインストールと使用方法

**Decision**: `pnpm add lucide-react` でインストールし、`import { Moon, Star, Send, ... } from "lucide-react"` で使用する

**Rationale**: プロトタイプで使用している `lucide` アイコンセットの React 版。Tree-shaking 対応で使用したアイコンのみバンドルされる。Next.js Server Components でも使用可能。

**Used icons**:
- `Moon` — ヘッダーロゴ
- `Star` — ポイントバッジ
- `Send` — 投稿ボタン
- `AlignLeft` — タイムラインタブ
- `User` — マイページタブ
- `ShieldAlert` — 管理タブ
- `Clock` — 時間表示

---

## 5. グラスモーフィズムの Tailwind クラス構成

**Decision**: `backdrop-blur-md bg-slate-950/60 border border-indigo-950/50` を基本パターンとして使用

**Rationale**: `backdrop-filter: blur()` が Safari iOS でも動作する。`bg-opacity` (v3) ではなく `bg-slate-950/60` (スラッシュ記法) を使用する（Tailwind v4 互換）。

---

## 6. PostCard のプログレスバー計算

**Decision**: `CountdownTimer` と同様に `createdAt` と `hiddenAt` から進捗率を計算し、`width` の `style` prop で表示する

**Rationale**: CSS アニメーションではリアルタイム更新ができないため、Client Component として `useEffect` + `setInterval` でポーリングする。既存の `CountdownTimer.tsx` がこのパターンを実装しているので参考にする。

---

## 7. admin ページのボトムナビ表示

**Decision**: `auth()` で `session.user.role === "admin"` の場合のみ「管理」タブを BottomNav に追加表示する

**Rationale**: 管理画面は認証済み管理者のみアクセス可能。BottomNav でも同じ条件で表示制御することで UX の一貫性を保つ。
