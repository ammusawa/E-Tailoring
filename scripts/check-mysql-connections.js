const mysql = require('mysql2/promise');
require('dotenv').config();

async function checkConnections() {
  const connectionString = process.env.DATABASE_URL;
  
  if (!connectionString) {
    console.error('❌ DATABASE_URL is not set in .env file');
    process.exit(1);
  }

  const url = new URL(connectionString);
  const config = {
    host: url.hostname,
    port: parseInt(url.port) || 3306,
    user: url.username,
    password: url.password,
  };

  try {
    console.log('📦 Connecting to MySQL...');
    const connection = await mysql.createConnection(config);

    // Check current connections
    const [connections] = await connection.query(`
      SHOW STATUS WHERE Variable_name = 'Threads_connected' OR Variable_name = 'Max_used_connections'
    `);

    const [variables] = await connection.query(`
      SHOW VARIABLES WHERE Variable_name = 'max_connections'
    `);

    console.log('\n📊 Connection Status:');
    connections.forEach((row: any) => {
      console.log(`  ${row.Variable_name}: ${row.Value}`);
    });

    variables.forEach((row: any) => {
      console.log(`  ${row.Variable_name}: ${row.Value}`);
    });

    // Show current processes
    const [processes] = await connection.query('SHOW PROCESSLIST');
    console.log(`\n📋 Active Connections: ${processes.length}`);
    
    if (processes.length > 0) {
      console.log('\nActive processes:');
      processes.forEach((proc: any, index: number) => {
        if (index < 10) { // Show first 10
          console.log(`  ${proc.Id}: ${proc.User}@${proc.Host} - ${proc.State || 'Sleep'} - ${proc.Info || 'N/A'}`);
        }
      });
      if (processes.length > 10) {
        console.log(`  ... and ${processes.length - 10} more`);
      }
    }

    await connection.end();
    console.log('\n✅ Check completed');
  } catch (error) {
    console.error('❌ Error checking connections:', error.message);
    process.exit(1);
  }
}

checkConnections();

