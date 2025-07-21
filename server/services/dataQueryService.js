const moment = require('moment');

class DataQueryService {
  constructor(db) {
    this.db = db;
  }

  // Parse AI response to understand query type
  parseQueryResponse(aiResponse) {
    const lines = aiResponse.split('\n');
    const parsedData = {};
    
    for (const line of lines) {
      if (line.includes(':')) {
        const [key, value] = line.split(':').map(s => s.trim());
        const cleanKey = key.toLowerCase().replace(/[^a-z_]/g, '');
        parsedData[cleanKey] = value;
      }
    }
    
    return parsedData;
  }

  // Get birthday statistics
  async getBirthdayStats(userId) {
    try {
      const queries = [
        // Total birthdays
        'SELECT COUNT(*) as total FROM birthdays WHERE user_id = ?',
        
        // Birthdays by relationship
        'SELECT relationship, COUNT(*) as count FROM birthdays WHERE user_id = ? GROUP BY relationship',
        
        // Upcoming birthdays (next 30 days) - FIXED: using 'date' column name
        `SELECT COUNT(*) as upcoming FROM birthdays WHERE user_id = ? 
         AND DATE_FORMAT(date, '%m-%d') BETWEEN DATE_FORMAT(CURDATE(), '%m-%d') 
         AND DATE_FORMAT(DATE_ADD(CURDATE(), INTERVAL 30 DAY), '%m-%d')`,
        
        // This month's birthdays - FIXED: using 'date' column name
        'SELECT COUNT(*) as this_month FROM birthdays WHERE user_id = ? AND MONTH(date) = MONTH(CURDATE())',
        
        // Next month's birthdays - FIXED: using 'date' column name
        'SELECT COUNT(*) as next_month FROM birthdays WHERE user_id = ? AND MONTH(date) = MONTH(DATE_ADD(CURDATE(), INTERVAL 1 MONTH))'
      ];
      
      const [totalResult] = await this.db.execute(queries[0], [userId]);
      const [relationshipResult] = await this.db.execute(queries[1], [userId]);
      const [upcomingResult] = await this.db.execute(queries[2], [userId]);
      const [thisMonthResult] = await this.db.execute(queries[3], [userId]);
      const [nextMonthResult] = await this.db.execute(queries[4], [userId]);
      
      return {
        total: totalResult[0].total,
        byRelationship: relationshipResult,
        upcoming: upcomingResult[0].upcoming,
        thisMonth: thisMonthResult[0].this_month,
        nextMonth: nextMonthResult[0].next_month
      };
      
    } catch (error) {
      console.error('❌ [DATA_QUERY] Stats query failed:', error);
      throw error;
    }
  }

  // Get birthdays by month
  async getBirthdaysByMonth(userId, month = null) {
    try {
      let query = `
        SELECT name, date, relationship, bio 
        FROM birthdays 
        WHERE user_id = ?
      `;
      let params = [userId];
      
      if (month) {
        query += ' AND MONTH(date) = ?'; // FIXED: using 'date' column name
        params.push(month);
      }
      
      query += ' ORDER BY DAY(date)'; // FIXED: using 'date' column name
      
      const [results] = await this.db.execute(query, params);
      
      return results.map(birthday => ({
        ...birthday,
        formattedDate: moment(birthday.date).format('MMMM Do'), // FIXED: using 'date' column name
        month: moment(birthday.date).format('MMMM'), // FIXED: using 'date' column name
        day: moment(birthday.date).format('Do') // FIXED: using 'date' column name
      }));
      
    } catch (error) {
      console.error('❌ [DATA_QUERY] Month query failed:', error);
      throw error;
    }
  }

  // Get birthdays by relationship
  async getBirthdaysByRelationship(userId, relationship) {
    try {
      const [results] = await this.db.execute(
        'SELECT name, date, relationship, bio FROM birthdays WHERE user_id = ? AND relationship = ? ORDER BY date', // FIXED: using 'date' column name
        [userId, relationship.toLowerCase()]
      );
      
      return results.map(birthday => ({
        ...birthday,
        formattedDate: moment(birthday.date).format('MMMM Do'), // FIXED: using 'date' column name
        daysUntil: this.calculateDaysUntil(birthday.date) // FIXED: using 'date' column name
      }));
      
    } catch (error) {
      console.error('❌ [DATA_QUERY] Relationship query failed:', error);
      throw error;
    }
  }

  // Calculate days until next birthday
  calculateDaysUntil(birthdayDate) {
    const today = moment();
    const thisYear = moment(birthdayDate).year(today.year());
    const nextYear = moment(birthdayDate).year(today.year() + 1);
    
    if (thisYear.isSameOrAfter(today)) {
      return thisYear.diff(today, 'days');
    } else {
      return nextYear.diff(today, 'days');
    }
  }

  // Process smart query
  async processQuery(aiResponse, userId) {
    try {
      const parsedData = this.parseQueryResponse(aiResponse);
      const queryType = parsedData.querytype || parsedData.query_type;
      
      console.log('📊 [DATA_QUERY] Processing query type:', queryType);
      console.log('📋 [DATA_QUERY] Parsed data:', parsedData);
      
      let results;
      let message;
      
      switch (queryType?.toUpperCase()) {
        case 'STATISTICS':
          results = await this.getBirthdayStats(userId);
          message = this.formatStatsMessage(results);
          break;
          
        case 'FILTER':
        case 'ANALYSIS':
          // Extract month or relationship from the insights
          const insights = parsedData.insights || '';
          
          if (insights.includes('next month')) {
            const nextMonth = moment().add(1, 'month').month() + 1;
            results = await this.getBirthdaysByMonth(userId, nextMonth);
            message = this.formatMonthMessage(results, 'next month');
          } else if (insights.includes('this month')) {
            const thisMonth = moment().month() + 1;
            results = await this.getBirthdaysByMonth(userId, thisMonth);
            message = this.formatMonthMessage(results, 'this month');
          } else {
            // General statistics
            results = await this.getBirthdayStats(userId);
            message = this.formatStatsMessage(results);
          }
          break;
          
        default:
          // Fallback to general statistics
          results = await this.getBirthdayStats(userId);
          message = this.formatStatsMessage(results);
      }
      
      return {
        success: true,
        queryType: queryType || 'STATISTICS',
        data: results,
        message: message
      };
      
    } catch (error) {
      console.error('❌ [DATA_QUERY] Query processing failed:', error);
      return {
        success: false,
        error: 'Database error',
        message: 'Sorry, I couldn\'t process your query. Please try again.'
      };
    }
  }

  // Format statistics message
  formatStatsMessage(stats) {
    let message = `📊 **Your Birthday Statistics:**\n\n`;
    message += `🎂 **Total Birthdays:** ${stats.total}\n`;
    message += `📅 **This Month:** ${stats.thisMonth}\n`;
    message += `📅 **Next Month:** ${stats.nextMonth}\n`;
    message += `🎯 **Upcoming (30 days):** ${stats.upcoming}\n\n`;
    
    if (stats.byRelationship && stats.byRelationship.length > 0) {
      message += `👥 **By Relationship:**\n`;
      stats.byRelationship.forEach(rel => {
        const emoji = this.getRelationshipEmoji(rel.relationship);
        message += `${emoji} ${rel.relationship}: ${rel.count}\n`;
      });
    }
    
    return message;
  }

  // Format month message
  formatMonthMessage(birthdays, monthName) {
    if (birthdays.length === 0) {
      return `📅 No birthdays found for ${monthName}.`;
    }
    
    let message = `📅 **Birthdays for ${monthName}:** (${birthdays.length} total)\n\n`;
    
    birthdays.forEach(birthday => {
      const emoji = this.getRelationshipEmoji(birthday.relationship);
      message += `${emoji} **${birthday.name}** - ${birthday.formattedDate} (${birthday.relationship})\n`;
    });
    
    return message;
  }

  // Get emoji for relationship
  getRelationshipEmoji(relationship) {
    const emojiMap = {
      family: '👨‍👩‍👧‍👦',
      friend: '👫',
      colleague: '👔',
      partner: '💕',
      other: '👤'
    };
    
    return emojiMap[relationship.toLowerCase()] || '👤';
  }
}

module.exports = DataQueryService;