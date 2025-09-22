// js/utils.js

import { state, findPart, findBatch } from './state.js';

export function findItemContext(targetElement) {
    const dataElement = targetElement.closest('[data-batch-id], [data-part-id]');
    if (!dataElement) return null;
    const { batchId, partId } = dataElement.dataset;
    let item, parentPart, parentOrder;
    if (batchId) {
        const found = findBatch(batchId);
        if (!found) return null;
        item = found.batch;
        parentPart = found.part;
        parentOrder = state.orders.find(o => o.parts.some(p => p && p.id === parentPart.id));
    } else if (partId) {
        item = findPart(partId);
        if (!item) return null;
        parentPart = item;
        parentOrder = state.orders.find(o => o.parts.some(p => p && p.id === partId));
    }
    if (!item || !parentOrder) return null;
    return { item, part: parentPart, order: parentOrder };
}

/**
 * Toont een laad-overlay op de pagina.
 * @param {HTMLElement} loadingOverlay - Het overlay-element dat getoond moet worden.
 */
export function showLoadingOverlay(loadingOverlay) {
    if (loadingOverlay) loadingOverlay.classList.remove('hidden');
}

/**
 * Verbergt een laad-overlay op de pagina.
 * @param {HTMLElement} loadingOverlay - Het overlay-element dat verborgen moet worden.
 */
export function hideLoadingOverlay(loadingOverlay) {
    if (loadingOverlay) loadingOverlay.classList.add('hidden');
}

/**
 * Formatteert een Date-object of datum-string naar "YYYY-MM-DD".
 * @param {Date|string} date - De datum om te formatteren.
 * @returns {string} De geformatteerde datum-string.
 */
export const formatDateToYMD = (date) => {
    if (!date) return '';
    const d = new Date(date);
    const year = d.getFullYear();
    const month = (d.getMonth() + 1).toString().padStart(2, '0');
    const day = d.getDate().toString().padStart(2, '0');
    return `${year}-${month}-${day}`;
};

/**
 * Berekent het weeknummer van een gegeven datum.
 * @param {Date} d - De datum.
 * @returns {number} Het weeknummer.
 */
export const getWeekNumber = (d) => {
    d = new Date(Date.UTC(d.getFullYear(), d.getMonth(), d.getDate()));
    d.setUTCDate(d.getUTCDate() + 4 - (d.getUTCDay() || 7));
    const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
    const weekNo = Math.ceil((((d - yearStart) / 86400000) + 1) / 7);
    return weekNo;
};

/**
 * Toont een notificatiebericht op het scherm.
 * @param {string} message - Het bericht dat getoond moet worden.
 * @param {'success'|'error'} type - Het type notificatie ('success' of 'error').
 * @param {HTMLElement} container - De container waarin de notificatie moet verschijnen.
 */
export function showNotification(message, type = 'success', container) {
    if (!container) return;
    const notification = document.createElement('div');
    notification.className = `notification ${type}`;
    notification.textContent = message;
    container.appendChild(notification);
    setTimeout(() => {
        notification.classList.add('hiding');
        notification.addEventListener('transitionend', () => notification.remove());
    }, 3000);
}

/**
 * Haalt de totale productieduur in uren op van een planbaar item (part of batch).
 * @param {object} item - Het onderdeel- of batch-object.
 * @returns {number} De totale duur in uren.
 */
export const getPartDuration = (item) => item.totalHours || 0;

/**
 * Creëert een "debounced" versie van een functie die pas wordt uitgevoerd na een bepaalde tijd van inactiviteit.
 * @param {Function} func - De functie die gedebounced moet worden.
 * @param {number} timeout - De wachttijd in milliseconden.
 * @returns {Function} De nieuwe, gedebounced functie.
 */
export function debounce(func, timeout = 750) {
  let timer;
  return (...args) => {
    clearTimeout(timer);
    timer = setTimeout(() => { func.apply(this, args); }, timeout);
  };
}

/**
 * Bepaalt de overkoepelende status van een order op basis van de status van de planbare items.
 * @param {object} order - Het order-object.
 * @returns {string} De algemene orderstatus.
 */
export function getOverallOrderStatus(order) {
    // Maakt een lijst van alle planbare items: batches als die er zijn, anders het onderdeel zelf.
    const plannableItems = order.parts.flatMap(p => (p.batches && p.batches.length > 0) ? p.batches : [p]);
    
    if (plannableItems.length === 0) return 'Empty';

    const statuses = plannableItems.map(item => item.status);
    
    if (statuses.every(s => s === 'Completed')) return 'Completed';
    if (statuses.some(s => s === 'Scheduled' || s === 'In Production')) return 'In Production';
    
    return 'To Be Planned';
}

export function findItemContextById(itemId) {
    for (const order of state.orders) {
        for (const part of order.parts) {
            // Check for legacy parts without batches
            if (part.id === itemId && (!part.batches || part.batches.length === 0)) {
                return { order, part, item: part };
            }
            // Check batches
            if (part.batches) {
                for (const batch of part.batches) {
                    if (batch.batchId === itemId) {
                        return { order, part, item: batch };
                    }
                }
            }
        }
    }
    return null;
}