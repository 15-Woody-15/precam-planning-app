const IS_LOCAL = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1';
const API_URL = IS_LOCAL ? 'http://localhost:3000/api' : 'https://precam-planning-api-app.onrender.com/api';

// --- ORDER FUNCTIES ---

/**
 * Haalt alle initiële data (orders, klanten, machines, afwezigheden) op van de server.
 * @returns {Promise<{orders: object[], customers: string[], machines: object[], absences: object[]}>} Een object met alle data.
 */
export async function fetchInitialData() {
    // VOEG 'absencesRes' TOE AAN DE LIJST
    const [ordersRes, customersRes, machinesRes, absencesRes] = await Promise.all([
        fetch(`${API_URL}/orders`),
        fetch(`${API_URL}/customers`),
        fetch(`${API_URL}/machines`), // VOEG EEN KOMMA TOE
        fetch(`${API_URL}/absences`)
    ]);
    
    // De check voor absencesRes is hier al correct
    if (!ordersRes.ok || !customersRes.ok || !machinesRes.ok || !absencesRes.ok) {
        throw new Error('Could not load initial data from the server.');
    }

    return {
        orders: await ordersRes.json(),
        customers: await customersRes.json(),
        machines: await machinesRes.json(), // VOEG EEN KOMMA TOE
        absences: await absencesRes.json()
    };
}

/**
 * Vervangt alle orders op de backend met een nieuwe lijst.
 * @param {object[]} orders - De nieuwe lijst met orders.
 * @returns {Promise<void>}
 */
export async function replaceOrdersOnBackend(orders) {
    const response = await fetch(`${API_URL}/orders/replace`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(orders),
    });
    if (!response.ok) throw new Error(`Server error while replacing orders`);
}

/**
 * Slaat een nieuwe order op in de database.
 * @param {object} order - De nieuwe order om op te slaan.
 * @returns {Promise<object>} De opgeslagen order data.
 */
export async function addOrderOnBackend(order) {
    const response = await fetch(`${API_URL}/orders`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(order),
    });
    if (!response.ok) throw new Error(`Server error on add: ${response.statusText}`);
    return await response.json();
}

/**
 * Werkt een bestaande order bij in de database.
 * @param {string} originalOrderId - De originele ID van de order.
 * @param {object} updatedOrder - De bijgewerkte orderdata.
 * @returns {Promise<object>} De bijgewerkte order data.
 */
export async function updateOrderOnBackend(originalOrderId, updatedOrder) {
    if (!updatedOrder) return;
    const response = await fetch(`${API_URL}/orders/${originalOrderId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updatedOrder),
    });
    if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`Server error on update: ${response.statusText} (${errorText})`);
    }
    return await response.json();
}

/**
 * Verwijdert een order van de backend.
 * @param {string} orderId - De ID van de te verwijderen order.
 * @returns {Promise<void>}
 */
export async function deleteOrderOnBackend(orderId) {
    const response = await fetch(`${API_URL}/orders/${orderId}`, {
        method: 'DELETE',
    });
    if (!response.ok) throw new Error(`Server error on delete: ${response.statusText}`);
    return;
}

/**
 * Archiveert een order op de backend.
 * @param {string} orderId - De ID van de te archiveren order.
 * @returns {Promise<object>} Het bevestigingsbericht van de server.
 */
export async function archiveOrder(orderId) {
    const response = await fetch(`${API_URL}/orders/archive/${orderId}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' }
    });
    if (!response.ok) {
        throw new Error('Failed to archive order.');
    }
    return await response.json();
}

/**
 * Haalt alle gearchiveerde orders op van de server.
 * @returns {Promise<object[]>} Een lijst met gearchiveerde orders.
 */
export async function fetchArchivedOrders() {
    const response = await fetch(`${API_URL}/orders/archive`);
    if (!response.ok) throw new Error('Could not fetch archived orders.');
    return await response.json();
}

// --- CUSTOMER FUNCTIES ---

/**
 * Voegt een nieuwe klant toe op de backend.
 * @param {object} customer - Het klant-object (e.g., { name: 'Nieuwe Klant' }).
 * @returns {Promise<void>}
 */
export async function addCustomerOnBackend(customer) {
    const response = await fetch(`${API_URL}/customers`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(customer)
    });
    if (!response.ok) throw new Error('Could not add customer.');
}

/**
 * Verwijdert een klant van de backend.
 * @param {string} customerName - De naam van de te verwijderen klant.
 * @returns {Promise<void>}
 */
export async function deleteCustomerOnBackend(customerName) {
    const encodedName = encodeURIComponent(customerName);
    const response = await fetch(`${API_URL}/customers/${encodedName}`, { method: 'DELETE' });
    if (!response.ok) throw new Error('Could not delete customer.');
}

/**
 * Vervangt alle klanten op de backend met een nieuwe lijst.
 * @param {string[]} customers - De nieuwe lijst met klantnamen.
 * @returns {Promise<void>}
 */
export async function replaceCustomersOnBackend(customers) {
    const response = await fetch(`${API_URL}/customers/replace`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(customers)
    });
    if (!response.ok) throw new Error('Could not replace customers.');
}

// --- MACHINE FUNCTIES ---

/**
 * Voegt een nieuwe machine toe op de backend.
 * @param {object} machine - Het machine-object.
 * @returns {Promise<void>}
 */
export async function addMachineOnBackend(machine) {
    const response = await fetch(`${API_URL}/machines`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(machine)
    });
    if (!response.ok) throw new Error('Could not add machine.');
}

/**
 * Verwijdert een machine van de backend.
 * @param {string} machineName - De naam van de te verwijderen machine.
 * @returns {Promise<void>}
 */
export async function deleteMachineOnBackend(machineName) {
    const encodedName = encodeURIComponent(machineName);
    const response = await fetch(`${API_URL}/machines/${encodedName}`, { method: 'DELETE' });
    if (!response.ok) throw new Error('Could not delete machine.');
}

/**
 * Vervangt alle machines op de backend met een nieuwe lijst.
 * @param {object[]} machines - De nieuwe lijst met machines.
 * @returns {Promise<void>}
 */
export async function replaceMachinesOnBackend(machines) {
    const response = await fetch(`${API_URL}/machines/replace`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(machines)
    });
    if (!response.ok) throw new Error('Could not replace machines.');
}

// --- ABSENCE FUNCTIES ---

/**
 * Voegt een nieuwe afwezigheid toe op de backend.
 * @param {object} absence - De afwezigheid om op te slaan.
 * @returns {Promise<object>} De opgeslagen afwezigheid data.
 */
export async function addAbsenceOnBackend(absence) {
    const response = await fetch(`${API_URL}/absences`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(absence),
    });
    if (!response.ok) throw new Error('Could not add absence.');
    return await response.json();
}

/**
 * Verwijdert een afwezigheid van de backend.
 * @param {number} absenceId - De ID van de te verwijderen afwezigheid.
 * @returns {Promise<void>}
 */
export async function deleteAbsenceOnBackend(absenceId) {
    const response = await fetch(`${API_URL}/absences/${absenceId}`, {
        method: 'DELETE',
    });
    if (!response.ok) throw new Error('Could not delete absence.');
}