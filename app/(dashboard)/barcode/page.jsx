'use client';
import { useState } from 'react';
import { useApp } from '@/context/AppContext';
import Icon from '@/components/Icon';
import Barcode from '@/components/Barcode';
import Modal from '@/components/Modal';
import Check from '@/components/Check';
import { fmt } from '@/lib/fmt';
import * as api from '@/lib/api';

export default function BarcodePage() {
  const { state, setState, toast } = useApp();
  const [tab, setTab] = useState('assign');
  const [scanInput, setScanInput] = useState('');
  const [scanMatch, setScanMatch] = useState(null);
  const [genProduct, setGenProduct] = useState('');
  const [genLoading, setGenLoading] = useState(false);
  const [printQueue, setPrintQueue] = useState([]);
  const [bulkFilter, setBulkFilter] = useState('');
  const [showPreview, setShowPreview] = useState(false);
  const [printFormat, setPrintFormat] = useState('2x1');

  const lookupScan = () => {
    const match = state.products.find(p => p.barcodes.includes(scanInput.trim()));
    setScanMatch(match || { __notFound: true, code: scanInput.trim() });
  };

  const genFor = async () => {
    const p = state.products.find(x => x.sku === genProduct);
    if (!p || genLoading) return;
    const code = 'ASG-' + String(Math.floor(Math.random() * 999999)).padStart(6, '0');
    setGenLoading(true);
    try {
      await api.addBarcode(p.id, {
        barcode: code,
        barcodeType: 'CODE128',
        source: 'internal',
        isPrimary: !p.primary,
      });
      const updatedProduct = { ...p, barcodes: [...p.barcodes, code], primary: p.primary || code, internal: true };
      setState(s => ({ ...s, products: s.products.map(x => x.id === p.id ? updatedProduct : x) }));
      toast(`Internal barcode ${code} assigned to ${p.name}`);
      setPrintQueue(q => [...q, { ...updatedProduct, primary: code }]);
      setGenProduct('');
    } catch (err) {
      toast(err.message || 'Failed to save barcode', 'error');
    } finally {
      setGenLoading(false);
    }
  };

  const togglePrint = (sku) => {
    const p = state.products.find(x => x.sku === sku);
    if (!p) return;
    setPrintQueue(q => q.find(x => x.sku === sku) ? q.filter(x => x.sku !== sku) : [...q, p]);
  };

  const printLabels = async () => {
    const { default: JsBarcode } = await import('jsbarcode');

    const makeSvg = (code, barH) => {
      if (!code) return `<div style="font-size:6pt;font-family:monospace;color:#000">${code}</div>`;
      const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
      const format = /^\d{13}$/.test(code) ? 'EAN13' : /^\d{8}$/.test(code) ? 'EAN8' : 'CODE128';
      try {
        JsBarcode(svg, code, { format, height: barH, displayValue: true, fontSize: 7, textMargin: 1, margin: 0, lineColor: '#000', background: 'transparent' });
        svg.setAttribute('style', 'max-width:100%;display:block;margin:1px auto');
        return new XMLSerializer().serializeToString(svg);
      } catch {
        return `<div style="font-size:6pt;font-family:monospace;color:#000">${code}</div>`;
      }
    };

    const is2x1 = printFormat === '2x1';
    const isThermal = printFormat === 'thermal';

    let pageStyle, bodyStyle, labelStyle, nameStyle, priceStyle, gridStyle, barH;

    if (is2x1) {
      pageStyle = '@page{size:2in 1in;margin:0}';
      bodyStyle = 'font-family:Arial,sans-serif;background:#fff;margin:0;padding:0';
      gridStyle = 'margin:0;padding:0';
      labelStyle = 'width:2in;height:1in;box-sizing:border-box;padding:1.5mm 2mm;text-align:center;display:flex;flex-direction:column;align-items:center;justify-content:center;page-break-after:always;overflow:hidden';
      nameStyle = 'font-size:8pt;font-weight:600;color:#000;margin-bottom:1mm;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;max-width:100%';
      priceStyle = 'font-size:9pt;font-weight:700;color:#000;margin-top:1mm';
      barH = 16;
    } else if (isThermal) {
      pageStyle = '@page{size:80mm auto;margin:2mm}';
      bodyStyle = 'font-family:Arial,sans-serif;background:#fff';
      gridStyle = 'padding:0';
      labelStyle = 'width:76mm;padding:3mm 2mm;text-align:center;page-break-after:always';
      nameStyle = 'font-size:9pt;font-weight:600;color:#000;margin-bottom:2mm';
      priceStyle = 'font-size:10pt;font-weight:700;color:#000;margin-top:2mm';
      barH = 24;
    } else {
      const cols = printFormat === '24' ? 4 : 3;
      pageStyle = '@page{size:A4;margin:5mm}';
      bodyStyle = 'font-family:Arial,sans-serif;background:#fff';
      gridStyle = `display:grid;grid-template-columns:repeat(${cols},1fr);gap:4mm;padding:8mm`;
      labelStyle = 'border:1px solid #d6d3d1;padding:4mm;text-align:center;page-break-inside:avoid';
      nameStyle = 'font-size:9pt;font-weight:600;margin-bottom:2mm;color:#000;word-break:break-word';
      priceStyle = 'font-size:10pt;font-weight:700;margin-top:2mm;color:#000';
      barH = 28;
    }

    const labelsHtml = printQueue.map(p =>
      `<div style="${labelStyle}"><div style="${nameStyle}">${p.name.replace(/</g, '&lt;')}</div>${makeSvg(p.primary, barH)}<div style="${priceStyle}">${fmt(p.price)}</div></div>`
    ).join('');

    const html = `<!DOCTYPE html><html><head><title>Labels — ${printQueue.length}</title><style>*{box-sizing:border-box;margin:0;padding:0}body{${bodyStyle}}${pageStyle}</style></head><body><div style="${gridStyle}">${labelsHtml}</div><script>window.onload=function(){window.print();window.close();}<\/script></body></html>`;
    const win = window.open('', '_blank');
    win.document.open();
    win.document.write(html);
    win.document.close();
    setPrintQueue([]);
    setShowPreview(false);
  };

  const filteredBulk = state.products.filter(p => !bulkFilter || p.name.toLowerCase().includes(bulkFilter.toLowerCase()) || p.sku.toLowerCase().includes(bulkFilter.toLowerCase()));

  return (
    <div>
      <div className="page-head">
        <div>
          <h1 className="page-title">Barcode Center</h1>
          <p className="page-sub">Assign, generate, and print barcode labels · {state.products.filter(p => p.internal).length} internal codes issued</p>
        </div>
        <div className="page-actions">
          <button className="btn" onClick={() => setShowPreview(true)} disabled={printQueue.length === 0}><Icon name="printer" />Print queue ({printQueue.length})</button>
        </div>
      </div>

      <div className="tabs">
        {[['assign','Assign / Lookup'],['generate','Generate internal'],['bulk','Bulk print labels']].map(([k,v]) => (
          <div key={k} className={`tab${tab===k?' active':''}`} onClick={() => setTab(k)}>{v}</div>
        ))}
      </div>

      {tab === 'assign' && (
        <div className="grid-2">
          <div className="card">
            <div className="card-header"><div className="card-title">Scan or enter barcode</div></div>
            <div className="card-body">
              <div className="row gap-2 mb-3">
                <input className="input mono" placeholder="Scan with USB scanner or type code…" value={scanInput} onChange={e => setScanInput(e.target.value)} onKeyDown={e => e.key === 'Enter' && lookupScan()} autoFocus />
                <button className="btn primary" onClick={lookupScan}><Icon name="scan" />Lookup</button>
              </div>
              {!scanMatch ? (
                <div className="empty" style={{ background: 'var(--bg-subtle)', borderRadius: 8 }}><Icon name="barcode" size={40} className="empty-icon" /><div className="empty-title">Scan any barcode</div><div className="empty-sub">We'll tell you if it's known and let you assign or create</div></div>
              ) : scanMatch.__notFound ? (
                <div style={{ padding: 16, background: 'var(--warning-subtle)', borderRadius: 8, border: '1px solid var(--warning)' }}>
                  <div className="font-semibold mb-2">Unknown barcode <span className="mono">{scanMatch.code}</span></div>
                  <div className="text-sm text-muted mb-3">This code isn't assigned to any product.</div>
                  <div className="row gap-2"><button className="btn primary">Create new product</button><button className="btn">Attach to existing</button></div>
                </div>
              ) : (
                <div>
                  <div className="badge success mb-3"><span className="badge-dot" />Known barcode</div>
                  <div className="font-semibold" style={{ fontSize: 16 }}>{scanMatch.name}</div>
                  <div className="text-sm text-muted mb-3 mono">{scanMatch.sku}</div>
                  <div className="detail-row"><div className="k">Primary barcode</div><div className="v mono">{scanMatch.primary}</div></div>
                  <div className="detail-row"><div className="k">All barcodes</div><div className="v">{scanMatch.barcodes.length}</div></div>
                  <div className="detail-row"><div className="k">Price</div><div className="v font-semibold">{fmt(scanMatch.price)}</div></div>
                  <div className="detail-row"><div className="k">Stock</div><div className="v">{scanMatch.stock} units</div></div>
                  {/* <div className="row gap-2 mt-4"><button className="btn"><Icon name="plus" />Add another barcode</button><button className="btn"><Icon name="printer" />Print label</button></div> */}
                </div>
              )}
            </div>
          </div>
          <div className="card">
            <div className="card-header"><div className="card-title">Why multiple barcodes?</div></div>
            <div className="card-body text-sm" style={{ color: 'var(--text-muted)', lineHeight: 1.7 }}>
              <p>A single product may carry several codes in real life:</p>
              <ul style={{ paddingLeft: 18 }}>
                <li><strong>Manufacturer barcode</strong> — printed on the package</li>
                <li><strong>Internal store barcode</strong> — generated when no manufacturer code exists</li>
                <li><strong>Carton / pack barcode</strong> — for bulk receiving</li>
              </ul>
              <p>ASG lets you attach multiple codes and mark one as primary. The primary appears on receipts and labels; any code scans successfully at POS.</p>
              <div style={{ padding: 12, background: 'var(--accent-subtle)', color: 'var(--accent-text)', borderRadius: 8, marginTop: 12 }}>
                <div className="font-semibold mb-2">Internal code format</div>
                <div className="mono text-xs">ASG-XXXXXX · six digits · Code 128</div>
              </div>
            </div>
          </div>
        </div>
      )}

      {tab === 'generate' && (
        <div className="grid-2">
          <div className="card">
            <div className="card-header"><div className="card-title">Generate internal barcode</div></div>
            <div className="card-body">
              <div className="input-group mb-3">
                <label className="label">Select product without a barcode</label>
                <select className="select" value={genProduct} onChange={e => setGenProduct(e.target.value)}>
                  <option value="">Choose a product…</option>
                  {state.products.filter(p => !p.primary && p.barcodes.length === 0).map(p => (<option key={p.sku} value={p.sku}>{p.sku} — {p.name}</option>))}
                </select>
              </div>
              <button className={`btn primary w-full${genLoading ? ' loading' : ''}`} style={{ justifyContent: 'center' }} onClick={genFor} disabled={!genProduct || genLoading}>
                <Icon name="barcode" />{genLoading ? 'Saving…' : 'Generate & queue for printing'}
              </button>
              <div className="hint mt-2">A unique ASG-XXXXXX code will be generated, saved to the product, and added to the print queue.</div>
            </div>
          </div>
          <div className="card">
            <div className="card-header"><div className="card-title">Recently generated</div></div>
            <div className="card-body flush">
              <table className="table">
                <thead><tr><th>Product</th><th>Code</th><th></th></tr></thead>
                <tbody>
                  {state.products.filter(p => p.internal).slice(0, 8).map(p => (
                    <tr key={p.sku}>
                      <td><div className="font-semibold">{p.name}</div><div className="text-xs text-subtle mono">{p.sku}</div></td>
                      <td className="mono text-xs">{p.primary}</td>
                      <td><button className="btn sm" onClick={() => togglePrint(p.sku)}>{printQueue.find(x => x.sku === p.sku) ? '−' : '+'}</button></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {tab === 'bulk' && (
        <div className="card">
          <div className="toolbar">
            <div className="search"><Icon name="search" /><input className="input" placeholder="Search products…" value={bulkFilter} onChange={e => setBulkFilter(e.target.value)} /></div>
            <div className="spacer" />
            <span className="text-xs text-muted">{printQueue.length} queued</span>
            <button className="btn" onClick={() => setPrintQueue(filteredBulk)}>Select all</button>
            <button className="btn" onClick={() => setPrintQueue([])}>Clear</button>
            <button className="btn primary" onClick={() => setShowPreview(true)} disabled={printQueue.length === 0}><Icon name="printer" />Preview & print</button>
          </div>
          <div className="card-body flush">
            <table className="table">
              <thead><tr><th style={{ width: 32 }}></th><th>Product</th><th>Barcode</th><th className="num">Price</th><th className="num">Stock</th></tr></thead>
              <tbody>
                {filteredBulk.map(p => (
                  <tr key={p.sku} className="clickable" onClick={() => togglePrint(p.sku)}>
                    <td><Check on={!!printQueue.find(x => x.sku === p.sku)} onChange={() => togglePrint(p.sku)} /></td>
                    <td><div className="font-semibold">{p.name}</div><div className="text-xs text-subtle mono">{p.sku}</div></td>
                    <td className="mono text-xs">{p.primary || '—'} {p.internal && <span className="badge accent" style={{ marginLeft: 4 }}>Internal</span>}</td>
                    <td className="num mono">{fmt(p.price)}</td>
                    <td className="num mono">{p.stock}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {showPreview && (
        <Modal title="Label print preview" onClose={() => setShowPreview(false)} size="lg"
          footer={<><button className="btn" onClick={() => setShowPreview(false)}>Cancel</button><div style={{ flex: 1 }} /><select className="select" style={{ width: 200 }} value={printFormat} onChange={e => setPrintFormat(e.target.value)}><option value="2x1">2×1 in (Thermal label)</option><option value="thermal">Thermal roll (80mm)</option><option value="30">30 per sheet (A4)</option><option value="24">24 per sheet (A4)</option></select><button className="btn primary" onClick={printLabels}><Icon name="printer" />Print labels</button></>}>
          <div className="mb-3 text-sm text-muted">{printQueue.length} label{printQueue.length !== 1 ? 's' : ''} · {{ '2x1': '2×1 in thermal', thermal: 'Thermal roll 80mm', '30': '30 per A4 sheet', '24': '24 per A4 sheet' }[printFormat]}</div>
          <div className="label-sheet">
            <div className={printFormat === '2x1' || printFormat === 'thermal' ? '' : 'label-grid'} style={printFormat === '24' ? { gridTemplateColumns: 'repeat(4, 1fr)' } : {}}>
              {printQueue.slice(0, printFormat === '2x1' || printFormat === 'thermal' ? 4 : 12).map(p => (
                <div key={p.sku} className="label-card" style={printFormat === '2x1' ? { display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', aspectRatio: '2/1', marginBottom: 8 } : printFormat === 'thermal' ? { marginBottom: 8 } : {}}>
                  <div className="name">{p.name}</div>
                  <Barcode code={p.primary} height={printFormat === '2x1' ? 16 : 28} />
                  <div className="price">{fmt(p.price)}</div>
                </div>
              ))}
            </div>
            {printQueue.length > (printFormat === '2x1' || printFormat === 'thermal' ? 4 : 12) && <div className="text-xs text-muted mt-3 text-right">…and {printQueue.length - (printFormat === '2x1' || printFormat === 'thermal' ? 4 : 12)} more</div>}
          </div>
        </Modal>
      )}
    </div>
  );
}
