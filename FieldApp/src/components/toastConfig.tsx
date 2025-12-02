import React from 'react';
import { View, Text, StyleSheet } from 'react-native';

export const toastConfig = {
  success: ({ text1, text2 }: any) => (
    <View style={styles.successContainer}>
      <Text style={styles.title}>{text1}</Text>
      {text2 ? <Text style={styles.message}>{text2}</Text> : null}
    </View>
  ),

  error: ({ text1, text2 }: any) => (
    <View style={styles.errorContainer}>
      <Text style={styles.title}>{text1}</Text>
      {text2 ? <Text style={styles.message}>{text2}</Text> : null}
    </View>
  )
};

const styles = StyleSheet.create({
  successContainer: {
    width: '98%',
    paddingVertical: 20,
    paddingHorizontal: 20,
    backgroundColor: '#4BB543', // green success
    borderRadius: 16,
    alignSelf: 'center',
    marginTop: 20,
  },
  errorContainer: {
    width: '90%',
    paddingVertical: 20,
    paddingHorizontal: 20,
    backgroundColor: '#FF4D4D', // red error
    borderRadius: 16,
    alignSelf: 'center',
    marginTop: 20,
  },
  title: {
    fontSize: 40,       // big font
    fontWeight: '800',
    color: '#fff',
    marginBottom: 5,
  },
  message: {
    fontSize: 35,
    color: '#fff',
  },
});
