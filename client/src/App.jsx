import React, { useState } from "react";
import { BrowserRouter as Router, Routes, Route, Navigate } from "react-router-dom";
import SignUpPage from "./SignUpPage";
import SignInPage from "./SignInPage";
import CalendarView from "./CalendarView";
import { mockBirthdays as defaultBirthdays } from "./mockBirthdays";
import { AuthProvider, useAuth } from "./contexts/AuthContext";
import "./App.css";

const RELATIONSHIP_OPTIONS = [
  "Family",
  "Friend",
  "Colleague",
  "Partner",
  "Other"
];

// NEW: Sort options
const SORT_OPTIONS = [
  { value: "soonest", label: "Soonest Birthday" },
  { value: "az", label: "Name (A–Z)" },
  { value: "za", label: "Name (Z–A)" },
  { value: "relationship", label: "Relationship (A–Z)" },
  { value: "oldest", label: "Oldest First" },
  { value: "youngest", label: "Youngest First" },
];

function daysUntil(dateStr) {
  const today = new Date();
  const thisYear = today.getFullYear();
  const birthday = new Date(dateStr);
  birthday.setFullYear(thisYear);
  if (birthday < today) birthday.setFullYear(thisYear + 1);
  const diff = Math.ceil((birthday - today) / (1000 * 60 * 60 * 24));
  return diff;
}

function formatDate(dateStr) {
  const date = new Date(dateStr);
  return date.toLocaleDateString(undefined, { month: "long", day: "numeric", year: "numeric" });
}

// Protected Route Component
function ProtectedRoute({ children }) {
  const { isAuthenticated, loading } = useAuth();
  
  if (loading) {
    return <div>Loading...</div>;
  }
  
  return isAuthenticated ? children : <Navigate to="/signin" replace />;
}

// App Routes Component
function AppRoutes() {
  const { isAuthenticated, loading } = useAuth();
  
  if (loading) {
    return <div>Loading...</div>;
  }
  
  return (
    <Routes>
      <Route
        path="/"
        element={
          <ProtectedRoute>
            <BirthdayBuddyHome />
          </ProtectedRoute>
        }
      />
      <Route 
        path="/signup" 
        element={isAuthenticated ? <Navigate to="/" replace /> : <SignUpPage />} 
      />
      <Route 
        path="/signin" 
        element={isAuthenticated ? <Navigate to="/" replace /> : <SignInPage />} 
      />
      <Route path="*" element={<Navigate to={isAuthenticated ? "/" : "/signin"} replace />} />
    </Routes>
  );
}

export default function App() {
  return (
    <AuthProvider>
      <Router>
        <AppRoutes />
      </Router>
    </AuthProvider>
  );
}

function BirthdayBuddyHome() {
  const { user, logout } = useAuth();
  const [birthdays, setBirthdays] = useState(defaultBirthdays);
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

  function handleAddBirthday(e) {
    e.preventDefault();
    if (!form.name || !form.date) return;
    if (editId) {
      setBirthdays(birthdays.map(b =>
        b.id === editId
          ? { ...b, ...form }
          : b
      ));
    } else {
      setBirthdays([
        ...birthdays,
        {
          id: Date.now(),
          name: form.name,
          date: form.date,
          relationship: form.relationship,
          bio: form.bio,
        },
      ]);
    }
    setForm({ name: "", date: "", relationship: "", bio: "" });
    setShowForm(false);
    setEditId(null);
  }

  function handleEditClick(birthday) {
    setForm({
      name: birthday.name,
      date: birthday.date,
      relationship: birthday.relationship || "",
      bio: birthday.bio || ""
    });
    setShowForm(true);
    setEditId(birthday.id);
  }

  function handleDeleteClick(id) {
    setToDeleteId(id);
  }

  function confirmDelete() {
    setBirthdays(birthdays.filter((b) => b.id !== toDeleteId));
    setToDeleteId(null);
    if (editId === toDeleteId) {
      setShowForm(false);
      setEditId(null);
      setForm({ name: "", date: "", relationship: "", bio: "" });
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

  return (
    <div className="main-bg">
      {/* HEADER */}
      <div className="header">
        <h1 className="app-title">
          <span role="img" aria-label="Cake">🎂</span> Birthday Buddy
        </h1>
        <div className="header-buttons">
          <span className="user-welcome">Welcome, {user?.name || user?.email}!</span>
          <button
            onClick={() => setShowCalendar(!showCalendar)}
            className={`calendar-toggle-btn ${showCalendar ? 'active' : ''}`}
          >
            <span role="img" aria-label="Calendar">📅</span>
            {showCalendar ? "Birthday List" : "View Calendar"}
          </button>
          <button
            onClick={() => { setShowForm(true); setEditId(null); setForm({ name: "", date: "", relationship: "", bio: "" }); }}
            className="add-birthday-btn"
          >
            <span role="img" aria-label="Cake">🎂</span>
            Add Birthday
          </button>
          <button
            onClick={logout}
            className="logout-btn"
          >
            Logout
          </button>
        </div>
      </div>

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
                placeholder="dd-mm-yyyy"
              />
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
                  {nextBirthday && nextBirthday.date ? daysUntil(nextBirthday.date) : "--"} Days
                </div>
                <div className="next-birthday-name">
                  {nextBirthday?.name ? `${nextBirthday.name}'s Birthday` : "--"}
                </div>
                <div className="next-birthday-date">
                  {nextBirthday?.date ? formatDate(nextBirthday.date) : "--"}
                </div>
                <div className="next-birthday-bio">
                  {nextBirthday?.bio || ""}
                </div>
                <div className="next-birthday-actions">
                  <button className="gift-btn">
                    Send Gift
                  </button>
                  <button className="reminder-btn">
                    Set Reminder
                  </button>
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
                  No birthdays found.
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
                      In {daysUntil(b.date)} days
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