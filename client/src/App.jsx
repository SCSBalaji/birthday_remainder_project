import React from "react";
import { mockBirthdays } from "./mockBirthdays";

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

function App() {
  const sortedBirthdays = [...mockBirthdays].sort(
    (a, b) => daysUntil(a.date) - daysUntil(b.date)
  );
  const nextBirthday = sortedBirthdays[0];

  // Stat values
  const total = mockBirthdays.length;
  const thisMonth = mockBirthdays.filter(
    b => new Date(b.date).getMonth() === new Date().getMonth()
  ).length;
  const next7Days = mockBirthdays.filter(
    b => daysUntil(b.date) <= 7
  ).length;

  return (
    <div
      style={{
        minHeight: "100vh",
        background: "linear-gradient(to bottom right, #4e0066 0%, #1f005c 100%)",
        color: "#fff",
        fontFamily: "'Segoe UI', Arial, sans-serif",
        margin: 0,
        padding: 0,
        boxSizing: "border-box",
        width: "100vw",
        overflowX: "hidden"
      }}
    >
      <div
        style={{
          width: "100%",
          padding: "36px 32px",
          boxSizing: "border-box",
          margin: 0,
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
                {daysUntil(nextBirthday.date)} Days
              </div>
              <div style={{ fontSize: 20, fontWeight: 600 }}>
                {nextBirthday.name}'s Birthday
              </div>
              <div style={{ fontSize: 14, opacity: 0.85 }}>
                {formatDate(nextBirthday.date)}
              </div>
              <div style={{ margin: "18px 0 0 0", fontSize: 16 }}>
                {nextBirthday.bio}
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
              }}
            >
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

export default App;