# Data Model: UI ダークテーマへのデザイン刷新

**Date**: 2026-05-28

## 概要

このフィーチャーはデータモデルを変更しない。既存の DB スキーマ・API レスポンス型はすべてそのまま使用する。

## コンポーネント Props の変更

### BottomNav (新規)

```ts
// BottomNav.tsx (Server Component wrapper)
// props なし — auth() で role を取得する

// BottomNavClient.tsx または BottomNav 内 Client 部分
type BottomNavClientProps = {
  isAdmin: boolean;
};
```

### PointBadge (変更)

```ts
// 変更なし — { total: number } のまま
// スタイルのみ変更
type PointBadgeProps = {
  total: number;
};
```

### PostCard (変更)

```ts
// 変更なし — Post 型はそのまま
type Post = {
  id: number;
  content: string;
  hiddenAt: string;
  createdAt: string;
};
```

## デザイントークン（参照用）

| トークン | 値 | 用途 |
|---|---|---|
| 背景グラデーション | `linear-gradient(135deg, #0b0f19, #111827, #1e1b4b)` | body 背景 |
| テキスト基本色 | `#e2e8f0` | body color |
| ヘッダー背景 | `bg-slate-950/60` + `backdrop-blur-md` | グラスモーフィズム |
| ブランドグラデーション | `from-indigo-300 via-purple-300 to-pink-300` | テキスト |
| ロゴグラデーション | `from-indigo-500 to-purple-600` | 円形ロゴ背景 |
| カード背景 | `bg-slate-900/60` + `backdrop-blur-md` | 投稿カード |
| カードボーダー | `border-indigo-950/70` | 投稿カード |
| プログレスバー | `from-indigo-500 to-purple-600` | 残り時間 |
| ポイントバッジ背景 | `bg-indigo-950/60 border-indigo-500/30` | ヘッダー |
| ポイント数値色 | `text-amber-300` | ポイント表示 |
| 星アイコン色 | `text-amber-400 fill-amber-400` | PointBadge |
| 期間限定ポイント | `border-pink-500/20`, `text-pink-400` | マイページ |
| 恒久ポイント | `border-indigo-500/20`, `text-indigo-300` | マイページ |
