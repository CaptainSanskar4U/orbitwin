import { useEffect, useRef } from "react";
import popupHtml from "../onboarding/popup.html?raw";

/** Initial satellite-connection / loading screen (Popup.html, pixel-perfect via isolated iframe). */
export function ConnectSatellite({ onConnect }: { onConnect: () => void }) {
  const frameRef = useRef<HTMLIFrameElement>(null);
  const nextRef = useRef(onConnect);
  useEffect(() => { nextRef.current = onConnect; }, [onConnect]);

  useEffect(() => {
    const frame = frameRef.current;
    if (!frame) return;
    let timer: number | undefined;
    let btn: HTMLButtonElement | null = null;
    const go = () => {
      window.clearTimeout(timer);
      // Original Popup animation takes ~1800ms (CONNECTING -> CONNECTED);
      // give it a beat to display CONNECTED, then advance seamlessly.
      timer = window.setTimeout(() => nextRef.current(), 900);
    };
    const attach = () => {
      try {
        btn = frame.contentDocument?.querySelector<HTMLButtonElement>("#btn") ?? null;
        btn?.addEventListener("click", go);
      } catch {
        // cross-document access blocked: fall back to timed advance only after user gesture
      }
    };
    frame.addEventListener("load", attach);
    // srcDoc usually already loaded before listener attaches
    attach();
    return () => {
      window.clearTimeout(timer);
      frame.removeEventListener("load", attach);
      btn?.removeEventListener("click", go);
    };
  }, []);

  return (
    <div className="onboard-frame">
      <iframe
        ref={frameRef}
        title="Connect Satellite"
        srcDoc={popupHtml}
        sandbox="allow-scripts allow-same-origin"
        style={{ width: "100vw", height: "100vh", border: 0, display: "block", background: "#020a10" }}
      />
    </div>
  );
}
