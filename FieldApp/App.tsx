// // App.tsx
// import React, { useEffect, useState } from 'react';
// import { NavigationContainer } from '@react-navigation/native';
// import { AuthProvider } from './src/context/AuthContext';
// import AppNavigator from './src/navigation/AppNavigator';
// import Splash from './src/screens/Splash';

// export default function App() {
//   const [showSplash, setShowSplash] = useState(true);

//   useEffect(() => {
//     const timer = setTimeout(() => {
//       setShowSplash(false);
//     }, 2000);

//     return () => clearTimeout(timer);
//   }, []);

//   return (
//     <AuthProvider>
//       <NavigationContainer>
//         {showSplash ? <Splash /> : <AppNavigator />}
//       </NavigationContainer>
//     </AuthProvider>
//   );
// }


import React, { useEffect, useState } from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { AuthProvider } from './src/context/AuthContext';
import AppNavigator from './src/navigation/AppNavigator';
import Splash from './src/screens/Splash';
import { startGlobalSync  } from '../FieldApp/src/services/SyncService';
import Toast from 'react-native-toast-message';
import { toastConfig } from './src/components/toastConfig';
export default function App() {
  const [showSplash, setShowSplash] = useState(true);
  useEffect(() => {
    // Show splash for 2 seconds, then hide it
    const timer = setTimeout(() => {
      setShowSplash(false);
    }, 2000);
    return () => clearTimeout(timer);
  }, []);
useEffect(() => {
  startGlobalSync();
}, []);
  if (showSplash) {
    // :point_down: Show only the Splash screen during first 2 seconds
    return <Splash />;
  }
  return (
    <AuthProvider>
      <NavigationContainer>
        <AppNavigator />
      </NavigationContainer>
      <Toast config={toastConfig} />
      <Toast />
    </AuthProvider>
  );
}









