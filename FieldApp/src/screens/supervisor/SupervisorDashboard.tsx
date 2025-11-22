


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
    Platform, // Import Platform for shadow consistency
} from 'react-native';
import { useNavigation, CommonActions, NavigationProp } from '@react-navigation/native';
import apiClient from '../../api/apiClient';
import { useAuth } from '../../context/AuthContext';
import type { RootStackParamList, SupervisorStackParamList } from '../../navigation/AppNavigator';
import Ionicons from 'react-native-vector-icons/Ionicons';

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
}

// Adapted Theme and Colors based on the provided Tailwind config
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

const THEME_FONTS = { display: 'System' }; // Manrope not available by default, using System
const THEME_BORDERS = { lg: 16, xl: 24, full: 9999 };
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

    const loadDashboardData = useCallback(async () => {
        try {
            const [notifRes, submittedRes] = await Promise.all([
                apiClient.get('/api/review/notifications'),
                apiClient.get('/api/review/submitted-dates'),
            ]);
            setNotifications(notifRes.data);
            setSubmittedDates(submittedRes.data);
        } catch (error: any) {
            console.error('Failed to load data:', error);
            Alert.alert(
                'Error',
                error.response?.data?.detail || 'Failed to load dashboard data'
            );
        } finally {
            setLoading(false);
            setRefreshing(false);
        }
    }, []);

    useEffect(() => {
        setLoading(true);
        loadDashboardData();
    }, [loadDashboardData]);

    const onRefresh = async () => {
        setRefreshing(true);
        await loadDashboardData();
    };

    const sections = useMemo(() => {
        const grouped = notifications.reduce((acc, item) => {
            (acc[item.date] = acc[item.date] || []).push(item);
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

    const executeSubmission = async (date: string) => {
        setSubmittingDate(date);
        try {
            await apiClient.post('/api/review/submit-all-for-date', { supervisor_id: user?.id, date });
            Alert.alert("Success", "Submitted to Project Engineer successfully!");
            setSubmittedDates(prev => [...prev, date]);
            await loadDashboardData();
        } catch (e: any) {
            console.error("Submission Error:", e);
            Alert.alert("Error", e.response?.data?.detail || "Failed to submit");
        } finally {
            setSubmittingDate(null);
        }
    };

    const handleSubmissionAttempt = async (date: string) => {
        if (!user?.id) {
            Alert.alert('Error', 'User not authenticated.');
            return;
        }
        setCheckingDate(date);
        try {
            const result = await apiClient.get(`/api/review/status-for-date?date=${date}&supervisor_id=${user.id}`);
            
            const timesheetCount = sections.find(s => s.title === date)?.data.reduce((sum, n) => sum + (n.timesheet_count ?? 0), 0) || 0;
            const ticketCount = sections.find(s => s.title === date)?.data.reduce((sum, n) => sum + (n.ticket_count ?? 0), 0) || 0;

            if (result.data.can_submit) {
                Alert.alert(
                    "Confirm Submission",
                    `You are about to submit all pending items for this date, including:\n\n- Timesheets: ${timesheetCount}\n- Tickets: ${ticketCount}\n\nDo you want to continue?`,
                    [{ text: "Cancel", style: "cancel" }, { text: "OK", onPress: () => executeSubmission(date) }]
                );
            } else {
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
                        <Text style={styles.welcomeTitle}>
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
                        const isSubmitted = submittedDates.includes(section.title);
                        const isProcessing = submittingDate === section.title || checkingDate === section.title;
                        const buttonText = isSubmitted ? 'Submitted' : isProcessing ? 'Processing' : 'Submit All';
                        const dateText = new Date(section.title + 'T00:00:00').toLocaleDateString('en-US', { weekday: 'short', year: 'numeric', month: 'short', day: 'numeric' });
                        
                        return (
                            <View style={styles.dateGroupContainer}>
                                <View style={styles.dateHeaderRow}>
                                    <Text style={styles.dateHeader}>{dateText}</Text>
                                    <TouchableOpacity
                                        style={[
                                            styles.submitButton,
                                            { backgroundColor: isSubmitted ? THEME_COLORS.success : THEME_COLORS.primary },
                                            (isProcessing || isSubmitted) && { opacity: 0.8 },
                                        ]}
                                        disabled={isProcessing || isSubmitted}
                                        onPress={() => handleSubmissionAttempt(section.title)}
                                        activeOpacity={0.7}
                                    >
                                        {isProcessing ? (
                                            <ActivityIndicator size="small" color={THEME_COLORS.cardLight} />
                                        ) : (
                                            <Text style={styles.submitButtonText}>
                                                <Ionicons name={isSubmitted ? "checkmark-circle" : "arrow-up-circle"} size={16} color={THEME_COLORS.cardLight} />
                                                {' '} {buttonText}
                                            </Text>
                                        )}
                                    </TouchableOpacity>
                                </View>
                            </View>
                        );
                    }}
                    renderItem={({ item }) => (
                        <View style={styles.card}>
                            <View style={styles.foremanInfoRow}>
                                <Text style={styles.foremanName}>
                                    <Ionicons name="person-circle-outline" size={20} color={THEME_COLORS.contentLight} /> {item.foreman_name}
                                </Text>
                                {item.job_code && (
                                    <Text style={styles.jobCodeRight}>
                                        JOB: {item.job_code}
                                    </Text>
                                )}
                            </View>

                            <TouchableOpacity
                                style={styles.actionRow}
                                onPress={() => navigation.navigate('SupervisorTimesheetList', { foremanId: item.foreman_id, date: item.date, foremanName: item.foreman_name })}
                                activeOpacity={0.7}
                            >
                                <Text style={styles.actionLabel}>
                                    <Ionicons name="receipt-outline" size={18} color={THEME_COLORS.primary} />
                                    {' '} Timesheets ({item.timesheet_count ?? 0})
                                </Text>
                                <Ionicons name="chevron-forward-outline" size={22} color={THEME_COLORS.subtleLight} />
                            </TouchableOpacity>
                            
                            <View style={styles.divider} />
                            
                            <TouchableOpacity
                                style={styles.actionRow}
                                onPress={() => navigation.navigate('SupervisorTicketList', { foremanId: item.foreman_id, foremanName: item.foreman_name, date: item.date })}
                                activeOpacity={0.7}
                            >
                                <Text style={styles.actionLabel}>
                                    <Ionicons name="document-text-outline" size={18} color={THEME_COLORS.primary} />
                                    {' '} Tickets ({item.ticket_count ?? 0})
                                </Text>
                                <Ionicons name="chevron-forward-outline" size={22} color={THEME_COLORS.subtleLight} />
                            </TouchableOpacity>
                        </View>
                    )}
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

    // Header & Logout (Mimicking surface-light background, shadow-sm, h-20)
    header: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingHorizontal: HORIZONTAL_PADDING,
        paddingVertical: 18,
        backgroundColor: THEME_COLORS.cardLight,
        borderBottomWidth: 1,
        borderBottomColor: THEME_COLORS.brandStone + '20', // Subtle border
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
        // Contains title and subtitle
    },
    welcomeTitle: {
        fontFamily: THEME_FONTS.display,
        fontSize: 22, // close to text-xl
        fontWeight: '700', // font-bold
        color: THEME_COLORS.contentLight,
        marginBottom: 2,
    },
    welcomeSubtitle: {
        fontFamily: THEME_FONTS.display,
        fontSize: 14,
        color: THEME_COLORS.subtleLight, // text-secondary-light
    },
    logoutButton: {
        padding: 8,
        borderRadius: THEME_BORDERS.full,
        backgroundColor: THEME_COLORS.danger + '1A', // Light red background
    },

    // Section Header (Date Group)
    dateGroupContainer: {
        backgroundColor: THEME_COLORS.backgroundLight,
        paddingHorizontal: HORIZONTAL_PADDING,
        paddingVertical: 10,
        marginTop: 10, // Separates date groups slightly
    },
    dateHeaderRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingVertical: 4,
    },
    dateHeader: {
        fontFamily: THEME_FONTS.display,
        fontSize: 18, // close to text-xl
        fontWeight: '700', // font-bold
        color: THEME_COLORS.contentLight, // text-primary-light
    },
    submitButton: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        borderRadius: 8, // Rounded-lg from tailwind config
        paddingHorizontal: 10,
        paddingVertical: 8,
        minWidth: 100,
    },
    submitButtonText: {
        fontFamily: THEME_FONTS.display,
        color: THEME_COLORS.cardLight,
        fontWeight: '600',
        fontSize: 14,
        textAlign: 'center',
    },

    // Notification Card (Item - Mimicking bg-surface-light, rounded-xl, shadow-sm)
    card: {
        marginHorizontal: HORIZONTAL_PADDING,
        marginTop: 10, // Reduced margin to make them look grouped
        padding: 16,
        backgroundColor: THEME_COLORS.cardLight,
        borderRadius: THEME_BORDERS.lg,
        ...Platform.select({
            ios: {
                shadowColor: '#000',
                shadowOpacity: 0.1, // Softer shadow
                shadowOffset: { width: 0, height: 4 },
                shadowRadius: 6,
            },
            android: {
                elevation: 5, // Increased elevation for Android
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
        borderBottomColor: THEME_COLORS.brandStone + '10', // Very subtle divider
    },
    foremanName: {
        fontFamily: THEME_FONTS.display,
        fontSize: 17,
        fontWeight: '600',
        color: THEME_COLORS.contentLight,
        flexShrink: 1,
    },
    jobCodeRight: {
        fontFamily: THEME_FONTS.display,
        fontSize: 13,
        color: THEME_COLORS.primary,
        fontWeight: '700',
        marginLeft: 10,
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
        color: THEME_COLORS.contentLight, // Changed to contentLight for prominence
    },
    divider: {
        height: 1,
        backgroundColor: THEME_COLORS.brandStone + '10', // Subtle divider color
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
        fontWeight: '700', // bolder
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