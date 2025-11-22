import React from "react";
import "./timesheet.css";

const MaterialChipList = ({ materials, selectedMaterials, onEdit }) => {
  return (
    <div className="material-chip-list d-flex flex-wrap gap-2">
      {materials.map((m) => {
        const isSelected = selectedMaterials.includes(m.id);
        return (
          <div
            key={m.id}
            className={`material-chip ${isSelected ? "selected" : ""}`}
            onClick={() => isSelected && onEdit(m)}
          >
            {m.name}
          </div>
        );
      })}
    </div>
  );
};

export default MaterialChipList;
