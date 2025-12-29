

// export default AppNavigator;
import React from 'react';
import { createStackNavigator } from '@react-navigation/stack';
import { NavigatorScreenParams } from '@react-navigation/native';
import { useAuth } from '../context/AuthContext';
// --- Screen Imports ---
import LoginScreen from '../screens/LoginScreen';
import ForemanDashboard from '../screens/foreman/ForemanDashboard';
import TimesheetListScreen from '../screens/foreman/TimesheetListScreen';
import TimesheetEditScreen from '../screens/foreman/TimesheetEditScreen';
// import ReviewTimesheetScreen from '../screens/foreman/ReviewTimesheetScreen'; // <-- IMPORT NEW SCREEN
import SupervisorDashboard from '../screens/supervisor/SupervisorDashboard';
import SupervisorTimesheetListScreen from '../screens/supervisor/SupervisorTimesheetListScreen';
import SupervisorTicketListScreen from '../screens/supervisor/SupervisorTicketListScreen';
import TimesheetViewScreen from '../screens/supervisor/TimesheetViewScreen';
import ReviewScreen from '../screens/foreman/ReviewScreen'; // <-- IMPORT NEW UNIFIED SCREEN
import ForemanTimesheetViewScreen from '../screens/foreman/ForemanTimesheetViewScreen'; // <-- IMPORT NEW UNIFIED SCREEN
import ForgotPasswordScreen from '../screens/ForgotPasswordScreen'
import OtpVerifyScreen from '../screens/OtpVerifyScreen';
import ResetPasswordScreen from '../screens/ResetPasswordScreen';
// --- NEW: Project Engineer Screen Imports ---
// import ProjectEngineerDashboard from '../screens/projectEngineer/PEDashboard';
// // import SubmissionDetailScreen from '../screens/SubmissionDetailScreen';
import TimesheetReviewScreen from '../screens/projectEngineer/TimesheetReview';
// Project Engineer (PE)
import PEDashboard from '../screens/projectEngineer/PEDashboard';
import PETimesheetList from '../screens/projectEngineer/PETimesheetList';
import PETicketList from '../screens/projectEngineer/PETicketList';
import PDFViewerScreen from '../screens/supervisor/PDFViewerScreen';
import ExecutiveDashboard from '../screens/executive/ExecutiveDashboard';
// -------------------- Types --------------------
// Foreman Stack
export type ForemanStackParamList = {
  ForemanDashboard: undefined;
  TimesheetList: undefined;
  TimesheetEdit: { timesheetId: number };
  Review: undefined; // <-- ADD NEW SCREEN
TimesheetView: { timesheetId: number };

};
// Supervisor Stack
export type SupervisorStackParamList = {
  SupervisorDashboard: undefined;
  TimesheetReview: { timesheetId: number };
  SupervisorTimesheetList: { foremanId: number; date: string; foremanName: string };
  SupervisorTicketList: { foremanId: number; date: string; foremanName: string };
    PDFViewer: { uri: string }; // ✅ Add this

};
// --- NEW: Project Engineer Stack ---
export type ProjectEngineerStackParamList = {
  PEDashboard: undefined;
  
  PETimesheetList: { foremanId: number; date: string; supervisorName: string | undefined; };
  PETicketList: { foremanId: number; date: string; supervisorName: string | undefined; };
  TimesheetReview: { timesheetId: number };
  PDFViewer: { uri: string }; // ✅ Add this

};
export type ExecutiveStackParamList = {
  ExecutiveDashboard: undefined;
};

// --- Root Stack (combines all navigators) ---
export type RootStackParamList = {
  Login: undefined;
  ForgotPassword: undefined;
  VerifyOtp: { email: string };
  ResetPassword: { email: string; otp: string };
  Foreman: NavigatorScreenParams<ForemanStackParamList>;
  Supervisor: NavigatorScreenParams<SupervisorStackParamList>;
  ProjectEngineer: NavigatorScreenParams<ProjectEngineerStackParamList>;
  Executive: NavigatorScreenParams<ExecutiveStackParamList>; 
};

// -------------------- Navigators --------------------
const ForemanStack = createStackNavigator<ForemanStackParamList>();
const ForemanNavigator = () => (
  <ForemanStack.Navigator initialRouteName="ForemanDashboard">
    <ForemanStack.Screen
      name="ForemanDashboard"
      component={ForemanDashboard}
      options={{ headerShown: false }}
    />

    <ForemanStack.Screen
      name="TimesheetList"
      component={TimesheetListScreen}
      options={{ title: "All Timesheets" }}
    />

    <ForemanStack.Screen
      name="TimesheetEdit"
      component={TimesheetEditScreen}
      options={{ title: "Enter Hours" }}
    />

    <ForemanStack.Screen
      name="Review"
      component={ReviewScreen}
      options={{ title: "Review & Submit" }}
    />

    <ForemanStack.Screen
      name="TimesheetView"
      component={ForemanTimesheetViewScreen}
      options={{ title: "Timesheet View" }}
    />
  </ForemanStack.Navigator>
);

const SupervisorStack = createStackNavigator<SupervisorStackParamList>();
const SupervisorNavigator = () => (
  <SupervisorStack.Navigator>
    <SupervisorStack.Screen name="SupervisorDashboard" component={SupervisorDashboard} options={{ headerShown: false }} />
    <SupervisorStack.Screen name="TimesheetReview" component={TimesheetViewScreen} options={{ title: 'Timesheet Review' }} />
    <SupervisorStack.Screen name="SupervisorTimesheetList" component={SupervisorTimesheetListScreen} options={({ route }) => ({ title: `${route.params.foremanName}'s Timesheets` })} />
    <SupervisorStack.Screen name="SupervisorTicketList" component={SupervisorTicketListScreen} options={({ route }) => ({ title: `${route.params.foremanName}'s Tickets` })} />
      <SupervisorStack.Screen
      name="PDFViewer"
      component={PDFViewerScreen}
      options={{ headerShown: true, title: 'PDF Preview' }}
    />
  </SupervisorStack.Navigator>
);
// --- NEW: Project Engineer Navigator ---
const ProjectEngineerStack = createStackNavigator<ProjectEngineerStackParamList>();
const ProjectEngineerNavigator = () => (
  <ProjectEngineerStack.Navigator>
    <ProjectEngineerStack.Screen
      name="PEDashboard"
      component={PEDashboard}
      options={{ headerShown: false }}
    />
    <ProjectEngineerStack.Screen
      name="PETimesheetList"
      component={PETimesheetList}
      options={{ title: 'Timesheet' }}
    />
    <ProjectEngineerStack.Screen
      name="PETicketList"
      component={PETicketList}
      options={({ route }) => ({
  title: `${(route.params.supervisorName || 'Project Engineer').trim()}'s Tickets`
})}
      // options={({ route }) => ({ title: `${route.params.foremanName}'s Tickets` })}
    />
    <ProjectEngineerStack.Screen
      name="TimesheetReview"
      component={TimesheetReviewScreen}
      options={{ title: 'Timesheet Details' }}
    />
    <ProjectEngineerStack.Screen
      name="PDFViewer"
      component={PDFViewerScreen} // Assuming you want to use the same component
      options={{ headerShown: true, title: 'PDF Preview' }}
    />
  </ProjectEngineerStack.Navigator>
);

// 2. Create the Navigator
const ExecutiveStack = createStackNavigator<ExecutiveStackParamList>();
const ExecutiveNavigator = () => (
  <ExecutiveStack.Navigator>
    <ExecutiveStack.Screen 
      name="ExecutiveDashboard" 
      component={ExecutiveDashboard} 
      options={{ headerShown: false }} 
    />
  </ExecutiveStack.Navigator>
);

// -------------------- Root Navigator --------------------
const RootStack = createStackNavigator<RootStackParamList>();
const AppNavigator = () => {
  const { user, isLoading } = useAuth();
const role = user?.role?.toLowerCase();
  if (isLoading) {
    return null; // or splash screen
  }

  return (
   <RootStack.Navigator screenOptions={{ headerShown: false }}>
      {!user ? (
        <>
          <RootStack.Screen
            name="Login"
            component={LoginScreen}
            options={{ headerShown: false }}
          />

          {/* 🔥 Add new OTP Reset Pages */}
          <RootStack.Screen
            name="ForgotPassword"
            component={ForgotPasswordScreen}
            options={{ title: "Forgot Password" }}
          />
          <RootStack.Screen
            name="VerifyOtp"
            component={OtpVerifyScreen}
            options={{ title: "Enter OTP" }}
          />
          <RootStack.Screen
            name="ResetPassword"
            component={ResetPasswordScreen}
            options={{ title: "Reset Password" }}
          />
        </>
      ) : (
        <>
          {role === "foreman" && (
            <RootStack.Screen
              name="Foreman"
              component={ForemanNavigator}
              options={{ headerShown: false }}
            />
          )}

          {role === "supervisor" && (
            <RootStack.Screen
              name="Supervisor"
              component={SupervisorNavigator}
              options={{ headerShown: false }}
            />
          )}

          {role === "project_engineer" && (
            <RootStack.Screen
              name="ProjectEngineer"
              component={ProjectEngineerNavigator}
              options={{ headerShown: false }}
            />
          )}
          {role === "executive" && (
  <RootStack.Screen
    name="Executive"
    component={ExecutiveNavigator}
    options={{ headerShown: false }}
  />
)}
           {!["foreman", "supervisor", "project_engineer", "executive"].includes(role!) && (
            <RootStack.Screen name="Login" component={LoginScreen} />
          )}
        </>
      )}
    </RootStack.Navigator>
  );
};

export default AppNavigator;
