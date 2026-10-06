/** All money is integer cents (CAD). */
export const cents = (dollars: number) => Math.round(dollars * 100);

/** Round a fare to a retail-looking "$x9" price, in cents. */
export function retailRound(dollars: number): number {
  const v = Math.max(29, Math.round(dollars / 10) * 10 - 1);
  return v * 100;
}
