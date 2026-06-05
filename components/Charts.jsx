export function Sparkline({ data, color = 'var(--accent)', width = 60, height = 20 }) {
  if (!data || data.length === 0) return <svg width={width} height={height} />;
  const max = Math.max(...data), min = Math.min(...data), range = max - min || 1;
  const pts = data.map((v, i) => {
    const x = (i / Math.max(1, data.length - 1)) * width;
    const y = height - ((v - min) / range) * height;
    return `${x},${y}`;
  }).join(' ');
  return (
    <svg width={width} height={height} className="spark">
      <polyline points={pts} fill="none" stroke={color} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

export function LineChart({ data, color = 'var(--accent)', height = 200 }) {
  const w = 800, h = height, pad = { t: 16, r: 16, b: 28, l: 40 };
  const values = data?.map(d => d.v) || [];
  const max = values.length > 0 ? Math.max(...values, 100) * 1.1 : 100;
  const xStep = data?.length > 1 ? (w - pad.l - pad.r) / (data.length - 1) : 0;
  const yScale = v => {
    const val = h - pad.b - (v / max) * (h - pad.t - pad.b);
    return isNaN(val) ? h - pad.b : val;
  };
  
  const pointsArray = data?.map((d, i) => `${pad.l + i * xStep},${yScale(d.v)}`) || [];
  const pts = pointsArray.join(' ');
  const area = pointsArray.length > 0 
    ? `M${pad.l},${h - pad.b} L${pointsArray.join(' L ')} L${pad.l + (data.length - 1) * xStep},${h - pad.b} Z`
    : '';

  return (
    <svg viewBox={`0 0 ${w} ${h}`} preserveAspectRatio="none" className="chart-svg">
      {[0, max * 0.5, max].map((t, i) => (
        <g key={i}>
          <line x1={pad.l} x2={w - pad.r} y1={yScale(t)} y2={yScale(t)} stroke="var(--border)" strokeDasharray="3 3" />
          <text x={pad.l - 6} y={yScale(t) + 3} textAnchor="end" fontSize="10" fill="var(--text-subtle)">{t >= 1e6 ? (t/1e6).toFixed(1)+'M' : t >= 1000 ? Math.round(t/1000)+'k' : Math.round(t)}</text>
        </g>
      ))}
      {area && <path d={area} fill={color} opacity="0.1" />}
      {pts && <polyline points={pts} fill="none" stroke={color} strokeWidth="2" />}
      {data?.map((d, i) => (
        <g key={i}>
          <circle cx={pad.l + i * xStep} cy={yScale(d.v)} r="2.5" fill={color} />
          <text x={pad.l + i * xStep} y={h - pad.b + 16} textAnchor="middle" fontSize="10" fill="var(--text-subtle)">{d.label}</text>
        </g>
      ))}
    </svg>
  );
}

export function BarChart({ data, color = 'var(--accent)', height = 200 }) {
  const w = 800, h = height, pad = { t: 16, r: 16, b: 40, l: 40 };
  const values = data?.map(d => d.v) || [];
  const max = values.length > 0 ? Math.max(...values, 100) * 1.1 : 100;
  const bw = data?.length > 0 ? (w - pad.l - pad.r) / data.length - 8 : 0;
  const yScale = v => {
    const val = h - pad.b - (v / max) * (h - pad.t - pad.b);
    return isNaN(val) ? h - pad.b : val;
  };

  return (
    <svg viewBox={`0 0 ${w} ${h}`} preserveAspectRatio="none" className="chart-svg">
      {[0, max * 0.5, max].map((t, i) => (
        <g key={i}>
          <line x1={pad.l} x2={w - pad.r} y1={yScale(t)} y2={yScale(t)} stroke="var(--border)" strokeDasharray="3 3" />
          <text x={pad.l - 6} y={yScale(t) + 3} textAnchor="end" fontSize="10" fill="var(--text-subtle)">{t >= 1e6 ? (t/1e6).toFixed(1)+'M' : t >= 1000 ? Math.round(t/1000)+'k' : Math.round(t)}</text>
        </g>
      ))}
      {data?.map((d, i) => {
        const x = pad.l + i * ((w - pad.l - pad.r) / data.length) + 4;
        const y = yScale(d.v);
        return (
          <g key={i}>
            <rect x={x} y={y} width={bw} height={Math.max(0, h - pad.b - y)} fill={color} rx="2" />
            <text x={x + bw / 2} y={h - pad.b + 14} textAnchor="middle" fontSize="10" fill="var(--text-subtle)">{d.label}</text>
          </g>
        );
      })}
    </svg>
  );
}
