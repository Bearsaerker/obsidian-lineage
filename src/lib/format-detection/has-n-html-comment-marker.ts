import { parseHtmlCommentMarker } from 'src/lib/formats/helpers/html-comment-marker/parse-html-comment-marker';

export const hasNHtmlCommentMarker = (input: string, n = 2): boolean => {
    const lines = input.split('\n');
    let count = 0;
    for (const line of lines) {
        if (parseHtmlCommentMarker(line)) {
            count++;
            if (count >= n) return true;
        }
    }
    return false;
};
