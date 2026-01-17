import { THEME } from "../theme";
import { IconLoader } from "../iconLoader";

interface HeaderProps {
    onClose: () => void;
    onSettings?: () => void;
}

export function createPopupHeader(props: HeaderProps) {
    return {
        tag: "div",
        namespace: "html",
        styles: {
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            padding: `${THEME.spacing.sm} ${THEME.spacing.md}`,
            borderBottom: `1px solid ${THEME.border.default}`,
            backgroundColor: "transparent", // Transparent for native blend
            flexShrink: "0",
        },
        children: [
            // Left: Logo + Title
            {
                tag: "div",
                namespace: "html",
                styles: {
                    display: "flex",
                    alignItems: "center",
                    gap: THEME.spacing.sm
                },
                children: [
                    // Logo Box
                    {
                        tag: "div",
                        namespace: "html",
                        styles: {},
                        children: [
                            IconLoader.create("logo", { size: 24 })
                        ]
                    },
                    // Title
                    {
                        tag: "h1",
                        namespace: "html",
                        styles: {
                            fontSize: THEME.typography.size.lg,
                            fontWeight: THEME.typography.weight.bold,
                            color: THEME.colors.text.primary,
                            margin: "0",
                            lineHeight: "1.2",
                            fontFamily: THEME.typography.fontFamily,
                        },
                        properties: { innerHTML: "Gemini-Zotero" },
                    },
                ],
            },

            // Right: Actions (Empty for now, using native window controls)
            {
                tag: "div",
                namespace: "html",
                styles: { display: "flex", gap: "4px" },
                children: []
            },
        ],
    };
}
