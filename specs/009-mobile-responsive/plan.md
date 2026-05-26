# Implementation Plan: レスポンシブデザイン対応（モバイルファースト）

**Branch**: `009-mobile-responsive` | **Date**: 2026-05-26 | **Spec**: [spec.md](spec.md)

**Input**: Feature specification from `specs/009-mobile-responsive/spec.md`

## Summary

Tailwind CSS 4 のモバイルファーストユーティリティクラスを使用して既存コンポーネントへレスポンシブスタイルを追加する。最小変更で Header のモバイルオーバーフローを解消し（P1）、管理画面テーブルに横スクロール対応を追加する（P2）。新規依存なし、既存テスト 23 件のデグレなしが前提。

## Technical Context

**Language/Version**: TypeScript 5.x / Next.js 16.2.6 (App Router)

**Primary Dependencies**: React 19.2.4, Tailwind CSS 4 (v4), next-auth v5 beta

**Storage**: N/A（スタイル変更のみ）

**Testing**: Vitest 2.x — `pnpm test` from `negotole/` directory

**Target Platform**: Web (モバイル: 320px〜, タブレット: 768px+, デスクトップ: 1024px+)

**Project Type**: Web application (Next.js App Router fullstack)

**Performance Goals**: Lighthouse モバイルスコア「パフォーマンス」を現状維持（純粋な CSS クラス変更のため影響なし）

**Constraints**: デスクトップ既存レイアウトを維持しつつ小画面を最適化。iOS ズーム防止のため input font-size ≥ 16px

**Scale/Scope**: 4 ファイル変更（Header.tsx, admin/layout.tsx, admin/campaigns/page.tsx, PostForm.tsx）

## Constitution Check

Constitution ファイルはプレースホルダーのみのため適用ゲートなし。

以下の自己チェックを実施:
- [x] 新規依存パッケージなし
- [x] 既存テストのデグレなし（Tailwind クラス変更のみ）
- [x] デスクトップ動作を維持（`sm:` 以上で既存スタイル復元）
- [x] 変更ファイル数が最小（4 ファイル）

## Project Structure

### Documentation (this feature)

```text
specs/009-mobile-responsive/
├── plan.md              # This file
├── research.md          # ブレークポイント戦略・Header 計算・対応方針
├── contracts/
│   └── responsive-components.md  # 各コンポーネントのレスポンシブ動作仕様
└── tasks.md             # /speckit-tasks コマンド出力（未作成）
```

### Source Code (変更対象ファイル)

```text
negotole/src/
├── components/
│   ├── Header.tsx          # [US1 P1] モバイル向けコンパクトスタイル追加
│   └── PostForm.tsx        # [US1 P1] textarea font-size 確認（iOS zoom 防止）
└── app/
    └── admin/
        ├── layout.tsx      # [US2 P2] p-6 → p-4 sm:p-6
        └── campaigns/
            └── page.tsx    # [US2 P2] テーブル overflow-x-auto ラッパー追加
```

**Structure Decision**: 既存の Next.js App Router 構造を維持。変更は Tailwind クラス文字列の編集のみ。新規ファイルは contracts/ のみ作成。

## Breakpoint Strategy

Tailwind CSS 4 デフォルトブレークポイント（モバイルファースト）:

| プレフィックス | 幅 | 適用範囲 |
|---|---|---|
| (なし) | 0px〜 | モバイル（基準） |
| `sm:` | 640px〜 | タブレット以上 |
| `md:` | 768px〜 | タブレット横以上 |
| `lg:` | 1024px〜 | デスクトップ |

## Component Change Summary

### Header.tsx — コンパクトモバイルスタイル

375px 画面での幅計算（research.md 参照）:
- 現状: ~403px（オーバーフロー）→ モバイルスタイル適用後: ~299px ✓

変更箇所:
- 外側 `<header>` wrapper: `px-4 gap-3` → `px-3 gap-2 sm:px-4 sm:gap-3`
- `PointBadge`: `px-3 py-1 text-sm` → `px-2 py-0.5 text-xs sm:px-3 sm:py-1 sm:text-sm`
- 「投稿する」ボタン: `px-4 py-1.5 text-sm` → `px-3 py-1 text-xs sm:px-4 sm:py-1.5 sm:text-sm`
- 「ログアウト」ボタン: `text-sm` → `text-xs sm:text-sm`
- 「Google でログイン」ボタン: 同様に `text-xs sm:text-sm` に調整

### PostForm.tsx — iOS ズーム防止確認

`<textarea>` の `text-sm` = 14px → iOS でズームが発生。`text-base`（16px）に変更して FR-005 を満たす。

### admin/layout.tsx — パディング調整

`<main className="p-6">` → `<main className="p-4 sm:p-6">`

### admin/campaigns/page.tsx — テーブル横スクロール

テーブル `<table>` タグを `<div className="overflow-x-auto">` で囲む。

## Complexity Tracking

*Constitution 違反なし。このセクションは適用外。*
