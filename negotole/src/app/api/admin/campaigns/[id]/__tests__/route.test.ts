import { describe, it, expect, vi, beforeEach } from "vitest";
import { NextRequest } from "next/server";

const { mockAuth, mockSelect, mockUpdate } = vi.hoisted(() => ({
  mockAuth: vi.fn(),
  mockSelect: vi.fn(),
  mockUpdate: vi.fn(),
}));

vi.mock("@/lib/auth", () => ({ auth: mockAuth }));

vi.mock("@/lib/db", () => ({
  db: { select: mockSelect, update: mockUpdate },
}));

import { PATCH, DELETE } from "@/app/api/admin/campaigns/[id]/route";

function makeParams(id: string) {
  return Promise.resolve({ id });
}

function makePatchRequest(body: Record<string, unknown>): NextRequest {
  return new NextRequest("http://localhost:3000/api/admin/campaigns/1", {
    method: "PATCH",
    body: JSON.stringify(body),
    headers: { "Content-Type": "application/json" },
  });
}

function makeDeleteRequest(): NextRequest {
  return new NextRequest("http://localhost:3000/api/admin/campaigns/1", {
    method: "DELETE",
  });
}

const adminSession = { user: { id: "1", role: "admin" } };
const userSession = { user: { id: "2", role: "user" } };

describe("PATCH /api/admin/campaigns/[id] - 認証・認可", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("未認証 → 401", async () => {
    mockAuth.mockResolvedValueOnce(null);
    const res = await PATCH(makePatchRequest({ name: "更新" }), { params: makeParams("1") });
    expect(res.status).toBe(401);
  });

  it("一般ユーザー → 403", async () => {
    mockAuth.mockResolvedValueOnce(userSession);
    const res = await PATCH(makePatchRequest({ name: "更新" }), { params: makeParams("1") });
    expect(res.status).toBe(403);
  });

  it("管理者 + 存在しない ID → 404", async () => {
    mockAuth.mockResolvedValueOnce(adminSession);
    mockSelect.mockReturnValueOnce({
      from: () => ({
        where: () => ({
          limit: () => Promise.resolve([]),
        }),
      }),
    });

    const res = await PATCH(makePatchRequest({ name: "更新" }), { params: makeParams("9999") });
    expect(res.status).toBe(404);
  });
});

describe("DELETE /api/admin/campaigns/[id] - 認証・認可", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("未認証 → 401", async () => {
    mockAuth.mockResolvedValueOnce(null);
    const res = await DELETE(makeDeleteRequest(), { params: makeParams("1") });
    expect(res.status).toBe(401);
  });

  it("一般ユーザー → 403", async () => {
    mockAuth.mockResolvedValueOnce(userSession);
    const res = await DELETE(makeDeleteRequest(), { params: makeParams("1") });
    expect(res.status).toBe(403);
  });
});
