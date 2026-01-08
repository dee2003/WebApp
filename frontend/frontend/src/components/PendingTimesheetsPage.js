// PendingTimesheetsPage.js
import React, { useEffect, useState } from 'react';
import { apiClient } from "../api";
import { useNavigate } from "react-router-dom";

const ROLE_LABELS = {
  foreman: 'Foreman',
  supervisor: 'Supervisor',
  projectengineer: 'Project Engineer',
};

const PendingTimesheetsPage = ({ role, onBack }) => {
  const navigate = useNavigate(); // ✅ ADDED
  const [timesheets, setTimesheets] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (!role) return;

    const fetchData = async () => {
      setIsLoading(true);
      setError(null);
      try {
        const res = await apiClient.get('/timesheets/pending', {
          params: { approver_role: role }
        });
        setTimesheets(res.data || []);
      } catch (err) {
        const detail = err.response?.data?.detail;
        const message =
          typeof detail === 'string'
            ? detail
            : Array.isArray(detail)
              ? detail.map(d => d.msg || String(d)).join('; ')
              : 'Failed to load pending timesheets. Check backend.';
        setError(message);
      } finally {
        setIsLoading(false);
      }
    };

    fetchData();
  }, [role]);

  if (!role) return null;

  const formatUSDate = (dateStr) => {
    if (!dateStr) return '';
    const date = new Date(dateStr);
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    const year = date.getFullYear();
    return `${month}-${day}-${year}`;
  };

  return (
    <div className="page-container" style={{ padding: '20px', maxWidth: '1200px' }}>
      {/* Header with Back Button */}
      <div style={{
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: '24px',
        paddingBottom: '16px',
        borderBottom: '2px solid #e0e0e0'
      }}>
        <h2 style={{ margin: 0, color: '#333' }}>
          Pending Timesheets – {ROLE_LABELS[role] || role.toUpperCase()}
        </h2>

        <button
          type="button"
          onClick={onBack}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            padding: '10px 18px',
            fontSize: '14px',
            fontWeight: 600,
            color: '#0d6efd',
            backgroundColor: '#fff',
            border: '1.5px solid #0d6efd',
            borderRadius: '8px',
            cursor: 'pointer',
            transition: 'all 0.2s ease-in-out',
          }}
          onMouseEnter={(e) => {
            e.target.style.backgroundColor = '#0d6efd';
            e.target.style.color = '#fff';
          }}
          onMouseLeave={(e) => {
            e.target.style.backgroundColor = '#fff';
            e.target.style.color = '#0d6efd';
          }}
        >
          ← Back to Dashboard
        </button>
      </div>

      {/* Loading */}
      {isLoading && (
        <div style={{ textAlign: 'center', padding: '40px', color: '#666' }}>
          Loading pending timesheets...
        </div>
      )}

      {/* Error */}
      {error && !isLoading && (
        <div style={{
          background: '#fee',
          color: '#c33',
          padding: '16px',
          borderRadius: '8px',
          border: '1px solid #fcc'
        }}>
          ❌ {error}
        </div>
      )}

      {/* Empty State */}
      {!isLoading && !error && timesheets.length === 0 && (
        <div style={{
          textAlign: 'center',
          padding: '60px 20px',
          color: '#888'
        }}>
          <h3>No pending timesheets</h3>
          <p>There are no {ROLE_LABELS[role]?.toLowerCase() || role} timesheets awaiting action.</p>
        </div>
      )}

      {/* Timesheets Table */}
{/* Timesheets Table */}
{!isLoading && !error && timesheets.length > 0 && (
  <div className="table-responsive">
    <table className="data-table" style={{ width: '100%', borderCollapse: 'collapse' }}>
      <thead>
        <tr style={{ background: '#f8f9fa' }}>
          <th style={{ padding: '12px 16px', textAlign: 'center', borderBottom: '2px solid #dee2e6' }}>
            ID
          </th>
          <th style={{ padding: '12px 16px', textAlign: 'center', borderBottom: '2px solid #dee2e6' }}>
            Foreman
          </th>
          <th style={{ padding: '12px 16px', textAlign: 'center', borderBottom: '2px solid #dee2e6' }}>
            Date
          </th>
          <th style={{ padding: '12px 16px', textAlign: 'center', borderBottom: '2px solid #dee2e6' }}>
            Job Code
          </th>
          <th style={{ padding: '12px 16px', textAlign: 'center', borderBottom: '2px solid #dee2e6' }}>
            Job Description
          </th>
        </tr>
      </thead>
<tbody>
  {timesheets.map((ts, index) => (
    <tr key={ts.id} style={{ borderBottom: '1px solid #eee' }}>
      <td style={{ padding: '12px 16px', textAlign: 'center' }}>{index + 1}</td>
      <td style={{ padding: '12px 16px', textAlign: 'center' }}>{ts.employee_name}</td>
      <td style={{ padding: '12px 16px', textAlign: 'center' }}>{formatUSDate(ts.date)}</td>
      <td style={{ padding: '12px 16px', textAlign: 'center' }}>{ts.job_code || '-'}</td>
      <td style={{ padding: '12px 16px', textAlign: 'center' }}>{ts.job_name || '-'}</td>
    </tr>
  ))}
</tbody>

    </table>
  </div>
)}

    </div>
  );
};

export default PendingTimesheetsPage;
