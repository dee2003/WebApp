import React, { useState, useEffect, useCallback } from 'react';
import {
    View,
    Text,
    StyleSheet,
    TouchableOpacity,
    Image,
    Alert,
    FlatList,
    ActivityIndicator,
    Modal,
    Dimensions,
    TextInput,
    ScrollView,
    KeyboardAvoidingView,
    Platform
} from 'react-native';
import Ionicons from 'react-native-vector-icons/Ionicons';
import { useRoute, useNavigation, RouteProp } from '@react-navigation/native';
import apiClient from '../../api/apiClient';
import { THEME } from '../../constants/theme';
import Pdf from 'react-native-pdf';
import { ProjectEngineerStackParamList } from '../../navigation/AppNavigator';

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
    phase_code_?: string; 
    zone?: string;
    hours?: number | null;
    
    table_data?: any[] | null;
}

interface PhaseOption {
    label: string;
    value: number;
}

export default function PETicketList() {
    const navigation = useNavigation();
    const route = useRoute<RouteProp<ProjectEngineerStackParamList, 'PETicketList'>>();
    
    const { foremanId, date: routeDate } = route.params;

    const [tickets, setTickets] = useState<Ticket[]>([]);
    const [availablePhases, setAvailablePhases] = useState<PhaseOption[]>([]);
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);

    // --- Modal State ---
    const [selectedTicket, setSelectedTicket] = useState<Ticket | null>(null);
    const [isModalVisible, setModalVisible] = useState(false);
    const [isSaving, setIsSaving] = useState(false);
    const [viewMode, setViewMode] = useState<'form' | 'file'>('form'); 
    const [formData, setFormData] = useState<Partial<Ticket>>({});

    useEffect(() => {
        navigation.setOptions({
            title: `Foreman Tickets (${new Date(routeDate).toLocaleDateString()})`,
        });
    }, [routeDate, navigation]);

    const loadData = useCallback(async () => {
        const fetchStateSetter = refreshing ? setRefreshing : setLoading;
        fetchStateSetter(true);
        try {
            const phasesRes = await apiClient.get('/api/job-phases/phase-codes');
            const phases = phasesRes.data.map((p: any) => ({
                label: `${p.code} - ${p.description || ''}`,
                value: p.id,
            }));
            setAvailablePhases(phases);

            const ticketRes = await apiClient.get('/api/tickets/for-supervisor', {
                params: { foreman_id: foremanId, date: routeDate },
            });
            setTickets(ticketRes.data || []); 

        } catch (err: any) {
            console.error('Load Error:', err);
            Alert.alert('Error', 'Failed to load tickets.');
        } finally {
            setLoading(false);
            setRefreshing(false);
        }
    }, [foremanId, routeDate, refreshing]);

    useEffect(() => {
        loadData();
    }, [loadData]);

    const handleRefresh = () => {
        setRefreshing(true);
        loadData();
    };

    const openTicketModal = (ticket: Ticket, initialViewMode: 'form' | 'file') => {
        setSelectedTicket(ticket);
        
        let safeTableData: any[] = [];
        if (Array.isArray(ticket.table_data)) {
            safeTableData = ticket.table_data;
        }

        setFormData({
            ticket_number: ticket.ticket_number,
            ticket_date: ticket.ticket_date,
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
            const payload = {
                ...formData,
                hours: formData.hours ? Number(formData.hours) : null
            };
            await apiClient.patch(`/api/tickets/${selectedTicket.id}`, payload);

            setTickets(prev => prev.map(t => 
                t.id === selectedTicket.id ? { ...t, ...payload } as Ticket : t
            )); 

            Alert.alert("Success", "Ticket details updated.");
            setModalVisible(false);
        } catch (error: any) {
            Alert.alert("Error", "Failed to save changes.");
        } finally {
            setIsSaving(false);
        }
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

    const renderTicketItem = ({ item }: { item: Ticket }) => {
        const isPdf = item.image_path.toLowerCase().endsWith('.pdf');
        const fileUri = `${apiClient.defaults.baseURL}${item.image_path}`;
        const phaseLabel = availablePhases.find(p => p.value === item.phase_code_id)?.label || 'Not Assigned';

        return (
            <View style={styles.card}>
                {/* LEFT: Preview */}
                <View style={styles.previewColumn}>
                    <TouchableOpacity onPress={() => openTicketModal(item, 'file')} style={styles.previewContainer}>
                        {isPdf ? (
                            <Pdf
                                source={{ uri: fileUri, cache: true }}
                                style={styles.pdfPreview}
                                singlePage={true} 
                                trustAllCerts={false}
                            />
                        ) : (
                            <Image
                                source={{ uri: fileUri }}
                                style={styles.imagePreview}
                                resizeMode="cover"
                            />
                        )}
                        <View style={styles.previewOverlay}>
                            <Ionicons name="expand-outline" size={20} color="#fff" />
                        </View>
                    </TouchableOpacity>
                </View>

                {/* RIGHT: Actions */}
                <View style={styles.actionsColumn}>
                    <View style={styles.cardHeader}>
                        <Text style={styles.cardTitle}>Ticket #{item.ticket_number || item.id}</Text>
                    </View>

                    {/* ⭐ UPDATED: Simple Text Line for Phase Code */}
                    <Text style={styles.phaseCodeLine} numberOfLines={2}>
                        <Text style={styles.phaseCodeLabel}>Phase Code: </Text>
                        <Text style={styles.phaseCodeValue}>{phaseLabel}</Text>
                    </Text>

                    <TouchableOpacity 
                        style={styles.editButton} 
                        onPress={() => openTicketModal(item, 'form')}
                    >
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
                <ActivityIndicator size="large" color={THEME.colors.brandStone} style={{ marginTop: 20 }} />
            ) : (
                <FlatList
                    data={tickets}
                    keyExtractor={item => item.id.toString()}
                    renderItem={renderTicketItem}
                    onRefresh={handleRefresh}
                    refreshing={refreshing}
                    contentContainerStyle={styles.listContent}
                    ListEmptyComponent={
                        <View style={styles.emptyContainer}>
                            <Text style={styles.emptyText}>No tickets found.</Text>
                        </View>
                    }
                />
            )}

            <Modal
                visible={isModalVisible}
                animationType="slide"
                presentationStyle="pageSheet"
                onRequestClose={() => setModalVisible(false)}
            >
                <View style={styles.modalContainer}>
                    <View style={styles.modalHeader}>
                        <TouchableOpacity onPress={() => setModalVisible(false)}>
                            <Text style={styles.cancelText}>Cancel</Text>
                        </TouchableOpacity>
                        <Text style={styles.modalTitle}>Edit Ticket</Text>
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
                                    <Pdf
                                        source={{ uri: `${apiClient.defaults.baseURL}${selectedTicket.image_path}`, cache: true }}
                                        style={styles.fullPdf}
                                        trustAllCerts={false}
                                    />
                                ) : (
                                    <Image
                                        source={{ uri: `${apiClient.defaults.baseURL}${selectedTicket.image_path}` }}
                                        style={styles.fullImage}
                                        resizeMode="contain"
                                    />
                                )}
                            </View>
                        )}

                        {viewMode === 'form' && (
                            <KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : "height"} style={{ flex: 1 }}>
                                <ScrollView contentContainerStyle={styles.formContainer}>
                                    <Text style={styles.sectionHeader}>Ticket Data</Text>
                                    <View style={styles.row}>
                                        <View style={styles.halfInput}>{renderInput('Ticket #', 'ticket_number', '1001')}</View>
                                        <View style={styles.halfInput}>{renderInput('Date', 'ticket_date', 'YYYY-MM-DD')}</View>
                                    </View>
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

    card: {
        flexDirection: 'row', 
        backgroundColor: 'white',
        borderRadius: 12,
        marginBottom: 16,
        overflow: 'hidden',
        height: 160, 
        shadowColor: '#000',
        shadowOpacity: 0.1,
        shadowRadius: 4,
        elevation: 3,
    },
    previewColumn: {
        width: 110,
        backgroundColor: '#eee',
    },
    previewContainer: {
        flex: 1,
        width: '100%',
        height: '100%',
        position: 'relative',
    },
    pdfPreview: {
        flex: 1,
        width: 110,
        height: 160,
        backgroundColor: '#f0f0f0',
    },
    imagePreview: {
        width: '100%',
        height: '100%',
    },
    previewOverlay: {
        position: 'absolute',
        bottom: 5,
        right: 5,
        backgroundColor: 'rgba(0,0,0,0.6)',
        borderRadius: 15,
        padding: 4,
    },
    actionsColumn: {
        flex: 1,
        padding: 12,
        justifyContent: 'space-between',
        backgroundColor: '#c2c2c2ff', 
    },
    cardHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
    },
    cardTitle: {
        fontSize: 16,
        fontWeight: '700',
        color: '#333',
    },
    
    // ⭐ UPDATED Phase Code Text Styles
    phaseCodeLine: {
        fontSize: 14,
        marginBottom: 8,
    },
    phaseCodeLabel: {
        fontWeight: '700', // Bold Label
        color: '#181717ff', 
    },
    phaseCodeValue: {
        fontWeight: '400', // Normal Value
        color: '#333',
    },

    editButton: {
        backgroundColor: THEME.colors.primary,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        paddingVertical: 8,
        borderRadius: 8,
    },
    editButtonText: {
        color: '#fff',
        fontSize: 13,
        fontWeight: '600',
        marginLeft: 6,
    },
    modalContainer: { flex: 1, backgroundColor: '#fff' },
    modalHeader: {
        flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
        padding: 16, borderBottomWidth: 1, borderBottomColor: '#eee', backgroundColor: '#fff',
    },
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
    textInput: {
        backgroundColor: 'white', borderWidth: 1, borderColor: '#e0e0e0', borderRadius: 8,
        padding: 12, fontSize: 16, color: '#333',
    },
    noDataText: { fontStyle: 'italic', color: '#999', textAlign: 'center' },
    
    // Table Grid Styles
    tableBorder: {
        borderWidth: 1,
        borderColor: '#ddd',
        borderRadius: 6,
        overflow: 'hidden',
        marginTop: 10,
        backgroundColor: '#fff',
    },
    tableHeaderRow: {
        flexDirection: 'row',
        backgroundColor: '#e0e0e0',
        borderBottomWidth: 1,
        borderBottomColor: '#999',
    },
    headerCell: {
        width: 120, 
        padding: 10,
        borderRightWidth: 1,
        borderRightColor: '#ccc',
        backgroundColor: '#d6d6d6',
        justifyContent: 'center',
    },
    headerText: {
        fontWeight: 'bold',
        fontSize: 13,
        color: '#333',
        textAlign: 'center',
    },
    tableRow: {
        flexDirection: 'row',
        borderBottomWidth: 1,
        borderBottomColor: '#eee',
    },
    evenRow: { backgroundColor: '#fff' },
    oddRow: { backgroundColor: '#f9f9f9' },
    cell: {
        width: 120, 
        borderRightWidth: 1,
        borderRightColor: '#eee',
        padding: 4,
        justifyContent: 'center',
    },
    cellInput: {
        fontSize: 14,
        color: '#000',
        paddingHorizontal: 6,
        paddingVertical: 8,
        textAlign: 'center',
    },
});