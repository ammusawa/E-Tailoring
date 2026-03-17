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

    console.log('📝 Checking if receipt column exists in payments table...');
    
    // Check if column exists
    const [columns] = await connection.query(`
      SELECT COLUMN_NAME 
      FROM INFORMATION_SCHEMA.COLUMNS 
      WHERE TABLE_SCHEMA = ? 
      AND TABLE_NAME = 'payments' 
      AND COLUMN_NAME = 'receipt'
    `, [config.database]);

    if (columns.length === 0) {
      console.log('📝 Adding receipt column to payments table...');
      await connection.query(`
        ALTER TABLE payments 
        ADD COLUMN receipt LONGTEXT AFTER paystackResponse
      `);
    } else {
      console.log('✓ receipt column already exists');
    }

    // Update payment status enum to include PENDING_CONFIRMATION
    console.log('📝 Updating payment status enum...');
    try {
      await connection.query(`
        ALTER TABLE payments 
        MODIFY COLUMN status ENUM('PENDING', 'PENDING_CONFIRMATION', 'PAID', 'FAILED', 'REFUNDED', 'REJECTED') DEFAULT 'PENDING'
      `);
      console.log('✓ Payment status enum updated');
    } catch (error) {
      // If enum already has the value, ignore
      if (!error.message.includes('Duplicate value')) {
        console.log('⚠️  Payment status enum may already be updated');
      }
    }

    console.log('✅ Migration completed successfully!');

    await connection.end();
  } catch (error) {
    console.error('❌ Error migrating database:', error.message);
    process.exit(1);
  }
}

migrateDatabase();

