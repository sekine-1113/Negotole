import { describe, it, expect, vi, beforeEach } from "vitest";
import { NextRequest } from "next/server";

const { mockSelect } = vi.hoisted(() => ({
  mockSelect: vi.fn(),
}));

vi.mock("@/lib/db", () => ({
  db: {
    select: mockSelect,
  },
}));

const { mockAuth } = vi.hoisted(() => ({
  mockAuth: vi.fn().mockResolvedValue(null),
}));

vi.mock("@/lib/auth", () => ({
  auth: mockAuth,
}));

vi.mock("next/cache", () => ({
  revalidatePath: vi.fn(),
  revalidateTag: vi.fn(),
}));

import { GET, POST } from "@/app/api/posts/route";

function makeRequest(cursor?: string): NextRequest {
  const url = new URL("http://localhost:3000/api/posts");
  if (cursor !== undefined) url.searchParams.set("cursor", cursor);
  return new NextRequest(url.toString());
}

function mockDbSuccess() {
  mockSelect.mockReturnValue({
    from: () => ({
      where: () => ({
        orderBy: () => ({
          limit: () => Promise.resolve([]),
        }),
      }),
    }),
  });
}

describe("GET /api/posts - cursor バリデーション", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("cursor なし → 200", async () => {
    mockDbSuccess();
    const res = await GET(makeRequest());
    expect(res.status).toBe(200);
  });

  it("正常な cursor（base64('1')）→ 200", async () => {
    mockDbSuccess();
    const res = await GET(makeRequest(Buffer.from("1").toString("base64")));
    expect(res.status).toBe(200);
  });

  it("不正な base64 文字列 → 400", async () => {
    const res = await GET(makeRequest("!!invalid!!"));
    expect(res.status).toBe(400);
    expect((await res.json()).error).toBe("Invalid cursor");
  });

  it("base64('abc')（非数値）→ 400", async () => {
    const res = await GET(makeRequest(Buffer.from("abc").toString("base64")));
    expect(res.status).toBe(400);
    expect((await res.json()).error).toBe("Invalid cursor");
  });

  it("base64('1.5')（浮動小数）→ 400", async () => {
    const res = await GET(makeRequest(Buffer.from("1.5").toString("base64")));
    expect(res.status).toBe(400);
    expect((await res.json()).error).toBe("Invalid cursor");
  });

  it("base64('0')（0）→ 400", async () => {
    const res = await GET(makeRequest(Buffer.from("0").toString("base64")));
    expect(res.status).toBe(400);
    expect((await res.json()).error).toBe("Invalid cursor");
  });

  it("base64('-1')（負数）→ 400", async () => {
    const res = await GET(makeRequest(Buffer.from("-1").toString("base64")));
    expect(res.status).toBe(400);
    expect((await res.json()).error).toBe("Invalid cursor");
  });

  it("base64('9999999999999999999')（2^53超の大整数）→ 400", async () => {
    const res = await GET(makeRequest(Buffer.from("9999999999999999999").toString("base64")));
    expect(res.status).toBe(400);
    expect((await res.json()).error).toBe("Invalid cursor");
  });
});

describe("POST /api/posts - 認証チェック", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("未認証 → 401", async () => {
    mockAuth.mockResolvedValueOnce(null);
    const req = new NextRequest("http://localhost:3000/api/posts", {
      method: "POST",
      body: JSON.stringify({ content: "test", duration: 60 }),
      headers: { "Content-Type": "application/json" },
    });

    const res = await POST(req);

    expect(res.status).toBe(401);
    expect((await res.json()).error).toBe("Unauthorized");
  });
});
