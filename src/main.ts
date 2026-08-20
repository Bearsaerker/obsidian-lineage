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
        if (filepath) {
            if (!this.isLineageDocument(filepath)) return -1;
            const file = this.app.vault.getAbstractFileByPath(filepath);
            if (!(file instanceof TFile)) return -1;

            const existingLeaf = getLeafOfFile(this, file, LINEAGE_VIEW_TYPE);
            if (!existingLeaf) {
                const markdownLeaf = getLeafOfFile(this, file, 'markdown');
                if (markdownLeaf) {
                    // Convert the markdown leaf into a Lineage view.
                    toggleObsidianViewType(this, markdownLeaf, 'lineage');
                } else {
                    const leaf = await openFile(this, file, 'tab');
                    toggleObsidianViewType(this, leaf, 'lineage');
                }
            }
        }

        const view = await this.waitForLineageView(filepath);
        if (!view) return -1;

        const query = this.normalizeSearchQuery(String(searchText ?? ''));
        if (query.length === 0) return 0;

        // Dispatch through Lineage's own search action so matching cards get
        // highlighted and the first match activated (same as the built-in box).
        view.viewStore.dispatch({
            type: 'view/search/set-query',
            payload: { query },
        });
        const fuseCount = view.viewStore.getValue().search.results.size;
        if (fuseCount > 0) return fuseCount;

        // The Fuse search uses exact whole-query matching by default (threshold
        // 0) and can miss chunk text that differs in casing, whitespace or
        // formatting. Fall back to a tolerant scan over the raw card content.
        const matches = this.findMatchingLineageNodeIds(view, query);
        if (matches.length > 0) {
            view.viewStore.dispatch({
                type: 'view/set-active-node/mouse',
                payload: { id: matches[0] },
            });
        }
        return matches.length;
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
    private findMatchingLineageNodeIds(view: LineageView, query: string): string[] {
        const content = view.documentStore.getValue().document.content;
        const normalizedQuery = this.normalizeSearchQuery(query).toLowerCase();
        const wholePhraseMatches: string[] = [];
        for (const [nodeId, nodeData] of Object.entries(content)) {
            const cardContent = this.normalizeSearchQuery(
                nodeData?.content ?? '',
            ).toLowerCase();
            if (cardContent.includes(normalizedQuery)) {
                wholePhraseMatches.push(nodeId);
            }
        }
        if (wholePhraseMatches.length > 0) return wholePhraseMatches;

        const tokens = normalizedQuery
            .split(' ')
            .filter((t) => t.length >= 3);
        if (tokens.length === 0) return [];

        const scored: { id: string; score: number }[] = [];
        for (const [nodeId, nodeData] of Object.entries(content)) {
            const cardContent = this.normalizeSearchQuery(
                nodeData?.content ?? '',
            ).toLowerCase();
            let score = 0;
            for (const token of tokens) {
                if (cardContent.includes(token)) score++;
            }
            if (score > 0) scored.push({ id: nodeId, score });
        }
        if (scored.length === 0) return [];
        scored.sort((a, b) => b.score - a.score);
        const topScore = scored[0].score;
        return scored.filter((s) => s.score === topScore).map((s) => s.id);
    }

    /**
     * Waits until the active LineageView has loaded the document at `filepath`
     * (or the active view document when `filepath` is omitted).
     */
    private async waitForLineageView(
        filepath?: string,
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
                if (matchesPath && hasContent) return view;
            }
            await delay(25);
        }
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
