import type { BrandCode } from "@/config/fares";
import type { OfferStatus } from "@/domain/types";

export interface LegDTO {
  flightNo: string;
  origin: string;
  originCity: string;
  dest: string;
  destCity: string;
  depTime: string;
  arrTime: string;
  arrDayOffset: number;
  date: string;
  aircraft: string;
  duration: string;
}

export interface OfferDTO {
  brand: BrandCode;
  name: string;
  status: OfferStatus;
  price: string;
  seatsLeft: number;
  mixed: boolean;
  cabinNote: string | null;
  rbds: string;
  href: string;
}

export interface ItinDTO {
  key: string;
  depTime: string;
  arrTime: string;
  arrDayOffset: number;
  origin: string;
  dest: string;
  duration: string;
  stopsLabel: string;
  nonstop: boolean;
  connections: { airport: string; city: string; duration: string }[];
  legs: LegDTO[];
  offers: OfferDTO[];
  lowestPrice: string | null;
}
