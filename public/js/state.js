// js/state.js - DEFINITIEVE, GECORRIGEERDE VERSIE

import { MATERIAL_STATUS } from './constants.js';
import * as utils from './utils.js';

const STORAGE_KEY = 'planning_state_v1';

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
    expandedPartsInModal: new Set(),
    isLoadModalVisible: storedState.isLoadModalVisible || false,
    machineLoadWeek: storedState.machineLoadWeek || null,
    expandedOrders: new Set(storedState.expandedOrders || []),
    expandedParts: new Set(storedState.expandedParts || []),
    planningStartDate: new Date(),
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
         sortKey: state.sortKey,
         sortOrder: state.sortOrder,
         searchTerm: state.searchTerm,
         searchKey: state.searchKey,
     }));
}

export function getPlannableItems() {
    const items = [];
    state.orders.forEach(order => {
        (order.parts || []).forEach(part => {
            let productionDeadline = order.deadline;
            if (part.needsPostProcessing && part.postProcessingDays > 0) {
                const deadlineDate = new Date(order.deadline + 'T00:00:00');
                deadlineDate.setDate(deadlineDate.getDate() - part.postProcessingDays);
                productionDeadline = utils.formatDateToYMD(deadlineDate);
            }

            if (part.batches && part.batches.length > 0) {
                part.batches.forEach(batch => {
                    items.push({
                        ...batch,
                        id: batch.batchId,
                        isUrgent: order.isUrgent,
                        customer: order.customer,
                        partName: part.partName,
                        // --- DE GECORRIGEERDE REGEL: Gebruik de status van de BATCH, niet de PART. ---
                        materialStatus: batch.materialStatus,
                        parentId: part.id,
                        orderId: order.id,
                        productionDeadline: batch.deadline || productionDeadline
                    });
                });
            } else {
                // Legacy support voor onderdelen zonder batches
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

export function findPart(partId) {
    for (const order of state.orders) {
        if (order.parts && Array.isArray(order.parts)) {
            const foundPart = order.parts.find(p => p && p.id === partId);
            if (foundPart) return foundPart;
        }
    }
    return null;
}

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