import { ImageResponse } from "next/og";

export const size = { width: 180, height: 180 };
export const contentType = "image/png";

export default function AppleIcon() {
  return new ImageResponse(
    (
      <div
        style={{
          width: 180,
          height: 180,
          borderRadius: 40,
          background: "#fdf5ef",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
        }}
      >
        <span
          style={{
            fontFamily: "Georgia, serif",
            fontStyle: "italic",
            fontSize: 128,
            fontWeight: 700,
            color: "#c96442",
            lineHeight: 1,
            marginTop: 8,
          }}
        >
          a
        </span>
      </div>
    ),
    { ...size }
  );
}
