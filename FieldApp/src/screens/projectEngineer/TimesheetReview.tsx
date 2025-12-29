
// import React, { useEffect, useState, useCallback } from 'react';
// import {
//     View,
//     Text,
//     StyleSheet,
//     ScrollView,
//     ActivityIndicator,
//     SafeAreaView,
//     TouchableOpacity,
//     Alert,
//     TextInput,
//     Dimensions,
// } from 'react-native';
// import { RouteProp, useRoute } from '@react-navigation/native';
// import apiClient from '../../api/apiClient';
// import type { SupervisorStackParamList } from '../../navigation/AppNavigator';
// import type { Timesheet } from '../../types';


// // --- Type Definitions ---
// type SimpleHourState = Record<string, Record<string, string>>;
// // EmployeeHourState is complex: { empId: { phaseCode: { classCode: '5' } } }
// type EmployeeHourState = Record<string, Record<string, Record<string, string>>>;
// type ComplexHourSubState = { REG?: string; 'S.B'?: string };
// // ComplexHourState is for Equipment: { equipmentId: { phaseCode: { REG: '5', 'S.B': '1' } } }
// type ComplexHourState = Record<string, Record<string, ComplexHourSubState>>;
// type QuantityState = Record<string, string>;
// type UnitState = Record<string, string | null>;
// type ReviewRouteProp = RouteProp<SupervisorStackParamList, 'TimesheetReview'>;
// type TableCategory =
//   | "employee"
//   | "equipment"
//   | "material"
//   | "vendor"
//   | "dumping_site";

// type EditingTablePhase = { table: TableCategory; phase: string } | null;


// // --- ADDED TYPE DEFINITIONS TO FIX TS2339 ---

// // 1. Define the missing Supervisor structure from the JSONB
// interface Supervisor {
//     id: number;
//     name: string;
// }

// // 2. Define a structure for the JSONB data that includes the supervisor 
// // and other critical properties the component relies on.
// interface ExtendedTimesheetData {
//     supervisor?: Supervisor;
//     notes?: string;
//     weather?: string;
//     time_of_day?: string;
//     temperature?: string;
//     project_engineer?: string;
//     location?: string;
//     job_name?: string; // <--- ADDED: Fixes Property 'job_name' does not exist error
//     job: {
//         job_code: string;
//         phase_codes?: any[];
//     };
//     employees?: any[];
//     equipment?: any[];
//     materials_trucking?: any[];
//     vendors?: any[];
//     dumping_sites?: any[];
//     total_quantities?: Record<string, string | number>;
//     selected_material_items?: Record<string, any>;
//     selected_vendor_materials?: Record<string, any>;
//     selected_dumping_materials?: Record<string, any>;
// }

// // 3. Create an extended Timesheet type by merging the imported Timesheet 
// // with our extended data structure.
// type ExtendedTimesheet = Omit<Timesheet, 'data'> & {
//     data: ExtendedTimesheetData;
// };
// // --------------------------------------------------------------------------


// // --- Theme Constants ---
// const THEME = {
//     primary: '#007AFF',
//     background: '#F0F0F7',
//     card: '#FFFFFF',
//     text: '#1C1C1E',
//     textSecondary: '#6A6A6A',
//     border: '#999999',
//     tableHeaderBg: '#F8F8F8',
//     rowAlternateBg: '#FCFCFC',
//     SPACING: 16,
//     danger: '#FF3B30',
// };

// // --- FIXED WIDTHS (Copied from ForemanTimesheetViewScreen.tsx) ---
// const COL_NAME = 160;
// const COL_ID = 70;
// const COL_CLASS = 80;
// const COL_EMPLOYEE_HOUR = 90;
// const COL_SIMPLE_HOUR = 110;
// const COL_EQUIP = 110;
// const COL_TICKET = 110;
// const COL_TOTAL = 100;
// const COL_START_STOP = 70;

// const getPhaseGroupWidth = (type: TableCategory): number => {
//   if (type === "equipment") return COL_EQUIP * 2;
//   if (type === "employee") return COL_EMPLOYEE_HOUR;
//   return COL_SIMPLE_HOUR;
// };


// const PETimesheetReviewScreen = () => {
//  const route = useRoute<ReviewRouteProp>();
//     const { timesheetId } = route.params;

//     // USE THE EXTENDED TYPE HERE
//     const [timesheet, setTimesheet] = useState<ExtendedTimesheet | null>(null); 
//     const [foremanName, setForemanName] = useState<string>('');
//     const [supervisorName, setSupervisorName] = useState<string>(''); 
//     const [loading, setLoading] = useState(true);
//     const [isEditing, setIsEditing] = useState(false);

//     // State to temporarily hold the phase code being edited in the Total Quantity block
//     const [editingQuantityPhase, setEditingQuantityPhase] = useState<string | null>(null);
//     const [tempNewPhaseCode, setTempNewPhaseCode] = useState('');

//     // --- NEW STATES FOR TABLE PHASE EDITING ---
//     const [editingTablePhase, setEditingTablePhase] = useState<EditingTablePhase>(null);
//     const [tempNewPhaseCodeForTable, setTempNewPhaseCodeForTable] = useState('');
//     const [fullJobPhaseCodes, setFullJobPhaseCodes] = useState<string[]>([]);

//     // ------------------------------------------

//     // States to hold processed data for display
//     const [employeeHours, setEmployeeHours] = useState<EmployeeHourState>({});
//     const [equipmentHours, setEquipmentHours] = useState<ComplexHourState>({});
//     const [materialHours, setMaterialHours] = useState<SimpleHourState>({});
//     const [vendorHours, setVendorHours] = useState<SimpleHourState>({});
//     const [materialTickets, setMaterialTickets] = useState<SimpleHourState>({});
//     const [vendorTickets, setVendorTickets] = useState<SimpleHourState>({});
//     const [totalQuantities, setTotalQuantities] = useState<QuantityState>({});
//     const [notes, setNotes] = useState<string>('');
//     const [materialUnits, setMaterialUnits] = useState<UnitState>({});
//     const [vendorUnits, setVendorUnits] = useState<UnitState>({});
//     const [dumpingSiteHours, setDumpingSiteHours] = useState<SimpleHourState>({});
//     const [dumpingSiteTickets, setDumpingSiteTickets] = useState<SimpleHourState>({});

//     // Total list of phase codes for validation (original list from job)
//     const allJobPhaseCodes = timesheet?.data.job.phase_codes?.map((p: any) => (p?.code ?? p)) || [];
// const [overEmployees, setOverEmployees] = useState<string[]>([]);
// const [showWarnings, setShowWarnings] = useState(false);
// const [hoursState, setHoursState] = useState<SimpleHourState>({});
// const [ticketsState, setTicketsState] = useState<SimpleHourState>({});
// // NEW: holds simple one-value tickets per entity (no phase key)
// const [ticketsLoadsState, setTicketsLoadsState] =
//     useState<Record<string, string>>({});

//     // --- Helper function to clean numeric input and strip leading zeros (New) ---
//     const cleanNumericInput = (value: string): string => {
//         // Remove all non-numeric and non-dot characters
//         let numericText = value.replace(/[^0-9.]/g, '');

//         if (numericText === '') return '';

//         // Strip leading zeros unless it's just '0' or '0.' or '0.something'
//         if (numericText.length > 1 && numericText.startsWith('0') && !numericText.startsWith('0.')) {
//             numericText = numericText.replace(/^0+/, '');
//         }

//         // Ensure that if it results in just '.' it's converted to '0.' or empty
//         if (numericText === '.') return '0.'; 

//         // If it starts with a dot, prefix with zero
//         if (numericText.startsWith('.')) return `0${numericText}`;

//         return numericText;
//     };

// // Round numeric input to nearest quarter hour (0.25 increments)
// const validateQuarterHour = (input: string) => {
//     if (!input) return "";
//     let num = parseFloat(input);
//     if (isNaN(num)) return "";

//     const rounded = Math.round(num * 4) / 4;
//     return rounded.toFixed(2);
// };

//     const fetchData = useCallback(async () => {
//         setLoading(true);
//         try {
//             // USE THE EXTENDED TYPE HERE
//             const response = await apiClient.get<ExtendedTimesheet>(`/api/timesheets/${timesheetId}`);
//             const tsData = response.data;
//             setTimesheet(tsData);
            
//             // Fetch all phase codes for this job_code
//             try {
//                 // This line now correctly accesses tsData.data.job
//                 const jobCode = tsData.data.job.job_code;
//                 const resp = await apiClient.get(`/api/job-phases/${jobCode}/phase-codes-list`);
//                 setFullJobPhaseCodes(resp.data.map((p: any) => p.code));
//             } catch (e) {
//                 console.error("Failed to fetch full phase codes list", e);
//             }
//             // Populate simple fields from tsData.data (JSONB)
//             setNotes(tsData.data.notes || '');


//             // --- Data Population Logic (Keys adjusted for Material/Vendor/DumpingSite) ---
//             const populateSimple = (entities: any[] = [], field: 'hours_per_phase' | 'tickets_per_phase', type?: TableCategory): SimpleHourState => {
//                 const state: SimpleHourState = {};
//                 entities.forEach((e) => {
//                     let id;
//                     // Determine the correct ID/Key for the entity
//                     if (type === 'material') {
//                         // Use name or key for materials, as they are not standard entities in the original timesheet type
//                         id = e.name || e.id || e.key || e.vendor_id;
//                     } else {
//                         id = e.id || e.name || e.key || e.vendor_id;
//                     }

//                     state[id] = {};
//                     const data = e[field] || {};
//                     Object.entries(data).forEach(([phase, val]) => {
//                         // Ensure all values are stored as strings for TextInput
//                         state[id][phase] = String(val || '0');
//                     });
//                 });
//                 return state;
//             };

//             const populateUnits = (entities: any[] = []): UnitState => {
//                 const state: UnitState = {};
//                 entities.forEach(e => {
//                     const id = e.id || e.name || e.key; 
//                     const unit = e.selectedMaterials?.[0]?.unit || e.unit || null; 
//                     state[id] = unit;
//                 });
//                 return state;
//             };

//             const populateEmployeeComplex = (entities: any[] = []): EmployeeHourState => {
//                 const state: EmployeeHourState = {};
//                 entities.forEach((e) => {
//                     state[e.id] = {};
//                     if (e.hours_per_phase) {
//                         Object.entries(e.hours_per_phase).forEach(([phase, phaseHours]) => {
//                             state[e.id][phase] = {};
//                             if (phaseHours && typeof phaseHours === 'object') {
//                                 Object.entries(phaseHours).forEach(([classCode, val]) => {
//                                     state[e.id][phase][classCode] = String(val || '0');
//                                 });
//                             } else {
//                                 // Fallback for simple structure (if API sends hours_per_phase as {phase: 8})
//                                 if (e.class_1) state[e.id][phase][e.class_1] = String(phaseHours || '0');
//                             }
//                         });
//                     }
//                 });
//                 return state;
//             };


//             const populateEquipmentComplex = (entities: any[] = []): ComplexHourState => {
//                 const state: ComplexHourState = {};
//                 entities.forEach((e) => {
//                     state[e.id] = {};
//                     if (e.hours_per_phase) {
//                         for (const phase in e.hours_per_phase) {
//                             const v = e.hours_per_phase[phase];
//                             if (v && typeof v === 'object') {
//                                 state[e.id][phase] = {
//                                     REG: v.REG?.toString() || '0',
//                                     'S.B': (v['S_B'] || v['S.B'])?.toString() || '0', 
//                                 };
//                             } else {
//                                 const num = parseFloat((v ?? '0').toString());
//                                 state[e.id][phase] = { REG: !isNaN(num) ? num.toString() : '0', 'S.B': '0' };
//                             }
//                         }
//                     }
//                 });
//                 return state;
//             };

//             const formattedMaterials = tsData.data.materials_trucking || [];
//             const formattedVendors = tsData.data.vendors || [];
//             const formattedDumpingSites = tsData.data.dumping_sites || [];

//             setEmployeeHours(populateEmployeeComplex(tsData.data.employees));
//             setEquipmentHours(populateEquipmentComplex(tsData.data.equipment));

//             setMaterialHours(populateSimple(formattedMaterials, 'hours_per_phase', 'material')); 
//             setVendorHours(populateSimple(formattedVendors, 'hours_per_phase', 'vendor'));
//             setMaterialTickets(populateSimple(formattedMaterials, 'tickets_per_phase', 'material')); 
//             setVendorTickets(populateSimple(formattedVendors, 'tickets_per_phase', 'vendor'));

//             const materialUnitsMetadata = Object.values(tsData.data.selected_material_items || {});
//             const vendorUnitsMetadata = Object.values(tsData.data.selected_vendor_materials || {});
//             setMaterialUnits(populateUnits(materialUnitsMetadata));
//             setVendorUnits(populateUnits(vendorUnitsMetadata));

//             setDumpingSiteHours(populateSimple(formattedDumpingSites, 'hours_per_phase', 'dumping_site'));
//             setDumpingSiteTickets(populateSimple(formattedDumpingSites, 'tickets_per_phase', 'dumping_site'));

//             if (tsData.data.total_quantities) {
//                 const q: QuantityState = {};
//                 for (const phase in tsData.data.total_quantities) {
//                     q[phase] = tsData.data.total_quantities[phase].toString();
//                 }
//                 setTotalQuantities(q);
//             }

//             // Fetch Foreman Name (Existing Logic)
//             const userRes = await apiClient.get(`/api/users/${tsData.foreman_id}`);
//             setForemanName(`${userRes.data.first_name} ${userRes.data.last_name}`.trim());

//             // --- CORRECTED LOGIC: Direct Access to Supervisor Name from JSONB (data) ---
//             // This is now type-safe due to the ExtendedTimesheet type.
//             const supervisorData = tsData.data.supervisor;
//             if (supervisorData && supervisorData.name) {
//                  setSupervisorName(supervisorData.name.trim());
//             } else {
//                  setSupervisorName('N/A');
//             }
//             // --------------------------------------------------------------------------


//         } catch (error) {
//             console.error('Failed to load timesheet:', error);
//             Alert.alert('Error', 'Failed to load timesheet data.');
//         } finally {
//             setLoading(false);
//         }
//     }, [timesheetId]);

//     useEffect(() => {
//         fetchData();
//     }, [fetchData]);

// useEffect(() => {
//   const over: string[] = [];

//   Object.keys(employeeHours).forEach(empKey => {
//     const total = calculateTotalEmployeeHours(employeeHours, empKey);
//     if (total > 9) {
//       const emp = timesheet?.data?.employees?.find(
//         e => String(e.id) === empKey
//       );

//       if (emp) {
//         const first = (emp.first_name ?? '').trim();
//         const last = (emp.last_name ?? '').trim();
//         const name = `${first} ${last}`.trim();
//         over.push(name || `EMP ${empKey}`);
//       } else {
//         over.push(`EMP ${empKey}`);
//       }
//     }
//   });

//   setOverEmployees(over);
// }, [employeeHours, timesheet]);



//     // --- DERIVE ALL ACTIVE PHASE CODES FOR DYNAMIC COLUMN RENDERING ---
//     const getAllActivePhaseCodes = useCallback((): string[] => {
//         const uniquePhases = new Set<string>(); 

//         // 1. Collect all active phases from current state data
//         Object.values(employeeHours).forEach(phases => {
//             Object.keys(phases).forEach(p => uniquePhases.add(p));
//         });
//         Object.values(equipmentHours).forEach(phases => {
//             Object.keys(phases).forEach(p => uniquePhases.add(p));
//         });
//         [materialHours, vendorHours, dumpingSiteHours, materialTickets, vendorTickets, dumpingSiteTickets].forEach(state => {
//             Object.values(state).forEach(phases => {
//                 Object.keys(phases).forEach(p => uniquePhases.add(p));
//             });
//         });
//         Object.keys(totalQuantities).forEach(p => uniquePhases.add(p));

//         const activePhases = Array.from(uniquePhases);

//         // --- NEW LOGIC FOR ORDERING ---
//         const allJobPhaseCodesSet = new Set(allJobPhaseCodes);
//         const activePhasesSet = new Set(activePhases);
        
//         // 1. Separate phases into two groups: those from the original list and the new/renamed ones.
//         const originalPhasesInUse = activePhases.filter(p => allJobPhaseCodesSet.has(p));
//         const newPhases = activePhases.filter(p => !allJobPhaseCodesSet.has(p));
        
//         // Sort new phases alphabetically to maintain a predictable order among them
//         newPhases.sort((a, b) => a.localeCompare(b));

//         const orderedPhases: string[] = [];
//         let newPhaseIndex = 0; // Pointer for the next 'new' phase to use

//         // 2. Iterate over the static original phase list to build the order
//         allJobPhaseCodes.forEach(originalPhase => {
//             if (activePhasesSet.has(originalPhase)) {
//                 // Case 1: Original phase is still active and has data. Use it.
//                 orderedPhases.push(originalPhase);
//             } else {
                
//                 if (newPhaseIndex < newPhases.length) {
//                     orderedPhases.push(newPhases[newPhaseIndex]);
//                     newPhaseIndex++; // Consume the 'new' phase
//                 } else {
//                     // If no replacement is found, it was likely deleted or has no data, so we skip this position.
//                 }
//             }
//         });

//         // 3. Append any remaining new phases (if they don't map to any original one, i.e., they are truly new)
//         const remainingNewPhases = newPhases.slice(newPhaseIndex);

//         // The remainingNewPhases are already sorted alphabetically.
//         return orderedPhases.concat(remainingNewPhases);

//     }, [allJobPhaseCodes, employeeHours, equipmentHours, materialHours, vendorHours, dumpingSiteHours, materialTickets, vendorTickets, dumpingSiteTickets, totalQuantities]);

//     const allActivePhaseCodes = getAllActivePhaseCodes(); // This will be used for rendering columns

//     // --- State Update Handlers (Updated to use cleanNumericInput) ---

//     const updateSimpleState = (
//         setState: React.Dispatch<React.SetStateAction<SimpleHourState>>, 
//         entityId: string,
//         phase: string,
//         newValue: string
//     ) => {
//         const cleanedValue = cleanNumericInput(newValue);
        
//         setState(prev => ({
//             ...prev,
//             [entityId]: {
//                 ...prev[entityId],
//                 [phase]: cleanedValue,
//             },
//         }));
//     };
// const updateEmployeeState = (
//   entityId: string,
//   phase: string,
//   classCode: string,
//   newValue: string
// ) => {
//   const cleanedValue = cleanNumericInput(newValue);

//   setEmployeeHours(prev => {
//     // 1️⃣ Build updated state first
//     const updated: EmployeeHourState = {
//       ...prev,
//       [entityId]: {
//         ...(prev[entityId] || {}),
//         [phase]: {
//           ...((prev[entityId] || {})[phase] || {}),
//           [classCode]: cleanedValue,
//         },
//       },
//     };

//     // 2️⃣ Calculate total hours for this employee across ALL phases
//     let total = 0;
//     const employeePhases = updated[entityId] || {};
//     Object.values(employeePhases).forEach((classHours: Record<string, string>) => {
//       Object.values(classHours).forEach((val: string) => {
//         const num = parseFloat(val || '0');
//         if (!isNaN(num)) total += num;
//       });
//     });
// if (total > 24) {
//   // Get employee name from timesheet
//   const emp = timesheet?.data?.employees?.find(e => String(e.id) === entityId);
//   const employeeName = emp
//     ? `${(emp.first_name ?? '').trim()} ${(emp.last_name ?? '').trim()}`.trim() || `EMP ${entityId}`
//     : `EMP ${entityId}`;

//   Alert.alert(
//     '⚠️ TOTAL HOURS EXCEEDED ⚠️', // Uppercase + emojis for urgency
//     `🚫 Employee: ${employeeName}\n⏱ Total: ${total.toFixed(1)} hours\n\nCannot exceed 24 hours!`,
//     [
//       {
//         text: 'Dismiss',
//         onPress: () => console.log('Alert dismissed'),
//         style: 'destructive', // red-style button
//       },
//     ],
//     { cancelable: false }
//   );
//   return prev; // Revert - don't apply the change
// }

//     // 4️⃣ Valid - accept the change
//     return updated;
//   });
// };


//     const updateEquipmentState = (
//         entityId: string,
//         phase: string,
//         type: 'REG' | 'S.B',
//         newValue: string
//     ) => {
//         const cleanedValue = cleanNumericInput(newValue);
//         setEquipmentHours(prev => ({
//             ...prev,
//             [entityId]: {
//                 ...prev[entityId],
//                 [phase]: {
//                     ...prev[entityId]?.[phase],
//                     [type]: cleanedValue,
//                 },
//             },
//         }));
//     };

//     const updateTotalQuantity = (
//         phase: string,
//         newValue: string
//     ) => {
//         const cleanedValue = cleanNumericInput(newValue);
//         setTotalQuantities(prev => ({
//             ...prev,
//             [phase]: cleanedValue,
//         }));
//     };

//     // --- Phase Code Renaming Handler (Generalized for Tables and Total Quantities) ---

//     const renamePhaseKeyInSimpleState = (
//         state: SimpleHourState,
//         oldPhase: string,
//         newPhase: string
//     ): SimpleHourState => {
//         const newState: SimpleHourState = {};
//         // Iterate over entities (rows)
//         Object.entries(state).forEach(([entityId, phases]) => {
//             const newPhases: Record<string, string> = {};
//             let changed = false;
//             // Iterate over phases (columns) for this entity
//             Object.entries(phases).forEach(([phase, value]) => {
//                 if (phase === oldPhase) {
//                     newPhases[newPhase] = value;
//                     changed = true;
//                 } else {
//                     newPhases[phase] = value;
//                 }
//             });
//             newState[entityId] = newPhases;
//         });
//         return newState;
//     };

//     const handlePhaseCodeRename = (oldPhase: string, newPhase: string, isFromQuantityBlock: boolean = false) => {
//         const cleanedNewPhase = newPhase.trim().toUpperCase();

//         if (oldPhase === cleanedNewPhase) {
//             if (isFromQuantityBlock) setEditingQuantityPhase(null);
//             else setEditingTablePhase(null);
//             return;
//         }

//         if (cleanedNewPhase === '') {
//             Alert.alert('Invalid Phase', 'Phase code cannot be empty.');
//             return;
//         }

//         // Check for conflict: renaming 'A' to 'B' when 'B' already exists
//         const allCurrentPhases = allActivePhaseCodes;
//         if (allCurrentPhases.includes(cleanedNewPhase) && cleanedNewPhase !== oldPhase) {
//              Alert.alert('Conflict', `Phase ${cleanedNewPhase} already exists. Please merge the data manually by editing the numbers before renaming.`);
//              return;
//         }

//         // 1. Employee Hours (Complex Structure)
//         setEmployeeHours(prev => {
//             const newState: EmployeeHourState = {};
//             Object.entries(prev).forEach(([entityId, phases]) => {
//                 const newPhases: Record<string, Record<string, string>> = {};
//                 Object.entries(phases).forEach(([phase, classHours]) => {
//                     if (phase === oldPhase) {
//                         newPhases[cleanedNewPhase] = classHours;
//                     } else {
//                         newPhases[phase] = classHours;
//                     }
//                 });
//                 newState[entityId] = newPhases;
//             });
//             return newState;
//         });
        

//         // 2. Equipment Hours (Complex Hour Sub State)
//         setEquipmentHours(prev => {
//             const newState: ComplexHourState = {};
//             Object.entries(prev).forEach(([entityId, phases]) => {
//                 const newPhases: Record<string, ComplexHourSubState> = {};
//                 Object.entries(phases).forEach(([phase, hourTypes]) => {
//                     if (phase === oldPhase) {
//                         newPhases[cleanedNewPhase] = hourTypes;
//                     } else {
//                         newPhases[phase] = hourTypes;
//                     }
//                 });
//                 newState[entityId] = newPhases;
//             });
//             return newState;
//         });

//         // 3. Simple Hours/Tickets
//         setMaterialHours(prev => renamePhaseKeyInSimpleState(prev, oldPhase, cleanedNewPhase));
//         setVendorHours(prev => renamePhaseKeyInSimpleState(prev, oldPhase, cleanedNewPhase));
//         setDumpingSiteHours(prev => renamePhaseKeyInSimpleState(prev, oldPhase, cleanedNewPhase));
//         setMaterialTickets(prev => renamePhaseKeyInSimpleState(prev, oldPhase, cleanedNewPhase));
//         setVendorTickets(prev => renamePhaseKeyInSimpleState(prev, oldPhase, cleanedNewPhase));
//         setDumpingSiteTickets(prev => renamePhaseKeyInSimpleState(prev, oldPhase, cleanedNewPhase));

//         // 4. Total Quantities
//         setTotalQuantities(prev => {
//             if (!prev[oldPhase]) return prev; 

//             const newQuantities = { ...prev };
//             const value = newQuantities[oldPhase];
//             // CRITICAL: Delete the old phase key from the map
//             delete newQuantities[oldPhase]; 
//             newQuantities[cleanedNewPhase] = value;
//             return newQuantities;
//         });

//         // Cleanup editing states
//         if (isFromQuantityBlock) {
//             setEditingQuantityPhase(null);
//             setTempNewPhaseCode('');
//         } else {
//             setEditingTablePhase(null);
//             setTempNewPhaseCodeForTable('');
//         }
//     };

//     // Refactored old Total Quantity handler to use the new generalized one
//     const handlePhaseCodeChangeForQuantity = (oldPhase: string, newPhase: string) => {
//         handlePhaseCodeRename(oldPhase, newPhase, true);
//     };


//     // --- Edit/Save/Cancel Handlers ---

//     const handleEditPress = () => {
//         setIsEditing(true);
//     };

//     const handleCancelPress = () => {
//         setIsEditing(false);
//         setEditingQuantityPhase(null);
//         setTempNewPhaseCode('');
//         setEditingTablePhase(null); // Clear new table state
//         setTempNewPhaseCodeForTable(''); // Clear new table state
//         fetchData(); 
//     };

//     const handleSavePress = async () => {
//         setLoading(true);
//         // Ensure any pending phase code edit is cancelled before saving
//         setEditingQuantityPhase(null); 
//         setTempNewPhaseCode('');
//         setEditingTablePhase(null); // Clear new table state
//         setTempNewPhaseCodeForTable(''); // Clear new table state


//         try {
//             // CRITICAL FIX: Reformat state to match the API's expected array structure
//             const employeesPayload = rebuildEmployeeData();
//             const equipmentPayload = rebuildEquipmentData();
//             const materialsPayload = rebuildSimpleEntityData(timesheet?.data.materials_trucking || [], materialHours, materialTickets, 'material');
//             const vendorsPayload = rebuildSimpleEntityData(timesheet?.data.vendors || [], vendorHours, vendorTickets, 'vendor');
//             const dumpingSitesPayload = rebuildSimpleEntityData(timesheet?.data.dumping_sites || [], dumpingSiteHours, dumpingSiteTickets, 'dumping_site');


//             const payload = {
//                 notes: notes,
//                 // Sending the rebuilt arrays instead of the flat state maps
//                 employees: employeesPayload, 
//                 equipment: equipmentPayload,
//                 materials_trucking: materialsPayload,
//                 vendors: vendorsPayload,
//                 dumping_sites: dumpingSitesPayload,

//                 // Filter and convert total quantities to number/string as appropriate
//                 total_quantities: Object.entries(totalQuantities)
//                     .reduce((acc, [phase, quantity]) => {
//                         const q = parseFloat(quantity);
//                         if (!isNaN(q) && q > 0) {
//                             // Ensure the quantity is a string representation of a number
//                             acc[phase] = quantity; 
//                         }
//                         return acc;
//                     }, {} as QuantityState),
//             };

//             // NOTE: The backend API endpoint is assumed to be `/api/timesheets/${timesheetId}/review` based on prior context.
//             await apiClient.patch(`/api/timesheets/${timesheetId}/review`, payload);

//             Alert.alert('Success', 'Timesheet saved successfully.');
//             setIsEditing(false);
//             await fetchData(); 
//         } catch (error: unknown) {
//             console.error('Failed to save timesheet:', error);

//             let errorMessage = 'Check your network and ensure the data format is correct.';

//             const err = error as { response?: { data?: { message?: string } } };
//             errorMessage = err.response?.data?.message || errorMessage;

//             Alert.alert('Error', `Failed to save timesheet data: ${errorMessage}`);
//         } finally {

//             setLoading(false);
//         }
//     };


//     // --- CRITICAL FIX: Data Reformatting Functions (New) ---

//     // 1. Rebuild Employee Data
//     const rebuildEmployeeData = () => {
//         if (!timesheet || !timesheet.data.employees) return [];
//         return timesheet.data.employees.map(employee => {
//             const updatedEmployee = { ...employee };
//             const hoursData = employeeHours[employee.id];

//             if (hoursData) {
//                 // Convert all hours back to numbers for API if expected
//                 const hoursPerPhase: Record<string, Record<string, number>> = {};
//                 Object.entries(hoursData).forEach(([phase, classHours]) => {
//                     const newClassHours: Record<string, number> = {};
//                     Object.entries(classHours).forEach(([classCode, value]) => {
//                         const num = parseFloat(value) || 0;
//                         if (num > 0) {
//                             newClassHours[classCode] = num;
//                         }
//                     });
//                     if (Object.keys(newClassHours).length > 0) {
//                         hoursPerPhase[phase] = newClassHours;
//                     }
//                 });
//                 updatedEmployee.hours_per_phase = hoursPerPhase;
//             }
//             return updatedEmployee;
//         });
//     };

//     // 2. Rebuild Equipment Data
//     const rebuildEquipmentData = () => {
//         if (!timesheet || !timesheet.data.equipment) return [];
//         return timesheet.data.equipment.map(equipment => {
//             const updatedEquipment = { ...equipment };
//             const hoursData = equipmentHours[equipment.id];

//             if (hoursData) {
//                 const hoursPerPhase: Record<string, { REG: number, S_B: number }> = {};
//                 Object.entries(hoursData).forEach(([phase, phaseHours]) => {
//                     const reg = parseFloat(phaseHours.REG || '0') || 0;
//                     const sb = parseFloat(phaseHours['S.B'] || '0') || 0;

//                     if (reg > 0 || sb > 0) {
//                         // API might expect 'S_B' instead of 'S.B'
//                         hoursPerPhase[phase] = { REG: reg, S_B: sb };
//                     }
//                 });
//                 updatedEquipment.hours_per_phase = hoursPerPhase;
//             }
//             return updatedEquipment;
//         });
//     };

//     // 3. Rebuild Simple Entity Data (Materials, Vendors, Dumping Sites)
//     const rebuildSimpleEntityData = (
//         entities: any[],
//         hoursState: SimpleHourState, 
//         ticketsState: SimpleHourState, 
//         type: TableCategory
//     ) => {
//         return entities.map(entity => {
//             const updatedEntity = { ...entity };
//             let entityId;

//             // Determine the key used in the state maps
//             if (type === 'material') {
//                 entityId = entity.name || entity.id || entity.key || entity.vendor_id;
//             } else {
//                 entityId = entity.id || entity.name || entity.key || entity.vendor_id;
//             }

//             const hData = hoursState[entityId];
//             // const tData = ticketsState[entityId];

//             if (hData) {
//                 const hoursPerPhase: Record<string, number> = {};
//                 Object.entries(hData).forEach(([phase, value]) => {
//                     const num = parseFloat(value) || 0;
//                     if (num > 0) hoursPerPhase[phase] = num;
//                 });
//                 updatedEntity.hours_per_phase = hoursPerPhase;
//             } else {
//                  updatedEntity.hours_per_phase = {};
//             }

//             // if (tData) {
//             //     const ticketsPerPhase: Record<string, number> = {};
//             //     Object.entries(tData).forEach(([phase, value]) => {
//             //         const num = parseFloat(value) || 0;
//             //         if (num > 0) ticketsPerPhase[phase] = num;
//             //     });
//             //     updatedEntity.tickets_per_phase = ticketsPerPhase;
//             // } else {
//             //     updatedEntity.tickets_per_phase = {};
//             // }
//             if (ticketsLoadsState[entityId] !== undefined) {
//       const num = parseFloat(ticketsLoadsState[entityId] || '0') || 0;
//       updatedEntity.tickets_loads = { [entity.id]: num };
//       // optionally clear tickets_per_phase if you do not want it at all:
//       delete updatedEntity.tickets_per_phase;
//     }
//             return updatedEntity;
//         });
//     };

//     // --- Calculation Functions (Unchanged) ---

//     const calculateTotalSimpleHours = (hoursState: SimpleHourState, entityId: string): number => {
//         const m = hoursState[entityId];
//         if (!m) return 0;
//         return Object.values(m).reduce((t, v) => t + (parseFloat(v) || 0), 0);
//     };

//     const calculateTotalEmployeeHours = (hoursState: EmployeeHourState, entityId: string): number => {
//         const m = hoursState[entityId];
//         if (!m) return 0;
//         return Object.values(m).reduce((phaseTotal, classHours) => {
//             return phaseTotal + Object.values(classHours).reduce((classTotal, hoursStr) => {
//                 return classTotal + (parseFloat(hoursStr) || 0);
//             }, 0);
//         }, 0);
//     };

//     const calculateTotalComplexHours = (hoursState: ComplexHourState, entityId: string): number => {
//         const m = hoursState[entityId];
//         if (!m) return 0;
//         return Object.values(m).reduce((t, v) => {
//             const reg = parseFloat(v?.REG || '0');
//             const sb = parseFloat(v?.['S.B'] || '0');
//             return t + (isNaN(reg) ? 0 : reg) + (isNaN(sb) ? 0 : sb);
//         }, 0);
//     };


//     const calculateSimplePhaseTotals = (state: SimpleHourState, phaseCodes: string[]): Record<string, number> => {
//         const totals: Record<string, number> = {};
//         phaseCodes.forEach(p => { totals[p] = 0 });
//         Object.values(state).forEach((perEntity) => {
//             Object.entries(perEntity).forEach(([phase, value]) => {
//                 if (totals[phase] !== undefined) {
//                     totals[phase] += parseFloat(value) || 0;
//                 }
//             });
//         });
//         return totals;
//     };

//     const calculateComplexPhaseTotals = (state: ComplexHourState, phaseCodes: string[]): Record<string, { REG: number, 'S.B': number }> => {
//         const totals: Record<string, { REG: number, 'S.B': number }> = {};
//         phaseCodes.forEach(p => { totals[p] = { REG: 0, 'S.B': 0 } });
//         Object.values(state).forEach((perEntity) => {
//             Object.entries(perEntity).forEach(([phase, value]) => {
//                 if (totals[phase]) {
//                     totals[phase].REG += parseFloat(value.REG || '0');
//                     totals[phase]['S.B'] += parseFloat(value['S.B'] || '0');
//                 }
//             });
//         });
//         return totals;
//     };


//     const calculateEmployeePhaseTotal = (state: EmployeeHourState, phase: string): number => {
//         let total = 0;
//         Object.values(state).forEach((perEntity) => {
//             const phaseData = perEntity[phase];
//             if (phaseData) {
//                 Object.values(phaseData).forEach((hoursStr) => {
//                     total += parseFloat(hoursStr) || 0;
//                 });
//             }
//         });
//         return total;
//     };


//     // --- Helper for Editable Cells (Updated for '0' hiding) ---

//     const renderCellContent = (
//         value: string, 
//         updateFunction: (text: string) => void | undefined,
//         isNumeric: boolean = true
//     ) => {
//         const num = parseFloat(value) || 0;
//         // Display only one decimal point for hours/quantities
//         const displayValue = isNumeric ? num.toFixed(1) : value; 

//         if (isEditing) {
//             // Show empty string instead of '0.0' or '0' when editing
//             const isZeroOrNearZero = num === 0 || Math.abs(num - 0.0) < 0.001; 
//             const inputValue = isZeroOrNearZero ? '' : value; 

//             return (
// <TextInput
//     style={[styles.editableInput, { flex: 1 }]}
//     keyboardType="numeric"
//     value={inputValue}
//     onChangeText={updateFunction}
//     onBlur={() => {
//         const rounded = validateQuarterHour(inputValue);
//         updateFunction(rounded);
//     }}
// />

//             );
//         }
//         return <Text style={{ flex: 1, textAlign: 'center' }}>{displayValue}</Text>;
//     };

//     const renderTicketCellContent = (
//         value: string, 
//         updateFunction: (text: string) => void | undefined
//     ) => {
//         const num = parseInt(value) || 0;
//         const displayValue = num.toString();

//         if (isEditing) {
//             // Show empty string instead of '0' when editing
//             const inputValue = (num === 0) ? '' : value;
//             return (
//                 <TextInput
//                     style={[styles.editableInput, { flex: 1 }]}
//                     keyboardType="number-pad"
//                     value={inputValue}
//                     onChangeText={updateFunction}
//                 />
//             );
//         }
//         return <Text style={{ flex: 1, textAlign: 'center' }}>{displayValue}</Text>;
//     };

// const getTicketsFromEntity = (entity: any) => {
//     if (!entity?.tickets_loads) return "0";

//     const keys = Object.keys(entity.tickets_loads);
//     if (keys.length === 0) return "0";

//     return entity.tickets_loads[keys[0]]?.toString() ?? "0";
// };


//     // --- Table Renderer Component (Unchanged structure, relies on updated helpers) ---
//     const renderTableBlock = (
//         title: string,
//         entities: any[],
//         hoursState: SimpleHourState | ComplexHourState | EmployeeHourState,
//         ticketsState: SimpleHourState | undefined,
//         type: TableCategory,
//         unitState: UnitState | undefined,
//     ) => {
//         // Now entities is guaranteed to be an array due to fix below
//         if (!entities || entities.length === 0) return null;

//         const isEmployee = type === 'employee';
//         const isEquipment = type === 'equipment';
//         const isMaterial = type === 'material';
//         const isSimple = isMaterial || type === 'vendor' || type === 'dumping_site';

//         // USE THE NEW DERIVED LIST OF PHASE CODES
//        // USE THE NEW DERIVED LIST OF PHASE CODES
// const phaseCodes = allActivePhaseCodes.filter(
//   (p) => p !== 'start_hours' && p !== 'stop_hours' && p !== 'total'
// );


//         if (phaseCodes.length === 0) return null; 

//         // --- Totals Calculation ---
//         let employeePhaseTotals: Record<string, number> = {};
//         let equipmentPhaseTotals: Record<string, { REG: number, 'S.B': number }> = {};
//         let simplePhaseTotals: Record<string, number> = {};
//         let grandTotal = 0;

//         if (isEmployee) {
//             phaseCodes.forEach(phase => {
//                 employeePhaseTotals[phase] = calculateEmployeePhaseTotal(hoursState as EmployeeHourState, phase);
//             });
//             grandTotal = entities.reduce((sum, e) => sum + calculateTotalEmployeeHours(hoursState as EmployeeHourState, e.id), 0);
//         } else if (isEquipment) {
//             equipmentPhaseTotals = calculateComplexPhaseTotals(hoursState as ComplexHourState, phaseCodes);
//             grandTotal = entities.reduce((sum, e) => sum + calculateTotalComplexHours(hoursState as ComplexHourState, e.id), 0);
//         } else if (isSimple) {
//             simplePhaseTotals = calculateSimplePhaseTotals(hoursState as SimpleHourState, phaseCodes);
//             grandTotal = entities.reduce((sum, e) => {
//                 let entityId;
//                 if (type === 'material') {
//                     entityId = e.name || e.id || e.key || e.vendor_id;
//                 } else {
//                     entityId = e.id || e.name || e.key || e.vendor_id;
//                 }
//                 return sum + calculateTotalSimpleHours(hoursState as SimpleHourState, entityId);
//             }, 0);
//         }
//         // -------------------------------------------------------------------------

//        const phaseGroupWidth = getPhaseGroupWidth(type);

// let fixedWidth = COL_NAME + COL_TOTAL;

// // EMPLOYEE: Name + EMP# + Class + Total
// if (isEmployee) {
//   fixedWidth += COL_ID + COL_CLASS;
// } 
// // EQUIPMENT: Name + EQUIP + Start + Stop + Total
// else if (isEquipment) {
//   fixedWidth += COL_ID + (COL_START_STOP * 2);
// } 
// // SIMPLE TABLES: Name + Tickets + Total
// else if (isSimple) {
//   fixedWidth += COL_TICKET;  // only tickets added here
// }

// // Final content width
// const contentWidth = fixedWidth + phaseGroupWidth * phaseCodes.length;

//         // Helper to determine the correct state setter for Simple types
//         const getSimpleStateSetter = (targetType: 'hours' | 'tickets'): React.Dispatch<React.SetStateAction<SimpleHourState>> => {
//             if (targetType === 'hours') {
//                 if (type === 'material') return setMaterialHours;
//                 if (type === 'vendor') return setVendorHours;
//                 if (type === 'dumping_site') return setDumpingSiteHours;
//             } else if (targetType === 'tickets') {
//                 if (type === 'material') return setMaterialTickets;
//                 if (type === 'vendor') return setVendorTickets;
//                 if (type === 'dumping_site') return setDumpingSiteTickets;
//             }
//             return (() => {}) as React.Dispatch<React.SetStateAction<SimpleHourState>>; 
//         };
//         const simpleHoursSetter = getSimpleStateSetter('hours');
//         const simpleTicketsSetter = getSimpleStateSetter('tickets');


//         // Custom Employee Table Renderer
//         const renderEmployeeTableBody = () => {
//             return entities.flatMap((entity, index) => {
//                 const entityId = entity.id;
//                 const entityName = `${entity.first_name} ${entity.last_name}`.trim();
//                 const grandTotal = calculateTotalEmployeeHours(hoursState as EmployeeHourState, entityId);
//                 const showReason = grandTotal === 0 && entity.reason
//                 const classCodesUsed: Set<string> = new Set();

//                 // Collect all class codes that have data for any phase
//                 phaseCodes.forEach(phase => {
//                     const phaseHours = (hoursState as EmployeeHourState)[entityId]?.[phase];
//                     if (phaseHours) {
//                         Object.keys(phaseHours).forEach(code => {
//                             if (parseFloat(phaseHours[code] || '0') > 0) {
//                                 classCodesUsed.add(code);
//                             }
//                         });
//                     }
//                 });

//                 // Include all predefined class codes from the entity
//                 if (entity.class_1) classCodesUsed.add(entity.class_1);
//                 if (entity.class_2) classCodesUsed.add(entity.class_2);

//                 const classCodesToDisplay = Array.from(classCodesUsed).sort();
//                 if (classCodesToDisplay.length === 0) classCodesToDisplay.push('N/A'); // Default row

//                 return classCodesToDisplay.map((classCode, classIndex) => {
//                     const isFirstClassRow = classIndex === 0;

//                     return (
//                         <View key={`${entityId}-${classCode}`} style={[styles.tableRow, index % 2 === 1 && styles.tableRowAlternate]}>
//                             {/* Fixed Columns */}
// <View
//   style={[
//     styles.dataCell,
//     styles.colName,
//     styles.borderRight,                     // always keep border to maintain grid
//   ]}
// >
//   {isFirstClassRow ? (
//     <>
//       <Text style={[styles.dataCell, { fontWeight: '500' }]} numberOfLines={2}>
//         {entityName}
//       </Text>

//       {showReason && (
//         <Text
//           style={{
//             fontSize: 12,
//             color: '#8a3434ff',
//             fontStyle: 'italic',
//             marginTop: 2,
//             paddingHorizontal: 2,
//             borderRadius: 4,
//           }}
//         >
//           Reason: {entity.reason}
//         </Text>
//       )}
//     </>
//   ) : (
//     <Text style={{ opacity: 0 }}>placeholder</Text>  
//     // invisible so height stays but name does NOT repeat
//   )}
// </View>



//                             <Text style={[styles.dataCell, styles.colId, styles.borderRight, isFirstClassRow ? null : styles.transparentCell]}>
//                                 {isFirstClassRow ? entityId : ''}
//                             </Text>
//                             <Text style={[styles.dataCell, styles.colClassCode, styles.borderRight]}>{classCode === 'N/A' ? '' : classCode}</Text>

//                             {/* Dynamic Hours Columns per Phase */}
//                             {phaseCodes.map((phase, phaseIndex) => {
//                                 const currentHours = classCode === 'N/A' 
//                                     ? '0' 
//                                     : ((hoursState as EmployeeHourState)[entityId]?.[phase]?.[classCode] || '0');
//                                 const isLastPhase = phaseIndex === phaseCodes.length - 1;
//                                 const phaseBorder = isLastPhase ? {} : styles.phaseGroupBorderRight;

//                                 return (
//                                     <View 
//                                         key={phase} 
//                                         style={[
//                                             styles.dynamicPhaseColEmployee, 
//                                             phaseBorder,
//                                         ]}
//                                     > 
//                                         <View style={[styles.dataCell, { flex: 1 }, styles.lastCell]}>
//                                             {renderCellContent(currentHours, (text) => 
//                                                 updateEmployeeState(entityId, phase, classCode, text)
//                                             )}
//                                         </View>
//                                     </View>
//                                 );
//                             })}

//                             {/* Total Hours */}
//                             <Text style={[styles.dataCell, styles.colTotal, styles.lastCell, styles.borderLeft, isFirstClassRow ? null : styles.transparentCell]}>
//                                 {isFirstClassRow ? grandTotal.toFixed(1) : ''}
//                             </Text>
//                         </View>
//                     );
//                 });
//             });
//         };
//         // End of Custom Employee Table Renderer


//         return (
//             <View style={styles.card}>
//                 <Text style={styles.tableTitle}>{title}</Text>
//                 <ScrollView horizontal showsHorizontalScrollIndicator={true}> 
//                     <View style={[styles.tableContainer, { minWidth: contentWidth }]}>


//                         {/* -------------------- TABLE HEADER START (DYNAMIC) -------------------- */}
//                         <View style={styles.tableHeader}>
//                             <Text style={[styles.headerCell, styles.colName, styles.borderRight, !isEmployee && styles.headerCellBottomBorder]}>
//                                 Name
//                             </Text>

//                             {(isEmployee || isEquipment) && (
//                                 <Text style={[styles.headerCell, styles.colId, styles.borderRight, styles.headerCellBottomBorder]}>
//                                     {isEmployee ? 'EMP#' : 'EQUIP #ER'}
//                                 </Text>
//                             )}

//                             {isEquipment && (
//                                 <>
//                                     <Text style={[styles.headerCell, styles.colStartStop, styles.borderRight, styles.headerCellBottomBorder]}>Start Hours</Text>
//                                     <Text style={[styles.headerCell, styles.colStartStop, styles.borderRight, styles.headerCellBottomBorder]}>Stop Hours</Text>
//                                 </>
//                             )}

//                             {isEmployee && (
//                                 <Text style={[styles.headerCell, styles.colClassCode, styles.borderRight, styles.headerCellBottomBorder]}>
//                                     Class Code
//                                 </Text>
//                             )}
//                     {/* SINGLE TICKETS COLUMN (before phases) */}
// {isSimple && (
//     <Text 
//         style={[
//             styles.headerCell,
//             styles.colTickets,
//             styles.borderRight,
//             styles.headerCellBottomBorder
//         ]}
//     >
//         {type === 'dumping_site' ? '# Loads' : '# Tickets'}
//     </Text>
// )}

//                             {/* DYNAMIC PHASE COLUMNS - NOW EDITABLE */}
//                             {phaseCodes.map((phase, phaseIndex) => {
//                                 const isLastPhase = phaseIndex === phaseCodes.length - 1;
//                                 const phaseBorder = isLastPhase ? {} : styles.phaseGroupBorderRight;

//                                 const dynamicPhaseStyle = isEquipment 
//                                     ? styles.dynamicPhaseColEquipment 
//                                     : isEmployee 
//                                         ? styles.dynamicPhaseColEmployee
//                                         : styles.dynamicPhaseColSimple;

//                                 const isCurrentPhaseBeingEdited = isEditing && editingTablePhase?.table === type && editingTablePhase?.phase === phase;

//                                 return (
//                                     <View 
//                                         key={phase} 
//                                         style={[dynamicPhaseStyle, phaseBorder]}
//                                     >

//                                         {/* Editable Phase Code Header Logic */}
//                                         <TouchableOpacity 
//                                             disabled={!isEditing}
//                                             onPress={() => {
//                                                 setEditingTablePhase({ table: type, phase });
//                                                 setTempNewPhaseCodeForTable(phase);
//                                             }}
//                                             style={[styles.phaseHeaderContainer, { height: 31, backgroundColor: THEME.tableHeaderBg }]}
//                                         >
//                                             <Text style={styles.phaseHeaderCellText}>{phase}</Text>
//                                         </TouchableOpacity>
// {/* Phase Edit Overlay for Tables */}
// {isCurrentPhaseBeingEdited && (
//     <View style={styles.phaseDropdownContainer}>

//         {/* Scrollable List */}
//         <ScrollView
//             style={styles.phaseDropdownList}
//             showsVerticalScrollIndicator={true}
//         >
//             {fullJobPhaseCodes.map((p) => (
//                 <TouchableOpacity
//                     key={p}
//                     style={styles.phaseDropdownItem}
//                     onPress={() => {
//                         setTempNewPhaseCodeForTable(p);
//                         handlePhaseCodeRename(editingTablePhase!.phase, p);
//                     }}
//                 >
//                     <Text style={styles.phaseDropdownItemText}>{p}</Text>
//                 </TouchableOpacity>
//             ))}
//         </ScrollView>

//         {/* Close */}
//         <TouchableOpacity
//             style={styles.phaseDropdownClose}
//             onPress={() => setEditingTablePhase(null)}
//         >
//             <Text style={{ color: "#FFF", fontWeight: "bold" }}>✕</Text>
//         </TouchableOpacity>
//     </View>
// )}

//                                         {/* End Editable Phase Code Header Logic */}


//                                         {isEquipment ? (
//                                             <View style={styles.equipmentPhaseSubHeader}>
//                                                 <Text style={[styles.headerCell, styles.colHoursEquipment, styles.equipmentSubHeaderCell, styles.borderRight, styles.headerCellBottomBorder]}>REG</Text>
//                                                 <Text style={[styles.headerCell, styles.colHoursEquipment, styles.equipmentSubHeaderCell, styles.lastCell, styles.headerCellBottomBorder]}>S.B</Text>
//                                             </View>
//                                         ) : (
//                                             <>
//                                                 <Text 
//                     style={[
//                         styles.headerCell,
//                         isEmployee ? { flex: 1 } : styles.colHoursSimple,
//                         styles.lastCell,  // ← Single cell spans full phase width
//                         styles.headerCellBottomBorder
//                     ]}
//                 >
//                     {isEmployee ? 'Hours' : 
//                      type === 'material' ? 'Hours/Qty' : 
//                      type === 'dumping_site' ? 'Quantity' : 'Hours'}
//                 </Text>

                                               
//                                             </>
//                                         )}
//                                     </View>
//                                 );
//                             })}

//                             <Text style={[styles.headerCell, styles.colTotal, styles.lastCell, styles.borderLeft, styles.headerCellBottomBorder]}>Total</Text>
//                         </View>
//                         {/* -------------------- TABLE HEADER END -------------------- */}



//                         {/* -------------------- TABLE BODY START (DYNAMIC) -------------------- */}
//                         {isEmployee ? (
//                             renderEmployeeTableBody()
//                         ) : (
//                             entities.map((entity, index) => {
//                                 let entityId;
//                                 if (type === 'material') {
//                                     entityId = entity.name || entity.id || entity.key || entity.vendor_id;
//                                 } else {
//                                     entityId = entity.id || entity.name || entity.key || entity.vendor_id;
//                                 }

//                                 const entityName = entity.first_name
//                                     ? `${entity.first_name} ${entity.middle_name || ''} ${entity.last_name}`.trim()
//                                     : entity.name;

//                                 const totalHours = isEquipment 
//                                     ? calculateTotalComplexHours(hoursState as ComplexHourState, entityId)
//                                     : calculateTotalSimpleHours(hoursState as SimpleHourState, entityId);
// // const apiTickets = getTicketsFromEntity(entity);
// // const currentTickets =
// //     ticketsState?.[entityId]?.total?.toString() ?? apiTickets;
// const apiTickets = getTicketsFromEntity(entity);

// const currentTickets =
//     ticketsLoadsState?.[entityId] ??
//     apiTickets?.toString() ??
//     "0";

//                                 return (
//                                     <View key={entityId} style={[styles.tableRow, index % 2 === 1 && styles.tableRowAlternate]}>
//                                         <Text style={[styles.dataCell, styles.colName, styles.borderRight]} numberOfLines={2}>
//                                             {entityName}
//                                         </Text>

//                                         {isEquipment && (
//                                             <Text style={[styles.dataCell, styles.colId, styles.borderRight]}>{entityId}</Text>
//                                         )}
//                                         {isEmployee && (
//                                             <Text style={[styles.dataCell, styles.colId, styles.borderRight]}>{entityId}</Text>
//                                         )}

//                                         {isEquipment && (
//                                             <>
//                                                 <Text style={[styles.dataCell, styles.colStartStop, styles.borderRight]}>
//                                                     {entity.start_hours || ''} 
//                                                 </Text>
//                                                 <Text style={[styles.dataCell, styles.colStartStop, styles.borderRight]}>
//                                                     {entity.stop_hours || ''}
//                                                 </Text>
//                                             </>
//                                         )}
// {/* SINGLE TICKETS COLUMN */}

// {/* {isSimple && (
//     <View style={[styles.dataCell, styles.colTickets, styles.borderRight]}>
//     {renderTicketCellContent(
//         currentTickets,
//         (text) => {
//             const setter = getSimpleStateSetter('tickets');
//             updateSimpleState(setter, entityId, 'total', text);
//         }
//     )}
// </View>
// )} */}

// {isSimple && (
//   <View style={[styles.dataCell, styles.colTickets, styles.borderRight]}>
//     {renderTicketCellContent(
//       currentTickets, // string
//       (text) => {
//         setTicketsLoadsState(prev => ({
//           ...prev,
//           [entityId]: text,   // store per-entity tickets, no phase key
//         }));
//       }
//     )}
//   </View>
// )}


//                                         {/* Dynamic Phase Columns */}
//                                         {phaseCodes.map((phase, phaseIndex) => {
//                                             const isLastPhase = phaseIndex === phaseCodes.length - 1;
//                                             const phaseBorder = isLastPhase ? {} : styles.phaseGroupBorderRight;

//                                             return (
//                                                 <View key={phase} style={[
//                                                     isEquipment ? styles.dynamicPhaseColEquipment : styles.dynamicPhaseColSimple,
//                                                     phaseBorder,
//                                                 ]}>
//                                                     {isEquipment ? (
//                                                         // Equipment: REG and S.B.
//                                                         <>
//                                                             <View style={[styles.dataCell, styles.colHoursEquipment, styles.borderRight]}>
//                                                                 {renderCellContent(
//                                                                     ((hoursState as ComplexHourState)[entityId]?.[phase]?.REG ?? '0').toString(),
//                                                                     (text) => updateEquipmentState(entityId, phase, 'REG', text)
//                                                                 )}
//                                                             </View>
//                                                             <View style={[styles.dataCell, styles.colHoursEquipment, styles.lastCell]}>
//                                                                 {renderCellContent(
//                                                                     ((hoursState as ComplexHourState)[entityId]?.[phase]?.['S.B'] ?? '0').toString(),
//                                                                     (text) => updateEquipmentState(entityId, phase, 'S.B', text)
//                                                                 )}
//                                                             </View>
//                                                         </>
//                                                     ) : (
//                                                         // Simple Logic (Material/Vendor/Dumping)
//                                                         <View style={[styles.dataCell, styles.colHoursSimple, styles.lastCell]}>
//                     {renderCellContent(
//                         ((hoursState as SimpleHourState)[entityId]?.[phase] ?? '0').toString(),
//                         (text) => updateSimpleState(simpleHoursSetter, entityId, phase, text)
//                     )}
//                 </View>
//                                                     )}
//                                                 </View>
//                                             )
//                                         })}

//                                         <Text style={[styles.dataCell, styles.colTotal, styles.lastCell, styles.borderLeft]}>{totalHours.toFixed(1)}</Text>
//                                     </View>
//                                 );
//                             })
//                         )}
//                         {/* -------------------- TABLE BODY END -------------------- */}


//                         {/* -------------------- PHASE TOTALS ROW (DYNAMIC) -------------------- */}
//                         <View style={[styles.tableRow, styles.phaseTotalRow]}>
//                             <Text style={[styles.dataCell, styles.colName, styles.phaseTotalText]}>Phase Total</Text>

//                             {(isEmployee || isEquipment) && (
//                                 <View style={[styles.dataCell, styles.colId]} /> 
//                             )}

//                             {isEquipment && (
//                                 <>
//                                     <View style={[styles.dataCell, styles.colStartStop]} /> 
//                                     <View style={[styles.dataCell, styles.colStartStop]} /> 
//                                 </>
//                             )}

//                             {isEmployee && (
//                                 <View style={[styles.dataCell, styles.colClassCode]} /> 
//                             )}
//                               {isSimple && (
//                                 <View style={[styles.dataCell, styles.colTickets]} />
//                             )}
//                             {phaseCodes.map((phase, phaseIndex) => {
//                                 const isLastPhase = phaseIndex === phaseCodes.length - 1;
//                                 // const phaseBorder = isLastPhase ? {} : styles.phaseGroupBorderRight;
//                                  const isEmployeeSecondPhase = isEmployee && phaseIndex === 1; 
//                                 const phaseBorder =
//         isEmployeeSecondPhase
//             ? styles.phaseGroupBorderRight      // border after 2nd phase
//             : isLastPhase
//                 ? {}                             // no extra border on last
//                 : styles.phaseGroupBorderRight;
//                                 const dynamicPhaseStyle = isEquipment 
//                                     ? styles.dynamicPhaseColEquipment 
//                                     : isEmployee 
//                                         ? styles.dynamicPhaseColEmployee 
//                                         : styles.dynamicPhaseColSimple;

//                                 return (
//                                     <View 
//                                         key={phase} 
//                                         style={[dynamicPhaseStyle, phaseBorder]}
//                                     >
//                                         {isEmployee ? (
//                                             <View style={styles.phaseTotalSubRow}>
//                                                 <Text style={[styles.dataCell, { flex: 1 }, styles.phaseTotalText, styles.lastCell]}>
//                                                     {(employeePhaseTotals[phase] || 0).toFixed(1)}
//                                                 </Text>
//                                             </View>
//                                         ) : isEquipment ? (
//                                             <View style={styles.phaseTotalSubRow}>
//                                                 <Text style={[styles.dataCell, styles.colHoursEquipment, styles.phaseTotalText, styles.borderRight]}>
//                                                     {(equipmentPhaseTotals[phase]?.REG || 0).toFixed(1)}
//                                                 </Text>
//                                                 <Text style={[styles.dataCell, styles.colHoursEquipment, styles.phaseTotalText,styles.lastCell]}>
//                                                     {(equipmentPhaseTotals[phase]?.['S.B'] || 0).toFixed(1)}
//                                                 </Text>
//                                             </View>
//                                         ) : isSimple ? (
//                                             <View style={styles.phaseTotalSubRow}>
//                                                 <Text style={[styles.dataCell, styles.colHoursSimple, styles.phaseTotalText, styles.borderRight]}>
//                                                     {(simplePhaseTotals[phase] || 0).toFixed(1)}
//                                                 </Text>
                                               
//                                             </View>
//                                         ) : null}
//                                     </View>
//                                 );
//                             })}

                            
//                         </View>
//                         {/* -------------------- PHASE TOTALS ROW END -------------------- */}


//                     </View>
//                 </ScrollView>
//             </View>
//         );
//     };


//     if (loading) return <ActivityIndicator size="large" style={styles.centered} />;
//     if (!timesheet) return <View style={styles.centered}><Text>Timesheet not found.</Text></View>;


//     const { data, date } = timesheet;

//     // --- START: FIX for TS2345 (Argument is not assignable to parameter of type 'any[]') ---
//     // Ensure all optional array properties are defaulted to an empty array for use in renderTableBlock
//     const formattedEmployees = data.employees || [];
//     const formattedEquipment = data.equipment || [];
//     const formattedMaterials = data.materials_trucking || [];
//     const formattedVendors = data.vendors || [];
//     const formattedDumpingSites = data.dumping_sites || [];
//     // --- END: FIX for TS2345 ---

// const count = overEmployees.length;
// const label = count === 1 ? "employee" : "employees";

//     return (
//         <SafeAreaView style={styles.safeArea}>
//             <ScrollView contentContainerStyle={{ padding: THEME.SPACING, paddingBottom: 50 }}>

//                 {/* Header Container for Info and Action Buttons (UNCHANGED) */}
//                 <View style={styles.headerContainer}>
//                     {/* Info Card (UNCHANGED) */}
//                     <View style={styles.infoCard}>
//                         {/* data.job_name is now available on ExtendedTimesheetData */}
//                         <Text style={styles.jobTitle}>{data.job_name}</Text>
//                         <Text style={styles.jobCode}>Job Code: {data.job.job_code}</Text>
//                         <View style={styles.infoGrid}>
//                             <View style={styles.infoItem}><Text style={styles.infoLabel}>Date</Text><Text style={styles.infoValue}>{new Date(date).toLocaleDateString()}</Text></View>
//                             <View style={styles.infoItem}><Text style={styles.infoLabel}>Foreman</Text><Text style={styles.infoValue}>{foremanName}</Text></View>
                            
//                             {/* Supervisor Field, which uses the directly accessed supervisorName */}
//                             <View style={styles.infoItem}><Text style={styles.infoLabel}>Supervisor</Text><Text style={styles.infoValue}>{supervisorName}</Text></View>
                            
//                             <View style={styles.infoItem}><Text style={styles.infoLabel}>Project Engineer</Text><Text style={styles.infoValue}>{data.project_engineer || 'N/A'}</Text></View>
//                             <View style={styles.infoItem}><Text style={styles.infoLabel}>Day/Night</Text><Text style={styles.infoValue}>{data.time_of_day || 'N/A'}</Text></View>
//                             <View style={styles.infoItem}><Text style={styles.infoLabel}>Location</Text><Text style={styles.infoValue}>{data.location || 'N/A'}</Text></View>
//                             <View style={styles.infoItem}><Text style={styles.infoLabel}>Weather</Text><Text style={styles.infoValue}>{data.weather || 'N/A'}</Text></View>
//                             <View style={styles.infoItemFull}><Text style={styles.infoLabel}>Temperature</Text><Text style={styles.infoValue}>{data.temperature || 'N/A'}</Text></View>
//                         </View>
//                     </View>

//                     {/* Action Buttons (UNCHANGED) */}
//                     <View style={styles.actionButtonsContainer}>
//                         {isEditing ? (
//                             <>
//                                 <TouchableOpacity 
//                                     style={[styles.actionButton, styles.cancelButton]} 
//                                     onPress={handleCancelPress}
//                                     disabled={loading}
//                                 >
//                                     <Text style={styles.actionButtonText}>Cancel</Text>
//                                 </TouchableOpacity>
//                                 <TouchableOpacity 
//                                     style={[styles.actionButton, styles.saveButton]} 
//                                     onPress={handleSavePress}
//                                     disabled={loading}
//                                 >
//                                     <Text style={styles.actionButtonText}>Save</Text>
//                                 </TouchableOpacity>
//                             </>
//                         ) : (
//                             <TouchableOpacity 
//                                 style={[styles.actionButton, styles.editButton]} 
//                                 onPress={handleEditPress}
//                                 disabled={loading}
//                             >
//                                 <Text style={styles.actionButtonText}>Edit</Text>
//                             </TouchableOpacity>
//                         )}
//                     </View>
//                 </View>

// {overEmployees.length > 0 && (
//   <TouchableOpacity
//     activeOpacity={0.9}
//     onPress={() => setShowWarnings(!showWarnings)}
//     style={{
//       backgroundColor: "#FFF7EB",
//       paddingVertical: 14,
//       paddingHorizontal: 16,
//       borderRadius: 10,
//       marginVertical: 16,
//       borderWidth: 1,
//       borderColor: "#F7C77D",
//       shadowColor: "#000",
//       shadowOpacity: 0.05,
//       shadowRadius: 4,
//       shadowOffset: { width: 0, height: 2 },
//     }}
//   >
//     {/* Header Row */}
//     <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center" }}>
//       <Text style={{ fontSize: 17, fontWeight: "700", color: "#B45309" }}>
//          ⚠ {count} {label} have more than 9 hours
//       </Text>

//       <Text style={{ fontSize: 16, color: "#B45309", fontWeight: "600" }}>
//         {showWarnings ? "▴ Hide" : "▾ Expand"}
//       </Text>
//     </View>

//     {/* Expanded List */}
//     {showWarnings && (
//       <View
//         style={{
//           marginTop: 12,
//           paddingLeft: 6,
//           borderTopWidth: 1,
//           borderTopColor: "#F5D7A4",
//           paddingTop: 10,
//         }}
//       >
//         {overEmployees.map((name, idx) => (
//           <View key={idx} style={{ flexDirection: "row", alignItems: "center", marginVertical: 4 }}>
//             <Text style={{ color: "#B45309", fontSize: 15 }}>• {name}</Text>
//           </View>
//         ))}
//       </View>
//     )}
//   </TouchableOpacity>
// )}



//                 {/* Data Tables - Using formatted variables */}
//                 <View>
//                     {/* Using formattedEmployees to pass an array to renderTableBlock */}
//                     {renderTableBlock('Employees', formattedEmployees, employeeHours, undefined, 'employee', undefined)}
                    
//                     {/* Using formattedEquipment to pass an array to renderTableBlock */}
//                     {renderTableBlock('Equipment', formattedEquipment, equipmentHours, undefined, 'equipment', undefined)}
                    
//                     {renderTableBlock('Materials and Trucking', formattedMaterials, materialHours, materialTickets, 'material', materialUnits)}
//                     {renderTableBlock('Vendors', formattedVendors, vendorHours, vendorTickets, 'vendor', vendorUnits)}
//                     {renderTableBlock('Dumping Sites', formattedDumpingSites, dumpingSiteHours, dumpingSiteTickets, 'dumping_site', undefined)}
//                 </View>

//                 {/* Total Quantity (Phase Code and Quantity Editable) */}
//                 {Object.keys(totalQuantities).length > 0 && (
//                     <View style={styles.card}>
//                         <Text style={styles.tableTitle}>Total Quantities</Text>
//                         {Object.entries(totalQuantities).map(([phase, quantity]) => {
//                             const isCurrentPhaseBeingEdited = editingQuantityPhase === phase;

//                             return (
//                                 <View key={phase} style={styles.quantityRowContainer}>
//                                     <View style={styles.quantityRow}>
//                                         <Text style={styles.quantityLabel}>
//                                             Quantity for
//                                         </Text>

//                                         {/* Phase Code Editable Text/Dropdown Mock */}
//                                         {isEditing ? (
//                                             <View style={styles.phaseEditContainer}>
//                                                 <TouchableOpacity 
//                                                     onPress={() => {
//                                                         setEditingQuantityPhase(phase);
//                                                         setTempNewPhaseCode(phase);
//                                                     }}
//                                                     style={styles.phaseEditButton}
//                                                 >
//                                                     <Text style={styles.phaseEditButtonText}>{phase}</Text>
//                                                 </TouchableOpacity>

//                                                 {/* Phase Code Selection Modal Mock */}
//                                                 {isCurrentPhaseBeingEdited && (
//                                                     <View style={styles.phaseEditOverlay}>
//                                                         <ScrollView style={{ maxHeight: 180, width: 220 }}>
//                                                             {fullJobPhaseCodes.map((p) => (
//                                                                 <TouchableOpacity
//                                                                     key={p}
//                                                                     style={{ paddingVertical: 8, paddingHorizontal: 6 }}
//                                                                     onPress={() => {
//                                                                         setTempNewPhaseCode(p);
//                                                                         handlePhaseCodeChangeForQuantity(phase, p);
//                                                                     }}
//                                                                 >
//                                                                     <Text style={{ fontSize: 14, fontWeight: '600', color: THEME.text }}>
//                                                                         {p}
//                                                                     </Text>
//                                                                 </TouchableOpacity>
//                                                             ))}
//                                                         </ScrollView>

//                                                         <TouchableOpacity style={styles.phaseEditCancel} onPress={() => setEditingQuantityPhase(null)}>
//                                                             <Text style={{color: THEME.card, fontWeight: 'bold'}}>✕</Text>
//                                                         </TouchableOpacity>
//                                                     </View>
//                                                 )}
//                                             </View>
//                                         ) : (
//                                             <Text style={styles.quantityPhaseDisplay}>{phase}</Text>
//                                         )}
//                                     </View>

//                                     {/* Quantity Value Editable */}
//                                     <View style={styles.totalBox}>
//                                         {isEditing ? (
//                                             <TextInput
//                                                 style={styles.totalInput}
//                                                 keyboardType="numeric"
//                                                 value={quantity}
//                                                 onChangeText={(text) => updateTotalQuantity(phase, text)}
//                                             />
//                                         ) : (
//                                             <Text style={styles.totalText}>{quantity}</Text>
//                                         )}
//                                     </View>
//                                 </View>
//                             );
//                         })}
//                     </View>
//                 )}


//                 {/* Notes (Editable) */}
//                 <View style={styles.card}>
//                     <Text style={styles.tableTitle}>Notes</Text>
//                     {isEditing ? (
//                         <TextInput
//                             style={styles.notesInput}
//                             multiline
//                             placeholder="Add notes..."
//                             placeholderTextColor={THEME.textSecondary}
//                             value={notes}
//                             onChangeText={setNotes}
//                         />
//                     ) : (
//                         <Text style={styles.notesText}>{notes || 'No notes provided.'}</Text>
//                     )}
//                 </View>
//             </ScrollView>
//         </SafeAreaView>
//     );
// };


// // --- Styles (Combined and Adjusted) ---
// const styles = StyleSheet.create({

//   safeArea: {
//     flex: 1,
//     backgroundColor: THEME.background,
//     width: '100%',
//   },

//   centered: { flex: 1, justifyContent: 'center', alignItems: 'center' },

//     // Header/Action Buttons
//     headerContainer: { marginBottom: THEME.SPACING },
//     actionButtonsContainer: { flexDirection: 'row', justifyContent: 'flex-end', marginTop: THEME.SPACING / 2 },
//     actionButton: { paddingHorizontal: 15, paddingVertical: 8, borderRadius: 8, marginLeft: 10 },
//     editButton: { backgroundColor: THEME.primary },
//     saveButton: { backgroundColor: THEME.primary },
//     cancelButton: { backgroundColor: THEME.danger },
//     actionButtonText: { color: THEME.card, fontWeight: '600', fontSize: 16 },

//   infoCard: {
//     padding: THEME.SPACING,
//     backgroundColor: THEME.card,
//     borderRadius: 14,
//     marginBottom: THEME.SPACING,
//     shadowColor: '#000',
//     shadowOffset: { width: 0, height: 2 },
//     shadowOpacity: 0.05,
//     shadowRadius: 4,
//     elevation: 3,
//   },

//   jobTitle: { fontSize: 24, fontWeight: 'bold', color: THEME.text },
//   jobCode: { fontSize: 16, color: THEME.textSecondary, marginTop: 4 },

//   infoGrid: {
//     marginTop: THEME.SPACING,
//     flexDirection: 'row',
//     flexWrap: 'wrap',
//     justifyContent: 'space-between',
//   },

//   infoItem: { width: '48%', marginBottom: 12 },
//   infoItemFull: { width: '100%', marginBottom: 12 },

//   infoLabel: { fontSize: 14, color: THEME.textSecondary, marginBottom: 2 },
//   infoValue: { fontSize: 16, fontWeight: '500', color: THEME.text },

//   card: {
//     backgroundColor: THEME.card,
//     borderRadius: 14,
//     padding: THEME.SPACING,
//     marginBottom: THEME.SPACING,
//     shadowColor: '#000',
//     shadowOffset: { width: 0, height: 1 },
//     shadowOpacity: 0.05,
//     shadowRadius: 4,
//     elevation: 2,
//   },

//   tableTitle: { fontSize: 20, fontWeight: 'bold', color: THEME.text, marginBottom: 12 },

//   tableContainer: {
//     borderWidth: 1,
//     borderColor: THEME.border,
//     borderRadius: 8,
//     overflow: 'visible', // IMPORTANT: Changed from 'hidden' to 'visible' to allow popover to render outside
//     position: 'relative', // Added position relative
//   },

//   // FIXED COLUMN WIDTH STYLES
//   colName: { 
//     width: COL_NAME, 
//     textAlign: 'left', 
//     paddingLeft: 8,   
//   },
//   colId: { width: COL_ID }, 
//   colClassCode: { width: COL_CLASS },
//   colHoursSimple: { width: COL_SIMPLE_HOUR }, 
//   colHoursEquipment: { width: COL_EQUIP },
//   colTickets: { width: COL_TICKET },
//   colTotal: { width: COL_TOTAL },
//   colStartStop: { width: COL_START_STOP }, 

//   dynamicPhaseColEmployee: { 
//     flexDirection: 'row',
//     alignItems: 'stretch',
//     width: COL_EMPLOYEE_HOUR, 
//   },

//   dynamicPhaseColSimple: {
//     flexDirection: 'row',
//     alignItems: 'stretch',
//     width: COL_SIMPLE_HOUR, 
//   },

//   dynamicPhaseColEquipment: {
//     flexDirection: 'row',
//     alignItems: 'stretch',
//     width: COL_EQUIP * 2, 
//   },

//   phaseGroupBorderRight: {
//       borderRightWidth: 1,
//       borderRightColor: THEME.border,
//   },

//   tableRow: {
//     flexDirection: 'row',
//     alignItems: 'stretch', 
//     borderTopWidth: 1,
//     borderTopColor: THEME.border,
//   },

//   tableRowAlternate: { backgroundColor: THEME.rowAlternateBg },

//   borderRight: { borderRightWidth: 1, borderRightColor: THEME.border },
//   borderLeft: { borderLeftWidth: 1, borderLeftColor: THEME.border }, 
//   lastCell: { borderRightWidth: 0 },

//   dataCell: {
//     paddingVertical: 8,
//     paddingHorizontal: 4,
//     color: THEME.text,
//     fontSize: 12,
//     textAlign: 'center',
//     borderRightColor: THEME.border,
//     minHeight: 40,
//     justifyContent: 'center',
//     alignItems: 'center',
//   },

//   tableHeader: {
//     flexDirection: 'row',
//     backgroundColor: THEME.tableHeaderBg,
//     minHeight: 55, 
//     position: 'relative', // Ensure absolute children are positioned relative to this
//     zIndex: 2, // Keep headers above table rows
//   },

//   headerCellBottomBorder: {
//       borderBottomWidth: 1,
//       borderBottomColor: THEME.border,
//   },

//   headerCell: {
//     paddingVertical: 10,
//     fontWeight: '700',
//     color: THEME.text,
//     fontSize: 10,
//     textAlign: 'center',
//     borderRightWidth: 1,
//     borderRightColor: THEME.border,
//     paddingTop: 31, 
//     minHeight: 55,
//     borderBottomWidth: 0, 
//   },

//   // NEW STYLES FOR EDITABLE PHASE HEADER
//   phaseHeaderContainer: {
//     position: 'absolute',
//     top: 0,
//     left: 0,
//     width: '100%',
//     right: 0,
//     zIndex: 1,
//     borderBottomWidth: 1,
//     borderBottomColor: THEME.border,
//     justifyContent: 'center',
//     alignItems: 'center',
//   },

//   phaseHeaderCellText: {
//     // Removed absolute positioning logic and put it on the container
//     width: '100%',
//     paddingVertical: 4,
//     fontWeight: '700',
//     color: THEME.text,
//     fontSize: 12, 
//     textAlign: 'center',
//   },

//   equipmentPhaseSubHeader: {
//     flexDirection: 'row',
//     flex: 1,
//     marginTop: 31, 
//     minHeight: 24,
//   },

//   equipmentSubHeaderCell: {
//     flex: 1,
//     borderTopWidth: 0,
//     paddingVertical: 5, 
//   },

//   transparentCell: {
//     color: 'transparent',
//     backgroundColor: 'transparent',
//   },

//   phaseTotalRow: {
//     backgroundColor: THEME.tableHeaderBg,
//     borderTopWidth: 2,
//     borderTopColor: THEME.textSecondary,
//   },

//   phaseTotalText: {
//     fontWeight: 'bold',
//     fontSize: 12,
//     color: THEME.text,
//     paddingVertical: 10,
//   },

//   phaseTotalSubRow: {
//     flexDirection: 'row',
//     alignItems: 'center',
//     flex: 1,
//   },

//     // --- NEW/MODIFIED Total Quantity Styles START ---
//     quantityRowContainer: {
//         paddingVertical: 4,
//         borderBottomWidth: 1,
//         borderBottomColor: THEME.tableHeaderBg,
//         flexDirection: 'row',
//         justifyContent: 'space-between',
//         alignItems: 'center',
//         paddingHorizontal: 5,
//     },
    
//     quantityRow: { 
//         flexDirection: 'row',
//         alignItems: 'center',
//         flex: 1,
//     },

//     quantityLabel: { 
//         fontSize: 16, 
//         color: THEME.text, 
//         fontWeight: '500', 
//         minWidth: 120, 
//     },

//     quantityPhaseDisplay: { // New style for non-editing phase
//         fontSize: 16, 
//         fontWeight: 'bold', 
//         color: THEME.primary, 
//         marginLeft: 4,
//         marginRight: 10,
//     },

//     totalBox: { 
//         paddingHorizontal: 12,
//         paddingVertical: 6,
//         backgroundColor: THEME.background, 
//         borderRadius: 6,
//         minWidth: 80,
//         alignItems: 'center',
//         marginLeft: 'auto', 
//         borderWidth: 1,
//         borderColor: THEME.border,
//     },

//     totalText: { 
//         fontSize: 16, 
//         fontWeight: 'bold', 
//         color: THEME.text,
//     },
//     // --- Total Quantity Styles END ---

//   notesText: {
//     fontSize: 15,
//     color: THEME.text,
//     lineHeight: 22,
//     marginTop: 5,
//   },

//     // EDITING SPECIFIC STYLES
//     editableInput: {
//         paddingVertical: 2, 
//         paddingHorizontal: 5,
//         // REMOVED BORDER AND BACKGROUND to eliminate the "small box" appearance
//         borderWidth: 0, 
//         borderColor: 'transparent',
//         borderRadius: 4,
//         backgroundColor: 'transparent', 
//         // -------------------------------------------------------------------
//         color: THEME.text,
//         textAlign: 'center',
//         minHeight: 30,
//         fontSize: 12,
//     },
//     totalInput: {
//         flex: 1, 
//         color: THEME.text, 
//         fontWeight: 'bold', 
//         fontSize: 16, 
//         textAlign: 'center',
//         paddingVertical: 0,
//         paddingHorizontal: 5,
//         minHeight: 24, // Adjusted
//     },
//     notesInput: {
//         borderWidth: 1,
//         borderColor: THEME.border,
//         borderRadius: 8,
//         padding: 10,
//         minHeight: 100,
//         fontSize: 15,
//         color: THEME.text,
//         backgroundColor: THEME.rowAlternateBg,
//         lineHeight: 22,
//         textAlignVertical: 'top',
//     },

//     // Total Quantity Phase Edit Styles 
//     phaseEditContainer: {
//         flexDirection: 'row',
//         alignItems: 'center',
//         position: 'relative',
//         zIndex: 5,
//     },
//     phaseEditButton: {
//         paddingHorizontal: 10,
//         paddingVertical: 4,
//         borderRadius: 4,
//         backgroundColor: '#E0E0E5',
//         marginLeft: 4,
//     },
//     phaseEditButtonText: {
//         fontSize: 16,
//         fontWeight: 'bold',
//         color: THEME.primary,
//     },
//     phaseEditOverlay: {
//         position: 'absolute',
//         top: -10,
//         left: -180,
//         backgroundColor: THEME.card,
//         borderRadius: 8,
//         padding: 8,
//         flexDirection: 'row',
//         alignItems: 'center',
//         borderWidth: 1,
//         borderColor: THEME.primary,
//         shadowColor: '#000',
//         shadowOffset: { width: 0, height: 4 },
//         shadowOpacity: 0.1,
//         shadowRadius: 5,
//         elevation: 8,
//         minWidth: 250,
//         zIndex: 10,
//     },

//     // NEW style for Table Phase Edit Overlay positioning
//     tablePhaseEditOverlay: {
//         position: 'absolute',
//         top: 31 + 5, 
//         left: -5,
//         right: -5,
//         minWidth: 150,
//         zIndex: 10,
//         // Resetting inherited styles for table context
//         backgroundColor: THEME.card,
//         flexDirection: 'row',
//         alignItems: 'center',
//         padding: 4, 
//     },

//     phaseEditInput: {
//         flex: 1,
//         borderWidth: 1,
//         borderColor: THEME.border,
//         borderRadius: 4,
//         padding: 8,
//         marginRight: 8,
//         fontSize: 14,
//         fontWeight: '600',
//         textTransform: 'uppercase',
//     },
//     phaseEditSave: {
//         backgroundColor: THEME.primary,
//         padding: 8,
//         borderRadius: 4,
//         marginRight: 4,
//     },
//     phaseEditCancel: {
//         backgroundColor: THEME.danger,
//         padding: 8,
//         borderRadius: 4,
//     },
//     phaseDropdownContainer: {
//     position: "absolute",
//     top: 36,
//     left: -10,
//     backgroundColor: "#FFF",
//     borderRadius: 10,
//     padding: 6,
//     width: 160,
//     maxHeight: 240,
//     borderWidth: 1,
//     borderColor: "#DDD",
//     shadowColor: "#000",
//     shadowOpacity: 0.15,
//     shadowRadius: 6,
//     shadowOffset: { width: 0, height: 2 },
//     elevation: 6,
//     zIndex: 9999,
// },

// phaseDropdownList: {
//     maxHeight: 200,
//     paddingHorizontal: 4,
// },

// phaseDropdownItem: {
//     paddingVertical: 10,
//     paddingHorizontal: 12,
//     borderRadius: 6,
// },

// phaseDropdownItemText: {
//     fontSize: 15,
//     fontWeight: "600",
//     color: "#333",
// },

// phaseDropdownClose: {
//     marginTop: 6,
//     alignSelf: "center",
//     backgroundColor: "#FF4D4D",
//     paddingVertical: 6,
//     paddingHorizontal: 10,
//     borderRadius: 6,
// },

// });
// export default PETimesheetReviewScreen;
import React, { useEffect, useState, useCallback } from 'react';
import {
    View,
    Text,
    StyleSheet,
    ScrollView,
    ActivityIndicator,
    SafeAreaView,
    TouchableOpacity,
    Alert,
    TextInput,
    Dimensions,
} from 'react-native';
import { RouteProp, useRoute } from '@react-navigation/native';
import apiClient from '../../api/apiClient';
import type { SupervisorStackParamList } from '../../navigation/AppNavigator';
import type { Timesheet } from '../../types';
// --- Type Definitions ---
import Ionicons from 'react-native-vector-icons/Ionicons';
import Feather from "react-native-vector-icons/Feather";
import Pdf from 'react-native-pdf';
import { Image, Modal, Platform } from 'react-native';
import API_URL from "../../config";

const API_BASE_URL = API_URL;
type SimpleHourState = Record<string, Record<string, string>>;
// EmployeeHourState is complex: { empId: { phaseCode: { classCode: '5' } } }
type EmployeeHourState = Record<string, Record<string, Record<string, string>>>;
type ComplexHourSubState = { REG?: string; 'S.B'?: string };
// ComplexHourState is for Equipment: { equipmentId: { phaseCode: { REG: '5', 'S.B': '1' } } }
type ComplexHourState = Record<string, Record<string, ComplexHourSubState>>;
type QuantityState = Record<string, string>;
type UnitState = Record<string, string | null>;
type ReviewRouteProp = RouteProp<SupervisorStackParamList, 'TimesheetReview'>;
type TableCategory =
  | "employee"
  | "equipment"
  | "material"
  | "vendor"
  | "dumping_site";

type EditingTablePhase = { table: TableCategory; phase: string } | null;

interface Supervisor {
    id: number;
    name: string;
}
interface ExtendedTimesheetData {
    supervisor?: Supervisor;
    notes?: string;
    weather?: string;
    time_of_day?: string;
    temperature?: string;
    project_engineer?: string;
    linked_tickets?: Record<string, number[]>; // 👈 Add this line
    location?: string;
    job_name?: string; // <--- ADDED: Fixes Property 'job_name' does not exist error
    job: {
        job_code: string;
        phase_codes?: any[];
    };
    employees?: any[];
    equipment?: any[];
    materials_trucking?: any[];
    vendors?: any[];
    dumping_sites?: any[];
    total_quantities?: Record<string, string | number>;
    selected_material_items?: Record<string, any>;
    selected_vendor_materials?: Record<string, any>;
    selected_dumping_materials?: Record<string, any>;
}

type ExtendedTimesheet = Omit<Timesheet, 'data'> & {
    data: ExtendedTimesheetData;
};
// --- Theme Constants ---
const THEME = {
    primary: '#007AFF',
    background: '#F0F0F7',
    card: '#FFFFFF',
    text: '#1C1C1E',
    textSecondary: '#6A6A6A',
    border: '#999999',
    tableHeaderBg: '#F8F8F8',
    rowAlternateBg: '#FCFCFC',
    SPACING: 16,
    danger: '#FF3B30',
};

// --- FIXED WIDTHS (Copied from ForemanTimesheetViewScreen.tsx) ---
const COL_NAME = 160;
const COL_ID = 70;
const COL_CLASS = 80;
const COL_EMPLOYEE_HOUR = 90;
const COL_SIMPLE_HOUR = 110;
const COL_EQUIP = 110;
const COL_TICKET = 110;
const COL_TOTAL = 100;

const COL_UNIT = 80; // <--- ADDED: New constant for unit/material column
const COL_MATERIAL_NAME = 120; // <--- ADDED: New constant for Material Name column
const COL_LINK = 60; // Define width for the link column
// --- NEW HELPER FUNCTION TO GET UNIQUE KEY FOR VENDOR LINE ITEMS ---
const getVendorUniqueKey = (entity: any): string => {
    // If it's a vendor line item from the 'vendors' array, the unique identifier is the combination.
    if (entity.vendor_id && entity.material_id) {
        return `${entity.vendor_id}_${entity.material_id}`;
    }
    // Fallback to existing logic if it's somehow not a line item
    return entity.id || entity.name || entity.key || String(entity.vendor_id || '');
};

const getPhaseGroupWidth = (type: TableCategory): number => {
  if (type === "equipment") return COL_EQUIP * 2;
  if (type === "employee") return COL_EMPLOYEE_HOUR;
  return COL_SIMPLE_HOUR;
};
const PETimesheetReviewScreen = () => {
    const route = useRoute<ReviewRouteProp>();
    const { timesheetId } = route.params;

    // USE THE EXTENDED TYPE HERE
    const [timesheet, setTimesheet] = useState<ExtendedTimesheet | null>(null); 
    const [foremanName, setForemanName] = useState<string>('');
    const [supervisorName, setSupervisorName] = useState<string>(''); 
    const [loading, setLoading] = useState(true);
    const [isEditing, setIsEditing] = useState(false);

    // State to temporarily hold the phase code being edited in the Total Quantity block
    const [editingQuantityPhase, setEditingQuantityPhase] = useState<string | null>(null);
    const [tempNewPhaseCode, setTempNewPhaseCode] = useState('');

    // --- NEW STATES FOR TABLE PHASE EDITING ---
    const [editingTablePhase, setEditingTablePhase] = useState<EditingTablePhase>(null);
    const [tempNewPhaseCodeForTable, setTempNewPhaseCodeForTable] = useState('');
    const [fullJobPhaseCodes, setFullJobPhaseCodes] = useState<string[]>([]);
    // States to hold processed data for display
    const [employeeHours, setEmployeeHours] = useState<EmployeeHourState>({});
    const [equipmentHours, setEquipmentHours] = useState<ComplexHourState>({});
    const [materialHours, setMaterialHours] = useState<SimpleHourState>({});
    const [vendorHours, setVendorHours] = useState<SimpleHourState>({});
    const [materialTickets, setMaterialTickets] = useState<SimpleHourState>({});
    const [vendorTickets, setVendorTickets] = useState<SimpleHourState>({});
    const [totalQuantities, setTotalQuantities] = useState<QuantityState>({});
    const [notes, setNotes] = useState<string>('');
    const [materialUnits, setMaterialUnits] = useState<UnitState>({});
    const [vendorUnits, setVendorUnits] = useState<UnitState>({});
    // NEW STATE: For Material Name associated with a Vendor
    const [vendorMaterialNames, setVendorMaterialNames] = useState<UnitState>({}); 
    const [dumpingSiteHours, setDumpingSiteHours] = useState<SimpleHourState>({});
    const [dumpingSiteTickets, setDumpingSiteTickets] = useState<SimpleHourState>({});
const [approvedByName, setApprovedByName] = useState<string>('Not yet submitted');    // 🔹 2) Approved By (who actually submitted, from supervisor_submissions)

    // Total list of phase codes for validation (original list from job)
    const allJobPhaseCodes = timesheet?.data.job.phase_codes?.map((p: any) => (p?.code ?? p)) || [];
const [overEmployees, setOverEmployees] = useState<string[]>([]);
const [showWarnings, setShowWarnings] = useState(false);
const [hoursState, setHoursState] = useState<SimpleHourState>({});
const [ticketsState, setTicketsState] = useState<SimpleHourState>({});
const [availableScannedTickets, setAvailableScannedTickets] = useState<any[]>([]);
    const [selectedTicketIds, setSelectedTicketIds] = useState<{ [rowId: string]: number[] }>({});
    const [selectedTicket, setSelectedTicket] = useState<any | null>(null);
    const [isPdfFullScreen, setIsPdfFullScreen] = useState(false);
const [ticketsLoadsState, setTicketsLoadsState] =
    useState<Record<string, string>>({});
const getImageUri = (ticket: any): string | null => {
        if (!ticket) return null;
        const path = ticket.image_path || ticket.image_url || ticket.file_url;
        if (!path) return null;
        if (path.startsWith("http")) return path;
        return `${API_BASE_URL}${path.startsWith('/') ? path : '/' + path}`;
    };
    // --- Helper function to clean numeric input and strip leading zeros (New) ---
    const cleanNumericInput = (value: string): string => {
        // Remove all non-numeric and non-dot characters
        let numericText = value.replace(/[^0-9.]/g, '');

        if (numericText === '') return '';

        // Strip leading zeros unless it's just '0' or '0.' or '0.something'
        if (numericText.length > 1 && numericText.startsWith('0') && !numericText.startsWith('0.')) {
            numericText = numericText.replace(/^0+/, '');
        }

        // Ensure that if it results in just '.' it's converted to '0.' or empty
        if (numericText === '.') return '0.'; 

        // If it starts with a dot, prefix with zero
        if (numericText.startsWith('.')) return `0${numericText}`;

        return numericText;
    };

// Round numeric input to nearest quarter hour (0.25 increments)
const validateQuarterHour = (input: string) => {
    if (!input) return "";
    let num = parseFloat(input);
    if (isNaN(num)) return "";

    const rounded = Math.round(num * 4) / 4;
    return rounded.toFixed(2);
};

// --- Helper function to get the display name for any entity type ---
const getEntityDisplayName = (entity: any, type: TableCategory): string => {
    const entityId = entity.id || entity.key || entity.vendor_id;

    if (type === 'employee') {
        const firstName = (entity.first_name ?? '').trim();
        const middleName = (entity.middle_name ?? '').trim();
        const lastName = (entity.last_name ?? '').trim();
        const fullName = `${firstName} ${middleName} ${lastName}`.trim();
        return fullName || `EMP: ${entityId}`;
    }
    
    // For simple entities (material, vendor, dumping_site), and equipment
    // Prioritize specific fields for vendors
    if (type === 'vendor') {
        return entity.vendor_name // CRITICAL: Use vendor_name from the line item
            || entity.name 
            || entity.description 
            || `ID: ${getVendorUniqueKey(entity)}` // Fallback to unique key
            || `Unknown Vendor`;
    }

    // Generic fallbacks for other types
    return entity.name 
           || entity.description
           || `ID: ${entityId}`
           || `Unknown ${type.toUpperCase()}`;
};
// -------------------------------------------------------------------

    const fetchData = useCallback(async () => {
        setLoading(true);
 try {
        const response = await apiClient.get<ExtendedTimesheet>(`/api/timesheets/${timesheetId}`);
        const tsData = response.data;
        setTimesheet(tsData);

        // --- NEW: Fetch linked ticket metadata for the viewer ---
        try {
            const ticketsRes = await apiClient.get(`/api/tickets/${timesheetId}/scanned-tickets`);
            setAvailableScannedTickets(ticketsRes.data || []);
        } catch (e) {
            console.warn("Failed to fetch tickets", e);
        }

        // --- NEW: Restore links from timesheet data JSON ---
        if (tsData.data?.linked_tickets) {
            setSelectedTicketIds(tsData.data.linked_tickets);
        }

        // Fetch all phase codes for this job_code
        try {
            const jobCode = tsData.data.job.job_code;
            const resp = await apiClient.get(`/api/job-phases/${jobCode}/phase-codes-list`);
            setFullJobPhaseCodes(resp.data.map((p: any) => p.code));
        } catch (e) {
            console.error("Failed to fetch full phase codes list", e);
        }
            // Populate simple fields from tsData.data (JSONB)
            setNotes(tsData.data.notes || '');


            // --- Data Population Logic (Keys adjusted for Material/Vendor/DumpingSite) ---
           const populateSimple = (
    entities: any[] = [],
    field: 'hours_per_phase' | 'tickets_per_phase',
    type?: TableCategory
): SimpleHourState => {
    const state: SimpleHourState = {};

    entities.forEach((e) => {
        let id;

        if (type === 'material') {
            // FIX: Always use the true ID
            id = String(e.id);
        } 
        else if (type === 'vendor') {
            // Vendors must use vendor_id + material_id combined
            id = getVendorUniqueKey(e);
        } 
        else {
            // Dumping sites, equipment, normal ID behavior
            id = String(e.id);
        }

        state[id] = {};

        const data = e[field] || {};

        Object.entries(data).forEach(([phase, val]) => {
            state[id][phase] = String(val || '0');
        });
    });

    return state;
};

// Units for materials (from materials_trucking line items)
const populateMaterialUnits = (materials: any[] = []): UnitState => {
  const state: UnitState = {};
  materials.forEach(e => {
    const id = String(e.id);  // "123"
    const unit =
      e.unit ||                         // from materials_trucking
      e.selectedMaterials?.[0]?.unit || // if metadata style
      null;
    state[id] = unit;
  });
  return state;
};

// Units for vendors (use unique key vendor_id_material_id)
const populateVendorUnits = (entities: any[] = []): UnitState => {
  const state: UnitState = {};
  entities.forEach(e => {
    const id = getVendorUniqueKey(e);   // "91_2"
    const unit = e.unit || null;        // from vendors array
    state[id] = unit;
  });
  return state;
};

// Material name for vendors, also keyed by vendor_id_material_id
const populateVendorMaterialNames = (entities: any[] = []): UnitState => {
  const state: UnitState = {};
  entities.forEach(e => {
    const id = getVendorUniqueKey(e);
    const materialName = e.material_name || null;
    state[id] = materialName;
  });
  return state;
};

// ...




            const populateEmployeeComplex = (entities: any[] = []): EmployeeHourState => {
                const state: EmployeeHourState = {};
                entities.forEach((e) => {
                    state[e.id] = {};
                    if (e.hours_per_phase) {
                        Object.entries(e.hours_per_phase).forEach(([phase, phaseHours]) => {
                            state[e.id][phase] = {};
                            if (phaseHours && typeof phaseHours === 'object') {
                                Object.entries(phaseHours).forEach(([classCode, val]) => {
                                    state[e.id][phase][classCode] = String(val || '0');
                                });
                            } else {
                                // Fallback for simple structure (if API sends hours_per_phase as {phase: 8})
                                if (e.class_1) state[e.id][phase][e.class_1] = String(phaseHours || '0');
                            }
                        });
                    }
                });
                return state;
            };


            const populateEquipmentComplex = (entities: any[] = []): ComplexHourState => {
                const state: ComplexHourState = {};
                entities.forEach((e) => {
                    state[e.id] = {};
                    if (e.hours_per_phase) {
                        for (const phase in e.hours_per_phase) {
                            const v = e.hours_per_phase[phase];
                            if (v && typeof v === 'object') {
                                state[e.id][phase] = {
                                    REG: v.REG?.toString() || '0',
                                    'S.B': (v['S_B'] || v['S.B'])?.toString() || '0', 
                                };
                            } else {
                                const num = parseFloat((v ?? '0').toString());
                                state[e.id][phase] = { REG: !isNaN(num) ? num.toString() : '0', 'S.B': '0' };
                            }
                        }
                    }
                });
                return state;
            };
         
const formattedMaterials = tsData.data.materials_trucking || [];
const formattedVendors = tsData.data.vendors || [];
const formattedDumpingSites = tsData.data.dumping_sites || [];

setEmployeeHours(populateEmployeeComplex(tsData.data.employees));
setEquipmentHours(populateEquipmentComplex(tsData.data.equipment));
setMaterialHours(populateSimple(formattedMaterials, 'hours_per_phase', 'material'));
setVendorHours(populateSimple(formattedVendors, 'hours_per_phase', 'vendor'));
setMaterialTickets(populateSimple(formattedMaterials, 'tickets_per_phase', 'material'));
setVendorTickets(populateSimple(formattedVendors, 'tickets_per_phase', 'vendor'));

setMaterialUnits(populateMaterialUnits(formattedMaterials));      // <- from materials_trucking
setVendorUnits(populateVendorUnits(formattedVendors));            // <- from vendors
setVendorMaterialNames(populateVendorMaterialNames(formattedVendors));

setDumpingSiteHours(populateSimple(formattedDumpingSites, 'hours_per_phase', 'dumping_site'));
setDumpingSiteTickets(populateSimple(formattedDumpingSites, 'tickets_per_phase', 'dumping_site'));
            if (tsData.data.total_quantities) {
                const q: QuantityState = {};
                for (const phase in tsData.data.total_quantities) {
                    q[phase] = tsData.data.total_quantities[phase].toString();
                }
                setTotalQuantities(q);
            }
            // Fetch Foreman Name (Existing Logic)
            const userRes = await apiClient.get(`/api/users/${tsData.foreman_id}`);
            setForemanName(`${userRes.data.first_name} ${userRes.data.last_name}`.trim());
            const supervisorData = tsData.data.supervisor;
            if (supervisorData && supervisorData.name) {
                 setSupervisorName(supervisorData.name.trim());
            } else {
               
                setSupervisorName('N/A');
            }
                // 🔹 2) Approved By (who actually submitted, from supervisor_submissions)
    try {
      const subRes = await apiClient.get(`/api/review/supervisor_submissions/by-date`, {
        params: { date: tsData.date },
      });

      if (subRes.data && subRes.data.supervisor_id) {
        const supRes = await apiClient.get(`/api/users/${subRes.data.supervisor_id}`);
        const sup = supRes.data;
        setApprovedByName(`${sup.first_name} ${sup.last_name}`.trim());
      } else {
        setApprovedByName('Not yet submitted');
      }
    } catch (err) {
      console.warn('Supervisor submission fetch failed', err);
      setApprovedByName('Not found');
    }
        } catch (error) {
            console.error('Failed to load timesheet:', error);
            Alert.alert('Error', 'Failed to load timesheet data.');
        } finally {
            setLoading(false);
        }
    }, [timesheetId]);

    useEffect(() => {
        fetchData();
    }, [fetchData]);

useEffect(() => {
  const over: string[] = [];

  Object.keys(employeeHours).forEach(empKey => {
    const total = calculateTotalEmployeeHours(employeeHours, empKey);
    if (total > 9) {
      const emp = timesheet?.data?.employees?.find(
        e => String(e.id) === empKey
      );

      if (emp) {
        const first = (emp.first_name ?? '').trim();
        const last = (emp.last_name ?? '').trim();
        const name = `${first} ${last}`.trim();
        over.push(name || `EMP ${empKey}`);
      } else {
        over.push(`EMP ${empKey}`);
      }
    }
  });

  setOverEmployees(over);
}, [employeeHours, timesheet]);
    const getAllActivePhaseCodes = useCallback((): string[] => {
        const uniquePhases = new Set<string>(); 
        Object.values(employeeHours).forEach(phases => {
            Object.keys(phases).forEach(p => uniquePhases.add(p));
        });
        Object.values(equipmentHours).forEach(phases => {
            Object.keys(phases).forEach(p => uniquePhases.add(p));
        });
        [materialHours, vendorHours, dumpingSiteHours, materialTickets, vendorTickets, dumpingSiteTickets].forEach(state => {
            Object.values(state).forEach(phases => {
                Object.keys(phases).forEach(p => uniquePhases.add(p));
            });
        });
        Object.keys(totalQuantities).forEach(p => uniquePhases.add(p));

        const activePhases = Array.from(uniquePhases);

        // --- NEW LOGIC FOR ORDERING ---
        const allJobPhaseCodesSet = new Set(allJobPhaseCodes);
        const activePhasesSet = new Set(activePhases);
        
        // 1. Separate phases into two groups: those from the original list and the new/renamed ones.
        const originalPhasesInUse = activePhases.filter(p => allJobPhaseCodesSet.has(p));
        const newPhases = activePhases.filter(p => !allJobPhaseCodesSet.has(p));
        
        // Sort new phases alphabetically to maintain a predictable order among them
        newPhases.sort((a, b) => a.localeCompare(b));

        const orderedPhases: string[] = [];
        let newPhaseIndex = 0; // Pointer for the next 'new' phase to use

        // 2. Iterate over the static original phase list to build the order
        allJobPhaseCodes.forEach(originalPhase => {
            if (activePhasesSet.has(originalPhase)) {
                // Case 1: Original phase is still active and has data. Use it.
                orderedPhases.push(originalPhase);
            } else {
                
                if (newPhaseIndex < newPhases.length) {
                    orderedPhases.push(newPhases[newPhaseIndex]);
                    newPhaseIndex++; // Consume the 'new' phase
                } else {
                    // If no replacement is found, it was likely deleted or has no data, so we skip this position.
                }
            }
        });

        // 3. Append any remaining new phases (if they don't map to any original one, i.e., they are truly new)
        const remainingNewPhases = newPhases.slice(newPhaseIndex);

        // The remainingNewPhases are already sorted alphabetically.
        return orderedPhases.concat(remainingNewPhases);

    }, [allJobPhaseCodes, employeeHours, equipmentHours, materialHours, vendorHours, dumpingSiteHours, materialTickets, vendorTickets, dumpingSiteTickets, totalQuantities]);

    const allActivePhaseCodes = getAllActivePhaseCodes(); // This will be used for rendering columns

    // --- State Update Handlers (Updated to use cleanNumericInput) ---

    const updateSimpleState = (
        setState: React.Dispatch<React.SetStateAction<SimpleHourState>>, 
        entityId: string,
        phase: string,
        newValue: string
    ) => {
        const cleanedValue = cleanNumericInput(newValue);
        
        setState(prev => ({
            ...prev,
            [entityId]: {
                ...prev[entityId],
                [phase]: cleanedValue,
            },
        }));
    };
const updateEmployeeState = (
  entityId: string,
  phase: string,
  classCode: string,
  newValue: string
) => {
  const cleanedValue = cleanNumericInput(newValue);

  setEmployeeHours(prev => {
    // 1️⃣ Build updated state first
    const updated: EmployeeHourState = {
      ...prev,
      [entityId]: {
        ...(prev[entityId] || {}),
        [phase]: {
          ...((prev[entityId] || {})[phase] || {}),
          [classCode]: cleanedValue,
        },
      },
    };

    // 2️⃣ Calculate total hours for this employee across ALL phases
    let total = 0;
    const employeePhases = updated[entityId] || {};
    Object.values(employeePhases).forEach((classHours: Record<string, string>) => {
      Object.values(classHours).forEach((val: string) => {
        const num = parseFloat(val || '0');
        if (!isNaN(num)) total += num;
      });
    });
if (total > 24) {
  // Get employee name from timesheet
  const emp = timesheet?.data?.employees?.find(e => String(e.id) === entityId);
  const employeeName = emp
    ? `${(emp.first_name ?? '').trim()} ${(emp.last_name ?? '').trim()}`.trim() || `EMP ${entityId}`
    : `EMP ${entityId}`;

  Alert.alert(
    '⚠️ TOTAL HOURS EXCEEDED ⚠️', // Uppercase + emojis for urgency
    `🚫 Employee: ${employeeName}\n⏱ Total: ${total.toFixed(1)} hours\n\nCannot exceed 24 hours!`,
    [
      {
        text: 'Dismiss',
        onPress: () => console.log('Alert dismissed'),
        style: 'destructive', // red-style button
      },
    ],
    { cancelable: false }
  );
  return prev; // Revert - don't apply the change
}

    // 4️⃣ Valid - accept the change
    return updated;
  });
};


    const updateEquipmentState = (
        entityId: string,
        phase: string,
        type: 'REG' | 'S.B',
        newValue: string
    ) => {
        const cleanedValue = cleanNumericInput(newValue);
        setEquipmentHours(prev => ({
            ...prev,
            [entityId]: {
                ...prev[entityId],
                [phase]: {
                    ...prev[entityId]?.[phase],
                    [type]: cleanedValue,
                },
            },
        }));
    };

    const updateTotalQuantity = (
        phase: string,
        newValue: string
    ) => {
        const cleanedValue = cleanNumericInput(newValue);
        setTotalQuantities(prev => ({
            ...prev,
            [phase]: cleanedValue,
        }));
    };

    // --- Phase Code Renaming Handler (Generalized for Tables and Total Quantities) ---

    const renamePhaseKeyInSimpleState = (
        state: SimpleHourState,
        oldPhase: string,
        newPhase: string
    ): SimpleHourState => {
        const newState: SimpleHourState = {};
        // Iterate over entities (rows)
        Object.entries(state).forEach(([entityId, phases]) => {
            const newPhases: Record<string, string> = {};
            let changed = false;
            // Iterate over phases (columns) for this entity
            Object.entries(phases).forEach(([phase, value]) => {
                if (phase === oldPhase) {
                    newPhases[newPhase] = value;
                    changed = true;
                } else {
                    newPhases[phase] = value;
                }
            });
            newState[entityId] = newPhases;
        });
        return newState;
    };
const handleViewLinkedTicket = (rowId: string) => {
    const linkedIds = selectedTicketIds[rowId];
    if (!linkedIds || linkedIds.length === 0) return;

    // Find the first matching ticket object to display in the viewer
    const ticket = availableScannedTickets.find(t => linkedIds.includes(t.id || t.ID));
    if (ticket) {
        setSelectedTicket(ticket);
        setIsPdfFullScreen(true);
    } else {
        Alert.alert("Error", "Ticket file not found.");
    }
};
    const handlePhaseCodeRename = (oldPhase: string, newPhase: string, isFromQuantityBlock: boolean = false) => {
        const cleanedNewPhase = newPhase.trim().toUpperCase();

        if (oldPhase === cleanedNewPhase) {
            if (isFromQuantityBlock) setEditingQuantityPhase(null);
            else setEditingTablePhase(null);
            return;
        }

        if (cleanedNewPhase === '') {
            Alert.alert('Invalid Phase', 'Phase code cannot be empty.');
            return;
        }

        // Check for conflict: renaming 'A' to 'B' when 'B' already exists
        const allCurrentPhases = allActivePhaseCodes;
        if (allCurrentPhases.includes(cleanedNewPhase) && cleanedNewPhase !== oldPhase) {
             Alert.alert('Conflict', `Phase ${cleanedNewPhase} already exists. Please merge the data manually by editing the numbers before renaming.`);
             return;
        }

        // 1. Employee Hours (Complex Structure)
        setEmployeeHours(prev => {
            const newState: EmployeeHourState = {};
            Object.entries(prev).forEach(([entityId, phases]) => {
                const newPhases: Record<string, Record<string, string>> = {};
                Object.entries(phases).forEach(([phase, classHours]) => {
                    if (phase === oldPhase) {
                        newPhases[cleanedNewPhase] = classHours;
                    } else {
                        newPhases[phase] = classHours;
                    }
                });
                newState[entityId] = newPhases;
            });
            return newState;
        });
        

        // 2. Equipment Hours (Complex Hour Sub State)
        setEquipmentHours(prev => {
            const newState: ComplexHourState = {};
            Object.entries(prev).forEach(([entityId, phases]) => {
                const newPhases: Record<string, ComplexHourSubState> = {};
                Object.entries(phases).forEach(([phase, hourTypes]) => {
                    if (phase === oldPhase) {
                        newPhases[cleanedNewPhase] = hourTypes;
                    } else {
                        newPhases[phase] = hourTypes;
                    }
                });
                newState[entityId] = newPhases;
            });
            return newState;
        });

        // 3. Simple Hours/Tickets
        setMaterialHours(prev => renamePhaseKeyInSimpleState(prev, oldPhase, cleanedNewPhase));
        setVendorHours(prev => renamePhaseKeyInSimpleState(prev, oldPhase, cleanedNewPhase));
        setDumpingSiteHours(prev => renamePhaseKeyInSimpleState(prev, oldPhase, cleanedNewPhase));
        setMaterialTickets(prev => renamePhaseKeyInSimpleState(prev, oldPhase, cleanedNewPhase));
        setVendorTickets(prev => renamePhaseKeyInSimpleState(prev, oldPhase, cleanedNewPhase));
        setDumpingSiteTickets(prev => renamePhaseKeyInSimpleState(prev, oldPhase, cleanedNewPhase));

        // 4. Total Quantities
        setTotalQuantities(prev => {
            if (!prev[oldPhase]) return prev; 

            const newQuantities = { ...prev };
            const value = newQuantities[oldPhase];
            // CRITICAL: Delete the old phase key from the map
            delete newQuantities[oldPhase]; 
            newQuantities[cleanedNewPhase] = value;
            return newQuantities;
        });

        // Cleanup editing states
        if (isFromQuantityBlock) {
            setEditingQuantityPhase(null);
            setTempNewPhaseCode('');
        } else {
            setEditingTablePhase(null);
            setTempNewPhaseCodeForTable('');
        }
    };

    // Refactored old Total Quantity handler to use the new generalized one
    const handlePhaseCodeChangeForQuantity = (oldPhase: string, newPhase: string) => {
        handlePhaseCodeRename(oldPhase, newPhase, true);
    };


    // --- Edit/Save/Cancel Handlers ---

    const handleEditPress = () => {
        setIsEditing(true);
    };

    const handleCancelPress = () => {
        setIsEditing(false);
        setEditingQuantityPhase(null);
        setTempNewPhaseCode('');
        setEditingTablePhase(null); // Clear new table state
        setTempNewPhaseCodeForTable(''); // Clear new table state
        fetchData(); 
    };

    const handleSavePress = async () => {
        setLoading(true);
        // Ensure any pending phase code edit is cancelled before saving
        setEditingQuantityPhase(null); 
        setTempNewPhaseCode('');
        setEditingTablePhase(null); // Clear new table state
        setTempNewPhaseCodeForTable(''); // Clear new table state


        try {
            // CRITICAL FIX: Reformat state to match the API's expected array structure
            const employeesPayload = rebuildEmployeeData();
            const equipmentPayload = rebuildEquipmentData();
            const materialsPayload = rebuildSimpleEntityData(timesheet?.data.materials_trucking || [], materialHours, materialTickets, 'material');
            const vendorsPayload = rebuildSimpleEntityData(timesheet?.data.vendors || [], vendorHours, vendorTickets, 'vendor');
            const dumpingSitesPayload = rebuildSimpleEntityData(timesheet?.data.dumping_sites || [], dumpingSiteHours, dumpingSiteTickets, 'dumping_site');


            const payload = {
                notes: notes,
                // Sending the rebuilt arrays instead of the flat state maps
                employees: employeesPayload, 
                equipment: equipmentPayload,
                materials_trucking: materialsPayload,
                vendors: vendorsPayload,
                dumping_sites: dumpingSitesPayload,

                // Filter and convert total quantities to number/string as appropriate
                total_quantities: Object.entries(totalQuantities)
                    .reduce((acc, [phase, quantity]) => {
                        const q = parseFloat(quantity);
                        if (!isNaN(q) && q > 0) {
                            // Ensure the quantity is a string representation of a number
                            acc[phase] = quantity; 
                        }
                        return acc;
                    }, {} as QuantityState),
            };

            // NOTE: The backend API endpoint is assumed to be `/api/timesheets/${timesheetId}/review` based on prior context.
            await apiClient.patch(`/api/timesheets/${timesheetId}/review`, payload);

            Alert.alert('Success', 'Timesheet saved successfully.');
            setIsEditing(false);
            await fetchData(); 
        } catch (error: unknown) {
            console.error('Failed to save timesheet:', error);

            let errorMessage = 'Check your network and ensure the data format is correct.';

            const err = error as { response?: { data?: { message?: string } } };
            errorMessage = err.response?.data?.message || errorMessage;

            Alert.alert('Error', `Failed to save timesheet data: ${errorMessage}`);
        } finally {

            setLoading(false);
        }
    };


    // --- CRITICAL FIX: Data Reformatting Functions (New) ---

    // 1. Rebuild Employee Data
    const rebuildEmployeeData = () => {
        if (!timesheet || !timesheet.data.employees) return [];
        return timesheet.data.employees.map(employee => {
            const updatedEmployee = { ...employee };
            const hoursData = employeeHours[employee.id];

            if (hoursData) {
                // Convert all hours back to numbers for API if expected
                const hoursPerPhase: Record<string, Record<string, number>> = {};
                Object.entries(hoursData).forEach(([phase, classHours]) => {
                    const newClassHours: Record<string, number> = {};
                    Object.entries(classHours).forEach(([classCode, value]) => {
                        const num = parseFloat(value) || 0;
                        if (num > 0) {
                            newClassHours[classCode] = num;
                        }
                    });
                    if (Object.keys(newClassHours).length > 0) {
                        hoursPerPhase[phase] = newClassHours;
                    }
                });
                updatedEmployee.hours_per_phase = hoursPerPhase;
            }
            return updatedEmployee;
        });
    };

    // 2. Rebuild Equipment Data
    const rebuildEquipmentData = () => {
        if (!timesheet || !timesheet.data.equipment) return [];
        return timesheet.data.equipment.map(equipment => {
            const updatedEquipment = { ...equipment };
            const hoursData = equipmentHours[equipment.id];

            if (hoursData) {
                const hoursPerPhase: Record<string, { REG: number, S_B: number }> = {};
                Object.entries(hoursData).forEach(([phase, phaseHours]) => {
                    const reg = parseFloat(phaseHours.REG || '0') || 0;
                    const sb = parseFloat(phaseHours['S.B'] || '0') || 0;

                    if (reg > 0 || sb > 0) {
                        // API might expect 'S_B' instead of 'S.B'
                        hoursPerPhase[phase] = { REG: reg, S_B: sb };
                    }
                });
                updatedEquipment.hours_per_phase = hoursPerPhase;
            }
            return updatedEquipment;
        });
    };

    // 3. Rebuild Simple Entity Data (Materials, Vendors, Dumping Sites)
    const rebuildSimpleEntityData = (
        entities: any[],
        hoursState: SimpleHourState, 
        ticketsState: SimpleHourState, 
        type: TableCategory
    ) => {
        return entities.map(entity => {
            const updatedEntity = { ...entity };
            let entityId;

            // Determine the key used in the state maps (using unique key for vendors)
     if (type === 'material') {
    entityId = String(entity.id);   // ALWAYS use numeric ID
}
 else if (type === 'vendor') {
                entityId = getVendorUniqueKey(entity); // <--- USE THE UNIQUE KEY
            } else {
                entityId = entity.id || entity.name || entity.key || entity.vendor_id;
            }

            const hData = hoursState[entityId];
            // const tData = ticketsState[entityId]; // Logic for phase-based tickets removed

            if (hData) {
                const hoursPerPhase: Record<string, number> = {};
                Object.entries(hData).forEach(([phase, value]) => {
                    const num = parseFloat(value) || 0;
                    if (num > 0) hoursPerPhase[phase] = num;
                });
                updatedEntity.hours_per_phase = hoursPerPhase;
            } else {
                 updatedEntity.hours_per_phase = {};
            }

            // Simple tickets/loads logic
            if (ticketsLoadsState[entityId] !== undefined) {
      const num = parseFloat(ticketsLoadsState[entityId] || '0') || 0;
      // Note: Assuming API expects 'tickets_loads' to be an object/map if multiple exist, 
      // but here we are simplifying to a single value if found in state. 
      // Revert to original entity structure where possible, but use state data if edited.
      // For now, we will assume setting it back to the original entity structure works.
      updatedEntity.tickets_loads = num; 
      // The original entity had 'tickets_loads': 4. If ticketsLoadsState is used, it should override.
      // Since the frontend only supports editing a single total ticket number now, 
      // and the backend might expect a specific structure like { [some_id]: num }, 
      // we'll stick to a simpler structure if the state is tracking a single number.
      
      // Based on the user's JSON: "tickets_loads": 4 (number) is on the vendor line item.
      // Let's ensure we return the updated single number if it was edited.
      updatedEntity.tickets_loads = num; 
      delete updatedEntity.tickets_per_phase; // Ensure old format is cleared if loads are used

    } else if (entity.tickets_loads) {
        // If not in state, preserve the original value from the entity
        updatedEntity.tickets_loads = entity.tickets_loads;
    }
            return updatedEntity;
        });
    };

    // --- Calculation Functions (Unchanged) ---

    const calculateTotalSimpleHours = (hoursState: SimpleHourState, entityId: string): number => {
        const m = hoursState[entityId];
        if (!m) return 0;
        return Object.values(m).reduce((t, v) => t + (parseFloat(v) || 0), 0);
    };

    const calculateTotalEmployeeHours = (hoursState: EmployeeHourState, entityId: string): number => {
        const m = hoursState[entityId];
        if (!m) return 0;
        return Object.values(m).reduce((phaseTotal, classHours) => {
            return phaseTotal + Object.values(classHours).reduce((classTotal, hoursStr) => {
                return classTotal + (parseFloat(hoursStr) || 0);
            }, 0);
        }, 0);
    };

    const calculateTotalComplexHours = (hoursState: ComplexHourState, entityId: string): number => {
        const m = hoursState[entityId];
        if (!m) return 0;
        return Object.values(m).reduce((t, v) => {
            const reg = parseFloat(v?.REG || '0');
            const sb = parseFloat(v?.['S.B'] || '0');
            return t + (isNaN(reg) ? 0 : reg) + (isNaN(sb) ? 0 : sb);
        }, 0);
    };


    const calculateSimplePhaseTotals = (state: SimpleHourState, phaseCodes: string[]): Record<string, number> => {
        const totals: Record<string, number> = {};
        phaseCodes.forEach(p => { totals[p] = 0 });
        Object.values(state).forEach((perEntity) => {
            Object.entries(perEntity).forEach(([phase, value]) => {
                if (totals[phase] !== undefined) {
                    totals[phase] += parseFloat(value) || 0;
                }
            });
        });
        return totals;
    };

const calculateComplexPhaseTotalsCombined = (
  state: ComplexHourState,
  phaseCodes: string[]
): Record<string, number> => {
  const totals: Record<string, number> = {};
  phaseCodes.forEach(p => { totals[p] = 0; });

  Object.values(state).forEach(perEntity => {
    Object.entries(perEntity).forEach(([phase, value]) => {
      if (totals[phase] !== undefined) {
        const reg = parseFloat(value?.REG ?? "0") || 0;
        const sb  = parseFloat(value?.["S.B"] ?? "0") || 0;
        totals[phase] += reg + sb;
      }
    });
  });

  return totals;
};



    const calculateEmployeePhaseTotal = (state: EmployeeHourState, phase: string): number => {
        let total = 0;
        Object.values(state).forEach((perEntity) => {
            const phaseData = perEntity[phase];
            if (phaseData) {
                Object.values(phaseData).forEach((hoursStr) => {
                    total += parseFloat(hoursStr) || 0;
                });
            }
        });
        return total;
    };


    // --- Helper for Editable Cells (Updated for '0' hiding) ---

    const renderCellContent = (
        value: string, 
        updateFunction: (text: string) => void | undefined,
        isNumeric: boolean = true
    ) => {
        const num = parseFloat(value) || 0;
        // Display only one decimal point for hours/quantities
        const displayValue = isNumeric ? num.toFixed(1) : value; 

        if (isEditing) {
            // Show empty string instead of '0.0' or '0' when editing
            const isZeroOrNearZero = num === 0 || Math.abs(num - 0.0) < 0.001; 
            const inputValue = isZeroOrNearZero ? '' : value; 

            return (
<TextInput
    style={[styles.editableInput, { flex: 1 }]}
    keyboardType="numeric"
    value={inputValue}
    onChangeText={updateFunction}
    onBlur={() => {
        const rounded = validateQuarterHour(inputValue);
        updateFunction(rounded);
    }}
/>

            );
        }
        // return <Text style={{ flex: 1, textAlign: 'center' }}>{displayValue}</Text>;
    return (
        <View style={styles.innerSubCell}>
            <Text style={styles.cellText}>{displayValue}</Text>
        </View>
    );
    };

    const renderTicketCellContent = (
        value: string, 
        updateFunction: (text: string) => void | undefined
    ) => {
        const num = parseInt(value) || 0;
        const displayValue = num.toString();

        if (isEditing) {
            // Show empty string instead of '0' when editing
            const inputValue = (num === 0) ? '' : value;
            return (
                <TextInput
                    style={[styles.editableInput, { flex: 1 }]}
                    keyboardType="number-pad"
                    value={inputValue}
                    onChangeText={updateFunction}
                />
            );
        }
        return <Text style={{ flex: 1, textAlign: 'center' }}>{displayValue}</Text>;
    };

// UPDATED: Simple way to get single tickets/loads number from entity
const getTicketsFromEntity = (entity: any) => {
    // Check if tickets_loads is a number (preferred structure)
    if (typeof entity.tickets_loads === 'number') return entity.tickets_loads.toString();

    // Check if tickets_loads is an object (old or complex structure)
    if (entity?.tickets_loads && typeof entity.tickets_loads === 'object') {
        const keys = Object.keys(entity.tickets_loads);
        if (keys.length === 1) return entity.tickets_loads[keys[0]]?.toString() ?? "0";
    }

    return "0";
};


const renderTableBlock = (
  title: string,
  entities: any[],
  hoursState: SimpleHourState | ComplexHourState | EmployeeHourState,
  ticketsState: SimpleHourState | undefined,
  type: TableCategory,
  unitState: UnitState | undefined,
  materialNameState: UnitState | undefined,
) => {
  if (!entities || entities.length === 0) return null;

  const isEmployee = type === 'employee';
  const isEquipment = type === 'equipment';
  const isMaterial = type === 'material';
  const isVendor = type === 'vendor';
  const isSimple = isMaterial || isVendor || type === 'dumping_site';

  const phaseCodes = allActivePhaseCodes.filter(
    p => p !== 'start_hours' && p !== 'stop_hours' && p !== 'total'
  );
  if (phaseCodes.length === 0) return null;

  // ---- Totals ----
  let employeePhaseTotals: Record<string, number> = {};
  let equipmentPhaseTotals: Record<string, number> = {};
  let simplePhaseTotals: Record<string, number> = {};
  let grandTotal = 0;

  if (isEmployee) {
    phaseCodes.forEach(phase => {
      employeePhaseTotals[phase] = calculateEmployeePhaseTotal(
        hoursState as EmployeeHourState,
        phase
      );
    });
    grandTotal = entities.reduce(
      (sum, e) =>
        sum + calculateTotalEmployeeHours(hoursState as EmployeeHourState, e.id),
      0
    );
  } else if (isEquipment) {
    equipmentPhaseTotals = calculateComplexPhaseTotalsCombined(
      hoursState as ComplexHourState,
      phaseCodes
    );
    grandTotal = entities.reduce(
      (sum, e) =>
        sum + calculateTotalComplexHours(hoursState as ComplexHourState, e.id),
      0
    );
  } else if (isSimple) {
    simplePhaseTotals = calculateSimplePhaseTotals(
      hoursState as SimpleHourState,
      phaseCodes
    );
    grandTotal = entities.reduce((sum, e) => {
      let entityId: string;
      if (type === 'material') {
        entityId = String(e.id);
      } else if (type === 'vendor') {
        entityId = getVendorUniqueKey(e);
      } else {
        entityId = e.id || e.name || e.key || e.vendor_id;
      }
      return sum + calculateTotalSimpleHours(hoursState as SimpleHourState, entityId);
    }, 0);
  }

  // ---- Widths ----
  const phaseGroupWidth = getPhaseGroupWidth(type);
  let fixedWidth = COL_NAME + COL_TOTAL;

  if (isEmployee) {
    fixedWidth += COL_ID + COL_CLASS;
  } else if (isEquipment) {
    fixedWidth += COL_ID;
  } else if (isSimple) {
    fixedWidth += COL_ID;
    if (isVendor) fixedWidth += COL_MATERIAL_NAME;
    fixedWidth += COL_UNIT + COL_TICKET + COL_LINK;
  }

  const contentWidth = fixedWidth + phaseGroupWidth * phaseCodes.length;

  // ---- Simple setters ----
  const getSimpleStateSetter = (
    targetType: 'hours' | 'tickets'
  ): React.Dispatch<React.SetStateAction<SimpleHourState>> => {
    if (targetType === 'hours') {
      if (type === 'material') return setMaterialHours;
      if (type === 'vendor') return setVendorHours;
      if (type === 'dumping_site') return setDumpingSiteHours;
    } else {
      if (type === 'material') return setMaterialTickets;
      if (type === 'vendor') return setVendorTickets;
      if (type === 'dumping_site') return setDumpingSiteTickets;
    }
    return (() => {}) as React.Dispatch<React.SetStateAction<SimpleHourState>>;
  };

  const simpleHoursSetter = getSimpleStateSetter('hours');
  const simpleTicketsSetter = getSimpleStateSetter('tickets');

  // ---- Employee body (unchanged math, but border‑clean) ----
  const renderEmployeeTableBody = () => {
    return entities.flatMap((entity, idxRow) => {
      const entityId = entity.id;
      const entityName = getEntityDisplayName(entity, type);
      const total = calculateTotalEmployeeHours(
        hoursState as EmployeeHourState,
        entityId
      );
      const showReason = total === 0 && entity.reason;

      const classCodesUsed: Set<string> = new Set();
      phaseCodes.forEach(phase => {
        const phaseHours = (hoursState as EmployeeHourState)[entityId]?.[phase];
        if (phaseHours) {
          Object.keys(phaseHours).forEach(code => {
            if (parseFloat(phaseHours[code] || '0') > 0) classCodesUsed.add(code);
          });
        }
      });
      if (entity.class_1) classCodesUsed.add(entity.class_1);
      if (entity.class_2) classCodesUsed.add(entity.class_2);

      const classCodesToDisplay = Array.from(classCodesUsed).sort();
      if (classCodesToDisplay.length === 0) classCodesToDisplay.push('N/A');

      return classCodesToDisplay.map((classCode, idxClass) => {
        const isFirstClassRow = idxClass === 0;

        return (
            
          <View
            key={`${entityId}_${classCode}`}
            style={[
              styles.tableRow,
              idxRow % 2 === 1 && styles.tableRowAlternate,
            ]}
          >
            {/* EMP# */}
            <View style={[styles.dataCell, styles.colId, styles.borderRight]}>
              <Text>{isFirstClassRow ? entityId : ''}</Text>
            </View>

            {/* Name */}
            <View style={[styles.dataCell, styles.colName, styles.borderRight]}>
              {isFirstClassRow ? (
                <>
                  <Text>{entityName}</Text>
                  {showReason && (
                    <Text style={{ color: THEME.danger, fontSize: 10 }}>
                      Reason: {entity.reason}
                    </Text>
                  )}
                </>
              ) : (
                <Text style={styles.transparentCell}></Text>
              )}
            </View>

            

            {/* Class Code */}
            <View style={[styles.dataCell, styles.colClassCode, styles.borderRight]}>
              <Text>{classCode === 'N/A' ? '' : classCode}</Text>
            </View>

            {/* Phase cells */}
            {phaseCodes.map((phase, phaseIndex) => {
              const value =
                classCode === 'N/A'
                  ? '0'
                  : ((hoursState as EmployeeHourState)[entityId]?.[phase]?.[classCode] ||
                      '0');
              const isLastPhase = phaseIndex === phaseCodes.length - 1;
              const phaseBorder = isLastPhase ? {} : styles.phaseGroupBorderRight;

              return (
                <View
                  key={`${entityId}_${classCode}_${phase}`}
                  style={[
                    styles.dataCell,
                    styles.dynamicPhaseColEmployee, // width only, no borderRight
                    phaseBorder,                    // single vertical border
                  ]}
                >
                  {renderCellContent(value, (text) =>
                    updateEmployeeState(entityId, phase, classCode, text)
                  )}
                </View>
              );
            })}

            {/* Total */}
<View style={[styles.dataCell, styles.colTotal, styles.borderLeft]}>
  <Text>{isFirstClassRow ? total.toFixed(1) : ''}</Text>
</View>

          </View>
        );
      });
    });
  };

  // ---- Main render ----
  return (
    <View style={styles.card}>
      <Text style={styles.tableTitle}>{title}</Text>
      <ScrollView horizontal showsHorizontalScrollIndicator={false}>
        <View style={[styles.tableContainer, { width: contentWidth }]}>
          {/* HEADER */}
<View style={[styles.tableHeader]}>
            {isSimple && (
              <Text
                style={[
                  styles.headerCell,
                  styles.colId,
                  styles.headerCellBottomBorder,
                  styles.borderRight,
                ]}
              >
                {isVendor ? 'Vendor ID' : 'ID'}
              </Text>
            )}
             {(isEmployee || isEquipment) && (
              <Text
                style={[
                  styles.headerCell,
                  styles.colId,
                  styles.headerCellBottomBorder,
                  styles.borderRight,
                ]}
              >
                {isEmployee ? 'EMP#' : 'EQUIP #ER'}
              </Text>
            )}

            <Text
              style={[
                styles.headerCell,
                styles.colName,
                styles.headerCellBottomBorder,
                styles.borderRight,
              ]}
            >
              Name
            </Text>

           

            {isEmployee && (
              <Text
                style={[
                  styles.headerCell,
                  styles.colClassCode,
                  styles.headerCellBottomBorder,
                  styles.borderRight,
                ]}
              >
                Class Code
              </Text>
            )}

            {isVendor && (
              <Text
                style={[
                  styles.headerCell,
                  { width: COL_MATERIAL_NAME },
                  styles.headerCellBottomBorder,
                  styles.borderRight,
                ]}
              >
                Material Name
              </Text>
            )}

            {isSimple && (
              <Text
                style={[
                  styles.headerCell,
                  { width: COL_UNIT },
                  styles.headerCellBottomBorder,
                  styles.borderRight,
                ]}
              >
                Unit
              </Text>
              
            )}


            {isSimple && (
              
              <Text
                style={[
                  styles.headerCell,
                  styles.colTickets,
                  styles.headerCellBottomBorder,
                  styles.borderRight,
                ]}
              >
                {type === 'dumping_site' ? '# Loads' : '# Tickets'}
              </Text>
              
            )}
            {isSimple && (
        <Text style={[styles.headerCell, { width: COL_LINK }, styles.headerCellBottomBorder, styles.borderRight]}>
            Links
        </Text>
    )}

{phaseCodes.map((phase, phaseIndex) => {
  const isLastPhase = phaseIndex === phaseCodes.length - 1;
  const phaseBorder = isLastPhase ? {} : styles.phaseGroupBorderRight;
  const dynamicPhaseStyle = isEquipment
    ? styles.dynamicPhaseColEquipment
    : isEmployee
    ? styles.dynamicPhaseColEmployee
    : styles.dynamicPhaseColSimple;

  const isCurrentPhaseBeingEdited =
    isEditing &&
    editingTablePhase?.table === type &&
    editingTablePhase?.phase === phase;

              return (
<View
  key={phase}
  style={[
    styles.dataCell,
    dynamicPhaseStyle,
    phaseBorder,
    styles.phaseHeaderCell,   // 👈 new
  ]}
>


                  {/* header label + overlay kept same as before */}
                  <TouchableOpacity
                    disabled={!isEditing}
                    onPress={() => {
                      if (!isEditing) return;
                      setEditingTablePhase({ table: type, phase });
                      setTempNewPhaseCodeForTable(phase);
                    }}
                    style={[
                      styles.phaseHeaderContainer,
                      { height: 31, backgroundColor: THEME.tableHeaderBg },
                    ]}
                  >
                    <Text style={styles.phaseHeaderCellText}>{phase}</Text>
                    {isCurrentPhaseBeingEdited && (
                      <View style={styles.phaseDropdownContainer}>
                        <ScrollView style={styles.phaseDropdownList}>
                          {fullJobPhaseCodes.map((p) => (
                            <TouchableOpacity
                              key={p}
                              style={styles.phaseDropdownItem}
                              onPress={() => {
                                setTempNewPhaseCodeForTable(p);
                                handlePhaseCodeRename(editingTablePhase!.phase, p);
                              }}
                            >
                              <Text style={styles.phaseDropdownItemText}>{p}</Text>
                            </TouchableOpacity>
                          ))}
                        </ScrollView>
                        <TouchableOpacity
                          style={styles.phaseDropdownClose}
                          onPress={() => setEditingTablePhase(null)}
                        >
                          <Text style={{ color: '#FFF', fontWeight: '700' }}>
                            Close
                          </Text>
                        </TouchableOpacity>
                      </View>
                    )}
                  </TouchableOpacity>

                  {!isEquipment && (
                    <Text style={[styles.dataCell, styles.transparentCell]}>
                      {isEmployee
                        ? 'Hours'
                        : type === 'dumping_site'
                        ? 'Quantity'
                        : 'Qty'}
                    </Text>
                  )}

{isEquipment && (
  <View style={styles.equipmentPhaseSubHeader}>
    <View style={styles.equipmentPhaseDivider} />

    <Text style={[styles.dataCell, styles.equipmentSubHeaderCell]}>
      REG
    </Text>
    <Text style={[styles.dataCell, styles.equipmentSubHeaderCell]}>
      S.B
    </Text>
  </View>
)}


                </View>
              );
            })}

<Text
  style={[
    styles.headerCell,
    styles.colTotal,
    styles.headerCellBottomBorder,
    styles.borderLeft,            // ← add this
  ]}
>
  Total
</Text>

          </View>

          {/* BODY */}
          {isEmployee ? (
            renderEmployeeTableBody()
          ) : (
            (() => {
              let sortedEntities = entities;
              let lastVendorId: string | number | null = null;

              if (isVendor) {
                sortedEntities = [...entities].sort((a, b) => {
                  const idA = a.vendor_id || '';
                  const idB = b.vendor_id || '';
                  return idA.toString().localeCompare(idB.toString());
                });
              }

              return sortedEntities.map((entity, index) => {
                let entityId: string;
                if (type === 'material') {
                  entityId = String(entity.id);
                } else if (type === 'vendor') {
                  entityId = getVendorUniqueKey(entity);
                } else {
                  entityId =
                    entity.id || entity.name || entity.key || entity.vendor_id;
                }

                let isFirstRowForVendor = true;
                if (isVendor) {
                  const currentVendorId = entity.vendor_id;
                  if (currentVendorId === lastVendorId) isFirstRowForVendor = false;
                  lastVendorId = currentVendorId;
                }

                const entityName = getEntityDisplayName(entity, type);
                const totalHours = isEquipment
                  ? calculateTotalComplexHours(hoursState as ComplexHourState, entityId)
                  : calculateTotalSimpleHours(hoursState as SimpleHourState, entityId);

                const currentTickets =
                  ticketsLoadsState?.[entityId] ?? getTicketsFromEntity(entity);

                return (
                  <View
                    key={entityId + '_' + index}
                    style={[
                      styles.tableRow,
                      index % 2 === 1 && styles.tableRowAlternate,
                    ]}
                  >
                    {/* ID */}
                    {isSimple && (
                      <View
                        style={[
                          styles.dataCell,
                          styles.colId,
                          styles.borderRight,
                        ]}
                      >
                        <Text>
                          {isVendor
                            ? isFirstRowForVendor
                              ? entity.vendor_id
                              : ''
                            : entityId}
                        </Text>
                      </View>
                    )}
                    {/* Equip ID */}
                    {isEquipment && (
                      <View
                        style={[
                          styles.dataCell,
                          styles.colId,
                          styles.borderRight,
                        ]}
                      >
                        <Text>{entityId}</Text>
                      </View>
                    )}
                    {/* Name */}
                    <View
                      style={[
                        styles.dataCell,
                        styles.colName,
                        styles.borderRight,
                      ]}
                    >
                      <Text numberOfLines={2}>
                        {isVendor
                          ? isFirstRowForVendor
                            ? entityName
                            : entity.vendor_name
                          : entityName}
                      </Text>
                    </View>

                    

                    {/* Vendor material name */}
                    {isVendor && (
                      <View
                        style={[
                          styles.dataCell,
                          { width: COL_MATERIAL_NAME },
                          styles.borderRight,
                        ]}
                      >
                        <Text numberOfLines={2}>
                          {materialNameState?.[entityId] || ''}
                        </Text>
                      </View>
                    )}

                    {/* Unit */}
                    {isSimple && (
                      <View
                        style={[
                          styles.dataCell,
                          { width: COL_UNIT },
                          styles.borderRight,
                        ]}
                      >
                        <Text>{unitState?.[entityId] || ''}</Text>
                      </View>
                    )}

                    {/* Tickets */}
                    {isSimple && (
                      <View
                        style={[
                          styles.dataCell,
                          styles.colTickets,
                          styles.borderRight,
                        ]}
                      >
                        <View style={styles.innerSubCell}>
                        {renderTicketCellContent(currentTickets, (text) => {
                          setTicketsLoadsState(prev => ({
                            ...prev,
                            [entityId]: text,
                          }));
                          updateSimpleState(simpleTicketsSetter, entityId, 'total', text);
                        })}
                      </View>
                      </View>
                    )
                    }
{isSimple && (
    <View style={[
        styles.dataCell, 
        { width: COL_LINK }, 
        styles.borderRight, // 👈 ADD THIS LINE back
        { justifyContent: 'center' }
    ]}>
        {selectedTicketIds[entityId] && selectedTicketIds[entityId].length > 0 ? (
            <TouchableOpacity onPress={() => handleViewLinkedTicket(entityId)}>
                <Feather name="paperclip" size={18} color={THEME.primary} />
            </TouchableOpacity>
        ) : (
            <Text style={{color: '#999'}}>-</Text>
        )}
    </View>
)}

      {phaseCodes.map((phase, phaseIndex) => {
  const isLastPhase = phaseIndex === phaseCodes.length - 1;
  const phaseBorder = isLastPhase ? {} : styles.phaseGroupBorderRight;

  return (
    <View
      key={`${entityId}_${phase}`}
      style={[
        styles.dataCell,
        isEquipment
          ? styles.dynamicPhaseColEquipment
          : styles.dynamicPhaseColSimple,
        phaseBorder,
      ]}
    >
      {isEquipment ? (
        // Equipment: REG | S.B side by side with vertical line between
        <View style={{ flexDirection: 'row', width: '100%' }}>
            <View style={styles.equipmentPhaseDivider} />

          <View
            style={[
              styles.dataCell,
              styles.colHoursEquipment,
            ]}
          >
            {renderCellContent(
              (
                (hoursState as ComplexHourState)[entityId]?.[phase]?.REG ??
                '0'
              ).toString(),
              (text) =>
                updateEquipmentState(entityId, phase, 'REG', text)
            )}
          </View>
          <View
            style={[
              styles.dataCell,
              styles.colHoursEquipment,
            ]}
          >
            {renderCellContent(
              (
                (hoursState as ComplexHourState)[entityId]?.[phase]?.['S.B'] ??
                '0'
              ).toString(),
              (text) =>
                updateEquipmentState(entityId, phase, 'S.B', text)
            )}
          </View>
        </View>
      ) : (
        // Simple (material/vendor/dumping): single cell
        renderCellContent(
          (
            (hoursState as SimpleHourState)[entityId]?.[phase] ??
            '0'
          ).toString(),
          (text) =>
            updateSimpleState(simpleHoursSetter, entityId, phase, text)
        )
      )}
    </View>
  );
})}

<View style={[styles.dataCell, styles.colTotal, styles.borderLeft]}>
  <Text>{totalHours.toFixed(1)}</Text>
</View>

                  </View>
                );
              });
            })()
          )}

          {/* PHASE TOTALS ROW */}
          <View style={[styles.tableRow, styles.phaseTotalRow]}>
            {isSimple && (
              <View
                style={[
                  styles.dataCell,
                  styles.colId,
                  
                  
                ]}
              />
            )}

            <View
              style={[
                styles.dataCell,
                styles.colName,
              
              ]}
            >
<Text style={[styles.phaseTotalText, { width: '100%', textAlign: 'right', paddingRight: 10 }]}>
            Phase Total
        </Text>
                    </View>

            {(isEmployee || isEquipment) && (
              <View
                style={[
                  styles.dataCell,
                  styles.colId,
                  styles.borderRight,
                ]}
              />
            )}

            {isEmployee && (
              <View
                style={[
                  styles.dataCell,
                  styles.colClassCode,
                  styles.borderRight,
                ]}
              />
            )}

            {isVendor && (
              <View
                style={[
                  styles.dataCell,
                  { width: COL_MATERIAL_NAME },
                  
                ]}
              />
            )}

            {isSimple && (
              <View
                style={[
                  styles.dataCell,
                  { width: COL_UNIT },
                 
                ]}
              />
            )}

            {isSimple && (
              <View
                style={[
                  styles.dataCell,
                  styles.colTickets,
                ]}
              />
            )}
{/* 👈 ADD THIS NEW SPACER FOR THE LINKS COLUMN */}
{isSimple && (
    <View
        style={[
            styles.dataCell,
            { width: COL_LINK },
            styles.borderRight,
        ]}
    />
)}
            {phaseCodes.map((phase) => {
              const value = isEmployee
                ? employeePhaseTotals[phase] || 0
                : isEquipment
                ? equipmentPhaseTotals[phase] ?? 0
                : simplePhaseTotals[phase] || 0;

              const dynamicPhaseStyle = isEquipment
                ? styles.dynamicPhaseColEquipment
                : isEmployee
                ? styles.dynamicPhaseColEmployee
                : styles.dynamicPhaseColSimple;

              return (
                <View
                  key={`total_${phase}`}
                  style={[
                    styles.dataCell,
                    dynamicPhaseStyle,
                    styles.phaseGroupBorderRight,
                  ]}
                >
                  <Text style={styles.phaseTotalText}>
                    {value.toFixed(1)}
                  </Text>
                </View>
              );
            })}

          </View>
        </View>
      </ScrollView>
    </View>
  );
};




    if (loading) return <ActivityIndicator size="large" style={styles.centered} />;
    if (!timesheet) return <View style={styles.centered}><Text>Timesheet not found.</Text></View>;


    const { data, date } = timesheet;

    // --- START: FIX for TS2345 (Argument is not assignable to parameter of type 'any[]') ---
    // Ensure all optional array properties are defaulted to an empty array for use in renderTableBlock
    const formattedEmployees = data.employees || [];
    const formattedEquipment = data.equipment || [];
    const formattedMaterials = data.materials_trucking || [];
    const formattedVendors = data.vendors || [];
    const formattedDumpingSites = data.dumping_sites || [];
    // --- END: FIX for TS2345 ---

const count = overEmployees.length;
const label = count === 1 ? "employee" : "employees";

    return (
        <SafeAreaView style={styles.safeArea}>
            <ScrollView contentContainerStyle={{ padding: THEME.SPACING, paddingBottom: 50 }}>

                {/* Header Container for Info and Action Buttons (UNCHANGED) */}
                <View style={styles.headerContainer}>
                    {/* Info Card (UNCHANGED) */}
                    <View style={styles.infoCard}>
                        {/* data.job_name is now available on ExtendedTimesheetData */}
                        <Text style={styles.jobTitle}>{data.job_name}</Text>
                        <Text style={styles.jobCode}>Job Code: {data.job.job_code}</Text>
                        <View style={styles.infoGrid}>
                            <View style={styles.infoItem}><Text style={styles.infoLabel}>Date</Text><Text style={styles.infoValue}>{new Date(date).toLocaleDateString()}</Text></View>
                            <View style={styles.infoItem}><Text style={styles.infoLabel}>Foreman</Text><Text style={styles.infoValue}>{foremanName}</Text></View>
                            
                            {/* Supervisor Field, which uses the directly accessed supervisorName */}
                            <View style={styles.infoItem}><Text style={styles.infoLabel}>Supervisor</Text><Text style={styles.infoValue}>{supervisorName}</Text></View>
                            <View style={styles.infoItem}><Text style={styles.infoLabel}>Approved By</Text>  <Text style={styles.infoValue}>{approvedByName}</Text></View>

                            <View style={styles.infoItem}><Text style={styles.infoLabel}>Project Engineer</Text><Text style={styles.infoValue}>{data.project_engineer || 'N/A'}</Text></View>
                            <View style={styles.infoItem}><Text style={styles.infoLabel}>Day/Night</Text><Text style={styles.infoValue}>{data.time_of_day || 'N/A'}</Text></View>
                            <View style={styles.infoItem}><Text style={styles.infoLabel}>Location</Text><Text style={styles.infoValue}>{data.location || 'N/A'}</Text></View>
                            <View style={styles.infoItem}><Text style={styles.infoLabel}>Weather</Text><Text style={styles.infoValue}>{data.weather || 'N/A'}</Text></View>
                            <View style={styles.infoItemFull}><Text style={styles.infoLabel}>Temperature</Text><Text style={styles.infoValue}>{data.temperature || 'N/A'}</Text></View>
                        </View>
                    </View>

                    {/* Action Buttons (UNCHANGED) */}
                    <View style={styles.actionButtonsContainer}>
                        {isEditing ? (
                            <>
                                <TouchableOpacity 
                                    style={[styles.actionButton, styles.cancelButton]} 
                                    onPress={handleCancelPress}
                                    disabled={loading}
                                >
                                    <Text style={styles.actionButtonText}>Cancel</Text>
                                </TouchableOpacity>
                                <TouchableOpacity 
                                    style={[styles.actionButton, styles.saveButton]} 
                                    onPress={handleSavePress}
                                    disabled={loading}
                                >
                                    <Text style={styles.actionButtonText}>Save</Text>
                                </TouchableOpacity>
                            </>
                        ) : (
                            <TouchableOpacity 
                                style={[styles.actionButton, styles.editButton]} 
                                onPress={handleEditPress}
                                disabled={loading}
                            >
                                <Text style={styles.actionButtonText}>Edit</Text>
                            </TouchableOpacity>
                        )}
                    </View>
                </View>

{overEmployees.length > 0 && (
  <TouchableOpacity
    activeOpacity={0.9}
    onPress={() => setShowWarnings(!showWarnings)}
    style={{
      backgroundColor: "#FFF7EB",
      paddingVertical: 14,
      paddingHorizontal: 16,
      borderRadius: 10,
      marginVertical: 16,
      borderWidth: 1,
      borderColor: "#F7C77D",
      shadowColor: "#000",
      shadowOpacity: 0.05,
      shadowRadius: 4,
      shadowOffset: { width: 0, height: 2 },
    }}
  >
    {/* Header Row */}
    <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center" }}>
      <Text style={{ fontSize: 17, fontWeight: "700", color: "#B45309" }}>
         ⚠ {count} {label} have more than 9 hours
      </Text>

      <Text style={{ fontSize: 16, color: "#B45309", fontWeight: "600" }}>
        {showWarnings ? "▴ Hide" : "▾ Expand"}
      </Text>
    </View>

    {/* Expanded List */}
    {showWarnings && (
      <View
        style={{
          marginTop: 12,
          paddingLeft: 6,
          borderTopWidth: 1,
          borderTopColor: "#F5D7A4",
          paddingTop: 10,
        }}
      >
        {overEmployees.map((name, idx) => (
          <View key={idx} style={{ flexDirection: "row", alignItems: "center", marginVertical: 4 }}>
            <Text style={{ color: "#B45309", fontSize: 15 }}>• {name}</Text>
          </View>
        ))}
      </View>
    )}
  </TouchableOpacity>
)}


                {/* Data Tables - Using formatted variables */}
                <View>
                    {/* Employee and Equipment calls remain the same for materialNameState (undefined) */}
                    {renderTableBlock('Employees', formattedEmployees, employeeHours, undefined, 'employee', undefined, undefined)}
                    {renderTableBlock('Equipment', formattedEquipment, equipmentHours, undefined, 'equipment', undefined, undefined)}
                    
                    {/* Material call remains the same for materialNameState (undefined) */}
                    {renderTableBlock('Materials and Trucking', formattedMaterials, materialHours, materialTickets, 'material', materialUnits, undefined)}
                    
                    {/* UPDATED: Pass vendorMaterialNames for the Vendor table */}
                    {renderTableBlock('Vendors', formattedVendors, vendorHours, vendorTickets, 'vendor', vendorUnits, vendorMaterialNames)}
                    
                    {/* Dumping Site call remains the same for materialNameState (undefined) */}
                    {renderTableBlock('Dumping Sites', formattedDumpingSites, dumpingSiteHours, dumpingSiteTickets, 'dumping_site', undefined, undefined)}
                </View>

                {/* Total Quantity (Phase Code and Quantity Editable) */}
                {Object.keys(totalQuantities).length > 0 && (
                    <View style={styles.card}>
                        <Text style={styles.tableTitle}>Total Quantities</Text>
                        {Object.entries(totalQuantities).map(([phase, quantity]) => {
                            const isCurrentPhaseBeingEdited = editingQuantityPhase === phase;

                            return (
                                <View key={phase} style={styles.quantityRowContainer}>
                                    <View style={styles.quantityRow}>
                                        <Text style={styles.quantityLabel}>
                                            Quantity for
                                        </Text>

                                        {/* Phase Code Editable Text/Dropdown Mock */}
                                        {isEditing ? (
                                            <View style={styles.phaseEditContainer}>
                                                <TouchableOpacity 
                                                    onPress={() => {
                                                        setEditingQuantityPhase(phase);
                                                        setTempNewPhaseCode(phase);
                                                    }}
                                                    style={styles.phaseEditButton}
                                                >
                                                    <Text style={styles.phaseEditButtonText}>{phase}</Text>
                                                </TouchableOpacity>

                                                {/* Phase Code Selection Modal Mock */}
                                                {isCurrentPhaseBeingEdited && (
                                                    <View style={styles.phaseEditOverlay}>
                                                        <ScrollView style={{ maxHeight: 180, width: 220 }}>
                                                            {fullJobPhaseCodes.map((p) => (
                                                                <TouchableOpacity
                                                                    key={p}
                                                                    style={{ paddingVertical: 8, paddingHorizontal: 6 }}
                                                                    onPress={() => {
                                                                        setTempNewPhaseCode(p);
                                                                        handlePhaseCodeChangeForQuantity(phase, p);
                                                                    }}
                                                                >
                                                                    <Text style={{ fontSize: 14, fontWeight: '600', color: THEME.text }}>
                                                                        {p}
                                                                    </Text>
                                                                </TouchableOpacity>
                                                            ))}
                                                        </ScrollView>

                                                        <TouchableOpacity style={styles.phaseEditCancel} onPress={() => setEditingQuantityPhase(null)}>
                                                            <Text style={{color: THEME.card, fontWeight: 'bold'}}>✕</Text>
                                                        </TouchableOpacity>
                                                    </View>
                                                )}
                                            </View>
                                        ) : (
                                            <Text style={styles.quantityPhaseDisplay}>{phase}</Text>
                                        )}
                                    </View>

                                    {/* Quantity Value Editable */}
                                    <View style={styles.totalBox}>
                                        {isEditing ? (
                                            <TextInput
                                                style={styles.totalInput}
                                                keyboardType="numeric"
                                                value={quantity}
                                                onChangeText={(text) => updateTotalQuantity(phase, text)}
                                            />
                                        ) : (
                                            <Text style={styles.totalText}>{quantity}</Text>
                                        )}
                                    </View>
                                </View>
                            );
                        })}
                    </View>
                )}


                {/* Notes (Editable) */}
                <View style={styles.card}>
                    <Text style={styles.tableTitle}>Notes</Text>
                    {isEditing ? (
                        <TextInput
                            style={styles.notesInput}
                            multiline
                            placeholder="Add notes..."
                            placeholderTextColor={THEME.textSecondary}
                            value={notes}
                            onChangeText={setNotes}
                        />
                    ) : (
                        <Text style={styles.notesText}>{notes || 'No notes provided.'}</Text>
                    )}
                </View>
                <Modal visible={isPdfFullScreen} transparent={false} animationType="slide">
    <SafeAreaView style={styles.fullScreenPdfContainer}>
        <View style={styles.fullScreenHeader}>
            <Text style={styles.fullScreenTitle}>Ticket View</Text>
            <TouchableOpacity onPress={() => setIsPdfFullScreen(false)}>
                <Text style={{color: THEME.primary, fontSize: 16, fontWeight: '600'}}>Done</Text>
            </TouchableOpacity>
        </View>
        {selectedTicket && (
            (() => {
                const uri = getImageUri(selectedTicket);
                if (!uri) return <Text style={{color: '#fff', textAlign: 'center'}}>Path Error</Text>;
                return uri.toLowerCase().endsWith('.pdf') ? (
                    <Pdf source={{ uri, cache: true }} style={{flex: 1}} trustAllCerts={false} />
                ) : (
                    <Image source={{ uri }} style={{ flex: 1, resizeMode: 'contain' }} />
                );
            })()
        )}
    </SafeAreaView>
</Modal>
            </ScrollView>
            
        </SafeAreaView>
    );
};


// --- Styles (Combined and Adjusted) ---
const styles = StyleSheet.create({

  safeArea: {
    flex: 1,
    backgroundColor: THEME.background,
    width: '100%',
  },

  centered: { flex: 1, justifyContent: 'center', alignItems: 'center' },

    // Header/Action Buttons
    headerContainer: { marginBottom: THEME.SPACING },
    actionButtonsContainer: { flexDirection: 'row', justifyContent: 'flex-end', marginTop: THEME.SPACING / 2 },
    actionButton: { paddingHorizontal: 15, paddingVertical: 8, borderRadius: 8, marginLeft: 10 },
    editButton: { backgroundColor: THEME.primary },
    saveButton: { backgroundColor: THEME.primary },
    cancelButton: { backgroundColor: THEME.danger },
    actionButtonText: { color: THEME.card, fontWeight: '600', fontSize: 16 },

  infoCard: {
    padding: THEME.SPACING,
    backgroundColor: THEME.card,
    borderRadius: 14,
    marginBottom: THEME.SPACING,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 3,
  },
fullScreenPdfContainer: {
        flex: 1,
        backgroundColor: "#000",
    },
    fullScreenHeader: {
        flexDirection: "row",
        justifyContent: "space-between",
        alignItems: "center",
        padding: 16,
        backgroundColor: '#1C1C1E',
        borderBottomWidth: 1,
        borderBottomColor: "#333",
    },
    fullScreenTitle: { // 👈 This was missing
        fontSize: 18,
        color: "#fff",
        fontWeight: "bold",
    },
    fullScreenDoneButtonText: {
        color: '#007AFF', // Or THEME.primary
        fontSize: 16,
        fontWeight: '600',
    },
    fullScreenPdf: {
        flex: 1,
        width: "100%",
    },

  jobTitle: { fontSize: 24, fontWeight: 'bold', color: THEME.text },
  jobCode: { fontSize: 16, color: THEME.textSecondary, marginTop: 4 },

  infoGrid: {
    marginTop: THEME.SPACING,
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
  },

  infoItem: { width: '48%', marginBottom: 12 },
  infoItemFull: { width: '100%', marginBottom: 12 },

  infoLabel: { fontSize: 14, color: THEME.textSecondary, marginBottom: 2 },
  infoValue: { fontSize: 16, fontWeight: '500', color: THEME.text },

  card: {
    backgroundColor: THEME.card,
    borderRadius: 14,
    padding: THEME.SPACING,
    marginBottom: THEME.SPACING,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },

  tableTitle: { fontSize: 20, fontWeight: 'bold', color: THEME.text, marginBottom: 12 },

  tableContainer: {
        borderWidth: 1,
        borderColor: THEME.border,
        backgroundColor: THEME.card,
        borderRadius: 4,
    },
innerSubCell: {
    flex: 1,
    height: 48,
    justifyContent: 'center',
    alignItems: 'center',
  },
  cellText: {
    fontSize: 12,
    color: THEME.text,
    textAlign: 'center',
  },
  // FIXED COLUMN WIDTH STYLES
  colName: { 
    width: COL_NAME, 
    textAlign: 'left', 
    paddingLeft: 8,   
  },
  colId: { width: COL_ID }, 
  colClassCode: { width: COL_CLASS },
  colHoursSimple: { width: COL_SIMPLE_HOUR }, 
  colHoursEquipment: { width: COL_EQUIP },
  colTickets: { width: COL_TICKET },
  colTotal: { width: COL_TOTAL },
  // ADDED: Unit width style is added inline in renderTableBlock

  dynamicPhaseColEmployee: { 
    flexDirection: 'row',
    alignItems: 'stretch',
    width: COL_EMPLOYEE_HOUR, 
  },

  dynamicPhaseColSimple: {
    flexDirection: 'row',
    alignItems: 'stretch',
    width: COL_SIMPLE_HOUR, 
  },

  dynamicPhaseColEquipment: {
    flexDirection: 'row',
    alignItems: 'stretch',
    width: COL_EQUIP * 2, 
  },

  phaseGroupBorderRight: {
      borderRightWidth: 1,
      borderRightColor: THEME.border,
  },

  tableRow: {
    flexDirection: 'row',
    alignItems: 'stretch', 
    borderTopWidth: 1,
    borderTopColor: THEME.border,
  },

  tableRowAlternate: { backgroundColor: THEME.rowAlternateBg },

  borderRight: { borderRightWidth: 1, borderRightColor: THEME.border },
  borderLeft: { borderLeftWidth: 1, borderLeftColor: THEME.border }, 
  lastCell: { borderRightWidth: 0 },

  dataCell: {
    paddingVertical: 8,
    paddingHorizontal: 4,
    color: THEME.text,
    fontSize: 12,
    textAlign: 'center',
    borderRightColor: THEME.border,
    minHeight: 40,
    
    justifyContent: 'center',
    alignItems: 'center',
  },

  tableHeader: {
        flexDirection: 'row',
        backgroundColor: THEME.tableHeaderBg,
        borderBottomWidth: 1,
        borderBottomColor: THEME.border,
    },

  headerCellBottomBorder: {
     
      borderBottomColor: THEME.border,
  },

  headerCell: {
    paddingVertical: 10,
    fontWeight: '700',
    color: THEME.text,
    fontSize: 10,
    textAlign: 'center',
   
    borderRightColor: THEME.border,
    paddingTop: 31, 
    minHeight: 55,
    borderBottomWidth: 0, 
  },

phaseHeaderContainer: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0, // Ensure it stretches from far left to far right
    zIndex: 1,
    borderBottomWidth: 1,
    borderBottomColor: THEME.border,
    justifyContent: 'center',
    alignItems: 'center',
    // Ensure no paddingHorizontal here
  },
phaseHeaderCellText: {
    width: '100%',
    paddingVertical: 4,
    paddingHorizontal: 8, // This keeps text away from edges without breaking the line
    fontWeight: '700',
    color: THEME.text,
    fontSize: 12, 
    textAlign: 'center',
  },

  equipmentPhaseSubHeader: {
    flexDirection: 'row',
    flex: 1,
    marginTop: 5, 
    minHeight: 25,
      width: '100%',

  },

  equipmentSubHeaderCell: {
    flex: 1,
    borderTopWidth: 0,
    paddingVertical: 9, 
      textAlign: 'center',

  },

  transparentCell: {
    color: 'transparent',
    backgroundColor: 'transparent',
  },

  phaseTotalRow: {
    backgroundColor: THEME.tableHeaderBg,
    borderTopWidth: 2,
    borderTopColor: THEME.textSecondary,
  },

  phaseTotalText: {
    fontWeight: 'bold',
    fontSize: 12,
    color: THEME.text,
    paddingVertical: 10,
  },

  phaseTotalSubRow: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },

    // --- NEW/MODIFIED Total Quantity Styles START ---
    quantityRowContainer: {
        paddingVertical: 4,
        borderBottomWidth: 1,
        borderBottomColor: THEME.tableHeaderBg,
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingHorizontal: 5,
    },
    
    quantityRow: { 
        flexDirection: 'row',
        alignItems: 'center',
        flex: 1,
    },

    quantityLabel: { 
        fontSize: 16, 
        color: THEME.text, 
        fontWeight: '500', 
        minWidth: 120, 
    },

    quantityPhaseDisplay: { // New style for non-editing phase
        fontSize: 16, 
        fontWeight: 'bold', 
        color: THEME.primary, 
        marginLeft: 4,
        marginRight: 10,
    },

    totalBox: { 
        paddingHorizontal: 12,
        paddingVertical: 6,
        backgroundColor: THEME.background, 
        borderRadius: 6,
        minWidth: 80,
        alignItems: 'center',
        marginLeft: 'auto', 
        borderWidth: 1,
        borderColor: THEME.border,
    },

    totalText: { 
        fontSize: 16, 
        fontWeight: 'bold', 
        color: THEME.text,
    },
    // --- Total Quantity Styles END ---

  notesText: {
    fontSize: 15,
    color: THEME.text,
    lineHeight: 22,
    marginTop: 5,
  },

    // EDITING SPECIFIC STYLES
   editableInput: {
       width: '100%',
    height: '100%',
    textAlign: 'center',
     paddingVertical: 0,
      marginVertical: 0,
    fontSize: 12,
    color: THEME.text,
    includeFontPadding: false, // 👈 Android specific fix
    textAlignVertical: 'center',
    },
    totalInput: {
        flex: 1, 
        color: THEME.text, 
        fontWeight: 'bold', 
        fontSize: 16, 
        textAlign: 'center',
        paddingVertical: 0,
        paddingHorizontal: 5,
        minHeight: 24, // Adjusted
    },
    notesInput: {
        borderWidth: 1,
        borderColor: THEME.border,
        borderRadius: 8,
        padding: 10,
        minHeight: 100,
        fontSize: 15,
        color: THEME.text,
        backgroundColor: THEME.rowAlternateBg,
        lineHeight: 22,
        textAlignVertical: 'top',
    },

    // Total Quantity Phase Edit Styles 
    phaseEditContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        position: 'relative',
        zIndex: 5,
    },
    phaseEditButton: {
        paddingHorizontal: 10,
        paddingVertical: 4,
        borderRadius: 4,
        backgroundColor: '#E0E0E5',
        marginLeft: 4,
    },
    phaseEditButtonText: {
        fontSize: 16,
        fontWeight: 'bold',
        color: THEME.primary,
    },
    phaseEditOverlay: {
        position: 'absolute',
        top: -10,
        left: -180,
        backgroundColor: THEME.card,
        borderRadius: 8,
        padding: 8,
        flexDirection: 'row',
        alignItems: 'center',
        borderWidth: 1,
        borderColor: THEME.primary,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.1,
        shadowRadius: 5,
        elevation: 8,
        minWidth: 250,
        zIndex: 10,
    },

    // NEW style for Table Phase Edit Overlay positioning
    tablePhaseEditOverlay: {
        position: 'absolute',
        top: 31 + 5, 
        left: -5,
        right: -5,
        minWidth: 150,
        zIndex: 10,
        // Resetting inherited styles for table context
        backgroundColor: THEME.card,
        flexDirection: 'row',
        alignItems: 'center',
        padding: 4, 
    },

    phaseEditInput: {
        flex: 1,
        borderWidth: 1,
        borderColor: THEME.border,
        borderRadius: 4,
        padding: 8,
        marginRight: 8,
        fontSize: 14,
        fontWeight: '600',
        textTransform: 'uppercase',
    },
    phaseEditSave: {
        backgroundColor: THEME.primary,
        padding: 8,
        borderRadius: 4,
        marginRight: 4,
    },
    phaseEditCancel: {
        backgroundColor: THEME.danger,
        padding: 8,
        borderRadius: 4,
    },
    phaseDropdownContainer: {
    position: "absolute",
    top: 36,
    left: -10,
    backgroundColor: "#FFF",
    borderRadius: 10,
    padding: 6,
    width: 160,
    maxHeight: 240,
    borderWidth: 1,
    borderColor: "#DDD",
    shadowColor: "#000",
    shadowOpacity: 0.15,
    shadowRadius: 6,
    shadowOffset: { width: 0, height: 2 },
    elevation: 6,
    zIndex: 9999,
},

phaseDropdownList: {
    maxHeight: 200,
    paddingHorizontal: 4,
},

phaseDropdownItem: {
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderRadius: 6,
},

phaseDropdownItemText: {
    fontSize: 15,
    fontWeight: "600",
    color: "#333",
},

phaseDropdownClose: {
    marginTop: 6,
    alignSelf: "center",
    backgroundColor: "#FF4D4D",
    paddingVertical: 6,
    paddingHorizontal: 10,
    borderRadius: 6,
},
phaseHeaderCell: {
  paddingTop: 32,   // ⬅️ height of phase header
},
equipmentPhaseDivider: {
  position: 'absolute',
  top: 0,
  bottom: 0,
  left: '50%',
  width: 1,
  backgroundColor: THEME.border,
},
equipmentRegSbDivider: {
  position: 'absolute',
  top: 0,
  bottom: 0,
  left: '50%',
  width: 1,
  backgroundColor: THEME.border,
},

});


export default PETimesheetReviewScreen;