import { ImageResponse } from "next/og";

export const size = { width: 180, height: 180 };
export const contentType = "image/png";

export default function AppleIcon() {
  return new ImageResponse(
    (
      <div style={{ width: "100%", height: "100%", display: "flex", alignItems: "center", justifyContent: "center", background: "#0b2545" }}>
        <svg width="140" height="140" viewBox="0 0 32 32">
          <circle cx="16" cy="16" r="15" fill="#f2b84b" />
          <path d="M6 18.5 26 9l-5.5 14-3.6-5.4L6 18.5Z" fill="#0b2545" />
          <path d="m16.9 17.6 2.6 6.2-4.7-4.9 2.1-1.3Z" fill="#1d4a80" />
        </svg>
      </div>
    ),
    size,
  );
}
