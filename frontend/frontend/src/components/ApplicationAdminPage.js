import React, { useState, useEffect } from "react";
import {
  FaChevronLeft,
  FaChevronRight,
  FaRegEdit,
  FaClipboardList,
  FaTrash,
  FaSearch, // Added
    FaPaperPlane, // ⭐️ ADD THIS
  FaCamera, // Added
} from "react-icons/fa";
import { useNavigate } from "react-router-dom";
import TimesheetForm from "./TimesheetForm";
import axios from "axios";
import "./ApplicationAdmin.css";
import { useLocation } from 'react-router-dom'; // Import useLocation
import DatePicker from "react-datepicker";

const TIMESHEETS_PER_PAGE = 10;
const API_URL = "http://127.0.0.1:8000/api";

export default function ApplicationAdmin({ user, onLogout }) {  // ✅ Add props
  // Remove the local handleLogout function entirely
  
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
    const location = useLocation();
        const navigate = useNavigate();

        console.log("LOGIN DEBUG: Full location object on mount is:", location);
const timesheetToEdit = location.state?.timesheetData; // <-- ADD THIS LINE
// This code is already correct and looks for 'activeSection' from the location state.
const [activeSection, setActiveSection] = useState(
    location.state?.activeSection || 'createTimesheet'
);

      const [timesheets, setTimesheets] = useState([]);
  const [error, setError] = useState("");
  const [successMessage, setSuccessMessage] = useState("");
  const [showConfirm, setShowConfirm] = useState(false);
  const [selectedId, setSelectedId] = useState(null);
  const [alertMessage, setAlertMessage] = useState("");
  const [alertType, setAlertType] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const [filterDate, setFilterDate] = useState("");
  const timesheetsPerPage = TIMESHEETS_PER_PAGE;

  // --- NEW SEARCH STATE ---
  const [searchType, setSearchType] = useState("foreman"); // 'foreman' or 'jobCode'
  const [searchQuery, setSearchQuery] = useState("");

  // --- UPDATED FILTER LOGIC ---
  // const filteredTimesheets = timesheets.filter((ts) => {
  //   if (searchQuery.trim() === "") return true; // Show all if query is empty

  //   const query = searchQuery.toLowerCase();

  //   if (searchType === "foreman") {
  //     return ts.foreman_name?.toLowerCase().includes(query);
  //   }
  //   if (searchType === "jobCode") {
  //     return ts.data?.job?.job_code?.toLowerCase().includes(query);
  //   }
  //   return true;
  // });
const filteredTimesheets = timesheets.filter((ts) => {
  const matchesSearch = searchType === "foreman"
  ? ts.foreman_name?.toLowerCase().includes(searchQuery.toLowerCase())
  : ts.data?.job?.job_code?.toLowerCase().includes(searchQuery.toLowerCase());
  const matchesDate = filterDate === "" || ts.date === filterDate;
  return matchesSearch && matchesDate;
})
  const totalPages = Math.ceil(filteredTimesheets.length / timesheetsPerPage);

  const currentDate = new Date().toLocaleDateString("en-US", {
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
  });

  const [mappings, setMappings] = useState({});
  const [loadingMappings, setLoadingMappings] = useState({});

// const handleLogout = () => {
//   localStorage.removeItem('token');        // Match your App.jsx
//   localStorage.removeItem('user_role');
//   setCurrentUser(null);  // This triggers PrivateRoute redirect ✅
// };

  const sections = ["createTimesheet", "viewTimesheets"];
  const getIconForSection = (section) => {
    switch (section) {
      case "createTimesheet":
        return <FaRegEdit className="icon" />;
      case "viewTimesheets":
        return <FaClipboardList className="icon" />;
      default:
        return <FaRegEdit className="icon" />;
    }
  };

  const handleSectionClick = (sec) => {
    setActiveSection(sec);
  };

  // --- Fetch all timesheets ---
  const fetchTimesheets = async () => {
    setError("");
    try {
      const res = await axios.get(`${API_URL}/timesheets/`);
      const sorted = res.data.sort(
        (a, b) => new Date(b.date) - new Date(a.date)
      );
      setTimesheets(sorted);

      // Adjust page if needed (after fetch or delete)
      const computedTotalPages = Math.ceil(sorted.length / timesheetsPerPage);
      if (currentPage > computedTotalPages && computedTotalPages > 0) {
        setCurrentPage(computedTotalPages);
      } else if (sorted.length === 0) {
        setCurrentPage(1);
      }
    } catch (err) {
      console.error("Fetch Timesheets Error:", err);
      setError("Could not fetch timesheets");
    }
  };
  useEffect(() => {
    if (activeSection === "viewTimesheets") {
      fetchTimesheets();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeSection]);

  // --- Fetch crew mapping for a foreman ---
  const fetchMapping = async (foremanId) => {
    if (!foremanId || mappings[foremanId] || loadingMappings[foremanId]) return;
    try {
      setLoadingMappings((prev) => ({ ...prev, [foremanId]: true }));
      const res = await axios.get(
        `${API_URL}/crew-mapping/by-foreman/${foremanId}`
      );
      setMappings((prev) => ({ ...prev, [foremanId]: res.data }));
    } catch (err) {
      console.error(
        `Error fetching mapping for foreman ID ${foremanId}:`,
        err.response ? err.response.data : err.message
      );
    } finally {
      setLoadingMappings((prev) => ({ ...prev, [foremanId]: false }));
    }
  };
  // ⭐️ EVENT HANDLERS ⭐️
  const handleRowClick = (ts, e) => {
    if (e.target.closest("button")) return;
    navigate(`/timesheet/${ts.id}`, { state: { timesheet: ts } });
  };

  const handleDeleteClick = (id) => {
    setSelectedId(id);
    setShowConfirm(true); // show custom popup
  };
const [showResendForm, setShowResendForm] = useState(false);
const [resendTimesheetData, setResendTimesheetData] = useState(null);

const handleResendClick = async (timesheet) => {
  console.log('🚀 Resend clicked:', timesheet);
  try {
    await axios.post(`${API_URL}/timesheets/${timesheet.id}/resend`);
    
    // ✅ SET THE STATES that pass data to TimesheetForm
    setResendTimesheetData(timesheet);
    setShowResendForm(true);
    setActiveSection("createTimesheet");
  } catch (error) {
    console.error('Resend error:', error);
  }
};

// const handleFinalizeSchedule = async () => {
//   if(!filterDate){
//     alert("Please select a date first to finalize the schedule.");
//     return;
//   }
//   try{
//     await axios.post(`${API_URL}/timesheets/send-daily-schedule`,{
//       date:filterDate
//     });
//     setSuccessMessage(`Daily Schedule for ${filterDate} sent to the group!`);
//   } catch(err){
//     setError("Failed to send the group schedule.");
//   }
// };
const handleFinalizeSchedule = async () => {
  if (!filterDate) {
    setError("Please select a date first.");
    return;
  }

  // 1. Add Confirmation Dialog
  const isConfirmed = window.confirm(
    `Are you sure you want to finalize and send the schedule for ${new Date(filterDate.replace(/-/g, '/')).toLocaleDateString()}?`
  );

  if (!isConfirmed) return;

  try {
    // Show a temporary "Sending..." state if you like, or just proceed
    await axios.post(`${API_URL}/timesheets/send-daily-schedule`, {
      date: filterDate
    });

    // 2. Set Success Message
    setSuccessMessage(`Daily Schedule for ${filterDate} sent successfully!`);
    
    // 3. Auto-hide notification after 4 seconds
    setTimeout(() => {
      setSuccessMessage("");
    }, 4000);

  } catch (err) {
    console.error("Schedule send error:", err);
    setError("Failed to send the group schedule. Please try again.");
    
    // Auto-hide error after 4 seconds
    setTimeout(() => {
      setError("");
    }, 4000);
  }
};
  const confirmDelete = async () => {
    try {
      await axios.delete(`${API_URL}/timesheets/${selectedId}/`);
      // Update state efficiently without refetch
      const updatedTimesheets = timesheets.filter((t) => t.id !== selectedId);
      setTimesheets(updatedTimesheets);

      setSuccessMessage("Timesheet deleted successfully.");
      // Adjust page if last item deleted
      const computedTotalPages = Math.ceil(
        updatedTimesheets.length / timesheetsPerPage
      );
      if (updatedTimesheets.length > 0 && currentPage > computedTotalPages) {
        setCurrentPage(currentPage - 1);
      }
    } catch (error) {
      console.error("Error deleting timesheet:", error);
      setError("Failed to delete timesheet.");
    } finally {
      setShowConfirm(false);
      setSelectedId(null);
      setTimeout(() => {
        setSuccessMessage("");
        setError("");
      }, 3000);
    }
  };

  const cancelDelete = () => {
    setShowConfirm(false);
    setSelectedId(null);
  };

  // ⭐️ PAGINATION LOGIC ⭐️
  const indexOfLastTimesheet = currentPage * timesheetsPerPage;
  const indexOfFirstTimesheet = indexOfLastTimesheet - timesheetsPerPage;
  const currentTimesheets = filteredTimesheets.slice(
    indexOfFirstTimesheet,
    indexOfLastTimesheet
  );

  const paginate = (pageNumber) => setCurrentPage(pageNumber);

  // ⭐️ PAGINATION CONTROLS COMPONENT ⭐️
  const PaginationControls = () => {
    const pageNumbers = [];
    for (let i = 1; i <= totalPages; i++) {
      pageNumbers.push(i);
    }
    if (totalPages <= 1) return null;

    return (
      <nav className="pagination-controls">
        {/* PREVIOUS BUTTON */}
        <button
          onClick={() => paginate(currentPage - 1)}
          disabled={currentPage === 1}
          className="btn btn-sm"
        >
          <FaChevronLeft /> Previous
        </button>
        {/* NUMBERED PAGE LINKS */}
        <ul className="pagination-list">
          {pageNumbers.map((number) => (
            <li key={number} className="page-item">
              <button
                onClick={() => paginate(number)}
                className={`page-link ${
                  currentPage === number ? "active" : ""
                }`}
              >
                {number}
              </button>
            </li>
          ))}
        </ul>
        {/* NEXT BUTTON */}
        <button
          onClick={() => paginate(currentPage + 1)}
          disabled={currentPage === totalPages}
          className="btn btn-sm"
        >
          Next <FaChevronRight />
        </button>
      </nav>
    );
  };

  return (
    <div className="admin-layout">
      <nav
        className={`admin-sidebar ${sidebarCollapsed ? "collapsed" : ""}`}
        style={{ width: sidebarCollapsed ? 60 : 250 }}
      >
        <div className="sidebar-top">
          <button
            onClick={() => setSidebarCollapsed(!sidebarCollapsed)}
            className="btn btn-outline btn-sm toggle-sidebar"
            title={sidebarCollapsed ? "Expand Sidebar" : "Collapse Sidebar"}
          >
            {sidebarCollapsed ? <FaChevronRight /> : <FaChevronLeft />}
          </button>
        </div>
        <div className="sidebar-header">
          {!sidebarCollapsed && (
            <h3 className="sidebar-title">APPLICATION ADMIN</h3>
          )}
          {!sidebarCollapsed && (
            <>
              <div className="current-date">{currentDate}</div>
<button
  onClick={onLogout}  // ✅ Use the prop from App.jsx
  className="btn btn-outline btn-sm logout-btn"
>
  Logout
</button>

            </>
          )}
        </div>
        <ul className="sidebar-nav">
          {sections.map((sec) => (
            <li key={sec}>
              <button
                onClick={() => handleSectionClick(sec)}
                className={activeSection === sec ? "active" : ""}
              >
                {getIconForSection(sec)}
                {!sidebarCollapsed && (
                  <span className="label">
                    {sec === "createTimesheet"
                      ? "Create Timesheet"
                      : sec === "viewTimesheets"
                      ? "View Timesheets"
                      : sec.charAt(0).toUpperCase() + sec.slice(1)}
                  </span>
                )}
              </button>
            </li>
          ))}
        </ul>
      </nav>
      <main
        className="admin-content"
        style={{ marginLeft: sidebarCollapsed ? 60 : 250 }}
      >
{activeSection === "createTimesheet" && showResendForm && resendTimesheetData && (
  <div className="timesheet-page-content">
    <TimesheetForm 
      onClose={() => {
        setActiveSection("viewTimesheets");
        setShowResendForm(false);
        setResendTimesheetData(null);
      }}
      existingTimesheet={resendTimesheetData}
      isResend={true}
    />
  </div>
)}
  {/* ⭐️ REGULAR CREATE MODE - Shows when not in resend */}
  {activeSection === "createTimesheet" && !showResendForm && (
    <div className="timesheet-page-content">
      <TimesheetForm 
        onClose={() => setActiveSection("viewTimesheets")}
        existingTimesheet={timesheetToEdit || null}
        isResend={false}
      />
    </div>
  )}

        {activeSection === "viewTimesheets" && (
          <div className="timesheet-page-content">
            {/* <h2 className="view-title">
              <FaClipboardList /> View Timesheets
            </h2> */}

            {/* --- NEW SEARCH BAR --- */}
            <div className="filter-bar">
              <div className="styled-search-container">
                <div className="search-wrapper">
                  <div className="search-dropdown-wrapper">
                    <select
                      value={searchType}
                      onChange={(e) => setSearchType(e.target.value)}
                      className="search-dropdown"
                    >
                      <option value="foreman">Foreman</option>
                      <option value="jobCode">Job Code</option>
                    </select>
                    <span className="dropdown-arrow">▼</span>
                  </div>
                  <input
                    type="text"
                    placeholder="What are you looking for..."
                    className="search-input"
                    value={searchQuery}
                    onChange={(e) => {
                      setSearchQuery(e.target.value);
                      setCurrentPage(1);
                    }}
                  />
                  
                </div>
                <button className="search-submit-btn">
                  <FaSearch />
                  Search
                </button>
              </div>
              

              
              <button
                className="btn btn-outline btn-sm"
                onClick={() => {
                  setSearchQuery("");
                  setSearchType("foreman");
                  setCurrentPage(1);
                }}
              >
                Clear Filter
              </button>
              {/* --- ADMIN ACTION SECTION --- */}
<div className="admin-action-card">

  <div className="action-controls">
   <div className="date-input-wrapper">
        {/* <label htmlFor="schedule-date">Select Date (MM/DD/YYYY)</label> */}
        <DatePicker
  id="schedule-date"
  // FIX: Use forward slashes to force local timezone parsing
  selected={filterDate ? new Date(filterDate.replace(/-/g, '/')) : null}
  onChange={(date) => {
    if (!date) {
      setFilterDate("");
      return;
    }
    // FIX: Extract local year, month, and day to avoid UTC shifts
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    
    const formattedDate = `${year}-${month}-${day}`;
    setFilterDate(formattedDate);
    setCurrentPage(1);
  }}
  dateFormat="MM/dd/yyyy"
  placeholderText="Select Date (MM/DD/YYYY)"
  className="modern-date-picker"
  isClearable
/>
      </div>
    
    <button
      className={`finalize-btn ${(!filterDate || filteredTimesheets.length === 0) ? 'disabled' : ''}`}
      onClick={handleFinalizeSchedule}
      disabled={!filterDate || filteredTimesheets.length === 0}
    >
      <div className="btn-content">
        <FaPaperPlane className="plane-icon" />
        <div className="btn-text">
          <span className="main-text">Finalize & Send</span>
        </div>
      </div>
    </button>
  </div>
</div>
              
            </div>
            {/* --- END NEW SEARCH BAR --- */}

            {error && <div className="alert alert-error">{error}</div>}
            {successMessage && (
              <div className="alert alert-success">{successMessage}</div>
            )}
            {timesheets.length ? (
              <div className="timesheet-list-container">
                <div className="timesheet-header-row">
                  <span className="col date-col">Date</span>
                  <span className="col foreman-col">Foreman</span>
                  <span className="col job-name-col">Job Name</span>
                  <span className="col job-code-col">Job Code</span>
                  <span className="col contract-col">Contract No</span>
                  <span className="col engineer-col">Project Engineer</span>
                  <span className="col actions-col">Actions</span>
                </div>
                <div className="timesheet-list">
                  {currentTimesheets.map((ts) => (
                    <div
                      key={ts.id}
                      className="timesheet-row"
                      onClick={(e) => handleRowClick(ts, e)}
                    >
                   <span className="col date-col">
  {new Date(ts.date).toLocaleDateString("en-US", { 
    month: "2-digit", 
    day: "2-digit", 
    year: "numeric" 
  })}
</span>

                      <span className="col foreman-col">
                        {ts.foreman_name || "N/A"}
                      </span>
                      <span className="col job-name-col">
                        {ts.job_name || ts.data?.job?.job_name || "N/A"}
                      </span>
                      <span className="col job-code-col">
                        {ts.data?.job?.job_code || "N/A"}
                      </span>
                      <span className="col contract-col">
                        {ts.data?.contract_no || "N/A"}
                      </span>
                      <span className="col engineer-col">
                        {ts.data?.project_engineer || "N/A"}
                      </span>
<span className="col actions-col">
  <button
    className="btn btn-warning btn-sm resend-btn"
    onClick={(e) => {
      e.stopPropagatin();
      handleResendClick(ts);  // ✅ Pass full timesheet object (ts)
    }}
    title="Edit & Resend timesheet"
  >
    <FaPaperPlane /> Resend
  </button>
  <button
    className="btn btn-danger btn-sm"
    onClick={(e) => {
      e.stopPropagation();
      handleDeleteClick(ts.id);
    }}
  >
    <FaTrash /> Delete
  </button>
</span>
                    </div>
                  ))}
                </div>
                <PaginationControls />
              </div>
            ) : (
              <p className="empty-message">No timesheets available.</p>
            )}
          </div>
        )}
        {/* --- Confirmation Modal --- */}
        {showConfirm && (
          <div className="confirm-overlay">
            <div className="confirm-box">
              <h4>Confirm Deletion</h4>
              <p>Are you sure you want to delete this timesheet?</p>
              <div className="confirm-actions">
                <button className="btn btn-danger" onClick={confirmDelete}>
                  Yes, Delete
                </button>
                <button className="btn btn-secondary" onClick={cancelDelete}>
                  Cancel
                </button>
              </div>
            </div>
          </div>
        )}
        {/* --- Global Alert Message --- */}
        {alertMessage && (
          <div
            className={`alert ${
              alertType === "success" ? "alert-success" : "alert-error"
            }`}
          >
            {alertMessage}
          </div>
        )}
      </main>
    </div>
  );
}
