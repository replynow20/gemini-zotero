import { config } from "../package.json";
import { DialogHelper } from "zotero-plugin-toolkit";
import hooks from "./hooks";
import { createZToolkit } from "./utils/ztoolkit";
import { GeminiClient } from "./modules/gemini/client";

class Addon {
    public data: {
        alive: boolean;
        config: typeof config;
        env: "development" | "production";
        initialized?: boolean;
        ztoolkit: ZToolkit;
        locale?: {
            current: any;
        };
        prefs?: {
            window: Window;
        };
        dialog?: DialogHelper;
        // Gemini Zotero specific data
        geminiClient?: GeminiClient;
        currentPdfPath?: string;
    };

    public hooks: typeof hooks;
    public api: object;

    constructor() {
        this.data = {
            alive: true,
            config,
            env: __env__,
            initialized: false,
            ztoolkit: createZToolkit(),
        };
        this.hooks = hooks;
        this.api = {};
    }

    /**
     * Initialize or get Gemini client with custom API URL support
     */
    getGeminiClient(): GeminiClient | undefined {
        if (!this.data.geminiClient) {
            const apiKey = Zotero.Prefs.get(`${config.prefsPrefix}.apiKey`, true) as string;
            if (apiKey) {
                const model = (Zotero.Prefs.get(`${config.prefsPrefix}.model`, true) as string) || "gemini-3-flash-preview";
                const apiBaseUrl = ((Zotero.Prefs.get(`${config.prefsPrefix}.apiBaseUrl`, true) as string) || "").trim();

                // Read generation config from preferences
                const temperature = parseFloat(Zotero.Prefs.get(`${config.prefsPrefix}.temperature`, true) as string) || 1.0;
                const topP = parseFloat(Zotero.Prefs.get(`${config.prefsPrefix}.topP`, true) as string) || 0.95;
                const topK = parseInt(Zotero.Prefs.get(`${config.prefsPrefix}.topK`, true) as string, 10) || 40;
                const maxOutputTokens = parseInt(Zotero.Prefs.get(`${config.prefsPrefix}.maxOutputTokens`, true) as string, 10) || 8192;

                this.data.geminiClient = new GeminiClient(
                    apiKey,
                    model,
                    apiBaseUrl || undefined,
                    { temperature, topP, topK, maxOutputTokens }
                );
            }
        }
        return this.data.geminiClient;
    }

    /**
     * Reset Gemini client (e.g., when settings change)
     */
    resetGeminiClient() {
        this.data.geminiClient = undefined;
    }

}

export default Addon;
