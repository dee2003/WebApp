import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet, SafeAreaView } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { StackNavigationProp } from '@react-navigation/stack';
import { FlaggerStackParamList } from '../../navigation/AppNavigator';

// Type the navigation prop correctly
type MelindaDashboardNavProp = StackNavigationProp<FlaggerStackParamList, 'FlaggerDashboard'>;

const MelindaDashboard = () => {
  const navigation = useNavigation<MelindaDashboardNavProp>(); // Fixes ts(2769)

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.welcomeSection}>
        <Text style={styles.welcomeText}>Hello Melinda,</Text>
        <Text style={styles.subText}>Flagger Management Dashboard</Text>
      </View>

      <View style={styles.grid}>
        <TouchableOpacity 
          style={styles.card}
          onPress={() => navigation.navigate('FlaggerEditor')}
        >
          <View style={styles.iconCircle}>
            <Text style={{fontSize: 30}}>📝</Text>
          </View>
          <Text style={styles.cardTitle}>Daily Log</Text>
          <Text style={styles.cardDesc}>Start a new blank template</Text>
        </TouchableOpacity>

        <TouchableOpacity style={styles.card}>
          <View style={[styles.iconCircle, {backgroundColor: '#fef3c7'}]}>
            <Text style={{fontSize: 30}}>📂</Text>
          </View>
          <Text style={styles.cardTitle}>History</Text>
          <Text style={styles.cardDesc}>View past submissions</Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f8fafc', padding: 20 },
  welcomeSection: { marginTop: 40, marginBottom: 30 },
  welcomeText: { fontSize: 28, fontWeight: 'bold', color: '#1e293b' },
  subText: { fontSize: 16, color: '#64748b' },
  grid: { flexDirection: 'row', justifyContent: 'space-between' },
  card: { backgroundColor: '#fff', width: '48%', padding: 20, borderRadius: 15, shadowColor: '#000', shadowOpacity: 0.05, elevation: 2 },
  iconCircle: { width: 60, height: 60, borderRadius: 30, backgroundColor: '#dcfce7', justifyContent: 'center', alignItems: 'center', marginBottom: 15 },
  cardTitle: { fontSize: 18, fontWeight: 'bold', color: '#1e293b' },
  cardDesc: { fontSize: 12, color: '#94a3b8', marginTop: 4 }
});

export default MelindaDashboard;