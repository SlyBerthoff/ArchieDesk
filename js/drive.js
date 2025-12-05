/**
 * js/drive.js
 * Gestion du stockage Google Drive (CRUD) - Version Multipart (Fix Untitled)
 */

const QUERY_FILES = "mimeType = 'text/markdown' and trashed = false";

export const Drive = {
    /**
     * Liste les projets
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
            console.error("Erreur Drive getFileContent:", err);
            throw err;
        }
    },

    /**
     * Sauvegarde robuste (Multipart) pour garantir le Titre et le Contenu
     */
    async saveFile(fileId, title, content) {
        // 1. Préparation des métadonnées (Nom + Type)
        const metadata = {
            'name': title || 'Nouveau FSA.md',
            'mimeType': 'text/markdown'
        };

        // 2. Construction du corps "Multipart" (Le format strict attendu par Google)
        const boundary = '-------314159265358979323846';
        const delimiter = "\r\n--" + boundary + "\r\n";
        const close_delim = "\r\n--" + boundary + "--";

        // Note: On encode le contenu en UTF-8 pour supporter les accents
        // (JavaScript gère les strings en UTF-16, mais le réseau préfère l'UTF-8 propre)
        // Pour du texte simple comme Markdown, la string JS passe généralement bien via gapi,
        // mais le formatage ci-dessous est le standard.
        
        const multipartRequestBody =
            delimiter +
            'Content-Type: application/json\r\n\r\n' +
            JSON.stringify(metadata) +
            delimiter +
            'Content-Type: text/markdown\r\n\r\n' +
            content +
            close_delim;

        // 3. Choix de la méthode (PATCH = Update, POST = Create)
        const method = fileId ? 'PATCH' : 'POST';
        const path = '/upload/drive/v3/files' + (fileId ? '/' + fileId : '');

        try {
            // Appel direct via gapi.client.request pour contrôler le header
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
            console.error("Erreur Drive saveFile (Multipart):", err);
            throw err;
        }
    }
};