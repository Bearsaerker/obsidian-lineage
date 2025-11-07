import { parseHtmlCommentMarker } from 'src/lib/formats/helpers/html-comment-marker/parse-html-comment-marker';
import { TreeNode } from 'src/lib/formats/x-to-json/columns-to-json';

export type State = {
    currentParents: Record<string, TreeNode>;
    currentNode: null | TreeNode;
    tree: TreeNode[];
};

export const addNewNode = (
    state: State,
    level: number,
    text: string,
    root = 1,
) => {
    state.currentNode = {
        content: text,
        children: [],
    };

    // remove parents that have a higher level (e.g, when going from H4 to H2, H3-H6 are deleted)
    for (const key of Object.keys(state.currentParents)) {
        const parentLevel = +key;
        if (parentLevel >= level) {
            delete state.currentParents[key];
        }
    }

    if (level === root) {
        state.tree.push(state.currentNode);
    }
    state.currentParents[level] = state.currentNode;
    const parent = state.currentParents[level - 1];
    if (parent) {
        parent.children.push(state.currentNode);
    } else if (level > root)
        throw new Error(`Item [${text}] does not have a parent`);
};

export const updateCurrentNode = (state: State, text: string) => {
    if (state.currentNode) {
        if (state.currentNode.content) state.currentNode.content += '\n';
        state.currentNode.content += text;
    } else if (text.trim()) {
        state.currentNode = {
            content: text,
            children: [],
        };
        state.tree.push(state.currentNode);
    }
};

export const outlineToJson = (input: string): TreeNode[] => {
    const lines = input.split('\n');
    const state: State = {
        currentParents: {},
        currentNode: null,
        tree: [],
    };

    for (const line of lines) {
        if (parseHtmlCommentMarker(line))
            throw new Error('Outline has a section annotation');

        const outlineMatch = line.match(/^(\t*)- (.*)/);
        if (outlineMatch) {
            const level = outlineMatch[1].length + 1;
            addNewNode(state, level, outlineMatch[2]);
        } else {
            updateCurrentNode(state, line.replace(/^\t* {2}|/g, ''));
        }
    }

    return state.tree;
};
