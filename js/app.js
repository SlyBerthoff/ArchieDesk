/**
 * js/app.js
 * Point d'entrée principal (Version Finale)
 */
import { Config } from './config.js';
import { Auth } from './auth.js';
import { Drive } from './drive.js';
import { Editor } from './editor.js';

// --- DOM ELEMENTS ---
const btnLogin = document.getElementById('btn-login');
const btnLogout = document.getElementById('btn-logout');
const btnNewProject = document.getElementById('btn-new-project');
const btnCloseEditor = document.getElementById('btn-close-editor');
const btnSave = document.getElementById('btn-save'); // Nouveau bouton
const viewDashboard = document.getElementById('view-dashboard');
const viewEditor = document.getElementById('view-editor');
const emptyState = document.getElementById('empty-state');
const projectsGrid = document.getElementById('projects-grid');

// État local pour savoir quel fichier on édite (null = nouveau fichier)
let currentFileId = null;

// --- INIT FLOW ---
document.addEventListener('DOMContentLoaded', () => {
    
    // Init Editor logic
    Editor.init();

    Config.initUI(() => window.location.reload());

    if (!Config.hasConfig()) {
        Config.showModal(false);
    } else {
        Auth.init((success) => {
            if (success) {
                btnLogin.disabled = false;
            }
        });
    }

    // --- EVENT LISTENERS ---

    // 1. Auth
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

    // 2. Navigation & Éditeur
    btnNewProject.addEventListener('click', () => {
        currentFileId = null; // On part de zéro
        Editor.setContent("# Nouveau Projet FSA\n\nCollez votre synthèse ici...");
        showEditor(true);
    });

    btnCloseEditor.addEventListener('click', () => {
        showEditor(false);
        refreshProjects(); // Rafraichir la liste au cas où on a sauvegardé
    });

    // 3. Sauvegarde
    btnSave.addEventListener('click', async () => {
        const content = Editor.getContent();
        const fileName = Editor.extractTitle(); // On devine le nom via le titre Markdown

        // Petit feedback visuel
        const originalText = btnSave.innerHTML;
        btnSave.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> Sauvegarde...';
        btnSave.disabled = true;

        try {
            const result = await Drive.saveFile(currentFileId, fileName, content);
            // Si c'était une création, on récupère l'ID pour les prochaines sauvegardes
            if (!currentFileId && result.id) {
                currentFileId = result.id;
            }
            alert("Projet sauvegardé avec succès !");
        } catch (err) {
            alert("Erreur lors de la sauvegarde. Vérifiez la console.");
        } finally {
            btnSave.innerHTML = originalText;
            btnSave.disabled = false;
        }
    });
});

// --- LOGIC FUNCTIONS ---

async function refreshProjects() {
    projectsGrid.innerHTML = '<div class="col-span-full text-center py-10"><i class="fa-solid fa-circle-notch fa-spin text-indigo-600 text-3xl"></i></div>';
    
    try {
        const files = await Drive.listProjects();
        renderProjects(files);
    } catch (err) {
        projectsGrid.innerHTML = '<p class="text-red-500">Erreur de chargement.</p>';
    }
}

function renderProjects(files) {
    projectsGrid.innerHTML = ''; // Clear loader

    if (!files || files.length === 0) {
        emptyState.classList.remove('hidden');
        return;
    }
    
    emptyState.classList.add('hidden');

    files.forEach(file => {
        const card = document.createElement('div');
        card.className = "bg-white p-6 rounded-xl shadow-sm border border-slate-200 hover:shadow-md hover:border-indigo-300 cursor-pointer transition group flex flex-col h-48";
        
        // On essaye de rendre le nom joli (enlever .md)
        const displayName = file.name.replace('.md', '');
        const date = new Date(file.modifiedTime).toLocaleDateString('fr-FR');

        card.innerHTML = `
            <div class="flex justify-between items-start mb-3">
                <span class="bg-indigo-100 text-indigo-700 text-xs font-bold px-2 py-1 rounded uppercase">FSA</span>
                <i class="fa-regular fa-file-lines text-slate-300 group-hover:text-indigo-500"></i>
            </div>
            <h3 class="font-bold text-lg mb-2 text-slate-800 group-hover:text-indigo-600 truncate">${displayName}</h3>
            <div class="flex-1"></div>
            <div class="mt-4 text-xs text-slate-400 pt-3 border-t border-slate-50 flex justify-between items-center">
                <span>Modifié le ${date}</span>
            </div>
        `;

        // Clic sur la carte -> Ouvrir le fichier
        card.addEventListener('click', async () => {
            // Feedback chargement
            card.style.opacity = '0.5';
            try {
                const content = await Drive.getFileContent(file.id);
                currentFileId = file.id; // On stocke l'ID en cours
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
        btnLogin.parentElement.classList.add('hidden');
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