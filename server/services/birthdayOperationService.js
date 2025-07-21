const moment = require('moment');

class BirthdayOperationService {
  constructor(db) {
    this.db = db;
  }

  // Parse AI response to extract structured data
  parseAIResponse(aiResponse) {
    const lines = aiResponse.split('\n');
    const parsedData = {};
    
    for (const line of lines) {
      if (line.includes(':')) {
        const [key, value] = line.split(':').map(s => s.trim());
        const cleanKey = key.toLowerCase().replace(/[^a-z]/g, '');
        parsedData[cleanKey] = value;
      }
    }
    
    return parsedData;
  }

  // Validate and format date
  formatDate(dateInput) {
    if (!dateInput || dateInput === 'None provided' || dateInput === '[extracted date in YYYY-MM-DD format if applicable]') {
      return null;
    }
    
    // Try multiple date formats
    const formats = ['YYYY-MM-DD', 'MM-DD', 'MM/DD', 'MMMM DD', 'MMM DD', 'DD/MM/YYYY', 'YYYY-MM-DD'];
    
    for (const format of formats) {
      const parsed = moment(dateInput, format, true);
      if (parsed.isValid()) {
        // If year is not provided, use current year
        if (format === 'MM-DD' || format === 'MM/DD' || format === 'MMMM DD' || format === 'MMM DD') {
          return parsed.year(new Date().getFullYear()).format('YYYY-MM-DD');
        }
        return parsed.format('YYYY-MM-DD');
      }
    }
    
    return null;
  }

  // Process ADD operation
  async processAdd(parsedData, userId) {
    try {
      const name = parsedData.name;
      const dateStr = this.formatDate(parsedData.date);
      const relationship = parsedData.relationship || 'friend';
      const bio = parsedData.details !== 'None provided' ? parsedData.details : '';
      
      if (!name || name === '[extracted name]') {
        return {
          success: false,
          error: 'Name is required',
          message: 'Please specify the person\'s name.'
        };
      }
      
      if (!dateStr) {
        return {
          success: false,
          error: 'Invalid date',
          message: 'Please provide a valid date (e.g., March 15, 03-15, or 2025-03-15).'
        };
      }
      
      // Check if birthday already exists
      const [existing] = await this.db.execute(
        'SELECT id FROM birthdays WHERE user_id = ? AND name = ?',
        [userId, name]
      );
      
      if (existing.length > 0) {
        return {
          success: false,
          error: 'Birthday already exists',
          message: `${name}'s birthday is already in your list. Would you like to update it instead?`
        };
      }
      
      // Insert new birthday - FIXED: using 'date' column name
      const [result] = await this.db.execute(
        'INSERT INTO birthdays (user_id, name, date, relationship, bio, created_at) VALUES (?, ?, ?, ?, ?, NOW())',
        [userId, name, dateStr, relationship.toLowerCase(), bio]
      );
      
      return {
        success: true,
        operation: 'ADD',
        data: {
          id: result.insertId,
          name,
          date: dateStr,
          relationship: relationship.toLowerCase(),
          bio
        },
        message: `🎉 Successfully added ${name}'s birthday (${moment(dateStr).format('MMMM Do')}) to your ${relationship.toLowerCase()} list!`
      };
      
    } catch (error) {
      console.error('❌ [BIRTHDAY_OP] Add operation failed:', error);
      return {
        success: false,
        error: 'Database error',
        message: 'Sorry, I couldn\'t add the birthday. Please try again.'
      };
    }
  }

  // Process UPDATE operation
  async processUpdate(parsedData, userId) {
    try {
      const name = parsedData.name;
      const dateStr = this.formatDate(parsedData.date);
      const relationship = parsedData.relationship;
      
      if (!name || name === '[extracted name]') {
        return {
          success: false,
          error: 'Name is required',
          message: 'Please specify whose birthday you want to update.'
        };
      }
      
      // Find existing birthday - FIXED: using 'date' column name
      const [existing] = await this.db.execute(
        'SELECT id, name, date, relationship FROM birthdays WHERE user_id = ? AND name LIKE ?',
        [userId, `%${name}%`]
      );
      
      if (existing.length === 0) {
        return {
          success: false,
          error: 'Birthday not found',
          message: `I couldn't find ${name}'s birthday in your list. Would you like to add it instead?`
        };
      }
      
      const birthday = existing[0];
      let updateFields = [];
      let updateValues = [];
      
      if (dateStr) {
        updateFields.push('date = ?'); // FIXED: using 'date' column name
        updateValues.push(dateStr);
      }
      
      if (relationship && relationship !== 'None provided') {
        updateFields.push('relationship = ?');
        updateValues.push(relationship.toLowerCase());
      }
      
      if (updateFields.length === 0) {
        return {
          success: false,
          error: 'No updates specified',
          message: 'Please specify what you want to update (date, relationship, etc.).'
        };
      }
      
      updateValues.push(birthday.id);
      
      await this.db.execute(
        `UPDATE birthdays SET ${updateFields.join(', ')}, created_at = NOW() WHERE id = ?`,
        updateValues
      );
      
      return {
        success: true,
        operation: 'UPDATE',
        data: {
          id: birthday.id,
          name: birthday.name,
          oldDate: birthday.date,
          newDate: dateStr || birthday.date
        },
        message: `✅ Successfully updated ${birthday.name}'s birthday information!`
      };
      
    } catch (error) {
      console.error('❌ [BIRTHDAY_OP] Update operation failed:', error);
      return {
        success: false,
        error: 'Database error',
        message: 'Sorry, I couldn\'t update the birthday. Please try again.'
      };
    }
  }

  // Process DELETE operation
  async processDelete(parsedData, userId) {
    try {
      const name = parsedData.name;
      
      if (!name || name === '[extracted name]') {
        return {
          success: false,
          error: 'Name is required',
          message: 'Please specify whose birthday you want to delete.'
        };
      }
      
      // Find existing birthday
      const [existing] = await this.db.execute(
        'SELECT id, name FROM birthdays WHERE user_id = ? AND name LIKE ?',
        [userId, `%${name}%`]
      );
      
      if (existing.length === 0) {
        return {
          success: false,
          error: 'Birthday not found',
          message: `I couldn't find ${name}'s birthday in your list.`
        };
      }
      
      const birthday = existing[0];
      
      // Delete the birthday
      await this.db.execute(
        'DELETE FROM birthdays WHERE id = ?',
        [birthday.id]
      );
      
      return {
        success: true,
        operation: 'DELETE',
        data: {
          id: birthday.id,
          name: birthday.name
        },
        message: `🗑️ Successfully removed ${birthday.name}'s birthday from your list.`
      };
      
    } catch (error) {
      console.error('❌ [BIRTHDAY_OP] Delete operation failed:', error);
      return {
        success: false,
        error: 'Database error',
        message: 'Sorry, I couldn\'t delete the birthday. Please try again.'
      };
    }
  }

  // Process SEARCH operation
  async processSearch(parsedData, userId) {
    try {
      let query = 'SELECT id, name, date, relationship, bio FROM birthdays WHERE user_id = ?';
      let queryParams = [userId];
      
      // Build search criteria
      if (parsedData.name && parsedData.name !== '[extracted name]') {
        query += ' AND name LIKE ?';
        queryParams.push(`%${parsedData.name}%`);
      }
      
      if (parsedData.relationship && parsedData.relationship !== 'None provided') {
        query += ' AND relationship = ?';
        queryParams.push(parsedData.relationship.toLowerCase());
      }
      
      // Add date filtering logic here if needed
      query += ' ORDER BY date'; // FIXED: using 'date' column name
      
      const [results] = await this.db.execute(query, queryParams);
      
      if (results.length === 0) {
        return {
          success: true,
          operation: 'SEARCH',
          data: [],
          message: 'No birthdays found matching your criteria.'
        };
      }
      
      const formattedResults = results.map(birthday => ({
        ...birthday,
        formattedDate: moment(birthday.date).format('MMMM Do'), // FIXED: using 'date' column name
        daysUntil: this.calculateDaysUntil(birthday.date) // FIXED: using 'date' column name
      }));
      
      return {
        success: true,
        operation: 'SEARCH',
        data: formattedResults,
        message: `Found ${results.length} birthday${results.length > 1 ? 's' : ''} matching your search.`
      };
      
    } catch (error) {
      console.error('❌ [BIRTHDAY_OP] Search operation failed:', error);
      return {
        success: false,
        error: 'Database error',
        message: 'Sorry, I couldn\'t search the birthdays. Please try again.'
      };
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

  // Main processing method
  async processOperation(aiResponse, userId) {
    const parsedData = this.parseAIResponse(aiResponse);
    const operation = parsedData.operation?.toUpperCase();
    
    console.log('🔧 [BIRTHDAY_OP] Processing:', operation, 'for user:', userId);
    console.log('📋 [BIRTHDAY_OP] Parsed data:', parsedData);
    
    switch (operation) {
      case 'ADD':
        return await this.processAdd(parsedData, userId);
      case 'EDIT':
      case 'UPDATE':
        return await this.processUpdate(parsedData, userId);
      case 'DELETE':
      case 'REMOVE':
        return await this.processDelete(parsedData, userId);
      case 'SEARCH':
      case 'FIND':
        return await this.processSearch(parsedData, userId);
      default:
        return {
          success: false,
          error: 'Unknown operation',
          message: 'I didn\'t understand that operation. Try: add, update, delete, or search.'
        };
    }
  }
}

module.exports = BirthdayOperationService;