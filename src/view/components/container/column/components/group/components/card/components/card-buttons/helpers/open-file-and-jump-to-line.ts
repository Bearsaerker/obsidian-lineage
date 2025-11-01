import { MarkdownView, TFile, WorkspaceLeaf } from 'obsidian';
import { setViewType } from 'src/stores/settings/actions/set-view-type';
import { getExistingRightTabGroup } from 'src/view/components/container/column/components/group/components/card/components/content/event-handlers/handle-links/helpers/get-existing-right-tab-group';
import Lineage from 'src/main';
import { getLinkPaneType } from 'src/view/components/container/column/components/group/components/card/components/content/event-handlers/handle-links/block-link/handle-global-block-link';

const getLeafFromExistingTabGroup = (plugin: Lineage) => {
    const rightTabGroup = getExistingRightTabGroup(plugin);
    if (!rightTabGroup) return null;
    const workspace = plugin.app.workspace;
    if (
        !(
            'createLeafInTabGroup' in workspace &&
            typeof workspace.createLeafInTabGroup === 'function'
        )
    )
        return null;
    return workspace.createLeafInTabGroup(
        rightTabGroup,
    ) as WorkspaceLeaf | null;
};

export const openFileAndJumpToLine = async (
    plugin: Lineage,
    file: TFile,
    line: number,
    ch: number,
    modKey: boolean,
) => {
    const paneType = getLinkPaneType(plugin, modKey);
    let leaf: null | WorkspaceLeaf;
    if (paneType === 'split') {
        leaf = getLeafFromExistingTabGroup(plugin);
        if (!leaf) {
            leaf = plugin.app.workspace.getLeaf('split');
        }
    } else {
        leaf = plugin.app.workspace.getLeaf('tab');
    }
    setViewType(plugin, file.path, 'markdown');
    await leaf.openFile(file);
    const markdownView = leaf.view as MarkdownView;
    markdownView.editor.setCursor({ line, ch });
    setViewType(plugin, file.path, 'lineage');
};
