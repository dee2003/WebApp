import React, { useEffect, useRef, useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TextInput, TouchableOpacity, ActivityIndicator, SafeAreaView, Alert, Platform } from 'react-native';
import DatePicker from 'react-native-date-picker';
import { Dropdown } from 'react-native-element-dropdown';
import AsyncStorage from '@react-native-async-storage/async-storage';
import apiClient from '../../api/apiClient';
import { Timesheet } from '../../types';
import { Pressable, Modal } from "react-native";
import { Picker } from '@react-native-picker/picker';
import NetInfo from '@react-native-community/netinfo';
import WeatherLocationCard from '../WeatherLocationCard';

// ---------------- THEME ----------------
const THEME = {
  primary: '#3b82f6', // blue-500
  backgroundLight: '#f8fafc',
  backgroundDark: '#0f172a',
  card: '#FFFFFF',
  text: '#111827',
  textSecondary: '#6B7280',
  border: '#E5E7EB',
  lightGray: '#F8FAFB',
  danger: '#EF4444',
  SPACING: 14,
};

// ---------------- HELPERS / TYPES ----------------
type ComplexHourState = { [key: string]: { [key: string]: { REG?: string; S_B?: string } } };
type EmployeeHourState = { [key: string]: { [key: string]: { [classCode: string]: string } } };
type SimpleHourState = { [key: string]: { [key: string]: string } };

type Props = { route: any; navigation: any };

const MATERIAL_UNITS = [
  { label: 'Hrs', value: 'Hrs' },
  { label: 'CY', value: 'CY' },
  { label: 'TON', value: 'TON' },
  { label: 'SF', value: 'SF' },
  { label: 'SY', value: 'SY' },
  { label: 'LF', value: 'LF' },
  { label: 'EA', value: 'EA' },
];

const WORK_PERFORMED_UNITS = [
  { label: 'CY', value: 'CY' },
  { label: 'TON', value: 'TON' },
  { label: 'SF', value: 'SF' },
  { label: 'SY', value: 'SY' },
  { label: 'LF', value: 'LF' },
  { label: 'EA', value: 'EA' },
];


// --- MOVE THESE TO TOP OF TimesheetEditScreen ---


const TimesheetEditScreen = ({ route, navigation }: Props) => {
  const timesheetId = route?.params?.timesheetId;
  const [loading, setLoading] = useState(true);
  const [timesheet, setTimesheet] = useState<Timesheet | null>(null);
  const [selectedPhases, setSelectedPhases] = useState<string[]>([]);
  const [phaseModalVisible, setPhaseModalVisible] = useState(false);
  const [timesheetDate, setTimesheetDate] = useState(new Date());
  const [isDatePickerVisible, setDatePickerVisible] = useState(false);
  const [notes, setNotes] = useState('');
  const [foremanName, setForemanName] = useState('');
  const [isClassModalVisible, setIsClassModalVisible] = useState(false);
  const [editingEmployeeId, setEditingEmployeeId] = useState<string | null>(null);
  // states for inputs
  const [employeeHours, setEmployeeHours] = useState<EmployeeHourState>({});
  const [equipmentHours, setEquipmentHours] = useState<ComplexHourState>({});
  const [materialHours, setMaterialHours] = useState<SimpleHourState>({});
  const [vendorHours, setVendorHours] = useState<SimpleHourState>({});
  const [dumpingSiteHours, setDumpingSiteHours] = useState<SimpleHourState>({});
  const [materialUnits, setMaterialUnits] = useState<{ [key: string]: string | null }>({});
  const [vendorUnits, setVendorUnits] = useState<{ [key: string]: string | null }>({});
  const [totalQuantities, setTotalQuantities] = useState<{ [key: string]: string }>({});
  // extracted arrays to render
  const [workPerformed, setWorkPerformed] = useState<any[]>([]);
  const [materialsTrucking, setMaterialsTrucking] = useState<any[]>([]);
  const [dumpingSites, setDumpingSites] = useState<any[]>([]);
  const [availableEquipment, setAvailableEquipment] = useState<any[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [tempClassValues, setTempClassValues] = useState<Record<string, string>>({});
  const [showEmployeePicker, setShowEmployeePicker] = useState(false);
  const [search, setSearch] = useState("");

  const [employeesList, setEmployeesList] = useState<any[]>([]);
  const [jobPhaseCodes, setJobPhaseCodes] = useState<string[]>([]);
  const [showEquipmentPicker, setShowEquipmentPicker] = useState(false);
  const [equipmentList, setEquipmentList] = useState<any[]>([]);
  const [equipmentSearch, setEquipmentSearch] = useState("");
  const [ticketsLoads, setTicketsLoads] = useState<{ [id: string]: string }>({});
  const [employeeReasons, setEmployeeReasons] = useState<{ [id: string]: string }>({});

  const [phaseEntryQuantities, setPhaseEntryQuantities] = useState<{ [phase: string]: string }>({});
  const [isConnected, setIsConnected] = useState(true);
  const [isCheckingConnection, setIsCheckingConnection] = useState(false);

  const [restoredFromDraft, setRestoredFromDraft] = useState(false);
  const [startHours, setStartHours] = useState<{ [id: string]: string }>({});
  const [stopHours, setStopHours] = useState<{ [id: string]: string }>({});
  const [weatherData, setWeatherData] = useState("");
  const [temperatureData, setTemperatureData] = useState("");
  const [locationData, setLocationData] = useState("");
  const [supervisorName, setSupervisorName] = useState<string>(''); 

// --- Vendor Picker States ---
  const [showVendorPicker, setShowVendorPicker] = useState(false);
  const [vendorSearch, setVendorSearch] = useState('');
  const [vendorsList, setVendorsList] = useState<any[]>([]);
  
useEffect(() => {
  let unsubscribe: () => void;
  
  const checkConnection = async () => {
    setIsCheckingConnection(true);
    const state = await NetInfo.fetch();
    setIsConnected(state.isConnected ?? false);
    setIsCheckingConnection(false);
  };

  checkConnection(); // Initial check
  
  unsubscribe = NetInfo.addEventListener(state => {
    setIsConnected(state.isConnected ?? false);
  });

  return () => unsubscribe?.();
}, []);


useEffect(() => {
  if (timesheet?.data?.employees) {
    setEmployeesList(timesheet.data.employees);
  }
}, [timesheet]);


  // ---------------- UTIL FUNCTIONS ----------------
  const toNumber = (v: any) => {
    const n = parseFloat(String(v || '0'));
    return isNaN(n) ? 0 : n;
  };

const calculateTotalEmployeeHours = (
  state: EmployeeHourState,
  entityId: string
) => {
  const obj = state[entityId];
  if (!obj) return 0;

  let total = 0;

  // Only calculate totals for selected phases
  selectedPhases.forEach(phase => {
    const classObj = obj[phase] || {};
    Object.values(classObj).forEach(v => {
      total += toNumber(v);
    });
  });

  return total;
};

  const calculateEmployeePhaseTotals = (state: EmployeeHourState, phaseCodes: string[] = []) => {
    const totals: { [k: string]: number } = {};
    phaseCodes.forEach(p => { totals[p] = 0; });
    Object.values(state).forEach(entity => {
      phaseCodes.forEach(p => {
        if (entity[p]) {
          Object.values(entity[p]).forEach(v => { totals[p] += toNumber(v); });
        }
      });
    });
    return totals;
  };

  const calculateTotalComplexHours = (state: ComplexHourState, entityId: string) => {
    const obj = state[entityId];
    if (!obj) return 0;
    return Object.values(obj).reduce((acc: number, ph) => acc + toNumber(ph.REG) + toNumber(ph.S_B), 0);
  };

  const calculateComplexPhaseTotals = (state: ComplexHourState, phaseCodes: string[] = []) => {
    const totals: { [k: string]: number } = {};
    phaseCodes.forEach(p => { totals[p] = 0; });
    Object.values(state).forEach(entity => {
      phaseCodes.forEach(p => {
        totals[p] += toNumber(entity[p]?.REG) + toNumber(entity[p]?.S_B);
      });
    });
    return totals;
  };

const calculateSimplePhaseTotals = (state: SimpleHourState, phaseCodes: string[] = []) => {
  const totals: { [k: string]: number } = {};
  phaseCodes.forEach(p => { totals[p] = 0; });
  Object.values(state).forEach(entity => {
    phaseCodes.forEach(p => { totals[p] += toNumber(entity[p]); });
  });
  return totals;
};

const calculateTotalSimple = (state: SimpleHourState, entityId: string) => {
  const obj = state[entityId];
  if (!obj) return 0;
  return Object.values(obj).reduce((s, v) => s + toNumber(v), 0);
};

const restoreProcessedDraft = (draft: any, server: Timesheet | null) => {
  if (!draft?.data) return;

  const d = draft.data;
  if (d.notes) setNotes(d.notes)
  // 2) restore selected phases (server & draft may differ)
  const phaseCodes = d.job?.phase_codes || d.selectedPhases || [];
  setSelectedPhases(Array.isArray(phaseCodes) ? phaseCodes : []);

  // 3) restore total quantities mapping -> UI expects phaseEntryQuantities (strings)
  if (d.total_quantities) {
  const pq: { [k: string]: string } = {};
  Object.keys(d.total_quantities).forEach(k => {
    pq[k] = String(d.total_quantities[k] ?? '');
  });
  setPhaseEntryQuantities(pq);
}

  // 4) restore employees -> employeeHours (structured per phase -> class codes -> string)
  if (Array.isArray(d.employees)) {
    const eHours: EmployeeHourState = {};
    d.employees.forEach((emp: any) => {
      eHours[emp.id] = {};
      const hp = emp.hours_per_phase || {};
      Object.keys(hp).forEach(phase => {
        eHours[emp.id][phase] = {};
        const classObj = hp[phase] || {};
        Object.keys(classObj).forEach(cc => {
          eHours[emp.id][phase][cc] = String(classObj[cc] ?? '');
        });
      });
    });
    setEmployeeHours(eHours);
  }

  // 5) restore equipment -> equipmentHours (REG, S_B strings) and start/stop
  if (Array.isArray(d.equipment)) {
    const eqHours: ComplexHourState = {};
    const selectedEquipmentArr: any[] = [];
     const start: { [k: string]: string } = {};
  const stop: { [k: string]: string } = {};
    d.equipment.forEach((eq: any) => {
      selectedEquipmentArr.push(eq);
      if (!eqHours[eq.id]) eqHours[eq.id] = {};
      const hp = eq.hours_per_phase || {};
      Object.keys(hp).forEach(phase => {
        const v = hp[phase] || {};
        eqHours[eq.id][phase] = { REG: String(v.REG ?? ''), S_B: String(v.S_B ?? '') };
      });
      start[eq.id] = String(eq.start_hours ?? '');
    stop[eq.id] = String(eq.stop_hours ?? '');
      // preserve start/stop in timesheet.data later (we also update timesheet object below)
    });
    setEquipmentHours(eqHours);
    setStartHours(start);
  setStopHours(stop);
    // override timesheet arrays if you want to replace them with saved ones
    if (selectedEquipmentArr.length) {
      setTimesheet(prev => {
        if (!prev) return prev;
        return {
          ...prev,
          data: {
            ...prev.data,
            equipment: selectedEquipmentArr
          }
        };
      });
    }
  }

  // 6) materials / vendors / dumping -> simple hours & tickets
  if (Array.isArray(d.materials_trucking)) {
    const mHours: SimpleHourState = {};
    const mTickets: SimpleHourState = {};
    const units: { [k: string]: string | null } = {};
    d.materials_trucking.forEach((m: any) => {
      mHours[m.id] = {};
      // mTickets[m.id] = {};
      const hp = m.hours_per_phase || {};
      // const tp = m.tickets_per_phase || {};
      Object.keys(hp).forEach(phase => mHours[m.id][phase] = String(hp[phase] ?? ''));
      // Object.keys(tp).forEach(phase => mTickets[m.id][phase] = String(tp[phase] ?? ''));
      units[m.id] = m.unit ?? null;
      if (m.tickets_loads && typeof m.tickets_loads[m.id] !== 'undefined') {
      setTicketsLoads(prev => ({
        ...prev,
        [m.id]: String(m.tickets_loads[m.id])
      }));
    }
  });
  
    setMaterialHours(mHours);
    // setMaterialTickets(mTickets);
    setMaterialUnits(units);
  }

if (Array.isArray(d.vendors)) {
  const vHours: SimpleHourState = {};
  const vTickets: Record<string, string> = {};
  const vUnits: Record<string, string | null> = {};
  const rebuiltWorkPerformed: any[] = [];

  d.vendors.forEach((v: any, index: number) => {
    const vendorId = Number(v.vendor_id ?? v.id);
    const materialId = Number(v.material_id ?? v.id);
    const key = `${vendorId}_${materialId}`;

    // Hours from draft vendors
    if (v.hours_per_phase) {
      vHours[key] = {};
      Object.keys(v.hours_per_phase).forEach(phase => {
        vHours[key][phase] = String(v.hours_per_phase[phase] ?? '');
      });
    }

    // ✅ FIX: Tickets from workPerformed (newer data), fallback to draft
    const ticketsFromWorkPerformed = rebuiltWorkPerformed[index]?.ticketsloads || String(v.tickets_loads ?? '0');
    vTickets[key] = ticketsFromWorkPerformed;

    vUnits[vendorId] = v.unit ?? null;

    rebuiltWorkPerformed.push({
      id: key,
      vendor_id: vendorId,
      vendorname: v.vendor_name ?? '',
      vendor_category: v.vendor_category ?? null,
      material_id: materialId,
      materialname: v.material_name ?? '',
      unit: v.unit ?? null,
      detail: v.detail ?? '',
      hoursperphase: v.hours_per_phase ?? {},
      ticketsloads: String(v.tickets_loads ?? '0')  // Preserve string format
    });
  });

  // ✅ ORDER MATTERS: Set workPerformed FIRST
  setWorkPerformed(rebuiltWorkPerformed);
  setVendorHours(vHours);
  setTicketsLoads(vTickets);  // Now gets correct values from workPerformed
  setVendorUnits(vUnits);

  console.log('🎫 FINAL TICKETS:', vTickets);
}


  if (Array.isArray(d.dumping_sites)) {
    const dsHours: SimpleHourState = {};
    // const dsTickets: SimpleHourState = {};
    d.dumping_sites.forEach((s: any) => {
      dsHours[s.id] = {};
      // dsTickets[s.id] = {};
      Object.keys(s.hours_per_phase || {}).forEach(phase => dsHours[s.id][phase] = String(s.hours_per_phase[phase] ?? ''));
      // Object.keys(s.tickets_per_phase || {}).forEach(phase => dsTickets[s.id][phase] = String(s.tickets_per_phase[phase] ?? ''));
      if (d.tickets_loads && typeof d.tickets_loads[d.id] !== 'undefined') {
      setTicketsLoads(prev => ({
        ...prev,
        [d.id]: String(d.tickets_loads[d.id])
      }));
    }
    });
    setDumpingSiteHours(dsHours);
    // setDumpingSiteTickets(dsTickets);
  }

  // 7) replace server arrays if draft contains them (employees/equipment/materials) – your existing code already does that pattern
  if (d.employees && d.employees.length) {
    setTimesheet(prev => prev ? ({ ...prev, data: { ...prev.data, employees: d.employees } }) : prev);
  }
  if (d.equipment && d.equipment.length) {
    setTimesheet(prev => prev ? ({ ...prev, data: { ...prev.data, equipment: d.equipment } }) : prev);
  }
  if (d.materials_trucking && d.materials_trucking.length) {
    setMaterialsTrucking(d.materials_trucking);
  }
  if (d.vendors && d.vendors.length) {
    setWorkPerformed(d.vendors); // or setWorkPerformed(d.vendors) depending on naming
  }

};

  // ---------------- LOAD DATA ----------------
  useEffect(() => {
    const fetchData = async () => {
      try {
        const res = await apiClient.get(`/api/timesheets/${timesheetId}`);
        const ts: Timesheet = res.data;
        setTimesheet(ts);
        setTimesheetDate(ts.date ? new Date(ts.date) : new Date());
        setNotes(ts.data?.notes || '');

        // normalize arrays
      // ---------- NORMALIZE VENDORS: merge grouped + flat rows ----------
const wp: any[] = [];

// 1) If server has grouped selected_vendor_materials, convert to flat rows
if (ts.data?.selected_vendor_materials) {
  Object.values(ts.data.selected_vendor_materials).forEach((vendor: any) => {
    const vendorId = Number(vendor.id);
    const vendorName = vendor.name;
    const vendorCat = vendor.vendor_category ?? null;

    const sm = vendor.selectedMaterials || [];
    sm.forEach((m: any) => {
      const materialId = Number(m.id);
      wp.push({
        id: `${vendorId}_${materialId}`, // unique UI id
        vendor_id: vendorId,
        vendor_name: vendorName,
        vendor_category: vendorCat,
        material_id: materialId,
        material_name: m.material ?? m.material_name ?? '',
        unit: m.unit ?? null,
        detail: m.detail ?? '',
        hours_per_phase: m.hours_per_phase ?? {},   // <--- ADDED
    tickets_loads: m.tickets_loads ?? {}, 
      });
    });
  });
}

const seen = new Set(wp.map(r => `${r.vendor_id}_${r.material_id}`));
// 2) MERGE ts.data.vendors into wp (CRITICAL for hours_per_phase)
if (Array.isArray(ts.data?.vendors)) {
  ts.data.vendors.forEach((r: any) => {
    const vendorId = Number(r.vendor_id ?? r.vendorId ?? r.vendor?.id ?? r.id);
    const materialId = Number(r.material_id ?? r.materialId ?? r.material?.id ?? r.id);
    const key = `${vendorId}_${materialId}`;

    if (!seen.has(key)) {
      wp.push({
        id: key,
        vendor_id: vendorId,
        vendor_name: r.vendor_name ?? r.vendor?.name ?? '',
        vendor_category: r.vendor_category ?? r.vendor?.vendor_category ?? null,
        material_id: materialId,
        material_name: r.material_name ?? r.material ?? '',
        unit: r.unit ?? r.unit_name ?? null,
        detail: r.detail ?? '',
        hours_per_phase: r.hours_per_phase ?? {},  // ✅ SAVED HOURS
        tickets_loads: r.tickets_loads ?? {},      // ✅ SAVED TICKETS
      });
      seen.add(key);
    } else {
      // UPDATE existing wp row with vendor data (hours/tickets take priority)
      const existingIndex = wp.findIndex(row => row.id === key);
      if (existingIndex !== -1) {
        wp[existingIndex] = {
          ...wp[existingIndex],
          hours_per_phase: { ...wp[existingIndex].hours_per_phase, ...r.hours_per_phase },
          tickets_loads: r.tickets_loads ?? wp[existingIndex].tickets_loads,
          unit: r.unit ?? wp[existingIndex].unit,
          detail: r.detail ?? wp[existingIndex].detail,
        };
      }
    }
  });
}
console.log('🔥 RAW ts.data.vendors:', ts.data?.vendors?.map((v: any) => ({
  id: v.id,
  vendor_id: v.vendor_id,
  material_id: v.material_id,
  hasHours: !!v.hours_per_phase,
  hours: v.hours_per_phase,
  tickets: v.tickets_loads
})));

        const mt: any[] = [];
        if (ts.data?.selected_material_items) {
          Object.values(ts.data.selected_material_items).forEach((m: any) => mt.push({ id: m.id, name: m.name, materials: m.selectedMaterials || [] }));
        }
        const ds: any[] = [];
        if (ts.data?.selected_dumping_materials) {
          Object.values(ts.data.selected_dumping_materials).forEach((d: any) => ds.push({ id: d.id, name: d.name, materials: d.selectedMaterials || [] }));
        }
        

        // populate input states safely (existing helper logic ported)
        const populateSimple = (entities: any[] = [], field: 'hours_per_phase' | 'tickets_per_phase') => {
          const state: SimpleHourState = {};
          entities.forEach(e => {
            state[e.id] = {};
            if (e[field]) for (const phase in e[field]) state[e.id][phase] = String(e[field][phase] ?? '');
          });
          return state;
        };
console.log(ts.data?.vendors);

        const populateEmployees = (entities: any[] = []) => {
          const s: EmployeeHourState = {};
          entities.forEach(e => {
            s[e.id] = {};
            if (e.hours_per_phase) {
              for (const phase in e.hours_per_phase) {
                s[e.id][phase] = {};
                const v = e.hours_per_phase[phase];
                if (v && typeof v === 'object') {
                  for (const classCode in v) s[e.id][phase][classCode] = String(v[classCode] ?? '');
                }
              }
            }
          });
          return s;
        };

const populateEquipmentComplex = (entities: any[] = []) => {
  
  
  const s: ComplexHourState = {};
  const start: { [id: string]: string } = {};
  const stop: { [id: string]: string } = {};

  entities.forEach(e => {
    s[e.id] = {};

    // copy phase hours
    if (e.hours_per_phase) {
      for (const phase in e.hours_per_phase) {
        const v = e.hours_per_phase[phase];
        s[e.id][phase] = { REG: String(v.REG ?? 0), S_B: String(v.S_B ?? 0) };
      }
    }

    // copy start/stop hours into separate state
    start[e.id] = String(e.start_hours ?? 0);
    stop[e.id] = String(e.stop_hours ?? 0);
  });

  setStartHours(start);
  setStopHours(stop);

  return s;
};


        const populateUnits = (entities: any[] = []) => {
          const s: { [k: string]: string | null } = {};
          entities.forEach(e => { s[e.id] = e.unit ?? null; });
          return s;
        };
        // load autosave if present
        const saved = await AsyncStorage.getItem(`@autoSave_timesheet_${timesheetId}`);
        if (saved) {
  const sObj = JSON.parse(saved);

  // if server has `updated_at` or similar, compare:
  const draftSavedAt = sObj.savedAt || 0;
 const timestamp = ts?.updated_at ?? ts?.data?.updated_at;

const serverUpdatedAt = timestamp
  ? new Date(timestamp).getTime()
  : 0;

  // If draft is newer than server OR offline (no connection), restore it
  if (!isConnected || (draftSavedAt && draftSavedAt > (serverUpdatedAt || 0))) {
    restoreProcessedDraft(sObj, ts);
    setRestoredFromDraft(true);   // <--- SET FIRST
    
  } else {
    // In other case, server is newer — you can ignore draft or keep it for future sync
    console.log('Server newer — ignoring local draft for UI (but still kept for sync).');
  }
}
//   setWorkPerformed(wp);
//   const vh: SimpleHourState = {};
// const tl: Record<string, string> = {};
// const vu: Record<string, string> = {};

// wp.forEach(row => {
//   const key = row.id; // "2976_6"
  
//   // Hours per phase
//   vh[key] = {};
//   Object.keys(row.hours_per_phase || {}).forEach(phase => {
//     vh[key][phase] = String(row.hours_per_phase[phase] ?? '');
//   });
  
//   // Tickets
//   tl[key] = String(row.tickets_loads?.[key] ?? '');
  
//   // Units (vendor-level)
//   vu[row.vendor_id] = row.unit ?? vu[row.vendor_id] ?? "Hrs";
// });

// setVendorHours(vh);
// setTicketsLoads(prev => ({ ...prev, ...tl }));
// setVendorUnits(vu);
// After wp build:


if (!restoredFromDraft) {
  setSelectedPhases(ts.data?.job?.phase_codes || []);

        setEmployeeHours(populateEmployees(ts.data?.employees || []));
        setEquipmentHours(populateEquipmentComplex(ts.data?.equipment || []));
         if (Array.isArray(ts.data?.equipment)) {
    const s: { [k: string]: string } = {};
    const e: { [k: string]: string } = {};

    ts.data.equipment.forEach(eq => {
      s[eq.id] = String(eq.start_hours ?? '');
      e[eq.id] = String(eq.stop_hours ?? '');
    });

    setStartHours(s);
    setStopHours(e);
  }

  setWorkPerformed(wp);
  const vh: SimpleHourState = {};
const tl: Record<string, string> = {};
const vu: Record<string, string> = {};

wp.forEach(row => {
  const key = row.id; // "2976_6"
  
  // Hours per phase
  vh[key] = {};
  Object.keys(row.hours_per_phase || {}).forEach(phase => {
    vh[key][phase] = String(row.hours_per_phase[phase] ?? '');
  });
  
  // Tickets (FIXED)
  const rawTickets = row.tickets_loads;
  let ticketValue = rawTickets;

  if (typeof rawTickets === 'object' && rawTickets !== null) {
    ticketValue = rawTickets[key];
  }

  tl[key] = String(ticketValue ?? '');

  // Units (vendor-level)
  vu[row.vendor_id] = row.unit ?? vu[row.vendor_id] ?? "Hrs";
});

setVendorHours(vh);
setTicketsLoads(tl);
setVendorUnits(vu);

        setMaterialHours(populateSimple(ts.data?.materials_trucking || [], 'hours_per_phase'));
        setDumpingSiteHours(populateSimple(ts.data?.dumping_sites || [], 'hours_per_phase'));
        setMaterialUnits(populateUnits(ts.data?.materials_trucking || []));
        // setVendorUnits(populateUnits(ts.data?.vendors || []));
        if (Array.isArray(ts.data?.materials_trucking)) {
  ts.data.materials_trucking.forEach(m => {
    const value = m.tickets_loads?.[m.id];
    if (value != null) {
      setTicketsLoads(prev => ({
        ...prev,
        [m.id]: String(value)
      }));
    }
  });
}

if (Array.isArray(ts.data?.dumping_sites)) {
  ts.data.dumping_sites.forEach(d => {
    const value = d.tickets_loads?.[d.id];
    if (value != null) {
      setTicketsLoads(prev => ({
        ...prev,
        [d.id]: String(value)
      }));
    }
  });
}
  setMaterialsTrucking(mt);
  setDumpingSites(ds);
// after setVendorUnits(...)
if (ts.data?.total_quantities) {
  const pq: { [k: string]: string } = {};
  for (const p in ts.data.total_quantities) {
    pq[p] = String(ts.data.total_quantities[p]);
  }
  setTotalQuantities(pq);
setPhaseEntryQuantities(pq);
 // ✅ this is what the UI reads
}
}else {
  console.log("✅ Draft restored — skipping server overwrite");
}
        const eqRes = await apiClient.get('/api/equipment');
        setAvailableEquipment(eqRes.data || []);

        try {
          const userRes = await apiClient.get(`/api/users/${ts.foreman_id}`);
          const fn = `${userRes.data?.first_name || ''} ${userRes.data?.middle_name || ''} ${userRes.data?.last_name || ''}`.replace(/\s+/g, ' ').trim();
          setForemanName(fn);
        } catch (_) { /* ignore */ }

       
// Existing foreman fetch...
try {
  const userRes = await apiClient.get(`/api/users/${ts.foremanid}`);
  const fn = `${userRes.data?.firstname} ${userRes.data?.middlename} ${userRes.data?.lastname}`.replace(/,/g, '').trim();
  setForemanName(fn);
} catch { /* ignore */ }

// ADD SUPERVISOR FETCH HERE 👇
if (ts.data?.supervisor && typeof ts.data.supervisor === 'object' && 'name' in ts.data.supervisor) {
  setSupervisorName((ts.data.supervisor as { id: number; name: string }).name);
}

 if (ts.data?.job?.job_code) {
    try {
      const jobRes = await apiClient.get(
        `/api/job-phases/${ts.data.job.job_code}`
      );
    const codes = (jobRes.data?.phase_codes || []).map((p: any) => p.code);
      setJobPhaseCodes(codes);
    } catch (e) {
      console.warn("Failed to load job phase codes", e);
    }
  }
      } catch (err) {
        console.error(err);
        Alert.alert('Error', 'Failed to load timesheet.');
      } finally {
        
        setLoading(false);
      }
    };
    fetchData();
  }, [timesheetId]);

  // ---------------- AUTO SAVE (debounced) ----------------
  const autoSaveTimer = useRef<any>(null);
  useEffect(() => {
    if (!timesheet || loading) return;
    if (autoSaveTimer.current) clearTimeout(autoSaveTimer.current);
    autoSaveTimer.current = setTimeout(async () => {
      try {
         const processedData = buildUpdatedData();

      const draft = {
        timesheetId,
        data: processedData,   // FINAL processed structure
        status: "Pending",
         savedAt: Date.now()
      };
         await AsyncStorage.setItem(
        `@autoSave_timesheet_${timesheetId}`,
        JSON.stringify(draft)
      );
console.log('🚀 AUTOSAVE vendorHours:', vendorHours)
console.log('🚀 AUTOSAVE ticketsLoads:', ticketsLoads)
// await AsyncStorage.setItem(`autoSavetimesheettimesheetId`, JSON.stringify(draft))

      console.log("Auto-saved PROCESSED data");
      } catch (e) { console.warn('Auto-save fail', e); }
    }, 1500);
    return () => { if (autoSaveTimer.current) clearTimeout(autoSaveTimer.current); };
  }, [employeeHours, equipmentHours, materialHours, vendorHours, dumpingSiteHours,ticketsLoads, notes, materialUnits, vendorUnits, timesheetDate, selectedPhases, employeeReasons,phaseEntryQuantities,workPerformed]);

  // ---------------- HANDLERS ----------------
const handleEmployeeHourChange = (
  employeeId: string,
  phaseCode: string,
  classCode: string,
  value: string
) => {
  // If empty, treat as 0 (IMPORTANT fix)
  if (value.trim() === "") value = "0";
  // 1️⃣ Sanitize input (keep numbers + dot)
  const sanitized = value.replace(/[^0-9.]/g, '');
  setEmployeeHours(prev => {
    // 2️⃣ Build updated object
    const updated = {
      ...prev,
      [employeeId]: {
        ...(prev[employeeId] || {}),
        [phaseCode]: {
          ...(prev[employeeId]?.[phaseCode] || {}),
          [classCode]: sanitized,
        },
      },
    };

    // 3️⃣ Compute total hours for this employee (REG + SB across all phases)
    let total = 0;

     selectedPhases.forEach(ph => {
      const classes = updated[employeeId]?.[ph];
      if (classes && typeof classes === "object") {
        Object.values(classes).forEach(val => {
          const num = parseFloat(val || "0");
          if (!isNaN(num)) total += num;
        });
      }
    });

    // 4️⃣ Validation rule — cannot exceed 24 hours total
    if (total > 24) {
      Alert.alert("Total hours for employee cannot exceed 24 hours");
      return prev;  // ❗ Reject the change — revert to previous
    }

    // 5️⃣ Accept change
    return updated;
  });
};

  const handleComplexHourChange = (setter: React.Dispatch<any>, entityId: string, phaseCode: string, hourType: 'REG' | 'S_B', value: string) => {
    const sanitized = value.replace(/[^0-9.]/g, '');
    setter((prev: ComplexHourState) => ({ ...prev, [entityId]: { ...(prev[entityId] || {}), [phaseCode]: { ...(prev[entityId]?.[phaseCode] || {}), [hourType]: sanitized } } }));
  };

  const handleUnitChange = (type: 'material' | 'vendor', entityId: string, unit: string) => {
    const setter = type === 'material' ? setMaterialUnits : setVendorUnits;
    setter(prev => ({ ...prev, [entityId]: unit }));
  };

  const handleTotalQuantityChange = (phaseCode: string, value: string) => {
    const sanitized = value.replace(/[^0-9.]/g, '');
    setTotalQuantities(prev => ({ ...prev, [phaseCode]: sanitized }));
  };

const handleAddEquipment = () => {
  loadAvailableEquipment();
  setShowEquipmentPicker(true);
};

const handleSelectEquipment = (eq: any) => {
  if (!timesheet) return;

  setTimesheet(ts => ({
    ...ts!,
    data: {
      ...(ts!.data || {}),
      equipment: [...(ts!.data?.equipment || []), eq],
    },
  }));

  setEquipmentHours(prev => ({ ...prev, [eq.id]: {} }));
  setShowEquipmentPicker(false); // close picker after selection
};

const handleRemoveEmployee = (id: number) => {
  if (!timesheet) return;

  Alert.alert(
    "Remove Employee",
    "Are you sure you want to remove this employee?",
    [
      { text: "Cancel", style: "cancel" },
      {
        text: "Remove",
        style: "destructive",
        onPress: () => {
          // Remove from UI
          setTimesheet(prev => {
            if (!prev) return prev;
            return {
              ...prev,
              data: {
                ...prev.data,
                employees: prev.data?.employees?.filter(e => e.id !== String(id)) || []
              }
            };
          });

          // Remove hours saved
          setEmployeeHours(prev => {
            const copy = { ...prev };
            delete copy[id];
            return copy;
          });
        }
      }
    ]
  );
};

const handleRemoveEquipment = (id: string) => {
  if (!timesheet) return;

  Alert.alert(
    "Remove Equipment",
    "Are you sure you want to remove this equipment?",
    [
      { text: "Cancel", style: "cancel" },
      {
        text: "Remove",
        style: "destructive",
        onPress: () => {
          // Remove from UI
          setTimesheet(prev => {
            if (!prev) return prev;
            return {
              ...prev,
              data: {
                ...prev.data,
                equipment: prev.data?.equipment?.filter(e => e.id !== id) || []
              }
            };
          });

          // Remove hours saved
          setEquipmentHours(prev => {
            const copy = { ...prev };
            delete copy[id];
            return copy;
          });
        }
      }
    ]
  );
};

const handleSave = async () => {
  if (!timesheet) return;

  // ✅ PHASE VALIDATION (existing)
  if (!selectedPhases || selectedPhases.length === 0) {
    Alert.alert('Missing Phase Code', 'Please select at least one phase code for this timesheet');
    return;
  }

  // ✅ EMPLOYEE VALIDATION (existing)
  const employees = timesheet?.data?.employees;
  for (let emp of employees) {
    const total = calculateTotalEmployeeHours(employeeHours, emp.id);
    const reason = employeeReasons[emp.id];
    if (total === 0 && !reason) {
      Alert.alert('Missing Employee Reason', 
        `Employee ${emp.first_name.trim()} ${emp.last_name.trim()} has no hours entered. Please provide reason or enter hours.`);
      return;
    }
  }

// ---------------- VALIDATE EQUIPMENT HOURS ----------------
const empPhaseTotals = calculateEmployeePhaseTotals(employeeHours, selectedPhases);
const eqPhaseTotals = calculateComplexPhaseTotals(equipmentHours, selectedPhases);

let violatingPhases: string[] = [];

for (let phase of selectedPhases) {
  const empTotal = empPhaseTotals[phase] || 0;
  const eqTotal = eqPhaseTotals[phase] || 0;

  if (eqTotal > empTotal) {
    violatingPhases.push(phase);
  }
}

// If ANY phases violate, show list and stop
if (violatingPhases.length > 0) {
  Alert.alert(
    "Equipment Hours Error",
    `Equipment hours exceed employee hours for phases: ${violatingPhases.join(", ")}. Please verify.`
  );
  return; // stop save
}


  setIsSubmitting(true);

  if (!isConnected) {
    Alert.alert('Offline', 'Draft auto-saved locally. Syncs automatically when online.');
    setIsSubmitting(false); // ✅ Fix loading stuck
    return;
  }
  // ✅ Online: Normal save
  try {
    const updatedData = buildUpdatedData();
    await apiClient.put(`/api/timesheets/${timesheet.id}`, { 
      data: updatedData, 
      status: 'Pending' 
    });
    Alert.alert('Saved', 'Timesheet saved successfully');
    navigation.goBack();
  } catch (err) {
    console.error(err);
    Alert.alert('Error', 'Failed to save timesheet');
  } finally {
    setIsSubmitting(false);
  }
};

// ---------------- HELPERS ----------------

// convert string map → numbers
const toNumbersSimple = (
  m: Record<string, string> = {}
): Record<string, number> => {
  const out: Record<string, number> = {};
  Object.keys(m).forEach((phase) => {
    out[phase] = Number(m[phase] || 0);
  });
  return out;
};

// convert employee phase/class hours
const processEmployees = (
  phaseHours: Record<string, Record<string, string>> = {}
): Record<string, Record<string, number>> => {
  const out: Record<string, Record<string, number>> = {};

  Object.keys(phaseHours).forEach((phase) => {
    out[phase] = {};
    Object.keys(phaseHours[phase]).forEach((cls) => {
      const value = Number(phaseHours[phase][cls] || 0);
      if (value > 0) out[phase][cls] = value;
    });
  });

  return out;
};

// convert equipment REG / S_B hours
const processEquipment = (
  m: Record<string, { REG?: string; S_B?: string }> = {}
): Record<string, { REG: number; S_B: number }> => {
  const out: Record<string, { REG: number; S_B: number }> = {};

  Object.keys(m).forEach((phase) => {
    out[phase] = {
      REG: Number(m[phase]?.REG || 0),
      S_B: Number(m[phase]?.S_B || 0),
    };
  });

  return out;
};

// ---------------- BUILD FINAL PAYLOAD ----------------
const buildUpdatedData = () => {
  if (!timesheet) return {};
const base = timesheet?.data ? { ...timesheet.data } : {};

  // Rebuild grouped selected_vendor_materials from current workPerformed rows
  const groupedVendorMaterials: { [k: string]: any } = {};

  (workPerformed || []).forEach((row: any) => {
    const vendorId = String(row.vendor_id ?? row.vendorId ?? '');
    if (!vendorId) return;

    if (!groupedVendorMaterials[vendorId]) {
      groupedVendorMaterials[vendorId] = {
        id: Number(row.vendor_id),
        name: row.vendor_name ?? '',
        vendor_category: row.vendor_category ?? '',
        selectedMaterials: []
      };
    }

    // Add material entry
    groupedVendorMaterials[vendorId].selectedMaterials.push({
      id: Number(row.material_id),
      material: row.material_name ?? row.material ?? '',
      unit: row.unit ?? null,
      detail: row.detail ?? ''
    });
  });
  return {
    ...timesheet.data,
weather: weatherData,          // Sunny
temperature: temperatureData,  // 86°F
location: locationData,
 
    notes,

    job: {
      job_code: timesheet.data.job.job_code,
      phase_codes: selectedPhases,
    },

    total_quantities: Object.keys(phaseEntryQuantities || {}).reduce(
      (acc, p) => ({
        ...acc,
        [p]: Number(phaseEntryQuantities[p] || 0),
      }),
      {}
    ),

    // EMPLOYEES
    employees: timesheet.data.employees.map((emp) => ({
      ...emp,
      hours_per_phase: processEmployees(employeeHours[emp.id]),
      reason: employeeReasons[emp.id] || null,
    })),

    // EQUIPMENT
    equipment: timesheet.data.equipment.map((eq) => {
      console.log('Processing eq:', eq.id, startHours[eq.id], stopHours[eq.id]);
      const raw = equipmentHours[eq.id] || {};
      const { start_hours, stop_hours, ...phaseData } = raw;

      return {
        ...eq,
        hours_per_phase: processEquipment(phaseData),
        start_hours: Number(startHours[eq.id] || 0),
    stop_hours: Number(stopHours[eq.id] || 0),
      };
    }),

    // MATERIALS & TRUCKING
    materials_trucking: materialsTrucking.map((m) => ({
      id: m.id,
      name: m.name,
      unit: materialUnits[m.id],
      hours_per_phase: toNumbersSimple(materialHours[m.id] || {}),
      tickets_loads: { [m.id]: Number(ticketsLoads[m.id] || 0) },
    })),
     vendorHours,        // Save UI state
    ticketsLoads,       // Save UI state  
    vendorUnits,        // Save UI state
    workPerformed,
 selected_vendor_materials: groupedVendorMaterials,
    // VENDORS
    vendors: (workPerformed || []).map((r: any) => ({
      // build server-friendly vendor row — adapt fields to match server shape
      vendor_id: Number(r.vendor_id),
      vendor_name: r.vendor_name ?? '',
      vendor_category: r.vendor_category ?? '',
      material_id: Number(r.material_id),
      material_name: r.material_name ?? r.material ?? '',
      unit: r.unit ?? null,
      detail: r.detail ?? '',
  // tickets_loads: { [r.id]: Number(ticketsLoads?.[r.id] ?? r.tickets_loads?.[r.id] ?? 0) },
  //     hours_per_phase: r.hours_per_phase ?? {}
 tickets_loads: Number(ticketsLoads?.[r.id] ?? 0), 
  hours_per_phase: vendorHours?.[r.id] || r.hours_per_phase || {}
  
    })),

    // DUMPING SITES
    dumping_sites: dumpingSites.map((d) => ({
      id: d.id,
      name: d.name,
      hours_per_phase: toNumbersSimple(dumpingSiteHours[d.id] || {}),
      tickets_loads: { [d.id]: Number(ticketsLoads[d.id] || 0) },
    })),
  };
};


  // ---------------- RENDER: TABLE-LIKE SECTIONS ----------------
const handlePhaseEntryChange = (phaseCode: string, value: string) => {
  const sanitized = value.replace(/[^0-9.]/g, ''); // only numbers and dot
  setPhaseEntryQuantities(prev => ({
    ...prev,
    [phaseCode]: sanitized,
  }));
};


const handleAddEmployee = () => {
  loadAvailableEmployees();
  setShowEmployeePicker(true);
};


const handleSelectEmployee = (emp: any) => {
  setTimesheet(prev => {
    if (!prev) return prev;

    const alreadyExists = prev.data?.employees?.some(e => e.id === emp.id);
    if (alreadyExists) return prev;  // prevent duplicate

    return {
      ...prev,
      data: {
        ...prev.data,
        employees: [...(prev.data?.employees || []), emp],
      },
    };
  });

  // Remove added employee from picker list
  setEmployeesList(prev => prev.filter(e => e.id !== emp.id));

  // Initialize hours state for that employee
  setEmployeeHours(prev => ({
    ...prev,
    [emp.id]: {}
  }));

  // Close picker
  setShowEmployeePicker(false);
};

const handleAddVendor = () => {
  loadAvailableVendors();
  setShowVendorPicker(true);
};
const handleSelectVendor = (vendor: any) => {

  if (!vendor?.id) {
    Alert.alert("Invalid vendor");
    return;
  }
  // Normalize materials
  const materials = vendor.selectedMaterials || [];
  // If vendor has no materials, allow adding but with 0 rows
  if (materials.length === 0) {
    Alert.alert("This vendor has no materials assigned.");
    return;
  }
  // Duplicate check: if ANY vendor row exists with this vendor_id
  if (workPerformed.some(v => v.vendor_id === vendor.id)) {
    Alert.alert("Vendor Already Added");
    return;
  }
  // Build material-rows
  const newRows: any[] = materials.map((m: any) => ({
    id: `${vendor.id}_${m.id}`,   
    vendor_id: vendor.id,
    vendor_name: vendor.name,

    material_id: m.id,
    material_name: m.material,
    unit: m.unit,
    detail: m.detail,
    hours_per_phase: {},
    tickets_loads: {}
  }));

  // Add all rows
  setWorkPerformed(prev => [...prev, ...newRows]);

  // Initialize states for each row
  newRows.forEach(row => {
   setVendorHours(prev => ({
    ...prev,
    [row.id]: {}  // Empty object - will be populated by user edits
  }));

    setVendorUnits(prev => ({ ...prev, [row.id]: row.unit || "Hrs" }));
    setTicketsLoads(prev => ({
    ...prev,
    [row.id]: ""  // Empty string for new rows
  }));

  });

  setShowVendorPicker(false);
};



const handleRemoveVendor = (vendorId: number) => {
  Alert.alert("Remove Vendor", "Are you sure?", [
    { text: "Cancel", style: "cancel" },
    {
      text: "Remove",
      onPress: () => {
        setWorkPerformed(prev => prev.filter(v => v.id !== vendorId));

        setVendorHours(prev => {
          const copy = { ...prev };
          delete copy[vendorId];
          return copy;
        });

        setVendorUnits(prev => {
          const copy = { ...prev };
          delete copy[vendorId];
          return copy;
        });

        setTicketsLoads(prev => {
          const copy = { ...prev };
          delete copy[vendorId];
          return copy;
        });
      }
    }
  ]);
};


interface Material {
  id: number;
  material: string;
  unit: string;
}

interface Vendor {
  id: number;
  name: string;
  vendor_category: string | null;
  selectedMaterials: Material[];
}

const loadAvailableVendors = async () => {
  try {
    const res = await apiClient.get("/api/vendors");
    const rawList = res.data; 

    // Assigned vendors from timesheet (could be VendorWorkLog[])
    const assignedIds: number[] = (timesheet?.data?.vendors || []).map(v => Number(v.id));


    // Map raw API response → Vendor format
   const allVendors: Vendor[] = rawList.map((row: any) => ({
  id: Number(row.id),
  name: row.name,
  vendor_category: row.vendor_category,
  selectedMaterials: (row.materials as any[]).map((m: any) => ({
    id: Number(m.id),
    material: m.material,
    unit: m.unit
  })) || []
}));

const filtered: Vendor[] = allVendors.filter(v => !assignedIds.includes(v.id));

    setVendorsList(filtered);
  } catch (err) {
    console.log("Failed to load vendors", err);
  }
};



const InlineEditableNumber = ({
  value,
  onChange,
  placeholder = "0.00",
  style,
  validateHours = false,   // ✅ NEW FLAG
}: {
  value: string | number;
  onChange: (v: string) => void;
  placeholder?: string;
  style?: any;
  validateHours?: boolean;  // ✅ NEW
}) => {
  const [editing, setEditing] = React.useState(false);
  const [text, setText] = React.useState(value?.toString() ?? "");

  React.useEffect(() => setText(value?.toString() ?? ""), [value]);

  // validate only if validateHours === true
  const validateQuarterHour = (input: string) => {
    if (!validateHours) return input;       // ⛔ skip for tickets/loads

    if (!input) return "";

    let num = parseFloat(input);
    if (isNaN(num)) return "";

    const rounded = Math.round(num * 4) / 4;
    return rounded.toFixed(2);
  };

  return (
    <Pressable
      onPress={() => setEditing(true)}
      style={{ minWidth: 56, alignItems: "center", justifyContent: "center" }}
    >
      {editing ? (
        <TextInput
          value={text}
          onChangeText={(t) => setText(t)}
          onBlur={() => {
            setEditing(false);
            const valid = validateQuarterHour(text);
            setText(valid);
            onChange(valid);
          }}
          keyboardType="numeric"
          autoFocus
          style={[tableStyles.hourInput, style]}
          placeholder={placeholder}
        />
      ) : (
        <Text style={[tableStyles.hourText, value ? {} : tableStyles.hourPlaceholder]}>
          {value === "" || value === undefined || value === null
            ? placeholder
            : validateQuarterHour(value.toString())}
        </Text>
      )}
    </Pressable>
  );
};

// For bottom sheet search input
const loadAvailableEmployees = async () => {
  try {
    const res = await apiClient.get("/api/employees");
    const allEmployees = res.data || [];

    const assigned = timesheet?.data?.employees || [];

    const filtered = allEmployees.filter(
  (e: any) => !assigned.some((a: any) => a.id === e.id)
);
    setEmployeesList(filtered);
  } catch (err) {
    console.log("Failed to load employees", err);
  }
};

const loadAvailableEquipment = async () => {
  try {
    const res = await apiClient.get("/api/equipment");
    const allEquipment = res.data || [];

    const assigned = timesheet?.data?.equipment || [];

    const filtered = allEquipment.filter(
      (e: any) => !assigned.some((a: any) => a.id === e.id)
    );

    setEquipmentList(filtered);
  } catch (err) {
    console.log("Failed to load equipment", err);
  }
};

// ---------- Main renderEmployeeTable (drop-in replace) ----------
const renderEmployeeTable = () => {
  const employees = timesheet?.data?.employees || [];
  // const phaseCodes = timesheet?.data?.job?.phase_codes || [];
  const phaseCodes = jobPhaseCodes;

  const phaseTotals = calculateEmployeePhaseTotals(employeeHours, selectedPhases);

  const getEmployeeClasses = (emp: any, employeeHoursState: any) => {
    const defaultClasses = [emp.class_1, emp.class_2].filter(Boolean);
    
return [emp.class_1, emp.class_2].filter(Boolean);
  };


  return (
    <View style={styles.tableCard}>
   <View style={styles.headerRow}>
  <Text style={styles.sectionTitle}>Employee Hours</Text>

  <TouchableOpacity onPress={handleAddEmployee}>
    <Text style={styles.addButton}>+ Add Employee</Text>
  </TouchableOpacity>
</View>

{showEmployeePicker && (
  <View style={styles.bottomSheetOverlay}>
    <Pressable style={{ flex: 1 }} onPress={() => setShowEmployeePicker(false)} />

    <View style={styles.bottomSheetSmall}>


      {/* Drag Handle */}
      <View style={styles.dragHandle} />

      {/* Search */}
      <View style={{ paddingHorizontal: 16 }}>
        <TextInput
          placeholder="Search employee by name or ID..."
          value={search}
          onChangeText={setSearch}
          style={styles.searchBox}
          placeholderTextColor="#999"
        />
      </View>

      {/* Employee List */}
<ScrollView
        style={{ maxHeight: 300 }}
        nestedScrollEnabled={true}   // <-- Important
        showsVerticalScrollIndicator={true}
      >
  {employeesList
    .filter(emp => {
      const full = `${emp.first_name} ${emp.last_name}`.toLowerCase();
      const id = emp.id.toLowerCase();
      const s = search.toLowerCase();
      return full.includes(s) || id.includes(s);
    })
    .sort((a, b) => a.first_name.localeCompare(b.first_name))
    .map(emp => (
      <Pressable
        key={emp.id}
        style={styles.employeeRowSmall}
        onPress={() => handleSelectEmployee(emp)}
      >
        <View>
          <Text style={styles.empNameSmall}>
            {emp.first_name} {emp.last_name}
          </Text>
          <Text style={styles.empIdSmall}>ID: {emp.id}</Text>
        </View>
      </Pressable>
    ))}
</ScrollView>
      {/* Close Button */}
      <Pressable style={styles.closeButton} onPress={() => setShowEmployeePicker(false)}>
        <Text style={styles.closeButtonText}>Cancel</Text>
      </Pressable>
    </View>
  </View>
)}

 <ScrollView horizontal showsHorizontalScrollIndicator={false}>
      <View style={[tableStyles.tableWrap, { minWidth: '100%' }]}>
        {/* Header: left fixed + scrollable phases + right total */}
        <View style={tableStyles.headerContainer}>
        {/* <View style={{ flexDirection: "row" }}> */}
          <View style={tableStyles.leftHeader}>
            <View style={[tableStyles.headerCellFixed, { width: 72 }]}>
      <Text style={tableStyles.headerText}>EMP #</Text>
    </View>

           <View style={[tableStyles.headerCellFixed, { width: 200 }]}>
      <Text style={tableStyles.headerText}>LABOR{"\n"}EMPLOYEE{"\n"}NAME:</Text>

      <View style={{ flexDirection: "row", justifyContent: "space-between", marginTop: 4 }}>
        <Text style={tableStyles.headerSubText}>First</Text>
        <Text style={tableStyles.headerSubText}>Last</Text>
      </View>
    </View>

            <View style={[tableStyles.headerCellFixed, { width: 140 }]}>
      <Text style={tableStyles.headerText}>CLASS #</Text>
    </View>
          </View>

          {/* <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ alignItems: "stretch" }}> */}
           <ScrollView horizontal showsHorizontalScrollIndicator={false}>
            <View>

      {/* ROW 1 → PHASE # */}
      <View style={tableStyles.phaseHeaderRow}>
        {selectedPhases.map((code: string) => (
          <View key={`phase-${code}`} style={[tableStyles.headerCell, { width: 96 }]}>
            <Text style={tableStyles.headerText}>PHASE #</Text>
          </View>
        ))}
      </View>

      {/* ROW 2 → Phase code values */}
      <View style={tableStyles.phaseHeaderRow}>
        {selectedPhases.map((code: string) => (
          <View key={`code-${code}`} style={[tableStyles.headerCell, { width: 96 }]}>
            <Text style={[tableStyles.headerText, { color: "#137fec" }]}>{code}</Text>
          </View>
        ))}
      </View>

      {/* ROW 3 → HOURS under each code */}
      <View style={tableStyles.phaseHeaderRow}>
        {selectedPhases.map((code: string) => (
          <View key={`hours-${code}`} style={[tableStyles.headerCell, { width: 96 }]}>
            <Text style={tableStyles.headerSubText}>HOURS</Text>
          </View>
        ))}
      </View>

    </View>
          </ScrollView>

           <View style={[tableStyles.headerCellFixed, { width: 88 }]}>
    <Text style={tableStyles.headerText}>TOTAL</Text>
    {/* <Text style={tableStyles.headerSubText}>HOURS</Text> */}
  </View>
        </View>

        {/* Body: rows */}
        <ScrollView style={{ maxHeight: 420 }} nestedScrollEnabled>
          {employees.map((emp: any, empIndex: number) => {
            const allClasses = getEmployeeClasses(emp, employeeHours);
            const name = `${emp.first_name || ""} ${emp.last_name || ""}`.trim();

            return (
              <View key={emp.id} style={[tableStyles.employeeBlock]}>
                {/* For each class row */}
                {allClasses.map((classCode: string, classIndex: number) => {
                  const rowIsLastForEmp = classIndex === allClasses.length - 1;
                  const rowBg = empIndex % 2 === 0 ? tableStyles.row : tableStyles.rowAlt;

                  return (
                    <View key={`${emp.id}-${classCode}-${classIndex}`} style={[rowBg]}>
                      {/* Left fixed area */}
                      <View style={tableStyles.leftRow}>

  {/* EMP ID */}
<View style={[tableStyles.cellFixed, { width: 72, flexDirection: 'row', alignItems: 'center', justifyContent: 'flex-start', gap: 8 }]}>
  {classIndex === 0 ? (
    <>
      <Text style={tableStyles.cellTextBold}>{emp.id}</Text>

      {/* Small subtle delete X */}
       <TouchableOpacity
        onPress={() => handleRemoveEmployee(emp.id)}
        style={{
          backgroundColor: '#ffe5e5', // light red background
          borderRadius: 10,
          paddingHorizontal: 4,
          paddingVertical: 2,
          marginLeft: 4,
        }}
      >
        <Text style={{ color: '#cc2e2e', fontSize: 14, fontWeight: 'bold' }}>×</Text>
      </TouchableOpacity>
    </>
  ) : (
    <Text />
  )}
</View>

      {/* NAME + Reason dropdown */}
<View
  style={[
    tableStyles.cellFixed,
    {
      width: 200,
      justifyContent: "flex-start",
      alignItems: "flex-start",
      paddingVertical: 4,
    },
  ]}
>
  {classIndex === 0 ? (
    <View style={{ width: "100%" }}>
      <Text style={tableStyles.cellText}>{name}</Text>



      {/* Reason dropdown under name */}
      {calculateTotalEmployeeHours(employeeHours, emp.id) === 0 && (
        <View
           style={{
      marginTop: 4,
      backgroundColor: "white",
      borderWidth: 1,
      borderColor: "#ccc",
      borderRadius: 8,
      width: 120,
      height: 36, // reduce container height
      justifyContent: "center", // vertically center the picker
      paddingHorizontal: 4,
    }}
        >
          <Picker
            selectedValue={employeeReasons[emp.id] || ""}
            onValueChange={(v) =>
              setEmployeeReasons((prev) => ({ ...prev, [emp.id]: v }))
            }
          >
            <Picker.Item label="Select Reason…" value="" />
            <Picker.Item label="Sick" value="Sick" />
            <Picker.Item label="Safe" value="Safe" />
            <Picker.Item label="Off" value="Off" />
            <Picker.Item label="Other Crew" value="Other Crew" />
          </Picker>
        </View>
      )}
    </View>
  ) : (
    <Text />
  )}
</View>


      {/* CLASS */}
      <View style={[tableStyles.cellFixed, { width: 140, justifyContent: "flex-start", alignItems: "center" }]}>
        <Text style={tableStyles.cellText}>{classCode}</Text>
      </View>
    </View>
  

                      {/* Phase columns (scrollable) */}
                      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ alignItems: "center" }}>
  <View style={tableStyles.phaseRow}>
    {selectedPhases.map((p: string) => {
      const hourValue = employeeHours[emp.id]?.[p]?.[classCode] ?? "";
      const reasonSelected = !!employeeReasons[emp.id]; // check if reason is selected

      return (
       <View
  key={`${emp.id}-${classCode}-${p}`}
  style={[tableStyles.cell, { width: 96, opacity: reasonSelected ? 0.6 : 1 }]} // slightly dim if blocked
  pointerEvents={reasonSelected ? "none" : "auto"} // BLOCK interaction
>
  <InlineEditableNumber
    value={hourValue}
    onChange={(v) => handleEmployeeHourChange(emp.id, p, classCode, v)}
    validateHours={true} 
  />
</View>

      );
    })}
  </View>
</ScrollView>


                      {/* Right total fixed */}
                      <View style={[tableStyles.cellFixed, { width: 88 }]}>
                        {rowIsLastForEmp ? (
                          <Text style={tableStyles.totalText}>
                            {calculateTotalEmployeeHours(employeeHours, emp.id).toFixed(1)}
                          </Text>
                        ) : (
                          <Text />
                        )}
                      </View>
                       {/* Reason dropdown — only if employee has no hours */}

                    </View>
                  );
                })}
     </View>
            );
          })}

          {/* Totals row */}
          <View style={tableStyles.totalsContainer}>
            <View style={tableStyles.leftRow}>
              <View style={[tableStyles.cellFixed, { width: 72 }]} />
              <View style={[tableStyles.cellFixed, { width: 200 }]} />
              <View style={[tableStyles.cellFixed, { width: 140 }]}>
                <Text style={tableStyles.footerLabel}>TOTAL</Text>
              </View>
            </View>

            <ScrollView horizontal showsHorizontalScrollIndicator={false}>
              <View style={tableStyles.phaseFooterRow}>
                {selectedPhases.map((p: string) => (
                  <View key={`tot-${p}`} style={[tableStyles.headerCell, { width: 96 }]}>
                    <Text style={tableStyles.footerValue}>{(phaseTotals[p] ?? 0).toFixed(1)}</Text>
                  </View>
                ))}
              </View>
            </ScrollView>
          </View>
        </ScrollView>
        
      </View>
      </ScrollView>
    </View>
    
  );
};

const updateSimpleHours = (
  type: 'equipment' | 'material' | 'vendor' | 'dumping_site',
  entityId: string,
  phaseCode: string,
  value: string
) => {
  if (type === 'material') {
    setMaterialHours(prev => ({
      ...prev,
      [entityId]: { ...prev[entityId], [phaseCode]: value }
    }));
  }

 if (type === 'vendor') {
  // entityId = row.id = `${vendorId}_${materialId}`
setVendorHours(prev => ({
    ...prev,
    [entityId]: { ...(prev[entityId] || {}), [phaseCode]: value }
  }));
  setWorkPerformed(prev => prev.map(row => 
    row.id === entityId 
      ? { 
          ...row, 
          hours_per_phase: { 
            ...row.hours_per_phase, 
            [phaseCode]: value 
          } 
        }
      : row
  ));
}


  if (type === 'dumping_site') {
    setDumpingSiteHours(prev => ({
      ...prev,
      [entityId]: { ...prev[entityId], [phaseCode]: value }
    }));
  }
};
// Near the end of the file, before the final return statement, add this function:
const renderTotalQuantities = () => {
  if (selectedPhases.length === 0) return null;

  return (
    <View style={styles.card}>
      <Text style={styles.sectionTitle}>Total Quantities</Text>

      <View style={styles.quantityGrid}>
        {selectedPhases.map((phaseCode) => (
          <View key={phaseCode} style={styles.quantityItem}>
            <Text style={styles.quantityLabel}>{`Phase ${phaseCode}`}</Text>
            <TextInput
              style={styles.quantityInput}
              keyboardType="numeric"
              placeholder="Enter total quantity"
              value={phaseEntryQuantities[phaseCode] ?? ''}
              onChangeText={(v) => handlePhaseEntryChange(phaseCode, v)}
              placeholderTextColor="#999"
            />
          </View>
        ))}
      </View>
    </View>
  );
};
const handleVendorHourChange = (rowId: string, phaseCode: string, value: string) => {
  const sanitized = value.replace(/[^0-9.]/g, '');

  // Update vendorHours state
  setVendorHours(prev => ({
    ...prev,
    [rowId]: { ...prev[rowId], [phaseCode]: sanitized }
  }));

  // FIX: update correct key: hours_per_phase
  setWorkPerformed(prev =>
    prev.map(row =>
      row.id === rowId
        ? {
            ...row,
            hours_per_phase: {
              ...(row.hours_per_phase || {}),
              [phaseCode]: sanitized
            }
          }
        : row
    )
  );
};


const handleVendorTicketsChange = (rowId: string, value: string) => {
  const sanitized = value.replace(/[^0-9.]/g, '');
  setTicketsLoads(prev => ({ ...prev, [rowId]: sanitized }));
  setWorkPerformed(prev => prev.map(row =>
    row.id === rowId ? { ...row, tickets_loads: sanitized } : row
  ));
};



 const renderEntityTable = (
  title: string,
  entities: any[],
  type: 'equipment' | 'material' | 'vendor' | 'dumping_site'
) => {
  // const phaseCodes = timesheet?.data?.job?.phase_codes || [];
  const phaseCodes = jobPhaseCodes;

  const isEquipment = type === 'equipment';

  const hoursState: any =
    isEquipment ? equipmentHours : type === 'material' ? materialHours : type === 'vendor' ? vendorHours : dumpingSiteHours;

  // totals per phase (reuse your existing calculators)
  const phaseTotals = isEquipment
    ? calculateComplexPhaseTotals(equipmentHours, phaseCodes)
    : calculateSimplePhaseTotals(hoursState, phaseCodes);

  return (
    
     
<View style={styles.tableCard}>
      <View style={styles.headerRow}>
        <Text style={styles.sectionTitle}>{title}</Text>

        {isEquipment && (
          <TouchableOpacity onPress={handleAddEquipment}>
            <Text style={styles.addButton}>+ Add Equipment</Text>
          </TouchableOpacity>
        )}
        {type === "vendor" && (
  <TouchableOpacity onPress={handleAddVendor}>
    <Text style={styles.addButton}>+ Add Vendor</Text>
  </TouchableOpacity>
)}
      </View>
      <ScrollView horizontal showsHorizontalScrollIndicator={false}>
        <View style={[tableStyles.tableWrap, { minWidth: '100%' }]}>
          {/* Header: left fixed + scrollable phases + right total */}
          <View style={tableStyles.headerContainer}>
            <View style={tableStyles.leftHeader}>
              <View style={[tableStyles.headerCellFixed, { width: 72 }]}>
                <Text style={tableStyles.headerText}>{isEquipment ? 'EQUIP #' : '# ID'}</Text>
              </View>

              {/* <View style={[tableStyles.headerCellFixed, { width: 200 }]}>
                <Text style={tableStyles.headerText}>{isEquipment ? 'EQUIPMENT NAME' : title.toUpperCase()}</Text>
              </View> */}
              {/* Start Hours (equipment only) */}
{/* {type === 'equipment' && (
  <View style={[tableStyles.headerCellFixed, { width: 100 }]}>
    <Text style={tableStyles.headerText}>START HOURS</Text>
  </View>
)} */}

{/* Stop Hours (equipment only) */}
{/* {type === 'equipment' && (
  <View style={[tableStyles.headerCellFixed, { width: 100 }]}>
    <Text style={tableStyles.headerText}>STOP HOURS</Text>
  </View>
)} */}

{/* CLASS / TICKETS / LOADS Column */}
{/* {type === 'equipment' ? null : (
  <View style={[tableStyles.headerCellFixed, { width: 140 }]}>
    <Text style={tableStyles.headerText}>
      {type === 'dumping_site' ? '# OF LOADS' : '# OF TICKETS'}
    </Text>
  </View>
)} */}

{/* VENDOR TABLE CUSTOM HEADER */}
{type === "vendor" ? (
  <>
    {/* Vendor Name */}
    <View style={[tableStyles.headerCellFixed, { width: 180 }]}>
      <Text style={tableStyles.headerText}>VENDOR</Text>
    </View>

    {/* Material Name */}
    <View style={[tableStyles.headerCellFixed, { width: 180 }]}>
      <Text style={tableStyles.headerText}>MATERIAL</Text>
    </View>

    {/* Unit */}
    <View style={[tableStyles.headerCellFixed, { width: 80 }]}>
      <Text style={tableStyles.headerText}>UNIT</Text>
    </View>

    {/* Tickets */}
    <View style={[tableStyles.headerCellFixed, { width: 120 }]}>
      <Text style={tableStyles.headerText}># TICKETS</Text>
    </View>
  </>
) : (
  <>
    {/* Original header for other tables */}
    <View style={[tableStyles.headerCellFixed, { width: 200 }]}>
      <Text style={tableStyles.headerText}>{isEquipment ? 'EQUIPMENT NAME' : title.toUpperCase()}</Text>
    </View>
   {/* Start Hours (equipment only) */}
{type === 'equipment' && (
  <View style={[tableStyles.headerCellFixed, { width: 100 }]}>
    <Text style={tableStyles.headerText}>START HOURS</Text>
  </View>
)}

{/* Stop Hours (equipment only) */}
{type === 'equipment' && (
  <View style={[tableStyles.headerCellFixed, { width: 100 }]}>
    <Text style={tableStyles.headerText}>STOP HOURS</Text>
  </View>
)}
    {type !== 'equipment' && (
      <View style={[tableStyles.headerCellFixed, { width: 140 }]}>
        <Text style={tableStyles.headerText}>
          {type === 'dumping_site' ? '# OF LOADS' : '# OF TICKETS'}
        </Text>
      </View>
    )}
  </>
)}

            </View>

            <ScrollView horizontal showsHorizontalScrollIndicator={false}>
              <View>
                {/* ROW 1 → PHASE # */}
                <View style={tableStyles.phaseHeaderRow}>
                  {selectedPhases.map((code: string) => (
                    <View key={`phase-${code}`} style={[tableStyles.headerCell, { width: 96 }]}>
                      <Text style={tableStyles.headerText}>PHASE #</Text>
                    </View>
                  ))}
                </View>

                {/* ROW 2 → Phase code labels */}
                <View style={tableStyles.phaseHeaderRow}>
                  {selectedPhases.map((code: string) => (
                    <View key={`code-${code}`} style={[tableStyles.headerCell, { width: 96 }]}>
                      <Text style={[tableStyles.headerText, { color: '#137fec' }]}>{code}</Text>
                    </View>
                  ))}
                </View>

                {/* ROW 3 → Subtext under each phase */}
                <View style={tableStyles.phaseHeaderRow}>
                  {selectedPhases.map((code: string) => (
                    <View key={`hours-${code}`} style={[tableStyles.headerCell, { width: 96 }]}>
                      <Text style={tableStyles.headerSubText}>{isEquipment ? 'REG | S.B' : 'HRS/Qty'}</Text>
                    </View>
                  ))}
                </View>
              </View>
            </ScrollView>

            <View style={[tableStyles.headerCellFixed, { width: 88 }]}>
              <Text style={tableStyles.headerText}>TOTAL</Text>
            </View>
          </View>

          {/* Body rows */}
          <ScrollView style={{ maxHeight: 420 }} nestedScrollEnabled>
            {entities.map((ent: any, entIndex: number) => {
              const name = ent.name || `${ent.id}`;
              const total = isEquipment
                ? calculateTotalComplexHours(equipmentHours, ent.id)
                : calculateTotalSimple(hoursState, ent.id);

              const rowBg = entIndex % 2 === 0 ? tableStyles.row : tableStyles.rowAlt;

              return (
                <View key={ent.id} style={[rowBg]}>
                  {/* Left fixed area */}
                  <View style={tableStyles.leftRow}>
                   <View style={[tableStyles.cellFixed, { width: 72, flexDirection: 'row', alignItems: 'center', gap: 8 }]}>
  <Text style={tableStyles.cellTextBold}>{ent.id}</Text>


  {/* Remove icon for vendor & equipment */}
{(isEquipment || type === "vendor") && (
  <TouchableOpacity
    onPress={() =>
      type === "equipment"
        ? handleRemoveEquipment(ent.id)
        : handleRemoveVendor(ent.id)
    }
    style={{
      backgroundColor: "#ffe5e5",
      borderRadius: 10,
      paddingHorizontal: 4,
      paddingVertical: 2
    }}
  >
    <Text style={{ color: "#cc2e2e", fontSize: 14, fontWeight: "bold" }}>×</Text>
  </TouchableOpacity>
)}

</View>


                    {/* <View style={[tableStyles.cellFixed, { width: 200 }]}>
                      <Text style={tableStyles.cellText}>{name}</Text>
                    </View> */}
{/* Start Hours cell */}
{/* {type === 'equipment' && (
  <View style={[tableStyles.cellFixed, { width: 100 }]}>
    <InlineEditableNumber
      value={startHours[ent.id] ?? ""}
      onChange={(v) =>
   setStartHours(prev => ({
      ...prev,
      [ent.id]: v
    }))
}
 validateHours={true} 
      placeholder="0.0"
    />
  </View>
)} */}

{/* Stop Hours cell */}
{/* {type === 'equipment' && (
  <View style={[tableStyles.cellFixed, { width: 100 }]}>
    <InlineEditableNumber
      value={stopHours[ent.id] ?? ""}
      onChange={(v) =>
  setStopHours(prev => ({
    ...prev,
    [ent.id]: v
  }))
}
 validateHours={true} 
      placeholder="0.0"
    />
  </View>
)} */}

                   {/* CLASS / TICKETS / LOADS cell */}
{/* {type !== 'equipment' && (
<View style={[tableStyles.cellFixed, { width: 140 }]}>
    <InlineEditableNumber
      value={ticketsLoads[String(ent.id)] ?? ""}
      onChange={(v) => {
        // sanitize: keep only digits
        const clean = v.replace(/[^0-9]/g, "");
        setTicketsLoads(prev => ({
          ...prev,
          [String(ent.id)]: clean
        }));
      }}
      placeholder={type === 'dumping_site' ? "0 loads" : "0 tickets"}
      style={tableStyles.hourInput}
    />
  </View>
)} */}

{type === "vendor" ? (
  <>
    {/* Vendor Name */}
    <View style={[tableStyles.cellFixed, { width: 180 }]}>
      <Text style={tableStyles.cellText}>{ent.vendor_name}</Text>
    </View>

    {/* Material */}
    <View style={[tableStyles.cellFixed, { width: 180 }]}>
      <Text style={tableStyles.cellText}>{ent.material_name}</Text>
    </View>

    {/* Unit */}
    <View style={[tableStyles.cellFixed, { width: 80 }]}>
      <Text style={tableStyles.cellText}>{ent.unit}</Text>
    </View>
{console.log('🎫 TABLE TICKETS:', { 
   id: ent.id, 
   ticketsLoads: ticketsLoads[ent.id],
   workPerformedTickets: ent.tickets_loads
})}

    {/* Tickets */}
    
    <View style={[tableStyles.cellFixed, { width: 120 }]}>
       <InlineEditableNumber
    value={ticketsLoads[ent.id] ?? ''}  // ✅ Direct ticketsLoads state
    onChange={(v) => handleVendorTicketsChange(ent.id, v)}  // ✅ Correct handler
    placeholder="0"
    style={tableStyles.hourInput}
    validateHours={false}
  />
    </View>
    
  </>
  
) : (
  <>
   <View style={[tableStyles.cellFixed, { width: 200 }]}>
      <Text style={tableStyles.cellText}>{name}</Text>
    </View>
    {/* ORIGINAL LAYOUT FOR OTHER TYPES */}
    {/* Start Hours cell */}
    
{type === 'equipment' && (
  
  <View style={[tableStyles.cellFixed, { width: 100 }]}>
    <InlineEditableNumber
      value={startHours[ent.id] ?? ""}
      onChange={(v) =>
   setStartHours(prev => ({
      ...prev,
      [ent.id]: v
    }))
}
 validateHours={true} 
      placeholder="0.0"
    />
  </View>
)}

{/* Stop Hours cell */}
{type === 'equipment' && (
  <View style={[tableStyles.cellFixed, { width: 100 }]}>
    <InlineEditableNumber
      value={stopHours[ent.id] ?? ""}
      onChange={(v) =>
  setStopHours(prev => ({
    ...prev,
    [ent.id]: v
  }))
}
 validateHours={true} 
      placeholder="0.0"
    />
  </View>
)}

   

    {type !== "equipment" && (
      <View style={[tableStyles.cellFixed, { width: 140 }]}>
        <InlineEditableNumber
          value={ticketsLoads[String(ent.id)] ?? ""}
          onChange={(v) => {
            const clean = v.replace(/[^0-9]/g, "");
            setTicketsLoads(prev => ({ ...prev, [String(ent.id)]: clean }));
          }}
          placeholder={type === "dumping_site" ? "0 loads" : "0 tickets"}
        />
      </View>
    )}
  </>
)}

                  </View>

                  {/* Phase columns */}
                  <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ alignItems: 'center' }}>
                    <View style={tableStyles.phaseRow}>
                      {selectedPhases.map((p: string) => {
                        // Equipment: two fields per phase (REG, S_B)
                        if (isEquipment) {
                          const regVal = equipmentHours[ent.id]?.[p]?.REG ?? '';
                          const sbVal = equipmentHours[ent.id]?.[p]?.S_B ?? '';

                          return (
                            <View key={`${ent.id}-${p}`} style={[tableStyles.cell, { width: 96 }]}>
                              <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'center' }}>
                                <InlineEditableNumber
                                  value={regVal}
                                  onChange={(v) =>
                                    setEquipmentHours((prev: any) => ({
                                      ...prev,
                                      [ent.id]: {
                                        ...prev[ent.id],
                                        [p]: {
                                          ...prev[ent.id]?.[p],
                                          REG: v,
                                        },
                                      },
                                    }))
                                  }
                                   validateHours={true} 
                                  placeholder="0.0"
                                  style={tableStyles.hourInput}
                                />
                                <InlineEditableNumber
                                  value={sbVal}
                                  onChange={(v) =>
                                    setEquipmentHours((prev: any) => ({
                                      ...prev,
                                      [ent.id]: {
                                        ...prev[ent.id],
                                        [p]: {
                                          ...prev[ent.id]?.[p],
                                          S_B: v,
                                        },
                                      },
                                    }))
                                  }
                                   validateHours={true} 
                                  placeholder="0.0"
                                  style={tableStyles.hourInput}
                                />
                              </View>
                            </View>
                          );
                        }

                        // Non-equipment: single input per phase
                        const val = hoursState[ent.id]?.[p] ?? '';
console.log(`📊 TABLE RENDER ent.id=${ent.id}, phase=${p}, vendorHours[ent.id]?.[p]=`, vendorHours[ent.id]?.[p]);

                        return (
                          
                          <View key={`${ent.id}-${p}`} style={[tableStyles.cell, { width: 96 }]}>
                            <InlineEditableNumber
        value={vendorHours[ent.id]?.[p] ?? ''}
        onChange={v => handleVendorHourChange(ent.id, p, v)}
        placeholder="0.0"
        validateHours={true}
        style={tableStyles.hourInput}
      />
      
                          </View>
                        );
                      })}
                    </View>
                  </ScrollView>

                  {/* Right total fixed */}
                  <View style={[tableStyles.cellFixed, { width: 88 }]}>
                    <Text style={tableStyles.totalText}>
                      {total ? total.toFixed(1) : ''}
                    </Text>
                  </View>
                </View>
              );
            })}

            {/* Totals row */}
            <View style={tableStyles.totalsContainer}>
              <View style={tableStyles.leftRow}>
                <View style={[tableStyles.cellFixed, { width: 72 }]} />
                {type === 'equipment' && (
  <>
    <View style={[tableStyles.cellFixed, { width: 25 }]} />
    <View style={[tableStyles.cellFixed, { width: 25 }]} />
  </>
)}

                <View style={[tableStyles.cellFixed, { width: 200 }]} />
                <View style={[tableStyles.cellFixed, { width: 140 }]}>
                  <Text style={tableStyles.footerLabel}>TOTAL</Text>
                </View>
              </View>

              <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                <View style={tableStyles.phaseFooterRow}>
                  {selectedPhases.map((p: string) => (
                    <View key={`tot-${p}`} style={[tableStyles.headerCell, { width: 96 }]}>
                      <Text style={tableStyles.footerValue}>{(phaseTotals[p] ?? 0).toFixed(1)}</Text>
                    </View>
                  ))}
                </View>
              </ScrollView>

              {/* <View style={[tableStyles.cellFixed, { width: 88 }]}>
                <Text style={tableStyles.footerTotal}>
                  {Object.values(phaseTotals || {}).reduce((s: number, n: any) => s + (Number(n) || 0), 0).toFixed(1)}
                </Text>
              </View> */}
            </View>
          </ScrollView>
        </View>
      </ScrollView>
    </View>
    
  );
};

  if (loading) return <ActivityIndicator style={{ marginTop: 40 }} size="large" />;
  if (!timesheet) return <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}><Text>Timesheet not found</Text></View>;

  const phaseCodes = timesheet.data?.job?.phase_codes || [];


  return (
    <SafeAreaView style={styles.safeArea}>

      {!isConnected && !isCheckingConnection && (
  <View style={styles.offlineBanner}>
    <View style={styles.offlineIcon} />
    <Text style={styles.offlineText}>
      Working offline. Data will sync when connection is restored.
    </Text>
  </View>
)}
      <ScrollView contentContainerStyle={{ padding: THEME.SPACING, paddingBottom: 140 }}>
        <View style={styles.infoCard}>
          <Text style={styles.jobTitle}>{timesheet.data?.job_name || 'Timesheet'}</Text>
<Text style={[styles.jobCode, { fontWeight: 'bold' }]}>
  Job Code: {timesheet.data?.job?.job_code ?? 'N/A'}
</Text>
          <View style={styles.infoGrid}>
            <View style={styles.infoItem}><Text style={styles.infoLabel}>Date</Text><TouchableOpacity onPress={() => setDatePickerVisible(true)}><Text style={styles.infoValueClickable}>{timesheetDate.toLocaleDateString()}</Text></TouchableOpacity></View>
            <View style={styles.infoItem}><Text style={styles.infoLabel}>Foreman</Text><Text style={styles.infoValue}>{foremanName}</Text></View>
            <View style={styles.infoItem}>
                <Text style={styles.infoLabel}>Supervisor</Text>
                <Text style={styles.infoValue}>{supervisorName}</Text>
            </View>
          <View style={styles.infoItem}><Text style={styles.infoLabel}>Project Engineer</Text><Text style={styles.infoValue}>{timesheet.data?.project_engineer || 'N/A'}</Text>
</View>
<WeatherLocationCard
    onWeatherChange={setWeatherData}
        onTemperatureChange={setTemperatureData}
            onLocationChange={setLocationData}
            />

          </View>
        </View>

        {/* Phase selector */}
        {/* <ScrollView horizontal style={{ marginVertical: 8 }} showsHorizontalScrollIndicator={false}>
          {phaseCodes.map(p => (
            <TouchableOpacity key={p} style={[styles.phaseBtn, selectedPhase === p && styles.phaseBtnSelected]} onPress={() => setSelectedPhase(p)}>
              <Text style={[styles.phaseBtnText, selectedPhase === p && styles.phaseBtnTextSelected]}>{p}</Text>
            </TouchableOpacity>
          ))}
        </ScrollView> */}

       <TouchableOpacity 
  style={styles.phaseSelectorBtn}
  onPress={() => setPhaseModalVisible(true)}
>
  <Text style={styles.phaseSelectorText}>
    Job Code: {timesheet.data?.job?.job_code ?? 'N/A'}  ▼
  </Text>
</TouchableOpacity>

<Modal
  visible={phaseModalVisible}
  animationType="slide"
  transparent
>
  
  <View style={styles.modalBackdrop}>
    <View style={styles.modalContainer}>

      <Text style={styles.modalTitle}>Select Phase Codes</Text>

      <ScrollView style={{ maxHeight: 350 }}>
        
        {jobPhaseCodes.map(p => {
          
          const isSelected = selectedPhases.includes(p);

          return (
  <View
    key={p}
    style={styles.phaseItem}
  >
    <Text style={styles.phaseText}>{p}</Text>

    {/* Checkbox press only */}
    <TouchableOpacity
      onPress={() => {
        setSelectedPhases(prev => {
          if (prev.includes(p)) {
            return prev.filter(x => x !== p);   // uncheck
          }
          return [...prev, p];                  // check
        });
      }}
    >
      <View style={styles.checkbox}>
        {selectedPhases.includes(p) && <Text style={styles.tick}>✓</Text>}
      </View>
    </TouchableOpacity>
  </View>
);

        })}
      </ScrollView>

      <TouchableOpacity
        style={styles.doneBtn}
        onPress={() => setPhaseModalVisible(false)}
      >
        <Text style={styles.doneBtnText}>Done</Text>
      </TouchableOpacity>

    </View>
  </View>
</Modal>

        {/* Only render tables once a phase is selected - but we render full table anyway per request */}
        {renderEmployeeTable()}
        {renderEntityTable('Equipment', timesheet.data?.equipment || [], 'equipment')}
        {renderEntityTable('Work Performed', workPerformed, 'vendor')}
        {renderEntityTable('Materials and Trucking', materialsTrucking, 'material')}
        {renderEntityTable('Dumping Site', dumpingSites, 'dumping_site')}
{renderTotalQuantities()} {/* <--- INSERT THIS LINE HERE */}

   
        <View style={styles.card}>
          <Text style={styles.cardTitle}>Notes</Text>
          <TextInput style={styles.notesInput} multiline value={notes} onChangeText={setNotes} placeholder="Enter notes..." />
        </View>

      </ScrollView>

      <DatePicker modal open={isDatePickerVisible} date={timesheetDate} mode="date" onConfirm={(d) => { setDatePickerVisible(false); setTimesheetDate(d); }} onCancel={() => setDatePickerVisible(false)} />
        {showEquipmentPicker && (
  <View style={styles.bottomSheetOverlay}>
    <Pressable style={{ flex: 1 }} onPress={() => setShowEquipmentPicker(false)} />

   <View style={[styles.bottomSheetSmall, { flexGrow: 0.5 }]}>

      <View style={styles.dragHandle} />

      <TextInput
        placeholder="Search equipment..."
        value={equipmentSearch}
        onChangeText={setEquipmentSearch}
        style={styles.searchBox}
        placeholderTextColor="#999"
      />

      <ScrollView
        style={{ flex: 1, maxHeight: 400 }}
        nestedScrollEnabled={true}
        showsVerticalScrollIndicator={true}
      >
        {equipmentList
          .filter(eq =>
            eq.name.toLowerCase().includes(equipmentSearch.toLowerCase())
          )
          .map(eq => (
            <Pressable
              key={eq.id}
              style={styles.employeeRowSmall}
              onPress={() => handleSelectEquipment(eq)}
            >
              <View>
                <Text style={styles.empNameSmall}>{eq.name}</Text>
                <Text style={styles.empIdSmall}>ID: {eq.id}</Text>
              </View>
            </Pressable>
          ))}
      </ScrollView>

      <Pressable style={styles.closeButton} onPress={() => setShowEquipmentPicker(false)}>
        <Text style={styles.closeButtonText}>Cancel</Text>
      </Pressable>
    </View>
  </View>
)}
{/* Vendor Picker Modal */}
 {showVendorPicker && (
        <View style={styles.bottomSheetOverlay}>
          <Pressable style={{ flex: 1 }} onPress={() => setShowVendorPicker(false)} />
           <View style={[styles.bottomSheetSmall, { flexGrow: 0.5 }]}>
            <View style={styles.dragHandle} />
            <TextInput
              placeholder="Search vendor…"
              value={vendorSearch}
              onChangeText={setVendorSearch}
              style={styles.searchBox}
              placeholderTextColor="#999"
            />
            <ScrollView
              style={{ flex: 1, maxHeight: 400 }}
              nestedScrollEnabled={true}
              showsVerticalScrollIndicator={true}
            >
              {vendorsList
                .filter(v => `${v.name} ${v.id}`.toLowerCase().includes(vendorSearch.toLowerCase()))
                .map(v => (
                  <Pressable
                    key={v.id}
                    style={styles.employeeRowSmall}
                    onPress={() => handleSelectVendor(v)}
                  >
                    <View>
                      <Text style={styles.empNameSmall}>{v.name}</Text>
                      <Text style={styles.empIdSmall}>ID: {v.id}</Text>
                    </View>
                  </Pressable>
                ))}
            </ScrollView>
            <Pressable style={styles.closeButton} onPress={() => setShowVendorPicker(false)}>
              <Text style={styles.closeButtonText}>Cancel</Text>
            </Pressable>
          </View>
        </View>
      )}
      <View style={styles.footer}>
        <TouchableOpacity style={[styles.saveBtn, { backgroundColor: isSubmitting ? '#999' : THEME.primary }]} onPress={handleSave} disabled={isSubmitting}>
          {isSubmitting ? <ActivityIndicator color="#fff" /> : <Text style={styles.saveBtnText}>Save Draft</Text>}
        </TouchableOpacity>
      </View>
    </SafeAreaView>
    
  );
};

// ---------------- STYLES ----------------
const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: THEME.backgroundLight },
  infoCard: { padding: THEME.SPACING, backgroundColor: THEME.card, borderRadius: 12, marginBottom: THEME.SPACING, shadowColor: '#000', shadowOpacity: 0.04, shadowOffset: { width: 0, height: 2 }, shadowRadius: 6, elevation: 3 },
  jobTitle: { fontSize: 20, fontWeight: '700', color: THEME.text },
  jobCode: { fontSize: 14, color: THEME.textSecondary, marginTop: 6 },
  infoGrid: { marginTop: THEME.SPACING / 2, flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-between' },
  infoItem: { width: '48%', marginTop: 8 },
  infoLabel: { color: THEME.textSecondary, fontSize: 13 },
  infoValueClickable: { color: THEME.primary, fontWeight: '600', fontSize: 15 },
  infoValue: { color: THEME.text, fontWeight: '600', fontSize: 15 },

  phaseBtn: { paddingHorizontal: 16, paddingVertical: 8, borderRadius: 20, borderWidth: 1, borderColor: THEME.border, backgroundColor: THEME.card, marginRight: 8 },
  phaseBtnSelected: { backgroundColor: THEME.primary, borderColor: THEME.primary },
  phaseBtnText: { color: THEME.text, fontWeight: '600' },
  phaseBtnTextSelected: { color: '#fff' },

  tableCard: { backgroundColor: THEME.card, borderRadius: 12, padding: 8, marginBottom: THEME.SPACING },
  sectionTitle: { fontSize: 18, fontWeight: '700', marginBottom: 8, paddingLeft: 6 },

  card: { backgroundColor: THEME.card, borderRadius: 12, padding: THEME.SPACING, marginBottom: THEME.SPACING },
  cardTitle: { fontSize: 16, fontWeight: '700', marginBottom: 8 },
  notesInput: { borderWidth: 1, borderColor: THEME.border, borderRadius: 10, padding: 12, minHeight: 80, backgroundColor: THEME.lightGray },

  footer: { position: 'absolute', bottom: 0, left: 0, right: 0, padding: 12, backgroundColor: THEME.card, borderTopWidth: 1, borderColor: THEME.border },
  saveBtn: { height: 52, borderRadius: 12, justifyContent: 'center', alignItems: 'center' },
  saveBtnText: { color: '#fff', fontWeight: '700', fontSize: 16 },
bottomSheetOverlay: {
  position: "absolute",
  top: 0,
  left: 0,
  right: 0,
  bottom: 0,
  backgroundColor: "rgba(0,0,0,0.4)",
  justifyContent: "flex-end",
  paddingBottom: 80,
  zIndex: 999,   // VERY IMPORTANT
  elevation: 999 // For Android
},

bottomSheet: {
  backgroundColor: "#fff",
  paddingBottom: 20,
  paddingTop: 10,
  borderTopLeftRadius: 22,
  borderTopRightRadius: 22,
  position: "absolute",
  bottom: 0,
  width: "100%",
},


dragHandle: {
  width: 50,
  height: 6,
  backgroundColor: "#ccc",
  borderRadius: 3,
  alignSelf: "center",
  marginBottom: 12,
},
addButton: {
  color: "#137fec",
  fontWeight: "600",
  fontSize: 16,
  paddingVertical: 6,
  paddingHorizontal: 14,
  borderRadius: 14,
},
addButtonWrapper: {
  position: "absolute",
  right: 0,
  top: 0,
}
,
searchBox: {
  backgroundColor: "#f4f4f4",
  borderRadius: 10,
  padding: 10,
  fontSize: 15,
  marginTop: 6,
},

empName: {
  fontSize: 16,
  fontWeight: "600",
  color: "#333",
},

empId: {
  fontSize: 13,
  fontWeight: "400",
  color: "#666",
  marginTop: 2,
},

employeeRow: {
  paddingVertical: 12,
  paddingHorizontal: 18,
  borderBottomColor: "#ddd",
  borderBottomWidth: 1,
},
employeeRowSmall: {
  paddingVertical: 10,
  paddingHorizontal: 14,
  borderBottomColor: "#e2e2e2",
  borderBottomWidth: 1,
},

empNameSmall: {
  fontSize: 15,
  fontWeight: "600",
  color: "#333",
},

empIdSmall: {
  fontSize: 12,
  fontWeight: "400",
  color: "#666",
  marginTop: 1,
},
bottomSheetSmall: {
  width: "70%",
  alignSelf: "center",
  backgroundColor: "white",
  borderRadius: 16,
  padding: 16,
  marginBottom: 40,
  maxHeight: "80%",
  shadowColor: "#000",
  shadowOpacity: 0.15,
  shadowRadius: 10,
  elevation: 6,
  flexDirection: 'column',  // ✅ ADDED
},



closeButton: {
  marginTop: 12,
  height: 45,
  borderRadius: 10,
  backgroundColor: "#e6e6e6",
  justifyContent: "center",
  alignItems: "center",
},

closeButtonText: {
  fontSize: 16,
  color: "#d00",
  fontWeight: "600",
},
  headerRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    backgroundColor: "#f1f5f9",
    borderBottomWidth: 1,
    borderColor: "#e2e8f0",
    minHeight: 42,
    alignItems: "center",
  },
phaseSelectorBtn: {
  backgroundColor: "#137fec",
  padding: 12,
  borderRadius: 8,
  alignSelf: "flex-start",
  marginTop: 10
},
phaseSelectorText: {
  color: "#fff",
  fontSize: 16,
  fontWeight: "600"
},

modalBackdrop: {
  flex: 1,
  backgroundColor: "rgba(0,0,0,0.5)",
  justifyContent: "center",
  alignItems: "center"
},
modalContainer: {
  backgroundColor: "#fff",
  width: "85%",
  padding: 20,
  borderRadius: 12
},
modalTitle: {
  fontSize: 18,
  fontWeight: "700",
  marginBottom: 15
},
phaseItem: {
  flexDirection: "row",
  justifyContent: "space-between",
  alignItems: "center",
  paddingVertical: 12,
  borderBottomWidth: 1,
  borderColor: "#e0e0e0"
},
phaseText: {
  fontSize: 16,
  fontWeight: "500"
},
checkbox: {
  width: 22,
  height: 22,
  borderWidth: 2,
  borderColor: '#007AFF',
  borderRadius: 4,
  alignItems: 'center',
  justifyContent: 'center',
  backgroundColor: 'white',
},

tick: {
  fontSize: 14,
  color: '#007AFF',
  fontWeight: 'bold',
},

doneBtn: {
  backgroundColor: "#137fec",
  paddingVertical: 12,
  borderRadius: 8,
  marginTop: 15
},
doneBtnText: {
  color: "#fff",
  textAlign: "center",
  fontSize: 16,
  fontWeight: "700"
},


circularRemoveBtn: {
  width: 24,
  height: 24,
  borderRadius: 12,
  backgroundColor: '#F3F3F3', // Light gray background
  justifyContent: 'center',
  alignItems: 'center',
},
circularRemoveText: {
  color: '#888', // Dark gray '✕'
  fontSize: 14,
},

// --- ATTRACTIVE STYLES FOR TOTAL QUANTITIES ---
quantityGrid: {
  flexDirection: 'row',
  flexWrap: 'wrap',
  gap: THEME.SPACING,
  marginTop: THEME.SPACING / 2,
  
},
quantityItem: {
  width: '32%', // two columns
  marginBottom: THEME.SPACING,
},
quantityLabel: {
  fontSize: 14,
  fontWeight: '600',
  // Stronger contrast for a clean, attractive label
  color: THEME.text, 
  marginBottom: 6,
},
quantityInput: {
  borderWidth: 1,
  // Consistent subtle border
  borderColor: THEME.border, 
  // Slightly rounder corners, consistent with notesInput
  borderRadius: 10, 
  // Increased vertical padding for a spacious, polished field
  paddingVertical: 10, 
  paddingHorizontal: 12,
  fontSize: 15,
  // Make the entered quantity bold (attractive)
  fontWeight: '400', 
  color: THEME.text, 
  // Consistent, very light background
  backgroundColor: THEME.lightGray, 
},
 offlineBanner: {
  position: 'absolute',
  top: 0,
  left: 0,
  right: 0,
  zIndex: 999,
    backgroundColor: '#ff6b6b',
    paddingVertical: 8,
    paddingHorizontal: 16,
    flexDirection: 'row',
    alignItems: 'center',
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255,107,107,0.3)',
  },
  offlineIcon: {
    width: 16,
    height: 16,
    borderRadius: 8,
    backgroundColor: 'rgba(255,255,255,0.3)',
    marginRight: 8,
  },
  offlineText: {
    color: 'white',
    fontSize: 14,
    fontWeight: '500',
  },
});


const tableStyles = StyleSheet.create({
  
  input: {
  borderBottomWidth: 1,
  borderColor: "#d1d5db",
  paddingVertical: 4,
  fontSize: 14,
  textAlign: "center",
  minWidth: 55,
},

  tableWrap: {
    borderRadius: 10,
    borderWidth: 1,
    borderColor: "#e6e9ee",
    overflow: "hidden",
    backgroundColor: "#fff",
  },

  headerContainer: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#f8fafc",
    borderBottomWidth: 1,
    borderColor: "#e6e9ee",
    paddingVertical: 8,
  },

  leftHeader: {
    flexDirection: "row",
    alignItems: "center",
  },

  headerCellFixed: {
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRightWidth: 1,
    borderColor: "#eef2f7",
    justifyContent: "center",
    backgroundColor: "#fbfcfd",
  },

  headerCell: {
    paddingHorizontal: 10,
    paddingVertical: 8,
    borderRightWidth: 1,
    borderColor: "#eef2f7",
    justifyContent: "center",
  },

  headerText: {
    fontSize: 13,
    fontWeight: "700",
    color: "#0f172a",
    textAlign: "center",
  },

  employeeBlock: {
    borderBottomWidth: 0, // separate rows handled inside
  },

  // Row styles (zebra)
  row: {
    flexDirection: "row",
    alignItems: "center",
    minHeight: 44,
    borderBottomWidth: 1,
    borderColor: "#f1f5f9",
    backgroundColor: "#ffffff",
  },

  rowAlt: {
    flexDirection: "row",
    alignItems: "center",
    minHeight: 44,
    borderBottomWidth: 1,
    borderColor: "#f1f5f9",
    backgroundColor: "#fafbfc",
  },

  leftRow: {
    flexDirection: "row",
    alignItems: "center",
  },

  cellFixed: {
    paddingHorizontal: 10,
    paddingVertical: 8,
    borderRightWidth: 1,
    borderColor: "#f1f5f9",
    justifyContent: "center",
  },

  cell: {
    paddingHorizontal: 8,
    paddingVertical: 8,
    borderRightWidth: 1,
    borderColor: "#f1f5f9",
    justifyContent: "center",
    alignItems: "center",
  },

  phaseHeaderRow: {
    flexDirection: "row",
    alignItems: "center",
  },

  phaseRow: {
    flexDirection: "row",
    alignItems: "center",
  },

  phaseFooterRow: {
    flexDirection: "row",
    alignItems: "center",
  },

  // Text styles
  cellText: {
    fontSize: 13,
    color: "#111827",
  },
  cellTextBold: {
    fontSize: 13,
    fontWeight: "700",
    color: "#111827",
  },

  // hour cell (non-boxy)
  hourText: {
    fontSize: 13,
    textAlign: "center",
    color: "#111827",
    paddingVertical: 6,
    minWidth: 56,
  },
  hourPlaceholder: {
    color: "#9ca3af",
  },
  hourInput: {
    fontSize: 13,
    minWidth: 56,
    paddingVertical: 4,
    paddingHorizontal: 6,
    borderBottomWidth: 1,
    borderColor: "#e2e8f0",
    textAlign: "center",
  },

  // class cell
  classCellInner: {
    flexDirection: "row",
    alignItems: "center",
  },
  classBtn: {
    backgroundColor: "#f3f4f6",
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 6,
    minWidth: 80,
  },
  classBtnText: {
    fontSize: 13,
    fontWeight: "600",
    color: "#0f172a",
  },
  classInput: {
    borderBottomWidth: 1,
    borderColor: "#cbd5e1",
    paddingVertical: 4,
    paddingHorizontal: 6,
    minWidth: 80,
    fontSize: 13,
  },

  iconBtnSmall: {
    paddingHorizontal: 8,
    paddingVertical: 6,
  },

  totalText: {
    fontSize: 13,
    fontWeight: "800",
    color: "#DC2626",
    textAlign: "center",
  },

  // add class row
  addClassRow: {
    flexDirection: "row",
    alignItems: "center",
    minHeight: 44,
    backgroundColor: "#ffffff",
    borderBottomWidth: 1,
    borderColor: "#f7eef0",
  },
  addClassBtn: {
    backgroundColor: "#edf2ff",
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
    alignItems: "center",
  },
  addClassText: {
    color: "#137fec",
    fontWeight: "600",
  },

  // totals
  totalsContainer: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#fff8f9",
    borderTopWidth: 2,
    borderColor: "#fde2e6",
    minHeight: 52,
  },
  footerLabel: {
    fontWeight: "800",
    fontSize: 13,
    color: "#111827",
    textAlign: "left",
  },
  footerValue: {
    fontWeight: "800",
    fontSize: 13,
    color: "#DC2626",
    textAlign: "center",
  },
  footerTotal: {
    fontWeight: "900",
    fontSize: 14,
    textAlign: "center",
    color: "#111827",
  },
  table: {
    borderRadius: 10,
    borderWidth: 1,
    borderColor: "#E2E8F0",
    overflow: "hidden",
    backgroundColor: "#fff",
  },

  headerRow: {
    flexDirection: "row",
    backgroundColor: "#f1f5f9",
    borderBottomWidth: 1,
    borderColor: "#e2e8f0",
    minHeight: 42,
    alignItems: "center",
  },



  body: {
    backgroundColor: "#ffffff",
  },



  // Clean underline input
  inputCell: {
    fontSize: 13,
    paddingVertical: 3,
    paddingHorizontal: 4,
    borderBottomWidth: 1,
    borderColor: "#cbd5e1",
    backgroundColor: "#fff",
  },

  totalsRow: {
    backgroundColor: "#fff1f2",
    minHeight: 42,
    alignItems: "center",
  },
  headerSubText: {
  fontSize: 11,
  color: "#333",
  textAlign: "center",
},


smallText: { fontSize: 12, color: THEME.textSecondary },


});

export default TimesheetEditScreen;
