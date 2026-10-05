import type { SimValues } from "../types";

export function LiveState({ v, onDetail }: { v: SimValues | null; onDetail: () => void }) {
  const h = v?.health ?? 78;
  const dash = `${(264 * h / 100).toFixed(0)} 264`;
  const rows: [string, string][] = [
    ["Power", `${fmt(v?.power)}%`],
    ["Battery SoC", `${fmt(v?.battery_soc)}%`],
    ["Solar Power", `${fmt(v?.solar_power)} W`],
    ["Battery Temp", `${fmt(v?.battery_temp)} °C`],
    ["CPU Temp", `${fmt(v?.cpu_temp)} °C`],
    ["Signal Strength", `${fmt(v?.signal)}%`],
    ["Data Rate", `${fmt(v?.data_rate)} Mbps`],
  ];
  return (
    <section className="card live">
      <h2>Live State</h2><span className="dv" onClick={onDetail}>Detailed View →</span>
      <div className="ring">
        <svg width="92" height="92" viewBox="0 0 92 92" style={{ margin: "0 auto" }}>
          <defs><linearGradient id="rg" x1="0" y1="0" x2="1" y2="1">
            <stop offset="0" stopColor="#7cc6f7" /><stop offset="1" stopColor="#3f95dd" />
          </linearGradient></defs>
          <circle cx="46" cy="46" r="42" fill="none" stroke="#14202c" strokeWidth="3" />
          <circle cx="46" cy="46" r="42" fill="none" stroke="url(#rg)" strokeWidth="3"
            strokeLinecap="round" strokeDasharray={dash} transform="rotate(-80 46 46)" />
          <text x="46" y="53" textAnchor="middle" fill="#fff" fontSize="19" fontFamily="Inter,sans-serif">{h.toFixed(0)}%</text>
        </svg>
        <p>Overall Health</p>
      </div>
      <div className="rows">{rows.map(([k, val]) => <div key={k}><span>{k}</span><span>{val}</span></div>)}</div>
    </section>
  );
}
function fmt(n: number | undefined) { return n === undefined || n === null ? "-" : (+n.toFixed(1)).toString(); }
