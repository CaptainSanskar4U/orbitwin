export type View = "landing" | "connect" | "overview" | "home" | "fault" | "telemetry" | "events" | "reports" | "settings";

const ITEMS: { id: View; label: string; icon: string }[] = [
  { id: "home", label: "Home", icon: "M3 11l9-8 9 8M5 9.5V21h5v-6h4v6h5V9.5" },
  { id: "fault", label: "Fault Injection", icon: "M13 2L4 14h7l-1 8 9-12h-7z" },
  { id: "telemetry", label: "Telemetry", icon: "M3 3v18h18M8 17v-5M12 17V8M16 17v-7" },
  { id: "events", label: "Event Log", icon: "M4 4h16v16H4zM8 12l3 3 5-6" },
  { id: "reports", label: "Reports", icon: "M6 3h9l4 4v14H6zM14 3v5h5M9 13h7M9 17h5" },
  { id: "settings", label: "Settings", icon: "M12 12m-3 0a3 3 0 106 0a3 3 0 10-6 0M12 2.5l1.6 2.6 3-.6.7 3 2.8 1.4-1.3 2.7 1.3 2.7-2.8 1.4-.7 3-3-.6L12 21.5l-1.6-2.6-3 .6-.7-3-2.8-1.4 1.3-2.7L3.9 9.7l2.8-1.4.7-3 3 .6z" },
];

export function Sidebar({ view, setView }: { view: View; setView: (v: View) => void }) {
  return (
    <nav>
      {ITEMS.map((it) => (
        <a key={it.id} className={view === it.id ? "on" : ""}
           onClick={() => setView(it.id)} tabIndex={0}
           onKeyDown={(e) => { if (e.key === "Enter") setView(it.id); }}>
          <svg viewBox="0 0 24 24"><path d={it.icon} /></svg>{it.label}
        </a>
      ))}
      <div className="orb"><div className="im"></div>
        <div className="tx"><b>ORBITER-01</b>LEO &nbsp;·&nbsp; 540 km<br />Inclination &nbsp; 97.6°</div>
      </div>
    </nav>
  );
}
