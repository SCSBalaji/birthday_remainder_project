const express = require('express');
const cors = require('cors');
const cron = require('node-cron');
const mysql = require('mysql2/promise');
const chatbotRoutes = require('./routes/chatbot');
const { createSmartReminders, optimizeReminderTiming, generateReminderInsights } = require('./services/smartSchedulingService');
require('dotenv').config();

// Import routes
const authRoutes = require('./routes/auth');
const birthdayRoutes = require('./routes/birthdays');
const preferencesRoutes = require('./routes/preferences');

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
app.use('/api/chatbot', chatbotRoutes);
app.use('/api/birthdays', birthdayRoutes);
app.use('/api/preferences', preferencesRoutes);

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

// Automated Birthday Reminder System
async function startBirthdayReminderScheduler() {
  console.log('🎂 Starting Birthday Reminder Scheduler...');
  
// Schedule to run daily at 12:00 AM IST (6:30 PM UTC)
    cron.schedule('30 18 * * *', async () => {
    console.log('🕘 [CRON] Running daily birthday reminder check at', new Date().toISOString());
    
    try {
      if (!db) {
        console.error('❌ [CRON] Database not available');
        return;
      }
      
      const { createRemindersForAllBirthdays, processPendingReminders } = require('./services/birthdayReminderService');
      
      console.log('📅 [CRON] Step 1: Creating new reminders for upcoming birthdays...');
      const remindersCreated = await createRemindersForAllBirthdays(db);
      
      console.log('📧 [CRON] Step 2: Processing and sending pending reminders...');
      const sendResults = await processPendingReminders(db);
      
      console.log('✅ [CRON] Daily reminder job completed:', {
        reminders_created: remindersCreated,
        emails_sent: sendResults.sent,
        emails_failed: sendResults.failed,
        timestamp: new Date().toISOString()
      });
      
    } catch (error) {
      console.error('❌ [CRON] Birthday reminder job failed:', error);
    }
  }, {
    scheduled: true,
    timezone: "UTC"
  });
  
  console.log('✅ Birthday reminder cron job scheduled (daily at 12:00 AM IST / 6:30 PM UTC)');
  
  // Optional: Run once on startup for testing
  console.log('🧪 Running initial birthday reminder check...');
  try {
    const { createRemindersForAllBirthdays, processPendingReminders } = require('./services/birthdayReminderService');
    const remindersCreated = await createRemindersForAllBirthdays(db);
    const sendResults = await processPendingReminders(db);
    console.log('✅ Initial reminder check completed:', {
      reminders_created: remindersCreated,
      emails_sent: sendResults.sent,
      emails_failed: sendResults.failed
    });
  } catch (error) {
    console.error('❌ Initial reminder check failed:', error);
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
  await startBirthdayReminderScheduler(); // <-- Add this line
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

// Helper function to check and send immediate reminders for a specific birthday
async function checkImmediateReminders(birthdayId, userId) {
  try {
    console.log(`🎂 [IMMEDIATE] Checking immediate reminders for birthday ID: ${birthdayId}`);
    
    if (!db) {
      console.error('❌ [IMMEDIATE] Database not available');
      return { success: false, error: 'Database not available' };
    }
    
    // Get the specific birthday details
    const [birthdays] = await db.execute(`
      SELECT b.*, u.id as user_id, u.name as user_name, u.email as user_email
      FROM birthdays b
      JOIN users u ON b.user_id = u.id
      WHERE b.id = ? AND b.user_id = ?
    `, [birthdayId, userId]);
    
    if (birthdays.length === 0) {
      console.log('⚠️ [IMMEDIATE] Birthday not found');
      return { success: false, error: 'Birthday not found' };
    }
    
    const birthday = birthdays[0];
    console.log(`🔍 [IMMEDIATE] Processing birthday: ${birthday.name} (${birthday.date})`);
    
    const { calculateDaysUntilBirthday } = require('./services/birthdayReminderService');
    const daysUntil = calculateDaysUntilBirthday(birthday.date);
    
    console.log(`📅 [IMMEDIATE] Days until birthday: ${daysUntil}`);
    
    // Check if we need to create immediate reminders (1, 3, or 7 days)
    const reminderTypes = [
      { type: '7_days', days: 7 },
      { type: '3_days', days: 3 },
      { type: '1_day', days: 1 }
    ];
    
    // Import functions outside the loop
    const { createEmailReminder, markReminderAsSent } = require('./services/reminderService');
    const { sendBirthdayReminderEmail } = require('./services/emailService');
    const today = new Date().toISOString().split('T')[0];
    
    let remindersCreated = 0;
    let emailsSent = 0;
    
    for (const reminderType of reminderTypes) {
      if (daysUntil === reminderType.days) {
        console.log(`✅ [IMMEDIATE] Creating ${reminderType.type} reminder for ${birthday.name}`);
        
        // Create the reminder
        const reminderId = await createEmailReminder(
          db,
          birthday.user_id,
          birthday.id,
          reminderType.type,
          today
        );
        
        if (reminderId) {
          remindersCreated++;
          console.log(`✅ [IMMEDIATE] Created ${reminderType.type} reminder (ID: ${reminderId})`);
          
          // ✨ FIX: Send only this specific reminder, not all pending ones
          try {
            // Get the specific reminder we just created
            const [specificReminder] = await db.execute(`
              SELECT er.*, b.name as birthday_name, b.date as birthday_date, b.relationship, b.bio,
                     u.name as user_name, u.email as user_email,
                     uep.birthday_reminders_enabled, uep.reminder_7_days, uep.reminder_3_days, uep.reminder_1_day
              FROM email_reminders er
              JOIN birthdays b ON er.birthday_id = b.id
              JOIN users u ON er.user_id = u.id
              LEFT JOIN user_email_preferences uep ON er.user_id = uep.user_id
              WHERE er.id = ?
            `, [reminderId]);
            
            if (specificReminder.length > 0) {
              const reminder = specificReminder[0];
              console.log(`📧 [IMMEDIATE] Sending specific reminder: ${reminder.reminder_type} for ${reminder.birthday_name}`);
              
              // Send the specific email
              const emailResult = await sendBirthdayReminderEmail(reminder);
              
              if (emailResult.success) {
                await markReminderAsSent(db, reminderId);
                emailsSent++;
                console.log(`✅ [IMMEDIATE] Email sent successfully for ${reminder.birthday_name}`);
              } else {
                console.log(`❌ [IMMEDIATE] Email failed for ${reminder.birthday_name}: ${emailResult.error}`);
              }
            }
            
          } catch (emailError) {
            console.error('❌ [IMMEDIATE] Error sending specific email:', emailError);
          }
        }
      }
    }
    
    const result = {
      success: true,
      birthday_name: birthday.name,
      days_until: daysUntil,
      reminders_created: remindersCreated,
      emails_sent: emailsSent
    };
    
    console.log(`✅ [IMMEDIATE] Immediate reminder check completed:`, result);
    return result;
    
  } catch (error) {
    console.error('❌ [IMMEDIATE] Error in immediate reminder check:', error);
    return { success: false, error: error.message };
  }
}

// Immediate reminder test route
app.get('/test-immediate-reminders/:birthdayId', async (req, res) => {
  const { birthdayId } = req.params;
  const userId = 1; // For testing, use a fixed user ID (change as needed)
  
  try {
    const result = await checkImmediateReminders(birthdayId, userId);
    res.json(result);
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// Migration endpoint for email preferences enhancement
app.get('/migrate-email-preferences', async (req, res) => {
  try {
    console.log('🔄 [MIGRATION] Starting email preferences schema migration...');
    
    // Step 1: Add new columns to user_email_preferences table
    const newColumns = [
      'reminder_14_days BOOLEAN DEFAULT FALSE',
      'reminder_custom_1_days INT DEFAULT NULL',
      'reminder_custom_2_days INT DEFAULT NULL', 
      'reminder_time_7_days TIME DEFAULT "09:00:00"',
      'reminder_time_3_days TIME DEFAULT "09:00:00"',
      'reminder_time_1_day TIME DEFAULT "09:00:00"',
      'user_timezone VARCHAR(50) DEFAULT "Asia/Kolkata"',
      'notification_frequency ENUM("minimal", "standard", "maximum") DEFAULT "standard"'
    ];
    
    const addedColumns = [];
    const existingColumns = [];
    
    for (const column of newColumns) {
      const columnName = column.split(' ')[0];
      try {
        await req.db.execute(`ALTER TABLE user_email_preferences ADD COLUMN ${column}`);
        addedColumns.push(columnName);
        console.log(`✅ [MIGRATION] Added column: ${columnName}`);
      } catch (error) {
        if (error.code === 'ER_DUP_FIELDNAME') {
          existingColumns.push(columnName);
          console.log(`ℹ️ [MIGRATION] Column already exists: ${columnName}`);
        } else {
          throw error;
        }
      }
    }
    
    // Step 2: Update existing users with default values
    console.log('🔄 [MIGRATION] Updating existing user preferences...');
    
    const [updateResult] = await req.db.execute(`
      UPDATE user_email_preferences 
      SET 
        reminder_14_days = FALSE,
        reminder_time_7_days = "09:00:00",
        reminder_time_3_days = "09:00:00", 
        reminder_time_1_day = "09:00:00",
        user_timezone = "Asia/Kolkata",
        notification_frequency = "standard"
      WHERE reminder_14_days IS NULL OR user_timezone IS NULL
    `);
    
    console.log(`✅ [MIGRATION] Updated ${updateResult.affectedRows} existing user preferences`);
    
    // Step 3: Verify the schema
    const [columns] = await req.db.execute(`
      SHOW COLUMNS FROM user_email_preferences
    `);
    
    const columnNames = columns.map(col => col.Field);
    console.log('📋 [MIGRATION] Current table columns:', columnNames);
    
    res.json({
      success: true,
      message: 'Email preferences schema migration completed successfully',
      details: {
        added_columns: addedColumns,
        existing_columns: existingColumns,
        users_updated: updateResult.affectedRows,
        total_columns: columnNames.length,
        all_columns: columnNames
      }
    });
    
  } catch (error) {
    console.error('❌ [MIGRATION] Schema migration failed:', error);
    res.status(500).json({
      success: false,
      error: error.message,
      message: 'Schema migration failed'
    });
  }
});

// Test advanced reminder processing
app.get('/test-advanced-reminders', async (req, res) => {
  try {
    console.log('🧪 [TEST] Testing advanced reminder processing...');
    
    const { processAdvancedBirthdayReminders } = require('./services/advancedReminderService');
    const result = await processAdvancedBirthdayReminders(db);
    
    res.json({
      success: true,
      message: 'Advanced reminder processing test completed',
      data: result
    });
    
  } catch (error) {
    console.error('❌ [TEST] Advanced reminder test failed:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// Final database enhancement for Phase 2
app.get('/enhance-database-phase2', async (req, res) => {
  try {
    console.log('🔄 [PHASE2] Starting Phase 2 database enhancements...');
    
    const enhancements = [];
    const errors = [];
    
    // Add updated_at trigger to user_email_preferences if not exists
    try {
      await req.db.execute(`
        ALTER TABLE user_email_preferences 
        MODIFY COLUMN updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
      `);
      enhancements.push('Updated timestamp behavior for user_email_preferences');
    } catch (error) {
      if (!error.message.includes('duplicate')) {
        errors.push(`Timestamp update: ${error.message}`);
      }
    }
    
    // Add email_reminders table enhancements
    try {
      await req.db.execute(`
        ALTER TABLE email_reminders 
        ADD COLUMN scheduled_date DATE DEFAULT NULL AFTER scheduled_for
      `);
      enhancements.push('Added scheduled_date column to email_reminders');
    } catch (error) {
      if (error.code !== 'ER_DUP_FIELDNAME') {
        errors.push(`Email reminders enhancement: ${error.message}`);
      } else {
        enhancements.push('scheduled_date column already exists');
      }
    }
    
    // Create preferences history table for tracking changes
    try {
      await req.db.execute(`
        CREATE TABLE IF NOT EXISTS user_preference_history (
          id INT AUTO_INCREMENT PRIMARY KEY,
          user_id INT NOT NULL,
          changed_field VARCHAR(100) NOT NULL,
          old_value TEXT,
          new_value TEXT,
          changed_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
          INDEX idx_user_changed (user_id, changed_at)
        )
      `);
      enhancements.push('Created user_preference_history table');
    } catch (error) {
      errors.push(`Preference history table: ${error.message}`);
    }
    
    // Update existing user preferences to have proper defaults
    try {
      const [updateResult] = await req.db.execute(`
        UPDATE user_email_preferences 
        SET 
          reminder_time_7_days = COALESCE(reminder_time_7_days, '09:00:00'),
          reminder_time_3_days = COALESCE(reminder_time_3_days, '09:00:00'),
          reminder_time_1_day = COALESCE(reminder_time_1_day, '09:00:00'),
          user_timezone = COALESCE(user_timezone, 'Asia/Kolkata'),
          notification_frequency = COALESCE(notification_frequency, 'standard')
        WHERE reminder_time_7_days IS NULL 
           OR reminder_time_3_days IS NULL 
           OR reminder_time_1_day IS NULL
           OR user_timezone IS NULL
           OR notification_frequency IS NULL
      `);
      
      enhancements.push(`Updated ${updateResult.affectedRows} user preferences with proper defaults`);
    } catch (error) {
      errors.push(`Preferences update: ${error.message}`);
    }
    
    // Get final table statistics
    const [userCount] = await req.db.execute('SELECT COUNT(*) as count FROM users');
    const [prefsCount] = await req.db.execute('SELECT COUNT(*) as count FROM user_email_preferences');
    const [remindersCount] = await req.db.execute('SELECT COUNT(*) as count FROM email_reminders');
    
    res.json({
      success: true,
      message: 'Phase 2 database enhancements applied successfully',
      details: {
        enhancements: enhancements,
        errors: errors,
        total_users: userCount[0].count,
        total_preferences: prefsCount[0].count,
        total_reminders: remindersCount[0].count
      }
    });
    
  } catch (error) {
    console.error('❌ [PHASE2] Error applying enhancements:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// Test advanced email templates
app.get('/test-advanced-email/:birthdayId', async (req, res) => {
  try {
    const { birthdayId } = req.params;
    const { reminder_type = '3_days' } = req.query;
    
    console.log(`📧 [TEST] Testing advanced email template for birthday ${birthdayId}`);
    
    // Get birthday and user details
    const [birthdays] = await db.execute(`
      SELECT b.*, u.id as user_id, u.name as user_name, u.email as user_email,
             uep.notification_frequency, uep.user_timezone
      FROM birthdays b
      JOIN users u ON b.user_id = u.id
      LEFT JOIN user_email_preferences uep ON u.id = uep.user_id
      WHERE b.id = ?
    `, [birthdayId]);
    
    if (birthdays.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Birthday not found'
      });
    }
    
    const birthday = birthdays[0];
    
    // Create test reminder data
    const reminderData = {
      user_email: birthday.user_email,
      user_name: birthday.user_name,
      birthday_name: birthday.name,
      birthday_date: birthday.date,
      relationship: birthday.relationship,
      bio: birthday.bio,
      reminder_type: reminder_type,
      user_id: birthday.user_id,
      user_timezone: birthday.user_timezone || 'Asia/Kolkata'
    };
    
    // Send the advanced email
    const { sendBirthdayReminderEmail } = require('./services/emailService');
    const result = await sendBirthdayReminderEmail(reminderData);
    
    if (result.success) {
      res.json({
        success: true,
        message: `Advanced ${reminder_type.replace('_', '-')} email sent successfully!`,
        data: {
          birthday_name: birthday.name,
          email_sent_to: birthday.user_email,
          reminder_type: reminder_type,
          message_id: result.messageId,
          template_features: [
            'Personalized greeting',
            'Relationship-based messaging',
            'Smart gift suggestions',
            'Urgency-based styling',
            'Mobile-responsive design'
          ]
        }
      });
    } else {
      res.status(500).json({
        success: false,
        message: 'Failed to send advanced email',
        error: result.error
      });
    }
    
  } catch (error) {
    console.error('❌ [TEST] Advanced email test failed:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// Basic email test endpoint
app.get('/test-basic-email/:birthdayId', async (req, res) => {
  try {
    const { birthdayId } = req.params;
    const { reminder_type = '3_days' } = req.query;
    
    console.log(`📧 [TEST] Testing basic email for birthday ${birthdayId}, type: ${reminder_type}`);
    
    // Get birthday and user details
    const [birthdays] = await req.db.execute(`
      SELECT b.*, u.id as user_id, u.name as user_name, u.email as user_email
      FROM birthdays b
      JOIN users u ON b.user_id = u.id
      WHERE b.id = ?
    `, [birthdayId]);
    
    if (birthdays.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Birthday not found'
      });
    }
    
    const birthday = birthdays[0];
    
    console.log(`📧 [TEST] Found birthday:`, {
      name: birthday.name,
      date: birthday.date,
      user: birthday.user_name,
      email: birthday.user_email
    });
    
    // Create reminder data
    const reminderData = {
      user_email: birthday.user_email,
      user_name: birthday.user_name,
      birthday_name: birthday.name,
      birthday_date: birthday.date,
      relationship: birthday.relationship,
      bio: birthday.bio,
      reminder_type: reminder_type
    };
    
    console.log(`📧 [TEST] Sending email with data:`, reminderData);
    
    // Send email using existing service
    const { sendBirthdayReminderEmail } = require('./services/emailService');
    const result = await sendBirthdayReminderEmail(reminderData);
    
    if (result.success) {
      console.log(`✅ [TEST] Email sent successfully:`, result);
      
      res.json({
        success: true,
        message: `Test ${reminder_type.replace('_', '-')} email sent successfully! 📧`,
        data: {
          birthday_name: birthday.name,
          email_sent_to: birthday.user_email,
          reminder_type: reminder_type,
          message_id: result.messageId,
          user_name: birthday.user_name,
          test_details: {
            relationship: birthday.relationship,
            bio: birthday.bio,
            date: birthday.date
          }
        }
      });
    } else {
      console.error(`❌ [TEST] Email failed:`, result);
      
      res.status(500).json({
        success: false,
        message: 'Failed to send test email',
        error: result.error,
        details: {
          birthday_name: birthday.name,
          email_target: birthday.user_email,
          reminder_type: reminder_type
        }
      });
    }
    
  } catch (error) {
    console.error('❌ [TEST] Email test failed:', error);
    res.status(500).json({
      success: false,
      error: error.message,
      message: 'Email test endpoint error'
    });
  }
});

// Get all birthdays for testing
app.get('/list-birthdays-for-email-test', async (req, res) => {
  try {
    const [birthdays] = await db.execute(`
      SELECT b.id, b.name, b.date, b.relationship, u.name as user_name, u.email as user_email
      FROM birthdays b
      JOIN users u ON b.user_id = u.id
      ORDER BY b.name
    `);
    
    res.json({
      success: true,
      message: `Found ${birthdays.length} birthdays for email testing`,
      data: {
        birthdays: birthdays,
        test_urls: birthdays.map(b => ({
          id: b.id,
          name: b.name,
          user: b.user_name,
          test_url_1_day: `${req.protocol}://${req.get('host')}/test-advanced-email/${b.id}?reminder_type=1_day`,
          test_url_3_days: `${req.protocol}://${req.get('host')}/test-advanced-email/${b.id}?reminder_type=3_days`,
          test_url_7_days: `${req.protocol}://${req.get('host')}/test-advanced-email/${b.id}?reminder_type=7_days`
        }))
      }
    });
    
  } catch (error) {
    console.error('❌ Error listing birthdays:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// 1. Smart Reminder Creation for specific user
app.get('/api/smart/create-reminders/:userId', async (req, res) => {
  try {
    const { userId } = req.params;
    console.log(`🧠 [SMART] Creating intelligent reminders for user ${userId}`);
    
    // Get user's birthdays
    const [birthdays] = await req.db.execute(`
      SELECT b.*, u.name as user_name, u.email as user_email
      FROM birthdays b
      JOIN users u ON b.user_id = u.id
      WHERE b.user_id = ?
    `, [userId]);
    
    if (birthdays.length === 0) {
      return res.json({
        success: true,
        message: 'No birthdays found for this user',
        data: {
          user_id: userId,
          birthdays_processed: 0,
          reminders_created: 0
        }
      });
    }
    
    // Get user preferences
    const { getUserEmailPreferences } = require('./services/reminderService');
    const userPreferences = await getUserEmailPreferences(req.db, userId);
    
    // Process each birthday with smart scheduling
    const results = [];
    let totalReminders = 0;
    
    for (const birthday of birthdays) {
      const result = await createSmartReminders(req.db, userId, birthday, userPreferences);
      results.push(result);
      if (result.success) {
        totalReminders += result.remindersCreated;
      }
    }
    
    res.json({
      success: true,
      message: `Smart reminders created for user ${userId}`,
      data: {
        user_id: userId,
        user_name: birthdays[0].user_name,
        birthdays_processed: birthdays.length,
        total_reminders_created: totalReminders,
        individual_results: results,
        preferences_used: {
          reminders_enabled: userPreferences.birthday_reminders_enabled,
          reminder_7_days: userPreferences.reminder_7_days,
          reminder_3_days: userPreferences.reminder_3_days,
          reminder_1_day: userPreferences.reminder_1_day
        }
      }
    });
    
  } catch (error) {
    console.error('❌ [SMART] Smart reminder creation failed:', error);
    res.status(500).json({
      success: false,
      error: error.message,
      message: 'Failed to create smart reminders'
    });
  }
});

// 2. User Behavior Analytics
app.get('/api/smart/analyze-behavior/:userId', async (req, res) => {
  try {
    const { userId } = req.params;
    console.log(`📊 [SMART] Analyzing behavior for user ${userId}`);
    
    const analysis = await optimizeReminderTiming(req.db, userId);
    
    // Get additional user stats
    const [userStats] = await req.db.execute(`
      SELECT 
        u.name,
        u.email,
        COUNT(b.id) as total_birthdays,
        COUNT(CASE WHEN er.status = 'sent' THEN 1 END) as successful_reminders,
        COUNT(CASE WHEN er.status = 'failed' THEN 1 END) as failed_reminders,
        COUNT(er.id) as total_reminders
      FROM users u
      LEFT JOIN birthdays b ON u.id = b.user_id
      LEFT JOIN email_reminders er ON u.id = er.user_id
      WHERE u.id = ?
      GROUP BY u.id
    `, [userId]);
    
    const stats = userStats[0] || { total_birthdays: 0, successful_reminders: 0, failed_reminders: 0, total_reminders: 0 };
    
    res.json({
      success: true,
      message: `Behavior analysis complete for user ${userId}`,
      data: {
        user_id: userId,
        user_name: stats.name,
        analysis_results: analysis,
        user_statistics: {
          total_birthdays: stats.total_birthdays,
          total_reminders_sent: stats.total_reminders,
          successful_reminders: stats.successful_reminders,
          failed_reminders: stats.failed_reminders,
          success_rate: stats.total_reminders > 0 ? 
            `${((stats.successful_reminders / stats.total_reminders) * 100).toFixed(1)}%` : '0%'
        },
        analyzed_at: new Date().toISOString()
      }
    });
    
  } catch (error) {
    console.error('❌ [SMART] Behavior analysis failed:', error);
    res.status(500).json({
      success: false,
      error: error.message,
      message: 'Failed to analyze user behavior'
    });
  }
});

// 3. Personalized Insights Dashboard
app.get('/api/smart/insights/:userId', async (req, res) => {
  try {
    const { userId } = req.params;
    console.log(`💡 [SMART] Generating insights for user ${userId}`);
    
    const insights = await generateReminderInsights(req.db, userId);
    
    // Get additional context
    const [recentActivity] = await req.db.execute(`
      SELECT er.reminder_type, er.status, er.sent_at, b.name as birthday_name, b.relationship
      FROM email_reminders er
      JOIN birthdays b ON er.birthday_id = b.id
      WHERE er.user_id = ?
      ORDER BY er.created_at DESC
      LIMIT 10
    `, [userId]);
    
    res.json({
      success: true,
      message: `Personalized insights generated for user ${userId}`,
      data: {
        user_id: userId,
        insights: insights.insights,
        recent_activity: recentActivity,
        ai_recommendations: [
          '🎯 Enable all reminder types for better coverage',
          '📱 Check your email preferences for optimal timing',
          '🎁 Add more bio information for better gift suggestions',
          '📊 Regular engagement improves our recommendations'
        ],
        next_actions: insights.insights?.recommendedActions || [],
        generated_at: insights.generated_at
      }
    });
    
  } catch (error) {
    console.error('❌ [SMART] Insight generation failed:', error);
    res.status(500).json({
      success: false,
      error: error.message,
      message: 'Failed to generate personalized insights'
    });
  }
});

// 4. Bulk Smart Processing for All Users
app.get('/api/smart/process-all-users', async (req, res) => {
  try {
    console.log('🚀 [SMART] Starting bulk smart processing for all users...');
    
    // Get all active users
    const [users] = await req.db.execute(`
      SELECT DISTINCT u.id, u.name, u.email, COUNT(b.id) as birthday_count
      FROM users u
      LEFT JOIN birthdays b ON u.id = b.user_id
      WHERE u.email_verified_at IS NOT NULL
      GROUP BY u.id
      HAVING birthday_count > 0
      ORDER BY birthday_count DESC
    `);
    
    console.log(`📊 [SMART] Processing ${users.length} users with birthdays`);
    
    const { getUserEmailPreferences } = require('./services/reminderService');
    
    const processingResults = [];
    let totalRemindersCreated = 0;
    let totalUsersProcessed = 0;
    
    for (const user of users) {
      try {
        console.log(`👤 [SMART] Processing user: ${user.name} (${user.birthday_count} birthdays)`);
        
        // Get user's birthdays
        const [birthdays] = await req.db.execute(`
          SELECT * FROM birthdays WHERE user_id = ?
        `, [user.id]);
        
        // Get user preferences
        const userPreferences = await getUserEmailPreferences(req.db, user.id);
        
        let userReminders = 0;
        const userResults = [];
        
        // Process each birthday
        for (const birthday of birthdays) {
          const result = await createSmartReminders(req.db, user.id, birthday, userPreferences);
          userResults.push(result);
          if (result.success) {
            userReminders += result.remindersCreated;
          }
        }
        
        totalRemindersCreated += userReminders;
        totalUsersProcessed++;
        
        processingResults.push({
          user_id: user.id,
          user_name: user.name,
          birthdays_count: birthdays.length,
          reminders_created: userReminders,
          success: true
        });
        
      } catch (userError) {
        console.error(`❌ [SMART] Failed to process user ${user.id}:`, userError);
        processingResults.push({
          user_id: user.id,
          user_name: user.name,
          error: userError.message,
          success: false
        });
      }
    }
    
    console.log(`✅ [SMART] Bulk processing complete: ${totalUsersProcessed} users, ${totalRemindersCreated} reminders`);
    
    res.json({
      success: true,
      message: `Bulk smart processing completed successfully`,
      data: {
        processing_summary: {
          total_users_found: users.length,
          users_processed_successfully: totalUsersProcessed,
          total_reminders_created: totalRemindersCreated,
          processing_time: new Date().toISOString()
        },
        individual_results: processingResults,
        performance_metrics: {
          average_reminders_per_user: totalUsersProcessed > 0 ? 
            (totalRemindersCreated / totalUsersProcessed).toFixed(2) : 0,
          success_rate: `${((totalUsersProcessed / users.length) * 100).toFixed(1)}%`
        }
      }
    });
    
  } catch (error) {
    console.error('❌ [SMART] Bulk processing failed:', error);
    res.status(500).json({
      success: false,
      error: error.message,
      message: 'Bulk smart processing failed'
    });
  }
});

// 5. Real-time Recommendations for Specific Birthday
app.get('/api/smart/recommendations/:birthdayId', async (req, res) => {
  try {
    const { birthdayId } = req.params;
    console.log(`🎯 [SMART] Generating recommendations for birthday ${birthdayId}`);
    
    // Get birthday details
    const [birthdays] = await req.db.execute(`
      SELECT b.*, u.name as user_name, u.email as user_email
      FROM birthdays b
      JOIN users u ON b.user_id = u.id
      WHERE b.id = ?
    `, [birthdayId]);
    
    if (birthdays.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Birthday not found'
      });
    }
    
    const birthday = birthdays[0];
    
    // Calculate days until birthday
    const today = new Date();
    const birthdayDate = new Date(birthday.date);
    const thisYear = today.getFullYear();
    birthdayDate.setFullYear(thisYear);
    
    if (birthdayDate < today) {
      birthdayDate.setFullYear(thisYear + 1);
    }
    
    const daysUntil = Math.ceil((birthdayDate - today) / (1000 * 60 * 60 * 24));
    
    // Generate recommendations using our template service
    const { generateGiftSuggestions, generateBirthdayMessage } = require('./services/advancedEmailTemplateService');
    
    const giftSuggestions = generateGiftSuggestions(birthday.relationship, birthday.bio);
    const contextualMessage = generateBirthdayMessage(birthday.name, birthday.relationship, daysUntil, {});
    
    // Generate timing recommendations
    const timingRecommendations = [];
    if (daysUntil <= 1) {
      timingRecommendations.push('🚨 URGENT: Same-day delivery or digital gifts recommended');
      timingRecommendations.push('📱 Send a personal message or call immediately');
    } else if (daysUntil <= 3) {
      timingRecommendations.push('⚡ Quick action needed: 2-3 day shipping still possible');
      timingRecommendations.push('🎁 Local pickup or experience gifts work great');
    } else if (daysUntil <= 7) {
      timingRecommendations.push('📦 Standard shipping will arrive in time');
      timingRecommendations.push('🎉 Great time to plan something special');
    } else {
      timingRecommendations.push('⭐ Plenty of time for thoughtful planning');
      timingRecommendations.push('💡 Consider unique or custom gifts');
    }
    
    res.json({
      success: true,
      message: `Recommendations generated for ${birthday.name}`,
      data: {
        birthday_details: {
          id: birthday.id,
          name: birthday.name,
          date: birthday.date,
          relationship: birthday.relationship,
          bio: birthday.bio,
          days_until: daysUntil
        },
        gift_suggestions: giftSuggestions,
        timing_recommendations: timingRecommendations,
        contextual_message: contextualMessage,
        urgency_level: daysUntil <= 1 ? 'critical' : 
                      daysUntil <= 3 ? 'high' : 
                      daysUntil <= 7 ? 'medium' : 'low',
        recommended_actions: [
          daysUntil <= 1 ? 'Take immediate action' : 'Plan ahead',
          'Check gift suggestions above',
          'Set calendar reminder',
          'Consider personal preferences'
        ],
        generated_at: new Date().toISOString()
      }
    });
    
  } catch (error) {
    console.error('❌ [SMART] Recommendation generation failed:', error);
    res.status(500).json({
      success: false,
      error: error.message,
      message: 'Failed to generate recommendations'
    });
  }
});

// Enhanced Production Health Check
app.get('/health', async (req, res) => {
  try {
    const healthCheck = {
      status: 'healthy',
      timestamp: new Date().toISOString(),
      uptime: process.uptime(),
      environment: process.env.NODE_ENV || 'development',
      version: require('./package.json').version || '1.0.0',
      services: {
        database: 'checking...',
        email: 'checking...',
        smartScheduling: 'checking...'
      },
      metrics: {
        memoryUsage: process.memoryUsage(),
        cpuUsage: process.cpuUsage(),
        activeConnections: 'calculating...'
      }
    };

    // Test database connection
    try {
      await req.db.execute('SELECT 1');
      healthCheck.services.database = 'healthy';
    } catch (dbError) {
      healthCheck.services.database = 'unhealthy';
      healthCheck.status = 'degraded';
    }

    // Test email service
    try {
      const nodemailer = require('nodemailer');
      const transporter = nodemailer.createTransporter({
        service: 'gmail',
        auth: {
          user: process.env.EMAIL_USER,
          pass: process.env.EMAIL_PASS
        }
      });
      await transporter.verify();
      healthCheck.services.email = 'healthy';
    } catch (emailError) {
      healthCheck.services.email = 'degraded';
    }

    // Test smart scheduling
    try {
      const { generateReminderInsights } = require('./services/smartSchedulingService');
      healthCheck.services.smartScheduling = 'healthy';
    } catch (smartError) {
      healthCheck.services.smartScheduling = 'degraded';
      healthCheck.status = 'degraded';
    }

    // Get system metrics
    const [userCount] = await req.db.execute('SELECT COUNT(*) as count FROM users');
    const [birthdayCount] = await req.db.execute('SELECT COUNT(*) as count FROM birthdays');
    const [reminderCount] = await req.db.execute('SELECT COUNT(*) as count FROM email_reminders');

    healthCheck.metrics = {
      ...healthCheck.metrics,
      totalUsers: userCount[0].count,
      totalBirthdays: birthdayCount[0].count,
      totalReminders: reminderCount[0].count,
      memoryUsageMB: Math.round(process.memoryUsage().heapUsed / 1024 / 1024)
    };

    const statusCode = healthCheck.status === 'healthy' ? 200 : 
                      healthCheck.status === 'degraded' ? 200 : 503;

    res.status(statusCode).json(healthCheck);

  } catch (error) {
    res.status(503).json({
      status: 'unhealthy',
      timestamp: new Date().toISOString(),
      error: error.message
    });
  }
});

// Production Metrics Endpoint
app.get('/metrics', async (req, res) => {
  try {
    const [stats] = await req.db.execute(`
      SELECT 
        (SELECT COUNT(*) FROM users WHERE email_verified_at IS NOT NULL) as verified_users,
        (SELECT COUNT(*) FROM birthdays) as total_birthdays,
        (SELECT COUNT(*) FROM email_reminders WHERE status = 'sent') as emails_sent,
        (SELECT COUNT(*) FROM email_reminders WHERE status = 'failed') as emails_failed,
        (SELECT COUNT(*) FROM email_reminders WHERE created_at >= DATE_SUB(NOW(), INTERVAL 24 HOUR)) as reminders_24h,
        (SELECT COUNT(*) FROM users WHERE created_at >= DATE_SUB(NOW(), INTERVAL 7 DAY)) as new_users_7d
    `);

    const metrics = {
      timestamp: new Date().toISOString(),
      system: {
        uptime_seconds: process.uptime(),
        memory_heap_used_mb: Math.round(process.memoryUsage().heapUsed / 1024 / 1024),
        memory_heap_total_mb: Math.round(process.memoryUsage().heapTotal / 1024 / 1024),
        memory_external_mb: Math.round(process.memoryUsage().external / 1024 / 1024)
      },
      application: {
        verified_users: stats[0].verified_users,
        total_birthdays: stats[0].total_birthdays,
        emails_sent_total: stats[0].emails_sent,
        emails_failed_total: stats[0].emails_failed,
        success_rate: stats[0].emails_sent > 0 ? 
          ((stats[0].emails_sent / (stats[0].emails_sent + stats[0].emails_failed)) * 100).toFixed(2) + '%' : '0%',
        reminders_created_24h: stats[0].reminders_24h,
        new_users_7d: stats[0].new_users_7d
      }
    };

    res.json(metrics);

  } catch (error) {
    res.status(500).json({
      error: 'Failed to collect metrics',
      message: error.message
    });
  }
});

module.exports = {
  checkImmediateReminders
};