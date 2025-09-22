import { state, findPart, findBatch, saveStateToLocalStorage } from './state.js';
import * as ui from './ui.js';
import * as api from './api.js';
import * as utils from './utils.js';
import * as absences from './absences.js';
import * as schedule from './schedule.js';
import { handleUpdateOrder } from './main.js';
import { findItemContext } from './utils.js';
const { domElements } = ui;

import { initializeOrderListEventListeners } from './orderListEvents.js';
import { initializePlanningGridEventListeners } from './planningGridEvents.js';

// js/events.js

export function initializeEventListeners() {
    initializeOrderListEventListeners();
    initializePlanningGridEventListeners();

    if (domElements.orderDetailsContent) {
        let draggedItemElement = null;
        let dragPreviewElement = null;

        domElements.orderDetailsContent.addEventListener('dragstart', (e) => {
            const target = e.target;
            if (!target.classList.contains('draggable-row')) {
                e.preventDefault();
                return;
            }
            draggedItemElement = target;
            const context = findItemContext(target);

            if (context && context.item) {
                const itemId = context.item.batchId || context.item.id;
                e.dataTransfer.setData('text/plain', itemId);
                e.dataTransfer.effectAllowed = 'move';

                dragPreviewElement = document.createElement('div');
                dragPreviewElement.className = 'drag-preview';
                dragPreviewElement.textContent = `${context.part.partName} (${itemId})`;
                document.body.appendChild(dragPreviewElement);
                e.dataTransfer.setDragImage(dragPreviewElement, 20, 20);

                setTimeout(() => {
                    domElements.orderDetailsModal.classList.add('hidden');
                    document.body.classList.remove('no-scroll');
                    if (draggedItemElement) draggedItemElement.classList.add('dragging');
                }, 0);
            }
        });

        domElements.orderDetailsContent.addEventListener('dragend', (e) => {
            if (draggedItemElement) {
                draggedItemElement.classList.remove('dragging');
                draggedItemElement = null;
            }
            if (dragPreviewElement) {
                dragPreviewElement.remove();
                dragPreviewElement = null;
            }
        });

        domElements.orderDetailsContent.addEventListener('change', async (e) => {
            const target = e.target;
            const context = findItemContext(target);
            if (!context) return;
            
            const { item, order: parentOrder } = context;
            const row = target.closest('tr');
            if (!row) return;

            let shouldUpdateAndRender = false;

            // NIEUW: Sla wijzigingen in de materiaalstatus op
            if (target.classList.contains('material-status-select')) {
                item.materialStatus = target.value;
                shouldUpdateAndRender = true;
            }

            if (target.classList.contains('shift-select')) {
                item.shift = parseInt(target.value, 10);
                shouldUpdateAndRender = true;
            }

            if (target.classList.contains('start-date-input')) {
                item.startDate = target.value;
                item.status = item.machine ? 'Scheduled' : 'To Be Planned';
                shouldUpdateAndRender = true;
            }

            if (target.classList.contains('machine-select')) {
                item.machine = target.value;
                item.status = item.machine ? 'Scheduled' : 'To Be Planned';
                // Herteken de modal direct om de shift-opties bij te werken
                renderOrderDetails(parentOrder);
                shouldUpdateAndRender = true;
            }
            
            if (shouldUpdateAndRender) {
                utils.showLoadingOverlay(ui.domElements.loadingOverlay);
                try {
                    await api.updateOrderOnBackend(parentOrder.id, parentOrder);
                    // Herteken alles om de visuele planning en de samenvattings-iconen bij te werken
                    renderAll();
                    openOrderDetailsModal(parentOrder.id); 
                    utils.showNotification('Planning bijgewerkt.', 'success', ui.domElements.notificationContainer);
                } catch (error) {
                    utils.showNotification(`Fout bij opslaan: ${error.message}`, 'error', ui.domElements.notificationContainer);
                } finally {
                    utils.hideLoadingOverlay(ui.domElements.loadingOverlay);
                }
            }
        });

        domElements.orderDetailsContent.addEventListener('click', async (e) => {
            e.preventDefault();
            const target = e.target;

            const actionDropdownToggle = target.closest('.toggle-action-dropdown');
            if (actionDropdownToggle) {
                const menu = actionDropdownToggle.nextElementSibling;
                if (!menu) return;
                const isAlreadyVisible = !menu.classList.contains('hidden');
                document.querySelectorAll('.action-menu').forEach(m => {
                    if (m !== menu) m.classList.add('hidden');
                });
                if (isAlreadyVisible) {
                    menu.classList.add('hidden');
                    return;
                }
                menu.style.visibility = 'hidden';
                menu.classList.remove('hidden');
                const menuHeight = menu.offsetHeight;
                menu.classList.add('hidden');
                menu.style.visibility = '';
                const container = domElements.orderDetailsContent;
                const buttonRect = actionDropdownToggle.getBoundingClientRect();
                const containerRect = container.getBoundingClientRect();

                // Bereken de positie van de knop vanaf de bovenkant van de scrollbare container
                const buttonTopInContainer = buttonRect.top - containerRect.top;

                // Bereken de totale hoogte die de content ZOU hebben als het menu naar beneden opent
                const requiredHeight = buttonTopInContainer + actionDropdownToggle.offsetHeight + menuHeight;

                // Bereken de ruimte die beschikbaar is boven de knop
                const spaceAvailableAbove = buttonTopInContainer;

                // Reset de classes
                menu.classList.remove('bottom-full', 'mb-2', 'top-full');

                // De beslissing:
                // Als de benodigde hoogte MEER is dan de zichtbare hoogte van de container,
                // EN er is genoeg ruimte boven de knop voor het menu, open dan naar boven.
                console.log({ requiredHeight, clientHeight: container.clientHeight, spaceAvailableAbove, menuHeight });
                if (requiredHeight > container.clientHeight && spaceAvailableAbove > menuHeight) {
                    menu.classList.add('bottom-full', 'mb-2');
                } else {
                    // In alle andere gevallen, open naar beneden.
                    menu.classList.add('top-full');
                }

                menu.classList.remove('hidden');
                return;
            }

            if (!target.closest('.action-dropdown')) {
                document.querySelectorAll('.action-menu').forEach(m => m.classList.add('hidden'));
            }

            const headerRow = target.closest('.part-header-row');
            if (headerRow) {
                const partId = headerRow.dataset.partId;
                if (partId) {
                    const batchRows = domElements.orderDetailsContent.querySelectorAll(`tr[data-parent-part-id="${partId}"]`);
                    batchRows.forEach(row => row.classList.toggle('hidden'));
                    const arrow = headerRow.querySelector('.toggle-arrow');
                    if (arrow) arrow.classList.toggle('rotate-180');
                }
                return; 
            }

            const context = findItemContext(target);
            if (!context) return;
            const { item, part: parentPart, order: parentOrder } = context;
            
            const durationCell = target.closest('.duration-cell');
            if (durationCell && !durationCell.querySelector('input')) {
                const itemToEdit = parentPart;
                const originalValue = itemToEdit.productionTimePerPiece;
                
                durationCell.innerHTML = `<input type="number" step="0.01" class="w-20 text-center bg-white dark:bg-gray-700" value="${originalValue}" />`;
                const input = durationCell.querySelector('input');
                input.focus();
                input.select();
                
                const saveChange = async () => {
                    const newValue = parseFloat(input.value);
                    if (!isNaN(newValue) && newValue >= 0 && newValue !== originalValue) {
                        itemToEdit.productionTimePerPiece = newValue;
                        if (itemToEdit.batches && itemToEdit.batches.length > 0) {
                            itemToEdit.batches.forEach(b => { b.totalHours = (b.quantity * newValue) / 60; });
                        }
                        await api.updateOrderOnBackend(parentOrder.id, parentOrder);
                    }
                    ui.renderAll();
                    ui.openOrderDetailsModal(parentOrder.id);
                };

                input.addEventListener('blur', saveChange);
                input.addEventListener('keydown', (e) => {
                    if (e.key === 'Enter') input.blur();
                    if (e.key === 'Escape') {
                        ui.renderAll();
                        ui.openOrderDetailsModal(parentOrder.id);
                    }
                });
                return;
            }

            let actionTaken = false;
            const deleteBtn = target.closest('.delete-btn-in-details'); 

            if (target.classList.contains('unplan-btn')) {
                item.machine = null;
                item.startDate = null;
                item.status = 'To Be Planned';
                actionTaken = true;
            } else if (target.classList.contains('toggle-status-btn')) {
                item.status = item.status === 'Completed' ? 'Scheduled' : 'Completed';
                actionTaken = true;
            } else if (deleteBtn) {
                const idToDelete = item.batchId || item.id;
                const isBatch = !!item.batchId;
                const message = isBatch ? `batch "${idToDelete}"` : `onderdeel "${idToDelete}"`;
                
                ui.openConfirmModal('Item Verwijderen', `Weet je zeker dat je ${message} wilt verwijderen?`, async () => {
                    if (isBatch) {
                        parentPart.batches = parentPart.batches.filter(b => b.batchId !== idToDelete);
                        if (parentPart.batches.length === 0) {
                            parentOrder.parts = parentOrder.parts.filter(p => p.id !== parentPart.id);
                        }
                    } else {
                        parentOrder.parts = parentOrder.parts.filter(p => p.id !== idToDelete);
                    }
                    
                    if (parentOrder.parts.length === 0) {
                        await api.deleteOrderOnBackend(parentOrder.id);
                        state.orders = state.orders.filter(o => o.id !== parentOrder.id);
                        domElements.orderDetailsModal.classList.add('hidden');
                        document.body.classList.remove('no-scroll');
                    } else {
                        await api.updateOrderOnBackend(parentOrder.id, parentOrder);
                        ui.openOrderDetailsModal(parentOrder.id);
                    }
                    ui.renderAll();
                });
                return;
            }

            if (actionTaken) {
                utils.showLoadingOverlay(ui.domElements.loadingOverlay);
                try {
                    await api.updateOrderOnBackend(parentOrder.id, parentOrder);
                    ui.renderAll();
                    ui.openOrderDetailsModal(parentOrder.id);
                } catch (error) {
                    utils.showNotification(`Fout bij opslaan: ${error.message}`, 'error');
                } finally {
                    utils.hideLoadingOverlay(ui.domElements.loadingOverlay);
                }
            }

            const editablePieceTime = target.closest('.editable-piece-time');
            if (editablePieceTime) {
                e.stopPropagation(); // Voorkom dat de rij in/uitklapt
                const partId = target.closest('.part-header-row').dataset.partId;
                const part = findPart(partId);
                if (!part) return;

                const originalValue = part.productionTimePerPiece;
                const parentCell = editablePieceTime.parentElement;
                
                parentCell.innerHTML = `
                    Stuktijd: 
                    <input type="number" step="0.01" class="w-20 text-center bg-white dark:bg-gray-700 border rounded" value="${originalValue}" /> 
                    min/st
                `;
                const input = parentCell.querySelector('input');
                input.focus();
                input.select();
                
                const saveChange = async () => {
                    const newValue = parseFloat(input.value);
                    if (!isNaN(newValue) && newValue >= 0 && newValue !== originalValue) {
                        part.productionTimePerPiece = newValue;
                        // Herbereken de uren voor alle batches van dit onderdeel
                        if (part.batches) {
                            part.batches.forEach(b => { 
                                b.totalHours = (b.quantity * newValue) / 60; 
                            });
                        }
                        const order = state.orders.find(o => o.parts.some(p => p.id === partId));
                        if (order) {
                            await api.updateOrderOnBackend(order.id, order);
                        }
                    }
                    // Herlaad alles om de wijzigingen overal door te voeren
                    renderAll();
                    openOrderDetailsModal(part.orderId);
                };

                input.addEventListener('blur', saveChange);
                input.addEventListener('keydown', (e) => {
                    if (e.key === 'Enter') input.blur();
                    if (e.key === 'Escape') {
                        const order = state.orders.find(o => o.parts.some(p => p.id === partId));
                        if(order) openOrderDetailsModal(order.id);
            
                }
                });
                return; // Stop verdere event-verwerking
            }
        });
    }
    
    if (domElements.closeOrderDetailsBtn) {
        domElements.closeOrderDetailsBtn.addEventListener('click', () => {
            document.body.classList.remove('no-scroll');
            domElements.orderDetailsModal.classList.add('hidden');
        });
    }

    if(ui.domElements.addAbsenceBtn) ui.domElements.addAbsenceBtn.addEventListener('click', ui.openAbsenceModal);
    if(ui.domElements.cancelAbsenceBtn) ui.domElements.cancelAbsenceBtn.addEventListener('click', ui.closeAbsenceModal);
    if(ui.domElements.addAbsenceForm) {
        ui.domElements.addAbsenceForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            const reason = ui.domElements.absenceReason.value;
            const { absenceStartDate, absenceEndDate } = ui.getAbsenceDates();
            if (reason && absenceStartDate && absenceEndDate) {
                await absences.addAbsence({ 
                    start: utils.formatDateToYMD(absenceStartDate), 
                    end: utils.formatDateToYMD(absenceEndDate), 
                    reason 
                });
                ui.closeAbsenceModal();
                ui.renderAll();
            } else {
                utils.showNotification('Please provide a reason and select a start and end date.', 'error', ui.domElements.notificationContainer);
            }
        });
    }

    if (ui.domElements.closeManageAbsencesBtn) {
        ui.domElements.closeManageAbsencesBtn.addEventListener('click', () => {
            ui.domElements.manageAbsencesModal.classList.add('hidden');
        });
    }

    if (ui.domElements.manageAbsencesBtn) {
        ui.domElements.manageAbsencesBtn.addEventListener('click', (e) => {
            e.stopPropagation();
            ui.openManageAbsencesModal();
            ui.domElements.actionsDropdownMenu.classList.add('hidden');
        });
    }
    
    if (ui.domElements.absenceCalendarContainer) {
        ui.domElements.absenceCalendarContainer.addEventListener('click', (e) => {
            const target = e.target;
            if (target.id === 'prev-month-btn' || target.id === 'next-month-btn') {
                ui.navigateCalendar(target.id === 'prev-month-btn' ? -1 : 1);
            } else if (target.classList.contains('calendar-day')) {
                ui.handleCalendarDayClick(e);
            }
        });
    }

    if (ui.domElements.absenceList) {
        ui.domElements.absenceList.addEventListener('click', (e) => {
            const deleteButton = e.target.closest('.delete-absence-btn');
            if (deleteButton) {
                const absenceId = parseInt(deleteButton.dataset.absenceId, 10);
                if (!absenceId) {
                    console.error('Could not find a valid absence ID on the button.');
                    return;
                }
                ui.openConfirmModal(
                    'Delete Absence',
                    'Are you sure you want to delete this absence?',
                    async () => {
                        await absences.removeAbsence(absenceId);
                        utils.showNotification('Absence removed successfully.', 'success', ui.domElements.notificationContainer);
                        ui.renderAbsenceList();
                        ui.renderAll();
                    }
                );
            }
        });
    }

    if (ui.domElements.editPartsContainer) {
        ui.domElements.editPartsContainer.addEventListener('change', (e) => {
            if (e.target.dataset.field === 'needsPostProcessing') {
                const partEntry = e.target.closest('.part-entry');
                const daysContainer = partEntry.querySelector('.post-processing-days-container');
                if (daysContainer) {
                    daysContainer.classList.toggle('hidden', !e.target.checked);
                }
            }
        });
    }
    
    const themeToggleCheckbox = document.getElementById('theme-toggle-checkbox');
    if (themeToggleCheckbox) {
        const applyTheme = (theme) => {
            if (theme === 'dark') {
                document.documentElement.classList.add('dark');
                themeToggleCheckbox.checked = true;
            } else {
                document.documentElement.classList.remove('dark');
                themeToggleCheckbox.checked = false;
            }
        };
        const savedTheme = localStorage.getItem('theme');
        const systemPrefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
        if (savedTheme) { applyTheme(savedTheme); }
        else { applyTheme('light'); }
        themeToggleCheckbox.addEventListener('change', () => {
            const newTheme = themeToggleCheckbox.checked ? 'dark' : 'light';
            localStorage.setItem('theme', newTheme);
            applyTheme(newTheme);
        });
    }

    if(ui.domElements.showNewOrderModalBtn) ui.domElements.showNewOrderModalBtn.addEventListener('click', () => {
        ui.domElements.addOrderForm.reset();
        ui.domElements.partsContainer.innerHTML = '';
        ui.createNewPartForm(ui.domElements.partsContainer);
        ui.domElements.newOrderModal.classList.remove('hidden');
        document.getElementById('order-id').focus();
    });
    if(ui.domElements.closeNewOrderModalBtn) ui.domElements.closeNewOrderModalBtn.addEventListener('click', () => ui.domElements.newOrderModal.classList.add('hidden'));
    if(ui.domElements.newOrderModal) ui.domElements.newOrderModal.addEventListener('click', (e) => {
        if (e.target.id === 'new-order-modal') ui.domElements.newOrderModal.classList.add('hidden');
    });
    if(ui.domElements.addOrderForm) ui.domElements.addOrderForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    const mainOrderId = document.getElementById('order-id').value.trim();
    if (state.orders.some(o => o.id === mainOrderId)) {
        utils.showNotification('Order number already exists.', 'error', ui.domElements.notificationContainer);
        return;
    }
    
    const newOrder = {
        id: mainOrderId,
        customer: ui.domElements.customerSelect.value,
        customerOrderNr: document.getElementById('customer-order-nr').value,
        deadline: document.getElementById('deadline').value,
        isUrgent: document.getElementById('is-urgent').checked,
        parts: []
    };
    
    const partForms = ui.domElements.partsContainer.querySelectorAll('.part-entry');
    
    partForms.forEach((partForm, index) => {
        const partId = `${mainOrderId}-${index + 1}`;
        const totalQuantity = parseInt(partForm.querySelector('[data-field="totalQuantity"]').value);
        const prodTime = parseFloat(partForm.querySelector('[data-field="productionTimePerPiece"]').value) || 1;
        const batchesData = JSON.parse(partForm.dataset.batches);

        // --- DE FIX: Bereken de materiaalstatus hier, vóórdat het 'newPart' object wordt aangemaakt ---
        const materialStatus = partForm.querySelector('[data-field="materialInStock"]').checked ? 'Available' : 'Not Available';

        const newPart = {
            id: partId,
            partName: partForm.querySelector('[data-field="partName"]').value,
            drawingNumber: partForm.querySelector('[data-field="drawingNumber"]').value,
            productionTimePerPiece: prodTime,
            totalQuantity: totalQuantity,
            materialStatus: materialStatus, // Gebruik de berekende status
            needsPostProcessing: partForm.querySelector('[data-field="needsPostProcessing"]').checked,
            postProcessingDays: parseInt(partForm.querySelector('[data-field="postProcessingDays"]').value) || 0,
            batches: batchesData.map((batch, batchIndex) => {
                return {
                    batchId: `${partId}-b${batchIndex + 1}`,
                    quantity: batch.quantity,
                    deadline: batch.deadline,
                    totalHours: (batch.quantity * prodTime) / 60,
                    status: 'To Be Planned',
                    materialStatus: materialStatus, // Gebruik hier ook de berekende status
                    machine: null,
                    startDate: null,
                    shift: 8,
                };
            })
        };
        newOrder.parts.push(newPart);
    });

    if (newOrder.parts.length === 0) {
        utils.showNotification("Please add at least one part to the order.", "error", ui.domElements.notificationContainer);
        return;
    }
    
    utils.showLoadingOverlay(ui.domElements.loadingOverlay);
    try {
        await api.addOrderOnBackend(newOrder);
        state.orders.push(newOrder);
        ui.domElements.newOrderModal.classList.add('hidden');
        ui.renderAll();
        utils.showNotification(`Order ${newOrder.id} saved successfully!`, 'success', ui.domElements.notificationContainer);
    } catch (error) {
        console.error("Error saving to server:", error);
        utils.showNotification(`Could not save order: ${error.message}`, "error", ui.domElements.notificationContainer);
    } finally {
        utils.hideLoadingOverlay(ui.domElements.loadingOverlay);
    }
});
    
    if(ui.domElements.addPartBtn) ui.domElements.addPartBtn.addEventListener('click', () => {
        const mainDeadline = document.getElementById('deadline').value;
        ui.createNewPartForm(ui.domElements.partsContainer, mainDeadline);
    });

    const mainDeadlineInput = document.getElementById('deadline');
    if (mainDeadlineInput) {
        mainDeadlineInput.addEventListener('change', (event) => {
            const newMainDeadline = event.target.value;
            const partForms = ui.domElements.partsContainer.querySelectorAll('.part-entry');

            partForms.forEach(partForm => {
                try {
                    const batchesData = JSON.parse(partForm.dataset.batches);
                    if (batchesData.length > 0) {
                        batchesData[0].deadline = newMainDeadline;
                    }
                    partForm.dataset.batches = JSON.stringify(batchesData);
                } catch (e) {
                    console.error("Kon batches data niet parsen of updaten", e);
                }
            });
        });
    }
    
    if (ui.domElements.cancelEditBtn) ui.domElements.cancelEditBtn.addEventListener('click', () => {
        ui.domElements.editOrderModal.classList.add('hidden');
    });

    if (ui.domElements.addPartToEditBtn) ui.domElements.addPartToEditBtn.addEventListener('click', () => {
        ui.createNewPartForm(ui.domElements.editPartsContainer);
    });

    if (ui.domElements.deleteOrderBtnInModal) {
        ui.domElements.deleteOrderBtnInModal.addEventListener('click', () => {
            const orderId = ui.domElements.editOrderForm.dataset.editingOrderId;
            if (!orderId) {
                utils.showNotification("Cannot find order to delete.", "error", ui.domElements.notificationContainer);
                return;
            }
            ui.openConfirmModal(
                'Delete Entire Order',
                `Are you sure you want to permanently delete order "${orderId}" and all its parts? This cannot be undone.`,
                async () => {
                    utils.showLoadingOverlay(ui.domElements.loadingOverlay);
                    try {
                        await api.deleteOrderOnBackend(orderId);
                        state.orders = state.orders.filter(o => o.id !== orderId);
                        
                        ui.domElements.editOrderModal.classList.add('hidden');
                        ui.renderAll();
                        utils.showNotification(`Order ${orderId} has been deleted.`, 'success', ui.domElements.notificationContainer);
                    } catch (error) {
                        utils.showNotification(`Could not delete order: ${error.message}`, 'error', ui.domElements.notificationContainer);
                    } finally {
                        utils.hideLoadingOverlay(ui.domElements.loadingOverlay);
                    }
                }
            );
        });
    }

    const addSplitButtonListener = (container) => {
        if (container) {
            container.addEventListener('click', (e) => {
                if (e.target.classList.contains('split-part-btn')) {
                    const partFormEl = e.target.closest('.part-entry');
                    if (partFormEl) {
                        ui.openBatchSplitterModal(partFormEl);
                    }
                }
            });
        }
    };
    addSplitButtonListener(ui.domElements.partsContainer);
    addSplitButtonListener(ui.domElements.editPartsContainer);

    if (ui.domElements.batchListContainer) {
        ui.domElements.batchListContainer.addEventListener('input', ui.updateBatchValidation);
        ui.domElements.batchListContainer.addEventListener('click', (e) => {
            if (e.target.classList.contains('remove-batch-btn')) {
                e.target.closest('.batch-row').remove();
                ui.updateBatchValidation();
            }
        });
    }

    if(ui.domElements.addBatchRowBtn) {
        ui.domElements.addBatchRowBtn.addEventListener('click', () => {
            const batchRow = document.createElement('div');
            batchRow.className = 'batch-row grid grid-cols-3 gap-4 items-center';
            batchRow.innerHTML = `
                <div class="col-span-1">
                    <label class="block text-xs text-gray-500">Aantal</label>
                    <input type="number" min="1" class="batch-quantity w-full border-gray-300 rounded-md" value="1">
                </div>
                <div class="col-span-1">
                    <label class="block text-xs text-gray-500">Deadline (optioneel)</label>
                    <input type="date" class="batch-deadline w-full border-gray-300 rounded-md" value="">
                </div>
                <div class="col-span-1 self-end">
                    <button type="button" class="remove-batch-btn text-red-500 hover:text-red-700 text-sm">Verwijder</button>
                </div>
            `;
            ui.domElements.batchListContainer.appendChild(batchRow);
            ui.updateBatchValidation();
        });
    }

    if(ui.domElements.cancelBatchesBtn) ui.domElements.cancelBatchesBtn.addEventListener('click', ui.closeBatchSplitterModal);

    if(ui.domElements.saveBatchesBtn) {
        ui.domElements.saveBatchesBtn.addEventListener('click', () => {
            const currentPartForm = ui.getActivePartFormElement();
            if (currentPartForm) {
                const batchRows = ui.domElements.batchListContainer.querySelectorAll('.batch-row');
                const batchesData = Array.from(batchRows).map(row => ({
                    quantity: parseInt(row.querySelector('.batch-quantity').value),
                    deadline: row.querySelector('.batch-deadline').value
                }));
                currentPartForm.dataset.batches = JSON.stringify(batchesData);
                const splitBtn = currentPartForm.querySelector('.split-part-btn');
                splitBtn.textContent = `Batches (${batchesData.length})`;
                splitBtn.classList.add('font-bold', 'text-green-600');
            }
            ui.closeBatchSplitterModal();
        });
    }

    if(ui.domElements.searchKey) ui.domElements.searchKey.addEventListener('change', (e) => {
        state.searchKey = e.target.value;
        saveStateToLocalStorage();
        ui.renderAll();
    });
    if(ui.domElements.searchInput) ui.domElements.searchInput.addEventListener('keyup', (e) => {
        state.searchTerm = e.target.value;
        saveStateToLocalStorage();
        ui.renderAll();
    });

    // --- DATA & SETTINGS MANAGEMENT ---
    if(ui.domElements.clearDataLink) ui.domElements.clearDataLink.addEventListener('click', (e) => {
        e.preventDefault();
        ui.domElements.actionsDropdownMenu.classList.add('hidden');
        ui.openConfirmModal('Clear All Data','Are you sure you want to delete ALL orders, customers, and machines? This cannot be undone.', async () => {
            utils.showLoadingOverlay(ui.domElements.loadingOverlay);
            try {
                await Promise.all([
                    api.replaceOrdersOnBackend([]),
                    api.replaceCustomersOnBackend([]),
                    api.replaceMachinesOnBackend([])
                ]);
                state.orders = []; state.customers = []; state.machines = [];
                ui.renderAll();
                utils.showNotification('All data has been cleared.', 'success', ui.domElements.notificationContainer);
            } catch(error) {
                utils.showNotification(`Could not clear data: ${error.message}`, 'error', ui.domElements.notificationContainer);
            } finally {
                utils.hideLoadingOverlay(ui.domElements.loadingOverlay);
            }
        });
    });

    if(ui.domElements.exportDataLink) ui.domElements.exportDataLink.addEventListener('click', async (e) => {
        e.preventDefault();
        ui.domElements.actionsDropdownMenu.classList.add('hidden');
        utils.showLoadingOverlay(ui.domElements.loadingOverlay);
        utils.showNotification('Preparing export...', 'success', ui.domElements.notificationContainer);

        try {
            const activeOrders = state.orders;
            const archivedOrders = await api.fetchArchivedOrders();
            const allOrders = [...activeOrders, ...archivedOrders];
            const dataToExport = {
                orders: allOrders, 
                customers: state.customers, 
                machines: state.machines, 
                expandedOrders: [...state.expandedOrders],
            };
            const dataStr = JSON.stringify(dataToExport, null, 2);
            const dataBlob = new Blob([dataStr], { type: "application/json" });
            const url = URL.createObjectURL(dataBlob);
            const downloadLink = document.createElement('a');
            const timestamp = new Date().toISOString().slice(0, 10);
            downloadLink.href = url;
            downloadLink.download = `precam-planning-${timestamp}.json`;
            document.body.appendChild(downloadLink);
            downloadLink.click();
            document.body.removeChild(downloadLink);
            URL.revokeObjectURL(url);
            utils.showNotification('Export started!', 'success', ui.domElements.notificationContainer);
        } catch (error) {
            utils.showNotification(`Could not create export: ${error.message}`, 'error', ui.domElements.notificationContainer);
        } finally {
            utils.hideLoadingOverlay(ui.domElements.loadingOverlay);
        }
    });

    if(ui.domElements.importDataLink) ui.domElements.importDataLink.addEventListener('click', (e) => {
        e.preventDefault();
        ui.domElements.actionsDropdownMenu.classList.add('hidden');
        ui.domElements.importFileInput.click();
    });

    if(ui.domElements.importFileInput) ui.domElements.importFileInput.addEventListener('change', (e) => {
        const file = e.target.files[0];
        if (!file) return;
        const reader = new FileReader();
        reader.onload = (event) => {
            try {
                const importedData = JSON.parse(event.target.result);
                if (!importedData.orders || !importedData.customers || !importedData.machines) {
                    throw new Error("File does not have the correct structure.");
                }
                ui.openConfirmModal('Import Data', 'Are you sure you want to import this data? All current data will be overwritten!', async () => {
                    utils.showLoadingOverlay(ui.domElements.loadingOverlay);
                    try {
                        const activeOrders = importedData.orders.filter(o => o.status !== 'Archived');
                        const correctedMachines = importedData.machines.map(m => ({
                            name: m.name, hasRobot: m.has_robot ?? m.hasRobot ?? false
                        }));
                        await Promise.all([
                           api.replaceOrdersOnBackend(importedData.orders),
                           api.replaceCustomersOnBackend(importedData.customers),
                           api.replaceMachinesOnBackend(correctedMachines)
                        ]);
                        state.orders = activeOrders;
                        state.customers = importedData.customers || [];
                        state.machines = correctedMachines || [];
                        state.expandedOrders = new Set(importedData.expandedOrders || []);
                        ui.renderAll();
                        utils.showNotification('Data imported successfully!', 'success', ui.domElements.notificationContainer);
                    } catch (error) {
                        utils.showNotification(`Error importing data: ${error.message}`, 'error', ui.domElements.notificationContainer);
                    } finally {
                        utils.hideLoadingOverlay(ui.domElements.loadingOverlay);
                    }
                }, 'Yes, import', 'constructive');
            } catch (error) {
                utils.showNotification(`Error parsing file: ${error.message}`, 'error', ui.domElements.notificationContainer);
            } finally {
                e.target.value = null;
            }
        };
        reader.readAsText(file);
    });

    if (ui.domElements.manageCustomersBtn) ui.domElements.manageCustomersBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        ui.renderCustomerModalList();
        ui.domElements.customerModal.classList.remove('hidden');
        ui.domElements.actionsDropdownMenu.classList.add('hidden');
    });

    if (ui.domElements.manageMachinesBtn) ui.domElements.manageMachinesBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        ui.renderMachineModalList();
        ui.domElements.machineModal.classList.remove('hidden');
        ui.domElements.actionsDropdownMenu.classList.add('hidden');
    });
    
    if (ui.domElements.closeCustomerModalBtn) ui.domElements.closeCustomerModalBtn.addEventListener('click', () => ui.domElements.customerModal.classList.add('hidden'));
    if (ui.domElements.closeMachineModalBtn) ui.domElements.closeMachineModalBtn.addEventListener('click', () => ui.domElements.machineModal.classList.add('hidden'));

    if (ui.domElements.addCustomerForm) ui.domElements.addCustomerForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        const newName = ui.domElements.newCustomerName.value.trim();
        if (newName && !state.customers.find(c => c.toLowerCase() === newName.toLowerCase())) {
            utils.showLoadingOverlay(ui.domElements.loadingOverlay);
            try {
                await api.addCustomerOnBackend({ name: newName });
                state.customers.push(newName);
                state.customers.sort();
                ui.domElements.newCustomerName.value = '';
                ui.renderCustomerModalList();
                ui.renderAll(); 
                utils.showNotification(`Customer "${newName}" added!`, 'success', ui.domElements.notificationContainer);
            } catch (error) {
                utils.showNotification("Could not save customer.", "error", ui.domElements.notificationContainer);
            } finally {
                utils.hideLoadingOverlay(ui.domElements.loadingOverlay);
            }
        } else {
            utils.showNotification("Customer name is empty or already exists.", "error", ui.domElements.notificationContainer);
        }
    });

    if (ui.domElements.addMachineForm) ui.domElements.addMachineForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        const newName = ui.domElements.newMachineName.value.trim();
        if (newName && !state.machines.find(m => m.name.toLowerCase() === newName.toLowerCase())) {
            const newMachine = { name: newName, hasRobot: ui.domElements.newMachineHasRobot.checked };
            utils.showLoadingOverlay(ui.domElements.loadingOverlay);
            try {
                await api.addMachineOnBackend(newMachine);
                state.machines.push(newMachine);
                ui.domElements.newMachineName.value = '';
                ui.domElements.newMachineHasRobot.checked = false;
                ui.renderMachineModalList();
                ui.renderAll();
                utils.showNotification(`Machine "${newName}" added!`, 'success', ui.domElements.notificationContainer);
            } catch (error) {
                utils.showNotification("Could not save machine.", "error", ui.domElements.notificationContainer);
            } finally {
                utils.hideLoadingOverlay(ui.domElements.loadingOverlay);
            }
        } else {
            utils.showNotification("Machine name is empty or already exists.", "error", ui.domElements.notificationContainer);
        }
    });

    if (ui.domElements.customerList) ui.domElements.customerList.addEventListener('click', (e) => {
        if (e.target.classList.contains('delete-customer-btn')) {
            const customerToDelete = e.target.dataset.customer;
            ui.openConfirmModal('Delete Customer', `Are you sure you want to delete "${customerToDelete}"?`, async () => {
                utils.showLoadingOverlay(ui.domElements.loadingOverlay);
                try {
                    await api.deleteCustomerOnBackend(customerToDelete);
                    state.customers = state.customers.filter(c => c !== customerToDelete);
                    ui.renderCustomerModalList();
                    ui.renderAll();
                    utils.showNotification(`Customer "${customerToDelete}" deleted.`, 'success', ui.domElements.notificationContainer);
                } catch (error) {
                    utils.showNotification("Could not delete customer.", "error", ui.domElements.notificationContainer);
                } finally {
                    utils.hideLoadingOverlay(ui.domElements.loadingOverlay);
                }
            });
        }
    });

    if (ui.domElements.machineList) ui.domElements.machineList.addEventListener('click', (e) => {
        if (e.target.classList.contains('delete-machine-btn')) {
            const machineToDelete = e.target.dataset.machineName;
            ui.openConfirmModal('Delete Machine', `Are you sure you want to delete "${machineToDelete}"?`, async () => {
                utils.showLoadingOverlay(ui.domElements.loadingOverlay);
                try {
                    await api.deleteMachineOnBackend(machineToDelete);
                    state.machines = state.machines.filter(m => m.name !== machineToDelete);
                    ui.renderMachineModalList();
                    ui.renderAll();
                    utils.showNotification(`Machine "${machineToDelete}" deleted.`, 'success', ui.domElements.notificationContainer);
                } catch (error) {
                    utils.showNotification("Could not delete machine.", "error", ui.domElements.notificationContainer);
                } finally {
                    utils.hideLoadingOverlay(ui.domElements.loadingOverlay);
                }
            });
        }
    });

    // --- TOOLBAR & MAIN UI BUTTONS ---
    if(ui.domElements.prevWeekBtn) ui.domElements.prevWeekBtn.addEventListener('click', () => {
        const newStartDate = new Date(state.planningStartDate);
        newStartDate.setDate(newStartDate.getDate() - 7);
        state.planningStartDate = newStartDate;
        state.machineLoadWeek = null;
        ui.renderAll();
        if(ui.domElements.planningContainer) ui.domElements.planningContainer.scrollLeft = 0;
    });

    if(ui.domElements.nextWeekBtn) ui.domElements.nextWeekBtn.addEventListener('click', () => {
        const newStartDate = new Date(state.planningStartDate);
        newStartDate.setDate(newStartDate.getDate() + 7);
        state.planningStartDate = newStartDate;
        state.machineLoadWeek = null;
        ui.renderAll();
        if(ui.domElements.planningContainer) ui.domElements.planningContainer.scrollLeft = 0;
    });

    if(ui.domElements.todayBtn) ui.domElements.todayBtn.addEventListener('click', () => {
        let today = new Date();
        today.setHours(0, 0, 0, 0);
        const dayOfWeek = today.getDay();
        const diff = today.getDate() - dayOfWeek + (dayOfWeek === 0 ? -6 : 1); 
        state.planningStartDate = new Date(today.setDate(diff)); 
        state.machineLoadWeek = null;
        ui.renderAll();
    });

    if(ui.domElements.fullscreenBtn) ui.domElements.fullscreenBtn.addEventListener('click', () => {
        if (!document.fullscreenElement) {
            document.documentElement.requestFullscreen().catch(err => {
                utils.showNotification(`Could not activate fullscreen: ${err.message}`, 'error', ui.domElements.notificationContainer);
            });
        } else {
            if (document.exitFullscreen) {
                document.exitFullscreen();
            }
        }
    });

    document.addEventListener('fullscreenchange', () => {
        const { fullscreenText } = ui.domElements;
        const enterIcon = document.getElementById('fullscreen-icon-enter');
        const exitIcon = document.getElementById('fullscreen-icon-exit');
        if (fullscreenText && enterIcon && exitIcon) {
            if (document.fullscreenElement) {
                fullscreenText.textContent = 'Exit Fullscreen';
                enterIcon.classList.add('hidden');
                exitIcon.classList.remove('hidden');
            } else {
                fullscreenText.textContent = 'Fullscreen';
                enterIcon.classList.remove('hidden');
                exitIcon.classList.add('hidden');
            }
        }
    });

    if(ui.domElements.actionsDropdownBtn) ui.domElements.actionsDropdownBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        ui.domElements.actionsDropdownMenu.classList.toggle('hidden');
    });

    window.addEventListener('click', (e) => {
        if (ui.domElements.actionsDropdownMenu && !document.getElementById('actions-dropdown-container').contains(e.target)) {
            ui.domElements.actionsDropdownMenu.classList.add('hidden');
        }
    });

    if(ui.domElements.showLoadBtn) ui.domElements.showLoadBtn.addEventListener('click', () => {
        state.isLoadModalVisible = true;
        ui.renderAll();
    });

    if (ui.domElements.closeLoadModalBtn) ui.domElements.closeLoadModalBtn.addEventListener('click', () => {
        state.isLoadModalVisible = false;
        ui.renderAll();
    });

    if (ui.domElements.machineLoadModal) ui.domElements.machineLoadModal.addEventListener('click', (e) => {
        if (e.target.id === 'machine-load-modal') {
            state.isLoadModalVisible = false;
            ui.renderAll();
        }
    });

    if (ui.domElements.prevLoadWeekBtn) {
        ui.domElements.prevLoadWeekBtn.addEventListener('click', () => {
            const scheduleInfo = schedule.buildScheduleAndDetectConflicts();
            const machineLoadInfo = schedule.calculateMachineLoad(scheduleInfo, state.planningStartDate);
            const availableWeeks = Object.keys(machineLoadInfo).filter(w => w !== 'NaN').sort((a, b) => a - b);
            const currentIndex = availableWeeks.indexOf(String(state.machineLoadWeek));
            if (currentIndex > 0) {
                state.machineLoadWeek = parseInt(availableWeeks[currentIndex - 1]);
                ui.renderAll();
            }
        });
    }

    if (ui.domElements.nextLoadWeekBtn) {
        ui.domElements.nextLoadWeekBtn.addEventListener('click', () => {
            const scheduleInfo = schedule.buildScheduleAndDetectConflicts();
            const machineLoadInfo = schedule.calculateMachineLoad(scheduleInfo, state.planningStartDate);
            const availableWeeks = Object.keys(machineLoadInfo).filter(w => w !== 'NaN').sort((a, b) => a - b);
            const currentIndex = availableWeeks.indexOf(String(state.machineLoadWeek));
            if (currentIndex < availableWeeks.length - 1) {
                state.machineLoadWeek = parseInt(availableWeeks[currentIndex + 1]);
                ui.renderAll();
            }
        });
    }

    // --- CONFIRMATION MODAL ---
    if(ui.domElements.confirmDeleteBtn) ui.domElements.confirmDeleteBtn.addEventListener('click', () => {
        ui.handleConfirm();
    });
    if(ui.domElements.cancelDeleteBtn) ui.domElements.cancelDeleteBtn.addEventListener('click', () => {
        ui.closeConfirmModal();
    });
    if(ui.domElements.confirmDeleteModal) ui.domElements.confirmDeleteModal.addEventListener('click', (e) => {
        if (e.target.id === 'confirm-delete-modal') {
            ui.closeConfirmModal();
        }
    });

    domElements.saveOrderBtn.addEventListener('click', handleUpdateOrder);
}
