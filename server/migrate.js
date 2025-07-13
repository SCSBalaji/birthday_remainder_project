#!/usr/bin/env node

/**
 * Migration Runner Script
 * 
 * Usage:
 *   node migrate.js up     - Apply WhatsApp columns migration
 *   node migrate.js down   - Rollback WhatsApp columns migration  
 *   node migrate.js check  - Check current table structure
 */

require('dotenv').config();
const { connectDB } = require('./database/connection');
const { addWhatsAppColumns, removeWhatsAppColumns, checkTableStructure } = require('./database/migrations');

async function runMigration() {
  const command = process.argv[2];
  
  if (!command) {
    console.log('📖 Usage:');
    console.log('  node migrate.js up     - Apply WhatsApp columns migration');
    console.log('  node migrate.js down   - Rollback WhatsApp columns migration');
    console.log('  node migrate.js check  - Check current table structure');
    process.exit(1);
  }
  
  try {
    // Connect to database
    await connectDB();
    console.log('✅ Connected to database');
    
    switch (command.toLowerCase()) {
      case 'up':
        await addWhatsAppColumns();
        break;
        
      case 'down':
        console.log('⚠️  WARNING: This will remove WhatsApp columns and their data!');
        console.log('⚠️  Make sure you have a backup before proceeding.');
        
        // In a production environment, you might want to add a confirmation prompt here
        await removeWhatsAppColumns();
        break;
        
      case 'check':
        await checkTableStructure();
        break;
        
      default:
        console.log('❌ Invalid command. Use: up, down, or check');
        process.exit(1);
    }
    
    console.log('✅ Migration operation completed successfully');
    process.exit(0);
    
  } catch (error) {
    console.error('❌ Migration failed:', error.message);
    process.exit(1);
  }
}

// Run the migration
runMigration();