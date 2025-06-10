import React, { useMemo } from "react";
import "./CalendarView.css";

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
      <div className="calendar-header">
        <button onClick={onPrev} className="calendar-header-btn">&lt;</button>
        <span className="calendar-header-title">
          {MONTHS[month]} {year}
        </span>
        <button onClick={onNext} className="calendar-header-btn">&gt;</button>
        <button onClick={onToday} className="calendar-header-today">
          Today
        </button>
      </div>
      {/* Grid */}
      <div className="calendar-container">
        {/* Days of week header */}
        <div className="calendar-days-header">
          {["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].map(d => (
            <div key={d}>{d}</div>
          ))}
        </div>
        {/* Calendar days */}
        <div className="calendar-grid">
          {matrix.flat().map((day, idx) => {
            const isToday =
              today &&
              day &&
              today.getFullYear() === year &&
              today.getMonth() === month &&
              today.getDate() === day;
            const hasBirthday = day && birthdaysByDay[day];
            return (
              <div
                key={idx}
                className={[
                  "calendar-day",
                  isToday ? "calendar-day-today" : "",
                  hasBirthday ? "calendar-day-has-birthday" : ""
                ].join(" ")}
                style={{
                  background: !day ? "transparent" : undefined,
                  border: !day ? "2px solid transparent" : undefined,
                  color: !day ? "transparent" : undefined,
                }}
              >
                {day && (
                  <>
                    <span className="calendar-day-number">
                      {day}
                    </span>
                    {birthdaysByDay[day] && birthdaysByDay[day].map((b, i) => (
                      <div key={i} className="calendar-birthday">
                        <span className="calendar-birthday-icon">🎂</span>
                        {b.name}
                      </div>
                    ))}
                    {/* Badge for multiple birthdays */}
                    {birthdaysByDay[day] && birthdaysByDay[day].length > 1 && (
                      <span className="calendar-birthday-badge">
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