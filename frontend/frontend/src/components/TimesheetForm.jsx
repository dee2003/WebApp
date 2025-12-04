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
// Fetch all vendors from backend
useEffect(() => {
  const fetchVendors = async () => {
    try {
      const res = await axios.get(`${API_URL}/vendors`);
      console.log("Vendors fetched from API:", res.data);
      setVendorList(res.data); // store all vendors
    } catch (err) {
      console.error("Error fetching vendors:", err);
    }
  };

  fetchVendors();
}, []);

// 🚚 Fetch materials for selected category
// Fetch Hauler / Trucking materials on mount
useEffect(() => {
  const fetchHaulerMaterials = async () => {
    try {
      const res = await axios.get(`${API_URL}/section-lists/materials?category=Hauler`);
      console.log("✅ Hauler materials fetched:", res.data);
      // Tag with category if needed
      const materials = res.data.map((m) => ({ ...m, category: "Hauler" }));
      setMaterialList((prev) => {
        // Merge with existing materials for other categories
        const others = prev.filter((mat) => mat.category !== "Hauler");
        return [...others, ...materials];
      });
    } catch (err) {
      console.error("Error fetching Hauler materials:", err);
    }
  };

  fetchHaulerMaterials();
}, []);

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
    const vendor = vendorList.find((v) => v.id === vendorId);
    if (!vendor) return; // skip if vendor not found

    const editedData = editedVendors[vendorId] || {};

    const selectedIds = editedData.selectedMaterials || [];

    const selectedMaterials = (vendor.materials || [])
      .filter((m) => selectedIds.includes(m.id))
      .map((m) => ({
        id: m.id,
        unit: m.unit,
        material: m.material,
        detail: editedData.editedDetails?.[m.id] || ""
      }));

    result[vendorId] = {
      id: vendor.id,
      name: editedData.name || vendor.name,
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
    date,
    job_phase_id: selectedJobPhaseId,
    data: timesheetData,
    status: "Pending",
  };

  console.log("📦 Sending Timesheet Payload:", payload);
  setLoading(true);

  try {
    // 1️⃣ Send timesheet to backend
    const res = await axios.post(`${API_URL}/timesheets/`, payload);
    const createdTimesheet = res.data;

    alert("Timesheet sent successfully!");
const selectedForeman = foremen.find(f => f.id === parseInt(selectedForemanId, 10));
const recipientEmail = selectedForeman?.email;

console.log("Selected Foreman:", selectedForeman);
console.log("Recipient email:", recipientEmail);
    // 2️⃣ Send email notification if valid email exists
// After timesheet creation (around line with "Send email notification"):

if (recipientEmail) {
  const notificationPayload = {
    email: recipientEmail,
    subject: "Timesheet Created Successfully",
    message: `Hello, your timesheet ID ${createdTimesheet.id} has been successfully created.`
  };

  try {
    await axios.post(`${API_URL}/timesheets/send-notification`, notificationPayload);
    console.log("Notification sent successfully");
  } catch (notifErr) {
    console.error("Failed to send notification", notifErr.response?.data || notifErr.message);
  }
} else {
  console.warn("No foreman email available for notification");
}
    onClose();
  } catch (err) {
    console.error("❌ Error sending timesheet:", err.response?.data || err.message);
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
                    {/* {jobData?.phase_codes?.length > 0 && (
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
                    )} */}
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
<h3 className="mt-4">Concrete Details</h3>
{(() => {
  // Filter only Concrete vendors
  const concreteVendors = vendorList.filter(
    (v) => v.vendor_category === "Concrete"
  );

  const concreteVendorIds = concreteVendors.map((v) => v.id);

  const selectedConcreteVendorId = selectedVendors.find((vId) =>
    concreteVendorIds.includes(vId)
  );

  const selectedVendor = concreteVendors.find(
    (v) => v.id === selectedConcreteVendorId
  );

  // ---------------- Handlers ---------------- //

  const handleConcreteVendorChange = (e) => {
    const newVendorId = parseInt(e.target.value, 10);

    setSelectedVendors((prev) => {
      const filtered = prev.filter((id) => !concreteVendorIds.includes(id));
      return newVendorId ? [...filtered, newVendorId] : filtered;
    });

    if (selectedConcreteVendorId) {
      setEditedVendors((prev) => {
        const updated = { ...prev };
        delete updated[selectedConcreteVendorId];
        return updated;
      });
    }

    if (newVendorId && !selectedVendorCategories.includes("Concrete")) {
      setSelectedVendorCategories((prev) => [...prev, "Concrete"]);
    } else if (!newVendorId) {
      setSelectedVendorCategories((prev) =>
        prev.filter((c) => c !== "Concrete")
      );
    }
  };

  // Checkbox toggle
  const toggleConcreteMaterial = (materialId, isChecked) => {
    const vendorId = selectedConcreteVendorId;
    if (!vendorId) return;

    setEditedVendors((prev) => {
      const vendorData = prev[vendorId] || {
        selectedMaterials: [],
        editedDetails: {}
      };

      const updatedSelectedMaterials = isChecked
        ? [...vendorData.selectedMaterials, materialId]
        : vendorData.selectedMaterials.filter((id) => id !== materialId);

      return {
        ...prev,
        [vendorId]: {
          ...vendorData,
          selectedMaterials: updatedSelectedMaterials
        }
      };
    });
  };

  // Handle text input for material quantity/details
  const handleMaterialDetailChange = (materialId, value) => {
    const vendorId = selectedConcreteVendorId;
    if (!vendorId) return;

    setEditedVendors((prev) => {
      const vendorData = prev[vendorId] || {
        selectedMaterials: [],
        editedDetails: {}
      };

      return {
        ...prev,
        [vendorId]: {
          ...vendorData,
          editedDetails: {
            ...vendorData.editedDetails,
            [materialId]: value
          }
        }
      };
    });
  };

  const vendorData = editedVendors[selectedConcreteVendorId] || {
    selectedMaterials: [],
    editedDetails: {}
  };

  return (
    <div className="concrete-vendor-block mt-3">
      {/* Concrete Supplier Dropdown */}
      <div className="mb-3">
        <label htmlFor="concrete-vendor-select" className="form-label fw-semibold">
          Concrete Supplier
        </label>
        <select
          id="concrete-vendor-select"
          className="form-select"
          value={selectedConcreteVendorId || ""}
          onChange={handleConcreteVendorChange}
        >
          <option value="">-- Select Concrete Supplier --</option>
          {concreteVendors.map((v) => (
            <option key={v.id} value={v.id}>
              {v.name}
            </option>
          ))}
        </select>
      </div>

      {/* Material Selection */}
      {selectedVendor && (
        <div className="mt-2">
          <label className="form-label fw-semibold">Concrete Ordered Material</label>

          <div className="border rounded-3 p-3 bg-light">
            {selectedVendor.materials?.length > 0 ? (
              selectedVendor.materials.map((m) => {
                const isSelected = vendorData.selectedMaterials.includes(m.id);
                const detailValue = vendorData.editedDetails[m.id] || "";

                return (
                  <div key={m.id} className="d-flex align-items-center mb-3">

                    {/* Checkbox */}
                    <input
                      className="form-check-input me-2"
                      type="checkbox"
                      checked={isSelected}
                      onChange={(e) =>
                        toggleConcreteMaterial(m.id, e.target.checked)
                      }
                    />

                    {/* Material Name */}
                    <label className="form-check-label me-3">
                      {m.material} ({m.unit})
                    </label>

                    {/* Textbox for qty/details */}
                    {isSelected && (
                      <input
                        type="text"
                        className="form-control form-control-sm"
                        placeholder={`Enter Quantity (${m.unit})`}
                        value={detailValue}
                        onChange={(e) =>
                          handleMaterialDetailChange(m.id, e.target.value)
                        }
                      />
                    )}
                  </div>
                );
              })
            ) : (
              <p className="text-muted mb-0">No materials found for this supplier.</p>
            )}
          </div>
        </div>
      )}
    </div>
  );
})()}


<h3 className="mt-4">Asphalt Details</h3>
{(() => {
  // 1. Filter Asphalt vendors
  const asphaltVendors = vendorList.filter(
    (v) => v.vendor_category === "Asphalt Plant"
  );

  // 2. Vendor IDs under Asphalt
  const asphaltVendorIds = asphaltVendors.map((v) => v.id);

  // 3. Selected vendor for Asphalt
  const selectedAsphaltVendorId = selectedVendors.find((vId) =>
    asphaltVendorIds.includes(vId)
  );

  // 4. Vendor object
  const selectedAsphaltVendor = asphaltVendors.find(
    (v) => v.id === selectedAsphaltVendorId
  );

  // ---------- Handlers ---------- //

  // Select asphalt vendor
  const handleAsphaltVendorChange = (e) => {
    const newVendorId = parseInt(e.target.value, 10);

    // Update selected vendors
    setSelectedVendors((prev) => {
      const filtered = prev.filter((vId) => !asphaltVendorIds.includes(vId));
      return newVendorId ? [...filtered, newVendorId] : filtered;
    });

    // Reset old vendor data
    if (selectedAsphaltVendorId) {
      setEditedVendors((prev) => {
        const updated = { ...prev };
        delete updated[selectedAsphaltVendorId];
        return updated;
      });
    }

    // Maintain vendor category list
    if (newVendorId && !selectedVendorCategories.includes("Asphalt")) {
      setSelectedVendorCategories((prev) => [...prev, "Asphalt"]);
    } else if (!newVendorId && selectedVendorCategories.includes("Asphalt")) {
      setSelectedVendorCategories((prev) =>
        prev.filter((c) => c !== "Asphalt")
      );
    }
  };

  // Select/deselect asphalt material
  const toggleAsphaltMaterial = (materialId, isChecked) => {
    const vendorId = selectedAsphaltVendorId;
    if (!vendorId) return;

    setEditedVendors((prev) => {
      const vendorData =
        prev[vendorId] || { selectedMaterials: [], editedDetails: {} };

      const updatedSelectedMaterials = isChecked
        ? [...vendorData.selectedMaterials, materialId]
        : vendorData.selectedMaterials.filter((id) => id !== materialId);

      return {
        ...prev,
        [vendorId]: {
          ...vendorData,
          selectedMaterials: updatedSelectedMaterials,
        },
      };
    });
  };

  // Handle detail change
  const handleAsphaltDetailChange = (materialId, value) => {
    const vendorId = selectedAsphaltVendorId;
    if (!vendorId) return;

    setEditedVendors((prev) => {
      const vendorData =
        prev[vendorId] || { selectedMaterials: [], editedDetails: {} };

      return {
        ...prev,
        [vendorId]: {
          ...vendorData,
          editedDetails: {
            ...vendorData.editedDetails,
            [materialId]: value,
          },
        },
      };
    });
  };

  // Selected materials & details
  const currentAsphaltSelectedMaterials =
    editedVendors[selectedAsphaltVendorId]?.selectedMaterials || [];

  const currentAsphaltEditedDetails =
    editedVendors[selectedAsphaltVendorId]?.editedDetails || {};

  return (
    <div className="asphalt-vendor-block mt-3">
      {/* Asphalt Supplier Dropdown */}
      <div className="mb-3">
        <label className="form-label fw-semibold">Asphalt Supplier</label>
        <select
          className="form-select"
          value={selectedAsphaltVendorId || ""}
          onChange={handleAsphaltVendorChange}
        >
          <option value="">-- Select Asphalt Supplier --</option>
          {asphaltVendors.map((v) => (
            <option key={v.id} value={v.id}>
              {editedVendors[v.id]?.name || v.name}
            </option>
          ))}
        </select>
      </div>

      {/* Asphalt Materials */}
      {selectedAsphaltVendor && (
        <div className="mt-2">
          <label className="form-label fw-semibold">
            Asphalt Ordered Material
          </label>

          <div className="border rounded-3 p-3 bg-light">
            {selectedAsphaltVendor.materials?.length > 0 ? (
              selectedAsphaltVendor.materials.map((m) => {
                const isSelected =
                  currentAsphaltSelectedMaterials.includes(m.id);
                const detailValue = currentAsphaltEditedDetails[m.id] || "";
return (
  <div
    key={m.id}
    className="d-flex align-items-center mb-3"
  >
    <div className="form-check d-flex align-items-center mb-0 me-3">
      <input
        className="form-check-input me-2"
        type="checkbox"
        id={`asphalt-${m.id}`}
        checked={isSelected}
        onChange={(e) =>
          toggleAsphaltMaterial(m.id, e.target.checked)
        }
      />
      <label
        className="form-check-label mb-0"
        htmlFor={`asphalt-${m.id}`}
      >
        {m.material} ({m.unit})
      </label>
    </div>

    {isSelected && (
      <input
        type="text"
        className="form-control form-control-sm"
        placeholder={`Enter Quantity (${m.unit})`}
        value={detailValue}
        onChange={(e) =>
          handleAsphaltDetailChange(m.id, e.target.value)
        }
      />
    )}
  </div>
);

              })
            ) : (
              <p className="text-muted">No asphalt materials available.</p>
            )}
          </div>
        </div>
      )}
    </div>
  );
})()}

<h3 className="mt-4">Top Soil Details</h3>
{(() => {
  // 1. Filter Top Soil vendors
  const topSoilVendors = vendorList.filter(
    (v) => v.vendor_category === "Top Soil"
  );

  // 2. Vendor IDs under Top Soil
  const topSoilVendorIds = topSoilVendors.map((v) => v.id);

  // 3. Selected vendor for Top Soil
  const selectedTopSoilVendorId = selectedVendors.find((vId) =>
    topSoilVendorIds.includes(vId)
  );

  // 4. Vendor object
  const selectedTopSoilVendor = topSoilVendors.find(
    (v) => v.id === selectedTopSoilVendorId
  );

  // ---------- Handlers ---------- //

  // Select Top Soil vendor
  const handleTopSoilVendorChange = (e) => {
    const newVendorId = parseInt(e.target.value, 10);

    // Update selected vendors
    setSelectedVendors((prev) => {
      const filtered = prev.filter((vId) => !topSoilVendorIds.includes(vId));
      return newVendorId ? [...filtered, newVendorId] : filtered;
    });

    // Reset old vendor data
    if (selectedTopSoilVendorId) {
      setEditedVendors((prev) => {
        const updated = { ...prev };
        delete updated[selectedTopSoilVendorId];
        return updated;
      });
    }

    // Maintain vendor category list
    if (newVendorId && !selectedVendorCategories.includes("Top Soil")) {
      setSelectedVendorCategories((prev) => [...prev, "Top Soil"]);
    } else if (!newVendorId && selectedVendorCategories.includes("Top Soil")) {
      setSelectedVendorCategories((prev) =>
        prev.filter((c) => c !== "Top Soil")
      );
    }
  };

  // Select/deselect Top Soil material
  const toggleTopSoilMaterial = (materialId, isChecked) => {
    const vendorId = selectedTopSoilVendorId;
    if (!vendorId) return;

    setEditedVendors((prev) => {
      const vendorData =
        prev[vendorId] || { selectedMaterials: [], editedDetails: {} };

      const updatedSelectedMaterials = isChecked
        ? [...vendorData.selectedMaterials, materialId]
        : vendorData.selectedMaterials.filter((id) => id !== materialId);

      return {
        ...prev,
        [vendorId]: {
          ...vendorData,
          selectedMaterials: updatedSelectedMaterials,
        },
      };
    });
  };

  // Handle detail change
  const handleTopSoilDetailChange = (materialId, value) => {
    const vendorId = selectedTopSoilVendorId;
    if (!vendorId) return;

    setEditedVendors((prev) => {
      const vendorData =
        prev[vendorId] || { selectedMaterials: [], editedDetails: {} };

      return {
        ...prev,
        [vendorId]: {
          ...vendorData,
          editedDetails: {
            ...vendorData.editedDetails,
            [materialId]: value,
          },
        },
      };
    });
  };

  // Selected materials & details
  const currentTopSoilSelectedMaterials =
    editedVendors[selectedTopSoilVendorId]?.selectedMaterials || [];

  const currentTopSoilEditedDetails =
    editedVendors[selectedTopSoilVendorId]?.editedDetails || {};

  return (
    <div className="topsoil-vendor-block mt-3">
      {/* Top Soil Supplier Dropdown */}
      <div className="mb-3">
        <label className="form-label fw-semibold">Top Soil Supplier</label>
        <select
          className="form-select"
          value={selectedTopSoilVendorId || ""}
          onChange={handleTopSoilVendorChange}
        >
          <option value="">-- Select Top Soil Supplier --</option>
          {topSoilVendors.map((v) => (
            <option key={v.id} value={v.id}>
              {editedVendors[v.id]?.name || v.name}
            </option>
          ))}
        </select>
      </div>

      {/* Top Soil Materials */}
      {selectedTopSoilVendor && (
        <div className="mt-2">
          <label className="form-label fw-semibold">Top Soil Ordered Material</label>

          <div className="border rounded-3 p-3 bg-light">
            {selectedTopSoilVendor.materials?.length > 0 ? (
              selectedTopSoilVendor.materials.map((m) => {
                const isSelected = currentTopSoilSelectedMaterials.includes(m.id);
                const detailValue = currentTopSoilEditedDetails[m.id] || "";

return (
  <div key={m.id} className="d-flex align-items-center mb-2">
    {/* Checkbox + label inline */}
    <div className="form-check d-flex align-items-center mb-0 me-3">
      <input
        className="form-check-input me-2"
        type="checkbox"
        id={`topsoil-${m.id}`}
        checked={isSelected}
        onChange={(e) =>
          toggleTopSoilMaterial(m.id, e.target.checked)
        }
      />

      <label
        className="form-check-label mb-0"
        htmlFor={`topsoil-${m.id}`}
      >
        {m.material} ({m.unit})
      </label>
    </div>

    {/* Quantity input on same row */}
    {isSelected && (
      <input
        type="text"
        className="form-control form-control-sm"
        placeholder={`Enter Quantity (${m.unit})`}
        value={detailValue}
        onChange={(e) =>
          handleTopSoilDetailChange(m.id, e.target.value)
        }
      />
    )}
  </div>
);

              })
            ) : (
              <p className="text-muted">No top soil materials available.</p>
            )}
          </div>
        </div>
      )}
    </div>
  );
})()}

<h3 className="mt-4">Trucking Details</h3>
{(() => {
  // 1️⃣ Hauler vendors from materialList
const haulerVendors = materialList
  .filter(m => m.material_category === "Hauler" && m.id !== undefined);
const haulerVendorIds = haulerVendors.map(v => v.id);


const selectedHaulerVendorId = selectedVendors?.find(vId =>
  haulerVendorIds.includes(vId)
);
const selectedHaulerVendor = haulerVendors.find(v => v.id === selectedHaulerVendorId);

  const vendorData = editedVendors[selectedHaulerVendorId] || { notes: "" };

  // ---------- Handlers ---------- //

  const handleHaulerVendorChange = e => {
    const newVendorId = parseInt(e.target.value, 10);

    setSelectedVendors(prev => {
      const filtered = prev.filter(vId => !haulerVendorIds.includes(vId));
      return newVendorId ? [...filtered, newVendorId] : filtered;
    });

    if (selectedHaulerVendorId) {
      setEditedVendors(prev => {
        const updated = { ...prev };
        delete updated[selectedHaulerVendorId];
        return updated;
      });
    }

    if (newVendorId && !selectedVendorCategories.includes("Hauler")) {
      setSelectedVendorCategories(prev => [...prev, "Hauler"]);
    } else if (!newVendorId && selectedVendorCategories.includes("Hauler")) {
      setSelectedVendorCategories(prev => prev.filter(c => c !== "Hauler"));
    }
  };

  const handleHaulerNotesChange = e => {
    if (!selectedHaulerVendorId) return;

    const value = e.target.value;
    setEditedVendors(prev => ({
      ...prev,
      [selectedHaulerVendorId]: {
        ...prev[selectedHaulerVendorId],
        notes: value,
      },
    }));
  };

  return (
    <div className="hauler-vendor-block mt-3">
      {/* Vendor Dropdown */}
      <div className="mb-3">
        <label className="form-label fw-semibold">Trucking Supplier</label>
        <select
          className="form-select"
          value={selectedHaulerVendorId || ""}
          onChange={handleHaulerVendorChange}
        >
          <option value="">-- Select Trucking Supplier --</option>
          {haulerVendors.map(v => (
            <option key={v.id} value={v.id}>
              {v.name}
            </option>
          ))}
        </select>
      </div>

      {/* Notes / Quantity Textbox */}
      {selectedHaulerVendor && (
        <div className="mb-3">
          <label className="form-label fw-semibold">Notes / Quantity</label>
          <input
            type="text"
            className="form-control"
            placeholder="Enter notes or quantity for this supplier"
            value={vendorData.notes || ""}
            onChange={handleHaulerNotesChange}
          />
        </div>
      )}
    </div>
  );
})()}


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
