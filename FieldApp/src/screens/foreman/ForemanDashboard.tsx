import React, { useState, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  SafeAreaView,
  Alert,
  ScrollView,
  Image,
  ActivityIndicator,
  ImageBackground,
  Animated,
  Platform,
} from 'react-native';
// Adjust this import path to match your actual project structure
import { useAuth } from '../../context/AuthContext'; 
import DocumentScanner from 'react-native-document-scanner-plugin';
import RNFS from 'react-native-fs';
import Icon from 'react-native-vector-icons/Feather';

// --- CONFIGURATION ---
const API_BASE_URL = 'https://1dd6e8a66da8.ngrok-free.app';

// --- THEME ---
const theme = {
  colors: {
    primary: '#4A5C4D',
    backgroundLight: '#F8F7F2',
    contentLight: '#3D3D3D',
    subtleLight: '#797979',
    cardLight: '#FFFFFF',
    brandStone: '#8E8E8E',
  },
  fontFamily: { display: 'Manrope' },
  borderRadius: { lg: 16, xl: 24, full: 9999 },
};

// --- MAIN COMPONENT ---
const ForemanDashboard = ({ navigation }: { navigation: any }) => {
  const { user, logout } = useAuth();
  
  // State Management
  const [isLoading, setIsLoading] = useState(false);
  const [scannedImageUris, setScannedImageUris] = useState<string[]>([]);
  const [screen, setScreen] = useState<'dashboard' | 'processing'>('dashboard');

  // ------------------------------------------------------
  // 1. Handle Document Scanning (Multi-Page Support)
  // ------------------------------------------------------
  const handleScanDocument = async () => {
    try {
      setIsLoading(true);
      
      // Trigger Scanner
      // REMOVED: responseType: 'imageFilePath' (not required/valid for this library)
      const { scannedImages } = await DocumentScanner.scanDocument({
        maxNumDocuments: 24, // Allow batch scanning
        letUserAdjustCrop: true // Optional: allows user to adjust corners manually
      });

      if (scannedImages && scannedImages.length > 0) {
        setScreen('processing'); // Switch UI to processing view
        
        const processedUris: string[] = [];
        
        // Loop through results and move to persistent storage
        for (let i = 0; i < scannedImages.length; i++) {
          const originalUri = scannedImages[i];
          const newFileName = `ticket_${Date.now()}_p${i + 1}.jpg`;
          
          // Handle "file://" prefix for filesystem operations
          const oldPath = originalUri.startsWith('file://') 
            ? originalUri.substring(7) 
            : originalUri;
            
          const newPath = `${RNFS.DocumentDirectoryPath}/${newFileName}`;
          
          // Move file from temp cache to Document Directory
          if (await RNFS.exists(oldPath)) {
             await RNFS.moveFile(oldPath, newPath);
             processedUris.push(`file://${newPath}`);
          } else {
             // Fallback if file access fails (rare)
             processedUris.push(originalUri); 
          }
        }

        // Update state and begin upload
        setScannedImageUris(processedUris);
        await uploadScannedImages(processedUris);

      } else {
        // User cancelled the scan
        setScreen('dashboard');
      }
    } catch (err) {
      console.error('Scan error:', err);
      Alert.alert('Error', 'Error during document scan.');
      setScreen('dashboard');
    } finally {
      setIsLoading(false);
    }
  };
  // ------------------------------------------------------
  // 2. Upload Logic (Sends List of Files)
  // ------------------------------------------------------
  const uploadScannedImages = async (uris: string[]) => {
    try {
      // Step A: Fetch Timesheets for Context
      const timesheetRes = await fetch(`${API_BASE_URL}/api/timesheets/by-foreman/${user?.id}`);
      const timesheetData = await timesheetRes.json();

      if (!Array.isArray(timesheetData) || timesheetData.length === 0) {
        Alert.alert('No Timesheet Found', 'You have no timesheet records assigned.');
        setScreen('dashboard');
        return;
      }

      // Step B: Select appropriate Timesheet based on Date
      const scanDate = new Date().toISOString().split('T')[0]; // YYYY-MM-DD
      
      // Try exact match first, then fallback to most recent past timesheet
      let selected = timesheetData.find((ts: any) => ts.date === scanDate);
      
      if (!selected) {
        const sorted = timesheetData
          .slice()
          .sort((a: any, b: any) => (a.date < b.date ? 1 : -1)); // Descending
        selected = sorted.find((ts: any) => ts.date <= scanDate) || sorted[0];
      }

      if (!selected) {
        Alert.alert('No Timesheet Found', `No timesheet could be attached.`);
        setScreen('dashboard');
        return;
      }

      // Step C: Build FormData with Multiple Files
      const formData = new FormData();
      
      formData.append('foreman_id', String(user?.id));
      formData.append('timesheet_id', String(selected.id));
      formData.append('job_phase_id', String(selected.job_phase_id || ''));
      formData.append('job_code', selected.job_code || '');

      // IMPORTANT: Append each file to the SAME key 'files' (plural)
      uris.forEach((uri, index) => {
        formData.append('files', {
          uri: Platform.OS === 'ios' ? uri.replace('file://', '') : uri,
          type: 'image/jpeg',
          name: `page_${index + 1}.jpg`,
        } as any);
      });

      console.log(`Uploading ${uris.length} pages linked to TS ID: ${selected.id}`);

      // Step D: Send Request
      const response = await fetch(`${API_BASE_URL}/api/ocr/scan`, {
        method: 'POST',
        body: formData,
        headers: {
            'Content-Type': 'multipart/form-data',
        }
      });

      const result = await response.json();
      
      if (response.ok) {
        Alert.alert(
          '✅Upload Successful', 
          `Your ticket is now being processed by the AI. It will appear in the 'Review' tab shortly. Uploaded ${uris.length} page(s) to timesheet dated ${selected.date}.`
        );
      } else {
        console.log('OCR Scan Failed:', result);
        Alert.alert('Scan Failed', result.detail || 'Server could not process the images.');
      }
    } catch (err) {
      console.error('Unexpected scan error:', err);
      Alert.alert('Error', 'Network request failed.');
    } finally {
      setScreen('dashboard');
      setScannedImageUris([]);
    }
  };

  // ------------------------------------------------------
  // 3. Sub-Components
  // ------------------------------------------------------
  
  const AppHeader = () => (
    <View style={styles.header}>
      <View style={styles.headerLeft}>
         <Image
           source={require('../../assets/profile-placeholder.png')}
           style={styles.headerProfileImage}
         />
      </View>
      <View style={styles.headerRight}>
        <TouchableOpacity style={styles.headerButton} onPress={logout}>
          <Icon name="log-out" size={24} color={theme.colors.contentLight} />
        </TouchableOpacity>
      </View>
    </View>
  );

  const ActionCard = ({
    title,
    subtitle,
    imageUrl,
    onPress,
  }: {
    title: string;
    subtitle: string;
    imageUrl: any;
    onPress: () => void;
  }) => {
    const scaleAnim = useRef(new Animated.Value(1)).current;

    const onPressIn = () => {
      Animated.spring(scaleAnim, { toValue: 0.97, useNativeDriver: true }).start();
    };
    const onPressOut = () => {
      Animated.spring(scaleAnim, { toValue: 1, useNativeDriver: true }).start();
    };

    return (
      <Animated.View style={{ transform: [{ scale: scaleAnim }] }}>
        <TouchableOpacity
          activeOpacity={0.9}
          onPress={onPress}
          onPressIn={onPressIn}
          onPressOut={onPressOut}
        >
          <View style={styles.card}>
            <View style={styles.cardContent}>
              <ImageBackground
                source={imageUrl}
                style={styles.cardImage}
                imageStyle={{ borderRadius: theme.borderRadius.lg }}
              />
              <View style={styles.cardTextContainer}>
                <Text style={styles.cardTitle}>{title}</Text>
                <Text style={styles.cardSubtitle}>{subtitle}</Text>
              </View>
              <Icon name="chevron-right" size={20} color={theme.colors.contentLight} />
            </View>
          </View>
        </TouchableOpacity>
      </Animated.View>
    );
  };

  const BottomNavBar = () => (
    <View style={styles.footer}>
      <View style={styles.navBar}>
        <TouchableOpacity style={styles.navItem}>
          <View style={styles.navIconContainer}>
            <Icon name="home" size={24} color={theme.colors.primary} />
          </View>
          <Text style={styles.navLabelActive}>Home</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.navItem} onPress={handleScanDocument}>
          <View style={styles.navIconContainer}>
            <Icon name="camera" size={24} color={theme.colors.brandStone} />
          </View>
          <Text style={styles.navLabel}>Scan</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.navItem} onPress={() => navigation.navigate('Review')}>
          <View style={styles.navIconContainer}>
            <Icon name="file-text" size={24} color={theme.colors.brandStone} />
          </View>
          <Text style={styles.navLabel}>Review</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.navItem} onPress={() => navigation.navigate('TimesheetList')}>
          <View style={styles.navIconContainer}>
            <Icon name="calendar" size={24} color={theme.colors.brandStone} />
          </View>
          <Text style={styles.navLabel}>Timesheets</Text>
        </TouchableOpacity>
      </View>
    </View>
  );

  // ------------------------------------------------------
  // 4. Render Logic
  // ------------------------------------------------------

  // View: Processing / Uploading
  if (screen === 'processing') {
    return (
      <SafeAreaView style={styles.safeArea}>
        <View style={styles.processingContainer}>
          <Text style={styles.processingTitle}>
            Processing {scannedImageUris.length} Page{scannedImageUris.length !== 1 ? 's' : ''}...
          </Text>
          
          {scannedImageUris.length > 0 && (
            <Image 
                style={styles.previewImage} 
                source={{ uri: scannedImageUris[0] }} 
            />
          )}
          
          <ActivityIndicator size="large" color={theme.colors.primary} style={{ marginTop: 20 }} />
          <Text style={styles.processingSubtitle}>
            Sending to server for AI Analysis...
          </Text>
        </View>
      </SafeAreaView>
    );
  }

  // View: Dashboard
  return (
    <SafeAreaView style={styles.safeArea}>
      <View style={styles.container}>
        <ScrollView contentContainerStyle={styles.scrollContent}>
          <AppHeader />
          
          <View style={styles.mainContent}>
            <View style={styles.welcomeHeader}>
              <Text style={styles.welcomeTitle}>
                Welcome, {[
                  user?.first_name,
                  user?.middle_name,
                  user?.last_name,
                ].filter(Boolean).join(' ') || 'Foreman'}
              </Text>
              <Text style={styles.welcomeSubtitle}>What would you like to do today?</Text>
            </View>
            
            <View style={styles.actionsContainer}>
              <ActionCard
                title="Scan Tickets"
                subtitle="Scan single or multi-page tickets."
                imageUrl={require('../../assets/scan-documents.png')}
                onPress={handleScanDocument}
              />
              <ActionCard
                title="Enter Timesheet Data"
                subtitle="Select a timesheet to fill out or edit."
                imageUrl={require('../../assets/timesheets.png')}
                onPress={() => navigation.navigate('TimesheetList')}
              />
              <ActionCard
                title="Review & Submit"
                subtitle="Review tickets and submit timesheet drafts."
                imageUrl={require('../../assets/review-tickets.png')}
                onPress={() => navigation.navigate('Review')}
              />
            </View>
          </View>
        </ScrollView>
        
        <BottomNavBar />
        
        {isLoading && (
            <View style={styles.loadingOverlay}>
                <ActivityIndicator size="large" color={theme.colors.primary} />
            </View>
        )}
      </View>
    </SafeAreaView>
  );
};

// --- STYLES ---
const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: theme.colors.backgroundLight },
  container: { flex: 1 },
  scrollContent: { flexGrow: 1, paddingBottom: 80 },
  
  // Header
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', padding: 24 },
  headerLeft: { flexDirection: 'row', alignItems: 'center' },
  headerProfileImage: { width: 40, height: 40, borderRadius: theme.borderRadius.full, backgroundColor: '#ddd' },
  headerRight: { width: 40, alignItems: 'flex-end' },
  headerButton: { padding: 8, borderRadius: theme.borderRadius.full },
  
  // Main Content
  mainContent: { paddingHorizontal: 24 },
  welcomeHeader: { marginBottom: 32 },
  welcomeTitle: { fontFamily: theme.fontFamily.display, fontSize: 30, fontWeight: 'bold', color: theme.colors.contentLight, marginBottom: 4 },
  welcomeSubtitle: { fontFamily: theme.fontFamily.display, color: theme.colors.subtleLight, fontSize: 16 },
  actionsContainer: { gap: 20 },
  
  // Card
  card: { backgroundColor: theme.colors.cardLight, borderRadius: theme.borderRadius.xl, overflow: 'hidden', shadowColor: "#000", shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.05, shadowRadius: 8, elevation: 3 },
  cardContent: { flexDirection: 'row', alignItems: 'center', padding: 20, gap: 20 },
  cardImage: { width: 80, height: 80, borderRadius: theme.borderRadius.lg, backgroundColor: '#eee' },
  cardTextContainer: { flex: 1 },
  cardTitle: { fontFamily: theme.fontFamily.display, fontSize: 16, fontWeight: 'bold', color: theme.colors.contentLight },
  cardSubtitle: { fontFamily: theme.fontFamily.display, fontSize: 14, color: theme.colors.subtleLight, marginTop: 4 },
  
  // Footer / Nav
  footer: { position: 'absolute', bottom: 0, left: 0, right: 0, backgroundColor: 'rgba(248, 247, 242, 0.95)', borderTopWidth: 1, borderTopColor: 'rgba(229, 229, 229, 0.4)' },
  navBar: { flexDirection: 'row', justifyContent: 'space-around', paddingHorizontal: 8, paddingVertical: 8 },
  navItem: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 4, padding: 4, borderRadius: theme.borderRadius.lg },
  navIconContainer: { width: 32, height: 32, alignItems: 'center', justifyContent: 'center' },
  navLabel: { fontFamily: theme.fontFamily.display, fontSize: 12, fontWeight: '500', color: theme.colors.brandStone },
  navLabelActive: { fontFamily: theme.fontFamily.display, fontSize: 12, fontWeight: '700', color: theme.colors.primary },

  // Processing Screen
  processingContainer: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 24 },
  processingTitle: { fontFamily: theme.fontFamily.display, fontSize: 22, fontWeight: 'bold', color: theme.colors.contentLight, marginBottom: 20, textAlign: 'center' },
  processingSubtitle: { fontFamily: theme.fontFamily.display, fontSize: 14, color: theme.colors.subtleLight, marginTop: 10 },
  previewImage: { width: 250, height: 300, resizeMode: 'contain', borderRadius: theme.borderRadius.lg, marginBottom: 20, borderWidth: 1, borderColor: '#ddd' },
  
  // Loading Overlay (for non-processing screen loading)
  loadingOverlay: {
     ...StyleSheet.absoluteFillObject,
     backgroundColor: 'rgba(255,255,255,0.5)',
     justifyContent: 'center',
     alignItems: 'center',
     zIndex: 100
  }
});

export default ForemanDashboard;