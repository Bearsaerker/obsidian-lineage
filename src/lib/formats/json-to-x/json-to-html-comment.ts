import { TreeNode } from 'src/lib/formats/x-to-json/columns-to-json';
import {
    createHtmlCommentMarker,
    level,
} from 'src/lib/formats/helpers/html-comment-marker/create-html-comment-marker';

export const jsonToHtmlComment = (
    tree: TreeNode[],
    parentNumber = '',
    text = '',
    includeStructure = true,
) => {
    for (let i = 0; i < tree.length; i++) {
        const node = tree[i];
        const content = node.content;
        const index = i + 1;
        if (text) text = text + (includeStructure ? '\n' : '\n\n');
        if (includeStructure) {
            text +=
                createHtmlCommentMarker(parentNumber, index) + '\n' + content;
        } else {
            text += content;
        }
        if (node.children.length > 0) {
            text = jsonToHtmlComment(
                node.children,
                level(parentNumber, index),
                text,
                includeStructure,
            );
        }
    }
    return text;
};
