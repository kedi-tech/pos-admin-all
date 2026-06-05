'use client';
import { useEffect, useRef } from 'react';

export default function Barcode({ code, height = 52 }) {
  const svgRef = useRef(null);

  useEffect(() => {
    if (!svgRef.current || !code) return;
    import('jsbarcode').then(mod => {
      const JsBarcode = mod.default ?? mod;
      const format = /^\d{13}$/.test(code) ? 'EAN13' : /^\d{8}$/.test(code) ? 'EAN8' : 'CODE128';
      try {
        JsBarcode(svgRef.current, code, {
          format,
          height: Math.max(height - 16, 20),
          displayValue: true,
          fontSize: 9,
          textMargin: 2,
          margin: 0,
          lineColor: '#0c0a09',
          background: 'transparent',
        });
      } catch {
        if (svgRef.current) svgRef.current.innerHTML = `<text x="50%" y="50%" text-anchor="middle" font-size="9" fill="#0c0a09">${code}</text>`;
      }
    });
  }, [code, height]);

  if (!code) return null;
  return (
    <div className="barcode-visual">
      <svg ref={svgRef} style={{ maxWidth: '100%', display: 'block', margin: '0 auto' }} />
    </div>
  );
}
