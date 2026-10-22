import { ImageResponse } from "next/og";
import { SITE_NAME } from "@/lib/page-metadata";
import { SOCIAL_IMAGE } from "@/lib/seo";

export const dynamic = "force-static";

export function GET() {
  return new ImageResponse(
    <div style={{ display: "flex", width: "100%", height: "100%", flexDirection: "column",
      justifyContent: "space-between", padding: "68px 80px", background: "#101D40", color: "#F4F7FF" }}>
      <div style={{ display: "flex", alignItems: "center", gap: 20 }}>
        <div style={{ display: "flex", width: 76, height: 76, alignItems: "center", justifyContent: "center",
          background: "#243B73", borderRadius: 20, fontSize: 48, fontWeight: 700 }}>W</div>
        <div style={{ fontSize: 36, fontWeight: 700 }}>{SITE_NAME}</div>
      </div>
      <div style={{ display: "flex", flexDirection: "column", gap: 24 }}>
        <div style={{ fontSize: 68, fontWeight: 700, lineHeight: 1.12 }}>Your work, connected.</div>
        <div style={{ fontSize: 28, lineHeight: 1.5, color: "#CDD8EE", maxWidth: 950 }}>
          Projects, tasks, calendars and team collaboration in one workspace.
        </div>
      </div>
      <div style={{ fontSize: 22, color: "#CDD8EE" }}>Plan together. Focus on what matters.</div>
    </div>,
    { width: SOCIAL_IMAGE.width, height: SOCIAL_IMAGE.height },
  );
}
