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
} from 'react-native';
import { RouteProp, useRoute } from '@react-navigation/native';
import apiClient from '../../api/apiClient';
import type { SupervisorStackParamList } from '../../navigation/AppNavigator';
import type { Timesheet } from '../../types';


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
    border: '#E0E0E5',
    tableHeaderBg: '#F8F8F8',
    rowAlternateBg: '#FCFCFC',
    SPACING: 16,
};


const PETimesheetReviewScreen = () => {
    const route = useRoute<ReviewRouteProp>();
    const { timesheetId } = route.params;


    const [timesheet, setTimesheet] = useState<Timesheet | null>(null);
    const [foremanName, setForemanName] = useState<string>('');
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
                const response = await apiClient.get<Timesheet>(`/api/timesheets/${timesheetId}`);
                const tsData = response.data;
                setTimesheet(tsData);
                console.log('Fetched timesheet:', tsData);

                if (tsData.data.job.phase_codes?.length > 0) {
                    setSelectedPhase(tsData.data.job.phase_codes[0]);
                }
                
                setNotes(tsData.data.notes || '');


                const populateSimple = (entities: any[] = [], field: 'hours_per_phase' | 'tickets_per_phase'): SimpleHourState => {
                    const state: SimpleHourState = {};
                    entities.forEach((e) => {
                        const id = e.id || e.key || e.name || e.vendor_id;
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
                        const id = e.id || e.key || e.name;
                        state[id] = e.unit || null;
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
                                    state[e.id][phase] = {
                                        REG: v.REG?.toString() || '0',
                                        'S.B': v['S.B']?.toString() || '0',
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


                setEmployeeHours(populateEmployeeComplex(tsData.data.employees));
                setEquipmentHours(populateEquipmentComplex(tsData.data.equipment));
                const formattedMaterials = Object.values(tsData.data.materials_trucking  || {});
                const formattedVendors = Object.values(tsData.data.vendors || {});
                const formattedDumpingSites = Object.values(tsData.data.dumping_sites || {});
                console.log('Materials:', formattedMaterials);
    console.log('Vendors:', formattedVendors);
    console.log('Dumping Sites:', formattedDumpingSites);
                setMaterialHours(populateSimple(formattedMaterials, 'hours_per_phase'));
                setVendorHours(populateSimple(formattedVendors, 'hours_per_phase'));
                setMaterialTickets(populateSimple(formattedMaterials, 'tickets_per_phase'));
                setVendorTickets(populateSimple(formattedVendors, 'tickets_per_phase'));
                setMaterialUnits(populateUnits(formattedMaterials));
                setVendorUnits(populateUnits(formattedVendors));
                setDumpingSiteHours(populateSimple(formattedDumpingSites, 'hours_per_phase'));
                setDumpingSiteTickets(populateSimple(formattedDumpingSites, 'tickets_per_phase'));

                if (tsData.data.total_quantities_per_phase) {
                    const q: QuantityState = {};
                    for (const phase in tsData.data.total_quantities_per_phase) {
                        q[phase] = tsData.data.total_quantities_per_phase[phase].toString();
                    }
                    setTotalQuantities(q);
                }


                const userRes = await apiClient.get(`/api/users/${tsData.foreman_id}`);
                setForemanName(`${userRes.data.first_name} ${userRes.data.last_name}`.trim());


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


    const renderTableBlock = (
        title: string,
        entities: any[],
        hoursState: SimpleHourState | ComplexHourState | EmployeeHourState,
        ticketsState: SimpleHourState | undefined,
        type: 'employee' | 'equipment' | 'material' | 'vendor' | 'dumping_site',
        unitState: UnitState | undefined,
    ) => {
        if (!entities || entities.length === 0 || !selectedPhase) return null;


        const isEmployee = type === 'employee';
        const isEquipment = type === 'equipment';
        const isMaterial = type === 'material';
        const isSimple = isMaterial || type === 'vendor' || type === 'dumping_site';


        const phaseCodes = timesheet?.data.job.phase_codes || [];


        // Calculate phase totals for the footer within the component scope
        let phaseTotalHours = 0;
        let equipmentPhaseTotals: Record<string, { REG: number, 'S.B': number }> = {};
        let simplePhaseTotals: Record<string, number> = {};


        if (isEmployee) {
            phaseTotalHours = calculateEmployeePhaseTotal(hoursState as EmployeeHourState, selectedPhase);
        } else if (isEquipment) {
            equipmentPhaseTotals = calculateComplexPhaseTotals(hoursState as ComplexHourState, phaseCodes);
            phaseTotalHours = equipmentPhaseTotals[selectedPhase!]?.REG + equipmentPhaseTotals[selectedPhase!]?.['S.B'] || 0;
        } else if (isSimple) {
            simplePhaseTotals = calculateSimplePhaseTotals(hoursState as SimpleHourState, phaseCodes);
            phaseTotalHours = simplePhaseTotals[selectedPhase!] || 0;
        }



        return (
            <View style={styles.card}>
                <Text style={styles.tableTitle}>{title}</Text>
                <View style={styles.tableContainer}>
                    
                    {/* -------------------- TABLE HEADER START -------------------- */}
                    <View style={styles.tableHeader}>
                        <Text style={[styles.headerCell, styles.colName]}>Name</Text>
                        
                        {isEmployee && (
                            <>
                                <Text style={[styles.headerCell, styles.colClassCode]}>Class Code</Text>
                                <Text style={[styles.headerCell, styles.colHours]}>Hours</Text>
                            </>
                        )}
                        
                        {isEquipment ? (
                            <>
                                <Text style={[styles.headerCell, styles.colHours]}>REG</Text>
                                <Text style={[styles.headerCell, styles.colHours]}>S.B</Text>
                            </>
                        ) : (
                            (!isEmployee && !isEquipment) && (
                                <Text style={[styles.headerCell, styles.colHours]}>
                                    {/* Header for Materials/Vendors - consistent name for column */}
                                    {isMaterial ? 'Hours/Qty' : 'Quantity'} 
                                </Text>
                            )
                        )}
                        
                        {/* {isSimple && <Text style={[styles.headerCell, styles.colTickets]}># of Tickets</Text>} */}
                        {isSimple && (
    <Text style={[styles.headerCell, styles.colTickets]}>
        {type === 'dumping_site' ? '# of Loads' : '# of Tickets'}
    </Text>
)}

                        <Text style={[styles.headerCell, styles.colTotal, styles.lastCell]}>Total</Text>
                    </View>
                    {/* -------------------- TABLE HEADER END -------------------- */}



                    {/* -------------------- TABLE BODY START -------------------- */}
                    {isEmployee ? (
                        entities.flatMap((entity, index) => {
                            const totalHours = calculateTotalEmployeeHours(hoursState as EmployeeHourState, entity.id);
                            const employeePhaseHours = (hoursState as EmployeeHourState)[entity.id]?.[selectedPhase!];
                            const entityName = `${entity.first_name} ${entity.last_name}`.trim();

                            // Collect all class codes assigned to the employee
                            const classCodesToDisplay = [];
                            if (entity.class_1) {
                                classCodesToDisplay.push({
                                    code: entity.class_1,
                                    hours: parseFloat(employeePhaseHours?.[entity.class_1] || '0'),
                                });
                            }
                            if (entity.class_2) {
                                classCodesToDisplay.push({
                                    code: entity.class_2,
                                    hours: parseFloat(employeePhaseHours?.[entity.class_2] || '0'),
                                });
                            }
                            
                            // If no class codes are assigned, show a default row
                            if (classCodesToDisplay.length === 0) {
                                return (
                                    <View key={`${entity.id}-default`} style={[styles.tableRow, index % 2 === 1 && styles.tableRowAlternate]}>
                                        <Text style={[styles.dataCell, styles.colName]}>{entityName}</Text>
                                        <Text style={[styles.dataCell, styles.colClassCode]}>N/A</Text>
                                        <Text style={[styles.dataCell, styles.colHours]}>0.0</Text>
                                        <Text style={[styles.dataCell, styles.colTotal, styles.lastCell]}>{totalHours.toFixed(1)}</Text>
                                    </View>
                                );
                            }

                            // Render a row for each assigned class code
                            return classCodesToDisplay.map((classData, classIndex) => {
                                const isFirstClassRow = classIndex === 0;

                                return (
                                    <View key={`${entity.id}-${classData.code}`} style={[styles.tableRow, index % 2 === 1 && styles.tableRowAlternate]}>
                                        {/* Show name only in the first row for this employee */}
                                        {isFirstClassRow ? (
                                            <Text style={[styles.dataCell, styles.colName]} numberOfLines={2}>
                                                {entityName}
                                            </Text>
                                        ) : (
                                            <View style={[styles.dataCell, styles.colName]} />
                                        )}
                                        
                                        <Text style={[styles.dataCell, styles.colClassCode]}>{classData.code}</Text>
                                        <Text style={[styles.dataCell, styles.colHours]}>{classData.hours.toFixed(1)}</Text>
                                        
                                        {/* Show total hours only in the first row for this employee */}
                                        {isFirstClassRow ? (
                                            <Text style={[styles.dataCell, styles.colTotal, styles.lastCell]}>
                                                {totalHours.toFixed(1)}
                                            </Text>
                                        ) : (
                                            <View style={[styles.dataCell, styles.colTotal, styles.lastCell]} />
                                        )}
                                    </View>
                                );
                            });
                        })
                    ) : (
                    // --- LOGIC FOR EQUIPMENT/MATERIAL/VENDOR ---
                        entities.map((entity, index) => {
                            const entityName = entity.first_name
                                ? `${entity.first_name} ${entity.middle_name || ''} ${entity.last_name}`.trim()
                                : entity.name;
                            
                            const totalHours = isEquipment 
                                ? calculateTotalComplexHours(hoursState as ComplexHourState, entity.id)
                                : calculateTotalSimpleHours(hoursState as SimpleHourState, entity.id);


                            return (
                                <View key={entity.id} style={[styles.tableRow, index % 2 === 1 && styles.tableRowAlternate]}>
                                    <Text style={[styles.dataCell, styles.colName]}>{entityName}</Text>
                                    
                                    {isEquipment ? (
                                        <>
                                            <Text style={[styles.dataCell, styles.colHours]}>
                                                {parseFloat((hoursState as ComplexHourState)[entity.id]?.[selectedPhase!]?.REG ?? '0').toFixed(1)}
                                            </Text>
                                            <Text style={[styles.dataCell, styles.colHours]}>
                                                {parseFloat((hoursState as ComplexHourState)[entity.id]?.[selectedPhase!]?.['S.B'] ?? '0').toFixed(1)}
                                            </Text>
                                        </>
                                    ) : (
                                        // Simple Logic (Material/Vendor) - COMBINING UNIT AND HOURS
                                        (() => {
                                            const hoursValue = parseFloat((hoursState as SimpleHourState)[entity.id]?.[selectedPhase!] ?? '0').toFixed(1);
                                            const unitValue = unitState?.[entity.id] || '';
                                            
                                            const displayValue = hoursValue;


                                            return (
                                                <Text style={[styles.dataCell, styles.colHours]}>
                                                    {displayValue}
                                                </Text>
                                            );
                                        })()
                                    )}
                                    
                                    {isSimple && (
                                        <>
                                            <Text style={[styles.dataCell, styles.colTickets]}>
                                                {ticketsState ? (ticketsState[entity.id]?.[selectedPhase!] ?? '0') : '0'}
                                            </Text>
                                        </>
                                    )}
                                    <Text style={[styles.dataCell, styles.colTotal, styles.lastCell]}>{totalHours.toFixed(1)}</Text>
                                </View>
                            );
                        })
                    )}
                    {/* -------------------- TABLE BODY END -------------------- */}


                    {/* -------------------- VERTICAL TOTALS ROW -------------------- */}
                    {selectedPhase && (isEmployee || isEquipment || isSimple) && (
                        <View style={[styles.tableRow, styles.phaseTotalRow]}>
                            <Text style={[styles.dataCell, styles.colName, styles.phaseTotalText]}>Phase Total</Text>
                            
                            {isEmployee && (
                                <Text
                                    style={[
                                        styles.dataCell,
                                        styles.phaseTotalText,
                                        { flex: 3, textAlign: 'center' } 
                                    ]}
                                >
                                    {phaseTotalHours.toFixed(1)}
                                </Text>
                            )}
                            
                            {isEquipment ? (
                                <>
                                    <Text style={[styles.dataCell, styles.colHours, styles.phaseTotalText]}>
                                        {(equipmentPhaseTotals[selectedPhase!]?.REG || 0).toFixed(1)}
                                    </Text>
                                    <Text style={[styles.dataCell, styles.colHours, styles.phaseTotalText]}>
                                        {(equipmentPhaseTotals[selectedPhase!]?.['S.B'] || 0).toFixed(1)}
                                    </Text>
                                </>
                            ) : (isSimple &&
                                <Text style={[styles.dataCell, styles.colHours, styles.phaseTotalText]}>
                                    {(simplePhaseTotals[selectedPhase!] || 0).toFixed(1)}
                                </Text>
                            )}
                            
                            {isSimple && (
                                <>
                                    {/* Placeholder for Tickets column */}
                                    <View style={[styles.dataCell, styles.colTickets]} /> 
                                </>
                            )}
                            
                            {/* Final empty cell under the Total column */}
                            <View style={[styles.dataCell, styles.colTotal, styles.lastCell]} />
                        </View>
                    )}
                    {/* -------------------- VERTICAL TOTALS ROW END -------------------- */}


                </View>
            </View>
        );
    };


    if (loading) return <ActivityIndicator size="large" style={styles.centered} />;
    if (!timesheet) return <View style={styles.centered}><Text>Timesheet not found.</Text></View>;


    const { data, date } = timesheet;

 const formattedMaterials = Object.values(data.selected_material_items || {});
    const formattedVendors = Object.values(data.vendors || {});
    const formattedDumpingSites = Object.values(data.dumping_sites || {});
console.log('Rendering Materials and Trucking table', materialHours, materialTickets);
console.log('Rendering vendors', vendorHours, vendorTickets);
console.log('Rendering Materials and Trucking table', dumpingSiteHours, dumpingSiteTickets);
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
                        <View style={styles.infoItem}><Text style={styles.infoLabel}>Project Engineer</Text><Text style={styles.infoValue}>{data.project_engineer || 'N/A'}</Text></View>
                        <View style={styles.infoItem}><Text style={styles.infoLabel}>Day/Night</Text><Text style={styles.infoValue}>{data.time_of_day || 'N/A'}</Text></View>
                        <View style={styles.infoItem}><Text style={styles.infoLabel}>Location</Text><Text style={styles.infoValue}>{data.location || 'N/A'}</Text></View>
                        <View style={styles.infoItem}><Text style={styles.infoLabel}>Weather</Text><Text style={styles.infoValue}>{data.weather || 'N/A'}</Text></View>
                        <View style={styles.infoItemFull}><Text style={styles.infoLabel}>Temperature</Text><Text style={styles.infoValue}>{data.temperature || 'N/A'}</Text></View>
                    </View>
                </View>


                {/* Phase Selector */}
                <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.phaseSelectorContainer}>
                    {data.job.phase_codes.map((phase) => (
                        <TouchableOpacity
                            key={phase}
                            style={[styles.phaseButton, selectedPhase === phase && styles.selectedPhaseButton]}
                            onPress={() => setSelectedPhase(phase)}
                        >
                            <Text style={[styles.phaseButtonText, selectedPhase === phase && styles.selectedPhaseButtonText]}>{phase}</Text>
                        </TouchableOpacity>
                    ))}
                </ScrollView>


                {/* Data Tables */}
                {selectedPhase && (
                     <View>
                        
                        {renderTableBlock('Employees', data.employees, employeeHours, undefined, 'employee', undefined)}
                        {renderTableBlock('Equipment', data.equipment, equipmentHours, undefined, 'equipment', undefined)}
                        {renderTableBlock('Materials and Trucking', formattedMaterials, materialHours, materialTickets, 'material', materialUnits)}
                        {renderTableBlock('Work Performed', formattedVendors, vendorHours, vendorTickets, 'vendor', vendorUnits)}
                        {renderTableBlock('Dumping Sites', formattedDumpingSites, dumpingSiteHours, dumpingSiteTickets, 'dumping_site', undefined)}
                    </View>
                )}
               
                {/* Total Quantity */}
                {selectedPhase && totalQuantities[selectedPhase] && (
                    <View style={styles.card}>
                        <Text style={styles.tableTitle}>Total Quantity</Text>
                        <View style={styles.quantityRow}>
                            <Text style={styles.quantityLabel}>Phase {selectedPhase}:</Text>
                            <View style={styles.totalBox}>
                                <Text style={styles.totalText}>{totalQuantities[selectedPhase]}</Text>
                            </View>
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
            </ScrollView>
        </SafeAreaView>
    );
};


// --- Styles ---
const styles = StyleSheet.create({
    safeArea: { flex: 1, backgroundColor: THEME.background },
    centered: { flex: 1, justifyContent: 'center', alignItems: 'center' },
    infoCard: {
        padding: THEME.SPACING, backgroundColor: THEME.card, borderRadius: 14, marginBottom: THEME.SPACING,
        shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.05, shadowRadius: 4, elevation: 3,
    },
    jobTitle: { fontSize: 24, fontWeight: 'bold', color: THEME.text },
    jobCode: { fontSize: 16, color: THEME.textSecondary, marginTop: 4 },
    infoGrid: { marginTop: THEME.SPACING, flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-between' },
    infoItem: { width: '48%', marginBottom: 12 },
    infoItemFull: { width: '100%', marginBottom: 12 },
    infoLabel: { fontSize: 14, color: THEME.textSecondary, marginBottom: 2 },
    infoValue: { fontSize: 16, fontWeight: '500', color: THEME.text },
    phaseSelectorContainer: { marginVertical: THEME.SPACING / 2 },
    phaseButton: {
        paddingHorizontal: 20, paddingVertical: 10, marginRight: 10, borderRadius: 20,
        backgroundColor: THEME.card, borderWidth: 1, borderColor: THEME.border,
    },
    selectedPhaseButton: { backgroundColor: THEME.primary, borderColor: THEME.primary },
    phaseButtonText: { color: THEME.text, fontWeight: '600', fontSize: 16 },
    selectedPhaseButtonText: { color: '#FFF' },
    card: {
        backgroundColor: THEME.card, borderRadius: 14, padding: THEME.SPACING, marginBottom: THEME.SPACING,
        shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.05, shadowRadius: 4, elevation: 2,
    },
    tableTitle: { fontSize: 20, fontWeight: 'bold', color: THEME.text, marginBottom: 12 },
    tableContainer: { borderWidth: 1, borderColor: THEME.border, borderRadius: 8, overflow: 'hidden' },
    tableHeader: { flexDirection: 'row', backgroundColor: THEME.tableHeaderBg },
    tableRow: { flexDirection: 'row', alignItems: 'center', borderTopWidth: 1, borderTopColor: THEME.border },
    tableRowAlternate: { backgroundColor: THEME.rowAlternateBg },
    headerCell: {
        paddingVertical: 10, paddingHorizontal: 5, fontWeight: '700', color: THEME.text, fontSize: 12,
        textAlign: 'center', borderRightWidth: 1, borderRightColor: THEME.border,
    },
    dataCell: {
        paddingVertical: 8, paddingHorizontal: 5, color: THEME.text, fontSize: 14,
        textAlign: 'center', borderRightWidth: 1, borderRightColor: THEME.border,
        minHeight: 40, justifyContent: 'center', 
        alignItems: 'center', display: 'flex',
    },
    lastCell: { borderRightWidth: 0 },
    
    // Column Widths (Adjust as needed for layout)
    colName: { flex: 3 }, 
    colClassCode: { flex: 1.5 },
    colHours: { flex: 1.5 }, 
    colTickets: { flex: 1.2 },
    colTotal: { flex: 1.5 },


    // Phase Total Row Styles
    phaseTotalRow: { backgroundColor: THEME.tableHeaderBg, borderTopWidth: 2, borderTopColor: THEME.textSecondary },
    phaseTotalText: { fontWeight: 'bold', fontSize: 14, color: THEME.text, paddingVertical: 10 },
    
    // Total Quantity Styles
    quantityRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: 10 },
    quantityLabel: { fontSize: 16, color: THEME.textSecondary, fontWeight: '500' },
    totalBox: { 
        paddingHorizontal: 15, paddingVertical: 8, backgroundColor: THEME.primary, 
        borderRadius: 8, minWidth: 80, alignItems: 'center' 
    },
    totalText: { fontSize: 18, fontWeight: 'bold', color: THEME.card },


    // Notes Styles
    notesText: { fontSize: 15, color: THEME.text, lineHeight: 22, marginTop: 5 },
});


export default PETimesheetReviewScreen;
