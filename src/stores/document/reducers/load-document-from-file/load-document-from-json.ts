import { jsonToColumnsWithMeta } from 'src/lib/data-conversion/json-to-x/json-to-columns-with-meta';
import { TreeNodeWithMeta } from 'src/lib/data-conversion/x-to-json/columns-to-json-with-meta';
import { insertFirstNode } from 'src/lib/tree-utils/insert/insert-first-node';
import { DocumentState } from 'src/stores/document/document-state-type';
import invariant from 'tiny-invariant';

export const loadDocumentFromJSON = (
    state: DocumentState,
    nodes: TreeNodeWithMeta[],
) => {
    const document = jsonToColumnsWithMeta(nodes);
    state.document.columns = document.columns;
    state.document.content = document.content;
    if (document.meta) {
        state.document.meta = document.meta;
    }
    const emptyTree = nodes.length === 0;
    if (emptyTree) {
        insertFirstNode(state.document.columns, state.document.content);
    }
    const activeNode = state.document.columns[0].groups[0].nodes[0];
    invariant(activeNode);

    return activeNode;
};
