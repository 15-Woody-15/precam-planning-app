// js/planningGridEvents.js

import { state, findPart, findBatch } from './state.js';
import * as ui from './ui.js';
import * as api from './api.js';
import * as utils from './utils.js';

export function initializePlanningGridEventListeners() {
    if (!ui.domElements.planningContainer) return;

    let lastDragOverCell = null;

    const clearAllHighlights = () => {
        const highlightedCells = ui.domElements.planningContainer.querySelectorAll('.drag-over, .drag-over-target');
        highlightedCells.forEach(cell => cell.classList.remove('drag-over', 'drag-over-target'));
        lastDragOverCell = null;
    };

    ui.domElements.planningContainer.addEventListener('dragstart', (e) => {
        if (e.target.classList.contains('order-block')) {
            e.dataTransfer.setData('text/plain', e.target.dataset.itemId);
            e.dataTransfer.effectAllowed = 'move';
            setTimeout(() => e.target.classList.add('dragging'), 0);
            if (ui.domElements.trashCanDropzone) {
                ui.domElements.trashCanDropzone.classList.remove('hidden');
            }
        }
    });

    ui.domElements.planningContainer.addEventListener('dragover', (e) => {
        e.preventDefault();
        const targetCell = e.target.closest('.grid-cell');
        
        if (targetCell && targetCell !== lastDragOverCell) {
            clearAllHighlights(); 
            const date = targetCell.dataset.date;
            const machine = targetCell.dataset.machine;

            if (date && machine) {
                const columnCells = ui.domElements.planningContainer.querySelectorAll(`.grid-cell[data-date="${date}"]`);
                columnCells.forEach(cell => cell.classList.add('drag-over'));
                const rowCells = ui.domElements.planningContainer.querySelectorAll(`.grid-cell[data-machine="${machine}"]`);
                rowCells.forEach(cell => cell.classList.add('drag-over'));
                targetCell.classList.add('drag-over-target');
            }
            lastDragOverCell = targetCell;
        }
    });

    ui.domElements.planningContainer.addEventListener('dragleave', (e) => {
        if (e.relatedTarget === null || !ui.domElements.planningContainer.contains(e.relatedTarget)) {
            clearAllHighlights();
        }
    });

    ui.domElements.planningContainer.addEventListener('drop', async (e) => {
        e.preventDefault();
        clearAllHighlights(); 
        
        const itemId = e.dataTransfer.getData('text/plain');
        const targetCell = e.target.closest('.grid-cell');

        if (itemId && targetCell) {
            if (targetCell.classList.contains('absence-cell')) {
                utils.showNotification("Cannot schedule an order during an absence period.", "error", ui.domElements.notificationContainer);
                return;
            }
            
            const context = utils.findItemContextById(itemId);
            if (!context) {
                console.error('Dropped item context not found:', itemId);
                return;
            }
            const { item, order: parentOrder } = context;
            
            const newDate = targetCell.dataset.date;
            const newMachineName = targetCell.dataset.machine;
            
            if (item && newDate && newMachineName) {
                const machineInfo = state.machines.find(m => m.name === newMachineName);
                const shiftType = targetCell.dataset.shifttype;

                if (shiftType === 'Night' && (!machineInfo || !machineInfo.hasRobot)) {
                    utils.showNotification("Kan niet in nacht plannen: machine heeft geen robot.", "error", ui.domElements.notificationContainer);
                    return;
                }
                
                item.shiftPreference = shiftType || 'Day';
                item.startDate = newDate;
                item.machine = newMachineName;
                item.status = 'Scheduled'; 
                
                if (machineInfo) {
                    const is24hAllowed = machineInfo.hasRobot;
                    const is16hAllowed = machineInfo.name.includes('DMU');
                    if (item.shift === 24 && !is24hAllowed) item.shift = 8;
                    if (item.shift === 16 && !is16hAllowed) item.shift = 8;
                }
                
                ui.renderAll();
                
                utils.showLoadingOverlay(ui.domElements.loadingOverlay);
                try {
                    await api.updateOrderOnBackend(parentOrder.id, parentOrder);
                    utils.showNotification(`Planning voor ${itemId} opgeslagen.`, 'success', ui.domElements.notificationContainer);
                } catch (error) {
                    utils.showNotification(`Synchronization error: ${error.message}`, 'error', ui.domElements.notificationContainer);
                } finally {
                    utils.hideLoadingOverlay(ui.domElements.loadingOverlay);
                }
            }
        }
    });

    ui.domElements.planningContainer.addEventListener('dragend', (e) => {
        clearAllHighlights();
        if (ui.domElements.trashCanDropzone) {
            ui.domElements.trashCanDropzone.classList.add('hidden');
            ui.domElements.trashCanDropzone.classList.remove('trash-can-active');
        }
        if (e.target.classList.contains('order-block')) {
            e.target.classList.remove('dragging');
            if (e.dataTransfer.dropEffect === 'none') {
                ui.renderAll();
            }
        }
    });

    const trashCan = ui.domElements.trashCanDropzone;
    if (trashCan) {
        trashCan.addEventListener('dragover', (e) => {
            e.preventDefault(); 
            e.dataTransfer.dropEffect = 'move';
            trashCan.classList.add('trash-can-active');
        });

        trashCan.addEventListener('dragleave', () => {
            trashCan.classList.remove('trash-can-active');
        });

        trashCan.addEventListener('drop', async (e) => {
            e.preventDefault();
            trashCan.classList.add('hidden');
            
            const itemId = e.dataTransfer.getData('text/plain');
            if (!itemId) return;

            const context = utils.findItemContextById(itemId);
            if (!context) {
                console.error("Kon item niet vinden om te wissen:", itemId);
                return;
            }
            const { item, order: parentOrder } = context;

            item.machine = null;
            item.startDate = null;
            item.status = 'To Be Planned';
            item.shiftPreference = 'Day'; // Reset preference

            utils.showLoadingOverlay(ui.domElements.loadingOverlay);
            try {
                await api.updateOrderOnBackend(parentOrder.id, parentOrder);
                utils.showNotification(`Planning voor ${itemId} gewist.`, 'success', ui.domElements.notificationContainer);
                ui.renderAll();
            } catch (error) {
                utils.showNotification(`Kon planning niet wissen: ${error.message}`, 'error', ui.domElements.notificationContainer);
            } finally {
                utils.hideLoadingOverlay(ui.domElements.loadingOverlay);
            }
        });
    }
}