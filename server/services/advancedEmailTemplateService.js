const fs = require('fs').promises;
const path = require('path');

/**
 * Advanced Email Template Service
 * Creates personalized, beautiful email templates based on user preferences
 */

// Template themes based on notification frequency
const getTemplateTheme = (notificationFrequency, reminderType) => {
  const themes = {
    minimal: {
      colors: {
        primary: '#6366f1',
        secondary: '#8b5cf6',
        background: '#f8fafc',
        text: '#1e293b'
      },
      style: 'clean'
    },
    standard: {
      colors: {
        primary: '#b621fe',
        secondary: '#1fd1f9',
        background: '#f5f5f5',
        text: '#333'
      },
      style: 'balanced'
    },
    maximum: {
      colors: {
        primary: '#ff6ec4',
        secondary: '#7873f5',
        background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
        text: '#fff'
      },
      style: 'vibrant'
    }
  };
  
  return themes[notificationFrequency] || themes.standard;
};

// Generate personalized greeting based on time and relationship
const generatePersonalizedGreeting = (userName, birthdayPersonName, relationship, userTimezone) => {
  const greetings = {
    family: [
      `Hi ${userName}! 👨‍👩‍👧‍👦`,
      `Hello ${userName}! 💝`,
      `Hey ${userName}! 🏠`
    ],
    friend: [
      `Hey ${userName}! 🤗`,
      `Hi there, ${userName}! 👋`,
      `Hello ${userName}! 🎉`
    ],
    colleague: [
      `Hello ${userName}! 💼`,
      `Hi ${userName}! ⭐`,
      `Good day, ${userName}! 🤝`
    ],
    partner: [
      `Hi sweetheart! 💕`,
      `Hello love! 💖`,
      `Hey ${userName}! 💑`
    ],
    other: [
      `Hi ${userName}! 😊`,
      `Hello ${userName}! 🌟`,
      `Hey there, ${userName}! 👋`
    ]
  };
  
  const relationshipGreetings = greetings[relationship?.toLowerCase()] || greetings.friend;
  const randomGreeting = relationshipGreetings[Math.floor(Math.random() * relationshipGreetings.length)];
  
  return randomGreeting;
};

// Generate contextual birthday message
const generateBirthdayMessage = (birthdayPersonName, relationship, daysUntil, userPreferences) => {
  const messages = {
    1: {
      family: `${birthdayPersonName}'s birthday is TOMORROW! 🎉 Don't forget to call or send a heartfelt message to your beloved family member!`,
      friend: `${birthdayPersonName}'s birthday is TOMORROW! 🥳 Time to celebrate your amazing friend!`,
      colleague: `${birthdayPersonName}'s birthday is TOMORROW! 🎂 A great opportunity to strengthen your professional relationship!`,
      partner: `${birthdayPersonName}'s birthday is TOMORROW! 💕 Make it extra special for your special someone!`,
      other: `${birthdayPersonName}'s birthday is TOMORROW! 🎁 Don't forget to wish them well!`
    },
    3: {
      family: `${birthdayPersonName}'s birthday is in 3 days! 📅 Perfect time to plan something meaningful for your family member.`,
      friend: `${birthdayPersonName}'s birthday is in 3 days! 🎁 Still time to find the perfect gift for your friend!`,
      colleague: `${birthdayPersonName}'s birthday is in 3 days! 🎯 Consider organizing something nice at work!`,
      partner: `${birthdayPersonName}'s birthday is in 3 days! 💖 Time to plan something romantic and special!`,
      other: `${birthdayPersonName}'s birthday is in 3 days! 🌟 Great time to prepare something thoughtful!`
    },
    7: {
      family: `${birthdayPersonName}'s birthday is in one week! 📆 Plenty of time to plan a wonderful celebration for your family member.`,
      friend: `${birthdayPersonName}'s birthday is in one week! 🌟 Start thinking about how to make your friend's day special!`,
      colleague: `${birthdayPersonName}'s birthday is in one week! ✨ Great opportunity to show appreciation for your colleague!`,
      partner: `${birthdayPersonName}'s birthday is in one week! 💑 Perfect time to plan an unforgettable celebration!`,
      other: `${birthdayPersonName}'s birthday is in one week! 🎊 Good time to start planning something nice!`
    },
    14: {
      family: `${birthdayPersonName}'s birthday is in two weeks! 📝 Early reminder to start planning something special for your family member.`,
      friend: `${birthdayPersonName}'s birthday is in two weeks! 💭 Time to start brainstorming the perfect celebration for your friend!`,
      colleague: `${birthdayPersonName}'s birthday is in two weeks! 📋 Good time to coordinate with other colleagues!`,
      partner: `${birthdayPersonName}'s birthday is in two weeks! 💝 Plenty of time to plan something truly memorable!`,
      other: `${birthdayPersonName}'s birthday is in two weeks! 📌 Early heads-up to start thinking about it!`
    }
  };
  
  const relationshipMessages = messages[daysUntil];
  const message = relationshipMessages?.[relationship?.toLowerCase()] || 
                 relationshipMessages?.friend || 
                 `${birthdayPersonName}'s birthday is in ${daysUntil} days! Time to start planning! 🎉`;
  
  return message;
};

// Generate gift suggestions based on relationship and bio
const generateGiftSuggestions = (relationship, bio) => {
  const suggestions = {
    family: [
      '👥 Family photo or memory book',
      '🏠 Something for their home',
      '🍽️ Home-cooked meal or baking',
      '💝 Personalized family gift'
    ],
    friend: [
      '🎁 Something related to their hobbies',
      '🍷 Experience gift or outing',
      '📚 Book or subscription service',
      '🎵 Concert or event tickets'
    ],
    colleague: [
      '☕ Nice coffee or tea set',
      '📋 Professional accessories',
      '🌱 Desk plant or office decor',
      '🎂 Office celebration cake'
    ],
    partner: [
      '💕 Romantic dinner or getaway',
      '💍 Jewelry or personal item',
      '🌹 Flowers and chocolates',
      '📱 Tech or gadget they mentioned'
    ],
    other: [
      '🎁 Gift card to their favorite store',
      '🌸 Flowers or small plant',
      '🍫 Nice chocolates or treats',
      '📝 Thoughtful card or note'
    ]
  };
  
  let baseSuggestions = suggestions[relationship?.toLowerCase()] || suggestions.friend;
  
  // Add bio-based suggestions if available
  if (bio) {
    const bioLower = bio.toLowerCase();
    const bioSuggestions = [];
    
    if (bioLower.includes('book')) bioSuggestions.push('📚 A book in their favorite genre');
    if (bioLower.includes('music')) bioSuggestions.push('🎵 Music-related gift or concert tickets');
    if (bioLower.includes('food') || bioLower.includes('cooking')) bioSuggestions.push('🍳 Cooking class or gourmet ingredients');
    if (bioLower.includes('travel')) bioSuggestions.push('✈️ Travel accessories or experience');
    if (bioLower.includes('coffee')) bioSuggestions.push('☕ Premium coffee or coffee accessories');
    if (bioLower.includes('chocolate')) bioSuggestions.push('🍫 Artisanal chocolates or sweets');
    if (bioLower.includes('game') || bioLower.includes('gaming')) bioSuggestions.push('🎮 Gaming accessories or new game');
    if (bioLower.includes('art') || bioLower.includes('paint')) bioSuggestions.push('🎨 Art supplies or creative kit');
    
    if (bioSuggestions.length > 0) {
      baseSuggestions = [...bioSuggestions, ...baseSuggestions];
    }
  }
  
  return baseSuggestions.slice(0, 4); // Return top 4 suggestions
};

// Create advanced email template
const createAdvancedEmailTemplate = (templateData) => {
  const {
    userName,
    userEmail,
    birthdayPersonName,
    birthdayDate,
    relationship,
    bio,
    reminderType,
    daysUntil,
    userPreferences = {},
    userTimezone = 'Asia/Kolkata'
  } = templateData;
  
  const theme = getTemplateTheme(userPreferences.notification_frequency || 'standard', reminderType);
  const greeting = generatePersonalizedGreeting(userName, birthdayPersonName, relationship, userTimezone);
  const birthdayMessage = generateBirthdayMessage(birthdayPersonName, relationship, daysUntil, userPreferences);
  const giftSuggestions = generateGiftSuggestions(relationship, bio);
  
  // Format date beautifully
  const formattedDate = new Date(birthdayDate).toLocaleDateString('en-US', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric'
  });
  
  // Determine urgency styling
  const urgencyStyles = {
    1: { badge: '🚨 TOMORROW!', color: '#ff4757', animation: 'pulse' },
    3: { badge: '⚠️ 3 DAYS', color: '#ffa500', animation: 'bounce' },
    7: { badge: '📅 1 WEEK', color: '#1fd1f9', animation: 'none' },
    14: { badge: '📋 2 WEEKS', color: '#7873f5', animation: 'none' }
  };
  
  const urgency = urgencyStyles[daysUntil] || urgencyStyles[7];
  
  return `
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Birthday Reminder - ${birthdayPersonName}</title>
    <style>
        body {
            font-family: 'Segoe UI', -apple-system, BlinkMacSystemFont, sans-serif;
            margin: 0;
            padding: 0;
            background: ${theme.colors.background};
            color: ${theme.colors.text};
            line-height: 1.6;
        }
        .container {
            max-width: 600px;
            margin: 0 auto;
            background: white;
            border-radius: 16px;
            overflow: hidden;
            box-shadow: 0 8px 32px rgba(0,0,0,0.1);
        }
        .header {
            background: linear-gradient(135deg, ${theme.colors.primary} 0%, ${theme.colors.secondary} 100%);
            color: white;
            padding: 40px 30px;
            text-align: center;
            position: relative;
        }
        .header h1 {
            margin: 0;
            font-size: 28px;
            font-weight: 700;
        }
        .urgency-badge {
            background: ${urgency.color};
            color: white;
            padding: 8px 16px;
            border-radius: 20px;
            font-weight: 700;
            font-size: 14px;
            margin-top: 10px;
            display: inline-block;
            ${urgency.animation === 'pulse' ? 'animation: pulse 1s infinite;' : ''}
            ${urgency.animation === 'bounce' ? 'animation: bounce 2s infinite;' : ''}
        }
        @keyframes pulse {
            0%, 100% { transform: scale(1); }
            50% { transform: scale(1.05); }
        }
        @keyframes bounce {
            0%, 20%, 50%, 80%, 100% { transform: translateY(0); }
            40% { transform: translateY(-10px); }
            60% { transform: translateY(-5px); }
        }
        .content {
            padding: 40px 30px;
        }
        .greeting {
            font-size: 20px;
            font-weight: 600;
            color: ${theme.colors.primary};
            margin-bottom: 20px;
        }
        .birthday-card {
            background: linear-gradient(135deg, ${theme.colors.primary}15 0%, ${theme.colors.secondary}15 100%);
            border: 2px solid ${theme.colors.primary};
            border-radius: 12px;
            padding: 25px;
            margin: 25px 0;
            text-align: center;
        }
        .birthday-name {
            font-size: 24px;
            font-weight: 700;
            color: ${theme.colors.primary};
            margin-bottom: 10px;
        }
        .birthday-date {
            font-size: 16px;
            opacity: 0.8;
            margin-bottom: 15px;
        }
        .relationship-badge {
            background: ${theme.colors.secondary};
            color: white;
            padding: 4px 12px;
            border-radius: 15px;
            font-size: 12px;
            font-weight: 600;
            display: inline-block;
            margin-bottom: 15px;
        }
        .bio-section {
            background: rgba(255, 255, 255, 0.8);
            padding: 15px;
            border-radius: 8px;
            margin: 20px 0;
            font-style: italic;
            border-left: 4px solid ${theme.colors.primary};
        }
        .gift-suggestions {
            background: #f8f9fa;
            padding: 20px;
            border-radius: 12px;
            margin: 25px 0;
        }
        .gift-suggestions h3 {
            color: ${theme.colors.primary};
            margin-top: 0;
            font-size: 18px;
        }
        .gift-list {
            list-style: none;
            padding: 0;
        }
        .gift-list li {
            padding: 8px 0;
            border-bottom: 1px solid #eee;
        }
        .gift-list li:last-child {
            border-bottom: none;
        }
        .action-buttons {
            text-align: center;
            margin: 30px 0;
        }
        .btn {
            display: inline-block;
            padding: 12px 25px;
            margin: 0 10px 10px 0;
            border-radius: 8px;
            text-decoration: none;
            font-weight: 600;
            transition: transform 0.2s;
        }
        .btn-primary {
            background: linear-gradient(135deg, ${theme.colors.primary} 0%, ${theme.colors.secondary} 100%);
            color: white;
        }
        .btn-secondary {
            background: #f8f9fa;
            color: ${theme.colors.primary};
            border: 2px solid ${theme.colors.primary};
        }
        .btn:hover {
            transform: translateY(-2px);
        }
        .footer {
            background: #f8f9fa;
            padding: 25px 30px;
            text-align: center;
            color: #666;
            font-size: 14px;
        }
        .footer a {
            color: ${theme.colors.primary};
            text-decoration: none;
        }
        .personalization {
            background: linear-gradient(135deg, ${theme.colors.primary}10 0%, ${theme.colors.secondary}10 100%);
            padding: 20px;
            border-radius: 8px;
            margin: 20px 0;
            border: 1px solid ${theme.colors.primary}40;
        }
        @media (max-width: 600px) {
            .container { margin: 10px; }
            .header, .content { padding: 20px; }
            .btn { display: block; margin: 10px 0; }
        }
    </style>
</head>
<body>
    <div class="container">
        <div class="header">
            <h1>🎂 Birthday Reminder</h1>
            <div class="urgency-badge">${urgency.badge}</div>
        </div>
        
        <div class="content">
            <div class="greeting">${greeting}</div>
            
            <p>${birthdayMessage}</p>
            
            <div class="birthday-card">
                <div class="birthday-name">${birthdayPersonName}</div>
                <div class="birthday-date">📅 ${formattedDate}</div>
                ${relationship ? `<div class="relationship-badge">${relationship}</div>` : ''}
                ${bio ? `<div class="bio-section">💭 <strong>Notes:</strong> ${bio}</div>` : ''}
            </div>
            
            <div class="gift-suggestions">
                <h3>🎁 Gift Ideas for ${birthdayPersonName}:</h3>
                <ul class="gift-list">
                    ${giftSuggestions.map(suggestion => `<li>${suggestion}</li>`).join('')}
                </ul>
            </div>
            
            <div class="personalization">
                <strong>💡 Pro Tip:</strong> 
                ${daysUntil === 1 ? 'Last chance to order something online with same-day delivery!' :
                  daysUntil === 3 ? 'Perfect timing to order a gift with standard shipping!' :
                  daysUntil === 7 ? 'Great time to plan a surprise party or special outing!' :
                  'Plenty of time to find the perfect, thoughtful gift!'}
            </div>
            
            <div class="action-buttons">
                <a href="${process.env.FRONTEND_URL}" class="btn btn-primary">
                    📱 Open Birthday Buddy
                </a>
                <a href="${process.env.FRONTEND_URL}/preferences" class="btn btn-secondary">
                    ⚙️ Update Preferences
                </a>
            </div>
        </div>
        
        <div class="footer">
            <p>🎂 <strong>Birthday Buddy</strong> - Never forget a birthday again!</p>
            <p>
                This email was sent to ${userEmail} in ${userTimezone} timezone<br>
                <a href="${process.env.FRONTEND_URL}/preferences">Update your preferences</a> | 
                <a href="${process.env.FRONTEND_URL}/unsubscribe">Unsubscribe</a>
            </p>
            <p style="margin-top: 15px; font-size: 12px; opacity: 0.7;">
                Reminder sent at your preferred time based on your settings ⏰
            </p>
        </div>
    </div>
</body>
</html>`;
};

module.exports = {
  getTemplateTheme,
  generatePersonalizedGreeting,
  generateBirthdayMessage,
  generateGiftSuggestions,
  createAdvancedEmailTemplate
};