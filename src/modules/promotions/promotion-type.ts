export const PROMOTION_TYPES = ['percentage', 'fixed'] as const;

export type PromotionType = (typeof PROMOTION_TYPES)[number];
