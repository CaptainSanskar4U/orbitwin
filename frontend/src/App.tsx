import { useEffect, useRef, useState } from "react";
import "./styles/twinlab.css";
import "./styles/overrides.css";
import type { SimValues } from "./types";
import { Header } from "./components/Header";
import { Sidebar, type View } from "./components/Sidebar";
import { TwinCard } from "./components/TwinCard";
import { LiveState } from "./components/LiveState";
import { TelemetryChart } from "./components/TelemetryChart";
import { FailureAnalysis } from "./components/FailureAnalysis";
import { AIInsightPanel } from "./components/AIInsightPanel";
import { ConnectSatellite } from "./components/ConnectSatellite";
import { SatelliteOverview } from "./components/SatelliteOverview";
import { LandingPage } from "./components/LandingPage";
import { useTwinLab } from "./hooks/useTwinLab";
import { api } from "./services/api";
import { demoFaultList } from "./services/offline";

function initialView(): View {
  try {
    const q = new URLSearchParams(window.location.search).get("view");
    if (q === "fault" || q === "home" || q === "telemetry" || q === "events" || q === "reports" || q === "settings") return q;
    if (window.sessionStorage.getItem("orbitwin_onboarded") === "1") return "fault";
  } catch { /* fresh onboarding on any error */ }
  return "landing";
}

export default function App() {
  const t = useTwinLab();
  const [view, setView] = useState<View>(initialView);
  const [faults, setFaults] = useState<any[]>([]);
  const [sel, setSel] = useState("battery_degradation");
  const [busy, setBusy] = useState(false);
  const [detail, setDetail] = useState(false);
  const [aiKey, setAiKey] = useState("");
  const [tab, setTab] = useState(0);
  const [replayFrames, setReplayFrames] = useState<SimValues[] | null>(null);
  const [replayIdx, setReplayIdx] = useState(0);
  const replayTimer = useRef<number | undefined>(undefined);
  const [aiOpen, setAiOpen] = useState(false);
  const [aiLoading, setAiLoading] = useState(false);
  const [aiError, setAiError] = useState("");

  useEffect(() => {
    if (t.mode === "demo") return;
    api.faults().then(setFaults).catch(() => {});
  }, [t.mode]);
  const shownFaults = faults.length ? faults : demoFaultList();
  useEffect(() => () => window.clearInterval(replayTimer.current), []);
  useEffect(() => {
    const h = (e: KeyboardEvent) => { if (e.key === "Escape") setAiOpen(false); };
    window.addEventListener("keydown", h);
    return () => window.removeEventListener("keydown", h);
  }, []);

  const stopReplay = (silent = false) => {
    window.clearInterval(replayTimer.current);
    replayTimer.current = undefined;
    setReplayFrames(null);
    if (!silent) { t.refresh(); t.showToast("Live again"); }
  };

  const startReplay = async (iid: string) => {
    if (t.mode === "demo") {
      const frames = t.demoFramesFor(iid);
      if (!frames.length) { t.showToast("No stored frames for " + iid); return; }
      window.clearInterval(replayTimer.current);
      setReplayFrames(frames); setReplayIdx(0); setView("fault");
      t.showToast(`Replaying ${iid} — ${frames.length} recorded frames`);
      replayTimer.current = window.setInterval(() => {
        setReplayIdx((i) => {
          if (i + 1 >= frames.length) {
            window.clearInterval(replayTimer.current);
            replayTimer.current = undefined;
            setReplayFrames(null);
            t.refresh();
            t.showToast("Replay complete — back to live");
            return i;
          }
          return i + 1;
        });
      }, 650);
      return;
    }
    try {
      const tel = await api.telemetry();
      const frames = tel.filter((x: any) => x.incident_id === iid).map((x: any) => x.data as SimValues);
      if (!frames.length) { t.showToast("No stored frames for " + iid); return; }
      window.clearInterval(replayTimer.current);
      setReplayFrames(frames); setReplayIdx(0); setView("fault");
      t.showToast(`Replaying ${iid} — ${frames.length} recorded frames`);
      replayTimer.current = window.setInterval(() => {
        setReplayIdx((i) => {
          if (i + 1 >= frames.length) {
            window.clearInterval(replayTimer.current);
            replayTimer.current = undefined;
            setReplayFrames(null);
            t.refresh();
            t.showToast("Replay complete — back to live");
            return i;
          }
          return i + 1;
        });
      }, 650);
    } catch { t.showToast("Replay failed — backend unreachable"); }
  };

  const liveVals = replayFrames ? replayFrames[replayIdx] : t.values;
  const liveSeries = replayFrames ? replayFrames.slice(0, replayIdx + 1) : t.series;

  const inject = async () => {
    stopReplay(true);
    setBusy(true);
    try {
      const r = await t.injectFault(sel);
      t.showToast(`Fault injected: ${r.incident_id}`);
      setView("fault");
      t.refresh();
    } catch (e: any) {
      t.showToast(e.message?.includes("409") || e.message?.includes("Resolve") ? "Resolve the active incident before injecting another fault." : "Inject failed: " + e.message);
    } finally { setBusy(false); }
  };

  const recover = async () => {
    if (!t.analysis.incident_id) { t.showToast("No active incident"); return; }
    try {
      await t.recoverActive();
      t.showToast("Recovery sequence started");
    } catch (e: any) { t.showToast("Recovery blocked: " + e.message); }
  };

  const reset = async () => {
    stopReplay(true);
    await t.resetSim().catch(() => {});
    t.refresh();
    t.showToast("Simulation reset to baseline");
  };

  const explain = async () => {
    if (!t.analysis.incident_id) { t.showToast("Inject a fault first"); return; }
    setAiOpen(true);
    setAiLoading(true);
    setAiError("");
    try { await t.explainActive(); await t.refresh(); }
    catch (e: any) { setAiError("AI unavailable: " + e.message); }
    finally { setAiLoading(false); }
  };

  const a = t.analysis;
  const before = a.before, after = a.after;

  // Onboarding flow: landing -> connect (Popup) -> Satellite Overview -> main dashboard.
  // Rendered full-screen without dashboard chrome; hooks above stay mounted
  // so telemetry/WS is already warm when the user clones into the twin.
  if (view === "landing") {
    return <LandingPage onLogin={() => setView("connect")} />;
  }
  if (view === "connect") {
    return <ConnectSatellite onConnect={() => setView("overview")} />;
  }
  if (view === "overview") {
    return (
      <SatelliteOverview
        onClone={() => {
          try { window.sessionStorage.setItem("orbitwin_onboarded", "1"); } catch { /* ignore */ }
          setView("fault");
        }}
        live={{ v: t.values, series: t.series, subsystems: t.subsystems, analysis: t.analysis, connected: t.connected }}
      />
    );
  }

  return (
    <>
      <Header phase={t.simulating ? t.phase : "NOMINAL"} connected={t.connected} demo={t.mode === "demo"} onLogoClick={() => {
        try { window.sessionStorage.removeItem("orbitwin_onboarded"); } catch { /* ignore */ }
        stopReplay(true);
        setView("landing");
      }} />
      <div className="wrap">
        <Sidebar view={view} setView={setView} />
        <div className="opcol">
          {view === "fault" && (
            <div className="opbar">
              <span className="lbl">FAULT TYPE</span>
              <select value={sel} onChange={(e) => setSel(e.target.value)}>
                {shownFaults.map((f) => <option key={f.id} value={f.id}>{f.label} — {f.severity}</option>)}
              </select>
              <button className="btn w btn-inline" disabled={busy || t.simulating} onClick={inject}>
                {t.simulating ? "SIMULATING…" : "INJECT FAULT"}
              </button>
              <button className="btn o btn-inline" onClick={reset}>Reset Simulation</button>
              <span className="phase">{replayFrames ? `REPLAY ${replayIdx + 1}/${replayFrames.length}` : t.phase}</span>
              {replayFrames && <button className="btn o btn-inline" onClick={() => stopReplay()}>■ Stop</button>}
              {a.ai?.summary
                ? <><span className="ai"><b>AI · {a.ai._model ?? ""}</b>{a.ai.summary}</span>
                    <button className="btn o btn-inline" onClick={() => { setAiError(""); setAiOpen(true); }}>AI insight →</button></>
                : <button className="btn o btn-inline" onClick={explain}>Explain with AI</button>}
            </div>
          )}
          {t.err && <div className="operr">{t.err}</div>}
          <main>
          {(view === "home" || view === "fault" || view === "telemetry") && (
            <>
              <TwinCard subsystems={t.subsystems} />
              <LiveState v={liveVals} onDetail={() => setDetail(!detail)} />
              <TelemetryChart series={liveSeries} live={liveVals} faultActive={!!a.active || !!replayFrames} />
            </>
          )}

          {view === "events" && (
            <section className="card" style={{ gridColumn: "1/3", padding: 16, maxHeight: 560, overflow: "auto" }}>
              <h2>Event Log</h2>
              <table style={{ width: "100%", borderCollapse: "collapse", marginTop: 12, fontSize: 11 }}>
                <tbody>
                  {t.events.map((e, i) => (
                    <tr key={i} style={{ borderBottom: "1px solid #0f151b" }}>
                      <td style={{ color: "#8c97a1", padding: "6px 8px" }}>{e.ts.slice(11, 19)}</td>
                      <td style={{ color: "#d3d9de", padding: "6px 8px" }}>{e.type}</td>
                      <td style={{ color: e.severity === "CRITICAL" ? "#f0343b" : "#9aa4ad", padding: "6px 8px" }}>{e.severity}</td>
                      <td style={{ color: "#d3d9de", padding: "6px 8px" }}>{e.message}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </section>
          )}

          {view === "reports" && (
            <section className="card" style={{ gridColumn: "1/3", padding: 16 }}>
              <h2>Incident Reports</h2>
              <div style={{ marginTop: 12, display: "grid", gap: 8 }}>
                {t.incidents.map((i) => (
                  <div key={i.id} style={{ display: "flex", gap: 12, alignItems: "center", fontSize: 12, borderBottom: "1px solid #0f151b", paddingBottom: 8 }}>
                    <b style={{ color: "#fff", fontWeight: 400 }}>{i.id}</b>
                    <span style={{ color: "#9aa4ad" }}>{i.fault_type} · {i.severity} · {i.status}</span>
                    <span style={{ marginLeft: "auto", display: "flex", gap: 8, alignItems: "center" }}>
                      <button className="btn o btn-inline" onClick={() => startReplay(i.id)}>Replay</button>
                      <a href={t.reportHref(i.id)} target="_blank" rel="noreferrer" style={{ color: "#4da3ff" }}>Open / Print PDF ↓</a>
                    </span>
                  </div>
                ))}
                {!t.incidents.length && <small style={{ color: "#8c97a1" }}>No incidents yet — inject a fault to create your first incident.</small>}
              </div>
            </section>
          )}

          {view === "settings" && (
            <section className="card" style={{ gridColumn: "1/3", padding: 16 }}>
              <h2>Settings</h2>
              <div style={{ marginTop: 12, fontSize: 12, color: "#c9d0d6", display: "grid", gap: 10, maxWidth: 520 }}>
                <div>Backend: {t.mode === "demo"
                  ? <code>offline demo twin (in-browser)</code>
                  : <><code>http://localhost:8000</code> · WS <code>/ws/simulation</code> · {t.connected ? "connected" : "disconnected"}</>}</div>
                <div>Simulation: deterministic, single active fault. {t.mode === "demo" ? "Demo history lives in this tab only." : "Telemetry persists in SQLite."}</div>
                <div style={{ display: "flex", gap: 8 }}>
                  <input type="password" placeholder="GEMINI_API_KEY (optional)" value={aiKey} onChange={(e) => setAiKey(e.target.value)}
                    style={{ flex: 1, background: "#0d1318", border: "1px solid #2c353e", color: "#fff", borderRadius: 3, height: 34, padding: "0 10px" }} />
                  <button className="btn o btn-inline" style={{ width: 140 }} onClick={async () => {
                    if (t.mode === "demo") { setAiKey(""); t.showToast("AI key needs the backend link — demo uses built-in diagnosis"); return; }
                    await api.setKey(aiKey, "gemini-2.0-flash").catch(() => {});
                    setAiKey(""); t.refresh(); t.showToast("AI key saved server-side");
                  }}>Save AI key</button>
                </div>
                <small style={{ color: "#8c97a1" }}>Key is sent to backend only and never displayed. Leave empty to run fully offline.</small>
              </div>
            </section>
          )}

          {(view === "home" || view === "fault" || view === "telemetry") && (
            <div className="bot">
              <FailureAnalysis a={a} />
              <section className="card rec">
                <div className="ti"><svg viewBox="0 0 24 24"><path d="M12 2l8 3v6c0 5-3.5 9-8 11-4.5-2-8-6-8-11V5z" /><path d="M9 12l2 2 4-4" /></svg>Recovery Recommendation</div>
                <div className="ra">Recommended Actions</div>
                <ul>{(a.recommendations ?? ["Isolate battery bus B", "Reduce non-critical payload load", "Enter safe mode if battery continues falling"]).map((r, i) => (
                  <li key={r}><em>{String(i + 1).padStart(2, "0")}</em>{r}</li>))}</ul>
                <button className="btn w" id="apply" onClick={recover}>
                  <svg width="13" height="13" viewBox="0 0 24 24"><path d="M6 4l14 8-14 8z" /></svg>Apply Recovery</button>
              </section>
              <section className="card pred">
                <div className="ti"><svg viewBox="0 0 24 24"><path d="M3 3v18h18M7 15l4-5 3 3 5-7" /></svg>Predicted Outcome</div>
                <table>
                  <tbody>
                    <tr><th></th><th>Before</th><th></th><th>After</th></tr>
                    <PRow label="Health" b={fmtP(before?.health) + "%"} a={fmtP(after?.health ?? liveVals?.health) + "%"} />
                    <PRow label="Battery" b={fmtP(before?.battery_soc) + "%"} a={fmtP(after?.battery_soc ?? liveVals?.battery_soc) + "%"} />
                    <PRow label="Temperature" b={fmtP(before?.battery_temp) + "°C"} a={fmtP(after?.battery_temp ?? liveVals?.battery_temp) + "°C"} />
                    <PRow label="Signal" b={fmtP(before?.signal) + "%"} a={fmtP(after?.signal ?? liveVals?.signal) + "%"} />
                    {a.rul && <PRow label={`${a.rul.metric} RUL`} b={a.rul.trend} a={`~${a.rul.sim_min} sim-min → ${a.rul.limit}`} />}
                  </tbody>
                </table>
                <button className="btn o" onClick={() => { if (a.incident_id) window.open(t.reportHref(a.incident_id), "_blank"); else t.showToast("Inject a fault first"); }}>
                  <svg width="13" height="13" viewBox="0 0 24 24"><path d="M12 3v12M7 11l5 5 5-5M4 20h16" /></svg>Download Incident Report</button>
              </section>
            </div>
          )}
        </main>
        </div>
      </div>
      <div className={"toast" + (t.toast ? " on" : "")} id="toast">{t.toast}</div>
      <AIInsightPanel open={aiOpen} loading={aiLoading} error={aiError}
        analysis={a} recovering={t.simulating} onClose={() => setAiOpen(false)} onApplyRecovery={recover} />
      {detail && (
        <div className="card" style={{ position: "fixed", right: 16, top: 80, width: 320, padding: 16, zIndex: 50 }}>
          <h2>Detailed State</h2>
          <pre style={{ fontSize: 11, color: "#9aa4ad", marginTop: 8 }}>{JSON.stringify(liveVals, null, 1)}</pre>
          <div className="tabs" style={{ position: "static", marginTop: 8, display: "flex", gap: 6 }}>
            {["5m", "30m", "1h"].map((x, i) => <button key={x} className={tab === i ? "on" : ""} onClick={() => setTab(i)}>{x}</button>)}
          </div>
          <button className="btn o btn-inline" style={{ width: "100%", marginTop: 8 }} onClick={() => setDetail(false)}>Close</button>
        </div>
      )}
    </>
  );
}

function PRow({ label, b, a }: { label: string; b: string; a: string }) {
  return <tr><td>{label}</td><td>{b}</td><td>→</td><td>{a}</td></tr>;
}
function fmtP(n: number | undefined) { return n === undefined || n === null ? "-" : (+n.toFixed(n % 1 ? 1 : 0)).toString(); }
