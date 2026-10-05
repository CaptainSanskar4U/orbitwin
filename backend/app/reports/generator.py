import json
from datetime import datetime


def incident_report_html(incident: dict, events: list[dict], ai: dict | None = None) -> str:
    b = json.loads(incident.get("before_json", "{}"))
    a = json.loads(incident.get("after_json", "{}"))
    rec = json.loads(incident.get("recovered_json", "{}"))
    affected = json.loads(incident.get("affected_json", "[]"))

    def row(k, d1, d2):
        return f"<tr><td>{k}</td><td>{d1.get(k,'-')}</td><td>→</td><td>{d2.get(k,'-')}</td></tr>"

    keys = ["health", "battery_soc", "battery_temp", "signal", "power", "solar_power", "voltage"]
    rows = "".join([row(k, b, a) for k in keys])
    ev = "".join([f"<li>{e['ts']} — <b>{e['type']}</b> [{e.get('severity','INFO')}] {e['message']}</li>" for e in events])
    ai_block = ""
    if ai:
        ai_block = f"<h2>AI Insight ({ai.get('_model','')})</h2><p>{ai.get('summary','')}</p>"
        ai_block += f"<p><b>Why:</b> {ai.get('why_broke','')}</p><p><b>Avoid:</b> {ai.get('how_to_avoid','')}</p>"

    return f"""<!DOCTYPE html><html><head><meta charset='utf-8'>
<title>{incident['id']} Incident Report</title>
<style>body{{font-family:Inter,Arial,sans-serif;background:#fff;color:#111;max-width:760px;margin:32px auto;padding:0 20px}}
h1{{font-size:22px}}h2{{font-size:15px;margin-top:24px;border-bottom:1px solid #ddd;padding-bottom:4px}}
table{{border-collapse:collapse;width:100%}}td,th{{border:1px solid #ddd;padding:6px 8px;font-size:13px;text-align:left}}
.small{{color:#555;font-size:12px}}</style></head><body>
<h1>MISSION DIGITAL TWIN — Incident Report</h1>
<p class='small'>Mission: {incident.get('mission_id','ORBITER-01')} | Incident: <b>{incident['id']}</b> | {incident.get('start_time','')}</p>
<h2>Fault</h2><p>{incident.get('fault_type','')} | Severity: <b>{incident.get('severity','')}</b></p>
<p><b>Root cause:</b> {incident.get('root_cause','')}</p>
<p><b>Affected:</b> {', '.join(affected)}</p>
<h2>Before → After fault</h2><table>{rows}</table>
<h2>Recovery result</h2><p class='small'>{json.dumps(rec)}</p>
{ai_block}
<h2>Event timeline</h2><ul>{ev}</ul>
<p class='small'>Generated {datetime.utcnow().isoformat()}Z — Twin Lab deterministic simulation. Print to PDF from browser.</p>
</body></html>"""
