import { LineageDocument } from 'src/stores/document/document-state-type';
import { jsonToHtmlComment } from 'src/lib/formats/json-to-x/json-to-html-comment';
import { columnsToJson } from 'src/lib/formats/x-to-json/columns-to-json';

export const text = (document: LineageDocument) =>
    jsonToHtmlComment(columnsToJson(document.columns, document.content));
