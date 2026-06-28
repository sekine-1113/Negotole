# Implementation Plan: タイムライン UX 機能群

**Branch**: `031-timeline-ux-features` | **Date**: 2026-06-28 | **Spec**: [spec.md](./spec.md)

**Input**: Feature specification from `specs/031-timeline-ux-features/spec.md`

## Summary

ランダムタイムライン・アクティブ投稿数バナー・深夜フィルター・ブラインドポスト確認・消えかけ揺らぎアニメーションの 5 機能を実装する。DBスキーマ変更なし。`lib/posts.ts` の型拡張と API パラメータ追加、フロントコンポーネントの拡張のみ。

## Technical Context

**Language/Version**: TypeScript 5

**Primary Dependencies**: Next.js 16.2.6 (App Router), Drizzle ORM, Tailwind CSS v4

**Storage**: PostgreSQL（DBスキーマ変更なし）

**Testing**: Vitest 2

**Target Platform**: Vercel (Node.js runtime)

**Project Type**: web-service（Next.js App Router）

**Performance Goals**: 標準（ランダムクエリは ORDER BY RANDOM() で小規模DBには問題なし）

**Constraints**:
- ランダムモードとカーソルページネーションは組み合わせ不可（重複許容）
- ブラインドポスト: `PostRow` 型に userId を追加してはならない
- 揺らぎアニメーションは `CountdownTimer` が管理する remaining を使用する

**Scale/Scope**: 小規模（コンポーネント拡張 + API パラメータ追加）

## Constitution Check

Constitution はテンプレートのみ（プロジェクト固有の制約なし）。ゲート違反なし。

## Project Structure

### Documentation (this feature)

```text
specs/031-timeline-ux-features/
├── plan.md              # This file
├── research.md          # Phase 0 output
├── data-model.md        # Phase 1 output
├── contracts/
│   └── api-posts.md     # GET /api/posts 変更契約
└── tasks.md             # Phase 2 output (/speckit-tasks)
```

### Source Code

```text
negotole/src/
├── lib/
│   └── posts.ts                         # order/totalActive 追加
├── app/api/posts/
│   └── route.ts                         # ?order=random 対応
├── app/(app)/
│   └── page.tsx                         # totalActive を Timeline に渡す
├── app/
│   └── globals.css                      # @keyframes wobble 追加
└── components/
    ├── Timeline.tsx                     # ランダム/深夜フィルター, バナー
    ├── PostCard.tsx                     # isNearExpiry state, wobble クラス
    └── CountdownTimer.tsx               # onNearExpiry callback 追加
```

**Structure Decision**: 既存の単一 Next.js プロジェクト構造を維持。DBスキーマ・マイグレーション変更なし。

## Complexity Tracking

| Violation | Why Needed | Simpler Alternative Rejected Because |
|-----------|------------|-------------------------------------|
| ORDER BY RANDOM() | ランダム順の実現 | クライアント側シャッフルはページネーション不可 |

---

## Implementation Details

### #1 ランダムタイムライン

**lib/posts.ts**:
```typescript
// FetchPostsOptions に order?: "newest" | "random" 追加
// FetchPostsResult に totalActive: number 追加
// order === "random" のとき orderBy(sql`RANDOM()`) を使用
// totalActive は COUNT(*) で並列取得（Promise.all）
// maxSeenId 追跡のため全投稿の最大 ID を計算して返す（または呼び出し側で管理）
```

**API route.ts**:
```typescript
// ?order=random パラメータを受け取り fetchPosts に渡す
// order=random + since は同時不可（400）
// order が "random" 以外の文字列なら 400
```

**Timeline.tsx**:
```tsx
// フィルターボタン群に「ランダム」を追加（order state）
// order=random 時: API フェッチに ?order=random を付与
// ポーリング: topPostIdRef → maxSeenIdRef に変更（取得した投稿の最大IDを追跡）
// 「もっと見る」: order=random 時は cursor なしで再取得（重複許容）
```

### #5 アクティブ投稿数バナー

**lib/posts.ts**:
```typescript
// Promise.all で COUNT(*) と投稿取得を並列実行
// FetchPostsResult.totalActive に件数を追加
```

**page.tsx (HomePage)**:
```tsx
// data.totalActive を Timeline に props として渡す
```

**Timeline.tsx**:
```tsx
// initialTotalActive: number prop を受け取り state 化
// ポーリング時にレスポンスの totalActive で更新
// totalActive > 0 のときのみバナーを表示
// バナーテキスト: 「今 N 件の言葉が生きています」
```

### #6 深夜フィルター

**Timeline.tsx**:
```tsx
// Filter 型に "night" を追加
// FILTER_LABELS に「夜の寝言」を追加
// applyFilter に夜の寝言ケース追加:
//   (new Date(p.createdAt).getUTCHours() + 9) % 24 の結果が >= 22 || < 5
```

### #8 ブラインドポスト

変更なし。以下を確認して文書化するのみ:
- `PostRow` 型に `userId` フィールドが存在しないことを確認 ✓
- `fetchPosts` の SELECT クエリに `userId` が含まれないことを確認 ✓
- `PostCard` が受け取る `post` オブジェクトに `userId` がないことを確認 ✓

### #14 消えかけ投稿のゆらぎアニメーション

**globals.css**:
```css
@keyframes wobble {
  0%, 100% { transform: translateX(0) translateY(0); }
  20%       { transform: translateX(0.8px) translateY(-0.6px); }
  40%       { transform: translateX(-0.6px) translateY(0.8px); }
  60%       { transform: translateX(0.6px) translateY(0.4px); }
  80%       { transform: translateX(-0.8px) translateY(-0.4px); }
}
@theme {
  --animate-wobble: wobble 2.4s ease-in-out infinite;
}
```

**CountdownTimer.tsx**:
```tsx
// onNearExpiry?: () => void を props に追加
// nearExpiredRef で一度だけ呼ぶよう管理
// remaining <= 300_000 (5分) で onNearExpiry?.() を呼ぶ
```

**PostCard.tsx**:
```tsx
// isNearExpiry state を追加（初期値: hiddenAt - now <= 300_000）
// CountdownTimer に onNearExpiry={() => setIsNearExpiry(true)} を渡す
// post.content の <p> タグに isNearExpiry ? "animate-wobble" : "" を適用
```
