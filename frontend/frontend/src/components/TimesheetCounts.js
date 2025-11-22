import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { FaUserShield, FaUserTie, FaUserCog } from 'react-icons/fa';
import styles from './TimesheetCounts.module.css'; // Import CSS Module

const API_URL = 'http://127.0.0.1:8000/api';

const TimesheetCounts = () => {
  const [counts, setCounts] = useState({
    foreman: 0,
    supervisor: 0,
    project_engineer: 0,
  });
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);
  const [hoveredCard, setHoveredCard] = useState(null);

  useEffect(() => {
    const fetchTimesheetCounts = async () => {
      setIsLoading(true);
      try {
        const response = await axios.get(`${API_URL}/timesheets/counts-by-status`);
        setCounts(response.data);
        setError(null);
      } catch (err) {
        console.error("Error fetching timesheet counts:", err);
        setError("Failed to load timesheet counts. Check API connection.");
      } finally {
        setIsLoading(false);
      }
    };

    fetchTimesheetCounts();
  }, []);

  if (isLoading) {
    return <div className={styles.loadingState}>⏳ Loading Timesheet Counts...</div>;
  }

  if (error) {
    return <div className={styles.errorState}>🛑 Error: {error}</div>;
  }

  const getCardClasses = (cardName) =>
    hoveredCard === cardName ? `${styles.card} ${styles.cardHover}` : styles.card;

  return (
    <div className={styles.container}>
      <h5 className={styles.header}>Timesheet Approval Status</h5>
      <div className={styles.cardContainer}>
        {/* Foreman Card */}
        <div
          className={getCardClasses('foreman')}
          onMouseEnter={() => setHoveredCard('foreman')}
          onMouseLeave={() => setHoveredCard(null)}
        >
          <div className={styles.cardHeaderBar}>
            <FaUserTie size={20} /> With Foreman
          </div>
          <div className={styles.cardBody}>
            <p className={styles.count}>{counts.foreman}</p>
            <p className={styles.countText}>Pending Timesheets</p>
          </div>
        </div>

        {/* Supervisor Card */}
        <div
          className={getCardClasses('supervisor')}
          onMouseEnter={() => setHoveredCard('supervisor')}
          onMouseLeave={() => setHoveredCard(null)}
        >
          <div className={styles.cardHeaderBar}>
            <FaUserShield size={20} /> With Supervisor
          </div>
          <div className={styles.cardBody}>
            <p className={styles.count}>{counts.supervisor}</p>
            <p className={styles.countText}>Pending Timesheets</p>
          </div>
        </div>

        {/* Project Engineer Card */}
        <div
          className={getCardClasses('project_engineer')}
          onMouseEnter={() => setHoveredCard('project_engineer')}
          onMouseLeave={() => setHoveredCard(null)}
        >
          <div className={styles.cardHeaderBar}>
            <FaUserCog size={20} /> With Project Engineer
          </div>
          <div className={styles.cardBody}>
            <p className={styles.count}>{counts.project_engineer}</p>
            <p className={styles.countText}>Pending Timesheets</p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default TimesheetCounts;
