// /src/components/TimesheetList.tsx

import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ActivityIndicator, FlatList, RefreshControl } from 'react-native';
import apiClient from '../api/apiClient';
import { Timesheet } from '../types';

// Helper component to render a list of names (e.g., employees, equipment)
const DetailSection = ({ title, items, renderItem }: { title: string; items: any[]; renderItem: (item: any) => string; }) => {
  if (!items || items.length === 0) return null;

  return (
    <View style={styles.section}>
      <Text style={styles.sectionTitle}>{title}</Text>
      <Text style={styles.itemText}>{items.map(renderItem).join(', ')}</Text>
    </View>
  );
};

const TimesheetList = () => {
  const [timesheets, setTimesheets] = useState<Timesheet[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchTimesheets = async () => {
    setLoading(true);
    try {
      const response = await apiClient.get<Timesheet[]>('/api/timesheets/');
      setTimesheets(response.data);
    } catch (error) {
      console.error('Failed to fetch timesheets:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchTimesheets();
  }, []);

  if (loading) return <ActivityIndicator size="large" style={styles.loader} />;

  const renderItem = ({ item }: { item: Timesheet }) => {
    const { data, date } = item;

    return (
      <View style={styles.card}>
        {/* Header */}
        <View style={styles.cardHeader}>
          <View>
            <Text style={styles.jobName}>{data.job_name}</Text>
            <Text style={styles.jobCode}>{data.job.job_code}</Text>
          </View>
          <Text style={styles.dateText}>{new Date(date).toLocaleDateString()}</Text>
        </View>

        {/* Environmental Details */}
        <View style={styles.grid}>
            <Text style={styles.gridItem}>Weather: {data.weather}</Text>
            <Text style={styles.gridItem}>Temp: {data.temperature}</Text>
            <Text style={styles.gridItem}>Time: {data.time_of_day}</Text>
        </View>
        
        <View style={styles.detailRow}>
            <Text>Project Engineer: {data.project_engineer}</Text>
            <Text>Location: {data.location}</Text>
        </View>

        {/* Crew and Resource Details */}
        <DetailSection 
          title="Employees" 
          items={data.employees}
          renderItem={(emp) => `${emp.first_name} ${emp.last_name}`}
        />
        <DetailSection 
          title="Equipment" 
          items={data.equipment}
          renderItem={(eq) => eq.name}
        />
         <DetailSection 
          title="Materials" 
          items={data.materials}
          renderItem={(mat) => mat.name}
        />
         <DetailSection 
          title="Vendors" 
          items={data.vendors}
          renderItem={(ven) => ven.name}
        />
        <DetailSection 
  title="Dumping Sites" 
  items={data.dumping_sites ?? []}  // ✅ default to empty array
  renderItem={(ds) => `${ds.name} (# of Loads: ${ds.loads ?? '-'}, Qty: ${ds.qty ?? '-'})`}
/>

      </View>
    );
  };

  return (
    <FlatList
      data={timesheets}
      renderItem={renderItem}
      keyExtractor={(item) => item.id.toString()}
      contentContainerStyle={styles.listContainer}
      ListEmptyComponent={<Text style={styles.emptyText}>No timesheets found.</Text>}
      refreshControl={<RefreshControl refreshing={loading} onRefresh={fetchTimesheets} />}
    />
  );
};

const styles = StyleSheet.create({
  listContainer: { paddingVertical: 10, paddingHorizontal: 15 },
  loader: { marginTop: 50 },
  card: { backgroundColor: '#fff', borderRadius: 10, padding: 15, marginBottom: 15, elevation: 4, shadowColor: '#000', shadowOpacity: 0.1, shadowRadius: 5 },
  cardHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', borderBottomWidth: 1, borderBottomColor: '#f0f0f0', paddingBottom: 10, marginBottom: 10 },
  jobName: { fontSize: 20, fontWeight: 'bold', color: '#333' },
  jobCode: { fontSize: 14, color: '#666' },
  dateText: { fontSize: 14, color: '#555', fontWeight: '500' },
  grid: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 10, flexWrap: 'wrap' },
  gridItem: { fontSize: 14, color: '#444' },
  detailRow: { marginBottom: 10 },
  section: { marginTop: 8 },
  sectionTitle: { fontSize: 16, fontWeight: 'bold', color: '#2c3e50', marginBottom: 4 },
  itemText: { fontSize: 14, color: '#34495e', fontStyle: 'italic' },
  emptyText: { textAlign: 'center', marginTop: 50, fontSize: 16, color: '#888' },
});

export default TimesheetList;
