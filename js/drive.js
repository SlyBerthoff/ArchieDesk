/**
 * js/drive.js
 * Gestion du stockage Google Drive (CRUD + Navigation)
 */

export const Drive = {
    /**
     * Liste les projets (FSA)
     * Si un folderId est configuré, on cherche dedans. Sinon à la racine.
     */
    async listProjects(folderId = null) {
        // Si folderId est fourni, on filtre par 'parent'. Sinon pas de filtre parent.
        const parentQuery = folderId ? ` and '${folderId}' in parents` : "";
        const query = `mimeType = 'text/markdown' and trashed = false${parentQuery}`;

        try {
            const response = await gapi.client.drive.files.list({
                'pageSize': 50,
                'fields': "files(id, name, modifiedTime)",
                'q': query,
                'orderBy': 'modifiedTime desc'
            });
            return response.result.files || [];
        } catch (err) {
            console.error("Erreur Drive listProjects:", err);
            throw err;
        }
    },

    /**
     * Liste les sous-dossiers d'un parent donné (pour le sélecteur)
     */
    async listFolders(parentId = 'root') {
        const query = `mimeType = 'application/vnd.google-apps.folder' and '${parentId}' in parents and trashed = false`;
        try {
            const response = await gapi.client.drive.files.list({
                'pageSize': 50,
                'fields': "files(id, name)",
                'q': query,
                'orderBy': 'name'
            });
            return response.result.files || [];
        } catch (err) {
            console.error("Erreur listFolders:", err);
            throw err;
        }
    },

    /**
     * Récupère le contenu
     */
    async getFileContent(fileId) {
        try {
            const response = await gapi.client.drive.files.get({
                fileId: fileId,
                alt: 'media'
            });
            return response.body;
        } catch (err) {
            console.error("Erreur getFileContent:", err);
            throw err;
        }
    },

    /**
     * Sauvegarde (Multipart) avec gestion du dossier parent
     */
    async saveFile(fileId, title, content, parentFolderId = null) {
        const metadata = {
            'name': title || 'Nouveau FSA.md',
            'mimeType': 'text/markdown'
        };

        // Si c'est une création (pas de fileId) ET qu'on a un dossier cible
        if (!fileId && parentFolderId) {
            metadata.parents = [parentFolderId];
        }

        const boundary = '-------314159265358979323846';
        const delimiter = "\r\n--" + boundary + "\r\n";
        const close_delim = "\r\n--" + boundary + "--";

        const multipartRequestBody =
            delimiter +
            'Content-Type: application/json\r\n\r\n' +
            JSON.stringify(metadata) +
            delimiter +
            'Content-Type: text/markdown\r\n\r\n' +
            content +
            close_delim;

        const method = fileId ? 'PATCH' : 'POST';
        const path = '/upload/drive/v3/files' + (fileId ? '/' + fileId : '');

        try {
            const response = await gapi.client.request({
                'path': path,
                'method': method,
                'params': {'uploadType': 'multipart'},
                'headers': {
                    'Content-Type': 'multipart/related; boundary="' + boundary + '"'
                },
                'body': multipartRequestBody
            });

            return response.result;
        } catch (err) {
            console.error("Erreur saveFile:", err);
            throw err;
        }
    }
};