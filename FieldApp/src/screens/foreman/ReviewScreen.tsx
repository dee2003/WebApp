





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
import Pdf, { PdfRef } from "react-native-pdf"; // Import PdfRef for type safety if needed

const { width } = Dimensions.get("window");
const THUMBNAIL_HEIGHT = 150;

// ✅ Replace with your backend ngrok or production URL
const API_BASE_URL = "https://8f0b7fdcd548.ngrok-free.app"
// --- TYPE DEFINITIONS ---
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

// --- URL BUILDER ---
const getImageUri = (imagePath?: string): string | null => {
  if (!imagePath) return null;
  if (imagePath.startsWith("http")) return imagePath;
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

// --- Tickets Review Component ---
const ReviewTickets: React.FC = () => {
  const { user } = useAuth();
  const [imagesByDate, setImagesByDate] = useState<TicketGroup[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [selectedTicket, setSelectedTicket] = useState<TicketImage | null>(null);
  const [editedRawText, setEditedRawText] = useState<string>("");
  const [isSaving, setIsSaving] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [isEditingTextFullScreen, setIsEditingTextFullScreen] = useState(false);
  const [isPdfFullScreen, setIsPdfFullScreen] = useState(false);

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

  const handleCloseModal = () => {
    if (isSaving || isDeleting) return;
    setSelectedTicket(null);
  };

  const handleSaveText = async () => {
    if (!selectedTicket || !user || isDeleting) return;
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
      
      // --- Close both modals and refresh ---
      setIsEditingTextFullScreen(false); // Close editor
      handleCloseModal(); // Close main modal
      fetchTickets(); // Refresh list

    } catch (err) {
      console.error("Save error:", err);
      Alert.alert("Error", "Failed to save changes. Please try again.");
    } finally {
      setIsSaving(false);
    }
  };

  const handleDeleteTicket = async () => {
    if (!selectedTicket || !user || isSaving) return;
    Alert.alert(
      "Delete Ticket",
      "Are you sure you want to permanently delete this ticket? This action cannot be undone.",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Delete",
          style: "destructive",
          onPress: async () => {
            setIsDeleting(true);
            try {
              const payload = {
                ticket_id: selectedTicket.id,
                foreman_id: user.id,
              };
              await axios.post(
                `${API_BASE_URL}/api/ocr/delete-ticket`,
                payload
              );
              Alert.alert("Success", "Ticket deleted successfully.");
              handleCloseModal();
              fetchTickets();
            } catch (err) {
              console.error("Delete error:", err);
              Alert.alert(
                "Error",
                "Failed to delete ticket. Please try again."
              );
            } finally {
              setIsDeleting(false);
            }
          },
        },
      ]
    );
  };

  if (isLoading && imagesByDate.length === 0) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator size="large" color={THEME.colors.primary} />
      </View>
    );
  }

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
                      onPress={() => pdfUri && setSelectedTicket(img)}
                    >
                      <View style={styles.pdfThumbnailContainer}>
                        {source ? (
                          <Pdf
                            source={source}
                            style={styles.thumbnailImage}
                            scale={1}
                            page={1}
                            trustAllCerts={false}
                            onError={(error: any) => { 
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

      {/* --- Main Details Modal --- */}
      <Modal visible={!!selectedTicket} transparent animationType="fade">
        <KeyboardAvoidingView
          behavior={Platform.OS === "ios" ? "padding" : "height"}
          style={styles.modalContainer}
        >
          <View style={styles.modalContent}>
            <TouchableOpacity
              style={styles.closeButton}
              onPress={handleCloseModal}
              disabled={isSaving || isDeleting}
            >
              <Icon name="x" size={28} color="#fff" />
            </TouchableOpacity>

            {/* Clickable PDF Viewer */}
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
                  onError={(error: any) => { 
                    console.log("PDF Modal Error:", error);
                  }}
                />
              ) : (
                <View style={styles.centered}>
                  <ActivityIndicator size="large" color="#fff" />
                </View>
              )}
            </TouchableOpacity>

            {/* Structured Data (Middle Section) */}
            <View style={styles.modalStructuredDataView}>
              <Text style={styles.modalSectionHeader}>Structured Data</Text>
              <ScrollView contentContainerStyle={styles.modalSectionScroll}>
                <InfoRow
                  label="Ticket #"
                  value={selectedTicket?.ticket_number}
                />
                <InfoRow label="Date" value={selectedTicket?.ticket_date} />
                <InfoRow label="Vendor" value={selectedTicket?.haul_vendor} />
                <InfoRow
                  label="Truck #"
                  value={selectedTicket?.truck_number}
                />
                <InfoRow label="Material" value={selectedTicket?.material} />
                <InfoRow label="Job #" value={selectedTicket?.job_number} />
                <InfoRow label="Phase" value={selectedTicket?.phase_code_} />
                <InfoRow label="Zone" value={selectedTicket?.zone} />
                <InfoRow label="Hours" value={selectedTicket?.hours} />
              </ScrollView>
            </View>

            {/* Edit Raw Text Button */}
            <View style={styles.modalEditTextView}>
              
              {/* Only show "Edit" button if ticket is NOT submitted */}
              {selectedTicket && !selectedTicket.submitted ? (
                <TouchableOpacity
                  style={styles.modalSectionButton}
                  onPress={() => setIsEditingTextFullScreen(true)}
                >
                  <Text style={styles.modalSectionHeader}>Edit Raw Text</Text>
                  <Icon name="chevron-right" size={24} color="#AAA" />
                </TouchableOpacity>
              ) : (
                // If submitted, just show a static title
                <Text style={[styles.modalSectionHeader, { marginBottom: 8 }]}>
                  Raw Text (Submitted)
                </Text>
              )}

              <Text style={styles.modalTextPreview} numberOfLines={3}>
                {editedRawText || "No raw text found."}
              </Text>
            </View>

            {/* Delete Button (Conditional) */}
            {/* Only show the Delete button if the ticket is NOT submitted */}
            {selectedTicket && !selectedTicket.submitted && (
              <View style={styles.modalButtonContainer}>
                <TouchableOpacity
                  style={[styles.modalButton, styles.modalButtonDelete]}
                  onPress={handleDeleteTicket}
                  disabled={isDeleting}
                >
                  {isDeleting ? (
                    <ActivityIndicator color="#fff" />
                  ) : (
                    <Text style={styles.modalButtonText}>Delete Ticket</Text>
                  )}
                </TouchableOpacity>
              </View>
            )}

          </View>
        </KeyboardAvoidingView>
      </Modal>

      {/* --- Full-Screen Text Editor Modal --- */}
      <Modal visible={isEditingTextFullScreen} animationType="slide">
        <SafeAreaView style={styles.fullScreenModalContainer}>
          <View style={styles.fullScreenHeader}>
            {/* --- Cancel Button --- */}
            <TouchableOpacity
              onPress={() => setIsEditingTextFullScreen(false)}
              style={styles.fullScreenHeaderButton}
              disabled={isSaving}
            >
              <Text style={styles.fullScreenCancelButtonText}>Cancel</Text>
            </TouchableOpacity>

            <Text style={styles.fullScreenTitle}>Edit Raw Text</Text>

            {/* --- Save Button --- */}
            <TouchableOpacity
              onPress={handleSaveText}
              style={styles.fullScreenHeaderButton}
              disabled={isSaving}
            >
              {isSaving ? (
                <ActivityIndicator color={THEME.colors.primary} size="small" />
              ) : (
                <Text style={styles.fullScreenDoneButtonText}>Save</Text>
              )}
            </TouchableOpacity>
          </View>
          <KeyboardAvoidingView
            behavior={Platform.OS === "ios" ? "padding" : "height"}
            style={styles.fullScreenKAV}
          >
            <TextInput
              style={styles.fullScreenTextInput}
              value={editedRawText}
              onChangeText={setEditedRawText}
              multiline
              textAlignVertical="top"
              placeholder="Edit raw text..."
              placeholderTextColor="#888"
              autoFocus={true}
              selectionColor={THEME.colors.primary}
            />
          </KeyboardAvoidingView>
        </SafeAreaView>
      </Modal>

      {/* --- Full-Screen PDF Viewer Modal --- */}
      <Modal visible={isPdfFullScreen} transparent={false} animationType="slide">
        <SafeAreaView style={styles.fullScreenPdfContainer}>
          <View style={styles.fullScreenHeader}>
            <Text style={styles.fullScreenTitle}>
              Ticket: {selectedTicket?.ticket_number || "View PDF"}
            </Text>
            <TouchableOpacity
              onPress={() => setIsPdfFullScreen(false)}
              style={styles.fullScreenHeaderButton} // Use same button style
            >
              <Text style={styles.fullScreenDoneButtonText}>Done</Text>
            </TouchableOpacity>
          </View>
          {modalPdfSource ? (
            <Pdf
              source={modalPdfSource}
              style={styles.fullScreenPdf}
              trustAllCerts={false}
              onError={(error: any) => { 
                console.log("Full Screen PDF Error:", error);
                Alert.alert("Error", "Could not load PDF file.");
                setIsPdfFullScreen(false);
              }}
            />
          ) : (
            <View style={styles.centered}>
              <ActivityIndicator size="large" color="#fff" />
            </View>
          )}
        </SafeAreaView>
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
    } catch (err) {
      Alert.alert("Error", "Unable to load timesheets.");
    } finally {
      setLoading(false);
    }
  };

  useFocusEffect(
    useCallback(() => {
      fetchDrafts();
    }, [user])
  );

  if (loading && drafts.length === 0) {
    return <ActivityIndicator size="large" style={{ marginTop: 40 }} />;
  }

  return (
    <ScrollView contentContainerStyle={{ padding: 16 }}>
      {drafts.map((ts) => (
        <TouchableOpacity
          key={ts.id}
          style={{
            backgroundColor: "#fff",
            padding: 16,
            borderRadius: 10,
            marginBottom: 12,
            borderWidth: 1,
            borderColor: "#ddd",
          }}
          onPress={() => navigation.navigate("TimesheetView", { timesheetId: ts.id })}
        >
          <Text style={{ fontSize: 16, fontWeight: "600" }}>
            {ts.timesheet_name || "Draft Timesheet"}
          </Text>
          <Text style={{ marginTop: 4 }}>
            {new Date(ts.date).toLocaleDateString()}
          </Text>
        </TouchableOpacity>
      ))}

      {drafts.length === 0 && !loading && (
        <View style={{ marginTop: 60, alignItems: "center" }}>
          <Text>No drafts found.</Text>
        </View>
      )}
    </ScrollView>
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

// --- STYLES ---
const THEME = {
  colors: {
    primary: "#4A5C4D",
    backgroundLight: "#F8F7F2",
    contentLight: "#3D3D3D",
    subtleLight: "#797979",
    cardLight: "#FFFFFF",
    border: "#E5E5ES",
    brandStone: "#8E8E8E",
    success: "#16A34A",
    pending: "#FACC15",
    danger: "#DC2626",
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
  pdfThumbnailContainer: {
    width: width / 3,
    height: THUMBNAIL_HEIGHT,
    borderRadius: THEME.borderRadius.sm,
    marginRight: 8,
    backgroundColor: "#ddd",
    overflow: "hidden",
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

  // --- Main Modal Styling ---
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
    top: 35,
    right: 20,
    backgroundColor: "rgba(0,0,0,0.5)",
    borderRadius: 20,
    padding: 6,
    zIndex: 10,
  },
  modalPdfView: {
    flex: 2.5, // 50%
    marginTop: 80,
    backgroundColor: "#000",
  },
  fullPdf: {
    flex: 1,
    width: "100%",
  },

  modalStructuredDataView: {
    flex: 1.5, // 30%
    borderTopWidth: 1,
    borderTopColor: "#333",
    borderBottomWidth: 1,
    borderBottomColor: "#333",
    paddingHorizontal: 16, 
    paddingTop: 16,
  },
  modalSectionHeader: {
    fontSize: 16,
    fontWeight: "600",
    color: "#fff",
  },
  modalSectionScroll: {
    paddingTop: 8, 
    paddingBottom: 16, 
  },
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

  // Edit Text Section (Button)
  modalEditTextView: {
    flex: 1, // 20%
    justifyContent: "center",
    paddingHorizontal: 16,
  },
  modalSectionButton: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingVertical: 8,
  },
  modalTextPreview: {
    color: "#888",
    fontSize: 12,
    fontFamily: "monospace",
    paddingBottom: 8,
  },

  // ⭐ --- UPDATED: Button Container (Delete Only) ---
  modalButtonContainer: {
    padding: 16,
    backgroundColor: "#2C2C2E",
    borderTopWidth: 1,
    borderTopColor: "#333",
    alignItems: 'center', // Center the button
  },
  modalButton: {
    // flex: 1, // <-- REMOVED
    paddingVertical: 12, 
    paddingHorizontal: 32, // <-- Added horizontal padding
    borderRadius: THEME.borderRadius.sm,
    alignItems: "center",
  },
  modalButtonDelete: {
    backgroundColor: THEME.colors.danger,
  },
  modalButtonText: {
    color: "#fff",
    fontSize: 15, 
    fontWeight: "600",
  },

  // ⭐ --- UPDATED: Full Screen Text Editor Modal ---
  fullScreenModalContainer: {
    flex: 1,
    backgroundColor: "#1C1C1E", // Dark background
  },
  fullScreenHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: "#333",
  },
  fullScreenTitle: {
    fontSize: 18,
    fontWeight: "600",
    color: "#fff",
  },
  fullScreenHeaderButton: { // Generic style for header buttons
    padding: 8,
    minWidth: 60, // Give space for loading indicator
    alignItems: 'center',
  },
  fullScreenDoneButtonText: { // For "Save" and "Done"
    fontSize: 16,
    fontWeight: "600",
    color: "#fff", // "Save" button
  },
  fullScreenCancelButtonText: { // For "Cancel"
    fontSize: 16,
    fontWeight: "500", // Less emphasis
    color: "#fff", // White
  },
  fullScreenKAV: {
    flex: 1,
  },
  fullScreenTextInput: {
    flex: 1,
    fontFamily: "monospace",
    fontSize: 14,
    color: "#E0E0E0",
    lineHeight: 20,
    padding: 16,
    textAlignVertical: "top",
  },

  // --- Full Screen PDF Modal Styles ---
  fullScreenPdfContainer: {
    flex: 1,
    backgroundColor: "#1C1C1E",
  },
  fullScreenPdf: {
    flex: 1,
    width: "100%",
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