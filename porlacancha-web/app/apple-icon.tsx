import { ImageResponse } from "next/og";

export const size = { width: 180, height: 180 };
export const contentType = "image/png";

export default function AppleIcon() {
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          background: "#001B44",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
        }}
      >
        <div
          style={{
            width: 118,
            height: 118,
            borderRadius: 59,
            background: "#F7F5EF",
            border: "8px solid #D9A928",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            color: "#001B44",
            fontSize: 64,
            fontWeight: 800,
          }}
        >
          P
        </div>
      </div>
    ),
    { ...size }
  );
}
