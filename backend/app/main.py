import asyncio
import json
from datetime import datetime
from typing import List

from fastapi import FastAPI, WebSocket, WebSocketDisconnect, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import HTMLResponse, JSONResponse
from sqlmodel import SQLModel, Session, create_engine, select

from .config import settings
from .models import Incident, Event, Telemetry
from .schemas import InjectRequest, AIKeyRequest
from .simulation.faults import BASELINE, FAULTS, simulate_ticks, recover_ticks, EVENT_TEXT, nominal_wobble, rul_estimate
from .reports.generator import incident_report_html
from .ai.explainer import explain_with_gemini, deterministic_fallback

import os
DB_PATH = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", "twinlab.db"))
engine = create_engine(f"sqlite:///{DB_PATH}", connect_args={"check_same_thread": False})

app = FastAPI(title=settings.app_name)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.middleware("http")
async def utf8_json(request, call_next):
    """Guarantee explicit UTF-8 on JSON so ↓/↑/°C always decode correctly."""
    resp = await call_next(request)
    ct = resp.headers.get("content-type", "")
    if ct == "application/json":
        resp.headers["content-type"] = "application/json; charset=utf-8"
    return resp

# runtime state (single active fault for MVP)
state = {
    "current": dict(BASELINE),
    "subsystems": {k: "NOMINAL" for k in ["Solar Panels", "Battery", "Thermal", "Communication", "Attitude", "Sensors"]},
    "active_incident": None,
    "simulating": False,
    "telemetry_unreliable": False,
    "ai_key": settings.gemini_api_key,
    "ai_model": settings.gemini_model,
}

ws_clients: List[WebSocket] = []


def init_db():
    SQLModel.metadata.create_all(engine)


def log_event(incident_id: str, type_: str, message: str, severity: str = "INFO"):
    with Session(engine) as s:
        s.add(Event(incident_id=incident_id, type=type_, severity=severity, message=message))
        s.commit()


def save_telemetry(incident_id: str, tick: int, phase: str, data: dict):
    with Session(engine) as s:
        s.add(Telemetry(incident_id=incident_id, tick=tick, phase=phase, data_json=json.dumps(data)))
        s.commit()


async def broadcast(msg: dict):
    dead = []
    for ws in ws_clients:
        try:
            await ws.send_json(msg)
        except Exception:
            dead.append(ws)
    for d in dead:
        if d in ws_clients:
            ws_clients.remove(d)


def next_incident_id() -> str:
    with Session(engine) as s:
        n = len(s.exec(select(Incident)).all()) + 1
    return f"INC-2026-{n:04d}"


@app.on_event("startup")
def startup():
    init_db()


@app.get("/api/mission")
def mission():
    return {"mission_id": "ORBITER-01", "orbit": "LEO", "altitude_km": 540,
            "inclination": 97.6, "simulation": "ACTIVE" if not state["simulating"] else "RUNNING"}


@app.get("/api/state")
def get_state():
    fault = None
    if state["active_incident"]:
        with Session(engine) as s:
            inc = s.get(Incident, state["active_incident"])
            fault = inc.fault_type if inc else None
    live = state["current"]
    if not state["active_incident"] and not state["simulating"]:
        # Living idle stream: deterministic wobble so the twin breathes.
        live = nominal_wobble(int(datetime.now().timestamp()), state["current"])
    return {"values": live, "subsystems": state["subsystems"],
            "active_incident": state["active_incident"], "fault": fault,
            "simulating": state["simulating"],
            "telemetry_unreliable": state["telemetry_unreliable"],
            "ai_configured": bool(state["ai_key"])}


@app.get("/api/faults")
def list_faults():
    return [{"id": k, "label": v["label"], "severity": v["severity"]} for k, v in FAULTS.items()]


@app.get("/api/telemetry")
def telemetry(limit: int = 120):
    with Session(engine) as s:
        rows = s.exec(select(Telemetry).order_by(Telemetry.id.desc()).limit(limit)).all()
    return [{"incident_id": r.incident_id, "tick": r.tick, "phase": r.phase,
             "data": json.loads(r.data_json), "ts": r.ts.isoformat()} for r in reversed(rows)]


@app.post("/api/faults/inject")
async def inject(req: InjectRequest):
    if req.fault_type not in FAULTS:
        raise HTTPException(400, "invalid fault")
    if state["active_incident"] or state["simulating"]:
        raise HTTPException(409, "Resolve the active incident before injecting another fault.")
    fault = FAULTS[req.fault_type]
    iid = next_incident_id()
    before = dict(BASELINE)
    after = dict(fault["after"])
    with Session(engine) as s:
        s.add(Incident(id=iid, fault_type=req.fault_type, severity=fault["severity"],
                       status="SIMULATING", root_cause=fault["root_cause"],
                       affected_json=json.dumps(fault["affected"]),
                       before_json=json.dumps(before), after_json=json.dumps(after)))
        s.add(Event(incident_id=iid, type="SIMULATION_STARTED", severity="INFO",
                    message=f"Fault injected: {fault['label']}"))
        s.commit()
    state["active_incident"] = iid
    state["simulating"] = True
    state["telemetry_unreliable"] = bool(fault.get("telemetry_unreliable", False))
    asyncio.create_task(run_simulation(iid, req.fault_type))
    return {"incident_id": iid, "fault_type": req.fault_type,
            "severity": fault["severity"], "status": "SIMULATING"}


async def run_simulation(iid: str, fault_type: str):
    fault = FAULTS[fault_type]
    try:
        for step in simulate_ticks(fault_type):
            state["current"] = step["state"]
            save_telemetry(iid, step["tick"], step["phase"], step["state"])
            txt = EVENT_TEXT.get(step["phase"], step["phase"])
            sev = "CRITICAL" if step["phase"] in ("DETECTED",) else ("INFO" if step["tick"] < 4 else "WARNING")
            log_event(iid, step["phase"], f"{txt}: {fault['label']}" if step["tick"] == 0 else txt, sev)
            # progressive subsystem reveal
            subs = dict(state["subsystems"])
            if step["tick"] >= 1:
                for k, v in fault["subsystems"].items():
                    if v in ("DEGRADED", "WARNING"):
                        subs[k] = v
            if step["tick"] >= 3:
                subs.update(fault["subsystems"])
            state["subsystems"] = subs
            await broadcast({"kind": "tick", "incident_id": iid, "tick": step["tick"],
                             "phase": step["phase"], "state": step["state"],
                             "subsystems": subs, "fault": fault_type})
            await asyncio.sleep(0.9)
        with Session(engine) as s:
            inc = s.get(Incident, iid)
            inc.status = "FAULT"
            s.add(inc)
            s.commit()
        state["simulating"] = False
        await broadcast({"kind": "analysis", "incident_id": iid,
                         "root_cause": fault["root_cause"], "chain": fault["chain"],
                         "affected": fault["affected"], "severity": fault["severity"],
                         "recommendations": fault["recommendations"],
                         "before": json.loads(s.get(Incident, iid).before_json),
                         "after": fault["after"]})
        # auto AI explain where helpful
        if settings.ai_enabled and state["ai_key"]:
            try:
                ai = await explain_with_gemini(state["ai_key"], state["ai_model"],
                                              fault_type, BASELINE, fault["after"])
                with Session(engine) as s:
                    inc = s.get(Incident, iid)
                    inc.ai_summary_json = json.dumps(ai)
                    s.add(inc)
                    s.commit()
                log_event(iid, "AI_EXPLAINED", f"AI insight generated ({ai.get('_model','')})")
                await broadcast({"kind": "ai", "incident_id": iid, "ai": ai})
            except Exception as e:
                log_event(iid, "AI_FAILED", f"AI explain failed: {e}", "WARNING")
                await broadcast({"kind": "ai_error", "incident_id": iid, "error": str(e)})
    except Exception as e:
        state["simulating"] = False
        log_event(iid, "SIM_ERROR", str(e), "CRITICAL")


@app.get("/api/analysis")
def analysis():
    if not state["active_incident"]:
        return {"active": False, "before": BASELINE}
    with Session(engine) as s:
        inc = s.get(Incident, state["active_incident"])
    if not inc:
        return {"active": False}
    f = FAULTS[inc.fault_type]
    ai = json.loads(inc.ai_summary_json) if inc.ai_summary_json else None
    before_j, after_j = json.loads(inc.before_json), json.loads(inc.after_json)
    return {"active": True, "incident_id": inc.id, "fault": inc.fault_type,
            "severity": inc.severity, "root_cause": inc.root_cause,
            "chain": f["chain"], "affected": f["affected"],
            "recommendations": f["recommendations"],
            "before": before_j, "after": after_j,
            "recovered": json.loads(inc.recovered_json) if inc.recovered_json else f["recovered"],
            "rul": rul_estimate(before_j, after_j),
            "ai": ai}


@app.post("/api/incidents/{iid}/recover")
async def recover(iid: str):
    with Session(engine) as s:
        inc = s.get(Incident, iid)
    if not inc:
        raise HTTPException(404, "incident not found")
    if state["simulating"]:
        raise HTTPException(409, "simulation still running - wait for recommendation")
    if inc.status == "STABLE":
        raise HTTPException(409, "already recovered")
    state["simulating"] = True
    log_event(iid, "RECOVERY_STARTED", "Recovery applied by operator", "INFO")
    asyncio.create_task(run_recovery(iid))
    return {"status": "RECOVERING"}


async def run_recovery(iid: str):
    with Session(engine) as s:
        inc = s.get(Incident, iid)
        fault_type = inc.fault_type
    fault = FAULTS[fault_type]
    start = dict(state["current"])
    for step in recover_ticks(fault_type, start):
        state["current"] = step["state"]
        save_telemetry(iid, 100 + step["tick"], step["phase"], step["state"])
        log_event(iid, step["phase"], "Recovery in progress" if "RECOVER" in step["phase"] else step["phase"])
        await broadcast({"kind": "recovery_tick", "incident_id": iid,
                         "phase": step["phase"], "state": step["state"]})
        await asyncio.sleep(0.9)
    # restore subsystems gradually to nominal-ish
    state["subsystems"] = {k: ("NOMINAL" if v in ("DEGRADED", "WARNING") else ("NOMINAL" if k not in fault["affected"] and k != "Battery" else "NOMINAL")) for k, v in state["subsystems"].items()}
    state["subsystems"] = {k: "NOMINAL" for k in state["subsystems"]}
    state["telemetry_unreliable"] = False
    with Session(engine) as s:
        inc = s.get(Incident, iid)
        inc.status = "STABLE"
        inc.recovered_json = json.dumps(fault["recovered"])
        s.add(inc)
        s.commit()
    log_event(iid, "STABILIZED", "Satellite stabilized after recovery", "INFO")
    state["simulating"] = False
    state["active_incident"] = None
    state["current"] = dict(fault["recovered"])
    await broadcast({"kind": "recovered", "incident_id": iid, "state": fault["recovered"]})


@app.post("/api/reset")
def reset():
    state["current"] = dict(BASELINE)
    state["subsystems"] = {k: "NOMINAL" for k in state["subsystems"]}
    state["active_incident"] = None
    state["simulating"] = False
    state["telemetry_unreliable"] = False
    log_event("BASELINE", "RESET", "Simulation reset to baseline")
    return {"status": "NOMINAL", "state": state["current"]}


@app.get("/api/incidents")
def incidents():
    with Session(engine) as s:
        rows = s.exec(select(Incident).order_by(Incident.start_time.desc())).all()
    return [{"id": r.id, "fault_type": r.fault_type, "severity": r.severity,
             "status": r.status, "start_time": r.start_time.isoformat()} for r in rows]


@app.get("/api/incidents/{iid}")
def incident_detail(iid: str):
    with Session(engine) as s:
        inc = s.get(Incident, iid)
    if not inc:
        raise HTTPException(404, "not found")
    return {"id": inc.id, "mission_id": inc.mission_id, "fault_type": inc.fault_type,
            "severity": inc.severity, "status": inc.status, "root_cause": inc.root_cause,
            "affected": json.loads(inc.affected_json), "before": json.loads(inc.before_json),
            "after": json.loads(inc.after_json),
            "recovered": json.loads(inc.recovered_json) if inc.recovered_json else None,
            "ai": json.loads(inc.ai_summary_json) if inc.ai_summary_json else None}


@app.get("/api/incidents/{iid}/report", response_class=HTMLResponse)
def report(iid: str):
    with Session(engine) as s:
        inc = s.get(Incident, iid)
        evs = s.exec(select(Event).where(Event.incident_id == iid).order_by(Event.id)).all()
    if not inc:
        raise HTTPException(404, "not found")
    ai = json.loads(inc.ai_summary_json) if inc.ai_summary_json else deterministic_fallback(
        inc.fault_type, json.loads(inc.before_json), json.loads(inc.after_json))
    return incident_report_html(
        {"id": inc.id, "mission_id": inc.mission_id, "fault_type": inc.fault_type,
         "severity": inc.severity, "root_cause": inc.root_cause,
         "affected_json": inc.affected_json, "before_json": inc.before_json,
         "after_json": inc.after_json, "recovered_json": inc.recovered_json or "{}",
         "start_time": inc.start_time.isoformat()},
        [{"ts": e.ts.isoformat(), "type": e.type, "severity": e.severity, "message": e.message} for e in evs], ai)


@app.post("/api/incidents/{iid}/explain")
async def explain(iid: str):
    with Session(engine) as s:
        inc = s.get(Incident, iid)
    if not inc:
        raise HTTPException(404, "not found")
    if inc.ai_summary_json:
        return json.loads(inc.ai_summary_json)
    before, after = json.loads(inc.before_json), json.loads(inc.after_json)
    if not state["ai_key"]:
        ai = deterministic_fallback(inc.fault_type, before, after)
    else:
        try:
            ai = await explain_with_gemini(state["ai_key"], state["ai_model"],
                                          inc.fault_type, before, after)
        except Exception as e:
            raise HTTPException(502, f"AI explain failed: {e}")
    with Session(engine) as s:
        inc = s.get(Incident, iid)
        inc.ai_summary_json = json.dumps(ai)
        s.add(inc)
        s.commit()
    await broadcast({"kind": "ai", "incident_id": iid, "ai": ai})
    return ai


@app.get("/api/events")
def events(limit: int = 200):
    with Session(engine) as s:
        rows = s.exec(select(Event).order_by(Event.id.desc()).limit(limit)).all()
    return [{"incident_id": r.incident_id, "ts": r.ts.isoformat(), "type": r.type,
             "severity": r.severity, "message": r.message} for r in reversed(rows)]


@app.post("/api/settings/ai-key")
def set_ai_key(req: AIKeyRequest):
    # stored server-side only, never returned
    state["ai_key"] = req.key.strip()
    if req.model:
        state["ai_model"] = req.model
    return {"ai_configured": bool(state["ai_key"]), "model": state["ai_model"]}


@app.get("/api/settings")
def get_settings():
    return {"ai_configured": bool(state["ai_key"]), "model": state["ai_model"],
            "ai_enabled": settings.ai_enabled}


@app.websocket("/ws/simulation")
async def ws(ws: WebSocket):
    await ws.accept()
    ws_clients.append(ws)
    try:
        await ws.send_json({"kind": "hello", "state": state["current"],
                            "subsystems": state["subsystems"]})
        while True:
            await ws.receive_text()
    except WebSocketDisconnect:
        if ws in ws_clients:
            ws_clients.remove(ws)
