import { THEME } from "../theme";

interface FooterProps {
    onClose: () => void;
}

export function createPopupFooter(props: FooterProps) {
    return {
        tag: "div",
        namespace: "html",
        styles: {
            flexShrink: "0",
            padding: THEME.spacing.md, // p-3
            backgroundColor: "transparent", // Transparent for native blend
            borderTop: `1px solid ${THEME.border.default}`,
            display: "flex",
            alignItems: "center",
            justifyContent: "flex-end",
            marginTop: "auto", // Ensure it pushes down if used in flex column
        },
        children: [
            {
                tag: "button",
                namespace: "html",
                styles: {
                    padding: `${THEME.spacing.sm} ${THEME.spacing.lg}`, // px-4 py-2
                    backgroundColor: THEME.colors.bg.surface,
                    border: `1px solid ${THEME.border.input}`, // border-gray-300
                    borderRadius: THEME.borderRadius.lg, // rounded-md
                    color: "#374151", // text-gray-700
                    fontSize: THEME.typography.size.sm, // test-xs
                    fontWeight: THEME.typography.weight.medium,
                    cursor: "pointer",
                    transition: "background-color 0.2s",
                },
                properties: { innerHTML: "Close" },
                listeners: [
                    { type: "click", listener: props.onClose },
                    {
                        type: "mouseenter",
                        listener: (e: Event) => {
                            (e.target as HTMLElement).style.backgroundColor = THEME.colors.bg.subtle; // hover:bg-gray-50
                        }
                    },
                    {
                        type: "mouseleave",
                        listener: (e: Event) => {
                            (e.target as HTMLElement).style.backgroundColor = THEME.colors.bg.surface;
                        }
                    }
                ],
            }
        ]
    };
}
