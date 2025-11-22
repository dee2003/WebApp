import React, { useEffect, useState } from "react";
import axios from "axios";
import VendorChipList from "./VendorChipList";
import VendorEditModal from "./VendorEditModal";
import MaterialChipList from "./MaterialChipList";
import MaterialEditModal from "./MaterialEditModal";
import DumpingSiteChipList from "./DumpingSiteChipList";
import DumpingSiteEditModal from "./DumpingSiteEditModal";

import "./timesheet.css";
import "./VendorForm.css";

const API_URL = "http://127.0.0.1:8000/api";


const TimesheetForm = ({ onClose }) => {
    const [foremen, setForemen] = useState([]);
    const [jobCodes, setJobCodes] = useState([]);
    const [selectedForemanId, setSelectedForemanId] = useState("");
    const [foremanData, setForemanData] = useState(null);
    const [selectedJobCode, setSelectedJobCode] = useState("");
    const [jobData, setJobData] = useState(null);
    const [selectedPhases, setSelectedPhases] = useState([]);
    const [supervisors, setSupervisors] = useState([]);
    const [selectedSupervisorId, setSelectedSupervisorId] = useState("");

    // --- Additional fields ---
    const [jobName, setJobName] = useState("");
    const [timeOfDay, setTimeOfDay] = useState("");
    const [weather, setWeather] = useState("");
    const [temperature, setTemperature] = useState("");
    const [locations, setLocations] = useState([]);   // list of all locations
const [location, setLocation] = useState(""); 
    const [projectEngineer, setProjectEngineer] = useState("");
    const [date, setDate] = useState(new Date().toISOString().split("T")[0]);
    const [loading, setLoading] = useState(false);
    const [selectedJobPhaseId, setSelectedJobPhaseId] = useState(null);
    const [unit, setUnit] = useState('C');
    const [contract, setContract] = useState("");
    const timeOfDayOptions = ["Day", "Night"];
    const weatherOptions = ["Sunny", "Cloudy", "Rainy", "Snowy", "Windy"];

    const [workDescription, setWorkDescription] = useState("");
    // Vendors
const [vendorCategories, setVendorCategories] = useState([]);
const [selectedVendorCategories, setSelectedVendorCategories] = useState([]);
const [vendorList, setVendorList] = useState([]);

// Materials & Trucking
const [materialCategories, setMaterialCategories] = useState([]);
const [selectedMaterialCategories, setSelectedMaterialCategories] = useState([]);
const [materialList, setMaterialList] = useState([]);

// Dumping Sites
const [dumpingCategories, setDumpingCategories] = useState([]);
const [selectedDumpingCategories, setSelectedDumpingCategories] = useState([]);
const [dumpingList, setDumpingList] = useState([]);
const [selectedVendors, setSelectedVendors] = useState([]);
const [selectedMaterials, setSelectedMaterials] = useState([]);
const [selectedDumpingSites, setSelectedDumpingSites] = useState([]);

const [selectedVendorMaterials, setSelectedVendorMaterials] = useState({});

const [selectedDumpingMaterials, setSelectedDumpingMaterials] = useState({});
const [selectedMaterialItems, setSelectedMaterialItems] = useState({});
const [editingVendor, setEditingVendor] = useState(null);
const [showVendorModal, setShowVendorModal] = useState(false);
// Store edits separately to persist across category toggles
const [editedVendors, setEditedVendors] = useState({});


// Material & Trucking Modal
const [editingMaterial, setEditingMaterial] = useState(null);
const [showMaterialModal, setShowMaterialModal] = useState(false);
const [editedMaterials, setEditedMaterials] = useState({});

// Dumping Sites Modal
const [editingDumpingSite, setEditingDumpingSite] = useState(null);
const [showDumpingModal, setShowDumpingModal] = useState(false);
const [editedDumpingSites, setEditedDumpingSites] = useState({});

// Modal control

useEffect(() => {
  const fetchSectionCategories = async () => {
    try {
      const res = await axios.get(`${API_URL}/section-categories/`);
      setVendorCategories(res.data.vendors || []);
      setMaterialCategories(res.data.materials || []);
      setDumpingCategories(res.data.dumping_sites || []);
    } catch (err) {
      console.error("Error fetching section categories:", err);
    }
  };
  fetchSectionCategories();
}, []);

// 🏗️ Fetch vendors for selected category
useEffect(() => {
  if (selectedVendorCategories.length > 0) {
    Promise.all(
      selectedVendorCategories.map((cat) =>
        axios.get(`${API_URL}/section-lists/vendors?category=${encodeURIComponent(cat)}`)
      )
    )
      .then((responses) => {
        // Tag each vendor with its category
        const allVendors = responses.flatMap((res, idx) =>
          res.data.map((v) => ({ ...v, category: selectedVendorCategories[idx] }))
        );
        setVendorList(allVendors);
      })
      .catch((err) => console.error("Error fetching vendors:", err));
  } else {
    setVendorList([]);
  }
}, [selectedVendorCategories]);


// 🚚 Fetch materials for selected category
useEffect(() => {
  if (selectedMaterialCategories.length > 0) {
    Promise.all(
      selectedMaterialCategories.map((cat) =>
        axios.get(`${API_URL}/section-lists/materials?category=${encodeURIComponent(cat)}`)
      )
    )
      .then((responses) => {
        // Tag each material with its category
        const allMaterials = responses.flatMap((res, idx) =>
          res.data.map((m) => ({ ...m, category: selectedMaterialCategories[idx] }))
        );
        setMaterialList(allMaterials);
      })
      .catch((err) => console.error("Error fetching materials:", err));
  } else {
    setMaterialList([]);
  }
}, [selectedMaterialCategories]);


// 🗑️ Fetch dumping sites for selected category
useEffect(() => {
  if (selectedDumpingCategories.length > 0) {
    Promise.all(
      selectedDumpingCategories.map((cat) =>
        axios.get(`${API_URL}/section-lists/dumping-sites?category=${encodeURIComponent(cat)}`)
      )
    )
      .then((responses) => {
        // Tag each dumping site with its category
        const allDumpingSites = responses.flatMap((res, idx) =>
          res.data.map((d) => ({ ...d, category: selectedDumpingCategories[idx] }))
        );
        setDumpingList(allDumpingSites);
      })
      .catch((err) => console.error("Error fetching dumping sites:", err));
  } else {
    setDumpingList([]);
  }
}, [selectedDumpingCategories]);



// In TimesheetForm.jsx

// --- Load initial data (Foremen and Job Codes) ---
useEffect(() => {
  // Fetch foremen
  axios.get(`${API_URL}/users/role/foreman`)
    .then(res => {
      setForemen(res.data);
    })
    .catch(err => {
      console.error("Failed to load foremen:", err);
      setForemen([]); // fallback to empty
    });

  // Fetch supervisors
  axios.get(`${API_URL}/users/role/supervisor`)
    .then(res => {
      setSupervisors(res.data);
    })
    .catch(err => {
      console.error("Failed to load supervisors:", err);
      setSupervisors([]); // fallback to empty
    });

  // Fetch job phases
  axios.get(`${API_URL}/job-phases/active`)
    .then(res => {
      setJobCodes(res.data);
    })
    .catch(err => {
      console.error("Failed to load job codes:", err);
      setJobCodes([]);
    });
}, []);



    // --- Load foreman's crew mapping ---
    useEffect(() => {
        if (!selectedForemanId) {
            setForemanData(null);
            return;
        }

        axios.get(`${API_URL}/crew-mapping/`)
            .then((res) => {
                const crewForForeman = res.data.find(
                    (crew) => crew.foreman_id === parseInt(selectedForemanId, 10)
                );

                if (crewForForeman) {
                    setForemanData(crewForForeman);
                } else {
                    console.error(`No crew mapping found for foreman ID ${selectedForemanId}`);
                    setForemanData(null);
                }
            })
            .catch((err) => {
                console.error("Error fetching crew mappings:", err);
                setForemanData(null);
            });
    }, [selectedForemanId]);


    useEffect(() => {
    setLoading(true);
    axios
      .get(`${API_URL}/locations/`)
      .then((res) => setLocations(res.data))
      .catch((err) => console.error("Error fetching locations:", err))
      .finally(() => setLoading(false));
  }, []);
    // --- Load job details ---
    useEffect(() => {
        if (!selectedJobCode) {
            setJobData(null);
            setJobName("");
            setProjectEngineer("");
            setSelectedJobPhaseId(null);
            return;
        }
        axios.get(`${API_URL}/job-phases/${selectedJobCode}`)
            .then((res) => {
                setJobData(res.data);
                setSelectedPhases([]);
                setJobName(res.data.job_description || "");
                setProjectEngineer(res.data.project_engineer || "");
                setContract(res.data.contract_no || "");
                setSelectedJobPhaseId(res.data.id);
            })
            .catch(() => {
                setJobData(null);
                setJobName("");
                setProjectEngineer("");
                setSelectedJobPhaseId(null);
            });
    }, [selectedJobCode]);

    const handlePhaseChange = (phase) => {
        setSelectedPhases((prev) =>
            prev.includes(phase) ? prev.filter((p) => p !== phase) : [...prev, phase]
        );
    };
const handleVendorEdit = (vendor) => {
  setEditingVendor(vendor);
  setShowVendorModal(true);
};

const handleVendorSave = (vendorId, updatedData) => {
  setEditedVendors(prev => ({
    ...prev,
    [vendorId]: updatedData
  }));
  setShowVendorModal(false);
};
const handleMaterialSave = (materialId, updatedData) => {
  setEditedMaterials(prev => ({ ...prev, [materialId]: updatedData }));
  setShowMaterialModal(false);
};

const handleDumpingSave = (siteId, updatedData) => {
  setEditedDumpingSites(prev => ({ ...prev, [siteId]: updatedData }));
  setShowDumpingModal(false);
};

const handleVendorClick = (vendor) => {
  // Only allow editing if vendor is selected
  if (!selectedVendors.includes(vendor.id)) return;

  setEditingVendor({
    ...vendor,
    name: editedVendors[vendor.id]?.name || vendor.name,
    selectedMaterials: editedVendors[vendor.id]?.selectedMaterials || (vendor.materials?.map(m => m.id) || [])
  });
  setShowVendorModal(true);
};
// Get selected vendors with edited names
const getSelectedVendorMaterials = () => {
  const result = {};
  selectedVendors.forEach((vendorId) => {
    const vendor = vendorList.find(v => v.id === vendorId);
    const edited = editedVendors[vendorId] || {};

    // ✅ Only selected materials
    const selectedIds = edited.selectedMaterials || [];

    const selectedMaterials = (vendor?.materials || [])
      .filter(m => selectedIds.includes(m.id))
      .map(m => ({
        id: m.id,
        name:
          edited.materials?.find(em => em.id === m.id)?.name ||
          m.name,
        unit: m.unit
      }));

    result[vendorId] = {
      id: vendor.id,
      name: edited.name || vendor.name,
      category: vendor.category,
      vendor_category: vendor.vendor_category,
      selectedMaterials
    };
  });
  return result;
};


// Get selected materials with edited names
const getSelectedMaterialItems = () => {
  const result = {};
  selectedMaterials.forEach((matId) => {
    const mat = materialList.find(m => m.id === matId);
    const edited = editedMaterials[matId] || {};

    const selectedIds = edited.selectedMaterials || [];

    const selectedMaterials = (mat?.materials || [])
      .filter(m => selectedIds.includes(m.id))
      .map(m => ({
        id: m.id,
        name:
          edited.materials?.find(em => em.id === m.id)?.name ||
          m.name,
        unit: m.unit
      }));

    result[matId] = {
      id: mat.id,
      name: edited.name || mat.name,
      category: mat.category,
      material_category: mat.material_category,
      selectedMaterials
    };
  });
  return result;
};


// Get selected dumping sites with edited names and materials
const getSelectedDumpingMaterials = () => {
  const result = {};
  selectedDumpingSites.forEach((siteId) => {
    const site = dumpingList.find(d => d.id === siteId);
    const edited = editedDumpingSites[siteId] || {};

    const selectedIds = edited.selectedMaterials || [];

    const selectedMaterials = (site?.materials || [])
      .filter(m => selectedIds.includes(m.id))
      .map(m => ({
        id: m.id,
        name:
          edited.materials?.find(em => em.id === m.id)?.name ||
          m.name,
        unit: m.unit
      }));

    result[siteId] = {
      id: site.id,
      name: edited.name || site.name,
      category: site.category,
      dumping_category: site.dumping_category,
      selectedMaterials
    };
  });
  return result;
};


    const handleSubmit = async (e) => {
        e.preventDefault();
        if (!selectedForemanId || !selectedJobCode) {
            alert("Please select both Foreman and Job Code before submitting.");
            return;
        }
        const selectedSupervisor = supervisors.find(
    (sup) => sup.id === parseInt(selectedSupervisorId, 10)
  );
 const selectionData = {
  vendor_categories: selectedVendorCategories,
  selected_vendors: selectedVendors,
  selected_vendor_materials: getSelectedVendorMaterials(),

  material_categories: selectedMaterialCategories,
  selected_materials: selectedMaterials,
  selected_material_items: getSelectedMaterialItems(),

  dumping_categories: selectedDumpingCategories,
  selected_dumping_sites: selectedDumpingSites,
  selected_dumping_materials: getSelectedDumpingMaterials(),
};


        const timesheetData = {
            job_name: jobName,
            job: {
                job_code: selectedJobCode,
                phase_codes: selectedPhases,
            },
            time_of_day: timeOfDay,
            weather,
            temperature: `${temperature}°${unit}`,
            location,
            contract_no: contract,
            project_engineer: projectEngineer,
            supervisor: selectedSupervisor
      ? {
          id: selectedSupervisor.id,
          name: `${selectedSupervisor.first_name} ${selectedSupervisor.last_name}`,
        }
      : null,
            ...foremanData,
            work_description: workDescription,
           ...selectionData,
  };
        const payload = {
            foreman_id: parseInt(selectedForemanId, 10),
            // supervisor_id: selectedSupervisorId ? parseInt(selectedSupervisorId, 10) : null,
            date,
            job_phase_id: selectedJobPhaseId,
            data: timesheetData,
            status: "Pending" ,
            
        };

        console.log("📦 Sending Payload:", payload);
        setLoading(true);

        try {
            await axios.post(`${API_URL}/timesheets/`, payload);
            alert("Timesheet sent successfully!");
            onClose();
        } catch (err) {
            console.error("❌ Error sending timesheet:", err.response?.data);
            alert(`Error: ${JSON.stringify(err.response?.data?.detail || err.message)}`);
        } finally {
            setLoading(false);
        }
    };

    return (
      <div className="vendor-form-page">
        <div className="timesheet-page-container">
            <header className="page-header">
                <h2>Create Timesheet</h2>
                <button onClick={onClose} className="modal-close-btn">&times;</button>
            </header>
            <form onSubmit={handleSubmit} className="form-content">
               <div className="form-group">
                    <label htmlFor="jobCode">Job Code</label>
                    <select id="jobCode" className="form-select" value={selectedJobCode} onChange={(e) => setSelectedJobCode(e.target.value)} disabled={loading} required>
                        <option value="">-- Select Job Code --</option>
                        {jobCodes.map((job) => (<option key={job.job_code} value={job.job_code}>{job.job_code}</option>))}
                    </select>
                    {jobData?.phase_codes?.length > 0 && (
                        <fieldset className="phase-selection-fieldset">
                            <legend>Select Phases:</legend>
                            <div className="phase-list">
                                {jobData.phase_codes.map((phaseObject) => (
                                    <label
                                        key={phaseObject.id}
                                        className={selectedPhases.includes(phaseObject.code) ? "selected-phase" : ""}
                                    >
                                        <input
                                            type="checkbox"
                                            checked={selectedPhases.includes(phaseObject.code)}
                                            onChange={() => handlePhaseChange(phaseObject.code)}
                                            disabled={loading}
                                        />
                                        <span>{phaseObject.code}</span>
                                    </label>
                                ))}
                            </div>
                        </fieldset>
                    )}
                </div>
                {/* Job Name and Date */}
                <div className="grid-2-cols">
                    <div className="form-group">
                        <label htmlFor="jobName">Job Name</label>
                        <input id="jobName" type="text" value={jobName} onChange={(e) => setJobName(e.target.value)} placeholder="Job name is auto-filled" required disabled className="form-input" />
                    </div>
                     <div className="form-group">
                            <label htmlFor="date">Date</label>
                            <input
                                id="date" type="date" value={date}
                                onChange={(e) => setDate(e.target.value)}
                                className="form-input" disabled={loading}
                                max={new Date(Date.now() + 3 * 24 * 60 * 60 * 1000).toISOString().split("T")[0]}
                                min={new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().split("T")[0]} // optional: allow 30 days in past
                                // max={new Date().toISOString().split("T")[0]}
                            />
                        </div>
                </div>

                

                {/* Job Code and Phases */}
               

                {/* ... other form fields are unchanged ... */}
                    <div className="grid-2-cols">
                        <div className="form-group">
  <label htmlFor="contract">Contract</label>
  <input
    id="contract"
    type="text"
    className="form-input"
    value={contract}
    onChange={(e) => setContract(e.target.value)}
    disabled={true} // if it should be read-only
  />
</div>
                                <div className="form-group">
                            <label htmlFor="projectEngineer">Project Engineer</label>
                            <input
                                id="projectEngineer" type="text" className="form-input"
                                value={projectEngineer} onChange={(e) => setProjectEngineer(e.target.value)}
                                disabled={true}
                            />
                        </div>
                        <div className="form-group">
                            <label htmlFor="timeOfDay">Time of Day</label>
                            <select
                                id="timeOfDay" className="form-select" value={timeOfDay}
                                onChange={(e) => setTimeOfDay(e.target.value)} disabled={loading}
                            >
                                <option value="">-- Select Time of Day --</option>
                                {timeOfDayOptions.map((option) => (
                                    <option key={option} value={option}>{option}</option>
                                ))}
                            </select>
                        </div>
                        <div className="form-group">
                            <label htmlFor="weather">Weather</label>
                            <select
                                id="weather" className="form-select" value={weather}
                                onChange={(e) => setWeather(e.target.value)} disabled={loading}
                            >
                                <option value="">-- Select Weather --</option>
                                {weatherOptions.map((option) => (
                                    <option key={option} value={option}>{option}</option>
                                ))}
                            </select>
                        </div>
                        <div className="form-group">
                            <label htmlFor="temperature">
                                Temperature ({unit === 'C' ? '°C' : '°F'})
                            </label>
                            <div className="flex items-center gap-2">
                                <input
                                    id="temperature" type="number" className="form-input flex-1"
                                    value={temperature} onChange={(e) => setTemperature(e.target.value)}
                                    disabled={loading} placeholder={`Enter temperature in ${unit === 'C' ? 'Celsius' : 'Fahrenheit'}`}
                                />
                                <select
                                    value={unit} onChange={(e) => setUnit(e.target.value)}
                                    disabled={loading} className="form-select"
                                >
                                    <option value="C">°C</option>
                                    <option value="F">°F</option>
                                </select>
                            </div>
                        </div>
                        {/* <div className="form-group">
                            <label htmlFor="location">Location</label>
                            <input
                                id="location" type="text" className="form-input"
                                value={location} onChange={(e) => setLocation(e.target.value)}
                                disabled={loading}
                            />
                        </div>
                         */}
                    
                        <div className="form-group">
  <label htmlFor="location">Location</label>
  <select
    id="location"
    className="form-input"
    value={location}
    onChange={(e) => setLocation(e.target.value)}
    disabled={loading}
  >
    <option value="">Select Location</option>
    {locations.map((loc) => (
      <option key={loc.id} value={loc.name}>
        {loc.name}
      </option>
    ))}
  </select>
</div>
</div>
{/* Foreman Selection */}
                <div className="form-group">
                    <label htmlFor="foreman">Foreman</label>
                    <select id="foreman" className="form-select" value={selectedForemanId} onChange={(e) => setSelectedForemanId(e.target.value)} disabled={loading} required>
                        <option value="">-- Select Foreman --</option>
                        {foremen.map((fm) => (<option key={fm.id} value={fm.id}>{fm.first_name} {fm.last_name}</option>))}
                    </select>
                </div>
                
                {/* Crew Info Boxes */}
                {foremanData && (
                    <div className="crew-info-grid">
                        <aside className="crew-info-box box-indigo"><h3>Assigned Employees</h3><p>{foremanData.employees?.map((e) => `${e.first_name} ${e.last_name}`).join(", ") || "N/A"}</p></aside>
                        <aside className="crew-info-box box-indigo"><h3>Assigned Equipment</h3><p>{foremanData.equipment?.map((eq) => eq.name).join(", ") || "N/A"}</p></aside>
                        {/* <aside className="crew-info-box box-green"><h3>Assigned Materials</h3><p>{foremanData.materials?.map((mat) => mat.name).join(", ") || "N/A"}</p></aside>
                        <aside className="crew-info-box box-yellow"><h3>Assigned Work Performed</h3><p>{foremanData.vendors?.map((ven) => ven.name).join(", ") || "N/A"}</p></aside>
                        <aside className="crew-info-box box-red"><h3>Assigned Dumping Sites</h3><p>{foremanData.dumping_sites?.map((site) => site.name).join(", ") || "N/A"}</p></aside> */}
                    </div>
                )}
                <div className="grid-2-cols">
<div className="form-group">
  <label htmlFor="supervisor">Supervisor</label>
  <select
    id="supervisor"
    className="form-select"
    value={selectedSupervisorId}
    onChange={(e) => setSelectedSupervisorId(e.target.value)}
    disabled={loading}
  >
    <option value="">-- Select Supervisor --</option>
    {supervisors.map((sup) => (
      <option key={sup.id} value={sup.id}>
        {sup.first_name} {sup.last_name}
      </option>
    ))}
  </select>
</div>


                        <div className="form-group">
                        <label htmlFor="workDescription">Work description</label>
                        <input
                            type="text"
                            id="workDescription"
                            value={workDescription}
                            onChange={(e) => setWorkDescription(e.target.value)}
                            className="form-input"
                        />
                        </div>

</div>

{/* === Vendor Section === */}
{/* === Vendor Section === */}

<h3>Vendor Details</h3>
<div className="form-group">
  <label>Category</label>
  <div className="checkbox-list">
    {vendorCategories.map((cat) => (
      <label key={cat} className="checkbox-item d-block">
        <input
          type="checkbox"
          value={cat}
          checked={selectedVendorCategories.includes(cat)}
          onChange={(e) => {
            const value = e.target.value;
            if (e.target.checked) {
              setSelectedVendorCategories((prev) => [...prev, value]);
            } else {
              setSelectedVendorCategories((prev) =>
                prev.filter((c) => c !== value)
              );
              // Clear vendors for this category when unchecked
              setVendorList((prev) =>
                prev.filter((v) => v.category !== value)
              );
            }
          }}
        />
        {cat}
      </label>
    ))}
  </div>
</div>

{/* For each selected vendor category, show corresponding vendor selection */}
{selectedVendorCategories.map((cat) => {
  const categoryVendors = vendorList.filter((v) => v.category === cat);

  return (
    <div key={cat} className="form-group mt-3">
     <label className="vendor-subheading">{cat} Vendors</label>


      {categoryVendors.length === 0 ? (
        <p className="text-muted ms-2">No vendors found for {cat}</p>
      ) : (
        <div className="vendor-list">
          {categoryVendors.map((v) => {
            const isSelected = selectedVendors.includes(v.id);
            const displayName = editedVendors[v.id]?.name || v.name;

            return (
              <div key={v.id} className="vendor-item mb-2 d-flex align-items-center">
                {/* Checkbox: open modal immediately on select */}
                <input
                  type="checkbox"
                  checked={isSelected}
                  onChange={(e) => {
                    if (e.target.checked) {
                      // Add vendor to selected
                      setSelectedVendors(prev => [...prev, v.id]);

                      // Open edit modal immediately
                      setEditingVendor({
                        ...v,
                        name: editedVendors[v.id]?.name || v.name,
                        selectedMaterials: editedVendors[v.id]?.selectedMaterials || (v.materials?.map(m => m.id) || [])
                      });
                      setShowVendorModal(true);
                    } else {
                      // Remove vendor if unchecked
                      setSelectedVendors(prev => prev.filter(id => id !== v.id));
                      setEditedVendors(prev => {
                        const updated = { ...prev };
                        delete updated[v.id];
                        return updated;
                      });
                    }
                  }}
                />

                {/* Vendor name: click to view/edit modal without toggling checkbox */}
                <span
                  className="ms-2 vendor-name"
                  style={{ cursor: "pointer" }}
                  onClick={() => {
                    setEditingVendor({
                      ...v,
                      name: editedVendors[v.id]?.name || v.name,
                      selectedMaterials: editedVendors[v.id]?.selectedMaterials || (v.materials?.map(m => m.id) || [])
                    });
                    setShowVendorModal(true);
                  }}
                >
                  {displayName}
                </span>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
})}



<VendorEditModal
  show={showVendorModal}
  onClose={() => setShowVendorModal(false)}
  vendor={editingVendor}
  onSave={handleVendorSave}
/>


{/* === Material & Trucking Section === */}
<h3>Material & Trucking Details</h3>

<div className="form-group">
  <label>Category</label>
  <div className="checkbox-list">
    {materialCategories.map((cat) => (
      <label key={cat} className="checkbox-item d-block">
        
        <input
          type="checkbox"
          value={cat}
          checked={selectedMaterialCategories.includes(cat)}
          onChange={(e) => {
            const value = e.target.value;
            if (e.target.checked) {
              setSelectedMaterialCategories((prev) => [...prev, value]);
            } else {
              setSelectedMaterialCategories((prev) =>
                prev.filter((c) => c !== value)
              );
              setMaterialList((prev) =>
                prev.filter((m) => m.category !== value)
              );
            }
          }}
        />
        {cat}
      </label>
    ))}
  </div>
</div>

{/* For each selected Material category */}

{selectedMaterialCategories.map((cat) => {
  const categoryMaterials = materialList.filter((m) => m.category === cat);

  return (
    <div key={cat} className="form-group mt-3">
      {/* <label><b>{cat} Materials / Trucking</b></label> */}
<label className="vendor-subheading">{cat} List</label>

      {categoryMaterials.length === 0 ? (
        <p className="text-muted ms-2">No materials found for {cat}</p>
      ) : (
        <div className="vendor-list">
          {categoryMaterials.map((m) => {
            const isSelected = selectedMaterials.includes(m.id);
            const displayName = editedMaterials[m.id]?.name || m.name;

            return (
              <div key={m.id} className="vendor-item mb-2 d-flex align-items-center">
                {/* Checkbox: open modal immediately */}
                <input
                  type="checkbox"
                  checked={isSelected}
                  onChange={(e) => {
                    if (e.target.checked) {
                      setSelectedMaterials(prev => [...prev, m.id]);

                      setEditingMaterial({
                        ...m,
                        name: editedMaterials[m.id]?.name || m.name,
                        selectedTrucking: editedMaterials[m.id]?.selectedTrucking || (m.truckingOptions?.map(t => t.id) || [])
                      });
                      setShowMaterialModal(true);
                    } else {
                      setSelectedMaterials(prev => prev.filter(id => id !== m.id));
                      setEditedMaterials(prev => {
                        const updated = { ...prev };
                        delete updated[m.id];
                        return updated;
                      });
                    }
                  }}
                />

                {/* Material name: click to edit modal */}
                <span
                  className="ms-2 vendor-name"
                  style={{ cursor: "pointer" }}
                  onClick={() => {
                    setEditingMaterial({
                      ...m,
                      name: editedMaterials[m.id]?.name || m.name,
                      selectedTrucking: editedMaterials[m.id]?.selectedTrucking || (m.truckingOptions?.map(t => t.id) || [])
                    });
                    setShowMaterialModal(true);
                  }}
                >
                  {displayName}
                </span>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
})}

<MaterialEditModal
  show={showMaterialModal}
  onClose={() => setShowMaterialModal(false)}
  material={editingMaterial}
  onSave={handleMaterialSave}
/>


{/* === Dumping Site Section === */}
<h3>Dump Site Details</h3>

<div className="form-group">
  <label>Site Category</label>
  <div className="checkbox-list">
    {dumpingCategories.map((cat) => (
      <label key={cat} className="checkbox-item d-block">
        <input
          type="checkbox"
          value={cat}
          checked={selectedDumpingCategories.includes(cat)}
          onChange={(e) => {
            const value = e.target.value;
            if (e.target.checked) {
              setSelectedDumpingCategories((prev) => [...prev, value]);
            } else {
              setSelectedDumpingCategories((prev) =>
                prev.filter((c) => c !== value)
              );
              setDumpingList((prev) =>
                prev.filter((d) => d.category !== value)
              );
            }
          }}
        />
        {cat}
      </label>
    ))}
  </div>
</div>

{/* For each selected Dumping category */}

{selectedDumpingCategories.map((cat) => {
  const categoryDumpingSites = dumpingList.filter((d) => d.category === cat);

  return (
    <div key={cat} className="form-group mt-3">
      {/* <label><b>{cat} Dumping Sites</b></label> */}
{/* <label className="vendor-subheading">{cat} Sites</label> */}
<label className="vendor-subheading">
    {cat === "Dump Site" ? "Available Dump Sites" : `${cat} Sites`}
  </label>
      {categoryDumpingSites.length === 0 ? (
        <p className="text-muted ms-2">No dumping sites found for {cat}</p>
      ) : (
        <div className="vendor-list">
          {categoryDumpingSites.map((d) => {
            const isSelected = selectedDumpingSites.includes(d.id);
            const displayName = editedDumpingSites[d.id]?.name || d.name;

            return (
              <div key={d.id} className="vendor-item mb-2 d-flex align-items-center">
                {/* Checkbox: open modal immediately */}
                <input
                  type="checkbox"
                  checked={isSelected}
                  onChange={(e) => {
                    if (e.target.checked) {
                      setSelectedDumpingSites(prev => [...prev, d.id]);

                      setEditingDumpingSite({
                        ...d,
                        name: editedDumpingSites[d.id]?.name || d.name,
                        selectedCategories: editedDumpingSites[d.id]?.selectedCategories || (d.categories?.map(c => c.id) || [])
                      });
                      setShowDumpingModal(true);
                    } else {
                      setSelectedDumpingSites(prev => prev.filter(id => id !== d.id));
                      setEditedDumpingSites(prev => {
                        const updated = { ...prev };
                        delete updated[d.id];
                        return updated;
                      });
                    }
                  }}
                />

                {/* Dumping site name: click to edit modal */}
                <span
                  className="ms-2 vendor-name"
                  style={{ cursor: "pointer" }}
                  onClick={() => {
                    setEditingDumpingSite({
                      ...d,
                      name: editedDumpingSites[d.id]?.name || d.name,
                      selectedCategories: editedDumpingSites[d.id]?.selectedCategories || (d.categories?.map(c => c.id) || [])
                    });
                    setShowDumpingModal(true);
                  }}
                >
                  {displayName}
                </span>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
})}

<DumpingSiteEditModal
  show={showDumpingModal}
  onClose={() => setShowDumpingModal(false)}
  site={editingDumpingSite}
  onSave={handleDumpingSave}
/>

                {/* Submit Actions */}
                <div className="form-actions">
                    <button type="submit" disabled={loading} className={`btn ${loading ? "btn-secondary" : "btn-primary"}`}>
                        {loading ? "Sending..." : "Submit"}
                    </button>
                </div>
            </form>
        </div>
        </div>
    );
};

export default TimesheetForm;
