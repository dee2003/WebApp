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
    Modal,
    Image,
    Platform,
} from 'react-native';
import apiClient from '../../api/apiClient';
import type { Timesheet } from '../../types'; 
import Feather from "react-native-vector-icons/Feather";
import Pdf from 'react-native-pdf';
import API_URL from "../../config";

const API_BASE_URL = API_URL;

// --- Type Definitions ---
type SimpleHourState = Record<string, Record<string, string>>;
type EmployeeHourState = Record<string, Record<string, Record<string, string>>>;
type ComplexHourSubState = { REG?: string; 'S.B'?: string };
type ComplexHourState = Record<string, Record<string, ComplexHourSubState>>;
type QuantityState = Record<string, string>;
type UnitState = Record<string, string | null>;

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

type TableCategory = "employee" | "equipment" | "material" | "vendor" | "dumping_site";

const COL_NAME = 160;
const COL_ID = 70;              
const COL_CLASS = 80;
const COL_MATERIAL = 130;       
const COL_EMPLOYEE_HOUR = 110;   
const COL_SIMPLE_HOUR = 110;    
const COL_EQUIP = 110;          
const COL_TICKET = 80;
const COL_LINK = 60; 
const COL_UNIT = 70; 
const COL_TOTAL = 100;

const getImageUri = (ticket: any): string | null => {
    if (!ticket) return null;
    const path = ticket.image_path || ticket.image_url || ticket.file_url;
    if (!path) return null;
    if (path.startsWith("http")) return path;
    return `${API_BASE_URL}${path.startsWith('/') ? path : '/' + path}`;
};

const getPhaseGroupWidth = (type: TableCategory): number => {
  if (type === "equipment") return COL_EQUIP * 2; 
  if (type === "employee") return COL_EMPLOYEE_HOUR;       
  return COL_SIMPLE_HOUR; 
};

const ForemanTimesheetViewScreen = ({ navigation, route }: any) => {
    const { timesheetId } = route.params;
    const [timesheet, setTimesheet] = useState<any>(null);
    const [foremanName, setForemanName] = useState<string>('');
    const [supervisorName, setSupervisorName] = useState<string>(''); 
    const [loading, setLoading] = useState(true);

    const [availableScannedTickets, setAvailableScannedTickets] = useState<any[]>([]);
    const [selectedTicketIds, setSelectedTicketIds] = useState<{ [rowId: string]: number[] }>({});
    const [selectedTicket, setSelectedTicket] = useState<any | null>(null);
    const [isPdfFullScreen, setIsPdfFullScreen] = useState(false);

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

                try {
                    const ticketsRes = await apiClient.get(`/api/tickets/${timesheetId}/scanned-tickets`);
                    setAvailableScannedTickets(ticketsRes.data || []);
                } catch (e) { console.warn("Tickets fetch failed", e); }

                if (tsData.data?.linked_tickets) {
                    setSelectedTicketIds(tsData.data.linked_tickets);
                }

                const populateSimple = (entities: any[] = [], field: 'hours_per_phase' | 'tickets_per_phase', type?: 'material' | 'vendor' | 'dumping_site'): SimpleHourState => {
                    const state: SimpleHourState = {};
                    entities.forEach((e) => {
                        let id = (type === 'vendor') 
                            ? `${e.vendor_id || e.id}_${e.material_id || e.id}`
                            : String(e.id);
                        
                        state[id] = {};
                        let phaseData = e[field] || {};

                        if (field === 'tickets_per_phase' && Object.keys(phaseData).length === 0 && e.tickets_loads) {
                            const val = typeof e.tickets_loads === 'object' ? (e.tickets_loads[id] || Object.values(e.tickets_loads)[0]) : e.tickets_loads;
                            if (val && tsData.data.job.phase_codes) {
                                tsData.data.job.phase_codes.forEach((p: string) => { state[id][p] = String(val); });
                            }
                        } else {
                            Object.entries(phaseData).forEach(([phase, val]) => {
                                state[id][phase] = String(val || '0');
                            });
                        }
                    });
                    return state;
                };

                const populateUnits = (entities: any[] = [], type: 'material' | 'vendor' | 'dumping'): UnitState => {
                    const state: UnitState = {};
                    entities.forEach(e => {
                        let id = (type === 'vendor') ? `${e.vendor_id || e.id}_${e.material_id || e.id}` : String(e.id);
                        state[id] = e.unit || (type === 'dumping' ? 'Loads' : null);
                    });
                    return state;
                };

                const populateEmployeeComplex = (entities: any[] = []): EmployeeHourState => {
                    const state: EmployeeHourState = {};
                    entities.forEach((e) => {
                        state[e.id] = {};
                        if (e.hours_per_phase) {
                            Object.entries(e.hours_per_phase).forEach(([phase, phaseHours]: any) => {
                                state[e.id][phase] = {};
                                Object.entries(phaseHours).forEach(([classCode, val]: any) => {
                                    state[e.id][phase][classCode] = String(val || '0');
                                });
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
                                    REG: (v.REG ?? '0').toString(),
                                    'S.B': (v.SB ?? v['S.B'] ?? '0').toString(),
                                };
                            }
                        }
                    });
                    return state;
                };

                setEmployeeHours(populateEmployeeComplex(tsData.data.employees));
                setEquipmentHours(populateEquipmentComplex(tsData.data.equipment));
                
                setMaterialHours(populateSimple(tsData.data.materials_trucking, 'hours_per_phase', 'material')); 
                setVendorHours(populateSimple(tsData.data.vendors, 'hours_per_phase', 'vendor'));
                setMaterialTickets(populateSimple(tsData.data.materials_trucking, 'tickets_per_phase', 'material')); 
                setVendorTickets(populateSimple(tsData.data.vendors, 'tickets_per_phase', 'vendor'));
                setDumpingSiteHours(populateSimple(tsData.data.dumping_sites, 'hours_per_phase', 'dumping_site'));
                setDumpingSiteTickets(populateSimple(tsData.data.dumping_sites, 'tickets_per_phase', 'dumping_site'));

                setMaterialUnits(populateUnits(tsData.data.materials_trucking, 'material'));
                setVendorUnits(populateUnits(tsData.data.vendors, 'vendor'));

                if (tsData.data.total_quantities) {
                    const q: QuantityState = {};
                    for (const phase in tsData.data.total_quantities) {
                        q[phase] = tsData.data.total_quantities[phase].toString();
                    }
                    setTotalQuantities(q);
                }

                try {
                    const userRes = await apiClient.get(`/api/users/${tsData.foreman_id}`);
                    setForemanName(`${userRes.data.first_name} ${userRes.data.last_name}`.trim());
                } catch (e) {}

                setSupervisorName(tsData.data.supervisor?.name || tsData.data.supervisor || "N/A");

            } catch (error) {
                Alert.alert('Error', 'Failed to load timesheet.');
            } finally {
                setLoading(false);
            }
        };
        fetchData();
    }, [timesheetId]);
// Inside ForemanTimesheetViewScreen.tsx

const handleSendTimesheet = async (id: number) => {
    // 1. Get all ticket IDs that are currently linked to rows in the timesheet
    const allLinkedTicketIds = Object.values(selectedTicketIds).flat();
    
    // 2. Filter the scanned tickets to find any that are NOT in the linked list
    const unlinkedTickets = availableScannedTickets.filter(
        ticket => !allLinkedTicketIds.includes(ticket.id || ticket.ID)
    );

    // 3. If there are unlinked tickets, block submission and show the warning
    if (unlinkedTickets.length > 0) {
        // Map through unlinked tickets to get their Ticket Numbers
        const ticketList = unlinkedTickets
            .map(t => t.ticket_number && t.ticket_number !== "" 
                ? `Ticket #${t.ticket_number}` 
                : `Unlabeled Ticket (ID: ${t.id || t.ID})`
            )
            .join('\n');
        
        Alert.alert(
            "Unlinked Tickets Detected",
            `The following tickets must be linked to a row before sending:\n\n${ticketList}`,
            [{ text: "OK" }]
        );
        return; // Prevent the API call from executing
    }

    // 4. If validation passes, proceed with the existing submission alert
    Alert.alert("Confirm Submission", "Are you sure you want to send this timesheet? All linked tickets will be submitted automatically.", [
        { text: "Cancel", style: "cancel" },
        {
            text: "Send",
            onPress: async () => {
                setLoading(true);
                try {
                    await apiClient.post(`/api/timesheets/${id}/send`);
                    Alert.alert("Success", "Timesheet and linked tickets submitted.");
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
    const handleViewLinkedTicket = (rowId: string) => {
        const linkedIds = selectedTicketIds[rowId];
        if (!linkedIds || linkedIds.length === 0) return;

        const ticket = availableScannedTickets.find(t => linkedIds.includes(t.id || t.ID));
        if (ticket) {
            setSelectedTicket(ticket);
            setIsPdfFullScreen(true);
        } else {
            Alert.alert("Error", "Ticket file not found.");
        }
    };

    const calculateTotalSimpleHours = (state: SimpleHourState, id: string) => 
        Object.values(state[id] || {}).reduce((t, v) => t + (parseFloat(v) || 0), 0);

    const calculateTotalEmployeeHours = (state: EmployeeHourState, id: string) => 
        Object.values(state[id] || {}).reduce((pt, ch) => pt + Object.values(ch).reduce((ct, h) => ct + (parseFloat(h) || 0), 0), 0);

    const calculateTotalComplexHours = (state: ComplexHourState, id: string) => 
        Object.values(state[id] || {}).reduce((t, v) => t + (parseFloat(v.REG ?? '0')) + (parseFloat(v['S.B'] ?? '0')), 0);

    const renderTableBlock = (
        title: string,
        entities: any[],
        hoursState: any,
        ticketsState: any,
        type: TableCategory,
        unitState: any,
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
            fixedWidth += COL_ID + COL_TICKET + COL_UNIT + COL_LINK;
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
                            {isVendor && <Text style={[styles.headerCell, styles.colId, styles.borderRight, styles.headerCellBottomBorder]}>V-ID</Text>}
                            <Text style={[styles.headerCell, styles.colName, styles.borderRight, styles.headerCellBottomBorder]}>Name</Text>
                            {isEmployee && <Text style={[styles.headerCell, styles.colId, styles.borderRight, styles.headerCellBottomBorder]}>EMP#</Text>}
                            {isEquipment && <Text style={[styles.headerCell, styles.colId, styles.borderRight, styles.headerCellBottomBorder]}>EQUIP#</Text>}
                            {isEmployee && <Text style={[styles.headerCell, styles.colClassCode, styles.borderRight, styles.headerCellBottomBorder]}>Class</Text>}
                            {isVendor && <Text style={[styles.headerCell, styles.colMaterial, styles.borderRight, styles.headerCellBottomBorder]}>Material</Text>}
                            {isSimple && <Text style={[styles.headerCell, styles.colUnit, styles.borderRight, styles.headerCellBottomBorder]}>Unit</Text>}
                            {isSimple && <Text style={[styles.headerCell, styles.colTickets, styles.borderRight, styles.headerCellBottomBorder]}>Ticks</Text>}
                            {isSimple && <Text style={[styles.headerCell, styles.colLink, styles.borderRight, styles.headerCellBottomBorder]}>Link</Text>}

                            {phaseCodes.map((p: string, i: number) => (
                                <View key={p} style={[isEquipment ? styles.dynamicPhaseColEquipment : isEmployee ? styles.dynamicPhaseColEmployee : styles.dynamicPhaseColSimple, i === phaseCodes.length - 1 ? {} : styles.phaseGroupBorderRight]}>
                                    <Text style={styles.phaseHeaderCellText}>{p}</Text>
                                    {!isEquipment && <Text style={[styles.headerCell, styles.colHoursSimple, styles.lastCell, styles.headerCellBottomBorder]}>{isEmployee ? 'Hrs' : 'Qty'}</Text>}
                                    {isEquipment && (
                                        <View style={styles.equipmentPhaseSubHeader}>
                                            <Text style={[styles.headerCell, styles.colHoursEquipment, styles.equipmentSubHeaderCell, styles.borderRight, styles.headerCellBottomBorder]}>REG</Text>
                                            <Text style={[styles.headerCell, styles.colHoursEquipment, styles.equipmentSubHeaderCell, styles.lastCell, styles.headerCellBottomBorder]}>SB</Text>
                                        </View>
                                    )}
                                </View>
                            ))}
                            <Text style={[styles.headerCell, styles.colTotal, styles.lastCell, styles.borderLeft, styles.headerCellBottomBorder]}>Total</Text>
                        </View>

                        {/* BODY */}
                        {entities.map((e, idx) => {
                            const eid = isVendor ? `${e.vendor_id || e.id}_${e.material_id || e.id}` : String(e.id);
                            const total = isEquipment ? calculateTotalComplexHours(hoursState, eid) : isEmployee ? calculateTotalEmployeeHours(hoursState, eid) : calculateTotalSimpleHours(hoursState, eid);
                            const name = isVendor ? e.vendor_name : (e.name || e.material_name || `${e.first_name || ''} ${e.last_name || ''}`);
                            const isNew = (isVendor || type === 'material') ? name !== lastEntityName : true;
                            if (isVendor || type === 'material') lastEntityName = name;

                            const tickTotal = isSimple ? calculateTotalSimpleHours(ticketsState, eid) : 0;
                            const hasLink = isSimple && selectedTicketIds[eid] && selectedTicketIds[eid].length > 0;

                            return (
                                <View key={idx} style={[styles.tableRow, idx % 2 === 1 && styles.tableRowAlternate]}>
                                    {(type === 'material' || isDumping) && <Text style={[styles.dataCell, styles.colId, styles.borderRight]}>{isNew ? (e.id) : ''}</Text>}
                                    {isVendor && <Text style={[styles.dataCell, styles.colId, styles.borderRight]}>{isNew ? e.vendor_id : ''}</Text>}
                                    <View style={[styles.dataCell, styles.colName, styles.borderRight]}><Text style={styles.rowText} numberOfLines={2}>{isNew || isEquipment ? name : ''}</Text></View>
                                    {isEmployee && <Text style={[styles.dataCell, styles.colId, styles.borderRight]}>{e.id}</Text>}
                                    {isEquipment && <Text style={[styles.dataCell, styles.colId, styles.borderRight]}>{e.id}</Text>}
                                    {isEmployee && <Text style={[styles.dataCell, styles.colClassCode, styles.borderRight]}>{e.class_1 || 'N/A'}</Text>}
                                    {isVendor && <Text style={[styles.dataCell, styles.colMaterial, styles.borderRight]}>{e.material_name}</Text>}
                                    {isSimple && <Text style={[styles.dataCell, styles.colUnit, styles.borderRight]}>{isDumping ? 'Loads' : (unitState[eid] || e.unit || '')}</Text>}
                                    {isSimple && <Text style={[styles.dataCell, styles.colTickets, styles.borderRight]}>{tickTotal > 0 ? tickTotal : '-'}</Text>}
                                    
                                    {isSimple && (
                                        <View style={[styles.dataCell, styles.colLink, styles.borderRight, { justifyContent: 'center' }]}>
                                            {hasLink ? (
                                                <TouchableOpacity onPress={() => handleViewLinkedTicket(eid)}>
                                                    <Feather name="paperclip" size={16} color={THEME.primary} />
                                                </TouchableOpacity>
                                            ) : (
                                                <Text style={{color: '#999'}}>-</Text>
                                            )}
                                        </View>
                                    )}

                                    {phaseCodes.map((p: string, i: number) => (
                                        <View key={p} style={[isEquipment ? styles.dynamicPhaseColEquipment : isEmployee ? styles.dynamicPhaseColEmployee : styles.dynamicPhaseColSimple, i === phaseCodes.length - 1 ? {} : styles.phaseGroupBorderRight]}>
                                            {isEquipment ? (
                                                <>
                                                    <Text style={[styles.dataCell, styles.colHoursEquipment, styles.borderRight]}>{parseFloat(hoursState[eid]?.[p]?.REG || '0').toFixed(1)}</Text>
                                                    <Text style={[styles.dataCell, styles.colHoursEquipment, styles.lastCell]}>{parseFloat(hoursState[eid]?.[p]?.['S.B'] || '0').toFixed(1)}</Text>
                                                </>
                                            ) : (
                                                <Text style={[styles.dataCell, { flex: 1 }, styles.lastCell]}>
                                                    {isEmployee ? parseFloat(hoursState[eid]?.[p]?.[e.class_1] || '0').toFixed(1) : parseFloat(hoursState[eid]?.[p] || '0').toFixed(1)}
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
            <ScrollView contentContainerStyle={{ padding: THEME.SPACING, paddingBottom: 80 }}>
                {/* --- INFO CARD --- */}
                <View style={styles.infoCard}>
                    <Text style={styles.jobTitle}>{timesheet.data.job_name}</Text>
                    <Text style={styles.jobCode}>Job Code: {timesheet.data.job.job_code}</Text>
                    <View style={styles.infoGrid}>
                        <View style={styles.infoItem}><Text style={styles.infoLabel}>Date</Text><Text style={styles.infoValue}>{new Date(timesheet.date).toLocaleDateString()}</Text></View>
                        <View style={styles.infoItem}><Text style={styles.infoLabel}>Foreman</Text><Text style={styles.infoValue}>{foremanName}</Text></View>
                        <View style={styles.infoItem}><Text style={styles.infoLabel}>Supervisor</Text><Text style={styles.infoValue}>{supervisorName}</Text></View>
                        <View style={styles.infoItem}><Text style={styles.infoLabel}>Location</Text><Text style={styles.infoValue}>{timesheet.data.location || 'N/A'}</Text></View>
                        <View style={styles.infoItem}><Text style={styles.infoLabel}>Weather</Text><Text style={styles.infoValue}>{timesheet.data.weather || 'N/A'}</Text></View>
                        <View style={styles.infoItem}><Text style={styles.infoLabel}>Temp</Text><Text style={styles.infoValue}>{timesheet.data.temperature || 'N/A'}</Text></View>
                        <View style={styles.infoItem}><Text style={styles.infoLabel}>Time of Day</Text><Text style={styles.infoValue}>{timesheet.data.time_of_day || 'N/A'}</Text></View>
                    </View>
                </View>

                {/* --- TABLES --- */}
                {renderTableBlock('Employees', timesheet.data.employees, employeeHours, null, 'employee', null)}
                {renderTableBlock('Equipment', timesheet.data.equipment, equipmentHours, null, 'equipment', null)}
                {renderTableBlock('Materials', timesheet.data.materials_trucking || [], materialHours, materialTickets, 'material', materialUnits)}
                {renderTableBlock('Vendors', timesheet.data.vendors || [], vendorHours, vendorTickets, 'vendor', vendorUnits)}
                {renderTableBlock('Dumping Sites', timesheet.data.dumping_sites || [], dumpingSiteHours, dumpingSiteTickets, 'dumping_site', null)}

                {/* --- TOTAL QUANTITIES --- */}
                <View style={styles.card}>
                    <Text style={styles.tableTitle}>Total Quantities</Text>
                    {Object.keys(totalQuantities).length > 0 ? (
                        Object.keys(totalQuantities).map(p => (
                            <View key={p} style={styles.quantityRow}>
                                <Text style={styles.quantityLabel}>Phase {p}:</Text>
                                <View style={styles.totalBox}><Text style={styles.totalText}>{totalQuantities[p]}</Text></View>
                            </View>
                        ))
                    ) : (
                        <Text style={{color: THEME.textSecondary, fontStyle: 'italic'}}>No quantities entered.</Text>
                    )}
                </View>

                {/* --- NOTES --- */}
                {notes ? (
                    <View style={styles.card}>
                        <Text style={styles.tableTitle}>Notes</Text>
                        <Text style={styles.notesText}>{notes}</Text>
                    </View>
                ) : null}

                {/* --- FOOTER ACTION --- */}
                <TouchableOpacity style={styles.sendButton} onPress={() => handleSendTimesheet(timesheetId)}>
                    <Text style={styles.sendButtonText}>Send To Supervisor</Text>
                </TouchableOpacity>
            </ScrollView>

            {/* --- PDF VIEWER --- */}
            <Modal visible={isPdfFullScreen} transparent={false} animationType="slide">
                <SafeAreaView style={styles.fullScreenPdfContainer}>
                    <View style={styles.fullScreenHeader}>
                        <Text style={styles.fullScreenTitle}>Ticket View</Text>
                        <TouchableOpacity onPress={() => setIsPdfFullScreen(false)}><Text style={{color: '#fff'}}>Close</Text></TouchableOpacity>
                    </View>
                    {selectedTicket && (
                        (() => {
                            const uri = getImageUri(selectedTicket);
                            if (!uri) return <Text style={{color: '#fff', textAlign: 'center', marginTop: 20}}>File path error</Text>;
                            return uri.toLowerCase().endsWith('.pdf') ? (
                                <Pdf source={{ uri, cache: true }} style={styles.fullScreenPdf} />
                            ) : (
                                <Image source={{ uri }} style={{ flex: 1, resizeMode: 'contain' }} />
                            );
                        })()
                    )}
                </SafeAreaView>
            </Modal>
        </SafeAreaView>
    );
};

const styles = StyleSheet.create({
    safeArea: { flex: 1, backgroundColor: THEME.background },
    centered: { flex: 1, justifyContent: 'center', alignItems: 'center' },
    infoCard: { padding: THEME.SPACING, backgroundColor: THEME.card, borderRadius: 14, marginBottom: THEME.SPACING, elevation: 3 },
    jobTitle: { fontSize: 20, fontWeight: 'bold', color: THEME.text },
    jobCode: { fontSize: 14, color: THEME.textSecondary },
    infoGrid: { marginTop: 10, flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-between' },
    infoItem: { width: '48%', marginBottom: 10 },
    infoLabel: { fontSize: 10, color: THEME.textSecondary, textTransform: 'uppercase', marginBottom: 2 },
    infoValue: { fontSize: 14, fontWeight: '600', color: THEME.text },
    card: { backgroundColor: THEME.card, borderRadius: 12, padding: THEME.SPACING, marginBottom: THEME.SPACING },
    tableTitle: { fontSize: 16, fontWeight: 'bold', marginBottom: 8 },
    tableContainer: { borderWidth: 1, borderColor: THEME.border, borderRadius: 6, overflow: 'hidden' },
    colName: { width: COL_NAME },
    colId: { width: COL_ID },
    colClassCode: { width: COL_CLASS },
    colMaterial: { width: COL_MATERIAL },
    colHoursSimple: { width: COL_SIMPLE_HOUR },
    colHoursEquipment: { width: COL_EQUIP },
    colTickets: { width: COL_TICKET },
    colLink: { width: COL_LINK },
    colUnit: { width: COL_UNIT },
    colTotal: { width: COL_TOTAL },
    dynamicPhaseColEmployee: { flexDirection: 'row', width: COL_EMPLOYEE_HOUR },
    dynamicPhaseColSimple: { flexDirection: 'row', width: COL_SIMPLE_HOUR },
    dynamicPhaseColEquipment: { flexDirection: 'row', width: COL_EQUIP * 2 },
    phaseGroupBorderRight: { borderRightWidth: 1, borderRightColor: THEME.border },
    tableRow: { flexDirection: 'row', borderTopWidth: 1, borderTopColor: THEME.border, alignItems: 'center' },
    tableRowAlternate: { backgroundColor: THEME.rowAlternateBg },
    borderRight: { borderRightWidth: 1, borderRightColor: THEME.border },
    borderLeft: { borderLeftWidth: 1, borderLeftColor: THEME.border },
    lastCell: { borderRightWidth: 0 },
    dataCell: { padding: 4, fontSize: 10, textAlign: 'center', minHeight: 40, justifyContent: 'center' },
    rowText: { fontSize: 10, textAlign: 'left' },
    tableHeader: { flexDirection: 'row', backgroundColor: THEME.tableHeaderBg },
    headerCellBottomBorder: { borderBottomWidth: 1, borderBottomColor: THEME.border },
    headerCell: { paddingVertical: 8, fontWeight: 'bold', fontSize: 10, textAlign: 'center', borderRightWidth: 1, borderRightColor: THEME.border, paddingTop: 28 },
    phaseHeaderCellText: { position: 'absolute', top: 0, left: 0, width: '100%', paddingVertical: 2, fontWeight: 'bold', fontSize: 10, textAlign: 'center', backgroundColor: THEME.tableHeaderBg, height: 28, borderBottomWidth: 1, borderBottomColor: THEME.border },
    equipmentPhaseSubHeader: { flexDirection: 'row', flex: 1, marginTop: 28 },
    equipmentSubHeaderCell: { flex: 1, paddingVertical: 4 },
    sendButton: { backgroundColor: THEME.primary, padding: 14, borderRadius: 8, alignItems: 'center', marginTop: 10 },
    sendButtonText: { color: '#FFF', fontWeight: 'bold' },
    quantityRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: 6 },
    quantityLabel: { fontSize: 14, color: THEME.textSecondary },
    totalBox: { paddingHorizontal: 12, paddingVertical: 6, backgroundColor: THEME.primary, borderRadius: 6 },
    totalText: { fontSize: 14, fontWeight: 'bold', color: '#FFF' },
    notesText: { fontSize: 14, color: THEME.text, lineHeight: 20 },
    fullScreenPdfContainer: { flex: 1, backgroundColor: "#000" },
    fullScreenPdf: { flex: 1, width: "100%" },
    fullScreenHeader: { flexDirection: "row", justifyContent: "space-between", padding: 16, borderBottomWidth: 1, borderBottomColor: "#333" },
    fullScreenTitle: { fontSize: 16, color: "#fff", fontWeight: "bold" },
});

export default ForemanTimesheetViewScreen;