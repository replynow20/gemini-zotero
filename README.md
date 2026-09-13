# Gemini Zotero

Gemini Zotero 是一个基于 Zotero Plugin Template 开发的 Zotero 插件，支持 **Zotero 7 至 Zotero 10**。插件使用 Google Gemini 或兼容代理分析论文 PDF，并可通过 Gemini 或 OpenAI-compatible 图片接口生成 Visual Insights、查看或导出 AI 对话，以及将输出保存为 Zotero 笔记。

## 已实现的功能

- **工具栏主界面 (Feature-Rich Popup)**：点击工具栏 Gemini 图标，唤起功能强大的综合面板，集成分析、对话、自定义工作流与 Visual Insights。
- **右键菜单**：在条目或附件的右键菜单中提供“使用 Gemini 分析”，支持单条与批量分析。
- **Visual Insights**：先由 Gemini 分析论文并生成绘图提示词，再调用所选的 Gemini 或 OpenAI-compatible 图片模型生成 Schematic (原理图)、Conceptual (概念图)、Flowchart (流程图) 三种风格的可视化图表。
- **自定义工作流与模板管理**：
  - 支持创建、编辑、删除自定义分析模板。
  - 支持导入/导出模板配置 (JSON)，方便分享与备份。
  - 内置公式提取 (Formula Extraction)、图表解读 (Chart Analysis) 等工作流。
- **选区弹窗**：在 PDF 阅读器中选中文本时弹出 “Ask Gemini” 快捷按钮，实现局部提问。
- **会话持久化**：对话历史按条目保存在 Zotero 数据目录下的 `gemini-zotero/conversation-history.json`，支持重启恢复。每个条目保留最近 50 条消息，历史文件上限为 10 MB。
- **笔记/Markdown 导出**：可将对话保存为 Zotero 笔记或导出为 Markdown 文件。
- **偏好设置面板**：在 Zotero 设置中配置 API Key、代理 Base URL、文本与图片模型、文本生成参数、单条右键分析自动保存和标签同步。右键分析使用的默认模板在主弹窗的分析模式中选择。
- **日志与错误提示**：生产环境静默，开发环境通过 `ztoolkit.log` 输出详细日志。

## 尚未完成/规划中的内容

- 大文件体验：目前通过 Gemini Files API 支持 20MB 以上 PDF，后续可补充真正的分块进度、取消操作和更细致的超时控制。
- 更细致的错误分类与可配置重试参数（当前已对网络错误、限流和常见网关错误执行指数退避重试）。
- 更多内置 Agent 模式：如自动综述生成、引用网络分析等。

欢迎基于 README 中的开发流程继续迭代以上功能。

## 快速开始

```bash
git clone <repo>
cd gemini-zotero
npm install
```

### 热更新开发

```bash
npm run start
```

- 首次运行会提示选择 Zotero Profile；之后修改 `src/` 中的代码会自动注入到该 Profile 的 Zotero 实例，无需手动打包。
- 建议搭配 Zotero 的“工具 → 开发者 → 运行 JavaScript”或控制台直接访问 `Zotero.GeminiZotero` 等全局对象调试。

### 构建 / 发布

```bash
npm run build   # 产物位于 .scaffold/build/
```

- 生成的 `.scaffold/build/gemini-zotero.xpi` 可在 Zotero 中通过 “Tools → Add-ons → Install Add-on From File…” 安装。
- `npm run release` 会使用 zotero-plugin-scaffold 的发布流程（需要配置 GitHub Release 权限）。

## 偏好设置说明

| 选项               | 作用                                                                                                                                |
| ------------------ | ----------------------------------------------------------------------------------------------------------------------------------- |
| API Key            | Google Gemini API Key，或同时支持 Gemini 文本接口和所选图片接口的代理密钥；文本和图片请求共用这一密钥                               |
| API Base URL       | 留空时使用 Gemini 官方接口；使用 `gpt-image-2` 时必须填写同时提供 Gemini `/v1beta` 和 OpenAI-compatible `/v1` 的代理根地址          |
| 默认模型           | PDF 分析和对话使用的文本模型：`gemini-3.8-flash` 或 `gemini-3.7-flash`                                                              |
| 生图模型           | `gemini-3-pro-image`、`gemini-3.1-flash-image` 或 `gpt-image-2`；GPT Image 使用同一 Base URL 和 Key 下的 OpenAI-compatible 图片接口 |
| 文本模型参数       | Temperature、Top P、Top K 和 Max Output Tokens 只影响 Gemini 文本/PDF 分析，不控制图片尺寸或质量                                    |
| 默认模板           | 在主弹窗中选择 `quick_summary` / `standard_analysis` / `deep_analysis`，供右键分析使用                                              |
| 自动保存结构化输出 | 只控制单条右键分析是否自动创建笔记；批量分析及主弹窗中的分析、问答和工作流仍会创建笔记，Visual Insights 保存为附件                  |
| 标签同步与语言     | 控制是否把结构化输出中的标签同步到 Zotero 条目，以及标签使用简体中文或英文                                                          |

> **Base URL 规则**：仅需输入域名或包含共享路径的根地址。Gemini 请求形如 `https://your-domain.example.com/v1beta/models/<model>:generateContent`；GPT Image 请求形如 `https://your-domain.example.com/v1/images/generations`。插件目前不能为文本和图片分别配置 Key 或 Base URL，因此选择 GPT Image 时，代理必须在同一根地址和凭据下同时支持这两套接口。

## 开发提示

- 设置和自定义模板存放在 `extensions.zotero.geminizotero.*` 首选项下，可使用 `Services.prefs.getBranch("extensions.zotero.geminizotero.")` 查看；会话历史单独存放在 Zotero 数据目录下的 `gemini-zotero/conversation-history.json`。
- `npm run lint:check`、`npm run lint:fix` 可在提交前检查格式与 ESLint。
- 代理/网络问题可通过日志和 `console.trace()` 快速定位；必要时可在 `src/modules/gemini/client.ts` 中加额外日志。

## 目录结构概览

- `src/`：TypeScript 源码（入口、hooks、Gemini 客户端、UI 模块、存储逻辑等）。
- `addon/`：静态资源（bootstrap、manifest、prefs、icons、XHTML 等）。

## 贡献

1. fork & clone 本仓库。
2. 创建 feature 分支并基于 `npm run start` 进行开发。
3. 提交 pull request 并附带功能说明/截图/日志。

欢迎 Issue/PR 讨论新的 UI 入口、更多模板、以及更完善的错误处理策略。

## 开源协议

本项目采用 **AGPL-3.0-or-later** 协议开源。
这意味着如果您修改了代码并进行分发（包括作为网络服务提供），您必须按照该协议提供相应源代码。完整条款请见 [LICENSE](./LICENSE) 和项目中的 SPDX 标识。
