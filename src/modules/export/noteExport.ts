/**
 * Note Export Module
 * Exports conversation and analysis results to Zotero notes
 * Compatible with Better Notes plugin format
 */

import { marked } from "marked";
import { config } from "../../../package.json";
import { getTemplateById } from "../templates/builtinSchemas";

/**
 * Create a note attached to the specified item
 */
export async function createNoteForItem(
  parentItem: Zotero.Item,
  content: string,
  title: string = "Gemini 分析结果",
  options?: { templateId?: string },
): Promise<Zotero.Item> {
  const note = new Zotero.Item("note");
  note.libraryID = parentItem.libraryID;

  // Attach to parent item
  const parentID = parentItem.isAttachment()
    ? parentItem.parentItemID
    : parentItem.id;
  if (parentID) {
    note.parentItemID = parentID;
  }

  // Convert markdown to HTML
  const htmlContent = formatNoteContent(content, title, options?.templateId);
  note.setNote(htmlContent);

  await note.saveTx();

  ztoolkit.log(`Created note ${note.id} for item ${parentID}`);
  return note;
}

/**
 * Format content as HTML for Zotero note
 * Compatible with Better Notes plugin
 */
function formatNoteContent(
  content: string,
  title: string,
  templateId?: string,
): string {
  const timestamp = new Date().toLocaleString("zh-CN", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  });

  // Try to parse as JSON first (for structured output)
  let formattedContent: string;
  try {
    const jsonData = JSON.parse(content);
    formattedContent = renderStructuredOutput(jsonData, templateId);
  } catch {
    // Not JSON, treat as markdown/text
    formattedContent = markdownToHtml(content);
  }

  return `
<h1>${escapeHtml(title)}</h1>
<p><em>${config.addonName} 于 ${timestamp} 自动生成</em></p>
<hr/>
${formattedContent}
`.trim();
}

function renderStructuredOutput(data: any, templateId?: string): string {
  if (!templateId) {
    return formatJsonAsHtml(data);
  }

  const template = getTemplateById(templateId);
  if (!template) {
    return formatJsonAsHtml(data);
  }

  switch (templateId) {
    case "quick_summary":
      return renderQuickSummary(data);
    case "standard_analysis":
      return renderStandardAnalysis(data);
    case "deep_analysis":
      return renderDeepAnalysis(data);
    default:
      return formatJsonAsHtml(data);
  }
}

function renderSection(title: string, body: string): string {
  return `<h2>${escapeHtml(title)}</h2>${body}`;
}

function renderKeyValueList(
  entries: Record<string, string | undefined>,
): string {
  return `<ul>${Object.entries(entries)
    .filter(([, value]) => value)
    .map(
      ([key, value]) =>
        `<li><strong>${escapeHtml(key)}:</strong> ${escapeHtml(String(value))}</li>`,
    )
    .join("")}</ul>`;
}

function renderQuickSummary(data: any): string {
  const core = renderKeyValueList({
    一句话总结: data.core_content?.one_sentence_summary,
    核心结论: data.core_content?.main_conclusion,
    价值主张: data.core_content?.value_proposition,
  });

  const tags =
    Array.isArray(data.tags) && data.tags.length
      ? `<p>${data.tags.map((t: any) => escapeHtml(String(t))).join("，")}</p>`
      : "";

  return [
    renderSection("核心内容", core),
    tags ? renderSection("标签", tags) : "",
  ]
    .filter(Boolean)
    .join("\n");
}

function renderStandardAnalysis(data: any): string {
  const findings = Array.isArray(data.key_findings)
    ? `<ol>${data.key_findings
        .map(
          (item: any) =>
            `<li><strong>${escapeHtml(item?.point || "")}:</strong> ${escapeHtml(item?.explanation || "")}</li>`,
        )
        .join("")}</ol>`
    : "";

  const tags =
    Array.isArray(data.tags) && data.tags.length
      ? `<p>${data.tags.map((t: any) => escapeHtml(String(t))).join("，")}</p>`
      : "";

  return [
    renderSection(
      "综合摘要",
      `<p>${escapeHtml(data.executive_summary || "")}</p>`,
    ),
    renderSection(
      "问题陈述",
      renderKeyValueList({
        背景: data.problem_statement?.background,
        研究缺口: data.problem_statement?.gap,
      }),
    ),
    renderSection(
      "方法概览",
      `<p>${escapeHtml(data.methodology_overview || "")}</p>`,
    ),
    renderSection("核心发现", findings),
    renderSection(
      "文章结构",
      `<p>${escapeHtml(data.structure_outline || "")}</p>`,
    ),
    renderSection(
      "结论与启示",
      `<p>${escapeHtml(data.conclusion_and_implications || "")}</p>`,
    ),
    tags ? renderSection("标签", tags) : "",
  ]
    .filter(Boolean)
    .join("\n");
}

function renderDeepAnalysis(data: any): string {
  const stats = Array.isArray(data.data_extraction?.key_statistics)
    ? `<ul>${data.data_extraction.key_statistics.map((s: string) => `<li>${escapeHtml(s)}</li>`).join("")}</ul>`
    : "";
  const terms = Array.isArray(data.knowledge_base?.key_terms_definitions)
    ? `<ul>${data.knowledge_base.key_terms_definitions
        .map(
          (item: any) =>
            `<li><strong>${escapeHtml(item?.term || "")}:</strong> ${escapeHtml(item?.definition || "")}</li>`,
        )
        .join("")}</ul>`
    : "";
  const quotes = Array.isArray(data.knowledge_base?.notable_quotes)
    ? `<ul>${data.knowledge_base.notable_quotes
        .map(
          (item: any) =>
            `<li>"${escapeHtml(item?.quote || "")}" - ${escapeHtml(item?.page_location || "未知位置")}</li>`,
        )
        .join("")}</ul>`
    : "";

  const tags =
    Array.isArray(data.tags) && data.tags.length
      ? `<p>${data.tags.map((t: any) => escapeHtml(String(t))).join("，")}</p>`
      : "";

  return [
    renderSection(
      "综合解析",
      renderKeyValueList({
        文献综述: data.comprehensive_analysis?.context_review,
        方法细节: data.comprehensive_analysis?.detailed_methodology,
      }),
    ),
    renderSection(
      "数据提取",
      `<p>${escapeHtml(data.data_extraction?.description || "")}</p>${stats}<p>${escapeHtml(data.data_extraction?.tables_summary || "")}</p>`,
    ),
    renderSection(
      "批判性思考",
      renderKeyValueList({
        优势: data.critical_thinking?.strengths,
        局限: data.critical_thinking?.weaknesses_and_limitations,
        论证校验: data.critical_thinking?.verification,
      }),
    ),
    renderSection("知识库", `${terms}${quotes}`),
    renderSection(
      "研究应用建议",
      `<p>${escapeHtml(data.research_application || "")}</p>`,
    ),
    tags ? renderSection("标签", tags) : "",
  ]
    .filter(Boolean)
    .join("\n");
}

/**
 * Convert markdown to HTML
 */
function markdownToHtml(markdown: string): string {
  try {
    return marked.parse(markdown, { async: false }) as string;
  } catch {
    // Fallback: simple escaping with line breaks
    return `<pre>${escapeHtml(markdown)}</pre>`;
  }
}

/**
 * Format JSON object as readable HTML
 */
function formatJsonAsHtml(data: any, level: number = 2): string {
  if (typeof data !== "object" || data === null) {
    return `<p>${escapeHtml(String(data))}</p>`;
  }

  if (Array.isArray(data)) {
    const items = data.map(
      (item) =>
        `<li>${typeof item === "object" ? formatJsonAsHtml(item, level + 1) : escapeHtml(String(item))}</li>`,
    );
    return `<ul>${items.join("")}</ul>`;
  }

  const sections: string[] = [];
  for (const [key, value] of Object.entries(data)) {
    const heading = `h${Math.min(level, 6)}`;
    const label = formatKey(key);

    if (typeof value === "object" && value !== null) {
      sections.push(
        `<${heading}>${label}</${heading}>${formatJsonAsHtml(value, level + 1)}`,
      );
    } else if (Array.isArray(value)) {
      sections.push(
        `<${heading}>${label}</${heading}>${formatJsonAsHtml(value, level + 1)}`,
      );
    } else {
      sections.push(
        `<p><strong>${label}:</strong> ${escapeHtml(String(value))}</p>`,
      );
    }
  }

  return sections.join("\n");
}

/**
 * Format JSON key to readable label
 */
function formatKey(key: string): string {
  const keyMap: Record<string, string> = {
    title: "标题",
    authors: "作者",
    abstract: "摘要",
    background: "研究背景",
    methods: "研究方法",
    methodology: "方法论",
    results: "结果",
    conclusions: "结论",
    contributions: "主要贡献",
    limitations: "局限性",
    futureWork: "未来工作",
    keyInsights: "关键洞察",
    problemStatement: "问题定义",
    motivation: "研究动机",
    relatedWork: "相关工作",
    significance: "研究意义",
    criticalAnalysis: "批判性分析",
    publication: "发表刊物",
    year: "年份",
    approach: "方法",
    datasets: "数据集",
    evaluation: "评估",
  };

  return (
    keyMap[key] ||
    key.replace(/([A-Z])/g, " $1").replace(/^./, (s) => s.toUpperCase())
  );
}

/**
 * Export conversation as Markdown file
 */
export async function exportAsMarkdownFile(
  content: string,
  filename: string = "gemini-export.md",
): Promise<string | null> {
  // @ts-expect-error - Components classes not fully typed
  const fp = Components.classes["@mozilla.org/filepicker;1"].createInstance(
    Components.interfaces.nsIFilePicker,
  );

  const win = Zotero.getMainWindow();
  fp.init(win, "保存 Markdown 文件", fp.modeSave);
  fp.defaultString = filename;
  fp.appendFilter("Markdown Files", "*.md");

  const result = await new Promise<number>((resolve) => {
    fp.open((res: number) => resolve(res));
  });

  if (result !== fp.returnOK && result !== fp.returnReplace) {
    return null;
  }

  const path = fp.file?.path;
  if (!path) return null;

  // Add header
  const timestamp = new Date().toISOString().split("T")[0];
  const fullContent = `# ${config.addonName} Export\n\n*Exported on ${timestamp}*\n\n---\n\n${content}`;

  await IOUtils.writeUTF8(path, fullContent);

  new ztoolkit.ProgressWindow(config.addonName)
    .createLine({ text: `已保存至 ${path}`, type: "success" })
    .show();

  return path;
}

/**
 * Check if Better Notes plugin is installed
 */
export function isBetterNotesInstalled(): boolean {
  // @ts-expect-error - Better Notes global
  return typeof Zotero.BetterNotes !== "undefined";
}

/**
 * Escape HTML special characters
 */
function escapeHtml(text: string): string {
  const htmlEntities: Record<string, string> = {
    "&": "&amp;",
    "<": "&lt;",
    ">": "&gt;",
    '"': "&quot;",
    "'": "&#39;",
  };
  return text.replace(/[&<>"']/g, (char) => htmlEntities[char] || char);
}
