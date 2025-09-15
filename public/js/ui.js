import { state } from './state.js';
import * as utils from './utils.js';
import { findPart } from './state.js';
import * as absences from './absences.js';
import * as schedule from './schedule.js';

// --- DOM ELEMENTEN ---
export const domElements = {};

/**
 * Selecteert alle benodigde DOM-elementen en slaat ze op in het domElements object.
 */
export function initializeDOMElements() {
    const ids = [
        'add-order-form', 'order-list', 'planning-container', 'parts-container',
        'customer-select', 'edit-customer-select', 'customer-modal', 'customer-list',
        'machine-modal', 'machine-list', 'edit-order-modal', 'edit-parts-container',
        'machine-load-modal', 'load-week-content', 'load-week-title', 'prev-load-week-btn',
        'next-load-week-btn', 'confirm-delete-modal', 'delete-confirm-title', 'delete-confirm-text',
        'confirm-delete-btn', 'cancel-delete-btn',
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
        'cancel-absence-btn', 'manage-absences-btn', 'manage-absences-modal', 'absence-list'
    ];
    ids.forEach(id => {
        const camelCaseId = id.replace(/-([a-z])/g, g => g[1].toUpperCase());
        domElements[camelCaseId] = document.getElementById(id);
    });
    domElements.orderListThead = document.querySelector('#order-table thead');
}


// --- HOOFD RENDER FUNCTIE ---
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


// --- DETAIL RENDER FUNCTIES ---
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
export function renderCustomerModalList() {
     if (!domElements.customerList) return;
     domElements.customerList.innerHTML = '';
     [...state.customers].sort().forEach(customer => {
         const li = document.createElement('li');
         li.className = 'flex justify-between items-center p-2 bg-gray-100 rounded';
         li.innerHTML = `<span>${customer}</span><button class="delete-customer-btn text-red-500 hover:text-red-700 font-bold px-2" data-customer="${customer}" aria-label="Delete customer ${customer}">&times;</button>`;
         domElements.customerList.appendChild(li);
     });
}
export function renderMachineModalList() {
     if (!domElements.machineList) return;
     domElements.machineList.innerHTML = '';
     [...state.machines].sort((a,b) => a.name.localeCompare(b.name)).forEach(machine => {
         const li = document.createElement('li');
         li.className = 'flex justify-between items-center p-2 bg-gray-100 rounded';
         li.innerHTML = `<span>${machine.name} ${machine.hasRobot ? '🤖' : ''}</span><button class="delete-machine-btn text-red-500 hover:text-red-700 font-bold px-2" data-machine-name="${machine.name}" aria-label="Delete machine ${machine.name}">&times;</button>`;
         domElements.machineList.appendChild(li);
     });
}
function renderOrderList({conflicts, partScheduleInfo, deadlineInfo}) {
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

    domElements.orderList.innerHTML = '';

    if (sortedOrders.length === 0) {
        domElements.orderListThead.classList.add('hidden');
        const noOrdersRow = document.createElement('tr');
        noOrdersRow.innerHTML = `
            <td colspan="10" class="text-center py-10 px-4 text-gray-500">
                <h3 class="text-lg font-semibold">Geen orders gevonden</h3>
                <p class="mt-1">Klik op "Add New Order" om je eerste order aan te maken.</p>
            </td>
        `;
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
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const oneWeekFromNow = new Date(today);
    oneWeekFromNow.setDate(today.getDate() + 7);
    
    sortedOrders.forEach(order => {
        const groupTr = document.createElement('tr');
        groupTr.className = `order-group-row ${order.isUrgent ? 'urgent' : ''}`;
        groupTr.dataset.orderId = order.id;
        
        const overallStatus = utils.getOverallOrderStatus(order);
        const orderHasConflict = order.parts.some(part => conflicts.has(part.id));
        const totalOrderMinutes = Math.round(order.parts.reduce((sum, part) => sum + utils.getPartDuration(part) * 60, 0));
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
            <td class="px-3 py-3 text-right actions-cell">
                <button class="comment-toggle-btn text-gray-500 hover:text-gray-700 text-sm mr-2" data-order-id="${order.id}" title="Toon opmerkingen">
                    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor" class="w-5 h-5"><path stroke-linecap="round" stroke-linejoin="round" d="M11.25 11.25l.041-.02a.75.75 0 011.063.852l-.708 2.836a.75.75 0 001.063.853l.041-.021M21 12a9 9 0 11-18 0 9 9 0 0118 0zm-9-3.75h.008v.008H12V8.25z" /></svg>
                </button>
                <button class="edit-order-btn text-sm text-blue-600 hover:underline font-semibold" data-order-id="${order.id}">Edit</button>
            </td>
        `;
        domElements.orderList.appendChild(groupTr);

        const commentRow = document.createElement('tr');
        commentRow.className = `comment-row ${!order.comment ? 'hidden' : ''}`;
        commentRow.dataset.orderId = order.id;
        commentRow.innerHTML = `
            <td colspan="10" class="p-4">
                <textarea class="comment-input w-full p-2 border rounded-md" placeholder="Add a comment...">${order.comment || ''}</textarea>
            </td>
        `;
        domElements.orderList.appendChild(commentRow);
        
        if (utils.areAllPartsCompleted(order) && overallStatus !== 'Archived') {
            const actionsCell = groupTr.querySelector('.actions-cell');
            if(actionsCell){
                const archiveBtn = document.createElement('button');
                archiveBtn.className = 'archive-btn bg-green-500 hover:bg-green-600 text-white font-bold py-1 px-2 rounded text-xs mr-2';
                archiveBtn.textContent = 'Archiveren';
                archiveBtn.dataset.orderId = order.id;
                actionsCell.prepend(archiveBtn);
            }
        }
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
                <td class="px-3 py-3 text-sm duration-cell" data-part-id="${part.id}" title="Click to edit. Total: ${Math.round(utils.getPartDuration(part) * 60)}min">${part.productionTimePerPiece} min/pc</td>
                <td class="px-3 py-3 text-sm">${part.quantity} pcs</td>
                <td class="px-3 py-3 whitespace-nowrap text-sm"><button class="material-status-btn" data-part-id="${part.id}">${materialBadge}</button></td>
                <td class="px-3 py-3"></td>
                <td class="px-3 py-3 whitespace-nowrap"><div class="flex items-center">${statusBadge} ${partHasConflict ? `<div class="ml-2">${conflictIcon}</div>` : ''}</div></td>
                <td class="px-3 py-3 whitespace-nowrap text-sm"><select class="bg-gray-50 machine-select rounded-md border-gray-300 text-sm" data-part-id="${part.id}"><option value="">Choose...</option>${state.machines.map(m => `<option value="${m.name}" ${part.machine === m.name ? 'selected' : ''}>${m.name}</option>`).join('')}</select></td>
                <td class="px-3 py-3 whitespace-nowrap text-sm"><select class="bg-gray-50 shift-select rounded-md border-gray-300 text-sm" data-part-id="${part.id}" ${!part.machine ? 'disabled' : ''}>${shiftOptions}</select></td>
                <td class="px-3 py-3 whitespace-nowrap"><input type="date" class="${startDateInputClass}" data-part-id="${part.id}" value="${part.startDate || ''}" title="${startDateTitle}"></td>
                <td class="px-3 py-3 whitespace-nowrap text-sm font-medium">
                    <div class="flex items-center">
                        <button class="toggle-status-btn text-green-600 hover:text-green-900" data-part-id="${part.id}">${part.status === 'Completed' ? 'Reopen' : 'Complete'}</button>
                        <button class="delete-btn text-red-600 hover:text-red-900 ml-4" data-part-id="${part.id}">Delete</button>
                    </div>
                </td>
            `;
            domElements.orderList.appendChild(tr);
        });
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
            dayCell.dataset.date = utils.formatDateToYMD(cellDate);
            dayCell.dataset.machine = machine.name;
            
            const savedAbsences = absences.getAbsences();
            for (const absence of savedAbsences) {
                const startDate = new Date(absence.start + 'T00:00:00');
                const endDate = new Date(absence.end + 'T00:00:00');
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
        let title = `${originalPart.id} - ${originalPart.partName}\nQuantity: ${originalPart.quantity} pcs\nShift: ${shiftText} ${usesRobot ? '(with Robot)' : ''}\nTotal duration: ${utils.getPartDuration(originalPart).toFixed(1)} hours\nCustomer: ${order.customer}`;
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

function calculateSpanningBlocks(scheduleInfo, gridStartDate) {
    const { schedule } = scheduleInfo;
    const spanningBlocks = [];
    const processedParts = new Set();
    const msPerDay = 1000 * 60 * 60 * 24;
    const machineNameIndexMap = new Map(state.machines.map((m, i) => [m.name, i]));
    const partsToDraw = state.orders.flatMap(o => o.parts.filter(p => p.machine && p.startDate && p.status !== 'Completed'));
    const gridEndDate = new Date(gridStartDate);
    gridEndDate.setDate(gridEndDate.getDate() + 21);
    
    partsToDraw.forEach(originalPart => {
        if (processedParts.has(originalPart.id)) return;
        
        const machineIndex = machineNameIndexMap.get(originalPart.machine);
        if (machineIndex === undefined) return;

        const allDates = Object.keys(schedule[originalPart.machine] || {})
            .filter(dateStr => schedule[originalPart.machine][dateStr].parts.some(p => p.partId === originalPart.id))
            .map(dateStr => new Date(dateStr + 'T00:00:00'))
            .sort((a, b) => a - b);
            
        if (allDates.length === 0) return;
        processedParts.add(originalPart.id);

        if (originalPart.shift === 8 || originalPart.shift === 16) {
            let segmentStart = allDates[0];
            for (let i = 1; i < allDates.length; i++) {
                const diffDays = (allDates[i] - allDates[i - 1]) / msPerDay;
                if (diffDays > 1) { 
                    spanningBlocks.push({ partId: originalPart.id, machineIndex, start: segmentStart, end: allDates[i - 1] });
                    segmentStart = allDates[i];
                }
            }
            spanningBlocks.push({ partId: originalPart.id, machineIndex, start: segmentStart, end: allDates[allDates.length - 1] });
        } else { // Continuous shifts
            spanningBlocks.push({ partId: originalPart.id, machineIndex, start: allDates[0], end: allDates[allDates.length - 1] });
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


// --- MODAL & FORM FUNCTIES ---

let partCounter = 0; // <-- HIER TOEGEVOEGD

/**
 * Maakt een nieuw setje inputvelden voor een 'part' in de "Add Order" modal.
 */
export function createNewPartForm() {
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
    domElements.partsContainer.appendChild(partDiv);
    partDiv.querySelector('.remove-part-btn')?.addEventListener('click', () => partDiv.remove());
}

/**
 * Opent de modal om een bestaande order te bewerken en vult deze met de orderdata.
 * @param {string} orderId - De ID van de te bewerken order.
 */
export function openEditModal(orderId) {
    renderCustomerDropdown();
    const order = state.orders.find(o => o.id === orderId);
    if (!order) {
        utils.showNotification("Order not found.", "error");
        return;
    }
    
    // Gebruik nu het domElements object om de velden te vullen
    domElements.editOrderForm.dataset.editingOrderId = orderId;
    domElements.editOrderId.value = order.id;
    domElements.editCustomerSelect.value = order.customer;
    domElements.editCustomerOrderNr.value = order.customerOrderNr;
    domElements.editDeadline.value = order.deadline;
    
    domElements.editPartsContainer.innerHTML = '';
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
        domElements.editPartsContainer.appendChild(partDiv);
    });
    
    domElements.editOrderModal.classList.remove('hidden');
}


// --- ABSENCE MODAL LOGIC ---
let absenceStartDate = null;
let absenceEndDate = null;
let currentCalendarDate = new Date();

/**
 * Opent de modal om een afwezigheid toe te voegen en initialiseert de kalender.
 */
export function openAbsenceModal() {
    absenceStartDate = null;
    absenceEndDate = null;
    currentCalendarDate = new Date();
    domElements.addAbsenceForm.reset();
    renderAbsenceCalendar();
    updateSelectedAbsenceDatesDisplay();
    domElements.absenceModal.classList.remove('hidden');
}

/**
 * Sluit de afwezigheid-modal.
 */
export function closeAbsenceModal() {
    domElements.absenceModal.classList.add('hidden');
}

function renderAbsenceCalendar() {
    const container = domElements.absenceCalendarContainer;
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

/**
 * Verwerkt een klik op een dag in de afwezigheidskalender.
 * @param {Event} e - Het klik-event.
 */
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
    if (absenceStartDate && absenceEndDate) {
        domElements.selectedAbsenceDates.textContent = `${absenceStartDate.toLocaleDateString()} - ${absenceEndDate.toLocaleDateString()}`;
    } else if (absenceStartDate) {
        domElements.selectedAbsenceDates.textContent = absenceStartDate.toLocaleDateString();
    } else {
        domElements.selectedAbsenceDates.textContent = '-';
    }
}

/**
 * Geeft de geselecteerde start- en einddatum terug uit de kalender.
 * @returns {{absenceStartDate: Date, absenceEndDate: Date}}
 */
export function getAbsenceDates() {
    return { absenceStartDate, absenceEndDate };
}

/**
 * Navigeert de kalender een maand vooruit of achteruit.
 * @param {number} direction - -1 voor vorige maand, 1 voor volgende maand.
 */
export function navigateCalendar(direction) {
    currentCalendarDate.setMonth(currentCalendarDate.getMonth() + direction);
    renderAbsenceCalendar();
}


// --- MODAL CONFIRMATION LOGIC ---
let confirmCallback = () => {};

/**
 * Opent een bevestigings-modal met een configureerbare boodschap en knop.
 * @param {string} title - De titel van de modal.
 * @param {string} text - De beschrijvende tekst in de modal.
 * @param {Function} onConfirm - De functie die uitgevoerd moet worden bij bevestiging.
 * @param {string} [buttonText='Yes, delete'] - De tekst op de bevestigingsknop.
 * @param {'destructive'|'constructive'} [intent='destructive'] - De intentie, bepaalt de kleur van de knop.
 */
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

/**
 * Sluit de bevestigings-modal.
 */
export function closeConfirmModal() {
    domElements.confirmDeleteModal.classList.add('hidden');
    confirmCallback = () => {};
}

/**
 * Voert de opgeslagen callback-functie uit en sluit de modal.
 */
export function handleConfirm() {
    if (typeof confirmCallback === 'function') {
        confirmCallback();
    }
    closeConfirmModal();
}

/**
 * Tekent de lijst met afwezigheden in de "Manage Absences" modal.
 */
export function renderAbsenceList() {
    const absenceList = domElements.absenceList;
    if (!absenceList) return;

    const savedAbsences = absences.getAbsences();
    absenceList.innerHTML = ''; // Maak de lijst leeg

    if (savedAbsences.length === 0) {
        absenceList.innerHTML = `<li class="text-center text-gray-500 py-4">Geen afwezigheden gevonden.</li>`;
        return;
    }

    savedAbsences.forEach(absence => {
        const li = document.createElement('li');
        li.className = 'flex justify-between items-center p-3 bg-gray-100 rounded-md';

        // --- START AANPASSING ---
        // Genereer alleen een delete-knop als de afwezigheid een geldige ID heeft.
        const deleteButtonHTML = absence.id
            ? `<button data-absence-id="${absence.id}" class="delete-absence-btn text-red-500 hover:text-red-700 font-bold px-2">&times;</button>`
            : `<span class="px-2" title="Kan niet verwijderen, dit is een oude invoer.">&nbsp;</span>`; // Lege ruimte als er geen ID is
        // --- EINDE AANPASSING ---
        
        // Gebruik de nieuwe variabele in de innerHTML
        li.innerHTML = `
            <div>
                <span class="font-semibold">${absence.reason}</span>
                <span class="text-sm text-gray-600 ml-2">(${absence.start} t/m ${absence.end})</span>
            </div>
            ${deleteButtonHTML}
        `;
        absenceList.appendChild(li);
    });
}

/**
 * Opent de modal om afwezigheden te beheren.
 */
export function openManageAbsencesModal() {
    renderAbsenceList();
    domElements.manageAbsencesModal.classList.remove('hidden');
}