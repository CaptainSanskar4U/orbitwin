# BUILD TWIN LAB — FULL-STACK WORKING MVP

You are a senior full-stack engineer building the MVP of **Mission Digital Twin**, a satellite failure-rehearsal and decision-support platform.

The existing project contains a frontend HTML dashboard called **Twin Lab**.

Your job is to turn the existing UI into a **fully functional local full-stack application**.

## 1. MOST IMPORTANT RULE

**DO NOT redesign the existing UI.**

The current HTML dashboard already has the visual direction I want:

* dark aerospace operations dashboard
* premium, minimal, realistic
* black / charcoal background
* thin borders
* restrained typography
* green nominal state
* red fault state
* blue telemetry
* compact technical layout
* no unnecessary gradients
* no generic AI dashboard styling
* no huge cards
* no unnecessary animations
* no fake futuristic decorations

Preserve the existing visual design, spacing, hierarchy, typography and overall composition as closely as possible.

You are upgrading the existing Twin Lab into a working application.

Do not replace it with a completely different design.

---

# 2. PRODUCT

Product name:

**Mission Digital Twin**

Current MVP:

**Twin Lab**

Twin Lab simulates a satellite mission and allows an operator to:

CREATE SATELLITE
→ INJECT FAILURE
→ SIMULATE CASCADE
→ DETECT
→ DIAGNOSE
→ RECOMMEND
→ APPLY RECOVERY
→ OBSERVE RESULT
→ RECORD INCIDENT

The system must be deterministic and explainable.

The same fault with the same initial conditions should produce the same result.

---

# 3. RECOMMENDED STACK

Use:

### Frontend

* React
* Vite
* TypeScript
* CSS
* Recharts or lightweight SVG charts if necessary

### Backend

* Python
* FastAPI
* Pydantic
* SQLModel

### Database

* SQLite

### Real-time communication

* WebSocket

### Report

* Generate an incident report from the backend
* PDF download is preferred
* If PDF generation creates unnecessary complexity, generate a clean HTML report first and make the architecture ready for PDF generation

Everything must run locally.

No authentication is required for this MVP.

No external database is required.

No paid API is required.

---

# 4. PROJECT STRUCTURE

Create a clean structure similar to:

frontend/
src/
components/
pages/
hooks/
services/
types/
data/
styles/

backend/
app/
main.py
models/
schemas/
api/
simulation/
services/
database/
websocket/
reports/

README.md

Provide exact commands to run both frontend and backend.

Example:

Backend:
python -m venv .venv
pip install -r requirements.txt
uvicorn app.main:app --reload

Frontend:
npm install
npm run dev

---

# 5. EXISTING DASHBOARD

The existing page already contains:

## Header

* TesLearn
* DIGITAL TWIN · SATELLITE OPERATIONS
* Mission: ORBITER-01
* SIMULATION ACTIVE
* clock
* operator icon

Keep this structure.

Change branding only if necessary to represent:

**Mission Digital Twin / Twin Lab**

Do not destroy the existing visual identity.

---

# 6. LEFT SIDEBAR

Keep:

* Home
* Fault Injection
* Telemetry
* Event Log
* Reports
* Settings

These should become functional navigation states.

### Home

Show current mission overview.

### Fault Injection

Main working page.

### Telemetry

Show detailed live telemetry.

### Event Log

Show every simulation event chronologically.

### Reports

Show generated incident reports.

### Settings

Show basic simulation configuration.

Do not create fake pages.

Every page must either display real application state or clearly show that the feature is not part of the MVP.

---

# 7. SATELLITE MODEL

Use:

ORBITER-01

Orbit:

LEO

Altitude:

540 km

Inclination:

97.6°

Subsystems:

1. Solar Panels
2. Battery
3. Thermal
4. Communication
5. Attitude
6. Sensors

Each subsystem must have a real state:

* NOMINAL
* DEGRADED
* WARNING
* CRITICAL
* FAILED

The dashboard must update subsystem states when a fault is injected.

---

# 8. INITIAL SATELLITE STATE

Start with:

Health = 78%

Power = 78%

Battery SoC = 64%

Solar Power = 52 W

Battery Temperature = 32°C

CPU Temperature = 41°C

Signal Strength = 87%

Data Rate = 4.2 Mbps

All subsystems:

NOMINAL

These values should come from the backend simulation state.

Do NOT hard-code them into the frontend.

---

# 9. FAULT INJECTION

The most important new feature.

Under **Fault Injection**, create a clean operator control.

Example:

FAULT TYPE

[ Select Failure ▼ ]

Then:

[ INJECT FAULT ]

Do not use a giant form.

Keep it compact and consistent with the existing UI.

---

# 10. MVP FAILURE LIBRARY

Implement these six failures first.

## 01 — Battery Degradation

Severity:

HIGH

Root cause:

Battery degradation due to excessive load.

Cascade:

Battery decreases
→ voltage decreases
→ heaters increase
→ temperature increases
→ communication begins degrading

Example result:

Battery:

64% → 42%

Voltage:

100% → 82%

Temperature:

32°C → 58°C

Signal:

87% → 62%

Affected:

Power
Thermal
Communication

---

## 02 — Power Bus Failure

Severity:

CRITICAL

Root cause:

Primary power distribution bus failure.

Cascade:

Power Bus failure
→ subsystem power loss
→ battery drain
→ thermal instability
→ communication degradation

Affected:

Power
Thermal
Communication

---

## 03 — Solar Power Drop

Severity:

MEDIUM / HIGH

Root cause:

Reduced solar generation.

Cascade:

Solar power decreases
→ battery charging decreases
→ battery SoC falls
→ available power decreases
→ payload restrictions begin

Affected:

Solar Panels
Power
Battery

---

## 04 — Thermal Runaway

Severity:

CRITICAL

Root cause:

Uncontrolled thermal increase.

Cascade:

Temperature increases
→ thermal protection activates
→ payload power reduced
→ communication performance decreases
→ safe-mode condition may occur

Affected:

Thermal
Power
Communication

---

## 05 — Communication Loss

Severity:

HIGH

Root cause:

Communication subsystem failure.

Cascade:

Signal strength decreases
→ packet loss increases
→ data rate decreases
→ telemetry becomes unreliable
→ operator loses visibility

Affected:

Communication
Sensors

Important:

The system must clearly distinguish:

**actual spacecraft condition**

from

**loss of telemetry visibility**

Do not falsely claim that the satellite itself is failing when only communication is unavailable.

---

## 06 — Attitude Drift

Severity:

HIGH

Root cause:

Attitude control instability.

Cascade:

Attitude error increases
→ pointing accuracy decreases
→ solar generation decreases
→ communication signal weakens
→ battery begins falling

Affected:

Attitude
Solar Panels
Communication
Power

---

# 11. SIMULATION ENGINE

Create a backend simulation engine.

Example:

simulation/
engine.py
faults.py
propagation.py
recovery.py
scenarios.py

The engine receives:

* current satellite state
* selected fault
* simulation configuration

and produces:

* updated state
* telemetry
* detected anomalies
* root cause
* propagation chain
* affected subsystems
* severity
* recommendations
* predicted outcome

Do NOT use random values for the primary MVP.

Use deterministic formulas.

---

# 12. IMPORTANT DESIGN PRINCIPLE

Every fault must create a **chain reaction**.

Do NOT simply change one number.

Bad:

Battery = 42%

Good:

Battery degradation
↓
Voltage drops
↓
Heaters increase
↓
Temperature rises
↓
Communication performance decreases
↓
Overall satellite health decreases

The dashboard should visually communicate this chain.

---

# 13. SIMULATION TIMELINE

When the operator clicks:

**INJECT FAULT**

do not instantly jump to the final state.

Run a short deterministic simulation.

Example:

0 sec
Fault injected

1 sec
Primary subsystem begins degrading

2 sec
Secondary effect appears

3 sec
Third effect appears

4 sec
Anomaly detected

5 sec
Root cause identified

6 sec
Recovery recommendation generated

Then freeze the simulation at the final predicted state.

The user should feel that the system actually simulated the failure.

Use WebSocket updates from FastAPI to the frontend.

---

# 14. TELEMETRY

Telemetry must update during the simulation.

Track at minimum:

* Battery SoC
* Solar Power
* Temperature
* Signal Strength
* Power
* Data Rate
* CPU Temperature
* Voltage

The existing Telemetry History chart should become dynamic.

When a fault occurs:

mark the exact simulation time with:

**FAULT INJECTED**

Use a red vertical marker.

The graph should visibly change after the fault.

Do not create fake random graphs.

Generate the graph from the simulation telemetry stored by the backend.

---

# 15. LIVE STATE

The existing Live State card must become dynamic.

Update:

Overall Health

Power

Battery SoC

Solar Power

Battery Temperature

CPU Temperature

Signal Strength

Data Rate

All values must come from the current simulation state.

The circular health indicator must also update.

Example:

Normal:

78%

After Battery Degradation:

61%

---

# 16. SATELLITE SUBSYSTEM STATUS

The satellite card must react to the simulation.

Example:

Before:

Battery — Nominal
Thermal — Nominal
Communication — Nominal

After battery degradation:

Battery — CRITICAL
Thermal — WARNING
Communication — DEGRADED

Use the existing visual language.

Do not introduce colorful badges everywhere.

Keep it subtle.

---

# 17. FAILURE ANALYSIS

The existing Failure Analysis panel must become dynamic.

Display:

### Root Cause

Example:

Battery degradation due to excessive load.

### Propagation Chain

Display dynamically generated steps such as:

Battery ↓ 42%
→ Voltage ↓ 18%
→ Heaters ↑ 6°C
→ Temperature ↑ 21°C

The chain must correspond to the selected fault.

### Affected Subsystems

Display the actual affected subsystems.

### Severity

LOW / MEDIUM / HIGH / CRITICAL

This should come from the backend.

---

# 18. ROOT CAUSE ENGINE

Implement a deterministic root-cause engine.

The system should NOT simply display the selected fault name.

It should reason from observed changes.

Example:

Observed:

Battery falling
Voltage falling
Temperature rising
Communication weakening

Conclusion:

Most likely root cause:

Battery degradation due to excessive load.

The architecture should allow a future AI/ML root-cause engine to replace this deterministic logic.

For MVP, deterministic rules are preferred because they are explainable and repeatable.

---

# 19. RECOVERY RECOMMENDATION

The system should generate recommendations based on the failure.

Example:

Battery Degradation:

01 Isolate battery bus B
02 Reduce non-critical payload load
03 Enter safe mode if battery continues falling

Power Bus Failure:

01 Isolate failed power bus
02 Switch to redundant bus
03 Reduce non-critical payload load

Solar Power Drop:

01 Reduce payload consumption
02 Prioritize battery charging
03 Enter power-saving mode

Thermal Runaway:

01 Disable non-critical heat sources
02 Reduce payload load
03 Enter thermal safe mode

Communication Loss:

01 Switch communication mode
02 Reduce transmission load
03 Attempt redundant communication link

Attitude Drift:

01 Reduce payload activity
02 Stabilize attitude
03 Reacquire optimal pointing

Recommendations must be generated from the backend.

---

# 20. APPLY RECOVERY

The existing:

**Apply Recovery**

button must actually work.

When clicked:

1. Create recovery event.
2. Send request to backend.
3. Backend applies recovery logic.
4. Satellite state begins improving.
5. Telemetry updates.
6. Subsystem states update.
7. Event Log records the action.
8. UI displays confirmation.

Example:

Before recovery:

Health 61%
Battery 42%
Temperature 58°C
Signal 62%

After recovery:

Health 73%
Battery 51%
Temperature 44°C
Signal 78%

The exact numbers should come from deterministic recovery formulas.

Do not instantly teleport values back to normal.

Simulate the recovery over several seconds.

---

# 21. PREDICTED OUTCOME

The existing Predicted Outcome card must dynamically compare:

BEFORE

→

AFTER

For example:

Health
78% → 61%

Battery
64% → 42%

Temperature
32°C → 58°C

Signal
87% → 62%

These values must change according to the selected fault.

---

# 22. EVENT LOG

Create a real Event Log.

Every important event must be stored.

Example:

14:32:17
Simulation started

14:32:21
Fault injected: Battery Degradation

14:32:22
Battery degradation detected

14:32:23
Voltage anomaly detected

14:32:24
Thermal propagation detected

14:32:25
Root cause identified

14:32:26
Recovery recommendation generated

14:32:31
Recovery applied

14:32:35
Satellite stabilized

Each event should have:

timestamp
event type
severity
description

Store events in SQLite.

---

# 23. INCIDENT ID

Every fault injection creates an incident.

Example:

INC-2026-0001

Then:

INC-2026-0002

etc.

Store:

* incident ID
* mission ID
* fault type
* start time
* severity
* root cause
* affected systems
* telemetry
* recovery actions
* final state

---

# 24. INCIDENT REPORT

The existing:

**Download Incident Report**

button must work.

Generate a report containing:

MISSION DIGITAL TWIN

Mission:
ORBITER-01

Incident:
INC-2026-0001

Fault:
Battery Degradation

Severity:
HIGH

Root Cause:
Battery degradation due to excessive load.

Propagation Chain:

Battery
→ Voltage
→ Thermal
→ Communication

Affected Subsystems:

Power
Thermal
Communication

Before State:

Health:
78%

Battery:
64%

Temperature:
32°C

Signal:
87%

After Fault:

Health:
61%

Battery:
42%

Temperature:
58°C

Signal:
62%

Recovery:

Isolate battery bus B
Reduce non-critical payload load
Enter safe mode if required

Recovery Result:

Stable / Degraded / Critical

Also include timestamp and event timeline.

Make the report professional enough to demonstrate during the hackathon.

---

# 25. API

Create REST endpoints similar to:

GET /api/mission

GET /api/state

GET /api/telemetry

GET /api/faults

POST /api/faults/inject

GET /api/incidents

GET /api/incidents/{incident_id}

POST /api/incidents/{incident_id}/recover

GET /api/incidents/{incident_id}/report

GET /api/events

WebSocket:

/ws/simulation

---

# 26. FAULT INJECTION REQUEST

Example:

POST /api/faults/inject

Request:

{
"fault_type": "battery_degradation"
}

Response should return:

{
"incident_id": "INC-2026-0001",
"fault_type": "battery_degradation",
"severity": "HIGH",
"status": "SIMULATING"
}

Then stream simulation updates through WebSocket.

---

# 27. SIMULATION STATE MODEL

Create proper Pydantic models.

Example conceptual structure:

SatelliteState

* health
* power
* battery_soc
* solar_power
* battery_temperature
* cpu_temperature
* signal_strength
* data_rate
* voltage
* subsystem_states

SimulationResult

* incident_id
* fault
* severity
* root_cause
* propagation_chain
* affected_subsystems
* before_state
* after_state
* recommendations
* telemetry

---

# 28. RESET SIMULATION

Add a subtle:

**Reset Simulation**

control.

It should:

* clear active fault
* restore baseline state
* clear temporary telemetry
* return all subsystems to nominal
* preserve historical incidents in Event Log / Reports

Do not delete historical incidents.

---

# 29. MULTIPLE FAULTS

For MVP:

Only allow one active fault at a time.

If another fault is injected while one is active:

show:

"Resolve the active incident before injecting another fault."

Do not allow conflicting simulations.

Architecture should nevertheless make multiple simultaneous faults possible in the future.

---

# 30. UI STATES

The frontend should clearly communicate:

### NOMINAL

Green

### WARNING

Amber

### DEGRADED

Muted amber/orange

### CRITICAL

Red

### FAILED

Strong red

Keep the colors restrained and consistent with the existing design.

---

# 31. LOADING / SIMULATION STATE

When simulation starts:

Show:

SIMULATION RUNNING

Then:

FAULT DETECTED

Then:

ANALYZING PROPAGATION

Then:

ROOT CAUSE IDENTIFIED

Then:

RECOVERY RECOMMENDATION READY

Do this with subtle UI state changes.

No cheesy animations.

---

# 32. ERROR HANDLING

Handle:

* backend unavailable
* WebSocket disconnected
* invalid fault
* simulation already running
* recovery attempted before recommendation
* report generation failure

Never allow the dashboard to silently fail.

Display compact technical error messages.

---

# 33. RESPONSIVE DESIGN

Preserve the existing desktop dashboard as the primary experience.

Also make it usable at:

1280px
1100px
820px
mobile

But desktop hackathon presentation is the priority.

Do not sacrifice the desktop design to make mobile prettier.

---

# 34. DATA PERSISTENCE

SQLite should persist:

* incidents
* events
* telemetry snapshots
* recovery actions

Restarting the backend should NOT destroy previous incidents.

---

# 35. NO FAKE FUNCTIONALITY

This is extremely important.

Do not create buttons that only show:

"Coming soon"

unless the feature is explicitly outside MVP scope.

The following must genuinely work:

* Fault selection
* Fault injection
* Simulation
* Telemetry updates
* Failure analysis
* Root cause
* Recovery recommendations
* Apply Recovery
* Event Log
* Incident creation
* Incident history
* Report download
* Reset simulation
* Sidebar navigation

---

# 36. NO AI REQUIRED FOR MVP

Do not add an LLM merely for the sake of saying the project uses AI.

The core Twin Lab should be:

DETERMINISTIC
EXPLAINABLE
REPEATABLE

The architecture may expose an interface such as:

RootCauseEngine

so that an AI/ML model can be added later.

But the MVP must work completely offline/local without an API key.

---

# 37. IMPORTANT VISUAL RULES

Do NOT:

* redesign the dashboard
* add giant hero sections
* add excessive cards
* add neon colors
* add glowing cyberpunk effects
* add unnecessary 3D effects
* add generic AI imagery
* add stock satellite photos
* add gradients everywhere
* add excessive rounded corners
* add unnecessary animations
* use placeholder lorem ipsum
* make it look like a generic SaaS dashboard

The current visual style should feel like:

**mission control software**

not:

**AI startup landing page**

---

# 38. DEMO EXPERIENCE

The entire application must support this exact hackathon demo:

### STEP 1

Open Twin Lab.

Satellite is nominal.

Health:

78%

### STEP 2

Open Fault Injection.

Select:

Battery Degradation

### STEP 3

Click:

INJECT FAULT

### STEP 4

Watch the telemetry change.

Battery begins falling.

Voltage decreases.

Temperature increases.

Signal begins degrading.

### STEP 5

Failure Analysis updates.

Show:

ROOT CAUSE

Battery degradation due to excessive load.

Then:

Battery
↓
Voltage
↓
Thermal
↓
Communication

### STEP 6

Recovery Recommendation appears.

### STEP 7

Click:

APPLY RECOVERY

### STEP 8

Watch the spacecraft recover.

### STEP 9

Open Event Log.

Show the entire chain of events.

### STEP 10

Download:

INC-2026-0001 Incident Report

This should feel like a real satellite operator rehearsing a failure.

---

# 39. TESTING

Create backend tests for:

* every fault scenario
* deterministic output
* recovery
* incident creation
* invalid fault
* reset
* event creation

At minimum verify:

Battery Degradation

Power Bus Failure

Solar Power Drop

Thermal Runaway

Communication Loss

Attitude Drift

Also test that:

# same input + same baseline

same simulation result

---

# 40. SEED DATA

On first startup, create a baseline ORBITER-01.

Do not create dozens of fake incidents.

One clean baseline mission is enough.

Historical incidents can be generated naturally by the demo.

---

# 41. README

Create a README containing:

Project overview

Architecture

Technology stack

Folder structure

Installation

Backend setup

Frontend setup

Running the project

API endpoints

Fault scenarios

Simulation logic

WebSocket behavior

Database

Testing

Demo instructions

---

# 42. FINAL QUALITY CHECK

Before finishing, verify the entire application from the user's perspective.

Start from a fresh installation.

Run backend.

Run frontend.

Open browser.

Inject Battery Degradation.

Confirm:

✓ Incident created

✓ Simulation runs

✓ Telemetry changes

✓ Satellite subsystem states change

✓ Health changes

✓ Failure Analysis changes

✓ Root cause appears

✓ Propagation chain appears

✓ Severity appears

✓ Recovery recommendations appear

✓ Apply Recovery works

✓ State improves

✓ Event Log records everything

✓ Incident remains in database

✓ Report downloads

✓ Reset works

Then test at least two other faults.

---

# 43. MOST IMPORTANT DEVELOPMENT PHILOSOPHY

Do not over-engineer the MVP.

The goal is not to build a NASA flight-control system.

The goal is to build a **credible, working failure-rehearsal environment** that demonstrates:

**Inject → Simulate → Detect → Explain → Recover → Record**

Every feature should support that loop.

If you have to choose between:

more features

and

making the core simulation extremely reliable,

choose reliability.

The final result should feel like a small but real **Satellite Mission Digital Twin laboratory**, not a static frontend prototype.

---

# FINAL DELIVERABLE

Return the complete working project.

Do not only provide snippets.

Implement:

Frontend
Backend
Database
Simulation engine
Fault library
WebSocket
Telemetry
Recovery engine
Event log
Incident system
Report generation
Tests
README

And preserve the existing Twin Lab UI as closely as possible.
