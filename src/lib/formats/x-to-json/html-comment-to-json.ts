import { parseHtmlCommentMarker } from 'src/lib/formats/helpers/html-comment-marker/parse-html-comment-marker';
import { TreeNode } from 'src/lib/formats/x-to-json/columns-to-json';
import { lang } from 'src/lang/lang';

export const getDepthLevel = (number: string) => {
    if (number.includes('.')) {
        return number.split('.').length;
    } else return /\d+/.test(number) ? 1 : 0;
};

export const trimCurrentNode = (node: TreeNode | undefined) => {
    if (node) {
        node.content = node.content.trim();
    }
};

export const htmlCommentToJson = (text: string) => {
    const lines = text.split('\n');

    const map: Record<string, TreeNode> = {};
    const tree: TreeNode[] = [];
    let currentNode: TreeNode | null = null;

    let currentParentNumber = '';
    for (const line of lines) {
        const sectionNumber = parseHtmlCommentMarker(line);
        if (sectionNumber) {
            const [parent, , full] = sectionNumber;
            const isASibling = parent === currentParentNumber;

            const newNode = {
                content: '',
                children: [],
            };
            map[full] = newNode;
            if (isASibling) {
                if (currentNode) trimCurrentNode(currentNode);
                const parentNode = map[parent];
                if (parentNode) {
                    parentNode.children.push(newNode);
                } else {
                    tree.push(newNode);
                }
                currentNode = newNode;
            } else {
                const isChild =
                    getDepthLevel(parent) > getDepthLevel(currentParentNumber);
                if (isChild) {
                    if (!currentNode) {
                        throw new Error(lang.error_parent_not_found(full));
                    }
                    trimCurrentNode(currentNode);
                    currentNode.children.push(newNode);
                    currentNode = newNode;
                } else {
                    if (!parent) {
                        if (currentNode) trimCurrentNode(currentNode);
                        tree.push(newNode);
                        currentNode = newNode;
                    } else {
                        const parentNode = map[parent];
                        if (!parentNode) {
                            throw new Error(lang.error_parent_not_found(full));
                        }
                        if (currentNode) trimCurrentNode(currentNode);
                        parentNode.children.push(newNode);
                        currentNode = newNode;
                    }
                }
            }
            currentParentNumber = parent;
        } else {
            if (currentNode) {
                if (currentNode.content) currentNode.content += '\n';
                currentNode.content += line;
            } else if (line.trim()) {
                currentNode = {
                    content: line,
                    children: [],
                };
                tree.push(currentNode);
            }
        }
    }
    return tree;
};
