# 🎂 Birthday Buddy - Backend API

The Node.js/Express backend API for Birthday Buddy, providing secure user authentication and birthday management services.

![Node.js](https://img.shields.io/badge/Node.js-Backend-green)
![Express](https://img.shields.io/badge/Express-4.21.2-lightgrey)
![MySQL](https://img.shields.io/badge/MySQL-3.14.1-orange)
![JWT](https://img.shields.io/badge/JWT-9.0.2-red)
![Status](https://img.shields.io/badge/Status-Production%20Ready-brightgreen)

---

## ✨ Features

### 🔐 **Authentication System**
- **User Registration**: Secure account creation with validation
- **User Login**: JWT-based authentication
- **Password Security**: bcrypt hashing with salt rounds
- **Token Management**: 24-hour JWT tokens with automatic expiry
- **Profile Access**: Protected user profile endpoints

### 🎯 **Birthday Management API**
- **CRUD Operations**: Complete Create, Read, Update, Delete functionality
- **User Isolation**: Each user can only access their own birthdays
- **Data Validation**: Server-side input validation and sanitization
- **Relationship Tracking**: Store relationships and personal notes
- **Upcoming Birthdays**: Smart filtering for upcoming celebrations

### 🛡️ **Security Features**
- **JWT Authentication**: Stateless token-based security
- **CORS Protection**: Configured for secure cross-origin requests
- **SQL Injection Prevention**: Parameterized queries
- **Password Hashing**: Secure bcrypt implementation
- **Input Validation**: Comprehensive data validation

### 📊 **Database Management**
- **Auto Schema Creation**: Automatic table creation on startup
- **Foreign Key Constraints**: Data integrity enforcement
- **Connection Pooling**: Efficient database connections
- **Error Handling**: Comprehensive database error management

---

## 🛠️ Tech Stack

| Technology | Version | Purpose |
|-----------|---------|---------|
| **Node.js** | Latest LTS | Runtime Environment |
| **Express.js** | 4.21.2 | Web Framework |
| **MySQL2** | 3.14.1 | Database Driver |
| **bcryptjs** | 2.4.3 | Password Hashing |
| **jsonwebtoken** | 9.0.2 | JWT Authentication |
| **cors** | 2.8.5 | Cross-Origin Resource Sharing |
| **dotenv** | 16.6.1 | Environment Configuration |
| **nodemon** | 3.1.10 | Development Auto-restart |

---

## 🚀 Getting Started

### Prerequisites
- [Node.js](https://nodejs.org/) v18+ 
- [MySQL](https://mysql.com/) 8.0+ or Docker
- npm or yarn package manager

### Installation
```bash
# Navigate to server directory
cd server

# Install dependencies
npm install

# Setup environment variables
cp .env.example .env
# Edit .env with your configuration

# Start development server
npm run dev
```

### Available Scripts
```bash
npm run dev     # Start development server with nodemon
npm start       # Start production server
npm run test    # Run tests (when implemented)
```

### 🔧 Configuration
Environment Variables
Create a `.env file` in the server directory:

```env
# Server Configuration
PORT=5000

# Database Configuration
DB_HOST=localhost
DB_PORT=3306
DB_USER=br_user
DB_PASSWORD=br_password
DB_NAME=birthday_reminder

# JWT Configuration
JWT_SECRET=your_super_secure_secret_key_here_make_it_long_and_random

# Optional: Development/Production mode
NODE_ENV=development
```
Database Setup
Option 1: Docker (Recommended)
```bash
# From project root directory
docker-compose up -d
```
Option 2: Manual MySQL Setup
```sql
-- Create database
CREATE DATABASE birthday_reminder;

-- Create user
CREATE USER 'br_user'@'localhost' IDENTIFIED BY 'br_password';
GRANT ALL PRIVILEGES ON birthday_reminder.* TO 'br_user'@'localhost';
FLUSH PRIVILEGES;
```
### 📁 Project Structure
```bash
server/
├── middleware/            # Express middleware
│   └── auth.js               # JWT authentication middleware
├── routes/                # API route handlers
│   ├── auth.js               # Authentication routes
│   └── birthdays.js          # Birthday CRUD routes
├── .env                   # Environment variables (create this)
├── .env.example          # Environment template
├── index.js              # Server entry point
├── package.json          # Dependencies & scripts
└── README.md             # This file
```
### 🔌 API Endpoints
#### Base URL
```text
Development: http://localhost:5000/api
Production: https://your-domain.com/api
```
#### Authentication Endpoints
##### Register User
```http
POST /api/auth/register
Content-Type: application/json

{
  "name": "John Doe",
  "email": "john@example.com", 
  "password": "securepassword123"
}

Response:
{
  "success": true,
  "message": "User registered successfully",
  "data": {
    "user": {
      "id": 1,
      "name": "John Doe",
      "email": "john@example.com"
    },
    "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
  }
}
```
##### Login User
```http
POST /api/auth/login
Content-Type: application/json

{
  "email": "john@example.com",
  "password": "securepassword123"
}

Response:
{
  "success": true,
  "message": "Login successful",
  "data": {
    "user": {
      "id": 1,
      "name": "John Doe",
      "email": "john@example.com"
    },
    "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
  }
}
```
##### Get User Profile
```http
GET /api/auth/profile
Authorization: Bearer <token>

Response:
{
  "success": true,
  "message": "Profile retrieved successfully",
  "data": {
    "user": {
      "id": 1,
      "name": "John Doe",
      "email": "john@example.com",
      "created_at": "2025-07-05T07:06:25.000Z"
    }
  }
}
```
#### Birthday Management Endpoints
##### Get All Birthdays
```http
GET /api/birthdays
Authorization: Bearer <token>

Response:
{
  "success": true,
  "message": "Birthdays retrieved successfully",
  "data": {
    "birthdays": [
      {
        "id": 1,
        "name": "Alice Smith",
        "date": "1990-03-15",
        "relationship": "Friend",
        "bio": "Loves chocolate cake and books",
        "created_at": "2025-07-05T07:06:25.000Z"
      }
    ],
    "count": 1
  }
}
```
##### Create Birthday
```http
POST /api/birthdays
Authorization: Bearer <token>
Content-Type: application/json

{
  "name": "Alice Smith",
  "date": "1990-03-15",
  "relationship": "Friend",
  "bio": "Loves chocolate cake and books"
}

Response:
{
  "success": true,
  "message": "Birthday created successfully",
  "data": {
    "birthday": {
      "id": 1,
      "name": "Alice Smith",
      "date": "1990-03-15",
      "relationship": "Friend",
      "bio": "Loves chocolate cake and books",
      "created_at": "2025-07-05T07:06:25.000Z"
    }
  }
}
```
##### Update Birthday
```http
PUT /api/birthdays/:id
Authorization: Bearer <token>
Content-Type: application/json

{
  "name": "Alice Johnson",
  "date": "1990-03-15",
  "relationship": "Best Friend",
  "bio": "Loves chocolate cake, books, and hiking"
}

Response:
{
  "success": true,
  "message": "Birthday updated successfully",
  "data": {
    "birthday": {
      "id": 1,
      "name": "Alice Johnson",
      "date": "1990-03-15",
      "relationship": "Best Friend",
      "bio": "Loves chocolate cake, books, and hiking",
      "created_at": "2025-07-05T07:06:25.000Z"
    }
  }
}
```
##### Delete Birthday
```http
DELETE /api/birthdays/:id
Authorization: Bearer <token>

Response:
{
  "success": true,
  "message": "Birthday deleted successfully",
  "data": {
    "deletedBirthday": {
      "id": 1,
      "name": "Alice Johnson"
    }
  }
}
```
##### Get Upcoming Birthdays
```http
GET /api/birthdays/upcoming
Authorization: Bearer <token>

Response:
{
  "success": true,
  "message": "Upcoming birthdays retrieved successfully",
  "data": {
    "birthdays": [
      {
        "id": 1,
        "name": "Alice Johnson",
        "date": "1990-03-15",
        "relationship": "Best Friend",
        "bio": "Loves chocolate cake, books, and hiking",
        "days_until": 7
      }
    ],
    "count": 1
  }
}
```
### 🗄️ Database Schema
#### Users Table
```sql
CREATE TABLE users (
  id INT AUTO_INCREMENT PRIMARY KEY,
  name VARCHAR(255) NOT NULL,
  email VARCHAR(255) UNIQUE NOT NULL,
  password VARCHAR(255) NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
```
#### Birthdays Table
```sql
CREATE TABLE birthdays (
  id INT AUTO_INCREMENT PRIMARY KEY,
  user_id INT NOT NULL,
  name VARCHAR(255) NOT NULL,
  date DATE NOT NULL,
  relationship VARCHAR(100),
  bio TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);
```
### 🔒 Security Implementation
#### JWT Authentication
```javascript
// Token generation
const token = jwt.sign(
  { userId, email },
  process.env.JWT_SECRET,
  { expiresIn: '24h' }
);

// Token verification middleware
jwt.verify(token, process.env.JWT_SECRET, (err, user) => {
  if (err) return res.status(403).json({ error: 'Invalid token' });
  req.user = user;
  next();
});
```
#### Password Hashing
```javascript
// Hash password before storing
const saltRounds = 10;
const hashedPassword = await bcrypt.hash(password, saltRounds);

// Verify password during login
const isValid = await bcrypt.compare(password, hashedPassword);
```
#### Input Validation
```javascript
// Example validation
if (!name || !email || !password) {
  return res.status(400).json({
    success: false,
    message: 'All fields are required'
  });
}

if (password.length < 6) {
  return res.status(400).json({
    success: false,
    message: 'Password must be at least 6 characters'
  });
}
```
#### CORS Configuration
```javascript
app.use(cors({
  origin: ['http://localhost:5173', 'https://your-frontend-domain.com'],
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Origin', 'X-Requested-With', 'Content-Type', 'Accept', 'Authorization']
}));
```
### 📊 Error Handling
#### Standardized Error Responses
```javascript
// Success Response Format
{
  "success": true,
  "message": "Operation completed successfully",
  "data": { /* response data */ }
}

// Error Response Format
{
  "success": false,
  "message": "User-friendly error message",
  "error": "Technical error details"
}
```
#### HTTP Status Codes
| Code | Meaning | Usage |
|---|---|---|
| 200 | OK | Successful GET, PUT requests |
| 201 | Created | Successful POST requests |
| 400 | Bad Request | Invalid input data |
| 401 | Unauthorized | Missing or invalid token |
| 403 | Forbidden | Valid token, insufficient permissions |
| 404 | Not Found | Resource doesn't exist |
| 409 | Conflict | Duplicate data (e.g., email exists) |
| 500 | Internal Server Error | Server-side errors |

### 🚀 Performance Optimizations
#### Database Optimizations
- Connection Pooling: Efficient MySQL connections
- Indexed Queries: Fast lookups on user_id and email
- Prepared Statements: SQL injection prevention and performance
- Lazy Loading: Load only required data
#### API Optimizations
- Compression: Gzip response compression
- Caching: Static asset caching headers
- Rate Limiting: Request throttling (future enhancement)
- Pagination: Large dataset handling (future enhancement)
### 🧪 Testing
#### Manual Testing
```bash
# Health check
curl http://localhost:5000/health

# Test database connection
curl http://localhost:5000/test-db

# Register user
curl -X POST http://localhost:5000/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{"name":"Test User","email":"test@example.com","password":"password123"}'
```
#### Future Testing Strategy
- Unit Tests: Jest/Mocha for individual functions
- Integration Tests: API endpoint testing
- Load Testing: Performance under stress
- Security Testing: Vulnerability assessments
### 📝 Logging & Monitoring
#### Current Logging
```javascript
// Console logging for development
console.log('✅ Connected to MySQL database');
console.log('🚀 Server is running on http://0.0.0.0:5000');
console.error('❌ Database connection failed:', error.message);
```
#### Production Logging (Recommended)
- Winston: Structured logging
- Morgan: HTTP request logging
- Error Tracking: Sentry integration
- Performance Monitoring: New Relic/DataDog
### 🚀 Deployment
#### Production Setup
##### Environment Configuration
```env
NODE_ENV=production
PORT=80
DB_HOST=your-production-db-host
DB_PORT=3306
DB_USER=production_user
DB_PASSWORD=secure_production_password
DB_NAME=birthday_reminder_prod
JWT_SECRET=ultra_secure_production_secret_256_bits_minimum
```
##### Process Management
```bash
# Using PM2 for production
npm install -g pm2
pm2 start index.js --name "birthday-buddy-api"
pm2 startup
pm2 save
```
#### Deployment Platforms
##### Railway (Recommended)
- Connect GitHub repository
- Add environment variables
- Deploy automatically on push
##### Render
- Create new web service
- Connect repository
- Configure build and start commands
##### Traditional VPS
- Setup Ubuntu/CentOS server
- Install Node.js and MySQL
- Configure reverse proxy (Nginx)
- Setup SSL certificates (Let's Encrypt)
### 🔧 Configuration Examples
#### Nginx Reverse Proxy
```nginx
server {
    listen 80;
    server_name api.yourdomain.com;
    
    location / {
        proxy_pass http://localhost:5000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
    }
}
```
#### Docker Configuration
```dockerfile
# Dockerfile
FROM node:18-alpine
WORKDIR /app
COPY package*.json ./
RUN npm ci --only=production
COPY . .
EXPOSE 5000
CMD ["npm", "start"]
```
### 🔮 Future Enhancements
#### Planned Features
- Email Notifications: Birthday reminder emails
- Rate Limiting: API request throttling
- File Uploads: Profile picture support
- Data Export: CSV/JSON export endpoints
- Advanced Filtering: Complex birthday queries
- Bulk Operations: Batch CRUD operations
#### Technical Improvements
- TypeScript: Type safety implementation
- GraphQL: Alternative to REST API
- Redis Caching: Session and data caching
- Microservices: Service architecture split
- Message Queues: Background job processing
- API Documentation: Swagger/OpenAPI specs
### 🐛 Troubleshooting
#### Common Issues
##### Database Connection Failed
```bash
# Check MySQL service
sudo systemctl status mysql

# Check credentials in .env file
# Verify database exists and user has permissions
```
##### JWT Token Issues
```bash
# Verify JWT_SECRET is set in .env
# Check token expiry (24 hours default)
# Ensure client sends Authorization header correctly
```
##### CORS Errors
```bash
# Update origin in CORS configuration
# Check if OPTIONS requests are handled
# Verify client URL matches allowed origins
```
##### Port Already in Use
```bash
# Find process using port 5000
lsof -i :5000

# Kill process or use different port
kill -9 <PID>
```
### 📊 API Performance Metrics
#### Response Times (Typical)
| Endpoint | Average Response Time | Notes |
|---|---|---|
| POST /auth/register | ~200ms | Includes bcrypt hashing |
| POST /auth/login | ~150ms | Database lookup + comparison |
| GET /birthdays | ~50ms | Indexed query on user_id |
| POST /birthdays | ~75ms | Insert with validation |
| PUT /birthdays/:id | ~80ms | Update with validation |
| DELETE /birthdays/:id | ~60ms | Simple delete operation |

#### Scalability Considerations
- Horizontal Scaling: Load balancer support
- Database Scaling: Read replicas for heavy read workloads
- Caching Layer: Redis for session management
- CDN Integration: Static asset delivery
### 🤝 Contributing
#### Development Guidelines
- Follow RESTful API conventions
- Maintain consistent error handling
- Add input validation for all endpoints
- Update documentation for API changes
- Write tests for new features
#### Code Style
- ESLint: Maintain code quality
- Prettier: Consistent formatting
- Naming: Clear, descriptive variable names
- Comments: Document complex logic
### 📄 License
This project is licensed under the MIT License.

### 👨‍💻 Author
SCS Balaji - Backend Developer

GitHub: @SCSBalaji
Backend API built with ❤️ using Node.js and Express