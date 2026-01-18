/**
 * PDF Helper Utilities
 * Shared functions for PDF file handling in Zotero
 */

/**
 * Get PDF data (ArrayBuffer) from a Zotero item
 * 
 * Uses Zotero's `getBestAttachment()` API to intelligently select the primary PDF
 * when multiple PDFs are attached (e.g., main document vs. supplement).
 * 
 * Zotero's selection logic prioritizes:
 * 1. Oldest PDF matching parent item's URL
 * 2. Oldest PDF not matching URL
 * 3. Falls back to first PDF if no match
 * 
 * @param item - A Zotero item (can be a regular item or PDF attachment)
 * @returns ArrayBuffer of PDF content, or null if no PDF found
 */
export async function getPdfData(item: Zotero.Item): Promise<ArrayBuffer | null> {
    ztoolkit.log(`[GeminiZotero:PDF] Getting PDF for item: ${item.id}`);

    // If the selected item is already a PDF attachment, use it directly
    if (item.isAttachment()) {
        ztoolkit.log("[GeminiZotero:PDF] Item itself is an attachment");
        if (item.attachmentContentType === "application/pdf") {
            const path = await item.getFilePathAsync();
            if (path) {
                const data = await IOUtils.read(path);
                ztoolkit.log(
                    `[GeminiZotero:PDF] Read ${data.byteLength} bytes from attachment`,
                );
                return data.buffer as ArrayBuffer;
            }
        }
        ztoolkit.log("[GeminiZotero:PDF] Attachment is not a PDF");
        return null;
    }

    // For regular items, use Zotero's getBestAttachment() to find the primary PDF
    // This intelligently handles cases with multiple PDFs (main + supplement)
    try {
        const bestAttachment = await item.getBestAttachment();
        if (bestAttachment && bestAttachment.isPDFAttachment()) {
            const path = await bestAttachment.getFilePathAsync();
            if (path) {
                const data = await IOUtils.read(path);
                ztoolkit.log(
                    `[GeminiZotero:PDF] Using best attachment (${bestAttachment.id}): ${data.byteLength} bytes`,
                );
                return data.buffer as ArrayBuffer;
            }
        }
    } catch (e) {
        ztoolkit.log("[GeminiZotero:PDF] getBestAttachment failed, falling back to manual search:", e);
    }

    // Fallback: manually search for first PDF attachment
    const attachmentIDs = item.getAttachments();
    ztoolkit.log(`[GeminiZotero:PDF] Fallback: Found ${attachmentIDs.length} attachments`);

    for (const id of attachmentIDs) {
        const attachment = Zotero.Items.get(id);
        ztoolkit.log(
            `[GeminiZotero:PDF] Checking attachment ${id}: ${attachment.attachmentContentType}`,
        );

        if (attachment.attachmentContentType === "application/pdf") {
            const path = await attachment.getFilePathAsync();
            ztoolkit.log(`[GeminiZotero:PDF] PDF path: ${path}`);

            if (path) {
                const data = await IOUtils.read(path);
                ztoolkit.log(`[GeminiZotero:PDF] Read ${data.byteLength} bytes`);
                return data.buffer as ArrayBuffer;
            }
        }
    }

    ztoolkit.log("[GeminiZotero:PDF] No PDF found");
    return null;
}

/**
 * Get PDF file size in MB (rounded to 1 decimal)
 */
export function getPdfSizeMB(data: ArrayBuffer): number {
    return Math.round(data.byteLength / 1024 / 1024 * 10) / 10;
}
