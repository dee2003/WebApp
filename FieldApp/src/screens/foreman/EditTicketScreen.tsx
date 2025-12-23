import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  SafeAreaView,
  ScrollView,
  ActivityIndicator,
  TextInput,
  KeyboardAvoidingView,
  Platform,
  Alert,
} from "react-native";
import Icon from "react-native-vector-icons/Feather";
import DateTimePicker from '@react-native-community/datetimepicker';
import axios from "axios";
import API_URL from "../../config";

// --- THEME ---
const THEME = {
  colors: {
    primary: "#4A5C4D",
    success: "#16A34A",
    danger: "#DC2626",
    inputBg: "#2C2C2E",
    inputText: "#E0E0E0",
  },
  borderRadius: { sm: 8, md: 12, tiny: 6 },
};

interface EditTicketProps {
  ticket: any;
  userId: number;
  onClose: () => void;
  onSaveSuccess: () => void;
}

const EditTicketScreen: React.FC<EditTicketProps> = ({ ticket, userId, onClose, onSaveSuccess }) => {
  const [isSaving, setIsSaving] = useState(false);
  const [showDatePicker, setShowDatePicker] = useState(false);
  
  const [formData, setFormData] = useState({
    ticket_number: ticket?.ticket_number || "",
    ticket_date: ticket?.ticket_date || "",
    haul_vendor: ticket?.haul_vendor || "",
    truck_number: ticket?.truck_number || "",
    material: ticket?.material || "",
    job_number: ticket?.job_number || "",
    zone: ticket?.zone || "",
    hours: ticket?.hours ? String(ticket.hours) : "",
    table_data: ticket?.table_data || [],
    extra_text: ticket?.raw_text_content || "",
  });

  // --- FORM HELPERS ---
  const formatDateToString = (date: Date): string => {
    const mm = String(date.getMonth() + 1).padStart(2, '0');
    const dd = String(date.getDate()).padStart(2, '0');
    const yyyy = date.getFullYear();
    return `${mm}-${dd}-${yyyy}`;
  };

  const onDateChange = (event: any, selectedDate?: Date) => {
    setShowDatePicker(Platform.OS === 'ios');
    if (event.type === 'set' && selectedDate) {
      setFormData(prev => ({ ...prev, ticket_date: formatDateToString(selectedDate) }));
    }
  };

  // --- TABLE LOGIC ---
  const handleUpdateTable = (rowIndex: number, cellIndex: number, text: string) => {
    const newData = [...formData.table_data];
    newData[rowIndex][cellIndex] = text;
    setFormData({ ...formData, table_data: newData });
  };

  const handleAddRow = () => {
    const columnCount = formData.table_data.length > 0 ? formData.table_data[0].length : 5;
    const newRow = new Array(columnCount).fill("");
    setFormData({ ...formData, table_data: [...formData.table_data, newRow] });
  };

  const handleRemoveRow = (index: number) => {
    const newTable = formData.table_data.filter((_: any, i: number) => i !== index);
    setFormData({ ...formData, table_data: newTable });
  };

  // --- SAVE LOGIC ---
  const handleSave = async () => {
    if (!formData.ticket_number || !formData.ticket_date) {
      Alert.alert("Error", "Ticket Number and Date are required.");
      return;
    }

    setIsSaving(true);
    try {
      const payload = {
        ticket_id: ticket.id,
        foreman_id: userId,
        ...formData,
        hours: parseFloat(formData.hours) || 0,
      };
      
      await axios.post(`${API_URL}/api/ocr/update-ticket-text`, payload);
      onSaveSuccess();
    } catch (error) {
      Alert.alert("Error", "Failed to save ticket.");
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={onClose} style={styles.headerBtn}>
          <Text style={styles.cancelText}>Cancel</Text>
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Edit Ticket</Text>
        <TouchableOpacity onPress={handleSave} style={styles.headerBtn} disabled={isSaving}>
          {isSaving ? <ActivityIndicator size="small" color="#fff" /> : <Text style={styles.saveText}>Save</Text>}
        </TouchableOpacity>
      </View>

      <KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : "height"} style={{ flex: 1 }}>
        <ScrollView contentContainerStyle={styles.formContent}>
          
          <Text style={styles.label}>Ticket Number *</Text>
          <TextInput 
            style={styles.input} 
            value={formData.ticket_number} 
            onChangeText={(t) => setFormData({...formData, ticket_number: t})}
            placeholderTextColor="#666"
          />

          <Text style={styles.label}>Date *</Text>
          <TouchableOpacity style={styles.input} onPress={() => setShowDatePicker(true)}>
            <Text style={{ color: "#fff" }}>{formData.ticket_date || "Select Date"}</Text>
          </TouchableOpacity>

          {showDatePicker && (
            <DateTimePicker
              value={new Date()}
              mode="date"
              display="default"
              onChange={onDateChange}
            />
          )}

          <View style={styles.row}>
            <View style={{ flex: 1, marginRight: 8 }}>
              <Text style={styles.label}>Truck #</Text>
              <TextInput 
                style={styles.input} 
                value={formData.truck_number} 
                onChangeText={(t) => setFormData({...formData, truck_number: t})}
              />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.label}>Hours</Text>
              <TextInput 
                style={styles.input} 
                value={formData.hours} 
                keyboardType="numeric"
                onChangeText={(t) => setFormData({...formData, hours: t})}
              />
            </View>
          </View>

          <Text style={styles.label}>Table Data</Text>
          <View style={styles.tableContainer}>
            <ScrollView horizontal>
              <View>
                {formData.table_data.map((row: string[], rIdx: number) => (
                  <View key={rIdx} style={styles.tableRow}>
                    <TouchableOpacity onPress={() => handleRemoveRow(rIdx)} style={{ padding: 10 }}>
                      <Icon name="minus-circle" size={16} color={THEME.colors.danger} />
                    </TouchableOpacity>
                    {row.map((cell, cIdx) => (
                      <TextInput
                        key={cIdx}
                        style={styles.tableInput}
                        value={cell}
                        onChangeText={(text) => handleUpdateTable(rIdx, cIdx, text)}
                      />
                    ))}
                  </View>
                ))}
                <TouchableOpacity onPress={handleAddRow} style={styles.addRowBtn}>
                  <Icon name="plus" size={16} color={THEME.colors.success} />
                  <Text style={{ color: THEME.colors.success, marginLeft: 8 }}>Add Row</Text>
                </TouchableOpacity>
              </View>
            </ScrollView>
          </View>

        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#1C1C1E" },
  header: { 
    flexDirection: "row", 
    justifyContent: "space-between", 
    alignItems: "center",
    padding: 16, 
    borderBottomWidth: 1, 
    borderColor: "#333" 
  },
  headerTitle: { color: "#fff", fontSize: 18, fontWeight: "600" },
  headerBtn: { padding: 5, minWidth: 60 },
  cancelText: { color: "#fff", fontSize: 16 },
  saveText: { color: "#fff", fontSize: 16, fontWeight: "bold", textAlign: 'right' },
  formContent: { padding: 16 },
  label: { color: "#aaa", fontSize: 12, marginBottom: 5, marginTop: 15 },
  input: { 
    backgroundColor: THEME.colors.inputBg, 
    color: "#fff", 
    padding: 12, 
    borderRadius: 8, 
    fontSize: 16 
  },
  row: { flexDirection: "row", marginTop: 10 },
  tableContainer: { 
    marginTop: 10, 
    borderWidth: 1, 
    borderColor: "#444", 
    borderRadius: 8,
    backgroundColor: "#222" 
  },
  tableRow: { flexDirection: "row", alignItems: "center", borderBottomWidth: 1, borderBottomColor: "#333" },
  tableInput: { 
    width: 100, 
    color: "#fff", 
    padding: 10, 
    borderLeftWidth: 1, 
    borderLeftColor: "#333" 
  },
  addRowBtn: { flexDirection: "row", alignItems: "center", padding: 15 }
});

export default EditTicketScreen;