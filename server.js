const express = require('express');
const cors = require('cors');
const path = require('path');
const { Pool } = require('pg');

const app = express();
const PORT = process.env.PORT || 3000;

// --- DATABASE CONNECTIE ---
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
      callback(new Error('Niet toegestaan door CORS'));
    }
  }
};
app.use(cors(corsOptions));
app.use(express.json()); 

// --- DATABASE INITIALISATIE ---
async function initializeDatabase() {
  const client = await pool.connect();
  try {
    await client.query(`CREATE TABLE IF NOT EXISTS orders (id VARCHAR(255) PRIMARY KEY, order_data JSONB NOT NULL);`);
    await client.query(`CREATE TABLE IF NOT EXISTS klanten (naam VARCHAR(255) PRIMARY KEY);`);
    await client.query(`CREATE TABLE IF NOT EXISTS machines (naam VARCHAR(255) PRIMARY KEY, heeft_robot BOOLEAN NOT NULL);`);
    console.log("Database tabellen zijn gecontroleerd/aangemaakt.");
  } catch (err) {
    console.error("Fout bij initialiseren van database:", err);
  } finally {
    client.release();
  }
}

// --- API ROUTES ---
app.get('/', (req, res) => {
  res.json({ message: "Hallo, de Precam-backend (met database) werkt!" });
});

// --- ORDER ROUTES ---
app.get('/api/orders', async (req, res) => {
  try {
    const result = await pool.query('SELECT order_data FROM orders');
    res.json(result.rows.map(row => row.order_data));
  } catch (err) {
    console.error("Fout bij ophalen orders:", err);
    res.status(500).json({ error: "Interne serverfout bij ophalen orders" });
  }
});
app.post('/api/orders', async (req, res) => {
    const newOrder = req.body;
    try {
        await pool.query('INSERT INTO orders (id, order_data) VALUES ($1, $2)', [newOrder.id, JSON.stringify(newOrder)]);
        res.status(201).json(newOrder);
    } catch (err) {
        console.error("Fout bij toevoegen order:", err);
        res.status(500).json({ error: "Kon order niet toevoegen" });
    }
});
app.put('/api/orders/:id', async (req, res) => {
    const orderId = req.params.id;
    const updatedOrderData = req.body;
    try {
        const result = await pool.query('UPDATE orders SET order_data = $1 WHERE id = $2', [JSON.stringify(updatedOrderData), orderId]);
        if (result.rowCount === 0) return res.status(404).json({ message: "Order niet gevonden" });
        res.json(updatedOrderData);
    } catch (err) {
        console.error("Fout bij bijwerken order:", err);
        res.status(500).json({ error: "Kon order niet bijwerken" });
    }
});
app.delete('/api/orders/:id', async (req, res) => {
    const orderId = req.params.id;
    try {
        await pool.query('DELETE FROM orders WHERE id = $1', [orderId]);
        res.status(204).send();
    } catch (err) {
        console.error("Fout bij verwijderen order:", err);
        res.status(500).json({ error: "Kon order niet verwijderen" });
    }
});
app.post('/api/orders/replace', async (req, res) => {
    const nieuweOrders = req.body;
    const client = await pool.connect();
    try {
        await client.query('BEGIN');
        await client.query('DELETE FROM orders');
        for (const order of nieuweOrders) {
            await client.query('INSERT INTO orders (id, order_data) VALUES ($1, $2)', [order.id, JSON.stringify(order)]);
        }
        await client.query('COMMIT');
        res.status(200).send({ message: 'Alle orders zijn succesvol vervangen.' });
    } catch (err) {
        await client.query('ROLLBACK');
        console.error("Fout bij vervangen orders:", err);
        res.status(500).json({ error: "Kon orders niet importeren" });
    } finally {
        client.release();
    }
});

// --- KLANTEN ROUTES ---
app.get('/api/klanten', async (req, res) => {
  try {
    const result = await pool.query('SELECT naam FROM klanten ORDER BY naam');
    res.json(result.rows.map(row => row.naam));
  } catch (err) {
    console.error("Fout bij ophalen klanten:", err);
    res.status(500).json({ error: "Fout bij ophalen klanten" });
  }
});
app.post('/api/klanten', async (req, res) => {
    const { naam } = req.body;
    try {
        await pool.query('INSERT INTO klanten (naam) VALUES ($1) ON CONFLICT (naam) DO NOTHING', [naam]);
        res.status(201).json({ naam });
    } catch (err) {
        console.error("Fout bij toevoegen klant:", err);
        res.status(500).json({ error: "Kon klant niet toevoegen" });
    }
});
app.delete('/api/klanten/:naam', async (req, res) => {
    const naam = decodeURIComponent(req.params.naam);
    try {
        await pool.query('DELETE FROM klanten WHERE naam = $1', [naam]);
        res.status(204).send();
    } catch (err) {
        console.error("Fout bij verwijderen klant:", err);
        res.status(500).json({ error: "Kon klant niet verwijderen" });
    }
});

// --- MACHINES ROUTES ---
app.get('/api/machines', async (req, res) => {
  try {
    const result = await pool.query('SELECT naam, heeft_robot FROM machines ORDER BY naam');
    res.json(result.rows.map(row => ({ name: row.naam, hasRobot: row.heeft_robot })));
  } catch (err) {
    console.error("Fout bij ophalen machines:", err);
    res.status(500).json({ error: "Fout bij ophalen machines" });
  }
});
app.post('/api/machines', async (req, res) => {
    const { name, hasRobot } = req.body;
    try {
        await pool.query('INSERT INTO machines (naam, heeft_robot) VALUES ($1, $2) ON CONFLICT (naam) DO NOTHING', [name, hasRobot]);
        res.status(201).json({ name, hasRobot });
    } catch (err) {
        console.error("Fout bij toevoegen machine:", err);
        res.status(500).json({ error: "Kon machine niet toevoegen" });
    }
});
app.delete('/api/machines/:naam', async (req, res) => {
    const naam = decodeURIComponent(req.params.naam);
    try {
        await pool.query('DELETE FROM machines WHERE naam = $1', [naam]);
        res.status(204).send();
    } catch (err) {
        console.error("Fout bij verwijderen machine:", err);
        res.status(500).json({ error: "Kon machine niet verwijderen" });
    }
});

// --- SERVER STARTEN ---
app.listen(PORT, () => {
  console.log(`Server draait op poort ${PORT}`);
  initializeDatabase();
});