// In src/hooks/useAdminData.js

import { useState, useEffect } from 'react';

// List of all the API endpoints your dashboard needs to fetch.
const API_ENDPOINTS = [
    "users", "employees", "equipment", "materials",
    "vendors", "dumping_sites", "job-phases", "materials-trucking"
];

// This is our new custom hook.
export const useAdminData = (apiClient) => {
    // This state holds all the data for the dashboard
    const [data, setData] = useState({
        users: [], employees: [], equipment: [], job_phases: [],
        materials: [], vendors: [], dumping_sites: [], materials_trucking: []
    });
    
    // State for loading and error messages
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState(null);

    // This function will be used to refresh the data when needed
    const fetchData = async () => {
        if (!apiClient) return; // Don't fetch if the user isn't logged in

        setIsLoading(true);
        setError(null);

        try {
            // Fetch all endpoints in parallel for maximum speed
            const responses = await Promise.all(
                API_ENDPOINTS.map(endpoint => apiClient.get(`/${endpoint}`))
            );

            // Create a new data object from the results
            const newData = {
                users: responses[0].data,
                employees: responses[1].data,
                equipment: responses[2].data,
                materials: responses[3].data,
                vendors: responses[4].data,
                dumping_sites: responses[5].data,
                job_phases: responses[6].data, // Note: Use the key 'job_phases'
                materials_trucking: responses[7].data,
            };

            setData(newData); // Update the state with all the fetched data

        } catch (err) {
            console.error("Failed to fetch dashboard data:", err);
            setError("Could not load critical dashboard data. Please refresh the page.");
        } finally {
            setIsLoading(false); // We're done loading
        }
    };

    // This useEffect runs once when the component mounts
    useEffect(() => {
        fetchData();
    }, [apiClient]); // It re-runs only if the apiClient changes (i.e., on login)

    // The hook returns the data, loading status, error, and the refresh function
    return { data, setData, isLoading, error, refreshData: fetchData };
};
