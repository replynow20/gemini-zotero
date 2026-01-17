# Changelog

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
