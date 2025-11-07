import { ClipboardBranch } from 'src/stores/document/document-state-type';
import { jsonToHtmlComment } from 'src/lib/formats/json-to-x/json-to-html-comment';
import { branchToJson } from 'src/lib/formats/x-to-json/branch-to-json';

export const branchToHtmlComment = (branches: ClipboardBranch[]) => {
    return jsonToHtmlComment(branchToJson(branches));
};
