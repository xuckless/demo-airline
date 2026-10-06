import type { Metadata, Viewport } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import { brand } from "@/config/brand";
import { SiteFooter } from "@/components/site/SiteFooter";
import { SiteHeader } from "@/components/site/SiteHeader";
import { Toaster } from "@/components/ui/sonner";
import "./globals.css";

const sans = Geist({ variable: "--font-sans", subsets: ["latin"] });
const mono = Geist_Mono({ variable: "--font-mono", subsets: ["latin"] });

export const metadata: Metadata = {
  metadataBase: new URL(process.env.SITE_URL ?? "http://localhost:3000"),
  title: { default: `${brand.name} — Flights across Canada, the U.S. and the sun`, template: `%s · ${brand.name}` },
  description: `${brand.tagline} Book flights through our Toronto, Montréal and Vancouver hubs.`,
  applicationName: brand.name,
  appleWebApp: { title: brand.name, capable: true, statusBarStyle: "black-translucent" },
  openGraph: { siteName: brand.name, type: "website", locale: "en_CA" },
  robots: { index: false, follow: false }, // demo site
};

export const viewport: Viewport = {
  themeColor: "#0b2545",
  colorScheme: "light",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="en" className={`${sans.variable} ${mono.variable} h-full antialiased`}>
      <body className="flex min-h-full flex-col bg-white">
        <SiteHeader />
        <main className="flex-1">{children}</main>
        <SiteFooter />
        <Toaster position="top-center" theme="light" richColors />
      </body>
    </html>
  );
}
