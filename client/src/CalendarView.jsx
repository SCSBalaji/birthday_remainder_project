import React, { useMemo } from "react";

const MONTHS = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December"
];

function getCalendarMatrix(year, month) {
  const firstDay = new Date(year, month, 1);
  const startDayOfWeek = firstDay.getDay();
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const matrix = [];
  let week = [];
  let day = 1 - startDayOfWeek;

  for (let i = 0; i < 6 * 7; i++, day++) {
    if (week.length === 7) {
      matrix.push(week);
      week = [];
    }
    if (day < 1 || day > daysInMonth) {
      week.push(null);
    } else {
      week.push(day);
    }
  }
  matrix.push(week);
  return matrix;
}

export default function CalendarView({ year, month, birthdays, onPrev, onNext, onToday, today }) {
  const birthdaysByDay = useMemo(() => {
    const m = {};
    birthdays.forEach(b => {
      const d = new Date(b.date);
      if (d.getMonth() === month) {
        const day = d.getDate();
        if (!m[day]) m[day] = [];
        m[day].push(b);
      }
    });
    return m;
  }, [birthdays, year, month]);

  const matrix = getCalendarMatrix(year, month);

  return (
    <div>
      {/* Calendar header */}
      <div style={{
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        gap: 16,
        marginBottom: 16
      }}>
        <button onClick={onPrev} style={{
          background: "#fff",
          color: "#7b38f7",
          border: "none",
          borderRadius: 6,
          width: 32,
          height: 32,
          fontSize: 20,
          fontWeight: 700,
          cursor: "pointer"
        }}>&lt;</button>
        <span style={{
          fontSize: 18,
          fontWeight: 700,
          color: "#fff",
          padding: "2px 18px",
          background: "#29214a",
          borderRadius: 7
        }}>
          {MONTHS[month]} {year}
        </span>
        <button onClick={onNext} style={{
          background: "#fff",
          color: "#7b38f7",
          border: "none",
          borderRadius: 6,
          width: 32,
          height: 32,
          fontSize: 20,
          fontWeight: 700,
          cursor: "pointer"
        }}>&gt;</button>
        {/* Today Button */}
        <button
          onClick={onToday}
          style={{
            background: "linear-gradient(90deg, #66e0ff 0%, #ffb4fc 100%)",
            color: "#6d00a8",
            border: "none",
            borderRadius: 7,
            fontWeight: 700,
            fontSize: 15,
            padding: "7px 20px",
            marginLeft: 16,
            boxShadow: "0 2px 6px #0002",
            cursor: "pointer",
            outline: "none"
          }}
        >
          Today
        </button>
      </div>
      {/* Grid */}
      <div style={{
        background: "#18103d",
        borderRadius: 16,
        padding: "18px 12px",
        boxShadow: "0 4px 32px #0006",
        maxWidth: 900,
        margin: "0 auto"
      }}>
        {/* Days of week header */}
        <div style={{
          display: "grid",
          gridTemplateColumns: "repeat(7, 1fr)",
          marginBottom: 8,
          color: "#b4b4f7",
          fontWeight: 600,
          fontSize: 16,
          textAlign: "center"
        }}>
          {["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].map(d => (
            <div key={d}>{d}</div>
          ))}
        </div>
        {/* Calendar days */}
        <div style={{
          display: "grid",
          gridTemplateColumns: "repeat(7, 1fr)",
          gap: 12,
        }}>
          {matrix.flat().map((day, idx) => {
            // Highlight if today
            const isToday =
              today &&
              day &&
              today.getFullYear() === year &&
              today.getMonth() === month &&
              today.getDate() === day;
            return (
              <div key={idx} style={{
                minHeight: 54,
                borderRadius: 10,
                background: day
                  ? isToday
                    ? "linear-gradient(90deg, #ffb4fc 10%, #2ad8ff 100%)"
                    : "#22223b"
                  : "transparent",
                border: (day && birthdaysByDay[day])
                  ? isToday
                    ? "3px solid #6d00a8"
                    : "2px solid #ffb4fc"
                  : isToday
                    ? "3px solid #6d00a8"
                    : "2px solid transparent",
                boxSizing: "border-box",
                color: isToday ? "#6d00a8" : "#fff",
                display: "flex",
                flexDirection: "column",
                alignItems: "flex-start",
                justifyContent: "flex-start",
                padding: "7px 8px 7px 8px",
                position: "relative",
                fontWeight: 500,
                boxShadow: isToday ? "0 0 18px #ffb4fc99" : undefined,
                transition: "all 0.2s"
              }}>
                {day && (
                  <>
                    <span style={{
                      color: isToday
                        ? "#6d00a8"
                        : birthdaysByDay[day]
                          ? "#ffb4fc"
                          : "#fff",
                      fontWeight: isToday ? 800 : 700,
                      fontSize: isToday ? 18 : 16,
                      textShadow: isToday ? "0 2px 10px #fff9" : undefined
                    }}>
                      {day}
                    </span>
                    {birthdaysByDay[day] && birthdaysByDay[day].map((b, i) => (
                      <div key={i} style={{
                        marginTop: 6,
                        background: "#ffb4fc22",
                        color: "#ffb4fc",
                        borderRadius: 5,
                        padding: "1px 7px",
                        fontSize: 13,
                        fontWeight: 600,
                        whiteSpace: "nowrap",
                        maxWidth: "94%",
                        overflow: "hidden",
                        textOverflow: "ellipsis",
                        display: "flex",
                        alignItems: "center",
                        gap: 5
                      }}>
                        <span style={{
                          display: "inline-block",
                          width: 16,
                          height: 16,
                          background: "#ffb4fc",
                          borderRadius: "50%",
                          marginRight: 4,
                          fontSize: 12,
                          color: "#fff",
                          textAlign: "center",
                          lineHeight: "16px"
                        }}>🎂</span>
                        {b.name}
                      </div>
                    ))}
                    {/* Badge for multiple birthdays */}
                    {birthdaysByDay[day] && birthdaysByDay[day].length > 1 && (
                      <span style={{
                        position: "absolute",
                        top: 7,
                        right: 8,
                        background: "#ff6ec4",
                        color: "#fff",
                        borderRadius: "50%",
                        fontSize: 12,
                        minWidth: 18,
                        height: 18,
                        textAlign: "center",
                        lineHeight: "18px",
                        fontWeight: 700
                      }}>
                        {birthdaysByDay[day].length}
                      </span>
                    )}
                  </>
                )}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}