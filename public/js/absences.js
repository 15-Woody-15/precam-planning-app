import { state } from './state.js';
import * as api from './api.js';

/**
 * Haalt de actuele afwezigheden op uit de centrale state.
 * @returns {Absence[]} Een array met afwezigheid-objecten.
 */
export function getAbsences() {
    return state.absences;
}

/**
 * Voegt een nieuwe afwezigheid toe via de API en update de state.
 * @param {object} absence - Het afwezigheid-object om toe te voegen.
 */
export async function addAbsence(absence) {
    const newAbsenceFromServer = await api.addAbsenceOnBackend(absence);
    state.absences.push(newAbsenceFromServer);
}

/**
 * Verwijdert een afwezigheid via de API en update de state.
 * @param {number} absenceId - De ID van de te verwijderen afwezigheid.
 */
export async function removeAbsence(absenceId) {
    await api.deleteAbsenceOnBackend(absenceId);
    // GEBRUIK '==' IN PLAATS VAN '===' OM STRINGS MET GETALLEN TE VERGELIJKEN
    state.absences = state.absences.filter(abs => abs.id != absenceId);
}