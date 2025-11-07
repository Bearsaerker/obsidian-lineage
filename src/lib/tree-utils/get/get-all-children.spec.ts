import { describe, expect, it } from 'vitest';
import { wikipedia_cobol } from 'src/lib/formats/test-data/wikipedia_cobol';
import { getAllChildren } from 'src/lib/tree-utils/get/get-all-children';

describe('getAllChildren', () => {
    it('case 1', () => {
        const input = wikipedia_cobol.columns.columns;

        const children = getAllChildren(input, 'ntA9Uyzei');
        expect(children.length).toBe(33);
    });
    it('case 2', () => {
        const input = wikipedia_cobol.columns.columns;

        const children = getAllChildren(input, 'ne2Y8QW2Y');
        expect(children.length).toBe(0);
    });
});
