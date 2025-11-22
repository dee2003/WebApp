// // CrewMapping.js
// import React, { useState, useEffect } from "react";
// import "./CrewMapping.css"; // The new CSS file
// import ForemanList from './ForemanList'; // The new ForemanList component

// // Helper function to get the display name for any item
// const getItemDisplayName = (item, type) => {
//     if (!item) return "N/A";
//     switch (type) {
//         case "employee":
//             return `${item.first_name} ${item.last_name}`;
//         case "equipment":
//         case "material":
//         case "vendor":
//             return item.name;
//         default:
//             return "Unknown Item";
//     }
// };

// // Renamed to ResourceCard to better reflect its purpose in the new UI
// const ResourceCard = ({ title, items, assignedIds, onToggle, searchQuery, onSearchChange, itemType }) => {
//     const filteredItems = items.filter(item =>
//         getItemDisplayName(item, itemType).toLowerCase().includes(searchQuery.toLowerCase())
//     );

//     return (
//         <div className="resource-card-section">
//             <h4 className="resource-card-title">{title}</h4>
//             <input
//                 type="text"
//                 className="form-control resource-search-input"
//                 placeholder={`Search ${title.toLowerCase()}...`}
//                 value={searchQuery}
//                 onChange={onSearchChange}
//             />
//             <ul className="resource-item-list">
//                 {filteredItems.length > 0 ? (
//                     filteredItems.map(item => {
//                         const isAssigned = assignedIds.includes(item.id);
//                         return (
//                             <li
//                                 key={item.id}
//                                 className={`toggle-resource-item ${isAssigned ? "assigned-resource" : "available-resource"}`}
//                                 onClick={() => onToggle(item.id, itemType)}
//                             >
//                                 {getItemDisplayName(item, itemType)}
//                                 <span className="assignment-status-icon">
//                                     {isAssigned ? "✓" : "+"}
//                                 </span>
//                             </li>
//                         );
//                     })
//                 ) : (
//                     <li className="no-items">No matching {title.toLowerCase()} found.</li>
//                 )}
//             </ul>
//         </div>
//     );
// };

// // Main CrewMapping Component
// const CrewMapping = ({ employees = [], equipment = [], materials = [], vendors = [], foremen = [], onSave }) => {
//     const [selectedForeman, setSelectedForeman] = useState(null); 
    
//     const [assignments, setAssignments] = useState({
//         employee_ids: [],
//         equipment_ids: [],
//         material_ids: [],
//         vendor_ids: [],
//     });

//     const [searchQueries, setSearchQueries] = useState({
//         employee: "",
//         equipment: "",
//         material: "",
//         vendor: "",
//     });

//     // Reset state when foreman changes
//     useEffect(() => {
//         if (selectedForeman !== null) {
//             setAssignments({ employee_ids: [], equipment_ids: [], material_ids: [], vendor_ids: [] });
//             setSearchQueries({ employee: "", equipment: "", material: "", vendor: "" });
//         }
//     }, [selectedForeman]);

//     // A single handler to toggle assignment for any resource type
//     const handleToggleAssignment = (id, type) => {
//         const key = `${type}_ids`;
//         setAssignments(prev => {
//             const currentIds = prev[key];
//             const newIds = currentIds.includes(id)
//                 ? currentIds.filter(currentId => currentId !== id)
//                 : [...currentIds, id];
//             return { ...prev, [key]: newIds };
//         });
//     };
    
//     // A single handler for all search inputs
//     const handleSearchChange = (e, type) => {
//         setSearchQueries(prev => ({ ...prev, [type]: e.target.value }));
//     };

//     const handleSave = () => {
//         if (!selectedForeman) {
//             return alert("Please select a foreman before saving.");
//         }
//         if (assignments.employee_ids.length === 0) {
//             return alert("A crew must have at least one employee.");
//         }
        
//         const payload = {
//             foreman_id: selectedForeman,
//             ...assignments,
//         };
//         onSave(payload);
//         // Optional: Reset after save
//         // setSelectedForeman(null);
//     };

//     return (
//         <div className="clean-slate-container">
//             <h2 className="main-header">Crew Resource Mapping</h2>

//             {/* Foreman Selection is now its own Card-like Section */}
//             <div className="foreman-selection-card">
//                 <h3 className="section-title">Select Crew Leader 🧑‍🔧</h3>
//                 <p className="foreman-help-text">Choose a leader to begin assigning resources to their crew.</p>
//                 <ForemanList
//                     foremen={foremen}
//                     selectedForemanId={selectedForeman}
//                     onSelect={setSelectedForeman}
//                 />
//             </div>

//             {selectedForeman ? (
//                 <>
//                     {/* The new responsive grid for resources */}
//                     <div className="resource-assignment-grid">
//                         <ResourceCard
//                             title="Employees"
//                             items={employees}
//                             assignedIds={assignments.employee_ids}
//                             onToggle={handleToggleAssignment}
//                             searchQuery={searchQueries.employee}
//                             onSearchChange={(e) => handleSearchChange(e, "employee")}
//                             itemType="employee"
//                         />
//                         <ResourceCard
//                             title="Equipment"
//                             items={equipment}
//                             assignedIds={assignments.equipment_ids}
//                             onToggle={handleToggleAssignment}
//                             searchQuery={searchQueries.equipment}
//                             onSearchChange={(e) => handleSearchChange(e, "equipment")}
//                             itemType="equipment"
//                         />
//                         <ResourceCard
//                             title="Materials"
//                             items={materials}
//                             assignedIds={assignments.material_ids}
//                             onToggle={handleToggleAssignment}
//                             searchQuery={searchQueries.material}
//                             onSearchChange={(e) => handleSearchChange(e, "material")}
//                             itemType="material"
//                         />
//                         <ResourceCard
//                             title="Vendors"
//                             items={vendors}
//                             assignedIds={assignments.vendor_ids}
//                             onToggle={handleToggleAssignment}
//                             searchQuery={searchQueries.vendor}
//                             onSearchChange={(e) => handleSearchChange(e, "vendor")}
//                             itemType="vendor"
//                         />
//                     </div>
                    
//                     <button className="btn-save-cta" onClick={handleSave}>
//                         Save Crew Mapping
//                     </button>
//                 </>
//             ) : (
//                 <div className="empty-state-message">
//                     <p>Select a Crew Leader above to start building the crew and assigning resources.</p>
//                 </div>
//             )}
//         </div>
//     );
// };

// export default CrewMapping;