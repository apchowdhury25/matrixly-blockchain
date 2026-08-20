import { useEffect, useState } from "react";
import QRCode from "qrcode";

export function Qr({ value, size = 196 }: { value: string; size?: number }) {
  const [url, setUrl] = useState<string | null>(null);
  useEffect(() => {
    let alive = true;
    QRCode.toDataURL(value, {
      margin: 1,
      width: size,
      color: { dark: "#14171c", light: "#fbf8f1" },
    }).then((data) => {
      if (alive) setUrl(data);
    });
    return () => {
      alive = false;
    };
  }, [value, size]);
  if (!url) return <div className="animate-pulse bg-rule/50" style={{ width: size, height: size }} />;
  return <img src={url} width={size} height={size} alt="Verification QR code" />;
}
