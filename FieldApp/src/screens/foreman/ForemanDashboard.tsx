


import React, { useState } from 'react';
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
  Dimensions,
  ImageBackground,
  Animated,
} from 'react-native';
import { useAuth } from '../../context/AuthContext';
import DocumentScanner from 'react-native-document-scanner-plugin';
import RNFS from 'react-native-fs';
import Icon from 'react-native-vector-icons/Feather';

const API_BASE_URL = 'https://coated-nonattributive-babara.ngrok-free.dev';

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

const ForemanDashboard = ({ navigation }: { navigation: any }) => {
  const { user, logout } = useAuth();
  const [isLoading, setIsLoading] = useState(false);
  const [scannedImageUri, setScannedImageUri] = useState<string | null>(null);
  const [screen, setScreen] = useState<'dashboard' | 'processing'>('dashboard');

  const handleScanDocument = async () => {
    try {
      setIsLoading(true);
      setScreen('processing');
      const { scannedImages } = await DocumentScanner.scanDocument({ maxNumDocuments: 1 });
      if (scannedImages && scannedImages.length > 0) {
        const originalUri = scannedImages[0];
        const newFileName = `ticket_${Date.now()}.jpg`;
        const oldPath = originalUri.startsWith('file://') ? originalUri.substring(7) : originalUri;
        const newPath = `${RNFS.DocumentDirectoryPath}/${newFileName}`;
        await RNFS.moveFile(oldPath, newPath);
        const renamedUri = `file://${newPath}`;
        setScannedImageUri(renamedUri);

        await uploadScannedImage(renamedUri);
      } else {
        Alert.alert('Scan Canceled', 'No document was scanned.');
        setScreen('dashboard');
      }
    } catch (err) {
      console.error('Scan error:', err);
      Alert.alert('Error', 'Error during scan.');
      setScreen('dashboard');
    } finally {
      setIsLoading(false);
    }
  };

const uploadScannedImage = async (uri: string) => {
  try {
    // 1) Fetch timesheets for this foreman
    const timesheetRes = await fetch(`${API_BASE_URL}/api/timesheets/by-foreman/${user?.id}`);
    const timesheetData = await timesheetRes.json();

    if (!Array.isArray(timesheetData) || timesheetData.length === 0) {
      Alert.alert('No Timesheet Found', 'You have no timesheet records assigned.');
      setScreen('dashboard');
      return;
    }

    // 2) Determine scan date (use device date when scan happened)
    const scanDate = new Date().toISOString().split('T')[0]; // e.g. '2025-10-21'

    // 3) Try to find timesheet with exact scan date
    let selected = timesheetData.find((ts: any) => ts.date === scanDate);

    // 4) If none, find most recent timesheet with date <= scanDate
    if (!selected) {
      // sort descending by date
      const sorted = timesheetData
        .slice()
        .sort((a: any, b: any) => (a.date < b.date ? 1 : -1));
      selected = sorted.find((ts: any) => ts.date <= scanDate) || sorted[0]; // fallback to latest
    }

    if (!selected) {
      Alert.alert('No Timesheet Found', `No timesheet could be attached.`);
      setScreen('dashboard');
      return;
    }

    // Let the user know which timesheet will be used
    Alert.alert(
      'Using Timesheet',
      `This ticket will be attached to timesheet dated ${selected.date} (ID: ${selected.id}).`,
      [{ text: 'OK' }]
    );

    // 5) Prepare form data for OCR upload
    const formData = new FormData();
    formData.append('file', {
      uri,
      type: 'image/jpeg',
      name: `ticket_${Date.now()}.jpg`,
    } as any);
    formData.append('foreman_id', String(user?.id));
    formData.append('timesheet_id', String(selected.id));
    formData.append('job_phase_id', String(selected.job_phase_id || ''));
    formData.append('job_code', selected.job_code || '');

    console.log('Uploading scan for timesheet:', selected.id, selected.job_code);

    // 6) Upload image to backend OCR endpoint
    const response = await fetch(`${API_BASE_URL}/api/ocr/scan`, {
      method: 'POST',
      body: formData,
    });

    const result = await response.json();
    if (response.ok) {
      Alert.alert('✅ Scan Successful', `Ticket linked to timesheet ${selected.date}.`);
    } else {
      console.log('OCR Scan Failed:', result);
      Alert.alert('Scan Failed', result.detail || 'The server could not process the image.');
    }
  } catch (err) {
    console.error('Unexpected scan error:', err);
    Alert.alert('Error', 'Unexpected error while scanning.');
  } finally {
    setScreen('dashboard');
  }
};

  const AppHeader = () => (
    <View style={styles.header}>
      <Image
        source={require('../../assets/profile-placeholder.png')}
        style={styles.headerProfileImage}
      />
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
    imageUrl: number;
    onPress: () => void;
  }) => {
    const scaleAnim = new Animated.Value(1);

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

  if (screen === 'processing') {
    return (
      <SafeAreaView style={styles.safeArea}>
        <View style={styles.processingContainer}>
          <Text style={styles.processingTitle}>Processing...</Text>
          {scannedImageUri && <Image style={styles.previewImage} source={{ uri: scannedImageUri }} />}
          <ActivityIndicator size="large" color={theme.colors.primary} style={{ marginTop: 20 }} />
        </View>
      </SafeAreaView>
    );
  }

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
                title="Scan a Ticket"
                subtitle="Scan and upload a new job ticket."
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
        {isLoading && <ActivityIndicator style={StyleSheet.absoluteFill} size="large" color={theme.colors.primary} />}
      </View>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: theme.colors.backgroundLight },
  container: { flex: 1 },
  scrollContent: { flexGrow: 1, paddingBottom: 80 },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', padding: 24 },
  headerProfileImage: { width: 40, height: 40, borderRadius: theme.borderRadius.full },
  headerRight: { width: 40, alignItems: 'flex-end' },
  headerButton: { padding: 8, borderRadius: theme.borderRadius.full },
  mainContent: { paddingHorizontal: 24 },
  welcomeHeader: { marginBottom: 32 },
  welcomeTitle: { fontFamily: theme.fontFamily.display, fontSize: 30, fontWeight: 'bold', color: theme.colors.contentLight, marginBottom: 4 },
  welcomeSubtitle: { fontFamily: theme.fontFamily.display, color: theme.colors.subtleLight },
  actionsContainer: { gap: 20 },
  card: { backgroundColor: theme.colors.cardLight, borderRadius: theme.borderRadius.xl, overflow: 'hidden', shadowColor: "#000", shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.05, shadowRadius: 8, elevation: 3 },
  cardContent: { flexDirection: 'row', alignItems: 'center', padding: 20, gap: 20 },
  cardImage: { width: 80, height: 80 },
  cardTextContainer: { flex: 1 },
  cardTitle: { fontFamily: theme.fontFamily.display, fontSize: 16, fontWeight: 'bold', color: theme.colors.contentLight },
  cardSubtitle: { fontFamily: theme.fontFamily.display, fontSize: 14, color: theme.colors.subtleLight, marginTop: 4 },
  footer: { position: 'absolute', bottom: 0, left: 0, right: 0, backgroundColor: 'rgba(248, 247, 242, 0.92)', borderTopWidth: 1, borderTopColor: 'rgba(229, 229, 229, 0.4)' },
  navBar: { flexDirection: 'row', justifyContent: 'space-around', paddingHorizontal: 8, paddingVertical: 4 },
  navItem: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 4, padding: 8, borderRadius: theme.borderRadius.lg },
  navIconContainer: { width: 32, height: 32, alignItems: 'center', justifyContent: 'center' },
  navLabel: { fontFamily: theme.fontFamily.display, fontSize: 12, fontWeight: '500', color: theme.colors.brandStone },
  navLabelActive: { fontFamily: theme.fontFamily.display, fontSize: 12, fontWeight: '500', color: theme.colors.primary },

  // Processing screen styles
  processingContainer: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 24 },
  processingTitle: { fontFamily: theme.fontFamily.display, fontSize: 24, fontWeight: 'bold', color: theme.colors.contentLight, marginBottom: 20 },
  previewImage: { width: 250, height: 250, resizeMode: 'contain', borderRadius: theme.borderRadius.lg, marginBottom: 20 },
});

export default ForemanDashboard;