export type Cabin = "Y" | "W" | "J";
export const CABINS: Cabin[] = ["J", "W", "Y"];
export const CABIN_NAMES: Record<Cabin, string> = { Y: "Economy", W: "Premium Economy", J: "Business" };

export interface AircraftType {
  code: string;
  name: string;
  shortName: string;
  cruiseKmh: number;
  cabins: { cabin: Cabin; seats: number; product: string; pitchIn: number }[];
}

export const FLEET: AircraftType[] = [
  {
    code: "DH4",
    name: "De Havilland Dash 8-400",
    shortName: "Dash 8-400",
    cruiseKmh: 520,
    cabins: [{ cabin: "Y", seats: 78, product: "Economy · 2-2", pitchIn: 32 }],
  },
  {
    code: "E75",
    name: "Embraer 175",
    shortName: "E175",
    cruiseKmh: 780,
    cabins: [
      { cabin: "J", seats: 12, product: "Business recliner · 1-2", pitchIn: 38 },
      { cabin: "Y", seats: 64, product: "Economy · 2-2", pitchIn: 31 },
    ],
  },
  {
    code: "32N",
    name: "Airbus A321neo",
    shortName: "A321neo",
    cruiseKmh: 800,
    cabins: [
      { cabin: "J", seats: 16, product: "Business recliner · 2-2", pitchIn: 40 },
      { cabin: "W", seats: 24, product: "Premium Economy · 3-3, extra legroom", pitchIn: 36 },
      { cabin: "Y", seats: 150, product: "Economy · 3-3", pitchIn: 30 },
    ],
  },
  {
    code: "789",
    name: "Boeing 787-9 Dreamliner",
    shortName: "787-9",
    cruiseKmh: 870,
    cabins: [
      { cabin: "J", seats: 30, product: "Lie-flat Signature suite · 1-2-1", pitchIn: 78 },
      { cabin: "W", seats: 28, product: "Premium Economy · 2-3-2", pitchIn: 38 },
      { cabin: "Y", seats: 240, product: "Economy · 3-3-3", pitchIn: 31 },
    ],
  },
];

export const AIRCRAFT_BY_CODE = new Map(FLEET.map((x) => [x.code, x]));
export const LIE_FLAT = new Set(["789"]);
