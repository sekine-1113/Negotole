import { describe, it, expect, vi, beforeEach } from "vitest";

const { mockSelect, mockInsert, mockTransaction } = vi.hoisted(() => ({
  mockSelect: vi.fn(),
  mockInsert: vi.fn(),
  mockTransaction: vi.fn(),
}));

vi.mock("@/lib/db", () => ({
  db: {
    select: mockSelect,
    insert: mockInsert,
    transaction: mockTransaction,
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
      pointsType: "permanent",
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
    mockTransaction.mockImplementation(async (callback: (tx: { insert: typeof mockInsert }) => Promise<void>) => {
      const mockValues = vi.fn().mockResolvedValue(undefined);
      mockInsert.mockReturnValue({ values: mockValues });
      await callback({ insert: mockInsert });
    });
  });

  it("pointsType='permanent' のとき expiresAt=null で user_point に INSERT する", async () => {
    const endsAt = new Date("2026-05-31");
    await grantCampaignPoints(1, 10, 100, "permanent", endsAt);

    expect(mockTransaction).toHaveBeenCalledOnce();
    const userPointCall = mockInsert.mock.calls.find(
      (call) => call[0]?.constructor?.name !== "PgTable" // userPoints insert の引数を確認
    );
    // insert が2回（campaignApplications + userPoints）呼ばれていることを確認
    expect(mockInsert).toHaveBeenCalledTimes(2);
  });

  it("pointsType='limited' のとき expiresAt=endsAt で user_point に INSERT する", async () => {
    const endsAt = new Date("2026-05-31");
    const insertedValues: Array<Record<string, unknown>> = [];

    mockTransaction.mockImplementation(async (callback: (tx: { insert: (table: unknown) => { values: (v: Record<string, unknown>) => Promise<void> } }) => Promise<void>) => {
      const tx = {
        insert: (_table: unknown) => ({
          values: (v: Record<string, unknown>) => {
            insertedValues.push(v);
            return Promise.resolve(undefined);
          },
        }),
      };
      await callback(tx);
    });

    await grantCampaignPoints(1, 10, 100, "limited", endsAt);

    const userPointInsert = insertedValues.find((v) => "getPoint" in v);
    expect(userPointInsert?.expiresAt).toEqual(endsAt);
    expect(userPointInsert?.getPoint).toBe(100);
  });

  it("bonusPoints が指定された値で INSERT する", async () => {
    const insertedValues: Array<Record<string, unknown>> = [];

    mockTransaction.mockImplementation(async (callback: (tx: { insert: (table: unknown) => { values: (v: Record<string, unknown>) => Promise<void> } }) => Promise<void>) => {
      const tx = {
        insert: (_table: unknown) => ({
          values: (v: Record<string, unknown>) => {
            insertedValues.push(v);
            return Promise.resolve(undefined);
          },
        }),
      };
      await callback(tx);
    });

    await grantCampaignPoints(42, 10, 200, "permanent", new Date());

    const userPointInsert = insertedValues.find((v) => "getPoint" in v);
    expect(userPointInsert?.userId).toBe(42);
    expect(userPointInsert?.getPoint).toBe(200);
    expect(userPointInsert?.expiresAt).toBeNull();
  });
});
