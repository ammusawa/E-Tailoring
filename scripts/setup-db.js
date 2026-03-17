const mysql = require('mysql2/promise');
const fs = require('fs');
const path = require('path');
require('dotenv').config();

async function setupDatabase() {
  const connectionString = process.env.DATABASE_URL;
  
  if (!connectionString) {
    console.error('❌ DATABASE_URL is not set in .env file');
    process.exit(1);
  }

  // Parse MySQL connection string
  const url = new URL(connectionString);
  const databaseName = url.pathname.slice(1); // Remove leading '/'
  
  const config = {
    host: url.hostname,
    port: parseInt(url.port) || 3306,
    user: url.username,
    password: url.password,
    multipleStatements: true,
  };

  try {
    console.log('📦 Connecting to MySQL...');
    const connection = await mysql.createConnection(config);

    // Create database if it doesn't exist
    console.log(`📝 Creating database '${databaseName}' if it doesn't exist...`);
    await connection.query(`CREATE DATABASE IF NOT EXISTS \`${databaseName}\``);
    await connection.query(`USE \`${databaseName}\``);

    // Read and execute schema file
    const schemaPath = path.join(__dirname, '..', 'database', 'schema.sql');
    
    if (!fs.existsSync(schemaPath)) {
      throw new Error(`Schema file not found at: ${schemaPath}`);
    }

    const schema = fs.readFileSync(schemaPath, 'utf8');

    console.log('📝 Executing database schema...');
    await connection.query(schema);

    console.log('✅ Database setup completed successfully!');
    console.log('💡 You can now run: npm run db:seed');

    await connection.end();
  } catch (error) {
    console.error('❌ Error setting up database:', error.message);
    if (error.stack) {
      console.error('Stack trace:', error.stack);
    }
    process.exit(1);
  }
}

setupDatabase();

