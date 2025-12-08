import React, { useState, useEffect, useMemo } from "react";
import axios from "axios";
import CrewMappingManager from './CrewMappingManager';
import "./CrewMapping.css";
import {
  FaUser, FaHardHat, FaTasks, FaBox, FaBriefcase,
  FaUsers, FaTrash, FaBars, FaTimes, FaTachometerAlt,
  FaChevronLeft, FaChevronRight, FaTicketAlt
} from 'react-icons/fa';
import Tickets from './Tickets'; // <--- ADD THIS
import TimesheetCounts from './TimesheetCounts';
import './Equipment.css';
import AuditLogViewer from './AuditLogViewer'; // <-- ADD THIS LINE
import { apiClient } from "../api";
export const ITEMSPERPAGE = 10;
// Pagination controls component (reusable)
const PaginationControls = ({ currentPage, totalPages, onPaginate }) => {
  if (totalPages <= 1) return null;
  const pageNumbers = [];
  for (let i = 1; i <= totalPages; i++) pageNumbers.push(i);
  return (
    <nav className="pagination-controls" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '16px 0' }}>
      <button onClick={() => onPaginate(currentPage - 1)} disabled={currentPage === 1} className="btn btn-sm">
        <FaChevronLeft /> Prev
      </button>
      <ul className="pagination-list" style={{ display: "inline-flex", listStyle: "none", margin: '0 8px' }}>
        {pageNumbers.map(number => (
          <li key={number} style={{ margin: "0 2px" }}>
            <button
              onClick={() => onPaginate(number)}
              className={`page-link${currentPage === number ? " active" : ""}`}
              style={{
                minWidth: 32,
                padding: '6px 12px',
                background: currentPage === number ? '#007bff' : "#fff",
                color: currentPage === number ? '#fff' : "#333",
                border: '1px solid #ccc',
                borderRadius: '4px',
                marginRight: 2,
                fontWeight: 500
              }}
            >
              {number}
            </button>
          </li>
        ))}
      </ul>
      <button onClick={() => onPaginate(currentPage + 1)} disabled={currentPage === totalPages} className="btn btn-sm">
        Next <FaChevronRight />
      </button>
    </nav>
  );
};
// --- Reusable Modal Component (Unchanged) ---
const Modal = ({ title, children, onClose, size = "medium" }) => (
    <div className="modal">
        <div className={`modal-content ${size}`}>
            <div className="modal-header">
                <h3>{title}</h3>
                <button onClick={onClose} className="btn-sm btn-outline">×</button>
            </div>
            <div className="modal-body-scrollable">{children}</div>
        </div>
    </div>
);
// --- Notification & Confirmation Modals (Unchanged) ---
const NotificationModal = ({ message, onClose }) => (
    // MODIFIED: Added inline style for centering the modal on the screen
    <div className="modal" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <div className="modal-content small">
            <div className="modal-header">
                <h3>Notification</h3>
                <button onClick={onClose} className="btn-sm btn-outline">×</button>
            </div>
            <div className="modal-body"><p>{message}</p></div>
            <div className="modal-actions" style={{ justifyContent: 'center' }}>
                <button onClick={onClose} className="btn btn-primary">OK</button>
            </div>
        </div>
    </div>
);
const ConfirmationModal = ({ message, onConfirm, onCancel }) => (
    // MODIFIED: Added inline style for centering the modal on the screen
    <div className="modal" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <div className="modal-content small">
            <div className="modal-header">
                <h3>Confirmation</h3>
                <button onClick={onCancel} className="btn-sm btn-outline">×</button>
            </div>
            <div className="modal-body"><p>{message}</p></div>
            <div className="modal-actions">
                <button onClick={onCancel} className="btn btn-outline">Cancel</button>
                <button onClick={onConfirm} className="btn btn-danger">Confirm</button>
            </div>
        </div>
    </div>
);
const getIconForSection = (sec) => {
    switch(sec) {
        case 'dashboard': return <FaTachometerAlt />; // <= ADD THIS CASE
        case "tickets": return <FaTicketAlt />;
        case "users": return <FaUser />;
        case "employees": return <FaUser />;
        case "equipment": return <FaHardHat />;
        case "job-phases": return <FaTasks />;
        case "materials": return <FaBox />;
        case "vendors": return <FaBriefcase />;
        case "crewMapping": return <FaUsers />;
        case "dumping_sites": return <FaTrash />;
        default: return <FaTasks />;
    }
};
// --- Generic Form Component (Unchanged) ---
const GenericForm = ({ fields,vendorOptions, fetchVendorOptions,materialOptions,fetchMaterialOptions,fetchDumpingSiteOptions,dumpingSiteOptions, onSubmit, defaultValues = {}, errorMessage,genericErrorMessage, categories = [] }) => {
    const [formData, setFormData] = useState(defaultValues);
    const [errors, setErrors] = useState({}); // Add this state for inline errors

    const [values, setValues] = useState(() => {
        const initialValues = { ...defaultValues };
        fields.forEach(field => {
            if (initialValues[field.name] === undefined && field.defaultValue !== undefined) {
                initialValues[field.name] = field.defaultValue;
            }
        });
        return initialValues;
    });
    const [vendorData, setVendorData] = useState({
  id: "",
  name: "",
  vendor_type: "",
  vendor_category: "",
  status: "ACTIVE",
  materials: [{ material: "", unit: "" }],
});
const handleMaterialChange = (index, field, value) => {
  const newMaterials = [...vendorData.materials];
  newMaterials[index][field] = value;
  setVendorData({ ...vendorData, materials: newMaterials });
};
const addMaterialRow = () => {
  setVendorData({
    ...vendorData,
    materials: [...vendorData.materials, { material: "", unit: "" }],
  });
};
    const validateField = (name, value) => {
        let error = "";
        const field = fields.find(f => f.name === name);
        if (field?.required && !value) {
            error = `${field.label} is required.`;
        }
        setErrors(prev => ({ ...prev, [name]: error }));
        return error;
    };
const handleChange = (e) => {
  if (!e || !e.target) return; // prevent crash
  const { name, value } = e.target;
let error = '';
  let processedValue = value; // This will be the cleaned value
      let newValues = { ...values, [name]: value };
   if (name === 'firstname' || name === 'lastname') {
    // If the input contains a number...
    if (/[0-9]/.test(value)) {
      error = 'Only characters are allowed.'; // Set the error message
    }
    // This line automatically removes any numbers the user types
    processedValue = value.replace(/[0-9]/g, '');
  }
  setValues((prev) => ({ ...prev, [name]: processedValue }));
  setErrors((prev) => ({ ...prev, [name]: error }));
if (name === 'categorynumber') {
      const selectedCategory = categories.find(c => c.number === value);
      if (selectedCategory) {
        newValues = {
          ...newValues,
          category: selectedCategory.name,
        categoryid: selectedCategory.id    // Always use 'categoryid' (lowercase 'd')
        };
      } else {
        newValues = { ...newValues, category: '',categoryid: null };
      }
    }
        setValues(newValues);
  validateField(name, value);
};
useEffect(() => {
  if (errorMessage) {
    setErrors(prev => ({ ...prev, ...errorMessage }));
  }
}, [errorMessage]);
const handleSubmit = e => {
  e.preventDefault();
  let newErrors = {};
  fields.forEach(f => {
    const error = validateField(f.name, values[f.name]);
    if (error) newErrors[f.name] = error;
  });
  setErrors(newErrors);
  if (Object.keys(newErrors).length === 0) {
    if (values.category_number && !values.category) {
      const selectedCategory = categories.find(c => c.number === values.category_number);
      if (selectedCategory) {
        values.category = selectedCategory.name;
      }
    }
    if (values.category_number) {
      const selectedCategory = categories.find(c => c.number === values.category_number);
      if (selectedCategory) {
        values.category_id = selectedCategory.id;
      }
    }
    console.log("Submitting form values:", values);
    values.materials = vendorData.materials;
    onSubmit(values);
  }
};
return (
  <form onSubmit={handleSubmit} className="generic-form">
    {/* Top error message */}
    {genericErrorMessage && (
      <div className="form-error-top">{genericErrorMessage}</div>
    )}

    {fields.map((field, index) => {
      // Multi-material field
      if (field.type === "multi_material") {
        return (
          <MultiSelectWithAdd
            key={index}
            label={field.label}
            options={vendorOptions.material || []}
            value={values.material_ids || []}
            onChange={(selected) =>
              setValues((prev) => ({ ...prev, material_ids: selected }))
            }
            reloadOptions={fetchVendorOptions}
          />
        );
      }
   if (field.type === "custom") {
  // Decide whether this is vendor, material, or dumping site dropdown
  const isMaterial = ["material_type", "material_category"].includes(field.customType);
  const isDumping = ["dumping_type", "dumping_category"].includes(field.customType);
  let optionsSource;
  let reloadFunction;

  if (isMaterial) {
    optionsSource = materialOptions;
    reloadFunction = fetchMaterialOptions;
  } else if (isDumping) {
    optionsSource = dumpingSiteOptions;
    reloadFunction = fetchDumpingSiteOptions;
  } else {
    optionsSource = vendorOptions;
    reloadFunction = fetchVendorOptions;
  }
  const optionsKey = isMaterial
    ? field.customType === "material_type" ? "type" : "category"
    : isDumping
      ? field.customType === "dumping_type" ? "type" : "category"
      : field.customType;

  return (
    <SelectWithAdd
      key={index}
      label={field.label}
      type={field.customType}
      options={(optionsSource?.[optionsKey] || []).map((v) => ({
        value: v.value || v,
        label: v.label || v,
      }))}
      value={values[field.name] || ""}
      onChange={(e) =>
        setValues((prev) => ({ ...prev, [field.name]: e.target.value }))
      }
      reloadOptions={reloadFunction}
    />
  );
}      return (
        <div className="form-group" key={field.name}>
          <label className="form-label">
            {field.label}
            {field.required && <span style={{ color: "red" }}> *</span>}
          </label>

          <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
            <div style={{ flex: 1 }}>
              {field.type === "select" ? (
                <select
                  name={field.name}
                  className="form-control"
                  value={values[field.name] || ""}
                  onChange={handleChange}
                  required={field.required}
                >
                  <option value="">Select {field.label}</option>
                  {field.options.map((opt) => (
                    <option key={opt.value} value={opt.value}>
                      {opt.label}
                    </option>
                  ))}
                </select>
              ) : (
                <input
                  type={field.type || "text"}
                  name={field.name}
                  className="form-control"
                  value={values[field.name] || ""}
                  onChange={handleChange}
                  required={field.required}
                  readOnly={field.readOnly || false}
                  autoComplete={field.type === "password" ? "new-password" : "off"}
                />
              )}
            </div>
            {/* Add New button if defined */}
            {field.onAddNew && (
              <button
                type="button"
                onClick={field.onAddNew}
                className="btn btn-sm btn-outline"
                style={{ whiteSpace: "nowrap" }}
              >
                Add New
              </button>
            )}
          </div>

          {errors[field.name] && (
            <small style={{ color: "red", fontSize: "12px" }}>
              {errors[field.name]}
            </small>
          )}
        </div>
      );
    })}
    <div className="modal-actions">
      <button type="submit" className="btn btn-primary">
        Save
      </button>
    </div>
  </form>
);
};
// --- Job & Phases Components (Unchanged) ---
const JobPhasesTable = ({ phases, onEdit, onDelete }) => (
    <table className="data-table">
        <thead><tr><th>Phase Code</th><th>Actions</th></tr></thead>
        <tbody>
            {phases.map((p, i) => (
                <tr key={`${p.phase_code}-${i}`}>
                    <td>{p.phase_code}</td>
                    <td>
                        <button onClick={() => onEdit(i)} className="btn btn-sm">Edit</button>
                        <button onClick={() => onDelete(i)} className="btn btn-sm btn-outline">Delete</button>
                    </td>
                </tr>
            ))}
        </tbody>
    </table>
);
const JobWithPhasesModal = ({ mode, job, onSave, onClose, showNotification }) => {
    const [jobCode, setJobCode] = useState(job?.job_code || "");
    const [contractNo, setContractNo] = useState(job?.contract_no || "");
    const [jobDescription, setJobDescription] = useState(job?.job_description || "");
const [projectEngineer, setProjectEngineer] = useState(
  job?.project_engineer_id || job?.project_engineer || ""
);
const [jurisdiction, setJurisdiction] = useState("");
const [projectEngineerId, setProjectEngineerId] = useState('');
    const [status, setStatus] = useState(job?.status?.toLowerCase() || "active"); 
    const [phaseCode, setPhaseCode] = useState("");
    const [phases, setPhases] = useState(job?.phases || []);
    const [editIdx, setEditIdx] = useState(null);
    const fixedPhases = ["Admin", "S&SL", "Vacation"];
    const [locations, setLocations] = useState([]);
 const [engineers, setEngineers] = useState([]);
const [locationId, setLocationId] = useState("");
useEffect(() => {
  apiClient.get("/project-engineer/")
    .then((res) => {
      if (Array.isArray(res.data)) {
        const activeEngineers = res.data.filter(e => e.status.toLowerCase() === "active");
        setEngineers(activeEngineers);
      } else {
        console.error("Unexpected response:", res.data);
        setEngineers([]);
      }
    })
    .catch((err) => {
      console.error("Error fetching engineers:", err);
      setEngineers([]);
    });
}, []);
  useEffect(() => {
    apiClient.get(`/locations/`)
      .then((res) => setLocations(res.data))
      .catch((err) => console.error("Error fetching locations:", err));
  }, []);

// ✅ Prefill form when editing a job
useEffect(() => {
  if (job) {
    setJobCode(job.job_code || "");
    setContractNo(job.contract_no || "");
    setJobDescription(job.job_description || "");
    setProjectEngineerId(job.project_engineer_id || "");
    setProjectEngineer(job.project_engineer || "");
    setStatus(job.status?.toLowerCase() || "active");

    // ✅ Handle location (jurisdiction/location_id)
    if (job.location_id) {
      setLocationId(String(job.location_id));
    } else if (typeof job.jurisdiction === "string") {
      const match = locations.find(
        (loc) =>
          loc.name.trim().toLowerCase() ===
          job.jurisdiction.trim().toLowerCase()
      );
      if (match) setLocationId(String(match.id));
    }
  }
}, [job, locations]);
useEffect(() => {
  if (!job || locations.length === 0) return;

  let matchedId = null;

  if (job.location_id) {
    matchedId = job.location_id;
  } else if (typeof job.jurisdiction === "string") {
    const match = locations.find(
      (loc) =>
        loc.name.trim().toLowerCase() ===
        job.jurisdiction.trim().toLowerCase()
    );
    if (match) matchedId = match.id;
  }

  if (matchedId) {
    setJurisdiction(String(matchedId));
  }
  console.log("🔍 Job:", job);
  console.log("📍 Locations:", locations);
  console.log("✅ Matched Jurisdiction ID:", matchedId);
}, [job, locations]);
    const handleAddPhase = () => {
      if (!phaseCode.trim()) return showNotification("Please enter a phase code.");
      if (phases.some((p, idx) => p.phase_code === phaseCode.trim() && idx !== editIdx))
        return showNotification("This phase code already exists.");
      if (editIdx !== null) {
        setPhases(phases.map((p, i) => (i === editIdx ? { phase_code: phaseCode.trim() } : p)));
        setEditIdx(null);
      } else {
        setPhases([...phases, { phase_code: phaseCode.trim() }]);
      }
      setPhaseCode("");
    };
    const handleEditPhase = (idx) => {
      setPhaseCode(phases[idx].phase_code);
      setEditIdx(idx);
    };
    const handleDeletePhase = (idx) => {
      setPhases(phases.filter((_, i) => i !== idx));
    };
    const handleSubmit = () => {
        if (!jobCode.trim()) return showNotification("Job code is a required field.");
        const finalPhaseStrings = [...new Set([...phases.map(p => p.phase_code), ...fixedPhases])];
const payload = {
  job_code: jobCode.trim(),
  contract_no: contractNo.trim(),
  job_description: jobDescription.trim(),
  project_engineer_id: projectEngineerId ? parseInt(projectEngineerId) : null,
  location_id: jurisdiction ? parseInt(jurisdiction) : null,
  project_engineer: projectEngineer, // keep name if your backend uses both
  status: status.toLowerCase(),
  phase_codes: finalPhaseStrings
};        
        onSave(payload);
    };

    return (
        <Modal title={mode === "edit" ? "Edit Job & Phases" : "Create Job & Phases"} onClose={onClose} size="large">
            <div className="form-grid">
                <div className="form-group"><label>Job Code</label><input type="text" value={jobCode} onChange={(e) => setJobCode(e.target.value)} disabled={mode === "edit"} className="form-control" required /></div>
                <div className="form-group"><label>Contract No.</label><input type="text" value={contractNo} onChange={(e) => setContractNo(e.target.value)} className="form-control" /></div>
<div className="form-group">
  <label>Location</label>
<select
  value={locationId || ""}  // <-- must be locationId, not jurisdiction
  onChange={(e) => setLocationId(Number(e.target.value))}
  className="form-control"
>
    <option value="">Select Location</option>
    {locations.map((loc) => (
      <option key={loc.id} value={loc.id}>
        {loc.name}
      </option>
    ))}
  </select>
</div>
<div className="form-group">
  <label>Project Engineer</label>
 <select
  value={projectEngineerId || ""}
  onChange={(e) => {
    const selectedId = e.target.value;
    const selectedEngineer = engineers.find(
      (eng) => eng.id === parseInt(selectedId)
    );
    setProjectEngineerId(selectedId);
    setProjectEngineer(
      selectedEngineer
        ? `${selectedEngineer.first_name} ${selectedEngineer.last_name}`
        : ""
    );
  }}
  className="form-control"
>
  <option value="">Select Project Engineer</option>
  {Array.isArray(engineers) &&
    engineers.map((eng) => (
      <option key={eng.id} value={eng.id}>
        {eng.first_name} {eng.last_name}
      </option>
    ))}
</select>
</div>

                <div className="form-group full-width"><label>Job Description</label><textarea value={jobDescription} onChange={(e) => setJobDescription(e.target.value)} className="form-control" rows="3"></textarea></div>
                
                {/* ✅ FIX: The select now correctly uses lowercase values */}
                <div className="form-group">
                    <label>Status</label>
                    <select value={status} onChange={(e) => setStatus(e.target.value)} className="form-control">
                        <option value="active">Active</option>
                        <option value="inactive">Inactive</option>
                    </select>
                </div>
            </div>
            <hr style={{ margin: "16px 0" }} />
            <h4>Editable Phases</h4>
            <div className="phases-table-wrapper"><JobPhasesTable phases={phases} onEdit={handleEditPhase} onDelete={handleDeletePhase} /></div>
            <div style={{ display: "flex", gap: "8px", marginTop: "8px" }}>
                <input type="text" value={phaseCode} onChange={(e) => setPhaseCode(e.target.value)} placeholder="New Phase Code" className="form-control" />
                <button type="button" onClick={handleAddPhase} className="btn">{editIdx !== null ? "Update" : "Add"}</button>
                {editIdx !== null && (<button type="button" onClick={() => { setEditIdx(null); setPhaseCode(""); }} className="btn btn-outline">Cancel</button>)}
            </div>
            <div style={{ marginTop: "16px" }}><h4>Fixed Phases</h4><ul className="fixed-phases-list">{fixedPhases.map(p => <li key={p}>{p}</li>)}</ul></div>
            <div className="modal-actions"><button onClick={handleSubmit} className="btn btn-primary">Save Job</button></div>
        </Modal>
    );
};

const JobPhasesViewModal = ({ job, onClose }) => (
    <Modal title={`Phases for ${job.job_code}`} onClose={onClose}>
        <table className="data-table">
            <thead>
                <tr>
                    <th>Phase Code</th>
                    {/* It's helpful to also show the description */}
                    <th>Description</th>
                </tr>
            </thead>
            <tbody>
                {(job.phase_codes || []).map((phaseObject) => (
                    // ✅ FIX: Use the unique 'id' for the key for better performance
                    <tr key={phaseObject.id}>
                        {/* ✅ FIX: Access the 'code' property of the phase object */}
                        <td>{phaseObject.code}</td>
                        <td>{phaseObject.description}</td>
                    </tr>
                ))}
            </tbody>
        </table>
    </Modal>
);
// Mapping from section key to page number
const SECTIONS = [
    "users","employees","tickets","equipment","job-phases",
    "materials_trucking","vendors","dumping_sites","crewMapping"
];
const ITEMS_PER_PAGE = 10; // or desired default


const capitalizeFirstLetter = (str) => {
  if (!str) return "";
  return str.charAt(0).toUpperCase() + str.slice(1);
};

const SelectWithAdd = ({ label, options, type, onChange, value, reloadOptions }) => {
  const [showAdd, setShowAdd] = useState(false);
  const [newOption, setNewOption] = useState("");

  const handleAddOption = async () => {
    if (!newOption.trim()) return;
    try {
      const endpoint = type.startsWith("material_")
      ? "material-options"
      : type.startsWith("dumping_")
      ? "dumping_sites/options"
      : "vendor-options";

const queryParam =
      type.startsWith("dumping_") ? "option_type" : "type";

    await apiClient.post(
  `/${endpoint}?${queryParam}=${type}&value=${encodeURIComponent(newOption)}`
);
      alert(`${newOption} added to ${type}`);
      setNewOption("");
      setShowAdd(false);
      reloadOptions(); // refresh options from DB
    } catch (err) {
      alert(err.response?.data?.detail || "Failed to add option");
    }
  };

  return (
    <div style={{ marginBottom: "10px" }}>
      <label>{label}</label>
      <div style={{ display: "flex", gap: "8px" }}>
        <select value={value} onChange={onChange} className="form-select">
          <option value="">Select {label}</option>
          {options.map(opt => (
            <option key={opt.value} value={opt.value}>{opt.label}</option>
          ))}
        </select>
        <button
          type="button"
          onClick={() => setShowAdd(!showAdd)}
          className="btn btn-outline-primary btn-sm"
        >
          +
        </button>
      </div>
      {showAdd && (
        <div style={{ marginTop: "5px", display: "flex", gap: "5px" }}>
          <input
            type="text"
            value={newOption}
            onChange={(e) => setNewOption(e.target.value)}
            placeholder={`Add new ${label}`}
            className="form-control"
          />
          <button type="button" onClick={handleAddOption} className="btn btn-success btn-sm">
            Add
          </button>
        </div>
      )}
    </div>
  );
};
const MultiSelectWithAdd = ({ label, options, onChange, value = [], reloadOptions}) => {
  const [showAdd, setShowAdd] = useState(false);
  const [newMaterial, setNewMaterial] = useState("");
  const [newUnit, setNewUnit] = useState("");

  const handleAddMaterial = async () => {
    if (!newMaterial.trim() || !newUnit.trim()) return;
    try {
      await apiClient.post("/vendor-materials/", {
        material: newMaterial,
        unit: newUnit,
      });
      alert(`${newMaterial} (${newUnit}) added successfully`);
      setNewMaterial("");
      setNewUnit("");
      setShowAdd(false);
      reloadOptions();
    } catch (err) {
      alert(err.response?.data?.detail || "Failed to add material");
    }
  };

  const handleCheckboxChange = (selectedValue) => {
    const newSelected = value.includes(selectedValue)
      ? value.filter(v => v !== selectedValue)
      : [...value, selectedValue];
    onChange(newSelected);
  };

  return (
    <div style={{ marginBottom: "18px" }}>
      <label>{label}</label>
      <div style={{ display: "flex", alignItems: "flex-start", gap: "10px" }}>
        <div
          className="form-control"
          style={{
            flex: 1,
            minHeight: "120px",
            maxHeight: "160px",
            overflowY: "auto",
            padding: "8px 12px",
            borderRadius: "6px",
            backgroundColor: "white",
          }}
        >
          {(options || []).map(opt => (
            <div
              key={opt.value}
              className="form-check"
              style={{ marginBottom: "5px" }}
            >
              <input
                type="checkbox"
                className="form-check-input"
                id={`material-${opt.value}`}
                checked={value.includes(opt.value)}
                onChange={() => handleCheckboxChange(opt.value)}
              />
              <label
                className="form-check-label"
                htmlFor={`material-${opt.value}`}
              >
                {opt.label}
              </label>
            </div>
          ))}
        </div>
      <button
          type="button"
          onClick={() => setShowAdd(!showAdd)}
          className="btn btn-outline-primary btn-sm"
          style={{
            height: "42px",
            width: "28px",
            borderRadius: "6px",
            
            lineHeight: "1",
            padding: "0",
          }}
          title="Add Material"
        >
          +
        </button>
      </div>

      {showAdd && (
  <div
    style={{
      display: "flex",
      alignItems: "center",
      gap: "10px",
      marginTop: "12px", // space between material list and input row
    }}
  >
    {/* Material input */}
    <input
      type="text"
      value={newMaterial}
      onChange={(e) => setNewMaterial(e.target.value)}
      placeholder="Material"
      className="form-control"
      style={{ flex: 2 }}
    />

    {/* Unit input */}
    <input
      type="text"
      value={newUnit}
      onChange={(e) => setNewUnit(e.target.value)}
      placeholder="Unit"
      className="form-control"
      style={{ flex: 1 }}
    />

    {/* Add button */}
    <button
      type="button"
      onClick={() => {
        if (!newMaterial.trim() && !newUnit.trim()) {
          setShowAdd(false); // close if both empty
          return;
        }
        handleAddMaterial();
      }}
      className="btn btn-success btn-sm"
    >
      Add
    </button>
  </div>
)}
    </div>
  );
};

// --- Main Admin Dashboard Component ---
const AdminDashboard = ({ data: initialData, onLogout}) => { 
    // MODIFIED: Robust state initialization to guarantee all keys exist.
    const [data, setData] = useState(() => {
        const defaults = {
            users: [], employees: [], equipment: [], job_phases: [], 
            materials_trucking: [], vendors: [], dumping_sites: []
        };
        return { ...defaults, ...(initialData || {}) };
    });

const [activeSection, setActiveSection] = useState('dashboard');
    const [modal, setModal] = useState({ shown: false, type: "", title: "", mode: "add", item: null });
    const [jobModal, setJobModal] = useState({ shown: false, mode: "", job: null });
    const [viewPhasesJob, setViewPhasesJob] = useState(null);
    const [notification, setNotification] = useState({ shown: false, message: "" });
    const [confirmation, setConfirmation] = useState({ shown: false, message: "", onConfirm: () => {} });
    const [formError, setFormError] = useState("");
    const [fieldErrors, setFieldErrors] = useState({});
    const [isLoading, setIsLoading] = useState(true);
    const [fetchError, setFetchError] = useState(null);
    const [departments, setDepartments] = useState([]);
const [categories, setCategories] = useState([]);
const [categoryNumbers, setCategoryNumbers] = useState([]);
const [selectedCategoryId, setSelectedCategoryId] = useState("");
const [selectedCategoryNumber, setSelectedCategoryNumber] = useState("");
const [selectedDepartmentId, setSelectedDepartmentId] = useState("");
// In AdminDashboard.js
// ... existing states
const [subModal, setSubModal] = useState({ shown: false, type: null, title: '' }); // <-- ADD THIS

const [dumpingSiteOptions, setDumpingSiteOptions] = useState({
  type: [],
  category: [],
});

// 🔹 Fetch Dumping Site Type & Category Options
const fetchDumpingSiteOptions = async () => {
  try {
    const [typeRes, categoryRes] = await Promise.all([
      apiClient.get("/dumping_sites/options/?option_type=dumping_type"),
      apiClient.get("/dumping_sites/options/?option_type=dumping_category"),
    ]);

    setDumpingSiteOptions({
      type: typeRes.data,      // ✅ no need to map again
      category: categoryRes.data, // ✅ no need to map again
    });

    console.log("Fetched Dumping Site Options", {
      type: typeRes.data,
      category: categoryRes.data,
    });
  } catch (err) {
    console.error("Error fetching Dumping Site Options:", err);
  }
};
console.log("Dumping Sites Data:", data.dumping_sites);
useEffect(() => {
  fetchDumpingSiteOptions();
}, []);
const [materialOptions, setMaterialOptions] = useState({
  type: [],
  category: []
});

const fetchMaterialOptions = async () => {
  try {
    const [typeRes, categoryRes] = await Promise.all([
      apiClient.get("/material-options?type=material_type"),
      apiClient.get("/material-options?type=material_category"),
    ]);

    setMaterialOptions({
  type: typeRes.data.map(opt => ({label: opt.value, value: opt.value})),
  category: categoryRes.data.map(opt => ({label: opt.value, value: opt.value}))
});

  } catch (err) {
    console.error("Error fetching material options:", err);
  }
};
useEffect(() => {
  fetchMaterialOptions();
}, []);

const [vendorOptions, setVendorOptions] = useState({
  type: [],
  category: [],
  material: [],
  unit: [],
});

const fetchVendorOptions = async () => {
  try {
    // Fetch type, category, and unit from vendor_options table
    const types = ["type", "category", "unit"];
    const res = await Promise.all(
      types.map(t => apiClient.get(`/vendor-options/${t}`))
    );

    // Fetch materials from vendor_materials table instead
    const materialsRes = await apiClient.get("/vendor-materials/");
    const materialOptions = materialsRes.data.map(m => ({
      value: m.id,
      label: `${m.material} — ${m.unit}`,
    }));

    // ✅ Merge all data properly
    setVendorOptions({
      type: res[0].data,
      category: res[1].data,
      unit: res[2].data,
      material: materialOptions,
    });
  } catch (err) {
    console.error("Error fetching vendor options:", err);
  }
};
const fetchMaterialsTrucking = async () => {
  try {
    const res = await apiClient.get("/materials-trucking/");
    
    // ✅ FIX: Use 'materials_trucking' as the state key (consistent with your state initialization)
    setData((prev) => ({ 
      ...prev, 
      materials_trucking: res.data 
    }));

  } catch (err) {
    console.error("Error fetching Materials & Trucking:", err);
  }
};
const fetchDumpingSites = async () => {
  try {
    const res = await apiClient.get("/dumping_sites/");
    setData(prev => ({ ...prev, dumping_sites: res.data }));
  } catch (err) {
    console.error("Error fetching Dumping Sites:", err);
  }
};


useEffect(() => {
  fetchVendorOptions();
  fetchMaterialsTrucking();
  fetchDumpingSites();
}, []);

useEffect(() => {
  console.log("Fetched Material Options:", materialOptions);
}, [materialOptions]);


useEffect(() => {
  apiClient.get(`/departments/`)
    .then(res => {
      console.log("Fetched departments:", res.data);
      setDepartments(res.data);
    })
    .catch(err => console.error("Error fetching departments:", err));

  apiClient.get(`/categories/`)
    .then(res => {
      console.log("Fetched categories:", res.data);
      setCategories(res.data);
      // Assuming category numbers are strings
      const categoryNums = res.data
        .filter(cat => cat.number && cat.number.trim() !== "")
        .map(cat => ({ value: cat.number, label: cat.number }));
      console.log("Parsed category numbers:", categoryNums);
      setCategoryNumbers(categoryNums);
    })
    .catch(err => console.error("Error fetching categories:", err));
}, []);

const openSubModal = (type, title) => {
  setSubModal({ shown: true, type, title });
};

const closeSubModal = () => {
  setSubModal({ shown: false, type: null, title: '' });
};

const handleAddSubItem = async (type, formData) => {
  const endpoint = type === 'department' ? 'departments' : 'categories';
  try {
    // --- FIX IS HERE: Added a trailing slash to the URL ---
    const response = await apiClient.post(`/${endpoint}/`, formData);
    
    // Update the state with the new item so it appears in the dropdown
    if (type === 'department') {
      setDepartments(prev => [...prev, response.data]);
    } else if (type === 'category') {
      setCategories(prev => [...prev, response.data]);
    }
    
    showNotification(`${capitalizeFirstLetter(type)} added successfully!`);
    closeSubModal();
  } catch (error) {
    const errorMessage = error.response?.data?.detail || `Error adding ${type}.`;
    showNotification(errorMessage);
    console.error(`Error adding ${type}:`, error);
  }
};
      const [pagination, setPagination] = useState(
    Object.fromEntries(SECTIONS.map((sec) => [sec, 1]))
  );
  const handlePaginate = (section, pageNumber, totalPages) => {
    const clamped = Math.max(1, Math.min(pageNumber, totalPages));
    setPagination(prev => ({ ...prev, [section]: clamped }));
  };
  useEffect(() => {
    setPagination(prev => ({ ...prev, [activeSection]: 1 }));
  }, [activeSection]);
    const showNotification = (message) => setNotification({ shown: true, message });
    const showConfirmation = (message, onConfirmAction) => setConfirmation({ shown: true, message, onConfirm: () => {
        onConfirmAction();
        setConfirmation({ shown: false, message: "", onConfirm: () => {} });
    }});

    const closeMainModal = () => {
        setModal({ shown: false, type: "", title: "", mode: "add", item: null });
        setFormError("");
    };
    
    const API_ENDPOINTS = [
        "users", "employees", "equipment",  "materials-trucking",
        "vendors", "dumping_sites", "job-phases"
    ];
    
    const [sidebarWidth, setSidebarWidth] = useState(220);
    const [isResizing, setIsResizing] = useState(false);
    const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
    const [currentDate, setCurrentDate] = useState("");
  
    useEffect(() => {
        const fetchData = async () => {
    setIsLoading(true);
    setFetchError(null);
    // Initialize newData with the existing data to preserve state
    // in case some of the API calls fail.
    const newData = { ...data };
    let errorOccurred = false;
    for (const endpoint of API_ENDPOINTS) {
        try {
            const response = await apiClient.get(`/${endpoint}`);
let key = endpoint;
if (endpoint === 'job-phases') key = 'job_phases';
if (endpoint === 'materials-trucking') key = 'materials_trucking'; // ✅ Add this mapping
newData[key] = response.data;
        } catch (error) {
            console.error(`Error fetching ${endpoint}:`, error);
            setFetchError(prevError => `${prevError || ''}Failed to load data for ${endpoint}. `);
            errorOccurred = true;
        }
    }

    // Always update the state with the new data, even if some fetches failed.
    setData(newData);
    setIsLoading(false);
};

        fetchData();
    }, []);

useEffect(() => {
  console.log("Linked Category →", { selectedCategoryId, selectedCategoryNumber });
}, [selectedCategoryId, selectedCategoryNumber]);


    useEffect(() => {
        const now = new Date();
        const options = { weekday: "long", year: "numeric", month: "long", day: "numeric" };
        setCurrentDate(now.toLocaleDateString(undefined, options));
    }, []);

    useEffect(() => {
        const handleMouseMove = (e) => {
            if (isResizing) {
                const newWidth = Math.max(60, Math.min(e.clientX, 400));
                setSidebarWidth(newWidth);
            }
        };
        const handleMouseUp = () => { if (isResizing) setIsResizing(false); };
        window.addEventListener("mousemove", handleMouseMove);
        window.addEventListener("mouseup", handleMouseUp);
        return () => {
            window.removeEventListener("mousemove", handleMouseMove);
            window.removeEventListener("mouseup", handleMouseUp);
        };
    }, [isResizing]);

const typeToStateKey = {
  user: "users",
  employee: "employees",
  equipment: "equipment",
  job_phase: "job_phases",   // <-- use underscore, matches your state
  materials_trucking: "materials_trucking",
  vendor: "vendors",
  dumping_sites: "dumping_sites"
  

};

    const onUpdate = (key, newList) => setData(prev => ({ ...prev, [key]: newList }));
const handleSaveJob = async (jobData) => {
    // `jobData` is the payload coming directly from the modal. It's already correct.
    const isEditMode = jobModal.mode === 'edit';
    const url = isEditMode 
        ? `/job-phases/${encodeURIComponent(jobData.job_code)}` 
        : `/job-phases/`;
    const apiCall = isEditMode ? apiClient.put : apiClient.post;

    try {
        // ✅ FIX: Send the `jobData` object directly. No need to modify it.
        const response = await apiCall(url, jobData);
        
        setData(prev => {
            const updatedJobs = [...(prev.job_phases || [])];
            const existingIndex = updatedJobs.findIndex(j => j.job_code === jobData.job_code);
            
            if (existingIndex !== -1) {
                updatedJobs[existingIndex] = response.data;
            } else {
                updatedJobs.push(response.data);
            }
            return { ...prev, job_phases: updatedJobs };
        });
        
        setJobModal({ shown: false, mode: "", job: null });
        showNotification(`Job '${jobData.job_code}' was saved successfully!`);

    } catch (err) {
        const errorMessage = err.response?.data?.detail 
            ? JSON.stringify(err.response.data.detail) 
            : err.message;
        showNotification(`Error saving job: ${errorMessage}`);
    }
};

const handleAddOrUpdateItem = async (type, itemData, mode, existingItem = null) => {
  const stateKey = typeToStateKey[type];
  setFormError('');
  setFieldErrors({});

  const formData = {
    ...itemData,
    material_ids: (itemData.material_ids || []).filter(id => id !== undefined),
  }; // Raw data from form
  let payload;

  try {
    
if (type === "vendor") {
  const baseUrl = `/vendors/`;
  let response;

  try {
    if (mode === "add") {
      // :white_check_mark: ADD: Correctly uses POST to the base URL
      response = await apiClient.post(baseUrl, formData);
      // Update state with the new vendor
      setData(prev => ({
        ...prev,
        vendors: [response.data, ...(prev.vendors || [])],
      }));
      alert("Vendor added successfully");
    } else {
      const detailsUrl = `/vendors/details/${existingItem.id}/`;
      response = await apiClient.patch(detailsUrl, formData);
      setData(prev => ({
        ...prev,
        vendors: (prev.vendors || []).map(v =>
          v.id === existingItem.id ? response.data : v
        ),
      }));
      alert("Vendor updated successfully");
    }
    if (typeof fetchVendorOptions === "function") await fetchVendorOptions();
    closeMainModal();
  } catch (err) {
    const errorMessage = err.response?.data?.detail
      ? JSON.stringify(err.response.data.detail)
      : err.message;
    alert(`Error saving vendor: ${errorMessage}`);
  }
  return;
}

    if (type === "materials_trucking") {
  const baseUrl = "/materials-trucking/";

  try {
  let response;

  if (mode === "add") {
    response = await apiClient.post(baseUrl, formData);
    alert("✅ Material/Trucking added successfully");
    onUpdate("materials_trucking", [
      response.data,
      ...(data["materials_trucking"] || []),
    ]);
  } else {
    response = await apiClient.put(`${baseUrl}${existingItem.id}/`, formData);
    alert("✅ Material/Trucking updated successfully");
    onUpdate(
      "materials_trucking",
      (data["materials_trucking"] || []).map((m) =>
        m.id === existingItem.id ? response.data : m
      )
    );
  }

  if (typeof fetchMaterialOptions === "function") await fetchMaterialOptions();
  closeMainModal();
  return;

} catch (err) {
  console.error("Error while saving Material/Trucking:", err.response?.data || err);
  if (err.response && err.response.status === 400 && err.response.data?.detail) {
    alert(`❌ ${err.response.data.detail}`);
  } else {
    alert("❌ Failed to save Material/Trucking. Please check your input.");
  }
}

}
if (type === "dumping_sites") {
  try {
    let response;
    if (mode === "add") {
      response = await apiClient.post("/dumping_sites/", formData);
      console.log("Response:", response.data); 
      alert("Dumping Site added successfully");
      // onUpdate("dumping_sites", [response.data, ...(data["dumping_sites"] || [])]);
    onUpdate(type, [response.data, ...(data[type] || [])]);
    } else {
      response = await apiClient.put(`/dumping_sites/${existingItem.id}/`, formData);
      console.log("Response:", response.data); 
      alert("Dumping Site updated successfully");
       onUpdate(
        type,
        (data[type] || []).map(d => d.id === existingItem.id ? response.data : d)
      );
    }
    if (typeof fetchDumpingSiteOptions === "function") await fetchDumpingSiteOptions();
    closeMainModal();

  } catch (err) {
    console.error("Error saving dumping site:", err);
    if (err.response && err.response.status === 400 && err.response.data.detail === "ID already exists") {
      alert("❌ Dumping Site ID already exists. Please choose a different ID.");
    } else {
      alert("❌ Failed to save dumping site.");
    }
  }
  return;
}


    if (type === 'equipment') {
      // Validation
      if (!formData.id || formData.id.trim() === '') {
        setFieldErrors({ id: 'Equipment ID is required.' });
        return;
      }
      if (!formData.departmentId) {
        setFieldErrors({ departmentId: 'Department is required.' });
        return;
      }
      if (!formData.categoryid) {
        setFieldErrors({ categorynumber: 'Category Number is required.' });
        return;
      }

      payload = {
        id: formData.id,
        name: formData.name,
        department_id: parseInt(formData.departmentId, 10),
        category_id: parseInt(formData.categoryid, 10),
        vin_number: formData.vinnumber || null,
        status: (formData.status || 'Active').toLowerCase()
      };
    } else if (['user', 'dumpingsite'].includes(type)) {
      // Ensure ID is numeric
      if (formData.id) {
        const numericId = parseInt(formData.id, 10);
        if (isNaN(numericId)) {
          setFieldErrors({ id: 'ID must be a valid number.' });
          return;
        }
        formData.id = numericId;
      }
      payload = { ...formData };
    } else {
      payload = { ...formData }; // Default for other types
    }

    // Normalize status
    if (payload.status) payload.status = payload.status.toLowerCase();

    closeMainModal();
    if (mode === 'add') {
      const newErrors = {};
      if (type === 'equipment' && data.equipment?.some(e => e.id === payload.id)) {
        newErrors.id = 'Equipment ID already exists.';
      } else if (type === 'user' && data.users?.some(u => u.id === payload.id)) {
        newErrors.id = 'User ID already exists.';
      } else if (type === 'employee' && data.employees?.some(emp => emp.id === payload.id)) {
        newErrors.id = 'Employee ID already exists.';
      }

      if (Object.keys(newErrors).length > 0) {
        setFieldErrors(newErrors);
        return;
      }
    }

    let response;
    if (mode === "edit" && existingItem) {
      const itemId = existingItem.id;
      response = await apiClient.put(`/${stateKey}/${encodeURIComponent(itemId)}`, payload);
      onUpdate(stateKey, (data[stateKey] || []).map(it => it.id === itemId ? response.data : it));
    } else {
      response = await apiClient.post(`/${stateKey}/`, payload);
      onUpdate(stateKey, [response.data, ...(data[stateKey] || [])]);
    }

    closeMainModal();

  } catch (error) {

    const errorData = error.response?.data?.detail;
    if (error.response?.status === 422 && errorData) {
      const newErrors = {};
      if (Array.isArray(errorData)) {
        errorData.forEach(err => {
          if (err.loc && err.loc.length > 1) {
            const backendField = err.loc[1];
            const frontendField = {
              'department_id': 'departmentId',
              'category_id': 'categoryid'
            }[backendField] || backendField;
            newErrors[frontendField] = err.msg;
          }
        });
      }
      setFieldErrors(newErrors);
    } else {
      setFormError('An unexpected error occurred.');
    }
    console.error(`Error processing ${type}:`, error);
  }
};

const handleToggleStatus = async (type, item, newStatus) => {
  const stateKey = typeToStateKey[type];
  if (!stateKey) {
    console.error("Could not find a state key for type:", type);
    return;
  }

  const payload = { status: newStatus.toLowerCase() };
  const oldStatus = item.status;
  setData(prev => {
    const currentList = prev[stateKey] || [];
    const updatedList = currentList.map(it =>
      it.id === item.id ? { ...it, status: payload.status } : it
    );
    return { ...prev, [stateKey]: updatedList };
  });

  try {
    let resourcePath = type.toLowerCase().includes('job') ? 'job-phases/by-id' : stateKey;

    if (resourcePath === 'materials_trucking') {
        resourcePath = 'materials-trucking';
    }

    const endpoint = `/${resourcePath}/${encodeURIComponent(item.id)}/`;
    const method = type === "vendor" ? apiClient.patch : apiClient.put; // ✅ PATCH for vendor

    const response = await method(endpoint, payload);

    // Ensure frontend state matches backend response
    setData(prev => {
      const currentList = prev[stateKey] || [];
      const updatedList = currentList.map(it =>
        it.id === item.id ? response.data : it
      );
      return { ...prev, [stateKey]: updatedList };
    });

    // Reset pagination if setting inactive
    if (newStatus.toLowerCase() === 'inactive') {
      setPagination(prev => ({ ...prev, [stateKey]: 1 }));
    }
  } catch (error) {
    // Revert state on error
    setData(prev => {
      const currentList = prev[stateKey] || [];
      const revertedList = currentList.map(it =>
        it.id === item.id ? { ...it, status: oldStatus } : it
      );
      return { ...prev, [stateKey]: revertedList };
    });

    const errorDetail = error.response?.data?.detail;
    const errorMessage = errorDetail ? JSON.stringify(errorDetail) : 'An unexpected error occurred.';
    console.error(`Error updating status for ${type}:`, error);
    alert(`Error updating status: ${errorMessage}`);
  }
};

    const handleDeleteItem = async (type, itemId) => {
        const deleteAction = async () => {
            const urlKey = type === 'job_phase' ? 'job-phases' : typeToStateKey[type];
            const dataKey = type === 'job_phase' ? 'job-phases' : typeToStateKey[type];
            try {
                const url = `/${urlKey}/${encodeURIComponent(itemId)}`;
                await apiClient.delete(url);
                const idKey = type === 'job_phase' ? 'job_code' : 'id';
                onUpdate(dataKey, (data[dataKey] || []).filter(item => item[idKey] !== itemId));
            } catch (error) {
                const errorMessage = error.response?.data ? JSON.stringify(error.response.data) : error.message;
                showNotification(`Error deleting ${type}: ${errorMessage}`);
            }
        };
        const itemLabel = type.replace('_', ' ');
        showConfirmation(`Are you sure you want to delete this ${itemLabel}?`, deleteAction);
    };
    
    const getFormFields = (type) => {
        switch (type) {
            case "user": return [ { name: "id", label: "User ID", required: true },{ name: "username", label: "Username", required: true }, { name: "first_name", label: "First Name", required: true }, { name: "middle_name", label: "Middle Name" }, { name: "last_name", label: "Last Name", required: true }, { name: "email", label: "Email", required: true, type: "email" }, { name: "password", label: "Password", type: "password", required: true },
               { name: 'role', label: 'Role', type: 'select', options: [
            { value: 'FOREMAN', label: 'Foreman' },
            { value: 'SUPERVISOR', label: 'Supervisor' },
            { value: 'PROJECT_ENGINEER', label: 'Project Engineer' },
            { value: 'ACCOUNTANT', label: 'Accountant' },
        ], required: true, defaultValue: 'ADMIN' },

        // --- ADD THIS OBJECT ---
        { name: 'status', label: 'Status', type: 'select', options: [
            { value: 'active', label: 'Active' },
            { value: 'inactive', label: 'Inactive' },
        ], required: true, defaultValue: 'active' }
    ];
            case "employee": return [ { name: "id", label: "Employee ID", required: true }, { name: "first_name", label: "First Name", required: true }, { name: "middle_name", label: "Middle Name" }, { name: "last_name", label: "Last Name", required: true }, { name: "class_1", label: "Class Code 1" }, { name: "class_2", label: "Class Code 2" }, { name: "status", label: "Status", type: "select", options: [ { value: "Active", label: "Active" }, { value: "Inactive", label: "Inactive" } ], required: true, defaultValue: "Active" } ];
    case 'equipment':
      return [
        { name: 'id', label: 'Equipment ID', required: true },
        { name: 'name', label: 'Equipment Name', required: true },
        {
          name: 'departmentId',
          label: 'Department',
          type: 'select',
          required: true,
          options: [
           
            ...departments.map(d => ({ value: d.id, label: d.name }))
          ],
          onAddNew: () => openSubModal('department', 'Add New Department') // <-- ADD THIS
        },
        {  
            name: 'categorynumber',
          label: 'Category Number',
          type: 'select',
          required: true,
          options: [

            ...categories.map(c => ({ value: c.number, label: c.number }))
          ],
          onAddNew: () => openSubModal('category', 'Add New Category') // <-- ADD THIS
        },
        { name: 'category', label: 'Category Name', type: 'text', readOnly: true },
        { name: 'vinnumber', label: 'VIN Number' },
        {
          name: 'status', label: 'Status', type: 'select',
          options: [{ value: 'Active', label: 'Active' }, { value: 'Inactive', label: 'Inactive' }],
          required: true, defaultValue: 'Active'
        }
         ];

    // Case for the sub-modal to add a new department
    case 'department':
      return [
        { name: 'name', label: 'Department Name', required: true }
      ];

    // Case for the sub-modal to add a new category
    case 'category':
      return [
        { name: 'number', label: 'Category Number', required: true },
        { name: 'name', label: 'Category Name', required: true }
      ];
               
case "vendor":
  return [
    { name: "id", label: "Vendor ID", type: "number", required: true },
    { name: "name", label: "Vendor Name", required: true },
    {
      name: "vendor_type",
      label: "Vendor Type",
      type: "custom",
      customType: "type",
    },
    {
      name: "vendor_category",
      label: "Vendor Category",
      type: "custom",
      customType: "category",
    },

{
  name: "materials",
  label: "Materials (with Units)",
  type: "multi_material",
},
    {
      name: "status",
      label: "Status",
      type: "select",
      options: [
        { value: "Active", label: "Active" },
        { value: "Inactive", label: "Inactive" },
      ],
      required: true,
      defaultValue: "Active",
    },
  ];

 case "materials_trucking":
  return [
    { name: "id", label: "Material/Trucking ID", type: "number", required: true },
    { name: "name", label: "Name", required: true },
    {
      name: "material_type",
      label: "Type",
      type: "custom",
      customType: "material_type", // new endpoint
    },
    {
      name: "material_category",
      label: "Category",
      type: "custom",
      customType: "material_category", // new endpoint
    },
    {
      name: "materials",
      label: "Materials (with Units)",
      type: "multi_material",
    },
    {
      name: "status",
      label: "Status",
      type: "select",
      options: [
        { value: "active", label: "Active" },
        { value: "inactive", label: "Inactive" },
      ],
      required: true,
      defaultValue: "active",
    },
  ];
   
    
  case "dumping_sites":
  return [
    { name: "id", label: "Dumping Site ID", type: "text", required: true },
    { name: "name", label: "Name", required: true },
    {
      name: "dumping_type",
      label: "Type",
      type: "custom",
      customType: "dumping_type", // endpoint for dumping type options
    },
    {
      name: "dumping_category",
      label: "Category",
      type: "custom",
      customType: "dumping_category", // endpoint for dumping category options
    },
    {
      name: "materials",
      label: "Materials (with Units)",
      type: "multi_material", // same multi-material selector component
    },
    {
      name: "status",
      label: "Status",
      type: "select",
      options: [
        { value: "active", label: "Active" },
        { value: "inactive", label: "Inactive" },
      ],
      required: true,
      defaultValue: "active",
    },
  ];

            default: return [];
        }
    };



const getEquipmentFormFields = (form, setForm) => {
  return getFormFields("equipment").map((field) => {
    if (field.name === "department_id") {
      return {
        ...field,
        options: [
          { value: "", label: "Select Department" },
          ...departments.map((d) => ({ value: d.id, label: d.name })),
        ],
        value: selectedDepartmentId,
        onChange: (e) => setSelectedDepartmentId(e.target.value),
      };
    }

    if (field.name === "category_number") {
  return {
    ...field,
    type: "select",
    options: [
      { value: "", label: "Select Category Number" },
      ...categories.map((c) => ({ value: c.number, label: c.number })),
    ],
  };
}
 // 🧩 Add SelectWithAdd logic — for example, for "vendor_type"
    if (field.name === "vendor_type") {
      return {
        ...field,
        customRender: () => (
          <SelectWithAdd
            label="Vendor Type"
            type="type"
            options={vendorOptions.type.map(v => ({ value: v, label: v }))}
            value={form.vendor_type}
            onChange={(e) =>
              setForm((prev) => ({ ...prev, vendor_type: e.target.value }))
            }
            reloadOptions={fetchVendorOptions}
          />
        ),
      };
    }
 if (field.name === "vendor_category") {
      return {
        ...field,
        customRender: () => (
          <SelectWithAdd
            label="Vendor Category"
            type="category"
            options={vendorOptions.category.map(v => ({ value: v, label: v }))}
            value={form.vendor_category}
            onChange={(e) =>
              setForm((prev) => ({ ...prev, vendor_category: e.target.value }))
            }
            reloadOptions={fetchVendorOptions}
          />
        ),
      };
    }
if (field.name === "material_type") {
      return {
        ...field,
        customRender: () => (
          <SelectWithAdd
            label="Material Type"
            type="material_type"
            options={materialOptions.type.map((m) => ({
              value: m,
              label: m,
            }))}
            value={form.material_type}
            onChange={(e) =>
              setForm((prev) => ({
                ...prev,
                material_type: e.target.value,
              }))
            }
            reloadOptions={fetchMaterialOptions} // new reload for material
          />
        ),
      };
    }

    // 🧩 Material Category (NEW)
    if (field.name === "material_category") {
      return {
        ...field,
        customRender: () => (
          <SelectWithAdd
            label="Material Category"
            type="material_category"
            options={materialOptions.category.map((m) => ({
              value: m,
              label: m,
            }))}
            value={form.material_category}
            onChange={(e) =>
              setForm((prev) => ({
                ...prev,
                material_category: e.target.value,
              }))
            }
            reloadOptions={fetchMaterialOptions} // new reload for material
          />
        ),
      };
    }
// 🧱 Dumping Type
if (field.name === "dumping_type") {
  return {
    ...field,
    customRender: () => (
      <SelectWithAdd
        label="Dumping Type"
        type="dumping_type"
        options={dumpingSiteOptions.type.map((d) => ({
          value: d,
          label: d,
        }))}
        value={form.dumping_type}
        onChange={(e) =>
          setForm((prev) => ({
            ...prev,
            dumping_type: e.target.value,
          }))
        }
        reloadOptions={fetchDumpingSiteOptions} // separate reload for dumping options
      />
    ),
  };
}

// 🗂️ Dumping Category
if (field.name === "dumping_category") {
  return {
    ...field,
    customRender: () => (
      <SelectWithAdd
        label="Dumping Category"
        type="dumping_category"
        options={dumpingSiteOptions.category.map((d) => ({
          value: d,
          label: d,
        }))}
        value={form.dumping_category}
        onChange={(e) =>
          setForm((prev) => ({
            ...prev,
            dumping_category: e.target.value,
          }))
        }
        reloadOptions={fetchDumpingSiteOptions} // separate reload for dumping options
      />
    ),
  };
}

    return field;
  });
};
const equipmentFields = useMemo(() => getEquipmentFormFields(), [
  departments,
  categories,
  categoryNumbers,
  selectedCategoryId,
  selectedCategoryNumber,
  selectedDepartmentId,
]);
// const equipmentFields = useMemo(() => getEquipmentFormFields(), [departments, categories, categoryNumbers]);


// In AdminDashboard.js

const prepareJobForEditModal = (job) => {
    const fixedPhases = ["Admin", "S&SL", "Vacation"];
    // 'job.phase_codes' is now an array of objects: [{ id: 1, code: 'PC-01', ... }]
    const phaseCodeObjects = job.phase_codes || [];

    // ✅ FIX: Filter the objects by accessing their 'code' property
    const editablePhaseObjects = phaseCodeObjects.filter(
        p_obj => !fixedPhases.includes(p_obj.code)
    );
    
    // ✅ FIX: Map the objects to the structure the modal's state expects: { phase_code: 'string' }
    const phasesForModal = editablePhaseObjects.map(p_obj => ({ phase_code: p_obj.code }));

    // Return the job data, overwriting 'phases' with the correctly prepared array
    return { ...job, phases: phasesForModal };
};


    const formatRole = (role) => {
        if (!role) return "";
        return role
            .split('_') 
            .map(word => 
                word.charAt(0).toUpperCase() + word.slice(1)
            )
            .join(' ');
    };
// ... after the useMemo hook you added ...

const materialLookup = useMemo(() => {
    const lookup = {};
    // vendorOptions.material is an array of { value: id, label: "material — unit" }
    (vendorOptions.material || []).forEach(m => {
        const [material, unit] = m.label.split(' — ').map(s => s.trim());
        lookup[m.value] = { material, unit };
    });
    return lookup;
}, [vendorOptions.material]); 

// ADD THIS CHECK:
console.log("Material Lookup Map:", materialLookup); 


    const renderSection = () => {
// In AdminDashboard.js, replace the entire function

const makeTableWithPagination = (type, title, headers, rowRender, extra = null) => {
    const isExtraObject = extra && typeof extra === "object" && !Array.isArray(extra);
    const itemLabel = isExtraObject ? null:extra;
    const label = itemLabel || type.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase());
    const key = typeToStateKey[type];
    const dataArr = data[key] || [];

    // This correctly creates a list of ONLY active items
    const activeData = dataArr.filter(item => item.status !== 'inactive');

    const currentPage = pagination[key] || 1;
    const itemsPerPage = ITEMSPERPAGE;

    // --- FIX #1: Calculate total pages based on the FILTERED data ---
    const totalPages = Math.ceil(activeData.length / itemsPerPage);

    // --- FIX #2: Slice the FILTERED data to get the current page's items ---
    const pagedData = activeData.slice(
      (currentPage - 1) * itemsPerPage,
      currentPage * itemsPerPage
    );
console.log('Dumping Sites data for rendering: ', pagedData);
console.log('Raw dumping_sites data:', data[key]);

    // This prevents being stuck on an empty page after filtering
    if (pagedData.length === 0 && activeData.length > 0) {
        // If current page is empty but there's still data, go back to page 1
        handlePaginate(key, 1, totalPages);
    }

return (
  <div>
    <DataTableSection
      title={title}
      headers={headers}
      data={pagedData}
      renderRow={(item) => <>{rowRender(item)}</>}
      onAdd={() =>
        isExtraObject && extra.onAdd
          ? extra.onAdd()
          : setModal({
              shown: true,
              type,
              title: `Add ${label}`,
              mode: "add",
              item: null,
            })
      }
      onEdit={(item) =>
        isExtraObject && extra.onEdit
          ? extra.onEdit(item)
          : setModal({
              shown: true,
              type,
              title: `Edit ${label}`,
              mode: "edit",
              item,
            })
      }
      onDelete={(id) =>
        isExtraObject && extra.onDelete
          ? extra.onDelete(id)
          : handleDeleteItem(type, id)
      }
      extraActions={isExtraObject ? extra.extraActions : undefined}
      /** ✅ Un-comment and keep these two props */
      handleToggleStatus={
        isExtraObject && extra.handleToggleStatus
          ? extra.handleToggleStatus
          : handleToggleStatus
      }
      activeSection={
        isExtraObject && extra.activeSection
          ? extra.activeSection
          : type
      }
    />

    <PaginationControls
      currentPage={currentPage}
      totalPages={totalPages}
      onPaginate={(pageNum) =>
        handlePaginate(key, pageNum, totalPages)
      }
    />
  </div>
);
};

        switch (activeSection) {
            case 'dashboard':
            return <TimesheetCounts />;
            case "tickets":
                return <Tickets />;
            case "users": 
                return makeTableWithPagination(
                    "user", 
                    "User Management", 
                    ["ID", "Username", "First Name", "Last Name", "Role","Status"], 
                    u => (
                        <>
                    <td key={u.id}>{u.id}</td>

                            <td key={u.username}>{u.username}</td>
                            <td key={u.first_name}>{u.first_name}</td>
                            <td key={u.last_name}>{u.last_name}</td>
                            <td key={u.role}>{formatRole(u.role)}</td>
                                        <td key={u.status}>{capitalizeFirstLetter(u.status)}</td>

                        </>
                    )
                    
                );
            case "employees": 
                return makeTableWithPagination("employee", "Employee Management", ["ID", "Name", "Class", "Status"], e => {
                    const fullName = `${e.first_name} ${e.middle_name ? e.middle_name + ' ' : ''}${e.last_name}`;
                    return (<> 
                        <td key={e.id}>{e.id}</td> 
                        <td key={fullName}>{fullName}</td> 
                        <td key={e.class_1}>{`${e.class_1 || ""}${e.class_2 ? " / " + e.class_2 : ""}`}</td> 
                        {/* <td key={e.status}>{capitalizeFirstLetter(e.status)}</td> */}
                        <td>
  {(() => {
    const statusMap = {
      active: "Active",
      inactive: "Inactive",
      maintenance: "In Maintenance",
      on_leave: "On Leave",
    };
    return statusMap[e.status?.toLowerCase()] || e.status;
  })()}
</td>

                    </>);
                });
// Inside the renderSection function...
// In AdminDashboard.js, inside renderSection...
case "equipment":
  return makeTableWithPagination(
    "equipment",
    "Equipment Management",
    ["ID", "Name", "Category Name", "Department", "Category No.", "VIN No.", "Status"],
    e => (
      <>
        <td key={e.id}>{e.id}</td>
        <td key={e.name} className="expandable" title={e.name}>{e.name}</td>
        <td>{e.category_rel?.name || "N/A"}</td>
        <td>{e.department_rel?.name || "N/A"}</td>
        <td>{e.category_rel?.number || "N/A"}</td>
        <td key={e.vin_number}>{e.vin_number}</td>
        <td>
          {(() => {
            const statusMap = {
              active: "Active",
              inactive: "Inactive",
              maintenance: "In Maintenance",
              on_leave: "On Leave",
            };
            return statusMap[e.status?.toLowerCase()] || e.status;
          })()}
        </td>
      </>
    )
  );


// Inside the renderSection function (case "vendors"):

case "vendors": return makeTableWithPagination(
    "vendor",
    "Vendors",
    ["ID", "Name", "Type", "Category", "Material", "Unit", "Status"],
    (v) => (
        <>
            <td key={v.id}>{v.id}</td>
            <td key={v.name}>{v.name}</td>
            <td key={v.vendor_type}>{v.vendor_type || "-"}</td>
            <td key={v.vendor_category}>{v.vendor_category || "-"}</td>
            
<td className="material-unit-cell">
  {v.materials && v.materials.length > 1 ? (
    <ul style={{ paddingLeft: "20px", margin: 0 }}>
      {v.materials.map((mat, idx) => (
        <li key={idx}>{mat.material}</li>
      ))}
    </ul>
  ) : v.materials && v.materials.length === 1 ? (
    v.materials[0].material
  ) : (
    "No materials"
  )}
</td>

<td className="material-unit-cell">
  {v.materials && v.materials.length > 1 ? (
    <ul style={{ paddingLeft: "20px", margin: 0 }}>
      {v.materials.map((mat, idx) => (
        <li key={idx}>{mat.unit}</li>
      ))}
    </ul>
  ) : v.materials && v.materials.length === 1 ? (
    v.materials[0].unit
  ) : (
    "No units"
  )}
</td>


            
            <td key={v.status}>{capitalizeFirstLetter(v.status)}</td>
        </>
    ), "Vendors"
);


case "materials_trucking":
  return makeTableWithPagination(
    "materials_trucking",
    "Materials & Trucking",
    ["ID", "Name", "Type", "Category", "Materials", "Unit", "Status"],
    (m) => {
      // Extract materials & units safely
      const materialNames = m.materials?.length
        ? m.materials.map(mat => mat.material || "-").join(", ")
        : "-";

      const units = m.materials?.length
        ? m.materials.map(mat => mat.unit || "-").join(", ")
        : "-";

      return (
        <>
          <td>{m.id}</td>
          <td>{m.name}</td>
          <td>{m.material_type || "-"}</td>
          <td>{m.material_category || "-"}</td>
          <td>{materialNames}</td>
          <td>{units}</td>
          <td>{capitalizeFirstLetter(m.status)}</td>
        </>
      );
    },
   // The table will render correctly without this argument, but since you used it elsewhere:
    "Material/Trucking Item"
  );

case "job-phases": {
  // ✅ Step 1: Filter active and on-hold jobs
  const filteredJobs = (data.job_phases || []).filter((job) => {
    const status = job.status?.toLowerCase();
    return status === "active" || status === "on_hold";
  });

  // ✅ Step 2: Pagination setup (same as other sections)
  const currentPage = pagination["job_phases"] || 1;
  const itemsPerPage = ITEMSPERPAGE;
  const totalPages = Math.ceil(filteredJobs.length / itemsPerPage);
  const paginatedJobs = filteredJobs.slice(
    (currentPage - 1) * itemsPerPage,
    currentPage * itemsPerPage
  );

  // ✅ Step 3: Render the paginated data table
  return (
    <div>
      <DataTableSection
        title="Jobs & Phases Management"
        headers={["Job Code", "Description", "Project Engineer", "Status"]}
        data={paginatedJobs} // ⬅️ now showing paginated data
        renderRow={(job) => (
          <>
            <td>{job.job_code}</td>
            <td>{job.job_description}</td>
            <td>{job.project_engineer}</td>
            <td>
              {(() => {
                const statusMap = {
                  active: "Active",
                  inactive: "Complete", // Won’t appear here because filtered out
                  on_hold: "On Hold",
                };
                return statusMap[job.status?.toLowerCase()] || job.status;
              })()}
            </td>
          </>
        )}
        onAdd={() =>
          setJobModal({ shown: true, mode: "add", job: null })
        }
        onEdit={(job) =>
          setJobModal({
            shown: true,
            mode: "edit",
            job: prepareJobForEditModal(job),
          })
        }
        onDelete={(job_code) =>
          handleDeleteItem("job_phase", job_code)
        }
        extraActions={(job) => (
          <button
            className="btn btn-view btn-sm"
            onClick={() => setViewPhasesJob(job)}
          >
            View Phases
          </button>
        )}
        handleToggleStatus={handleToggleStatus}
        activeSection="job_phase"
      />

      {/* ✅ Step 4: Pagination controls below table */}
      <PaginationControls
        currentPage={currentPage}
        totalPages={totalPages}
        onPaginate={(page) =>
          handlePaginate("job_phases", page, totalPages)
        }
      />
    </div>
  );
}


         case "dumping_sites":
  return makeTableWithPagination(
    "dumping_sites",
    "Dumping Sites",
    ["ID", "Name", "Type", "Category", "Materials", "Unit", "Status"],
    (d) => (
      <>
        <td>{d.id || "-"}</td>
        <td>{d.name || "-"}</td>
        <td>{d.dumping_type || "-"}</td>
        <td>{d.dumping_category || "-"}</td>
        <td>
          {d.materials?.length
            ? d.materials.map(m => m.material).join(", ")
            : "-"}
        </td>
        <td>
          {d.materials?.length
            ? d.materials.map(m => m.unit).join(", ")
            : "-"}
        </td>
        <td>{d.status ? capitalizeFirstLetter(d.status) : "-"}</td>
      </>
    ),
    "Dumping Sites"
  );


            case "crewMapping": 
                const allResources = { 
                            users: (data.users || []).filter(u => u.status === 'active'),
employees: data.employees || [], equipment: data.equipment || [], 
                    materials: data.materials || [], vendors: data.vendors || [], dumping_sites: data.dumping_sites || []
                }; 
                return <CrewMappingManager allResources={allResources} />;
                 case 'auditing':
                return <AuditLogViewer apiClient={apiClient} />;
            default: return <div>Section not implemented.</div>;
        }
    };
const [vendorData, setVendorData] = useState({
  id: "",
  name: "",
  vendor_type: "",
  vendor_category: "",
  status: "ACTIVE",
  materials: [{ material: "", unit: "" }],
});
const handleMaterialChange = (index, field, value) => {
  const newMaterials = [...vendorData.materials];
  newMaterials[index][field] = value;
  setVendorData({ ...vendorData, materials: newMaterials });
};

const addMaterialRow = () => {
  setVendorData({
    ...vendorData,
    materials: [...vendorData.materials, { material: "", unit: "" }],
  });
};

    return (
        <div className="admin-layout">
            {notification.shown && <NotificationModal message={notification.message} onClose={() => setNotification({ shown: false, message: "" })} />}
            {confirmation.shown && <ConfirmationModal message={confirmation.message} onConfirm={confirmation.onConfirm} onCancel={() => setConfirmation({ shown: false, message: "", onConfirm: () => {} })} />}

            {modal.shown && (
  <Modal title={modal.title} onClose={closeMainModal}>
  <GenericForm
    fields={
      
      modal.type === "equipment"
        ? getEquipmentFormFields()  // ✅ Use this for equipment
        : getFormFields(modal.type) // ✅ Use normal form for others
    }
    vendorOptions={vendorOptions}
    fetchVendorOptions={fetchVendorOptions}
    materialOptions={materialOptions}
    fetchMaterialOptions={fetchMaterialOptions}
    dumpingSiteOptions ={dumpingSiteOptions}
    fetchDumpingSiteOptions= {fetchDumpingSiteOptions}
    categories={categories} 
    defaultValues={modal.item || {}}
    onSubmit={(formData) => {
  const finalData = {
    ...formData,
    materials: vendorData.materials,  // ✅ send as list of objects
    dumping_type: formData.dumping_type || formData.type,      // map type → dumping_type
  dumping_category: formData.dumping_category || formData.category,
  };
  handleAddOrUpdateItem(modal.type, finalData, modal.mode, modal.item);
}}

    errorMessage={formError}
  />
  
 

</Modal>

)}
    {subModal.shown && (
      <Modal title={subModal.title} onClose={closeSubModal}>
        <GenericForm
          fields={getFormFields(subModal.type)}
          onSubmit={(formData) => handleAddSubItem(subModal.type, formData)}
        />
      </Modal>
    )}

            {viewPhasesJob && <JobPhasesViewModal job={viewPhasesJob} onClose={() => setViewPhasesJob(null)} />}
            {jobModal.shown && <JobWithPhasesModal mode={jobModal.mode} job={jobModal.job} onSave={handleSaveJob} onClose={() => setJobModal({ shown: false, mode: "", job: null })} showNotification={showNotification} />}
            
            <nav
                className={`admin-sidebar ${sidebarCollapsed ? "collapsed" : ""}`}
                style={{ width: sidebarCollapsed ? 60 : sidebarWidth }}
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
                    {!sidebarCollapsed && <h3 className="sidebar-title">ADMIN PORTAL</h3>}
                    {!sidebarCollapsed && (
                        <>
                            <div className="current-date">{currentDate}</div>
                            <button
                                onClick={onLogout}
                                className="btn btn-outline btn-sm logout-btn"
                            >
                                Logout
                            </button>
                        </>
                    )}
                </div>

                <ul className="sidebar-nav">
                    {[
                        'dashboard',
                        "users",
                        "employees",
                        "tickets",
                        "equipment",
                        "job-phases",
                        "materials_trucking",
                        "vendors",
                        "dumping_sites",
                        "crewMapping",
                        "auditing"
                    ].map((sec) => (
                        <li key={sec}>
                            <button
                                onClick={() => setActiveSection(sec)}
                                className={activeSection === sec ? "active" : ""}
                            >
                                <span className="icon">{getIconForSection(sec)}</span>
                                {!sidebarCollapsed && (
                                    <span className="label">
                                        {sec === "auditing"
                            ? "Audit Log"
                            : sec === "dashboard" // <= ADD THIS CONDITION
        ? "Dashboard"
        : sec === "job-phases"
        ? "Jobs & Phases"
                                            : sec === "crewMapping"
                                            ? "Crew Mapping"
                                            : sec === "vendors"
                                            ? "Vendor"
// ...
: sec === "materials_trucking" ? "Materials & Trucking" 
// ...                                            ? "Materials & Trucking"
                                            : sec === "dumping_sites"
                                            ? "Dumping Sites"
                                            : sec.charAt(0).toUpperCase() + sec.slice(1)}
                                    </span>
                                )}
                            </button>
                        </li>
                    ))}
                </ul>

                {!sidebarCollapsed && (<div className="sidebar-resizer" onMouseDown={() => setIsResizing(true)}/>)}
            </nav>
            
<main
    className="admin-content"
    style={{ marginLeft: sidebarCollapsed ? 60 : sidebarWidth }}
>
    {renderSection()}
</main>

        </div>
    );
};

const getStatusOptions = (type) => {
  switch (type) {
    case "employee":
      return ["active", "on_leave", "inactive"];
    case "equipment":
      return ["active", "maintenance", "inactive"];
    case "job_phase":
      return ["active", "on_hold", "complete"];
    default:
      return ["active", "inactive"];
  }
};

// ✅ FIX: Added handleToggleStatus and activeSection to props
const DataTableSection = ({ title, headers, data = [], renderRow, onDelete, onAdd, onEdit, extraActions, handleToggleStatus, activeSection }) => (
    <div className="data-table-container">
        <div className="section-header"><h2>{title}</h2>{onAdd && <button onClick={onAdd} className="btn btn-primary">Add New</button>}</div>
<table className={`data-table ${title.includes("Equipment") ? "equipment-table" : ""}`}>
            <thead><tr>{headers.map(h => <th key={h}>{h}</th>)}<th>Actions</th></tr></thead>
            <tbody>
                {data.map(item => (
                    <tr key={item.id || item.job_code || item.username}>
                        {renderRow(item)}
                        <td>
    {onEdit && <button onClick={() => onEdit(item)} className="btn-edit btn-sm">Edit</button>}
    {extraActions && extraActions(item)}
    {item.status && handleToggleStatus && (
        <>
            {console.log("Status dropdown type:", activeSection)} 
            <select
value={
  item.status?.toLowerCase() === "inactive" && activeSection === "job_phase"
    ? "complete"
    : item.status?.toLowerCase() || "active"
}

                onChange={(e) => {
  const selected = e.target.value === "complete" ? "inactive" : e.target.value;
  handleToggleStatus(activeSection, item, selected);
}}
                className="btn-sm" 
                style={{
                    // --- MODERN STYLING ENHANCEMENTS ---
                    appearance: 'none',
                    
                    // LIGHT, STANDARD DYNAMIC COLOR LOGIC
                    backgroundColor: 
                        item.status?.toLowerCase() === "inactive"
                            ? "#e2e3e5" // Light Grey for Inactive
                            : item.status?.toLowerCase() === "on_leave" ||
                              item.status?.toLowerCase() === "maintenance"
                            ? "#fff3cd" // Light Yellow for Mid-States
                            : "#d4edda", // Light Green for Active
                    
                    color: 
                        item.status?.toLowerCase() === "inactive"
                            ? "#383d41" 
                            : item.status?.toLowerCase() === "on_leave" ||
                              item.status?.toLowerCase() === "maintenance"
                            ? "#856404"
                            : "#155724", // Contrasting dark text for high readability on light backgrounds

                    // Box & Border (Kept sleek and defined)
                    border: "1px solid #c3c3c3", // Neutral light border
                    borderRadius: "6px", 
                    boxShadow: "0 2px 4px rgba(0, 0, 0, 0.05)", // Very subtle shadow
                    
                    // Spacing and Alignment
                    padding: "6px 6px", 
                    marginRight: "4px",
                    cursor: "pointer",
                    outline: 'none', 
                    transition: 'all 0.2s ease-in-out', 
                    fontSize: '14px', 
                    fontWeight: '500',
                    textAlign: 'center',
                    // minWidth: '150px' 
                }}
            >
                {getStatusOptions(activeSection).map((status) => {
                    const statusKey = status.toLowerCase();
                    const formattedLabel = {
                        active: "Active",
                        inactive: "Inactive",
                        maintenance: "In Maintenance",
                        on_leave: "On Leave",
                        on_hold: "On Hold",
                        complete: "Complete",
                    }[statusKey] || status;

                    // Option styling: pure white background for list readability
                    return (
                        <option 
                            key={status} 
                            value={status}
                            style={{
                                backgroundColor: '#ffffff',
                                color: '#212529',
                                fontSize: '14px', 
                            }}
                        >
                            {formattedLabel}
                        </option>
                    );
                })}
            </select>
        </>
    )}
</td>
                    </tr>
                ))}
            </tbody>
        </table>
    </div>
);

export default AdminDashboard;
