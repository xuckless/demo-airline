import type { Rng } from "../rng";

/** Record-locator alphabet without look-alikes (no 0/O, 1/I). */
export const PNR_ALPHABET = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";

export function makePnr(rng: Rng = Math.random): string {
  let s = "";
  for (let i = 0; i < 6; i++) s += PNR_ALPHABET[Math.floor(rng() * PNR_ALPHABET.length)];
  return s;
}

export const isPnr = (s: string) => new RegExp(`^[${PNR_ALPHABET}]{6}$`).test(s);
