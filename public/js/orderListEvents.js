// js/orderListEvents.js

import { state, saveStateToLocalStorage } from './state.js';
import * as ui from './ui.js';
import * as api from './api.js';
import * as utils from './utils.js';
import * as schedule from './schedule.js';
import { findItemContext } from './utils.js'; // De nieuwe, centrale import

export function initializeOrderListEventListeners() {
    if (!ui.domElements.orderList) return;

    const debouncedCommentSave = utils.debounce(async (order, textareaElement) => {
        textareaElement.classList.add('saving');
        textareaElement.classList.remove('saved', 'error');
        try {
            const minDelay = new Promise(resolve => setTimeout(resolve, 500));
            await Promise.all([
                api.updateOrderOnBackend(order.id, order),
                minDelay
            ]);
            textareaElement.classList.remove('saving');
            textareaElement.classList.add('saved');
        } catch (error) {
            textareaElement.classList.remove('saving');
            textareaElement.classList.add('error');
            console.error("Error saving comment:", error);
        } finally {
            setTimeout(() => {
                textareaElement.classList.remove('saved', 'error');
            }, 2000);
        }
    }, 1000);

    ui.domElements.orderList.addEventListener('keyup', (e) => {
        const target = e.target;
        if (target.classList.contains('comment-input')) {
            const orderId = target.closest('tr').dataset.orderId;
            const order = state.orders.find(o => o.id === orderId);
            if (order) {
                order.comment = target.value;
                debouncedCommentSave(order, target);
            }
        }
    });

    ui.domElements.orderList.addEventListener('click', async (e) => {
        const target = e.target;
        
        // --- CONTROLEER EERST ALLE SPECIFIEKE KNOPPEN ---
        if (target.classList.contains('toggle-urgent-btn')) {
            e.stopPropagation();
            const orderId = target.dataset.orderId;
            const order = state.orders.find(o => o.id === orderId);
            if (order) {
                order.isUrgent = target.checked;
                await api.updateOrderOnBackend(order.id, order);
                ui.renderAll();
            }
            return;
        }
        
        const editOrderBtn = target.closest('.edit-order-btn');
        if(editOrderBtn){
            e.stopPropagation();
            ui.openEditModal(editOrderBtn.dataset.orderId);
            return;
        }

        const archiveBtn = target.closest('.archive-btn');
        if (archiveBtn) {
            e.stopPropagation();
            const orderId = archiveBtn.dataset.orderId;
            // Dit is de aangepaste aanroep naar de pop-up
            ui.openConfirmModal(
                'Order Archiveren',
                `Weet je zeker dat je order "${orderId}" wilt archiveren? De order wordt dan uit deze lijst verwijderd en is terug te vinden in het archief.`,
                async () => {
                    await api.archiveOrder(orderId);
                    state.orders = state.orders.filter(order => order.id !== orderId);
                    ui.renderAll();
                },
                'Ja, archiveer',    // <-- Nieuw: Tekst voor de knop
                'constructive'     // <-- Nieuw: Maakt de knop groen
            );
            return;
        }

        const commentBtn = target.closest('.comment-toggle-btn');
        if (commentBtn) {
            e.stopPropagation();
            const orderId = commentBtn.dataset.orderId;
            const commentRow = ui.domElements.orderList.querySelector(`.comment-row[data-order-id="${orderId}"]`);
            if (commentRow) {
                commentRow.classList.toggle('hidden');
                if (!commentRow.classList.contains('hidden')) {
                    commentRow.querySelector('textarea').focus();
                }
            }
            return;
        }

        // --- ALS ER GEEN KNOP IS GEKLIKT, CONTROLEER DAN PAS DE HELE RIJ ---
        const groupRow = target.closest('.order-group-row');
        if (groupRow) {
            const orderId = groupRow.dataset.orderId;
            if (orderId) {
                ui.openOrderDetailsModal(orderId);
            }
            return;
        }
    });

    if(ui.domElements.orderListThead) {
        ui.domElements.orderListThead.addEventListener('click', (e) => {
            const header = e.target.closest('.sortable-header');
            if (!header) return;
            const key = header.dataset.sortKey;
            if (state.sortKey === key) {
                state.sortOrder = state.sortOrder === 'asc' ? 'desc' : 'asc';
            } else {
                state.sortKey = key;
                state.sortOrder = 'asc';
            }
            saveStateToLocalStorage();
            ui.renderAll();
        });
    }
}