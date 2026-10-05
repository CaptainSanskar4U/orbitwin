"""Deterministic fault library. Same input -> same output. No randomness."""

BASELINE = {
    "health": 78.0,
    "power": 78.0,
    "battery_soc": 64.0,
    "solar_power": 52.0,
    "battery_temp": 32.0,
    "cpu_temp": 41.0,
    "signal": 87.0,
    "data_rate": 4.2,
    "voltage": 100.0,
}

FAULTS = {
    "battery_degradation": {
        "label": "Battery Degradation",
        "severity": "HIGH",
        "root_cause": "Battery degradation due to excessive load.",
        "after": {"health": 61.0, "power": 64.0, "battery_soc": 42.0, "solar_power": 48.0,
                  "battery_temp": 58.0, "cpu_temp": 52.0, "signal": 62.0, "data_rate": 2.4, "voltage": 82.0},
        "recovered": {"health": 73.0, "power": 74.0, "battery_soc": 51.0, "solar_power": 51.0,
                      "battery_temp": 44.0, "cpu_temp": 45.0, "signal": 78.0, "data_rate": 3.6, "voltage": 93.0},
        "chain": [
            {"node": "Battery", "detail": "↓ 42%"},
            {"node": "Voltage", "detail": "↓ 18%"},
            {"node": "Heaters", "detail": "↑ 6°C"},
            {"node": "Temperature", "detail": "↑ 26°C"},
            {"node": "Communication", "detail": "↓ 25%"},
        ],
        "affected": ["Power", "Thermal", "Communication"],
        "subsystems": {"Solar Panels": "NOMINAL", "Battery": "CRITICAL", "Thermal": "WARNING",
                       "Communication": "DEGRADED", "Attitude": "NOMINAL", "Sensors": "NOMINAL"},
        "recommendations": ["Isolate battery bus B", "Reduce non-critical payload load",
                            "Enter safe mode if battery continues falling"],
    },
    "power_bus": {
        "label": "Power Bus Failure",
        "severity": "CRITICAL",
        "root_cause": "Primary power distribution bus failure.",
        "after": {"health": 52.0, "power": 41.0, "battery_soc": 38.0, "solar_power": 44.0,
                  "battery_temp": 46.0, "cpu_temp": 55.0, "signal": 55.0, "data_rate": 1.8, "voltage": 68.0},
        "recovered": {"health": 70.0, "power": 69.0, "battery_soc": 50.0, "solar_power": 50.0,
                      "battery_temp": 38.0, "cpu_temp": 46.0, "signal": 74.0, "data_rate": 3.2, "voltage": 90.0},
        "chain": [
            {"node": "Power Bus", "detail": "FAILED"},
            {"node": "Subsystem Power", "detail": "↓ 37%"},
            {"node": "Battery", "detail": "↓ 26%"},
            {"node": "Thermal", "detail": "unstable ↑"},
            {"node": "Communication", "detail": "↓ 32%"},
        ],
        "affected": ["Power", "Thermal", "Communication"],
        "subsystems": {"Solar Panels": "DEGRADED", "Battery": "CRITICAL", "Thermal": "WARNING",
                       "Communication": "CRITICAL", "Attitude": "DEGRADED", "Sensors": "NOMINAL"},
        "recommendations": ["Isolate failed power bus", "Switch to redundant bus",
                            "Reduce non-critical payload load"],
    },
    "solar_drop": {
        "label": "Solar Power Drop",
        "severity": "MEDIUM",
        "root_cause": "Reduced solar generation due to array shadowing/degradation.",
        "after": {"health": 66.0, "power": 61.0, "battery_soc": 47.0, "solar_power": 22.0,
                  "battery_temp": 33.0, "cpu_temp": 42.0, "signal": 80.0, "data_rate": 3.4, "voltage": 88.0},
        "recovered": {"health": 75.0, "power": 74.0, "battery_soc": 56.0, "solar_power": 46.0,
                      "battery_temp": 33.0, "cpu_temp": 42.0, "signal": 84.0, "data_rate": 3.9, "voltage": 95.0},
        "chain": [
            {"node": "Solar Power", "detail": "↓ 30W"},
            {"node": "Charging", "detail": "↓ reduced"},
            {"node": "Battery SoC", "detail": "↓ 17%"},
            {"node": "Available Power", "detail": "↓ 17%"},
            {"node": "Payload", "detail": "restricted"},
        ],
        "affected": ["Solar Panels", "Power", "Battery"],
        "subsystems": {"Solar Panels": "CRITICAL", "Battery": "WARNING", "Thermal": "NOMINAL",
                       "Communication": "NOMINAL", "Attitude": "NOMINAL", "Sensors": "NOMINAL"},
        "recommendations": ["Reduce payload consumption", "Prioritize battery charging",
                            "Enter power-saving mode"],
    },
    "thermal_runaway": {
        "label": "Thermal Runaway",
        "severity": "CRITICAL",
        "root_cause": "Uncontrolled thermal increase in battery compartment.",
        "after": {"health": 55.0, "power": 60.0, "battery_soc": 50.0, "solar_power": 48.0,
                  "battery_temp": 71.0, "cpu_temp": 68.0, "signal": 60.0, "data_rate": 2.1, "voltage": 85.0},
        "recovered": {"health": 71.0, "power": 71.0, "battery_soc": 55.0, "solar_power": 50.0,
                      "battery_temp": 42.0, "cpu_temp": 47.0, "signal": 76.0, "data_rate": 3.4, "voltage": 92.0},
        "chain": [
            {"node": "Temperature", "detail": "↑ 39°C"},
            {"node": "Thermal Protection", "detail": "active"},
            {"node": "Payload Power", "detail": "↓ reduced"},
            {"node": "Communication", "detail": "↓ 27%"},
            {"node": "Safe-mode", "detail": "possible"},
        ],
        "affected": ["Thermal", "Power", "Communication"],
        "subsystems": {"Solar Panels": "NOMINAL", "Battery": "WARNING", "Thermal": "CRITICAL",
                       "Communication": "DEGRADED", "Attitude": "NOMINAL", "Sensors": "WARNING"},
        "recommendations": ["Disable non-critical heat sources", "Reduce payload load",
                            "Enter thermal safe mode"],
    },
    "comm_loss": {
        "label": "Communication Loss",
        "severity": "HIGH",
        "root_cause": "Communication subsystem failure; telemetry visibility lost (spacecraft may be healthy).",
        "after": {"health": 68.0, "power": 74.0, "battery_soc": 60.0, "solar_power": 50.0,
                  "battery_temp": 33.0, "cpu_temp": 42.0, "signal": 12.0, "data_rate": 0.3, "voltage": 97.0},
        "recovered": {"health": 76.0, "power": 77.0, "battery_soc": 62.0, "solar_power": 51.0,
                      "battery_temp": 33.0, "cpu_temp": 42.0, "signal": 80.0, "data_rate": 3.8, "voltage": 99.0},
        "chain": [
            {"node": "Signal", "detail": "↓ 75%"},
            {"node": "Packet Loss", "detail": "↑ high"},
            {"node": "Data Rate", "detail": "↓ 3.9 Mbps"},
            {"node": "Telemetry", "detail": "unreliable"},
            {"node": "Visibility", "detail": "lost (craft ≠ failed)"},
        ],
        "affected": ["Communication", "Sensors"],
        "subsystems": {"Solar Panels": "NOMINAL", "Battery": "NOMINAL", "Thermal": "NOMINAL",
                       "Communication": "FAILED", "Attitude": "NOMINAL", "Sensors": "WARNING"},
        "recommendations": ["Switch communication mode", "Reduce transmission load",
                            "Attempt redundant communication link"],
        "telemetry_unreliable": True,
    },
    "attitude_drift": {
        "label": "Attitude Drift",
        "severity": "HIGH",
        "root_cause": "Attitude control instability causing pointing error.",
        "after": {"health": 62.0, "power": 63.0, "battery_soc": 48.0, "solar_power": 28.0,
                  "battery_temp": 34.0, "cpu_temp": 44.0, "signal": 58.0, "data_rate": 2.2, "voltage": 89.0},
        "recovered": {"health": 72.0, "power": 72.0, "battery_soc": 55.0, "solar_power": 47.0,
                      "battery_temp": 33.0, "cpu_temp": 43.0, "signal": 77.0, "data_rate": 3.5, "voltage": 94.0},
        "chain": [
            {"node": "Attitude Error", "detail": "↑ high"},
            {"node": "Pointing", "detail": "↓ degraded"},
            {"node": "Solar", "detail": "↓ 24W"},
            {"node": "Signal", "detail": "↓ 29%"},
            {"node": "Battery", "detail": "↓ 16%"},
        ],
        "affected": ["Attitude", "Solar Panels", "Communication", "Power"],
        "subsystems": {"Solar Panels": "WARNING", "Battery": "WARNING", "Thermal": "NOMINAL",
                       "Communication": "DEGRADED", "Attitude": "CRITICAL", "Sensors": "NOMINAL"},
        "recommendations": ["Reduce payload activity", "Stabilize attitude",
                            "Reacquire optimal pointing"],
    },
    "sensor_failure": {
        "label": "Sensor Failure",
        "severity": "HIGH",
        "root_cause": "Star-tracker drift causing attitude knowledge error.",
        "after": {"health": 64.0, "power": 70.0, "battery_soc": 55.0, "solar_power": 40.0,
                  "battery_temp": 34.0, "cpu_temp": 45.0, "signal": 68.0, "data_rate": 2.8, "voltage": 93.0},
        "recovered": {"health": 74.0, "power": 75.0, "battery_soc": 60.0, "solar_power": 49.0,
                      "battery_temp": 33.0, "cpu_temp": 43.0, "signal": 82.0, "data_rate": 3.7, "voltage": 97.0},
        "chain": [
            {"node": "Sensors", "detail": "drift ↑"},
            {"node": "Attitude", "detail": "error ↑"},
            {"node": "Solar", "detail": "↓ 12W"},
            {"node": "Power", "detail": "↓ 8%"},
            {"node": "Communication", "detail": "↓ 19%"},
        ],
        "affected": ["Sensors", "Attitude", "Solar Panels", "Power", "Communication"],
        "subsystems": {"Solar Panels": "WARNING", "Battery": "NOMINAL", "Thermal": "NOMINAL",
                       "Communication": "DEGRADED", "Attitude": "WARNING", "Sensors": "CRITICAL"},
        "recommendations": ["Switch to redundant sensor suite", "Reduce payload activity",
                            "Re-calibrate attitude knowledge"],
    },
}

PHASES = ["INJECTED", "PRIMARY_DEGRADED", "SECONDARY", "TERTIARY",
          "DETECTED", "ROOT_CAUSE", "RECOMMENDATION_READY"]

EVENT_TEXT = {
    "INJECTED": "Fault injected",
    "PRIMARY_DEGRADED": "Primary subsystem degrading",
    "SECONDARY": "Secondary effect observed",
    "TERTIARY": "Tertiary propagation observed",
    "DETECTED": "Anomaly detected",
    "ROOT_CAUSE": "Root cause identified",
    "RECOMMENDATION_READY": "Recovery recommendation generated",
}


def interpolate(a: dict, b: dict, t: float) -> dict:
    """Deterministic linear interpolation t in [0,1]."""
    return {k: round(a[k] + (b[k] - a[k]) * t, 2) for k in a}


import math


def _hash01(seed: int) -> float:
    """Deterministic pseudo-random in [0,1). No RNG state — same seed, same value."""
    x = (seed * 2654435761) % 4294967296
    x ^= x >> 15
    x = (x * 2246822519) % 4294967296
    return (x % 10000) / 10000.0


# Max wobble amplitude per metric — small enough to stay believable.
WOBBLE_AMP = {"health": 0.3, "power": 0.3, "battery_soc": 0.3, "solar_power": 0.4,
              "battery_temp": 0.3, "cpu_temp": 0.3, "signal": 0.4, "data_rate": 0.05,
              "voltage": 0.3}


def tick_noise(state: dict, tick: int, t: float) -> dict:
    """Seeded measurement noise, zero at endpoints (t=0,t=1) so
    baseline and final states stay exact and tests hold."""
    env = 0.0 if t <= 0.0 or t >= 1.0 else math.sin(math.pi * t)
    out = {}
    for i, (k, v) in enumerate(state.items()):
        n = (_hash01(tick * 97 + i * 13 + 7) - 0.5) * 2  # [-1,1)
        out[k] = round(v + n * WOBBLE_AMP.get(k, 0.3) * env, 2)
    return out


def nominal_wobble(second: int, base: dict | None = None) -> dict:
    """Living idle stream: tiny deterministic wobble so the dashboard
    breathes before any fault. Pure function of wall-clock second."""
    src = base or BASELINE
    out = {}
    for i, (k, v) in enumerate(src.items()):
        n = (_hash01(second * 31 + i * 17 + 3) - 0.5) * 2
        out[k] = round(v + n * WOBBLE_AMP.get(k, 0.3) * 0.6, 2)
    return out


def rul_estimate(before: dict, after: dict, ticks: int = 6) -> dict | None:
    """Prognostics lite: linear projection of the observed drain slope.
    Returns soonest of (battery SoC -> 20%) or (battery temp -> 75C).
    Honest sim-time units: 1 tick = 1 sim-minute of accelerated mission time."""
    cands = []
    soc_slope = (after["battery_soc"] - before["battery_soc"]) / ticks
    if soc_slope < -0.05:
        n = math.ceil((20.0 - after["battery_soc"]) / soc_slope)
        cands.append({"metric": "Battery SoC", "limit": "20%",
                      "sim_min": max(n, 0), "trend": f"{soc_slope:.1f}%/sim-min"})
    tmp_slope = (after["battery_temp"] - before["battery_temp"]) / ticks
    if tmp_slope > 0.05:
        n = math.ceil((75.0 - after["battery_temp"]) / tmp_slope)
        cands.append({"metric": "Battery Temp", "limit": "75°C",
                      "sim_min": max(n, 0), "trend": f"+{tmp_slope:.1f}°C/sim-min"})
    if not cands:
        return None
    soonest = min(cands, key=lambda c: c["sim_min"])
    soonest["note"] = "At observed fault slope, no recovery."
    return soonest


def simulate_ticks(fault_type: str):
    """Yield 7 deterministic ticks baseline -> after (with seeded noise)."""
    fault = FAULTS[fault_type]
    for i, phase in enumerate(PHASES):
        t = i / (len(PHASES) - 1)
        clean = interpolate(BASELINE, fault["after"], t)
        yield {"tick": i, "phase": phase, "state": tick_noise(clean, i, t)}


def recover_ticks(fault_type: str, from_state: dict | None = None):
    fault = FAULTS[fault_type]
    start = from_state or fault["after"]
    steps = ["RECOVERY_STARTED", "RECOVERING", "RECOVERING", "STABILIZED"]
    for i, phase in enumerate(steps):
        t = (i + 1) / len(steps)
        yield {"tick": i, "phase": phase, "state": interpolate(start, fault["recovered"], t)}
