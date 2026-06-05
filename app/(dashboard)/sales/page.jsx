'use client';
import { useState, useEffect } from 'react';
import { useApp } from '@/context/AppContext';
import Icon from '@/components/Icon';
import Drawer from '@/components/Drawer';
import { fmt } from '@/lib/fmt';
import * as api from '@/lib/api';

export default function SalesPage() {
  const { state } = useApp();
  const [query, setQuery] = useState('');
  const [filter, setFilter] = useState('all');
  const [viewing, setViewing] = useState(null);
  const [viewingDetail, setViewingDetail] = useState(null);
  const [loadingDetail, setLoadingDetail] = useState(false);

  useEffect(() => {
    if (!viewing) {
      setViewingDetail(null);
      return;
    }
    (async () => {
      setLoadingDetail(true);
      try {
        const data = await api.getSaleById(viewing.saleId || viewing.id);
        setViewingDetail(data);
      } catch (err) {
        console.error('Failed to load sale details:', err);
      } finally {
        setLoadingDetail(false);
      }
    })();
  }, [viewing]);

  const filtered = state.sales.filter(s => {
    if (filter === 'refunded' && !s.status.includes('efund')) return false;
    if (filter === 'completed' && s.status !== 'Completed') return false;
    if (query && !s.id.toLowerCase().includes(query.toLowerCase()) && !s.cashier.toLowerCase().includes(query.toLowerCase())) return false;
    return true;
  });

  const total = state.sales.filter(s => s.status !== 'Refunded').reduce((a, b) => a + b.total, 0);
  const refundedCount = state.sales.filter(s => s.status.includes('efund')).length;

  return (
    <div>
      <div className="page-head">
        <div>
          <h1 className="page-title">Sales Oversight</h1>
          <p className="page-sub">Read-only view of all completed sales · adjustments via refund/return only</p>
        </div>
        <div className="page-actions">
          <button className="btn"><Icon name="download" />Export</button>
        </div>
      </div>

      <div className="stat-grid">
        <div className="stat"><div className="stat-label"><Icon name="receipt" />Sales today</div><div className="stat-value">{state.sales.length}</div></div>
        <div className="stat"><div className="stat-label"><Icon name="dollar" />Revenue today</div><div className="stat-value">{fmt(total)}</div></div>
        <div className="stat"><div className="stat-label"><Icon name="refresh" />Refunds</div><div className="stat-value">{refundedCount}</div></div>
        <div className="stat"><div className="stat-label"><Icon name="users" />Active cashiers</div><div className="stat-value">3</div></div>
      </div>

      <div className="card">
        <div className="toolbar">
          <div className="search"><Icon name="search" /><input className="input" placeholder="Search by sale ID or cashier…" value={query} onChange={e => setQuery(e.target.value)} /></div>
          <div className="segmented">
            <button className={filter === 'all' ? 'active' : ''} onClick={() => setFilter('all')}>All</button>
            <button className={filter === 'completed' ? 'active' : ''} onClick={() => setFilter('completed')}>Completed</button>
            <button className={filter === 'refunded' ? 'active' : ''} onClick={() => setFilter('refunded')}>Refunds</button>
          </div>
          <div className="spacer" />
          <button className="btn sm"><Icon name="filter" />Filters</button>
        </div>
        <div className="card-body flush" style={{ overflowX: 'auto' }}>
          <table className="table">
            <thead><tr><th>Sale ID</th><th>Time</th><th>Cashier</th><th>Branch</th><th>Payment</th><th className="num">Items</th><th className="num">Total</th><th>Status</th></tr></thead>
            <tbody>
              {filtered.map(s => (
                <tr key={s.id} className="clickable" onClick={() => setViewing(s)}>
                  <td className="mono font-semibold">{s.id}</td>
                  <td className="mono text-xs">{s.time}</td>
                  <td>{s.cashier}</td>
                  <td>{s.branch}</td>
                  <td>{s.payment}</td>
                  <td className="num mono">{s.items}</td>
                  <td className="num mono font-semibold">{fmt(s.total)}</td>
                  <td>
                    {s.status === 'Completed' ? <span className="badge success"><span className="badge-dot" />Completed</span>
                      : s.status === 'Refunded' ? <span className="badge danger"><span className="badge-dot" />Refunded</span>
                      : <span className="badge warning"><span className="badge-dot" />Partial refund</span>}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {viewing && (
        <Drawer title={`Sale ${viewing.id}`} onClose={() => setViewing(null)}
          footer={<><button className="btn" onClick={() => setViewing(null)}>Close</button><div style={{ flex: 1 }} /><button className="btn"><Icon name="printer" />Reprint</button><button className="btn danger">Issue refund</button></>}>
          <div className="mb-4">
            {viewing.status === 'Completed' ? <span className="badge success"><span className="badge-dot" />Completed</span>
              : <span className="badge danger"><span className="badge-dot" />{viewing.status}</span>}
          </div>
          <div className="detail-row"><div className="k">Sale ID</div><div className="v mono">{viewing.id}</div></div>
          <div className="detail-row"><div className="k">Time</div><div className="v mono">{viewing.time}</div></div>
          <div className="detail-row"><div className="k">Cashier</div><div className="v">{viewing.cashier}</div></div>
          <div className="detail-row"><div className="k">Branch</div><div className="v">{viewing.branch}</div></div>
          <div className="detail-row"><div className="k">Payment</div><div className="v">{viewing.payment}</div></div>

          <div className="card mt-4">
            <div className="card-header"><div className="card-title">Items</div></div>
            <div className="card-body flush">
              {loadingDetail ? (
                <div className="py-4 text-center text-muted">Loading items...</div>
              ) : viewingDetail?.saleItems?.length > 0 ? (
                <table className="table">
                  <tbody>
                    {viewingDetail.saleItems.map((item, i) => (
                      <tr key={i}>
                        <td>
                          <div className="font-semibold">{item.product?.name || 'Unknown Item'}</div>
                          <div className="text-xs text-subtle mono">{item.product?.sku || '—'}</div>
                        </td>
                        <td className="num mono">×{item.quantity}</td>
                        <td className="num mono font-semibold">{fmt(Number(item.totalPrice))}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              ) : (
                <div className="py-4 text-center text-muted">No items found</div>
              )}
            </div>
            <div style={{ padding: 16, display: 'flex', justifyContent: 'space-between', borderTop: '1px solid var(--border)' }}>
              <div className="font-semibold">Total</div>
              <div className="mono font-semibold" style={{ fontSize: 16 }}>{fmt(viewing.total)}</div>
            </div>
          </div>

          <div style={{ padding: 12, background: 'var(--info-subtle)', color: 'var(--info)', borderRadius: 8, marginTop: 16, display: 'flex', gap: 10 }}>
            <Icon name="shield" size={14} />
            <div className="text-xs">Sales cannot be edited directly. Use refund or return to adjust this transaction — all changes are logged to the audit trail.</div>
          </div>
        </Drawer>
      )}
    </div>
  );
}
