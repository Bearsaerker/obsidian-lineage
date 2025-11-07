import {
    Column,
    Content,
    DocumentMetadata,
    LineageDocument,
    NodeGroup,
    NodeId,
} from 'src/stores/document/document-state-type';
import { id } from 'src/helpers/id';
import { createColumn } from 'src/lib/tree-utils/create/create-column';
import { createGroup } from 'src/lib/tree-utils/create/create-group';
import { TreeNodeWithMeta } from 'src/lib/formats/x-to-json/columns-to-json-with-meta';
import { findGroup } from 'src/lib/formats/json-to-x/json-to-columns';

export const jsonToColumnsWithMeta = (
    tree: TreeNodeWithMeta[],
    parentId = id.rootNode(),
    columns: Column[] = [],
    content: Content = {},
    meta: DocumentMetadata = {},
    level = 0,
) => {
    for (const treeNode of tree) {
        const node: NodeId = id.node();
        content[node] = {
            content: treeNode.content,
        };
        meta[node] = {
            ctime: treeNode.ctime,
        };

        if (!columns[level]) {
            columns.push(createColumn());
        }
        const column = columns[level];
        let group: NodeGroup | undefined;
        group = findGroup(column, parentId);
        if (!group) {
            group = createGroup(parentId);
            column.groups.push(group);
        }
        group.nodes.push(node);
        if (treeNode.children.length > 0) {
            jsonToColumnsWithMeta(
                treeNode.children,
                node,
                columns,
                content,
                meta,
                level + 1,
            );
        }
    }
    return { content, columns, meta } satisfies LineageDocument;
};
