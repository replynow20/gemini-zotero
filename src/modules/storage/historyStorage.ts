/**
 * Conversation History Storage
 * Persists conversation history in Zotero's database
 */

import { config } from "../../../package.json";

export interface ConversationMessage {
    id?: number;
    itemId: number;
    role: "user" | "assistant";
    content: string;
    timestamp: number;
}

const PREF_KEY = `${config.prefsPrefix}.conversationHistory`;

/**
 * Save a message to conversation history
 */
export async function saveMessage(
    itemId: number,
    role: "user" | "assistant",
    content: string
): Promise<void> {
    const history = loadHistory();

    if (!history[itemId]) {
        history[itemId] = [];
    }

    history[itemId].push({
        role,
        content,
        timestamp: Date.now(),
        itemId,
    });

    // Keep only last 50 messages per item to avoid storage bloat
    if (history[itemId].length > 50) {
        history[itemId] = history[itemId].slice(-50);
    }

    saveHistory(history);
}

/**
 * Get conversation history for an item
 */
export function getHistory(itemId: number): ConversationMessage[] {
    const history = loadHistory();
    return history[itemId] || [];
}

/**
 * Clear conversation history for an item
 */
export function clearHistory(itemId: number): void {
    const history = loadHistory();
    delete history[itemId];
    saveHistory(history);
}

/**
 * Clear all conversation history
 */
export function clearAllHistory(): void {
    Zotero.Prefs.set(PREF_KEY, "{}", true);
}

/**
 * Load history from preferences
 */
function loadHistory(): Record<number, ConversationMessage[]> {
    try {
        const stored = Zotero.Prefs.get(PREF_KEY, true) as string;
        return stored ? JSON.parse(stored) : {};
    } catch (e) {
        ztoolkit.log("Error loading conversation history:", e);
        return {};
    }
}

/**
 * Save history to preferences
 */
function saveHistory(history: Record<number, ConversationMessage[]>): void {
    try {
        // Limit total size to avoid storage issues
        const serialized = JSON.stringify(history);
        if (serialized.length > 5 * 1024 * 1024) { // 5MB limit
            // Prune oldest entries
            const itemIds = Object.keys(history).map(Number);
            for (const id of itemIds.slice(0, Math.floor(itemIds.length / 2))) {
                delete history[id];
            }
            ztoolkit.log("Pruned conversation history due to size limit");
        }
        Zotero.Prefs.set(PREF_KEY, JSON.stringify(history), true);
    } catch (e) {
        ztoolkit.log("Error saving conversation history:", e);
    }
}

/**
 * Export conversation history for an item as formatted text
 */
export function exportHistoryAsText(itemId: number): string {
    const messages = getHistory(itemId);
    return messages
        .map(msg => {
            const time = new Date(msg.timestamp).toLocaleString("zh-CN");
            const role = msg.role === "user" ? "用户" : "Gemini";
            return `## ${role} (${time})\n\n${msg.content}`;
        })
        .join("\n\n---\n\n");
}
