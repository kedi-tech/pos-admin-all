'use client';
import { useState } from 'react';
import { useApp } from '@/context/AppContext';
import Icon from '@/components/Icon';
import Switch from '@/components/Switch';
import Modal from '@/components/Modal';
import { CURRENCIES } from '@/lib/fmt';

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

function lsGet(key, def) {
  if (typeof window === 'undefined') return def;
  const v = localStorage.getItem(key);
  return v !== null ? JSON.parse(v) : def;
}

function lsSet(key, val) {
  localStorage.setItem(key, JSON.stringify(val));
}

export default function SettingsPage() {
  const { state, actions, currency, setCurrency, toast } = useApp();
  const { branches, movements } = state;
  const [section, setSection] = useState('branches');

  // ── currency & tax ──────────────────────────────────────────────
  const [taxRate, setTaxRate] = useState(() => lsGet('asg-tax-rate', '18'));
  const [taxBehavior, setTaxBehavior] = useState(() => lsGet('asg-tax-behavior', 'included'));

  // ── receipts ────────────────────────────────────────────────────
  const [recHeader, setRecHeader] = useState(() => lsGet('asg-rec-header', 'ASG — Alimentation Sarah & Guinée'));
  const [recFooter, setRecFooter] = useState(() => lsGet('asg-rec-footer', 'Merci pour votre visite — revenez bientôt !'));
  const [recBarcode, setRecBarcode] = useState(() => lsGet('asg-rec-barcode', true));
  const [recTax, setRecTax] = useState(() => lsGet('asg-rec-tax', true));
  const [recAutoPrint, setRecAutoPrint] = useState(() => lsGet('asg-rec-autoprint', false));

  // ── printers ────────────────────────────────────────────────────
  const [labelFormat, setLabelFormat] = useState(() => lsGet('asg-label-format', '30'));
  const [labelPrice, setLabelPrice] = useState(() => lsGet('asg-label-price', true));

  // ── policies ────────────────────────────────────────────────────
  const [polRefundApproval, setPolRefundApproval] = useState(() => lsGet('asg-pol-refund-approval', true));
  const [polCashierDiscount, setPolCashierDiscount] = useState(() => lsGet('asg-pol-cashier-discount', true));
  const [polBlockBelowCost, setPolBlockBelowCost] = useState(() => lsGet('asg-pol-block-below-cost', false));
  const [polLowStockAlerts, setPolLowStockAlerts] = useState(() => lsGet('asg-pol-low-stock', true));
  const [polIdleLock, setPolIdleLock] = useState(() => lsGet('asg-pol-idle-lock', true));

  // ── branches ────────────────────────────────────────────────────
  const [branchModal, setBranchModal] = useState(false);
  const [editingBranch, setEditingBranch] = useState(null);
  const [branchForm, setBranchForm] = useState({ name: '', address: '', phone: '' });
  const [branchLoading, setBranchLoading] = useState(false);

  const openAdd = () => {
    setEditingBranch(null);
    setBranchForm({ name: '', address: '', phone: '' });
    setBranchModal(true);
  };

  const openEdit = (b) => {
    setEditingBranch(b);
    setBranchForm({ name: b.name, address: b.address || '', phone: b.phone || '' });
    setBranchModal(true);
  };

  const saveBranch = async () => {
    if (!branchForm.name.trim()) return;
    setBranchLoading(true);
    try {
      if (editingBranch) {
        await actions.updateBranch(editingBranch.id, branchForm);
        toast(`Branch "${branchForm.name}" updated`);
      } else {
        await actions.createBranch(branchForm);
        toast(`Branch "${branchForm.name}" created`);
      }
      setBranchModal(false);
    } catch (err) {
      toast(err.message || 'Failed to save branch', 'error');
    } finally {
      setBranchLoading(false);
    }
  };

  const toggleBranchActive = async (b) => {
    try {
      await actions.updateBranch(b.id, { isActive: !b.isActive });
      toast(`Branch "${b.name}" ${b.isActive ? 'deactivated' : 'activated'}`);
    } catch (err) {
      toast(err.message || 'Failed to update branch', 'error');
    }
  };

  const saveTax = () => {
    lsSet('asg-tax-rate', taxRate);
    lsSet('asg-tax-behavior', taxBehavior);
    toast('Currency & tax saved');
  };

  const saveReceipts = () => {
    lsSet('asg-rec-header', recHeader);
    lsSet('asg-rec-footer', recFooter);
    lsSet('asg-rec-barcode', recBarcode);
    lsSet('asg-rec-tax', recTax);
    lsSet('asg-rec-autoprint', recAutoPrint);
    toast('Receipt settings saved');
  };

  const savePrinters = () => {
    lsSet('asg-label-format', labelFormat);
    lsSet('asg-label-price', labelPrice);
    toast('Printer settings saved');
  };

  const savePolicies = () => {
    lsSet('asg-pol-refund-approval', polRefundApproval);
    lsSet('asg-pol-cashier-discount', polCashierDiscount);
    lsSet('asg-pol-block-below-cost', polBlockBelowCost);
    lsSet('asg-pol-low-stock', polLowStockAlerts);
    lsSet('asg-pol-idle-lock', polIdleLock);
    toast('Policies saved');
  };

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

          {/* ── BRANCHES ─────────────────────────────────────────── */}
          {section === 'branches' && (
            <div className="card">
              <div className="card-header">
                <div className="card-title">Branches</div>
                <button className="btn sm primary" style={{ marginLeft: 'auto' }} onClick={openAdd}>
                  <Icon name="plus" />Add branch
                </button>
              </div>
              <div className="card-body flush">
                <table className="table">
                  <thead><tr><th>Name</th><th>Address</th><th>Phone</th><th>Status</th><th></th></tr></thead>
                  <tbody>
                    {branches.length === 0 ? (
                      <tr><td colSpan={5} style={{ padding: '24px 16px', textAlign: 'center', color: 'var(--text-muted)', fontSize: 13 }}>No branches found</td></tr>
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
                        <td>
                          <div className="row gap-2">
                            <button className="btn sm" onClick={() => openEdit(b)}>Edit</button>
                            <button className="btn sm" onClick={() => toggleBranchActive(b)}>
                              {b.isActive ? 'Deactivate' : 'Activate'}
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* ── CURRENCY & TAX ───────────────────────────────────── */}
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
                  <div className="input-group">
                    <label className="label">Tax rate (%)</label>
                    <input
                      className="input mono"
                      type="number"
                      min="0"
                      max="100"
                      value={taxRate}
                      onChange={e => setTaxRate(e.target.value)}
                    />
                  </div>
                  <div className="input-group">
                    <label className="label">Tax behavior</label>
                    <select className="select" value={taxBehavior} onChange={e => setTaxBehavior(e.target.value)}>
                      <option value="included">Tax included in price</option>
                      <option value="added">Tax added at checkout</option>
                    </select>
                  </div>
                </div>
                <button className="btn primary" onClick={saveTax}>Save changes</button>
              </div>
            </div>
          )}

          {/* ── RECEIPTS ─────────────────────────────────────────── */}
          {section === 'receipts' && (
            <div className="card">
              <div className="card-header"><div className="card-title">Receipts</div></div>
              <div className="card-body">
                <div className="input-group mb-3">
                  <label className="label">Header text</label>
                  <input className="input" value={recHeader} onChange={e => setRecHeader(e.target.value)} />
                </div>
                <div className="input-group mb-3">
                  <label className="label">Footer text</label>
                  <input className="input" value={recFooter} onChange={e => setRecFooter(e.target.value)} />
                </div>
                <div className="row gap-3 mb-2" style={{ cursor: 'pointer' }} onClick={() => setRecBarcode(v => !v)}>
                  <Switch on={recBarcode} onChange={() => setRecBarcode(v => !v)} />
                  <div className="font-semibold text-sm">Show barcode on receipt</div>
                </div>
                <div className="row gap-3 mb-2" style={{ cursor: 'pointer' }} onClick={() => setRecTax(v => !v)}>
                  <Switch on={recTax} onChange={() => setRecTax(v => !v)} />
                  <div className="font-semibold text-sm">Show tax breakdown</div>
                </div>
                <div className="row gap-3 mb-4" style={{ cursor: 'pointer' }} onClick={() => setRecAutoPrint(v => !v)}>
                  <Switch on={recAutoPrint} onChange={() => setRecAutoPrint(v => !v)} />
                  <div className="font-semibold text-sm">Auto-print receipt</div>
                </div>
                <button className="btn primary" onClick={saveReceipts}>Save</button>
              </div>
            </div>
          )}

          {/* ── PRINTERS ─────────────────────────────────────────── */}
          {section === 'printers' && (
            <div className="card">
              <div className="card-header"><div className="card-title">Printers & labels</div></div>
              <div className="card-body">
                <div className="mb-3 font-semibold">Label format</div>
                <div className="input-group mb-3">
                  <label className="label">Default layout</label>
                  <select className="select" value={labelFormat} onChange={e => setLabelFormat(e.target.value)}>
                    <option value="30">30 per A4 sheet (70×25mm)</option>
                    <option value="24">24 per A4 sheet</option>
                    <option value="2x1">2×1 in thermal label</option>
                    <option value="thermal">Thermal roll (80mm)</option>
                  </select>
                </div>
                <div className="row gap-3 mb-4" style={{ cursor: 'pointer' }} onClick={() => setLabelPrice(v => !v)}>
                  <Switch on={labelPrice} onChange={() => setLabelPrice(v => !v)} />
                  <div className="font-semibold text-sm">Include price on label</div>
                </div>
                <button className="btn primary" onClick={savePrinters}>Save</button>
              </div>
            </div>
          )}

          {/* ── POLICIES ─────────────────────────────────────────── */}
          {section === 'policies' && (
            <div className="card">
              <div className="card-header"><div className="card-title">Business policies</div></div>
              <div className="card-body">
                <div className="row gap-3 mb-3" style={{ cursor: 'pointer' }} onClick={() => setPolRefundApproval(v => !v)}>
                  <Switch on={polRefundApproval} onChange={() => setPolRefundApproval(v => !v)} />
                  <div><div className="font-semibold text-sm">Require manager approval for refunds over 100 000 GNF</div></div>
                </div>
                <div className="row gap-3 mb-3" style={{ cursor: 'pointer' }} onClick={() => setPolCashierDiscount(v => !v)}>
                  <Switch on={polCashierDiscount} onChange={() => setPolCashierDiscount(v => !v)} />
                  <div><div className="font-semibold text-sm">Allow cashier discounts up to 5%</div></div>
                </div>
                <div className="row gap-3 mb-3" style={{ cursor: 'pointer' }} onClick={() => setPolBlockBelowCost(v => !v)}>
                  <Switch on={polBlockBelowCost} onChange={() => setPolBlockBelowCost(v => !v)} />
                  <div><div className="font-semibold text-sm">Block sales below cost price</div></div>
                </div>
                <div className="row gap-3 mb-3" style={{ cursor: 'pointer' }} onClick={() => setPolLowStockAlerts(v => !v)}>
                  <Switch on={polLowStockAlerts} onChange={() => setPolLowStockAlerts(v => !v)} />
                  <div><div className="font-semibold text-sm">Low-stock alerts on dashboard</div></div>
                </div>
                <div className="row gap-3 mb-4" style={{ cursor: 'pointer' }} onClick={() => setPolIdleLock(v => !v)}>
                  <Switch on={polIdleLock} onChange={() => setPolIdleLock(v => !v)} />
                  <div><div className="font-semibold text-sm">Lock POS when cashier is idle &gt; 5 minutes</div></div>
                </div>
                <button className="btn primary" onClick={savePolicies}>Save</button>
              </div>
            </div>
          )}

          {/* ── AUDIT LOG ─────────────────────────────────────────── */}
          {section === 'audit' && (
            <div className="card">
              <div className="card-header">
                <div className="card-title">Inventory activity log</div>
                <div className="text-xs text-muted" style={{ marginLeft: 'auto' }}>Last {movements.length} entries</div>
              </div>
              <div className="card-body">
                {movements.length === 0 ? (
                  <div style={{ color: 'var(--text-muted)', fontSize: 13 }}>No activity recorded yet</div>
                ) : (
                  <div className="timeline">
                    {movements.slice(0, 20).map(m => (
                      <div key={m.id} className={`timeline-item ${ACT_COLOR[m.type] || ''}`}>
                        <div className="timeline-title">{actLabel(m)}</div>
                        <div className="timeline-meta">{m.by} · {m.time}{m.reason && m.reason !== '—' ? ` · ${m.reason}` : ''}</div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* ── BRANCH MODAL ──────────────────────────────────────────── */}
      {branchModal && (
        <Modal
          title={editingBranch ? `Edit branch — ${editingBranch.name}` : 'Add branch'}
          onClose={() => !branchLoading && setBranchModal(false)}
          footer={
            <>
              <button className="btn" onClick={() => setBranchModal(false)} disabled={branchLoading}>Cancel</button>
              <button
                className={`btn primary${branchLoading ? ' loading' : ''}`}
                onClick={saveBranch}
                disabled={!branchForm.name.trim() || branchLoading}
              >
                {branchLoading ? 'Saving…' : editingBranch ? 'Update branch' : 'Create branch'}
              </button>
            </>
          }
        >
          <div className="input-group mb-3">
            <label className="label">Branch name <span style={{ color: 'var(--danger)' }}>*</span></label>
            <input
              className="input"
              placeholder="e.g. Kaloum, Ratoma…"
              value={branchForm.name}
              onChange={e => setBranchForm(f => ({ ...f, name: e.target.value }))}
              autoFocus
              disabled={branchLoading}
            />
          </div>
          <div className="input-group mb-3">
            <label className="label">Address <span style={{ color: 'var(--text-muted)', fontWeight: 400 }}>(optional)</span></label>
            <input
              className="input"
              placeholder="Street address…"
              value={branchForm.address}
              onChange={e => setBranchForm(f => ({ ...f, address: e.target.value }))}
              disabled={branchLoading}
            />
          </div>
          <div className="input-group">
            <label className="label">Phone <span style={{ color: 'var(--text-muted)', fontWeight: 400 }}>(optional)</span></label>
            <input
              className="input mono"
              placeholder="+224 …"
              value={branchForm.phone}
              onChange={e => setBranchForm(f => ({ ...f, phone: e.target.value }))}
              onKeyDown={e => e.key === 'Enter' && saveBranch()}
              disabled={branchLoading}
            />
          </div>
        </Modal>
      )}
    </div>
  );
}
