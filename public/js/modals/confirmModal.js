// js/modals/confirmModal.js

import { domElements } from '../ui.js';

let confirmCallback = () => {};

/**
 * Opent de generieke bevestigings-modal.
 * @param {string} title - De titel voor de modal.
 * @param {string} text - De beschrijvende tekst.
 * @param {Function} onConfirm - De functie die moet worden uitgevoerd bij bevestiging.
 * @param {string} [buttonText='Yes, delete'] - Optionele tekst voor de bevestigknop.
 * @param {'destructive'|'constructive'} [intent='destructive'] - De stijl van de knop (rood of groen).
 */
export function openConfirmModal(title, text, onConfirm, buttonText = 'Yes, delete', intent = 'destructive') {
    domElements.deleteConfirmTitle.textContent = title;
    domElements.deleteConfirmText.textContent = text;
    
    const confirmBtn = domElements.confirmDeleteBtn;
    confirmBtn.textContent = buttonText;
    
    confirmBtn.classList.remove('bg-red-600', 'hover:bg-red-700', 'bg-green-600', 'hover:bg-green-700');

    if (intent === 'constructive') {
        confirmBtn.classList.add('bg-green-600', 'hover:bg-green-700');
    } else { 
        confirmBtn.classList.add('bg-red-600', 'hover:bg-red-700');
    }
    
    confirmCallback = onConfirm;
    domElements.confirmDeleteModal.classList.remove('hidden');
}

/**
 * Sluit de generieke bevestigings-modal.
 */
export function closeConfirmModal() {
    domElements.confirmDeleteModal.classList.add('hidden');
    confirmCallback = () => {};
}

/**
 * Voert de callback-functie uit en sluit de modal.
 */
export function handleConfirm() {
    if (typeof confirmCallback === 'function') {
        confirmCallback();
    }
    closeConfirmModal();
}

/**
 * Initialiseert de event listeners voor de bevestigings-modal.
 */
export function initializeConfirmModalEvents() {
    if(domElements.confirmDeleteBtn) domElements.confirmDeleteBtn.addEventListener('click', () => {
        handleConfirm();
    });
    if(domElements.cancelDeleteBtn) domElements.cancelDeleteBtn.addEventListener('click', () => {
        closeConfirmModal();
    });
    if(domElements.confirmDeleteModal) domElements.confirmDeleteModal.addEventListener('click', (e) => {
        if (e.target.id === 'confirm-delete-modal') {
            closeConfirmModal();
        }
    });
}