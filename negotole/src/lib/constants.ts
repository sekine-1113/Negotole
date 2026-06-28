export const VALID_REASONS = ["スパム", "不適切なコンテンツ", "誹謗中傷", "その他"] as const;
export type ValidReason = typeof VALID_REASONS[number];

export const POST_COST_BY_DURATION: Record<number, number> = {
  60: 1,
  180: 2,
  360: 3,
  720: 5,
  1440: 8,
} as const;

export const VALID_DURATIONS = [60, 180, 360, 720, 1440] as const;
export type ValidDuration = typeof VALID_DURATIONS[number];
