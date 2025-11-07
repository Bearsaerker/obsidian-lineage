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

describe('depth.self', () => {
    test('depth greater than', () => {
        const rule: StyleRule = {
            id: 'srX_voIZrM',
            name: 'Test Rule',
            enabled: true,
            condition: {
                type: 'condition',
                scope: 'self',
                property: 'depth',
                operator: 'greater-than',
                value: 3,
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
        expect(result.nodeStyles.size).toBe(5);
    });

    test('depth is between', () => {
        const rules = [
            {
                id: 'srQWt9H--c',
                name: '',
                enabled: true,
                condition: {
                    type: 'condition',
                    scope: 'self',
                    property: 'depth',
                    operator: 'between',
                    value: 1,
                    enabled: true,
                    valueB: 3,
                },
                style: {
                    color: '#fafafa',
                    styleVariant: 'left-border',
                },
                priority: 0,
            },
        ] satisfies StyleRule[];

        const result = processStyleRules(
            wikipedia_cobol.columns,
            rules,
            nodeResolver,
            propertyResolver,
        );
        expect(result.nodeStyles.size).toBe(30);
    });
});
