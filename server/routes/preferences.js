const express = require('express');
const { authenticateToken } = require('../middleware/auth');

const router = express.Router();

// All preference routes are protected
router.use(authenticateToken);

// GET /api/preferences - Get user's email preferences
router.get('/', async (req, res) => {
  try {
    console.log(`📋 [PREFERENCES] Getting preferences for user ${req.user.userId}`);
    
    // Get user preferences with fallback to defaults
    const [preferences] = await req.db.execute(`
      SELECT * FROM user_email_preferences WHERE user_id = ?
    `, [req.user.userId]);
    
    let userPrefs;
    
    if (preferences.length === 0) {
      // Create default preferences if none exist
      console.log(`🔧 [PREFERENCES] Creating default preferences for user ${req.user.userId}`);
      
      await req.db.execute(`
        INSERT INTO user_email_preferences 
        (user_id, birthday_reminders_enabled, reminder_7_days, reminder_3_days, reminder_1_day,
         reminder_14_days, reminder_time_7_days, reminder_time_3_days, reminder_time_1_day, 
         user_timezone, notification_frequency) 
        VALUES (?, TRUE, TRUE, TRUE, TRUE, FALSE, '09:00:00', '09:00:00', '09:00:00', 'Asia/Kolkata', 'standard')
      `, [req.user.userId]);
      
      // Get the newly created preferences
      const [newPrefs] = await req.db.execute(`
        SELECT * FROM user_email_preferences WHERE user_id = ?
      `, [req.user.userId]);
      
      userPrefs = newPrefs[0];
    } else {
      userPrefs = preferences[0];
    }
    
    // Format response with clear structure
    const formattedPrefs = {
      // Basic settings
      birthday_reminders_enabled: !!userPrefs.birthday_reminders_enabled,
      notification_frequency: userPrefs.notification_frequency || 'standard',
      user_timezone: userPrefs.user_timezone || 'Asia/Kolkata',
      
      // Standard reminder types
      reminders: {
        reminder_14_days: !!userPrefs.reminder_14_days,
        reminder_7_days: !!userPrefs.reminder_7_days,
        reminder_3_days: !!userPrefs.reminder_3_days,
        reminder_1_day: !!userPrefs.reminder_1_day
      },
      
      // Custom reminder intervals
      custom_reminders: {
        custom_1_days: userPrefs.reminder_custom_1_days,
        custom_2_days: userPrefs.reminder_custom_2_days
      },
      
      // Reminder times
      reminder_times: {
        time_14_days: userPrefs.reminder_time_7_days || '09:00:00', // Use 7-day time as default
        time_7_days: userPrefs.reminder_time_7_days || '09:00:00',
        time_3_days: userPrefs.reminder_time_3_days || '09:00:00',
        time_1_day: userPrefs.reminder_time_1_day || '09:00:00'
      }
    };
    
    console.log(`✅ [PREFERENCES] Retrieved preferences for user ${req.user.userId}`);
    
    res.json({
      success: true,
      message: 'Email preferences retrieved successfully',
      data: {
        preferences: formattedPrefs,
        last_updated: userPrefs.updated_at
      }
    });
    
  } catch (error) {
    console.error('❌ [PREFERENCES] Error getting preferences:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to retrieve email preferences',
      error: error.message
    });
  }
});

// PUT /api/preferences - Update user's email preferences (Enhanced with validation)
router.put('/', async (req, res) => {
  try {
    console.log(`🔧 [PREFERENCES] Updating preferences for user ${req.user.userId}`);
    console.log('📝 [PREFERENCES] Request data:', req.body);
    
    // Comprehensive validation
    const validationErrors = validatePreferenceUpdate(req.body);
    if (validationErrors.length > 0) {
      return res.status(400).json({
        success: false,
        message: 'Validation failed',
        errors: validationErrors
      });
    }
    
    const {
      birthday_reminders_enabled,
      notification_frequency,
      user_timezone,
      reminders,
      custom_reminders,
      reminder_times
    } = req.body;
    
    // Additional business logic validation
    if (custom_reminders) {
      // Check for duplicate custom reminder values
      if (custom_reminders.custom_1_days && custom_reminders.custom_2_days &&
          custom_reminders.custom_1_days === custom_reminders.custom_2_days) {
        return res.status(400).json({
          success: false,
          message: 'Custom reminder intervals must be different values'
        });
      }
      
      // Check if custom reminders conflict with standard reminders
      const standardDays = [1, 3, 7, 14];
      for (const [idx, days] of [custom_reminders.custom_1_days, custom_reminders.custom_2_days].entries()) {
        if (days && standardDays.includes(days)) {
          return res.status(400).json({
            success: false,
            message: `Custom reminder ${idx + 1} (${days} days) conflicts with standard reminder. Use standard reminders for 1, 3, 7, or 14 days.`
          });
        }
      }
    }
    
    // Validate that at least one reminder type is enabled if reminders are enabled
    if (birthday_reminders_enabled !== false && reminders) {
      const anyReminderEnabled = Object.values(reminders).some(enabled => enabled === true) ||
                                (custom_reminders && (custom_reminders.custom_1_days || custom_reminders.custom_2_days));
      
      if (!anyReminderEnabled && birthday_reminders_enabled === true) {
        return res.status(400).json({
          success: false,
          message: 'At least one reminder type must be enabled when birthday reminders are enabled'
        });
      }
    }
    
    // Check if preferences exist
    const [existing] = await req.db.execute(`
      SELECT id FROM user_email_preferences WHERE user_id = ?
    `, [req.user.userId]);
    
    let updateFields = [];
    let updateValues = [];
    
    if (existing.length === 0) {
      // Create new preferences with validated data
      await req.db.execute(`
        INSERT INTO user_email_preferences 
        (user_id, birthday_reminders_enabled, reminder_7_days, reminder_3_days, reminder_1_day,
         reminder_14_days, reminder_custom_1_days, reminder_custom_2_days,
         reminder_time_7_days, reminder_time_3_days, reminder_time_1_day, 
         user_timezone, notification_frequency) 
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `, [
        req.user.userId,
        birthday_reminders_enabled ?? true,
        reminders?.reminder_7_days ?? true,
        reminders?.reminder_3_days ?? true,
        reminders?.reminder_1_day ?? true,
        reminders?.reminder_14_days ?? false,
        custom_reminders?.custom_1_days || null,
        custom_reminders?.custom_2_days || null,
        reminder_times?.time_7_days || '09:00:00',
        reminder_times?.time_3_days || '09:00:00',
        reminder_times?.time_1_day || '09:00:00',
        user_timezone || 'Asia/Kolkata',
        notification_frequency || 'standard'
      ]);
      
      console.log(`✅ [PREFERENCES] Created new validated preferences for user ${req.user.userId}`);
    } else {
      // Update existing preferences with validation
      updateFields = [];
      updateValues = [];
      
      if (birthday_reminders_enabled !== undefined) {
        updateFields.push('birthday_reminders_enabled = ?');
        updateValues.push(birthday_reminders_enabled);
      }
      
      if (notification_frequency) {
        updateFields.push('notification_frequency = ?');
        updateValues.push(notification_frequency);
      }
      
      if (user_timezone) {
        updateFields.push('user_timezone = ?');
        updateValues.push(user_timezone);
      }
      
      // Update reminder toggles
      if (reminders) {
        Object.entries(reminders).forEach(([type, value]) => {
          if (value !== undefined) {
            const dbField = type === 'reminder_14_days' ? 'reminder_14_days' : 
                           type === 'reminder_7_days' ? 'reminder_7_days' :
                           type === 'reminder_3_days' ? 'reminder_3_days' :
                           type === 'reminder_1_day' ? 'reminder_1_day' : null;
            
            if (dbField) {
              updateFields.push(`${dbField} = ?`);
              updateValues.push(value);
            }
          }
        });
      }
      
      // Update custom reminders
      if (custom_reminders) {
        if (custom_reminders.custom_1_days !== undefined) {
          updateFields.push('reminder_custom_1_days = ?');
          updateValues.push(custom_reminders.custom_1_days || null);
        }
        if (custom_reminders.custom_2_days !== undefined) {
          updateFields.push('reminder_custom_2_days = ?');
          updateValues.push(custom_reminders.custom_2_days || null);
        }
      }
      
      // Update reminder times
      if (reminder_times) {
        Object.entries(reminder_times).forEach(([type, time]) => {
          if (time) {
            const dbField = type === 'time_7_days' ? 'reminder_time_7_days' :
                           type === 'time_3_days' ? 'reminder_time_3_days' :
                           type === 'time_1_day' ? 'reminder_time_1_day' : null;
            
            if (dbField) {
              updateFields.push(`${dbField} = ?`);
              updateValues.push(time);
            }
          }
        });
      }
      
      if (updateFields.length > 0) {
        updateValues.push(req.user.userId);
        
        await req.db.execute(`
          UPDATE user_email_preferences 
          SET ${updateFields.join(', ')} 
          WHERE user_id = ?
        `, updateValues);
        
        console.log(`✅ [PREFERENCES] Updated ${updateFields.length} validated fields for user ${req.user.userId}`);
      }
    }
    
    // Get updated preferences to return
    const [updatedPrefs] = await req.db.execute(`
      SELECT * FROM user_email_preferences WHERE user_id = ?
    `, [req.user.userId]);
    
    res.json({
      success: true,
      message: 'Email preferences updated successfully with validation',
      data: {
        preferences: updatedPrefs[0],
        fields_updated: updateFields?.length || 'all (new record)',
        validation_passed: true
      }
    });
    
  } catch (error) {
    console.error('❌ [PREFERENCES] Error updating preferences:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to update email preferences',
      error: error.message
    });
  }
});

// POST /api/preferences/test - Send test reminder email
router.post('/test', async (req, res) => {
  try {
    console.log(`📧 [PREFERENCES] Sending test email for user ${req.user.userId}`);
    
    const { reminder_type } = req.body;
    
    // Validate reminder type
    if (!['7_days', '3_days', '1_day'].includes(reminder_type)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid reminder type. Use: 7_days, 3_days, or 1_day'
      });
    }
    
    // Get user info
    const [users] = await req.db.execute(`
      SELECT name, email FROM users WHERE id = ?
    `, [req.user.userId]);
    
    if (users.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }
    
    const user = users[0];
    
    // Create test reminder data
    const testReminderData = {
      user_email: user.email,
      user_name: user.name,
      birthday_name: 'Test Person',
      birthday_date: '1990-12-25',
      formattedBirthdayDate: 'Wednesday, December 25, 1990',
      relationship: 'Friend',
      bio: 'This is a test email to verify your reminder preferences are working correctly.',
      reminder_type: reminder_type
    };
    
    // Send test email
    const { sendBirthdayReminderEmail } = require('../services/emailService');
    const result = await sendBirthdayReminderEmail(testReminderData);
    
    if (result.success) {
      console.log(`✅ [PREFERENCES] Test email sent successfully to ${user.email}`);
      
      res.json({
        success: true,
        message: `Test ${reminder_type.replace('_', '-')} reminder email sent successfully!`,
        data: {
          email_sent_to: user.email,
          reminder_type: reminder_type,
          message_id: result.messageId
        }
      });
    } else {
      console.log(`❌ [PREFERENCES] Test email failed: ${result.error}`);
      
      res.status(500).json({
        success: false,
        message: 'Failed to send test email',
        error: result.error
      });
    }
    
  } catch (error) {
    console.error('❌ [PREFERENCES] Error sending test email:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to send test email',
      error: error.message
    });
  }
});

// GET /api/preferences/timezones - Get available timezones
router.get('/timezones', async (req, res) => {
  try {
    // Common timezones with user-friendly names
    const timezones = [
      { value: 'Asia/Kolkata', label: 'India (IST)', offset: '+05:30' },
      { value: 'UTC', label: 'UTC (Coordinated Universal Time)', offset: '+00:00' },
      { value: 'America/New_York', label: 'Eastern Time (US)', offset: '-05:00' },
      { value: 'America/Chicago', label: 'Central Time (US)', offset: '-06:00' },
      { value: 'America/Denver', label: 'Mountain Time (US)', offset: '-07:00' },
      { value: 'America/Los_Angeles', label: 'Pacific Time (US)', offset: '-08:00' },
      { value: 'Europe/London', label: 'London (GMT/BST)', offset: '+00:00' },
      { value: 'Europe/Paris', label: 'Central Europe (CET)', offset: '+01:00' },
      { value: 'Asia/Tokyo', label: 'Japan (JST)', offset: '+09:00' },
      { value: 'Asia/Shanghai', label: 'China (CST)', offset: '+08:00' },
      { value: 'Australia/Sydney', label: 'Sydney (AEDT)', offset: '+11:00' },
      { value: 'Asia/Dubai', label: 'Dubai (GST)', offset: '+04:00' }
    ];
    
    res.json({
      success: true,
      message: 'Available timezones retrieved successfully',
      data: {
        timezones: timezones,
        default: 'Asia/Kolkata',
        count: timezones.length
      }
    });
    
  } catch (error) {
    console.error('❌ [PREFERENCES] Error getting timezones:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to retrieve timezones',
      error: error.message
    });
  }
});

// Validation helper functions
const validatePreferences = {
  notificationFrequency: (value) => {
    const validFrequencies = ['minimal', 'standard', 'maximum'];
    return validFrequencies.includes(value);
  },
  
  timezone: (value) => {
    const validTimezones = [
      'Asia/Kolkata', 'UTC', 'America/New_York', 'America/Chicago', 
      'America/Denver', 'America/Los_Angeles', 'Europe/London', 
      'Europe/Paris', 'Asia/Tokyo', 'Asia/Shanghai', 'Australia/Sydney', 'Asia/Dubai'
    ];
    return validTimezones.includes(value);
  },
  
  time: (value) => {
    const timeRegex = /^([0-1]?[0-9]|2[0-3]):[0-5][0-9]:[0-5][0-9]$/;
    return timeRegex.test(value);
  },
  
  customReminderDays: (value) => {
    if (value === null || value === undefined) return true;
    return Number.isInteger(value) && value >= 1 && value <= 365;
  },
  
  boolean: (value) => {
    return typeof value === 'boolean';
  }
};

// Comprehensive validation function
const validatePreferenceUpdate = (data) => {
  const errors = [];
  
  // Validate notification frequency
  if (data.notification_frequency && !validatePreferences.notificationFrequency(data.notification_frequency)) {
    errors.push('Invalid notification frequency. Must be: minimal, standard, or maximum');
  }
  
  // Validate timezone
  if (data.user_timezone && !validatePreferences.timezone(data.user_timezone)) {
    errors.push('Invalid timezone. Please select a supported timezone');
  }
  
  // Validate reminder times
  if (data.reminder_times) {
    Object.entries(data.reminder_times).forEach(([type, time]) => {
      if (time && !validatePreferences.time(time)) {
        errors.push(`Invalid time format for ${type}. Use HH:MM:SS format (e.g., 09:00:00)`);
      }
    });
  }
  
  // Validate custom reminder days
  if (data.custom_reminders) {
    if (data.custom_reminders.custom_1_days !== undefined && 
        !validatePreferences.customReminderDays(data.custom_reminders.custom_1_days)) {
      errors.push('Custom reminder 1 must be between 1 and 365 days, or null');
    }
    
    if (data.custom_reminders.custom_2_days !== undefined && 
        !validatePreferences.customReminderDays(data.custom_reminders.custom_2_days)) {
      errors.push('Custom reminder 2 must be between 1 and 365 days, or null');
    }
  }
  
  // Validate boolean fields
  if (data.birthday_reminders_enabled !== undefined && 
      !validatePreferences.boolean(data.birthday_reminders_enabled)) {
    errors.push('birthday_reminders_enabled must be a boolean');
  }
  
  if (data.reminders) {
    Object.entries(data.reminders).forEach(([type, enabled]) => {
      if (enabled !== undefined && !validatePreferences.boolean(enabled)) {
        errors.push(`${type} must be a boolean value`);
      }
    });
  }
  
  return errors;
};

module.exports = router;