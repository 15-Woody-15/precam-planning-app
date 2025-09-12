require('dotenv').config();

const express = require('express');
const cors = require('cors');
const { Pool } = require('pg');

const app = express();
const PORT = process.env.PORT || 3000;

// --- DATABASE CONNECTION ---
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: {
    rejectUnauthorized: false
  }
});

// --- MIDDLEWARE ---
const allowedOrigins = [
  'http://127.0.0.1:5500',
  'https://precam-planning-app.netlify.app'
];
const corsOptions = {
  origin: function (origin, callback) {
    if (!origin || allowedOrigins.indexOf(origin) !== -1) {
      callback(null, true);
    } else {
      callback(new Error('Not allowed by CORS'));
    }
  }
};
app.use(cors(corsOptions));
app.use(express.json());
const path = require('path');
app.use(express.static(path.join(__dirname, '../public')));

// --- DATABASE INITIALIZATION ---
async function initializeDatabase() {
  const client = await pool.connect();
  try {
    // De 'DROP TABLE' regel is hier definitief verwijderd.
    
    await client.query(`CREATE TABLE IF NOT EXISTS orders (id VARCHAR(255) PRIMARY KEY, order_data JSONB NOT NULL);`);
    await client.query(`CREATE TABLE IF NOT EXISTS customers (name VARCHAR(255) PRIMARY KEY);`);
    await client.query(`CREATE TABLE IF NOT EXISTS machines (name VARCHAR(255) PRIMARY KEY, has_robot BOOLEAN NOT NULL);`);
    console.log("Database tables have been checked/created.");
  } catch (err) {
    console.error("Error initializing database:", err);
  } finally {
    client.release();
  }
}

// --- API ROUTES ---
app.get('/', (req, res) => {
  res.json({ message: "Hello, the Precam-backend (with database) is working!" });
});

// --- ORDER ROUTES ---
app.get('/api/orders', async (req, res) => {
  try {
    const result = await pool.query("SELECT order_data FROM orders WHERE order_data->>'status' IS NULL OR order_data->>'status' != 'Archived'");
    res.json(result.rows.map(row => row.order_data));
  } catch (err) {
    console.error("Error fetching orders:", err);
    res.status(500).json({ error: "Internal server error while fetching orders" });
  }
});

app.post('/api/orders', async (req, res) => {
    const newOrder = req.body;
    try {
        await pool.query('INSERT INTO orders (id, order_data) VALUES ($1, $2)', [newOrder.id, JSON.stringify(newOrder)]);
        res.status(201).json(newOrder);
    } catch (err) {
        console.error("Error adding order:", err);
        res.status(500).json({ error: "Could not add order" });
    }
});

app.put('/api/orders/:id', async (req, res) => {
    const orderId = req.params.id;
    const updatedOrderData = req.body;
    try {
        const result = await pool.query('UPDATE orders SET order_data = $1 WHERE id = $2', [JSON.stringify(updatedOrderData), orderId]);
        if (result.rowCount === 0) return res.status(404).json({ message: "Order not found" });
        res.json(updatedOrderData);
    } catch (err) {
        console.error("Error updating order:", err);
        res.status(500).json({ error: "Could not update order" });
    }
});

app.delete('/api/orders/:id', async (req, res) => {
    const orderId = req.params.id;
    try {
        await pool.query('DELETE FROM orders WHERE id = $1', [orderId]);
        res.status(204).send();
    } catch (err) {
        console.error("Error deleting order:", err);
        res.status(500).json({ error: "Could not delete order" });
    }
});

app.post('/api/orders/replace', async (req, res) => {
    const newOrders = req.body;
    const client = await pool.connect();
    try {
        await client.query('BEGIN');
        await client.query('DELETE FROM orders');
        for (const order of newOrders) {
            await client.query('INSERT INTO orders (id, order_data) VALUES ($1, $2)', [order.id, JSON.stringify(order)]);
        }
        await client.query('COMMIT');
        res.status(200).send({ message: 'All orders have been successfully replaced.' });
    } catch (err) {
        await client.query('ROLLBACK');
        console.error("Error replacing orders:", err);
        res.status(500).json({ error: "Could not import orders" });
    } finally {
        client.release();
    }
});

// Route om gearchiveerde orders op te halen
app.get('/api/orders/archive', async (req, res) => {
  try {
    const result = await pool.query("SELECT order_data FROM orders WHERE order_data->>'status' = 'Archived'");
    res.json(result.rows.map(row => row.order_data));
  } catch (err) {
    console.error("Error fetching archived orders:", err);
    res.status(500).json({ error: "Internal server error while fetching archived orders" });
  }
});

// Route om een order te archiveren
app.post('/api/orders/archive/:orderId', async (req, res) => {
    const orderId = req.params.orderId;
    try {
        const client = await pool.connect();
        // Updated query to ensure the status is correctly set within the JSONB object
        await client.query('UPDATE orders SET order_data = order_data || \'{"status": "Archived"}\' WHERE id = $1', [orderId]);
        client.release();
        res.status(200).json({ message: 'Order successfully archived.' });
    } catch (err) {
        console.error("Error archiving order:", err);
        res.status(500).json({ error: "Internal server error while archiving order" });
    }
});

// --- CUSTOMER ROUTES ---
app.get('/api/customers', async (req, res) => {
  try {
    const result = await pool.query('SELECT name FROM customers ORDER BY name');
    res.json(result.rows.map(row => row.name));
  } catch (err) {
    console.error("Error fetching customers:", err);
    res.status(500).json({ error: "Error fetching customers" });
  }
});

app.post('/api/customers', async (req, res) => {
    const { name } = req.body;
    try {
        await pool.query('INSERT INTO customers (name) VALUES ($1) ON CONFLICT (name) DO NOTHING', [name]);
        res.status(201).json({ name });
    } catch (err) {
        console.error("Error adding customer:", err);
        res.status(500).json({ error: "Could not add customer" });
    }
});

app.delete('/api/customers/:name', async (req, res) => {
    const name = decodeURIComponent(req.params.name);
    try {
        await pool.query('DELETE FROM customers WHERE name = $1', [name]);
        res.status(204).send();
    } catch (err) {
        console.error("Error deleting customer:", err);
        res.status(500).json({ error: "Could not delete customer" });
    }
});

// --- MACHINE ROUTES ---
app.get('/api/machines', async (req, res) => {
  try {
    const result = await pool.query('SELECT name, has_robot FROM machines ORDER BY name');
    res.json(result.rows.map(row => ({ name: row.name, hasRobot: row.has_robot })));
  } catch (err) {
    console.error("Error fetching machines:", err);
    res.status(500).json({ error: "Error fetching machines" });
  }
});

app.post('/api/machines', async (req, res) => {
    const { name, hasRobot } = req.body;
    try {
        await pool.query('INSERT INTO machines (name, has_robot) VALUES ($1, $2) ON CONFLICT (name) DO NOTHING', [name, hasRobot]);
        res.status(201).json({ name, hasRobot });
    } catch (err) {
        console.error("Error adding machine:", err);
        res.status(500).json({ error: "Could not add machine" });
    }
});

app.delete('/api/machines/:name', async (req, res) => {
    const name = decodeURIComponent(req.params.name);
    try {
        await pool.query('DELETE FROM machines WHERE name = $1', [name]);
        res.status(204).send();
    } catch (err) {
        console.error("Error deleting machine:", err);
        res.status(500).json({ error: "Could not delete machine" });
    }
});

// Route to replace all customers
app.post('/api/customers/replace', async (req, res) => {
    const newCustomers = req.body; // Expects an array of strings
    const client = await pool.connect();
    try {
        await client.query('BEGIN');
        await client.query('DELETE FROM customers');
        for (const name of newCustomers) {
            await client.query('INSERT INTO customers (name) VALUES ($1)', [name]);
        }
        await client.query('COMMIT');
        res.status(200).send({ message: 'All customers have been successfully replaced.' });
    } catch (err) {
        await client.query('ROLLBACK');
        console.error("Error replacing customers:", err);
        res.status(500).json({ error: "Could not import customers" });
    } finally {
        client.release();
    }
});

// Route to replace all machines
app.post('/api/machines/replace', async (req, res) => {
    const newMachines = req.body; // Expects an array of objects
    const client = await pool.connect();
    try {
        await client.query('BEGIN');
        await client.query('DELETE FROM machines');
        for (const machine of newMachines) {
            const name = machine.name;
            const hasRobot = machine.hasRobot ?? false; // Als machine.hasRobot leeg is, gebruik 'false' als standaardwaarde
            await client.query('INSERT INTO machines (name, has_robot) VALUES ($1, $2)', [name, hasRobot]);
        }
        await client.query('COMMIT');
        res.status(200).send({ message: 'All machines have been successfully replaced.' });
    } catch (err) {
        await client.query('ROLLBACK');
        console.error("Error replacing machines:", err);
        res.status(500).json({ error: "Could not import machines" });
    } finally {
        client.release();
    }
});

// --- START SERVER ---
app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
  initializeDatabase();
});