import React, { useState, useCallback } from 'react';
import {
    View,
    Text,
    FlatList,
    StyleSheet,
    ActivityIndicator,
    SafeAreaView,
    TouchableOpacity,
    Alert,
    RefreshControl,
} from 'react-native';
import { RouteProp, useRoute, useNavigation, useFocusEffect } from '@react-navigation/native';
import { StackNavigationProp } from '@react-navigation/stack';
import apiClient from '../../api/apiClient';
import { useAuth } from '../../context/AuthContext';
import Ionicons from 'react-native-vector-icons/Ionicons';
import type { SupervisorStackParamList } from '../../navigation/AppNavigator';

// --- Types ---
type TimesheetSummary = {
    id: number;
    timesheet_name: string;
    job_name: string;
    status: 'SUBMITTED' | 'REVIEWED_BY_SUPERVISOR' | 'APPROVED_BY_SUPERVISOR' | string; 
};

type TimesheetListRouteProp = RouteProp<SupervisorStackParamList, 'SupervisorTimesheetList'>;
type NavigationProp = StackNavigationProp<SupervisorStackParamList, 'SupervisorTimesheetList'>;

const THEME = {
    colors: {
        primary: '#4A5C4D',
        backgroundLight: '#F8F7F2',
        contentLight: '#3D3D3D',
        subtleLight: '#797979',
        cardLight: '#FFFFFF',
        warning: '#FF9500', // Pending
        success: '#34C759', // Final Approved
        review: '#007AFF',  // Reviewed
    },
    borderRadius: { lg: 12 },
};

export default function SupervisorTimesheetListScreen() {
    const route = useRoute<TimesheetListRouteProp>();
    const navigation = useNavigation<NavigationProp>();
    const { user } = useAuth();
    const { foremanId, date, foremanName } = route.params;

    const [timesheets, setTimesheets] = useState<TimesheetSummary[]>([]);
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);
    const [isUpdating, setIsUpdating] = useState(false);

    // --- Data Fetching ---
    const fetchTimesheets = useCallback(async () => {
        try {
            const response = await apiClient.get<TimesheetSummary[]>(
                `/api/timesheets/for-supervisor`, {
                    params: { foreman_id: foremanId, date: date }
                }
            );
            // Ensure we set data even if empty
            setTimesheets(response.data || []);
        } catch (error) {
            console.error('Fetch error:', error);
        } finally {
            setLoading(false);
            setRefreshing(false);
        }
    }, [foremanId, date]);

    // ✅ Reload data every time the supervisor returns to this screen
    useFocusEffect(
        useCallback(() => {
            fetchTimesheets();
        }, [fetchTimesheets])
    );

    // --- Toggle Logic (Optimistic) ---
const handleToggleReview = async (item: TimesheetSummary) => {
    // If it's already final-approved, don't allow changes
    if (item.status === 'APPROVED_BY_SUPERVISOR') return;

    const isMarkingReviewed = item.status === 'SUBMITTED';
    const newStatus = isMarkingReviewed ? 'REVIEWED_BY_SUPERVISOR' : 'SUBMITTED';

    // ✅ STEP 1: Update the list locally so it DOES NOT disappear
    setTimesheets(prev => prev.map(ts => 
        ts.id === item.id ? { ...ts, status: newStatus } : ts
    ));

    try {
        // ✅ STEP 2: Send to backend
        await apiClient.post(`/api/review/mark-timesheets-reviewed-bulk`, {
            foreman_id: foremanId,
            date: date,
            supervisor_id: user?.id,
            timesheet_ids: [item.id] 
        });
        
        // Note: Do NOT call fetchTimesheets() here. 
        // Let the local state handle the visual change.
    } catch (error) {
        Alert.alert('Error', 'Failed to update server.');
        // Revert UI if the server fails
        fetchTimesheets(); 
    }
};

    const renderTimesheetItem = ({ item }: { item: TimesheetSummary }) => {
        const isReviewed = item.status === 'REVIEWED_BY_SUPERVISOR';
        const isApproved = item.status === 'APPROVED_BY_SUPERVISOR';
        
        let statusColor = THEME.colors.warning;
        let iconName = "square-outline";
        let displayStatus = "Pending Review";

        if (isApproved) {
            statusColor = THEME.colors.success;
            iconName = "checkmark-done-circle";
            displayStatus = "Approved (Final)";
        } else if (isReviewed) {
            statusColor = THEME.colors.review;
            iconName = "checkbox";
            displayStatus = "Reviewed by You";
        }

        return (
            <View style={styles.cardWrapper}>
                {/* Checkbox Section */}
                <TouchableOpacity 
                    style={styles.checkboxContainer} 
                    onPress={() => handleToggleReview(item)}
                    disabled={isApproved || isUpdating}
                >
                    <Ionicons name={iconName} size={30} color={statusColor} />
                </TouchableOpacity>

                {/* Content Section */}
                <TouchableOpacity 
                    style={styles.cardContent} 
                    onPress={() => navigation.navigate('TimesheetReview', { timesheetId: item.id })}
                >
                    <View style={{ flex: 1 }}>
                        <Text style={styles.cardTitle}>{item.timesheet_name}</Text>
                        <Text style={[styles.statusLabel, { color: statusColor }]}>
                            {displayStatus}
                        </Text>
                    </View>
                    <Ionicons name="chevron-forward" size={18} color="#CCC" />
                </TouchableOpacity>
            </View>
        );
    };

    if (loading && !refreshing) {
        return (
            <View style={styles.centered}>
                <ActivityIndicator size="large" color={THEME.colors.primary} />
            </View>
        );
    }

    return (
        <SafeAreaView style={styles.container}>
            <View style={styles.headerInfo}>
                <Text style={styles.headerSub}>{foremanName}</Text>
                <Text style={styles.headerDate}>{new Date(date + 'T00:00:00').toLocaleDateString()}</Text>
            </View>

            <FlatList
                data={timesheets}
                renderItem={renderTimesheetItem}
                keyExtractor={(item) => item.id.toString()}
                contentContainerStyle={styles.listContainer}
                refreshControl={
                    <RefreshControl refreshing={refreshing} onRefresh={() => {setRefreshing(true); fetchTimesheets();}} />
                }
                ListEmptyComponent={
                    <View style={styles.empty}>
                        <Ionicons name="document-outline" size={50} color="#DDD" />
                        <Text style={{color: '#999', marginTop: 10}}>No timesheets found.</Text>
                    </View>
                }
            />
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: THEME.colors.backgroundLight },
    centered: { flex: 1, justifyContent: 'center', alignItems: 'center' },
    headerInfo: { paddingHorizontal: 20, paddingTop: 10, marginBottom: 5 },
    headerSub: { fontSize: 18, fontWeight: 'bold', color: '#333' },
    headerDate: { fontSize: 14, color: '#666' },
    listContainer: { padding: 16 },
    cardWrapper: {
        backgroundColor: '#FFF',
        borderRadius: THEME.borderRadius.lg,
        marginBottom: 12,
        flexDirection: 'row',
        alignItems: 'center',
        elevation: 3,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 4,
    },
    checkboxContainer: { padding: 15, justifyContent: 'center', alignItems: 'center' },
    cardContent: { flex: 1, flexDirection: 'row', alignItems: 'center', paddingVertical: 15, paddingRight: 15 },
    cardTitle: { fontSize: 16, fontWeight: '700', color: '#333' },
    statusLabel: { fontSize: 12, fontWeight: '600', marginTop: 4 },
    empty: { alignItems: 'center', marginTop: 100 }
});