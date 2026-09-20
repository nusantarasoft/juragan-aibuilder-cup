import { ImageResponse } from "next/og";

export const alt =
  "NusantaraSoft — Kasir warung di WhatsApp. Cek stok, catat jual, tanya tips usaha.";
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
          background: "linear-gradient(165deg, #dfece4 0%, #f6faf7 45%, #e8f0eb 100%)",
          fontFamily: "ui-sans-serif, system-ui, sans-serif",
          position: "relative",
        }}
      >
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            justifyContent: "center",
            padding: "64px 56px",
            width: "58%",
            gap: 20,
          }}
        >
          <div
            style={{
              fontSize: 28,
              fontWeight: 700,
              color: "#0f3d2c",
              letterSpacing: "-0.02em",
            }}
          >
            NusantaraSoft
          </div>
          <div
            style={{
              fontSize: 56,
              fontWeight: 700,
              color: "#14201a",
              lineHeight: 1.12,
              letterSpacing: "-0.03em",
            }}
          >
            Kasir warung di WhatsApp
          </div>
          <div
            style={{
              fontSize: 26,
              color: "#3d4f45",
              lineHeight: 1.35,
              maxWidth: 520,
            }}
          >
            Cek stok, catat jual, laporan malam, plus tips usaha — tanpa unduh
            app.
          </div>
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: 12,
              marginTop: 8,
              background: "#1b6b4a",
              color: "#fff",
              fontSize: 22,
              fontWeight: 600,
              padding: "14px 22px",
              borderRadius: 10,
              width: "fit-content",
            }}
          >
            Chat +62 811-924-689
          </div>
        </div>

        <div
          style={{
            display: "flex",
            flexDirection: "column",
            width: "42%",
            height: "100%",
            background: "linear-gradient(180deg, #075e54 0%, #128c7e 100%)",
            padding: "48px 36px 40px",
            justifyContent: "center",
            gap: 14,
          }}
        >
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: 8,
              color: "rgba(255,255,255,0.9)",
              fontSize: 18,
              fontWeight: 600,
              marginBottom: 8,
            }}
          >
            Kasir NusantaraSoft
          </div>
          <div
            style={{
              alignSelf: "flex-end",
              background: "#d9f5e8",
              color: "#14201a",
              fontSize: 20,
              padding: "12px 16px",
              borderRadius: 16,
              borderBottomRightRadius: 4,
              maxWidth: "88%",
            }}
          >
            cek stok indomie
          </div>
          <div
            style={{
              alignSelf: "flex-start",
              background: "#fff",
              color: "#14201a",
              fontSize: 19,
              padding: "14px 16px",
              borderRadius: 16,
              borderBottomLeftRadius: 4,
              maxWidth: "92%",
              display: "flex",
              flexDirection: "column",
              gap: 6,
              lineHeight: 1.35,
            }}
          >
            <div style={{ fontWeight: 700 }}>Cek Stok</div>
            <div>Indomie Goreng — sisa 12</div>
            <div>Indomie Ayam Bawang — sisa 4</div>
          </div>
          <div
            style={{
              alignSelf: "flex-end",
              background: "#d9f5e8",
              color: "#14201a",
              fontSize: 20,
              padding: "12px 16px",
              borderRadius: 16,
              borderBottomRightRadius: 4,
              maxWidth: "88%",
            }}
          >
            stok mau habis
          </div>
        </div>
      </div>
    ),
    { ...size },
  );
}
