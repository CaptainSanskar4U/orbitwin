import { useEffect, useRef } from "react";
import overviewHtml from "../onboarding/overview.html?raw";
import type { Analysis, SimValues } from "../types";

export interface OverviewLive {
  v: SimValues | null;
  series: SimValues[];
  subsystems: Record<string, string>;
  analysis: Analysis;
  connected: boolean;
}

type Doc = Document;

const pad = (n: number) => String(n).padStart(2, "0");
const fmtClock = (d: Date) =>
  `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())} ${pad(d.getHours())}:${pad(d.getMinutes())}:${pad(d.getSeconds())}`;

function spans(doc: Doc): HTMLElement[] {
  return Array.from(doc.querySelectorAll<HTMLElement>("span.t"));
}
function exact(doc: Doc, text: string): HTMLElement[] {
  return spans(doc).filter((s) => s.textContent === text);
}
function first(doc: Doc, text: string): HTMLElement | null {
  return exact(doc, text)[0] ?? null;
}
/** Value cell = the span right after a label span (builder emits label,value adjacently). */
function rowValue(doc: Doc, label: string, occurrence = 0): HTMLElement | null {
  const labels = exact(doc, label);
  const lab = labels[occurrence] ?? null;
  if (!lab) return null;
  const sib = lab.nextElementSibling;
  return sib && sib.tagName === "SPAN" ? (sib as HTMLElement) : null;
}
function setText(el: HTMLElement | null, text: string) {
  if (!el || el.textContent === text) return;
  el.textContent = text;
  el.classList.remove("ow-flash");
  void el.offsetWidth;
  el.classList.add("ow-flash");
}
function worstOf(sub: Record<string, string>, keys: string[]): string {
  const rank = (s: string) => {
    const u = (s || "").toUpperCase();
    if (u.includes("FAIL")) return 4;
    if (u.includes("CRIT")) return 3;
    if (u.includes("WARN") || u.includes("DEGR")) return 2;
    return 1;
  };
  let worst = "NOMINAL";
  let r = 1;
  for (const k of keys) {
    const s = sub[k] ?? sub[k.toLowerCase()] ?? "NOMINAL";
    if (rank(s) > r) { r = rank(s); worst = s; }
  }
  return worst;
}
function badgeStyle(el: HTMLElement, state: string) {
  const u = state.toUpperCase();
  let txt = "Healthy", color = "#17d66d", border = "#0f3a2a", bg = "#07251d";
  if (u.includes("FAIL")) { txt = "Failed"; color = "#ff5d5d"; border = "#5c1a1a"; bg = "#230b0b"; }
  else if (u.includes("CRIT")) { txt = "Critical"; color = "#f0343b"; border = "#5c1a1a"; bg = "#230b0b"; }
  else if (u.includes("WARN") || u.includes("DEGR")) { txt = "Degraded"; color = "#f5a524"; border = "#4d3a12"; bg = "#211a08"; }
  if (el.textContent !== txt) el.textContent = txt;
  el.style.color = color; el.style.borderColor = border; el.style.background = bg;
}

function ensureExtras(doc: Doc) {
  if (doc.getElementById("ow-live")) return;
  const css = doc.createElement("style");
  css.id = "ow-live";
  css.textContent = `
    @keyframes ow-pulse { 0%,100% { opacity:1 } 50% { opacity:.35 } }
    @keyframes ow-flash { 0% { color:#fff } 100% { } }
    @keyframes ow-tick { from { transform:translateX(0) } to { transform:translateX(-50%) } }
    .ow-live-dot { animation:ow-pulse 1.6s ease-in-out infinite; }
    .ow-flash { animation:ow-flash .8s ease-out; }
    .ow-tab { cursor:pointer; }
    .ow-tab:hover { color:#fff !important; }
    #ow-ticker { position:absolute; left:0; right:0; top:909px; height:32px; overflow:hidden;
      border-top:1px solid #0e2030; background:rgba(5,15,23,.9); white-space:nowrap; }
    #ow-ticker-in { display:inline-block; padding-left:24px; font:11px Inter,system-ui,sans-serif;
      color:#8fa8ba; letter-spacing:.6px; line-height:32px; animation:ow-tick 28s linear infinite; }
    #ow-ticker-in b { color:#d6e2ea; font-weight:500; }
    #ow-ticker-in .ok { color:#17d66d; } #ow-ticker-in .warn { color:#f5a524; } #ow-ticker-in .bad { color:#f0343b; }
    #ow-chatlog { position:absolute; left:1346px; top:562px; width:253px; height:179px; overflow-y:auto;
      font:11.5px/1.55 Inter,system-ui,sans-serif; color:#d3e0e9; }
    #ow-chatlog .q { color:#fff; margin:6px 0 2px; } #ow-chatlog .a { color:#a9bbc8; margin:0 0 8px; }
    #ow-chatlog .typing { color:#4aa3f0; }
    .ow-card-hi { box-shadow:0 0 0 1px #1a7cf5, 0 0 22px rgba(26,124,245,.25) !important; }
    @media (prefers-reduced-motion: reduce) {
      .ow-live-dot, #ow-ticker-in { animation:none !important; }
    }`;
  doc.head.appendChild(css);

  const stage = doc.getElementById("s");
  if (stage) {
    const tick = doc.createElement("div");
    tick.id = "ow-ticker";
    tick.innerHTML = '<span id="ow-ticker-in">…</span>';
    stage.appendChild(tick);
    const log = doc.createElement("div");
    log.id = "ow-chatlog";
    stage.appendChild(log);
  }
}

function answerFor(q: string, live: OverviewLive): string {
  const s = q.toLowerCase();
  const v = live.v;
  const a = live.analysis;
  const tele = v
    ? `Right now: battery ${v.battery_soc.toFixed(0)}%, bus ${(v.voltage * 0.28).toFixed(1)}V, ` +
      `battery ${v.battery_temp.toFixed(1)}°C, signal ${v.signal.toFixed(0)}% at ${v.data_rate.toFixed(1)} Mbps.`
    : "Telemetry is still linking — values populate on the first tick.";
  if (a.active) {
    return `Active incident ${a.incident_id ?? ""} (${a.fault ?? "fault"}, ${a.severity ?? ""}): ` +
      `${a.root_cause ?? "root cause under analysis."} ${tele}`;
  }
  if (s.includes("power") || s.includes("battery") || s.includes("solar"))
    return `Solar wings feed the 28V bus and charge the 2.4kWh Li-ion pack. ${tele}`;
  if (s.includes("thermal") || s.includes("temp") || s.includes("heat"))
    return `Heaters and radiators hold the bus near 32°C; protection trims payload if it climbs. ${tele}`;
  if (s.includes("fail") || s.includes("fault") || s.includes("cascade") || s.includes("wrong"))
    return `Faults cascade power → thermal → comms, and the twin traces the chain to rank the root cause. ${tele}`;
  if (s.includes("mission") || s.includes("orbit") || s.includes("satellite"))
    return `SAT-01 flies a 500km LEO Earth-observation mission with 3-axis control. ${tele}`;
  if (s.includes("comm") || s.includes("signal") || s.includes("data") || s.includes("antenna"))
    return `S/X-band links carry telemetry down and commands up via high-gain and omni antennas. ${tele}`;
  return `I track power, thermal and comms together so one fault's cascade stays visible. ${tele}`;
}

/** Satellite Overview page (subsystems + AI agent), MAKE CLONE transitions to the dashboard. */
export function SatelliteOverview({ onClone, live }: { onClone: () => void; live: OverviewLive }) {
  const frameRef = useRef<HTMLIFrameElement>(null);
  const nextRef = useRef(onClone);
  const liveRef = useRef(live);
  const bornRef = useRef(Date.now());
  useEffect(() => { nextRef.current = onClone; }, [onClone]);
  useEffect(() => { liveRef.current = live; }, [live]);

  useEffect(() => {
    const frame = frameRef.current;
    if (!frame) return;
    let btn: HTMLButtonElement | null = null;
    let timer: number | undefined;

    const tick = () => {
      const doc = frame.contentDocument;
      if (!doc || !doc.getElementById("s")) return;
      const L = liveRef.current;
      try {
        ensureExtras(doc);
        const v = L.v;
        const now = new Date();
        const tSec = (Date.now() - bornRef.current) / 1000;

        // header link state + pulse
        const link = first(doc, "SATELITE CONNECTED");
        if (link && !link.dataset.ow) {
          link.dataset.ow = "1";
          link.classList.add("ow-live-dot");
        }

        // hero status
        const sub = L.subsystems;
        const states = Object.values(sub);
        const anyCrit = states.some((s) => /CRIT|FAIL/i.test(s));
        const anyWarn = states.some((s) => /WARN|DEGR/i.test(s)) || L.analysis.active;
        const statusEl = first(doc, "Operational") ?? first(doc, "Degraded") ?? first(doc, "Critical");
        if (statusEl) {
          const word = anyCrit ? "Critical" : anyWarn ? "Degraded" : "Operational";
          statusEl.textContent = word;
          statusEl.style.color = anyCrit ? "#f0343b" : anyWarn ? "#f5a524" : "#17d66d";
        }

        // hero orbit line: extend the LEO subtitle with live ALT/VEL/T+
        const alt = 500 + 8 * Math.sin(tSec / 60);
        const vel = 7.61 + 0.05 * Math.cos(tSec / 47);
        const mm = pad(Math.floor(tSec / 60)), ss = pad(Math.floor(tSec % 60));
        const heroSub = spans(doc).find((s) => (s.textContent ?? "").includes("LEO Satellite"));
        if (heroSub) {
          const txt = `LEO Satellite   |   Earth Observation   ·   ALT ${alt.toFixed(1)} km   ·   VEL ${vel.toFixed(2)} km/s   ·   T+${mm}:${ss}`;
          if (heroSub.textContent !== txt) heroSub.textContent = txt;
        }
        const orbitLine = first(doc, "LEO (500 km)");
        if (orbitLine) setText(orbitLine, `LEO (${alt.toFixed(0)} km)`);

        if (v) {
          // key specs: live data-rate
          const specRate = rowValue(doc, "Data Rate", 0);
          setText(specRate, `${v.data_rate.toFixed(1)} Mbps`);
          // power card
          setText(rowValue(doc, "Solar Panels"), `${v.solar_power.toFixed(0)} W · 2× deploy`);
          setText(rowValue(doc, "Battery"), `Li-ion · ${v.battery_soc.toFixed(0)}%`);
          setText(rowValue(doc, "Power Bus"), `${(v.voltage * 0.28).toFixed(1)} V DC`);
          // thermal card
          setText(rowValue(doc, "Heaters"), `4 units · ${v.battery_temp.toFixed(0)}°C`);
          setText(rowValue(doc, "Sensors"), `${v.battery_temp.toFixed(1)} / ${v.cpu_temp.toFixed(1)}°C`);
          // comms card
          setText(rowValue(doc, "Data Rate", 1), `${v.data_rate.toFixed(1)} Mbps`);
          setText(rowValue(doc, "Link Status"), v.signal > 60 ? `Active · ${v.signal.toFixed(0)}%` : `Degraded · ${v.signal.toFixed(0)}%`);
          setText(rowValue(doc, "Antenna"), v.signal > 60 ? "High-gain + Omni" : "Omni · fallback");
        }

        // subsystem badges
        const badges = Array.from(doc.querySelectorAll<HTMLElement>(".hb"));
        if (badges[0]) badgeStyle(badges[0], worstOf(sub, ["Battery", "Solar Panels", "Power"]));
        if (badges[1]) badgeStyle(badges[1], worstOf(sub, ["Thermal"]));
        if (badges[2]) badgeStyle(badges[2], worstOf(sub, ["Communication", "Comms"]));

        // live timestamp in AI panel
        const stamp = spans(doc).find((s) => /AM|PM/.test(s.textContent ?? "") && (s.textContent ?? "").includes(":"));
        if (stamp && stamp.id !== "clk") {
          const hh = now.getHours() % 12 || 12;
          setText(stamp, `${hh}:${pad(now.getMinutes())} ${now.getHours() >= 12 ? "PM" : "AM"} · live`);
        }

        // ticker
        const tickIn = doc.getElementById("ow-ticker-in");
        if (tickIn) {
          const cls = (ok: boolean, warn: boolean) => (ok ? "ok" : warn ? "warn" : "bad");
          const body = v
            ? `<b>LIVE</b> ● SOC <b>${v.battery_soc.toFixed(0)}%</b> · PWR <b>${v.power.toFixed(0)}%</b> · ` +
              `SOL <b>${v.solar_power.toFixed(0)}W</b> · BATT <b>${v.battery_temp.toFixed(1)}°C</b> · ` +
              `CPU <b>${v.cpu_temp.toFixed(1)}°C</b> · SIG <b class="${cls(v.signal > 60, v.signal > 30)}">${v.signal.toFixed(0)}%</b> · ` +
              `${v.data_rate.toFixed(1)}Mbps · BUS ${(v.voltage * 0.28).toFixed(1)}V · ` +
              `ALT ${alt.toFixed(1)}km · VEL ${vel.toFixed(2)}km/s · ${fmtClock(now)} &nbsp;&nbsp;`
            : `<b>LINKING</b> ● opening channel to SAT-01 · ${fmtClock(now)} &nbsp;&nbsp;`;
          tickIn.innerHTML = body + body; // loop seamlessly with -50% marquee
        }
      } catch {
        // overview DOM not ready yet; retry next tick
      }
    };

    const wireControls = () => {
      const doc = frame.contentDocument;
      if (!doc || !doc.getElementById("s") || doc.getElementById("ow-wired")) return;
      try {
        // MAKE CLONE -> dashboard
        btn = doc.querySelector<HTMLButtonElement>("#mk");
        btn?.addEventListener("click", () => nextRef.current());

        // tabs: active highlight + underline slide + card focus
        const tabs = ["Overview", "Power System", "Thermal System", "Communication System", "Components", "Mission Profile"]
          .map((t) => first(doc, t))
          .filter((e): e is HTMLElement => !!e);
        const underline = Array.from(doc.querySelectorAll<HTMLElement>("#s > div")).find((d) =>
          (d.getAttribute("style") ?? "").includes("#1a7cf5"),
        );
        const cards = Array.from(doc.querySelectorAll<HTMLElement>("#s > div")).filter((d) => {
          const s = d.getAttribute("style") ?? "";
          return /width:31[278]px/.test(s) && /height:191px/.test(s);
        });
        const flash = (el: HTMLElement | null) => {
          if (!el) return;
          el.classList.remove("ow-card-hi");
          void el.offsetWidth;
          el.classList.add("ow-card-hi");
          window.setTimeout(() => el.classList.remove("ow-card-hi"), 1600);
        };
        const cardBox = (i: number) => cards[i] ?? null;
        const specsBox = Array.from(doc.querySelectorAll<HTMLElement>("#s > div")).find((d) => {
          const s = d.getAttribute("style") ?? "";
          return s.includes("left:1247px") && s.includes("width:387px");
        }) ?? null;
        tabs.forEach((tab) => {
          tab.classList.add("ow-tab");
          tab.addEventListener("click", () => {
            tabs.forEach((o) => { o.style.color = "#a5b8c6"; });
            tab.style.color = "#fff";
            if (underline) {
              const left = tab.offsetLeft - (92 - tab.offsetWidth) / 2;
              underline.style.left = `${Math.max(0, left)}px`;
            }
            const name = tab.textContent ?? "";
            if (name.includes("Power")) flash(cardBox(0));
            else if (name.includes("Thermal")) flash(cardBox(1));
            else if (name.includes("Communication")) flash(cardBox(2));
            else if (name.includes("Component")) flash(specsBox);
          });
        });

        // sidebar shortcuts
        const sideAi = first(doc, "AI Assistant");
        const sideSub = first(doc, "Subsystems");
        const askFirst = () => {
          const log = doc.getElementById("ow-chatlog");
          if (log) { log.style.outline = "1px solid #1a7cf5"; window.setTimeout(() => { log.style.outline = ""; }, 1200); }
          (doc.getElementById("in") as HTMLInputElement | null)?.focus();
        };
        sideAi?.addEventListener("click", askFirst);
        sideSub?.addEventListener("click", () => cards.forEach((c) => flash(c)));

        // AI chat: suggestions + input + send
        const log = doc.getElementById("ow-chatlog");
        const input = doc.getElementById("in") as HTMLInputElement | null;
        const send = Array.from(doc.querySelectorAll("svg")).find((s) =>
          (s as unknown as HTMLElement).getAttribute?.("style")?.includes("left:1608px"),
        ) as unknown as HTMLElement | undefined;
        const say = (q: string) => {
          if (!log || !q.trim()) return;
          const qd = doc.createElement("div");
          qd.className = "q";
          qd.textContent = `› ${q.trim()}`;
          log.appendChild(qd);
          const ty = doc.createElement("div");
          ty.className = "typing";
          ty.textContent = "thinking…";
          log.appendChild(ty);
          log.scrollTop = log.scrollHeight;
          window.setTimeout(() => {
            ty.remove();
            const ad = doc.createElement("div");
            ad.className = "a";
            ad.textContent = answerFor(q, liveRef.current);
            log.appendChild(ad);
            log.scrollTop = log.scrollHeight;
          }, 650);
        };
        doc.querySelectorAll("u").forEach((u) => {
          const link = u as unknown as HTMLElement;
          link.style.cursor = "pointer";
          link.addEventListener("click", () => say(link.textContent ?? ""));
        });
        input?.addEventListener("keydown", (e) => {
          if (e.key === "Enter" && input.value.trim()) {
            say(input.value);
            input.value = "";
          }
        });
        send?.addEventListener("click", () => {
          if (input && input.value.trim()) {
            say(input.value);
            input.value = "";
          }
        });

        const flag = doc.createElement("span");
        flag.id = "ow-wired";
        flag.style.display = "none";
        doc.getElementById("s")?.appendChild(flag);
      } catch {
        // retry on next tick via timer path
      }
    };

    const go = () => nextRef.current();
    const attach = () => {
      try {
        btn = frame.contentDocument?.querySelector<HTMLButtonElement>("#mk") ?? null;
        btn?.addEventListener("click", go);
      } catch { /* ignore */ }
      wireControls();
      tick();
    };
    frame.addEventListener("load", attach);
    attach();
    timer = window.setInterval(() => { wireControls(); tick(); }, 1000);
    return () => {
      window.clearInterval(timer);
      frame.removeEventListener("load", attach);
      btn?.removeEventListener("click", go);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div className="onboard-frame">
      <iframe
        ref={frameRef}
        title="Satellite Overview"
        srcDoc={overviewHtml}
        sandbox="allow-scripts allow-same-origin"
        style={{ width: "100vw", height: "100vh", border: 0, display: "block", background: "#030a11" }}
      />
    </div>
  );
}
