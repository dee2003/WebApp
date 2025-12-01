// import React, { useEffect, useState, useCallback } from 'react';
// import {
//     View,
//     Text,
//     FlatList,
//     StyleSheet,
//     ActivityIndicator,
//     SafeAreaView,
//     TouchableOpacity,
//     Alert,
//     RefreshControl,
// } from 'react-native';
// import { RouteProp, useRoute, useNavigation } from '@react-navigation/native';
// import { StackNavigationProp } from '@react-navigation/stack';
// import apiClient from '../../api/apiClient'; // Assuming this is your API client
// import { useAuth } from '../../context/AuthContext'; // Assuming you get user/supervisor ID here
// import Icon from 'react-native-vector-icons/Ionicons';
// import type { SupervisorStackParamList } from '../../navigation/AppNavigator'; // Assuming this is correct

// // Define the shape of a single Timesheet object for this list
// type TimesheetSummary = {
//     id: number;
//     timesheet_name: string;
//     job_name: string;
//     // UPDATED STATUS: Added REVIEWED_BY_SUPERVISOR for the interim state
//     status: 'SUBMITTED' | 'REVIEWED_BY_SUPERVISOR' | 'APPROVED_BY_SUPERVISOR' | string; 
// };

// // Define the route and navigation prop types
// type TimesheetListRouteProp = RouteProp<SupervisorStackParamList, 'SupervisorTimesheetList'>;
// type NavigationProp = StackNavigationProp<SupervisorStackParamList, 'SupervisorTimesheetList'>;

// // Adapted Theme and Colors
// const THEME = {
//     colors: {
//         primary: '#4A5C4D', // Primary action color (dark green)
//         backgroundLight: '#F8F7F2', // Light background
//         contentLight: '#3D3D3D', // Primary text content
//         subtleLight: '#797979', // Secondary text content
//         cardLight: '#FFFFFF', // Card/container background
//         brandStone: '#8E8E8E', // Subtle brand color
//         border: '#E5E5E5', // Light border
//         warning: '#FF9500', // Warning/Pending color
//         success: '#34C759', // Success/Approved color
//         review: '#007AFF', // Blue color for Reviewed status
//     },
//     fontFamily: { display: 'System' },
//     borderRadius: { lg: 12, sm: 8 },
// };

// const SupervisorTimesheetListScreen = () => {
//     const route = useRoute<TimesheetListRouteProp>();
//     const navigation = useNavigation<NavigationProp>();
//     const { user } = useAuth(); // Assume useAuth provides the supervisor's ID

//     const { foremanId, date, foremanName } = route.params;

//     const [timesheets, setTimesheets] = useState<TimesheetSummary[]>([]);
//     const [loading, setLoading] = useState(true);
//     const [refreshing, setRefreshing] = useState(false);
//     // Renamed state internally to reflect 'Reviewing' instead of 'Approving'
//     const [isReviewing, setIsReviewing] = useState(false); 

//     // Set dynamic header title
//     useEffect(() => {
//         navigation.setOptions({
//             title: `${foremanName}'s Timesheets`,
//         });
//     }, [foremanName, navigation]);

//     // --- Data Fetching Logic ---
//     const fetchTimesheets = useCallback(async () => {
//         const fetchStateSetter = refreshing ? setRefreshing : setLoading;
//         fetchStateSetter(true);
//         try {
//             // Ensure the backend endpoint returns the correct status (SUBMITTED, REVIEWED_BY_SUPERVISOR, or APPROVED_BY_SUPERVISOR)
//             const response = await apiClient.get<TimesheetSummary[]>(
//                 `/api/timesheets/for-supervisor?foreman_id=${foremanId}&date=${date}`
//             );
//             setTimesheets(response.data); 
//         } catch (error: any) {
//             console.error('Failed to fetch timesheets:', error);
//             Alert.alert('Error', 'Could not load timesheets for this foreman.');
//         } finally {
//             fetchStateSetter(false);
//         }
//     }, [foremanId, date, refreshing]);

//     useEffect(() => {
//         fetchTimesheets();
//     }, [fetchTimesheets]);

//     const handleRefresh = () => {
//         if (loading || isReviewing) return;
//         setRefreshing(true);
//         fetchTimesheets();
//     };


//     // --- MODIFIED: Bulk Review Logic (Marks Timesheets as Reviewed) ---
//     const handleReviewAll = async () => {
//         if (isReviewing || !user?.id) return;

//         // Filter for timesheets that still need review (status === 'SUBMITTED')
//         const pendingTimesheets = timesheets.filter(ts => ts.status === 'SUBMITTED');
        
//         if (pendingTimesheets.length === 0) {
//             Alert.alert("Complete", "All timesheets for this foreman/date are already reviewed or approved.");
//             return;
//         }

//         Alert.alert(
//             "Confirm Review",
//             `Mark ${pendingTimesheets.length} pending timesheet(s) as REVIEWED by you? (You must click 'Submit All' on the previous screen to complete the process.)`,
//             [
//                 { text: "Cancel", style: "cancel" },
//                 {
//                     text: "Mark as Reviewed", // Changed button text
//                     onPress: async () => {
//                         setIsReviewing(true);
//                         try {
//                             // NOTE: Assumes a new backend endpoint to update status to 'REVIEWED_BY_SUPERVISOR'
//                             await apiClient.post(`/api/review/mark-timesheets-reviewed-bulk`, {
//                                 foreman_id: foremanId,
//                                 date: date,
//                                 supervisor_id: user.id,
//                             });

//                             Alert.alert("Success", `${pendingTimesheets.length} timesheet(s) marked as reviewed!`);
//                             // Refresh the list immediately to reflect new statuses
//                             await fetchTimesheets(); 
                            
//                         } catch (error: any) {
//                             console.error('Bulk review failed:', error.response?.data?.detail || error);
//                             Alert.alert('Error', error.response?.data?.detail || 'Failed to mark timesheets as reviewed.');
//                         } finally {
//                             setIsReviewing(false);
//                         }
//                     }
//                 }
//             ]
//         );
//     };


//     const handleSelectTimesheet = (timesheetId: number) => {
//         // Navigate to the review screen for the selected timesheet
//         navigation.navigate('TimesheetReview', { timesheetId });
//     };

//     // --- UI Rendering ---
//     const renderTimesheetItem = ({ item }: { item: TimesheetSummary }) => {
        
//         const isSubmitted = item.status === 'SUBMITTED';
//         const isReviewed = item.status === 'REVIEWED_BY_SUPERVISOR';
//         const isApproved = item.status === 'APPROVED_BY_SUPERVISOR';

//         let statusText;
//         let statusColor;
//         let iconName;

//         if (isApproved) {
//             statusText = 'Approved (Final)';
//             statusColor = THEME.colors.success;
//             iconName = "checkmark-done-circle";
//         } else if (isReviewed) {
//             statusText = 'Reviewed by You';
//             statusColor = THEME.colors.review; // Using a distinct color for reviewed
//             iconName = "eye";
//         } else {
//             statusText = 'Pending Review';
//             statusColor = THEME.colors.warning;
//             iconName = "alert-circle-outline";
//         }
        
//         return (
//             <TouchableOpacity 
//                 style={styles.card} 
//                 onPress={() => handleSelectTimesheet(item.id)}
//                 activeOpacity={0.7}
//             >
//                 <View style={styles.cardContent}>
//                     <Text style={styles.cardTitle} numberOfLines={1}>{item.timesheet_name}</Text>
//                     <Text style={[styles.statusText, { color: statusColor }]}>
//                         <Icon 
//                             name={iconName} 
//                             size={14} 
//                             color={statusColor} 
//                         />
//                         {' '} Status: {statusText}
//                     </Text>
//                 </View>
//                 <Icon name="chevron-forward-outline" size={24} color={THEME.colors.subtleLight} />
//             </TouchableOpacity>
//         );
//     };

//     const ListHeaderComponent = (
//         <View style={styles.listHeader}>
//             <Text style={styles.headerSubtitle}>
//                 Reviewing timesheets for: 
//                 <Text style={styles.headerInfo}> {new Date(date + 'T00:00:00').toLocaleDateString()}</Text>
//             </Text>
            
//             {/* MODIFIED: Review All Button */}
//             <TouchableOpacity
//                 style={[styles.approveButton, isReviewing && { opacity: 0.7 }]}
//                 onPress={handleReviewAll}
//                 disabled={isReviewing}
//             >
//                 {isReviewing ? (
//                     <ActivityIndicator color={THEME.colors.cardLight} size="small" />
//                 ) : (
//                     <Text style={styles.approveButtonText}>
//                         <Icon name="eye-outline" size={16} color={THEME.colors.cardLight} />
//                         {' '} Mark All Pending as Reviewed
//                     </Text>
//                 )}
//             </TouchableOpacity>
//         </View>
//     );

//     if (loading && !refreshing) {
//         return (
//             <View style={styles.centered}>
//                 <ActivityIndicator size="large" color={THEME.colors.primary} />
//             </View>
//         );
//     }

//     return (
//         <SafeAreaView style={styles.container}>
//             <FlatList
//                 data={timesheets}
//                 renderItem={renderTimesheetItem}
//                 keyExtractor={(item) => item.id.toString()}
//                 contentContainerStyle={styles.listContainer}
//                 ListHeaderComponent={ListHeaderComponent}
//                 refreshControl={
//                     <RefreshControl
//                         refreshing={refreshing}
//                         onRefresh={handleRefresh}
//                         tintColor={THEME.colors.primary}
//                     />
//                 }
//                 ListEmptyComponent={
//                     <View style={styles.emptyContainer}>
//                         <Icon name="document-text-outline" size={60} color={THEME.colors.brandStone} />
//                         <Text style={styles.emptyText}>No timesheets found for this date.</Text>
//                         <Text style={styles.emptySubText}>The foreman has not submitted any timesheets yet.</Text>
//                     </View>
//                 }
//             />
//         </SafeAreaView>
//     );
// };

// const styles = StyleSheet.create({
//     container: { 
//         flex: 1, 
//         backgroundColor: THEME.colors.backgroundLight 
//     },
//     centered: { 
//         flex: 1, 
//         justifyContent: 'center', 
//         alignItems: 'center',
//         backgroundColor: THEME.colors.backgroundLight
//     },
//     listContainer: { 
//         paddingHorizontal: 16, 
//         paddingBottom: 20
//     },

//     // List Header
//     listHeader: {
//         paddingVertical: 12,
//         marginBottom: 8,
//     },
//     headerSubtitle: {
//         fontFamily: THEME.fontFamily.display,
//         fontSize: 15,
//         color: THEME.colors.subtleLight,
//         fontWeight: '500',
//     },
//     headerInfo: {
//         fontWeight: '700',
//         color: THEME.colors.contentLight,
//     },

//     // Approve All Button (Now Review All Button)
//     approveButton: {
//         backgroundColor: THEME.colors.primary,
//         borderRadius: THEME.borderRadius.sm,
//         paddingVertical: 10,
//         marginTop: 15,
//         alignItems: 'center',
//         justifyContent: 'center',
//         flexDirection: 'row',
//     },
//     approveButtonText: {
//         fontFamily: THEME.fontFamily.display,
//         color: THEME.colors.cardLight,
//         fontWeight: '700',
//         fontSize: 16,
//     },

//     // Card Styles
//     card: {
//         backgroundColor: THEME.colors.cardLight,
//         borderRadius: THEME.borderRadius.lg,
//         padding: 16,
//         marginBottom: 10,
//         flexDirection: 'row',
//         alignItems: 'center',
//         justifyContent: 'space-between',
//         shadowColor: '#000',
//         shadowOffset: { width: 0, height: 1 },
//         shadowOpacity: 0.05,
//         shadowRadius: 4,
//         elevation: 2,
//     },
//     cardContent: { 
//         flex: 1,
//         marginRight: 10 
//     },
//     cardTitle: { 
//         fontFamily: THEME.fontFamily.display,
//         fontSize: 17, 
//         fontWeight: '700', 
//         color: THEME.colors.contentLight,
//     },
//     statusText: {
//         fontFamily: THEME.fontFamily.display,
//         fontSize: 13,
//         marginTop: 4,
//         fontWeight: '600',
//     },

//     // Empty State
//     emptyContainer: { 
//         alignItems: 'center', 
//         marginTop: 80 
//     },
//     emptyText: { 
//         fontFamily: THEME.fontFamily.display,
//         fontSize: 18, 
//         fontWeight: '600', 
//         color: THEME.colors.subtleLight, 
//         marginTop: 12 
//     },
//     emptySubText: {
//         fontFamily: THEME.fontFamily.display,
//         fontSize: 14, 
//         color: THEME.colors.brandStone, 
//         marginTop: 8 
//     }
// });

// export default SupervisorTimesheetListScreen;


import React, { useEffect, useState, useCallback } from 'react';
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
import { RouteProp, useRoute, useNavigation } from '@react-navigation/native';
import { StackNavigationProp } from '@react-navigation/stack';
import apiClient from '../../api/apiClient'; // Assuming this is your API client
import { useAuth } from '../../context/AuthContext'; // Assuming you get user/supervisor ID here
import Icon from 'react-native-vector-icons/Ionicons';
import type { SupervisorStackParamList } from '../../navigation/AppNavigator'; // Assuming this is correct

// Define the shape of a single Timesheet object for this list
type TimesheetSummary = {
    id: number;
    timesheet_name: string;
    job_name: string;
    // UPDATED STATUS: Added REVIEWED_BY_SUPERVISOR for the interim state
    status: 'SUBMITTED' | 'REVIEWED_BY_SUPERVISOR' | 'APPROVED_BY_SUPERVISOR' | string; 
};

// Define the route and navigation prop types
type TimesheetListRouteProp = RouteProp<SupervisorStackParamList, 'SupervisorTimesheetList'>;
type NavigationProp = StackNavigationProp<SupervisorStackParamList, 'SupervisorTimesheetList'>;

// Adapted Theme and Colors
const THEME = {
    colors: {
        primary: '#4A5C4D', // Primary action color (dark green)
        backgroundLight: '#F8F7F2', // Light background
        contentLight: '#3D3D3D', // Primary text content
        subtleLight: '#797979', // Secondary text content
        cardLight: '#FFFFFF', // Card/container background
        brandStone: '#8E8E8E', // Subtle brand color
        border: '#E5E5E5', // Light border
        warning: '#FF9500', // Warning/Pending color
        success: '#34C759', // Success/Approved color
        review: '#007AFF', // Blue color for Reviewed status
    },
    fontFamily: { display: 'System' },
    borderRadius: { lg: 12, sm: 8 },
};

const SupervisorTimesheetListScreen = () => {
    const route = useRoute<TimesheetListRouteProp>();
    const navigation = useNavigation<NavigationProp>();
    const { user } = useAuth(); // Assume useAuth provides the supervisor's ID

    const { foremanId, date, foremanName } = route.params;

    const [timesheets, setTimesheets] = useState<TimesheetSummary[]>([]);
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);
    // Renamed state internally to reflect 'Reviewing' instead of 'Approving'
    const [isReviewing, setIsReviewing] = useState(false); 

    // Set dynamic header title
    useEffect(() => {
        navigation.setOptions({
            title: `${foremanName}'s Timesheets`,
        });
    }, [foremanName, navigation]);

    // --- Data Fetching Logic ---
    const fetchTimesheets = useCallback(async () => {
        const fetchStateSetter = refreshing ? setRefreshing : setLoading;
        fetchStateSetter(true);
        try {
            // Ensure the backend endpoint returns the correct status (SUBMITTED, REVIEWED_BY_SUPERVISOR, or APPROVED_BY_SUPERVISOR)
            const response = await apiClient.get<TimesheetSummary[]>(
                `/api/timesheets/for-supervisor?foreman_id=${foremanId}&date=${date}`
            );
            setTimesheets(response.data); 
        } catch (error: any) {
            console.error('Failed to fetch timesheets:', error);
            Alert.alert('Error', 'Could not load timesheets for this foreman.');
        } finally {
            fetchStateSetter(false);
        }
    }, [foremanId, date, refreshing]);

    useEffect(() => {
        fetchTimesheets();
    }, [fetchTimesheets]);

    const handleRefresh = () => {
        if (loading || isReviewing) return;
        setRefreshing(true);
        fetchTimesheets();
    };


    // --- MODIFIED: Bulk Review Logic (Marks Timesheets as Reviewed) ---
    const handleReviewAll = async () => {
        if (isReviewing || !user?.id) return;

        // Filter for timesheets that still need review (status === 'SUBMITTED')
        const pendingTimesheets = timesheets.filter(ts => ts.status === 'SUBMITTED');
        
        if (pendingTimesheets.length === 0) {
            Alert.alert("Complete", "All timesheets for this foreman/date are already reviewed or approved.");
            return;
        }

        Alert.alert(
            "Confirm Internal Review",
            // MODIFIED ALERT TEXT: Explicitly states this is NOT the final submission.
            `Mark ${pendingTimesheets.length} pending timesheet(s) as REVIEWED by you? This action updates the status internally but DOES NOT submit to the Project Engineer. Final submission requires the 'Submit All' button on the previous dashboard screen.`,
            [
                { text: "Cancel", style: "cancel" },
                {
                    text: "Mark as Reviewed", // Changed button text
                    onPress: async () => {
                        setIsReviewing(true);
                        try {
                            // NOTE: Assumes the backend endpoint only updates status to 'REVIEWED_BY_SUPERVISOR'
                            await apiClient.post(`/api/review/mark-timesheets-reviewed-bulk`, {
                                foreman_id: foremanId,
                                date: date,
                                supervisor_id: user.id,
                            });

                            // MODIFIED SUCCESS ALERT TEXT: Provides strong confirmation of the result and the next required step.
                            Alert.alert(
                                "Success: Review Marked", 
                                `${pendingTimesheets.length} timesheet(s) marked as reviewed by you. They have NOT been submitted to the Project Engineer yet. Use the 'Submit All' button on the previous dashboard screen for final submission.`
                            );
                            
                            // Refresh the list immediately to reflect new statuses
                            await fetchTimesheets(); 
                            
                        } catch (error: any) {
                            console.error('Bulk review failed:', error.response?.data?.detail || error);
                            Alert.alert('Error', error.response?.data?.detail || 'Failed to mark timesheets as reviewed.');
                        } finally {
                            setIsReviewing(false);
                        }
                    }
                }
            ]
        );
    };


    const handleSelectTimesheet = (timesheetId: number) => {
        // Navigate to the review screen for the selected timesheet
        navigation.navigate('TimesheetReview', { timesheetId });
    };

    // --- UI Rendering ---
    const renderTimesheetItem = ({ item }: { item: TimesheetSummary }) => {
        
        const isSubmitted = item.status === 'SUBMITTED';
        const isReviewed = item.status === 'REVIEWED_BY_SUPERVISOR';
        const isApproved = item.status === 'APPROVED_BY_SUPERVISOR';

        let statusText;
        let statusColor;
        let iconName;

        if (isApproved) {
            statusText = 'Approved (Final)';
            statusColor = THEME.colors.success;
            iconName = "checkmark-done-circle";
        } else if (isReviewed) {
            statusText = 'Reviewed by You';
            statusColor = THEME.colors.review; // Using a distinct color for reviewed
            iconName = "eye";
        } else {
            statusText = 'Pending Review';
            statusColor = THEME.colors.warning;
            iconName = "alert-circle-outline";
        }
        
        return (
            <TouchableOpacity 
                style={styles.card} 
                onPress={() => handleSelectTimesheet(item.id)}
                activeOpacity={0.7}
            >
                <View style={styles.cardContent}>
                    <Text style={styles.cardTitle} numberOfLines={1}>{item.timesheet_name}</Text>
                    <Text style={[styles.statusText, { color: statusColor }]}>
                        <Icon 
                            name={iconName} 
                            size={14} 
                            color={statusColor} 
                        />
                        {' '} Status: {statusText}
                    </Text>
                </View>
                <Icon name="chevron-forward-outline" size={24} color={THEME.colors.subtleLight} />
            </TouchableOpacity>
        );
    };

    const ListHeaderComponent = (
        <View style={styles.listHeader}>
            <Text style={styles.headerSubtitle}>
                Reviewing timesheets for: 
                <Text style={styles.headerInfo}> {new Date(date + 'T00:00:00').toLocaleDateString()}</Text>
            </Text>
            
            {/* MODIFIED: Review All Button */}
            <TouchableOpacity
                style={[styles.approveButton, isReviewing && { opacity: 0.7 }]}
                onPress={handleReviewAll}
                disabled={isReviewing}
            >
                {isReviewing ? (
                    <ActivityIndicator color={THEME.colors.cardLight} size="small" />
                ) : (
                    <Text style={styles.approveButtonText}>
                        <Icon name="eye-outline" size={16} color={THEME.colors.cardLight} />
                        {' '} Mark All Pending as Reviewed
                    </Text>
                )}
            </TouchableOpacity>
        </View>
    );

    if (loading && !refreshing) {
        return (
            <View style={styles.centered}>
                <ActivityIndicator size="large" color={THEME.colors.primary} />
            </View>
        );
    }

    return (
        <SafeAreaView style={styles.container}>
            <FlatList
                data={timesheets}
                renderItem={renderTimesheetItem}
                keyExtractor={(item) => item.id.toString()}
                contentContainerStyle={styles.listContainer}
                ListHeaderComponent={ListHeaderComponent}
                refreshControl={
                    <RefreshControl
                        refreshing={refreshing}
                        onRefresh={handleRefresh}
                        tintColor={THEME.colors.primary}
                    />
                }
                ListEmptyComponent={
                    <View style={styles.emptyContainer}>
                        <Icon name="document-text-outline" size={60} color={THEME.colors.brandStone} />
                        <Text style={styles.emptyText}>No timesheets found for this date.</Text>
                        <Text style={styles.emptySubText}>The foreman has not submitted any timesheets yet.</Text>
                    </View>
                }
            />
        </SafeAreaView>
    );
};

const styles = StyleSheet.create({
    container: { 
        flex: 1, 
        backgroundColor: THEME.colors.backgroundLight 
    },
    centered: { 
        flex: 1, 
        justifyContent: 'center', 
        alignItems: 'center',
        backgroundColor: THEME.colors.backgroundLight
    },
    listContainer: { 
        paddingHorizontal: 16, 
        paddingBottom: 20
    },

    // List Header
    listHeader: {
        paddingVertical: 12,
        marginBottom: 8,
    },
    headerSubtitle: {
        fontFamily: THEME.fontFamily.display,
        fontSize: 15,
        color: THEME.colors.subtleLight,
        fontWeight: '500',
    },
    headerInfo: {
        fontWeight: '700',
        color: THEME.colors.contentLight,
    },

    // Approve All Button (Now Review All Button)
    approveButton: {
        backgroundColor: THEME.colors.primary,
        borderRadius: THEME.borderRadius.sm,
        paddingVertical: 10,
        marginTop: 15,
        alignItems: 'center',
        justifyContent: 'center',
        flexDirection: 'row',
    },
    approveButtonText: {
        fontFamily: THEME.fontFamily.display,
        color: THEME.colors.cardLight,
        fontWeight: '700',
        fontSize: 16,
    },

    // Card Styles
    card: {
        backgroundColor: THEME.colors.cardLight,
        borderRadius: THEME.borderRadius.lg,
        padding: 16,
        marginBottom: 10,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.05,
        shadowRadius: 4,
        elevation: 2,
    },
    cardContent: { 
        flex: 1,
        marginRight: 10 
    },
    cardTitle: { 
        fontFamily: THEME.fontFamily.display,
        fontSize: 17, 
        fontWeight: '700', 
        color: THEME.colors.contentLight,
    },
    statusText: {
        fontFamily: THEME.fontFamily.display,
        fontSize: 13,
        marginTop: 4,
        fontWeight: '600',
    },

    // Empty State
    emptyContainer: { 
        alignItems: 'center', 
        marginTop: 80 
    },
    emptyText: { 
        fontFamily: THEME.fontFamily.display,
        fontSize: 18, 
        fontWeight: '600', 
        color: THEME.colors.subtleLight, 
        marginTop: 12 
    },
    emptySubText: {
        fontFamily: THEME.fontFamily.display,
        fontSize: 14, 
        color: THEME.colors.brandStone, 
        marginTop: 8 
    }
});

export default SupervisorTimesheetListScreen;