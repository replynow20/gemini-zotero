// Type declarations for Zotero globals in plugin context
// These are provided at runtime by zotero-types but may need explicit declarations

declare global {
    const Zotero: _ZoteroTypes.Zotero;
    const IOUtils: typeof import("resource://gre/modules/IOUtils.sys.mjs").IOUtils;
    const Services: typeof import("resource://gre/modules/Services.jsm").Services;
    const Components: nsIXPCComponents;
    const PathUtils: typeof import("resource://gre/modules/PathUtils.sys.mjs").PathUtils;

    interface Window {
        MozXULElement: {
            insertFTLIfNeeded(path: string): void;
        };
    }
}

export { };
