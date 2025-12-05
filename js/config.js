/**
 * js/config.js
 * Gestion Réglages + Auth UI intégrée + Folder Picker
 */
import { FolderPicker } from './picker.js';

const STORAGE_KEY = 'archiedesk_config_v1';

// Éléments UI Modale
const modal = document.getElementById('config-modal');
const btnClose = document.getElementById('btn-close-config');
const form = document.getElementById('config-form');

// Inputs
const inputApiKey = document.getElementById('input-api-key');
const inputClientId = document.getElementById('input-client-id');
const inputFolderName = document.getElementById('input-folder-name'); 
const inputFolderId = document.getElementById('input-folder-id');     
const btnBrowse = document.getElementById('btn-browse-folder');       
const folderHelpText = document.getElementById('folder-help-text');

// Auth UI dans la modale
const authSectionLoggedOut = document.getElementById('auth-section-logged-out');
const authSectionLoggedIn = document.getElementById('auth-section-logged-in');
const btnLoginModal = document.getElementById('btn-login-modal');
const btnLogoutModal = document.getElementById('btn-logout-modal');

export const Config = {
    // --- GESTION DONNÉES ---
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

    // --- GESTION UI ---
    showModal(force = false) {
        const current = this.get();
        if (current) {
            inputApiKey.value = current.apiKey;
            inputClientId.value = current.clientId;
            inputFolderId.value = current.folderId || '';
            inputFolderName.value = current.folderName || 'Racine (Mon Drive)';
        }
        
        // Si forcé (premier lancement), on cache le bouton fermer
        if (!this.hasConfig() && force) {
            btnClose.classList.add('hidden'); 
        } else {
            btnClose.classList.remove('hidden');
        }

        modal.classList.remove('hidden');
    },

    hideModal() {
        modal.classList.add('hidden');
    },

    /**
     * Met à jour l'UI selon l'état de connexion
     * Gère le verrouillage du bouton Parcourir
     */
    updateAuthStatus(isAuthenticated) {
        if (isAuthenticated) {
            // Mode Connecté
            authSectionLoggedOut.classList.add('hidden');
            authSectionLoggedIn.classList.remove('hidden');
            
            // Déverrouillage Parcourir
            btnBrowse.disabled = false;
            btnBrowse.classList.remove('bg-slate-200', 'text-slate-400', 'cursor-not-allowed');
            btnBrowse.classList.add('bg-slate-200', 'hover:bg-slate-300', 'text-slate-700');
            btnBrowse.title = "Parcourir les dossiers";
            if(folderHelpText) folderHelpText.textContent = "Cliquez sur le dossier pour changer.";

        } else {
            // Mode Déconnecté
            authSectionLoggedOut.classList.remove('hidden');
            authSectionLoggedIn.classList.add('hidden');
            
            // Verrouillage Parcourir
            btnBrowse.disabled = true;
            btnBrowse.classList.add('bg-slate-200', 'text-slate-400', 'cursor-not-allowed');
            btnBrowse.classList.remove('hover:bg-slate-300', 'text-slate-700');
            btnBrowse.title = "Connectez-vous pour choisir un dossier";
            if(folderHelpText) folderHelpText.textContent = "Connexion requise pour parcourir les dossiers.";
        }
    },

    // --- INITIALISATION ---
    initUI(handlers) {
        // handlers = { onSave, onLogin, onLogout }
        
        FolderPicker.init();

        // 1. Bouton Parcourir
        btnBrowse.addEventListener('click', () => {
            if (btnBrowse.disabled) return; // Sécurité supplémentaire
            
            FolderPicker.open((selection) => {
                inputFolderId.value = selection.id;
                inputFolderName.value = selection.name;
            });
        });

        // 2. Sauvegarde Formulaire
        form.addEventListener('submit', (e) => {
            e.preventDefault();
            const apiKey = inputApiKey.value.trim();
            const clientId = inputClientId.value.trim();
            const folderId = inputFolderId.value.trim();
            const folderName = inputFolderName.value.trim();

            if (this.save(apiKey, clientId, folderId, folderName)) {
                if (handlers.onSave) handlers.onSave();
                this.hideModal();
                // Petit feedback visuel
                // alert("Paramètres enregistrés."); // Optionnel, parfois intrusif
            }
        });

        // 3. Boutons Auth
        if(btnLoginModal) btnLoginModal.addEventListener('click', (e) => {
            e.preventDefault();
            if (handlers.onLogin) handlers.onLogin();
        });

        if(btnLogoutModal) btnLogoutModal.addEventListener('click', (e) => {
            e.preventDefault();
            if (handlers.onLogout) handlers.onLogout();
        });

        // 4. Fermeture
        if(btnClose) btnClose.addEventListener('click', () => this.hideModal());
    }
};