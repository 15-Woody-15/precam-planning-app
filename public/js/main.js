/**
 * @file main.js
 * Dit is het hoofd-script en startpunt van de applicatie.
 * Het initialiseert de modules, haalt de initiële data op en start de applicatie.
 */
import * as api from './api.js';
import { state } from './state.js';
import * as ui from './ui.js';
import { initializeEventListeners } from './events.js';
import * as utils from './utils.js';
const { domElements } = ui;

/**
 * Initialiseert de applicatie door de benodigde data op te halen van de backend,
 * de state in te stellen en de eerste weergave te renderen.
 */
async function initializeApp() {
    utils.showLoadingOverlay(ui.domElements.loadingOverlay); 
    try {
        const initialData = await api.fetchInitialData();

        state.orders = initialData.orders;
        state.customers = initialData.customers;
        state.machines = initialData.machines;
        state.absences = initialData.absences;

        state.orders.forEach(order => {
            if (order.parts) {
                order.parts.forEach(part => {
                    // Als een onderdeel geen 'batches' array heeft, is het een oud onderdeel.
                    // We zetten het om naar de nieuwe structuur.
                    if (!part.batches) {
                        console.log(`Migrating old part to new structure: ${part.id}`);
                        
                        part.totalQuantity = part.quantity || 0;
                        part.batches = [{
                            batchId: `${part.id}-b1`,
                            quantity: part.quantity || 0,
                            deadline: part.deadline || order.deadline,
                            totalHours: part.totalHours || 0,
                            status: part.status || 'To Be Planned',
                            
                            // --- VOEG DEZE REGEL TOE ---
                            materialStatus: part.materialStatus || 'Not Available',
                            // --- EINDE TOEGEVOEGDE REGEL ---

                            machine: part.machine || null,
                            startDate: part.startDate || null,
                            shift: part.shift || 8
                        }];
                    }
                });
            }
        });
        
        const today = new Date();
        const dayOfWeek = today.getDay();
        const diff = today.getDate() - dayOfWeek + (dayOfWeek === 0 ? -6 : 1); 
        state.planningStartDate = new Date(today.setDate(diff));
        state.planningStartDate.setHours(0, 0, 0, 0);

        ui.renderAll();

    } catch (error) {
        console.error("Fout bij het initialiseren van de app:", error);
        utils.showNotification("Kon niet verbinden met de backend.", "error", ui.domElements.notificationContainer);
    } finally {
        utils.hideLoadingOverlay(ui.domElements.loadingOverlay);
    }
}

/**
 * Wacht tot de DOM volledig geladen is en start dan de applicatie.
 */
document.addEventListener('DOMContentLoaded', () => {
    ui.initializeDOMElements();
    initializeEventListeners();
    initializeApp();
});

// Deze functie zou in je events.js of main.js bestand moeten komen,
// als onderdeel van de event listener voor de 'save-order-btn'.

export async function handleUpdateOrder() {
    const orderId = domElements.editOrderForm.dataset.editingOrderId;
    const order = state.orders.find(o => o.id === orderId);
    if (!order) {
        utils.showNotification("Could not find the order to update.", "error");
        return;
    }

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
        let part;

        if (partId) {
            part = order.parts.find(p => p.id === partId);
        } else {
            isNewPart = true;
            maxPartIndex++;
            partId = `${order.id}-${maxPartIndex}`;
            part = { id: partId, batches: [] };
        }

        if (!part) return;

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
            part.batches = JSON.parse(hasBatchesDataset);
            
            // =================== DIT IS DE TOEGEVOEGDE FIX ===================
            // Als het een nieuw onderdeel is met maar één standaard batch,
            // synchroniseer de hoeveelheid van die batch met de totale hoeveelheid.
            if (isNewPart && part.batches.length === 1) {
                part.batches[0].quantity = part.totalQuantity;
            }
            // ===============================================================

            part.batches.forEach((batch, index) => {
                batch.totalHours = (batch.quantity * part.productionTimePerPiece) / 60;
                if (!batch.status) batch.status = 'To Be Planned';
                if (!batch.shift) batch.shift = 8;
                if (!batch.batchId) batch.batchId = `${part.id}-b${index + 1}`;
            });
        } else {
            // Fallback voor eventuele oude onderdelen zonder batch-structuur
            part.quantity = getIntValue('quantity');
            part.totalHours = (part.quantity * part.productionTimePerPiece) / 60;
            part.totalQuantity = part.quantity;
            part.batches = [{
                batchId: `${part.id}-b1`,
                quantity: part.quantity,
                deadline: part.deadline || order.deadline,
                totalHours: part.totalHours,
                status: part.status || 'To Be Planned',
                machine: part.machine || null,
                startDate: part.startDate || null,
                shift: part.shift || 8
            }];
        }
        
        updatedParts.push(part);
    });
    
    order.parts = updatedParts;

    utils.showLoadingOverlay(ui.domElements.loadingOverlay);
    try {
        await api.updateOrderOnBackend(order.id, order);
        utils.showNotification(`Order ${order.id} successfully updated!`, 'success');
        domElements.editOrderModal.classList.add('hidden');
        ui.renderAll();
    } catch (error) {
        utils.showNotification(`Error updating order: ${error.message}`, 'error');
    } finally {
        utils.hideLoadingOverlay(ui.domElements.loadingOverlay);
    }
}