import { describe, it, expect, vi, beforeEach } from "vitest";

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

import { getActiveCampaign, grantCampaignPoints } from "@/lib/points";

describe("getActiveCampaign", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("アクティブなキャンペーンが存在する場合はそのキャンペーンを返す", async () => {
    const campaign = {
      id: 1,
      name: "新規登録キャンペーン2026",
      description: "期間中の初回登録者に100ptプレゼント",
      startsAt: new Date("2026-05-01"),
      endsAt: new Date("2026-05-31"),
      bonusPoints: 100,
      createdAt: new Date(),
      updatedAt: null,
      deletedAt: null,
    };

    mockSelect.mockReturnValueOnce({
      from: () => ({
        where: () => ({
          orderBy: () => ({
            limit: () => Promise.resolve([campaign]),
          }),
        }),
      }),
    });

    const result = await getActiveCampaign();
    expect(result).toEqual(campaign);
  });

  it("アクティブなキャンペーンがない場合は null を返す", async () => {
    mockSelect.mockReturnValueOnce({
      from: () => ({
        where: () => ({
          orderBy: () => ({
            limit: () => Promise.resolve([]),
          }),
        }),
      }),
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

  it("bonusPoints が指定された値で INSERT する", async () => {
    const mockValues = vi.fn().mockResolvedValue(undefined);
    mockInsert.mockReturnValueOnce({ values: mockValues });

    await grantCampaignPoints(42, 200);

    const [insertArg] = mockValues.mock.calls[0];
    expect(insertArg.userId).toBe(42);
    expect(insertArg.getPoint).toBe(200);
    expect(insertArg.expiresAt).toBeNull();
  });
});
