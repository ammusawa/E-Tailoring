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

    console.log('📝 Creating notifications table...');
    await connection.query(`
      CREATE TABLE IF NOT EXISTS notifications (
        id VARCHAR(255) PRIMARY KEY,
        userId VARCHAR(255) NOT NULL,
        orderId VARCHAR(255),
        type ENUM('MESSAGE', 'ORDER_CONFIRMED', 'ORDER_STATUS_UPDATED', 'PAYMENT_CONFIRMED', 'PAYMENT_SUBMITTED', 'ORDER_ASSIGNED') NOT NULL,
        title VARCHAR(255) NOT NULL,
        message TEXT NOT NULL,
        isRead BOOLEAN DEFAULT FALSE,
        createdAt DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (userId) REFERENCES users(id) ON DELETE CASCADE,
        FOREIGN KEY (orderId) REFERENCES orders(id) ON DELETE CASCADE,
        INDEX idx_userId (userId),
        INDEX idx_orderId (orderId),
        INDEX idx_isRead (isRead),
        INDEX idx_createdAt (createdAt)
      )
    `);

    console.log('✅ Migration completed successfully!');

    await connection.end();
  } catch (error) {
    console.error('❌ Error migrating database:', error.message);
    process.exit(1);
  }
}

migrateDatabase();

