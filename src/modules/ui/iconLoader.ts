/**
 * Icon Management Module
 * Centralizes all SVG assets and provides a unified loader for UI components.
 */

// Registry of raw SVG strings
const ICON_REGISTRY: Record<string, string> = {
    // Logo
    "logo": `<?xml version="1.0" encoding="UTF-8"?>
<svg id="a" xmlns="http://www.w3.org/2000/svg" width="24" height="24" xmlns:xlink="http://www.w3.org/1999/xlink" viewBox="0 0 316.6 317.1">
<defs>
<style>.e{fill:url(#c);}.f{fill:url(#d);}.g{fill:url(#b);}</style>
<linearGradient id="b" x1="18.7" y1="56.6" x2="101.7" y2="56.6" gradientUnits="userSpaceOnUse">
<stop offset="0" stop-color="#223997"/>
<stop offset=".5" stop-color="#6958e2"/>
<stop offset="1" stop-color="#539de9"/>
</linearGradient>
<linearGradient id="c" x1="0" y1="158.6" x2="316.6" y2="158.6" gradientUnits="userSpaceOnUse">
<stop offset="0" stop-color="#223997"/>
<stop offset=".5" stop-color="#6958e2"/>
<stop offset="1" stop-color="#539de9"/>
</linearGradient>
<linearGradient id="d" x1="206.2" y1="255.1" x2="299" y2="255.1" gradientUnits="userSpaceOnUse">
<stop offset="0" stop-color="#223997"/>
<stop offset=".5" stop-color="#6958e2"/>
<stop offset="1" stop-color="#539de9"/>
</linearGradient>
</defs>
<path class="g" d="M18.7,22.5l7.6,10.4s4.5-7,13.3-5.8,14.9,4.8,21.9,5.8,11.1,0,11.1,0l-51.1,56,6.8,9.5s14.1-9.5,26.9-5.4c12.8,4.1,34.3,13.1,46.3-2.2l-7.4-10.5s-3.4,6.5-13.8,5.9-5.3-.9-7.8-1.9-8.1-3.2-13.1-3.7c-7.5-.8-12.2.5-12.2.5l51.7-57.6-7.7-9.5s-11.5,11.5-31.1,4.8-30-5.4-41.5,3.8Z"/>
<polygon class="e" points="158.3 317.1 187.5 187.5 316.6 158.3 188 127.5 158.3 0 128.6 127.5 0 158.3 129.1 187.5 158.3 317.1"/>
<polygon class="f" points="252.6 301.6 261.2 263.6 299 255 261.3 246 252.6 208.6 243.9 246 206.2 255 244.1 263.6 252.6 301.6"/>
</svg>`,

    // Analysis Modes (Using currentColor)
    "quick-summary": `<svg xmlns="http://www.w3.org/2000/svg" height="24px" viewBox="0 -960 960 960" width="24px" fill="currentColor"><path d="m320-80 40-280H160l360-520h80l-40 320h240L400-80h-80Z"/></svg>`,

    "standard-analysis": `<svg xmlns="http://www.w3.org/2000/svg" height="24px" viewBox="0 -960 960 960" width="24px" fill="currentColor"><path d="M160-391h45l23-66h104l24 66h44l-97-258h-46l-97 258Zm81-103 38-107h2l38 107h-78Zm319-70v-68q33-14 67.5-21t72.5-7q26 0 51 4t49 10v64q-24-9-48.5-13.5T700-600q-38 0-73 9.5T560-564Zm0 220v-68q33-14 67.5-21t72.5-7q26 0 51 4t49 10v64q-24-9-48.5-13.5T700-380q-38 0-73 9t-67 27Zm0-110v-68q33-14 67.5-21t72.5-7q26 0 51 4t49 10v64q-24-9-48.5-13.5T700-490q-38 0-73 9.5T560-454ZM260-320q47 0 91.5 10.5T440-278v-394q-41-24-87-36t-93-12q-36 0-71.5 7T120-692v396q35-12 69.5-18t70.5-6Zm260 42q44-21 88.5-31.5T700-320q36 0 70.5 6t69.5 18v-396q-33-14-68.5-21t-71.5-7q-47 0-93 12t-87 36v394Zm-40 118q-48-38-104-59t-116-21q-42 0-82.5 11T100-198q-21 11-40.5-1T40-234v-482q0-11 5.5-21T62-752q46-24 96-36t102-12q58 0 113.5 15T480-740q51-30 106.5-45T700-800q52 0 102 12t96 36q11 5 16.5 15t5.5 21v482q0 23-19.5 35t-40.5 1q-37-20-77.5-31T700-240q-60 0-116 21t-104 59ZM280-499Z"/></svg>`,

    "deep-analysis": `<svg width="24px" height="24px" viewBox="0 0 24 24" version="1.1" xmlns="http://www.w3.org/2000/svg">
        <g stroke="none" stroke-width="1" fill="none" fill-rule="evenodd">
            <g transform="translate(-912.000000, -96.000000)">
                <g transform="translate(912.000000, 96.000000)">
                    <path d="M15.6821,3.28244 C16.4219947,2.54249789 17.5974496,2.50355357 18.3832778,3.16560704 L18.5105,3.28244 L19.2176,3.98955 C19.9574947,4.72949211 19.9964366,5.90497637 19.3344255,6.69076502 L19.2176,6.81798 L18.5105,7.52508 C18.4486,7.58693 18.3837,7.64388 18.3163,7.69593 C18.4882692,8.31620077 18.3557935,9.00318018 17.9189514,9.52068987 L17.8034,9.6464 L16.8129,10.6369 C18.1532,11.8265 19,13.5643 19,15.5 C19,17.1437647 18.3898519,18.6450021 17.3836515,19.7896163 L17.1904,20 L20,20 C20.5523,20 21,20.4477 21,21 C21,21.51285 20.613973,21.9355092 20.1166239,21.9932725 L20,22 L4,22 C3.44772,22 3,21.5523 3,21 C3,20.48715 3.38604429,20.0644908 3.88337975,20.0067275 L4,20 L12.5,20 C14.9853,20 17,17.9853 17,15.5 C17,14.2044687 16.4532324,13.0365547 15.5750842,12.2144463 L15.3951,12.0547 L12.1465,15.3033 C11.4066053,16.0431947 10.2310607,16.0821366 9.44529955,15.4201255 L9.31809,15.3033 L7.19677,13.1819 C6.45682789,12.4420053 6.41788357,11.2665504 7.07993704,10.4807222 L7.19677,10.3535 L12.8536,4.6966525 C13.3819,4.16839 14.1321,3.99742 14.8041,4.18374 L14.885825,4.084545 L14.885825,4.084545 L14.9749,3.98955 L15.6821,3.28244 Z M6.48967,13.889 L8.61099,16.0104 C9.00151,16.4009 9.00151,17.0341 8.61099,17.4246 C8.22046,17.8151 7.5873,17.8151 7.19677,17.4246 L5.07545,15.3033 C4.68493,14.9127 4.68493,14.2796 5.07545,13.889 C5.46598,13.4985 6.09914,13.4985 6.48967,13.889 Z M14.2678,6.11087 L8.61099,11.7677 L10.7323,13.889 L16.3892,8.23219 L14.2678,6.11087 Z M17.0963,4.69666 L16.3892,5.40376 L17.0963,6.11087 L17.8034,5.40376 L17.0963,4.69666 Z" id="形状" fill="none" stroke="currentColor" stroke-width="1.5"></path>
                </g>
            </g>
        </g>
    </svg>`,

    // New Bar Chart for Visual Insights (Adapted to currentColor)
    "bar-chart": `<svg xmlns="http://www.w3.org/2000/svg" height="24px" viewBox="0 -960 960 960" width="24px" fill="currentColor"><path d="M640-160v-280h160v280H640Zm-240 0v-640h160v640H400Zm-240 0v-440h160v440H160Z"/></svg>`,

    // Visual Insights Styles (Converted to currentColor)
    "schematic": `<svg xmlns="http://www.w3.org/2000/svg" height="24px" viewBox="0 -960 960 960" width="24px" fill="currentColor"><path d="M480-80q-82 0-155-31.5t-127.5-86Q143-252 111.5-325T80-480q0-83 32.5-156t88-127Q256-817 330-848.5T488-880q80 0 151 27.5t124.5 76q53.5 48.5 85 115T880-518q0 115-70 176.5T640-280h-74q-9 0-12.5 5t-3.5 11q0 12 15 34.5t15 51.5q0 50-27.5 74T480-80Zm0-400Zm-220 40q26 0 43-17t17-43q0-26-17-43t-43-17q-26 0-43 17t-17 43q0 26 17 43t43 17Zm120-160q26 0 43-17t17-43q0-26-17-43t-43-17q-26 0-43 17t-17 43q0 26 17 43t43 17Zm200 0q26 0 43-17t17-43q0-26-17-43t-43-17q-26 0-43 17t-17 43q0 26 17 43t43 17Zm120 160q26 0 43-17t17-43q0-26-17-43t-43-17q-26 0-43 17t-17 43q0 26 17 43t43 17ZM480-160q9 0 14.5-5t5.5-13q0-14-15-33t-15-57q0-42 29-67t71-25h70q66 0 113-38.5T800-518q0-121-92.5-201.5T488-800q-136 0-232 93t-96 227q0 133 93.5 226.5T480-160Z"/></svg>`,
    "conceptual": `<svg xmlns="http://www.w3.org/2000/svg" height="24px" viewBox="0 -960 960 960" width="24px" fill="currentColor"><path d="M80-120v-80h80v-640h640v640h80v80H80Zm160-80h158q-8-70-46-141.5T240-434v234Zm0-560v234q74-21 112-92.5T398-760H240Zm89 280q68 45 105 123t44 157h4q7-79 44-157t105-123q-68-45-105-123t-44-157h-4q-7 79-44 157T329-480Zm391-280H562q8 70 46 141.5T720-526v-234Zm0 560v-234q-74 21-111.5 92.5T563-200h157ZM240-760v234-234Zm480 0v234-234Zm0 560v-234 234Zm-480 0v-234 234Z"/></svg>`,
    "flow": `<svg xmlns="http://www.w3.org/2000/svg" height="24px" viewBox="0 -960 960 960" width="24px" fill="currentColor"><path d="M600-160v-80H440v-200h-80v80H80v-240h280v80h80v-200h160v-80h280v240H600v-80h-80v320h80v-80h280v240H600Zm80-80h120v-80H680v80ZM160-440h120v-80H160v80Zm520-200h120v-80H680v80Zm0 400v-80 80ZM280-440v-80 80Zm400-200v-80 80Z"/></svg>`,

    // UI Icons
    "auto-awesome": `<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24"><path fill="currentColor" d="m19 9l1.25-2.75L23 5l-2.75-1.25L19 1l-1.25 2.75L15 5l2.75 1.25zm0 6l-1.25 2.75L15 19l2.75 1.25L19 23l1.25-2.75L23 19l-2.75-1.25zm-7.5-5.5L9 4L6.5 9.5L1 12l5.5 2.5L9 20l2.5-5.5L17 12zm-1.51 3.49L9 15.17l-.99-2.18L5.83 12l2.18-.99L9 8.83l.99 2.18l2.18.99z"/></svg>`,

    "save": `<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24"><path fill="currentColor" d="M17 3H5a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14c1.1 0 2-.9 2-2V7zm2 16H5V5h11.17L19 7.83zm-7-7c-1.66 0-3 1.34-3 3s1.34 3 3 3s3-1.34 3-3s-1.34-3-3-3M6 6h9v4H6z"/></svg>`,

    "play": `<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24"><path fill="currentColor" d="M10 8.64L15.27 12L10 15.36zM8 5v14l11-7z"/></svg>`,

    "upload": `<svg fill="currentColor" width="24px" height="24px" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><path d="M8.71,7.71,11,5.41V15a1,1,0,0,0,2,0V5.41l2.29,2.3a1,1,0,0,0,1.42,0,1,1,0,0,0,0-1.42l-4-4a1,1,0,0,0-.33-.21,1,1,0,0,0-.76,0,1,1,0,0,0-.33.21l-4,4A1,1,0,1,0,8.71,7.71ZM21,12a1,1,0,0,0-1,1v6a1,1,0,0,1-1,1H5a1,1,0,0,1-1-1V13a1,1,0,0,0-2,0v6a3,3,0,0,0,3,3H19a3,3,0,0,0,3-3V13A1,1,0,0,0,21,12Z"/></svg>`,

    "download": `<svg width="24px" height="24px" viewBox="0 0 15 15" fill="none" xmlns="http://www.w3.org/2000/svg">
<path fill="currentColor" fill-rule="evenodd" clip-rule="evenodd" d="M7.50005 1.04999C7.74858 1.04999 7.95005 1.25146 7.95005 1.49999V8.41359L10.1819 6.18179C10.3576 6.00605 10.6425 6.00605 10.8182 6.18179C10.994 6.35753 10.994 6.64245 10.8182 6.81819L7.81825 9.81819C7.64251 9.99392 7.35759 9.99392 7.18185 9.81819L4.18185 6.81819C4.00611 6.64245 4.00611 6.35753 4.18185 6.18179C4.35759 6.00605 4.64251 6.00605 4.81825 6.18179L7.05005 8.41359V1.49999C7.05005 1.25146 7.25152 1.04999 7.50005 1.04999ZM2.5 10C2.77614 10 3 10.2239 3 10.5V12C3 12.5539 3.44565 13 3.99635 13H11.0012C11.5529 13 12 12.5528 12 12V10.5C12 10.2239 12.2239 10 12.5 10C12.7761 10 13 10.2239 13 10.5V12C13 13.1041 12.1062 14 11.0012 14H3.99635C2.89019 14 2 13.103 2 12V10.5C2 10.2239 2.22386 10 2.5 10Z"/>
</svg>`,

    "trash": `<svg xmlns="http://www.w3.org/2000/svg" height="24px" viewBox="0 -960 960 960" width="24px" fill="currentColor"><path d="M280-120q-33 0-56.5-23.5T200-200v-520h-40v-80h200v-40h240v40h200v80h-40v520q0 33-23.5 56.5T680-120H280Zm400-600H280v520h400v-520ZM360-280h80v-360h-80v360Zm160 0h80v-360h-80v360ZM280-720v520-520Z"/></svg>`
};


interface IconOptions {
    size?: number;
    color?: string; // Optional hex color to override currentColor via style
}

export const IconLoader = {
    /**
     * Create a ZToolkit-compatible SVG element
     */
    create(name: keyof typeof ICON_REGISTRY, options: IconOptions = {}) {
        const svgContent = ICON_REGISTRY[name];

        if (!svgContent) {
            ztoolkit.log(`[IconLoader] Icon not found: ${name}`);
            return {
                tag: "span",
                namespace: "html",
                properties: { innerHTML: "?" }
            };
        }

        const size = options.size || 20;

        return {
            tag: "div",
            namespace: "html",
            styles: {
                display: "inline-flex",
                alignItems: "center",
                justifyContent: "center",
                width: `${size}px`,
                height: `${size}px`,
                color: options.color || "inherit", // Allows parent to set currentColor
                lineHeight: "0", // Crucial for SVG alignment
            },
            properties: { innerHTML: svgContent },
            // Ensure child SVG takes full size
            children: [],
        };
    },

    /**
     * Get the SVG string directly (useful if needed for other purposes)
     */
    getRaw(name: keyof typeof ICON_REGISTRY): string {
        return ICON_REGISTRY[name] || "";
    }
};
