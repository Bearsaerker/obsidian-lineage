import { LineageDocument } from 'src/stores/document/document-state-type';
import { LineageDocumentFormat } from 'src/stores/settings/settings-type';
import { columnsToJson } from 'src/lib/formats/x-to-json/columns-to-json';
import { jsonToHtmlComment } from 'src/lib/formats/json-to-x/json-to-html-comment';
import { jsonToOutline } from 'src/lib/formats/json-to-x/json-to-outline';
import { jsonToHtmlElement } from 'src/lib/formats/json-to-x/json-to-html-element';

export const stringifyDocument = (
    document: LineageDocument,
    format: LineageDocumentFormat,
) => {
    const json = columnsToJson(document.columns, document.content);
    if (format === 'outline') {
        return jsonToOutline(json);
    } else if (format === 'html-element') {
        return jsonToHtmlElement(json);
    } else {
        return jsonToHtmlComment(json);
    }
};
