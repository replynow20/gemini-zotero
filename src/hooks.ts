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
    await Promise.all([
        Zotero.initializationPromise,
        Zotero.unlockPromise,
        Zotero.uiReadyPromise,
    ]);

    initLocale();

    // Register preference pane
    try {
        Zotero.PreferencePanes.register({
            pluginID: addon.data.config.addonID,
            src: rootURI + "content/preferences.xhtml",
            label: "Gemini Zotero",
            image: `chrome://${addon.data.config.addonRef}/content/icons/favicon-sele.svg`,
        });
    } catch (e) {
        ztoolkit.log("[GeminiZotero] ERROR: Failed to register preference pane:", e);
    }

    // Register PDF selection popup handler
    try {
        registerSelectionHandler();
    } catch (e) {
        ztoolkit.log("[GeminiZotero] ERROR: Failed to register selection handler:", e);
    }

    const windows = Zotero.getMainWindows();
    await Promise.all(
        windows.map((win) => onMainWindowLoad(win)),
    );

    registerPrefObservers();

    addon.data.initialized = true;
    ztoolkit.log("[GeminiZotero] Plugin fully initialized");
}

async function onMainWindowLoad(win: _ZoteroTypes.MainWindow): Promise<void> {
    addon.data.ztoolkit = createZToolkit();

    // Insert localization resources
    try {
        const ftlPath = `${addon.data.config.addonRef}-mainWindow.ftl`;
        win.MozXULElement.insertFTLIfNeeded(ftlPath);
    } catch (e) {
        ztoolkit.log("[GeminiZotero] ERROR: Failed to load FTL:", e);
    }

    // Register batch analysis menu per window
    if (!menuRegisteredWindows.has(win)) {
        try {
            await registerBatchMenu(win);
            menuRegisteredWindows.add(win);
        } catch (e) {
            ztoolkit.log("[GeminiZotero] ERROR: Failed to register batch menu:", e);
        }

        // Register collection toolbar button
        try {
            registerCollectionToolbarButton(win);
        } catch (e) {
            ztoolkit.log("[GeminiZotero] ERROR: Failed to register collection toolbar button:", e);
        }
    }

    // Show startup notification in development mode
    if (__env__ === "development") {
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
}

async function onMainWindowUnload(_win: Window): Promise<void> {
    closePluginPopup();
    ztoolkit.unregisterAll();
}

function onShutdown(): void {
    ztoolkit.log("[GeminiZotero] Shutdown");
    addon.data.alive = false;
    unregisterSelectionHandler();
    unregisterPrefObservers();
    // Flush any pending history writes before shutdown
    flushHistory().catch(e => ztoolkit.log("[GeminiZotero] Error flushing history:", e));
    ztoolkit.unregisterAll();
}

function onPrefsEvent(type: string, data: { window: Window }) {
    if (type === "load") {
        addon.resetGeminiClient();
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
            if (input) {
                input.value = value;
                input.setAttribute("value", value);
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
    }
}

export default {
    onStartup,
    onMainWindowLoad,
    onMainWindowUnload,
    onShutdown,
    onPrefsEvent,
};
