'use client';
import { useState, useEffect } from 'react';
import { useApp } from '@/context/AppContext';
import Icon from '@/components/Icon';
import Barcode from '@/components/Barcode';
import Modal from '@/components/Modal';
import Drawer from '@/components/Drawer';
import Switch from '@/components/Switch';
import Check from '@/components/Check';
import { fmt } from '@/lib/fmt';
import * as api from '@/lib/api';
import { uploadImage } from '@/lib/api';
function barcodeSvgString(code, height) {
  const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
  const format = /^\d{13}$/.test(code) ? 'EAN13' : /^\d{8}$/.test(code) ? 'EAN8' : 'CODE128';
  // dynamic import avoids SSR issues; JsBarcode mutates the passed SVG element
  return import('jsbarcode').then(mod => {
    const JsBarcode = mod.default ?? mod;
    JsBarcode(svg, code, {
      format, height, displayValue: true,
      fontSize: 7, textMargin: 1, margin: 0,
      lineColor: '#000', background: 'transparent',
    });
    svg.setAttribute('style', 'max-width:100%;display:block;margin:1px auto');
    // XMLSerializer includes the xmlns attribute the browser needs to render SVG in HTML
    return new XMLSerializer().serializeToString(svg);
  }).catch(() => `<div style="font-size:6pt;font-family:monospace">${code}</div>`);
}

async function printLabel(product) {
  const barcodeSvg = await barcodeSvgString(product.primary, 16);
  const name = (product.name || '').replace(/</g, '&lt;');
  const price = fmt(product.price);
  const win = window.open('', '_blank');
  win.document.write(`<!DOCTYPE html><html><head><title>Label</title>
    <style>
      *{box-sizing:border-box;margin:0;padding:0}
      body{font-family:Arial,sans-serif;background:#fff}
      .lbl{width:2in;height:1in;padding:1.5mm 2mm;text-align:center;display:flex;flex-direction:column;align-items:center;justify-content:center;overflow:hidden}
      .nm{font-size:8pt;font-weight:600;color:#000;margin-bottom:1mm;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;max-width:100%}
      .pr{font-size:9pt;font-weight:700;color:#000;margin-top:1mm}
      @media print{@page{size:2in 1in;margin:0}}
    </style>
  </head><body>
    <div class="lbl"><div class="nm">${name}</div>${barcodeSvg}<div class="pr">${price}</div></div>
    <script>window.onload=function(){window.print();window.close();}<\/script>
  </body></html>`);
  win.document.close();
}

function ProductEditor({ product, categories, onSave, onCancel }) {
  const { state } = useApp();
  const [p, setP] = useState(product);
  const [newBarcode, setNewBarcode] = useState('');
  const [loading, setLoading] = useState(false);
  const [imgUploading, setImgUploading] = useState(false);
  const upd = (k, v) => setP(x => ({ ...x, [k]: v }));

  const generateSku = () => {
    const existing = new Set(state.products.map(x => x.sku));
    let next = '';
    do {
      next = 'SKU-' + Math.floor(100000 + Math.random() * 900000);
    } while (existing.has(next));
    upd('sku', next);
  };

  useEffect(() => {
    if (product.__new && !p.sku) generateSku();
  }, []);

  const addBarcode = () => {
    const bc = newBarcode.trim();
    if (!bc || p.barcodes.includes(bc)) return;
    setP(x => ({ ...x, barcodes: [...x.barcodes, bc], primary: x.primary || bc }));
    setNewBarcode('');
  };
  const generateInternal = () => {
    const next = 'ASG-' + String(Math.floor(Math.random() * 999999)).padStart(6, '0');
    setP(x => ({ ...x, barcodes: [...x.barcodes, next], primary: x.primary || next, internal: true }));
  };
  const removeBarcode = (bc) => {
    setP(x => ({ ...x, barcodes: x.barcodes.filter(b => b !== bc), primary: x.primary === bc ? (x.barcodes.filter(b => b !== bc)[0] || '') : x.primary }));
  };

  const price = parseFloat(p.price) || 0, cost = parseFloat(p.cost) || 0;
  const margin = price > 0 && cost > 0 ? (((price - cost) / price) * 100).toFixed(1) : 0;

  return (
    <Modal title={product.__new ? 'New product' : `Edit — ${product.name}`} onClose={onCancel} size="lg"
      footer={<><button className="btn" onClick={onCancel} disabled={loading}>Cancel</button><button className={`btn primary ${loading ? 'loading' : ''}`} onClick={async () => { if (p.name && p.sku) { setLoading(true); try { await onSave(p); } finally { setLoading(false); } } }} disabled={!p.name || !p.sku || loading}>{product.__new ? 'Create product' : 'Save changes'}</button></>}>
      <div className="grid-2" style={{ alignItems: 'start' }}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          <div className="input-group"><label className="label">Product name</label><input className="input" value={p.name} onChange={e => upd('name', e.target.value)} placeholder="e.g. Coca-Cola 50cl" autoFocus /></div>
          <div className="row gap-3">
            <div className="input-group" style={{ flex: 1 }}>
              <label className="label">SKU</label>
              <div className="row gap-2">
                <input className="input mono" style={{ flex: 1 }} value={p.sku} onChange={e => upd('sku', e.target.value.toUpperCase())} placeholder="BV-001" />
                <button className="icon-btn" title="Generate SKU" onClick={generateSku} type="button">
                  <Icon name="refresh" size={14} />
                </button>
              </div>
            </div>
            <div className="input-group" style={{ flex: 1 }}><label className="label">Category</label><select className="select" value={p.cat} onChange={e => upd('cat', e.target.value)}>{categories.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}</select></div>
          </div>
          <div className="row gap-3">
            <div className="input-group" style={{ flex: 1 }}><label className="label">Cost price</label><input className="input mono" type="number" value={p.cost} onFocus={e => e.target.select()} onChange={e => upd('cost', e.target.value === '' ? '' : +e.target.value)} /></div>
            <div className="input-group" style={{ flex: 1 }}><label className="label">Selling price</label><input className="input mono" type="number" value={p.price} onFocus={e => e.target.select()} onChange={e => upd('price', e.target.value === '' ? '' : +e.target.value)} /></div>
            <div className="input-group" style={{ flex: 1 }}><label className="label">Margin</label><div className="input mono" style={{ background: 'var(--bg-subtle)', color: margin > 0 ? 'var(--success)' : 'var(--text-muted)' }}>{margin}%</div></div>
          </div>
          <div className="row gap-3">
            <div className="input-group" style={{ flex: 1 }}><label className="label">Stock on hand</label><input className="input mono" type="number" value={p.stock} onFocus={e => e.target.select()} onChange={e => upd('stock', e.target.value === '' ? '' : +e.target.value)} /></div>
            <div className="input-group" style={{ flex: 1 }}><label className="label">Low stock threshold</label><input className="input mono" type="number" value={p.min} onFocus={e => e.target.select()} onChange={e => upd('min', e.target.value === '' ? '' : +e.target.value)} /></div>
          </div>
          <div className="row gap-3"><Switch on={p.active} onChange={v => upd('active', v)} /><div><div className="font-semibold text-sm">Product active</div><div className="text-xs text-muted">Inactive products are hidden from POS</div></div></div>
          <div className="input-group">
            <label className="label">Product image</label>
            <div className="row gap-2">
              <input
                className="input"
                value={p.imageUrl || ''}
                onChange={e => upd('imageUrl', e.target.value)}
                placeholder="https://… or upload a file"
                style={{ flex: 1 }}
              />
              <label className={`btn${imgUploading ? ' loading' : ''}`} style={{ cursor: imgUploading ? 'default' : 'pointer', flexShrink: 0 }} title="Upload image">
                <Icon name="upload" size={14} />
                {imgUploading ? 'Uploading…' : 'Upload'}
                <input
                  type="file"
                  accept="image/*"
                  style={{ display: 'none' }}
                  disabled={imgUploading}
                  onChange={async (e) => {
                    const file = e.target.files?.[0];
                    if (!file) return;
                    setImgUploading(true);
                    try {
                      const url = await uploadImage(file);
                      upd('imageUrl', url);
                    } catch {
                      alert('Image upload failed');
                    } finally {
                      setImgUploading(false);
                      e.target.value = '';
                    }
                  }}
                />
              </label>
            </div>
            {p.imageUrl && (
              <div style={{ marginTop: 8, display: 'inline-flex', position: 'relative' }}>
                <img
                  src={p.imageUrl}
                  alt=""
                  style={{ width: 80, height: 80, objectFit: 'cover', borderRadius: 6, border: '1px solid var(--border)' }}
                  onError={e => { e.currentTarget.style.display = 'none'; }}
                />
                <button
                  className="icon-btn"
                  type="button"
                  style={{ position: 'absolute', top: -6, right: -6, background: 'var(--bg)', border: '1px solid var(--border)', borderRadius: '50%', width: 20, height: 20, padding: 0 }}
                  onClick={() => upd('imageUrl', '')}
                >
                  <Icon name="x" size={11} />
                </button>
              </div>
            )}
          </div>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          <div className="input-group"><label className="label">Barcodes</label><div className="hint">Scan, type, or generate internal codes. Primary is used on receipts.</div></div>
          <div className="row gap-2">
            <input className="input mono" placeholder="Scan or type barcode…" value={newBarcode} onChange={e => setNewBarcode(e.target.value)} onKeyDown={e => e.key === 'Enter' && (e.preventDefault(), addBarcode())} />
            <button className="btn" onClick={addBarcode}><Icon name="plus" />Add</button>
          </div>
          <button className="btn" style={{ justifyContent: 'center' }} onClick={generateInternal}><Icon name="barcode" />Generate internal barcode</button>
          {p.barcodes.length === 0 ? (
            <div className="empty" style={{ padding: 20, background: 'var(--bg-subtle)', borderRadius: 8 }}><Icon name="barcode" size={32} className="empty-icon" /><div className="empty-title">No barcode yet</div><div className="empty-sub">Scan an existing code or generate an internal one</div></div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
              {p.barcodes.map(bc => (
                <div key={bc} className="row gap-2" style={{ padding: 8, border: '1px solid var(--border)', borderRadius: 6 }}>
                  <div className="mono text-sm" style={{ flex: 1 }}>{bc}</div>
                  {bc.startsWith('ASG-') && <span className="badge accent">Internal</span>}
                  {p.primary === bc ? <span className="badge success">Primary</span> : <button className="btn sm ghost" onClick={() => upd('primary', bc)}>Make primary</button>}
                  <button className="icon-btn" onClick={() => removeBarcode(bc)}><Icon name="x" size={14} /></button>
                </div>
              ))}
            </div>
          )}
          {p.primary && (
            <div>
              <div className="row gap-2" style={{ alignItems: 'center', marginBottom: 8 }}>
                <label className="label" style={{ margin: 0, flex: 1 }}>Preview</label>
                <button className="btn sm" type="button" onClick={() => printLabel(p)}>
                  <Icon name="printer" size={13} />Print label
                </button>
              </div>
              <Barcode code={p.primary} />
            </div>
          )}
        </div>
      </div>
    </Modal>
  );
}

function ProductDrawer({ product, categories, onEdit, onRemove, onClose }) {
  const cat = categories.find(c => c.id === product.cat);
  const margin = (((product.price - product.cost) / product.price) * 100).toFixed(1);
  const [movements, setMovements] = useState([]);
  const [movementsLoading, setMovementsLoading] = useState(false);
  const [actionLoading, setActionLoading] = useState(false);

  useEffect(() => {
    (async () => {
      setMovementsLoading(true);
      try {
        const data = await api.getMovements({ productId: product.id, limit: 10 });
        setMovements(data);
      } catch (err) {
        console.error('Failed to load movements:', err);
      } finally {
        setMovementsLoading(false);
      }
    })();
  }, [product.id]);

  const ACT_COLOR = {
    stock_in: 'accent', stock_out: 'success', return_in: 'warning',
    damaged_out: 'danger', adjustment: '',
  };

  const actLabel = (m) => {
    const qty = m.qty > 0 ? `+${m.qty}` : String(m.qty);
    if (m.type === 'stock_in')    return `${qty} restock`;
    if (m.type === 'stock_out')   return `${qty} sale`;
    if (m.type === 'return_in')   return `${qty} return`;
    if (m.type === 'damaged_out') return `${qty} damaged`;
    if (m.type === 'adjustment')  return `${qty} adjustment`;
    return `${m.type} · ${qty}`;
  };

  return (
    <Drawer title={product.name} onClose={onClose} footer={<><button className={`btn danger ghost ${actionLoading ? 'loading' : ''}`} disabled={actionLoading} onClick={async () => { if (confirm(`Delete ${product.name}?`)) { setActionLoading(true); try { await onRemove(product.id); onClose(); } catch (err) { alert(err.message); } finally { setActionLoading(false); } } }}><Icon name="trash" />Delete</button><div style={{ flex: 1 }} /><button className="btn primary" onClick={onEdit} disabled={actionLoading}><Icon name="edit" />Edit</button></>}>
      {product.imageUrl && (
        <img src={product.imageUrl} alt={product.name} style={{ width: '100%', maxHeight: 200, objectFit: 'cover', borderRadius: 8, marginBottom: 12 }} onError={e => { e.currentTarget.style.display = 'none'; }} />
      )}
      <div className="mb-4"><span className="badge">{cat?.name}</span><span className="mono text-xs text-muted" style={{ marginLeft: 8 }}>{product.sku}</span></div>
      <div className="grid-2 mb-4">
        <div className="card"><div className="card-body"><div className="text-xs text-muted">Selling price</div><div className="font-semibold" style={{ fontSize: 20 }}>{fmt(product.price)}</div><div className="text-xs text-subtle mt-2">Cost {fmt(product.cost)} · Margin {margin}%</div></div></div>
        <div className="card"><div className="card-body"><div className="text-xs text-muted">Stock on hand</div><div className="font-semibold" style={{ fontSize: 20, color: product.stock === 0 ? 'var(--danger)' : product.stock < product.min ? 'var(--warning)' : 'var(--text)' }}>{product.stock}</div><div className="text-xs text-subtle mt-2">Min {product.min}</div></div></div>
      </div>
      <div className="card mb-4">
        <div className="card-header">
          <div className="card-title">Barcodes</div>
          {product.primary && (
            <button className="btn sm" type="button" onClick={() => printLabel(product)}>
              <Icon name="printer" size={13} />Print label
            </button>
          )}
        </div>
        <div className="card-body" style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          {product.barcodes.map(bc => (<div key={bc} className="row gap-2"><span className="mono text-sm">{bc}</span>{bc.startsWith('ASG-') && <span className="badge accent">Internal</span>}{product.primary === bc && <span className="badge success">Primary</span>}</div>))}
          <div className="mt-3"><Barcode code={product.primary} /></div>
        </div>
      </div>
      <div className="card">
        <div className="card-header"><div className="card-title">Recent movements</div></div>
        <div className="card-body">
          {movementsLoading ? (
            <div className="text-center py-4 text-muted">Loading activity...</div>
          ) : movements.length === 0 ? (
            <div className="text-center py-4 text-muted">No recent activity for this product</div>
          ) : (
            <div className="timeline">
              {movements.map(m => (
                <div key={m.id} className={`timeline-item ${ACT_COLOR[m.type] || ''}`}>
                  <div className="timeline-title">{actLabel(m)}</div>
                  <div className="timeline-meta">{m.by} · {m.time}</div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </Drawer>
  );
}

export default function ProductsPage() {
  const { state, setState, actions, toast } = useApp();
  const [query, setQuery] = useState('');
  const [catFilter, setCatFilter] = useState('all');
  const [statusFilter, setStatusFilter] = useState('all');
  const [selected, setSelected] = useState(new Set());
  const [editing, setEditing] = useState(null);
  const [viewing, setViewing] = useState(null);

  const filtered = state.products
    .filter(p => !query || p.name.toLowerCase().includes(query.toLowerCase()) || p.sku.toLowerCase().includes(query.toLowerCase()) || p.barcodes.some(b => b.includes(query)))
    .filter(p => catFilter === 'all' || p.cat === catFilter)
    .filter(p => statusFilter === 'all' || (statusFilter === 'active' && p.active) || (statusFilter === 'inactive' && !p.active) || (statusFilter === 'low' && p.stock < p.min));

  const toggleSel = (sku) => { const n = new Set(selected); n.has(sku) ? n.delete(sku) : n.add(sku); setSelected(n); };
  const toggleAll = () => setSelected(selected.size === filtered.length ? new Set() : new Set(filtered.map(p => p.sku)));

  const saveProduct = async (p) => {
    try {
      await actions.saveProduct(p);
      toast(editing?.__new ? `Product "${p.name}" created` : `Product "${p.name}" updated`);
      setEditing(null);
    } catch (err) {
      toast(err.message, 'error');
    }
  };

  const catName = (id) => state.categories.find(c => c.id === id)?.name || '—';

  return (
    <div>
      <div className="page-head">
        <div>
          <h1 className="page-title">Products</h1>
          <p className="page-sub">{state.products.length} SKUs · {state.products.filter(p => p.internal).length} with internal barcode · {state.products.filter(p => p.stock < p.min).length} low stock</p>
        </div>
        <div className="page-actions">
          <button className="btn"><Icon name="upload" />Import CSV</button>
          <button className="btn primary" onClick={() => setEditing({ __new: true, sku: '', name: '', cat: state.categories[0]?.id || '', price: 0, cost: 0, stock: 0, min: 10, barcodes: [], primary: '', internal: false, active: true, imageUrl: '', updated: new Date().toISOString().split('T')[0] })}><Icon name="plus" />Add product</button>
        </div>
      </div>

      <div className="card">
        <div className="toolbar">
          <div className="search"><Icon name="search" /><input className="input" placeholder="Search by name, SKU, or barcode…" value={query} onChange={e => setQuery(e.target.value)} /></div>
          <select className="select" style={{ width: 160 }} value={catFilter} onChange={e => setCatFilter(e.target.value)}>
            <option value="all">All categories</option>
            {state.categories.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
          </select>
          <div className="segmented">
            <button className={statusFilter === 'all' ? 'active' : ''} onClick={() => setStatusFilter('all')}>All</button>
            <button className={statusFilter === 'active' ? 'active' : ''} onClick={() => setStatusFilter('active')}>Active</button>
            <button className={statusFilter === 'low' ? 'active' : ''} onClick={() => setStatusFilter('low')}>Low stock</button>
            <button className={statusFilter === 'inactive' ? 'active' : ''} onClick={() => setStatusFilter('inactive')}>Inactive</button>
          </div>
          <div className="spacer" />
          {selected.size > 0 && (<><span className="text-xs text-muted">{selected.size} selected</span><button className="btn sm"><Icon name="printer" />Print labels</button><button className="btn sm"><Icon name="tag" />Change category</button><button className="btn sm danger"><Icon name="trash" />Deactivate</button></>)}
        </div>
        <div className="card-body flush" style={{ overflowX: 'auto' }}>
          <table className="table">
            <thead><tr><th style={{ width: 32 }}><Check on={selected.size === filtered.length && filtered.length > 0} onChange={toggleAll} /></th><th>Product</th><th>Category</th><th>Primary barcode</th><th className="num">Price</th><th className="num">Stock</th><th>Status</th><th style={{ width: 40 }}></th></tr></thead>
            <tbody>
              {filtered.map(p => {
                const low = p.stock < p.min, out = p.stock === 0;
                return (
                  <tr key={p.sku} className="clickable" onClick={() => setViewing(p)}>
                    <td onClick={e => e.stopPropagation()}><Check on={selected.has(p.sku)} onChange={() => toggleSel(p.sku)} /></td>
                    <td><div className="row gap-2" style={{ alignItems: 'center' }}>{p.imageUrl && <img src={p.imageUrl} alt="" style={{ width: 32, height: 32, objectFit: 'cover', borderRadius: 4, flexShrink: 0 }} onError={e => { e.currentTarget.style.display = 'none'; }} />}<div><div className="font-semibold">{p.name}</div><div className="text-xs text-subtle mono">{p.sku}</div></div></div></td>
                    <td>{catName(p.cat)}</td>
                    <td><div className="row gap-2"><span className="mono text-xs">{p.primary}</span>{p.internal && <span className="badge accent">Internal</span>}{p.barcodes.length > 1 && <span className="badge">+{p.barcodes.length - 1}</span>}</div></td>
                    <td className="num mono font-semibold">{fmt(p.price)}</td>
                    <td className="num mono font-semibold" style={{ color: out ? 'var(--danger)' : low ? 'var(--warning)' : 'var(--text)' }}>{p.stock}</td>
                    <td>{!p.active ? <span className="badge">Inactive</span> : out ? <span className="badge danger"><span className="badge-dot" />Out</span> : low ? <span className="badge warning"><span className="badge-dot" />Low</span> : <span className="badge success"><span className="badge-dot" />In stock</span>}</td>
                    <td onClick={e => e.stopPropagation()}><button className="icon-btn" onClick={() => setEditing(p)}><Icon name="edit" /></button></td>
                  </tr>
                );
              })}
              {filtered.length === 0 && (<tr><td colSpan={8}><div className="empty"><Icon name="package" size={40} className="empty-icon" /><div className="empty-title">No products match</div><div className="empty-sub">Try clearing filters or adding a new product</div></div></td></tr>)}
            </tbody>
          </table>
        </div>
      </div>

      {editing && <ProductEditor product={editing} categories={state.categories} onSave={saveProduct} onCancel={() => setEditing(null)} />}
      {viewing && <ProductDrawer product={viewing} categories={state.categories} onEdit={() => { setEditing(viewing); setViewing(null); }} onRemove={actions.deleteProduct} onClose={() => setViewing(null)} />}
    </div>
  );
}
