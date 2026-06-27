import { describe, it, expect, vi, beforeEach } from "vitest";
import { NextRequest } from "next/server";

const { mockSelect, mockUpdate } = vi.hoisted(() => ({
  mockSelect: vi.fn(),
  mockUpdate: vi.fn(),
}));

vi.mock("@/lib/db", () => ({
  db: {
    select: mockSelect,
    update: mockUpdate,
  },
}));

const { mockAuth } = vi.hoisted(() => ({
  mockAuth: vi.fn().mockResolvedValue(null),
}));

vi.mock("@/lib/auth", () => ({
  auth: mockAuth,
}));

import { DELETE } from "@/app/api/users/me/posts/[id]/route";

function makeRequest(id: string): [NextRequest, { params: Promise<{ id: string }> }] {
  const req = new NextRequest(`http://localhost:3000/api/users/me/posts/${id}`, {
    method: "DELETE",
  });
  return [req, { params: Promise.resolve({ id }) }];
}

function mockDbFind(rows: unknown[]) {
  mockSelect.mockReturnValue({
    from: () => ({
      where: () => ({
        limit: () => Promise.resolve(rows),
      }),
    }),
  });
}

function mockDbUpdate() {
  mockUpdate.mockReturnValue({
    set: () => ({
      where: () => Promise.resolve(undefined),
    }),
  });
}

describe("DELETE /api/users/me/posts/[id]", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("未認証 → 401", async () => {
    mockAuth.mockResolvedValueOnce(null);
    const [req, ctx] = makeRequest("1");
    const res = await DELETE(req, ctx);
    expect(res.status).toBe(401);
    expect((await res.json()).error).toBe("Unauthorized");
  });

  it("不正な id → 400", async () => {
    mockAuth.mockResolvedValueOnce({ user: { id: "1" } });
    const [req, ctx] = makeRequest("abc");
    const res = await DELETE(req, ctx);
    expect(res.status).toBe(400);
    expect((await res.json()).error).toBe("Invalid id");
  });

  it("id=0 → 400", async () => {
    mockAuth.mockResolvedValueOnce({ user: { id: "1" } });
    const [req, ctx] = makeRequest("0");
    const res = await DELETE(req, ctx);
    expect(res.status).toBe(400);
  });

  it("存在しない投稿 → 404", async () => {
    mockAuth.mockResolvedValueOnce({ user: { id: "1" } });
    mockDbFind([]);
    const [req, ctx] = makeRequest("99");
    const res = await DELETE(req, ctx);
    expect(res.status).toBe(404);
    expect((await res.json()).error).toBe("Post not found");
  });

  it("他人の投稿 → 403", async () => {
    mockAuth.mockResolvedValueOnce({ user: { id: "1" } });
    mockDbFind([{ id: 5, userId: 2 }]);
    const [req, ctx] = makeRequest("5");
    const res = await DELETE(req, ctx);
    expect(res.status).toBe(403);
    expect((await res.json()).error).toBe("Forbidden");
  });

  it("自分の投稿を削除 → 200 success", async () => {
    mockAuth.mockResolvedValueOnce({ user: { id: "1" } });
    mockDbFind([{ id: 5, userId: 1 }]);
    mockDbUpdate();
    const [req, ctx] = makeRequest("5");
    const res = await DELETE(req, ctx);
    expect(res.status).toBe(200);
    expect((await res.json()).success).toBe(true);
    expect(mockUpdate).toHaveBeenCalledOnce();
  });
});
