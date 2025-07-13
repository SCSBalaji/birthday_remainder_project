const { getConnection } = require('./connection');

/**
 * Migration script to add WhatsApp auto-messaging columns to existing birthdays table
 */
const addWhatsAppColumns = async () => {
  try {
    const connection = getConnection();
    
    console.log('🔄 Starting migration: Adding WhatsApp auto-messaging columns...');
    
    // Check if columns already exist to avoid duplicate column errors
    const [columns] = await connection.execute(`
      SELECT COLUMN_NAME 
      FROM INFORMATION_SCHEMA.COLUMNS 
      WHERE TABLE_SCHEMA = ? AND TABLE_NAME = 'birthdays'
    `, [process.env.DB_NAME]);
    
    const existingColumns = columns.map(col => col.COLUMN_NAME);
    
    // Add phone_number column if it doesn't exist
    if (!existingColumns.includes('phone_number')) {
      await connection.execute(`
        ALTER TABLE birthdays 
        ADD COLUMN phone_number VARCHAR(20) NULL
      `);
      console.log('✅ Added phone_number column');
    } else {
      console.log('ℹ️  phone_number column already exists');
    }
    
    // Add custom_message column if it doesn't exist
    if (!existingColumns.includes('custom_message')) {
      await connection.execute(`
        ALTER TABLE birthdays 
        ADD COLUMN custom_message TEXT NULL
      `);
      console.log('✅ Added custom_message column');
    } else {
      console.log('ℹ️  custom_message column already exists');
    }
    
    // Add auto_message_enabled column if it doesn't exist
    if (!existingColumns.includes('auto_message_enabled')) {
      await connection.execute(`
        ALTER TABLE birthdays 
        ADD COLUMN auto_message_enabled BOOLEAN DEFAULT FALSE
      `);
      console.log('✅ Added auto_message_enabled column');
    } else {
      console.log('ℹ️  auto_message_enabled column already exists');
    }
    
    // Add last_message_sent column if it doesn't exist
    if (!existingColumns.includes('last_message_sent')) {
      await connection.execute(`
        ALTER TABLE birthdays 
        ADD COLUMN last_message_sent DATE NULL
      `);
      console.log('✅ Added last_message_sent column');
    } else {
      console.log('ℹ️  last_message_sent column already exists');
    }
    
    console.log('🎉 Migration completed successfully!');
    return true;
    
  } catch (error) {
    console.error('❌ Migration failed:', error.message);
    throw error;
  }
};

/**
 * Rollback migration - remove WhatsApp columns (use with caution)
 */
const removeWhatsAppColumns = async () => {
  try {
    const connection = getConnection();
    
    console.log('🔄 Starting rollback: Removing WhatsApp auto-messaging columns...');
    
    // Check if columns exist before trying to drop them
    const [columns] = await connection.execute(`
      SELECT COLUMN_NAME 
      FROM INFORMATION_SCHEMA.COLUMNS 
      WHERE TABLE_SCHEMA = ? AND TABLE_NAME = 'birthdays'
    `, [process.env.DB_NAME]);
    
    const existingColumns = columns.map(col => col.COLUMN_NAME);
    
    // Remove columns in reverse order
    const columnsToRemove = ['last_message_sent', 'auto_message_enabled', 'custom_message', 'phone_number'];
    
    for (const columnName of columnsToRemove) {
      if (existingColumns.includes(columnName)) {
        await connection.execute(`ALTER TABLE birthdays DROP COLUMN ${columnName}`);
        console.log(`✅ Removed ${columnName} column`);
      } else {
        console.log(`ℹ️  ${columnName} column doesn't exist`);
      }
    }
    
    console.log('🎉 Rollback completed successfully!');
    return true;
    
  } catch (error) {
    console.error('❌ Rollback failed:', error.message);
    throw error;
  }
};

/**
 * Check current table structure
 */
const checkTableStructure = async () => {
  try {
    const connection = getConnection();
    
    const [columns] = await connection.execute(`
      SELECT COLUMN_NAME, DATA_TYPE, IS_NULLABLE, COLUMN_DEFAULT
      FROM INFORMATION_SCHEMA.COLUMNS 
      WHERE TABLE_SCHEMA = ? AND TABLE_NAME = 'birthdays'
      ORDER BY ORDINAL_POSITION
    `, [process.env.DB_NAME]);
    
    console.log('📋 Current birthdays table structure:');
    console.table(columns);
    
    return columns;
    
  } catch (error) {
    console.error('❌ Error checking table structure:', error.message);
    throw error;
  }
};

module.exports = {
  addWhatsAppColumns,
  removeWhatsAppColumns,
  checkTableStructure
};