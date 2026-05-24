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

import { getPointBalance, hasDailyPointToday, grantDailyPoints, consumeOnePoint, getActiveCampaign, grantCampaignPoints } from "@/lib/points";

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

    // expiresAt が JST 当日の 23:59:59 であること
    // CI は UTC で動作するため、JST オフセット（+9h）を加えて比較する
    const JST_OFFSET_MS = 9 * 60 * 60 * 1000;
    const expiresAt = insertArg.expiresAt as Date;
    const now = new Date();
    const nowJST = new Date(now.getTime() + JST_OFFSET_MS);
    const expiresAtJST = new Date(expiresAt.getTime() + JST_OFFSET_MS);

    expect(expiresAtJST.getUTCFullYear()).toBe(nowJST.getUTCFullYear());
    expect(expiresAtJST.getUTCMonth()).toBe(nowJST.getUTCMonth());
    expect(expiresAtJST.getUTCDate()).toBe(nowJST.getUTCDate());
    expect(expiresAtJST.getUTCHours()).toBe(23);
    expect(expiresAtJST.getUTCMinutes()).toBe(59);
    expect(expiresAtJST.getUTCSeconds()).toBe(59);
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

describe("hasDailyPointToday + grantDailyPoints integration", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("hasDailyPointToday が false の場合、grantDailyPoints を呼ぶべき", async () => {
    // hasDailyPointToday → false
    mockSelect.mockReturnValueOnce({
      from: () => ({ where: () => ({ limit: () => Promise.resolve([]) }) }),
    });
    const mockValues = vi.fn().mockResolvedValue(undefined);
    mockInsert.mockReturnValueOnce({ values: mockValues });

    const alreadyGranted = await hasDailyPointToday(1);
    if (!alreadyGranted) {
      await grantDailyPoints(1);
    }

    expect(alreadyGranted).toBe(false);
    expect(mockInsert).toHaveBeenCalledOnce();
  });

  it("hasDailyPointToday が true の場合、grantDailyPoints を呼ばない", async () => {
    // hasDailyPointToday → true
    mockSelect.mockReturnValueOnce({
      from: () => ({ where: () => ({ limit: () => Promise.resolve([{ id: 1 }]) }) }),
    });

    const alreadyGranted = await hasDailyPointToday(1);
    if (!alreadyGranted) {
      await grantDailyPoints(1);
    }

    expect(alreadyGranted).toBe(true);
    expect(mockInsert).not.toHaveBeenCalled();
  });
});

describe("getActiveCampaign", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("アクティブなキャンペーンがある場合はキャンペーンオブジェクトを返す", async () => {
    const campaign = { id: 1, name: "テストキャンペーン", bonusPoints: 100 };
    mockSelect.mockReturnValueOnce({
      from: () => ({ where: () => ({ orderBy: () => ({ limit: () => Promise.resolve([campaign]) }) }) }),
    });

    const result = await getActiveCampaign();
    expect(result).toEqual(campaign);
  });

  it("アクティブなキャンペーンがない場合は null を返す", async () => {
    mockSelect.mockReturnValueOnce({
      from: () => ({ where: () => ({ orderBy: () => ({ limit: () => Promise.resolve([]) }) }) }),
    });

    const result = await getActiveCampaign();
    expect(result).toBeNull();
  });
});

describe("grantCampaignPoints", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("userId=1 に +100pt、expiresAt=null で INSERT する", async () => {
    const mockValues = vi.fn().mockResolvedValue(undefined);
    mockInsert.mockReturnValueOnce({ values: mockValues });

    await grantCampaignPoints(1, 100);

    expect(mockInsert).toHaveBeenCalledOnce();
    expect(mockValues).toHaveBeenCalledOnce();

    const [insertArg] = mockValues.mock.calls[0];
    expect(insertArg.userId).toBe(1);
    expect(insertArg.getPoint).toBe(100);
    expect(insertArg.expiresAt).toBeNull();
  });
});
