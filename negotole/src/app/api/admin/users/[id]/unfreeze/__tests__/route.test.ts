import { describe, it, expect, vi, beforeEach } from "vitest";
import { NextRequest } from "next/server";

const { mockAuth, mockSelect, mockUpdate, mockInsert } = vi.hoisted(() => ({
  mockAuth: vi.fn(),
  mockSelect: vi.fn(),
  mockUpdate: vi.fn(),
  mockInsert: vi.fn(),
}));

vi.mock("@/lib/auth", () => ({ auth: mockAuth }));
vi.mock("@/lib/db", () => ({ db: { select: mockSelect, update: mockUpdate, insert: mockInsert } }));
vi.mock("@/lib/ratelimit", () => ({ adminLimiter: null }));
vi.mock("next/cache", () => ({ revalidateTag: vi.fn() }));
vi.mock("@/lib/logger", () => ({ log: vi.fn() }));

import { POST } from "@/app/api/admin/users/[id]/unfreeze/route";

function makeRequest(id: string): NextRequest {
  return new NextRequest(`http://localhost:3000/api/admin/users/${id}/unfreeze`, {
    method: "POST",
  });
}

const adminSession = { user: { id: "1", role: "admin" } };
const userSession = { user: { id: "2", role: "user" } };

describe("POST /api/admin/users/[id]/unfreeze - 認証・認可", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("未認証 → 403", async () => {
    mockAuth.mockResolvedValueOnce(null);
    const res = await POST(makeRequest("1"), { params: Promise.resolve({ id: "1" }) });
    expect(res.status).toBe(403);
  });

  it("一般ユーザー → 403", async () => {
    mockAuth.mockResolvedValueOnce(userSession);
    const res = await POST(makeRequest("1"), { params: Promise.resolve({ id: "1" }) });
    expect(res.status).toBe(403);
  });
});

describe("POST /api/admin/users/[id]/unfreeze - バリデーション", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("凍結されていないユーザーを解除 → 409", async () => {
    mockAuth.mockResolvedValueOnce(adminSession);
    mockSelect.mockReturnValueOnce({
      from: () => ({
        where: () => ({
          limit: () => Promise.resolve([{ id: 2, bannedAt: null }]),
        }),
      }),
    });

    const res = await POST(makeRequest("2"), { params: Promise.resolve({ id: "2" }) });
    expect(res.status).toBe(409);
  });
});

describe("POST /api/admin/users/[id]/unfreeze - 正常系", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("正常解除 → 200 { success: true }", async () => {
    mockAuth.mockResolvedValueOnce(adminSession);
    mockSelect.mockReturnValueOnce({
      from: () => ({
        where: () => ({
          limit: () => Promise.resolve([{ id: 3, bannedAt: new Date() }]),
        }),
      }),
    });
    mockUpdate.mockReturnValueOnce({
      set: () => ({
        where: () => Promise.resolve(undefined),
      }),
    });
    mockInsert.mockReturnValueOnce({
      values: () => Promise.resolve(undefined),
    });

    const res = await POST(makeRequest("3"), { params: Promise.resolve({ id: "3" }) });
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.success).toBe(true);
  });
});
