import React, { useState } from 'react';
import companyLogo from './assets/logo.png';
import './LoginScreen.css';

const LoginScreen = ({ onLogin }) => {
    const [error, setError] = useState('');
    const [isLoading, setIsLoading] = useState(false); // To prevent double-clicks

    const handleFormSubmit = async (e) => {
        e.preventDefault();
        setIsLoading(true);
        setError('');

        const formData = new FormData(e.target);
        const username = formData.get('username');
        const password = formData.get('password');
        
        // FastAPI's OAuth2 expects URL-encoded form data, not JSON
        const body = new URLSearchParams();
        body.append('username', username);
        body.append('password', password);

        try {
            const response = await fetch('http://localhost:8000/api/auth/login', { 
                method: 'POST',
                headers: {
                    'Content-Type': 'application/x-www-form-urlencoded',
                },
                body: body,
            });

            const data = await response.json();

            // --- IMPORTANT DEBUGGING ---
            // Open your browser's developer console (F12) to see this output.
            console.log("Backend response received:", data);

            if (response.ok && data.access_token && data.role) {
                // SUCCESS: Backend sent back a token and a role.
                
                // 1. Save session to browser storage
                localStorage.setItem('token', data.access_token);
                localStorage.setItem('user_role', data.role); 
                
                // 2. Call the onLogin prop from App.js to update the main state
                // This tells App.js who is logged in.
                onLogin({ username: username, role: data.role });

            } else {
                // FAILURE: The login failed on the backend.
                // The 'detail' field usually contains the error message from FastAPI.
                const errorMessage = data.detail || 'Invalid username or password.';
                setError(errorMessage);
                setIsLoading(false);
            }
        } catch (err) {
            console.error('Login request failed:', err);
            setError('Cannot connect to the server. Please check your connection.');
            setIsLoading(false);
        }
    };

    return (
        <div className="login-container">
            <div className="login-card">
                <div className="company-logo">
                    <img src={companyLogo} alt="M Luis Construction Logo" />
                    <h1>M LUIS Portal</h1>
                </div>
                
                <form onSubmit={handleFormSubmit} className="login-form">
                    <div className="form-group">
                        <label className="form-label">Username</label>
                        <input name="username" type="text" className="form-control" required />
                    </div>
                    <div className="form-group">
                        <label className="form-label">Password</label>
                        <input name="password" type="password" className="form-control" required />
                    </div>
                    
                    {error && <p className="login-error-message">{error}</p>}
                    
                    <button type="submit" className="btn btn-primary btn--full-width" disabled={isLoading}>
                        {isLoading ? 'Logging in...' : 'Login'}
                    </button>
                </form>
            </div>
        </div>
    );
};

export default LoginScreen;
