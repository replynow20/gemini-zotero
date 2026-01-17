/**
 * Reader Panel for Gemini PDF Analysis
 * Registers a custom section in the PDF Reader sidebar
 * 
 * ============================================================================
 * [NOTICE] This module is currently DISABLED.
 * 
 * The reader panel functionality has been replaced by the Collection Toolbar
 * button popup (see collectionToolbar.ts) which provides the same features
 * with a better user experience.
 * 
 * This code is preserved for potential future use, such as:
 * - In-reader sidebar features
 * - PDF-specific analysis tools
 * - Context-aware analysis based on current reading position
 * 
 * To re-enable: Uncomment the import and registration in hooks.ts
 * ============================================================================
 */

import { getString, getLocaleID } from "../../utils/locale";
import { config } from "../../../package.json";
import { clearHistory, saveMessage } from "../storage/historyStorage";
import { getTemplateById } from "../templates/builtinSchemas";
import { syncTagsFromStructuredOutput } from "../storage/tagSync";
import { closeProgressWindowAfter } from "../../utils/progressWindow";

const PANEL_STYLE_ID = "gemini-reader-panel-styles";

export function registerReaderPanel() {
  Zotero.ItemPaneManager.registerSection({
    paneID: "gemini-reader-panel",
    pluginID: config.addonID,
    header: {
      l10nID: getLocaleID("gemini-zotero-panel-header"),
      icon: `chrome://${config.addonRef}/content/icons/favicon@reader-small.png`,
    },
    sidenav: {
      l10nID: getLocaleID("gemini-zotero-panel-sidenav"),
      icon: `chrome://${config.addonRef}/content/icons/favicon@reader.png`,
    },
    // Enable for reader tabs and standard item panes only
    onItemChange: ({ item, tabType, setEnabled }) => {
      const disallowedTabs = new Set(["note", "betternotes"]);
      if (tabType && disallowedTabs.has(tabType)) {
        setEnabled(false);
        return false;
      }

      const isNote = item?.isNote?.() ?? false;
      const isReaderTab = tabType === "reader";
      const isPdfAttachment =
        item?.isAttachment?.() &&
        item.attachmentContentType === "application/pdf";
      const isRegularItem = item?.isRegularItem?.() ?? false;

      const shouldEnable =
        !!item &&
        !isNote &&
        ((isReaderTab && (isPdfAttachment || isRegularItem)) ||
          (!isReaderTab && isRegularItem));

      setEnabled(shouldEnable);
      return shouldEnable;
    },
    onRender: ({ body, item }) => {
      renderGeminiPanel(body, item);
    },
  });
}

function renderGeminiPanel(body: HTMLElement, item: Zotero.Item) {
  const doc = body.ownerDocument!;
  ensurePanelStyles(doc);

  // Clear existing content
  body.innerHTML = "";

  // Main container
  const container = doc.createElement("div");
  container.className = "gemini-panel-container";

  // Quick action buttons
  const actionsRow = doc.createElement("div");
  actionsRow.className = "gemini-panel-row gemini-panel-row--actions";

  const templateButtons = [
    "quick_summary",
    "standard_analysis",
    "deep_analysis",
  ].map((id) => {
    const template = getTemplateById(id);
    return {
      id,
      label: template?.nameZh || template?.name || id,
    };
  });

  templateButtons.forEach(({ id, label }) => {
    const btn = doc.createElement("button");
    btn.textContent = label;
    btn.dataset.templateId = id;
    btn.className = "gemini-panel-btn gemini-panel-btn--template";
    btn.title = label;
    btn.addEventListener("click", () => handleTemplateAnalysis(id, item));
    actionsRow.appendChild(btn);
  });

  container.appendChild(actionsRow);

  body.appendChild(container);
}

async function handleTemplateAnalysis(templateId: string, item: Zotero.Item) {
  const template = getTemplateById(templateId);
  const templateName = template?.nameZh || template?.name || templateId;

  const progressWin = new ztoolkit.ProgressWindow(config.addonName, {
    closeOnClick: false,
    closeTime: -1,
  })
    .createLine({
      text: `正在执行 ${templateName}...`,
      type: "default",
      progress: 5,
    })
    .show();

  try {
    const client = addon.getGeminiClient();
    if (!client) {
      progressWin.changeLine({
        text: getString("error-no-api-key") || "请先配置 API Key",
        type: "fail",
        progress: 100,
      });
      closeProgressWindowAfter(progressWin, 4000);
      return;
    }

    const pdfData = await getPdfData(item);
    if (!pdfData) {
      progressWin.changeLine({
        text: getString("error-no-pdf") || "未找到 PDF 附件",
        type: "fail",
        progress: 100,
      });
      closeProgressWindowAfter(progressWin, 4000);
      return;
    }

    const resolved = template || getTemplateById("quick_summary");
    const { prompt, schema } = resolved || { prompt: "", schema: undefined };
    const enforcedPrompt = `${prompt}\n\n重要：所有输出必须使用简体中文（必要的专有名词/缩写可保留原文）。`;
    progressWin.changeLine({
      text: `正在分析（${Math.round(pdfData.byteLength / 1024 / 1024)}MB）...`,
      type: "default",
      progress: 30,
    });

    clearHistory(item.id);
    const response = await client.analyzePdf(pdfData, enforcedPrompt, schema);
    await syncTagsFromStructuredOutput(item, response.text);

    await saveMessage(item.id, "user", `[${templateName}] 分析请求`);
    await saveMessage(item.id, "assistant", response.text);

    const { createNoteForItem } = await import("../export/noteExport");
    await createNoteForItem(item, response.text, `Gemini - ${templateName}`, {
      templateId,
    });

    progressWin.changeLine({
      text: `${templateName} 完成：已生成笔记并同步标签`,
      type: "success",
      progress: 100,
    });
    closeProgressWindowAfter(progressWin, 3000);
  } catch (error: any) {
    progressWin.changeLine({
      text: `分析失败：${error.message}`,
      type: "fail",
      progress: 100,
    });
    closeProgressWindowAfter(progressWin, 6000);
  }
}

async function getPdfData(item: Zotero.Item): Promise<ArrayBuffer | null> {
  if (item.isAttachment()) {
    if (item.attachmentContentType === "application/pdf") {
      const path = await item.getFilePathAsync();
      if (path) {
        const data = await IOUtils.read(path);
        return data.buffer as ArrayBuffer;
      }
    }
    return null;
  }

  const attachmentIDs = item.getAttachments();
  for (const id of attachmentIDs) {
    const attachment = Zotero.Items.get(id);
    if (attachment.attachmentContentType === "application/pdf") {
      const path = await attachment.getFilePathAsync();
      if (path) {
        const data = await IOUtils.read(path);
        return data.buffer as ArrayBuffer;
      }
    }
  }

  return null;
}

function ensurePanelStyles(doc: Document) {
  if (doc.getElementById(PANEL_STYLE_ID)) {
    return;
  }

  const style = doc.createElement("style");
  style.id = PANEL_STYLE_ID;
  style.textContent = `
        /* === Container & Layout === */
        .gemini-panel-container {
            padding: 14px;
            display: flex;
            flex-direction: column;
            gap: 8px;
            height: 100%;
            width: 100%;
            box-sizing: border-box;
            font-family: -apple-system, BlinkMacSystemFont, "SF Pro Text", "Segoe UI", Roboto, sans-serif;
            font-size: 13px;
            color: #1e293b;
            background: linear-gradient(180deg, #fafbfc 0%, #f8fafc 100%);
        }

        .gemini-panel-row {
            display: flex;
            gap: 8px;
            width: 100%;
            flex-wrap: wrap;
        }

        /* === Button Grid Layout === */
        .gemini-panel-row--actions,
        .gemini-panel-row--export {
            display: grid;
            grid-template-columns: repeat(auto-fit, minmax(96px, 1fr));
            gap: 6px;
            width: 100%;
        }

        /* === Base Button Styles === */
        .gemini-panel-btn {
            flex: 1;
            min-width: 0;
            padding: 4px 6px;
            border-radius: 12px;
            border: 1px solid #e2e8f0;
            background: linear-gradient(180deg, #ffffff 0%, #f8fafc 100%);
            font-size: 12px;
            font-weight: 600;
            cursor: pointer;
            white-space: normal;
            text-align: center;
            line-height: 1.25;
            word-break: break-word;
            overflow-wrap: anywhere;
            overflow: hidden;
            transition: all 0.2s cubic-bezier(0.4, 0, 0.2, 1);
            box-sizing: border-box;
            color: #475569;
            box-shadow: 0 1px 3px rgba(0, 0, 0, 0.04);
            display: inline-flex;
            align-items: center;
            justify-content: center;
        }

        .gemini-panel-btn--template {
            flex: 1 1 auto;
            border-radius: 12px;
        }

        .gemini-panel-btn:hover {
            background: linear-gradient(180deg, #f8fafc 0%, #f1f5f9 100%);
            border-color: #4285f4;
            color: #4285f4;
            box-shadow: 0 4px 12px rgba(66, 133, 244, 0.15);
            transform: translateY(-1px);
        }

        .gemini-panel-btn:active {
            transform: translateY(0);
            box-shadow: 0 1px 3px rgba(0, 0, 0, 0.08);
        }

        /* === Primary Button (Send) === */
        .gemini-panel-btn--primary {
            flex: 0 0 auto;
            min-width: auto;
            background: linear-gradient(135deg, #4285f4 0%, #1a73e8 100%);
            border: none;
            color: #fff;
            box-shadow: 0 4px 14px rgba(66, 133, 244, 0.35);
            display: flex;
            align-items: center;
            justify-content: center;
            padding: 0 14px;
            min-height: 32px;
            border-radius: 12px;
            font-size: 13px;
            font-weight: 600;
            letter-spacing: 0.3px;
        }

        .gemini-panel-btn--primary:hover {
            background: linear-gradient(135deg, #3b7cf4 0%, #1565d8 100%);
            box-shadow: 0 6px 20px rgba(66, 133, 244, 0.45);
            transform: translateY(-1px);
        }

        .gemini-panel-btn--primary:active {
            transform: translateY(0);
            box-shadow: 0 2px 8px rgba(66, 133, 244, 0.3);
        }

        /* === Ghost Button === */
        .gemini-panel-btn--ghost {
            background: transparent;
            border: 1px solid #e2e8f0;
            color: #64748b;
        }

        .gemini-panel-btn--ghost:hover {
            background: #f8fafc;
            border-color: #cbd5e1;
            color: #475569;
        }

        /* === Danger Button === */
        .gemini-panel-btn--danger {
            background: transparent;
            border: 1px solid #fecaca;
            color: #dc2626;
        }

        .gemini-panel-btn--danger:hover {
            background: #fef2f2;
            border-color: #fca5a5;
            color: #b91c1c;
        }

        /* === Input Area === */
        .gemini-panel-row--input {
            align-items: flex-end;
        }

        .gemini-panel-input {
            flex: 1;
            padding: 12px 14px;
            border: 1px solid #e2e8f0;
            border-radius: 12px;
            resize: none;
            min-height: 72px;
            font-size: 13px;
            line-height: 1.5;
            background: #ffffff;
            box-shadow: 0 1px 3px rgba(0, 0, 0, 0.03);
            transition: all 0.2s ease;
        }

        .gemini-panel-input:focus {
            outline: none;
            border-color: #4285f4;
            box-shadow: 0 0 0 3px rgba(66, 133, 244, 0.12);
        }

        .gemini-panel-input::placeholder {
            color: #94a3b8;
        }
    `;

  const target = doc.head ?? doc.documentElement ?? doc.body ?? doc;
  target.appendChild(style);
}
