// /src/types/index.ts

export type TimesheetStatus = 'Pending' | 'Submitted' | 'Approved' | 'Rejected' | 'draft' | 'sent';

export interface User {
  id: number;
  username: string;
  role: 'foreman' | 'supervisor' | 'project_engineer' | 'admin';
  first_name: string;
  last_name: string;
  middle_name: string;
}

export type EmployeeWorkLog = {
  id: string;
  first_name: string;
  middle_name?: string;
  last_name: string;
  // FIX 1: Updated to match the complex structure { classCode: hours } used in populateEmployeeComplex, or a simple number
  hours_per_phase?: Record<string, Record<string, number> | number>; 
  class_1?: string;
  class_2?: string;
  selected_class?: string;
  class_codes?: string[]; 
};

export interface EquipmentWorkLog {
  id: string;
  name: string;
  start_hours?: number;
  stop_hours?: number;
  // FIX 2: Changed 'S_B' to the specific string literal ''S.B'' to match the code, and allowed for the simple number fallback.
  hours_per_phase?: Record<string, { REG?: number; 'S.B'?: number } | number>; 
}

export interface MaterialWorkLog {
  id: string;
  name: string;
  hours_per_phase?: Record<string, number>;
  unit?: string;
  // FIX 3: Added tickets_per_phase, as this is used by populateSimple for materials
    tickets_loads?: Record<string, number>;
}
export interface DumpingSite { 
  id: string;
  name: string;
  status: string;
  hours_per_phase?: { [phase: string]: number };
      tickets_loads?: Record<string, number>;
}

export interface VendorWorkLog {
  id: string;
  name: string;
  hours_per_phase?: Record<string, number>;
  unit?: string; 
  // FIX 4: Added tickets_per_phase, as this is used by populateSimple for vendors
      tickets_loads?: Record<string, number>;
}

export interface Job {
  id: number;
  job_code: string;
  job_description: string;
  phase_codes: any[];
  // FIX 5: Added total_cost to resolve the reported compilation error
  total_cost?: number; 
}

export interface TimesheetData {
  job: Job;
  job_name: string;
  project_engineer: string;
  location: string;
  time_of_day?: string;
  weather?: string;
  temperature?: string;
  shift?: string;
  day?: string;
  employees: EmployeeWorkLog[];
  equipment: EquipmentWorkLog[];
  materials_trucking: MaterialWorkLog[];
  vendors: VendorWorkLog[];
  notes?: string;
  dumping_sites?: DumpingSite[]; 
 total_quantities?: {
        [phaseCode: string]: number;
    };
      total_quantities_per_phase?: Record<string, string | number>;
    selected_vendor_materials?: Record<string, any>;
  selected_material_items?: Record<string, any>;
  selected_dumping_materials?: Record<string, any>;
  // FIX 6: Added date_submitted to resolve the reported compilation error
  date_submitted?: string; 
  approved_by?: string;
supervisor?: string | { id: number; name: string } | null;
  updated_at?: string;   // ← Add this
  created_at?: string;

}

export interface Timesheet {
  id: number;
  foreman_id: number;
  date: string;
  timesheet_name: string; // Keep for backend compatibility
  data: TimesheetData;
  sent: boolean;
  status: TimesheetStatus;
  job_phase_id: number | null;
  updated_at?: string;   // ← Add this
  created_at?: string;
  total_quantities?: Record<string, string | number>;
}