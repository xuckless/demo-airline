/** Hub connecting-bank pivots, minutes after local midnight. */
export const BANKS: Record<string, number[]> = {
  YYZ: [8 * 60 + 30, 11 * 60 + 30, 14 * 60 + 30, 17 * 60 + 30, 20 * 60 + 30],
  YVR: [8 * 60, 12 * 60, 16 * 60, 20 * 60],
  YUL: [8 * 60, 12 * 60, 17 * 60],
};

/** Inbound flights should arrive within [pivot - 45, pivot - 15]. */
export const INBOUND_WINDOW = [-45, -15] as const;
/** Outbound flights should depart within [pivot + 30, pivot + 60]. */
export const OUTBOUND_WINDOW = [30, 60] as const;

/** Bounds for scheduled departure times (local minutes). */
export const EARLIEST_DEP = 6 * 60;
export const LATEST_DEP = 22 * 60 + 30;
