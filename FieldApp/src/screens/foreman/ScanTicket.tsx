


// import React, { useState, useRef, useEffect } from 'react';
// import {
//   StyleSheet,
//   Text,
//   TextInput,
//   TouchableOpacity,
//   View,
//   Alert,
//   Platform,
//   ActivityIndicator,
//   ScrollView,
//   Image
// } from 'react-native';
// import { useRoute } from '@react-navigation/native';
// import { SafeAreaView } from 'react-native-safe-area-context';
// import { Camera, useCameraDevice, PhotoFile } from 'react-native-vision-camera';
// import ImageResizer from 'react-native-image-resizer';
// // import RNFS from 'react-native-fs';

// // --- Main App Component ---
// export default function ScanTicket() {
//   // --- State Management ---
//   const [hasPermission, setHasPermission] = useState(false);
//   // <<< MODIFIED >>> Removed 'register', 'login' screens
//   const [screen, setScreen] = useState<'dashboard' | 'camera' | 'confirmPhoto' | 'review' | 'processing'>('dashboard');
//   const [tickets, setTickets] = useState<{ id: number, extracted_text: string, image_url: string }[]>([]);
//   const [isLoading, setIsLoading] = useState(false);
//   const [capturedPhoto, setCapturedPhoto] = useState<PhotoFile | null>(null);
//   const [rotation, setRotation] = useState(0);

//   const device = useCameraDevice('back');
//   const camera = useRef<Camera>(null);

//   // --- Configuration ---
//   const API_BASE_URL = 'https://coated-nonattributive-babara.ngrok-free.dev';

//   // --- Effects ---
//   useEffect(() => {
//     (async () => {
//       const status = await Camera.requestCameraPermission();
//       setHasPermission(status === 'granted');
//     })();
//   }, []);

//   // Capture photo
//   const handleCapturePhoto = async () => {
//     if (camera.current) {
//       setIsLoading(true);
//       try {
//         const photo = await camera.current.takePhoto({
//           flash: 'off',
//           enableShutterSound: false,
//         });
//         setCapturedPhoto(photo);
//         setRotation(0);
//         setScreen('confirmPhoto');
//       } catch (e) {
//         console.error("Failed to take photo", e);
//         Alert.alert("Error", "Could not capture photo.");
//       } finally {
//         setIsLoading(false);
//       }
//     }
//   };

//   // Rotate photo
//   const handleRotate = async () => {
//     if (!capturedPhoto) return;

//     try {
//       const newRotation = (rotation + 90) % 360;
//       setRotation(newRotation);

//       const imagePath = Platform.OS === 'android' ? `file://${capturedPhoto.path}` : capturedPhoto.path;

//       const rotatedImage = await ImageResizer.createResizedImage(
//         imagePath, 1080, 1080, 'JPEG', 100, newRotation, undefined, false,
//         { mode: 'contain', onlyScaleDown: false }
//       );

//       const uri = rotatedImage.uri.startsWith('file://') ? rotatedImage.uri.replace('file://', '') : rotatedImage.uri;
//       setCapturedPhoto({ ...capturedPhoto, path: uri });
//       setRotation(0);

//     } catch (error) {
//       console.error('Rotation Error:', error);
//       Alert.alert('Error', 'Could not rotate image.');
//     }
//   };

//   // Confirm & Scan
//  const handleConfirmAndScan = async () => {
//   if (!capturedPhoto) return;
//   setScreen('processing');
//   setIsLoading(true);

//   try {
//     const imagePath = Platform.OS === 'android' ? `file://${capturedPhoto.path}` : capturedPhoto.path;
//     const formData = new FormData();
//     formData.append('file', {
//       uri: imagePath,
//       type: 'image/jpeg',
//       name: 'ticket.jpg',
//     });

//     console.log('Uploading ticket...');
//     const response = await fetch(`${API_BASE_URL}/api/ocr/scan`, {
//       method: 'POST',
//       headers: { 'Content-Type': 'multipart/form-data' },
//       body: formData,
//     });

//     console.log('Response received:', response.status);
//     const textResponse = await response.text();
//     console.log('Raw response:', textResponse);

//     let result;
//     try {
//       result = JSON.parse(textResponse);
//     } catch (e) {
//       Alert.alert('Scan Failed', "Invalid JSON from server.");
//       setScreen('confirmPhoto');
//       setIsLoading(false);
//       return;
//     }

//     if (response.ok) {
//       Alert.alert('Scan Successful', `Extracted: ${result.extracted_text || JSON.stringify(result.extracted_table)}`);
//       setScreen('dashboard');
//       setCapturedPhoto(null);
//     } else {
//       Alert.alert('Scan Failed', result.detail || 'Could not process image.');
//       setScreen('confirmPhoto');
//     }
//   } catch (err) {
//     console.log('Unexpected scan error:', err);
//     Alert.alert('Error', 'Unexpected error while scanning.');
//     setScreen('confirmPhoto');
//   } finally {
//     setIsLoading(false);
//   }
// };


//   // Review Tickets
//   const handleReviewTickets = async () => {
//     setIsLoading(true);
//     try {
//       const response = await fetch(`${API_BASE_URL}/api/ocr/tickets`, { method: 'GET' });
//       if (response.ok) {
//         const data = await response.json();
//         console.log("Tickets API response:", JSON.stringify(data));
//         setTickets(data.tickets || []);
//         setScreen('review');
//       } else {
//         const data = await response.json();
//         Alert.alert('Fetch Failed', data.detail || 'Could not retrieve tickets.');
//       }
//     } catch {
//       Alert.alert('Error', 'An error occurred while fetching tickets.');
//     } finally {
//       setIsLoading(false);
//     }
//   };

//   // --- UI Screens ---
//   if (!hasPermission) {
//     return (
//       <View style={styles.container}>
//         <Text>No camera permission granted</Text>
//       </View>
//     );
//   }

//   if (screen === 'dashboard') {
//     return (
//       <SafeAreaView style={styles.dashboardContainer}>
//         <View style={styles.content}>
//           <Text style={styles.title}>Dashboard</Text>
//           <TouchableOpacity style={styles.buttonWide} onPress={() => setScreen('camera')} disabled={isLoading}>
//             <Text style={styles.buttonText}>Scan Ticket</Text>
//           </TouchableOpacity>
//           <TouchableOpacity style={styles.buttonWide} onPress={handleReviewTickets} disabled={isLoading}>
//             <Text style={styles.buttonText}>Review Tickets</Text>
//           </TouchableOpacity>
//         </View>
//       </SafeAreaView>
//     );
//   }

//   if (screen === 'camera') {
//     if (!device) return <ActivityIndicator size="large" color="blue" style={{ flex: 1 }} />;
//     return (
//       <View style={styles.fullScreen}>
//         <Camera
//           ref={camera}
//           style={StyleSheet.absoluteFill}
//           device={device}
//           isActive={true}
//           photo={true}
//         />
//         <View style={styles.cameraControls}>
//           <TouchableOpacity style={styles.captureButton} onPress={handleCapturePhoto} disabled={isLoading}>
//             {isLoading ? <ActivityIndicator color="#fff" /> : <View style={styles.captureInnerButton} />}
//           </TouchableOpacity>
//         </View>
//         <TouchableOpacity style={styles.backButton} onPress={() => setScreen('dashboard')}>
//           <Text style={styles.backButtonText}>Back</Text>
//         </TouchableOpacity>
//       </View>
//     );
//   }

//   if (screen === 'confirmPhoto' && capturedPhoto) {
//     return (
//       <SafeAreaView style={styles.container}>
//         <Text style={styles.title}>Confirm Scan</Text>
//         <View style={{ alignItems: 'center' }}>
//           <Image
//             style={[
//               styles.previewImage,
//               { transform: [{ rotate: `${rotation}deg` }] },
//             ]}
//             source={{ uri: `file://${capturedPhoto.path}` }}
//           />
//         </View>
//         <View style={styles.confirmationControls}>
//           <TouchableOpacity style={[styles.button, styles.retakeButton]} onPress={() => setScreen('camera')} disabled={isLoading}>
//             <Text style={styles.buttonText}>Retake</Text>
//           </TouchableOpacity>
//           <TouchableOpacity style={[styles.button, styles.rotateButton]} onPress={handleRotate} disabled={isLoading}>
//             <Text style={styles.buttonText}>Rotate</Text>
//           </TouchableOpacity>
//           <TouchableOpacity style={styles.button} onPress={handleConfirmAndScan} disabled={isLoading}>
//             <Text style={styles.buttonText}>Confirm & Scan</Text>
//           </TouchableOpacity>
//         </View>
//       </SafeAreaView>
//     );
//   }

//   if (screen === 'processing' && capturedPhoto) {
//     return (
//       <SafeAreaView style={styles.container}>
//         <Text style={styles.title}>Processing...</Text>
//         <View style={styles.processingContainer}>
//           <Image
//             style={[styles.previewImage, styles.processingImage]}
//             source={{ uri: `file://${capturedPhoto.path}` }}
//           />
//           <View style={styles.overlay}>
//             <ActivityIndicator size="large" color="#fff" />
//             <Text style={styles.processingText}>Scanning your ticket</Text>
//           </View>
//         </View>
//       </SafeAreaView>
//     );
//   }

//   if (screen === 'review') {
//     return (
//       <SafeAreaView style={styles.container}>
//         <Text style={styles.title}>Review Tickets</Text>
//         <ScrollView>
//           {tickets.length > 0 ? (
//             tickets.map(ticket => (
//               <View key={ticket.id} style={styles.ticket}>
//                 {ticket.image_url && (
//                     <Image
//                         source={{ uri: `${API_BASE_URL}${ticket.image_url}` }}
//                         style={styles.ticketImage}
//                         resizeMode="contain"
//                     />
//                 )}
//                 <Text style={styles.ticketText}>{ticket.extracted_text}</Text>
//               </View>
//             ))
//           ) : (
//             <Text>No tickets found.</Text>
//           )}

//         </ScrollView>
//         <TouchableOpacity style={styles.buttonWide} onPress={() => setScreen('dashboard')}>
//           <Text style={styles.buttonText}>Back to Dashboard</Text>
//         </TouchableOpacity>
//       </SafeAreaView>
//     );
//   }

//   return <View style={styles.container}><Text>Loading...</Text></View>;
// }

// // --- Styles ---
// const styles = StyleSheet.create({
//   container: { flex: 1, padding: 20, backgroundColor: '#f5f5f5', justifyContent: 'center' },
//   dashboardContainer: {
//     flex: 1,
//     backgroundColor: '#f5f5f5',
//   },
//   content: {
//     flex: 1,
//     justifyContent: 'center',
//     alignItems: 'center',
//     padding: 20,
//   },
//   fullScreen: { flex: 1, backgroundColor: 'black' },
//   title: { fontSize: 28, fontWeight: 'bold', marginBottom: 20, textAlign: 'center' },
//   button: { backgroundColor: '#007bff', padding: 15, borderRadius: 8, alignItems: 'center', flex: 1, marginHorizontal: 5 },
//   buttonWide: { backgroundColor: '#007bff', padding: 15, borderRadius: 8, alignItems: 'center', marginBottom: 10, width: '90%' },
//   retakeButton: { backgroundColor: '#6c757d' },
//   rotateButton: { backgroundColor: '#17a2b8' },
//   buttonText: { color: '#fff', fontSize: 16, fontWeight: 'bold' },
//   cameraControls: { position: 'absolute', bottom: 0, width: '100%', padding: 20, flexDirection: 'row', justifyContent: 'center' },
//   captureButton: { width: 70, height: 70, borderRadius: 35, backgroundColor: 'rgba(255,255,255,0.5)', justifyContent: 'center', alignItems: 'center' },
//   captureInnerButton: { width: 60, height: 60, borderRadius: 30, backgroundColor: 'white' },
//   backButton: { position: 'absolute', top: 50, left: 20, padding: 10, backgroundColor: 'rgba(0,0,0,0.5)', borderRadius: 10 },
//   backButtonText: { color: 'white', fontSize: 16 },
//   ticket: { backgroundColor: '#fff', padding: 15, borderRadius: 8, marginBottom: 10, borderWidth: 1, borderColor: '#eee' },
//   previewImage: { width: '100%', height: 300, resizeMode: 'contain', borderRadius: 10, marginBottom: 20 },
//   confirmationControls: { flexDirection: 'row', justifyContent: 'space-around', width: '100%' },
//   processingContainer: {
//     alignItems: 'center',
//     justifyContent: 'center',
//     width: '100%',
//   },
//   processingImage: {
//     opacity: 0.6,
//   },
//   overlay: {
//     ...StyleSheet.absoluteFillObject,
//     justifyContent: 'center',
//     alignItems: 'center',
//     backgroundColor: 'rgba(0, 0, 0, 0.4)',
//     borderRadius: 10,
//   },
//   processingText: {
//     color: '#fff',
//     marginTop: 10,
//     fontSize: 16,
//     fontWeight: 'bold',
//   },
//   ticketImage: {
//     width: '100%',
//     height: 200,
//     borderRadius: 8,
//     marginBottom: 10,
//   },
//   ticketText: {
//     fontSize: 16,
//     color: '#333',
//   },
// });
