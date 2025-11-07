import { describe, expect, test } from 'vitest';
import { outlineToHtmlComment } from 'src/lib/formats/x-to-html-comment/outline-to-html-comment';
import { outlineExamples } from 'src/lib/formats/test-data/outline-examples';

describe('outlineToHtmlComment', () => {
    for (const [name, data] of Object.entries(outlineExamples)) {
        test(name, () => {
            expect(outlineToHtmlComment(data.outline)).toEqual(data.sections);
        });
    }

    test('has a section', () => {
        const input = [
            '- 1',
            '\t- 1.1',
            '<!--section: 1.2-->',
            '\t\t- 1.2',
            '- 2',
            '- 3',
            '\t- 3.1',
        ];
        expect(() => outlineToHtmlComment(input.join('\n'))).toThrowError(
            'Outline has a section annotation',
        );
    });
});
