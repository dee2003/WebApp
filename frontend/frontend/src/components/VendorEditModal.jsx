import React, { useState, useEffect } from "react";
import "./vendorModal.css";

const VendorEditModal = ({ show, onClose, vendor, onSave }) => {
  const [name, setName] = useState(vendor?.name || "");
  const [materials, setMaterials] = useState([]);

  useEffect(() => {
    // Only update materials if vendor is changed, otherwise keep edits
    setName(vendor?.name || "");
    setMaterials(
      vendor?.materials?.map(mat => ({
        ...mat,
        selected: vendor.selectedMaterials?.includes(mat.id) || false
      })) || []
    );
  }, [vendor?.id]); // depend on vendor ID, not the whole vendor object

  const handleMaterialToggle = (matId) => {
    setMaterials(prev =>
      prev.map(mat =>
        mat.id === matId ? { ...mat, selected: !mat.selected } : mat
      )
    );
  };

  const handleMaterialNameChange = (matId, newName) => {
    setMaterials(prev =>
      prev.map(mat => (mat.id === matId ? { ...mat, name: newName } : mat))
    );
  };

  const handleSave = () => {
    const selectedMaterials = materials.filter(mat => mat.selected).map(mat => mat.id);
    const updatedMaterials = materials.map(mat => ({ id: mat.id, name: mat.name }));

    onSave(vendor.id, { name, selectedMaterials, materials: updatedMaterials });
  };

  if (!show) return null;

  return (
    <div className="modal-overlay">
      <div className="modal-container small-modal">
        <h5>Edit Vendor</h5>

        <label>Name:</label>
        <input
          type="text"
          value={name}
          onChange={(e) => setName(e.target.value)}
          className="form-control mb-2"
        />

        <label>Materials:</label>
        {materials.map((mat) => (
          <div key={mat.id} className="mb-1 d-flex align-items-center gap-2">
            <input
              type="checkbox"
              checked={mat.selected}
              onChange={() => handleMaterialToggle(mat.id)}
            />
            <input
              type="text"
              value={mat.name}
              onChange={(e) => handleMaterialNameChange(mat.id, e.target.value)}
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

export default VendorEditModal;
