import { ZoteroToolkit } from "zotero-plugin-toolkit";
import { config } from "../../package.json";

export { createZToolkit };

function createZToolkit() {
    const _ztoolkit = new ZoteroToolkit();
    initZToolkit(_ztoolkit);
    return _ztoolkit;
}

function initZToolkit(_ztoolkit: ReturnType<typeof createZToolkit>) {
    _ztoolkit.basicOptions.log.prefix = `[${config.addonName}]`;
    _ztoolkit.basicOptions.log.disableConsole = __env__ !== "development";
    _ztoolkit.basicOptions.log.disableZLog = __env__ !== "development";
    _ztoolkit.UI.basicOptions.ui.enableElementJSONLog = __env__ === "development";
    _ztoolkit.UI.basicOptions.ui.enableElementDOMLog = __env__ === "development";
    _ztoolkit.basicOptions.api.pluginID = config.addonID;
    _ztoolkit.ProgressWindow.setIconURI(
        "default",
        `chrome://${config.addonRef}/content/icons/favicon.png`,
    );
}
