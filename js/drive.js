/**
 * js/drive.js
 * Gestion du stockage Google Drive (CRUD)
 */

// On cherche uniquement les fichiers Markdown créés par l'app (scope drive.file)
// et qui ne sont pas à la corbeille.
const QUERY_FILES = "mimeType = 'text/markdown' and trashed = false";

export const Drive = {
    /**
     * Liste les projets (fichiers Markdown)
     */
    async listProjects() {
        try {
            const response = await gapi.client.drive.files.list({
                'pageSize': 20,
                'fields': "files(id, name, modifiedTime, size)",
                'q': QUERY_FILES,
                'orderBy': 'modifiedTime desc'
            });
            return response.result.files || [];
        } catch (err) {
            console.error("Erreur Drive listProjects:", err);
            throw err;
        }
    },

    /**
     * Récupère le contenu d'un fichier
     */
    async getFileContent(fileId) {
        try {
            const response = await gapi.client.drive.files.get({
                fileId: fileId,
                alt: 'media' // Important pour télécharger le contenu
            });
            return response.body;
        } catch (err) {
            console.error("Erreur Drive getFileContent:", err);
            throw err;
        }
    },

    /**
     * Sauvegarde un fichier (Création ou Mise à jour)
     * @param {string|null} fileId - ID du fichier si mise à jour, null si nouveau
     * @param {string} title - Nom du fichier
     * @param {string} content - Contenu Markdown
     */
    async saveFile(fileId, title, content) {
        const fileMetadata = {
            'name': title || 'Nouveau FSA.md',
            'mimeType': 'text/markdown'
        };

        const media = {
            mimeType: 'text/markdown',
            body: content
        };

        try {
            if (fileId) {
                // MISE À JOUR
                await gapi.client.drive.files.update({
                    fileId: fileId,
                    resource: fileMetadata, // Note: pour update c'est 'resource' ou juste metadata selon la lib, ici on met à jour le nom aussi
                    media: media
                });
                return { id: fileId, ...fileMetadata };
            } else {
                // CRÉATION
                const response = await gapi.client.drive.files.create({
                    resource: fileMetadata,
                    media: media,
                    fields: 'id'
                });
                return response.result;
            }
        } catch (err) {
            console.error("Erreur Drive saveFile:", err);
            throw err;
        }
    }
};