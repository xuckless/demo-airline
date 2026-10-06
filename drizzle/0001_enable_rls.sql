-- Supabase exposes the public schema over its REST API. The app talks to Postgres directly
-- (as the owner role, which bypasses RLS), so enable RLS with no policies: the API sees nothing.
ALTER TABLE "airports" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "aircraft_types" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "aircraft_cabins" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "routes" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "flight_schedules" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "flights" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "flight_cabin_inventory" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "fare_brands" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "fare_buckets" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "bookings" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "passengers" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "booking_segments" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "seed_state" ENABLE ROW LEVEL SECURITY;
