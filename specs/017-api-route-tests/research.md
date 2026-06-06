# Research: API ルートのテスト追加

## テストフレームワーク・パターンの選定

**Decision**: 既存の Vitest + `vi.mock` パターンをそのまま踏襲する。追加の依存パッケージは不要。

**Rationale**:
- プロジェクトには既に Vitest が設定済み（`vitest.config.ts`）
- `src/app/api/posts/__tests__/route.test.ts` に実績のあるパターンが存在する
- `NextRequest` を直接インスタンス化 → ルートハンドラー関数を直接呼び出す方式でHTTPサーバー起動不要
- `vi.mock("@/lib/auth")` で認証をモック化し、`vi.mock("@/lib/db")` でDB接続を回避

**Alternatives considered**:
- `supertest` + HTTP サーバー: Next.js ではサーバー起動が複雑なため不採用
- `msw`: ネットワークインターセプトは本プロジェクトの構成には過剰なため不採用
- Playwright API テスト: E2E の範囲（#19）であり、ユニットテストと分離すべきため不採用

---

## テストファイルの構成

**Decision**: 既存ファイルパターン `src/app/api/<path>/__tests__/route.test.ts` に従い、ルートごとに1ファイルを作成する。

| ファイル | テスト対象 | 状態 |
|---|---|---|
| `src/app/api/posts/__tests__/route.test.ts` | GET（既存）・POST（追加） | 既存 + 追記 |
| `src/app/api/health/__tests__/route.test.ts` | GET | 新規 |
| `src/app/api/users/me/__tests__/route.test.ts` | GET | 新規 |
| `src/app/api/admin/campaigns/__tests__/route.test.ts` | GET・POST | 新規 |
| `src/app/api/admin/campaigns/[id]/__tests__/route.test.ts` | PATCH・DELETE | 新規 |

---

## 認証モックのパターン

既存コードより：

```typescript
// 未認証（null を返す）
vi.mock("@/lib/auth", () => ({
  auth: vi.fn().mockResolvedValue(null),
}));

// 認証済みユーザー（一般）
auth.mockResolvedValueOnce({ user: { id: "1", role: "user" } });

// 認証済みユーザー（管理者）
auth.mockResolvedValueOnce({ user: { id: "1", role: "admin" } });
```

---

## DB モックのパターン

既存コードより、`db.select`・`db.insert`・`db.transaction` を個別にモックする：

```typescript
const { mockSelect, mockInsert } = vi.hoisted(() => ({
  mockSelect: vi.fn(),
  mockInsert: vi.fn(),
}));

vi.mock("@/lib/db", () => ({
  db: { select: mockSelect, insert: mockInsert },
}));
```

---

## POST /api/posts のモック複雑度

**Decision**: `POST /api/posts` は認証チェック（401）のみをテストし、ポイント消費フロー全体のテストはスコープ外とする。

**Rationale**:
- `POST /api/posts` の実装は `db.transaction` でネスト SQL を実行しており、モックが非常に複雑
- 認証チェックは最重要であり、それだけでも PR リグレッション防止の価値がある
- 投稿作成フロー全体のテストは別途 E2E テスト（#19）で対応する計画

---

## テストの実行確認

```bash
cd negotole && pnpm test
```

既存テスト（`posts/route.test.ts`・`lib/__tests__/`）がすべてパスしたうえで、新規テストも通ることを確認する。
