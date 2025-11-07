import { jsonToHtmlComment } from 'src/lib/formats/json-to-x/json-to-html-comment';
import { outlineToJson } from 'src/lib/formats/x-to-json/outline-to-json';

export const outlineToHtmlComment = (input: string): string => {
    const tree = outlineToJson(input);
    if (tree.length === 1 && tree[0].children.length === 0) return input;
    return jsonToHtmlComment(tree);
};
