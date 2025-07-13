import React, { useState, useEffect } from "react";
import { BrowserRouter as Router, Routes, Route, Navigate } from "react-router-dom";
import SignUpPage from "./SignUpPage";
import SignInPage from "./SignInPage";
import CalendarView from "./CalendarView";
import { AuthProvider, useAuth } from "./contexts/AuthContext";
import { birthdayAPI } from "./services/api";
import "./App.css";

const RELATIONSHIP_OPTIONS = [
  "Family",
  "Friend",
  "Colleague",
  "Partner",
  "Other"
];

const SORT_OPTIONS = [
  { value: "soonest", label: "Soonest Birthday" },
  { value: "az", label: "Name (A–Z)" },
  { value: "za", label: "Name (Z–A)" },
  { value: "relationship", label: "Relationship (A–Z)" },
  { value: "oldest", label: "Oldest First" },
  { value: "youngest", label: "Youngest First" },
];

// Replace the existing daysUntil function with this fixed version:
function daysUntil(dateStr) {
  const today = new Date();
  today.setHours(0, 0, 0, 0); // Reset time to midnight for accurate comparison
  
  const thisYear = today.getFullYear();
  const birthday = new Date(dateStr);
  birthday.setFullYear(thisYear);
  birthday.setHours(0, 0, 0, 0); // Reset time to midnight
  
  // If birthday already passed this year, set to next year
  if (birthday < today) {
    birthday.setFullYear(thisYear + 1);
  }
  
  const diff = Math.ceil((birthday - today) / (1000 * 60 * 60 * 24));
  return diff;
}

// Simple function for clean text display
function getBirthdayCountdownText(dateStr) {
  const days = daysUntil(dateStr);
  
  if (days === 0) {
    return "🎉 Today!";
  } else if (days === 1) {
    return "Tomorrow!";
  } else {
    return `In ${days} days`;
  }
}

// Clean display for "Coming Up Next" section - no special styling
function getNextBirthdayDisplay(dateStr) {
  const days = daysUntil(dateStr);
  
  if (days === 0) {
    return "🎉 TODAY!";
  } else if (days === 1) {
    return "🥳 Tomorrow";
  } else {
    return `${days} Days`;
  }
}

function formatDate(dateStr) {
  const date = new Date(dateStr);
  return date.toLocaleDateString(undefined, { month: "long", day: "numeric", year: "numeric" });
}

// Helper function to format date for input field (YYYY-MM-DD)
function formatDateForInput(dateStr) {
  if (!dateStr) return '';
  
  const date = new Date(dateStr);
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  
  return `${year}-${month}-${day}`;
}

export default function App() {
  return (
    <AuthProvider>
      <Router>
        <Routes>
          <Route path="/" element={<ProtectedRoute><BirthdayBuddyHome /></ProtectedRoute>} />
          <Route path="/signup" element={<SignUpPage />} />
          <Route path="/signin" element={<SignInPage />} />
          <Route path="*" element={<Navigate to="/signin" replace />} />
        </Routes>
      </Router>
    </AuthProvider>
  );
}

// Protected Route Component
function ProtectedRoute({ children }) {
  const { isAuthenticated, loading } = useAuth();
  
  if (loading) {
    return (
      <div className="main-bg" style={{ 
        display: 'flex', 
        justifyContent: 'center', 
        alignItems: 'center', 
        height: '100vh',
        color: 'white',
        fontSize: '18px'
      }}>
        Loading...
      </div>
    );
  }
  
  if (!isAuthenticated) {
    return <Navigate to="/signin" replace />;
  }
  
  return children;
}

function BirthdayBuddyHome() {
  const { logout, user } = useAuth();
  
  // API-driven state
  const [birthdays, setBirthdays] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  
  // UI state
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ name: "", date: "", relationship: "", bio: "" });
  const [editId, setEditId] = useState(null);
  const [toDeleteId, setToDeleteId] = useState(null);
  const [showCalendar, setShowCalendar] = useState(false);
  const [calendarMonth, setCalendarMonth] = useState(new Date().getMonth());
  const [calendarYear, setCalendarYear] = useState(new Date().getFullYear());
  const [search, setSearch] = useState("");
  const [filterRelationship, setFilterRelationship] = useState("");
  const [sortOption, setSortOption] = useState("soonest");

  // Load birthdays on component mount
  useEffect(() => {
    loadBirthdays();
  }, []);

  const loadBirthdays = async () => {
    try {
      setLoading(true);
      setError(null);
      const birthdayData = await birthdayAPI.getBirthdays();
      setBirthdays(birthdayData || []);
    } catch (err) {
      console.error('Error loading birthdays:', err);
      setError('Failed to load birthdays');
    } finally {
      setLoading(false);
    }
  };

  // Rest of your filtering and sorting logic (unchanged)
  const filteredBirthdays = birthdays.filter(b =>
    (!search ||
      b.name.toLowerCase().includes(search.toLowerCase()) ||
      (b.bio && b.bio.toLowerCase().includes(search.toLowerCase()))
    ) &&
    (!filterRelationship || b.relationship === filterRelationship)
  );

  const sortedBirthdays = [...filteredBirthdays].sort((a, b) => {
    switch (sortOption) {
      case "az":
        return a.name.localeCompare(b.name);
      case "za":
        return b.name.localeCompare(a.name);
      case "relationship":
        return (a.relationship || "").localeCompare(b.relationship || "");
      case "oldest":
        return new Date(a.date) - new Date(b.date);
      case "youngest":
        return new Date(b.date) - new Date(a.date);
      case "soonest":
      default:
        return daysUntil(a.date) - daysUntil(b.date);
    }
  });

  const nextBirthday = sortedBirthdays[0] || {};
  const total = birthdays.length;
  const thisMonth = birthdays.filter(
    b => new Date(b.date).getMonth() === new Date().getMonth()
  ).length;
  const next7Days = birthdays.filter(
    b => daysUntil(b.date) <= 7
  ).length;

  function handleInputChange(e) {
    setForm({ ...form, [e.target.name]: e.target.value });
  }

  // Updated to use API
  async function handleAddBirthday(e) {
    e.preventDefault();
    if (!form.name || !form.date) return;
    
    try {
      if (editId) {
        // Update existing birthday
        await birthdayAPI.updateBirthday(editId, form);
        console.log('Birthday updated successfully');
      } else {
        // Create new birthday
        await birthdayAPI.createBirthday(form);
        console.log('Birthday created successfully');
      }
      
      // Reload birthdays from server
      await loadBirthdays();
      
      // Reset form
      setForm({ name: "", date: "", relationship: "", bio: "" });
      setShowForm(false);
      setEditId(null);
    } catch (err) {
      console.error('Error saving birthday:', err);
      setError('Failed to save birthday');
    }
  }

  function handleEditClick(birthday) {
    console.log('Editing birthday:', birthday);
    console.log('Original date:', birthday.date);
    console.log('Formatted date for input:', formatDateForInput(birthday.date));
    
    setForm({
      name: birthday.name,
      date: formatDateForInput(birthday.date), // Use the helper function
      relationship: birthday.relationship || "",
      bio: birthday.bio || ""
    });
    setShowForm(true);
    setEditId(birthday.id);
  }

  function handleDeleteClick(id) {
    setToDeleteId(id);
  }

  // Updated to use API
  async function confirmDelete() {
    try {
      await birthdayAPI.deleteBirthday(toDeleteId);
      await loadBirthdays(); // Reload from server
      setToDeleteId(null);
      
      if (editId === toDeleteId) {
        setShowForm(false);
        setEditId(null);
        setForm({ name: "", date: "", relationship: "", bio: "" });
      }
    } catch (err) {
      console.error('Error deleting birthday:', err);
      setError('Failed to delete birthday');
    }
  }

  function cancelDelete() {
    setToDeleteId(null);
  }

  function handleFormCancel() {
    setShowForm(false);
    setEditId(null);
    setForm({ name: "", date: "", relationship: "", bio: "" });
  }

  // Show loading state
  if (loading && birthdays.length === 0) {
    return (
      <div className="main-bg">
        <div style={{ 
          display: 'flex', 
          justifyContent: 'center', 
          alignItems: 'center', 
          height: '100vh',
          color: 'white',
          fontSize: '18px'
        }}>
          Loading your birthdays...
        </div>
      </div>
    );
  }

  return (
    <div className="main-bg">
      {/* HEADER */}
      <div className="header">
        <h1 className="app-title">
          <span role="img" aria-label="Cake">🎂</span> Birthday Buddy
        </h1>
        <div className="header-buttons">
          <button
            onClick={() => setShowCalendar(!showCalendar)}
            className={`calendar-toggle-btn ${showCalendar ? 'active' : ''}`}
          >
            <span role="img" aria-label="Calendar">📅</span>
            {showCalendar ? "Birthday List" : "View Calendar"}
          </button>
          <button
            onClick={() => { 
              setShowForm(true); 
              setEditId(null); 
              setForm({ name: "", date: "", relationship: "", bio: "" }); 
            }}
            className="add-birthday-btn"
          >
            <span role="img" aria-label="Cake">🎂</span>
            Add Birthday
          </button>
          <button onClick={logout} className="add-birthday-btn" style={{ marginLeft: '10px' }}>
            👋 Logout ({user?.name})
          </button>
        </div>
      </div>

      {/* Error message */}
      {error && (
        <div style={{ 
          background: '#ff6b6b', 
          color: 'white', 
          padding: '10px', 
          textAlign: 'center',
          margin: '10px'
        }}>
          {error}
          <button 
            onClick={() => setError(null)} 
            style={{ marginLeft: '10px', background: 'transparent', border: 'none', color: 'white' }}
          >
            ✕
          </button>
        </div>
      )}

      {/* ADD/EDIT BIRTHDAY FORM */}
      {showForm && (
        <div className="modal-overlay">
          <form onSubmit={handleAddBirthday} className="modal-form">
            <h2 className="modal-title">
              <span role="img" aria-label="Cake">🎂</span>
              {editId ? "Edit Birthday" : "Add Birthday"}
            </h2>
            <div className="form-group">
              <label className="form-label">Name</label>
              <input
                name="name"
                value={form.name}
                onChange={handleInputChange}
                required
                className="form-input"
                placeholder="Enter person's name"
              />
            </div>
            <div className="form-group">
              <label className="form-label">Birth Date</label>
              <input
                name="date"
                type="date"
                value={form.date}
                onChange={handleInputChange}
                required
                className="form-input"
              />
              {editId && (
                <small style={{ color: '#ffb4fc', fontSize: '12px' }}>
                  Current: {form.date}
                </small>
              )}
            </div>
            <div className="form-group">
              <label className="form-label">Relationship</label>
              <select
                name="relationship"
                value={form.relationship}
                onChange={handleInputChange}
                className="form-select"
                required
              >
                <option value="">Select relationship</option>
                {RELATIONSHIP_OPTIONS.map((rel) => (
                  <option key={rel} value={rel}>{rel}</option>
                ))}
              </select>
            </div>
            <div className="form-group">
              <label className="form-label">
                Notes (Gift ideas, preferences)
              </label>
              <textarea
                name="bio"
                value={form.bio}
                onChange={handleInputChange}
                rows={2}
                className="form-textarea"
                placeholder="Add some notes about gift ideas, preferences..."
              />
            </div>
            <button type="submit" className="form-submit-btn">
              <span className="submit-icon">✔</span> {editId ? "Save Changes" : "Add Birthday"}
            </button>
            <button
              type="button"
              onClick={handleFormCancel}
              className="form-cancel-btn"
            >
              Cancel
            </button>
          </form>
        </div>
      )}

      {/* CONFIRMATION DIALOG */}
      {toDeleteId !== null && (
        <div className="delete-modal-overlay">
          <div className="delete-modal">
            <div className="delete-icon">🗑️</div>
            <div className="delete-title">
              Delete this birthday?
            </div>
            <div className="delete-message">
              Are you sure you want to delete this birthday? This action cannot be undone.
            </div>
            <div className="delete-buttons">
              <button onClick={confirmDelete} className="delete-confirm-btn">
                Yes, Delete
              </button>
              <button onClick={cancelDelete} className="delete-cancel-btn">
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      <div className="main-content">
        {showCalendar ? (
          <div className="calendar-section">
            <h2 className="calendar-title">
              <span role="img" aria-label="Calendar">📅</span>
              Birthday Calendar
            </h2>
            <CalendarView
              year={calendarYear}
              month={calendarMonth}
              birthdays={birthdays}
              today={new Date()}
              onPrev={() => {
                if (calendarMonth === 0) {
                  setCalendarMonth(11);
                  setCalendarYear(calendarYear - 1);
                } else {
                  setCalendarMonth(calendarMonth - 1);
                }
              }}
              onNext={() => {
                if (calendarMonth === 11) {
                  setCalendarMonth(0);
                  setCalendarYear(calendarYear + 1);
                } else {
                  setCalendarMonth(calendarMonth + 1);
                }
              }}
              onToday={() => {
                const now = new Date();
                setCalendarMonth(now.getMonth());
                setCalendarYear(now.getFullYear());
              }}
            />
          </div>
        ) : (
          <>
            {/* Coming Up Next */}
            <div className="coming-up-section">
              <h2 className="section-title">Coming Up Next</h2>
              <div className="next-birthday-card">
                <div className="next-birthday-days">
                  <span role="img" aria-label="Cake">🎂</span>
                  {nextBirthday && nextBirthday.date ? getNextBirthdayDisplay(nextBirthday.date) : "-- Days"}
                </div>
                <div className="next-birthday-name">
                  {nextBirthday?.name ? `${nextBirthday.name}'s Birthday` : "No upcoming birthdays"}
                </div>
                <div className="next-birthday-date">
                  {nextBirthday?.date ? formatDate(nextBirthday.date) : "--"}
                </div>
                <div className="next-birthday-bio">
                  {nextBirthday?.bio || ""}
                </div>
                <div className="next-birthday-actions">
                  <button className="gift-btn">Send Gift</button>
                  <button className="reminder-btn">Set Reminder</button>
                </div>
              </div>
            </div>

            {/* STATS SECTION */}
            <div className="stats-section">
              <div className="stat-card total">
                <div className="stat-number">{total}</div>
                <div className="stat-label">Total</div>
              </div>
              <div className="stat-card this-month">
                <div className="stat-number">{thisMonth}</div>
                <div className="stat-label">This Month</div>
              </div>
              <div className="stat-card next-seven">
                <div className="stat-number">{next7Days}</div>
                <div className="stat-label">Next 7 Days</div>
              </div>
            </div>

            {/* SEARCH, FILTER & SORT CONTROLS */}
            <div className="controls-section">
              <input
                type="text"
                value={search}
                onChange={e => setSearch(e.target.value)}
                placeholder="Search by name or notes..."
                className="search-input"
              />
              <select
                value={filterRelationship}
                onChange={e => setFilterRelationship(e.target.value)}
                className="filter-select"
              >
                <option value="">All Relationships</option>
                {RELATIONSHIP_OPTIONS.map(rel => (
                  <option key={rel} value={rel}>{rel}</option>
                ))}
              </select>
              <select
                value={sortOption}
                onChange={e => setSortOption(e.target.value)}
                className="sort-select"
              >
                {SORT_OPTIONS.map(opt => (
                  <option key={opt.value} value={opt.value}>{opt.label}</option>
                ))}
              </select>
              {(search || filterRelationship || sortOption !== "soonest") && (
                <button
                  className="reset-btn"
                  onClick={() => { setSearch(""); setFilterRelationship(""); setSortOption("soonest"); }}
                >
                  Reset
                </button>
              )}
            </div>

            {/* UPCOMING BIRTHDAYS */}
            <h2 className="upcoming-title">Upcoming Birthdays</h2>
            <div className="upcoming-birthdays-container">
              {sortedBirthdays.length === 0 ? (
                <div className="no-birthdays">
                  {loading ? "Loading birthdays..." : "No birthdays found. Add your first birthday!"}
                </div>
              ) : (
                sortedBirthdays.map((b, i) => (
                  <div key={b.id} className="birthday-card">
                    <button
                      onClick={() => handleDeleteClick(b.id)}
                      title="Delete"
                      className="delete-btn"
                    >
                      🗑️
                    </button>
                    <button
                      onClick={() => handleEditClick(b)}
                      title="Edit"
                      className="edit-btn"
                    >
                      ✏️
                    </button>
                    
                    <div className="birthday-card-header">
                      <div className="birthday-icon">
                        🎁
                      </div>
                      <div className="birthday-info">
                        <div className="birthday-name">
                          {b.name}
                        </div>
                        <div className="birthday-date">
                          <span role="img" aria-label="calendar">📅</span>{" "}
                          {formatDate(b.date)}
                        </div>
                        {b.relationship && (
                          <div className="birthday-relationship">
                            {b.relationship}
                          </div>
                        )}
                      </div>
                    </div>
                    
                    {b.bio && (
                      <div className="birthday-bio">
                        {b.bio}
                      </div>
                    )}
                    
                    <div className="birthday-countdown">
                      {getBirthdayCountdownText(b.date)}
                    </div>
                  </div>
                ))
              )}
            </div>
          </>
        )}
      </div>
    </div>
  );
}