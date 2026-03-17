const mysql = require('mysql2/promise');
require('dotenv').config();

async function migrateDatabase() {
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
    database: url.pathname.slice(1),
    multipleStatements: true,
  };

  try {
    console.log('📦 Connecting to MySQL...');
    const connection = await mysql.createConnection(config);

    console.log('📝 Creating style_images table...');
    await connection.query(`
      CREATE TABLE IF NOT EXISTS style_images (
        id VARCHAR(255) PRIMARY KEY,
        styleId VARCHAR(255) NOT NULL,
        imageUrl LONGTEXT NOT NULL,
        displayOrder INT DEFAULT 0,
        createdAt DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (styleId) REFERENCES styles(id) ON DELETE CASCADE,
        INDEX idx_styleId (styleId),
        INDEX idx_displayOrder (displayOrder)
      );
    `);

    console.log('📝 Migrating existing images from styles table to style_images...');
    // Get all styles with images
    const [styles] = await connection.query(
      'SELECT id, imageUrl FROM styles WHERE imageUrl IS NOT NULL AND imageUrl != ""'
    );

    for (const style of styles) {
      const imageId = `img_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
      await connection.query(
        'INSERT INTO style_images (id, styleId, imageUrl, displayOrder) VALUES (?, ?, ?, ?)',
        [imageId, style.id, style.imageUrl, 0]
      );
    }

    console.log(`✅ Migrated ${styles.length} existing images to style_images table`);

    console.log('✅ Migration completed successfully!');

    await connection.end();
  } catch (error) {
    console.error('❌ Error migrating database:', error.message);
    process.exit(1);
  }
}

migrateDatabase();

