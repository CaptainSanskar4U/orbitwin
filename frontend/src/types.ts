export interface SimValues {
  health: number; power: number; battery_soc: number; solar_power: number;
  battery_temp: number; cpu_temp: number; signal: number; data_rate: number; voltage: number;
  [k: string]: number;
}
export interface ChainStep { node: string; detail: string }
export interface Rul { metric: string; limit: string; sim_min: number; trend: string; note: string }
export interface Analysis {
  active: boolean; incident_id?: string; fault?: string; severity?: string;
  root_cause?: string; chain?: ChainStep[]; affected?: string[];
  recommendations?: string[]; before?: SimValues; after?: SimValues;
  recovered?: SimValues; ai?: any; rul?: Rul | null;
}
export interface SimEvent { incident_id: string; ts: string; type: string; severity: string; message: string }
export interface Incident { id: string; fault_type: string; severity: string; status: string; start_time: string }
