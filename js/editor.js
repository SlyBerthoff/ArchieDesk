/**
 * js/editor.js
 * Logique de l'éditeur et de la prévisualisation (Version Corrigée)
 */

let input = null;
let preview = null;

// Configuration sécurisée de Marked
const configureMarked = () => {
    if (typeof marked === 'undefined') {
        console.error("La librairie 'marked' n'est pas chargée.");
        return false;
    }
    // Support des différentes versions de marked (parse ou fonction directe)
    if (typeof marked.use === 'function') {
        marked.use({ breaks: true, gfm: true });
    } else if (typeof marked.setOptions === 'function') {
        marked.setOptions({ breaks: true, gfm: true });
    }
    return true;
};

export const Editor = {
    /**
     * Initialise l'éditeur
     */
    init() {
        // On récupère les éléments ICI, quand on est sûr que le DOM est prêt
        input = document.getElementById('markdown-input');
        preview = document.getElementById('markdown-preview');

        if (!input || !preview) {
            console.error("Erreur critique : Impossible de trouver les éléments de l'éditeur dans le HTML.");
            return;
        }

        const markedReady = configureMarked();

        // Écoute la frappe pour la prévisualisation
        input.addEventListener('input', () => {
            if (markedReady) this.render(input.value);
        });

        console.log("Éditeur initialisé avec succès.");
    },

    /**
     * Charge un contenu dans l'éditeur
     */
    setContent(content) {
        if (!input) return;
        input.value = content || '';
        this.render(input.value);
    },

    /**
     * Récupère le contenu actuel
     */
    getContent() {
        return input ? input.value : '';
    },

    /**
     * Transforme le Markdown en HTML
     */
    render(markdownText) {
        if (!preview) return;
        
        try {
            // Compatible avec les versions récentes et anciennes de marked
            const html = typeof marked.parse === 'function' ? marked.parse(markdownText) : marked(markdownText);
            preview.innerHTML = html;
        } catch (e) {
            console.error("Erreur de rendu Markdown :", e);
            preview.innerHTML = "<p style='color:red'>Erreur de prévisualisation.</p>";
        }
    },

    /**
     * Extrait un titre du contenu
     */
    extractTitle() {
        if (!input) return "FSA Sans Titre.md";
        const content = input.value;
        const match = content.match(/^#\s+(.+)$/m);
        if (match && match[1]) {
            return match[1].trim() + ".md";
        }
        return "FSA Sans Titre.md";
    }
};