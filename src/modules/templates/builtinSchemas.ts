/**
 * Built-in Structured Output Templates
 * Predefined JSON schemas for different analysis depths
 */

import { config } from "../../../package.json";

export interface StructuredTemplate {
  id: string;
  name: string;
  nameZh: string;
  description: string;
  prompt: string;
  schema?: object;
  isWorkflowTemplate?: boolean; // true for workflow templates, undefined/false for analysis modes
}

export const BUILTIN_TEMPLATES: StructuredTemplate[] = [
  {
    id: "quick_summary",
    name: "Quick Summary",
    nameZh: "快速摘要",
    description: "结论导向，控制在 300 字以内，并输出关键词标签",
    prompt: `只提取最核心的结论与价值主张，忽略论证过程和细节，字数控制在 300 字以内。必须严格按照 JSON schema 输出，并在 tags 字段列出 4-10 个可直接复用的关键词标签（不带 # 或其它符号）。所有字段值必须使用简体中文（必要的专有名词/缩写可保留原文）。`,
    schema: {
      type: "object",
      properties: {
        core_content: {
          type: "object",
          properties: {
            one_sentence_summary: {
              type: "string",
              description: "一句话概括主要发现",
            },
            main_conclusion: {
              type: "string",
              description: "作者最终结论（不含过程）",
            },
            value_proposition: {
              type: "string",
              description: "文章的最大价值或创新点",
            },
          },
          required: [
            "one_sentence_summary",
            "main_conclusion",
            "value_proposition",
          ],
        },
        tags: {
          type: "array",
          description: "4-10 个可直接作为 Zotero 标签的关键词",
          minItems: 4,
          maxItems: 10,
          items: { type: "string" },
        },
      },
      required: ["core_content", "tags"],
    },
  },
  {
    id: "standard_analysis",
    name: "Standard Reading",
    nameZh: "标准阅读",
    description: "覆盖文章起承转合，阐释作者如何论证，并输出标签",
    prompt: `提供一份逻辑严密的完整摘要，重点讲清楚作者如何论证。请严格按照 JSON schema 输出，并在 tags 字段列出 4-10 个可复用的主题标签（不带 # 或其它符号）。所有字段值必须使用简体中文（必要的专有名词/缩写可保留原文）。`,
    schema: {
      type: "object",
      properties: {
        executive_summary: {
          type: "string",
          description: "500 字左右综合摘要",
        },
        problem_statement: {
          type: "object",
          properties: {
            background: {
              type: "string",
              description: "文章要解决的背景/问题",
            },
            gap: { type: "string", description: "现有研究的不足" },
          },
          required: ["background", "gap"],
        },
        methodology_overview: {
          type: "string",
          description: "研究方法/实验设计/数据来源",
        },
        key_findings: {
          type: "array",
          description: "核心发现列表，至少包含 1 条",
          items: {
            type: "object",
            properties: {
              point: { type: "string", description: "发现点" },
              explanation: { type: "string", description: "解释/论据" },
            },
            required: ["point", "explanation"],
          },
          minItems: 1,
        },
        structure_outline: { type: "string", description: "章节结构梳理" },
        conclusion_and_implications: {
          type: "string",
          description: "最终结论及领域启示",
        },
        tags: {
          type: "array",
          description: "4-10 个可直接作为 Zotero 标签的关键词",
          minItems: 4,
          maxItems: 10,
          items: { type: "string" },
        },
      },
      required: [
        "executive_summary",
        "problem_statement",
        "methodology_overview",
        "key_findings",
        "structure_outline",
        "conclusion_and_implications",
        "tags",
      ],
    },
  },
  {
    id: "deep_analysis",
    name: "Deep Analysis",
    nameZh: "深度分析",
    description: "专家级解析，包含数据、引用、标签与批判性思考",
    prompt: `作为专家级研究员进行深度解析，必须包含具体数据、引用和批判性思考，并在 tags 字段列出 4-10 个主题标签（不带 # 或其它符号）。输出需满足 JSON schema。所有字段值必须使用简体中文（必要的专有名词/缩写可保留原文）。`,
    schema: {
      type: "object",
      properties: {
        comprehensive_analysis: {
          type: "object",
          properties: {
            context_review: {
              type: "string",
              description: "文献综述背景与引用理论",
            },
            detailed_methodology: {
              type: "string",
              description: "技术细节/参数/样本等",
            },
          },
          required: ["context_review", "detailed_methodology"],
        },
        data_extraction: {
          type: "object",
          properties: {
            description: {
              type: "string",
              description: "关键统计数据或实验结果概述",
            },
            key_statistics: {
              type: "array",
              items: { type: "string" },
              description: "关键数据列表（如准确率、p 值等）",
            },
            tables_summary: {
              type: "string",
              description: "主要图表的文字化解读",
            },
          },
          required: ["description", "key_statistics", "tables_summary"],
        },
        critical_thinking: {
          type: "object",
          properties: {
            strengths: { type: "string", description: "具体优势" },
            weaknesses_and_limitations: {
              type: "string",
              description: "局限性/偏差",
            },
            verification: { type: "string", description: "逻辑与证据是否自洽" },
          },
          required: ["strengths", "weaknesses_and_limitations", "verification"],
        },
        knowledge_base: {
          type: "object",
          properties: {
            key_terms_definitions: {
              type: "array",
              items: {
                type: "object",
                properties: {
                  term: { type: "string" },
                  definition: { type: "string" },
                },
                required: ["term", "definition"],
              },
              description: "关键术语及定义",
            },
            notable_quotes: {
              type: "array",
              items: {
                type: "object",
                properties: {
                  quote: { type: "string" },
                  page_location: { type: "string" },
                },
                required: ["quote", "page_location"],
              },
              description: "精彩引用与大概位置",
            },
          },
          required: ["key_terms_definitions", "notable_quotes"],
        },
        research_application: {
          type: "string",
          description: "未来研究或应用建议",
        },
        tags: {
          type: "array",
          description: "4-10 个可直接作为 Zotero 标签的关键词",
          minItems: 4,
          maxItems: 10,
          items: { type: "string" },
        },
      },
      required: [
        "comprehensive_analysis",
        "data_extraction",
        "critical_thinking",
        "knowledge_base",
        "research_application",
        "tags",
      ],
    },
  },
];

/**
 * Built-in Workflow Templates
 * These are specialized templates for custom workflow analysis
 */
export const BUILTIN_WORKFLOW_TEMPLATES: StructuredTemplate[] = [
  {
    id: "workflow_formula",
    name: "Formula Extraction",
    nameZh: "公式提取与讲解",
    description: "提取并详细讲解论文中所有数学公式、方程和推导过程",
    isWorkflowTemplate: true,
    prompt: `请仔细阅读这篇论文，提取并讲解其中的所有数学公式和推导过程。

对于每个重要公式，请提供：
1. **公式本身**（使用 LaTeX 格式呈现）
2. **公式的物理/数学含义**
3. **各变量/符号的定义**
4. **公式的推导背景或来源**
5. **在论文中的应用场景**

请按照公式在论文中出现的顺序组织，并标注大致页码位置。

如果论文中没有数学公式，请说明这一点并概述论文的主要方法论。`,
  },
  {
    id: "workflow_charts",
    name: "Chart & Figure Analysis",
    nameZh: "图表深度解读",
    description: "深度分析论文中所有图表、图像和可视化内容",
    isWorkflowTemplate: true,
    prompt: `请仔细阅读这篇论文中的所有图表（包括图片、表格、流程图、示意图等），并提供深度解读。

对于每个图表，请提供：
1. **图表编号和标题**
2. **图表类型**（柱状图/折线图/热力图/流程图/表格/示意图等）
3. **展示的核心数据或信息**
4. **关键发现和洞察**
5. **与论文核心论点的关联**
6. **可能存在的局限性或需注意的点**

请按照图表在论文中出现的顺序组织。

最后，总结这些图表如何共同支撑了论文的主要结论。`,
  },
];

/**
 * Default template for new custom workflows
 */
export const DEFAULT_WORKFLOW_TEMPLATE = `# 自定义分析模板

请根据以下结构分析这篇论文。您可以根据需要删除不需要的部分，或添加自己的分析维度。

## 基本信息提取
- 论文标题、作者、发表年份
- 研究领域和关键词
- 摘要概述

## 研究问题与背景
- 研究要解决的核心问题是什么？
- 现有研究的不足之处（研究空白）
- 本研究的创新点和贡献

## 研究方法
- 使用的研究方法（实验/调查/理论推导/案例分析等）
- 数据来源和样本描述
- 分析工具和技术

## 核心发现
- 主要研究结果（按重要性排序）
- 关键数据和统计指标
- 图表解读

## 结论与启示
- 作者的最终结论
- 对领域的贡献和影响
- 研究局限性
- 未来研究方向建议

## 我的笔记
（可添加个人思考、与其他文献的联系等）

---
**提示**：
- 所有输出请使用简体中文
- 重要术语可保留英文原文
- 请引用论文中的具体数据或页码来支持分析`;

/**
 * Get template by ID (searches both analysis templates and workflow templates)
 */
export function getTemplateById(id: string): StructuredTemplate | undefined {
  return (
    BUILTIN_TEMPLATES.find((t) => t.id === id) ||
    BUILTIN_WORKFLOW_TEMPLATES.find((t) => t.id === id) ||
    getCustomTemplates().find((t) => t.id === id)
  );
}

/**
 * Get all available templates (builtin analysis + builtin workflow + custom)
 */
export function getAllTemplates(): StructuredTemplate[] {
  const customTemplates = getCustomTemplates();
  return [...BUILTIN_TEMPLATES, ...BUILTIN_WORKFLOW_TEMPLATES, ...customTemplates];
}

/**
 * Get all workflow templates (builtin workflow + custom workflow templates)
 */
export function getWorkflowTemplates(): StructuredTemplate[] {
  const customTemplates = getCustomTemplates().filter(t => t.isWorkflowTemplate);
  return [...BUILTIN_WORKFLOW_TEMPLATES, ...customTemplates];
}

/**
 * Get all analysis mode templates (only the 3 builtin analysis modes)
 */
export function getAnalysisTemplates(): StructuredTemplate[] {
  return BUILTIN_TEMPLATES;
}

/**
 * Get custom templates from preferences
 */
const CUSTOM_TEMPLATE_PREF = `${config.prefsPrefix}.customTemplates`;

function getCustomTemplates(): StructuredTemplate[] {
  try {
    const stored = Zotero.Prefs.get(CUSTOM_TEMPLATE_PREF, true) as string;
    if (stored) {
      const templates = JSON.parse(stored);
      return Object.values(templates) as StructuredTemplate[];
    }
  } catch (e) {
    ztoolkit.log("Error loading custom templates:", e);
  }
  return [];
}

/**
 * Save a custom template
 */
export function saveCustomTemplate(template: StructuredTemplate): void {
  try {
    let templates: Record<string, StructuredTemplate> = {};
    const stored = Zotero.Prefs.get(CUSTOM_TEMPLATE_PREF, true) as string;
    if (stored) {
      templates = JSON.parse(stored);
    }
    templates[template.id] = {
      ...template,
      id: template.id || `custom_${Date.now()}`,
    };
    Zotero.Prefs.set(CUSTOM_TEMPLATE_PREF, JSON.stringify(templates), true);
  } catch (e) {
    ztoolkit.log("Error saving custom template:", e);
    throw e;
  }
}

/**
 * Delete a custom template
 */
export function deleteCustomTemplate(id: string): void {
  try {
    const stored = Zotero.Prefs.get(CUSTOM_TEMPLATE_PREF, true) as string;
    if (stored) {
      const templates = JSON.parse(stored);
      delete templates[id];
      Zotero.Prefs.set(CUSTOM_TEMPLATE_PREF, JSON.stringify(templates), true);
    }
  } catch (e) {
    ztoolkit.log("Error deleting custom template:", e);
    throw e;
  }
}

/**
 * Apply tag language preference to a template prompt
 * Replaces Chinese tag instructions with English if tagLanguage is set to en-US
 */
export function applyTagLanguageToPrompt(prompt: string): string {
  try {
    const tagLanguage = Zotero.Prefs.get("extensions.zotero.geminizotero.tagLanguage", true) as string || "zh-CN";

    if (tagLanguage === "en-US") {
      // Replace Chinese tag instructions with English
      let modifiedPrompt = prompt;

      // Pattern 1: "tags 字段列出 4-10 个可直接复用的关键词标签（不带 # 或其它符号）"
      modifiedPrompt = modifiedPrompt.replace(
        /tags\s*字段列出\s*4-10\s*个可直接复用的关键词标签（不带\s*#\s*或其它符号）/g,
        "tags field should list 4-10 reusable keyword tags (without # or other symbols)"
      );

      // Pattern 2: "tags 字段列出 4-10 个可复用的主题标签（不带 # 或其它符号）"
      modifiedPrompt = modifiedPrompt.replace(
        /tags\s*字段列出\s*4-10\s*个可复用的主题标签（不带\s*#\s*或其它符号）/g,
        "tags field should list 4-10 reusable topic tags (without # or other symbols)"
      );

      // Pattern 3: Generic pattern for any tags field instruction
      modifiedPrompt = modifiedPrompt.replace(
        /在\s*tags\s*字段列出\s*4-10\s*个[^。）]+标签[^。）]*[。）]/g,
        "list 4-10 keyword tags in the tags field (without # or other symbols)."
      );

      // Also replace the general language instruction for tags
      modifiedPrompt = modifiedPrompt.replace(
        /所有字段值必须使用简体中文（必要的专有名词\/缩写可保留原文）/g,
        "All field values must be in Simplified Chinese (necessary proper nouns/abbreviations can be kept in original language), except tags field which must be in English"
      );

      return modifiedPrompt;
    }

    return prompt;
  } catch (error) {
    ztoolkit.log("Error applying tag language to prompt:", error);
    return prompt;
  }
}

