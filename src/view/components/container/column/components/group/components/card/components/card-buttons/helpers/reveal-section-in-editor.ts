import { getPersistedDocumentFormat } from 'src/obsidian/events/workspace/helpers/get-persisted-document-format';
import { LineageView } from 'src/view/view';
import { findSectionPosition } from 'src/view/components/container/column/components/group/components/card/components/card-buttons/helpers/find-section-position';
import { findHtmlElementPosition } from 'src/view/components/container/column/components/group/components/card/components/card-buttons/helpers/find-html-element-position';
import { findOutlinePosition } from 'src/view/components/container/column/components/group/components/card/components/card-buttons/helpers/find-outline-position';
import { openFileAndJumpToLine } from 'src/view/components/container/column/components/group/components/card/components/card-buttons/helpers/open-file-and-jump-to-line';

export const revealSectionInEditor = async (
    view: LineageView,
    nodeId: string,
    modKey: boolean,
) => {
    const format = getPersistedDocumentFormat(view);
    const i =
        format === 'sections'
            ? findSectionPosition(view, nodeId)
            : format === 'html-element'
              ? findHtmlElementPosition(view, nodeId)
              : findOutlinePosition(view, nodeId);
    if (typeof i === 'undefined') return;
    const targetLine = i + (format === 'sections' ? 1 : 0);
    const lines = view.data.split('\n');
    const nextLine = lines[targetLine] || '';
    await openFileAndJumpToLine(
        view.plugin,
        view.file!,
        targetLine,
        nextLine.length,
        modKey,
    );
};
