import { TreeNode } from 'src/lib/formats/x-to-json/columns-to-json';
import { jsonToHtmlComment } from 'src/lib/formats/json-to-x/json-to-html-comment';

export const splitByParagraph = (text: string): string[] => {
    const codeBlockRegex = /```[\s\S]*?```/g;
    const codeBlocks: string[] = [];

    const textWithPlaceholders = text.replace(codeBlockRegex, (match) => {
        codeBlocks.push(match);
        return `__CODE_BLOCK_${codeBlocks.length - 1}__`;
    });

    const paragraphs = textWithPlaceholders
        .split(/\n\s*\n/)
        .map((paragraph) => {
            return paragraph.replace(
                /__CODE_BLOCK_(\d+)__/g,
                (_, index) => codeBlocks[+index],
            );
        });

    return paragraphs;
};

export const paragraphsToHtmlComment = (input: string) => {
    const paragraphs = splitByParagraph(input);
    if (paragraphs.length === 1) return input;
    const tree = paragraphs.map((p) => ({
        content: p,
        children: [],
    })) satisfies TreeNode[];
    return jsonToHtmlComment(tree);
};
