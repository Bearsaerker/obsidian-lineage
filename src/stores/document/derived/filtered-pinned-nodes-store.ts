import { LineageView } from 'src/view/view';
import { derived } from 'svelte/store';
import { get } from 'svelte/store';

export const FilteredPinnedNodesStore = (view: LineageView) => {
    const documentPinnedNodes = derived(
        view.documentStore,
        (state) => state.pinnedNodes,
    );
    const viewActiveCategory = derived(
        view.viewStore,
        (state) => state.pinnedNodes.activeCategory,
    );
    const settingsGlobalCategories = derived(
        view.plugin.settings,
        (state) => state.categories.globalCategories,
    );

    return derived(
        [documentPinnedNodes, viewActiveCategory, settingsGlobalCategories],
        ([pinnedNodes, activeCategory, globalCategories]) => {
            // Merge global and file-specific categories
            const allCategories = Array.from(
                new Set([...globalCategories, ...pinnedNodes.fileCategories]),
            );

            let filteredIds = pinnedNodes.Ids;

            if (activeCategory === 'uncategorized') {
                // Show only nodes without a category
                filteredIds = pinnedNodes.Ids.filter(
                    (id: string) => !pinnedNodes.nodeToCategory[id],
                );
            } else if (activeCategory !== 'all') {
                // Show only nodes with the selected category
                filteredIds = pinnedNodes.Ids.filter(
                    (id: string) => pinnedNodes.nodeToCategory[id] === activeCategory,
                );
            }

            return {
                nodes: filteredIds,
                categories: allCategories,
            };
        },
    );
};
