import { describe, it, expect, vi, beforeEach } from "vitest";
import { NextRequest } from "next/server";

const { mockAuth, mockSelect } = vi.hoisted(() => ({
  mockAuth: vi.fn(),
  mockSelect: vi.fn(),
}));

vi.mock("@/lib/auth", () => ({ auth: mockAuth }));
vi.mock("@/lib/db", () => ({ db: { select: mockSelect } }));
vi.mock("@/lib/ratelimit", () => ({ adminLimiter: null }));
vi.mock("@/lib/logger", () => ({ log: vi.fn() }));

import { GET } from "@/app/api/admin/users/route";

function makeGetRequest(params?: Record<string, string>): NextRequest {
  const url = new URL("http://localhost:3000/api/admin/users");
  if (params) {
    for (const [k, v] of Object.entries(params)) url.searchParams.set(k, v);
  }
  return new NextRequest(url.toString());
}

const adminSession = { user: { id: "1", role: "admin" } };
const userSession = { user: { id: "2", role: "user" } };

describe("GET /api/admin/users - 認証・認可", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("未認証 → 403", async () => {
    mockAuth.mockResolvedValueOnce(null);
    const res = await GET(makeGetRequest());
    expect(res.status).toBe(403);
  });

  it("一般ユーザー → 403", async () => {
    mockAuth.mockResolvedValueOnce(userSession);
    const res = await GET(makeGetRequest());
    expect(res.status).toBe(403);
  });
});

describe("GET /api/admin/users - 正常系", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("管理者・正常取得 → 200 { users, nextCursor }", async () => {
    mockAuth.mockResolvedValueOnce(adminSession);
    mockSelect.mockReturnValueOnce({
      from: () => ({
        where: () => ({
          orderBy: () => ({
            limit: () => Promise.resolve([]),
          }),
        }),
      }),
    });

    const res = await GET(makeGetRequest());

    expect(res.status).toBe(200);
    const body = await res.json();
    expect(Array.isArray(body.users)).toBe(true);
    expect(body.nextCursor).toBeNull();
  });

  it("不正カーソル → 400", async () => {
    mockAuth.mockResolvedValueOnce(adminSession);
    const res = await GET(makeGetRequest({ cursor: "!!invalid!!" }));
    expect(res.status).toBe(400);
  });
});
