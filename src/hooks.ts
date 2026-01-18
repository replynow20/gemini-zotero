import { initLocale } from "./utils/locale";
import { createZToolkit } from "./utils/ztoolkit";
// [DISABLED] Reader Panel - Replaced by Collection Toolbar button popup (collectionToolbar.ts)
// The reader panel code is preserved in readerPanel.ts for potential future use.
// import { registerReaderPanel } from "./modules/ui/readerPanel";
import { registerSelectionHandler, unregisterSelectionHandler } from "./modules/ui/selectionPopup";
import { registerCollectionToolbarButton, closePluginPopup } from "./modules/ui/collectionToolbar";
import { registerBatchMenu } from "./modules/batch/batchProcessor";
import { registerPrefObservers, unregisterPrefObservers } from "./utils/prefs";
import { flushHistory } from "./modules/storage/historyStorage";

// Track windows that have had menus registered
const menuRegisteredWindows = new WeakSet<_ZoteroTypes.MainWindow>();

async function onStartup() {
    ztoolkit.log("[GeminiZotero] onStartup called");

    ztoolkit.log("[GeminiZotero] Waiting for Zotero initialization...");
    await Promise.all([
        Zotero.initializationPromise,
        Zotero.unlockPromise,
        Zotero.uiReadyPromise,
    ]);
    ztoolkit.log("[GeminiZotero] Zotero initialized");

    ztoolkit.log("[GeminiZotero] Initializing locale...");
    initLocale();
    ztoolkit.log("[GeminiZotero] Locale initialized");

    // Register preference pane
    ztoolkit.log("[GeminiZotero] Registering preference pane...");
    try {
        Zotero.PreferencePanes.register({
            pluginID: addon.data.config.addonID,
            src: rootURI + "content/preferences.xhtml",
            label: "Gemini Zotero",
            image: `chrome://${addon.data.config.addonRef}/content/icons/favicon-sele.svg`,
        });
        ztoolkit.log("[GeminiZotero] Preference pane registered successfully");
    } catch (e) {
        ztoolkit.log("[GeminiZotero] ERROR: Failed to register preference pane:", e);
    }

    // [DISABLED] Reader Panel - Replaced by Collection Toolbar button popup
    // The toolbar popup provides the same functionality with a better UX.
    // This code is preserved for potential future features (e.g., in-reader sidebar).
    // ztoolkit.log("[GeminiZotero] Registering reader panel...");
    // try {
    //     registerReaderPanel();
    //     ztoolkit.log("[GeminiZotero] Reader panel registered successfully");
    // } catch (e) {
    //     ztoolkit.log("[GeminiZotero] ERROR: Failed to register reader panel:", e);
    // }

    // Register PDF selection popup handler
    ztoolkit.log("[GeminiZotero] Registering selection handler...");
    try {
        registerSelectionHandler();
        ztoolkit.log("[GeminiZotero] Selection handler registered successfully");
    } catch (e) {
        ztoolkit.log("[GeminiZotero] ERROR: Failed to register selection handler:", e);
    }

    ztoolkit.log("[GeminiZotero] Processing main windows...");
    const windows = Zotero.getMainWindows();
    ztoolkit.log(`[GeminiZotero] Found ${windows.length} main window(s)`);

    await Promise.all(
        windows.map((win) => onMainWindowLoad(win)),
    );

    registerPrefObservers();

    addon.data.initialized = true;
    ztoolkit.log("[GeminiZotero] ====== Plugin fully initialized ======");
}

async function onMainWindowLoad(win: _ZoteroTypes.MainWindow): Promise<void> {
    ztoolkit.log("[GeminiZotero] onMainWindowLoad called");

    addon.data.ztoolkit = createZToolkit();
    ztoolkit.log("[GeminiZotero] ZToolkit created");

    // Insert localization resources - use correct FTL file name
    ztoolkit.log("[GeminiZotero] Loading FTL resources...");
    try {
        const ftlPath = `${addon.data.config.addonRef}-mainWindow.ftl`;
        ztoolkit.log(`[GeminiZotero] FTL path: ${ftlPath}`);
        win.MozXULElement.insertFTLIfNeeded(ftlPath);
        ztoolkit.log("[GeminiZotero] FTL loaded successfully");
    } catch (e) {
        ztoolkit.log("[GeminiZotero] ERROR: Failed to load FTL:", e);
    }

    // Register batch analysis menu per window
    if (!menuRegisteredWindows.has(win)) {
        ztoolkit.log("[GeminiZotero] Registering batch menu for window");
        try {
            await registerBatchMenu(win);
            menuRegisteredWindows.add(win);
            ztoolkit.log("[GeminiZotero] Batch menu registered successfully");
        } catch (e) {
            ztoolkit.log("[GeminiZotero] ERROR: Failed to register batch menu:", e);
        }

        // Register collection toolbar button
        ztoolkit.log("[GeminiZotero] Registering collection toolbar button");
        try {
            registerCollectionToolbarButton(win);
            ztoolkit.log("[GeminiZotero] Collection toolbar button registered successfully");
        } catch (e) {
            ztoolkit.log("[GeminiZotero] ERROR: Failed to register collection toolbar button:", e);
        }
    } else {
        ztoolkit.log("[GeminiZotero] Batch menu already registered for this window, skipping");
    }

    // Show startup notification in development mode
    if (__env__ === "development") {
        ztoolkit.log("[GeminiZotero] Development mode - showing notification");
        new ztoolkit.ProgressWindow(addon.data.config.addonName, {
            closeOnClick: true,
            closeTime: 3000,
        })
            .createLine({
                text: "Gemini Zotero loaded",
                type: "default",
            })
            .show();
    }

    // Add unload listener to close plugin popup when main window closes
    win.addEventListener("unload", () => onMainWindowUnload(win));

    ztoolkit.log("[GeminiZotero] onMainWindowLoad completed");
}

async function onMainWindowUnload(_win: Window): Promise<void> {
    ztoolkit.log("[GeminiZotero] onMainWindowUnload called");
    // Close the plugin popup if it's open
    closePluginPopup();
    ztoolkit.unregisterAll();
    ztoolkit.log("[GeminiZotero] Window unload completed");
}

function onShutdown(): void {
    ztoolkit.log("[GeminiZotero] onShutdown called");
    addon.data.alive = false;
    unregisterSelectionHandler();
    unregisterPrefObservers();
    // Flush any pending history writes before shutdown
    flushHistory().catch(e => ztoolkit.log("[GeminiZotero] Error flushing history:", e));
    ztoolkit.unregisterAll();
    ztoolkit.log("[GeminiZotero] Shutdown completed");
}

function onPrefsEvent(type: string, data: { window: Window }) {
    ztoolkit.log(`[GeminiZotero] onPrefsEvent: ${type}`);
    if (type === "load") {
        addon.resetGeminiClient();
        ztoolkit.log("[GeminiZotero] Gemini client reset due to prefs load");
    } else if (type === "restore-defaults") {
        // Restore model parameters to default values
        const prefs = Zotero.Prefs;
        const prefix = addon.data.config.prefsPrefix;

        // Default values
        const defaults = {
            temperature: "1.0",
            topP: "0.95",
            topK: "40",
            maxOutputTokens: "8192",
        };

        // Reset preferences to their default values (use true to prevent doubled prefix)
        prefs.set(`${prefix}.temperature`, defaults.temperature, true);
        prefs.set(`${prefix}.topP`, defaults.topP, true);
        prefs.set(`${prefix}.topK`, defaults.topK, true);
        prefs.set(`${prefix}.maxOutputTokens`, defaults.maxOutputTokens, true);

        // Update the UI input elements to reflect the new values
        const doc = data.window.document;

        // Helper function to update an input element
        const updateInputValue = (id: string, value: string) => {
            const input = doc.getElementById(id) as HTMLInputElement;
            ztoolkit.log(`[GeminiZotero] Updating input ${id}: element found = ${!!input}`);
            if (input) {
                // Set value property directly
                input.value = value;
                // Also set the attribute for XUL compatibility
                input.setAttribute("value", value);
                // Dispatch input event to trigger any preference bindings
                // Use data.window.Event since global Event is not available in XUL context
                const win = data.window as any;
                if (win.Event) {
                    input.dispatchEvent(new win.Event("input", { bubbles: true }));
                    input.dispatchEvent(new win.Event("change", { bubbles: true }));
                }
            }
        };

        updateInputValue("zotero-prefpane-geminizotero-temperature", defaults.temperature);
        updateInputValue("zotero-prefpane-geminizotero-topp", defaults.topP);
        updateInputValue("zotero-prefpane-geminizotero-topk", defaults.topK);
        updateInputValue("zotero-prefpane-geminizotero-maxtokens", defaults.maxOutputTokens);

        // Show confirmation message
        new ztoolkit.ProgressWindow(addon.data.config.addonName, {
            closeOnClick: true,
            closeTime: 3000,
        })
            .createLine({
                text: "已恢复模型参数默认值",
                type: "success",
            })
            .show();

        // Reset Gemini client with new settings
        addon.resetGeminiClient();
        ztoolkit.log("[GeminiZotero] Model parameters restored to defaults");
    }
}

export default {
    onStartup,
    onMainWindowLoad,
    onMainWindowUnload,
    onShutdown,
    onPrefsEvent,
};
