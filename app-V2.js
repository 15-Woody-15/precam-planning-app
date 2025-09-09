// --- CONFIGURatie ---
const DEFAULT_MACHINES = [
    { name: "DMU 50 - 1", hasRobot: true },
    { name: "DMU 50 - 2", hasRobot: true },
    { name: "DMU 50 - OUD", hasRobot: false },
    { name: "Draaibank", hasRobot: false }
];
const MATERIAAL_STATUS = ['Niet Beschikbaar', 'Besteld', 'Beschikbaar'];
const DEFAULT_KLANTEN = ['CVT', 'Heinmade', 'Bradford', 'Komax'];
const STORAGE_KEY = 'planning_orders_v34';

// --- DATA OPSLAG & STATE ---
const storedState = JSON.parse(localStorage.getItem(STORAGE_KEY)) || {};
let state = {
    orders: [], // Start altijd met een lege orderlijst; de server is de enige bron.
    klanten: storedState.klanten || DEFAULT_KLANTEN,
    machines: storedState.machines || DEFAULT_MACHINES,
    isOrderFormCollapsed: storedState.isOrderFormCollapsed || false,
    isLoadModalVisible: storedState.isLoadModalVisible || false,
    machineLoadWeek: storedState.machineLoadWeek || null,
    expandedOrders: new Set(storedState.expandedOrders || []),
    planningStartDate: new Date(),
    sortKey: 'deadline',
    sortOrder: 'asc',
    searchTerm: '',
    searchKey: 'klantOrdernr',
};

function saveState() {
     localStorage.setItem(STORAGE_KEY, JSON.stringify({
         klanten: state.klanten,
         machines: state.machines,
         isOrderFormCollapsed: state.isOrderFormCollapsed,
         isLoadModalVisible: state.isLoadModalVisible,
         machineLoadWeek: state.machineLoadWeek,
         expandedOrders: [...state.expandedOrders],
     }));
}

// --- DOM ELEMENTEN ---
let addOrderForm, orderListBody, orderListThead, planningContainer, importDataLink, clearDataLink, prevWeekBtn, nextWeekBtn, searchInput, searchKeySelect, partsContainer, addPartBtn, manageCustomersBtn, customerModal, closeCustomerModalBtn, addCustomerForm, customerListUl, newCustomerNameInput, klantSelect, newOrderHeader, newOrderBody, toggleOrderFormIcon, manageMachinesBtn, machineModal, closeMachineModalBtn, addMachineForm, machineListUl, newMachineNameInput, newMachineHasRobotCheckbox, fullscreenBtn, fullscreenText, fullscreenIconEnter, fullscreenIconExit, actionsDropdownBtn, actionsDropdownMenu, exportDataLink, importFileInput, todayBtn, editOrderModal, editOrderForm, editPartsContainer, cancelEditBtn, saveOrderBtn, editKlantSelect, machineLoadModal, showLoadBtn, prevLoadWeekBtn, nextLoadWeekBtn, loadWeekTitle, loadWeekContent, closeLoadModalBtn, confirmDeleteModal, confirmDeleteBtn, cancelDeleteBtn, deleteConfirmText, deleteConfirmTitle, loadingOverlay, themeToggleBtn, themeToggleDarkIcon, themeToggleLightIcon;

function initializeDOMElements() {
    addOrderForm = document.getElementById('add-order-form');
    orderListBody = document.getElementById('order-list');
    orderListThead = document.querySelector('#order-table thead');
    planningContainer = document.getElementById('planning-container');
    importDataLink = document.getElementById('import-data-link');
    clearDataLink = document.getElementById('clear-data-link');
    prevWeekBtn = document.getElementById('prev-week-btn');
    nextWeekBtn = document.getElementById('next-week-btn');
    searchInput = document.getElementById('search-input');
    searchKeySelect = document.getElementById('search-key');
    partsContainer = document.getElementById('parts-container');
    addPartBtn = document.getElementById('add-part-btn');
    manageCustomersBtn = document.getElementById('manage-customers-btn');
    customerModal = document.getElementById('customer-modal');
    closeCustomerModalBtn = document.getElementById('close-customer-modal-btn');
    addCustomerForm = document.getElementById('add-customer-form');
    customerListUl = document.getElementById('customer-list');
    newCustomerNameInput = document.getElementById('new-customer-name');
    klantSelect = document.getElementById('klant');
    newOrderHeader = document.getElementById('new-order-header');
    newOrderBody = document.getElementById('new-order-body');
    toggleOrderFormIcon = document.getElementById('toggle-order-form-icon');
    manageMachinesBtn = document.getElementById('manage-machines-btn');
    machineModal = document.getElementById('machine-modal');
    closeMachineModalBtn = document.getElementById('close-machine-modal-btn');
    addMachineForm = document.getElementById('add-machine-form');
    machineListUl = document.getElementById('machine-list');
    newMachineNameInput = document.getElementById('new-machine-name');
    newMachineHasRobotCheckbox = document.getElementById('new-machine-has-robot');
    fullscreenBtn = document.getElementById('fullscreen-btn');
    fullscreenText = document.getElementById('fullscreen-text');
    fullscreenIconEnter = document.getElementById('fullscreen-icon-enter');
    fullscreenIconExit = document.getElementById('fullscreen-icon-exit');
    actionsDropdownBtn = document.getElementById('actions-dropdown-btn');
    actionsDropdownMenu = document.getElementById('actions-dropdown-menu');
    exportDataLink = document.getElementById('export-data-link');
    importFileInput = document.getElementById('import-file-input');
    todayBtn = document.getElementById('today-btn');
    editOrderModal = document.getElementById('edit-order-modal');
    editOrderForm = document.getElementById('edit-order-form');
    editPartsContainer = document.getElementById('edit-parts-container');
    cancelEditBtn = document.getElementById('cancel-edit-btn');
    saveOrderBtn = document.getElementById('save-order-btn');
    editKlantSelect = document.getElementById('edit-klant');
    machineLoadModal = document.getElementById('machine-load-modal');
    showLoadBtn = document.getElementById('show-load-btn');
    prevLoadWeekBtn = document.getElementById('prev-load-week-btn');
    nextLoadWeekBtn = document.getElementById('next-load-week-btn');
    loadWeekTitle = document.getElementById('load-week-title');
    loadWeekContent = document.getElementById('load-week-content');
    closeLoadModalBtn = document.getElementById('close-load-modal-btn');
    confirmDeleteModal = document.getElementById('confirm-delete-modal');
    confirmDeleteBtn = document.getElementById('confirm-delete-btn');
    cancelDeleteBtn = document.getElementById('cancel-delete-btn');
    deleteConfirmText = document.getElementById('delete-confirm-text');
    deleteConfirmTitle = document.getElementById('delete-confirm-title');
    loadingOverlay = document.getElementById('loading-overlay');
    themeToggleBtn = document.getElementById('theme-toggle-btn');
    themeToggleDarkIcon = document.getElementById('theme-toggle-dark-icon');
    themeToggleLightIcon = document.getElementById('theme-toggle-light-icon');
}

// --- HULPFUNCTIES ---
function showLoadingOverlay() {
    if (loadingOverlay) loadingOverlay.classList.remove('hidden');
}

function hideLoadingOverlay() {
    if (loadingOverlay) loadingOverlay.classList.add('hidden');
}

const formatDateToYMD = (date) => {
    if (!date) return '';
    const d = new Date(date);
    d.setHours(0,0,0,0);
    const year = d.getFullYear();
    const month = (d.getMonth() + 1).toString().padStart(2, '0');
    const day = d.getDate().toString().padStart(2, '0');
    return `${year}-${month}-${day}`;
};
const getWeekNumber = (d) => {
    d = new Date(Date.UTC(d.getFullYear(), d.getMonth(), d.getDate()));
    d.setUTCDate(d.getUTCDate() + 4 - (d.getUTCDay() || 7));
    var yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
    var weekNo = Math.ceil((((d - yearStart) / 86400000) + 1) / 7);
    return weekNo;
};

function showNotification(message, type = 'success') {
    const container = document.getElementById('notification-container');
    const notification = document.createElement('div');
    notification.className = `notification ${type}`;
    notification.textContent = message;
    container.appendChild(notification);
    setTimeout(() => {
        notification.classList.add('hiding');
        notification.addEventListener('transitionend', () => notification.remove());
    }, 3000);
}

const getPartDuration = (part) => part.totaalUren || 0;

function debounce(func, timeout = 750){
  let timer;
  return (...args) => {
    clearTimeout(timer);
    timer = setTimeout(() => { func.apply(this, args); }, timeout);
  };
}

// --- API FUNCTIES ---
const API_URL = 'https://precam-planning-api-app.onrender.com/api/orders';

async function replaceAllOrdersOnBackend(allOrders) {
    const replaceUrl = API_URL.replace('/orders', '/orders/replace');
    const response = await fetch(replaceUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(allOrders),
    });
    if (!response.ok) throw new Error(`Serverfout bij het vervangen van alle orders: ${response.statusText}`);
    return;
}

async function addOrderOnBackend(order) {
    const response = await fetch(API_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(order),
    });
    if (!response.ok) throw new Error(`Serverfout bij toevoegen: ${response.statusText}`);
    return await response.json();
}

async function updateOrderOnBackend(originalOrderId, updatedOrder) {
    if (!updatedOrder) return;
    const response = await fetch(`${API_URL}/${originalOrderId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updatedOrder),
    });
    if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`Serverfout bij bijwerken: ${response.statusText} (${errorText})`);
    }
    return await response.json();
}

async function deleteOrderOnBackend(orderId) {
    const response = await fetch(`${API_URL}/${orderId}`, {
        method: 'DELETE',
    });
    if (!response.ok) throw new Error(`Serverfout bij verwijderen: ${response.statusText}`);
    return;
}

// --- RENDER FUNCTIES ---
// (Alle render functies blijven ongewijzigd, hier weggelaten voor beknoptheid maar staan in je bestand)
function renderAll() {
    // ... volledige renderAll functie ...
}
function applyUiState() {
    // ... volledige applyUiState functie ...
}
// ... etc. ... (Alle render functies zoals je ze had)

// --- EVENT HANDLERS ---
function setupEventListeners() {
    // --- THEMA WISSEL LOGICA ---
    const applyTheme = (theme) => {
        if (theme === 'dark') {
            document.documentElement.classList.add('dark');
            themeToggleLightIcon.classList.remove('hidden');
            themeToggleDarkIcon.classList.add('hidden');
        } else {
            document.documentElement.classList.remove('dark');
            themeToggleDarkIcon.classList.remove('hidden');
            themeToggleLightIcon.classList.add('hidden');
        }
    };
    const savedTheme = localStorage.getItem('theme');
    const systemPrefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
    if (savedTheme) {
        applyTheme(savedTheme);
    } else if (systemPrefersDark) {
        applyTheme('dark');
    } else {
        applyTheme('light');
    }
    themeToggleBtn.addEventListener('click', () => {
        const isDark = document.documentElement.classList.contains('dark');
        if (isDark) {
            localStorage.setItem('theme', 'light');
            applyTheme('light');
        } else {
            localStorage.setItem('theme', 'dark');
            applyTheme('dark');
        }
    });

    // ... de rest van je event listeners ...
}

// --- INITIALISATIE ---
document.addEventListener('DOMContentLoaded', async () => {
    initializeDOMElements();
    setupEventListeners();
    
    confirmDeleteBtn.addEventListener('click', () => {
        if (typeof onConfirmCallback === 'function') {
            onConfirmCallback();
        }
        closeConfirmModal();
    });
    cancelDeleteBtn.addEventListener('click', closeConfirmModal);
    confirmDeleteModal.addEventListener('click', (e) => {
        if (e.target.id === 'confirm-delete-modal') {
            closeConfirmModal();
        }
    });
    
    showLoadingOverlay();
    try {
        const response = await fetch(API_URL);
        if (!response.ok) {
            throw new Error(`Kon data niet laden: ${response.statusText}`);
        }
        const ordersFromBackend = await response.json();
        state.orders = ordersFromBackend;
    } catch (error) {
        console.error("Fout bij ophalen van data:", error);
        showNotification("Kon niet verbinden met de backend server.", "error");
    } finally {
        hideLoadingOverlay();
    }
    
    // De rest van je initialisatie logica...
    const today = new Date();
    const dayOfWeek = today.getDay();
    const diff = today.getDate() - dayOfWeek + (dayOfWeek === 0 ? -6 : 1); 
    state.planningStartDate = new Date(today.setDate(diff));
    state.planningStartDate.setHours(0, 0, 0, 0);
    
    const defaultDeadline = new Date();
    defaultDeadline.setDate(defaultDeadline.getDate() + 14);
    document.getElementById('deadline').value = defaultDeadline.toISOString().split('T')[0];
    
    createNewPartForm();
    renderAll();
});