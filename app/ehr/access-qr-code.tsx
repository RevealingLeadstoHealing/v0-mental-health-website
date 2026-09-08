"use client";

import { useEffect, useState } from "react";

/**
 * Renders a QR code image generated from any URL, using the same `qrcode`
 * library the login page uses for MFA. The QR is generated in the browser
 * from the live link, so it always points to the correct address — no image
 * files to manage.
 */
export default function AccessQrCode({ url, label, size = 150 }: { url: string; label: string; size?: number }) {
  const [dataUrl, setDataUrl] = useState("");

  useEffect(() => {
    let active = true;
    setDataUrl("");
    if (!url) return;

    (async () => {
      try {
        const qrCodeModule = await import("qrcode");
        const toDataURL = qrCodeModule.toDataURL || qrCodeModule.default?.toDataURL;
        if (!toDataURL) return;
        const generated = await toDataURL(url, {
          errorCorrectionLevel: "M",
          margin: 2,
          width: size,
          color: { dark: "#1f2937", light: "#ffffff" },
        });
        if (active) setDataUrl(generated);
      } catch {
        if (active) setDataUrl("");
      }
    })();

    return () => {
      active = false;
    };
  }, [url, size]);

  return (
    <div className="flex flex-col items-center rounded-lg border border-slate-200 bg-white p-2 text-center">
      {dataUrl ? (
        <img src={dataUrl} alt={`${label} QR code`} width={size} height={size} style={{ width: size, height: size }} />
      ) : (
        <div style={{ width: size, height: size }} className="flex items-center justify-center text-xs text-slate-400">
          Generating…
        </div>
      )}
      <p className="mt-1 text-xs font-medium text-slate-600">{label}</p>
    </div>
  );
}
