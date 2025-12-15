import React, { useEffect, useState, useCallback } from 'react';
import {
    View,
    Text,
    FlatList,
    StyleSheet,
    ActivityIndicator,
    RefreshControl,
    Alert,
    Image,
    Modal,
    TouchableOpacity,
    Dimensions,
    TextInput,
    ScrollView,
    KeyboardAvoidingView,
    Platform
} from 'react-native';
import Ionicons from 'react-native-vector-icons/Ionicons';
import { RouteProp, useRoute, useNavigation } from '@react-navigation/native';
import apiClient from '../../api/apiClient';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { ProjectEngineerStackParamList } from '../../navigation/AppNavigator';

// ✅ IMPORT PDF LIBRARY
import Pdf from 'react-native-pdf';

const THEME = {
    colors: {
        primary: '#4A5C4D',
        secondary: '#2C3E50',
        backgroundLight: '#F8F7F2',
        contentLight: '#3D3D3D',
        subtleLight: '#797979',
        cardLight: '#FFFFFF',
        brandStone: '#8E8E8E',
        danger: '#FF3B30',
        border: '#E5E5E5',
        inputBg: '#F0F0F0',
        success: '#27AE60',
        pdfPaper: '#FFF',
    },
    borderRadius: { lg: 16, sm: 8, xs: 4, full: 9999 },
};

type Ticket = {
    id: number;
    image_path: string;
    phase_code?: { id: number; code: string; description: string }; 
    phase_code_id?: number;
    ticket_number?: string;
    ticket_date?: string;
    haul_vendor?: string;
    truck_number?: string;
    material?: string;
    job_number?: string;
    zone?: string;
    hours?: number;
    raw_text_content?: string;
    table_data?: any; 
};

type PETicketListNavigationProp = NativeStackNavigationProp<any, 'PETicketList'>;
const HORIZONTAL_PADDING = 16;
const CARD_HEIGHT = 120;

const PETicketList = () => {
    const navigation = useNavigation<PETicketListNavigationProp>();
    const route = useRoute<RouteProp<ProjectEngineerStackParamList, 'PETicketList'>>();
    const { foremanId } = route.params;
    const TODAY_DATE = new Date().toISOString().split('T')[0];

    const [tickets, setTickets] = useState<Ticket[]>([]);
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);
    
    const [editModalVisible, setEditModalVisible] = useState(false);
    const [editingTicket, setEditingTicket] = useState<Ticket | null>(null);
    const [saving, setSaving] = useState(false);
    const [formData, setFormData] = useState<Partial<Ticket>>({});

    const loadTickets = useCallback(async () => {
    try {
        setLoading(true);
        const res = await apiClient.get(
            `/api/review/pe/tickets?foreman_id=${foremanId}&date=${TODAY_DATE}`
        );
        console.log('Tickets from API:', res.data);  // <--- add this
        setTickets(res.data);
    } catch (error: any) {
        console.error('Failed to load tickets:', error);
        Alert.alert('Error', 'Failed to load tickets');
    } finally {
        setLoading(false);
    }
}, [foremanId, TODAY_DATE]);


    useEffect(() => {
        loadTickets();
    }, [loadTickets]);

    const onRefresh = useCallback(async () => {
        setRefreshing(true);
        await loadTickets();
        setRefreshing(false);
    }, [loadTickets]);

const handleEditPress = (item: Ticket) => {
    console.log('Editing ticket:', item); // Debug

    setEditingTicket(item);

    setFormData({
        ticket_number: item.ticket_number ?? '',
        truck_number: item.truck_number ?? '',
        haul_vendor: item.haul_vendor ?? '',
        material: item.material ?? '',
        ticket_date: item.ticket_date ?? '',
        hours: item.hours ?? 0,
        zone: item.zone ?? '',
        job_number: item.job_number ?? '',
        table_data: Array.isArray(item.table_data)
            ? item.table_data.map(row => Array.isArray(row) ? [...row] : [])
            : []
    });

    setEditModalVisible(true);
};



    const handleSaveChanges = async () => {
        if (!editingTicket) return;
        try {
            setSaving(true);
            await apiClient.patch(`/api/review/pe/tickets/${editingTicket.id}`, formData);
            Alert.alert("Success", "Ticket updated successfully");
            setEditModalVisible(false);
            setEditingTicket(null);
            loadTickets(); 
        } catch (error) {
            console.error(error);
            Alert.alert("Error", "Failed to update ticket");
        } finally {
            setSaving(false);
        }
    };

    const handleFieldChange = (field: keyof Ticket, value: string) => {
        setFormData(prev => ({ ...prev, [field]: value }));
    };

    // ✅ NEW: Handle individual table cell edits
    const handleTableCellChange = (text: string, rowIndex: number, colIndex: number) => {
        if (!formData.table_data) return;
        
        // Deep copy the table data to avoid direct mutation
        const newTableData = [...formData.table_data];
        newTableData[rowIndex] = [...newTableData[rowIndex]];
        newTableData[rowIndex][colIndex] = text;

        setFormData(prev => ({ ...prev, table_data: newTableData }));
    };

    const handleThumbnailPress = (item: Ticket) => {
        const fileUri = `${apiClient.defaults.baseURL}${item.image_path}`;
        if (item.image_path && item.image_path.toLowerCase().endsWith('.pdf')) {
            navigation.navigate('PDFViewer', { uri: fileUri });
        } else {
            handleEditPress(item);
        }
    };

    const openPdfFromModal = () => {
        if (editingTicket) {
            setEditModalVisible(false);
            setTimeout(() => {
                const fileUri = `${apiClient.defaults.baseURL}${editingTicket.image_path}`;
                navigation.navigate('PDFViewer', { uri: fileUri });
            }, 300);
        }
    };

    // ✅ UPDATED: Renders editable inputs without headers
    const renderEditableTable = () => {
        const data = formData.table_data;
        if (!data || !Array.isArray(data) || data.length === 0) {
            return <Text style={styles.noDataText}>No table data extracted.</Text>;
        }

        return (
            <ScrollView horizontal style={styles.tableScroll}>
                <View>
                    {data.map((row: any[], rowIndex: number) => (
                        <View key={rowIndex} style={styles.tableRow}>
                            {row.map((cellValue: string, colIndex: number) => (
                                <View key={colIndex} style={styles.tableCell}>
                                    <TextInput
                                        style={styles.tableInput}
                                        value={String(cellValue)}
                                        onChangeText={(text) => handleTableCellChange(text, rowIndex, colIndex)}
                                        multiline={true} // Allow wrapping if needed
                                    />
                                </View>
                            ))}
                        </View>
                    ))}
                </View>
            </ScrollView>
        );
    };

    const renderTicketItem = ({ item }: { item: Ticket }) => (
        <View style={styles.ticketCardRow}>
            {/* 1. LEFT SIDE: Image/PDF Preview */}
            <TouchableOpacity 
                activeOpacity={0.8}
                style={styles.imageContainerRow}
                onPress={() => handleThumbnailPress(item)}
            >
                {item.image_path && item.image_path.toLowerCase().endsWith('.pdf') ? (
                    <View style={styles.pdfPaperPreview}>
                        <View style={styles.fakeLineLong} />
                        <View style={styles.fakeLineShort} />
                        <View style={styles.fakeLineLong} />
                        <View style={styles.fakeLineLong} />
                        <View style={styles.fakeLineShort} />
                        <View style={styles.pdfBadge}>
                            <Text style={styles.pdfBadgeText}>PDF</Text>
                        </View>
                    </View>
                ) : (
                    <Image
                        source={{ uri: `${apiClient.defaults.baseURL}${item.image_path}` }}
                        style={styles.imageRow}
                        resizeMode="cover"
                    />
                )}
            </TouchableOpacity>

            {/* 2. CENTER: Details */}
            <View style={styles.detailsContainerRow}>
                <View>
                    <Text style={styles.labelSmall}>Ticket #</Text>
                    <Text style={styles.ticketNumberText}>{item.ticket_number || 'N/A'}</Text>
                </View>
                <View style={styles.phaseCodeContainer}>
                    <Text style={styles.labelSmall}>Phase Code:</Text>
                    <Text style={[styles.phaseCodeText, !item.phase_code && styles.errorText]}>
                        {item.phase_code ? item.phase_code.code : 'MISSING'}
                    </Text>
                </View>
            </View>

            {/* 3. RIGHT SIDE: BIG EDIT BUTTON */}
            <TouchableOpacity 
                style={styles.bigEditButton} 
                onPress={() => handleEditPress(item)}
                activeOpacity={0.7}
            >
                <Text style={styles.bigEditText}>View / Edit Data</Text>
                <Ionicons name="create-outline" size={16} color="#FFF" style={{ marginLeft: 4 }} />
            </TouchableOpacity>
        </View>
    );

    return (
        <View style={styles.container}>
            <FlatList
                data={tickets}
                keyExtractor={(item) => item.id.toString()}
                contentContainerStyle={styles.listContent}
                refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
                renderItem={renderTicketItem}
                ListEmptyComponent={
                    <View style={styles.emptyContainer}>
                        <Text style={styles.emptyText}>No Tickets Found</Text>
                    </View>
                }
            />

            {/* EDIT MODAL */}
            <Modal visible={editModalVisible} animationType="slide" presentationStyle="pageSheet">
                <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={{ flex: 1 }}>
                    <View style={styles.modalHeader}>
                        <Text style={styles.modalTitle}>Edit Ticket</Text>
                        <TouchableOpacity onPress={() => setEditModalVisible(false)}>
                            <Text style={styles.closeText}>Close</Text>
                        </TouchableOpacity>
                    </View>

                    <ScrollView style={styles.modalScroll}>
                        {editingTicket && (
                            <>
                                {/* --- 1. PREVIEW SECTION (Actual PDF or Image) --- */}
                                <View style={styles.modalImageContainer}>
                                    {editingTicket.image_path.toLowerCase().endsWith('.pdf') ? (
                                        <View style={styles.pdfContainer}>
                                            <Pdf
                                                source={{ 
                                                    uri: `${apiClient.defaults.baseURL}${editingTicket.image_path}`, 
                                                    cache: true 
                                                }}
                                                style={styles.pdfView}
                                                trustAllCerts={false}
                                                fitPolicy={0} 
                                                spacing={0}
                                            />
                                        </View>
                                    ) : (
                                        <Image
                                            source={{ uri: `${apiClient.defaults.baseURL}${editingTicket.image_path}` }}
                                            style={styles.modalImage}
                                            resizeMode="contain"
                                        />
                                    )}
                                </View>

                                {/* --- 2. FORM SECTION --- */}
                                <View style={styles.formSection}>
                                    <Text style={styles.sectionTitle}>Extracted Data</Text>
                                    
                                    <View style={styles.inputRow}>
                                        <View style={styles.inputGroup}>
                                            <Text style={styles.label}>Ticket Number</Text>
                                            <TextInput style={styles.input} value={formData.ticket_number} onChangeText={(t) => handleFieldChange('ticket_number', t)} />
                                        </View>
                                        <View style={styles.inputGroup}>
                                            <Text style={styles.label}>Date</Text>
                                            <TextInput style={styles.input} value={formData.ticket_date} onChangeText={(t) => handleFieldChange('ticket_date', t)} />
                                        </View>
                                    </View>

                                    <View style={styles.inputRow}>
                                        <View style={styles.inputGroup}>
                                            <Text style={styles.label}>Job Number</Text>
                                            <TextInput style={styles.input} value={formData.job_number} onChangeText={(t) => handleFieldChange('job_number', t)} />
                                        </View>
                                        
                                    </View>

                                    <View style={styles.inputGroup}>
                                        <Text style={styles.label}>Material</Text>
                                        <TextInput style={styles.input} value={formData.material} onChangeText={(t) => handleFieldChange('material', t)} />
                                    </View>

                                    <View style={styles.inputRow}>
                                        <View style={styles.inputGroup}>
                                            <Text style={styles.label}>Truck #</Text>
                                            <TextInput style={styles.input} value={formData.truck_number} onChangeText={(t) => handleFieldChange('truck_number', t)} />
                                        </View>
                                        <View style={styles.inputGroup}>
                                            <Text style={styles.label}>Haul Vendor</Text>
                                            <TextInput style={styles.input} value={formData.haul_vendor} onChangeText={(t) => handleFieldChange('haul_vendor', t)} />
                                        </View>
                                    </View>

                                    <View style={styles.inputRow}>
                                        <View style={styles.inputGroup}>
                                            <Text style={styles.label}>Hours</Text>
                                            <TextInput style={styles.input} value={formData.hours ? String(formData.hours) : ''} keyboardType="numeric" onChangeText={(t) => handleFieldChange('hours', t)} />
                                        </View>
                                        <View style={styles.inputGroup}>
                                            <Text style={styles.label}>Zone</Text>
                                            <TextInput style={styles.input} value={formData.zone} onChangeText={(t) => handleFieldChange('zone', t)} />
                                        </View>
                                    </View>
                                </View>

                                {/* --- 3. TABLE DATA (EDITABLE) --- */}
                                <View style={styles.tableSection}>
                                    <Text style={styles.sectionTitle}>Extracted Table Data</Text>
                                    <View style={styles.tableContainer}>
                                        {renderEditableTable()}
                                    </View>
                                </View>
                                <View style={{height: 100}} />
                            </>
                        )}
                    </ScrollView>

                    <View style={styles.saveContainer}>
                        <TouchableOpacity style={styles.saveButton} onPress={handleSaveChanges} disabled={saving}>
                            {saving ? <ActivityIndicator color="#FFF" /> : <Text style={styles.saveButtonText}>Save Changes</Text>}
                        </TouchableOpacity>
                    </View>
                </KeyboardAvoidingView>
            </Modal>
        </View>
    );
};

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: THEME.colors.backgroundLight },
    listContent: { paddingHorizontal: HORIZONTAL_PADDING, paddingBottom: 20, paddingTop: 10 },
    
    ticketCardRow: {
        flexDirection: 'row',
        backgroundColor: THEME.colors.cardLight,
        borderRadius: THEME.borderRadius.sm,
        padding: 12,
        marginBottom: 12,
        alignItems: 'center',
        shadowColor: '#000', shadowOpacity: 0.08, shadowRadius: 4, elevation: 2,
        height: CARD_HEIGHT,
    },
    
    // PDF/Image Preview in List
    imageContainerRow: { width: 70, height: 90, marginRight: 14, shadowColor: '#000', shadowOpacity: 0.1, shadowRadius: 3, elevation: 2 },
    imageRow: { width: '100%', height: '100%', borderRadius: THEME.borderRadius.sm, backgroundColor: '#eee' },
    
    pdfPaperPreview: {
        width: '100%', height: '100%', backgroundColor: '#FFF', borderRadius: 4, borderWidth: 1, borderColor: '#E0E0E0',
        padding: 8, justifyContent: 'flex-start', position: 'relative'
    },
    fakeLineLong: { height: 4, width: '90%', backgroundColor: '#E0E0E0', marginBottom: 6, borderRadius: 2 },
    fakeLineShort: { height: 4, width: '60%', backgroundColor: '#E0E0E0', marginBottom: 6, borderRadius: 2 },
    pdfBadge: { position: 'absolute', bottom: 0, right: 0, backgroundColor: THEME.colors.danger, paddingHorizontal: 6, paddingVertical: 2, borderTopLeftRadius: 4, borderBottomRightRadius: 4 },
    pdfBadgeText: { color: '#FFF', fontSize: 10, fontWeight: 'bold' },

    detailsContainerRow: { flex: 1, justifyContent: 'center' },
    
    // Big Edit Button
    bigEditButton: {
        backgroundColor: THEME.colors.primary,
        paddingHorizontal: 14, paddingVertical: 10, borderRadius: 8,
        flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
        shadowColor: THEME.colors.primary, shadowOpacity: 0.2, shadowRadius: 3, elevation: 2,
    },
    bigEditText: { color: '#FFF', fontSize: 12, fontWeight: '700' },
    
    labelSmall: { fontSize: 10, color: THEME.colors.subtleLight, textTransform: 'uppercase', marginBottom: 2 },
    ticketNumberText: { fontSize: 16, fontWeight: '700', color: THEME.colors.secondary, marginBottom: 6 },
    phaseCodeContainer: { marginTop: 2 },
    phaseCodeText: { fontSize: 14, fontWeight: '600', color: THEME.colors.primary },
    errorText: { color: THEME.colors.danger },

    // Modal Styles
    modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 16, borderBottomWidth: 1, borderBottomColor: '#eee', backgroundColor: '#fff', marginTop: 40 },
    modalTitle: { fontSize: 18, fontWeight: '700', color: THEME.colors.secondary },
    closeText: { fontSize: 16, color: THEME.colors.primary, fontWeight: '600' },
    modalScroll: { flex: 1, backgroundColor: '#fff' },
    
    modalImageContainer: { height: 350, backgroundColor: '#f0f0f0', borderBottomWidth: 1, borderBottomColor: '#eee' },
    modalImage: { width: '100%', height: '100%', resizeMode: 'contain' },
    
    // PDF Viewer in Modal
    pdfContainer: { flex: 1, width: '100%', height: '100%', alignItems: 'center', justifyContent: 'center' },
    pdfView: { flex: 1, width: Dimensions.get('window').width, height: 350, backgroundColor: '#f0f0f0' },

    // Form
    formSection: { padding: 16 },
    sectionTitle: { fontSize: 16, fontWeight: '700', color: THEME.colors.primary, marginBottom: 12 },
    inputRow: { flexDirection: 'row', justifyContent: 'space-between' },
    inputGroup: { marginBottom: 12, flex: 0.48 },
    label: { fontSize: 12, color: THEME.colors.subtleLight, marginBottom: 4, fontWeight: '500' },
    input: { borderWidth: 1, borderColor: THEME.colors.border, borderRadius: 8, padding: 10, fontSize: 14, backgroundColor: THEME.colors.inputBg, color: '#333' },
    
    // Table
    tableSection: { padding: 16, paddingTop: 0 },
    tableContainer: { borderWidth: 1, borderColor: '#eee', borderRadius: 8, overflow: 'hidden' },
    tableScroll: { flexDirection: 'column' },
    tableRow: { flexDirection: 'row', borderBottomWidth: 1, borderBottomColor: '#eee', backgroundColor: '#fff' },
    tableCell: { padding: 0, width: 100, borderRightWidth: 1, borderRightColor: '#eee', height: 40 },
    
    // Table Input Styles
    tableInput: {
        fontSize: 12, color: '#333', padding: 8, height: '100%', width: '100%'
    },
    
    noDataText: { fontStyle: 'italic', color: '#999', padding: 10 },

    saveContainer: { padding: 16, borderTopWidth: 1, borderTopColor: '#eee', backgroundColor: '#fff' },
    saveButton: { backgroundColor: THEME.colors.primary, padding: 15, borderRadius: 10, alignItems: 'center' },
    saveButtonText: { color: '#fff', fontSize: 16, fontWeight: '600' },
    
    emptyContainer: { alignItems: 'center', marginTop: 80 },
    emptyText: { fontSize: 16, color: '#888' }
});

export default PETicketList;