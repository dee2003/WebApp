// src/components/admin/CrewAssignmentModal.js

import React, { useState } from 'react';
import ForemanList from './ForemanList';
import "./CrewMapping.css";

// ResourceCard Component (No changes needed here, but included for context)
const ResourceCard = ({ title, items, assignedIds, onToggle, itemType, disabledIds = new Set() }) => {
    return (
        <div className="resource-card-section">
            <h4 className="resource-card-title">{title}</h4>
            <ul className="resource-item-list">
                {items
                    .filter(item => !disabledIds.has(item.id))
                    .map(item => (
                        <li
                            key={item.id}
                            className={`toggle-resource-item ${assignedIds.includes(item.id) ? "assigned-resource" : ""}`}
                            onClick={() => onToggle(item.id, itemType)}
                        >
                            {itemType === "employee" ? `${item.first_name} ${item.last_name}` : item.name}
                            <span className="assignment-status-icon">
                                {assignedIds.includes(item.id) ? "✓" : "+"}
                            </span>
                        </li>
                    ))}
            </ul>
        </div>
    );
};

// Main CrewAssignmentModal Component
const CrewAssignmentModal = ({ mode, initialData, onSave, onClose, allCrews, allResources }) => {
    const { users, employees, equipment, materials, vendors, dumping_sites } = allResources;

    // ✅ --- START OF FIX: Filter all incoming resources to only show 'active' items ---
    const activeEmployees = employees.filter(e => e.status === 'active');
    const activeEquipment = equipment.filter(e => e.status === 'active');
    const activeMaterials = materials.filter(m => m.status === 'active');
    const activeVendors = vendors.filter(v => v.status === 'active');
    const activeDumpingSites = dumping_sites.filter(ds => ds.status === 'active');
    // ✅ --- END OF FIX ---

    const [selectedForeman, setSelectedForeman] = useState(initialData?.foreman_id || null);
    
    // In edit mode, we need to show the initially assigned IDs, even if they are now inactive.
    // This uses the full, unfiltered lists to correctly initialize the state.
    const [assignments, setAssignments] = useState({
        employee_ids: initialData?.employees?.map(e => e.id) || [],
        equipment_ids: initialData?.equipment?.map(e => e.id) || [],
        material_ids: initialData?.materials?.map(m => m.id) || [],
        vendor_ids: initialData?.vendors?.map(v => v.id) || [],
        dumping_site_ids: initialData?.dumping_sites?.map(ds => ds.id) || [],
    });
    
    // ... (rest of your state and handlers remain the same)
    const alreadyAssignedEmployeeIds = new Set(
        allCrews
            .filter(crew => crew.id !== initialData?.id)
            .flatMap(crew => crew.employees.map(e => e.id)) // Use the correct property
    );
    const assignedForemanIds = new Set(
        allCrews
            .filter(crew => crew.id !== initialData?.id)
            .map(crew => crew.foreman_id)
    );

    const handleToggleAssignment = (id, type) => {
        const key = `${type}_ids`;
        setAssignments(prev => ({
            ...prev,
            [key]: prev[key].includes(id)
                ? prev[key].filter(currentId => currentId !== id)
                : [...prev[key], id]
        }));
    };

    const handleSave = () => {
        if (!selectedForeman) return alert("Please select a foreman.");
        if (assignments.employee_ids.length === 0) return alert("A crew must have at least one employee.");
        onSave({ foreman_id: selectedForeman, ...assignments });
    };

    const availableForemen = users.filter(u => u.role?.toLowerCase() === "foreman");

    return (
        <div className="modal">
            <div className="modal-content large">
                <div className="modal-header">
                    <h3>{mode === 'edit' ? 'Edit Crew' : 'Create New Crew'}</h3>
                    <button onClick={onClose} className="btn-close">×</button>
                </div>
                <div className="modal-body">
                    <div className="foreman-selection-card">
                        <h3 className="section-title">Select Crew Leader</h3>
                        <ForemanList
                            foremen={availableForemen}
                            selectedForemanId={selectedForeman}
                            onSelect={setSelectedForeman}
                            disabledForemanIds={assignedForemanIds}
                        />
                    </div>
                    {selectedForeman && (
                        <div className="resource-assignment-grid">
                            {/* ✅ CORRECTED: Pass the filtered lists to the ResourceCard components */}
                            <ResourceCard title="Employees" items={activeEmployees} assignedIds={assignments.employee_ids} onToggle={handleToggleAssignment} itemType="employee" disabledIds={alreadyAssignedEmployeeIds} />
                            <ResourceCard title="Equipment" items={activeEquipment} assignedIds={assignments.equipment_ids} onToggle={handleToggleAssignment} itemType="equipment" />
                            {/* <ResourceCard title="Materials" items={activeMaterials} assignedIds={assignments.material_ids} onToggle={handleToggleAssignment} itemType="material" />
                            <ResourceCard title="Work Performed" items={activeVendors} assignedIds={assignments.vendor_ids} onToggle={handleToggleAssignment} itemType="vendor" />
                            <ResourceCard title="Dumping Sites" items={activeDumpingSites} assignedIds={assignments.dumping_site_ids} onToggle={handleToggleAssignment} itemType="dumping_site" /> */}
                        </div>
                    )}
                </div>
                <div className="modal-actions">
                    <button onClick={handleSave} className="btn-save-cta">Save Crew</button>
                </div>
            </div>
        </div>
    );
};

export default CrewAssignmentModal;
