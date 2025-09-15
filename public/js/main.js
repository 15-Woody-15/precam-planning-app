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