// js/planningGridEvents.js

import { state } from './state.js';
import { domElements, renderAll } from './ui.js'; // Correcte import
import { openOrderDetailsModal } from './modals/detailsModal.js';
import { openShiftModal, closeShiftModal } from './modals/shiftModal.js'; // <-- VOEG DEZE IMPORT TOE
import * as api from './api.js';
import * as utils from './utils.js';
import { MATERIAL_STATUS } from './constants.js';

// --- VOEG DEZE VARIABELEN TOE ---
let clickTimer = null;
const clickDelay = 250; // 250ms wachten om een dubbelklik te detecteren
let trashCanTimer = null; // <-- NIEUW: De timer voor de vuilnisbak
const trashCanTimeout = 5000; // 5 seconden
// --- EINDE TOEVOEGING ---

// Functie om de vuilnisbak en timer op te schonen
export function cleanupTrashCan() {
// ...
    if (trashCanTimer) {
        clearTimeout(trashCanTimer);
        trashCanTimer = null;
    }
    if (domElements.trashCanDropzone) {
        domElements.trashCanDropzone.classList.add('hidden');
        domElements.trashCanDropzone.classList.remove('trash-can-active');
    }
}

export function initializePlanningGridEventListeners() {
    // 'ui.' is hier en overal verwijderd
    if (!domElements.planningContainer) return;

    // --- VERVANG DE OUDE 'click' LISTENER MET DEZE ---
    domElements.planningContainer.addEventListener('click', (e) => {
        // Sluit eerst het shift-menu als het open is
        closeShiftModal();

        const targetBlock = e.target.closest('.order-block');
        if (!targetBlock) return;

        // Stop de event-bubbling om te voorkomen dat de window-listener het menu sluit
        e.stopPropagation();

        const itemId = targetBlock.dataset.itemId;
        const context = utils.findItemContextById(itemId);
        if (!context) return;

        // --- NIEUWE ENKELE/DUBBELE KLIK LOGICA ---
        if (clickTimer) {
            // Dit is de TWEEDE klik (binnen 250ms), dus een dubbelklik
            clearTimeout(clickTimer);
            clickTimer = null;

            // --- DUBBELKLIK ACTIE: Open de grote details modal ---
            openOrderDetailsModal(context.order.id, itemId);
            // --- EINDE DUBBELKLIK ---

        } else {
            // Dit is de EERSTE klik
            clickTimer = setTimeout(() => {
                // De timer is verlopen, het was maar een enkele klik

                // --- ENKELE KLIK ACTIE: Open de shift-contextmenu ---
                openShiftModal(context.item, context.part, context.order, e);
                // --- EINDE ENKELE KLIK ---

                clickTimer = null; // Reset de timer
            }, clickDelay);
        }
        // --- EINDE NIEUWE LOGICA ---
    });

    let lastDragOverCell = null;

    const clearAllHighlights = () => {
        const highlightedCells = domElements.planningContainer.querySelectorAll('.drag-over, .drag-over-target');
        highlightedCells.forEach(cell => cell.classList.remove('drag-over', 'drag-over-target'));
        lastDragOverCell = null;
    };

    domElements.planningContainer.addEventListener('dragstart', (e) => {
        if (e.target.classList.contains('order-block')) {
            e.dataTransfer.setData('text/plain', e.target.dataset.itemId);
            e.dataTransfer.effectAllowed = 'move';
            setTimeout(() => e.target.classList.add('dragging'), 0);
            
            // --- CORRECTIE HIER: Gebruik 'domElements' ---
            if (domElements.trashCanDropzone) {
                domElements.trashCanDropzone.classList.remove('hidden');
                
                if (trashCanTimer) clearTimeout(trashCanTimer);
                
                trashCanTimer = setTimeout(() => {
                    domElements.trashCanDropzone.classList.add('hidden');
                    domElements.trashCanDropzone.classList.remove('trash-can-active');
                }, trashCanTimeout);
            }
            // --- EINDE CORRECTIE ---
        }
    });

    domElements.planningContainer.addEventListener('dragover', (e) => {
        e.preventDefault();
        const targetCell = e.target.closest('.grid-cell');
        
        if (targetCell && targetCell !== lastDragOverCell) {
            clearAllHighlights(); 
            const date = targetCell.dataset.date;
            const machine = targetCell.dataset.machine;

            if (date && machine) {
                const columnCells = domElements.planningContainer.querySelectorAll(`.grid-cell[data-date="${date}"]`);
                columnCells.forEach(cell => cell.classList.add('drag-over'));
                const rowCells = domElements.planningContainer.querySelectorAll(`.grid-cell[data-machine="${machine}"]`);
                rowCells.forEach(cell => cell.classList.add('drag-over'));
                targetCell.classList.add('drag-over-target');
            }
            lastDragOverCell = targetCell;
        }
    });

    domElements.planningContainer.addEventListener('dragleave', (e) => {
        if (e.relatedTarget === null || !domElements.planningContainer.contains(e.relatedTarget)) {
            clearAllHighlights();
        }
    });

    domElements.planningContainer.addEventListener('drop', async (e) => {
    e.preventDefault();
    clearAllHighlights();

    cleanupTrashCan(); // <-- ROEP DE CENTRALE CLEANUP HIER AAN

    const itemId = e.dataTransfer.getData('text/plain');
        const targetCell = e.target.closest('.grid-cell');

        if (itemId && targetCell) {
            if (targetCell.classList.contains('absence-cell')) {
                utils.showNotification("Cannot schedule an order during an absence period.", "error", domElements.notificationContainer);
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
                item.startDate = newDate;
                item.machine = newMachineName;
                item.status = 'Scheduled'; 
                
                renderAll();
                
                utils.showLoadingOverlay(domElements.loadingOverlay);
                try {
                    await api.updateOrderOnBackend(parentOrder.id, parentOrder);
                    utils.showNotification(`Planning voor ${itemId} opgeslagen.`, 'success', domElements.notificationContainer);
                } catch (error) {
                    utils.showNotification(`Synchronization error: ${error.message}`, 'error', domElements.notificationContainer);
                } finally {
                    utils.hideLoadingOverlay(domElements.loadingOverlay);
                }
            }
        }
    });

    domElements.planningContainer.addEventListener('dragend', (e) => {
        // Laat de nieuwe, globale listener dit regelen
        clearAllHighlights();

        if (e.target.classList.contains('order-block')) {
            e.target.classList.remove('dragging');
            if (e.dataTransfer.dropEffect === 'none') {
                renderAll(); 
            }
        }
    });

    const trashCan = domElements.trashCanDropzone;
    if (trashCan) {
        trashCan.addEventListener('dragover', (e) => {
            e.preventDefault(); 
            e.dataTransfer.dropEffect = 'move';
            trashCan.classList.add('trash-can-active');
        });

        trashCan.addEventListener('dragleave', (e) => {
            trashCan.classList.remove('trash-can-active');
            // Zorg dat de visuele markering op de knop verdwijnt
        });

        trashCan.addEventListener('drop', async (e) => {
        e.preventDefault();

        cleanupTrashCan(); // <-- ROEP DE CENTRALE CLEANUP HIER AAN

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

            utils.showLoadingOverlay(domElements.loadingOverlay); // 'domElements' i.p.v. 'ui.domElements'
            try {
                await api.updateOrderOnBackend(parentOrder.id, parentOrder);
                utils.showNotification(`Planning voor ${itemId} gewist.`, 'success', domElements.notificationContainer);
                renderAll(); // 'renderAll' i.p.v. 'ui.renderAll'
            } catch (error) {
                utils.showNotification(`Kon planning niet wissen: ${error.message}`, 'error', domElements.notificationContainer);
            } finally {
                utils.hideLoadingOverlay(domElements.loadingOverlay); // 'domElements' i.p.v. 'ui.domElements'
            }
        });
    }
}