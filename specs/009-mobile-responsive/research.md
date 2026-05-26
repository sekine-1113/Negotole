# Research: レスポンシブデザイン（モバイルファースト）

## ブレークポイント戦略

### Decision: Tailwind CSS 4 のデフォルトブレークポイントを使用

**Rationale**: プロジェクトはすでに Tailwind CSS 4 を使用しており、`sm:`（640px）・`md:`（768px）・`lg:`（1024px）のプレフィックスが利用可能。モバイルファーストの原則に従い、プレフィックスなしのクラスが最小画面に適用され、`sm:` 以上で段階的に拡張する。

**Alternatives considered**:
- カスタムブレークポイントの追加: 現在の3段階で十分なため不採用

---

## Header の問題と対応方針

### Decision: モバイルでコンパクト表示、sm:（640px）以上でフル表示

**Rationale**:
375px 画面での Header 要素の幅を計算すると、現在の `px-4 gap-3 text-sm` ではオーバーフローが発生する。

| 要素 | 現在の幅 (px) |
|------|--------------|
| "Negotole" ロゴ (text-lg) | ~100 |
| gap-3 × 3 | 36 |
| PointBadge (px-3 py-1 text-sm) | ~80 |
| "投稿する" (px-4 py-1.5 text-sm) | ~90 |
| "ログアウト" (text-sm) | ~65 |
| padding (px-4 × 2) | 32 |
| **合計** | **403px > 375px** |

モバイル向けのコンパクトスタイルにより:
- `px-3` (ヘッダー左右パディング)
- `gap-2` (要素間スペース)
- Badge: `px-2 py-0.5 text-xs`
- "投稿する": `px-3 py-1 text-xs`
- "ログアウト": `text-xs`

合計 ≈ 299px < 351px（375px - 24px）✓

`sm:` 以上では既存スタイルを維持。

**Alternatives considered**:
- ハンバーガーメニューの導入: 複雑すぎるため不採用
- 2行ヘッダー: UX が悪化するため不採用
- ログアウトボタンを隠す: アクセシビリティの観点から不採用

---

## Admin テーブルの対応方針

### Decision: `overflow-x-auto` ラッパーで横スクロール対応

**Rationale**:
キャンペーン一覧テーブル（6列）はスマートフォンに収まらない。最小限の変更で済む横スクロール対応を採用。テーブル自体の構造は変えず、ラッパー div に `overflow-x-auto` を追加するだけで実装可能。

**Alternatives considered**:
- カードレイアウトへの変換: 変更量が大きく、現段階では不採用
- 特定列を非表示: 管理者は全情報が必要なため不採用

---

## Admin Layout のパディング調整

### Decision: モバイルで `p-4`、sm: 以上で `p-6`

**Rationale**:
現在の `<main className="p-6">` は小画面で左右マージンが広く、コンテンツ幅が狭まる。モバイルで `p-4` に削減し、タブレット以上で `p-6` を維持する。

---

## PostForm・PostCard・Timeline

### Decision: 既存スタイルの微調整のみ

**Rationale**:
- `PostForm`: すでに `flex flex-col gap-4` と `flex flex-wrap gap-2`（時間ボタン）で mobile-friendly。textarea・submit ボタンは `w-full` で幅対応済み。`font-size` が 16px 以上かの確認のみ必要。
- `PostCard`: `border rounded-lg p-4 flex flex-col gap-2` で mobile-friendly。変更なし。
- `Timeline`: `flex flex-col gap-4` で mobile-friendly。変更なし。

---

## 変更対象ファイル一覧

| ファイル | 変更内容 | 優先度 |
|----------|----------|--------|
| `negotole/src/components/Header.tsx` | モバイル向けコンパクトスタイル追加 | US1 (P1) |
| `negotole/src/app/admin/layout.tsx` | `p-6` → `p-4 sm:p-6` | US2 (P2) |
| `negotole/src/app/admin/campaigns/page.tsx` | テーブルに `overflow-x-auto` ラッパー追加 | US2 (P2) |
| `negotole/src/components/PostForm.tsx` | textarea の `font-size` を確認（iOS zoom 対策） | US1 (P1) |
