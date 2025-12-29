// import React, { useState, useEffect, useCallback } from 'react';
// import {
//     View,
//     Text,
//     StyleSheet,
//     TouchableOpacity,
//     Image,
//     Alert,
//     FlatList,
//     ActivityIndicator,
//     Modal,
//     Dimensions,
//     TextInput,
//     ScrollView,
//     KeyboardAvoidingView,
//     Platform
// } from 'react-native';
// import RNPickerSelect from 'react-native-picker-select';
// import Ionicons from 'react-native-vector-icons/Ionicons';
// import { useNavigation } from '@react-navigation/native';
// import apiClient from '../../api/apiClient';
// import { THEME } from '../../constants/theme';
// import Pdf from 'react-native-pdf';

// const { width } = Dimensions.get('window');

// // --- Types ---
// interface Ticket {
//     id: number;
//     image_path: string;
//     phase_code_id?: number | null;
    
//     ticket_number?: string;
//     ticket_date?: string;
//     haul_vendor?: string;
//     truck_number?: string;
//     material?: string;
//     job_number?: string; 
//     zone?: string;
//     hours?: number;
//     job_phase_id?: number;   // ✅ ADD THIS

//     table_data?: any[] | null; 
// }

// interface PhaseOption {
//     label: string;
//     value: number;
// }

// export default function SupervisorTicketsScreen({ route }: any) {
//     const navigation = useNavigation();
//     const { foremanId, foremanName, date: routeDate } = route.params;

//     const [tickets, setTickets] = useState<Ticket[]>([]);
//     const [availablePhases, setAvailablePhases] = useState<PhaseOption[]>([]);
//     const [loading, setLoading] = useState(true);
//     const [refreshing, setRefreshing] = useState(false);

//     // --- Modal State ---
//     const [selectedTicket, setSelectedTicket] = useState<Ticket | null>(null);
//     const [isModalVisible, setModalVisible] = useState(false);
//     const [isSaving, setIsSaving] = useState(false);
//     const [viewMode, setViewMode] = useState<'form' | 'file'>('form'); 
//     const [formData, setFormData] = useState<Partial<Ticket>>({});
// const [phaseOptionsByTicket, setPhaseOptionsByTicket] =
//   useState<Record<number, PhaseOption[]>>({});

//     useEffect(() => {
//         navigation.setOptions({
//             title: `${foremanName} (${new Date(routeDate).toLocaleDateString()})`,
//         });
//     }, [foremanName, routeDate, navigation]);
 
// const loadData = useCallback(async () => {
//   const fetchStateSetter = refreshing ? setRefreshing : setLoading;
//   fetchStateSetter(true);

//   try {
//     const ticketRes = await apiClient.get('/api/tickets/for-supervisor', {
//       params: { foreman_id: foremanId, date: routeDate },
//     });

//     setTickets(ticketRes.data || []);
//   } catch (err) {
//     Alert.alert('Error', 'Failed to load tickets.');
//   } finally {
//     setLoading(false);
//     setRefreshing(false);
//   }
// }, [foremanId, routeDate, refreshing]);

// const loadPhaseCodesForTicket = async (ticket: Ticket) => {
//   console.log('Ticket ID:', ticket.id, 'job_phase_id:', ticket.job_phase_id);

//   if (!ticket.job_phase_id) return;

//   try {
// const res = await apiClient.get('/api/job-phases/phase-codes', {
//   params: { job_phase_id: ticket.job_phase_id },
// });


//     const phases = res.data.map((p: any) => ({
//       label: `${p.code} - ${p.description || ''}`,
//       value: p.id,
//     }));

//     setPhaseOptionsByTicket(prev => ({
//       ...prev,
//       [ticket.id]: phases,
//     }));
//   } catch (err) {
//     console.error('Failed to load phase codes', err);
//   }
// };

//     useEffect(() => {
//         loadData();
//     }, [loadData]);
// useEffect(() => {
//   tickets.forEach(ticket => {
//     loadPhaseCodesForTicket(ticket);
//   });
// }, [tickets]);

//     const handleRefresh = () => {
//         setRefreshing(true);
//         loadData();
//     };
// const handleQuickPhaseUpdate = async (
//   ticketId: number,
//   newPhaseId: number | string
// ) => {
//   const phaseId = Number(newPhaseId); // ensure numeric

//   // Optimistic UI update
//   setTickets(prev =>
//     prev.map(t => (t.id === ticketId ? { ...t, phase_code_id: phaseId } : t))
//   );

//   try {
//     await apiClient.patch(`/api/tickets/${ticketId}`, { phase_code_id: phaseId });
//   } catch (error) {
//     Alert.alert("Error", "Failed to save phase selection.");
//     loadData(); // revert UI if PATCH fails
//   }
// };




//     const openTicketModal = (ticket: Ticket, initialViewMode: 'form' | 'file') => {
//         setSelectedTicket(ticket);
        
//         let safeTableData: any[] = [];
//         if (Array.isArray(ticket.table_data)) {
//             safeTableData = ticket.table_data;
//         }

//         setFormData({
//             ticket_number: ticket.ticket_number,
//             ticket_date: ticket.ticket_date,
//             haul_vendor: ticket.haul_vendor,
//             truck_number: ticket.truck_number,
//             material: ticket.material,
//             job_number: ticket.job_number,
//             zone: ticket.zone,
//             hours: ticket.hours,
//             table_data: safeTableData 
//         });

//         setViewMode(initialViewMode);
//         setModalVisible(true);
//     };

//     const handleFormChange = (key: keyof Ticket, value: any) => {
//         setFormData(prev => ({ ...prev, [key]: value }));
//     };

//     // ⭐ UPDATED: Handle Editing with Header Row Offset
//     const handleTableCellChange = (visualRowIndex: number, colIndex: string, value: string) => {
//         if (!formData.table_data) return;

//         // Visual Row 0 is actually Data Row 1 (because Data Row 0 is the header)
//         const actualRowIndex = visualRowIndex + 1;

//         const updatedTable = [...formData.table_data];
        
//         // Handle array of arrays (standard grid) or array of objects
//         if (Array.isArray(updatedTable[actualRowIndex])) {
//             updatedTable[actualRowIndex] = [...updatedTable[actualRowIndex]]; // Copy row
//             updatedTable[actualRowIndex][Number(colIndex)] = value; // Update cell
//         } else {
//             updatedTable[actualRowIndex] = { ...updatedTable[actualRowIndex], [colIndex]: value };
//         }

//         setFormData(prev => ({ ...prev, table_data: updatedTable }));
//     };

//     // ⭐ UPDATED: Render Table Logic
//     const renderTable = () => {
//         const data = formData.table_data;
//         if (!data || !Array.isArray(data) || data.length < 2) { 
//             // Need at least 2 rows (1 header + 1 data) to show a meaningful table
//             return <Text style={styles.noDataText}>No valid table data found.</Text>;
//         }

//         // 1. Extract Headers from the FIRST row of data
//         // If data is [["Item", "Cost"], ["Apple", "5"]], headers = ["Item", "Cost"]
//         const headerRow = Object.values(data[0]); 
        
//         // 2. Extract Data Rows (skip the first row)
//         const bodyRows = data.slice(1);

//         return (
//             <View style={styles.tableBorder}>
//                 <ScrollView horizontal showsHorizontalScrollIndicator={true}>
//                     <View>
//                         {/* Header Row (Static, Grey) */}
//                         <View style={styles.tableHeaderRow}>
//                             {headerRow.map((headerText, index) => (
//                                 <View key={index} style={styles.headerCell}>
//                                     <Text style={styles.headerText}>{String(headerText)}</Text>
//                                 </View>
//                             ))}
//                         </View>

//                         {/* Data Rows (Editable, White/Grey) */}
//                         {bodyRows.map((row, rowIndex) => {
//                             // Normalize row to array values to map easily
//                             const rowValues = Object.values(row);
//                             const rowKeys = Object.keys(row); // needed for updates

//                             return (
//                                 <View key={rowIndex} style={[styles.tableRow, rowIndex % 2 === 0 ? styles.evenRow : styles.oddRow]}>
//                                     {rowValues.map((cellValue, colIndex) => (
//                                         <View key={colIndex} style={styles.cell}>
//                                             <TextInput
//                                                 style={styles.cellInput}
//                                                 value={String(cellValue || '')}
//                                                 onChangeText={(text) => 
//                                                     handleTableCellChange(rowIndex, rowKeys[colIndex], text)
//                                                 }
//                                                 multiline={true} 
//                                             />
//                                         </View>
//                                     ))}
//                                 </View>
//                             );
//                         })}
//                     </View>
//                 </ScrollView>
//             </View>
//         );
//     };

//     const saveTicketChanges = async () => {
//         if (!selectedTicket) return;
//         setIsSaving(true);
//         try {
//             const payload = {
//                 ...formData,
//                 hours: formData.hours ? Number(formData.hours) : null
//             };
//             const res = await apiClient.patch(`/api/tickets/${selectedTicket.id}`, payload);

//             setTickets(prev => prev.map(t => 
//                 t.id === selectedTicket.id ? { ...t, ...res.data } : t
//             )); 

//             Alert.alert("Success", "Ticket details updated.");
//             setModalVisible(false);
//         } catch (error: any) {
//             Alert.alert("Error", "Failed to save changes.");
//         } finally {
//             setIsSaving(false);
//         }
//     };

//     const renderInput = (label: string, field: keyof Ticket, placeholder: string, keyboardType: 'default' | 'numeric' = 'default') => (
//         <View style={styles.inputGroup}>
//             <Text style={styles.inputLabel}>{label}</Text>
//             <TextInput
//                 style={styles.textInput}
//                 value={formData[field] ? String(formData[field]) : ''}
//                 onChangeText={(text) => handleFormChange(field, text)}
//                 placeholder={placeholder}
//                 placeholderTextColor="#ccc"
//                 keyboardType={keyboardType}
//             />
//         </View>
//     );

//     const renderTicketItem = ({ item }: { item: Ticket }) => {
//         const isPdf = item.image_path.toLowerCase().endsWith('.pdf');
//         const fileUri = `${apiClient.defaults.baseURL}${item.image_path}`;

//         return (
//             <View style={styles.card}>
//                 <View style={styles.previewColumn}>
//                     <TouchableOpacity onPress={() => openTicketModal(item, 'file')} style={styles.previewContainer}>
//                         {isPdf ? (
//                             <Pdf
//                                 source={{ uri: fileUri, cache: true }}
//                                 style={styles.pdfPreview}
//                                 singlePage={true} 
//                                 trustAllCerts={false}
//                             />
//                         ) : (
//                             <Image
//                                 source={{ uri: fileUri }}
//                                 style={styles.imagePreview}
//                                 resizeMode="cover"
//                             />
//                         )}
//                         <View style={styles.previewOverlay}>
//                             <Ionicons name="expand-outline" size={20} color="#fff" />
//                         </View>
//                     </TouchableOpacity>
//                 </View>

//                 <View style={styles.actionsColumn}>
//                     <View style={styles.cardHeader}>
//                         <Text style={styles.cardTitle}>Ticket #{item.ticket_number || item.id}</Text>
//                     </View>

//                     <Text style={styles.labelSmall}>Phase Code</Text>
//                     <View style={styles.pickerContainer}>
// <RNPickerSelect
//   items={phaseOptionsByTicket[item.id] || []}
//   value={item.phase_code_id}
//   onValueChange={(value) =>
//     handleQuickPhaseUpdate(item.id, value)
//   }
//   placeholder={{ label: 'Select Phase...', value: undefined }}
//   useNativeAndroidPickerStyle={false}
// />



//                     </View>

//                     <TouchableOpacity 
//                         style={styles.editButton} 
//                         onPress={() => openTicketModal(item, 'form')}
//                     >
//                         <Ionicons name="create-outline" size={18} color="#fff" />
//                         <Text style={styles.editButtonText}>View & Edit Data</Text>
//                     </TouchableOpacity>
//                 </View>
//             </View>
//         );
//     };

//     return (
//         <View style={styles.container}>
//             {loading && !refreshing ? (
//                 <ActivityIndicator size="large" color={THEME.colors.brandStone} style={{ marginTop: 20 }} />
//             ) : (
//                 <FlatList
//                     data={tickets}
//                     keyExtractor={item => item.id.toString()}
//                     renderItem={renderTicketItem}
//                     onRefresh={handleRefresh}
//                     refreshing={refreshing}
//                     contentContainerStyle={styles.listContent}
//                     ListEmptyComponent={
//                         <View style={styles.emptyContainer}>
//                             <Text style={styles.emptyText}>No submitted tickets found.</Text>
//                         </View>
//                     }
//                 />
//             )}

//             <Modal
//                 visible={isModalVisible}
//                 animationType="slide"
//                 presentationStyle="pageSheet"
//                 onRequestClose={() => setModalVisible(false)}
//             >
//                 <View style={styles.modalContainer}>
//                     <View style={styles.modalHeader}>
//                         <TouchableOpacity onPress={() => setModalVisible(false)}>
//                             <Text style={styles.cancelText}>Cancel</Text>
//                         </TouchableOpacity>
//                         <Text style={styles.modalTitle}>Ticket Details</Text>
//                         <TouchableOpacity onPress={saveTicketChanges} disabled={isSaving}>
//                             {isSaving ? <ActivityIndicator size="small" color={THEME.colors.primary} /> : <Text style={styles.saveText}>Save</Text>}
//                         </TouchableOpacity>
//                     </View>

//                     <View style={styles.tabContainer}>
//                         <TouchableOpacity style={[styles.tab, viewMode === 'form' && styles.activeTab]} onPress={() => setViewMode('form')}>
//                             <Text style={[styles.tabText, viewMode === 'form' && styles.activeTabText]}>Data</Text>
//                         </TouchableOpacity>
//                         <TouchableOpacity style={[styles.tab, viewMode === 'file' && styles.activeTab]} onPress={() => setViewMode('file')}>
//                             <Text style={[styles.tabText, viewMode === 'file' && styles.activeTabText]}>File</Text>
//                         </TouchableOpacity>
//                     </View>

//                     <View style={styles.modalContent}>
//                         {viewMode === 'file' && selectedTicket && (
//                             <View style={styles.fileViewerContainer}>
//                                 {selectedTicket.image_path.toLowerCase().endsWith('.pdf') ? (
//                                     <Pdf
//                                         source={{ uri: `${apiClient.defaults.baseURL}${selectedTicket.image_path}`, cache: true }}
//                                         style={styles.fullPdf}
//                                         trustAllCerts={false}
//                                     />
//                                 ) : (
//                                     <Image
//                                         source={{ uri: `${apiClient.defaults.baseURL}${selectedTicket.image_path}` }}
//                                         style={styles.fullImage}
//                                         resizeMode="contain"
//                                     />
//                                 )}
//                             </View>
//                         )}

//                         {viewMode === 'form' && (
//                             <KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : "height"} style={{ flex: 1 }}>
//                                 <ScrollView contentContainerStyle={styles.formContainer}>
//                                     <Text style={styles.sectionHeader}>Extracted Data</Text>
//                                     <View style={styles.row}>
//                                         <View style={styles.halfInput}>{renderInput('Ticket #', 'ticket_number', '1001')}</View>
//                                         <View style={styles.halfInput}>{renderInput('Date', 'ticket_date', 'YYYY-MM-DD')}</View>
//                                     </View>
//                                     {renderInput('Vendor', 'haul_vendor', 'Vendor Name')}
//                                     <View style={styles.row}>
//                                         <View style={styles.halfInput}>{renderInput('Truck #', 'truck_number', 'T-101')}</View>
//                                         <View style={styles.halfInput}>{renderInput('Job #', 'job_number', 'Job Code')}</View>
//                                     </View>
//                                     {renderInput('Material', 'material', 'Material Name')}
//                                     <View style={styles.row}>
//                                         <View style={styles.halfInput}>{renderInput('Zone', 'zone', 'Zone')}</View>
//                                         <View style={styles.halfInput}>{renderInput('Hours', 'hours', '0.0', 'numeric')}</View>
//                                     </View>

//                                     {/* Table Data */}
//                                     <Text style={styles.sectionHeader}>Table Data</Text>
//                                     {renderTable()}

//                                     <View style={{ height: 40 }} />
//                                 </ScrollView>
//                             </KeyboardAvoidingView>
//                         )}
//                     </View>
//                 </View>
//             </Modal>
//         </View>
//     );
// }

// const styles = StyleSheet.create({
//     container: { flex: 1, backgroundColor: '#f5f5f5' },
//     listContent: { padding: 12 },
//     emptyContainer: { flex: 1, alignItems: 'center', justifyContent: 'center', marginTop: 50 },
//     emptyText: { color: '#888', fontSize: 16 },

//     card: {
//         flexDirection: 'row', 
//         backgroundColor: 'white',
//         borderRadius: 12,
//         marginBottom: 16,
//         overflow: 'hidden',
//         height: 160, 
//         shadowColor: '#000',
//         shadowOpacity: 0.1,
//         shadowRadius: 4,
//         elevation: 3,
//     },
//     previewColumn: {
//         width: 110,
//         backgroundColor: '#eee',
//     },
//     previewContainer: {
//         flex: 1,
//         width: '100%',
//         height: '100%',
//         position: 'relative',
//     },
//     pdfPreview: {
//         flex: 1,
//         width: 110,
//         height: 160,
//         backgroundColor: '#f0f0f0',
//     },
//     imagePreview: {
//         width: '100%',
//         height: '100%',
//     },
//     previewOverlay: {
//         position: 'absolute',
//         bottom: 5,
//         right: 5,
//         backgroundColor: 'rgba(0,0,0,0.6)',
//         borderRadius: 15,
//         padding: 4,
//     },
//     actionsColumn: {
//         flex: 1,
//         padding: 12,
//         justifyContent: 'space-between',
//         backgroundColor: '#c2c2c2ff', 
//     },
//     cardHeader: {
//         flexDirection: 'row',
//         justifyContent: 'space-between',
//         alignItems: 'center',
//     },
//     cardTitle: {
//         fontSize: 16,
//         fontWeight: '700',
//         color: '#333',
//     },
    
//     labelSmall: {
//         fontSize: 11,
//         color: '#181717ff', 
//         marginBottom: 4,
//         textTransform: 'uppercase',
//         fontWeight: '700',
//     },
//     pickerContainer: {
//         borderWidth: 1,
//         borderColor: '#e0e0e0',
//         borderRadius: 8,
//         backgroundColor: '#fff', 
//         paddingHorizontal: 8,
//         height: 40,
//         justifyContent: 'center',
//         marginBottom: 8,
//     },
//     pickerText: {
//         fontSize: 14,
//         color: '#333',
//         paddingRight: 20, 
//     },
//     pickerPlaceholder: {
//         color: '#999',
//         fontSize: 14,
//     },
//     editButton: {
//         backgroundColor: THEME.colors.primary,
//         flexDirection: 'row',
//         alignItems: 'center',
//         justifyContent: 'center',
//         paddingVertical: 8,
//         borderRadius: 8,
//     },
//     editButtonText: {
//         color: '#fff',
//         fontSize: 13,
//         fontWeight: '600',
//         marginLeft: 6,
//     },

//     modalContainer: { flex: 1, backgroundColor: '#fff' },
//     modalHeader: {
//         flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
//         padding: 16, borderBottomWidth: 1, borderBottomColor: '#eee', backgroundColor: '#fff',
//     },
//     modalTitle: { fontSize: 17, fontWeight: 'bold' },
//     cancelText: { fontSize: 16, color: '#666' },
//     saveText: { fontSize: 16, color: THEME.colors.primary, fontWeight: 'bold' },
//     tabContainer: { flexDirection: 'row', borderBottomWidth: 1, borderBottomColor: '#eee' },
//     tab: { flex: 1, paddingVertical: 12, alignItems: 'center' },
//     activeTab: { borderBottomWidth: 2, borderBottomColor: THEME.colors.primary },
//     tabText: { fontSize: 15, color: '#666' },
//     activeTabText: { color: THEME.colors.primary, fontWeight: 'bold' },
//     modalContent: { flex: 1, backgroundColor: '#f8f9fa' },
//     fileViewerContainer: { flex: 1, backgroundColor: '#222' },
//     fullPdf: { flex: 1, width: width },
//     fullImage: { width: '100%', height: '100%' },
//     formContainer: { padding: 20 },
//     sectionHeader: { fontSize: 13, fontWeight: '700', color: '#888', marginBottom: 12, marginTop: 15 },
//     row: { flexDirection: 'row', justifyContent: 'space-between' },
//     halfInput: { width: '48%' },
//     inputGroup: { marginBottom: 16 },
//     inputLabel: { fontSize: 14, color: '#444', marginBottom: 6, fontWeight: '600' },
//     textInput: {
//         backgroundColor: 'white', borderWidth: 1, borderColor: '#e0e0e0', borderRadius: 8,
//         padding: 12, fontSize: 16, color: '#333',
//     },
//     noDataText: { fontStyle: 'italic', color: '#999', textAlign: 'center' },

//     // ⭐ TABLE GRID STYLES ⭐
//     tableBorder: {
//         borderWidth: 1,
//         borderColor: '#ddd',
//         borderRadius: 6,
//         overflow: 'hidden',
//         marginTop: 10,
//         backgroundColor: '#fff',
//     },
//     tableHeaderRow: {
//         flexDirection: 'row',
//         backgroundColor: '#e0e0e0',
//         borderBottomWidth: 1,
//         borderBottomColor: '#999',
//     },
//     headerCell: {
//         width: 120, 
//         padding: 10,
//         borderRightWidth: 1,
//         borderRightColor: '#ccc',
//         backgroundColor: '#d6d6d6',
//         justifyContent: 'center',
//     },
//     headerText: {
//         fontWeight: 'bold',
//         fontSize: 13,
//         color: '#333',
//         textAlign: 'center',
//     },
//     tableRow: {
//         flexDirection: 'row',
//         borderBottomWidth: 1,
//         borderBottomColor: '#eee',
//     },
//     evenRow: { backgroundColor: '#fff' },
//     oddRow: { backgroundColor: '#f9f9f9' },
//     cell: {
//         width: 120, // Match header width
//         borderRightWidth: 1,
//         borderRightColor: '#eee',
//         padding: 4,
//         justifyContent: 'center',
//     },
//     cellInput: {
//         fontSize: 14,
//         color: '#000',
//         paddingHorizontal: 6,
//         paddingVertical: 8,
//         textAlign: 'center',
//     },
// });
// import React, { useState, useEffect, useCallback, useMemo } from 'react';
// import {
//     View, Text, StyleSheet, TouchableOpacity, Image, Alert, SectionList,
//     ActivityIndicator, Modal, Dimensions, TextInput, ScrollView,
//     KeyboardAvoidingView, Platform, SafeAreaView, StatusBar
// } from 'react-native';
// import RNPickerSelect from 'react-native-picker-select';
// import Ionicons from 'react-native-vector-icons/Ionicons';
// import { useNavigation } from '@react-navigation/native';
// import apiClient from '../../api/apiClient';
// import { THEME } from '../../constants/theme';
// import Pdf from 'react-native-pdf';

// const { width } = Dimensions.get('window');

// // --- Types ---
// interface Ticket {
//     id: number;
//     image_path: string;
//     phase_code_id?: number | null;
//     ticket_number?: string;
//     ticket_date?: string;
//     haul_vendor?: string;
//     truck_number?: string;
//     material?: string;
//     job_number?: string; 
//     zone?: string;
//     hours?: number;
//     job_phase_id?: number;
//     category?: string | null;
//     table_data?: any[] | null; 
// }

// export default function SupervisorTicketsScreen({ route }: any) {
//     const navigation = useNavigation();
//     const { foremanId, foremanName, date: routeDate } = route.params;

//     const [tickets, setTickets] = useState<Ticket[]>([]);
//     const [loading, setLoading] = useState(true);
//     const [refreshing, setRefreshing] = useState(false);
//     const [phaseOptionsByTicket, setPhaseOptionsByTicket] = useState<Record<number, any[]>>({});

//     // --- Modal State ---
//     const [selectedTicket, setSelectedTicket] = useState<Ticket | null>(null);
//     const [isModalVisible, setModalVisible] = useState(false);
//     const [isSaving, setIsSaving] = useState(false);
//     const [viewMode, setViewMode] = useState<'form' | 'file'>('form'); 
//     const [formData, setFormData] = useState<Partial<Ticket>>({});

//     useEffect(() => {
//         navigation.setOptions({
//             title: `${foremanName} • ${new Date(routeDate).toLocaleDateString()}`,
//         });
//     }, [foremanName, routeDate, navigation]);

//     // --- Data Loading ---
//     const loadData = useCallback(async () => {
//         const fetchStateSetter = refreshing ? setRefreshing : setLoading;
//         fetchStateSetter(true);
//         try {
//             const res = await apiClient.get('/api/tickets/for-supervisor', {
//                 params: { foreman_id: foremanId, date: routeDate },
//             });
//             setTickets(res.data || []);
//         } catch (err) {
//             Alert.alert('Connection Error', 'Failed to retrieve tickets.');
//         } finally {
//             setLoading(false);
//             setRefreshing(false);
//         }
//     }, [foremanId, routeDate, refreshing]);

//     const loadPhaseCodesForTicket = async (ticket: Ticket) => {
//         if (!ticket.job_phase_id) return;
//         try {
//             const res = await apiClient.get('/api/job-phases/phase-codes', {
//                 params: { job_phase_id: ticket.job_phase_id },
//             });
//             const phases = res.data.map((p: any) => ({
//                 label: `${p.code} - ${p.description || ''}`,
//                 value: p.id,
//             }));
//             setPhaseOptionsByTicket(prev => ({ ...prev, [ticket.id]: phases }));
//         } catch (err) {
//             console.error('Phase code fetch error', err);
//         }
//     };

//     useEffect(() => { loadData(); }, [loadData]);
//     useEffect(() => { tickets.forEach(t => loadPhaseCodesForTicket(t)); }, [tickets]);

//     // --- Categorization Logic ---
//     const sections = useMemo(() => {
//         const grouped: Record<string, Ticket[]> = {};
//         tickets.forEach((t) => {
//             let cat = t.category?.trim() || "Unspecified";
//             if (cat.toLowerCase() === "trucking") cat = "Trucking";
//             if (cat.toLowerCase() === "materials") cat = "Materials";
//             if (!grouped[cat]) grouped[cat] = [];
//             grouped[cat].push(t);
//         });
//         return Object.keys(grouped).sort((a,b) => a === 'Materials' ? -1 : 1).map(category => ({
//             title: category,
//             data: grouped[category]
//         }));
//     }, [tickets]);

//     // --- Editing & Table Functionality ---
//     const openTicketModal = (ticket: Ticket, initialViewMode: 'form' | 'file') => {
//         setSelectedTicket(ticket);
//         setFormData({ ...ticket, table_data: Array.isArray(ticket.table_data) ? ticket.table_data : [] });
//         setViewMode(initialViewMode);
//         setModalVisible(true);
//     };

//     const handleFormChange = (key: keyof Ticket, value: any) => {
//         setFormData(prev => ({ ...prev, [key]: value }));
//     };

//     const handleTableCellChange = (visualRowIndex: number, colIndex: string, value: string) => {
//         if (!formData.table_data) return;
//         const actualRowIndex = visualRowIndex + 1; // Visual row 0 is index 1 (Data Row)
//         const updatedTable = [...formData.table_data];
        
//         if (Array.isArray(updatedTable[actualRowIndex])) {
//             updatedTable[actualRowIndex] = [...updatedTable[actualRowIndex]];
//             updatedTable[actualRowIndex][Number(colIndex)] = value;
//         } else {
//             updatedTable[actualRowIndex] = { ...updatedTable[actualRowIndex], [colIndex]: value };
//         }
//         setFormData(prev => ({ ...prev, table_data: updatedTable }));
//     };

//     const saveTicketChanges = async () => {
//         if (!selectedTicket) return;
//         setIsSaving(true);
//         try {
//             const payload = {
//                 ...formData,
//                 hours: formData.hours ? Number(formData.hours) : null
//             };
//             const res = await apiClient.patch(`/api/tickets/${selectedTicket.id}`, payload);
//             setTickets(prev => prev.map(t => t.id === selectedTicket.id ? { ...t, ...res.data } : t));
//             Alert.alert("Success", "Record updated successfully.");
//             setModalVisible(false);
//         } catch (error) {
//             Alert.alert("Error", "Failed to save changes.");
//         } finally {
//             setIsSaving(false);
//         }
//     };

//     // --- Render Components ---
//     const renderTableGrid = () => {
//         const data = formData.table_data;
//         if (!data || !Array.isArray(data) || data.length < 2) return null;
        
//         const headerRow = Object.values(data[0]);
//         const bodyRows = data.slice(1);

//         return (
//             <View style={styles.tableContainer}>
//                 <ScrollView horizontal showsHorizontalScrollIndicator={true}>
//                     <View>
//                         <View style={styles.tableHeaderRow}>
//                             {headerRow.map((headerText, index) => (
//                                 <View key={index} style={styles.headerCell}>
//                                     <Text style={styles.headerText}>{String(headerText)}</Text>
//                                 </View>
//                             ))}
//                         </View>
//                         {bodyRows.map((row, rowIndex) => {
//                             const rowValues = Object.values(row);
//                             const rowKeys = Object.keys(row);
//                             return (
//                                 <View key={rowIndex} style={[styles.tableRow, rowIndex % 2 === 0 ? styles.evenRow : styles.oddRow]}>
//                                     {rowValues.map((cellValue, colIndex) => (
//                                         <View key={colIndex} style={styles.cell}>
//                                             <TextInput
//                                                 style={styles.cellInput}
//                                                 value={String(cellValue || '')}
//                                                 onChangeText={(text) => handleTableCellChange(rowIndex, rowKeys[colIndex], text)}
//                                                 multiline
//                                             />
//                                         </View>
//                                     ))}
//                                 </View>
//                             );
//                         })}
//                     </View>
//                 </ScrollView>
//             </View>
//         );
//     };

//     const renderTicketItem = ({ item }: { item: Ticket }) => {
//         const fileUri = `${apiClient.defaults.baseURL}${item.image_path}`;
//         return (
//             <View style={styles.card}>
//                 <TouchableOpacity onPress={() => openTicketModal(item, 'file')} style={styles.cardPreview}>
//                     {item.image_path.toLowerCase().endsWith('.pdf') ? (
//                         <Pdf source={{ uri: fileUri, cache: true }} style={styles.pdfPreview} singlePage trustAllCerts={false} />
//                     ) : (
//                         <Image source={{ uri: fileUri }} style={styles.imagePreview} />
//                     )}
//                     <View style={styles.zoomIcon}><Ionicons name="expand" size={16} color="#FFF" /></View>
//                 </TouchableOpacity>

//                 <View style={styles.cardContent}>
//                     <View style={styles.cardHeader}>
//                         <Text style={styles.ticketNumText}>Ticket #{item.ticket_number || item.id}</Text>
//                         <View style={styles.statusBadge}>
//                            <Text style={styles.statusText}>SUBMITTED</Text>
//                         </View>
//                     </View>

//                     <View style={styles.inputWrapper}>
//                         <Text style={styles.microLabel}>PHASE ASSIGNMENT</Text>
//                         <View style={styles.pickerField}>
//                             <RNPickerSelect
//                                 items={phaseOptionsByTicket[item.id] || []}
//                                 value={item.phase_code_id}
//                                 onValueChange={(val) => {
//                                     apiClient.patch(`/api/tickets/${item.id}`, { phase_code_id: Number(val) });
//                                 }}
//                                 placeholder={{ label: 'Assign Phase...', value: null }}
//                                 useNativeAndroidPickerStyle={false}
//                                 style={pickerSelectStyles}
//                             />
//                         </View>
//                     </View>

//                     <TouchableOpacity style={styles.primaryActionBtn} onPress={() => openTicketModal(item, 'form')}>
//                         <Ionicons name="create-outline" size={16} color="#FFF" style={{marginRight: 6}} />
//                         <Text style={styles.btnText}>Review Data</Text>
//                     </TouchableOpacity>
//                 </View>
//             </View>
//         );
//     };

//     return (
//         <SafeAreaView style={styles.container}>
//             <StatusBar barStyle="dark-content" />
//             <SectionList
//                 sections={sections}
//                 keyExtractor={item => item.id.toString()}
//                 renderItem={renderTicketItem}
//                 renderSectionHeader={({ section: { title } }) => (
//                     <View style={styles.sectionHeader}>
//                         <View style={styles.sectionIcon}>
//                             <Ionicons name={title === 'Materials' ? 'cube' : 'bus'} size={14} color="#FFF" />
//                         </View>
//                         <Text style={styles.sectionHeaderText}>{title.toUpperCase()}</Text>
//                     </View>
//                 )}
//                 onRefresh={() => { setRefreshing(true); loadData(); }}
//                 refreshing={refreshing}
//                 contentContainerStyle={styles.listPadding}
//                 stickySectionHeadersEnabled={false}
//             />

//             <Modal visible={isModalVisible} animationType="slide">
//                 <SafeAreaView style={styles.modalBg}>
//                     <View style={styles.modalHeader}>
//                         <TouchableOpacity onPress={() => setModalVisible(false)} style={styles.headerIconBtn}>
//                             <Ionicons name="close" size={24} color="#333" />
//                         </TouchableOpacity>
//                         <Text style={styles.headerTitle}>Record Details</Text>
//                         <TouchableOpacity onPress={saveTicketChanges} disabled={isSaving}>
//                             {isSaving ? <ActivityIndicator size="small" color={THEME.colors.primary} /> : <Text style={styles.saveBtnText}>Save</Text>}
//                         </TouchableOpacity>
//                     </View>

//                     <View style={styles.tabBar}>
//                         <TouchableOpacity 
//                             style={[styles.tabItem, viewMode === 'form' && styles.activeTab]} 
//                             onPress={() => setViewMode('form')}
//                         >
//                             <Text style={[styles.tabLabel, viewMode === 'form' && styles.activeTabLabel]}>Data Entry</Text>
//                         </TouchableOpacity>
//                         <TouchableOpacity 
//                             style={[styles.tabItem, viewMode === 'file' && styles.activeTab]} 
//                             onPress={() => setViewMode('file')}
//                         >
//                             <Text style={[styles.tabLabel, viewMode === 'file' && styles.activeTabLabel]}>Attachment</Text>
//                         </TouchableOpacity>
//                     </View>

//                     <View style={{flex: 1}}>
//                         {viewMode === 'file' && selectedTicket ? (
//                             <View style={styles.fileViewer}>
//                                 {selectedTicket.image_path.toLowerCase().endsWith('.pdf') ? (
//                                     <Pdf source={{ uri: `${apiClient.defaults.baseURL}${selectedTicket.image_path}` }} style={{flex:1}} />
//                                 ) : (
//                                     <Image source={{ uri: `${apiClient.defaults.baseURL}${selectedTicket.image_path}` }} style={{width:'100%', height:'100%'}} resizeMode="contain" />
//                                 )}
//                             </View>
//                         ) : (
//                             <KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : "height"} style={{ flex: 1 }}>
//                                 <ScrollView contentContainerStyle={styles.formContent}>
//                                     <Text style={styles.formSectionTitle}>Extracted Information</Text>
//                                     <View style={styles.inputRow}>
//                                         <View style={{flex:1, marginRight: 10}}>
//                                             <Text style={styles.inputLabel}>Ticket Number</Text>
//                                             <TextInput style={styles.modernInput} value={formData.ticket_number} onChangeText={(v) => handleFormChange('ticket_number', v)} />
//                                         </View>
//                                         <View style={{flex:1}}>
//                                             <Text style={styles.inputLabel}>Date</Text>
//                                             <TextInput style={styles.modernInput} value={formData.ticket_date} onChangeText={(v) => handleFormChange('ticket_date', v)} />
//                                         </View>
//                                     </View>
                                    
//                                     <Text style={styles.inputLabel}>Vendor / Hauler</Text>
//                                     <TextInput style={styles.modernInput} value={formData.haul_vendor} onChangeText={(v) => handleFormChange('haul_vendor', v)} />

//                                     <View style={styles.inputRow}>
//                                         <View style={{flex:1, marginRight: 10}}>
//                                             <Text style={styles.inputLabel}>Truck #</Text>
//                                             <TextInput style={styles.modernInput} value={formData.truck_number} onChangeText={(v) => handleFormChange('truck_number', v)} />
//                                         </View>
//                                         <View style={{flex:1}}>
//                                             <Text style={styles.inputLabel}>Hours</Text>
//                                             <TextInput style={styles.modernInput} value={formData.hours ? String(formData.hours) : ''} keyboardType="numeric" onChangeText={(v) => handleFormChange('hours', v)} />
//                                         </View>
//                                     </View>

//                                     <Text style={styles.formSectionTitle}>Table Breakdown</Text>
//                                     {renderTableGrid()}
                                    
//                                     <View style={{ height: 100 }} />
//                                 </ScrollView>
//                             </KeyboardAvoidingView>
//                         )}
//                     </View>
//                 </SafeAreaView>
//             </Modal>
//         </SafeAreaView>
//     );
// }

// const styles = StyleSheet.create({
//     container: { flex: 1, backgroundColor: '#F8F9FB' },
//     listPadding: { paddingHorizontal: 16, paddingBottom: 30 },
//     sectionHeader: { flexDirection: 'row', alignItems: 'center', marginTop: 24, marginBottom: 12, backgroundColor: '#F8F9FB' },
//     sectionIcon: { backgroundColor: THEME.colors.primary, padding: 6, borderRadius: 6, marginRight: 10 },
//     sectionHeaderText: { fontSize: 12, fontWeight: '800', color: '#64748B', letterSpacing: 1.2 },
    
//     card: { flexDirection: 'row', backgroundColor: '#FFF', borderRadius: 16, marginBottom: 16, height: 155, elevation: 4 },
//     cardPreview: { width: 105, backgroundColor: '#F1F5F9', borderTopLeftRadius: 16, borderBottomLeftRadius: 16, justifyContent: 'center', alignItems: 'center' },
//     imagePreview: { width: '100%', height: '100%', borderTopLeftRadius: 16, borderBottomLeftRadius: 16 },
//     pdfPreview: { width: 105, height: 155, borderTopLeftRadius: 16, borderBottomLeftRadius: 16 },
//     zoomIcon: { position: 'absolute', bottom: 8, right: 8, backgroundColor: 'rgba(0,0,0,0.4)', borderRadius: 20, padding: 4 },
//     cardContent: { flex: 1, padding: 14, justifyContent: 'space-between' },
//     cardHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' },
//     ticketNumText: { fontSize: 16, fontWeight: '700', color: '#1E293B' },
//     statusBadge: { backgroundColor: '#F0FDF4', paddingHorizontal: 8, paddingVertical: 2, borderRadius: 4 },
//     statusText: { fontSize: 9, fontWeight: '700', color: '#16A34A' },
//     microLabel: { fontSize: 10, fontWeight: '700', color: '#94A3B8', marginBottom: 6 },
//     inputWrapper: { marginBottom: 8 },
//     pickerField: { backgroundColor: '#F8F9FB', borderWidth: 1, borderColor: '#E2E8F0', borderRadius: 8, height: 38, justifyContent: 'center' },
//     primaryActionBtn: { backgroundColor: THEME.colors.primary, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', height: 38, borderRadius: 8 },
//     btnText: { color: '#FFF', fontSize: 13, fontWeight: '600' },

//     modalBg: { flex: 1, backgroundColor: '#FFF' },
//     modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 16, borderBottomWidth: 1, borderBottomColor: '#F1F5F9' },
//     headerTitle: { fontSize: 17, fontWeight: '700', color: '#1E293B' },
//     headerIconBtn: { padding: 4 },
//     saveBtnText: { color: THEME.colors.primary, fontWeight: '700', fontSize: 16 },

//     tabBar: { flexDirection: 'row', paddingHorizontal: 16, paddingTop: 16 },
//     tabItem: { marginRight: 24, paddingBottom: 8 },
//     activeTab: { borderBottomWidth: 3, borderBottomColor: THEME.colors.primary },
//     tabLabel: { fontSize: 15, fontWeight: '600', color: '#94A3B8' },
//     activeTabLabel: { color: THEME.colors.primary },

//     formContent: { padding: 20 },
//     formSectionTitle: { fontSize: 14, fontWeight: '700', color: THEME.colors.primary, marginTop: 20, marginBottom: 12 },
//     inputRow: { flexDirection: 'row', marginBottom: 16 },
//     inputLabel: { fontSize: 13, fontWeight: '600', color: '#64748B', marginBottom: 8 },
//     modernInput: { backgroundColor: '#F8F9FB', borderWidth: 1, borderColor: '#E2E8F0', borderRadius: 10, padding: 12, fontSize: 15, marginBottom: 16, color: '#1E293B' },
    
//     tableContainer: { borderWidth: 1, borderColor: '#E2E8F0', borderRadius: 10, overflow: 'hidden', marginTop: 10 },
//     tableHeaderRow: { flexDirection: 'row', backgroundColor: '#F1F5F9', borderBottomWidth: 1, borderBottomColor: '#CBD5E1' },
//     headerCell: { width: 120, padding: 12, borderRightWidth: 1, borderRightColor: '#CBD5E1' },
//     headerText: { fontWeight: '700', fontSize: 12, color: '#475569', textAlign: 'center' },
//     tableRow: { flexDirection: 'row', borderBottomWidth: 1, borderBottomColor: '#E2E8F0' },
//     evenRow: { backgroundColor: '#FFF' },
//     oddRow: { backgroundColor: '#F8F9FB' },
//     cell: { width: 120, borderRightWidth: 1, borderRightColor: '#E2E8F0', padding: 4 },
//     cellInput: { fontSize: 13, color: '#1E293B', padding: 8, textAlign: 'center' },
//     fileViewer: { flex: 1, backgroundColor: '#000' }
// });

// const pickerSelectStyles = {
//     inputIOS: { fontSize: 13, paddingHorizontal: 10, color: '#1E293B', paddingRight: 30 },
//     inputAndroid: { fontSize: 13, paddingHorizontal: 10, color: '#1E293B', paddingRight: 30 },
//     placeholder: { color: '#94A3B8', fontSize: 13 }
// };

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