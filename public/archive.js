const API_URL = 'https://precam-planning-api-app.onrender.com/api';

// Functie om de totale duur te berekenen
function calculateTotalDuration(order) {
    if (!order.parts) return 0;
    const totalHours = order.parts.reduce((sum, part) => sum + (part.totalHours || 0), 0);
    return totalHours.toFixed(1);
}

// Functie om de gearchiveerde orders op te halen
async function fetchAndRenderArchivedOrders() {
    try {
        const response = await fetch(`${API_URL}/orders/archive`);
        if (!response.ok) {
            throw new Error('Could not fetch archived orders.');
        }
        const archivedOrders = await response.json();
        renderArchiveList(archivedOrders);
    } catch (error) {
        console.error("Error fetching data:", error);
    }
}

// Functie om een order permanent te verwijderen
async function deleteOrderOnBackend(orderId) {
    const response = await fetch(`${API_URL}/orders/${orderId}`, {
        method: 'DELETE',
    });
    if (!response.ok) throw new Error(`Server error on delete: ${response.statusText}`);
    return;
}

// Functie om de archieflijst te renderen
function renderArchiveList(orders) {
    const archiveListBody = document.getElementById('archive-list');
    if (!archiveListBody) return;
    
    archiveListBody.innerHTML = '';

    if (orders.length === 0) {
        const emptyRow = document.createElement('tr');
        emptyRow.innerHTML = `<td colspan="7" class="px-3 py-3 text-center text-gray-500">Geen gearchiveerde orders gevonden.</td>`;
        archiveListBody.appendChild(emptyRow);
        return;
    }

    orders.forEach(order => {
        const row = document.createElement('tr');
        row.className = 'border-b hover:bg-gray-50';
        row.innerHTML = `
            <td class="px-3 py-3 whitespace-nowrap text-sm font-medium text-gray-900">${order.id || 'N/A'}</td>
            <td class="px-3 py-3 whitespace-nowrap text-sm text-gray-500">${order.customer || 'N/A'}</td>
            <td class="px-3 py-3 whitespace-nowrap text-sm text-gray-500">${calculateTotalDuration(order)} uur</td>
            <td class="px-3 py-3 whitespace-nowrap text-sm text-gray-500">${order.status || 'N/A'}</td>
            <td class="px-3 py-3 whitespace-nowrap text-sm text-gray-500">${new Date(order.deadline).toLocaleDateString() || 'N/A'}</td>
            <td class="px-3 py-3 whitespace-nowrap text-sm font-medium">
                <button class="show-details-btn text-blue-600 hover:text-blue-900 ml-4" data-order-id="${order.id}">Details</button>
            </td>
            <td class="px-3 py-3 whitespace-nowrap text-sm font-medium">
                <button class="delete-archive-btn text-red-600 hover:text-red-900 ml-4" data-order-id="${order.id}">Delete</button>
            </td>
        `;
        archiveListBody.appendChild(row);
    });
}

// Functie om de details-modal te renderen
function renderDetailsModal(order) {
    const modalTitle = document.getElementById('archive-modal-title');
    const modalContent = document.getElementById('archive-modal-content');
    const modal = document.getElementById('archive-details-modal');

    if (!modalTitle || !modalContent || !modal) return;
    
    modalTitle.textContent = `Details voor Order: ${order.customerOrderNr || order.id}`;
    
    let partsHtml = `<ul class="list-disc list-inside space-y-2">`;
    order.parts.forEach(part => {
        partsHtml += `
            <li class="bg-gray-100 p-3 rounded-md">
                <strong>Onderdeel Naam:</strong> ${part.partName}<br>
                <strong>Tekening Nr:</strong> ${part.drawingNumber || 'N/A'}<br>
                <strong>Aantal:</strong> ${part.quantity} stuks<br>
                <strong>Prod. Tijd:</strong> ${part.productionTimePerPiece} min/stuk<br>
                <strong>Totale Tijdsduur:</strong> ${(part.totalHours || 0).toFixed(1)} uur
            </li>
        `;
    });
    partsHtml += `</ul>`;
    
    modalContent.innerHTML = partsHtml;
    modal.classList.remove('hidden');
}

// --- Modals voor delete logica ---
let onConfirmCallback = null;

function openConfirmModal(title, text, onConfirm, buttonText = 'Ja, verwijderen') {
    const confirmDeleteModal = document.getElementById('confirm-delete-modal');
    const titleEl = document.getElementById('delete-confirm-title');
    const textEl = document.getElementById('delete-confirm-text');
    const confirmBtn = document.getElementById('confirm-delete-btn');

    if (titleEl) titleEl.textContent = title;
    if (textEl) textEl.textContent = text;
    if (confirmBtn) confirmBtn.textContent = buttonText;
    
    onConfirmCallback = onConfirm;
    confirmDeleteModal.classList.remove('hidden');
}

function closeConfirmModal() {
    const confirmDeleteModal = document.getElementById('confirm-delete-modal');
    confirmDeleteModal.classList.add('hidden');
    onConfirmCallback = null;
}

// --- Event Listeners ---
document.addEventListener('DOMContentLoaded', fetchAndRenderArchivedOrders);

document.addEventListener('click', async (e) => {
    const target = e.target;
    // Sluit de details modal
    if (target.id === 'close-archive-modal-btn' || target.id === 'archive-details-modal') {
        document.getElementById('archive-details-modal').classList.add('hidden');
    }
    // Open de details modal
    else if (target.classList.contains('show-details-btn')) {
        const orderId = target.dataset.orderId;
        const response = await fetch(`${API_URL}/orders/archive`);
        const archivedOrders = await response.json();
        const order = archivedOrders.find(o => o.id === orderId);
        if (order) {
            renderDetailsModal(order);
        }
    }
    // Verwijder een order via de custom modal
    else if (target.classList.contains('delete-archive-btn')) {
        const orderId = target.dataset.orderId;
        openConfirmModal('Verwijder Order', `Weet je zeker dat je order "${orderId}" wilt verwijderen? Deze actie kan niet ongedaan worden gemaakt.`, async () => {
            try {
                await deleteOrderOnBackend(orderId);
                fetchAndRenderArchivedOrders();
            } catch (error) {
                console.error("Error deleting order:", error);
            }
        }, 'Ja, verwijder');
    }
    // Bevestigingslogica voor de delete modal
    else if (target.id === 'confirm-delete-btn') {
        if (typeof onConfirmCallback === 'function') {
            onConfirmCallback();
        }
        closeConfirmModal();
    }
    // Annuleerlogica voor de delete modal
    else if (target.id === 'cancel-delete-btn') {
        closeConfirmModal();
    }
});