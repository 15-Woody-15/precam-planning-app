// in state.js

/**
 * @typedef {object} OrderPart
 * @property {string} id
 * @property {string} partName
 * // ... (voeg hier eventueel andere eigenschappen van een 'part' toe)
 */

/**
 * @typedef {object} Order
 * @property {string} id
 * @property {string} customer
 * @property {OrderPart[]} parts
 * // ... (voeg hier eventueel andere eigenschappen van een 'order' toe)
 */

// --- CONFIGURATION ---
export const MATERIAL_STATUS = ['Not Available', 'Ordered', 'Available'];
const STORAGE_KEY = 'planning_orders_v35_en';

// --- APPLICATION STATE ---

/**
 * Bevat de centrale data van de applicatie.
 * @property {Order[]} orders - De lijst met actieve orders.
 * @property {string[]} customers - De lijst met alle klanten.
 * @property {object[]} machines - De lijst met alle machines.
 * @property {boolean} isLoadModalVisible - Bepaalt of de machine load modal zichtbaar is.
 * @property {number|null} machineLoadWeek - Het geselecteerde weeknummer in de machine load modal.
 * @property {Set<string>} expandedOrders - Een set met de ID's van de uitgeklapte orders in de lijst.
 * @property {Date} planningStartDate - De startdatum van de visuele planning.
 * @property {string} sortKey - De kolom waarop de orderlijst gesorteerd is.
 * @property {'asc'|'desc'} sortOrder - De sorteervolgorde ('asc' of 'desc').
 * @property {string} searchTerm - De huidige zoekterm.
 * @property {string} searchKey - De kolom waarop gezocht wordt.
 */
export let state = {
    orders: [],
    customers: [],
    machines: [],
    isLoadModalVisible: JSON.parse(localStorage.getItem(STORAGE_KEY))?.isLoadModalVisible || false,
    machineLoadWeek: JSON.parse(localStorage.getItem(STORAGE_KEY))?.machineLoadWeek || null,
    expandedOrders: new Set(JSON.parse(localStorage.getItem(STORAGE_KEY))?.expandedOrders || []),
    planningStartDate: new Date(),
    sortKey: 'deadline',
    sortOrder: 'asc',
    searchTerm: '',
    searchKey: 'customerOrderNr',
};

/**
 * Slaat de gebruikersvoorkeuren (zoals de geopende modal) op in localStorage.
 */
export function saveStateToLocalStorage() {
     localStorage.setItem(STORAGE_KEY, JSON.stringify({
         isLoadModalVisible: state.isLoadModalVisible,
         machineLoadWeek: state.machineLoadWeek,
         expandedOrders: [...state.expandedOrders],
     }));
}

/**
 * Zoekt een specifiek onderdeel in de volledige lijst van orders.
 * @param {string} partId - De ID van het onderdeel dat gezocht wordt.
 * @returns {OrderPart|null} Het gevonden onderdeel-object, of null als het niet gevonden is.
 */
export function findPart(partId) {
    for (const order of state.orders) {
        const foundPart = order.parts.find(p => p.id === partId);
        if (foundPart) return foundPart;
    }
    return null;
}