import { describe, it, expect, vi, beforeEach } from "vitest";

const { mockExecute } = vi.hoisted(() => ({
  mockExecute: vi.fn(),
}));

vi.mock("@/lib/db", () => ({
  db: { execute: mockExecute },
}));

import { GET } from "@/app/api/health/route";

describe("GET /api/health", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("DB 接続成功 → 200 + { status: 'ok', db: 'ok' }", async () => {
    mockExecute.mockResolvedValueOnce(undefined);

    const res = await GET();

    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ status: "ok", db: "ok" });
  });

  it("DB 接続失敗 → 503 + { status: 'error', db: 'error' }", async () => {
    mockExecute.mockRejectedValueOnce(new Error("DB connection failed"));

    const res = await GET();

    expect(res.status).toBe(503);
    expect(await res.json()).toEqual({ status: "error", db: "error" });
  });
});
