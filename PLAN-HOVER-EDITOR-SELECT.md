# Select Lineage Card via viewStore in Hover Editor

## Context

The previous fix (`PLAN-HOVER-EDITOR.md`) successfully scrolls to the correct card when hovering over a block link in a lineage view. However, it only scrolls — it does **not select** the card via the lineage view's state management.

**What "select" means in lineage:** Dispatching `view/set-active-node/mouse` to the viewStore, which:
- Sets the card as `activeNode` in the view state
- Applies the `.active-node` CSS class (highlighted border/background)
- Triggers `apply-inactive-node-opacity` on sibling cards
- Updates the minimap to show the active card position
- Updates the document's active branch for alignment

**Current behavior:** Card scrolls into view but looks like all other cards (no highlight, no active styling).

**Desired behavior:** Card scrolls into view AND is selected/activated (highlighted, siblings dimmed).

## Root Cause

The hover editor's `openFile` patch in `/home/luis/tmp/obsidian-hover-editor/src/main.ts` (lines ~291-333) handles lineage views by scrolling the `.lineage-card` into view. But it never calls `view.viewStore.dispatch()` to set the active node — it treats lineage views the same as markdown preview views (scroll-only).

## Approach

After finding and scrolling the card, dispatch `view/set-active-node/mouse` to the lineage view's viewStore. The dispatch requires the card's `id` attribute, which is already available from the `.lineage-card` element.

## Files to Modify

- `/home/luis/tmp/obsidian-hover-editor/src/main.ts` — The `openFile` patch inside `patchMarkdownPreviewView` (lines ~291-333)

## Reuse

- **Existing blockId extraction** (subpath parsing) — already works correctly
- **Existing `.lineage-card` detection** — `blockEl.closest('.lineage-card')` already finds the card
- **Lineage's `selectCard` pattern** from `/home/luis/tmp/obsidian-lineage/src/view/components/container/column/components/group/components/card/components/content/event-handlers/handle-links/helpers/select-card.ts`:
  ```typescript
  view.viewStore.dispatch({
      type: 'view/set-active-node/mouse',
      payload: { id: card.id },
  });
  ```
- **Lineage's delay pattern** — `await delay(16)` before dispatch to let the DOM settle

## Steps

- [ ] **Add card selection in the MutationObserver callback** (lines ~302-312):
  - [ ] After finding the card element, check if it has an `id` and if `this.view` has a `viewStore`
  - [ ] Dispatch `view/set-active-node/mouse` with the card's id
  - [ ] Keep the existing `scrollIntoView` call (it still works for scrolling)

- [ ] **Add card selection in the setTimeout fallback** (lines ~322-330):
  - [ ] Same logic: dispatch `view/set-active-node/mouse` after finding the card

- [ ] **Add a small delay** before dispatch (16ms, matching lineage's own `selectCard`) to ensure the viewStore has processed the document load

## Detailed Code Change

In the `openFile` patch, replace the lineage-card handling in both the MutationObserver and setTimeout fallback.

**MutationObserver callback — Before:**
```typescript
if (blockEl) {
    const card = container.classList.contains("lineage-view") ? blockEl.closest(".lineage-card") : null;
    (card || blockEl).scrollIntoView({ behavior: "smooth", block: "center" });
    observer.disconnect();
}
```

**MutationObserver callback — After:**
```typescript
if (blockEl) {
    const card = container.classList.contains("lineage-view") ? blockEl.closest(".lineage-card") : null;
    (card || blockEl).scrollIntoView({ behavior: "smooth", block: "center" });

    // Select the card via lineage viewStore so it gets active-node styling
    if (card && card.id && this.view?.viewStore) {
        setTimeout(() => {
            this.view.viewStore.dispatch({
                type: 'view/set-active-node/mouse',
                payload: { id: card.id },
            });
        }, 16);
    }

    observer.disconnect();
}
```

**setTimeout fallback — Before:**
```typescript
if (blockEl) {
    const card = container.classList.contains("lineage-view") ? blockEl.closest(".lineage-card") : null;
    (card || blockEl).scrollIntoView({ behavior: "smooth", block: "center" });
}
```

**setTimeout fallback — After:**
```typescript
if (blockEl) {
    const card = container.classList.contains("lineage-view") ? blockEl.closest(".lineage-card") : null;
    (card || blockEl).scrollIntoView({ behavior: "smooth", block: "center" });

    // Select the card via lineage viewStore so it gets active-node styling
    if (card && card.id && this.view?.viewStore) {
        setTimeout(() => {
            this.view.viewStore.dispatch({
                type: 'view/set-active-node/mouse',
                payload: { id: card.id },
            });
        }, 16);
    }
}
```

## Verification

1. **Block link hover in lineage view → lineage popover:**
   - Open a file in lineage view
   - Hover over a block link (`[[File#^blockid]]`)
   - Expected: Hover editor opens, scrolls to the card, AND the card is highlighted (active-node class applied, siblings dimmed)

2. **Block link hover in lineage view → markdown preview popover:**
   - If the target file opens in markdown preview mode
   - Expected: Scrolling works as before (no regression — no viewStore on markdown views)

3. **Regular file link (no block ref):**
   - Expected: No change — file opens normally without scrolling or selection

4. **Invalid block reference:**
   - Expected: No error — no card found, no dispatch attempted