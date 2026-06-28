# Data Model: タイムライン表示強化機能群

**Branch**: `032-timeline-display-enhancements` | **Date**: 2026-06-28

---

## スキーマ変更

**なし。既存テーブル (`post`, `user_point`, `app_user`) は変更しない。**

---

## 新規型定義

### `ColorMode`（フロントエンド型）

```typescript
type ColorMode = "normal" | "grayscale" | "sepia";
```

localStorage キー `negotole_color_mode` に保存される値。既存の `negotole_grayscale` キーは初回マウント時に移行・削除される。

### `FetchPostsResult` 拡張

```typescript
type FetchPostsResult = {
  posts: PostRow[];
  nextCursor: string | null;
  totalActive: number;
  expiredToday: number;  // 追加: 当日消滅した投稿の件数
};
```

### `PostHeatmapProps`

```typescript
type PostHeatmapProps = {
  hourCounts: number[];  // 長さ 24 の配列。インデックス = JST 時（0〜23）。値 = 投稿件数
};
```

---

## 新規クエリ

### `getPostHourDistribution(userId: number): Promise<number[]>`

```sql
SELECT
  EXTRACT(HOUR FROM created_at AT TIME ZONE 'Asia/Tokyo')::int AS hour,
  COUNT(*)::int AS cnt
FROM post
WHERE user_id = :userId
  AND deleted_at IS NULL
GROUP BY hour
ORDER BY hour
```

返り値: `number[24]`（欠落時間帯は 0 で埋める）

### `getRandomExpiredPost(userId: number): Promise<{ content: string } | null>`

```sql
SELECT content
FROM post
WHERE user_id = :userId
  AND deleted_at IS NULL
  AND hidden_at <= NOW()
ORDER BY RANDOM()
LIMIT 1
```

### `expiredToday` カウント（`fetchPosts` 内の `Promise.all` に追加）

```sql
SELECT COUNT(*)::int AS cnt
FROM post
WHERE deleted_at IS NULL
  AND hidden_at <= NOW()
  AND hidden_at >= (NOW() AT TIME ZONE 'Asia/Tokyo')::date::timestamptz AT TIME ZONE 'Asia/Tokyo'
```

---

## localStorage キー一覧（更新後）

| キー | 型 | 説明 |
|------|-----|------|
| `negotole_hide_countdown` | `"1"` / `"0"` | カウントダウン非表示（既存） |
| `negotole_color_mode` | `"normal"` / `"grayscale"` / `"sepia"` | カラーモード（B-9 で新設） |
| `negotole_hide_points` | `"1"` / `"0"` | ポイント数非表示（既存） |
| `negotole_grayscale` | ~~`"1"` / `"0"`~~ | **廃止**（B-9 で `negotole_color_mode` へ移行） |
