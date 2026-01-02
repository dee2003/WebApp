
import React, { useEffect, useState, useMemo, useCallback } from 'react';
import {
    View,
    Text,
    SectionList,
    StyleSheet,
    ActivityIndicator,
    Alert,
    TouchableOpacity,
    RefreshControl,
    SafeAreaView,
    Platform,
    Dimensions,
} from 'react-native';
import { useNavigation, CommonActions, NavigationProp } from '@react-navigation/native';
import apiClient from '../../api/apiClient'; // Assuming this is correct
import { useAuth } from '../../context/AuthContext'; // Assuming this is correct
import type { RootStackParamList, SupervisorStackParamList } from '../../navigation/AppNavigator'; // Assuming this is correct
import Ionicons from 'react-native-vector-icons/Ionicons';

// Get screen dimensions for potential use
const { width: SCREEN_WIDTH } = Dimensions.get('window');

type SupervisorNavigationProp = NavigationProp<RootStackParamList & SupervisorStackParamList>;

interface Notification {
    id: number;
    foreman_id: number;
    foreman_name: string;
    foreman_email: string;
    date: string;
    ticket_count: number;
    timesheet_count: number;
    job_code?: string;
    work_date?: string; // Add this line to handle the actual work date
}

const THEME_COLORS = {
    primary: '#4A5C4D', // Primary action color (dark green)
    backgroundLight: '#F8F7F2', // background-light
    contentLight: '#3D3D3D', // text-primary-light
    subtleLight: '#797979', // text-secondary-light
    cardLight: '#FFFFFF', // surface-light
    brandStone: '#8E8E8E', // Subtle brand color (used for borders/empty states)
    danger: '#FF3B30', // Danger/Logout color
    success: '#34C759', // Success/Submitted color
};

const THEME_FONTS = { display: 'System' };
const THEME_BORDERS = { lg: 16, xl: 24, full: 9999 };
// Using a consistent horizontal padding variable
const HORIZONTAL_PADDING = 20;

const SupervisorDashboard = () => {
    const navigation = useNavigation<SupervisorNavigationProp>();
    const { logout, user } = useAuth();

    const [notifications, setNotifications] = useState<Notification[]>([]);
    const [loading, setLoading] = useState(false);
    const [refreshing, setRefreshing] = useState(false);
    const [submittingDate, setSubmittingDate] = useState<string | null>(null);
    const [checkingDate, setCheckingDate] = useState<string | null>(null);
    const [submittedDates, setSubmittedDates] = useState<string[]>([]);
    // const [showSummary, setShowSummary] = useState(false); // State not strictly needed if using Alert immediately

    /**
     * Shows a summary pop-up (Alert) of all pending items grouped by Foreman.
     */
    const showPendingSummary = useCallback((data: Notification[]) => {
        if (data.length === 0) return;

        // Group by foreman name and sum up counts
        const summary = data.reduce((acc, item) => {
            acc[item.foreman_name] = acc[item.foreman_name] || { timesheet: 0, ticket: 0 };
            acc[item.foreman_name].timesheet += (item.timesheet_count ?? 0);
            acc[item.foreman_name].ticket += (item.ticket_count ?? 0);
            return acc;
        }, {} as Record<string, { timesheet: number, ticket: number }>);

        let message = "Welcome! You have pending items to review:\n\n";

        Object.entries(summary).forEach(([foremanName, counts]) => {
            const parts = [];
            if (counts.timesheet > 0) parts.push(`${counts.timesheet} Timesheets`);
            if (counts.ticket > 0) parts.push(`${counts.ticket} Ticket${counts.ticket > 1 ? 's' : ''}`);

            if (parts.length > 0) {
                message += `• ${foremanName}: ${parts.join(' | ')}\n`;
            }
        });
        
        // Use Alert for a simple pop-up message on load
        Alert.alert("🚨 Pending Submissions", message.trim());
    }, []); // Dependencies are stable

    /**
     * Fetches the dashboard data and pending submitted dates.
     */
//     const loadDashboardData = useCallback(async (isInitialLoad: boolean = false) => {
//     try {
//         const [notifRes, submittedRes] = await Promise.all([
//             apiClient.get('/api/review/notifications'),
//             apiClient.get(`/api/review/submitted-dates?supervisor_id=${user?.id}`), // pass supervisor id
//         ]);
//         setNotifications(notifRes.data);
//         setSubmittedDates(submittedRes.data);
        
//         // Show summary only on the very first successful load
//         if (isInitialLoad && notifRes.data.length > 0) {
//             showPendingSummary(notifRes.data);
//         }

//     } catch (error: any) {
//         console.error('Failed to load data:', error);
//         Alert.alert(
//             'Error',
//             error.response?.data?.detail || 'Failed to load dashboard data'
//         );
//     } finally {
//         setLoading(false);
//         setRefreshing(false);
//     }
// }, [showPendingSummary, user?.id]);
const loadDashboardData = useCallback(async (isInitialLoad: boolean = false) => {
    if (!user?.id) return; // ✅ Skip if logged out

    try {
        const [notifRes, submittedRes] = await Promise.all([
            apiClient.get('/api/review/notifications'),
            apiClient.get(`/api/review/submitted-dates?supervisor_id=${user.id}`),
        ]);
        setNotifications(notifRes.data);
        setSubmittedDates(submittedRes.data);

        if (isInitialLoad && notifRes.data.length > 0) {
            showPendingSummary(notifRes.data);
        }
    } catch (error: any) {
        console.error('Failed to load data:', error);
        if (error.response?.status !== 401) { // optional
            Alert.alert(
                'Error',
                error.response?.data?.detail || 'Failed to load dashboard data'
            );
        }
    } finally {
        setLoading(false);
        setRefreshing(false);
    }
}, [showPendingSummary, user?.id]);


    // Initial data load and notification summary trigger
    useEffect(() => {
        setLoading(true);
        loadDashboardData(true); // Pass true to indicate initial load
    }, [loadDashboardData]);

    const onRefresh = async () => {
        setRefreshing(true);
        await loadDashboardData();
    };

    /**
     * Groups notifications by date for the SectionList.
     */
const sections = useMemo(() => {
    const grouped = notifications.reduce((acc, item) => {
        // Use work_date as the primary key so the section title matches the work performed
        const groupKey = item.work_date || item.date; 
        (acc[groupKey] = acc[groupKey] || []).push(item);
        return acc;
    }, {} as Record<string, Notification[]>);

    return Object.entries(grouped)
        .sort(([a], [b]) => (a < b ? 1 : -1))
        .map(([date, notifs]) => ({ title: date, data: notifs }));
}, [notifications]);



    const handleLogout = () => {
        logout();
        navigation.dispatch(CommonActions.reset({ index: 0, routes: [{ name: 'Login' }] }));
    };

    /**
     * Executes the final submission API call.
     */
    const executeSubmission = async (date: string) => {
        setSubmittingDate(date);
        try {
            await apiClient.post('/api/review/submit-all-for-date', { supervisor_id: user?.id, date });
            Alert.alert("Success", "Submitted to Project Engineer successfully!");
            // IMPORTANT: After submission, refresh the data. This will remove the section
            // if all items were successfully submitted, or keep it if new data arrived 
            // before the refresh completed.
            await loadDashboardData(); 
        } catch (e: any) {
            console.error("Submission Error:", e);
            Alert.alert("Error", e.response?.data?.detail || "Failed to submit");
        } finally {
            setSubmittingDate(null);
        }
    };

    /**
     * Performs validation check before confirming submission.
     */
    const handleSubmissionAttempt = async (date: string) => {
        if (!user?.id) {
            Alert.alert('Error', 'User not authenticated.');
            return;
        }
        setCheckingDate(date);
        try {
            // Step 1: Check validation status
            const result = await apiClient.get(`/api/review/status-for-date?date=${date}&supervisor_id=${user.id}`);
            
            const sectionData = sections.find(s => s.title === date)?.data || [];
            const timesheetCount = sectionData.reduce((sum, n) => sum + (n.timesheet_count ?? 0), 0);
            const ticketCount = sectionData.reduce((sum, n) => sum + (n.ticket_count ?? 0), 0);

            // Step 2: If validation passes, prompt for confirmation
            if (result.data.can_submit) {
                Alert.alert(
                    "Confirm Submission",
                    `You are about to submit all pending items for this date, including:\n\n- Timesheets: ${timesheetCount}\n- Tickets: ${ticketCount}\n\nDo you want to continue?`,
                    [{ text: "Cancel", style: "cancel" }, { text: "OK", onPress: () => executeSubmission(date) }]
                );
            } else {
                // Step 3: If validation fails, show blocking details
                let message = 'Cannot submit. Please review the following items:\n';
                if (result.data.unreviewed_timesheets?.length > 0) {
                    message += '\nUnreviewed Timesheets:\n';
                    result.data.unreviewed_timesheets.forEach((item: { foreman_name: string; count: number }) => {
                        message += ` • ${item.foreman_name}: ${item.count} timesheet(s)\n`;
                    });
                }
                if (result.data.incomplete_tickets?.length > 0) {
                    message += '\nTickets with missing codes:\n';
                    result.data.incomplete_tickets.forEach((item: { foreman_name: string; count: number }) => {
                        message += ` • ${item.foreman_name}: ${item.count} ticket(s)\n`;
                    });
                }
                Alert.alert('Submission Blocked', message.trim());
            }
        } catch (error: any) {
            console.error("Validation Error:", error);
            Alert.alert('Validation Error', error.response?.data?.detail || 'Failed to check submission status.');
        } finally {
            setCheckingDate(null);
        }
    };

    if (loading && !refreshing) {
        return <View style={styles.centered}><ActivityIndicator size="large" color={THEME_COLORS.primary} /></View>;
    }

    return (
        <SafeAreaView style={styles.safeArea}>
            <View style={styles.container}>
                {/* Custom Header based on Tailwind HTML */}
                <View style={styles.header}>
                    <View style={styles.headerLeft}>
                        <Text style={styles.welcomeTitle} numberOfLines={1}>
                            Hello, {user?.first_name || 'Supervisor'}
                        </Text>
                        <Text style={styles.welcomeSubtitle}>Review & Approve Submissions</Text>
                    </View>
                    <TouchableOpacity style={styles.logoutButton} onPress={handleLogout} activeOpacity={0.7}>
                        <Ionicons name="log-out-outline" size={24} color={THEME_COLORS.danger} />
                    </TouchableOpacity>
                </View>
                {/* End Custom Header */}

                <SectionList
                    sections={sections}
                    keyExtractor={item => item.id.toString()}
                    contentContainerStyle={styles.listContent}
                    refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={THEME_COLORS.primary} />}
                    ListEmptyComponent={
                        <View style={styles.emptyContainer}>
                            <Ionicons name="file-tray-stacked-outline" size={60} color={THEME_COLORS.brandStone} />
                            <Text style={styles.emptyText}>All Caught Up!</Text>
                            <Text style={styles.emptySubText}>There are no pending submissions to review.</Text>
                        </View>
                    }
                    renderSectionHeader={({ section }) => {
                        // Dynamic Button Logic: If the section is rendered, it means there are pending items.
                        // The button should be active unless actively processing.
                        const hasBeenSubmittedBefore = submittedDates.includes(section.title);
                        const isProcessing = submittingDate === section.title || checkingDate === section.title;
                        
                        // Button text clarifies if this is the first submission or a follow-up (resubmit)
                        const buttonText = isProcessing 
                            ? 'Processing...' 
                            : hasBeenSubmittedBefore ? 'Resubmit All' : 'Submit All';
                        
                        const isDisabled = isProcessing;

                        // Ensures date parsing is robust
const dateText = new Date(section.title + 'T00:00:00').toLocaleDateString(
  'en-US',
  { month: 'long', day: '2-digit', year: 'numeric' }
);

                        
                        return (
                            <View style={styles.dateGroupContainer}>
                                <View style={styles.dateHeaderRow}>
                                    <Text style={styles.dateHeader}>{dateText}</Text>
                                    <TouchableOpacity
                                        style={[
                                            styles.submitButton,
                                            { backgroundColor: THEME_COLORS.primary }, 
                                            isDisabled && { opacity: 0.7 }, // Visually dim the button when disabled
                                        ]}
                                        disabled={isDisabled}
                                        onPress={() => handleSubmissionAttempt(section.title)}
                                        activeOpacity={0.7}
                                    >
                                        {isProcessing ? (
                                            <ActivityIndicator size="small" color={THEME_COLORS.cardLight} />
                                        ) : (
                                            <Text style={styles.submitButtonText}>
                                                <Ionicons name="arrow-up-circle" size={16} color={THEME_COLORS.cardLight} />
                                                {' '} {buttonText}
                                            </Text>
                                        )}
                                    </TouchableOpacity>
                                </View>
                            </View>
                        );
                    }}
 renderItem={({ item }) => {
    // 1. Add this console log here
    console.log(`Checking Foreman: ${item.foreman_name} | Notification Date: ${item.date} | Work Date: ${item.work_date}`);

    return (
        <View style={styles.card}>
            <View style={styles.foremanInfoRow}>
                <Text style={styles.foremanName} numberOfLines={1}>
                    <Ionicons name="person-circle-outline" size={20} color={THEME_COLORS.contentLight} /> {item.foreman_name}
                </Text>
                {item.job_code && (
                    <Text style={styles.jobCodeRight} numberOfLines={1}>
                        JOB: {item.job_code}
                    </Text>
                )}
            </View>

            <TouchableOpacity
                style={styles.actionRow}
                onPress={() => {
                    // 2. Add an extra log inside the onPress to see exactly what is being sent
                    const finalDate = item.work_date || item.date;
                    console.log("Navigating to Timesheets with Date:", finalDate);
                    
                    navigation.navigate('SupervisorTimesheetList', { 
foremanId: item.foreman_id, 
    date: item.work_date || item.date, // item.work_date is now "2025-12-17"
    foremanName: item.foreman_name 
                    });
                }}
                activeOpacity={0.7}
            >
                <Text style={styles.actionLabel} numberOfLines={1}>
                    <Ionicons name="receipt-outline" size={18} color={THEME_COLORS.primary} />
                    {' '} Timesheets ({item.timesheet_count ?? 0})
                </Text>
                <Ionicons name="chevron-forward-outline" size={22} color={THEME_COLORS.subtleLight} />
            </TouchableOpacity>

            <View style={styles.divider} />

            <TouchableOpacity
                style={styles.actionRow}
                onPress={() => {
                     // 3. Apply the same date logic to Tickets
                    const finalDate = item.work_date || item.date;
                    navigation.navigate('SupervisorTicketList', { 
                        foremanId: item.foreman_id, 
                        foremanName: item.foreman_name, 
                        date: finalDate 
                    });
                }}
                activeOpacity={0.7}
            >
                <Text style={styles.actionLabel} numberOfLines={1}>
                    <Ionicons name="document-text-outline" size={18} color={THEME_COLORS.primary} />
                    {' '} Tickets ({item.ticket_count ?? 0})
                </Text>
                <Ionicons name="chevron-forward-outline" size={22} color={THEME_COLORS.subtleLight} />
            </TouchableOpacity>
        </View>
    );
}}
                />
            </View>
        </SafeAreaView>
    );
};

const styles = StyleSheet.create({
    // Base & Layout
    safeArea: { flex: 1, backgroundColor: THEME_COLORS.backgroundLight },
    container: { flex: 1 },
    listContent: {
        paddingBottom: 20, // Add space at the bottom
    },
    centered: { 
        flex: 1, 
        justifyContent: 'center', 
        alignItems: 'center', 
        backgroundColor: THEME_COLORS.backgroundLight 
    },

    // Header & Logout
    header: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingHorizontal: HORIZONTAL_PADDING,
        paddingVertical: 18,
        backgroundColor: THEME_COLORS.cardLight,
        borderBottomWidth: 1,
        borderBottomColor: THEME_COLORS.brandStone + '20', 
        ...Platform.select({
            ios: {
                shadowColor: '#000',
                shadowOffset: { width: 0, height: 2 },
                shadowOpacity: 0.05,
                shadowRadius: 4,
            },
            android: {
                elevation: 3,
            },
        }),
    },
    headerLeft: {
        flex: 1, 
        marginRight: 10,
    },
    welcomeTitle: {
        fontFamily: THEME_FONTS.display,
        fontSize: 22,
        fontWeight: '700',
        color: THEME_COLORS.contentLight,
        marginBottom: 2,
    },
    welcomeSubtitle: {
        fontFamily: THEME_FONTS.display,
        fontSize: 14,
        color: THEME_COLORS.subtleLight,
    },
    logoutButton: {
        padding: 8,
        borderRadius: THEME_BORDERS.full,
        backgroundColor: THEME_COLORS.danger + '1A',
        width: 40, 
        height: 40,
        justifyContent: 'center',
        alignItems: 'center',
        flexShrink: 0, 
    },

    // Section Header (Date Group)
    dateGroupContainer: {
        backgroundColor: THEME_COLORS.backgroundLight,
        paddingHorizontal: HORIZONTAL_PADDING,
        paddingVertical: 10,
        marginTop: 10, 
    },
    dateHeaderRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingVertical: 4,
    },
    dateHeader: {
        fontFamily: THEME_FONTS.display,
        fontSize: 18,
        fontWeight: '700',
        color: THEME_COLORS.contentLight,
        flexShrink: 1, 
        marginRight: 10,
    },
    submitButton: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        borderRadius: 8, 
        paddingHorizontal: 10,
        paddingVertical: 8,
        flexShrink: 0, 
    },
    submitButtonText: {
        fontFamily: THEME_FONTS.display,
        color: THEME_COLORS.cardLight,
        fontWeight: '600',
        fontSize: 14,
        textAlign: 'center',
    },

    // Notification Card (Item)
    card: {
        marginHorizontal: HORIZONTAL_PADDING,
        marginTop: 10, 
        padding: 16,
        backgroundColor: THEME_COLORS.cardLight,
        borderRadius: THEME_BORDERS.lg,
        ...Platform.select({
            ios: {
                shadowColor: '#000',
                shadowOpacity: 0.1,
                shadowOffset: { width: 0, height: 4 },
                shadowRadius: 6,
            },
            android: {
                elevation: 5,
            },
        }),
    },
    foremanInfoRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingBottom: 12,
        marginBottom: 8,
        borderBottomWidth: 1,
        borderBottomColor: THEME_COLORS.brandStone + '10',
    },
    foremanName: {
        fontFamily: THEME_FONTS.display,
        fontSize: 17,
        fontWeight: '600',
        color: THEME_COLORS.contentLight,
        flexShrink: 1, 
        marginRight: 10,
    },
    jobCodeRight: {
        fontFamily: THEME_FONTS.display,
        fontSize: 13,
        color: THEME_COLORS.primary,
        fontWeight: '700',
        flexShrink: 0, 
    },
    actionRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingVertical: 10,
    },
    actionLabel: {
        fontFamily: THEME_FONTS.display,
        fontSize: 15,
        fontWeight: '600',
        color: THEME_COLORS.contentLight,
        flexShrink: 1, 
    },
    divider: {
        height: 1,
        backgroundColor: THEME_COLORS.brandStone + '10', 
        marginVertical: 0,
    },

    // Empty State
    emptyContainer: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        marginTop: 80,
        paddingHorizontal: 24,
    },
    emptyText: {
        fontFamily: THEME_FONTS.display,
        fontSize: 18,
        fontWeight: '700',
        color: THEME_COLORS.subtleLight,
        marginTop: 16,
        textAlign: 'center'
    },
    emptySubText: {
        fontFamily: THEME_FONTS.display,
        fontSize: 15,
        color: THEME_COLORS.brandStone,
        marginTop: 8,
        textAlign: 'center'
    },
});

export default SupervisorDashboard;