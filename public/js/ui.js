// js/ui.js - ALLERLAATSTE, GECORRIGEERDE VERSIE

import { state, findPart, getPlannableItems } from './state.js';
import * as utils from './utils.js';
import * as absences from './absences.js';
import * as schedule from './schedule.js';
import { MATERIAL_STATUS, MACHINE_COLORS } from './constants.js';
import { renderMachineLoad } from './modals/loadModal.js';

export const domElements = {};

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
        'order-details-modal', 'close-order-details-btn', 'details-order-id', 'order-details-content',
        'trash-can-dropzone', 'notification-container', 'shift-context-menu', 'shift-menu-title', 
        'shift-menu-options', 'shift-menu-close', 'complete-order-btn', 'reopen-order-btn'
    ];
    ids.forEach(id => {
        const camelCaseId = id.replace(/-([a-z])/g, g => g[1].toUpperCase());
        domElements[camelCaseId] = document.getElementById(id);
    });
    domElements.orderListThead = document.querySelector('#order-table thead');
}

export function renderAll() {
    const scheduleInfo = schedule.buildScheduleAndDetectConflicts();
    const machineLoadInfo = schedule.calculateMachineLoad(scheduleInfo, state.planningStartDate);
    
    if (state.machineLoadWeek === null) {
        // Deze regel zet de standaard week correct in.
        state.machineLoadWeek = utils.getWeekNumber(state.planningStartDate);
    }

    renderMachineLoad(machineLoadInfo);
    renderCustomerDropdown();
    renderOrderList(scheduleInfo);
    renderPlanningGrid(scheduleInfo);
}

export function renderCustomerDropdown() {
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

export function renderOrderList({ conflicts, partScheduleInfo, deadlineInfo }) {
    const filteredOrders = state.orders.filter(order => {
        if (!state.searchTerm) return true;
        const term = state.searchTerm.toLowerCase();
        if(['id', 'customer', 'customerOrderNr'].includes(state.searchKey)){
            return (order[state.searchKey] || '').toString().toLowerCase().includes(term);
        }
        return order.parts.some(part => {
            if ((part.partName || '').toString().toLowerCase().includes(term) || (part.drawingNumber || '').toString().toLowerCase().includes(term)) return true;
            if (part.batches) return part.batches.some(batch => (batch.batchId || '').toString().toLowerCase().includes(term));
            return false;
        });
    });

    // --- START CORRECTIE: BEREKEN DEADLINE VOOR HET SORTEREN ---

    // 1. Map alle orders naar een nieuw object dat de 'actieve deadline' bevat
    const ordersWithActiveDeadline = filteredOrders.map(order => {
        let nextActiveDeadline = order.deadline; // Standaard (fallback)

        const allBatches = order.parts.flatMap(p => p.batches || []);
        const uncompletedBatchesWithDeadlines = allBatches
            .filter(b => b.status !== 'Completed' && b.deadline);

        if (uncompletedBatchesWithDeadlines.length > 0) {
            uncompletedBatchesWithDeadlines.sort((a, b) => new Date(a.deadline) - new Date(b.deadline));
            nextActiveDeadline = uncompletedBatchesWithDeadlines[0].deadline;
        }
        
        return {
            order: order, // Het originele order-object
            calculatedDeadline: nextActiveDeadline // De deadline die we moeten gebruiken
        };
    });

    // 2. Sorteer nu op basis van de berekende deadline
    const sortedOrders = ordersWithActiveDeadline.sort((a, b) => {
        let valA, valB;

        if (state.sortKey === 'deadline') {
            valA = a.calculatedDeadline; // Gebruik de new berekende waarde
            valB = b.calculatedDeadline;
        } else {
            valA = a.order[state.sortKey]; // Gebruik voor andere kolommen de originele order-eigenschap
            valB = b.order[state.sortKey];
        }

        let comparison = 0;
        if (state.sortKey === 'deadline') {
            if (!valA || !valB) return 0;
            comparison = new Date(valA) - new Date(valB);
        } else {
            comparison = String(valA).localeCompare(String(valB), undefined, { numeric: true });
        }
        
        return state.sortOrder === 'asc' ? comparison : -comparison;
    });
    // --- EINDE CORRECTIE ---


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

    // --- DE FIX: Correcte SVG-codes voor de icoontjes ---
    const conflictIcon = `<svg class="inline-block h-5 w-5 text-red-500" title="Conflict gedetecteerd" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor"><path fill-rule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.21 3.031-1.742 3.031H4.42c-1.532 0-2.492-1.697-1.742-3.031l5.58-9.92zM10 13a1 1 0 110-2 1 1 0 010 2zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clip-rule="evenodd" /></svg>`;
    const delayedIcon = `<svg class="inline-block h-5 w-5 text-yellow-500" title="Eén of meerdere onderdelen hebben een vertraagde start" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor"><path fill-rule="evenodd" d="M8.485 2.495c.673-1.167 2.357-1.167 3.03 0l6.28 10.875c.673 1.167-.17 2.625-1.516 2.625H3.72c-1.347 0-2.189-1.458-1.515-2.625L8.485 2.495zM10 5a.75.75 0 01.75.75v3.5a.75.75 0 01-1.5 0v-3.5A.75.75 0 0110 5zm0 9a1 1 0 100-2 1 1 0 000 2z" clip-rule="evenodd" /></svg>`;
    const deadlineMissedIcon = `<svg class="inline-block h-5 w-5 text-red-600" title="Deadline wordt gemist!" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor"><path fill-rule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm.75-13a.75.75 0 00-1.5 0v5c0 .414.336.75.75.75h4a.75.75 0 000-1.5H10.75V5z" clip-rule="evenodd" /></svg>`;
    // --- EINDE FIX ---
    
    // --- START CORRECTIE: DE LOOP GEBRUIKT NU 'item' ---
    sortedOrders.forEach(item => {
        const order = item.order; // Haal het originele order object op
        const nextActiveDeadline = item.calculatedDeadline; // Haal de berekende deadline op

        const overallStatus = utils.getOverallOrderStatus(order);
        const orderRequiresAttention = order.parts.some(part => 
            part.batches && part.batches.some(batch => 
                (batch.materialStatus && batch.materialStatus !== 'Available') || batch.status === 'To Be Planned'
            )
        );
        const attentionIcon = `<span title="Actie vereist: materiaal niet beschikbaar of nog niet ingepland">🚩</span>`;

        const groupTr = document.createElement('tr');
        
        // --- LOGICA VOOR COMMENTAAR ---
        const hasComment = order.comment && order.comment.trim() !== '';
        const activeCommentClass = hasComment ? 'comment-btn-active' : ''; // Gebruik de CSS-klasse
        const commentTitle = hasComment ? 'Bekijk/wijzig opmerking' : 'Voeg opmerking toe';
        // --- EINDE LOGICA ---

        let rowClass = `order-group-row ${order.isUrgent ? 'urgent' : ''} cursor-pointer`;
        if (overallStatus === 'To Be Planned') rowClass += ' bg-blue-50 dark:bg-blue-900/20';
        groupTr.className = rowClass;
        groupTr.dataset.orderId = order.id;
        
        const plannableItemsForOrder = order.parts.flatMap(p => (p.batches && p.batches.length > 0) ? p.batches : [p]);
        
        let allProgrammed = true;
        let hasPartsToProgram = false;

        if (order.parts && order.parts.length > 0) {
            const relevantParts = order.parts.filter(p => p.batches && p.batches.length > 0);
            if (relevantParts.length > 0) {
                hasPartsToProgram = true;
                allProgrammed = relevantParts.every(part => part.isProgrammed === true);
            }
        }
        
        const programIcon = (hasPartsToProgram && !allProgrammed) ? '💻' : ''; 
        const programTitle = (hasPartsToProgram && !allProgrammed) ? 'Programma nog niet gereed!' : '';
        const itemIds = plannableItemsForOrder.map(item => item.id || item.batchId);
        const orderHasConflict = itemIds.some(id => conflicts.has(id));
        const totalOrderHours = plannableItemsForOrder.reduce((sum, item) => sum + (item.totalHours || 0), 0);
        const orderHasDelayedParts = itemIds.some(id => partScheduleInfo.get(id)?.isDelayed);
        const willMissDeadline = itemIds.some(id => deadlineInfo.has(id));

        if (orderHasConflict) groupTr.style.borderLeft = '4px solid #ef4444';
        else if (orderHasDelayedParts) groupTr.style.borderLeft = '4px solid #f59e0b';
        
        // --- START CORRECTIE: VERWIJDER DE DUBBELE BEREKENING ---
        // De 'nextActiveDeadline' berekening die hier stond is verwijderd.
        // --- EINDE CORRECTIE ---

        // Gebruik nu de 'nextActiveDeadline' voor de weergave
        const deadlineDate = new Date(nextActiveDeadline + 'T00:00:00');
        const deadlineText = deadlineDate.toLocaleDateString('en-GB');

        let deadlineSpan = `<span>${deadlineText}</span>`;
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        const oneWeekFromNow = new Date();
        oneWeekFromNow.setDate(today.getDate() + 7);
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
            <td class="px-3 py-3 whitespace-nowrap">
                <div class="flex items-center">
                    <input type="checkbox" title="Urgent Order" class="toggle-urgent-btn h-4 w-4 rounded border-gray-300 text-indigo-600 mr-3" data-order-id="${order.id}" ${order.isUrgent ? 'checked' : ''}>
                    <div>
                        <span class="font-bold">${order.id}</span>
                        
                        ${orderRequiresAttention ? `<span class="ml-2">${attentionIcon}</span>` : ''}
                        ${order.isUrgent ? '<span class="ml-2" title="Urgent Order">🔥</span>' : ''}
                        ${willMissDeadline ? `<span class="ml-2">${deadlineMissedIcon}</span>` : ''}
                        ${orderHasConflict ? `<span class="ml-2">${conflictIcon}</span>` : ''}
                        ${orderHasDelayedParts ? `<span class="ml-2">${delayedIcon}</span>` : ''}
                        ${programIcon ? `<span class="ml-2" title="${programTitle}">${programIcon}</span>` : ''}
                    </div>
                </div>
            </td>
            <td class="px-3 py-3 whitespace-nowrap">
                <div class="font-medium">${order.customer}</div>
                <div class="text-xs text-gray-500">${order.customerOrderNr || ''}</div>
            </td>
            <td class="px-3 py-3 text-sm">${order.parts.length}</td>
            <td class="px-3 py-3 text-sm font-semibold">${totalOrderHours.toFixed(1)} uur</td>
            <td class="px-3 py-3 text-center">${deadlineSpan}</td>
            <td class="px-3 py-3 whitespace-nowrap">${overallStatusBadge}</td>
            <td class="px-3 py-3 text-right actions-cell">
                 <div class="flex justify-end items-center gap-4">
                    ${overallStatus === 'Completed' ? `<button class="archive-btn text-sm bg-green-600 hover:bg-green-700 text-white font-semibold py-1 px-3 rounded-md" data-order-id="${order.id}">Archive</button>` : ''}
                    
                    <button class="comment-toggle-btn ${activeCommentClass}" data-order-id="${order.id}" title="${commentTitle}">
                        <svg class="icon-empty w-5 h-5 text-gray-500 ${hasComment ? 'hidden' : ''}" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor">
                            <path stroke-linecap="round" stroke-linejoin="round" d="M2.25 12.76c0 1.6 1.123 2.994 2.707 3.227 1.087.16 2.185.283 3.293.369V21l4.076-4.076a1.526 1.526 0 0 1 1.037-.443 48.282 48.282 0 0 0 5.68-.494c1.584-.233 2.707-1.626 2.707-3.228V6.741c0-1.602-1.123-2.995-2.707-3.228A48.394 48.394 0 0 0 12 3c-2.392 0-4.744.175-7.043.513C3.373 3.746 2.25 5.14 2.25 6.741v6.018Z" />
                        </svg>
                        <svg class="icon-filled w-5 h-5 text-purple-600 ${hasComment ? '' : 'hidden'}" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor">
                            <path fill-rule="evenodd" d="M3.43 2.22c.269-.082.55-.12.842-.12h11.456c.292 0 .573.038.842.12C18.138 2.62 19 3.73 19 4.99v8.76c0 1.26-1.138 2.37-2.618 2.77-.52.138-1.07.234-1.64.29v1.78a.75.75 0 0 1-1.206.608L9.12 15.5H5.712c-.292 0-.573-.038-.842-.12C3.37 14.98 2.5 13.87 2.5 12.61V4.99c0-1.26 1.138-2.37 2.618-2.77ZM10.5 7.75a.75.75 0 0 1 .75.75v.01a.75.75 0 0 1-.75.75H7.25a.75.75 0 0 1-.75-.75V8.5a.75.75 0 0 1 .75-.75h3.25Zm0 3a.75.75 0 0 1 .75.75v.01a.75.75 0 0 1-.75.75H7.25a.75.75 0 0 1-.75-.75v-.01a.75.75 0 0 1 .75-.75h3.25Z" clip-rule="evenodd" />
                        </svg>
                    </button>
                    
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

function calculateSpanningBlocks(scheduleInfo, gridStartDate) {
    const { schedule } = scheduleInfo;
    const spanningBlocks = [];
    const processedItems = new Set();
    const msPerDay = 1000 * 60 * 60 * 24;
    
    const itemsToDraw = getPlannableItems()
        .filter(item => item.machine && item.startDate && item.status !== 'Completed');

    const gridEndDate = new Date(gridStartDate);
    gridEndDate.setDate(gridEndDate.getDate() + 21);
    
    itemsToDraw.forEach(item => {
        const itemId = item.id || item.batchId;
        if (processedItems.has(itemId) || !schedule[item.machine]) return;
        
        const allDates = Object.keys(schedule[item.machine])
            .filter(dateStr => {
                const daySchedule = schedule[item.machine][dateStr];
                return daySchedule && (daySchedule.parts || []).some(p => p.partId === itemId);
            })
            .map(dateStr => new Date(dateStr + 'T00:00:00'))
            .sort((a, b) => a - b);
            
        if (allDates.length === 0) return;
        processedItems.add(itemId);

        let segmentStart = allDates[0];
        for (let i = 1; i < allDates.length; i++) {
            const diffDays = (allDates[i] - allDates[i - 1]) / msPerDay;
            if (diffDays > 1) { 
                spanningBlocks.push({ itemId: itemId, start: segmentStart, end: allDates[i - 1] });
                segmentStart = allDates[i];
            }
        }
        spanningBlocks.push({ itemId: itemId, start: segmentStart, end: allDates[allDates.length - 1] });
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

    const machineRenderInfo = new Map();
    let currentRow = 5;
    state.machines.forEach(machine => {
        machineRenderInfo.set(machine.name, { startRow: currentRow });
        currentRow += 2;
    });

    const todayString = utils.formatDateToYMD(new Date());
    const monthSpans = {}, weekSpans = {};
    let currentDate = new Date(gridStartDate);
    for (let i = 0; i < 21; i++) {
        const monthYear = currentDate.toLocaleDateString('nl-BE', { month: 'long', year: 'numeric' });
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
        cell.style.gridRow = '1 / span 1';
        grid.appendChild(cell);
    });
    Object.entries(weekSpans).forEach(([week, span], index) => {
        const cell = document.createElement('div');
        cell.className = 'grid-header week-header';
        cell.textContent = week;
        cell.style.gridColumn = `${Object.values(weekSpans).slice(0, index).reduce((a, b) => a + b, 0) + 2} / span ${span}`;
        cell.style.gridRow = '2 / span 1.5';
        grid.appendChild(cell);
    });
    currentDate = new Date(gridStartDate);
    for (let i = 0; i < 21; i++) {
        const cell = document.createElement('div');
        cell.className = 'grid-header day-header';
        cell.innerHTML = `${currentDate.getDate()}<br>${currentDate.toLocaleDateString('nl-BE', { weekday: 'short' })}`;
        if (utils.formatDateToYMD(currentDate) === todayString) cell.classList.add('today');
        cell.style.gridColumn = i + 2;
        cell.style.gridRow = '3 / span 2';
        grid.appendChild(cell);
        currentDate.setDate(currentDate.getDate() + 1);
    }

    state.machines.forEach(machine => {
        const renderInfo = machineRenderInfo.get(machine.name);
        
        const machineLabel = document.createElement('div');
        machineLabel.className = 'machine-label';
        machineLabel.textContent = machine.name;
        machineLabel.style.gridColumn = 1;
        machineLabel.style.gridRow = `${renderInfo.startRow} / span 2`;
        grid.appendChild(machineLabel);

        let cellDate = new Date(gridStartDate);
        for (let j = 0; j < 21; j++) {
            const dayCell = document.createElement('div');
            dayCell.className = 'grid-cell';
            if ([0, 6].includes(cellDate.getDay())) {
                dayCell.classList.add('weekend');
            }
            dayCell.dataset.date = utils.formatDateToYMD(cellDate);
            dayCell.dataset.machine = machine.name;

            const currentDateForAbsenceCheck = new Date(dayCell.dataset.date + 'T12:00:00Z');
            let isAbsence = false;
            let absenceReason = '';
            for (const abs of state.absences) {
                const start = new Date(abs.start + 'T00:00:00Z');
                const end = new Date(abs.end + 'T23:59:59Z');
                if (currentDateForAbsenceCheck >= start && currentDateForAbsenceCheck <= end) {
                    isAbsence = true;
                    absenceReason = abs.reason;
                    break;
                }
            }
            if (isAbsence) {
                dayCell.classList.add('absence-cell');
                dayCell.title = `Afwezig: ${absenceReason}`;
            }

            dayCell.style.gridRow = `${renderInfo.startRow} / span 2`;
            dayCell.style.gridColumn = j + 2;
            grid.appendChild(dayCell);
            cellDate.setDate(cellDate.getDate() + 1);
        }
    });

    const plannableItems = getPlannableItems();
    
    // --- DEZE REGEL WAS WAARSCHIJNLIJK WEGGEVALLEN ---
    const spanningBlocks = calculateSpanningBlocks(scheduleInfo, gridStartDate);
    
    spanningBlocks.sort((a, b) => {
        const itemA = plannableItems.find(i => (i.id || i.batchId) === a.itemId);
        const itemB = plannableItems.find(i => (i.id || i.batchId) === b.itemId);
        if (!itemA || !itemB) return 0;

        if (itemA.machine < itemB.machine) return -1;
        if (itemA.machine > itemB.machine) return 1;
        return a.start - b.start;
    });

    const lastOrderDetails = new Map();

    spanningBlocks.forEach(blockInfo => {
        const item = plannableItems.find(i => (i.id || i.batchId) === blockInfo.itemId);
        if (!item) return;

        const renderInfo = machineRenderInfo.get(item.machine);
        if (!renderInfo) return;

        const order = state.orders.find(o => o.id === item.orderId);
        if (!order) return;
        
        const parentPart = findPart(item.parentId || item.id);
        if (!parentPart) return;

        const orderBlock = document.createElement('div');
        
        const machineColors = MACHINE_COLORS[item.machine] || MACHINE_COLORS.default;
        const lastDetails = lastOrderDetails.get(item.machine);
        let colorClass;

        if (lastDetails && order.id === lastDetails.orderId) {
            colorClass = lastDetails.colorClass;
        } else {
            colorClass = (lastDetails && lastDetails.colorClass === machineColors.base) 
                ? machineColors.alt 
                : machineColors.base;
        }
        lastOrderDetails.set(item.machine, { orderId: order.id, colorClass: colorClass });
        
        let materialClass = '';
        switch (item.materialStatus) {
            case 'Not Available': materialClass = 'material-unavailable'; break;
            case 'Ordered': materialClass = 'material-ordered'; break;
        }
        
        const isConflict = conflicts.has(item.id || item.batchId);
        const urgentClass = order.isUrgent ? 'urgent-block' : '';
        const deadlineMissedClass = deadlineInfo.get(item.id || item.batchId) ? 'deadline-missed-block' : '';
        const finalColorClass = isConflict ? 'order-conflict' : colorClass;
        
        orderBlock.className = `order-block ${materialClass} ${finalColorClass} ${urgentClass} ${deadlineMissedClass}`;
        orderBlock.draggable = true;
        orderBlock.dataset.itemId = item.id || item.batchId;
        
        orderBlock.style.gridRow = `${renderInfo.startRow} / span 2`;
        orderBlock.style.gridColumn = `${blockInfo.startColumn} / span ${blockInfo.span}`;

        let blockIdDisplay = (item.id || item.batchId).slice(-5);
        if (item.parentId) {
             blockIdDisplay = `${item.parentId.slice(-5)}/${(item.id || item.batchId).substring((item.id || item.batchId).lastIndexOf('-') + 2)}`;
        }
        
        orderBlock.innerHTML = `<span>${blockIdDisplay}</span>`;
        orderBlock.title = `Klant: ${order.customer}
Order: ${order.id}
Onderdeel: ${parentPart.partName}
Batch: ${item.id || item.batchId}
Aantal: ${item.quantity} stuks
Duur: ${item.totalHours.toFixed(1)} uur`;
        grid.appendChild(orderBlock);
    });

    domElements.planningContainer.appendChild(grid);
}

export function navigateCalendar(direction) {
    currentCalendarDate.setMonth(currentCalendarDate.getMonth() + direction);
    renderAbsenceCalendar();
}