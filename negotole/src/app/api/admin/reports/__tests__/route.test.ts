import { describe, it, expect, vi, beforeEach } from "vitest";
import { NextRequest } from "next/server";

const { mockSelect, mockUpdate } = vi.hoisted(() => ({
  mockSelect: vi.fn(),
  mockUpdate: vi.fn(),
}));

vi.mock("@/lib/db", () => ({
  db: { select: mockSelect, update: mockUpdate },
}));

const { mockAuth } = vi.hoisted(() => ({
  mockAuth: vi.fn().mockResolvedValue(null),
}));

vi.mock("@/lib/auth", () => ({
  auth: mockAuth,
}));

import { GET, PATCH } from "@/app/api/admin/reports/route";

function makeGetRequest(params?: Record<string, string>): NextRequest {
  const url = new URL("http://localhost:3000/api/admin/reports");
  if (params) {
    for (const [k, v] of Object.entries(params)) url.searchParams.set(k, v);
  }
  return new NextRequest(url.toString());
}

function makePatchRequest(body: unknown): NextRequest {
  return new NextRequest("http://localhost:3000/api/admin/reports", {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
}

function mockDbSelectList(rows: unknown[]) {
  mockSelect.mockReturnValueOnce({
    from: () => ({
      leftJoin: () => ({
        leftJoin: () => ({
          where: () => ({
            orderBy: () => ({
              limit: () => Promise.resolve(rows),
            }),
          }),
        }),
      }),
    }),
  });
}

describe("GET /api/admin/reports", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("未認証 → 401", async () => {
    mockAuth.mockResolvedValueOnce(null);
    const res = await GET(makeGetRequest());
    expect(res.status).toBe(401);
  });

  it("一般ユーザー → 403", async () => {
    mockAuth.mockResolvedValueOnce({ user: { id: "1", role: "user" } });
    const res = await GET(makeGetRequest());
    expect(res.status).toBe(403);
  });

  it("管理者・通報なし → 200 空配列", async () => {
    mockAuth.mockResolvedValueOnce({ user: { id: "1", role: "admin" } });
    mockDbSelectList([]);
    const res = await GET(makeGetRequest());
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.reports).toEqual([]);
    expect(body.nextCursor).toBeNull();
  });

  it("管理者・通報あり → 200 リスト", async () => {
    mockAuth.mockResolvedValueOnce({ user: { id: "1", role: "admin" } });
    const now = new Date("2026-06-27T00:00:00Z");
    const rows = [
      { id: 2, postId: 10, postContent: "投稿内容", reporterName: "Alice", reason: "スパム", resolvedAt: null, createdAt: now },
      { id: 1, postId: 11, postContent: null, reporterName: null, reason: "不適切", resolvedAt: now, createdAt: now },
    ];
    mockDbSelectList(rows);
    const res = await GET(makeGetRequest());
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.reports).toHaveLength(2);
    expect(body.reports[0].reason).toBe("スパム");
    expect(body.reports[1].reporterName).toBe("不明");
  });

  it("不正な cursor → 400", async () => {
    mockAuth.mockResolvedValueOnce({ user: { id: "1", role: "admin" } });
    const res = await GET(makeGetRequest({ cursor: "!!bad!!" }));
    expect(res.status).toBe(400);
  });
});

describe("PATCH /api/admin/reports", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("未認証 → 401", async () => {
    mockAuth.mockResolvedValueOnce(null);
    const res = await PATCH(makePatchRequest({ id: 1 }));
    expect(res.status).toBe(401);
  });

  it("一般ユーザー → 403", async () => {
    mockAuth.mockResolvedValueOnce({ user: { id: "1", role: "user" } });
    const res = await PATCH(makePatchRequest({ id: 1 }));
    expect(res.status).toBe(403);
  });

  it("id なし → 400", async () => {
    mockAuth.mockResolvedValueOnce({ user: { id: "1", role: "admin" } });
    const res = await PATCH(makePatchRequest({}));
    expect(res.status).toBe(400);
  });

  it("存在しない通報 → 404", async () => {
    mockAuth.mockResolvedValueOnce({ user: { id: "1", role: "admin" } });
    mockSelect.mockReturnValueOnce({
      from: () => ({
        where: () => ({
          limit: () => Promise.resolve([]),
        }),
      }),
    });
    const res = await PATCH(makePatchRequest({ id: 99 }));
    expect(res.status).toBe(404);
  });

  it("正常に解決済みマーク → 200", async () => {
    mockAuth.mockResolvedValueOnce({ user: { id: "1", role: "admin" } });
    mockSelect.mockReturnValueOnce({
      from: () => ({
        where: () => ({
          limit: () => Promise.resolve([{ id: 1, resolvedAt: null }]),
        }),
      }),
    });
    mockUpdate.mockReturnValueOnce({
      set: () => ({
        where: () => Promise.resolve(undefined),
      }),
    });
    const res = await PATCH(makePatchRequest({ id: 1 }));
    expect(res.status).toBe(200);
    expect((await res.json()).success).toBe(true);
    expect(mockUpdate).toHaveBeenCalledOnce();
  });
});
