
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
import apiClient from '../../api/apiClient';
import type { Timesheet } from '../../types'; 

// --- Type Definitions ---
type SimpleHourState = Record<string, Record<string, string>>;
type EmployeeHourState = Record<string, Record<string, Record<string, string>>>;
type ComplexHourSubState = { REG?: string; 'S.B'?: string };
type ComplexHourState = Record<string, Record<string, ComplexHourSubState>>;
type QuantityState = Record<string, string>;
type UnitState = Record<string, string | null>;

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
};

type TableCategory =
  | "employee"
  | "equipment"
  | "material"
  | "vendor"
  | "dumping_site";

// --- FIXED WIDTHS ---
const COL_NAME = 160;
const COL_ID = 70;              
const COL_CLASS = 80;
const COL_MATERIAL = 130;       
const COL_EMPLOYEE_HOUR = 110;   
const COL_SIMPLE_HOUR = 110;    
const COL_EQUIP = 110;          
const COL_TICKET = 90;
const COL_UNIT = 70; 
const COL_TOTAL = 100;

const getPhaseGroupWidth = (type: TableCategory): number => {
  if (type === "equipment") return COL_EQUIP * 2; 
  if (type === "employee") return COL_EMPLOYEE_HOUR;       
  return COL_SIMPLE_HOUR; 
};

const ForemanTimesheetViewScreen = ({ navigation, route }: any) => {
    const { timesheetId } = route.params;
    const [timesheet, setTimesheet] = useState<(Timesheet & { 
        supervisor_id?: number | string | null; 
        supervisor?: { id: number | string, name: string } | null; 
    }) | null>(null);
    const [foremanName, setForemanName] = useState<string>('');
    const [supervisorName, setSupervisorName] = useState<string>(''); 
    const [loading, setLoading] = useState(true);

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
                const tsData = response.data as any; 
                setTimesheet(tsData);
                setNotes(tsData.data.notes || '');

                const populateSimple = (entities: any[] = [], field: 'hours_per_phase' | 'tickets_per_phase', type?: 'material' | 'vendor' | 'dumping_site'): SimpleHourState => {
                    const state: SimpleHourState = {};
                    entities.forEach((e) => {
                        let id = (type === 'vendor') 
                            ? `${e.vendor_id || e.id}_${e.key || e.material_name || e.name || e.id}`
                            : e.id || e.name || e.key || e.vendor_id;
                        
                        state[id] = {};
                        let phaseDataToProcess: Record<string, any> = e[field] || {};
                        
                        if ((type === 'material' || type === 'vendor' || type === 'dumping_site') && field === 'tickets_per_phase' && Object.keys(phaseDataToProcess).length === 0) {
                            let ticketValue = (typeof e.tickets_loads === 'object' && e.tickets_loads !== null)
                                ? Object.values(e.tickets_loads)?.[0] 
                                : e.tickets_loads;
                            
                            const numericTicketValue = parseFloat(String(ticketValue || '0')) || 0;

                            if (e.hours_per_phase && numericTicketValue > 0) {
                                Object.keys(e.hours_per_phase).forEach(phase => {
                                    state[id][phase] = String(numericTicketValue); 
                                });
                                return;
                            }
                        }
                        Object.entries(phaseDataToProcess).forEach(([phase, val]) => {
                            state[id][phase] = String(val || '0');
                        });
                    });
                    return state;
                };

                const populateUnits = (entities: any[] = [], type: 'material' | 'vendor' | 'dumping'): UnitState => {
                    const state: UnitState = {};
                    entities.forEach(e => {
                        let id = (type === 'vendor') 
                            ? `${e.vendor_id || e.id}_${e.key || e.material_name || e.name || e.id}`
                            : e.id || e.name || e.key;
                        const unit = e.unit || e.selectedMaterials?.[0]?.unit || (type === 'dumping' ? 'Loads' : null);
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
                                state[e.id][phase] = {
                                    REG: (typeof v === 'object' ? v.REG : v)?.toString() ?? '0',
                                    'S.B': (typeof v === 'object' ? (v.S_B || v['S.B']) : '0')?.toString() ?? '0', 
                                };
                            }
                        }
                    });
                    return state;
                };

                setEmployeeHours(populateEmployeeComplex(tsData.data.employees));
                setEquipmentHours(populateEquipmentComplex(tsData.data.equipment));
                
                const formattedMaterials = tsData.data.materials_trucking || [];
                const formattedVendors = tsData.data.vendors || []; 
                const formattedDumpingSites = tsData.data.dumping_sites || []; 
                
                setMaterialHours(populateSimple(formattedMaterials, 'hours_per_phase', 'material')); 
                setVendorHours(populateSimple(formattedVendors, 'hours_per_phase', 'vendor'));
                setMaterialTickets(populateSimple(formattedMaterials, 'tickets_per_phase', 'material')); 
                setVendorTickets(populateSimple(formattedVendors, 'tickets_per_phase', 'vendor'));
                setDumpingSiteHours(populateSimple(formattedDumpingSites, 'hours_per_phase', 'dumping_site'));
                setDumpingSiteTickets(populateSimple(formattedDumpingSites, 'tickets_per_phase', 'dumping_site'));

                setMaterialUnits(populateUnits(formattedMaterials, 'material'));
                setVendorUnits(populateUnits(formattedVendors, 'vendor'));

                if (tsData.data.total_quantities) {
                    const q: QuantityState = {};
                    for (const phase in tsData.data.total_quantities) {
                        q[phase] = tsData.data.total_quantities[phase].toString();
                    }
                    setTotalQuantities(q);
                }

                const userRes = await apiClient.get(`/api/users/${tsData.foreman_id}`);
                setForemanName(`${userRes.data.first_name} ${userRes.data.last_name}`.trim());

                let supName = "N/A";
                if (typeof tsData.data.supervisor === "string") supName = tsData.data.supervisor;
                else if (tsData.data.supervisor?.name) supName = tsData.data.supervisor.name;
                setSupervisorName(supName);

            } catch (error) {
                console.error('Failed to load:', error);
                Alert.alert('Error', 'Failed to load timesheet data.');
            } finally {
                setLoading(false);
            }
        };
        fetchData();
    }, [timesheetId]);

    const calculateTotalSimpleHours = (state: SimpleHourState, id: string) => 
        Object.values(state[id] || {}).reduce((t, v) => t + (parseFloat(v) || 0), 0);

    const calculateTotalEmployeeHours = (state: EmployeeHourState, id: string) => 
        Object.values(state[id] || {}).reduce((pt, ch) => pt + Object.values(ch).reduce((ct, h) => ct + (parseFloat(h) || 0), 0), 0);

    const calculateTotalComplexHours = (state: ComplexHourState, id: string) => 
        Object.values(state[id] || {}).reduce((t, v) => t + (parseFloat(v.REG ?? '0')) + (parseFloat(v['S.B'] ?? '0')), 0);

    const handleSendTimesheet = async (id: number) => {
        Alert.alert("Confirm Submission", "Are you sure you want to send this timesheet?", [
            { text: "Cancel", style: "cancel" },
            {
                text: "Send",
                onPress: async () => {
                    setLoading(true);
                    try {
                        await apiClient.post(`/api/timesheets/${id}/send`);
                        Alert.alert("Success", "Timesheet sent.");
                        navigation.navigate("TimesheetList", { refresh: true });
                    } catch (error: any) {
                        Alert.alert("Error", error.response?.data?.detail || "Submission failed.");
                    } finally {
                        setLoading(false);
                    }
                },
                style: "destructive",
            },
        ]);
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
        const isSimple = type === 'material' || type === 'vendor' || type === 'dumping_site';
        const isVendor = type === 'vendor';
        const isDumping = type === 'dumping_site';

        const phaseCodes = timesheet?.data.job.phase_codes || [];
        const phaseGroupWidth = getPhaseGroupWidth(type);
        
        let fixedWidth = COL_NAME + COL_TOTAL;
        if (isEmployee) fixedWidth += COL_ID + COL_CLASS;
        else if (isEquipment) fixedWidth += COL_ID;
        else {
            fixedWidth += COL_ID + COL_TICKET + COL_UNIT;
            if (isVendor) fixedWidth += COL_MATERIAL;
        }

        const contentWidth = fixedWidth + (phaseGroupWidth * phaseCodes.length);
        let lastEntityName = '';

        return (
            <View style={styles.card}>
                <Text style={styles.tableTitle}>{title}</Text>
                <ScrollView horizontal>
                    <View style={[styles.tableContainer, { minWidth: contentWidth }]}>
                        {/* HEADER */}
                        <View style={styles.tableHeader}>
                            {(type === 'material' || isDumping) && <Text style={[styles.headerCell, styles.colId, styles.borderRight, styles.headerCellBottomBorder]}>ID</Text>}
                            {isVendor && <Text style={[styles.headerCell, styles.colId, styles.borderRight, styles.headerCellBottomBorder]}>Vendor ID</Text>}
                            <Text style={[styles.headerCell, styles.colName, styles.borderRight, styles.headerCellBottomBorder]}>Name</Text>
                            {isEmployee && <Text style={[styles.headerCell, styles.colId, styles.borderRight, styles.headerCellBottomBorder]}>EMP#</Text>}
                            {isEquipment && <Text style={[styles.headerCell, styles.colId, styles.borderRight, styles.headerCellBottomBorder]}>EQUIP #ER</Text>}
                            {isEmployee && <Text style={[styles.headerCell, styles.colClassCode, styles.borderRight, styles.headerCellBottomBorder]}>Class Code</Text>}
                            {isVendor && <Text style={[styles.headerCell, styles.colMaterial, styles.borderRight, styles.headerCellBottomBorder]}>Material</Text>}
                            {isSimple && <Text style={[styles.headerCell, styles.colUnit, styles.borderRight, styles.headerCellBottomBorder]}>Unit</Text>}
                            {isSimple && <Text style={[styles.headerCell, styles.colTickets, styles.borderRight, styles.headerCellBottomBorder]}>{isDumping ? "# Loads" : "# Tickets"}</Text>}

                            {phaseCodes.map((p, i) => (
                                <View key={p} style={[isEquipment ? styles.dynamicPhaseColEquipment : isEmployee ? styles.dynamicPhaseColEmployee : styles.dynamicPhaseColSimple, i === phaseCodes.length - 1 ? {} : styles.phaseGroupBorderRight]}>
                                    <Text style={styles.phaseHeaderCellText}>{p}</Text>
                                    {!isEquipment && <Text style={[styles.headerCell, styles.colHoursSimple, styles.lastCell, styles.headerCellBottomBorder]}>{isEmployee ? 'Hours' : 'Qty'}</Text>}
                                    {isEquipment && (
                                        <View style={styles.equipmentPhaseSubHeader}>
                                            <Text style={[styles.headerCell, styles.colHoursEquipment, styles.equipmentSubHeaderCell, styles.borderRight, styles.headerCellBottomBorder]}>REG</Text>
                                            <Text style={[styles.headerCell, styles.colHoursEquipment, styles.equipmentSubHeaderCell, styles.lastCell, styles.headerCellBottomBorder]}>S.B</Text>
                                        </View>
                                    )}
                                </View>
                            ))}
                            <Text style={[styles.headerCell, styles.colTotal, styles.lastCell, styles.borderLeft, styles.headerCellBottomBorder]}>Total</Text>
                        </View>

                        {/* BODY */}
                        {entities.map((e, idx) => {
                            const eid = isVendor ? `${e.vendor_id || e.id}_${e.key || e.material_name || e.name || e.id}` : e.id || e.name || e.key;
                            const total = isEquipment ? calculateTotalComplexHours(hoursState as ComplexHourState, eid) : isEmployee ? calculateTotalEmployeeHours(hoursState as EmployeeHourState, eid) : calculateTotalSimpleHours(hoursState as SimpleHourState, eid);
                            
                            const name = isVendor ? e.vendor_name : (type === 'material' || isDumping) ? (e.name || e.material_name) : (e.first_name ? `${e.first_name} ${e.last_name}` : e.name);
                            const isNew = (isVendor || type === 'material') ? name !== lastEntityName : true;
                            if (isVendor || type === 'material') lastEntityName = name;

                            const unitDisplay = isSimple ? (isDumping ? 'Loads' : (unitState?.[eid] || e.unit || '')) : '';
                            const tickVal = (isSimple && ticketsState) ? calculateTotalSimpleHours(ticketsState as SimpleHourState, eid) : 0;

                            return (
                                <View key={eid} style={[styles.tableRow, idx % 2 === 1 && styles.tableRowAlternate]}>
                                    {(type === 'material' || isDumping) && <Text style={[styles.dataCell, styles.colId, styles.borderRight, isNew ? null : styles.transparentCell]}>{isNew ? (e.id || e.key) : ''}</Text>}
                                    {isVendor && <Text style={[styles.dataCell, styles.colId, styles.borderRight, isNew ? null : styles.transparentCell]}>{isNew ? e.vendor_id : ''}</Text>}
                                    <View style={[styles.dataCell, styles.colName, styles.borderRight]}>{(isNew || isEquipment) && <Text style={styles.rowText} numberOfLines={2}>{name}</Text>}</View>
                                    {isEmployee && <Text style={[styles.dataCell, styles.colId, styles.borderRight]}>{e.id}</Text>}
                                    {isEquipment && <Text style={[styles.dataCell, styles.colId, styles.borderRight]}>{e.id}</Text>}
                                    {isEmployee && <Text style={[styles.dataCell, styles.colClassCode, styles.borderRight]}>{e.class_1 || 'N/A'}</Text>}
                                    {isVendor && <Text style={[styles.dataCell, styles.colMaterial, styles.borderRight]} numberOfLines={2}>{e.material_name}</Text>}
                                    {isSimple && <Text style={[styles.dataCell, styles.colUnit, styles.borderRight]}>{unitDisplay}</Text>}
                                    {isSimple && <Text style={[styles.dataCell, styles.colTickets, styles.borderRight]}>{tickVal || ''}</Text>}

                                    {phaseCodes.map((p, i) => (
                                        <View key={p} style={[isEquipment ? styles.dynamicPhaseColEquipment : isEmployee ? styles.dynamicPhaseColEmployee : styles.dynamicPhaseColSimple, i === phaseCodes.length - 1 ? {} : styles.phaseGroupBorderRight]}>
                                            {isEquipment ? (
                                                <>
                                                    <Text style={[styles.dataCell, styles.colHoursEquipment, styles.borderRight]}>{parseFloat((hoursState as ComplexHourState)[eid]?.[p]?.REG ?? '0').toFixed(1)}</Text>
                                                    <Text style={[styles.dataCell, styles.colHoursEquipment, styles.lastCell]}>{parseFloat((hoursState as ComplexHourState)[eid]?.[p]?.['S.B'] ?? '0').toFixed(1)}</Text>
                                                </>
                                            ) : (
                                                <Text style={[styles.dataCell, { flex: 1 }, styles.lastCell]}>
                                                    {isEmployee ? parseFloat((hoursState as EmployeeHourState)[eid]?.[p]?.[e.class_1] || '0').toFixed(1) : parseFloat((hoursState as SimpleHourState)[eid]?.[p] || '0').toFixed(1)}
                                                </Text>
                                            )}
                                        </View>
                                    ))}
                                    <Text style={[styles.dataCell, styles.colTotal, styles.lastCell, styles.borderLeft]}>{total.toFixed(1)}</Text>
                                </View>
                            );
                        })}
                    </View>
                </ScrollView>
            </View>
        );
    };

    if (loading) return <ActivityIndicator size="large" style={styles.centered} />;
    if (!timesheet) return <View style={styles.centered}><Text>Not found.</Text></View>;

    return (
        <SafeAreaView style={styles.safeArea}>
            <ScrollView contentContainerStyle={{ padding: THEME.SPACING, paddingBottom: 50 }}>
                <View style={styles.infoCard}>
                    <Text style={styles.jobTitle}>{timesheet.data.job_name}</Text>
                    <Text style={styles.jobCode}>Job Code: {timesheet.data.job.job_code}</Text>
<View style={styles.infoGrid}>
    <View style={styles.infoItem}>
        <Text style={styles.infoLabel}>Date</Text>
        <Text style={styles.infoValue}>{new Date(timesheet.date).toLocaleDateString()}</Text>
    </View>
    <View style={styles.infoItem}>
        <Text style={styles.infoLabel}>Foreman</Text>
        <Text style={styles.infoValue}>{foremanName}</Text>
    </View>
    <View style={styles.infoItem}>
        <Text style={styles.infoLabel}>Supervisor</Text>
        <Text style={styles.infoValue}>{supervisorName}</Text>
    </View>
    {/* RESTORED FIELDS */}
    <View style={styles.infoItem}>
        <Text style={styles.infoLabel}>Location</Text>
        <Text style={styles.infoValue}>{timesheet.data.location || 'N/A'}</Text>
    </View>
    <View style={styles.infoItem}>
        <Text style={styles.infoLabel}>Weather</Text>
        <Text style={styles.infoValue}>{timesheet.data.weather || 'N/A'}</Text>
    </View>
    <View style={styles.infoItem}>
        <Text style={styles.infoLabel}>Temperature</Text>
        <Text style={styles.infoValue}>{timesheet.data.temperature || 'N/A'}</Text>
    </View>
    <View style={styles.infoItem}>
        <Text style={styles.infoLabel}>Day/Night</Text>
        <Text style={styles.infoValue}>{timesheet.data.time_of_day || 'N/A'}</Text>
    </View>
</View>
                </View>

                {renderTableBlock('Employees', timesheet.data.employees, employeeHours, undefined, 'employee', undefined)}
                {renderTableBlock('Equipment', timesheet.data.equipment, equipmentHours, undefined, 'equipment', undefined)}
                {renderTableBlock('Materials', timesheet.data.materials_trucking || [], materialHours, materialTickets, 'material', materialUnits)}
                {renderTableBlock('Vendors', timesheet.data.vendors || [], vendorHours, vendorTickets, 'vendor', vendorUnits)}
                {renderTableBlock('Dumping Sites', timesheet.data.dumping_sites || [], dumpingSiteHours, dumpingSiteTickets, 'dumping_site', undefined)}

                {/* --- Total Quantities Section --- */}
                {(timesheet.data.job.phase_codes || []).length > 0 && (
                    <View style={styles.card}>
                        <Text style={styles.tableTitle}>Total Quantities</Text>
                        {timesheet.data.job.phase_codes.map(phase => totalQuantities[phase] ? (
                            <View key={phase} style={styles.quantityRow}>
                                <Text style={styles.quantityLabel}>Phase {phase}:</Text>
                                <View style={styles.totalBox}><Text style={styles.totalText}>{totalQuantities[phase]}</Text></View>
                            </View>
                        ) : null)}
                    </View>
                )}

                {/* --- Notes Section --- */}
                {notes ? (
                    <View style={styles.card}>
                        <Text style={styles.tableTitle}>Notes</Text>
                        <Text style={styles.notesText}>{notes}</Text>
                    </View>
                ) : null}

                <View style={{ marginTop: 20, marginBottom: 60 }}>
                    <TouchableOpacity style={styles.sendButton} onPress={() => handleSendTimesheet(timesheetId)}>
                        <Text style={styles.sendButtonText}>Send To Supervisor</Text>
                    </TouchableOpacity>
                </View>
            </ScrollView>
        </SafeAreaView>
    );
};

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: THEME.background },
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
    // Note: Do not set a 'height' here so it can grow with content
  },
  jobTitle: { 
    fontSize: 22, 
    fontWeight: 'bold', 
    color: THEME.text,
    marginBottom: 4 
  },
  jobCode: { 
    fontSize: 14, 
    color: THEME.textSecondary, 
    marginBottom: 8 
  },
  infoGrid: {
    marginTop: THEME.SPACING,
    flexDirection: 'row',
    flexWrap: 'wrap', // This forces items to move to a new line instead of disappearing
    justifyContent: 'space-between',
  },
  infoItem: {
    width: '48%', // Sets a 2-column layout
    marginBottom: 16,
    paddingRight: 4,
  },
  infoLabel: {
    fontSize: 12,
    color: THEME.textSecondary,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: 4,
  },
  infoValue: {
    fontSize: 15,
    fontWeight: '600',
    color: THEME.text,
  },
   card: { backgroundColor: THEME.card, borderRadius: 14, padding: THEME.SPACING, marginBottom: THEME.SPACING, elevation: 2 },
  tableTitle: { fontSize: 18, fontWeight: 'bold', marginBottom: 10 },
  tableContainer: { borderWidth: 1, borderColor: THEME.border, borderRadius: 8, overflow: 'hidden' },
  colName: { width: COL_NAME },
  colId: { width: COL_ID },
  colClassCode: { width: COL_CLASS },
  colMaterial: { width: COL_MATERIAL },
  colHoursSimple: { width: COL_SIMPLE_HOUR },
  colHoursEquipment: { width: COL_EQUIP },
  colTickets: { width: COL_TICKET },
  colUnit: { width: COL_UNIT },
  colTotal: { width: COL_TOTAL },
  dynamicPhaseColEmployee: { flexDirection: 'row', width: COL_EMPLOYEE_HOUR },
  dynamicPhaseColSimple: { flexDirection: 'row', width: COL_SIMPLE_HOUR },
  dynamicPhaseColEquipment: { flexDirection: 'row', width: COL_EQUIP * 2 },
  phaseGroupBorderRight: { borderRightWidth: 1, borderRightColor: THEME.border },
  tableRow: { flexDirection: 'row', borderTopWidth: 1, borderTopColor: THEME.border },
  tableRowAlternate: { backgroundColor: THEME.rowAlternateBg },
  borderRight: { borderRightWidth: 1, borderRightColor: THEME.border },
  borderLeft: { borderLeftWidth: 1, borderLeftColor: THEME.border },
  lastCell: { borderRightWidth: 0 },
  dataCell: { padding: 8, fontSize: 11, textAlign: 'center', minHeight: 45 },
  rowText: { fontSize: 11, textAlign: 'left' },
  tableHeader: { flexDirection: 'row', backgroundColor: THEME.tableHeaderBg },
  headerCellBottomBorder: { borderBottomWidth: 1, borderBottomColor: THEME.border },
  headerCell: { paddingVertical: 10, fontWeight: 'bold', fontSize: 10, textAlign: 'center', borderRightWidth: 1, borderRightColor: THEME.border, paddingTop: 31 },
  phaseHeaderCellText: { position: 'absolute', top: 0, left: 0, width: '100%', paddingVertical: 4, fontWeight: 'bold', fontSize: 11, textAlign: 'center', backgroundColor: THEME.tableHeaderBg, height: 31, borderBottomWidth: 1, borderBottomColor: THEME.border },
  equipmentPhaseSubHeader: { flexDirection: 'row', flex: 1, marginTop: 31 },
  equipmentSubHeaderCell: { flex: 1, paddingVertical: 5 },
  transparentCell: { color: 'transparent' },
  sendButton: { backgroundColor: THEME.primary, padding: 15, borderRadius: 10, alignItems: 'center' },
  sendButtonText: { color: '#FFF', fontWeight: 'bold' },
  quantityRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: 10 },
  quantityLabel: { fontSize: 16, color: THEME.textSecondary, fontWeight: '500' },
  totalBox: { paddingHorizontal: 15, paddingVertical: 8, backgroundColor: THEME.primary, borderRadius: 8, minWidth: 80, alignItems: 'center' },
  totalText: { fontSize: 18, fontWeight: 'bold', color: THEME.card },
  notesText: { fontSize: 15, color: THEME.text, lineHeight: 22, marginTop: 5 },
});

export default ForemanTimesheetViewScreen;