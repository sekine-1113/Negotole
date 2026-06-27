export const VALID_REASONS = ["スパム", "不適切なコンテンツ", "誹謗中傷", "その他"] as const;
export type ValidReason = typeof VALID_REASONS[number];
