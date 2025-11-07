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

describe('headings.self', () => {
    test('headings of self ends with cobol', () => {
        const rule: StyleRule = {
            id: 'srpjP0rS0X',
            name: '',
            enabled: true,
            condition: {
                type: 'condition',
                scope: 'self',
                property: 'headings',
                operator: 'ends-with',
                value: 'cobol',
                enabled: true,
            },
            style: {
                color: '#fb7979',
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
        expect(result.nodeStyles.size).toBe(2);
    });

    test('headings of self matches regex cob.l', () => {
        const rule: StyleRule = {
            id: 'srpjP0rS0X',
            name: '',
            enabled: true,
            condition: {
                type: 'condition',
                scope: 'self',
                property: 'headings',
                operator: 'matches-regex',
                value: 'cob.l',
                enabled: true,
            },
            style: {
                color: '#fb7979',
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
        expect(result.nodeStyles.size).toBe(4);
    });
});
