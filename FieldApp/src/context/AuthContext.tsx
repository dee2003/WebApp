// src/context/AuthContext.tsx
import React, { createContext, useState, useContext, ReactNode, useEffect, useRef } from 'react';
import { Alert } from 'react-native'; 
import axios from 'axios'; 
import AsyncStorage from '@react-native-async-storage/async-storage'; 
import { User } from '../types';

// ✅ YOUR URL
const API_BASE_URL = "https://08c3cd858a93.ngrok-free.app";

interface AuthContextType {
  user: User | null;
  token: string | null;
  isLoading: boolean;
  login: (userData: User, token: string) => Promise<void>;
  logout: () => Promise<void>;
  ticketRefreshTrigger: number; 
}

const AuthContext = createContext<AuthContextType | null>(null);

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [user, setUser] = useState<User | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);
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
        }
      } catch (e) {
        console.error("Failed to load user data", e);
      } finally {
        setIsLoading(false);
      }
    };
    loadStorageData();
  }, []);

  // --- 2. Login Function ---
  const login = async (userData: User, newToken: string) => {
    // Explicitly clear any previous state first
    cleanUpSocket();
    
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
  
  // --- 3. Logout Function ---
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
    console.log("🧹 Cleaning up WebSocket...");
    if (pingInterval.current) {
      clearInterval(pingInterval.current);
      pingInterval.current = null;
    }
    if (ws.current) {
      ws.current.close();
      ws.current = null;
    }
  };

  // --- 4. WebSocket Logic (FIXED FOR MULTI-USER SWITCHING) ---
  useEffect(() => {
    // A. Guard: If no user, ensure socket is dead and stop.
    if (!user) {
      cleanUpSocket();
      return;
    }

    // B. Connection Logic
    const connectWebSocket = () => {
      // Force close existing socket if ID mismatch or simple cleanup
      if (ws.current) {
         console.log("⚠️ Closing existing socket before opening new one for user:", user.id);
         ws.current.close();
         ws.current = null;
      }

      console.log(`🔌 Initializing Global WebSocket for user ${user.id}...`);
      const wsUrl = `${API_BASE_URL.replace('https', 'wss').replace('http', 'ws')}/api/ocr/ws/${user.id}`;
      
      const socket = new WebSocket(wsUrl);
      ws.current = socket;

      socket.onopen = () => {
        console.log(`✅ Global WebSocket Connected for User ${user.id}`);
        
        // Clear old ping interval if exists
        if (pingInterval.current) clearInterval(pingInterval.current);

        // Setup Keep-alive
        pingInterval.current = setInterval(() => {
          if (socket.readyState === 1) socket.send("ping");
        }, 30000);
      };

      socket.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data);
          
          // Debugging log
          console.log(`📩 WS Message for ${user.id}:`, data.type);

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
        console.log(`⚠️ WebSocket disconnected for User ${user.id}`);
        // Only reconnect if the user state hasn't changed to null
        if (ws.current === socket && user) {
            ws.current = null;
            if (pingInterval.current) clearInterval(pingInterval.current);
            // Optional: Auto-reconnect after 5s
            // setTimeout(() => connectWebSocket(), 5000); 
        }
      };
    };

    connectWebSocket();

    // C. Lifecycle Cleanup: Runs when 'user.id' changes or component unmounts
    return () => {
      console.log(`🔄 React Effect Cleanup for User ${user.id}`);
      cleanUpSocket();
    };

  // ✅ CRITICAL FIX: Depend on user.id to trigger re-run when user changes
  }, [user?.id]); 

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