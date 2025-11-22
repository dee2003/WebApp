import React, { useState, useEffect,useRef  } from 'react';
import { View, Text, StyleSheet, ScrollView, TextInput, TouchableOpacity, ActivityIndicator, SafeAreaView, Alert } from 'react-native';
import { RouteProp } from '@react-navigation/native';
import { StackNavigationProp } from '@react-navigation/stack';
import DatePicker from 'react-native-date-picker';
import apiClient from '../../api/apiClient';
import { Timesheet } from '../../types';
import { ForemanStackParamList } from '../../navigation/AppNavigator';
import { Dropdown } from 'react-native-element-dropdown';
import AsyncStorage from '@react-native-async-storage/async-storage'; 

// --- Theme Constants ---
const THEME = {
  primary: '#007AFF',
  success: '#34C759',
  danger: '#FF3B30',
  background: '#F0F0F7',
  card: '#FFFFFF',
  text: '#1C1C1E',
  textSecondary: '#6A6A6A',
  border: '#E0E0E5',
  lightGray: '#F8F8F8',
  SPACING: 16,
};

// --- Type Definitions ---
type ComplexHourState = { [key: string]: { [key: string]: { REG?: string; S_B?: string } } };
type EmployeeHourState = { [key: string]: { [key: string]: { [classCode: string]: string } } };
type SimpleHourState = { [key: string]: { [key: string]: string } };
type QuantityState = { [key: string]: string };
type PhaseTotalState = { [key: string]: number };
type UnitState = { [key: string]: string | null };
type EditScreenRouteProp = RouteProp<ForemanStackParamList, 'TimesheetEdit'>;
type EditScreenNavigationProp = StackNavigationProp<ForemanStackParamList, 'TimesheetEdit'>;
type Props = { route: EditScreenRouteProp; navigation: EditScreenNavigationProp; };
type EntityType = 'material' | 'vendor' | 'equipment' | 'dumping_site';

// --- Unit Constants ---
const MATERIAL_UNITS = [
  { label: 'Hrs', value: 'Hrs' },
  { label: 'CY', value: 'CY' },
  { label: 'TON', value: 'TON' },
  { label: 'SF', value: 'SF' },
  { label: 'SY', value: 'SY' },
  { label: 'LF', value: 'LF' },
  { label: 'EA', value: 'EA' },
  { label: 'Cube', value: 'cube' },
  { label: 'Yard', value: 'yar' },
];

const WORK_PERFORMED_UNITS = [
  { label: 'CY', value: 'CY' },
  { label: 'TON', value: 'TON' },
  { label: 'SF', value: 'SF' },
  { label: 'SY', value: 'SY' },
  { label: 'LF', value: 'LF' },
  { label: 'EA', value: 'EA' },
];

const TimesheetEditScreen = ({ route, navigation }: Props) => {
  const { timesheetId } = route.params;
const autoSaveTimer = useRef<NodeJS.Timeout | null>(null);

  const [timesheet, setTimesheet] = useState<Timesheet | null>(null);
  const [foremanName, setForemanName] = useState('');
  const [selectedPhase, setSelectedPhase] = useState<string | null>(null);
  const [timesheetDate, setTimesheetDate] = useState(new Date());
  const [isDatePickerVisible, setDatePickerVisible] = useState(false);
  const [notes, setNotes] = useState('');
  const [jobTitle, setJobTitle] = useState('Timesheet');
  const [isAutoSaving, setIsAutoSaving] = useState(false); // Optional: for UI feedback

  const [employeeHours, setEmployeeHours] = useState<EmployeeHourState>({});
  const [equipmentHours, setEquipmentHours] = useState<ComplexHourState>({});
  const [materialHours, setMaterialHours] = useState<SimpleHourState>({});
  const [vendorHours, setVendorHours] = useState<SimpleHourState>({});
  const [materialTickets, setMaterialTickets] = useState<SimpleHourState>({});
  const [vendorTickets, setVendorTickets] = useState<SimpleHourState>({});
  const [totalQuantities, setTotalQuantities] = useState<QuantityState>({});
  const [materialUnits, setMaterialUnits] = useState<UnitState>({});
  const [vendorUnits, setVendorUnits] = useState<UnitState>({});
  const [availableEquipment, setAvailableEquipment] = useState<any[]>([]);

  const [loading, setLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Dumping Site State
  const [dumpingSiteHours, setDumpingSiteHours] = useState<SimpleHourState>({});
  const [dumpingSiteTickets, setDumpingSiteTickets] = useState<SimpleHourState>({});
// Inside your TimesheetEditScreen component, after all the useState hooks:
const [workPerformed, setWorkPerformed] = useState<any[]>([]);
const [materialsTrucking, setMaterialsTrucking] = useState<any[]>([]);
const [dumpingSites, setDumpingSites] = useState<any[]>([]);

const stripTotals = (obj: any) => {
  const result: any = {};
  Object.keys(obj || {}).forEach((key) => {
    if (key !== 'total') {
      result[key] = obj[key];
    }
  });
  return result;
};

  useEffect(() => {
    // Don't run the effect if the initial data is still loading
    if (loading) return;

    // Clear any existing timer to reset the debounce period
    if (autoSaveTimer.current) {
      clearTimeout(autoSaveTimer.current);
    }
    
    // Set a new timer
    autoSaveTimer.current = setTimeout(async () => {
      if (!timesheet) return; // Ensure timesheet data is available

      setIsAutoSaving(true); // Optional: indicate saving has started
      console.log('Auto-saving draft...');

      // const draftData = {
      //   employeeHours,
      //   equipmentHours,
      //   materialHours,
      //   vendorHours,
      //   dumpingSiteHours,
      //   materialTickets,
      //   vendorTickets,
      //   dumpingSiteTickets,
      //   notes,
      //   materialUnits,
      //   vendorUnits,
      //   timesheetDate: timesheetDate.toISOString(),
      // };
const draftData = {
  employeeHours: stripTotals(employeeHours),
  equipmentHours: stripTotals(equipmentHours),
  materialHours: stripTotals(materialHours),
  vendorHours: stripTotals(vendorHours),
  dumpingSiteHours: stripTotals(dumpingSiteHours),

  materialTickets: stripTotals(materialTickets),
  vendorTickets: stripTotals(vendorTickets),
  dumpingSiteTickets: stripTotals(dumpingSiteTickets),

  notes,
  materialUnits,
  vendorUnits,
  timesheetDate: timesheetDate.toISOString(),
};

      try {
        // Save the entire draft state to AsyncStorage
        await AsyncStorage.setItem(`@autoSave_timesheet_${timesheetId}`, JSON.stringify(draftData));
        console.log('Draft auto-saved successfully.');
      } catch (e) {
        console.error('Failed to auto-save data.', e);
      } finally {
        setIsAutoSaving(false); // Optional: indicate saving has finished
      }
    }, 1500); // 1.5-second delay

    // Cleanup function to clear the timer if the component unmounts
    return () => {
      if (autoSaveTimer.current) {
        clearTimeout(autoSaveTimer.current);
      }
    };
  }, [
    // This effect runs whenever any of these data points change
    employeeHours, equipmentHours, materialHours, vendorHours, dumpingSiteHours, 
    materialTickets, vendorTickets, dumpingSiteTickets, notes,  
    materialUnits, vendorUnits, timesheetDate, loading, timesheetId
  ]);

// paste.txt

useEffect(() => {
  const fetchData = async () => {
    try {
      const response = await apiClient.get(`/api/timesheets/${timesheetId}`);
      const tsData: Timesheet = response.data;
      console.log('Fetched timesheet data:', JSON.stringify(tsData, null, 2));
      setTimesheet(tsData);
       const workPerformedData: any[] = [];
    if (tsData?.data?.selected_vendor_materials) {
      Object.values(tsData.data.selected_vendor_materials).forEach((vendor: any) => {
        workPerformedData.push({
          name: vendor.name,
          materials: vendor.selectedMaterials || [],
        });
      });
    }

    // 🌟 Extract Materials & Trucking
    const materialTruckingData: any[] = [];
    if (tsData?.data?.selected_material_items) {
      Object.values(tsData.data.selected_material_items).forEach((item: any) => {
        materialTruckingData.push({
          name: item.name,
          materials: item.selectedMaterials || [],
        });
      });
    }

    // 🌟 Extract Dumping Sites
    const dumpingSiteData: any[] = [];
    if (tsData?.data?.selected_dumping_materials) {
      Object.values(tsData.data.selected_dumping_materials).forEach((dump: any) => {
        dumpingSiteData.push({
          name: dump.name,
          materials: dump.selectedMaterials || [],
        });
      });
    }

    // ✅ Set to state
    setWorkPerformed(workPerformedData);
    setMaterialsTrucking(materialTruckingData);
    setDumpingSites(dumpingSiteData);
      if (tsData.date) setTimesheetDate(new Date(tsData.date));
      setNotes(tsData.data?.notes || '');
      const jobName = tsData.data?.job?.job_description || tsData.data?.job_name || 'Timesheet';
      setJobTitle(jobName);
      navigation.setOptions({ title: `${jobName} - Edit` });

      // --- FIX: Set the first phase as selected by default ---
      const phaseCodes = tsData.data?.job?.phase_codes || [];
      if (phaseCodes.length > 0 && !selectedPhase) {
        setSelectedPhase(phaseCodes[0]);
      }
      // --- End of fix ---

      const populateSimple = (entities: any[] = [], field: 'hours_per_phase' | 'tickets_per_phase'): SimpleHourState => {
        const state: SimpleHourState = {};
        entities.forEach(e => {
          state[e.id] = {};
          if (e[field]) {
            for (const phase in e[field]) {
              state[e.id][phase] = e[field][phase]?.toString() || '';
            }
          }
        });
        return state;
      };

      const populateEmployees = (entities: any[] = []): EmployeeHourState => {
        const state: EmployeeHourState = {};
        entities.forEach(e => {
          state[e.id] = {};
          if (e.hours_per_phase) {
            for (const phase in e.hours_per_phase) {
              state[e.id][phase] = {};
              const v = e.hours_per_phase[phase];
              if (v && typeof v === 'object') {
                for (const classCode in v) {
                  state[e.id][phase][classCode] = (v[classCode] ?? '').toString();
                }
              }
            }
          }
        });
        return state;
      };

      const populateEquipmentComplex = (entities: any[] = []): ComplexHourState => {
        const state: ComplexHourState = {};
        entities.forEach(e => {
          state[e.id] = {};
          if (e.hours_per_phase) {
            for (const phase in e.hours_per_phase) {
              const v = e.hours_per_phase[phase];
              if (v && typeof v === 'object') {
                state[e.id][phase] = { REG: (v.REG ?? '').toString(), S_B: (v.S_B ?? '').toString() };
              } else {
                const num = parseFloat(v ?? 0);
                state[e.id][phase] = { REG: !isNaN(num) ? num.toString() : '', S_B: '' };
              }
            }
          }
        });
        return state;
      };

      const populateUnits = (entities: any[] = []): UnitState => {
        const state: UnitState = {};
        entities.forEach(e => {
          state[e.id] = e.unit || null;
        });
        return state;
      };

      setEmployeeHours(populateEmployees(tsData.data?.employees || []));
      setEquipmentHours(populateEquipmentComplex(tsData.data?.equipment || []));
      setMaterialHours(populateSimple(tsData.data?.materials_trucking || [], 'hours_per_phase'));
      setVendorHours(populateSimple(tsData.data?.vendors || [], 'hours_per_phase'));
      setDumpingSiteHours(populateSimple(tsData.data?.dumping_sites || [], 'hours_per_phase'));
      setMaterialTickets(populateSimple(tsData.data?.materials_trucking || [], 'tickets_per_phase'));
      setVendorTickets(populateSimple(tsData.data?.vendors || [], 'tickets_per_phase'));
      setDumpingSiteTickets(populateSimple(tsData.data?.dumping_sites || [], 'tickets_per_phase'));
      setMaterialUnits(populateUnits(tsData.data?.materials_trucking || []));
      setVendorUnits(populateUnits(tsData.data?.vendors || []));

      if (tsData.data?.total_quantities_per_phase) {
        const q: QuantityState = {};
        for (const phase in tsData.data.total_quantities_per_phase) {
          q[phase] = String(tsData.data.total_quantities_per_phase[phase]);
        }
        setTotalQuantities(q);
      }
      
      const eqRes = await apiClient.get('/api/equipment');
      setAvailableEquipment(eqRes.data || []);
      
      const res = await apiClient.get(`/api/users/${tsData.foreman_id}`);
      const fn = `${res.data?.first_name || ''} ${res.data?.middle_name || ''} ${res.data?.last_name || ''}`.replace(/\\s+/g, ' ').trim();
      setForemanName(fn);
      
      const savedDataJSON = await AsyncStorage.getItem(`@autoSave_timesheet_${timesheetId}`);
      if (savedDataJSON !== null) {
          console.log('Found auto-saved data. Loading...');
          const savedData = JSON.parse(savedDataJSON);
          setEmployeeHours(savedData.employeeHours || {});
          setEquipmentHours(savedData.equipmentHours || {});
          setMaterialHours(savedData.materialHours || {});
          setVendorHours(savedData.vendorHours || {});
          setDumpingSiteHours(savedData.dumpingSiteHours || {});
          setMaterialTickets(savedData.materialTickets || {});
          setVendorTickets(savedData.vendorTickets || {});
          setDumpingSiteTickets(savedData.dumpingSiteTickets || {});
          setNotes(savedData.notes || '');
          setMaterialUnits(savedData.materialUnits || {});
          setVendorUnits(savedData.vendorUnits || {});
          if (savedData.timesheetDate) {
            setTimesheetDate(new Date(savedData.timesheetDate));
          }
      }
    } catch (err) {
      console.error(err);
      Alert.alert('Error', 'Failed to load timesheet data.');
    } finally {
      setLoading(false);
    }
  };
  fetchData();
}, [timesheetId, navigation]);


  const handleEmployeeHourChange = (employeeId: string, phaseCode: string, classCode: string, value: string) => {
    const sanitized = value.replace(/[^0-9.]/g, '');
    setEmployeeHours(prev => ({
      ...prev,
      [employeeId]: {
        ...prev[employeeId],
        [phaseCode]: {
          ...prev[employeeId]?.[phaseCode],
          [classCode]: sanitized,
        },
      },
    }));
  };

  const handleComplexHourChange = (
    setter: React.Dispatch<React.SetStateAction<ComplexHourState>>,
    entityId: string,
    phaseCode: string,
    hourType: 'REG' | 'S_B',
    value: string
  ) => {
    const sanitized = value.replace(/[^0-9.]/g, '');
    setter(prev => ({
      ...prev,
      [entityId]: {
        ...prev[entityId],
        [phaseCode]: { ...prev[entityId]?.[phaseCode], [hourType]: sanitized },
      },
    }));
  };

  const handleSimpleValueChange = (
    entityType: 'material' | 'vendor' | 'dumping_site',
    field: 'hours' | 'tickets',
    entityId: string,
    phaseCode: string,
    value: string
  ) => {
    const sanitized = value.replace(/[^0-9.]/g, '');
    console.log(`Changing ${entityType} ${field} for entity ${entityId} phase ${phaseCode} to ${sanitized}`);
    const phaseCodes = timesheet?.data.job.phase_codes || [];

    const setters: any = {
      material: { hours: setMaterialHours, tickets: setMaterialTickets },
      vendor: { hours: setVendorHours, tickets: setVendorTickets },
      dumping_site: { hours: setDumpingSiteHours, tickets: setDumpingSiteTickets },
    };
  
    const setter = setters[entityType][field];
    
    const isSyncedField = 
        (entityType === 'material' && field === 'tickets') || 
        (entityType === 'vendor' && field === 'tickets') ||
        (entityType === 'dumping_site' && field === 'hours');

    if (isSyncedField) {
      setter((prev: SimpleHourState) => {
        const newEntityState = { ...(prev[entityId] || {}) };
        phaseCodes.forEach(pc => {
          newEntityState[pc] = sanitized;
        });
        return { ...prev, [entityId]: newEntityState };
      });
    } else {
      setter((prev: SimpleHourState) => ({
        ...prev,
        [entityId]: { ...(prev[entityId] || {}), [phaseCode]: sanitized },
      }));
    }
  };


  
  const handleUnitChange = (
    type: 'material' | 'vendor',
    entityId: string,
    unit: string
  ) => {
    const setter = type === 'material' ? setMaterialUnits : setVendorUnits;
    setter(prev => ({ ...prev, [entityId]: unit }));
  };

  const handleTotalQuantityChange = (phaseCode: string, value: string) => {
    const sanitized = value.replace(/[^0-9.]/g, '');
    setTotalQuantities(prev => ({ ...prev, [phaseCode]: sanitized }));
  };

  const handleRemoveEquipment = (id: string) => {
    setTimesheet(ts => {
      if (!ts) return ts;
      return { ...ts, data: { ...ts.data, equipment: (ts.data.equipment || []).filter(eq => eq.id !== id) } };
    });
    setEquipmentHours(prev => {
      const copy = { ...prev };
      delete copy[id];
      return copy;
    });
  };

  const handleAddEquipment = (item: any) => {
    if (!item || !item.value || !timesheet) return;
    const equipmentToAdd = availableEquipment.find(eq => eq.id === item.value);
    if (!equipmentToAdd) return;
    if ((timesheet.data.equipment || []).some((e: any) => e.id === equipmentToAdd.id)) {
      Alert.alert('Duplicate', 'This equipment has already been added.');
      return;
    }
    setTimesheet(ts => {
      if (!ts) return ts;
      return { ...ts, data: { ...ts.data, equipment: [...(ts.data.equipment || []), equipmentToAdd] } };
    });
    setEquipmentHours(prev => ({ ...prev, [equipmentToAdd.id]: {} }));
  };

  const handleSave = async () => {
    if (!timesheet) return;
    setIsSubmitting(true);

    try {
      const toNumbersSimple = (m: Record<string, string>): Record<string, number> => {
        const out: Record<string, number> = {};
        Object.keys(m || {}).forEach(phase => {
          const num = parseFloat(m[phase] || '0');
          out[phase] = !isNaN(num) ? num : 0;
        });
        return out;
      };

      const processEmployees = (
        phaseHours: { [phase: string]: { [classCode: string]: string } }
      ): Record<string, Record<string, number>> => {
        const out: Record<string, Record<string, number>> = {};
        Object.keys(phaseHours || {}).forEach(phase => {
          out[phase] = {};
          const classEntries = phaseHours[phase];
          Object.keys(classEntries || {}).forEach(classCode => {
            const num = parseFloat(classEntries[classCode] || '0');
            if (!isNaN(num) && num > 0) {
              out[phase][classCode] = num;
            }
          });
        });
        return out;
      };

      const processEquipment = (
        m: { [key: string]: { REG?: string; S_B?: string } }
      ): Record<string, { REG: number; S_B: number }> => {
        const out: Record<string, { REG: number; S_B: number }> = {};
        Object.keys(m || {}).forEach(phase => {
          const reg = parseFloat(m[phase]?.REG || '0');
          const sb = parseFloat(m[phase]?.S_B || '0');
          out[phase] = {
            REG: isNaN(reg) ? 0 : reg,
            S_B: isNaN(sb) ? 0 : sb,
          };
        });
        return out;
      };

      const updatedData = {
        ...timesheet.data,
        notes,
        total_quantities_per_phase: toNumbersSimple(totalQuantities),
        employees: timesheet.data.employees?.map(emp => ({
          ...emp,
          hours_per_phase: processEmployees(employeeHours[emp.id]),
        })),
        equipment: timesheet.data.equipment?.map(eq => ({
          ...eq,
          hours_per_phase: processEquipment(equipmentHours[eq.id]),
        })),
  //       materials_trucking: formattedMaterials?.map(mat => ({
  //   id: mat.id,
  //   name: mat.name,
  //   unit: materialUnits[mat.id],
  //   hours_per_phase: toNumbersSimple(materialHours[mat.id] || {}),
  //   tickets_per_phase: toNumbersSimple(materialTickets[mat.id] || {}),
  // })),
  materials_trucking: formattedMaterials.map(mat => ({
  id: mat.id,
  name: mat.name,
  unit: materialUnits[mat.id],
  hours_per_phase: toNumbersSimple(materialHours[mat.id] || {}),
  tickets_per_phase: toNumbersSimple(materialTickets[mat.id] || {}),
})),
//         vendors: formattedVendors?.map(ven => ({
//   id: ven.id,
//   name: ven.name,
//   unit: vendorUnits[ven.id],
//   hours_per_phase: toNumbersSimple(vendorHours[ven.id] || {}),
//   tickets_per_phase: toNumbersSimple(vendorTickets[ven.id] || {}),
// })),

// dumping_sites: formattedDumpingSites?.map(site => ({
//   id: site.id,
//   name: site.name,
//   hours_per_phase: toNumbersSimple(dumpingSiteHours[site.id] || {}),
//   tickets_per_phase: toNumbersSimple(dumpingSiteTickets[site.id] || {}),
// })),
vendors: formattedVendors.map(ven => ({
  id: ven.id,
  name: ven.name,
  unit: vendorUnits[ven.id],
  hours_per_phase: toNumbersSimple(vendorHours[ven.id] || {}),
  tickets_per_phase: toNumbersSimple(vendorTickets[ven.id] || {}),
})),
dumping_sites: formattedDumpingSites.map(site => ({
  id: site.id,
  name: site.name,
  hours_per_phase: toNumbersSimple(dumpingSiteHours[site.id] || {}),
  tickets_per_phase: toNumbersSimple(dumpingSiteTickets[site.id] || {}),
})),

      };

      const payload = { data: updatedData, status: 'Pending' };

      console.log('Saving payload:', JSON.stringify(payload, null, 2));

      await apiClient.put(`/api/timesheets/${timesheet.id}`, payload);
      Alert.alert('Success', 'Timesheet draft saved successfully!');
      navigation.goBack();

    } catch (e) {
      if (e instanceof Error) console.error('Save failed:', e.message);
      else if ((e as any)?.response?.data) console.error('Save failed:', (e as any).response.data);
      else console.error('Save failed:', e);
      Alert.alert('Error', 'Failed to save timesheet. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const calculateTotalEmployeeHours = (state: EmployeeHourState, entityId: string): number => {
    const entityPhases = state[entityId];
    if (!entityPhases) return 0;
    return Object.values(entityPhases).reduce((phaseTotal, classHours) => {
      const totalForPhase = Object.values(classHours).reduce((classTotal, hours) => {
        const val = parseFloat(hours || '0');
        return classTotal + (isNaN(val) ? 0 : val);
      }, 0);
      return phaseTotal + totalForPhase;
    }, 0);
  };

  const calculateEmployeePhaseTotals = (state: EmployeeHourState, phaseCodes: string[] = []): PhaseTotalState => {
    const totals: PhaseTotalState = {};
    phaseCodes.forEach(p => { totals[p] = 0; });
    Object.values(state).forEach(perEntity => {
      phaseCodes.forEach(p => {
        if (perEntity[p]) {
          Object.values(perEntity[p]).forEach(hoursStr => {
            const val = parseFloat(hoursStr || '0');
            if (!isNaN(val)) totals[p] += val;
          });
        }
      });
    });
    return totals;
  };

  const calculateTotalComplexHours = (hoursState: ComplexHourState, entityId: string): number => {
    const m = hoursState[entityId];
    if (!m) return 0;
    return Object.values(m).reduce((t, v) => {
      const reg = parseFloat(v?.REG || '0');
      const sb = parseFloat(v?.S_B || '0');
      return t + (isNaN(reg) ? 0 : reg) + (isNaN(sb) ? 0 : sb);
    }, 0);
  };

  const calculateComplexPhaseTotals = (hoursState: ComplexHourState, phaseCodes: string[] = []): PhaseTotalState => {
    const totals: PhaseTotalState = {};
    phaseCodes.forEach(p => { totals[p] = 0; });
    Object.values(hoursState).forEach(perEntity => {
      phaseCodes.forEach(p => {
        const reg = parseFloat(perEntity[p]?.REG || '0');
        const sb = parseFloat(perEntity[p]?.S_B || '0');
        if (!isNaN(reg)) totals[p] += reg;
        if (!isNaN(sb)) totals[p] += sb;
      });
    });
    return totals;
  };

  const calculateTotalSimple = (state: SimpleHourState, entityId: string): number => {
    const m = state[entityId];
    if (!m) return 0;
    return Object.values(m).reduce((t, v) => t + parseFloat(v || '0'), 0);
  };

  const calculateSimplePhaseTotals = (state: SimpleHourState, phaseCodes: string[] = []): PhaseTotalState => {
    const totals: PhaseTotalState = {};
    phaseCodes.forEach(p => { totals[p] = 0; });
    Object.values(state).forEach(perEntity => {
      phaseCodes.forEach(p => {
        const val = parseFloat(perEntity[p] || '0');
        if (!isNaN(val)) totals[p] += val;
      });
    });
    return totals;
  };
  const renderEmployeeInputs = () => {
    const employees = timesheet?.data?.employees || [];
    const phaseCodes = timesheet?.data?.job?.phase_codes || [];
    const phaseTotals = calculateEmployeePhaseTotals(employeeHours, phaseCodes);
  
    return (
      <View style={styles.card}>
        <Text style={styles.cardTitle}>Employees</Text>
        {employees.map((entity, index) => {
          const total = calculateTotalEmployeeHours(employeeHours, entity.id);
          const name = `${entity.first_name || ''} ${entity.middle_name || ''} ${entity.last_name || ''}`.replace(/\s+/g, ' ').trim();
          const classCodes = [entity.class_1, entity.class_2].filter(Boolean);
          const classCodeString = classCodes.join(' / ');
  
          return (
            <View key={entity.id} style={[styles.entityContainer, index === employees.length - 1 && styles.lastEntityContainer]}>
              <View style={styles.entityHeader}>
                <Text style={styles.employeeName}>{name}</Text>
                <Text style={styles.employeeId}>EMP ID: {entity.id}</Text>
              </View>
              <View style={styles.controlsRow}>
                <View style={styles.hoursContainer}>
                  <View style={styles.inputWithLabel}>
                    <Text style={styles.inputHeader}>Class Codes</Text>
                    <Text style={styles.classCodeSummary}>{classCodeString}</Text>
                  </View>
                  {/* THIS IS THE RESTORED PART */}
                  {classCodes.map((cc) => (
                    <View style={styles.inputWithLabel} key={cc as string}>
                      <Text style={styles.inputHeader}>Hours</Text>
                      <TextInput
                        style={styles.input}
                        keyboardType="numeric"
                        placeholder="0"
                        value={employeeHours[entity.id]?.[selectedPhase ?? '']?.[cc as string] ?? ''}
                        onChangeText={text => selectedPhase && handleEmployeeHourChange(entity.id, selectedPhase, cc as string, text)}
                      />
                      <Text style={styles.employeeClassCodeFooter}>{cc as string}</Text>
                    </View>
                  ))}
                </View>
                <View style={styles.inputWithLabel}>
                  <Text style={styles.inputHeader}>Total</Text>
                  <View style={styles.totalBox}>
                    <Text style={styles.totalText}>{total.toFixed(1)}</Text>
                  </View>
                </View>
              </View>
            </View>
          );
        })}
        <View style={styles.totalsRow}>
          <Text style={styles.totalsLabel}>Total Hours</Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.totalsContainer}>
            {phaseCodes.map((phase: string) => (
              <View key={phase} style={styles.totalPhaseItem}>
                <Text style={styles.totalPhaseHeader}>{phase}</Text>
                <View style={styles.totalBox}>
                  <Text style={styles.totalText}>{phaseTotals[phase]?.toFixed(1) ?? '0.0'}</Text>
                </View>
              </View>
            ))}
          </ScrollView>
        </View>
      </View>
    );
  };

  
  const renderEntityInputs = (
    title: string,
    entities: any[] = [],
    type: EntityType
  ) => {
    if (entities.length === 0 && type !== 'equipment') return null;
  
    const isEquipment = type === 'equipment';
    const isMaterial = type === 'material';
    const isVendor = type === 'vendor';
    const isDumpingSite = type === 'dumping_site';
    const phaseCodes = timesheet?.data.job.phase_codes || [];
    const firstPhase = phaseCodes[0];
  
    const hoursState = isEquipment ? equipmentHours :
                       isMaterial ? materialHours :
                       isDumpingSite ? dumpingSiteHours : vendorHours;
  
    const ticketsState = isMaterial ? materialTickets :
                         isDumpingSite ? dumpingSiteTickets : vendorTickets;
  
    const phaseHourTotals = isDumpingSite 
        ? calculateSimplePhaseTotals(ticketsState as SimpleHourState, phaseCodes) 
        : isEquipment 
            ? calculateComplexPhaseTotals(hoursState as ComplexHourState, phaseCodes) 
            : calculateSimplePhaseTotals(hoursState as SimpleHourState, phaseCodes);
  
    const getHeader = (fieldType: 'hours' | 'tickets') => {
      if (isMaterial) return fieldType === 'hours' ? 'Hrs / Qty' : '# of Tickets';
      if (isVendor) return fieldType === 'hours' ? 'Qty' : '# of Tickets';
      if (isDumpingSite) return fieldType === 'hours' ? '# of Loads' : 'Qty';
      return 'Hours';
    };

    return (
      <View style={styles.card}>
        <Text style={styles.cardTitle}>{title}</Text>
        {entities.map((entity, index) => {
          
      // Inside the entities.map(...)
let totalValue;
if (isDumpingSite) {
  totalValue = calculateTotalSimple(dumpingSiteTickets, entity.id); // This was incorrect in previous versions
} else if (isEquipment) {

            totalValue = calculateTotalComplexHours(equipmentHours, entity.id);
          } else {
            totalValue = calculateTotalSimple(hoursState as SimpleHourState, entity.id);
          }

          const name = isEquipment ? `${entity.id} - ${entity.name}` : entity.name;
          const isLast = index === entities.length - 1 && !isEquipment;
           
          const isTicketsDisabled = (isMaterial || isVendor) && selectedPhase !== firstPhase;
          const isLoadsDisabled = isDumpingSite && selectedPhase !== firstPhase;

          return (
            
            <View key={entity.id} style={[styles.entityContainer, isLast && styles.lastEntityContainer]}>
              <View style={styles.entityHeader}>
                <Text style={styles.employeeName}>{name}</Text>
                {isEquipment && <Text style={styles.employeeId}>EQP ID: {entity.id}</Text>}
              </View>
              
              {type !== 'equipment' && entity.materials && entity.materials.length > 0 && (
            <View style={styles.materialList}>
              {entity.materials.map((mat: { id: number; name: string; unit: string }, i: number) => (
                <Text key={i} style={styles.materialItem}>
                  {/* → {mat.name} ({mat.unit}) */}
                  → {mat.name}
                </Text>
              ))}
            </View>
          )}
              <View style={styles.controlsRow}>
                <View style={styles.hoursContainer}>
                  {isEquipment ? (
                    <>
                      <View style={styles.inputWithLabel}>
                        <Text style={styles.inputHeader}>REG</Text>
                        <TextInput
                          style={styles.input} keyboardType="numeric" placeholder="0"
                          value={equipmentHours[entity.id]?.[selectedPhase ?? '']?.REG ?? ''}
                          onChangeText={text => selectedPhase && handleComplexHourChange(setEquipmentHours, entity.id, selectedPhase, 'REG', text)}
                        />
                      </View>
                      <View style={styles.inputWithLabel}>
                        <Text style={styles.inputHeader}>S.B</Text>
                        <TextInput
                          style={styles.input} keyboardType="numeric" placeholder="0"
                          value={equipmentHours[entity.id]?.[selectedPhase ?? '']?.S_B ?? ''}
                          onChangeText={text => selectedPhase && handleComplexHourChange(setEquipmentHours, entity.id, selectedPhase, 'S_B', text)}
                        />
                      </View>
                    </>
                  ) : (
                    <>
                      {/* Qty Field (Always Editable for Dumping Site) */}
<View style={styles.inputWithLabel}>
  <Text style={styles.inputHeader}>{getHeader('tickets')}</Text>
  <TextInput
    style={[
      styles.input,
      isTicketsDisabled && styles.disabledInput
    ]}
    keyboardType="number-pad"
    placeholder="0"
    value={(ticketsState as SimpleHourState)[entity.id]?.[selectedPhase ?? ''] ?? ''}
    editable={!isTicketsDisabled} // Qty always editable
    onChangeText={text =>
      selectedPhase &&
      handleSimpleValueChange(
        type as 'material' | 'vendor' | 'dumping_site',
        'tickets',
        entity.id,
        selectedPhase,
        text
      )
    }
  />
</View>

{/* # of Loads Field (Editable only in first phase) */}
<View style={styles.inputWithLabel}>
  <Text style={styles.inputHeader}>{getHeader('hours')}</Text>
  <TextInput
    style={[
      styles.input,
      (isLoadsDisabled || (isDumpingSite && selectedPhase !== firstPhase)) && styles.disabledInput
    ]}
    keyboardType="numeric"
    placeholder="0"
    value={(hoursState as SimpleHourState)[entity.id]?.[selectedPhase ?? ''] ?? ''}
    editable={!isLoadsDisabled && !(isDumpingSite && selectedPhase !== firstPhase)} // only editable in first phase
    onChangeText={text =>
      selectedPhase &&
      handleSimpleValueChange(
        type as 'material' | 'vendor' | 'dumping_site',
        'hours',
        entity.id,
        selectedPhase,
        text
      )
    }
  />
</View>

                      {(isMaterial || isVendor) && (
                        <View style={styles.inputWithLabel}>
                          <Text style={styles.inputHeader}>Unit</Text>
                          <Dropdown
                            style={[styles.dropdown, styles.unitDropdown]}
                            data={isMaterial ? MATERIAL_UNITS : WORK_PERFORMED_UNITS}
                            labelField="label" valueField="value" placeholder="Unit"
                            value={(isMaterial ? materialUnits[entity.id] : vendorUnits[entity.id]) ?? null}
                            onChange={item => handleUnitChange(type as 'material' | 'vendor', entity.id, item.value)}
                            maxHeight={200}
                          />
                        </View>
                      )}
                    </>
                  )}
                </View>
  
                <View style={styles.inputWithLabel}>
                  <Text style={styles.inputHeader}>Total</Text>
                  <View style={styles.totalBox}><Text style={styles.totalText}>{totalValue.toFixed(1)}</Text></View>
                </View>

                 
                {isEquipment ? (
                  <TouchableOpacity style={styles.removeButton} onPress={() => handleRemoveEquipment(entity.id)}>
                    <Text style={styles.removeButtonText}>X</Text>
                  </TouchableOpacity>
                ) : <View style={{ width: 44 }} />}
              </View>
            </View>
          );
        })}
        <View style={styles.totalsRow}>
          <Text style={styles.totalsLabel}>
            {isMaterial ? 'Truck Hrs/Mat Qty\n(Phase)' : isVendor ? 'Total Qty\n(Phase)' : 'Total Hours'}
          </Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.totalsContainer}>
            {phaseCodes.map((phase: string) => (
              <View key={`${phase}-h`} style={styles.totalPhaseItem}>
                <Text style={styles.totalPhaseHeader}>{phase}</Text>
                <View style={styles.totalBox}>
                  <Text style={styles.totalText}>{phaseHourTotals[phase]?.toFixed(1) ?? '0.0'}</Text>
                </View>
              </View>
            ))}
          </ScrollView>
        </View>
        {isEquipment && (
          <View style={styles.addEquipmentRow}>
            <Dropdown
              style={[styles.dropdown, { flex: 1 }]}
              data={availableEquipment
                .filter(eq => !(timesheet?.data.equipment || []).some((e: any) => e.id === eq.id))
                .map(eq => ({ label: `${eq.id} - ${eq.name}`, value: eq.id }))}
              labelField="label" valueField="value" placeholder="Select equipment to add"
              value={null} onChange={handleAddEquipment} maxHeight={200} search searchPlaceholder="Search..."
            />
          </View>
        )}
      </View>
    );
  };

  if (loading) {
    return <ActivityIndicator size="large" style={styles.centered} />;
  }
  if (!timesheet) {
    return <View style={styles.centered}><Text>Timesheet not found</Text></View>;
  }
  const { data } = timesheet;
  // 🏗️ Build correct arrays for 3 sections
// const formattedVendors = Object.values(data.selected_vendor_materials || {});
// const formattedMaterials = Object.values(data.selected_material_items || {});
// const formattedDumpingSites = Object.values(data.selected_dumping_materials || {});
// Build normalized arrays right before your return()
const normalizeMaterialsForEntity = (obj: any) => {
  const allMaterials: any[] = obj?.materials ?? [];               // full material objects from DB
  const selMaterials: any[] = obj?.selectedMaterials ?? [];      // selected subset (may be id-only or partial)

  // If selectedMaterials exists and has items, map those to full objects (preserving unit if available)
  if (Array.isArray(selMaterials) && selMaterials.length > 0) {
    return selMaterials.map(sm => {
      // sm may be { id } or { id, name } or { id, name, unit }
      const match = allMaterials.find(am => String(am.id) === String(sm.id) || am.name === sm.name);
      if (match) return { id: match.id, name: match.name, unit: match.unit ?? (sm.unit ?? '') };
      // fallback: use whatever selectedMaterials has
      return { id: sm.id ?? sm.name, name: sm.name ?? String(sm.id), unit: sm.unit ?? '' };
    });
  }

  // If no selectedMaterials, return full materials if available
  if (Array.isArray(allMaterials) && allMaterials.length > 0) {
    return allMaterials.map(am => ({ id: am.id, name: am.name, unit: am.unit ?? '' }));
  }

  // Nothing found
  return [];
};

// Create formatted arrays for input rendering
// const formattedVendors = Object.values(data.selected_vendor_materials || {}).map((v: any) => ({
//   ...v,
//   materials: normalizeMaterialsForEntity(v)
// }));
const formattedVendors = workPerformed.map(item => ({
  id: item.id,
  name: item.name,
}));

// const formattedMaterials = Object.values(data.selected_material_items || {}).map((m: any) => ({
//   ...m,
//   materials: normalizeMaterialsForEntity(m)
// }));
const formattedMaterials = materialsTrucking.map(item => ({
  id: item.id,
  name: item.name,
}));

// const formattedDumpingSites = Object.values(data.selected_dumping_materials || {}).map((d: any) => ({
//   ...d,
//   materials: normalizeMaterialsForEntity(d)
// }));
const formattedDumpingSites = dumpingSites.map(item => ({
  id: item.id,
  name: item.name,
}));

// OPTIONAL: debug quickly in console to verify structure
console.log('formattedVendors', JSON.stringify(formattedVendors, null, 2));
console.log('formattedMaterials', JSON.stringify(formattedMaterials, null, 2));
console.log('formattedDumpingSites', JSON.stringify(formattedDumpingSites, null, 2));

  return (
    <SafeAreaView style={styles.safeArea}>
      <ScrollView
        style={{ flex: 1 }}
        contentContainerStyle={{ padding: THEME.SPACING, paddingBottom: 100 }}
        keyboardShouldPersistTaps="handled"
      >
        <View style={styles.infoCard}>
          <Text style={styles.jobTitle}>{data.job_name}</Text>
          <Text style={styles.jobCode}>Job Code: {data.job?.job_code ?? 'N/A'}</Text>
          <View style={styles.infoGrid}>
            <View style={styles.infoItem}>
              <Text style={styles.infoLabel}>Date</Text>
              <TouchableOpacity onPress={() => setDatePickerVisible(true)}>
                <Text style={styles.infoValueClickable}>{timesheetDate.toLocaleDateString()}</Text>
              </TouchableOpacity>
            </View>
            <View style={styles.infoItem}><Text style={styles.infoLabel}>Foreman</Text><Text style={styles.infoValue}>{foremanName}</Text></View>
            <View style={styles.infoItem}><Text style={styles.infoLabel}>Project Engineer</Text><Text style={styles.infoValue}>{data.project_engineer || 'N/A'}</Text></View>
            <View style={styles.infoItem}><Text style={styles.infoLabel}>Day</Text><Text style={styles.infoValue}>{data.time_of_day || 'N/A'}</Text></View>
            <View style={styles.infoItem}><Text style={styles.infoLabel}>Location</Text><Text style={styles.infoValue}>{data.location || 'N/A'}</Text></View>
            <View style={styles.infoItem}><Text style={styles.infoLabel}>Weather</Text><Text style={styles.infoValue}>{data.weather || 'N/A'}</Text></View>
            <View style={styles.infoItem}><Text style={styles.infoLabel}>Temperature</Text><Text style={styles.infoValue}>{data.temperature || 'N/A'}</Text></View>
          </View>
        </View>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.phaseSelectorContainer}>
          {data.job?.phase_codes?.map((phase: string) => (
            <TouchableOpacity
              key={phase}
              style={[styles.phaseButton, selectedPhase === phase && styles.selectedPhaseButton]}
              onPress={() => setSelectedPhase(phase)}
            >
              <Text style={[styles.phaseButtonText, selectedPhase === phase && styles.selectedPhaseButtonText]}>{phase}</Text>
            </TouchableOpacity>
          ))}
        </ScrollView>

        {selectedPhase && (
          <View>
            {renderEmployeeInputs()}
            {renderEntityInputs('Equipment', data.equipment || [], 'equipment')}
            {/* {renderEntityInputs('Materials and Trucking', data.materials || [], 'material')}
            {renderEntityInputs('Work Performed', data.vendors || [], 'vendor')}
            {renderEntityInputs("Dumping Sites", data.dumping_sites || [], 'dumping_site')} */}
            {renderEntityInputs('Materials and Trucking', formattedMaterials, 'material')}
{renderEntityInputs('Work Performed', formattedVendors, 'vendor')}
{renderEntityInputs('Dumping Sites', formattedDumpingSites, 'dumping_site')}

            <View style={styles.card}>
              <Text style={styles.cardTitle}>Total Quantity</Text>
              <View style={styles.quantityRow}>
                <Text style={styles.quantityLabel}>Phase: {selectedPhase}</Text>
                <TextInput
                  style={[styles.input, styles.quantityInput]}
                  keyboardType="numeric" placeholder="Enter quantity"
                  value={totalQuantities[selectedPhase] ?? ''}
                  onChangeText={text => handleTotalQuantityChange(selectedPhase, text)}
                />
              </View>
            </View>
          </View>
        )}

        <View style={styles.card}>
          <Text style={styles.cardTitle}>Notes</Text>
          <TextInput
            style={styles.notesInput} multiline maxLength={300}
            placeholder="Enter any notes for this timesheet..."
            value={notes} onChangeText={setNotes}
          />
          <Text style={styles.characterCount}>{notes.length} / 300</Text>
        </View>
      </ScrollView>

      <DatePicker modal open={isDatePickerVisible} date={timesheetDate} mode="date"
          onConfirm={d => { 
              setDatePickerVisible(false); 
              setTimesheetDate(d); 
              
              const newDateString = d.toISOString().split('T')[0];
              setTimesheet(prev => {
                  if (prev === null) return null;
                  return { ...prev, date: newDateString, data: { ...prev.data, date: newDateString } };
              });
          }}
          onCancel={() => { setDatePickerVisible(false); }}
      />
      <View style={styles.footer}>
        <TouchableOpacity
          style={[styles.submitButton, { backgroundColor: isSubmitting ? THEME.textSecondary : THEME.primary }]}
          onPress={handleSave}
          disabled={isSubmitting}
        >
          {isSubmitting ? <ActivityIndicator color="#FFF" /> : <Text style={styles.submitButtonText}>Save Draft</Text>}
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: THEME.background },
  centered: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: THEME.background },
  infoCard: { padding: THEME.SPACING, backgroundColor: THEME.card, borderRadius: 14, marginBottom: THEME.SPACING, shadowColor: "#000", shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.05, shadowRadius: 4, elevation: 3, },
  jobTitle: { fontSize: 24, fontWeight: 'bold', color: THEME.text },
  jobCode: { fontSize: 16, color: THEME.textSecondary, marginTop: 4 },
  infoGrid: { marginTop: THEME.SPACING, flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-between' },
  infoItem: { width: '48%', marginBottom: 8 },
  infoLabel: { fontSize: 14, color: THEME.textSecondary, marginBottom: 2 },
  infoValue: { fontSize: 16, fontWeight: '500', color: THEME.text },
  infoValueClickable: { fontSize: 16, fontWeight: '500', color: THEME.primary },
  phaseSelectorContainer: { marginVertical: THEME.SPACING / 2 },
  phaseButton: { paddingHorizontal: 20, paddingVertical: 10, marginRight: 10, borderRadius: 20, backgroundColor: THEME.card, borderWidth: 1, borderColor: THEME.border, },
  selectedPhaseButton: { backgroundColor: THEME.primary, borderColor: THEME.primary, shadowColor: THEME.primary, shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.3, shadowRadius: 5, elevation: 6, },
  phaseButtonText: { color: THEME.text, fontWeight: '600', fontSize: 16 },
  selectedPhaseButtonText: { color: '#FFF' },
  card: { backgroundColor: THEME.card, borderRadius: 14, padding: THEME.SPACING, marginBottom: THEME.SPACING, shadowColor: "#000", shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.05, shadowRadius: 4, elevation: 2, },
  cardTitle: { fontSize: 20, fontWeight: 'bold', color: THEME.text, marginBottom: 8, paddingBottom: 8, borderBottomWidth: 1, borderBottomColor: THEME.border, },
  entityContainer: { paddingVertical: THEME.SPACING, borderBottomWidth: 1, borderBottomColor: THEME.border },
  lastEntityContainer: { borderBottomWidth: 0, paddingBottom: 0 },
  entityHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 },
  employeeName: { fontSize: 16, fontWeight: 'bold', color: THEME.text, flexShrink: 1 },
  employeeId: { fontSize: 14, color: THEME.textSecondary, fontWeight: '600' },
  inputLabel: { fontSize: 18, color: THEME.text, marginBottom: 12, fontWeight: '600' },
  controlsRow: { flexDirection: 'row', alignItems: 'flex-end', justifyContent: 'space-between' },
  hoursContainer: { flex: 1, flexDirection: 'row', alignItems: 'flex-start', flexWrap: 'wrap' },
  inputWithLabel: { alignItems: 'center', marginRight: 10 },
  inputHeader: { fontSize: 13, color: THEME.textSecondary, marginBottom: 4, fontWeight: '500' },
  input: { borderWidth: 1.5, borderColor: THEME.border, borderRadius: 10, paddingHorizontal: 10, height: 48, width: 65, textAlign: 'center', fontSize: 16, fontWeight: '500', color: THEME.text, backgroundColor: THEME.lightGray, },
  disabledInput: { backgroundColor: '#E0E0E0', color: '#9E9E9E' },
  totalBox: { backgroundColor: THEME.background, borderRadius: 10, height: 48, width: 70, justifyContent: 'center', alignItems: 'center', borderWidth: 1, borderColor: THEME.border, },
  totalText: { fontSize: 16, fontWeight: 'bold', color: THEME.text },
  dropdown: { height: 48, borderColor: THEME.border, borderWidth: 1.5, borderRadius: 10, paddingHorizontal: 8, backgroundColor: THEME.lightGray, },
  unitDropdown: { width: 90 },
  removeButton: { width: 44, height: 48, borderRadius: 10, justifyContent: 'center', alignItems: 'center', backgroundColor: `${THEME.danger}1A`, },
  removeButtonText: { color: THEME.danger, fontWeight: 'bold', fontSize: 20 },
  addEquipmentRow: { marginTop: THEME.SPACING, borderTopWidth: 1, borderTopColor: THEME.border, paddingTop: THEME.SPACING },
  quantityRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  quantityLabel: { fontSize: 16, fontWeight: '500', color: THEME.text },
  quantityInput: { width: 150 },
  totalsRow: { flexDirection: 'row', alignItems: 'center', marginTop: THEME.SPACING, paddingTop: THEME.SPACING, borderTopWidth: 1, borderTopColor: THEME.border, },
  totalsLabel: { fontSize: 16, fontWeight: 'bold', color: THEME.text, marginRight: 10, textAlign: 'center' },
  totalsContainer: { flexDirection: 'row' },
  totalPhaseItem: { alignItems: 'center', marginHorizontal: 4 },
  totalPhaseHeader: { fontSize: 12, color: THEME.textSecondary, marginBottom: 4 },
  footer: { padding: THEME.SPACING, backgroundColor: THEME.card, borderTopWidth: 1, borderTopColor: THEME.border, shadowColor: '#000', shadowOffset: { width: 0, height: -2 }, shadowOpacity: 0.05, shadowRadius: 5, elevation: 5, },
  submitButton: { padding: THEME.SPACING, borderRadius: 14, alignItems: 'center', justifyContent: 'center', height: 56, },
  submitButtonText: { color: '#FFF', fontWeight: 'bold', fontSize: 18 },
  notesInput: { borderWidth: 1.5, borderColor: THEME.border, borderRadius: 10, padding: 12, height: 100, textAlignVertical: 'top', fontSize: 16, color: THEME.text, backgroundColor: THEME.lightGray, },
  characterCount: { fontSize: 12, color: THEME.textSecondary, textAlign: 'right', marginTop: 4 },
  classCodeSummary: { fontSize: 14, fontWeight: '600', paddingVertical: 5, height: 40, textAlignVertical: 'center' },
  employeeClassCodeFooter: { fontSize: 10, color: '#333', textAlign: 'center', marginTop: 4 },

sectionContainer: {
    marginVertical: 10,
    paddingHorizontal: 10,
  },
  sectionTitle: {
    fontWeight: "bold",
    fontSize: 16,
    marginBottom: 4,
  },
  vendorBlock: {
    marginBottom: 6,
  },
  vendorName: {
    fontWeight: "600",
    fontSize: 15,
  },
  materialItem: {
  fontSize: 14,
  color: '#374151',
  flex: 1,
},
  materialItemRow: {
  flexDirection: 'row',
  alignItems: 'center',
  justifyContent: 'space-between',
  marginBottom: 6,
},
vendorHeader: {
  fontSize: 16,
  fontWeight: '700',
  color: '#1F2937',
  marginBottom: 6,
},
materialName: {
  marginLeft: 10,
  fontSize: 14,
  fontStyle: 'italic',
},
vendorMaterialContainer: {
  backgroundColor: '#F9FAFB', // subtle light background
  borderRadius: 12,
  padding: 12,
  marginVertical: 8,
  shadowColor: '#000',
  shadowOpacity: 0.05,
  shadowOffset: { width: 0, height: 2 },
  shadowRadius: 3,
  elevation: 2,
  borderWidth: 1,
  borderColor: '#E5E7EB',
},
smallInput: {
  borderWidth: 1,
  borderColor: '#D1D5DB',
  borderRadius: 8,
  padding: 6,
  textAlign: 'center',
  fontSize: 13,
  width: 70,
  backgroundColor: '#fff',
  marginHorizontal: 4,
},
valueText: {
  fontSize: 14,
  fontWeight: '600',
  color: '#111827',
  marginLeft: 6,
},
noMaterials: {
  fontSize: 13,
  color: '#999',
  fontStyle: 'italic',
  marginLeft: 10,
},
materialList: {
    marginLeft: 10,
    marginBottom: 10,
  },
});


export default TimesheetEditScreen;
