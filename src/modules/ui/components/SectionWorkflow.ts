import { THEME } from "../theme";
import { IconLoader } from "../iconLoader";

// Template data structure
export interface WorkflowTemplateItem {
    id: string;
    name: string;
    prompt: string;
    isBuiltin: boolean;
}

interface WorkflowProps {
    onImport: () => void;
    onExport: () => void;
    onSave: (name: string, prompt: string, isNew: boolean, refreshCallback: (newTemplateId?: string) => void) => void;
    onRun: (prompt: string, templateName?: string) => void;
    onDelete: (templateId: string, refreshCallback: () => void) => void;
    getTemplates: () => WorkflowTemplateItem[];  // Dynamic getter instead of static list
    defaultTemplate: string;
}

export function createSectionWorkflow(props: WorkflowProps) {
    // Get initial templates
    let templates = props.getTemplates();

    // State
    let isDropdownOpen = false;
    let isCreatingNew = templates.length === 0;
    let selectedTemplateId: string | null = templates.length > 0 ? templates[0].id : null;
    let promptValue = isCreatingNew ? props.defaultTemplate : (templates[0]?.prompt || "");

    const getSelectedTemplate = () => templates.find(t => t.id === selectedTemplateId);

    // Delete confirmation state
    let isConfirmingDelete = false;

    // Show inline delete confirmation UI
    const showDeleteConfirmation = (doc: Document) => {
        isConfirmingDelete = true;
        const deleteBtn = doc.getElementById("geminizotero-template-delete");
        const confirmContainer = doc.getElementById("geminizotero-delete-confirm");

        if (deleteBtn) (deleteBtn as HTMLElement).style.display = "none";
        if (confirmContainer) (confirmContainer as HTMLElement).style.display = "flex";
    };

    // Hide inline delete confirmation UI
    const hideDeleteConfirmation = (doc: Document) => {
        isConfirmingDelete = false;
        const deleteBtn = doc.getElementById("geminizotero-template-delete");
        const confirmContainer = doc.getElementById("geminizotero-delete-confirm");
        const selected = getSelectedTemplate();

        if (deleteBtn && selected && !selected.isBuiltin) {
            (deleteBtn as HTMLElement).style.display = "flex";
        }
        if (confirmContainer) (confirmContainer as HTMLElement).style.display = "none";
    };

    // Execute delete after confirmation
    const executeDelete = (doc: Document) => {
        if (!selectedTemplateId) return;
        hideDeleteConfirmation(doc);
        props.onDelete(selectedTemplateId, () => {
            refreshDropdownMenu(doc);
        });
    };

    // =========================================================================
    // DOM Refresh Functions
    // =========================================================================

    // Refresh the dropdown menu with new template list
    const refreshDropdownMenu = (doc: Document, newSelectedId?: string) => {
        // Re-fetch templates
        templates = props.getTemplates();

        // Update selection
        if (newSelectedId) {
            selectedTemplateId = newSelectedId;
        } else if (templates.length > 0) {
            // Select first available
            selectedTemplateId = templates[0].id;
        } else {
            selectedTemplateId = null;
        }

        const selected = getSelectedTemplate();
        promptValue = selected?.prompt || props.defaultTemplate;

        // Update selected name display
        const selectedName = doc.getElementById("geminizotero-selected-name");
        if (selectedName) {
            selectedName.textContent = selected?.name || "选择模板...";
        }

        // Update prompt textarea
        const promptEl = doc.getElementById("geminizotero-workflow-prompt") as HTMLTextAreaElement;
        if (promptEl) promptEl.value = promptValue;

        // Update delete button visibility
        const deleteBtn = doc.getElementById("geminizotero-template-delete");
        if (deleteBtn) {
            (deleteBtn as HTMLElement).style.display = (selected && !selected.isBuiltin) ? "flex" : "none";
        }

        // Rebuild dropdown menu items
        const dropdownMenu = doc.getElementById("geminizotero-dropdown-menu");
        if (dropdownMenu) {
            dropdownMenu.innerHTML = "";

            // Add template items
            templates.forEach((t, idx) => {
                const item = doc.createElement("div");
                item.setAttribute("data-template-id", t.id);
                item.style.cssText = `
                    padding: 10px 14px;
                    font-size: 13px;
                    color: ${t.id === selectedTemplateId ? THEME.colors.primary : THEME.colors.text.primary};
                    background-color: ${t.id === selectedTemplateId ? "#EBF5FF" : "#FFFFFF"};
                    cursor: pointer;
                    border-bottom: ${idx < templates.length - 1 ? "1px solid #F3F4F6" : "none"};
                `;
                item.textContent = t.name;

                item.addEventListener("click", (e) => {
                    e.stopPropagation();
                    selectTemplate(doc, t.id);
                });
                item.addEventListener("mouseenter", () => {
                    if (t.id !== selectedTemplateId) item.style.backgroundColor = "#F9FAFB";
                });
                item.addEventListener("mouseleave", () => {
                    if (t.id !== selectedTemplateId) item.style.backgroundColor = "#FFFFFF";
                });

                dropdownMenu.appendChild(item);
            });

            // Add "+ 新建模板" option
            const createItem = doc.createElement("div");
            createItem.style.cssText = `
                padding: 10px 14px;
                font-size: 13px;
                color: ${THEME.colors.primary};
                font-weight: 500;
                cursor: pointer;
                border-top: 1px dashed #E5E7EB;
                background-color: #FFFFFF;
            `;
            createItem.textContent = "+ 新建模板";
            createItem.addEventListener("click", (e) => {
                e.stopPropagation();
                switchToCreateMode(doc);
            });
            createItem.addEventListener("mouseenter", () => {
                createItem.style.backgroundColor = "#EBF5FF";
            });
            createItem.addEventListener("mouseleave", () => {
                createItem.style.backgroundColor = "#FFFFFF";
            });
            dropdownMenu.appendChild(createItem);
        }

        // If in create mode, switch back to select mode UI
        if (isCreatingNew && templates.length > 0) {
            isCreatingNew = false;

            const triggerRow = doc.getElementById("geminizotero-trigger-row");
            const inputRow = doc.getElementById("geminizotero-input-row");

            if (triggerRow) (triggerRow as HTMLElement).style.display = "flex";
            if (inputRow) (inputRow as HTMLElement).style.display = "none";
        }
    };

    // =========================================================================
    // UI State Functions
    // =========================================================================

    // Outside click handler for auto-closing dropdown
    let outsideClickHandler: ((e: MouseEvent) => void) | null = null;

    const toggleDropdown = (doc: Document) => {
        isDropdownOpen = !isDropdownOpen;
        const dropdown = doc.getElementById("geminizotero-dropdown-menu");
        const arrow = doc.getElementById("geminizotero-dropdown-arrow");
        if (dropdown) (dropdown as HTMLElement).style.display = isDropdownOpen ? "block" : "none";
        if (arrow) arrow.innerHTML = isDropdownOpen ? "▲" : "▼";

        // Add/remove outside click listener
        if (isDropdownOpen) {
            // Create handler if not exists
            if (!outsideClickHandler) {
                outsideClickHandler = (e: MouseEvent) => {
                    const dropdown = doc.getElementById("geminizotero-dropdown-menu");
                    const trigger = doc.getElementById("geminizotero-trigger-row");
                    const target = e.target as Node;

                    // Close if clicked outside dropdown and trigger
                    if (dropdown && trigger &&
                        !dropdown.contains(target) &&
                        !trigger.contains(target)) {
                        closeDropdown(doc);
                    }
                };
            }
            // Add listener with slight delay to avoid immediate trigger
            setTimeout(() => {
                doc.addEventListener("click", outsideClickHandler!, true);
            }, 10);
        } else {
            // Remove listener when closing
            if (outsideClickHandler) {
                doc.removeEventListener("click", outsideClickHandler, true);
            }
        }
    };

    const closeDropdown = (doc: Document) => {
        isDropdownOpen = false;
        const dropdown = doc.getElementById("geminizotero-dropdown-menu");
        const arrow = doc.getElementById("geminizotero-dropdown-arrow");
        if (dropdown) (dropdown as HTMLElement).style.display = "none";
        if (arrow) arrow.innerHTML = "▼";

        // Remove outside click listener
        if (outsideClickHandler) {
            doc.removeEventListener("click", outsideClickHandler, true);
        }
    };

    const selectTemplate = (doc: Document, templateId: string) => {
        selectedTemplateId = templateId;
        const template = templates.find(t => t.id === templateId);
        if (!template) return;

        promptValue = template.prompt;

        const selectedName = doc.getElementById("geminizotero-selected-name");
        const promptEl = doc.getElementById("geminizotero-workflow-prompt") as HTMLTextAreaElement;
        const deleteBtn = doc.getElementById("geminizotero-template-delete");

        if (selectedName) selectedName.textContent = template.name;
        if (promptEl) promptEl.value = promptValue;
        if (deleteBtn) (deleteBtn as HTMLElement).style.display = template.isBuiltin ? "none" : "flex";

        // Update dropdown item highlights
        const dropdownMenu = doc.getElementById("geminizotero-dropdown-menu");
        if (dropdownMenu) {
            dropdownMenu.querySelectorAll("[data-template-id]").forEach((item: Element) => {
                const el = item as HTMLElement;
                const itemId = el.getAttribute("data-template-id");
                el.style.color = itemId === templateId ? THEME.colors.primary : THEME.colors.text.primary;
                el.style.backgroundColor = itemId === templateId ? "#EBF5FF" : "#FFFFFF";
            });
        }

        closeDropdown(doc);
        ztoolkit.log(`[GeminiZotero:Workflow] Selected: ${templateId}`);
    };

    const switchToCreateMode = (doc: Document) => {
        isCreatingNew = true;
        selectedTemplateId = null;
        promptValue = props.defaultTemplate;

        closeDropdown(doc);

        const triggerRow = doc.getElementById("geminizotero-trigger-row");
        const inputRow = doc.getElementById("geminizotero-input-row");
        const promptEl = doc.getElementById("geminizotero-workflow-prompt") as HTMLTextAreaElement;

        if (triggerRow) (triggerRow as HTMLElement).style.display = "none";
        if (inputRow) (inputRow as HTMLElement).style.display = "flex";
        if (promptEl) promptEl.value = promptValue;

        const nameInput = doc.getElementById("geminizotero-workflow-name") as HTMLInputElement;
        if (nameInput) {
            nameInput.value = "";
            nameInput.focus();
        }
    };

    const switchToSelectMode = (doc: Document, templateIdToSelect?: string) => {
        isCreatingNew = false;
        templates = props.getTemplates();

        if (templateIdToSelect && templates.find(t => t.id === templateIdToSelect)) {
            selectedTemplateId = templateIdToSelect;
            const selected = templates.find(t => t.id === templateIdToSelect)!;
            promptValue = selected.prompt;
        } else if (templates.length > 0) {
            selectedTemplateId = templates[0].id;
            promptValue = templates[0].prompt;
        }

        const selected = getSelectedTemplate();

        const triggerRow = doc.getElementById("geminizotero-trigger-row");
        const inputRow = doc.getElementById("geminizotero-input-row");
        const promptEl = doc.getElementById("geminizotero-workflow-prompt") as HTMLTextAreaElement;
        const selectedName = doc.getElementById("geminizotero-selected-name");
        const deleteBtn = doc.getElementById("geminizotero-template-delete");

        if (triggerRow) (triggerRow as HTMLElement).style.display = "flex";
        if (inputRow) (inputRow as HTMLElement).style.display = "none";
        if (promptEl) promptEl.value = promptValue;
        if (selectedName && selected) selectedName.textContent = selected.name;
        if (deleteBtn && selected) {
            (deleteBtn as HTMLElement).style.display = selected.isBuiltin ? "none" : "flex";
        }
    };

    // =========================================================================
    // Initial Template
    // =========================================================================
    const initialSelected = getSelectedTemplate();

    return {
        tag: "div",
        namespace: "html",
        styles: {
            padding: THEME.spacing.md,
            borderBottom: `1px solid ${THEME.border.default}`,
            backgroundColor: THEME.colors.bg.surface,
        },
        children: [
            // Header - Title only, no buttons
            {
                tag: "h2",
                namespace: "html",
                styles: {
                    fontSize: THEME.typography.size.sm,
                    fontWeight: THEME.typography.weight.bold,
                    color: THEME.colors.text.primary,
                    margin: `0 0 ${THEME.spacing.sm} 0`,
                },
                properties: { innerHTML: "Custom Workflow" },
            },

            // Main content
            {
                tag: "div",
                namespace: "html",
                styles: { display: "flex", flexDirection: "column", gap: THEME.spacing.sm },
                children: [
                    // Template Selector
                    {
                        tag: "div",
                        namespace: "html",
                        children: [
                            {
                                tag: "label",
                                namespace: "html",
                                styles: {
                                    display: "block",
                                    fontSize: "12px",
                                    fontWeight: THEME.typography.weight.medium,
                                    color: THEME.colors.text.secondary,
                                    marginBottom: "6px",
                                },
                                properties: { innerHTML: "Template Name" }
                            },
                            // Dropdown wrapper
                            {
                                tag: "div",
                                namespace: "html",
                                styles: { position: "relative" },
                                children: [
                                    // Trigger row (dropdown mode)
                                    {
                                        tag: "div",
                                        id: "geminizotero-trigger-row",
                                        namespace: "html",
                                        styles: {
                                            display: isCreatingNew ? "none" : "flex",
                                            alignItems: "center",
                                            height: "36px",
                                            border: `1px solid ${THEME.border.input}`,
                                            borderRadius: "6px",
                                            backgroundColor: THEME.colors.bg.input,
                                            cursor: "pointer",
                                            overflow: "hidden",
                                        },
                                        children: [
                                            // Clickable area
                                            {
                                                tag: "div",
                                                namespace: "html",
                                                styles: {
                                                    flex: "1",
                                                    display: "flex",
                                                    alignItems: "center",
                                                    padding: "0 12px",
                                                    height: "100%",
                                                },
                                                listeners: [{
                                                    type: "click",
                                                    listener: (e: Event) => {
                                                        e.stopPropagation();
                                                        const el = e.currentTarget as HTMLElement;
                                                        const doc = el.ownerDocument;
                                                        if (doc) toggleDropdown(doc);
                                                    }
                                                }],
                                                children: [
                                                    {
                                                        tag: "span",
                                                        id: "geminizotero-selected-name",
                                                        namespace: "html",
                                                        styles: {
                                                            flex: "1",
                                                            fontSize: "13px",
                                                            color: THEME.colors.text.primary,
                                                            overflow: "hidden",
                                                            textOverflow: "ellipsis",
                                                            whiteSpace: "nowrap",
                                                        },
                                                        properties: { innerHTML: initialSelected?.name || "选择模板..." }
                                                    }
                                                ]
                                            },
                                            // Delete button (shows trash icon, click to show confirmation)
                                            {
                                                tag: "div",
                                                id: "geminizotero-template-delete",
                                                namespace: "html",
                                                styles: {
                                                    width: "36px",
                                                    height: "100%",
                                                    display: (initialSelected && !initialSelected.isBuiltin) ? "flex" : "none",
                                                    alignItems: "center",
                                                    justifyContent: "center",
                                                    borderLeft: `1px solid ${THEME.border.input}`,
                                                    cursor: "pointer",
                                                    color: "#DC2626",
                                                },
                                                children: [IconLoader.create("trash", { size: 16, color: "#DC2626" })],
                                                listeners: [
                                                    {
                                                        type: "click",
                                                        listener: (e: Event) => {
                                                            e.stopPropagation();
                                                            const el = e.currentTarget as HTMLElement;
                                                            const doc = el.ownerDocument;
                                                            if (doc) showDeleteConfirmation(doc);
                                                        }
                                                    },
                                                    {
                                                        type: "mouseenter",
                                                        listener: (e: Event) => {
                                                            (e.currentTarget as HTMLElement).style.backgroundColor = "#FEE2E2";
                                                        }
                                                    },
                                                    {
                                                        type: "mouseleave",
                                                        listener: (e: Event) => {
                                                            (e.currentTarget as HTMLElement).style.backgroundColor = "transparent";
                                                        }
                                                    }
                                                ]
                                            },
                                            // Inline delete confirmation (hidden by default)
                                            {
                                                tag: "div",
                                                id: "geminizotero-delete-confirm",
                                                namespace: "html",
                                                styles: {
                                                    display: "none",
                                                    alignItems: "center",
                                                    height: "100%",
                                                    borderLeft: `1px solid ${THEME.border.input}`,
                                                    backgroundColor: "#FEF2F2",
                                                },
                                                children: [
                                                    // Confirm button
                                                    {
                                                        tag: "div",
                                                        namespace: "html",
                                                        styles: {
                                                            padding: "0 10px",
                                                            height: "100%",
                                                            display: "flex",
                                                            alignItems: "center",
                                                            fontSize: "12px",
                                                            color: "#DC2626",
                                                            fontWeight: "600",
                                                            cursor: "pointer",
                                                        },
                                                        properties: { innerHTML: "确认" },
                                                        listeners: [
                                                            {
                                                                type: "click",
                                                                listener: (e: Event) => {
                                                                    e.stopPropagation();
                                                                    const el = e.currentTarget as HTMLElement;
                                                                    const doc = el.ownerDocument;
                                                                    if (doc) executeDelete(doc);
                                                                }
                                                            },
                                                            {
                                                                type: "mouseenter",
                                                                listener: (e: Event) => {
                                                                    (e.currentTarget as HTMLElement).style.backgroundColor = "#FEE2E2";
                                                                }
                                                            },
                                                            {
                                                                type: "mouseleave",
                                                                listener: (e: Event) => {
                                                                    (e.currentTarget as HTMLElement).style.backgroundColor = "transparent";
                                                                }
                                                            }
                                                        ]
                                                    },
                                                    // Cancel button
                                                    {
                                                        tag: "div",
                                                        namespace: "html",
                                                        styles: {
                                                            padding: "0 10px",
                                                            height: "100%",
                                                            display: "flex",
                                                            alignItems: "center",
                                                            fontSize: "12px",
                                                            color: "#6B7280",
                                                            cursor: "pointer",
                                                            borderLeft: "1px solid #FECACA",
                                                        },
                                                        properties: { innerHTML: "取消" },
                                                        listeners: [
                                                            {
                                                                type: "click",
                                                                listener: (e: Event) => {
                                                                    e.stopPropagation();
                                                                    const el = e.currentTarget as HTMLElement;
                                                                    const doc = el.ownerDocument;
                                                                    if (doc) hideDeleteConfirmation(doc);
                                                                }
                                                            },
                                                            {
                                                                type: "mouseenter",
                                                                listener: (e: Event) => {
                                                                    (e.currentTarget as HTMLElement).style.backgroundColor = "#F3F4F6";
                                                                }
                                                            },
                                                            {
                                                                type: "mouseleave",
                                                                listener: (e: Event) => {
                                                                    (e.currentTarget as HTMLElement).style.backgroundColor = "transparent";
                                                                }
                                                            }
                                                        ]
                                                    }
                                                ]
                                            },
                                            // Arrow
                                            {
                                                tag: "div",
                                                namespace: "html",
                                                styles: {
                                                    width: "36px",
                                                    height: "100%",
                                                    display: "flex",
                                                    alignItems: "center",
                                                    justifyContent: "center",
                                                    borderLeft: `1px solid ${THEME.border.input}`,
                                                    cursor: "pointer",
                                                },
                                                listeners: [{
                                                    type: "click",
                                                    listener: (e: Event) => {
                                                        e.stopPropagation();
                                                        const el = e.currentTarget as HTMLElement;
                                                        const doc = el.ownerDocument;
                                                        if (doc) toggleDropdown(doc);
                                                    }
                                                }],
                                                children: [{
                                                    tag: "span",
                                                    id: "geminizotero-dropdown-arrow",
                                                    namespace: "html",
                                                    styles: { fontSize: "10px", color: "#6B7280" },
                                                    properties: { innerHTML: "▼" }
                                                }]
                                            }
                                        ]
                                    },
                                    // Input row (create mode)
                                    {
                                        tag: "div",
                                        id: "geminizotero-input-row",
                                        namespace: "html",
                                        styles: {
                                            display: isCreatingNew ? "flex" : "none",
                                            alignItems: "center",
                                            height: "36px",
                                            border: `1px solid ${THEME.colors.primary}`,
                                            borderRadius: "6px",
                                            backgroundColor: THEME.colors.bg.input,
                                            overflow: "hidden",
                                        },
                                        children: [
                                            {
                                                tag: "input",
                                                id: "geminizotero-workflow-name",
                                                namespace: "html",
                                                attributes: {
                                                    type: "text",
                                                    placeholder: "输入新模板名称...",
                                                },
                                                styles: {
                                                    flex: "1",
                                                    height: "100%",
                                                    padding: "0 12px",
                                                    border: "none",
                                                    backgroundColor: "transparent",
                                                    fontSize: "13px",
                                                    outline: "none",
                                                    boxSizing: "border-box",
                                                }
                                            },
                                            ...(templates.length > 0 ? [{
                                                tag: "div",
                                                namespace: "html",
                                                styles: {
                                                    height: "100%",
                                                    padding: "0 12px",
                                                    display: "flex",
                                                    alignItems: "center",
                                                    justifyContent: "center",
                                                    borderLeft: `1px solid ${THEME.border.input}`,
                                                    cursor: "pointer",
                                                    color: "#6B7280",
                                                    fontSize: "12px",
                                                    backgroundColor: "#F9FAFB",
                                                },
                                                properties: { innerHTML: "取消" },
                                                listeners: [
                                                    {
                                                        type: "click",
                                                        listener: (e: Event) => {
                                                            e.stopPropagation();
                                                            const el = e.currentTarget as HTMLElement;
                                                            const doc = el.ownerDocument;
                                                            if (doc) switchToSelectMode(doc);
                                                        }
                                                    },
                                                    {
                                                        type: "mouseenter",
                                                        listener: (e: Event) => {
                                                            (e.currentTarget as HTMLElement).style.backgroundColor = "#F3F4F6";
                                                        }
                                                    },
                                                    {
                                                        type: "mouseleave",
                                                        listener: (e: Event) => {
                                                            (e.currentTarget as HTMLElement).style.backgroundColor = "#F9FAFB";
                                                        }
                                                    }
                                                ]
                                            }] : [])
                                        ]
                                    },
                                    // Floating dropdown menu
                                    {
                                        tag: "div",
                                        id: "geminizotero-dropdown-menu",
                                        namespace: "html",
                                        styles: {
                                            display: "none",
                                            position: "absolute",
                                            top: "40px",
                                            left: "0",
                                            right: "0",
                                            zIndex: "1000",
                                            backgroundColor: "#FFFFFF",
                                            border: `1px solid ${THEME.border.input}`,
                                            borderRadius: "6px",
                                            boxShadow: "0 4px 12px rgba(0,0,0,0.15)",
                                            maxHeight: "200px",
                                            overflowY: "auto",
                                        },
                                        children: [
                                            ...templates.map((t, idx) => ({
                                                tag: "div",
                                                namespace: "html",
                                                attributes: { "data-template-id": t.id },
                                                styles: {
                                                    padding: "10px 14px",
                                                    fontSize: "13px",
                                                    color: t.id === selectedTemplateId ? THEME.colors.primary : THEME.colors.text.primary,
                                                    backgroundColor: t.id === selectedTemplateId ? "#EBF5FF" : "#FFFFFF",
                                                    cursor: "pointer",
                                                    borderBottom: idx < templates.length - 1 ? "1px solid #F3F4F6" : "none",
                                                },
                                                properties: { innerHTML: t.name },
                                                listeners: [
                                                    {
                                                        type: "click",
                                                        listener: (e: Event) => {
                                                            e.stopPropagation();
                                                            const el = e.currentTarget as HTMLElement;
                                                            const doc = el.ownerDocument;
                                                            if (doc) selectTemplate(doc, t.id);
                                                        }
                                                    },
                                                    {
                                                        type: "mouseenter",
                                                        listener: (e: Event) => {
                                                            const el = e.currentTarget as HTMLElement;
                                                            if (el.getAttribute("data-template-id") !== selectedTemplateId) {
                                                                el.style.backgroundColor = "#F9FAFB";
                                                            }
                                                        }
                                                    },
                                                    {
                                                        type: "mouseleave",
                                                        listener: (e: Event) => {
                                                            const el = e.currentTarget as HTMLElement;
                                                            if (el.getAttribute("data-template-id") !== selectedTemplateId) {
                                                                el.style.backgroundColor = "#FFFFFF";
                                                            }
                                                        }
                                                    }
                                                ]
                                            })),
                                            {
                                                tag: "div",
                                                namespace: "html",
                                                styles: {
                                                    padding: "10px 14px",
                                                    fontSize: "13px",
                                                    color: THEME.colors.primary,
                                                    fontWeight: "500",
                                                    cursor: "pointer",
                                                    borderTop: "1px dashed #E5E7EB",
                                                    backgroundColor: "#FFFFFF",
                                                },
                                                properties: { innerHTML: "+ 新建模板" },
                                                listeners: [
                                                    {
                                                        type: "click",
                                                        listener: (e: Event) => {
                                                            e.stopPropagation();
                                                            const el = e.currentTarget as HTMLElement;
                                                            const doc = el.ownerDocument;
                                                            if (doc) switchToCreateMode(doc);
                                                        }
                                                    },
                                                    {
                                                        type: "mouseenter",
                                                        listener: (e: Event) => {
                                                            (e.currentTarget as HTMLElement).style.backgroundColor = "#EBF5FF";
                                                        }
                                                    },
                                                    {
                                                        type: "mouseleave",
                                                        listener: (e: Event) => {
                                                            (e.currentTarget as HTMLElement).style.backgroundColor = "#FFFFFF";
                                                        }
                                                    }
                                                ]
                                            }
                                        ]
                                    }
                                ]
                            }
                        ]
                    },

                    // Prompt Instructions with Import/Export buttons
                    {
                        tag: "div",
                        namespace: "html",
                        children: [
                            // Label row with Import/Export
                            {
                                tag: "div",
                                namespace: "html",
                                styles: {
                                    display: "flex",
                                    justifyContent: "space-between",
                                    alignItems: "center",
                                    marginBottom: "6px",
                                },
                                children: [
                                    {
                                        tag: "label",
                                        namespace: "html",
                                        styles: {
                                            fontSize: "12px",
                                            fontWeight: THEME.typography.weight.medium,
                                            color: THEME.colors.text.secondary,
                                        },
                                        properties: { innerHTML: "Prompt Instructions" }
                                    },
                                    {
                                        tag: "div",
                                        namespace: "html",
                                        styles: { display: "flex", gap: "6px" },
                                        children: [
                                            {
                                                tag: "button",
                                                namespace: "html",
                                                styles: {
                                                    height: "22px",
                                                    padding: "0 8px",
                                                    backgroundColor: "transparent",
                                                    border: `1px solid ${THEME.border.input}`,
                                                    borderRadius: THEME.borderRadius.sm,
                                                    color: THEME.colors.text.secondary,
                                                    fontSize: "11px",
                                                    fontWeight: THEME.typography.weight.medium,
                                                    display: "flex",
                                                    alignItems: "center",
                                                    gap: "4px",
                                                    cursor: "pointer",
                                                },
                                                children: [
                                                    IconLoader.create("upload", { size: 12 }),
                                                    { tag: "span", namespace: "html", properties: { innerHTML: "Import" } }
                                                ],
                                                listeners: [{ type: "click", listener: props.onImport }]
                                            },
                                            {
                                                tag: "button",
                                                namespace: "html",
                                                styles: {
                                                    height: "22px",
                                                    padding: "0 8px",
                                                    backgroundColor: "transparent",
                                                    border: `1px solid ${THEME.border.input}`,
                                                    borderRadius: THEME.borderRadius.sm,
                                                    color: THEME.colors.text.secondary,
                                                    fontSize: "11px",
                                                    fontWeight: THEME.typography.weight.medium,
                                                    display: "flex",
                                                    alignItems: "center",
                                                    gap: "4px",
                                                    cursor: "pointer",
                                                },
                                                children: [
                                                    IconLoader.create("download", { size: 12 }),
                                                    { tag: "span", namespace: "html", properties: { innerHTML: "Export" } }
                                                ],
                                                listeners: [{ type: "click", listener: props.onExport }]
                                            },
                                        ]
                                    }
                                ]
                            },
                            {
                                tag: "textarea",
                                id: "geminizotero-workflow-prompt",
                                namespace: "html",
                                attributes: {
                                    placeholder: "输入分析指令...",
                                    rows: "4",
                                },
                                properties: { value: promptValue },
                                styles: {
                                    width: "100%",
                                    height: "100px",
                                    padding: "8px",
                                    borderRadius: "6px",
                                    border: `1px solid ${THEME.border.input}`,
                                    backgroundColor: THEME.colors.bg.input,
                                    fontSize: "13px",
                                    fontFamily: "monospace",
                                    color: "#374151",
                                    resize: "none",
                                    overflowY: "auto",
                                    outline: "none",
                                    boxSizing: "border-box",
                                },
                                listeners: [{
                                    type: "input",
                                    listener: (e: Event) => {
                                        promptValue = (e.target as HTMLTextAreaElement).value;
                                    }
                                }]
                            }
                        ]
                    },

                    // Action Buttons
                    {
                        tag: "div",
                        namespace: "html",
                        styles: {
                            display: "grid",
                            gridTemplateColumns: "repeat(2, 1fr)",
                            gap: THEME.spacing.md,
                            paddingTop: "4px"
                        },
                        children: [
                            {
                                tag: "button",
                                namespace: "html",
                                properties: {
                                    style: `width: 100%; height: 36px; display: flex; align-items: center; justify-content: center; gap: 8px; background-color: transparent; color: #374151; border: 2px solid #E5E7EB; border-radius: 8px; font-size: 13px; font-weight: 600; cursor: pointer;`,
                                },
                                children: [
                                    IconLoader.create("save", { size: 16 }),
                                    { tag: "span", namespace: "html", properties: { innerHTML: "Save" } }
                                ],
                                listeners: [{
                                    type: "click",
                                    listener: (e: Event) => {
                                        const btn = e.currentTarget as HTMLElement;
                                        const doc = btn.ownerDocument;
                                        if (!doc) return;

                                        const promptEl = doc.getElementById("geminizotero-workflow-prompt") as HTMLTextAreaElement;
                                        const currentPrompt = promptEl?.value || promptValue;

                                        if (isCreatingNew) {
                                            const nameEl = doc.getElementById("geminizotero-workflow-name") as HTMLInputElement;
                                            const currentName = nameEl?.value?.trim() || "";
                                            if (!currentName) {
                                                ztoolkit.getGlobal("alert")("请输入模板名称");
                                                return;
                                            }
                                            // Pass refresh callback
                                            props.onSave(currentName, currentPrompt, true, (newTemplateId) => {
                                                refreshDropdownMenu(doc, newTemplateId);
                                            });
                                        } else {
                                            const template = getSelectedTemplate();
                                            if (template?.isBuiltin) {
                                                ztoolkit.getGlobal("alert")("内置模板不能修改，请点击「+ 新建模板」创建自定义模板");
                                                return;
                                            }
                                            if (template) {
                                                props.onSave(template.name, currentPrompt, false, () => {
                                                    // Just show success, no need to refresh for update
                                                });
                                            }
                                        }
                                    }
                                }]
                            },
                            {
                                tag: "button",
                                namespace: "html",
                                properties: {
                                    style: `width: 100%; height: 36px; display: flex; align-items: center; justify-content: center; gap: 8px; background: ${THEME.colors.primary}; color: white; border: none; border-radius: 8px; font-size: 13px; font-weight: 600; cursor: pointer;`,
                                },
                                children: [
                                    IconLoader.create("play", { size: 16, color: "white" }),
                                    { tag: "span", namespace: "html", properties: { innerHTML: "Run" } }
                                ],
                                listeners: [{
                                    type: "click",
                                    listener: (e: Event) => {
                                        const btn = e.currentTarget as HTMLElement;
                                        const doc = btn.ownerDocument;
                                        if (!doc) return;

                                        const promptEl = doc.getElementById("geminizotero-workflow-prompt") as HTMLTextAreaElement;
                                        const currentPrompt = promptEl?.value || promptValue;
                                        if (!currentPrompt.trim()) {
                                            ztoolkit.getGlobal("alert")("请输入分析指令");
                                            return;
                                        }

                                        // Get template name for note title
                                        const selected = getSelectedTemplate();
                                        const templateName = selected?.name || (isCreatingNew ? "自定义分析" : "自定义分析");

                                        props.onRun(currentPrompt, templateName);
                                    }
                                }]
                            }
                        ]
                    }
                ]
            }
        ]
    };
}
