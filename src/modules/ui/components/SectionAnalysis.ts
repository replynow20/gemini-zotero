import { config } from "../../../../package.json";
import { THEME } from "../theme";
import { IconLoader } from "../iconLoader";

interface AnalysisProps {
    onModeSelect: (mode: string) => void;
}

export function createSectionAnalysis(props: AnalysisProps) {
    // Read current selection from preferences
    const currentMode = (Zotero.Prefs.get(`${config.prefsPrefix}.defaultTemplate`, true) as string) || "quick_summary";
    ztoolkit.log(`[GeminiZotero:Analysis] Current mode from prefs: ${currentMode}`);

    const createCard = (
        modeId: string,
        label: string,
        iconName: "quick-summary" | "standard-analysis" | "deep-analysis",
        themeKey: "quickSummary" | "standardReview" | "deepAnalysis"
    ) => {
        const modeColors = THEME.colors.modes[themeKey];
        const isSelected = currentMode === modeId;
        ztoolkit.log(`[GeminiZotero:Analysis] Creating card ${modeId}, isSelected: ${isSelected}`);

        // Base styles
        const baseStyles = {
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            justifyContent: "center",
            padding: THEME.spacing.md,
            borderRadius: THEME.borderRadius.lg,
            cursor: "pointer",
            height: "96px",
            width: "100%",
            transition: "all 0.2s",
            position: "relative",
            boxSizing: "border-box",
        };

        return {
            tag: "button",
            namespace: "html",
            id: `geminizotero-mode-${modeId}`,
            classList: ["geminizotero-analysis-card"],
            attributes: {
                "data-mode-id": modeId,
                "class": "geminizotero-analysis-card",
            },
            styles: {
                ...baseStyles,
                border: isSelected ? `2px solid ${THEME.colors.primary}` : "1px solid transparent",
                backgroundColor: isSelected ? "#EBF5FF" : "transparent",
            },
            children: [
                // Selection checkmark (top-right corner) - only if selected
                ...(isSelected ? [{
                    tag: "div",
                    namespace: "html",
                    classList: ["geminizotero-checkmark"],
                    attributes: {
                        "class": "geminizotero-checkmark",
                    },
                    styles: {
                        position: "absolute",
                        top: "4px",
                        right: "4px",
                        width: "16px",
                        height: "16px",
                        borderRadius: "50%",
                        backgroundColor: THEME.colors.primary,
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                    },
                    properties: {
                        innerHTML: `<svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"><polyline points="20 6 9 17 4 12"></polyline></svg>`,
                    },
                }] : []),
                // Icon Container
                {
                    tag: "div",
                    namespace: "html",
                    styles: {
                        marginBottom: THEME.spacing.sm,
                        padding: "6px",
                        backgroundColor: modeColors.bg,
                        color: modeColors.text,
                        borderRadius: THEME.borderRadius.lg,
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                    },
                    children: [
                        IconLoader.create(iconName, { size: 20 })
                    ]
                },
                // Text Label
                {
                    tag: "span",
                    namespace: "html",
                    styles: {
                        fontSize: THEME.typography.size.sm,
                        fontWeight: THEME.typography.weight.semibold,
                        color: THEME.colors.text.primary,
                        textAlign: "center",
                        lineHeight: "1.3",
                    },
                    properties: {
                        innerHTML: label.replace("\\n", "<br/>"),
                    },
                }
            ],
            listeners: [
                {
                    type: "click",
                    listener: (e: Event) => {
                        ztoolkit.log(`[GeminiZotero:Analysis] Click event fired for mode: ${modeId}`);
                        e.preventDefault();
                        e.stopPropagation();

                        const clickedButton = e.currentTarget as HTMLElement;
                        // Get the grid container (parent of buttons)
                        const gridContainer = clickedButton.parentElement;
                        if (!gridContainer) {
                            ztoolkit.log(`[GeminiZotero:Analysis] ERROR: No grid container found`);
                            return;
                        }

                        ztoolkit.log(`[GeminiZotero:Analysis] Grid container found, updating cards...`);

                        // Update all cards in the grid container - use attribute selector since class might not work
                        const allCards = gridContainer.querySelectorAll('[data-mode-id]');
                        ztoolkit.log(`[GeminiZotero:Analysis] Found ${allCards.length} cards`);

                        allCards.forEach((card: Element) => {
                            const cardElement = card as HTMLElement;
                            const cardModeId = cardElement.getAttribute('data-mode-id');
                            ztoolkit.log(`[GeminiZotero:Analysis] Processing card: ${cardModeId}`);

                            if (cardModeId === modeId) {
                                // This is the clicked card - make it selected
                                ztoolkit.log(`[GeminiZotero:Analysis] Selecting card: ${cardModeId}`);
                                cardElement.style.border = `2px solid ${THEME.colors.primary}`;
                                cardElement.style.backgroundColor = "#EBF5FF";

                                // Add checkmark if not exists
                                if (!cardElement.querySelector('.geminizotero-checkmark')) {
                                    const checkmark = createCheckmarkElement();
                                    cardElement.insertBefore(checkmark, cardElement.firstChild);
                                }
                            } else {
                                // Other cards - deselect
                                ztoolkit.log(`[GeminiZotero:Analysis] Deselecting card: ${cardModeId}`);
                                cardElement.style.border = "1px solid transparent";
                                cardElement.style.backgroundColor = "transparent";

                                // Remove checkmark if exists
                                const existingCheck = cardElement.querySelector('.geminizotero-checkmark');
                                if (existingCheck) existingCheck.remove();
                            }
                        });

                        // Call the mode select handler (saves to preferences)
                        ztoolkit.log(`[GeminiZotero:Analysis] Calling onModeSelect with: ${modeId}`);
                        props.onModeSelect(modeId);
                    }
                },
                {
                    type: "mouseenter",
                    listener: (e: Event) => {
                        const t = e.currentTarget as HTMLElement;
                        // Only apply hover if not selected
                        if (!t.style.border?.includes(THEME.colors.primary)) {
                            t.style.backgroundColor = THEME.colors.bg.hover;
                            t.style.borderColor = THEME.border.default;
                        }
                    }
                },
                {
                    type: "mouseleave",
                    listener: (e: Event) => {
                        const t = e.currentTarget as HTMLElement;
                        // Only reset if not selected
                        if (!t.style.border?.includes(THEME.colors.primary)) {
                            t.style.backgroundColor = "transparent";
                            t.style.borderColor = "transparent";
                        }
                    }
                }
            ],
        };
    };

    // Helper to create checkmark element dynamically
    function createCheckmarkElement(): HTMLElement {
        const doc = Zotero.getMainWindow().document;
        const container = doc.createElement('div');
        container.className = 'geminizotero-checkmark';
        container.style.cssText = `
            position: absolute;
            top: 4px;
            right: 4px;
            width: 16px;
            height: 16px;
            border-radius: 50%;
            background-color: ${THEME.colors.primary};
            display: flex;
            align-items: center;
            justify-content: center;
        `;

        const svg = doc.createElementNS('http://www.w3.org/2000/svg', 'svg');
        svg.setAttribute('width', '10');
        svg.setAttribute('height', '10');
        svg.setAttribute('viewBox', '0 0 24 24');
        svg.setAttribute('fill', 'none');
        svg.setAttribute('stroke', 'white');
        svg.setAttribute('stroke-width', '3');
        svg.setAttribute('stroke-linecap', 'round');
        svg.setAttribute('stroke-linejoin', 'round');

        const polyline = doc.createElementNS('http://www.w3.org/2000/svg', 'polyline');
        polyline.setAttribute('points', '20 6 9 17 4 12');
        svg.appendChild(polyline);

        container.appendChild(svg);
        return container;
    }

    return {
        tag: "div",
        namespace: "html",
        styles: {
            padding: THEME.spacing.md,
            backgroundColor: "transparent",
            borderBottom: `1px solid ${THEME.border.default}`,
        },
        children: [
            // Section Title
            {
                tag: "h2",
                namespace: "html",
                styles: {
                    fontSize: THEME.typography.size.sm,
                    fontWeight: THEME.typography.weight.bold,
                    color: THEME.colors.text.primary,
                    margin: `0 0 ${THEME.spacing.sm} 0`,
                },
                properties: {
                    innerHTML: "Analysis Modes",
                },
            },
            // Grid Container - with ID for easy lookup
            {
                tag: "div",
                namespace: "html",
                id: "geminizotero-mode-grid",
                styles: {
                    display: "grid",
                    gridTemplateColumns: "repeat(3, 1fr)",
                    gap: THEME.spacing.sm,
                },
                children: [
                    createCard("quick_summary", "Quick\\nSummary", "quick-summary", "quickSummary"),
                    createCard("standard_analysis", "Standard\\nReview", "standard-analysis", "standardReview"),
                    createCard("deep_analysis", "Deep\\nAnalysis", "deep-analysis", "deepAnalysis"),
                ]
            }
        ]
    };
}
