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
    Modal, // ⭐ IMPORT MODAL
    Dimensions, // ⭐ IMPORT Dimensions
} from 'react-native';
import RNPickerSelect from 'react-native-picker-select';
import Ionicons from 'react-native-vector-icons/Ionicons';
import { useNavigation } from '@react-navigation/native';
import apiClient from '../../api/apiClient';
import { THEME } from '../../constants/theme';
import { StackNavigationProp } from '@react-navigation/stack';
import { SupervisorStackParamList } from '../../navigation/AppNavigator';
import Pdf from 'react-native-pdf'; // ⭐ IMPORT PDF LIBRARY

const { width, height } = Dimensions.get('window');

type SupervisorTicketsScreenNavigationProp = StackNavigationProp<
    SupervisorStackParamList,
    'SupervisorTicketList'
>;

interface Ticket {
    id: number;
    image_path: string; // can be .jpg or .pdf
    phase_code_id?: number | null;
}

// Helper function for simple date formatting (replaces moment.js)
const formatDate = (dateString: string) => {
    try {
        const date = new Date(dateString);
        return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
    } catch {
        return dateString; // Fallback
    }
};

export default function SupervisorTicketsScreen({ route }: any) {
    const navigation = useNavigation<SupervisorTicketsScreenNavigationProp>();
    const { foremanId, foremanName, date: routeDate } = route.params;

    const [tickets, setTickets] = useState<Ticket[]>([]);
    const [phaseCodes, setPhaseCodes] = useState<Record<number, number | null>>({});
    const [savedStatus, setSavedStatus] = useState<Record<number, boolean>>({});
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);
    const [availablePhases, setAvailablePhases] = useState<{ label: string; value: number }[]>([]);

    // ⭐ NEW STATE for PDF Modal
    const [pdfUri, setPdfUri] = useState<string | null>(null);

    // ✅ Set screen title dynamically and display the date
    useEffect(() => {
        const formattedDate = formatDate(routeDate);
        navigation.setOptions({
            title: `${foremanName}'s Tickets (${formattedDate})`,
        });
    }, [foremanName, navigation, routeDate]);

    // ✅ Fetch available phase codes
    useEffect(() => {
        const fetchPhaseCodes = async () => {
            try {
                const res = await apiClient.get('/api/job-phases/phase-codes');
                const options = res.data.map((p: any) => ({
                    label: `${p.code} - ${p.description || ''}`,
                    value: p.id,
                }));
                setAvailablePhases(options);
            } catch (err) {
                console.error('Failed to load phase codes', err);
            }
        };
        fetchPhaseCodes();
    }, []);

    // ✅ Fetch supervisor tickets
    const loadTickets = useCallback(async () => {
        const fetchStateSetter = refreshing ? setRefreshing : setLoading;
        fetchStateSetter(true);
        try {
            const response = await apiClient.get('/api/tickets/for-supervisor', {
                params: { foreman_id: foremanId, date: routeDate },
            });

            const data: Ticket[] = response.data || [];
            setTickets(data);

            const codes: Record<number, number | null> = {};
            data.forEach(t => {
                codes[t.id] = t.phase_code_id || null;
            });
            setPhaseCodes(codes);
            setSavedStatus({}); // Reset saved status on load
        } catch (err: any) {
            Alert.alert('Error', err.response?.data?.detail || 'Failed to load tickets');
        } finally {
            fetchStateSetter(false);
        }
    }, [foremanId, routeDate, refreshing]);

    useEffect(() => {
        loadTickets();
    }, [loadTickets]);

    const handleRefresh = () => {
        setRefreshing(true);
        loadTickets();
    };

    // ✅ Save selected phase code (takes value directly)
    const savePhaseCode = async (ticketId: number, phase_code_id: number) => {
        const originalTicket = tickets.find(t => t.id === ticketId);
        if (originalTicket?.phase_code_id === phase_code_id) return; // no change

        try {
            setSavedStatus(prev => ({ ...prev, [ticketId]: false }));
            await apiClient.patch(`/api/tickets/${ticketId}`, { phase_code_id });
            setTickets(prev =>
                prev.map(t =>
                    t.id === ticketId ? { ...t, phase_code_id } : t
                )
            );
            setSavedStatus(prev => ({ ...prev, [ticketId]: true }));
        } catch (err: any) {
            console.error(err);
            Alert.alert('Save Error', err.response?.data?.detail || 'Failed to save phase code');
            setSavedStatus(prev => ({ ...prev, [ticketId]: false }));
        }
    };
    
    // ⭐ PDF Source Logic from previous context
    const modalPdfSource = pdfUri ? { uri: pdfUri, cache: true } : undefined;
    
    // 💡 List Empty Component
    const ListEmptyComponent = () => (
        <View style={styles.emptyContainer}>
            <Ionicons name="document-text-outline" size={60} color={THEME.colors.subtleLight} />
            <Text style={styles.emptyText}>
                No submitted tickets found for {foremanName} on {formatDate(routeDate)}.
            </Text>
            <Text style={styles.emptySubText}>
                If tickets were submitted today, please refresh or check the date on the previous screen.
            </Text>
            <TouchableOpacity onPress={handleRefresh} style={styles.refreshButton}>
                <Ionicons name="refresh" size={20} color={THEME.colors.brandStone} />
                <Text style={styles.refreshButtonText}>Refresh</Text>
            </TouchableOpacity>
        </View>
    );

    // ✅ Render each ticket - DEFINED INSIDE COMPONENT TO FIX TS ERROR
    const renderTicket = ({ item }: { item: Ticket }) => (
        <View style={styles.ticketContainer}>
            <TouchableOpacity
                onPress={() => {
                    // ⭐ Correctly construct the full URI
                    const fileUri = `${apiClient.defaults.baseURL}${item.image_path}`;
                    
                    // 🟥 If it's a PDF → open the Modal
                    if (item.image_path.toLowerCase().endsWith('.pdf')) {
                        setPdfUri(fileUri); // Set the URI to open the modal
                    } 
                    // 🟩 If it's an image → navigate or open image viewer (current image preview is static)
                    // You might want to navigate to an image viewer for images as well, 
                    // but for this fix, we focus on the PDF.
                }}
            >
                {item.image_path.toLowerCase().endsWith('.pdf') ? (
                    // 🟥 PDF Preview Block
                    <View style={styles.pdfContainer}>
                        <Ionicons name="document-text" size={48} color="#d32f2f" />
                        <Text style={styles.pdfText}>Tap to View PDF</Text>
                    </View>
                ) : (
                    // 🟩 Image file preview
                    <Image
                        source={{ uri: `${apiClient.defaults.baseURL}${item.image_path}` }}
                        style={styles.image}
                    />
                )}
            </TouchableOpacity>
            <View style={styles.inputRow}>
                <View style={{ flex: 1 }}>
                    <RNPickerSelect
                        onValueChange={(value) => {
                            if (value == null) return;
                            setPhaseCodes(prev => ({ ...prev, [item.id]: value }));
                            setSavedStatus(prev => ({ ...prev, [item.id]: false }));
                            savePhaseCode(item.id, value); // ✅ pass value directly
                        }}
                        items={availablePhases}
                        value={phaseCodes[item.id]}
                        placeholder={{ label: 'Select Phase Code', value: null }}
                        style={{
                            inputIOS: styles.input,
                            inputAndroid: styles.input,
                        }}
                        useNativeAndroidPickerStyle={false}
                    />
                </View>

                <View
                    style={[
                        styles.statusIndicator,
                        { backgroundColor: savedStatus[item.id] ? THEME.colors.success : THEME.colors.brandStone },
                    ]}
                >
                    <Ionicons
                        name={savedStatus[item.id] ? 'checkmark' : 'sync'}
                        size={16}
                        color={THEME.colors.cardLight}
                    />
                </View>
            </View>

            {savedStatus[item.id] && (
                <Text style={styles.savedText}>Saved</Text>
            )}
        </View>
    );

    if (loading && !refreshing) {
        return (
            <View style={styles.centered}>
                <ActivityIndicator size="large" color={THEME.colors.brandStone} />
            </View>
        );
    }

    return (
        <View style={{ flex: 1 }}>
            <FlatList
                data={tickets}
                keyExtractor={(item) => item.id.toString()}
                renderItem={renderTicket}
                onRefresh={handleRefresh}
                refreshing={refreshing}
                ListEmptyComponent={ListEmptyComponent} // 💡 Added ListEmptyComponent
                contentContainerStyle={styles.listContainer}
            />

            {/* ⭐ PDF Viewing Modal (reusing logic from previous context) */}
            <Modal
                visible={!!pdfUri}
                transparent
                animationType="fade"
                onRequestClose={() => setPdfUri(null)}
            >
                <View style={styles.modalContainer}>
                    <View style={styles.modalContent}>
                        {modalPdfSource ? (
                            <Pdf
                                source={modalPdfSource}
                                onLoadComplete={(numberOfPages, filePath) => {
                                    console.log(`PDF loaded with ${numberOfPages} pages.`);
                                }}
                                onError={(error) => {
                                    console.error('PDF Modal Error:', error);
                                    Alert.alert('Error', 'Could not load PDF file.');
                                    setPdfUri(null);
                                }}
                                style={styles.fullPdf}
                                trustAllCerts={false}
                            />
                        ) : (
                            <View style={styles.centered}>
                                <ActivityIndicator size="large" color="#fff" />
                            </View>
                        )}
                    </View>
                    <TouchableOpacity
                        style={styles.closeButton}
                        onPress={() => setPdfUri(null)}
                    >
                        <Ionicons name="close" size={30} color="#fff" />
                    </TouchableOpacity>
                </View>
            </Modal>
        </View>
    );
}

const styles = StyleSheet.create({
    listContainer: {
        padding: 10,
        flexGrow: 1, // Allows ListEmptyComponent to center
    },
    ticketContainer: {
        backgroundColor: THEME.colors.cardLight,
        borderRadius: 12,
        marginBottom: 16,
        overflow: 'hidden',
        shadowColor: '#000',
        shadowOpacity: 0.1,
        shadowRadius: 5,
        elevation: 3,
        paddingBottom: 8,
    },
    image: {
        width: '100%',
        height: 200,
        borderTopLeftRadius: 12,
        borderTopRightRadius: 12,
    },
    inputRow: {
        flexDirection: 'row',
        alignItems: 'center',
        padding: 10,
    },
    input: {
        flex: 1,
        borderWidth: 1,
        borderColor: THEME.colors.subtleLight,
        borderRadius: 8,
        padding: 8,
        color: THEME.colors.textDark,
        backgroundColor: '#f9f9f9',
    },
    statusIndicator: {
        width: 28,
        height: 28,
        borderRadius: 14,
        marginLeft: 10,
        alignItems: 'center',
        justifyContent: 'center',
    },
    savedText: {
        textAlign: 'right',
        color: THEME.colors.success,
        fontSize: 12,
        marginRight: 10,
        marginTop: -6,
    },
    centered: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
    },
    pdfContainer: {
        height: 200,
        backgroundColor: '#fdecea',
        alignItems: 'center',
        justifyContent: 'center',
        borderTopLeftRadius: 12,
        borderTopRightRadius: 12,
    },
    pdfText: {
        marginTop: 10,
        color: '#d32f2f',
        fontSize: 14,
        fontWeight: '600',
    },
    // Styles for Empty State (unchanged)
    emptyContainer: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        padding: 30,
        marginTop: 50,
    },
    emptyText: {
        marginTop: 15,
        textAlign: 'center',
        fontSize: 16,
        color: THEME.colors.textMuted,
    },
    emptySubText: {
        marginTop: 5,
        textAlign: 'center',
        fontSize: 12,
        color: THEME.colors.textMuted,
    },
    refreshButton: {
        flexDirection: 'row',
        alignItems: 'center',
        marginTop: 20,
        padding: 10,
        borderRadius: 8,
        backgroundColor: THEME.colors.cardLight,
        borderWidth: 1,
        borderColor: THEME.colors.brandStone,
    },
    refreshButtonText: {
        marginLeft: 5,
        color: THEME.colors.brandStone,
        fontWeight: 'bold',
    },

    // ⭐ NEW MODAL STYLES (from previous context)
    modalContainer: {
        flex: 1,
        backgroundColor: 'rgba(0,0,0,1)', // Fully dark background for PDF
        paddingTop: 40,
    },
    modalContent: {
        flex: 1,
        backgroundColor: '#333',
    },
    fullPdf: {
        flex: 1,
        width: width,
        height: height,
    },
    closeButton: {
        position: 'absolute',
        top: 50, // Safe area
        right: 20,
        backgroundColor: 'rgba(0,0,0,0.5)',
        borderRadius: 20,
        padding: 5,
        zIndex: 10,
    },
});