# Gemini Zotero

Gemini Zotero 是一个基于 Zotero Plugin Template 开发的 Zotero 插件，支持 **Zotero 7 和 Zotero 8**，允许你直接在 Zotero 中调用 Google Gemini/Gemini 代理服务来分析论文 PDF，查看/导出 AI 对话结果，并将输出保存为 Zotero 笔记。

## 已实现的功能

- **工具栏主界面 (Feature-Rich Popup)**：点击工具栏 Gemini 图标，唤起功能强大的综合面板，集成分析、对话、自定义工作流与 Visual Insights。
- **右键菜单**：在条目或附件的右键菜单中提供“使用 Gemini 分析”，支持单条与批量分析。
- **Visual Insights**：利用 Gemini 多模态能力，根据论文内容生成 Schematic (原理图)、Conceptual (概念图)、Flowchart (流程图) 三种风格的可视化图表，辅助理解复杂概念。
- **自定义工作流与模板管理**：
  - 支持创建、编辑、删除自定义分析模板。
  - 支持导入/导出模板配置 (JSON)，方便分享与备份。
  - 内置公式提取 (Formula Extraction)、图表解读 (Chart Analysis) 等工作流。
- **选区弹窗**：在 PDF 阅读器中选中文本时弹出 “Ask Gemini” 快捷按钮，实现局部提问。
- **会话持久化**：对话历史按条目保存在 `extensions.zotero.geminizotero.conversationHistory` 中，支持重启恢复。
- **笔记/Markdown 导出**：可将对话保存为 Zotero 笔记或导出为 Markdown 文件。
- **偏好设置面板**：在 Zotero 设置中配置 API Key、代理 Base URL、默认模型/模板、是否自动保存。
- **日志与错误提示**：生产环境静默，开发环境通过 `ztoolkit.log` 输出详细日志。

## 尚未完成/规划中的内容

- 大文件优化：对超大 PDF 的分块读取/上传、进度提示与取消操作（目前通过 File API 支持 20MB+ 文件，但超大文件体验仍有优化空间）。
- 更细致的错误提示与重试策略（如网络抖动、限流、代理异常等）。
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

| 选项 | 作用 |
| --- | --- |
| API Key | 来自 Google Gemini 或你自建代理的 API 密钥 |
| API Base URL | 代理域名，如 `apiurl.com`；插件会自动补上 `/v1beta`，无论是否带尾斜杠 |
| 默认模型 | 例如 `gemini-3-flash-preview` |
| 默认模板 | `quick_summary` / `standard_analysis` / `deep_analysis` |
| 自动保存结构化输出 | 为 `true` 时在分析完成后自动生成 Zotero 笔记 |

> 💡 **Base URL 规则**：仅需输入域名或包含额外路径的根地址；插件会保证最终请求地址形如 `https://your-domain.example.com/v1beta/models/<model>:generateContent`.

## 开发提示

- 会话/模板等存放在 `extensions.zotero.geminizotero.*` 首选项下，可使用 `Services.prefs.getBranch("extensions.zotero.geminizotero.")` 查看。
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
这意味着如果您修改了代码并进行分发（包括作为网络服务提供），您必须开源您的修改版本。完整协议请见 [LICENSE](./LICENSE) 文件（如有）或 SPDX 标识。
