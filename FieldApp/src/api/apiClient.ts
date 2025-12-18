// // /src/api/apiClient.ts
// import axios from 'axios';
// import AsyncStorage from '@react-native-async-storage/async-storage';
// import API_URL from "../config";

// export const API_BASE_URL = API_URL;

// const apiClient = axios.create({
//   baseURL: API_BASE_URL,
//   headers: {
//     'Content-Type': 'application/json',
//   },
// });

// // Attach Authorization header dynamically with stored token
// apiClient.interceptors.request.use(async (config) => {
//   try {
//     const storedAuth = await AsyncStorage.getItem('authData'); // same key as in AuthContext
//     if (storedAuth) {
//       const { token } = JSON.parse(storedAuth);
//       if (token) {
//         config.headers.Authorization = `Bearer ${token}`;
//       }
//     }
//   } catch (err) {
//     console.error('Failed to load token for request header', err);
//   }
//   return config;
// });

// export default apiClient;


import axios from 'axios';
import API_URL from '../config';

const apiClient = axios.create({
  baseURL: API_URL,
  timeout: 15000,
  headers: {
    'Content-Type': 'application/json',
  },
});

export default apiClient;
