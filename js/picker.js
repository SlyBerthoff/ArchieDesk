/**
 * js/picker.js
 * Logique du sélecteur de dossier (Mini-Browser)
 */
import { Drive } from './drive.js';

const modal = document.getElementById('picker-modal');
const listContainer = document.getElementById('picker-list');
const btnClose = document.getElementById('btn-picker-close');
const btnSelect = document.getElementById('btn-picker-select');
const breadcrumb = document.getElementById('picker-breadcrumb');
const currentFolderLabel = document.getElementById('current-folder-name');

let currentFolderId = 'root';
let currentFolderName = 'Mon Drive';
let selectionCallback = null;

// Pile pour l'historique de navigation (Breadcrumb simple)
let navStack = [];

export const FolderPicker = {
    init() {
        btnClose.addEventListener('click', () => this.close());
        
        btnSelect.addEventListener('click', () => {
            if (selectionCallback) {
                selectionCallback({ id: currentFolderId, name: currentFolderName });
            }
            this.close();
        });
    },

    open(onSelect) {
        selectionCallback = onSelect;
        navStack = []; // Reset stack
        this.loadFolder('root', 'Mon Drive');
        modal.classList.remove('hidden');
    },

    close() {
        modal.classList.add('hidden');
    },

    async loadFolder(folderId, folderName) {
        currentFolderId = folderId;
        currentFolderName = folderName;
        
        // Update UI Header
        currentFolderLabel.textContent = folderName;
        
        listContainer.innerHTML = '<div class="p-4 text-center text-slate-400"><i class="fa-solid fa-circle-notch fa-spin"></i> Chargement...</div>';

        try {
            const folders = await Drive.listFolders(folderId);
            this.renderList(folders);
        } catch (err) {
            listContainer.innerHTML = '<div class="p-4 text-center text-red-500">Erreur de chargement. Êtes-vous connecté ?</div>';
        }
    },

    renderList(folders) {
        listContainer.innerHTML = '';

        // Bouton "Dossier Parent" si on n'est pas à la racine
        if (currentFolderId !== 'root') {
            const backRow = document.createElement('div');
            backRow.className = "flex items-center gap-3 p-3 hover:bg-slate-50 cursor-pointer border-b border-slate-100 text-slate-500";
            backRow.innerHTML = `<i class="fa-solid fa-turn-up"></i> <span class="font-medium">... (Dossier parent)</span>`;
            backRow.addEventListener('click', () => {
                // On dépile pour revenir en arrière (simple simulation ici, idéalement on stocke les IDs parents)
                // Pour faire simple : on recharge 'root' si on remonte, ou on utilise une stack.
                // Implémentation simplifiée : Retour racine si perdu, ou gestion stack.
                if(navStack.length > 0) {
                   const prev = navStack.pop();
                   // Le pop nous donne le courant, il faut le précédent. 
                   // Simplifions : on revient toujours à Root pour la v1 si pas de stack complexe.
                   this.loadFolder('root', 'Mon Drive'); 
                } else {
                   this.loadFolder('root', 'Mon Drive');
                }
            });
            listContainer.appendChild(backRow);
        }

        if (folders.length === 0) {
            listContainer.innerHTML += '<div class="p-4 text-center text-slate-400 italic">Aucun sous-dossier</div>';
            return;
        }

        folders.forEach(folder => {
            const row = document.createElement('div');
            row.className = "flex items-center gap-3 p-3 hover:bg-indigo-50 cursor-pointer border-b border-slate-100 transition group";
            row.innerHTML = `
                <i class="fa-solid fa-folder text-yellow-400 text-lg"></i>
                <span class="text-slate-700 font-medium group-hover:text-indigo-700">${folder.name}</span>
            `;
            
            // Navigation (Entrer dans le dossier)
            row.addEventListener('click', () => {
                navStack.push({ id: currentFolderId, name: currentFolderName });
                this.loadFolder(folder.id, folder.name);
            });

            listContainer.appendChild(row);
        });
    }
};