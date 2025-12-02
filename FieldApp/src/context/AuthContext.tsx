// // /src/context/AuthContext.tsx
// import React, { createContext, useState, useContext, ReactNode } from 'react';
// import { User } from '../types';

// interface AuthContextType {
//   user: User | null;
//   login: (userData: User) => void;
//   logout: () => void;
// }

// const AuthContext = createContext<AuthContextType | null>(null);

// export const AuthProvider = ({ children }: { children: ReactNode }) => {
//   const [user, setUser] = useState<User | null>(null);
//   const login = (userData: User) => setUser(userData);
//   const logout = () => setUser(null);

//   return (
//     <AuthContext.Provider value={{ user, login, logout }}>
//       {children}
//     </AuthContext.Provider>
//   );
// };

// export const useAuth = (): AuthContextType => {
//   const context = useContext(AuthContext);
//   if (!context) {
//     throw new Error('useAuth must be used within an AuthProvider');
//   }
//   return context;
// };


// /src/context/AuthContext.tsx
import React, { createContext, useState, useContext, ReactNode, useEffect } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { User } from '../types';

interface AuthContextType {
  user: User | null;
  token: string | null;
  login: (userData: User, token: string) => void;
  logout: () => void;
}

const AUTH_STORAGE_KEY = 'authData';

const AuthContext = createContext<AuthContextType | null>(null);

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [user, setUser] = useState<User | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Load stored auth on mount
    const loadAuthData = async () => {
      try {
        const jsonValue = await AsyncStorage.getItem(AUTH_STORAGE_KEY);
      } catch (e) {
        console.error('Failed to load auth data', e);
      } finally {
        setLoading(false);
      }
    };
    loadAuthData();
  }, []);

  const login = async (userData: User, token: string) => {
    console.log("🟢 AuthContext Login Called");
  console.log("👤 Saving User:", userData);
  console.log("🆔 Saving User ID:", userData?.id);
  console.log("🔑 Saving Token:", token);
    setUser(userData);
    setToken(token);
    // Persist to storage
    await AsyncStorage.setItem(AUTH_STORAGE_KEY, JSON.stringify({ user: userData, token }));
  };

  const logout = async () => {
    setUser(null);
    setToken(null);
    await AsyncStorage.removeItem(AUTH_STORAGE_KEY);
  };

  if (loading) {
    // Optionally show loading indicator while loading auth data
    return null;
  }

  return (
    <AuthContext.Provider value={{ user, token, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = (): AuthContextType => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
