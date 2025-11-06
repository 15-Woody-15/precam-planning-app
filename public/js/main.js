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

        // --- HIER ZIT DE CORRECTIE ---
        state.orders.forEach(order => {
            if (order.parts) {
                order.parts.forEach(part => {
                    
                    // Zorgt dat elk bestaand onderdeel het nieuwe veld krijgt
                    if (part.isProgrammed === undefined) {
                        part.isProgrammed = false;
                    }

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
                            materialStatus: part.materialStatus || 'Not Available',
                            machine: part.machine || null,
                            startDate: part.startDate || null,
                            shift: part.shift || 8
                            // Let op: isProgrammed hoort hier niet, maar op het 'part' level
                        }];
                    }
                });
            }
        });
        // --- EINDE CORRECTIE ---
        
        const today = new Date();
        const dayOfWeek = today.getDay();
        const diff = today.getDate() - dayOfWeek + (dayOfWeek === 0 ? -6 : 1); 
        state.planningStartDate = new Date(today.setDate(diff));
        state.planningStartDate.setHours(0, 0, 0, 0);
        state.machineLoadWeek = null; // Reset de weekkeuze bij elke refresh

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