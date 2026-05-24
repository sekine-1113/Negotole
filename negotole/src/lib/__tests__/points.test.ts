import { describe, it, expect, vi, beforeEach } from "vitest";

// vi.mock はホイストされるため、変数も vi.hoisted() で定義する
const { mockSelect, mockInsert } = vi.hoisted(() => ({
  mockSelect: vi.fn(),
  mockInsert: vi.fn(),
}));

vi.mock("@/lib/db", () => ({
  db: {
    select: mockSelect,
    insert: mockInsert,
  },
}));

import { getPointBalance, hasDailyPointToday, grantDailyPoints, consumeOnePoint } from "@/lib/points";

describe("getPointBalance", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("total・daily・permanent を正しく返す", async () => {
    mockSelect
      .mockReturnValueOnce({ from: () => ({ where: () => Promise.resolve([{ total: "15" }]) }) })
      .mockReturnValueOnce({ from: () => ({ where: () => Promise.resolve([{ total: "10" }]) }) })
      .mockReturnValueOnce({ from: () => ({ where: () => Promise.resolve([{ total: "5" }]) }) });

    const result = await getPointBalance(1);

    expect(result.total).toBe(15);
    expect(result.daily).toBe(10);
    expect(result.permanent).toBe(5);
  });

  it("レコードがない場合は 0 を返す", async () => {
    mockSelect
      .mockReturnValueOnce({ from: () => ({ where: () => Promise.resolve([{ total: null }]) }) })
      .mockReturnValueOnce({ from: () => ({ where: () => Promise.resolve([{ total: null }]) }) })
      .mockReturnValueOnce({ from: () => ({ where: () => Promise.resolve([{ total: null }]) }) });

    const result = await getPointBalance(99);

    expect(result.total).toBe(0);
    expect(result.daily).toBe(0);
    expect(result.permanent).toBe(0);
  });
});

describe("hasDailyPointToday", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("当日ポイントレコードがある場合は true を返す", async () => {
    mockSelect.mockReturnValueOnce({
      from: () => ({ where: () => ({ limit: () => Promise.resolve([{ id: 1 }]) }) }),
    });

    const result = await hasDailyPointToday(1);
    expect(result).toBe(true);
  });

  it("当日ポイントレコードがない場合は false を返す", async () => {
    mockSelect.mockReturnValueOnce({
      from: () => ({ where: () => ({ limit: () => Promise.resolve([]) }) }),
    });

    const result = await hasDailyPointToday(1);
    expect(result).toBe(false);
  });
});

describe("grantDailyPoints", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("userId=1 に +10pt、当日 23:59:59 の expiresAt で INSERT する", async () => {
    const mockValues = vi.fn().mockResolvedValue(undefined);
    mockInsert.mockReturnValueOnce({ values: mockValues });

    await grantDailyPoints(1);

    expect(mockInsert).toHaveBeenCalledOnce();
    expect(mockValues).toHaveBeenCalledOnce();

    const [insertArg] = mockValues.mock.calls[0];
    expect(insertArg.userId).toBe(1);
    expect(insertArg.getPoint).toBe(10);

    // expiresAt が当日の 23:59:59 であること
    const expiresAt = insertArg.expiresAt as Date;
    const now = new Date();
    expect(expiresAt.getFullYear()).toBe(now.getFullYear());
    expect(expiresAt.getMonth()).toBe(now.getMonth());
    expect(expiresAt.getDate()).toBe(now.getDate());
    expect(expiresAt.getHours()).toBe(23);
    expect(expiresAt.getMinutes()).toBe(59);
    expect(expiresAt.getSeconds()).toBe(59);
  });
});

describe("consumeOnePoint", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("userId=1 に -1pt、expiresAt=null で INSERT する", async () => {
    const mockValues = vi.fn().mockResolvedValue(undefined);
    mockInsert.mockReturnValueOnce({ values: mockValues });

    await consumeOnePoint(1);

    expect(mockInsert).toHaveBeenCalledOnce();
    expect(mockValues).toHaveBeenCalledOnce();

    const [insertArg] = mockValues.mock.calls[0];
    expect(insertArg.userId).toBe(1);
    expect(insertArg.getPoint).toBe(-1);
    expect(insertArg.expiresAt).toBeNull();
  });
});
