import { describe, it, expect, vi, beforeEach } from "vitest";
import { NextRequest } from "next/server";

const { mockSelect, mockInsert } = vi.hoisted(() => ({
  mockSelect: vi.fn(),
  mockInsert: vi.fn(),
}));

vi.mock("@/lib/db", () => ({
  db: { select: mockSelect, insert: mockInsert },
}));

const { mockAuth } = vi.hoisted(() => ({
  mockAuth: vi.fn().mockResolvedValue(null),
}));

vi.mock("@/lib/auth", () => ({
  auth: mockAuth,
}));

import { POST } from "@/app/api/posts/[id]/report/route";

function makeRequest(id: string, body?: unknown): [NextRequest, { params: Promise<{ id: string }> }] {
  const req = new NextRequest(`http://localhost:3000/api/posts/${id}/report`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: body !== undefined ? JSON.stringify(body) : undefined,
  });
  return [req, { params: Promise.resolve({ id }) }];
}

function mockDbFind(rows: unknown[]) {
  mockSelect.mockReturnValueOnce({
    from: () => ({
      where: () => ({
        limit: () => Promise.resolve(rows),
      }),
    }),
  });
}

function mockDbInsert() {
  mockInsert.mockReturnValueOnce({
    values: () => Promise.resolve(undefined),
  });
}

describe("POST /api/posts/[id]/report", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("未認証 → 401", async () => {
    mockAuth.mockResolvedValueOnce(null);
    const [req, ctx] = makeRequest("1", { reason: "スパム" });
    const res = await POST(req, ctx);
    expect(res.status).toBe(401);
  });

  it("不正な id → 400", async () => {
    mockAuth.mockResolvedValueOnce({ user: { id: "1" } });
    const [req, ctx] = makeRequest("abc", { reason: "スパム" });
    const res = await POST(req, ctx);
    expect(res.status).toBe(400);
    expect((await res.json()).error).toBe("Invalid id");
  });

  it("reason なし → 400", async () => {
    mockAuth.mockResolvedValueOnce({ user: { id: "1" } });
    const [req, ctx] = makeRequest("1", {});
    const res = await POST(req, ctx);
    expect(res.status).toBe(400);
  });

  it("reason が空文字 → 400", async () => {
    mockAuth.mockResolvedValueOnce({ user: { id: "1" } });
    const [req, ctx] = makeRequest("1", { reason: "   " });
    const res = await POST(req, ctx);
    expect(res.status).toBe(400);
  });

  it("存在しない投稿 → 404", async () => {
    mockAuth.mockResolvedValueOnce({ user: { id: "1" } });
    mockDbFind([]);
    const [req, ctx] = makeRequest("99", { reason: "スパム" });
    const res = await POST(req, ctx);
    expect(res.status).toBe(404);
  });

  it("正常な通報 → 201", async () => {
    mockAuth.mockResolvedValueOnce({ user: { id: "1" } });
    mockDbFind([{ id: 5 }]);
    mockDbInsert();
    const [req, ctx] = makeRequest("5", { reason: "スパム" });
    const res = await POST(req, ctx);
    expect(res.status).toBe(201);
    expect((await res.json()).success).toBe(true);
    expect(mockInsert).toHaveBeenCalledOnce();
  });
});
