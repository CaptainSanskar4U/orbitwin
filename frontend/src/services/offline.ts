import type { Analysis, SimEvent, SimValues } from "../types";

/**
 * Offline demo twin: byte-faithful port of backend/app/simulation/faults.py.
 * Used ONLY when the backend is unreachable (hosted demo with no API).
 * Same input -> same output, no randomness beyond the seeded wobble.
 */

type V = SimValues;

const KEYS = ["health", "power", "battery_soc", "solar_power", "battery_temp",
  "cpu_temp", "signal", "data_rate", "voltage"] as const;

export const DEMO_BASELINE: V = {
  health: 78.0, power: 78.0, battery_soc: 64.0, solar_power: 52.0,
  battery_temp: 32.0, cpu_temp: 41.0, signal: 87.0, data_rate: 4.2, voltage: 100.0,
};

export interface DemoChainStep { node: string; detail: string }
export interface DemoFault {
  id: string; label: string; severity: string; root_cause: string;
  after: V; recovered: V; chain: DemoChainStep[]; affected: string[];
  subsystems: Record<string, string>; recommendations: string[];
  telemetry_unreliable?: boolean;
}

const F = (
  id: string, label: string, severity: string, root_cause: string,
  after: V, recovered: V, chain: DemoChainStep[], affected: string[],
  subsystems: Record<string, string>, recommendations: string[],
  telemetry_unreliable = false,
): DemoFault => ({ id, label, severity, root_cause, after, recovered, chain, affected, subsystems, recommendations, telemetry_unreliable });

export const DEMO_FAULTS: Record<string, DemoFault> = {
  battery_degradation: F("battery_degradation", "Battery Degradation", "HIGH",
    "Battery degradation due to excessive load.",
    { health: 61.0, power: 64.0, battery_soc: 42.0, solar_power: 48.0, battery_temp: 58.0, cpu_temp: 52.0, signal: 62.0, data_rate: 2.4, voltage: 82.0 },
    { health: 73.0, power: 74.0, battery_soc: 51.0, solar_power: 51.0, battery_temp: 44.0, cpu_temp: 45.0, signal: 78.0, data_rate: 3.6, voltage: 93.0 },
    [{ node: "Battery", detail: "↓ 42%" }, { node: "Voltage", detail: "↓ 18%" }, { node: "Heaters", detail: "↑ 6°C" }, { node: "Temperature", detail: "↑ 26°C" }, { node: "Communication", detail: "↓ 25%" }],
    ["Power", "Thermal", "Communication"],
    { "Solar Panels": "NOMINAL", Battery: "CRITICAL", Thermal: "WARNING", Communication: "DEGRADED", Attitude: "NOMINAL", Sensors: "NOMINAL" },
    ["Isolate battery bus B", "Reduce non-critical payload load", "Enter safe mode if battery continues falling"]),
  power_bus: F("power_bus", "Power Bus Failure", "CRITICAL",
    "Primary power distribution bus failure.",
    { health: 52.0, power: 41.0, battery_soc: 38.0, solar_power: 44.0, battery_temp: 46.0, cpu_temp: 55.0, signal: 55.0, data_rate: 1.8, voltage: 68.0 },
    { health: 70.0, power: 69.0, battery_soc: 50.0, solar_power: 50.0, battery_temp: 38.0, cpu_temp: 46.0, signal: 74.0, data_rate: 3.2, voltage: 90.0 },
    [{ node: "Power Bus", detail: "FAILED" }, { node: "Subsystem Power", detail: "↓ 37%" }, { node: "Battery", detail: "↓ 26%" }, { node: "Thermal", detail: "unstable ↑" }, { node: "Communication", detail: "↓ 32%" }],
    ["Power", "Thermal", "Communication"],
    { "Solar Panels": "DEGRADED", Battery: "CRITICAL", Thermal: "WARNING", Communication: "CRITICAL", Attitude: "DEGRADED", Sensors: "NOMINAL" },
    ["Isolate failed power bus", "Switch to redundant bus", "Reduce non-critical payload load"]),
  solar_drop: F("solar_drop", "Solar Power Drop", "MEDIUM",
    "Reduced solar generation due to array shadowing/degradation.",
    { health: 66.0, power: 61.0, battery_soc: 47.0, solar_power: 22.0, battery_temp: 33.0, cpu_temp: 42.0, signal: 80.0, data_rate: 3.4, voltage: 88.0 },
    { health: 75.0, power: 74.0, battery_soc: 56.0, solar_power: 46.0, battery_temp: 33.0, cpu_temp: 42.0, signal: 84.0, data_rate: 3.9, voltage: 95.0 },
    [{ node: "Solar Power", detail: "↓ 30W" }, { node: "Charging", detail: "↓ reduced" }, { node: "Battery SoC", detail: "↓ 17%" }, { node: "Available Power", detail: "↓ 17%" }, { node: "Payload", detail: "restricted" }],
    ["Solar Panels", "Power", "Battery"],
    { "Solar Panels": "CRITICAL", Battery: "WARNING", Thermal: "NOMINAL", Communication: "NOMINAL", Attitude: "NOMINAL", Sensors: "NOMINAL" },
    ["Reduce payload consumption", "Prioritize battery charging", "Enter power-saving mode"]),
  thermal_runaway: F("thermal_runaway", "Thermal Runaway", "CRITICAL",
    "Uncontrolled thermal increase in battery compartment.",
    { health: 55.0, power: 60.0, battery_soc: 50.0, solar_power: 48.0, battery_temp: 71.0, cpu_temp: 68.0, signal: 60.0, data_rate: 2.1, voltage: 85.0 },
    { health: 71.0, power: 71.0, battery_soc: 55.0, solar_power: 50.0, battery_temp: 42.0, cpu_temp: 47.0, signal: 76.0, data_rate: 3.4, voltage: 92.0 },
    [{ node: "Temperature", detail: "↑ 39°C" }, { node: "Thermal Protection", detail: "active" }, { node: "Payload Power", detail: "↓ reduced" }, { node: "Communication", detail: "↓ 27%" }, { node: "Safe-mode", detail: "possible" }],
    ["Thermal", "Power", "Communication"],
    { "Solar Panels": "NOMINAL", Battery: "WARNING", Thermal: "CRITICAL", Communication: "DEGRADED", Attitude: "NOMINAL", Sensors: "WARNING" },
    ["Disable non-critical heat sources", "Reduce payload load", "Enter thermal safe mode"]),
  comm_loss: F("comm_loss", "Communication Loss", "HIGH",
    "Communication subsystem failure; telemetry visibility lost (spacecraft may be healthy).",
    { health: 68.0, power: 74.0, battery_soc: 60.0, solar_power: 50.0, battery_temp: 33.0, cpu_temp: 42.0, signal: 12.0, data_rate: 0.3, voltage: 97.0 },
    { health: 76.0, power: 77.0, battery_soc: 62.0, solar_power: 51.0, battery_temp: 33.0, cpu_temp: 42.0, signal: 80.0, data_rate: 3.8, voltage: 99.0 },
    [{ node: "Signal", detail: "↓ 75%" }, { node: "Packet Loss", detail: "↑ high" }, { node: "Data Rate", detail: "↓ 3.9 Mbps" }, { node: "Telemetry", detail: "unreliable" }, { node: "Visibility", detail: "lost (craft ≠ failed)" }],
    ["Communication", "Sensors"],
    { "Solar Panels": "NOMINAL", Battery: "NOMINAL", Thermal: "NOMINAL", Communication: "FAILED", Attitude: "NOMINAL", Sensors: "WARNING" },
    ["Switch communication mode", "Reduce transmission load", "Attempt redundant communication link"], true),
  attitude_drift: F("attitude_drift", "Attitude Drift", "HIGH",
    "Attitude control instability causing pointing error.",
    { health: 62.0, power: 63.0, battery_soc: 48.0, solar_power: 28.0, battery_temp: 34.0, cpu_temp: 44.0, signal: 58.0, data_rate: 2.2, voltage: 89.0 },
    { health: 72.0, power: 72.0, battery_soc: 55.0, solar_power: 47.0, battery_temp: 33.0, cpu_temp: 43.0, signal: 77.0, data_rate: 3.5, voltage: 94.0 },
    [{ node: "Attitude Error", detail: "↑ high" }, { node: "Pointing", detail: "↓ degraded" }, { node: "Solar", detail: "↓ 24W" }, { node: "Signal", detail: "↓ 29%" }, { node: "Battery", detail: "↓ 16%" }],
    ["Attitude", "Solar Panels", "Communication", "Power"],
    { "Solar Panels": "WARNING", Battery: "WARNING", Thermal: "NOMINAL", Communication: "DEGRADED", Attitude: "CRITICAL", Sensors: "NOMINAL" },
    ["Reduce payload activity", "Stabilize attitude", "Reacquire optimal pointing"]),
  sensor_failure: F("sensor_failure", "Sensor Failure", "HIGH",
    "Star-tracker drift causing attitude knowledge error.",
    { health: 64.0, power: 70.0, battery_soc: 55.0, solar_power: 40.0, battery_temp: 34.0, cpu_temp: 45.0, signal: 68.0, data_rate: 2.8, voltage: 93.0 },
    { health: 74.0, power: 75.0, battery_soc: 60.0, solar_power: 49.0, battery_temp: 33.0, cpu_temp: 43.0, signal: 82.0, data_rate: 3.7, voltage: 97.0 },
    [{ node: "Sensors", detail: "drift ↑" }, { node: "Attitude", detail: "error ↑" }, { node: "Solar", detail: "↓ 12W" }, { node: "Power", detail: "↓ 8%" }, { node: "Communication", detail: "↓ 19%" }],
    ["Sensors", "Attitude", "Solar Panels", "Power", "Communication"],
    { "Solar Panels": "WARNING", Battery: "NOMINAL", Thermal: "NOMINAL", Communication: "DEGRADED", Attitude: "WARNING", Sensors: "CRITICAL" },
    ["Switch to redundant sensor suite", "Reduce payload activity", "Re-calibrate attitude knowledge"]),
};

export const DEMO_PHASES = ["INJECTED", "PRIMARY_DEGRADED", "SECONDARY", "TERTIARY",
  "DETECTED", "ROOT_CAUSE", "RECOMMENDATION_READY"];

const WOBBLE_AMP: Record<string, number> = {
  health: 0.3, power: 0.3, battery_soc: 0.3, solar_power: 0.4,
  battery_temp: 0.3, cpu_temp: 0.3, signal: 0.4, data_rate: 0.05, voltage: 0.3,
};

function hash01(seed: number): number {
  let x = (seed * 2654435761) % 4294967296;
  x ^= x >> 15;
  x = (x * 2246822519) % 4294967296;
  return (x % 10000) / 10000.0;
}

const r2 = (n: number) => Math.round(n * 100) / 100;

function interpolate(a: V, b: V, t: number): V {
  const out = {} as V;
  for (const k of KEYS) out[k] = r2(a[k] + (b[k] - a[k]) * t);
  return out;
}

function tickNoise(s: V, tick: number, t: number): V {
  const env = t <= 0 || t >= 1 ? 0 : Math.sin(Math.PI * t);
  const out = {} as V;
  KEYS.forEach((k, i) => {
    const n = (hash01(tick * 97 + i * 13 + 7) - 0.5) * 2;
    out[k] = r2(s[k] + n * (WOBBLE_AMP[k] ?? 0.3) * env);
  });
  return out;
}

export function demoWobble(second: number): V {
  const out = {} as V;
  KEYS.forEach((k, i) => {
    const n = (hash01(second * 31 + i * 17 + 3) - 0.5) * 2;
    out[k] = r2(DEMO_BASELINE[k] + n * (WOBBLE_AMP[k] ?? 0.3) * 0.6);
  });
  return out;
}

/** 7 deterministic ticks baseline -> after. */
export function demoFaultTicks(faultId: string): V[] {
  const f = DEMO_FAULTS[faultId];
  return DEMO_PHASES.map((_, i) => {
    const t = i / (DEMO_PHASES.length - 1);
    return tickNoise(interpolate(DEMO_BASELINE, f.after, t), i, t);
  });
}

/** 4 recovery ticks current -> recovered. */
export function demoRecoveryTicks(faultId: string, from: V): V[] {
  const f = DEMO_FAULTS[faultId];
  return [1, 2, 3, 4].map((i) => interpolate(from, f.recovered, i / 4));
}

export function demoRul(before: V, after: V) {
  const cands: { metric: string; limit: string; sim_min: number; trend: string }[] = [];
  const socSlope = (after.battery_soc - before.battery_soc) / 6;
  if (socSlope < -0.05) {
    cands.push({ metric: "Battery SoC", limit: "20%", sim_min: Math.max(Math.ceil((20 - after.battery_soc) / socSlope), 0), trend: `${socSlope.toFixed(1)}%/sim-min` });
  }
  const tmpSlope = (after.battery_temp - before.battery_temp) / 6;
  if (tmpSlope > 0.05) {
    cands.push({ metric: "Battery Temp", limit: "75°C", sim_min: Math.max(Math.ceil((75 - after.battery_temp) / tmpSlope), 0), trend: `+${tmpSlope.toFixed(1)}°C/sim-min` });
  }
  if (!cands.length) return null;
  const soonest = cands.reduce((a, b) => (a.sim_min <= b.sim_min ? a : b));
  return { ...soonest, note: "At observed fault slope, no recovery." };
}

export function demoFaultList() {
  return Object.values(DEMO_FAULTS).map((f) => ({ id: f.id, label: f.label, severity: f.severity }));
}

export function demoTs(d = new Date()): string {
  const p = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}T${p(d.getHours())}:${p(d.getMinutes())}:${p(d.getSeconds())}`;
}

export function demoAnalysis(faultId: string, incidentId: string, ai: Analysis["ai"] = null): Analysis {
  const f = DEMO_FAULTS[faultId];
  return {
    active: true, incident_id: incidentId, fault: faultId, severity: f.severity,
    root_cause: f.root_cause, chain: f.chain, affected: f.affected,
    recommendations: f.recommendations, before: { ...DEMO_BASELINE },
    after: { ...f.after }, recovered: { ...f.recovered },
    rul: demoRul(DEMO_BASELINE, f.after), ai,
  };
}

export function demoExplain(faultId: string): NonNullable<Analysis["ai"]> {
  const f = DEMO_FAULTS[faultId];
  const d = (a: number, b: number, u: string) => `${a} → ${b}${u}`;
  return {
    summary: `${f.label} (${f.severity}). ${f.root_cause}`,
    what_broke: f.root_cause,
    why_broke: `Cascade: ${f.chain.map((c) => `${c.node} ${c.detail}`).join(" → ")}.`,
    operational_impact: `Health ${d(DEMO_BASELINE.health, f.after.health, "%")}, battery ${d(DEMO_BASELINE.battery_soc, f.after.battery_soc, "%")}, signal ${d(DEMO_BASELINE.signal, f.after.signal, "%")}.`,
    cascade_explained: f.chain.map((c) => `${c.node}: ${c.detail}`).join("; "),
    how_to_avoid: f.recommendations.join("; "),
    what_changed_after_recovery: `Recovery restores health to ${f.recovered.health}% (offline demo projection).`,
    _model: "offline-demo",
  };
}

export function demoReport(incidentId: string, faultId: string, events: SimEvent[]): string {
  const f = DEMO_FAULTS[faultId];
  const row = (k: string, b: number, a: number, u: string) =>
    `<tr><td>${k}</td><td>${b}${u}</td><td>→</td><td>${a}${u}</td></tr>`;
  const tl = events.map((e) => `<li><b>${e.type}</b> · ${e.severity} · ${e.message} <small>${e.ts}</small></li>`).join("");
  return `<!DOCTYPE html><html><head><meta charset='utf-8'><title>${incidentId} report</title>` +
    `<style>body{font-family:monospace;background:#0b131a;color:#d3d9de;padding:32px}table{border-collapse:collapse}td,th{border:1px solid #22303d;padding:6px 12px}h1{color:#fff}</style></head><body>` +
    `<h1>MISSION DIGITAL TWIN — offline demo report</h1>` +
    `<p>Mission ORBITER-01 · Incident ${incidentId} · Fault ${f.label} · Severity ${f.severity}</p>` +
    `<p><b>Root cause:</b> ${f.root_cause}</p>` +
    `<h2>Before → After</h2><table>` +
    row("Health", DEMO_BASELINE.health, f.after.health, "%") +
    row("Battery", DEMO_BASELINE.battery_soc, f.after.battery_soc, "%") +
    row("Temperature", DEMO_BASELINE.battery_temp, f.after.battery_temp, "°C") +
    row("Signal", DEMO_BASELINE.signal, f.after.signal, "%") + `</table>` +
    `<h2>Recovery</h2><p>${f.recommendations.join("; ")}</p>` +
    `<h2>Timeline</h2><ul>${tl}</ul>` +
    `<p><small>Offline demo — deterministic twin running fully in-browser. Print to PDF via browser.</small></p>` +
    `</body></html>`;
}
