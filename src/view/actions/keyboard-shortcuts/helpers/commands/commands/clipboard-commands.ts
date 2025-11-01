import { copyActiveBranchesToClipboard } from 'src/view/actions/keyboard-shortcuts/helpers/commands/commands/helpers/clipboard/copy-active-branches-to-clipboard';
import { cutNode } from 'src/view/actions/keyboard-shortcuts/helpers/commands/commands/helpers/cut-node';
import { pasteNode } from 'src/view/actions/keyboard-shortcuts/helpers/commands/commands/helpers/paste-node';
import { copyActiveNodesToClipboard } from 'src/view/actions/keyboard-shortcuts/helpers/commands/commands/helpers/clipboard/copy-active-nodes-to-clipboard';
import { DefaultViewCommand } from 'src/view/actions/keyboard-shortcuts/helpers/commands/default-view-hotkeys';

export const clipboardCommands = () => {
    return [
        {
            name: 'copy_node',
            callback: async (view, event) => {
                const selectedText = activeWindow.getSelection()?.toString();
                if (selectedText && selectedText.length > 0) {
                    return;
                }
                event.preventDefault();
                copyActiveBranchesToClipboard(
                    view,
                    !view.isTree,
                    false,
                    view.isTree,
                );
            },
            hotkeys: [
                { key: 'C', modifiers: ['Mod'], editorState: 'editor-off' },
            ],
        },
        {
            name: 'copy_node_unformatted',
            callback: async (view, event) => {
                event.preventDefault();
                copyActiveBranchesToClipboard(view, false, false, view.isTree);
            },
            hotkeys: [
                {
                    key: 'C',
                    modifiers: ['Mod', 'Alt'],
                    editorState: 'editor-off',
                },
            ],
        },
        {
            name: 'copy_node_without_subitems',
            callback: async (view, event) => {
                event.preventDefault();
                copyActiveNodesToClipboard(view, false);
            },
            hotkeys: [
                {
                    key: 'C',
                    modifiers: ['Mod', 'Shift'],
                    editorState: 'editor-off',
                },
            ],
        },
        {
            name: 'cut_node',
            callback: async (view, event) => {
                event.preventDefault();
                cutNode(view);
            },
            hotkeys: [
                { key: 'X', modifiers: ['Mod'], editorState: 'editor-off' },
            ],
        },
        {
            name: 'paste_node',
            callback: async (view, event) => {
                event.preventDefault();
                pasteNode(view);
            },
            hotkeys: [
                {
                    key: 'V',
                    modifiers: ['Mod'],
                    editorState: 'editor-off',
                },
            ],
        },
    ] satisfies DefaultViewCommand[];
};
