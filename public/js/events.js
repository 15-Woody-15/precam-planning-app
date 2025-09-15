import { state, findPart } from './state.js';
import * as ui from './ui.js';
import * as api from './api.js';
import * as utils from './utils.js';
import * as absences from './absences.js';
import * as schedule from './schedule.js';

// Importeren van de nieuwe, opgesplitste event listener initializers
import { initializeOrderListEventListeners } from './orderListEvents.js';
import { initializePlanningGridEventListeners } from './planningGridEvents.js';

export function initializeEventListeners() {
    // --- Initialiseer de complexe, opgesplitste listeners ---
    initializeOrderListEventListeners();
    initializePlanningGridEventListeners();

    // --- De overgebleven, algemene listeners blijven hier ---

    // --- ABSENCE MODAL LOGIC ---
    if(ui.domElements.addAbsenceBtn) ui.domElements.addAbsenceBtn.addEventListener('click', ui.openAbsenceModal);
    if(ui.domElements.cancelAbsenceBtn) ui.domElements.cancelAbsenceBtn.addEventListener('click', ui.closeAbsenceModal);
    if(ui.domElements.addAbsenceForm) {
        ui.domElements.addAbsenceForm.addEventListener('submit', (e) => {
            e.preventDefault();
            const reason = ui.domElements.absenceReason.value;
            const { absenceStartDate, absenceEndDate } = ui.getAbsenceDates();
            if (reason && absenceStartDate && absenceEndDate) {
                absences.addAbsence({ 
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
                    () => {
                        absences.removeAbsence(absenceId);
                        utils.showNotification('Absence removed successfully.', 'success', ui.domElements.notificationContainer);
                        ui.renderAbsenceList();
                        ui.renderAll();
                    }
                );
            }
        });
    }
    
    // --- THEME TOGGLE LOGIC ---
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
        else if (systemPrefersDark) { applyTheme('dark'); }
        else { applyTheme('light'); }
        themeToggleCheckbox.addEventListener('change', () => {
            const newTheme = themeToggleCheckbox.checked ? 'dark' : 'light';
            localStorage.setItem('theme', newTheme);
            applyTheme(newTheme);
        });
    }

    // --- "ADD ORDER" & "EDIT ORDER" MODAL LOGIC ---
    if(ui.domElements.showNewOrderModalBtn) ui.domElements.showNewOrderModalBtn.addEventListener('click', () => {
        ui.domElements.addOrderForm.reset();
        ui.domElements.partsContainer.innerHTML = '';
        ui.createNewPartForm();
        ui.domElements.newOrderModal.classList.remove('hidden');
        document.getElementById('order-id').focus();
    });
    if(ui.domElements.closeNewOrderModalBtn) ui.domElements.closeNewOrderModalBtn.addEventListener('click', () => ui.domElements.newOrderModal.classList.add('hidden'));
    if(ui.domElements.newOrderModal) ui.domElements.newOrderModal.addEventListener('click', (e) => {
        if (e.target.id === 'new-order-modal') ui.domElements.newOrderModal.classList.add('hidden');
    });
    if(ui.domElements.addOrderForm) ui.domElements.addOrderForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        const mainOrderId = document.getElementById('order-id').value;
        if (state.orders.some(o => o.id === mainOrderId)) {
            utils.showNotification('Order number already exists.', 'error', ui.domElements.notificationContainer);
            return;
        }
        const newOrder = {
            id: mainOrderId, customer: ui.domElements.customerSelect.value, customerOrderNr: document.getElementById('customer-order-nr').value, deadline: document.getElementById('deadline').value, isUrgent: document.getElementById('is-urgent').checked, parts: []
        };
        const partForms = ui.domElements.partsContainer.querySelectorAll('.part-entry');
        partForms.forEach((partForm, index) => {
            const partId = `${mainOrderId}-${index + 1}`;
            const productionTimeInMinutes = parseFloat(partForm.querySelector('[data-field="productionTimePerPiece"]').value);
            const quantity = parseInt(partForm.querySelector('[data-field="quantity"]').value);
            const newPart = {
                id: partId, partName: partForm.querySelector('[data-field="partName"]').value, drawingNumber: partForm.querySelector('[data-field="drawingNumber"]').value, quantity: quantity, productionTimePerPiece: productionTimeInMinutes, materialStatus: partForm.querySelector('[data-field="materialInStock"]').checked ? 'Available' : 'Not Available', status: 'To Be Planned', machine: null, startDate: null, shift: 8, totalHours: (quantity * productionTimeInMinutes) / 60,
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
    if(ui.domElements.addPartBtn) ui.domElements.addPartBtn.addEventListener('click', ui.createNewPartForm);
    
    if (ui.domElements.cancelEditBtn) ui.domElements.cancelEditBtn.addEventListener('click', () => {
        ui.domElements.editOrderModal.classList.add('hidden');
    });

    if (ui.domElements.addPartToEditBtn) ui.domElements.addPartToEditBtn.addEventListener('click', () => {
        const orderId = ui.domElements.editOrderForm.dataset.editingOrderId;
        if (!orderId) return;
        const partDiv = document.createElement('div');
        partDiv.className = 'edit-part-entry is-new grid grid-cols-1 md:grid-cols-4 gap-4 items-center border-l-4 border-green-400 p-2 rounded-md';
        partDiv.innerHTML = `
            <div><label class="block text-xs font-medium text-gray-500">Name</label><input type="text" class="bg-white mt-1 block w-full rounded-md border-gray-300 text-sm" data-field="partName" placeholder="New part" required></div>
            <div><label class="block text-xs font-medium text-gray-500">Drawing No.</label><input type="text" class="bg-white mt-1 block w-full rounded-md border-gray-300 text-sm" data-field="drawingNumber"></div>
            <div><label class="block text-xs font-medium text-gray-500">Quantity</label><input type="number" class="bg-white mt-1 block w-full rounded-md border-gray-300 text-sm" data-field="quantity" value="1" required></div>
            <div><label class="block text-xs font-medium text-gray-500">Prod. (min/pc)</label><input type="number" class="bg-white mt-1 block w-full rounded-md border-gray-300 text-sm" data-field="productionTimePerPiece" value="1" required></div>
        `;
        ui.domElements.editPartsContainer.appendChild(partDiv);
        partDiv.querySelector('input').focus();
    });

    if (ui.domElements.editOrderForm) ui.domElements.editOrderForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        const originalOrderId = e.target.dataset.editingOrderId;
        const orderToUpdate = state.orders.find(o => o.id === originalOrderId);
        if (!orderToUpdate) {
            utils.showNotification("Could not find the order to edit.", "error", ui.domElements.notificationContainer);
            return;
        }
        const updatedOrderData = JSON.parse(JSON.stringify(orderToUpdate));
        const newOrderId = document.getElementById('edit-order-id').value;
        updatedOrderData.id = newOrderId;
        updatedOrderData.customer = ui.domElements.editCustomerSelect.value;
        updatedOrderData.customerOrderNr = document.getElementById('edit-customer-order-nr').value;
        updatedOrderData.deadline = document.getElementById('edit-deadline').value;
        let maxPartNumber = updatedOrderData.parts.reduce((max, p) => Math.max(max, parseInt(p.id.split('-').pop()) || 0), 0);
        
        const partForms = ui.domElements.editPartsContainer.querySelectorAll('.edit-part-entry');
        partForms.forEach(partForm => {
            const originalPartId = partForm.dataset.partId;
            const partToUpdate = originalPartId ? updatedOrderData.parts.find(p => p.id === originalPartId) : null;
            
            if (partToUpdate) {
                const newQuantity = parseInt(partForm.querySelector('[data-field="quantity"]').value);
                const newProdTime = parseFloat(partForm.querySelector('[data-field="productionTimePerPiece"]').value);
                partToUpdate.partName = partForm.querySelector('[data-field="partName"]').value;
                partToUpdate.drawingNumber = partForm.querySelector('[data-field="drawingNumber"]').value;
                partToUpdate.quantity = newQuantity;
                partToUpdate.productionTimePerPiece = newProdTime;
                partToUpdate.totalHours = (newQuantity * newProdTime) / 60;
                if (originalOrderId !== newOrderId) {
                    const partIndex = originalPartId.split('-').pop();
                    partToUpdate.id = `${newOrderId}-${partIndex}`;
                }
            } else if (partForm.classList.contains('is-new')) {
                maxPartNumber++;
                const newPartId = `${newOrderId}-${maxPartNumber}`;
                const newQuantity = parseInt(partForm.querySelector('[data-field="quantity"]').value);
                const newProdTime = parseFloat(partForm.querySelector('[data-field="productionTimePerPiece"]').value);
                const newPart = {
                    id: newPartId, partName: partForm.querySelector('[data-field="partName"]').value, drawingNumber: partForm.querySelector('[data-field="drawingNumber"]').value, quantity: newQuantity, productionTimePerPiece: newProdTime, totalHours: (newQuantity * newProdTime) / 60, materialStatus: 'Not Available', status: 'To Be Planned', machine: null, startDate: null, shift: 8,
                };
                updatedOrderData.parts.push(newPart);
            }
        });
        utils.showLoadingOverlay(ui.domElements.loadingOverlay);
        try {
            await api.updateOrderOnBackend(originalOrderId, updatedOrderData);
            const orderIndex = state.orders.findIndex(o => o.id === originalOrderId);
            if (orderIndex !== -1) {
                state.orders[orderIndex] = updatedOrderData;
            }
            ui.domElements.editOrderModal.classList.add('hidden');
            ui.renderAll();
            utils.showNotification(`Order ${newOrderId} saved successfully!`, 'success', ui.domElements.notificationContainer);
        } catch (error) {
            utils.showNotification(`Could not save changes: ${error.message}`, 'error', ui.domElements.notificationContainer);
        } finally {
            utils.hideLoadingOverlay(ui.domElements.loadingOverlay);
        }
    });

    // --- SEARCH & FILTER LOGIC ---
    if(ui.domElements.searchKey) ui.domElements.searchKey.addEventListener('change', (e) => {
        state.searchKey = e.target.value;
        ui.renderAll();
    });
    if(ui.domElements.searchInput) ui.domElements.searchInput.addEventListener('keyup', (e) => {
        state.searchTerm = e.target.value;
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
}