// js/orderListEvents.js

import { state, saveStateToLocalStorage } from './state.js';
// Dit is de correcte, volledige import-lijst voor ui.js
import { domElements, renderAll, renderCustomerDropdown } from './ui.js';
import * as api from './api.js';
import * as utils from './utils.js';
import { findItemContext } from './utils.js';
// Dit zijn de imports voor de modals die we aanroepen
import { openConfirmModal } from './modals/confirmModal.js';
import { openEditModal } from './modals/orderModal.js';
import { openOrderDetailsModal } from './modals/detailsModal.js';


export function initializeOrderListEventListeners() {
    // 'ui.' prefix is hier en overal hieronder verwijderd
    if (!domElements.orderList) return;

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

    domElements.orderList.addEventListener('input', (e) => {
        const target = e.target; // Dit is de <textarea>
        if (target.classList.contains('comment-input')) {
            const commentRow = target.closest('tr');
            const orderId = commentRow.dataset.orderId;
            const order = state.orders.find(o => o.id === orderId);
            
            if (order) {
                // Sla de comment op
                order.comment = target.value;
                debouncedCommentSave(order, target);

                // --- DIT IS DE OPLOSSING MET TWEE ICONEN ---

                // 1. Vind de header-rij via zijn unieke data-attribuut
                const headerRow = domElements.orderList.querySelector(`tr.order-group-row[data-order-id="${orderId}"]`);

                if (headerRow) {
                    const commentBtn = headerRow.querySelector('.comment-toggle-btn');
                    if (commentBtn) {
                        const hasComment = order.comment && order.comment.trim() !== '';

                        // 2. Vind de iconen *binnen* de knop
                        const iconEmpty = commentBtn.querySelector('.icon-empty');
                        const iconFilled = commentBtn.querySelector('.icon-filled');

                        if (iconEmpty && iconFilled) {
                            // 3. Wissel de 'hidden' klasse
                            iconEmpty.classList.toggle('hidden', hasComment);
                            iconFilled.classList.toggle('hidden', !hasComment);
                        }

                        // 4. Update de titel
                        if (hasComment) {
                            commentBtn.title = 'Bekijk/wijzig opmnerking';
                        } else {
                            commentBtn.title = 'Voeg opmerking toe';
                        }
                    }
                }
                // --- EINDE OPLOSSING ---
            }
        }
    });

    domElements.orderList.addEventListener('click', async (e) => {
        const target = e.target;
        // console.log("Geklikt element:", target); // Debug-regel is nu verwijderd

        // --- CONTROLEER EERST ALLE SPECIFIEKE KNOPPEN ---
        
        // 1. Urgentie-knop
        if (target.classList.contains('toggle-urgent-btn')) {
            e.stopPropagation();
            const orderId = target.dataset.orderId;
            const order = state.orders.find(o => o.id === orderId);
            if (order) {
                order.isUrgent = target.checked;
                await api.updateOrderOnBackend(order.id, order);
                renderAll();
            }
            return;
        }
        
        // 2. Edit-knop
        const editOrderBtn = target.closest('.edit-order-btn');
        if(editOrderBtn){
            e.stopPropagation();
            renderCustomerDropdown(); 
            openEditModal(editOrderBtn.dataset.orderId);
            return;
        }

        // 3. Archiveer-knop
        const archiveBtn = target.closest('.archive-btn');
        if (archiveBtn) {
            e.stopPropagation();
            const orderId = archiveBtn.dataset.orderId;
            openConfirmModal(
                'Order Archiveren',
                `Weet je zeker dat je order "${orderId}" wilt archiveren? De order wordt dan uit deze lijst verwijderd en is terug te vinden in het archief.`,
                async () => {
                    await api.archiveOrder(orderId);
                    state.orders = state.orders.filter(order => order.id !== orderId);
                    renderAll();
                },
                'Ja, archiveer',
                'constructive'
            );
            return;
        }

        // --- DIT IS DE NIEUWE, GECORRIGEERDE LOGICA VOOR DE COMMENTAAR-KNOP ---
        // 4. Commentaar-knop
        const commentBtn = target.closest('.comment-toggle-btn');
        if (commentBtn) {
            e.stopPropagation();
            
            // 1. Vind de rij waar de knop in leeft
            const headerRow = commentBtn.closest('.order-group-row');
            if (!headerRow) return; // Veiligheidscheck

            // 2. De commentaar-rij is de *volgende* rij in de tabel
            const commentRow = headerRow.nextElementSibling;
            
            if (commentRow && commentRow.classList.contains('comment-row')) {
                commentRow.classList.toggle('hidden');
                if (!commentRow.classList.contains('hidden')) {
                    commentRow.querySelector('textarea').focus();
                }
            }
            return;
        }
        // --- EINDE NIEUWE LOGICA ---


        // 5. Als er op geen enkele knop is geklikt, open de details-modal
        const groupRow = target.closest('.order-group-row');
        if (groupRow) {
            const orderId = groupRow.dataset.orderId;
            if (orderId) {
                openOrderDetailsModal(orderId);
            }
            return;
        }
    });

    if(domElements.orderListThead) {
        domElements.orderListThead.addEventListener('click', (e) => {
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
            renderAll();
        });
    }
}