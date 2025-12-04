// js/events.js - VOLLEDIG GECORRIGEERDE VERSIE

import { state, findPart, saveStateToLocalStorage } from './state.js';
import * as ui from './ui.js'; // Blijf ui importeren voor renderAll
import { domElements } from './ui.js'; // Importeer domElements direct
import * as api from './api.js';
import * as utils from './utils.js';

// Importeer alle modal initializers
import { initializeOrderListEventListeners } from './orderListEvents.js';
import { initializePlanningGridEventListeners } from './planningGridEvents.js';
import { initializeConfirmModalEvents } from './modals/confirmModal.js';
import { initializeAbsenceModalEvents } from './modals/absenceModal.js';
import { initializeSettingsModalEvents } from './modals/settingsModal.js';
import { initializeOrderModalEvents } from './modals/orderModal.js';
import { initializeLoadModalEvents } from './modals/loadModal.js';
import { initializeDetailsModalEvents } from './modals/detailsModal.js';
import { initializeShiftModalEvents } from './modals/shiftModal.js';
import { cleanupTrashCan } from './planningGridEvents.js';
import { openConfirmModal } from './modals/confirmModal.js'; // Importeer deze voor de import/export knoppen

export function initializeEventListeners() {
    // Start alle sub-initializers
    initializeOrderListEventListeners();
    initializePlanningGridEventListeners();
    initializeConfirmModalEvents();
    initializeAbsenceModalEvents();
    initializeSettingsModalEvents();
    initializeOrderModalEvents();
    initializeLoadModalEvents();
    initializeDetailsModalEvents();
    initializeShiftModalEvents();

    // --- Dit zijn de listeners die in events.js overblijven ---
    // (Alle `ui.domElements` zijn hieronder vervangen door `domElements`)

    if (domElements.searchKey) domElements.searchKey.addEventListener('change', (e) => {
        state.searchKey = e.target.value;
        saveStateToLocalStorage();
        ui.renderAll();
    });
    if (domElements.searchInput) domElements.searchInput.addEventListener('keyup', (e) => {
        state.searchTerm = e.target.value;
        saveStateToLocalStorage();
        ui.renderAll();
    });

    if (domElements.clearDataLink) domElements.clearDataLink.addEventListener('click', (e) => {
        e.preventDefault();
        domElements.actionsDropdownMenu.classList.add('hidden');
        openConfirmModal('Clear All Data','Are you sure you want to delete ALL orders, customers, and machines? This cannot be undone.', async () => {
            utils.showLoadingOverlay(domElements.loadingOverlay);
            try {
                await Promise.all([
                    api.replaceOrdersOnBackend([]),
                    api.replaceCustomersOnBackend([]),
                    api.replaceMachinesOnBackend([])
                ]);
                state.orders = []; state.customers = []; state.machines = [];
                ui.renderAll();
                utils.showNotification('All data has been cleared.', 'success', domElements.notificationContainer);
            } catch(error) {
                utils.showNotification(`Could not clear data: ${error.message}`, 'error', domElements.notificationContainer);
            } finally {
                utils.hideLoadingOverlay(domElements.loadingOverlay);
            }
        });
    });

    if (domElements.exportDataLink) domElements.exportDataLink.addEventListener('click', async (e) => {
        e.preventDefault();
        domElements.actionsDropdownMenu.classList.add('hidden');
        utils.showLoadingOverlay(domElements.loadingOverlay);
        utils.showNotification('Preparing export...', 'success', domElements.notificationContainer);

        try {
            const activeOrders = state.orders;
            const archivedOrders = await api.fetchArchivedOrders();
            const allOrders = [...activeOrders, ...archivedOrders];
            const dataToExport = {
                orders: allOrders, 
                customers: state.customers, 
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
            utils.showNotification('Export started!', 'success', domElements.notificationContainer);
        } catch (error) {
            utils.showNotification(`Could not create export: ${error.message}`, 'error', domElements.notificationContainer);
        } finally {
            utils.hideLoadingOverlay(domElements.loadingOverlay);
        }
    });

    if (domElements.importDataLink) domElements.importDataLink.addEventListener('click', (e) => {
        e.preventDefault();
        domElements.actionsDropdownMenu.classList.add('hidden');
        domElements.importFileInput.click();
    });

    if (domElements.importFileInput) domElements.importFileInput.addEventListener('change', (e) => {
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
                    utils.showLoadingOverlay(domElements.loadingOverlay);
                    try {
                        const activeOrders = importedData.orders.filter(o => o.status !== 'Archived');
                        const correctedMachines = importedData.machines.map(m => ({
                            name: m.name, hasRobot: m.has_robot ?? m.hasRobot ?? false
                        }));
                        await Promise.all([
                           api.replaceOrdersOnBackend(importedData.orders),
                           api.replaceCustomersOnBackend(importedData.customers),
                           api.replaceMachinesOnBackend(correctedMachines)
                        ]);
                        state.orders = activeOrders;
                        state.customers = importedData.customers || [];
                        state.machines = correctedMachines || [];
                        state.expandedOrders = new Set(importedData.expandedOrders || []);
                        ui.renderAll();
                        utils.showNotification('Data imported successfully!', 'success', domElements.notificationContainer);
                    } catch (error) {
                        utils.showNotification(`Error importing data: ${error.message}`, 'error', domElements.notificationContainer);
                    } finally {
                        utils.hideLoadingOverlay(domElements.loadingOverlay);
                    }
                }, 'Yes, import', 'constructive');
            } catch (error) {
                utils.showNotification(`Error parsing file: ${error.message}`, 'error', domElements.notificationContainer);
            } finally {
                e.target.value = null;
            }
        };
        reader.readAsText(file);
    });

    if(domElements.prevWeekBtn) domElements.prevWeekBtn.addEventListener('click', () => {
        const newStartDate = new Date(state.planningStartDate);
        newStartDate.setDate(newStartDate.getDate() - 7);
        state.planningStartDate = newStartDate;
        state.machineLoadWeek = null;
        ui.renderAll();
        if(domElements.planningContainer) domElements.planningContainer.scrollLeft = 0;
    });

    if(domElements.nextWeekBtn) domElements.nextWeekBtn.addEventListener('click', () => {
        const newStartDate = new Date(state.planningStartDate);
        newStartDate.setDate(newStartDate.getDate() + 7);
        state.planningStartDate = newStartDate;
        state.machineLoadWeek = null;
        ui.renderAll();
        if(domElements.planningContainer) domElements.planningContainer.scrollLeft = 0;
    });

    if(domElements.todayBtn) domElements.todayBtn.addEventListener('click', () => {
        let today = new Date();
        today.setHours(0, 0, 0, 0);
        const dayOfWeek = today.getDay();
        const diff = today.getDate() - dayOfWeek + (dayOfWeek === 0 ? -6 : 1); 
        state.planningStartDate = new Date(today.setDate(diff)); 
        state.machineLoadWeek = null;
        ui.renderAll();
    });

    if(domElements.fullscreenBtn) domElements.fullscreenBtn.addEventListener('click', () => {
        if (!document.fullscreenElement) {
            document.documentElement.requestFullscreen().catch(err => {
                utils.showNotification(`Could not activate fullscreen: ${err.message}`, 'error', domElements.notificationContainer);
            });
        } else {
            if (document.exitFullscreen) {
                document.exitFullscreen();
            }
        }
    });

    document.addEventListener('fullscreenchange', () => {
        const { fullscreenText } = domElements;
        const enterIcon = document.getElementById('fullscreen-icon-enter');
        const exitIcon = document.getElementById('fullscreen-icon-exit');
        if (fullscreenText && enterIcon && exitIcon) {
            if (document.fullscreenElement) {
                fullscreenText.textContent = 'Exit Fullscreen';
                enterIcon.classList.add('hidden');
                exitIcon.classList.remove('hidden');
            } else {
                fullscreenText.textContent = 'Fullscreen';
                enterIcon.classList.remove('hidden');
                exitIcon.classList.add('hidden');
            }
        }
    });

    if(domElements.actionsDropdownBtn) domElements.actionsDropdownBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        domElements.actionsDropdownMenu.classList.toggle('hidden');
    });

    window.addEventListener('click', (e) => {
        if (domElements.actionsDropdownMenu && !document.getElementById('actions-dropdown-container').contains(e.target)) {
            domElements.actionsDropdownMenu.classList.add('hidden');
        }
    });

    window.addEventListener('dragend', () => {
        cleanupTrashCan(); // Deze aanroep werkt nu dankzij de import
    });
}