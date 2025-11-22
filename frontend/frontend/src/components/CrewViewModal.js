import React from 'react';

const CrewViewModal = ({ crew, allResources, onClose }) => {
    // Destructure all possible resources from the allResources prop
    const { users, employees, equipment, materials, vendors, dumping_sites } = allResources;

    // Helper function to safely find and display the foreman's name
    const getForemanName = (foremanId) => {
        if (!users || users.length === 0) return 'Loading...';
        const foreman = users.find(u => u.id === foremanId);
        return foreman ? `${foreman.first_name} ${foreman.last_name}` : 'N/A';
    };
    
    // This generalized helper function takes a list of resource objects
    // and renders their names in a list.
    const renderResourceList = (resources, nameKey = 'name') => {
        // If the resources array is missing or empty, display "None".
        if (!resources || resources.length === 0) {
            return <li>None</li>;
        }

        // Map over the array of resource objects
        return resources.map(resource => {
            // Handle the special case for employees, who have first_name and last_name
            const displayName = nameKey === 'employee'
                ? `${resource.first_name} ${resource.last_name}`
                : resource[nameKey];
            
            // Return a list item with the resource's name
            return <li key={resource.id}>{displayName || `Unknown Resource`}</li>;
        });
    };

    return (
        <div className="modal">
            <div className="modal-content">
                <div className="modal-header">
                    {/* Add a guard to ensure 'crew' is loaded before accessing its properties */}
                    <h3>Crew Details: {crew && getForemanName(crew.foreman_id)}</h3>
                    <button onClick={onClose} className="btn-close">×</button>
                </div>

                {/* Main guard: Only render the details if the 'crew' object exists */}
                {crew ? (
                    <div className="crew-view-details">
                        <div>
                            <h4>Employees</h4>
                            {/* Pass the array of employee objects from the crew prop */}
                            <ul>{renderResourceList(crew.employees, 'employee')}</ul>
                        </div>
                        <div>
                            <h4>Equipment</h4>
                            {/* Pass the array of equipment objects */}
                            <ul>{renderResourceList(crew.equipment)}</ul>
                        </div>
                       
                    </div>
                ) : (
                    // Display a loading message if the crew data is not yet available
                    <p>Loading crew details...</p>
                )}

                <div className="modal-actions">
                    <button onClick={onClose} className="btn btn-outline">Close</button>
                </div>
            </div>
        </div>
    );
};

export default CrewViewModal;
