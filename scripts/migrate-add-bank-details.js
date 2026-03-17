const mysql = require('mysql2/promise');
require('dotenv').config();

async function migrateDatabase() {
  const connectionString = process.env.DATABASE_URL;
  
  if (!connectionString) {
    console.error('❌ DATABASE_URL is not set in .env file');
    process.exit(1);
  }

  // Parse MySQL connection string
  const url = new URL(connectionString);
  const config = {
    host: url.hostname,
    port: parseInt(url.port) || 3306,
    user: url.username,
    password: url.password,
    database: url.pathname.slice(1), // Remove leading '/'
    multipleStatements: true,
  };

  try {
    console.log('📦 Connecting to MySQL...');
    const connection = await mysql.createConnection(config);

    console.log('📝 Checking if bank columns exist in tailor_profiles table...');
    
    // Check if columns exist
    const [columns] = await connection.query(`
      SELECT COLUMN_NAME 
      FROM INFORMATION_SCHEMA.COLUMNS 
      WHERE TABLE_SCHEMA = ? 
      AND TABLE_NAME = 'tailor_profiles' 
      AND COLUMN_NAME IN ('bankName', 'accountName', 'accountNumber')
    `, [config.database]);

    const existingColumns = columns.map((col) => col.COLUMN_NAME);
    
    if (!existingColumns.includes('bankName')) {
      console.log('📝 Adding bankName column to tailor_profiles table...');
      await connection.query(`
        ALTER TABLE tailor_profiles 
        ADD COLUMN bankName VARCHAR(255) AFTER completedOrders
      `);
    } else {
      console.log('✓ bankName column already exists');
    }

    if (!existingColumns.includes('accountName')) {
      console.log('📝 Adding accountName column to tailor_profiles table...');
      await connection.query(`
        ALTER TABLE tailor_profiles 
        ADD COLUMN accountName VARCHAR(255) AFTER bankName
      `);
    } else {
      console.log('✓ accountName column already exists');
    }

    if (!existingColumns.includes('accountNumber')) {
      console.log('📝 Adding accountNumber column to tailor_profiles table...');
      await connection.query(`
        ALTER TABLE tailor_profiles 
        ADD COLUMN accountNumber VARCHAR(50) AFTER accountName
      `);
    } else {
      console.log('✓ accountNumber column already exists');
    }

    console.log('✅ Migration completed successfully!');

    await connection.end();
  } catch (error) {
    console.error('❌ Error migrating database:', error.message);
    process.exit(1);
  }
}

migrateDatabase();

