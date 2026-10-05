# Orbitwin — Mission Digital Twin (Twin Lab MVP)

*Break the twin, spare the spacecraft.*

Deterministic satellite failure-rehearsal lab. **UI preserved exactly** from `satellite-dashboard-v3.html` — CSS copied verbatim to `frontend/src/styles/twinlab.css` (verified identical, 23212 chars).

`CREATE → INJECT → SIMULATE → DETECT → DIAGNOSE → RECOMMEND → RECOVER → RECORD`

## Stack
- Frontend: React + Vite + TypeScript (`frontend/`), same dark mission-control CSS, dynamic SVG telemetry
- Backend: FastAPI + SQLModel + SQLite (`backend/`), WebSocket live ticks
- AI (optional): Gemini explainer, backend-only key, deterministic fallback offline

## Run
Backend:
```powershell
cd C:\Users\Captain\Desktop\MVP
python -m venv .venv; .\.venv\Scripts\Activate.ps1
python -m pip install -r backend/requirements.txt
uvicorn app.main:app --reload --app-dir backend
# → http://localhost:8000, docs at /docs
```
Frontend:
```powershell
cd frontend; npm install; npm run dev
# → http://localhost:5173 (proxies /api → :8000, WS → ws://host:8000/ws/simulation)
```

## API
- `GET /api/mission /api/state /api/faults /api/telemetry /api/events /api/incidents /api/analysis /api/settings`
- `POST /api/faults/inject {"fault_type":"battery_degradation"}`
- `POST /api/incidents/{id}/recover`, `GET /api/incidents/{id}`, `GET /api/incidents/{id}/report` (printable HTML → PDF via browser)
- `POST /api/incidents/{id}/explain`, `POST /api/settings/ai-key`, `POST /api/reset`
- `WS /ws/simulation` — ticks `INJECTED→…→RECOMMENDATION_READY`, then `recovery_tick→recovered`

## Faults (deterministic + seeded noise)
`battery_degradation HIGH (64→42%, 32→58°C, 87→62%, health 78→61)`, `power_bus CRITICAL`, `solar_drop MEDIUM`, `thermal_runaway CRITICAL`, `comm_loss HIGH` (flags telemetry-unreliable, craft≠failed), `attitude_drift HIGH`, `sensor_failure HIGH` (Sensors→Attitude→Solar→Power→Comms). Same input → same output (9 pytest checks). One active fault at a time (409 otherwise). Idle stream breathes with seeded ±0.4 noise; RUL projects Battery SoC→20% / Temp→75°C at observed slope.

## AI setup (optional)
Create `backend/.env` (never commit, never paste in chat):
```
GEMINI_API_KEY=<fresh key from AI Studio>
GEMINI_MODEL=gemini-2.0-flash
AI_ENABLED=true
```
Or Settings page → password input → saved server-side only. UI shows `AI: Configured` + auto `AI Insight` under Failure Analysis after each fault; fallback text if no key/quota/offline.

## Demo (hackathon)
1. Open frontend — Health 78%, all NOMINAL
2. Fault Injection → select Battery Degradation → INJECT FAULT
3. Watch Live/ring/chart/subsystems change over ~6s + FAULT DETECTED → ROOT CAUSE
4. Failure Analysis shows chain + HIGH + AI summary → Explain with AI if needed
5. APPLY RECOVERY → watch recover to ~73% → STABLE toast
6. Event Log shows full chain, Reports → Open INC-2026-0001 → Print to PDF, Reset to baseline

## Tests
`python -m pytest backend/tests -v` — 7 faults deterministic, recovery improves, noise bounded + deterministic, RUL sane, invalid fault rejected.

## 2-minute demo script (say this)
1. (0:00) "ORBITER-01, all green, live telemetry — Health 78%." Point at breathing numbers.
2. (0:20) "I'll inject Battery Degradation — a real backend incident, not a video." Click INJECT FAULT.
3. (0:25–1:00) Hands off. Narrate the order: "Battery falls first… voltage follows… heaters kick in… temperature climbs… comms degrades last. That order IS the EPS→TCS→COMMS physics."
4. (1:00) "System detected it, traced the chain, rated HIGH, and projects Temp critical in ~4 sim-minutes without action. AI summary on top."
5. (1:20) Click APPLY RECOVERY. "Watch it save itself — 61 back to 73."
6. (1:50) Reports → Replay: "That exact failure, replayed from recorded telemetry." → Open report → Print to PDF. "Every number traceable. Thank you."

## Judge Q&A cheat sheet
- **Which 3 subsystems, what connects them?** "EPS→TCS→COMMS: battery SoC drives bus voltage; low voltage forces heaters on; heat degrades comms amplifiers. Linearized coupling rules, deterministic — same fault, same cascade, every run. ADCS/Sensors join in attitude and sensor faults."
- **Walk me through battery degradation.** "SoC 64→42, voltage 100→82, heaters +6°C, temp 32→58, signal 87→62. Watch the chain row — order never changes because the coupling does."
- **Synced twin or pretty simulation?** "Synchronized: every pixel is a WebSocket tick persisted to SQLite. Replay in Reports re-renders the same incident from stored frames — a recording couldn't do that with a different fault."
- **How checked believable?** "Bounded magnitudes inside LEO EPS/TCS envelopes, seeded sub-1% noise, out-of-envelope values flag instead of rendering silently, 9 automated checks including determinism."
- **Why no AI key / offline?** "Deterministic core is the product — explainable with no API key. Gemini is an optional narrator, grounded strictly on real deltas, and the demo runs 100% offline."

## Roadmap (say one sentence on stage)
"Tonight: deterministic twin. Next: TimescaleDB + SimPy/OpenModelica physics, Basilisk dynamics, NASA battery-ageing data to calibrate RUL, Kalman state estimation, 3D view."
