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

    console.log('📝 Adding COLLECTED status to orders table...');
    await connection.query(`
      ALTER TABLE orders 
      MODIFY COLUMN status ENUM('PENDING', 'CONFIRMED', 'IN_PROGRESS', 'READY_FOR_FITTING', 'REVISION', 'COMPLETED', 'COLLECTED', 'CANCELLED') DEFAULT 'PENDING'
    `);

    console.log('📝 Adding COLLECTED status to order_status_history table...');
    await connection.query(`
      ALTER TABLE order_status_history 
      MODIFY COLUMN status ENUM('PENDING', 'CONFIRMED', 'IN_PROGRESS', 'READY_FOR_FITTING', 'REVISION', 'COMPLETED', 'COLLECTED', 'CANCELLED') NOT NULL
    `);

    console.log('✅ Migration completed successfully!');

    await connection.end();
  } catch (error) {
    console.error('❌ Error migrating database:', error.message);
    process.exit(1);
  }
}

migrateDatabase();

