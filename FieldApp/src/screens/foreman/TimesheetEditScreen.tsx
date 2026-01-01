import React, { useEffect, useRef, useState, useCallback } from 'react';
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
import Feather from "react-native-vector-icons/Feather";
import Ionicons from "react-native-vector-icons/Ionicons";
import { useFocusEffect } from '@react-navigation/native';
import Pdf from 'react-native-pdf';
import { Image } from 'react-native';

import API_URL from "../../config";

const API_BASE_URL = API_URL;

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
type ComplexHourState = { [key: string]: { [key: string]: { REG?: string; SB?: string } } };
type EmployeeHourState = { [key: string]: { [key: string]: { [classCode: string]: string } } };
type SimpleHourState = { [key: string]: { [key: string]: string } };

type Props = { route: any; navigation: any };
type PhaseCode = string;
type ClassCode = string;
type HourType = 'REG' | 'SB';
type ClassCodeOption = {
  code: string;
  description: string;
};
// --- MOVE THESE TO TOP OF TimesheetEditScreen ---
const getImageUri = (ticket: any): string | null => {
  if (!ticket) return null;

  // 🔍 Use the exact key from your debug log: image_path
  const path = ticket.image_path || ticket.image_url || ticket.file_url;
  
  if (!path) {
    console.log("❌ DEBUG: No path found in ticket object:", ticket);
    return null;
  }

  // If the path is already a full URL, return it
  if (path.startsWith("http")) return path;

  // Otherwise, combine with your API_BASE_URL
  // Note: Ensure API_BASE_URL does NOT end with a slash if path starts with one
  return `${API_BASE_URL}${path}`;
};
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
// --- Ticket Linking States ---
const [availableScannedTickets, setAvailableScannedTickets] = useState<any[]>([]);
const [ticketModalVisible, setTicketModalVisible] = useState(false);
const [linkingRowId, setLinkingRowId] = useState<string | null>(null);
const [selectedTicketIds, setSelectedTicketIds] = useState<{ [rowId: string]: number[] }>({});
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
// --- New States for PDF Viewing ---
const [selectedTicket, setSelectedTicket] = useState<any | null>(null);
const [isPdfFullScreen, setIsPdfFullScreen] = useState(false);
  const [employeesList, setEmployeesList] = useState<any[]>([]);
// Around line 84
const [jobPhaseCodes, setJobPhaseCodes] = useState<any[]>([]);
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
  // Trucking Picker States
const [showTruckingPicker, setShowTruckingPicker] = useState(false);
const [truckingSearch, setTruckingSearch] = useState('');
const [truckingList, setTruckingList] = useState<any[]>([]);
// Dumping Site Picker States
const [showDumpingPicker, setShowDumpingPicker] = useState(false);
const [dumpingSearch, setDumpingSearch] = useState("");
const [dumpingList, setDumpingList] = useState<any[]>([]);
const [availableClassCodes, setAvailableClassCodes] = useState<ClassCodeOption[]>([]);
const [classPickerVisible, setClassPickerVisible] = useState<{empId: string} | null>(null);const getActiveCategory = () => {
  if (!linkingRowId) return null;

  // Check which state array contains the current ID
  if (workPerformed.some(v => String(v.id) === String(linkingRowId))) return 'Materials';
  if (materialsTrucking.some(t => String(t.id) === String(linkingRowId))) return 'Trucking';
  if (dumpingSites.some(d => String(d.id) === String(linkingRowId))) return 'Dumping Site';

  return null;
};

const activeCategory = getActiveCategory();

// Filter based ONLY on the Category column in your database
const filteredTickets = availableScannedTickets.filter(ticket => {
  const ticketCat = (ticket.category || "").toLowerCase().trim();
  const currentCat = (activeCategory || "").toLowerCase().trim();
  return ticketCat === currentCat;
});
const savePhasesImmediately = useCallback(
  async (phases: string[]) => {
    console.log('[PHASE AUTOSAVE] called with phases:', phases);

    try {
      const key = `@autoSave_timesheet_${timesheetId}`;
      console.log('[PHASE AUTOSAVE] storage key =', key);

      const draftRaw = await AsyncStorage.getItem(key);
      console.log('[PHASE AUTOSAVE] existing draftRaw =', draftRaw);

      let currentDraft: any;

      if (draftRaw) {
        currentDraft = JSON.parse(draftRaw);
      } else {
        currentDraft = { timesheetId, data: {}, status: 'Pending' };
      }

      // ✅ ENSURE data is an object, never an array
      if (Array.isArray(currentDraft.data) || typeof currentDraft.data !== 'object' || currentDraft.data === null) {
        console.log('[PHASE AUTOSAVE] data was not object, resetting to {}');
        currentDraft.data = {};
      }

      currentDraft.data.selectedPhases = phases;  // ✅ store here
      currentDraft.savedAt = Date.now();

      console.log('[PHASE AUTOSAVE] writing draft =', JSON.stringify(currentDraft));

      await AsyncStorage.setItem(key, JSON.stringify(currentDraft));

      console.log('[PHASE AUTOSAVE] write success');
    } catch (e) {
      console.warn('[PHASE AUTOSAVE] failed:', e);
    }
  },
  [timesheetId],
);


console.log("🟢 TimesheetEditScreen rendered");

useEffect(() => {
  console.log("🔥 useEffect ran: fetching class codes");

  const fetchClassCodes = async () => {
    try {
      const res = await apiClient.get('/api/timesheets/class-codes');
      console.log("✅ backend responded", res.data);
      setAvailableClassCodes(res.data || []);
    } catch (e) {
      console.warn("❌ Failed to load class codes", e);
    }
  };

  fetchClassCodes();
}, []);


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

// Fix calculateTotalComplexHours (Equipment)
const calculateTotalComplexHours = (state: ComplexHourState, entityId: string): number => {
  const obj = state[entityId];
  if (!obj) return 0;
  let total = 0;
  selectedPhases.forEach((phase: PhaseCode) => {
    total += toNumber(obj[phase]?.REG);
    total += toNumber(obj[phase]?.SB);
  });
  return total;
};

  const calculateComplexPhaseTotals = (state: ComplexHourState, phaseCodes: string[] = []) => {
    const totals: { [k: string]: number } = {};
    phaseCodes.forEach(p => { totals[p] = 0; });
    Object.values(state).forEach(entity => {
      phaseCodes.forEach(p => {
        totals[p] += toNumber(entity[p]?.REG) + toNumber(entity[p]?.SB);
      });
    });
    return totals;
  };

const calculateSimplePhaseTotals = (state: SimpleHourState, phaseCodes: PhaseCode[]): Record<PhaseCode, number> => {
  const totals: Record<PhaseCode, number> = {};
  phaseCodes.forEach((p: PhaseCode) => totals[p] = 0);
  Object.values(state).forEach((entity: Record<PhaseCode, string>) => {
    phaseCodes.forEach((p: PhaseCode) => {
      totals[p] += toNumber(entity[p]);
    });
  });
  return totals;
};

const calculateSimplePhaseTotalsByEntities = (
  state: SimpleHourState, 
  safeEntities : Array<{ id: string }>, 
  phaseCodes: string[]
): Record<string, number> => {
  const totals: Record<string, number> = {};
  phaseCodes.forEach(p => totals[p] = 0);
  
  // Only sum entities that exist in the provided entities array
  safeEntities ?.forEach(entity => {
    phaseCodes.forEach(p => {
      totals[p] += toNumber(state[entity.id]?.[p]);
    });
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
  if (d.ticketsLoads) {
    console.log('RESTORING ticketsLoads FROM DRAFT', d.ticketsLoads);
    setTicketsLoads(Object.keys(d.ticketsLoads).reduce((acc: any, k: string) => {
      acc[k] = String(d.ticketsLoads[k] ?? '');
      return acc;
    }, {}));
  }
  if (d.linked_tickets) {
    setSelectedTicketIds(d.linked_tickets);
    console.log('✅ Restored ticket links from draft:', d.linked_tickets);
  }
  if (d.notes) setNotes(d.notes)
  // 2) restore selected phases (server & draft may differ)
 const phaseCodes = d.job?.phasecodes || d.selectedPhases || [];
setSelectedPhases(Array.isArray(phaseCodes) ? phaseCodes : phaseCodes.split(','));

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

  // 5) restore equipment -> equipmentHours (REG, SB strings) and start/stop
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
        eqHours[eq.id][phase] = { REG: String(v.REG ?? ''), SB: String(v.SB ?? '') };
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
  const units: { [k: string]: string | null } = {};

  d.materials_trucking.forEach((m: any) => {
    const key = String(m.id);           // normalize id to string

    mHours[key] = {};
    Object.keys(m.hours_per_phase || {}).forEach(phase => {
      mHours[key][phase] = String(m.hours_per_phase[phase] ?? '');
    });

    units[key] = m.unit ?? null;

    if (m.tickets_loads?.[m.id] !== undefined) {
      setTicketsLoads(prev => ({
        ...prev,
        [key]: String(m.tickets_loads[m.id]),
      }));
    }
  });

  setMaterialHours(mHours);
  setMaterialUnits(units);

  // trucking rows for the table
  setMaterialsTrucking(
    d.materials_trucking.map((m: any) => ({ ...m, id: String(m.id) }))
  );
}


// TimesheetEditScreen.tsx

// ... around line 370 in restoreProcessedDraft

if (Array.isArray(d.vendors)) {
  const vHours: SimpleHourState = {};
  const vTickets: Record<string, string> = {};
  const vUnits: Record<string, string | null> = {};
  const rebuiltWorkPerformed: any[] = [];

d.vendors.forEach((v: any, index: number) => {
    // 💡 Retrieve IDs: v.id will now (after FIX 1) contain the uniqueRowId
    const vendorId = Number(v.vendor_id ?? v.id);
    const materialId = Number(v.material_id ?? v.id);
    
    // ✅ Use the stored ID (v.id) or reconstruct the unique key
    const uniqueRowId = v.id || `${vendorId}_${materialId}`; 

    // Hours from draft vendors
    if (v.hours_per_phase) {
      // ✅ Use uniqueRowId to key the hours state
      vHours[uniqueRowId] = {}; 
      Object.keys(v.hours_per_phase).forEach(phase => {
        vHours[uniqueRowId][phase] = String(v.hours_per_phase[phase] ?? '');
      });
    }
   // Restore ticketsLoads state using the uniqueRowId
    const draftTicketValue = v.tickets_loads?.[uniqueRowId] ?? v.tickets_loads;
    if (draftTicketValue != null) {
      setTicketsLoads(prev => ({
        ...prev,
        [uniqueRowId]: String(draftTicketValue),
      }));
    }

    vUnits[vendorId] = v.unit ?? null;

   rebuiltWorkPerformed.push({
      // ✅ Row ID and key must be the unique combination
      id: uniqueRowId, 
      __key: uniqueRowId, 
      vendor_id: vendorId,
      // ✅ Correct property names for display
      vendor_name: v.vendor_name ?? v.vendorname ?? '', 
      vendor_category: v.vendor_category ?? null,
      material_id: materialId,
      material_name: v.material_name ?? v.materialname ?? '', 
      unit: v.unit ?? null,
      detail: v.detail ?? '',
      hours_per_phase: v.hours_per_phase ?? {},
      tickets_loads: String(draftTicketValue ?? v.tickets_loads ?? '0') 
    });
  });

  // ✅ ORDER MATTERS: Set workPerformed FIRST
  setWorkPerformed(rebuiltWorkPerformed);
  // 💡 FIX 5: Set vendorHours keyed by uniqueRowId
  setVendorHours(vHours);
  // setTicketsLoads(vTickets);  // Now gets correct values from workPerformed
  setVendorUnits(vUnits);

  console.log('🎫 FINAL TICKETS:', vTickets);
}


 if (Array.isArray(d.dumping_sites)) {
  const dsHours: SimpleHourState = {};
  d.dumping_sites.forEach((s: any) => {
    dsHours[s.id] = {};
    Object.keys(s.hours_per_phase || {}).forEach(phase => {
      dsHours[s.id][phase] = String(s.hours_per_phase[phase] ?? '');
    });
    // Correct tickets loading
    if (s.tickets_loads && s.tickets_loads[s.id] !== undefined) {
      setTicketsLoads(prev => ({
        ...prev,
        [s.id]: String(s.tickets_loads[s.id])
      }));
    }
  });
  setDumpingSiteHours(dsHours);
  setDumpingSites(d.dumping_sites); // <--- VERY IMPORTANT
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
try {
const ticketsRes = await apiClient.get(`/api/tickets/${timesheetId}/scanned-tickets`);      console.log("Tickets received:", ticketsRes.data); // DEBUG: Check your console
      setAvailableScannedTickets(ticketsRes.data || []);
    } catch (e) { 
      console.warn("Failed to load scanned tickets", e); 
    }

    // 2. Restore links (using 'as any' to prevent the property error)
    const timesheetData = ts.data as any;
    if (timesheetData?.linked_tickets) {
      setSelectedTicketIds(timesheetData.linked_tickets);
    }

    setTimesheet(ts);
        setTimesheetDate(ts.date ? new Date(ts.date) : new Date());
        setNotes(ts.data?.notes || '');

       

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
const uniqueKey = `${vendorId}_${materialId}`;

      wp.push({
        id: uniqueKey, // ⬅️ VENDOR ID ONLY as requested
        __key: uniqueKey,        // ✅ NEW: Unique key for internal tracking/removal
        vendor_id: vendorId,
        vendor_name: vendorName,
        vendor_category: vendorCat,
        material_id: materialId,
        material_name: m.material ?? m.material_name ?? '',
        unit: m.unit ?? null,
        detail: m.detail ?? '',
        hours_per_phase: m.hours_per_phase ?? {},
        tickets_loads: m.tickets_loads ?? {},
      });
    });
  });
}

// 🔥 FIX: 'seen' MUST track the unique combination (vendor_id_material_id)
// This is critical to prevent mixing data and correctly updating existing materials.
const seen = new Set(wp.map(r => r.__key)); // ✅ FIX: Track by unique __key

// 2) MERGE ts.data.vendors into wp (CRITICAL for hours_per_phase)
if (Array.isArray(ts.data?.vendors)) {
  ts.data.vendors.forEach((r: any) => {
    const vendorIdNum = Number(r.vendor_id ?? r.vendorId ?? r.vendor?.id ?? r.id);
    const vendorId = vendorIdNum.toString();
    const materialId = Number(r.material_id ?? r.materialId ?? r.material?.id ?? r.id);
const uniqueKey = `${vendorIdNum}_${materialId}`;

    // If this specific vendor-material combination hasn't been added yet
    if (!seen.has(uniqueKey)) { // ✅ FIX: Check for unique __key
      wp.push({
        id: uniqueKey,        // ⬅️ VENDOR ID ONLY as requested
        __key: uniqueKey,    // ✅ NEW: Unique key for internal tracking/removal
        vendor_id: vendorIdNum,
        vendor_name: r.vendor_name ?? r.vendor?.name ?? '',
        vendor_category: r.vendor_category ?? r.vendor?.vendor_category ?? null,
        material_id: materialId,
        material_name: r.material_name ?? r.material ?? '',
        unit: r.unit ?? r.unit_name ?? null,
        detail: r.detail ?? '',
        hours_per_phase: r.hours_per_phase ?? {},
        tickets_loads: r.tickets_loads ?? {},
      });
      seen.add(uniqueKey);
    } else {
      // UPDATE existing entry (must find by the unique combination)
      const index = wp.findIndex(row => row.__key === uniqueKey); // ✅ FIX: Find by unique __key
      if (index !== -1) {
        wp[index] = {
          ...wp[index],
          hours_per_phase: {
            ...wp[index].hours_per_phase,
            ...r.hours_per_phase,
          },
          tickets_loads: r.tickets_loads ?? wp[index].tickets_loads,
          unit: r.unit ?? wp[index].unit,
          detail: r.detail ?? wp[index].detail,
        };
      }
    }
  });
}
// ... rest of fetchData

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
  Object.values(ts.data.selected_material_items).forEach(m => 
    mt.push({ id: m.id, name: m.name, materials: m.selectedMaterials })
  );
}
        const ds: any[] = [];
        if (ts.data?.selected_dumping_materials) {
          Object.values(ts.data.selected_dumping_materials).forEach((d: any) => ds.push({ id: d.id, name: d.name, materials: d.selectedMaterials || [] }));
        }
        

        // populate input states safely (existing helper logic ported)
        const populateSimple = (safeEntities : any[] = [], field: 'hours_per_phase' | 'tickets_per_phase') => {
          const state: SimpleHourState = {};
          safeEntities .forEach(e => {
            state[e.id] = {};
            if (e[field]) for (const phase in e[field]) state[e.id][phase] = String(e[field][phase] ?? '');
          });
          return state;
        };
console.log(ts.data?.vendors);

        const populateEmployees = (safeEntities : any[] = []) => {
          const s: EmployeeHourState = {};
          safeEntities .forEach(e => {
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

const populateEquipmentComplex = (safeEntities : any[] = []) => {
  
  
  const s: ComplexHourState = {};
  const start: { [id: string]: string } = {};
  const stop: { [id: string]: string } = {};

  safeEntities .forEach(e => {
    s[e.id] = {};

    // copy phase hours
    if (e.hours_per_phase) {
      for (const phase in e.hours_per_phase) {
        const v = e.hours_per_phase[phase];
        s[e.id][phase] = { REG: String(v.REG ?? 0), SB: String(v.SB ?? 0) };
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


        const populateUnits = (safeEntities : any[] = []) => {
          const s: { [k: string]: string | null } = {};
          safeEntities .forEach(e => { s[e.id] = e.unit ?? null; });
          return s;
        };
const key = `@autoSave_timesheet_${timesheetId}`;
console.log('[PHASE RESTORE] using key =', key);

const saved = await AsyncStorage.getItem(key);
console.log('[PHASE RESTORE] saved draftRaw =', saved);

if (saved) {
  const sObj = JSON.parse(saved);
  console.log('[PHASE RESTORE] parsed draft =', sObj);
if (sObj?.data?.selectedPhases) {
  const fromDraft = Array.isArray(sObj.data.selectedPhases)
    ? sObj.data.selectedPhases
    : String(sObj.data.selectedPhases).split(',');
  setSelectedPhases(fromDraft);
}
 else {
    console.log('[PHASE RESTORE] draft has NO selectedPhases; will fall back to server');
    setSelectedPhases(ts.data?.job?.phase_codes || []);
  }

  const draftSavedAt = sObj.savedAt || 0;
  const timestamp = ts?.updated_at ?? ts?.data?.updated_at;
  const serverUpdatedAt = timestamp ? new Date(timestamp).getTime() : 0;

  if (!isConnected || (draftSavedAt && draftSavedAt > (serverUpdatedAt || 0))) {
    console.log('[PHASE RESTORE] applying full restoreProcessedDraft');

    restoreProcessedDraft(sObj, ts);
    setRestoredFromDraft(true);
    console.log('[PHASE RESTORE] DRAFT RESTORED - EXITING EARLY TO PREVENT SERVER OVERWRITE');
  return; 
  } else {
    console.log('[PHASE RESTORE] server newer, skipping full draft restore');
  }
} else {
  const serverPhases = ts.data?.job?.phase_codes || [];
  console.log('[PHASE RESTORE] no draft, using server phases =', serverPhases);
  setSelectedPhases(serverPhases);
}



if (!restoredFromDraft) {
  // phases

  // employees / equipment
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

  // vendors (workPerformed)
  setWorkPerformed(wp);
  const vh: SimpleHourState = {};
  const tl: Record<string, string> = {};
  const vu: Record<string, string> = {};

  wp.forEach(row => {
    const key = row.id; // e.g. "2976_6"

    // Hours per phase
    vh[key] = {};
    Object.keys(row.hours_per_phase || {}).forEach(phase => {
      vh[key][phase] = String(row.hours_per_phase[phase] ?? '');
    });

    // Tickets
    const rawTickets = row.tickets_loads;
    let ticketValue = rawTickets;
    if (typeof rawTickets === 'object' && rawTickets !== null) {
      ticketValue = rawTickets[key];
    }
    tl[key] = String(ticketValue ?? '');

    // Units (vendor-level)
    vu[row.vendor_id] = row.unit ?? vu[row.vendor_id] ?? 'Hrs';
  });

  setVendorHours(vh);
  setTicketsLoads(tl);
  setVendorUnits(vu);

  // 🔵 TRUCKING: normalize ids to string and hydrate maps + list
  const truckingEntities = (ts.data?.materials_trucking || []).map((m: any) => ({
    ...m,
    id: String(m.id),
  }));

  setMaterialHours(populateSimple(truckingEntities, 'hours_per_phase'));
  setMaterialUnits(populateUnits(truckingEntities));

  if (Array.isArray(ts.data?.materials_trucking)) {
    ts.data.materials_trucking.forEach((m: any) => {
      const key = String(m.id);
      const value = m.tickets_loads?.[m.id];
      if (value != null) {
        setTicketsLoads(prev => ({
          ...prev,
          [key]: String(value),
        }));
      }
    });
  }

const selectedItemsArray = ts.data?.selected_material_items
  ? Object.values(ts.data.selected_material_items)
  : [];

setMaterialsTrucking(
  truckingEntities.length
    ? truckingEntities
    : selectedItemsArray
);


  // dumping sites
setDumpingSiteHours(
  populateSimple(ts.data?.dumping_sites || [], 'hours_per_phase'),
);

if (Array.isArray(ts.data?.dumping_sites)) {
  // 1) hydrate tickets
  ts.data.dumping_sites.forEach((d: any) => {
    const value = d.tickets_loads?.[d.id];
    if (value != null) {
      setTicketsLoads(prev => ({
        ...prev,
        [d.id]: String(value),
      }));
    }
  });

  // 2) IMPORTANT: use server dump sites as table rows
  setDumpingSites(ts.data.dumping_sites);
}


  // total quantities
  if (ts.data?.total_quantities) {
    const pq: { [k: string]: string } = {};
    for (const p in ts.data.total_quantities) {
      pq[p] = String(ts.data.total_quantities[p]);
    }
    setTotalQuantities(pq);
    setPhaseEntryQuantities(pq); // UI reads from here
  }
}
else {
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
      const jobRes = await apiClient.get(`/api/job-phases/${ts.data.job.job_code}`);
      // REMOVE: .map((p: any) => p.code)
      // KEEP the full object to access .description later
      const codes = jobRes.data?.phase_codes || [];
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
  useEffect(() => {
  console.log('🔁 ticketsLoads CHANGED', ticketsLoads);
}, [ticketsLoads]);

// ---------------- AUTO SAVE (debounced) ----------------
const autoSaveTimer = useRef<any>(null);

useEffect(() => {
  if (!timesheet || loading) return;

  if (autoSaveTimer.current) clearTimeout(autoSaveTimer.current);

  autoSaveTimer.current = setTimeout(async () => {
    try {
      const processedData = buildUpdatedData();

      // ✅ Merge selectedPhases into data so draft.data.selectedPhases exists
      const dataWithPhases = {
        ...processedData,
        selectedPhases: selectedPhases,
          ticketsLoads, // 🔥 REQUIRED
linked_tickets: selectedTicketIds,
      };

      const draft = {
        timesheetId,
        data: dataWithPhases,   // use dataWithPhases instead of processedData
        status: 'Pending',
        savedAt: Date.now(),
      };

      // 🔍 DEBUG: see exactly what is being stored
      console.log('[DEBUG DRAFT WRITE]', JSON.stringify(draft, null, 2));

      await AsyncStorage.setItem(
        `@autoSave_timesheet_${timesheetId}`,
        JSON.stringify(draft),
      );
const verifyDraft = await AsyncStorage.getItem(`@autoSave_timesheet_${timesheetId}`);
console.log('🎫 DRAFT CONTENTS:', JSON.parse(verifyDraft!).data.ticketsLoads);
      console.log('🚀 AUTOSAVE vendorHours:', vendorHours);
      console.log('🚀 AUTOSAVE ticketsLoads:', ticketsLoads);
      console.log('🚀 AUTOSAVE dataWithPhases.selectedPhases:', dataWithPhases.selectedPhases);
      console.log('Auto-saved PROCESSED data');
    } catch (e) {
      console.warn('Auto-save fail', e);
    }
  }, 1500);

  return () => {
    if (autoSaveTimer.current) clearTimeout(autoSaveTimer.current);
  };
}, [
  employeeHours,
  equipmentHours,
  materialHours,
  vendorHours,
  dumpingSiteHours,
  ticketsLoads,
  notes,
  materialUnits,
  vendorUnits,
  timesheetDate,
  selectedPhases,
  employeeReasons,
  phaseEntryQuantities,
  workPerformed,
  dumpingSites,
  selectedTicketIds, // ✅ ADD THIS HERE
]);
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
weather: weatherData,          
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

 // Inside buildUpdatedData...
employees: timesheet.data.employees.map((emp) => {
  // Get all class codes for this employee from our local state
  const hoursForThisEmp = employeeHours[emp.id] || {};
  
  return {
    ...emp,
    hours_per_phase: processEmployees(hoursForThisEmp),
    reason: employeeReasons[emp.id] || null,
  };
}),

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
linked_tickets: selectedTicketIds,
vendors: (workPerformed || []).map((r) => ({
    // ✅ FIX: Use r.id, which correctly holds the unique key (vendor_id_material_id)
    id: r.id, 
    vendor_id: r.vendor_id,
    material_id: r.material_id,
    vendor_name: r.vendor_name,
    material_name: r.material_name,
    unit: r.unit,
    detail: r.detail,
    hours_per_phase: toNumbersSimple(vendorHours?.[r.id] || r.hours_per_phase || {}),
    tickets_loads: { [r.id]: Number(ticketsLoads[r.id] || 0) },
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
const autoSaveDraft = useCallback(async () => {
  console.log('🚀 AUTOSAVE TRIGGERED - timesheetId:', timesheetId, 'loading:', loading);
  
  if (!timesheetId || loading || isSubmitting) {
    console.log('❌ AUTOSAVE SKIPPED - missing timesheetId/loading/submitting');
    return;
  }
  
  try {
    const processedData = buildUpdatedData();
    console.log('📦 buildUpdatedData result:', processedData ? 'SUCCESS' : 'NULL/FAILED');
    
    if (!processedData) {
      console.log('❌ AUTOSAVE SKIPPED - buildUpdatedData returned null');
      return;
    }
    
    const dataWithPhases = { ...processedData, selectedPhases: selectedPhases || [] };
    console.log('📋 SAVING PHASES:', dataWithPhases.selectedPhases);
    console.log('📋 SAVING EMPLOYEE HOURS:', JSON.stringify(employeeHours, null, 2).slice(0, 500) + '...');
    
    const draft = { timesheetId, data: dataWithPhases, status: 'Pending', savedAt: Date.now() };
    const key = `autoSave-timesheet-${timesheetId}`;
    
    await AsyncStorage.setItem(key, JSON.stringify(draft));
    console.log('✅ AUTOSAVE SUCCESS - key:', key);
  } catch (e) {
    console.error('💥 AUTOSAVE ERROR:', e);
  }
}, [timesheetId, loading, isSubmitting, selectedPhases, buildUpdatedData]);
useFocusEffect(
  useCallback(() => {
    let isActive = true;
    return () => {
      if (isActive && timesheetId && !loading && !isSubmitting) {
        console.log('NAVIGATION BLUR: Triggering autosave');
        autoSaveDraft();
      }
      isActive = false;
    };
  }, [timesheetId, loading, isSubmitting, autoSaveDraft])
);

// Proposed Minor Change (Remove setTimeout)
useFocusEffect(
    useCallback(() => {
        const refetchPhaseCodes = async () => {
            const currentJobCode = timesheet?.data?.job?.job_code;
            if (!currentJobCode) {
                return; 
            }
            
            console.log('Refetching phase codes on focus...');
            try {
            const jobRes = await apiClient.get(`/api/job-phases/${currentJobCode}`);
// Change this line to store the full array of objects
const phases = jobRes.data?.phase_codes || [];
setJobPhaseCodes(phases);
            } catch (e) {
                console.warn("Failed to load job phase codes on focus", e);
            }
        };

        
        refetchPhaseCodes(); 
        
        return () => {
        };
    }, [timesheet]) // Dependency on 'timesheet' is key
);


  // ---------------- HANDLERS ----------------
const handleEmployeeHourChange = useCallback((
  employeeId: string, 
  phaseCode: string, 
  classCode: string, 
  value: string
) => {
  if (value.trim() === '') value = '0';
  const sanitized = value.replace(/[^0-9.]/g, '');
  
  setEmployeeHours(prev => {
    const updated = {
      ...prev,
      [employeeId]: {
        ...prev[employeeId],
        [phaseCode]: {
          ...prev[employeeId]?.[phaseCode],
          [classCode]: sanitized,
        },
      },
    };

    // Validate total hours <= 24
    let total = 0;
    selectedPhases.forEach(phase => {
      const classes = updated[employeeId]?.[phase];
      if (classes && typeof classes === 'object') {
        Object.values(classes).forEach(val => {
          const num = parseFloat(val as string) || 0;
          if (!isNaN(num)) total += num;
        });
      }
    });

    if (total > 24) {
      Alert.alert('Total hours for employee cannot exceed 24 hours');
      return prev; // Revert change
    }
  console.log('✏️ HOUR CHANGE - calling autosave');
    // IMMEDIATE AUTOSAVE
    autoSaveDraft();
    return updated;
  });
}, [selectedPhases, autoSaveDraft]);

  const handleComplexHourChange = (setter: React.Dispatch<any>, entityId: string, phaseCode: string, hourType: 'REG' | 'SB', value: string) => {
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
const handleRemoveDumpingSite = (id: string) => {
  Alert.alert(
    'Remove Dump Site',
    'Are you sure?',
    [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Remove',
        style: 'destructive',
        onPress: () => {
          // Remove from UI
          setDumpingSites(prev => prev?.filter((d: any) => d.id !== id) ?? []);
          
          // Update timesheet.data for save - FIXED: use dumping_sites
          setTimesheet(prev => {
            if (!prev?.data?.dumping_sites) return prev;
            return {
              ...prev,
              data: {
                ...prev.data,
                dumping_sites: prev.data.dumping_sites.filter((d: any) => d.id !== id)
              }
            };
          });
          
          // Clean up state
          setDumpingSiteHours(prev => {
            const copy = { ...prev };
            delete copy[id];
            return copy;
          });
          
          setTicketsLoads(prev => {
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

const processEmployees = (
  phaseHours: Record<string, Record<string, string>> = {}
): Record<string, Record<string, number>> => {
  const out: Record<string, Record<string, number>> = {};

  Object.keys(phaseHours).forEach((phase) => {
    out[phase] = {};
    Object.keys(phaseHours[phase]).forEach((cls) => {
      // Filter out our UI placeholder and empty values
      if (cls !== "ADD_NEW_CLASS") {
        const value = Number(phaseHours[phase][cls] || 0);
        if (value > 0) out[phase][cls] = value;
      }
    });
  });

  return out;
};

// convert equipment REG / SB hours
const processEquipment = (
  m: Record<string, { REG?: string; SB?: string }> = {}
): Record<string, { REG: number; SB: number }> => {
  const out: Record<string, { REG: number; SB: number }> = {};

  Object.keys(m).forEach((phase) => {
    out[phase] = {
      REG: Number(m[phase]?.REG || 0),
      SB: Number(m[phase]?.SB || 0),
    };
  });

  return out;
};

// ---------------- BUILD FINAL PAYLOAD ----------------

// const autoSaveDraft = useCallback(async () => {
//   if (!timesheetId || loading) return;
//   try {
//     const processedData = buildUpdatedData();  // ✅ Now declared above
//     const dataWithPhases = { ...processedData, selectedPhases };
//     const draft = {
//       timesheetId,
//       data: dataWithPhases,
//       status: 'Pending',
//       savedAt: Date.now(),
//     };
//     await AsyncStorage.setItem(`autoSave-timesheet-${timesheetId}`, JSON.stringify(draft));
//   } catch (e) {
//     console.warn('Immediate autosave failed', e);
//   }
// }, [timesheetId, loading, buildUpdatedData, selectedPhases]); 

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
const newRows: any[] = materials.map((m: any) => {
 const materialId = m.id;
 const uniqueId = `${vendor.id}_${materialId}`;   // unique row key
  return {
id: uniqueId,
    vendor_id: vendor.id,
    vendor_name: vendor.name,

    material_id: materialId,
    material_name: m.material,
    unit: m.unit,
    detail: m.detail,
    hours_per_phase: {},
    tickets_loads: {}
  };
});


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


const handleAddTrucking = () => {
  loadAvailableTrucking()
  setShowTruckingPicker(true)
}
const handleAddDumpingSite = () => {
  console.log("Add Dump Site clicked");
  console.log("Current dumpingSites", dumpingSites);
  loadAvailableDumpingSites();
  setShowDumpingPicker(true);
};

const handleSelectDumpingSite = (site: any) => {
  if (!timesheet) return;

  const alreadyExists = dumpingSites?.some((d: any) => d.id === site.id);
  if (alreadyExists) {
    Alert.alert("Dump Site Already Added");
    return;
  }

  // 1. Update dumpingSites for UI
  setDumpingSites(prev => [...(prev ?? []), site]);

  // 2. Also update timesheet.data.dumping_sites for save
  setTimesheet(prev => {
    if (!prev) return prev;
    return {
      ...prev,
      data: {
        ...prev.data,
        dumping_sites: [...(prev.data?.dumping_sites ?? []), site],
      },
    };
  });

  const siteId = String(site.id);

  // 3. Initialize hours state for this dumping site for selected phases
  const phaseHours: Record<string, string> = {};
  selectedPhases.forEach(phase => {
    phaseHours[phase] = "";
  });
  setDumpingSiteHours(prev => ({
    ...prev,
    [siteId]: phaseHours,
  }));

  // 4. Initialize ticketsLoads for this dumping site (optional)
  setTicketsLoads(prev => ({
    ...prev,
    [siteId]: "",
  }));

  // Remove from picker list and close
  setDumpingList(prev => prev.filter((d: any) => d.id !== site.id));
  setShowDumpingPicker(false);
};

const handleSelectTrucking = (trucking: any) => {
  console.log('SELECT TRUCKING CLICKED', trucking.id, trucking.name);
  if (!timesheet) return;

  // Treat IDs as strings for a strict, consistent duplicate check
  const newId = String(trucking.id);

  const alreadyExists =
    (materialsTrucking ?? []).some((t: any) => String(t.id) === newId);

  if (alreadyExists) {
    Alert.alert('Trucking Already Added', 'This trucking is already in the table.');
    return;
  }

  // 1. Update materialsTrucking (UI)
  setMaterialsTrucking((prev: any[] = []) => [...prev, trucking]);

  // 2. Initialize per‑truck maps only once
  const phaseHours: Record<string, string> = {};
  selectedPhases.forEach((phase: string) => {
    phaseHours[phase] = '';
  });

  setMaterialHours((prev: any) => ({
    ...prev,
    [newId]: phaseHours,
  }));

  setMaterialUnits((prev: any) => ({
    ...prev,
    [newId]: trucking.unit ?? 'Hrs',
  }));

  setTicketsLoads((prev: any) => ({
    ...prev,
    [newId]: '',
  }));

  // 3. Remove from picker and close
  setTruckingList((prev: any[] = []) =>
    prev.filter((t: any) => String(t.id) !== newId),
  );
  setShowTruckingPicker(false);
};




const handleRemoveTrucking = (id: string) => {
  Alert.alert('Remove Trucking', 'Are you sure?', [
    { text: 'Cancel', style: 'cancel' },
    { 
      text: 'Remove', 
      style: 'destructive', 
      onPress: () => {
        setMaterialsTrucking(prev => prev?.filter((t: any) => t.id !== id) || []);
        // Remove from UI
        setTimesheet(prev => {
          if (!prev?.data?.materials_trucking) return prev
          return {
            ...prev,
            data: {
              ...prev.data,
              materials_trucking: prev.data.materials_trucking.filter((t: any) => t.id !== id)
            }
          }
        })
        // Clean up state
        setMaterialHours(prev => {
          const copy = { ...prev }
          delete copy[id]
          return copy
        })
        setMaterialUnits(prev => {
          const copy = { ...prev }
          delete copy[id]
          return copy
        })
        setTicketsLoads(prev => {
          const copy = { ...prev }
          delete copy[id]
          return copy
        })
      }
    }
  ])
}


const handleRemoveVendor = (rowId: string) => {
  Alert.alert("Remove Vendor Material", "Are you sure you want to remove this material?", [
    { text: "Cancel", style: "cancel" },
    {
      text: "Remove",
      style: "destructive",
      onPress: () => {
        // Remove the single material row
        setWorkPerformed(prev => prev.filter(row => row.id !== rowId));

        // Remove associated hours
        setVendorHours(prev => {
          const copy = { ...prev };
          delete copy[rowId];
          return copy;
        });

        // Remove associated unit
        setVendorUnits(prev => {
          const copy = { ...prev };
          delete copy[rowId];
          return copy;
        });

        // Remove tickets/loads only for this row
        setTicketsLoads(prev => {
          const copy = { ...prev };
          delete copy[rowId];
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
const loadAvailableTrucking = async () => {
  console.log('loadAvailableTrucking called');
  try {
    const res = await apiClient.get('/api/materials-trucking');
    const rawList: any[] = Array.isArray(res?.data)
      ? res.data.map((t: any) => ({
          id: t.id,
          name: t.name,
          unit: t.unit ?? null,
          detail: t.materialcategory,
          materialname: t.materials?.[0]?.name,
        }))
      : [];

    // Collect all IDs already present in the UI table
    const assignedIds = (materialsTrucking ?? []).map((t: any) =>
      String(t.id),
    );

    const filtered = rawList.filter(
      (t: any) => !assignedIds.includes(String(t.id)),
    );

    setTruckingList(filtered);
  } catch (err) {
    console.log('ERROR in loadAvailableTrucking', err);
  }
};



const loadAvailableDumpingSites = async () => {
  console.log("loadAvailableDumpingSites called");
  try {
    const res = await apiClient.get("/api/dumping_sites"); // ensure this path is correct
    console.log("API dumping-sites response", res?.data);
    // Normalize to array
    const allSites: any[] = Array.isArray(res?.data) ? res.data : [];
    // Already assigned in this timesheet
    const assignedIds = (dumpingSites ?? []).map((d: any) => d.id);
    const filtered = allSites.filter((s: any) => {
      if (!s) return false;
      const status = (s.status ?? "").toUpperCase();
      const isActive = status === "ACTIVE"; // your table shows ACTIVE rows only
      const notAssigned = !assignedIds.includes(s.id);
      return isActive && notAssigned;
    });
console.log("API dumping-sites RAW", JSON.stringify(res.data, null, 2));
    console.log("Filtered available dumping sites", filtered);
    setDumpingList(filtered);
  } catch (err) {
    console.log("ERROR in loadAvailableDumpingSites", err);
    setDumpingList([]); // avoid undefined
  }
};

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


// Group rows by vendor_id so we know which is the first row per vendor
const indexOfVendorRow = (vendorId: number) => {
  return workPerformed.findIndex(r => r.vendor_id === vendorId);
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

const getEmployeeClasses = (emp: any) => {
  const hoursForEmp = employeeHours[emp.id] || {};
  
  // 1. Get unique class codes that currently have hours assigned in any phase
  const activeClasses = new Set<string>();
  Object.values(hoursForEmp).forEach(phaseObj => {
    Object.keys(phaseObj).forEach(cls => activeClasses.add(cls));
  });

  // 2. Ensure "113" is always first, then add other active ones
  const finalClasses = Array.from(new Set(['113', ...Array.from(activeClasses)]));
  
  // 3. Limit to 4 and append "ADD_NEW_CLASS" placeholder if there's room
  const result = finalClasses.slice(0, 4);
  if (result.length < 4) {
    result.push("ADD_NEW_CLASS");
  }
  
  return result;
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
const allClasses = getEmployeeClasses(emp); // Use the new helper logic here
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
        
      >
       <Ionicons name="trash-outline" size={16} color="#dc1414ff" />
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


<View style={[tableStyles.cellFixed, { width: 140, justifyContent: "center" }]}>
                {classCode === "ADD_NEW_CLASS" ? (
                  <TouchableOpacity 
                    style={tableStyles.addClassBtn}
                    onPress={() => setClassPickerVisible({ empId: emp.id })}
                  >
                    <Text style={tableStyles.addClassText}>+ Add Class</Text>
                  </TouchableOpacity>
                ) : (
                  <Text style={tableStyles.cellText}>{classCode}</Text>
                )}
              </View>
    </View>
  
{/* Phase columns (scrollable) */}
<ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ alignItems: "center" }}>
  <View style={tableStyles.phaseRow}>
    {selectedPhases.map((p: string) => {
      const hourValue = employeeHours[emp.id]?.[p]?.[classCode] ?? "";
      const reasonSelected = !!employeeReasons[emp.id];

      return (
        <View
          key={`${emp.id}-${classCode}-${p}`}
          style={[tableStyles.cell, { width: 96, opacity: reasonSelected ? 0.6 : 1 }]}
          pointerEvents={reasonSelected ? "none" : "auto"}
        >
          {/* FIX: Only show the input if it is a real class code, not the Add Button row */}
          {classCode !== "ADD_NEW_CLASS" ? (
            <InlineEditableNumber
              value={hourValue}
              onChange={(v) => handleEmployeeHourChange(emp.id, p, classCode, v)}
              validateHours={true}
            />
          ) : (
            // Render an empty space for the placeholder row
            <View style={{ height: 30 }} /> 
          )}
        </View>
      );
    })}
  </View>
</ScrollView>


{/* Right total fixed column */}
<View style={[tableStyles.cellFixed, { width: 88 }]}>
  {rowIsLastForEmp && classCode !== "ADD_NEW_CLASS" ? (
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

{/* Phase header row */}
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
const handleEquipmentHourChange = (
  entityId: string,
  phaseCode: string,
  hourType: 'REG' | 'SB',  // ✅ Fixed: 'SB' not 'SB'
  value: string
) => {
  // If empty, treat as 0
  if (value.trim() === "") value = "0";
  
  // 1️⃣ Sanitize input (keep numbers + dot)
  const sanitized = value.replace(/[^0-9.]/g, '');
  
  setEquipmentHours(prev => {
    // 2️⃣ Build updated object
    const updated = {
      ...prev,
      [entityId]: {
        ...(prev[entityId] || {}),
        [phaseCode]: {
          ...(prev[entityId]?.[phaseCode] || {}),
          [hourType]: sanitized,
        },
      },
    };

    // 3️⃣ Optional: Validate total equipment hours per phase don't exceed employee hours
    // (You can add this if needed, similar to employee 24hr limit)
    const totalEqHours = calculateTotalComplexHours(updated, entityId);
    if (totalEqHours > 24) {  // Or your business rule
      Alert.alert("Total equipment hours cannot exceed 24 hours");
      return prev;  // Reject change
    }

    // 👇 IMMEDIATE AUTOSAVE — ONLY for VALID changes 👇
    autoSaveDraft();

    // 4️⃣ Accept change
    return updated;
  });
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
const handleMaterialHourChange = (entityId: string, phaseCode: string, value: string) => {
  const sanitized = value.replace(/[^0-9.]/g, '');
  setMaterialHours(prev => ({
    ...prev,
    [entityId]: {
      ...prev[entityId],
      [phaseCode]: sanitized
    }
  }));

};
const handleDumpingSiteHourChange = (entityId: string, phaseCode: string, value: string) => {
  const sanitized = value.replace(/[^0-9.]/g, ''); // Sanitize input
  setDumpingSiteHours(prev => ({
    ...prev,
    [entityId]: {
      ...prev[entityId],
      [phaseCode]: sanitized
    }
  }));
};

// SIMPLY THIS:
const handleVendorTicketsChange = useCallback((rowId: string, value: string) => {
  if (value.trim() === '' || value === '0') return;
  const sanitized = value.replace(/[^0-9.]/g, '');
  
  setTicketsLoads(prev => ({ ...prev, [rowId]: sanitized }));
  setWorkPerformed(prev => prev.map(row => 
    row.id === rowId ? { ...row, ticketsloads: sanitized } : row
  ));
  
  // ✅ NOTHING ELSE - debounced useEffect handles it (1.5s)
  console.log('🎫 TICKETS UPDATED - autosave in 1.5s');
}, []);



const renderEntityTable = (
  title: string,
  entities: any[],
  type: 'equipment' | 'material' | 'vendor' | 'dumping_site'
) => {
  const safeEntities = Array.isArray(entities) ? entities : [];

  console.log('🏗️ TABLE DEBUG:', {
    type,
    entitiesLength: safeEntities?.length || 0,
    entitiesSample: safeEntities?.slice(0, 2),
    materialsTruckingLength: materialsTrucking?.length || 0,
    materialHoursKeys: Object.keys(materialHours),
    selectedPhasesLength: selectedPhases?.length || 0,
  });

  // ✅ USE SELECTED PHASES HERE
  const phaseCodes = selectedPhases;

  const isEquipment = type === 'equipment';

  const hoursState: any =
    isEquipment
      ? equipmentHours
      : type === 'material'
      ? materialHours
      : type === 'vendor'
      ? vendorHours
      : dumpingSiteHours;

  const phaseTotals = isEquipment
    ? calculateComplexPhaseTotals(equipmentHours, phaseCodes)
    : calculateSimplePhaseTotalsByEntities(hoursState, safeEntities, phaseCodes);

  return (
    // ... rest of renderEntityTable stays exactly as in your file

    
     
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
{type === 'material' && (
  <TouchableOpacity onPress={handleAddTrucking}>
    <Text style={styles.addButton}>+ Add Trucking</Text>
  </TouchableOpacity>
)}
{type === 'dumping_site' && (
  <TouchableOpacity onPress={handleAddDumpingSite}>
    <Text style={styles.addButton}>+ Add Dump Site</Text>
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
    <View style={[tableStyles.headerCellFixed, { width: 100 }]}>
      <Text style={tableStyles.headerText}>LINK TICKETS</Text>
    </View>
  </>
) : (
  <>
    {/* Original header for other tables */}
    <View style={[tableStyles.headerCellFixed, { width: 200 }]}>
      <Text style={tableStyles.headerText}>{isEquipment ? 'EQUIPMENT NAME' : title.toUpperCase()}</Text>
    </View>
 
    {!isEquipment && (
      <View style={[tableStyles.headerCellFixed, { width: 100 }]}>
        <Text style={tableStyles.headerText}>UNIT</Text>
      </View>
      
      
    )}
{type !== 'equipment' && (
  <>
    <View style={[tableStyles.headerCellFixed, { width: 140 }]}>
      <Text style={tableStyles.headerText}># TICKETS</Text>
    </View>
    {/* NEW HEADER FOR TRUCKING & DUMPING */}
    <View style={[tableStyles.headerCellFixed, { width: 100 }]}>
      <Text style={tableStyles.headerText}>LINK TICKETS</Text>
    </View>
  </>
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
                      <Text style={tableStyles.headerSubText}>{isEquipment ? 'REG | S.B' : 'Qty'}</Text>
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
            {safeEntities .map((ent: any, entIndex: number) => {
              const name = ent.name || `${ent.id}`;
              const total = isEquipment
                ? calculateTotalComplexHours(equipmentHours, ent.id)
                : calculateTotalSimple(hoursState, ent.id);

              const rowBg = entIndex % 2 === 0 ? tableStyles.row : tableStyles.rowAlt;

              return (
                <View key={ent.id} style={[rowBg]}>
                  {/* Left fixed area */}
                  <View style={tableStyles.leftRow}>
                  <View style={tableStyles.leftRow}>
  <View
    style={[
      tableStyles.cellFixed,
      { width: 72, flexDirection: "row", alignItems: "center", gap: 8 },
    ]}
  >
    {/* Show IDs depending on type */}
    <Text style={tableStyles.cellTextBold}>
      {type === "vendor"
        ? ent.vendor_id
        : type === "equipment"
        ? ent.id
        : type === "material"
        ? ent.id
        : type === "dumping_site"
        ? ent.id
        : ""}
    </Text>

{/* Trash button for all rows */}
    <TouchableOpacity
      onPress={() => {
        if (type === "vendor") handleRemoveVendor(ent.id);
        else if (type === "equipment") handleRemoveEquipment(ent.id);
        else if (type === "material") handleRemoveTrucking(ent.id);
        else if (type === "dumping_site") handleRemoveDumpingSite(ent.id); // ADD THIS LINE

      }}
      
    >
      <Ionicons name="trash-outline" size={16} color="#dc1414ff" />
    </TouchableOpacity>
  </View>
</View>

{type === "vendor" ? (
  <>
 <View style={[tableStyles.cellFixed, { width: 180 }]}>
  <Text style={tableStyles.cellText}>
    {entIndex === 0 ||
    safeEntities [entIndex - 1]?.vendor_id !== ent.vendor_id
      ? ent.vendor_name
      : ""}
  </Text>
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
    <View style={[tableStyles.cellFixed, { width: 100 }]}>
      <TouchableOpacity 
        onPress={() => {
          setLinkingRowId(ent.id);
          setTicketModalVisible(true);
        }}
        style={{ flexDirection: 'row', alignItems: 'center', backgroundColor: '#f0f7ff', padding: 4, borderRadius: 4 }}
      >
        <Feather name="paperclip" size={14} color="#137fec" />
        <Text style={{ fontSize: 12, color: "#137fec", marginLeft: 4 }}>
          {selectedTicketIds[ent.id]?.length || 0} Linked
        </Text>
      </TouchableOpacity>
    </View>
    
  </>
  
) : (
  <>
   <View style={[tableStyles.cellFixed, { width: 200 }]}>
      <Text style={tableStyles.cellText}>{name}</Text>
    </View>
{/* ADDED UNIT COLUMN CELL HERE */}
    {!isEquipment && (
      <View style={[tableStyles.cellFixed, { width: 100 }]}>
        <Text style={tableStyles.cellText}>
          {type === 'material' ? (materialUnits[ent.id] || ent.unit || 'Hrs') : (ent.unit || 'Loads')}
        </Text>
      </View>
    )}

{type !== "equipment" && (
  <>
    <View style={[tableStyles.cellFixed, { width: 140 }]}>
      <InlineEditableNumber 
        value={ticketsLoads[String(ent.id)] ?? ""} 
        onChange={(v) => {
          const clean = v.replace(/[^0-9]/g, "");
          const rowId = String(ent.id);
          setTicketsLoads(prev => ({ ...prev, [rowId]: clean }));
          autoSaveDraft(); 
        }}
        placeholder="0"
      />
    </View>
    {/* NEW LINK BUTTON FOR TRUCKING & DUMPING */}
    <View style={[tableStyles.cellFixed, { width: 100 }]}>
      <TouchableOpacity 
        onPress={() => {
          setLinkingRowId(String(ent.id));
          setTicketModalVisible(true);
        }}
        style={{ 
          flexDirection: 'row', 
          alignItems: 'center', 
          backgroundColor: '#f0f7ff', 
          padding: 4, 
          borderRadius: 4 
        }}
      >
        <Feather name="paperclip" size={14} color="#137fec" />
        <Text style={{ fontSize: 12, color: "#137fec", marginLeft: 4 }}>
          {selectedTicketIds[String(ent.id)]?.length || 0} Linked
        </Text>
      </TouchableOpacity>
    </View>
  </>
)}

  </>
)}

                  </View>

                  {/* Phase columns */}
                  <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ alignItems: 'center' }}>
                    <View style={tableStyles.phaseRow}>
                      {selectedPhases.map((p: string) => {
                        // Equipment: two fields per phase (REG, SB)
                        if (isEquipment) {
                          const regVal = equipmentHours[ent.id]?.[p]?.REG ?? '';
                          const sbVal = equipmentHours[ent.id]?.[p]?.SB ?? '';

                          return (
                            <View key={`${ent.id}-${p}`} style={[tableStyles.cell, { width: 100 }]}>
                              <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'center' }}>
                                <InlineEditableNumber
                                  value={regVal}
                                  onChange={(v) => handleEquipmentHourChange(ent.id, p, 'REG', v)}
                                   validateHours={true} 
                                  placeholder="0.0"
                                  style={tableStyles.hourInput}
                                />
                                <View 
          style={{ 
            width: 1, 
            height: '100%', 
            backgroundColor: '#E5E7EB', // Matches THEME.border
            marginHorizontal: -2
          }} 
        />
                                <InlineEditableNumber
                                  value={sbVal}
                                  onChange={(v) => handleEquipmentHourChange(ent.id, p, 'SB', v)} 
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
// ✅ FIXED - Type-specific state and handlers
const getHourValue = () => {
  if (type === 'vendor') return vendorHours[ent.id]?.[p] ?? '';
  if (type === 'material') return materialHours[ent.id]?.[p] ?? '';
  if (type === 'dumping_site') return dumpingSiteHours[ent.id]?.[p] ?? '';
  return hoursState[ent.id]?.[p] ?? '';
};

const getHourChangeHandler = () => {
  if (type === 'vendor') return (v: string) => handleVendorHourChange(ent.id, p, v);
  if (type === 'material') return (v: string) => handleMaterialHourChange(ent.id, p, v);
  if (type === 'dumping_site') return (v: string) => handleDumpingSiteHourChange(ent.id, p, v);
  return (v: string) => {}; // fallback
};
                        return (
                          
                          <View key={`${ent.id}-${p}`} style={[tableStyles.cell, { width: 96 }]}>
                            <InlineEditableNumber
       value={getHourValue()}  
        onChange={getHourChangeHandler()}
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
  {jobPhaseCodes.length === 0 ? (
    <Text style={{ textAlign: 'center', color: '#999', marginTop: 20 }}>
      No phase codes available
    </Text>
  ) : (
    jobPhaseCodes.map((phaseItem) => {
      // Safely determine the code and description
      // If phaseItem is an object, use its properties; if it's a string, fall back
      const code = typeof phaseItem === 'object' ? phaseItem.code : phaseItem;
      const description = typeof phaseItem === 'object' ? phaseItem.description : '';
      const isSelected = selectedPhases.includes(code);

      return (
        <View key={code} style={styles.phaseItem}>
          <View style={{ flex: 1, paddingRight: 10 }}>
            {/* Phase Code Header */}
            <Text style={styles.phaseText}>{code}</Text>
            
            {/* Phase Description Sub-text */}
            {description ? (
              <Text style={{ fontSize: 12, color: '#666', marginTop: 2 }}>
                {description}
              </Text>
            ) : null}
          </View>

          <TouchableOpacity
            onPress={() => {
              setSelectedPhases((prev) => {
                const already = prev.includes(code);
                const newPhases = already
                  ? prev.filter((x) => x !== code)
                  : [...prev, code];
                savePhasesImmediately(newPhases);
                return newPhases;
              });
            }}
          >
            <View style={styles.checkbox}>
              {isSelected && <Text style={styles.tick}>✓</Text>}
            </View>
          </TouchableOpacity>
        </View>
      );
    })
  )}
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
        {renderEntityTable('Materials', workPerformed ?? [], 'vendor')}
        {renderEntityTable('Trucking', materialsTrucking ?? [], 'material')}
        {renderEntityTable('Dumping Site', dumpingSites ?? [], 'dumping_site')}
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

{showDumpingPicker && (
  <View style={styles.bottomSheetOverlay}>
    <Pressable style={{ flex: 1 }} onPress={() => setShowDumpingPicker(false)} />
     <View style={[styles.bottomSheetSmall, { flexGrow: 0.5 }]}>
      <View style={styles.dragHandle} />
      <View style={{ paddingHorizontal: 16 }}>
        <TextInput
          placeholder="Search dump site by name or ID..."
          value={dumpingSearch}
          onChangeText={setDumpingSearch}
          style={styles.searchBox}
          placeholderTextColor="#999"
        />
      </View>
      <ScrollView style={{ maxHeight: 300 }} nestedScrollEnabled showsVerticalScrollIndicator>
        {dumpingList
          .filter((s: any) => {
            const name = (s.name ?? "").toLowerCase();
            const id = String(s.id ?? "").toLowerCase();
            const q = dumpingSearch.toLowerCase();
            return name.includes(q) || id.includes(q);
          })
          .map((s: any) => (
            <Pressable
              key={s.id}
              style={styles.employeeRowSmall}
              onPress={() => handleSelectDumpingSite(s)}
            >
              <View>
                <Text style={styles.empNameSmall}>{s.name}</Text>
                <Text style={styles.empIdSmall}>ID {s.id}</Text>
              </View>
            </Pressable>
          ))}
      </ScrollView>
      <Pressable style={styles.closeButton} onPress={() => setShowDumpingPicker(false)}>
        <Text style={styles.closeButtonText}>Cancel</Text>
      </Pressable>
    </View>
  </View>
)}

      {showTruckingPicker && (
  <View style={styles.bottomSheetOverlay}>
    {(() => {
      console.log("🟡 MODAL RENDERED");
      console.log("🟡 showTruckingPicker:", showTruckingPicker);
      console.log("🟡 truckingList.length:", truckingList?.length);
      console.log("🟡 truckingSearch text:", truckingSearch);
      return null;
    })()}
    <Pressable style={{ flex: 1 }} onPress={() => setShowTruckingPicker(false)} />
    <View style={[styles.bottomSheetSmall, { flexGrow: 0.5 }]}>
      <View style={styles.dragHandle} />
      
      <TextInput 
        placeholder="Search trucking company..."
        value={truckingSearch}
        onChangeText={setTruckingSearch}
        style={styles.searchBox}
        placeholderTextColor="#999"
      />
      
    <ScrollView 
  style={{ flex: 1, maxHeight: 400 }} 
  nestedScrollEnabled={true} 
  showsVerticalScrollIndicator={true}
>
{(() => {
          console.log("🔵 ScrollView is rendered");
          console.log("🔵 truckingList inside ScrollView:", truckingList);
          return null;
        })()}
{truckingList
  .filter(t => 
    t.name.toLowerCase().includes(truckingSearch.toLowerCase()) ||
    t.id.toString().includes(truckingSearch)
  )
  .map((trucking: any) => {
    console.log("🟢 Rendering trucking item:", trucking);

    return (
      <Pressable 
        key={trucking.id} 
        style={styles.employeeRowSmall} 
        onPress={() => handleSelectTrucking(trucking)}
      >
        <View>
          <Text style={styles.empNameSmall}>{trucking.name}</Text>
          <Text style={styles.empIdSmall}>ID: {trucking.id}</Text>

          {trucking.detail && (
            <Text style={{ fontSize: 12, color: "#666", marginTop: 2 }}>
              {trucking.detail}
            </Text>
          )}
        </View>
      </Pressable>
    );
  })
}

</ScrollView>


      <Pressable style={styles.closeButton} onPress={() => setShowTruckingPicker(false)}>
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
    

   {/* ===================== TICKET LIST MODAL ===================== */}
<Modal visible={ticketModalVisible} transparent animationType="fade">
  <View style={styles.modalBackdrop}>
    <View style={[styles.modalContainer, { height: '70%' }]}>
      <Text style={styles.modalTitle}>
        Link {activeCategory} Tickets
      </Text>

      <View style={{ marginBottom: 10 }}>
        <Text style={{ fontSize: 13, color: '#666' }}>
          Showing all available tickets for the{' '}
          <Text style={{ fontWeight: 'bold' }}>{activeCategory}</Text> category.
        </Text>
      </View>

      <ScrollView>
        {filteredTickets.length === 0 ? (
          <View style={{ padding: 40, alignItems: 'center' }}>
            <Feather name="search" size={32} color="#ccc" />
            <Text style={{ textAlign: 'center', marginTop: 10, color: '#999' }}>
              No tickets found for category: {activeCategory}
            </Text>
          </View>
        ) : (
          filteredTickets.map(ticket => {
            const tId = Number(ticket.id || ticket.ID);
            const isSelected =
              linkingRowId &&
              selectedTicketIds[linkingRowId]?.includes(tId);

            return (
              <View
                key={tId}
                style={[
                  styles.phaseItem,
                  isSelected && {
                    backgroundColor: '#eff6ff',
                    borderColor: '#3b82f6',
                  },
                  { flexDirection: 'row', alignItems: 'center' },
                ]}
              >
                {/* SELECT TICKET */}
                <TouchableOpacity
                  style={{ flex: 1 }}
                  onPress={() => {
                    if (!linkingRowId) return;
                    setSelectedTicketIds(prev => {
                      const current = prev[linkingRowId] || [];
                      const next = current.includes(tId)
                        ? current.filter(id => id !== tId)
                        : [...current, tId];
                      return { ...prev, [linkingRowId]: next };
                    });
                  }}
                >
                  <Text style={styles.phaseText}>
                    Ticket #{ticket.ticket_number || tId}
                  </Text>
                  <Text style={tableStyles.smallText}>
                    {ticket.date} | {ticket.vendor_name}
                  </Text>
                </TouchableOpacity>

                {/* VIEW PDF BUTTON */}
                <TouchableOpacity
                  onPress={() => {
                    setSelectedTicket(ticket);
                    setIsPdfFullScreen(true);
                  }}
                  style={{ padding: 10 }}
                >
                  <Feather name="eye" size={20} color="#3b82f6" />
                </TouchableOpacity>
              </View>
            );
          })
        )}
      </ScrollView>

      <TouchableOpacity
        style={styles.doneBtn}
        onPress={() => setTicketModalVisible(false)}
      >
        <Text style={styles.doneBtnText}>Close</Text>
      </TouchableOpacity>
    </View>
  </View>
</Modal>

{/* ===================== FULLSCREEN PDF MODAL ===================== */}
<Modal visible={isPdfFullScreen} transparent={false} animationType="slide">
  <SafeAreaView style={styles.fullScreenPdfContainer}>
    <View style={styles.fullScreenHeader}>
      <Text style={styles.fullScreenTitle}>Ticket PDF</Text>
      <TouchableOpacity onPress={() => setIsPdfFullScreen(false)}>
        <Text style={styles.fullScreenDoneButtonText}>Done</Text>
      </TouchableOpacity>
    </View>

    {selectedTicket && (() => {
      // ✅ THIS IS THE KEY FIX — pass the whole ticket object
      const fullUrl = getImageUri(selectedTicket);

      console.log("🛠️ FINAL URL ATTEMPT:", fullUrl);

      if (!fullUrl) {
        return (
          <Text style={{ color: 'white', textAlign: 'center' }}>
            Path Missing
          </Text>
        );
      }

      const isImage = /\.(jpg|jpeg|png|gif)$/i.test(fullUrl);

      if (isImage) {
        return (
          <View style={{ flex: 1, backgroundColor: '#000' }}>
            <Image
              source={{ uri: fullUrl }}
              style={{ flex: 1, resizeMode: 'contain' }}
            />
          </View>
        );
      }

      return (
        <Pdf
          source={{ uri: fullUrl, cache: true }}
          style={styles.fullScreenPdf}
          trustAllCerts={true}
          onLoadComplete={(num) =>
            console.log(`PDF Loaded: ${num} pages`)
          }
          onError={(err) =>
            console.error("PDF Load Error:", err)
          }
        />
      );
    })()}
  </SafeAreaView>
</Modal>
<Modal visible={!!classPickerVisible} transparent animationType="slide">
  <View style={styles.modalBackdrop}>
    <View style={styles.modalContainer}>
      <Text style={styles.modalTitle}>Select Class Code</Text>
      <ScrollView style={{ maxHeight: 300 }}>
        {availableClassCodes.map((item) => (
          <TouchableOpacity
            key={item.code}
            style={styles.phaseItem}
onPress={() => {
  if (classPickerVisible) {
    const newClassCode = item.code;
    const empId = classPickerVisible.empId;

    setEmployeeHours(prev => ({
      ...prev,
      [empId]: {
        ...prev[empId],
        [selectedPhases[0]]: {
          ...prev[empId]?.[selectedPhases[0]],
          [newClassCode]: "0" // Initialize with 0 to register the class
        }
      }
    }));

    setClassPickerVisible(null);
    
    // Explicitly trigger auto-save so the new class structure is stored
    setTimeout(() => autoSaveDraft(), 500); 
  }
}}
          >
            <View>
              <Text style={styles.phaseText}>{item.code}</Text>
              <Text style={{ fontSize: 12, color: '#666' }}>{item.description}</Text>
            </View>
          </TouchableOpacity>
        ))}
      </ScrollView>
      <TouchableOpacity style={styles.doneBtn} onPress={() => setClassPickerVisible(null)}>
        <Text style={styles.doneBtnText}>Cancel</Text>
      </TouchableOpacity>
    </View>
  </View>
</Modal>

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
fullScreenPdfContainer: { flex: 1, backgroundColor: "#1C1C1E" },
fullScreenPdf: { flex: 1, width: "100%" },
fullScreenHeader: {
  flexDirection: "row",
  justifyContent: "space-between",
  alignItems: "center",
  paddingHorizontal: 16,
  paddingVertical: 12,
  borderBottomWidth: 1,
  borderBottomColor: "#333",
},
fullScreenTitle: { fontSize: 18, fontWeight: "600", color: "#fff" },
fullScreenDoneButtonText: { fontSize: 16, fontWeight: "600", color: "#fff" },
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
// Inside styles = StyleSheet.create({ ... })
fullScreenPdfContainer: { 
  flex: 1, 
  backgroundColor: "#1C1C1E" 
},
fullScreenPdf: { 
  flex: 1, 
  width: "100%" 
},
fullScreenHeader: {
  flexDirection: "row",
  justifyContent: "space-between",
  alignItems: "center",
  paddingHorizontal: 16,
  paddingVertical: 12,
  borderBottomWidth: 1,
  borderBottomColor: "#333",
},

fullScreenTitle: { 
  fontSize: 18, 
  fontWeight: "600", 
  color: "#fff" 
},
fullScreenDoneButtonText: { 
  fontSize: 16, 
  fontWeight: "600", 
  color: "#fff" 
},
fullScreenHeaderButton: { // This fixed the ts(2551) error
    padding: 8,
    minWidth: 60,
    alignItems: "center",
  },

smallText: { fontSize: 12, color: THEME.textSecondary },


});

export default TimesheetEditScreen;
