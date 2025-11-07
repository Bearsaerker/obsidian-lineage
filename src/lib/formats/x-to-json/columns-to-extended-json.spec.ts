import { describe, expect, it } from 'vitest';
import { Column } from 'src/stores/document/document-state-type';
import {
    columnsToExtendedJson,
    TreeNodeWithId,
} from 'src/lib/formats/x-to-json/columns-to-extended-json';

const rootNodeId = 'root';

describe('columns-to-extended-json', () => {
    it('one column', () => {
        const node1 = '1';
        const node2 = '2';
        const column1: Column = {
            id: 'c-1',
            groups: [{ nodes: [node1, node2], parentId: rootNodeId }],
        };
        const output: TreeNodeWithId[] = [
            {
                id: node1,
                content: '',
                children: [],
            },
            {
                id: node2,
                content: '',
                children: [],
            },
        ];
        expect(
            columnsToExtendedJson([column1], {
                [node1]: { content: '' },
                [node2]: { content: '' },
            }),
        ).toEqual(output);
    });
    it('case ', () => {
        const n1 = 'n-lt8wbucz';
        const columns = [
            {
                id: 'c-lt8wbrx2',
                groups: [
                    {
                        parentId: 'r-lt8wbrx1',
                        nodes: [n1],
                    },
                ],
            },
        ];
        const content = {};
        const roots = [{ content: '', children: [], id: n1 }];

        expect(columnsToExtendedJson(columns, content)).toEqual(roots);
    });
});
