import { state, saveStateToLocalStorage, findPart, MATERIAL_STATUS } from './state.js';
import * as ui from './ui.js';
import * as api from './api.js';
import * as utils from './utils.js';

export function initializeOrderListEventListeners() {
    // Stop als de lijst niet bestaat
    if (!ui.domElements.orderList) return;

    // --- Debounced functies specifiek voor deze lijst ---
    const debouncedSave = utils.debounce(async (part) => {
        const order = state.orders.find(o => o.parts.some(p => p.id === part.id));
        if (order) {
            try {
                await api.updateOrderOnBackend(order.id, order);
                utils.showNotification(`Changes for part ${part.id} saved!`, 'success', ui.domElements.notificationContainer);
            } catch (error) {
                utils.showNotification(`Synchronization error: ${error.message}`, 'error', ui.domElements.notificationContainer);
            }
        }
    }, 750);

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

    // --- Event Listeners ---
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

    ui.domElements.orderList.addEventListener('change', (e) => {
        const target = e.target;
        const partId = target.dataset.partId;
        if (!partId) return;
        const part = findPart(partId);
        if (!part) return;

        let needsRender = false;

        if (target.classList.contains('machine-select')) {
            part.machine = target.value;
        } else if (target.classList.contains('shift-select')) {
            part.shift = parseInt(target.value);
            needsRender = true;
        } else if (target.classList.contains('start-date-input')) {
            part.startDate = target.value;
        }

        const oldStatus = part.status;
        part.status = (part.machine && part.startDate) ? 'Scheduled' : 'To Be Planned';
        if (oldStatus !== part.status) {
            needsRender = true;
        }

        if (needsRender) {
            ui.renderAll();
        }
        
        debouncedSave(part);
    });

    ui.domElements.orderList.addEventListener('click', async (e) => {
        const target = e.target;
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
        const archiveBtn = target.closest('.archive-btn');
        if (archiveBtn) {
            e.stopPropagation();
            const orderId = archiveBtn.dataset.orderId;
            try {
                await api.archiveOrder(orderId);
                utils.showNotification('Order succesvol gearchiveerd!', 'success', ui.domElements.notificationContainer);
                state.orders = state.orders.filter(order => order.id !== orderId);
                ui.renderAll();
            } catch (error) {
                console.error("Error archiving order:", error);
                utils.showNotification('Kan order niet archiveren.', 'error', ui.domElements.notificationContainer);
            }
            return;
        }
        if (target.classList.contains('toggle-urgent-btn')) {
            e.stopPropagation();
            const orderId = target.dataset.orderId;
            const order = state.orders.find(o => o.id === orderId);
            if (order) {
                order.isUrgent = target.checked;
                ui.renderAll();
                utils.showLoadingOverlay(ui.domElements.loadingOverlay);
                try {
                    await api.updateOrderOnBackend(order.id, order);
                    utils.showNotification(`Urgent status for order ${order.id} saved!`, 'success', ui.domElements.notificationContainer);
                } catch (error) {
                    utils.showNotification(`Error saving urgent status: ${error.message}`, 'error', ui.domElements.notificationContainer);
                } finally {
                    utils.hideLoadingOverlay(ui.domElements.loadingOverlay);
                }
            }
            return;
        }
        const groupRow = target.closest('.order-group-row');
        if (groupRow && !target.closest('button, input, a')) {
            const orderId = groupRow.dataset.orderId;
            if (state.expandedOrders.has(orderId)) {
                state.expandedOrders.delete(orderId);
            } else {
                state.expandedOrders.add(orderId);
            }
            ui.renderAll();
            saveStateToLocalStorage();
            return;
        }
        const button = target.closest('button');
        if (button) {
            if (button.classList.contains('edit-order-btn')) {
                e.stopPropagation();
                const orderId = button.dataset.orderId;
                ui.openEditModal(orderId);
                return;
            }

            const partId = button.dataset.partId;
            if (!partId) return; 
            const part = findPart(partId);
            if (!part) return;

            if (button.classList.contains('delete-btn')) {
                 ui.openConfirmModal('Delete Part', `Are you sure you want to delete part "${part.id}"?`, async () => {
                    const orderContainingPart = state.orders.find(o => o.parts.some(p => p.id === part.id));
                    if (!orderContainingPart) return;
                    utils.showLoadingOverlay(ui.domElements.loadingOverlay);
                    try {
                        orderContainingPart.parts = orderContainingPart.parts.filter(p => p.id !== part.id);
                        if (orderContainingPart.parts.length === 0) {
                            state.orders = state.orders.filter(o => o.id !== orderContainingPart.id);
                            await api.deleteOrderOnBackend(orderContainingPart.id);
                            utils.showNotification(`Order ${orderContainingPart.id} deleted.`, 'success', ui.domElements.notificationContainer);
                        } else {
                            await api.updateOrderOnBackend(orderContainingPart.id, orderContainingPart);
                            utils.showNotification(`Part deleted.`, 'success', ui.domElements.notificationContainer);
                        }
                    } catch(error) {
                         utils.showNotification(`Could not delete part: ${error.message}`, 'error', ui.domElements.notificationContainer);
                    } finally {
                        ui.renderAll();
                        utils.hideLoadingOverlay(ui.domElements.loadingOverlay);
                    }
                });
                return;
            }

            if (button.classList.contains('toggle-status-btn')) {
                const parentOrder = state.orders.find(o => o.parts.some(p => p.id === partId));
                if (parentOrder) {
                    const partToToggle = parentOrder.parts.find(p => p.id === partId);
                    if (partToToggle) {
                        partToToggle.status = partToToggle.status === 'Completed' ? 'Scheduled' : 'Completed';
                        ui.renderAll();
                        utils.showLoadingOverlay(ui.domElements.loadingOverlay);
                        try {
                            await api.updateOrderOnBackend(parentOrder.id, parentOrder);
                        } catch (error) {
                            utils.showNotification(`Synchronization error: ${error.message}`, 'error', ui.domElements.notificationContainer);
                        } finally {
                            utils.hideLoadingOverlay(ui.domElements.loadingOverlay);
                        }
                    }
                }
                return;
            }
            
            if (button.classList.contains('material-status-btn')) {
                const currentIndex = MATERIAL_STATUS.indexOf(part.materialStatus);
                part.materialStatus = MATERIAL_STATUS[(currentIndex + 1) % MATERIAL_STATUS.length];
                ui.renderAll();
                debouncedSave(part);
                return;
            }
        }
        const durationCell = target.closest('.duration-cell');
        if (durationCell && !durationCell.querySelector('input')) {
            const partId = durationCell.dataset.partId;
            const part = findPart(partId);
            if (!part) return;
            const originalValue = part.productionTimePerPiece;
            durationCell.innerHTML = `<input type="number" class="w-16 text-center" value="${originalValue}" />`;
            const input = durationCell.querySelector('input');
            input.focus();
            input.select();
            const saveChange = () => {
                const newValue = parseInt(input.value);
                if (!isNaN(newValue) && newValue >= 0) {
                    part.productionTimePerPiece = newValue;
                    part.totalHours = (part.quantity * newValue) / 60;
                    ui.renderAll();
                    debouncedSave(part);
                } else {
                    ui.renderAll();
                }
            };
            input.addEventListener('blur', saveChange);
            input.addEventListener('keydown', (e) => {
                if (e.key === 'Enter') input.blur();
                else if (e.key === 'Escape') ui.renderAll();
            });
        }
    });

    if(ui.domElements.orderListThead) ui.domElements.orderListThead.addEventListener('click', (e) => {
        const header = e.target.closest('.sortable-header');
        if (!header) return;
        const key = header.dataset.sortKey;
        if (state.sortKey === key) {
            state.sortOrder = state.sortOrder === 'asc' ? 'desc' : 'asc';
        } else {
            state.sortKey = key;
            state.sortOrder = 'asc';
        }
        ui.renderAll();
    });
}