import { parseHtmlCommentMarker } from 'src/lib/formats/helpers/html-comment-marker/parse-html-comment-marker';
import { TreeNode } from 'src/lib/formats/x-to-json/columns-to-json';
import {
    addNewNode,
    State,
    updateCurrentNode,
} from 'src/lib/formats/x-to-json/outline-to-json';
import { findHighestHeadingLevel } from 'src/lib/formats/helpers/find-highest-heading-level';

type ExtendedState = State & {
    isInCodeBlock: boolean;
};
export const headingsToJson = (input: string): TreeNode[] => {
    const lines = input.split('\n');
    const highestHeadingLevel = findHighestHeadingLevel(lines);
    const state: ExtendedState = {
        currentParents: {},
        currentNode: null,
        tree: [],
        isInCodeBlock: false,
    };

    for (const line of lines) {
        if (parseHtmlCommentMarker(line))
            throw new Error('input has a section');
        if (line.startsWith('```')) {
            state.isInCodeBlock = !state.isInCodeBlock;
        }

        const match = state.isInCodeBlock ? null : line.match(/^(#+) (.+)/);
        if (match) {
            const level = match[1].length;

            addNewNode(state, level, line, highestHeadingLevel);
        } else {
            updateCurrentNode(state, line);
        }
    }

    return state.tree;
};
