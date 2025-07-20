const nodemailer = require('nodemailer');
const { renderEmailTemplate, formatDateForEmail } = require('./emailTemplateService');

// Create transporter
const createTransporter = () => {
  return nodemailer.createTransport({
    host: process.env.EMAIL_HOST,
    port: process.env.EMAIL_PORT,
    secure: false, // true for 465, false for other ports like 587
    auth: {
      user: process.env.EMAIL_USER,
      pass: process.env.EMAIL_PASS,
    },
  });
};

// Send verification email
const sendVerificationEmail = async (to, name, verificationToken) => {
  try {
    const transporter = createTransporter();
    
    const verificationUrl = `${process.env.FRONTEND_URL}/verify-email?token=${verificationToken}`;
    
    const mailOptions = {
      from: process.env.EMAIL_FROM,
      to: to,
      subject: '🎂 Verify Your Birthday Buddy Account',
      html: `
        <!DOCTYPE html>
        <html>
        <head>
          <style>
            body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
            .container { max-width: 600px; margin: 0 auto; padding: 20px; }
            .header { background: linear-gradient(90deg, #b621fe 0%, #1fd1f9 100%); color: white; text-align: center; padding: 30px; border-radius: 10px 10px 0 0; }
            .content { background: #f8f9fa; padding: 30px; border-radius: 0 0 10px 10px; }
            .button { display: inline-block; background: linear-gradient(90deg, #ff6ec4 0%, #7873f5 100%); color: white; padding: 12px 30px; text-decoration: none; border-radius: 8px; font-weight: bold; margin: 20px 0; }
            .footer { text-align: center; margin-top: 20px; font-size: 14px; color: #666; }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              <h1>🎂 Welcome to Birthday Buddy!</h1>
            </div>
            <div class="content">
              <h2>Hi ${name}! 👋</h2>
              <p>Thank you for signing up for Birthday Buddy! To complete your registration and start managing birthdays, please verify your email address.</p>
              
              <div style="text-align: center;">
                <a href="${verificationUrl}" class="button">Verify Email Address</a>
              </div>
              
              <p><strong>Important:</strong> This verification link will expire in 15 minutes for security reasons.</p>
              
              <p>If you didn't create an account with Birthday Buddy, you can safely ignore this email.</p>
              
              <hr style="margin: 30px 0; border: 1px solid #eee;">
              
              <p><strong>Having trouble?</strong> If the button doesn't work, copy and paste this link into your browser:</p>
              <p style="word-break: break-all; color: #666; font-size: 14px;">${verificationUrl}</p>
            </div>
            <div class="footer">
              <p>🎂 Birthday Buddy - Never forget a birthday again!</p>
              <p>This email was sent to ${to}</p>
            </div>
          </div>
        </body>
        </html>
      `,
    };

    const result = await transporter.sendMail(mailOptions);
    console.log('✅ Verification email sent successfully:', result.messageId);
    console.log('📧 Email sent to:', to);
    console.log('🔗 Verification URL:', verificationUrl);
    
    return { success: true, messageId: result.messageId };
  } catch (error) {
    console.error('❌ Email sending failed:', error);
    return { success: false, error: error.message };
  }
};

// Send birthday reminder email
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
      reminder_type: reminderType
    } = reminderData;
    
    // Determine template and subject based on reminder type
    let templateName, subject;
    
    switch (reminderType) {
      case '7_days':
        templateName = 'reminder-7-days';
        subject = `🎂 Birthday Reminder: ${birthdayPersonName}'s birthday in 7 days!`;
        break;
      case '3_days':
        templateName = 'reminder-3-days';
        subject = `🎂 Birthday Alert: ${birthdayPersonName}'s birthday in 3 days!`;
        break;
      case '1_day':
        templateName = 'reminder-1-day';
        subject = `🚨 Birthday Tomorrow: ${birthdayPersonName}'s birthday is TOMORROW!`;
        break;
      default:
        throw new Error(`Unknown reminder type: ${reminderType}`);
    }
    
    // Prepare template data
    const templateData = {
      userName,
      userEmail,
      birthdayPersonName,
      birthdayDate,
      formattedBirthdayDate: formatDateForEmail(birthdayDate),
      relationship,
      bio
    };
    
    // Render the email template
    const htmlContent = await renderEmailTemplate(templateName, templateData);
    
    // Email options
    const mailOptions = {
      from: process.env.EMAIL_FROM || `"Birthday Buddy" <${process.env.EMAIL_USER}>`,
      to: userEmail,
      subject: subject,
      html: htmlContent
    };
    
    // Send the email
    const result = await transporter.sendMail(mailOptions);
    
    console.log(`✅ Birthday reminder email sent successfully:`, {
      messageId: result.messageId,
      to: userEmail,
      reminderType: reminderType,
      birthdayPerson: birthdayPersonName
    });
    
    return { success: true, messageId: result.messageId };
    
  } catch (error) {
    console.error('❌ Birthday reminder email sending failed:', error);
    return { success: false, error: error.message };
  }
};

// Send multiple birthday reminder emails
const sendMultipleBirthdayReminders = async (reminders) => {
  const results = [];
  
  for (const reminder of reminders) {
    const result = await sendBirthdayReminderEmail(reminder);
    results.push(result);
  }
  
  return results;
};

module.exports = {
  sendVerificationEmail,
  sendBirthdayReminderEmail,
  sendMultipleBirthdayReminders,
};