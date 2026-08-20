import { Plugin, TFile, WorkspaceLeaf } from 'obsidian';
import { LINEAGE_VIEW_TYPE, LineageView } from './view/view';
import { createSetViewState } from 'src/obsidian/patches/create-set-view-state';
import { around } from 'monkey-around';
import { settingsReducer } from 'src/stores/settings/settings-reducer';
import { deepMerge } from 'src/helpers/deep-merge';
import { DEFAULT_SETTINGS } from 'src/stores/settings/default-settings';
import { Store } from 'src/lib/store/store';
import {
    DocumentsPreferences,
    Settings,
} from 'src/stores/settings/settings-type';
import { registerFileMenuEvent } from 'src/obsidian/events/workspace/register-file-menu-event';
import { addCommands } from 'src/obsidian/commands/add-commands';
import { settingsSubscriptions } from 'src/stores/settings/subscriptions/settings-subscriptions';
import { PluginState } from 'src/stores/plugin/plugin-state-type';
import { PluginStoreActions } from 'src/stores/plugin/plugin-store-actions';
import { pluginReducer } from 'src/stores/plugin/plugin-reducer';
import { DefaultPluginState } from 'src/stores/plugin/default-plugin-state';
import { StatusBar } from 'src/obsidian/status-bar/status-bar';
import { onPluginError } from 'src/lib/store/on-plugin-error';
import { customIcons, loadCustomIcons } from 'src/helpers/load-custom-icons';
import { setActiveLeaf } from 'src/obsidian/patches/set-active-leaf';
import { migrateSettings } from 'src/stores/settings/migrations/migrate-settings';
import { toggleFileViewType } from 'src/obsidian/events/workspace/effects/toggle-file-view-type';
import { toggleObsidianViewType } from 'src/obsidian/events/workspace/effects/toggle-obsidian-view-type';
import { getActiveFile } from 'src/obsidian/commands/helpers/get-active-file';
import { getLeafOfFile } from 'src/obsidian/events/workspace/helpers/get-leaf-of-file';
import { openFile } from 'src/obsidian/events/workspace/effects/open-file';
import { delay } from 'src/helpers/delay';
import { createLineageDocument } from 'src/obsidian/events/workspace/effects/create-lineage-document';
import { registerFilesMenuEvent } from 'src/obsidian/events/workspace/register-files-menu-event';
import { removeHtmlElementMarkerInPreviewMode } from 'src/obsidian/markdown-post-processors/remove-html-element-marker-in-preview-mode';
import {
    minimapWorker,
    rulesWorker,
    statusBarWorker,
} from 'src/workers/worker-instances';
import { onVaultEvent } from 'src/stores/plugin/subscriptions/on-vault-event';
import { onWorkspaceEvent } from 'src/stores/plugin/subscriptions/on-workspace-event';
import { SettingsActions } from 'src/stores/settings/settings-store-actions';
import {
    ExternalHighlight,
    registerHighlights,
    clearHighlights,
} from 'src/lib/highlight-registry';
import {
    GLOBAL_CATEGORIES_VIEW_TYPE,
    GlobalCategoriesView,
} from 'src/obsidian/views/global-categories-view';
import { openGlobalCategoriesView } from 'src/obsidian/events/workspace/effects/open-global-categories-view';
import { lang } from 'src/lang/lang';

export type SettingsStore = Store<Settings, SettingsActions>;
export type PluginStore = Store<PluginState, PluginStoreActions>;

export default class Lineage extends Plugin {
    settings: SettingsStore;
    store: PluginStore;
    statusBar: StatusBar;
    private timeoutReferences: Set<ReturnType<typeof setTimeout>> = new Set();
    viewType: DocumentsPreferences = {};

    /**
     * Register highlights for a Lineage node.
     * Used by external plugins (e.g., SideNote) to highlight text in cards.
     *
     * @param nodeId - The Lineage node ID
     * @param highlights - Array of highlights to register
     */
    registerNodeHighlights(nodeId: string, highlights: ExternalHighlight[]): void {
        registerHighlights(nodeId, highlights);
    }

    /**
     * Clear all highlights for a Lineage node.
     * Used by external plugins to remove highlights.
     *
     * @param nodeId - The Lineage node ID
     */
    clearNodeHighlights(nodeId: string): void {
        clearHighlights(nodeId);
    }

    /**
     * Returns true if the file at `path` is configured to open in a Lineage view.
     *
     * @param filepath - The path of the file to check
     */
    isLineageDocument(filepath: string): boolean {
        return (
            this.settings.getValue().documents[filepath]?.viewType === 'lineage'
        );
    }

    /**
     * Open the Lineage cards that contain `searchText` and focus the first
     * matching card.
     *
     * This is the public API used by external plugins (e.g. Advanced URI) to
     * deep-link into the cards that contain a given piece of text.
     *
     * If `filepath` is provided and is a Lineage document that is not yet open
     * in a Lineage view, it is opened in a Lineage view first.
     *
     * @param searchText - The text to search for in the cards
     * @param filepath - Optional path of the Lineage document to search
     * @returns The number of matching cards, or `-1` if the file is not a
     *          Lineage document (or no Lineage view is available).
     */
    async findAndOpenCards(searchText: string, filepath?: string): Promise<number> {
        const D = (msg: string, ...rest: unknown[]) =>
            /* eslint-disable-next-line no-console */
            console.log(`[FindAndOpenCards] ${msg}`, ...rest);
        D('start search=', JSON.stringify(searchText), 'filepath=', filepath);

        if (filepath) {
            D('isLineageDocument=', this.isLineageDocument(filepath));
            if (!this.isLineageDocument(filepath)) {
                D('NOT a lineage document, returning -1');
                return -1;
            }
            const file = this.app.vault.getAbstractFileByPath(filepath);
            if (!(file instanceof TFile)) {
                D('file not found in vault, returning -1');
                return -1;
            }

            const existingLeaf = getLeafOfFile(this, file, LINEAGE_VIEW_TYPE);
            D('existingLineageLeaf=', existingLeaf ? 'YES' : 'NO');
            if (!existingLeaf) {
                const markdownLeaf = getLeafOfFile(this, file, 'markdown');
                D('existingMarkdownLeaf=', markdownLeaf ? 'YES' : 'NO');
                if (markdownLeaf) {
                    // Convert the markdown leaf into a Lineage view.
                    D('converting markdown leaf -> lineage');
                    toggleObsidianViewType(this, markdownLeaf, 'lineage');
                } else {
                    D('opening new tab + converting -> lineage');
                    const leaf = await openFile(this, file, 'tab');
                    toggleObsidianViewType(this, leaf, 'lineage');
                }
            }
        }

        const view = await this.waitForLineageView(filepath, D);
        D('view after wait =', view ? `${view.file?.path} contentKeys=${Object.keys(view.documentStore.getValue().document.content).length}` : 'null');
        if (!view) {
            D('no lineage view available, returning -1');
            return -1;
        }

        // Diagnostic: how many lineage leaves exist for this file, which one is
        // active/connected, and whether this view is the visible one.
        {
            const allLeaves = this.app.workspace.getLeavesOfType(
                LINEAGE_VIEW_TYPE,
            );
            const forFile = allLeaves.filter(
                (l) => (l.view as LineageView)?.file?.path === filepath,
            );
            const activeLeaf = this.app.workspace.activeLeaf;
            D('lineage leaves for file=', forFile.length, 'of total=', allLeaves.length);
            D('this view is activeLeaf=', (view.leaf === activeLeaf), 'leafWin=', (view.leaf as unknown as { window?: Window }).window === window);
            D('view connected to DOM=', view.containerEl.isConnected,
                'has .columns-container=', !!view.containerEl.querySelector('.columns-container'),
                'has .mindmap-container=', !!view.containerEl.querySelector('.mindmap-container'));
            D('mindmapMode setting=', this.settings.getValue().view.mindmapMode);
            for (const l of forFile) {
                const v = l.view as LineageView;
                D('leaf: isActiveLeaf=', (l === activeLeaf),
                    'connected=', v.containerEl.isConnected,
                    'viewId=', v.id);
            }
        }

        // Ensure the view's leaf is active and focused so align/scroll runs.
        try {
            this.app.workspace.setActiveLeaf(view.leaf, { focus: true });
        } catch (e) {
            D('setActiveLeaf failed', e);
        }

        // When the file is freshly opened, the view's mount align
        // (view/life-cycle/mount, priority 100) is a SMOOTH scroll that runs
        // after our navigation and would override it. It also blocks our
        // set-active-node align (priority 90 < 100, so the align returns early
        // while the mount is still running). Wait for the mount scroll to
        // finish before navigating.
        await delay(500);
        D('waited 500ms for mount scroll to settle');

        const rawQuery = String(searchText ?? '');
        const query = this.normalizeSearchQuery(rawQuery);
        D('query normalized: from=', JSON.stringify(rawQuery), 'to=', JSON.stringify(query));
        if (query.length === 0) return 0;

        // Sample the content we are matching against.
        const content = view.documentStore.getValue().document.content;
        const contentKeys = Object.keys(content);
        D('contentKeys=', contentKeys.length, 'sampleFirst3=', contentKeys.slice(0, 3));
        D('content snippets=', contentKeys.slice(0, 5).map((k) => ({
            id: k,
            content: (content[k]?.content ?? '').slice(0, 80),
        })));

        // Dispatch through Lineage's own search action so matching cards get
        // highlighted and the first match activated (same as the built-in box).
        view.viewStore.dispatch({
            type: 'view/search/set-query',
            payload: { query },
        });
        const fuseCount = view.viewStore.getValue().search.results.size;
        D('fuseCount after set-query dispatch =', fuseCount);
        if (fuseCount > 0) {
            const ids = Array.from(
                view.viewStore.getValue().search.results.keys(),
            );
            D('fuse matched nodeIds=', ids);
            return fuseCount;
        }

        // Fuse found nothing, so a search query is now active with an empty
        // result set. Lineage's UI filters out ALL cards in that state (see
        // group.svelte), which would keep the target card hidden even after we
        // navigate to it. Clear the query to reveal every card before we find
        // and navigate to the match ourselves.
        D('clearing search query to reveal cards');
        view.viewStore.dispatch({
            type: 'view/search/set-query',
            payload: { query: '' },
        });

        // The Fuse search uses exact whole-query matching by default (threshold
        // 0) and can miss chunk text that differs in casing, whitespace or
        // formatting. Fall back to a tolerant scan over the raw card content.
        const matches = this.findMatchingLineageNodeIds(view, query, D);
        D('fallback matches=', matches, matches.map((m) => ({
            id: m,
            snippet: (content[m]?.content ?? '').slice(0, 80),
        })));
        if (matches.length > 0) {
            // `openmode: 'window'` opens the file in a new window, which creates a
            // DUPLICATE Lineage leaf for the same file. `getActiveViewOfType` (used
            // by waitForLineageView) returns the globally-active leaf, which may be
            // the freshly-opened popout leaf that has NOT rendered its cards yet
            // (empty contentEl). Navigating that leaf is a no-op. So we navigate
            // EVERY Lineage leaf for the file that actually has the card rendered in
            // its own DOM - whichever one is visible to the user gets revealed.
            const allLeaves = this.app.workspace.getLeavesOfType(
                LINEAGE_VIEW_TYPE,
            );
            const forFile = allLeaves.filter(
                (l) => (l.view as LineageView)?.file?.path === filepath,
            );
            const activeLeaf = this.app.workspace.activeLeaf;
            let navigated = 0;
            for (const leaf of forFile) {
                const v = leaf.view as LineageView;
                // NOTE: do NOT gate navigation on a synchronous hasCard check.
                // The card element may not be in the DOM yet (Svelte renders
                // node IDs asynchronously, ~300ms after the document loads), so a
                // synchronous check would skip every leaf. Instead we navigate
                // every leaf and let scrollCardIntoView's retry wait for the card.
                const hasCardNow = this.findCardElement(v, matches[0]) !== null;
                const rendered =
                    ((v as unknown as { contentEl?: HTMLElement }).contentEl
                        ?.children.length ??
                        0) >
                    0 ||
                    !!v.containerEl.querySelector(
                        '.columns-container, .mindmap-container',
                    );
                D(
                    'leaf',
                    v.id,
                    'isActiveLeaf=',
                    leaf === activeLeaf,
                    'hasCardNow=',
                    hasCardNow,
                    'rendered=',
                    rendered,
                );
                // Clear any active search filter on THIS view so all cards are
                // revealed (an active query with empty results hides every card).
                v.viewStore.dispatch({
                    type: 'view/search/set-query',
                    payload: { query: '' },
                });
                // The viewStore context (the document the reducer uses to resolve
                // the active branch) can lag behind the documentStore after a
                // reload, because node IDs are regenerated. Sync it with the
                // current document first so navigation uses the same columns we
                // matched against - otherwise updateActiveBranch throws
                // "could not find group for node".
                v.viewStore.setContext(v.documentStore.getValue().document);
                D('dispatching set-active-node/mouse to id=', matches[0], 'on leaf', v.id);
                v.viewStore.dispatch({
                    type: 'view/set-active-node/mouse',
                    payload: { id: matches[0] },
                });
                this.scrollCardIntoView(v, matches[0], D);
                navigated++;
            }
            D('navigated leaves=', navigated);
        }
        D('returning match count=', matches.length);
        return matches.length;
    }

    /**
     * Guaranteed scroll of the card into view. Lineage cards render with an
     * id equal to the node id, so we can scroll the DOM element directly
     * (this scrolls every scrollable ancestor) rather than relying solely on
     * the align-branch effect.
     */
    private scrollCardIntoView(
        view: LineageView,
        nodeId: string,
        D?: (msg: string, ...rest: unknown[]) => void,
    ): void {
        const tryScroll = (): boolean => {
            const el = this.findCardElement(view, nodeId);
            if (!el) {
                D?.(
                    'scrollCardIntoView: element NOT FOUND',
                    'containerEl.children=',
                    view.containerEl?.children.length ?? -1,
                    'contentEl.children=',
                    (view as unknown as { contentEl?: HTMLElement }).contentEl
                        ?.children.length ?? -1,
                );
                return false;
            }
            // The card is in the DOM, but its window may not be focused yet.
            // `openmode: 'window'` opens a popout that is NOT focused when this
            // runs; scrolling it before it is focused has no visible effect (the
            // scroll is "swallowed" by the time it takes the window to open).
            // So wait until the card's own window is focused before scrolling.
            const focused = el.ownerDocument.hasFocus();
            if (!focused) {
                D?.(
                    'scrollCardIntoView: card found but its window is not focused yet, waiting',
                );
                return false;
            }
            this.performScroll(view, el, nodeId, D);
            return true;
        };
        if (!tryScroll()) {
            // The card may not be rendered yet (Svelte needs to update after the
            // reducer state change) and/or its window may not be focused yet
            // (openmode=window opens a popout). Retry until both are true.
            let attempts = 0;
            const interval = window.setInterval(() => {
                if (tryScroll() || ++attempts > 40) {
                    window.clearInterval(interval);
                }
            }, 150);
            window.setTimeout(() => window.clearInterval(interval), 6000);
        }
    }

    /**
     * Actually scrolls the card element into view. Must only be called once the
     * card is in the DOM AND its window is focused (see scrollCardIntoView).
     */
    private performScroll(
        view: LineageView,
        el: HTMLElement,
        nodeId: string,
        D?: (msg: string, ...rest: unknown[]) => void,
    ): void {
        // Scroll every scrollable ancestor so the card is centered.
        //
        // IMPORTANT 1: the card (and its scroll containers) may live in a
        // DIFFERENT window than the one this code runs in (openmode=window
        // opens a popout). So every DOM API here must use the element's OWN
        // window/document, not the current window's.
        //
        // IMPORTANT 2: Lineage applies transform: scale(zoom) to .columns.
        // getBoundingClientRect returns SCREEN pixels (post-transform), but
        // scrollTop is in LAYOUT pixels. So the scroll delta must be divided
        // by the zoom level (exactly what Lineage's own alignVertically does:
        // column.scrollBy({ top: (scrollTop * -1) / zoomLevel })). Without
        // this, the scroll lands in the wrong place whenever zoom != 1.
        const elDoc = el.ownerDocument;
        const elWin = elDoc.defaultView as Window;
        const zoom = view.plugin.settings.getValue().view.zoomLevel || 1;
        const cardRectBefore = el.getBoundingClientRect();
        let scrollableCount = 0;
        const scrolled: { cls: string; dTop: number; dLeft: number }[] = [];
        let node: HTMLElement | null = el.parentElement;
        while (node && node !== elDoc.body) {
            const style = elWin.getComputedStyle(node);
            const overflowY = style.overflowY;
            const overflowX = style.overflowX;
            const scrollable =
                (overflowY === 'auto' || overflowY === 'scroll') &&
                node.scrollHeight > node.clientHeight + 1;
            const scrollableX =
                (overflowX === 'auto' || overflowX === 'scroll') &&
                node.scrollWidth > node.clientWidth + 1;
            if (scrollable || scrollableX) {
                const contRect = node.getBoundingClientRect();
                let dTop = 0;
                let dLeft = 0;
                if (scrollable) {
                    dTop = Math.round(
                        (cardRectBefore.top -
                            contRect.top -
                            (contRect.height - cardRectBefore.height) / 2) /
                            zoom,
                    );
                    node.scrollTop += dTop;
                }
                if (scrollableX) {
                    dLeft = Math.round(
                        (cardRectBefore.left -
                            contRect.left -
                            (contRect.width - cardRectBefore.width) / 2) /
                            zoom,
                    );
                    node.scrollLeft += dLeft;
                }
                scrollableCount++;
                scrolled.push({
                    cls: node.className?.toString().slice(0, 40) ?? node.tagName,
                    dTop,
                    dLeft,
                });
            }
            node = node.parentElement;
        }
        const cardRectAfter = el.getBoundingClientRect();
        D?.(
            'manual scroll: card=',
            nodeId,
            'zoom=',
            zoom,
            'scrollableAncestors=',
            scrollableCount,
            'scrolled=',
            scrolled,
            'cardTopBefore=',
            Math.round(cardRectBefore.top),
            'cardTopAfter=',
            Math.round(cardRectAfter.top),
            'cardInCurrentWindow=',
            elDoc === window.document,
            'inColumns=',
            !!el.closest('.columns-container'),
        );
        // Re-trigger Lineage's own align (centers the active node using its own
        // zoom-aware logic) as a backup / to also scroll sibling columns.
        try {
            view.alignBranch.align({ type: 'view/align-branch/center-node' });
        } catch (e) {
            D?.('align re-trigger failed', e);
        }
    }

    /**
     * Finds the card DOM element for `nodeId`, searching the correct window's
     * document (the view may live in a popout window opened via openmode=window)
     * and all candidate roots (container, containerEl, contentEl).
     */
    private findCardElement(
        view: LineageView,
        nodeId: string,
    ): HTMLElement | null {
        const doc =
            view.containerEl?.ownerDocument ??
            window.document;
        const roots: (HTMLElement | null)[] = [
            view.container,
            view.containerEl,
            (view as unknown as { contentEl?: HTMLElement }).contentEl ?? null,
            doc.querySelector('.lineage-view') as HTMLElement | null,
        ];
        for (const root of roots) {
            if (!root) continue;
            const el = root.querySelector(
                `#${CSS.escape(nodeId)}`,
            ) as HTMLElement | null;
            if (el) return el;
        }
        return doc.getElementById(nodeId) as HTMLElement | null;
    }

    /**
     * Collapses all whitespace to single spaces and trims, so that extra
     * newlines/indentation in a pasted chunk do not break matching.
     */
    private normalizeSearchQuery(query: string): string {
        return query.replace(/\s+/g, ' ').trim();
    }

    /**
     * Tolerant search for cards containing `query`, handling the case where the
     * query is a longer chunk that does not appear verbatim (as a single exact
     * substring) in any card.
     *
     * 1. Whole-phrase match (case-insensitive, whitespace-normalized).
     * 2. Fallback: score each card by how many of the query's words it contains
     *    and return the best-scoring cards (covers chunks spanning cards).
     */
    /**
     * Tolerant search for cards containing `query`, handling the case where the
     * query is a longer chunk that does not appear verbatim (as a single exact
     * substring) in any card.
     *
     * Only nodes that exist in the live column tree are considered - stale
     * node IDs left in `document.content` but absent from `columns` are
     * skipped, because navigating to them makes the reducer throw
     * "could not find group for node".
     *
     * 1. Whole-phrase match (case-insensitive, whitespace-normalized).
     * 2. Fallback: score each card by how many of the query's words it contains
     *    and return the best-scoring cards (covers chunks spanning cards).
     */
    private findMatchingLineageNodeIds(
        view: LineageView,
        query: string,
        D?: (msg: string, ...rest: unknown[]) => void,
    ): string[] {
        const documentState = view.documentStore.getValue();
        const validIds = new Set<string>();
        for (const column of documentState.document.columns) {
            for (const group of column.groups) {
                for (const nodeId of group.nodes) validIds.add(nodeId);
            }
        }
        D?.(
            'fallback: contentKeys=',
            Object.keys(documentState.document.content).length,
            'treeNodeCount=',
            validIds.size,
        );

        const content = documentState.document.content;
        const normalizedQuery = this.normalizeSearchQuery(query).toLowerCase();
        D?.('fallback: normalizedQuery=', JSON.stringify(normalizedQuery));
        const wholePhraseMatches: string[] = [];
        for (const nodeId of validIds) {
            const cardContent = this.normalizeSearchQuery(
                content[nodeId]?.content ?? '',
            ).toLowerCase();
            if (cardContent.includes(normalizedQuery)) {
                wholePhraseMatches.push(nodeId);
            }
        }
        D?.('fallback wholePhraseMatches=', wholePhraseMatches);
        if (wholePhraseMatches.length > 0) return wholePhraseMatches;

        const tokens = normalizedQuery
            .split(' ')
            .filter((t) => t.length >= 3);
        D?.('fallback tokens=', tokens);
        if (tokens.length === 0) return [];

        const scored: { id: string; score: number }[] = [];
        for (const nodeId of validIds) {
            const cardContent = this.normalizeSearchQuery(
                content[nodeId]?.content ?? '',
            ).toLowerCase();
            let score = 0;
            for (const token of tokens) {
                if (cardContent.includes(token)) score++;
            }
            if (score > 0) scored.push({ id: nodeId, score });
        }
        D?.('fallback scored=', scored);
        if (scored.length === 0) return [];
        scored.sort((a, b) => b.score - a.score);
        const topScore = scored[0].score;
        const top = scored.filter((s) => s.score === topScore).map((s) => s.id);
        D?.('fallback topScore=', topScore, 'topIds=', top);
        return top;
    }

    /**
     * Waits until the active LineageView has loaded the document at `filepath`
     * (or the active view document when `filepath` is omitted).
     */
    private async waitForLineageView(
        filepath?: string,
        D?: (msg: string, ...rest: unknown[]) => void,
    ): Promise<LineageView | null> {
        const deadline = Date.now() + 3000;
        let view = this.app.workspace.getActiveViewOfType(LineageView);
        while (Date.now() < deadline) {
            view = this.app.workspace.getActiveViewOfType(LineageView);
            if (view && view.file) {
                const matchesPath = !filepath || view.file.path === filepath;
                const hasContent =
                    Object.keys(view.documentStore.getValue().document.content)
                        .length > 0;
                const hasContainer = !!view.container;
                D?.(`waitForLineageView poll: path=${view.file.path} matchesPath=${matchesPath} hasContent=${hasContent} hasContainer=${hasContainer}`);
                if (matchesPath && hasContent && hasContainer) return view;
            }
            await delay(25);
        }
        D?.('waitForLineageView TIMEOUT (3s)');
        return view;
    }

    async onload() {
        await this.loadSettings();
        this.store = new Store<PluginState, PluginStoreActions>(
            DefaultPluginState(),
            pluginReducer,
            onPluginError,
        );
        loadCustomIcons();
        this.registerView(
            LINEAGE_VIEW_TYPE,
            (leaf) => new LineageView(leaf, this),
        );
        this.registerView(
            GLOBAL_CATEGORIES_VIEW_TYPE,
            (leaf) => new GlobalCategoriesView(leaf, this),
        );
        addCommands(this);
        this.registerPatches();
        this.registerEvents();
        this.statusBar = new StatusBar(this);
        this.loadRibbonIcon();
        this.registerMarkdownPostProcessor(
            removeHtmlElementMarkerInPreviewMode,
        );
    }

    async saveSettings() {
        await this.saveData(this.settings.getValue());
    }

    async loadSettings() {
        const rawSettings = (await this.loadData()) || {};
        const settings = deepMerge(rawSettings, DEFAULT_SETTINGS());
        migrateSettings(settings);
        this.settings = new Store<Settings, SettingsActions>(
            settings,
            settingsReducer,
            onPluginError,
        );
        this.settings.subscribe(() => {
            this.saveSettings();
        });
        settingsSubscriptions(this);
    }

    private registerEvents() {
        registerFileMenuEvent(this);
        registerFilesMenuEvent(this);
        onVaultEvent(this);
        onWorkspaceEvent(this);
    }

    registerTimeout(timeout: ReturnType<typeof setTimeout>) {
        this.timeoutReferences.add(timeout);
    }

    private registerPatches() {
        this.register(around(this.app.workspace, { setActiveLeaf }));
        const setViewState = createSetViewState(this);
        // @ts-ignore
        this.register(around(WorkspaceLeaf.prototype, { setViewState }));
    }

    private loadRibbonIcon() {
        this.addRibbonIcon(
            customIcons.cards.name,
            'Toggle Lineage view',
            () => {
                const file = getActiveFile(this);
                if (file) toggleFileViewType(this, file, undefined);
                else createLineageDocument(this);
            },
        );
        this.addRibbonIcon(
            customIcons.folderTree.name,
            lang.global_categories_view_title,
            () => {
                openGlobalCategoriesView(this);
            },
        );
    }

    onunload() {
        super.onunload();
        for (const timeout of this.timeoutReferences) {
            clearTimeout(timeout);
        }
        minimapWorker.terminate();
        rulesWorker.terminate();
        statusBarWorker.terminate();
    }
}
