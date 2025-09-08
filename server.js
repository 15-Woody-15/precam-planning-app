const express = require('express');
const cors = require('cors');
const fs = require('fs'); // NIEUW: 'File System' module om bestanden te lezen/schrijven

const app = express();
const PORT = 3000;

// --- CONFIGURATIE ---
const DATA_FILE_PATH = './data/orders.json'; // NIEUW: Pad naar ons databestand

// --- MIDDLEWARE ---
app.use(cors()); 
app.use(express.json()); 

// --- DATABASE ---
// GEWIJZIGD: We lezen de data nu uit het JSON-bestand bij de start
let orders = [];
try {
    const data = fs.readFileSync(DATA_FILE_PATH, 'utf8');
    orders = JSON.parse(data);
    console.log("Data succesvol geladen uit orders.json");
} catch (error) {
    console.error("Kon data niet laden uit orders.json. Start met een lege lijst.", error);
}

// NIEUW: Functie om de data op te slaan naar het bestand
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
  res.json(orders); // GEWIJZIGD: Gebruikt nu 'orders'
});

app.post('/api/orders', (req, res) => {
    const newOrder = req.body;
    console.log("POST /api/orders: Nieuwe order ontvangen:", newOrder.id);
    orders.push(newOrder); // GEWIJZIGD
    saveDataToFile(); // NIEUW: Sla wijziging op
    res.status(201).json(newOrder);
});

app.put('/api/orders/:id', (req, res) => {
    const orderId = req.params.id;
    const updatedOrderData = req.body;
    console.log(`PUT /api/orders/${orderId}: Order wordt bijgewerkt.`);
    const orderIndex = orders.findIndex(order => order.id === orderId); // GEWIJZIGD
    if (orderIndex === -1) {
        return res.status(404).json({ message: "Order niet gevonden" });
    }
    orders[orderIndex] = updatedOrderData; // GEWIJZIGD
    saveDataToFile(); // NIEUW: Sla wijziging op
    res.json(updatedOrderData);
});

app.delete('/api/orders/:id', (req, res) => {
    const orderId = req.params.id;
    console.log(`DELETE /api/orders/${orderId}: Order wordt verwijderd.`);
    const initialLength = orders.length; // GEWIJZIGD
    orders = orders.filter(order => order.id !== orderId); // GEWIJZIGD
    if (orders.length !== initialLength) {
        saveDataToFile(); // NIEUW: Sla wijziging op
    }
    res.status(204).send();
});

app.post('/api/orders/replace', (req, res) => {
    console.log("POST /api/orders/replace: Alle orders worden vervangen door import.");
    const nieuweOrders = req.body;
    if (!Array.isArray(nieuweOrders)) {
        return res.status(400).send({ message: 'Ongeldige data: array van orders wordt verwacht.' });
    }
    orders = nieuweOrders; // GEWIJZIGD
    saveDataToFile(); // NIEUW: Sla wijziging op
    res.status(200).send({ message: 'Alle orders zijn succesvol vervangen.' });
});

// --- SERVER STARTEN ---
app.listen(PORT, () => {
  console.log(`Server draait op http://localhost:${PORT}`);
});