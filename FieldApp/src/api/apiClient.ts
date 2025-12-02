// /src/api/apiClient.ts
import axios from 'axios';
import AsyncStorage from '@react-native-async-storage/async-storage';

const API_BASE_URL = 'https://8f0b7fdcd548.ngrok-free.app';

const apiClient = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Attach Authorization header dynamically with stored token
apiClient.interceptors.request.use(async (config) => {
  try {
    const storedAuth = await AsyncStorage.getItem('authData'); // same key as in AuthContext
    if (storedAuth) {
      const { token } = JSON.parse(storedAuth);
      if (token) {
        config.headers.Authorization = `Bearer ${token}`;
      }
    }
  } catch (err) {
    console.error('Failed to load token for request header', err);
  }
  return config;
});

export default apiClient;
