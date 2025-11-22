// import React, { useState, useCallback } from 'react';
// import {
//   View,
//   Text,
//   StyleSheet,
//   FlatList,
//   TouchableOpacity,
//   SafeAreaView,
//   ActivityIndicator,
//   Alert,
// } from 'react-native';
// import { useAuth } from '../../context/AuthContext';
// import { useFocusEffect } from '@react-navigation/native';
// import Icon from 'react-native-vector-icons/Feather';
// import apiClient from '../../api/apiClient';
// import { Timesheet } from '../../types';

// const THEME = {
//   primary: '#007AFF',
//   success: '#34C759',
//   background: '#F0F0F7',
//   card: '#FFFFFF',
//   text: '#1C1C1E',
//   textSecondary: '#6A6A6A',
//   border: '#E0E0E5',
// };

// const ReviewTimesheetScreen = ({ navigation }: { navigation: any }) => {
//   const { user } = useAuth();
//   const [drafts, setDrafts] = useState<Timesheet[]>([]);
//   const [loading, setLoading] = useState(true);

//   const fetchDrafts = async () => {
//     if (!user) return;
//     setLoading(true);
//     try {
//       // Use the dedicated endpoint for fetching drafts
//       const response = await apiClient.get(`/api/timesheets/drafts/by-foreman/${user.id}`);
//       setDrafts(response.data);
//     } catch (e) {
//       Alert.alert('Error', 'Failed to fetch draft timesheets.');
//       console.error(e);
//     } finally {
//       setLoading(false);
//     }
//   };

//   useFocusEffect(
//     useCallback(() => {
//       fetchDrafts();
//     }, [user])
//   );

//   const handleSend = async (timesheetId: number) => {
//     Alert.alert(
//       "Confirm Submission",
//       "Are you sure you want to send this timesheet to the supervisor?",
//       [
//         { text: "Cancel", style: "cancel" },
//         {
//           text: "Send",
//           onPress: async () => {
//             setLoading(true);
//             try {
//               await apiClient.post(`/api/timesheets/${timesheetId}/send`);
//               Alert.alert("Success", "Timesheet has been sent.");
//               fetchDrafts(); // Refresh the list
//             } catch (error) {
//               Alert.alert("Error", "Could not send the timesheet.");
//               console.error(error);
//               setLoading(false);
//             }
//           },
//           style: "destructive",
//         },
//       ]
//     );
//   };

//   const renderItem = ({ item }: { item: Timesheet }) => (
//     <View style={styles.itemOuterContainer}>
//       <TouchableOpacity
//         style={styles.itemContainer}
//         onPress={() => navigation.navigate('TimesheetEdit', { timesheetId: item.id })}
//       >
//         <View style={styles.itemTextContainer}>
//           <Text style={styles.itemTitle}>{item.timesheet_name || 'Untitled Timesheet'}</Text>
//           <Text style={styles.itemSubtitle}>
//             {new Date(item.date).toLocaleDateString()}
//           </Text>
//         </View>
//       </TouchableOpacity>
//       <TouchableOpacity style={styles.sendButton} onPress={() => handleSend(item.id)}>
//         <Icon name="send" size={20} color={THEME.primary} />
//         <Text style={styles.sendButtonText}>Send</Text>
//       </TouchableOpacity>
//     </View>
//   );

//   if (loading) {
//     return <ActivityIndicator size="large" style={styles.centered} />;
//   }

//   return (
//     <SafeAreaView style={styles.container}>
//       <FlatList
//         data={drafts}
//         renderItem={renderItem}
//         keyExtractor={(item) => item.id.toString()}
//         contentContainerStyle={styles.listContent}
//         ListEmptyComponent={
//           <View style={styles.emptyContainer}>
//             <Icon name="inbox" size={48} color={THEME.textSecondary} />
//             <Text style={styles.emptyText}>No drafts to review.</Text>
//             <Text style={styles.emptySubText}>Saved timesheets will appear here.</Text>
//           </View>
//         }
//       />
//     </SafeAreaView>
//   );
// };

// const styles = StyleSheet.create({
//   container: { flex: 1, backgroundColor: THEME.background },
//   centered: { flex: 1, justifyContent: 'center', alignItems: 'center' },
//   listContent: { padding: 16 },
//   itemOuterContainer: {
//     flexDirection: 'row',
//     alignItems: 'center',
//     backgroundColor: THEME.card,
//     borderRadius: 12,
//     marginBottom: 12,
//     shadowColor: '#000',
//     shadowOffset: { width: 0, height: 1 },
//     shadowOpacity: 0.05,
//     shadowRadius: 4,
//     elevation: 2,
//   },
//   itemContainer: {
//     flex: 1,
//     padding: 16,
//   },
//   itemTextContainer: { flex: 1 },
//   itemTitle: { fontSize: 16, fontWeight: '600', color: THEME.text },
//   itemSubtitle: { fontSize: 14, color: THEME.textSecondary, marginTop: 4 },
//   sendButton: {
//     flexDirection: 'row',
//     alignItems: 'center',
//     paddingHorizontal: 16,
//     paddingVertical: 20,
//     borderLeftWidth: 1,
//     borderLeftColor: THEME.border,
//   },
//   sendButtonText: {
//     marginLeft: 8,
//     color: THEME.primary,
//     fontWeight: '600',
//     fontSize: 16,
//   },
//   emptyContainer: {
//       flex: 1,
//       marginTop: '40%',
//       alignItems: 'center',
//       justifyContent: 'center'
//   },
//   emptyText: {
//     marginTop: 16,
//     fontSize: 18,
//     fontWeight: '600',
//     color: THEME.textSecondary,
//   },
//   emptySubText: {
//       marginTop: 8,
//       fontSize: 14,
//       color: THEME.textSecondary,
//   },
// });

// export default ReviewTimesheetScreen;

