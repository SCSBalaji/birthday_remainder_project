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

    // Password reset tokens table
    await db.execute(`
      CREATE TABLE IF NOT EXISTS password_resets (
        id INT AUTO_INCREMENT PRIMARY KEY,
        user_id INT NOT NULL,
        token VARCHAR(255) NOT NULL UNIQUE,
        expires_at TIMESTAMP NOT NULL,
        used_at TIMESTAMP NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
        INDEX idx_token (token),
        INDEX idx_expires (expires_at)
      )
    `);

    // Email reminders table
    await db.execute(`
      CREATE TABLE IF NOT EXISTS email_reminders (
        id INT AUTO_INCREMENT PRIMARY KEY,
        user_id INT NOT NULL,
        birthday_id INT NOT NULL,
        reminder_type ENUM('7_days', '3_days', '1_day') NOT NULL,
        sent_at TIMESTAMP NULL,
        scheduled_for DATE NOT NULL,
        status ENUM('pending', 'sent', 'failed') DEFAULT 'pending',
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
        FOREIGN KEY (birthday_id) REFERENCES birthdays(id) ON DELETE CASCADE,
        UNIQUE KEY unique_reminder (user_id, birthday_id, reminder_type, scheduled_for)
      )
    `);

    // User email preferences table
    await db.execute(`
      CREATE TABLE IF NOT EXISTS user_email_preferences (
        id INT AUTO_INCREMENT PRIMARY KEY,
        user_id INT NOT NULL,
        birthday_reminders_enabled BOOLEAN DEFAULT TRUE,
        reminder_7_days BOOLEAN DEFAULT TRUE,
        reminder_3_days BOOLEAN DEFAULT TRUE,
        reminder_1_day BOOLEAN DEFAULT TRUE,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
        UNIQUE KEY unique_preferences (user_id)
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

// Reset all test data - DEVELOPMENT ONLY
app.delete('/reset-all-data', async (req, res) => {
  try {
    console.log('🗑️ [RESET] Clearing all test data...');
    
    // Clear all tables in correct order (respecting foreign key constraints)
    await db.execute('DELETE FROM email_verifications');
    await db.execute('DELETE FROM birthdays');
    await db.execute('DELETE FROM users');
    
    // Reset auto-increment counters
    await db.execute('ALTER TABLE email_verifications AUTO_INCREMENT = 1');
    await db.execute('ALTER TABLE birthdays AUTO_INCREMENT = 1');
    await db.execute('ALTER TABLE users AUTO_INCREMENT = 1');
    
    console.log('✅ [RESET] All data cleared successfully');
    
    res.json({ 
      success: true,
      message: 'All test data cleared successfully',
      cleared: {
        users: 'All users removed',
        birthdays: 'All birthdays removed', 
        email_verifications: 'All verification tokens removed'
      }
    });
  } catch (error) {
    console.error('❌ [RESET] Error clearing data:', error);
    res.status(500).json({ 
      success: false,
      error: error.message 
    });
  }
});

// Reset only user data (keep birthdays structure)
app.delete('/reset-users-only', async (req, res) => {
  try {
    console.log('🗑️ [RESET] Clearing user data only...');
    
    await db.execute('DELETE FROM email_verifications');
    await db.execute('DELETE FROM birthdays');
    await db.execute('DELETE FROM users');
    
    // Reset auto-increment
    await db.execute('ALTER TABLE users AUTO_INCREMENT = 1');
    await db.execute('ALTER TABLE birthdays AUTO_INCREMENT = 1');
    await db.execute('ALTER TABLE email_verifications AUTO_INCREMENT = 1');
    
    console.log('✅ [RESET] User data cleared successfully');
    
    res.json({ 
      success: true,
      message: 'All user accounts and associated data cleared',
      note: 'You can now register with any email again'
    });
  } catch (error) {
    console.error('❌ [RESET] Error clearing user data:', error);
    res.status(500).json({ 
      success: false,
      error: error.message 
    });
  }
});

// Clear only expired verification tokens
app.delete('/cleanup-expired', async (req, res) => {
  try {
    console.log('🗑️ [CLEANUP] Removing expired verification tokens...');
    
    const [result] = await db.execute(
      'DELETE FROM email_verifications WHERE expires_at < NOW() OR used_at IS NOT NULL'
    );
    
    console.log(`✅ [CLEANUP] Removed ${result.affectedRows} expired/used tokens`);
    
    res.json({ 
      success: true,
      message: `Cleaned up ${result.affectedRows} expired verification tokens`
    });
  } catch (error) {
    console.error('❌ [CLEANUP] Error:', error);
    res.status(500).json({ 
      success: false,
      error: error.message 
    });
  }
});

// Get current data status
app.get('/data-status', async (req, res) => {
  try {
    const [users] = await db.execute('SELECT COUNT(*) as count FROM users');
    const [birthdays] = await db.execute('SELECT COUNT(*) as count FROM birthdays');
    const [tokens] = await db.execute('SELECT COUNT(*) as count FROM email_verifications');
    const [verifiedUsers] = await db.execute('SELECT COUNT(*) as count FROM users WHERE email_verified_at IS NOT NULL');
    const [unverifiedUsers] = await db.execute('SELECT COUNT(*) as count FROM users WHERE email_verified_at IS NULL');
    
    res.json({
      success: true,
      data: {
        total_users: users[0].count,
        verified_users: verifiedUsers[0].count,
        unverified_users: unverifiedUsers[0].count,
        total_birthdays: birthdays[0].count,
        verification_tokens: tokens[0].count
      }
    });
  } catch (error) {
    res.status(500).json({ 
      success: false,
      error: error.message 
    });
  }
});

// Debug endpoint to check user verification status
app.get('/debug/user-status/:email', async (req, res) => {
  try {
    const { email } = req.params;
    
    // Get user details
    const [users] = await db.execute(
      'SELECT id, name, email, email_verified_at, created_at FROM users WHERE email = ?',
      [email]
    );
    
    if (users.length === 0) {
      return res.json({ found: false, message: 'User not found' });
    }
    
    const user = users[0];
    
    // Get verification tokens for this user
    const [tokens] = await db.execute(
      'SELECT token, expires_at, used_at, created_at FROM email_verifications WHERE user_id = ? ORDER BY created_at DESC',
      [user.id]
    );
    
    res.json({
      found: true,
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        email_verified_at: user.email_verified_at,
        is_verified: !!user.email_verified_at,
        created_at: user.created_at
      },
      verification_tokens: tokens.map(token => ({
        token: token.token.substring(0, 20) + '...',
        expires_at: token.expires_at,
        used_at: token.used_at,
        created_at: token.created_at,
        is_expired: new Date(token.expires_at) < new Date(),
        is_used: !!token.used_at
      }))
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Manual verification endpoint for debugging
app.post('/manual-verify-user', async (req, res) => {
  try {
    const { email } = req.body;
    
    console.log(`🔧 [MANUAL] Manually verifying user: ${email}`);
    
    if (!email) {
      return res.status(400).json({
        success: false,
        message: 'Email is required'
      });
    }
    
    // Update user verification status
    const [result] = await db.execute(
      'UPDATE users SET email_verified_at = NOW() WHERE email = ? AND email_verified_at IS NULL',
      [email]
    );
    
    if (result.affectedRows === 0) {
      // Check if user exists
      const [users] = await db.execute('SELECT email_verified_at FROM users WHERE email = ?', [email]);
      
      if (users.length === 0) {
        return res.status(404).json({
          success: false,
          message: 'User not found'
        });
      } else {
        return res.json({
          success: true,
          message: `User ${email} was already verified`,
          affected_rows: 0,
          already_verified: true
        });
      }
    }
    
    console.log(`✅ [MANUAL] User ${email} manually verified successfully`);
    
    res.json({
      success: true,
      message: `User ${email} manually verified successfully`,
      affected_rows: result.affectedRows
    });
    
  } catch (error) {
    console.error('❌ [MANUAL] Manual verification error:', error);
    res.status(500).json({ 
      success: false,
      error: error.message 
    });
  }
});

// Test reminder service functions
app.get('/test-reminder-service', async (req, res) => {
  try {
    const { getUserEmailPreferences } = require('./services/reminderService');
    
    // Test with user ID 1 (change this to an existing user ID in your database)
    const userId = 1;
    
    // Get or create email preferences using req.db
    const preferences = await getUserEmailPreferences(req.db, userId);
    
    res.json({
      success: true,
      message: 'Reminder service test successful',
      data: {
        userId: userId,
        preferences: preferences
      }
    });
  } catch (error) {
    console.error('Test reminder service error:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// Create missing email reminder tables
app.get('/create-reminder-tables', async (req, res) => {
  try {
    console.log('📋 Creating email reminder tables...');
    
    // Create email_reminders table
    await req.db.execute(`
      CREATE TABLE IF NOT EXISTS email_reminders (
        id INT AUTO_INCREMENT PRIMARY KEY,
        user_id INT NOT NULL,
        birthday_id INT NOT NULL,
        reminder_type ENUM('7_days', '3_days', '1_day') NOT NULL,
        sent_at TIMESTAMP NULL,
        scheduled_for DATE NOT NULL,
        status ENUM('pending', 'sent', 'failed') DEFAULT 'pending',
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
        FOREIGN KEY (birthday_id) REFERENCES birthdays(id) ON DELETE CASCADE,
        UNIQUE KEY unique_reminder (user_id, birthday_id, reminder_type, scheduled_for)
      )
    `);
    
    console.log('✅ Created email_reminders table');
    
    // Create user_email_preferences table
    await req.db.execute(`
      CREATE TABLE IF NOT EXISTS user_email_preferences (
        id INT AUTO_INCREMENT PRIMARY KEY,
        user_id INT NOT NULL,
        birthday_reminders_enabled BOOLEAN DEFAULT TRUE,
        reminder_7_days BOOLEAN DEFAULT TRUE,
        reminder_3_days BOOLEAN DEFAULT TRUE,
        reminder_1_day BOOLEAN DEFAULT TRUE,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
        UNIQUE KEY unique_preferences (user_id)
      )
    `);
    
    console.log('✅ Created user_email_preferences table');
    
    res.json({ success: true, message: 'Reminder tables created successfully' });
  } catch (error) {
    console.error('❌ Error creating reminder tables:', error.message);
    res.status(500).json({ success: false, error: error.message });
  }
});

// Test email template rendering
app.get('/test-email-template', async (req, res) => {
  try {
    const { renderEmailTemplate, formatDateForEmail } = require('./services/emailTemplateService');
    
    // Sample data for testing
    const testData = {
      userName: 'John Doe',
      userEmail: 'john@example.com',
      birthdayPersonName: 'Alice Johnson',
      birthdayDate: '1990-03-15',
      formattedBirthdayDate: formatDateForEmail('1990-03-15'),
      relationship: 'Best Friend',
      bio: 'Loves chocolate cake and books'
    };
    
    // Test different reminder types
    const template7Days = await renderEmailTemplate('reminder-7-days', testData);
    const template3Days = await renderEmailTemplate('reminder-3-days', testData);
    const template1Day = await renderEmailTemplate('reminder-1-day', testData);
    
    res.json({
      success: true,
      message: 'Email templates rendered successfully',
      templates: {
        '7_days': template7Days.substring(0, 200) + '...',
        '3_days': template3Days.substring(0, 200) + '...',
        '1_day': template1Day.substring(0, 200) + '...'
      }
    });
  } catch (error) {
    console.error('Template test error:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// Test birthday reminder creation
app.get('/test-create-reminders', async (req, res) => {
  try {
    const { createRemindersForAllBirthdays } = require('./services/birthdayReminderService');
    
    const remindersCreated = await createRemindersForAllBirthdays(req.db);
    
    res.json({
      success: true,
      message: `Created ${remindersCreated} birthday reminders`,
      remindersCreated
    });
  } catch (error) {
    console.error('Create reminders test error:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// Test sending pending reminders
app.get('/test-send-reminders', async (req, res) => {
  try {
    const { processPendingReminders } = require('./services/birthdayReminderService');
    
    const result = await processPendingReminders(req.db);
    
    res.json({
      success: true,
      message: 'Reminder processing complete',
      result
    });
  } catch (error) {
    console.error('Send reminders test error:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// Debug birthday dates and reminder calculations
app.get('/debug-birthdays', async (req, res) => {
  try {
    const { calculateDaysUntilBirthday } = require('./services/birthdayReminderService');
    
    // Get all birthdays with user info
    const [birthdays] = await req.db.execute(`
      SELECT b.*, u.name as user_name, u.email as user_email, u.email_verified_at
      FROM birthdays b
      JOIN users u ON b.user_id = u.id
    `);
    
    const today = new Date();
    const debugInfo = birthdays.map(birthday => {
      const daysUntil = calculateDaysUntilBirthday(birthday.date);
      return {
        id: birthday.id,
        name: birthday.name,
        date: birthday.date,
        user_name: birthday.user_name,
        user_email: birthday.user_email,
        email_verified: !!birthday.email_verified_at,
        days_until_birthday: daysUntil,
        needs_7_day_reminder: daysUntil === 7,
        needs_3_day_reminder: daysUntil === 3,
        needs_1_day_reminder: daysUntil === 1
      };
    });
    
    res.json({
      success: true,
      current_date: today.toISOString().split('T')[0],
      total_birthdays: birthdays.length,
      birthdays: debugInfo,
      summary: {
        need_7_day_reminders: debugInfo.filter(b => b.needs_7_day_reminder).length,
        need_3_day_reminders: debugInfo.filter(b => b.needs_3_day_reminder).length,
        need_1_day_reminders: debugInfo.filter(b => b.needs_1_day_reminder).length
      }
    });
  } catch (error) {
    console.error('Debug birthdays error:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// Create test birthdays for reminder testing (changed to GET)
app.get('/create-test-birthdays', async (req, res) => {
  try {
    const today = new Date();
    
    // Create birthdays for 7 days, 3 days, and 1 day from now
    const testBirthdays = [
      {
        name: 'Test Person 7 Days',
        date: new Date(today.getTime() + 7 * 24 * 60 * 60 * 1000), // 7 days from now
        relationship: 'Friend',
        bio: 'Test birthday for 7-day reminder'
      },
      {
        name: 'Test Person 3 Days',
        date: new Date(today.getTime() + 3 * 24 * 60 * 60 * 1000), // 3 days from now
        relationship: 'Family',
        bio: 'Test birthday for 3-day reminder'
      },
      {
        name: 'Test Person 1 Day',
        date: new Date(today.getTime() + 1 * 24 * 60 * 60 * 1000), // 1 day from now
        relationship: 'Colleague',
        bio: 'Test birthday for 1-day reminder'
      }
    ];
    
    // Get first verified user
    const [users] = await req.db.execute('SELECT id FROM users WHERE email_verified_at IS NOT NULL LIMIT 1');
    
    if (users.length === 0) {
      return res.status(400).json({
        success: false,
        error: 'No verified users found'
      });
    }
    
    const userId = users[0].id;
    const createdBirthdays = [];
    
    for (const birthday of testBirthdays) {
      const dateStr = birthday.date.toISOString().split('T')[0];
      
      const [result] = await req.db.execute(
        'INSERT INTO birthdays (user_id, name, date, relationship, bio) VALUES (?, ?, ?, ?, ?)',
        [userId, birthday.name, dateStr, birthday.relationship, birthday.bio]
      );
      
      createdBirthdays.push({
        id: result.insertId,
        name: birthday.name,
        date: dateStr,
        relationship: birthday.relationship,
        days_until: Math.ceil((birthday.date - today) / (1000 * 60 * 60 * 24))
      });
    }
    
    res.json({
      success: true,
      message: `Created ${createdBirthdays.length} test birthdays`,
      birthdays: createdBirthdays,
      user_id: userId,
      current_date: today.toISOString().split('T')[0]
    });
    
  } catch (error) {
    console.error('Create test birthdays error:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// Clean up test birthdays
app.get('/cleanup-test-birthdays', async (req, res) => {
  try {
    const [result] = await req.db.execute(
      'DELETE FROM birthdays WHERE name LIKE "Test Person%"'
    );
    
    res.json({
      success: true,
      message: `Cleaned up ${result.affectedRows} test birthdays`,
      deleted_count: result.affectedRows
    });
  } catch (error) {
    console.error('Cleanup test birthdays error:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// Start server
app.listen(PORT, '0.0.0.0', async () => {
  console.log(`🚀 Server is running on http://0.0.0.0:${PORT}`);
  console.log(`🔗 Access via: http://localhost:${PORT} or http://127.0.0.1:${PORT}`);
  await connectToDatabase();
  await startCleanupScheduler();
});

// Debug email reminders table
app.get('/debug-email-reminders', async (req, res) => {
  try {
    // Get all email reminders with detailed info
    const [reminders] = await req.db.execute(`
      SELECT er.*, 
             b.name as birthday_name, 
             b.date as birthday_date,
             u.name as user_name, 
             u.email as user_email
      FROM email_reminders er
      JOIN birthdays b ON er.birthday_id = b.id
      JOIN users u ON er.user_id = u.id
      ORDER BY er.created_at DESC
    `);
    
    // Get user preferences
    const [preferences] = await req.db.execute(`
      SELECT uep.*, u.name as user_name, u.email as user_email
      FROM user_email_preferences uep
      JOIN users u ON uep.user_id = u.id
    `);
    
    res.json({
      success: true,
      current_date: new Date().toISOString().split('T')[0],
      total_reminders: reminders.length,
      reminders: reminders,
      user_preferences: preferences
    });
  } catch (error) {
    console.error('Debug email reminders error:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// Clear all email reminders (for testing)
app.get('/clear-email-reminders', async (req, res) => {
  try {
    const [result] = await req.db.execute('DELETE FROM email_reminders');
    
    res.json({
      success: true,
      message: `Cleared ${result.affectedRows} email reminders`,
      deleted_count: result.affectedRows
    });
  } catch (error) {
    console.error('Clear email reminders error:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});