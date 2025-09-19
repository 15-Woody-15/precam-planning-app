// js/state.js

import { MATERIAL_STATUS } from './constants.js';
import * as utils from './utils.js';

const STORAGE_KEY = 'planning_state_v1';

// Helper functie om de opgeslagen state te laden
const getStoredState = () => {
    try {
        const stored = localStorage.getItem(STORAGE_KEY);
        return stored ? JSON.parse(stored) : {};
    } catch (e) {
        console.error("Could not parse stored state:", e);
        return {};
    }
};

const storedState = getStoredState();

export let state = {
    orders: [],
    customers: [],
    machines: [],
    absences: [],
    isLoadModalVisible: storedState.isLoadModalVisible || false,
    machineLoadWeek: storedState.machineLoadWeek || null,
    expandedOrders: new Set(storedState.expandedOrders || []),
    expandedParts: new Set(storedState.expandedParts || []),
    planningStartDate: new Date(),
    // --- AANPASSING 1: Laad de waarden uit localStorage, of gebruik de standaardwaarde ---
    sortKey: storedState.sortKey || 'deadline',
    sortOrder: storedState.sortOrder || 'asc',
    searchTerm: storedState.searchTerm || '',
    searchKey: storedState.searchKey || 'customerOrderNr',
};

export function saveStateToLocalStorage() {
     localStorage.setItem(STORAGE_KEY, JSON.stringify({
         isLoadModalVisible: state.isLoadModalVisible,
         machineLoadWeek: state.machineLoadWeek,
         expandedOrders: [...state.expandedOrders],
         expandedParts: [...state.expandedParts],
         // --- AANPASSING 2: Sla de nieuwe waarden ook op ---
         sortKey: state.sortKey,
         sortOrder: state.sortOrder,
         searchTerm: state.searchTerm,
         searchKey: state.searchKey,
     }));
}

/**
 * Maakt een platte lijst van alle planbare items (zowel oude parts als nieuwe batches).
 * Dit is de basis voor de plannings- en renderlogica.
 * @returns {Array<object>} Een lijst met planbare items.
 */
export function getPlannableItems() {
    const items = [];
    state.orders.forEach(order => {
        order.parts.forEach(part => {
            // =================== DIT IS DE NIEUWE LOGICA ===================
            // Bereken de interne productiedeadline op basis van nabehandeling.
            let productionDeadline = order.deadline;
            if (part.needsPostProcessing && part.postProcessingDays > 0) {
                const deadlineDate = new Date(order.deadline + 'T00:00:00');
                deadlineDate.setDate(deadlineDate.getDate() - part.postProcessingDays);
                productionDeadline = utils.formatDateToYMD(deadlineDate);
            }
            // =============================================================

            if (part.batches && part.batches.length > 0) {
                part.batches.forEach(batch => {
                    items.push({
                        ...batch,
                        id: batch.batchId,
                        isUrgent: order.isUrgent,
                        customer: order.customer,
                        partName: part.partName,
                        materialStatus: part.materialStatus,
                        parentId: part.id,
                        orderId: order.id,
                        productionDeadline: batch.deadline || productionDeadline // Gebruik batch-specifieke deadline indien aanwezig
                    });
                });
            } else {
                items.push({
                    ...part,
                    isUrgent: order.isUrgent,
                    customer: order.customer,
                    orderId: order.id,
                    productionDeadline: productionDeadline
                });
            }
        });
    });
    return items;
}


/**
 * Zoekt een specifiek bovenliggend onderdeel.
 * @param {string} partId - De ID van het onderdeel.
 * @returns {object|null}
 */
export function findPart(partId) {
    for (const order of state.orders) {
        // Voeg een check toe om 'null' waarden in de parts-array te negeren
        if (order.parts && Array.isArray(order.parts)) {
            const foundPart = order.parts.find(p => p && p.id === partId);
            if (foundPart) return foundPart;
        }
    }
    return null;
}

/**
 * Zoekt een specifieke batch.
 * @param {string} batchId - De ID van de batch.
 * @returns {{part: object, batch: object}|null}
 */
export function findBatch(batchId) {
    for (const order of state.orders) {
        for (const part of order.parts) {
            if (part.batches && Array.isArray(part.batches)) {
                const foundBatch = part.batches.find(b => b.batchId === batchId);
                if (foundBatch) {
                    return { part, batch: foundBatch };
                }
            }
        }
    }
    return null;
}