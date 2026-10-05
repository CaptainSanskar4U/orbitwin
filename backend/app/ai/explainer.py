"""Gemini explainer - backend only. Deterministic core stays truth."""
import json
import time
import httpx
from ..simulation.faults import FAULTS, BASELINE


def build_prompt(fault_type: str, before: dict, after: dict, recovered: dict | None = None) -> str:
    f = FAULTS[fault_type]
    return (
        "You are a spacecraft operations assistant. Explain ONLY the data given. "
        "Do not invent numbers.\n"
        f"Fault: {f['label']} ({f['severity']})\n"
        f"Root cause (deterministic): {f['root_cause']}\n"
        f"Before: {json.dumps(before)}\nAfter fault: {json.dumps(after)}\n"
        f"After recovery: {json.dumps(recovered or {})}\n"
        f"Chain: {json.dumps(f['chain'])}\nAffected: {', '.join(f['affected'])}\n"
        "Return JSON with keys: summary, what_broke, why_broke, cascade_explained, "
        "operational_impact, how_to_avoid, what_changed_after_recovery."
    )


async def explain_with_gemini(api_key: str, model: str, fault_type: str,
                              before: dict, after: dict, recovered: dict | None = None) -> dict:
    """Call Gemini generateContent. Raises on failure so caller can fallback."""
    url = f"https://generativelanguage.googleapis.com/v1beta/models/{model}:generateContent?key={api_key}"
    prompt = build_prompt(fault_type, before, after, recovered)
    t0 = time.time()
    async with httpx.AsyncClient(timeout=12.0) as client:
        r = await client.post(url, json={"contents": [{"parts": [{"text": prompt}]}],
                                         "generationConfig": {"responseMimeType": "application/json",
                                                              "temperature": 0.2}})
        r.raise_for_status()
        data = r.json()
    text = data["candidates"][0]["content"]["parts"][0]["text"]
    try:
        parsed = json.loads(text)
    except Exception:
        parsed = {"summary": text[:1200]}
    parsed["_model"] = model
    parsed["_latency_s"] = round(time.time() - t0, 2)
    return parsed


AVOID_TIPS = {
    "battery_degradation": "Keep depth-of-discharge above 30% and shed non-critical payload before heater demand saturates the bus.",
    "power_bus": "Balance loads across redundant buses and rehearse bus-switch drills before eclipse seasons.",
    "solar_drop": "Maintain panel pointing margins and keep a minimum charge reserve for shadow passes.",
    "thermal_runaway": "Enforce thermal guardrails on payload duty cycles and verify radiator view factors after maneuvers.",
    "comm_loss": "Schedule regular link-budget checks and keep a redundant low-rate path configured.",
    "attitude_drift": "Recalibrate attitude knowledge after propulsive events and bound payload activity during recovery.",
    "sensor_failure": "Cross-check the star-tracker against sun sensors and keep the redundant suite warm.",
}


def _signed(v: float, unit: str = "") -> str:
    return f"{'+' if v > 0 else ''}{v:g}{unit}"


def deterministic_fallback(fault_type: str, before: dict, after: dict, recovered: dict | None = None) -> dict:
    f = FAULTS[fault_type]
    rec = recovered or f["recovered"]
    d = {k: round(after.get(k, 0) - before.get(k, 0), 1) for k in before}
    impact = (f"Health {_signed(d['health'])} pts · Battery {_signed(d['battery_soc'])} pts · "
              f"Temp {_signed(d['battery_temp'], '°C')} · Signal {_signed(d['signal'])} pts. "
              f"Severity {f['severity']}.")
    after_rec = (f"Health {after['health']:g}→{rec['health']:g}% · "
                 f"Battery {after['battery_soc']:g}→{rec['battery_soc']:g}% · "
                 f"Temp {after['battery_temp']:g}→{rec['battery_temp']:g}°C · "
                 f"Signal {after['signal']:g}→{rec['signal']:g}%.")
    return {
        "summary": f"{f['label']}: {f['root_cause']} Affected: {', '.join(f['affected'])}.",
        "what_broke": f['label'],
        "why_broke": f['root_cause'],
        "cascade_explained": " -> ".join([c["node"] for c in f["chain"]]),
        "operational_impact": impact,
        "how_to_avoid": AVOID_TIPS.get(fault_type, "Track early drift in the affected signals and act before limits are reached."),
        "what_changed_after_recovery": after_rec,
        "_model": "deterministic-fallback",
    }
