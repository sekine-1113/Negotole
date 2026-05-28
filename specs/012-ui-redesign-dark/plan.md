# Implementation Plan: UI ダークテーマへのデザイン刷新

**Branch**: `012-ui-redesign-dark` | **Date**: 2026-05-28 | **Spec**: `specs/012-ui-redesign-dark/spec.md`

## Summary

`docs/negotole_ui_prototype.html` のデザインを参考に、Negotole の全画面を現行ライトテーマから**ダーク・ドリーミーテーマ**へ刷新する。背景グラデーション・グラスモーフィズムヘッダー・ボトムナビ・Lucide アイコン・M PLUS Rounded 1c フォントを導入し、コンセプト（儚く消える夜のつぶやき）を視覚的に体現する。機能ロジックは一切変更しない。

---

## Technical Context

**Language/Version**: TypeScript 5.x, React 19.2.4, Next.js 16.2.6 (App Router)

**Primary Dependencies**:
- `tailwindcss` v4（CSS-first 設定、`tailwind.config.ts` なし）
- `lucide-react`（新規追加）
- `next/font/google`（M PLUS Rounded 1c + Inter の読み込み）

**Storage**: PostgreSQL（変更なし）

**Testing**: Vitest（`negotole/` で `pnpm test --run`）

**Target Platform**: Web（モバイルファースト、iOS Safari / Android Chrome 対応）

**Project Type**: Next.js App Router Web Application

**Constraints**:
- 機能変更なし（ポイント・投稿・認証ロジックはそのまま）
- Tailwind v4 → `tailwind.config.ts` は使用不可。カスタムアニメーションは `globals.css` の `@keyframes` + `@theme` で定義
- `lucide-react` の追加が必要（現在未インストール）
- `pnpm build` が警告・エラーなしで通ること

---

## Constitution Check

*全ゲートをパス: 既存機能変更なし、新規パッケージは `lucide-react` 1件のみ、テスト不要（ロジック変更なし）*

---

## Project Structure

### Documentation (this feature)

```text
specs/012-ui-redesign-dark/
├── plan.md              # This file
├── research.md          # Phase 0 output
├── data-model.md        # Phase 1 output
└── tasks.md             # Phase 2 output (/speckit-tasks)
```

### Source Code Changes

```text
negotole/src/
├── app/
│   ├── globals.css           # 更新: ダーク背景・カスタムアニメーション・フォント変数
│   ├── layout.tsx            # 更新: フォント差し替え・BottomNav 追加・body クラス
│   ├── page.tsx              # 更新: main コンテナのクラス調整
│   ├── post/new/page.tsx     # 更新: コンテナクラス・見出しスタイル
│   └── admin/layout.tsx      # 更新: 管理ナビダークスタイル
└── components/
    ├── Header.tsx             # 更新: 全面グラスモーフィズム再設計
    ├── PointBadge.tsx         # 更新: アンバー星バッジ
    ├── PostCard.tsx           # 更新: ダークグラスモーフィズムカード
    ├── PostForm.tsx           # 更新: ダーク入力・ボタンスタイル
    ├── BottomNav.tsx          # 新規: 下部固定ナビゲーション
    └── CountdownTimer.tsx     # 更新（任意）: インジゴ系カラー
```

---

## Phase 0: Research

*research.md 参照*

---

## Phase 1: Design

### globals.css の変更方針

Tailwind v4 は CSS-first 設定のため、`globals.css` に以下を追加する:

```css
@keyframes float {
  0%, 100% { transform: translateY(0px); }
  50% { transform: translateY(-8px); }
}
@keyframes star-pulse {
  0%, 100% { opacity: 0.2; }
  50% { opacity: 0.8; }
}

@theme {
  --animate-float: float 4s ease-in-out infinite;
  --animate-star-pulse: star-pulse 3s ease-in-out infinite;
  --font-rounded: 'M PLUS Rounded 1c', 'Inter', sans-serif;
}
```

body スタイル:
```css
body {
  background: linear-gradient(135deg, #0b0f19 0%, #111827 50%, #1e1b4b 100%);
  background-attachment: fixed;
  color: #e2e8f0;
  font-family: var(--font-rounded);
}
```

### layout.tsx の変更方針

- `Geist` / `Geist_Mono` → `M_PLUS_Rounded_1c` + `Inter` (`next/font/google`)
- `<body>` に `pb-16`（ボトムナビ分のパディング）
- `<BottomNav />` を `<Header />` の後に追加（fixed 配置）

### Header.tsx の変更方針

プロトタイプ (L66-86) の構造を移植:
- `sticky top-0 z-40 backdrop-blur-md bg-slate-950/60 border-b border-indigo-950/50`
- 月ロゴ: `bg-gradient-to-tr from-indigo-500 to-purple-600` + `animate-float`
- ブランドテキスト: `bg-gradient-to-r from-indigo-300 via-purple-300 to-pink-300 bg-clip-text text-transparent`
- ポイントバッジ: 既存 `<PointBadge>` を使用（PointBadge 側でアンバースタイルに変更）

### BottomNav.tsx の設計

```
Server Component: auth() で role 判定 → admin タブ表示条件
Client Component 部分: usePathname() でアクティブ判定
fixed bottom-0 z-40 backdrop-blur-md bg-slate-950/60 border-t border-indigo-950/50
タブ: タイムライン(/) / 投稿(/post/new) / マイページ(/mypage) / 管理(admin のみ)
```

### PostCard.tsx の変更方針

```tsx
<article className="bg-slate-900/60 border border-indigo-950/70 rounded-2xl p-4 backdrop-blur-md shadow-xl relative overflow-hidden">
  <div className="absolute top-0 left-0 right-0 h-[1px] bg-gradient-to-r from-transparent via-indigo-500/40 to-transparent" />
  {/* コンテンツ + プログレスバー */}
</article>
```

### PostForm.tsx の変更方針

- textarea: `bg-slate-950/80 border border-indigo-950/80 text-slate-100 placeholder-slate-500 focus:ring-indigo-500`
- 時間チップ: デフォルト `border-indigo-950/80 bg-slate-950/40 text-slate-400`、選択中 `border-indigo-500/50 bg-indigo-950/40 text-indigo-200`
- 投稿ボタン: `bg-gradient-to-r from-indigo-500 to-purple-600 rounded-full`

### PointBadge.tsx の変更方針

- `bg-indigo-950/60 border border-indigo-500/30 rounded-full`
- `<Star>` アイコン (Lucide, amber-400) + 数値 (amber-300)

---

## Complexity Tracking

| 変更 | 理由 |
|------|------|
| `lucide-react` 追加 | プロトタイプと同等のアイコンセットが必要 |
| `BottomNav.tsx` 新規作成 | Header と分離することで Server/Client 境界を明確化 |
