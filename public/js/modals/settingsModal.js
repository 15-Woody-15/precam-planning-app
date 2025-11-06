// js/modals/settingsModal.js

import { domElements, renderAll } from '../ui.js';
import { state } from '../state.js';
import * as api from '../api.js';
import * as utils from '../utils.js';
import { openConfirmModal } from './confirmModal.js';

// --- Private Render Functions (verplaatst van ui.js) ---

function renderCustomerModalList() {
    const list = domElements.customerList;
    if (!list) return;
    list.innerHTML = '';
    state.customers.forEach(customer => {
        const li = document.createElement('li');
        li.className = 'flex justify-between items-center p-2 bg-gray-50';
        li.innerHTML = `
            <span>${customer}</span>
            <button data-customer="${customer}" class="delete-customer-btn text-red-500 hover:text-red-700">&times;</button>
        `;
        list.appendChild(li);
    });
}

function renderMachineModalList() {
    const list = domElements.machineList;
    if (!list) return;
    list.innerHTML = '';
    state.machines.forEach(machine => {
        const li = document.createElement('li');
        li.className = 'flex justify-between items-center p-2 bg-gray-50';
        li.innerHTML = `
            <span>${machine.name} ${machine.hasRobot ? '🤖' : ''}</span>
            <button data-machine-name="${machine.name}" class="delete-machine-btn text-red-500 hover:text-red-700">&times;</button>
        `;
        list.appendChild(li);
    });
}

// --- Public Open/Close Functions ---

function openCustomerModal() {
    renderCustomerModalList();
    domElements.customerModal.classList.remove('hidden');
}

function closeCustomerModal() {
    domElements.customerModal.classList.add('hidden');
}

function openMachineModal() {
    renderMachineModalList();
    domElements.machineModal.classList.remove('hidden');
}

function closeMachineModal() {
    domElements.machineModal.classList.add('hidden');
}


// --- Event Listeners (verplaatst van events.js) ---

export function initializeSettingsModalEvents() {

    if (domElements.manageCustomersBtn) {
        domElements.manageCustomersBtn.addEventListener('click', (e) => {
            e.stopPropagation();
            openCustomerModal();
            domElements.actionsDropdownMenu.classList.add('hidden');
        });
    }

    if (domElements.manageMachinesBtn) {
        domElements.manageMachinesBtn.addEventListener('click', (e) => {
            e.stopPropagation();
            openMachineModal();
            domElements.actionsDropdownMenu.classList.add('hidden');
        });
    }
    
    if (domElements.closeCustomerModalBtn) {
        domElements.closeCustomerModalBtn.addEventListener('click', closeCustomerModal);
    }
    
    if (domElements.closeMachineModalBtn) {
        domElements.closeMachineModalBtn.addEventListener('click', closeMachineModal);
    }

    if (domElements.addCustomerForm) {
        domElements.addCustomerForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            const newName = domElements.newCustomerName.value.trim();
            if (newName && !state.customers.find(c => c.toLowerCase() === newName.toLowerCase())) {
                utils.showLoadingOverlay(domElements.loadingOverlay);
                try {
                    await api.addCustomerOnBackend({ name: newName });
                    state.customers.push(newName);
                    state.customers.sort();
                    domElements.newCustomerName.value = '';
                    renderCustomerModalList();
                    renderAll(); 
                    utils.showNotification(`Customer "${newName}" added!`, 'success', domElements.notificationContainer);
                } catch (error) {
                    utils.showNotification("Could not save customer.", "error", domElements.notificationContainer);
                } finally {
                    utils.hideLoadingOverlay(domElements.loadingOverlay);
                }
            } else {
                utils.showNotification("Customer name is empty or already exists.", "error", domElements.notificationContainer);
            }
        });
    }

    if (domElements.addMachineForm) {
        domElements.addMachineForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            const newName = domElements.newMachineName.value.trim();
            if (newName && !state.machines.find(m => m.name.toLowerCase() === newName.toLowerCase())) {
                const newMachine = { name: newName, hasRobot: domElements.newMachineHasRobot.checked };
                utils.showLoadingOverlay(domElements.loadingOverlay);
                try {
                    await api.addMachineOnBackend(newMachine);
                    state.machines.push(newMachine);
                    domElements.newMachineName.value = '';
                    domElements.newMachineHasRobot.checked = false;
                    renderMachineModalList();
                    renderAll();
                    utils.showNotification(`Machine "${newName}" added!`, 'success', domElements.notificationContainer);
                } catch (error) {
                    utils.showNotification("Could not save machine.", "error", domElements.notificationContainer);
                } finally {
                    utils.hideLoadingOverlay(domElements.loadingOverlay);
                }
            } else {
                utils.showNotification("Machine name is empty or already exists.", "error", domElements.notificationContainer);
            }
        });
    }

    if (domElements.customerList) {
        domElements.customerList.addEventListener('click', (e) => {
            if (e.target.classList.contains('delete-customer-btn')) {
                const customerToDelete = e.target.dataset.customer;
                openConfirmModal('Delete Customer', `Are you sure you want to delete "${customerToDelete}"?`, async () => {
                    utils.showLoadingOverlay(domElements.loadingOverlay);
                    try {
                        await api.deleteCustomerOnBackend(customerToDelete);
                        state.customers = state.customers.filter(c => c !== customerToDelete);
                        renderCustomerModalList();
                        renderAll();
                        utils.showNotification(`Customer "${customerToDelete}" deleted.`, 'success', domElements.notificationContainer);
                    } catch (error) {
                        utils.showNotification("Could not delete customer.", "error", domElements.notificationContainer);
                    } finally {
                        utils.hideLoadingOverlay(domElements.loadingOverlay);
                    }
                });
            }
        });
    }

    if (domElements.machineList) {
        domElements.machineList.addEventListener('click', (e) => {
            if (e.target.classList.contains('delete-machine-btn')) {
                const machineToDelete = e.target.dataset.machineName;
                openConfirmModal('Delete Machine', `Are you sure you want to delete "${machineToDelete}"?`, async () => {
                    utils.showLoadingOverlay(domElements.loadingOverlay);
                    try {
                        await api.deleteMachineOnBackend(machineToDelete);
                        state.machines = state.machines.filter(m => m.name !== machineToDelete);
                        renderMachineModalList();
                        renderAll();
                        utils.showNotification(`Machine "${machineToDelete}" deleted.`, 'success', domElements.notificationContainer);
                    } catch (error) {
                        utils.showNotification("Could not delete machine.", "error", domElements.notificationContainer);
                    } finally {
                        utils.hideLoadingOverlay(domElements.loadingOverlay);
                    }
                });
            }
        });
    }
}