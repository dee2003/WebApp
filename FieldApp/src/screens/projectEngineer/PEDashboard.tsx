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
} from 'react-native';
import { useNavigation, CommonActions, NavigationProp } from '@react-navigation/native';
import Ionicons from 'react-native-vector-icons/Ionicons';
import apiClient from '../../api/apiClient';
import { useAuth } from '../../context/AuthContext';
import type { ProjectEngineerStackParamList, RootStackParamList } from '../../navigation/AppNavigator';

type PENavigationProp = NavigationProp<ProjectEngineerStackParamList, 'PEDashboard'>;

interface ItemType {
  date: string;
  foreman_id: number;
  foreman_name: string;
  supervisor_name?: string;
  job_code?: string;
  timesheet_count: number;
  ticket_count: number;
}

interface SectionType {
  title: string;
  data: ItemType[];
}

const THEME_COLORS = {
  primary: '#4A5C4D',
  backgroundLight: '#F8F7F2',
  contentLight: '#3D3D3D',
  subtleLight: '#797979',
  cardLight: '#FFFFFF',
  brandStone: '#8E8E8E',
  danger: '#FF3B30',
  success: '#34C759',
  border: '#E5E5E5',
};

const THEME_FONTS = { display: 'System' };
const THEME_BORDERS = { lg: 16, xl: 24, full: 9999 };

const PEDashboard = () => {
  const navigation = useNavigation<PENavigationProp>();
  const { user, logout } = useAuth();

  const [data, setData] = useState<ItemType[]>([]);
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);

  const loadDashboard = useCallback(async () => {
    // 🛑 Don’t call API if user is not logged in
    if (!user?.id) return;

    try {
      setLoading(true);
      const res = await apiClient.get('/api/project-engineer/dashboard', {
        params: { project_engineer_id: user.id },
      });

      const { timesheets = [], tickets = [] } = res.data;
      const combinedMap: Record<string, ItemType> = {};

      timesheets.forEach((t: any) => {
        const key = `${t.date}-${t.foreman_name}-${t.job_code}`;
        if (!combinedMap[key]) {
          combinedMap[key] = {
            date: t.date,
            foreman_id: t.foreman_id || 0,
            foreman_name: t.foreman_name || '',
            job_code: t.job_code || '',
            timesheet_count: 0,
            ticket_count: 0,
          };
        }
        combinedMap[key].timesheet_count += 1;
      });

      tickets.forEach((tk: any) => {
        const key = `${tk.date}-${tk.foreman_name}-${tk.job_code}`;
        if (!combinedMap[key]) {
          combinedMap[key] = {
            date: tk.date,
            foreman_id: tk.foreman_id || 0,
            foreman_name: tk.foreman_name || '',
            job_code: tk.job_code || '',
            timesheet_count: 0,
            ticket_count: 0,
          };
        }
        combinedMap[key].ticket_count += 1;
      });

      setData(Object.values(combinedMap));
    } catch (err: any) {
      console.error('Load PE dashboard error', err);
      // Ignore error after logout (401 or canceled)
      if (err.response?.status !== 401) {
        Alert.alert('Error', err.response?.data?.detail || 'Failed to load dashboard data');
      }
    } finally {
      setLoading(false);
    }
  }, [user?.id]);

  useEffect(() => {
    let active = true;
    (async () => {
      if (user?.id && active) await loadDashboard();
    })();
    return () => {
      active = false; // cleanup to prevent setState on unmounted
    };
  }, [loadDashboard, user?.id]);

  const onRefresh = async () => {
    setRefreshing(true);
    await loadDashboard();
    setRefreshing(false);
  };

  const sections: SectionType[] = useMemo(() => {
    const grouped: Record<string, ItemType[]> = {};
    data.forEach(item => {
      (grouped[item.date] = grouped[item.date] || []).push(item);
    });
    return Object.entries(grouped)
      .sort(([a], [b]) => (a < b ? 1 : -1))
      .map(([title, data]) => ({ title, data }));
  }, [data]);

  const handleLogout = async () => {
    try {
      await logout(); // clear context + AsyncStorage
    } finally {
      // navigate only after logout is done
      navigation.getParent()?.dispatch(
        CommonActions.reset({
          index: 0,
          routes: [{ name: 'Login' as keyof RootStackParamList }],
        })
      );
    }
  };

  if (loading && !refreshing) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator size="large" color={THEME_COLORS.primary} />
      </View>
    );
  }

  return (
    <SafeAreaView style={styles.safeArea}>
      <View style={styles.container}>
        {/* Header */}
        <View style={styles.header}>
          <View>
            <Text style={styles.welcomeTitle}>Hello, {user?.first_name || 'Engineer'}</Text>
            <Text style={styles.welcomeSubtitle}>Review & Approve Submissions</Text>
          </View>
          <TouchableOpacity style={styles.logoutButton} onPress={handleLogout}>
            <Ionicons name="log-out-outline" size={24} color={THEME_COLORS.danger} />
          </TouchableOpacity>
        </View>

        {/* SectionList */}
        <SectionList
          sections={sections}
          keyExtractor={item => item.foreman_id + '-' + item.date}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={onRefresh}
              tintColor={THEME_COLORS.primary}
            />
          }
          renderSectionHeader={({ section }) => (
            <View style={styles.dateGroupContainer}>
              <Text style={styles.dateHeader}>
                {new Date(section.title + 'T00:00:00').toLocaleDateString('en-US', {
                  weekday: 'short',
                  year: 'numeric',
                  month: 'short',
                  day: 'numeric',
                })}
              </Text>
            </View>
          )}
          renderItem={({ item }) => (
            <View style={styles.card}>
              <View style={styles.foremanInfoRow}>
                <Text style={styles.foremanName}>
                  <Ionicons
                    name="person-circle-outline"
                    size={20}
                    color={THEME_COLORS.contentLight}
                  />{' '}
                  {item.foreman_name}
                </Text>
                {item.job_code && <Text style={styles.jobCodeRight}>Job: {item.job_code}</Text>}
              </View>

              <TouchableOpacity
                style={styles.actionRow}
                onPress={() =>
                  navigation.navigate('PETimesheetList', {
                    foremanId: item.foreman_id,
                    date: item.date,
                    supervisorName: item.foreman_name,
                  })
                }>
                <Text style={styles.actionLabel}>Timesheets ({item.timesheet_count})</Text>
                <Ionicons
                  name="chevron-forward-outline"
                  size={22}
                  color={THEME_COLORS.subtleLight}
                />
              </TouchableOpacity>

              <View style={styles.divider} />

              <TouchableOpacity
                style={styles.actionRow}
                onPress={() =>
                  navigation.navigate('PETicketList', {
                    foremanId: item.foreman_id,
                    date: item.date,
                    supervisorName: item.foreman_name,
                  })
                }>
                <Text style={styles.actionLabel}>Tickets ({item.ticket_count})</Text>
                <Ionicons
                  name="chevron-forward-outline"
                  size={22}
                  color={THEME_COLORS.subtleLight}
                />
              </TouchableOpacity>
            </View>
          )}
          ListEmptyComponent={
            <View style={styles.emptyContainer}>
              <Ionicons
                name="file-tray-stacked-outline"
                size={60}
                color={THEME_COLORS.brandStone}
              />
              <Text style={styles.emptyText}>No submissions found.</Text>
              <Text style={styles.emptySubText}>
                Submissions from supervisors will appear here.
              </Text>
            </View>
          }
        />
      </View>
    </SafeAreaView>
  );
};

// ---- STYLES ----
const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: THEME_COLORS.backgroundLight },
  container: { flex: 1 },
  centered: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: THEME_COLORS.backgroundLight },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 24,
    paddingVertical: 16,
    backgroundColor: THEME_COLORS.cardLight,
    borderBottomWidth: 1,
    borderBottomColor: THEME_COLORS.border,
  },
  welcomeTitle: { fontSize: 24, fontWeight: 'bold', color: THEME_COLORS.contentLight },
  welcomeSubtitle: { fontSize: 14, color: THEME_COLORS.subtleLight },
  logoutButton: { padding: 8, borderRadius: THEME_BORDERS.full, backgroundColor: '#FF3B301A' },
  dateGroupContainer: { backgroundColor: THEME_COLORS.backgroundLight, paddingHorizontal: 24, paddingVertical: 12 },
  dateHeader: { fontSize: 16, fontWeight: '700', color: THEME_COLORS.contentLight },
  card: {
    marginHorizontal: 24,
    marginTop: 12,
    padding: 16,
    backgroundColor: THEME_COLORS.cardLight,
    borderRadius: THEME_BORDERS.lg,
    shadowColor: '#000',
    shadowOpacity: 0.05,
    shadowOffset: { width: 0, height: 2 },
    shadowRadius: 8,
    elevation: 3,
  },
  foremanInfoRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingBottom: 12,
    marginBottom: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#F0F0F0',
  },
  foremanName: { fontSize: 16, fontWeight: '600', color: THEME_COLORS.contentLight, flexShrink: 1 },
  jobCodeRight: { fontSize: 13, color: THEME_COLORS.primary, fontWeight: '600', marginLeft: 10 },
  actionRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 12 },
  actionLabel: { fontSize: 15, fontWeight: '500', color: THEME_COLORS.primary },
  divider: { height: 1, backgroundColor: '#F0F0F0' },
  emptyContainer: { flex: 1, justifyContent: 'center', alignItems: 'center', marginTop: 80, paddingHorizontal: 24 },
  emptyText: { fontSize: 18, fontWeight: '600', color: THEME_COLORS.subtleLight, marginTop: 16, textAlign: 'center' },
  emptySubText: { fontSize: 15, color: THEME_COLORS.subtleLight, marginTop: 8, textAlign: 'center' },
});

export default PEDashboard;
