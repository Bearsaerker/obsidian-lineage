import { headingsToJson } from 'src/lib/formats/x-to-json/headings-to-json';
import { jsonToHtmlComment } from 'src/lib/formats/json-to-x/json-to-html-comment';
import { correctHeadings } from 'src/lib/formats/helpers/correct-headings';

export const headingsToHtmlComment = (input: string): string => {
    const tree = headingsToJson(correctHeadings(input));
    if (tree.length === 1 && tree[0].children.length === 0) return input;
    return jsonToHtmlComment(tree);
};
