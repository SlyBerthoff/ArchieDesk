/**
 * js/app.js
 * Point d'entrée principal (Version Persistante)
 */
import { Config } from './config.js';
import { Auth } from './auth.js';
import { Drive } from './drive.js';
import { Editor } from './editor.js';

// --- DOM ELEMENTS ---
let btnConfigTrigger, btnNewProject, btnCloseEditor, btnSave;
let viewDashboard, viewEditor, emptyState, projectsGrid, folderIndicator;

let currentFileId = null;

document.addEventListener('DOMContentLoaded', () => {
    console.log("--> Démarrage ArchieDesk...");

    // 1. DOM Elements
    btnConfigTrigger = document.getElementById('btn-config'); 
    btnNewProject = document.getElementById('btn-new-project');
    btnCloseEditor = document.getElementById('btn-close-editor');
    btnSave = document.getElementById('btn-save');
    viewDashboard = document.getElementById('view-dashboard');
    viewEditor = document.getElementById('view-editor');
    emptyState = document.getElementById('empty-state');
    projectsGrid = document.getElementById('projects-grid');
    folderIndicator = document.getElementById('folder-indicator');

    // 2. Init Modules
    Editor.init();

    // 3. CONFIGURATION & AUTH WIRING
    Config.initUI({
        onSave: () => {
            const conf = Config.get();
            if(folderIndicator) folderIndicator.textContent = "Dossier: " + (conf.folderName || "Racine");
            refreshProjects(); 
        },
        onLogin: () => {
            Auth.signIn(() => {
                Config.updateAuthStatus(true);
                updateAppUI(true);
                refreshProjects();
            });
        },
        onLogout: () => {
            Auth.signOut(() => {
                Config.updateAuthStatus(false);
                updateAppUI(false);
            });
        }
    });

    // 4. DÉMARRAGE ET VÉRIFICATION SESSION
    if (!Config.hasConfig()) {
        Config.showModal(true);
    } else {
        // Par défaut verrouillé
        Config.updateAuthStatus(false);

        Auth.init((success) => {
            if (success) {
                // VERIFICATION AUTOMATIQUE : A-t-on restauré une session ?
                if (Auth.isReady()) {
                    console.log("--> Session restaurée ! Démarrage auto.");
                    Config.updateAuthStatus(true); // UI Réglages
                    updateAppUI(true);             // UI App
                    refreshProjects();             // Chargement Données
                }
            }
            
            const conf = Config.get();
            if(folderIndicator) folderIndicator.textContent = "Dossier: " + (conf.folderName || "Racine");
        });
    }

    // --- NAVIGATION ---
    if(btnConfigTrigger) {
        btnConfigTrigger.addEventListener('click', () => {
            Config.updateAuthStatus(Auth.isReady()); 
            Config.showModal();
        });
    }

    btnNewProject.addEventListener('click', () => {
        currentFileId = null;
        Editor.setContent("# Nouveau Projet FSA\n\nCommencez à rédiger...");
        showEditor(true);
    });

    btnCloseEditor.addEventListener('click', () => {
        showEditor(false);
        if (Auth.isReady()) refreshProjects();
    });

    // --- SAUVEGARDE ---
    btnSave.addEventListener('click', async () => {
        const content = Editor.getContent();
        const fileName = Editor.extractTitle();
        
        const originalText = btnSave.innerHTML;
        btnSave.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> Sauvegarde...';
        btnSave.disabled = true;

        try {
            const conf = Config.get();
            const targetFolder = conf ? conf.folderId : null;
            const result = await Drive.saveFile(currentFileId, fileName, content, targetFolder);
            
            if (!currentFileId && result.id) currentFileId = result.id;
            alert("✅ Sauvegardé !");
        } catch (err) {
            console.error(err);
            alert("Erreur lors de la sauvegarde.");
        } finally {
            btnSave.innerHTML = originalText;
            btnSave.disabled = false;
        }
    });
});

// --- HELPERS ---

async function refreshProjects() {
    if (!Auth.isReady()) return;

    projectsGrid.innerHTML = '<div class="col-span-full text-center py-10"><i class="fa-solid fa-circle-notch fa-spin text-indigo-600 text-3xl"></i></div>';
    
    try {
        const conf = Config.get();
        const folderId = conf ? conf.folderId : null;
        const files = await Drive.listProjects(folderId);
        renderProjects(files);
    } catch (err) {
        console.error(err);
        // Si erreur token expiré
        if (err.status === 401) {
             Auth.signOut();
             updateAppUI(false);
        }
        projectsGrid.innerHTML = '<p class="text-red-500 text-center col-span-full">Impossible de charger les projets.</p>';
    }
}

function renderProjects(files) {
    projectsGrid.innerHTML = '';
    if (!files || files.length === 0) {
        projectsGrid.innerHTML = '<div class="col-span-full text-center text-slate-400 italic py-10">Dossier vide. Créez votre premier FSA !</div>';
        return;
    }
    
    files.forEach(file => {
        const card = document.createElement('div');
        card.className = "bg-white p-6 rounded-xl shadow-sm border border-slate-200 hover:shadow-md hover:border-indigo-300 cursor-pointer transition group flex flex-col h-48";
        const name = file.name.replace('.md', '');
        const date = file.modifiedTime ? new Date(file.modifiedTime).toLocaleDateString('fr-FR') : '';

        card.innerHTML = `
            <div class="flex justify-between items-start mb-3">
                <span class="bg-indigo-100 text-indigo-700 text-xs font-bold px-2 py-1 rounded uppercase">FSA</span>
                <i class="fa-regular fa-file-lines text-slate-300 group-hover:text-indigo-500"></i>
            </div>
            <h3 class="font-bold text-lg mb-2 text-slate-800 group-hover:text-indigo-600 truncate">${name}</h3>
            <div class="flex-1"></div>
            <div class="mt-4 text-xs text-slate-400 pt-3 border-t border-slate-50">Modifié le ${date}</div>
        `;
        
        card.addEventListener('click', async () => {
            card.style.opacity = '0.5';
            try {
                const content = await Drive.getFileContent(file.id);
                currentFileId = file.id;
                Editor.setContent(content);
                showEditor(true);
            } catch(e) { alert("Erreur ouverture"); }
            finally { card.style.opacity = '1'; }
        });
        projectsGrid.appendChild(card);
    });
}

function updateAppUI(isLoggedIn) {
    if (isLoggedIn) {
        btnNewProject.classList.remove('hidden');
        emptyState.classList.add('hidden');
    } else {
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