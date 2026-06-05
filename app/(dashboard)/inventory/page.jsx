'use client';
import { useState } from 'react';
import { useApp } from '@/context/AppContext';
import Icon from '@/components/Icon';
import Modal from '@/components/Modal';
import { fmt } from '@/lib/fmt';

function downloadCsv(filename, headers, rows) {
  const csv = [headers, ...rows]
    .map(r => r.map(v => `"${String(v ?? '').replace(/"/g, '""')}"`).join(','))
    .join('\n');
  const blob = new Blob(['﻿' + csv], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

export default function InventoryPage() {
  const { state, currentUser, actions, toast } = useApp();
  const [tab, setTab] = useState('overview');
  const [adjProduct, setAdjProduct] = useState(null);
  const [adjBranchId, setAdjBranchId] = useState('');
  const [adjType, setAdjType] = useState('stock_in');
  const [adjQty, setAdjQty] = useState('');
  const [adjReason, setAdjReason] = useState('');
  const [query, setQuery] = useState('');
  const [adjLoading, setAdjLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);

  const defaultBranchId = () =>
    currentUser?.branch?.id || currentUser?.branchId || state.branches[0]?.id || '';

  const openModal = (product) => {
    setAdjProduct(product);
    setAdjBranchId(defaultBranchId());
    setAdjQty('');
    setAdjReason('');
    setAdjType('stock_in');
  };

  const closeModal = () => {
    if (adjLoading) return;
    setAdjProduct(null);
  };

  const filtered = state.products.filter(p => !query || p.name.toLowerCase().includes(query.toLowerCase()) || p.sku.toLowerCase().includes(query.toLowerCase()));
  const totalValue = state.products.reduce((a, b) => a + b.cost * b.stock, 0);
  const totalUnits = state.products.reduce((a, b) => a + b.stock, 0);

  const handleRefresh = async () => {
    setRefreshing(true);
    try {
      await actions.refresh();
      toast('Stock data refreshed');
    } catch {
      toast('Refresh failed', 'error');
    } finally {
      setRefreshing(false);
    }
  };

  const qty = Number(adjQty);
  // adjBranchId is NOT in this guard — AppContext throws a clear error if branch can't be resolved
  const canSubmit = adjProduct && qty > 0 && !adjLoading;

  const submitAdjustment = async () => {
    if (!canSubmit) return;
    const inbound = ['stock_in', 'return_in'].includes(adjType);
    const apiType = adjType === 'adjustment'
      ? (inbound ? 'adjustment_in' : 'adjustment_out')
      : adjType;
    // Resolve branch at submit time in case state loaded after modal opened
    const branchToUse = adjBranchId || currentUser?.branch?.id || currentUser?.branchId || state.branches[0]?.id;
    setAdjLoading(true);
    try {
      await actions.adjustInventory({
        productId: adjProduct.id,
        branchId: branchToUse,
        quantity: qty,
        movementType: apiType,
        reason: adjReason.trim() || '—',
      });
      toast(`Stock ${inbound ? 'increased' : 'decreased'} by ${qty} units`);
      setAdjProduct(null);
    } catch (err) {
      toast(err.message || 'Adjustment failed', 'error');
    } finally {
      setAdjLoading(false);
    }
  };

  const typeLabel = { stock_in: 'Stock in', stock_out: 'Stock out', damaged_out: 'Damaged', return_in: 'Return', adjustment: 'Adjustment' };
  const typeBadge = { stock_in: 'success', return_in: 'success', damaged_out: 'danger', stock_out: 'warning', adjustment: 'info' };

  return (
    <div>
      <div className="page-head">
        <div>
          <h1 className="page-title">Inventory</h1>
          <p className="page-sub">{totalUnits.toLocaleString('fr-FR')} units on hand · Estimated value {fmt(totalValue)}</p>
        </div>
        <div className="page-actions">
          <button className={`btn${refreshing ? ' loading' : ''}`} onClick={handleRefresh} disabled={refreshing}>
            <Icon name="refresh" />{refreshing ? 'Refreshing…' : 'Refresh stock'}
          </button>
          <button className="btn" onClick={() => downloadCsv(
            `stock-${new Date().toISOString().slice(0,10)}.csv`,
            ['SKU', 'Product', 'Category', 'On hand', 'Min', 'Unit cost', 'Stock value'],
            state.products.map(p => [p.sku, p.name, p.categoryName || '', p.stock, p.min, p.cost, p.cost * p.stock]),
          )}><Icon name="download" />Export stock</button>
          <button className="btn primary" onClick={() => openModal(state.products[0])} disabled={state.products.length === 0}>
            <Icon name="plus" />Stock movement
          </button>
        </div>
      </div>

      <div className="stat-grid">
        <div className="stat"><div className="stat-label"><Icon name="package" />Total SKUs</div><div className="stat-value">{state.products.length}</div></div>
        <div className="stat"><div className="stat-label"><Icon name="warehouse" />Units on hand</div><div className="stat-value">{totalUnits.toLocaleString('fr-FR')}</div></div>
        <div className="stat"><div className="stat-label"><Icon name="dollar" />Stock value</div><div className="stat-value">{fmt(totalValue)}</div></div>
        <div className="stat"><div className="stat-label"><Icon name="alert" />Low / out</div><div className="stat-value" style={{ color: 'var(--danger)' }}>{state.products.filter(p => p.stock < p.min).length}</div></div>
      </div>

      <div className="tabs">
        {[['overview','Stock overview'],['movements','Movement log'],['damaged','Damaged items']].map(([k,v]) => (
          <div key={k} className={`tab${tab===k?' active':''}`} onClick={() => setTab(k)}>{v}</div>
        ))}
      </div>

      {tab === 'overview' && (
        <div className="card">
          <div className="toolbar">
            <div className="search"><Icon name="search" /><input className="input" placeholder="Search products…" value={query} onChange={e => setQuery(e.target.value)} /></div>
          </div>
          <div className="card-body flush">
            <table className="table">
              <thead><tr><th>Product</th><th className="num">On hand</th><th className="num">Min</th><th>Fill level</th><th className="num">Unit cost</th><th className="num">Value</th><th></th></tr></thead>
              <tbody>
                {filtered.map(p => {
                  const pct = Math.min(100, (p.stock / Math.max(p.min * 3, 10)) * 100);
                  const level = p.stock === 0 ? 'danger' : p.stock < p.min ? 'warning' : '';
                  return (
                    <tr key={p.sku}>
                      <td><div className="font-semibold">{p.name}</div><div className="text-xs text-subtle mono">{p.sku}</div></td>
                      <td className="num mono font-semibold">{p.stock}</td>
                      <td className="num mono text-muted">{p.min}</td>
                      <td style={{ width: 140 }}><div className="progress"><div className={`progress-bar${level ? ' ' + level : ''}`} style={{ width: pct + '%' }} /></div></td>
                      <td className="num mono">{fmt(p.cost)}</td>
                      <td className="num mono font-semibold">{fmt(p.cost * p.stock)}</td>
                      <td><button className="btn sm" onClick={() => openModal(p)}>Adjust</button></td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {tab === 'movements' && (
        <div className="card">
          <div className="card-body flush">
            <table className="table">
              <thead><tr><th>ID</th><th>Time</th><th>Type</th><th>Product</th><th className="num">Qty</th><th>Reason</th><th>By</th></tr></thead>
              <tbody>
                {state.movements.map(m => (
                  <tr key={m.id}>
                    <td className="mono text-xs">{m.id}</td>
                    <td className="mono text-xs">{m.time}</td>
                    <td><span className={`badge ${typeBadge[m.type] || ''}`}>{typeLabel[m.type] || m.type}</span></td>
                    <td><div className="font-semibold">{m.product}</div><div className="text-xs text-subtle mono">{m.sku}</div></td>
                    <td className="num mono font-semibold" style={{ color: m.qty > 0 ? 'var(--success)' : 'var(--danger)' }}>{m.qty > 0 ? '+' : ''}{m.qty}</td>
                    <td className="text-sm">{m.reason}</td>
                    <td className="text-sm">{m.by}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {tab === 'damaged' && (
        <div className="card">
          <div className="card-body flush">
            <table className="table">
              <thead><tr><th>Time</th><th>Product</th><th className="num">Lost</th><th className="num">Cost impact</th><th>Reason</th></tr></thead>
              <tbody>
                {state.movements.filter(m => m.type === 'damaged_out').map(m => {
                  const p = state.products.find(x => x.sku === m.sku);
                  const impact = p ? Math.abs(m.qty) * p.cost : 0;
                  return (
                    <tr key={m.id}>
                      <td className="mono text-xs">{m.time}</td>
                      <td><div className="font-semibold">{m.product}</div><div className="text-xs text-subtle mono">{m.sku}</div></td>
                      <td className="num mono" style={{ color: 'var(--danger)' }}>{m.qty}</td>
                      <td className="num mono" style={{ color: 'var(--danger)' }}>−{fmt(impact)}</td>
                      <td className="text-sm">{m.reason}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {adjProduct && (
        <Modal
          title="Record stock movement"
          onClose={closeModal}
          footer={
            <>
              <button className="btn" onClick={closeModal} disabled={adjLoading}>Cancel</button>
              <button
                className={`btn primary${adjLoading ? ' loading' : ''}`}
                onClick={submitAdjustment}
                disabled={!canSubmit}
              >
                {adjLoading ? 'Saving…' : 'Record movement'}
              </button>
            </>
          }
        >
          <div className="input-group mb-3">
            <label className="label">Product</label>
            <select
              className="select"
              value={adjProduct.id}
              onChange={e => setAdjProduct(state.products.find(p => p.id === e.target.value))}
              disabled={adjLoading}
            >
              {state.products.map(p => (
                <option key={p.id} value={p.id}>{p.sku} — {p.name} (stock: {p.stock})</option>
              ))}
            </select>
          </div>

          {state.branches.length > 1 && (
            <div className="input-group mb-3">
              <label className="label">Branch</label>
              <select className="select" value={adjBranchId} onChange={e => setAdjBranchId(e.target.value)} disabled={adjLoading}>
                {state.branches.map(b => <option key={b.id} value={b.id}>{b.name}</option>)}
              </select>
            </div>
          )}

          <div className="input-group mb-3">
            <label className="label">Movement type</label>
            <div className="segmented" style={{ width: '100%' }}>
              {Object.entries({ stock_in: 'Stock in', damaged_out: 'Damaged', return_in: 'Return', adjustment: 'Adjustment' }).map(([k, v]) => (
                <button key={k} className={adjType === k ? 'active' : ''} style={{ flex: 1 }} onClick={() => setAdjType(k)} disabled={adjLoading}>{v}</button>
              ))}
            </div>
          </div>

          <div className="input-group mb-3">
            <label className="label">Quantity</label>
            <input
              className="input mono"
              type="number"
              min="1"
              placeholder="Enter quantity…"
              value={adjQty}
              onChange={e => setAdjQty(e.target.value)}
              onFocus={e => e.target.select()}
              autoFocus
              disabled={adjLoading}
            />
            <div className="hint">
              Will {['stock_in', 'return_in'].includes(adjType) ? 'add to' : 'subtract from'} current stock of {adjProduct.stock} units
            </div>
          </div>

          <div className="input-group">
            <label className="label">Reason / note <span style={{ color: 'var(--text-muted)', fontWeight: 400 }}>(optional)</span></label>
            <input
              className="input"
              placeholder="e.g. Delivery from Sobragui, expired batch…"
              value={adjReason}
              onChange={e => setAdjReason(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && submitAdjustment()}
              disabled={adjLoading}
            />
          </div>

        </Modal>
      )}
    </div>
  );
}
