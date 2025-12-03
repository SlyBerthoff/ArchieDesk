/**
 * js/app.js
 * Point d'entrée principal de l'application
 */
import { Config } from './config.js';
import { Auth, AuthState } from './auth.js';

// --- DOM ELEMENTS ---
const btnLogin = document.getElementById('btn-login');
const btnLogout = document.getElementById('btn-logout');
const btnNewProject = document.getElementById('btn-new-project');
const btnCloseEditor = document.getElementById('btn-close-editor');
const viewDashboard = document.getElementById('view-dashboard');
const viewEditor = document.getElementById('view-editor');
const emptyState = document.getElementById('empty-state');
const projectsGrid = document.getElementById('projects-grid');

// --- INIT FLOW ---
document.addEventListener('DOMContentLoaded', () => {
    
    // 1. Initialiser la UI de Configuration
    Config.initUI(() => {
        // Callback appelé si la config est mise à jour -> on recharge pour appliquer
        window.location.reload();
    });

    // 2. Vérifier si la config est présente
    if (!Config.hasConfig()) {
        Config.showModal(false); // Afficher la modale (non annulable)
    } else {
        // 3. Initialiser Google Auth
        Auth.init((success) => {
            if (success) {
                console.log("Système A.R.C.H.I.E connecté aux services Google.");
                // Active le bouton de login maintenant que le SDK est prêt
                btnLogin.disabled = false;
            }
        });
    }

    // --- EVENT LISTENERS ---

    // Connexion
    btnLogin.addEventListener('click', () => {
        Auth.signIn(() => {
            updateAuthUI(true);
            loadProjects(); // Charger les projets après connexion
        });
    });

    // Déconnexion
    btnLogout.addEventListener('click', () => {
        Auth.signOut(() => {
            updateAuthUI(false);
            projectsGrid.innerHTML = ''; // Vider la grille
            emptyState.classList.remove('hidden');
        });
    });

    // Nouveau Projet (Navigation)
    btnNewProject.addEventListener('click', () => {
        showEditor(true);
    });

    // Fermer l'éditeur (Retour Dashboard)
    btnCloseEditor.addEventListener('click', () => {
        showEditor(false);
    });
});

// --- UI FUNCTIONS ---

function updateAuthUI(isLoggedIn) {
    if (isLoggedIn) {
        btnLogin.parentElement.classList.add('hidden'); // Cache le container login (ou juste le bouton)
        btnLogin.classList.add('hidden');
        btnLogout.classList.remove('hidden');
        btnNewProject.classList.remove('hidden');
        emptyState.classList.add('hidden');
    } else {
        btnLogin.classList.remove('hidden');
        btnLogout.classList.add('hidden');
        btnNewProject.classList.add('hidden');
        emptyState.classList.remove('hidden');
    }
}

function showEditor(show) {
    if (show) {
        viewDashboard.classList.add('hidden');
        viewEditor.classList.remove('hidden');
    } else {
        viewDashboard.classList.remove('hidden');
        viewEditor.classList.add('hidden');
    }
}

/**
 * Charge les projets depuis le Drive
 * (Sera connecté à js/drive.js plus tard)
 */
async function loadProjects() {
    console.log("Chargement des projets...");
    // TODO: Implémenter le listing des fichiers via drive.js
    // Pour l'instant, on laisse l'état vide ou on affiche un loader
    emptyState.classList.add('hidden');
}