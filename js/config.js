/**
 * js/config.js
 * Gestion de la configuration locale (API Keys)
 */

const STORAGE_KEY = 'archiedesk_config_v1';

// Sélection des éléments DOM (Modale)
const modal = document.getElementById('config-modal');
const form = document.getElementById('config-form');
const inputApiKey = document.getElementById('input-api-key');
const inputClientId = document.getElementById('input-client-id');
const btnCancel = document.getElementById('btn-cancel-config');
const btnConfigTrigger = document.getElementById('btn-config');

export const Config = {
    // Récupérer les clés stockées
    get() {
        const data = localStorage.getItem(STORAGE_KEY);
        return data ? JSON.parse(data) : null;
    },

    // Sauvegarder les clés
    save(apiKey, clientId) {
        if (!apiKey || !clientId) return false;
        const config = { apiKey, clientId };
        localStorage.setItem(STORAGE_KEY, JSON.stringify(config));
        return config;
    },

    // Vérifier si la config existe
    hasConfig() {
        return !!this.get();
    },

    // Afficher la modale
    showModal(canCancel = false) {
        // Pré-remplir si existant
        const current = this.get();
        if (current) {
            inputApiKey.value = current.apiKey;
            inputClientId.value = current.clientId;
        }

        if (canCancel) {
            btnCancel.classList.remove('hidden');
        } else {
            btnCancel.classList.add('hidden');
        }
        
        modal.classList.remove('hidden');
    },

    // Cacher la modale
    hideModal() {
        modal.classList.add('hidden');
    },

    // Initialisation des écouteurs d'événements liés à la config
    initUI(onSaveCallback) {
        // Soumission du formulaire
        form.addEventListener('submit', (e) => {
            e.preventDefault();
            const apiKey = inputApiKey.value.trim();
            const clientId = inputClientId.value.trim();

            if (this.save(apiKey, clientId)) {
                this.hideModal();
                if (onSaveCallback) onSaveCallback(); // Recharger l'app
                // Petit feedback visuel ou reload
                window.location.reload(); 
            }
        });

        // Bouton roue dentée (Navbar)
        btnConfigTrigger.addEventListener('click', () => {
            this.showModal(true);
        });

        // Bouton annuler
        btnCancel.addEventListener('click', () => {
            this.hideModal();
        });
    }
};