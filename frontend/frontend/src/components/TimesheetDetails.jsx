import React, { useEffect, useState, useMemo } from "react";
import { useParams, useNavigate } from "react-router-dom";
import axios from "axios";
import {
  FaArrowLeft,
  FaRegEdit,
  FaClipboardList,
  // ADDED MISSING ICONS
  FaChevronRight,
  FaChevronLeft,
} from "react-icons/fa";
import "./ApplicationAdmin.css";

const API_URL = "http://127.0.0.1:8000/api";

// Helper function to render list items for Employees and Equipment (using names from enrichment)
// (renderComplexListItems remains unchanged)
const renderComplexListItems = (items, key) => {
  if (!Array.isArray(items) || items.length === 0) {
    return <li>N/A</li>;
  }
  return items.map((item, i) => {
    // 1. Employee: Show name and status
    if (key === "employees") {
      const name = `${item.first_name || ""} ${item.last_name || ""}`.trim();
      return (
        <li key={i}>
          {name || `ID: ${item.id}`}
        </li>
      );
    }
    // 2. Equipment: Show name, VIN, and Category
    if (key === "equipment") {
      return (
        <li key={i}>
          {item.name}
        </li>
      );
    }
    // 3. Enriched Entities (Vendors, Materials, Dumping Sites): Show name/ID
    return <li key={i}>{item.name || `ID: ${item.id}` || "Unnamed Entity"}</li>;
  });
};

// Helper for displaying categories with their selected IDs/Names
// (renderCategoryDisplay remains unchanged)
const renderCategoryDisplay = (categories, label) => {
    if (!Array.isArray(categories) || categories.length === 0) {
        return <span className="text-muted">N/A</span>;
    }
    return categories.map((cat, i) => <span key={i} className="badge">{cat}</span>);
};


// --- Helper to render the ENTIRE vertical logistics box with enhanced styling ---
// (renderLogisticsBox remains unchanged)
const renderLogisticsBox = (
    title,
    entities,
    categories,
    itemMap,
    entityLabel
) => {
    // Helper to render the associated item details (nested list using DL for structure)
    const renderNestedItemsList = () => {
        if (entities.length === 0) return <p className="text-muted">N/A (No associated items)</p>;

        return (
            <dl className="logistics-item-details-list">
                {entities.map((entity, i) => {
                    const entityId = entity.id;
                    const entityName = entity.name || `ID: ${entityId}`;
                    const itemDetails = itemMap[entityId];
                    const selectedMaterials = 
  itemDetails?.selectedMaterials || itemDetails?.materials || [];


                    return (
                        <div key={i}>
                            <dt className="logistics-item-name">{entityName}</dt>
                            <dd className="logistics-item-materials">
                                {selectedMaterials.length > 0 ? (
                                    <ul className="list-unstyled">
                                       {selectedMaterials.map((material, j) => {
  // Try to find unit from the full materials list if missing
  const fullMaterial =
    itemDetails?.materials?.find(m => m.id === material.id);
  const unit = material.unit || fullMaterial?.unit || "N/A Unit";

  return (
    <li key={j}>
      {material.name} ({unit})
    </li>
  );
})}

                                    </ul>
                                ) : (
                                    <span className="text-muted">No associated items.</span>
                                )}
                            </dd>
                        </div>
                    );
                })}
            </dl>
        );
    };

    return (
      // Removing 'logistics-box' class and just using 'structured-box' for a cleaner look that 
      // is similar to the other section tables. Adding a top margin for spacing.
      <div className="structured-box mt-4"> 
        {/* Changed from h4 to h3 to act as the section title */}
        <h3 className="section-title">{title} ({entities.length})</h3> 
        
        <table className="details-table compact-table">
            <tbody>
                {/* 1. Categories */}
                <tr>
                    <th className="w-40">Categories</th>
                    <td>
                        {renderCategoryDisplay(categories, entityLabel)}
                    </td>
                </tr>

                {/* 2. Main List of Selected Entities */}
                <tr>
                    <th>Selected {entityLabel}s</th>
                    <td>
                        <ul className="list-unstyled list-compact">
                            {renderComplexListItems(entities, entityLabel.toLowerCase().replace(/[^a-z]/g, ''))}
                        </ul>
                    </td>
                </tr>

                {/* 3. Nested Items (Associated Item Details) - Integrated into the table */}
                <tr>
                    <th className="border-bottom-0">Selected Materials</th>
                    <td className="border-bottom-0">
                        {renderNestedItemsList()}
                    </td>
                </tr>
            </tbody>
        </table>
        {/* Add a horizontal rule for separation between logistics boxes */}
        <hr />
      </div>
    );
};
// --- END renderLogisticsBox ---


const TimesheetDetails = () => {
  const { id } = useParams();
  const navigate = useNavigate();

  const [ts, setTs] = useState(null);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  
  // START: DEFINITIONS ADDED TO RESOLVE ERRORS

  // 1. Placeholder for current date
  const currentDate = new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' });

  // 2. Placeholder for logout function
  const handleLogout = () => {
    console.log("Logout triggered");
    // navigate('/login'); 
  };
  
  // 3. Placeholder sections and activeSection state
  const sections = ["createTimesheet", "viewTimesheets"];
  // Note: activeSection is usually managed by a parent component or global state. 
  // For compilation, we'll default it to 'viewTimesheets'.
  const [activeSection, setActiveSection] = useState("viewTimesheets"); 

  // 4. Placeholder for icon helper function
  const getIconForSection = (sectionName) => {
      // Use the imported icons or placeholders
      if (sectionName === "createTimesheet") return <FaRegEdit />;
      if (sectionName === "viewTimesheets") return <FaClipboardList />;
      return null;
  };
  // END: DEFINITIONS ADDED TO RESOLVE ERRORS


  // Fetch single timesheet
  useEffect(() => {
    if (id) {
      axios
        .get(`${API_URL}/timesheets/${id}/`)
        .then((res) => {
          const fetchedTimesheet = res.data.id ? res.data : res.data.data;
          setTs(fetchedTimesheet);
        })
        .catch((err) => console.error("Failed to fetch timesheet:", err));
    }
  }, [id]);

  if (!ts) {
    return <p>Loading...</p>;
  }

  const data = ts.data || {};

  // Destructure all the keys used in the form payload for robust access
  const {
    job = {},
    supervisor = null, 
    contract_no,
    project_engineer,
    time_of_day,
    weather,
    temperature,
    location,
    work_description,

    // Crew Data
    employees = [],
    equipment = [],

    // Logistics Data
    vendors = [],
    materials = [],
    dumping_sites = [],

    // Category lists (raw strings/IDs)
    vendor_categories = [],
    material_categories = [],
    dumping_categories = [],

    // Nested Item IDs (raw objects from form)
    selected_vendor_materials = {},
    selected_material_items = {},
    selected_dumping_materials = {},
  } = data;

  const jobCode = job.job_code || "N/A";
  const jobPhaseCodes = job.phase_codes?.join(", ") || "N/A";
  const supervisorName = supervisor?.name || "N/A";


  return (
    // The sidebar structure is highly decoupled here. In a real app, this sidebar 
    // would likely be a separate component wrapping the main content.
    <div className="admin-layout">
      {/* Sidebar Section */}
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
            {/* Icons are now defined/imported */}
            {sidebarCollapsed ? <FaChevronRight /> : <FaChevronLeft />}
          </button>
        </div>
        <div className="sidebar-header">
          {!sidebarCollapsed && <h3 className="sidebar-title">APPLICATION ADMIN</h3>}
          {!sidebarCollapsed && (
            <>
              {/* currentDate is now defined */}
              <div className="current-date">{currentDate}</div>
              {/* handleLogout is now defined */}
              <button onClick={handleLogout} className="btn btn-outline btn-sm logout-btn">
                Logout
              </button>
            </>
          )}
        </div>
        <ul className="sidebar-nav">
          {/* sections is now defined */}
          {sections.map((sec) => (
            <li key={sec}>
              <button
                onClick={() => navigate("/", { state: { section: sec, refresh: Date.now() } })}
                // activeSection is now defined
                className={activeSection === sec ? "active" : ""}
              >
                {/* getIconForSection is now defined */}
                {getIconForSection(sec)}
                {!sidebarCollapsed && (
                  <span className="label">
                    {sec === "createTimesheet" ? "Create Timesheet" : "View Timesheets"}
                  </span>
                )}
              </button>
            </li>
          ))}
        </ul>
      </nav>
      {/* Main Content */}
      <div
        className="main-content"
        style={{ marginLeft: sidebarCollapsed ? 60 : 300 }}
      >
        <div className="page-header">
  {/* Wrap button and title to group them */}
  <div style={{ display: 'flex', alignItems: 'center' }}>
    <button
      className="back-btn"
      // activeSection is now defined
      onClick={() => navigate("/", { state: { activeSection: "viewTimesheets" } })}
    >
      <FaArrowLeft /> Back
    </button>
    {/* Added margin for spacing */}
    <h2 className="page-title" style={{ marginLeft: '1rem' }}>
      {ts.timesheet_name || "Timesheet"}
    </h2>
  </div>
</div>


        {/* 1. ⚙️ Job & Contract Information */}
        <div className="section">
          <h3 className="section-title">Job & Contract Information</h3>
          <table className="details-table">
            <thead>
              <tr>
                <th>Date</th>
                <th>Foreman ID</th>
                <th>Job Code</th>
                <th>Job Name</th>
                <th>Contract No</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td>{new Date(ts.date).toLocaleDateString()}</td>
                <td>{ts.foreman_id || "N/A"}</td>
                <td>{jobCode}</td>
                <td>{data.job_name || "N/A"}</td>
                <td>{contract_no || "N/A"}</td>
              </tr>
            </tbody>
          </table>
          <table className="details-table mt-4">
              <thead>
              <tr>
                <th>Phase Codes</th>
                <th>Project Engineer</th>
                <th>Supervisor</th>
                <th>Location</th>
              </tr>
              </thead>
              <tbody>
              <tr>
                <td>{jobPhaseCodes}</td>
                <td>{project_engineer || "N/A"}</td>
                <td>{supervisorName}</td>
                <td>{location || "N/A"}</td>
              </tr>
              </tbody>
          </table>
        </div>
        <hr />

        {/* 2. 👷 Crew & Equipment */}
        <div className="section">
          <h3 className="section-title">Crew & Equipment</h3>
          <table className="details-table">
            <thead>
              <tr>
                <th>Employees ({employees.length})</th>
                <th>Equipment ({equipment.length})</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td><ul className="list-compact">{renderComplexListItems(employees, "employees")}</ul></td>
                <td><ul className="list-compact">{renderComplexListItems(equipment, "equipment")}</ul></td>
              </tr>
            </tbody>
          </table>
        </div>
        <hr />
        
        {/* 3. 🌡️ Work & Conditions */}
        <div className="section">
          <h3 className="section-title">Work & Conditions</h3>
          <table className="details-table">
            <thead>
              <tr>
                <th>Work Description</th>
                <th>Time of Day</th>
                <th>Weather</th>
                <th>Temperature</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td>{work_description || "N/A"}</td>
                <td>{time_of_day || "N/A"}</td>
                <td>{weather || "N/A"}</td>
                <td>{temperature || "N/A"}</td>
              </tr>
            </tbody>
          </table>
        </div>
        <hr />

        {/* 4. 🚚 Logistics: Vendors, Materials & Dumping Sites */}
        <div className="section">
          {/* <h3 className="section-title">Logistics Details</h3> */}
          <div> 
            {renderLogisticsBox(
              "Vendors",
              vendors,
              vendor_categories,
              selected_vendor_materials,
              "Vendor"
            )}
            {renderLogisticsBox(
  "Materials/Trucking",
  Object.values(selected_material_items),   // ✅ use objects that actually exist
  material_categories,
  selected_material_items,
  "Material/Trucking"
)}

            {/* The last logistics box, rendered separately to control the final HR */}
            <div className="structured-box mt-4"> 
              <h3 className="section-title">Dumping Sites ({dumping_sites.length})</h3> 
              <table className="details-table compact-table">
                  <tbody>
                      <tr>
                          <th className="w-40">Categories</th>
                          <td>
                              {renderCategoryDisplay(dumping_categories, "Dumping Site")}
                          </td>
                      </tr>
                      <tr>
                          <th>Selected Dumping Sites</th>
                          <td>
                              <ul className="list-unstyled list-compact">
                                  {renderComplexListItems(dumping_sites, "dumpingsite")}
                              </ul>
                          </td>
                      </tr>
                      <tr>
                          <th className="border-bottom-0">Selected Materials</th>
                          <td className="border-bottom-0">
                              {/* Replicating renderNestedItemsList logic for the dumping site */}
                              {dumping_sites.length === 0 ? (
                                <p className="text-muted">N/A (No associated items)</p>
                              ) : (
                                <dl className="logistics-item-details-list">
                                  {dumping_sites.map((entity, i) => {
                                      const entityId = entity.id;
                                      const entityName = entity.name || `ID: ${entityId}`;
                                      const itemDetails = selected_dumping_materials[entityId];
                                      const selectedMaterials = itemDetails?.selectedMaterials || [];
                                      return (
                                          <div key={i}>
                                              <dt className="logistics-item-name">{entityName}</dt>
                                              <dd className="logistics-item-materials">
                                                  {selectedMaterials.length > 0 ? (
                                                      <ul className="list-unstyled">
                                                          {selectedMaterials.map((material, j) => {
  // Try to find unit from the full materials list if missing
  const fullMaterial =
    itemDetails?.materials?.find(m => m.id === material.id);
  const unit = material.unit || fullMaterial?.unit || "N/A Unit";

  return (
    <li key={j}>
      {material.name} ({unit})
    </li>
  );
})}

                                                      </ul>
                                                  ) : (
                                                      <span className="text-muted">No associated items.</span>
                                                  )}
                                              </dd>
                                          </div>
                                      );
                                  })}
                                </dl>
                              )}
                          </td>
                      </tr>
                  </tbody>
              </table>
            </div>
          </div>
        </div>
        
      </div>
    </div>
  );
};

export default TimesheetDetails;