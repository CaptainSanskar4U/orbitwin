import { useState } from "react";
import type { SimValues } from "../types";

const X0 = 518, X1 = 1494;
// y-bands inside chart (matches original skeleton)
function scale(v: number, min: number, max: number, yTop: number, yBot: number) {
  const t = Math.max(0, Math.min(1, (v - min) / (max - min || 1)));
  return yBot - t * (yBot - yTop);
}
function path(vals: number[], min: number, max: number, yTop: number, yBot: number) {
  if (!vals.length) return "";
  const n = vals.length;
  return vals.map((v, i) => {
    const x = X0 + ((X1 - X0) * i) / Math.max(1, n - 1);
    const y = scale(v, min, max, yTop, yBot).toFixed(1);
    return `${i ? "L" : "M"}${x.toFixed(1)} ${y}`;
  }).join("");
}

export function TelemetryChart({ series, live, faultActive }: { series: SimValues[]; live: SimValues | null; faultActive: boolean }) {
  const [tab, setTab] = useState(0);
  const windows = [24, 60, 120];
  const w = windows[tab];
  const data = [...series.slice(-w), ...(live ? [live] : [])].slice(-w);
  const soc = data.map((d) => d.battery_soc ?? 0);
  const solar = data.map((d) => d.solar_power ?? 0);
  const temp = data.map((d) => d.battery_temp ?? 0);
  const sig = data.map((d) => d.signal ?? 0);
  const fx = faultActive ? X0 + (X1 - X0) * 0.55 : -100;
  return (
    <section className="card tele" style={{ gridColumn: "1/3" }}>
      <h2>Telemetry History</h2>
      <div className="tabs" id="tabs">
        {["Last 5 min", "Last 30 min", "Last 1 hour"].map((t, i) => (
          <button key={t} className={tab === i ? "on" : ""} onClick={() => setTab(i)}>{t}</button>
        ))}
      </div>
      <div className="leg">
        <div style={{ top: 84 }}><i style={{ background: "#2fd16f" }}></i>Battery SoC<b>{live?.battery_soc?.toFixed(0) ?? "-"}%</b></div>
        <div style={{ top: 153 }}><i style={{ background: "#4da3ff" }}></i>Solar Power<b>{live?.solar_power?.toFixed(0) ?? "-"} W</b></div>
        <div style={{ top: 213 }}><i style={{ background: "#f5a524" }}></i>Temperature<b>{live?.battery_temp?.toFixed(0) ?? "-"} °C</b></div>
        <div style={{ top: 269 }}><i style={{ background: "#4da3ff" }}></i>Signal Strength<b>{live?.signal?.toFixed(0) ?? "-"}%</b></div>
        <u style={{ top: 122 }}></u><u style={{ top: 184 }}></u><u style={{ top: 242 }}></u>
      </div>
      <div className="chart">
        <svg viewBox="480 440 1030 280" fontFamily="Inter,sans-serif" fontSize="9" fill="#a0aab3">
          <rect x="518" y="470" width="976" height="217" fill="#01080e" stroke="#0c141b" />
          <rect x="518" y="564" width="976" height="123" fill="#02090f" />
          <g stroke="#0e151b"><path d="M518 491H1494M518 510H1494M518 535H1494M518 555H1494M518 583H1494M518 600H1494M518 620H1494M518 636H1494M518 650H1494M518 668H1494" /></g>
          <g stroke="#0d1319"><path d="M532 470V687M704 470V687M876 470V687M1231 470V687M1404 470V687" /></g>
          <g stroke="#141b22"><path d="M518 560H1494M518 614H1494M518 662H1494" /></g>
          <g textAnchor="end">
            <text x="506" y="476">100%</text><text x="506" y="494">80%</text><text x="506" y="513">60%</text>
            <text x="506" y="538">40%</text><text x="506" y="558">20%</text><text x="506" y="571">80W</text>
            <text x="506" y="586">40W</text><text x="506" y="603">20W</text><text x="506" y="623">60°C</text>
            <text x="506" y="639">40°C</text><text x="506" y="653">20°C</text><text x="506" y="671">100%</text><text x="506" y="690">0%</text>
          </g>
          <g fill="none" strokeWidth="1.4" strokeLinejoin="round">
            <path stroke="#2fa86f" d={path(soc, 0, 100, 470, 560)} />
            <path stroke="#5aa9ee" d={path(solar, 0, 80, 564, 614)} />
            <path stroke="#f0b04a" d={path(temp, 0, 80, 614, 662)} />
            <path stroke="#7fb0ea" d={path(sig, 0, 100, 662, 687)} />
          </g>
          {faultActive && (<>
            <line x1={fx} y1="465" x2={fx} y2="687" stroke="#e5242b" strokeDasharray="2 2" />
            <rect x={fx - 36} y="444" width="82" height="20" rx="2" fill="#d01f26" />
            <text x={fx + 5} y="459" fill="#fff" fontSize="11" textAnchor="middle">Fault Injected</text>
          </>)}
        </svg>
      </div>
    </section>
  );
}
