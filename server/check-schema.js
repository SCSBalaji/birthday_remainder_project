const mysql = require('mysql2');
require('dotenv').config();

async function checkSchema() {
  const connection = mysql.createConnection({
    host: process.env.DB_HOST || 'localhost',
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD || '',
    database: process.env.DB_NAME || 'birthday_buddy'
  });

  try {
    console.log('🔍 Checking database schema...\n');
    
    // Check birthdays table structure
    const [columns] = await connection.promise().execute('DESCRIBE birthdays');
    
    console.log('📋 BIRTHDAYS TABLE COLUMNS:');
    console.log('='.repeat(50));
    columns.forEach(col => {
      console.log(`${col.Field.padEnd(20)} | ${col.Type.padEnd(15)} | ${col.Null.padEnd(5)} | ${col.Key.padEnd(5)} | ${col.Default || 'NULL'}`);
    });
    
    console.log('\n📊 Sample data:');
    const [sample] = await connection.promise().execute('SELECT * FROM birthdays LIMIT 2');
    console.log(sample);
    
  } catch (error) {
    console.error('❌ Error:', error.message);
  } finally {
    connection.end();
  }
}

checkSchema();