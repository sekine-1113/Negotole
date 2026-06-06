# Implementation Plan: API ルートのテスト追加

**Branch**: `017-api-route-tests` | **Date**: 2026-06-07 | **Spec**: [spec.md](./spec.md)

**Input**: Feature specification from `specs/017-api-route-tests/spec.md`

## Summary

主要 API ルート（posts, admin/campaigns, health, users/me）に対してユニットテストを追加する。既存の Vitest + `vi.mock` パターンを踏襲し、HTTP サーバーを起動せず `NextRequest` を直接インスタンス化してルートハンドラー関数を呼び出す。認証・認可チェック（401/403）と主要バリデーション（400/404/409）を中心に網羅する。

## Technical Context

**Language/Version**: TypeScript (Node.js 20)

**Primary Dependencies**:
- Vitest（既存）— テストランナー
- `next/server` の `NextRequest`（既存）— リクエストの直接インスタンス化

**Storage**: N/A（テストはすべてモック）

**Testing**: Vitest + `vi.mock`（既存パターン踏襲）

**Target Platform**: ローカル CI（Node.js）

**Project Type**: Web application テスト（Next.js monorepo — `negotole/` 配下）

**Performance Goals**: `pnpm test` が 30 秒以内に完了する

**Constraints**: 実際の DB・外部 API に接続しない（モックで代替）

**Scale/Scope**: テストファイル 4 件新規追加、既存ファイル 1 件に追記

## Constitution Check

Constitution が未設定のため省略。違反なし。

## Project Structure

### Documentation (this feature)

```text
specs/017-api-route-tests/
├── plan.md              # This file
├── research.md          # Phase 0 output
└── tasks.md             # Phase 2 output (/speckit-tasks command)
```

データモデル変更なし・外部インターフェース定義不要のため `data-model.md`・`contracts/` は省略。

### Source Code (変更・追加ファイル)

```text
negotole/src/app/api/
├── posts/
│   └── __tests__/
│       └── route.test.ts          # 既存: POST の認証テストを追記
├── health/
│   └── __tests__/
│       └── route.test.ts          # 新規: GET ヘルスチェックテスト
├── users/
│   └── me/
│       └── __tests__/
│           └── route.test.ts      # 新規: GET 認証テスト
└── admin/
    └── campaigns/
        ├── __tests__/
        │   └── route.test.ts      # 新規: GET・POST テスト
        └── [id]/
            └── __tests__/
                └── route.test.ts  # 新規: PATCH・DELETE テスト
```

## Implementation Details

### T1: `GET /api/health` テスト（新規）

```typescript
// src/app/api/health/__tests__/route.test.ts
vi.mock("@/lib/db", () => ({
  db: { execute: vi.fn().mockResolvedValue(undefined) },
}));

import { GET } from "@/app/api/health/route";

describe("GET /api/health", () => {
  it("DB 接続成功 → 200 + { status: 'ok', db: 'ok' }", async () => {
    const res = await GET();
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ status: "ok", db: "ok" });
  });

  it("DB 接続失敗 → 503 + { status: 'error', db: 'error' }", async () => {
    mockExecute.mockRejectedValueOnce(new Error("DB error"));
    const res = await GET();
    expect(res.status).toBe(503);
  });
});
```

### T2: `GET /api/users/me` テスト（新規）

認証なし → 401、認証あり + ユーザー存在 → 200 の2ケースを中心に検証。

### T3: `GET /api/admin/campaigns` テスト（新規）

認証なし → 401、一般ユーザー → 403、管理者 + cursor 不正 → 400、管理者 + 正常 → 200 を検証。

### T4: `POST /api/admin/campaigns` テスト（新規）

認証なし → 401、管理者 + name 空 → 400、管理者 + endsAt < startsAt → 400、管理者 + 正常（既存キャンペーンなし）→ 201、管理者 + 既存キャンペーン → 409 を検証。

### T5: `PATCH /api/admin/campaigns/[id]` テスト（新規）

認証なし → 401、管理者 + 存在しない ID → 404 を検証。

### T6: `DELETE /api/admin/campaigns/[id]` テスト（新規）

認証なし → 401 を検証。

### T7: `POST /api/posts` 認証テスト（既存ファイルに追記）

既存の `GET` テストの `describe` の後に `POST` の認証テストを追加する。未認証 → 401。

## Complexity Tracking

違反なし。新規テストファイル4件、既存ファイル1件への追記のみ。プロダクションコードの変更なし。
