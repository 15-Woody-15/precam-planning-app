const express = require('express');
const cors = require('cors');
const fs = require('fs');
const path = require('path'); // TOEGEVOEGD

const app = express();
const PORT = process.env.PORT || 3000; // TOEGEVOEGD

// --- CONFIGURATIE ---
// GEWIJZIGD: Gebruik path.join voor een betrouwbaar bestandspad
const DATA_FILE_PATH = path.join(__dirname, 'data', 'orders.json');

// --- MIDDLEWARE ---
// GEWIJZIGD: Configureer CORS voor zowel lokaal als productie
const allowedOrigins = [
  'http://127.0.0.1:5500', // Voor VS Code Live Server
  'https://precam-planning-app.netlify.app' // Voor je live website
];

const corsOptions = {
  origin: function (origin, callback) {
    // Sta verzoeken toe als ze in de lijst staan (of als ze geen origin hebben, bv. Postman)
    if (!origin || allowedOrigins.indexOf(origin) !== -1) {
      callback(null, true);
    } else {
      callback(new Error('Niet toegestaan door CORS'));
    }
  }
};

app.use(cors(corsOptions));
app.use(express.json()); 

// --- DATABASE ---
let orders = [];
try {
    const data = fs.readFileSync(DATA_FILE_PATH, 'utf8');
    orders = JSON.parse(data);
    console.log("Data succesvol geladen uit orders.json");
} catch (error) {
    console.error("Kon data niet laden uit orders.json. Start met een lege lijst.", error);
}

function saveDataToFile() {
    fs.writeFile(DATA_FILE_PATH, JSON.stringify(orders, null, 2), (err) => {
        if (err) {
            console.error('Fout bij het opslaan van de data:', err);
        } else {
            console.log('Data succesvol opgeslagen in orders.json');
        }
    });
}

// --- API ROUTES ---
app.get('/', (req, res) => {
  res.json({ message: "Hallo, de Precam-backend werkt!" });
});

app.get('/api/orders', (req, res) => {
  console.log("GET /api/orders: Alle orders worden opgevraagd.");
  res.json(orders);
});

app.post('/api/orders', (req, res) => {
    const newOrder = req.body;
    console.log("POST /api/orders: Nieuwe order ontvangen:", newOrder.id);
    orders.push(newOrder);
    saveDataToFile();
    res.status(201).json(newOrder);
});

app.put('/api/orders/:id', (req, res) => {
    const orderId = req.params.id;
    const updatedOrderData = req.body;
    console.log(`PUT /api/orders/${orderId}: Order wordt bijgewerkt.`);
    const orderIndex = orders.findIndex(order => order.id === orderId);
    if (orderIndex === -1) {
        return res.status(404).json({ message: "Order niet gevonden" });
    }
    orders[orderIndex] = updatedOrderData;
    saveDataToFile();
    res.json(updatedOrderData);
});

app.delete('/api/orders/:id', (req, res) => {
    const orderId = req.params.id;
    console.log(`DELETE /api/orders/${orderId}: Order wordt verwijderd.`);
    const initialLength = orders.length;
    orders = orders.filter(order => order.id !== orderId);
    if (orders.length !== initialLength) {
        saveDataToFile();
    }
    res.status(204).send();
});

app.post('/api/orders/replace', (req, res) => {
    console.log("POST /api/orders/replace: Alle orders worden vervangen door import.");
    const nieuweOrders = req.body;
    if (!Array.isArray(nieuweOrders)) {
        return res.status(400).send({ message: 'Ongeldige data: array van orders wordt verwacht.' });
    }
    orders = nieuweOrders;
    saveDataToFile();
    res.status(200).send({ message: 'Alle orders zijn succesvol vervangen.' });
});

// --- SERVER STARTEN ---
app.listen(PORT, () => {
  // GEWIJZIGD: Gebruik de PORT variabele voor een duidelijke log
  console.log(`Server draait op poort ${PORT}`);
});