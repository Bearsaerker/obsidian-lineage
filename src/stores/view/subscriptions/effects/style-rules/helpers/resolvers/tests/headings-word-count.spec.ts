import { describe, expect, test } from 'vitest';
import { StyleRule } from 'src/stores/settings/types/style-rules-types';
import { processStyleRules } from '../../process-style-rules';
import { wikipedia_cobol } from 'src/lib/formats/test-data/wikipedia_cobol';
import { TargetNodeResolver } from 'src/stores/view/subscriptions/effects/style-rules/helpers/resolvers/target-node-resolver';
import { NodePropertyResolver } from 'src/stores/view/subscriptions/effects/style-rules/helpers/resolvers/node-property-resolver/node-property-resolver';

const propertyResolver = new TargetNodeResolver(
    wikipedia_cobol.columns.columns,
);
const nodeResolver = new NodePropertyResolver(
    wikipedia_cobol.columns.columns,
    wikipedia_cobol.columns.content,
);

describe('headings-word-count.self', () => {
    test('word count of node headings is between 2 and 5', () => {
        const rule: StyleRule = {
            id: 'sr-5UR6G6b',
            name: 'Test Rule',
            enabled: true,
            condition: {
                type: 'condition',
                scope: 'self',
                property: 'headings-word-count',
                operator: 'between',
                value: 2,
                valueB: 3,
                enabled: true,
            },
            style: {
                color: '#000000',
                styleVariant: 'left-border',
            },
            priority: 0,
        };

        const result = processStyleRules(
            wikipedia_cobol.columns,
            [rule],
            nodeResolver,
            propertyResolver,
        );
        expect(result.nodeStyles.size).toBe(23);
    });
});
