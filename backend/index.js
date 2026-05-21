const express = require('express');
const cors = require('cors');
const db = require('./db');

const app = express();
const port = process.env.PORT || 3000;

app.use(cors());
app.use(express.json());

// ========================
// PRODUCTS
// ========================
app.get('/api/products', async (req, res) => {
  try {
    const query = `
      SELECT p.id, p.name, p.category, p.stock,
      (SELECT sale_price FROM inventory_entries e WHERE e.product_id = p.id ORDER BY date DESC LIMIT 1) as sale_price
      FROM products p
      ORDER BY p.name ASC
    `;
    const { rows } = await db.query(query);
    res.json(rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/products', async (req, res) => {
  const { name, category, stock } = req.body;
  try {
    const { rows } = await db.query(
      'INSERT INTO products (name, category, stock) VALUES ($1, $2, $3) RETURNING *',
      [name, category || 'General', stock || 0]
    );
    res.status(201).json(rows[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.put('/api/products/:id', async (req, res) => {
  const { id } = req.params;
  const { name, category, stock } = req.body;
  try {
    const { rows } = await db.query(
      'UPDATE products SET name = $1, category = $2, stock = $3 WHERE id = $4 RETURNING *',
      [name, category || 'General', stock, id]
    );
    res.json(rows[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.delete('/api/products/:id', async (req, res) => {
  const { id } = req.params;
  try {
    await db.query('DELETE FROM products WHERE id = $1', [id]);
    res.status(204).send();
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ========================
// INVENTORY ENTRIES
// ========================
app.get('/api/inventory', async (req, res) => {
  try {
    const query = `
      SELECT i.*, p.name as product_name
      FROM inventory_entries i
      JOIN products p ON i.product_id = p.id
      ORDER BY i.date DESC
    `;
    const { rows } = await db.query(query);
    res.json(rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/inventory', async (req, res) => {
  const { product_id, quantity, purchase_price, sale_price, observation } = req.body;
  try {
    await db.query('BEGIN');
    
    // Insert entry
    const { rows } = await db.query(
      'INSERT INTO inventory_entries (product_id, quantity, purchase_price, sale_price, observation) VALUES ($1, $2, $3, $4, $5) RETURNING *',
      [product_id, quantity, purchase_price, sale_price, observation]
    );
    
    // Update stock
    await db.query('UPDATE products SET stock = stock + $1 WHERE id = $2', [quantity, product_id]);
    
    await db.query('COMMIT');
    res.status(201).json(rows[0]);
  } catch (err) {
    await db.query('ROLLBACK');
    res.status(500).json({ error: err.message });
  }
});

app.put('/api/inventory/:id', async (req, res) => {
  const { id } = req.params;
  const { product_id, quantity, purchase_price, sale_price, observation } = req.body;
  try {
    await db.query('BEGIN');
    
    // Get current entry
    const currentEntryRes = await db.query('SELECT * FROM inventory_entries WHERE id = $1', [id]);
    if (currentEntryRes.rows.length === 0) throw new Error('Ingreso no encontrado');
    const oldEntry = currentEntryRes.rows[0];
    const oldQuantity = oldEntry.quantity;
    const oldProductId = oldEntry.product_id;
    
    // Update entry
    const { rows } = await db.query(
      'UPDATE inventory_entries SET product_id = $1, quantity = $2, purchase_price = $3, sale_price = $4, observation = $5 WHERE id = $6 RETURNING *',
      [product_id, quantity, purchase_price, sale_price, observation, id]
    );
    
    // Update stock
    if (oldProductId != product_id) {
       await db.query('UPDATE products SET stock = stock - $1 WHERE id = $2', [oldQuantity, oldProductId]);
       await db.query('UPDATE products SET stock = stock + $1 WHERE id = $2', [quantity, product_id]);
    } else {
       const diff = quantity - oldQuantity;
       if (diff !== 0) {
         await db.query('UPDATE products SET stock = stock + $1 WHERE id = $2', [diff, product_id]);
       }
    }
    
    await db.query('COMMIT');
    res.json(rows[0] || {});
  } catch (err) {
    await db.query('ROLLBACK');
    res.status(500).json({ error: err.message });
  }
});

app.delete('/api/inventory/:id', async (req, res) => {
  const { id } = req.params;
  try {
    await db.query('BEGIN');
    const currentEntryRes = await db.query('SELECT * FROM inventory_entries WHERE id = $1', [id]);
    if (currentEntryRes.rows.length > 0) {
      const entry = currentEntryRes.rows[0];
      await db.query('UPDATE products SET stock = stock - $1 WHERE id = $2', [entry.quantity, entry.product_id]);
      await db.query('DELETE FROM inventory_entries WHERE id = $1', [id]);
    }
    await db.query('COMMIT');
    res.status(204).send();
  } catch (err) {
    await db.query('ROLLBACK');
    res.status(500).json({ error: err.message });
  }
});

// ========================
// SALES
// ========================
app.get('/api/sales', async (req, res) => {
  try {
    const query = `
      SELECT s.*, p.name as product_name
      FROM sales s
      LEFT JOIN products p ON s.product_id = p.id
      ORDER BY s.date DESC
    `;
    const { rows } = await db.query(query);
    res.json(rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/sales', async (req, res) => {
  const { product_id, quantity, payment_method } = req.body;
  try {
    await db.query('BEGIN');
    
    // Check product stock
    const prodRes = await db.query('SELECT * FROM products WHERE id = $1', [product_id]);
    if (prodRes.rows.length === 0) throw new Error('Producto no encontrado');
    const product = prodRes.rows[0];
    
    if (product.stock < quantity) throw new Error('No hay suficiente stock');
    
    // Get latest prices from inventory
    const invRes = await db.query('SELECT purchase_price, sale_price FROM inventory_entries WHERE product_id = $1 ORDER BY date DESC LIMIT 1', [product_id]);
    if (invRes.rows.length === 0) throw new Error('No existe historial de compras para obtener un precio definido');
    
    const pr = invRes.rows[0];
    const total = pr.sale_price * quantity;
    const profit = (pr.sale_price - pr.purchase_price) * quantity;
    
    // Insert sale
    const { rows } = await db.query(
      'INSERT INTO sales (product_id, quantity, payment_method, total, profit) VALUES ($1, $2, $3, $4, $5) RETURNING *',
      [product_id, quantity, payment_method, total, profit]
    );
    
    // Update stock
    await db.query('UPDATE products SET stock = stock - $1 WHERE id = $2', [quantity, product_id]);
    
    await db.query('COMMIT');
    res.status(201).json(rows[0]);
  } catch (err) {
    await db.query('ROLLBACK');
    res.status(500).json({ error: err.message });
  }
});

app.put('/api/sales/:id', async (req, res) => {
  const { id } = req.params;
  const { product_id, quantity, payment_method } = req.body;
  try {
    await db.query('BEGIN');
    
    // Get current sale
    const currentSaleRes = await db.query('SELECT * FROM sales WHERE id = $1', [id]);
    if (currentSaleRes.rows.length === 0) throw new Error('Venta no encontrada');
    const oldSale = currentSaleRes.rows[0];
    
    // Revert old stock
    await db.query('UPDATE products SET stock = stock + $1 WHERE id = $2', [oldSale.quantity, oldSale.product_id]);
    
    // Check new stock
    const prodRes = await db.query('SELECT * FROM products WHERE id = $1', [product_id]);
    if (prodRes.rows.length === 0) throw new Error('Producto no encontrado');
    const product = prodRes.rows[0];
    
    if (product.stock < quantity) throw new Error('No hay suficiente stock');
    
    // Get latest prices from inventory
    const invRes = await db.query('SELECT purchase_price, sale_price FROM inventory_entries WHERE product_id = $1 ORDER BY date DESC LIMIT 1', [product_id]);
    if (invRes.rows.length === 0) throw new Error('No existe historial de compras para obtener un precio definido');
    
    const pr = invRes.rows[0];
    const total = pr.sale_price * quantity;
    const profit = (pr.sale_price - pr.purchase_price) * quantity;
    
    // Update sale
    const { rows } = await db.query(
      'UPDATE sales SET product_id = $1, quantity = $2, payment_method = $3, total = $4, profit = $5 WHERE id = $6 RETURNING *',
      [product_id, quantity, payment_method, total, profit, id]
    );
    
    // Apply new stock
    await db.query('UPDATE products SET stock = stock - $1 WHERE id = $2', [quantity, product_id]);
    
    await db.query('COMMIT');
    res.json(rows[0]);
  } catch (err) {
    await db.query('ROLLBACK');
    res.status(500).json({ error: err.message });
  }
});

app.delete('/api/sales/:id', async (req, res) => {
  const { id } = req.params;
  try {
    await db.query('BEGIN');
    const currentSaleRes = await db.query('SELECT * FROM sales WHERE id = $1', [id]);
    if (currentSaleRes.rows.length > 0) {
      const sale = currentSaleRes.rows[0];
      await db.query('UPDATE products SET stock = stock + $1 WHERE id = $2', [sale.quantity, sale.product_id]);
      await db.query('DELETE FROM sales WHERE id = $1', [id]);
    }
    await db.query('COMMIT');
    res.status(204).send();
  } catch (err) {
    await db.query('ROLLBACK');
    res.status(500).json({ error: err.message });
  }
});

// ========================
// EXPENSES
// ========================
app.get('/api/expenses', async (req, res) => {
  try {
    const { rows } = await db.query('SELECT * FROM expenses ORDER BY date DESC');
    res.json(rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/expenses', async (req, res) => {
  const { description, value } = req.body;
  try {
    const { rows } = await db.query(
      'INSERT INTO expenses (description, value) VALUES ($1, $2) RETURNING *',
      [description, value]
    );
    res.status(201).json(rows[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.put('/api/expenses/:id', async (req, res) => {
  const { id } = req.params;
  const { description, value } = req.body;
  try {
    const { rows } = await db.query(
      'UPDATE expenses SET description = $1, value = $2 WHERE id = $3 RETURNING *',
      [description, value, id]
    );
    res.json(rows[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.delete('/api/expenses/:id', async (req, res) => {
  const { id } = req.params;
  try {
    await db.query('DELETE FROM expenses WHERE id = $1', [id]);
    res.status(204).send();
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ========================
// FIADOS (crédito temporal → cobro = venta)
// ========================
async function getProductPrices(product_id) {
  const invRes = await db.query(
    'SELECT purchase_price, sale_price FROM inventory_entries WHERE product_id = $1 ORDER BY date DESC LIMIT 1',
    [product_id]
  );
  if (invRes.rows.length === 0) throw new Error('No existe historial de compras para obtener un precio definido');
  return invRes.rows[0];
}

app.get('/api/fiados', async (req, res) => {
  try {
    const status = req.query.status || 'pending';
    const query = `
      SELECT f.*, p.name AS product_name
      FROM fiados f
      LEFT JOIN products p ON f.product_id = p.id
      WHERE f.status = $1
      ORDER BY f.date DESC
    `;
    const { rows } = await db.query(query, [status]);
    res.json(rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/fiados', async (req, res) => {
  const { product_id, quantity, debtor_name, description } = req.body;
  try {
    if (!product_id || !quantity || quantity < 1 || !debtor_name?.trim()) {
      return res.status(400).json({ error: 'Producto, cantidad y nombre de quien fía son obligatorios' });
    }

    await db.query('BEGIN');

    const prodRes = await db.query('SELECT * FROM products WHERE id = $1', [product_id]);
    if (prodRes.rows.length === 0) throw new Error('Producto no encontrado');
    const product = prodRes.rows[0];
    if (product.stock < quantity) throw new Error('No hay suficiente stock');

    const pr = await getProductPrices(product_id);
    const total = pr.sale_price * quantity;
    const profit = (pr.sale_price - pr.purchase_price) * quantity;
    const desc = description?.trim()
      ? `${debtor_name.trim()} — ${description.trim()}`
      : `Fiado: ${debtor_name.trim()}`;

    const { rows } = await db.query(
      `INSERT INTO fiados (product_id, quantity, debtor_name, description, total, profit, status)
       VALUES ($1, $2, $3, $4, $5, $6, 'pending') RETURNING *`,
      [product_id, quantity, debtor_name.trim(), desc, total, profit]
    );

    await db.query('UPDATE products SET stock = stock - $1 WHERE id = $2', [quantity, product_id]);

    await db.query('COMMIT');
    res.status(201).json(rows[0]);
  } catch (err) {
    await db.query('ROLLBACK');
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/fiados/:id/settle', async (req, res) => {
  const { id } = req.params;
  const { payment_method } = req.body;
  const method = payment_method || 'Efectivo';

  try {
    await db.query('BEGIN');

    const fiadoRes = await db.query('SELECT * FROM fiados WHERE id = $1', [id]);
    if (fiadoRes.rows.length === 0) throw new Error('Fiado no encontrado');
    const fiado = fiadoRes.rows[0];
    if (fiado.status !== 'pending') throw new Error('Este fiado ya fue cobrado o cancelado');

    const saleRes = await db.query(
      `INSERT INTO sales (product_id, quantity, payment_method, total, profit)
       VALUES ($1, $2, $3, $4, $5) RETURNING *`,
      [fiado.product_id, fiado.quantity, method, fiado.total, fiado.profit]
    );

    await db.query(
      `UPDATE fiados SET status = 'settled', settled_at = CURRENT_TIMESTAMP WHERE id = $1`,
      [id]
    );

    await db.query('COMMIT');
    res.json({ fiado: { ...fiado, status: 'settled' }, sale: saleRes.rows[0] });
  } catch (err) {
    await db.query('ROLLBACK');
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/fiados/settle-debtor', async (req, res) => {
  const { debtor_name, payment_method } = req.body;
  const method = payment_method || 'Efectivo';

  if (!debtor_name || !debtor_name.trim()) {
    return res.status(400).json({ error: 'El nombre del deudor es obligatorio' });
  }

  try {
    await db.query('BEGIN');

    // Obtener todos los fiados pendientes de este deudor
    const pendingFiadosRes = await db.query(
      "SELECT * FROM fiados WHERE debtor_name = $1 AND status = 'pending'",
      [debtor_name.trim()]
    );

    if (pendingFiadosRes.rows.length === 0) {
      throw new Error('No hay fiados pendientes para este deudor');
    }

    const settledSales = [];
    for (const fiado of pendingFiadosRes.rows) {
      // Crear registro de venta por cada fiado
      const saleRes = await db.query(
        `INSERT INTO sales (product_id, quantity, payment_method, total, profit)
         VALUES ($1, $2, $3, $4, $5) RETURNING *`,
        [fiado.product_id, fiado.quantity, method, fiado.total, fiado.profit]
      );
      settledSales.push(saleRes.rows[0]);

      // Marcar fiado como cobrado
      await db.query(
        `UPDATE fiados SET status = 'settled', settled_at = CURRENT_TIMESTAMP WHERE id = $1`,
        [fiado.id]
      );
    }

    await db.query('COMMIT');
    res.json({ 
      message: 'Todos los fiados de ' + debtor_name + ' han sido cobrados.', 
      settledCount: settledSales.length 
    });
  } catch (err) {
    await db.query('ROLLBACK');
    res.status(500).json({ error: err.message });
  }
});

app.delete('/api/fiados/:id', async (req, res) => {
  const { id } = req.params;
  try {
    await db.query('BEGIN');

    const fiadoRes = await db.query('SELECT * FROM fiados WHERE id = $1', [id]);
    if (fiadoRes.rows.length === 0) throw new Error('Fiado no encontrado');
    const fiado = fiadoRes.rows[0];

    if (fiado.status === 'pending' && fiado.product_id) {
      await db.query('UPDATE products SET stock = stock + $1 WHERE id = $2', [
        fiado.quantity,
        fiado.product_id
      ]);
    }

    await db.query('DELETE FROM fiados WHERE id = $1', [id]);

    await db.query('COMMIT');
    res.status(204).send();
  } catch (err) {
    await db.query('ROLLBACK');
    res.status(500).json({ error: err.message });
  }
});

// ========================
// DASHBOARD
// ========================
app.get('/api/dashboard', async (req, res) => {
  try {
    // Sales today
    const salesRes = await db.query(
      'SELECT COALESCE(SUM(total), 0) as total_sales, COALESCE(SUM(profit), 0) as total_profit FROM sales WHERE date >= CURRENT_DATE'
    );
    
    // Expenses today (gastos en efectivo / servicios)
    const expensesRes = await db.query(
      'SELECT COALESCE(SUM(value), 0) as total_expenses FROM expenses WHERE date >= CURRENT_DATE'
    );

    // Fiados pendientes (cuentas por cobrar — restan del neto hasta cobrar)
    const fiadosRes = await db.query(
      `SELECT COALESCE(SUM(total), 0) as pending_total, COUNT(*)::int as pending_count
       FROM fiados WHERE status = 'pending'`
    );

    // Low stock
    const lowStockRes = await db.query('SELECT * FROM products WHERE stock < 5 ORDER BY stock ASC LIMIT 10');

    // Simple charts: Last 7 days sales
    const chartsRes = await db.query(`
      SELECT DATE(date) as day, SUM(total) as daily_total
      FROM sales
      WHERE date >= CURRENT_DATE - INTERVAL '7 days'
      GROUP BY DATE(date)
      ORDER BY DATE(date) ASC
    `);

    const todayProfit = parseFloat(salesRes.rows[0].total_profit);
    const todayExpenses = parseFloat(expensesRes.rows[0].total_expenses);
    const pendingFiados = parseFloat(fiadosRes.rows[0].pending_total);

    res.json({
      todaySales: parseFloat(salesRes.rows[0].total_sales),
      todayProfit,
      todayExpenses,
      pendingFiados,
      pendingFiadosCount: fiadosRes.rows[0].pending_count,
      netProfit: todayProfit - todayExpenses - pendingFiados,
      lowStock: lowStockRes.rows,
      charts: chartsRes.rows,
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.listen(port, () => {
  console.log(`Backend listening on port ${port}`);
});
