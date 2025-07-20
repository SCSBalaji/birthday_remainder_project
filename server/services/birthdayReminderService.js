// server/services/birthdayReminderService.js
const { 
  createEmailReminder, 
  getPendingReminders, 
  markReminderAsSent, 
  markReminderAsFailed,
  getUserEmailPreferences 
} = require('./reminderService');
const { sendBirthdayReminderEmail } = require('./emailService');

// Calculate days until birthday
const calculateDaysUntilBirthday = (birthdayDate) => {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  
  const thisYear = today.getFullYear();
  const birthday = new Date(birthdayDate);
  birthday.setFullYear(thisYear);
  birthday.setHours(0, 0, 0, 0);
  
  // If birthday already passed this year, set to next year
  if (birthday < today) {
    birthday.setFullYear(thisYear + 1);
  }
  
  const diffTime = birthday - today;
  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  
  return diffDays;
};

// Create reminders for all users' birthdays
const createRemindersForAllBirthdays = async (db) => {
  try {
    console.log('📅 Creating birthday reminders for all users...');
    
    // Get all birthdays with user information
    const [birthdays] = await db.execute(`
      SELECT b.*, u.id as user_id, u.name as user_name, u.email as user_email
      FROM birthdays b
      JOIN users u ON b.user_id = u.id
      WHERE u.email_verified_at IS NOT NULL
    `);
    
    console.log(`🔍 Found ${birthdays.length} birthdays to process`);
    
    let remindersCreated = 0;
    const today = new Date();
    const todayStr = today.toISOString().split('T')[0];
    
    console.log(`📅 Today is: ${todayStr}`);
    
    for (const birthday of birthdays) {
      const daysUntil = calculateDaysUntilBirthday(birthday.date);
      
      console.log(`🔍 Processing ${birthday.name}: ${daysUntil} days until birthday (${birthday.date})`);
      
      // Check if user has email preferences (if not, they'll get defaults)
      let preferences;
      try {
        preferences = await getUserEmailPreferences(db, birthday.user_id);
        console.log(`👤 User ${birthday.user_name} preferences:`, {
          reminders_enabled: preferences.birthday_reminders_enabled,
          reminder_7_days: preferences.reminder_7_days,
          reminder_3_days: preferences.reminder_3_days,
          reminder_1_day: preferences.reminder_1_day
        });
      } catch (error) {
        console.error(`❌ Error getting preferences for user ${birthday.user_id}:`, error);
        continue;
      }
      
      if (!preferences.birthday_reminders_enabled) {
        console.log(`⏭️ Skipping reminders for user ${birthday.user_id} (disabled)`);
        continue;
      }
      
      // Check what reminders are needed TODAY
      const reminderTypes = [
        { type: '7_days', days: 7, enabled: preferences.reminder_7_days },
        { type: '3_days', days: 3, enabled: preferences.reminder_3_days },
        { type: '1_day', days: 1, enabled: preferences.reminder_1_day }
      ];
      
      for (const reminderType of reminderTypes) {
        console.log(`🔍 Checking ${reminderType.type} reminder: days=${reminderType.days}, enabled=${reminderType.enabled}, daysUntil=${daysUntil}`);
        
        if (!reminderType.enabled) {
          console.log(`⏭️ Skipping ${reminderType.type} reminder (disabled by user)`);
          continue;
        }
        
        // Create reminder if birthday is exactly the right number of days away
        if (daysUntil === reminderType.days) {
          console.log(`✅ Creating ${reminderType.type} reminder for ${birthday.name}`);
          
          try {
            const reminderId = await createEmailReminder(
              db,
              birthday.user_id,
              birthday.id,
              reminderType.type,
              todayStr // Schedule for today since we need to send it today
            );
            
            if (reminderId) {
              remindersCreated++;
              console.log(`✅ Created ${reminderType.type} reminder (ID: ${reminderId}) for ${birthday.name} (${birthday.user_name})`);
            } else {
              console.log(`⚠️ Reminder already exists for ${birthday.name} (${reminderType.type})`);
            }
          } catch (error) {
            console.error(`❌ Error creating reminder:`, error);
          }
        } else {
          console.log(`⏭️ No ${reminderType.type} reminder needed (${daysUntil} days != ${reminderType.days} days)`);
        }
      }
    }
    
    console.log(`📧 Total reminders created: ${remindersCreated}`);
    return remindersCreated;
    
  } catch (error) {
    console.error('❌ Error creating birthday reminders:', error);
    throw error;
  }
};

// Process and send pending reminders for today
const processPendingReminders = async (db) => {
  try {
    const today = new Date().toISOString().split('T')[0];
    console.log(`📧 Processing pending reminders for ${today}...`);
    
    const pendingReminders = await getPendingReminders(db, today);

    if (pendingReminders.length === 0) {
      console.log('✅ No pending reminders for today');
      return { sent: 0, failed: 0 };
    }

    console.log(`📧 Found ${pendingReminders.length} pending reminders`);

    let sent = 0;
    let failed = 0;

    for (const reminder of pendingReminders) {
      try {
        console.log(`📧 Processing reminder: ${reminder.reminder_type} for ${reminder.birthday_name} to ${reminder.user_email}`);
        
        // Check if user has reminders enabled
        if (!reminder.birthday_reminders_enabled) {
          console.log(`⏭️ Skipping reminder ${reminder.id} (user disabled)`);
          continue;
        }
        
        // Send the reminder email
        const result = await sendBirthdayReminderEmail(reminder);
        
        if (result.success) {
          await markReminderAsSent(db, reminder.id);
          sent++;
          console.log(`✅ Sent reminder: ${reminder.reminder_type} for ${reminder.birthday_name} to ${reminder.user_name}`);
        } else {
          await markReminderAsFailed(db, reminder.id);
          failed++;
          console.log(`❌ Failed to send reminder ${reminder.id}: ${result.error}`);
        }
        
      } catch (error) {
        console.error(`❌ Error processing reminder ${reminder.id}:`, error);
        await markReminderAsFailed(db, reminder.id);
        failed++;
      }
    }

    console.log(`📧 Reminder processing complete: ${sent} sent, ${failed} failed`);
    return { sent, failed };
    
  } catch (error) {
    console.error('❌ Error processing pending reminders:', error);
    throw error;
  }
};

module.exports = {
  calculateDaysUntilBirthday,
  createRemindersForAllBirthdays,
  processPendingReminders
};