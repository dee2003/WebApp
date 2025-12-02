// // SyncService.ts
// import AsyncStorage from '@react-native-async-storage/async-storage';
// import NetInfo from '@react-native-community/netinfo';
// import apiClient from '../api/apiClient';

// export const syncAllDrafts = async () => {
//   try {
//     const keys = await AsyncStorage.getAllKeys();
//     const draftKeys = keys.filter(k => k.startsWith('@autoSave_timesheet_'));
    
//     for (const key of draftKeys) {
//       const draftStr = await AsyncStorage.getItem(key);
//       if (!draftStr) continue;
      
//       const draft = JSON.parse(draftStr);
//       const timesheetId = draft.timesheetId || key.replace('@autoSave_timesheet_', '');
      
//       try {
//         // ✅ Send PROCESSED data directly
//         await apiClient.put(`/api/timesheets/${timesheetId}`, {
//   data: draft.data,
//   status: draft.status
// });

//         await AsyncStorage.removeItem(`@autoSave_timesheet_${timesheetId}`);
//         console.log(`✅ Synced ${timesheetId}`);
//       } catch (err) {
//         console.error(`❌ Sync failed ${timesheetId}:`, err);
//       }
//     }
//   } catch (err) {
//     console.error('Sync error:', err);
//   }
// };

// let syncListener: any;
// export const startGlobalSync = () => {
//   syncListener?.();
//   syncListener = NetInfo.addEventListener(state => {
//     if (state.isConnected) {
//       setTimeout(syncAllDrafts, 3000); // 3s delay
//     }
//   });
// };



import Toast from "react-native-toast-message";  // <-- add at top
import AsyncStorage from '@react-native-async-storage/async-storage';
import NetInfo from '@react-native-community/netinfo';
import apiClient from '../api/apiClient';

export const syncAllDrafts = async () => {
  try {
    
    const keys = await AsyncStorage.getAllKeys();
    const draftKeys = keys.filter(k => k.startsWith('@autoSave_timesheet_'));

    if (draftKeys.length === 0) return; // nothing to sync

    let syncedCount = 0;

    for (const key of draftKeys) {
      const draftStr = await AsyncStorage.getItem(key);
      if (!draftStr) continue;

      const draft = JSON.parse(draftStr);
      const timesheetId =
        draft.timesheetId || key.replace("@autoSave_timesheet_", "");

      try {
        await apiClient.put(`/api/timesheets/${timesheetId}`, {
          data: draft.data,
          status: draft.status,
        });

        syncedCount++;
        await AsyncStorage.removeItem(`@autoSave_timesheet_${timesheetId}`);
        console.log(`✅ Synced ${timesheetId}`);
      } catch (err) {
        console.error(`❌ Sync failed ${timesheetId}:`, err);
      }
    }

    // 🔥 ONLY show toast if something was actually synced
    if (syncedCount > 0) {
      Toast.show({
  type: 'success',
  text1: 'Timesheet Synced',
  text2: 'Your offline data was saved successfully.',
  position: 'top',
  visibilityTime: 3000, // 3 seconds
});

    }

  } catch (err) {
    console.error("Sync error:", err);
  }
};
let syncListener: any;
export const startGlobalSync = () => {
  syncListener?.();
  syncListener = NetInfo.addEventListener(state => {
    if (state.isConnected) {
      setTimeout(syncAllDrafts, 2000); // 3s delay
    }
  });
};
