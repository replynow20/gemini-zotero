import { config } from "../../package.json";

const PREFS_TO_WATCH = new Set(["apiKey", "apiBaseUrl", "model"]);

let prefBranch: any = null;

const prefObserver = {
    observe(_subject: unknown, topic: string, data: string) {
        if (topic !== "nsPref:changed" || typeof data !== "string") {
            return;
        }

        if (!PREFS_TO_WATCH.has(data)) {
            return;
        }

        ztoolkit.log(`[GeminiZotero] Pref changed: ${data}, resetting Gemini client`);
        addon.resetGeminiClient();
    },
};

export function registerPrefObservers() {
    if (prefBranch) {
        return;
    }

    try {
        prefBranch = Services.prefs.getBranch(`${config.prefsPrefix}.`);
        prefBranch.addObserver("", prefObserver);
        ztoolkit.log("[GeminiZotero] Preference observers registered");
    } catch (e) {
        ztoolkit.log("[GeminiZotero] Failed to register preference observers", e);
    }
}

export function unregisterPrefObservers() {
    if (!prefBranch) {
        return;
    }

    try {
        prefBranch.removeObserver("", prefObserver);
        prefBranch = null;
        ztoolkit.log("[GeminiZotero] Preference observers unregistered");
    } catch (e) {
        ztoolkit.log("[GeminiZotero] Failed to unregister preference observers", e);
    }
}
