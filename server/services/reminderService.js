// server/services/reminderService.js
// Updated to work with your existing database connection pattern

// Helper function to get user's email preferences
const getUserEmailPreferences = async (db, userId) => {
  try {
    const [rows] = await db.execute(
      'SELECT * FROM user_email_preferences WHERE user_id = ?',
      [userId]
    );
    
    // If no preferences exist, create default ones
    if (rows.length === 0) {
      await createDefaultEmailPreferences(db, userId);
      return await getUserEmailPreferences(db, userId);
    }
    
    return rows[0];
  } catch (error) {
    console.error('Error getting user email preferences:', error);
    throw error;
  }
};

// Create default email preferences for new users
const createDefaultEmailPreferences = async (db, userId) => {
  try {
    await db.execute(
      `INSERT INTO user_email_preferences 
       (user_id, birthday_reminders_enabled, reminder_7_days, reminder_3_days, reminder_1_day) 
       VALUES (?, TRUE, TRUE, TRUE, TRUE)`,
      [userId]
    );
    console.log(`✅ Created default email preferences for user ${userId}`);
  } catch (error) {
    console.error('Error creating default email preferences:', error);
    throw error;
  }
};

// Check if a reminder already exists
const reminderExists = async (db, userId, birthdayId, reminderType, scheduledFor) => {
  try {
    const [rows] = await db.execute(
      'SELECT id FROM email_reminders WHERE user_id = ? AND birthday_id = ? AND reminder_type = ? AND scheduled_for = ?',
      [userId, birthdayId, reminderType, scheduledFor]
    );
    return rows.length > 0;
  } catch (error) {
    console.error('Error checking if reminder exists:', error);
    return false;
  }
};

// Create a new email reminder
const createEmailReminder = async (db, userId, birthdayId, reminderType, scheduledFor) => {
  try {
    // Check if reminder already exists
    const exists = await reminderExists(db, userId, birthdayId, reminderType, scheduledFor);
    if (exists) {
      console.log(`⚠️ Reminder already exists for user ${userId}, birthday ${birthdayId}, type ${reminderType}`);
      return null;
    }
    
    const [result] = await db.execute(
      `INSERT INTO email_reminders (user_id, birthday_id, reminder_type, scheduled_for, status) 
       VALUES (?, ?, ?, ?, 'pending')`,
      [userId, birthdayId, reminderType, scheduledFor]
    );
    
    console.log(`✅ Created email reminder: ${reminderType} for user ${userId}`);
    return result.insertId;
  } catch (error) {
    console.error('Error creating email reminder:', error);
    throw error;
  }
};

// Get pending reminders for a specific date
const getPendingReminders = async (db, date) => {
  try {
    const [rows] = await db.execute(
      `SELECT er.*, b.name as birthday_name, b.date as birthday_date, b.relationship, b.bio,
              u.name as user_name, u.email as user_email,
              uep.birthday_reminders_enabled, uep.reminder_7_days, uep.reminder_3_days, uep.reminder_1_day
       FROM email_reminders er
       JOIN birthdays b ON er.birthday_id = b.id
       JOIN users u ON er.user_id = u.id
       LEFT JOIN user_email_preferences uep ON er.user_id = uep.user_id
       WHERE er.scheduled_for = ? AND er.status = 'pending'`,
      [date]
    );
    
    return rows;
  } catch (error) {
    console.error('Error getting pending reminders:', error);
    throw error;
  }
};

// Mark reminder as sent
const markReminderAsSent = async (db, reminderId) => {
  try {
    await db.execute(
      'UPDATE email_reminders SET status = "sent", sent_at = NOW() WHERE id = ?',
      [reminderId]
    );
    console.log(`✅ Marked reminder ${reminderId} as sent`);
  } catch (error) {
    console.error('Error marking reminder as sent:', error);
    throw error;
  }
};

// Mark reminder as failed
const markReminderAsFailed = async (db, reminderId) => {
  try {
    await db.execute(
      'UPDATE email_reminders SET status = "failed" WHERE id = ?',
      [reminderId]
    );
    console.log(`❌ Marked reminder ${reminderId} as failed`);
  } catch (error) {
    console.error('Error marking reminder as failed:', error);
    throw error;
  }
};

module.exports = {
  getUserEmailPreferences,
  createDefaultEmailPreferences,
  reminderExists,
  createEmailReminder,
  getPendingReminders,
  markReminderAsSent,
  markReminderAsFailed
};