import { useEffect, useRef } from "react";
import overviewHtml from "../onboarding/overview.html?raw";

/** Satellite Overview page (subsystems + AI agent), MAKE CLONE transitions to the dashboard. */
export function SatelliteOverview({ onClone }: { onClone: () => void }) {
  const frameRef = useRef<HTMLIFrameElement>(null);
  const nextRef = useRef(onClone);
  useEffect(() => { nextRef.current = onClone; }, [onClone]);

  useEffect(() => {
    const frame = frameRef.current;
    if (!frame) return;
    let btn: HTMLButtonElement | null = null;
    const go = () => nextRef.current();
    const attach = () => {
      try {
        btn = frame.contentDocument?.querySelector<HTMLButtonElement>("#mk") ?? null;
        btn?.addEventListener("click", go);
      } catch {
        // ignore; user can still navigate via dashboard tabs
      }
    };
    frame.addEventListener("load", attach);
    attach();
    return () => {
      frame.removeEventListener("load", attach);
      btn?.removeEventListener("click", go);
    };
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
