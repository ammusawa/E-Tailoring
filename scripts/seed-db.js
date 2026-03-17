const mysql = require('mysql2/promise');
const crypto = require('crypto');
require('dotenv').config();

function generateId() {
  return crypto.randomBytes(16).toString('hex');
}

async function seedDatabase() {
  const connectionString = process.env.DATABASE_URL;
  
  if (!connectionString) {
    console.error('❌ DATABASE_URL is not set in .env file');
    process.exit(1);
  }

  const url = new URL(connectionString);
  const connection = await mysql.createConnection({
    host: url.hostname,
    port: parseInt(url.port) || 3306,
    user: url.username,
    password: url.password,
    database: url.pathname.slice(1),
  });

  try {
    console.log('🌱 Seeding database...');

    // Check if styles already exist
    const [existingStyles] = await connection.query('SELECT COUNT(*) as count FROM styles');
    if (existingStyles[0].count > 0) {
      console.log('⚠️  Styles already exist, skipping seed...');
      await connection.end();
      return;
    }

    const styles = [
      {
        id: generateId(),
        name: 'Classic Shirt',
        description: 'A timeless classic shirt perfect for any occasion',
        category: 'Shirt',
        basePrice: 15000,
      },
      {
        id: generateId(),
        name: 'Formal Trouser',
        description: 'Well-fitted formal trousers for business and formal events',
        category: 'Trouser',
        basePrice: 12000,
      },
      {
        id: generateId(),
        name: 'Traditional Agbada',
        description: 'Elegant traditional Nigerian agbada set',
        category: 'Traditional',
        basePrice: 35000,
      },
      {
        id: generateId(),
        name: 'Ankara Dress',
        description: 'Beautiful Ankara fabric dress with modern design',
        category: 'Dress',
        basePrice: 18000,
      },
      {
        id: generateId(),
        name: 'Two-Piece Suit',
        description: 'Professional two-piece suit for formal occasions',
        category: 'Suit',
        basePrice: 45000,
      },
      {
        id: generateId(),
        name: 'Kaftan',
        description: 'Comfortable and stylish kaftan',
        category: 'Traditional',
        basePrice: 14000,
      },
    ];

    for (const style of styles) {
      await connection.query(
        `INSERT INTO styles (id, name, description, category, basePrice, isActive) 
         VALUES (?, ?, ?, ?, ?, ?)`,
        [style.id, style.name, style.description, style.category, style.basePrice, true]
      );
    }

    console.log(`✅ Seeded ${styles.length} styles successfully!`);
    await connection.end();
  } catch (error) {
    console.error('❌ Error seeding database:', error.message);
    await connection.end();
    process.exit(1);
  }
}

seedDatabase();

