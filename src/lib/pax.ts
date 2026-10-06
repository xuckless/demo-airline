export interface PaxCounts {
  adt: number;
  chd: number;
  inf: number;
}

export function paxLabel({ adt, chd, inf }: PaxCounts) {
  const parts = [`${adt} adult${adt > 1 ? "s" : ""}`];
  if (chd) parts.push(`${chd} child${chd > 1 ? "ren" : ""}`);
  if (inf) parts.push(`${inf} infant${inf > 1 ? "s" : ""}`);
  return parts.join(", ");
}
