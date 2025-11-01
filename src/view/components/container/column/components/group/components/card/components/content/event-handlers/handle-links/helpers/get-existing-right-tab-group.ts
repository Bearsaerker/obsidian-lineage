import Lineage from 'src/main';
import invariant from 'tiny-invariant';

export const getExistingRightTabGroup = (plugin: Lineage) => {
    const rootSplit = plugin.app.workspace.rootSplit;
    if (!('children' in rootSplit)) return;

    const activeView = plugin.app.workspace.activeLeaf?.view;
    invariant(activeView);
    const viewTabGroup =
        'parent' in activeView.leaf ? activeView.leaf.parent : null;
    if (!viewTabGroup || !(typeof viewTabGroup === 'object')) return;
    if (!('type' in viewTabGroup && viewTabGroup.type === 'tabs')) return;
    const children = rootSplit['children'];
    if (children && Array.isArray(children)) {
        const viewTabGroupIndex = children.findIndex(
            (group) => viewTabGroup === group,
        );
        if (viewTabGroupIndex !== -1) {
            return children[viewTabGroupIndex + 1];
        }
    }
};
