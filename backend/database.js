// ==========================================
// BillBook Backend - SQLite Database Wrapper
// ==========================================

const sqlite3 = require('sqlite3').verbose();
const path = require('path');

const dbPath = path.resolve(__dirname, 'database.sqlite');
const db = new sqlite3.Database(dbPath, (err) => {
  if (err) {
    console.error('Error connecting to the database:', err.message);
  } else {
    console.log('Connected to the SQLite database at:', dbPath);
    initializeTables();
  }
});

// Helper: Wrap db queries in Promises for async/await support
const dbQuery = {
  run(sql, params = []) {
    return new Promise((resolve, reject) => {
      db.run(sql, params, function (err) {
        if (err) reject(err);
        else resolve({ id: this.lastID, changes: this.changes });
      });
    });
  },
  all(sql, params = []) {
    return new Promise((resolve, reject) => {
      db.all(sql, params, (err, rows) => {
        if (err) reject(err);
        else resolve(rows);
      });
    });
  },
  get(sql, params = []) {
    return new Promise((resolve, reject) => {
      db.get(sql, params, (err, row) => {
        if (err) reject(err);
        else resolve(row);
      });
    });
  }
};

// Initialize Tables if they do not exist
function initializeTables() {
  db.serialize(async () => {
    // 1. Company Profile Table
    await dbQuery.run(`
      CREATE TABLE IF NOT EXISTS profile (
        id INTEGER PRIMARY KEY CHECK (id = 1),
        name TEXT NOT NULL,
        email TEXT,
        phone TEXT,
        address TEXT,
        taxId TEXT,
        currency TEXT NOT NULL
      )
    `);

    // Insert Default Profile if empty
    const profileCount = await dbQuery.get('SELECT COUNT(*) as count FROM profile');
    if (profileCount.count === 0) {
      await dbQuery.run(`
        INSERT INTO profile (id, name, email, phone, address, taxId, currency)
        VALUES (1, 'Spark Technologies', 'finance@sparktech.io', '+91 90123 45678', '404 Innovation Hub, Phase 2, Indiranagar, Bengaluru, KA - 560038', '29AAAAA8888M1Z2', '₹')
      `);
      console.log('Default company profile initialized.');
    }

    // 2. Products Table
    await dbQuery.run(`
      CREATE TABLE IF NOT EXISTS products (
        id TEXT PRIMARY KEY,
        name TEXT NOT NULL,
        sku TEXT UNIQUE NOT NULL,
        price REAL NOT NULL,
        tax INTEGER DEFAULT 0,
        stock INTEGER NOT NULL
      )
    `);

    // 3. Customers Table
    await dbQuery.run(`
      CREATE TABLE IF NOT EXISTS customers (
        id TEXT PRIMARY KEY,
        name TEXT NOT NULL,
        email TEXT,
        phone TEXT NOT NULL,
        address TEXT
      )
    `);

    // 4. Invoices Table (items stored as JSON string)
    await dbQuery.run(`
      CREATE TABLE IF NOT EXISTS invoices (
        id TEXT PRIMARY KEY,
        number TEXT UNIQUE NOT NULL,
        date TEXT NOT NULL,
        dueDate TEXT NOT NULL,
        customerId TEXT NOT NULL,
        customerName TEXT NOT NULL,
        items TEXT NOT NULL, -- JSON String
        subtotal REAL NOT NULL,
        discountPercent REAL DEFAULT 0,
        discountAmount REAL DEFAULT 0,
        taxAmount REAL NOT NULL,
        total REAL NOT NULL,
        paymentMode TEXT NOT NULL,
        status TEXT NOT NULL,
        notes TEXT,
        FOREIGN KEY(customerId) REFERENCES customers(id)
      )
    `);

    console.log('Database tables successfully verified/initialized.');
  });
}

module.exports = { db, dbQuery };
