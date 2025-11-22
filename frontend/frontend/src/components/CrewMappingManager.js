// src/components/admin/CrewMappingManager.js
import React, { useState, useEffect } from 'react';
import { apiClient } from "../api";
import CrewListTable from './CrewListTable';
import CrewAssignmentModal from './CrewAssignmentModal';
import CrewViewModal from './CrewViewModal';

const CrewMappingManager = ({ allResources }) => {
  const [crewList, setCrewList] = useState([]);
  const [modal, setModal] = useState({ type: null, data: null });
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(true);

  const fetchData = async () => {
    try {
      setLoading(true);
      const response = await apiClient.get(`/crew-mapping/`);
      setCrewList(response.data);
      setError(null);
    } catch (err) {
      setError("Failed to fetch crew data.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const handleSave = async (payload) => {
    try {
      const url =
        modal.type === "edit"
          ? `/crew-mapping/${modal.data.id}`
          : `/crew-mapping/`;
      const method = modal.type === "edit" ? "put" : "post";
      await apiClient[method](url, payload);  // ✅ token automatically included
      setModal({ type: null, data: null });
      fetchData();
    } catch (err) {
      setError(
        err.response?.data?.detail ||
          `Failed to ${modal.type === "edit" ? "update" : "create"} crew.`
      );
    }
  };

  const handleDelete = async (crewId) => {
    if (
      window.confirm(
        "Are you sure you want to delete this crew? This action cannot be undone."
      )
    ) {
      try {
        await apiClient.delete(`/crew-mapping/${crewId}`); // ✅ token included
        fetchData();
      } catch (err) {
        setError(err.response?.data?.detail || "Failed to delete crew.");
      }
    }
  };

  const crewMappingResources = {
    ...allResources,
    equipment: allResources.equipment.map((eq) => ({
      ...eq,
      name: `${eq.id} - ${eq.name}`,
    })),
  };

  if (loading) return <div>Loading crews...</div>;

  return (
    <div className="data-table-container">
      <div className="section-header">
        <h2>Crew Management</h2>
        <button
          onClick={() => setModal({ type: "add", data: null })}
          className="btn btn-primary"
        >
          Create New Crew
        </button>
      </div>

      {error && <div className="alert alert-danger">{error}</div>}

      <CrewListTable
        crews={crewList}
        users={allResources.users}
        onView={(crew) => setModal({ type: "view", data: crew })}
        onEdit={(crew) => setModal({ type: "edit", data: crew })}
        onDelete={handleDelete}
      />

      {(modal.type === "add" || modal.type === "edit") && (
        <CrewAssignmentModal
          mode={modal.type}
          initialData={modal.data}
          onSave={handleSave}
          onClose={() => setModal({ type: null, data: null })}
          allCrews={crewList}
          allResources={crewMappingResources}
        />
      )}

      {modal.type === "view" && (
        <CrewViewModal
          crew={modal.data}
          allResources={crewMappingResources}
          onClose={() => setModal({ type: null, data: null })}
        />
      )}
    </div>
  );
};

export default CrewMappingManager;
