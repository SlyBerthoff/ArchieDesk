/**
 * js/editor.js
 * Logique de l'éditeur et de la prévisualisation
 */

const input = document.getElementById('markdown-input');
const preview = document.getElementById('markdown-preview');

// Configuration de Marked.js (Options de sécurité et de rendu)
marked.use({
    breaks: true, // Retours à la ligne auto
    gfm: true     // GitHub Flavored Markdown
});

export const Editor = {
    /**
     * Initialise l'éditeur
     */
    init() {
        // Écoute la frappe pour mettre à jour la prévisualisation en temps réel
        input.addEventListener('input', () => {
            this.render(input.value);
        });
    },

    /**
     * Charge un contenu dans l'éditeur
     */
    setContent(content) {
        input.value = content || '';
        this.render(input.value);
    },

    /**
     * Récupère le contenu actuel
     */
    getContent() {
        return input.value;
    },

    /**
     * Transforme le Markdown en HTML
     */
    render(markdownText) {
        const html = marked.parse(markdownText);
        preview.innerHTML = html;
    },

    /**
     * Extrait un titre potentiel du contenu (Le premier # Titre)
     * Utile pour nommer le fichier automatiquement
     */
    extractTitle() {
        const content = input.value;
        const match = content.match(/^#\s+(.+)$/m);
        if (match && match[1]) {
            return match[1].trim() + ".md";
        }
        return "FSA Sans Titre.md";
    }
};