# Tasks: 管理者キャンペーン一覧のページネーション

**Input**: Design documents from `/specs/015-admin-campaigns-pagination/`

**Prerequisites**: plan.md ✅, spec.md ✅, research.md ✅, data-model.md ✅, contracts/ ✅

**Tests**: テスト自動化は要件に含まれていないため省略（手動検証タスクを最終フェーズに含む）

**Organization**: タスクはユーザーストーリー単位で整理。US1（管理画面UI）と US2（API）は完全独立。どちらも管理ページが DB を直接クエリするため、US1 は US2 に依存しない。

## Format: `[ID] [P?] [Story] Description`

- **[P]**: 並列実行可（異なるファイル、依存なし）
- **[Story]**: 対応するユーザーストーリー（US1, US2）

---

## Phase 1: Setup

**Purpose**: ビルドベースラインを確認し、実装前の状態を保証する

- [x] T001 `negotole/` で `pnpm build` を実行し現在のビルドがエラーなく通ることを確認する

**Checkpoint**: ベースライン確認完了 — US1・US2 の実装を開始できる

---

## Phase 2: Foundational（なし）

US1 と US2 は完全に独立しており、共通の前提処理は不要。Phase 1 完了後すぐに両ストーリーの実装に入れる。

---

## Phase 3: User Story 1 — キャンペーン一覧を分割して閲覧する (Priority: P1) 🎯 MVP

**Goal**: 管理者がキャンペーン一覧画面を 20 件ずつページ単位で閲覧できる。Server Component が DB を直接クエリし、URL クエリパラメータでページ状態を保持する。

**Independent Test**: キャンペーンが 25 件存在する状態で `/admin/campaigns` を開き、20 件のみ表示されて「次のページ →」リンクが表示されることを確認する。

### Implementation for User Story 1

- [x] T002 [US1] `negotole/src/app/admin/campaigns/page.tsx` の関数シグネチャを `({ searchParams }: { searchParams: Promise<{ cursor?: string }> })` に変更し、`await searchParams` で cursor を取得する。`and`, `lt`, `desc` を `drizzle-orm` からインポートし、`isNull(campaigns.deletedAt)` に加えて `cursorId ? lt(campaigns.id, cursorId) : undefined` を where 条件に追加、`orderBy(desc(campaigns.id))`、`.limit(21)` でクエリを更新する。cursor のデコードは `Number(Buffer.from(cursor, "base64").toString())` を使用し、`Number.isSafeInteger(decoded) && decoded > 0` で検証する（無効な場合は cursorId を null として扱う）。`hasMore = rows.length > 20` で判定し `items = rows.slice(0, 20)` で切り出す。`nextCursor = hasMore ? Buffer.from(String(items[items.length - 1].id)).toString("base64") : null` で生成する
- [x] T003 [US1] `negotole/src/app/admin/campaigns/page.tsx` のテーブル下部（`</div>` の直前）に `nextCursor` が存在する場合のページナビゲーション UI を追加する。`<Link href={"/admin/campaigns?cursor=" + nextCursor} className="px-4 py-2 text-sm bg-gray-100 hover:bg-gray-200 rounded">次のページ →</Link>` を `mt-4 flex justify-end` の div でラップする。`Link` は `next/link` からインポートする

**Checkpoint**: US1 完了 — 管理画面でページ送りが動作する

---

## Phase 4: User Story 2 — API ページネーション (Priority: P2)

**Goal**: `GET /api/admin/campaigns?limit=N&cursor=<token>` がカーソルベースページネーションに対応し、`nextCursor` をレスポンスに含める。

**Independent Test**: `curl http://localhost:3000/api/admin/campaigns?limit=5` を実行し、HTTP 200 で `campaigns`（5件以下）と `nextCursor`（文字列または null）が返ることを確認する。

### Implementation for User Story 2

- [x] T004 [P] [US2] `negotole/src/app/api/admin/campaigns/route.ts` の `GET` 関数を更新する。`and`, `lt`, `desc` を `drizzle-orm` のインポートに追加する。URL から `limit`（省略時20、上限100）と `cursor` を取得し、cursor が存在する場合は `Number(Buffer.from(cursor, "base64").toString())` でデコードして `Number.isSafeInteger(decoded) && decoded > 0` で検証（失敗時は 400 を返す）。where 条件を `and(isNull(campaigns.deletedAt), cursorId ? lt(campaigns.id, cursorId) : undefined)` に変更し、`orderBy(desc(campaigns.id))`、`.limit(limit + 1)` でクエリを実行する。`hasMore = rows.length > limit`、`items = hasMore ? rows.slice(0, limit) : rows`、`nextCursor = hasMore ? Buffer.from(String(items[items.length - 1].id)).toString("base64") : null` を計算してレスポンスを `NextResponse.json({ campaigns: result, nextCursor })` に変更する

**Checkpoint**: US2 完了 — API が `nextCursor` を含むページネーションレスポンスを返す

---

## Phase 5: Polish & Cross-Cutting Concerns

**Purpose**: ビルド確認と手動検証

- [x] T005 `negotole/` で `pnpm build` を実行し TypeScript 型チェックとビルドが成功することを確認する
- [ ] T006 [P] ブラウザで `/admin/campaigns` を開き、キャンペーンが 20 件超存在するとき「次のページ →」リンクが表示され、クリックすると次の件が表示されることを確認する
- [ ] T007 [P] `curl -b "<admin-session-cookie>" http://localhost:3000/api/admin/campaigns?limit=5` を実行し HTTP 200・`campaigns`（5件）・`nextCursor` が返ることを確認する

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (Phase 1)**: 依存なし — 即開始可能
- **US1 (Phase 3)**: Phase 1 完了後に開始
- **US2 (Phase 4)**: Phase 1 完了後に開始（US1 と並行可）
- **Polish (Phase 5)**: US1・US2 の両方が完了した後

### User Story Dependencies

- **US1 (P1)**: T002 → T003 の順（クエリ更新 → UI 追加）
- **US2 (P2)**: T004 は単独タスク（依存なし）

### Within Each User Story

- US1: page.tsx のクエリ更新（T002）→ ナビゲーション UI 追加（T003）
- US2: route.ts の GET ハンドラ更新のみ（T004）

### Parallel Opportunities

- T002〜T003（US1: page.tsx）と T004（US2: route.ts）は異なるファイルのため並列実行可
- T006 と T007（手動検証）は独立しているため並列確認可

---

## Parallel Example

```bash
# US1 と US2 を並列開始可:
Task: T002 "Update negotole/src/app/admin/campaigns/page.tsx (query + searchParams)"
Task: T004 "Update negotole/src/app/api/admin/campaigns/route.ts (GET pagination)"

# T002 完了後:
Task: T003 "Add nextPage navigation UI to page.tsx"
```

---

## Implementation Strategy

### MVP First (User Story 1 Only)

1. Phase 1: ビルド確認（T001）
2. Phase 3 (US1): page.tsx 更新 → UI 追加（T002 → T003）
3. **STOP and VALIDATE**: ブラウザでページ送りを確認（T006）
4. デモ可能な状態

### Incremental Delivery

1. Phase 1: ベースライン確認
2. US1 完了 → 管理画面でページ送り → MVP リリース可
3. US2 完了 → API ページネーション対応 → 外部ツール・監視サービス連携可
4. Polish: ビルド・手動検証

---

## Notes

- [P] タスクは異なるファイルを扱い依存なし（並列実行可）
- US1 の T002・T003 は page.tsx 内の変更で順序依存
- US2 の T004 は route.ts のみ、US1 とは完全独立
- Next.js App Router の `searchParams` は非同期（`Promise<...>`）なので `await` 必須
- cursor デコード失敗時は null として扱う（UI）か 400 を返す（API）で挙動が異なる点に注意
