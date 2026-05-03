import { LineageView } from 'src/view/view';
import { MenuItemObject } from 'src/obsidian/context-menu/render-context-menu';
import { lang } from 'src/lang/lang';
import { copyLinkToBlock } from 'src/view/actions/context-menu/card-context-menu/helpers/copy-link-to-block';
import { copyActiveNodesToClipboard } from 'src/view/actions/keyboard-shortcuts/helpers/commands/commands/helpers/clipboard/copy-active-nodes-to-clipboard';
import { persistPinnedNodes } from 'src/stores/view/subscriptions/actions/persist-pinned-nodes';
import { NewCategoryModal } from 'src/view/modals/new-category-modal/new-category-modal';

export const togglePinNode = (
    view: LineageView,
    activeNode: string,
    isPinned: boolean,
    isInSidebar: boolean,
) => {
    const viewState = view.viewStore.getValue();
    const id = isInSidebar ? viewState.pinnedNodes.activeNode : activeNode;
    view.documentStore.dispatch({
        type: isPinned
            ? 'document/pinned-nodes/unpin'
            : 'document/pinned-nodes/pin',
        payload: { id: id },
    });
};

const createCategorySubmenu = (
    view: LineageView,
    activeNode: string,
): MenuItemObject[] => {
    const documentState = view.documentStore.getValue();
    const settingsState = view.plugin.settings.getValue();
    const pinnedNodes = documentState.pinnedNodes;
    const globalCategories = settingsState.categories.globalCategories;
    const fileCategories = pinnedNodes.fileCategories;
    const allCategories = Array.from(
        new Set([...globalCategories, ...fileCategories]),
    );
    const currentCategory = pinnedNodes.nodeToCategory[activeNode];

    const items: MenuItemObject[] = [];

    // Add existing categories
    for (const category of allCategories) {
        items.push({
            title: category,
            icon: 'tag',
            checked: currentCategory === category,
            action: () => {
                if (currentCategory === category) {
                    // Remove category if already assigned
                    view.documentStore.dispatch({
                        type: 'document/pinned-nodes/remove-category',
                        payload: { id: activeNode },
                    });
                } else {
                    view.documentStore.dispatch({
                        type: 'document/pinned-nodes/set-category',
                        payload: { id: activeNode, category },
                    });
                }
                persistPinnedNodes(view);
            },
        });
    }

    // Add separator before "Create new"
    if (items.length > 0) {
        items.push({ type: 'separator' });
    }

    // Add "Create new category" option
    items.push({
        title: lang.cm_create_category,
        icon: 'plus',
        action: async () => {
            const modal = new NewCategoryModal({ plugin: view.plugin });
            const name = await modal.open();
            if (name && name.trim()) {
                const trimmedName = name.trim();
                // Check if it's a file-specific category (not global)
                if (!globalCategories.includes(trimmedName)) {
                    view.documentStore.dispatch({
                        type: 'document/pinned-nodes/add-category',
                        payload: { name: trimmedName },
                    });
                }
                view.documentStore.dispatch({
                    type: 'document/pinned-nodes/set-category',
                    payload: { id: activeNode, category: trimmedName },
                });
                persistPinnedNodes(view);
            }
        },
    });

    // Add "Remove category" option if node has one
    if (currentCategory) {
        items.push({ type: 'separator' });
        items.push({
            title: lang.cm_remove_category,
            icon: 'trash-2',
            action: () => {
                view.documentStore.dispatch({
                    type: 'document/pinned-nodes/remove-category',
                    payload: { id: activeNode },
                });
                persistPinnedNodes(view);
            },
        });

        // Add "Delete category" option (only for file-specific categories)
        // Global categories can never be deleted
        const isGlobalCategory = globalCategories.includes(currentCategory);
        if (!isGlobalCategory) {
            items.push({
                title: lang.cm_delete_category,
                icon: 'trash-2',
                dangerous: true,
                action: () => {
                    view.documentStore.dispatch({
                        type: 'document/pinned-nodes/delete-category',
                        payload: { name: currentCategory },
                    });
                    // Reset active category if it was the deleted one
                    const viewState = view.viewStore.getValue();
                    if (viewState.pinnedNodes.activeCategory === currentCategory) {
                        view.viewStore.dispatch({
                            type: 'view/pinned-nodes/set-active-category',
                            payload: { category: 'all' },
                        });
                    }
                    persistPinnedNodes(view);
                },
            });
        }
    }

    return items;
};

type Props = {
    activeNode: string;
    isPinned: boolean;
    isInRecentCardsList: boolean;
};
export const createSidebarContextMenuItems = (
    view: LineageView,
    { isPinned, activeNode, isInRecentCardsList }: Props,
) => {
    const menuItems: MenuItemObject[] = [
        {
            title: lang.cm_copy_link_to_block,
            icon: 'links-coming-in',
            action: () => copyLinkToBlock(view, true),
        },
        { type: 'separator' },
        {
            title: lang.cm_copy,
            icon: 'documents',
            action: () => copyActiveNodesToClipboard(view, true),
        },

        { type: 'separator' },
        {
            title: lang.cm_category,
            icon: 'tag',
            submenu: createCategorySubmenu(view, activeNode),
        },
        { type: 'separator' },
        {
            title: isPinned
                ? lang.cm_unpin_from_left_sidebar
                : lang.cm_pin_in_left_sidebar,
            icon: isPinned ? 'pin-off' : 'pin',
            action: () => togglePinNode(view, activeNode, isPinned, true),
            disabled: isInRecentCardsList,
        },
        { type: 'separator' },
    ];
    return menuItems;
};
