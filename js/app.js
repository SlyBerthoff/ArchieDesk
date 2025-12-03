/**
 * js/app.js
 * Point d'entrée principal (Version Debug)
 */
import { Config } from './config.js';
import { Auth } from './auth.js';
import { Drive } from './drive.js';
import { Editor } from './editor.js';

// --- DOM ELEMENTS ---
// On utilise des getters ou on attend le DOMContentLoaded pour être sûr
let btnLogin, btnLogout, btnNewProject, btnCloseEditor, btnSave;
let viewDashboard, viewEditor, emptyState, projectsGrid;

// État local
let currentFileId = null;

// --- INIT FLOW ---
document.addEventListener('DOMContentLoaded', () => {
    console.log("DOM chargé, initialisation de l'application...");

    // 1. Récupération sûre des éléments DOM
    btnLogin = document.getElementById('btn-login');
    btnLogout = document.getElementById('btn-logout');
    btnNewProject = document.getElementById('btn-new-project');
    btnCloseEditor = document.getElementById('btn-close-editor');
    btnSave = document.getElementById('btn-save');
    viewDashboard = document.getElementById('view-dashboard');
    viewEditor = document.getElementById('view-editor');
    emptyState = document.getElementById('empty-state');
    projectsGrid = document.getElementById('projects-grid');

    // 2. Initialiser les modules
    Editor.init();
    Config.initUI(() => window.location.reload());

    if (!Config.hasConfig()) {
        Config.showModal(false);
    } else {
        Auth.init((success) => {
            if (success) {
                btnLogin.disabled = false;
                console.log("Auth initialisé.");
            }
        });
    }

    // --- EVENT LISTENERS ---

    // Auth
    btnLogin.addEventListener('click', () => {
        Auth.signIn(() => {
            updateAuthUI(true);
            refreshProjects();
        });
    });

    btnLogout.addEventListener('click', () => {
        Auth.signOut(() => {
            updateAuthUI(false);
            projectsGrid.innerHTML = '';
            emptyState.classList.remove('hidden');
        });
    });

    // Navigation
    btnNewProject.addEventListener('click', () => {
        currentFileId = null;
        Editor.setContent("# Nouveau Projet FSA\n\nCommencez à écrire...");
        showEditor(true);
    });

    btnCloseEditor.addEventListener('click', () => {
        showEditor(false);
        if (Auth.isReady()) refreshProjects();
    });

    // Sauvegarde
    btnSave.addEventListener('click', async () => {
        console.log("Clic sur Sauvegarder...");
        const content = Editor.getContent();
        const fileName = Editor.extractTitle();

        // UI Feedback
        const originalText = btnSave.innerHTML;
        btnSave.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> ...';
        btnSave.disabled = true;

        try {
            console.log("Tentative d'envoi vers Drive...");
            const result = await Drive.saveFile(currentFileId, fileName, content);
            console.log("Sauvegarde réussie :", result);
            
            if (!currentFileId && result.id) {
                currentFileId = result.id;
            }
            alert("✅ Projet sauvegardé sur le Drive !");
        } catch (err) {
            console.error("Erreur de sauvegarde :", err);
            alert("❌ Erreur lors de la sauvegarde.\n\nVérifiez la console (F12) pour les détails.");
        } finally {
            btnSave.innerHTML = originalText;
            btnSave.disabled = false;
        }
    });
});

// --- FONCTIONS UTILITAIRES ---

async function refreshProjects() {
    if (!projectsGrid) return;
    projectsGrid.innerHTML = '<div class="col-span-full text-center py-10"><i class="fa-solid fa-circle-notch fa-spin text-indigo-600 text-3xl"></i></div>';
    
    try {
        const files = await Drive.listProjects();
        renderProjects(files);
    } catch (err) {
        console.error("Erreur listing :", err);
        projectsGrid.innerHTML = '<p class="text-red-500 text-center col-span-full">Erreur de chargement des projets.</p>';
    }
}

function renderProjects(files) {
    projectsGrid.innerHTML = '';

    if (!files || files.length === 0) {
        emptyState.classList.remove('hidden');
        return;
    }
    
    emptyState.classList.add('hidden');

    files.forEach(file => {
        const card = document.createElement('div');
        card.className = "bg-white p-6 rounded-xl shadow-sm border border-slate-200 hover:shadow-md hover:border-indigo-300 cursor-pointer transition group flex flex-col h-48";
        
        const displayName = file.name.replace('.md', '');
        const date = file.modifiedTime ? new Date(file.modifiedTime).toLocaleDateString('fr-FR') : 'Date inconnue';

        card.innerHTML = `
            <div class="flex justify-between items-start mb-3">
                <span class="bg-indigo-100 text-indigo-700 text-xs font-bold px-2 py-1 rounded uppercase">FSA</span>
                <i class="fa-regular fa-file-lines text-slate-300 group-hover:text-indigo-500"></i>
            </div>
            <h3 class="font-bold text-lg mb-2 text-slate-800 group-hover:text-indigo-600 truncate">${displayName}</h3>
            <div class="flex-1"></div>
            <div class="mt-4 text-xs text-slate-400 pt-3 border-t border-slate-50">
                Modifié le ${date}
            </div>
        `;

        card.addEventListener('click', async () => {
            card.style.opacity = '0.5';
            try {
                const content = await Drive.getFileContent(file.id);
                currentFileId = file.id;
                Editor.setContent(content);
                showEditor(true);
            } catch (err) {
                alert("Impossible d'ouvrir ce fichier.");
            } finally {
                card.style.opacity = '1';
            }
        });

        projectsGrid.appendChild(card);
    });
}

function updateAuthUI(isLoggedIn) {
    if (isLoggedIn) {
        btnLogin.classList.add('hidden');
        btnLogout.classList.remove('hidden');
        btnNewProject.classList.remove('hidden');
    } else {
        btnLogin.classList.remove('hidden');
        btnLogout.classList.add('hidden');
        btnNewProject.classList.add('hidden');
        projectsGrid.innerHTML = '';
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