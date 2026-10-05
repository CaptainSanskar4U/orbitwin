// Industry subsystem codes — EPS / TCS / ADCS + COMMS + payload.
// Display-only mapping so judges hear the language they expect.
export const SUB_CODE: Record<string, string> = {
  "Solar Panels": "EPS",
  "Battery": "EPS",
  Power: "EPS",
  Thermal: "TCS",
  Communication: "COMMS",
  Attitude: "ADCS",
  Sensors: "PL",
};

export function codeOf(name: string): string {
  return SUB_CODE[name] ?? "";
}
