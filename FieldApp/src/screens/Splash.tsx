import React, { useEffect } from 'react';
import { View, Image, Text, StyleSheet } from 'react-native';

export default function Splash({ navigation }: any) {
  // Navigation logic remains unchanged: waits 2.5s then moves to Login
  useEffect(() => {
    const timer = setTimeout(() => {
      navigation.replace("Login"); // after 2.5s go to Login
    }, 2500);
    return () => clearTimeout(timer);
  }, [navigation]);

  return (
    <View style={styles.container}>
      {/* Logo */}
      <Image 
        source={require('../../assets/logo.png')} 
        style={styles.logo} 
        resizeMode="contain" 
      />
      {/* App Name */}
      <Text style={styles.appName}>Mluis Payroll</Text>
      
      {/* Optional: Add a subtle loading indicator or version number */}
      <Text style={styles.loadingText}>Loading...</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  // **CHANGED:** Reverted to a white background to ensure the logo matches
  container: { 
    flex: 1, 
    justifyContent: 'center', 
    alignItems: 'center', 
    backgroundColor: '#fafafaff' // Clean white background
  },
  // Increased size for better visibility
  logo: { 
    width: 200, 
    height: 200,
    marginBottom: 20, // Space below the logo
  },
  // **CHANGED:** Text color is now the brand color to maintain branding
  appName: { 
    fontSize: 32, // Larger font size
    fontWeight: '800', 
    color: '#2D1793', // Brand color for text
  },
  loadingText: {
    position: 'absolute',
    bottom: 50,
    fontSize: 14,
    color: 'rgba(45, 23, 147, 0.7)', // Subtle brand color for the loading text
  }
});