const express = require('express');
const cors = require('cors');
const path = require('path');
const { Pool } = require('pg'); // NIEUW: PostgreSQL client

const app = express();
const PORT = process.env.PORT || 3000;

// --- DATABASE CONNECTIE ---
// Maakt verbinding met de database via de URL die we in Render hebben ingesteld
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: {
    rejectUnauthorized: false // Nodig voor gratis Render databases
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
// Deze functie maakt de 'orders' tabel aan als deze nog niet bestaat.
// We gebruiken een JSONB veld om de complexe orderdata (met parts etc.) makkelijk op te slaan.
async function initializeDatabase() {
  const client = await pool.connect();
  try {
    await client.query(`
      CREATE TABLE IF NOT EXISTS orders (
        id VARCHAR(255) PRIMARY KEY,
        order_data JSONB NOT NULL
      );
    `);
    console.log("Database tabel 'orders' is gecontroleerd/aangemaakt.");
  } catch (err) {
    console.error("Fout bij initialiseren van database:", err);
  } finally {
    client.release();
  }
}

// --- API ROUTES (NU MET DATABASE QUERIES) ---
app.get('/', (req, res) => {
  res.json({ message: "Hallo, de Precam-backend (met database) werkt!" });
});

// Haal alle orders op
app.get('/api/orders', async (req, res) => {
  try {
    const result = await pool.query('SELECT order_data FROM orders');
    // We sturen alleen de inhoud van de JSONB kolom terug
    const allOrders = result.rows.map(row => row.order_data);
    res.json(allOrders);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Interne serverfout" });
  }
});

// Voeg een nieuwe order toe
app.post('/api/orders', async (req, res) => {
    const newOrder = req.body;
    try {
        await pool.query('INSERT INTO orders (id, order_data) VALUES ($1, $2)', [newOrder.id, newOrder]);
        res.status(201).json(newOrder);
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: "Kon order niet toevoegen" });
    }
});

// Update een bestaande order
app.put('/api/orders/:id', async (req, res) => {
    const orderId = req.params.id;
    const updatedOrderData = req.body;
    try {
        const result = await pool.query('UPDATE orders SET order_data = $1 WHERE id = $2 RETURNING *', [updatedOrderData, orderId]);
        if (result.rowCount === 0) {
            return res.status(404).json({ message: "Order niet gevonden" });
        }
        res.json(updatedOrderData);
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: "Kon order niet bijwerken" });
    }
});

// Verwijder een order
app.delete('/api/orders/:id', async (req, res) => {
    const orderId = req.params.id;
    try {
        await pool.query('DELETE FROM orders WHERE id = $1', [orderId]);
        res.status(204).send();
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: "Kon order niet verwijderen" });
    }
});

// Vervang alle orders (voor import)
app.post('/api/orders/replace', async (req, res) => {
    const nieuweOrders = req.body;
    const client = await pool.connect();
    try {
        await client.query('BEGIN'); // Start transactie
        await client.query('DELETE FROM orders'); // Verwijder alle oude orders
        for (const order of nieuweOrders) {
            await client.query('INSERT INTO orders (id, order_data) VALUES ($1, $2)', [order.id, order]);
        }
        await client.query('COMMIT'); // Bevestig transactie
        res.status(200).send({ message: 'Alle orders zijn succesvol vervangen.' });
    } catch (err) {
        await client.query('ROLLBACK'); // Maak ongedaan bij fout
        console.error(err);
        res.status(500).json({ error: "Kon orders niet importeren" });
    } finally {
        client.release();
    }
});

// --- SERVER STARTEN ---
app.listen(PORT, () => {
  console.log(`Server draait op poort ${PORT}`);
  initializeDatabase(); // Roep de initialisatie aan bij het opstarten
});