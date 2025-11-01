import { openFileInExistingRightTabGroup } from 'src/view/components/container/column/components/group/components/card/components/content/event-handlers/handle-links/helpers/open-file-in-existing-right-tab-group';
import { getLinkPaneType } from 'src/view/components/container/column/components/group/components/card/components/content/event-handlers/handle-links/block-link/handle-global-block-link';
import Lineage from 'src/main';

export const handleFileLink = (
    plugin: Lineage,
    activeFilePath: string,
    link: string,
    modKey: boolean,
) => {
    if (!link || !activeFilePath) return;
    const paneType = getLinkPaneType(plugin, modKey);
    if (paneType === 'tab') {
        plugin.app.workspace.openLinkText(link, activeFilePath, 'tab');
    } else {
        const success = openFileInExistingRightTabGroup(
            plugin,
            link,
            activeFilePath,
        );
        if (!success) {
            plugin.app.workspace.openLinkText(link, activeFilePath, 'split');
        }
    }
};
