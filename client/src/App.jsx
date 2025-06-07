import React, { useState } from "react";
import { mockBirthdays as defaultBirthdays } from "./mockBirthdays";

const RELATIONSHIP_OPTIONS = [
  "Family",
  "Friend",
  "Colleague",
  "Partner",
  "Other"
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
  const [birthdays, setBirthdays] = useState(defaultBirthdays);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ name: "", date: "", relationship: "", bio: "" });
  const [editId, setEditId] = useState(null); // NEW: which birthday is being edited
  const [toDeleteId, setToDeleteId] = useState(null);

  // Sort birthdays by how soon they are coming
  const sortedBirthdays = [...birthdays].sort(
    (a, b) => daysUntil(a.date) - daysUntil(b.date)
  );
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
                  width: "100%",
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

      {/* REST OF YOUR APP UI BELOW */}
      <div
        style={{
          width: "100%",
          padding: "36px 32px",
          boxSizing: "border-box",
        }}
      >
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

        {/* UPCOMING BIRTHDAYS */}
        <h2 style={{ color: "#ffb4fc", marginTop: 30 }}>Upcoming Birthdays</h2>
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit, minmax(260px, 1fr))",
            gap: 24,
            marginTop: 14,
            width: "100%",
          }}
        >
          {sortedBirthdays.map((b, i) => (
            <div
              key={b.id}
              style={{
                background: "#22223b",
                borderRadius: 12,
                padding: 22,
                color: "#fff",
                boxShadow: "0 4px 24px #0003",
                display: "flex",
                flexDirection: "column",
                alignItems: "flex-start",
                width: "100%",
                position: "relative"
              }}
            >
              {/* Delete Button (top right of card) */}
              <button
                onClick={() => handleDeleteClick(b.id)}
                title="Delete"
                style={{
                  position: "absolute",
                  top: 10,
                  right: 10,
                  border: "none",
                  background: "transparent",
                  color: "#ff6ec4",
                  fontSize: 20,
                  cursor: "pointer",
                  padding: 0,
                  lineHeight: 1,
                  filter: "drop-shadow(0 2px 4px #0007)"
                }}
              >
                🗑️
              </button>
              {/* Edit Button (top right, left of delete) */}
              <button
                onClick={() => handleEditClick(b)}
                title="Edit"
                style={{
                  position: "absolute",
                  top: 10,
                  right: 44,
                  border: "none",
                  background: "transparent",
                  color: "#1fd1f9",
                  fontSize: 20,
                  cursor: "pointer",
                  padding: 0,
                  lineHeight: 1,
                  filter: "drop-shadow(0 2px 4px #0007)"
                }}
              >
                ✏️
              </button>
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 12,
                  marginBottom: 4,
                }}
              >
                <span style={{ fontSize: 28 }}>🎁</span>
                <div>
                  <div style={{ fontWeight: 700, fontSize: 18 }}>{b.name}</div>
                  <div style={{ fontSize: 13, opacity: 0.85 }}>
                    <span role="img" aria-label="calendar">
                      📅
                    </span>{" "}
                    {formatDate(b.date)}
                  </div>
                  <div style={{ fontSize: 12, opacity: 0.7, marginTop: 2 }}>
                    {b.relationship || ""}
                  </div>
                </div>
              </div>
              <div
                style={{
                  margin: "12px 0 6px 0",
                  fontSize: 15,
                  opacity: 0.9,
                }}
              >
                {b.bio}
              </div>
              <div
                style={{
                  marginTop: 6,
                  background: "#b621fe",
                  display: "inline-block",
                  borderRadius: 6,
                  padding: "4px 12px",
                  fontWeight: 600,
                  fontSize: 13,
                }}
              >
                In {daysUntil(b.date)} days
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}