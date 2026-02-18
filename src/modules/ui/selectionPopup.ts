/**
 * PDF Selection Popup Handler
 * Adds "Ask Gemini" button to text selection popup in PDF Reader
 */

import { config } from "../../../package.json";
import { saveMessage } from "../storage/historyStorage";
import { closeProgressWindowAfter } from "../../utils/progressWindow";
import { truncateText } from "../../utils/text";

const SELECTION_EVENT = "renderTextSelectionPopup";
let selectionHandlerRegistered = false;

export function registerSelectionHandler() {
  // Check if Reader API exists
  if (
    !Zotero.Reader ||
    typeof Zotero.Reader.registerEventListener !== "function"
  ) {
    ztoolkit.log("Zotero.Reader.registerEventListener not available");
    return;
  }

  if (selectionHandlerRegistered) {
    ztoolkit.log("Selection handler already registered");
    return;
  }

  try {
    // Register handler for text selection popup in PDF reader
    Zotero.Reader.registerEventListener(
      SELECTION_EVENT,
      handleTextSelectionPopup,
      config.addonID,
    );
    selectionHandlerRegistered = true;
    ztoolkit.log("Selection handler registered");
  } catch (e) {
    ztoolkit.log("Failed to register selection handler:", e);
  }
}

export function unregisterSelectionHandler() {
  if (
    !selectionHandlerRegistered ||
    !Zotero.Reader ||
    typeof Zotero.Reader.unregisterEventListener !== "function"
  ) {
    return;
  }

  try {
    Zotero.Reader.unregisterEventListener(
      SELECTION_EVENT,
      handleTextSelectionPopup,
    );
    selectionHandlerRegistered = false;
    ztoolkit.log("Selection handler unregistered");
  } catch (e) {
    ztoolkit.log("Failed to unregister selection handler:", e);
  }
}

function handleTextSelectionPopup(event: {
  reader: any;
  doc: Document;
  params: { annotation?: { text: string } };
  append: (element: HTMLElement) => void;
}) {
  try {
    const { reader, doc, params, append } = event;
    const selectedText = params.annotation?.text;

    if (!selectedText || selectedText.trim().length === 0) {
      return;
    }

    // Create container for Gemini button
    const container = doc.createElement("div");
    container.style.cssText = "display: flex; gap: 4px; padding: 4px 0;";

    // Ask Gemini button
    const askBtn = doc.createElement("button");
    // NOTE: resource://zotero/reader/reader.html is not allowed to load chrome://... icons.
    // Inline the SVG so it renders reliably in the reader document.
    const icon = createSelectionIcon(doc);

    const label = doc.createElement("span");
    label.textContent = "Ask Gemini";
    label.style.cssText = "display:block; line-height: 1;";

    askBtn.appendChild(icon);
    askBtn.appendChild(label);
    askBtn.style.cssText = `
      display: inline-flex;
      align-items: center;
      gap: 6px;
      padding: 4px 8px;
      border: 1px solid #cbd5e1;
      border-radius: 6px;
      background: #fff;
      cursor: pointer;
      font: 12px -apple-system, BlinkMacSystemFont, "SF Pro Text", "Segoe UI", Roboto, sans-serif;
      line-height: 1;
      white-space: nowrap;
      color: #111827;
      vertical-align: middle;
      -moz-appearance: none;
    `;
    askBtn.addEventListener("mouseenter", () => {
      askBtn.style.background = "#f8fafc";
    });
    askBtn.addEventListener("mouseleave", () => {
      askBtn.style.background = "#fff";
    });
    askBtn.addEventListener("click", () => {
      openQuickAskDialog(reader, selectedText);
    });

    container.appendChild(askBtn);
    append(container);
  } catch (e) {
    ztoolkit.log("Error in handleTextSelectionPopup:", e);
  }
}

function createSelectionIcon(doc: Document): SVGSVGElement {
  const icon = doc.createElementNS(
    "http://www.w3.org/2000/svg",
    "svg",
  ) as unknown as SVGSVGElement;
  icon.setAttribute("viewBox", "0 0 316.6 317.1");
  icon.setAttribute("width", "14");
  icon.setAttribute("height", "14");
  icon.setAttribute("aria-hidden", "true");
  icon.setAttribute("preserveAspectRatio", "xMidYMid meet");
  icon.style.cssText = "display:block; flex:0 0 auto;";

  // Inline contents from addon/content/icons/favicon-sele.svg
  // Use unique IDs to avoid collisions if multiple popups are rendered.
  const uid = `gemini-sele-${Math.random().toString(36).slice(2, 8)}`;
  let markup = `<defs><style>.e{fill:url(#c);}.f{fill:url(#d);}.g{fill:url(#b);}</style><linearGradient id="b" x1="18.7" y1="56.6" x2="101.7" y2="56.6" gradientUnits="userSpaceOnUse"><stop offset="0" stop-color="#223997"></stop><stop offset=".5" stop-color="#6958e2"></stop><stop offset="1" stop-color="#539de9"></stop></linearGradient><linearGradient id="c" x1="0" y1="158.6" x2="316.6" y2="158.6" gradientUnits="userSpaceOnUse"><stop offset="0" stop-color="#223997"></stop><stop offset=".5" stop-color="#6958e2"></stop><stop offset="1" stop-color="#539de9"></stop></linearGradient><linearGradient id="d" x1="206.2" y1="255.1" x2="299" y2="255.1" gradientUnits="userSpaceOnUse"><stop offset="0" stop-color="#223997"></stop><stop offset=".5" stop-color="#6958e2"></stop><stop offset="1" stop-color="#539de9"></stop></linearGradient></defs><path class="g" d="M18.7,22.5l7.6,10.4s4.5-7,13.3-5.8,14.9,4.8,21.9,5.8,11.1,0,11.1,0l-51.1,56,6.8,9.5s14.1-9.5,26.9-5.4c12.8,4.1,34.3,13.1,46.3-2.2l-7.4-10.5s-3.4,6.5-13.8,5.9-5.3-.9-7.8-1.9-8.1-3.2-13.1-3.7c-7.5-.8-12.2.5-12.2.5l51.7-57.6-7.7-9.5s-11.5,11.5-31.1,4.8-30-5.4-41.5,3.8Z"></path><polygon class="e" points="158.3 317.1 187.5 187.5 316.6 158.3 188 127.5 158.3 0 128.6 127.5 0 158.3 129.1 187.5 158.3 317.1"></polygon><polygon class="f" points="252.6 301.6 261.2 263.6 299 255 261.3 246 252.6 208.6 243.9 246 206.2 255 244.1 263.6 252.6 301.6"></polygon>`;
  markup = markup
    .replaceAll('id="b"', `id="${uid}-b"`)
    .replaceAll('id="c"', `id="${uid}-c"`)
    .replaceAll('id="d"', `id="${uid}-d"`)
    .replaceAll("url(#b)", `url(#${uid}-b)`)
    .replaceAll("url(#c)", `url(#${uid}-c)`)
    .replaceAll("url(#d)", `url(#${uid}-d)`);

  // innerHTML on SVG is fine in Gecko; keep TS happy with `any`
  (icon as any).innerHTML = markup;
  return icon;
}

async function openQuickAskDialog(reader: any, selectedText: string) {
  try {
    const question = await showPromptDialog(
      "关于选中文本的问题",
      "请输入您想问的问题：",
      `关于 "${truncateText(selectedText, 50)}" ...`,
    );

    if (!question) return;

    // Get the parent item for the reader
    const itemID = reader.itemID;
    const item = Zotero.Items.get(itemID);

    if (!item) {
      showAlert("错误", "无法获取当前文档信息");
      return;
    }

    // Show processing dialog
    const progressWin = new ztoolkit.ProgressWindow("Gemini Zotero", {
      closeOnClick: false,
      closeTime: -1,
    })
      .createLine({ text: "正在准备问答...", type: "default", progress: 5 })
      .show();

    try {
      const client = addon.getGeminiClient();
      if (!client) {
        progressWin.changeLine({
          text: "请先配置 API Key",
          type: "fail",
          progress: 100,
        });
        closeProgressWindowAfter(progressWin, 4000);
        return;
      }

      progressWin.changeLine({
        text: `正在分析：${truncateText(question, 20)}`,
        type: "default",
        progress: 30,
      });

      const prompt = `用户在阅读论文时选中了以下文本：

"${selectedText}"

用户问题：${question}

请基于选中的文本内容，用中文回答用户的问题。如果需要，可以结合你对该领域的了解进行解释。`;

      const response = await client.chat(prompt);

      progressWin.changeLine({
        text: "回答完成",
        type: "success",
        progress: 100,
      });
      closeProgressWindowAfter(progressWin, 4000);

      // Show result dialog
      showResultDialog("Gemini 回答", response.text);

      await saveMessage(
        itemID,
        "user",
        `[选区问答] ${question}\n\n选中文本: ${selectedText}`,
      );
      await saveMessage(itemID, "assistant", response.text);
    } catch (error: any) {
      progressWin.changeLine({
        text: `失败: ${error.message}`,
        type: "fail",
        progress: 100,
      });
      closeProgressWindowAfter(progressWin, 6000);
    }
  } catch (e) {
    ztoolkit.log("Error in openQuickAskDialog:", e);
  }
}

async function showPromptDialog(
  title: string,
  message: string,
  defaultValue: string = "",
): Promise<string | null> {
  try {
    const prompt = { value: defaultValue };
    const result = Services.prompt.prompt(
      null,
      title,
      message,
      prompt,
      null,
      {},
    );
    return result ? prompt.value : null;
  } catch (e) {
    ztoolkit.log("Error in showPromptDialog:", e);
    return null;
  }
}

function showAlert(title: string, message: string) {
  try {
    Services.prompt.alert(null, title, message);
  } catch (e) {
    ztoolkit.log("Error in showAlert:", e);
  }
}

function showResultDialog(title: string, content: string) {
  try {
    // Create a dialog to show the result
    const dialog = (addon.data.dialog = new ztoolkit.Dialog(2, 1));

    dialog
      .setDialogData({ content })
      .addCell(0, 0, {
        tag: "div",
        namespace: "html",
        styles: {
          maxWidth: "600px",
          maxHeight: "400px",
          overflow: "auto",
          padding: "10px",
          whiteSpace: "pre-wrap",
          wordBreak: "break-word",
          fontSize: "14px",
          lineHeight: "1.6",
        },
        properties: {
          textContent: content,
        },
      })
      .addButton("复制", "copy")
      .addButton("关闭", "close")
      .open(title, {
        centerscreen: true,
        resizable: true,
        width: 650,
        height: 450,
      });

    dialog.window?.addEventListener("dialogaccept", async () => {
      try {
        // Copy to clipboard using Zotero's utility
        Zotero.Utilities.Internal.copyTextToClipboard(content);
        new ztoolkit.ProgressWindow("Gemini Zotero")
          .createLine({ text: "已复制到剪贴板", type: "success" })
          .show();
      } catch (e) {
        ztoolkit.log("Error copying to clipboard:", e);
      }
    });
  } catch (e) {
    ztoolkit.log("Error in showResultDialog:", e);
  }
}

