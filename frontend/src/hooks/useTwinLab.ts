import { useEffect, useRef, useState } from "react";
import { api } from "../services/api";
import type { Analysis, SimEvent, SimValues } from "../types";
import {
  DEMO_BASELINE,
  DEMO_FAULTS,
  DEMO_PHASES,
  demoAnalysis,
  demoExplain,
  demoFaultTicks,
  demoRecoveryTicks,
  demoReport,
  demoTs,
  demoWobble,
} from "../services/offline";

const BASELINE_SUBS: Record<string, string> = {
  "Solar Panels": "NOMINAL", Battery: "NOMINAL", Thermal: "NOMINAL",
  Communication: "NOMINAL", Attitude: "NOMINAL", Sensors: "NOMINAL",
};

export type TwinMode = "live" | "demo";

/* ---- offline demo store (module-level so it survives re-renders) ---- */
interface DemoIncident {
  id: string; fault_type: string; severity: string; status: string; start_time: string;
}
const demoIncidents: DemoIncident[] = [];
const demoEvents: SimEvent[] = [];
const demoFrames: { incident_id: string; data: SimValues }[] = [];
let demoSeq = 0;
let demoActiveId: string | null = null;

const phaseLabel = (phase: string) =>
  phase === "INJECTED" ? "SIMULATION RUNNING"
  : phase === "DETECTED" ? "FAULT DETECTED"
  : phase.includes("RECOVER") || phase === "RECOVERY_STARTED" ? "RECOVERING"
  : phase === "ROOT_CAUSE" ? "ROOT CAUSE IDENTIFIED"
  : phase === "RECOMMENDATION_READY" ? "RECOVERY RECOMMENDATION READY"
  : "ANALYZING PROPAGATION";

export function useTwinLab() {
  const [values, setValues] = useState<SimValues | null>(null);
  const [subsystems, setSubsystems] = useState(BASELINE_SUBS);
  const [analysis, setAnalysis] = useState<Analysis>({ active: false });
  const [events, setEvents] = useState<SimEvent[]>([]);
  const [incidents, setIncidents] = useState<any[]>([]);
  const [series, setSeries] = useState<SimValues[]>([]);
  const [phase, setPhase] = useState("NOMINAL");
  const [simulating, setSimulating] = useState(false);
  const [toast, setToast] = useState("");
  const [err, setErr] = useState("");
  const [connected, setConnected] = useState(false);
  const [mode, setMode] = useState<TwinMode>("live");
  const wsRef = useRef<WebSocket | null>(null);
  const timers = useRef<number[]>([]);
  const blobRef = useRef<string | null>(null);

  const modeRef = useRef<TwinMode>("live");
  const simulatingRef = useRef(false);
  const analysisRef = useRef<Analysis>({ active: false });
  const valuesRef = useRef<SimValues | null>(null);
  useEffect(() => { modeRef.current = mode; }, [mode]);
  useEffect(() => { simulatingRef.current = simulating; }, [simulating]);
  useEffect(() => { analysisRef.current = analysis; }, [analysis]);
  useEffect(() => { valuesRef.current = values; }, [values]);

  const showToast = (m: string) => {
    setToast(m);
    window.clearTimeout((showToast as any)._t);
    (showToast as any)._t = window.setTimeout(() => setToast(""), 2600);
  };

  const later = (fn: () => void, ms: number) => {
    timers.current.push(window.setTimeout(fn, ms));
  };
  const clearTimers = () => {
    timers.current.forEach((t) => window.clearTimeout(t));
    timers.current = [];
  };
  useEffect(() => () => {
    clearTimers();
    if (blobRef.current) URL.revokeObjectURL(blobRef.current);
  }, []);

  const pushDemoEvent = (iid: string, type: string, message: string, severity: string) => {
    demoEvents.unshift({ incident_id: iid, ts: demoTs(), type, severity, message } as SimEvent);
    setEvents([...demoEvents]);
  };

  const seedDemo = () => {
    const w = demoWobble(Math.floor(Date.now() / 1000));
    setValues(w);
    setSubsystems({ ...BASELINE_SUBS });
    setSeries([w]);
  };

  const refresh = async () => {
    try {
      const st = await api.state();
      setValues(st.values);
      setSubsystems(st.subsystems);
      setSimulating(st.simulating);
      const an = await api.analysis();
      setAnalysis(an);
      if (an.active) {
        setPhase(an.severity === "CRITICAL" ? "FAULT DETECTED" : "ANALYZING PROPAGATION");
      }
      setEvents(await api.events());
      setIncidents(await api.incidents());
      const tel = await api.telemetry();
      setSeries(tel.map((t: any) => t.data));
      setErr("");
      if (modeRef.current !== "live") {
        modeRef.current = "live";
        setMode("live");
        showToast("Backend link restored — live twin");
      }
    } catch {
      // No backend (e.g. static hosting): run the deterministic offline twin.
      if (modeRef.current !== "demo") {
        modeRef.current = "demo";
        setMode("demo");
        seedDemo();
        setAnalysis({ active: false });
        setPhase("NOMINAL");
        setSimulating(false);
        showToast("Demo mode — offline twin (backend unreachable)");
      } else if (!simulatingRef.current && !demoActiveId && demoIncidents.length === 0) {
        setValues(demoWobble(Math.floor(Date.now() / 1000)));
      }
      try { wsRef.current?.close(); } catch { /* ignore */ }
      setErr("");
    }
  };

  /* ---------- unified actions (live backend or offline demo) ---------- */

  const injectFault = async (faultType: string) => {
    if (modeRef.current === "live") {
      return api.inject(faultType);
    }
    if (simulatingRef.current) throw new Error("simulation still running - wait for recommendation");
    if (demoActiveId) throw new Error("Resolve the active incident before injecting another fault.");
    const f = DEMO_FAULTS[faultType];
    if (!f) throw new Error("unknown fault: " + faultType);
    clearTimers();
    demoSeq += 1;
    const iid = `INC-DEMO-${String(demoSeq).padStart(4, "0")}`;
    demoActiveId = iid;
    demoIncidents.unshift({
      id: iid, fault_type: faultType, severity: f.severity, status: "FAULT", start_time: demoTs(),
    });
    setIncidents([...demoIncidents]);
    pushDemoEvent(iid, "INJECTED", `Fault injected: ${f.label}`, f.severity === "CRITICAL" ? "CRITICAL" : "WARNING");
    const ticks = demoFaultTicks(faultType);
    const degraded: Record<string, string> = { ...BASELINE_SUBS };
    Object.keys(f.subsystems).forEach((k) => {
      if (f.subsystems[k] !== "NOMINAL") degraded[k] = "DEGRADED";
    });
    setSimulating(true);
    ticks.forEach((sv, i) => {
      later(() => {
        setValues(sv);
        setSeries((s) => [...s.slice(-199), sv]);
        demoFrames.push({ incident_id: iid, data: sv });
        setSubsystems(i === 0 ? { ...BASELINE_SUBS } : i < ticks.length - 1 ? { ...degraded } : { ...f.subsystems });
        setPhase(phaseLabel(DEMO_PHASES[i]));
        if (i === ticks.length - 1) {
          setAnalysis(demoAnalysis(faultType, iid));
          pushDemoEvent(iid, "DETECTED", "Anomaly detected", "WARNING");
          pushDemoEvent(iid, "ROOT_CAUSE", `Root cause identified: ${f.root_cause}`, "INFO");
          pushDemoEvent(iid, "RECOMMENDATION_READY", "Recovery recommendation generated", "INFO");
          setSimulating(false);
          setPhase("RECOVERY RECOMMENDATION READY");
          showToast(`Fault injected: ${iid}`);
        }
      }, 650 * (i + 1));
    });
    return { incident_id: iid, fault_type: faultType, severity: f.severity, status: "SIMULATING" };
  };

  const recoverActive = async () => {
    if (modeRef.current === "live") {
      const iid = analysisRef.current.incident_id;
      if (!iid) throw new Error("No active incident");
      return api.recover(iid);
    }
    const iid = demoActiveId;
    if (!iid) throw new Error("No active incident");
    const rec = demoIncidents.find((r) => r.id === iid);
    if (!rec || rec.status === "STABLE") throw new Error("already recovered");
    if (simulatingRef.current) throw new Error("simulation still running - wait");
    clearTimers();
    pushDemoEvent(iid, "RECOVERY_STARTED", "Recovery applied by operator", "INFO");
    setSimulating(true);
    setPhase("RECOVERING");
    const from = valuesRef.current ?? { ...DEMO_BASELINE };
    const ticks = demoRecoveryTicks(rec.fault_type, from);
    ticks.forEach((sv, i) => {
      later(() => {
        setValues(sv);
        setSeries((s) => [...s.slice(-199), sv]);
        demoFrames.push({ incident_id: iid, data: sv });
        if (i === ticks.length - 1) {
          setSubsystems({ ...BASELINE_SUBS });
          rec.status = "STABLE";
          setIncidents([...demoIncidents]);
          demoActiveId = null;
          pushDemoEvent(iid, "STABILIZED", "Satellite stabilized", "INFO");
          setSimulating(false);
          setPhase("NOMINAL");
          showToast("Satellite stabilized");
        }
      }, 650 * (i + 1));
    });
    return { status: "RECOVERING" };
  };

  const resetSim = async () => {
    if (modeRef.current === "live") {
      return api.reset();
    }
    clearTimers();
    demoActiveId = null;
    seedDemo();
    setAnalysis({ active: false });
    setPhase("NOMINAL");
    setSimulating(false);
    return { status: "NOMINAL" };
  };

  const explainActive = async () => {
    if (modeRef.current === "live") {
      const iid = analysisRef.current.incident_id;
      if (!iid) throw new Error("No active incident");
      await api.explain(iid);
      await refresh();
      return;
    }
    const a = analysisRef.current;
    if (!a.incident_id || !a.fault) throw new Error("No active incident");
    setAnalysis({ ...a, ai: demoExplain(a.fault) });
  };

  const demoFramesFor = (iid: string): SimValues[] =>
    demoFrames.filter((f) => f.incident_id === iid).map((f) => f.data);

  const reportHref = (iid: string): string => {
    if (modeRef.current === "live") return api.reportUrl(iid);
    const rec = demoIncidents.find((r) => r.id === iid);
    if (!rec) return "#";
    if (blobRef.current) URL.revokeObjectURL(blobRef.current);
    const html = demoReport(iid, rec.fault_type, demoEvents.filter((e) => e.incident_id === iid));
    const url = URL.createObjectURL(new Blob([html], { type: "text/html;charset=utf-8" }));
    blobRef.current = url;
    return url;
  };

  useEffect(() => {
    refresh();
    const apiBase = (import.meta.env.VITE_API_URL as string | undefined)?.replace(/\/$/, "");
    const wsUrl = apiBase
      ? apiBase.replace(/^http/, "ws") + "/ws/simulation"
      : `${location.protocol === "https:" ? "wss" : "ws"}://${location.hostname}:8000/ws/simulation`;
    const ws = new WebSocket(wsUrl);
    wsRef.current = ws;
    ws.onopen = () => setConnected(true);
    ws.onclose = () => setConnected(false);
    ws.onerror = () => setConnected(false);
    ws.onmessage = (ev) => {
      try {
        const m = JSON.parse(ev.data);
        if (m.kind === "tick" || m.kind === "recovery_tick") {
          setValues(m.state);
          if (m.subsystems) setSubsystems(m.subsystems);
          setSeries((s) => [...s.slice(-199), m.state]);
          setSimulating(true);
          setPhase(phaseLabel(m.phase));
        } else if (m.kind === "analysis") {
          setSimulating(false);
          refresh();
          showToast("Root cause identified");
        } else if (m.kind === "ai") {
          refresh();
        } else if (m.kind === "recovered") {
          setSimulating(false);
          setPhase("NOMINAL");
          refresh();
          showToast("Satellite stabilized");
        }
      } catch { /* ignore */ }
    };
    const t = window.setInterval(() => { if (!wsRef.current || wsRef.current.readyState > 1) refresh(); }, 5000);
    return () => { window.clearInterval(t); ws.close(); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return {
    values, subsystems, analysis, events, incidents, series, phase, simulating,
    toast, err, connected, mode, refresh, showToast, setPhase,
    injectFault, recoverActive, resetSim, explainActive, demoFramesFor, reportHref,
  };
}
