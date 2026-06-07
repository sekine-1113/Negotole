# Tasks: 本番公開 UI/SEO 整備

**Input**: Design documents from `specs/022-prod-ui-seo/`

**Prerequisites**: plan.md, spec.md, research.md

**Organization**: Foundational フェーズで Route Group を導入し、US1（OGP）→ US2（404）→ US3（robots/sitemap）→ US4（account-suspended 確認）の順に実装する。

## Format: `[ID] [P?] [Story?] Description`

- **[P]**: 並列実行可能（異なるファイル、依存なし）
- **[Story]**: 対応する User Story（US1〜US4）

---

## Phase 1: Foundational - Route Group 導入（US4 を同時に実現）

**Purpose**: Root Layout を最小構成に変更し、Header/BottomNav/FAB を `(app)/layout.tsx` に移動する。これにより account-suspended は Root Layout のみ適用されナビなし状態になる（US4 実現）。URL は変化しない。

**⚠️ CRITICAL**: このフェーズが完了するまで US1〜US4 のいずれも開始できない

- [x] T001 Create `negotole/src/app/(app)/layout.tsx` with auth check + Header + Footer + FabButton + BottomNav + ServiceWorkerRegistrar（root layout.tsx から移動）; update `negotole/src/app/layout.tsx` to minimal structure（html/body/fonts/Analytics/SpeedInsights のみ、ナビなし）
- [x] T002 [P] Move `negotole/src/app/page.tsx` → `negotole/src/app/(app)/page.tsx`
- [x] T003 [P] Move `negotole/src/app/loading.tsx` → `negotole/src/app/(app)/loading.tsx`
- [x] T004 [P] Move `negotole/src/app/error.tsx` → `negotole/src/app/(app)/error.tsx`
- [x] T005 [P] Move `negotole/src/app/post/` → `negotole/src/app/(app)/post/`
- [x] T006 [P] Move `negotole/src/app/mypage/` → `negotole/src/app/(app)/mypage/`
- [x] T007 [P] Move `negotole/src/app/contact/` → `negotole/src/app/(app)/contact/`
- [x] T008 [P] Move `negotole/src/app/terms/` → `negotole/src/app/(app)/terms/`
- [x] T009 [P] Move `negotole/src/app/privacy/` → `negotole/src/app/(app)/privacy/`
- [x] T010 [P] Move `negotole/src/app/admin/` → `negotole/src/app/(app)/admin/`

**Checkpoint**: Route Group 完了。ビルドエラーがないこと・account-suspended にナビが表示されないことを確認

---

## Phase 2: User Story 1 - OGP・ソーシャルカード (Priority: P1) 🎯 MVP

**Goal**: SNS でサービス URL がシェアされたとき、サービス名・説明・OGP 画像が表示される

**Independent Test**: OGP 確認ツール（Card Validator 等）で `https://negotole.vercel.app` を確認し、1200×630px 画像・タイトル・説明が表示されること

- [x] T011 [P] [US1] Add `openGraph` + `twitter` fields to `export const metadata` in `negotole/src/app/layout.tsx` （title: "negotole", description: "儚く消える、夜のつぶやき", images: [{url: "${NEXT_PUBLIC_APP_URL}/og-image.png", width: 1200, height: 630}], twitter.card: "summary_large_image"）
- [x] T012 [P] [US1] Create `negotole/public/og-image.png` as a 1200×630px PNG image showing "negotole" service name and "儚く消える、夜のつぶやき" catchphrase on a dark background

**Checkpoint**: OGP メタタグが全ページの `<head>` に出力され、og-image.png が `/og-image.png` で配信されること

---

## Phase 3: User Story 2 - カスタム 404 (Priority: P1)

**Goal**: 存在しない URL にアクセスしたとき、ダークテーマの 404 ページとトップリンクが表示される

**Independent Test**: `/xyz-invalid-path` にアクセスし、ダークテーマの 404 メッセージとトップリンクが表示されること（デフォルトの白い Next.js 404 が出ないこと）

- [x] T013 [US2] Create `negotole/src/app/not-found.tsx` with dark theme 404 message and Link to "/" （`bg-slate-950` / `text-slate-400` カラーを使用し既存デザインに合わせる）

**Checkpoint**: 存在しないパスでカスタム 404 が表示され、トップページへ戻れること

---

## Phase 4: User Story 3 - robots.txt / sitemap.xml (Priority: P2)

**Goal**: 検索エンジンが非公開ページをインデックスせず、公開ページのみ適切にインデックスされる

**Independent Test**: `/robots.txt` にアクセスし Disallow エントリを確認。`/sitemap.xml` にアクセスし 4 件の公開 URL が含まれることを確認

- [x] T014 [P] [US3] Create `negotole/src/app/robots.ts` exporting `MetadataRoute.Robots` with `disallow: ["/admin/", "/mypage", "/account-suspended", "/api/"]` and `sitemap: "${BASE_URL}/sitemap.xml"`
- [x] T015 [P] [US3] Create `negotole/src/app/sitemap.ts` exporting `MetadataRoute.Sitemap` with 4 entries: `/`（daily, priority 1）・`/terms`・`/privacy`・`/contact`（yearly, priority 0.3）; BASE_URL = `process.env.NEXT_PUBLIC_APP_URL ?? "https://negotole.vercel.app"`

**Checkpoint**: `/robots.txt` に Disallow 4 件、`/sitemap.xml` に URL 4 件が出力されること

---

## Phase 5: User Story 4 - account-suspended レイアウト分離確認 (Priority: P2)

**Goal**: 凍結ユーザーが `/account-suspended` を表示したとき、Header・BottomNav・FAB が表示されない

**Note**: Phase 1 の Route Group 導入により account-suspended は Root Layout のみ適用される。`negotole/src/app/account-suspended/page.tsx` のコード変更は不要。

- [x] T016 [US4] Confirm `negotole/src/app/account-suspended/` contains only `page.tsx` with no `layout.tsx` added（確認のみ・コード変更なし）; if root layout.tsx in T001 is minimal, this story is already complete

**Checkpoint**: `/account-suspended` を開いたとき Header・BottomNav・FAB が表示されず、サインアウトボタンのみが表示されること

---

## Phase 6: Polish & Cross-Cutting Concerns

**Purpose**: ビルド確認と全体整合性チェック

- [x] T017 Run `pnpm build` in `negotole/` to verify no TypeScript or build errors after all file moves and additions
- [x] T018 [P] Verify `negotole/src/app/layout.tsx` OGP URL uses `NEXT_PUBLIC_APP_URL` env var with fallback `https://negotole.vercel.app`; add env var to Vercel project settings if not already present

---

## Dependencies & Execution Order

### Phase Dependencies

- **Foundational (Phase 1)**: ブロッキング。全 US フェーズより先に完了必須
- **US1 (Phase 2)**: Phase 1 完了後に開始可能
- **US2 (Phase 3)**: Phase 1 完了後に開始可能（US1 と並列実行可）
- **US3 (Phase 4)**: Phase 1 完了後に開始可能（US1・US2 と並列実行可）
- **US4 (Phase 5)**: Phase 1 完了時点で実質完了（確認のみ）
- **Polish (Phase 6)**: 全 US フェーズ完了後

### User Story Dependencies

- **US1**: Phase 1 完了後 → 独立して実装・テスト可能
- **US2**: Phase 1 完了後 → US1 と並列実行可能
- **US3**: Phase 1 完了後 → US1・US2 と並列実行可能
- **US4**: Phase 1 完了時点で達成済み（追加コードなし）

### Within Phase 1

- T001 を最初に完了する（`(app)/` ディレクトリが存在しないと T002-T010 が実行できない）
- T002-T010 は T001 完了後に並列実行可能

### Within Each User Story

- US1: T011・T012 は並列実行可能（別ファイル）
- US3: T014・T015 は並列実行可能（別ファイル）

---

## Parallel Example: Phase 1 (T002-T010)

```bash
# T001 完了後、以下を並列実行:
Task: "Move page.tsx, loading.tsx, error.tsx → (app)/"
Task: "Move post/ → (app)/post/"
Task: "Move mypage/ → (app)/mypage/"
Task: "Move contact/, terms/, privacy/ → (app)/"
Task: "Move admin/ → (app)/admin/"
```

## Parallel Example: US1 + US2 + US3

```bash
# Phase 1 完了後、以下を並列実行:
Task: "Add OGP metadata to layout.tsx (T011)"
Task: "Create og-image.png (T012)"
Task: "Create not-found.tsx (T013)"
Task: "Create robots.ts (T014)"
Task: "Create sitemap.ts (T015)"
```

---

## Implementation Strategy

### MVP First (US1 + US2)

1. Complete Phase 1: Foundational（Route Group 導入）
2. Complete Phase 2: US1（OGP）
3. Complete Phase 3: US2（カスタム 404）
4. **STOP and VALIDATE**: OGP カード・404 ページをブラウザで確認
5. Deploy to Vercel → SNS シェア確認

### Incremental Delivery

1. Phase 1 完了 → account-suspended 分離が自動的に実現
2. US1 完了 → OGP 確認ツールで検証
3. US2 完了 → 存在しない URL でカスタム 404 確認
4. US3 完了 → `/robots.txt`・`/sitemap.xml` で確認
5. US4 確認 → 凍結アカウントで `/account-suspended` テスト

---

## Notes

- [P] tasks = 異なるファイル・依存なし、並列実行可
- Route Group `(app)` はルーティングに影響しない（URL 変化なし）
- `NEXT_PUBLIC_APP_URL` は Vercel プロジェクト設定で追加が必要（値: `https://negotole.vercel.app`）
- OGP 画像は SVG から PNG 変換でも可、Canva 等のデザインツールでの作成でも可
