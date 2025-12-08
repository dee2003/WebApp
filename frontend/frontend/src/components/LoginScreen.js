import React, { useState, useEffect } from 'react';
import companyLogo from './assets/logo.png';
import './LoginScreen.css';

const LoginScreen = ({ onLogin }) => {
    // Check URL for reset token on component mount
    useEffect(() => {
        const urlParams = new URLSearchParams(window.location.search);
        const token = urlParams.get('token');
        if (token) {
            setMode('resetPassword');
        }
    }, []);

    const [mode, setMode] = useState('login'); // 'login', 'requestReset', 'resetPassword'
    const [error, setError] = useState('');
    const [success, setSuccess] = useState('');
    const [isLoading, setIsLoading] = useState(false);

    // --- LOGIN ---
    const handleLogin = async (e) => {
        e.preventDefault();
        setError(''); setSuccess(''); setIsLoading(true);

        const formData = new FormData(e.target);
        const username = formData.get('username');
        const password = formData.get('password');

        const body = new URLSearchParams();
        body.append('username', username);
        body.append('password', password);

        try {
            const response = await fetch('http://localhost:8000/api/auth/login', {
                method: 'POST',
                headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
                body
            });
            const data = await response.json();

            if (response.ok && data.access_token && data.role) {
                localStorage.setItem('token', data.access_token);
                localStorage.setItem('user_role', data.role);
                onLogin({ username, role: data.role });
            } else {
                setError(data.detail || 'Invalid username or password.');
            }
        } catch (err) {
            setError('Cannot connect to server.');
        } finally { setIsLoading(false); }
    };

    // --- REQUEST PASSWORD RESET ---
    const handleRequestReset = async (e) => {
        e.preventDefault();
        setError(''); setSuccess(''); setIsLoading(true);

        const email = e.target.resetEmail.value;

        try {
            const response = await fetch('http://localhost:8000/api/auth/request-reset', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ email })
            });
            const data = await response.json();
            setSuccess(data.message || 'If the email exists, a reset link has been sent to it.');
            setError('');
        } catch (err) {
            setError('Cannot connect to server.');
        } finally { setIsLoading(false); }
    };

    // --- RESET PASSWORD USING TOKEN ---
    const handleResetPassword = async (e) => {
        e.preventDefault();
        setError(''); setSuccess(''); setIsLoading(true);

        const newPassword = e.target.newPassword.value;
        const token = new URLSearchParams(window.location.search).get('token');

        if (!token) { setError('No reset token found in URL'); setIsLoading(false); return; }

        try {
            const response = await fetch('http://localhost:8000/api/auth/reset-password', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ token, new_password: newPassword })
            });
            const data = await response.json();

            if (response.ok) {
                setSuccess(data.message || 'Password successfully reset. You can now log in.');
                setMode('login'); 
            } else {
                setError(data.detail || 'Failed to reset password. The link may be expired or invalid.');
            }
        } catch (err) {
            setError('Cannot connect to server.');
        } finally { setIsLoading(false); }
    };

    return (
        <div className="login-container">
            <div className="login-card">
                <div className="company-logo">
                    <img src={companyLogo} alt="Company Logo" />
                    <h1>M LUIS Portal</h1>
                </div>

                {/* LOGIN FORM */}
                {mode === 'login' && (
                    <form onSubmit={handleLogin} className="login-form">
                        <div className="form-group">
                            <label>Username</label>
                            <input name="username" type="text" className="form-control" required />
                        </div>
                        <div className="form-group">
                            <label>Password</label>
                            <input name="password" type="password" className="form-control" required />
                        </div>

                        {error && <p className="login-error-message">{error}</p>}
                        {success && <p className="login-success-message">{success}</p>}

                        <button type="submit" className="btn btn-primary btn--full-width" disabled={isLoading}>
                            {isLoading ? 'Logging in...' : 'Login'}
                        </button>
                        
                        {/* UPDATED LINK */}
                        <p 
                            className="mode-switch-link" // Changed class name
                            style={{ cursor: 'pointer', textAlign: 'center', marginTop: '10px', color: '#007bff' }}
                            onClick={() => { setMode('requestReset'); setError(''); setSuccess(''); }}
                        >
                            Forgot Password?
                        </p>
                    </form>
                )}

                {/* REQUEST PASSWORD RESET FORM */}
                {mode === 'requestReset' && (
                    <form onSubmit={handleRequestReset} className="login-form">
                        <p className="form-title">Enter your email to reset password</p>
                        <div className="form-group">
                            <label>Email</label>
                            <input name="resetEmail" type="email" className="form-control" required />
                        </div>

                        {error && <p className="login-error-message">{error}</p>}
                        {success && <p className="login-success-message">{success}</p>}

                        <button type="submit" className="btn btn-primary btn--full-width" disabled={isLoading}>
                            {isLoading ? 'Sending...' : 'Send Reset Link'}
                        </button>
                        
                        {/* UPDATED LINK */}
                        <p 
                            className="mode-switch-link" // Changed class name
                            style={{ cursor: 'pointer', textAlign: 'center', marginTop: '10px', color: '#007bff' }}
                            onClick={() => { setMode('login'); setError(''); setSuccess(''); }}
                        >
                            Back to Login
                        </p>
                    </form>
                )}

                {/* RESET PASSWORD FORM */}
                {mode === 'resetPassword' && (
                    <form onSubmit={handleResetPassword} className="login-form">
                        <p className="form-title">Set your new password</p>
                        <div className="form-group">
                            <label>New Password</label>
                            <input name="newPassword" type="password" className="form-control" required />
                        </div>

                        {error && <p className="login-error-message">{error}</p>}
                        {success && <p className="login-success-message">{success}</p>}

                        <button type="submit" className="btn btn-primary btn--full-width" disabled={isLoading}>
                            {isLoading ? 'Resetting...' : 'Reset Password'}
                        </button>
                        
                        {/* UPDATED LINK */}
                        <p 
                            className="mode-switch-link" // Changed class name
                            style={{ cursor: 'pointer', textAlign: 'center', marginTop: '10px', color: '#007bff' }}
                            onClick={() => { setMode('login'); setError(''); setSuccess(''); }}
                        >
                            Back to Login
                        </p>
                    </form>
                )}
            </div>
        </div>
    );
};

export default LoginScreen;