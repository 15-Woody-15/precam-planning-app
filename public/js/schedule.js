// js/schedule.js - DEFINITIEVE, GECORRIGEERDE VERSIE

import { state, getPlannableItems } from './state.js';
import * as utils from './utils.js';

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
        const itemId = item.id || item.batchId;
        if (!schedule[item.machine]) {
            console.error(`Error: Machine "${item.machine}" not found for item ${itemId}.`);
            return;
        }

        let remainingHours = item.totalHours || 0;
        let currentDate = new Date(item.startDate + 'T00:00:00');
        let actualStartDate = null;

        while (remainingHours > 0.01) {
            const dateString = utils.formatDateToYMD(currentDate);
            if (!schedule[item.machine][dateString]) {
                schedule[item.machine][dateString] = { parts: [], totalHours: 0 };
            }
            const daySchedule = schedule[item.machine][dateString];
            
            let dayCapacity = 8;
            if (item.shift === 24) dayCapacity = 24;
            else if (item.shift === 16) dayCapacity = 16;

            // --- DE FIX: Sla het weekend alleen over voor 8-uurs shifts ---
            if (item.shift === 8 && (currentDate.getDay() === 6 || currentDate.getDay() === 0)) {
                currentDate.setDate(currentDate.getDate() + 1);
                continue;
            }

            const availableHours = dayCapacity - daySchedule.totalHours;
            const hoursToBookToday = Math.min(remainingHours, availableHours);

            if (hoursToBookToday > 0) {
                if (!actualStartDate) actualStartDate = new Date(currentDate);
                daySchedule.parts.push({ partId: itemId, hours: hoursToBookToday });
                daySchedule.totalHours += hoursToBookToday;
                remainingHours -= hoursToBookToday;
            }

            if (remainingHours > 0.01) {
                currentDate.setDate(currentDate.getDate() + 1);
            }
        }
        partScheduleInfo.set(itemId, {
            actualStartDate: actualStartDate,
            actualEndDate: new Date(currentDate),
            isDelayed: actualStartDate && utils.formatDateToYMD(actualStartDate) !== item.startDate
        });
    });

    const allPlannableItems = getPlannableItems();
    allPlannableItems.forEach(item => {
        const scheduleInfo = partScheduleInfo.get(item.id || item.batchId);
        if (scheduleInfo && scheduleInfo.actualEndDate && item.productionDeadline) {
            const endDate = scheduleInfo.actualEndDate;
            const deadlineDate = new Date(item.productionDeadline + 'T23:59:59');
            if (endDate > deadlineDate) {
                deadlineInfo.set(item.id || item.batchId, true);
            }
        }
    });

    for (const machineName in schedule) {
        for (const date in schedule[machineName]) {
            const daySchedule = schedule[machineName][date];
            if (daySchedule.parts.length === 0) continue;

            const partIdsOnDay = daySchedule.parts.map(p => p.partId);
            const itemsOnDay = allPlannableItems.filter(item => partIdsOnDay.includes(item.id || item.batchId));
            const maxShift = Math.max(...itemsOnDay.map(item => item.shift || 8));
            const dayCapacity = maxShift;

            if (daySchedule.totalHours > dayCapacity + 0.01) {
                daySchedule.parts.forEach(p => {
                    const conflictingParts = daySchedule.parts.map(p2 => p2.partId).filter(id => id !== p.partId);
                    conflicts.set(p.partId, conflictingParts);
                });
            }
        }
    }

    return { schedule, conflicts, partScheduleInfo, deadlineInfo };
}

export function calculateMachineLoad(scheduleInfo, gridStartDate) {
    const { schedule } = scheduleInfo;
    const loadData = {};

    const getMachineWeeklyCapacity = (machine) => {
        if (machine.hasRobot) return 7 * 24;
        if (machine.name.includes('DMU')) return 5 * 16;
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