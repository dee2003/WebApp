

// import React, { useEffect, useState, useMemo, useCallback } from 'react';
// import { View, Text, FlatList, TouchableOpacity, Linking, StyleSheet, ActivityIndicator, Alert, Platform } from 'react-native';
// import apiClient from '../../api/apiClient';
// import { useAuth } from '../../context/AuthContext'; 
// import Feather from 'react-native-vector-icons/Feather';
// import DateTimePicker from '@react-native-community/datetimepicker';
// import { RefreshControl, SafeAreaView } from 'react-native';

// interface SiteBrief {
//   id: number;
//   foreman: string;
//   job_code: string;
//   job_name: string;
//   summary: string;
//   address: string;
//   category: string;
//   distanceMeters: number;
//   distanceMiles: string;
//   mapLink: string;
//   date: string; // The date assigned by dispatcher
// }

// const OFFICE_LOCATION = { latitude: 38.9072, longitude: -77.0369 };

// const ExecutiveDashboard = () => {
//   const [allSites, setAllSites] = useState<SiteBrief[]>([]);
//   const [loading, setLoading] = useState<boolean>(true);
//   const [selectedDate, setSelectedDate] = useState(() => {
//     const d = new Date(); d.setHours(0,0,0,0); return d;
//   });
//   const [showDatePicker, setShowDatePicker] = useState(false);
//   const [readSites, setReadSites] = useState<number[]>([]);
//   const [visitedSites, setVisitedSites] = useState<number[]>([]);
//   const [sortOrder, setSortOrder] = useState<'furthest' | 'closest' | 'newest'>('newest');
//   const [expandedId, setExpandedId] = useState<number | null>(null);
//   const { logout } = useAuth();
  
// const [refreshing, setRefreshing] = useState(false); //

// const getLocalDateString = (date: Date) => {
//   const year = date.getFullYear();
//   const month = String(date.getMonth() + 1).padStart(2, '0');
//   const day = String(date.getDate()).padStart(2, '0');
//   return `${year}-${month}-${day}`;
// };

// const fetchData = useCallback(async () => {
//     try {
//       setLoading(true);
//       const response = await apiClient.get('/api/timesheets/morning-brief');
      
//       const today = new Date();
//       const yesterday = new Date(today); yesterday.setDate(today.getDate() - 1);
//       const tomorrow = new Date(today); tomorrow.setDate(today.getDate() + 1);

//       const validDates = [
//       getLocalDateString(yesterday),
//       getLocalDateString(today),
//       getLocalDateString(tomorrow)
//     ];

//       const restrictedDrafts = response.data.filter((item: any) => 
//         item.status === 'DRAFT' && validDates.includes(item.date)
//       );

//       const sites = restrictedDrafts.map((item: any) => ({
//         ...item.brief,
//         id: item.id,
//         date: item.date,
//         mapLink: `http://maps.apple.com/?saddr=${OFFICE_LOCATION.latitude},${OFFICE_LOCATION.longitude}&daddr=${encodeURIComponent(item.brief.address)}&dirflg=d`
//         // mapLink: `https://www.google.com/maps/dir/?api=1&origin=${OFFICE_LOCATION.latitude},${OFFICE_LOCATION.longitude}&destination=${encodeURIComponent(item.brief.address)}`
//       }));
//       setAllSites(sites);
//     } catch (error) {
//       console.error("Dashboard Load Error:", error);
//     } finally {
//       setLoading(false);
//       setRefreshing(false);
//     }
//   }, []);
// useEffect(() => { fetchData(); }, [fetchData]);

//   const onRefresh = () => { setRefreshing(true); fetchData(); };

  
//  const filteredSites = useMemo(() => {
//     const dateStr = getLocalDateString(selectedDate);
//     let result = allSites.filter(s => s.date === dateStr);
//     if (sortOrder === 'furthest') result.sort((a, b) => b.distanceMeters - a.distanceMeters);
//     else if (sortOrder === 'closest') result.sort((a, b) => a.distanceMeters - b.distanceMeters);
//     return result;
//   }, [allSites, selectedDate, sortOrder]);

// const handleOpenNavigation = (site: SiteBrief) => {
//     if (!readSites.includes(site.id)) {
//       setReadSites(prev => [...prev, site.id]); // Mark as Read
//     }
//     Linking.openURL(site.mapLink);
//   };
//   const toggleVisited = (id: number) => {
//     setVisitedSites(prev => prev.includes(id) ? prev.filter(s => s !== id) : [...prev, id]);
//   };

// const renderSiteCard = ({ item }: { item: any }) => {
//   const isUnread = !readSites.includes(item.id);
//   const isVisited = visitedSites.includes(item.id);
//   const isExpanded = expandedId === item.id;
//   const data = item.categorized_data || {};

// return (
//     <TouchableOpacity 
//         activeOpacity={0.9}
//         onPress={() => setExpandedId(isExpanded ? null : item.id)}
//         style={[styles.card, isUnread && styles.unreadCard]}
//       >
//       {/* COMPACT VIEW: Always visible */}
//         <View style={styles.cardHeader}>
//           <View style={{ flex: 1 }}>
//             <Text style={styles.foremanText}>{item.foreman} {isUnread && "•"}</Text>
//             <View style={styles.jobHighlightBadge}>
//               <Text style={styles.jobTextBold}>{item.job_code} • {item.job_name}</Text>
//             </View>
//           </View>
//           <View style={{ alignItems: 'flex-end' }}>
//             <Text style={styles.distanceLabel}>FROM DC OFFICE</Text>
//             <Text style={styles.distanceLarge}>{item.distanceMiles}<Text style={styles.unitText}> mi</Text></Text>
//           </View>
//         </View>

//       {/* EXPANDED VIEW: Details */}
//       {/* EXPANDED VIEW: Details */}
// {isExpanded && (
//   <View style={styles.expandedContainer}>
//     {/* Grid Container for Categories */}
//     <View style={styles.materialGrid}>
//       {Object.entries(data).map(([category, vendors]: [string, any]) => {
//         if (!vendors || Object.keys(vendors).length === 0) return null;

//         return (
//           <View key={category} style={styles.gridItem}>
//             <Text style={styles.categoryTitle}>{category.toUpperCase()}</Text>
            
//             {Object.entries(vendors).map(([vendorName, materials]: [string, any]) => (
//               <View key={vendorName} style={styles.vendorGroup}>
//                 <Text style={styles.vendorNameText}>{vendorName}</Text>
                
//                 {Array.isArray(materials) ? materials.map((m: any, idx: number) => (
//                   <View key={idx} style={styles.materialRow}>
//                     <Text style={styles.detailHighlightText}>{m.important}</Text>
//                     {/* Small dot or bullet to keep it clean */}
//                     {/* <Text style={styles.materialBullet}> • </Text> */}
//                     {/* <Text style={styles.infoText}>{m.material}</Text> */}
//                   </View>
//                 )) : null}
//               </View>
//             ))}
//           </View>
//         );
//       })}
//     </View>
//    <View style={styles.addressSection}>
//               <Text style={styles.addressTextSmall}>📍 {item.address}</Text>
//             </View>
    
      
//         <View style={styles.actionRow}>
//               <TouchableOpacity style={styles.smallMapButton} onPress={() => handleOpenNavigation(item)}>
//                 <Feather name="navigation" size={16} color="#FFF" />
//                 <Text style={styles.buttonText}> Nav</Text>
//               </TouchableOpacity>
//               {/* <TouchableOpacity 
//                 style={[styles.visitedToggle, isVisited && styles.visitedActive]} 
//                 onPress={() => toggleVisited(item.id)}
//               >
//                 <Feather name={isVisited ? "check-circle" : "circle"} size={16} color={isVisited ? "#FFF" : "#3949AB"} />
//                 <Text style={[styles.visitedText, isVisited && { color: '#FFF' }]}> Visited</Text>
//               </TouchableOpacity> */}
//             </View>
//           </View>
//         )}
//       </TouchableOpacity>
       
//     );
//   };

//   return (
//     <SafeAreaView style={styles.container}>
//       <View style={styles.innerContainer}>
//       {/* Refined Header */}
//       <View style={styles.premiumHeader}>
        
//         <View>
//           <Text style={styles.headerContext}>EXECUTIVE OVERVIEW</Text>
//           <Text style={styles.mainTitle}>Daily Schedule Dashboard</Text>
//         </View>
//         <TouchableOpacity style={styles.profileBtn} onPress={logout}>
//           <Feather name="log-out" size={20} color="#5C6BC0" />
//         </TouchableOpacity>
//       </View>

//       {/* Modern Control Bar */}
//       <View style={styles.controlBar}>
//         <TouchableOpacity 
//           onPress={() => setShowDatePicker(true)} 
//           style={styles.calendarTrigger}
//         >
//            <Feather name="calendar" size={16} color="#5C6BC0" />
//            <Text style={styles.calendarText}> {selectedDate.toLocaleDateString()}</Text>
//         </TouchableOpacity>

//     {/* Labeled Sort Toggle */}
//         <View style={styles.sortToggleGroup}>
//             <TouchableOpacity 
//               onPress={() => setSortOrder('furthest')} 
//               style={[styles.sortBtn, sortOrder === 'furthest' && styles.sortBtnActive]}
//             >
//                 <Text style={[styles.sortLabel, sortOrder === 'furthest' && styles.activeText]}>Furthest</Text>
//             </TouchableOpacity>
//             <TouchableOpacity 
//               onPress={() => setSortOrder('closest')} 
//               style={[styles.sortBtn, sortOrder === 'closest' && styles.sortBtnActive]}
//             >
//                 <Text style={[styles.sortLabel, sortOrder === 'closest' && styles.activeText]}>Closest</Text>
//             </TouchableOpacity>
//             <TouchableOpacity 
//               onPress={() => setSortOrder('newest')} 
//               style={[styles.sortBtn, sortOrder === 'newest' && styles.sortBtnActive]}
//             >
//                 <Text style={[styles.sortLabel, sortOrder === 'newest' && styles.activeText]}>Newest</Text>
//             </TouchableOpacity>
//         </View>
//       </View>
// {showDatePicker && (
//         <DateTimePicker
//           value={selectedDate}
//           mode="date"
//           display={Platform.OS === 'ios' ? 'inline' : 'default'}
//           onChange={(e, date) => { 
//             setShowDatePicker(false); 
//             if(date) setSelectedDate(date); 
//           }}
//         />
//       )}
//       {loading && !refreshing ? (
//         <View style={styles.loader}><ActivityIndicator size="large" color="#5C6BC0" /></View>
//       ) : (
//         <FlatList
//           data={filteredSites}
//           renderItem={renderSiteCard}
//           keyExtractor={(item) => item.id.toString()}
//           refreshControl={
//             <RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={['#3949AB']} />
//           } //
//           ListEmptyComponent={<Text style={styles.emptyText}>No draft schedules for this date.</Text>}
//           contentContainerStyle={{ paddingBottom: 40 }}
//         />
//       )}
//       </View>
//     </SafeAreaView>
//   );
// };

// const styles = StyleSheet.create({
//    premiumHeader: { flexDirection: 'row', justifyContent: 'space-between', marginTop: 60, marginBottom: 20, alignItems: 'center' },
//   headerContext: { fontSize: 15, fontWeight: '800', color: '#9FA8DA', letterSpacing: 1.5 },
//   mainTitle: { fontSize: 24, fontWeight: '900', color: '#283593' },
//   profileBtn: { 
//     padding: 10,
//     backgroundColor: '#E8EAF6', 
//     borderRadius: 12,
//     borderWidth: 1,
//     borderColor: '#C5CAE9'
//   },
//   // Control Bar Styles
//   controlBar: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 20, alignItems: 'center' },
//   calendarTrigger: { 
//     backgroundColor: '#E8EAF6', // Soft light violet instead of dark
//     flexDirection: 'row', 
//     paddingVertical: 10, 
//     paddingHorizontal: 14, 
//     borderRadius: 12, 
//     alignItems: 'center',
//     borderWidth: 1,
//     borderColor: '#C5CAE9'
//   },
//   innerContainer: {
//     flex: 1,
//     paddingHorizontal: 16, // This creates the "space" on the sides
//   },
//   calendarText: { 
//     color: '#3F51B5', 
//     fontWeight: '700', 
//     fontSize: 14,
//     marginLeft: 8,
//     fontFamily: 'Manrope' 
//   },
//  // Sort Toggle Styles
//   sortToggleGroup: { 
//     flexDirection: 'row', 
//     backgroundColor: '#FFFFFF', 
//     borderRadius: 12, 
//     padding: 4,
//     borderWidth: 1,
//     borderColor: '#E0E0E0'
//   },
//   sortBtn: { paddingVertical: 6, paddingHorizontal: 10, borderRadius: 8 },
//   sortBtnActive: { backgroundColor: '#5C6BC0' },
//   sortLabel: { fontSize: 11, fontWeight: '700', color: '#7986CB' },
//   activeText: { color: '#FFFFFF' },
//   // Card Enhancements
//  jobHighlightBadge: { 
//     // backgroundColor: '#fafafcff', 
//     paddingHorizontal: 8, 
//     paddingVertical: 5, 
//     borderRadius: 6, 
//     marginTop: 6, 
//     alignSelf: 'flex-start' 
//   },

//   jobTextBold: { 
//     fontSize: 16, 
//     fontWeight: '800', 
//     color: '#1A237E' 
//   },
 
// categoryBlock: {
//     marginBottom: 12,
//   },
// materialGrid: {
//     flexDirection: 'row',
//     flexWrap: 'wrap',
//     justifyContent: 'space-between',
//     marginTop: 5,
//     width: '100%',
//   },
//   gridItem: {
//     width: '48%', // Creates the two-column effect
//     marginBottom: 15,
//   },
//   vendorGroup: {
//     marginBottom: 8,
//   },
//   materialBullet: {
//     color: '#9FA8DA',
//     fontSize: 12,
//   },
//   materialRow: {
//     flexDirection: 'row',
//     alignItems: 'baseline', // Better for mismatched font sizes
//     marginBottom: 2,
//     paddingLeft: 4,
//   },
//   // Ensure the quantity stands out but doesn't break the layout
  
//   infoText: {
//     fontSize: 13, // Slightly smaller to fit in the grid
//     color: '#5C6BC0',
//     fontWeight: '500',
//     flexShrink: 1, // Prevents text from pushing the other column
//   },
//   categoryTitle: {
//     fontSize: 11,
//     fontWeight: '900',
//     color: '#d9467cff',
//     letterSpacing: 1.2,
//     marginBottom: 8,
//     borderBottomWidth: 1,
//     borderBottomColor: '#F0F0F0', // Visual separator
//     paddingBottom: 2,
//   },
  

// expandedContainer: {
//     marginTop: 15,
//     paddingTop: 15,
//     borderTopWidth: 1,
//     borderTopColor: '#F0F0F0',
//   },
  
//   vendorNameText: {
//     fontSize: 14,
//     fontWeight: '600',
//     color: '#5263b5ff',
//     marginBottom: 4,
//   },
  
//   // Highlighting the quantity with just Bold/Color
//   detailHighlightText: {
//     fontSize: 14,
//     fontWeight: '800',
//     color: '#2d272aff', // Deep Navy
//   },
//   detailTextBold: {
//     fontSize: 14,
//     fontWeight: '800',
//     color: '#1A237E', // Deep Navy for maximum readability
//     letterSpacing: 0.3,
//   },
//   // infoText: {
//   //   fontSize: 13,
//   //   color: '#5C6BC0',
//   //   fontWeight: '500',
//   // },
//   // categoryTitle: {
//   //   fontSize: 12,
//   //   fontWeight: '900',
//   //   color: '#d9467cff',
//   //   letterSpacing: 1.5,
//   //   marginBottom: 6,
//   // },
//   addressSection: {
//     paddingVertical: 10,
//     borderTopWidth: 1,
//     borderTopColor: '#F5F5F5',
//     marginTop: 5,
//     flexDirection: 'row', // Align icon and text properly
//     alignItems: 'flex-start',
//   },

//  distanceLabel: { 
//     fontSize: 10, 
//     fontWeight: '900', 
//     color: '#9FA8DA', // Soft indigo
//     letterSpacing: 0.5,
//     marginBottom: -4 // Pulls label closer to the miles
//   },

//   distanceLarge: { 
//     fontSize: 34, 
//     fontWeight: '900', 
//     color: '#FF8F00',
//     textAlign: 'right'
//   },
//   unitText: { fontSize: 22, fontWeight: '600', color: '#FFB300' },
//   addressTextSmall: { 
//     fontSize: 12, 
//     color: '#424242', 
//     fontWeight: '500',
//     flexShrink: 1, // BETTER: Allows text to wrap instead of forcing a fixed width
//     lineHeight: 18,
//   },
  
//   container: { flex: 1, backgroundColor: '#F4F7FA', paddingHorizontal: 16 },
//   card: { backgroundColor: '#FFF', borderRadius: 12, padding: 14, marginBottom: 12, borderLeftWidth: 4, borderLeftColor: '#E0E0E0' },
//   unreadCard: { backgroundColor: '#ffffffff', borderLeftColor: '#3949AB' },
  
//   cardHeader: { flexDirection: 'row', justifyContent: 'space-between' },
 
 
//   foremanText: { fontSize: 18, fontWeight: '700', color: '#212121' },
  
  
//   actionRow: { flexDirection: 'row', marginTop: 12, gap: 10 },
//   smallMapButton: { backgroundColor: '#3949AB', flexDirection: 'row', alignItems: 'center', paddingHorizontal: 12, paddingVertical: 8, borderRadius: 8 },
//   visitedToggle: { borderWidth: 1, borderColor: '#3949AB', flexDirection: 'row', alignItems: 'center', paddingHorizontal: 12, paddingVertical: 8, borderRadius: 8 },
//   visitedActive: { backgroundColor: '#43A047', borderColor: '#43A047' },
//   buttonText: { color: '#FFF', fontWeight: '700', fontSize: 12 },
//   visitedText: { color: '#3949AB', fontWeight: '700', fontSize: 12 },
//   emptyText: { textAlign: 'center', marginTop: 50, color: '#9E9E9E' },


//   // Style for the centered activity indicator view
//   loader: {
//     flex: 1,
//     justifyContent: 'center',
//     alignItems: 'center',
//     backgroundColor: 'rgba(248, 249, 253, 0.7)', // Matches container background with slight transparency
//   },

// });

// export default ExecutiveDashboard;



import React, { useEffect, useState, useMemo, useCallback } from 'react';
import { 
  View, Text, FlatList, TouchableOpacity, Linking, StyleSheet, 
  ActivityIndicator, Platform, TextInput, SafeAreaView, RefreshControl , Switch
} from 'react-native';
import apiClient from '../../api/apiClient';
import { useAuth } from '../../context/AuthContext'; 
import Feather from 'react-native-vector-icons/Feather';
import DateTimePicker from '@react-native-community/datetimepicker';
import { useNavigation } from '@react-navigation/native';
import { ExecutiveStackParamList } from '../../navigation/AppNavigator';
import { StackNavigationProp } from '@react-navigation/stack';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Animated } from 'react-native';

interface SiteBrief {
  id: number;
  foreman: string;
  job_code: string;
  job_name: string;
  address: string;
  distanceMiles: string;
  distanceMeters: number;
  date: string;
  status: string;
  categorized_data?: any; // Re-introduced for expanded material view
}

// Natalia's DC Office Base
const OFFICE_LOCATION = { latitude: 38.908669, longitude: -77.000575 };
type ExecutiveNavProp = StackNavigationProp<
  ExecutiveStackParamList,
  'ExecutiveDashboard'
>;

const ExecutiveDashboard = () => {
  const { logout } = useAuth();
  const [allSites, setAllSites] = useState<SiteBrief[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [refreshing, setRefreshing] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [expandedId, setExpandedId] = useState<number | null>(null);
  const [visitedSites, setVisitedSites] = useState<Record<number, boolean>>({});
  const navigation = useNavigation<ExecutiveNavProp>();

  const [selectedDate, setSelectedDate] = useState(new Date());
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [sortOrder, setSortOrder] = useState<'furthest' | 'closest'>('furthest');

  const searchWidth = React.useRef(new Animated.Value(52)).current;
const [isSearchFocused, setIsSearchFocused] = React.useState(false);
const insets = useSafeAreaInsets();

const expandSearch = () => {
  if (isSearchFocused) return;

  setIsSearchFocused(true);
  Animated.timing(searchWidth, {
    toValue: 260,
    duration: 250,
    useNativeDriver: false,
  }).start();
};


const collapseSearch = () => {
  if (searchQuery.length > 0) return;

  setIsSearchFocused(false);
  Animated.timing(searchWidth, {
    toValue: 52,
    duration: 200,
    useNativeDriver: false,
  }).start();
};

  const toggleVisited = (id: number) => {
    setVisitedSites(prev => ({ ...prev, [id]: !prev[id] }));
  };
  
  const getLocalDateString = (date: Date) => {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  };

  // const fetchData = useCallback(async () => {
  //   try {
  //     setLoading(true);
  //     const response = await apiClient.get('/api/timesheets/morning-brief');
      
  //     const today = new Date();
  //     const yesterday = new Date(today); yesterday.setDate(today.getDate() - 1);
  //     const tomorrow = new Date(today); tomorrow.setDate(today.getDate() + 1);

  //     const validDates = [
  //       getLocalDateString(yesterday),
  //       getLocalDateString(today),
  //       getLocalDateString(tomorrow)
  //     ];

  //     // Re-integrated draft filter logic from working code
  //     const restrictedDrafts = response.data.filter((item: any) => 
  //       item.status === 'DRAFT' && validDates.includes(item.date)
  //     );

  //     const sites = restrictedDrafts.map((item: any) => ({
  //       ...item.brief,
  //       id: item.id,
  //       date: item.date,
  //       status: item.status,
  //       categorized_data: item.brief?.categorized_data || item.categorized_data,
  //       distanceMeters: item.brief?.distanceMeters || 0,
  //       distanceMiles: item.brief?.distanceMiles || '0'
  //     }));

  //     setAllSites(sites);
  //   } catch (error) {
  //     console.error("Dashboard Load Error:", error);
  //   } finally {
  //     setLoading(false);
  //     setRefreshing(false);
  //   }
  // }, []);
const fetchData = useCallback(async () => {
  try {
    setLoading(true);
    const response = await apiClient.get('/api/timesheets/morning-brief');
    
    const today = new Date();
    const yesterday = new Date(today); yesterday.setDate(today.getDate() - 1);
    const tomorrow = new Date(today); tomorrow.setDate(today.getDate() + 1);

    const validDates = [
      getLocalDateString(yesterday),
      getLocalDateString(today),
      getLocalDateString(tomorrow)
    ];

    // Filter incoming data
    const restrictedDrafts = response.data.filter((item: any) => {
      const isDraftAndValidDate = item.status === 'DRAFT' && validDates.includes(item.date);
      
      // Since the backend is now correctly filtering by role, we primarily
      // check for the flagger role as a secondary safety measure
      const role = (item.role || item.data?.role || "").toLowerCase();
      const isFlagger = role === 'flagger' || item.is_flagger === true;

      return isDraftAndValidDate && !isFlagger;
    });

    const sites = restrictedDrafts.map((item: any) => ({
      ...item.brief,
      id: item.id,
      date: item.date,
      status: item.status,
      categorized_data: item.brief?.categorized_data,
      distanceMeters: item.brief?.distanceMeters || 0,
      distanceMiles: item.brief?.distanceMiles || '0'
    }));

    setAllSites(sites);
  } catch (error) {
    console.error("Dashboard Load Error:", error);
  } finally {
    setLoading(false);
    setRefreshing(false);
  }
}, []);

  useEffect(() => { fetchData(); }, [fetchData]);

  const filteredSites = useMemo(() => {
    const dateStr = getLocalDateString(selectedDate);
    let result = allSites.filter(site => {
      const matchesDate = site.date === dateStr;
      const foremanName = site.foreman || "";
      const jobCode = site.job_code || "";
      const matchesSearch = foremanName.toLowerCase().includes(searchQuery.toLowerCase()) || 
                            jobCode.includes(searchQuery);
      return matchesDate && matchesSearch;
    });

    if (sortOrder === 'furthest') result.sort((a, b) => b.distanceMeters - a.distanceMeters);
    else if (sortOrder === 'closest') result.sort((a, b) => a.distanceMeters - b.distanceMeters);
    return result;
  }, [allSites, searchQuery, selectedDate, sortOrder]);

   const handleOpenNavigation = (address: string) => {
    // Nav logic from DC Office to Site
    const url = Platform.select({
      ios: `http://maps.apple.com/?saddr=${OFFICE_LOCATION.latitude},${OFFICE_LOCATION.longitude}&daddr=${encodeURIComponent(address)}&dirflg=d`,
      android: `https://www.google.com/maps/dir/?api=1&origin=${OFFICE_LOCATION.latitude},${OFFICE_LOCATION.longitude}&destination=${encodeURIComponent(address)}`
    });
    if (url) Linking.openURL(url);
  };

 const renderCard = ({ item }: { item: SiteBrief }) => {
    const isExpanded = expandedId === item.id;
    const formatName = (name: string) => {
    if (!name) return "Unassigned";
    return name
      .toLowerCase()
      .split(' ')
      .map(word => word.charAt(0).toUpperCase() + word.slice(1))
      .join(' ');
  };
  const formattedForemanName = formatName(item.foreman);
    return (
      <TouchableOpacity 
        activeOpacity={0.7} 
        onPress={() => navigation.navigate('SiteDetail', { site: item })}
        style={styles.card}
      >
        <View style={styles.cardMain}>
          {/* Avatar */}
        <View style={styles.avatar}>
          {/* <Text style={styles.avatarText}>{(item.foreman || "??").substring(0, 2).toUpperCase()}</Text> */}
       <Text style={styles.avatarText}>
            {formattedForemanName.substring(0, 2).toUpperCase()}
          </Text>
        </View>
             


       {/* Vertical Content Column */}
        {/* <View style={styles.content}>
          <Text style={styles.foremanName} numberOfLines={1}>{item.foreman || "Unassigned"}</Text>
           */}
           <View style={styles.content}>
          {/* Apply the formatted name here */}
          <Text style={styles.foremanName} numberOfLines={1}>
            {formattedForemanName}
          </Text>
          {/* Job Name with Code as a prefix */}
          <Text style={styles.jobInfo} numberOfLines={2}>
            <Text style={styles.jobCodeText}>{item.job_code} </Text>
            • {item.job_name}
          </Text>
          {/* Distance moved BELOW the job info */}
          <View style={styles.distanceRow}>
            <Feather name="map-pin" size={12} color="#D97706" />
            <Text style={styles.distanceText}>{item.distanceMiles || "0"} miles</Text>
          </View>
        </View>

<TouchableOpacity 
          style={styles.navActionBtn} 
          onPress={() => handleOpenNavigation(item.address)}
        >
          <Feather name="navigation" size={20} color="#FFF" />
        </TouchableOpacity>
      </View>
    </TouchableOpacity>
    
     
    );
  };

  return (
   <View style={[styles.mainContainer, { paddingTop: insets.top }]}>
      <View style={styles.container}>
        
        {/* IMPROVED HEADER & DATE PLACEMENT */}
        <View style={styles.header}>
          <View>
            {/* <Text style={styles.welcomeLabel}>OPERATIONS OVERVIEW</Text> */}
            <Text style={styles.headerTitle}>Daily Schedule</Text>
          </View>
          <TouchableOpacity onPress={logout} style={styles.headerAction}>
            <Feather name="log-out" size={20} color="#EF4444" />
          </TouchableOpacity>
        </View>

       {/* REFINED CONTROL BAR */}
<View style={styles.standardControlBar}>
  
  {/* DATE SELECTOR - Standard Minimalist Style */}
  <TouchableOpacity 
    onPress={() => setShowDatePicker(true)} 
    style={styles.modernDateSelector}
    activeOpacity={0.7}
  >
    <View style={styles.dateIconCircle}>
      <Feather name="calendar" size={14} color="#059669" /> 
    </View>
    <View style={styles.dateTextContainer}>
      <Text style={styles.dateLabel}>SCHEDULED FOR</Text>
      <Text style={styles.dateValue}>
        {selectedDate.toLocaleDateString('en-US', { 
          month: 'short', 
          day: 'numeric',
          year: 'numeric'
        })}
      </Text>
    </View>
    <Feather name="chevron-down" size={16} color="#94A3B8" style={{ marginLeft: 8 }} />
  </TouchableOpacity>
  <TouchableOpacity 
  activeOpacity={0.8}
  onPress={expandSearch}
>
  <Animated.View style={[styles.animatedSearch, { width: searchWidth }]}>
    <Feather name="search" size={18} color="#94A3B8" />

    {isSearchFocused && (
      <TextInput
        autoFocus
        placeholder="Search..."
        style={styles.searchInput}
        value={searchQuery}
        onChangeText={setSearchQuery}
        onBlur={collapseSearch}
        placeholderTextColor="#94A3B8"
      />
    )}
  </Animated.View>
</TouchableOpacity>


</View>


        <View style={styles.routeHeader}>
            <Text style={styles.routeLabel}>ACTIVE ROUTES</Text>
            <View style={styles.toggleGroup}>
                <TouchableOpacity 
    onPress={() => setSortOrder('closest')} 
    style={[styles.toggleBtn, sortOrder === 'closest' && styles.toggleActive]}
  >
    <View style={styles.toggleContent}>
      <Feather 
        name="map-pin" 
        size={14} 
        color={sortOrder === 'closest' ? '#6366F1' : '#64748B'} 
      />
      <Text style={[styles.toggleText, sortOrder === 'closest' && styles.activeToggleText]}>
        CLOSEST
      </Text>
    </View>
  </TouchableOpacity>
               <TouchableOpacity 
    onPress={() => setSortOrder('furthest')} 
    style={[styles.toggleBtn, sortOrder === 'furthest' && styles.toggleActive]}
  >
    <View style={styles.toggleContent}>
      <Feather 
        name="trending-up" 
        size={14} 
        color={sortOrder === 'furthest' ? '#6366F1' : '#64748B'} 
      />
      <Text style={[styles.toggleText, sortOrder === 'furthest' && styles.activeToggleText]}>
        FURTHEST
      </Text>
    </View>
  </TouchableOpacity>
            </View>
        </View>

        {loading && !refreshing ? (
          <ActivityIndicator size="large" color="#6366F1" style={{ marginTop: 40 }} />
        ) : (
          <FlatList 
            data={filteredSites}
            renderItem={renderCard}
            keyExtractor={(item) => item.id.toString()}
            showsVerticalScrollIndicator={false}
            contentContainerStyle={{ paddingBottom: insets.bottom + 20 }}
            refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => {setRefreshing(true); fetchData();}} />}
          />
        )}
      </View>
      
      {showDatePicker && (
        <DateTimePicker
          value={selectedDate}
          mode="date"
          display="default"
          onChange={(e, date) => { setShowDatePicker(false); if(date) setSelectedDate(date); }}
        />
      )}
    </View>
  );
};

const styles = StyleSheet.create({
safeArea: { 
    flex: 1, 
    backgroundColor: '#F8FAFC',
    // Adds extra breathing room for notch/dynamic island devices
    paddingTop: Platform.OS === 'android' ? 10 : 0 
  },
  mainContainer: { 
    flex: 1, 
    backgroundColor: '#F8FAFC' 
  },
 container: { 
    flex: 1, 
    paddingHorizontal: 20,
  },
  
  // Header
  // header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: 25, marginBottom: 20 },
 header: { 
    flexDirection: 'row', 
    justifyContent: 'space-between', 
    alignItems: 'center', 
    marginTop: 20, // Increased spacing from top
    marginBottom: 25 
  },
  
  // headerTitle: { fontSize: 28, fontWeight: '900', color: '#0F172A', letterSpacing: -0.5 },
  headerAction: { width: 45, height: 45, backgroundColor: '#FEE2E2', borderRadius: 15, justifyContent: 'center', alignItems: 'center' },

  // Floating Controls
  floatingControls: { marginBottom: 25, gap: 12 },
 datePill: { 
    flexDirection: 'row', 
    alignItems: 'center', 
    backgroundColor: '#EEF2FF', 
    paddingHorizontal: 14, 
    paddingVertical: 13, 
    borderRadius: 14, // Slightly sharper corners for a professional look
    alignSelf: 'flex-start',
    borderWidth: 1,
    borderColor: '#E0E7FF',
    // Shadow makes the date feel "Primary"
    shadowColor: '#6366F1',
    shadowOpacity: 0.05,
    shadowRadius: 5,
    elevation: 2
  },
  datePillText: { 
    marginHorizontal: 8, 
    fontWeight: '800', 
    color: '#4338CA', 
    fontSize: 16,
    textTransform: 'uppercase' // Standardized professional look
  },
  searchWrapper: { 
    flexDirection: 'row', 
    alignItems: 'center', 
    backgroundColor: '#FFF', 
    paddingHorizontal: 15, 
    borderRadius: 18, 
    height: 55, 
    borderWidth: 1,
    borderColor: '#E2E8F0',
    shadowColor: '#000',
    shadowOpacity: 0.04,
    shadowRadius: 10,
    elevation: 2 
  },
  // searchInput: { flex: 1, marginLeft: 10, fontSize: 16, color: '#1E293B', fontWeight: '500' },

  // Route Header
  routeHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 15 },
  routeLabel: { fontSize: 14, fontWeight: '800', color: '#7896c0ff', letterSpacing: 1 },
  toggleContent: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  toggleGroup: { flexDirection: 'row', backgroundColor: '#F1F5F9', borderRadius: 12, padding: 8 },
  toggleBtn: { paddingVertical: 6, paddingHorizontal: 12, borderRadius: 10 },
  toggleActive: { backgroundColor: '#FFF', shadowColor: '#000', shadowOpacity: 0.05, shadowRadius: 5, elevation: 2 },
  toggleText: { 
    fontSize: 12, 
    fontWeight: '800', 
    color: '#64748B',
    letterSpacing: 0.5 
  },
  activeToggleText: { 
    color: '#6366F1' 
  },

  // Cards
  card: { 
    backgroundColor: '#FFF', 
    borderRadius: 24, 
    padding: 16, 
    marginBottom: 16, 
    borderWidth: 1, 
    borderColor: '#F1F5F9',
    shadowColor: '#6366F1',
    shadowOpacity: 0.06,
    shadowRadius: 15,
    elevation: 3 
  },
  activeCardBorder: { borderColor: '#6366F1', borderWidth: 1.5 },
 cardMain: { 
    flexDirection: 'row', 
    alignItems: 'center', 
    justifyContent: 'space-between' 
  },

  avatarContainer: { position: 'relative' },
  // avatar: { width: 50, height: 50, borderRadius: 25, backgroundColor: '#E8EAF6', justifyContent: 'center', alignItems: 'center' },
  avatar: { 
    width: 50, 
    height: 50, 
    borderRadius: 25, 
    backgroundColor: '#E8EAF6', 
    justifyContent: 'center', 
    alignItems: 'center' 
  },
  avatarText: { color: '#3F51B5', fontWeight: '700', fontSize: 18 },
  statusDot: { position: 'absolute', bottom: -2, right: -2, width: 14, height: 14, borderRadius: 7, backgroundColor: '#10B981', borderWidth: 3, borderColor: '#FFF' },
  content: { 
    flex: 1, 
    marginLeft: 15, 
    marginRight: 10 
  },
foremanName: { 
    fontSize: 18, 
    fontWeight: '800', 
    color: '#0F172A' 
  },

  jobInfo: { 
    fontSize: 14, 
    color: '#3538efff', 
    fontWeight: '500', 
    marginTop: 2 
  },

  jobCodeText: {
    color: '#6366F1', // Highlight the code in a different color
    fontWeight: '700',
  },
 distanceRow: { 
    flexDirection: 'row', 
    alignItems: 'center', 
    marginTop: 6 // Pushes distance below the job info
  },

  distanceText: { 
    fontSize: 16, 
    fontWeight: '700', 
    color: '#D97706', 
    marginLeft: 4 
  },

  badgeRow: { flexDirection: 'row', marginTop: 8, gap: 8 },
  inlineDistanceBadge: { 
    flexDirection: 'row', 
    alignItems: 'center', 
    backgroundColor: '#FFFBEB', // Light Amber background
    paddingHorizontal: 10, 
    paddingVertical: 5, 
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#FEF3C7'
  },
  inlineDistanceText: { 
    fontSize: 20, 
    fontWeight: '900', 
    color: '#D97706', // Deep Amber/Orange
    marginLeft: 5,
  },
  statusBadge: { backgroundColor: '#F8FAFC', paddingHorizontal: 8, paddingVertical: 4, borderRadius: 8, borderWidth: 1, borderColor: '#E2E8F0' },
  statusBadgeText: { fontSize: 10, fontWeight: '800', color: '#94A3B8' },
  
  // navActionBtn: { width: 44, height: 44, borderRadius: 14, backgroundColor: '#6366F1', justifyContent: 'center', alignItems: 'center', shadowColor: '#6366F1', shadowOpacity: 0.3, shadowRadius: 8, elevation: 4 },
navActionBtn: { 
    width: 46, 
    height: 46, 
    borderRadius: 14, 
    backgroundColor: '#6366F1', 
    justifyContent: 'center', 
    alignItems: 'center',
    shadowColor: '#6366F1',
    shadowOpacity: 0.3,
    shadowRadius: 5,
    elevation: 4
  },
  // Expanded Container
  expandedContainer: { marginTop: 16 },
  divider: { height: 1, backgroundColor: '#F1F5F9', marginBottom: 16 },
  expandedTitle: { fontSize: 11, fontWeight: '900', color: '#94A3B8', letterSpacing: 1, marginBottom: 10 },
  addressSub: { fontSize: 12, color: '#64748B', fontWeight: '500', lineHeight: 18 },

  topControlsRow: {
  flexDirection: 'row',
  alignItems: 'center',
  justifyContent: 'space-between',
  marginBottom: 25,
},

animatedSearch: {
  height: 52,
  flexDirection: 'row',
  alignItems: 'center',
  backgroundColor: '#FFF',
  borderRadius: 16,
  paddingHorizontal: 14,
  borderWidth: 1,
  borderColor: '#E2E8F0',
  shadowColor: '#000',
  shadowOpacity: 0.05,
  shadowRadius: 6,
  elevation: 3,
},

// searchInput: {
//   marginLeft: 10,
//   flex: 1,
//   fontSize: 15,
//   color: '#1E293B',
//   fontWeight: '600',
// },
standardControlBar: { 
    flexDirection: 'row', 
    alignItems: 'center', 
    justifyContent: 'space-between',
    marginBottom: 20,
    gap: 12
  },

  // NEW DATE SELECTOR STYLE
  modernDateSelector: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    // Subtle shadow for depth
    shadowColor: '#000',
    shadowOpacity: 0.03,
    shadowRadius: 8,
    elevation: 2,
  },
  dateIconCircle: {
    width: 30,
    height: 30,
    borderRadius: 15,
    backgroundColor: '#ECFDF5', // Very light emerald
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 10,
  },
  dateTextContainer: {
    flexDirection: 'column',
  },
  dateLabel: {
    fontSize: 9,
    fontWeight: '900',
    color: '#94A3B8',
    letterSpacing: 1,
  },
  dateValue: {
    fontSize: 14,
    fontWeight: '800',
    color: '#1E293B', // Dark Slate
  },

  // SEARCH UPDATES
  standardSearch: { 
    height: 48,
    flexDirection: 'row', 
    alignItems: 'center', 
    backgroundColor: '#FFFFFF', 
    paddingHorizontal: 14, 
    borderRadius: 14, 
    borderWidth: 1, 
    borderColor: '#E2E8F0',
  },
  searchInput: { 
    flex: 1, 
    marginLeft: 10, 
    fontSize: 15, 
    color: '#1E293B', 
    fontWeight: '600' 
  },

  // UPDATING HEADER TO MATCH

  headerTitle: { 
    fontSize: 26, 
    fontWeight: '900', 
    color: '#0F172A' 
  },
 

});

export default ExecutiveDashboard;
