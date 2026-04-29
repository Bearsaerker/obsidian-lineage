# Quiet Outline: Lineage View Support

## Context

When a file is open in **Lineage view** (the card-based hierarchical view), the Quiet Outline panel shows nothing useful because there's no navigator for the `lineage` view type. The user wants the outline to:

1. Read the plain text content from the Lineage document (the underlying markdown file)
2. Extract headings and match them with Lineage's section numbers (e.g., "1", "1.1", "2.3")
3. Display the outline tree with section numbers shown alongside headings
4. When a heading is clicked, navigate to (activate and scroll to) the corresponding card in the Lineage view

## Approach

Create a new `LineageNav` navigator class that bridges Quiet Outline with the Lineage view. The navigator:

1. **Finds the active LineageView** by scanning workspace leaves of type `'lineage'`
2. **Reads the document store** (`documentStore`) to get:
   - `sections.id_section` (nodeId → section number, e.g., `"n123" → "1.2"`)
   - `sections.section_id` (section number → nodeId, reverse lookup)
   - `document.content` (nodeId → content text for each card)
3. **Builds headings** by traversing nodes in section order, extracting the heading text from each card's first line
4. **On click (jump)**: Dispatches `view/set-active-node/mouse` to the Lineage view's `viewStore` to activate the card, then scrolls it into view

## Files to Modify

### New File
- `src/navigators/lineage.ts` — New `LineageNav` class

### Modified Files
- `src/navigators/index.ts` — Register the `lineage` navigator type
- `src/plugin.ts` — No change needed (the navigator factory pattern handles it automatically)

## Reuse

- **Nav base class** (`src/navigators/base.ts`) — Abstract class with `jump()`, `getHeaders()`, `setHeaders()`, `updateHeaders()` signatures
- **MarkDownNav** (`src/navigators/markdown.ts`) — Pattern reference for getting headings from file content
- **CanvasNav** (`src/navigators/canvas.ts`) — Pattern reference for non-markdown view integration with custom heading structure
- **EmbedMarkdownFileNav** (`src/navigators/embed-markdown.ts`) — Pattern reference for accessing headings from file cache
- **store.headers** (`src/store.ts`) — Reactive store for heading data
- **Deferred** (`src/utils/promise.ts`) — For async waiting patterns
- **Lineage's `selectCard`** pattern — The existing `handleGlobalBlockLink` in lineage shows the pattern: dispatch `view/set-active-node/mouse` with `{ id: nodeId }`
- **Lineage's `calculateColumnTreeIndexes`** — Shows how section numbers are computed: `sections.id_section[nodeId]` gives section number like "1.2.3"
- **Lineage's `columnsToExtendedJson`** — Shows how to traverse the document structure with node IDs

## Steps

- [x] **Create `src/navigators/lineage.ts`**:
  - [x] Define `LineageNav` extending `Nav`
  - [x] Implement `getId()` returning `"lineage"`
  - [x] Implement `findActiveLineageView()` — find the active LineageView by scanning `app.workspace.getLeavesOfType('lineage')` and checking `view.isActive` or matching file path
  - [x] Implement `getHeaders()`:
    - [x] Get the LineageView and its `documentStore`
    - [x] Read `sections.section_id` to get nodes in section order
    - [x] For each node (in section order), extract heading text from first line of `content[nodeId].content`
    - [x] Strip markdown heading syntax (`# `, `## `, etc.) from the heading text
    - [x] Compute heading level from section number depth (e.g., "1.2.3" → level 3)
    - [x] Build `HeadingCache[]` with `heading`, `level`, `position` (line 0 for all since we don't have exact line numbers), and store `nodeId` as `id` field
  - [x] Implement `setHeaders()` — call `getHeaders()` and assign to `store.headers`
  - [x] Implement `updateHeaders()` — same as `setHeaders()` (no diff tracking needed)
  - [x] Implement `jump(key)`:
    - [x] Get the heading at index `key` to find its `nodeId`
    - [x] Find the LineageView for the file
    - [x] Dispatch `{ type: 'view/set-active-node/mouse', payload: { id: nodeId } }` to `viewStore`
    - [x] Set the lineage leaf as active with focus
    - [x] Wait briefly and scroll the card element (`#${nodeId}`) into view
  - [x] Implement `jumpWithoutFocus(key)` — same as `jump` but without setting focus
  - [x] Implement `getPath()` — return the file path from the LineageView
  - [x] Implement `onload()` — no special listeners needed
  - [x] Implement `onunload()` — cleanup
  - [x] Set `canDrop = false` (no drag-and-drop for lineage)
  - [x] Implement `getDefaultLevel()` — return the plugin's default expand level

- [x] **Register in `src/navigators/index.ts`**:
  - [x] Import `LineageNav`
  - [x] Add `"lineage": LineageNav` to the `NAVIGATORS` map

- [x] **Update heading type** (if needed):
  - [x] The `Heading` type in `store.ts` already extends `HeadingCache` with optional `id` and `icon` — we use `id` to store the nodeId

## Detailed Implementation

### `src/navigators/lineage.ts`

```typescript
import type { HeadingCache } from "obsidian";
import type QuietOutline from "@/plugin";
import { store, type Heading } from "@/store";
import { Nav } from "./base";

// Type for the LineageView — we access it dynamically without importing
type LineageViewLike = {
    isActive: boolean;
    file: { path: string } | null;
    documentStore: {
        getValue(): {
            sections: {
                id_section: Record<string, string>;
                section_id: Record<string, string>;
            };
            document: {
                content: Record<string, { content: string }>;
            };
        };
    };
    viewStore: {
        dispatch(action: { type: string; payload: { id: string } }): void;
    };
    container: HTMLElement | null;
    leaf: {
        setViewState(...args: unknown[]): void;
    };
};

// Section numbers sorted like "1", "1.1", "1.1.1", "1.2", "2", ...
function sortSectionNumbers(a: string, b: string): number {
    const partsA = a.split('.').map(Number);
    const partsB = b.split('.').map(Number);
    for (let i = 0; i < Math.max(partsA.length, partsB.length); i++) {
        const diff = (partsA[i] ?? 0) - (partsB[i] ?? 0);
        if (diff !== 0) return diff;
    }
    return 0;
}

// Extract heading text from first line of card content
function extractHeadingText(content: string): string {
    const firstLine = content.split('\n')[0].trim();
    // Strip markdown heading syntax: # Heading → Heading
    return firstLine.replace(/^#+\s*/, '').trim();
}

// Compute heading level from section number: "1.2.3" → 3, "1" → 1
function sectionLevel(section: string): number {
    return section.split('.').length;
}

export class LineageNav extends Nav {
    canDrop: boolean = false;

    constructor(plugin: QuietOutline, view: unknown) {
        super(plugin, view);
    }

    getId(): string {
        return "lineage";
    }

    getPath(): string {
        const lineageView = this.findActiveLineageView();
        return lineageView?.file?.path ?? "";
    }

    findActiveLineageView(): LineageViewLike | null {
        const leaves = this.plugin.app.workspace.getLeavesOfType('lineage');
        for (const leaf of leaves) {
            const view = leaf.view as LineageViewLike | undefined;
            if (view && view.isActive) {
                return view;
            }
        }
        return null;
    }

    async getHeaders(): Promise<Heading[]> {
        const lineageView = this.findActiveLineageView();
        if (!lineageView) return [];

        const docState = lineageView.documentStore.getValue();
        const { section_id, id_section } = docState.sections;
        const content = docState.document.content;

        // Get all section numbers sorted in document order
        const sections = Object.keys(section_id).sort(sortSectionNumbers);

        const headings: Heading[] = [];
        for (const section of sections) {
            const nodeId = section_id[section];
            const nodeContent = content[nodeId]?.content ?? '';
            const headingText = extractHeadingText(nodeContent);

            // Skip empty headings (cards with no text)
            if (!headingText) continue;

            headings.push({
                heading: headingText,
                level: sectionLevel(section),
                position: {
                    start: { line: 0, col: 0, offset: 0 },
                    end: { line: 0, col: 0, offset: 0 },
                },
                // Store nodeId for jump navigation
                id: nodeId,
            });
        }

        return headings;
    }

    async setHeaders(): Promise<void> {
        store.headers = await this.getHeaders();
    }

    async updateHeaders(): Promise<void> {
        await this.setHeaders();
    }

    async jump(key: number): Promise<void> {
        const heading = store.headers[key];
        if (!heading || !heading.id) return;

        const lineageView = this.findActiveLineageView();
        if (!lineageView) return;

        const nodeId = heading.id;

        // Activate the card
        lineageView.viewStore.dispatch({
            type: 'view/set-active-node/mouse',
            payload: { id: nodeId },
        });

        // Set the lineage leaf as active
        this.plugin.app.workspace.setActiveLeaf(
            lineageView.leaf,
            { focus: true },
        );

        // Scroll the card into view
        this.plugin.startJumping();
        this.plugin.outlineView?.vueInstance.onPosChange(key);

        setTimeout(() => {
            const container = lineageView.container;
            if (!container) return;
            const cardEl = container.querySelector(`#${CSS.escape(nodeId)}`);
            if (cardEl) {
                cardEl.scrollIntoView({ behavior: 'smooth', block: 'center' });
            }
        }, 16);
    }

    async jumpWithoutFocus(key: number): Promise<void> {
        const heading = store.headers[key];
        if (!heading || !heading.id) return;

        const lineageView = this.findActiveLineageView();
        if (!lineageView) return;

        const nodeId = heading.id;

        lineageView.viewStore.dispatch({
            type: 'view/set-active-node/mouse',
            payload: { id: nodeId },
        });

        this.plugin.startJumping();
        this.plugin.outlineView?.vueInstance.onPosChange(key);

        setTimeout(() => {
            const container = lineageView.container;
            if (!container) return;
            const cardEl = container.querySelector(`#${CSS.escape(nodeId)}`);
            if (cardEl) {
                cardEl.scrollIntoView({ behavior: 'smooth', block: 'center' });
            }
        }, 16);
    }

    getDefaultLevel(): number {
        return parseInt(this.plugin.settings.expand_level);
    }

    async onload(): Promise<void> {
        // No special listeners needed — the plugin's metadata cache
        // listener will trigger refresh when the file changes
    }

    async onunload(): Promise<void> {
        // Nothing to clean up
    }
}
```

### `src/navigators/index.ts` changes

```diff
+ import { LineageNav } from "./lineage";

 const NAVIGATORS = {
     dummy: DummyNav,
     markdown: MarkDownNav,
     kanban: KanbanNav,
     canvas: CanvasNav,
     "embed-markdown-file": EmbedMarkdownFileNav,
     "embed-markdown-text": EmbedMarkdownTextNav,
+    lineage: LineageNav,
 }
```

## Display Decisions (from user feedback)

- **No section numbers in outline**: Show only the heading text, no section number prefix
- **Cards are heading-only**: Each card contains exactly one heading — no mixed content
- **Non-heading cards excluded**: Only cards with heading-like content appear in the outline
- **Event-based refresh**: Refresh when view mode switches from edit to reading mode in Lineage

## Verification

1. **Test case 1: Basic lineage file with headings**
   - Open a markdown file in Lineage view
   - Open Quiet Outline panel
   - Expected: Outline shows all headings with correct hierarchy and section numbers
   - Click a heading → the corresponding card in Lineage view is activated and scrolled into view

2. **Test case 2: Nested headings**
   - File with H1 → H2 → H3 structure
   - Expected: Outline shows proper nesting; section numbers match (1, 1.1, 1.1.1)

3. **Test case 3: Empty cards**
   - Cards with no content should not appear in the outline

4. **Test case 4: Switch from Lineage to another view**
   - Switch active view away from Lineage
   - Expected: Outline updates to show the new view's content (or empty if no supported view)

5. **Test case 5: File modification**
   - Edit a card in Lineage view
   - Expected: Outline refreshes with updated heading text

6. **Test case 6: Multiple Lineage views**
   - Open the same file in two Lineage views
   - Expected: Outline reflects the active (focused) Lineage view