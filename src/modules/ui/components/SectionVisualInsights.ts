import { THEME } from "../theme";
import { IconLoader } from "../iconLoader";
import { VisualStyle } from "../../logic/VisualInsightsManager";

interface VisualInsightsProps {
    onGenerate: (style: VisualStyle) => void;
}

export function createSectionVisualInsights(props: VisualInsightsProps) {
    // State stored in closure
    let currentStyle: VisualStyle = 'Schematic';

    const STYLE_OPTIONS: { value: VisualStyle; label: string; tooltip: string; icon: string }[] = [
        { value: 'Schematic', label: 'Schematic', icon: 'schematic', tooltip: 'Structure & Mechanism: Clear diagrams showing how system parts connect.' },
        { value: 'Conceptual', label: 'Conceptual', icon: 'conceptual', tooltip: 'Idea & Metaphor: Abstract illustrations capturing the core concept.' },
        { value: 'Flowchart', label: 'Flowchart', icon: 'flow', tooltip: 'Process & Logic: Step-by-step workflow or algorithm visualization.' }
    ];

    // Create a style button - following SectionAnalysis pattern
    const createStyleButton = (opt: typeof STYLE_OPTIONS[0]) => {
        const isInitiallySelected = opt.value === currentStyle;

        // Use same pattern as SectionAnalysis: light blue bg for selected, NOT primary blue
        // This keeps text/icons visible
        return {
            tag: "button",
            namespace: "html",
            id: `geminizotero-visual-style-${opt.value.toLowerCase()}`,
            attributes: {
                "data-style-value": opt.value,
                "title": opt.tooltip,
            },
            styles: {
                flex: "1",
                padding: "4px 2px",
                fontSize: "10px",
                fontWeight: THEME.typography.weight.medium,
                borderRadius: "10px",
                // Selected: blue border + light blue bg (like SectionAnalysis)
                // Unselected: gray border + subtle bg
                border: isInitiallySelected ? `2px solid ${THEME.colors.primary}` : `1px solid ${THEME.border.input}`,
                backgroundColor: isInitiallySelected ? "#EBF5FF" : THEME.colors.bg.subtle,
                // Text color stays dark for visibility
                color: THEME.colors.text.secondary,
                cursor: "pointer",
                transition: "all 0.15s",
                outline: "none",
                textAlign: "center",
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
                justifyContent: "center",
                gap: "1px",
                height: "38px",
                minWidth: "50px",
                position: "relative", // For potential checkmark
            },
            properties: {
                innerHTML: `
                    <div style="width: 14px; height: 14px; display: flex; align-items: center; justify-content: center; color: ${THEME.colors.text.secondary};">
                        ${IconLoader.getRaw(opt.icon as any)}
                    </div>
                    <span style="font-size: 9px; line-height: 1; color: ${THEME.colors.text.secondary};">${opt.label}</span>
                `,
            },
            listeners: [
                {
                    type: "click",
                    listener: (e: Event) => {
                        e.preventDefault();
                        e.stopPropagation();

                        const clickedButton = e.currentTarget as HTMLElement;
                        const newStyle = clickedButton.getAttribute('data-style-value') as VisualStyle;

                        ztoolkit.log(`[VisualInsights] Style clicked: ${newStyle}`);

                        // Update state
                        currentStyle = newStyle;

                        // Find container and update all style buttons (same pattern as SectionAnalysis)
                        const container = clickedButton.parentElement;
                        if (!container) return;

                        const allButtons = container.querySelectorAll('[data-style-value]');
                        allButtons.forEach((btn: Element) => {
                            const btnEl = btn as HTMLElement;
                            const btnStyle = btnEl.getAttribute('data-style-value');
                            const isSelected = btnStyle === newStyle;

                            // Apply selected/unselected styling (light blue bg, not primary)
                            btnEl.style.backgroundColor = isSelected ? "#EBF5FF" : THEME.colors.bg.subtle;
                            btnEl.style.border = isSelected ? `2px solid ${THEME.colors.primary}` : `1px solid ${THEME.border.input}`;
                            // Keep text dark for visibility
                        });
                    }
                }
            ],
        };
    };

    // Component Definition
    return {
        tag: "div",
        namespace: "html",
        id: "geminizotero-visual-insights-section",
        styles: {
            padding: THEME.spacing.md,
            backgroundColor: THEME.colors.bg.surface,
            display: "flex",
            flexDirection: "column",
            gap: THEME.spacing.sm,
        },
        children: [
            // Title
            {
                tag: "h2",
                namespace: "html",
                styles: {
                    fontSize: THEME.typography.size.sm,
                    fontWeight: THEME.typography.weight.bold,
                    color: THEME.colors.text.primary,
                    margin: "0",
                },
                properties: { innerHTML: "Visual Insights" },
            },

            // Controls Row
            {
                tag: "div",
                namespace: "html",
                id: "geminizotero-visual-controls",
                styles: {
                    display: "flex",
                    flexDirection: "row",
                    gap: "6px",
                    alignItems: "center",
                },
                children: [
                    // Style Selector Container
                    {
                        tag: "div",
                        namespace: "html",
                        id: "geminizotero-visual-style-container",
                        styles: {
                            display: "flex",
                            gap: "4px",
                            flex: "1",
                        },
                        children: STYLE_OPTIONS.map(opt => createStyleButton(opt))
                    },

                    // Generate Button
                    {
                        tag: "button",
                        namespace: "html",
                        id: "geminizotero-visual-generate-btn",
                        styles: {
                            minWidth: "85px",
                            height: "38px",
                            padding: "0 8px",
                            backgroundColor: THEME.colors.primary,
                            color: "white",
                            border: "none",
                            borderRadius: "6px",
                            fontSize: "11px",
                            fontWeight: THEME.typography.weight.medium,
                            cursor: "pointer",
                            display: "flex",
                            alignItems: "center",
                            justifyContent: "center",
                            gap: "4px",
                            transition: "background-color 0.15s",
                        },
                        properties: {
                            // Use inline style for XUL compatibility
                            style: `min-width: 85px !important; height: 38px !important; display: flex !important; align-items: center !important; justify-content: center !important; gap: 4px !important; background: ${THEME.colors.primary} !important; background-color: ${THEME.colors.primary} !important; color: white !important; border: none !important;`,
                            innerHTML: `
                                <div style="width: 14px; height: 14px; display: flex; align-items: center; justify-content: center; color: white;">
                                    ${IconLoader.getRaw("auto-awesome")}
                                </div>
                                <span>Generate</span>
                            `,
                        },
                        listeners: [
                            {
                                type: "click",
                                listener: () => {
                                    ztoolkit.log(`[VisualInsights] Generate clicked, style: ${currentStyle}`);
                                    props.onGenerate(currentStyle);
                                }
                            },
                            {
                                type: "mouseenter",
                                listener: (e: Event) => {
                                    const t = e.currentTarget as HTMLElement;
                                    t.style.backgroundColor = THEME.colors.primaryHover;
                                }
                            },
                            {
                                type: "mouseleave",
                                listener: (e: Event) => {
                                    const t = e.currentTarget as HTMLElement;
                                    t.style.backgroundColor = THEME.colors.primary;
                                }
                            }
                        ],
                    }
                ]
            },
        ]
    };
}
