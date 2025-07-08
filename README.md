# 🎂 Birthday Buddy - Full Stack Birthday Management App

A modern, full-stack birthday reminder and management application built with React, Node.js, Express, and MySQL. Users can create private accounts, manage birthdays for friends and family, and view upcoming birthdays in both list and calendar views with complete data persistence.

![Birthday Buddy](https://img.shields.io/badge/Status-Production%20Ready-brightgreen)
![React](https://img.shields.io/badge/React-19.1.0-blue)
![Node.js](https://img.shields.io/badge/Node.js-Backend-green)
![MySQL](https://img.shields.io/badge/MySQL-Database-orange)

---

## 🚀 Live Demo

[Link to your live application]

---

## 📸 Screenshot

<!-- Add a screenshot or GIF of your application here -->
![Application Screenshot](placeholder.png)

---

## ✨ Features

### 🔐 **Authentication & Security**
- **User Registration & Login**: Secure JWT-based authentication
- **Protected Routes**: Private user accounts with session management
- **Data Isolation**: Each user sees only their own birthday data
- **Secure API**: Token-based API authentication with automatic logout

### 🎯 **Birthday Management**
- **CRUD Operations**: Add, edit, delete, and view birthdays
- **Rich Data**: Store names, dates, relationships, and personal notes
- **Real-time Updates**: Instant synchronization across all views
- **Data Persistence**: All data stored securely in MySQL database

### 📅 **Multiple Views**
- **List View**: Searchable, filterable, and sortable birthday list
- **Calendar View**: Beautiful month grid showing all birthdays
- **Dashboard**: Statistics and upcoming birthday insights
- **Responsive Design**: Works perfectly on desktop and mobile

### 🔍 **Advanced Features**
- **Search & Filter**: Find birthdays by name, notes, or relationship
- **Smart Sorting**: Sort by date, name, relationship, or age
- **Countdown Timers**: See days until each birthday
- **Statistics**: Track total birthdays, monthly counts, and upcoming events

---

## 🛠️ Tech Stack

### **Frontend**
| Technology | Version | Purpose |
|-----------|---------|---------|
| [React](https://reactjs.org/) | 19.1.0 | UI Framework |
| [Vite](https://vitejs.dev/) | 6.3.5 | Build Tool & Dev Server |
| [React Router](https://reactrouter.com/) | 6.30.1 | Client-side Routing |
| [Axios](https://axios-http.com/) | 1.10.0 | HTTP Client |
| Custom CSS | - | Styling & Responsive Design |

### **Backend**
| Technology | Version | Purpose |
|-----------|---------|---------|
| [Node.js](https://nodejs.org/) | - | Runtime Environment |
| [Express.js](https://expressjs.com/) | 4.21.2 | Web Framework |
| [MySQL2](https://github.com/sidorares/node-mysql2) | 3.14.1 | Database Driver |
| [JWT](https://jwt.io/) | 9.0.2 | Authentication |
| [bcryptjs](https://github.com/dcodeIO/bcrypt.js) | 2.4.3 | Password Hashing |

### **Database**
| Technology | Purpose |
|-----------|---------|
| [MySQL](https://mysql.com/) | Primary Database |
| [Docker](https://docker.com/) | Database Containerization |

---

## 🚀 Quick Start

### Prerequisites
- [Node.js](https://nodejs.org/) (v18+ recommended)
- [MySQL](https://mysql.com/) or [Docker](https://docker.com/)
- [Git](https://git-scm.com/)

### 1. Clone the Repository
```bash
git clone https://github.com/SCSBalaji/birthday_remainder_project.git
cd birthday_remainder_project
```

### 2. Setup Database
```bash
# Option A: Using Docker (Recommended)
docker-compose up -d

# Option B: Use existing MySQL installation
# Create database: birthday_reminder
# Create user: br_user with password: br_password
```

### 3. Setup Backend
```bash
cd server
npm install
cp .env.example .env  # Configure your environment variables
npm run dev  # Starts on http://localhost:5000
```

### 4. Setup Frontend
```bash
cd client
npm install
npm run dev  # Starts on http://localhost:5173
```

### 5. Access the Application
- **Frontend**: [http://localhost:5173](http://localhost:5173)
- **Backend API**: [http://localhost:5000](http://localhost:5173)
- **Database**: `localhost:3306`

---

## 📁 Project Structure
```
birthday_remainder_project/
├── client/                 # React Frontend Application
│   ├── public/             # Static assets
│   └── src/
│       ├── components/     # Reusable React components
│       ├── contexts/       # React Context (Auth)
│       ├── services/       # API services
│       ├── App.jsx         # Main application component
│       └── main.jsx        # Application entry point
│   └── package.json        # Frontend dependencies
├── server/                 # Node.js Backend Application
│   ├── middleware/         # Express middleware
│   ├── routes/             # API route handlers
│   ├── index.js            # Server entry point
│   └── package.json        # Backend dependencies
├── docker-compose.yml      # Database setup
└── README.md               # This file
```

---

## 🔧 Configuration
### Environment Variables
Create a `.env` file in the `/server` directory:

```env
PORT=5000
DB_HOST=localhost
DB_PORT=3306
DB_USER=br_user
DB_PASSWORD=br_password
DB_NAME=birthday_reminder
JWT_SECRET=your_secure_jwt_secret_key
```

### Database Schema
The application automatically creates the required tables:
- **users**: User accounts and authentication
- **birthdays**: Birthday data with user relationships

---

## 📱 Usage
1.  **Create Account**
    - Visit the application and click "Sign Up"
    - Enter your name, email, and password
    - Automatic login after registration
2.  **Manage Birthdays**
    - **Add**: Click "Add Birthday" and fill in the details
    - **Edit**: Click the edit icon on any birthday card
    - **Delete**: Click the delete icon and confirm
    - **Search**: Use the search bar to find specific birthdays
3.  **View Options**
    - **List View**: Default view with search, filter, and sort
    - **Calendar View**: Monthly calendar showing all birthdays
    - **Statistics**: See totals and upcoming birthday counts

---

## 🌐 API Endpoints

### Authentication
```
POST /api/auth/register    # Register new user
POST /api/auth/login       # User login
GET  /api/auth/profile     # Get user profile (protected)
```

### Birthdays
```
GET    /api/birthdays         # Get user's birthdays
POST   /api/birthdays         # Create new birthday
PUT    /api/birthdays/:id     # Update birthday
DELETE /api/birthdays/:id     # Delete birthday
GET    /api/birthdays/upcoming # Get upcoming birthdays
```

---

## 🔒 Security Features
- **JWT Authentication**: Secure token-based authentication
- **Password Hashing**: `bcrypt` for secure password storage
- **CORS Protection**: Configured for secure cross-origin requests
- **Input Validation**: Server-side validation for all inputs
- **SQL Injection Protection**: Parameterized queries
- **Token Expiry**: Automatic session management

---

## 🚀 Deployment
### Production Setup
- **Database**: Use managed MySQL service (AWS RDS, PlanetScale, etc.)
- **Backend**: Deploy to VPS, Heroku, or cloud platform
- **Frontend**: Deploy to Vercel, Netlify, or similar
- **Environment**: Update API URLs and database connections

### Recommended Platforms
- **Frontend**: [Vercel](https://vercel.com/), [Netlify](https://netlify.com/)
- **Backend**: [Railway](https://railway.app/), [Render](https://render.com/)
- **Database**: [PlanetScale](https://planetscale.com/), [AWS RDS](https://aws.amazon.com/rds/)

---

## 🤝 Contributing
1. Fork the repository
2. Create your feature branch (`git checkout -b feature/AmazingFeature`)
3. Commit your changes (`git commit -m 'Add some AmazingFeature'`)
4. Push to the branch (`git push origin feature/AmazingFeature`)
5. Open a Pull Request

---

## 📄 License
This project is licensed under the MIT License - see the [LICENSE]() file for details.

---

## 👨‍💻 Author
**SCSBalaji** - [@SCSBalaji](https://github.com/SCSBalaji)

- **📧 Email**: [Contact via GitHub](https://github.com/SCSBalaji)
- **🌐 GitHub**: [SCSBalaji](https://github.com/SCSBalaji)

---

## 🙏 Acknowledgments
- React team for the amazing framework
- Express.js community for the robust backend solution
- MySQL for reliable data persistence
- Vite for lightning-fast development experience

---

## 📊 Project Status
- ✅ Authentication System: Complete
- ✅ CRUD Operations: Complete
- ✅ Database Integration: Complete
- ✅ UI/UX Design: Complete
- ✅ Responsive Design: Complete
- ✅ API Security: Complete
- 🚀 **Production Ready**: Yes

*Last Updated: 2025-07-05 by @SCSBalaji*

---

Built with ❤️ by SCS Balaji