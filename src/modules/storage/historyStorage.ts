/**
 * Conversation History Storage
 * Persists conversation history in Zotero's data directory (file-based)
 * 
 * Storage location: <Zotero data dir>/gemini-zotero/conversation-history.json
 * This avoids the size limitations of Zotero.Prefs and is more appropriate
 * for storing potentially large conversation data.
 */

import { config } from "../../../package.json";

export interface ConversationMessage {
    id?: number;
    itemId: number;
    role: "user" | "assistant";
    content: string;
    timestamp: number;
}

// Storage configuration
const STORAGE_DIR = "gemini-zotero";
const HISTORY_FILE = "conversation-history.json";
const MAX_MESSAGES_PER_ITEM = 50;
const MAX_TOTAL_SIZE_BYTES = 10 * 1024 * 1024; // 10MB

// Legacy Prefs key for migration
const LEGACY_PREF_KEY = `${config.prefsPrefix}.conversationHistory`;

// In-memory cache to reduce file I/O
let historyCache: Record<number, ConversationMessage[]> | null = null;
let isDirty = false;

/**
 * Get the path to the history storage directory
 */
function getStorageDir(): string {
    return PathUtils.join(Zotero.DataDirectory.dir, STORAGE_DIR);
}

/**
 * Get the path to the history file
 */
function getHistoryPath(): string {
    return PathUtils.join(getStorageDir(), HISTORY_FILE);
}

/**
 * Ensure the storage directory exists
 */
async function ensureStorageDir(): Promise<void> {
    const dirPath = getStorageDir();
    if (!await IOUtils.exists(dirPath)) {
        await IOUtils.makeDirectory(dirPath, { ignoreExisting: true });
        ztoolkit.log("[GeminiZotero:History] Created storage directory:", dirPath);
    }
}

/**
 * Migrate data from legacy Prefs storage to file-based storage
 */
async function migrateFromPrefs(): Promise<Record<number, ConversationMessage[]>> {
    try {
        const legacyData = Zotero.Prefs.get(LEGACY_PREF_KEY, true) as string;
        if (legacyData && legacyData !== "{}") {
            const parsed = JSON.parse(legacyData);
            ztoolkit.log("[GeminiZotero:History] Migrating legacy data from Prefs");

            // Clear legacy data after migration
            Zotero.Prefs.clear(LEGACY_PREF_KEY, true);
            ztoolkit.log("[GeminiZotero:History] Cleared legacy Prefs data");

            return parsed;
        }
    } catch (e) {
        ztoolkit.log("[GeminiZotero:History] Error during migration (non-fatal):", e);
    }
    return {};
}

/**
 * Load history from file (with migration and caching)
 */
async function loadHistory(): Promise<Record<number, ConversationMessage[]>> {
    // Return cached data if available
    if (historyCache !== null) {
        return historyCache;
    }

    try {
        await ensureStorageDir();
        const historyPath = getHistoryPath();

        if (await IOUtils.exists(historyPath)) {
            const content = await IOUtils.readUTF8(historyPath);
            historyCache = JSON.parse(content);
            ztoolkit.log("[GeminiZotero:History] Loaded history from file");
            return historyCache!;
        } else {
            // Try to migrate from legacy Prefs
            historyCache = await migrateFromPrefs();

            // If we got migrated data, save it to the new location
            if (Object.keys(historyCache).length > 0) {
                await saveHistoryToFile(historyCache);
            }

            return historyCache;
        }
    } catch (e) {
        ztoolkit.log("[GeminiZotero:History] Error loading history:", e);
        historyCache = {};
        return historyCache;
    }
}

/**
 * Save history to file
 */
async function saveHistoryToFile(history: Record<number, ConversationMessage[]>): Promise<void> {
    try {
        await ensureStorageDir();
        const historyPath = getHistoryPath();

        // Prune if too large
        let serialized = JSON.stringify(history);
        if (serialized.length > MAX_TOTAL_SIZE_BYTES) {
            // Remove oldest items until under limit
            const itemIds = Object.keys(history).map(Number);
            const sortedIds = itemIds.sort((a, b) => {
                const aTime = history[a]?.[0]?.timestamp || 0;
                const bTime = history[b]?.[0]?.timestamp || 0;
                return aTime - bTime;
            });

            for (const id of sortedIds) {
                delete history[id];
                serialized = JSON.stringify(history);
                if (serialized.length <= MAX_TOTAL_SIZE_BYTES) {
                    break;
                }
            }
            ztoolkit.log("[GeminiZotero:History] Pruned history due to size limit");
        }

        await IOUtils.writeUTF8(historyPath, serialized);
        isDirty = false;
    } catch (e) {
        ztoolkit.log("[GeminiZotero:History] Error saving history:", e);
    }
}

/**
 * Debounced save - only writes to disk after a delay to batch multiple saves
 */
let saveTimeout: ReturnType<typeof setTimeout> | null = null;
function scheduleSave(): void {
    if (saveTimeout) {
        clearTimeout(saveTimeout);
    }
    isDirty = true;
    saveTimeout = setTimeout(async () => {
        if (historyCache !== null && isDirty) {
            await saveHistoryToFile(historyCache);
        }
    }, 1000); // Wait 1 second before writing
}

/**
 * Save a message to conversation history
 */
export async function saveMessage(
    itemId: number,
    role: "user" | "assistant",
    content: string
): Promise<void> {
    const history = await loadHistory();

    if (!history[itemId]) {
        history[itemId] = [];
    }

    history[itemId].push({
        role,
        content,
        timestamp: Date.now(),
        itemId,
    });

    // Keep only last N messages per item
    if (history[itemId].length > MAX_MESSAGES_PER_ITEM) {
        history[itemId] = history[itemId].slice(-MAX_MESSAGES_PER_ITEM);
    }

    scheduleSave();
}

/**
 * Get conversation history for an item
 */
export async function getHistory(itemId: number): Promise<ConversationMessage[]> {
    const history = await loadHistory();
    return history[itemId] || [];
}

/**
 * Clear conversation history for an item
 */
export async function clearHistory(itemId: number): Promise<void> {
    const history = await loadHistory();
    delete history[itemId];
    scheduleSave();
}

/**
 * Clear all conversation history
 */
export async function clearAllHistory(): Promise<void> {
    historyCache = {};
    await saveHistoryToFile(historyCache);
}

/**
 * Export conversation history for an item as formatted text
 */
export async function exportHistoryAsText(itemId: number): Promise<string> {
    const messages = await getHistory(itemId);
    return messages
        .map(msg => {
            const time = new Date(msg.timestamp).toLocaleString("zh-CN");
            const role = msg.role === "user" ? "用户" : "Gemini";
            return `## ${role} (${time})\n\n${msg.content}`;
        })
        .join("\n\n---\n\n");
}

/**
 * Force flush any pending writes to disk
 * Call this before plugin shutdown
 */
export async function flushHistory(): Promise<void> {
    if (saveTimeout) {
        clearTimeout(saveTimeout);
        saveTimeout = null;
    }
    if (historyCache !== null && isDirty) {
        await saveHistoryToFile(historyCache);
    }
}
