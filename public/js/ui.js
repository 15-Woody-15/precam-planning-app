// js/ui.js

import { state, findPart, findBatch, getPlannableItems } from './state.js';
import * as utils from './utils.js';
import * as absences from './absences.js';
import * as schedule from './schedule.js';
import { MATERIAL_STATUS } from './constants.js';

// --- DOM ELEMENTEN & GLOBALE VARIABELEN ---
export const domElements = {};
let partCounter = 0;
let activePartFormElement = null;
let absenceStartDate = null;
let absenceEndDate = null;
let currentCalendarDate = new Date();
let confirmCallback = () => {};

export function initializeDOMElements() {
    const ids = [
        'add-order-form', 'order-list', 'planning-container', 'parts-container',
        'customer-select', 'edit-customer-select', 'customer-modal', 'customer-list',
        'machine-modal', 'machine-list', 'edit-order-modal', 'edit-parts-container',
        'machine-load-modal', 'load-week-content', 'load-week-title', 'prev-load-week-btn',
        'next-load-week-btn', 'confirm-delete-modal', 'delete-confirm-title', 'delete-confirm-text',
        'confirm-delete-btn', 'cancel-delete-btn', 'delete-order-btn-in-modal',
        'new-order-modal', 'search-input', 'search-key', 'add-part-btn',
        'show-new-order-modal-btn', 'close-new-order-modal-btn', 'add-customer-form',
        'new-customer-name', 'close-customer-modal-btn', 'manage-customers-btn', 'manage-machines-btn',
        'close-machine-modal-btn', 'add-machine-form', 'new-machine-name', 'new-machine-has-robot',
        'edit-order-form', 'cancel-edit-btn', 'save-order-btn', 'add-part-to-edit-btn',
        'edit-order-id', 'edit-customer-order-nr', 'edit-deadline',
        'show-load-btn', 'add-absence-btn', 'close-load-modal-btn', 'actions-dropdown-btn', 'actions-dropdown-menu',
        'import-data-link', 'export-data-link', 'clear-data-link', 'import-file-input',
        'today-btn', 'prev-week-btn', 'next-week-btn', 'fullscreen-btn', 'fullscreen-text', 'loading-overlay',
        'absence-modal', 'add-absence-form', 'absence-reason', 'close-manage-absences-btn',
        'absence-calendar-container', 'selected-absence-dates', 'save-absence-btn',
        'cancel-absence-btn', 'manage-absences-btn', 'manage-absences-modal', 'absence-list',
        'batch-splitter-modal', 'cancel-batches-btn', 'total-quantity-display', 'remaining-quantity-display',
        'batch-list-container', 'add-batch-row-btn', 'batch-validation-msg', 'save-batches-btn',
        'order-details-modal', 'close-order-details-btn', 'details-order-id', 'order-details-content'
    ];
    ids.forEach(id => {
        const camelCaseId = id.replace(/-([a-z])/g, g => g[1].toUpperCase());
        domElements[camelCaseId] = document.getElementById(id);
    });
    domElements.orderListThead = document.querySelector('#order-table thead');
}


// --- HOOFD RENDER FUNCTie ---
export function renderAll() {
    const scheduleInfo = schedule.buildScheduleAndDetectConflicts();
    const machineLoadInfo = schedule.calculateMachineLoad(scheduleInfo, state.planningStartDate);
    if (state.machineLoadWeek === null) {
        const firstWeek = utils.getWeekNumber(state.planningStartDate);
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
     if (!domElements.customerSelect || !domElements.editCustomerSelect) return;
     domElements.customerSelect.innerHTML = '<option value="">Choose a customer...</option>';
     domElements.editCustomerSelect.innerHTML = '';
     [...state.customers].sort().forEach(customer => {
         const option = document.createElement('option');
         option.value = customer;
         option.textContent = customer;
         domElements.customerSelect.appendChild(option);
         domElements.editCustomerSelect.appendChild(option.cloneNode(true));
     });
}

// --- DETAIL RENDER FUNCTIES ---
export function renderOrderList({ conflicts, partScheduleInfo, deadlineInfo }) {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const oneWeekFromNow = new Date();
    oneWeekFromNow.setDate(today.getDate() + 7);

    const filteredOrders = state.orders.filter(order => {
        if (!state.searchTerm) return true;
        const term = state.searchTerm.toLowerCase();
        if(['id', 'customer', 'customerOrderNr'].includes(state.searchKey)){
            return (order[state.searchKey] || '').toString().toLowerCase().includes(term);
        }
        return order.parts.some(part => {
            if ((part.partName || '').toString().toLowerCase().includes(term) || (part.drawingNumber || '').toString().toLowerCase().includes(term)) {
                return true;
            }
            if (part.batches) {
                return part.batches.some(batch => (batch.batchId || '').toString().toLowerCase().includes(term));
            }
            return false;
        });
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

    domElements.orderList.innerHTML = '';

    if (sortedOrders.length === 0) {
        domElements.orderListThead.classList.add('hidden');
        const noOrdersRow = document.createElement('tr');
        noOrdersRow.innerHTML = `<td colspan="10" class="text-center py-10 px-4 text-gray-500"><h3 class="text-lg font-semibold">Geen orders gevonden</h3><p class="mt-1">Klik op "Add New Order" om je eerste order aan te maken.</p></td>`;
        domElements.orderList.appendChild(noOrdersRow);
        return; 
    }
    
    domElements.orderListThead.classList.remove('hidden');

    document.querySelectorAll('th.sortable-header').forEach(th => {
        let currentText = th.textContent.replace(' ▲', '').replace(' ▼', '');
        if (th.dataset.sortKey === state.sortKey) {
            th.textContent = currentText + (state.sortOrder === 'asc' ? ' ▲' : ' ▼');
        } else {
            th.textContent = currentText;
        }
    });

    const conflictIcon = `<svg class="inline-block h-5 w-5 text-red-500" title="Conflict detected" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor"><path fill-rule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.21 3.031-1.742 3.031H4.42c-1.532 0-2.492-1.697-1.742-3.031l5.58-9.92zM10 13a1 1 0 110-2 1 1 0 010 2zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clip-rule="evenodd" /></svg>`;
    const delayedIcon = `<svg class="inline-block h-5 w-5 text-yellow-500" title="One or more parts have a delayed start" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor"><path fill-rule="evenodd" d="M8.485 2.495c.673-1.167 2.357-1.167 3.03 0l6.28 10.875c.673 1.167-.17 2.625-1.516 2.625H3.72c-1.347 0-2.189-1.458-1.515-2.625L8.485 2.495zM10 5a.75.75 0 01.75.75v3.5a.75.75 0 01-1.5 0v-3.5A.75.75 0 0110 5zm0 9a1 1 0 100-2 1 1 0 000 2z" clip-rule="evenodd" /></svg>`;
    const deadlineMissedIcon = `<svg class="inline-block h-5 w-5 text-red-600" title="Deadline will be missed!" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor"><path fill-rule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm.75-13a.75.75 0 00-1.5 0v5c0 .414.336.75.75.75h4a.75.75 0 000-1.5H10.75V5z" clip-rule="evenodd" /></svg>`;
    
    sortedOrders.forEach(order => {
        const groupTr = document.createElement('tr');
        groupTr.className = `order-group-row ${order.isUrgent ? 'urgent' : ''} cursor-pointer`;
        groupTr.dataset.orderId = order.id;
        
        const plannableItemsForOrder = order.parts.flatMap(p => (p.batches && p.batches.length > 0) ? p.batches : [p]);
        const itemIds = plannableItemsForOrder.map(item => item.id || item.batchId);
        const orderHasConflict = itemIds.some(id => conflicts.has(id));
        const totalOrderHours = plannableItemsForOrder.reduce((sum, item) => sum + (item.totalHours || 0), 0);
        const orderHasDelayedParts = itemIds.some(id => partScheduleInfo.get(id)?.isDelayed);
        const willMissDeadline = deadlineInfo.get(order.id);
        const deadlineDate = new Date(order.deadline + 'T00:00:00');
        const deadlineText = deadlineDate.toLocaleDateString('en-GB');
        const overallStatus = utils.getOverallOrderStatus(order);

        let deadlineSpan = `<span>${deadlineText}</span>`;
        const isUpcomingInNext7Days = deadlineDate >= today && deadlineDate <= oneWeekFromNow;
        if (willMissDeadline) {
            deadlineSpan = `<span class="bg-red-500 text-white px-2 py-1 rounded-full font-bold">${deadlineText}</span>`;
        } else if (isUpcomingInNext7Days) {
            deadlineSpan = `<span class="bg-yellow-200 text-yellow-900 px-2 py-1 rounded-full font-semibold">${deadlineText}</span>`;
        } else if (deadlineDate < today && overallStatus !== 'Completed') {
            deadlineSpan = `<span class="bg-red-200 text-red-900 px-2 py-1 rounded-full font-semibold">${deadlineText}</span>`;
        }
        
        let overallStatusBadge = '';
        switch(overallStatus) {
            case 'Completed': overallStatusBadge = `<span class="status-badge status-com">Completed</span>`; break;
            case 'In Production': overallStatusBadge = `<span class="status-badge status-inp">In Production</span>`; break;
            case 'To Be Planned': overallStatusBadge = `<span class="status-badge status-tbp">To Be Planned</span>`; break;
        }

        groupTr.innerHTML = `
             <td class="px-3 py-3 whitespace-nowrap" title="Customer Order No: ${order.customerOrderNr || ''}">
                <div class="flex items-center">
                    <input type="checkbox" title="Urgent Order" class="toggle-urgent-btn h-4 w-4 rounded border-gray-300 text-indigo-600 mr-3" data-order-id="${order.id}" ${order.isUrgent ? 'checked' : ''}>
                    ${order.isUrgent ? '<span class="mr-2" title="Urgent Order">🔥</span>' : ''}
                    ${willMissDeadline ? `<div class="mr-2">${deadlineMissedIcon}</div>` : ''}
                    ${orderHasConflict ? `<div class="mr-2">${conflictIcon}</div>` : ''}
                    ${orderHasDelayedParts ? `<div class="mr-2">${delayedIcon}</div>` : ''}
                    <div><span class="font-bold">${order.id}</span><span class="font-normal text-gray-600"> (${order.customer})</span></div>
                </div>
            </td>
            <td class="px-3 py-3 text-sm font-semibold">${totalOrderHours.toFixed(1)} hrs</td>
            <td colspan="2"></td>
            <td class="px-3 py-3 text-center">${deadlineSpan}</td>
            <td class="px-3 py-3" colspan="4">${overallStatusBadge}</td>
            <td class="px-3 py-3 text-right actions-cell">
                 <div class="flex justify-end items-center gap-4">
                    ${overallStatus === 'Completed' ? `<button class="archive-btn text-sm bg-green-600 hover:bg-green-700 text-white font-semibold py-1 px-3 rounded-md" data-order-id="${order.id}">Archive</button>` : ''}
                    <button class="comment-toggle-btn text-sm text-gray-500 hover:text-gray-800" data-order-id="${order.id}" title="Comment">💬</button>
                    <button class="edit-order-btn text-sm text-blue-600 hover:underline font-semibold" data-order-id="${order.id}">Edit</button>
                 </div>
            </td>
        `;
        domElements.orderList.appendChild(groupTr);
        
        const commentRowTr = document.createElement('tr');
        commentRowTr.className = 'comment-row hidden';
        commentRowTr.dataset.orderId = order.id;
        commentRowTr.innerHTML = `<td colspan="10" class="p-0"><div class="p-2 bg-gray-50 dark:bg-gray-800"><textarea class="comment-input w-full p-2 text-sm bg-white dark:bg-gray-700 border rounded-md" data-order-id="${order.id}" placeholder="Add a comment...">${order.comment || ''}</textarea></div></td>`;
        domElements.orderList.appendChild(commentRowTr);
    });
}

/**
 * Opent de order detail modal en vult deze met de informatie van de gekozen order.
 * @param {string} orderId De ID van de te tonen order.
 */
export function openOrderDetailsModal(orderId) {
    const order = state.orders.find(o => o.id === orderId);
    if (!order) {
        utils.showNotification('Order niet gevonden.', 'error');
        return;
    }

    domElements.detailsOrderId.textContent = order.id;
    renderOrderDetails(order);
    domElements.orderDetailsModal.classList.remove('hidden');
    domElements.orderDetailsModal.classList.remove('modal-minimized');
}

/**
 * Rendert de details (onderdelen en batches) van een specifieke order in de modal.
 * @param {object} order Het volledige order-object.
 */
function renderOrderDetails(order) {
    const container = domElements.orderDetailsContent;
    container.innerHTML = '';

    const scheduleInfo = schedule.buildScheduleAndDetectConflicts();
    
    const table = document.createElement('table');
    table.className = 'min-w-full divide-y divide-gray-200 dark:divide-gray-700';
    
    table.innerHTML = `
        <thead class="bg-gray-50 dark:bg-gray-700">
            <tr>
                <th class="px-3 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider w-1/4">Onderdeel / Batch</th>
                <th class="px-3 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Info & Stuktijd</th>
                <th class="px-3 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                <th class="px-3 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Machine</th>
                <th class="px-3 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Shift</th>
                <th class="px-3 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Startdatum</th>
                <th class="px-3 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Acties</th>
            </tr>
        </thead>
        <tbody class="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
        </tbody>
    `;

    const tbody = table.querySelector('tbody');

    order.parts.forEach(part => {
        const plannableItemsForPart = (part.batches && part.batches.length > 0) ? part.batches : [part];
        
        plannableItemsForPart.forEach(item => {
            const tr = document.createElement('tr');
            const itemId = item.batchId || item.id;
            const dataAttribute = item.batchId ? `data-batch-id="${item.batchId}"` : `data-part-id="${item.id}"`;
            
            tr.dataset.itemId = itemId;
            if (item.status === 'To Be Planned' || !item.status) {
                tr.draggable = true;
                tr.classList.add('draggable-row', 'cursor-grab');
            }

            const postProcessingIcon = part.needsPostProcessing ? `<span class="ml-2" title="Nabehandeling nodig: ${part.postProcessingDays} dagen">🛡️</span>` : '';
            const itemName = `${part.partName} ${postProcessingIcon}`;
            const itemSubText = `(${itemId})`;
            
            let statusBadge;
            switch (item.status) {
                case 'Scheduled': statusBadge = `<span class="status-badge status-inp">Scheduled</span>`; break;
                case 'Completed': statusBadge = `<span class="status-badge status-com">Completed</span>`; break;
                default: statusBadge = `<span class="status-badge status-tbp">To Be Planned</span>`;
            }

            const selectedMachine = state.machines.find(m => m.name === item.machine);
            let shiftOptions = `<option value="8" ${item.shift === 8 ? 'selected': ''}>Day (8h)</option>`;
            if (selectedMachine) {
                if (selectedMachine.name.includes('DMU')) shiftOptions += `<option value="16" ${item.shift === 16 ? 'selected': ''}>Day+Night (16h)</option>`;
                if (selectedMachine.hasRobot) shiftOptions += `<option value="24" ${item.shift === 24 ? 'selected': ''}>Continuous (24h)</option>`;
            }

            const info = scheduleInfo.partScheduleInfo.get(itemId) || {};
            const isDelayed = info.isDelayed;
            const startDateInputClass = `start-date-input ${isDelayed ? 'delayed-start' : ''}`;
            const startDateTitle = isDelayed ? `Waarschuwing: Actuele start is ${new Date(info.actualStartDate).toLocaleDateString('en-GB')}` : '';

            let actionButtonsHTML = `<button class="toggle-status-btn text-green-600 hover:text-green-900" ${dataAttribute}>${item.status === 'Completed' ? 'Reopen' : 'Complete'}</button>`;
            if (item.status === 'Scheduled' || item.status === 'In Production') {
                actionButtonsHTML += `<button class="unplan-btn text-gray-500 hover:text-gray-800 ml-4" ${dataAttribute} title="Clear planning">Clear</button>`;
            }
            actionButtonsHTML += `<button class="delete-btn text-red-600 hover:text-red-900 ml-4" ${dataAttribute}>Delete</button>`;

            tr.innerHTML = `
                <td class="px-3 py-4 whitespace-nowrap">
                    <div class="font-medium part-name-display">${itemName}</div>
                    <div class="text-sm part-id-display">${itemSubText}</div>
                </td>
                <td class="px-3 py-4 whitespace-nowrap duration-cell cursor-pointer" ${dataAttribute}>
                    <div class="text-sm">${item.quantity} pcs</div>
                    <div class="text-xs text-gray-500">${(item.totalHours || 0).toFixed(1)} hrs | ${part.productionTimePerPiece} min/pc</div>
                </td>
                <td class="px-3 py-4 whitespace-nowrap">${statusBadge}</td>
                <td class="px-3 py-4 whitespace-nowrap"><select class="machine-select" ${dataAttribute}><option value="">Kies...</option>${state.machines.map(m => `<option value="${m.name}" ${item.machine === m.name ? 'selected' : ''}>${m.name}</option>`).join('')}</select></td>
                <td class="px-3 py-4 whitespace-nowrap"><select class="shift-select" ${dataAttribute} ${!item.machine ? 'disabled' : ''}>${shiftOptions}</select></td>
                <td class="px-3 py-4 whitespace-nowrap"><input type="date" class="${startDateInputClass}" ${dataAttribute} value="${item.startDate || ''}" title="${startDateTitle}"></td>
                <td class="px-3 py-4 whitespace-nowrap text-sm font-medium"><div class="flex items-center">${actionButtonsHTML}</div></td>
            `;
            tbody.appendChild(tr);
        });
    });

    container.appendChild(table);
}

function calculateSpanningBlocks(scheduleInfo, gridStartDate) {
    const { schedule } = scheduleInfo;
    const spanningBlocks = [];
    const processedItems = new Set();
    const msPerDay = 1000 * 60 * 60 * 24;
    const machineNameIndexMap = new Map(state.machines.map((m, i) => [m.name, i]));
    
    const itemsToDraw = getPlannableItems()
        .filter(item => item.machine && item.startDate && item.status !== 'Completed');

    const gridEndDate = new Date(gridStartDate);
    gridEndDate.setDate(gridEndDate.getDate() + 21);
    
    itemsToDraw.forEach(item => {
        if (processedItems.has(item.id)) return;
        
        const machineIndex = machineNameIndexMap.get(item.machine);
        if (machineIndex === undefined) return;

        const allDates = Object.keys(schedule[item.machine] || {})
            .filter(dateStr => schedule[item.machine][dateStr].parts.some(p => p.partId === item.id))
            .map(dateStr => new Date(dateStr + 'T00:00:00'))
            .sort((a, b) => a - b);
            
        if (allDates.length === 0) return;
        processedItems.add(item.id);

        if (item.shift === 8 || item.shift === 16) {
            let segmentStart = allDates[0];
            for (let i = 1; i < allDates.length; i++) {
                const diffDays = (allDates[i] - allDates[i - 1]) / msPerDay;
                if (diffDays > 1) { 
                    spanningBlocks.push({ itemId: item.id, machineIndex, start: segmentStart, end: allDates[i - 1] });
                    segmentStart = allDates[i];
                }
            }
            spanningBlocks.push({ itemId: item.id, machineIndex, start: segmentStart, end: allDates[allDates.length - 1] });
        } else {
            spanningBlocks.push({ itemId: item.id, machineIndex, start: allDates[0], end: allDates[allDates.length - 1] });
        }
    });

    return spanningBlocks
        .filter(block => block.end >= gridStartDate && block.start < gridEndDate)
        .map(block => {
            const effectiveStart = block.start < gridStartDate ? gridStartDate : block.start;
            const startColumn = Math.floor((effectiveStart - gridStartDate) / msPerDay) + 2;
            const span = Math.floor((block.end - effectiveStart) / msPerDay) + 1;
            return { ...block, startColumn, span };
        });
}

function renderPlanningGrid(scheduleInfo) {
    const { conflicts, deadlineInfo } = scheduleInfo;
    domElements.planningContainer.innerHTML = '';

    const grid = document.createElement('div');
    grid.className = 'planning-grid';
    const gridStartDate = new Date(state.planningStartDate);
    gridStartDate.setHours(0, 0, 0, 0);
    const todayString = utils.formatDateToYMD(new Date());
    
    const monthSpans = {}, weekSpans = {};
    let currentDate = new Date(gridStartDate);
    for (let i = 0; i < 21; i++) {
        const monthYear = currentDate.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
        const week = utils.getWeekNumber(currentDate);
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
    for (let i = 0; i < 21; i++) {
        const cell = document.createElement('div');
        cell.className = 'grid-header day-header';
        cell.innerHTML = `${currentDate.getDate()}<br>${currentDate.toLocaleDateString('en-US', { weekday: 'short' })}`;
        if (utils.formatDateToYMD(currentDate) === todayString) cell.classList.add('today');
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
        for (let i = 0; i < 21; i++) {
            const dayCell = document.createElement('div');
            dayCell.className = 'grid-cell';
            if ([0, 6].includes(cellDate.getDay())) dayCell.classList.add('weekend');
            const cellDateString = utils.formatDateToYMD(cellDate);
            dayCell.dataset.date = cellDateString;
            dayCell.dataset.machine = machine.name;
            
            for (const absence of state.absences) {
                const startDate = new Date(absence.start);
                startDate.setHours(0, 0, 0, 0);
                const endDate = new Date(absence.end);
                endDate.setHours(23, 59, 59, 999);
                if (cellDate >= startDate && cellDate <= endDate) {
                    dayCell.classList.add('absence-cell');
                    dayCell.title = absence.reason;
                }
            }
            
            dayCell.style.gridRow = machineIndex + 4;
            dayCell.style.gridColumn = i + 2;
            grid.appendChild(dayCell);
            cellDate.setDate(cellDate.getDate() + 1);
        }
    });

    const spanningBlocks = calculateSpanningBlocks(scheduleInfo, gridStartDate);
    const plannableItems = getPlannableItems();

    spanningBlocks.forEach(blockInfo => {
        const item = plannableItems.find(i => i.id === blockInfo.itemId);
        if (!item) return;
        
        const parentPart = findPart(item.parentId || item.id);
        if (!parentPart) return;

        const order = state.orders.find(o => o.id === item.orderId);
        if (!order) return;
        
        const orderBlock = document.createElement('div');
        orderBlock.draggable = true;
        orderBlock.dataset.itemId = item.id;
        
        let sum = 0;
        for (let i = 0; i < order.id.length; i++) sum += order.id.charCodeAt(i);
        const colorIndex = (sum % 5) + 1;

        const materialClass = item.materialStatus !== 'Available' ? 'material-missing' : '';
        const isConflict = conflicts.has(item.id);
        const urgentClass = order.isUrgent ? 'urgent-block' : '';
        const deadlineMissedClass = deadlineInfo.get(order.id) ? 'deadline-missed-block' : '';
        const conflictClass = isConflict ? 'order-conflict' : `color-${colorIndex}`;
        orderBlock.className = `order-block ${materialClass} ${conflictClass} ${urgentClass} ${deadlineMissedClass}`;
        
        const machine = state.machines.find(m => m.name === item.machine);
        const usesRobot = machine && machine.hasRobot && item.shift > 8;
        let shiftText;
        switch (item.shift) {
            case 16: shiftText = 'Day+Night (16h)'; break;
            case 24: shiftText = 'Continuous (24h)'; break;
            default: shiftText = 'Day (8h)';
        }

        let title = `${item.partName} (${item.id})\nQuantity: ${item.quantity} pcs\nShift: ${shiftText} ${usesRobot ? '(with Robot)' : ''}\nTotal duration: ${utils.getPartDuration(item).toFixed(1)} hours\nCustomer: ${order.customer}`;
        if (isConflict) {
            title += `\n\nCONFLICT WITH: ${conflicts.get(item.id).join(', ')}`;
        }
        orderBlock.title = title;
        
        const postProcessingIcon = parentPart.needsPostProcessing 
            ? `<span title="Nabehandeling nodig: ${parentPart.postProcessingDays} dagen">🛡️ </span>` 
            : '';
        
        let blockIdDisplay;
        if (item.parentId) {
            const shortPartId = item.parentId.slice(-5);
            const batchIndex = item.id.substring(item.id.lastIndexOf('-') + 1);
            blockIdDisplay = `${shortPartId} /${batchIndex}`;
        } else {
            blockIdDisplay = item.id.slice(-5);
        }
        
        const blockContent = `<span>${postProcessingIcon}${usesRobot ? '🤖 ' : ''}${blockIdDisplay}</span>`;
        orderBlock.innerHTML = blockContent;
        orderBlock.style.gridRow = blockInfo.machineIndex + 4;
        orderBlock.style.gridColumn = `${blockInfo.startColumn} / span ${blockInfo.span}`;
        grid.appendChild(orderBlock);
    });

    domElements.planningContainer.appendChild(grid);
}

function renderMachineLoad(loadData) {
    if (!domElements.machineLoadModal) return;
    
    if (state.isLoadModalVisible) {
        domElements.machineLoadModal.classList.remove('hidden');
    } else {
        domElements.machineLoadModal.classList.add('hidden');
        return;
    }
    
    const content = domElements.loadWeekContent;
    const title = domElements.loadWeekTitle;
    const prevBtn = domElements.prevLoadWeekBtn;
    const nextBtn = domElements.nextLoadWeekBtn;
    
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

// --- MODAL & FORM FUNCTIES ---
export function createNewPartForm(container, deadline) {
    partCounter++;
    const partDiv = document.createElement('div');
    partDiv.className = 'part-entry grid grid-cols-1 md:grid-cols-4 gap-4 items-end border p-4 rounded-md relative';
    partDiv.dataset.partIndex = partCounter;
    partDiv.classList.add('is-new');

    const defaultBatches = [{ quantity: 1, deadline: deadline || '' }];
    partDiv.dataset.batches = JSON.stringify(defaultBatches);

    partDiv.innerHTML = `
        <div>
            <label for="part-name-${partCounter}" class="block text-sm font-medium text-gray-700">Part Name</label>
            <input type="text" id="part-name-${partCounter}" class="bg-gray-50 part-field mt-1 block w-full rounded-md border-gray-300" data-field="partName" required>
        </div>
        <div>
            <label for="drawing-number-${partCounter}" class="block text-sm font-medium text-gray-700">Drawing Number</label>
            <input type="text" id="drawing-number-${partCounter}" class="bg-gray-50 part-field mt-1 block w-full rounded-md border-gray-300" data-field="drawingNumber">
        </div>
        <div>
            <label for="prod-time-${partCounter}" class="block text-sm font-medium text-gray-700">Prod. (min/pc)</label>
            <input type="number" id="prod-time-${partCounter}" min="0" step="0.01" class="bg-gray-50 part-field mt-1 block w-full rounded-md border-gray-300" data-field="productionTimePerPiece" value="1" required>
        </div>
        <div>
            <label for="total-quantity-${partCounter}" class="block text-sm font-medium text-gray-700">Total Quantity</label>
            <input type="number" id="total-quantity-${partCounter}" min="1" class="bg-gray-50 part-field mt-1 block w-full rounded-md border-gray-300" data-field="totalQuantity" value="1" required>
        </div>
        <div class="flex items-center h-10 col-span-1">
            <button type="button" class="split-part-btn text-sm text-blue-600 hover:underline font-semibold">Batches (1)</button>
        </div>
        <div class="col-span-full grid grid-cols-2 gap-4">
             <div class="flex items-center h-10">
                <input id="material-in-stock-${partCounter}" type="checkbox" class="part-field h-4 w-4 rounded border-gray-300 text-indigo-600" data-field="materialInStock">
                <label for="material-in-stock-${partCounter}" class="ml-2 block text-sm text-gray-900">Materiaal in stock</label>
            </div>
            <div class="flex items-center space-x-4">
                <div class="flex items-center">
                    <input id="needs-post-processing-${partCounter}" type="checkbox" class="part-field h-4 w-4 rounded border-gray-300 text-indigo-600" data-field="needsPostProcessing">
                    <label for="needs-post-processing-${partCounter}" class="ml-2 text-sm font-medium text-gray-900">Nabehandeling</label>
                </div>
                <div id="post-processing-days-container-${partCounter}" class="hidden flex items-center space-x-2">
                    <input type="number" id="post-processing-days-${partCounter}" min="0" class="part-field w-20 rounded-md border-gray-300 text-sm" data-field="postProcessingDays" value="7">
                    <label for="post-processing-days-${partCounter}" class="text-sm text-gray-600">dagen</label>
                </div>
            </div>
        </div>
        <button type="button" class="remove-part-btn absolute top-2 right-2 text-red-500 hover:text-red-700">&times;</button>
    `;
    container.appendChild(partDiv);
    
    const postProcessingCheckbox = partDiv.querySelector(`[data-field="needsPostProcessing"]`);
    const daysContainer = partDiv.querySelector(`#post-processing-days-container-${partCounter}`);
    postProcessingCheckbox.addEventListener('change', (e) => {
        daysContainer.classList.toggle('hidden', !e.target.checked);
    });

    partDiv.querySelector('.remove-part-btn')?.addEventListener('click', () => partDiv.remove());

    // =================== DIT IS DE NIEUWE CODE ===================
    // Zoek het 'total quantity'-inputveld dat we net hebben aangemaakt
    const totalQuantityInput = partDiv.querySelector('[data-field="totalQuantity"]');
    
    // Voeg een listener toe die de onderliggende data synchroniseert wanneer je typt
    totalQuantityInput.addEventListener('input', (e) => {
        const newQuantity = parseInt(e.target.value, 10) || 0;
        
        try {
            const batchesData = JSON.parse(partDiv.dataset.batches);
            
            // Als het een simpel onderdeel is met maar één batch, pas de hoeveelheid aan
            if (batchesData.length === 1) {
                batchesData[0].quantity = newQuantity;
            }
            
            // Sla de bijgewerkte data weer op in de dataset van het onderdeel
            partDiv.dataset.batches = JSON.stringify(batchesData);
        } catch (err) {
            console.error("Kon batch-data niet bijwerken na wijziging aantal:", err);
        }
    });
    // =============================================================
}

export function openEditModal(orderId) {
    renderCustomerDropdown();
    const order = state.orders.find(o => o.id === orderId);
    if (!order) {
        utils.showNotification("Order not found.", "error");
        return;
    }
    
    domElements.editOrderForm.dataset.editingOrderId = orderId;
    domElements.editOrderId.value = order.id;
    domElements.editCustomerSelect.value = order.customer;
    domElements.editCustomerOrderNr.value = order.customerOrderNr;
    domElements.editDeadline.value = order.deadline;
    
    domElements.editPartsContainer.innerHTML = '';
    order.parts.forEach(part => {
        const partDiv = document.createElement('div');
        partDiv.className = 'part-entry edit-part-entry border p-4 rounded-md'; 
        partDiv.dataset.partId = part.id;
        
        // --- Logica om de velden correct vooraf in te vullen ---
        const isChecked = part.needsPostProcessing ? 'checked' : '';
        const daysValue = part.postProcessingDays || 7;
        const daysContainerClass = part.needsPostProcessing ? '' : 'hidden';

        let partHTML = `
            <div class="grid grid-cols-1 md:grid-cols-5 gap-4 items-center mb-4">
                <div>
                    <label class="block text-xs font-medium text-gray-500">Name</label>
                    <input type="text" class="bg-white mt-1 block w-full rounded-md border-gray-300 text-sm" data-field="partName" value="${part.partName}" required>
                </div>
                <div>
                    <label class="block text-xs font-medium text-gray-500">Drawing No.</label>
                    <input type="text" class="bg-white mt-1 block w-full rounded-md border-gray-300 text-sm" data-field="drawingNumber" value="${part.drawingNumber || ''}">
                </div>
                <div>
                    <label class="block text-xs font-medium text-gray-500">Prod. (min/pc)</label>
                    <input type="number" step="0.01" class="bg-white mt-1 block w-full rounded-md border-gray-300 text-sm" data-field="productionTimePerPiece" value="${part.productionTimePerPiece}" required>
                </div>
        `;

        if (part.batches && part.batches.length > 0) {
            partDiv.dataset.batches = JSON.stringify(part.batches);
            partHTML += `
                <div>
                    <label class="block text-xs font-medium text-gray-500">Total Qty</label>
                    <input type="number" class="bg-white mt-1 block w-full rounded-md border-gray-300 text-sm" data-field="totalQuantity" value="${part.totalQuantity}" required>
                </div>
                <div class="flex items-center h-10">
                    <button type="button" class="split-part-btn text-sm text-blue-600 hover:underline font-semibold">Edit Batches (${part.batches.length})</button>
                </div>
            `;
        } else {
            partHTML += `
                <div>
                    <label class="block text-xs font-medium text-gray-500">Quantity</label>
                    <input type="number" class="bg-white mt-1 block w-full rounded-md border-gray-300 text-sm" data-field="quantity" value="${part.quantity}" required>
                </div>
                <div></div>
            `;
        }
        partHTML += `</div>`; // Einde van de eerste grid div
        
        // --- Toevoeging van de nabehandeling-velden ---
        partHTML += `
            <div class="border-t pt-4 flex items-center space-x-4">
                 <div class="flex items-center">
                    <input type="checkbox" class="h-4 w-4 rounded border-gray-300 text-indigo-600" data-field="needsPostProcessing" ${isChecked}>
                    <label class="ml-2 text-sm font-medium text-gray-900">Nabehandeling nodig?</label>
                </div>
                <div class="post-processing-days-container ${daysContainerClass} flex items-center space-x-2">
                    <input type="number" min="0" class="w-20 rounded-md border-gray-300 text-sm" data-field="postProcessingDays" value="${daysValue}">
                    <label class="text-sm text-gray-600">dagen</label>
                </div>
            </div>
        `;
        
        partDiv.innerHTML = partHTML;
        domElements.editPartsContainer.appendChild(partDiv);
    });
    
    domElements.editOrderModal.classList.remove('hidden');
}

// --- ABSENCE MODAL LOGIC ---
export function openAbsenceModal() {
    absenceStartDate = null;
    absenceEndDate = null;
    currentCalendarDate = new Date();
    domElements.addAbsenceForm.reset();
    renderAbsenceCalendar();
    updateSelectedAbsenceDatesDisplay();
    domElements.absenceModal.classList.remove('hidden');
}

export function closeAbsenceModal() {
    domElements.absenceModal.classList.add('hidden');
}

function renderAbsenceCalendar() {
    const container = domElements.absenceCalendarContainer;
    if(!container) return;
    container.innerHTML = '';

    const year = currentCalendarDate.getFullYear();
    const month = currentCalendarDate.getMonth();

    const header = document.createElement('div');
    header.className = 'flex justify-between items-center mb-2 font-semibold';
    header.innerHTML = `
        <button type="button" id="prev-month-btn" class="p-1 rounded-full hover:bg-gray-200">&lt;</button>
        <span>${currentCalendarDate.toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}</span>
        <button type="button" id="next-month-btn" class="p-1 rounded-full hover:bg-gray-200">&gt;</button>
    `;
    container.appendChild(header);

    const grid = document.createElement('div');
    grid.className = 'calendar-grid';
    
    const weekdays = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
    weekdays.forEach(day => {
        grid.innerHTML += `<div class="font-bold text-xs text-gray-500">${day}</div>`;
    });
    
    const firstDayOfMonth = new Date(year, month, 1).getDay();
    const daysInMonth = new Date(year, month + 1, 0).getDate();

    for (let i = 0; i < firstDayOfMonth; i++) {
        grid.appendChild(document.createElement('div'));
    }

    for (let day = 1; day <= daysInMonth; day++) {
        const dayEl = document.createElement('div');
        dayEl.textContent = day;
        dayEl.className = 'calendar-day';
        dayEl.dataset.date = `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
        
        const currentDate = new Date(dayEl.dataset.date);
        if (absenceStartDate && absenceEndDate && currentDate >= absenceStartDate && currentDate <= absenceEndDate) {
            dayEl.classList.add('in-range');
            if (currentDate.getTime() === absenceStartDate.getTime()) dayEl.classList.add('range-start', 'selected');
            if (currentDate.getTime() === absenceEndDate.getTime()) dayEl.classList.add('range-end', 'selected');
        } else if (absenceStartDate && currentDate.getTime() === absenceStartDate.getTime()) {
            dayEl.classList.add('selected');
        }
        grid.appendChild(dayEl);
    }
    container.appendChild(grid);
}

export function handleCalendarDayClick(e) {
    const target = e.target;
    if (!target.classList.contains('calendar-day') || target.classList.contains('other-month')) return;

    const date = new Date(target.dataset.date + 'T00:00:00');

    if (!absenceStartDate || (absenceStartDate && absenceEndDate)) {
        absenceStartDate = date;
        absenceEndDate = null;
    } else if (date < absenceStartDate) {
        absenceStartDate = date;
    } else {
        absenceEndDate = date;
    }

    renderAbsenceCalendar();
    updateSelectedAbsenceDatesDisplay();
}

function updateSelectedAbsenceDatesDisplay() {
    if (domElements.selectedAbsenceDates) {
        if (absenceStartDate && absenceEndDate) {
            domElements.selectedAbsenceDates.textContent = `${absenceStartDate.toLocaleDateString()} - ${absenceEndDate.toLocaleDateString()}`;
        } else if (absenceStartDate) {
            domElements.selectedAbsenceDates.textContent = absenceStartDate.toLocaleDateString();
        } else {
            domElements.selectedAbsenceDates.textContent = '-';
        }
    }
}

export function getAbsenceDates() {
    return { absenceStartDate, absenceEndDate };
}

export function navigateCalendar(direction) {
    currentCalendarDate.setMonth(currentCalendarDate.getMonth() + direction);
    renderAbsenceCalendar();
}


// --- MODAL CONFIRMATION LOGIC ---
export function openConfirmModal(title, text, onConfirm, buttonText = 'Yes, delete', intent = 'destructive') {
    domElements.deleteConfirmTitle.textContent = title;
    domElements.deleteConfirmText.textContent = text;
    
    const confirmBtn = domElements.confirmDeleteBtn;
    confirmBtn.textContent = buttonText;
    
    confirmBtn.classList.remove('bg-red-600', 'hover:bg-red-700', 'bg-green-600', 'hover:bg-green-700');

    if (intent === 'constructive') {
        confirmBtn.classList.add('bg-green-600', 'hover:bg-green-700');
    } else { 
        confirmBtn.classList.add('bg-red-600', 'hover:bg-red-700');
    }
    
    confirmCallback = onConfirm;
    domElements.confirmDeleteModal.classList.remove('hidden');
}

export function closeConfirmModal() {
    domElements.confirmDeleteModal.classList.add('hidden');
    confirmCallback = () => {};
}

export function handleConfirm() {
    if (typeof confirmCallback === 'function') {
        confirmCallback();
    }
    closeConfirmModal();
}

export function renderAbsenceList() {
    const absenceList = domElements.absenceList;
    if (!absenceList) return;

    const savedAbsences = absences.getAbsences();
    absenceList.innerHTML = '';

    if (savedAbsences.length === 0) {
        absenceList.innerHTML = `<li class="text-center text-gray-500 py-4">Geen afwezigheden gevonden.</li>`;
        return;
    }

    savedAbsences.sort((a,b) => new Date(b.start) - new Date(a.start)).forEach(absence => {
        const li = document.createElement('li');
        li.className = 'flex justify-between items-center p-3 bg-gray-100 rounded-md';
        const deleteButtonHTML = absence.id ? `<button data-absence-id="${absence.id}" class="delete-absence-btn text-red-500 hover:text-red-700 font-bold px-2">&times;</button>` : '';
        li.innerHTML = `
            <div>
                <span class="font-semibold">${absence.reason}</span>
                <span class="text-sm text-gray-600 ml-2">(${utils.formatDateToYMD(absence.start)} t/m ${utils.formatDateToYMD(absence.end)})</span>
            </div>
            ${deleteButtonHTML}
        `;
        absenceList.appendChild(li);
    });
}

export function openManageAbsencesModal() {
    renderAbsenceList();
    domElements.manageAbsencesModal.classList.remove('hidden');
}

export function renderCustomerModalList() {
    const list = domElements.customerList;
    if (!list) return;
    list.innerHTML = '';
    state.customers.forEach(customer => {
        const li = document.createElement('li');
        li.className = 'flex justify-between items-center p-2 bg-gray-50';
        li.innerHTML = `
            <span>${customer}</span>
            <button data-customer="${customer}" class="delete-customer-btn text-red-500 hover:text-red-700">&times;</button>
        `;
        list.appendChild(li);
    });
}

export function renderMachineModalList() {
    const list = domElements.machineList;
    if (!list) return;
    list.innerHTML = '';
    state.machines.forEach(machine => {
        const li = document.createElement('li');
        li.className = 'flex justify-between items-center p-2 bg-gray-50';
        li.innerHTML = `
            <span>${machine.name} ${machine.hasRobot ? '🤖' : ''}</span>
            <button data-machine-name="${machine.name}" class="delete-machine-btn text-red-500 hover:text-red-700">&times;</button>
        `;
        list.appendChild(li);
    });
}

export function openBatchSplitterModal(partFormEl) {
    activePartFormElement = partFormEl;
    const totalQuantity = parseInt(partFormEl.querySelector('[data-field="totalQuantity"]').value) || 0;
    const batches = JSON.parse(partFormEl.dataset.batches || '[]');

    try {
        const underlyingModal = domElements.newOrderModal.classList.contains('hidden') 
            ? domElements.editOrderModal 
            : domElements.newOrderModal;
        const underlyingZIndex = parseInt(window.getComputedStyle(underlyingModal).zIndex, 10);
        
        if (!isNaN(underlyingZIndex)) {
            domElements.batchSplitterModal.style.zIndex = underlyingZIndex + 1;
        } else {
            domElements.batchSplitterModal.style.zIndex = 1050;
        }
    } catch (e) {
        console.error("Kon z-index niet dynamisch instellen:", e);
        domElements.batchSplitterModal.style.zIndex = 1050;
    }

    domElements.totalQuantityDisplay.textContent = totalQuantity;
    
    const totalBatchQty = batches.reduce((sum, b) => sum + parseInt(b.quantity || 0), 0);
    if (batches.length === 0 || totalBatchQty !== totalQuantity) {
         batches.splice(0, batches.length, { quantity: totalQuantity, deadline: '', productionTimePerPiece: 1 });
    }

    renderBatchRows(batches);
    domElements.batchSplitterModal.classList.remove('hidden');
}

export function closeBatchSplitterModal() {
    domElements.batchSplitterModal.classList.add('hidden');
    activePartFormElement = null;
}

export function renderBatchRows(batches) {
    domElements.batchListContainer.innerHTML = '';
    batches.forEach((batch, index) => {
        const batchRow = document.createElement('div');
        batchRow.className = 'batch-row grid grid-cols-3 gap-4 items-center';
        batchRow.innerHTML = `
            <div class="col-span-1">
                <label class="block text-xs text-gray-500">Aantal</label>
                <input type="number" min="1" class="batch-quantity w-full border-gray-300 rounded-md" value="${batch.quantity || 1}">
            </div>
            <div class="col-span-1">
                <label class="block text-xs text-gray-500">Deadline (optioneel)</label>
                <input type="date" class="batch-deadline w-full border-gray-300 rounded-md" value="${batch.deadline || ''}">
            </div>
            <div class="col-span-1 self-end">
                ${batches.length > 1 ? '<button type="button" class="remove-batch-btn text-red-500 hover:text-red-700 text-sm">Verwijder</button>' : ''}
            </div>
        `;
        domElements.batchListContainer.appendChild(batchRow);
    });
    updateBatchValidation();
}

export function updateBatchValidation() {
    const totalQuantity = parseInt(domElements.totalQuantityDisplay.textContent);
    const rows = domElements.batchListContainer.querySelectorAll('.batch-row');
    let sumOfBatches = 0;
    rows.forEach(row => {
        sumOfBatches += parseInt(row.querySelector('.batch-quantity').value) || 0;
    });

    const remaining = totalQuantity - sumOfBatches;
    domElements.remainingQuantityDisplay.textContent = remaining;

    if (remaining < 0) {
        domElements.batchValidationMsg.textContent = `Totaal van batches is ${-remaining} te hoog!`;
        domElements.saveBatchesBtn.disabled = true;
    } else if (remaining > 0) {
        domElements.batchValidationMsg.textContent = `Nog ${remaining} stuks toe te wijzen.`;
        domElements.saveBatchesBtn.disabled = true;
    } else {
        domElements.batchValidationMsg.textContent = '';
        domElements.saveBatchesBtn.disabled = false;
    }
}

export function getActivePartFormElement() {
    return activePartFormElement;
}