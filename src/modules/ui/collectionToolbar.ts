/**
 * Item Toolbar Module (Controller)
 * Orchestrates the Plugin Popup UI using a component-based architecture.
 */

import { config } from "../../../package.json";
import { getString } from "../../utils/locale";
import {
    getTemplateById,
    getAllTemplates,
    getWorkflowTemplates,
    saveCustomTemplate,
    deleteCustomTemplate,
    DEFAULT_WORKFLOW_TEMPLATE,
    type StructuredTemplate
} from "../templates/builtinSchemas";
import { createNoteForItem } from "../export/noteExport";
import { syncTagsFromStructuredOutput } from "../storage/tagSync";
import { closeProgressWindowAfter } from "../../utils/progressWindow";
import { clearHistory, saveMessage } from "../storage/historyStorage";
import { getPdfData } from "../../utils/pdfHelper";


// UI Components
import { THEME } from "./theme";
import { createPopupHeader } from "./components/PopupHeader";
import { createSectionAnalysis } from "./components/SectionAnalysis";
import { createSectionChat } from "./components/SectionChat";
import { createSectionWorkflow } from "./components/SectionWorkflow";
import { createSectionVisualInsights } from "./components/SectionVisualInsights";
import { VisualInsightsManager, VisualStyle } from "../logic/VisualInsightsManager";

const TOOLBAR_BUTTON_ID = "geminizotero-collection-toolbar-button";

// Track the current popup window to prevent multiple instances
let currentPopupWindow: Window | null = null;

/**
 * Register the plugin button in the collection toolbar
 */
export function registerCollectionToolbarButton(win: _ZoteroTypes.MainWindow) {
    const doc = win.document;
    const toolbar = doc.getElementById("zotero-items-toolbar");

    if (!toolbar) {
        ztoolkit.log("[GeminiZotero] Item toolbar not found");
        return;
    }

    if (doc.getElementById(TOOLBAR_BUTTON_ID)) {
        return;
    }

    const btn = ztoolkit.UI.createElement(doc, "toolbarbutton", {
        attributes: {
            id: TOOLBAR_BUTTON_ID,
            label: "Gemini",
            tooltiptext: getString("toolbar-button-tooltip"),
            class: "zotero-toolbarbutton-1 chrome-class-toolbar-additional",
        },
        styles: {
            listStyleImage: `url('chrome://${config.addonRef}/content/icons/favicon-24.svg')`,
        },
        listeners: [
            {
                type: "command",
                listener: () => showPluginPopup(win),
            },
        ],
    });

    let insertBeforeElement: Element | null = null;
    for (let i = 0; i < toolbar.children.length; i++) {
        const child = toolbar.children[i];
        if (child.getAttribute("flex") === "1") {
            insertBeforeElement = child;
            break;
        }
    }

    if (insertBeforeElement) {
        toolbar.insertBefore(btn, insertBeforeElement);
    } else {
        toolbar.appendChild(btn);
    }
}

/**
 * Show the plugin popup dialog (Main Controller)
 */
async function showPluginPopup(win: _ZoteroTypes.MainWindow) {
    // Check if a popup is already open
    if (currentPopupWindow && !currentPopupWindow.closed) {
        // Focus the existing window instead of opening a new one
        currentPopupWindow.focus();
        return;
    }

    // =====================================================================
    // Get workflow templates and format them for the component
    // =====================================================================
    const getWorkflowTemplateItems = () => {
        return getWorkflowTemplates().map(t => ({
            id: t.id,
            name: t.nameZh || t.name,
            prompt: t.prompt,
            isBuiltin: !t.id.startsWith('custom_')
        }));
    };

    // =====================================================================
    // Business Logic Handlers
    // =====================================================================
    const handleClose = () => {
        dialog.window?.close();
    };

    const handleModeSelect = (modeId: string) => {
        // Save user's selected analysis mode to preferences
        // This mode will be used by the right-click menu "使用 Gemini 分析"
        Zotero.Prefs.set(`${config.prefsPrefix}.defaultTemplate`, modeId, true);
        ztoolkit.log(`[GeminiZotero:Analysis] Saved defaultTemplate: ${modeId}`);
    };

    const handleChatAsk = (question: string) => {
        if (!question.trim()) return;
        handleQuestionAnswer(question);
    };

    const handleWorkflowSave = (name: string, prompt: string, isNew: boolean, refreshCallback: (newTemplateId?: string) => void) => {
        if (!name || !prompt) {
            ztoolkit.getGlobal("alert")("请输入模板名称和分析指令");
            return;
        }

        if (isNew) {
            // Creating new template
            const newId = `custom_${Date.now()}`;
            saveCustomTemplate({
                id: newId,
                name: name,
                nameZh: name,
                description: "Custom workflow template",
                prompt: prompt,
                isWorkflowTemplate: true,
                schema: undefined
            });
            new ztoolkit.ProgressWindow(config.addonName)
                .createLine({ text: `模板 "${name}" 已保存`, type: "success" })
                .show();
            // Call refresh callback with new template ID
            refreshCallback(newId);
        } else {
            // Updating existing template - find by name
            const existing = getWorkflowTemplates().find(t => (t.nameZh || t.name) === name);
            if (existing && existing.id.startsWith('custom_')) {
                saveCustomTemplate({
                    ...existing,
                    prompt: prompt
                });
                new ztoolkit.ProgressWindow(config.addonName)
                    .createLine({ text: `模板 "${name}" 已更新`, type: "success" })
                    .show();
                refreshCallback();
            }
        }
    };

    const handleWorkflowRun = (prompt: string) => {
        if (!prompt.trim()) return;
        handleCustomAnalysis(prompt);
    };

    const handleWorkflowDelete = (templateId: string, refreshCallback: () => void) => {
        if (!templateId.startsWith('custom_')) {
            ztoolkit.getGlobal("alert")("内置模板不能删除");
            return;
        }

        // Delete directly - confirmation is handled by the UI component inline
        deleteCustomTemplate(templateId);
        new ztoolkit.ProgressWindow(config.addonName)
            .createLine({ text: "模板已删除", type: "success" })
            .show();
        refreshCallback();
    };


    const handleImport = () => importTemplates();
    const handleExport = () => exportTemplates();

    // Visual Insights handler
    const handleVisualGenerate = async (style: VisualStyle) => {
        ztoolkit.log(`[GeminiZotero:VisualInsights] handleVisualGenerate called with style: ${style}`);

        const items = ztoolkit.getGlobal("ZoteroPane").getSelectedItems();
        if (!items?.length) {
            new ztoolkit.ProgressWindow(config.addonName)
                .createLine({ text: getString("alert-select-item"), type: "fail" })
                .show();
            return;
        }

        const item = items[0];
        const progressWin = new ztoolkit.ProgressWindow(config.addonName, {
            closeOnClick: false,
            closeTime: -1,
        })
            .createLine({ text: "Step 1/3: Reading paper content...", type: "default", progress: 5 })
            .show();

        try {
            const client = addon.getGeminiClient();
            if (!client) {
                progressWin.changeLine({ text: getString("error-no-api-key"), type: "fail", progress: 100 });
                closeProgressWindowAfter(progressWin, 4000);
                return;
            }

            const pdfData = await getPdfData(item);
            if (!pdfData) {
                progressWin.changeLine({ text: getString("error-no-pdf"), type: "fail", progress: 100 });
                closeProgressWindowAfter(progressWin, 4000);
                return;
            }

            progressWin.changeLine({ text: "Step 2/3: Analyzing with Flash model...", type: "default", progress: 15 });

            const manager = new VisualInsightsManager(client);

            // Use progress callback for detailed updates
            const base64Image = await manager.generateInsight(pdfData, style, (step, progress) => {
                ztoolkit.log(`[GeminiZotero:VisualInsights] Progress: ${step} (${progress}%)`);
                if (progress < 60) {
                    progressWin.changeLine({ text: `Step 2/3: ${step}`, type: "default", progress });
                } else if (progress < 100) {
                    progressWin.changeLine({ text: `Step 3/3: ${step}`, type: "default", progress });
                }
            });

            ztoolkit.log(`[GeminiZotero:VisualInsights] Image generated, length: ${base64Image.length}`);

            progressWin.changeLine({ text: "Saving image...", type: "default", progress: 90 });
            ztoolkit.log(`[GeminiZotero:VisualInsights] Starting save process...`);

            // Save image as attachment
            await saveVisualAsAttachment(item, base64Image, style);

            progressWin.changeLine({ text: "Visual saved as attachment!", type: "success", progress: 100 });
            closeProgressWindowAfter(progressWin, 3000);

            ztoolkit.log(`[GeminiZotero:VisualInsights] Save completed successfully`);

        } catch (error: any) {
            ztoolkit.log(`[GeminiZotero:VisualInsights] Error: ${error.message}`);
            progressWin.changeLine({ text: `Error: ${error.message}`, type: "fail", progress: 100 });
            closeProgressWindowAfter(progressWin, 6000);
        }
    };


    // =====================================================================
    // Assemble UI Components - Auto-sizing approach
    // =====================================================================
    const dialog = new ztoolkit.Dialog(1, 1)
        .addCell(0, 0, {
            tag: "div",
            namespace: "html",
            styles: {
                width: "440px",
                display: "flex",
                flexDirection: "column",
                fontFamily: THEME.typography.fontFamily,
                backgroundColor: THEME.colors.bg.canvas,
                color: THEME.colors.text.primary,
                boxSizing: "border-box",
            },
            children: [
                // Header (always visible)
                createPopupHeader({ onClose: handleClose }),

                // Content sections (no wrapper, no scroll)
                createSectionAnalysis({ onModeSelect: handleModeSelect }),
                createSectionChat({ onAsk: handleChatAsk }),
                createSectionWorkflow({
                    onImport: handleImport,
                    onExport: handleExport,
                    onSave: handleWorkflowSave,
                    onRun: handleWorkflowRun,
                    onDelete: handleWorkflowDelete,
                    getTemplates: getWorkflowTemplateItems,
                    defaultTemplate: DEFAULT_WORKFLOW_TEMPLATE,
                }),
                createSectionVisualInsights({
                    onGenerate: handleVisualGenerate,
                }),
            ]
        })
        .open("Gemini-Zotero", {
            centerscreen: true,
            resizable: false,
        });

    // Store the window reference to prevent multiple popups
    currentPopupWindow = dialog.window;

    // Clear the reference when the window is closed
    if (dialog.window) {
        dialog.window.addEventListener("unload", () => {
            currentPopupWindow = null;
        });
    }

    // Let dialog use native Zotero window background (no manual override needed)
}




// =========================================================================================
// BUSINESS LOGIC HELPERS (Preserved from original file, simplified where possible)
// =========================================================================================

async function handleAnalysis(templateId: string) {
    const items = ztoolkit.getGlobal("ZoteroPane").getSelectedItems();
    if (!items?.length) {
        new ztoolkit.ProgressWindow(config.addonName)
            .createLine({ text: getString("alert-select-items"), type: "fail" })
            .show();
        return;
    }

    const template = getTemplateById(templateId);
    const templateName = template?.nameZh || templateId;

    for (const item of items) {
        await analyzeSingleItem(item, template!, templateName);
    }
}

async function handleQuestionAnswer(question: string) {
    const items = ztoolkit.getGlobal("ZoteroPane").getSelectedItems();
    if (!items?.length) {
        new ztoolkit.ProgressWindow(config.addonName)
            .createLine({ text: getString("alert-select-item"), type: "fail" })
            .show();
        return;
    }

    if (items.length > 1) {
        ztoolkit.getGlobal("alert")(getString("alert-qa-multi-select"));
    }

    const item = items[0]; // Use first selected item
    const progressWin = new ztoolkit.ProgressWindow(config.addonName, {
        closeOnClick: false,
        closeTime: -1,
    })
        .createLine({ text: getString("status-qa-processing"), type: "default", progress: 10 })
        .show();

    try {
        const client = addon.getGeminiClient();
        if (!client) {
            progressWin.changeLine({ text: getString("error-no-api-key"), type: "fail", progress: 100 });
            closeProgressWindowAfter(progressWin, 4000);
            return;
        }

        const pdfData = await getPdfData(item);
        if (!pdfData) {
            progressWin.changeLine({ text: getString("error-no-pdf"), type: "fail", progress: 100 });
            closeProgressWindowAfter(progressWin, 4000);
            return;
        }

        progressWin.changeLine({ text: getString("status-asking"), type: "default", progress: 40 });

        const prompt = `请根据这篇论文回答用户的问题。请用简体中文回答。\n\n用户问题：${question}`;
        const response = await client.analyzePdf(pdfData, prompt);

        // Create Q&A format note
        const noteContent = formatQANote(question, response.text);
        await createNoteForItem(item, noteContent, `Q&A: ${question.substring(0, 30)}...`);

        // Save to history
        await saveMessage(item.id, "user", question);
        await saveMessage(item.id, "assistant", response.text);

        progressWin.changeLine({ text: getString("status-qa-done"), type: "success", progress: 100 });
        closeProgressWindowAfter(progressWin, 3000);
    } catch (error: any) {
        progressWin.changeLine({ text: `错误：${error.message}`, type: "fail", progress: 100 });
        closeProgressWindowAfter(progressWin, 6000);
    }
}

async function handleCustomAnalysis(prompt: string) {
    const items = ztoolkit.getGlobal("ZoteroPane").getSelectedItems();
    if (!items?.length) {
        new ztoolkit.ProgressWindow(config.addonName)
            .createLine({ text: getString("alert-select-items"), type: "fail" })
            .show();
        return;
    }

    for (const item of items) {
        await analyzeSingleItemWithPrompt(item, prompt);
    }
}

async function analyzeSingleItem(item: Zotero.Item, template: StructuredTemplate, templateName: string) {
    const progressWin = new ztoolkit.ProgressWindow(config.addonName, {
        closeOnClick: false,
        closeTime: -1,
    })
        .createLine({ text: `正在执行 ${templateName}...`, type: "default", progress: 10 })
        .show();

    try {
        const client = addon.getGeminiClient();
        if (!client) {
            progressWin.changeLine({ text: getString("error-no-api-key"), type: "fail", progress: 100 });
            closeProgressWindowAfter(progressWin, 4000);
            return;
        }

        const pdfData = await getPdfData(item);
        if (!pdfData) {
            progressWin.changeLine({ text: getString("error-no-pdf"), type: "fail", progress: 100 });
            closeProgressWindowAfter(progressWin, 4000);
            return;
        }

        progressWin.changeLine({
            text: `正在分析（${Math.round(pdfData.byteLength / 1024 / 1024)}MB）...`,
            type: "default",
            progress: 30,
        });

        const enforcedPrompt = `${template?.prompt || ""}\n\n重要：所有输出必须使用简体中文（必要的专有名词/缩写可保留原文）。`;
        await clearHistory(item.id);
        const response = await client.analyzePdf(pdfData, enforcedPrompt, template?.schema);

        await syncTagsFromStructuredOutput(item, response.text);
        await saveMessage(item.id, "user", `[${templateName}] 分析请求`);
        await saveMessage(item.id, "assistant", response.text);

        await createNoteForItem(item, response.text, `Gemini - ${templateName}`, {
            templateId: template?.id,
        });

        progressWin.changeLine({
            text: `${templateName} 完成：已生成笔记`,
            type: "success",
            progress: 100,
        });
        closeProgressWindowAfter(progressWin, 3000);
    } catch (error: any) {
        progressWin.changeLine({ text: `分析失败：${error.message}`, type: "fail", progress: 100 });
        closeProgressWindowAfter(progressWin, 6000);
    }
}

async function analyzeSingleItemWithPrompt(item: Zotero.Item, prompt: string) {
    const progressWin = new ztoolkit.ProgressWindow(config.addonName, {
        closeOnClick: false,
        closeTime: -1,
    })
        .createLine({ text: "正在执行自定义分析...", type: "default", progress: 10 })
        .show();

    try {
        const client = addon.getGeminiClient();
        if (!client) {
            progressWin.changeLine({ text: getString("error-no-api-key"), type: "fail", progress: 100 });
            closeProgressWindowAfter(progressWin, 4000);
            return;
        }

        const pdfData = await getPdfData(item);
        if (!pdfData) {
            progressWin.changeLine({ text: getString("error-no-pdf"), type: "fail", progress: 100 });
            closeProgressWindowAfter(progressWin, 4000);
            return;
        }

        progressWin.changeLine({
            text: `正在分析（${Math.round(pdfData.byteLength / 1024 / 1024)}MB）...`,
            type: "default",
            progress: 30,
        });

        const enforcedPrompt = `${prompt}\n\n重要：所有输出必须使用简体中文（必要的专有名词/缩写可保留原文）。`;
        const response = await client.analyzePdf(pdfData, enforcedPrompt);

        await saveMessage(item.id, "user", `[自定义分析] ${prompt.substring(0, 30)}...`);
        await saveMessage(item.id, "assistant", response.text);

        await createNoteForItem(item, response.text, "Gemini - 自定义分析");

        progressWin.changeLine({
            text: "自定义分析完成：已生成笔记",
            type: "success",
            progress: 100,
        });
        closeProgressWindowAfter(progressWin, 3000);
    } catch (error: any) {
        progressWin.changeLine({ text: `分析失败：${error.message}`, type: "fail", progress: 100 });
        closeProgressWindowAfter(progressWin, 6000);
    }
}

function formatQANote(question: string, answer: string): string {
    return `## 问答记录

**问题**: ${question}

**答案**: 

${answer}

---
*由 Gemini Zotero 插件生成*`;
}

// getPdfData is now imported from ../../utils/pdfHelper

async function exportTemplates() {
    const templates = getAllTemplates().filter(t => t.id.startsWith("custom_"));

    if (templates.length === 0) {
        new ztoolkit.ProgressWindow(config.addonName)
            .createLine({ text: "没有自定义模板可导出", type: "default" })
            .show();
        return;
    }

    // @ts-expect-error - FilePicker class not fully typed
    const fp = Components.classes["@mozilla.org/filepicker;1"].createInstance(
        Components.interfaces.nsIFilePicker
    );

    const win = Zotero.getMainWindow();
    fp.init(win, getString("dialog-export-title"), fp.modeSave);
    fp.defaultString = "gemini-templates.json";
    fp.appendFilter("JSON Files", "*.json");

    const result = await new Promise<number>((resolve) => {
        fp.open((res: number) => resolve(res));
    });

    if (result !== fp.returnOK && result !== fp.returnReplace) {
        return;
    }

    const path = fp.file?.path;
    if (!path) return;

    await IOUtils.writeUTF8(path, JSON.stringify(templates, null, 2));

    new ztoolkit.ProgressWindow(config.addonName)
        .createLine({ text: `已导出 ${templates.length} 个模板`, type: "success" })
        .show();
}

async function importTemplates() {
    // @ts-expect-error - FilePicker class not fully typed
    const fp = Components.classes["@mozilla.org/filepicker;1"].createInstance(
        Components.interfaces.nsIFilePicker
    );

    const win = Zotero.getMainWindow();
    fp.init(win, getString("dialog-import-title"), fp.modeOpen);
    fp.appendFilter("JSON Files", "*.json");

    const result = await new Promise<number>((resolve) => {
        fp.open((res: number) => resolve(res));
    });

    if (result !== fp.returnOK) {
        return;
    }

    const path = fp.file?.path;
    if (!path) return;

    try {
        const content = await IOUtils.readUTF8(path);
        const templates = JSON.parse(content) as StructuredTemplate[];

        let importCount = 0;
        for (const template of templates) {
            if (template.id && template.nameZh && template.prompt) {
                saveCustomTemplate({
                    ...template,
                    id: `custom_${Date.now()}_${importCount}`, // Ensure unique ID
                });
                importCount++;
            }
        }

        new ztoolkit.ProgressWindow(config.addonName)
            .createLine({ text: `已导入 ${importCount} 个模板`, type: "success" })
            .show();
    } catch (error: any) {
        new ztoolkit.ProgressWindow(config.addonName)
            .createLine({ text: `导入失败：${error.message}`, type: "fail" })
            .show();
    }
}

/**
 * Save generated visual as PNG attachment to the item
 */
async function saveVisualAsAttachment(
    item: Zotero.Item,
    base64Data: string,
    style: string
): Promise<Zotero.Item> {
    ztoolkit.log(`[GeminiZotero:VisualInsights:Save] Starting, item=${item.id}, dataLength=${base64Data.length}`);

    // Get parent item ID
    const parentID = item.isAttachment() ? item.parentItemID : item.id;
    if (!parentID) {
        throw new Error("Cannot find parent item");
    }
    ztoolkit.log(`[GeminiZotero:VisualInsights:Save] parentID=${parentID}`);

    // Create temp file path
    const timestamp = new Date().toISOString().replace(/[:.]/g, "-").slice(0, 19);
    const filename = `Gemini-Visual-${style}-${timestamp}.png`;
    const tempDir = Zotero.getTempDirectory().path;
    const tempPath = PathUtils.join(tempDir, filename);
    ztoolkit.log(`[GeminiZotero:VisualInsights:Save] tempPath=${tempPath}`);

    // Convert base64 to Uint8Array
    ztoolkit.log(`[GeminiZotero:VisualInsights:Save] Converting base64...`);
    const binaryString = atob(base64Data);
    const bytes = new Uint8Array(binaryString.length);
    for (let i = 0; i < binaryString.length; i++) {
        bytes[i] = binaryString.charCodeAt(i);
    }
    ztoolkit.log(`[GeminiZotero:VisualInsights:Save] Converted to ${bytes.length} bytes`);

    // Write to temp file
    ztoolkit.log(`[GeminiZotero:VisualInsights:Save] Writing to temp file...`);
    await IOUtils.write(tempPath, bytes);
    ztoolkit.log(`[GeminiZotero:VisualInsights:Save] File written successfully`);

    // Import as attachment
    ztoolkit.log(`[GeminiZotero:VisualInsights:Save] Importing as attachment...`);
    const attachment = await Zotero.Attachments.importFromFile({
        file: tempPath,
        parentItemID: parentID,
        title: `Gemini Visual - ${style}`,
    });
    ztoolkit.log(`[GeminiZotero:VisualInsights:Save] Attachment created: ${attachment?.id}`);

    // Clean up temp file
    try {
        await IOUtils.remove(tempPath);
        ztoolkit.log(`[GeminiZotero:VisualInsights:Save] Temp file cleaned up`);
    } catch (e) {
        ztoolkit.log(`[GeminiZotero:VisualInsights:Save] Cleanup error (ignored): ${e}`);
    }

    return attachment;
}
