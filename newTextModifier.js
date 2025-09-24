
(function() {
    'use strict';

    // ===========================================
    // FUNCTIONS DE MODIFICATION (À PERSONNALISER)
    // ===========================================

    function toUpperCase(text) {
        return text.toUpperCase();
    }

    function toLowerCase(text) {
        return text.toLowerCase();
    }

    function toTitleCase(text) {
        return text.replace(/\w\S*/g, (txt) =>
            txt.charAt(0).toUpperCase() + txt.substr(1).toLowerCase()
        );
    }

    function removeSpaces(text) {
        return text.replace(/\s+/g, '');
    }

    function addUnderscores(text) {
        return text.replace(/\s+/g, '_').toLowerCase();
    }

    // Votre fonction KaTeX
function convertToAligned(text) {
    // Divise le texte en lignes
    const lines = text.split('\n');

    // Transforme chaque ligne selon les critères spécifiés
    const transformedLines = lines.map(line => {
        // Enlève les espaces en début et en fin de ligne
        line = line.trim();

        // Enlève les '$' ou '$$' au début et à la fin de la ligne
        line = line.replace(/^\s*\$+\s*/, '').replace(/\s*\$+\s*$/, '');
        // Enlève les '&' au début de la ligne
        if(!line.includes("&") && line !==""){
           line = "&"+line
        }

        line = line.trim() ;

        // Ajoute "\\" à la fin de la ligne si ce n'est pas déjà présent
        if (!line.endsWith('\\\\') && line!=="") {
            line += '\\\\';
        }

        return line;
    });

    // Combine les lignes avec des sauts de ligne
    const combinedText = transformedLines.join('\n');

    // Ajoute "$$\begin{aligned}" au début et "\end{aligned}$$" à la fin
    return `$$\\begin{aligned}\n${combinedText}\n\\end{aligned}$$`;
}


    // Fonction textProcessor - Convertit les paires de lettres en \overrightarrow{}
    function textProcessor(text) {
        if (!text || typeof text !== 'string') return '';

        // Étape 1: Identifier toutes les zones protégées (\vec{} et \overrightarrow{})
        const protectedZones = [];

        // Regex pour trouver \vec{...} et \overrightarrow{...}
        const vecRegex = /\\vec\{[^}]*\}/g;
        const overrightarrowRegex = /\\overrightarrow\{[^}]*\}/g;

        let match;

        // Trouver toutes les occurrences de \vec{}
        while ((match = vecRegex.exec(text)) !== null) {
            protectedZones.push({
                start: match.index,
                end: match.index + match[0].length
            });
        }

        // Trouver toutes les occurrences de \overrightarrow{}
        while ((match = overrightarrowRegex.exec(text)) !== null) {
            protectedZones.push({
                start: match.index,
                end: match.index + match[0].length
            });
        }

        // Trier les zones protégées par position
        protectedZones.sort((a, b) => a.start - b.start);

        // Fonction pour vérifier si une position est dans une zone protégée
        function isInProtectedZone(position) {
            return protectedZones.some(zone => position >= zone.start && position < zone.end);
        }

        // Étape 2: Chercher les paires de lettres majuscules
        const pairRegex = /(?<![A-Za-z])([A-Z])\s*([A-Z])(?![A-Za-z])/g;

        let result = text;
        const replacements = [];

        // Trouver toutes les correspondances
        while ((match = pairRegex.exec(text)) !== null) {
            const matchStart = match.index;
            const matchEnd = match.index + match[0].length;

            // Vérifier si cette correspondance est dans une zone protégée
            let inProtectedZone = false;
            for (let i = matchStart; i < matchEnd; i++) {
                if (isInProtectedZone(i)) {
                    inProtectedZone = true;
                    break;
                }
            }

            if (!inProtectedZone) {
                const letter1 = match[1];
                const letter2 = match[2];
                const replacement = `\\overrightarrow{${letter1}${letter2}}`;

                replacements.push({
                    start: matchStart,
                    end: matchEnd,
                    original: match[0],
                    replacement: replacement
                });
            }
        }

        // Étape 3: Effectuer les remplacements en partant de la fin pour éviter les décalages d'index
        replacements.sort((a, b) => b.start - a.start);

        for (const repl of replacements) {
            result = result.substring(0, repl.start) + repl.replacement + result.substring(repl.end);
        }

        return result;
    }

    function pasteFrac(text){return "\\frac{}{}"}

    // ===========================================
    // SYSTÈME DE REMPLACEMENT SÉCURISÉ
    // ===========================================

    function replaceSelectedText(newText) {
        const selection = window.getSelection();

        if (selection.rangeCount === 0) {
            showNotification('Aucun texte sélectionné', 'error');
            return false;
        }

        try {
            const range = selection.getRangeAt(0);
            const activeElement = document.activeElement;

            // MÉTHODE 1: Champs de saisie classiques
            if (activeElement && (
                activeElement.tagName === 'INPUT' ||
                activeElement.tagName === 'TEXTAREA'
            )) {
                const start = activeElement.selectionStart;
                const end = activeElement.selectionEnd;
                const value = activeElement.value || '';

                if (typeof start === 'number' && typeof end === 'number' && start >= 0 && end >= 0) {
                    activeElement.value = value.substring(0, start) + newText + value.substring(end);
                    activeElement.selectionStart = start;
                    activeElement.selectionEnd = start + newText.length;

                    activeElement.dispatchEvent(new Event('input', { bubbles: true }));
                    activeElement.dispatchEvent(new Event('change', { bubbles: true }));
                    return true;
                }
            }

            // MÉTHODE 2: ContentEditable
            const editableParent = range.commonAncestorContainer.nodeType === Node.TEXT_NODE
                ? range.commonAncestorContainer.parentElement
                : range.commonAncestorContainer;

            if (editableParent && (
                editableParent.contentEditable === 'true' ||
                editableParent.isContentEditable ||
                editableParent.closest('[contenteditable="true"]')
            )) {
                range.deleteContents();
                range.insertNode(document.createTextNode(newText));

                // Repositionner la sélection
                const newRange = document.createRange();
                newRange.setStartAfter(range.endContainer);
                newRange.collapse(true);
                selection.removeAllRanges();
                selection.addRange(newRange);
                return true;
            }

            // MÉTHODE 3: Texte sélectionnable (essai direct)
            try {
                range.deleteContents();
                range.insertNode(document.createTextNode(newText));

                const newRange = document.createRange();
                newRange.setStartAfter(range.endContainer);
                newRange.collapse(true);
                selection.removeAllRanges();
                selection.addRange(newRange);
                return true;
            } catch (directError) {
                // Si ça échoue, on passe au fallback
                console.log('Méthode directe échoue:', directError);
            }

            // MÉTHODE 4: Fallback - presse-papiers + notification améliorée
            GM_setClipboard(newText);
            showNotification('✅ Texte modifié copié dans le presse-papiers\n(Ctrl+V pour coller)', 'info');
            return false;

        } catch (error) {
            console.error('Erreur lors du remplacement:', error);
            GM_setClipboard(newText);
            showNotification('⚠️ Texte copié dans le presse-papiers\n(Erreur de remplacement direct)', 'warning');
            return false;
        }
    }

    // ===========================================
    // SYSTÈME DE NOTIFICATION
    // ===========================================

    function showNotification(message, type = 'success') {
        const notification = document.createElement('div');
        const colors = {
            success: '#4CAF50',
            error: '#f44336',
            warning: '#ff9800',
            info: '#2196F3'
        };

        notification.innerHTML = message;
        notification.style.cssText = `
            position: fixed;
            top: 20px;
            right: 20px;
            background: ${colors[type] || colors.success};
            color: white;
            padding: 12px 20px;
            border-radius: 8px;
            z-index: 10000;
            font-family: Arial, sans-serif;
            font-size: 14px;
            box-shadow: 0 4px 12px rgba(0,0,0,0.3);
            max-width: 300px;
        `;

        document.body.appendChild(notification);

        setTimeout(() => {
            notification.remove();
        }, 3000);
    }

    // ===========================================
    // RACCOURCIS CLAVIER SÉCURISÉS
    // ===========================================

    // Définir les raccourcis APRÈS avoir déclaré toutes les fonctions
    const shortcuts = {
        // Alt + Shift + U = UPPERCASE
        'AltShiftU': { alt: true, shift: true, key: 'U', func: toUpperCase, desc: 'UPPERCASE' },

        // Alt + Shift + L = lowercase
        'AltShiftL': { alt: true, shift: true, key: 'L', func: toLowerCase, desc: 'lowercase' },

        // Alt + Shift + T = Title Case
        'AltShiftT': { alt: true, shift: true, key: 'T', func: toTitleCase, desc: 'Title Case' },

        // Alt + Shift + R = remove spaces
        'AltShiftR': { alt: true, shift: true, key: 'R', func: removeSpaces, desc: 'Remove Spaces' },

        // Alt + Shift + K = KaTeX aligned
        'AltShiftK': { alt: true, shift: true, key: 'K', func: convertToAligned, desc: 'KaTeX Aligned' },

        // Alt + Shift + P = Process vectors (AB -> \overrightarrow{AB})
        'AltShiftP': { alt: true, shift: true, key: 'P', func: textProcessor, desc: 'Process Vectors' },

        // Alt + Shift + _ = add_underscores
        'AltShift_': { alt: true, shift: true, key: '_', func: addUnderscores, desc: 'snake_case' },
        // Alt + Shift + F = paste frac
        'AltShift_': { alt: true, shift: true, key: 'F', func: pasteFrac, desc: 'paset Frac' },
    };

    document.addEventListener('keydown', function(e) {
        // Ignorer si on tape dans un champ de mot de passe
        if (document.activeElement && document.activeElement.type === 'password') {
            return;
        }

        for (let shortcut in shortcuts) {
            const s = shortcuts[shortcut];

            if ((!s.ctrl || e.ctrlKey) &&
                (!s.alt || e.altKey) &&
                (!s.shift || e.shiftKey) &&
                e.key === s.key) {

                e.preventDefault();
                e.stopPropagation();

                const selectedText = window.getSelection().toString();

                /*if (!selectedText.trim()) {
                    showNotification('Veuillez sélectionner du texte d\'abord', 'warning');
                    return;
                }*/

                try {
                    const modifiedText = s.func(selectedText);

                    if (modifiedText !== null && modifiedText !== undefined) {
                        if (replaceSelectedText(modifiedText)) {
                            showNotification(`✅ ${s.desc} appliqué!`);
                        }
                    } else {
                        showNotification('Erreur lors de la modification', 'error');
                    }
                } catch (error) {
                    console.error('Erreur:', error);
                    showNotification('Erreur lors de la modification', 'error');
                }

                break;
            }
        }
    });

    // ===========================================
    // AIDE - Alt + Shift + ?
    // ===========================================

    document.addEventListener('keydown', function(e) {
        if (e.altKey && e.shiftKey && e.key === '?') {
            e.preventDefault();

            let help = 'RACCOURCIS DISPONIBLES:\n\n';
            for (let shortcut in shortcuts) {
                const s = shortcuts[shortcut];
                let combo = [];
                if (s.ctrl) combo.push('Ctrl');
                if (s.alt) combo.push('Alt');
                if (s.shift) combo.push('Shift');
                combo.push(s.key);

                help += `${combo.join(' + ')} = ${s.desc}\n`;
            }
            help += '\nAlt + Shift + ? = Cette aide';

            alert(help);
        }
    });

    // Message de démarrage
    console.log('🚀 Text Modifier chargé! Alt + Shift + ? pour l\'aide');

})();
