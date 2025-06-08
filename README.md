# Birthday Buddy

A modern, user-friendly birthday reminder and management app built with React and Vite. Users can sign up for a private account, add birthdays for friends and family, and view upcoming birthdays in both list and calendar views.

---

## Features

- **User Authentication**: Sign up and sign in with your own account (pages ready, logic coming soon)
- **Personal Birthdays**: Each user sees only their own list
- **Birthday List View**: Search, filter, and sort birthdays
- **Calendar View**: See all birthdays in a beautiful month grid, with today highlighted
- **Responsive Design**: Works on desktop and mobile

---

## Tech Stack

| Purpose                | Tech Used                         |
|------------------------|-----------------------------------|
| Frontend Framework     | [React](https://reactjs.org/)     |
| Build Tool/Dev Server  | [Vite](https://vitejs.dev/)       |
| Routing                | [React Router](https://reactrouter.com/) |
| Styling/UI             | Custom CSS-in-JS (inline styles, matches purple gradient theme) |
| State Management       | React Hooks (`useState`, `useMemo`) |
| Calendar Logic         | Custom implementation (no external calendar lib) |
| User Authentication    | (Coming soon)                     |
| Persistence/Database   | (Coming soon)                     |

---

## Getting Started

1. **Clone the repo**
2. Run `npm install`
3. Run the development server with:
   ```
   npm run dev
   ```
4. Open [http://localhost:5173](http://localhost:5173) (or the port shown in the terminal) in your browser

---

## Roadmap

- [x] Sign up and sign in pages (static)
- [x] Birthday list: add, edit, delete, search, filter, sort
- [x] Calendar month view with navigation and today highlight
- [ ] Hook up authentication (backend or service)
- [ ] Persist birthdays per user (localStorage or cloud)
- [ ] Notifications and reminders
- [ ] Mobile polish
- [ ] Forgot password, profile pic, and more

---

## License

MIT
