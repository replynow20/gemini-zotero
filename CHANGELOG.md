# Changelog

## [0.4.2] - 2026-02-18

### 🔧 Improvements

- **Thread-Safe Image Generation**: Refactored `GeminiClient.generateImage()` to use a local model variable instead of temporarily mutating instance state, eliminating potential race conditions when multiple calls run concurrently
- **Thinking Model Support**: Added filtering logic in `GeminiClient.sendRequest()` to properly handle "thinking" models (e.g., Gemini with `thought: true` parts), stripping internal reasoning content and `<think>...</think>` tags from final output
- **Workflow Template Name Passthrough**: Custom workflow analysis now displays the actual template name (instead of generic "自定义分析") in progress messages, chat history, and generated note titles

### 🧹 Code Quality

- **`truncateText` Utility Consolidation**: Extracted duplicated `truncateText()` function from `batchProcessor.ts` and `selectionPopup.ts` into a shared `src/utils/text.ts` module
- **Log Cleanup**: Removed excessive verbose logging from `hooks.ts` (lifecycle events, input updates, prefs) while retaining essential error and shutdown logs
- **Debug Log Instructions**: Added commented-out debug log toggles in `ztoolkit.ts` with clear instructions for enabling verbose logging when needed

### 🎨 UI Updates

- **SVG Icons**: Switched ProgressWindow default icon and batch menu icon from `favicon.png` to `favicon-sele.svg` for sharper rendering

---

## [0.4.0] - 2026-02-02

### ✨ New Features

- **Manual Tags Control**: Added user control over AI-extracted tags synchronization
  - New preference to enable/disable automatic tag sync to Zotero items
  - Language selection for tags: choose between Simplified Chinese or English
  - Tags still appear in generated notes even when sync is disabled
  - Settings UI displays both controls on a single line for space efficiency

### 🎨 UI Improvements

- **Fully Localized Preferences**: Complete localization of the preferences pane
  - All UI elements now use `data-l10n-id` attributes for proper internationalization
  - Removed hardcoded Chinese text from XHTML markup
  - Updated API URL example in locale files for better clarity

### 🔧 Zotero 8 Compatibility

- **Zotero 8 Support**: Updated plugin to support Zotero 8 while maintaining backward compatibility with Zotero 7
  - Updated build target from Firefox 115 to Firefox 140 (Zotero 8's platform base)
  - Verified all dependencies are compatible with both Zotero 7 and 8
  - No breaking changes - plugin works seamlessly in both versions

### 🔧 Technical Updates

- **Build Configuration**: Updated esbuild target to `firefox140` in `zotero-plugin.config.ts`
- **Dependencies**: Confirmed latest versions of toolkit (5.1.0-beta.13), types (4.1.0-beta.4), and scaffold (0.8.2) are compatible
- **Code Quality**: All existing code already uses modern APIs - no deprecated JSM, Services.jsm, or Bluebird promises
- **Smart Prompt Modification**: Added `applyTagLanguageToPrompt()` helper function to dynamically adjust AI prompts based on user's language preference


---

## [0.3.1] - 2026-01-18

### 🔧 Code Optimization & Refactoring

- **File-Based History Storage**: Migrated conversation history from `Zotero.Prefs` to file-based storage (`historyStorage.ts`)
  - Implemented in-memory caching with debounced writes for better performance
  - Added automatic data migration from preferences to file system
  - Added `flushHistory()` for proper cleanup on plugin shutdown
  - Removed 5MB storage limit - now supports unlimited conversation history
  
- **PDF Helper Utilities**: Extracted duplicated `getPdfData()` function to shared utility module (`src/utils/pdfHelper.ts`)
  - Now uses Zotero's `getBestAttachment()` API to intelligently select primary PDF when multiple attachments exist
  - Improved logging for better debugging
  - Reduced code duplication across `collectionToolbar.ts`, `batchProcessor.ts`, and `readerPanel.ts`

- **Enhanced API Error Handling**: Added comprehensive retry mechanism to Gemini API client
  - Automatic retry with exponential backoff for network errors (502, 503, 504)
  - Separate retry logic for rate limiting (429) and overload (529) errors
  - Improved timeout handling with configurable limits (10s for small files, 60s for large files)
  - Better error messages with HTTP status codes and human-readable explanations

### 🐛 Bug Fixes

- **Popup Window Management**: Fixed issue where multiple popup windows could open simultaneously
  - Only one popup window can be active at a time
  - Clicking toolbar button now focuses existing window instead of opening duplicates
  - Proper cleanup when popup is closed

- **API Call Stability**: Improved reliability of PDF analysis with retry mechanisms
  - Reduced failures due to temporary network issues
  - Better handling of API rate limits and server overload

### 📝 Internal Improvements

- All history-related functions now use async/await pattern
- Improved code organization and maintainability
- Enhanced logging throughout the codebase for easier debugging

---

## [0.3.0] - 2026-01-17

### 🚀 Visual Insights 2.0 (Major Update)

- **Logic Upgrade: Structured Output Engine**: Replaced raw text generation with Gemini's **Structured Output (JSON Schema)**. The Flash model now acts as a "Design Director", generating a precise manifest (JSON) for every visual, ensuring higher stability and adherence to instructions.
- **Scientific Color Palettes**: Implemented 5 professional color schemes tailored to different disciplines. AI automatically selects the best palette based on paper content:
  - **Nature Classic**: Deep Teal & Gold (Biology/Ecology)
  - **Deep Science**: Dark Mode aesthetics (CS/AI/Physics)
  - **Engineering Blueprint**: Precise technical blue (Systems/Architecture)
  - **Medical Clean**: Sterile White & Red (Medicine)
  - **Warm Humanities**: Editorial Cream & Sage (Social Sciences)
- **Adaptive Visual Strategies**:
  - **Schematic**: Content-aware decision making. Automatically chooses between "3D Cutaway" (for materials/bio) and "Isometric Architecture" (for systems/logic).
  - **Conceptual**: Upgraded to "Hero Object" style, focusing on creating a central visual metaphor with high-fidelity studio lighting.
  - **Flowchart**: Transformed into "3D Process Pipelines", using spatial arrangement of 3D assets instead of simple 2D boxes.

### ✨ New Features & Enhancements

- **Zotero 7 Native UI**: Complete overhaul of the Popup UI to align with Zotero 7's modern aesthetic.
  - **Compact Mode**: Optimized spacing, padding, and font sizes for a deeper, less crowded information density.
  - **Native Icons**: replaced generic icons with native-style SVG assets.
- **Enhanced Chat & Workflow**:
  - **Markdown Rendering**: Improved support for tables, code blocks, and math equations in chat responses.
  - **Token Optimization**: Upgraded Gemini client to `gemini-3-flash-preview` for faster context analysis and `gemini-3-pro-image-preview` for generation.

### 🐛 Bug Fixes

- **Settings Persistence**: Fixed issues where model parameters (Temperature, TopK) were not correctly saving/restoring in Preferences.
- **Toolbar Icon**: Fixed icon positioning and sizing issues in the main collection toolbar.
- **Localization**: Fixed layout issues caused by long localized strings in the settings menu.

---

## [0.2.7] - 2026-01-17

### ✨ New Features

- **Custom Workflow Templates**: Added support for saving, editing, and deleting custom workflow templates
  - Create new templates with custom prompts
  - Delete custom templates (built-in templates are protected)
  - Templates persist across sessions via Zotero preferences
  - Import/Export functionality for template sharing

### 🎨 UI Improvements

- **More Compact Layout**: Reduced padding and margins for a tighter, cleaner interface
  - Smaller header padding
  - Reduced section spacing
  - Import/Export buttons moved to Prompt Instructions row for better space utilization
  
- **Inline Delete Confirmation**: Replaced native confirm dialog with inline [确认][取消] buttons
  - No more window focus issues when deleting templates
  - Smoother user experience within the popup

- **Floating Dropdown**: Template selector uses a floating dropdown overlay instead of pushing content down

### 🔧 Improvements

- **Dynamic UI Refresh**: Save/Delete operations no longer close the popup
  - Popup stays open after saving new templates
  - Newly created templates are automatically selected
  - Dropdown menu refreshes dynamically without page reload

- **Enhanced Progress Messages**: More detailed ProgressWindow feedback across all analysis functions
  - Right-click analysis now shows PDF size (e.g., "正在分析 PDF（2.5MB）...")
  - Batch analysis shows file size for each item
  - Selection Q&A shows question preview in progress

### 🐛 Bug Fixes

- Fixed issue where newly saved templates weren't auto-selected
- Fixed window layering issue when delete confirmation appeared
- Fixed template selection resetting to first item after operations

---

## [0.2.6] - 2026-01-15

### Features
- Analysis mode selection with visual feedback
- Collection toolbar button with popup menu
- PDF selection popup for quick Q&A
- Model parameter settings in preferences

### UI
- Stitch-inspired modern design
- Blue primary color theme
- Responsive button styling
