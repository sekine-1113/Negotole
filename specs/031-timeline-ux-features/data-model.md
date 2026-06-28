# Data Model: タイムライン UX 機能群

DBスキーマの変更はなし。変更は TypeScript 型と API レスポンス形状のみ。

---

## 変更: FetchPostsOptions

```typescript
// lib/posts.ts
export type FetchPostsOptions = {
  cursorId?: number | null;
  sinceId?: number | null;
  limit?: number;
  order?: "newest" | "random"; // 追加
};
```

| フィールド | 型 | デフォルト | 説明 |
|-----------|---|----------|------|
| order | `"newest" \| "random"` | `"newest"` | 取得順序。"random" 時は ORDER BY RANDOM() |

---

## 変更: FetchPostsResult

```typescript
// lib/posts.ts
export type FetchPostsResult = {
  posts: PostRow[];
  nextCursor: string | null;
  totalActive: number; // 追加
};
```

| フィールド | 型 | 説明 |
|-----------|---|------|
| totalActive | `number` | 現在アクティブな投稿の総件数（hiddenAt > NOW() かつ deletedAt IS NULL） |

---

## 変更: API レスポンス GET /api/posts

```json
{
  "posts": [...],
  "nextCursor": "base64string or null",
  "totalActive": 42
}
```

新クエリパラメータ:
- `?order=random` — ランダム順で取得

---

## PostRow (変更なし)

```typescript
export type PostRow = {
  id: number;
  content: string;
  hiddenAt: string;
  createdAt: string;
  // userId は意図的に含まない（ブラインドポスト設計原則）
};
```

---

## Timeline コンポーネント State

| state | 型 | 初期値 | 説明 |
|-------|---|--------|------|
| `totalActive` | `number` | `initialTotalActive` | バナー表示用件数 |
| `order` | `"newest" \| "random"` | `"newest"` | 現在の表示順 |
| `timeFilter` | `"all" \| "night"` | `"all"` | 深夜フィルター |
| `maxSeenId` | `number \| null` | `max(initialPosts.id)` | ポーリング用最大 ID |

---

## CountdownTimer Props 変更

```typescript
// 追加: onNearExpiry
interface CountdownTimerProps {
  hiddenAt: string;
  createdAt: string;
  onExpire?: () => void;
  onNearExpiry?: () => void; // 残り5分以下になった瞬間に一度だけ呼ばれる
}
```

---

## PostCard Props 変更

```typescript
type Props = {
  post: Post;
  isLoggedIn: boolean;
  onExpire?: () => void;
  showCountdown?: boolean;
  // isNearExpiry は PostCard 内部 state で管理（CountdownTimer の onNearExpiry callback から）
};
```
