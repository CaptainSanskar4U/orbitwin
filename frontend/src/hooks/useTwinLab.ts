import { useEffect, useRef, useState } from "react";
import { api } from "../services/api";
import type { Analysis, SimEvent, SimValues } from "../types";

const BASELINE_SUBS: Record<string, string> = {
  "Solar Panels": "NOMINAL", Battery: "NOMINAL", Thermal: "NOMINAL",
  Communication: "NOMINAL", Attitude: "NOMINAL", Sensors: "NOMINAL",
};

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
  const wsRef = useRef<WebSocket | null>(null);

  const showToast = (m: string) => {
    setToast(m);
    window.clearTimeout((showToast as any)._t);
    (showToast as any)._t = window.setTimeout(() => setToast(""), 2600);
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
    } catch (e: any) {
      setErr("Backend unavailable — start backend: uvicorn app.main:app --app-dir backend");
    }
  };

  useEffect(() => {
    refresh();
    const proto = location.protocol === "https:" ? "wss" : "ws";
    const ws = new WebSocket(`${proto}://${location.hostname}:8000/ws/simulation`);
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
          setPhase(
            m.phase === "INJECTED" ? "SIMULATION RUNNING"
            : m.phase === "DETECTED" ? "FAULT DETECTED"
            : m.phase.includes("RECOVER") ? "RECOVERING"
            : m.phase === "ROOT_CAUSE" ? "ROOT CAUSE IDENTIFIED"
            : m.phase === "RECOMMENDATION_READY" ? "RECOVERY RECOMMENDATION READY"
            : "ANALYZING PROPAGATION"
          );
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

  return { values, subsystems, analysis, events, incidents, series, phase, simulating,
           toast, err, connected, refresh, showToast, setPhase };
}
