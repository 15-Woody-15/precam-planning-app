import { state, findPart } from './state.js';
import * as ui from './ui.js';
import * as api from './api.js';
import * as utils from './utils.js';
import * as schedule from './schedule.js';

export function initializePlanningGridEventListeners() {
    if (!ui.domElements.planningContainer) return;

    let lastDragOverCell = null;
    ui.domElements.planningContainer.addEventListener('dragstart', (e) => {
        if (e.target.classList.contains('order-block')) {
            e.dataTransfer.setData('text/plain', e.target.dataset.partId);
            e.dataTransfer.effectAllowed = 'move';
            setTimeout(() => e.target.classList.add('dragging'), 0);
        }
    });
    ui.domElements.planningContainer.addEventListener('dragover', (e) => {
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
    ui.domElements.planningContainer.addEventListener('dragleave', (e) => {
        if (e.target.closest('.grid-cell')) {
            e.target.closest('.grid-cell').classList.remove('drag-over');
            lastDragOverCell = null;
        }
    });
    ui.domElements.planningContainer.addEventListener('drop', async (e) => {
        e.preventDefault();
        if (lastDragOverCell) lastDragOverCell.classList.remove('drag-over');
        
        const partId = e.dataTransfer.getData('text/plain');
        const targetCell = e.target.closest('.grid-cell');
        if (partId && targetCell) {
            if (targetCell.classList.contains('absence-cell')) {
                utils.showNotification("Cannot schedule an order during an absence period.", "error", ui.domElements.notificationContainer);
                ui.renderAll(); // Re-render to remove dragging artifacts
                return;
            }
            const part = findPart(partId);
            const newDate = targetCell.dataset.date;
            const newMachineName = targetCell.dataset.machine;
            
            if (part && newDate && newMachineName) {
                part.startDate = newDate;
                part.machine = newMachineName;
                
                const machineInfo = state.machines.find(m => m.name === newMachineName);
                if (machineInfo) {
                    const is24hAllowed = machineInfo.hasRobot;
                    const is16hAllowed = machineInfo.name.includes('DMU');

                    if (part.shift === 24 && !is24hAllowed) {
                        part.shift = 8;
                        utils.showNotification("Shift reset to Day (8h): new machine has no robot.", "error", ui.domElements.notificationContainer);
                    } else if (part.shift === 16 && !is16hAllowed) {
                        part.shift = 8;
                        utils.showNotification("Shift reset to Day (8h): only DMU machines support 16h shifts.", "error", ui.domElements.notificationContainer);
                    }
                }
                
                ui.renderAll();
                
                const order = state.orders.find(o => o.parts.some(p => p.id === partId));
                if (order) {
                    utils.showLoadingOverlay(ui.domElements.loadingOverlay);
                    try {
                        await api.updateOrderOnBackend(order.id, order);
                        utils.showNotification(`Order ${order.id} moved and saved!`, 'success', ui.domElements.notificationContainer);
                    } catch (error) {
                        utils.showNotification(`Synchronization error: ${error.message}`, 'error', ui.domElements.notificationContainer);
                    } finally {
                        utils.hideLoadingOverlay(ui.domElements.loadingOverlay);
                    }
                }
            }
        } else {
             ui.renderAll(); // Re-render to remove dragging artifacts if drop is invalid
        }
    });
    ui.domElements.planningContainer.addEventListener('dragend', (e) => {
        if (e.target.classList.contains('order-block')) {
            // A short delay ensures the 'drop' event has finished its re-render
            setTimeout(() => {
                 e.target.classList.remove('dragging');
                 // Optional: a full re-render ensures everything is clean if the drop was cancelled (e.g. Escape key)
                 if (e.dataTransfer.dropEffect === 'none') {
                    ui.renderAll();
                 }
            }, 50);
        }
    });
}