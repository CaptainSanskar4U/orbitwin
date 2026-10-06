import { useEffect, useRef } from "react";
import landingHtml from "../onboarding/landing.html?raw";

/**
 * Marketing landing + Scientist Login (demo auth).
 * Handoff is driven by the form submit itself (mirrors the page's own
 * ~1.1s auth + ~1.5s close timing) with the "Access granted" label as a
 * fast path — so a missed poll can never strand the user on landing.
 * Also calms known jank sources inside the frame (smooth-scroll easing,
 * lagging cursor follower, lingering boot splash). No visual changes.
 */
export function LandingPage({ onLogin }: { onLogin: () => void }) {
  const frameRef = useRef<HTMLIFrameElement>(null);
  const nextRef = useRef(onLogin);
  useEffect(() => { nextRef.current = onLogin; }, [onLogin]);

  useEffect(() => {
    const frame = frameRef.current;
    if (!frame) return;
    const born = Date.now();
    let done = false;
    let fallback: number | undefined;
    let hooked = false;
    const finish = (delay: number) => {
      if (done) return;
      done = true;
      window.clearTimeout(fallback);
      window.setTimeout(() => nextRef.current(), delay);
    };

    const calm = () => {
      try {
        const doc = frame.contentDocument;
        if (!doc) return;
        if (!doc.getElementById("lp-fix")) {
          const css = doc.createElement("style");
          css.id = "lp-fix";
          css.textContent =
            "html{scroll-behavior:auto !important}" +
            ".cur{display:none !important}" +
            ".stage{will-change:auto}";
          doc.head.appendChild(css);
        }
        // boot splash watchdog: never let it veil the hero
        const boot = doc.querySelector(".boot");
        if (boot && !boot.classList.contains("x") && Date.now() - born > 2500) {
          boot.classList.add("x");
        }
        // "Get Started" points at #contact — reroute it to start login instead
        if (!hooked) {
          const form = doc.getElementById("slForm") as HTMLFormElement | null;
          const opener = doc.getElementById("slOpen") as HTMLButtonElement | null;
          if (form && opener) {
            hooked = true;
            doc.querySelectorAll('a[aria-label="Get Started"]').forEach((a) => {
              a.addEventListener("click", (e) => {
                e.preventDefault();
                opener.click();
              });
            });
            form.addEventListener("submit", () => {
              const u = (doc.getElementById("slUser") as HTMLInputElement | null)?.value.trim() ?? "";
              const p = (doc.getElementById("slPass") as HTMLInputElement | null)?.value ?? "";
              if (!u || !p) return; // page shows inline error; stay put
              window.clearTimeout(fallback);
              fallback = window.setTimeout(() => finish(0), 3000);
            });
          }
        }
        // an error bubble cancels a pending fallback (wrong/empty attempt)
        const msg = doc.getElementById("slMsg");
        if (msg?.classList.contains("err")) window.clearTimeout(fallback);
        // fast path: page's own success label
        if (doc.getElementById("slGoT")?.textContent === "Access granted") {
          window.clearTimeout(fallback);
          finish(700);
        }
      } catch {
        // iframe not ready yet; retry next poll
      }
    };
    const poll = window.setInterval(calm, 400);
    calm();
    return () => {
      window.clearInterval(poll);
      window.clearTimeout(fallback);
    };
  }, []);

  return (
    <div className="onboard-frame">
      <iframe
        ref={frameRef}
        title="Orbitwin"
        srcDoc={landingHtml}
        sandbox="allow-scripts allow-same-origin allow-forms"
        style={{ width: "100vw", height: "100vh", border: 0, display: "block", background: "#01040a" }}
      />
    </div>
  );
}
