const express = require('express');
const cors = require('cors');
const mysql = require('mysql2/promise');
require('dotenv').config();

// Import routes
const authRoutes = require('./routes/auth');
const birthdayRoutes = require('./routes/birthdays');

// Add this import at the top with other imports
const { cleanExpiredTokens } = require('./utils/tokenUtils');

const app = express();
const PORT = process.env.PORT || 5000;

// Middleware
// New CORS configuration for Codespaces
app.use(cors({
  origin: [
    'https://crispy-orbit-x55rwvrvq567fvq47-5173.app.github.dev',
    'http://localhost:5173',
    'http://127.0.0.1:5173'
  ],
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Origin', 'X-Requested-With', 'Content-Type', 'Accept', 'Authorization']
}));

app.use(express.json());

// Additional CORS headers for OPTIONS requests
app.use((req, res, next) => {
  res.header('Access-Control-Allow-Origin', 'https://crispy-orbit-x55rwvrvq567fvq47-5173.app.github.dev');
  res.header('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  res.header('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept, Authorization');
  res.header('Access-Control-Allow-Credentials', 'true');
  
  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }
  next();
});

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
    // Users table with email verification fields
    await db.execute(`
      CREATE TABLE IF NOT EXISTS users (
        id INT AUTO_INCREMENT PRIMARY KEY,
        name VARCHAR(255) NOT NULL,
        email VARCHAR(255) UNIQUE NOT NULL,
        password VARCHAR(255) NOT NULL,
        email_verified BOOLEAN DEFAULT FALSE,
        email_verified_at TIMESTAMP NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // Email verification tokens table
    await db.execute(`
      CREATE TABLE IF NOT EXISTS email_verifications (
        id INT AUTO_INCREMENT PRIMARY KEY,
        user_id INT NOT NULL,
        token VARCHAR(255) UNIQUE NOT NULL,
        expires_at TIMESTAMP NOT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        used_at TIMESTAMP NULL,
        FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
        INDEX idx_token (token),
        INDEX idx_expires (expires_at)
      )
    `);

    // Birthdays table (unchanged)
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

// Add this temporary endpoint to fix the database schema
app.get('/fix-database', async (req, res) => {
  try {
    // Check if columns already exist and add them if they don't
    try {
      await db.execute(`ALTER TABLE users ADD COLUMN email_verified BOOLEAN DEFAULT FALSE`);
      console.log('✅ Added email_verified column');
    } catch (error) {
      if (error.code !== 'ER_DUP_FIELDNAME') {
        throw error;
      }
      console.log('ℹ️ email_verified column already exists');
    }
    
    try {
      await db.execute(`ALTER TABLE users ADD COLUMN email_verified_at TIMESTAMP NULL`);
      console.log('✅ Added email_verified_at column');
    } catch (error) {
      if (error.code !== 'ER_DUP_FIELDNAME') {
        throw error;
      }
      console.log('ℹ️ email_verified_at column already exists');
    }
    
    res.json({ success: true, message: 'Database schema updated successfully' });
  } catch (error) {
    console.error('❌ Error updating database schema:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// Add this endpoint to recreate tables if needed
app.get('/recreate-tables', async (req, res) => {
  try {
    // Drop existing tables in correct order (foreign key constraints)
    await db.execute('SET FOREIGN_KEY_CHECKS = 0');
    await db.execute('DROP TABLE IF EXISTS email_verifications');
    await db.execute('DROP TABLE IF EXISTS birthdays');
    await db.execute('DROP TABLE IF EXISTS users');
    await db.execute('SET FOREIGN_KEY_CHECKS = 1');
    
    // Recreate tables with new schema
    await createTables();
    
    console.log('✅ Tables recreated successfully');
    res.json({ success: true, message: 'All tables recreated successfully' });
  } catch (error) {
    console.error('❌ Error recreating tables:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// Add this function after connectToDatabase()
async function startCleanupScheduler() {
  // Clean expired tokens every 10 minutes
  setInterval(async () => {
    if (db) {
      await cleanExpiredTokens(db);
    }
  }, 10 * 60 * 1000); // 10 minutes

  // Initial cleanup on startup
  if (db) {
    await cleanExpiredTokens(db);
  }
}

// Add this temporary test route to see verification tokens
app.get('/test-verification-tokens', async (req, res) => {
  try {
    const [rows] = await db.execute(`
      SELECT ev.token, ev.expires_at, ev.created_at, u.email, u.name 
      FROM email_verifications ev 
      JOIN users u ON ev.user_id = u.id 
      WHERE ev.used_at IS NULL 
      ORDER BY ev.created_at DESC 
      LIMIT 5
    `);
    res.json({ tokens: rows });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Start server
app.listen(PORT, '0.0.0.0', async () => {
  console.log(`🚀 Server is running on http://0.0.0.0:${PORT}`);
  console.log(`🔗 Access via: http://localhost:${PORT} or http://127.0.0.1:${PORT}`);
  await connectToDatabase();
  await startCleanupScheduler();
});