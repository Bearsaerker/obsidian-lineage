import { createNewFile } from 'src/obsidian/events/workspace/effects/create-new-file';
import { openFile } from 'src/obsidian/events/workspace/effects/open-file';
import { onPluginError } from 'src/lib/store/on-plugin-error';
import { mapDocumentToText } from 'src/obsidian/commands/helpers/export-document/map-document-to-text';
import { getPersistedDocumentFormat } from 'src/obsidian/events/workspace/helpers/get-persisted-document-format';
import { LineageView } from 'src/view/view';
import { saveNodeContent } from 'src/view/actions/keyboard-shortcuts/helpers/commands/commands/helpers/save-node-content';
import { clone } from 'src/helpers/clone';
import { jsonToText } from 'src/lib/data-conversion/json-to-x/json-to-text';
import { columnsToJson } from 'src/lib/data-conversion/x-to-json/columns-to-json';
import { formatHeadings } from 'src/stores/document/reducers/content/format-content/format-headings';

export const exportDocument = async (view: LineageView) => {
    try {
        const file = view.file;
        if (!file) return;
        if (!file.parent) return;

        const viewState = view.viewStore.getValue();
        const isEditing = Boolean(viewState.document.editing.activeNodeId);
        if (isEditing) {
            saveNodeContent(view);
            setTimeout(() => {
                exportDocument(view);
            }, 100);
            return;
        }
        let output: string;
        if (view.isTree) {
            const state = clone(view.documentStore.getValue());
            formatHeadings(state.document.content, state.sections);
            output = jsonToText(
                columnsToJson(state.document.columns, state.document.content),
            );
        } else {
            const fileData = await view.plugin.app.vault.read(file);
            const format = getPersistedDocumentFormat(view);
            output = mapDocumentToText(fileData, format);
        }
        const newFile = await createNewFile(
            view.plugin,
            file.parent,
            output,
            file.basename,
        );
        if (newFile) {
            await openFile(view.plugin, newFile, 'split');
        }
    } catch (e) {
        onPluginError(e, 'command', { type: 'export-document' });
    }
};
