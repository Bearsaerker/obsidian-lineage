import {
    Columns,
    Content,
    DocumentMetadata,
} from 'src/stores/document/document-state-type';

const createTreeNode = (content = '', ctime = -1): TreeNodeWithMeta => {
    return {
        ctime,
        content: content.trim(),
        children: [],
    };
};

export type TreeNodeWithMeta = {
    content: string;
    children: TreeNodeWithMeta[];
    ctime: number;
};

export const columnsToJsonWithMeta = (
    columns: Columns,
    content: Content,
    meta: DocumentMetadata,
) => {
    const nodeMap: { [id: string]: TreeNodeWithMeta } = {};
    for (const column of columns) {
        for (const group of column.groups) {
            for (const node of group.nodes) {
                const treeNode = createTreeNode(
                    content[node]?.content,
                    meta[node]?.ctime ?? -1,
                );
                let parentNode: TreeNodeWithMeta = nodeMap[group.parentId];
                if (!parentNode) {
                    parentNode = createTreeNode(group.parentId);
                    nodeMap[group.parentId] = parentNode;
                }
                parentNode.children.push(treeNode);
                nodeMap[node] = treeNode;
            }
        }
    }

    const roots: TreeNodeWithMeta[] = [];
    if (columns[0])
        for (const group of columns[0].groups) {
            for (const node of group.nodes) {
                const treeNode = nodeMap[node];
                if (treeNode) {
                    roots.push(treeNode);
                } else {
                    throw new Error(`could not find node ${node}`);
                }
            }
        }

    return roots;
};
