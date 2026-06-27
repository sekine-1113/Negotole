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

import { GET } from "@/app/api/users/me/points/route";

function makeRequest(params?: Record<string, string>): NextRequest {
  const url = new URL("http://localhost:3000/api/users/me/points");
  if (params) {
    for (const [k, v] of Object.entries(params)) url.searchParams.set(k, v);
  }
  return new NextRequest(url.toString());
}

function mockDbSuccess(rows: unknown[] = []) {
  mockSelect.mockReturnValue({
    from: () => ({
      where: () => ({
        orderBy: () => ({
          limit: () => Promise.resolve(rows),
        }),
      }),
    }),
  });
}

describe("GET /api/users/me/points", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("未認証 → 401", async () => {
    mockAuth.mockResolvedValueOnce(null);
    const res = await GET(makeRequest());
    expect(res.status).toBe(401);
    expect((await res.json()).error).toBe("Unauthorized");
  });

  it("認証済み・レコードなし → 200 空配列", async () => {
    mockAuth.mockResolvedValueOnce({ user: { id: "1" } });
    mockDbSuccess([]);
    const res = await GET(makeRequest());
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.points).toEqual([]);
    expect(body.nextCursor).toBeNull();
  });

  it("認証済み・レコードあり → 200 シリアライズ済みリスト", async () => {
    mockAuth.mockResolvedValueOnce({ user: { id: "1" } });
    const now = new Date("2026-06-27T00:00:00Z");
    const rows = [
      { id: 5, getPoint: 10, expiresAt: now, createdAt: now },
      { id: 4, getPoint: -1, expiresAt: null, createdAt: now },
    ];
    mockDbSuccess(rows);
    const res = await GET(makeRequest());
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.points).toHaveLength(2);
    expect(body.points[0].getPoint).toBe(10);
    expect(body.points[0].expiresAt).toBe(now.toISOString());
    expect(body.points[1].getPoint).toBe(-1);
    expect(body.points[1].expiresAt).toBeNull();
    expect(body.nextCursor).toBeNull();
  });

  it("hasMore=true のとき nextCursor が返る", async () => {
    mockAuth.mockResolvedValueOnce({ user: { id: "1" } });
    const now = new Date("2026-06-27T00:00:00Z");
    // limit=2 のリクエストで 3 件返す → hasMore=true
    const rows = Array.from({ length: 3 }, (_, i) => ({
      id: 3 - i,
      getPoint: 10,
      expiresAt: null,
      createdAt: now,
    }));
    mockDbSuccess(rows);
    const res = await GET(makeRequest({ limit: "2" }));
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.points).toHaveLength(2);
    expect(body.nextCursor).not.toBeNull();
  });

  it("不正な cursor → 400", async () => {
    mockAuth.mockResolvedValueOnce({ user: { id: "1" } });
    const res = await GET(makeRequest({ cursor: "!!invalid!!" }));
    expect(res.status).toBe(400);
    expect((await res.json()).error).toBe("Invalid cursor");
  });

  it("cursor=base64('0')（0以下）→ 400", async () => {
    mockAuth.mockResolvedValueOnce({ user: { id: "1" } });
    const res = await GET(makeRequest({ cursor: Buffer.from("0").toString("base64") }));
    expect(res.status).toBe(400);
  });
});
