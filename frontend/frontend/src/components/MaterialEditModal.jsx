import React, { useState, useEffect } from "react";
import "./vendorModal.css"; // reuse same modal css

const MaterialEditModal = ({ show, onClose, material, onSave }) => {
  const [name, setName] = useState(material?.name || "");
  const [subMaterials, setSubMaterials] = useState([]); // Materials / Hauler / Truck list with selection

  useEffect(() => {
    setName(material?.name || "");
    setSubMaterials(
      material?.materials?.map((mat) => ({
        ...mat,
        selected: material.selectedMaterials?.includes(mat.id) || false
      })) || []
    );
  }, [material?.id]); // depend on material ID so edits are not lost on modal reopen

  const handleMaterialToggle = (matId) => {
    setSubMaterials((prev) =>
      prev.map((mat) =>
        mat.id === matId ? { ...mat, selected: !mat.selected } : mat
      )
    );
  };

  const handleMaterialNameChange = (matId, newName) => {
    setSubMaterials((prev) =>
      prev.map((mat) => (mat.id === matId ? { ...mat, name: newName } : mat))
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

    onSave(material.id, { name, selectedMaterials, materials: updatedMaterials });
  };

  if (!show) return null;

  return (
    <div className="modal-overlay">
      <div className="modal-container small-modal">
        <h5>Edit Material</h5>

        <label>Name:</label>
        <input
          type="text"
          value={name}
          onChange={(e) => setName(e.target.value)}
          className="form-control mb-2"
        />

        <label>Materials / Hauler / Truck:</label>
        {subMaterials.map((mat) => (
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
          <button className="btn btn-secondary me-2" onClick={onClose}>
            Cancel
          </button>
          <button className="btn btn-primary" onClick={handleSave}>
            Save
          </button>
        </div>
      </div>
    </div>
  );
};

export default MaterialEditModal;
