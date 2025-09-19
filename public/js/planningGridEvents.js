// js/planningGridEvents.js

import { state, findPart, findBatch } from './state.js';
import * as ui from './ui.js';
import * as api from './api.js';
import * as utils from './utils.js';

export function initializePlanningGridEventListeners() {
    if (!ui.domElements.planningContainer) return;

    let lastDragOverCell = null;

    // Helper functie om alle highlights op te ruimen
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
        }
    });

    ui.domElements.planningContainer.addEventListener('dragover', (e) => {
        e.preventDefault();
        const targetCell = e.target.closest('.grid-cell');
        
        if (targetCell && targetCell !== lastDragOverCell) {
            clearAllHighlights(); // Eerst alles opruimen voor de zekerheid

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
                ui.renderAll();
                return;
            }
            
            const foundBatch = findBatch(itemId);
            const item = foundBatch ? foundBatch.batch : findPart(itemId);
            
            const newDate = targetCell.dataset.date;
            const newMachineName = targetCell.dataset.machine;
            
            if (item && newDate && newMachineName) {
                const parentOrder = state.orders.find(o => o.parts.some(p => p.id === (foundBatch ? foundBatch.part.id : item.id)));

                if (parentOrder) {
                    item.startDate = newDate;
                    item.machine = newMachineName;
                    item.status = 'Scheduled'; 
                    
                    const machineInfo = state.machines.find(m => m.name === newMachineName);
                    if (machineInfo) {
                        const is24hAllowed = machineInfo.hasRobot;
                        const is16hAllowed = machineInfo.name.includes('DMU');
                        if (item.shift === 24 && !is24hAllowed) {
                            item.shift = 8;
                            utils.showNotification("Shift reset to Day (8h): new machine has no robot.", "error", ui.domElements.notificationContainer);
                        } else if (item.shift === 16 && !is16hAllowed) {
                            item.shift = 8;
                            utils.showNotification("Shift reset to Day (8h): only DMU machines support 16h shifts.", "error", ui.domElements.notificationContainer);
                        }
                    }
                    
                    ui.renderAll();
                    
                    utils.showLoadingOverlay(ui.domElements.loadingOverlay);
                    try {
                        await api.updateOrderOnBackend(parentOrder.id, parentOrder);
                        utils.showNotification(`Order ${parentOrder.id} moved and saved!`, 'success', ui.domElements.notificationContainer);
                    } catch (error) {
                        utils.showNotification(`Synchronization error: ${error.message}`, 'error', ui.domElements.notificationContainer);
                        setTimeout(() => window.location.reload(), 2000);
                    } finally {
                        utils.hideLoadingOverlay(ui.domElements.loadingOverlay);
                    }
                }
            }
        } else {
             ui.renderAll();
        }
    });

    ui.domElements.planningContainer.addEventListener('dragend', (e) => {
        // =================== DIT IS DE TOEGEVOEGDE FIX ===================
        clearAllHighlights(); // Ruim altijd de highlights op aan het einde van een sleep-actie
        // ===============================================================
        
        if (e.target.classList.contains('order-block')) {
            setTimeout(() => {
                 e.target.classList.remove('dragging');
                 if (e.dataTransfer.dropEffect === 'none') {
                    ui.renderAll();
                 }
            }, 50);
        }
    });
}