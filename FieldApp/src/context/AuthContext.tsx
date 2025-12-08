// src/context/AuthContext.tsx
import React, { createContext, useState, useContext, ReactNode, useEffect, useRef } from 'react';
import { Alert } from 'react-native'; 
import { User } from '../types';
import axios from 'axios'; 
import AsyncStorage from '@react-native-async-storage/async-storage'; // ✅ Make sure this is installed

// ✅ YOUR URL (Keep this consistent with api.js)
const API_BASE_URL = "https://61e78ab11008.ngrok-free.app";

interface AuthContextType {
  user: User | null;
  token: string | null; // ✅ Added token to context
  isLoading: boolean;   // ✅ Added loading state
  login: (userData: User, token: string) => Promise<void>; // ✅ Updated signature
  logout: () => Promise<void>; // ✅ Updated signature to Promise
  ticketRefreshTrigger: number; 
}

const AuthContext = createContext<AuthContextType | null>(null);

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [user, setUser] = useState<User | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true); // Start true to check storage
  const [ticketRefreshTrigger, setTicketRefreshTrigger] = useState(0); 
  
  const ws = useRef<WebSocket | null>(null);
  const pingInterval = useRef<NodeJS.Timeout | null>(null);

  // --- 1. Check Local Storage on App Start ---
  useEffect(() => {
    const loadStorageData = async () => {
      try {
        const storedUser = await AsyncStorage.getItem('user');
        const storedToken = await AsyncStorage.getItem('token');

        if (storedUser && storedToken) {
          setUser(JSON.parse(storedUser));
          setToken(storedToken);
          // Optional: Configure axios default header here if not using interceptor
        }
      } catch (e) {
        console.error("Failed to load user data", e);
      } finally {
        setIsLoading(false);
      }
    };
    loadStorageData();
  }, []);

  // --- 2. Login Function (Updated) ---
  const login = async (userData: User, newToken: string) => {
    setIsLoading(true);
    try {
        setUser(userData);
        setToken(newToken);
        await AsyncStorage.setItem('user', JSON.stringify(userData));
        await AsyncStorage.setItem('token', newToken);
    } catch (e) {
        console.error("Login Error saving to storage:", e);
    } finally {
        setIsLoading(false);
    }
  };
  
  // --- 3. Logout Function (Updated) ---
  const logout = async () => {
    setIsLoading(true);
    try {
        cleanUpSocket();
        setUser(null);
        setToken(null);
        await AsyncStorage.removeItem('user');
        await AsyncStorage.removeItem('token');
    } catch (e) {
        console.error("Logout Error:", e);
    } finally {
        setIsLoading(false);
    }
  };

  const cleanUpSocket = () => {
    if (pingInterval.current) {
      clearInterval(pingInterval.current);
      pingInterval.current = null;
    }
    if (ws.current) {
      ws.current.close();
      ws.current = null;
    }
  };

  // --- 4. WebSocket Logic (Kept mostly same, added safety) ---
  useEffect(() => {
    if (!user) {
      cleanUpSocket();
      return;
    }

    const connectWebSocket = () => {
      if (ws.current) return;

      console.log(`🔌 Initializing Global WebSocket for user ${user.id}...`);
      // Convert http/https to ws/wss
      const wsUrl = `${API_BASE_URL.replace('https', 'wss').replace('http', 'ws')}/api/ocr/ws/${user.id}`;
      
      const socket = new WebSocket(wsUrl);
      ws.current = socket;

      socket.onopen = () => {
        console.log("✅ Global WebSocket Connected");
        // Keep-alive mechanism
        pingInterval.current = setInterval(() => {
          if (socket.readyState === 1) socket.send("ping");
        }, 30000);
      };

      socket.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data);
          
          // --- HANDLE DUPLICATE ALERT ---
          if (data.type === "DUPLICATE_ALERT") {
            Alert.alert(
                "Duplicate Ticket Detected",
                `Ticket #${data.original_number} already exists.\n\nWe saved this as version #${data.new_number}.`,
                [
                  {
                    text: "Delete",
                    style: "destructive",
                    onPress: async () => {
                      try {
                        await axios.post(`${API_BASE_URL}/api/ocr/delete-ticket`, {
                          ticket_id: data.ticket_id,
                          foreman_id: user.id
                        });
                        setTicketRefreshTrigger(prev => prev + 1); 
                        Alert.alert("Deleted", "Duplicate ticket removed.");
                      } catch (err) {
                        Alert.alert("Error", "Failed to delete ticket.");
                      }
                    }
                  },
                  {
                    text: "Yes, Keep it",
                    onPress: () => {
                      setTicketRefreshTrigger(prev => prev + 1); 
                    }
                  }
                ]
              );
          } 
          // --- HANDLE SUCCESS ---
          else if (data.type === "TICKET_PROCESSED") {
             console.log("✅ Ticket processed msg received:", data);
             
             // Refresh lists
             setTicketRefreshTrigger(prev => prev + 1);
             
             Alert.alert(
                 "✅ AI Processing Complete",
                 `Ticket #${data.ticket_number || 'New'} is now available in the Review tab.`
             );
          }

        } catch (e) {
          console.error("WS Parse Error", e);
        }
      };

      socket.onerror = (e) => console.log("❌ WebSocket error:", (e as any).message);

      socket.onclose = () => {
        console.log("⚠️ WebSocket disconnected");
        ws.current = null;
        if (pingInterval.current) clearInterval(pingInterval.current);
        // Auto reconnect logic
        setTimeout(() => { if(user) connectWebSocket(); }, 5000);
      };
    };

    connectWebSocket();

    return () => cleanUpSocket();
  }, [user]); 

  return (
    <AuthContext.Provider value={{ user, token, isLoading, login, logout, ticketRefreshTrigger }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = (): AuthContextType => {
  const context = useContext(AuthContext);
  if (!context) throw new Error('useAuth must be used within an AuthProvider');
  return context;
};