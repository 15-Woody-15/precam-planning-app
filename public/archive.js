// archive.js (volledig nieuwe, opgeschoonde versie)

import * as api from './js/api.js';
import * as utils from './js/utils.js';

// --- DOM ELEMENTEN ---
const archiveListBody = document.getElementById('archive-list');
const detailsModal = document.getElementById('archive-details-modal');
const modalTitle = document.getElementById('archive-modal-title');
const modalContent = document.getElementById('archive-modal-content');
const closeModalBtn = document.getElementById('close-archive-modal-btn');

const confirmModal = document.getElementById('confirm-delete-modal');
const confirmTitle = document.getElementById('delete-confirm-title');
const confirmText = document.getElementById('delete-confirm-text');
const confirmBtn = document.getElementById('confirm-delete-btn');
const cancelBtn = document.getElementById('cancel-delete-btn');
const notificationContainer = document.getElementById('notification-container');

let allArchivedOrders = [];
let onConfirmCallback = () => {};


// --- RENDER FUNCTIES ---

function renderArchiveList() {
    if (!archiveListBody) return;
    archiveListBody.innerHTML = '';

    if (allArchivedOrders.length === 0) {
        archiveListBody.innerHTML = `<tr><td colspan="7" class="text-center py-10 text-gray-500">Geen gearchiveerde orders gevonden.</td></tr>`;
        return;
    }

    allArchivedOrders.forEach(order => {
        const row = document.createElement('tr');
        row.className = 'border-b hover:bg-gray-50';
        const totalDuration = order.parts ? order.parts.reduce((sum, part) => {
            let partTotalHours = 0;
            // Als het onderdeel batches heeft, tel de uren van de batches op
            if (part.batches && part.batches.length > 0) {
                partTotalHours = part.batches.reduce((batchSum, batch) => batchSum + (batch.totalHours || 0), 0);
            } else {
                // Anders, gebruik de oude structuur
                partTotalHours = part.totalHours || 0;
            }
            return sum + partTotalHours;
        }, 0).toFixed(1) : 0;

        row.innerHTML = `
            <td class="px-3 py-3 whitespace-nowrap text-sm font-medium text-gray-900">${order.id || 'N/A'}</td>
            <td class="px-3 py-3 whitespace-nowrap text-sm text-gray-500">${order.customer || 'N/A'}</td>
            <td class="px-3 py-3 whitespace-nowrap text-sm text-gray-500">${totalDuration} uur</td>
            <td class="px-3 py-3 whitespace-nowrap text-sm text-gray-500">${order.status || 'N/A'}</td>
            <td class="px-3 py-3 whitespace-nowrap text-sm text-gray-500">${new Date(order.deadline).toLocaleDateString() || 'N/A'}</td>
            <td class="px-3 py-3 whitespace-nowrap text-sm font-medium">
                <button class="show-details-btn text-blue-600 hover:text-blue-900" data-order-id="${order.id}">Details</button>
            </td>
            <td class="px-3 py-3 whitespace-nowrap text-sm font-medium">
                <button class="delete-archive-btn text-red-600 hover:text-red-900" data-order-id="${order.id}">Delete</button>
            </td>
        `;
        archiveListBody.appendChild(row);
    });
}

function renderDetailsModal(order) {
    if (!modalTitle || !modalContent || !detailsModal) return;
    
    modalTitle.textContent = `Details voor Order: ${order.customerOrderNr || order.id}`;
    
    let partsHtml = `<ul class="list-disc list-inside space-y-2">`;
    (order.parts || []).forEach(part => {
        // --- DIT IS DE FIX ---
        // Bepaal het correcte aantal en de totale uren, ongeacht de structuur.
        const quantity = part.totalQuantity || part.quantity || 0;
        let totalHours = 0;
        if (part.batches && part.batches.length > 0) {
            totalHours = part.batches.reduce((sum, batch) => sum + (batch.totalHours || 0), 0);
        } else {
            totalHours = part.totalHours || 0;
        }
        // --- EINDE FIX ---

        partsHtml += `
            <li class="bg-gray-100 p-3 rounded-md">
                <strong>Onderdeel Naam:</strong> ${part.partName}<br>
                <strong>Tekening Nr:</strong> ${part.drawingNumber || 'N/A'}<br>
                <strong>Aantal:</strong> ${quantity} stuks<br>
                <strong>Totale Tijdsduur:</strong> ${totalHours.toFixed(1)} uur
            </li>
        `;
    });
    partsHtml += `</ul>`;
    
    modalContent.innerHTML = partsHtml;
    detailsModal.classList.remove('hidden');
}

function openConfirmModal(title, text, onConfirm) {
    confirmTitle.textContent = title;
    confirmText.textContent = text;
    onConfirmCallback = onConfirm;
    confirmModal.classList.remove('hidden');
}

function closeConfirmModal() {
    confirmModal.classList.add('hidden');
    onConfirmCallback = () => {};
}


// --- DATA & EVENT LISTENERS ---

async function initialize() {
    try {
        allArchivedOrders = await api.fetchArchivedOrders();
        renderArchiveList();
    } catch (error) {
        console.error("Error fetching data:", error);
        utils.showNotification('Could not fetch archived orders.', 'error', notificationContainer);
    }
}

function attachEventListeners() {
    // Listener voor de hele pagina (event delegation)
    document.addEventListener('click', async (e) => {
        const target = e.target;

        // Details knop
        if (target.classList.contains('show-details-btn')) {
            const orderId = target.dataset.orderId;
            const order = allArchivedOrders.find(o => o.id === orderId);
            if (order) renderDetailsModal(order);
        }

        // Delete knop
        if (target.classList.contains('delete-archive-btn')) {
            const orderId = target.dataset.orderId;
            openConfirmModal(
                'Verwijder Order', 
                `Weet je zeker dat je order "${orderId}" permanent wilt verwijderen?`, 
                async () => {
                    try {
                        await api.deleteOrderOnBackend(orderId);
                        utils.showNotification(`Order ${orderId} is verwijderd.`, 'success', notificationContainer);
                        await initialize(); // Herlaad de lijst
                    } catch (error) {
                        utils.showNotification(`Kon order niet verwijderen: ${error.message}`, 'error', notificationContainer);
                    }
                }
            );
        }
    });

    // Listeners voor de modals
    closeModalBtn?.addEventListener('click', () => detailsModal.classList.add('hidden'));
    detailsModal?.addEventListener('click', (e) => {
        if (e.target.id === 'archive-details-modal') detailsModal.classList.add('hidden');
    });

    confirmBtn?.addEventListener('click', () => {
        if(typeof onConfirmCallback === 'function') onConfirmCallback();
        closeConfirmModal();
    });
    cancelBtn?.addEventListener('click', closeConfirmModal);
    confirmModal?.addEventListener('click', (e) => {
        if (e.target.id === 'confirm-delete-modal') closeConfirmModal();
    });
}


// --- INITIALISATIE ---
document.addEventListener('DOMContentLoaded', () => {
    initialize();
    attachEventListeners();
});