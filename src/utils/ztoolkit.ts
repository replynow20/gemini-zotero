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
    // 临时开启调试日志：将下面两行的值改为 false 即可在所有环境中输出日志
    // _ztoolkit.basicOptions.log.disableConsole = false;
    // _ztoolkit.basicOptions.log.disableZLog = false;
    _ztoolkit.basicOptions.log.disableConsole = __env__ !== "development";
    _ztoolkit.basicOptions.log.disableZLog = __env__ !== "development";
    _ztoolkit.UI.basicOptions.ui.enableElementJSONLog = __env__ === "development";
    _ztoolkit.UI.basicOptions.ui.enableElementDOMLog = __env__ === "development";
    _ztoolkit.basicOptions.api.pluginID = config.addonID;
    _ztoolkit.ProgressWindow.setIconURI(
        "default",
        `chrome://${config.addonRef}/content/icons/favicon-sele.svg`,
    );
}
