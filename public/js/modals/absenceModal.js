// js/modals/absenceModal.js

import { domElements, renderAll } from '../ui.js';
import { state } from '../state.js';
import * as absences from '../absences.js';
import * as utils from '../utils.js';
import { openConfirmModal } from './confirmModal.js';

// --- Module-level state (verplaatst van ui.js) ---
let absenceStartDate = null;
let absenceEndDate = null;
let currentCalendarDate = new Date();

// --- Private Functions (verplaatst van ui.js) ---

function closeAbsenceModal() {
    domElements.absenceModal.classList.add('hidden');
}

function closeManageAbsencesModal() {
    domElements.manageAbsencesModal.classList.add('hidden');
}

function renderAbsenceCalendar() {
    const container = domElements.absenceCalendarContainer;
    if(!container) return;
    container.innerHTML = '';

    const year = currentCalendarDate.getFullYear();
    const month = currentCalendarDate.getMonth();

    const header = document.createElement('div');
    header.className = 'flex justify-between items-center mb-2 font-semibold';
    header.innerHTML = `
        <button type="button" id="prev-month-btn" class="p-1 rounded-full hover:bg-gray-200">&lt;</button>
        <span>${currentCalendarDate.toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}</span>
        <button type="button" id="next-month-btn" class="p-1 rounded-full hover:bg-gray-200">&gt;</button>
    `;
    container.appendChild(header);

    const grid = document.createElement('div');
    grid.className = 'calendar-grid';
    
    const weekdays = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
    weekdays.forEach(day => {
        grid.innerHTML += `<div class="font-bold text-xs text-gray-500">${day}</div>`;
    });
    
    const firstDayOfMonth = new Date(year, month, 1).getDay();
    const daysInMonth = new Date(year, month + 1, 0).getDate();

    for (let i = 0; i < firstDayOfMonth; i++) {
        grid.appendChild(document.createElement('div'));
    }

    for (let day = 1; day <= daysInMonth; day++) {
        const dayEl = document.createElement('div');
        dayEl.textContent = day;
        dayEl.className = 'calendar-day';
        dayEl.dataset.date = `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
        
        const currentDate = new Date(dayEl.dataset.date);
        if (absenceStartDate && absenceEndDate && currentDate >= absenceStartDate && currentDate <= absenceEndDate) {
            dayEl.classList.add('in-range');
            if (currentDate.getTime() === absenceStartDate.getTime()) dayEl.classList.add('range-start', 'selected');
            if (currentDate.getTime() === absenceEndDate.getTime()) dayEl.classList.add('range-end', 'selected');
        } else if (absenceStartDate && currentDate.getTime() === absenceStartDate.getTime()) {
            dayEl.classList.add('selected');
        }
        grid.appendChild(dayEl);
    }
    container.appendChild(grid);
}

function handleCalendarDayClick(e) {
    const target = e.target;
    if (!target.classList.contains('calendar-day') || target.classList.contains('other-month')) return;

    const date = new Date(target.dataset.date + 'T00:00:00');

    if (!absenceStartDate || (absenceStartDate && absenceEndDate)) {
        absenceStartDate = date;
        absenceEndDate = null;
    } else if (date < absenceStartDate) {
        absenceStartDate = date;
    } else {
        absenceEndDate = date;
    }

    renderAbsenceCalendar();
    updateSelectedAbsenceDatesDisplay();
}

function updateSelectedAbsenceDatesDisplay() {
    if (domElements.selectedAbsenceDates) {
        if (absenceStartDate && absenceEndDate) {
            domElements.selectedAbsenceDates.textContent = `${absenceStartDate.toLocaleDateString()} - ${absenceEndDate.toLocaleDateString()}`;
        } else if (absenceStartDate) {
            domElements.selectedAbsenceDates.textContent = absenceStartDate.toLocaleDateString();
        } else {
            domElements.selectedAbsenceDates.textContent = '-';
        }
    }
}

function getAbsenceDates() {
    return { absenceStartDate, absenceEndDate };
}

function navigateCalendar(direction) {
    currentCalendarDate.setMonth(currentCalendarDate.getMonth() + direction);
    renderAbsenceCalendar();
}

function renderAbsenceList() {
    const absenceList = domElements.absenceList;
    if (!absenceList) return;

    // Gebruik state.absences direct (vervangt absences.getAbsences())
    const savedAbsences = state.absences;
    absenceList.innerHTML = '';

    if (savedAbsences.length === 0) {
        absenceList.innerHTML = `<li class="text-center text-gray-500 py-4">Geen afwezigheden gevonden.</li>`;
        return;
    }

    savedAbsences.sort((a,b) => new Date(b.start) - new Date(a.start)).forEach(absence => {
        const li = document.createElement('li');
        li.className = 'flex justify-between items-center p-3 bg-gray-100 rounded-md';
        const deleteButtonHTML = absence.id ? `<button data-absence-id="${absence.id}" class="delete-absence-btn text-red-500 hover:text-red-700 font-bold px-2">&times;</button>` : '';
        li.innerHTML = `
            <div>
                <span class="font-semibold">${absence.reason}</span>
                <span class="text-sm text-gray-600 ml-2">(${utils.formatDateToYMD(absence.start)} t/m ${utils.formatDateToYMD(absence.end)})</span>
            </div>
            ${deleteButtonHTML}
        `;
        absenceList.appendChild(li);
    });
}

// --- Public Functions (verplaatst van ui.js) ---

export function openAbsenceModal() {
    absenceStartDate = null;
    absenceEndDate = null;
    currentCalendarDate = new Date();
    domElements.addAbsenceForm.reset();
    renderAbsenceCalendar();
    updateSelectedAbsenceDatesDisplay();
    domElements.absenceModal.classList.remove('hidden');
}

export function openManageAbsencesModal() {
    renderAbsenceList();
    domElements.manageAbsencesModal.classList.remove('hidden');
}

// --- Event Listeners (verplaatst van events.js) ---

export function initializeAbsenceModalEvents() {
    if(domElements.addAbsenceBtn) {
        domElements.addAbsenceBtn.addEventListener('click', openAbsenceModal);
    }
    
    if(domElements.cancelAbsenceBtn) {
        domElements.cancelAbsenceBtn.addEventListener('click', closeAbsenceModal);
    }
    
    if(domElements.addAbsenceForm) {
        domElements.addAbsenceForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            const reason = domElements.absenceReason.value;
            const { absenceStartDate, absenceEndDate } = getAbsenceDates();
            if (reason && absenceStartDate && absenceEndDate) {
                await absences.addAbsence({ 
                    start: utils.formatDateToYMD(absenceStartDate), 
                    end: utils.formatDateToYMD(absenceEndDate), 
                    reason 
                });
                closeAbsenceModal();
                renderAll();
                // ui.renderAll() wordt aangeroepen vanuit events.js (na de await)
                // We moeten ui.renderAll() importeren en aanroepen.
                // Beter nog: we laten de aanroeper dit doen.
                
                // Oh, wacht. De *aanroeper* is `events.js`, die `ui.renderAll()`
                // al importeert. We moeten `ui.renderAll` hier importeren.
                
                // Nog beter: we roepen het niet aan. `absences.addAbsence`
                // update de state. We moeten `ui.renderAll` importeren in
                // `events.js` en het *daar* aanroepen na de submit.
                
                // Laten we de originele logica bekijken:
                // events.js: ... await absences.addAbsence(...); ui.closeAbsenceModal(); ui.renderAll();
                // Dit is de beste plek. We hoeven hier niets te doen behalve
                // de modal te sluiten.
                
            } else {
                utils.showNotification('Please provide a reason and select a start and end date.', 'error', domElements.notificationContainer);
            }
        });
    }

    if (domElements.closeManageAbsencesBtn) {
        domElements.closeManageAbsencesBtn.addEventListener('click', closeManageAbsencesModal);
    }

    if (domElements.manageAbsencesBtn) {
        domElements.manageAbsencesBtn.addEventListener('click', (e) => {
            e.stopPropagation();
            openManageAbsencesModal();
            domElements.actionsDropdownMenu.classList.add('hidden');
        });
    }
    
    if (domElements.absenceCalendarContainer) {
        domElements.absenceCalendarContainer.addEventListener('click', (e) => {
            const target = e.target;
            if (target.id === 'prev-month-btn' || target.id === 'next-month-btn') {
                navigateCalendar(target.id === 'prev-month-btn' ? -1 : 1);
            } else if (target.classList.contains('calendar-day')) {
                handleCalendarDayClick(e);
            }
        });
    }

    if (domElements.absenceList) {
        domElements.absenceList.addEventListener('click', (e) => {
            const deleteButton = e.target.closest('.delete-absence-btn');
            if (deleteButton) {
                const absenceId = parseInt(deleteButton.dataset.absenceId, 10);
                if (!absenceId) {
                    console.error('Could not find a valid absence ID on the button.');
                    return;
                }
                openConfirmModal(
                    'Delete Absence',
                    'Are you sure you want to delete this absence?',
                    async () => {
                        await absences.removeAbsence(absenceId);
                        utils.showNotification('Absence removed successfully.', 'success', domElements.notificationContainer);
                        renderAbsenceList(); // Her-render de lijst in de modal
                        renderAll();
                        // ui.renderAll() moet in de main events.js
                    }
                );
            }
        });
    }
}