import React from "react";
import "./timesheet.css";

const DumpingSiteChipList = ({ sites, selectedSites, onEdit }) => {
  return (
    <div className="dumping-site-chip-list d-flex flex-wrap gap-2">
      {sites.map((s) => {
        const isSelected = selectedSites.includes(s.id);
        return (
          <div
            key={s.id}
            className={`dumping-site-chip ${isSelected ? "selected" : ""}`}
            onClick={() => isSelected && onEdit(s)}
          >
            {s.name}
          </div>
        );
      })}
    </div>
  );
};

export default DumpingSiteChipList;
