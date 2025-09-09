// --- CONFIGURatie ---
const MATERIAAL_STATUS = ['Niet Beschikbaar', 'Besteld', 'Beschikbaar'];
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
// Belangrijk: pas deze URL aan naar 'http://localhost:3000/api' als je lokaal test.
const API_URL = 'https://precam-planning-api-app.onrender.com/api';

async function replaceAllBackendData(data) {
    // Deze functie is complexer geworden, omdat we niet alles in één keer kunnen vervangen.
    // Voor nu focussen we op de order-import. Een volledige import zou aparte calls moeten maken.
    const response = await fetch(`${API_URL}/orders/replace`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data.orders),
    });
    if (!response.ok) throw new Error(`Serverfout bij het vervangen van alle orders: ${response.statusText}`);
    return;
}

async function addOrderOnBackend(order) {
    const response = await fetch(`${API_URL}/orders`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(order),
    });
    if (!response.ok) throw new Error(`Serverfout bij toevoegen: ${response.statusText}`);
    return await response.json();
}

async function updateOrderOnBackend(originalOrderId, updatedOrder) {
    if (!updatedOrder) return;
    const response = await fetch(`${API_URL}/orders/${originalOrderId}`, {
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
    const response = await fetch(`${API_URL}/orders/${orderId}`, {
        method: 'DELETE',
    });
    if (!response.ok) throw new Error(`Serverfout bij verwijderen: ${response.statusText}`);
    return;
}

// --- RENDER FUNCTIES ---
function renderAll() {
    const scheduleInfo = buildScheduleAndDetectConflicts();
    const machineLoadInfo = calculateMachineLoad(scheduleInfo, state.planningStartDate);
    
    if (state.machineLoadWeek === null) {
        const firstWeek = getWeekNumber(state.planningStartDate);
        if (machineLoadInfo[firstWeek]) {
            state.machineLoadWeek = firstWeek;
        }
    }

    applyUiState();
    
    renderMachineLoad(machineLoadInfo);
    renderCustomerDropdown();
    renderOrderList(scheduleInfo);
    renderPlanningGrid(scheduleInfo);
}   

function applyUiState() {
    if (state.isOrderFormCollapsed) {
        newOrderBody.classList.add('hidden');
        toggleOrderFormIcon.classList.add('rotate-180');
    } else {
        newOrderBody.classList.remove('hidden');
        toggleOrderFormIcon.classList.remove('rotate-180');
    }
}

function renderCustomerDropdown() {
     klantSelect.innerHTML = '<option value="">Kies een klant...</option>';
     editKlantSelect.innerHTML = '';
     [...state.klanten].sort().forEach(klant => {
         const option = document.createElement('option');
         option.value = klant;
         option.textContent = klant;
         klantSelect.appendChild(option);
         editKlantSelect.appendChild(option.cloneNode(true));
     });
}

function renderCustomerModalList() {
     customerListUl.innerHTML = '';
     [...state.klanten].sort().forEach(klant => {
         const li = document.createElement('li');
         li.className = 'flex justify-between items-center p-2 bg-gray-100 rounded';
         li.innerHTML = `<span>${klant}</span><button class="delete-customer-btn text-red-500 hover:text-red-700 font-bold px-2" data-klant="${klant}" aria-label="Verwijder klant ${klant}">&times;</button>`;
         customerListUl.appendChild(li);
     });
}

function renderMachineModalList() {
     machineListUl.innerHTML = '';
     [...state.machines].sort((a,b) => a.name.localeCompare(b.name)).forEach(machine => {
         const li = document.createElement('li');
         li.className = 'flex justify-between items-center p-2 bg-gray-100 rounded';
         li.innerHTML = `<span>${machine.name} ${machine.hasRobot ? '🤖' : ''}</span><button class="delete-machine-btn text-red-500 hover:text-red-700 font-bold px-2" data-machine-name="${machine.name}" aria-label="Verwijder machine ${machine.name}">&times;</button>`;
         machineListUl.appendChild(li);
     });
}

function renderOrderList({conflicts, partScheduleInfo, deadlineInfo}) {
    orderListBody.innerHTML = '';
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const oneWeekFromNow = new Date(today);
    oneWeekFromNow.setDate(today.getDate() + 7);

    document.querySelectorAll('th.sortable-header').forEach(th => {
        let currentText = th.textContent.replace(' ▲', '').replace(' ▼', '');
        if (th.dataset.sortKey === state.sortKey) {
            th.textContent = currentText + (state.sortOrder === 'asc' ? ' ▲' : ' ▼');
        } else {
            th.textContent = currentText;
        }
    });

    const filteredOrders = state.orders.filter(order => {
        if (!state.searchTerm) return true;
        const term = state.searchTerm.toLowerCase();
        if(state.searchKey === 'id' || state.searchKey === 'klant' || state.searchKey === 'klantOrdernr'){
            return (order[state.searchKey] || '').toString().toLowerCase().includes(term);
        }
        return order.parts.some(part => (part[state.searchKey] || '').toString().toLowerCase().includes(term));
    });

    const sortedOrders = [...filteredOrders].sort((a, b) => {
        const valA = a[state.sortKey];
        const valB = b[state.sortKey];
        let comparison = 0;
        if (state.sortKey === 'deadline') {
            if (!valA || !valB) return 0;
            comparison = new Date(valA) - new Date(valB);
        } else {
            comparison = String(valA).localeCompare(String(valB), undefined, { numeric: true });
        }
        return state.sortOrder === 'asc' ? comparison : -comparison;
    });

    const conflictIcon = `<svg class="inline-block h-5 w-5 text-red-500" title="Conflict gedetecteerd" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor"><path fill-rule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.21 3.031-1.742 3.031H4.42c-1.532 0-2.492-1.697-1.742-3.031l5.58-9.92zM10 13a1 1 0 110-2 1 1 0 010 2zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clip-rule="evenodd" /></svg>`;
    const delayedIcon = `<svg class="inline-block h-5 w-5 text-yellow-500" title="Eén of meer onderdelen hebben een vertraagde start" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor"><path fill-rule="evenodd" d="M8.485 2.495c.673-1.167 2.357-1.167 3.03 0l6.28 10.875c.673 1.167-.17 2.625-1.516 2.625H3.72c-1.347 0-2.189-1.458-1.515-2.625L8.485 2.495zM10 5a.75.75 0 01.75.75v3.5a.75.75 0 01-1.5 0v-3.5A.75.75 0 0110 5zm0 9a1 1 0 100-2 1 1 0 000 2z" clip-rule="evenodd" /></svg>`;
    const deadlineMissedIcon = `<svg class="inline-block h-5 w-5 text-red-600" title="Leverdatum wordt niet gehaald!" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor"><path fill-rule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm.75-13a.75.75 0 00-1.5 0v5c0 .414.336.75.75.75h4a.75.75 0 000-1.5H10.75V5z" clip-rule="evenodd" /></svg>`;
    
    sortedOrders.forEach(order => {
        const groupTr = document.createElement('tr');
        groupTr.className = `order-group-row ${order.isUrgent ? 'urgent' : ''}`;
        groupTr.dataset.orderId = order.id;
        
        const overallStatus = getOverallOrderStatus(order);
        const orderHasConflict = order.parts.some(part => conflicts.has(part.id));
        const totalOrderMinutes = Math.round(order.parts.reduce((sum, part) => sum + getPartDuration(part) * 60, 0));
        const totalOrderHoursFormatted = (totalOrderMinutes / 60).toFixed(1);
        const orderHasDelayedParts = order.parts.some(part => {
            const info = partScheduleInfo.get(part.id);
            return info && info.isDelayed;
        });
        const willMissDeadline = deadlineInfo.get(order.id);
        const deadlineDate = new Date(order.deadline + 'T00:00:00');
        const deadlineText = deadlineDate.toLocaleDateString('nl-NL');
        let deadlineSpan = `<span>${deadlineText}</span>`;
        const isUpcomingInNext7Days = deadlineDate >= today && deadlineDate <= oneWeekFromNow;

        if (willMissDeadline) {
            deadlineSpan = `<span class="bg-red-500 text-white px-2 py-1 rounded-full font-bold">${deadlineText}</span>`;
        } else if (isUpcomingInNext7Days) {
            deadlineSpan = `<span class="bg-yellow-200 text-yellow-900 px-2 py-1 rounded-full font-semibold">${deadlineText}</span>`;
        } else if (deadlineDate < today && overallStatus !== 'Voltooid') {
            deadlineSpan = `<span class="bg-red-200 text-red-900 px-2 py-1 rounded-full font-semibold">${deadlineText}</span>`;
        }
        
        const klantOrdernrTitle = order.klantOrdernr ? `title="Ordernr. Klant: ${order.klantOrdernr}"` : '';

        groupTr.innerHTML = `
            <td class="px-3 py-3 whitespace-nowrap">
                <div class="flex items-center">
                    <input type="checkbox" title="Spoedorder" class="toggle-urgent-btn h-4 w-4 rounded border-gray-300 text-indigo-600 mr-3" data-order-id="${order.id}" ${order.isUrgent ? 'checked' : ''}>
                    ${willMissDeadline ? `<div class="mr-2">${deadlineMissedIcon}</div>` : ''}
                    ${orderHasConflict ? `<div class="mr-2">${conflictIcon}</div>` : ''}
                    ${orderHasDelayedParts ? `<div class="mr-2">${delayedIcon}</div>` : ''}
                    <div>
                        <span class="font-bold" ${klantOrdernrTitle}>${order.isUrgent ? '🔥 ' : ''}${order.id}</span>
                        <span class="font-normal text-gray-600">(${order.klant})</span>
                    </div>
                </div>
            </td>
            <td class="px-3 py-3 text-sm font-semibold">${totalOrderHoursFormatted} uur</td>
            <td></td>
            <td class="px-3 py-3"></td>
            <td class="px-3 py-3 text-center">${deadlineSpan}</td>
            <td class="px-3 py-3" colspan="4">${overallStatus} (${order.parts.length} onderdelen)</td>
            <td class="px-3 py-3 text-right">
                <button class="edit-order-btn text-sm text-blue-600 hover:underline font-semibold" data-order-id="${order.id}">Bewerken</button>
            </td>
        `;
        orderListBody.appendChild(groupTr);
        order.parts.forEach(part => {
            const tr = document.createElement('tr');
            tr.dataset.partId = part.id;
            tr.className = state.expandedOrders.has(order.id) ? 'part-row' : 'part-row hidden';
            tr.dataset.parentOrderId = order.id;
            const partHasConflict = conflicts.has(part.id);
            let statusBadge;
            switch (part.status) {
                case 'Ingepland': statusBadge = `<span class="px-2 inline-flex items-center text-xs leading-5 font-semibold rounded-full bg-blue-100 text-blue-800">Ingepland</span>`; break;
                case 'Voltooid': statusBadge = `<span class="px-2 inline-flex items-center text-xs leading-5 font-semibold rounded-full bg-green-100 text-green-800">Voltooid</span>`; break;
                default: statusBadge = `<span class="px-2 inline-flex items-center text-xs leading-5 font-semibold rounded-full bg-gray-100 text-gray-800">Te plannen</span>`;
            }
            let materiaalBadge;
            switch (part.materiaalStatus) {
                case 'Beschikbaar': materiaalBadge = `<span class="px-2 inline-flex text-xs leading-5 font-semibold rounded-full bg-green-100 text-green-800">Beschikbaar</span>`; break;
                case 'Besteld': materiaalBadge = `<span class="px-2 inline-flex text-xs leading-5 font-semibold rounded-full bg-yellow-100 text-yellow-800">Besteld</span>`; break;
                default: materiaalBadge = `<span class="px-2 inline-flex text-xs leading-5 font-semibold rounded-full bg-red-100 text-red-800">Niet Beschikbaar</span>`;
            }
            const selectedMachine = state.machines.find(m => m.name === part.machine);
            let shiftOptions = `<option value="8" ${part.shift === 8 ? 'selected': ''}>Dag (8u)</option>`;
            if (selectedMachine) {
                if (selectedMachine.name.includes('DMU')) {
                    shiftOptions += `<option value="16" ${part.shift === 16 ? 'selected': ''}>Dag+Nacht (16u)</option>`;
                }
                if (selectedMachine.hasRobot) {
                    shiftOptions += `<option value="24" ${part.shift === 24 ? 'selected': ''}>Continu (24u)</option>`;
                }
            }
            const info = partScheduleInfo.get(part.id) || {};
            const isDelayed = info.isDelayed;
            const startDateInputClass = `bg-gray-50 start-date-input rounded-md border-gray-300 text-sm ${isDelayed ? 'delayed-start' : ''}`;
            const startDateTitle = isDelayed ? `Let op: Werkelijke start is ${new Date(info.actualStartDate).toLocaleDateString('nl-NL')}, later dan gepland.` : '';
            tr.innerHTML = `
                <td class="pl-8 pr-3 py-3 whitespace-nowrap" title="Tekening: ${part.tekeningNummer}">
                    <div class="text-sm font-medium text-gray-900">${part.onderdeelNaam}</div>
                    <div class="text-xs text-gray-500">${part.id}</div>
                </td>
                <td class="px-3 py-3 text-sm duration-cell" data-part-id="${part.id}" title="Klik om te bewerken. Totaal: ${Math.round(getPartDuration(part) * 60)}min">${part.productieTijdPerStuk} min/st</td>
                <td class="px-3 py-3 text-sm">${part.aantal} st</td>
                <td class="px-3 py-3 whitespace-nowrap text-sm"><button class="materiaal-status-btn" data-part-id="${part.id}">${materiaalBadge}</button></td>
                <td class="px-3 py-3"></td>
                <td class="px-3 py-3 whitespace-nowrap"><div class="flex items-center">${statusBadge} ${partHasConflict ? `<div class="ml-2">${conflictIcon}</div>` : ''}</div></td>
                <td class="px-3 py-3 whitespace-nowrap text-sm"><select class="bg-gray-50 machine-select rounded-md border-gray-300 text-sm" data-part-id="${part.id}"><option value="">Kies...</option>${state.machines.map(m => `<option value="${m.name}" ${part.machine === m.name ? 'selected' : ''}>${m.name}</option>`).join('')}</select></td>
                <td class="px-3 py-3 whitespace-nowrap text-sm"><select class="bg-gray-50 shift-select rounded-md border-gray-300 text-sm" data-part-id="${part.id}" ${!part.machine ? 'disabled' : ''}>${shiftOptions}</select></td>
                <td class="px-3 py-3 whitespace-nowrap"><input type="date" class="${startDateInputClass}" data-part-id="${part.id}" value="${part.startDate || ''}" title="${startDateTitle}"></td>
                <td class="px-3 py-3 whitespace-nowrap text-sm font-medium">
                    <button class="toggle-status-btn text-green-600 hover:text-green-900" data-part-id="${part.id}">${part.status === 'Voltooid' ? 'Heropen' : 'Voltooid'}</button>
                    <button class="delete-btn text-red-600 hover:text-red-900 ml-4" data-part-id="${part.id}">Verwijder</button>
                </td>
            `;
            orderListBody.appendChild(tr);
        });
    });
}

function getOverallOrderStatus(order) {
     const partStatuses = order.parts.map(p => p.status);
     if (partStatuses.length === 0) return 'Leeg';
     if (partStatuses.every(s => s === 'Voltooid')) return 'Voltooid';
     if (partStatuses.some(s => s === 'Ingepland')) return 'In Productie';
     return 'Te Plannen';
}

function buildScheduleAndDetectConflicts() {
    const schedule = {}; 
    const conflicts = new Map();
    const partScheduleInfo = new Map();
    const deadlineInfo = new Map();
    
    state.machines.forEach(m => schedule[m.name] = {});

    const partsToSchedule = state.orders
        .flatMap(order => 
            order.parts.map(part => {
                return { ...part, isUrgent: order.isUrgent };
            })
        )
        .filter(p => p.machine && p.startDate && p.status !== 'Voltooid')
        .sort((a,b) => new Date(a.startDate) - new Date(b.startDate) || (b.isUrgent - a.isUrgent));

    partsToSchedule.forEach(part => {
        let remainingHours = getPartDuration(part);
        let currentDate = new Date(part.startDate + 'T00:00:00');
        let actualStartDate = null;
        while (remainingHours > 0.01) {
            if (part.shift === 8) {
                if (currentDate.getDay() === 6 || currentDate.getDay() === 0) {
                    currentDate.setDate(currentDate.getDate() + 1);
                    continue;
                }
            }
            const dateString = formatDateToYMD(currentDate);
            if (!schedule[part.machine][dateString]) {
                schedule[part.machine][dateString] = { parts: [], totalHours: 0 };
            }
            const daySchedule = schedule[part.machine][dateString];
            const dayCapacity = daySchedule.parts.length > 0 ? findPart(daySchedule.parts[0].partId).shift : part.shift;
            const availableHours = dayCapacity - daySchedule.totalHours;
            if (!actualStartDate && availableHours <= 0) {
                currentDate.setDate(currentDate.getDate() + 1);
                continue;
            }
            if (!actualStartDate) {
                actualStartDate = new Date(currentDate);
            }
            const hoursToBook = Math.min(remainingHours, availableHours);
            if(hoursToBook > 0) {
              daySchedule.parts.push({ partId: part.id, hours: hoursToBook });
              daySchedule.totalHours += hoursToBook;
            }
            remainingHours -= hoursToBook;
            if(remainingHours > 0.01) {
                currentDate.setDate(currentDate.getDate() + 1);
            }
        }
        partScheduleInfo.set(part.id, {
            actualStartDate: actualStartDate,
            actualEndDate: new Date(currentDate),
            isDelayed: actualStartDate && formatDateToYMD(actualStartDate) !== part.startDate
        });
    });

    state.orders.forEach(order => {
        let latestEndDate = null;
        order.parts.forEach(part => {
            const info = partScheduleInfo.get(part.id);
            if(info && info.actualEndDate) {
                if(!latestEndDate || info.actualEndDate > latestEndDate) {
                    latestEndDate = info.actualEndDate;
                }
            }
        });
        
        if (latestEndDate && order.deadline) {
            const deadlineDate = new Date(order.deadline);
            deadlineDate.setHours(0, 0, 0, 0);
            
            const normalizedLatestEndDate = new Date(latestEndDate);
            normalizedLatestEndDate.setHours(0, 0, 0, 0);

            if (normalizedLatestEndDate > deadlineDate) {
                deadlineInfo.set(order.id, true);
            }
        }
    });

    for (const machine in schedule) {
        for (const date in schedule[machine]) {
            const dayInfo = schedule[machine][date];
            if (dayInfo.parts.length <= 1) continue;
            const firstPartShift = findPart(dayInfo.parts[0].partId).shift;
            let hasShiftMismatch = dayInfo.parts.some(p => findPart(p.partId).shift !== firstPartShift);
            let isOverbooked = dayInfo.totalHours > firstPartShift + 0.01;
            if (isOverbooked || hasShiftMismatch) {
                dayInfo.parts.forEach(p1 => {
                    if (!conflicts.has(p1.partId)) conflicts.set(p1.partId, []);
                    dayInfo.parts.forEach(p2 => {
                        if (p1.partId !== p2.partId && !conflicts.get(p1.partId).includes(p2.partId)) {
                            conflicts.get(p1.partId).push(p2.partId);
                        }
                    });
                });
            }
        }
    }
    return { schedule, conflicts, partScheduleInfo, deadlineInfo };
}

function calculateSpanningBlocks(scheduleInfo, gridStartDate) {
    const { schedule } = scheduleInfo;
    const spanningBlocks = [];
    const processedParts = new Set();
    const msPerDay = 1000 * 60 * 60 * 24;
    const machineNameIndexMap = new Map(state.machines.map((m, i) => [m.name, i]));
    const partsToDraw = state.orders.flatMap(o => o.parts.filter(p => p.machine && p.startDate && p.status !== 'Voltooid'));
    
    partsToDraw.forEach(originalPart => {
        if (processedParts.has(originalPart.id)) return;
        processedParts.add(originalPart.id);
        
        const machineIndex = machineNameIndexMap.get(originalPart.machine);
        if (machineIndex === undefined) return;

        const allDates = [];
        const machineSchedule = schedule[originalPart.machine];
        if (machineSchedule) {
            for (const dateStr in machineSchedule) {
                if (machineSchedule[dateStr].parts.some(p => p.partId === originalPart.id)) {
                    allDates.push(new Date(dateStr + 'T00:00:00'));
                }
            }
        }
        if (allDates.length === 0) return;

        allDates.sort((a, b) => a - b);

        if (originalPart.shift === 8 || originalPart.shift === 16) {
            let currentSegment = [];
            for (const date of allDates) {
                if (currentSegment.length > 0) {
                    const lastDate = currentSegment[currentSegment.length - 1];
                    const diffDays = (date - lastDate) / msPerDay;
                    if (diffDays > 1) { 
                        spanningBlocks.push({ partId: originalPart.id, machineIndex, start: currentSegment[0], end: lastDate });
                        currentSegment = [];
                    }
                }
                currentSegment.push(date);
            }
            if (currentSegment.length > 0) {
                spanningBlocks.push({ partId: originalPart.id, machineIndex, start: currentSegment[0], end: currentSegment[currentSegment.length-1] });
            }
        } else {
            spanningBlocks.push({ partId: originalPart.id, machineIndex, start: allDates[0], end: allDates[allDates.length - 1] });
        }
    });

    return spanningBlocks.filter(block => block.end >= gridStartDate)
        .map(block => {
            let effectiveStart = block.start;
            if (block.start < gridStartDate) {
                effectiveStart = gridStartDate;
            }
            const startColumn = Math.round((effectiveStart - gridStartDate) / msPerDay) + 2;
            const span = Math.round((block.end - effectiveStart) / msPerDay) + 1;
            return { ...block, startColumn, span };
        });
}

function renderPlanningGrid(scheduleInfo) {
    const { conflicts, deadlineInfo } = scheduleInfo;

    while (planningContainer.firstChild) {
        planningContainer.removeChild(planningContainer.firstChild);
    }

    const grid = document.createElement('div');
    grid.className = 'planning-grid';
    const gridStartDate = new Date(state.planningStartDate);
    gridStartDate.setHours(0, 0, 0, 0);
    const todayString = formatDateToYMD(new Date());
    const monthSpans = {}, weekSpans = {};

    let currentDate = new Date(gridStartDate);
    for (let i = 0; i < 30; i++) {
        const monthYear = currentDate.toLocaleDateString('nl-NL', { month: 'long', year: 'numeric' });
        const week = getWeekNumber(currentDate);
        if (!monthSpans[monthYear]) monthSpans[monthYear] = 0;
        monthSpans[monthYear]++;
        const weekKey = `Wk ${week}`;
        if (!weekSpans[weekKey]) weekSpans[weekKey] = 0;
        weekSpans[weekKey]++;
        currentDate.setDate(currentDate.getDate() + 1);
    }

    Object.entries(monthSpans).forEach(([month, span], index) => {
        const cell = document.createElement('div');
        cell.className = 'grid-header month-header';
        cell.textContent = month.charAt(0).toUpperCase() + month.slice(1);
        cell.style.gridColumn = `${Object.values(monthSpans).slice(0, index).reduce((a, b) => a + b, 0) + 2} / span ${span}`;
        cell.style.gridRow = 1;
        grid.appendChild(cell);
    });

    Object.entries(weekSpans).forEach(([week, span], index) => {
        const cell = document.createElement('div');
        cell.className = 'grid-header week-header';
        cell.textContent = week;
        cell.style.gridColumn = `${Object.values(weekSpans).slice(0, index).reduce((a, b) => a + b, 0) + 2} / span ${span}`;
        cell.style.gridRow = 2;
        grid.appendChild(cell);
    });
    
    currentDate = new Date(gridStartDate);
    for (let i = 0; i < 30; i++) {
        const cell = document.createElement('div');
        cell.className = 'grid-header day-header';
        cell.innerHTML = `${currentDate.getDate()}<br>${currentDate.toLocaleDateString('nl-NL', { weekday: 'short' })}`;
        if (formatDateToYMD(currentDate) === todayString) cell.classList.add('bg-indigo-200');
        cell.style.gridColumn = i + 2;
        cell.style.gridRow = 3;
        grid.appendChild(cell);
        currentDate.setDate(currentDate.getDate() + 1);
    }

    state.machines.forEach((machine, machineIndex) => {
        const machineLabel = document.createElement('div');
        machineLabel.className = 'machine-label';
        machineLabel.textContent = machine.name;
        machineLabel.style.gridRow = machineIndex + 4;
        machineLabel.style.gridColumn = 1;
        grid.appendChild(machineLabel);
        let cellDate = new Date(gridStartDate);
        for (let i = 0; i < 30; i++) {
            const dayCell = document.createElement('div');
            dayCell.className = 'grid-cell';
            if ([0, 6].includes(cellDate.getDay())) dayCell.classList.add('weekend');
            if (formatDateToYMD(cellDate) === todayString) dayCell.classList.add('today');
            dayCell.dataset.date = formatDateToYMD(cellDate);
            dayCell.dataset.machine = machine.name;
            dayCell.style.gridRow = machineIndex + 4;
            dayCell.style.gridColumn = i + 2;
            grid.appendChild(dayCell);
            cellDate.setDate(cellDate.getDate() + 1);
        }
    });

    const spanningBlocks = calculateSpanningBlocks(scheduleInfo, gridStartDate);

    spanningBlocks.forEach(blockInfo => {
        const originalPart = findPart(blockInfo.partId);
        if (!originalPart) return;
        const order = state.orders.find(o => o.parts.some(p => p.id === blockInfo.partId));
        if (!order) return;
        const orderBlock = document.createElement('div');
        orderBlock.draggable = true;
        orderBlock.dataset.partId = originalPart.id;
        let sum = 0;
        for (let i = 0; i < order.id.length; i++) {
            sum += order.id.charCodeAt(i);
        }
        const colorIndex = (sum % 5) + 1;
        const materiaalKlasse = originalPart.materiaalStatus !== 'Beschikbaar' ? 'materiaal-ontbreekt' : '';
        const isConflict = conflicts.has(originalPart.id);
        const urgentKlasse = order.isUrgent ? 'urgent-block' : '';
        const deadlineMissedClass = deadlineInfo.get(order.id) ? 'deadline-missed-block' : '';
        const conflictKlasse = isConflict ? 'order-conflict' : `color-${colorIndex}`;
        orderBlock.className = `order-block ${materiaalKlasse} ${conflictKlasse} ${urgentKlasse} ${deadlineMissedClass}`;
        const machine = state.machines.find(m => m.name === originalPart.machine);
        const usesRobot = machine && machine.hasRobot && originalPart.shift > 8;
        let shiftText;
        switch (originalPart.shift) {
            case 12: shiftText = 'Nacht (12u)'; break;
            case 16: shiftText = 'Dag+Nacht (16u)'; break;
            case 24: shiftText = 'Continu (24u)'; break;
            default: shiftText = 'Dag (8u)';
        }
        let title = `${originalPart.id} - ${originalPart.onderdeelNaam}\nAantal: ${originalPart.aantal} st\nShift: ${shiftText} ${usesRobot ? '(met Robot)' : ''}\nTotale duur: ${getPartDuration(originalPart).toFixed(1)} uur\nKlant: ${order.klant}`;
        if (isConflict) {
            title += `\n\nCONFLICT MET: ${conflicts.get(originalPart.id).join(', ')}`;
        }
        orderBlock.title = title;
        const blockContent = `<span>${usesRobot ? '🤖 ' : ''}${originalPart.id.substring(4)}</span>`;
        orderBlock.innerHTML = blockContent;
        orderBlock.style.gridRow = blockInfo.machineIndex + 4;
        orderBlock.style.gridColumn = `${blockInfo.startColumn} / span ${blockInfo.span}`;
        grid.appendChild(orderBlock);
    });

    planningContainer.innerHTML = grid.outerHTML;
}

// --- PART FORM MANAGEMENT ---
let partCounter = 0;
function createNewPartForm() {
    partCounter++;
    const partDiv = document.createElement('div');
    partDiv.className = 'part-entry grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 items-end border p-4 rounded-md relative';
    partDiv.dataset.partIndex = partCounter;
    partDiv.innerHTML = `
        <div><label for="onderdeel-naam-${partCounter}" class="block text-sm font-medium text-gray-700">Naam Onderdeel</label><input type="text" id="onderdeel-naam-${partCounter}" class="bg-gray-50 part-field mt-1 block w-full rounded-md border-gray-300" data-field="onderdeelNaam" required></div>
        <div><label for="tekening-nummer-${partCounter}" class="block text-sm font-medium text-gray-700">Tekening Nummer</label><input type="text" id="tekening-nummer-${partCounter}" class="bg-gray-50 part-field mt-1 block w-full rounded-md border-gray-300" data-field="tekeningNummer"></div>
        <div><label for="aantal-${partCounter}" class="block text-sm font-medium text-gray-700">Aantal</label><input type="number" id="aantal-${partCounter}" min="1" class="bg-gray-50 part-field mt-1 block w-full rounded-md border-gray-300" data-field="aantal" required></div>
        <div><label for="productietijd-per-stuk-${partCounter}" class="block text-sm font-medium text-gray-700">Prod. (min./stuk)</label><input type="number" id="productietijd-per-stuk-${partCounter}" min="1" step="1" class="bg-gray-50 part-field mt-1 block w-full rounded-md border-gray-300" data-field="productieTijdPerStuk" required></div>
        <div class="flex items-center h-10 col-span-full">
            <input id="materiaal-in-stock-${partCounter}" type="checkbox" class="part-field h-4 w-4 rounded border-gray-300 text-indigo-600" data-field="materiaalInStock">
            <label for="materiaal-in-stock-${partCounter}" class="ml-2 block text-sm text-gray-900">Materiaal in stock</label>
        </div>
        ${partCounter > 1 ? '<button type="button" class="remove-part-btn absolute top-2 right-2 text-red-500 hover:text-red-700">&times;</button>' : ''}
    `;
    partsContainer.appendChild(partDiv);
    partDiv.querySelector('.remove-part-btn')?.addEventListener('click', () => partDiv.remove());
}


// --- EVENT HANDLERS ---
function setupEventListeners() {
    // --- THEMA WISSEL LOGICA ---
    if (themeToggleBtn) {
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
    }

    addOrderForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        const mainOrderId = document.getElementById('order-id').value;
        if (state.orders.some(o => o.id === mainOrderId)) {
            showNotification('Ordernummer bestaat al.', 'error');
            return;
        }
        const newOrder = {
            id: mainOrderId,
            klant: document.getElementById('klant').value,
            klantOrdernr: document.getElementById('klant-ordernummer').value,
            deadline: document.getElementById('deadline').value,
            isUrgent: document.getElementById('is-urgent').checked,
            parts: []
        };
        const partForms = partsContainer.querySelectorAll('.part-entry');
        partForms.forEach((partForm, index) => {
            const partId = `${mainOrderId}-${index + 1}`;
            const productieTijdInMinuten = parseFloat(partForm.querySelector('[data-field="productieTijdPerStuk"]').value);
            const newPart = {
                id: partId,
                onderdeelNaam: partForm.querySelector('[data-field="onderdeelNaam"]').value,
                tekeningNummer: partForm.querySelector('[data-field="tekeningNummer"]').value,
                aantal: parseInt(partForm.querySelector('[data-field="aantal"]').value),
                productieTijdPerStuk: productieTijdInMinuten,
                materiaalStatus: partForm.querySelector('[data-field="materiaalInStock"]').checked ? 'Beschikbaar' : 'Niet Beschikbaar',
                status: 'Nog in te plannen',
                machine: null,
                startDate: null,
                shift: 8,
                totaalUren: (parseInt(partForm.querySelector('[data-field="aantal"]').value) * productieTijdInMinuten) / 60,
            };
            newOrder.parts.push(newPart);
        });
        if (newOrder.parts.length === 0) {
            showNotification("Voeg minstens één onderdeel toe aan de order.", "error");
            return;
        }
        
        showLoadingOverlay();
        try {
            await addOrderOnBackend(newOrder);
            state.orders.push(newOrder);
            renderAll();
            addOrderForm.reset();
            partsContainer.innerHTML = '';
            createNewPartForm();
            document.getElementById('order-id').focus();
            showNotification(`Order ${newOrder.id} succesvol opgeslagen!`, 'success');
        } catch (error) {
            console.error("Fout bij opslaan op server:", error);
            showNotification(`Kon order niet opslaan: ${error.message}`, "error");
        } finally {
            hideLoadingOverlay();
        }
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
        const target = e.target;
        const partId = target.dataset.partId;
        if (!partId) return;

        const part = findPart(partId);
        if (!part) return;

        if (target.classList.contains('machine-select')) {
            part.machine = target.value;
        } else if (target.classList.contains('shift-select')) {
            part.shift = parseInt(target.value);
        } else if (target.classList.contains('start-date-input')) {
            part.startDate = target.value;
        }
        part.status = (part.machine && part.startDate) ? 'Ingepland' : 'Nog in te plannen';

        renderAll();
        debouncedSave(part);
    });

    orderListBody.addEventListener('click', async (e) => {
        const target = e.target;

        if (target.classList.contains('toggle-urgent-btn')) {
            e.stopPropagation();
            const orderId = target.dataset.orderId;
            const order = state.orders.find(o => o.id === orderId);
            if (order) {
                const originalValue = order.isUrgent;
                order.isUrgent = target.checked;
                renderAll();
                showLoadingOverlay();
                try {
                    await updateOrderOnBackend(order.id, order);
                    showNotification(`Spoedstatus voor order ${order.id} opgeslagen!`, 'success');
                } catch (error) {
                    order.isUrgent = originalValue;
                    renderAll();
                    showNotification(`Fout bij opslaan spoedstatus: ${error.message}`, 'error');
                } finally {
                    hideLoadingOverlay();
                }
            }
            return;
        }

        const groupRow = target.closest('.order-group-row');
        if (groupRow && !target.closest('button, input, a')) {
            const orderId = groupRow.dataset.orderId;
            if (state.expandedOrders.has(orderId)) {
                state.expandedOrders.delete(orderId);
            } else {
                state.expandedOrders.add(orderId);
            }
            renderAll();
            saveState();
            return;
        }

        const button = target.closest('button');
        if (button) {
            let partId = button.dataset.partId;
            let orderId = button.dataset.orderId || (findPart(partId) ? state.orders.find(o => o.parts.some(p => p.id === partId))?.id : null);
            let part = partId ? findPart(partId) : null;
            let order = orderId ? state.orders.find(o => o.id === orderId) : null;

            if (button.classList.contains('edit-order-btn')) {
                e.stopPropagation();
                openEditModal(orderId);
                return;
            }

            if (!part || !order) return;

            if (button.classList.contains('delete-btn')) {
                 openConfirmModal(
                    'Onderdeel Verwijderen', 
                    `Weet je zeker dat je onderdeel "${part.id}" wilt verwijderen?`,
                    async () => {
                        const orderContainingPart = state.orders.find(o => o.parts.some(p => p.id === part.id));
                        if (!orderContainingPart) return;
                        
                        showLoadingOverlay();
                        try {
                            const originalParts = [...orderContainingPart.parts];
                            const originalOrders = [...state.orders];

                            orderContainingPart.parts = orderContainingPart.parts.filter(p => p.id !== part.id);

                            if (orderContainingPart.parts.length === 0) {
                                state.orders = state.orders.filter(o => o.id !== orderContainingPart.id);
                                await deleteOrderOnBackend(orderContainingPart.id);
                                showNotification(`Order ${orderContainingPart.id} verwijderd.`, 'success');
                            } else {
                                await updateOrderOnBackend(orderContainingPart.id, orderContainingPart);
                                showNotification(`Onderdeel verwijderd.`, 'success');
                            }
                        } catch(error) {
                             showNotification(`Kon onderdeel niet verwijderen: ${error.message}`, 'error');
                             // Herstel de staat bij een fout
                             state.orders = originalOrders;
                        } finally {
                            renderAll();
                            hideLoadingOverlay();
                        }
                    }
                );
                return;
            }

            if (button.classList.contains('toggle-status-btn')) {
                part.status = part.status === 'Voltooid' ? 'Ingepland' : 'Voltooid';
                renderAll();
                debouncedSave(part);
                return;
            }

            if (button.classList.contains('materiaal-status-btn')) {
                const currentIndex = MATERIAAL_STATUS.indexOf(part.materiaalStatus);
                part.materiaalStatus = MATERIAAL_STATUS[(currentIndex + 1) % MATERIAAL_STATUS.length];
                renderAll();
                debouncedSave(part);
                return;
            }
        }

        const durationCell = target.closest('.duration-cell');
        if (durationCell && !durationCell.querySelector('input')) {
            const partId = durationCell.dataset.partId;
            const part = findPart(partId);
            if (!part) return;

            const originalValue = part.productieTijdPerStuk;
            durationCell.innerHTML = `<input type="number" class="w-16 text-center" value="${originalValue}" />`;
            const input = durationCell.querySelector('input');
            input.focus();
            input.select();

            const saveChange = () => {
                const newValue = parseInt(input.value);
                if (!isNaN(newValue) && newValue >= 0) {
                    part.productieTijdPerStuk = newValue;
                    part.totaalUren = (part.aantal * newValue) / 60;
                    renderAll();
                    debouncedSave(part);
                } else {
                    renderAll();
                }
            };
            input.addEventListener('blur', saveChange);
            input.addEventListener('keydown', (e) => {
                if (e.key === 'Enter') input.blur();
                else if (e.key === 'Escape') renderAll();
            });
        }
    });

    orderListThead.addEventListener('click', (e) => {
        const header = e.target.closest('.sortable-header');
        if (!header) return;
        const key = header.dataset.sortKey;
        if (state.sortKey === key) {
            state.sortOrder = state.sortOrder === 'asc' ? 'desc' : 'asc';
        } else {
            state.sortKey = key;
            state.sortOrder = 'asc';
        }
        renderAll();
    });

    searchKeySelect.addEventListener('change', (e) => {
        state.searchKey = e.target.value;
        renderAll();
    });
    searchInput.addEventListener('keyup', (e) => {
        state.searchTerm = e.target.value;
        renderAll();
    });

    clearDataLink.addEventListener('click', (e) => {
        e.preventDefault();
        actionsDropdownMenu.classList.add('hidden');
        openConfirmModal(
            'Alle Data Wissen',
            'Weet je zeker dat je ALLE orders, klanten en machines wilt verwijderen? Dit kan niet ongedaan worden gemaakt.',
            async () => {
                showLoadingOverlay();
                try {
                    // We moeten nu alle drie de types data verwijderen
                    // Dit vereist mogelijk een nieuwe API-endpoint of meerdere calls
                    await replaceAllBackendData({ orders: [], klanten: [], machines: [] });
                    state.orders = [];
                    state.klanten = [];
                    state.machines = [];
                    renderAll();
                    showNotification('Alle data is gewist.', 'success');
                } catch(error) {
                    showNotification(`Kon data niet wissen: ${error.message}`, 'error');
                } finally {
                    hideLoadingOverlay();
                }
            }
        );
    });

    exportDataLink.addEventListener('click', (e) => {
        e.preventDefault();
        const dataToExport = {
            orders: state.orders,
            klanten: state.klanten,
            machines: state.machines,
            expandedOrders: [...state.expandedOrders],
        };
        const dataStr = JSON.stringify(dataToExport, null, 2);
        const dataBlob = new Blob([dataStr], { type: "application/json" });
        const url = URL.createObjectURL(dataBlob);
        const downloadLink = document.createElement('a');
        const timestamp = new Date().toISOString().slice(0, 10);
        downloadLink.href = url;
        downloadLink.download = `precam-planning-${timestamp}.json`;
        document.body.appendChild(downloadLink);
        downloadLink.click();
        document.body.removeChild(downloadLink);
        URL.revokeObjectURL(url);
        actionsDropdownMenu.classList.add('hidden');
        showNotification('Export gestart!');
    });

    importDataLink.addEventListener('click', (e) => {
        e.preventDefault();
        importFileInput.click();
        actionsDropdownMenu.classList.add('hidden');
    });

    importFileInput.addEventListener('change', (e) => {
        const file = e.target.files[0];
        if (!file) return;
        const reader = new FileReader();
        reader.onload = (event) => {
            try {
                const importedData = JSON.parse(event.target.result);
                if (!importedData.orders || !importedData.klanten || !importedData.machines) {
                    throw new Error("Bestand heeft niet de juiste structuur.");
                }

                openConfirmModal(
                    'Data Importeren',
                    'Weet je zeker dat je deze data wilt importeren? Alle huidige data wordt overschreven!',
                    async () => {
                        showLoadingOverlay();
                        try {
                            // Deze functie moet worden uitgebreid om ook klanten en machines te importeren
                            await replaceAllBackendData(importedData);
                            
                            state.orders = importedData.orders || [];
                            state.klanten = importedData.klanten || [];
                            state.machines = importedData.machines || [];
                            state.expandedOrders = new Set(importedData.expandedOrders || []);
                            
                            renderAll();
                            showNotification('Data succesvol geïmporteerd!', 'success');
                        } catch (error) {
                            showNotification(`Fout bij importeren: ${error.message}`, 'error');
                        } finally {
                            hideLoadingOverlay();
                        }
                    }
                );

            } catch (error) {
                showNotification(`Fout bij importeren: ${error.message}`, 'error');
            } finally {
                e.target.value = null;
            }
        };
        reader.readAsText(file);
    });

    prevWeekBtn.addEventListener('click', () => {
        const newStartDate = new Date(state.planningStartDate);
        newStartDate.setDate(newStartDate.getDate() - 7);
        state.planningStartDate = newStartDate;
        state.machineLoadWeek = null;
        renderAll();
        planningContainer.scrollLeft = 0;
    });
    nextWeekBtn.addEventListener('click', () => {
        const newStartDate = new Date(state.planningStartDate);
        newStartDate.setDate(newStartDate.getDate() + 7);
        state.planningStartDate = newStartDate;
        state.machineLoadWeek = null;
        renderAll();
        planningContainer.scrollLeft = 0;
    });
    todayBtn.addEventListener('click', () => {
        let today = new Date();
        today.setHours(0, 0, 0, 0);
        const dayOfWeek = today.getDay();
        const diff = today.getDate() - dayOfWeek + (dayOfWeek === 0 ? -6 : 1);
        state.planningStartDate = new Date(today.setDate(diff)); 
        state.machineLoadWeek = null;
        renderAll();
    });

    fullscreenBtn.addEventListener('click', () => {
        if (!document.fullscreenElement) {
            document.documentElement.requestFullscreen().catch(err => {
                showNotification(`Kon volledig scherm niet activeren: ${err.message}`, 'error');
            });
        } else {
            if (document.exitFullscreen) {
                document.exitFullscreen();
            }
        }
    });
    document.addEventListener('fullscreenchange', () => {
        if (document.fullscreenElement) {
            fullscreenText.textContent = 'Verlaat Volledig Scherm';
            fullscreenIconEnter.classList.add('hidden');
            fullscreenIconExit.classList.remove('hidden');
        } else {
            fullscreenText.textContent = 'Volledig Scherm';
            fullscreenIconEnter.classList.remove('hidden');
            fullscreenIconExit.classList.add('hidden');
        }
    });

    actionsDropdownBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        actionsDropdownMenu.classList.toggle('hidden');
    });

    window.addEventListener('click', (e) => {
        if (actionsDropdownMenu && !document.getElementById('actions-dropdown-container').contains(e.target)) {
            actionsDropdownMenu.classList.add('hidden');
        }
    });

    newOrderHeader.addEventListener('click', () => {
        state.isOrderFormCollapsed = !state.isOrderFormCollapsed;
        applyUiState();
        saveState();
    });

    showLoadBtn.addEventListener('click', () => {
        state.isLoadModalVisible = true;
        const machineLoadInfo = calculateMachineLoad(buildScheduleAndDetectConflicts(), state.planningStartDate);
        renderMachineLoad(machineLoadInfo);
    });

    closeLoadModalBtn.addEventListener('click', () => {
        state.isLoadModalVisible = false;
        renderMachineLoad({});
    });

    machineLoadModal.addEventListener('click', (e) => {
        if (e.target.id === 'machine-load-modal') {
            state.isLoadModalVisible = false;
            renderMachineLoad({});
        }
    });

    prevLoadWeekBtn.addEventListener('click', () => {
        const machineLoadInfo = calculateMachineLoad(buildScheduleAndDetectConflicts(), state.planningStartDate);
        const availableWeeks = Object.keys(machineLoadInfo).sort((a, b) => a - b);
        const currentIndex = availableWeeks.indexOf(String(state.machineLoadWeek));
        if (currentIndex > 0) {
            state.machineLoadWeek = parseInt(availableWeeks[currentIndex - 1]);
            renderMachineLoad(machineLoadInfo);
        }
    });

    nextLoadWeekBtn.addEventListener('click', () => {
        const machineLoadInfo = calculateMachineLoad(buildScheduleAndDetectConflicts(), state.planningStartDate);
        const availableWeeks = Object.keys(machineLoadInfo).sort((a, b) => a - b);
        const currentIndex = availableWeeks.indexOf(String(state.machineLoadWeek));
        if (currentIndex < availableWeeks.length - 1) {
            state.machineLoadWeek = parseInt(availableWeeks[currentIndex + 1]);
            renderMachineLoad(machineLoadInfo);
        }
    });

    manageCustomersBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        renderCustomerModalList();
        customerModal.classList.remove('hidden');
    });

    manageMachinesBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        renderMachineModalList();
        machineModal.classList.remove('hidden');
    });

    closeCustomerModalBtn.addEventListener('click', () => customerModal.classList.add('hidden'));
    closeMachineModalBtn.addEventListener('click', () => machineModal.classList.add('hidden'));

    customerModal.addEventListener('click', (e) => {
        if (e.target.id === 'customer-modal') customerModal.classList.add('hidden');
    });
    machineModal.addEventListener('click', (e) => {
        if (e.target.id === 'machine-modal') machineModal.classList.add('hidden');
    });

    addCustomerForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        const newName = newCustomerNameInput.value.trim();
        if (newName && !state.klanten.find(k => k.toLowerCase() === newName.toLowerCase())) {
            showLoadingOverlay();
            try {
                const response = await fetch(`${API_URL}/klanten`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ naam: newName })
                });
                if (!response.ok) throw new Error('Serverfout');
                
                state.klanten.push(newName);
                state.klanten.sort();
                newCustomerNameInput.value = '';
                renderCustomerModalList();
                renderCustomerDropdown();
                showNotification(`Klant "${newName}" toegevoegd!`, 'success');
            } catch (error) {
                showNotification("Kon klant niet opslaan op server.", "error");
            } finally {
                hideLoadingOverlay();
            }
        } else {
            showNotification("Klantnaam is leeg of bestaat al.", "error");
        }
    });

    addMachineForm.addEventListener('submit', async (e) => {
		e.preventDefault();
		const newName = newMachineNameInput.value.trim();
		if (newName && !state.machines.find(m => m.name.toLowerCase() === newName.toLowerCase())) {
			const newMachine = { name: newName, hasRobot: newMachineHasRobotCheckbox.checked };
            showLoadingOverlay();
            try {
                const response = await fetch(`${API_URL}/machines`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(newMachine)
                });
                if (!response.ok) throw new Error('Serverfout');

                state.machines.push(newMachine);
                newMachineNameInput.value = '';
                newMachineHasRobotCheckbox.checked = false;
                renderMachineModalList();
                renderAll();
                showNotification(`Machine "${newName}" toegevoegd!`, 'success');
            } catch (error) {
                showNotification("Kon machine niet opslaan op server.", "error");
            } finally {
                hideLoadingOverlay();
            }
		} else {
			showNotification("Machinenaam is leeg of bestaat al.", "error");
		}
	});

    customerListUl.addEventListener('click', (e) => {
        if (e.target.classList.contains('delete-customer-btn')) {
            const klantToDelete = e.target.dataset.klant;
            openConfirmModal(
                'Klant Verwijderen',
                `Weet je zeker dat je klant "${klantToDelete}" wilt verwijderen?`,
                async () => {
                    showLoadingOverlay();
                    try {
                        const encodedName = encodeURIComponent(klantToDelete);
                        const response = await fetch(`${API_URL}/klanten/${encodedName}`, { method: 'DELETE' });
                        if (!response.ok) throw new Error('Serverfout');

                        state.klanten = state.klanten.filter(k => k !== klantToDelete);
                        renderCustomerModalList();
                        renderCustomerDropdown();
                        showNotification(`Klant "${klantToDelete}" verwijderd.`, 'success');
                    } catch (error) {
                        showNotification("Kon klant niet verwijderen van server.", "error");
                    } finally {
                        hideLoadingOverlay();
                    }
                }
            );
        }
    });

    machineListUl.addEventListener('click', (e) => {
        if (e.target.classList.contains('delete-machine-btn')) {
            const machineToDelete = e.target.dataset.machineName;
            openConfirmModal(
                'Machine Verwijderen',
                `Weet je zeker dat je machine "${machineToDelete}" wilt verwijderen?`,
                async () => {
                    showLoadingOverlay();
                    try {
                        const encodedName = encodeURIComponent(machineToDelete);
                        const response = await fetch(`${API_URL}/machines/${encodedName}`, { method: 'DELETE' });
                        if (!response.ok) throw new Error('Serverfout');

                        state.machines = state.machines.filter(m => m.name !== machineToDelete);
                        renderMachineModalList();
                        renderAll();
                        showNotification(`Machine "${machineToDelete}" verwijderd.`, 'success');
                    } catch (error) {
                        showNotification("Kon machine niet verwijderen van server.", "error");
                    } finally {
                        hideLoadingOverlay();
                    }
                }
            );
        }
    });

    cancelEditBtn.addEventListener('click', () => {
        editOrderModal.classList.add('hidden');
    });

    editOrderForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        
        const originalOrderId = e.target.dataset.editingOrderId;
        const orderToUpdate = state.orders.find(o => o.id === originalOrderId);

        if (!orderToUpdate) {
            showNotification("Kon de te bewerken order niet vinden.", "error");
            return;
        }

        const updatedOrderData = JSON.parse(JSON.stringify(orderToUpdate));

        const newOrderId = document.getElementById('edit-order-id').value;
        updatedOrderData.id = newOrderId;
        updatedOrderData.klant = document.getElementById('edit-klant').value;
        updatedOrderData.klantOrdernr = document.getElementById('edit-klant-ordernummer').value;
        updatedOrderData.deadline = document.getElementById('edit-deadline').value;
        
        const partForms = editPartsContainer.querySelectorAll('.edit-part-entry');
        partForms.forEach(partForm => {
            const originalPartId = partForm.dataset.partId;
            const partToUpdate = updatedOrderData.parts.find(p => p.id === originalPartId);

            if (partToUpdate) {
                const newAantal = parseInt(partForm.querySelector('[data-field="aantal"]').value);
                const newProdTijd = parseFloat(partForm.querySelector('[data-field="productieTijdPerStuk"]').value);
                
                partToUpdate.onderdeelNaam = partForm.querySelector('[data-field="onderdeelNaam"]').value;
                partToUpdate.tekeningNummer = partForm.querySelector('[data-field="tekeningNummer"]').value;
                partToUpdate.aantal = newAantal;
                partToUpdate.productieTijdPerStuk = newProdTijd;
                partToUpdate.totaalUren = (newAantal * newProdTijd) / 60;

                if (originalOrderId !== newOrderId) {
                    const partIndex = originalPartId.split('-').pop();
                    partToUpdate.id = `${newOrderId}-${partIndex}`;
                }
            }
        });

        showLoadingOverlay();
        try {
            await updateOrderOnBackend(originalOrderId, updatedOrderData);

            const orderIndex = state.orders.findIndex(o => o.id === originalOrderId);
            if (orderIndex !== -1) {
                state.orders[orderIndex] = updatedOrderData;
            }

            editOrderModal.classList.add('hidden');
            renderAll();
            showNotification(`Order ${newOrderId} succesvol opgeslagen!`, 'success');

        } catch (error) {
            showNotification(`Kon wijzigingen niet opslaan: ${error.message}`, 'error');
        } finally {
            hideLoadingOverlay();
        }
    });

    let lastDragOverCell = null;
    planningContainer.addEventListener('dragstart', (e) => {
        if (e.target.classList.contains('order-block')) {
            e.dataTransfer.setData('text/plain', e.target.dataset.partId);
            e.dataTransfer.effectAllowed = 'move';
            setTimeout(() => e.target.classList.add('dragging'), 0);
        }
    });
    planningContainer.addEventListener('dragover', (e) => {
        e.preventDefault();
        const targetCell = e.target.closest('.grid-cell');
        if (targetCell) {
            if (lastDragOverCell && lastDragOverCell !== targetCell) {
                lastDragOverCell.classList.remove('drag-over');
            }
            targetCell.classList.add('drag-over');
            lastDragOverCell = targetCell;
        }
    });
    planningContainer.addEventListener('dragleave', (e) => {
        if (lastDragOverCell) {
            lastDragOverCell.classList.remove('drag-over');
            lastDragOverCell = null;
        }
    });
    planningContainer.addEventListener('drop', async (e) => {
        e.preventDefault();
        if (lastDragOverCell) {
            lastDragOverCell.classList.remove('drag-over');
            lastDragOverCell = null;
        }
        const partId = e.dataTransfer.getData('text/plain');
        const targetCell = e.target.closest('.grid-cell');
        if (partId && targetCell) {
            const part = findPart(partId);
            const newDate = targetCell.dataset.date;
            const newMachine = targetCell.dataset.machine;
            if (part && newDate && newMachine) {
                part.startDate = newDate;
                part.machine = newMachine;
                const machineInfo = state.machines.find(m => m.name === newMachine);
                if (part.shift === 24 && !machineInfo.hasRobot) {
                    part.shift = 8;
                    showNotification("Shift is teruggezet naar Dag (8u) omdat de nieuwe machine geen robot heeft.", "error");
                }
                if (part.shift === 16 && !machineInfo.name.includes('DMU')) {
                    part.shift = 8;
                    showNotification("Shift is teruggezet naar Dag (8u) omdat de nieuwe machine geen DMU is.", "error");
                }
                renderAll();
                const order = state.orders.find(o => o.parts.some(p => p.id === partId));
                if (order) {
                    showLoadingOverlay();
                    try {
                        await updateOrderOnBackend(order.id, order);
                        showNotification(`Order ${order.id} verplaatst en opgeslagen!`, 'success');
                    } catch (error) {
                        showNotification(`Synchronisatiefout: ${error.message}`, 'error');
                    } finally {
                        hideLoadingOverlay();
                    }
                }
            }
        }
    });
    planningContainer.addEventListener('dragend', (e) => {
        if (e.target.classList.contains('order-block')) {
            e.target.classList.remove('dragging');
        }
    });
}

function findPart(partId) {
    for (const order of state.orders) {
        const foundPart = order.parts.find(p => p.id === partId);
        if (foundPart) return foundPart;
    }
    return null;
}

function openEditModal(orderId) {
    const order = state.orders.find(o => o.id === orderId);
    if (!order) {
        showNotification("Order niet gevonden.", "error");
        return;
    }
    editOrderForm.dataset.editingOrderId = orderId;
    document.getElementById('edit-order-id').value = order.id;
    document.getElementById('edit-klant').value = order.klant;
    document.getElementById('edit-klant-ordernummer').value = order.klantOrdernr;
    document.getElementById('edit-deadline').value = order.deadline;
    editPartsContainer.innerHTML = '';
    order.parts.forEach(part => {
        const partDiv = document.createElement('div');
        partDiv.className = 'edit-part-entry grid grid-cols-1 md:grid-cols-4 gap-4 items-center border p-2 rounded-md';
        partDiv.dataset.partId = part.id;
        partDiv.innerHTML = `
            <div><label class="block text-xs font-medium text-gray-500">Naam</label><input type="text" class="bg-white mt-1 block w-full rounded-md border-gray-300 text-sm" data-field="onderdeelNaam" value="${part.onderdeelNaam}" required></div>
            <div><label class="block text-xs font-medium text-gray-500">Tekening Nr.</label><input type="text" class="bg-white mt-1 block w-full rounded-md border-gray-300 text-sm" data-field="tekeningNummer" value="${part.tekeningNummer}"></div>
            <div><label class="block text-xs font-medium text-gray-500">Aantal</label><input type="number" class="bg-white mt-1 block w-full rounded-md border-gray-300 text-sm" data-field="aantal" value="${part.aantal}" required></div>
            <div><label class="block text-xs font-medium text-gray-500">Prod. (min/st)</label><input type="number" class="bg-white mt-1 block w-full rounded-md border-gray-300 text-sm" data-field="productieTijdPerStuk" value="${part.productieTijdPerStuk}" required></div>
        `;
        editPartsContainer.appendChild(partDiv);
    });
    
    editOrderModal.classList.remove('hidden');
}

function calculateMachineLoad(scheduleInfo, gridStartDate) {
    const { schedule } = scheduleInfo;
    const loadData = {};
    const getMachineWeeklyCapacity = (machine) => {
        if (machine.hasRobot) return 7 * 24;
        if (machine.name.includes('DMU')) return 7 * 16;
        return 5 * 8;
    };
    for (let i = 0; i < 30; i++) {
        const d = new Date(gridStartDate);
        d.setDate(gridStartDate.getDate() + i);
        const week = getWeekNumber(d);
        if (!loadData[week]) {
            loadData[week] = {};
            state.machines.forEach(m => {
                loadData[week][m.name] = {
                    scheduled: 0,
                    capacity: getMachineWeeklyCapacity(m)
                };
            });
        }
    }
    for (const machineName in schedule) {
        for (const dateString in schedule[machineName]) {
            const d = new Date(dateString + 'T00:00:00');
            const week = getWeekNumber(d);
            const daySchedule = schedule[machineName][dateString];
            if (loadData[week] && loadData[week][machineName]) {
                 loadData[week][machineName].scheduled += daySchedule.totalHours;
            }
        }
    }
    return loadData;
}

function renderMachineLoad(loadData) {
    if (state.isLoadModalVisible) {
        machineLoadModal.classList.remove('hidden');
    } else {
        machineLoadModal.classList.add('hidden');
        return;
    }
    const currentWeek = state.machineLoadWeek;
    if (!currentWeek || !loadData[currentWeek]) {
        loadWeekContent.innerHTML = '<p class="text-center text-gray-500 text-sm">Geen data om te tonen voor deze week.</p>';
        loadWeekTitle.textContent = 'Machinebelasting';
        prevLoadWeekBtn.disabled = true;
        nextLoadWeekBtn.disabled = true;
        return;
    }
    loadWeekTitle.textContent = `Machinebelasting Week ${currentWeek}`;
    loadWeekContent.innerHTML = '';
    
    const availableWeeks = Object.keys(loadData).filter(w => w !== 'NaN').sort((a,b) => a - b);
    const currentIndex = availableWeeks.indexOf(String(currentWeek));
    prevLoadWeekBtn.disabled = currentIndex <= 0;
    nextLoadWeekBtn.disabled = currentIndex >= availableWeeks.length - 1;
    state.machines.sort((a,b) => a.name.localeCompare(b.name)).forEach(machine => {
        const data = loadData[currentWeek][machine.name];
        const scheduled = Math.round(data.scheduled);
        const capacity = data.capacity;
        const percentage = capacity > 0 ? (scheduled / capacity) * 100 : 0;
        const displayPercentage = Math.min(percentage, 100);
        const isOverbooked = scheduled > capacity;
        let barColor = 'bg-green-500';
        if (percentage > 85) barColor = 'bg-yellow-500';
        if (isOverbooked) barColor = 'bg-red-500';
        
        const machineDiv = document.createElement('div');
        machineDiv.innerHTML = `
            <div class="flex justify-between items-center mb-1">
                <span class="font-medium text-sm text-gray-800">${machine.name}</span>
                <span class="text-xs font-semibold ${isOverbooked ? 'text-red-600' : 'text-gray-500'}">${scheduled}u / ${capacity}u</span>
            </div>
            <div class="w-full bg-gray-200 rounded-full h-4 overflow-hidden">
                <div class="${barColor} h-4 rounded-full" style="width: ${displayPercentage}%"></div>
            </div>
            <p class="text-right text-xs font-bold ${isOverbooked ? 'text-red-600' : 'text-gray-700'} mt-1">${Math.round(percentage)}%${isOverbooked ? ' (Overbelast!)' : ''}</p>
        `;
        loadWeekContent.appendChild(machineDiv);
    });
}

// --- MODAL LOGICA ---
let onConfirmCallback = null;

function openConfirmModal(title, text, onConfirm) {
    deleteConfirmTitle.textContent = title;
    deleteConfirmText.textContent = text;
    onConfirmCallback = onConfirm;
    confirmDeleteModal.classList.remove('hidden');
}

function closeConfirmModal() {
    confirmDeleteModal.classList.add('hidden');
    onConfirmCallback = null;
}

// --- INITIALISATIE ---
document.addEventListener('DOMContentLoaded', async () => {
    initializeDOMElements();
    
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
        const [ordersRes, klantenRes, machinesRes] = await Promise.all([
            fetch(`${API_URL}/orders`),
            fetch(`${API_URL}/klanten`),
            fetch(`${API_URL}/machines`)
        ]);

        if (!ordersRes.ok || !klantenRes.ok || !machinesRes.ok) {
            throw new Error('Kon initiële data niet laden van de server.');
        }

        state.orders = await ordersRes.json();
        state.klanten = await klantenRes.json();
        state.machines = await machinesRes.json();
        
        setupEventListeners();
        
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
        
    } catch (error) {
        console.error("Fout bij ophalen van data:", error);
        showNotification("Kon niet verbinden met de backend server.", "error");
    } finally {
        hideLoadingOverlay();
    }
});