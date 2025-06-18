import React, { useState } from "react";
import { BrowserRouter as Router, Routes, Route, Navigate } from "react-router-dom";
import SignUpPage from "./SignUpPage";
import SignInPage from "./SignInPage";
import CalendarView from "./CalendarView";
import { mockBirthdays as defaultBirthdays } from "./mockBirthdays";

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

export default function App() {
  // If you want to keep the router, wrap your current UI in a "home" route:
  return (
    <Router>
      <Routes>
        <Route
          path="/"
          element={
            <BirthdayBuddyHome />
          }
        />
        <Route path="/signup" element={<SignUpPage />} />
        <Route path="/signin" element={<SignInPage />} />
        {/* Default: redirect to sign in */}
        <Route path="*" element={<Navigate to="/signin" replace />} />
      </Routes>
    </Router>
  );
}

// Move your main Birthday Buddy code into a new component:
function BirthdayBuddyHome() {
  const [birthdays, setBirthdays] = useState(defaultBirthdays);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ name: "", date: "", relationship: "", bio: "" });
  const [editId, setEditId] = useState(null);
  const [toDeleteId, setToDeleteId] = useState(null);

  // NEW: Calendar state
  const [showCalendar, setShowCalendar] = useState(false);
  const [calendarMonth, setCalendarMonth] = useState(new Date().getMonth());
  const [calendarYear, setCalendarYear] = useState(new Date().getFullYear());

  // NEW: Search and filter state
  const [search, setSearch] = useState("");
  const [filterRelationship, setFilterRelationship] = useState("");
  // NEW: Sort state
  const [sortOption, setSortOption] = useState("soonest");

  // Filter and sort birthdays
  const filteredBirthdays = birthdays.filter(b =>
    (!search ||
      b.name.toLowerCase().includes(search.toLowerCase()) ||
      (b.bio && b.bio.toLowerCase().includes(search.toLowerCase()))
    ) &&
    (!filterRelationship || b.relationship === filterRelationship)
  );
  // NEW: Sorting logic
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
      // Edit mode: update existing
      setBirthdays(birthdays.map(b =>
        b.id === editId
          ? { ...b, ...form }
          : b
      ));
    } else {
      // Add mode: create new
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
    // If you were editing this birthday, close form
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

  // Background style
  const mainBg = {
    minHeight: "100vh",
    background: "radial-gradient(ellipse at top left, #191970 0%, #4e0066 100%)",
    color: "#fff",
    fontFamily: "'Segoe UI', Arial, sans-serif",
    margin: 0,
    padding: 0,
    boxSizing: "border-box",
    width: "100vw",
    overflowX: "hidden",
    position: "relative"
  };

  return (
    <div style={mainBg}>
      {/* HEADER */}
      <div style={{
        display: "flex",
        justifyContent: "space-between",
        alignItems: "center",
        padding: "28px 40px 0 40px",
      }}>
        <h1 style={{
          fontSize: 28,
          fontWeight: 700,
          background: "linear-gradient(90deg, #b621fe 0%, #1fd1f9 100%)",
          WebkitBackgroundClip: "text",
          WebkitTextFillColor: "transparent",
          margin: 0,
          display: "flex",
          alignItems: "center",
          gap: 10
        }}>
          <span role="img" aria-label="Cake">🎂</span> Birthday Buddy
        </h1>
        <div style={{ display: "flex", gap: 10 }}>
          <button
            onClick={() => setShowCalendar(!showCalendar)}
            style={{
              background: showCalendar ? "#fff" : "linear-gradient(90deg, #ff6ec4 0%, #7873f5 100%)",
              color: showCalendar ? "#7b38f7" : "#fff",
              border: "none",
              borderRadius: 8,
              padding: "10px 18px",
              fontWeight: 600,
              fontSize: 15,
              marginRight: 10,
              display: "flex",
              alignItems: "center",
              gap: 6,
              cursor: "pointer"
            }}
          >
            <span role="img" aria-label="Calendar">📅</span>
            {showCalendar ? "Birthday List" : "View Calendar"}
          </button>
          <button
            onClick={() => { setShowForm(true); setEditId(null); setForm({ name: "", date: "", relationship: "", bio: "" }); }}
            style={{
              background: "linear-gradient(90deg, #ff6ec4 0%, #7873f5 100%)",
              color: "#fff",
              border: "none",
              borderRadius: 8,
              padding: "10px 26px",
              fontSize: 16,
              fontWeight: 600,
              boxShadow: "0 2px 8px #0002",
              cursor: "pointer",
              display: "flex",
              alignItems: "center",
              gap: 8,
              marginLeft: 16
            }}>
            <span role="img" aria-label="Cake">🎂</span>
            Add Birthday
          </button>
        </div>
      </div>

      {/* ADD/EDIT BIRTHDAY FORM (MODAL-LIKE CENTERED CARD) */}
      {showForm && (
        <div style={{
          position: "fixed",
          top: 0, left: 0, width: "100vw", height: "100vh",
          background: "rgba(20, 5, 30, 0.62)",
          zIndex: 99,
          display: "flex",
          alignItems: "center",
          justifyContent: "center"
        }}>
          <form
            onSubmit={handleAddBirthday}
            style={{
              background: "#18103d",
              padding: "32px 30px 24px 30px",
              borderRadius: 14,
              boxShadow: "0 8px 32px #0008",
              minWidth: 340,
              maxWidth: 400,
              width: "100%",
              display: "flex",
              flexDirection: "column",
              alignItems: "center"
            }}>
            <h2 style={{
              fontWeight: 700,
              fontSize: 22,
              color: "#ffb4fc",
              marginBottom: 22,
              display: "flex",
              alignItems: "center",
              gap: 10
            }}>
              <span role="img" aria-label="Cake">🎂</span>
              {editId ? "Edit Birthday" : "Add Birthday"}
            </h2>
            <div style={{ width: "100%", marginBottom: 14 }}>
              <label style={{ display: "block", marginBottom: 4, fontWeight: 500 }}>Name</label>
              <input
                name="name"
                value={form.name}
                onChange={handleInputChange}
                required
                style={{
                  width: "95%",
                  padding: 10,
                  borderRadius: 6,
                  border: "none",
                  fontSize: 15,
                  background: "#29214a",
                  color: "#fff",
                  marginBottom: 8,
                  outline: "none"
                }}
                placeholder="Enter person's name"
              />
            </div>
            <div style={{ width: "100%", marginBottom: 14 }}>
              <label style={{ display: "block", marginBottom: 4, fontWeight: 500 }}>Birth Date</label>
              <input
                name="date"
                type="date"
                value={form.date}
                onChange={handleInputChange}
                required
                style={{
                  width: "95%",
                  padding: 10,
                  borderRadius: 6,
                  border: "none",
                  fontSize: 15,
                  background: "#29214a",
                  color: "#fff",
                  marginBottom: 8,
                  outline: "none"
                }}
                placeholder="dd-mm-yyyy"
              />
            </div>
            <div style={{ width: "100%", marginBottom: 14 }}>
              <label style={{ display: "block", marginBottom: 4, fontWeight: 500 }}>Relationship</label>
              <select
                name="relationship"
                value={form.relationship}
                onChange={handleInputChange}
                style={{
                  width: "100%",
                  padding: 10,
                  borderRadius: 6,
                  border: "none",
                  fontSize: 15,
                  background: "#29214a",
                  color: "#fff",
                  marginBottom: 8,
                  outline: "none"
                }}
                required
              >
                <option value="">Select relationship</option>
                {RELATIONSHIP_OPTIONS.map((rel) => (
                  <option key={rel} value={rel}>{rel}</option>
                ))}
              </select>
            </div>
            <div style={{ width: "100%", marginBottom: 18 }}>
              <label style={{ display: "block", marginBottom: 4, fontWeight: 500 }}>
                Notes (Gift ideas, preferences)
              </label>
              <textarea
                name="bio"
                value={form.bio}
                onChange={handleInputChange}
                rows={2}
                style={{
                  width: "95%",
                  padding: 10,
                  borderRadius: 6,
                  border: "none",
                  fontSize: 15,
                  background: "#29214a",
                  color: "#fff",
                  marginBottom: 8,
                  outline: "none",
                  resize: "vertical"
                }}
                placeholder="Add some notes about gift ideas, preferences..."
              />
            </div>
            <button
              type="submit"
              style={{
                width: "100%",
                padding: "11px 0",
                borderRadius: 7,
                border: "none",
                background: "linear-gradient(90deg, #ff6ec4 0%, #7873f5 100%)",
                color: "#fff",
                fontWeight: 700,
                fontSize: 16,
                cursor: "pointer",
                marginBottom: 8,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                gap: 12
              }}
            >
              <span style={{ fontSize: 18 }}>✔</span> {editId ? "Save Changes" : "Add Birthday"}
            </button>
            <button
              type="button"
              onClick={handleFormCancel}
              style={{
                width: "100%",
                padding: "8px 0",
                borderRadius: 7,
                border: "none",
                background: "#29214a",
                color: "#fff",
                fontWeight: 700,
                fontSize: 15,
                cursor: "pointer",
                opacity: 0.8
              }}
            >
              Cancel
            </button>
          </form>
        </div>
      )}

      {/* CONFIRMATION DIALOG */}
      {toDeleteId !== null && (
        <div style={{
          position: "fixed",
          top: 0, left: 0, width: "100vw", height: "100vh",
          background: "rgba(0,0,0,0.55)",
          zIndex: 100,
          display: "flex",
          alignItems: "center",
          justifyContent: "center"
        }}>
          <div
            style={{
              background: "#1a1133",
              padding: "30px 28px 24px 28px",
              borderRadius: 14,
              boxShadow: "0 8px 32px #0008",
              minWidth: 320,
              maxWidth: 380,
              color: "#fff",
              textAlign: "center"
            }}
          >
            <div style={{ fontSize: 32, marginBottom: 6 }}>🗑️</div>
            <div style={{ fontWeight: 700, fontSize: 20, marginBottom: 10 }}>
              Delete this birthday?
            </div>
            <div style={{ fontSize: 16, marginBottom: 22, opacity: 0.8 }}>
              Are you sure you want to delete this birthday? This action cannot be undone.
            </div>
            <div style={{ display: "flex", gap: 12, justifyContent: "center" }}>
              <button
                onClick={confirmDelete}
                style={{
                  background: "linear-gradient(90deg, #ff6ec4 0%, #7873f5 100%)",
                  color: "#fff",
                  border: "none",
                  borderRadius: 7,
                  padding: "10px 24px",
                  fontWeight: 700,
                  fontSize: 15,
                  cursor: "pointer"
                }}
              >
                Yes, Delete
              </button>
              <button
                onClick={cancelDelete}
                style={{
                  background: "#29214a",
                  color: "#fff",
                  border: "none",
                  borderRadius: 7,
                  padding: "10px 24px",
                  fontWeight: 700,
                  fontSize: 15,
                  cursor: "pointer",
                  opacity: 0.85
                }}
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      <div
        style={{
          width: "100%",
          padding: "36px 32px",
          boxSizing: "border-box",
        }}
      >
        {showCalendar ? (
          <div style={{ marginTop: 12 }}>
            <h2 style={{
              color: "#ffb4fc",
              margin: "18px 0 18px 0",
              display: "flex",
              alignItems: "center",
              gap: 7
            }}>
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
            {/* TOP SECTION: Coming Up Next & Stats */}
            <div
              style={{
                display: "flex",
                flexWrap: "wrap",
                gap: 32,
                marginBottom: 32,
                alignItems: "stretch",
                width: "100%",
              }}
            >
              {/* Left: Coming Up Next */}
              <div
                style={{
                  flex: "2 1 400px",
                  minWidth: 340,
                  display: "flex",
                  flexDirection: "column",
                  gap: 24,
                }}
              >
                <h2 style={{ color: "#ffb4fc", margin: 0 }}>Coming Up Next</h2>
                <div
                  style={{
                    background: "linear-gradient(90deg, #b621fe 0%, #1fd1f9 100%)",
                    borderRadius: 16,
                    padding: 32,
                    color: "#fff",
                    display: "flex",
                    flexDirection: "column",
                    minHeight: 200,
                    boxShadow: "0 8px 32px #0004",
                    width: "100%",
                  }}
                >
                  <div
                    style={{
                      fontSize: 36,
                      fontWeight: 700,
                      marginBottom: 8,
                      display: "flex",
                      alignItems: "center",
                      gap: 12,
                    }}
                  >
                    <span role="img" aria-label="Cake">🎂</span>
                    {nextBirthday && nextBirthday.date ? daysUntil(nextBirthday.date) : "--"} Days
                  </div>
                  <div style={{ fontSize: 20, fontWeight: 600 }}>
                    {nextBirthday?.name ? `${nextBirthday.name}'s Birthday` : "--"}
                  </div>
                  <div style={{ fontSize: 14, opacity: 0.85 }}>
                    {nextBirthday?.date ? formatDate(nextBirthday.date) : "--"}
                  </div>
                  <div style={{ margin: "18px 0 0 0", fontSize: 16 }}>
                    {nextBirthday?.bio || ""}
                  </div>
                  <div style={{ marginTop: 18, display: "flex", gap: 12 }}>
                    <button
                      style={{
                        background: "#fff",
                        color: "#b621fe",
                        border: "none",
                        borderRadius: 6,
                        padding: "8px 20px",
                        fontWeight: 600,
                        cursor: "pointer",
                      }}
                    >
                      Send Gift
                    </button>
                    <button
                      style={{
                        background: "#fff",
                        color: "#1fd1f9",
                        border: "none",
                        borderRadius: 6,
                        padding: "8px 20px",
                        fontWeight: 600,
                        cursor: "pointer",
                      }}
                    >
                      Set Reminder
                    </button>
                  </div>
                </div>
              </div>
              {/* Right: Stats */}
              <div
                style={{
                  flex: "1 1 240px",
                  minWidth: 200,
                  display: "flex",
                  flexDirection: "column",
                  gap: 18,
                  justifyContent: "center",
                }}
              >
                <div
                  style={{
                    background: "#fff2",
                    borderRadius: 10,
                    padding: 18,
                    textAlign: "center",
                    fontWeight: 700,
                    fontSize: 20,
                    width: "100%",
                  }}
                >
                  <div style={{ fontSize: 26 }}>{total}</div>
                  <div style={{ fontSize: 15, fontWeight: 400 }}>Total</div>
                </div>
                <div
                  style={{
                    background: "#ffb4fc44",
                    borderRadius: 10,
                    padding: 18,
                    textAlign: "center",
                    fontWeight: 700,
                    fontSize: 20,
                    width: "100%",
                  }}
                >
                  <div style={{ fontSize: 26 }}>{thisMonth}</div>
                  <div style={{ fontSize: 15, fontWeight: 400 }}>This Month</div>
                </div>
                <div
                  style={{
                    background: "#1fd1f944",
                    borderRadius: 10,
                    padding: 18,
                    textAlign: "center",
                    fontWeight: 700,
                    fontSize: 20,
                    width: "100%",
                  }}
                >
                  <div style={{ fontSize: 26 }}>{next7Days}</div>
                  <div style={{ fontSize: 15, fontWeight: 400 }}>Next 7 Days</div>
                </div>
              </div>
            </div>

            {/* SEARCH, FILTER & SORT CONTROLS */}
            <div style={{
              display: "flex",
              gap: 18,
              marginBottom: 18,
              alignItems: "center",
              flexWrap: "wrap"
            }}>
              <input
                type="text"
                value={search}
                onChange={e => setSearch(e.target.value)}
                placeholder="Search by name or notes..."
                style={{
                  padding: "10px 18px",
                  borderRadius: 7,
                  border: "none",
                  fontSize: 15,
                  background: "#29214a",
                  color: "#fff",
                  outline: "none",
                  width: 240,
                  minWidth: 120,
                  marginRight: 6
                }}
              />
              <select
                value={filterRelationship}
                onChange={e => setFilterRelationship(e.target.value)}
                style={{
                  padding: "10px 14px",
                  borderRadius: 7,
                  border: "none",
                  fontSize: 15,
                  background: "#29214a",
                  color: "#fff",
                  outline: "none",
                  minWidth: 120
                }}
              >
                <option value="">All Relationships</option>
                {RELATIONSHIP_OPTIONS.map(rel => (
                  <option key={rel} value={rel}>{rel}</option>
                ))}
              </select>
              {/* NEW: Sort Dropdown */}
              <select
                value={sortOption}
                onChange={e => setSortOption(e.target.value)}
                style={{
                  padding: "10px 14px",
                  borderRadius: 7,
                  border: "none",
                  fontSize: 15,
                  background: "#29214a",
                  color: "#fff",
                  outline: "none",
                  minWidth: 140
                }}
              >
                {SORT_OPTIONS.map(opt => (
                  <option key={opt.value} value={opt.value}>{opt.label}</option>
                ))}
              </select>
              {(search || filterRelationship || sortOption !== "soonest") && (
                <button
                  style={{
                    background: "none",
                    color: "#ffb4fc",
                    border: "none",
                    fontSize: 15,
                    fontWeight: 700,
                    cursor: "pointer",
                    marginLeft: 6,
                    textDecoration: "underline"
                  }}
                  onClick={() => { setSearch(""); setFilterRelationship(""); setSortOption("soonest"); }}
                >
                  Reset
                </button>
              )}
            </div>

            {/* UPCOMING BIRTHDAYS */}
            <h2 style={{ color: "#ffb4fc", marginTop: 16 }}>Upcoming Birthdays</h2>
            <div
              className="upcoming-birthdays-grid"
              style={{
                display: "grid",
                gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))",
                gap: 32,
                marginTop: 24,
                width: "100%",
                padding: "0 8px"
              }}
            >
              {sortedBirthdays.length === 0 ? (
                <div style={{
                  gridColumn: "1/-1",
                  background: "#22223b",
                  borderRadius: 16,
                  padding: 40,
                  color: "#fff",
                  textAlign: "center",
                  boxShadow: "0 6px 30px rgba(0,0,0,0.15)"
                }}>
                  No birthdays found.
                </div>
              ) : (
                sortedBirthdays.map((b, i) => (
                  <div
                    key={b.id}
                    style={{
                      background: "linear-gradient(135deg, #2a2550 0%, #1f1b42 100%)",
                      borderRadius: 16,
                      padding: 28,
                      color: "#fff",
                      boxShadow: "0 8px 32px rgba(0,0,0,0.2)",
                      display: "flex",
                      flexDirection: "column",
                      alignItems: "flex-start",
                      width: "100%",
                      position: "relative",
                      border: "1px solid rgba(255, 255, 255, 0.1)",
                      transition: "transform 0.2s ease, box-shadow 0.2s ease",
                      cursor: "pointer",
                      margin: "8px"
                    }}
                    onMouseEnter={(e) => {
                      e.target.style.transform = "translateY(-4px)";
                      e.target.style.boxShadow = "0 12px 40px rgba(0,0,0,0.3)";
                    }}
                    onMouseLeave={(e) => {
                      e.target.style.transform = "translateY(0)";
                      e.target.style.boxShadow = "0 8px 32px rgba(0,0,0,0.2)";
                    }}
                  >
                    {/* Delete Button */}
                    <button
                      onClick={() => handleDeleteClick(b.id)}
                      title="Delete"
                      style={{
                        position: "absolute",
                        top: 16,
                        right: 16,
                        border: "none",
                        background: "rgba(255, 110, 196, 0.2)",
                        color: "#ff6ec4",
                        fontSize: 18,
                        cursor: "pointer",
                        padding: "8px",
                        lineHeight: 1,
                        borderRadius: "50%",
                        width: "36px",
                        height: "36px",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        transition: "all 0.2s ease"
                      }}
                      onMouseEnter={(e) => {
                        e.target.style.background = "rgba(255, 110, 196, 0.3)";
                        e.target.style.transform = "scale(1.1)";
                      }}
                      onMouseLeave={(e) => {
                        e.target.style.background = "rgba(255, 110, 196, 0.2)";
                        e.target.style.transform = "scale(1)";
                      }}
                    >
                      🗑️
                    </button>
                    {/* Edit Button */}
                    <button
                      onClick={() => handleEditClick(b)}
                      title="Edit"
                      style={{
                        position: "absolute",
                        top: 16,
                        right: 60,
                        border: "none",
                        background: "rgba(31, 209, 249, 0.2)",
                        color: "#1fd1f9",
                        fontSize: 18,
                        cursor: "pointer",
                        padding: "8px",
                        lineHeight: 1,
                        borderRadius: "50%",
                        width: "36px",
                        height: "36px",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        transition: "all 0.2s ease"
                      }}
                      onMouseEnter={(e) => {
                        e.target.style.background = "rgba(31, 209, 249, 0.3)";
                        e.target.style.transform = "scale(1.1)";
                      }}
                      onMouseLeave={(e) => {
                        e.target.style.background = "rgba(31, 209, 249, 0.2)";
                        e.target.style.transform = "scale(1)";
                      }}
                    >
                      ✏️
                    </button>
                    <div
                      style={{
                        display: "flex",
                        alignItems: "center",
                        gap: 16,
                        marginBottom: 20,
                        width: "100%",
                        paddingRight: "80px"
                      }}
                    >
                      <div style={{
                        fontSize: 32,
                        background: "linear-gradient(90deg, #ff6ec4 0%, #7873f5 100%)",
                        borderRadius: "50%",
                        width: "50px",
                        height: "50px",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        flexShrink: 0
                      }}>
                        🎁
                      </div>
                      <div style={{ flex: 1 }}>
                        <div style={{ fontWeight: 700, fontSize: 20, marginBottom: 4 }}>{b.name}</div>
                        <div style={{ fontSize: 14, opacity: 0.85, marginBottom: 2 }}>
                          <span role="img" aria-label="calendar">📅</span>{" "}
                          {formatDate(b.date)}
                        </div>
                        {b.relationship && (
                          <div style={{
                            fontSize: 12,
                            opacity: 0.8,
                            background: "rgba(255, 180, 252, 0.2)",
                            display: "inline-block",
                            padding: "2px 8px",
                            borderRadius: "12px",
                            marginTop: 4
                          }}>
                            {b.relationship}
                          </div>
                        )}
                      </div>
                    </div>
                    {b.bio && (
                      <div
                        style={{
                          margin: "0 0 20px 0",
                          fontSize: 15,
                          opacity: 0.9,
                          lineHeight: 1.4,
                          background: "rgba(255, 255, 255, 0.05)",
                          padding: "12px 16px",
                          borderRadius: "10px",
                          width: "100%",
                          boxSizing: "border-box"
                        }}
                      >
                        {b.bio}
                      </div>
                    )}
                    <div
                      style={{
                        marginTop: "auto",
                        background: "linear-gradient(90deg, #b621fe 0%, #7873f5 100%)",
                        display: "inline-block",
                        borderRadius: 8,
                        padding: "8px 16px",
                        fontWeight: 600,
                        fontSize: 14,
                        boxShadow: "0 2px 8px rgba(182, 33, 254, 0.3)"
                      }}
                    >
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