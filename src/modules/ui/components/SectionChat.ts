import { THEME } from "../theme";
import { IconLoader } from "../iconLoader";

interface ChatProps {
    onAsk: (question: string) => void;
    initialValue?: string;
}

export function createSectionChat(props: ChatProps) {
    // Keep track of input value manually since ZToolkit might not bind automatically in this decoupled way
    let currentValue = props.initialValue || "";

    return {
        tag: "div",
        namespace: "html",
        styles: {
            padding: THEME.spacing.md,
            borderBottom: `1px solid ${THEME.border.default}`,
            backgroundColor: THEME.colors.bg.surface, // transparent - blend with native window
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
                properties: { innerHTML: "Chat & Query" },
            },

            // Input Container (TextArea)
            {
                tag: "div",
                namespace: "html",
                styles: { marginBottom: THEME.spacing.md, display: "flex", flexDirection: "column" },
                children: [
                    {
                        tag: "textarea",
                        id: "geminizotero-chat-input",
                        namespace: "html",
                        attributes: {
                            placeholder: "Ask Gemini a question about this literature...",
                            rows: "2", // Reduced to 2 as requested
                        },
                        styles: {
                            width: "100%",
                            height: "80px", // Fixed height
                            padding: "10px",
                            borderRadius: THEME.borderRadius.sm,
                            border: `1px solid ${THEME.border.input}`,
                            backgroundColor: THEME.colors.bg.input,
                            color: THEME.colors.text.primary,
                            fontSize: THEME.typography.size.sm,
                            fontFamily: THEME.typography.fontFamily,
                            resize: "none", // Disable resize
                            overflowY: "auto", // Internal scrollbar
                            outline: "none",
                            boxSizing: "border-box",
                            transition: "box-shadow 0.2s, border-color 0.2s",
                            scrollbarWidth: "thin",
                            scrollbarColor: "#CCCCCC #F9FAFB",
                        },
                        listeners: [
                            {
                                type: "input",
                                listener: (e: Event) => {
                                    currentValue = (e.target as HTMLTextAreaElement).value;
                                }
                            },
                            {
                                type: "focus",
                                listener: (e: Event) => {
                                    const t = e.target as HTMLElement;
                                    t.style.borderColor = THEME.border.focused;
                                    t.style.boxShadow = `0 0 0 1px ${THEME.colors.primary}`; // focus:ring-1
                                }
                            },
                            {
                                type: "blur",
                                listener: (e: Event) => {
                                    const t = e.target as HTMLElement;
                                    t.style.borderColor = THEME.border.input;
                                    t.style.boxShadow = "none";
                                }
                            }
                        ]
                    }
                ]
            },


            // Ask Button
            {
                tag: "button",
                namespace: "html",
                styles: {
                    width: "100%",
                    padding: `${THEME.spacing.sm} ${THEME.spacing.md}`,
                    fontSize: THEME.typography.size.sm,
                    fontWeight: THEME.typography.weight.medium,
                    borderRadius: THEME.borderRadius.md,
                    cursor: "pointer",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    gap: THEME.spacing.sm,
                    transition: "background-color 0.2s",
                    boxShadow: "0 1px 2px 0 rgba(0, 0, 0, 0.05)",
                    appearance: "none",
                    mozAppearance: "none",
                    boxSizing: "border-box", // Critical for full width with inline styles
                },
                properties: {
                    // Inline style has highest priority in XUL - must include all layout properties
                    style: `width: 100% !important; display: flex !important; align-items: center !important; justify-content: center !important; gap: 8px !important; background: ${THEME.colors.primary} !important; background-color: ${THEME.colors.primary} !important; background-image: none !important; color: white !important; border: none !important; box-sizing: border-box !important;`,
                },
                children: [
                    IconLoader.create("auto-awesome", { size: 16, color: "white" }),
                    { tag: "span", namespace: "html", properties: { innerHTML: "Ask Gemini" } }
                ],
                listeners: [
                    {
                        type: "click",
                        listener: () => props.onAsk(currentValue)
                    },
                    {
                        type: "mouseenter",
                        listener: (e: Event) => {
                            const t = e.currentTarget as HTMLElement;
                            t.style.backgroundColor = "#0077C8";
                        }
                    },
                    {
                        type: "mouseleave",
                        listener: (e: Event) => {
                            const t = e.currentTarget as HTMLElement;
                            t.style.backgroundColor = THEME.colors.primary;
                        }
                    }
                ]
            }
        ]
    };
}
