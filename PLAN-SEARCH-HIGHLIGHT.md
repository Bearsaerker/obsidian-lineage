# Plan: Highlight Searched Term in Revealed Cards

## Context

When search mode is active, cards that match the search query are revealed (shown). Currently, the matched cards get a yellow border (`node-border--search-match`), but the actual searched term within the card content is not highlighted.

The goal is to highlight the matched text portions within the revealed cards, similar to how Obsidian highlights search results in its editor.

## Approach

1. **Pass the Fuse.js search result (with match indices) through the component hierarchy** so the Content component knows which character positions matched.

2. **Create a helper function** that takes the content string and the match indices from Fuse.js, and wraps the matched character ranges with `<mark>` tags before rendering.

3. **Add CSS styling** for the `<mark>` elements to give them a yellow background (matching Obsidian's search highlight aesthetic).

## Files to Modify

### New Files
- `src/view/actions/markdown-preview/helpers/highlight-search.ts` — Helper to wrap matched text with `<mark>` tags

### Modified Files
- `src/view/components/container/column/components/group/group.svelte` — Pass `searchResult` (not just boolean) to card
- `src/view/components/container/column/components/group/components/card/card.svelte` — Accept and pass `searchResult` to Content
- `src/view/components/container/column/components/group/components/card/components/content/content.svelte` — Accept `searchResult` and pass to action
- `src/view/actions/markdown-preview/markdown-preview-action.ts` — Use `searchResult` to highlight content before rendering
- `src/styles/makdown/makdown-preview.css` — Add `.search-highlight` styling for `<mark>` elements

## Reuse

- **Fuse.js `NodeSearchResult`** (`src/stores/view/subscriptions/effects/document-search/document-search.ts`) — Already provides match indices via `matches[0].indices` which is `[number, number][]` (character position ranges)
- **Existing `mark` styling** (`src/styles/makdown/makdown-preview.css`) — Already has rules for `mark` elements (grays out in inactive nodes)
- **`formatText()`** (`src/view/actions/markdown-preview/helpers/format-text.ts`) — The highlight helper will be called in the same render pipeline

## Steps

### 1. Create highlight-search helper

**File**: `src/view/actions/markdown-preview/helpers/highlight-search.ts`

```typescript
import { NodeSearchResult } from 'src/stores/view/subscriptions/effects/document-search/document-search';

/**
 * Wraps matched character ranges in the content with <mark> tags.
 * Fuse.js returns indices as [start, end] tuples for matched characters.
 */
export function highlightSearch(
    content: string,
    searchResult: NodeSearchResult | null
): string {
    if (!searchResult || !searchResult.matches || searchResult.matches.length === 0) {
        return content;
    }

    // Get all matched indices from the first match (content key)
    const match = searchResult.matches[0];
    if (!match || !match.indices) return content;

    // Build a set of character indices that are matched
    const matchedIndices = new Set<number>();
    for (const [start, end] of match.indices) {
        for (let i = start; i <= end; i++) {
            matchedIndices.add(i);
        }
    }

    // Build result by wrapping contiguous matched ranges with <mark>
    let result = '';
    let inMark = false;
    let markStart = 0;

    for (let i = 0; i <= content.length; i++) {
        const isMatched = i < content.length && matchedIndices.has(i);

        if (isMatched && !inMark) {
            // Start of a matched range
            inMark = true;
            markStart = i;
        } else if (!isMatched && inMark) {
            // End of a matched range
            inMark = false;
            result += `<mark class="search-highlight">${content.slice(markStart, i)}</mark>`;
        }

        if (!inMark && i < content.length) {
            result += content[i];
        }
    }

    // Handle case where match extends to end of string
    if (inMark) {
        result += `<mark class="search-highlight">${content.slice(markStart)}</mark>`;
    }

    return result;
}
```

### 2. Modify group.svelte — Pass searchResult to card

**File**: `src/view/components/container/column/components/group/group.svelte`

Change the `isSearchMatch` prop to also pass the full `searchResult`:

```svelte
<!-- Change from: -->
isSearchMatch={searchResults.has(node)}

<!-- To also add: -->
searchResult={searchResults.get(node) ?? null}
```

### 3. Modify card.svelte — Accept and pass searchResult

**File**: `src/view/components/container/column/components/group/components/card/card.svelte`

Add import and prop:

```typescript
import { NodeSearchResult } from 'src/stores/view/subscriptions/effects/document-search/document-search';

export let searchResult: NodeSearchResult | null = null;
```

Pass to Content:

```svelte
<Content nodeId={node} {isInSidebar} {active} {searchResult} />
```

### 4. Modify content.svelte — Accept and pass searchResult

**File**: `src/view/components/container/column/components/group/components/card/components/content/content.svelte`

Add import and prop:

```typescript
import { NodeSearchResult } from 'src/stores/view/subscriptions/effects/document-search/document-search';

export let searchResult: NodeSearchResult | null = null;
```

Pass to the action:

```svelte
<div
    class={'lng-prev markdown-preview-view markdown-preview-section markdown-rendered'}
    on:click={handleClick}
    on:dblclick={handleDoubleClick}
    use:markdownPreviewAction={{ nodeId, searchResult }}
></div>
```

### 5. Modify markdown-preview-action.ts — Apply highlighting

**File**: `src/view/actions/markdown-preview/markdown-preview-action.ts`

Update the action signature and render function:

```typescript
import { MarkdownRenderer } from 'obsidian';
import { getPlugin, getView } from 'src/view/components/container/context';
import { contentStore } from 'src/stores/document/derived/content-store';
import { formatText } from 'src/view/actions/markdown-preview/helpers/format-text';
import { highlightSearch } from 'src/view/actions/markdown-preview/helpers/highlight-search';
import { NodeSearchResult } from 'src/stores/view/subscriptions/effects/document-search/document-search';

export const markdownPreviewAction = (
    element: HTMLElement,
    params: { nodeId: string; searchResult: NodeSearchResult | null }
) => {
    const plugin = getPlugin();
    const view = getView();

    const render = (content: string) => {
        if (view && element) {
            element.empty();
            if (content.length > 0) {
                content = formatText(content);
                content = highlightSearch(content, params.searchResult);
            }
            MarkdownRenderer.render(
                plugin.app,
                content,
                element,
                view.file!.path,
                view,
            );
        }
    };
    // ... rest unchanged
};
```

### 6. Add CSS styling for search highlights

**File**: `src/styles/makdown/makdown-preview.css`

Add styling for the search highlight marks:

```css
/* Search highlight */
.lineage-card {
    & mark.search-highlight {
        background-color: var(--search-highlight, #ffc85766);
        color: inherit;
        border-radius: 2px;
        padding: 0 2px;
        margin: 0 -2px;
    }
}

/* Dim highlights in inactive nodes */
.inactive-node,
.active-sibling,
.active-parent,
.active-child {
    & mark.search-highlight {
        filter: grayscale(1);
    }
}
```

## Verification

1. **Manual testing**:
   - Open a document with obsidian-lineage
   - Activate search (Ctrl+F or toolbar button)
   - Enter a search term that matches content in multiple cards
   - Verify that the matched text within revealed cards is highlighted with a yellow background
   - Verify that non-matching cards (when `showAllNodes` is true) do not have highlights
   - Verify that clearing the search removes highlights

2. **Edge cases**:
   - Fuzzy search: matched characters should still be highlighted (may be non-contiguous)
   - Empty search: no highlights should appear
   - Search with no results: no highlights should appear
   - Multi-line content: highlights should work across lines

3. **Build check**: `npm run build` should succeed without errors
