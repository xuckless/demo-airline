/**
 * Hub-and-spoke network. Each entry is flown in both directions with the
 * same daily frequency. Aircraft arrays rotate across the day's frequencies.
 * dowMask uses ISO weekdays: Mon=1, Tue=2, Wed=4, Thu=8, Fri=16, Sat=32, Sun=64.
 */
export interface NetworkEntry {
  a: string; // hub
  b: string; // hub or spoke
  freq: number;
  aircraft: string | string[];
  dowMask?: number;
}

export const DAILY = 127;
const MON = 1, TUE = 2, WED = 4, THU = 8, FRI = 16, SAT = 32, SUN = 64;

export const NETWORK: NetworkEntry[] = [
  // Hub-to-hub trunks
  { a: "YYZ", b: "YUL", freq: 8, aircraft: ["32N", "E75"] },
  { a: "YYZ", b: "YVR", freq: 6, aircraft: ["789", "32N"] },
  { a: "YUL", b: "YVR", freq: 2, aircraft: "789" },

  // Toronto (YYZ) – Canada
  { a: "YYZ", b: "YOW", freq: 6, aircraft: ["E75", "32N"] },
  { a: "YYZ", b: "YQB", freq: 3, aircraft: "E75" },
  { a: "YYZ", b: "YHZ", freq: 5, aircraft: "32N" },
  { a: "YYZ", b: "YYT", freq: 2, aircraft: "32N" },
  { a: "YYZ", b: "YQM", freq: 2, aircraft: "E75" },
  { a: "YYZ", b: "YYG", freq: 1, aircraft: "E75" },
  { a: "YYZ", b: "YFC", freq: 2, aircraft: "DH4" },
  { a: "YYZ", b: "YSB", freq: 3, aircraft: "DH4" },
  { a: "YYZ", b: "YQT", freq: 3, aircraft: "DH4" },
  { a: "YYZ", b: "YXU", freq: 4, aircraft: "DH4" },
  { a: "YYZ", b: "YQG", freq: 3, aircraft: "DH4" },
  { a: "YYZ", b: "YWG", freq: 4, aircraft: "32N" },
  { a: "YYZ", b: "YQR", freq: 2, aircraft: "E75" },
  { a: "YYZ", b: "YXE", freq: 2, aircraft: "E75" },
  { a: "YYZ", b: "YYC", freq: 6, aircraft: ["32N", "789"] },
  { a: "YYZ", b: "YEG", freq: 5, aircraft: "32N" },
  { a: "YYZ", b: "YLW", freq: 1, aircraft: "32N" },
  { a: "YYZ", b: "YYJ", freq: 1, aircraft: "32N" },

  // Montréal (YUL) – Canada
  { a: "YUL", b: "YQB", freq: 4, aircraft: "DH4" },
  { a: "YUL", b: "YHZ", freq: 3, aircraft: "E75" },
  { a: "YUL", b: "YYT", freq: 1, aircraft: "32N" },
  { a: "YUL", b: "YQM", freq: 2, aircraft: "DH4" },
  { a: "YUL", b: "YYG", freq: 1, aircraft: "DH4" },
  { a: "YUL", b: "YFC", freq: 2, aircraft: "DH4" },
  { a: "YUL", b: "YYC", freq: 2, aircraft: "32N" },
  { a: "YUL", b: "YWG", freq: 1, aircraft: "32N" },

  // Vancouver (YVR) – Canada
  { a: "YVR", b: "YYC", freq: 6, aircraft: ["32N", "E75"] },
  { a: "YVR", b: "YEG", freq: 4, aircraft: "32N" },
  { a: "YVR", b: "YLW", freq: 5, aircraft: "DH4" },
  { a: "YVR", b: "YYJ", freq: 6, aircraft: "DH4" },
  { a: "YVR", b: "YKA", freq: 3, aircraft: "DH4" },
  { a: "YVR", b: "YXE", freq: 1, aircraft: "E75" },
  { a: "YVR", b: "YQR", freq: 1, aircraft: "E75" },
  { a: "YVR", b: "YWG", freq: 2, aircraft: "32N" },

  // Transborder
  { a: "YYZ", b: "BOS", freq: 4, aircraft: "E75" },
  { a: "YYZ", b: "LGA", freq: 6, aircraft: ["E75", "32N"] },
  { a: "YYZ", b: "ORD", freq: 4, aircraft: "E75" },
  { a: "YYZ", b: "SFO", freq: 2, aircraft: "32N" },
  { a: "YYZ", b: "LAX", freq: 2, aircraft: "32N" },
  { a: "YUL", b: "BOS", freq: 3, aircraft: "E75" },
  { a: "YUL", b: "LGA", freq: 4, aircraft: "E75" },
  { a: "YVR", b: "SEA", freq: 3, aircraft: "E75" },
  { a: "YVR", b: "SFO", freq: 3, aircraft: "32N" },
  { a: "YVR", b: "LAX", freq: 3, aircraft: "32N" },

  // Sun
  { a: "YYZ", b: "MCO", freq: 2, aircraft: "32N" },
  { a: "YYZ", b: "FLL", freq: 2, aircraft: "32N" },
  { a: "YYZ", b: "CUN", freq: 2, aircraft: ["789", "32N"] },
  { a: "YYZ", b: "PUJ", freq: 1, aircraft: "789" },
  { a: "YYZ", b: "MBJ", freq: 1, aircraft: "32N", dowMask: MON | THU | SAT | SUN },
  { a: "YUL", b: "MCO", freq: 1, aircraft: "32N" },
  { a: "YUL", b: "FLL", freq: 1, aircraft: "32N" },
  { a: "YUL", b: "CUN", freq: 1, aircraft: "32N" },
  { a: "YUL", b: "PUJ", freq: 1, aircraft: "789", dowMask: TUE | FRI | SUN },
  { a: "YVR", b: "CUN", freq: 1, aircraft: "789", dowMask: WED | SAT },
];

export { MON, TUE, WED, THU, FRI, SAT, SUN };
