

import React, { useState, useEffect, useCallback, useMemo } from 'react';
import {
    View,
    Text,
    StyleSheet,
    TouchableOpacity,
    Image,
    Alert,
    SectionList,
    ActivityIndicator,
    Modal,
    Dimensions,
    TextInput,
    ScrollView,
    KeyboardAvoidingView,
    Platform
} from 'react-native';
import RNPickerSelect from 'react-native-picker-select';
import Ionicons from 'react-native-vector-icons/Ionicons';
import { useNavigation } from '@react-navigation/native';
import apiClient from '../../api/apiClient';
import { THEME } from '../../constants/theme';
import Pdf from 'react-native-pdf';
import DateTimePicker from '@react-native-community/datetimepicker'; // Add this import
const { width } = Dimensions.get('window');

// --- Types ---
interface Ticket {
    id: number;
    image_path: string;
    phase_code_id?: number | null;
    ticket_number?: string;
    ticket_date?: string;
    haul_vendor?: string;
    truck_number?: string;
    material?: string;
    job_number?: string; 
    zone?: string;
    hours?: number;
    job_phase_id?: number;
    category?: string | null;
    table_data?: any[] | null; 
}

interface PhaseOption {
    label: string;
    value: number;
}

export default function SupervisorTicketsScreen({ route }: any) {
    const navigation = useNavigation();
    const { foremanId, foremanName, date: routeDate } = route.params;

    const [tickets, setTickets] = useState<Ticket[]>([]);
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);
    const [phaseOptionsByTicket, setPhaseOptionsByTicket] = useState<Record<number, PhaseOption[]>>({});

    // --- Modal State ---
    const [selectedTicket, setSelectedTicket] = useState<Ticket | null>(null);
    const [isModalVisible, setModalVisible] = useState(false);
    const [isSaving, setIsSaving] = useState(false);
    const [viewMode, setViewMode] = useState<'form' | 'file'>('form'); 
    const [formData, setFormData] = useState<Partial<Ticket>>({});

// Inside your SupervisorTicketsScreen component:
const [showDatePicker, setShowDatePicker] = useState(false);

const onDateChange = (event: any, selectedDate?: Date) => {
    setShowDatePicker(false); // Close the picker
    if (selectedDate) {
        // Format to YYYY-MM-DD for the state, which is easily converted
        const formattedDate = selectedDate.toISOString().split('T')[0];
        handleFormChange('ticket_date', formattedDate);
    }
};
const formatDateUS = (date?: string) => {
    if (!date) return '';
    
    // If user is currently typing (e.g., ends in a slash), 
    // don't try to re-format it via Date object or it will break typing flow.
    if (date.includes('/') && date.length <= 10) return date;

    const d = new Date(date);
    if (isNaN(d.getTime())) return date;

    return `${String(d.getMonth() + 1).padStart(2, '0')}/${String(d.getDate()).padStart(2, '0')}/${d.getFullYear()}`;
};

    useEffect(() => {
        navigation.setOptions({
            title: `${foremanName} (${new Date(routeDate).toLocaleDateString()})`,
        });
    }, [foremanName, routeDate, navigation]);

const loadData = useCallback(async () => {
  const fetchStateSetter = refreshing ? setRefreshing : setLoading;
  fetchStateSetter(true);
  
  try {
    // ✅ ONLY foremanid + date - match backend exactly
    const ticketRes = await apiClient.get('/api/tickets/for-supervisor', {
      params: {
    foreman_id: foremanId,  // ✅ underscore, not foremanid
        date: routeDate  // 2025-12-26 ✅
      }
    });
    
    console.log('Loaded tickets:', ticketRes.data.length);
    setTickets(ticketRes.data);
  } catch (err) {
    console.error('Ticket load error:', err);
    Alert.alert('Error', 'Failed to load tickets.');
  } finally {
    setLoading(false);
    setRefreshing(false);
  }
}, [foremanId, routeDate, refreshing]);


    const loadPhaseCodesForTicket = async (ticket: Ticket) => {
        if (!ticket.job_phase_id || phaseOptionsByTicket[ticket.id]) return;
        try {
            const res = await apiClient.get('/api/job-phases/phase-codes', {
                params: { job_phase_id: ticket.job_phase_id },
            });
            const phases = res.data.map((p: any) => ({
                label: `${p.code} - ${p.description || ''}`,
                value: p.id,
            }));
            setPhaseOptionsByTicket(prev => ({ ...prev, [ticket.id]: phases }));
        } catch (err) {
            console.error('Failed to load phase codes', err);
        }
    };

    useEffect(() => {
        loadData();
    }, [loadData]);

    useEffect(() => {
        tickets.forEach(ticket => {
            loadPhaseCodesForTicket(ticket);
        });
    }, [tickets]);

    // Grouping Logic
    const sections = useMemo(() => {
        const grouped: Record<string, Ticket[]> = {};
        
tickets.forEach((t) => {
    let cat = t.category ? t.category.trim() : "Unspecified";

    // Normalize Strings
    if (cat.toLowerCase() === 'trucking') cat = 'Trucking';
    if (cat.toLowerCase() === 'materials') cat = 'Materials';

    // 🔹 ADD THIS
    if (cat.toLowerCase().includes('dump')) {
        cat = 'Dumping Sites';
    }

    // Fallback categorization based on material keywords
    if (cat === "Unspecified" && t.material) {
        const mat = t.material.toLowerCase();
        if (
            mat.includes('dump') ||
            mat.includes('landfill')
        ) {
            cat = 'Dumping Sites';
        } else if (
            mat.includes('haul') ||
            mat.includes('truck') ||
            mat.includes('delivery')
        ) {
            cat = "Trucking";
        } else if (
            mat.includes('rock') ||
            mat.includes('dirt') ||
            mat.includes('sand') ||
            mat.includes('stone')
        ) {
            cat = "Materials";
        }
    }

    if (!grouped[cat]) grouped[cat] = [];
    grouped[cat].push(t);
});


        return Object.keys(grouped)
            .sort((a, b) => {
                if (a === 'Materials') return -1;
                if (b === 'Trucking') return 1;
                return a.localeCompare(b);
            })
            .map(category => ({
                title: category,
                data: grouped[category]
            }));
    }, [tickets]);

    const handleRefresh = () => {
        setRefreshing(true);
        loadData();
    };

    const handleQuickPhaseUpdate = async (ticketId: number, newPhaseId: number | string) => {
        const phaseId = Number(newPhaseId);
        setTickets(prev =>
            prev.map(t => (t.id === ticketId ? { ...t, phase_code_id: phaseId } : t))
        );
        try {
            await apiClient.patch(`/api/tickets/${ticketId}`, { phase_code_id: phaseId });
        } catch (error) {
            Alert.alert("Error", "Failed to save phase selection.");
            loadData();
        }
    };
const openTicketModal = (ticket: Ticket, initialViewMode: 'form' | 'file') => {
    setSelectedTicket(ticket);
    let safeTableData: any[] = Array.isArray(ticket.table_data) ? ticket.table_data : [];

    setFormData({
        ticket_number: ticket.ticket_number,
        // ✅ Apply the US format conversion here
        ticket_date: formatDateUS(ticket.ticket_date), 
        haul_vendor: ticket.haul_vendor,
        truck_number: ticket.truck_number,
        material: ticket.material,
        job_number: ticket.job_number,
        zone: ticket.zone,
        hours: ticket.hours,
        table_data: safeTableData 
    });

    setViewMode(initialViewMode);
    setModalVisible(true);
};

    const handleFormChange = (key: keyof Ticket, value: any) => {
        setFormData(prev => ({ ...prev, [key]: value }));
    };

    const handleTableCellChange = (visualRowIndex: number, colIndex: string, value: string) => {
        if (!formData.table_data) return;
        const actualRowIndex = visualRowIndex + 1;
        const updatedTable = [...formData.table_data];
        
        if (Array.isArray(updatedTable[actualRowIndex])) {
            updatedTable[actualRowIndex] = [...updatedTable[actualRowIndex]];
            updatedTable[actualRowIndex][Number(colIndex)] = value;
        } else {
            updatedTable[actualRowIndex] = { ...updatedTable[actualRowIndex], [colIndex]: value };
        }
        setFormData(prev => ({ ...prev, table_data: updatedTable }));
    };

    const saveTicketChanges = async () => {
        if (!selectedTicket) return;
        setIsSaving(true);
        try {
            let finalDate = formData.ticket_date;
        
        // Convert MM/DD/YYYY back to YYYY-MM-DD for the database
        if (finalDate && finalDate.includes('/')) {
            const [m, d, y] = finalDate.split('/');
            finalDate = `${y}-${m.padStart(2, '0')}-${d.padStart(2, '0')}`;
        }
            const payload = {
                ...formData,
                ticket_date: finalDate,
                hours: formData.hours ? Number(formData.hours) : null
            };
            const res = await apiClient.patch(`/api/tickets/${selectedTicket.id}`, payload);
            setTickets(prev => prev.map(t => t.id === selectedTicket.id ? { ...t, ...res.data } : t)); 
            Alert.alert("Success", "Ticket details updated.");
            setModalVisible(false);
        } catch (error) {
            Alert.alert("Error", "Failed to save changes.");
        } finally {
            setIsSaving(false);
        }
    };
const getCategoryIcon = (title: string) => {
    switch (title) {
        case 'Materials':
            return 'cube-outline';
        case 'Trucking':
            return 'bus-outline';
        case 'Dumping Sites':
            return 'trash-outline';   // ✅ valid Ionicon
        default:
            return 'file-tray-outline';
    }
};


    // --- Render Helpers ---

    const renderTable = () => {
        const data = formData.table_data;
        if (!data || !Array.isArray(data) || data.length < 2) { 
            return <Text style={styles.noDataText}>No valid table data found.</Text>;
        }
        const headerRow = Object.values(data[0]); 
        const bodyRows = data.slice(1);

        return (
            <View style={styles.tableBorder}>
                <ScrollView horizontal showsHorizontalScrollIndicator={true}>
                    <View>
                        <View style={styles.tableHeaderRow}>
                            {headerRow.map((headerText, index) => (
                                <View key={index} style={styles.headerCell}>
                                    <Text style={styles.headerText}>{String(headerText)}</Text>
                                </View>
                            ))}
                        </View>
                        {bodyRows.map((row, rowIndex) => {
                            const rowValues = Object.values(row);
                            const rowKeys = Object.keys(row);
                            return (
                                <View key={rowIndex} style={[styles.tableRow, rowIndex % 2 === 0 ? styles.evenRow : styles.oddRow]}>
                                    {rowValues.map((cellValue, colIndex) => (
                                        <View key={colIndex} style={styles.cell}>
                                            <TextInput
                                                style={styles.cellInput}
                                                value={String(cellValue || '')}
                                                onChangeText={(text) => handleTableCellChange(rowIndex, rowKeys[colIndex], text)}
                                                multiline={true} 
                                            />
                                        </View>
                                    ))}
                                </View>
                            );
                        })}
                    </View>
                </ScrollView>
            </View>
        );
    };

    const renderInput = (label: string, field: keyof Ticket, placeholder: string, keyboardType: 'default' | 'numeric' = 'default') => (
        <View style={styles.inputGroup}>
            <Text style={styles.inputLabel}>{label}</Text>
            <TextInput
                style={styles.textInput}
                value={formData[field] ? String(formData[field]) : ''}
                onChangeText={(text) => handleFormChange(field, text)}
                placeholder={placeholder}
                placeholderTextColor="#ccc"
                keyboardType={keyboardType}
            />
        </View>
    );

    const renderTicketItem = ({ item }: { item: Ticket }) => {
        const isPdf = item.image_path.toLowerCase().endsWith('.pdf');
        const fileUri = `${apiClient.defaults.baseURL}${item.image_path}`;

        return (
            <View style={styles.card}>
                <View style={styles.previewColumn}>
                    <TouchableOpacity onPress={() => openTicketModal(item, 'file')} style={styles.previewContainer}>
                        {isPdf ? (
                            <Pdf source={{ uri: fileUri, cache: true }} style={styles.pdfPreview} singlePage={true} trustAllCerts={false} />
                        ) : (
                            <Image source={{ uri: fileUri }} style={styles.imagePreview} resizeMode="cover" />
                        )}
                        <View style={styles.previewOverlay}>
                            <Ionicons name="expand-outline" size={20} color="#fff" />
                        </View>
                    </TouchableOpacity>
                </View>

                <View style={styles.actionsColumn}>
                    <View style={styles.cardHeader}>
                        <Text style={styles.cardTitle}>Ticket #{item.ticket_number || item.id}</Text>
                    </View>
                    <Text style={styles.labelSmall}>Phase Code</Text>
                    <View style={styles.pickerContainer}>
                        <RNPickerSelect
                            items={phaseOptionsByTicket[item.id] || []}
                            value={item.phase_code_id}
                            onValueChange={(value) => handleQuickPhaseUpdate(item.id, value)}
                            placeholder={{ label: 'Select Phase...', value: undefined }}
                            useNativeAndroidPickerStyle={false}
                        />
                    </View>
                    <TouchableOpacity style={styles.editButton} onPress={() => openTicketModal(item, 'form')}>
                        <Ionicons name="create-outline" size={18} color="#fff" />
                        <Text style={styles.editButtonText}>View & Edit Data</Text>
                    </TouchableOpacity>
                </View>
            </View>
        );
    };

    return (
        <View style={styles.container}>
            {loading && !refreshing ? (
                <ActivityIndicator size="large" color={THEME.colors.primary} style={{ marginTop: 20 }} />
            ) : (
                <SectionList
                    sections={sections}
                    keyExtractor={item => item.id.toString()}
                    renderItem={renderTicketItem}
                    renderSectionHeader={({ section: { title } }) => (
                        <View style={styles.categoryHeader}>
                            <Ionicons 
                                name={getCategoryIcon(title)} 
                                size={20} 
                                color={THEME.colors.primary} 
                            />
                            <Text style={styles.categoryTitle}>{title.toUpperCase()}</Text>
                        </View>
                    )}
                    onRefresh={handleRefresh}
                    refreshing={refreshing}
                    contentContainerStyle={styles.listContent}
                    stickySectionHeadersEnabled={false}
                    ListEmptyComponent={
                        <View style={styles.emptyContainer}>
                            <Text style={styles.emptyText}>No submitted tickets found.</Text>
                        </View>
                    }
                />
            )}

            <Modal visible={isModalVisible} animationType="slide" presentationStyle="pageSheet" onRequestClose={() => setModalVisible(false)}>
                <View style={styles.modalContainer}>
                    <View style={styles.modalHeader}>
                        <TouchableOpacity onPress={() => setModalVisible(false)}><Text style={styles.cancelText}>Cancel</Text></TouchableOpacity>
                        <Text style={styles.modalTitle}>Ticket Details</Text>
                        <TouchableOpacity onPress={saveTicketChanges} disabled={isSaving}>
                            {isSaving ? <ActivityIndicator size="small" color={THEME.colors.primary} /> : <Text style={styles.saveText}>Save</Text>}
                        </TouchableOpacity>
                    </View>

                    <View style={styles.tabContainer}>
                        <TouchableOpacity style={[styles.tab, viewMode === 'form' && styles.activeTab]} onPress={() => setViewMode('form')}>
                            <Text style={[styles.tabText, viewMode === 'form' && styles.activeTabText]}>Data</Text>
                        </TouchableOpacity>
                        <TouchableOpacity style={[styles.tab, viewMode === 'file' && styles.activeTab]} onPress={() => setViewMode('file')}>
                            <Text style={[styles.tabText, viewMode === 'file' && styles.activeTabText]}>File</Text>
                        </TouchableOpacity>
                    </View>

                    <View style={styles.modalContent}>
                        {viewMode === 'file' && selectedTicket && (
                            <View style={styles.fileViewerContainer}>
                                {selectedTicket.image_path.toLowerCase().endsWith('.pdf') ? (
                                    <Pdf source={{ uri: `${apiClient.defaults.baseURL}${selectedTicket.image_path}`, cache: true }} style={styles.fullPdf} trustAllCerts={false} />
                                ) : (
                                    <Image source={{ uri: `${apiClient.defaults.baseURL}${selectedTicket.image_path}` }} style={styles.fullImage} resizeMode="contain" />
                                )}
                            </View>
                        )}
                        {viewMode === 'form' && (
                            <KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : "height"} style={{ flex: 1 }}>
                                <ScrollView contentContainerStyle={styles.formContainer}>
                                    <Text style={styles.sectionHeader}>Extracted Data</Text>
                                    <View style={styles.row}>
                                        <View style={styles.halfInput}>{renderInput('Ticket #', 'ticket_number', '1001')}</View>
<View style={styles.halfInput}>
    <View style={styles.inputGroup}>
        <Text style={styles.inputLabel}>Date</Text>
        <TouchableOpacity 
            style={styles.textInput} 
            onPress={() => setShowDatePicker(true)}
        >
            <Text style={{ color: formData.ticket_date ? '#333' : '#ccc' }}>
                {formData.ticket_date ? formatDateUS(formData.ticket_date) : 'Select Date'}
            </Text>
        </TouchableOpacity>
    </View>
</View>

{showDatePicker && (
    <DateTimePicker
        value={formData.ticket_date ? new Date(formData.ticket_date) : new Date()}
        mode="date"
        display={Platform.OS === 'ios' ? 'inline' : 'default'}
        onChange={onDateChange}
    />
)}                                   </View>
                                    
                                    {renderInput('Vendor', 'haul_vendor', 'Vendor Name')}
                                    <View style={styles.row}>
                                        <View style={styles.halfInput}>{renderInput('Truck #', 'truck_number', 'T-101')}</View>
                                        <View style={styles.halfInput}>{renderInput('Job #', 'job_number', 'Job Code')}</View>
                                    </View>
                                    {renderInput('Material', 'material', 'Material Name')}
                                    <View style={styles.row}>
                                        <View style={styles.halfInput}>{renderInput('Zone', 'zone', 'Zone')}</View>
                                        <View style={styles.halfInput}>{renderInput('Hours', 'hours', '0.0', 'numeric')}</View>
                                    </View>
                                    <Text style={styles.sectionHeader}>Table Data</Text>
                                    {renderTable()}
                                    <View style={{ height: 40 }} />
                                </ScrollView>
                            </KeyboardAvoidingView>
                        )}
                    </View>
                </View>
            </Modal>
        </View>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: '#f5f5f5' },
    listContent: { padding: 12 },
    emptyContainer: { flex: 1, alignItems: 'center', justifyContent: 'center', marginTop: 50 },
    emptyText: { color: '#888', fontSize: 16 },

    categoryHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingVertical: 14,
        paddingHorizontal: 8,
        backgroundColor: '#f5f5f5',
        marginTop: 10,
    },
    categoryTitle: {
        fontSize: 14,
        fontWeight: '800',
        color: '#444',
        marginLeft: 10,
        letterSpacing: 1.2,
    },

    card: {
        flexDirection: 'row', backgroundColor: 'white', borderRadius: 12, marginBottom: 16,
        overflow: 'hidden', height: 160, elevation: 3,
        shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.1, shadowRadius: 4,
    },
    previewColumn: { width: 110, backgroundColor: '#eee' },
    previewContainer: { flex: 1, width: '100%', height: '100%', position: 'relative' },
    pdfPreview: { flex: 1, width: 110, height: 160 },
    imagePreview: { width: '100%', height: '100%' },
    previewOverlay: { position: 'absolute', bottom: 5, right: 5, backgroundColor: 'rgba(0,0,0,0.6)', borderRadius: 15, padding: 4 },
    actionsColumn: { flex: 1, padding: 12, justifyContent: 'space-between', backgroundColor: '#fff' },
    cardHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
    cardTitle: { fontSize: 16, fontWeight: '700', color: '#333' },
    labelSmall: { fontSize: 11, color: '#777', marginBottom: 4, textTransform: 'uppercase', fontWeight: '700' },
    pickerContainer: { borderWidth: 1, borderColor: '#eee', borderRadius: 8, backgroundColor: '#f9f9f9', height: 40, justifyContent: 'center', marginBottom: 8, paddingHorizontal: 8 },
    editButton: { backgroundColor: THEME.colors.primary, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', paddingVertical: 10, borderRadius: 8 },
    editButtonText: { color: '#fff', fontSize: 13, fontWeight: '600', marginLeft: 6 },
    modalContainer: { flex: 1, backgroundColor: '#fff' },
    modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 16, borderBottomWidth: 1, borderBottomColor: '#eee' },
    modalTitle: { fontSize: 17, fontWeight: 'bold' },
    cancelText: { fontSize: 16, color: '#666' },
    saveText: { fontSize: 16, color: THEME.colors.primary, fontWeight: 'bold' },
    tabContainer: { flexDirection: 'row', borderBottomWidth: 1, borderBottomColor: '#eee' },
    tab: { flex: 1, paddingVertical: 12, alignItems: 'center' },
    activeTab: { borderBottomWidth: 2, borderBottomColor: THEME.colors.primary },
    tabText: { fontSize: 15, color: '#666' },
    activeTabText: { color: THEME.colors.primary, fontWeight: 'bold' },
    modalContent: { flex: 1, backgroundColor: '#f8f9fa' },
    fileViewerContainer: { flex: 1, backgroundColor: '#222' },
    fullPdf: { flex: 1, width: width },
    fullImage: { width: '100%', height: '100%' },
    formContainer: { padding: 20 },
    sectionHeader: { fontSize: 13, fontWeight: '700', color: '#888', marginBottom: 12, marginTop: 15 },
    row: { flexDirection: 'row', justifyContent: 'space-between' },
    halfInput: { width: '48%' },
    inputGroup: { marginBottom: 16 },
    inputLabel: { fontSize: 14, color: '#444', marginBottom: 6, fontWeight: '600' },
    textInput: { backgroundColor: 'white', borderWidth: 1, borderColor: '#ccc', borderRadius: 8, padding: 12, fontSize: 16, color: '#333' },
    noDataText: { fontStyle: 'italic', color: '#999', textAlign: 'center' },
    tableBorder: { borderWidth: 1, borderColor: '#ddd', borderRadius: 6, overflow: 'hidden', marginTop: 10, backgroundColor: '#fff' },
    tableHeaderRow: { flexDirection: 'row', backgroundColor: '#e0e0e0', borderBottomWidth: 1, borderBottomColor: '#999' },
    headerCell: { width: 120, padding: 10, borderRightWidth: 1, borderRightColor: '#ccc', backgroundColor: '#d6d6d6', justifyContent: 'center' },
    headerText: { fontWeight: 'bold', fontSize: 13, color: '#333', textAlign: 'center' },
    tableRow: { flexDirection: 'row', borderBottomWidth: 1, borderBottomColor: '#eee' },
    evenRow: { backgroundColor: '#fff' },
    oddRow: { backgroundColor: '#f9f9f9' },
    cell: { width: 120, borderRightWidth: 1, borderRightColor: '#eee', padding: 4, justifyContent: 'center' },
    cellInput: { fontSize: 14, color: '#000', paddingHorizontal: 6, paddingVertical: 8, textAlign: 'center' },
});