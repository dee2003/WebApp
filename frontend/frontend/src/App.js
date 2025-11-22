import React, { useState, useEffect } from "react";
import { BrowserRouter as Router, Routes, Route, Navigate } from "react-router-dom";
import LoginScreen from "./components/LoginScreen";
import AdminDashboard from "./components/AdminDashboard";
import MobileDashboard from "./components/MobileDashboard";
import ApplicationAdminPage from "./components/ApplicationAdminPage";
import TimesheetDetails from "./components/TimesheetDetails.jsx";

// This is the main App component that controls all routing.
function App() {
    // State to hold the user object {role: '...'} and track initial loading.
    const [currentUser, setCurrentUser] = useState(null);
    const [isLoading, setIsLoading] = useState(true); // <-- This is essential.

    // This hook runs ONLY ONCE on startup to check for an existing session.
    useEffect(() => {
        const token = localStorage.getItem('token');
        const role = localStorage.getItem('user_role'); // e.g., the string "APP_ADMIN"

        // Only restore the session if both token and a valid role string exist.
        if (token && role) {
            setCurrentUser({ username: 'user', role: role });
        }
        
        // Critical: After checking, we are done loading.
        setIsLoading(false);
    }, []); // The empty array ensures this runs only once on startup.

    const handleLogin = (user) => {
        setCurrentUser(user);
    };

    const handleLogout = () => {
        localStorage.removeItem('token');
        localStorage.removeItem('user_role');
        setCurrentUser(null);
    };

    // While checking the session, show a loading message. This prevents all errors.
    if (isLoading) {
        return <div style={{textAlign: 'center', marginTop: '50px'}}>Loading Application...</div>;
    }

    // This is a "Protected Route". It renders its children (the dashboard)
    // only if a user is logged in. Otherwise, it redirects to the login page.
    const PrivateRoute = ({ children }) => {
        return currentUser ? children : <Navigate to="/login" />;
    };

    return (
        <Router>
            <Routes>
                {/* --- Public Route: The login page --- */}
                <Route
                    path="/login"
                    element={
                        // If you're already logged in, /login redirects to the dashboard.
                        currentUser ? <Navigate to="/" /> : <LoginScreen onLogin={handleLogin} />
                    }
                />

                {/* --- Protected Routes: The rest of the app --- */}
                <Route
                    path="/*" // This matches EVERY other path
                    element={
                        <PrivateRoute>
                            {/* This component decides which dashboard to show */}
                            <DashboardRouter user={currentUser} onLogout={handleLogout} />
                        </PrivateRoute>
                    }
                />
            </Routes>
        </Router>
    );
}

// This new helper component keeps the routing logic clean.
// It receives the logged-in user and returns the correct dashboard.
const DashboardRouter = ({ user, onLogout }) => {
    // Get the user's role and convert to lowercase for matching.
    const role = user.role.toLowerCase(); // e.g., "app_admin"

    switch (role) {
        case 'admin':
            // This role has a simple dashboard.
            return <AdminDashboard onLogout={onLogout} />;
        
        case 'app_admin': // Matches "APP_ADMIN" from the backend
            // This role has multiple pages, so it needs its own internal router.
            return (
                <Routes>
                    <Route path="/" element={<ApplicationAdminPage user={user} onLogout={onLogout} />} />
                    <Route path="/timesheet/:id" element={<TimesheetDetails />} />
                </Routes>
            );

        case 'foreman':
            return <MobileDashboard currentUser={user} onLogout={onLogout} />;
        
        default:
            // This is the fallback for any role not listed above.
            return (
                <div style={{ padding: "2rem", textAlign: "center" }}>
                    <h2>Role Not Supported</h2>
                    <p>The role '{user.role}' is not recognized.</p>
                    <button onClick={onLogout}>Logout</button>
                </div>
            );
    }
};

export default App;
