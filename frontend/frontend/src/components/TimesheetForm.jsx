import React, { useEffect, useState } from "react";
import axios from "axios";
import DumpingSiteEditModal from "./DumpingSiteEditModal";
import Select from "react-select";
import "./VendorForm.css";
import { useLocation } from "react-router-dom";

const API_URL = "http://127.0.0.1:8000/api";

const TimesheetForm = ({ onClose, existingTimesheet, isResend }) => {
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
   
    const [locations, setLocations] = useState([]);   // list of all locations
const [ location,setLocation] = useState(""); 
    const [projectEngineer, setProjectEngineer] = useState("");
    const [date, setDate] = useState(new Date().toISOString().split("T")[0]);
    const [loading, setLoading] = useState(false);
    const [selectedJobPhaseId, setSelectedJobPhaseId] = useState(null);
    const [unit, setUnit] = useState('C');
    const [contract, setContract] = useState("");
    const timeOfDayOptions = ["Day", "Night"];

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

const [editingVendor, setEditingVendor] = useState(null);
const [showVendorModal, setShowVendorModal] = useState(false);
// Store edits separately to persist across category toggles
const [editedVendors, setEditedVendors] = useState({});


// Material & Trucking Modal
const [showMaterialModal, setShowMaterialModal] = useState(false);
const [editedMaterials, setEditedMaterials] = useState({});

// Dumping Sites Modal
const [editingDumpingSite, setEditingDumpingSite] = useState(null);
const [showDumpingModal, setShowDumpingModal] = useState(false);
const [editedDumpingSites, setEditedDumpingSites] = useState({});

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
  const fetchTruckingMaterials = async () => {
    try {
      setLoading(true); // Optional: Show loading state
      
      // Fetch Hauler
      const resHauler = await axios.get(`${API_URL}/section-lists/materials?category=Hauler`);
      const haulerMaterials = resHauler.data.map(m => ({ ...m, material_category: "Hauler" }));

      // Fetch Lowboy / Transport
      const resLowboy = await axios.get(`${API_URL}/section-lists/materials?category=Lowboy / Transport`);
      const lowboyMaterials = resLowboy.data.map(m => ({ ...m, material_category: "Lowboy / Transport" }));

      // Merge into materialList, removing old trucking items
      setMaterialList(prev => [
        ...prev.filter(mat => !["Hauler", "Lowboy / Transport"].includes(mat.material_category)),
        ...haulerMaterials,
        ...lowboyMaterials
      ]);

      console.log("✅ Hauler + Lowboy materials set:", [...haulerMaterials, ...lowboyMaterials]);
    } catch (err) {
      console.error("❌ Error fetching trucking materials:", err);
      // Optional: Set fallback empty array or show error message
      setMaterialList(prev => prev.filter(mat => !["Hauler", "Lowboy / Transport"].includes(mat.material_category)));
    } finally {
      setLoading(false); // Optional: Hide loading state
    }
  };

  fetchTruckingMaterials();
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
    // In TimesheetForm.jsx, after all useState declarations
useEffect(() => {
    if (existingTimesheet) {
        console.log("Pre-populating form with CORRECTED logic:", existingTimesheet);

        // 1. SAFELY EXTRACT NESTED DATA
        // All primary form data is nested under the 'data' property
        const formData = existingTimesheet.data || {};

        // --- 2. TOP-LEVEL FIELDS (using snake_case) ---
        
        // Date (Top-level, correct key 'date')
        if (existingTimesheet.date) {
            setDate(existingTimesheet.date.split('T')[0]);
        }

        // Foreman ID (Top-level, correct key 'foreman_id')
        // Convert to String() because <select> values are strings
        setSelectedForemanId(String(existingTimesheet.foreman_id || "")); 

        // --- 3. FIELDS INSIDE THE 'data' OBJECT (using snake_case) ---
        
        // Basic Text Fields (Note the snake_case keys)
        setJobName(formData.job_name || ""); // Correct: job_name
        setTimeOfDay(formData.time_of_day || ""); // Correct: time_of_day
        setLocation(formData.location || "");
        setProjectEngineer(formData.project_engineer || "");
        setContract(formData.contract_no || ""); // Correct: contract_no
        setWorkDescription(formData.workPerformed || ""); 



        // Supervisor ID (Nested inside `data.supervisor`)
        setSelectedSupervisorId(String(formData.supervisor?.id || ""));

        // Job Code and Phases (Nested inside `data.job`)
        setSelectedJobCode(formData.job?.job_code || "");
        setSelectedPhases(formData.job?.phase_codes || []);


        // --- 4. COMPLEX ARRAY STATES (Vendors, Materials, Dumping) ---
        
        // a) Categories (Needed to show the right UI sections)
        setSelectedVendorCategories(formData.vendorcategories || []);
        setSelectedMaterialCategories(formData.materialcategories || []);
        setSelectedDumpingCategories(formData.dumpingcategories || []);

        // b) Selected IDs
        setSelectedVendors(formData.selectedvendors || []);
        setSelectedMaterials(formData.selectedmaterials || []);
        setSelectedDumpingSites(formData.selecteddumpingsites || []);

        // c) Reverse Engineer Edited Details (Vendors/Trucking/Dumping)
        
        const reverseEngineeredEditedVendors = {};
        const vendorMaterialsData = formData.selected_vendor_materials || {};
        const materialItemsData = formData.selected_material_items || {}; // Trucking/Hauler

        // Reverse-engineer normal vendors (for materials and details)
        for (const vendorId in vendorMaterialsData) {
            const vendorItem = vendorMaterialsData[vendorId];
            const selectedMaterials = [];
            const editedDetails = {};

            if (vendorItem.selectedMaterials) {
                vendorItem.selectedMaterials.forEach(material => {
                    selectedMaterials.push(material.id);
                    // Assuming material detail is stored in the 'detail' key
                    if (material.detail) {
                       editedDetails[material.id] = material.detail;
                    }
                });
            }

            reverseEngineeredEditedVendors[vendorId] = {
                name: vendorItem.name,
                selectedMaterials: selectedMaterials,
                editedDetails: editedDetails,
            };
        }
        
        // Reverse-engineer trucking items (for notes)
        for (const itemId in materialItemsData) {
            const item = materialItemsData[itemId];
            // Merging trucking notes into the same editedVendors state
            reverseEngineeredEditedVendors[itemId] = {
                ...(reverseEngineeredEditedVendors[itemId] || {}), // Preserve existing
                name: item.name,
                notes: item.notes || "",
            };
        }
        
        setEditedVendors(reverseEngineeredEditedVendors);
        
        // d) Reverse Engineer Edited Dumping Sites (for names and selected materials)
        const reverseEngineeredEditedDumpingSites = {};
        const dumpingMaterialsData = formData.selecteddumpingmaterials || {};
        
        for (const siteId in dumpingMaterialsData) {
            const siteItem = dumpingMaterialsData[siteId];
            const selectedMaterials = siteItem.selectedMaterials?.map(m => m.id) || [];
            
            reverseEngineeredEditedDumpingSites[siteId] = {
                name: siteItem.name,
                selectedMaterials: selectedMaterials,
            };
        }
        setEditedDumpingSites(reverseEngineeredEditedDumpingSites);
        
    }
}, [existingTimesheet]);

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
const TRUCKING_CATEGORIES = ["Hauler", "Lowboy / Transport"];

// ✅ CORRECTED: getSelectedVendorMaterials - EXCLUDE trucking completely
const getSelectedVendorMaterials = () => {
  const TRUCKING_CATEGORIES = ["Hauler", "Lowboy / Transport"];
  const result = {};

  // 1️⃣ ONLY normal vendors (completely exclude trucking)
  selectedVendors.forEach((vendorId) => {
    const vendor = vendorList.find(v => v.id === vendorId);
    if (!vendor) return;

    // ✅ SKIP trucking vendors entirely from this function
    if (TRUCKING_CATEGORIES.includes(vendor?.vendor_category)) return;

    const editedData = editedVendors[vendorId] || {};
    const selectedIds = editedData.selectedMaterials || [];

    const selectedMaterials = (vendor.materials || [])
      .filter(m => selectedIds.includes(m.id))
      .map(m => ({
        id: m.id,
        unit: m.unit,
        material: m.material,
        detail: editedData.editedDetails?.[m.id] || "",
      }));

    result[vendorId] = {
      id: vendor.id,
      name: editedData.name || vendor.name,
      vendor_category: vendor.vendor_category,
      selectedMaterials,
    };
  });

  return result; // ✅ No trucking vendors here
};

// ✅ Rename function to match the payload key
const getSelectedMaterialItems = () => {  // Keep this name
  const result = {};
  const TRUCKING_CATEGORIES = ["Hauler", "Lowboy / Transport"];

  const truckingVendors = materialList.filter(
    m => TRUCKING_CATEGORIES.includes(m.material_category) && m.id !== undefined
  );

  truckingVendors.forEach(truck => {
    if (!selectedVendors.includes(truck.id)) return;

    const editedData = editedVendors[truck.id] || {};
    
    result[truck.id] = {
      id: truck.id,
      name: editedData.name || truck.name,
      material_category: truck.material_category,
      selectedMaterials: [],
      notes: editedData.notes || "",
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

  // const selectionData = {
  //   vendor_categories: selectedVendorCategories,
  //   selected_vendors: selectedVendors,
  //   selected_vendor_materials: getSelectedVendorMaterials(),

  //   material_categories: selectedMaterialCategories,
  //   selected_materials: selectedMaterials,
  // // selectedmaterialitems: getSelectedMaterialItems(), // ✅ Trucking vendors here

  //   dumping_categories: selectedDumpingCategories,
  //   selected_dumping_sites: selectedDumpingSites,
  //   selected_dumping_materials: getSelectedDumpingMaterials(),
  // };
const selectionData = {
  vendor_categories: selectedVendorCategories,
  selectedvendors: selectedVendors,
  selected_vendor_materials: getSelectedVendorMaterials(),
  materialcategories: selectedMaterialCategories,
  selectedmaterials: selectedMaterials,
  selected_material_items: getSelectedMaterialItems(), // ✅ WITH UNDERSCORE
  dumpingcategories: selectedDumpingCategories,
  selecteddumpingsites: selectedDumpingSites,
  selecteddumpingmaterials: getSelectedDumpingMaterials(),
};

  const timesheetData = {
    job_name: jobName,
    job: {
      job_code: selectedJobCode,
      phase_codes: selectedPhases,
    },
    time_of_day: timeOfDay,
    
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
    workPerformed: workDescription,
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
  <h2>{isResend ? 'Resend Timesheet' : 'Create Timesheet'}</h2>
  <button onClick={onClose} className="modal-close-btn">×</button>
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
                        {/* <div className="form-group">
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
                        </div> */}
                        {/* <div className="form-group">
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
                        </div> */}
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
  // 1️⃣ Get all concrete vendors
  const concreteVendors = vendorList.filter(
    (v) => v.vendor_category === "Concrete"
  );

  // 2️⃣ Map vendors to React Select options
  const concreteOptions = concreteVendors.map((v) => ({
    value: v.id,
    label: v.name,
  }));

  const concreteVendorIds = concreteVendors.map((v) => v.id);

  // 3️⃣ Selected concrete vendors (multiple)
  const selectedConcreteVendorIds = selectedVendors.filter((vId) =>
    concreteVendorIds.includes(vId)
  );

  // 4️⃣ Handle supplier selection (React Select)
  const handleConcreteVendorChange = (selectedOptions) => {
    const selectedIds = selectedOptions.map((o) => o.value);

    setSelectedVendors((prev) => {
      const filtered = prev.filter((id) => !concreteVendorIds.includes(id));
      return [...filtered, ...selectedIds];
    });

    if (!selectedVendorCategories.includes("Concrete")) {
      setSelectedVendorCategories((prev) => [...prev, "Concrete"]);
    }
  };

  // 5️⃣ Toggle material checkbox
  const toggleConcreteMaterial = (vendorId, materialId, isChecked) => {
    setEditedVendors((prev) => {
      const vendorData = prev[vendorId] || {
        selectedMaterials: [],
        editedDetails: {},
      };

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

  // 6️⃣ Update qty/details
  const handleMaterialDetailChange = (vendorId, materialId, value) => {
    setEditedVendors((prev) => {
      const vendorData = prev[vendorId] || {
        selectedMaterials: [],
        editedDetails: {},
      };

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

  // 7️⃣ Helper function to render vendor materials
  const renderVendorMaterials = (vendorId) => {
    const vendor = concreteVendors.find((v) => v.id === vendorId);
    if (!vendor) return null;

    const vendorData = editedVendors[vendorId] || {
      selectedMaterials: [],
      editedDetails: {},
    };

    return (
      <div key={vendorId} className="vendor-block border rounded-3 p-3 bg-light">
        <h5 className="fw-bold">{vendor.name}</h5>

        {vendor.materials?.length > 0 ? (
          vendor.materials.map((m) => {
            const isSelected = vendorData.selectedMaterials.includes(m.id);
            const detailValue = vendorData.editedDetails[m.id] || "";

            return (
              <div key={m.id} className="d-flex align-items-center mb-3">
                <input
                  className="form-check-input me-2"
                  type="checkbox"
                  checked={isSelected}
                  onChange={(e) =>
                    toggleConcreteMaterial(vendorId, m.id, e.target.checked)
                  }
                />
                <label className="form-check-label me-3">
                  {m.material} ({m.unit})
                </label>
                {isSelected && (
                  <input
                    type="text"
                    className="form-control form-control-sm"
                    placeholder={`Enter Quantity (${m.unit})`}
                    value={detailValue}
                    onChange={(e) =>
                      handleMaterialDetailChange(vendorId, m.id, e.target.value)
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
    );
  };

  return (
    <div className="concrete-vendor-block mt-3">
      {/* Supplier Multi-Select */}
      <div className="mb-3">
        <label className="form-label fw-semibold">Concrete Supplier</label>
<Select
  isMulti
  closeMenuOnSelect={false}
  options={concreteOptions}
  value={concreteOptions.filter((o) =>
    selectedConcreteVendorIds.includes(o.value)
  )}
  onChange={handleConcreteVendorChange}
/>

      </div>

      {/* CSS Grid for vendors */}
      <div
        className="vendor-grid mt-1"
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(2, 1fr)",
          gap: "1rem",
        }}
      >
        {selectedConcreteVendorIds.map(renderVendorMaterials)}
      </div>
    </div>
  );
})()}


<h3 className="mt-4">Asphalt Details</h3>
{(() => {
  // 1️⃣ Filter Asphalt vendors
  const asphaltVendors = vendorList.filter(
    (v) => v.vendor_category === "Asphalt Plant"
  );

  // 2️⃣ Map vendors to React Select options
  const asphaltOptions = asphaltVendors.map((v) => ({
    value: v.id,
    label: v.name,
  }));

  const asphaltVendorIds = asphaltVendors.map((v) => v.id);

  // 3️⃣ Selected Asphalt vendors (multiple)
  const selectedAsphaltVendorIds = selectedVendors.filter((vId) =>
    asphaltVendorIds.includes(vId)
  );

  // 4️⃣ Handle vendor selection
  const handleAsphaltVendorChange = (selectedOptions) => {
    const selectedIds = selectedOptions.map((o) => o.value);

    setSelectedVendors((prev) => {
      const filtered = prev.filter((id) => !asphaltVendorIds.includes(id));
      return [...filtered, ...selectedIds];
    });

    if (!selectedVendorCategories.includes("Asphalt")) {
      setSelectedVendorCategories((prev) => [...prev, "Asphalt"]);
    }
  };

  // 5️⃣ Toggle material checkbox
  const toggleAsphaltMaterial = (vendorId, materialId, isChecked) => {
    setEditedVendors((prev) => {
      const vendorData = prev[vendorId] || {
        selectedMaterials: [],
        editedDetails: {},
      };

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

  // 6️⃣ Update quantity/details
  const handleAsphaltDetailChange = (vendorId, materialId, value) => {
    setEditedVendors((prev) => {
      const vendorData = prev[vendorId] || {
        selectedMaterials: [],
        editedDetails: {},
      };

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

  // 7️⃣ Render vendor materials
  const renderAsphaltMaterials = (vendorId) => {
    const vendor = asphaltVendors.find((v) => v.id === vendorId);
    if (!vendor) return null;

    const vendorData = editedVendors[vendorId] || {
      selectedMaterials: [],
      editedDetails: {},
    };

    return (
      <div key={vendorId} className="vendor-block border rounded-3 p-3 bg-light">
        <h5 className="fw-bold">{vendor.name}</h5>

        {vendor.materials?.length > 0 ? (
          vendor.materials.map((m) => {
            const isSelected = vendorData.selectedMaterials.includes(m.id);
            const detailValue = vendorData.editedDetails[m.id] || "";

            return (
              <div key={m.id} className="d-flex align-items-center mb-3">
                <input
                  className="form-check-input me-2"
                  type="checkbox"
                  checked={isSelected}
                  onChange={(e) =>
                    toggleAsphaltMaterial(vendorId, m.id, e.target.checked)
                  }
                />
                <label className="form-check-label me-3">
                  {m.material} ({m.unit})
                </label>
                {isSelected && (
                  <input
                    type="text"
                    className="form-control form-control-sm"
                    placeholder={`Enter Quantity (${m.unit})`}
                    value={detailValue}
                    onChange={(e) =>
                      handleAsphaltDetailChange(vendorId, m.id, e.target.value)
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
    );
  };

  return (
    <div className="asphalt-vendor-block mt-3">
      {/* Supplier Multi-Select */}
      <div className="mb-3">
        <label className="form-label fw-semibold">Asphalt Supplier</label>
<Select
  isMulti
  closeMenuOnSelect={false}
  options={asphaltOptions}
  value={asphaltOptions.filter((o) =>
    selectedAsphaltVendorIds.includes(o.value)
  )}
  onChange={handleAsphaltVendorChange}
/>

      </div>

      {/* CSS Grid for vendors */}
      <div
        className="vendor-grid mt-3"
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(2, 1fr)",
          gap: "1rem",
        }}
      >
        {selectedAsphaltVendorIds.map(renderAsphaltMaterials)}
      </div>
    </div>
  );
})()}

<h3 className="mt-4">Top Soil Details</h3>
{(() => {
  // 1️⃣ Filter Top Soil vendors
  const topSoilVendors = vendorList.filter(
    (v) => v.vendor_category === "Top Soil"
  );

  // 2️⃣ Map to React Select options
  const topSoilOptions = topSoilVendors.map((v) => ({
    value: v.id,
    label: v.name,
  }));

  const topSoilVendorIds = topSoilVendors.map((v) => v.id);

  // 3️⃣ Selected vendors
  const selectedTopSoilVendorIds = selectedVendors.filter((vId) =>
    topSoilVendorIds.includes(vId)
  );

  // 4️⃣ Handle vendor selection
  const handleTopSoilVendorChange = (selectedOptions) => {
    const selectedIds = selectedOptions.map((o) => o.value);

    setSelectedVendors((prev) => {
      const filtered = prev.filter((id) => !topSoilVendorIds.includes(id));
      return [...filtered, ...selectedIds];
    });

    if (!selectedVendorCategories.includes("Top Soil")) {
      setSelectedVendorCategories((prev) => [...prev, "Top Soil"]);
    }
  };

  // 5️⃣ Toggle material checkbox
  const toggleTopSoilMaterial = (vendorId, materialId, isChecked) => {
    setEditedVendors((prev) => {
      const vendorData = prev[vendorId] || { selectedMaterials: [], editedDetails: {} };
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

  // 6️⃣ Handle material quantity/details
  const handleTopSoilDetailChange = (vendorId, materialId, value) => {
    setEditedVendors((prev) => {
      const vendorData = prev[vendorId] || { selectedMaterials: [], editedDetails: {} };
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

  // 7️⃣ Render vendor materials
  const renderTopSoilMaterials = (vendorId) => {
    const vendor = topSoilVendors.find((v) => v.id === vendorId);
    if (!vendor) return null;

    const vendorData = editedVendors[vendorId] || { selectedMaterials: [], editedDetails: {} };

    return (
      <div key={vendorId} className="vendor-block border rounded-3 p-3 bg-light">
        <h5 className="fw-bold">{vendor.name}</h5>

        {vendor.materials?.length > 0 ? (
          vendor.materials.map((m) => {
            const isSelected = vendorData.selectedMaterials.includes(m.id);
            const detailValue = vendorData.editedDetails[m.id] || "";

            return (
              <div key={m.id} className="d-flex align-items-center mb-3">
                <input
                  className="form-check-input me-2"
                  type="checkbox"
                  checked={isSelected}
                  onChange={(e) =>
                    toggleTopSoilMaterial(vendorId, m.id, e.target.checked)
                  }
                />
                <label className="form-check-label me-3">
                  {m.material} ({m.unit})
                </label>
                {isSelected && (
                  <input
                    type="text"
                    className="form-control form-control-sm"
                    placeholder={`Enter Quantity (${m.unit})`}
                    value={detailValue}
                    onChange={(e) =>
                      handleTopSoilDetailChange(vendorId, m.id, e.target.value)
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
    );
  };

  return (
    <div className="topsoil-vendor-block mt-3">
      {/* Multi-select vendors */}
      <div className="mb-3">
        <label className="form-label fw-semibold">Top Soil Supplier</label>
<Select
  isMulti
  closeMenuOnSelect={false}
  options={topSoilOptions}
  value={topSoilOptions.filter((o) =>
    selectedTopSoilVendorIds.includes(o.value)
  )}
  onChange={handleTopSoilVendorChange}
/>

      </div>

      {/* Vendor grid */}
      <div
        className="vendor-grid mt-3"
        style={{ display: "grid", gridTemplateColumns: "repeat(2, 1fr)", gap: "1rem" }}
      >
        {selectedTopSoilVendorIds.map(renderTopSoilMaterials)}
      </div>
    </div>
  );
})()}
<h3 className="mt-4">Trucking Details</h3>
{(() => {
  const TRUCKING_CATEGORIES = ["Hauler", "Lowboy / Transport"];

  // 1️⃣ Filter trucking vendors
  const truckingVendors = materialList.filter(
    (m) => TRUCKING_CATEGORIES.includes(m.material_category) && m.id !== undefined
  );

  const truckingVendorIds = truckingVendors.map((v) => v.id);
  const selectedTruckingVendorIds = selectedVendors.filter((vId) =>
    truckingVendorIds.includes(vId)
  );

  // 2️⃣ Handle vendor selection
  const handleTruckingVendorChange = (selectedOptions) => {
    const selectedIds = selectedOptions.map((o) => o.value);

    setSelectedVendors((prev) => {
      const filtered = prev.filter((id) => !truckingVendorIds.includes(id));
      return [...filtered, ...selectedIds];
    });

    // Auto-add categories
    selectedIds.forEach((id) => {
      const vendor = truckingVendors.find((v) => v.id === id);
      if (vendor && !selectedMaterialCategories.includes(vendor.material_category)) {
        setSelectedMaterialCategories((prev) => [...prev, vendor.material_category]);
      }
    });
  };

  // 3️⃣ Handle notes
  const handleTruckingNotesChange = (vendorId, value) => {
    setEditedVendors((prev) => ({
      ...prev,
      [vendorId]: {
        ...prev[vendorId],
        notes: value,
      },
    }));
  };

  // 4️⃣ Render vendor notes input
  const renderTruckingVendor = (vendorId) => {
    const vendor = truckingVendors.find((v) => v.id === vendorId);
    if (!vendor) return null;
    const vendorData = editedVendors[vendorId] || { notes: "" };

    return (
      <div key={vendorId} className="vendor-block border rounded-3 p-3 bg-light">
        <h5 className="fw-bold">{vendor.name}</h5>
        <input
          type="text"
          className="form-control mt-2"
          placeholder="Enter notes or quantity"
          value={vendorData.notes || ""}
          onChange={(e) => handleTruckingNotesChange(vendorId, e.target.value)}
        />
      </div>
    );
  };

  return (
    <div className="trucking-vendor-block mt-3">
      {/* Multi-select vendors */}
      <div className="mb-3">
        <label className="form-label fw-semibold">Trucking Supplier</label>
<Select
  isMulti
  closeMenuOnSelect={false}
  options={truckingVendors.map((v) => ({ value: v.id, label: v.name }))}
  value={truckingVendors
    .filter((v) => selectedTruckingVendorIds.includes(v.id))
    .map((v) => ({ value: v.id, label: v.name }))}
  onChange={handleTruckingVendorChange}
/>

      </div>

      {/* Vendor notes grid */}
      <div
        className="vendor-grid mt-3"
        style={{ display: "grid", gridTemplateColumns: "repeat(2, 1fr)", gap: "1rem" }}
      >
        {selectedTruckingVendorIds.map(renderTruckingVendor)}
      </div>

      {truckingVendors.length === 0 && (
        <p className="text-muted">No trucking vendors available</p>
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
