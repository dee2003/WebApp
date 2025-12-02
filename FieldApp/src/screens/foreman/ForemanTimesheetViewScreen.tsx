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
const COL_ID = 70;              // NEW: Width for EMP# and EQUIP #ER
const COL_CLASS = 80;
const COL_EMPLOYEE_HOUR = 90;   // Employee hours column width 
const COL_SIMPLE_HOUR = 110;    // Used for Material/Vendor/Dumping Qty/Hours
const COL_EQUIP = 110;          // Used for Equipment REG/S.B (per column)
const COL_TICKET = 110;         // Used for Tickets/Loads
const COL_TOTAL = 100;
const COL_START_STOP = 70;      // NEW: Width for Start Hours / Stop Hours columns

const getPhaseGroupWidth = (type: TableCategory): number => {
  if (type === "equipment") return COL_EQUIP * 2; // REG + S.B
  if (type === "employee") return COL_EMPLOYEE_HOUR;       // Use 90px for employee hours only
  // material, vendor, dumping_site → simple (quantity + tickets)
  return COL_SIMPLE_HOUR + COL_TICKET; // Use 110px + 110px for simple tables
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


                const populateSimple = (entities: any[] = [], field: 'hours_per_phase' | 'tickets_per_phase', type?: 'material' | 'vendor' | 'dumping_site'): SimpleHourState => {
                    const state: SimpleHourState = {};
                    entities.forEach((e) => {
                        // NEW FIX: If type is 'material', prioritize 'name' as the key is often derived from it in the saved data.
                        let id;
                        if (type === 'material') {
                            id = e.name || e.id || e.key || e.vendor_id;
                        } else {
                            // Keep the standard priority (ID > Name) for others
                            id = e.id || e.name || e.key || e.vendor_id; 
                        }
                        
                        state[id] = {};
                        const data = e[field] || {};
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
        const isSimple = isMaterial || type === 'vendor' || type === 'dumping_site';

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
            simplePhaseTotals = calculateSimplePhaseTotals(hoursState as SimpleHourState, phaseCodes);
            // Calculate Grand Total for Simple Tables (Sum of Hours/Qty)
            grandTotal = entities.reduce((sum, e) => {
                // FIX APPLIED HERE: Match key derivation logic from populateSimple
                let entityId;
                if (type === 'material') {
                    entityId = e.name || e.id || e.key || e.vendor_id;
                } else {
                    entityId = e.id || e.name || e.key || e.vendor_id;
                }
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
            fixedWidth += COL_ID + (COL_START_STOP * 2); // <--- ADDED START/STOP COLUMNS
        } else {
            // Simple tables just have the Name and Total fixed columns
        }
        
        // Calculate total content width by multiplying phase group width by the number of phases
        const contentWidth = fixedWidth + phaseGroupWidth * phaseCodes.length;

        // Custom Employee Table Renderer
        const renderEmployeeTableBody = () => {
            return entities.flatMap((entity, index) => {
                const totalHours = calculateTotalEmployeeHours(hoursState as EmployeeHourState, entity.id);
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
                            <Text style={[styles.dataCell, styles.colName, styles.borderRight, isFirstClassRow ? null : styles.transparentCell]} numberOfLines={2}>
                                {isFirstClassRow ? entityName : ''}
                            </Text>
                            
                            {/* NEW EMP# COLUMN (Show only in the first row) */}
                            <Text style={[styles.dataCell, styles.colId, styles.borderRight, isFirstClassRow ? null : styles.transparentCell]}>
                                {isFirstClassRow ? entity.id : ''}
                            </Text>

                            <Text style={[styles.dataCell, styles.colClassCode, styles.borderRight]}>{classCode}</Text>

                            {/* Dynamic Hours Columns per Phase */}
                            {phaseCodes.map((phase, phaseIndex) => {
                                const phaseHours = (hoursState as EmployeeHourState)[entity.id]?.[phase];
                                const hours = parseFloat(phaseHours?.[classCode] || '0');
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
                                            {hours > 0 ? hours.toFixed(1) : ''} {/* Show empty string for 0 */}
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


        return (
            <View style={styles.card}>
                <Text style={styles.tableTitle}>{title}</Text>
                {/* CRITICAL FIX: Add ScrollView horizontal to enable scrolling when content width > screen width */}
                <ScrollView horizontal showsHorizontalScrollIndicator={true}> 
                    <View style={[styles.tableContainer, { minWidth: contentWidth }]}>

                        
                        {/* -------------------- TABLE HEADER START (DYNAMIC) -------------------- */}
                        <View style={styles.tableHeader}>
                            {/* Fixed columns at the start */}
                            <Text 
                                style={[
                                    styles.headerCell, 
                                    styles.colName, 
                                    styles.borderRight, // Keep border right here
                                    !isEmployee && styles.headerCellBottomBorder // Simple tables start border here
                                ]}
                            >
                                Name
                            </Text>
                            
                            {/* NEW EMP# COLUMN */}
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

                            {/* NEW EQUIP #ER COLUMN */}
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
                                        styles.colStartStop, // Use new style
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
                                        styles.colStartStop, // Use new style
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
                                        <Text style={styles.phaseHeaderCellText}>{phase}</Text>
                                        
                                        {isEquipment ? (
                                            // Equipment: REG and S.B. per phase (2 sub-columns)
                                            <View style={styles.equipmentPhaseSubHeader}>
                                                <Text style={[styles.headerCell, styles.colHoursEquipment, styles.equipmentSubHeaderCell, styles.borderRight, styles.headerCellBottomBorder]}>REG</Text>
                                                <Text style={[styles.headerCell, styles.colHoursEquipment, styles.equipmentSubHeaderCell, styles.lastCell, styles.headerCellBottomBorder]}>S.B</Text>
                                            </View>
                                        ) : (
                                            // Employee/Simple (1 or 2 sub-columns)
                                            <>
                                                <Text 
                                                    style={[
                                                        styles.headerCell, 
                                                        // If employee, use flex: 1 to fill the 90px container.
                                                        // If simple, use the fixed COL_SIMPLE_HOUR width.
                                                        isEmployee ? { flex: 1 } : styles.colHoursSimple, 
                                                        // Border logic
                                                        (isSimple && !isEmployee) ? styles.borderRight : styles.lastCell,
                                                        styles.headerCellBottomBorder
                                                    ]}
                                                >
                                                    {isEmployee ? 'Hours' : (type === 'material' ? 'Hours/Qty' : (type === 'dumping_site' ? 'Loads' : 'Quantity'))}
                                                </Text>
                                                
                                                {/* Simple tables (Material/Vendor/Dumping) need a tickets/loads column per phase */}
                                                {(isSimple && !isEmployee) && (
                                                    <Text style={[styles.headerCell, styles.colTickets, styles.lastCell, styles.headerCellBottomBorder]}>
                                                        {type === 'dumping_site' ? '# Loads' : '# Tickets'}
                                                    </Text>
                                                )}
                                            </>
                                        )}
                                    </View>
                                );
                            })}
                            
                            {/* Fixed column at the end - No bottom border to meet the request */}
                            <Text style={[styles.headerCell, styles.colTotal, styles.lastCell, styles.borderLeft, styles.headerCellBottomBorder]}>Total</Text>
                        </View>
                        {/* -------------------- TABLE HEADER END -------------------- */}



                        {/* -------------------- TABLE BODY START (DYNAMIC) -------------------- */}
                        {isEmployee ? (
                            renderEmployeeTableBody()
                        ) : (
                        // --- LOGIC FOR EQUIPMENT/MATERIAL/VENDOR (NON-EMPLOYEE) ---
                            entities.map((entity, index) => {
                                let entityId;
                                // FIX APPLIED HERE: Match key derivation logic from populateSimple
                                if (type === 'material') {
                                    entityId = entity.name || entity.id || entity.key || entity.vendor_id;
                                } else {
                                    entityId = entity.id || entity.name || entity.key || entity.vendor_id;
                                }

                                const entityName = entity.first_name
                                    ? `${entity.first_name} ${entity.middle_name || ''} ${entity.last_name}`.trim()
                                    : entity.name;
                                
                                const totalHours = isEquipment 
                                    ? calculateTotalComplexHours(hoursState as ComplexHourState, entityId)
                                    : calculateTotalSimpleHours(hoursState as SimpleHourState, entityId);

                                return (
                                    <View key={entityId} style={[styles.tableRow, index % 2 === 1 && styles.tableRowAlternate]}>
                                        <Text style={[styles.dataCell, styles.colName, styles.borderRight]} numberOfLines={2}>
                                            {entityName}
                                        </Text>
                                        
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
                                                            <Text style={[styles.dataCell, styles.colHoursSimple, styles.borderRight]}>
                                                                {parseFloat((hoursState as SimpleHourState)[entityId]?.[phase] ?? '0').toFixed(1)}
                                                            </Text>
                                                            <Text style={[styles.dataCell, styles.colTickets, styles.lastCell]}>
                                                                {ticketsState ? (ticketsState[entityId]?.[phase] ?? '0') : '0'}
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
                        {/* -------------------- TABLE BODY END -------------------- */}


                        {/* -------------------- PHASE TOTALS ROW (DYNAMIC) -------------------- */}
                        <View style={[styles.tableRow, styles.phaseTotalRow]}>
                            <Text style={[styles.dataCell, styles.colName, styles.phaseTotalText]}>Phase Total</Text>
                            
                            {/* ID Column Placeholder */}
                            {(isEmployee || isEquipment) && (
                                <View style={[styles.dataCell, styles.colId]} /> 
                            )}
                            
                            {/* NEW START HOURS PLACEHOLDER (Equipment only) */}
                            {isEquipment && (
                                <View style={[styles.dataCell, styles.colStartStop]} /> 
                            )}

                            {/* NEW STOP HOURS PLACEHOLDER (Equipment only) */}
                            {isEquipment && (
                                <View style={[styles.dataCell, styles.colStartStop]} /> 
                            )}
                            
                            {/* Class Code Placeholder (Employee only) */}
                            {isEmployee && (
                                <View style={[styles.dataCell, styles.colClassCode]} /> 
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
                                            <View style={styles.phaseTotalSubRow}>
                                                {/* Use flex: 1 to fill the 90px container */}
                                                <Text style={[styles.dataCell, { flex: 1 }, styles.phaseTotalText, styles.lastCell]}>
                                                    {(employeePhaseTotals[phase] || 0).toFixed(1)}
                                                </Text>
                                            </View>
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
                                                <Text style={[styles.dataCell, styles.colHoursSimple, styles.phaseTotalText, styles.borderRight]}>
                                                    {(simplePhaseTotals[phase] || 0).toFixed(1)}
                                                </Text>
                                                {/* Placeholder under Tickets column */}
                                                <View style={[styles.dataCell, styles.colTickets]} />
                                            </View>
                                        ) : null}
                                    </View>
                                );
                            })}
                            
                            {/* GRAND TOTAL: Display the table's total in the final column */}
                            <Text style={[styles.dataCell, styles.colTotal, styles.lastCell, styles.borderLeft, styles.phaseTotalText]}>
                                {grandTotal.toFixed(1)}
                            </Text>
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
    width: COL_SIMPLE_HOUR + COL_TICKET, 
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


export default ForemanTimesheetViewScreen ;