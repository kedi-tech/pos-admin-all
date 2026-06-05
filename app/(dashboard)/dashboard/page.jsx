'use client';
import { useState, useEffect } from 'react';
import { useApp } from '@/context/AppContext';
import Icon from '@/components/Icon';
import { LineChart, BarChart } from '@/components/Charts';
import { fmt } from '@/lib/fmt';
import * as api from '@/lib/api';

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

const ACT_COLOR = {
  stock_in: 'accent', stock_out: 'success', return_in: 'warning',
  damaged_out: 'danger', adjustment: '',
};

function actLabel(m) {
  const qty = m.qty > 0 ? `+${m.qty}` : String(m.qty);
  if (m.type === 'stock_in')    return `Stock reçu · ${qty} ${m.product}`;
  if (m.type === 'stock_out')   return `Vente · ${qty} ${m.product}`;
  if (m.type === 'return_in')   return `Retour · ${qty} ${m.product}`;
  if (m.type === 'damaged_out') return `Dommages · ${qty} ${m.product}`;
  if (m.type === 'adjustment')  return `Ajustement · ${qty} ${m.product}`;
  return `${m.type} · ${m.product}`;
}

export default function DashboardPage() {
  const { state } = useApp();
  const { products, sales, users, movements, branches } = state;
  const [topProducts, setTopProducts] = useState([]);

  useEffect(() => {
    const todayStart = new Date(); todayStart.setHours(0, 0, 0, 0);
    const todayEnd   = new Date(); todayEnd.setHours(23, 59, 59, 999);
    api.getReportTopProducts({ limit: 5, from: todayStart.toISOString(), to: todayEnd.toISOString() })
      .then(data => setTopProducts(Array.isArray(data) ? data : []))
      .catch(() => {});
  }, []);

  const todayStr = new Date().toISOString().slice(0, 10);
  const todaySales = sales.filter(s => s.time.startsWith(todayStr) && s.status !== 'Cancelled');
  const todayRevenue = todaySales.reduce((a, b) => a + b.total, 0);

  const last7 = Array.from({ length: 7 }, (_, i) => {
    const d = new Date();
    d.setDate(d.getDate() - (6 - i));
    const dateStr = d.toISOString().slice(0, 10);
    const lbl = d.toLocaleDateString('fr-FR', { weekday: 'short' });
    const v = sales
      .filter(s => s.time.startsWith(dateStr) && s.status !== 'Cancelled')
      .reduce((acc, s) => acc + s.total, 0);
    return { label: lbl.charAt(0).toUpperCase() + lbl.slice(1, 3), v };
  });

  const branchSales = branches.map(b => ({
    label: b.name.split(' ')[0],
    v: todaySales.filter(s => s.branch === b.id).reduce((a, s) => a + s.total, 0),
  }));

  const lowStock = products.filter(p => p.stock < p.min).slice(0, 6);

  const now = new Date();
  const dateLabel = now.toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' });

  return (
    <div>
      <div className="page-head">
        <div>
          <h1 className="page-title">Dashboard</h1>
          <p className="page-sub">Today · {dateLabel} · All branches</p>
        </div>
        <div className="page-actions">
          <button className="btn" onClick={() => downloadCsv(
            `dashboard-${new Date().toISOString().slice(0,10)}.csv`,
            ['Date', 'Revenue', 'Transactions'],
            last7.map(d => [d.label, d.v, todaySales.length]),
          )}><Icon name="download" />Export</button>
        </div>
      </div>

      <div className="stat-grid">
        <div className="stat">
          <div className="stat-label"><Icon name="dollar" />Revenue today</div>
          <div className="stat-value">{fmt(todayRevenue)}</div>
          <div className="stat-delta">{todaySales.length} transactions</div>
        </div>
        <div className="stat">
          <div className="stat-label"><Icon name="receipt" />Sales today</div>
          <div className="stat-value">{todaySales.length}</div>
          <div className="stat-delta">{sales.length} loaded total</div>
        </div>
        <div className="stat">
          <div className="stat-label"><Icon name="package" />SKUs in catalog</div>
          <div className="stat-value">{products.length}</div>
          <div className="stat-delta">{products.filter(p => p.internal).length} with internal barcode</div>
        </div>
        <div className="stat">
          <div className="stat-label"><Icon name="alert" />Low stock</div>
          <div className="stat-value" style={{ color: lowStock.length > 3 ? 'var(--danger)' : 'var(--text)' }}>
            {lowStock.length}
          </div>
          <div className="stat-delta down">Needs attention</div>
        </div>
      </div>

      <div className="grid-2 mb-4">
        <div className="card">
          <div className="card-header">
            <div>
              <div className="card-title">Revenue, last 7 days</div>
              <div className="card-sub">All branches combined</div>
            </div>
          </div>
          <div className="card-body"><LineChart data={last7} /></div>
        </div>
        <div className="card">
          <div className="card-header">
            <div className="card-title">Sales by branch</div>
            <div style={{ marginLeft: 'auto' }} className="text-xs text-muted">Today</div>
          </div>
          <div className="card-body">
            <BarChart data={branchSales.length > 0 ? branchSales : [{ label: '—', v: 0 }]} />
          </div>
        </div>
      </div>

      <div className="grid-2">
        <div className="card">
          <div className="card-header">
            <div className="card-title">Top products today</div>
            <a href="/products" className="btn sm ghost" style={{ marginLeft: 'auto' }}>View all<Icon name="chevronRight" size={12} /></a>
          </div>
          <div className="card-body flush">
            {topProducts.length === 0 ? (
              <div style={{ padding: '24px 16px', textAlign: 'center', color: 'var(--text-muted)', fontSize: 13 }}>
                No sales data yet
              </div>
            ) : (
              <table className="table">
                <thead><tr><th>Product</th><th className="num">Sold</th><th className="num">Revenue</th></tr></thead>
                <tbody>
                  {topProducts.map(p => (
                    <tr key={p.product?.id || p.productId}>
                      <td>
                        <div className="font-semibold">{p.product?.name || '—'}</div>
                        <div className="text-xs text-subtle mono">{p.product?.sku || '—'}</div>
                      </td>
                      <td className="num mono">{p.quantitySold}</td>
                      <td className="num mono font-semibold">{fmt(Number(p.revenue))}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </div>
        <div className="card">
          <div className="card-header">
            <div className="card-title">Low stock alerts</div>
            <span className="badge danger" style={{ marginLeft: 8 }}>{lowStock.length}</span>
            <a href="/inventory" className="btn sm ghost" style={{ marginLeft: 'auto' }}>Inventory<Icon name="chevronRight" size={12} /></a>
          </div>
          <div className="card-body flush">
            {lowStock.length === 0 ? (
              <div style={{ padding: '24px 16px', textAlign: 'center', color: 'var(--text-muted)', fontSize: 13 }}>
                All products sufficiently stocked
              </div>
            ) : (
              <table className="table">
                <thead><tr><th>Product</th><th className="num">Stock</th><th className="num">Min</th><th></th></tr></thead>
                <tbody>
                  {lowStock.map(p => {
                    const pct = p.min > 0 ? Math.min(100, (p.stock / p.min) * 100) : 0;
                    return (
                      <tr key={p.sku}>
                        <td><div className="font-semibold">{p.name}</div><div className="text-xs text-subtle mono">{p.sku}</div></td>
                        <td className="num mono font-semibold" style={{ color: p.stock === 0 ? 'var(--danger)' : 'var(--warning)' }}>{p.stock}</td>
                        <td className="num mono text-muted">{p.min}</td>
                        <td style={{ width: 80 }}><div className="progress"><div className={`progress-bar ${p.stock === 0 ? 'danger' : 'warning'}`} style={{ width: pct + '%' }} /></div></td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            )}
          </div>
        </div>
      </div>

      <div className="grid-2 mt-4">
        <div className="card">
          <div className="card-header"><div className="card-title">Recent activity</div></div>
          <div className="card-body">
            {movements.length === 0 ? (
              <div style={{ color: 'var(--text-muted)', fontSize: 13 }}>No recent activity</div>
            ) : (
              <div className="timeline">
                {movements.slice(0, 6).map(m => (
                  <div key={m.id} className={`timeline-item ${ACT_COLOR[m.type] || ''}`}>
                    <div className="timeline-title">{actLabel(m)}</div>
                    <div className="timeline-meta">{m.by} · {m.time}</div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
        <div className="card">
          <div className="card-header"><div className="card-title">Active staff</div></div>
          <div className="card-body" style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            {users.filter(u => u.active).slice(0, 5).map(u => (
              <div key={u.id} className="row" style={{ padding: '6px 0', borderBottom: '1px solid var(--border)' }}>
                <div className="avatar">{u.name.split(' ').map(x => x[0]).join('').slice(0, 2)}</div>
                <div style={{ flex: 1 }}>
                  <div className="font-semibold">{u.name}</div>
                  <div className="text-xs text-muted">{u.role} · {u.branch}</div>
                </div>
                <span className="badge success"><span className="badge-dot" />Active</span>
              </div>
            ))}
            {users.filter(u => u.active).length === 0 && (
              <div style={{ color: 'var(--text-muted)', fontSize: 13 }}>No active staff</div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
