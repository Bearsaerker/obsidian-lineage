# Fix: Quiet Outline Not Showing for Lineage Views

## Context

After adding lineage support to obsidian-quiet-outline, the outline panel shows **nothing** when a lineage view is active. The root cause is in the `active-leaf-change` event handler in `src/plugin.ts` of the obsidian-quiet-outline plugin.

### Root Cause

Commit `79ffe5f` in obsidian-quiet-outline added `leaf.view.navigation` to the condition that guards the `active-fileview-change` event:

```typescript
// Before (commit 32585b1):
if (leaf.view instanceof FileView && leaf.view.file) {

// After (commit 79ffe5f):
if (leaf.view instanceof FileView && leaf.view.navigation && leaf.view.file) {
```

This was meant to prevent fileviews without navigation from clearing the outline panel. However, `LineageView` (which extends `TextFileView`) may not have `navigation = true` set, or there may be a timing issue where `navigation` is not yet `true` when the event fires.

**Result:** When switching to a lineage view, the condition fails → `active-fileview-change` is never triggered → `updateNavAndRefresh("lineage", view)` is never called → `LineageNav` is never created → `store.headers` stays empty → outline shows nothing.

## Approach

Replace the `leaf.view.navigation` check with a view-type whitelist that includes all navigator-supported types. This is more reliable than relying on the `navigation` property, which may not be set consistently across all view types.

The supported view types match the keys in the `NAVIGATORS` object in `src/navigators/index.ts`:
- `markdown`, `kanban`, `canvas`, `embed-markdown-file`, `embed-markdown-text`, `lineage`

## Files to Modify

- `/home/luis/tmp/obsidian-quiet-outline/src/plugin.ts` — Change the condition in the `active-leaf-change` event handler

## Reuse

- **NAVIGATORS keys** from `src/navigators/index.ts` — the list of supported view types
- **Existing event flow** — no changes needed to the event handler logic or `updateNavAndRefresh`

## Steps

- [ ] **Add a `SUPPORTED_VIEW_TYPES` constant** at the top of `src/plugin.ts`:
  ```typescript
  const SUPPORTED_VIEW_TYPES = ["markdown", "canvas", "kanban", "embed-markdown-file", "embed-markdown-text", "lineage"];
  ```

- [ ] **Replace the `navigation` check** in the `active-leaf-change` handler (around line 124):
  
  **Before:**
  ```typescript
  if (leaf.view instanceof FileView && leaf.view.navigation && leaf.view.file) {
  ```
  
  **After:**
  ```typescript
  if (leaf.view instanceof FileView && SUPPORTED_VIEW_TYPES.includes(leaf.view.getViewType()) && leaf.view.file) {
  ```

## Verification

1. **Lineage view outline:**
   - Open a file in lineage view
   - Expected: Outline panel shows the heading hierarchy from the lineage document

2. **Markdown view outline (no regression):**
   - Open a markdown file
   - Expected: Outline panel shows headings as before

3. **Canvas view outline (no regression):**
   - Open a canvas file
   - Expected: Outline panel shows canvas nodes as before

4. **Unsupported view type (no regression):**
   - Open a view type without a navigator (e.g., settings, search)
   - Expected: Outline panel clears (shows empty) instead of showing stale data

5. **Switch between views:**
   - Switch from markdown → lineage → canvas → markdown
   - Expected: Outline correctly updates for each view type