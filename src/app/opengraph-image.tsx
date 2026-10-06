import { ImageResponse } from "next/og";
import { brand } from "@/config/brand";

export const alt = `${brand.name} — flights across Canada, the U.S. and the sun`;
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

export default function OgImage() {
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          justifyContent: "center",
          padding: 80,
          color: "white",
          background: "linear-gradient(135deg, #061730 0%, #0b2545 55%, #1d4a80 100%)",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 24 }}>
          <svg width="96" height="96" viewBox="0 0 32 32">
            <circle cx="16" cy="16" r="15" fill="#f2b84b" />
            <path d="M6 18.5 26 9l-5.5 14-3.6-5.4L6 18.5Z" fill="#0b2545" />
          </svg>
          <div style={{ fontSize: 72, fontWeight: 700, display: "flex" }}>
            Demo<span style={{ color: "#f2b84b" }}>Airlines</span>
          </div>
        </div>
        <div style={{ marginTop: 32, fontSize: 40, opacity: 0.85 }}>{brand.tagline}</div>
        <div style={{ marginTop: 16, fontSize: 28, color: "#f2b84b" }}>Toronto · Montréal · Vancouver</div>
      </div>
    ),
    size,
  );
}
