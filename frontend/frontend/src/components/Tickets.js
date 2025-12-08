import React, { useState, useEffect } from 'react';
import { 
    FaArrowLeft, FaCalendarAlt, FaUser, FaExternalLinkAlt, FaEye, 
    FaSearch, FaUpload, FaTimes 
} from 'react-icons/fa';
import { apiClient, API_URL } from "../api"; 
import './Tickets.css';

// Remove /api suffix for file links
const API_BASE_URL = API_URL.replace(/\/api\/?$/, '');

// --- HELPERS ---

/**
 * Formats any date string to MM-DD-YYYY
 */
const formatDateForDisplay = (dateStr) => {
    if (!dateStr) return "-";
    const s = String(dateStr).trim();

    // 1. If already MM-DD-YYYY, return it
    if (/^\d{2}-\d{2}-\d{4}$/.test(s)) return s;

    // 2. Handle YYYY-MM-DD (Standard Backend Format)
    const isoMatch = s.match(/^(\d{4})-(\d{2})-(\d{2})$/);
    if (isoMatch) {
        const [_, y, m, d] = isoMatch;
        return `${m}-${d}-${y}`;
    }

    // 3. Handle YYYY/MM/DD
    const isoSlashMatch = s.match(/^(\d{4})\/(\d{2})\/(\d{2})$/);
    if (isoSlashMatch) {
        const [_, y, m, d] = isoSlashMatch;
        return `${m}-${d}-${y}`;
    }

    // 4. Fallback: Try Date object
    const d = new Date(s);
    if (!isNaN(d.getTime())) {
        const mm = String(d.getMonth() + 1).padStart(2, '0');
        const dd = String(d.getDate()).padStart(2, '0');
        const yyyy = d.getFullYear();
        return `${mm}-${dd}-${yyyy}`;
    }

    return s;
};

const parseAnyDate = (dateStr) => {
    if (!dateStr) return null;
    const s = dateStr.trim();
    if (/^\d{4}-\d{2}-\d{2}$/.test(s)) {
        const [y, m, d] = s.split('-').map(Number);
        return new Date(y, m - 1, d).getTime();
    }
    const usMatch = s.match(/^(\d{1,2})[-/](\d{1,2})[-/](\d{2,4})$/);
    if (usMatch) {
        const m = parseInt(usMatch[1], 10);
        const d = parseInt(usMatch[2], 10);
        let y = parseInt(usMatch[3], 10);
        if (y < 100) y += 2000; 
        return new Date(y, m - 1, d).getTime();
    }
    return new Date(s).getTime();
};

const escapeCsvCell = (data) => {
    if (data === null || data === undefined) return '""';
    const str = String(data);
    return `"${str.replace(/"/g, '""')}"`;
};

// --- LEVEL 4: DETAIL VIEW (DATA ONLY) ---
const TicketDetailView = ({ ticket, onBack }) => {
    if (!ticket) return null;

    const getImageUrl = (url) => {
        if (!url) return null;
        let cleanUrl = url.replace(/\\/g, '/');
        if (cleanUrl.startsWith('http')) return cleanUrl;
        if (!cleanUrl.startsWith('/')) cleanUrl = `/${cleanUrl}`;
        return `${API_BASE_URL}${cleanUrl}`; 
    };

    const finalUrl = getImageUrl(ticket.image_url);

    return (
        <div className="ticket-detail-full-page">
            {/* Header / Navigation */}
            <div className="ticket-list-header">
                <button onClick={onBack} className="back-btn"><FaArrowLeft /> Back to List</button>
                <div>
                    <h2 style={{margin:0}}>Ticket #{ticket.ticket_number || "Unknown"}</h2>
                    <small style={{color: '#666'}}>Foreman: {ticket.foreman_name}</small>
                </div>
                
                {/* Actions */}
                <div style={{marginLeft: 'auto'}}>
                    {finalUrl && (
                        <a 
                            href={finalUrl} 
                            target="_blank" 
                            rel="noopener noreferrer" 
                            className="header-btn btn-primary" 
                            style={{textDecoration: 'none', color: 'white'}}
                        >
                            <FaExternalLinkAlt /> Open Original File
                        </a>
                    )}
                </div>
            </div>

            {/* Scrollable Data Content */}
            <div className="detail-content-container">
                
                <div className="panel-section">
                    <h4>📋 Ticket Data</h4>
                    <table className="detail-table">
                        <tbody>
                            <tr><th>Ticket Number</th><td>{ticket.ticket_number || "-"}</td></tr>
                            
                            {/* Display Scanned Date if available (from search), else Ticket Date */}
                            <tr><th>Scanned Date</th><td>{formatDateForDisplay(ticket.scanned_date || ticket.ticket_date)}</td></tr>
                            
                            <tr><th>Foreman</th><td><strong>{ticket.foreman_name}</strong></td></tr>
                            <tr><th>Category</th><td>{ticket.category || "-"}</td></tr>
                            <tr><th>Sub-Category</th><td>{ticket.sub_category || "-"}</td></tr>
                            <tr><th>Vendor</th><td>{ticket.haul_vendor || "-"}</td></tr>
                            <tr><th>Truck Number</th><td>{ticket.truck_number || "-"}</td></tr>
                            <tr><th>Job Number</th><td>{ticket.job_number || "-"}</td></tr>
                            <tr><th>Phase Code</th><td>{ticket.phase_code_ || "-"}</td></tr>
                            <tr><th>Material</th><td>{ticket.material || "-"}</td></tr>
                            <tr><th>Zone</th><td>{ticket.zone || "-"}</td></tr>
                            <tr><th>Hours / Qty</th><td>{ticket.hours || "-"}</td></tr>
                        </tbody>
                    </table>
                </div>

                {ticket.table_data && ticket.table_data.length > 0 && (
                    <div className="panel-section">
                        <h4>🔢 Table Entry</h4>
                        <div className="table-responsive">
                            <table className="tickets-table" style={{fontSize: '0.9rem'}}>
                                <tbody>
                                    {ticket.table_data.map((row, i) => (
                                        <tr key={i} style={{cursor: 'default'}}>
                                            {row.map((cell, j) => <td key={j}>{cell}</td>)}
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
};

// --- MAIN COMPONENT ---
const Tickets = () => {
    // VIEW STATE
    const [viewLevel, setViewLevel] = useState(1); 
    const [loading, setLoading] = useState(true);
    
    // DATA STATE
    const [ticketsByDate, setTicketsByDate] = useState([]); 
    const [usersMap, setUsersMap] = useState({});

    // SELECTION STATE
    const [selectedDateGroup, setSelectedDateGroup] = useState(null);
    const [selectedForemanId, setSelectedForemanId] = useState(null);
    const [selectedForemanName, setSelectedForemanName] = useState("");
    const [selectedTicket, setSelectedTicket] = useState(null);

    // SEARCH STATE
    const [isSearchModalOpen, setIsSearchModalOpen] = useState(false);
    const [isSearching, setIsSearching] = useState(false);
    const [searchResults, setSearchResults] = useState([]); 
    const [searchFilters, setSearchFilters] = useState({
        ticket_number: "",
        haul_vendor: "",
        material: "",
        job_number: "",
        date_from: "",
        date_to: "",
    });

    useEffect(() => {
        fetchTicketsAndUsers();
    }, []);

    const fetchTicketsAndUsers = async () => {
        setLoading(true);
        try {
            // 1. Fetch Users
            const usersRes = await apiClient.get('/users/');
            const userMapping = {};
            if(usersRes.data) {
                usersRes.data.forEach(u => {
                    userMapping[u.id] = `${u.first_name} ${u.last_name}`;
                });
            }
            setUsersMap(userMapping);

            // 2. Fetch Tickets
            const response = await apiClient.get('/ocr/all-images-grouped'); 
            
            // 3. Inject Foreman Name
            const enrichedData = response.data.map(group => ({
                ...group,
                images: group.images.map(img => ({
                    ...img,
                    foreman_name: userMapping[img.foreman_id] || `ID: ${img.foreman_id}`
                }))
            }));

            setTicketsByDate(enrichedData);
        } catch (error) {
            console.error("Error fetching data:", error);
        } finally {
            setLoading(false);
        }
    };

    // --- SEARCH LOGIC (Updated to use Scanned/Header Date) ---
    const handleSearchSubmit = (e) => {
        e.preventDefault(); 
        
        const { ticket_number, haul_vendor, material, job_number, date_from, date_to } = searchFilters;
        
        // ✅ FLATTEN & INJECT SCANNED DATE
        // We take the 'date' from the group (header) and attach it to each ticket as 'scanned_date'
        const allTickets = ticketsByDate.flatMap(group => 
            group.images.map(ticket => ({
                ...ticket,
                scanned_date: group.date // Inject group date for searching
            }))
        );

        const fromTs = parseAnyDate(date_from);
        const toTs = parseAnyDate(date_to);

        const results = allTickets.filter(t => {
            const matchTicket = !ticket_number || (t.ticket_number && t.ticket_number.toLowerCase().includes(ticket_number.toLowerCase()));
            const matchVendor = !haul_vendor || (t.haul_vendor && t.haul_vendor.toLowerCase().includes(haul_vendor.toLowerCase()));
            const matchMaterial = !material || (t.material && t.material.toLowerCase().includes(material.toLowerCase()));
            const matchJob = !job_number || (t.job_number && t.job_number.toLowerCase().includes(job_number.toLowerCase()));

            let matchDate = true;
            if (fromTs || toTs) {
                // ✅ FILTER BY SCANNED DATE (Not OCR Date)
                const tDateTs = parseAnyDate(t.scanned_date);
                if (!tDateTs) matchDate = false;
                else {
                    if (fromTs && tDateTs < fromTs) matchDate = false;
                    if (toTs && tDateTs > toTs) matchDate = false;
                }
            }
            return matchTicket && matchVendor && matchMaterial && matchJob && matchDate;
        });

        setSearchResults(results);
        setIsSearching(true);
        setIsSearchModalOpen(false);
        setViewLevel(3); 
    };

    const clearSearch = () => {
        setSearchFilters({ ticket_number: "", haul_vendor: "", material: "", job_number: "", date_from: "", date_to: "" });
        setIsSearching(false);
        setSearchResults([]);
        setViewLevel(1); 
    };

    // --- EXPORT LOGIC ---
    const handleExportCSV = () => {
        let ticketsToExport = [];
        if (isSearching) {
            ticketsToExport = searchResults;
        } else if (viewLevel === 3) {
            ticketsToExport = getTicketsForList();
        } else {
            // Flatten and include Scanned Date for full export
            ticketsToExport = ticketsByDate.flatMap(group => 
                group.images.map(t => ({ ...t, scanned_date: group.date }))
            );
        }

        if (ticketsToExport.length === 0) return alert("No data to export.");

        const headers = ["Date Scanned", "Foreman", "Ticket #", "Category", "Sub-Category", "Vendor", "Material", "Job #", "Truck #", "Phase", "Hours", "Table Entry (JSON)", "Image URL"];
        
        const csvContent = [
            headers.join(","),
            ...ticketsToExport.map(t => [
                // ✅ EXPORT SCANNED DATE
                escapeCsvCell(formatDateForDisplay(t.scanned_date || t.ticket_date)), 
                escapeCsvCell(t.foreman_name),
                escapeCsvCell(t.ticket_number),
                escapeCsvCell(t.category),
                escapeCsvCell(t.sub_category),
                escapeCsvCell(t.haul_vendor),
                escapeCsvCell(t.material),
                escapeCsvCell(t.job_number),
                escapeCsvCell(t.truck_number),
                escapeCsvCell(t.phase_code_),
                escapeCsvCell(t.hours),
                escapeCsvCell(JSON.stringify(t.table_data || [])), 
                escapeCsvCell(`${API_BASE_URL}${t.image_url || ''}`)
            ].join(","))
        ].join("\n");

        const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
        const url = URL.createObjectURL(blob);
        const link = document.createElement("a");
        link.href = url;
        link.setAttribute("download", `tickets_export_${new Date().toISOString().slice(0,10)}.csv`);
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    };

    // --- NAVIGATION HELPERS ---
    const handleDateClick = (group) => {
        setSelectedDateGroup(group);
        setViewLevel(2);
    };

    const handleForemanClick = (foremanId, foremanName) => {
        setSelectedForemanId(foremanId);
        setSelectedForemanName(foremanName);
        setViewLevel(3);
    };

    const handleTicketClick = (ticket) => {
        setSelectedTicket(ticket);
        setViewLevel(4);
    };

    const handleBack = () => {
        if (viewLevel === 4) {
            setViewLevel(3); 
            setSelectedTicket(null);
        } else if (viewLevel === 3) {
            if (isSearching) {
                clearSearch(); 
            } else {
                setViewLevel(2);
                setSelectedForemanId(null);
            }
        } else if (viewLevel === 2) {
            setViewLevel(1);
            setSelectedDateGroup(null);
        }
    };

    const getTicketsForList = () => {
        if (isSearching) return searchResults;
        if (!selectedDateGroup || !selectedForemanId) return [];
        return selectedDateGroup.images.filter(t => 
            (t.foreman_id || 'unknown') === selectedForemanId
        );
    };

    const getForemenForSelectedDate = () => {
        if (!selectedDateGroup) return [];
        
        const groups = {};
        selectedDateGroup.images.forEach(ticket => {
            const fId = ticket.foreman_id || 'unknown';
            if (!groups[fId]) {
                groups[fId] = {
                    id: fId,
                    name: ticket.foreman_name || `Unknown (ID: ${fId})`,
                    count: 0
                };
            }
            groups[fId].count += 1;
        });
        return Object.values(groups);
    };

    if (loading) return <div style={{padding: 20}}>Loading Tickets...</div>;

    return (
        <div className="tickets-container">
            
            {/* HEADER */}
            <div className="tickets-header">
                <h2>{isSearching ? `Search Results (${searchResults.length})` : "Ticket Daily Logs"}</h2>
                <div className="header-actions">
                    <button className="header-btn btn-outline" onClick={handleExportCSV} title="Export CSV">
                        <FaUpload /> Export CSV
                    </button>
                    {isSearching ? (
                        <button className="header-btn btn-danger" onClick={clearSearch}>
                            <FaTimes /> Clear
                        </button>
                    ) : (
                        <button className="header-btn btn-primary" onClick={() => setIsSearchModalOpen(true)}>
                            <FaSearch /> Advanced Search
                        </button>
                    )}
                </div>
            </div>

            {/* LEVEL 1: DATES */}
            {viewLevel === 1 && !isSearching && (
                <div className="date-group-grid">
                    {ticketsByDate.length === 0 ? <p>No tickets found.</p> : ticketsByDate.map((group) => (
                        <div key={group.date} className="date-card" onClick={() => handleDateClick(group)}>
                            <FaCalendarAlt size={30} color="#007bff" style={{marginBottom: '10px'}} />
                            <h3>{formatDateForDisplay(group.date)}</h3>
                            <span className="ticket-count">{group.images ? group.images.length : 0} Tickets</span>
                        </div>
                    ))}
                </div>
            )}

            {/* LEVEL 2: FOREMEN */}
            {viewLevel === 2 && selectedDateGroup && !isSearching && (
                <>
                    <div className="ticket-list-header">
                        <button onClick={handleBack} className="back-btn"><FaArrowLeft /> Back to Dates</button>
                        <h2>Foremen for {formatDateForDisplay(selectedDateGroup.date)}</h2>
                    </div>
                    <div className="date-group-grid">
                        {getForemenForSelectedDate().map((foreman) => (
                            <div key={foreman.id} className="date-card" onClick={() => handleForemanClick(foreman.id, foreman.name)}>
                                <FaUser size={30} color="#28a745" style={{marginBottom: '10px'}} />
                                <h3>{foreman.name}</h3>
                                <span className="ticket-count">{foreman.count} Tickets</span>
                            </div>
                        ))}
                    </div>
                </>
            )}

            {/* LEVEL 3: TICKET LIST */}
            {viewLevel === 3 && (
                <>
                    <div className="ticket-list-header">
                        <button onClick={handleBack} className="back-btn">
                            <FaArrowLeft /> {isSearching ? "Back to Dates" : "Back to Foremen"}
                        </button>
                        <div>
                            {isSearching ? (
                                <h2 style={{margin:0}}>Filtered Results</h2>
                            ) : (
                                <>
                                    <h2 style={{margin:0}}>Tickets: {selectedForemanName}</h2>
                                    <small style={{color: '#666'}}>Date: {formatDateForDisplay(selectedDateGroup.date)}</small>
                                </>
                            )}
                        </div>
                    </div>

                    <div className="tickets-table-container">
                        <table className="tickets-table">
                            <thead>
                                <tr>
                                    {isSearching && <th>Date Scanned</th>}
                                    {isSearching && <th>Foreman</th>}
                                    <th>Ticket #</th>
                                    <th>Vendor</th>
                                    <th>Category</th> 
                                    <th>Job #</th>
                                    <th style={{width: '50px'}}>View</th>
                                </tr>
                            </thead>
                            <tbody>
                                {getTicketsForList().map((ticket) => (
                                    <tr key={ticket.id} onClick={() => handleTicketClick(ticket)}>
                                        {/* ✅ DISPLAY SCANNED DATE IN RESULTS */}
                                        {isSearching && <td>{formatDateForDisplay(ticket.scanned_date)}</td>}
                                        {isSearching && <td><strong>{ticket.foreman_name}</strong></td>}
                                        <td><strong>{ticket.ticket_number || "-"}</strong></td>
                                        <td>{ticket.haul_vendor || "-"}</td>
                                        <td>{ticket.category || "-"}</td> 
                                        <td>{ticket.job_number || "-"}</td>
                                        <td><FaEye color="#007bff"/></td>
                                    </tr>
                                ))}
                                {getTicketsForList().length === 0 && (
                                    <tr><td colSpan={isSearching ? 7 : 5} style={{textAlign: 'center', padding: '20px'}}>No matching tickets found.</td></tr>
                                )}
                            </tbody>
                        </table>
                    </div>
                </>
            )}

            {/* LEVEL 4: DETAIL VIEW (DATA ONLY) */}
            {viewLevel === 4 && selectedTicket && (
                <TicketDetailView 
                    ticket={selectedTicket} 
                    onBack={() => {
                        setSelectedTicket(null);
                        setViewLevel(3);
                    }}
                />
            )}

            {/* SEARCH MODAL */}
            {isSearchModalOpen && (
                <div className="modal" style={{display: 'flex', alignItems: 'center', justifyContent: 'center'}}>
                    <div className="modal-content" style={{width: '500px'}}>
                        <div className="modal-header">
                            <h3>Advanced Search</h3>
                            <button onClick={() => setIsSearchModalOpen(false)} className="btn-sm btn-outline">×</button>
                        </div>
                        <div className="modal-body" style={{padding: '20px'}}>
                            <form onSubmit={handleSearchSubmit}>
                                <div className="form-group">
                                    <label>Date Range (YYYY-MM-DD)</label>
                                    <div style={{display:'flex', gap:'10px'}}>
                                        <input type="date" className="form-control" 
                                            value={searchFilters.date_from} 
                                            onChange={e => setSearchFilters({...searchFilters, date_from: e.target.value})} 
                                        />
                                        <span style={{alignSelf:'center'}}>to</span>
                                        <input type="date" className="form-control" 
                                            value={searchFilters.date_to} 
                                            onChange={e => setSearchFilters({...searchFilters, date_to: e.target.value})} 
                                        />
                                    </div>
                                </div>
                                <div className="form-group">
                                    <label>Ticket Number</label>
                                    <input type="text" className="form-control" placeholder="e.g. 12345"
                                        value={searchFilters.ticket_number}
                                        onChange={e => setSearchFilters({...searchFilters, ticket_number: e.target.value})}
                                    />
                                </div>
                                <div className="form-group">
                                    <label>Vendor</label>
                                    <input type="text" className="form-control" placeholder="e.g. M Luis"
                                        value={searchFilters.haul_vendor}
                                        onChange={e => setSearchFilters({...searchFilters, haul_vendor: e.target.value})}
                                    />
                                </div>
                                <div className="form-group">
                                    <label>Material</label>
                                    <input type="text" className="form-control" placeholder="e.g. Asphalt"
                                        value={searchFilters.material}
                                        onChange={e => setSearchFilters({...searchFilters, material: e.target.value})}
                                    />
                                </div>
                                <div className="form-group">
                                    <label>Job Number</label>
                                    <input type="text" className="form-control" placeholder="e.g. J-2023"
                                        value={searchFilters.job_number}
                                        onChange={e => setSearchFilters({...searchFilters, job_number: e.target.value})}
                                    />
                                </div>
                                
                                <div className="modal-footer">
                                    <button type="button" onClick={clearSearch} className="header-btn btn-outline">Reset</button>
                                    <button type="submit" className="header-btn btn-primary">Search</button>
                                </div>
                            </form>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default Tickets;