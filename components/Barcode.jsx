'use client';
import { useEffect, useRef } from 'react';

export default function Barcode({ code, height = 52 }) {
  const svgRef = useRef(null);

  useEffect(() => {
    if (!svgRef.current || !code) return;
    import('jsbarcode').then(mod => {
      const JsBarcode = mod.default ?? mod;
      try {
        JsBarcode(svgRef.current, code, {
          format: 'AUTO',
          height: Math.max(height - 16, 20),
          displayValue: true,
          fontSize: 9,
          textMargin: 2,
          margin: 0,
          lineColor: '#0c0a09',
          background: 'transparent',
        });
      } catch {
        // code not encodable — show text fallback
        if (svgRef.current) svgRef.current.innerHTML = '';
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
