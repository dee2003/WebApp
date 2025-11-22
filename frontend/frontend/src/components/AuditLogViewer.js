// In src/components/AuditLogViewer.js

import React, { useState, useEffect } from 'react';
import './CrewMapping.css'; // Assume you'll link a dedicated CSS file for component layout

const AuditLogViewer = ({ apiClient }) => {
    const [logs, setLogs] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');

    useEffect(() => {
        const fetchLogs = async () => {
            try {
                // Assuming the logs have the structure: 
                // { id, timestamp, user_id, action, target_resource, target_resource_id, details }
                const response = await apiClient.get('/audit-logs');
                setLogs(response.data);
            } catch (error) {
                console.error("Failed to fetch audit logs:", error);
                // Use the defined error text color
                setError('You do not have permission to view audit logs.');
            } finally {
                setLoading(false);
            }
        };
        fetchLogs();
    }, [apiClient]);

    if (loading) return <p>Loading audit logs...</p>;

    // Use a defined style for error
    if (error) return <div className="foreman-selection-card" style={{ borderColor: 'var(--clean-danger)' }}>
        <p style={{ color: 'var(--clean-danger)', fontWeight: 'bold', margin: 0 }}>{error}</p>
    </div>;

    // Use the .foreman-selection-card as a container for visual structure
    return (
        <div className="foreman-selection-card"> 
            <h2 className="section-title">Audit Log</h2>
            
            {logs.length === 0 ? (
                 <p style={{ color: 'var(--clean-medium)' }}>No audit logs found.</p>
            ) : (
                // Use the .data-table class for the applied styles
                <table className="data-table" style={{ width: '100%', borderCollapse: 'collapse' }}>
                    <thead>
                        <tr>
                            {/* The :first-child selector in the CSS will style the ID column */}
                            {/* <th>ID</th>  */}
                            <th>Timestamp</th>
                            <th>User ID</th>
                            <th>Action</th>
                            <th>Resource</th>
                            <th>Resource ID</th>
                            {/* The :last-child selector will center the last column */}
                            <th>Details</th> 
                        </tr>
                    </thead>
                    <tbody>
                        {logs.map(log => (
                            <tr key={log.id}>
                                {/* <td>{log.id}</td>  */}
                                <td>{new Date(log.timestamp).toLocaleString()}</td>
                                <td>{log.user_id}</td>
                                <td>
                                    {/* Optional: Highlight critical actions (e.g., DELETE) */}
                                    <span style={{ color: log.action === 'DELETE' ? 'var(--clean-danger)' : 'var(--clean-primary)', fontWeight: 600 }}>
                                        {log.action}
                                    </span>
                                </td>
                                <td>{log.target_resource}</td>
                                <td>{log.target_resource_id}</td>
                                <td>{log.details}</td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            )}
        </div>
    );
};

export default AuditLogViewer;