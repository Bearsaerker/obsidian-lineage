import { jsonToColumns } from 'src/lib/data-conversion/json-to-x/json-to-columns';
import { htmlCommentToJson } from 'src/lib/data-conversion/x-to-json/html-comment-to-json';
import { DocumentState } from 'src/stores/document/document-state-type';
import { SavedDocument } from 'src/stores/document/document-store-actions';
import { insertFirstNode } from 'src/lib/tree-utils/insert/insert-first-node';
import invariant from 'tiny-invariant';
import { LineageDocumentFormat } from 'src/stores/settings/settings-type';
import { outlineToJson } from 'src/lib/data-conversion/x-to-json/outline-to-json';
import { htmlElementToJson } from 'src/lib/data-conversion/x-to-json/html-element-to-json';
import { TreeNodeWithMeta } from 'src/lib/data-conversion/x-to-json/columns-to-json-with-meta';

export type LoadJSONDocumentAction = {
    type: 'document/file/load-from-disk';
    payload: {
        activeSection: string | null;
        nodes?: TreeNodeWithMeta[];
    };
};

export type LoadDocumentAction = {
    type: 'document/file/load-from-disk';
    payload: {
        activeSection: string | null;
        document: SavedDocument;
        format: LineageDocumentFormat;
    };
};

export const loadDocumentFromFile = (
    state: DocumentState,
    action: LoadDocumentAction,
) => {
    const tree =
        action.payload.format === 'outline'
            ? outlineToJson(action.payload.document.data)
            : action.payload.format === 'html-element'
              ? htmlElementToJson(action.payload.document.data)
              : htmlCommentToJson(action.payload.document.data);
    const document = jsonToColumns(tree);
    state.document.columns = document.columns;
    state.document.content = document.content;
    const emptyTree = tree.length === 0;
    if (emptyTree) {
        insertFirstNode(state.document.columns, state.document.content);
    }
    if (action.type === 'document/file/load-from-disk')
        state.file.frontmatter = action.payload.document.frontmatter;
    const activeNode = state.document.columns[0].groups[0].nodes[0];
    invariant(activeNode);

    return activeNode;
};
