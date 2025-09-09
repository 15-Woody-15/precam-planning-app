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
    orders: [],
    klanten: [],
    machines: [],
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

// --- RENDER FUNCTIES (ingekort voor overzicht, de volledige functies staan in je project) ---
function renderAll() {
    /* ... volledige renderAll functie zoals je die had ... */
}
function applyUiState() {
    /* ... volledige applyUiState functie zoals je die had ... */
}
// ... etc. (alle overige render functies)


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

    addOrderForm.addEventListener('submit', async (e) => {
        /* ... volledige addOrderForm listener zoals je die had ... */
    });

    addPartBtn.addEventListener('click', createNewPartForm);

    const debouncedSave = debounce(async (part) => {
        const order = state.orders.find(o => o.parts.some(p => p.id === part.id));
        if (order) {
            try {
                await updateOrderOnBackend(order.id, order);
                showNotification(`Wijziging voor order ${order.id} opgeslagen!`, 'success');
            } catch (error) {
                showNotification(`Synchronisatiefout: ${error.message}`, 'error');
            }
        }
    }, 750);
    
    orderListBody.addEventListener('change', (e) => {
        /* ... volledige change listener zoals je die had, met debouncedSave ... */
    });

    orderListBody.addEventListener('click', async (e) => {
        /* ... volledige click listener zoals je die had ... */
    });
    
    // --- KLANTEN & MACHINES (NU MET API) ---
    addCustomerForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        const newName = newCustomerNameInput.value.trim();
        if (newName && !state.klanten.find(k => k.toLowerCase() === newName.toLowerCase())) {
            showLoadingOverlay();
            try {
                const response = await fetch(`${API_URL.replace('/orders', '/klanten')}`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ naam: newName })
                });
                if (!response.ok) throw new Error('Serverfout bij toevoegen klant');
                
                state.klanten.push(newName);
                newCustomerNameInput.value = '';
                renderCustomerModalList();
                renderCustomerDropdown();
                showNotification(`Klant "${newName}" toegevoegd!`, 'success');
            } catch (error) {
                showNotification(error.message, "error");
            } finally {
                hideLoadingOverlay();
            }
        } else {
            showNotification("Klantnaam is leeg of bestaat al.", "error");
        }
    });

    customerListUl.addEventListener('click', (e) => {
        if (e.target.classList.contains('delete-customer-btn')) {
            const klantToDelete = e.target.dataset.klant;
            openConfirmModal(
                'Klant Verwijderen', `Weet je zeker dat je klant "${klantToDelete}" wilt verwijderen?`,
                async () => {
                    showLoadingOverlay();
                    try {
                        const encodedName = encodeURIComponent(klantToDelete);
                        const response = await fetch(`${API_URL.replace('/orders', '/klanten')}/${encodedName}`, {
                            method: 'DELETE'
                        });
                        if (!response.ok) throw new Error('Serverfout bij verwijderen klant');

                        state.klanten = state.klanten.filter(k => k !== klantToDelete);
                        renderCustomerModalList();
                        renderCustomerDropdown();
                        showNotification(`Klant "${klantToDelete}" verwijderd.`, 'success');
                    } catch (error) {
                        showNotification(error.message, "error");
                    } finally {
                        hideLoadingOverlay();
                    }
                }
            );
        }
    });

    addMachineForm.addEventListener('submit', async (e) => {
		e.preventDefault();
		const newName = newMachineNameInput.value.trim();
		if (newName && !state.machines.find(m => m.name.toLowerCase() === newName.toLowerCase())) {
			const newMachine = { name: newName, hasRobot: newMachineHasRobotCheckbox.checked };
            showLoadingOverlay();
			try {
                const response = await fetch(`${API_URL.replace('/orders', '/machines')}`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(newMachine)
                });
                if(!response.ok) throw new Error('Serverfout bij toevoegen machine');

                state.machines.push(newMachine);
                newMachineNameInput.value = '';
                newMachineHasRobotCheckbox.checked = false;
                renderMachineModalList();
                renderAll(); // Her-render alles om de machine in de dropdowns te krijgen
                showNotification(`Machine "${newName}" toegevoegd!`, 'success');
            } catch (error) {
                showNotification(error.message, 'error');
            } finally {
                hideLoadingOverlay();
            }
		} else {
			showNotification("Machinenaam is leeg of bestaat al.", "error");
		}
	});

    machineListUl.addEventListener('click', (e) => {
        if (e.target.classList.contains('delete-machine-btn')) {
            const machineToDelete = e.target.dataset.machineName;
             openConfirmModal(
                'Machine Verwijderen', `Weet je zeker dat je machine "${machineToDelete}" wilt verwijderen?`,
                async () => {
                    showLoadingOverlay();
                    try {
                         const encodedName = encodeURIComponent(machineToDelete);
                         const response = await fetch(`${API_URL.replace('/orders', '/machines')}/${encodedName}`, {
                            method: 'DELETE'
                        });
                        if (!response.ok) throw new Error('Serverfout bij verwijderen machine');

                        state.machines = state.machines.filter(m => m.name !== machineToDelete);
                        // Koppel de machine los van alle parts die hem gebruiken
                        state.orders.forEach(order => {
                            order.parts.forEach(part => {
                                if (part.machine === machineToDelete) {
                                    part.machine = null;
                                }
                            });
                        });
                        renderMachineModalList();
                        renderAll();
                        showNotification(`Machine "${machineToDelete}" verwijderd.`, 'success');
                    } catch (error) {
                        showNotification(error.message, "error");
                    } finally {
                        hideLoadingOverlay();
                    }
                }
            );
        }
    });
    
    // ... de rest van de event listeners ...
}


// --- INITIALISATIE ---
document.addEventListener('DOMContentLoaded', async () => {
    initializeDOMElements();
    setupEventListeners();
    
    // ... (modal listeners) ...
    
    showLoadingOverlay();
    try {
        const [ordersRes, klantenRes, machinesRes] = await Promise.all([
            fetch(API_URL),
            fetch(API_URL.replace('/orders', '/klanten')),
            fetch(API_URL.replace('/orders', '/machines'))
        ]);

        if (!ordersRes.ok || !klantenRes.ok || !machinesRes.ok) {
            throw new Error('Kon initiële data niet laden van de server.');
        }

        state.orders = await ordersRes.json();
        state.klanten = await klantenRes.json();
        state.machines = await machinesRes.json();
        
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