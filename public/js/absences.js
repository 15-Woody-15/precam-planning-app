const STORAGE_KEY = 'planning_absences_v1';

/**
 * Haalt alle opgeslagen afwezigheden op uit localStorage.
 * @returns {Absence[]} Een array met afwezigheid-objecten.
 */
export function getAbsences() {
    return JSON.parse(localStorage.getItem(STORAGE_KEY)) || [];
}

/**
 * Voegt een nieuwe afwezigheid toe en slaat deze op.
 * @param {Absence} absence - Het afwezigheid-object om toe te voegen.
 */
export function addAbsence(absence) {
    const absences = getAbsences();
    // Voeg een unieke ID toe op basis van de timestamp
    const newAbsence = { ...absence, id: Date.now() };
    absences.push(newAbsence);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(absences));
}

/**
 * Verwijdert een specifieke afwezigheid op basis van ID.
 * @param {number} absenceId - De ID van de te verwijderen afwezigheid.
 */
export function removeAbsence(absenceId) {
    let absences = getAbsences();
    absences = absences.filter(abs => abs.id !== absenceId);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(absences));
}

/**
 * Verwijdert alle opgeslagen afwezigheden.
 */
export function clearAbsences() {
    localStorage.removeItem(STORAGE_KEY);
}