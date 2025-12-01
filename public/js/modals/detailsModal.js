// js/modals/detailsModal.js

import { domElements, renderAll } from '../ui.js';
import { state, findPart } from '../state.js';
import * as utils from '../utils.js';
import * as schedule from '../schedule.js';
import * as api from '../api.js';
import { MATERIAL_STATUS } from '../constants.js';
import { openConfirmModal } from './confirmModal.js';

let currentModalOrderId = null;

/**
 * Opent de order details modal en highlight optioneel een specifieke batch.
 * @param {string} orderId - De ID van de order om te tonen.
 * @param {string} [highlightedBatchId=null] - De ID van de batch die gehighlight moet worden.
 */
export function openOrderDetailsModal(orderId, highlightedBatchId = null) {
    currentModalOrderId = orderId; 
    document.body.classList.add('no-scroll');
    const order = state.orders.find(o => o.id === orderId);
    if (!order) return;

    // --- LOGICA VOOR VOLTOOIEN/HEROPENEN KNOPPEN ---
    const overallStatus = utils.getOverallOrderStatus(order);
    if (overallStatus === 'Completed') {
        domElements.completeOrderBtn.classList.add('hidden');
        domElements.reopenOrderBtn.classList.remove('hidden');
    } else {
        domElements.completeOrderBtn.classList.remove('hidden');
        domElements.reopenOrderBtn.classList.add('hidden');
    }
    // --- EINDE LOGICA ---

    domElements.detailsOrderId.textContent = order.id;
    renderOrderDetails(order); 
    domElements.orderDetailsModal.classList.remove('hidden');

    // --- SCROLL & HIGHLIGHT LOGICA (VEILIG INGEPAKT) ---
    if (highlightedBatchId) {
        const batchRow = domElements.orderDetailsContent.querySelector(`tr[data-batch-id="${highlightedBatchId}"]`);
        if (batchRow) {
            // Zorg ervoor dat het bovenliggende onderdeel is uitgeklapt
            const partId = batchRow.dataset.parentPartId;
            if (partId && !state.expandedPartsInModal.has(partId)) {
                const headerRow = domElements.orderDetailsContent.querySelector(`tr[data-part-id="${partId}"]`);
                headerRow?.click(); // Simuleer een klik om de rij uit te klappen
            }

            // Scroll naar de rij en geef een tijdelijke markering
            setTimeout(() => {
                batchRow.scrollIntoView({ behavior: 'smooth', block: 'center' });
                batchRow.classList.add('bg-yellow-100', 'transition-all', 'duration-1000');
                setTimeout(() => {
                    batchRow.classList.remove('bg-yellow-100');
                }, 2500);
            }, 100); 
        }
    }
    // --- EINDE SCROLL & HIGHLIGHT LOGICA ---
}

/**
 * Rendert de inhoud van de order details modal.
 * @param {object} order - Het order-object om te renderen.
 */
function renderOrderDetails(order) {
    const container = domElements.orderDetailsContent;
    container.innerHTML = '';
    const scheduleInfo = schedule.buildScheduleAndDetectConflicts();
    const table = document.createElement('table');
    table.className = 'min-w-full divide-y divide-gray-200'; // dark:divide-gray-700 VERWIJDERD

    table.innerHTML = `
        <thead class="bg-gray-50"> <tr>
                <th class="px-3 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Onderdeel / Batch</th>
                <th class="px-3 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Materiaal</th>
                <th class="px-3 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Aantal</th>
                <th class="px-3 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Duur (uur)</th>
                <th class="px-3 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                <th class="px-3 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Machine</th>
                <th class="px-3 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Shift</th>
                <th class="px-3 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Startdatum</th>
                <th class="px-3 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Deadline</th>
                <th class="px-3 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Acties</th>
            </tr>
        </thead>
        <tbody class="bg-white divide-y divide-gray-200"> </tbody>
    `;
    const tbody = table.querySelector('tbody');
    order.parts.forEach(part => {
        const batches = part.batches || [];
        const completedBatches = batches.filter(b => b.status === 'Completed');
        const completedQuantity = completedBatches.reduce((sum, b) => sum + (b.quantity || 0), 0);

        const partRequiresAttention = batches.some(batch => 
            (batch.materialStatus && batch.materialStatus !== 'Available') || batch.status === 'To Be Planned'
        );
        const attentionIcon = `<span title="Actie vereist: materiaal niet beschikbaar of nog niet ingepland">🚩</span>`;

        const partTr = document.createElement('tr');
        partTr.className = 'part-header-row bg-gray-50 font-semibold cursor-pointer hover:bg-gray-100'; // dark: klassen VERWIJDERD
        partTr.dataset.partId = part.id;

        partTr.innerHTML = `
            <td class="px-4 py-3 whitespace-nowrap" colspan="2">
                <div class="flex items-center">
                    <svg class="toggle-arrow w-5 h-5 mr-2 transition-transform duration-200" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor"><path fill-rule="evenodd" d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z" clip-rule="evenodd" /></svg>
                    ${partRequiresAttention ? attentionIcon : ''}
                    <div>
                        <span>${part.partName} (${part.id})</span>
                        <span class="block text-xs text-gray-500 font-normal">${part.drawingNumber || 'Geen teknr.'}</span> </div>
                </div>
            </td>
            <td class="px-3 py-3 text-sm font-normal text-center">${part.totalQuantity || 0}</td>
            <td class="px-3 py-3 text-sm font-normal text-center">${batches.reduce((sum, b) => sum + (b.totalHours || 0), 0).toFixed(1)}</td>
            <td class="px-3 py-3 text-sm font-normal text-center" colspan="3">
                <span class="font-semibold">${completedQuantity} / ${part.totalQuantity || 0}</span> voltooid
            </td>
            <td class="px-3 py-3 text-sm font-normal" colspan="2">
                <div class="flex items-center justify-center" title="Is het CAM programma klaar?">
                    <input type="checkbox" 
                           class="program-status-checkbox h-5 w-5 rounded border-gray-300 text-indigo-600" 
                           data-part-id="${part.id}" 
                           ${part.isProgrammed ? 'checked' : ''}>
                    <label class="ml-2 text-sm font-medium">Programma Klaar</label>
                </div>
            </td>
            <td class="px-3 py-3 text-sm font-normal">
                <div class="flex items-center gap-1" title="Pas stuktijd aan voor alle batches van dit onderdeel">
                    <span class="text-xs text-gray-500">Stuktijd:</span>
                    <span class="editable-piece-time font-bold p-1 rounded hover:bg-blue-100 cursor-pointer">${part.productionTimePerPiece}</span>
                    <span class="text-xs text-gray-500">min</span>
                </div>
            </td>
        `;
        tbody.appendChild(partTr);

        if (batches.length > 0) {
            batches.forEach(item => {
                const tr = document.createElement('tr');
                const itemId = item.batchId;
                tr.dataset.batchId = item.batchId;
                const dataAttribute = `data-batch-id="${item.batchId}"`;
                tr.className = 'batch-row hidden'; 
                tr.dataset.parentPartId = part.id;

                if (item.status === 'To Be Planned' || !item.status) {
                    tr.draggable = true;
                    tr.classList.add('draggable-row', 'cursor-grab');
                }

                let statusBadge;
                switch (item.status) {
                    case 'Scheduled': statusBadge = `<span class="status-badge status-inp">Scheduled</span>`; break;
                    case 'Completed': statusBadge = `<span class="status-badge status-com">Completed</span>`; break;
                    default: statusBadge = `<span class="status-badge status-tbp">To Be Planned</span>`;
                }

                const currentStatus = item.materialStatus || 'Not Available';
                let buttonClass = '';
                switch (currentStatus) {
                    case 'Available': buttonClass = 'bg-green-600 hover:bg-green-700 text-white'; break;
                    case 'Ordered': buttonClass = 'bg-blue-600 hover:bg-blue-700 text-white'; break;
                    case 'Not Available': buttonClass = 'bg-red-600 hover:bg-red-700 text-white'; break;
                }
                const materialButtonHTML = `<button type="button" class="material-status-cycler w-full text-xs font-bold py-1 px-2 rounded-md transition ${buttonClass}" ${dataAttribute}>${currentStatus}</button>`;

                const selectedMachine = state.machines.find(m => m.name === item.machine);
                let shiftOptions = `<option value="8" ${item.shift === 8 ? 'selected': ''}>Dag (8u)</option>`;
                if (selectedMachine) {
                    if (selectedMachine.name.includes('DMU')) shiftOptions += `<option value="16" ${item.shift === 16 ? 'selected': ''}>Dag+Nacht (16u)</option>`;
                    if (selectedMachine.hasRobot) shiftOptions += `<option value="24" ${item.shift === 24 ? 'selected': ''}>Continu (24u)</option>`;
                }

                const info = scheduleInfo.partScheduleInfo.get(itemId) || {};
                const isDelayed = info.isDelayed;
                const startDateInputClass = `start-date-input ${isDelayed ? 'delayed-start' : ''}`;
                const startDateTitle = isDelayed ? `Waarschuwing: Actuele start is ${new Date(info.actualStartDate).toLocaleDateString('nl-BE')}` : '';

                let actionButtonsHTML = `...`; 
                actionButtonsHTML = `
                    <div class="relative action-dropdown">
                        <button class="toggle-action-dropdown p-1 rounded-full text-gray-400 hover:bg-gray-200 hover:text-gray-600"> <svg class="w-5 h-5" fill="currentColor" viewBox="0 0 20 20"><path d="M10 6a2 2 0 110-4 2 2 0 010 4zM10 12a2 2 0 110-4 2 2 0 010 4zM10 18a2 2 0 110-4 2 2 0 010 4z"></path></svg>
                        </button>
                        <div class="action-menu hidden absolute right-0 mt-2 w-48 bg-white rounded-md shadow-lg py-1 z-10 border"> `;
                if (item.status === 'Completed') actionButtonsHTML += `<a href="#" class="block px-4 py-1.5 text-sm font-medium text-yellow-600 hover:bg-yellow-50 toggle-status-btn action-link-reopen" ${dataAttribute}>Heropenen</a>`; // dark: klassen VERWIJDERD
                else actionButtonsHTML += `<a href="#" class="block px-4 py-1.5 text-sm font-medium text-green-600 hover:bg-green-50 toggle-status-btn action-link-complete" ${dataAttribute}>Voltooien</a>`; // dark: klassen VERWIJDERD
                if (item.status === 'Scheduled' || item.status === 'In Production') actionButtonsHTML += `<a href="#" class="block px-4 py-1.5 text-sm font-medium text-orange-600 hover:bg-orange-50 unplan-btn action-link-unplan" ${dataAttribute}>Planning Wissen</a>`; // dark: klassen VERWIJDERD
                actionButtonsHTML += `<a href="#" class="block px-4 py-1.5 text-sm font-medium text-red-600 hover:bg-red-50 delete-btn-in-details action-link-delete" ${dataAttribute}>Verwijderen</a></div></div>`; // dark: klassen VERWIJDERD

                tr.innerHTML = `
                    <td class="px-3 py-4 whitespace-nowrap pl-10 text-sm">${itemId}</td>
                    <td class="px-3 py-4 whitespace-nowrap">
                        ${materialButtonHTML}
                    </td>
                    <td class="px-3 py-4 whitespace-nowrap text-sm text-center">${item.quantity}</td>
                    <td class="px-3 py-4 whitespace-nowrap text-sm text-center">${(item.totalHours || 0).toFixed(1)}</td>
                    <td class="px-3 py-4 whitespace-nowrap">${statusBadge}</td>
                    <td class="px-3 py-4 whitespace-nowrap"><select class="machine-select bg-white rounded-md text-sm w-full" ${dataAttribute}><option value="">-</option>${state.machines.map(m => `<option value="${m.name}" ${item.machine === m.name ? 'selected' : ''}>${m.name}</option>`).join('')}</select></td> <td class="px-3 py-4 whitespace-nowrap"><select class="shift-select bg-white rounded-md text-sm w-full" ${dataAttribute} ${!item.machine ? 'disabled' : ''}>${shiftOptions}</select></td> <td class="px-3 py-4 whitespace-nowrap"><input type="date" class="${startDateInputClass} w-full bg-white rounded-md text-sm" ${dataAttribute} value="${item.startDate || ''}" title="${startDateTitle}"></td> <td class="px-3 py-4 whitespace-nowrap text-sm">${item.deadline ? new Date(item.deadline + 'T00:00:00').toLocaleDateString('nl-BE') : '-'}</td>
                    <td class="px-3 py-4 whitespace-nowrap text-sm font-medium">${actionButtonsHTML}</td>
                `;
                tbody.appendChild(tr);
            });
        }
    });
    container.appendChild(table);

    state.expandedPartsInModal.forEach(partId => {
        const headerRow = tbody.querySelector(`tr[data-part-id="${partId}"]`);
        const batchRows = tbody.querySelectorAll(`tr[data-parent-part-id="${partId}"]`);
        if (headerRow && batchRows.length > 0) {
            batchRows.forEach(row => row.classList.remove('hidden'));
            const arrow = headerRow.querySelector('.toggle-arrow');
            if (arrow) arrow.classList.add('rotate-180');

            // --- OOK HIER DE DARK CLASS VERWIJDEREN ---
            if (highlightedBatchId) {
                const batchRow = domElements.orderDetailsContent.querySelector(`tr[data-batch-id="${highlightedBatchId}"]`);
                if (batchRow) {
                    setTimeout(() => {
                        batchRow.scrollIntoView({ behavior: 'smooth', block: 'center' });
                        batchRow.classList.add('bg-yellow-100', 'transition-all', 'duration-1000'); // dark:bg-yellow-800/30 VERWIJDERD
                        setTimeout(() => {
                            batchRow.classList.remove('bg-yellow-100'); // dark:bg-yellow-800/30 VERWIJDERD
                        }, 2500);
                    }, 100);
                }
            }
            // --- EINDE ---
        }
    });
}

/**
 * Initialiseert de event listeners voor de details modal.
 */
export function initializeDetailsModalEvents() {
    
    // --- START: De Event Handlers op de Modals (Complete/Reopen) ---

    if (domElements.completeOrderBtn) {
        domElements.completeOrderBtn.addEventListener('click', async () => {
            if (!currentModalOrderId) return;
            
            const order = state.orders.find(o => o.id === currentModalOrderId);
            if (!order) {
                utils.showNotification('Order niet gevonden.', 'error', domElements.notificationContainer);
                return;
            }

            openConfirmModal(
                'Order Voltooien',
                `Weet je zeker dat je alle onderdelen van order "${order.id}" als voltooid wilt markeren?`,
                async () => {
                    // Markeer alle batches als voltooid
                    order.parts.forEach(part => {
                        if (part.batches) {
                            part.batches.forEach(batch => {
                                batch.status = 'Completed';
                            });
                        }
                    });

                    utils.showLoadingOverlay(domElements.loadingOverlay);
                    try {
                        await api.updateOrderOnBackend(order.id, order);
                        utils.showNotification(`Order ${order.id} is als voltooid gemarkeerd.`, 'success', domElements.notificationContainer);
                        
                        domElements.orderDetailsModal.classList.add('hidden');
                        document.body.classList.remove('no-scroll');
                        currentModalOrderId = null;
                        renderAll();
                    } catch (error) {
                        utils.showNotification(`Fout bij opslaan: ${error.message}`, 'error', domElements.notificationContainer);
                    } finally {
                        utils.hideLoadingOverlay(domElements.loadingOverlay);
                    }
                },
                'Ja, markeer als voltooid',
                'constructive'
            );
        });
    }

    if (domElements.reopenOrderBtn) {
        domElements.reopenOrderBtn.addEventListener('click', async () => {
            if (!currentModalOrderId) return;
            
            const order = state.orders.find(o => o.id === currentModalOrderId);
            if (!order) {
                utils.showNotification('Order niet gevonden.', 'error', domElements.notificationContainer);
                return;
            }

            openConfirmModal(
                'Order Heropenen',
                `Weet je zeker dat je alle onderdelen van order "${order.id}" wilt heropenen?`,
                async () => {
                    // Markeer alle batches als geopend
                    order.parts.forEach(part => {
                        if (part.batches) {
                            part.batches.forEach(batch => {
                                if (batch.status === 'Completed') {
                                    batch.status = (batch.machine && batch.startDate) ? 'Scheduled' : 'To Be Planned';
                                }
                            });
                        }
                    });

                    utils.showLoadingOverlay(domElements.loadingOverlay);
                    try {
                        await api.updateOrderOnBackend(order.id, order);
                        utils.showNotification(`Order ${order.id} is heropend.`, 'success', domElements.notificationContainer);
                        
                        domElements.orderDetailsModal.classList.add('hidden');
                        document.body.classList.remove('no-scroll');
                        currentModalOrderId = null;
                        renderAll();
                    } catch (error) {
                        utils.showNotification(`Fout bij opslaan: ${error.message}`, 'error', domElements.notificationContainer);
                    } finally {
                        utils.hideLoadingOverlay(domElements.loadingOverlay);
                    }
                },
                'Ja, heropen order',
                'constructive'
            );
        });
    }

    // --- START: De Event Handlers op de Tabel Inhoud (Veranderingen) ---

    if (domElements.orderDetailsContent) {
        let draggedItemElement = null;
        let dragPreviewElement = null;

        domElements.orderDetailsContent.addEventListener('dragstart', (e) => {
            const target = e.target;
            if (!target.classList.contains('draggable-row')) {
                e.preventDefault();
                return;
            }
            draggedItemElement = target;
            const context = utils.findItemContext(target); // Gebruik de global util

            if (context && context.item) {
                const itemId = context.item.batchId || context.item.id;
                e.dataTransfer.setData('text/plain', itemId);
                e.dataTransfer.effectAllowed = 'move';

                dragPreviewElement = document.createElement('div');
                dragPreviewElement.className = 'drag-preview';
                dragPreviewElement.textContent = `${context.part.partName} (${itemId})`;
                document.body.appendChild(dragPreviewElement);
                e.dataTransfer.setDragImage(dragPreviewElement, 20, 20);

                setTimeout(() => {
                    domElements.orderDetailsModal.classList.add('hidden');
                    document.body.classList.remove('no-scroll');
                    if (draggedItemElement) draggedItemElement.classList.add('dragging');
                }, 0);
            }
        });

        domElements.orderDetailsContent.addEventListener('dragend', (e) => {
            if (draggedItemElement) {
                draggedItemElement.classList.remove('dragging');
                draggedItemElement = null;
            }
            if (dragPreviewElement) {
                dragPreviewElement.remove();
                dragPreviewElement = null;
            }
        });

        // --- DE 'CHANGE' LISTENER IS NU OPGESPLITST ---
        domElements.orderDetailsContent.addEventListener('change', async (e) => {
            const target = e.target;
            const context = utils.findItemContext(target);
            
            // --- 1. AFHANDELING VOOR PART-LEVEL PROGRAM CHECKBOX ---
            if (target.classList.contains('program-status-checkbox')) {
                const partId = target.dataset.partId;
                const part = findPart(partId);
                const order = state.orders.find(o => o.parts.some(p => p.id === partId));
                
                if (part && order) {
                    part.isProgrammed = target.checked;
                    
                    let saveSuccess = false; // <-- NIEUWE VLAG

                    utils.showLoadingOverlay(domElements.loadingOverlay);
                    try {
                        // 1. De API-call voert de update uit
                        await api.updateOrderOnBackend(order.id, order);
                        saveSuccess = true; // <-- Zet de vlag ALLEEN bij succes
                    } catch (error) {
                        // 2. Toon de rode foutmelding direct bij falen
                        utils.showNotification(`Fout bij opslaan: ${error.message}`, 'error', domElements.notificationContainer); 
                    } finally {
                        utils.hideLoadingOverlay(domElements.loadingOverlay);
                        
                        // 3. Controleer de vlag om te beslissen of we de UI updaten
                        if (saveSuccess) {
                            // Toon de groene melding en update de UI
                            utils.showNotification('Programma status bijgewerkt.', 'success', domElements.notificationContainer);
                            renderAll(); 
                            renderOrderDetails(order); // Her-render modal
                        }
                    }
                }
                return; // Stop verdere uitvoering
            }

            // --- 2. AFHANDELING VOOR BATCH-LEVEL WIJZIGINGEN ---
            if (!context) return;
            const { item, order: parentOrder } = context;
            
            let shouldUpdateAndRender = false;

            if (target.classList.contains('shift-select')) {
                item.shift = parseInt(target.value, 10);
                shouldUpdateAndRender = true;
            }
            if (target.classList.contains('start-date-input')) {
                item.startDate = target.value;
                if (item.machine) item.status = 'Scheduled';
                shouldUpdateAndRender = true;
            }
            if (target.classList.contains('machine-select')) {
                const machineName = target.value;
                item.machine = machineName;
                item.status = machineName ? 'Scheduled' : 'To Be Planned';
                shouldUpdateAndRender = true;
                
                const row = target.closest('tr');
                if (row) {
                    const shiftSelect = row.querySelector('.shift-select');
                    if (shiftSelect) {
                        shiftSelect.disabled = !machineName;
                    }
                }
            }
            
            if (shouldUpdateAndRender) {
                utils.showLoadingOverlay(domElements.loadingOverlay);
                try {
                    await api.updateOrderOnBackend(parentOrder.id, parentOrder);
                    utils.showNotification('Planning bijgewerkt.', 'success', domElements.notificationContainer);
                    renderAll();
                    renderOrderDetails(parentOrder);
                } catch (error) {
                    utils.showNotification(`Fout bij opslaan: ${error.message}`, 'error', domElements.notificationContainer);
                } finally {
                    utils.hideLoadingOverlay(domElements.loadingOverlay);
                }
            }
        });


        // --- START: De CLICK handler (Materiaal Status, Uitklappen) ---

        domElements.orderDetailsContent.addEventListener('click', async (e) => {
            const target = e.target;
            
            // FIX: Voorkom dat clicks op de checkbox de rij uitklappen
            if (target.classList.contains('program-status-checkbox') || target.tagName === 'LABEL') {
                 return; 
            }

            // Material Status cycler
            const statusCycler = target.closest('.material-status-cycler');
            if (statusCycler) {
                e.preventDefault();
                const context = utils.findItemContext(target);
                if (!context) return;
                const { item, order: parentOrder } = context;
                
                const currentStatus = item.materialStatus || 'Not Available';
                const currentIndex = MATERIAL_STATUS.indexOf(currentStatus);
                const nextIndex = (currentIndex + 1) % MATERIAL_STATUS.length;
                const newStatus = MATERIAL_STATUS[nextIndex];

                item.materialStatus = newStatus;
                let saveSuccess = false; // <-- NIEUWE VLAG

                utils.showLoadingOverlay(domElements.loadingOverlay);
                try {
                    await api.updateOrderOnBackend(parentOrder.id, parentOrder);
                    saveSuccess = true; // Zet de vlag ALLEEN bij succes
                } catch (error) {
                    utils.showNotification(`Fout bij opslaan: ${error.message}`, 'error', domElements.notificationContainer);
                } finally {
                    utils.hideLoadingOverlay(domElements.loadingOverlay);
                    
                    // Update UI alleen als de save slaagde
                    if (saveSuccess) {
                        utils.showNotification('Materiaalstatus bijgewerkt.', 'success', domElements.notificationContainer);
                        renderAll();
                        renderOrderDetails(parentOrder);
                    }
                }
                return;
            }

            // Stuktijd bewerken
            const editablePieceTime = target.closest('.editable-piece-time');
            if (editablePieceTime) {
                e.stopPropagation();
                const partId = target.closest('.part-header-row').dataset.partId;
                const part = findPart(partId);
                if (!part) return;
                const order = state.orders.find(o => o.parts.some(p => p.id === partId));
                if (!order) return;
                const originalValue = part.productionTimePerPiece;
                const parentCell = editablePieceTime.parentElement;
                parentCell.innerHTML = `
                    <span class="text-xs text-gray-500">Stuktijd:</span>
                    <input type="number" step="0.01" class="w-20 text-center bg-white border rounded" value="${originalValue}" /> 
                    <span class="text-xs text-gray-500">min</span>
                `;
                const input = parentCell.querySelector('input');
                input.focus();
                input.select();
                const saveChange = async () => {
                    const newValue = parseFloat(input.value);
                    if (!isNaN(newValue) && newValue >= 0 && newValue !== originalValue) {
                        part.productionTimePerPiece = newValue;
                        if (part.batches) {
                            part.batches.forEach(b => { 
                                b.totalHours = (b.quantity * newValue) / 60; 
                            });
                        }
                        await api.updateOrderOnBackend(order.id, order);
                    }
                    renderAll();
                    openOrderDetailsModal(order.id);
                };
                input.addEventListener('blur', saveChange);
                input.addEventListener('keydown', (e) => {
                    if (e.key === 'Enter') input.blur();
                    if (e.key === 'Escape') openOrderDetailsModal(order.id);
                });
                return;
            }

            // De uitklap/dichtklap logica
            const headerRow = target.closest('.part-header-row');
            if (headerRow) {
                const partId = headerRow.dataset.partId;
                if (partId) {
                    const batchRows = domElements.orderDetailsContent.querySelectorAll(`tr[data-parent-part-id="${partId}"]`);
                    const arrow = headerRow.querySelector('.toggle-arrow');
                    const isExpanding = batchRows.length > 0 && batchRows[0].classList.contains('hidden');
                    batchRows.forEach(row => row.classList.toggle('hidden'));
                    if (arrow) arrow.classList.toggle('rotate-180');
                    if (isExpanding) {
                        state.expandedPartsInModal.add(partId);
                    } else {
                        state.expandedPartsInModal.delete(partId);
                    }
                }
                return;
            }

            // De delete/unplan logica
            const context = utils.findItemContext(target);
            if (!context) return;
            const { item, part: parentPart, order: parentOrder } = context;
            let actionTaken = false;
            const deleteBtn = target.closest('.delete-btn-in-details'); 

            if (target.classList.contains('unplan-btn') || target.classList.contains('toggle-status-btn') || deleteBtn) {
                e.preventDefault();
            }

            if (target.classList.contains('unplan-btn')) {
                item.machine = null;
                item.startDate = null;
                item.status = 'To Be Planned';
                actionTaken = true;
            } else if (target.classList.contains('toggle-status-btn')) {
                item.status = item.status === 'Completed' ? 'Scheduled' : 'Completed';
                actionTaken = true;
            } else if (deleteBtn) {
                const idToDelete = item.batchId;
                openConfirmModal('Batch Verwijderen', `Weet je zeker dat je batch "${idToDelete}" wilt verwijderen?`, async () => {
                    parentPart.batches = parentPart.batches.filter(b => b.batchId !== idToDelete);
                    if (parentPart.batches.length === 0) {
                        parentOrder.parts = parentOrder.parts.filter(p => p.id !== parentPart.id);
                    }
                    if (parentOrder.parts.length === 0) {
                        await api.deleteOrderOnBackend(parentOrder.id);
                        state.orders = state.orders.filter(o => o.id !== parentOrder.id);
                        domElements.orderDetailsModal.classList.add('hidden');
                        document.body.classList.remove('no-scroll');
                    } else {
                        await api.updateOrderOnBackend(parentOrder.id, parentOrder);
                        openOrderDetailsModal(parentOrder.id);
                    }
                    renderAll();
                });
                return;
            }

            if (actionTaken) {
                utils.showLoadingOverlay(domElements.loadingOverlay);
                try {
                    await api.updateOrderOnBackend(parentOrder.id, parentOrder);
                    renderAll();
                    openOrderDetailsModal(parentOrder.id);
                } catch (error) {
                    utils.showNotification(`Fout bij opslaan: ${error.message}`, 'error', domElements.notificationContainer);
                } finally {
                    utils.hideLoadingOverlay(domElements.loadingOverlay);
                }
            }
        });
    }

    if (domElements.closeOrderDetailsBtn) {
        domElements.closeOrderDetailsBtn.addEventListener('click', () => {
            document.body.classList.remove('no-scroll');
            domElements.orderDetailsModal.classList.add('hidden');
            domElements.completeOrderBtn.classList.add('hidden');
            domElements.reopenOrderBtn.classList.add('hidden');
            currentModalOrderId = null;
            state.expandedPartsInModal.clear(); // <-- VOEG DEZE REGEL TOE
        });
    }
}