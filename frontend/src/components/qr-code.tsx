'use client';

import { useEffect, useState } from 'react';
import QRCode from 'qrcode';

export function QrCode({ value, size = 200 }: { value: string; size?: number }) {
  const [dataUrl, setDataUrl] = useState<string | null>(null);

  useEffect(() => {
    QRCode.toDataURL(value, { width: size, margin: 1 })
      .then(setDataUrl)
      .catch(() => setDataUrl(null));
  }, [value, size]);

  if (!dataUrl) return null;
  return <img src={dataUrl} alt="QR Code de retirada" width={size} height={size} />;
}
