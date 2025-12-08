import React, { useState, useCallback, useEffect } from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  SafeAreaView,
  ScrollView,
  ActivityIndicator,
  Dimensions,
  Alert,
  RefreshControl,
  Modal,
  FlatList,
  TextInput,
  KeyboardAvoidingView,
  Platform,
} from "react-native";
import { useAuth } from "../../context/AuthContext";
import { useFocusEffect } from "@react-navigation/native";
import Icon from "react-native-vector-icons/Feather";
import axios from "axios";
import { Timesheet } from "../../types";
import Pdf from "react-native-pdf";
import DateTimePicker from '@react-native-community/datetimepicker';

// --- IMPORTS FOR CSV EXPORT ONLY ---
import RNFS from 'react-native-fs';
import Share from 'react-native-share';

const { width } = Dimensions.get("window");
const THUMBNAIL_HEIGHT = 130;
const THUMBNAIL_WIDTH = 100;

// ✅ Replace with your backend URL
const API_BASE_URL = "https://61e78ab11008.ngrok-free.app";

// --- TYPE DEFINITIONS ---
interface TicketImage {
  id: number;
  image_url: string;
  submitted: boolean;
  category: string | null;
  sub_category: string | null;
  table_data: string[][] | null;
  raw_text_content: string | null;
  ticket_number: string | null;
  ticket_date: string | null;
  haul_vendor: string | null;
  truck_number: string | null;
  material: string | null;
  job_number: string | null;
  phase_code_: string | null;
  zone: string | null;
  hours: number | null;
}

interface TicketGroup {
  date: string;
  images: TicketImage[];
  status?: string;
  submission_id?: number;
  ticket_count?: number;
  isFullySubmitted?: boolean;
  unsubmittedTicketIds?: number[];
}

interface SearchFilters {
    ticket_number: string;
    haul_vendor: string;
    material: string;
    job_number: string;
    date_from: string;
    date_to: string;
}

// --- SMART DATE HELPERS ---

// 1. Parse ANY format (YYYY-MM-DD or MM-DD-YYYY) to Timestamp for logic
const parseAnyDate = (dateStr: string | null): number | null => {
    if (!dateStr) return null;
    const s = dateStr.trim();

    // Check ISO Format (YYYY-MM-DD)
    if (/^\d{4}-\d{2}-\d{2}$/.test(s)) {
        const [y, m, d] = s.split('-').map(Number);
        return new Date(y, m - 1, d).getTime();
    }

    // Check US Format (MM-DD-YYYY or MM-DD-YY)
    const usMatch = s.match(/^(\d{1,2})[-/](\d{1,2})[-/](\d{2,4})$/);
    if (usMatch) {
        const m = parseInt(usMatch[1], 10);
        const d = parseInt(usMatch[2], 10);
        let y = parseInt(usMatch[3], 10);
        if (y < 100) y += 2000; 
        return new Date(y, m - 1, d).getTime();
    }

    // Fallback
    const ts = new Date(s).getTime();
    return isNaN(ts) ? null : ts;
};

// 2. Format JS Date -> "MM-DD-YYYY" (For Edit/Search Display)
const formatDateToString = (date: Date): string => {
    const mm = String(date.getMonth() + 1).padStart(2, '0');
    const dd = String(date.getDate()).padStart(2, '0');
    const yyyy = date.getFullYear();
    return `${mm}-${dd}-${yyyy}`;
};

// --- HELPER FUNCTIONS ---
const getImageUri = (imagePath?: string): string | null => {
  if (!imagePath) return null;
  if (imagePath.startsWith("http")) return imagePath;
  return `${API_BASE_URL}${imagePath}`;
};

const getTicketsByCategory = (tickets: TicketImage[]) => {
  const grouped: Record<string, TicketImage[]> = {};
  tickets.forEach((t) => {
    const cat = t.category ? t.category.trim() : "Unspecified";
    if (!grouped[cat]) grouped[cat] = [];
    grouped[cat].push(t);
  });
  return grouped;
};

const getMissingFields = (data: any) => {
  const requiredFields = [
    { key: "ticket_number", label: "Ticket Number" },
    { key: "ticket_date", label: "Date" },
    { key: "haul_vendor", label: "Vendor" },
    { key: "truck_number", label: "Truck #" },
    { key: "job_number", label: "Job #" },
    { key: "material", label: "Material" },
    { key: "phase_code_", label: "Phase Code" },
    { key: "zone", label: "Zone" },
    { key: "hours", label: "Hours" },
  ];

  return requiredFields
    .filter((field) => !data[field.key] || String(data[field.key]).trim() === "")
    .map((field) => field.label);
};

const InfoRow: React.FC<{
  label: string;
  value: string | number | null | undefined;
}> = ({ label, value }) => (
  <View style={styles.infoRow}>
    <Text style={styles.infoLabel}>{label}</Text>
    <Text style={styles.infoValue}>{value || "N/A"}</Text>
  </View>
);

// --- TABLE COMPONENT ---
interface EditableOCRTableProps {
  data: string[][];
  onUpdateData: (newData: string[][]) => void;
  onRemoveRow?: (rowIndex: number) => void;
  onAddRow?: () => void;
  onInsertRowAt?: (rowIndex: number) => void; 
  onAddColumn?: (colIndex: number) => void;
  onRemoveColumn?: (colIndex: number) => void;
  isEditable: boolean;
}

const EditableOCRTable: React.FC<EditableOCRTableProps> = ({
  data,
  onUpdateData,
  onRemoveRow,
  onAddRow,
  onInsertRowAt,
  onAddColumn,
  onRemoveColumn,
  isEditable,
}) => {
  const handleCellEdit = (
    rowIndex: number,
    cellIndex: number,
    text: string
  ) => {
    const newData = [...data];
    const newRow = [...newData[rowIndex]];
    newRow[cellIndex] = text;
    newData[rowIndex] = newRow;
    onUpdateData(newData);
  };

  const columnCount = data && data.length > 0 ? data[0].length : 0;
  const columnIndices = Array.from({ length: columnCount }, (_, i) => i);

  if ((!data || data.length === 0) && !isEditable)
    return (
      <Text style={{ color: "#666", fontStyle: "italic", marginTop: 10 }}>
        No structured table data available.
      </Text>
    );

  return (
    <View style={styles.tableContainer}>
      <ScrollView
        style={styles.tableVerticalScroll}
        nestedScrollEnabled={true}
        persistentScrollbar={true}
        showsVerticalScrollIndicator={true}
      >
        <ScrollView
          horizontal={true}
          nestedScrollEnabled={true}
          showsHorizontalScrollIndicator={true}
          contentContainerStyle={{ flexGrow: 1 }}
        >
          <View>
            {/* HEADER ROW */}
            {isEditable && onAddColumn && onRemoveColumn && (
              <View style={styles.headerRowContainer}>
                <View style={styles.controlColumnSpacer} />
                {columnIndices.map((colIndex) => (
                  <View key={`header-${colIndex}`} style={styles.headerCell}>
                    <TouchableOpacity 
                      style={styles.insertColButton}
                      onPress={() => onAddColumn(colIndex)}
                    >
                      <Icon name="plus" size={10} color="#fff" />
                    </TouchableOpacity>
                    <View style={styles.headerLabelContainer}>
                        <Text style={styles.headerLabelText}>Col {colIndex + 1}</Text>
                        <TouchableOpacity onPress={() => onRemoveColumn(colIndex)}>
                          <Icon name="x" size={10} color={THEME.colors.danger} />
                        </TouchableOpacity>
                    </View>
                  </View>
                ))}
                <TouchableOpacity 
                  style={styles.appendColButton}
                  onPress={() => onAddColumn(columnCount)}
                >
                    <Icon name="plus" size={14} color="#fff" />
                    <Text style={styles.appendColText}>New Col</Text>
                </TouchableOpacity>
              </View>
            )}

            {/* DATA ROWS */}
            {data && data.length > 0 ? (
              data.map((row, rowIndex) => (
                <View
                  key={rowIndex}
                  style={[
                    styles.tableRow,
                    rowIndex % 2 === 0
                      ? styles.tableRowEven
                      : styles.tableRowOdd,
                  ]}
                >
                  {isEditable && (
                    <View style={styles.rowControlColumn}>
                      {onInsertRowAt && (
                        <TouchableOpacity 
                          onPress={() => onInsertRowAt(rowIndex)}
                          style={styles.controlBtn}
                        >
                          <Icon name="chevrons-up" size={14} color={THEME.colors.success} />
                        </TouchableOpacity>
                      )}
                      {onRemoveRow && (
                        <TouchableOpacity 
                          onPress={() => onRemoveRow(rowIndex)}
                          style={styles.controlBtn}
                        >
                          <Icon name="minus-circle" size={14} color={THEME.colors.danger} />
                        </TouchableOpacity>
                      )}
                    </View>
                  )}
                  {row.map((cell, cellIndex) => (
                    <View key={cellIndex} style={styles.tableCell}>
                      {isEditable ? (
                        <TextInput
                          value={cell}
                          onChangeText={(text) =>
                            handleCellEdit(rowIndex, cellIndex, text)
                          }
                          style={styles.tableInput}
                          placeholder="-"
                          placeholderTextColor="#555"
                        />
                      ) : (
                        <Text
                          style={styles.tableCellText}
                          numberOfLines={1}
                          ellipsizeMode="tail"
                        >
                          {cell}
                        </Text>
                      )}
                    </View>
                  ))}
                </View>
              ))
            ) : (
              isEditable && (
                <View style={{ padding: 10 }}>
                  <Text style={{ color: "#666", fontStyle: "italic" }}>
                    No rows yet. Add one below.
                  </Text>
                </View>
              )
            )}

            {isEditable && onAddRow && (
              <TouchableOpacity onPress={onAddRow} style={styles.addRowButton}>
                <Icon name="plus" size={14} color="#fff" />
                <Text style={styles.addRowText}>Add New Row (Bottom)</Text>
              </TouchableOpacity>
            )}
          </View>
        </ScrollView>
      </ScrollView>
    </View>
  );
};

// --- FORM FIELD ---
const FormField = ({
  label,
  value,
  onChange,
  keyboardType = "default",
  multiline = false,
  height = undefined,
  required = false, 
}: any) => (
  <View style={styles.formGroup}>
    <View style={{ flexDirection: 'row' }}>
      <Text style={styles.formLabel}>{label}</Text>
      {required && <Text style={{ color: THEME.colors.danger, marginLeft: 4 }}>*</Text>}
    </View>
    <TextInput
      style={[
        styles.formInput,
        height ? { height } : {},
        multiline ? { textAlignVertical: "top" } : {},
      ]}
      value={value ? String(value) : ""}
      onChangeText={onChange}
      placeholder={`Enter ${label}`}
      placeholderTextColor="#666"
      keyboardType={keyboardType}
      multiline={multiline}
    />
  </View>
);

// --- Tickets Review Component ---
const ReviewTickets: React.FC = () => {
  const { user, ticketRefreshTrigger } = useAuth();
  const [imagesByDate, setImagesByDate] = useState<TicketGroup[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [selectedTicket, setSelectedTicket] = useState<TicketImage | null>(null);

  // --- SEARCH STATE ---
  const [isSearchModalVisible, setIsSearchModalVisible] = useState(false);
  const [isSearching, setIsSearching] = useState(false);
  const [filteredImages, setFilteredImages] = useState<TicketGroup[]>([]);
  const [searchFilters, setSearchFilters] = useState<SearchFilters>({
    ticket_number: "",
    haul_vendor: "",
    material: "",
    job_number: "",
    date_from: "",
    date_to: "",
  });

  // --- DATE PICKER STATE ---
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [datePickerMode, setDatePickerMode] = useState<'from' | 'to' | 'edit_ticket_date'>('from');

  const [formData, setFormData] = useState({
    ticket_number: "",
    ticket_date: "",
    haul_vendor: "",
    truck_number: "",
    material: "",
    job_number: "",
    phase_code_: "",
    zone: "",
    hours: "",
    table_data: [] as string[][],
    extra_text: "",
  });

  const [isSaving, setIsSaving] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [isEditingFullScreen, setIsEditingFullScreen] = useState(false);
  const [isPdfFullScreen, setIsPdfFullScreen] = useState(false);

  useEffect(() => {
    if (user) fetchTickets();
  }, [ticketRefreshTrigger]); 

  const fetchTickets = async () => {
    if (!user) return;
    setIsLoading(true);
    try {
      const res = await axios.get(
        `${API_BASE_URL}/api/ocr/images-by-date/${user.id}`
      );
      const groups: TicketGroup[] = res.data.imagesByDate || [];
      const processed = groups.map((g) => {
        const unsubmitted = g.images.filter((i) => !i.submitted);
        return {
          ...g,
          isFullySubmitted: unsubmitted.length === 0,
          unsubmittedTicketIds: unsubmitted.map((i) => i.id),
        };
      });
      setImagesByDate(processed);
      if (isSearching) performSearch(processed);

    } catch (err) {
      Alert.alert("Error", "Failed to load tickets.");
    } finally {
      setIsLoading(false);
    }
  };

  useFocusEffect(
    useCallback(() => { fetchTickets(); }, [user])
  );

  useEffect(() => {
    if (selectedTicket) {
      setFormData({
        ticket_number: selectedTicket.ticket_number || "",
        ticket_date: selectedTicket.ticket_date || "",
        haul_vendor: selectedTicket.haul_vendor || "",
        truck_number: selectedTicket.truck_number || "",
        material: selectedTicket.material || "",
        job_number: selectedTicket.job_number || "",
        phase_code_: selectedTicket.phase_code_ || "",
        zone: selectedTicket.zone || "",
        hours: selectedTicket.hours ? String(selectedTicket.hours) : "",
        table_data: selectedTicket.table_data || [],
        extra_text: selectedTicket.raw_text_content || "",
      });
    }
  }, [selectedTicket]);

  // --- DATE PICKER HANDLER ---
  const onDateChange = (event: any, selectedDate?: Date) => {
    setShowDatePicker(Platform.OS === 'ios');

    if (event.type === 'set' && selectedDate) {
        if (Platform.OS === 'android') setShowDatePicker(false);
        
        // ✅ Format as MM-DD-YYYY for consistency
        const dateString = formatDateToString(selectedDate);

        if (datePickerMode === 'from') {
             setSearchFilters(prev => ({ ...prev, date_from: dateString }));
        } else if (datePickerMode === 'to') {
             setSearchFilters(prev => ({ ...prev, date_to: dateString }));
        } else if (datePickerMode === 'edit_ticket_date') {
             // ✅ Save to Edit Form as MM-DD-YYYY
             setFormData(prev => ({ ...prev, ticket_date: dateString }));
        }
    } else {
        setShowDatePicker(false);
    }
  };

  const openDatePicker = (mode: 'from' | 'to' | 'edit_ticket_date') => {
      setDatePickerMode(mode);
      setShowDatePicker(true);
  }

  // --- UPDATED SEARCH LOGIC ---
  const performSearch = (dataToFilter = imagesByDate) => {
      const { ticket_number, haul_vendor, material, job_number, date_from, date_to } = searchFilters;

      // Parse Filter Dates once
      const fromTimestamp = parseAnyDate(date_from);
      const toTimestamp = parseAnyDate(date_to);

      const filteredGroups = dataToFilter.map(group => {
          // ✅ 1. Check Group Date (The "Displayed Under" Date)
          let groupMatchesDate = true;
          const groupDateTs = parseAnyDate(group.date);

          if (groupDateTs) {
              if (fromTimestamp && groupDateTs < fromTimestamp) groupMatchesDate = false;
              if (toTimestamp && groupDateTs > toTimestamp) groupMatchesDate = false;
          }

          if (!groupMatchesDate) {
              return { ...group, images: [] }; // Filter out entire group
          }

          // ✅ 2. Filter images based on text fields ONLY
          const matchingImages = group.images.filter(img => {
              const matchesTicket = !ticket_number || (img.ticket_number && img.ticket_number.toLowerCase().includes(ticket_number.toLowerCase()));
              const matchesVendor = !haul_vendor || (img.haul_vendor && img.haul_vendor.toLowerCase().includes(haul_vendor.toLowerCase()));
              
              const matchesMaterial = !material || 
                  (img.material && img.material.toLowerCase().includes(material.toLowerCase())) ||
                  (img.sub_category && img.sub_category.toLowerCase().includes(material.toLowerCase()));

              const matchesJob = !job_number || (img.job_number && img.job_number.toLowerCase().includes(job_number.toLowerCase()));
              
              return matchesTicket && matchesVendor && matchesMaterial && matchesJob;
          });

          return { ...group, images: matchingImages };
      }).filter(group => group.images.length > 0);

      setFilteredImages(filteredGroups);
  };

  const handleSearchSubmit = () => {
      const { ticket_number, haul_vendor, material, job_number, date_from, date_to } = searchFilters;
      const hasValue = ticket_number || haul_vendor || material || job_number || date_from || date_to;

      if (!hasValue) {
          Alert.alert("Search Error", "Please fill in at least one field to search.");
          return;
      }

      performSearch();
      setIsSearching(true);
      setIsSearchModalVisible(false);
  };

  const clearSearch = () => {
      setSearchFilters({
          ticket_number: "",
          haul_vendor: "",
          material: "",
          job_number: "",
          date_from: "",
          date_to: "",
      });
      setIsSearching(false);
      setFilteredImages([]);
      fetchTickets();
  };

  // --- EXPORT LOGIC (CSV) ---
  const handleExportCSV = async () => {
    const ticketsToExport = displayData.flatMap((group) => group.images);
    if (ticketsToExport.length === 0) {
      Alert.alert("No Data", "There are no tickets to export based on current filters.");
      return;
    }
  
    try {
      setIsLoading(true);
      const headers = [
        "Ticket Number", "Date", "Vendor", "Truck #", "Material", "Category", 
        "Sub Category", "Job #", "Phase Code", "Zone", "Hours", "Table Data (JSON)", 
        "Image URL", "Status"
      ];
  
      const csvRows = ticketsToExport.map((t) => {
        const escape = (val: any) => {
          if (val === null || val === undefined) return '""';
          const stringVal = String(val);
          if (stringVal.includes('"') || stringVal.includes(',') || stringVal.includes('\n')) {
            return `"${stringVal.replace(/"/g, '""')}"`;
          }
          return `"${stringVal}"`;
        };
  
        const fullPath = getImageUri(t.image_url);
        let tableJson = "";
        if (t.table_data && Array.isArray(t.table_data)) {
            tableJson = JSON.stringify(t.table_data);
        }
  
        return [
          escape(t.ticket_number), escape(t.ticket_date), escape(t.haul_vendor),
          escape(t.truck_number), escape(t.material), escape(t.category),
          escape(t.sub_category), escape(t.job_number), escape(t.phase_code_),
          escape(t.zone), escape(t.hours), escape(tableJson),
          escape(fullPath), escape(t.submitted ? "Submitted" : "Pending")
        ].join(",");
      });
  
      const csvString = `${headers.join(",")}\n${csvRows.join("\n")}`;
      const path = `${RNFS.TemporaryDirectoryPath}/TicketExport_${new Date().getTime()}.csv`;
      await RNFS.writeFile(path, csvString, 'utf8');
      await Share.open({
        title: "Export Tickets",
        message: "Here is the ticket data export.",
        url: `file://${path}`,
        type: 'text/csv',
        failOnCancel: false 
      });
  
    } catch (error) {
      console.error(error);
      Alert.alert("Export Error", "Failed to generate or share the CSV file.");
    } finally {
      setIsLoading(false);
    }
  };

  // --- SUBMIT LOGIC ---
  const handleSubmitTickets = async (date: string, ticketIds: number[]) => {
    if (!ticketIds || ticketIds.length === 0) {
      Alert.alert("No pending tickets", "All tickets for this date are already submitted.");
      return;
    }
    const group = imagesByDate.find((g) => g.date === date);
    if (group) {
      const ticketsToSubmit = group.images.filter((img) => ticketIds.includes(img.id));
      for (const ticket of ticketsToSubmit) {
        const missing = getMissingFields(ticket);
        if (missing.length > 0) {
          Alert.alert("Incomplete Data", `Ticket #${ticket.ticket_number || ticket.id} is missing: ${missing.join(", ")}.\n\nPlease edit the ticket before submitting.`);
          return;
        }
      }
    }
    try {
      setIsLoading(true);
      const res = await axios.post(`${API_BASE_URL}/api/tickets/submit`, { ticket_ids: ticketIds });
      if (res.status === 200) {
        Alert.alert("Success", "Tickets submitted successfully!");
        fetchTickets();
      }
    } catch (err) {
      Alert.alert("Error", "Failed to submit tickets.");
    } finally {
      setIsLoading(false);
    }
  };

  const handleCloseModal = () => {
    if (isSaving || isDeleting) return;
    setSelectedTicket(null);
  };

  // --- TABLE OPERATIONS ---
  const handleRemoveRow = (rowIndex: number) => {
    const rowToRemove = formData.table_data[rowIndex];
    const newTableData = formData.table_data.filter((_, idx) => idx !== rowIndex);
    const rowString = rowToRemove.join(" | ");
    const markedRowString = `[#${rowIndex}] ${rowString}`;
    const newExtraText = formData.extra_text ? `${formData.extra_text}\n${markedRowString}` : markedRowString;
    setFormData({ ...formData, table_data: newTableData, extra_text: newExtraText });
  };

  const handleAddRow = () => {
    const columnCount = formData.table_data.length > 0 ? formData.table_data[0].length : 5;
    const newRow = new Array(columnCount).fill("");
    setFormData({ ...formData, table_data: [...formData.table_data, newRow] });
  };

  const handleInsertRowAt = (rowIndex: number) => {
    const newTableData = [...formData.table_data];
    const columnCount = newTableData.length > 0 ? newTableData[0].length : 5;
    const newRow = new Array(columnCount).fill("");
    newTableData.splice(rowIndex, 0, newRow);
    setFormData({ ...formData, table_data: newTableData });
  };

  const handleAddColumn = (colIndex: number) => {
    const newTableData = formData.table_data.map(row => {
      const newRow = [...row];
      newRow.splice(colIndex, 0, "");
      return newRow;
    });
    if (newTableData.length === 0) newTableData.push([""]);
    setFormData({ ...formData, table_data: newTableData });
  };

  const handleRemoveColumn = (colIndex: number) => {
    Alert.alert("Remove Column", "Delete this column and its data?", [
      { text: "Cancel", style: "cancel" },
      { text: "Delete", style: "destructive", onPress: () => {
        const newTableData = formData.table_data.map(row => {
          const newRow = [...row];
          newRow.splice(colIndex, 1);
          return newRow;
        });
        setFormData({ ...formData, table_data: newTableData });
      }}
    ]);
  };

  const handleRestoreLine = (line: string, index: number) => {
    const posMatch = line.match(/^\[#(\d+)\]\s?/);
    let cleanLine = line;
    let targetIndex = -1;
    if (posMatch) {
      targetIndex = parseInt(posMatch[1], 10);
      cleanLine = line.replace(/^\[#\d+\]\s?/, "");
    }
    const newRow = cleanLine.split("|").map((cell) => cell.trim());
    const newTableData = [...formData.table_data];
    const currentCols = newTableData.length > 0 ? newTableData[0].length : newRow.length;
    while (newRow.length < currentCols) newRow.push("");
    while (newRow.length > currentCols) newRow.pop();
    if (targetIndex !== -1 && targetIndex <= newTableData.length) {
      newTableData.splice(targetIndex, 0, newRow);
    } else {
      newTableData.push(newRow);
    }
    const extraLines = formData.extra_text.split("\n");
    const newExtraText = extraLines.filter((_, idx) => idx !== index).join("\n");
    setFormData({ ...formData, table_data: newTableData, extra_text: newExtraText });
  };

  // --- SAVE & EDIT LOGIC ---
  const handleSaveText = async () => {
    if (!selectedTicket || !user || isDeleting) return;
    const missingFields = getMissingFields(formData);
    if (missingFields.length > 0) {
      Alert.alert("Missing Information", `Please fill in the following required fields:\n${missingFields.join(", ")}`);
      return;
    }
    setIsSaving(true);
    try {
      const checkRes = await axios.post(`${API_BASE_URL}/api/ocr/check-ticket-availability`, {
        ticket_number: formData.ticket_number,
        exclude_ticket_id: selectedTicket.id 
      });

      if (checkRes.data.exists) {
        setIsSaving(false); 
        Alert.alert(
          "Duplicate Ticket Detected",
          `Ticket ${formData.ticket_number} already exists.\n\nIs this an updated version?`,
          [
            { text: "Cancel", style: "cancel", onPress: () => { } },
            {
              text: `Yes, save as ${checkRes.data.next_version}`,
              onPress: () => {
                const newPayload = { ...formData, ticket_number: checkRes.data.next_version };
                setFormData(newPayload); 
                performFinalSave(newPayload); 
              }
            }
          ]
        );
        return; 
      }
      await performFinalSave(formData);
    } catch (err) {
      setIsSaving(false);
      Alert.alert("Error", "Failed to check ticket availability or save.");
    }
  };

  const performFinalSave = async (dataToSave: typeof formData) => {
    try {
        setIsSaving(true);
        const hoursFloat = parseFloat(dataToSave.hours);
        const payload = {
          ticket_id: selectedTicket!.id,
          foreman_id: user!.id,
          ticket_number: dataToSave.ticket_number,
          ticket_date: dataToSave.ticket_date,
          haul_vendor: dataToSave.haul_vendor,
          truck_number: dataToSave.truck_number,
          material: dataToSave.material,
          job_number: dataToSave.job_number,
          phase_code_: dataToSave.phase_code_,
          zone: dataToSave.zone,
          hours: isNaN(hoursFloat) ? null : hoursFloat,
          table_data: dataToSave.table_data,
          raw_text: dataToSave.extra_text,
        };
        await axios.post(`${API_BASE_URL}/api/ocr/update-ticket-text`, payload);
        Alert.alert("Success", "Ticket updated successfully.");
        setIsEditingFullScreen(false);
        handleCloseModal();
        fetchTickets();
    } catch (error) {
        Alert.alert("Error", "Failed to save final changes.");
    } finally {
        setIsSaving(false);
    }
  };

  const handleDeleteTicket = async () => {
    if (!selectedTicket || !user || isSaving) return;
    Alert.alert("Delete Ticket", "Are you sure? This cannot be undone.", [
      { text: "Cancel", style: "cancel" },
      {
        text: "Delete",
        style: "destructive",
        onPress: async () => {
          setIsDeleting(true);
          try {
            await axios.post(`${API_BASE_URL}/api/ocr/delete-ticket`, {
              ticket_id: selectedTicket.id,
              foreman_id: user.id,
            });
            Alert.alert("Success", "Ticket deleted.");
            handleCloseModal();
            fetchTickets();
          } catch (err) {
            Alert.alert("Error", "Failed to delete ticket.");
          } finally {
            setIsDeleting(false);
          }
        },
      },
    ]);
  };

  const modalPdfUri = getImageUri(selectedTicket?.image_url);
  const modalPdfSource = modalPdfUri ? { uri: modalPdfUri, cache: true } : undefined;
  const displayData = isSearching ? filteredImages : imagesByDate;
  const totalTickets = displayData.reduce((acc, group) => acc + group.images.length, 0);

  return (
    <View style={{ flex: 1 }}>
      {/* --- SEARCH HEADER BAR --- */}
      <View style={styles.searchHeaderBar}>
         <View style={{flexDirection: 'row', alignItems: 'center'}}>
            <Icon name="layers" size={18} color={THEME.colors.subtleLight} />
            <Text style={styles.searchHeaderTitle}>
                {isSearching 
                  ? `Found ${totalTickets} Ticket${totalTickets !== 1 ? 's' : ''}` 
                  : `All Tickets (${totalTickets})`}
            </Text>
         </View>
         
         <View style={{ flexDirection: 'row', alignItems: 'center' }}>
             <TouchableOpacity 
                style={[styles.searchIconBtn, { marginRight: 8 }]} 
                onPress={handleExportCSV}
             >
                <Icon name="upload" size={20} color={THEME.colors.primary} />
             </TouchableOpacity>

             {isSearching && (
                 <TouchableOpacity onPress={clearSearch} style={styles.clearSearchBtn}>
                     <Text style={styles.clearSearchText}>Clear</Text>
                 </TouchableOpacity>
             )}
             <TouchableOpacity 
                style={styles.searchIconBtn}
                onPress={() => setIsSearchModalVisible(true)}
             >
                <Icon name="search" size={20} color={THEME.colors.primary} />
             </TouchableOpacity>
         </View>
      </View>

      <ScrollView
        contentContainerStyle={styles.scrollContent}
        refreshControl={
          <RefreshControl refreshing={isLoading} onRefresh={fetchTickets} />
        }
      >
        {displayData.length === 0 && !isLoading ? (
          <View style={styles.emptyContainer}>
            {isSearching ? (
                  <View style={{ alignItems: 'center' }}>
                      <Icon name="search" size={48} color={THEME.colors.subtleLight} />
                      <Text style={styles.emptyText}>No tickets match your filters.</Text>
                      <TouchableOpacity style={styles.linkButton} onPress={clearSearch}>
                          <Text style={styles.linkButtonText}>Clear Search</Text>
                      </TouchableOpacity>
                   </View>
            ) : (
                  <View style={{ alignItems: 'center' }}>
                      <Icon name="camera" size={48} color={THEME.colors.brandStone} />
                      <Text style={styles.emptyText}>No tickets to review.</Text>
                   </View>
            )}
          </View>
        ) : (
          displayData.map((group) => {
            const ticketsByCategory = getTicketsByCategory(group.images);
            const categories = Object.keys(ticketsByCategory).sort((a, b) => {
              if (a === 'Materials') return -1;
              if (b === 'Materials') return 1;
              return a.localeCompare(b);
            });

             return (
               <View key={group.date} style={styles.groupContainer}>
                 {/* --- DATE HEADER & SUBMIT BUTTON --- */}
                 <View style={styles.headerRow}>
                   {/* ✅ VISUALLY FORMAT HEADER AS MM-DD-YYYY */}
                   <Text style={styles.dateText}>
                      {(() => {
                         const parts = group.date.split('-');
                         if (parts.length === 3 && parts[0].length === 4) {
                            return `${parts[1]}-${parts[2]}-${parts[0]}`;
                         }
                         return group.date;
                      })()}
                   </Text>
                   <TouchableOpacity
                     style={[
                       styles.submitButton,
                       group.isFullySubmitted && { backgroundColor: THEME.colors.success },
                     ]}
                     onPress={() => handleSubmitTickets(group.date, group.unsubmittedTicketIds || [])}
                     disabled={group.isFullySubmitted}
                   >
                     <Text style={styles.submitButtonText}>
                       {group.isFullySubmitted ? "All Submitted" : "Submit Daily Log"}
                     </Text>
                   </TouchableOpacity>
                 </View>
 
                 {/* --- SEPARATE ROWS PER CATEGORY --- */}
                 {categories.map((category) => {
                   const ticketsInCat = ticketsByCategory[category];
                   let materialBreakdown = null;
                   if (category === 'Materials') {
                     const counts: Record<string, number> = {};
                     ticketsInCat.forEach(t => {
                       const sub = t.sub_category || t.material || "Unspecified";
                       counts[sub] = (counts[sub] || 0) + 1;
                     });
                     materialBreakdown = Object.entries(counts)
                        .map(([k, v]) => `${k}: ${v}`)
                        .join("  |  ");
                   }

                   return (
                     <View key={category} style={styles.categorySection}>
                       <View style={styles.categoryHeaderRow}>
                         <Icon 
                           name={category === 'Materials' ? 'box' : category === 'Trucking' ? 'truck' : 'file'} 
                           size={14} 
                           color={THEME.colors.primary} 
                         />
                         <Text style={styles.categoryTitle}>{category}</Text>
                         <View style={styles.countBadge}>
                           <Text style={styles.countText}>{ticketsInCat.length}</Text>
                         </View>
                       </View>

                       {materialBreakdown && (
                         <Text style={styles.materialBreakdownText}>{materialBreakdown}</Text>
                       )}
   
                       <ScrollView
                         horizontal
                         showsHorizontalScrollIndicator={false}
                         style={styles.thumbnailScrollContainer}
                         contentContainerStyle={{ paddingRight: 20 }}
                       >
                         {ticketsInCat.map((img) => {
                           const pdfUri = getImageUri(img.image_url);
                           const source = pdfUri ? { uri: pdfUri, cache: true } : undefined;
                           
                           return (
                             <TouchableOpacity
                               key={img.id}
                               onPress={() => pdfUri && setSelectedTicket(img)}
                               style={{ marginRight: 12 }} 
                             >
                               <View style={styles.pdfThumbnailContainer}>
                                 {source ? (
                                   <Pdf
                                     source={source}
                                     style={styles.thumbnailImage}
                                     scale={1}
                                     page={1}
                                     trustAllCerts={false}
                                   />
                                 ) : (
                                   <View style={styles.thumbnailImage} />
                                 )}
                               </View>
                               <Text style={styles.thumbnailLabel} numberOfLines={2}>
                                   {category === 'Materials' 
                                     ? `${img.sub_category || img.material || 'Mat'}\n#${img.ticket_number || '--'}`
                                     : `#${img.ticket_number || 'View'}`}
                               </Text>
   
                               {!img.submitted && (
                                 <View style={styles.pendingBadge}>
                                   <Text style={styles.pendingBadgeText}>Pending</Text>
                                 </View>
                               )}
                             </TouchableOpacity>
                           );
                         })}
                       </ScrollView>
                     </View>
                   );
                 })}
               </View>
             );
          })
        )}
      </ScrollView>

      {/* --- SEARCH MODAL --- */}
      <Modal visible={isSearchModalVisible} animationType="fade" transparent>
          <KeyboardAvoidingView 
              behavior={Platform.OS === "ios" ? "padding" : "height"}
              style={styles.modalContainer}
          >
             <View style={[styles.modalContent, { flex: 0, height: 'auto', maxHeight: '90%', borderRadius: 16 }]}>
                <View style={styles.fullScreenHeader}>
                    <Text style={styles.fullScreenTitle}>Advanced Search</Text>
                    <TouchableOpacity onPress={() => setIsSearchModalVisible(false)}>
                        <Icon name="x" size={24} color="#fff" />
                    </TouchableOpacity>
                </View>
                
                <ScrollView style={{ padding: 16 }}>
                    <Text style={styles.formHelperText}>
                        Enter filters below. Leave fields empty to ignore them.
                    </Text>

                    {/* --- DATE RANGE SECTION --- */}
                    <Text style={styles.formLabel}>Date Range</Text>
                    <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 16 }}>
                        
                        {/* FROM DATE */}
                        <TouchableOpacity 
                            style={[styles.formInput, { flex: 1, marginRight: 8, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }]}
                            onPress={() => openDatePicker('from')}
                        >
                            <Text style={{ color: searchFilters.date_from ? '#fff' : '#666' }}>
                                {searchFilters.date_from || "From (MM-DD-YYYY)"}
                            </Text>
                            <Icon name="calendar" size={16} color={THEME.colors.primary} />
                        </TouchableOpacity>

                        {/* TO DATE */}
                        <TouchableOpacity 
                            style={[styles.formInput, { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }]}
                            onPress={() => openDatePicker('to')}
                        >
                             <Text style={{ color: searchFilters.date_to ? '#fff' : '#666' }}>
                                {searchFilters.date_to || "To (MM-DD-YYYY)"}
                            </Text>
                            <Icon name="calendar" size={16} color={THEME.colors.primary} />
                        </TouchableOpacity>
                    </View>

                    {/* ✅ NATIVE DATE PICKER - ONLY FOR SEARCH MODES */}
                    {showDatePicker && datePickerMode !== 'edit_ticket_date' && (
                        <DateTimePicker
                            value={new Date()}
                            mode="date"
                            display={Platform.OS === 'ios' ? 'spinner' : 'default'}
                            onChange={onDateChange}
                            maximumDate={new Date()} 
                        />
                    )}

                    <FormField 
                        label="Ticket Number"
                        value={searchFilters.ticket_number}
                        onChange={(t: string) => setSearchFilters({...searchFilters, ticket_number: t})}
                    />
                    <FormField 
                        label="Vendor"
                        value={searchFilters.haul_vendor}
                        onChange={(t: string) => setSearchFilters({...searchFilters, haul_vendor: t})}
                    />
                    <FormField 
                        label="Material Type"
                        value={searchFilters.material}
                        onChange={(t: string) => setSearchFilters({...searchFilters, material: t})}
                    />
                    <FormField 
                        label="Job Number"
                        value={searchFilters.job_number}
                        onChange={(t: string) => setSearchFilters({...searchFilters, job_number: t})}
                    />

                    <View style={{ marginTop: 20, marginBottom: 40 }}>
                        <TouchableOpacity 
                            style={[styles.modalButton, { backgroundColor: THEME.colors.primary, marginBottom: 12 }]}
                            onPress={handleSearchSubmit}
                        >
                            <Text style={styles.modalButtonText}>Search Tickets</Text>
                        </TouchableOpacity>
                        
                        <TouchableOpacity 
                            style={[styles.modalButton, { backgroundColor: '#444' }]}
                            onPress={() => {
                                clearSearch();
                                setIsSearchModalVisible(false);
                            }}
                        >
                            <Text style={styles.modalButtonText}>Reset Filters</Text>
                        </TouchableOpacity>
                    </View>
                </ScrollView>
             </View>
          </KeyboardAvoidingView>
      </Modal>

      {/* --- Quick View Modal --- */}
      <Modal visible={!!selectedTicket} transparent animationType="fade">
        <SafeAreaView style={styles.modalContainer}>
          <View style={styles.modalContent}>
            <TouchableOpacity
              style={styles.closeButton}
              onPress={handleCloseModal}
            >
              <Icon name="x" size={28} color="#fff" />
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.modalPdfView}
              onPress={() => setIsPdfFullScreen(true)}
              activeOpacity={0.9}
            >
              {modalPdfSource ? (
                <Pdf
                  source={modalPdfSource}
                  style={styles.fullPdf}
                  trustAllCerts={false}
                />
              ) : (
                <ActivityIndicator size="large" color="#fff" />
              )}
            </TouchableOpacity>

            <View style={styles.modalStructuredDataView}>
              <View style={styles.modalDataHeaderRow}>
                <Text style={styles.modalSectionHeader}>Details</Text>
                {selectedTicket && !selectedTicket.submitted && (
                  <TouchableOpacity
                    onPress={() => setIsEditingFullScreen(true)}
                  >
                    <Text style={{ color: THEME.colors.pending, fontWeight: "bold", fontSize: 16 }}>
                      Edit All
                    </Text>
                  </TouchableOpacity>
                )}
              </View>

              <ScrollView contentContainerStyle={styles.modalSectionScroll}>
                <InfoRow label="Ticket #" value={selectedTicket?.ticket_number} />
                <InfoRow label="Date" value={selectedTicket?.ticket_date} />
                <InfoRow label="Vendor" value={selectedTicket?.haul_vendor} />
                <InfoRow label="Truck #" value={selectedTicket?.truck_number} />
                <InfoRow label="Material" value={selectedTicket?.material} />
                <InfoRow label="Job #" value={selectedTicket?.job_number} />
                <InfoRow label="Phase Code" value={selectedTicket?.phase_code_} />
                <InfoRow label="Zone" value={selectedTicket?.zone} />
                <InfoRow label="Hours" value={selectedTicket?.hours} />

                <View style={styles.divider} />
                <Text style={[styles.modalSectionHeader, { fontSize: 14 }]}>Detailed Table (Read Only)</Text>
                <EditableOCRTable
                  data={selectedTicket?.table_data || []}
                  isEditable={false}
                  onUpdateData={() => {}}
                />
              </ScrollView>
            </View>

            {selectedTicket && !selectedTicket.submitted && (
              <View style={styles.modalButtonContainer}>
                <TouchableOpacity
                  style={[styles.modalButton, styles.modalButtonDelete]}
                  onPress={handleDeleteTicket}
                  disabled={isDeleting}
                >
                  {isDeleting ? <ActivityIndicator color="#fff" /> : <Text style={styles.modalButtonText}>Delete Ticket</Text>}
                </TouchableOpacity>
              </View>
            )}
          </View>
        </SafeAreaView>
      </Modal>

      {/* --- Full-Screen Edit Modal --- */}
      <Modal visible={isEditingFullScreen} animationType="slide">
        <SafeAreaView style={styles.fullScreenModalContainer}>
          <View style={styles.fullScreenHeader}>
            <TouchableOpacity onPress={() => setIsEditingFullScreen(false)} style={styles.fullScreenHeaderButton}>
              <Text style={styles.fullScreenCancelButtonText}>Cancel</Text>
            </TouchableOpacity>
            <Text style={styles.fullScreenTitle}>Edit Ticket</Text>
            <TouchableOpacity onPress={handleSaveText} style={styles.fullScreenHeaderButton} disabled={isSaving}>
              {isSaving ? <ActivityIndicator color={THEME.colors.primary} size="small" /> : <Text style={styles.fullScreenDoneButtonText}>Save</Text>}
            </TouchableOpacity>
          </View>

          <KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : "height"} style={styles.fullScreenKAV}>
            <ScrollView contentContainerStyle={styles.formScrollContent}>
              <Text style={styles.formSectionTitle}>Structured Data</Text>
              <Text style={styles.formHelperText}>If a field is missing, enter ‘None’</Text>
              
              <FormField label="Ticket Number" value={formData.ticket_number} onChange={(t: string) => setFormData({ ...formData, ticket_number: t })} required />
              
              {/* ✅ UPDATED EDIT DATE FIELD WITH RED ASTERISK */}
              <View style={{ flexDirection: 'row' }}>
                  <Text style={styles.formLabel}>Date</Text>
                  <Text style={{ color: THEME.colors.danger, marginLeft: 4 }}>*</Text>
              </View>
              <TouchableOpacity 
                style={[styles.formInput, { marginBottom: 16, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }]}
                onPress={() => openDatePicker('edit_ticket_date')}
              >
                <Text style={{ color: formData.ticket_date ? '#fff' : '#666' }}>
                    {formData.ticket_date || "Select Date (MM-DD-YYYY)"}
                </Text>
                <Icon name="calendar" size={16} color={THEME.colors.primary} />
              </TouchableOpacity>

              {/* ✅ ADDED PICKER COMPONENT HERE FOR EDIT MODAL */}
              {showDatePicker && datePickerMode === 'edit_ticket_date' && (
                  <DateTimePicker
                      value={new Date()}
                      mode="date"
                      display={Platform.OS === 'ios' ? 'spinner' : 'default'}
                      onChange={onDateChange}
                      maximumDate={new Date()} 
                  />
              )}

              <FormField label="Vendor" value={formData.haul_vendor} onChange={(t: string) => setFormData({ ...formData, haul_vendor: t })} required />
              <View style={styles.rowInputs}>
                <View style={{ flex: 1, marginRight: 8 }}>
                  <FormField label="Truck #" value={formData.truck_number} onChange={(t: string) => setFormData({ ...formData, truck_number: t })} required />
                </View>
                <View style={{ flex: 1 }}>
                  <FormField label="Hours" value={formData.hours} onChange={(t: string) => setFormData({ ...formData, hours: t })} keyboardType="numeric" required />
                </View>
              </View>
              <FormField label="Material" value={formData.material} onChange={(t: string) => setFormData({ ...formData, material: t })} required />
              <FormField label="Job Number" value={formData.job_number} onChange={(t: string) => setFormData({ ...formData, job_number: t })} required />
              <View style={styles.rowInputs}>
                <View style={{ flex: 1, marginRight: 8 }}>
                  <FormField label="Phase Code" value={formData.phase_code_} onChange={(t: string) => setFormData({ ...formData, phase_code_: t })} required />
                </View>
                <View style={{ flex: 1 }}>
                  <FormField label="Zone" value={formData.zone} onChange={(t: string) => setFormData({ ...formData, zone: t })} required />
                </View>
              </View>
              <View style={styles.divider} />
              <Text style={styles.formSectionTitle}>Detailed Table (Editable)</Text>
              <Text style={styles.formHelperText}>
                Use <Icon name="plus" size={12} color="#fff"/> in headers to add columns. 
                Use <Icon name="chevrons-up" size={12} color={THEME.colors.success}/> to insert a row above.
              </Text>
              <EditableOCRTable
                data={formData.table_data}
                isEditable={true}
                onUpdateData={(newData) => setFormData({ ...formData, table_data: newData })}
                onRemoveRow={handleRemoveRow}
                onAddRow={handleAddRow}
                onInsertRowAt={handleInsertRowAt}
                onAddColumn={handleAddColumn}
                onRemoveColumn={handleRemoveColumn}
              />
              <View style={{ height: 20 }} />
              <Text style={styles.formSectionTitle}>Removed / Extra Text</Text>
              <Text style={styles.formHelperText}>Tap <Icon name="plus" color={THEME.colors.success} size={12} /> to add a line back into the table.</Text>
              {formData.extra_text.trim().length > 0 && (
                <View style={{ marginBottom: 16 }}>
                  {formData.extra_text.split("\n").map((line, index) => {
                    if (line.trim() === "") return null;
                    const displayLine = line.replace(/^\[#\d+\]\s?/, "");
                    return (
                      <View key={index} style={styles.restoreRow}>
                        <Text style={styles.restoreText} numberOfLines={1}>{displayLine}</Text>
                        <TouchableOpacity style={styles.restoreButton} onPress={() => handleRestoreLine(line, index)}>
                          <Icon name="plus" size={18} color={THEME.colors.success} />
                        </TouchableOpacity>
                      </View>
                    );
                  })}
                </View>
              )}
              <FormField label="Edit Raw Extra Text" value={formData.extra_text} onChange={(t: string) => setFormData({ ...formData, extra_text: t })} multiline={true} height={200} />
              <View style={{ height: 200 }} />
            </ScrollView>
          </KeyboardAvoidingView>
        </SafeAreaView>
      </Modal>

      <Modal visible={isPdfFullScreen} transparent={false} animationType="slide">
        <SafeAreaView style={styles.fullScreenPdfContainer}>
          <View style={styles.fullScreenHeader}>
            <Text style={styles.fullScreenTitle}>Ticket PDF</Text>
            <TouchableOpacity onPress={() => setIsPdfFullScreen(false)} style={styles.fullScreenHeaderButton}>
              <Text style={styles.fullScreenDoneButtonText}>Done</Text>
            </TouchableOpacity>
          </View>
          {modalPdfSource && (
            <Pdf source={modalPdfSource} style={styles.fullScreenPdf} trustAllCerts={false} />
          )}
        </SafeAreaView>
      </Modal>
    </View>
  );
};

// --- ReviewTimesheets & Main ReviewScreen ---
const ReviewTimesheets = ({ navigation }: { navigation: any }) => {
  const { user } = useAuth();
  const [drafts, setDrafts] = useState<Timesheet[]>([]);
  const [loading, setLoading] = useState(false);

  const fetchDrafts = async () => {
    if (!user) return;
    setLoading(true);
    try {
      const response = await axios.get(`${API_BASE_URL}/api/timesheets/drafts/by-foreman/${user.id}`);
      setDrafts(response.data);
    } catch (e) {
      Alert.alert("Error", "Failed to fetch draft timesheets.");
    } finally {
      setLoading(false);
    }
  };

  useFocusEffect(useCallback(() => { fetchDrafts(); }, [user]));

  const handleSendTimesheet = async (timesheetId: number) => {
    Alert.alert("Confirm", "Send this timesheet?", [
      { text: "Cancel", style: "cancel" },
      {
        text: "Send",
        style: "destructive",
        onPress: async () => {
          setLoading(true);
          try {
            await axios.post(`${API_BASE_URL}/api/timesheets/${timesheetId}/send`);
            Alert.alert("Success", "Timesheet sent.");
            fetchDrafts();
          } catch (error) {
            Alert.alert("Error", "Could not send timesheet.");
          } finally {
            setLoading(false);
          }
        },
      },
    ]);
  };

  return (
    <FlatList
      data={drafts}
      keyExtractor={(item) => item.id.toString()}
      contentContainerStyle={styles.scrollContent}
      refreshControl={<RefreshControl refreshing={loading} onRefresh={fetchDrafts} tintColor={THEME.colors.primary} />}
      renderItem={({ item }) => (
        <View style={styles.tsItemOuterContainer}>
          <TouchableOpacity style={styles.tsItemContainer} onPress={() => navigation.navigate("TimesheetEdit", { timesheetId: item.id })}>
            <View style={styles.tsItemTextContainer}>
              <Text style={styles.tsItemTitle}>{item.timesheet_name || "Untitled Timesheet"}</Text>
              <Text style={styles.tsItemSubtitle}>Date: {new Date(item.date).toLocaleDateString()}</Text>
            </View>
          </TouchableOpacity>
          <TouchableOpacity style={styles.tsSendButton} onPress={() => handleSendTimesheet(item.id)}>
            <Icon name="send" size={20} color={THEME.colors.primary} />
            <Text style={styles.tsSendButtonText}>Send</Text>
          </TouchableOpacity>
        </View>
      )}
      ListEmptyComponent={<View style={styles.emptyContainer}><Text style={styles.emptyText}>No drafts.</Text></View>}
    />
  );
};

const ReviewScreen = ({ navigation }: { navigation: any }) => {
  const [activeTab, setActiveTab] = useState<"tickets" | "timesheets">("tickets");
  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <View style={styles.tabContainer}>
          <TouchableOpacity style={[styles.tab, activeTab === "tickets" && styles.activeTab]} onPress={() => setActiveTab("tickets")}>
            <Text style={[styles.tabText, activeTab === "tickets" && styles.activeTabText]}>Tickets</Text>
          </TouchableOpacity>
          <TouchableOpacity style={[styles.tab, activeTab === "timesheets" && styles.activeTab]} onPress={() => setActiveTab("timesheets")}>
            <Text style={[styles.tabText, activeTab === "timesheets" && styles.activeTabText]}>Timesheets</Text>
          </TouchableOpacity>
        </View>
      </View>
      {activeTab === "tickets" ? <ReviewTickets /> : <ReviewTimesheets navigation={navigation} />}
    </SafeAreaView>
  );
};

// --- STYLES ---
const THEME = {
  colors: {
    primary: "#4A5C4D",
    backgroundLight: "#F8F7F2",
    contentLight: "#3D3D3D",
    subtleLight: "#797979",
    cardLight: "#FFFFFF",
    border: "#E5E5E5",
    brandStone: "#8E8E8E",
    success: "#16A34A",
    pending: "#FACC15",
    danger: "#DC2626",
    inputBg: "#2C2C2E",
    inputText: "#E0E0E0",
  },
  borderRadius: { sm: 8, md: 12, lg: 16, tiny: 6 },
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: THEME.colors.backgroundLight },
  scrollContent: { padding: 16, flexGrow: 1 },

  header: {
    paddingHorizontal: 16,
    paddingBottom: 16,
    paddingTop: 8,
    backgroundColor: THEME.colors.cardLight,
    borderBottomWidth: 1,
    borderBottomColor: THEME.colors.border,
  },
  tabContainer: {
    flexDirection: "row",
    backgroundColor: THEME.colors.border,
    borderRadius: THEME.borderRadius.sm,
    padding: 4,
  },
  tab: {
    flex: 1,
    paddingVertical: 10,
    alignItems: "center",
    borderRadius: THEME.borderRadius.tiny,
  },
  activeTab: { backgroundColor: THEME.colors.cardLight, elevation: 3 },
  tabText: {
    fontSize: 15,
    fontWeight: "600",
    color: THEME.colors.subtleLight,
  },
  activeTabText: { color: THEME.colors.primary },

  // --- Search Header Styles ---
  searchHeaderBar: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      paddingHorizontal: 16,
      paddingVertical: 12,
      backgroundColor: '#fff',
      borderBottomWidth: 1,
      borderBottomColor: '#eee',
  },
  searchHeaderTitle: {
      fontSize: 14,
      fontWeight: '600',
      color: THEME.colors.subtleLight,
      marginLeft: 8,
  },
  searchIconBtn: {
      padding: 8,
      backgroundColor: '#f0f0f0',
      borderRadius: 8,
  },
  clearSearchBtn: {
      marginRight: 10,
      paddingVertical: 4,
      paddingHorizontal: 8,
      backgroundColor: '#eee',
      borderRadius: 4
  },
  clearSearchText: {
      fontSize: 12,
      color: THEME.colors.danger,
      fontWeight: '600'
  },
  linkButton: {
      marginTop: 12,
      padding: 8,
  },
  linkButtonText: {
      color: THEME.colors.primary,
      fontWeight: '600',
      fontSize: 14,
  },

  groupContainer: {
    backgroundColor: "#fff",
    borderRadius: THEME.borderRadius.md,
    marginBottom: 20, 
    padding: 16, 
    elevation: 2,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  headerRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 8,
  },
  dateText: {
    fontSize: 16,
    fontWeight: "600",
    color: THEME.colors.contentLight,
  },

  // Category Section Styles
  categorySection: {
    marginTop: 12,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: "#F0F0F0",
  },
  categoryHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 4,
  },
  categoryTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: '#444',
    marginLeft: 6,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  countBadge: {
    backgroundColor: '#E5E7EB',
    borderRadius: 10,
    paddingHorizontal: 6,
    paddingVertical: 1,
    marginLeft: 8,
  },
  countText: {
    fontSize: 10,
    fontWeight: 'bold',
    color: '#666',
  },
   
  // Material Breakdown Style
  materialBreakdownText: {
    fontSize: 12,
    color: '#666',
    marginLeft: 24, 
    marginBottom: 10,
    fontStyle: 'italic',
  },
   
  // Thumbnail Styles
  thumbnailScrollContainer: { 
    flexDirection: "row",
    paddingVertical: 4 
  },
  pdfThumbnailContainer: {
    width: THUMBNAIL_WIDTH, 
    height: THUMBNAIL_HEIGHT,
    borderRadius: 8,
    backgroundColor: "#f5f5f5",
    overflow: "hidden",
    borderWidth: 1,
    borderColor: "#E5E5E5"
  },
  thumbnailImage: { width: "100%", height: "100%" },
  thumbnailLabel: {
    fontSize: 10, 
    color: '#666',
    marginTop: 4,
    textAlign: 'center',
    width: THUMBNAIL_WIDTH,
    fontWeight: '500',
    height: 28, 
  },

  submitButton: {
    backgroundColor: THEME.colors.primary,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: THEME.borderRadius.sm,
  },
  submitButtonText: { color: "#fff", fontWeight: "500" },
   
  pendingBadge: {
    position: "absolute",
    top: 4,     
    right: 4,    
    backgroundColor: THEME.colors.pending,
    borderRadius: 6,
    paddingHorizontal: 6,
    paddingVertical: 2,
    zIndex: 10,  
  },
  pendingBadgeText: { color: "#000", fontSize: 10, fontWeight: "bold" },

  modalContainer: { flex: 1, backgroundColor: "rgba(0,0,0,0.9)" },
  modalContent: { flex: 1, backgroundColor: "#1C1C1E" },
  closeButton: {
    position: "absolute",
    top: 35,
    right: 20,
    backgroundColor: "rgba(0,0,0,0.5)",
    borderRadius: 20,
    padding: 6,
    zIndex: 10,
  },
  modalPdfView: { flex: 2.5, marginTop: 80, backgroundColor: "#000" },
  fullPdf: { flex: 1, width: "100%" },
  modalStructuredDataView: {
    flex: 2,
    borderTopWidth: 1,
    borderTopColor: "#333",
    borderBottomWidth: 1,
    borderBottomColor: "#333",
    paddingHorizontal: 16,
    paddingTop: 16,
  },
  modalDataHeaderRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 8,
  },
  modalSectionHeader: {
    fontSize: 16,
    fontWeight: "600",
    color: "#fff",
    marginBottom: 8,
  },
  modalSectionScroll: { paddingTop: 8, paddingBottom: 16 },
  infoRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 10,
  },
  infoLabel: {
    fontSize: 14,
    color: "#AAA",
    fontWeight: "500",
    width: "30%",
  },
  infoValue: {
    fontSize: 14,
    color: "#E0E0E0",
    fontWeight: "600",
    width: "70%",
    textAlign: "right",
  },
  modalButtonContainer: {
    padding: 16,
    backgroundColor: "#2C2C2E",
    borderTopWidth: 1,
    borderTopColor: "#333",
    alignItems: "center",
  },
  modalButton: {
    paddingVertical: 12,
    paddingHorizontal: 32,
    borderRadius: THEME.borderRadius.sm,
    alignItems: "center",
  },
  modalButtonDelete: { backgroundColor: THEME.colors.danger },
  modalButtonText: { color: "#fff", fontSize: 15, fontWeight: "600" },

  // --- TABLE STYLES ---
  tableContainer: {
    borderWidth: 1,
    borderColor: "#444",
    borderRadius: 8,
    marginBottom: 16,
    marginTop: 8,
    backgroundColor: "#222",
    maxHeight: 400,
  },
  tableVerticalScroll: {
    maxHeight: 400,
  },
  tableRow: {
    flexDirection: "row",
    borderBottomWidth: 1,
    borderBottomColor: "#444",
    height: 42,
    alignItems: "center",
  },
  tableRowOdd: { backgroundColor: "transparent" },
  tableRowEven: { backgroundColor: "rgba(255,255,255,0.05)" },
  tableCell: {
    width: 140,
    borderRightWidth: 1,
    borderRightColor: "#444",
    justifyContent: "center",
    height: "100%",
  },
  tableCellText: {
    color: "#E0E0E0",
    fontSize: 13,
    paddingHorizontal: 8,
  },
  tableInput: {
    color: "#FFF",
    fontSize: 13,
    paddingHorizontal: 8,
    paddingVertical: 0,
    margin: 0,
    backgroundColor: "transparent",
    flex: 1,
    height: "100%",
  },
    
  // Left Control Column
  rowControlColumn: {
    width: 60, 
    height: "100%",
    flexDirection: "row",
    justifyContent: "space-evenly",
    alignItems: "center",
    borderRightWidth: 1,
    borderRightColor: "#444",
    backgroundColor: "rgba(0,0,0,0.2)",
  },
  controlBtn: {
    padding: 4,
  },

  // Header Row Styles
  headerRowContainer: {
      flexDirection: 'row',
      borderBottomWidth: 1,
      borderBottomColor: '#666',
      backgroundColor: '#333',
      height: 40,
      alignItems: 'center',
  },
  controlColumnSpacer: {
      width: 60, 
      height: '100%',
      borderRightWidth: 1,
      borderRightColor: "#666",
      backgroundColor: "#2a2a2a",
  },
  headerCell: {
      width: 140, 
      height: '100%',
      flexDirection: 'row',
      alignItems: 'center',
      borderRightWidth: 1,
      borderRightColor: '#666',
      paddingLeft: 4,
      paddingRight: 4,
      justifyContent: 'space-between'
  },
  insertColButton: {
      width: 20,
      height: 20,
      borderRadius: 10,
      backgroundColor: 'rgba(22, 163, 74, 0.4)', 
      justifyContent: 'center',
      alignItems: 'center',
      marginRight: 4,
  },
  headerLabelContainer: {
      flex: 1, 
      flexDirection: 'row', 
      justifyContent: 'space-between', 
      alignItems: 'center'
  },
  headerLabelText: {
      color: '#AAA',
      fontWeight: 'bold',
      fontSize: 12,
  },
  appendColButton: {
      flexDirection: 'row',
      alignItems: 'center',
      paddingHorizontal: 12,
      height: '100%',
      backgroundColor: 'rgba(59, 130, 246, 0.2)', 
  },
  appendColText: {
      color: '#fff',
      fontSize: 12,
      marginLeft: 6,
      fontWeight: 'bold',
  },
    
  // Add Row Button
  addRowButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "flex-start", 
    padding: 12,
    backgroundColor: "rgba(22, 163, 74, 0.2)",
    borderTopWidth: 1,
    borderTopColor: "#444",
  },
  addRowText: {
    color: THEME.colors.success,
    fontWeight: "600",
    marginLeft: 6,
    fontSize: 13,
  },

  restoreRow: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#333",
    padding: 10,
    borderRadius: 6,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: "#444",
  },
  restoreText: {
    flex: 1,
    color: "#fff",
    fontSize: 12,
    fontStyle: "italic",
  },
  restoreButton: {
    padding: 6,
    backgroundColor: "rgba(22, 163, 74, 0.2)",
    borderRadius: 4,
    marginLeft: 8,
  },

  fullScreenModalContainer: { flex: 1, backgroundColor: "#1C1C1E" },
  fullScreenHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: "#333",
  },
  fullScreenTitle: { fontSize: 18, fontWeight: "600", color: "#fff" },
  fullScreenHeaderButton: {
    padding: 8,
    minWidth: 60,
    alignItems: "center",
  },
  fullScreenDoneButtonText: {
    fontSize: 16,
    fontWeight: "600",
    color: "#fff",
  },
  fullScreenCancelButtonText: {
    fontSize: 16,
    fontWeight: "500",
    color: "#fff",
  },
  fullScreenKAV: { flex: 1 },
  formScrollContent: { padding: 16 },
  formSectionTitle: {
    color: "#ffffffff",
    fontSize: 13,
    fontWeight: "bold",
    textTransform: "uppercase",
    marginBottom: 12,
    marginTop: 8,
  },
  formHelperText: { color: "#fff", fontSize: 12, marginBottom: 16 },
  formGroup: { marginBottom: 16 },
  formLabel: {
    color: "#fff",
    fontSize: 12,
    marginBottom: 6,
    fontWeight: "500",
  },
  formInput: {
    backgroundColor: THEME.colors.inputBg,
    color: THEME.colors.inputText,
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
    borderWidth: 1,
    borderColor: "#333",
  },
  rowInputs: { flexDirection: "row" },
  divider: { height: 1, backgroundColor: "#333", marginVertical: 16 },

  fullScreenPdfContainer: { flex: 1, backgroundColor: "#1C1C1E" },
  fullScreenPdf: { flex: 1, width: "100%" },

  tsItemOuterContainer: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: THEME.colors.cardLight,
    borderRadius: THEME.borderRadius.sm,
    marginBottom: 12,
    elevation: 2,
  },
  tsItemContainer: { flex: 1, padding: 16 },
  tsItemTextContainer: { flex: 1 },
  tsItemTitle: {
    fontSize: 16,
    fontWeight: "600",
    color: THEME.colors.contentLight,
  },
  tsItemSubtitle: {
    fontSize: 14,
    color: THEME.colors.subtleLight,
    marginTop: 4,
  },
  tsSendButton: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 20,
    paddingVertical: 20,
    borderLeftWidth: 1,
    borderLeftColor: THEME.colors.border,
  },
  tsSendButtonText: {
    marginLeft: 8,
    color: THEME.colors.primary,
    fontWeight: "600",
    fontSize: 16,
  },
  emptyContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    paddingTop: 80,
  },
  emptyText: {
    marginTop: 16,
    fontSize: 17,
    fontWeight: "600",
    color: THEME.colors.subtleLight,
  },
});

export default ReviewScreen;