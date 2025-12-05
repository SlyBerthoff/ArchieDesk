/**
 * js/app.js
 * Point d'entrée principal (Version Clean)
 */
import { Config } from './config.js';
import { Auth } from './auth.js';
import { Drive } from './drive.js';
import { Editor } from './editor.js';

// --- DOM ELEMENTS ---
// On déclare les variables, on les remplira une fois la page chargée
let btnLogin, btnLogout, btnNewProject, btnCloseEditor, btnSave;
let viewDashboard, viewEditor, emptyState, projectsGrid;

// État local
let currentFileId = null;

// --- INITIALISATION ---
document.addEventListener('DOMContentLoaded', () => {
    console.log("--> Démarrage de l'application...");

    // 1. Récupération des éléments HTML
    btnLogin = document.getElementById('btn-login');
    btnLogout = document.getElementById('btn-logout');
    btnNewProject = document.getElementById('btn-new-project');
    btnCloseEditor = document.getElementById('btn-close-editor');
    btnSave = document.getElementById('btn-save');
    viewDashboard = document.getElementById('view-dashboard');
    viewEditor = document.getElementById('view-editor');
    emptyState = document.getElementById('empty-state');
    projectsGrid = document.getElementById('projects-grid');

    // Vérification de sécurité (si un élément manque, on le voit tout de suite)
    if (!btnLogin || !projectsGrid) {
        console.error("ERREUR CRITIQUE : Certains éléments HTML sont introuvables. Vérifiez index.html");
        return;
    }

    // 2. Initialisation des modules
    try {
        Editor.init();
        Config.initUI(() => window.location.reload());
        
        // 3. Initialisation Auth Google
        if (!Config.hasConfig()) {
            console.log("Pas de configuration API trouvée.");
            Config.showModal(false);
        } else {
            Auth.init((success) => {
                if (success) {
                    console.log("--> Connecté aux services Google.");
                    btnLogin.disabled = false;
                }
            });
        }
    } catch (err) {
        console.error("Erreur d'initialisation :", err);
    }

    // --- ÉCOUTEURS D'ÉVÉNEMENTS (Listeners) ---

    // Connexion
    btnLogin.addEventListener('click', () => {
        Auth.signIn(() => {
            updateAuthUI(true);
            refreshProjects();
        });
    });

    // Déconnexion
    btnLogout.addEventListener('click', () => {
        Auth.signOut(() => {
            updateAuthUI(false);
            projectsGrid.innerHTML = '';
            emptyState.classList.remove('hidden');
        });
    });

    // Bouton Configuration (Roue dentée)
    const btnConfig = document.getElementById('btn-config');
    if (btnConfig) {
        btnConfig.addEventListener('click', () => Config.showModal(true));
    }

    // Nouveau Projet
    btnNewProject.addEventListener('click', () => {
        currentFileId = null;
        Editor.setContent("# Nouveau Projet FSA\n\nCommencez à rédiger...");
        showEditor(true);
    });

    // Fermer l'éditeur
    btnCloseEditor.addEventListener('click', () => {
        showEditor(false);
        if (Auth.isReady()) refreshProjects();
    });

    // Sauvegarder
    btnSave.addEventListener('click', async () => {
        const content = Editor.getContent();
        const fileName = Editor.extractTitle();
        
        // Feedback visuel sur le bouton
        const originalText = btnSave.innerHTML;
        btnSave.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> Sauvegarde...';
        btnSave.disabled = true;

        try {
            // Récupérer le dossier cible depuis la config
            const conf = Config.get();
            const targetFolder = conf ? conf.folderId : null;

            console.log("Sauvegarde vers le dossier ID:", targetFolder || "Racine");

            const result = await Drive.saveFile(currentFileId, fileName, content, targetFolder);
            
            // Si c'était une création, on mémorise l'ID
            if (!currentFileId && result.id) {
                currentFileId = result.id;
            }
            alert("✅ Projet sauvegardé avec succès !");
        } catch (err) {
            console.error("Erreur lors de la sauvegarde :", err);
            alert("❌ Erreur lors de la sauvegarde. Vérifiez la console (F12).");
        } finally {
            // On remet le bouton normal
            btnSave.innerHTML = originalText;
            btnSave.disabled = false;
        }
    });

});

// --- FONCTIONS UTILITAIRES ---

async function refreshProjects() {
    projectsGrid.innerHTML = '<div class="col-span-full text-center py-10"><i class="fa-solid fa-circle-notch fa-spin text-indigo-600 text-3xl"></i></div>';
    
    try {
        const conf = Config.get();
        const folderId = conf ? conf.folderId : null;
        
        const files = await Drive.listProjects(folderId);
        renderProjects(files);
    } catch (err) {
        console.error("Erreur refreshProjects :", err);
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
        
        const name = file.name.replace('.md', '');
        const date = file.modifiedTime ? new Date(file.modifiedTime).toLocaleDateString('fr-FR') : 'Date inconnue';

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
            // Feedback visuel clic
            card.style.opacity = '0.5';
            try {
                const content = await Drive.getFileContent(file.id);
                currentFileId = file.id;
                Editor.setContent(content);
                showEditor(true);
            } catch (err) {
                console.error(err);
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