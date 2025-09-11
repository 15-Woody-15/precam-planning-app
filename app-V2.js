// --- CONFIGURATION ---
const MATERIAL_STATUS = ['Not Available', 'Ordered', 'Available'];
const STORAGE_KEY = 'planning_orders_v35_en';

// --- DATA STORAGE & STATE ---
const storedState = JSON.parse(localStorage.getItem(STORAGE_KEY)) || {};
let state = {
    orders: [],
    customers: [],
    machines: [],
    isLoadModalVisible: storedState.isLoadModalVisible || false,
    machineLoadWeek: storedState.machineLoadWeek || null,
    expandedOrders: new Set(storedState.expandedOrders || []),
    planningStartDate: new Date(),
    sortKey: 'deadline',
    sortOrder: 'asc',
    searchTerm: '',
    searchKey: 'customerOrderNr',
};

function saveState() {
     localStorage.setItem(STORAGE_KEY, JSON.stringify({
         isLoadModalVisible: state.isLoadModalVisible,
         machineLoadWeek: state.machineLoadWeek,
         expandedOrders: [...state.expandedOrders],
     }));
}

// --- DOM ELEMENTS ---
let addOrderForm, orderListBody, orderListThead, planningContainer, importDataLink, clearDataLink, prevWeekBtn, nextWeekBtn, searchInput, searchKeySelect, partsContainer, addPartBtn, manageCustomersBtn, customerModal, closeCustomerModalBtn, addCustomerForm, customerListUl, newCustomerNameInput, customerSelect, manageMachinesBtn, machineModal, closeMachineModalBtn, addMachineForm, machineListUl, newMachineNameInput, newMachineHasRobotCheckbox, fullscreenBtn, fullscreenText, fullscreenIconEnter, fullscreenIconExit, actionsDropdownBtn, actionsDropdownMenu, exportDataLink, importFileInput, todayBtn, editOrderModal, editOrderForm, editPartsContainer, cancelEditBtn, saveOrderBtn, editCustomerSelect, machineLoadModal, showLoadBtn, prevLoadWeekBtn, nextLoadWeekBtn, loadWeekTitle, loadWeekContent, closeLoadModalBtn, confirmDeleteModal, confirmDeleteBtn, cancelDeleteBtn, deleteConfirmText, deleteConfirmTitle, loadingOverlay, themeToggleBtn, themeToggleDarkIcon, themeToggleLightIcon, addPartToEditBtn, newOrderModal, showNewOrderModalBtn, closeNewOrderModalBtn;

function initializeDOMElements() {
    // Main page elements
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
    customerSelect = document.getElementById('customer');
    fullscreenBtn = document.getElementById('fullscreen-btn');
    fullscreenText = document.getElementById('fullscreen-text');
    fullscreenIconEnter = document.getElementById('fullscreen-icon-enter');
    fullscreenIconExit = document.getElementById('fullscreen-icon-exit');
    actionsDropdownBtn = document.getElementById('actions-dropdown-btn');
    actionsDropdownMenu = document.getElementById('actions-dropdown-menu');
    exportDataLink = document.getElementById('export-data-link');
    importFileInput = document.getElementById('import-file-input');
    todayBtn = document.getElementById('today-btn');
    loadingOverlay = document.getElementById('loading-overlay');
    themeToggleBtn = document.getElementById('theme-toggle-btn');
    themeToggleDarkIcon = document.getElementById('theme-toggle-dark-icon');
    themeToggleLightIcon = document.getElementById('theme-toggle-light-icon');

    // "New Order" Modal elements
    newOrderModal = document.getElementById('new-order-modal');
    showNewOrderModalBtn = document.getElementById('show-new-order-modal-btn');
    closeNewOrderModalBtn = document.getElementById('close-new-order-modal-btn');
    partsContainer = document.getElementById('parts-container');
    addPartBtn = document.getElementById('add-part-btn');

    // "Manage Customers" Modal elements
    manageCustomersBtn = document.getElementById('manage-customers-btn');
    customerModal = document.getElementById('customer-modal');
    closeCustomerModalBtn = document.getElementById('close-customer-modal-btn');
    addCustomerForm = document.getElementById('add-customer-form');
    customerListUl = document.getElementById('customer-list');
    newCustomerNameInput = document.getElementById('new-customer-name');

    // "Manage Machines" Modal elements
    manageMachinesBtn = document.getElementById('manage-machines-btn');
    machineModal = document.getElementById('machine-modal');
    closeMachineModalBtn = document.getElementById('close-machine-modal-btn');
    addMachineForm = document.getElementById('add-machine-form');
    machineListUl = document.getElementById('machine-list');
    newMachineNameInput = document.getElementById('new-machine-name');
    newMachineHasRobotCheckbox = document.getElementById('new-machine-has-robot');

    // "Edit Order" Modal elements
    editOrderModal = document.getElementById('edit-order-modal');
    editOrderForm = document.getElementById('edit-order-form');
    editPartsContainer = document.getElementById('edit-parts-container');
    cancelEditBtn = document.getElementById('cancel-edit-btn');
    saveOrderBtn = document.getElementById('save-order-btn');
    editCustomerSelect = document.getElementById('edit-customer');
    addPartToEditBtn = document.getElementById('add-part-to-edit-btn');
    
    // "Machine Load" Modal elements
    machineLoadModal = document.getElementById('machine-load-modal');
    showLoadBtn = document.getElementById('show-load-btn');
    prevLoadWeekBtn = document.getElementById('prev-load-week-btn');
    nextLoadWeekBtn = document.getElementById('next-load-week-btn');
    loadWeekTitle = document.getElementById('load-week-title');
    loadWeekContent = document.getElementById('load-week-content');
    closeLoadModalBtn = document.getElementById('close-load-modal-btn');

    // "Confirm Delete" Modal elements
    confirmDeleteModal = document.getElementById('confirm-delete-modal');
    confirmDeleteBtn = document.getElementById('confirm-delete-btn');
    cancelDeleteBtn = document.getElementById('cancel-delete-btn');
    deleteConfirmText = document.getElementById('delete-confirm-text');
    deleteConfirmTitle = document.getElementById('delete-confirm-title');
}

// --- HELPER FUNCTIONS ---
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

const getPartDuration = (part) => part.totalHours || 0;

function debounce(func, timeout = 750){
  let timer;
  return (...args) => {
    clearTimeout(timer);
    timer = setTimeout(() => { func.apply(this, args); }, timeout);
  };
}

// --- API FUNCTIONS ---
const API_URL = 'https://precam-planning-api-app.onrender.com/api/orders';

async function replaceAllBackendData(data) {
    const response = await fetch(`${API_URL}/orders/replace`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data.orders),
    });
    if (!response.ok) throw new Error(`Server error while replacing all orders: ${response.statusText}`);
    return;
}

async function addOrderOnBackend(order) {
    const response = await fetch(`${API_URL}/orders`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(order),
    });
    if (!response.ok) throw new Error(`Server error on add: ${response.statusText}`);
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
        throw new Error(`Server error on update: ${response.statusText} (${errorText})`);
    }
    return await response.json();
}

async function deleteOrderOnBackend(orderId) {
    const response = await fetch(`${API_URL}/orders/${orderId}`, {
        method: 'DELETE',
    });
    if (!response.ok) throw new Error(`Server error on delete: ${response.statusText}`);
    return;
}

// --- RENDER FUNCTIONS ---
function renderAll() {
    const scheduleInfo = buildScheduleAndDetectConflicts();
    const machineLoadInfo = calculateMachineLoad(scheduleInfo, state.planningStartDate);
    
    if (state.machineLoadWeek === null) {
        const firstWeek = getWeekNumber(state.planningStartDate);
        if (machineLoadInfo[firstWeek]) {
            state.machineLoadWeek = firstWeek;
        }
    }
    
    renderMachineLoad(machineLoadInfo);
    renderCustomerDropdown();
    renderOrderList(scheduleInfo);
    renderPlanningGrid(scheduleInfo);
}

function renderCustomerDropdown() {
     if (!customerSelect || !editCustomerSelect) return;
     customerSelect.innerHTML = '<option value="">Choose a customer...</option>';
     editCustomerSelect.innerHTML = '';
     [...state.customers].sort().forEach(customer => {
         const option = document.createElement('option');
         option.value = customer;
         option.textContent = customer;
         customerSelect.appendChild(option);
         editCustomerSelect.appendChild(option.cloneNode(true));
     });
}

function renderCustomerModalList() {
     if (!customerListUl) return;
     customerListUl.innerHTML = '';
     [...state.customers].sort().forEach(customer => {
         const li = document.createElement('li');
         li.className = 'flex justify-between items-center p-2 bg-gray-100 rounded';
         li.innerHTML = `<span>${customer}</span><button class="delete-customer-btn text-red-500 hover:text-red-700 font-bold px-2" data-customer="${customer}" aria-label="Delete customer ${customer}">&times;</button>`;
         customerListUl.appendChild(li);
     });
}

function renderMachineModalList() {
     if (!machineListUl) return;
     machineListUl.innerHTML = '';
     [...state.machines].sort((a,b) => a.name.localeCompare(b.name)).forEach(machine => {
         const li = document.createElement('li');
         li.className = 'flex justify-between items-center p-2 bg-gray-100 rounded';
         li.innerHTML = `<span>${machine.name} ${machine.hasRobot ? '🤖' : ''}</span><button class="delete-machine-btn text-red-500 hover:text-red-700 font-bold px-2" data-machine-name="${machine.name}" aria-label="Delete machine ${machine.name}">&times;</button>`;
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
        if(['id', 'customer', 'customerOrderNr'].includes(state.searchKey)){
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

    const conflictIcon = `<svg class="inline-block h-5 w-5 text-red-500" title="Conflict detected" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor"><path fill-rule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.21 3.031-1.742 3.031H4.42c-1.532 0-2.492-1.697-1.742-3.031l5.58-9.92zM10 13a1 1 0 110-2 1 1 0 010 2zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clip-rule="evenodd" /></svg>`;
    const delayedIcon = `<svg class="inline-block h-5 w-5 text-yellow-500" title="One or more parts have a delayed start" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor"><path fill-rule="evenodd" d="M8.485 2.495c.673-1.167 2.357-1.167 3.03 0l6.28 10.875c.673 1.167-.17 2.625-1.516 2.625H3.72c-1.347 0-2.189-1.458-1.515-2.625L8.485 2.495zM10 5a.75.75 0 01.75.75v3.5a.75.75 0 01-1.5 0v-3.5A.75.75 0 0110 5zm0 9a1 1 0 100-2 1 1 0 000 2z" clip-rule="evenodd" /></svg>`;
    const deadlineMissedIcon = `<svg class="inline-block h-5 w-5 text-red-600" title="Deadline will be missed!" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor"><path fill-rule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm.75-13a.75.75 0 00-1.5 0v5c0 .414.336.75.75.75h4a.75.75 0 000-1.5H10.75V5z" clip-rule="evenodd" /></svg>`;
    
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
        const deadlineText = deadlineDate.toLocaleDateString('en-GB');
        let deadlineSpan = `<span>${deadlineText}</span>`;
        const isUpcomingInNext7Days = deadlineDate >= today && deadlineDate <= oneWeekFromNow;

        if (willMissDeadline) {
            deadlineSpan = `<span class="bg-red-500 text-white px-2 py-1 rounded-full font-bold">${deadlineText}</span>`;
        } else if (isUpcomingInNext7Days) {
            deadlineSpan = `<span class="bg-yellow-200 text-yellow-900 px-2 py-1 rounded-full font-semibold">${deadlineText}</span>`;
        } else if (deadlineDate < today && overallStatus !== 'Completed') {
            deadlineSpan = `<span class="bg-red-200 text-red-900 px-2 py-1 rounded-full font-semibold">${deadlineText}</span>`;
        }
        
        const customerOrderNrTitle = order.customerOrderNr ? `title="Customer Order No: ${order.customerOrderNr}"` : '';

        groupTr.innerHTML = `
            <td class="px-3 py-3 whitespace-nowrap">
                <div class="flex items-center">
                    <input type="checkbox" title="Urgent Order" class="toggle-urgent-btn h-4 w-4 rounded border-gray-300 text-indigo-600 mr-3" data-order-id="${order.id}" ${order.isUrgent ? 'checked' : ''}>
                    ${willMissDeadline ? `<div class="mr-2">${deadlineMissedIcon}</div>` : ''}
                    ${orderHasConflict ? `<div class="mr-2">${conflictIcon}</div>` : ''}
                    ${orderHasDelayedParts ? `<div class="mr-2">${delayedIcon}</div>` : ''}
                    <div>
                        <span class="font-bold" ${customerOrderNrTitle}>${order.isUrgent ? '🔥 ' : ''}${order.id}</span>
                        <span class="font-normal text-gray-600">(${order.customer})</span>
                    </div>
                </div>
            </td>
            <td class="px-3 py-3 text-sm font-semibold">${totalOrderHoursFormatted} hrs</td>
            <td></td>
            <td class="px-3 py-3"></td>
            <td class="px-3 py-3 text-center">${deadlineSpan}</td>
            <td class="px-3 py-3" colspan="4">
                ${(() => {
                    let statusClass = '';
                    switch (overallStatus) {
                        case 'To Be Planned': statusClass = 'status-badge status-tbp'; break;
                        case 'In Production': statusClass = 'status-badge status-inp'; break;
                        case 'Completed': statusClass = 'status-badge status-com'; break;
                        default: return `<span>${overallStatus}</span>`;
                    }
                    return `<span class="${statusClass}">${overallStatus}</span>`;
                })()}
                <span class="text-gray-500 text-sm ml-2">(${order.parts.length} parts)</span>
            </td>
            <td class="px-3 py-3 text-right">
                <button class="edit-order-btn text-sm text-blue-600 hover:underline font-semibold" data-order-id="${order.id}">Edit</button>
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
                case 'Scheduled': statusBadge = `<span class="px-2 inline-flex items-center text-xs leading-5 font-semibold rounded-full bg-blue-100 text-blue-800">Scheduled</span>`; break;
                case 'Completed': statusBadge = `<span class="px-2 inline-flex items-center text-xs leading-5 font-semibold rounded-full bg-green-100 text-green-800">Completed</span>`; break;
                default: statusBadge = `<span class="px-2 inline-flex items-center text-xs leading-5 font-semibold rounded-full bg-gray-100 text-gray-800">To Be Planned</span>`;
            }
            let materialBadge;
            switch (part.materialStatus) {
                case 'Available': materialBadge = `<span class="px-2 inline-flex text-xs leading-5 font-semibold rounded-full bg-green-100 text-green-800">Available</span>`; break;
                case 'Ordered': materialBadge = `<span class="px-2 inline-flex text-xs leading-5 font-semibold rounded-full bg-yellow-100 text-yellow-800">Ordered</span>`; break;
                default: materialBadge = `<span class="px-2 inline-flex text-xs leading-5 font-semibold rounded-full bg-red-100 text-red-800">Not Available</span>`;
            }
            const selectedMachine = state.machines.find(m => m.name === part.machine);
            let shiftOptions = `<option value="8" ${part.shift === 8 ? 'selected': ''}>Day (8h)</option>`;
            if (selectedMachine) {
                if (selectedMachine.name.includes('DMU')) {
                    shiftOptions += `<option value="16" ${part.shift === 16 ? 'selected': ''}>Day+Night (16h)</option>`;
                }
                if (selectedMachine.hasRobot) {
                    shiftOptions += `<option value="24" ${part.shift === 24 ? 'selected': ''}>Continuous (24h)</option>`;
                }
            }
            const info = partScheduleInfo.get(part.id) || {};
            const isDelayed = info.isDelayed;
            const startDateInputClass = `bg-gray-50 start-date-input rounded-md border-gray-300 text-sm ${isDelayed ? 'delayed-start' : ''}`;
            const startDateTitle = isDelayed ? `Warning: Actual start is ${new Date(info.actualStartDate).toLocaleDateString('en-GB')}, later than planned.` : '';
            tr.innerHTML = `
                <td class="pl-8 pr-3 py-3 whitespace-nowrap" title="Drawing: ${part.drawingNumber}">
                    <div class="text-sm font-medium text-gray-900">${part.partName}</div>
                    <div class="text-xs text-gray-500">${part.id}</div>
                </td>
                <td class="px-3 py-3 text-sm duration-cell" data-part-id="${part.id}" title="Click to edit. Total: ${Math.round(getPartDuration(part) * 60)}min">${part.productionTimePerPiece} min/pc</td>
                <td class="px-3 py-3 text-sm">${part.quantity} pcs</td>
                <td class="px-3 py-3 whitespace-nowrap text-sm"><button class="material-status-btn" data-part-id="${part.id}">${materialBadge}</button></td>
                <td class="px-3 py-3"></td>
                <td class="px-3 py-3 whitespace-nowrap"><div class="flex items-center">${statusBadge} ${partHasConflict ? `<div class="ml-2">${conflictIcon}</div>` : ''}</div></td>
                <td class="px-3 py-3 whitespace-nowrap text-sm"><select class="bg-gray-50 machine-select rounded-md border-gray-300 text-sm" data-part-id="${part.id}"><option value="">Choose...</option>${state.machines.map(m => `<option value="${m.name}" ${part.machine === m.name ? 'selected' : ''}>${m.name}</option>`).join('')}</select></td>
                <td class="px-3 py-3 whitespace-nowrap text-sm"><select class="bg-gray-50 shift-select rounded-md border-gray-300 text-sm" data-part-id="${part.id}" ${!part.machine ? 'disabled' : ''}>${shiftOptions}</select></td>
                <td class="px-3 py-3 whitespace-nowrap"><input type="date" class="${startDateInputClass}" data-part-id="${part.id}" value="${part.startDate || ''}" title="${startDateTitle}"></td>
                <td class="px-3 py-3 whitespace-nowrap text-sm font-medium">
                    <button class="toggle-status-btn text-green-600 hover:text-green-900" data-part-id="${part.id}">${part.status === 'Completed' ? 'Reopen' : 'Complete'}</button>
                    <button class="delete-btn text-red-600 hover:text-red-900 ml-4" data-part-id="${part.id}">Delete</button>
                </td>
            `;
            orderListBody.appendChild(tr);
        });
    });
}

function getOverallOrderStatus(order) {
     const partStatuses = order.parts.map(p => p.status);
     if (partStatuses.length === 0) return 'Empty';
     if (partStatuses.every(s => s === 'Completed')) return 'Completed';
     if (partStatuses.some(s => s === 'Scheduled')) return 'In Production';
     return 'To Be Planned';
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
        .filter(p => p.machine && p.startDate && p.status !== 'Completed')
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
    const partsToDraw = state.orders.flatMap(o => o.parts.filter(p => p.machine && p.startDate && p.status !== 'Completed'));
    
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
        const monthYear = currentDate.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
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
        cell.innerHTML = `${currentDate.getDate()}<br>${currentDate.toLocaleDateString('en-US', { weekday: 'short' })}`;
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
        const materialClass = originalPart.materialStatus !== 'Available' ? 'material-missing' : '';
        const isConflict = conflicts.has(originalPart.id);
        const urgentClass = order.isUrgent ? 'urgent-block' : '';
        const deadlineMissedClass = deadlineInfo.get(order.id) ? 'deadline-missed-block' : '';
        const conflictClass = isConflict ? 'order-conflict' : `color-${colorIndex}`;
        orderBlock.className = `order-block ${materialClass} ${conflictClass} ${urgentClass} ${deadlineMissedClass}`;
        const machine = state.machines.find(m => m.name === originalPart.machine);
        const usesRobot = machine && machine.hasRobot && originalPart.shift > 8;
        let shiftText;
        switch (originalPart.shift) {
            case 12: shiftText = 'Night (12h)'; break;
            case 16: shiftText = 'Day+Night (16h)'; break;
            case 24: shiftText = 'Continuous (24h)'; break;
            default: shiftText = 'Day (8h)';
        }
        let title = `${originalPart.id} - ${originalPart.partName}\nQuantity: ${originalPart.quantity} pcs\nShift: ${shiftText} ${usesRobot ? '(with Robot)' : ''}\nTotal duration: ${getPartDuration(originalPart).toFixed(1)} hours\nCustomer: ${order.customer}`;
        if (isConflict) {
            title += `\n\nCONFLICT WITH: ${conflicts.get(originalPart.id).join(', ')}`;
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
        <div><label for="part-name-${partCounter}" class="block text-sm font-medium text-gray-700">Part Name</label><input type="text" id="part-name-${partCounter}" class="bg-gray-50 part-field mt-1 block w-full rounded-md border-gray-300" data-field="partName" required></div>
        <div><label for="drawing-number-${partCounter}" class="block text-sm font-medium text-gray-700">Drawing Number</label><input type="text" id="drawing-number-${partCounter}" class="bg-gray-50 part-field mt-1 block w-full rounded-md border-gray-300" data-field="drawingNumber"></div>
        <div><label for="quantity-${partCounter}" class="block text-sm font-medium text-gray-700">Quantity</label><input type="number" id="quantity-${partCounter}" min="1" class="bg-gray-50 part-field mt-1 block w-full rounded-md border-gray-300" data-field="quantity" required></div>
        <div><label for="prod-time-per-piece-${partCounter}" class="block text-sm font-medium text-gray-700">Prod. (min/piece)</label><input type="number" id="prod-time-per-piece-${partCounter}" min="1" step="1" class="bg-gray-50 part-field mt-1 block w-full rounded-md border-gray-300" data-field="productionTimePerPiece" required></div>
        <div class="flex items-center h-10 col-span-full">
            <input id="material-in-stock-${partCounter}" type="checkbox" class="part-field h-4 w-4 rounded border-gray-300 text-indigo-600" data-field="materialInStock">
            <label for="material-in-stock-${partCounter}" class="ml-2 block text-sm text-gray-900">Material in stock</label>
        </div>
        ${partCounter > 1 ? '<button type="button" class="remove-part-btn absolute top-2 right-2 text-red-500 hover:text-red-700">&times;</button>' : ''}
    `;
    partsContainer.appendChild(partDiv);
    partDiv.querySelector('.remove-part-btn')?.addEventListener('click', () => partDiv.remove());
}

// --- EVENT HANDLERS ---
function setupEventListeners() {
    // --- THEME TOGGLE LOGIC ---
    if (themeToggleBtn) {
        const applyTheme = (theme) => {
            if (theme === 'dark') {
                document.documentElement.classList.add('dark');
                if(themeToggleLightIcon) themeToggleLightIcon.classList.remove('hidden');
                if(themeToggleDarkIcon) themeToggleDarkIcon.classList.add('hidden');
            } else {
                document.documentElement.classList.remove('dark');
                if(themeToggleDarkIcon) themeToggleDarkIcon.classList.remove('hidden');
                if(themeToggleLightIcon) themeToggleLightIcon.classList.add('hidden');
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

    // --- "ADD ORDER" MODAL LOGIC ---
    if(showNewOrderModalBtn) showNewOrderModalBtn.addEventListener('click', () => {
        addOrderForm.reset();
        partsContainer.innerHTML = '';
        createNewPartForm(); // Start with one fresh part form
        newOrderModal.classList.remove('hidden');
        document.getElementById('order-id').focus();
    });

    if(closeNewOrderModalBtn) closeNewOrderModalBtn.addEventListener('click', () => {
        newOrderModal.classList.add('hidden');
    });

    if(newOrderModal) newOrderModal.addEventListener('click', (e) => {
        if (e.target.id === 'new-order-modal') {
            newOrderModal.classList.add('hidden');
        }
    });

    if(addOrderForm) addOrderForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        const mainOrderId = document.getElementById('order-id').value;
        if (state.orders.some(o => o.id === mainOrderId)) {
            showNotification('Order number already exists.', 'error');
            return;
        }
        const newOrder = {
            id: mainOrderId,
            customer: document.getElementById('customer').value,
            customerOrderNr: document.getElementById('customer-order-nr').value,
            deadline: document.getElementById('deadline').value,
            isUrgent: document.getElementById('is-urgent').checked,
            parts: []
        };
        const partForms = partsContainer.querySelectorAll('.part-entry');
        partForms.forEach((partForm, index) => {
            const partId = `${mainOrderId}-${index + 1}`;
            const productionTimeInMinutes = parseFloat(partForm.querySelector('[data-field="productionTimePerPiece"]').value);
            const quantity = parseInt(partForm.querySelector('[data-field="quantity"]').value);
            const newPart = {
                id: partId,
                partName: partForm.querySelector('[data-field="partName"]').value,
                drawingNumber: partForm.querySelector('[data-field="drawingNumber"]').value,
                quantity: quantity,
                productionTimePerPiece: productionTimeInMinutes,
                materialStatus: partForm.querySelector('[data-field="materialInStock"]').checked ? 'Available' : 'Not Available',
                status: 'To Be Planned',
                machine: null,
                startDate: null,
                shift: 8,
                totalHours: (quantity * productionTimeInMinutes) / 60,
            };
            newOrder.parts.push(newPart);
        });
        if (newOrder.parts.length === 0) {
            showNotification("Please add at least one part to the order.", "error");
            return;
        }
        
        showLoadingOverlay();
        try {
            await addOrderOnBackend(newOrder);
            state.orders.push(newOrder);
            newOrderModal.classList.add('hidden'); // Close modal on success
            renderAll();
            showNotification(`Order ${newOrder.id} saved successfully!`, 'success');
        } catch (error) {
            console.error("Error saving to server:", error);
            showNotification(`Could not save order: ${error.message}`, "error");
        } finally {
            hideLoadingOverlay();
        }
    });

    if(addPartBtn) addPartBtn.addEventListener('click', createNewPartForm);

    const debouncedSave = debounce(async (part) => {
        const order = state.orders.find(o => o.parts.some(p => p.id === part.id));
        if (order) {
            try {
                await updateOrderOnBackend(order.id, order);
                showNotification(`Changes for order ${order.id} saved!`, 'success');
            } catch (error) {
                showNotification(`Synchronization error: ${error.message}`, 'error');
            }
        }
    }, 750);
    
    if(orderListBody) {
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
            part.status = (part.machine && part.startDate) ? 'Scheduled' : 'To Be Planned';

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
                        showNotification(`Urgent status for order ${order.id} saved!`, 'success');
                    } catch (error) {
                        order.isUrgent = originalValue;
                        renderAll();
                        showNotification(`Error saving urgent status: ${error.message}`, 'error');
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
                        'Delete Part', 
                        `Are you sure you want to delete part "${part.id}"?`,
                        async () => {
                            const orderContainingPart = state.orders.find(o => o.parts.some(p => p.id === part.id));
                            if (!orderContainingPart) return;
                            
                            showLoadingOverlay();
                            try {
                                const originalParts = [...orderContainingPart.parts];
                                orderContainingPart.parts = orderContainingPart.parts.filter(p => p.id !== part.id);

                                if (orderContainingPart.parts.length === 0) {
                                    state.orders = state.orders.filter(o => o.id !== orderContainingPart.id);
                                    await deleteOrderOnBackend(orderContainingPart.id);
                                    showNotification(`Order ${orderContainingPart.id} deleted.`, 'success');
                                } else {
                                    await updateOrderOnBackend(orderContainingPart.id, orderContainingPart);
                                    showNotification(`Part deleted.`, 'success');
                                }
                            } catch(error) {
                                 showNotification(`Could not delete part: ${error.message}`, 'error');
                                 // Restore state on error if needed
                            } finally {
                                renderAll();
                                hideLoadingOverlay();
                            }
                        }
                    );
                    return;
                }

                if (button.classList.contains('toggle-status-btn')) {
                    part.status = part.status === 'Completed' ? 'Scheduled' : 'Completed';
                    renderAll();
                    debouncedSave(part);
                    return;
                }

                if (button.classList.contains('material-status-btn')) {
                    const currentIndex = MATERIAL_STATUS.indexOf(part.materialStatus);
                    part.materialStatus = MATERIAL_STATUS[(currentIndex + 1) % MATERIAL_STATUS.length];
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

                const originalValue = part.productionTimePerPiece;
                durationCell.innerHTML = `<input type="number" class="w-16 text-center" value="${originalValue}" />`;
                const input = durationCell.querySelector('input');
                input.focus();
                input.select();

                const saveChange = () => {
                    const newValue = parseInt(input.value);
                    if (!isNaN(newValue) && newValue >= 0) {
                        part.productionTimePerPiece = newValue;
                        part.totalHours = (part.quantity * newValue) / 60;
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
    }

    if(orderListThead) orderListThead.addEventListener('click', (e) => {
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

    if(searchKeySelect) searchKeySelect.addEventListener('change', (e) => {
        state.searchKey = e.target.value;
        renderAll();
    });
    if(searchInput) searchInput.addEventListener('keyup', (e) => {
        state.searchTerm = e.target.value;
        renderAll();
    });

    if(clearDataLink) clearDataLink.addEventListener('click', (e) => {
        e.preventDefault();
        actionsDropdownMenu.classList.add('hidden');
        openConfirmModal('Clear All Data','Are you sure you want to delete ALL orders, customers, and machines? This cannot be undone.', async () => {
            showLoadingOverlay();
            try {
                await replaceAllBackendData({ orders: [], customers: [], machines: [] });
                state.orders = [];
                state.customers = [];
                state.machines = [];
                renderAll();
                showNotification('All data has been cleared.', 'success');
            } catch(error) {
                showNotification(`Could not clear data: ${error.message}`, 'error');
            } finally {
                hideLoadingOverlay();
            }
        });
    });

    if(exportDataLink) exportDataLink.addEventListener('click', (e) => {
        e.preventDefault();
        const dataToExport = {
            orders: state.orders, customers: state.customers, machines: state.machines, expandedOrders: [...state.expandedOrders],
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
        showNotification('Export started!');
    });

    if(importDataLink) importDataLink.addEventListener('click', (e) => {
        e.preventDefault();
        importFileInput.click();
        actionsDropdownMenu.classList.add('hidden');
    });

    if(importFileInput) importFileInput.addEventListener('change', (e) => {
        const file = e.target.files[0];
        if (!file) return;
        const reader = new FileReader();
        reader.onload = (event) => {
            try {
                const importedData = JSON.parse(event.target.result);
                if (!importedData.orders || !importedData.customers || !importedData.machines) {
                    throw new Error("File does not have the correct structure.");
                }
                openConfirmModal('Import Data', 'Are you sure you want to import this data? All current data will be overwritten!', async () => {
                    showLoadingOverlay();
                    try {
                        await replaceAllBackendData(importedData);
                        state.orders = importedData.orders || [];
                        state.customers = importedData.customers || [];
                        state.machines = importedData.machines || [];
                        state.expandedOrders = new Set(importedData.expandedOrders || []);
                        renderAll();
                        showNotification('Data imported successfully!', 'success');
                    } catch (error) {
                        showNotification(`Error importing data: ${error.message}`, 'error');
                    } finally {
                        hideLoadingOverlay();
                    }
                });
            } catch (error) {
                showNotification(`Error importing data: ${error.message}`, 'error');
            } finally {
                e.target.value = null;
            }
        };
        reader.readAsText(file);
    });

    if(prevWeekBtn) prevWeekBtn.addEventListener('click', () => {
        const newStartDate = new Date(state.planningStartDate);
        newStartDate.setDate(newStartDate.getDate() - 7);
        state.planningStartDate = newStartDate;
        state.machineLoadWeek = null;
        renderAll();
        planningContainer.scrollLeft = 0;
    });

    if(nextWeekBtn) nextWeekBtn.addEventListener('click', () => {
        const newStartDate = new Date(state.planningStartDate);
        newStartDate.setDate(newStartDate.getDate() + 7);
        state.planningStartDate = newStartDate;
        state.machineLoadWeek = null;
        renderAll();
        planningContainer.scrollLeft = 0;
    });

    if(todayBtn) todayBtn.addEventListener('click', () => {
        let today = new Date();
        today.setHours(0, 0, 0, 0);
        const dayOfWeek = today.getDay();
        const diff = today.getDate() - dayOfWeek + (dayOfWeek === 0 ? -6 : 1);
        state.planningStartDate = new Date(today.setDate(diff)); 
        state.machineLoadWeek = null;
        renderAll();
    });

    if(fullscreenBtn) fullscreenBtn.addEventListener('click', () => {
        if (!document.fullscreenElement) {
            document.documentElement.requestFullscreen().catch(err => {
                showNotification(`Could not activate fullscreen: ${err.message}`, 'error');
            });
        } else {
            if (document.exitFullscreen) {
                document.exitFullscreen();
            }
        }
    });

    document.addEventListener('fullscreenchange', () => {
        if (document.fullscreenElement) {
            fullscreenText.textContent = 'Exit Fullscreen';
            fullscreenIconEnter.classList.add('hidden');
            fullscreenIconExit.classList.remove('hidden');
        } else {
            fullscreenText.textContent = 'Fullscreen';
            fullscreenIconEnter.classList.remove('hidden');
            fullscreenIconExit.classList.add('hidden');
        }
    });

    if(actionsDropdownBtn) actionsDropdownBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        actionsDropdownMenu.classList.toggle('hidden');
    });

    window.addEventListener('click', (e) => {
        if (actionsDropdownMenu && !document.getElementById('actions-dropdown-container').contains(e.target)) {
            actionsDropdownMenu.classList.add('hidden');
        }
    });

    if(showLoadBtn) showLoadBtn.addEventListener('click', () => {
        state.isLoadModalVisible = true;
        const machineLoadInfo = calculateMachineLoad(buildScheduleAndDetectConflicts(), state.planningStartDate);
        renderMachineLoad(machineLoadInfo);
    });

    if (closeLoadModalBtn) closeLoadModalBtn.addEventListener('click', () => {
        state.isLoadModalVisible = false;
        renderMachineLoad({});
    });

    if (machineLoadModal) machineLoadModal.addEventListener('click', (e) => {
        if (e.target.id === 'machine-load-modal') {
            state.isLoadModalVisible = false;
            renderMachineLoad({});
        }
    });

    if (prevLoadWeekBtn) prevLoadWeekBtn.addEventListener('click', () => {
        const machineLoadInfo = calculateMachineLoad(buildScheduleAndDetectConflicts(), state.planningStartDate);
        const availableWeeks = Object.keys(machineLoadInfo).sort((a, b) => a - b);
        const currentIndex = availableWeeks.indexOf(String(state.machineLoadWeek));
        if (currentIndex > 0) {
            state.machineLoadWeek = parseInt(availableWeeks[currentIndex - 1]);
            renderMachineLoad(machineLoadInfo);
        }
    });

    if (nextLoadWeekBtn) nextLoadWeekBtn.addEventListener('click', () => {
        const machineLoadInfo = calculateMachineLoad(buildScheduleAndDetectConflicts(), state.planningStartDate);
        const availableWeeks = Object.keys(machineLoadInfo).sort((a, b) => a - b);
        const currentIndex = availableWeeks.indexOf(String(state.machineLoadWeek));
        if (currentIndex < availableWeeks.length - 1) {
            state.machineLoadWeek = parseInt(availableWeeks[currentIndex + 1]);
            renderMachineLoad(machineLoadInfo);
        }
    });

    if (manageCustomersBtn) manageCustomersBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        renderCustomerModalList();
        customerModal.classList.remove('hidden');
    });

    if (manageMachinesBtn) manageMachinesBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        renderMachineModalList();
        machineModal.classList.remove('hidden');
    });

    if (closeCustomerModalBtn) closeCustomerModalBtn.addEventListener('click', () => customerModal.classList.add('hidden'));
    if (closeMachineModalBtn) closeMachineModalBtn.addEventListener('click', () => machineModal.classList.add('hidden'));

    if (customerModal) customerModal.addEventListener('click', (e) => {
        if (e.target.id === 'customer-modal') customerModal.classList.add('hidden');
    });
    if (machineModal) machineModal.addEventListener('click', (e) => {
        if (e.target.id === 'machine-modal') machineModal.classList.add('hidden');
    });

    if (addCustomerForm) addCustomerForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        const newName = newCustomerNameInput.value.trim();
        if (newName && !state.customers.find(c => c.toLowerCase() === newName.toLowerCase())) {
            showLoadingOverlay();
            try {
                const response = await fetch(`${API_URL}/customers`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ name: newName })
                });
                if (!response.ok) throw new Error('Server error');
                
                state.customers.push(newName);
                state.customers.sort();
                newCustomerNameInput.value = '';
                renderCustomerModalList();
                renderCustomerDropdown();
                showNotification(`Customer "${newName}" added!`, 'success');
            } catch (error) {
                showNotification("Could not save customer to server.", "error");
            } finally {
                hideLoadingOverlay();
            }
        } else {
            showNotification("Customer name is empty or already exists.", "error");
        }
    });

    if (addMachineForm) addMachineForm.addEventListener('submit', async (e) => {
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
                if (!response.ok) throw new Error('Server error');

                state.machines.push(newMachine);
                newMachineNameInput.value = '';
                newMachineHasRobotCheckbox.checked = false;
                renderMachineModalList();
                renderAll();
                showNotification(`Machine "${newName}" added!`, 'success');
            } catch (error) {
                showNotification("Could not save machine to server.", "error");
            } finally {
                hideLoadingOverlay();
            }
		} else {
			showNotification("Machine name is empty or already exists.", "error");
		}
	});

    if (customerListUl) customerListUl.addEventListener('click', (e) => {
        if (e.target.classList.contains('delete-customer-btn')) {
            const customerToDelete = e.target.dataset.customer;
            openConfirmModal('Delete Customer', `Are you sure you want to delete customer "${customerToDelete}"?`, async () => {
                showLoadingOverlay();
                try {
                    const encodedName = encodeURIComponent(customerToDelete);
                    const response = await fetch(`${API_URL}/customers/${encodedName}`, { method: 'DELETE' });
                    if (!response.ok) throw new Error('Server error');
                    state.customers = state.customers.filter(c => c !== customerToDelete);
                    renderCustomerModalList();
                    renderCustomerDropdown();
                    showNotification(`Customer "${customerToDelete}" deleted.`, 'success');
                } catch (error) {
                    showNotification("Could not delete customer from server.", "error");
                } finally {
                    hideLoadingOverlay();
                }
            });
        }
    });

    if (machineListUl) machineListUl.addEventListener('click', (e) => {
        if (e.target.classList.contains('delete-machine-btn')) {
            const machineToDelete = e.target.dataset.machineName;
            openConfirmModal('Delete Machine', `Are you sure you want to delete machine "${machineToDelete}"?`, async () => {
                showLoadingOverlay();
                try {
                    const encodedName = encodeURIComponent(machineToDelete);
                    const response = await fetch(`${API_URL}/machines/${encodedName}`, { method: 'DELETE' });
                    if (!response.ok) throw new Error('Server error');
                    state.machines = state.machines.filter(m => m.name !== machineToDelete);
                    renderMachineModalList();
                    renderAll();
                    showNotification(`Machine "${machineToDelete}" deleted.`, 'success');
                } catch (error) {
                    showNotification("Could not delete machine from server.", "error");
                } finally {
                    hideLoadingOverlay();
                }
            });
        }
    });

    if (cancelEditBtn) cancelEditBtn.addEventListener('click', () => {
        editOrderModal.classList.add('hidden');
    });

    if (addPartToEditBtn) addPartToEditBtn.addEventListener('click', () => {
        const orderId = editOrderForm.dataset.editingOrderId;
        if (!orderId) return;

        const partDiv = document.createElement('div');
        partDiv.className = 'edit-part-entry is-new grid grid-cols-1 md:grid-cols-4 gap-4 items-center border-l-4 border-green-400 p-2 rounded-md';
        partDiv.innerHTML = `
            <div><label class="block text-xs font-medium text-gray-500">Name</label><input type="text" class="bg-white mt-1 block w-full rounded-md border-gray-300 text-sm" data-field="partName" placeholder="New part" required></div>
            <div><label class="block text-xs font-medium text-gray-500">Drawing No.</label><input type="text" class="bg-white mt-1 block w-full rounded-md border-gray-300 text-sm" data-field="drawingNumber"></div>
            <div><label class="block text-xs font-medium text-gray-500">Quantity</label><input type="number" class="bg-white mt-1 block w-full rounded-md border-gray-300 text-sm" data-field="quantity" value="1" required></div>
            <div><label class="block text-xs font-medium text-gray-500">Prod. (min/pc)</label><input type="number" class="bg-white mt-1 block w-full rounded-md border-gray-300 text-sm" data-field="productionTimePerPiece" value="1" required></div>
        `;
        editPartsContainer.appendChild(partDiv);
        partDiv.querySelector('input').focus();
    });

    if (editOrderForm) editOrderForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        const originalOrderId = e.target.dataset.editingOrderId;
        const orderToUpdate = state.orders.find(o => o.id === originalOrderId);
        if (!orderToUpdate) {
            showNotification("Could not find the order to edit.", "error");
            return;
        }

        const updatedOrderData = JSON.parse(JSON.stringify(orderToUpdate));
        const newOrderId = document.getElementById('edit-order-id').value;
        updatedOrderData.id = newOrderId;
        updatedOrderData.customer = document.getElementById('edit-customer').value;
        updatedOrderData.customerOrderNr = document.getElementById('edit-customer-order-nr').value;
        updatedOrderData.deadline = document.getElementById('edit-deadline').value;

        let maxPartNumber = 0;
        updatedOrderData.parts.forEach(p => {
            const num = parseInt(p.id.split('-').pop());
            if (num > maxPartNumber) maxPartNumber = num;
        });

        const partForms = editPartsContainer.querySelectorAll('.edit-part-entry');
        partForms.forEach(partForm => {
            const originalPartId = partForm.dataset.partId;
            if (originalPartId) {
                const partToUpdate = updatedOrderData.parts.find(p => p.id === originalPartId);
                if (partToUpdate) {
                    const newQuantity = parseInt(partForm.querySelector('[data-field="quantity"]').value);
                    const newProdTime = parseFloat(partForm.querySelector('[data-field="productionTimePerPiece"]').value);
                    partToUpdate.partName = partForm.querySelector('[data-field="partName"]').value;
                    partToUpdate.drawingNumber = partForm.querySelector('[data-field="drawingNumber"]').value;
                    partToUpdate.quantity = newQuantity;
                    partToUpdate.productionTimePerPiece = newProdTime;
                    partToUpdate.totalHours = (newQuantity * newProdTime) / 60;
                    if (originalOrderId !== newOrderId) {
                        const partIndex = originalPartId.split('-').pop();
                        partToUpdate.id = `${newOrderId}-${partIndex}`;
                    }
                }
            } else if (partForm.classList.contains('is-new')) {
                maxPartNumber++;
                const newPartId = `${newOrderId}-${maxPartNumber}`;
                const newQuantity = parseInt(partForm.querySelector('[data-field="quantity"]').value);
                const newProdTime = parseFloat(partForm.querySelector('[data-field="productionTimePerPiece"]').value);
                const newPart = {
                    id: newPartId,
                    partName: partForm.querySelector('[data-field="partName"]').value,
                    drawingNumber: partForm.querySelector('[data-field="drawingNumber"]').value,
                    quantity: newQuantity,
                    productionTimePerPiece: newProdTime,
                    totalHours: (newQuantity * newProdTime) / 60,
                    materialStatus: 'Not Available',
                    status: 'To Be Planned',
                    machine: null,
                    startDate: null,
                    shift: 8,
                };
                updatedOrderData.parts.push(newPart);
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
            showNotification(`Order ${newOrderId} saved successfully!`, 'success');
        } catch (error) {
            showNotification(`Could not save changes: ${error.message}`, 'error');
        } finally {
            hideLoadingOverlay();
        }
    });

    if(planningContainer) {
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
                        showNotification("Shift was reset to Day (8h) because the new machine does not have a robot.", "error");
                    }
                    if (part.shift === 16 && !machineInfo.name.includes('DMU')) {
                        part.shift = 8;
                        showNotification("Shift was reset to Day (8h) because the new machine is not a DMU.", "error");
                    }
                    renderAll();
                    const order = state.orders.find(o => o.parts.some(p => p.id === partId));
                    if (order) {
                        showLoadingOverlay();
                        try {
                            await updateOrderOnBackend(order.id, order);
                            showNotification(`Order ${order.id} moved and saved!`, 'success');
                        } catch (error) {
                            showNotification(`Synchronization error: ${error.message}`, 'error');
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
        showNotification("Order not found.", "error");
        return;
    }
    
    const form = document.getElementById('edit-order-form');
    const container = document.getElementById('edit-parts-container');
    if (!form || !container) return;

    form.dataset.editingOrderId = orderId;
    document.getElementById('edit-order-id').value = order.id;
    document.getElementById('edit-customer').value = order.customer;
    document.getElementById('edit-customer-order-nr').value = order.customerOrderNr;
    document.getElementById('edit-deadline').value = order.deadline;
    
    container.innerHTML = '';
    order.parts.forEach(part => {
        const partDiv = document.createElement('div');
        partDiv.className = 'edit-part-entry grid grid-cols-1 md:grid-cols-4 gap-4 items-center border p-2 rounded-md';
        partDiv.dataset.partId = part.id;
        partDiv.innerHTML = `
            <div><label class="block text-xs font-medium text-gray-500">Name</label><input type="text" class="bg-white mt-1 block w-full rounded-md border-gray-300 text-sm" data-field="partName" value="${part.partName}" required></div>
            <div><label class="block text-xs font-medium text-gray-500">Drawing No.</label><input type="text" class="bg-white mt-1 block w-full rounded-md border-gray-300 text-sm" data-field="drawingNumber" value="${part.drawingNumber}"></div>
            <div><label class="block text-xs font-medium text-gray-500">Quantity</label><input type="number" class="bg-white mt-1 block w-full rounded-md border-gray-300 text-sm" data-field="quantity" value="${part.quantity}" required></div>
            <div><label class="block text-xs font-medium text-gray-500">Prod. (min/pc)</label><input type="number" class="bg-white mt-1 block w-full rounded-md border-gray-300 text-sm" data-field="productionTimePerPiece" value="${part.productionTimePerPiece}" required></div>
        `;
        container.appendChild(partDiv);
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
    const modal = document.getElementById('machine-load-modal');
    if (!modal) return;
    
    if (state.isLoadModalVisible) {
        modal.classList.remove('hidden');
    } else {
        modal.classList.add('hidden');
        return;
    }
    
    const content = document.getElementById('load-week-content');
    const title = document.getElementById('load-week-title');
    const prevBtn = document.getElementById('prev-load-week-btn');
    const nextBtn = document.getElementById('next-load-week-btn');
    
    if(!content || !title || !prevBtn || !nextBtn) return;

    const currentWeek = state.machineLoadWeek;
    if (!currentWeek || !loadData[currentWeek]) {
        content.innerHTML = '<p class="text-center text-gray-500 text-sm">No data to display for this week.</p>';
        title.textContent = 'Machine Load';
        prevBtn.disabled = true;
        nextBtn.disabled = true;
        return;
    }
    title.textContent = `Machine Load Week ${currentWeek}`;
    content.innerHTML = '';
    
    const availableWeeks = Object.keys(loadData).filter(w => w !== 'NaN').sort((a,b) => a - b);
    const currentIndex = availableWeeks.indexOf(String(currentWeek));
    prevBtn.disabled = currentIndex <= 0;
    nextBtn.disabled = currentIndex >= availableWeeks.length - 1;

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
                <span class="text-xs font-semibold ${isOverbooked ? 'text-red-600' : 'text-gray-500'}">${scheduled}h / ${capacity}h</span>
            </div>
            <div class="w-full bg-gray-200 rounded-full h-4 overflow-hidden">
                <div class="${barColor} h-4 rounded-full" style="width: ${displayPercentage}%"></div>
            </div>
            <p class="text-right text-xs font-bold ${isOverbooked ? 'text-red-600' : 'text-gray-700'} mt-1">${Math.round(percentage)}%${isOverbooked ? ' (Overloaded!)' : ''}</p>
        `;
        content.appendChild(machineDiv);
    });
}

// --- MODAL LOGIC ---
let onConfirmCallback = null;

function openConfirmModal(title, text, onConfirm) {
    const titleEl = document.getElementById('delete-confirm-title');
    const textEl = document.getElementById('delete-confirm-text');
    if (titleEl) titleEl.textContent = title;
    if (textEl) textEl.textContent = text;
    
    onConfirmCallback = onConfirm;
    confirmDeleteModal.classList.remove('hidden');
}

function closeConfirmModal() {
    confirmDeleteModal.classList.add('hidden');
    onConfirmCallback = null;
}

// --- INITIALIZATION ---
document.addEventListener('DOMContentLoaded', async () => {
    initializeDOMElements();
    
    if(confirmDeleteBtn) confirmDeleteBtn.addEventListener('click', () => {
        if (typeof onConfirmCallback === 'function') {
            onConfirmCallback();
        }
        closeConfirmModal();
    });
    if(cancelDeleteBtn) cancelDeleteBtn.addEventListener('click', closeConfirmModal);
    if(confirmDeleteModal) confirmDeleteModal.addEventListener('click', (e) => {
        if (e.target.id === 'confirm-delete-modal') {
            closeConfirmModal();
        }
    });
    
    showLoadingOverlay();
    try {
        const [ordersRes, customersRes, machinesRes] = await Promise.all([
            fetch(`${API_URL}/orders`),
            fetch(`${API_URL}/customers`),
            fetch(`${API_URL}/machines`)
        ]);

        if (!ordersRes.ok || !customersRes.ok || !machinesRes.ok) {
            throw new Error('Could not load initial data from the server.');
        }

        state.orders = await ordersRes.json();
        state.customers = await customersRes.json();
        state.machines = await machinesRes.json();
        
        setupEventListeners();
        
        const today = new Date();
        const dayOfWeek = today.getDay();
        const diff = today.getDate() - dayOfWeek + (dayOfWeek === 0 ? -6 : 1); 
        state.planningStartDate = new Date(today.setDate(diff));
        state.planningStartDate.setHours(0, 0, 0, 0);
        
        const deadlineInput = document.getElementById('deadline');
        if (deadlineInput) {
            const defaultDeadline = new Date();
            defaultDeadline.setDate(defaultDeadline.getDate() + 14);
            deadlineInput.value = defaultDeadline.toISOString().split('T')[0];
        }
        
        // Removed createNewPartForm() from initial load
        renderAll();
        
    } catch (error) {
        console.error("Error fetching data:", error);
        showNotification("Could not connect to the backend server.", "error");
    } finally {
        hideLoadingOverlay();
    }
});