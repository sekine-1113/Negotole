import { describe, it, expect, vi, beforeEach } from "vitest";
import { NextRequest } from "next/server";

const { mockAuth, mockSelect, mockInsert } = vi.hoisted(() => ({
  mockAuth: vi.fn(),
  mockSelect: vi.fn(),
  mockInsert: vi.fn(),
}));

vi.mock("@/lib/auth", () => ({ auth: mockAuth }));

vi.mock("@/lib/db", () => ({
  db: { select: mockSelect, insert: mockInsert },
}));

import { GET, POST } from "@/app/api/admin/campaigns/route";

function makeGetRequest(params?: Record<string, string>): NextRequest {
  const url = new URL("http://localhost:3000/api/admin/campaigns");
  if (params) {
    for (const [k, v] of Object.entries(params)) url.searchParams.set(k, v);
  }
  return new NextRequest(url.toString());
}

function makePostRequest(body: Record<string, unknown>): NextRequest {
  return new NextRequest("http://localhost:3000/api/admin/campaigns", {
    method: "POST",
    body: JSON.stringify(body),
    headers: { "Content-Type": "application/json" },
  });
}

const adminSession = { user: { id: "1", role: "admin" } };
const userSession = { user: { id: "2", role: "user" } };

const validBody = {
  name: "テストキャンペーン",
  startsAt: "2026-07-01T00:00:00.000Z",
  endsAt: "2026-07-31T23:59:59.000Z",
  bonusPoints: 100,
};

describe("GET /api/admin/campaigns - 認証・認可", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("未認証 → 401", async () => {
    mockAuth.mockResolvedValueOnce(null);
    const res = await GET(makeGetRequest());
    expect(res.status).toBe(401);
  });

  it("一般ユーザー → 403", async () => {
    mockAuth.mockResolvedValueOnce(userSession);
    const res = await GET(makeGetRequest());
    expect(res.status).toBe(403);
  });

  it("管理者 + 正常 → 200 + { campaigns, nextCursor }", async () => {
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
    expect(Array.isArray(body.campaigns)).toBe(true);
    expect("nextCursor" in body).toBe(true);
  });

  it("管理者 + 不正な cursor → 400", async () => {
    mockAuth.mockResolvedValueOnce(adminSession);
    const res = await GET(makeGetRequest({ cursor: "!!invalid!!" }));
    expect(res.status).toBe(400);
  });
});

describe("POST /api/admin/campaigns - 認証・認可", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("未認証 → 401", async () => {
    mockAuth.mockResolvedValueOnce(null);
    const res = await POST(makePostRequest(validBody));
    expect(res.status).toBe(401);
  });

  it("一般ユーザー → 403", async () => {
    mockAuth.mockResolvedValueOnce(userSession);
    const res = await POST(makePostRequest(validBody));
    expect(res.status).toBe(403);
  });
});

describe("POST /api/admin/campaigns - バリデーション", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockAuth.mockResolvedValue(adminSession);
  });

  it("name が空文字 → 400", async () => {
    const res = await POST(makePostRequest({ ...validBody, name: "" }));
    expect(res.status).toBe(400);
  });

  it("name が 256 文字超 → 400", async () => {
    const res = await POST(makePostRequest({ ...validBody, name: "a".repeat(256) }));
    expect(res.status).toBe(400);
  });

  it("endsAt <= startsAt → 400", async () => {
    const res = await POST(makePostRequest({
      ...validBody,
      startsAt: "2026-07-31T00:00:00.000Z",
      endsAt: "2026-07-01T00:00:00.000Z",
    }));
    expect(res.status).toBe(400);
  });

  it("bonusPoints が 0 → 400", async () => {
    const res = await POST(makePostRequest({ ...validBody, bonusPoints: 0 }));
    expect(res.status).toBe(400);
  });

  it("既存のアクティブキャンペーンが存在する → 409", async () => {
    mockSelect.mockReturnValueOnce({
      from: () => ({
        where: () => ({
          limit: () => Promise.resolve([{ id: 1 }]),
        }),
      }),
    });

    const res = await POST(makePostRequest(validBody));
    expect(res.status).toBe(409);
  });

  it("正常な入力 + 既存キャンペーンなし → 201", async () => {
    mockSelect.mockReturnValueOnce({
      from: () => ({
        where: () => ({
          limit: () => Promise.resolve([]),
        }),
      }),
    });
    const created = {
      id: 1, name: validBody.name, description: null,
      startsAt: new Date(validBody.startsAt), endsAt: new Date(validBody.endsAt),
      bonusPoints: 100, pointsType: "permanent",
      createdAt: new Date(), updatedAt: null, deletedAt: null,
    };
    mockInsert.mockReturnValueOnce({
      values: () => ({ returning: () => Promise.resolve([created]) }),
    });

    const res = await POST(makePostRequest(validBody));
    expect(res.status).toBe(201);
    const body = await res.json();
    expect(body.campaign.id).toBe(1);
  });
});
