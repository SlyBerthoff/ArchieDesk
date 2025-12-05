/**
 * js/app.js
 * Point d'entrée principal (Version DEBUG CRITIQUE)
 */

// On enveloppe les imports dans un try/catch dynamique n'est pas possible en ES6 statique,
// donc on ajoute des logs avant/après l'exécution.

import { Config } from './config.js';
import { Auth } from './auth.js';
import { Drive } from './drive.js';
import { Editor } from './editor.js';

console.log("--> Chargement des modules terminé. Démarrage de l'App...");

// --- DOM ELEMENTS ---
let btnLogin, btnLogout, btnNewProject, btnCloseEditor, btnSave;
let viewDashboard, viewEditor, emptyState, projectsGrid;

let currentFileId = null;

document.addEventListener('DOMContentLoaded', () => {
    try {
        console.log("--> DOM Ready. Initialisation...");

        // 1. Récupération des éléments
        btnLogin = document.getElementById('btn-login');
        btnLogout = document.getElementById('btn-logout');
        btnNewProject = document.getElementById('btn-new-project');
        btnCloseEditor = document.getElementById('btn-close-editor');
        btnSave = document.getElementById('btn-save');
        viewDashboard = document.getElementById('view-dashboard');
        viewEditor = document.getElementById('view-editor');
        emptyState = document.getElementById('empty-state');
        projectsGrid = document.getElementById('projects-grid');

        // Vérification critique
        if (!btnLogin) throw new Error("Bouton Login introuvable dans le HTML");

        // 2. Initialisation des sous-systèmes
        Editor.init();
        
        // C'est souvent ici que ça casse si picker.js est mal lié
        console.log("--> Init Config...");
        Config.initUI(() => window.location.reload());

        // 3. Init Auth
        console.log("--> Init Auth...");
        if (!Config.hasConfig()) {
            console.log("Pas de config trouvée, ouverture modale.");
            Config.showModal(false);
        } else {
            Auth.init((success) => {
                if (success) {
                    console.log("--> Google Auth Prêt !");
                    btnLogin.disabled = false;
                    btnLogin.innerHTML = '<i class="fa-brands fa-google mr-2"></i> Connexion Drive';
                }
            });
        }

        // --- LISTENERS ---
        btnLogin.addEventListener('click', () => {
            console.log("Clic Login");
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

        // Settings Button (celui dans la navbar)
        const btnConfig = document.getElementById('btn-config');
        if(btnConfig) {
            btnConfig.addEventListener('click', () => {
                console.log("Clic Config");
                Config.showModal(true);
            });
        }

        btnNewProject.addEventListener('click', () => {
            currentFileId = null;
            Editor.setContent("# Nouveau Projet FSA\n\nCommencez à écrire...");
            showEditor(true);
        });

        btnCloseEditor.addEventListener('click', () => {
            showEditor(false);
            if (Auth.isReady()) refreshProjects();
        });

        btnSave.addEventListener('click', async () => {
            const content = Editor.getContent();
            const fileName = Editor.extractTitle();
            
            const originalText = btnSave.innerHTML;
            btnSave.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> ...';
            btnSave.disabled = true;

            try {
                // Récupérer le dossier cible depuis la config
                const conf = Config.get();
                const targetFolder = conf ? conf.folderId : null;

                const result = await Drive.saveFile(currentFileId, fileName, content, targetFolder);
                
                if (!currentFileId && result.id) currentFileId = result.id;
                alert("✅ Sauvegardé !");
            } catch (err) {
                console.error(err);
                alert("Erreur sauvegarde (voir console)");
            } finally {
                btnSave.innerHTML = originalText;
                btnSave.disabled = false;
            }
        });

        console.log("--> Initialisation terminée avec succès.");

    } catch (e) {
        console.error("ERREUR CRITIQUE AU DÉMARRAGE :", e);
        alert("L'application a planté au démarrage.\nErreur : " + e.message + "\n\nVérifiez la console (F12) pour plus de détails.");
    }
});

// --- HELPER FUNCTIONS (Restent inchangées) ---
async function refreshProjects() {
    projectsGrid.innerHTML = '<div class="col-span-full text-center py-10"><i class="fa-solid fa-circle-notch fa-spin text-indigo-600 text-3xl"></i></div>';
    try {
        const conf = Config.get();
        const folderId = conf ? conf.folderId : null;
        const files = await Drive.listProjects(folderId);
        renderProjects(files);
    } catch (err) {
        projectsGrid.innerHTML = '<p class="text-red-500 text-center col-span-full">Erreur chargement projets.</p>';
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
        const name = file.name.replace('.md', '');
        const date = file.modifiedTime ? new Date(file.modifiedTime).toLocaleDateString() : '';
        
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
            try {
                const content = await Drive.getFileContent(file.id);
                currentFileId = file.id;
                Editor.setContent(content);
                showEditor(true);
            } catch(e) { alert("Erreur ouverture fichier"); }
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
    viewDashboard.classList.toggle('hidden', show);
    viewEditor.classList.toggle('hidden', !show);
}