/**
 * Sync Gemini-generated tags back to Zotero items
 */

const MAX_TAGS = 10;

export async function syncTagsFromStructuredOutput(item: Zotero.Item, responseText: string): Promise<void> {
    // Check if tag sync is enabled
    const enableTagSync = Zotero.Prefs.get("extensions.zotero.geminizotero.enableTagSync", true) as boolean;
    if (!enableTagSync) {
        ztoolkit.log("[GeminiZotero:Tags] Tag sync is disabled in preferences");
        return;
    }

    const extracted = extractTags(responseText);
    if (extracted.length === 0) {
        ztoolkit.log("[GeminiZotero:Tags] No tags present in structured response");
        return;
    }


    const targetItem = resolveTagTarget(item);
    if (!targetItem) {
        ztoolkit.log("[GeminiZotero:Tags] Unable to resolve target item for tag sync");
        return;
    }

    const tagsToAdd = sanitizeTags(extracted);
    if (tagsToAdd.length === 0) {
        ztoolkit.log("[GeminiZotero:Tags] Sanitized tag list empty");
        return;
    }

    const existing = new Set(
        targetItem
            .getTags()
            .map(tag => normalizeTag(tag.tag)),
    );

    let added = 0;
    for (const tag of tagsToAdd) {
        const normalized = normalizeTag(tag);
        if (existing.has(normalized)) {
            continue;
        }
        targetItem.addTag(tag, 0);
        existing.add(normalized);
        added++;
    }

    if (added === 0) {
        ztoolkit.log("[GeminiZotero:Tags] All suggested tags already exist");
        return;
    }

    try {
        await targetItem.saveTx();
        ztoolkit.log(`[GeminiZotero:Tags] Added ${added} tag(s) to item ${targetItem.id}`);
    } catch (error) {
        ztoolkit.log("[GeminiZotero:Tags] Failed to save tags", error);
    }
}

function extractTags(responseText: string): string[] {
    try {
        const data = JSON.parse(responseText);
        const tags = data?.tags;
        if (Array.isArray(tags)) {
            return tags.map(tag => {
                if (typeof tag === "string") return tag;
                if (tag && typeof tag === "object" && "tag" in tag) {
                    return String(tag.tag);
                }
                return JSON.stringify(tag);
            });
        }
    } catch (error) {
        ztoolkit.log("[GeminiZotero:Tags] Failed to parse tags from response", error);
    }
    return [];
}

function sanitizeTags(tags: string[]): string[] {
    const cleaned: string[] = [];
    const seen = new Set<string>();

    for (const raw of tags) {
        const tag = sanitizeTag(raw);
        if (!tag) continue;
        const normalized = normalizeTag(tag);
        if (seen.has(normalized)) continue;
        cleaned.push(tag);
        seen.add(normalized);
        if (cleaned.length >= MAX_TAGS) break;
    }

    return cleaned;
}

function sanitizeTag(tag: string): string | null {
    if (!tag) return null;
    const cleaned = tag
        .replace(/[#@]/g, "")
        .replace(/[;,]/g, " ")
        .replace(/\s+/g, " ")
        .trim();
    if (!cleaned) return null;
    return cleaned.slice(0, 64);
}

function normalizeTag(tag: string): string {
    return tag.toLowerCase();
}

function resolveTagTarget(item: Zotero.Item): Zotero.Item | null {
    if (!item) {
        return null;
    }

    if (item.isRegularItem && item.isRegularItem()) {
        return item;
    }

    const parentID = item.parentItemID as number | undefined;
    if (parentID) {
        const parent = Zotero.Items.get(parentID);
        if (parent?.isRegularItem?.()) {
            return parent;
        }
        return parent || null;
    }

    return item.isAttachment?.() ? null : item;
}
