// js/schedule.js

import { state, findPart, findBatch, getPlannableItems } from './state.js';
import * as utils from './utils.js';

/**
 * Berekent het volledige productieschema en detecteert conflicten.
 * @returns {object} Een object met het schema, conflicten, en item-specifieke info.
 */
export function buildScheduleAndDetectConflicts() {
    const schedule = {};
    const conflicts = new Map();
    const partScheduleInfo = new Map();
    const deadlineInfo = new Map();

    state.machines.forEach(m => schedule[m.name] = {});

    const itemsToSchedule = getPlannableItems()
        .filter(item => item.machine && item.startDate && item.status !== 'Completed')
        .sort((a, b) => new Date(a.startDate) - new Date(b.startDate) || (b.isUrgent - a.isUrgent));

    itemsToSchedule.forEach(item => {
        if (!schedule[item.machine]) {
            console.error(`Error: Machine "${item.machine}" not found. Skipping item.`);
            return;
        }
        let remainingHours = item.totalHours || 0;
        let currentDate = new Date(item.startDate + 'T00:00:00');
        let actualStartDate = null;

        while (remainingHours > 0.01) {
            if (item.shift === 8 && (currentDate.getDay() === 6 || currentDate.getDay() === 0)) {
                currentDate.setDate(currentDate.getDate() + 1);
                continue;
            }

            const dateString = utils.formatDateToYMD(currentDate);
            if (!schedule[item.machine][dateString]) {
                schedule[item.machine][dateString] = { parts: [], totalHours: 0 };
            }

            const daySchedule = schedule[item.machine][dateString];
            const dayCapacity = item.shift || 8;
            const availableHours = dayCapacity - daySchedule.totalHours;

            if (!actualStartDate) {
                if (availableHours <= 0) {
                    currentDate.setDate(currentDate.getDate() + 1);
                    continue;
                }
                actualStartDate = new Date(currentDate);
            }

            const hoursToBook = Math.min(remainingHours, availableHours);
            if (hoursToBook > 0) {
                daySchedule.parts.push({ partId: item.id, hours: hoursToBook });
                daySchedule.totalHours += hoursToBook;
            }
            remainingHours -= hoursToBook;

            if (remainingHours > 0.01) {
                currentDate.setDate(currentDate.getDate() + 1);
            }
        }
        partScheduleInfo.set(item.id, {
            actualStartDate: actualStartDate,
            actualEndDate: new Date(currentDate),
            isDelayed: actualStartDate && utils.formatDateToYMD(actualStartDate) !== item.startDate
        });
    });

    // =================== DIT IS DE AANGEPASTE DEADLINE-CONTROLE ===================
    const allPlannableItems = getPlannableItems();

    state.orders.forEach(order => {
        let orderWillMissDeadline = false;
        const itemsInOrder = allPlannableItems.filter(i => i.orderId === order.id);
        
        itemsInOrder.forEach(item => {
            const scheduleInfo = partScheduleInfo.get(item.id);
            // Check of de taak een geplande einddatum en een productiedeadline heeft
            if (scheduleInfo && scheduleInfo.actualEndDate && item.productionDeadline) {
                const endDate = scheduleInfo.actualEndDate;
                const deadlineDate = new Date(item.productionDeadline + 'T23:59:59'); // Einde van de dag
                
                // Als de einddatum LATER is dan de productiedeadline, markeer de order
                if (endDate > deadlineDate) {
                    orderWillMissDeadline = true;
                }
            }
        });

        if (orderWillMissDeadline) {
            deadlineInfo.set(order.id, true);
        }
    });

    for (const machine in schedule) {
        for (const date in schedule[machine]) {
            const dayInfo = schedule[machine][date];
            if (dayInfo.parts.length <= 1) continue;

            const getItem = (id) => getPlannableItems().find(i => i.id === id);
            
            const firstItem = getItem(dayInfo.parts[0].partId);
            if (!firstItem) continue;

            const firstPartShift = firstItem.shift;
            
            let hasShiftMismatch = dayInfo.parts.some(p => {
                const currentItem = getItem(p.partId);
                return currentItem && currentItem.shift !== firstPartShift;
            });
            let isOverbooked = dayInfo.totalHours > (firstPartShift || 8) + 0.01;

            if (isOverbooked || hasShiftMismatch) {
                dayInfo.parts.forEach(p => conflicts.set(p.partId, dayInfo.parts.map(p2 => p2.partId).filter(id => id !== p.partId)));
            }
        }
    }
    return { schedule, conflicts, partScheduleInfo, deadlineInfo };
}

/**
 * Berekent de machinebelasting per week.
 * @param {object} scheduleInfo - Het schema-object van buildScheduleAndDetectConflicts.
 * @param {Date} gridStartDate - De startdatum van de planning.
 * @returns {object} Een object met de machinebelasting per week.
 */
export function calculateMachineLoad(scheduleInfo, gridStartDate) {
    const { schedule } = scheduleInfo;
    const loadData = {};
    const getMachineWeeklyCapacity = (machine) => {
        if (machine.hasRobot) return 7 * 24;
        if (machine.name.includes('DMU')) return 7 * 16;
        return 5 * 8;
    };
    for (let i = 0; i < 30; i++) {
        const d = new Date(gridStartDate);
        d.setDate(gridStartDate.getDate() + i);
        const week = utils.getWeekNumber(d);
        if (!loadData[week]) {
            loadData[week] = {};
            state.machines.forEach(m => {
                loadData[week][m.name] = { scheduled: 0, capacity: getMachineWeeklyCapacity(m) };
            });
        }
    }
    for (const machineName in schedule) {
        for (const dateString in schedule[machineName]) {
            const d = new Date(dateString + 'T00:00:00');
            const week = utils.getWeekNumber(d);
            const daySchedule = schedule[machineName][dateString];
            if (loadData[week] && loadData[week][machineName]) {
                loadData[week][machineName].scheduled += daySchedule.totalHours;
            }
        }
    }
    return loadData;
}