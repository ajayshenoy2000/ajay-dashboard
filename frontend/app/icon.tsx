import { ImageResponse } from "next/og";

export const size = { width: 32, height: 32 };
export const contentType = "image/png";

export default function Icon() {
  return new ImageResponse(
    (
      <div
        style={{
          width: 32,
          height: 32,
          borderRadius: 8,
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
            fontSize: 22,
            fontWeight: 700,
            color: "#c96442",
            lineHeight: 1,
            marginTop: 2,
          }}
        >
          a
        </span>
      </div>
    ),
    { ...size }
  );
}
