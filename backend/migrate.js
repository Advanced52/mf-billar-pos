const db = require('./db');

async function migrate() {
  try {
    console.log("Starting migration...");
    
    // Check if category exists before adding
    await db.query(`ALTER TABLE products ADD COLUMN IF NOT EXISTS category VARCHAR(255) DEFAULT 'General'`);
    
    // Drop prices from products
    await db.query(`ALTER TABLE products DROP COLUMN IF EXISTS purchase_price`);
    await db.query(`ALTER TABLE products DROP COLUMN IF EXISTS sale_price`);
    
    // Create inventory_entries
    await db.query(`
      CREATE TABLE IF NOT EXISTS inventory_entries (
        id SERIAL PRIMARY KEY,
        product_id INT REFERENCES products(id) ON DELETE CASCADE,
        quantity INT NOT NULL,
        purchase_price DECIMAL(10,2) NOT NULL,
        sale_price DECIMAL(10,2) NOT NULL,
        observation TEXT,
        date TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);
    
    await db.query(`
      CREATE TABLE IF NOT EXISTS fiados (
        id SERIAL PRIMARY KEY,
        product_id INT REFERENCES products(id) ON DELETE SET NULL,
        quantity INT NOT NULL,
        debtor_name VARCHAR(255) NOT NULL,
        description TEXT,
        total DECIMAL(10, 2) NOT NULL,
        profit DECIMAL(10, 2) NOT NULL DEFAULT 0,
        status VARCHAR(20) NOT NULL DEFAULT 'pending',
        date TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        settled_at TIMESTAMP
      )
    `);

    console.log("Migration completed successfully.");
    process.exit(0);
  } catch (err) {
    console.error("Migration failed:", err);
    process.exit(1);
  }
}

migrate();
