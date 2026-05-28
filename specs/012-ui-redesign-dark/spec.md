# Feature Specification: UI ダークテーマへのデザイン刷新

**Feature**: UI ダークテーマへのデザイン刷新  
**Branch**: `012-ui-redesign-dark`  
**Date**: 2026-05-28  
**Status**: Approved for planning

---

## Overview

`docs/negotole_ui_prototype.html` のプロトタイプデザインを基に、Negotole の全画面を現行のライトテーマから**ダーク・ドリーミー（夢幻）テーマ**へ刷新する。

「儚く消える夜のつぶやき」というサービスコンセプトを視覚的に体現するため、深夜の星空を思わせるダークグラデーション背景、グラスモーフィズムカード、浮遊するロゴアニメーションを導入する。

---

## User Stories

### US1: ユーザーがダークテーマの UI で全ページを利用できる（P1 - MVP）

**As a** Negotole ユーザー  
**I want** すべてのページ（タイムライン・投稿・マイページ・管理）が統一されたダークテーマで表示される  
**So that** サービスの世界観（儚く消える夜のつぶやき）を感じながら使える  

**Acceptance Criteria:**
- 背景がダークグラデーション（#0b0f19 → #111827 → #1e1b4b）で全画面固定表示される
- ヘッダーがグラスモーフィズム（背景ぼかし＋半透明）で sticky 表示される
- ロゴ（月アイコン）が上下に浮遊するアニメーションを持つ
- ブランド名「negotole」がインジゴ→パープル→ピンクのグラデーションテキストで表示される
- ヘッダーのポイントバッジがアンバー色の星アイコン付きで表示される
- フォントが M PLUS Rounded 1c + Inter に変更される

### US2: ユーザーがボトムナビバーで画面間を移動できる（P1 - MVP）

**As a** Negotole ユーザー  
**I want** 画面下部に固定されたナビゲーションバーが表示される  
**So that** 親指でタップしやすい位置でページ間を移動できる  

**Acceptance Criteria:**
- 下部固定のグラスモーフィズムナビバーが全ページで表示される
- ナビバーに「タイムライン」「投稿する」「マイページ」へのリンクが含まれる
- 現在のページに対応するアイコンがハイライト（インジゴ色）表示される
- 投稿ボタンは中央に配置され、グラデーション装飾で視覚的に強調される
- 管理者ユーザーのみ「管理」タブが表示される

### US3: 投稿カードがダークテーマのデザインで表示される（P2）

**As a** Negotole ユーザー  
**I want** タイムラインの投稿カードがダークテーマにマッチしたデザインで表示される  
**So that** 世界観を壊さずに投稿を読める  

**Acceptance Criteria:**
- カードがグラスモーフィズム（`bg-slate-900/60 backdrop-blur-md`）スタイルで表示される
- カード上部に細いグラデーションラインが装飾として表示される
- 残り時間がインジゴ系カラーのプログレスバーで視覚化される
- 「消滅まで X 時間 Y 分」の形式でカウントダウンが表示される

### US4: マイページがダークテーマのポイント内訳表示に対応する（P2）

**As a** Negotole ユーザー  
**I want** マイページでポイント内訳がダークテーマの専用カードで確認できる  
**So that** 期間限定ポイントと恒久ポイントの違いを視覚的に理解できる  

**Acceptance Criteria:**
- 期間限定ポイントがピンク系カード（`border-pink-500/20`）で表示される
- 恒久ポイントがインジゴ系カード（`border-indigo-500/20`）で表示される
- 「本日中有効」「期限なし」バッジがそれぞれのカードに表示される

---

## Functional Requirements

### FR-001: グローバルダークテーマ適用
全ページのベースレイアウトに以下を適用する：
- body 背景: `linear-gradient(135deg, #0b0f19 0%, #111827 50%, #1e1b4b 100%)` (fixed)
- テキスト色: `#e2e8f0`
- フォント: M PLUS Rounded 1c（ウェイト 400/700/900）+ Inter（ウェイト 300/400/600）

### FR-002: グラスモーフィズムヘッダー
- `backdrop-blur-md bg-slate-950/60 border-b border-indigo-950/50` スタイルの sticky ヘッダー
- 月アイコン（Lucide `moon`）付きグラデーション円形ロゴ（`from-indigo-500 to-purple-600`）
- ロゴに `float` アニメーション（4秒サイクル、上下 -8px）
- ブランド名グラデーションテキスト（`from-indigo-300 via-purple-300 to-pink-300`）
- アンバー星アイコン付きポイントバッジ（`bg-indigo-950/60 border border-indigo-500/30`）

### FR-003: ボトムナビバー
- `fixed bottom-0` の glassmorphism ナビバー
- アイコン: タイムライン（`align-left`）、投稿（`send`）、マイページ（`user`）
- 管理者のみ: 管理（`shield-alert`）タブを追加表示
- アクティブ状態: インジゴ色テキスト + 下部インジゴドット

### FR-004: 背景装飾の星
- 背景に複数の白/インジゴ/パープルの小さな丸（`pulse` アニメーション）を配置
- `pointer-events-none` で操作の邪魔をしない

### FR-005: 投稿カードのダークスタイル
- `bg-slate-900/60 border border-indigo-950/70 rounded-2xl backdrop-blur-md`
- カード上部グラデーションライン（`via-indigo-500/40`）
- プログレスバー: `bg-gradient-to-r from-indigo-500 to-purple-600`

### FR-006: 投稿フォームのダークスタイル
- textarea: `bg-slate-950/80 border border-indigo-950/80 focus:ring-indigo-500`
- 時間選択チップ: `border-indigo-950/80 bg-slate-950/40`、選択中は `border-indigo-500/50 bg-indigo-950/40`
- 投稿ボタン: `bg-gradient-to-r from-indigo-500 to-purple-600` の丸形ボタン

### FR-007: マイページのポイント内訳カード
- 期間限定: `border-pink-500/20` カード + `text-pink-400` 数値 + 「本日中有効」バッジ
- 恒久: `border-indigo-500/20` カード + `text-indigo-300` 数値 + 「期限なし」バッジ

### FR-008: Lucide アイコン使用
現行の絵文字・テキストアイコンを Lucide アイコン（`lucide-react`）に置き換える。

---

## Success Criteria

### Measurable Outcomes

1. **全ページが統一テーマ**: `/`・`/post/new`・`/admin/campaigns` のすべてのページで背景グラデーション・ヘッダー・ボトムナビが同一デザインで表示される
2. **モバイルでのナビ操作性**: ボトムナビのタップターゲットが最低 44px を満たす
3. **ビルドの成功**: `pnpm build` が警告・エラーなしで完了する
4. **視覚的一貫性**: すべてのカード・入力フィールドがダークテーマの Tailwind クラスを使用する

---

## Key Entities

| エンティティ | 変更 | 備考 |
|---|---|---|
| `Header.tsx` | 全面リデザイン | グラスモーフィズム・浮遊ロゴ・グラデーションテキスト |
| `layout.tsx` (root) | body フォント・背景追加 | Google Fonts 読み込み・背景クラス |
| `PostCard.tsx` | 新規作成 or 既存更新 | ダーク投稿カード |
| `BottomNav.tsx` | 新規作成 | 下部固定ナビゲーション |
| `PointBadge.tsx` | 更新 | アンバー星アイコン付きバッジ |
| `page.tsx` (timeline) | 投稿フォーム・タイムラインの再スタイル | |
| `page.tsx` (post/new) | 投稿フォームの再スタイル | |

---

## Assumptions

- 既存の機能（投稿・ポイント消費・管理・認証）は変更しない
- Next.js App Router の Server Components として実装されたコンポーネントはそのまま使用する
- `lucide-react` は既にインストール済みまたは追加する
- Tailwind CSS v3 系を使用しており、設定変更（カスタムアニメーション等）が可能
- Google Fonts は `next/font/google` 経由で読み込む（CDN ではなく）

---

## Out of Scope

- SPA 方式への変更（Next.js App Router のページ遷移は維持）
- アニメーションライブラリの追加（CSS アニメーションのみ）
- A/B テスト
- ダーク/ライトテーマの切り替え機能
- 新機能の追加（ポイント購入・フォロー等）
