// js/modals/orderModal.js

import { domElements, renderAll } from '../ui.js';
import { state } from '../state.js';
import * as api from '../api.js';
import * as utils from '../utils.js';
import { openConfirmModal } from './confirmModal.js';

// --- Module-level state (verplaatst van ui.js) ---
let currentModalOrderId = null;
let partCounter = 0;
let activePartFormElement = null;

async function handleUpdateOrder() {
    const orderId = domElements.editOrderForm.dataset.editingOrderId;
    const order = state.orders.find(o => o.id === orderId);
    if (!order) {
        utils.showNotification("Could not find the order to update.", "error");
        return;
    }

    // 1. Update simpele order data
    order.customer = domElements.editCustomerSelect.value;
    order.customerOrderNr = domElements.editCustomerOrderNr.value;
    order.deadline = domElements.editDeadline.value;

    const updatedParts = [];
    const partEntries = domElements.editPartsContainer.querySelectorAll('.part-entry');

    let maxPartIndex = 0;
    order.parts.forEach(p => {
        const idParts = p.id.split('-');
        const index = parseInt(idParts[idParts.length - 1], 10);
        if (!isNaN(index) && index > maxPartIndex) {
            maxPartIndex = index;
        }
    });

    partEntries.forEach(partDiv => {
        let partId = partDiv.dataset.partId;
        let isNewPart = false;
        let originalPart = null;

        if (partId) {
            originalPart = order.parts.find(p => p.id === partId);
        } else {
            isNewPart = true;
            maxPartIndex++;
            partId = `${order.id}-${maxPartIndex}`;
        }
        
        const part = { ...(originalPart || { id: partId, isProgrammed: false }) };

        const getValue = (field) => partDiv.querySelector(`[data-field="${field}"]`)?.value;
        const getNumberValue = (field) => parseFloat(getValue(field)) || 0;
        const getIntValue = (field) => parseInt(getValue(field), 10) || 0;
        const getBoolValue = (field) => partDiv.querySelector(`[data-field="${field}"]`)?.checked;
        
        part.partName = getValue('partName');
        part.drawingNumber = getValue('drawingNumber');
        part.productionTimePerPiece = getNumberValue('productionTimePerPiece');
        part.needsPostProcessing = getBoolValue('needsPostProcessing');
        part.postProcessingDays = getIntValue('postProcessingDays');
        
        if (partDiv.classList.contains('is-new')) {
            part.materialStatus = getBoolValue('materialInStock') ? 'Available' : 'Not Available';
        }
        
        const hasBatchesDataset = partDiv.dataset.batches;
        
        if (hasBatchesDataset) {
            part.totalQuantity = getIntValue('totalQuantity');
            
            const formBatches = JSON.parse(partDiv.dataset.batches);
            const existingBatchesMap = new Map();
            if (part.batches) {
                part.batches.forEach(b => { if (b.batchId) existingBatchesMap.set(b.batchId, b); });
            }

            part.batches = formBatches.map((formBatch, index) => {
                const batchId = formBatch.batchId || `${part.id}-b${index + 1}`;
                const existingBatch = existingBatchesMap.get(batchId) || {};

                const mergedBatch = {
                    ...existingBatch, 
                    ...formBatch,    
                    batchId: batchId,
                    totalHours: (formBatch.quantity * part.productionTimePerPiece) / 60,
                    isProgrammed: part.isProgrammed 
                };

                if (!mergedBatch.status) mergedBatch.status = 'To Be Planned';
                if (!mergedBatch.shift) mergedBatch.shift = 8;
                
                return mergedBatch;
            });

        } else {
            // Fallback (dit zou niet meer mogen gebeuren)
            part.quantity = getIntValue('quantity');
            part.totalHours = (part.quantity * part.productionTimePerPiece) / 60;
            part.totalQuantity = part.quantity;
            part.batches = [{
                batchId: `${part.id}-b1`,
                quantity: part.quantity,
                deadline: part.deadline || order.deadline,
                totalHours: part.totalHours,
                status: 'To Be Planned',
                machine: null,
                startDate: null,
                shift: 8,
                isProgrammed: part.isProgrammed
            }];
        }
        
        updatedParts.push(part);
    });
    
    order.parts = updatedParts;

    // --- START CORRECTIE ---
    // Gebruik 'domElements' in plaats van 'ui.domElements'
    utils.showLoadingOverlay(domElements.loadingOverlay);
    try {
        await api.updateOrderOnBackend(order.id, order);
        utils.showNotification(`Order ${order.id} successfully updated!`, 'success');
        
        domElements.editOrderModal.classList.add('hidden');
        
        // Gebruik 'renderAll()' direct in plaats van 'ui.renderAll()'
        renderAll();
    } catch (error) {
        utils.showNotification(`Error updating order: ${error.message}`, 'error');
    } finally {
        // Gebruik 'domElements' in plaats van 'ui.domElements'
        utils.hideLoadingOverlay(domElements.loadingOverlay);
    }
    // --- EINDE CORRECTIE ---
}

// --- Private Functions (verplaatst van ui.js) ---

function openBatchSplitterModal(partFormEl) {
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

function closeBatchSplitterModal() {
    domElements.batchSplitterModal.classList.add('hidden');
    activePartFormElement = null;
}

function renderBatchRows(batches) {
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

function updateBatchValidation() {
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

function getActivePartFormElement() {
    return activePartFormElement;
}

// --- Public Functions (verplaatst van ui.js) ---

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
        <div class="col-span-full grid grid-cols-3 gap-4">
             <div class="flex items-center h-10">
                <input id="material-in-stock-${partCounter}" type="checkbox" class="part-field h-4 w-4 rounded border-gray-300 text-indigo-600" data-field="materialInStock">
                <label for="material-in-stock-${partCounter}" class="ml-2 block text-sm text-gray-900">Materiaal in stock</label>
            </div>

            <div class="flex items-center h-10">
                <input id="is-programmed-${partCounter}" type="checkbox" class="part-field h-4 w-4 rounded border-gray-300 text-indigo-600" data-field="isProgrammed">
                <label for="is-programmed-${partCounter}" class="ml-2 block text-sm text-gray-900">Programma klaar</label>
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

    const totalQuantityInput = partDiv.querySelector('[data-field="totalQuantity"]');
    totalQuantityInput.addEventListener('input', (e) => {
        const newQuantity = parseInt(e.target.value, 10) || 0;
        try {
            const batchesData = JSON.parse(partDiv.dataset.batches);
            if (batchesData.length === 1) {
                batchesData[0].quantity = newQuantity;
            }
            partDiv.dataset.batches = JSON.stringify(batchesData);
        } catch (err) {
            console.error("Kon batch-data niet bijwerken na wijziging aantal:", err);
        }
    });
}

export function openEditModal(orderId) {
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
        partHTML += `</div>`;
        
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


// --- Event Listeners (verplaatst van events.js) ---

export function initializeOrderModalEvents() {
    
    if(domElements.showNewOrderModalBtn) domElements.showNewOrderModalBtn.addEventListener('click', () => {
        domElements.addOrderForm.reset();
        domElements.partsContainer.innerHTML = '';
        createNewPartForm(domElements.partsContainer);
        domElements.newOrderModal.classList.remove('hidden');
        document.getElementById('order-id').focus();
    });
    
    if(domElements.closeNewOrderModalBtn) domElements.closeNewOrderModalBtn.addEventListener('click', () => domElements.newOrderModal.classList.add('hidden'));
    
    if(domElements.newOrderModal) domElements.newOrderModal.addEventListener('click', (e) => {
        if (e.target.id === 'new-order-modal') domElements.newOrderModal.classList.add('hidden');
    });
    
    if(domElements.addOrderForm) domElements.addOrderForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        const mainOrderId = document.getElementById('order-id').value.trim();
        if (state.orders.some(o => o.id === mainOrderId)) {
            utils.showNotification('Order number already exists.', 'error', domElements.notificationContainer);
            return;
        }
        
        const newOrder = {
            id: mainOrderId,
            customer: domElements.customerSelect.value,
            customerOrderNr: document.getElementById('customer-order-nr').value,
            deadline: document.getElementById('deadline').value,
            isUrgent: document.getElementById('is-urgent').checked,
            parts: []
        };
        
        const partForms = domElements.partsContainer.querySelectorAll('.part-entry');
        
        partForms.forEach((partForm, index) => {
            const partId = `${mainOrderId}-${index + 1}`;
            const totalQuantity = parseInt(partForm.querySelector('[data-field="totalQuantity"]').value);
            const prodTime = parseFloat(partForm.querySelector('[data-field="productionTimePerPiece"]').value) || 1;
            const batchesData = JSON.parse(partForm.dataset.batches);

            const materialStatus = partForm.querySelector('[data-field="materialInStock"]').checked ? 'Available' : 'Not Available';

            const newPart = {
                id: partId,
                partName: partForm.querySelector('[data-field="partName"]').value,
                drawingNumber: partForm.querySelector('[data-field="drawingNumber"]').value,
                productionTimePerPiece: prodTime,
                totalQuantity: totalQuantity,
                materialStatus: materialStatus,
                needsPostProcessing: partForm.querySelector('[data-field="needsPostProcessing"]').checked,
                postProcessingDays: parseInt(partForm.querySelector('[data-field="postProcessingDays"]').value) || 0,
                isProgrammed: isProgrammed,
                batches: batchesData.map((batch, batchIndex) => {
                    return {
                        batchId: `${partId}-b${batchIndex + 1}`,
                        quantity: batch.quantity,
                        deadline: batch.deadline,
                        totalHours: (batch.quantity * prodTime) / 60,
                        status: 'To Be Planned',
                        materialStatus: materialStatus,
                        machine: null,
                        startDate: null,
                        shift: 8,
                    };
                })
            };
            newOrder.parts.push(newPart);
        });

        if (newOrder.parts.length === 0) {
            utils.showNotification("Please add at least one part to the order.", "error", domElements.notificationContainer);
            return;
        }
        
        utils.showLoadingOverlay(domElements.loadingOverlay);
        try {
            await api.addOrderOnBackend(newOrder);
            state.orders.push(newOrder);
            domElements.newOrderModal.classList.add('hidden');
            renderAll();
            utils.showNotification(`Order ${newOrder.id} saved successfully!`, 'success', domElements.notificationContainer);
        } catch (error) {
            console.error("Error saving to server:", error);
            utils.showNotification(`Could not save order: ${error.message}`, "error", domElements.notificationContainer);
        } finally {
            utils.hideLoadingOverlay(domElements.loadingOverlay);
        }
    });
    
    if(domElements.addPartBtn) domElements.addPartBtn.addEventListener('click', () => {
        const mainDeadline = document.getElementById('deadline').value;
        createNewPartForm(domElements.partsContainer, mainDeadline);
    });

    const mainDeadlineInput = document.getElementById('deadline');
    if (mainDeadlineInput) {
        mainDeadlineInput.addEventListener('change', (event) => {
            const newMainDeadline = event.target.value;
            const partForms = domElements.partsContainer.querySelectorAll('.part-entry');

            partForms.forEach(partForm => {
                try {
                    const batchesData = JSON.parse(partForm.dataset.batches);
                    if (batchesData.length > 0) {
                        batchesData[0].deadline = newMainDeadline;
                    }
                    partForm.dataset.batches = JSON.stringify(batchesData);
                } catch (e) {
                    console.error("Kon batches data niet parsen of updaten", e);
                }
            });
        });
    }
    
    if (domElements.cancelEditBtn) domElements.cancelEditBtn.addEventListener('click', () => {
        domElements.editOrderModal.classList.add('hidden');
    });

    if (domElements.addPartToEditBtn) domElements.addPartToEditBtn.addEventListener('click', () => {
        createNewPartForm(domElements.editPartsContainer);
    });

    if (domElements.deleteOrderBtnInModal) {
        domElements.deleteOrderBtnInModal.addEventListener('click', () => {
            const orderId = domElements.editOrderForm.dataset.editingOrderId;
            if (!orderId) {
                utils.showNotification("Cannot find order to delete.", "error", domElements.notificationContainer);
                return;
            }
            openConfirmModal(
                'Delete Entire Order',
                `Are you sure you want to permanently delete order "${orderId}" and all its parts? This cannot be undone.`,
                async () => {
                    utils.showLoadingOverlay(domElements.loadingOverlay);
                    try {
                        await api.deleteOrderOnBackend(orderId);
                        state.orders = state.orders.filter(o => o.id !== orderId);
                        
                        domElements.editOrderModal.classList.add('hidden');
                        renderAll();
                        utils.showNotification(`Order ${orderId} has been deleted.`, 'success', domElements.notificationContainer);
                    } catch (error) {
                        utils.showNotification(`Could not delete order: ${error.message}`, 'error', domElements.notificationContainer);
                    } finally {
                        utils.hideLoadingOverlay(domElements.loadingOverlay);
                    }
                }
            );
        });
    }

    const addSplitButtonListener = (container) => {
        if (container) {
            container.addEventListener('click', (e) => {
                if (e.target.classList.contains('split-part-btn')) {
                    const partFormEl = e.target.closest('.part-entry');
                    if (partFormEl) {
                        openBatchSplitterModal(partFormEl);
                    }
                }
            });
        }
    };
    addSplitButtonListener(domElements.partsContainer);
    addSplitButtonListener(domElements.editPartsContainer);

    if (domElements.batchListContainer) {
        domElements.batchListContainer.addEventListener('input', updateBatchValidation);
        domElements.batchListContainer.addEventListener('click', (e) => {
            if (e.target.classList.contains('remove-batch-btn')) {
                e.target.closest('.batch-row').remove();
                updateBatchValidation();
            }
        });
    }

    if(domElements.addBatchRowBtn) {
        domElements.addBatchRowBtn.addEventListener('click', () => {
            const batchRow = document.createElement('div');
            batchRow.className = 'batch-row grid grid-cols-3 gap-4 items-center';
            batchRow.innerHTML = `
                <div class="col-span-1">
                    <label class="block text-xs text-gray-500">Aantal</label>
                    <input type="number" min="1" class="batch-quantity w-full border-gray-300 rounded-md" value="1">
                </div>
                <div class="col-span-1">
                    <label class="block text-xs text-gray-500">Deadline (optioneel)</label>
                    <input type="date" class="batch-deadline w-full border-gray-300 rounded-md" value="">
                </div>
                <div class="col-span-1 self-end">
                    <button type="button" class="remove-batch-btn text-red-500 hover:text-red-700 text-sm">Verwijder</button>
                </div>
            `;
            domElements.batchListContainer.appendChild(batchRow);
            updateBatchValidation();
        });
    }

    if(domElements.cancelBatchesBtn) {
        domElements.cancelBatchesBtn.addEventListener('click', closeBatchSplitterModal);
    }

    if(domElements.saveBatchesBtn) {
        domElements.saveBatchesBtn.addEventListener('click', () => {
            const currentPartForm = getActivePartFormElement();
            if (currentPartForm) {
                const batchRows = domElements.batchListContainer.querySelectorAll('.batch-row');
                const batchesData = Array.from(batchRows).map(row => ({
                    quantity: parseInt(row.querySelector('.batch-quantity').value),
                    deadline: row.querySelector('.batch-deadline').value
                }));
                currentPartForm.dataset.batches = JSON.stringify(batchesData);
                const splitBtn = currentPartForm.querySelector('.split-part-btn');
                splitBtn.textContent = `Batches (${batchesData.length})`;
                splitBtn.classList.add('font-bold', 'text-green-600');
            }
            closeBatchSplitterModal();
        });
    }

    if (domElements.editPartsContainer) {
        domElements.editPartsContainer.addEventListener('change', (e) => {
            if (e.target.dataset.field === 'needsPostProcessing') {
                const partEntry = e.target.closest('.part-entry');
                const daysContainer = partEntry.querySelector('.post-processing-days-container');
                if (daysContainer) {
                    daysContainer.classList.toggle('hidden', !e.target.checked);
                }
            }
        });
    }

    if (domElements.editOrderForm) {
        domElements.editOrderForm.addEventListener('submit', (e) => {
            e.preventDefault(); // Dit stopt de pagina-herlaad 100% zeker
            handleUpdateOrder();
        });
    }
}