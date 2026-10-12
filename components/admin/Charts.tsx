"use client";

/* Lightweight SVG charts for the analytics dashboard — no dependencies. */

export function AreaChart({
  data,
  height = 180,
  color = "#f97316",
}: {
  data: { label: string; value: number }[];
  height?: number;
  color?: string;
}) {
  const W = 600;
  const H = height;
  const PAD = 8;
  const max = Math.max(1, ...data.map((d) => d.value));
  const stepX = data.length > 1 ? (W - PAD * 2) / (data.length - 1) : 0;

  const pts = data.map((d, i) => ({
    x: PAD + i * stepX,
    y: H - PAD - (d.value / max) * (H - PAD * 2),
  }));

  const line = pts.map((p, i) => `${i === 0 ? "M" : "L"}${p.x.toFixed(1)},${p.y.toFixed(1)}`).join(" ");
  const area = `${line} L${(PAD + (data.length - 1) * stepX).toFixed(1)},${H - PAD} L${PAD},${H - PAD} Z`;
  const gid = `ag${color.replace("#", "")}`;

  // X labels: show ~6 evenly
  const labelIdx = new Set(
    data.map((_, i) => Math.round((i / Math.max(1, data.length - 1)) * 5)).map((g) =>
      Math.round((g / 5) * (data.length - 1))
    )
  );

  return (
    <svg viewBox={`0 0 ${W} ${H + 18}`} className="w-full" role="img" aria-label="Revenue chart">
      <defs>
        <linearGradient id={gid} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={color} stopOpacity="0.35" />
          <stop offset="100%" stopColor={color} stopOpacity="0.02" />
        </linearGradient>
      </defs>
      {/* gridlines */}
      {[0.25, 0.5, 0.75].map((f) => (
        <line
          key={f}
          x1={PAD}
          x2={W - PAD}
          y1={H - PAD - f * (H - PAD * 2)}
          y2={H - PAD - f * (H - PAD * 2)}
          stroke="#f1f5f9"
          strokeWidth="1"
        />
      ))}
      <path d={area} fill={`url(#${gid})`} />
      <path d={line} fill="none" stroke={color} strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
      {pts.map((p, i) =>
        data[i].value > 0 ? (
          <circle key={i} cx={p.x} cy={p.y} r="3" fill={color} stroke="#fff" strokeWidth="1.5" />
        ) : null
      )}
      {[...labelIdx].map((i) => (
        <text
          key={i}
          x={PAD + i * stepX}
          y={H + 14}
          textAnchor="middle"
          className="fill-zinc-400"
          fontSize="10"
        >
          {data[i]?.label}
        </text>
      ))}
    </svg>
  );
}

export function BarChart({
  data,
  height = 160,
  color = "#8b5cf6",
}: {
  data: { label: string; value: number }[];
  height?: number;
  color?: string;
}) {
  const W = 600;
  const H = height;
  const max = Math.max(1, ...data.map((d) => d.value));
  const gap = 6;
  const bw = (W - gap * (data.length + 1)) / data.length;

  return (
    <svg viewBox={`0 0 ${W} ${H + 18}`} className="w-full" role="img" aria-label="Orders chart">
      {data.map((d, i) => {
        const bh = Math.max(2, (d.value / max) * (H - 10));
        const x = gap + i * (bw + gap);
        return (
          <g key={i}>
            <rect
              x={x}
              y={H - bh}
              width={bw}
              height={bh}
              rx={Math.min(5, bw / 3)}
              fill={d.value > 0 ? color : "#f1f5f9"}
              opacity={d.value > 0 ? 0.9 : 1}
            >
              <title>{`${d.label}: ${d.value}`}</title>
            </rect>
            {i % Math.ceil(data.length / 7) === 0 && (
              <text x={x + bw / 2} y={H + 14} textAnchor="middle" className="fill-zinc-400" fontSize="10">
                {d.label}
              </text>
            )}
          </g>
        );
      })}
    </svg>
  );
}

export function DonutChart({
  data,
  size = 170,
}: {
  data: { label: string; value: number; color: string }[];
  size?: number;
}) {
  const total = data.reduce((s, d) => s + d.value, 0) || 1;
  const R = 60;
  const C = 2 * Math.PI * R;
  let acc = 0;

  return (
    <div className="flex items-center gap-5">
      <svg width={size} height={size} viewBox="0 0 160 160" role="img" aria-label="Category chart">
        <circle cx="80" cy="80" r={R} fill="none" stroke="#f1f5f9" strokeWidth="22" />
        {data.map((d, i) => {
          const frac = d.value / total;
          const dash = frac * C;
          const off = -acc * C;
          acc += frac;
          return (
            <circle
              key={i}
              cx="80"
              cy="80"
              r={R}
              fill="none"
              stroke={d.color}
              strokeWidth="22"
              strokeDasharray={`${dash} ${C - dash}`}
              strokeDashoffset={off}
              transform="rotate(-90 80 80)"
              strokeLinecap="butt"
            >
              <title>{`${d.label}: ${d.value}`}</title>
            </circle>
          );
        })}
        <text x="80" y="76" textAnchor="middle" fontSize="20" fontWeight="800" className="fill-zinc-800">
          {total}
        </text>
        <text x="80" y="94" textAnchor="middle" fontSize="10" className="fill-zinc-400">
          orders
        </text>
      </svg>
      <ul className="space-y-1.5 text-xs">
        {data.map((d, i) => (
          <li key={i} className="flex items-center gap-2">
            <span className="h-2.5 w-2.5 rounded-full" style={{ background: d.color }} />
            <span className="font-medium text-zinc-600">{d.label}</span>
            <span className="font-bold text-zinc-800">{d.value}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}
