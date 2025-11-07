import { describe, expect, test } from 'vitest';
import { isOutline } from 'src/lib/format-detection/is-outline';
import { outlineExamples } from 'src/lib/formats/test-data/outline-examples';

describe('isOutline', () => {
    test('should return false for an empty string', () => {
        expect(isOutline('')).toBe(false);
    });
    test('should return false for multiple empty lines', () => {
        expect(isOutline(['', '', ''].join('\n'))).toBe(false);
    });

    test('should return true if all lines are bullet points', () => {
        const input = ['- 1', '- 2', '- 3'].join('\n');
        expect(isOutline(input)).toBe(true);
    });

    test('should return true if some lines are empty', () => {
        const input = ['- 1', '', '- 3'].join('\n');
        expect(isOutline(input)).toBe(true);
    });

    test('should return false if all lines are tab-indented bullet points', () => {
        const input = ['\t- 1', '\t- 2', '\t- 3'].join('\n');
        expect(isOutline(input)).toBe(false);
    });

    test('should return true if tab-indented bullet points have a parent', () => {
        const input = ['- 0', '\t- 1', '\t- 2', '\t- 3'].join('\n');
        expect(isOutline(input)).toBe(true);
    });

    test('should return false if sub-items dont have a parent', () => {
        const input = ['  Subitem 1', '  Subitem 2', '  Subitem 3'].join('\n');
        expect(isOutline(input)).toBe(false);
    });

    test('should return true if sub-items have a parent', () => {
        const input = [
            '- parent',
            '  Subitem 1',
            '  Subitem 2',
            '  Subitem 3',
        ].join('\n');
        expect(isOutline(input)).toBe(true);
    });

    test('should return true for a mix of bullet points and subitems', () => {
        const input = [
            '- Bullet 1',
            '  Subitem 1',
            '- Bullet 2',
            '  Subitem 2',
        ].join('\n');
        expect(isOutline(input)).toBe(true);
    });

    test('should return false if there is a line that does not match any regex', () => {
        const input = ['- Bullet 1', 'Invalid line', '- Bullet 2'].join('\n');
        expect(isOutline(input)).toBe(false);
    });

    test('should return false for a single bullet point', () => {
        const input = ['- Bullet 1'].join('\n');
        expect(isOutline(input)).toBe(false);
    });

    for (const [name, data] of Object.entries(outlineExamples)) {
        test(name, () => {
            expect(isOutline(data.outline)).toBe(true);
        });
    }
});
