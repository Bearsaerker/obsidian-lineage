# Fix Block Link Navigation in Lineage View

## Context

When clicking a block link (e.g., `[[File B#^abcd1234]]`) from File A, the correct card/block is not selected in **both** of these scenarios:

1. **File B is already open** in the lineage view — the last opened card is shown instead of the linked block.
2. **File B is closed** — File B opens, but the correct block/card is not selected.

### Root Cause

In `handleGlobalBlockLink`, there are two bugs:

1. **Wrong node ID lookup**: The code searches for `blockId` (e.g., `abcd1234`) in `Object.keys(doc.content)`, but `doc.content` keys are generated node IDs (e.g., `nAbCdEfGh`), not block IDs. Block IDs are embedded in the content text and mapped to DOM elements via `data-block-id` attributes.
2. **Timing issue**: The code uses `onLayoutReady` callback which may not fire if the file is already open in lineage view (no layout change occurs).

### Comparison with Local Block Links

`handleLocalBlockLink` works correctly because it:
- Queries the DOM for `[data-block-id="^${id}"]`
- Finds the closest `.lineage-card` element
- Uses `selectCard()` to activate it

## Approach

Refactor `handleGlobalBlockLink` to use the same DOM-based approach as `handleLocalBlockLink`:

1. Check if the target file is already open in a lineage view
2. If yes, use the existing view; if no, open it
3. Wait for the DOM to render (using a short timeout/polling)
4. Query the DOM for the block element using `data-block-id`
5. Find the card and use `selectCard()` to activate it

## Files to Modify

- `src/view/components/container/column/components/group/components/card/components/content/event-handlers/handle-links/block-link/handle-global-block-link.ts` (main fix)

## Reuse

- `selectCard()` from `src/view/components/container/column/components/group/components/card/components/content/event-handlers/handle-links/helpers/select-card.ts` — already used by `handleLocalBlockLink`, handles card activation with proper delay
- `getLinkPaneType()` — already in the same file, no change needed
- `LineageView` class from `src/view/view.ts` — provides `container` property for DOM queries

## Steps

- [x] Rewrite `handleGlobalBlockLink` to:
  - [x] Find existing lineage leaf for the target file using `app.workspace.getLeavesOfType('lineage')` and filtering by file path
  - [x] If found, use the existing view; if not, call `openFileInLineage` as before
  - [x] Replace the `onLayoutReady` + `doc.content` lookup with DOM-based approach:
    - Wait for the container to be ready (poll for `container` and `container.querySelector('[data-block-id="^${blockId}"]')`)
    - Query for `[data-block-id="^${blockId}"]`
    - Find the closest `.lineage-card` element
    - Call `selectCard(view, card.id)` to activate the card
  - [x] Keep the fallback to `openLinkText` if file not found or block not found

## Verification

1. **Test case 1: File already open in lineage view**
   - Open File B in lineage view
   - From File A (in lineage view), click a block link to File B
   - Expected: The specific block/card in File B should be selected and scrolled into view

2. **Test case 2: File not open**
   - Ensure File B is not open
   - From File A, click a block link to File B
   - Expected: File B opens in lineage view and the specific block/card is selected

3. **Test case 3: Block not found**
   - Click a block link with an invalid block ID
   - Expected: Falls back to default Obsidian behavior

4. **Test case 4: File not found**
   - Click a block link to a non-existent file
   - Expected: Falls back to default Obsidian behavior