export interface AirportOption {
  iata: string;
  city: string;
  name: string;
  region: "CA" | "US" | "SUN";
  isHub: boolean;
}

export interface WidgetDefaults {
  trip: "RT" | "OW";
  from?: string;
  to?: string;
  depart?: string;
  return?: string;
  adt: number;
  chd: number;
  inf: number;
}
