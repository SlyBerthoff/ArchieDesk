/**
 * js/picker.js
 * Logique du sélecteur de dossier
 */
import { Drive } from './drive.js';

const modal = document.getElementById('picker-modal');
const listContainer = document.getElementById('picker-list');
const btnClose = document.getElementById('btn-picker-close');
const btnSelect = document.getElementById('btn-picker-select');
const currentFolderLabel = document.getElementById('current-folder-name');

let currentFolderId = 'root';
let currentFolderName = 'Mon Drive';
let selectionCallback = null;
let navStack = [];

export const FolderPicker = {
    init() {
        if(btnClose) btnClose.addEventListener('click', () => this.close());
        
        if(btnSelect) btnSelect.addEventListener('click', () => {
            if (selectionCallback) {
                selectionCallback({ id: currentFolderId, name: currentFolderName });
            }
            this.close();
        });
    },

    open(onSelect) {
        selectionCallback = onSelect;
        navStack = []; 
        this.loadFolder('root', 'Mon Drive');
        modal.classList.remove('hidden');
    },

    close() {
        modal.classList.add('hidden');
    },

    async loadFolder(folderId, folderName) {
        currentFolderId = folderId;
        currentFolderName = folderName;
        
        if(currentFolderLabel) currentFolderLabel.textContent = folderName;
        
        listContainer.innerHTML = '<div class="p-4 text-center text-slate-400"><i class="fa-solid fa-circle-notch fa-spin"></i> Chargement...</div>';

        try {
            const folders = await Drive.listFolders(folderId);
            this.renderList(folders);
        } catch (err) {
            console.error(err);
            listContainer.innerHTML = '<div class="p-4 text-center text-red-500">Erreur de chargement.</div>';
        }
    },

    renderList(folders) {
        listContainer.innerHTML = '';

        if (currentFolderId !== 'root') {
            const backRow = document.createElement('div');
            backRow.className = "flex items-center gap-3 p-3 hover:bg-slate-50 cursor-pointer border-b border-slate-100 text-slate-500";
            backRow.innerHTML = `<i class="fa-solid fa-turn-up"></i> <span class="font-medium">... (Dossier parent)</span>`;
            backRow.addEventListener('click', () => {
                // Retour simple à la racine si pas d'historique complexe
                this.loadFolder('root', 'Mon Drive');
            });
            listContainer.appendChild(backRow);
        }

        if (folders.length === 0) {
            listContainer.innerHTML += '<div class="p-4 text-center text-slate-400 italic text-sm">Aucun sous-dossier ici.</div>';
            return;
        }

        folders.forEach(folder => {
            const row = document.createElement('div');
            row.className = "flex items-center gap-3 p-3 hover:bg-indigo-50 cursor-pointer border-b border-slate-100 transition group";
            row.innerHTML = `
                <i class="fa-solid fa-folder text-yellow-400 text-lg"></i>
                <span class="text-slate-700 font-medium group-hover:text-indigo-700">${folder.name}</span>
            `;
            
            row.addEventListener('click', () => {
                this.loadFolder(folder.id, folder.name);
            });

            listContainer.appendChild(row);
        });
    }
};