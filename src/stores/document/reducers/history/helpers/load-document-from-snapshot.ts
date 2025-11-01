import {
    DocumentHistory,
    LineageDocument,
    Snapshot,
} from 'src/stores/document/document-state-type';

export const loadDocumentFromSnapshot = (
    document: LineageDocument,
    snapshot: Snapshot,
    history: DocumentHistory,
) => {
    history.context.activeSection = snapshot.context.newActiveSection;
    document.content = JSON.parse(snapshot.data.content);
    document.columns = JSON.parse(snapshot.data.columns);
    document.meta = JSON.parse(snapshot.data.meta);
};
