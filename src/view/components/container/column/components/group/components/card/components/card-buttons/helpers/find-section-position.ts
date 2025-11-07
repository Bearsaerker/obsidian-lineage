import { parseHtmlCommentMarker } from 'src/lib/formats/helpers/html-comment-marker/parse-html-comment-marker';
import { LineageView } from 'src/view/view';
import { get } from 'svelte/store';

export const findSectionPosition = (view: LineageView, nodeId: string) => {
    const lines = view.data.split('\n');
    const treeIndex = get(view.documentStore).sections.id_section[nodeId];
    for (let i = 0; i < lines.length; i++) {
        const line = lines[i];
        if (line.startsWith('<!--')) {
            const section = parseHtmlCommentMarker(line);
            if (section && section[2] === treeIndex) {
                return i;
            }
        }
    }
};
