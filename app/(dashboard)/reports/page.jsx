'use client';
import { useState, useEffect, useMemo } from 'react';
import { useApp } from '@/context/AppContext';
import Icon from '@/components/Icon';
import { LineChart, BarChart } from '@/components/Charts';
import { fmt } from '@/lib/fmt';
import * as api from '@/lib/api';

export default function ReportsPage() {
  const { state } = useApp();
  const [range, setRange] = useState('7d');
  const [report, setReport] = useState('sales');
  const [loading, setLoading] = useState(false);

  const [summary, setSummary]       = useState(null);
  const [dailyRev, setDailyRev]     = useState([]);
  const [topProds, setTopProds]     = useState([]);
  const [cashierPerf, setCashierPerf] = useState([]);
  const [profit, setProfit]         = useState(null);
  const [stockSummary, setStockSummary] = useState(null);

  const rangeParams = useMemo(() => {
    const days = range === '7d' ? 7 : range === '30d' ? 30 : 90;
    const from = new Date(Date.now() - days * 24 * 60 * 60 * 1000).toISOString();
    const to   = new Date().toISOString();
    return { from, to };
  }, [range]);

  useEffect(() => {
    setLoading(true);
    Promise.allSettled([
      api.getReportSalesSummary(rangeParams),
      api.getReportDailyRevenue(rangeParams),
      api.getReportTopProducts({ ...rangeParams, limit: 10 }),
      api.getReportCashierPerf(rangeParams),
      api.getReportProfit(rangeParams),
      api.getReportStockSummary(),
    ]).then(([s, dr, tp, cp, pr, st]) => {
      if (s.status  === 'fulfilled') setSummary(s.value);
      if (dr.status === 'fulfilled') setDailyRev(dr.value || []);
      if (tp.status === 'fulfilled') setTopProds(tp.value || []);
      if (cp.status === 'fulfilled') setCashierPerf(cp.value || []);
      if (pr.status === 'fulfilled') setProfit(pr.value);
      if (st.status === 'fulfilled') setStockSummary(st.value);
    }).finally(() => setLoading(false));
  }, [rangeParams]);

  const deadStock = state.products.filter(p => p.stock > p.min * 2).slice(0, 6);

  const paymentMixData = summary?.paymentMix
    ? Object.entries(summary.paymentMix).map(([k, v]) => ({
        label: { cash: 'Cash', orange_money: 'Orange Money', card: 'Card', bank_transfer: 'Transfer' }[k] || k,
        v: Number(v),
      }))
    : [];

  const chartData = dailyRev.length > 0
    ? dailyRev.map(d => ({ label: d.label, v: d.revenue }))
    : [{ label: '—', v: 0 }];

  const maxPerf = cashierPerf[0]?.totalRevenue ? Number(cashierPerf[0].totalRevenue) : 1;

  return (
    <div>
      <div className="page-head">
        <div>
          <h1 className="page-title">Reports</h1>
          <p className="page-sub">Business intelligence across sales, stock, profit and staff</p>
        </div>
        <div className="page-actions">
          <div className="segmented">
            {[['7d','7d'],['30d','30d'],['90d','90d']].map(([k,v]) => (
              <button key={k} className={range===k?'active':''} onClick={() => setRange(k)}>{v}</button>
            ))}
          </div>
          <button className="btn"><Icon name="download" />Export PDF</button>
        </div>
      </div>

      <div className="tabs">
        {[['sales','Sales'],['stock','Stock'],['profit','Profit'],['cashier','Cashier performance']].map(([k,v]) => (
          <div key={k} className={`tab${report===k?' active':''}`} onClick={() => setReport(k)}>{v}</div>
        ))}
      </div>

      {loading && (
        <div style={{ padding: '32px 0', textAlign: 'center', color: 'var(--text-muted)', fontSize: 14 }}>
          Loading data…
        </div>
      )}

      {!loading && report === 'sales' && (
        <>
          <div className="stat-grid">
            <div className="stat">
              <div className="stat-label">Total revenue</div>
              <div className="stat-value">{fmt(summary?.totalRevenue ?? 0)}</div>
              <div className="stat-delta">{range}</div>
            </div>
            <div className="stat">
              <div className="stat-label">Orders</div>
              <div className="stat-value">{summary?.transactionCount ?? 0}</div>
              <div className="stat-delta up"><Icon name="arrowUp" size={10} />{range}</div>
            </div>
            <div className="stat">
              <div className="stat-label">Avg ticket</div>
              <div className="stat-value">
                {summary?.transactionCount > 0
                  ? fmt(Math.round(summary.totalRevenue / summary.transactionCount))
                  : '—'}
              </div>
            </div>
            <div className="stat">
              <div className="stat-label">Total discounts</div>
              <div className="stat-value">{fmt(summary?.totalDiscount ?? 0)}</div>
              <div className="stat-delta">{summary?.totalRevenue > 0 ? `${((summary.totalDiscount / summary.totalRevenue) * 100).toFixed(1)}% of revenue` : '—'}</div>
            </div>
          </div>
          <div className="card mb-4">
            <div className="card-header"><div className="card-title">Daily revenue</div></div>
            <div className="card-body"><LineChart data={chartData} /></div>
          </div>
          <div className="grid-2">
            <div className="card">
              <div className="card-header"><div className="card-title">Best sellers (by revenue)</div></div>
              <div className="card-body flush">
                {topProds.length === 0 ? (
                  <div style={{ padding: '24px 16px', textAlign: 'center', color: 'var(--text-muted)', fontSize: 13 }}>No data</div>
                ) : (
                  <table className="table">
                    <thead><tr><th>Product</th><th className="num">Sold</th><th className="num">Revenue</th></tr></thead>
                    <tbody>
                      {topProds.map(p => (
                        <tr key={p.product?.id}>
                          <td className="font-semibold">{p.product?.name || '—'}</td>
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
              <div className="card-header"><div className="card-title">Payment mix</div></div>
              <div className="card-body">
                {paymentMixData.length > 0
                  ? <BarChart data={paymentMixData} />
                  : <div style={{ color: 'var(--text-muted)', fontSize: 13 }}>No payment data</div>}
              </div>
            </div>
          </div>
        </>
      )}

      {!loading && report === 'stock' && (
        <>
          {stockSummary && (
            <div className="stat-grid">
              <div className="stat"><div className="stat-label">Total SKUs</div><div className="stat-value">{stockSummary.totalSkus}</div></div>
              <div className="stat"><div className="stat-label">Total units</div><div className="stat-value">{stockSummary.totalUnits}</div></div>
              <div className="stat">
                <div className="stat-label">Low stock</div>
                <div className="stat-value" style={{ color: 'var(--warning)' }}>{stockSummary.lowStockCount}</div>
              </div>
              <div className="stat">
                <div className="stat-label">Out of stock</div>
                <div className="stat-value" style={{ color: stockSummary.outOfStockCount > 0 ? 'var(--danger)' : 'var(--text)' }}>{stockSummary.outOfStockCount}</div>
              </div>
            </div>
          )}
          <div className="card">
            <div className="card-header"><div className="card-title">Dead stock (high inventory, low reorder)</div></div>
            <div className="card-body flush">
              {deadStock.length === 0 ? (
                <div style={{ padding: '24px 16px', textAlign: 'center', color: 'var(--text-muted)', fontSize: 13 }}>No overstocked products</div>
              ) : (
                <table className="table">
                  <thead><tr><th>Product</th><th className="num">On hand</th><th className="num">Reorder level</th><th className="num">Capital tied</th></tr></thead>
                  <tbody>
                    {deadStock.map(p => (
                      <tr key={p.sku}>
                        <td><div className="font-semibold">{p.name}</div><div className="text-xs text-subtle mono">{p.sku}</div></td>
                        <td className="num mono">{p.stock}</td>
                        <td className="num mono">{p.min}</td>
                        <td className="num mono font-semibold" style={{ color: 'var(--warning)' }}>{fmt(p.stock * p.cost)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>
          </div>
        </>
      )}

      {!loading && report === 'profit' && (
        <>
          <div className="stat-grid">
            <div className="stat"><div className="stat-label">Revenue</div><div className="stat-value">{fmt(profit?.revenue ?? 0)}</div></div>
            <div className="stat"><div className="stat-label">Cost of goods</div><div className="stat-value">{fmt(profit?.cost ?? 0)}</div></div>
            <div className="stat">
              <div className="stat-label">Gross profit</div>
              <div className="stat-value" style={{ color: 'var(--success)' }}>{fmt(profit?.grossProfit ?? 0)}</div>
            </div>
            <div className="stat">
              <div className="stat-label">Margin</div>
              <div className="stat-value">{profit?.margin != null ? `${profit.margin.toFixed(1)}%` : '—'}</div>
            </div>
          </div>
          <div className="card">
            <div className="card-body">
              <div className="text-sm text-muted mb-3">Profit is estimated from cost price vs selling price on each unit sold.</div>
              <LineChart data={chartData.map(d => ({ label: d.label, v: profit?.margin ? Math.round(d.v * profit.margin / 100) : 0 }))} color="#16a34a" />
            </div>
          </div>
        </>
      )}

      {!loading && report === 'cashier' && (
        <div className="card">
          <div className="card-body flush">
            {cashierPerf.length === 0 ? (
              <div style={{ padding: '24px 16px', textAlign: 'center', color: 'var(--text-muted)', fontSize: 13 }}>No cashier data for this period</div>
            ) : (
              <table className="table">
                <thead><tr><th>Cashier</th><th className="num">Sales</th><th className="num">Revenue</th><th className="num">Avg ticket</th><th>Performance</th></tr></thead>
                <tbody>
                  {cashierPerf.map(c => {
                    const rev = Number(c.totalRevenue);
                    const pct = maxPerf > 0 ? (rev / maxPerf) * 100 : 0;
                    const avg = c.transactionCount > 0 ? Math.round(rev / c.transactionCount) : 0;
                    return (
                      <tr key={c.cashier?.id}>
                        <td className="font-semibold">{c.cashier?.fullName || '—'}</td>
                        <td className="num mono">{c.transactionCount}</td>
                        <td className="num mono font-semibold">{fmt(rev)}</td>
                        <td className="num mono">{fmt(avg)}</td>
                        <td style={{ width: 200 }}><div className="progress"><div className="progress-bar" style={{ width: pct + '%' }} /></div></td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
