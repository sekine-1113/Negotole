import { describe, it, expect, vi, beforeEach } from "vitest";
import { NextRequest } from "next/server";

const { mockSelect } = vi.hoisted(() => ({
  mockSelect: vi.fn(),
}));

vi.mock("@/lib/db", () => ({
  db: { select: mockSelect },
}));

const { mockAuth } = vi.hoisted(() => ({
  mockAuth: vi.fn().mockResolvedValue(null),
}));

vi.mock("@/lib/auth", () => ({
  auth: mockAuth,
}));

import { GET } from "@/app/api/admin/campaigns/[id]/applications/route";

function makeRequest(id: string, params?: Record<string, string>): [NextRequest, { params: Promise<{ id: string }> }] {
  const url = new URL(`http://localhost:3000/api/admin/campaigns/${id}/applications`);
  if (params) {
    for (const [k, v] of Object.entries(params)) url.searchParams.set(k, v);
  }
  const req = new NextRequest(url.toString());
  return [req, { params: Promise.resolve({ id }) }];
}

describe("GET /api/admin/campaigns/[id]/applications", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("未認証 → 401", async () => {
    mockAuth.mockResolvedValueOnce(null);
    const [req, ctx] = makeRequest("1");
    const res = await GET(req, ctx);
    expect(res.status).toBe(401);
  });

  it("一般ユーザー → 403", async () => {
    mockAuth.mockResolvedValueOnce({ user: { id: "1", role: "user" } });
    const [req, ctx] = makeRequest("1");
    const res = await GET(req, ctx);
    expect(res.status).toBe(403);
  });

  it("不正な id → 400", async () => {
    mockAuth.mockResolvedValueOnce({ user: { id: "1", role: "admin" } });
    const [req, ctx] = makeRequest("abc");
    const res = await GET(req, ctx);
    expect(res.status).toBe(400);
    expect((await res.json()).error).toBe("Invalid id");
  });

  it("存在しないキャンペーン → 404", async () => {
    mockAuth.mockResolvedValueOnce({ user: { id: "1", role: "admin" } });
    // 1回目: キャンペーン検索 → 空
    mockSelect.mockReturnValueOnce({
      from: () => ({
        where: () => ({
          limit: () => Promise.resolve([]),
        }),
      }),
    });
    const [req, ctx] = makeRequest("99");
    const res = await GET(req, ctx);
    expect(res.status).toBe(404);
    expect((await res.json()).error).toBe("Campaign not found");
  });

  it("キャンペーン存在・応募者あり → 200", async () => {
    mockAuth.mockResolvedValueOnce({ user: { id: "1", role: "admin" } });
    // 1回目: キャンペーン検索
    mockSelect.mockReturnValueOnce({
      from: () => ({
        where: () => ({
          limit: () => Promise.resolve([{ id: 1, name: "テストキャンペーン" }]),
        }),
      }),
    });
    // 2回目: count クエリ
    mockSelect.mockReturnValueOnce({
      from: () => ({
        where: () => Promise.resolve([{ total: 2 }]),
      }),
    });
    const now = new Date("2026-06-27T00:00:00Z");
    // 3回目: 応募者リスト
    mockSelect.mockReturnValueOnce({
      from: () => ({
        leftJoin: () => ({
          where: () => ({
            orderBy: () => ({
              limit: () => Promise.resolve([
                { applicationId: 1, userId: 10, userName: "Alice", appliedAt: now },
                { applicationId: 2, userId: 11, userName: "Bob", appliedAt: now },
              ]),
            }),
          }),
        }),
      }),
    });
    const [req, ctx] = makeRequest("1");
    const res = await GET(req, ctx);
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.total).toBe(2);
    expect(body.applications).toHaveLength(2);
    expect(body.applications[0].userName).toBe("Alice");
    expect(body.nextCursor).toBeNull();
  });

  it("不正な cursor → 400", async () => {
    mockAuth.mockResolvedValueOnce({ user: { id: "1", role: "admin" } });
    mockSelect.mockReturnValueOnce({
      from: () => ({
        where: () => ({
          limit: () => Promise.resolve([{ id: 1, name: "テスト" }]),
        }),
      }),
    });
    const [req, ctx] = makeRequest("1", { cursor: "!!bad!!" });
    const res = await GET(req, ctx);
    expect(res.status).toBe(400);
    expect((await res.json()).error).toBe("Invalid cursor");
  });
});
