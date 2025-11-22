import React, { useState, useCallback, useEffect } from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  SafeAreaView,
  ScrollView,
  // Image, // <-- No longer needed for thumbnails
  ActivityIndicator,
  Dimensions,
  Alert,
  RefreshControl,
  Modal,
  FlatList,
  TextInput, // ⭐️ --- IMPORT TEXTINPUT ---
  KeyboardAvoidingView, // ⭐️ --- IMPORT KAV ---
  Platform, // ⭐️ --- IMPORT PLATFORM ---
} from "react-native";
import { useAuth } from "../../context/AuthContext";
import { useFocusEffect } from "@react-navigation/native";
import Icon from "react-native-vector-icons/Feather";
import axios from "axios";
import { Timesheet } from "../../types";
import Pdf from "react-native-pdf"; // ⭐️ --- IMPORT PDF ---

const { width } = Dimensions.get("window");
const THUMBNAIL_HEIGHT = 150;

// ✅ Replace with your backend ngrok or production URL
const API_BASE_URL = "https://fc29f671c77f.ngrok-free.app";

// --- TYPE DEFINITIONS ---

// ⭐️ --- UPDATED: Includes all structured data fields ---
interface TicketImage {
  id: number;
  image_url: string; // This will be the PDF path
  submitted: boolean;
  raw_text_content: string;
  // --- Structured Data ---
  ticket_number: string | null;
  ticket_date: string | null;
  haul_vendor: string | null;
  truck_number: string | null;
  material: string | null;
  job_number: string | null;
  phase_code: string | null;
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

// ⭐️ --- SIMPLIFIED AND CORRECTED URL BUILDER ---
const getImageUri = (imagePath?: string): string | null => {
  if (!imagePath) return null;
  if (imagePath.startsWith("http")) return imagePath;
  // imagePath is already the relative path, e.g., "/media/tickets/some_file.pdf"
  return `${API_BASE_URL}${imagePath}`;
};

// --- Helper Component for Structured Data ---
const InfoRow: React.FC<{ label: string; value: string | number | null | undefined;}> = ({
  label,
  value,
}) => (
  <View style={styles.infoRow}>
    <Text style={styles.infoLabel}>{label}</Text>
    <Text style={styles.infoValue}>{value || "N/A"}</Text>
  </View>
);

// --- Tickets Review Component (Original Logic) ---
const ReviewTickets: React.FC = () => {
  const { user } = useAuth();
  const [imagesByDate, setImagesByDate] = useState<TicketGroup[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  
  // ⭐️ --- MODAL STATE NOW HOLDS THE ENTIRE TICKET OBJECT ---
  const [selectedTicket, setSelectedTicket] = useState<TicketImage | null>(null);

  // ⭐️ --- NEW STATE FOR EDITING ---
  const [editedRawText, setEditedRawText] = useState<string>("");
  const [isSaving, setIsSaving] = useState(false);

  const fetchTickets = async () => {
    if (!user) return;
    setIsLoading(true);
    try {
      const res = await axios.get(
        `${API_BASE_URL}/api/ocr/images-by-date/${user.id}`
      );
      // Backend now sends TicketImage[] with structured data
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
    } catch (err) {
      console.error("fetchTickets error:", err);
      Alert.alert("Error", "Failed to load tickets.");
    } finally {
      setIsLoading(false);
    }
  };

  useFocusEffect(
    useCallback(() => {
      fetchTickets();
    }, [user])
  );

  // ⭐️ --- NEW: Load editor text when modal opens ---
  useEffect(() => {
    if (selectedTicket) {
      setEditedRawText(selectedTicket.raw_text_content || "");
    } else {
      setEditedRawText("");
    }
  }, [selectedTicket]);

  const handleSubmitTickets = async (date: string, ticketIds: number[]) => {
    if (!ticketIds || ticketIds.length === 0) {
      Alert.alert(
        "No pending tickets",
        "All tickets for this date are already submitted."
      );
      return;
    }

    try {
      setIsLoading(true);
      const res = await axios.post(`${API_BASE_URL}/api/tickets/submit`, {
        ticket_ids: ticketIds,
      });

      if (res.status === 200) {
        Alert.alert("Success", "Tickets submitted successfully!");
        fetchTickets();
      }
    } catch (err) {
      console.error("submit error:", err);
      Alert.alert("Error", "Failed to submit tickets.");
    } finally {
      setIsLoading(false);
    }
  };

  // ⭐️ --- NEW: Handle closing the modal ---
  const handleCloseModal = () => {
    if (isSaving) return;
    setSelectedTicket(null);
  };

  // ⭐️ --- NEW: Handle saving the edited text ---
  const handleSaveText = async () => {
    if (!selectedTicket || !user) return;

    setIsSaving(true);
    try {
      const payload = {
        ticket_id: selectedTicket.id,
        foreman_id: user.id,
        raw_text: editedRawText,
      };

      await axios.post(
        `${API_BASE_URL}/api/ocr/update-ticket-text`,
        payload
      );
      
      Alert.alert("Success", "Ticket updated successfully.");
      handleCloseModal(); // Close the modal
      fetchTickets(); // Re-fetch all data to show updates
      
    } catch (err) {
      console.error("Save error:", err);
      Alert.alert("Error", "Failed to save changes. Please try again.");
    } finally {
      setIsSaving(false);
    }
  };


  if (isLoading && imagesByDate.length === 0) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator size="large" color={THEME.colors.primary} />
      </View>
    );
  }

  // ⭐️ --- Get PDF URI for the selected ticket ---
  const modalPdfUri = getImageUri(selectedTicket?.image_url);
  const modalPdfSource = modalPdfUri
    ? { uri: modalPdfUri, cache: true }
    : undefined;

  return (
    <View style={{ flex: 1 }}>
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        refreshControl={
          <RefreshControl refreshing={isLoading} onRefresh={fetchTickets} />
        }
      >
        {imagesByDate.length === 0 && !isLoading ? (
          <View style={styles.emptyContainer}>
            <Icon name="camera" size={48} color={THEME.colors.brandStone} />
            <Text style={styles.emptyText}>No tickets to review.</Text>
            <Text style={styles.emptySubText}>
              Scanned tickets will appear here for submission.
            </Text>
          </View>
        ) : (
          imagesByDate.map((group) => (
            <View key={group.date} style={styles.groupContainer}>
              <View style={styles.headerRow}>
                <Text style={styles.dateText}>{group.date}</Text>
                <TouchableOpacity
                  style={[
                    styles.submitButton,
                    group.isFullySubmitted && {
                      backgroundColor: THEME.colors.success,
                    },
                  ]}
                  onPress={() =>
                    handleSubmitTickets(
                      group.date,
                      group.unsubmittedTicketIds || []
                    )
                  }
                  disabled={group.isFullySubmitted}
                >
                  <Text style={styles.submitButtonText}>
                    {group.isFullySubmitted ? "All Submitted" : "Submit"}
                  </Text>
                </TouchableOpacity>
              </View>

              <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                style={styles.thumbnailScrollContainer}
              >
                {group.images.map((img) => {
                  const pdfUri = getImageUri(img.image_url);
                  const source = pdfUri
                    ? { uri: pdfUri, cache: true }
                    : undefined;

                  return (
                    <TouchableOpacity
                      key={img.id}
                      // ⭐️ --- SET THE ENTIRE TICKET OBJECT ---
                      onPress={() => pdfUri && setSelectedTicket(img)}
                    >
                      {/* ⭐️ --- REPLACED IMAGE WITH PDF --- */}
                      <View style={styles.pdfThumbnailContainer}>
                        {source ? (
                          <Pdf
                            source={source}
                            style={styles.thumbnailImage}
                            // Fit to width
                            scale={1}
                            // Only show first page
                            page={1}
                            trustAllCerts={false}
                            onError={(error) => {
                              console.log("PDF Thumbnail Error:", error);
                            }}
                          />
                        ) : (
                          <View style={styles.thumbnailImage} />
                        )}
                      </View>

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
          ))
        )}
      </ScrollView>

      {/* ⭐️ --- FULLY UPDATED MODAL --- */}
      <Modal visible={!!selectedTicket} transparent animationType="fade">
        <KeyboardAvoidingView
          behavior={Platform.OS === "ios" ? "padding" : "height"}
          style={styles.modalContainer}
        >
          <View style={styles.modalContent}>
            <TouchableOpacity
              style={styles.closeButton}
              onPress={handleCloseModal}
            >
              <Icon name="x" size={28} color="#fff" />
            </TouchableOpacity>

            {/* PDF Viewer (Top Section) */}
            <View style={styles.modalPdfView}>
              {modalPdfSource ? (
                <Pdf
                  source={modalPdfSource}
                  style={styles.fullPdf}
                  trustAllCerts={false}
                  onError={(error) => {
                    console.log("PDF Modal Error:", error);
                    Alert.alert("Error", "Could not load PDF file.");
                    setSelectedTicket(null);
                  }}
                />
              ) : (
                <View style={styles.centered}>
                  <ActivityIndicator size="large" color="#fff" />
                </View>
              )}
            </View>

            {/* Structured Data (Middle Section) */}
            <View style={styles.modalStructuredDataView}>
              <Text style={styles.modalSectionHeader}>Structured Data</Text>
              <ScrollView contentContainerStyle={styles.modalSectionScroll}>
                <InfoRow label="Ticket #" value={selectedTicket?.ticket_number} />
                <InfoRow label="Date" value={selectedTicket?.ticket_date} />
                <InfoRow label="Vendor" value={selectedTicket?.haul_vendor} />
                <InfoRow label="Truck #" value={selectedTicket?.truck_number} />
                <InfoRow label="Material" value={selectedTicket?.material} />
                <InfoRow label="Job #" value={selectedTicket?.job_number} />
                <InfoRow label="Phase" value={selectedTicket?.phase_code} />
                <InfoRow label="Zone" value={selectedTicket?.zone} />
                <InfoRow label="Hours" value={selectedTicket?.hours} />
              </ScrollView>
            </View>

            {/* Extracted Text (Bottom Section - Editable) */}
            <View style={styles.modalEditTextView}>
              <Text style={styles.modalSectionHeader}>Edit Raw Text</Text>
              <TextInput
                style={styles.modalTextInput}
                value={editedRawText}
                onChangeText={setEditedRawText}
                multiline
                textAlignVertical="top" // for Android
                placeholder="Edit raw text..."
                placeholderTextColor="#888"
              />
            </View>

            {/* Save Button */}
            <View style={styles.modalButtonContainer}>
              <TouchableOpacity
                style={styles.modalButtonSave}
                onPress={handleSaveText}
                disabled={isSaving}
              >
                {isSaving ? (
                  <ActivityIndicator color="#fff" />
                ) : (
                  <Text style={styles.modalButtonText}>Save Changes</Text>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </KeyboardAvoidingView>
      </Modal>
    </View>
  );
};

// --- Timesheets Review Component (Unchanged) ---
const ReviewTimesheets = ({ navigation }: { navigation: any }) => {
  const { user } = useAuth();
  const [drafts, setDrafts] = useState<Timesheet[]>([]);
  const [loading, setLoading] = useState(false);

  const fetchDrafts = async () => {
    if (!user) return;
    setLoading(true);
    try {
      const response = await axios.get(
        `${API_BASE_URL}/api/timesheets/drafts/by-foreman/${user.id}`
      );
      setDrafts(response.data);
    } catch (e) {
      Alert.alert("Error", "Failed to fetch draft timesheets.");
    } finally {
      setLoading(false);
    }
  };

  useFocusEffect(
    useCallback(() => {
      fetchDrafts();
    }, [user])
  );

  const handleSendTimesheet = async (timesheetId: number) => {
    Alert.alert(
      "Confirm Submission",
      "Are you sure you want to send this timesheet?",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Send",
          onPress: async () => {
            setLoading(true);
            try {
              await axios.post(
                `${API_BASE_URL}/api/timesheets/${timesheetId}/send`
              );
              Alert.alert("Success", "Timesheet has been sent.");
              setDrafts((prev) => prev.filter((t) => t.id !== timesheetId));
              navigation.navigate("TimesheetList", { refresh: true });
            } catch (error: any) {
              console.error("Send timesheet error:", error);
              Alert.alert(
                "Error",
                error.response?.data?.detail || "Could not send the timesheet."
              );
            } finally {
              setLoading(false);
            }
          },
          style: "destructive",
        },
      ]
    );
  };

  if (loading && drafts.length === 0) {
    return (
      <ActivityIndicator
        size="large"
        color={THEME.colors.primary}
        style={styles.centered}
      />
    );
  }

  return (
    <FlatList
      data={drafts}
      keyExtractor={(item) => item.id.toString()}
      contentContainerStyle={styles.scrollContent}
      refreshControl={
        <RefreshControl
          refreshing={loading}
          onRefresh={fetchDrafts}
          tintColor={THEME.colors.primary}
        />
      }
      renderItem={({ item }) => (
        <View style={styles.tsItemOuterContainer}>
          <TouchableOpacity
            style={styles.tsItemContainer}
            onPress={() =>
              navigation.navigate("TimesheetEdit", { timesheetId: item.id })
            }
          >
            <View style={styles.tsItemTextContainer}>
              <Text style={styles.tsItemTitle}>
                {item.timesheet_name || "Untitled Timesheet"}
              </Text>
              <Text style={styles.tsItemSubtitle}>
                Date: {new Date(item.date).toLocaleDateString()}
              </Text>
            </View>
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.tsSendButton}
            onPress={() => handleSendTimesheet(item.id)}
          >
            <Icon name="send" size={20} color={THEME.colors.primary} />
            <Text style={styles.tsSendButtonText}>Send</Text>
          </TouchableOpacity>
        </View>
      )}
      ListEmptyComponent={
        <View style={styles.emptyContainer}>
          <Icon name="edit" size={48} color={THEME.colors.brandStone} />
          <Text style={styles.emptyText}>No timesheet drafts.</Text>
          <Text style={styles.emptySubText}>
            Saved timesheets will appear here for submission.
          </Text>
        </View>
      }
    />
  );
};

// --- Main Review Screen with Tabs (Unchanged) ---
const ReviewScreen = ({ navigation }: { navigation: any }) => {
  const [activeTab, setActiveTab] = useState<"tickets" | "timesheets">(
    "tickets"
  );

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <View style={styles.tabContainer}>
          <TouchableOpacity
            style={[styles.tab, activeTab === "tickets" && styles.activeTab]}
            onPress={() => setActiveTab("tickets")}
          >
            <Text
              style={[
                styles.tabText,
                activeTab === "tickets" && styles.activeTabText,
              ]}
            >
              Tickets
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.tab, activeTab === "timesheets" && styles.activeTab]}
            onPress={() => setActiveTab("timesheets")}
          >
            <Text
              style={[
                styles.tabText,
                activeTab === "timesheets" && styles.activeTabText,
              ]}
            >
              Timesheets
            </Text>
          </TouchableOpacity>
        </View>
      </View>

      {activeTab === "tickets" ? (
        <ReviewTickets />
      ) : (
        <ReviewTimesheets navigation={navigation} />
      )}
    </SafeAreaView>
  );
};

// ✅ Styling (Merged & Updated)
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
  },
  fontFamily: { display: "System" },
  borderRadius: { sm: 8, md: 12, lg: 16, tiny: 6, full: 9999 },
};

const styles = StyleSheet.create({
  // General & Layout
  container: { flex: 1, backgroundColor: THEME.colors.backgroundLight },
  scrollContent: { padding: 16, flexGrow: 1 },
  centered: { flex: 1, justifyContent: "center", alignItems: "center" },

  // Header & Tabs
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
  activeTab: {
    backgroundColor: THEME.colors.cardLight,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 3,
  },
  tabText: {
    fontFamily: THEME.fontFamily.display,
    fontSize: 15,
    fontWeight: "600",
    color: THEME.colors.subtleLight,
  },
  activeTabText: {
    color: THEME.colors.primary,
  },

  // Tickets Styling
  groupContainer: {
    backgroundColor: "#fff",
    borderRadius: THEME.borderRadius.md,
    marginBottom: 16,
    padding: 12,
    shadowColor: "#000",
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
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
  submitButton: {
    backgroundColor: THEME.colors.primary,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: THEME.borderRadius.sm,
  },
  submitButtonText: { color: "#fff", fontWeight: "500" },
  thumbnailScrollContainer: { flexDirection: "row" },

  // ⭐️ --- PDF THUMBNAIL STYLING ---
  pdfThumbnailContainer: {
    width: width / 3,
    height: THUMBNAIL_HEIGHT,
    borderRadius: THEME.borderRadius.sm,
    marginRight: 8,
    backgroundColor: "#ddd",
    overflow: "hidden", // Clip the PDF content
  },
  thumbnailImage: {
    width: "100%",
    height: "100%",
    backgroundColor: "#ddd",
  },

  pendingBadge: {
    position: "absolute",
    bottom: 6,
    right: 14,
    backgroundColor: THEME.colors.pending,
    borderRadius: 6,
    paddingHorizontal: 6,
    paddingVertical: 2,
  },
  pendingBadgeText: { color: "#000", fontSize: 10, fontWeight: "bold" },

  // ⭐️ --- MODAL STYLING (UPDATED) ---
  modalContainer: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.9)",
  },
  modalContent: {
    flex: 1,
    backgroundColor: "#1C1C1E", // Dark background
  },
  closeButton: {
    position: "absolute",
    top: 50, // Safer area
    right: 20,
    backgroundColor: "rgba(0,0,0,0.5)",
    borderRadius: 20,
    padding: 6,
    zIndex: 10,
  },
  
  // --- PDF View (Top) ---
  modalPdfView: {
    flex: 2, // 40%
    marginTop: 80,
    backgroundColor: "#000",
  },
  fullPdf: {
    flex: 1,
    width: "100%",
  },

  // --- Structured Data View (Middle) ---
  modalStructuredDataView: {
    flex: 1.5, // 30%
    borderTopWidth: 1,
    borderTopColor: "#333",
    borderBottomWidth: 1,
    borderBottomColor: "#333",
  },

  // --- Editable Text View (Bottom) ---
  modalEditTextView: {
    flex: 1.5, // 30%
  },

  modalSectionHeader: {
    fontSize: 16,
    fontWeight: "600",
    color: "#fff",
    paddingHorizontal: 16,
    paddingTop: 16,
    paddingBottom: 8,
    backgroundColor: "#2C2C2E",
  },
  modalSectionScroll: {
    padding: 16,
  },

  // --- Info Row Styling ---
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

  // --- TextInput Styling ---
  modalTextInput: {
    flex: 1,
    fontFamily: "monospace",
    fontSize: 12,
    color: "#E0E0E0",
    lineHeight: 18,
    padding: 16,
  },

  // --- Save Button Styling ---
  modalButtonContainer: {
    padding: 16,
    backgroundColor: "#2C2C2E",
    borderTopWidth: 1,
    borderTopColor: "#333",
  },
  modalButtonSave: {
    backgroundColor: THEME.colors.primary,
    padding: 14,
    borderRadius: THEME.borderRadius.sm,
    alignItems: "center",
  },
  modalButtonText: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "600",
  },


  // Empty State Styling
  emptyContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    paddingTop: 80,
    paddingHorizontal: 40,
  },
  emptyText: {
    fontFamily: THEME.fontFamily.display,
    marginTop: 16,
    fontSize: 17,
    fontWeight: "600",
    color: THEME.colors.subtleLight,
  },
  emptySubText: {
    fontFamily: THEME.fontFamily.display,
    marginTop: 8,
    fontSize: 14,
    color: THEME.colors.brandStone,
    textAlign: "center",
  },

  // Timesheet List Styling
  tsItemOuterContainer: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: THEME.colors.cardLight,
    borderRadius: THEME.borderRadius.sm,
    marginBottom: 12,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  tsItemContainer: {
    flex: 1,
    padding: 16,
  },
  tsItemTextContainer: {
    flex: 1,
  },
  tsItemTitle: {
    fontFamily: THEME.fontFamily.display,
    fontSize: 16,
    fontWeight: "600",
    color: THEME.colors.contentLight,
  },
  tsItemSubtitle: {
    fontFamily: THEME.fontFamily.display,
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
    fontFamily: THEME.fontFamily.display,
    marginLeft: 8,
    color: THEME.colors.primary,
    fontWeight: "600",
    fontSize: 16,
  },
});

export default ReviewScreen;