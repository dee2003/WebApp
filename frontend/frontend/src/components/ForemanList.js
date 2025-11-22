// src/components/admin/ForemanList.js
import React from 'react';

const ForemanList = ({ foremen, selectedForemanId, onSelect, disabledForemanIds = new Set() }) => {
    return (
        <ul className="foreman-selection-list">
            {foremen.map(foreman => {
                const isSelected = foreman.id === selectedForemanId;
                
                // A foreman is disabled if they are in the disabled set AND they are not the one currently selected.
                // This allows the user to see the active state when editing an existing crew.
                const isDisabled = disabledForemanIds.has(foreman.id) && !isSelected;

                const getClassName = () => {
                    if (isSelected) return 'active-foreman';
                    if (isDisabled) return 'disabled-foreman';
                    return '';
                };

                return (
                    <li
                        key={foreman.id}
                        className={getClassName()}
                        // The click handler is disabled if the foreman is in the disabled list.
                        onClick={() => !isDisabled && onSelect(foreman.id)}
                    >
                        {foreman.first_name} {foreman.last_name}
                        {isDisabled && " (Assigned)"}
                    </li>
                );
            })}
        </ul>
    );
};

export default ForemanList;
