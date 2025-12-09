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
} from 'react-native';
import Ionicons from 'react-native-vector-icons/Ionicons';
// 💡 useNavigation is needed for PDF view navigation
import { RouteProp, useRoute, useNavigation } from '@react-navigation/native';
import apiClient from '../../api/apiClient';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';

import { ProjectEngineerStackParamList } from '../../navigation/AppNavigator';
type PETicketListNavigationProp = NativeStackNavigationProp<
  ProjectEngineerStackParamList,
  'PETicketList'
>;
// --- CONSTANTS & TYPES ---
const THEME = {
    colors: {
        primary: '#4A5C4D', 
        backgroundLight: '#F8F7F2', 
        contentLight: '#3D3D3D', 
        subtleLight: '#797979', 
        cardLight: '#FFFFFF', 
        brandStone: '#8E8E8E', 
        danger: '#FF3B30', 
        border: '#E5E5E5', 
    },
    fontFamily: { display: 'System' },
    borderRadius: { lg: 16, sm: 8, full: 9999 },
};

type Ticket = {
    id: number;
    image_path: string;
    phase_code?: string;
};

type RouteParams = RouteProp<ProjectEngineerStackParamList, 'PETicketList'>;

const { width } = Dimensions.get('window');
const HORIZONTAL_PADDING = 16; 
const COLUMN_SPACING = 10;
const IMAGE_SIZE = (width - HORIZONTAL_PADDING * 2 - COLUMN_SPACING) / 2;

// Helper to get Today's date in YYYY-MM-DD format
const getTodayDate = () => {
    return new Date().toISOString().split('T')[0];
};

// --- COMPONENT ---

const PETicketList = () => {
    const navigation = useNavigation<PETicketListNavigationProp>(); // ✅ Use typed navigation here
    const route = useRoute<RouteProp<ProjectEngineerStackParamList, 'PETicketList'>>();
    const { foremanId, date: routeDate, supervisorName } = route.params;

    // 🎯 Use TODAY's date for filtering
    const TODAY_DATE = getTodayDate();

    const [tickets, setTickets] = useState<Ticket[]>([]);
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);
    const [modalVisible, setModalVisible] = useState(false);
    const [selectedTicket, setSelectedTicket] = useState<Ticket | null>(null);

    // ✅ Load tickets uses TODAY_DATE
    const loadTickets = useCallback(async () => {
        try {
            setLoading(true);
            const res = await apiClient.get(
                // 🎯 API CALL NOW USES TODAY_DATE
                `/api/review/pe/tickets?foreman_id=${foremanId}&date=${TODAY_DATE}` 
            );
            setTickets(res.data);
        } catch (error: any) {
            console.error('Failed to load tickets:', error);
            Alert.alert('Error', error.response?.data?.detail || 'Failed to load tickets');
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

    // 💡 Function to handle file viewing (Image or PDF)
    const handleTicketPress = (item: Ticket) => {
        if (!item.image_path) return;

        const fileUri = `${apiClient.defaults.baseURL}${item.image_path}`;
        
        if (item.image_path.toLowerCase().endsWith('.pdf')) {
            // 🎯 Navigate to the dedicated PDF Viewer screen
            navigation.navigate('PDFViewer', { uri: fileUri }); 
        } else {
            // 💡 Open modal for image preview
            setSelectedTicket(item);
            setModalVisible(true);
        }
    };

    const closeModal = () => {
        setSelectedTicket(null);
        setModalVisible(false);
    };

    if (loading && tickets.length === 0) {
        return (
            <View style={styles.centered}>
                <ActivityIndicator size="large" color={THEME.colors.primary} />
            </View>
        );
    }

    return (
        <View style={styles.container}>
            <FlatList
                data={tickets}
                keyExtractor={(item) => item.id.toString()}
                numColumns={2}
                columnWrapperStyle={styles.columnWrapper}
                contentContainerStyle={styles.listContent}
                refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={THEME.colors.primary} />}
                
                renderItem={({ item }) => (
                    <TouchableOpacity 
                        onPress={() => handleTicketPress(item)} // ✅ Use unified press handler
                        style={styles.ticketCard} 
                        activeOpacity={0.8}
                    >
                        {/* 🎯 Check for PDF and display placeholder */}
                        {item.image_path && item.image_path.toLowerCase().endsWith('.pdf') ? (
                            <View style={[styles.image, styles.pdfPlaceholder]}>
                                <Ionicons name="document-text-outline" size={40} color={THEME.colors.primary} />
                                <Text style={styles.pdfTextSmall}>Tap to View PDF</Text>
                            </View>
                        ) : item.image_path ? (
                            // Image Preview
                            <Image
                                source={{ uri: `${apiClient.defaults.baseURL}${item.image_path}` }}
                                style={styles.image}
                                resizeMode="cover"
                            />
                        ) : (
                            // No Image Placeholder
                            <View style={[styles.image, styles.placeholder]}>
                                <Ionicons name="image-outline" size={40} color={THEME.colors.brandStone} />
                            </View>
                        )}

                        {/* Phase Code display remains unchanged */}
                        <View style={styles.phaseCodeWrapper}>
                            <Text style={styles.phaseCodeLabel}>Phase Code:</Text>
                            <Text style={[styles.phaseCodeText, !item.phase_code && styles.phaseCodeMissing]}>
                                {item.phase_code || 'MISSING'}
                            </Text>
                        </View>
                    </TouchableOpacity>
                )}

                ListEmptyComponent={
                    <View style={styles.emptyContainer}>
                        <Ionicons name="receipt-outline" size={60} color={THEME.colors.brandStone} />
                        <Text style={styles.emptyText}>No Tickets Found</Text>
                        <Text style={styles.emptySubText}>Showing submissions for date: {TODAY_DATE}</Text>
                    </View>
                }
            />

            {/* Modal only shows Images (PDFs are handled by navigation) */}
            <Modal visible={modalVisible} transparent animationType="slide">
                <View style={styles.modalBackground}>
                    <View style={styles.modalContent}>
                        <TouchableOpacity style={styles.closeButton} onPress={closeModal}>
                            <Ionicons name="close-circle" size={40} color={THEME.colors.danger} />
                        </TouchableOpacity>
                        
                        {selectedTicket?.image_path ? (
                            <Image
                                source={{ uri: `${apiClient.defaults.baseURL}${selectedTicket.image_path}` }}
                                style={styles.modalImage}
                                resizeMode="contain"
                            />
                        ) : (
                             <View style={[styles.modalImage, styles.placeholder, { height: width * 0.8, backgroundColor: THEME.colors.cardLight }]}>
                                <Ionicons name="image-outline" size={80} color={THEME.colors.brandStone} />
                            </View>
                        )}

                        <View style={styles.modalInfoBar}>
                            <Text style={styles.modalInfoText}>
                                Phase Code: 
                                <Text style={[styles.modalPhaseCode, !selectedTicket?.phase_code && styles.phaseCodeMissing]}>
                                    {' '}{selectedTicket?.phase_code || 'MISSING'}
                                </Text>
                            </Text>
                        </View>
                    </View>
                </View>
            </Modal>
        </View>
    );
};

// --- STYLES ---

const styles = StyleSheet.create({
    container: { 
        flex: 1, 
        backgroundColor: THEME.colors.backgroundLight,
    },
    listContent: {
        paddingHorizontal: HORIZONTAL_PADDING,
        paddingBottom: 20,
    },
    centered: { 
        flex: 1, 
        justifyContent: 'center', 
        alignItems: 'center', 
        backgroundColor: THEME.colors.backgroundLight 
    },
    columnWrapper: { 
        justifyContent: 'space-between', 
        marginBottom: COLUMN_SPACING 
    },
    ticketCard: {
        width: IMAGE_SIZE,
        backgroundColor: THEME.colors.cardLight,
        borderRadius: THEME.borderRadius.sm,
        padding: 8,
        shadowColor: '#000',
        shadowOpacity: 0.05,
        shadowRadius: 5,
        elevation: 3,
    },
    image: {
        width: '100%',
        height: IMAGE_SIZE * 0.9,
        borderRadius: THEME.borderRadius.sm - 2,
        backgroundColor: THEME.colors.border,
    },
    placeholder: {
        justifyContent: 'center',
        alignItems: 'center',
    },
    // ✅ NEW PDF Placeholder Style
    pdfPlaceholder: {
        justifyContent: 'center',
        alignItems: 'center',
        backgroundColor: '#F3F4F6',
    },
    pdfTextSmall: {
        fontSize: 10,
        fontWeight: '500',
        marginTop: 5,
        color: THEME.colors.subtleLight,
    },
    phaseCodeWrapper: {
        flexDirection: 'row',
        justifyContent: 'center',
        alignItems: 'center',
        marginTop: 6,
        paddingVertical: 2,
    },
    phaseCodeLabel: {
        fontFamily: THEME.fontFamily.display,
        fontSize: 12,
        fontWeight: '500',
        color: THEME.colors.subtleLight,
        marginRight: 4
    },
    phaseCodeText: {
        fontFamily: THEME.fontFamily.display,
        fontSize: 14,
        fontWeight: '700',
        color: THEME.colors.primary,
        textAlign: 'center',
    },
    phaseCodeMissing: {
        color: THEME.colors.danger,
    },
    emptyContainer: { 
        alignItems: 'center', 
        marginTop: 80 
    },
    emptyText: { 
        fontFamily: THEME.fontFamily.display,
        fontSize: 18, 
        fontWeight: '600',
        color: THEME.colors.subtleLight, 
        marginTop: 10 
    },
    emptySubText: {
        fontFamily: THEME.fontFamily.display,
        fontSize: 14,
        color: THEME.colors.brandStone, 
        marginTop: 5
    },
    modalBackground: {
        flex: 1,
        backgroundColor: 'rgba(0,0,0,0.9)',
        justifyContent: 'center',
        alignItems: 'center',
    },
    modalContent: { 
        width: '90%', 
        alignItems: 'center',
    },
    modalImage: { 
        width: '100%', 
        height: width * 0.8,
        borderRadius: THEME.borderRadius.sm,
        backgroundColor: THEME.colors.contentLight,
    },
    closeButton: { 
        position: 'absolute', 
        top: -20, 
        right: -10, 
        zIndex: 2,
        backgroundColor: THEME.colors.cardLight,
        borderRadius: THEME.borderRadius.full,
    },
    modalInfoBar: {
        marginTop: 20,
        backgroundColor: THEME.colors.primary,
        paddingHorizontal: 15,
        paddingVertical: 10,
        borderRadius: THEME.borderRadius.sm,
    },
    modalInfoText: {
        fontFamily: THEME.fontFamily.display,
        fontSize: 16,
        fontWeight: '500',
        color: THEME.colors.cardLight,
    },
    modalPhaseCode: {
        fontWeight: '700',
    }
});

export default PETicketList;