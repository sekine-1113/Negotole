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

import { GET } from "@/app/api/users/me/posts/route";

function makeRequest(params?: Record<string, string>): NextRequest {
  const url = new URL("http://localhost:3000/api/users/me/posts");
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

describe("GET /api/users/me/posts", () => {
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
    expect(body.posts).toEqual([]);
    expect(body.nextCursor).toBeNull();
  });

  it("認証済み・レコードあり → 200 シリアライズ済みリスト", async () => {
    mockAuth.mockResolvedValueOnce({ user: { id: "1" } });
    const now = new Date("2026-06-27T00:00:00Z");
    const future = new Date("2026-06-27T06:00:00Z");
    const rows = [
      { id: 3, content: "投稿C", hiddenAt: future, createdAt: now },
      { id: 2, content: "投稿B", hiddenAt: future, createdAt: now },
    ];
    mockDbSuccess(rows);
    const res = await GET(makeRequest());
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.posts).toHaveLength(2);
    expect(body.posts[0].content).toBe("投稿C");
    expect(body.posts[0].hiddenAt).toBe(future.toISOString());
    expect(body.nextCursor).toBeNull();
  });

  it("hasMore=true のとき nextCursor が返る", async () => {
    mockAuth.mockResolvedValueOnce({ user: { id: "1" } });
    const now = new Date("2026-06-27T00:00:00Z");
    const future = new Date("2026-06-27T06:00:00Z");
    const rows = Array.from({ length: 3 }, (_, i) => ({
      id: 3 - i,
      content: `投稿${i}`,
      hiddenAt: future,
      createdAt: now,
    }));
    mockDbSuccess(rows);
    const res = await GET(makeRequest({ limit: "2" }));
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.posts).toHaveLength(2);
    expect(body.nextCursor).not.toBeNull();
  });

  it("不正な cursor → 400", async () => {
    mockAuth.mockResolvedValueOnce({ user: { id: "1" } });
    const res = await GET(makeRequest({ cursor: "!!invalid!!" }));
    expect(res.status).toBe(400);
    expect((await res.json()).error).toBe("Invalid cursor");
  });
});
