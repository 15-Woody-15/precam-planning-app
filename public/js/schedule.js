import { state, findPart } from './state.js';
import * as utils from './utils.js';

/**
 * Berekent het volledige productieschema en detecteert conflicten.
 * @returns {object} Een object met het schema, conflicten, en part-specifieke info.
 */
export function buildScheduleAndDetectConflicts() {
    const schedule = {};
    const conflicts = new Map();
    const partScheduleInfo = new Map();
    const deadlineInfo = new Map();

    state.machines.forEach(m => schedule[m.name] = {});

    const partsToSchedule = state.orders
        .flatMap(order =>
            order.parts.map(part => ({ ...part, isUrgent: order.isUrgent }))
        )
        .filter(p => p.machine && p.startDate && p.status !== 'Completed')
        .sort((a, b) => new Date(a.startDate) - new Date(b.startDate) || (b.isUrgent - a.isUrgent));

    partsToSchedule.forEach(part => {
        if (!schedule[part.machine]) {
            console.error(`Error: Machine "${part.machine}" found in an order part, but not in the machine list. Skipping this part.`);
            return;
        }
        let remainingHours = utils.getPartDuration(part);
        let currentDate = new Date(part.startDate + 'T00:00:00');
        let actualStartDate = null;
        while (remainingHours > 0.01) {
            if (part.shift === 8 && (currentDate.getDay() === 6 || currentDate.getDay() === 0)) {
                currentDate.setDate(currentDate.getDate() + 1);
                continue;
            }

            const dateString = utils.formatDateToYMD(currentDate);
            if (!schedule[part.machine][dateString]) {
                schedule[part.machine][dateString] = { parts: [], totalHours: 0 };
            }

            const daySchedule = schedule[part.machine][dateString];
            const dayCapacity = daySchedule.parts.length > 0 ? findPart(daySchedule.parts[0].partId).shift : part.shift;
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
                daySchedule.parts.push({ partId: part.id, hours: hoursToBook });
                daySchedule.totalHours += hoursToBook;
            }
            remainingHours -= hoursToBook;

            if (remainingHours > 0.01) {
                currentDate.setDate(currentDate.getDate() + 1);
            }
        }
        partScheduleInfo.set(part.id, {
            actualStartDate: actualStartDate,
            actualEndDate: new Date(currentDate),
            isDelayed: actualStartDate && utils.formatDateToYMD(actualStartDate) !== part.startDate
        });
    });

    state.orders.forEach(order => {
        let latestEndDate = null;
        order.parts.forEach(part => {
            const info = partScheduleInfo.get(part.id);
            if (info && info.actualEndDate && (!latestEndDate || info.actualEndDate > latestEndDate)) {
                latestEndDate = info.actualEndDate;
            }
        });

        if (latestEndDate && order.deadline) {
            const deadlineDate = new Date(order.deadline);
            if (latestEndDate > deadlineDate) {
                deadlineInfo.set(order.id, true);
            }
        }
    });

    for (const machine in schedule) {
        for (const date in schedule[machine]) {
            const dayInfo = schedule[machine][date];
            if (dayInfo.parts.length <= 1) continue;
            const firstPartShift = findPart(dayInfo.parts[0].partId).shift;
            let hasShiftMismatch = dayInfo.parts.some(p => findPart(p.partId).shift !== firstPartShift);
            let isOverbooked = dayInfo.totalHours > firstPartShift + 0.01;
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