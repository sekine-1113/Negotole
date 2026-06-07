# Implementation Plan: 本番公開 UI/SEO 整備

**Branch**: `022-prod-ui-seo` | **Date**: 2026-06-07 | **Spec**: [spec.md](./spec.md)

**Input**: Feature specification from `specs/022-prod-ui-seo/spec.md`

## Summary

OGP メタタグ・カスタム 404・robots.txt/sitemap.xml・account-suspended レイアウト分離の 4 点を実装する。Next.js App Router の標準 API（Metadata オブジェクト・robots.ts・sitemap.ts・not-found.tsx・Route Groups）を用いてすべて静的に解決する。

## Technical Context

**Language/Version**: TypeScript 5

**Primary Dependencies**: Next.js 16.2.6 (App Router)

**Storage**: N/A（DB 変更なし）

**Testing**: Vitest 2

**Target Platform**: Vercel (Node.js runtime)

**Project Type**: web-service（Next.js App Router）

**Production URL**: `https://negotole.vercel.app`

**Performance Goals**: 標準（Vercel Edge キャッシュにより robots.txt/sitemap.xml はキャッシュされる）

**Constraints**:
- OGP 画像は 1200×630px PNG を `public/og-image.png` として配置
- `NEXT_PUBLIC_APP_URL` が未設定の場合は `https://negotole.vercel.app` をフォールバックとして使用
- account-suspended レイアウト分離には Root Layout の構造変更（Route Group 導入）が必要

**Scale/Scope**: 小規模（静的ファイル + メタデータ追加）

## Constitution Check

Constitution はテンプレートのみ（プロジェクト固有の制約なし）。ゲート違反なし。

## Project Structure

### Documentation (this feature)

```text
specs/022-prod-ui-seo/
├── plan.md              # This file
├── research.md          # Phase 0 output
└── tasks.md             # Phase 2 output (/speckit-tasks command)
```

### Source Code

```text
negotole/src/app/
├── layout.tsx                    # 変更: OGP metadata 追加、Header/BottomNav/FAB を削除
├── not-found.tsx                 # 新規: カスタム 404 ページ
├── robots.ts                     # 新規: robots.txt 生成
├── sitemap.ts                    # 新規: sitemap.xml 生成
├── (app)/                        # 新規: Route Group（URL 変化なし）
│   ├── layout.tsx                # 新規: Header + BottomNav + FAB（root から移動）
│   ├── page.tsx                  # 移動
│   ├── post/                     # 移動
│   ├── mypage/                   # 移動
│   ├── contact/                  # 移動
│   ├── terms/                    # 移動
│   ├── privacy/                  # 移動
│   ├── admin/                    # 移動
│   ├── loading.tsx               # 移動
│   └── error.tsx                 # 移動
└── account-suspended/
    └── page.tsx                  # 変更なし（root layout のみ適用されナビなし）

negotole/public/
└── og-image.png                  # 新規: 1200×630px OGP 画像
```

**Structure Decision**: Route Group `(app)` を導入することで Root Layout はナビなしの最小構成とし、account-suspended は Root Layout のみ適用される構造とする。URL は変化しない。

## Complexity Tracking

| Violation | Why Needed | Simpler Alternative Rejected Because |
|-----------|------------|-------------------------------------|
| Route Group 導入によるファイル移動 | account-suspended からナビを排除するには Root Layout の再構成が必須 | Root Layout 内での条件分岐（path チェック）は Server Component での `usePathname` 不可・ハック的 |
