const { calculateDaysUntilBirthday } = require('./birthdayReminderService');
const { createEmailReminder } = require('./reminderService');
const { sendBirthdayReminderEmail } = require('./emailService');
const { markReminderAsSent } = require('./reminderService');

/**
 * Advanced Reminder Scheduling Service
 * Handles custom times, multiple reminder types, and timezone-aware scheduling
 */

// Convert time from user's timezone to UTC for consistent database storage
function convertTimeToUTC(timeString, userTimezone) {
  try {
    // Create a date object for today with the user's time
    const today = new Date();
    const [hours, minutes, seconds] = timeString.split(':').map(Number);
    
    // Create date in user's timezone
    const userTime = new Date(today.getFullYear(), today.getMonth(), today.getDate(), hours, minutes, seconds);
    
    // For now, we'll use a simple offset mapping (can be enhanced later with proper timezone library)
    const timezoneOffsets = {
      'Asia/Kolkata': 330,      // +5:30
      'UTC': 0,                 // +0:00
      'America/New_York': -300, // -5:00 (EST)
      'America/Chicago': -360,  // -6:00 (CST)
      'America/Denver': -420,   // -7:00 (MST)
      'America/Los_Angeles': -480, // -8:00 (PST)
      'Europe/London': 0,       // +0:00 (GMT)
      'Europe/Paris': 60,       // +1:00 (CET)
      'Asia/Tokyo': 540,        // +9:00 (JST)
      'Asia/Shanghai': 480,     // +8:00 (CST)
      'Australia/Sydney': 660,  // +11:00 (AEDT)
      'Asia/Dubai': 240         // +4:00 (GST)
    };
    
    const offsetMinutes = timezoneOffsets[userTimezone] || 330; // Default to IST
    
    // Convert to UTC
    const utcTime = new Date(userTime.getTime() - (offsetMinutes * 60000));
    
    // Return formatted time string
    return utcTime.toTimeString().split(' ')[0]; // HH:MM:SS format
    
  } catch (error) {
    console.error('❌ Error converting time to UTC:', error);
    return timeString; // Fallback to original time
  }
}

// Get all reminder types that should be checked for a user
async function getUserReminderConfiguration(db, userId) {
  try {
    const [preferences] = await db.execute(`
      SELECT * FROM user_email_preferences WHERE user_id = ?
    `, [userId]);
    
    if (preferences.length === 0) {
      // Return default configuration
      return {
        birthday_reminders_enabled: true,
        reminder_types: [
          { type: '7_days', days: 7, enabled: true, time: '09:00:00' },
          { type: '3_days', days: 3, enabled: true, time: '09:00:00' },
          { type: '1_day', days: 1, enabled: true, time: '09:00:00' }
        ],
        timezone: 'Asia/Kolkata',
        notification_frequency: 'standard'
      };
    }
    
    const prefs = preferences[0];
    const reminderTypes = [];
    
    // Standard reminder types
    if (prefs.reminder_14_days) {
      reminderTypes.push({
        type: '14_days',
        days: 14,
        enabled: true,
        time: prefs.reminder_time_7_days || '09:00:00' // Use 7-day time as fallback
      });
    }
    
    if (prefs.reminder_7_days) {
      reminderTypes.push({
        type: '7_days',
        days: 7,
        enabled: true,
        time: prefs.reminder_time_7_days || '09:00:00'
      });
    }
    
    if (prefs.reminder_3_days) {
      reminderTypes.push({
        type: '3_days',
        days: 3,
        enabled: true,
        time: prefs.reminder_time_3_days || '09:00:00'
      });
    }
    
    if (prefs.reminder_1_day) {
      reminderTypes.push({
        type: '1_day',
        days: 1,
        enabled: true,
        time: prefs.reminder_time_1_day || '09:00:00'
      });
    }
    
    // Custom reminder types
    if (prefs.reminder_custom_1_days) {
      reminderTypes.push({
        type: 'custom_1',
        days: prefs.reminder_custom_1_days,
        enabled: true,
        time: prefs.reminder_time_7_days || '09:00:00' // Use 7-day time as default
      });
    }
    
    if (prefs.reminder_custom_2_days) {
      reminderTypes.push({
        type: 'custom_2',
        days: prefs.reminder_custom_2_days,
        enabled: true,
        time: prefs.reminder_time_7_days || '09:00:00' // Use 7-day time as default
      });
    }
    
    return {
      birthday_reminders_enabled: !!prefs.birthday_reminders_enabled,
      reminder_types: reminderTypes,
      timezone: prefs.user_timezone || 'Asia/Kolkata',
      notification_frequency: prefs.notification_frequency || 'standard'
    };
    
  } catch (error) {
    console.error('❌ Error getting user reminder configuration:', error);
    throw error;
  }
}

// Enhanced reminder processing with custom times and preferences
async function processAdvancedBirthdayReminders(db) {
  try {
    const today = new Date().toISOString().split('T')[0];
    console.log(`🚀 [ADVANCED] Starting advanced reminder processing for ${today}...`);
    
    // Get all users with their birthdays and preferences
    const [usersWithBirthdays] = await db.execute(`
      SELECT DISTINCT 
        u.id as user_id, u.name as user_name, u.email as user_email,
        uep.birthday_reminders_enabled, uep.notification_frequency, uep.user_timezone
      FROM users u
      JOIN birthdays b ON u.id = b.user_id
      LEFT JOIN user_email_preferences uep ON u.id = uep.user_id
      WHERE (uep.birthday_reminders_enabled = TRUE OR uep.birthday_reminders_enabled IS NULL)
    `);
    
    console.log(`👥 [ADVANCED] Found ${usersWithBirthdays.length} users with birthdays to check`);
    
    let totalRemindersCreated = 0;
    let totalEmailsSent = 0;
    let totalEmailsFailed = 0;
    
    for (const user of usersWithBirthdays) {
      try {
        console.log(`👤 [ADVANCED] Processing user: ${user.user_name} (${user.user_email})`);
        
        // Get user's reminder configuration
        const config = await getUserReminderConfiguration(db, user.user_id);
        
        if (!config.birthday_reminders_enabled) {
          console.log(`⏭️ [ADVANCED] Skipping ${user.user_name} - reminders disabled`);
          continue;
        }
        
        console.log(`⚙️ [ADVANCED] User config: ${config.reminder_types.length} reminder types, timezone: ${config.timezone}`);
        
        // Get user's birthdays
        const [birthdays] = await db.execute(`
          SELECT * FROM birthdays WHERE user_id = ?
        `, [user.user_id]);
        
        for (const birthday of birthdays) {
          const daysUntil = calculateDaysUntilBirthday(birthday.date);
          console.log(`🎂 [ADVANCED] Checking ${birthday.name}: ${daysUntil} days until birthday`);
          
          // Check each reminder type for this birthday
          for (const reminderType of config.reminder_types) {
            if (daysUntil === reminderType.days) {
              console.log(`✅ [ADVANCED] Creating ${reminderType.type} reminder for ${birthday.name}`);
              
              // Check if reminder already exists for today
              const [existingReminder] = await db.execute(`
                SELECT id FROM email_reminders 
                WHERE user_id = ? AND birthday_id = ? AND reminder_type = ? AND DATE(scheduled_date) = ?
              `, [user.user_id, birthday.id, reminderType.type, today]);
              
              if (existingReminder.length > 0) {
                console.log(`⏭️ [ADVANCED] Reminder already exists for ${birthday.name} (${reminderType.type})`);
                continue;
              }
              
              // Create reminder with custom time
              const reminderId = await createEmailReminder(
                db,
                user.user_id,
                birthday.id,
                reminderType.type,
                today
              );
              
              if (reminderId) {
                totalRemindersCreated++;
                console.log(`✅ [ADVANCED] Created reminder (ID: ${reminderId}) for ${birthday.name}`);
                
                // Send the email immediately
                try {
                  const reminderData = {
                    user_email: user.user_email,
                    user_name: user.user_name,
                    birthday_name: birthday.name,
                    birthday_date: birthday.date,
                    relationship: birthday.relationship,
                    bio: birthday.bio,
                    reminder_type: reminderType.type,
                    days_until: daysUntil,
                    user_timezone: config.timezone
                  };
                  
                  const emailResult = await sendBirthdayReminderEmail(reminderData);
                  
                  if (emailResult.success) {
                    await markReminderAsSent(db, reminderId);
                    totalEmailsSent++;
                    console.log(`📧 [ADVANCED] Email sent successfully for ${birthday.name}`);
                  } else {
                    totalEmailsFailed++;
                    console.log(`❌ [ADVANCED] Email failed for ${birthday.name}: ${emailResult.error}`);
                  }
                  
                } catch (emailError) {
                  totalEmailsFailed++;
                  console.error(`❌ [ADVANCED] Email error for ${birthday.name}:`, emailError);
                }
              }
            }
          }
        }
        
      } catch (userError) {
        console.error(`❌ [ADVANCED] Error processing user ${user.user_name}:`, userError);
      }
    }
    
    const result = {
      success: true,
      date: today,
      users_processed: usersWithBirthdays.length,
      reminders_created: totalRemindersCreated,
      emails_sent: totalEmailsSent,
      emails_failed: totalEmailsFailed
    };
    
    console.log(`✅ [ADVANCED] Advanced reminder processing completed:`, result);
    return result;
    
  } catch (error) {
    console.error('❌ [ADVANCED] Error in advanced reminder processing:', error);
    throw error;
  }
}

// Enhanced immediate reminder check with custom preferences
async function checkAdvancedImmediateReminders(db, birthdayId, userId) {
  try {
    console.log(`🎂 [ADVANCED-IMMEDIATE] Checking advanced immediate reminders for birthday ID: ${birthdayId}`);
    
    // Get the birthday details
    const [birthdays] = await db.execute(`
      SELECT b.*, u.id as user_id, u.name as user_name, u.email as user_email
      FROM birthdays b
      JOIN users u ON b.user_id = u.id
      WHERE b.id = ? AND b.user_id = ?
    `, [birthdayId, userId]);
    
    if (birthdays.length === 0) {
      console.log('⚠️ [ADVANCED-IMMEDIATE] Birthday not found');
      return { success: false, error: 'Birthday not found' };
    }
    
    const birthday = birthdays[0];
    const daysUntil = calculateDaysUntilBirthday(birthday.date);
    
    console.log(`🔍 [ADVANCED-IMMEDIATE] Processing birthday: ${birthday.name} (${daysUntil} days until)`);
    
    // Get user's reminder configuration
    const config = await getUserReminderConfiguration(db, userId);
    
    if (!config.birthday_reminders_enabled) {
      console.log('⏭️ [ADVANCED-IMMEDIATE] Birthday reminders disabled for user');
      return { success: true, message: 'Birthday reminders disabled', emails_sent: 0 };
    }
    
    let remindersCreated = 0;
    let emailsSent = 0;
    const today = new Date().toISOString().split('T')[0];
    
    // Check each configured reminder type
    for (const reminderType of config.reminder_types) {
      if (daysUntil === reminderType.days) {
        console.log(`✅ [ADVANCED-IMMEDIATE] Creating ${reminderType.type} reminder for ${birthday.name}`);
        
        // Create the reminder
        const reminderId = await createEmailReminder(
          db,
          userId,
          birthdayId,
          reminderType.type,
          today
        );
        
        if (reminderId) {
          remindersCreated++;
          
          // Send email immediately
          try {
            const reminderData = {
              user_email: birthday.user_email,
              user_name: birthday.user_name,
              birthday_name: birthday.name,
              birthday_date: birthday.date,
              relationship: birthday.relationship,
              bio: birthday.bio,
              reminder_type: reminderType.type,
              days_until: daysUntil,
              user_timezone: config.timezone
            };
            
            const emailResult = await sendBirthdayReminderEmail(reminderData);
            
            if (emailResult.success) {
              await markReminderAsSent(db, reminderId);
              emailsSent++;
              console.log(`📧 [ADVANCED-IMMEDIATE] Email sent successfully for ${birthday.name}`);
            } else {
              console.log(`❌ [ADVANCED-IMMEDIATE] Email failed: ${emailResult.error}`);
            }
            
          } catch (emailError) {
            console.error('❌ [ADVANCED-IMMEDIATE] Email error:', emailError);
          }
        }
      }
    }
    
    const result = {
      success: true,
      birthday_name: birthday.name,
      days_until: daysUntil,
      reminders_created: remindersCreated,
      emails_sent: emailsSent,
      user_timezone: config.timezone,
      reminder_types_checked: config.reminder_types.length
    };
    
    console.log(`✅ [ADVANCED-IMMEDIATE] Advanced immediate reminder check completed:`, result);
    return result;
    
  } catch (error) {
    console.error('❌ [ADVANCED-IMMEDIATE] Error in advanced immediate reminder check:', error);
    return { success: false, error: error.message };
  }
}

module.exports = {
  convertTimeToUTC,
  getUserReminderConfiguration,
  processAdvancedBirthdayReminders,
  checkAdvancedImmediateReminders
};