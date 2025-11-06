// js/modals/shiftModal.js

import { domElements, renderAll } from '../ui.js';
import { state } from '../state.js';
import * as api from '../api.js';
import * as utils from '../utils.js';

let activeItem = null;
let activeOrder = null;

/**
 * Opent de shift-contextmenu op de geklikte positie.
 * @param {object} item - De batch/part
 * @param {object} part - Het bovenliggende onderdeel
 * @param {object} order - De bovenliggende order
 * @param {MouseEvent} clickEvent - De originele klik-event voor positionering
 */
export function openShiftModal(item, part, order, clickEvent) {
    activeItem = item;
    activeOrder = order;

    const menu = domElements.shiftContextMenu;
    const title = domElements.shiftMenuTitle;
    const optionsContainer = domElements.shiftMenuOptions;

    if (!menu || !title || !optionsContainer) return;

    // Stel titel in
    title.textContent = `Set Shift: ${item.id || item.batchId}`;

    // Bepaal machine-capaciteiten
    const machine = state.machines.find(m => m.name === item.machine);
    let allowedShifts = [8]; // 8 uur is altijd toegestaan
    if (machine) {
        if (machine.name.includes('DMU')) allowedShifts.push(16);
        if (machine.hasRobot) {
            if (!allowedShifts.includes(16)) allowedShifts.push(16);
            allowedShifts.push(24);
        }
    }

    // Maak de knoppen
    optionsContainer.innerHTML = '';
    allowedShifts.forEach(shiftValue => {
        const btn = document.createElement('button');
        btn.dataset.shift = shiftValue;

        let shiftText = `${shiftValue}h (Dag)`;
        if (shiftValue === 16) shiftText = `${shiftValue}h (Dag+Nacht)`;
        if (shiftValue === 24) shiftText = `${shiftValue}h (Continu)`;

        btn.textContent = shiftText;

        if (item.shift === shiftValue) {
            btn.classList.add('active-shift');
        }
        optionsContainer.appendChild(btn);
    });

    // Positioneer en toon het menu
    menu.classList.remove('hidden');

    // Zorg dat het menu binnen het scherm valt
    const menuWidth = menu.offsetWidth;
    const menuHeight = menu.offsetHeight;
    const screenWidth = window.innerWidth;
    const screenHeight = window.innerHeight;

    let left = clickEvent.clientX;
    let top = clickEvent.clientY;

    if (left + menuWidth > screenWidth) {
        left = screenWidth - menuWidth - 10;
    }
    if (top + menuHeight > screenHeight) {
        top = screenHeight - menuHeight - 10;
    }

    menu.style.left = `${left}px`;
    menu.style.top = `${top}px`;
}

/**
 * Sluit het shift-contextmenu.
 */
export function closeShiftModal() {
    if (domElements.shiftContextMenu) {
        domElements.shiftContextMenu.classList.add('hidden');
    }
    activeItem = null;
    activeOrder = null;
}

/**
 * Initialiseert de event listeners voor het shift-contextmenu.
 */
export function initializeShiftModalEvents() {
    // Klik op een shift-optie
    if (domElements.shiftMenuOptions) {
        domElements.shiftMenuOptions.addEventListener('click', async (e) => {
            const target = e.target.closest('button');
            if (target && activeItem && activeOrder) {
                const newShift = parseInt(target.dataset.shift, 10);

                if (activeItem.shift !== newShift) {
                    activeItem.shift = newShift;

                    utils.showLoadingOverlay(domElements.loadingOverlay);
                    try {
                        await api.updateOrderOnBackend(activeOrder.id, activeOrder);
                        utils.showNotification(`Shift voor ${activeItem.id} ingesteld op ${newShift}u.`, 'success', domElements.notificationContainer);
                        renderAll();
                    } catch (error) {
                        utils.showNotification(`Kon shift niet opslaan: ${error.message}`, 'error', domElements.notificationContainer);
                    } finally {
                        utils.hideLoadingOverlay(domElements.loadingOverlay);
                    }
                }
                closeShiftModal();
            }
        });
    }

    // Sluit-knop (X)
    if (domElements.shiftMenuClose) {
        domElements.shiftMenuClose.addEventListener('click', closeShiftModal);
    }

    // Klik buiten het menu om het te sluiten
    window.addEventListener('click', (e) => {
        if (domElements.shiftContextMenu && !domElements.shiftContextMenu.classList.contains('hidden')) {
            const target = e.target;
            // Sluit als we *buiten* het menu klikken EN *niet* op een order-blok
            // (want dat wordt afgehandeld door de planningGrid-listener)
            if (!domElements.shiftContextMenu.contains(target) && !target.closest('.order-block')) {
                closeShiftModal();
            }
        }
    });
}