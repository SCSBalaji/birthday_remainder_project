/**
 * Smart Scheduling Service
 * Intelligently schedules birthday reminders based on user preferences and behavior
 */

const { getUserEmailPreferences } = require('./reminderService');
const { createEmailReminder } = require('./reminderService');

// Calculate optimal reminder times based on user behavior and preferences
const calculateOptimalReminderTimes = (birthday, userPreferences, userTimezone = 'Asia/Kolkata') => {
  const birthdayDate = new Date(birthday.date);
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  
  // Set birthday to this year
  const thisYear = today.getFullYear();
  birthdayDate.setFullYear(thisYear);
  birthdayDate.setHours(0, 0, 0, 0);
  
  // If birthday already passed this year, set to next year
  if (birthdayDate < today) {
    birthdayDate.setFullYear(thisYear + 1);
  }
  
  const daysUntilBirthday = Math.ceil((birthdayDate - today) / (1000 * 60 * 60 * 24));
  
  console.log(`📅 [SMART] Calculating optimal times for ${birthday.name}: ${daysUntilBirthday} days until birthday`);
  
  const reminderSchedule = [];
  
  // Enhanced scheduling based on relationship importance and user preferences
  const relationshipPriority = {
    'partner': 4,
    'family': 3,
    'friend': 2,
    'colleague': 1,
    'other': 1
  };
  
  const priority = relationshipPriority[birthday.relationship?.toLowerCase()] || 1;
  console.log(`🎯 [SMART] Priority level for ${birthday.name}: ${priority} (${birthday.relationship})`);
  
  // Smart scheduling based on relationship and preferences
  if (userPreferences.reminder_14_days && priority >= 3 && daysUntilBirthday <= 14) {
    reminderSchedule.push({
      type: '14_days',
      days: 14,
      priority: 'low',
      reason: 'Early planning for important relationship'
    });
  }
  
  if (userPreferences.reminder_7_days && daysUntilBirthday <= 7) {
    reminderSchedule.push({
      type: '7_days',
      days: 7,
      priority: priority >= 2 ? 'medium' : 'low',
      reason: 'Standard advance notice'
    });
  }
  
  if (userPreferences.reminder_3_days && daysUntilBirthday <= 3) {
    reminderSchedule.push({
      type: '3_days',
      days: 3,
      priority: 'high',
      reason: 'Final preparation window'
    });
  }
  
  if (userPreferences.reminder_1_day && daysUntilBirthday <= 1) {
    reminderSchedule.push({
      type: '1_day',
      days: 1,
      priority: 'urgent',
      reason: 'Last chance reminder'
    });
  }
  
  // Same-day reminder for very important relationships
  if (priority >= 3 && daysUntilBirthday === 0) {
    reminderSchedule.push({
      type: 'same_day',
      days: 0,
      priority: 'critical',
      reason: 'Birthday today - immediate action needed'
    });
  }
  
  console.log(`📋 [SMART] Generated ${reminderSchedule.length} optimal reminders for ${birthday.name}:`, 
    reminderSchedule.map(r => `${r.type} (${r.priority})`));
  
  return reminderSchedule.filter(reminder => daysUntilBirthday === reminder.days);
};

// Smart reminder creation with intelligence
const createSmartReminders = async (db, userId, birthday, userPreferences) => {
  try {
    console.log(`🧠 [SMART] Creating intelligent reminders for ${birthday.name} (User: ${userId})`);
    
    const optimalTimes = calculateOptimalReminderTimes(birthday, userPreferences);
    const today = new Date().toISOString().split('T')[0];
    
    let remindersCreated = 0;
    
    for (const reminderTime of optimalTimes) {
      console.log(`🎯 [SMART] Creating ${reminderTime.type} reminder: ${reminderTime.reason}`);
      
      try {
        const reminderId = await createEmailReminder(
          db,
          userId,
          birthday.id,
          reminderTime.type,
          today
        );
        
        if (reminderId) {
          remindersCreated++;
          console.log(`✅ [SMART] Created ${reminderTime.type} reminder (ID: ${reminderId}) - Priority: ${reminderTime.priority}`);
        }
      } catch (error) {
        console.error(`❌ [SMART] Failed to create ${reminderTime.type} reminder:`, error);
      }
    }
    
    return {
      success: true,
      remindersCreated,
      birthdayName: birthday.name,
      optimalTimes: optimalTimes.length
    };
    
  } catch (error) {
    console.error('❌ [SMART] Smart reminder creation failed:', error);
    return {
      success: false,
      error: error.message,
      birthdayName: birthday.name
    };
  }
};

// Analyze user behavior and optimize reminder timing
const optimizeReminderTiming = async (db, userId) => {
  try {
    console.log(`📊 [SMART] Analyzing user behavior for optimization (User: ${userId})`);
    
    // Get user's past reminder interactions
    const [interactions] = await db.execute(`
      SELECT er.*, b.relationship, er.sent_at, er.status
      FROM email_reminders er
      JOIN birthdays b ON er.birthday_id = b.id
      WHERE er.user_id = ? AND er.sent_at IS NOT NULL
      ORDER BY er.sent_at DESC
      LIMIT 50
    `, [userId]);
    
    if (interactions.length === 0) {
      console.log(`📝 [SMART] No interaction history found for user ${userId}`);
      return {
        success: true,
        recommendations: ['Use standard reminder schedule', 'Build interaction history'],
        confidence: 'low'
      };
    }
    
    // Analyze patterns
    const patternAnalysis = {
      mostEffectiveReminderType: null,
      preferredRelationships: {},
      optimalTiming: null,
      successRate: 0
    };
    
    // Count reminder type effectiveness
    const reminderTypeStats = {};
    interactions.forEach(interaction => {
      if (!reminderTypeStats[interaction.reminder_type]) {
        reminderTypeStats[interaction.reminder_type] = { sent: 0, successful: 0 };
      }
      reminderTypeStats[interaction.reminder_type].sent++;
      if (interaction.status === 'sent') {
        reminderTypeStats[interaction.reminder_type].successful++;
      }
    });
    
    // Find most effective reminder type
    let bestType = null;
    let bestRate = 0;
    Object.keys(reminderTypeStats).forEach(type => {
      const rate = reminderTypeStats[type].successful / reminderTypeStats[type].sent;
      if (rate > bestRate) {
        bestRate = rate;
        bestType = type;
      }
    });
    
    patternAnalysis.mostEffectiveReminderType = bestType;
    patternAnalysis.successRate = bestRate;
    
    console.log(`📈 [SMART] Analysis complete for user ${userId}:`, {
      totalInteractions: interactions.length,
      mostEffective: bestType,
      successRate: `${(bestRate * 100).toFixed(1)}%`
    });
    
    return {
      success: true,
      analysis: patternAnalysis,
      recommendations: [
        `Focus on ${bestType} reminders (${(bestRate * 100).toFixed(1)}% success rate)`,
        'Continue building interaction history',
        'Consider relationship-based optimization'
      ],
      confidence: interactions.length > 10 ? 'high' : 'medium'
    };
    
  } catch (error) {
    console.error('❌ [SMART] Behavior analysis failed:', error);
    return {
      success: false,
      error: error.message
    };
  }
};

// Generate personalized reminder insights
const generateReminderInsights = async (db, userId) => {
  try {
    console.log(`💡 [SMART] Generating personalized insights for user ${userId}`);
    
    // Get user's birthdays and upcoming events
    const [birthdays] = await db.execute(`
      SELECT b.*, 
             CASE 
               WHEN DATE_FORMAT(b.date, '%m-%d') >= DATE_FORMAT(CURDATE(), '%m-%d')
               THEN DATEDIFF(
                 DATE(CONCAT(YEAR(CURDATE()), '-', DATE_FORMAT(b.date, '%m-%d'))), 
                 CURDATE()
               )
               ELSE DATEDIFF(
                 DATE(CONCAT(YEAR(CURDATE()) + 1, '-', DATE_FORMAT(b.date, '%m-%d'))), 
                 CURDATE()
               )
             END as days_until
      FROM birthdays b
      WHERE b.user_id = ?
      ORDER BY days_until ASC
    `, [userId]);
    
    // Get user preferences
    const preferences = await getUserEmailPreferences(db, userId);
    
    const insights = {
      totalBirthdays: birthdays.length,
      upcomingIn7Days: birthdays.filter(b => b.days_until <= 7).length,
      upcomingIn30Days: birthdays.filter(b => b.days_until <= 30).length,
      relationshipBreakdown: {},
      nextBirthday: birthdays[0] || null,
      recommendedActions: [],
      personalizedTips: []
    };
    
    // Analyze relationship distribution
    birthdays.forEach(birthday => {
      const rel = birthday.relationship || 'other';
      insights.relationshipBreakdown[rel] = (insights.relationshipBreakdown[rel] || 0) + 1;
    });
    
    // Generate personalized recommendations
    if (insights.upcomingIn7Days > 0) {
      insights.recommendedActions.push(`🚨 ${insights.upcomingIn7Days} birthday${insights.upcomingIn7Days > 1 ? 's' : ''} coming up in the next 7 days!`);
    }
    
    if (insights.nextBirthday && insights.nextBirthday.days_until <= 1) {
      insights.recommendedActions.push(`⚡ ${insights.nextBirthday.name}'s birthday is ${insights.nextBirthday.days_until === 0 ? 'TODAY' : 'TOMORROW'}!`);
    }
    
    // Generate tips based on user data
    const mostCommonRelationship = Object.keys(insights.relationshipBreakdown).reduce((a, b) => 
      insights.relationshipBreakdown[a] > insights.relationshipBreakdown[b] ? a : b, 'friend');
    
    insights.personalizedTips.push(`💡 Most of your contacts are ${mostCommonRelationship}s - consider relationship-specific gift planning`);
    
    if (preferences.birthday_reminders_enabled) {
      insights.personalizedTips.push(`✅ Your reminder system is active and optimized`);
    } else {
      insights.personalizedTips.push(`⚠️ Enable email reminders to never miss a birthday`);
    }
    
    console.log(`💡 [SMART] Generated insights for user ${userId}:`, {
      totalBirthdays: insights.totalBirthdays,
      upcoming7Days: insights.upcomingIn7Days,
      mainRelationship: mostCommonRelationship
    });
    
    return {
      success: true,
      insights,
      generated_at: new Date().toISOString()
    };
    
  } catch (error) {
    console.error('❌ [SMART] Insight generation failed:', error);
    return {
      success: false,
      error: error.message
    };
  }
};

module.exports = {
  calculateOptimalReminderTimes,
  createSmartReminders,
  optimizeReminderTiming,
  generateReminderInsights
};