'use client';
import { useState } from 'react';
import { useApp } from '@/context/AppContext';
import Icon from '@/components/Icon';
import Switch from '@/components/Switch';
import { CURRENCIES, fmt } from '@/lib/fmt';

const ACT_COLOR = {
  stock_in: 'accent', stock_out: 'success', return_in: 'warning',
  damaged_out: 'danger', adjustment: '',
};

function actLabel(m) {
  const qty = m.qty > 0 ? `+${m.qty}` : String(m.qty);
  if (m.type === 'stock_in')    return `Stock received · ${qty} ${m.product}`;
  if (m.type === 'stock_out')   return `Sale deduction · ${qty} ${m.product}`;
  if (m.type === 'return_in')   return `Return · ${qty} ${m.product}`;
  if (m.type === 'damaged_out') return `Damaged goods · ${qty} ${m.product}`;
  if (m.type === 'adjustment')  return `Inventory adjustment · ${qty} ${m.product}`;
  return `${m.type} · ${m.product}`;
}

export default function SettingsPage() {
  const { state, currency, setCurrency, toast } = useApp();
  const { branches, movements } = state;
  const [section, setSection] = useState('branches');

  return (
    <div>
      <div className="page-head">
        <div>
          <h1 className="page-title">Settings</h1>
          <p className="page-sub">Business configuration, hardware, and policies</p>
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '200px 1fr', gap: 20 }}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
          {[
            ['branches', 'Branches', 'store'],
            ['currency', 'Currency & tax', 'dollar'],
            ['receipts', 'Receipts', 'receipt'],
            ['printers', 'Printers & labels', 'printer'],
            ['policies', 'Business policies', 'shield'],
            ['audit', 'Audit log', 'activity'],
          ].map(([k, lbl, icon]) => (
            <button key={k} className={`nav-item${section === k ? ' active' : ''}`} onClick={() => setSection(k)}>
              <Icon name={icon} />{lbl}
            </button>
          ))}
        </div>

        <div>
          {section === 'branches' && (
            <div className="card">
              <div className="card-header">
                <div className="card-title">Branches</div>
                <button className="btn sm primary" style={{ marginLeft: 'auto' }}><Icon name="plus" />Add branch</button>
              </div>
              <div className="card-body flush">
                <table className="table">
                  <thead><tr><th>Name</th><th>Address</th><th>Phone</th><th>Status</th></tr></thead>
                  <tbody>
                    {branches.length === 0 ? (
                      <tr><td colSpan={4} style={{ padding: '24px 16px', textAlign: 'center', color: 'var(--text-muted)', fontSize: 13 }}>No branches found</td></tr>
                    ) : branches.map(b => (
                      <tr key={b.id}>
                        <td className="font-semibold">{b.name}</td>
                        <td>{b.address || '—'}</td>
                        <td>{b.phone || '—'}</td>
                        <td>
                          {b.isActive
                            ? <span className="badge success"><span className="badge-dot" />Open</span>
                            : <span className="badge warning"><span className="badge-dot" />Inactive</span>}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {section === 'currency' && (
            <div className="card">
              <div className="card-header"><div className="card-title">Currency & tax</div></div>
              <div className="card-body">
                <div className="grid-2 mb-4">
                  <div className="input-group">
                    <label className="label">Currency</label>
                    <select className="select" value={currency} onChange={e => setCurrency(e.target.value)}>
                      <option value="GNF">Guinean Franc (GNF)</option>
                      <option value="USD">US Dollar (USD)</option>
                      <option value="EUR">Euro (EUR)</option>
                      <option value="NGN">Nigerian Naira (NGN)</option>
                      <option value="XOF">CFA Franc (XOF)</option>
                    </select>
                  </div>
                  <div className="input-group">
                    <label className="label">Decimal places</label>
                    <div className="input mono" style={{ background: 'var(--bg-subtle)' }}>{CURRENCIES[currency]?.decimals ?? 0}</div>
                  </div>
                </div>
                <div className="grid-2 mb-4">
                  <div className="input-group"><label className="label">Tax rate (%)</label><input className="input mono" defaultValue="18" /></div>
                  <div className="input-group">
                    <label className="label">Tax behavior</label>
                    <select className="select"><option>Tax included in price</option><option>Tax added at checkout</option></select>
                  </div>
                </div>
                <button className="btn primary" onClick={() => toast('Currency & tax saved')}>Save changes</button>
              </div>
            </div>
          )}

          {section === 'receipts' && (
            <div className="card">
              <div className="card-header"><div className="card-title">Receipts</div></div>
              <div className="card-body">
                <div className="input-group mb-3"><label className="label">Header text</label><input className="input" defaultValue="ASG — Alimentation Sarah & Guinée" /></div>
                <div className="input-group mb-3"><label className="label">Footer text</label><input className="input" defaultValue="Merci pour votre visite — revenez bientôt !" /></div>
                <div className="row gap-3 mb-2"><Switch on={true} onChange={() => {}} /><div className="font-semibold text-sm">Show barcode on receipt</div></div>
                <div className="row gap-3 mb-2"><Switch on={true} onChange={() => {}} /><div className="font-semibold text-sm">Show tax breakdown</div></div>
                <div className="row gap-3 mb-4"><Switch on={false} onChange={() => {}} /><div className="font-semibold text-sm">Auto-print receipt</div></div>
                <button className="btn primary" onClick={() => toast('Receipt settings saved')}>Save</button>
              </div>
            </div>
          )}

          {section === 'printers' && (
            <div className="card">
              <div className="card-header"><div className="card-title">Printers & labels</div></div>
              <div className="card-body">
                <div className="mb-3 font-semibold">Connected devices</div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                  <div className="row gap-3" style={{ padding: 12, border: '1px solid var(--border)', borderRadius: 8 }}>
                    <Icon name="printer" />
                    <div style={{ flex: 1 }}><div className="font-semibold">Epson TM-T88VI</div><div className="text-xs text-muted">Receipt printer · Kaloum · 80mm</div></div>
                    <span className="badge success"><span className="badge-dot" />Online</span>
                  </div>
                  <div className="row gap-3" style={{ padding: 12, border: '1px solid var(--border)', borderRadius: 8 }}>
                    <Icon name="printer" />
                    <div style={{ flex: 1 }}><div className="font-semibold">Zebra ZD220</div><div className="text-xs text-muted">Label printer · 40×25mm</div></div>
                    <span className="badge success"><span className="badge-dot" />Online</span>
                  </div>
                </div>
                <div className="mt-4 mb-3 font-semibold">Label format</div>
                <div className="input-group mb-3">
                  <label className="label">Default layout</label>
                  <select className="select"><option>30 per A4 sheet (70×25mm)</option><option>24 per sheet</option><option>Thermal roll 40×25mm</option></select>
                </div>
                <div className="row gap-3 mb-4"><Switch on={true} onChange={() => {}} /><div className="font-semibold text-sm">Include price on label</div></div>
                <button className="btn primary" onClick={() => toast('Printer settings saved')}>Save</button>
              </div>
            </div>
          )}

          {section === 'policies' && (
            <div className="card">
              <div className="card-header"><div className="card-title">Business policies</div></div>
              <div className="card-body">
                <div className="row gap-3 mb-3"><Switch on={true} onChange={() => {}} /><div><div className="font-semibold text-sm">Require manager approval for refunds over 100 000 GNF</div></div></div>
                <div className="row gap-3 mb-3"><Switch on={true} onChange={() => {}} /><div><div className="font-semibold text-sm">Allow cashier discounts up to 5%</div></div></div>
                <div className="row gap-3 mb-3"><Switch on={false} onChange={() => {}} /><div><div className="font-semibold text-sm">Block sales below cost price</div></div></div>
                <div className="row gap-3 mb-3"><Switch on={true} onChange={() => {}} /><div><div className="font-semibold text-sm">Low-stock alerts on dashboard</div></div></div>
                <div className="row gap-3 mb-4"><Switch on={true} onChange={() => {}} /><div><div className="font-semibold text-sm">Lock POS when cashier is idle &gt; 5 minutes</div></div></div>
                <button className="btn primary" onClick={() => toast('Policies saved')}>Save</button>
              </div>
            </div>
          )}

          {section === 'audit' && (
            <div className="card">
              <div className="card-header"><div className="card-title">Inventory activity log</div></div>
              <div className="card-body">
                {movements.length === 0 ? (
                  <div style={{ color: 'var(--text-muted)', fontSize: 13 }}>No activity recorded yet</div>
                ) : (
                  <div className="timeline">
                    {movements.slice(0, 20).map(m => (
                      <div key={m.id} className={`timeline-item ${ACT_COLOR[m.type] || ''}`}>
                        <div className="timeline-title">{actLabel(m)}</div>
                        <div className="timeline-meta">{m.by} · {m.time} · {m.reason !== '—' ? m.reason : ''}</div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
