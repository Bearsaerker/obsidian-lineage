import { htmlCommentToJson } from 'src/lib/formats/x-to-json/html-comment-to-json';
import { jsonToColumns } from 'src/lib/formats/json-to-x/json-to-columns';
import { ClipboardBranch } from 'src/stores/document/document-state-type';
import { getBranch } from 'src/view/actions/keyboard-shortcuts/helpers/commands/commands/helpers/get-branch';
import { detectDocumentFormat } from 'src/lib/format-detection/detect-document-format';
import { outlineToJson } from 'src/lib/formats/x-to-json/outline-to-json';
import { htmlElementToJson } from 'src/lib/formats/x-to-json/html-element-to-json';
import { TreeNode } from 'src/lib/formats/x-to-json/columns-to-json';

export const textToBranches = (text: string) => {
    const detectedFormat = detectDocumentFormat(text, false);
    const tree =
        text.trim().length > 0
            ? detectedFormat === 'outline'
                ? outlineToJson(text)
                : detectedFormat === 'html-element'
                  ? htmlElementToJson(text)
                  : htmlCommentToJson(text)
            : [{ children: [], content: '' } satisfies TreeNode];

    const document = jsonToColumns(tree);

    const branches: ClipboardBranch[] = [];
    for (const nodeId of document.columns[0].groups[0].nodes) {
        const branch = getBranch(
            document.columns,
            document.content,
            nodeId,
            'copy',
        );
        branches.push(branch);
    }

    return branches;
};
