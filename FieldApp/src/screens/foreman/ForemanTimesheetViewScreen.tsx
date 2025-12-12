// import React, { useEffect, useState } from 'react';
// import {
//     View,
//     Text,
//     StyleSheet,
//     ScrollView,
//     ActivityIndicator,
//     SafeAreaView,
//     TouchableOpacity,
//     Alert,
//     Dimensions, // Import Dimensions for potential future use or dynamic checks
// }
// from 'react-native';
// import { RouteProp, useRoute } from '@react-navigation/native';
// import apiClient from '../../api/apiClient';
// import type { SupervisorStackParamList } from '../../navigation/AppNavigator';
// import type { Timesheet } from '../../types'; // NOTE: Assuming this path is correct
// import axios from "axios";

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


// // --- Theme Constants ---
// const THEME = {
//     primary: '#007AFF',
//     background: '#F0F0F7',
//     card: '#FFFFFF',
//     text: '#1C1C1E',
//     textSecondary: '#6A6A6A',
//     border: '#999999', // 1. Changed to a darker color for better contrast
//     tableHeaderBg: '#F8F8F8',
//     rowAlternateBg: '#FCFCFC',
//     SPACING: 16,
// };
// type TableCategory =
//   | "employee"
//   | "equipment"
//   | "material"
//   | "vendor"
//   | "dumping_site";

// // --- FIXED WIDTHS (for perfect tablet behavior) ---
// const COL_NAME = 160;
// const COL_ID = 70;              // NEW: Width for EMP# and EQUIP #ER / Vendor ID
// const COL_CLASS = 80;
// const COL_MATERIAL = 130;       // ADDED: Width for Material Name column (Material/Vendor/Dumping tables)
// const COL_EMPLOYEE_HOUR = 110;   // Employee hours column width 
// const COL_SIMPLE_HOUR = 110;    // Used for Material/Vendor/Dumping Qty/Hours
// const COL_EQUIP = 110;          // Used for Equipment REG/S.B (per column)
// const COL_TICKET = 110;         // Used for Tickets/Loads
// const COL_TOTAL = 100;
// const COL_START_STOP = 70;      // NEW: Width for Start Hours / Stop Hours columns

// const getPhaseGroupWidth = (type: TableCategory): number => {
//   if (type === "equipment") return COL_EQUIP * 2; // REG + S.B
//   if (type === "employee") return COL_EMPLOYEE_HOUR;       // Use 90px for employee hours only
//   // material, vendor, dumping_site → simple (quantity + tickets)
//   return COL_SIMPLE_HOUR; // Use 110px + 110px for simple tables
// };

// const ForemanTimesheetViewScreen = ({ navigation, route }: any) => {
//     const { timesheetId } = route.params;
//     // Timesheet type is extended with supervisor_id and supervisor object for local state consistency
//     const [timesheet, setTimesheet] = useState<(Timesheet & { 
//         supervisor_id?: number | string | null; 
//         supervisor?: { id: number | string, name: string } | null; 
//     }) | null>(null);
//     const [foremanName, setForemanName] = useState<string>('');
//     const [supervisorName, setSupervisorName] = useState<string>(''); 
//     // The table rendering is now multi-phase. selectedPhase is only used for the TABS and Total Quantity block.
//     const [selectedPhase, setSelectedPhase] = useState<string | null>(null); 
//     const [loading, setLoading] = useState(true);


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


//     useEffect(() => {
//         const fetchData = async () => {
//             try {
//                 // Assert tsData to include supervisor_id and supervisor object
//                 const response = await apiClient.get<Timesheet>(`/api/timesheets/${timesheetId}`);
//                 const tsData = response.data as Timesheet & { 
//                     supervisor_id?: number | string | null; 
//                     supervisor?: { id: number | string, name: string } | null;
//                 };
//                 setTimesheet(tsData);

//                 if (tsData.data.job.phase_codes?.length > 0) {
//                     setSelectedPhase(tsData.data.job.phase_codes[0]);
//                 }
                
//                 setNotes(tsData.data.notes || '');


//                 // ⭐️ FIX 1: Corrected populateSimple to use a composite key for vendors
//                 const populateSimple = (entities: any[] = [], field: 'hours_per_phase' | 'tickets_per_phase', type?: 'material' | 'vendor' | 'dumping_site'): SimpleHourState => {
//                     const state: SimpleHourState = {};
//                     entities.forEach((e) => {
//                         let id;
//                         if (type === 'material') {
//                             id = e.name || e.id || e.key || e.vendor_id;
//                         } else if (type === 'vendor') { 
//                             // FIX: Create a unique composite key for vendor materials (VendorID_UniqueLineItemKey)
//                             const vendorId = e.vendor_id || e.id;
//                             // Use e.key (likely a unique internal ID) or e.material_name/e.name as the unique part
//                             const uniqueLineItemKey = e.key || e.material_name || e.name || e.id;

//                             // Use a composite key (e.g., '1465_P. Gravel')
//                             // This ensures each material is stored distinctly in the state object.
//                             id = (vendorId && uniqueLineItemKey) ? `${vendorId}_${uniqueLineItemKey}` : e.id || e.name || e.key || e.vendor_id;

//                         } else {
//                             // Keep the standard priority (ID > Name) for dumping_site
//                             id = e.id || e.name || e.key || e.vendor_id; 
//                         }
                        
//                         state[id] = {};
//                         const data = e[field] || {};
//                         Object.entries(data).forEach(([phase, val]) => {
//                             state[id][phase] = String(val || '0');
//                         });
//                     });
//                     return state;
//                 };


//                 const populateUnits = (entities: any[] = []): UnitState => {
//                     const state: UnitState = {};
//                     entities.forEach(e => {
//                         // Get the ID from the metadata object (same logic as populateSimple for consistency)
//                         const id = e.id || e.name || e.key; 
//                         // The 'unit' property is nested inside 'selectedMaterials' in the metadata object
//                         const unit = e.selectedMaterials?.[0]?.unit || e.unit || null; 
//                         state[id] = unit;
//                     });
//                     return state;
//                 };

//                  const populateEmployeeComplex = (entities: any[] = []): EmployeeHourState => {
//                     const state: EmployeeHourState = {};
//                     entities.forEach((e) => {
//                         state[e.id] = {};
//                         if (e.hours_per_phase) {
//                             Object.entries(e.hours_per_phase).forEach(([phase, phaseHours]) => {
//                                 state[e.id][phase] = {};
//                                 if (phaseHours && typeof phaseHours === 'object') {
//                                     Object.entries(phaseHours).forEach(([classCode, val]) => {
//                                         state[e.id][phase][classCode] = String(val || '0');
//                                     });
//                                 } else {
//                                     if (e.class_1) state[e.id][phase][e.class_1] = String(phaseHours || '0');
//                                 }
//                             });
//                         }
//                     });
//                     return state;
//                 };


//                 const populateEquipmentComplex = (entities: any[] = []): ComplexHourState => {
//                     const state: ComplexHourState = {};
//                     entities.forEach((e) => {
//                         state[e.id] = {};
//                         if (e.hours_per_phase) {
//                             for (const phase in e.hours_per_phase) {
//                                 const v = e.hours_per_phase[phase];
//                                 if (v && typeof v === 'object') {
//                                     // Handle S_B being used in API response (convert to S.B)
//                                     state[e.id][phase] = {
//                                         REG: v.REG?.toString() || '0',
//                                         'S.B': (v['S_B'] || v['S.B'])?.toString() || '0', 
//                                     };
//                                 } else {
//                                     const num = parseFloat((v ?? '0').toString());
//                                     state[e.id][phase] = { REG: !isNaN(num) ? num.toString() : '0', 'S.B': '0' };
//                                 }
//                             }
//                         }
//                     });
//                     return state;
//                 };

//                 // CRITICAL: Ensure we use the correct keys for fetching the formatted data arrays
//                 setEmployeeHours(populateEmployeeComplex(tsData.data.employees));
//                 setEquipmentHours(populateEquipmentComplex(tsData.data.equipment));
                
//                 // FIX: Use the 'materials_trucking' array which contains the hour/ticket data.
//                 const formattedMaterials = tsData.data.materials_trucking || [];
                
//                 // FIX APPLIED HERE: Using tsData.data.vendors array (which has hours/tickets).
//                 const formattedVendors = tsData.data.vendors || []; 
                
//                 // FIX: Use the 'dumping_sites' array which contains the hour/ticket data.
//                 const formattedDumpingSites = tsData.data.dumping_sites || []; 
                
//                 // PASSING 'material' TYPE TO FORCE NAME-BASED KEY LOOKUP
//                 setMaterialHours(populateSimple(formattedMaterials, 'hours_per_phase', 'material')); 
//                 setVendorHours(populateSimple(formattedVendors, 'hours_per_phase', 'vendor'));
//                 setMaterialTickets(populateSimple(formattedMaterials, 'tickets_per_phase', 'material')); // FIX APPLIED HERE
//                 setVendorTickets(populateSimple(formattedVendors, 'tickets_per_phase', 'vendor'));
                
//                 // Use metadata objects for units as they contain the 'selectedMaterials' array with the unit.
//                 const materialUnitsMetadata = Object.values(tsData.data.selected_material_items || {});
//                 const vendorUnitsMetadata = Object.values(tsData.data.selected_vendor_materials || {});
                
//                 setMaterialUnits(populateUnits(materialUnitsMetadata));
//                 setVendorUnits(populateUnits(vendorUnitsMetadata));
                
//                 // This now uses the array with valid data
//                 setDumpingSiteHours(populateSimple(formattedDumpingSites, 'hours_per_phase', 'dumping_site'));
//                 setDumpingSiteTickets(populateSimple(formattedDumpingSites, 'tickets_per_phase', 'dumping_site'));

// if (tsData.data.total_quantities) {
//     const q: QuantityState = {};

//     for (const phase in tsData.data.total_quantities) {
//         q[phase] = tsData.data.total_quantities[phase].toString();
//     }

//     setTotalQuantities(q);
// }



//                 const userRes = await apiClient.get(`/api/users/${tsData.foreman_id}`);
//                 setForemanName(`${userRes.data.first_name} ${userRes.data.last_name}`.trim());
// // SUPERVISOR NAME
// let supervisorName = "N/A";

// console.log("Supervisor raw:", tsData.data.supervisor);

// if (typeof tsData.data.supervisor === "string" && tsData.data.supervisor.trim() !== "") {
//   supervisorName = tsData.data.supervisor;
// } 
// else if (typeof tsData.data.supervisor === "object" && tsData.data.supervisor?.name) {
//   supervisorName = tsData.data.supervisor.name;
// }

// console.log("Supervisor Name Final:", supervisorName);

// setSupervisorName(supervisorName);

//             } catch (error) {
//                 console.error('Failed to load timesheet:', error);
//                 Alert.alert('Error', 'Failed to load timesheet data.');
//             } finally {
//                 setLoading(false);
//             }
//         };
//         fetchData();
//     }, [timesheetId]);


//     // --- Calculation Functions ---


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


// // ⭐️ FIX: Uses the general logic which sums all line items, now that populateSimple creates unique keys for each line item.
// const calculateSimplePhaseTotals = (
//   state: SimpleHourState, 
//   phaseCodes: string[], 
//   type: string  // Pass the table type
// ): Record<string, number> => {
//   const totals: Record<string, number> = {};
// phaseCodes.forEach(p => { totals[p] = 0 });

//   // This general logic correctly sums all line items for all simple tables.
//   Object.values(state).forEach((perEntity) => {
//     Object.entries(perEntity).forEach(([phase, value]) => {
//       if (totals[phase] !== undefined) {
//         totals[phase] += parseFloat(value) || 0;
//       }
//     });
//   });
  
//   return totals;
// };

    
//     // ComplexPhaseTotals (for Equipment)
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


//     // Employee Phase Total
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


//     // --- Table Renderer Component ---
// const handleSendTimesheet = async (timesheetId: number) => {
//   Alert.alert(
//     "Confirm Submission",
//     "Are you sure you want to send this timesheet?",
//     [
//       { text: "Cancel", style: "cancel" },
//       {
//         text: "Send",
//         onPress: async () => {
//           setLoading(true);
//           try {
//             await apiClient.post(`/api/timesheets/${timesheetId}/send`);

//             Alert.alert("Success", "Timesheet has been sent.");
//             navigation.navigate("TimesheetList", { refresh: true });

//           } catch (error: any) {
//             console.error("Send timesheet error:", error);

//             Alert.alert(
//               "Error",
//               error.response?.data?.detail || "Could not send the timesheet."
//             );
//           } finally {
//             setLoading(false);
//           }
//         },
//         style: "destructive",
//       },
//     ]
//   );
// };
//     const renderTableBlock = (
//         title: string,
//         entities: any[],
//         hoursState: SimpleHourState | ComplexHourState | EmployeeHourState,
//         ticketsState: SimpleHourState | undefined,
//         type: 'employee' | 'equipment' | 'material' | 'vendor' | 'dumping_site',
//         unitState: UnitState | undefined,
//     ) => {
//         if (!entities || entities.length === 0) return null;

//         const isEmployee = type === 'employee';
//         const isEquipment = type === 'equipment';
//         const isMaterial = type === 'material';
//         const isVendor = type === 'vendor'; // ADDED: Variable for vendor type
//         const isSimple = isMaterial || isVendor || type === 'dumping_site';

//         const phaseCodes = timesheet?.data.job.phase_codes || [];
//         // Even if there are no phases, we can't render the table structure correctly
//         if (phaseCodes.length === 0) return null; 

//         // --- Totals Calculation (Pre-calculate all phase totals for the footer) ---
//         let employeePhaseTotals: Record<string, number> = {};
//         let equipmentPhaseTotals: Record<string, { REG: number, 'S.B': number }> = {};
//         let simplePhaseTotals: Record<string, number> = {};
//         let grandTotal = 0; // Grand Total for the entire table

//         // Only calculate totals for the phases present in the timesheet
//         if (isEmployee) {
//             phaseCodes.forEach(phase => {
//                 employeePhaseTotals[phase] = calculateEmployeePhaseTotal(hoursState as EmployeeHourState, phase);
//             });
//             // Calculate Grand Total for Employee
//             grandTotal = entities.reduce((sum, e) => sum + calculateTotalEmployeeHours(hoursState as EmployeeHourState, e.id), 0);
//         } else if (isEquipment) {
//             equipmentPhaseTotals = calculateComplexPhaseTotals(hoursState as ComplexHourState, phaseCodes);
//             // Calculate Grand Total for Equipment
//             grandTotal = entities.reduce((sum, e) => sum + calculateTotalComplexHours(hoursState as ComplexHourState, e.id), 0);
//         } else if (isSimple) { // This handles Material/Vendor/Dumping
// simplePhaseTotals = calculateSimplePhaseTotals(
//   hoursState as SimpleHourState, 
//   phaseCodes, 
//   type  // Pass the table type
// );            // Calculate Grand Total for Simple Tables (Sum of Hours/Qty)
//   // In renderTableBlock, replace the grand total calculation:
// grandTotal = entities.reduce((sum, e) => {
//   // For vendors, sum ALL vendorid entries to handle multiple materials
//   if (type === 'vendor') {
//     // ⭐️ FIX: Grand Total must use the composite key (same logic as below)
//     const vendorId = e.vendor_id || e.id;
//     const uniqueLineItemKey = e.key || e.material_name || e.name || e.id;
//     const entityId = (vendorId && uniqueLineItemKey) ? `${vendorId}_${uniqueLineItemKey}` : e.id || e.name || e.key || e.vendor_id;
    
//     // Sum across ALL phases for this composite key
//     return sum + calculateTotalSimpleHours(hoursState as SimpleHourState, entityId);
//   }
//   // Existing logic for other simple types
//   let entityId = type === 'material' ? e.name || e.id || e.key || e.vendor_id 
//               : e.id || e.name || e.key || e.vendor_id;
//   return sum + calculateTotalSimpleHours(hoursState as SimpleHourState, entityId);
// }, 0);

//         }
//         // -------------------------------------------------------------------------

//         // Calculate content width for minWidth
//         const phaseGroupWidth = getPhaseGroupWidth(type);
        
//         let fixedWidth = COL_NAME + COL_TOTAL;
//         if (isEmployee) {
//             // Name + EMP# + Class Code + Total
//             fixedWidth += COL_ID + COL_CLASS;
//         } else if (isEquipment) {
//             // Name + EQUIP #ER + Start Hours + Stop Hours + Total
//             fixedWidth += COL_ID + (COL_START_STOP * 2); 
//         } else {
//             // Simple tables fixed columns:
//             fixedWidth += COL_MATERIAL + COL_TICKET;
//             // NEW: Add COL_ID for Vendor table
//             if (isVendor) {
//                 fixedWidth += COL_ID;
//             }
//         }
        
//         // Calculate total content width by multiplying phase group width by the number of phases
//         const contentWidth = fixedWidth + phaseGroupWidth * phaseCodes.length;

//         // Custom Employee Table Renderer
//         const renderEmployeeTableBody = () => {
//             return entities.flatMap((entity, index) => {
//                 const totalHours = calculateTotalEmployeeHours(hoursState as EmployeeHourState, entity.id);
//                 const showReason = totalHours === 0 && entity.reason
//                 const entityName = `${entity.first_name} ${entity.last_name}`.trim();

//                 // Collect all unique class codes that have hours logged OR are assigned
//                 const classCodesUsed: Set<string> = new Set();
//                 phaseCodes.forEach(phase => {
//                     const phaseHours = (hoursState as EmployeeHourState)[entity.id]?.[phase];
//                     if (phaseHours) {
//                         Object.keys(phaseHours).forEach(code => {
//                             if (parseFloat(phaseHours[code] || '0') > 0) {
//                                 classCodesUsed.add(code);
//                             }
//                         });
//                     }
//                 });
                
//                 // Also include assigned class codes even if hours are zero
//                 if (entity.class_1) classCodesUsed.add(entity.class_1);
//                 if (entity.class_2) classCodesUsed.add(entity.class_2);
                
//                 const classCodesToDisplay = Array.from(classCodesUsed).sort();


//                 // If no class codes or no hours logged, show a single zero row
//                 if (classCodesToDisplay.length === 0 && totalHours === 0) {
//                     return (
//                         <View key={`${entity.id}-default`} style={[styles.tableRow, index % 2 === 1 && styles.tableRowAlternate]}>
//                             <Text style={[styles.dataCell, styles.colName, styles.borderRight]}>{entityName}</Text>
                            
//                             {/* NEW EMP# COLUMN (Always present for employee table) */}
//                             <Text style={[styles.dataCell, styles.colId, styles.borderRight]}>{entity.id}</Text>
                            
//                             <Text style={[styles.dataCell, styles.colClassCode, styles.borderRight]}>N/A</Text>
                            
//                             {/* Dynamic Hours Columns per Phase (all 0) */}
//                             {phaseCodes.map((phase, phaseIndex) => {
//                                 const isLastPhase = phaseIndex === phaseCodes.length - 1;
//                                 const phaseBorder = isLastPhase ? {} : styles.phaseGroupBorderRight;
                                
//                                 return (
//                                     <View key={phase} style={[styles.dynamicPhaseColEmployee, phaseBorder]}>
//                                         {/* Use flex: 1 to fill the 90px container */}
//                                         <Text style={[styles.dataCell, { flex: 1 }, styles.lastCell]}>0.0</Text>
//                                     </View>
//                                 );
//                             })}

//                             <Text style={[styles.dataCell, styles.colTotal, styles.lastCell, styles.borderLeft]}>{totalHours.toFixed(1)}</Text>
//                         </View>
                        
//                     );
                    
//                 }

//                 // Render a row for each class code used/assigned
//                 return classCodesToDisplay.map((classCode, classIndex) => {
//                     const isFirstClassRow = classIndex === 0;

//                     return (
//                         <View key={`${entity.id}-${classCode}`} style={[styles.tableRow, index % 2 === 1 && styles.tableRowAlternate]}>
//                             {/* Show name only in the first row for this employee. */}
//                             {/* NAME CELL (first row shows name + optional reason) */}
// <View
//   style={[
//     styles.dataCell,
//     styles.colName,
//     styles.borderRight,
//     !isFirstClassRow && styles.transparentCell
//   ]}
// >
//   {isFirstClassRow && (
//     <View style={{ paddingVertical: 2 }}>
//       <Text style={{ fontSize: 14, fontWeight: '500' }} numberOfLines={2}>
//         {entityName}
//       </Text>

//       {/* Reason stays INSIDE same cell */}
//       {showReason && (
//         <Text
//           style={{
//             fontSize: 13,
//             color: '#ac4545ff',
//             fontWeight: '500',
//             fontStyle: 'italic',
//             marginTop: 3
//           }}
//         >
//           Reason: {entity.reason}
//         </Text>
//       )}
//     </View>
//   )}
// </View>

//                             {/* NEW EMP# COLUMN (Show only in the first row) */}
//                             <Text style={[styles.dataCell, styles.colId, styles.borderRight, isFirstClassRow ? null : styles.transparentCell]}>
//                                 {isFirstClassRow ? entity.id : ''}
//                             </Text>

//                             <Text style={[styles.dataCell, styles.colClassCode, styles.borderRight]}>{classCode}</Text>

//                             {/* Dynamic Hours Columns per Phase */}
//                             {phaseCodes.map((phase, phaseIndex) => {
//                                 const phaseHours = (hoursState as EmployeeHourState)[entity.id]?.[phase];
//                                 const hours = parseFloat(phaseHours?.[classCode] || '0');
//                                 const displayHours = entity.reason ? '–' : hours > 0 ? hours.toFixed(1) : '';
//                                 const isLastPhase = phaseIndex === phaseCodes.length - 1;
//                                 const phaseBorder = isLastPhase ? {} : styles.phaseGroupBorderRight;

//                                 return (
//                                     // Employee uses the narrow column width
//                                     <View 
//                                         key={phase} 
//                                         style={[
//                                             styles.dynamicPhaseColEmployee, // Use the new narrow style
//                                             phaseBorder, // Apply phase separation border
//                                         ]}
//                                     > 
//                                         {/* Use flex: 1 to fill the 90px container */}
//                                         <Text style={[styles.dataCell, { flex: 1 }, styles.lastCell]}>
//                                             {displayHours} {/* Show empty string for 0 */}
//                                         </Text>
//                                     </View>
//                                 );
//                             })}
                            
//                             {/* Show total hours only in the first row for this employee */}
//                             <Text style={[styles.dataCell, styles.colTotal, styles.lastCell, styles.borderLeft, isFirstClassRow ? null : styles.transparentCell]}>
//                                 {isFirstClassRow ? totalHours.toFixed(1) : ''}
//                             </Text>
//                         </View>
//                     );
//                 });
//             });
//         };
//         // End of Custom Employee Table Renderer
        
//         // --- NEW: Grouping variable for simple tables (must be outside the map, but inside renderTableBlock) ---
//         let lastEntityName = '';


//         return (
//             <View style={styles.card}>
//                 <Text style={styles.tableTitle}>{title}</Text>
//                 {/* CRITICAL FIX: Add ScrollView horizontal to enable scrolling when content width > screen width */}
//                 <ScrollView horizontal showsHorizontalScrollIndicator={true}> 
//                     <View style={[styles.tableContainer, { minWidth: contentWidth }]}>

                        
//                         {/* -------------------- TABLE HEADER START (DYNAMIC) -------------------- */}
//                         <View style={styles.tableHeader}>
                            
//                             {/* 1. VENDOR ID COLUMN (Vendor Only - NEW FIRST COLUMN) */}
//                             {isVendor && (
//                                 <Text 
//                                     style={[
//                                         styles.headerCell, 
//                                         styles.colId, 
//                                         styles.borderRight,
//                                         styles.headerCellBottomBorder
//                                     ]}
//                                 >
//                                     Vendor ID
//                                 </Text>
//                             )}
                            
//                             {/* 2. NAME COLUMN (Always present - Second for Vendor, First otherwise) */}
//                             <Text 
//                                 style={[
//                                     styles.headerCell, 
//                                     styles.colName, 
//                                     styles.borderRight,
//                                     styles.headerCellBottomBorder // Simple tables start border here, so always add.
//                                 ]}
//                             >
//                                 Name
//                             </Text>
                            
//                             {/* 3. FIXED ID/CLASS/START/STOP COLUMNS (Positioned after Name) */}

//                             {/* NEW EMP# COLUMN (Employee only) */}
//                             {isEmployee && (
//                                 <Text 
//                                     style={[
//                                         styles.headerCell, 
//                                         styles.colId, 
//                                         styles.borderRight,
//                                         styles.headerCellBottomBorder
//                                     ]}
//                                 >
//                                     EMP#
//                                 </Text>
//                             )}

//                             {/* NEW EQUIP #ER COLUMN (Equipment only) */}
//                             {isEquipment && (
//                                 <Text 
//                                     style={[
//                                         styles.headerCell, 
//                                         styles.colId, 
//                                         styles.borderRight,
//                                         styles.headerCellBottomBorder
//                                     ]}
//                                 >
//                                     EQUIP #ER
//                                 </Text>
//                             )}

//                             {/* NEW START HOURS COLUMN (Equipment only) */}
//                             {isEquipment && (
//                                 <Text 
//                                     style={[
//                                         styles.headerCell, 
//                                         styles.colStartStop, 
//                                         styles.borderRight,
//                                         styles.headerCellBottomBorder
//                                     ]}
//                                 >
//                                     Start Hours
//                                 </Text>
//                             )}

//                             {/* NEW STOP HOURS COLUMN (Equipment only) */}
//                             {isEquipment && (
//                                 <Text 
//                                     style={[
//                                         styles.headerCell, 
//                                         styles.colStartStop, 
//                                         styles.borderRight,
//                                         styles.headerCellBottomBorder
//                                     ]}
//                                 >
//                                     Stop Hours
//                                 </Text>
//                             )}
                            
//                             {isEmployee && (
//                                 <Text 
//                                     style={[
//                                         styles.headerCell, 
//                                         styles.colClassCode, 
//                                         styles.borderRight,
//                                         styles.headerCellBottomBorder // Employee table Class Code gets the border
//                                     ]}
//                                 >
//                                     Class Code
//                                 </Text>
//                             )}

//                             {/* 4. MATERIAL COLUMN (Simple tables only - Third column for Vendor) */}
//                             {isSimple && (
//                                 <Text style={[
//                                     styles.headerCell, 
//                                     styles.colMaterial, 
//                                     styles.borderRight, 
//                                     styles.headerCellBottomBorder
//                                 ]}>
//                                     Material
//                                 </Text>
//                             )}

//                             {/* 5. TICKETS COLUMN (Simple tables only - Fourth column for Vendor) */}
//                             {isSimple && (
//                                 <Text style={[
//                                     styles.headerCell, 
//                                     styles.colTickets, 
//                                     styles.borderRight, 
//                                     styles.headerCellBottomBorder
//                                 ]}>
//                                     {type === "dumping_site" ? "# Loads" : "# Tickets"}
//                                 </Text>
//                             )}


//                             {/* DYNAMIC PHASE COLUMNS (These scroll) */}
//                             {phaseCodes.map((phase, phaseIndex) => {
//                                 const isLastPhase = phaseIndex === phaseCodes.length - 1;
//                                 const phaseBorder = isLastPhase ? {} : styles.phaseGroupBorderRight;
                                
//                                 // Determine the correct dynamic style
//                                 const dynamicPhaseStyle = isEquipment 
//                                     ? styles.dynamicPhaseColEquipment 
//                                     : isEmployee 
//                                         ? styles.dynamicPhaseColEmployee // Use the new narrow style for Employee
//                                         : styles.dynamicPhaseColSimple;

//                                 return (
//                                     <View 
//                                         key={phase} 
//                                         style={[
//                                             dynamicPhaseStyle, // Use the determined style
//                                             phaseBorder, // Apply phase separation border
//                                         ]}
//                                     >
//                                         {/* Phase Code Text: positioned absolutely over the sub-columns. This now draws the line. */}
//                                          {/* Phase Code */}
//             <Text style={styles.phaseHeaderCellText}>{phase}</Text>
//             {/* Only ONE cell under the phase code */}
//            {!isEquipment && (
//     <Text
//         style={[
//             styles.headerCell,
//             styles.colHoursSimple,
//             styles.lastCell,
//             styles.headerCellBottomBorder
//         ]}
//     >
//         {isEmployee ? 'Hours' : // Employee tables use 'Hours'
//             type === 'material' ? 'Hours/Qty' :
//             type === 'dumping_site' ? 'Loads' :
//             'Quantity'}
//     </Text>
// )}

//             {/* Equipment keeps 2 columns, leave unchanged */}
//             {isEquipment && (
//                 <View style={styles.equipmentPhaseSubHeader}>
//                     <Text style={[styles.headerCell, styles.colHoursEquipment, styles.equipmentSubHeaderCell, styles.borderRight, styles.headerCellBottomBorder]}>REG</Text>
//                     <Text style={[styles.headerCell, styles.colHoursEquipment, styles.equipmentSubHeaderCell, styles.lastCell, styles.headerCellBottomBorder]}>S.B</Text>
//                 </View>
//             )}
//         </View>
//     );
// })}
                            
//                             {/* Fixed column at the end - No bottom border to meet the request */}
//                             <Text style={[styles.headerCell, styles.colTotal, styles.lastCell, styles.borderLeft, styles.headerCellBottomBorder]}>Total</Text>
//                         </View>
//                         {/* -------------------- TABLE HEADER END -------------------- */}



//                         {/* -------------------- TABLE BODY START (DYNAMIC) -------------------- */}
//                         {isEmployee ? (
//                             renderEmployeeTableBody()
//                         ) : (
//                         // --- LOGIC FOR EQUIPMENT/MATERIAL/VENDOR (NON-EMPLOYEE) ---
//                             entities.map((entity, index) => {
//                                 let entityId;
//                                 // ⭐️ FIX 2: Re-create the composite key for the line item lookup
//                                 if (type === 'vendor') { 
//                                     const vendorId = entity.vendor_id || entity.id;
//                                     const uniqueLineItemKey = entity.key || entity.material_name || entity.name || entity.id;
                                    
//                                     // RE-CREATE THE SAME COMPOSITE KEY USED IN populateSimple
//                                     entityId = (vendorId && uniqueLineItemKey) 
//                                         ? `${vendorId}_${uniqueLineItemKey}` 
//                                         : entity.id || entity.name || entity.key || entity.vendor_id;
                                        
//                                 } else if (type === 'material') {
//                                     entityId = entity.name || entity.id || entity.key || entity.vendor_id;
//                                 } else {
//                                     entityId = entity.id || entity.name || entity.key || entity.vendor_id;
//                                 }

//                                 // ⭐️ NOTE: totalHours and totalTickets now also use the correct entityId lookup
//                                 const totalHours = isEquipment 
//                                     ? calculateTotalComplexHours(hoursState as ComplexHourState, entityId)
//                                     : calculateTotalSimpleHours(hoursState as SimpleHourState, entityId);
                                    
//                                 // FIX APPLIED HERE: Calculate total tickets for simple tables, falling back to tickets_loads if phase breakdown is empty.
//                                 const totalPhaseTickets = isSimple && ticketsState 
//                                     ? calculateTotalSimpleHours(ticketsState as SimpleHourState, entityId)
//                                     : 0;

//                                 const totalTickets = totalPhaseTickets > 0 
//                                     ? totalPhaseTickets 
//                                     : (isSimple && entity.tickets_loads) ? entity.tickets_loads : 0; // Use raw tickets_loads if phase breakdown is empty or missing


//                                 // --- UPDATE lastEntityName for the next iteration ---
//                                 const entityName = (type === 'vendor')
//                                     ? entity.vendor_name 
//                                     : (type === 'material' || type === 'dumping_site')
//                                         ? entity.name || entity.material_name 
//                                         : entity.first_name
//                                             ? `${entity.first_name} ${entity.middle_name || ''} ${entity.last_name}`.trim()
//                                             : entity.name;
                                
//                                 const isNewGroup = isSimple && entityName !== lastEntityName;
//                                 const shouldShowName = isNewGroup || isEquipment; 
                                
//                                 if (isSimple) {
//                                     lastEntityName = entityName;
//                                 }


//                                 return (
//                                     <View key={entityId} style={[styles.tableRow, index % 2 === 1 && styles.tableRowAlternate]}>
                                        
//                                         {/* NEW VENDOR ID COLUMN (Vendor only - RENDERED FIRST) */}
//                                         {isVendor && (
//                                             <Text style={[styles.dataCell, styles.colId, styles.borderRight, shouldShowName ? null : styles.transparentCell]}>
//                                                 {shouldShowName ? entity.vendor_id : ''}
//                                             </Text>
//                                         )}
                                        
//                                         {/* NAME CELL (CONDITIONAL RENDER for Simple Tables - RENDERED SECOND for Vendor) */}
//                                         <View 
//                                             style={[
//                                                 styles.dataCell, 
//                                                 styles.colName, 
//                                                 styles.borderRight,
//                                             ]} 
//                                         >
//                                             {shouldShowName ? (
//                                                 <Text style={{ fontSize: 12, textAlign: 'left', color: THEME.text }} numberOfLines={2}>
//                                                     {entityName}
//                                                 </Text>
//                                             ) : null}
//                                         </View>
                                        
//                                         {/* NEW EQUIP #ER COLUMN (Equipment only) */}
//                                         {isEquipment && (
//                                             <Text style={[styles.dataCell, styles.colId, styles.borderRight]}>{entity.id}</Text>
//                                         )}

//                                         {/* NEW START HOURS COLUMN (Equipment only) */}
//                                         {isEquipment && (
//                                             <Text style={[styles.dataCell, styles.colStartStop, styles.borderRight]}>
//                                                 {/* Assuming start_hours exists on entity */}
//                                                 {entity.start_hours || ''} 
//                                             </Text>
//                                         )}

//                                         {/* NEW STOP HOURS COLUMN (Equipment only) */}
//                                         {isEquipment && (
//                                             <Text style={[styles.dataCell, styles.colStartStop, styles.borderRight]}>
//                                                 {/* Assuming stop_hours exists on entity */}
//                                                 {entity.stop_hours || ''}
//                                             </Text>
//                                         )}
                                        
//                                         {/* NEW MATERIAL NAME COLUMN (Simple tables only) - RENDERED THIRD for Vendor (Always rendered) */}
//                                         {isSimple && (
//                                             <Text style={[styles.dataCell, styles.colMaterial, styles.borderRight]} numberOfLines={2}>
//                                                 {entity.material_name || entity.name || ''} 
//                                             </Text>
//                                         )}
                                        
//                                         {/* TICKETS COLUMN (Simple tables only) - RENDERED FOURTH for Vendor */}
//                                         {isSimple && (
//                                             <Text style={[styles.dataCell, styles.colTickets, styles.borderRight]}>
//                                                 {totalTickets > 0 ? totalTickets : ''}
//                                             </Text>
//                                         )}

//                                         {/* Dynamic Phase Columns */}
//                                         {phaseCodes.map((phase, phaseIndex) => {
//                                             const isLastPhase = phaseIndex === phaseCodes.length - 1;
//                                             const phaseBorder = isLastPhase ? {} : styles.phaseGroupBorderRight;

//                                             return (
//                                                 <View key={phase} style={[
//                                                     isEquipment ? styles.dynamicPhaseColEquipment : (isEmployee ? styles.dynamicPhaseColEmployee : styles.dynamicPhaseColSimple),
//                                                     phaseBorder, // Apply phase separation border
//                                                 ]}>
//                                                     {isEquipment ? (
//                                                         // Equipment: REG and S.B.
//                                                         <>
//                                                             <Text style={[styles.dataCell, styles.colHoursEquipment, styles.borderRight]}>
//                                                                 {parseFloat((hoursState as ComplexHourState)[entityId]?.[phase]?.REG ?? '0').toFixed(1)}
//                                                             </Text>
//                                                             <Text style={[styles.dataCell, styles.colHoursEquipment, styles.lastCell]}>
//                                                                 {parseFloat((hoursState as ComplexHourState)[entityId]?.[phase]?.['S.B'] ?? '0').toFixed(1)}
//                                                             </Text>
//                                                         </>
//                                                     ) : (
//                                                         // Simple Logic (Material/Vendor/Dumping)
//                                                         <>
//                                                             <Text style={[styles.dataCell, styles.colHoursSimple, styles.lastCell]}>
//                                                                 {/* THIS LOOKUP NOW USES THE CORRECT COMPOSITE entityId FOR VENDORS */}
//                                                                 {parseFloat((hoursState as SimpleHourState)[entityId]?.[phase] ?? '0').toFixed(1)}
//                                                             </Text>
                                                            
//                                                         </>
//                                                     )}
                                                
//                                                 </View>
//                                             )
//                                         })}

//                                         {/* 3. Added vertical line before total column (styles.borderLeft) */}
//                                         <Text style={[styles.dataCell, styles.colTotal, styles.lastCell, styles.borderLeft]}>{totalHours.toFixed(1)}</Text>
//                                     </View>
//                                 );
//                             })
//                         )}
//                         {/* -------------------- TABLE BODY END -------------------- */}


//                         {/* -------------------- PHASE TOTALS ROW (DYNAMIC) -------------------- */}
//                         <View style={[styles.tableRow, styles.phaseTotalRow]}>
                            
//                             {/* VENDOR ID PLACEHOLDER (Vendor only - FIRST COLUMN) */}
//                             {isVendor && (
//                                 <View style={[styles.dataCell, styles.colId, styles.borderRight]} />
//                             )}
                            
//                             {/* NAME CELL (ALWAYS FIRST/SECOND COLUMN - HOLDS LABEL) */}
//                             <Text style={[
//                                 styles.dataCell, 
//                                 styles.colName, 
//                                 styles.phaseTotalText,
//                                 styles.borderRight, 
//                                 styles.phaseTotalLabelAlignment
//                             ]}>
//                                 Phase Total
//                             </Text>

//                             {/* ID Column Placeholder (Employee/Equipment only - Third/Second column) */}
//                             {(isEmployee || isEquipment) && (
//                                 <View style={[styles.dataCell, styles.colId, styles.borderRight]} /> 
//                             )}
                            
//                             {/* NEW START HOURS PLACEHOLDER (Equipment only) */}
//                             {isEquipment && (
//                                 <View style={[styles.dataCell, styles.colStartStop, styles.borderRight]} /> 
//                             )}

//                             {/* NEW STOP HOURS PLACEHOLDER (Equipment only) */}
//                             {isEquipment && (
//                                 <View style={[styles.dataCell, styles.colStartStop, styles.borderRight]} /> 
//                             )}
                            
//                             {/* Class Code Placeholder (Employee only) */}
//                             {isEmployee && (
//                                 <View style={[styles.dataCell, styles.colClassCode, styles.borderRight]} /> 
//                             )}

//                             {/* MATERIAL COLUMN PLACEHOLDER (Simple tables only - Third column for Vendor) */}
//                             {isSimple && (
//                                 <View style={[styles.dataCell, styles.colMaterial, styles.borderRight]} />
//                             )}
                           
//                             {/* TICKETS COLUMN PLACEHOLDER (Simple tables only - Fourth column for Vendor) */}
//                             {isSimple && (
//                                 <View style={[styles.dataCell, styles.colTickets, styles.borderRight]} />
//                             )}
                            
//                             {phaseCodes.map((phase, phaseIndex) => {
//                                 const isLastPhase = phaseIndex === phaseCodes.length - 1;
//                                 const phaseBorder = isLastPhase ? {} : styles.phaseGroupBorderRight;

//                                 // Determine the correct dynamic style
//                                 const dynamicPhaseStyle = isEquipment 
//                                     ? styles.dynamicPhaseColEquipment 
//                                     : isEmployee 
//                                         ? styles.dynamicPhaseColEmployee 
//                                         : styles.dynamicPhaseColSimple;

//                                 return (
//                                     <View 
//                                         key={phase} 
//                                         style={[
//                                             dynamicPhaseStyle,
//                                             phaseBorder, // Apply phase separation border
//                                         ]}
//                                     >
//                                         {isEmployee ? (
//                                             // FIX: Removed the unnecessary 'phaseTotalSubRow' wrapper. 
//                                             // The Text element now directly fills the 'dynamicPhaseColEmployee' View.
//                                             <Text style={[styles.dataCell, { flex: 1 }, styles.phaseTotalText]}>
//                                                 {(employeePhaseTotals[phase] || 0).toFixed(1)}
//                                             </Text>
                                           
//                                         ) : isEquipment ? (
//                                             <View style={styles.phaseTotalSubRow}>
//                                                 <Text style={[styles.dataCell, styles.colHoursEquipment, styles.phaseTotalText, styles.borderRight]}>
//                                                     {(equipmentPhaseTotals[phase]?.REG || 0).toFixed(1)}
//                                                 </Text>
//                                                 <Text style={[styles.dataCell, styles.colHoursEquipment, styles.phaseTotalText, styles.lastCell]}>
//                                                     {(equipmentPhaseTotals[phase]?.['S.B'] || 0).toFixed(1)}
//                                                 </Text>
//                                             </View>
//                                         ) : isSimple ? (
//     <View style={styles.phaseTotalSubRow}>
//        <Text style={[
//             styles.dataCell,
//             styles.colHoursSimple,
//             styles.phaseTotalText,
//             // Simple tables only have one cell under the phase code, so it is the last cell.
//             styles.lastCell,
//         ]}>
//             {(simplePhaseTotals[phase] || 0).toFixed(1)}
//         </Text>
//     </View>
// ) : null}

//                                     </View>
//                                 );
//                             })}
                            
//                             {/* Total Column placeholder */}
//                             <View style={[styles.dataCell, styles.colTotal, styles.lastCell, styles.borderLeft]} />
                           
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

//     // NOTE: formattedMaterials is now correctly using the materials_trucking array (the data source)
//     const formattedMaterials = data.materials_trucking || [];
//     // The vendor data source is now corrected to the array with hours/tickets.
//     const formattedVendors = data.vendors || [];
//     const formattedDumpingSites = data.dumping_sites || [];

//     return (
//         <SafeAreaView style={styles.safeArea}>
//             <ScrollView contentContainerStyle={{ padding: THEME.SPACING, paddingBottom: 50 }}>
//                 {/* Info Card */}
//                 <View style={styles.infoCard}>
//                     <Text style={styles.jobTitle}>{data.job_name}</Text>
//                     <Text style={styles.jobCode}>Job Code: {data.job.job_code}</Text>
//                     <View style={styles.infoGrid}>
//                         <View style={styles.infoItem}><Text style={styles.infoLabel}>Date</Text><Text style={styles.infoValue}>{new Date(date).toLocaleDateString()}</Text></View>
//                         <View style={styles.infoItem}><Text style={styles.infoLabel}>Foreman</Text><Text style={styles.infoValue}>{foremanName}</Text></View>
//                         {/* Supervisor Name Display */}
// <View style={styles.infoItem}>
//     <Text style={styles.infoLabel}>Supervisor</Text>
//     <Text style={styles.infoValue}>{supervisorName}</Text>
// </View>
//                         <View style={styles.infoItem}><Text style={styles.infoLabel}>Project Engineer</Text><Text style={styles.infoValue}>{data.project_engineer || 'N/A'}</Text></View>
//                         <View style={styles.infoItem}><Text style={styles.infoLabel}>Day/Night</Text><Text style={styles.infoValue}>{data.time_of_day || 'N/A'}</Text></View>
//                         <View style={styles.infoItem}><Text style={styles.infoLabel}>Location</Text><Text style={styles.infoValue}>{data.location || 'N/A'}</Text></View>
//                         <View style={styles.infoItem}><Text style={styles.infoLabel}>Weather</Text><Text style={styles.infoValue}>{data.weather || 'N/A'}</Text></View>
//                         <View style={styles.infoItemFull}><Text style={styles.infoLabel}>Temperature</Text><Text style={styles.infoValue}>{data.temperature || 'N/A'}</Text></View>
//                     </View>
//                 </View>




//                 {/* Data Tables */}
//                 <View>
                        
//                     {renderTableBlock('Employees', data.employees, employeeHours, undefined, 'employee', undefined)}
//                     {renderTableBlock('Equipment', data.equipment, equipmentHours, undefined, 'equipment', undefined)}
//                     {renderTableBlock('Materials and Trucking', formattedMaterials, materialHours, materialTickets, 'material', materialUnits)}
//                     {renderTableBlock('Vendors', formattedVendors, vendorHours, vendorTickets, 'vendor', vendorUnits)}
//                     {renderTableBlock('Dumping Sites', formattedDumpingSites, dumpingSiteHours, dumpingSiteTickets, 'dumping_site', undefined)}
//                 </View>
               
//                 {/* Total Quantity */}
//                 {/* Now display all total quantities in this block, not just the selected one */}
//                 {(data.job.phase_codes || []).length > 0 && (
//                     <View style={styles.card}>
//                         <Text style={styles.tableTitle}>Total Quantities</Text>
//                         <View>
//                             {data.job.phase_codes.map(phase => (
//                                 totalQuantities[phase] ? (
//                                     <View key={phase} style={styles.quantityRow}>
//                                         <Text style={styles.quantityLabel}>Phase {phase}:</Text>
//                                         <View style={styles.totalBox}>
//                                             <Text style={styles.totalText}>{totalQuantities[phase]}</Text>
//                                         </View>
//                                     </View>
//                                 ) : null
//                             ))}
//                         </View>
//                     </View>
//                 )}


//                 {/* Notes */}
//                 {notes ? (
//                     <View style={styles.card}>
//                         <Text style={styles.tableTitle}>Notes</Text>
//                         <Text style={styles.notesText}>{notes}</Text>
//                     </View>
//                 ) : null}
// {/* SEND BUTTON */}
// <View style={{ marginTop: 20, marginBottom: 60 }}>
//   <TouchableOpacity
//     style={{
//       backgroundColor: "#007AFF",
//       paddingVertical: 14,
//       borderRadius: 10,
//       alignItems: "center",
//     }}
//     onPress={() => handleSendTimesheet(timesheetId)}
//   >
//     <Text style={{ color: "#fff", fontSize: 16, fontWeight: "600" }}>
//       Send To Supervisor
//     </Text>
//   </TouchableOpacity>
// </View>


//             </ScrollView>
//         </SafeAreaView>
//     );
    
// };


// // --- FIXED WIDTHS (for perfect tablet behavior) ---
// // Note: Constants are defined globally above the component where they are used.

// const styles = StyleSheet.create({

//   safeArea: {
//     flex: 1,
//     backgroundColor: THEME.background,
//     width: '100%',
//   },

//   centered: { flex: 1, justifyContent: 'center', alignItems: 'center' },

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

//   phaseSelectorContainer: { marginVertical: THEME.SPACING / 2 },

//   phaseButton: {
//     paddingHorizontal: 20,
//     paddingVertical: 10,
//     marginRight: 10,
//     borderRadius: 20,
//     backgroundColor: THEME.card,
//     borderWidth: 1,
//     borderColor: THEME.border,
//   },
//   selectedPhaseButton: { backgroundColor: THEME.primary, borderColor: THEME.primary },

//   phaseButtonText: { color: THEME.text, fontWeight: '600', fontSize: 16 },
//   selectedPhaseButtonText: { color: '#FFF' },

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

//   // Table container (dynamic width based on # of phases)
//   tableContainer: {
//     borderWidth: 1,
//     borderColor: THEME.border,
//     borderRadius: 8,
//     overflow: 'hidden',
//   },

//   // FIXED COLUMN WIDTHS
//   colName: { 
//     width: COL_NAME, 
//     textAlign: 'left', // Set text alignment to left for better multi-line readability
//     paddingLeft: 8,   // Add left padding to improve text spacing
//   },
//   colId: { width: COL_ID }, // NEW ID Column Style
//   colClassCode: { width: COL_CLASS },
//   colMaterial: { width: COL_MATERIAL }, // NEW Material Column Style
//   colHoursSimple: { width: COL_SIMPLE_HOUR }, // Used by Material/Vendor/Dumping for Qty/Hours
//   colHoursEquipment: { width: COL_EQUIP },
//   colTickets: { width: COL_TICKET },
//   colTotal: { width: COL_TOTAL },
//   colStartStop: { width: COL_START_STOP }, // NEW: Start/Stop Hours Column

//   dynamicPhaseColEmployee: { // NEW STYLE for Employee Hours
//     flexDirection: 'row',
//     alignItems: 'stretch',
//     width: COL_EMPLOYEE_HOUR, // 90px
//   },

//   dynamicPhaseColSimple: {
//     flexDirection: 'row',
//     alignItems: 'stretch',
//     // Width is COL_SIMPLE_HOUR (Hours/Qty) + COL_TICKET (Tickets/Loads)
//     width: COL_SIMPLE_HOUR, 
//   },

//   dynamicPhaseColEquipment: {
//     flexDirection: 'row',
//     alignItems: 'stretch',
//     // Width is COL_EQUIP (REG) + COL_EQUIP (S.B)
//     width: COL_EQUIP * 2, 
//   },
  
//   // For phase separation
//   phaseGroupBorderRight: {
//       borderRightWidth: 1,
//       borderRightColor: THEME.border,
//   },


//   tableRow: {
//     flexDirection: 'row',
//     alignItems: 'stretch', // CRITICAL FIX: Ensures all children stretch to the height of the tallest child
//     borderTopWidth: 1,
//     borderTopColor: THEME.border,
//   },

//   tableRowAlternate: { backgroundColor: THEME.rowAlternateBg },

//   borderRight: { borderRightWidth: 1, borderRightColor: THEME.border },
//   borderLeft: { borderLeftWidth: 1, borderLeftColor: THEME.border }, 
//   lastCell: { borderRightWidth: 0 },
// valueText: {
//     fontSize: 12,
//     color: THEME.text,
//     textAlign: 'center',

  
// },
//   dataCell: {
//     paddingVertical: 8,
//     paddingHorizontal: 4,
//     color: THEME.text,
//     fontSize: 12,
//     textAlign: 'center',
//     borderRightWidth: 1,
//     borderRightColor: THEME.border,
//     minHeight: 40,
//     // Removed justifyContent and alignItems as alignItems: 'stretch' on the parent handles the vertical extent
//     // and padding handles the internal spacing.
//   },

//   tableHeader: {
//     flexDirection: 'row',
//     backgroundColor: THEME.tableHeaderBg,
//     minHeight: 55, // Increased for larger font
//   },
  
//   // NEW STYLE: For the conditional horizontal line
//   headerCellBottomBorder: {
//       borderBottomWidth: 1,
//       borderBottomColor: THEME.border,
//   },
// noBorderRight: {
//     borderRightWidth: 0
// },

//   headerCell: {
//     paddingVertical: 10,
//     fontWeight: '700',
//     color: THEME.text,
//     fontSize: 10,
//     textAlign: 'center',
//     borderRightWidth: 1,
//     borderRightColor: THEME.border,
//     paddingTop: 31, // To align content below the new 31px phase header
//     minHeight: 55, // Keep minHeight
//     borderBottomWidth: 0, // Keep 0
//   },

//   phaseHeaderCellText: {
//     position: 'absolute',
//     top: 0,
//     left: 0,
//     // FIX APPLIED HERE
//     width: '100%', // Ensures it spans the entire parent width
//     right: -1,     // Overlaps the right border of the parent container to close the gap
//     paddingVertical: 4,
//     fontWeight: '700',
//     color: THEME.text,
//     fontSize: 12, 
//     textAlign: 'center',
//     backgroundColor: THEME.tableHeaderBg,
//     zIndex: 1,
//     height: 31, // 30 + 1px border
//     // The visible horizontal line
//     borderBottomWidth: 1, 
//     borderBottomColor: THEME.border,
//   },

//   equipmentPhaseSubHeader: {
//     flexDirection: 'row',
//     flex: 1,
//     marginTop: 31, // To align below the new 31px phase header
//     minHeight: 24, // 55 total - 31 phase area
//   },

//   equipmentSubHeaderCell: {
//     flex: 1,
//     borderTopWidth: 0,
//     paddingVertical: 5, // Ensures vertical centering in the 24px space
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
// phaseTotalLabelAlignment: {
//     textAlign: 'right',
//     paddingRight: 8, // Spacing from the right border of the column
//     paddingLeft: 4,  // Override colName's paddingLeft: 8 to push content right
//   },
//   phaseTotalSubRow: {
//     flexDirection: 'row',
//     alignItems: 'center',
//   },

//   quantityRow: {
//     flexDirection: 'row',
//     justifyContent: 'space-between',
//     alignItems: 'center',
//     marginTop: 10,
//   },

//   quantityLabel: { fontSize: 16, color: THEME.textSecondary, fontWeight: '500' },

//   totalBox: {
//     paddingHorizontal: 15,
//     paddingVertical: 8,
//     backgroundColor: THEME.primary,
//     borderRadius: 8,
//     minWidth: 80,
//     alignItems: 'center',
//   },

//   totalText: { fontSize: 18, fontWeight: 'bold', color: THEME.card },

//   notesText: {
//     fontSize: 15,
//     color: THEME.text,
//     lineHeight: 22,
//     marginTop: 5,
//   },
// });


// export default ForemanTimesheetViewScreen ;

import React, { useEffect, useState } from 'react';
import {
    View,
    Text,
    StyleSheet,
    ScrollView,
    ActivityIndicator,
    SafeAreaView,
    TouchableOpacity,
    Alert,
    Dimensions, // Import Dimensions for potential future use or dynamic checks
}
from 'react-native';
import { RouteProp, useRoute } from '@react-navigation/native';
import apiClient from '../../api/apiClient';
import type { SupervisorStackParamList } from '../../navigation/AppNavigator';
import type { Timesheet } from '../../types'; // NOTE: Assuming this path is correct
import axios from "axios";

// --- Type Definitions ---
type SimpleHourState = Record<string, Record<string, string>>;
// EmployeeHourState is complex: { empId: { phaseCode: { classCode: '5' } } }
type EmployeeHourState = Record<string, Record<string, Record<string, string>>>;
type ComplexHourSubState = { REG?: string; 'S.B'?: string };
// ComplexHourState is for Equipment: { equipmentId: { phaseCode: { REG: '5', 'S.B': '1' } } }
type ComplexHourState = Record<string, Record<string, ComplexHourSubState>>;
type QuantityState = Record<string, string>;
type UnitState = Record<string, string | null>;
type ReviewRouteProp = RouteProp<SupervisorStackParamList, 'TimesheetReview'>;


// --- Theme Constants ---
const THEME = {
    primary: '#007AFF',
    background: '#F0F0F7',
    card: '#FFFFFF',
    text: '#1C1C1E',
    textSecondary: '#6A6A6A',
    border: '#999999', // 1. Changed to a darker color for better contrast
    tableHeaderBg: '#F8F8F8',
    rowAlternateBg: '#FCFCFC',
    SPACING: 16,
};
type TableCategory =
  | "employee"
  | "equipment"
  | "material"
  | "vendor"
  | "dumping_site";

// --- FIXED WIDTHS (for perfect tablet behavior) ---
const COL_NAME = 160;
const COL_ID = 70;              // NEW: Width for EMP# and EQUIP #ER / Vendor ID
const COL_CLASS = 80;
const COL_MATERIAL = 130;       // ADDED: Width for Material Name column (Material/Vendor/Dumping tables)
const COL_EMPLOYEE_HOUR = 110;   // Employee hours column width 
const COL_SIMPLE_HOUR = 110;    // Used for Material/Vendor/Dumping Qty/Hours
const COL_EQUIP = 110;          // Used for Equipment REG/S.B (per column)
const COL_TICKET = 110;         // Used for Tickets/Loads
const COL_TOTAL = 100;
const COL_START_STOP = 70;      // NEW: Width for Start Hours / Stop Hours columns

const getPhaseGroupWidth = (type: TableCategory): number => {
  if (type === "equipment") return COL_EQUIP * 2; // REG + S.B
  if (type === "employee") return COL_EMPLOYEE_HOUR;       // Use 90px for employee hours only
  // material, vendor, dumping_site → simple (quantity + tickets)
  return COL_SIMPLE_HOUR; // Use 110px + 110px for simple tables
};

const ForemanTimesheetViewScreen = ({ navigation, route }: any) => {
    const { timesheetId } = route.params;
    // Timesheet type is extended with supervisor_id and supervisor object for local state consistency
    const [timesheet, setTimesheet] = useState<(Timesheet & { 
        supervisor_id?: number | string | null; 
        supervisor?: { id: number | string, name: string } | null; 
    }) | null>(null);
    const [foremanName, setForemanName] = useState<string>('');
    const [supervisorName, setSupervisorName] = useState<string>(''); 
    // The table rendering is now multi-phase. selectedPhase is only used for the TABS and Total Quantity block.
    const [selectedPhase, setSelectedPhase] = useState<string | null>(null); 
    const [loading, setLoading] = useState(true);


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
    const [dumpingSiteHours, setDumpingSiteHours] = useState<SimpleHourState>({});
    const [dumpingSiteTickets, setDumpingSiteTickets] = useState<SimpleHourState>({});


    useEffect(() => {
        const fetchData = async () => {
            try {
                // Assert tsData to include supervisor_id and supervisor object
                const response = await apiClient.get<Timesheet>(`/api/timesheets/${timesheetId}`);
                const tsData = response.data as Timesheet & { 
                    supervisor_id?: number | string | null; 
                    supervisor?: { id: number | string, name: string } | null;
                };
                setTimesheet(tsData);

                if (tsData.data.job.phase_codes?.length > 0) {
                    setSelectedPhase(tsData.data.job.phase_codes[0]);
                }
                
                setNotes(tsData.data.notes || '');


                // ⭐️ FIX 1: Corrected populateSimple to use a composite key for vendors
                const populateSimple = (entities: any[] = [], field: 'hours_per_phase' | 'tickets_per_phase', type?: 'material' | 'vendor' | 'dumping_site'): SimpleHourState => {
                    const state: SimpleHourState = {};
                    entities.forEach((e) => {
                        let id;
                        if (type === 'material') {
                            // Key based on name/id/key/vendor_id
                            id = e.name || e.id || e.key || e.vendor_id; 
                        } else if (type === 'vendor') { 
                            // FIX: Create a unique composite key for vendor materials (VendorID_UniqueLineItemKey)
                            const vendorId = e.vendor_id || e.id;
                            // Use e.key (likely a unique internal ID) or e.material_name/e.name as the unique part
                            const uniqueLineItemKey = e.key || e.material_name || e.name || e.id;

                            // Use a composite key (e.g., '1465_P. Gravel')
                            // This ensures each material is stored distinctly in the state object.
                            id = (vendorId && uniqueLineItemKey) ? `${vendorId}_${uniqueLineItemKey}` : e.id || e.name || e.key || e.vendor_id;

                        } else {
                            // Keep the standard priority (ID > Name) for dumping_site
                            id = e.id || e.name || e.key || e.vendor_id; 
                        }
                        
                        state[id] = {};
                        
                        // ⭐️ NEW FIX: Handle material/trucking tickets AND vendor tickets AND DUMPING SITE TICKETS ⭐️
                        let phaseDataToProcess: Record<string, any> = e[field] || {};
                        
                        // Check if it's tickets for material, vendor OR dumping_site, and the preferred tickets_per_phase is empty
                        if ((type === 'material' || type === 'vendor' || type === 'dumping_site') && field === 'tickets_per_phase' && Object.keys(phaseDataToProcess).length === 0) {
                            
                            let ticketValue: number | string | undefined = 0;
                            const rawTicketsLoads = e.tickets_loads; // Can be number, string, or object.

                            // --- UNIFIED FIX: Handle object or scalar value for ticket/load count ---
                            if (typeof rawTicketsLoads === 'object' && rawTicketsLoads !== null) {
                                // If it's an object (e.g., {"job_code_id": 5}), extract the first value.
                                // FIX APPLIED: Add type assertion to resolve 'unknown'
                                ticketValue = Object.values(rawTicketsLoads)?.[0] as (string | number | undefined); 
                            } else {
                                // If it's a simple number or string (e.g., 5 or "5").
                                ticketValue = rawTicketsLoads;
                            }
                            
                            // Safely parse the value to a number
                            const numericTicketValue = parseFloat(String(ticketValue || '0')) || 0;
                            // --- END UNIFIED FIX ---

                            // Use the phases from hours_per_phase to create the ticket breakdown
                            if (e.hours_per_phase && typeof e.hours_per_phase === 'object' && numericTicketValue > 0) {
                                
                                Object.keys(e.hours_per_phase).forEach(phase => {
                                    // Assign the total ticket value (e.g., 5) to all phases
                                    // Using String() to ensure it is stored as a string.
                                    state[id][phase] = String(numericTicketValue); 
                                });
                                return; // Done populating this entity
                            }
                        }
                        // ⭐️ END NEW FIX ⭐️

                        const data = phaseDataToProcess; // Use the determined data
                        
                        Object.entries(data).forEach(([phase, val]) => {
                            state[id][phase] = String(val || '0');
                        });
                    });
                    return state;
                };


                const populateUnits = (entities: any[] = []): UnitState => {
                    const state: UnitState = {};
                    entities.forEach(e => {
                        // Get the ID from the metadata object (same logic as populateSimple for consistency)
                        const id = e.id || e.name || e.key; 
                        // The 'unit' property is nested inside 'selectedMaterials' in the metadata object
                        const unit = e.selectedMaterials?.[0]?.unit || e.unit || null; 
                        state[id] = unit;
                    });
                    return state;
                };

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
                                    // Handle S_B being used in API response (convert to S.B)
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

                // CRITICAL: Ensure we use the correct keys for fetching the formatted data arrays
                setEmployeeHours(populateEmployeeComplex(tsData.data.employees));
                setEquipmentHours(populateEquipmentComplex(tsData.data.equipment));
                
                // FIX: Use the 'materials_trucking' array which contains the hour/ticket data.
                const formattedMaterials = tsData.data.materials_trucking || [];
                
                // FIX APPLIED HERE: Using tsData.data.vendors array (which has hours/tickets).
                const formattedVendors = tsData.data.vendors || []; 
                
                // FIX: Use the 'dumping_sites' array which contains the hour/ticket data.
                const formattedDumpingSites = tsData.data.dumping_sites || []; 
                
                // PASSING 'material' TYPE TO FORCE NAME-BASED KEY LOOKUP
                setMaterialHours(populateSimple(formattedMaterials, 'hours_per_phase', 'material')); 
                setVendorHours(populateSimple(formattedVendors, 'hours_per_phase', 'vendor'));
                setMaterialTickets(populateSimple(formattedMaterials, 'tickets_per_phase', 'material')); // FIX APPLIED HERE
                setVendorTickets(populateSimple(formattedVendors, 'tickets_per_phase', 'vendor'));
                
                // Use metadata objects for units as they contain the 'selectedMaterials' array with the unit.
                const materialUnitsMetadata = Object.values(tsData.data.selected_material_items || {});
                const vendorUnitsMetadata = Object.values(tsData.data.selected_vendor_materials || {});
                
                setMaterialUnits(populateUnits(materialUnitsMetadata));
                setVendorUnits(populateUnits(vendorUnitsMetadata));
                
                // This now uses the array with valid data
                setDumpingSiteHours(populateSimple(formattedDumpingSites, 'hours_per_phase', 'dumping_site'));
                setDumpingSiteTickets(populateSimple(formattedDumpingSites, 'tickets_per_phase', 'dumping_site'));

if (tsData.data.total_quantities) {
    const q: QuantityState = {};

    for (const phase in tsData.data.total_quantities) {
        q[phase] = tsData.data.total_quantities[phase].toString();
    }

    setTotalQuantities(q);
}



                const userRes = await apiClient.get(`/api/users/${tsData.foreman_id}`);
                setForemanName(`${userRes.data.first_name} ${userRes.data.last_name}`.trim());
// SUPERVISOR NAME
let supervisorName = "N/A";

console.log("Supervisor raw:", tsData.data.supervisor);

if (typeof tsData.data.supervisor === "string" && tsData.data.supervisor.trim() !== "") {
  supervisorName = tsData.data.supervisor;
} 
else if (typeof tsData.data.supervisor === "object" && tsData.data.supervisor?.name) {
  supervisorName = tsData.data.supervisor.name;
}

console.log("Supervisor Name Final:", supervisorName);

setSupervisorName(supervisorName);

            } catch (error) {
                console.error('Failed to load timesheet:', error);
                Alert.alert('Error', 'Failed to load timesheet data.');
            } finally {
                setLoading(false);
            }
        };
        fetchData();
    }, [timesheetId]);


    // --- Calculation Functions ---


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


// ⭐️ FIX: Uses the general logic which sums all line items, now that populateSimple creates unique keys for each line item.
const calculateSimplePhaseTotals = (
  state: SimpleHourState, 
  phaseCodes: string[], 
  type: string  // Pass the table type
): Record<string, number> => {
  const totals: Record<string, number> = {};
phaseCodes.forEach(p => { totals[p] = 0 });

  // This general logic correctly sums all line items for all simple tables.
  Object.values(state).forEach((perEntity) => {
    Object.entries(perEntity).forEach(([phase, value]) => {
      if (totals[phase] !== undefined) {
        totals[phase] += parseFloat(value) || 0;
      }
    });
  });
  
  return totals;
};

    
    // ComplexPhaseTotals (for Equipment)
    const calculateComplexPhaseTotals = (state: ComplexHourState, phaseCodes: string[]): Record<string, { REG: number, 'S.B': number }> => {
        const totals: Record<string, { REG: number, 'S.B': number }> = {};
        phaseCodes.forEach(p => { totals[p] = { REG: 0, 'S.B': 0 } });
        Object.values(state).forEach((perEntity) => {
            Object.entries(perEntity).forEach(([phase, value]) => {
                if (totals[phase]) {
                    totals[phase].REG += parseFloat(value.REG || '0');
                    totals[phase]['S.B'] += parseFloat(value['S.B'] || '0');
                }
            });
        });
        return totals;
    };


    // Employee Phase Total
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


    // --- Table Renderer Component ---
const handleSendTimesheet = async (timesheetId: number) => {
  Alert.alert(
    "Confirm Submission",
    "Are you sure you want to send this timesheet?",
    [
      { text: "Cancel", style: "cancel" },
      {
        text: "Send",
        onPress: async () => {
          setLoading(true);
          try {
            await apiClient.post(`/api/timesheets/${timesheetId}/send`);

            Alert.alert("Success", "Timesheet has been sent.");
            navigation.navigate("TimesheetList", { refresh: true });

          } catch (error: any) {
            console.error("Send timesheet error:", error);

            Alert.alert(
              "Error",
              error.response?.data?.detail || "Could not send the timesheet."
            );
          } finally {
            setLoading(false);
          }
        },
        style: "destructive",
      },
    ]
  );
};
    const renderTableBlock = (
        title: string,
        entities: any[],
        hoursState: SimpleHourState | ComplexHourState | EmployeeHourState,
        ticketsState: SimpleHourState | undefined,
        type: 'employee' | 'equipment' | 'material' | 'vendor' | 'dumping_site',
        unitState: UnitState | undefined,
    ) => {
        if (!entities || entities.length === 0) return null;

        const isEmployee = type === 'employee';
        const isEquipment = type === 'equipment';
        const isMaterial = type === 'material';
        const isVendor = type === 'vendor'; // ADDED: Variable for vendor type
        const isSimple = isMaterial || isVendor || type === 'dumping_site';
        const isDumping = type === 'dumping_site'; // Added isDumping for clarity

        const phaseCodes = timesheet?.data.job.phase_codes || [];
        // Even if there are no phases, we can't render the table structure correctly
        if (phaseCodes.length === 0) return null; 

        // --- Totals Calculation (Pre-calculate all phase totals for the footer) ---
        let employeePhaseTotals: Record<string, number> = {};
        let equipmentPhaseTotals: Record<string, { REG: number, 'S.B': number }> = {};
        let simplePhaseTotals: Record<string, number> = {};
        let grandTotal = 0; // Grand Total for the entire table

        // Only calculate totals for the phases present in the timesheet
        if (isEmployee) {
            phaseCodes.forEach(phase => {
                employeePhaseTotals[phase] = calculateEmployeePhaseTotal(hoursState as EmployeeHourState, phase);
            });
            // Calculate Grand Total for Employee
            grandTotal = entities.reduce((sum, e) => sum + calculateTotalEmployeeHours(hoursState as EmployeeHourState, e.id), 0);
        } else if (isEquipment) {
            equipmentPhaseTotals = calculateComplexPhaseTotals(hoursState as ComplexHourState, phaseCodes);
            // Calculate Grand Total for Equipment
            grandTotal = entities.reduce((sum, e) => sum + calculateTotalComplexHours(hoursState as ComplexHourState, e.id), 0);
        } else if (isSimple) { // This handles Material/Vendor/Dumping
simplePhaseTotals = calculateSimplePhaseTotals(
  hoursState as SimpleHourState, 
  phaseCodes, 
  type  // Pass the table type
);            // Calculate Grand Total for Simple Tables (Sum of Hours/Qty)
  // In renderTableBlock, replace the grand total calculation:
grandTotal = entities.reduce((sum, e) => {
  // For vendors, sum ALL vendorid entries to handle multiple materials
  if (type === 'vendor') {
    // ⭐️ FIX: Grand Total must use the composite key (same logic as below)
    const vendorId = e.vendor_id || e.id;
    const uniqueLineItemKey = e.key || e.material_name || e.name || e.id;
    const entityId = (vendorId && uniqueLineItemKey) ? `${vendorId}_${uniqueLineItemKey}` : e.id || e.name || e.key || e.vendor_id;
    
    // Sum across ALL phases for this composite key
    return sum + calculateTotalSimpleHours(hoursState as SimpleHourState, entityId);
  }
  // Existing logic for other simple types
  let entityId = type === 'material' ? e.name || e.id || e.key || e.vendor_id 
              : e.id || e.name || e.key || e.vendor_id;
  return sum + calculateTotalSimpleHours(hoursState as SimpleHourState, entityId);
}, 0);

        }
        // -------------------------------------------------------------------------

        // Calculate content width for minWidth
        const phaseGroupWidth = getPhaseGroupWidth(type);
        
        let fixedWidth = COL_NAME + COL_TOTAL;
        if (isEmployee) {
            // Name + EMP# + Class Code + Total
            fixedWidth += COL_ID + COL_CLASS;
        } else if (isEquipment) {
            // Name + EQUIP #ER + Start Hours + Stop Hours + Total
            fixedWidth += COL_ID + (COL_START_STOP * 2); 
        } else {
            // Simple tables: ID + NAME + [MATERIAL] + TICKETS + TOTAL
            
            // Add ID column for Material and Dumping Site (REQUESTED)
            if (isMaterial || isDumping) { // <-- MODIFIED FOR DUMPING SITE ID
                fixedWidth += COL_ID; // NEW: Adding COL_ID for material/dumping
            }
            
            // Add Vendor ID column for Vendor (this is distinct from Material/Dumping ID)
            if (isVendor) {
                 fixedWidth += COL_ID; 
            }

            // Add Material/Description column for Vendor ONLY (REQUESTED CHANGE)
            if (isVendor) { 
                fixedWidth += COL_MATERIAL;
            }

            // Add Tickets column
            fixedWidth += COL_TICKET;
        }
        
        // Calculate total content width by multiplying phase group width by the number of phases
        const contentWidth = fixedWidth + phaseGroupWidth * phaseCodes.length;

        // Custom Employee Table Renderer
        const renderEmployeeTableBody = () => {
            return entities.flatMap((entity, index) => {
                const totalHours = calculateTotalEmployeeHours(hoursState as EmployeeHourState, entity.id);
                const showReason = totalHours === 0 && entity.reason
                const entityName = `${entity.first_name} ${entity.last_name}`.trim();

                // Collect all unique class codes that have hours logged OR are assigned
                const classCodesUsed: Set<string> = new Set();
                phaseCodes.forEach(phase => {
                    const phaseHours = (hoursState as EmployeeHourState)[entity.id]?.[phase];
                    if (phaseHours) {
                        Object.keys(phaseHours).forEach(code => {
                            if (parseFloat(phaseHours[code] || '0') > 0) {
                                classCodesUsed.add(code);
                            }
                        });
                    }
                });
                
                // Also include assigned class codes even if hours are zero
                if (entity.class_1) classCodesUsed.add(entity.class_1);
                if (entity.class_2) classCodesUsed.add(entity.class_2);
                
                const classCodesToDisplay = Array.from(classCodesUsed).sort();


                // If no class codes or no hours logged, show a single zero row
                if (classCodesToDisplay.length === 0 && totalHours === 0) {
                    return (
                        <View key={`${entity.id}-default`} style={[styles.tableRow, index % 2 === 1 && styles.tableRowAlternate]}>
                            <Text style={[styles.dataCell, styles.colName, styles.borderRight]}>{entityName}</Text>
                            
                            {/* NEW EMP# COLUMN (Always present for employee table) */}
                            <Text style={[styles.dataCell, styles.colId, styles.borderRight]}>{entity.id}</Text>
                            
                            <Text style={[styles.dataCell, styles.colClassCode, styles.borderRight]}>N/A</Text>
                            
                            {/* Dynamic Hours Columns per Phase (all 0) */}
                            {phaseCodes.map((phase, phaseIndex) => {
                                const isLastPhase = phaseIndex === phaseCodes.length - 1;
                                const phaseBorder = isLastPhase ? {} : styles.phaseGroupBorderRight;
                                
                                return (
                                    <View key={phase} style={[styles.dynamicPhaseColEmployee, phaseBorder]}>
                                        {/* Use flex: 1 to fill the 90px container */}
                                        <Text style={[styles.dataCell, { flex: 1 }, styles.lastCell]}>0.0</Text>
                                    </View>
                                );
                            })}

                            <Text style={[styles.dataCell, styles.colTotal, styles.lastCell, styles.borderLeft]}>{totalHours.toFixed(1)}</Text>
                        </View>
                        
                    );
                    
                }

                // Render a row for each class code used/assigned
                return classCodesToDisplay.map((classCode, classIndex) => {
                    const isFirstClassRow = classIndex === 0;

                    return (
                        <View key={`${entity.id}-${classCode}`} style={[styles.tableRow, index % 2 === 1 && styles.tableRowAlternate]}>
                            {/* Show name only in the first row for this employee. */}
                            {/* NAME CELL (first row shows name + optional reason) */}
<View
  style={[
    styles.dataCell,
    styles.colName,
    styles.borderRight,
    !isFirstClassRow && styles.transparentCell
  ]}
>
  {isFirstClassRow && (
    <View style={{ paddingVertical: 2 }}>
      <Text style={{ fontSize: 14, fontWeight: '500' }} numberOfLines={2}>
        {entityName}
      </Text>

      {/* Reason stays INSIDE same cell */}
      {showReason && (
        <Text
          style={{
            fontSize: 13,
            color: '#ac4545ff',
            fontWeight: '500',
            fontStyle: 'italic',
            marginTop: 3
          }}
        >
          Reason: {entity.reason}
        </Text>
      )}
    </View>
  )}
</View>

                            {/* NEW EMP# COLUMN (Show only in the first row) */}
                            <Text style={[styles.dataCell, styles.colId, styles.borderRight, isFirstClassRow ? null : styles.transparentCell]}>
                                {isFirstClassRow ? entity.id : ''}
                            </Text>

                            <Text style={[styles.dataCell, styles.colClassCode, styles.borderRight]}>{classCode}</Text>

                            {/* Dynamic Hours Columns per Phase */}
                            {phaseCodes.map((phase, phaseIndex) => {
                                const phaseHours = (hoursState as EmployeeHourState)[entity.id]?.[phase];
                                const hours = parseFloat(phaseHours?.[classCode] || '0');
                                const displayHours = entity.reason ? '–' : hours > 0 ? hours.toFixed(1) : '';
                                const isLastPhase = phaseIndex === phaseCodes.length - 1;
                                const phaseBorder = isLastPhase ? {} : styles.phaseGroupBorderRight;

                                return (
                                    // Employee uses the narrow column width
                                    <View 
                                        key={phase} 
                                        style={[
                                            styles.dynamicPhaseColEmployee, // Use the new narrow style
                                            phaseBorder, // Apply phase separation border
                                        ]}
                                    > 
                                        {/* Use flex: 1 to fill the 90px container */}
                                        <Text style={[styles.dataCell, { flex: 1 }, styles.lastCell]}>
                                            {displayHours} {/* Show empty string for 0 */}
                                        </Text>
                                    </View>
                                );
                            })}
                            
                            {/* Show total hours only in the first row for this employee */}
                            <Text style={[styles.dataCell, styles.colTotal, styles.lastCell, styles.borderLeft, isFirstClassRow ? null : styles.transparentCell]}>
                                {isFirstClassRow ? totalHours.toFixed(1) : ''}
                            </Text>
                        </View>
                    );
                });
            });
        };
        // End of Custom Employee Table Renderer
        
        // --- NEW: Grouping variable for simple tables (must be outside the map, but inside renderTableBlock) ---
        let lastEntityName = '';


        return (
            <View style={styles.card}>
                <Text style={styles.tableTitle}>{title}</Text>
                {/* CRITICAL FIX: Add ScrollView horizontal to enable scrolling when content width > screen width */}
                <ScrollView horizontal showsHorizontalScrollIndicator={true}> 
                    <View style={[styles.tableContainer, { minWidth: contentWidth }]}>

                        
                        {/* -------------------- TABLE HEADER START (DYNAMIC) -------------------- */}
                        <View style={styles.tableHeader}>
                            
                            {/* NEW ID COLUMN FOR MATERIAL/DUMPING SITE TYPE (FIRST COLUMN) */}
                            {/* MODIFIED: Added isDumping */}
                            {(isMaterial || isDumping) && ( 
                                <Text
                                    style={[
                                        styles.headerCell,
                                        styles.colId,
                                        styles.borderRight,
                                        styles.headerCellBottomBorder
                                    ]}
                                >
                                    ID
                                </Text>
                            )}

                            {/* 1. VENDOR ID COLUMN (Vendor Only - NEW FIRST COLUMN) */}
                            {isVendor && (
                                <Text 
                                    style={[
                                        styles.headerCell, 
                                        styles.colId, 
                                        styles.borderRight,
                                        styles.headerCellBottomBorder
                                    ]}
                                >
                                    Vendor ID
                                </Text>
                            )}
                            
                            {/* 2. NAME COLUMN (Always present - Second for Vendor/Material, First otherwise) */}
                            <Text 
                                style={[
                                    styles.headerCell, 
                                    styles.colName, 
                                    styles.borderRight,
                                    styles.headerCellBottomBorder // Simple tables start border here, so always add.
                                ]}
                            >
                                Name
                            </Text>
                            
                            {/* 3. FIXED ID/CLASS/START/STOP COLUMNS (Positioned after Name) */}

                            {/* NEW EMP# COLUMN (Employee only) */}
                            {isEmployee && (
                                <Text 
                                    style={[
                                        styles.headerCell, 
                                        styles.colId, 
                                        styles.borderRight,
                                        styles.headerCellBottomBorder
                                    ]}
                                >
                                    EMP#
                                </Text>
                            )}

                            {/* NEW EQUIP #ER COLUMN (Equipment only) */}
                            {isEquipment && (
                                <Text 
                                    style={[
                                        styles.headerCell, 
                                        styles.colId, 
                                        styles.borderRight,
                                        styles.headerCellBottomBorder
                                    ]}
                                >
                                    EQUIP #ER
                                </Text>
                            )}

                            {/* NEW START HOURS COLUMN (Equipment only) */}
                            {isEquipment && (
                                <Text 
                                    style={[
                                        styles.headerCell, 
                                        styles.colStartStop, 
                                        styles.borderRight,
                                        styles.headerCellBottomBorder
                                    ]}
                                >
                                    Start Hours
                                </Text>
                            )}

                            {/* NEW STOP HOURS COLUMN (Equipment only) */}
                            {isEquipment && (
                                <Text 
                                    style={[
                                        styles.headerCell, 
                                        styles.colStartStop, 
                                        styles.borderRight,
                                        styles.headerCellBottomBorder
                                    ]}
                                >
                                    Stop Hours
                                </Text>
                            )}
                            
                            {isEmployee && (
                                <Text 
                                    style={[
                                        styles.headerCell, 
                                        styles.colClassCode, 
                                        styles.borderRight,
                                        styles.headerCellBottomBorder // Employee table Class Code gets the border
                                    ]}
                                >
                                    Class Code
                                </Text>
                            )}

                            {/* 4. MATERIAL COLUMN (Simple tables only - Third column for Vendor) */}
                            {/* MODIFIED: Render ONLY for Vendor type, excluding Dumping Site */}
                            {isSimple && type === 'vendor' && (
                                <Text style={[
                                    styles.headerCell, 
                                    styles.colMaterial, 
                                    styles.borderRight, 
                                    styles.headerCellBottomBorder
                                ]}>
                                    Material
                                </Text>
                            )}

                            {/* 5. TICKETS COLUMN (Simple tables only - Fourth column for Vendor/Dumping, Third for Material) */}
                            {isSimple && (
                                <Text style={[
                                    styles.headerCell, 
                                    styles.colTickets, 
                                    styles.borderRight, 
                                    styles.headerCellBottomBorder
                                ]}>
                                    {type === "dumping_site" ? "# Loads" : "# Tickets"}
                                </Text>
                            )}


                            {/* DYNAMIC PHASE COLUMNS (These scroll) */}
                            {phaseCodes.map((phase, phaseIndex) => {
                                const isLastPhase = phaseIndex === phaseCodes.length - 1;
                                const phaseBorder = isLastPhase ? {} : styles.phaseGroupBorderRight;
                                
                                // Determine the correct dynamic style
                                const dynamicPhaseStyle = isEquipment 
                                    ? styles.dynamicPhaseColEquipment 
                                    : isEmployee 
                                        ? styles.dynamicPhaseColEmployee // Use the new narrow style for Employee
                                        : styles.dynamicPhaseColSimple;

                                return (
                                    <View 
                                        key={phase} 
                                        style={[
                                            dynamicPhaseStyle, // Use the determined style
                                            phaseBorder, // Apply phase separation border
                                        ]}
                                    >
                                        {/* Phase Code Text: positioned absolutely over the sub-columns. This now draws the line. */}
                                         {/* Phase Code */}
            <Text style={styles.phaseHeaderCellText}>{phase}</Text>
            {/* Only ONE cell under the phase code */}
           {!isEquipment && (
    <Text
        style={[
            styles.headerCell,
            styles.colHoursSimple,
            styles.lastCell,
            styles.headerCellBottomBorder
        ]}
    >
        {isEmployee ? 'Hours' : // Employee tables use 'Hours'
            type === 'material' ? 'Hours/Qty' :
            type === 'dumping_site' ? 'Loads' :
            'Quantity'}
    </Text>
)}

            {/* Equipment keeps 2 columns, leave unchanged */}
            {isEquipment && (
                <View style={styles.equipmentPhaseSubHeader}>
                    <Text style={[styles.headerCell, styles.colHoursEquipment, styles.equipmentSubHeaderCell, styles.borderRight, styles.headerCellBottomBorder]}>REG</Text>
                    <Text style={[styles.headerCell, styles.colHoursEquipment, styles.equipmentSubHeaderCell, styles.lastCell, styles.headerCellBottomBorder]}>S.B</Text>
                </View>
            )}
        </View>
    );
})}
                            
                            {/* Fixed column at the end - No bottom border to meet the request */}
                            <Text style={[styles.headerCell, styles.colTotal, styles.lastCell, styles.borderLeft, styles.headerCellBottomBorder]}>Total</Text>
                        </View>
                        {/* -------------------- TABLE HEADER END (DYNAMIC) -------------------- */}



                        {/* -------------------- TABLE BODY START (DYNAMIC) -------------------- */}
                        {isEmployee ? (
                            renderEmployeeTableBody()
                        ) : (
                        // --- LOGIC FOR EQUIPMENT/MATERIAL/VENDOR (NON-EMPLOYEE) ---
                            entities.map((entity, index) => {
                                let entityId;
                                // ⭐️ FIX 2: Re-create the composite key for the line item lookup
                                if (type === 'vendor') { 
                                    const vendorId = entity.vendor_id || entity.id;
                                    const uniqueLineItemKey = entity.key || entity.material_name || entity.name || entity.id;
                                    
                                    // RE-CREATE THE SAME COMPOSITE KEY USED IN populateSimple
                                    entityId = (vendorId && uniqueLineItemKey) 
                                        ? `${vendorId}_${uniqueLineItemKey}` 
                                        : entity.id || entity.name || entity.key || entity.vendor_id;
                                        
                                } else if (type === 'material') {
                                    entityId = entity.name || entity.id || entity.key || entity.vendor_id;
                                } else {
                                    entityId = entity.id || entity.name || entity.key || entity.vendor_id;
                                }

                                // ⭐️ NOTE: totalHours and totalTickets now also use the correct entityId lookup
                                const totalHours = isEquipment 
                                    ? calculateTotalComplexHours(hoursState as ComplexHourState, entityId)
                                    : calculateTotalSimpleHours(hoursState as SimpleHourState, entityId);
                                    
                                // ⭐️ TICKET FIX ⭐️
                                // Get total from phase breakdown
                                const totalPhaseTickets = isSimple && ticketsState 
                                    ? calculateTotalSimpleHours(ticketsState as SimpleHourState, entityId)
                                    : 0;
                                
                                // Get raw tickets_loads value, safely converting it to a number
                                
                                // --- UNIFIED FIX: Handle object or scalar value for ticket/load count (same logic as populateSimple) ---
                                let rawTicketsLoadsValue: number = 0;
                                const rawTicketsLoads = entity.tickets_loads; 
                                let ticketValue: number | string | undefined = 0;

                                if (typeof rawTicketsLoads === 'object' && rawTicketsLoads !== null) {
                                    // FIX APPLIED: Add type assertion to resolve 'unknown'
                                    ticketValue = Object.values(rawTicketsLoads)?.[0] as (string | number | undefined); 
                                } else {
                                    ticketValue = rawTicketsLoads;
                                }
                                rawTicketsLoadsValue = parseFloat(String(ticketValue || '0')) || 0;
                                // --- END UNIFIED FIX ---

                                // totalTickets is:
                                // 1. The sum of all phase tickets (if > 0)
                                // 2. The raw tickets_loads value (if totalPhaseTickets is 0 or less, and rawTicketsLoads > 0)
                                // 3. 0 otherwise
                                const totalTickets = totalPhaseTickets > 0 
                                    ? totalPhaseTickets 
                                    : (isSimple && rawTicketsLoadsValue > 0) ? rawTicketsLoadsValue : 0;
                                // ⭐️ END TICKET FIX ⭐️


                                // --- UPDATE lastEntityName for the next iteration ---
                                const entityName = (type === 'vendor')
                                    ? entity.vendor_name 
                                    : (type === 'material' || type === 'dumping_site')
                                        ? entity.name || entity.material_name 
                                        : entity.first_name
                                            ? `${entity.first_name} ${entity.middle_name || ''} ${entity.last_name}`.trim()
                                            : entity.name;
                                
                                // For Material and Vendor, group by the main name (material name or vendor name). 
                                // Dumping Site should show all line items (no grouping).
                                const shouldGroup = isMaterial || isVendor; // ADDED ISVENDOR HERE
                                
                                const isNewGroup = shouldGroup
                                    ? entityName !== lastEntityName
                                    : true; // Always show name for Dumping Site (since each entity is a line item)
                                    
                                // Equipment always shows its name/details
                                const shouldShowName = isNewGroup || isEquipment; 
                                
                                if (shouldGroup) { // Update lastEntityName for both Material and Vendor
                                    lastEntityName = entityName; 
                                }

                                return (
                                    <View key={entityId} style={[styles.tableRow, index % 2 === 1 && styles.tableRowAlternate]}>
                                        
                                        {/* NEW ID COLUMN FOR MATERIAL/DUMPING SITE TYPE (FIRST COLUMN) */}
                                        {/* MODIFIED: Added isDumping */}
                                        {(isMaterial || isDumping) && (
                                            <Text style={[styles.dataCell, styles.colId, styles.borderRight, shouldShowName ? null : styles.transparentCell]}>
                                                {/* entity.id is the Material/Dumping Site ID (fallback to key) */}
                                                {shouldShowName ? entity.id || entity.key : ''}
                                            </Text>
                                        )}

                                        
                                        {/* NEW VENDOR ID COLUMN (Vendor only - RENDERED FIRST for Vendor) */}
                                        {isVendor && (
                                            <Text style={[styles.dataCell, styles.colId, styles.borderRight, shouldShowName ? null : styles.transparentCell]}>
                                                {shouldShowName ? entity.vendor_id : ''}
                                            </Text>
                                        )}
                                        
                                        {/* NAME CELL (CONDITIONAL RENDER for Simple Tables - RENDERED SECOND for Material/Vendor) */}
                                        <View 
                                            style={[
                                                styles.dataCell, 
                                                styles.colName, 
                                                styles.borderRight,
                                            ]} 
                                        >
                                            {shouldShowName ? (
                                                <Text style={{ fontSize: 12, textAlign: 'left', color: THEME.text }} numberOfLines={2}>
                                                    {entityName}
                                                </Text>
                                            ) : null}
                                        </View>
                                        
                                        {/* NEW EQUIP #ER COLUMN (Equipment only) */}
                                        {isEquipment && (
                                            <Text style={[styles.dataCell, styles.colId, styles.borderRight]}>{entity.id}</Text>
                                        )}

                                        {/* NEW START HOURS COLUMN (Equipment only) */}
                                        {isEquipment && (
                                            <Text style={[styles.dataCell, styles.colStartStop, styles.borderRight]}>
                                                {/* Assuming start_hours exists on entity */}
                                                {entity.start_hours || ''} 
                                            </Text>
                                        )}

                                        {/* NEW STOP HOURS COLUMN (Equipment only) */}
                                        {isEquipment && (
                                            <Text style={[styles.dataCell, styles.colStartStop, styles.borderRight]}>
                                                {/* Assuming stop_hours exists on entity */}
                                                {entity.stop_hours || ''}
                                            </Text>
                                        )}
                                        
                                        {/* NEW MATERIAL NAME COLUMN (Simple tables only) - RENDERED THIRD for Vendor ONLY */}
                                        {/* MODIFIED: Render ONLY for Vendor type, excluding Dumping Site */}
                                        {isSimple && type === 'vendor' && (
                                            <Text style={[styles.dataCell, styles.colMaterial, styles.borderRight]} numberOfLines={2}>
                                                {entity.material_name || entity.name || ''} 
                                            </Text>
                                        )}
                                        
                                        {/* TICKETS COLUMN (Simple tables only) - RENDERED FOURTH for Vendor/Dumping, THIRD for Material */}
                                        {isSimple && (
                                            <Text style={[styles.dataCell, styles.colTickets, styles.borderRight]}>
                                                {/* Use toFixed(0) for integer display */}
                                                {totalTickets > 0 ? totalTickets.toFixed(0) : ''}
                                            </Text>
                                        )}

                                        {/* Dynamic Phase Columns */}
                                        {phaseCodes.map((phase, phaseIndex) => {
                                            const isLastPhase = phaseIndex === phaseCodes.length - 1;
                                            const phaseBorder = isLastPhase ? {} : styles.phaseGroupBorderRight;

                                            return (
                                                <View key={phase} style={[
                                                    isEquipment ? styles.dynamicPhaseColEquipment : (isEmployee ? styles.dynamicPhaseColEmployee : styles.dynamicPhaseColSimple),
                                                    phaseBorder, // Apply phase separation border
                                                ]}>
                                                    {isEquipment ? (
                                                        // Equipment: REG and S.B.
                                                        <>
                                                            <Text style={[styles.dataCell, styles.colHoursEquipment, styles.borderRight]}>
                                                                {parseFloat((hoursState as ComplexHourState)[entityId]?.[phase]?.REG ?? '0').toFixed(1)}
                                                            </Text>
                                                            <Text style={[styles.dataCell, styles.colHoursEquipment, styles.lastCell]}>
                                                                {parseFloat((hoursState as ComplexHourState)[entityId]?.[phase]?.['S.B'] ?? '0').toFixed(1)}
                                                            </Text>
                                                        </>
                                                    ) : (
                                                        // Simple Logic (Material/Vendor/Dumping)
                                                        <>
                                                            <Text style={[styles.dataCell, styles.colHoursSimple, styles.lastCell]}>
                                                                {/* THIS LOOKUP NOW USES THE CORRECT COMPOSITE entityId FOR VENDORS */}
                                                                {parseFloat((hoursState as SimpleHourState)[entityId]?.[phase] ?? '0').toFixed(1)}
                                                            </Text>
                                                            
                                                        </>
                                                    )}
                                                
                                                </View>
                                            )
                                        })}

                                        {/* 3. Added vertical line before total column (styles.borderLeft) */}
                                        <Text style={[styles.dataCell, styles.colTotal, styles.lastCell, styles.borderLeft]}>{totalHours.toFixed(1)}</Text>
                                    </View>
                                );
                            })
                        )}
                        {/* -------------------- TABLE BODY END (DYNAMIC) -------------------- */}


                        {/* -------------------- PHASE TOTALS ROW (DYNAMIC) -------------------- */}
                        <View style={[styles.tableRow, styles.phaseTotalRow]}>
                            
                            {/* NEW MATERIAL/DUMPING ID PLACEHOLDER (Material/Dumping only - FIRST COLUMN) */}
                            {/* MODIFIED: Added isDumping */}
                            {(isMaterial || isDumping) && (
                                <View style={[styles.dataCell, styles.colId, styles.borderRight]} />
                            )}
                            
                            {/* VENDOR ID PLACEHOLDER (Vendor only - FIRST COLUMN) */}
                            {isVendor && (
                                <View style={[styles.dataCell, styles.colId, styles.borderRight]} />
                            )}
                            
                            {/* NAME CELL (ALWAYS FIRST/SECOND COLUMN - HOLDS LABEL) */}
                            <Text style={[
                                styles.dataCell, 
                                styles.colName, 
                                styles.phaseTotalText,
                                styles.borderRight, 
                                styles.phaseTotalLabelAlignment
                            ]}>
                                Phase Total
                            </Text>

                            {/* ID Column Placeholder (Employee/Equipment only - Third/Second column) */}
                            {(isEmployee || isEquipment) && (
                                <View style={[styles.dataCell, styles.colId, styles.borderRight]} /> 
                            )}
                            
                            {/* NEW START HOURS PLACEHOLDER (Equipment only) */}
                            {isEquipment && (
                                <View style={[styles.dataCell, styles.colStartStop, styles.borderRight]} /> 
                            )}

                            {/* NEW STOP HOURS PLACEHOLDER (Equipment only) */}
                            {isEquipment && (
                                <View style={[styles.dataCell, styles.colStartStop, styles.borderRight]} /> 
                            )}
                            
                            {/* Class Code Placeholder (Employee only) */}
                            {isEmployee && (
                                <View style={[styles.dataCell, styles.colClassCode, styles.borderRight]} /> 
                            )}

                            {/* MATERIAL COLUMN PLACEHOLDER (Simple tables only - Third column for Vendor ONLY) */}
                            {/* MODIFIED: Render ONLY for Vendor type, excluding Dumping Site */}
                            {isSimple && type === 'vendor' && (
                                <View style={[styles.dataCell, styles.colMaterial, styles.borderRight]} />
                            )}
                           
                            {/* TICKETS COLUMN PLACEHOLDER (Simple tables only - Fourth column for Vendor/Dumping, Third for Material) */}
                            {isSimple && (
                                <View style={[styles.dataCell, styles.colTickets, styles.borderRight]} />
                            )}
                            
                            {phaseCodes.map((phase, phaseIndex) => {
                                const isLastPhase = phaseIndex === phaseCodes.length - 1;
                                const phaseBorder = isLastPhase ? {} : styles.phaseGroupBorderRight;

                                // Determine the correct dynamic style
                                const dynamicPhaseStyle = isEquipment 
                                    ? styles.dynamicPhaseColEquipment 
                                    : isEmployee 
                                        ? styles.dynamicPhaseColEmployee 
                                        : styles.dynamicPhaseColSimple;

                                return (
                                    <View 
                                        key={phase} 
                                        style={[
                                            dynamicPhaseStyle,
                                            phaseBorder, // Apply phase separation border
                                        ]}
                                    >
                                        {isEmployee ? (
                                            // FIX: Removed the unnecessary 'phaseTotalSubRow' wrapper. 
                                            // The Text element now directly fills the 'dynamicPhaseColEmployee' View.
                                            <Text style={[styles.dataCell, { flex: 1 }, styles.phaseTotalText]}>
                                                {(employeePhaseTotals[phase] || 0).toFixed(1)}
                                            </Text>
                                           
                                        ) : isEquipment ? (
                                            <View style={styles.phaseTotalSubRow}>
                                                <Text style={[styles.dataCell, styles.colHoursEquipment, styles.phaseTotalText, styles.borderRight]}>
                                                    {(equipmentPhaseTotals[phase]?.REG || 0).toFixed(1)}
                                                </Text>
                                                <Text style={[styles.dataCell, styles.colHoursEquipment, styles.phaseTotalText, styles.lastCell]}>
                                                    {(equipmentPhaseTotals[phase]?.['S.B'] || 0).toFixed(1)}
                                                </Text>
                                            </View>
                                        ) : isSimple ? (
    <View style={styles.phaseTotalSubRow}>
       <Text style={[
            styles.dataCell,
            styles.colHoursSimple,
            styles.phaseTotalText,
            // Simple tables only have one cell under the phase code, so it is the last cell.
            styles.lastCell,
        ]}>
            {(simplePhaseTotals[phase] || 0).toFixed(1)}
        </Text>
    </View>
) : null}

                                    </View>
                                );
                            })}
                            
                            {/* Total Column placeholder */}
                            <View style={[styles.dataCell, styles.colTotal, styles.lastCell, styles.borderLeft]} />
                           
                        </View>
                        {/* -------------------- PHASE TOTALS ROW END -------------------- */}


                    </View>
                </ScrollView>
            </View>
        );
    };


    if (loading) return <ActivityIndicator size="large" style={styles.centered} />;
    if (!timesheet) return <View style={styles.centered}><Text>Timesheet not found.</Text></View>;


    const { data, date } = timesheet;

    // NOTE: formattedMaterials is now correctly using the materials_trucking array (the data source)
    const formattedMaterials = data.materials_trucking || [];
    // The vendor data source is now corrected to the array with hours/tickets.
    const formattedVendors = data.vendors || [];
    const formattedDumpingSites = data.dumping_sites || [];

    return (
        <SafeAreaView style={styles.safeArea}>
            <ScrollView contentContainerStyle={{ padding: THEME.SPACING, paddingBottom: 50 }}>
                {/* Info Card */}
                <View style={styles.infoCard}>
                    <Text style={styles.jobTitle}>{data.job_name}</Text>
                    <Text style={styles.jobCode}>Job Code: {data.job.job_code}</Text>
                    <View style={styles.infoGrid}>
                        <View style={styles.infoItem}><Text style={styles.infoLabel}>Date</Text><Text style={styles.infoValue}>{new Date(date).toLocaleDateString()}</Text></View>
                        <View style={styles.infoItem}><Text style={styles.infoLabel}>Foreman</Text><Text style={styles.infoValue}>{foremanName}</Text></View>
                        {/* Supervisor Name Display */}
<View style={styles.infoItem}>
    <Text style={styles.infoLabel}>Supervisor</Text>
    <Text style={styles.infoValue}>{supervisorName}</Text>
</View>
                        <View style={styles.infoItem}><Text style={styles.infoLabel}>Project Engineer</Text><Text style={styles.infoValue}>{data.project_engineer || 'N/A'}</Text></View>
                        <View style={styles.infoItem}><Text style={styles.infoLabel}>Day/Night</Text><Text style={styles.infoValue}>{data.time_of_day || 'N/A'}</Text></View>
                        <View style={styles.infoItem}><Text style={styles.infoLabel}>Location</Text><Text style={styles.infoValue}>{data.location || 'N/A'}</Text></View>
                        <View style={styles.infoItem}><Text style={styles.infoLabel}>Weather</Text><Text style={styles.infoValue}>{data.weather || 'N/A'}</Text></View>
                        <View style={styles.infoItemFull}><Text style={styles.infoLabel}>Temperature</Text><Text style={styles.infoValue}>{data.temperature || 'N/A'}</Text></View>
                    </View>
                </View>




                {/* Data Tables */}
                <View>
                        
                    {renderTableBlock('Employees', data.employees, employeeHours, undefined, 'employee', undefined)}
                    {renderTableBlock('Equipment', data.equipment, equipmentHours, undefined, 'equipment', undefined)}
                    {renderTableBlock('Materials and Trucking', formattedMaterials, materialHours, materialTickets, 'material', materialUnits)}
                    {renderTableBlock('Vendors', formattedVendors, vendorHours, vendorTickets, 'vendor', vendorUnits)}
                    {renderTableBlock('Dumping Sites', formattedDumpingSites, dumpingSiteHours, dumpingSiteTickets, 'dumping_site', undefined)}
                </View>
               
                {/* Total Quantity */}
                {/* Now display all total quantities in this block, not just the selected one */}
                {(data.job.phase_codes || []).length > 0 && (
                    <View style={styles.card}>
                        <Text style={styles.tableTitle}>Total Quantities</Text>
                        <View>
                            {data.job.phase_codes.map(phase => (
                                totalQuantities[phase] ? (
                                    <View key={phase} style={styles.quantityRow}>
                                        <Text style={styles.quantityLabel}>Phase {phase}:</Text>
                                        <View style={styles.totalBox}>
                                            <Text style={styles.totalText}>{totalQuantities[phase]}</Text>
                                        </View>
                                    </View>
                                ) : null
                            ))}
                        </View>
                    </View>
                )}


                {/* Notes */}
                {notes ? (
                    <View style={styles.card}>
                        <Text style={styles.tableTitle}>Notes</Text>
                        <Text style={styles.notesText}>{notes}</Text>
                    </View>
                ) : null}
{/* SEND BUTTON */}
<View style={{ marginTop: 20, marginBottom: 60 }}>
  <TouchableOpacity
    style={{
      backgroundColor: "#007AFF",
      paddingVertical: 14,
      borderRadius: 10,
      alignItems: "center",
    }}
    onPress={() => handleSendTimesheet(timesheetId)}
  >
    <Text style={{ color: "#fff", fontSize: 16, fontWeight: "600" }}>
      Send To Supervisor
    </Text>
  </TouchableOpacity>
</View>


            </ScrollView>
        </SafeAreaView>
    );
    
};


// --- FIXED WIDTHS (for perfect tablet behavior) ---
// Note: Constants are defined globally above the component where they are used.

const styles = StyleSheet.create({

  safeArea: {
    flex: 1,
    backgroundColor: THEME.background,
    width: '100%',
  },

  centered: { flex: 1, justifyContent: 'center', alignItems: 'center' },

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

  phaseSelectorContainer: { marginVertical: THEME.SPACING / 2 },

  phaseButton: {
    paddingHorizontal: 20,
    paddingVertical: 10,
    marginRight: 10,
    borderRadius: 20,
    backgroundColor: THEME.card,
    borderWidth: 1,
    borderColor: THEME.border,
  },
  selectedPhaseButton: { backgroundColor: THEME.primary, borderColor: THEME.primary },

  phaseButtonText: { color: THEME.text, fontWeight: '600', fontSize: 16 },
  selectedPhaseButtonText: { color: '#FFF' },

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

  // Table container (dynamic width based on # of phases)
  tableContainer: {
    borderWidth: 1,
    borderColor: THEME.border,
    borderRadius: 8,
    overflow: 'hidden',
  },

  // FIXED COLUMN WIDTHS
  colName: { 
    width: COL_NAME, 
    textAlign: 'left', // Set text alignment to left for better multi-line readability
    paddingLeft: 8,   // Add left padding to improve text spacing
  },
  colId: { width: COL_ID }, // NEW ID Column Style
  colClassCode: { width: COL_CLASS },
  colMaterial: { width: COL_MATERIAL }, // NEW Material Column Style
  colHoursSimple: { width: COL_SIMPLE_HOUR }, // Used by Material/Vendor/Dumping for Qty/Hours
  colHoursEquipment: { width: COL_EQUIP },
  colTickets: { width: COL_TICKET },
  colTotal: { width: COL_TOTAL },
  colStartStop: { width: COL_START_STOP }, // NEW: Start/Stop Hours Column

  dynamicPhaseColEmployee: { // NEW STYLE for Employee Hours
    flexDirection: 'row',
    alignItems: 'stretch',
    width: COL_EMPLOYEE_HOUR, // 90px
  },

  dynamicPhaseColSimple: {
    flexDirection: 'row',
    alignItems: 'stretch',
    // Width is COL_SIMPLE_HOUR (Hours/Qty) + COL_TICKET (Tickets/Loads)
    width: COL_SIMPLE_HOUR, 
  },

  dynamicPhaseColEquipment: {
    flexDirection: 'row',
    alignItems: 'stretch',
    // Width is COL_EQUIP (REG) + COL_EQUIP (S.B)
    width: COL_EQUIP * 2, 
  },
  
  // For phase separation
  phaseGroupBorderRight: {
      borderRightWidth: 1,
      borderRightColor: THEME.border,
  },


  tableRow: {
    flexDirection: 'row',
    alignItems: 'stretch', // CRITICAL FIX: Ensures all children stretch to the height of the tallest child
    borderTopWidth: 1,
    borderTopColor: THEME.border,
  },

  tableRowAlternate: { backgroundColor: THEME.rowAlternateBg },

  borderRight: { borderRightWidth: 1, borderRightColor: THEME.border },
  borderLeft: { borderLeftWidth: 1, borderLeftColor: THEME.border }, 
  lastCell: { borderRightWidth: 0 },
valueText: {
    fontSize: 12,
    color: THEME.text,
    textAlign: 'center',

  
},
  dataCell: {
    paddingVertical: 8,
    paddingHorizontal: 4,
    color: THEME.text,
    fontSize: 12,
    textAlign: 'center',
    borderRightWidth: 1,
    borderRightColor: THEME.border,
    minHeight: 40,
    // Removed justifyContent and alignItems as alignItems: 'stretch' on the parent handles the vertical extent
    // and padding handles the internal spacing.
  },

  tableHeader: {
    flexDirection: 'row',
    backgroundColor: THEME.tableHeaderBg,
    minHeight: 55, // Increased for larger font
  },
  
  // NEW STYLE: For the conditional horizontal line
  headerCellBottomBorder: {
      borderBottomWidth: 1,
      borderBottomColor: THEME.border,
  },
noBorderRight: {
    borderRightWidth: 0
},

  headerCell: {
    paddingVertical: 10,
    fontWeight: '700',
    color: THEME.text,
    fontSize: 10,
    textAlign: 'center',
    borderRightWidth: 1,
    borderRightColor: THEME.border,
    paddingTop: 31, // To align content below the new 31px phase header
    minHeight: 55, // Keep minHeight
    borderBottomWidth: 0, // Keep 0
  },

  phaseHeaderCellText: {
    position: 'absolute',
    top: 0,
    left: 0,
    // FIX APPLIED HERE
    width: '100%', // Ensures it spans the entire parent width
    right: -1,     // Overlaps the right border of the parent container to close the gap
    paddingVertical: 4,
    fontWeight: '700',
    color: THEME.text,
    fontSize: 12, 
    textAlign: 'center',
    backgroundColor: THEME.tableHeaderBg,
    zIndex: 1,
    height: 31, // 30 + 1px border
    // The visible horizontal line
    borderBottomWidth: 1, 
    borderBottomColor: THEME.border,
  },

  equipmentPhaseSubHeader: {
    flexDirection: 'row',
    flex: 1,
    marginTop: 31, // To align below the new 31px phase header
    minHeight: 24, // 55 total - 31 phase area
  },

  equipmentSubHeaderCell: {
    flex: 1,
    borderTopWidth: 0,
    paddingVertical: 5, // Ensures vertical centering in the 24px space
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
phaseTotalLabelAlignment: {
    textAlign: 'right',
    paddingRight: 8, // Spacing from the right border of the column
    paddingLeft: 4,  // Override colName's paddingLeft: 8 to push content right
  },
  phaseTotalSubRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },

  quantityRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 10,
  },

  quantityLabel: { fontSize: 16, color: THEME.textSecondary, fontWeight: '500' },

  totalBox: {
    paddingHorizontal: 15,
    paddingVertical: 8,
    backgroundColor: THEME.primary,
    borderRadius: 8,
    minWidth: 80,
    alignItems: 'center',
  },

  totalText: { fontSize: 18, fontWeight: 'bold', color: THEME.card },

  notesText: {
    fontSize: 15,
    color: THEME.text,
    lineHeight: 22,
    marginTop: 5,
  },
});


export default ForemanTimesheetViewScreen;