import { getBranch } from 'src/view/actions/keyboard-shortcuts/helpers/commands/commands/helpers/get-branch';
import { branchToHtmlComment } from 'src/lib/formats/branch-to-x/branch-to-html-comment';
import { branchToOutline } from 'src/lib/formats/branch-to-x/branch-to-outline';
import { LineageDocumentFormat } from 'src/stores/settings/settings-type';
import {
    LineageDocument,
    Sections,
} from 'src/stores/document/document-state-type';
import { branchToHtmlElement } from 'src/lib/formats/branch-to-x/branch-to-html-element';
import { branchToText } from 'src/lib/formats/branch-to-x/branch-to-text';
import { clone } from 'src/helpers/clone';
import { formatHeadings } from 'src/stores/document/reducers/content/format-content/format-headings';

export const mapBranchesToText = (
    document: LineageDocument,
    nodes: Array<string>,
    format: LineageDocumentFormat | 'unformatted-text',
    sections?: Sections,
) => {
    if (sections) {
        document = clone(document);
        formatHeadings(document.content, sections);
    }
    const branches = nodes.map((node) =>
        getBranch(document.columns, document.content, node, 'copy'),
    );

    const isSingleNode =
        nodes.length === 1 && Object.keys(branches[0].content).length === 1;

    if (isSingleNode) {
        return branches[0].content[nodes[0]].content;
    } else if (format === 'outline') {
        return branchToOutline(branches);
    } else if (format === 'html-element') {
        return branchToHtmlElement(branches);
    } else if (format === 'sections') {
        return branchToHtmlComment(branches);
    } else if (format === 'unformatted-text') {
        return branchToText(branches);
    } else {
        throw new Error(`Invalid format: ${format}`);
    }
};
