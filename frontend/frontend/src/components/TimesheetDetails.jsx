import React, { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import axios from "axios";
import {
  FaArrowLeft,
  FaRegEdit,
  FaClipboardList,
  FaChevronRight,
  FaChevronLeft,
} from "react-icons/fa";
import "./ApplicationAdmin.css";

const API_URL = "http://127.0.0.1:8000/api";

// --- Helper Functions ---

const renderComplexListItems = (items, key) => {
  if (!Array.isArray(items) || items.length === 0) return <li>N/A</li>;

  return items.map((item, i) => {
    if (key === "employees") {
      const name = `${item.first_name || ""} ${item.last_name || ""}`.trim();
      return <li key={i}>{name || `ID: ${item.id}`}</li>;
    }
    if (key === "equipment") {
      return <li key={i}>{item.name}</li>;
    }
    return <li key={i}>{item.name || `ID: ${item.id}` || "Unnamed Entity"}</li>;
  });
};

const renderCategoryDisplay = (categories) => {
  if (!Array.isArray(categories) || categories.length === 0)
    return <span className="text-muted">N/A</span>;
  return categories.map((cat, i) => (
    <span key={i} className="badge">
      {cat}
    </span>
  ));
};

const renderLogisticsBox = (title, entities, categories, itemMap, entityLabel) => {
  const renderNestedItemsList = () => {
    if (entities.length === 0)
      return <p className="text-muted">N/A (No associated items)</p>;

    return (
      <dl className="logistics-item-details-list">
        {entities.map((entity, i) => {
          const entityId = entity.id;
          const entityName = entity.name || `ID: ${entityId}`;
          const itemDetails = itemMap[entityId];
          const selectedMaterials = itemDetails?.selectedMaterials || itemDetails?.materials || [];

          return (
            <div key={i}>
              <dt className="logistics-item-name">{entityName}</dt>
              <dd className="logistics-item-materials">
                {selectedMaterials.length > 0 ? (
                  <ul className="list-unstyled">
                    {selectedMaterials.map((material, j) => {
                      const fullMaterial = itemDetails?.materials?.find((m) => m.id === material.id);
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
    <div className="structured-box mt-4">
      <h3 className="section-title">
        {title} ({entities.length})
      </h3>

      <table className="details-table compact-table">
        <tbody>
          <tr>
            <th className="w-40">Categories</th>
            <td>{renderCategoryDisplay(categories)}</td>
          </tr>
          <tr>
            <th>Selected {entityLabel}s</th>
            <td>
              <ul className="list-unstyled list-compact">
                {renderComplexListItems(entities, entityLabel.toLowerCase().replace(/[^a-z]/g, ""))}
              </ul>
            </td>
          </tr>
          <tr>
            <th className="border-bottom-0">Selected Materials</th>
            <td className="border-bottom-0">{renderNestedItemsList()}</td>
          </tr>
        </tbody>
      </table>
      <hr />
    </div>
  );
};

// --- TimesheetDetails Component ---

const TimesheetDetails = () => {
  const { id } = useParams();
  const navigate = useNavigate();

  const [ts, setTs] = useState(null);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);

  const currentDate = new Date().toLocaleDateString("en-US", {
    year: "numeric",
    month: "short",
    day: "numeric",
  });

  const handleLogout = () => {
    console.log("Logout triggered");
  };

  const sections = ["createTimesheet", "viewTimesheets"];
  const [activeSection, setActiveSection] = useState("viewTimesheets");

  const getIconForSection = (sectionName) => {
    if (sectionName === "createTimesheet") return <FaRegEdit />;
    if (sectionName === "viewTimesheets") return <FaClipboardList />;
    return null;
  };

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

  if (!ts) return <p>Loading...</p>;

  const data = ts.data || {};

  const {
    job = {},
    supervisor = null,
    contract_no,
    project_engineer,
    time_of_day,
    location,
    work_description,
    employees = [],
    equipment = [],
    vendors = [],
    materials = [],
    dumping_sites = [],
    vendor_categories = [],
    material_categories = [],
    dumping_categories = [],
    selected_vendor_materials: selectedvendormaterials = {},
    selected_material_items = {},
  } = data;

  const jobCode = job.job_code || "N/A";
  const jobPhaseCodes = job.phase_codes?.join(", ") || "N/A";
  const supervisorName = supervisor?.name || "N/A";

  return (
    <div className="admin-layout">
      {/* Sidebar */}
      <nav className={`admin-sidebar ${sidebarCollapsed ? "collapsed" : ""}`} style={{ width: sidebarCollapsed ? 60 : 250 }}>
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
          {!sidebarCollapsed && <h3 className="sidebar-title">APPLICATION ADMIN</h3>}
          {!sidebarCollapsed && (
            <>
              <div className="current-date">{currentDate}</div>
              <button onClick={handleLogout} className="btn btn-outline btn-sm logout-btn">
                Logout
              </button>
            </>
          )}
        </div>
        <ul className="sidebar-nav">
          {sections.map((sec) => (
            <li key={sec}>
              <button
                onClick={() => navigate("/", { state: { section: sec, refresh: Date.now() } })}
                className={activeSection === sec ? "active" : ""}
              >
                {getIconForSection(sec)}
                {!sidebarCollapsed && (
                  <span className="label">{sec === "createTimesheet" ? "Create Timesheet" : "View Timesheets"}</span>
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



        {/* 1. Job & Contract Info */}
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
               
                <th>Project Engineer</th>
                <th>Supervisor</th>
                <th>Location</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                
                <td>{project_engineer || "N/A"}</td>
                <td>{supervisorName}</td>
                <td>{location || "N/A"}</td>
              </tr>
            </tbody>
          </table>
        </div>

        <hr />

        {/* 2. Crew & Equipment */}
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
                <td>
                  <ul className="list-compact">{renderComplexListItems(employees, "employees")}</ul>
                </td>
                <td>
                  <ul className="list-compact">{renderComplexListItems(equipment, "equipment")}</ul>
                </td>
              </tr>
            </tbody>
          </table>
        </div>

        <hr />

        {/* 3. Work & Conditions */}
        <div className="section">
          <h3 className="section-title">Work & Conditions</h3>
          <table className="details-table">
            <thead>
              <tr>
                <th>Work Description</th>
                <th>Time of Day</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td>{work_description || "N/A"}</td>
                <td>{time_of_day || "N/A"}</td>
              </tr>
            </tbody>
          </table>
        </div>

        <hr />

        {/* 4. Logistics: Vendors by Category */}
        <div className="section">
          <h3 className="section-title">Vendor Details by Category</h3>
          <div>
            {["Concrete", "Asphalt", "Top Soil"].map((category, catIndex) => {
              const categoryVendors = Object.values(selectedvendormaterials || {}).filter((vendor) => {
                const vendorCat = (vendor.vendor_category || "").toLowerCase().trim();
                const targetCat = category.toLowerCase().trim();
                return vendorCat === targetCat || vendorCat.includes(targetCat) || targetCat.includes(vendorCat);
              });

              if (categoryVendors.length === 0) return null;

              return (
                <div key={catIndex} className="structured-box mt-4 mb-4">
                  <h4 className="section-subtitle">{category}</h4>
                  <table className="details-table compact-table">
                    <thead>
                      <tr>
                        <th>Supplier</th>
                        <th>Material</th>
                        <th>Unit</th>
                        <th>Details</th>
                      </tr>
                    </thead>
                    <tbody>
                      {categoryVendors.map((vendor, vIndex) =>
                        vendor.selectedMaterials?.map((material, mIndex) => (
                          <tr key={`${vIndex}-${mIndex}`}>
                            <td>{vendor.name}</td>
                            <td>{material.material}</td>
                            <td>{material.unit}</td>
                            <td>{material.detail || "N/A"}</td>
                          </tr>
                        ))
                      )}
                      {categoryVendors.every((v) => !v.selectedMaterials?.length) && (
                        <tr>
                          <td colSpan="4" className="text-muted text-center">
                            No materials selected
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              );
            })}
          </div>

          {/* 🚚 Trucking Details */}
          <div className="structured-box mt-4 mb-4">
            <h4 className="section-subtitle">Trucking </h4>
            {Object.keys(selected_material_items || {}).length === 0 ? (
              <p className="text-muted">No trucking data available</p>
            ) : (
              <table className="details-table compact-table">
                <thead>
                  <tr>
                    <th>Item</th>
                    <th>Details</th>
                  </tr>
                </thead>
                <tbody>
                  {Object.values(selected_material_items).map((item, i) => (
                    <tr key={i}>
                      <td>{item.name || `ID: ${item.id}`}</td>
                      <td>{item.notes || item.detail || item.details || item.description || "N/A"}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default TimesheetDetails;
