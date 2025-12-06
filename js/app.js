/**
 * js/app.js
 * Point d'entrée v1.5 - Fix Card Layout
 */
import { Config } from './config.js';
import { Auth } from './auth.js';
import { Drive } from './drive.js';
import { Editor } from './editor.js';

let btnConfigTrigger, btnNewProject, btnCloseEditor, btnSave, btnArchive;
let viewDashboard, viewEditor, emptyState, projectsGrid, folderIndicator;
let lblArchive;
let currentFileId = null;

document.addEventListener('DOMContentLoaded', () => {
    // 1. DOM Elements
    btnConfigTrigger = document.getElementById('btn-config'); 
    btnNewProject = document.getElementById('btn-new-project');
    btnCloseEditor = document.getElementById('btn-close-editor');
    btnSave = document.getElementById('btn-save');
    btnArchive = document.getElementById('btn-archive'); 
    lblArchive = document.getElementById('lbl-archive');
    
    viewDashboard = document.getElementById('view-dashboard');
    viewEditor = document.getElementById('view-editor');
    emptyState = document.getElementById('empty-state');
    projectsGrid = document.getElementById('projects-grid');
    folderIndicator = document.getElementById('folder-indicator');

    // 2. Init Modules
    Editor.init();

    // 3. CONFIG & AUTH
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

    // 4. CHECK START
    if (!Config.hasConfig()) {
        Config.showModal(true);
    } else {
        Config.updateAuthStatus(false);
        Auth.init((success) => {
            if (success && Auth.isReady()) {
                Config.updateAuthStatus(true);
                updateAppUI(true);
                refreshProjects();
            }
            const conf = Config.get();
            if(folderIndicator) folderIndicator.textContent = "Dossier: " + (conf.folderName || "Racine");
        });
    }

    // --- LOGIC ---
    if(btnConfigTrigger) btnConfigTrigger.addEventListener('click', () => {
        Config.updateAuthStatus(Auth.isReady()); 
        Config.showModal();
    });

    btnNewProject.addEventListener('click', () => {
        currentFileId = null;
        const template = 
`---
id: NOUVEAU-PROJET-001
titre_court: Mon Projet
statut: EN COURS
date_creation: ${new Date().toISOString().split('T')[0]}
tags: []
---

# Titre du Projet
`;
        Editor.setContent(template);
        showEditor(true);
    });

    btnCloseEditor.addEventListener('click', () => {
        showEditor(false);
        if (Auth.isReady()) refreshProjects();
    });

    if(btnArchive) btnArchive.addEventListener('click', () => {
        const isObsolete = Editor.toggleObsolete();
        updateArchiveButton(isObsolete);
    });

    btnSave.addEventListener('click', async () => {
        const content = Editor.getContent();
        const fileName = Editor.extractFileName(); 
        const meta = Editor.getMetadata();
        
        const originalText = btnSave.innerHTML;
        btnSave.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> ...';
        btnSave.disabled = true;

        try {
            const conf = Config.get();
            const targetFolder = conf ? conf.folderId : null;
            
            // On sauvegarde : Drive reçoit 'properties' (titre_court, id, statut)
            const result = await Drive.saveFile(currentFileId, fileName, content, targetFolder, meta);
            
            if (!currentFileId && result.id) currentFileId = result.id;
            alert("✅ Sauvegardé : " + fileName);
        } catch (err) {
            console.error(err);
            alert("Erreur lors de la sauvegarde.");
        } finally {
            btnSave.innerHTML = originalText;
            btnSave.disabled = false;
        }
    });
});

function updateArchiveButton(isObsolete) {
    if(!lblArchive || !btnArchive) return;
    if (isObsolete) {
        lblArchive.textContent = 'Restaurer';
        btnArchive.classList.add('text-orange-600', 'bg-orange-50');
        btnArchive.innerHTML = '<i class="fa-solid fa-box-open mr-1"></i> <span id="lbl-archive">Restaurer</span>';
    } else {
        lblArchive.textContent = 'Archiver';
        btnArchive.classList.remove('text-orange-600', 'bg-orange-50');
        btnArchive.innerHTML = '<i class="fa-solid fa-box-archive mr-1"></i> <span id="lbl-archive">Archiver</span>';
    }
}

async function refreshProjects() {
    if (!Auth.isReady()) return;
    projectsGrid.innerHTML = '<div class="col-span-full text-center py-10"><i class="fa-solid fa-circle-notch fa-spin text-indigo-600 text-3xl"></i></div>';
    
    try {
        const conf = Config.get();
        const folderId = conf ? conf.folderId : null;
        const files = await Drive.listProjects(folderId);
        renderProjects(files);
    } catch (err) {
        if (err.status === 401) { Auth.signOut(); updateAppUI(false); }
        projectsGrid.innerHTML = '<p class="text-red-500 text-center col-span-full">Erreur chargement.</p>';
    }
}

function renderProjects(files) {
    projectsGrid.innerHTML = '';
    
    if (!files || files.length === 0) {
        projectsGrid.innerHTML = '<div class="col-span-full text-center text-slate-400 italic py-10">Dossier vide.</div>';
        return;
    }
    
    files.forEach(file => {
        // Lecture propriétés
        const props = file.properties || {};
        
        // Données d'affichage
        // 1. ID : On le prend du YAML, sinon du nom de fichier sans extension
        const yamlId = props.id || file.name.replace(/\.md$/i, '');
        
        // 2. TITRE : On prend titre_court, sinon le nom de fichier (pour avoir quelque chose de lisible)
        const displayTitle = props.titre_court || file.name.replace(/\.md$/i, '');
        
        const isObsolete = props.statut === 'OBSOLETE';
        const date = file.modifiedTime ? new Date(file.modifiedTime).toLocaleDateString('fr-FR') : '';

        // Styles
        const opacityClass = isObsolete ? 'opacity-60 grayscale hover:grayscale-0' : '';
        const borderClass = isObsolete ? 'border-slate-100' : 'border-slate-200 hover:border-indigo-300';
        
        const badgeHtml = isObsolete 
            ? `<span class="bg-slate-100 text-slate-500 text-xs font-bold px-2 py-1 rounded uppercase">ARCHIVÉ</span>`
            : `<span class="bg-indigo-100 text-indigo-700 text-xs font-bold px-2 py-1 rounded uppercase">FSA</span>`;

        const card = document.createElement('div');
        card.className = `bg-white p-5 rounded-xl shadow-sm cursor-pointer transition group flex flex-col h-48 ${borderClass} ${opacityClass}`;
        
        // HTML Card : Toujours ID en petit, Titre en grand
        card.innerHTML = `
            <div class="flex justify-between items-start mb-3">
                ${badgeHtml}
                <i class="fa-regular fa-file-lines text-slate-300 group-hover:text-indigo-500"></i>
            </div>
            
            <div class="mb-2">
                <div class="font-mono text-xs text-slate-400 mb-1 truncate select-all" title="ID: ${yamlId}">ID: ${yamlId}</div>
                <h3 class="font-bold text-lg text-slate-800 group-hover:text-indigo-600 line-clamp-2 leading-tight" title="${displayTitle}">
                    ${displayTitle}
                </h3>
            </div>
            
            <div class="flex-1"></div>
            <div class="mt-2 text-xs text-slate-400 pt-3 border-t border-slate-50 flex justify-between">
                <span>${date}</span>
                ${props.statut ? `<span class="uppercase text-[10px] tracking-wider font-bold text-slate-300">${props.statut}</span>` : ''}
            </div>
        `;
        
        card.addEventListener('click', async () => {
            card.style.opacity = '0.5';
            try {
                const content = await Drive.getFileContent(file.id);
                currentFileId = file.id;
                Editor.setContent(content);
                const meta = Editor.getMetadata();
                updateArchiveButton(meta.statut === 'OBSOLETE');
                showEditor(true);
            } catch(e) { alert("Erreur ouverture"); }
            finally { card.style.opacity = isObsolete ? '0.6' : '1'; }
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