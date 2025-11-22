import React, { useState, useEffect } from "react";
import "./vendorModal.css";

const DumpingSiteEditModal = ({ show, onClose, site, onSave }) => {
  const [siteName, setSiteName] = useState(site?.name || "");
  const [subMaterials, setSubMaterials] = useState([]); // Materials / Hauler / Truck list with selection

  useEffect(() => {
    setSiteName(site?.name || "");
    setSubMaterials(
      site?.materials?.map((mat) => ({
        ...mat,
        selected: site.selectedMaterials?.some((sm) => sm.id === mat.id) || false
      })) || []
    );
  }, [site?.id]); // depend on site ID to avoid overwriting edits on reopen

  const toggleMaterial = (id) => {
    setSubMaterials((prev) =>
      prev.map((mat) => (mat.id === id ? { ...mat, selected: !mat.selected } : mat))
    );
  };

  const updateMaterialName = (id, newName) => {
    setSubMaterials((prev) =>
      prev.map((mat) => (mat.id === id ? { ...mat, name: newName } : mat))
    );
  };

  const handleSave = () => {
    const selectedMaterials = subMaterials
      .filter((mat) => mat.selected)
      .map((mat) => mat.id);

    const updatedMaterials = subMaterials.map((mat) => ({
      id: mat.id,
      name: mat.name
    }));

    onSave(site.id, { name: siteName, selectedMaterials, materials: updatedMaterials });
  };

  if (!show) return null;

  return (
    <div className="modal-overlay">
      <div className="modal-container small-modal">
        <h5>Edit Dumping Site</h5>

        <label>Site Name:</label>
        <input
          type="text"
          value={siteName}
          onChange={(e) => setSiteName(e.target.value)}
          className="form-control mb-2"
        />

        <label>Materials / Hauler / Truck:</label>
        {subMaterials.map((mat) => (
          <div key={mat.id} className="mb-1 d-flex align-items-center gap-2">
            <input
              type="checkbox"
              checked={mat.selected}
              onChange={() => toggleMaterial(mat.id)}
            />
            <input
              type="text"
              value={mat.name}
              onChange={(e) => updateMaterialName(mat.id, e.target.value)}
              className="form-control"
            />
          </div>
        ))}

        <div className="mt-3 text-end">
          <button className="btn btn-secondary me-2" onClick={onClose}>Cancel</button>
          <button className="btn btn-primary" onClick={handleSave}>Save</button>
        </div>
      </div>
    </div>
  );
};

export default DumpingSiteEditModal;
