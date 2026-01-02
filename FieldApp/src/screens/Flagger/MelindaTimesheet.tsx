import React from 'react';
import { View, Text, TextInput, TouchableOpacity, ScrollView, StyleSheet } from 'react-native';
import { useMelindaForm } from './useMelindaForm'; //
const MelindaTimesheet = () => {
  const { date, foremanName, crewMembers, notes, addRow, updateMember, setNotes, handleSave } = useMelindaForm();

  return (
    <ScrollView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Flagger Timesheet (Stop & Go)</Text>
        <Text style={styles.subtitle}>Foreman: {foremanName}</Text>
        <Text style={styles.subtitle}>Date: {date}</Text>
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Crew Members & Hours</Text>
        {crewMembers.map((member, index) => (
          <View key={index} style={styles.row}>
            <TextInput
              style={[styles.input, { flex: 2 }]}
              placeholder="Name"
              value={member.name}
              onChangeText={(text) => updateMember(index, 'name', text)}
            />
            <TextInput
              style={[styles.input, { flex: 1 }]}
              placeholder="Hours"
              keyboardType="numeric"
              value={member.hours}
              onChangeText={(text) => updateMember(index, 'hours', text)}
            />
          </View>
        ))}
        <TouchableOpacity style={styles.addButton} onPress={addRow}>
          <Text style={styles.addButtonText}>+ Add Member</Text>
        </TouchableOpacity>
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Daily Notes (Locations Assisted)</Text>
        <TextInput
          style={styles.textArea}
          multiline
          numberOfLines={4}
          placeholder="Notes on crews assisted (e.g., Arsenio or Freddie)..."
          value={notes}
          onChangeText={setNotes}
        />
      </View>

      <TouchableOpacity style={styles.saveButton} onPress={handleSave}>
        <Text style={styles.saveButtonText}>Save Timesheet</Text>
      </TouchableOpacity>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, padding: 20, backgroundColor: '#F5F5F5' },
  header: { marginBottom: 20, padding: 15, backgroundColor: '#FFF', borderRadius: 10 },
  title: { fontSize: 20, fontWeight: 'bold', color: '#3949AB' },
  subtitle: { fontSize: 14, color: '#757575', marginTop: 5 },
  section: { marginBottom: 20 },
  sectionTitle: { fontSize: 16, fontWeight: '600', marginBottom: 10, color: '#333' },
  row: { flexDirection: 'row', gap: 10, marginBottom: 10 },
  input: { backgroundColor: '#FFF', padding: 10, borderRadius: 5, borderWidth: 1, borderColor: '#DDD' },
  addButton: { padding: 10, alignItems: 'center' },
  addButtonText: { color: '#5C6BC0', fontWeight: 'bold' },
  textArea: { backgroundColor: '#FFF', padding: 10, borderRadius: 5, borderWidth: 1, borderColor: '#DDD', textAlignVertical: 'top' },
  saveButton: { backgroundColor: '#4CAF50', padding: 15, borderRadius: 10, alignItems: 'center' },
  saveButtonText: { color: '#FFF', fontSize: 16, fontWeight: 'bold' }
});

export default MelindaTimesheet;