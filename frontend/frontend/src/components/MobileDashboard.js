import React from 'react';

const MobileDashboard = ({ data, currentUser, onLogout }) => {
    const foreman = data.employees.find(e => e.id === currentUser.employee_id);
    const foremanName = foreman ? `${foreman.first_name} ${foreman.last_name}` : currentUser.name;

    return (
        <div className="mobile-view">
            <div className="header">
                <h2>Welcome, {foremanName}</h2>
                <button onClick={onLogout} className="btn btn-outline btn-sm">Logout</button>
            </div>
            <div style={{ padding: '1rem' }}>
                <div className="form-group">
                    <label className="form-label">Job Code</label>
                    <select className="form-control">
                        <option value="">Select Job Code</option>
                        {data.jobs.map(job => <option key={job.id} value={job.id}>{job.name}</option>)}
                    </select>
                </div>
                <div className="form-group">
                    <label className="form-label">Date</label>
                    <input type="date" className="form-control" defaultValue={new Date().toISOString().substring(0, 10)} />
                </div>
                <button className="btn btn-primary btn--full-width">Start Timesheet Entry</button>
            </div>
        </div>
    );
};

export default MobileDashboard;
