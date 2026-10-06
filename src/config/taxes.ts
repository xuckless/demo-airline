/** Simplified Canadian ticket taxes & fees (per seated passenger, per direction). */
export const ATSC_CENTS = { DOM: 994, TB: 1708, INT: 2883 } as const;
export const CONNECTING_AIF_CENTS = 500;
export const US_TAXES_CENTS = 4500;
export const FOREIGN_TAXES_CENTS = 8500;

/** GST/HST rate by province of departure (domestic itineraries only). */
export const SALES_TAX_RATE: Record<string, number> = {
  ON: 0.13,
  NS: 0.15,
  NB: 0.15,
  NL: 0.15,
  PE: 0.15,
  QC: 0.05,
  MB: 0.05,
  SK: 0.05,
  AB: 0.05,
  BC: 0.05,
};
export const SALES_TAX_NAME: Record<string, string> = {
  ON: "HST",
  NS: "HST",
  NB: "HST",
  NL: "HST",
  PE: "HST",
};
