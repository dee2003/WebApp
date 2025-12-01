// /src/screens/foreman/TimesheetListScreen.tsx

import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, FlatList, TouchableOpacity, ActivityIndicator, RefreshControl, SafeAreaView } from 'react-native';
import { useNavigation, useIsFocused } from '@react-navigation/native';
import { StackNavigationProp } from '@react-navigation/stack';
import apiClient from '../../api/apiClient';
import { Timesheet } from '../../types';
import { useAuth } from '../../context/AuthContext';
import { ForemanStackParamList } from '../../navigation/AppNavigator';
import { useRoute,RouteProp  } from "@react-navigation/native";

type ListNavigationProp = StackNavigationProp<ForemanStackParamList, 'TimesheetList'>;

// Adapted Theme and Colors from ForemanDashboard
const THEME = {
    colors: {
        primary: '#4A5C4D', // Primary action color (dark green)
        backgroundLight: '#F8F7F2', // Light background
        contentLight: '#3D3D3D', // Primary text content
        subtleLight: '#797979', // Secondary text content
        cardLight: '#FFFFFF', // Card/container background
        brandStone: '#8E8E8E', // Subtle brand color
        danger: '#e74c3c',      // Rejected/Error
        pending: '#f39c12',     // Pending/Draft
        submitted: '#3498db',   // Submitted
        approved: '#2ecc71',    // Approved/Success
        border: '#F0F0F0',
    },
    fontFamily: { display: 'System' }, // Using System as a fallback for Manrope
    borderRadius: { lg: 16, xl: 24, full: 9999 },
};


const TimesheetListScreen = () => {
    const [timesheets, setTimesheets] = useState<Timesheet[]>([]);
    const [loading, setLoading] = useState(true);
    const navigation = useNavigation<ListNavigationProp>();
    const isFocused = useIsFocused();
    const { user } = useAuth();
const route = useRoute<TimesheetListRouteProps>();
type TimesheetListRouteProps = RouteProp<
  { TimesheetList: { refresh?: boolean } },
  "TimesheetList"
>;


// /src/screens/foreman/TimesheetListScreen.tsx

const fetchTimesheets = async () => {
    if (!user) {
        setLoading(false);
        return;
    }

    setLoading(true);
    try {
        const response = await apiClient.get<Timesheet[]>(`/api/timesheets/by-foreman/${user.id}`);

        const visibleTimesheets = response.data.filter(
            (ts) => ts.status?.toLowerCase() === 'draft' || ts.status?.toLowerCase() === 'pending'
        );

        setTimesheets(visibleTimesheets);
    } catch (error: any) {
        console.error('❌ Failed to fetch timesheets:', error.message || error);
        window.alert('Unable to load timesheets. Please try again.');
    } finally {
        setLoading(false);
    }
};



useEffect(() => {
  if (isFocused && user) {
    fetchTimesheets();
  }
}, [isFocused, user, route?.params?.refresh]);


    const getStatusStyle = (status: string) => {
        switch (status.toLowerCase()) {
            case 'approved':
                return { badge: { backgroundColor: THEME.colors.approved }, text: { color: THEME.colors.cardLight } };
            case 'submitted':
                return { badge: { backgroundColor: THEME.colors.submitted }, text: { color: THEME.colors.cardLight } };
            case 'rejected':
                return { badge: { backgroundColor: THEME.colors.danger }, text: { color: THEME.colors.cardLight } };
            case 'draft':
            default:
                return { badge: { backgroundColor: THEME.colors.pending }, text: { color: THEME.colors.contentLight } };
        }
    };

    if (loading && timesheets.length === 0) {
        return <ActivityIndicator size="large" color={THEME.colors.primary} style={styles.loadingIndicator} />;
    }

    const renderItem = ({ item }: { item: Timesheet }) => {
        // Fallback status if not present in your Timesheet type, assuming 'Draft' if no status is available.
        const status = item.status || 'Draft';
        const { badge, text } = getStatusStyle(status);

        return (
            <TouchableOpacity 
                style={styles.card}
                onPress={() => navigation.navigate('TimesheetEdit', { timesheetId: item.id })}
                activeOpacity={0.8}
            >
                <View style={styles.cardHeader}>
                    <View style={{ flex: 1 }}>
                        {/* Assuming job_name is available in item.data */}
                        <Text style={styles.jobName} numberOfLines={1}>{item.data?.job_name || 'No Job Name'}</Text>
                        <Text style={styles.date}>Date: {new Date(item.date).toLocaleDateString()}</Text>
                    </View>
                    
                    <View style={[styles.statusBadge, badge]}>
                        <Text style={[styles.statusText, text]}>{status.toUpperCase()}</Text>
                    </View>
                </View>
            </TouchableOpacity>
        );
    };

    return (
        <SafeAreaView style={styles.safeArea}>
            {/* <View style={styles.header}>
                <Text style={styles.title}>Your Timesheets</Text>
            </View> */}
            <FlatList
                data={timesheets}
                renderItem={renderItem}
                keyExtractor={(item) => item.id.toString()}
                contentContainerStyle={styles.listContent}
                ListEmptyComponent={
                    <View style={styles.emptyContainer}>
                        <Text style={styles.emptyText}>You haven't created any timesheets yet.</Text>
                        <Text style={styles.emptySubText}>Use the 'Scan a Ticket' action on your dashboard to begin.</Text>
                    </View>
                }
                refreshControl={<RefreshControl refreshing={loading} onRefresh={fetchTimesheets} tintColor={THEME.colors.primary} />}
            />
        </SafeAreaView>
    );
};

const styles = StyleSheet.create({
    safeArea: { 
        flex: 1, 
        backgroundColor: THEME.colors.backgroundLight 
    },
    loadingIndicator: {
        flex: 1,
        backgroundColor: THEME.colors.backgroundLight,
    },
    // header: {
    //     paddingHorizontal: 24,
    //     paddingVertical: 16,
    //     backgroundColor: THEME.colors.cardLight,
    //     borderBottomWidth: 1,
    //     borderBottomColor: THEME.colors.border,
    // },
    title: { 
        fontFamily: THEME.fontFamily.display, 
        fontSize: 24, 
        fontWeight: 'bold', 
        color: THEME.colors.contentLight
    },
    listContent: { 
        paddingHorizontal: 16, 
        paddingTop: 16,
        paddingBottom: 30,
        flexGrow: 1, // Important for ListEmptyComponent centering
    },
    
    // Card Styles
    card: { 
        backgroundColor: THEME.colors.cardLight, 
        padding: 16, 
        borderRadius: THEME.borderRadius.lg, 
        marginBottom: 12, 
        shadowColor: "#000", 
        shadowOffset: { width: 0, height: 1 }, 
        shadowOpacity: 0.05, 
        shadowRadius: 4, 
        elevation: 2 
    },
    cardHeader: { 
        flexDirection: 'row', 
        justifyContent: 'space-between', 
        alignItems: 'center' 
    },
    jobName: { 
        fontFamily: THEME.fontFamily.display,
        fontSize: 16, 
        fontWeight: 'bold', 
        color: THEME.colors.contentLight
    },
    date: { 
        fontFamily: THEME.fontFamily.display,
        fontSize: 13, 
        color: THEME.colors.subtleLight, 
        marginTop: 4 
    },
    
    // Status Badge Styles
    statusBadge: { 
        paddingVertical: 4, 
        paddingHorizontal: 10, 
        borderRadius: THEME.borderRadius.lg,
        marginLeft: 10,
    },
    statusText: { 
        fontFamily: THEME.fontFamily.display,
        fontWeight: '600', 
        fontSize: 11,
    },
    // The previous status styles are replaced by the getStatusStyle function
    
    // Empty State Styles
    emptyContainer: { 
        flex: 1,
        justifyContent: 'center', 
        alignItems: 'center', 
        paddingTop: 80,
        paddingHorizontal: 20
    },
    emptyText: { 
        fontFamily: THEME.fontFamily.display,
        textAlign: 'center', 
        fontSize: 16,
        fontWeight: '600',
        color: THEME.colors.subtleLight
    },
    emptySubText: {
        fontFamily: THEME.fontFamily.display,
        textAlign: 'center', 
        fontSize: 14,
        marginTop: 8,
        color: THEME.colors.brandStone
    },
});

export default TimesheetListScreen;