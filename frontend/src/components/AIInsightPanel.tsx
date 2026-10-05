import type { Analysis, SimValues } from "../types";

interface Props {
  open: boolean;
  loading: boolean;
  error: string;
  analysis: Analysis;
  recovering: boolean;
  onClose: () => void;
  onApplyRecovery: () => void;
}

function Section({ n, title, children }: { n: string; title: string; children: React.ReactNode }) {
  return (
    <div className="aip-sec">
      <div className="aip-sech"><em>{n}</em>{title}</div>
      <div className="aip-secb">{children}</div>
    </div>
  );
}

const DELTA_CELLS: { key: keyof SimValues; label: string; unit: string; worse: "down" | "up" }[] = [
  { key: "health", label: "Health", unit: "%", worse: "down" },
  { key: "battery_soc", label: "Battery", unit: "%", worse: "down" },
  { key: "battery_temp", label: "Temp", unit: "°C", worse: "up" },
  { key: "signal", label: "Signal", unit: "%", worse: "down" },
];

export function AIInsightPanel({ open, loading, error, analysis, recovering, onClose, onApplyRecovery }: Props) {
  const ai = analysis.ai;
  const chain = analysis.chain ?? [];
  const recs = analysis.recommendations ?? [];
  const before = analysis.before, after = analysis.after, recovered = analysis.recovered;
  const fallback = ai && ai._model === "deterministic-fallback";
  // Backend fallback repeats node names with "->"; real prose never does. Show only prose.
  const cascadeProse = ai && typeof ai.cascade_explained === "string" && !ai.cascade_explained.includes("->")
    ? ai.cascade_explained : "";

  return (
    <div className={"aip-root" + (open ? " on" : "")} aria-hidden={!open}>
      <div className="aip-veil" onClick={onClose} />
      <aside className="aip-panel" role="dialog" aria-label="AI insight">
        <div className="aip-head">
          <div>
            <div className="aip-title">AI Insight</div>
            <div className="aip-sub">
              {analysis.incident_id ?? "No incident"}
              {ai?._model ? ` · ${ai._model}` : ""}
              {ai?._latency_s !== undefined ? ` · ${ai._latency_s}s` : ""}
            </div>
          </div>
          <button className="aip-x" onClick={onClose} aria-label="Close">✕</button>
        </div>

        {loading && (
          <div className="aip-sec">
            <div className="aip-sech"><em>●</em>Investigating…</div>
            <div className="aip-steps">
              <span>Reading live telemetry</span>
              <span>Tracing propagation chain</span>
              <span>Drafting diagnosis</span>
            </div>
            <div className="aip-skel"><i /><i /><i /><i /></div>
          </div>
        )}

        {!loading && error && (
          <div className="aip-sec">
            <div className="aip-sech"><em>!</em>AI unavailable</div>
            <div className="aip-secb"><p className="aip-err">{error}</p>
              <p>Showing deterministic diagnosis instead — the demo continues offline.</p></div>
          </div>
        )}

        {!loading && !error && !ai && (
          <div className="aip-sec">
            <div className="aip-secb"><p>Inject a fault, then click <b>Explain with AI</b>.</p></div>
          </div>
        )}

        {!loading && !error && ai && (
          <>
            {fallback && <div className="aip-badge">deterministic diagnosis — no AI key needed</div>}

            <div className="aip-hero">
              <div className="aip-fault">{ai.what_broke ?? analysis.fault ?? "Fault"}</div>
              {analysis.severity ? <span className="aip-sev">{analysis.severity}</span> : null}
            </div>
            <p className="aip-lede">{ai.summary ?? analysis.root_cause ?? ""}</p>

            {before && after && (
              <div className="aip-grid">
                {DELTA_CELLS.map((c) => {
                  const b = before[c.key] ?? 0, a2 = after[c.key] ?? 0;
                  const d = Math.round((a2 - b) * 10) / 10;
                  const bad = c.worse === "down" ? d < 0 : d > 0;
                  return (
                    <div className="aip-cell" key={c.key}>
                      <span className="aip-cell-l">{c.label}</span>
                      <span className="aip-cell-v">{r0(b)}{c.unit} → {r0(a2)}{c.unit}</span>
                      <span className={"aip-cell-d" + (bad ? " bad" : " ok")}>
                        {d > 0 ? "+" : ""}{d}{c.unit === "°C" ? "°C" : " pts"}
                      </span>
                    </div>
                  );
                })}
              </div>
            )}

            <Section n="01" title="Why it happened">
              <p>{ai.why_broke ?? ""}</p>
              {ai.operational_impact && <p className="aip-dim">{ai.operational_impact}</p>}
            </Section>

            <Section n="02" title="Chain reaction it started">
              <div className="aip-vchain">
                {chain.map((c, i) => (
                  <div className="aip-vstep" key={c.node}>
                    {i > 0 && <span className="aip-varrow">↓</span>}
                    <span className="aip-vnode">{c.node}<b>{c.detail}</b></span>
                  </div>
                ))}
              </div>
              {cascadeProse && <p className="aip-dim">{cascadeProse}</p>}
            </Section>

            <Section n="03" title="How to solve it">
              <ol className="aip-recs">
                {recs.map((r) => <li key={r}>{r}</li>)}
              </ol>
              {ai.how_to_avoid && (
                <div className="aip-avoid"><b>Prevent recurrence — </b>{ai.how_to_avoid}</div>
              )}
              {ai.what_changed_after_recovery && recovered && after && (
                <p className="aip-dim">After recovery: Health {r0(after.health)}→{r0(recovered.health)}% · Battery {r0(after.battery_soc)}→{r0(recovered.battery_soc)}% · Temp {r0(after.battery_temp)}→{r0(recovered.battery_temp)}°C · Signal {r0(after.signal)}→{r0(recovered.signal)}%</p>
              )}
              <button className="btn w btn-inline" onClick={onApplyRecovery} disabled={recovering}>
                {recovering ? "RECOVERING…" : "Apply Recovery"}
              </button>
            </Section>
          </>
        )}
      </aside>
    </div>
  );
}

function r0(n: number | undefined) { return n === undefined || n === null ? "-" : (+n.toFixed(0)).toString(); }
