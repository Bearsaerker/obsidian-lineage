import { getExistingRightTabGroup } from 'src/view/components/container/column/components/group/components/card/components/content/event-handlers/handle-links/helpers/get-existing-right-tab-group';
import { WorkspaceLeaf } from 'obsidian';
import Lineage from 'src/main';

export const openFileInExistingRightTabGroup = (
    plugin: Lineage,
    link: string,
    activeFilePath: string,
): boolean => {
    const rightTabGroup = getExistingRightTabGroup(plugin);
    if (!rightTabGroup) return false;
    const workspace = plugin.app.workspace;
    if (
        !(
            'createLeafInTabGroup' in workspace &&
            typeof workspace.createLeafInTabGroup === 'function'
        )
    )
        return false;
    const newLeaf = workspace.createLeafInTabGroup(
        rightTabGroup,
    ) as WorkspaceLeaf | null;
    if (newLeaf) {
        if (link.contains('#')) {
            plugin.app.workspace.openLinkText(
                link,
                activeFilePath,
                'split',
                newLeaf.getViewState(),
            );
        } else {
            const linkedFile = plugin.app.metadataCache.getFirstLinkpathDest(
                link,
                activeFilePath,
            );
            if (linkedFile) {
                newLeaf.openFile(linkedFile);
                workspace.setActiveLeaf(newLeaf);
                return true;
            }
        }
    }
    return false;
};
