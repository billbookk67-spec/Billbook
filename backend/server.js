// ==========================================
// BillBook Backend - REST API Server
// ==========================================

require('dotenv').config();
const express = require('express');
const cors = require('cors');
const { dbQuery, db } = require('./database');

const app = express();
const PORT = process.env.PORT || 5000;

// Middleware
app.use(cors());
app.use(express.json());

// ------------------------------------------
// 1. Company Profile Routes
// ------------------------------------------
app.get('/api/profile', async (req, res) => {
  try {
    const profile = await dbQuery.get('SELECT * FROM profile WHERE id = 1');
    res.json(profile);
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch profile: ' + err.message });
  }
});

app.post('/api/profile', async (req, res) => {
  const { name, email, phone, address, taxId, currency } = req.body;
  if (!name || !currency) {
    return res.status(400).json({ error: 'Company Name and Currency are required.' });
  }

  try {
    await dbQuery.run(
      `UPDATE profile 
       SET name = ?, email = ?, phone = ?, address = ?, taxId = ?, currency = ? 
       WHERE id = 1`,
      [name, email, phone, address, taxId, currency]
    );
    const updated = await dbQuery.get('SELECT * FROM profile WHERE id = 1');
    res.json(updated);
  } catch (err) {
    res.status(500).json({ error: 'Failed to update profile: ' + err.message });
  }
});

// ------------------------------------------
// 2. Inventory / Products CRUD Routes
// ------------------------------------------
app.get('/api/products', async (req, res) => {
  try {
    const products = await dbQuery.all('SELECT * FROM products');
    res.json(products);
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch products: ' + err.message });
  }
});

app.post('/api/products', async (req, res) => {
  const { id, name, sku, price, tax, stock } = req.body;
  if (!id || !name || !sku || price === undefined || stock === undefined) {
    return res.status(400).json({ error: 'Required fields missing: id, name, sku, price, stock.' });
  }

  try {
    await dbQuery.run(
      'INSERT INTO products (id, name, sku, price, tax, stock) VALUES (?, ?, ?, ?, ?, ?)',
      [id, name, sku.toUpperCase(), price, tax || 0, stock]
    );
    res.status(201).json({ message: 'Product created successfully.' });
  } catch (err) {
    if (err.message.includes('UNIQUE constraint failed')) {
      res.status(400).json({ error: 'Product SKU must be unique.' });
    } else {
      res.status(500).json({ error: 'Failed to add product: ' + err.message });
    }
  }
});

app.put('/api/products/:id', async (req, res) => {
  const { name, sku, price, tax, stock } = req.body;
  const { id } = req.params;

  try {
    await dbQuery.run(
      `UPDATE products 
       SET name = ?, sku = ?, price = ?, tax = ?, stock = ? 
       WHERE id = ?`,
      [name, sku.toUpperCase(), price, tax || 0, stock, id]
    );
    res.json({ message: 'Product updated successfully.' });
  } catch (err) {
    res.status(500).json({ error: 'Failed to update product: ' + err.message });
  }
});

app.delete('/api/products/:id', async (req, res) => {
  const { id } = req.params;
  try {
    await dbQuery.run('DELETE FROM products WHERE id = ?', [id]);
    res.json({ message: 'Product deleted successfully.' });
  } catch (err) {
    res.status(500).json({ error: 'Failed to delete product: ' + err.message });
  }
});

// ------------------------------------------
// 3. Customers CRUD Routes
// ------------------------------------------
app.get('/api/customers', async (req, res) => {
  try {
    const customers = await dbQuery.all('SELECT * FROM customers');
    res.json(customers);
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch customers: ' + err.message });
  }
});

app.post('/api/customers', async (req, res) => {
  const { id, name, email, phone, address } = req.body;
  if (!id || !name || !phone) {
    return res.status(400).json({ error: 'Required fields missing: id, name, phone.' });
  }

  try {
    await dbQuery.run(
      'INSERT INTO customers (id, name, email, phone, address) VALUES (?, ?, ?, ?, ?)',
      [id, name, email, phone, address]
    );
    res.status(201).json({ message: 'Customer added successfully.' });
  } catch (err) {
    res.status(500).json({ error: 'Failed to add customer: ' + err.message });
  }
});

app.put('/api/customers/:id', async (req, res) => {
  const { name, email, phone, address } = req.body;
  const { id } = req.params;

  try {
    await dbQuery.run(
      `UPDATE customers 
       SET name = ?, email = ?, phone = ?, address = ? 
       WHERE id = ?`,
      [name, email, phone, address, id]
    );
    res.json({ message: 'Customer details updated.' });
  } catch (err) {
    res.status(500).json({ error: 'Failed to update customer: ' + err.message });
  }
});

app.delete('/api/customers/:id', async (req, res) => {
  const { id } = req.params;
  try {
    // Check if customer has invoices
    const checkInvoice = await dbQuery.get('SELECT COUNT(*) as count FROM invoices WHERE customerId = ?', [id]);
    if (checkInvoice.count > 0) {
      return res.status(400).json({ error: 'Cannot delete customer. Active invoices are linked to this client.' });
    }
    
    await dbQuery.run('DELETE FROM customers WHERE id = ?', [id]);
    res.json({ message: 'Customer record deleted.' });
  } catch (err) {
    res.status(500).json({ error: 'Failed to delete customer: ' + err.message });
  }
});

// ------------------------------------------
// 4. Invoices Management Routes
// ------------------------------------------
app.get('/api/invoices', async (req, res) => {
  try {
    const invoices = await dbQuery.all('SELECT * FROM invoices');
    // Parse items JSON strings back to array objects
    const formatted = invoices.map(inv => ({
      ...inv,
      items: JSON.parse(inv.items)
    }));
    res.json(formatted);
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch invoices: ' + err.message });
  }
});

app.post('/api/invoices', (req, res) => {
  const {
    id, number, date, dueDate, customerId, customerName, items,
    subtotal, discountPercent, discountAmount, taxAmount, total, paymentMode, status, notes
  } = req.body;

  if (!id || !number || !customerId || !items || items.length === 0) {
    return res.status(400).json({ error: 'Missing invoice fields.' });
  }

  // Use SQLite transaction to guarantee atomic stock updates
  db.serialize(async () => {
    try {
      await dbQuery.run('BEGIN TRANSACTION');

      // 1. Stock check and deduction
      for (const item of items) {
        const prod = await dbQuery.get('SELECT stock, name FROM products WHERE id = ?', [item.productId]);
        if (!prod) {
          throw new Error(`Product ${item.name} not found in inventory.`);
        }
        if (prod.stock < item.qty) {
          throw new Error(`Insufficient stock for "${prod.name}". Requested: ${item.qty}, Available: ${prod.stock}`);
        }
        // Deduct stock
        await dbQuery.run('UPDATE products SET stock = stock - ? WHERE id = ?', [item.qty, item.productId]);
      }

      // 2. Insert Invoice
      await dbQuery.run(
        `INSERT INTO invoices (
          id, number, date, dueDate, customerId, customerName, items,
          subtotal, discountPercent, discountAmount, taxAmount, total, paymentMode, status, notes
         ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          id, number, date, dueDate, customerId, customerName, JSON.stringify(items),
          subtotal, discountPercent, discountAmount, taxAmount, total, paymentMode, status, notes
        ]
      );

      await dbQuery.run('COMMIT');
      res.status(201).json({ message: 'Invoice generated and stock updated successfully.' });
    } catch (err) {
      await dbQuery.run('ROLLBACK');
      res.status(500).json({ error: err.message });
    }
  });
});

// Update an Invoice completely (Edit Invoice)
app.put('/api/invoices/:id', (req, res) => {
  const { id } = req.params;
  const {
    number, date, dueDate, customerId, customerName, items,
    subtotal, discountPercent, discountAmount, taxAmount, total, paymentMode, status, notes
  } = req.body;

  if (!customerId || !items || items.length === 0) {
    return res.status(400).json({ error: 'Missing required invoice fields.' });
  }

  db.serialize(async () => {
    try {
      await dbQuery.run('BEGIN TRANSACTION');

      // 1. Fetch the old invoice to get its items and restore old stock levels
      const oldInvoice = await dbQuery.get('SELECT items FROM invoices WHERE id = ?', [id]);
      if (!oldInvoice) {
        throw new Error('Invoice to edit was not found.');
      }
      const oldItems = JSON.parse(oldInvoice.items);

      // Restore old stock
      for (const item of oldItems) {
        await dbQuery.run('UPDATE products SET stock = stock + ? WHERE id = ?', [item.qty, item.productId]);
      }

      // 2. Validate new item stock and deduct new stock levels
      for (const item of items) {
        const prod = await dbQuery.get('SELECT stock, name FROM products WHERE id = ?', [item.productId]);
        if (!prod) {
          throw new Error(`Product ${item.name} not found in inventory.`);
        }
        if (prod.stock < item.qty) {
          throw new Error(`Insufficient stock for "${prod.name}". Requested: ${item.qty}, Available: ${prod.stock}`);
        }
        // Deduct new stock
        await dbQuery.run('UPDATE products SET stock = stock - ? WHERE id = ?', [item.qty, item.productId]);
      }

      // 3. Update the Invoice record
      await dbQuery.run(
        `UPDATE invoices 
         SET number = ?, date = ?, dueDate = ?, customerId = ?, customerName = ?, items = ?,
             subtotal = ?, discountPercent = ?, discountAmount = ?, taxAmount = ?, total = ?, paymentMode = ?, status = ?, notes = ?
         WHERE id = ?`,
        [
          number, date, dueDate, customerId, customerName, JSON.stringify(items),
          subtotal, discountPercent, discountAmount, taxAmount, total, paymentMode, status, notes,
          id
        ]
      );

      await dbQuery.run('COMMIT');
      res.json({ message: 'Invoice updated and stocks adjusted successfully.' });
    } catch (err) {
      await dbQuery.run('ROLLBACK');
      res.status(500).json({ error: err.message });
    }
  });
});

// Update Invoice status (Paid/Unpaid)
app.patch('/api/invoices/:id/status', async (req, res) => {
  const { id } = req.params;
  const { status } = req.body;
  if (!status) {
    return res.status(400).json({ error: 'Status is required.' });
  }

  try {
    await dbQuery.run('UPDATE invoices SET status = ? WHERE id = ?', [status, id]);
    res.json({ message: 'Invoice status updated.' });
  } catch (err) {
    res.status(500).json({ error: 'Failed to update invoice: ' + err.message });
  }
});

app.delete('/api/invoices/:id', (req, res) => {
  const { id } = req.params;

  db.serialize(async () => {
    try {
      await dbQuery.run('BEGIN TRANSACTION');

      const invoice = await dbQuery.get('SELECT items FROM invoices WHERE id = ?', [id]);
      if (!invoice) {
        throw new Error('Invoice not found.');
      }

      const items = JSON.parse(invoice.items);

      // 1. Restore stock
      for (const item of items) {
        await dbQuery.run('UPDATE products SET stock = stock + ? WHERE id = ?', [item.qty, item.productId]);
      }

      // 2. Delete Invoice
      await dbQuery.run('DELETE FROM invoices WHERE id = ?', [id]);

      await dbQuery.run('COMMIT');
      res.json({ message: 'Invoice deleted and inventory stock restored.' });
    } catch (err) {
      await dbQuery.run('ROLLBACK');
      res.status(500).json({ error: err.message });
    }
  });
});

// ------------------------------------------
// 5. Database Export / Import
// ------------------------------------------
app.get('/api/db/export', async (req, res) => {
  try {
    const invoices = await dbQuery.all('SELECT * FROM invoices');
    const products = await dbQuery.all('SELECT * FROM products');
    const customers = await dbQuery.all('SELECT * FROM customers');
    const profile = await dbQuery.get('SELECT * FROM profile WHERE id = 1');

    const formattedInvoices = invoices.map(inv => ({
      ...inv,
      items: JSON.parse(inv.items)
    }));

    res.json({
      invoices: formattedInvoices,
      products,
      customers,
      profile,
      exportedAt: new Date().toISOString()
    });
  } catch (err) {
    res.status(500).json({ error: 'Database export failed: ' + err.message });
  }
});

app.post('/api/db/import', (req, res) => {
  const { invoices, products, customers, profile } = req.body;
  if (!invoices || !products || !customers || !profile) {
    return res.status(400).json({ error: 'Invalid backup dataset.' });
  }

  db.serialize(async () => {
    try {
      await dbQuery.run('BEGIN TRANSACTION');

      // Clear existing tables
      await dbQuery.run('DELETE FROM invoices');
      await dbQuery.run('DELETE FROM products');
      await dbQuery.run('DELETE FROM customers');
      await dbQuery.run('DELETE FROM profile');

      // Restore profile
      await dbQuery.run(
        'INSERT INTO profile (id, name, email, phone, address, taxId, currency) VALUES (1, ?, ?, ?, ?, ?, ?)',
        [profile.name, profile.email, profile.phone, profile.address, profile.taxId, profile.currency]
      );

      // Restore products
      for (const p of products) {
        await dbQuery.run(
          'INSERT INTO products (id, name, sku, price, tax, stock) VALUES (?, ?, ?, ?, ?, ?)',
          [p.id, p.name, p.sku, p.price, p.tax, p.stock]
        );
      }

      // Restore customers
      for (const c of customers) {
        await dbQuery.run(
          'INSERT INTO customers (id, name, email, phone, address) VALUES (?, ?, ?, ?, ?)',
          [c.id, c.name, c.email, c.phone, c.address]
        );
      }

      // Restore invoices
      for (const inv of invoices) {
        await dbQuery.run(
          `INSERT INTO invoices (
            id, number, date, dueDate, customerId, customerName, items,
            subtotal, discountPercent, discountAmount, taxAmount, total, paymentMode, status, notes
           ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
          [
            inv.id, inv.number, inv.date, inv.dueDate, inv.customerId, inv.customerName, JSON.stringify(inv.items),
            inv.subtotal, inv.discountPercent, inv.discountAmount, inv.taxAmount, inv.total, inv.paymentMode, inv.status, inv.notes
          ]
        );
      }

      await dbQuery.run('COMMIT');
      res.json({ message: 'Database imported successfully.' });
    } catch (err) {
      await dbQuery.run('ROLLBACK');
      res.status(500).json({ error: 'Database import failed: ' + err.message });
    }
  });
});

// Start listening
app.listen(PORT, () => {
  console.log(`BillBook server listening at http://localhost:${PORT}`);
});
