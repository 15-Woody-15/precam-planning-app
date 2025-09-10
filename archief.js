// --- CONFIGURATIE ---
// Zorg dat deze URL overeenkomt met de URL in app-V2.js
// const API_URL = 'https://precam-planning-api-app.onrender.com/api';
const API_URL = 'https://precam-planning-api-app.onrender.com/api';

// --- STATE ---
let state = {
    orders: [],
    searchTerm: '',
    searchKey: 'id'
};

// --- DOM ELEMENTEN ---
let orderListBody, searchInput, searchKeySelect, themeToggleBtn, themeToggleDarkIcon, themeToggleLightIcon;

function initializeDOMElements() {
    orderListBody = document.getElementById('order-list');
    searchInput = document.getElementById('search-input');
    searchKeySelect = document.getElementById('search-key');
    themeToggleBtn = document.getElementById('theme-toggle-btn');
    themeToggleDarkIcon = document.getElementById('theme-toggle-dark-icon');
    themeToggleLightIcon = document.getElementById('theme-toggle-light-icon');
}

// --- RENDER FUNCTIE ---
function renderArchivedOrders() {
    if (!orderListBody) return;
    orderListBody.innerHTML = '';

    const filteredOrders = state.orders.filter(order => {
        if (!state.searchTerm) return true;
        const term = state.searchTerm.toLowerCase();
        const value = (order[state.searchKey] || '').toString().toLowerCase();
        return value.includes(term);
    }).sort((a, b) => b.deadline.localeCompare(a.deadline));

    if (filteredOrders.length === 0) {
        orderListBody.innerHTML = `<tr><td colspan="6" class="text-center py-8 text-gray-500">Geen gearchiveerde orders gevonden.</td></tr>`;
        return;
    }

    filteredOrders.forEach(order => {
        // Maak de hoofdrij voor de order
        const groupTr = document.createElement('tr');
        groupTr.className = 'archive-group-row cursor-pointer';
        groupTr.dataset.orderId = order.id;
        groupTr.innerHTML = `
            <td class="px-3 py-3 font-semibold">
                <div class="flex items-center">
                    <svg class="w-4 h-4 mr-2 transition-transform chevron-icon" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5l7 7-7 7" /></svg>
                    ${order.id}
                </div>
            </td>
            <td class="px-3 py-3">${order.klant}</td>
            <td class="px-3 py-3" colspan="3"></td> <td class="px-3 py-3">${new Date(order.deadline).toLocaleDateString('nl-NL')}</td>
        `;
        orderListBody.appendChild(groupTr);

        // Maak de rijen voor elk onderdeel (standaard verborgen)
        order.parts.forEach(part => {
            const partTr = document.createElement('tr');
            partTr.className = 'part-row hidden bg-white';
            partTr.dataset.parentOrderId = order.id;
            partTr.innerHTML = `
                <td class="pl-10 pr-3 py-2 text-sm" title="Tekening: ${part.tekeningNummer || ''}">${part.onderdeelNaam}</td>
                <td></td> <td class="px-3 py-2 text-sm">${part.productieTijdPerStuk} min</td>
                <td class="px-3 py-2 text-sm">${part.aantal} st</td>
                <td class="px-3 py-2 text-sm">${part.machine || 'Niet gepland'}</td>
                <td></td> `;
            orderListBody.appendChild(partTr);
        });
    });
}

// --- EVENT LISTENERS ---
// archief.js

function setupEventListeners() {
    searchInput.addEventListener('keyup', () => {
        state.searchTerm = searchInput.value;
        renderArchivedOrders();
    });

    searchKeySelect.addEventListener('change', () => {
        state.searchKey = searchKeySelect.value;
        renderArchivedOrders();
    });

    orderListBody.addEventListener('click', (e) => {
        const groupRow = e.target.closest('.archive-group-row');
        if (!groupRow) return;

        const orderId = groupRow.dataset.orderId;
        const partRows = document.querySelectorAll(`.part-row[data-parent-order-id="${orderId}"]`);
        const chevron = groupRow.querySelector('.chevron-icon');

        partRows.forEach(row => {
            row.classList.toggle('hidden');
        });
        
        if (chevron) {
            chevron.classList.toggle('rotate-90');
        }
    });

    // Dark mode logica - PAST NU ALLEEN NOG HET THEMA TOE, ZONDER CLICK EVENT
    const applyTheme = (theme) => {
        if (theme === 'dark') {
            document.documentElement.classList.add('dark');
        } else {
            document.documentElement.classList.remove('dark');
        }
    };

    const savedTheme = localStorage.getItem('theme');
    const systemPrefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
    if (savedTheme) {
        applyTheme(savedTheme);
    } else if (systemPrefersDark) {
        applyTheme('dark');
    } else {
        applyTheme('light');
    }
}

// --- INITIALISATIE ---
document.addEventListener('DOMContentLoaded', async () => {
    initializeDOMElements();
    setupEventListeners();

    try {
        const res = await fetch(`${API_URL}/orders?archived=true`);
        if (!res.ok) throw new Error('Kon archief niet laden van de server.');
        
        state.orders = await res.json();
        renderArchivedOrders();
    } catch (error) {
        console.error(error);
        orderListBody.innerHTML = `<tr><td colspan="6" class="text-center py-8 text-red-500">${error.message}</td></tr>`;
    }
});