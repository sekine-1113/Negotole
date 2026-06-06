import { describe, it, expect, vi, beforeEach } from "vitest";

const { mockAuth, mockSelect } = vi.hoisted(() => ({
  mockAuth: vi.fn(),
  mockSelect: vi.fn(),
}));

vi.mock("@/lib/auth", () => ({ auth: mockAuth }));

vi.mock("@/lib/db", () => ({
  db: { select: mockSelect },
}));

vi.mock("@/lib/points", () => ({
  getPointBalance: vi.fn().mockResolvedValue({ daily: 10, permanent: 0, total: 10 }),
}));

import { GET } from "@/app/api/users/me/route";

describe("GET /api/users/me", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("未認証 → 401", async () => {
    mockAuth.mockResolvedValueOnce(null);

    const res = await GET();

    expect(res.status).toBe(401);
    expect((await res.json()).error).toBe("Unauthorized");
  });

  it("認証済み + ユーザー存在 → 200 + { user, points }", async () => {
    mockAuth.mockResolvedValueOnce({ user: { id: "1", role: "user" } });
    mockSelect.mockReturnValueOnce({
      from: () => ({
        where: () => ({
          limit: () => Promise.resolve([{ id: 1, name: "テスト", role: "user" }]),
        }),
      }),
    });

    const res = await GET();

    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.user.id).toBe(1);
    expect(body.points).toBeDefined();
  });

  it("認証済み + ユーザー不存在 → 404", async () => {
    mockAuth.mockResolvedValueOnce({ user: { id: "999", role: "user" } });
    mockSelect.mockReturnValueOnce({
      from: () => ({
        where: () => ({
          limit: () => Promise.resolve([]),
        }),
      }),
    });

    const res = await GET();

    expect(res.status).toBe(404);
  });
});
