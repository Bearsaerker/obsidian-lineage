import { PinnedNodesState } from 'src/stores/document/document-state-type';

export type SetCategoryAction = {
    type: 'document/pinned-nodes/set-category';
    payload: {
        id: string;
        category: string;
    };
};

export const setCategory = (
    pinnedNodes: PinnedNodesState,
    id: string,
    category: string,
) => {
    pinnedNodes.nodeToCategory[id] = category;
    // Ensure the category exists in fileCategories
    if (
        pinnedNodes.fileCategories &&
        !pinnedNodes.fileCategories.includes(category)
    ) {
        pinnedNodes.fileCategories.push(category);
    }
};
