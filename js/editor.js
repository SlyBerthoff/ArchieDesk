/**
 * js/editor.js
 * Gestion Éditeur, Parsing YAML & Rendu "Human Friendly"
 * v1.3 - Fix YAML Overwrite
 */

let input = null;
let preview = null;

// Regex stricte pour le bloc YAML en début de fichier
const YAML_REGEX = /^---\n([\s\S]*?)\n---/;

const configureMarked = () => {
    if (typeof marked === 'undefined') return false;
    if (typeof marked.use === 'function') marked.use({ breaks: true, gfm: true });
    return true;
};

export const Editor = {
    init() {
        input = document.getElementById('markdown-input');
        preview = document.getElementById('markdown-preview');
        if (!input || !preview) return;

        configureMarked();

        input.addEventListener('input', () => {
            this.render(input.value);
        });
    },

    setContent(content) {
        if (!input) return;
        input.value = content || '';
        this.render(input.value);
    },

    getContent() {
        return input ? input.value : '';
    },

    /**
     * Extrait les métadonnées du YAML
     */
    getMetadata() {
        const content = input.value;
        const match = content.match(YAML_REGEX);
        let props = {
            id: '', 
            titre_court: '',
            statut: 'ACTIF'
        };

        if (match && match[1]) {
            const yamlBlock = match[1];
            
            // Extraction souple (tolère les espaces)
            const idMatch = yamlBlock.match(/^id:\s*(.+)$/m);
            if (idMatch) props.id = idMatch[1].trim();

            const titleMatch = yamlBlock.match(/^titre_court:\s*(.+)$/m);
            if (titleMatch) props.titre_court = titleMatch[1].trim();

            const statusMatch = yamlBlock.match(/^statut:\s*(.+)$/m);
            if (statusMatch) props.statut = statusMatch[1].trim().toUpperCase();
        }
        return props;
    },

    /**
     * Bascule le statut OBSOLETE / ACTIF de manière chirurgicale
     */
    toggleObsolete() {
        let content = input.value;
        const match = content.match(YAML_REGEX);
        
        if (match) {
            // Le bloc YAML existe
            let yamlBlock = match[1];
            let newYamlBlock = yamlBlock;
            
            // On vérifie si la ligne statut existe déjà
            if (/^statut:/m.test(yamlBlock)) {
                // Elle existe, on la remplace via Regex ligne par ligne
                // On détecte la valeur actuelle pour basculer
                if (/^statut:\s*OBSOLETE/mi.test(yamlBlock)) {
                    newYamlBlock = yamlBlock.replace(/^statut:.*$/mi, "statut: EN COURS");
                } else {
                    newYamlBlock = yamlBlock.replace(/^statut:.*$/mi, "statut: OBSOLETE");
                }
            } else {
                // Elle n'existe pas, on l'ajoute à la fin du bloc
                // On s'assure qu'il y a un retour à la ligne avant
                newYamlBlock = yamlBlock.trim() + "\nstatut: OBSOLETE\n";
            }

            // On remplace uniquement le bloc YAML dans le contenu total
            const fullYaml = `---\n${newYamlBlock}\n---`;
            content = content.replace(YAML_REGEX, fullYaml);

        } else {
            // Pas de bloc YAML, on le crée proprement au début
            const newHeader = `---\nid: NOUVEAU-FSA\nstatut: OBSOLETE\n---\n\n`;
            content = newHeader + content;
        }

        input.value = content;
        this.render(content);
        
        const meta = this.getMetadata();
        return meta.statut === 'OBSOLETE';
    },

    extractFileName() {
        const meta = this.getMetadata();
        if (meta.id) {
            const safeId = meta.id.replace(/[^a-zA-Z0-9_\-]/g, '');
            return safeId + ".md";
        }
        return "FSA_Sans_ID.md";
    },

    render(markdownText) {
        if (!preview) return;
        
        const meta = this.getMetadata();
        const contentWithoutYaml = markdownText.replace(YAML_REGEX, '');
        
        // Rendu en-tête visuel
        let headerHtml = '';
        if (meta.id || meta.titre_court) {
            const isObsolete = (meta.statut === 'OBSOLETE');
            const badgeColor = isObsolete ? 'bg-slate-200 text-slate-500' : 'bg-green-100 text-green-700';
            const statusText = meta.statut || 'N/A';
            
            headerHtml = `
                <div class="mb-8 p-4 bg-slate-50 rounded-lg border border-slate-200 text-sm">
                    <div class="flex justify-between items-start mb-2">
                        <span class="font-mono text-xs text-slate-400 uppercase tracking-widest">Fiche Signalétique</span>
                        <span class="${badgeColor} text-xs font-bold px-2 py-1 rounded">${statusText}</span>
                    </div>
                    <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                            <span class="block text-xs text-slate-400">ID Unique</span>
                            <span class="font-mono font-bold text-slate-700 select-all">${meta.id || '-'}</span>
                        </div>
                        <div>
                            <span class="block text-xs text-slate-400">Projet</span>
                            <span class="font-bold text-indigo-700">${meta.titre_court || '-'}</span>
                        </div>
                    </div>
                </div>
            `;
        }

        try {
            const bodyHtml = typeof marked.parse === 'function' ? marked.parse(contentWithoutYaml) : marked(contentWithoutYaml);
            preview.innerHTML = headerHtml + bodyHtml;
        } catch (e) {
            preview.innerHTML = "<p class='text-red-500'>Erreur de rendu.</p>";
        }
    }
};