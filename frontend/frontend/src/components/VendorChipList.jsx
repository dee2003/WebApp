import React from "react";
import "./timesheet.css";
const VendorChipList = ({ vendors, selectedVendors, onEdit }) => {
  return (
    <div className="vendor-chip-list d-flex flex-wrap gap-2">
      {vendors.map((v) => {
        const isSelected = selectedVendors.includes(v.id);
        return (
          <div
            key={v.id}
            className={`vendor-chip ${isSelected ? "selected" : ""}`}
            onClick={() => isSelected && onEdit(v)} // Only selected vendors are editable
          >
            {v.name}
          </div>
        );
      })}
    </div>
  );
};

export default VendorChipList;
