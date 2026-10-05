import type { Analysis } from "../types";
import { codeOf } from "../data/codes";

export function FailureAnalysis({ a }: { a: Analysis }) {
  const chain = a.chain ?? [
    { node: "Battery", detail: "↓ 42%" }, { node: "Voltage", detail: "↓ 18%" },
    { node: "Heaters", detail: "↑ 6°C" }, { node: "Temperature", detail: "↑ 21°C" },
  ];
  const affected = a.affected ?? ["Power", "Thermal", "Communication"];
  const sev = a.severity ?? "HIGH";
  return (
    <section className="card fa">
      <div className="ti" style={{ left: 19 }}>
        <svg viewBox="0 0 24 24"><path d="M12 3l10 18H2z" /><path d="M12 10v5M12 18v.4" /></svg>
        Failure Analysis
      </div>
      <div className="hl"></div>
      <div className="rc"><div className="bg">!</div>
        <div><p>Root Cause</p><small>{a.root_cause ?? "Battery degradation due to excessive load."}</small></div>
      </div>
      <div className="pcl">
        <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="#cfd6dc" strokeWidth="1.4" strokeLinecap="round"><path d="M10 14a4 4 0 005.7 0l3-3a4 4 0 00-5.7-5.7l-1 1M14 10a4 4 0 00-5.7 0l-3 3a4 4 0 005.7 5.7l1-1" /></svg>
        Propagation Chain
      </div>
      <div className="ch">
        {chain.slice(0, 4).map((c, i) => (
          <span key={c.node} style={{ display: "contents" }}>
            {i > 0 && <span className="ar">→</span>}
            <div className="b">{c.node}<b>{c.detail}</b></div>
          </span>
        ))}
      </div>
      <div className="hl2"></div>
      <div className="as">Affected Subsystems</div>
      <div className="sr">
        {affected.slice(0, 3).map((s) => (
          <span key={s}><i className="ic" style={{ background: sev === "CRITICAL" ? "#e5242b" : "#b8651f" }}>
            <svg viewBox="0 0 24 24"><path d="M13 3L5 14h6l-1 7 8-11h-6z" /></svg></i>{s} · {codeOf(s)}</span>
        ))}
      </div>
      <div className="vd"></div>
      <div className="sv">Severity<b>{sev}</b></div>
    </section>
  );
}
