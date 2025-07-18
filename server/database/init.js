const { getConnection } = require('./connection');

const createTables = async () => {
  try {
    const connection = getConnection();

    // Users table
    await connection.execute(`
      CREATE TABLE IF NOT EXISTS users (
        id INT AUTO_INCREMENT PRIMARY KEY,
        name VARCHAR(255) NOT NULL,
        email VARCHAR(255) UNIQUE NOT NULL,
        password VARCHAR(255) NOT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // Birthdays table
    await connection.execute(`
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

    // Email reminders tracking table
    await connection.execute(`
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
    await connection.execute(`
      CREATE TABLE IF NOT EXISTS user_email_preferences (
        id INT AUTO_INCREMENT PRIMARY KEY,
        user_id INT NOT NULL,
        receive_email_reminders BOOLEAN DEFAULT TRUE,
        reminder_time TIME DEFAULT '09:00:00',
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
      )
    `);

    console.log('✅ Database tables created/verified');
  } catch (error) {
    console.error('❌ Error creating tables:', error.message);
    throw error;
  }
};

module.exports = { createTables };