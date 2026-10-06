export type Region = "CA" | "US" | "SUN";

export interface Airport {
  iata: string;
  name: string;
  city: string;
  region: Region;
  country: string;
  /** Province/state code; drives GST/HST for Canadian origins. */
  province: string | null;
  tz: string;
  lat: number;
  lon: number;
  isHub: boolean;
  /** Airport Improvement Fee per departing passenger (Canadian airports only). */
  aifCents: number;
}

const a = (
  iata: string,
  city: string,
  name: string,
  region: Region,
  country: string,
  province: string | null,
  tz: string,
  lat: number,
  lon: number,
  aifCents = 0,
  isHub = false,
): Airport => ({ iata, city, name, region, country, province, tz, lat, lon, aifCents, isHub });

export const AIRPORTS: Airport[] = [
  // Hubs
  a("YYZ", "Toronto", "Toronto Pearson International", "CA", "CA", "ON", "America/Toronto", 43.6777, -79.6248, 3500, true),
  a("YVR", "Vancouver", "Vancouver International", "CA", "CA", "BC", "America/Vancouver", 49.1947, -123.1792, 2500, true),
  a("YUL", "Montréal", "Montréal–Trudeau International", "CA", "CA", "QC", "America/Toronto", 45.4706, -73.7408, 3500, true),
  // Canada
  a("YOW", "Ottawa", "Ottawa Macdonald–Cartier International", "CA", "CA", "ON", "America/Toronto", 45.3225, -75.6692, 2800),
  a("YQB", "Québec City", "Québec City Jean Lesage International", "CA", "CA", "QC", "America/Toronto", 46.7911, -71.3933, 3500),
  a("YHZ", "Halifax", "Halifax Stanfield International", "CA", "CA", "NS", "America/Halifax", 44.8808, -63.5086, 2800),
  a("YYT", "St. John's", "St. John's International", "CA", "CA", "NL", "America/St_Johns", 47.6186, -52.7519, 3500),
  a("YQM", "Moncton", "Greater Moncton Roméo LeBlanc International", "CA", "CA", "NB", "America/Moncton", 46.1122, -64.6786, 2500),
  a("YYG", "Charlottetown", "Charlottetown Airport", "CA", "CA", "PE", "America/Halifax", 46.29, -63.1211, 2500),
  a("YFC", "Fredericton", "Fredericton International", "CA", "CA", "NB", "America/Moncton", 45.8689, -66.5372, 2500),
  a("YSB", "Sudbury", "Greater Sudbury Airport", "CA", "CA", "ON", "America/Toronto", 46.625, -80.7989, 3000),
  a("YQT", "Thunder Bay", "Thunder Bay International", "CA", "CA", "ON", "America/Toronto", 48.3719, -89.3239, 2500),
  a("YXU", "London", "London International", "CA", "CA", "ON", "America/Toronto", 43.0356, -81.1539, 2500),
  a("YQG", "Windsor", "Windsor International", "CA", "CA", "ON", "America/Toronto", 42.2756, -82.9556, 2500),
  a("YWG", "Winnipeg", "Winnipeg James Armstrong Richardson International", "CA", "CA", "MB", "America/Winnipeg", 49.91, -97.2399, 3800),
  a("YQR", "Regina", "Regina International", "CA", "CA", "SK", "America/Regina", 50.4319, -104.6658, 2500),
  a("YXE", "Saskatoon", "Saskatoon John G. Diefenbaker International", "CA", "CA", "SK", "America/Regina", 52.1708, -106.6997, 2500),
  a("YYC", "Calgary", "Calgary International", "CA", "CA", "AB", "America/Edmonton", 51.1215, -114.0076, 3500),
  a("YEG", "Edmonton", "Edmonton International", "CA", "CA", "AB", "America/Edmonton", 53.3097, -113.5797, 3500),
  a("YLW", "Kelowna", "Kelowna International", "CA", "CA", "BC", "America/Vancouver", 49.9561, -119.3778, 2000),
  a("YYJ", "Victoria", "Victoria International", "CA", "CA", "BC", "America/Vancouver", 48.6469, -123.4258, 1500),
  a("YKA", "Kamloops", "Kamloops Airport", "CA", "CA", "BC", "America/Vancouver", 50.7022, -120.4444, 2000),
  // United States
  a("BOS", "Boston", "Boston Logan International", "US", "US", "MA", "America/New_York", 42.3656, -71.0096),
  a("LGA", "New York", "New York LaGuardia", "US", "US", "NY", "America/New_York", 40.7769, -73.874),
  a("ORD", "Chicago", "Chicago O'Hare International", "US", "US", "IL", "America/Chicago", 41.9742, -87.9073),
  a("SFO", "San Francisco", "San Francisco International", "US", "US", "CA", "America/Los_Angeles", 37.6213, -122.379),
  a("LAX", "Los Angeles", "Los Angeles International", "US", "US", "CA", "America/Los_Angeles", 33.9416, -118.4085),
  a("SEA", "Seattle", "Seattle–Tacoma International", "US", "US", "WA", "America/Los_Angeles", 47.4502, -122.3088),
  // Sun destinations
  a("MCO", "Orlando", "Orlando International", "SUN", "US", "FL", "America/New_York", 28.4312, -81.3081),
  a("FLL", "Fort Lauderdale", "Fort Lauderdale–Hollywood International", "SUN", "US", "FL", "America/New_York", 26.0742, -80.1506),
  a("CUN", "Cancún", "Cancún International", "SUN", "MX", null, "America/Cancun", 21.0365, -86.8771),
  a("PUJ", "Punta Cana", "Punta Cana International", "SUN", "DO", null, "America/Santo_Domingo", 18.5674, -68.3634),
  a("MBJ", "Montego Bay", "Sangster International", "SUN", "JM", null, "America/Jamaica", 18.5037, -77.9134),
];

export const AIRPORT_BY_IATA = new Map(AIRPORTS.map((x) => [x.iata, x]));
export const HUBS = AIRPORTS.filter((x) => x.isHub).map((x) => x.iata);

export function airport(iata: string): Airport {
  const ap = AIRPORT_BY_IATA.get(iata);
  if (!ap) throw new Error(`Unknown airport ${iata}`);
  return ap;
}
