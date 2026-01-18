/**
 * Batch PDF Analysis Processor
 * Allows analyzing multiple selected items at once
 */

import { config } from "../../../package.json";
import { createNoteForItem } from "../export/noteExport";
import { getTemplateById } from "../templates/builtinSchemas";
import { syncTagsFromStructuredOutput } from "../storage/tagSync";
import { closeProgressWindowAfter } from "../../utils/progressWindow";
import { getPdfData } from "../../utils/pdfHelper";

const ITEM_MENU_SELECTOR = "#zotero-itemmenu";
const MENU_WAIT_ATTEMPTS = 20;
const MENU_WAIT_DELAY_MS = 100;

export async function registerBatchMenu(win?: Window) {
  ztoolkit.log("[GeminiZotero:BatchMenu] Starting menu registration...");

  try {
    const menuIcon = `chrome://${config.addonRef}/content/icons/favicon.png`;
    ztoolkit.log(`[GeminiZotero:BatchMenu] Menu icon path: ${menuIcon}`);

    const documentRef = win?.document ?? Zotero.getMainWindow()?.document;
    if (!documentRef) {
      const error = new Error("Zotero main window document unavailable");
      ztoolkit.log("[GeminiZotero:BatchMenu] ERROR: Document missing", error);
      throw error;
    }

    const menuPopup = await waitForMenu(documentRef);
    if (!menuPopup) {
      const error = new Error(`Timed out waiting for ${ITEM_MENU_SELECTOR}`);
      ztoolkit.log(
        "[GeminiZotero:BatchMenu] ERROR: Menu element not found",
        error,
      );
      throw error;
    }

    ztoolkit.log("[GeminiZotero:BatchMenu] Calling ztoolkit.Menu.register...");

    const registerResult = ztoolkit.Menu.register(menuPopup as any, {
      tag: "menuitem",
      id: "geminizotero-analyze-item",
      label: "使用 Gemini 分析",
      icon: menuIcon,
      commandListener: async (ev) => {
        ztoolkit.log("[GeminiZotero:BatchMenu] Menu item clicked!");
        try {
          const items = Zotero.getActiveZoteroPane().getSelectedItems();
          ztoolkit.log(
            `[GeminiZotero:BatchMenu] Selected items: ${items.length}`,
          );
          if (items.length >= 1) {
            if (items.length === 1) {
              await analyzeSingleItem(items[0]);
            } else {
              await batchAnalyze(items);
            }
          }
        } catch (e) {
          ztoolkit.log("[GeminiZotero:BatchMenu] ERROR in commandListener:", e);
        }
      },
    });

    if (registerResult === false) {
      const error = new Error(
        "ztoolkit.Menu.register returned false for item menu",
      );
      ztoolkit.log(
        "[GeminiZotero:BatchMenu] ERROR: Register returned false",
        error,
      );
      throw error;
    }

    ztoolkit.log(
      "[GeminiZotero:BatchMenu] Menu registration completed successfully",
    );
  } catch (error) {
    ztoolkit.log(
      "[GeminiZotero:BatchMenu] ERROR: Failed to register menu:",
      error,
    );
    throw error; // Re-throw to let caller know
  }
}

async function waitForMenu(doc: Document) {
  for (let attempt = 0; attempt < MENU_WAIT_ATTEMPTS; attempt++) {
    const popup = doc.querySelector(ITEM_MENU_SELECTOR);
    if (popup) {
      return popup;
    }
    await Zotero.Promise.delay(MENU_WAIT_DELAY_MS);
  }
  return null;
}

async function analyzeSingleItem(item: Zotero.Item) {
  ztoolkit.log(`[GeminiZotero:Analyze] Starting analysis for item: ${item.id}`);

  const progressWin = new ztoolkit.ProgressWindow("Gemini Zotero", {
    closeOnClick: false,
    closeTime: -1,
  })
    .createLine({ text: "正在准备分析...", type: "default", progress: 5 })
    .show();

  try {
    ztoolkit.log("[GeminiZotero:Analyze] Getting Gemini client...");
    const client = addon.getGeminiClient();
    if (!client) {
      ztoolkit.log("[GeminiZotero:Analyze] ERROR: No API key configured");
      progressWin.changeLine({
        text: "请先配置 API Key",
        type: "fail",
        progress: 100,
      });
      closeProgressWindowAfter(progressWin, 4000);
      return;
    }
    ztoolkit.log("[GeminiZotero:Analyze] Gemini client obtained");

    ztoolkit.log("[GeminiZotero:Analyze] Getting PDF data...");
    const pdfData = await getPdfData(item);
    if (!pdfData) {
      ztoolkit.log("[GeminiZotero:Analyze] ERROR: No PDF attachment found");
      progressWin.changeLine({
        text: "未找到 PDF 附件",
        type: "fail",
        progress: 100,
      });
      closeProgressWindowAfter(progressWin, 4000);
      return;
    }
    ztoolkit.log(
      `[GeminiZotero:Analyze] PDF data obtained, size: ${pdfData.byteLength} bytes`,
    );

    const pdfSizeMB = Math.round(pdfData.byteLength / 1024 / 1024 * 10) / 10;
    progressWin.changeLine({ text: `正在分析 PDF（${pdfSizeMB}MB）...`, progress: 40 });

    const templateId =
      (Zotero.Prefs.get(
        `${config.prefsPrefix}.defaultTemplate`,
        true,
      ) as string) || "quick_summary";
    ztoolkit.log(`[GeminiZotero:Analyze] Using template: ${templateId}`);
    const { prompt, schema } = resolveTemplate(templateId);

    ztoolkit.log("[GeminiZotero:Analyze] Calling Gemini API...");
    const response = await client.analyzePdf(pdfData, prompt, schema);
    ztoolkit.log("[GeminiZotero:Analyze] API response received");

    await syncTagsFromStructuredOutput(item, response.text);

    progressWin.changeLine({
      text: "Gemini 响应已返回，正在保存笔记...",
      progress: 85,
    });

    // Save as note
    const autoSave = Zotero.Prefs.get(
      `${config.prefsPrefix}.autoSaveStructuredOutput`,
      true,
    ) as boolean;
    ztoolkit.log(`[GeminiZotero:Analyze] Auto-save enabled: ${autoSave}`);

    if (autoSave !== false) {
      await createNoteForItem(
        item,
        response.text,
        `Gemini 分析 - ${templateId}`,
        { templateId },
      );
      ztoolkit.log("[GeminiZotero:Analyze] Note saved");
    }

    progressWin.changeLine({
      text: "分析完成，已创建笔记",
      type: "success",
      progress: 100,
    });
    closeProgressWindowAfter(progressWin, 4000);
    ztoolkit.log("[GeminiZotero:Analyze] Analysis completed successfully");
  } catch (error: any) {
    ztoolkit.log(`[GeminiZotero:Analyze] ERROR: ${error.message}`);
    progressWin.changeLine({
      text: `失败: ${error.message}`,
      type: "fail",
      progress: 100,
    });
    closeProgressWindowAfter(progressWin, 6000);
  }
}

async function batchAnalyze(items: Zotero.Item[]) {
  ztoolkit.log(
    `[GeminiZotero:Batch] Starting batch analysis for ${items.length} items`,
  );

  const progressWin = new ztoolkit.ProgressWindow("Gemini 批量分析", {
    closeOnClick: false,
    closeTime: -1,
  })
    .createLine({
      text: `准备分析 ${items.length} 个条目...`,
      type: "default",
      progress: 0,
    })
    .show();

  const client = addon.getGeminiClient();
  if (!client) {
    ztoolkit.log("[GeminiZotero:Batch] ERROR: No API key configured");
    progressWin.changeLine({
      text: "请先配置 API Key",
      type: "fail",
      progress: 100,
    });
    closeProgressWindowAfter(progressWin, 4000);
    return;
  }

  const templateId =
    (Zotero.Prefs.get(
      `${config.prefsPrefix}.defaultTemplate`,
      true,
    ) as string) || "quick_summary";
  const { prompt, schema } = resolveTemplate(templateId);

  let successCount = 0;
  let failCount = 0;

  for (let i = 0; i < items.length; i++) {
    const item = items[i];
    const title = (item.getField("title") as string) || `条目 ${i + 1}`;
    const progress = ((i + 1) / items.length) * 100;

    ztoolkit.log(
      `[GeminiZotero:Batch] Processing item ${i + 1}/${items.length}: ${title}`,
    );

    progressWin.changeLine({
      text: `[${i + 1}/${items.length}] ${truncateText(title, 30)}`,
      progress,
    });

    try {
      const pdfData = await getPdfData(item);
      if (!pdfData) {
        ztoolkit.log(`[GeminiZotero:Batch] No PDF for item: ${item.id}`);
        failCount++;
        continue;
      }

      const pdfSizeMB = Math.round(pdfData.byteLength / 1024 / 1024 * 10) / 10;
      progressWin.changeLine({
        text: `[${i + 1}/${items.length}] ${truncateText(title, 25)}（${pdfSizeMB}MB）`,
        progress,
      });

      const response = await client.analyzePdf(pdfData, prompt, schema);
      await syncTagsFromStructuredOutput(item, response.text);
      await createNoteForItem(
        item,
        response.text,
        `Gemini 分析 - ${templateId}`,
        { templateId },
      );
      successCount++;
      ztoolkit.log(
        `[GeminiZotero:Batch] Item ${item.id} completed successfully`,
      );

      // Small delay to avoid rate limiting
      await Zotero.Promise.delay(500);
    } catch (error: any) {
      ztoolkit.log(
        `[GeminiZotero:Batch] ERROR on item ${item.id}: ${error.message}`,
      );
      failCount++;
    }
  }

  ztoolkit.log(
    `[GeminiZotero:Batch] Batch completed. Success: ${successCount}, Failed: ${failCount}`,
  );

  progressWin.changeLine({
    text: `完成! 成功: ${successCount}, 失败: ${failCount}`,
    type: failCount === 0 ? "success" : "default",
    progress: 100,
  });
  closeProgressWindowAfter(progressWin, 5000);
}

// getPdfData is now imported from ../../utils/pdfHelper

function resolveTemplate(templateId: string): {
  prompt: string;
  schema?: object;
} {
  const template =
    getTemplateById(templateId) || getTemplateById("quick_summary");
  return template || { prompt: "", schema: undefined };
}

function truncateText(text: string, maxLength: number): string {
  if (text.length <= maxLength) return text;
  return text.substring(0, maxLength) + "...";
}
