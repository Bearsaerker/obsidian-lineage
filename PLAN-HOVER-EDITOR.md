# Make Lineage Compatible with Hover Editor

## Context

When hovering over a block link (e.g., `[[File#^abcd1234]]`) in a lineage view, the hover editor opens a popover to preview the target file. However, the popover **does not scroll to the referenced block** — it just shows the top of the file.

The user wants this fixed by **patching the hover editor** (not by changing lineage), since the hover editor already has infrastructure for block scrolling that is simply not working correctly.

## Root Cause Analysis

The hover editor's `patchMarkdownPreviewView` in `main.ts` (lines 287-334) has a bug that prevents block scrolling:

### Bug 1: Wrong path for extracting blockId

The patch looks for the blockId at `eState?.eState?.blockId`:

```typescript
const eState = options as { eState?: { blockId?: string } } | undefined;
const blockId = eState?.eState?.blockId;  // WRONG PATH
```

But the actual data flow is:
1. `buildEphemeralState(file, link)` creates `{ subpath: '#^blockid' }`
2. `buildState(parentMode, eState)` wraps it: `{ state: { mode }, eState: { subpath: '#^blockid' } }`
3. `openFile(file, state)` passes `{ eState: { subpath: '#^blockid' } }` as options

So the correct path is `options?.eState?.subpath`, which contains a string like `#^abcd1234`. The blockId needs to be extracted from this string.

### Bug 2: Missing card selection via lineage viewStore

The patch scrolls the card into view but does not dispatch the lineage `view/set-active-node/mouse` action to actually select the card. Without this dispatch, the card is visible but not highlighted/activated — no active-node styling, no minimap update, no inactive-card opacity applied to siblings.

```typescript
const container = this.view?.contentEl?.querySelector(
  '.markdown-preview-view, .markdown-rendered',
);
```

If the file happens to open in a lineage view (`.lineage-view`), the container won't be found and scrolling is skipped. While the hover editor defaults to markdown preview mode, we should handle lineage views for robustness.

## Approach

Patch the hover editor's `patchMarkdownPreviewView` in `/home/luis/tmp/obsidian-hover-editor/src/main.ts` to:

1. **Fix blockId extraction** — Parse the blockId from `options?.eState?.subpath` (format: `#^blockid`) instead of looking for `options?.eState?.eState?.blockId`
2. **Add lineage view support** — Include `.lineage-view` in the container selector and handle scrolling to `.lineage-card` elements

## Files to Modify

- `/home/luis/tmp/obsidian-hover-editor/src/main.ts` — The `patchMarkdownPreviewView` method (lines ~287-334)

## Reuse

- The existing `MutationObserver` pattern for waiting for DOM rendering
- The existing `scrollIntoView` call for scrolling
- Lineage's `[data-block-id="^${blockId}"]` attribute — same format used by Obsidian markdown views
- Lineage's `.lineage-card` wrapper element — the scrollable unit in lineage views

## Steps

- [ ] **Fix blockId extraction** in `patchMarkdownPreviewView`:
  - [ ] Change from `eState?.eState?.blockId` to parsing `eState?.subpath` 
  - [ ] Extract blockId from subpath string matching `#^blockid` pattern
  - [ ] Code: `const subpath = (options as any)?.eState?.subpath; const match = subpath && /^#\^(.+)$/.exec(subpath); const blockId = match?.[1];`

- [ ] **Add lineage view container support**:
  - [ ] Extend the container selector to include `.lineage-view`: `'.markdown-preview-view, .markdown-rendered, .lineage-view'`
  - [ ] When the container is a `.lineage-view`, find the closest `.lineage-card` and scroll that instead of the raw block element

- [ ] **Update both the MutationObserver callback and the timeout fallback** with the same fixes (they currently duplicate the logic)

## Detailed Code Change

Replace the `openFile` patch in `patchMarkdownPreviewView` (lines 291-333):

**Before:**
```typescript
openFile(old) {
  return function(file: TFile, options?: unknown) {
    const result = old.call(this, file, options);
    const he = HoverEditor.forLeaf(this);
    if (!he) return result;
    const eState = options as { eState?: { blockId?: string } } | undefined;
    const blockId = eState?.eState?.blockId;
    if (!blockId) return result;
    // ... MutationObserver with '.markdown-preview-view, .markdown-rendered'
    // ... setTimeout fallback with same selector
  };
},
```

**After:**
```typescript
openFile(old) {
  return function(file: TFile, options?: unknown) {
    const result = old.call(this, file, options);
    const he = HoverEditor.forLeaf(this);
    if (!he) return result;
    
    // Extract blockId from subpath (format: #^blockid)
    const subpath = (options as any)?.eState?.subpath as string | undefined;
    const match = subpath && /^#\^(.+)$/.exec(subpath);
    const blockId = match?.[1];
    if (!blockId) return result;
    
    // Wait for the content to render and scroll to the block
    const observer = new MutationObserver(() => {
      const container = this.view?.contentEl?.querySelector(
        '.markdown-preview-view, .markdown-rendered, .lineage-view',
      ) as HTMLElement;
      if (!container) return;
      const blockEl = container.querySelector(
        `[data-block-id="^${blockId}"]`,
      ) as HTMLElement;
      if (blockEl) {
        // For lineage views, scroll the card wrapper instead of the raw block element
        const card = container.classList.contains('lineage-view') 
          ? blockEl.closest('.lineage-card') 
          : null;
        (card || blockEl).scrollIntoView({ behavior: 'smooth', block: 'center' });
        observer.disconnect();
      }
    });
    observer.observe(this.view?.contentEl || document.body, {
      childList: true,
      subtree: true,
    });
    
    // Fallback: try scrolling after a timeout in case DOM doesn't trigger mutation
    setTimeout(() => {
      const container = this.view?.contentEl?.querySelector(
        '.markdown-preview-view, .markdown-rendered, .lineage-view',
      ) as HTMLElement;
      if (!container) return;
      const blockEl = container.querySelector(
        `[data-block-id="^${blockId}"]`,
      ) as HTMLElement;
      if (blockEl) {
        const card = container.classList.contains('lineage-view')
          ? blockEl.closest('.lineage-card')
          : null;
        (card || blockEl).scrollIntoView({ behavior: 'smooth', block: 'center' });
      }
      observer.disconnect();
    }, 1500);
    
    return result;
  };
},
```

## Verification

1. **Test case 1: Block link in lineage view → hover editor popover (markdown view)**
   - Open a file in lineage view
   - Hold Cmd/Ctrl and hover over a block link (`[[File#^blockid]]`)
   - Expected: Hover editor popover opens and scrolls to the referenced block

2. **Test case 2: Block link in lineage view → lineage view in popover**
   - If the target file is set to open in lineage view
   - Expected: Hover editor opens lineage view and scrolls the card into view

3. **Test case 3: Regular markdown file block link → hover editor**
   - From a regular markdown view, hover over a block link
   - Expected: Same behavior as before (no regression)

4. **Test case 4: File without block reference**
   - Hover over a regular file link (no `#^blockid`)
   - Expected: File opens normally without scrolling (no regression)

5. **Test case 5: Invalid block reference**
   - Hover over a block link with non-existent block ID
   - Expected: File opens without error, no scrolling occurs