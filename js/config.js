/**
 * js/config.js
 * Gestion Config + Folder Picker Wiring
 */
import { FolderPicker } from './picker.js';

const STORAGE_KEY = 'archiedesk_config_v1';
const modal = document.getElementById('config-modal');
const form = document.getElementById('config-form');
const inputApiKey = document.getElementById('input-api-key');
const inputClientId = document.getElementById('input-client-id');
const inputFolderName = document.getElementById('input-folder-name'); 
const inputFolderId = document.getElementById('input-folder-id');     
const btnBrowse = document.getElementById('btn-browse-folder');       
const btnCancel = document.getElementById('btn-cancel-config');
const btnConfigTrigger = document.getElementById('btn-config');

export const Config = {
    get() {
        const data = localStorage.getItem(STORAGE_KEY);
        return data ? JSON.parse(data) : null;
    },

    save(apiKey, clientId, folderId, folderName) {
        if (!apiKey || !clientId) return false;
        const config = { apiKey, clientId, folderId, folderName };
        localStorage.setItem(STORAGE_KEY, JSON.stringify(config));
        return config;
    },

    hasConfig() {
        return !!this.get();
    },

    showModal(canCancel = false) {
        const current = this.get();
        if (current) {
            inputApiKey.value = current.apiKey;
            inputClientId.value = current.clientId;
            inputFolderId.value = current.folderId || '';
            inputFolderName.value = current.folderName || 'Racine (Mon Drive)';
        }
        
        btnCancel.classList.toggle('hidden', !canCancel);
        modal.classList.remove('hidden');
    },

    hideModal() {
        modal.classList.add('hidden');
    },

    initUI(onSaveCallback) {
        // Init Picker Module
        FolderPicker.init();

        // Clic sur "Parcourir"
        btnBrowse.addEventListener('click', () => {
            // Sécurité : on doit être connecté pour lister les dossiers
            if (typeof gapi === 'undefined' || !gapi.client || !gapi.client.getToken()) {
                alert("Veuillez d'abord vous connecter à Google (Connexion Drive) pour parcourir vos dossiers.");
                return;
            }
            
            FolderPicker.open((selection) => {
                inputFolderId.value = selection.id;
                inputFolderName.value = selection.name;
            });
        });

        form.addEventListener('submit', (e) => {
            e.preventDefault();
            const apiKey = inputApiKey.value.trim();
            const clientId = inputClientId.value.trim();
            const folderId = inputFolderId.value.trim();
            const folderName = inputFolderName.value.trim();

            if (this.save(apiKey, clientId, folderId, folderName)) {
                this.hideModal();
                if (onSaveCallback) onSaveCallback();
            }
        });

        btnConfigTrigger.addEventListener('click', () => this.showModal(true));
        btnCancel.addEventListener('click', () => this.hideModal());
    }
};