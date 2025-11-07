import { describe, expect, test } from 'vitest';
import { StyleRule } from 'src/stores/settings/types/style-rules-types';
import { processStyleRules } from '../../process-style-rules';
import { wikipedia_cobol } from 'src/lib/formats/test-data/wikipedia_cobol';
import { TargetNodeResolver } from 'src/stores/view/subscriptions/effects/style-rules/helpers/resolvers/target-node-resolver';
import { NodePropertyResolver } from 'src/stores/view/subscriptions/effects/style-rules/helpers/resolvers/node-property-resolver/node-property-resolver';

const style_1 = { color: '#000000', styleVariant: 'left-border' };
const propertyResolver = new TargetNodeResolver(
    wikipedia_cobol.columns.columns,
);
const nodeResolver = new NodePropertyResolver(
    wikipedia_cobol.columns.columns,
    wikipedia_cobol.columns.content,
);
describe('content.self', () => {
    test('content of self contains "cobol"', () => {
        const rule: StyleRule = {
            id: 'sryyvpECiF',
            name: 'Test Rule',
            enabled: true,
            condition: {
                type: 'condition',
                scope: 'self',
                property: 'content',
                operator: 'contains',
                value: 'COBOL',
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
        expect(result.nodeStyles.size).toBe(29);
        expect(result.nodeStyles.get('nMasFNiYv')).toEqual(style_1);
    });

    test('content of self does not include cobol', () => {
        const rule: StyleRule = {
            id: 'srpjP0rS0X',
            name: '',
            enabled: true,
            condition: {
                type: 'condition',
                scope: 'self',
                property: 'content',
                operator: 'not-contains',
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
        expect(result.nodeStyles.size).toBe(6);
    });
});

describe('content.direct-children', () => {
    test('content of direct children contains "legacy"', () => {
        const rule: StyleRule = {
            id: 'sr8bLJytbF',
            name: 'Test Rule',
            enabled: true,
            condition: {
                type: 'condition',
                scope: 'direct-children',
                property: 'content',
                operator: 'contains',
                value: 'legacy',
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
        expect(Array.from(result.nodeStyles.values())).toEqual([
            style_1,
            style_1,
            style_1,
            style_1,
            style_1,
        ]);
    });
});

describe('content.any-children', () => {
    test('any children content contains "legacy"', () => {
        const rule: StyleRule = {
            id: 'sr8bLJytbF',
            name: 'Test Rule',
            enabled: true,
            condition: {
                type: 'condition',
                scope: 'any-children',
                property: 'content',
                operator: 'contains',
                value: 'legacy',
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
        expect(result.nodeStyles.size).toBe(6);
    });
});

describe('content.any-parent', () => {
    test('any parent contains language', () => {
        const rule: StyleRule = {
            id: 'test-rule',
            name: 'Test Rule',
            enabled: true,
            condition: {
                type: 'condition',
                scope: 'any-parent',
                property: 'content',
                operator: 'contains',
                value: 'language',
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
        expect(result.nodeStyles.size).toBe(8);
    });
});
