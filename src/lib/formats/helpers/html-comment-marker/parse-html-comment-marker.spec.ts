import { describe, expect, it } from 'vitest';
import { parseHtmlCommentMarker } from 'src/lib/formats/helpers/html-comment-marker/parse-html-comment-marker';
import { createHtmlCommentMarker } from 'src/lib/formats/helpers/html-comment-marker/create-html-comment-marker';

describe('parse-delimiter', () => {
    it('case 1', () => {
        const input = createHtmlCommentMarker('3.2', 2);
        const output = ['3.2', '2', '3.2.2'];
        expect(parseHtmlCommentMarker(input)).toEqual(output);
    });
    it('case 2', () => {
        const input = '<!-- section: 3.2.1.1.2 text-->';
        const output = ['3.2.1.1', '2', '3.2.1.1.2'];
        expect(parseHtmlCommentMarker(input)).toEqual(output);
    });
});
