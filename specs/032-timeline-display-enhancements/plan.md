# Implementation Plan: タイムライン表示強化機能群

**Branch**: `032-timeline-display-enhancements` | **Date**: 2026-06-28 | **Spec**: [spec.md](./spec.md)

**Input**: Feature specification from `specs/032-timeline-display-enhancements/spec.md`

## Summary

B-2（自動スクロール）・B-4（消えた言葉の気配）・B-8（文字数フォントサイズ）・B-9（カラーモード 3 択）・B-10（深夜フォント）・B-11（投稿時間帯ヒートマップ）・B-12（書く前に読む）の 7 機能を実装する。DBスキーマ変更なし。`lib/posts.ts` への集計関数追加、既存コンポーネントの拡張、`PostHeatmap` コンポーネントの新規作成が主な作業。

## Technical Context

**Language/Version**: TypeScript 5

**Primary Dependencies**: Next.js 16.2.6 (App Router), Drizzle ORM, Tailwind CSS v4

**Storage**: PostgreSQL（DBスキーマ変更なし）

**Testing**: Vitest 2

**Target Platform**: Vercel (Node.js runtime)

**Project Type**: web-service（Next.js App Router）

**Performance Goals**: 標準。`getPostHourDistribution` は全投稿に対する集計クエリだが、個人単位かつ小規模データのため問題なし

**Constraints**:
- ブラインドポスト: `PostRow` 型・`PostCard` に `userId` を追加してはならない
- カラーモード: 既存の `negotole_grayscale` localStorage キーは移行後に削除する
- 自動スクロール: `prefers-reduced-motion` 設定を尊重する
- B-11 ヒートマップ: 縦軸に件数の実数値を表示しない

**Scale/Scope**: 小規模（コンポーネント拡張 + 集計クエリ追加）

## Constitution Check

Constitution はテンプレートのみ（プロジェクト固有の制約なし）。ゲート違反なし。

## Project Structure

### Documentation (this feature)

```text
specs/032-timeline-display-enhancements/
├── plan.md              # This file
├── research.md          # Phase 0 output
├── data-model.md        # Phase 1 output
├── contracts/
│   └── api-posts.md     # GET /api/posts レスポンス変更契約
└── tasks.md             # Phase 2 output (/speckit-tasks)
```

### Source Code

```text
negotole/src/
├── lib/
│   └── posts.ts                           # expiredToday 追加 + getPostHourDistribution 新規
├── app/api/posts/
│   └── route.ts                           # expiredToday をレスポンスに含める
├── app/(app)/
│   └── page.tsx                           # initialExpiredToday を Timeline に渡す
├── app/(app)/post/new/
│   └── page.tsx                           # pastPost クエリ追加、PostForm に渡す
├── app/(app)/mypage/
│   └── page.tsx                           # hourCounts クエリ追加、PostHeatmap マウント
└── components/
    ├── Timeline.tsx                        # B-2, B-4, B-9, B-10
    ├── PostCard.tsx                        # B-8
    ├── PostForm.tsx                        # B-12 (pastPost 表示エリア)
    └── PostHeatmap.tsx                     # B-11 新規作成
```

---

## Implementation Details

### B-4: 消えた言葉の気配 — `lib/posts.ts`

```typescript
// FetchPostsResult に追加
expiredToday: number

// fetchPosts 内の Promise.all に追加
db.select({ count: sql<string>`COUNT(*)` })
  .from(posts)
  .where(and(
    isNull(posts.deletedAt),
    lte(posts.hiddenAt, sql`NOW()`),
    gte(posts.hiddenAt, sql`(NOW() AT TIME ZONE 'Asia/Tokyo')::date::timestamptz`)
  ))

// 新規エクスポート関数
export async function getPostHourDistribution(userId: number): Promise<number[]>
// SELECT EXTRACT(HOUR FROM created_at AT TIME ZONE 'Asia/Tokyo') as hour, COUNT(*) as cnt
// FROM post WHERE user_id = :userId AND deleted_at IS NULL GROUP BY hour
// → number[24] に変換（欠落時間帯は 0）
```

### B-12: 書く前に読む — `lib/posts.ts`

```typescript
// 新規エクスポート関数
export async function getRandomExpiredPost(userId: number): Promise<{ content: string } | null>
// SELECT content FROM post
// WHERE user_id = :userId AND deleted_at IS NULL AND hidden_at <= NOW()
// ORDER BY RANDOM() LIMIT 1
```

### B-4: API route.ts

```typescript
// GET /api/posts レスポンスに expiredToday を追加
return NextResponse.json({
  posts: data.posts,
  nextCursor: data.nextCursor,
  totalActive: data.totalActive,
  expiredToday: data.expiredToday,   // ← 追加
})
```

### B-4: `app/(app)/page.tsx`

```tsx
// fetchPosts の戻り値から expiredToday を取得し Timeline に渡す
<Timeline
  initialPosts={data.posts}
  initialNextCursor={data.nextCursor}
  isLoggedIn={!!session}
  initialTotalActive={data.totalActive}
  initialExpiredToday={data.expiredToday}  // ← 追加
/>
```

### B-12: `app/(app)/post/new/page.tsx`

```tsx
// 既存の getPointBalance に加え pastPost を取得
let pastPost: { content: string } | null = null;
if (session?.user?.id) {
  try {
    pastPost = await getRandomExpiredPost(Number(session.user.id));
  } catch { /* フォールバック: null のまま */ }
}
// PostForm に渡す
<PostForm totalPoints={totalPoints} pastPost={pastPost} />
```

### B-11: `app/(app)/mypage/page.tsx`

```tsx
// 既存クエリに加え hour 分布を取得
let hourCounts: number[] = new Array(24).fill(0);
try {
  hourCounts = await getPostHourDistribution(userId);
} catch { /* フォールバック */ }
// PostHeatmap をマウント（sum が 0 なら非表示）
{hourCounts.some(n => n > 0) && <PostHeatmap hourCounts={hourCounts} />}
```

### B-2, B-9, B-10: `Timeline.tsx`

```typescript
// LS_KEYS の更新
const LS_KEYS = {
  hideCountdown: "negotole_hide_countdown",
  colorMode: "negotole_color_mode",   // grayscale キーを置き換え
  hidePoints:  "negotole_hide_points",
} as const;

// マイグレーション（一度だけ実行）
useEffect(() => {
  const old = localStorage.getItem("negotole_grayscale");
  if (old === "1") {
    localStorage.setItem(LS_KEYS.colorMode, "grayscale");
    localStorage.removeItem("negotole_grayscale");
    window.dispatchEvent(new StorageEvent("storage", { key: LS_KEYS.colorMode, newValue: "grayscale" }));
  }
}, []);

// B-9 カラーモード
type ColorMode = "normal" | "grayscale" | "sepia";
const colorMode = useSyncExternalStore<ColorMode>(
  subscribeStorage,
  () => (localStorage.getItem(LS_KEYS.colorMode) as ColorMode) ?? "normal",
  () => "normal"
);
const colorFilter =
  colorMode === "grayscale" ? "grayscale(1)" :
  colorMode === "sepia"     ? "sepia(0.7)"  : undefined;

// B-10 深夜フォント（クライアント時刻で判定、初期値のみ）
const [isNightTime] = useState(() => {
  const jstHour = (new Date().getUTCHours() + 9) % 24;
  return jstHour >= 22 || jstHour < 5;
});

// B-2 自動スクロール
const [autoScroll, setAutoScroll] = useState(false);
const rafRef = useRef<number | null>(null);
useEffect(() => {
  if (!autoScroll) { if (rafRef.current) cancelAnimationFrame(rafRef.current); return; }
  if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) { setAutoScroll(false); return; }
  const SPEED = 0.5; // px per frame (~30px/s at 60fps)
  const step = () => {
    const atBottom = window.scrollY + window.innerHeight >= document.body.scrollHeight - 4;
    if (atBottom) { setAutoScroll(false); return; }
    window.scrollBy(0, SPEED);
    rafRef.current = requestAnimationFrame(step);
  };
  rafRef.current = requestAnimationFrame(step);
  return () => { if (rafRef.current) cancelAnimationFrame(rafRef.current); };
}, [autoScroll]);

// 手動スクロールで停止
useEffect(() => {
  const stop = () => setAutoScroll(false);
  window.addEventListener("wheel", stop, { passive: true });
  window.addEventListener("touchmove", stop, { passive: true });
  return () => { window.removeEventListener("wheel", stop); window.removeEventListener("touchmove", stop); };
}, []);

// B-4 気配バナー（末尾に表示）
// Props に initialExpiredToday: number を追加
// ポーリング時に data.expiredToday があれば更新
// <p>今日、{expiredToday} 件の言葉がここを旅立った</p> を posts リスト末尾に表示

// B-9 カラーモード設定UI（既存モノクロトグルを3択に変更）
// B-2 自動スクロールボタンを設定パネルに追加
```

### B-8: `PostCard.tsx`

```typescript
function contentFontSize(length: number): string {
  if (length <= 30)  return "text-xl";
  if (length <= 80)  return "text-base";
  if (length <= 150) return "text-sm";
  return "text-xs";
}
// <p> の className から固定 "text-sm" を削除し contentFontSize(post.content.length) を適用
```

### B-11: `PostHeatmap.tsx`（新規作成）

```tsx
"use client";  // アニメーション演出のため Client Component
type Props = { hourCounts: number[] };

export function PostHeatmap({ hourCounts }: Props) {
  const max = Math.max(...hourCounts, 1);
  return (
    <section>
      <h3>いつ言葉を放ったか</h3>
      <div className="flex items-end gap-0.5 h-12">
        {hourCounts.map((count, hour) => (
          <div key={hour} className="flex-1 bg-indigo-400/30 rounded-sm"
            style={{ height: `${(count / max) * 100}%` }}
          />
        ))}
      </div>
      {/* 6時間ごとのラベル: 0, 6, 12, 18 */}
    </section>
  );
}
```

### B-12: `PostForm.tsx`

```tsx
// Props に pastPost?: { content: string } | null を追加
// フォーム上部に表示
{pastPost && (
  <p className="text-xs text-indigo-300/30 italic mb-3 leading-relaxed">
    {pastPost.content}
  </p>
)}
```
