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
} from 'react-native';
import { RouteProp, useRoute, useNavigation } from '@react-navigation/native';
import apiClient from '../../api/apiClient';
import type { ProjectEngineerStackParamList } from '../../navigation/AppNavigator';
import Icon from 'react-native-vector-icons/Ionicons';
import { StackNavigationProp } from '@react-navigation/stack';

// Type for each timesheet
type TimesheetSummary = {
    id: number;
    timesheet_name: string;
    job_name: string;
};

// Route and navigation types
type TimesheetListRouteProp = RouteProp<ProjectEngineerStackParamList, 'PETimesheetList'>;
type NavigationProp = StackNavigationProp<ProjectEngineerStackParamList, 'PETimesheetList'>;

// Adapted Theme and Colors from PE Dashboard
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

const PETimesheetListScreen = () => {
    const route = useRoute<TimesheetListRouteProp>();
    const navigation = useNavigation<NavigationProp>();
    const { foremanId, date, supervisorName } = route.params;

    const [timesheets, setTimesheets] = useState<TimesheetSummary[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        // Set the title dynamically using navigation options
        navigation.setOptions({
            title: `${supervisorName}'s Timesheets`,
            // Optional: You could also add a subtitle here if your navigation allows it
            // headerSubtitle: `Date: ${new Date(date).toLocaleDateString()}`, 
        });

        const fetchTimesheets = async () => {
            setLoading(true);
            try {
                const response = await apiClient.get<TimesheetSummary[]>(
                    `/api/review/pe/timesheets?foreman_id=${foremanId}&date=${date}`
                );
                setTimesheets(response.data);
            } catch (error: any) {
                console.error('Failed to fetch PE timesheets:', error);
                Alert.alert('Error', 'Could not load timesheets for this foreman.');
            } finally {
                setLoading(false);
            }
        };

        fetchTimesheets();
    }, [foremanId, date, navigation, supervisorName]); // Added navigation and supervisorName to dependencies

    const handleSelectTimesheet = (timesheetId: number) => {
        // Assuming 'TimesheetReview' is the next screen to view the details
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

    if (loading) {
        return (
            <View style={styles.centered}>
                <ActivityIndicator size="large" color={THEME.colors.primary} />
            </View>
        );
    }

    // List header to display the date and foreman name
    const ListHeaderComponent = (
        <View style={styles.listHeader}>
            <Text style={styles.listHeaderDate}>
                Reviewing timesheets for: 
                <Text style={{fontWeight: '700', color: THEME.colors.contentLight}}> {new Date(date + 'T00:00:00').toLocaleDateString()}</Text>
            </Text>
        </View>
    );

    return (
        <SafeAreaView style={styles.container}>
            <FlatList
                data={timesheets}
                renderItem={renderTimesheetItem}
                keyExtractor={(item) => item.id.toString()}
                contentContainerStyle={styles.listContainer}
                ListHeaderComponent={ListHeaderComponent}
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
    listHeaderDate: {
        fontFamily: THEME.fontFamily.display,
        fontSize: 15,
        color: THEME.colors.subtleLight,
        fontWeight: '500',
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
        color: THEME.colors.contentLight 
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

export default PETimesheetListScreen;