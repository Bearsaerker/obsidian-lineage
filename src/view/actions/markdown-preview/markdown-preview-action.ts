import { MarkdownRenderer } from 'obsidian';
import { getPlugin, getView } from 'src/view/components/container/context';
import { contentStore } from 'src/stores/document/derived/content-store';
import { formatText } from 'src/view/actions/markdown-preview/helpers/format-text';
import { highlightSearch } from 'src/view/actions/markdown-preview/helpers/highlight-search';
import { derived } from 'src/lib/store/derived';

export const markdownPreviewAction = (
    element: HTMLElement,
    params: { nodeId: string }
) => {
    const plugin = getPlugin();
    const view = getView();

    const render = (content: string, searchQuery: string) => {
        if (view && element) {
            element.empty();
            if (content.length > 0) {
                content = highlightSearch(content, searchQuery);
                content = formatText(content);
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

    // Get the search query reactively from the view store
    const searchQueryStore = derived(view.viewStore, (state) => {
        return state.search.query;
    });

    const $content = contentStore(view, params.nodeId);
    let currentContent = '';
    let currentSearchQuery = '';

    const unsubContent = $content.subscribe((content) => {
        currentContent = content;
        render(currentContent, currentSearchQuery);
    });

    const unsubSearch = searchQueryStore.subscribe((query) => {
        currentSearchQuery = query;
        render(currentContent, currentSearchQuery);
    });

    return {
        destroy: () => {
            unsubContent();
            unsubSearch();
        },
    };
};
