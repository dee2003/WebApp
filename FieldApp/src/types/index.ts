// /src/types/index.ts

export type TimesheetStatus = 'Pending' | 'Submitted' | 'Approved' | 'Rejected' | 'draft' | 'sent';

export interface User {
  id: number;
  username: string;
  role: 'foreman' | 'supervisor' | 'project_engineer' | 'admin';
  first_name: string;
  last_name: string;
  middle_name:string;
}

export type EmployeeWorkLog = {
  id: string;
  first_name: string;
  middle_name?: string;
  last_name: string;
  hours_per_phase?: Record<string, number>;
  class_1?: string;
  class_2?: string;
  selected_class?: string;
    class_codes?: string[]; // <-- add this

};

export interface EquipmentWorkLog {
  id: string;
  name: string;
  hours_per_phase?: Record<string, { REG?: number; S_B?: number }>;
}

export interface MaterialWorkLog {
  id: string;
  name: string;
  hours_per_phase?: Record<string, number>;
    unit?: string; // <-- ADD THIS

}
export interface DumpingSite { // You may need to create this type
    id: string;
    name: string;
    status: string;
    hours_per_phase?: { [phase: string]: number };
    tickets_per_phase?: { [phase: string]: number };
}

export interface VendorWorkLog {
  id: string;
  name: string;
  hours_per_phase?: Record<string, number>;
    unit?: string; // <-- ADD THIS

}

export interface Job {
  id: number;
  job_code: string;
  job_description: string;
  phase_codes: any[];
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
    dumping_sites?: DumpingSite[]; // NEW: Add this line

  total_quantities_per_phase?: Record<string, string | number>;
  selected_vendor_materials?: Record<string, any>;
  selected_material_items?: Record<string, any>;
  selected_dumping_materials?: Record<string, any>;
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
}