import { useEffect, useState } from "react";

export function Header({ phase, connected }: { phase: string; connected: boolean }) {
  const [now, setNow] = useState("");
  useEffect(() => {
    const f = () => {
      const d = new Date();
      const p = (n: number) => String(n).padStart(2, "0");
      setNow(`${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}  ${p(d.getHours())}:${p(d.getMinutes())}:${p(d.getSeconds())}`);
    };
    f();
    const t = window.setInterval(f, 1000);
    return () => window.clearInterval(t);
  }, []);
  return (
    <header>
      <div className="logo">
        <svg width="26" height="28" viewBox="0 0 26 28" fill="none" stroke="#fff" strokeWidth="1.5" strokeLinejoin="round"><path d="M13 2l10 5.5v12L13 26 3 19.5v-12z" /><path d="M13 13l10-5.5M13 13L3 7.5M13 13v13" /></svg>
        Orbitwin
      </div>
      <div className="vl"></div>
      <div className="sub">DIGITAL TWIN<i>·</i>SATELLITE OPERATIONS</div>
      <div className="hr">
        <span className="m">MISSION: <b>ORBITER-01</b></span>
        <span className="sim"><span className="dot" style={{ background: connected ? "#2fd16f" : "#e5242b" }}></span>{phase === "NOMINAL" ? "SIMULATION ACTIVE" : phase}</span>
        <span className="clk">{now}</span>
        <svg className="av" width="23" height="23" viewBox="0 0 24 24" fill="none" stroke="#9aa4ad" strokeWidth="1.3"><circle cx="12" cy="12" r="10.5" /><circle cx="12" cy="10" r="3.2" /><path d="M5.5 19c1.6-3 4.2-3.8 6.5-3.8s4.9.8 6.5 3.8" /></svg>
      </div>
    </header>
  );
}
