import { jsonToText } from 'src/lib/formats/json-to-x/json-to-text';
import { ClipboardBranch } from 'src/stores/document/document-state-type';
import { branchToJson } from 'src/lib/formats/x-to-json/branch-to-json';

export const branchToText = (branches: ClipboardBranch[]) => {
    return jsonToText(branchToJson(branches));
};
