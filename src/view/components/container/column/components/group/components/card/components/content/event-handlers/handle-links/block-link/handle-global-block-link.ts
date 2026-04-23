import { LineageView } from 'src/view/view';
import { openFileInLineage } from 'src/obsidian/events/workspace/effects/open-file-in-lineage';
import { selectCard } from 'src/view/components/container/column/components/group/components/card/components/content/event-handlers/handle-links/helpers/select-card';
import { delay } from 'src/helpers/delay';

export const getLinkPaneType = (view: LineageView, modKey: boolean) => {
    const linkPaneType = view.plugin.settings.getValue().general.linkPaneType;
    if (modKey) {
        return linkPaneType === 'tab' ? 'split' : 'tab';
    } else {
        return linkPaneType;
    }
};

const findLineageLeafForFile = (app: any, filePath: string) => {
    const leaves = app.workspace.getLeavesOfType('lineage');
    return leaves.find((l: any) => l.view?.file?.path === filePath);
};

const waitForBlockInDOM = async (
    view: LineageView,
    blockId: string,
    timeoutMs = 3000,
) => {
    const startTime = Date.now();
    while (Date.now() - startTime < timeoutMs) {
        const container = view.container;
        if (!container) {
            await delay(50);
            continue;
        }
        const element = container.querySelector(
            `[data-block-id="^${blockId}"]`,
        ) as HTMLElement;
        if (element) {
            return element;
        }
        await delay(50);
    }
    return null;
};

export const handleGlobalBlockLink = async (
    view: LineageView,
    link: string,
    modKey: boolean,
) => {
    const match = /(.*)#\^(\S{4,})$/.exec(link);
    if (!match) {
        // Fallback: open normally if we can't parse the link
        view.plugin.app.workspace.openLinkText(
            link,
            view.file!.basename,
            getLinkPaneType(view, modKey),
        );
        return;
    }
    const fileName = match[1];
    const blockId = match[2];

    // Resolve the file name to a TFile
    const linkedFile =
        view.plugin.app.metadataCache.getFirstLinkpathDest(
            fileName,
            view.file!.path,
        );
    if (!linkedFile) {
        // File not found, fall back to default behavior
        view.plugin.app.workspace.openLinkText(
            link,
            view.file!.basename,
            getLinkPaneType(view, modKey),
        );
        return;
    }

    // Check if the target file is already open in a lineage view
    const existingLeaf = findLineageLeafForFile(
        view.plugin.app,
        linkedFile.path,
    );

    let targetView: LineageView;

    if (existingLeaf && existingLeaf.view instanceof LineageView) {
        // File already open — use the existing view
        targetView = existingLeaf.view;
    } else {
        // File not open — open it in Lineage view
        await openFileInLineage(
            view.plugin,
            linkedFile,
            'sections', // default format - will be detected from existing data
            modKey
                ? getLinkPaneType(view, modKey) === 'split'
                    ? 'split'
                    : 'tab'
                : 'tab',
        );

        // After layout settles, find the newly opened view
        await new Promise<void>((resolve) => {
            view.plugin.app.workspace.onLayoutReady(resolve);
        });

        const newLeaf = findLineageLeafForFile(
            view.plugin.app,
            linkedFile.path,
        );
        if (!newLeaf || !(newLeaf.view instanceof LineageView)) {
            // Fallback if we couldn't find the newly opened view
            view.plugin.app.workspace.openLinkText(
                link,
                view.file!.basename,
                getLinkPaneType(view, modKey),
            );
            return;
        }
        targetView = newLeaf.view;
    }

    // Wait for the DOM to render the block element
    const blockElement = await waitForBlockInDOM(
        targetView,
        blockId,
    );

    if (!blockElement) {
        // Block not found in DOM — fall back to default behavior
        view.plugin.app.workspace.openLinkText(
            link,
            view.file!.basename,
            getLinkPaneType(view, modKey),
        );
        return;
    }

    // Find the card and activate it
    const card = blockElement.closest('.lineage-card') as HTMLElement;
    if (card && card.id) {
        await selectCard(targetView, card.id);
    } else {
        // Card not found — fall back to default behavior
        view.plugin.app.workspace.openLinkText(
            link,
            view.file!.basename,
            getLinkPaneType(view, modKey),
        );
    }
};
