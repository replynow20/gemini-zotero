import { config } from "../../package.json";

export { initLocale, getString, getLocaleID };

/**
 * Initialize locale data
 * The FTL file path must use the addon ref prefix for Zotero to find it
 */
function initLocale() {
    const l10n = new (
        typeof Localization === "undefined"
            ? ztoolkit.getGlobal("Localization")
            : Localization
    )([`${config.addonRef}-addon.ftl`], true);
    addon.data.locale = {
        current: l10n,
    };
}

/**
 * Get locale string
 */
function getString(localeString: string, args?: Record<string, unknown>): string {
    const l10n = addon.data.locale?.current;
    if (!l10n) {
        return "";
    }

    const candidates = localeString.startsWith(`${config.addonRef}-`)
        ? [localeString]
        : [`${config.addonRef}-${localeString}`, localeString];

    for (const id of candidates) {
        try {
            const pattern = l10n.formatMessagesSync([{ id, args }])[0];
            if (pattern?.value && pattern.value !== id) {
                return pattern.value;
            }
        } catch {
            // Ignore format errors and try the next candidate
        }
    }

    return "";
}

function getLocaleID(id: string) {
    return id;
}
