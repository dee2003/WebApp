// import React, { useState, useRef } from 'react';
// import {
//   View,
//   Text,
//   StyleSheet,
//   TouchableOpacity,
//   SafeAreaView,
//   Alert,
//   ScrollView,
//   Image,
//   ActivityIndicator,
//   ImageBackground,
//   Animated,
//   Platform,
//   Modal,
//   Pressable
// } from 'react-native';
// import { useAuth } from '../../context/AuthContext'; 
// import DocumentScanner from 'react-native-document-scanner-plugin';
// import RNFS from 'react-native-fs';
// import Feather from 'react-native-vector-icons/Feather';

// import API_URL from "../../config";

// const API_BASE_URL = API_URL;
// const theme = {
//   colors: {
//     primary: '#070807ff',
//     backgroundLight: '#F8F7F2',
//     contentLight: '#3D3D3D',
//     subtleLight: '#797979',
//     cardLight: '#FFFFFF',
//     brandStone: '#8E8E8E',
//   },
//   fontFamily: { display: 'Manrope' },
//   borderRadius: { lg: 16, xl: 24, full: 9999 },
// };

// const ForemanDashboard = ({ navigation }: { navigation: any }) => {
//   const { user, logout } = useAuth();
  
//   const [selectedCategory, setSelectedCategory] = useState<string>('Materials');
//   const [selectedSubCategory, setSelectedSubCategory] = useState<string | null>(null);
//   const [showCategoryModal, setShowCategoryModal] = useState(false);

//   const [isLoading, setIsLoading] = useState(false);
//   const [scannedImageUris, setScannedImageUris] = useState<string[]>([]);
//   const [screen, setScreen] = useState<'dashboard' | 'processing'>('dashboard');
// // Inside ForemanDashboard component
// const [availableTimesheets, setAvailableTimesheets] = useState<any[]>([]);
// const [selectedTimesheetId, setSelectedTimesheetId] = useState<number | null>(null);
// const formatUSDate = (dateString: string): string => {
//   try {
//     let parsedDate = new Date(dateString);
    
//     // Fallback for malformed dates like "2025-12-26-"
//     if (isNaN(parsedDate.getTime())) {
//       const cleanDate = dateString.substring(0, 10);
//       parsedDate = new Date(cleanDate);
//     }
    
//     if (isNaN(parsedDate.getTime())) {
//       return dateString.substring(0, 10);
//     }
    
//     const month = String(parsedDate.getMonth() + 1).padStart(2, '0');
//     const day = String(parsedDate.getDate()).padStart(2, '0');
//     const year = parsedDate.getFullYear();
    
//     return `${month}/${day}/${year}`;
//   } catch {
//     return (dateString || '').substring(0, 10);
//   }
// };


//   const handleScanDocument = async () => {
// try {
//     setIsLoading(true);
//     const { scannedImages } = await DocumentScanner.scanDocument({
//       maxNumDocuments: 24,
//       letUserAdjustCrop: true 
//     });

//     if (scannedImages && scannedImages.length > 0) {
//       // Fetch timesheets from the API
//       const timesheetRes = await fetch(`${API_BASE_URL}/api/timesheets/by-foreman/${user?.id}`);
//       const timesheetData = await timesheetRes.json();
      
//       setAvailableTimesheets(Array.isArray(timesheetData) ? timesheetData : []);
//       setScreen('processing');
        
//         const processedUris: string[] = [];
        
//         for (let i = 0; i < scannedImages.length; i++) {
//           const originalUri = scannedImages[i];
//           const newFileName = `ticket_${Date.now()}_p${i + 1}.jpg`;
          
//           const oldPath = originalUri.startsWith('file://') 
//             ? originalUri.substring(7) 
//             : originalUri;
            
//           const newPath = `${RNFS.DocumentDirectoryPath}/${newFileName}`;
          
//           if (await RNFS.exists(oldPath)) {
//              await RNFS.moveFile(oldPath, newPath);
//              processedUris.push(`file://${newPath}`);
//           } else {
//              processedUris.push(originalUri); 
//           }
//         }

//         setScannedImageUris(processedUris);
//         setSelectedCategory('Materials');
//         setSelectedSubCategory(null);
//         setShowCategoryModal(true);
//       } else {
//         setScreen('dashboard');
//       }
//     } catch (err) {
//       console.error('Scan error:', err);
//       Alert.alert('Error', 'Error during document scan.');
//       setScreen('dashboard');
//     } finally {
//       setIsLoading(false);
//     }
//   };

//   const uploadScannedImages = async (uris: string[]) => {
//     if (isLoading) return;
// const selectedTs = availableTimesheets.find(ts => ts.id === selectedTimesheetId);

//   const formData = new FormData();
//   formData.append('foreman_id', String(user?.id));
//   formData.append('timesheet_id', String(selectedTs.id)); // Use the selected ID
//   formData.append('job_phase_id', String(selectedTs.job_phase_id));
//   formData.append('job_code', selectedTs.job_code || '');
//     try {
//       setIsLoading(true); 

//       const timesheetRes = await fetch(`${API_BASE_URL}/api/timesheets/by-foreman/${user?.id}`);
//       const timesheetData = await timesheetRes.json();

//       if (!selectedCategory) {
//         Alert.alert('Category required', 'Please select a category before uploading.');
//         setIsLoading(false); 
//         return;
//       }
      
//       if (!Array.isArray(timesheetData) || timesheetData.length === 0) {
//         Alert.alert('No Timesheet Found', 'You have no timesheet records assigned.');
//         setScreen('dashboard');
//         return;
//       }
      
//       const scanDate = new Date().toISOString().split('T')[0];
      
//       let selected = timesheetData.find((ts: any) => ts.date === scanDate);
      
//       if (!selected) {
//         const sorted = timesheetData
//           .slice()
//           .sort((a: any, b: any) => (a.date < b.date ? 1 : -1)); 
//         selected = sorted.find((ts: any) => ts.date <= scanDate) || sorted[0];
//       }

//       if (!selected) {
//         Alert.alert('No Timesheet Found', `No timesheet could be attached.`);
//         setScreen('dashboard');
//         return;
//       }

//       const formData = new FormData();
      
//       formData.append('foreman_id', String(user?.id));
//       formData.append('timesheet_id', String(selected.id));
//       formData.append('job_phase_id', String(selected.job_phase_id || ''));
//       formData.append('job_code', selected.job_code || '');

//       uris.forEach((uri, index) => {
//         formData.append('files', {
//           uri: Platform.OS === 'ios' ? uri.replace('file://', '') : uri,
//           type: 'image/jpeg',
//           name: `page_${index + 1}.jpg`,
//         } as any);
//       });

//       formData.append('category', selectedCategory || 'Unspecified');
//       formData.append('sub_category', selectedSubCategory || '');

//       console.log(`Uploading ${uris.length} pages linked to TS ID: ${selected.id}`);

//       const response = await fetch(`${API_BASE_URL}/api/ocr/scan`, {
//         method: 'POST',
//         body: formData,
//         headers: {
//             'Content-Type': 'multipart/form-data',
//         }
//       });

//       setShowCategoryModal(false);

//       const result = await response.json();
      
//       if (response.ok) {
//         // ✅ Restored the Date and Page Count info here
//         Alert.alert(
//           '✅ Upload Successful', 
//           `Your ticket is now being processed by the AI. It will appear in the 'Review' tab shortly.\n\nUploaded ${uris.length} page(s) to timesheet dated ${selected.date}.`
//         );
//       } else {
//         console.log('OCR Scan Failed:', result);
//         Alert.alert('Scan Failed', result.detail || 'Server could not process the images.');
//       }
//     } catch (err) {
//       console.error('Unexpected scan error:', err);
//       Alert.alert('Error', 'Network request failed.');
//     } finally {
//       setIsLoading(false);
//       setScreen('dashboard');
//       setScannedImageUris([]);
//     }
//   };

//   const AppHeader = () => (
//     <View style={styles.header}>
//       <View style={styles.headerLeft}>
//          <Image
//            source={require('../../assets/profile-placeholder.png')}
//            style={styles.headerProfileImage}
//          />
//       </View>
//       <View style={styles.headerRight}>
//         <TouchableOpacity style={styles.headerButton} onPress={logout}>
//           <Feather name="log-out" size={24} color={theme.colors.contentLight} />
//         </TouchableOpacity>
//       </View>
//     </View>
//   );

//   const ActionCard = ({
//     title,
//     subtitle,
//     imageUrl,
//     onPress,
//   }: {
//     title: string;
//     subtitle: string;
//     imageUrl: any;
//     onPress: () => void;
//   }) => {
//     const scaleAnim = useRef(new Animated.Value(1)).current;

//     const onPressIn = () => {
//       Animated.spring(scaleAnim, { toValue: 0.97, useNativeDriver: true }).start();
//     };
//     const onPressOut = () => {
//       Animated.spring(scaleAnim, { toValue: 1, useNativeDriver: true }).start();
//     };

//     return (
//       <Animated.View style={{ transform: [{ scale: scaleAnim }] }}>
//         <TouchableOpacity
//           activeOpacity={0.9}
//           onPress={onPress}
//           onPressIn={onPressIn}
//           onPressOut={onPressOut}
//         >
//           <View style={styles.card}>
//             <View style={styles.cardContent}>
//               <ImageBackground
//                 source={imageUrl}
//                 style={styles.cardImage}
//                 imageStyle={{ borderRadius: theme.borderRadius.lg }}
//               />
//               <View style={styles.cardTextContainer}>
//                 <Text style={styles.cardTitle}>{title}</Text>
//                 <Text style={styles.cardSubtitle}>{subtitle}</Text>
//               </View>
//               <Feather name="chevron-right" size={20} color={theme.colors.contentLight} />
//             </View>
//           </View>
//         </TouchableOpacity>
//       </Animated.View>
//     );
//   };

//   const BottomNavBar = () => (
//     <View style={styles.footer}>
//       <View style={styles.navBar}>
//         <TouchableOpacity style={styles.navItem}>
//           <View style={styles.navIconContainer}>
//             <Feather name="home" size={24} color={theme.colors.primary} />
//           </View>
//           <Text style={styles.navLabelActive}>Home</Text>
//         </TouchableOpacity>
//         <TouchableOpacity style={styles.navItem} onPress={handleScanDocument}>
//           <View style={styles.navIconContainer}>
//             <Feather name="camera" size={24} color={theme.colors.brandStone} />
//           </View>
//           <Text style={styles.navLabel}>Scan</Text>
//         </TouchableOpacity>
//         <TouchableOpacity style={styles.navItem} onPress={() => navigation.navigate('Review')}>
//           <View style={styles.navIconContainer}>
//             <Feather name="file-text" size={24} color={theme.colors.brandStone} />
//           </View>
//           <Text style={styles.navLabel}>Review</Text>
//         </TouchableOpacity>
//         <TouchableOpacity style={styles.navItem} onPress={() => navigation.navigate('TimesheetList')}>
//           <View style={styles.navIconContainer}>
//             <Feather name="calendar" size={24} color={theme.colors.brandStone} />
//           </View>
//           <Text style={styles.navLabel}>Timesheets</Text>
//         </TouchableOpacity>
//       </View>
//     </View>
//   );

//   // --- RENDER LOGIC ---
// if (screen === 'processing') {
//   return (
//     <SafeAreaView style={styles.safeArea}>
//       <ScrollView 
//         style={styles.processingContainer}
//         contentContainerStyle={{ padding: 24, paddingBottom: 100 }} // Extra bottom padding for upload button
//         showsVerticalScrollIndicator={false}
//       >
//         {/* Title & Preview */}
//         <Text style={styles.processingTitle}>
//           Processing {scannedImageUris.length} Page{scannedImageUris.length !== 1 ? 's' : ''}...
//         </Text>
        
//         {scannedImageUris.length > 0 && (
//           <Image 
//             style={styles.previewImage} 
//             source={{ uri: scannedImageUris[0] }} 
//           />
//         )}

//         {/* TIMESHEET SECTION - Fully isolated */}
//         <View style={{ marginTop: 24, marginBottom: 20 }}>
//           <Text style={{ fontWeight: '700', color: '#333', marginBottom: 12 }}>
//             Link to Timesheet (Required)
//           </Text>
// <ScrollView 
//   style={{ maxHeight: 100 }}
//   nestedScrollEnabled={true}
//   showsVerticalScrollIndicator={false}
// >
//   {availableTimesheets.length > 0 ? (
//     availableTimesheets.map((ts: any) => (
//       <TouchableOpacity
//         key={ts.id}
//         onPress={() => setSelectedTimesheetId(ts.id)}
//         style={{
//           padding: 12,
//           marginVertical: 4,
//           borderRadius: 8,
//           backgroundColor: selectedTimesheetId === ts.id ? theme.colors.primary : '#eee',
//           borderWidth: 1,
//           borderColor: selectedTimesheetId === ts.id ? theme.colors.primary : '#ddd'
//         }}
//       >
//         <Text style={{ 
//           color: selectedTimesheetId === ts.id ? '#fff' : '#333', 
//           fontWeight: '600',
//           fontSize: 14
//         }}>
//           {formatUSDate(ts.date)}
//         </Text>
//       </TouchableOpacity>
//     ))
//   ) : (
//     <View style={{ padding: 16, alignItems: 'center' }}>
//       <Text style={{ color: '#ff4444', fontWeight: '500' }}>
//         No timesheets found. Please create one first.
//       </Text>
//     </View>
//   )}
// </ScrollView>

//         </View>

//         {/* CATEGORY SECTION - Clear separation */}
//         <View style={{ marginBottom: 32 }}>
//           <Text style={styles.processingSubtitle}>
//             Please verify category and upload.
//           </Text>
          
//           <Text style={{ fontWeight: '700', color: '#333', marginTop: 20, marginBottom: 12 }}>
//             Select Category
//           </Text>
//           <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 16 }}>
//             {['Materials', 'Trucking', 'Dumping'].map((cat) => (
//               <TouchableOpacity
//                 key={cat}
//                 onPress={() => { 
//                   setSelectedCategory(cat); 
//                   if (cat !== 'Materials') setSelectedSubCategory(null); 
//                 }}
//                 style={{
//                   padding: 12,
//                   borderRadius: 8,
//                   backgroundColor: selectedCategory === cat ? theme.colors.primary : '#f5f5f5',
//                   minWidth: 90,
//                   alignItems: 'center',
//                   flex: 1,
//                   marginHorizontal: 4
//                 }}
//               >
//                 <Text style={{ 
//                   color: selectedCategory === cat ? '#fff' : '#333',
//                   fontWeight: '600',
//                   fontSize: 14
//                 }}>
//                   {cat}
//                 </Text>
//               </TouchableOpacity>
//             ))}
//           </View>

//           {selectedCategory === 'Materials' && (
//             <View style={{ marginBottom: 24 }}>
//               <Text style={{ fontWeight: '700', color: '#333', marginBottom: 12 }}>
//                 Material Type
//               </Text>
//               <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
//                 {['Asphalt', 'Concrete', 'Aggregate', 'Topsoil'].map((sub) => (
//                   <TouchableOpacity
//                     key={sub}
//                     onPress={() => setSelectedSubCategory(sub)}
//                     style={{
//                       padding: 10,
//                       borderRadius: 8,
//                       backgroundColor: selectedSubCategory === sub ? '#101010ff' : '#f1f1f1',
//                       minWidth: 78,
//                       alignItems: 'center',
//                       flex: 1,
//                       marginHorizontal: 2
//                     }}
//                   >
//                     <Text style={{ 
//                       color: selectedSubCategory === sub ? '#fff' : '#333',
//                       fontSize: 13,
//                       fontWeight: '500'
//                     }}>
//                       {sub}
//                     </Text>
//                   </TouchableOpacity>
//                 ))}
//               </View>
//             </View>
//           )}
//         </View>
//       </ScrollView>

//       {/* Fixed Upload Button - Always at bottom */}
//       <View style={{
//         position: 'absolute',
//         bottom: 100, // Above bottom nav
//         left: 24,
//         right: 24,
//         paddingVertical: 12
//       }}>
//         <TouchableOpacity
//           onPress={() => uploadScannedImages(scannedImageUris)}
//           disabled={isLoading || !selectedTimesheetId}
//           style={{ 
//             backgroundColor: (isLoading || !selectedTimesheetId) ? '#ccc' : theme.colors.primary,
//             padding: 16,
//             borderRadius: 12,
//             alignItems: 'center',
//             shadowColor: '#000',
//             shadowOffset: { width: 0, height: 2 },
//             shadowOpacity: 0.1,
//             shadowRadius: 4,
//             elevation: 3
//           }}
//         >
//           {isLoading ? (
//             <View style={{ flexDirection: 'row', gap: 10, alignItems: 'center' }}>
//               <ActivityIndicator color="#fff" size="small" />
//               <Text style={{ color: '#fff', fontWeight: '700' }}>Uploading...</Text>
//             </View>
//           ) : (
//             <Text style={{ color: '#fff', fontWeight: '700', fontSize: 16 }}>
//               {selectedTimesheetId ? 'Upload with Category' : 'Select Timesheet First'}
//             </Text>
//           )}
//         </TouchableOpacity>
//       </View>

//       {/* Global Loading Overlay */}
//       {isLoading && (
//         <View style={styles.loadingOverlay}>
//           <ActivityIndicator size="large" color={theme.colors.primary} />
//         </View>
//       )}
//     </SafeAreaView>
//   );
// }


//   // 2. Dashboard Screen
//   return (
//     <SafeAreaView style={styles.safeArea}>
//       <Modal visible={showCategoryModal} transparent animationType="fade">
//         <SafeAreaView style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: 'rgba(0,0,0,0.6)' }}>
//           <View style={{ width: '92%', backgroundColor: '#fff', borderRadius: 12, padding: 16 }}>
//             <Text style={{ fontWeight: '700', fontSize: 16, marginBottom: 12 }}>Select Ticket Category</Text>
//             <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 12 }}>
//               {['Materials', 'Trucking', 'Dumping'].map((cat) => (
//                 <Pressable key={cat} onPress={() => { setSelectedCategory(cat); if (cat !== 'Materials') setSelectedSubCategory(null); }} style={{ padding: 8, backgroundColor: selectedCategory === cat ? theme.colors.primary : '#eee', borderRadius: 8 }}>
//                   <Text style={{ color: selectedCategory === cat ? '#fff' : '#000' }}>{cat}</Text>
//                 </Pressable>
//               ))}
//             </View>
//             {selectedCategory === 'Materials' && (
//               <View style={{ marginBottom: 12 }}>
//                 <Text style={{ marginBottom: 8 }}>Material Type</Text>
//                 <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
//                   {['Asphalt', 'Concrete', 'Aggregate', 'Topsoil'].map((s) => (
//                     <Pressable key={s} onPress={() => setSelectedSubCategory(s)} style={{ padding: 8, backgroundColor: selectedSubCategory === s ? '#16A34A' : '#f0f0f0', borderRadius: 8 }}>
//                       <Text style={{ color: selectedSubCategory === s ? '#fff' : '#000' }}>{s}</Text>
//                     </Pressable>
//                   ))}
//                 </View>
//               </View>
//             )}
//             <View style={{ flexDirection: 'row', justifyContent: 'flex-end', gap: 8 }}>
//               <Pressable onPress={() => { setShowCategoryModal(false); setScreen('dashboard'); }} style={{ padding: 8 }}>
//                 <Text>Cancel</Text>
//               </Pressable>
//               <Pressable onPress={() => { setShowCategoryModal(false); setScreen('processing'); }} style={{ padding: 8 }}>
//                 <Text style={{ color: theme.colors.primary, fontWeight: '700' }}>Continue</Text>
//               </Pressable>
//             </View>
//           </View>
//         </SafeAreaView>
//       </Modal>
      
//       <View style={styles.container}>
//         <ScrollView contentContainerStyle={styles.scrollContent}>
//           <AppHeader />
          
//           <View style={styles.mainContent}>
//             <View style={styles.welcomeHeader}>
// <Text style={styles.welcomeTitle}>
//   Welcome, {user?.first_name
//     ? user.first_name.charAt(0).toUpperCase() + user.first_name.slice(1).toLowerCase()
//     : "Foreman"}
// </Text>
//               <Text style={styles.welcomeSubtitle}>What would you like to do today?</Text>
//             </View>
            
//             <View style={styles.actionsContainer}>
//               <ActionCard
//                 title="Scan Tickets"
//                 subtitle="Scan single or multi-page tickets."
//                 imageUrl={require('../../assets/scan-documents.png')}
//                 onPress={handleScanDocument}
//               />
//               <ActionCard
//                 title="Enter Timesheet Data"
//                 subtitle="Select a timesheet to fill out or edit."
//                 imageUrl={require('../../assets/timesheets.png')}
//                 onPress={() => navigation.navigate('TimesheetList')}
//               />
//               <ActionCard
//                 title="Review & Submit"
//                 subtitle="Review tickets and submit timesheet drafts."
//                 imageUrl={require('../../assets/review-tickets.png')}
//                 onPress={() => navigation.navigate('Review')}
//               />
//             </View>
//           </View>
//         </ScrollView>
        
//         <BottomNavBar />
        
//         {/* Global Loading Overlay */}
//         {isLoading && (
//             <View style={styles.loadingOverlay}>
//               <ActivityIndicator size="large" color={theme.colors.primary} />
//             </View>
//         )}
//       </View>
//     </SafeAreaView>
//   );
// };

// const styles = StyleSheet.create({
//   safeArea: { flex: 1, backgroundColor: theme.colors.backgroundLight },
//   container: { flex: 1 },
//   scrollContent: { flexGrow: 1, paddingBottom: 80 },
//   header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', padding: 24 },
//   headerLeft: { flexDirection: 'row', alignItems: 'center' },
//   headerProfileImage: { width: 40, height: 40, borderRadius: theme.borderRadius.full, backgroundColor: '#ddd' },
//   headerRight: { width: 40, alignItems: 'flex-end' },
//   headerButton: { padding: 8, borderRadius: theme.borderRadius.full },
//   mainContent: { paddingHorizontal: 24 },
//   welcomeHeader: { marginBottom: 32 },
//   welcomeTitle: { fontFamily: theme.fontFamily.display, fontSize: 30, fontWeight: 'bold', color: theme.colors.contentLight, marginBottom: 4 },
//   welcomeSubtitle: { fontFamily: theme.fontFamily.display, color: theme.colors.subtleLight, fontSize: 16 },
//   actionsContainer: { gap: 20 },
//   card: { backgroundColor: theme.colors.cardLight, borderRadius: theme.borderRadius.xl, overflow: 'hidden', shadowColor: "#000", shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.05, shadowRadius: 8, elevation: 3 },
//   cardContent: { flexDirection: 'row', alignItems: 'center', padding: 20, gap: 20 },
//   cardImage: { width: 80, height: 80, borderRadius: theme.borderRadius.lg, backgroundColor: '#eee' },
//   cardTextContainer: { flex: 1 },
//   cardTitle: { fontFamily: theme.fontFamily.display, fontSize: 16, fontWeight: 'bold', color: theme.colors.contentLight },
//   cardSubtitle: { fontFamily: theme.fontFamily.display, fontSize: 14, color: theme.colors.subtleLight, marginTop: 4 },
//   footer: { position: 'absolute', bottom: 0, left: 0, right: 0, backgroundColor: 'rgba(248, 247, 242, 0.95)', borderTopWidth: 1, borderTopColor: 'rgba(229, 229, 229, 0.4)' },
//   navBar: { flexDirection: 'row', justifyContent: 'space-around', paddingHorizontal: 8, paddingVertical: 8 },
//   navItem: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 4, padding: 4, borderRadius: theme.borderRadius.lg },
//   navIconContainer: { width: 32, height: 32, alignItems: 'center', justifyContent: 'center' },
//   navLabel: { fontFamily: theme.fontFamily.display, fontSize: 12, fontWeight: '500', color: theme.colors.brandStone },
//   navLabelActive: { fontFamily: theme.fontFamily.display, fontSize: 12, fontWeight: '700', color: theme.colors.primary },
//   processingContainer: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 24 },
//   processingTitle: { fontFamily: theme.fontFamily.display, fontSize: 22, fontWeight: 'bold', color: theme.colors.contentLight, marginBottom: 20, textAlign: 'center' },
//   processingSubtitle: { fontFamily: theme.fontFamily.display, fontSize: 14, color: theme.colors.subtleLight, marginTop: 10 },
//   previewImage: { width: 250, height: 300, resizeMode: 'contain', borderRadius: theme.borderRadius.lg, marginBottom: 20, borderWidth: 1, borderColor: '#ddd' },
//   loadingOverlay: {
//       ...StyleSheet.absoluteFillObject,
//       backgroundColor: 'rgba(255,255,255,0.5)',
//       justifyContent: 'center',
//       alignItems: 'center',
//       zIndex: 100
//   }
// });

// export default ForemanDashboard;


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
  Modal,
  Pressable
} from 'react-native';
import { useAuth } from '../../context/AuthContext'; 
import DocumentScanner from 'react-native-document-scanner-plugin';
import RNFS from 'react-native-fs';
import Feather from 'react-native-vector-icons/Feather';

import API_URL from "../../config";

const API_BASE_URL = API_URL;
const theme = {
  colors: {
    primary: '#070807ff',
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
  
  const [selectedCategory, setSelectedCategory] = useState<string>('Materials');
  const [selectedSubCategory, setSelectedSubCategory] = useState<string | null>(null);
  const [showCategoryModal, setShowCategoryModal] = useState(false);

  const [isLoading, setIsLoading] = useState(false);
  const [scannedImageUris, setScannedImageUris] = useState<string[]>([]);
  const [screen, setScreen] = useState<'dashboard' | 'processing'>('dashboard');
  
  const [availableTimesheets, setAvailableTimesheets] = useState<any[]>([]);
  const [selectedTimesheetId, setSelectedTimesheetId] = useState<number | null>(null);

  const formatUSDate = (dateString: string): string => {
    try {
      let parsedDate = new Date(dateString);
      if (isNaN(parsedDate.getTime())) {
        const cleanDate = dateString.substring(0, 10);
        parsedDate = new Date(cleanDate);
      }
      if (isNaN(parsedDate.getTime())) return dateString.substring(0, 10);
      const month = String(parsedDate.getMonth() + 1).padStart(2, '0');
      const day = String(parsedDate.getDate()).padStart(2, '0');
      const year = parsedDate.getFullYear();
      return `${month}/${day}/${year}`;
    } catch {
      return (dateString || '').substring(0, 10);
    }
  };

  const handleScanDocument = async () => {
    try {
      setIsLoading(true);
      const { scannedImages } = await DocumentScanner.scanDocument({
        maxNumDocuments: 24,
        letUserAdjustCrop: true 
      });

      if (scannedImages && scannedImages.length > 0) {
        const timesheetRes = await fetch(`${API_BASE_URL}/api/timesheets/by-foreman/${user?.id}`);
        const timesheetData = await timesheetRes.json();
        
        setAvailableTimesheets(Array.isArray(timesheetData) ? timesheetData : []);
        setScreen('processing');
        
        const processedUris: string[] = [];
        for (let i = 0; i < scannedImages.length; i++) {
          const originalUri = scannedImages[i];
          const newFileName = `ticket_${Date.now()}_p${i + 1}.jpg`;
          const oldPath = originalUri.startsWith('file://') ? originalUri.substring(7) : originalUri;
          const newPath = `${RNFS.DocumentDirectoryPath}/${newFileName}`;
          
          if (await RNFS.exists(oldPath)) {
             await RNFS.moveFile(oldPath, newPath);
             processedUris.push(`file://${newPath}`);
          } else {
             processedUris.push(originalUri); 
          }
        }
        setScannedImageUris(processedUris);
        setSelectedCategory('Materials');
        setSelectedSubCategory(null);
        setSelectedTimesheetId(null);
      } else {
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

  const uploadScannedImages = async (uris: string[]) => {
    if (isLoading || !selectedTimesheetId || !selectedCategory) return;
    try {
      setIsLoading(true); 
      const selectedTs = availableTimesheets.find(ts => ts.id === selectedTimesheetId);
      if (!selectedTs) {
        Alert.alert('No Timesheet Found', 'Selected timesheet not found.');
        setIsLoading(false);
        return;
      }

      const formData = new FormData();
      formData.append('foreman_id', String(user?.id));
      formData.append('timesheet_id', String(selectedTs.id));
      formData.append('job_phase_id', String(selectedTs.job_phase_id || ''));
      formData.append('job_code', selectedTs.job_code || '');

      uris.forEach((uri, index) => {
        formData.append('files', {
          uri: Platform.OS === 'ios' ? uri.replace('file://', '') : uri,
          type: 'image/jpeg',
          name: `page_${index + 1}.jpg`,
        } as any);
      });

      formData.append('category', selectedCategory);
      formData.append('sub_category', selectedSubCategory || '');

      const response = await fetch(`${API_BASE_URL}/api/ocr/scan`, {
        method: 'POST',
        body: formData,
        headers: { 'Content-Type': 'multipart/form-data' }
      });

      const result = await response.json();
      if (response.ok) {
        Alert.alert('✅ Upload Successful', `Ticket sent for processing.\n\nUploaded ${uris.length} page(s).`);
        setScreen('dashboard');
        setScannedImageUris([]);
        setSelectedTimesheetId(null);
      } else {
        Alert.alert('Scan Failed', result.detail || 'Server could not process images.');
      }
    } catch (err) {
      Alert.alert('Error', 'Network request failed.');
    } finally {
      setIsLoading(false);
    }
  };

  const AppHeader = () => (
    <View style={styles.header}>
      <View style={styles.headerLeft}>
         <Image source={require('../../assets/profile-placeholder.png')} style={styles.headerProfileImage} />
      </View>
      <View style={styles.headerRight}>
        <TouchableOpacity style={styles.headerButton} onPress={logout}>
          <Feather name="log-out" size={24} color={theme.colors.contentLight} />
        </TouchableOpacity>
      </View>
    </View>
  );

  const ActionCard = ({ title, subtitle, imageUrl, onPress }: any) => {
    const scaleAnim = useRef(new Animated.Value(1)).current;
    const onPressIn = () => Animated.spring(scaleAnim, { toValue: 0.97, useNativeDriver: true }).start();
    const onPressOut = () => Animated.spring(scaleAnim, { toValue: 1, useNativeDriver: true }).start();

    return (
      <Animated.View style={{ transform: [{ scale: scaleAnim }] }}>
        <TouchableOpacity activeOpacity={0.9} onPress={onPress} onPressIn={onPressIn} onPressOut={onPressOut}>
          <View style={styles.card}>
            <View style={styles.cardContent}>
              <ImageBackground source={imageUrl} style={styles.cardImage} imageStyle={{ borderRadius: theme.borderRadius.lg }} />
              <View style={styles.cardTextContainer}>
                <Text style={styles.cardTitle}>{title}</Text>
                <Text style={styles.cardSubtitle}>{subtitle}</Text>
              </View>
              <Feather name="chevron-right" size={20} color={theme.colors.contentLight} />
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
          <Feather name="home" size={24} color={theme.colors.primary} />
          <Text style={styles.navLabelActive}>Home</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.navItem} onPress={handleScanDocument}>
          <Feather name="camera" size={24} color={theme.colors.brandStone} />
          <Text style={styles.navLabel}>Scan</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.navItem} onPress={() => navigation.navigate('Review')}>
          <Feather name="file-text" size={24} color={theme.colors.brandStone} />
          <Text style={styles.navLabel}>Review</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.navItem} onPress={() => navigation.navigate('TimesheetList')}>
          <Feather name="calendar" size={24} color={theme.colors.brandStone} />
          <Text style={styles.navLabel}>Timesheets</Text>
        </TouchableOpacity>
      </View>
    </View>
  );

  // --- PROCESSING SCREEN ---
  if (screen === 'processing') {
    return (
      <SafeAreaView style={styles.safeArea}>
        <ScrollView 
          style={styles.processingContainer}
          contentContainerStyle={{ padding: 24, paddingBottom: 60 }}
          showsVerticalScrollIndicator={false}
        >
          {/* Back Button */}
          <TouchableOpacity 
            style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 20 }}
            onPress={() => setScreen('dashboard')}
          >
            <Feather name="arrow-left" size={20} color={theme.colors.primary} />
            <Text style={{ marginLeft: 8, fontWeight: '600' }}>Cancel</Text>
          </TouchableOpacity>

          <Text style={styles.processingTitle}>
            Review Scanned Ticket ({scannedImageUris.length} Page{scannedImageUris.length !== 1 ? 's' : ''})
          </Text>
          
          {scannedImageUris.length > 0 && (
            <Image style={styles.previewImage} source={{ uri: scannedImageUris[0] }} />
          )}

          <View style={{ marginTop: 24, marginBottom: 20 }}>
            <Text style={{ fontWeight: '700', color: '#333', marginBottom: 12 }}>Link to Timesheet (Required)</Text>
            <ScrollView style={{ maxHeight: 150 }} nestedScrollEnabled={true}>
              {availableTimesheets.length > 0 ? (
                availableTimesheets.map((ts: any) => (
                  <TouchableOpacity
                    key={ts.id}
                    onPress={() => setSelectedTimesheetId(ts.id)}
                    style={[styles.tsItem, selectedTimesheetId === ts.id && styles.tsItemSelected]}
                  >
                    <Text style={{ color: selectedTimesheetId === ts.id ? '#fff' : '#333', fontWeight: '600' }}>
                      {formatUSDate(ts.date)}
                    </Text>
                  </TouchableOpacity>
                ))
              ) : (
                <Text style={{ color: '#ff4444' }}>No timesheets found. Please create one first.</Text>
              )}
            </ScrollView>
          </View>

          {selectedTimesheetId && (
            <View style={{ marginBottom: 20 }}>
              <Text style={{ fontWeight: '700', color: '#333', marginBottom: 12 }}>Select Category</Text>
              <View style={{ flexDirection: 'row', gap: 8 }}>
                {['Materials', 'Trucking', 'Dumping'].map((cat) => (
                  <TouchableOpacity
                    key={cat}
                    onPress={() => { setSelectedCategory(cat); if (cat !== 'Materials') setSelectedSubCategory(null); }}
                    style={[styles.catBtn, selectedCategory === cat && styles.catBtnActive]}
                  >
                    <Text style={{ color: selectedCategory === cat ? '#fff' : '#333', fontWeight: '600' }}>{cat}</Text>
                  </TouchableOpacity>
                ))}
              </View>

              {selectedCategory === 'Materials' && (
                <View style={{ marginTop: 20 }}>
                  <Text style={{ fontWeight: '700', color: '#333', marginBottom: 12 }}>Material Type</Text>
                  <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
                    {['Asphalt', 'Concrete', 'Aggregate', 'Topsoil'].map((sub) => (
                      <TouchableOpacity
                        key={sub}
                        onPress={() => setSelectedSubCategory(sub)}
                        style={[styles.subBtn, selectedSubCategory === sub && styles.subBtnActive]}
                      >
                        <Text style={{ color: selectedSubCategory === sub ? '#fff' : '#333', fontSize: 13 }}>{sub}</Text>
                      </TouchableOpacity>
                    ))}
                  </View>
                </View>
              )}
            </View>
          )}

          {/* ✅ MOVED INSIDE SCROLLVIEW - NO LONGER ABSOLUTE */}
          <View style={styles.uploadButtonContainer}>
            <TouchableOpacity
              onPress={() => uploadScannedImages(scannedImageUris)}
              disabled={isLoading || !selectedTimesheetId || !selectedCategory}
              style={[
                styles.uploadButton,
                (isLoading || !selectedTimesheetId || !selectedCategory) && styles.uploadButtonDisabled
              ]}
            >
              {isLoading ? (
                <View style={styles.uploadButtonContent}>
                  <ActivityIndicator color="#fff" size="small" />
                  <Text style={styles.uploadButtonText}>Uploading...</Text>
                </View>
              ) : (
                <Text style={styles.uploadButtonText}>
                  {selectedTimesheetId && selectedCategory ? '✅ Upload Ticket' : 'Complete Selection Above'}
                </Text>
              )}
            </TouchableOpacity>
          </View>
        </ScrollView>
      </SafeAreaView>
    );
  }

  // --- DASHBOARD SCREEN ---
  return (
    <SafeAreaView style={styles.safeArea}>
      <View style={styles.container}>
        <ScrollView contentContainerStyle={styles.scrollContent}>
          <AppHeader />
          <View style={styles.mainContent}>
            <View style={styles.welcomeHeader}>
              <Text style={styles.welcomeTitle}>
                Welcome, {user?.first_name ? user.first_name.charAt(0).toUpperCase() + user.first_name.slice(1).toLowerCase() : "Foreman"}
              </Text>
              <Text style={styles.welcomeSubtitle}>What would you like to do today?</Text>
            </View>
            <View style={styles.actionsContainer}>
              <ActionCard title="Scan Tickets" subtitle="Scan single or multi-page tickets." imageUrl={require('../../assets/scan-documents.png')} onPress={handleScanDocument} />
              <ActionCard title="Enter Timesheet Data" subtitle="Select a timesheet to fill out or edit." imageUrl={require('../../assets/timesheets.png')} onPress={() => navigation.navigate('TimesheetList')} />
              <ActionCard title="Review & Submit" subtitle="Review tickets and submit timesheet drafts." imageUrl={require('../../assets/review-tickets.png')} onPress={() => navigation.navigate('Review')} />
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

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: theme.colors.backgroundLight },
  container: { flex: 1 },
  scrollContent: { flexGrow: 1, paddingBottom: 100 },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', padding: 24 },
  headerLeft: { flexDirection: 'row', alignItems: 'center' },
  headerProfileImage: { width: 40, height: 40, borderRadius: theme.borderRadius.full, backgroundColor: '#ddd' },
  headerRight: { width: 40, alignItems: 'flex-end' },
  headerButton: { padding: 8 },
  mainContent: { paddingHorizontal: 24 },
  welcomeHeader: { marginBottom: 32 },
  welcomeTitle: { fontSize: 30, fontWeight: 'bold', color: theme.colors.contentLight },
  welcomeSubtitle: { color: theme.colors.subtleLight, fontSize: 16 },
  actionsContainer: { gap: 20 },
  card: { backgroundColor: theme.colors.cardLight, borderRadius: theme.borderRadius.xl, overflow: 'hidden', elevation: 3 },
  cardContent: { flexDirection: 'row', alignItems: 'center', padding: 20, gap: 20 },
  cardImage: { width: 80, height: 80, backgroundColor: '#eee' },
  cardTextContainer: { flex: 1 },
  cardTitle: { fontSize: 16, fontWeight: 'bold' },
  cardSubtitle: { fontSize: 14, color: theme.colors.subtleLight },
  footer: { position: 'absolute', bottom: 0, left: 0, right: 0, backgroundColor: '#fff', borderTopWidth: 1, borderTopColor: '#eee' },
  navBar: { flexDirection: 'row', justifyContent: 'space-around', paddingVertical: 12 },
  navItem: { alignItems: 'center' },
  navLabel: { fontSize: 12, color: theme.colors.brandStone },
  navLabelActive: { fontSize: 12, fontWeight: '700', color: theme.colors.primary },
  
  processingContainer: { flex: 1 },
  processingTitle: { fontSize: 22, fontWeight: 'bold', marginBottom: 20 },
  previewImage: { width: '100%', height: 250, resizeMode: 'contain', borderRadius: 12, backgroundColor: '#000' },
  
  tsItem: { padding: 14, backgroundColor: '#eee', borderRadius: 8, marginVertical: 4 },
  tsItemSelected: { backgroundColor: theme.colors.primary },
  catBtn: { flex: 1, padding: 12, backgroundColor: '#eee', borderRadius: 8, alignItems: 'center' },
  catBtnActive: { backgroundColor: theme.colors.primary },
  subBtn: { paddingHorizontal: 16, paddingVertical: 10, backgroundColor: '#eee', borderRadius: 8 },
  subBtnActive: { backgroundColor: '#101010' },

  uploadButtonContainer: {
    marginTop: 30,
    marginBottom: 40, // Space at the very bottom
  },
  uploadButton: {
    backgroundColor: theme.colors.primary,
    padding: 18,
    borderRadius: 12,
    alignItems: 'center',
    elevation: 4,
  },
  uploadButtonDisabled: { backgroundColor: '#ccc' },
  uploadButtonContent: { flexDirection: 'row', gap: 10, alignItems: 'center' },
  uploadButtonText: { color: '#fff', fontWeight: '700', fontSize: 16 },
  
  loadingOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(255,255,255,0.7)',
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 999
  }
});

export default ForemanDashboard;