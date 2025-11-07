import { describe, expect, it } from 'vitest';
import { TreeNode } from 'src/lib/formats/x-to-json/columns-to-json';
import { jsonToHtmlComment } from 'src/lib/formats/json-to-x/json-to-html-comment';

import { createHtmlCommentMarker } from 'src/lib/formats/helpers/html-comment-marker/create-html-comment-marker';
import { ginkgo_welcome } from 'src/lib/formats/test-data/ginkgo_welcome';
import { ginkgo_academic_paper } from 'src/lib/formats/test-data/ginkgo_acedemic_paper';

describe('json to html comment', () => {
    it('case 1', () => {
        const input: TreeNode[] = [
            {
                content: 'one',
                children: [{ content: 'one > one', children: [] }],
            },
        ];
        const output = [
            createHtmlCommentMarker('', 1),
            'one',
            createHtmlCommentMarker('1', 1),
            'one > one',
        ];
        expect(jsonToHtmlComment(input)).toEqual(output.join('\n'));
    });
    it('case 1', () => {
        const input: TreeNode[] = [
            {
                content: 'one',
                children: [
                    {
                        content: 'one > one',
                        children: [
                            { content: 'one > one > one', children: [] },
                        ],
                    },
                ],
            },
            {
                content: 'two',
                children: [
                    {
                        content: 'two > one',
                        children: [
                            { content: 'two > one > one', children: [] },
                        ],
                    },
                ],
            },
        ];
        const output = [
            createHtmlCommentMarker('', 1),
            'one',
            createHtmlCommentMarker('1', 1),
            'one > one',
            createHtmlCommentMarker('1.1', 1),
            'one > one > one',
            createHtmlCommentMarker('', 2),
            'two',
            createHtmlCommentMarker('2', 1),
            'two > one',
            createHtmlCommentMarker('2.1', 1),
            'two > one > one',
        ];
        expect(jsonToHtmlComment(input)).toEqual(output.join('\n'));
    });

    it('ginkgo_welcome', () => {
        const { annotatedMd, json } = ginkgo_welcome;
        const actual = jsonToHtmlComment(json);
        expect(actual).toEqual(annotatedMd);
    });

    it('ginkgo_academic_paper', () => {
        const { annotatedMd, json } = ginkgo_academic_paper;
        const actual = jsonToHtmlComment(json);
        expect(actual).toEqual(annotatedMd);
    });
});
