const express = require('express');
const cors = require('cors');
const mysql = require('mysql2/promise');
require('dotenv').config();

// Import routes
const authRoutes = require('./routes/auth');
const birthdayRoutes = require('./routes/birthdays');

const app = express();
const PORT = process.env.PORT || 5000;

// Middleware
app.use(cors());
app.use(express.json());

// Database connection
let db;

async function connectToDatabase() {
  try {
    db = await mysql.createConnection({
      host: process.env.DB_HOST,
      port: process.env.DB_PORT,
      user: process.env.DB_USER,
      password: process.env.DB_PASSWORD,
      database: process.env.DB_NAME
    });
    
    console.log('✅ Connected to MySQL database');
    await createTables();
  } catch (error) {
    console.error('❌ Database connection failed:', error.message);
  }
}

// Create tables if they don't exist
async function createTables() {
  try {
    // Users table
    await db.execute(`
      CREATE TABLE IF NOT EXISTS users (
        id INT AUTO_INCREMENT PRIMARY KEY,
        name VARCHAR(255) NOT NULL,
        email VARCHAR(255) UNIQUE NOT NULL,
        password VARCHAR(255) NOT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // Birthdays table
    await db.execute(`
      CREATE TABLE IF NOT EXISTS birthdays (
        id INT AUTO_INCREMENT PRIMARY KEY,
        user_id INT NOT NULL,
        name VARCHAR(255) NOT NULL,
        date DATE NOT NULL,
        relationship VARCHAR(100),
        bio TEXT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
      )
    `);

    console.log('✅ Database tables created/verified');
  } catch (error) {
    console.error('❌ Error creating tables:', error.message);
  }
}

// Middleware to make database available in routes
app.use((req, res, next) => {
  req.db = db;
  next();
});

// Routes
app.use('/api/auth', authRoutes);
app.use('/api/birthdays', birthdayRoutes);

// Test routes
app.get('/', (req, res) => {
  res.json({ message: 'Birthday Buddy Backend is running!' });
});

app.get('/health', (req, res) => {
  res.json({ status: 'OK', timestamp: new Date().toISOString() });
});

app.get('/test-db', async (req, res) => {
  try {
    const [rows] = await db.execute('SELECT 1 as test');
    res.json({ message: 'Database connection successful!', data: rows });
  } catch (error) {
    res.status(500).json({ error: 'Database connection failed', details: error.message });
  }
});

// Start server
app.listen(PORT, async () => {
  console.log(`🚀 Server is running on port ${PORT}`);
  await connectToDatabase();
});