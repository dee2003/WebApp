


// import React, { useEffect, useState } from 'react';
// import {
//   View,
//   Text,
//   FlatList,
//   StyleSheet,
//   ActivityIndicator,
//   SafeAreaView,
//   TouchableOpacity,
//   Alert,
// } from 'react-native';
// import { RouteProp, useRoute, useNavigation } from '@react-navigation/native';
// import apiClient from '../../api/apiClient';
// import type { SupervisorStackParamList } from '../../navigation/AppNavigator';
// import Icon from 'react-native-vector-icons/Ionicons';
// import { StackNavigationProp } from '@react-navigation/stack';
// // Define the shape of a single Timesheet object for this list
// type TimesheetSummary = {
//   id: number;
//   timesheet_name: string; // e.g., "Job Name - Date"
//   job_name: string;
// };
// // Define the route and navigation prop types
// type TimesheetListRouteProp = RouteProp<SupervisorStackParamList, 'SupervisorTimesheetList'>;
// type NavigationProp = StackNavigationProp<SupervisorStackParamList, 'SupervisorTimesheetList'>;
// const COLORS = {
//   primary: '#007AFF',
//   background: '#F2F2F7',
//   card: '#FFFFFF',
//   textPrimary: '#1C1C1E',
//   textSecondary: '#636366',
//   border: '#E5E5EA',
// };
// const SupervisorTimesheetListScreen = () => {
//   const route = useRoute<TimesheetListRouteProp>();
//   const navigation = useNavigation<NavigationProp>();
//   const { foremanId, date, foremanName } = route.params;
//   const [timesheets, setTimesheets] = useState<TimesheetSummary[]>([]);
//   const [loading, setLoading] = useState(true);
//   useEffect(() => {
//     const fetchTimesheets = async () => {
//       setLoading(true);
//       try {
//         const response = await apiClient.get<TimesheetSummary[]>(
//           `/api/timesheets/for-supervisor?foreman_id=${foremanId}&date=${date}`
//         );
//         setTimesheets(response.data);
//       } catch (error: any) {
//         console.error('Failed to fetch timesheets:', error);
//         Alert.alert('Error', 'Could not load timesheets for this foreman.');
//       } finally {
//         setLoading(false);
//       }
//     };
//     fetchTimesheets();
//   }, [foremanId, date]);
//   const handleSelectTimesheet = (timesheetId: number) => {
//     // Navigate to the review screen for the selected timesheet
//     navigation.navigate('TimesheetReview', { timesheetId });
//   };
//   const renderTimesheetItem = ({ item }: { item: TimesheetSummary }) => (
//     <TouchableOpacity style={styles.card} onPress={() => handleSelectTimesheet(item.id)}>
//       <View style={styles.cardContent}>
// <Text style={styles.highlightedTimesheetName}>{item.timesheet_name}</Text>
//       </View>
//       <Icon name="chevron-forward-outline" size={22} color={COLORS.textSecondary} />
//     </TouchableOpacity>
//   );
//   if (loading) {
//     return (
//       <View style={styles.centered}>
//         <ActivityIndicator size="large" color={COLORS.primary} />
//       </View>
//     );
//   }
//   return (
//     <SafeAreaView style={styles.container}>
//       <FlatList
//         data={timesheets}
//         renderItem={renderTimesheetItem}
//         keyExtractor={(item) => item.id.toString()}
//         contentContainerStyle={styles.listContainer}

//         ListEmptyComponent={
//           <View style={styles.emptyContainer}>
//             <Icon name="document-text-outline" size={60} color={COLORS.border} />
//             <Text style={styles.emptyText}>No timesheets found for this date.</Text>
//           </View>
//         }
//       />
//     </SafeAreaView>
//   );
// };
// const styles = StyleSheet.create({
//   container: { flex: 1, backgroundColor: COLORS.background },
//   centered: { flex: 1, justifyContent: 'center', alignItems: 'center' },
//   listContainer: { padding: 16 },
//   headerText: {
//     fontSize: 22,
//     fontWeight: 'bold',
//     color: COLORS.textPrimary,
//     marginBottom: 16,
//     paddingHorizontal: 8,
//   },
//   card: {
//     backgroundColor: COLORS.card,
//     borderRadius: 12,
//     padding: 16,
//     marginBottom: 12,
//     flexDirection: 'row',
//     alignItems: 'center',
//     justifyContent: 'space-between',
//   },
//   cardContent: { flex: 1 },
//   cardTitle: { fontSize: 17, fontWeight: '600', color: COLORS.textPrimary },
//   cardSubtitle: { fontSize: 15, color: COLORS.textSecondary, marginTop: 4 },
//   emptyContainer: { alignItems: 'center', marginTop: 80 },
//   emptyText: { fontSize: 16, color: COLORS.textSecondary, marginTop: 12 },
//   highlightedTimesheetName: {
//   fontSize: 18,           // larger font size to attract attention
//   fontWeight: '700',      // bolder text
//   color: '#0b0b0bff',       // a bright color like orange-red for emphasis
//   marginBottom: 4,
// },
// });
// export default SupervisorTimesheetListScreen;



import React, { useEffect, useState } from 'react';
import {
    View,
    Text,
    FlatList,
    StyleSheet,
    ActivityIndicator,
    SafeAreaView,
    TouchableOpacity,
    Alert,
    RefreshControl, // Added for better UX
} from 'react-native';
import { RouteProp, useRoute, useNavigation } from '@react-navigation/native';
import apiClient from '../../api/apiClient';
import type { SupervisorStackParamList } from '../../navigation/AppNavigator';
import Icon from 'react-native-vector-icons/Ionicons';
import { StackNavigationProp } from '@react-navigation/stack';

// Define the shape of a single Timesheet object for this list
type TimesheetSummary = {
    id: number;
    timesheet_name: string; // e.g., "Job Name - Date"
    job_name: string;
};

// Define the route and navigation prop types
type TimesheetListRouteProp = RouteProp<SupervisorStackParamList, 'SupervisorTimesheetList'>;
type NavigationProp = StackNavigationProp<SupervisorStackParamList, 'SupervisorTimesheetList'>;

// Adapted Theme and Colors from Supervisor/PE Dashboard
const THEME = {
    colors: {
        primary: '#4A5C4D', // Primary action color (dark green)
        backgroundLight: '#F8F7F2', // Light background
        contentLight: '#3D3D3D', // Primary text content
        subtleLight: '#797979', // Secondary text content
        cardLight: '#FFFFFF', // Card/container background
        brandStone: '#8E8E8E', // Subtle brand color
        border: '#E5E5E5', // Light border
    },
    fontFamily: { display: 'System' },
    borderRadius: { lg: 12, sm: 8 },
};

const SupervisorTimesheetListScreen = () => {
    const route = useRoute<TimesheetListRouteProp>();
    const navigation = useNavigation<NavigationProp>();
    const { foremanId, date, foremanName } = route.params;

    const [timesheets, setTimesheets] = useState<TimesheetSummary[]>([]);
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);

    // Set dynamic header title
    useEffect(() => {
        navigation.setOptions({
            title: `${foremanName}'s Timesheets`,
        });
    }, [foremanName, navigation]);


    const fetchTimesheets = async () => {
        const fetchStateSetter = refreshing ? setRefreshing : setLoading;
        fetchStateSetter(true);
        try {
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
    };

    useEffect(() => {
        fetchTimesheets();
    }, [foremanId, date]);

    const handleRefresh = () => {
        fetchTimesheets();
    };


    const handleSelectTimesheet = (timesheetId: number) => {
        // Navigate to the review screen for the selected timesheet
        navigation.navigate('TimesheetReview', { timesheetId });
    };

    const renderTimesheetItem = ({ item }: { item: TimesheetSummary }) => (
        <TouchableOpacity 
            style={styles.card} 
            onPress={() => handleSelectTimesheet(item.id)}
            activeOpacity={0.7}
        >
            <View style={styles.cardContent}>
                <Text style={styles.cardTitle} numberOfLines={1}>{item.timesheet_name}</Text>
                {/* <Text style={styles.cardSubtitle} numberOfLines={1}>Job: {item.job_name || 'N/A'}</Text> */}
            </View>
            <Icon name="chevron-forward-outline" size={24} color={THEME.colors.subtleLight} />
        </TouchableOpacity>
    );

    const ListHeaderComponent = (
        <View style={styles.listHeader}>
            <Text style={styles.headerSubtitle}>
                Reviewing timesheets for: 
                <Text style={styles.headerInfo}> {new Date(date + 'T00:00:00').toLocaleDateString()}</Text>
            </Text>
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
        // The background is usually inherited from the container, but explicit for separation
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
    cardSubtitle: { 
        fontFamily: THEME.fontFamily.display,
        fontSize: 14, 
        color: THEME.colors.subtleLight, 
        marginTop: 4 
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