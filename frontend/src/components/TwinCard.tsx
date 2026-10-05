import { SATIMG } from "../data/satimg";
import { codeOf } from "../data/codes";

const ORDER = ["Solar Panels", "Battery", "Thermal", "Communication", "Attitude", "Sensors"];

export function TwinCard({ subsystems }: { subsystems: Record<string, string> }) {
  const color = (s: string) =>
    s === "NOMINAL" ? "#2fd16f" : s === "DEGRADED" ? "#f5a524" : s === "WARNING" ? "#f5a524" : "#e5242b";
  return (
    <section className="card twin">
      <h2>Satellite Digital Twin</h2>
      <div className="tag">SAT-01<br />DIGITAL TWIN</div>
      <img className="satimg" alt="Satellite digital twin" src={SATIMG} />
      <div className="st">
        {ORDER.map((k) => (
          <div key={k}>
            <span className="dot" style={{ background: color(subsystems[k] || "NOMINAL") }}></span>
            {k}<span style={{ color: "#5b6670", fontSize: 10, marginLeft: 6, marginRight: "auto" }}>{codeOf(k)}</span>
            <span style={{ color: subsystems[k] === "NOMINAL" ? "#2fd16f" : color(subsystems[k]), marginLeft: 0 }}>{subsystems[k] || "Nominal"}</span>
          </div>
        ))}
      </div>
    </section>
  );
}
