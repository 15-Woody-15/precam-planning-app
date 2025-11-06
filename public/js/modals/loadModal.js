// js/modals/loadModal.js

import { state } from '../state.js';
import * as schedule from '../schedule.js';
import { domElements, renderAll } from '../ui.js';

/**
 * Rendert de machine load modal op basis van de berekende load data.
 * @param {object} loadData - De berekende load data per week.
 */
export function renderMachineLoad(loadData) {
    if (!domElements.machineLoadModal) return;
    
    if (state.isLoadModalVisible) {
        domElements.machineLoadModal.classList.remove('hidden');
    } else {
        domElements.machineLoadModal.classList.add('hidden');
        return;
    }
    
    const content = domElements.loadWeekContent;
    const title = domElements.loadWeekTitle;
    const prevBtn = domElements.prevLoadWeekBtn;
    const nextBtn = domElements.nextLoadWeekBtn;
    
    if(!content || !title || !prevBtn || !nextBtn) return;

    const currentWeek = state.machineLoadWeek;
    if (!currentWeek || !loadData[currentWeek]) {
        content.innerHTML = '<p class="text-center text-gray-500 text-sm">No data to display for this week.</p>';
        title.textContent = 'Machine Load';
        prevBtn.disabled = true;
        nextBtn.disabled = true;
        return;
    }
    title.textContent = `Machine Load Week ${currentWeek}`;
    content.innerHTML = '';
    
    const availableWeeks = Object.keys(loadData).filter(w => w !== 'NaN').sort((a,b) => a - b);
    const currentIndex = availableWeeks.indexOf(String(currentWeek));
    prevBtn.disabled = currentIndex <= 0;
    nextBtn.disabled = currentIndex >= availableWeeks.length - 1;

    state.machines.sort((a,b) => a.name.localeCompare(b.name)).forEach(machine => {
        const data = loadData[currentWeek][machine.name];
        const scheduled = Math.round(data.scheduled);
        const capacity = data.capacity;
        const percentage = capacity > 0 ? (scheduled / capacity) * 100 : 0;
        const displayPercentage = Math.min(percentage, 100);
        const isOverbooked = scheduled > capacity;
        let barColor = 'bg-green-500';
        if (percentage > 85) barColor = 'bg-yellow-500';
        if (isOverbooked) barColor = 'bg-red-500';
        
        const machineDiv = document.createElement('div');
        machineDiv.innerHTML = `
            <div class="flex justify-between items-center mb-1">
                <span class="font-medium text-sm text-gray-800">${machine.name}</span>
                <span class="text-xs font-semibold ${isOverbooked ? 'text-red-600' : 'text-gray-500'}">${scheduled}h / ${capacity}h</span>
            </div>
            <div class="w-full bg-gray-200 rounded-full h-4 overflow-hidden">
                <div class="${barColor} h-4 rounded-full" style="width: ${displayPercentage}%"></div>
            </div>
            <p class="text-right text-xs font-bold ${isOverbooked ? 'text-red-600' : 'text-gray-700'} mt-1">${Math.round(percentage)}%${isOverbooked ? ' (Overloaded!)' : ''}</p>
        `;
        content.appendChild(machineDiv);
    });
}


/**
 * Initialiseert de event listeners voor de machine load modal.
 */
export function initializeLoadModalEvents() {

    if(domElements.showLoadBtn) domElements.showLoadBtn.addEventListener('click', () => {
        state.isLoadModalVisible = true;
        // renderAll() wordt aangeroepen vanuit de aanroeper (events.js)
        // We moeten renderAll importeren en hier aanroepen.
        // Oeps, nee, we moeten renderAll NIET importeren.
        // We moeten de `renderMachineLoad` functie aanroepen.
        // Beter nog: we roepen `ui.renderAll()` aan.
        
        // De originele code in events.js was:
        // state.isLoadModalVisible = true; ui.renderAll();
        // Laten we dat hier ook doen.
        
        // Fout: ui is hier niet bekend.
        // We hebben `renderAll` nodig.
        
        // Laten we de `renderAll` import toevoegen.
        renderAll();
    });

    if (domElements.closeLoadModalBtn) domElements.closeLoadModalBtn.addEventListener('click', () => {
        state.isLoadModalVisible = false;
        renderAll();
        // renderAll(); // Roep renderAll aan om de modal te verbergen
    });

    if (domElements.machineLoadModal) domElements.machineLoadModal.addEventListener('click', (e) => {
        if (e.target.id === 'machine-load-modal') {
            state.isLoadModalVisible = false;
            renderAll();
            // renderAll(); // Roep renderAll aan om de modal te verbergen
        }
    });

    if (domElements.prevLoadWeekBtn) {
        domElements.prevLoadWeekBtn.addEventListener('click', () => {
            const scheduleInfo = schedule.buildScheduleAndDetectConflicts();
            const machineLoadInfo = schedule.calculateMachineLoad(scheduleInfo, state.planningStartDate);
            const availableWeeks = Object.keys(machineLoadInfo).filter(w => w !== 'NaN').sort((a, b) => a - b);
            const currentIndex = availableWeeks.indexOf(String(state.machineLoadWeek));
            if (currentIndex > 0) {
                state.machineLoadWeek = parseInt(availableWeeks[currentIndex - 1]);
                renderAll();
                // renderAll(); // Roep renderAll aan om de week te updaten
            }
        });
    }

    if (domElements.nextLoadWeekBtn) {
        domElements.nextLoadWeekBtn.addEventListener('click', () => {
            const scheduleInfo = schedule.buildScheduleAndDetectConflicts();
            const machineLoadInfo = schedule.calculateMachineLoad(scheduleInfo, state.planningStartDate);
            const availableWeeks = Object.keys(machineLoadInfo).filter(w => w !== 'NaN').sort((a, b) => a - b);
            const currentIndex = availableWeeks.indexOf(String(state.machineLoadWeek));
            if (currentIndex < availableWeeks.length - 1) {
                state.machineLoadWeek = parseInt(availableWeeks[currentIndex + 1]);
                renderAll();
                // renderAll(); // Roep renderAll aan om de week te updaten
            }
        });
    }
}