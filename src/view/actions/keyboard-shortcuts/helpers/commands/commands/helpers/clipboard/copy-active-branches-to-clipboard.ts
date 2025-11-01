import { getPersistedDocumentFormat } from 'src/obsidian/events/workspace/helpers/get-persisted-document-format';
import { mapBranchesToText } from 'src/view/actions/keyboard-shortcuts/helpers/commands/commands/helpers/clipboard/map-branches-to-text';
import { LineageView } from 'src/view/view';
import { getActiveNodes } from 'src/view/actions/keyboard-shortcuts/helpers/commands/commands/helpers/clipboard/get-active-nodes';

export const copyActiveBranchesToClipboard = async (
    view: LineageView,
    formatted: boolean,
    isInSidebar: boolean,
    formatHeadings: boolean,
) => {
    const nodes = getActiveNodes(view, isInSidebar);
    const documentState = view.documentStore.getValue();
    const text = mapBranchesToText(
        documentState.document,
        nodes,
        formatted ? getPersistedDocumentFormat(view) : 'unformatted-text',
        formatHeadings ? documentState.sections : undefined,
    );
    await navigator.clipboard.writeText(text);
};
