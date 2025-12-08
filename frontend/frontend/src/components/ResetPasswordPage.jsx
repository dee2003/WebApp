import { useState } from "react";
import { useSearchParams, useNavigate } from "react-router-dom";
import axios from "axios";
import './ResetPasswordPage.css'; // Don't forget to import your CSS file

export default function ResetPasswordPage() {
    const [searchParams] = useSearchParams();
    const token = searchParams.get("token");
    const [newPassword, setNewPassword] = useState("");
    const [message, setMessage] = useState("");
    const [loading, setLoading] = useState(false);
    const navigate = useNavigate();

    console.log("Token:", token); // Debug

    if (!token) {
        return (
            <div className="reset-container">
                <h2 className="reset-heading">Reset Password</h2>
                <p className="reset-message reset-message-error">
                    Invalid reset link. No token found.
                </p>
            </div>
        );
    }

    const handleSubmit = async (e) => {
        e.preventDefault();

        if (newPassword.length < 6) {
            setMessage("Password must be at least 6 characters.");
            return;
        }

        setLoading(true);
        setMessage("");

        try {
            const response = await axios.post(
                "http://localhost:8000/api/auth/reset-password",
                {
                    token: token,
                    new_password: newPassword,
                },
                {
                    headers: {
                        "Content-Type": "application/json",
                    },
                }
            );

            setMessage("Password reset successfully! Redirecting to login...");
            setTimeout(() => navigate("/login"), 2000);
        } catch (error) {
            console.error("Error:", error.response?.data);
            const detail = error.response?.data?.detail;
            if (detail) {
                setMessage(Array.isArray(detail) ? detail[0].msg : detail);
            } else {
                setMessage("Failed to reset password. Please try again.");
            }
        } finally {
            setLoading(false);
        }
    };

    const messageClass = message.includes("success")
        ? "reset-message-success"
        : "reset-message-error";

    return (
        <div className="reset-container">
            <h2 className="reset-heading">Reset Password</h2>
            {message && <p className={`reset-message ${messageClass}`}>{message}</p>}

            <form onSubmit={handleSubmit} className="reset-form">
                <input
                    type="password"
                    placeholder="Enter new password (min 6 chars)"
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    required
                    minLength={6}
                    className="reset-input"
                />
                <button
                    type="submit"
                    disabled={loading || newPassword.length < 6}
                    className="reset-button"
                >
                    {loading ? "Resetting..." : "Reset Password"}
                </button>
            </form>
        </div>
    );
}