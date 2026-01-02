import React, { useState, useEffect, useCallback } from 'react';
import { 
  View, Text, StyleSheet, ScrollView, TextInput, TouchableOpacity, 
  SafeAreaView, Alert, ActivityIndicator, RefreshControl 
} from 'react-native';
// Assuming you have an AuthContext or similar to get the logged-in user
// import { useAuth } from '../../context/AuthContext'; 
import apiClient from '../../api/apiClient';

const THEME = {
  primary: '#3b82f6',
  border: '#E5E7EB',
  text: '#111827',
  danger: '#EF4444',
  backgroundLight: '#f8fafc',
  card: '#FFFFFF',
};

const FlaggerEditor = ({ navigation, route }: any) => {
  // 1. Get Foreman ID dynamically. 
  // Priority: Route params > Auth Context > null
  const foremanId = route.params?.foremanId || 1555; // Defaulting to 1555 for your current test

  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [date] = useState(new Date().toISOString().split('T')[0]);
  const [notes, setNotes] = useState('');
  
  const [mappedCrew, setMappedCrew] = useState<any>(null);
  const [columns, setColumns] = useState<string[]>([]);
  const [rows, setRows] = useState([
    { id: Date.now(), location: '', phaseHours: {} as Record<string, string> }
  ]);

  const fetchMapping = useCallback(async () => {
    if (!foremanId) {
      Alert.alert("Error", "No Foreman ID found. Please log in again.");
      return;
    }

    try {
      setLoading(true);
      // Fetching mapping based on the dynamic foremanId
      const res = await apiClient.get(`/api/crew-mapping/flagger/${foremanId}`);
      
      if (res.data) {
        setMappedCrew(res.data);
        // Extract names for table columns
        const employeeNames = res.data.employees?.map((emp: any) => `${emp.first_name} ${emp.last_name}`) || [];
        const equipmentNames = res.data.equipment?.map((eq: any) => eq.name) || [];
        setColumns([...employeeNames, ...equipmentNames]);
      }
    } catch (e: any) {
      console.error("Crew mapping fetch failed", e);
      if (e.response?.status === 404) {
        Alert.alert("No Mapping", "No active crew mapping was found for your ID.");
      }
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [foremanId]);

  useEffect(() => {
    fetchMapping();
  }, [fetchMapping]);

  const onRefresh = () => {
    setRefreshing(true);
    fetchMapping();
  };

  const handleHourChange = (rowIndex: number, columnName: string, value: string) => {
    const sanitized = value.replace(/[^0-9.]/g, '');
    const newRows = [...rows];
    newRows[rowIndex].phaseHours = { ...newRows[rowIndex].phaseHours, [columnName]: sanitized };
    setRows(newRows);
  };

  const addRow = () => {
    setRows([...rows, { id: Date.now(), location: '', phaseHours: {} }]);
  };

  const handleSave = async () => {
    if (columns.length === 0) {
      Alert.alert('Incomplete', 'Cannot submit without an active crew mapping.');
      return;
    }

    try {
      const payload = {
        timesheet_name: `FlaggerLog_${foremanId}_${date.replace(/-/g, '')}`,
        data: { 
            rows, 
            notes, 
            date, 
            foreman_id: foremanId,
            crewSnapshot: mappedCrew 
        },
        status: 'SUBMITTED'
      };
      await apiClient.post('/api/timesheets', payload);
      Alert.alert('Success', 'Log Submitted Successfully');
      navigation.goBack();
    } catch (err) {
      Alert.alert('Error', 'Failed to save timesheet');
    }
  };

  if (loading && !refreshing) return (
    <View style={styles.centered}>
        <ActivityIndicator size="large" color={THEME.primary} />
        <Text style={styles.loadingText}>Syncing Crew Data...</Text>
    </View>
  );

  return (
    <SafeAreaView style={styles.safeArea}>
      <ScrollView 
        contentContainerStyle={{ padding: 14 }}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
      >
        <View style={styles.card}>
          <Text style={styles.title}>Daily Flagger Log</Text>
          <Text style={styles.subtitle}>Foreman ID: {foremanId} | Date: {date}</Text>
        </View>

        {/* --- Crew Summary View --- */}
        {columns.length > 0 ? (
          <View style={styles.crewCard}>
            <Text style={styles.crewTitle}>CURRENT ASSIGNMENTS</Text>
            <View style={styles.crewList}>
              {mappedCrew?.employees?.map((emp: any) => (
                <View key={emp.id} style={styles.badge}>
                  <Text style={styles.badgeText}>{emp.first_name} {emp.last_name}</Text>
                </View>
              ))}
              {mappedCrew?.equipment?.map((eq: any) => (
                <View key={eq.id} style={[styles.badge, { backgroundColor: '#fef3c7' }]}>
                  <Text style={[styles.badgeText, { color: '#92400e' }]}>{eq.name}</Text>
                </View>
              ))}
            </View>
          </View>
        ) : (
          <View style={styles.warningCard}>
            <Text style={styles.warningText}>⚠️ No crew mapping found. Pull down to refresh or check database.</Text>
          </View>
        )}

        {/* --- Dynamic Hours Table --- */}
        <ScrollView horizontal showsHorizontalScrollIndicator={true}>
          <View style={styles.tableWrap}>
            <View style={styles.headerRow}>
              <View style={[styles.cellFixed, { width: 140 }]}><Text style={styles.headerText}>LOCATION</Text></View>
              {columns.map(name => (
                <View key={name} style={[styles.cell, { width: 100 }]}><Text style={styles.headerText}>{name.toUpperCase()}</Text></View>
              ))}
            </View>

            {rows.map((row, index) => (
              <View key={row.id} style={index % 2 === 0 ? styles.row : styles.rowAlt}>
                <View style={[styles.cellFixed, { width: 140 }]}>
                  <TextInput 
                    style={styles.input}
                    placeholder="Location Name" 
                    value={row.location} 
                    onChangeText={(v) => {
                      const nr = [...rows]; 
                      nr[index].location = v; 
                      setRows(nr);
                    }} 
                  />
                </View>
                {columns.map(name => (
                  <View key={name} style={[styles.cell, { width: 100 }]}>
                    <TextInput 
                      style={styles.inputCenter}
                      keyboardType="numeric" 
                      placeholder="0.0" 
                      value={row.phaseHours[name] || ''} 
                      onChangeText={(v) => handleHourChange(index, name, v)} 
                    />
                  </View>
                ))}
              </View>
            ))}
          </View>
        </ScrollView>

        <TouchableOpacity style={styles.addBtn} onPress={addRow}>
           <Text style={styles.addBtnText}>+ Add New Location</Text>
        </TouchableOpacity>

        <View style={styles.card}>
            <Text style={styles.crewTitle}>LOG NOTES</Text>
            <TextInput 
                style={styles.notesInput}
                multiline
                placeholder="Enter job details, weather, or delays..."
                value={notes}
                onChangeText={setNotes}
            />
        </View>

        <TouchableOpacity 
          style={[styles.saveBtn, columns.length === 0 && { opacity: 0.5 }]} 
          onPress={handleSave}
          disabled={columns.length === 0}
        >
          <Text style={styles.saveBtnText}>Submit Daily Log</Text>
        </TouchableOpacity>
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: THEME.backgroundLight },
  centered: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  loadingText: { marginTop: 12, color: '#64748b', fontWeight: '600' },
  card: { backgroundColor: '#fff', borderRadius: 12, padding: 15, marginBottom: 15 },
  crewCard: { backgroundColor: '#fff', borderRadius: 12, padding: 12, marginBottom: 15, borderLeftWidth: 4, borderLeftColor: THEME.primary },
  warningCard: { backgroundColor: '#fee2e2', borderRadius: 12, padding: 15, marginBottom: 15, borderWidth: 1, borderColor: '#ef4444' },
  warningText: { color: '#b91c1c', fontSize: 13, fontWeight: '600', textAlign: 'center' },
  crewTitle: { fontSize: 11, fontWeight: '800', color: '#64748b', marginBottom: 8, letterSpacing: 0.5 },
  crewList: { flexDirection: 'row', flexWrap: 'wrap', gap: 6 },
  badge: { backgroundColor: '#dbeafe', paddingHorizontal: 8, paddingVertical: 4, borderRadius: 6 },
  badgeText: { fontSize: 11, color: THEME.primary, fontWeight: '700' },
  title: { fontSize: 22, fontWeight: '800', color: THEME.text },
  subtitle: { fontSize: 13, color: '#666', marginTop: 4 },
  tableWrap: { borderRadius: 10, borderWidth: 1, borderColor: THEME.border, backgroundColor: "#fff", overflow: 'hidden' },
  headerRow: { flexDirection: "row", backgroundColor: "#f1f5f9", minHeight: 48, alignItems: "center" },
  headerText: { fontSize: 10, fontWeight: "900", textAlign: "center", color: '#334155' },
  row: { flexDirection: "row", minHeight: 52, backgroundColor: "#fff", borderBottomWidth: 1, borderColor: "#f1f5f9" },
  rowAlt: { flexDirection: "row", minHeight: 52, backgroundColor: "#fafbfc", borderBottomWidth: 1, borderColor: "#f1f5f9" },
  cellFixed: { paddingHorizontal: 10, borderRightWidth: 1, borderColor: "#f1f5f9", justifyContent: "center" },
  cell: { paddingHorizontal: 8, borderRightWidth: 1, borderColor: "#f1f5f9", justifyContent: "center", alignItems: "center" },
  input: { fontSize: 14, color: THEME.text },
  inputCenter: { fontSize: 14, color: THEME.text, textAlign: 'center', width: '100%' },
  addBtn: { padding: 15, alignItems: 'center' },
  addBtnText: { color: THEME.primary, fontWeight: '700' },
  notesInput: { minHeight: 80, borderBottomWidth: 1, borderBottomColor: THEME.border, paddingVertical: 8, fontSize: 14, textAlignVertical: 'top' },
  saveBtn: { backgroundColor: THEME.primary, height: 56, borderRadius: 12, justifyContent: 'center', alignItems: 'center', marginTop: 10, marginBottom: 40 },
  saveBtnText: { color: '#fff', fontWeight: '800', fontSize: 16 },
});

export default FlaggerEditor;