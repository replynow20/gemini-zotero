/**
 * Design System Tokens for Gemini Zotero Plugin (Stitch Design)
 */

export const THEME = {
    colors: {
        // Semantic Colors
        primary: "#0C8CE9",        // Figma Blue
        primaryHover: "#0077C8",

        bg: {
            canvas: "transparent",  // Use native window background
            surface: "transparent", // Sections blend with native background
            subtle: "#F9FAFB",      // Gray-50 for subtle elements
            hover: "#F0F0F0",       // Hover State
            input: "#FFFFFF",       // Input fields stay white for clarity
        },

        text: {
            primary: "#1a1a1a",    // Main Text
            secondary: "#6B7280",  // Gray-500
            tertiary: "#9CA3AF",   // Gray-400 (Phoneholders)
            onPrimary: "#FFFFFF",
        },

        // Mode Specific Colors
        modes: {
            quickSummary: {
                bg: "#FEF3C7", // Yellow-100
                text: "#92400E", // Yellow-800
            },
            standardReview: {
                bg: "#FEE2E2", // Red-100
                text: "#CC2936", // Zotero Red
            },
            deepAnalysis: {
                bg: "#E9D5FF", // Purple-100
                text: "#6B21A8", // Purple-800
            },
            visualize: {
                // Indigo/Blueish to match bar-chart #2854C5
                bg: "#DBEAFE", // Blue-100
                text: "#1E40AF", // Blue-800
            }
        }
    },

    border: {
        default: "#E6E6E6",    // Light border
        input: "#D1D5DB",      // Input border
        focused: "#0C8CE9",
    },

    shadows: {
        card: "0 1px 3px 0 rgba(0, 0, 0, 0.1), 0 1px 2px 0 rgba(0, 0, 0, 0.06)",
    },

    spacing: {
        xs: "4px",
        sm: "8px",
        md: "12px",
        lg: "16px",
        xl: "24px",
    },

    borderRadius: {
        sm: "2px",
        md: "4px",
        lg: "6px",
        xl: "8px",
        round: "9999px",
    },

    typography: {
        // Reverted to system font stack for better rendering
        fontFamily: "system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif",
        size: {
            xs: "10px",
            sm: "12px",
            base: "13px", // Standard Zotero UI size
            lg: "14px",
            xl: "20px",
        },
        weight: {
            normal: "400",
            medium: "500",
            semibold: "600",
            bold: "700",
        }
    },

    // Common Reusable Styles
    common: {
        flexCenter: {
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
        },
        flexBetween: {
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
        }
    }
};
