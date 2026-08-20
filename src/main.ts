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

        // Ensure the view's leaf is active and focused so align/scroll runs.
        try {
            this.app.workspace.setActiveLeaf(view.leaf, { focus: true });
        } catch (e) {
            D('setActiveLeaf failed', e);
        }

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
            // The viewStore context (the document the reducer uses to resolve
            // the active branch) can lag behind the documentStore after a
            // reload, because node IDs are regenerated. Sync it with the
            // current document first so navigation uses the same columns we
            // matched against - otherwise updateActiveBranch throws
            // "could not find group for node".
            view.viewStore.setContext(view.documentStore.getValue().document);
            D('dispatching set-active-node/mouse to id=', matches[0]);
            view.viewStore.dispatch({
                type: 'view/set-active-node/mouse',
                payload: { id: matches[0] },
            });
            this.scrollCardIntoView(view, matches[0], D);
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
        const container = view.container;
        D?.(
            'scrollCardIntoView: container=',
            container ? `${container.tagName}.${container.className}` : 'NULL',
            'containerEl=',
            view.containerEl ? `${view.containerEl.tagName}.${view.containerEl.className}` : 'NULL',
        );
        const roots: (HTMLElement | null)[] = [
            container,
            view.containerEl,
            document.querySelector('.lineage-view') as HTMLElement | null,
        ];
        const doScroll = (): boolean => {
            for (const root of roots) {
                const el = root?.querySelector(
                    `#${CSS.escape(nodeId)}`,
                ) as HTMLElement | null;
                if (el) {
                    el.scrollIntoView({
                        behavior: 'smooth',
                        block: 'nearest',
                        inline: 'nearest',
                    });
                    D?.('scrolled card into view: ', nodeId);
                    return true;
                }
            }
            // Broader fallback: search the entire document.
            const anyEl = document.getElementById(nodeId) as HTMLElement | null;
            if (anyEl) {
                anyEl.scrollIntoView({
                    behavior: 'smooth',
                    block: 'nearest',
                    inline: 'nearest',
                });
                D?.('scrolled card into view (document): ', nodeId);
                return true;
            }
            return false;
        };
        if (!doScroll()) {
            // The card may not be rendered yet (Svelte needs to update after
            // the reducer state change, or it is under a collapsed parent that
            // the reducer is expanding). Retry a few times.
            let attempts = 0;
            const interval = window.setInterval(() => {
                if (doScroll() || ++attempts > 30) {
                    window.clearInterval(interval);
                }
            }, 150);
            window.setTimeout(() => window.clearInterval(interval), 5000);
        }
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
                D?.(`waitForLineageView poll: path=${view.file.path} matchesPath=${matchesPath} hasContent=${hasContent}`);
                if (matchesPath && hasContent) return view;
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
