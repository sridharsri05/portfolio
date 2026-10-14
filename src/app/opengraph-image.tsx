import { ImageResponse } from "next/og";
import { profile } from "@/data/profile";

export const alt = `${profile.name} — ${profile.role}`;
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

// Generated at build time; uses the built-in font so no font file needs to ship.
export default function OpengraphImage() {
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          justifyContent: "space-between",
          background: "#05060a",
          color: "#eaf0f7",
          padding: "72px 80px",
          fontFamily: "sans-serif",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 20 }}>
          <div style={{ display: "flex", width: 64, height: 64, border: "3px solid #eaf0f7", alignItems: "center", justifyContent: "center", fontSize: 26, fontWeight: 800 }}>
            {profile.initials}
          </div>
          <div style={{ display: "flex", fontSize: 26, color: "#3fe0f0", letterSpacing: 4 }}>FULL-STACK DEVELOPER · INDIA</div>
        </div>
        <div style={{ display: "flex", flexDirection: "column", fontSize: 78, fontWeight: 800, lineHeight: 1, letterSpacing: -2 }}>
          <span>I BUILD DIGITAL SYSTEMS</span>
          <span>THAT MOVE BUSINESS FORWARD.</span>
        </div>
        <div style={{ display: "flex", justifyContent: "space-between", fontSize: 28, color: "#b9c2d3" }}>
          <span>{profile.name}</span>
          <span>React.js · Laravel · Node.js</span>
        </div>
        <div style={{ position: "absolute", right: 80, top: 72, width: 160, height: 160, borderRadius: 160, background: "radial-gradient(circle, rgba(63,224,240,0.9) 0%, rgba(63,224,240,0.15) 45%, rgba(5,6,10,0) 70%)" }} />
      </div>
    ),
    size,
  );
}
