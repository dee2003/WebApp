import React from "react";

const MappingSection = ({ title, items, renderItem }) => (
  <div style={{ marginBottom: 28 }}>
    <h4>
      {title} ({Array.isArray(items) ? items.length : 0})
    </h4>
    {Array.isArray(items) && items.length ? (
      <ul>
        {items.map((i) => (
          <li key={i.id || i.name}>{renderItem(i)}</li>
        ))}
      </ul>
    ) : (
      <div style={{ color: "#999" }}>No records found.</div>
    )}
  </div>
);

export default MappingSection;