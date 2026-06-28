# Research: タイムライン表示強化機能群

**Branch**: `032-timeline-display-enhancements` | **Date**: 2026-06-28

---

## 1. 自動スクロール実装方針（B-2）

**Decision**: `requestAnimationFrame` ループで `window.scrollBy(0, SPEED)` を毎フレーム呼ぶ

**Rationale**:
- CSS `scroll-behavior: smooth` や `scrollIntoView` はアニメーション制御が難しく、停止処理が複雑になる
- RAF ループは `cancelAnimationFrame` 一発で即停止できる
- フレームレートに追従するため体感速度が安定する（`setTimeout` より優れる）

**Alternatives considered**:
- `setInterval + scrollBy` → RAF より粗い。フレーム同期しない
- CSS animation on container → 停止が困難。スクロール位置の制御が困難

**`prefers-reduced-motion` 対応**:
- `window.matchMedia("(prefers-reduced-motion: reduce)").matches` でチェック
- 設定がある場合は自動スクロールを起動しない（アクセシビリティ）

**スクロール速度**:
- 0.5px/frame = 約 30px/s（60fps 時）。読む速度としてちょうどよい
- ユーザー調整機能は v1 スコープ外

**手動停止トリガー**:
- `wheel` イベント（マウスホイール）
- `touchmove` イベント（スマートフォンスワイプ）
- どちらも `{ passive: true }` オプション付きでリスナー登録（スクロールブロックなし）

---

## 2. カラーモード移行（B-9）

**Decision**: 新キー `negotole_color_mode`（値: "normal" | "grayscale" | "sepia"）を使用。マウント時に旧キー `negotole_grayscale` を検出して自動変換

**Rationale**:
- 既存ユーザーがモノクロを有効にしていた場合、設定が消えない
- 旧キー削除後は `storageEvent` を dispatch してリアクティブに更新
- セピアは `filter: sepia(0.7)` で十分な視覚効果（1.0 は強すぎる）

**CSS フィルター適用範囲**:
- `Timeline.tsx` の投稿リストコンテナ (`<div style={{ filter: colorFilter }}>`) に適用
- 設定パネル自体にはフィルターをかけない（操作しやすさのため）

---

## 3. 深夜フォントウェイト（B-10）

**Decision**: `useState` の初期値を JST 時刻計算で設定。リアルタイム更新なし

**Rationale**:
- 時間帯が変わるのはページ滞在中に 22:00 または 5:00 を跨ぐときのみ
- ポーリング（30秒）のタイミングで `isNightTime` を再計算するオプションもあるが、フォントウェイトの変化に気づくユーザーはほぼいない
- シンプルさを優先。ページリロードすれば正しい状態になる

---

## 4. ヒートマップ正規化（B-11）

**Decision**: 最多投稿数の時間帯を 100% とし、他をその比率でバー高さを決める

**Rationale**:
- 絶対的な件数を見せないため、固定最大値（例: 10件=100%）は不適切
- 最多時間帯比率方式なら件数が少ないユーザーでも視覚的に意味のあるグラフになる
- `max = Math.max(...hourCounts, 1)` で 0 除算を防ぐ

**グラフ実装**:
- 24 本のバー（Tailwind `flex items-end gap-0.5 h-12`）
- 各バーの `height` は `(count / max) * 100 + "%"` をインラインスタイルで指定
- 0 件の時間帯はバーが 0% 高さ（非表示相当）
- ラベルは 0 / 6 / 12 / 18 時のみ表示（過密を避ける）

---

## 5. 書く前に読む（B-12）

**Decision**: `ORDER BY RANDOM() LIMIT 1` でサーバー側でランダム取得。Server Component からの直接クエリ

**Rationale**:
- `NewPostPage` はすでに Server Component（`auth()` + `getPointBalance` を呼んでいる）
- 専用 API エンドポイントを作るより、Server Component からの直接クエリが YAGNI に適合
- `RANDOM()` は小規模個人投稿数では問題なし（インデックスなしでも高速）

**フェッチ失敗時**:
- `try/catch` で `null` にフォールバック。投稿フォームは通常通り動作する（`pastPost` は optional prop）

---

## 6. 消えた言葉の件数（B-4）

**Decision**: `fetchPosts` の `Promise.all` に `expiredToday` カウントクエリを追加

**当日の定義**:
- JST 0:00 を基準に「今日消えた投稿」をカウント
- PostgreSQL: `hidden_at >= (NOW() AT TIME ZONE 'Asia/Tokyo')::date::timestamptz AT TIME ZONE 'Asia/Tokyo'` AND `hidden_at <= NOW()`

**表示タイミング**:
- ページ初期ロード時は `initialExpiredToday` をそのまま使用
- ポーリング時に API から `expiredToday` を受け取り更新
