const nodemailer = require('nodemailer');
const { createAdvancedEmailTemplate } = require('./advancedEmailTemplateService');

// Keep your existing createTransporter function (don't change)
const createTransporter = () => {
  if (!process.env.EMAIL_USER || !process.env.EMAIL_PASS) {
    throw new Error('Email credentials not configured in environment variables');
  }
  
  return nodemailer.createTransport({
    service: 'gmail',
    auth: {
      user: process.env.EMAIL_USER,
      pass: process.env.EMAIL_PASS
    }
  });
};

// Enhanced birthday reminder email with ADVANCED TEMPLATES
const sendBirthdayReminderEmail = async (reminderData) => {
  try {
    const transporter = createTransporter();
    
    const {
      user_email: userEmail,
      user_name: userName,
      birthday_name: birthdayPersonName,
      birthday_date: birthdayDate,
      relationship,
      bio,
      reminder_type: reminderType,
      user_id: userId,
      user_timezone
    } = reminderData;
    
    // Calculate days until birthday
    const calculateDaysUntilBirthday = (dateStr) => {
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      
      const thisYear = today.getFullYear();
      const birthday = new Date(dateStr);
      birthday.setFullYear(thisYear);
      birthday.setHours(0, 0, 0, 0);
      
      if (birthday < today) {
        birthday.setFullYear(thisYear + 1);
      }
      
      const diffTime = birthday - today;
      const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
      return diffDays;
    };
    
    const daysUntil = calculateDaysUntilBirthday(birthdayDate);
    
    // Get user preferences for template customization
    let userPreferences = {
      notification_frequency: 'standard',
      user_timezone: user_timezone || 'Asia/Kolkata'
    };
    
    // Enhanced subject based on urgency and personalization
    const subjectTemplates = {
      1: `🚨 TOMORROW: ${birthdayPersonName}'s Birthday! 🎂`,
      3: `⚠️ 3 Days: ${birthdayPersonName}'s Birthday Approaching! 🎉`,
      7: `📅 1 Week: ${birthdayPersonName}'s Birthday Coming Up! 🎁`,
      14: `📋 2 Weeks: ${birthdayPersonName}'s Birthday - Early Reminder! ⭐`
    };
    
    const subject = subjectTemplates[daysUntil] || `🎂 Birthday Reminder: ${birthdayPersonName}`;
    
    // Create template data for advanced email
    const templateData = {
      userName,
      userEmail,
      birthdayPersonName,
      birthdayDate,
      relationship,
      bio,
      reminderType,
      daysUntil,
      userPreferences,
      userTimezone: userPreferences.user_timezone || 'Asia/Kolkata'
    };
    
    // Generate the ADVANCED email template
    const htmlContent = createAdvancedEmailTemplate(templateData);
    
    // Email options with enhanced styling
    const mailOptions = {
      from: process.env.EMAIL_FROM || `"🎂 Birthday Buddy" <${process.env.EMAIL_USER}>`,
      to: userEmail,
      subject: subject,
      html: htmlContent,
      // Add text fallback for email clients that don't support HTML
      text: `
Birthday Reminder: ${birthdayPersonName}

Hi ${userName}!

${birthdayPersonName}'s birthday is ${daysUntil === 1 ? 'TOMORROW' : `in ${daysUntil} days`}!
Date: ${new Date(birthdayDate).toLocaleDateString()}
${relationship ? `Relationship: ${relationship}` : ''}
${bio ? `Notes: ${bio}` : ''}

Don't forget to wish them a happy birthday!

Visit Birthday Buddy: ${process.env.FRONTEND_URL}

Best regards,
Birthday Buddy Team
      `.trim()
    };
    
    // Send the email
    const result = await transporter.sendMail(mailOptions);
    
    console.log(`✅ ADVANCED birthday reminder email sent successfully:`, {
      messageId: result.messageId,
      to: userEmail,
      reminderType: reminderType,
      birthdayPerson: birthdayPersonName,
      daysUntil: daysUntil,
      theme: userPreferences.notification_frequency || 'standard',
      hasGiftSuggestions: true,
      hasPersonalizedGreeting: true
    });
    
    return { success: true, messageId: result.messageId };
    
  } catch (error) {
    console.error('❌ Enhanced birthday reminder email sending failed:', error);
    return { success: false, error: error.message };
  }
};

// Keep your existing functions unchanged
const sendVerificationEmail = async (userEmail, verificationToken) => {
  try {
    const transporter = createTransporter();
    
    const verificationUrl = `${process.env.FRONTEND_URL}/verify-email?token=${verificationToken}`;
    
    const mailOptions = {
      from: process.env.EMAIL_FROM || `"Birthday Buddy" <${process.env.EMAIL_USER}>`,
      to: userEmail,
      subject: "🎂 Verify Your Birthday Buddy Account",
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <h2 style="color: #333;">Welcome to Birthday Buddy! 🎉</h2>
          <p>Please click the button below to verify your email address:</p>
          <a href="${verificationUrl}" style="display: inline-block; padding: 12px 24px; background-color: #007bff; color: white; text-decoration: none; border-radius: 5px;">Verify Email</a>
          <p>If the button doesn't work, copy and paste this link into your browser:</p>
          <p><a href="${verificationUrl}">${verificationUrl}</a></p>
          <p>This link will expire in 24 hours.</p>
        </div>
      `,
      text: `Welcome to Birthday Buddy! Please verify your email by visiting: ${verificationUrl}`
    };
    
    const result = await transporter.sendMail(mailOptions);
    console.log(`✅ Verification email sent successfully to ${userEmail}:`, result.messageId);
    return { success: true, messageId: result.messageId };
  } catch (error) {
    console.error('❌ Verification email sending failed:', error);
    return { success: false, error: error.message };
  }
};

const sendMultipleBirthdayReminders = async (reminders) => {
  const results = [];
  for (const reminder of reminders) {
    try {
      const result = await sendBirthdayReminderEmail(reminder);
      results.push({ ...reminder, ...result });
    } catch (error) {
      results.push({ ...reminder, success: false, error: error.message });
    }
  }
  return results;
};

module.exports = {
  sendVerificationEmail,
  sendBirthdayReminderEmail, // This is now the ADVANCED version with templates
  sendMultipleBirthdayReminders,
};