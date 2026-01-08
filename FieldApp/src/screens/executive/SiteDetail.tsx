import React from 'react';
import { View, Text, ScrollView, StyleSheet, TouchableOpacity, Platform, Linking, SafeAreaView } from 'react-native';
import Feather from 'react-native-vector-icons/Feather';

import { StackScreenProps } from '@react-navigation/stack';
import { ExecutiveStackParamList } from '../../navigation/AppNavigator';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

type Props = StackScreenProps<ExecutiveStackParamList, 'SiteDetail'>;
const OFFICE_LOCATION = { latitude: 38.908669, longitude: -77.000575 };
const SiteDetailScreen: React.FC<Props> = ({ route, navigation }) => {
  const { site } = route.params;
const insets = useSafeAreaInsets();
  const data = site.categorized_data || {};

  const handleOpenNavigation = () => {
    const address = site.address;
  if (!address) return;
    const url = Platform.select({
     
           ios: `http://maps.apple.com/?saddr=${OFFICE_LOCATION.latitude},${OFFICE_LOCATION.longitude}&daddr=${encodeURIComponent(address)}&dirflg=d`,
           android: `https://www.google.com/maps/dir/?api=1&origin=${OFFICE_LOCATION.latitude},${OFFICE_LOCATION.longitude}&destination=${encodeURIComponent(address)}`
         });
   
   if (url) Linking.openURL(url);
  };

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
          <Feather name="arrow-left" size={24} color="#1E293B" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Site Details</Text>
        <View style={{ width: 40 }} /> 
      </View>

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scrollContent}>
        {/* Hero Section */}
        <View style={styles.heroCard}>
          <Text style={styles.heroJobCode}>{site.job_code}</Text>
          <Text style={styles.heroJobName}>{site.job_name}</Text>
          <View style={styles.heroDivider} />
          <View style={styles.heroRow}>
            <View>
              <Text style={styles.label}>FOREMAN</Text>
              <Text style={styles.value}>{site.foreman}</Text>
            </View>
            <View style={{ alignItems: 'flex-end' }}>
              <Text style={styles.label}>DISTANCE</Text>
              <Text style={[styles.inlineDistanceText, { color: '#D97706' }]}>{site.distanceMiles} Miles</Text>
            </View>
          </View>
        </View>

        {/* Categorized Materials Grid */}
        <Text style={styles.sectionTitle}>VENDOR & MATERIAL OVERVIEW</Text>
        <View style={styles.materialGrid}>
          {Object.entries(data).length > 0 ? (
            Object.entries(data).map(([category, vendors]: [string, any]) => (
              <View key={category} style={styles.gridItem}>
                <View style={styles.categoryHeader}>
                  <Text style={styles.categoryTitle}>{category.toUpperCase()}</Text>
                </View>
                
                {Object.entries(vendors).map(([vendorName, materials]: [string, any]) => (
                  <View key={vendorName} style={styles.vendorGroup}>
                    <Text style={styles.vendorName}>{vendorName}</Text>
                    {Array.isArray(materials) && materials.map((m, idx) => (
                      <View key={idx} style={styles.materialRow}>
                        <Text style={styles.materialQty}>{m.important}</Text>
                        {/* <Text style={styles.materialName}>{m.material}</Text> */}
                      </View>
                    ))}
                  </View>
                ))}
              </View>
            ))
          ) : (
            <Text style={styles.emptyText}>No material data specified for this site.</Text>
          )}
        </View>

        {/* Address Footer */}
        <View style={styles.addressCard}>
          <Feather name="map" size={20} color="#6366F1" />
          <View style={{ flex: 1, marginLeft: 12 }}>
            <Text style={styles.label}>SITE LOCATION</Text>
            <Text style={styles.addressText}>{site.address}</Text>
          </View>
        </View>
      </ScrollView>

      {/* Primary Action Button */}
      <View style={[
        styles.footer, 
        { paddingBottom: insets.bottom > 0 ? insets.bottom : 20 }
      ]}>
        <TouchableOpacity style={styles.navButton} onPress={handleOpenNavigation}>
          <Feather name="navigation" size={20} color="#FFF" />
          <Text style={styles.navButtonText}>Start Navigation</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F8FAFC' },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 16 },
  backBtn: { width: 40, height: 40, borderRadius: 12, backgroundColor: '#FFF', justifyContent: 'center', alignItems: 'center', elevation: 2, shadowOpacity: 0.1 },
  headerTitle: { fontSize: 20, fontWeight: '800', color: '#0F172A' },
  scrollContent: { padding: 20 },
  
  heroCard: { backgroundColor: '#334155', borderRadius: 24, padding: 24, marginBottom: 25 },
  heroJobCode: { color: '#94A3B8', fontWeight: '800', fontSize: 15, letterSpacing: 1 },
  heroJobName: { color: '#FFF', fontSize: 24, fontWeight: '900', marginTop: 4 },
//   heroDivider: { height: 1, backgroundColor: '#334155', marginVertical: 20 },
heroDivider: { 
  height: 1, 
  backgroundColor: 'rgba(255, 255, 255, 0.2)', // Faint Amber
  marginVertical: 20 
},  
heroRow: { flexDirection: 'row', justifyContent: 'space-between' },
  
  label: { fontSize: 12, fontWeight: '800', color: '#94A3B8', letterSpacing: 1 },
  value: { fontSize: 18, fontWeight: '700', color: '#FFF', marginTop: 4 },
  
  sectionTitle: { fontSize: 13, fontWeight: '900', color: '#64748B', letterSpacing: 1.5, marginBottom: 15 },
  materialGrid: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-between' },
  gridItem: { width: '48%', backgroundColor: '#FFF', borderRadius: 16, padding: 12, marginBottom: 15, borderWidth: 1, borderColor: '#F1F5F9' },
  categoryHeader: { borderBottomWidth: 1, borderBottomColor: '#F1F5F9',  paddingBottom: 8,
  marginBottom: 8,},
  categoryTitle: { fontSize: 11, fontWeight: '900', color: '#6366F1' },
  vendorName: { fontSize: 13, fontWeight: '800', color: '#334155', marginBottom: 4 },
  materialRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 2 },
  materialQty: { fontSize: 12, fontWeight: '900', color: '#0F172A', marginRight: 4 },
  materialName: { fontSize: 12, color: '#64748B', fontWeight: '500' },
  
  addressCard: { flexDirection: 'row', backgroundColor: '#FFF', padding: 20, borderRadius: 20, alignItems: 'center', marginTop: 10 },
  addressText: { color: '#1E293B', fontWeight: '600', fontSize: 14, marginTop: 2 },
  vendorGroup: {
   marginBottom: 8,
 },
  footer: { 
    paddingHorizontal: 20, // Move horizontal padding here
    paddingTop: 15,        // Padding above the button
    backgroundColor: '#FFF', 
    borderTopWidth: 1, 
    borderTopColor: '#F1F5F9' 
  },
    inlineDistanceText: { 
    fontSize: 25, 
    fontWeight: '800', 
    color: '#D97706', // Deep Amber/Orange
    marginLeft: 5,
  },
  navButton: { backgroundColor: '#334155', height: 56, borderRadius: 16, flexDirection: 'row', justifyContent: 'center', alignItems: 'center', gap: 10 },
  navButtonText: { color: '#FFF', fontSize: 16, fontWeight: '800' },
  emptyText: { color: '#94A3B8', fontStyle: 'italic', fontSize: 14 }
});

export default SiteDetailScreen;