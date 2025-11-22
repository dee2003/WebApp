// /src/screens/foreman/TimesheetListScreen.tsx

import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  ActivityIndicator,
  RefreshControl,
  SafeAreaView,
} from 'react-native';
import { useNavigation, useIsFocused } from '@react-navigation/native';
import { StackNavigationProp } from '@react-navigation/stack';
import apiClient from '../../api/apiClient';
import { Timesheet } from '../../types';
import { useAuth } from '../../context/AuthContext';
import { ForemanStackParamList } from '../../navigation/AppNavigator';

type ListNavigationProp = StackNavigationProp<ForemanStackParamList, 'TimesheetList'>;

const THEME = {
  colors: {
    primary: '#4A5C4D',
    contentLight: '#3D3D3D',
    cardLight: '#FFFFFF',
    pending: '#f39c12',
    approved: '#2ecc71',
    submitted: '#3498db',
    danger: '#e74c3c',
    border: '#F0F0F0',
  },
  borderRadius: { lg: 16, xl: 24, full: 9999 },
};

const TimesheetListScreen = () => {
  const [timesheets, setTimesheets] = useState<Timesheet[]>([]);
  const [loading, setLoading] = useState(true);
  const navigation = useNavigation<ListNavigationProp>();
  const isFocused = useIsFocused();
  const { user } = useAuth();

  // Fetch timesheets
  const fetchTimesheets = async () => {
    if (!user?.id) {
      console.warn("User ID is undefined, skipping fetchTimesheets");
      setLoading(false);
      return;
    }

    console.log("Fetching timesheets for user.id:", user.id);

    setLoading(true);
    try {
      const response = await apiClient.get<Timesheet[]>(
        `/api/timesheets/by-foreman/${user.id}`
      );

      console.log("Timesheets from API:", response.data);

      // Filter draft/pending (remove filter to see all statuses)
      const visibleTimesheets = response.data.filter(
        (ts) =>
          ts.status?.toLowerCase() === 'draft' ||
          ts.status?.toLowerCase() === 'pending'
      );

      console.log("Filtered visible timesheets:", visibleTimesheets);

      setTimesheets(visibleTimesheets);
    } catch (error: any) {
      console.error('❌ Failed to fetch timesheets:', error.message || error);
    } finally {
      setLoading(false);
    }
  };

  // Run fetch when screen is focused and user is loaded
  useEffect(() => {
    if (isFocused && user?.id) {
      fetchTimesheets();
    }
  }, [isFocused, user]);

  if (!user?.id) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
        <ActivityIndicator size="large" color={THEME.colors.primary} />
        <Text>Loading user info...</Text>
      </View>
    );
  }

  if (loading && timesheets.length === 0) {
    return (
      <ActivityIndicator
        size="large"
        color={THEME.colors.primary}
        style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}
      />
    );
  }

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

  const renderItem = ({ item }: { item: Timesheet }) => {
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
            <Text style={styles.jobName} numberOfLines={1}>
              {item.data?.job_name || 'No Job Name'}
            </Text>
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
      <FlatList
        data={timesheets}
        renderItem={renderItem}
        keyExtractor={(item) => item.id.toString()}
        contentContainerStyle={styles.listContent}
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <Text style={styles.emptyText}>You haven't created any timesheets yet.</Text>
            <Text style={styles.emptySubText}>
              Use the 'Scan a Ticket' action on your dashboard to begin.
            </Text>
          </View>
        }
        refreshControl={<RefreshControl refreshing={loading} onRefresh={fetchTimesheets} tintColor={THEME.colors.primary} />}
      />
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: '#F8F7F2' },
  listContent: { padding: 16 },
  card: { backgroundColor: '#fff', padding: 16, borderRadius: 12, marginBottom: 12, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  cardHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', flex: 1 },
  jobName: { fontSize: 16, fontWeight: '600', color: '#3D3D3D' },
  date: { fontSize: 12, color: '#797979' },
  statusBadge: { paddingHorizontal: 8, paddingVertical: 4, borderRadius: 12 },
  statusText: { fontSize: 12, fontWeight: '600' },
  emptyContainer: { flex: 1, justifyContent: 'center', alignItems: 'center', marginTop: 50 },
  emptyText: { fontSize: 16, fontWeight: '600', color: '#3D3D3D', marginBottom: 8 },
  emptySubText: { fontSize: 14, color: '#797979' },
});

export default TimesheetListScreen;
