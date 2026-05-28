# Implementation Plan: デイリーポイント付与バグ修正

**Branch**: `010-fix-points-award` | **Date**: 2026-05-26 | **Spec**: [spec.md](./spec.md)

**Input**: Feature specification from `specs/010-fix-points-award/spec.md`

## Summary

next-auth v5 の `jwt` コールバックはサインイン時とトークンリフレッシュ時（デフォルト24時間ごと）にのみ発火するため、既存セッションのまま翌日にページを訪問してもデイリーポイントが付与されない。`Header.tsx`（全ページでレンダリングされる Server Component）にデイリーポイントチェックを追加することで、再ログイン不要で翌日訪問時に確実にポイントを付与する。

## Technical Context

**Language/Version**: TypeScript 5.x / Next.js 16.2.6 (App Router)

**Primary Dependencies**:
- next-auth v5 (beta.31) — JWT セッション戦略
- Drizzle ORM — PostgreSQL クエリ
- @neondatabase/serverless — データベース接続

**Storage**: PostgreSQL (Neon Serverless)

**Testing**: Vitest 2.x（23テスト、`negotole/` ディレクトリで実行）

**Target Platform**: Vercel (Edge/Node.js ランタイム)

**Project Type**: Web アプリケーション（Next.js App Router）

**Performance Goals**: ポイント付与チェックによりページ初期表示が 300ms 以上遅延しないこと（SC-003）

**Constraints**:
- `Header.tsx` は Server Component — クライアントサイドのフックは使用不可
- `hasDailyPointToday()` と `grantDailyPoints()` のロジック自体は変更しない
- JST（UTC+9）基準の日付判定は既存の `getJSTDayBounds()` を使用

**Scale/Scope**: 変更対象ファイルは `negotole/src/components/Header.tsx` 1ファイルのみ

## Constitution Check

constitution.md はプレースホルダーのみで有効なゲート定義なし。ゲート違反なし、計画続行可能。

## Project Structure

### Documentation (this feature)

```text
specs/010-fix-points-award/
├── plan.md              # This file
├── research.md          # 根本原因調査と修正アプローチ
├── checklists/
│   └── requirements.md  # 仕様品質チェックリスト
└── tasks.md             # /speckit-tasks コマンド出力（未作成）
```

### Source Code (変更対象)

```text
negotole/
├── src/
│   ├── components/
│   │   └── Header.tsx          # デイリーポイントチェック追加（唯一の変更対象）
│   └── lib/
│       ├── points.ts           # hasDailyPointToday / grantDailyPoints（変更なし）
│       └── auth.ts             # jwt コールバック（変更なし・維持）
└── src/app/
    └── (各ページ)              # Header.tsx 経由で自動的に恩恵を受ける
```

**Structure Decision**: 単一ファイル変更。`Header.tsx` は全ページに共通してレンダリングされる Server Component であり、`auth()` と `getPointBalance()` をすでに呼び出しているため、追加クエリ（`hasDailyPointToday`）を最小コストで挿入できる。

### 変更内容の詳細

`Header.tsx` の `auth()` 呼び出し直後に以下を追加する:

```typescript
import { hasDailyPointToday, grantDailyPoints, getPointBalance } from "@/lib/points";

// auth() の結果取得後:
if (session?.user?.userId) {
  const alreadyGranted = await hasDailyPointToday(Number(session.user.userId));
  if (!alreadyGranted) await grantDailyPoints(Number(session.user.userId));
}
```

`getPointBalance()` は既存のポイント残高取得の後に呼ばれるため、付与後の残高を正確に反映する。

## Complexity Tracking

Constitution の有効なゲート定義がないため省略。
