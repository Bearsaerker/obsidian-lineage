import { splitByParagraph } from 'src/lib/formats/x-to-html-comment/paragraphs-to-html-comment';

export const hasNParagraph = (text: string, n = 2) =>
    splitByParagraph(text).length >= n;
