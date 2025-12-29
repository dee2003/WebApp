// import React, { useEffect, useState, useMemo } from 'react';
// import { View, Text, FlatList, TouchableOpacity, Linking, StyleSheet, ActivityIndicator, Alert } from 'react-native';
// import apiClient from '../../api/apiClient';
// import { useAuth } from '../../context/AuthContext'; 
// import Feather from 'react-native-vector-icons/Feather';
// import DateTimePicker from '@react-native-community/datetimepicker';
// import { RefreshControl } from 'react-native';

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
// const MAPBOX_TOKEN = 'pk.eyJ1IjoicGFibG9lYmxhbmNvIiwiYSI6ImNtNGxxcXU3djA0cGcybHE4b3pydjg1ZDUifQ.gRzyC2Zne53m5ZkMDjF14g';

// const ExecutiveDashboard = () => {
//   const [allSites, setAllSites] = useState<SiteBrief[]>([]);
//   const [loading, setLoading] = useState<boolean>(true);
//   const [selectedDate, setSelectedDate] = useState(new Date());
//   const [showDatePicker, setShowDatePicker] = useState(false);
//   const [readSites, setReadSites] = useState<number[]>([]);
//   const [visitedSites, setVisitedSites] = useState<number[]>([]);
//   const [sortOrder, setSortOrder] = useState<'furthest' | 'closest' | 'newest'>('newest');
//   const [expandedId, setExpandedId] = useState<number | null>(null);
//   const { logout } = useAuth();
// const [refreshing, setRefreshing] = useState(false); //
//   useEffect(() => {
//     fetchData();
//   }, []);

// const fetchData = async () => {
//   try {
//     setLoading(true);
//     const response = await apiClient.get('/api/timesheets/morning-brief');
//     // Get the ISO strings for Yesterday, Today, and Tomorrow
//       const today = new Date();
//       const yesterday = new Date(today);
//       yesterday.setDate(today.getDate() - 1);
//       const tomorrow = new Date(today);
//       tomorrow.setDate(today.getDate() + 1);

//     const validDates = [
//         yesterday.toISOString().split('T')[0],
//         today.toISOString().split('T')[0],
//         tomorrow.toISOString().split('T')[0]
//       ];

//       // 1. Filter: DRAFT status AND strictly within the 3-day window
//       const restrictedDrafts = response.data.filter((item: any) => 
//         item.status === 'DRAFT' && validDates.includes(item.date)
//       );

//     // 1. Filter for DRAFT status (Dispatcher's current schedule)
//     // const drafts = response.data.filter((item: any) => item.status === 'DRAFT');

//     const sitesWithDistance = await Promise.all(
//         restrictedDrafts.map(async (item: any) => {
//           const siteAddress = item.brief.address;
//           const dist = await getDistance(siteAddress);
          
//           return {
//             ...item.brief,
//             id: item.id,
//             date: item.date, // Use the date from the timesheet object
//             distanceMeters: dist,
//             distanceMiles: dist > 0 ? (dist / 1609.34).toFixed(1) : "N/A",
//             mapLink: `https://www.google.com/maps/dir/?api=1&origin=${OFFICE_LOCATION.latitude},${OFFICE_LOCATION.longitude}&destination=${encodeURIComponent(siteAddress)}`
//           };
//         })
//       );
//       setAllSites(sitesWithDistance);
//     } catch (error) {
//       console.error("Load Error:", error);
//     } finally {
//       setLoading(false);
//     }
//   };

//   // Logic: Pull to Refresh function
//   const onRefresh = React.useCallback(async () => {
//     setRefreshing(true);
//     await fetchData(); // Re-runs your data & distance logic
//     setRefreshing(false);
//   }, []);


// const getDistance = async (address: string): Promise<number> => {
//   try {
//     // 1. Geocoding
//     const geoUrl = `https://api.mapbox.com/geocoding/v5/mapbox.places/${encodeURIComponent(address)}.json?access_token=${MAPBOX_TOKEN}`;
//     const geoRes = await fetch(geoUrl);
//     const geoData = await geoRes.json();
    
//     if (!geoData.features || geoData.features.length === 0) return 0;
    
//     // MAPBOX COORDINATES ARE ALWAYS [LONGITUDE, LATITUDE]
//     const [destLon, destLat] = geoData.features[0].center;

//     // 2. Directions - MUST be {lon,lat};{lon,lat}
//     // Note: OFFICE_LOCATION.longitude must come before OFFICE_LOCATION.latitude
//     const dirUrl = `https://api.mapbox.com/directions/v5/mapbox/driving/${OFFICE_LOCATION.longitude},${OFFICE_LOCATION.latitude};${destLon},${destLat}?access_token=${MAPBOX_TOKEN}`;
    
//     const dirRes = await fetch(dirUrl);
//     const dirData = await dirRes.json();
    
//     if (!dirData.routes || dirData.routes.length === 0) return 0;
    
//     return dirData.routes[0].distance; // Distance in meters
//   } catch (e) {
//     console.error("Distance Error:", e);
//     return 0;
//   }
// };
//   // Filter and Sort Logic
// // Logic: Refined Filter and Sort
//   const filteredSites = useMemo(() => {
//     const dateStr = selectedDate.toISOString().split('T')[0];
//     let result = allSites.filter(s => s.date === dateStr);

//     if (sortOrder === 'furthest') {
//       result.sort((a, b) => b.distanceMeters - a.distanceMeters);
//     } else if (sortOrder === 'closest') {
//       result.sort((a, b) => a.distanceMeters - b.distanceMeters);
//     } 
//     // 'newest' stays as arrival order from the API
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
//               <TouchableOpacity 
//                 style={[styles.visitedToggle, isVisited && styles.visitedActive]} 
//                 onPress={() => toggleVisited(item.id)}
//               >
//                 <Feather name={isVisited ? "check-circle" : "circle"} size={16} color={isVisited ? "#FFF" : "#3949AB"} />
//                 <Text style={[styles.visitedText, isVisited && { color: '#FFF' }]}> Visited</Text>
//               </TouchableOpacity>
//             </View>
//           </View>
//         )}
//       </TouchableOpacity>
       
//     );
//   };

//   return (
//     <View style={styles.container}>
//       {/* Refined Header */}
//       <View style={styles.premiumHeader}>
//         <View>
//           <Text style={styles.headerContext}>EXECUTIVE VIEW</Text>
//           <Text style={styles.mainTitle}>Daily Site Logistics</Text>
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
//           display="default" // This ensures the native modal opens
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
//           contentContainerStyle={{ paddingBottom: 20 }}
//         />
//       )}
//     </View>
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
//     width: 210 // Prevents overlapping with the distance value
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
import { View, Text, FlatList, TouchableOpacity, Linking, StyleSheet, ActivityIndicator, Alert, Platform } from 'react-native';
import apiClient from '../../api/apiClient';
import { useAuth } from '../../context/AuthContext'; 
import Feather from 'react-native-vector-icons/Feather';
import DateTimePicker from '@react-native-community/datetimepicker';
import { RefreshControl, SafeAreaView } from 'react-native';

interface SiteBrief {
  id: number;
  foreman: string;
  job_code: string;
  job_name: string;
  summary: string;
  address: string;
  category: string;
  distanceMeters: number;
  distanceMiles: string;
  mapLink: string;
  date: string; // The date assigned by dispatcher
}

const OFFICE_LOCATION = { latitude: 38.9072, longitude: -77.0369 };

const ExecutiveDashboard = () => {
  const [allSites, setAllSites] = useState<SiteBrief[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [selectedDate, setSelectedDate] = useState(() => {
    const d = new Date(); d.setHours(0,0,0,0); return d;
  });
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [readSites, setReadSites] = useState<number[]>([]);
  const [visitedSites, setVisitedSites] = useState<number[]>([]);
  const [sortOrder, setSortOrder] = useState<'furthest' | 'closest' | 'newest'>('newest');
  const [expandedId, setExpandedId] = useState<number | null>(null);
  const { logout } = useAuth();
  
const [refreshing, setRefreshing] = useState(false); //

const getLocalDateString = (date: Date) => {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};

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

      const restrictedDrafts = response.data.filter((item: any) => 
        item.status === 'DRAFT' && validDates.includes(item.date)
      );

      const sites = restrictedDrafts.map((item: any) => ({
        ...item.brief,
        id: item.id,
        date: item.date,
        mapLink: `http://maps.apple.com/?saddr=${OFFICE_LOCATION.latitude},${OFFICE_LOCATION.longitude}&daddr=${encodeURIComponent(item.brief.address)}&dirflg=d`
        // mapLink: `https://www.google.com/maps/dir/?api=1&origin=${OFFICE_LOCATION.latitude},${OFFICE_LOCATION.longitude}&destination=${encodeURIComponent(item.brief.address)}`
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

  const onRefresh = () => { setRefreshing(true); fetchData(); };

  
 const filteredSites = useMemo(() => {
    const dateStr = getLocalDateString(selectedDate);
    let result = allSites.filter(s => s.date === dateStr);
    if (sortOrder === 'furthest') result.sort((a, b) => b.distanceMeters - a.distanceMeters);
    else if (sortOrder === 'closest') result.sort((a, b) => a.distanceMeters - b.distanceMeters);
    return result;
  }, [allSites, selectedDate, sortOrder]);

const handleOpenNavigation = (site: SiteBrief) => {
    if (!readSites.includes(site.id)) {
      setReadSites(prev => [...prev, site.id]); // Mark as Read
    }
    Linking.openURL(site.mapLink);
  };
  const toggleVisited = (id: number) => {
    setVisitedSites(prev => prev.includes(id) ? prev.filter(s => s !== id) : [...prev, id]);
  };

const renderSiteCard = ({ item }: { item: any }) => {
  const isUnread = !readSites.includes(item.id);
  const isVisited = visitedSites.includes(item.id);
  const isExpanded = expandedId === item.id;
  const data = item.categorized_data || {};

return (
    <TouchableOpacity 
        activeOpacity={0.9}
        onPress={() => setExpandedId(isExpanded ? null : item.id)}
        style={[styles.card, isUnread && styles.unreadCard]}
      >
      {/* COMPACT VIEW: Always visible */}
        <View style={styles.cardHeader}>
          <View style={{ flex: 1 }}>
            <Text style={styles.foremanText}>{item.foreman} {isUnread && "•"}</Text>
            <View style={styles.jobHighlightBadge}>
              <Text style={styles.jobTextBold}>{item.job_code} • {item.job_name}</Text>
            </View>
          </View>
          <View style={{ alignItems: 'flex-end' }}>
            <Text style={styles.distanceLabel}>FROM DC OFFICE</Text>
            <Text style={styles.distanceLarge}>{item.distanceMiles}<Text style={styles.unitText}> mi</Text></Text>
          </View>
        </View>

      {/* EXPANDED VIEW: Details */}
      {/* EXPANDED VIEW: Details */}
{isExpanded && (
  <View style={styles.expandedContainer}>
    {/* Grid Container for Categories */}
    <View style={styles.materialGrid}>
      {Object.entries(data).map(([category, vendors]: [string, any]) => {
        if (!vendors || Object.keys(vendors).length === 0) return null;

        return (
          <View key={category} style={styles.gridItem}>
            <Text style={styles.categoryTitle}>{category.toUpperCase()}</Text>
            
            {Object.entries(vendors).map(([vendorName, materials]: [string, any]) => (
              <View key={vendorName} style={styles.vendorGroup}>
                <Text style={styles.vendorNameText}>{vendorName}</Text>
                
                {Array.isArray(materials) ? materials.map((m: any, idx: number) => (
                  <View key={idx} style={styles.materialRow}>
                    <Text style={styles.detailHighlightText}>{m.important}</Text>
                    {/* Small dot or bullet to keep it clean */}
                    {/* <Text style={styles.materialBullet}> • </Text> */}
                    {/* <Text style={styles.infoText}>{m.material}</Text> */}
                  </View>
                )) : null}
              </View>
            ))}
          </View>
        );
      })}
    </View>
   <View style={styles.addressSection}>
              <Text style={styles.addressTextSmall}>📍 {item.address}</Text>
            </View>
    
      
        <View style={styles.actionRow}>
              <TouchableOpacity style={styles.smallMapButton} onPress={() => handleOpenNavigation(item)}>
                <Feather name="navigation" size={16} color="#FFF" />
                <Text style={styles.buttonText}> Nav</Text>
              </TouchableOpacity>
              {/* <TouchableOpacity 
                style={[styles.visitedToggle, isVisited && styles.visitedActive]} 
                onPress={() => toggleVisited(item.id)}
              >
                <Feather name={isVisited ? "check-circle" : "circle"} size={16} color={isVisited ? "#FFF" : "#3949AB"} />
                <Text style={[styles.visitedText, isVisited && { color: '#FFF' }]}> Visited</Text>
              </TouchableOpacity> */}
            </View>
          </View>
        )}
      </TouchableOpacity>
       
    );
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.innerContainer}>
      {/* Refined Header */}
      <View style={styles.premiumHeader}>
        
        <View>
          <Text style={styles.headerContext}>EXECUTIVE OVERVIEW</Text>
          <Text style={styles.mainTitle}>Daily Schedule Dashboard</Text>
        </View>
        <TouchableOpacity style={styles.profileBtn} onPress={logout}>
          <Feather name="log-out" size={20} color="#5C6BC0" />
        </TouchableOpacity>
      </View>

      {/* Modern Control Bar */}
      <View style={styles.controlBar}>
        <TouchableOpacity 
          onPress={() => setShowDatePicker(true)} 
          style={styles.calendarTrigger}
        >
           <Feather name="calendar" size={16} color="#5C6BC0" />
           <Text style={styles.calendarText}> {selectedDate.toLocaleDateString()}</Text>
        </TouchableOpacity>

    {/* Labeled Sort Toggle */}
        <View style={styles.sortToggleGroup}>
            <TouchableOpacity 
              onPress={() => setSortOrder('furthest')} 
              style={[styles.sortBtn, sortOrder === 'furthest' && styles.sortBtnActive]}
            >
                <Text style={[styles.sortLabel, sortOrder === 'furthest' && styles.activeText]}>Furthest</Text>
            </TouchableOpacity>
            <TouchableOpacity 
              onPress={() => setSortOrder('closest')} 
              style={[styles.sortBtn, sortOrder === 'closest' && styles.sortBtnActive]}
            >
                <Text style={[styles.sortLabel, sortOrder === 'closest' && styles.activeText]}>Closest</Text>
            </TouchableOpacity>
            <TouchableOpacity 
              onPress={() => setSortOrder('newest')} 
              style={[styles.sortBtn, sortOrder === 'newest' && styles.sortBtnActive]}
            >
                <Text style={[styles.sortLabel, sortOrder === 'newest' && styles.activeText]}>Newest</Text>
            </TouchableOpacity>
        </View>
      </View>
{showDatePicker && (
        <DateTimePicker
          value={selectedDate}
          mode="date"
          display={Platform.OS === 'ios' ? 'inline' : 'default'}
          onChange={(e, date) => { 
            setShowDatePicker(false); 
            if(date) setSelectedDate(date); 
          }}
        />
      )}
      {loading && !refreshing ? (
        <View style={styles.loader}><ActivityIndicator size="large" color="#5C6BC0" /></View>
      ) : (
        <FlatList
          data={filteredSites}
          renderItem={renderSiteCard}
          keyExtractor={(item) => item.id.toString()}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={['#3949AB']} />
          } //
          ListEmptyComponent={<Text style={styles.emptyText}>No draft schedules for this date.</Text>}
          contentContainerStyle={{ paddingBottom: 40 }}
        />
      )}
      </View>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
   premiumHeader: { flexDirection: 'row', justifyContent: 'space-between', marginTop: 60, marginBottom: 20, alignItems: 'center' },
  headerContext: { fontSize: 15, fontWeight: '800', color: '#9FA8DA', letterSpacing: 1.5 },
  mainTitle: { fontSize: 24, fontWeight: '900', color: '#283593' },
  profileBtn: { 
    padding: 10,
    backgroundColor: '#E8EAF6', 
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#C5CAE9'
  },
  // Control Bar Styles
  controlBar: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 20, alignItems: 'center' },
  calendarTrigger: { 
    backgroundColor: '#E8EAF6', // Soft light violet instead of dark
    flexDirection: 'row', 
    paddingVertical: 10, 
    paddingHorizontal: 14, 
    borderRadius: 12, 
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#C5CAE9'
  },
  innerContainer: {
    flex: 1,
    paddingHorizontal: 16, // This creates the "space" on the sides
  },
  calendarText: { 
    color: '#3F51B5', 
    fontWeight: '700', 
    fontSize: 14,
    marginLeft: 8,
    fontFamily: 'Manrope' 
  },
 // Sort Toggle Styles
  sortToggleGroup: { 
    flexDirection: 'row', 
    backgroundColor: '#FFFFFF', 
    borderRadius: 12, 
    padding: 4,
    borderWidth: 1,
    borderColor: '#E0E0E0'
  },
  sortBtn: { paddingVertical: 6, paddingHorizontal: 10, borderRadius: 8 },
  sortBtnActive: { backgroundColor: '#5C6BC0' },
  sortLabel: { fontSize: 11, fontWeight: '700', color: '#7986CB' },
  activeText: { color: '#FFFFFF' },
  // Card Enhancements
 jobHighlightBadge: { 
    // backgroundColor: '#fafafcff', 
    paddingHorizontal: 8, 
    paddingVertical: 5, 
    borderRadius: 6, 
    marginTop: 6, 
    alignSelf: 'flex-start' 
  },

  jobTextBold: { 
    fontSize: 16, 
    fontWeight: '800', 
    color: '#1A237E' 
  },
 
categoryBlock: {
    marginBottom: 12,
  },
materialGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    marginTop: 5,
    width: '100%',
  },
  gridItem: {
    width: '48%', // Creates the two-column effect
    marginBottom: 15,
  },
  vendorGroup: {
    marginBottom: 8,
  },
  materialBullet: {
    color: '#9FA8DA',
    fontSize: 12,
  },
  materialRow: {
    flexDirection: 'row',
    alignItems: 'baseline', // Better for mismatched font sizes
    marginBottom: 2,
    paddingLeft: 4,
  },
  // Ensure the quantity stands out but doesn't break the layout
  
  infoText: {
    fontSize: 13, // Slightly smaller to fit in the grid
    color: '#5C6BC0',
    fontWeight: '500',
    flexShrink: 1, // Prevents text from pushing the other column
  },
  categoryTitle: {
    fontSize: 11,
    fontWeight: '900',
    color: '#d9467cff',
    letterSpacing: 1.2,
    marginBottom: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#F0F0F0', // Visual separator
    paddingBottom: 2,
  },
  

expandedContainer: {
    marginTop: 15,
    paddingTop: 15,
    borderTopWidth: 1,
    borderTopColor: '#F0F0F0',
  },
  
  vendorNameText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#5263b5ff',
    marginBottom: 4,
  },
  
  // Highlighting the quantity with just Bold/Color
  detailHighlightText: {
    fontSize: 14,
    fontWeight: '800',
    color: '#2d272aff', // Deep Navy
  },
  detailTextBold: {
    fontSize: 14,
    fontWeight: '800',
    color: '#1A237E', // Deep Navy for maximum readability
    letterSpacing: 0.3,
  },
  // infoText: {
  //   fontSize: 13,
  //   color: '#5C6BC0',
  //   fontWeight: '500',
  // },
  // categoryTitle: {
  //   fontSize: 12,
  //   fontWeight: '900',
  //   color: '#d9467cff',
  //   letterSpacing: 1.5,
  //   marginBottom: 6,
  // },
  addressSection: {
    paddingVertical: 10,
    borderTopWidth: 1,
    borderTopColor: '#F5F5F5',
    marginTop: 5,
    flexDirection: 'row', // Align icon and text properly
    alignItems: 'flex-start',
  },

 distanceLabel: { 
    fontSize: 10, 
    fontWeight: '900', 
    color: '#9FA8DA', // Soft indigo
    letterSpacing: 0.5,
    marginBottom: -4 // Pulls label closer to the miles
  },

  distanceLarge: { 
    fontSize: 34, 
    fontWeight: '900', 
    color: '#FF8F00',
    textAlign: 'right'
  },
  unitText: { fontSize: 22, fontWeight: '600', color: '#FFB300' },
  addressTextSmall: { 
    fontSize: 12, 
    color: '#424242', 
    fontWeight: '500',
    flexShrink: 1, // BETTER: Allows text to wrap instead of forcing a fixed width
    lineHeight: 18,
  },
  
  container: { flex: 1, backgroundColor: '#F4F7FA', paddingHorizontal: 16 },
  card: { backgroundColor: '#FFF', borderRadius: 12, padding: 14, marginBottom: 12, borderLeftWidth: 4, borderLeftColor: '#E0E0E0' },
  unreadCard: { backgroundColor: '#ffffffff', borderLeftColor: '#3949AB' },
  
  cardHeader: { flexDirection: 'row', justifyContent: 'space-between' },
 
 
  foremanText: { fontSize: 18, fontWeight: '700', color: '#212121' },
  
  
  actionRow: { flexDirection: 'row', marginTop: 12, gap: 10 },
  smallMapButton: { backgroundColor: '#3949AB', flexDirection: 'row', alignItems: 'center', paddingHorizontal: 12, paddingVertical: 8, borderRadius: 8 },
  visitedToggle: { borderWidth: 1, borderColor: '#3949AB', flexDirection: 'row', alignItems: 'center', paddingHorizontal: 12, paddingVertical: 8, borderRadius: 8 },
  visitedActive: { backgroundColor: '#43A047', borderColor: '#43A047' },
  buttonText: { color: '#FFF', fontWeight: '700', fontSize: 12 },
  visitedText: { color: '#3949AB', fontWeight: '700', fontSize: 12 },
  emptyText: { textAlign: 'center', marginTop: 50, color: '#9E9E9E' },


  // Style for the centered activity indicator view
  loader: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(248, 249, 253, 0.7)', // Matches container background with slight transparency
  },

});

export default ExecutiveDashboard;



