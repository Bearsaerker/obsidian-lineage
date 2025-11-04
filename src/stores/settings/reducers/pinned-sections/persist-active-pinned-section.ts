import { Settings } from 'src/stores/settings/settings-type';
import { PersistActivePinnedSectionAction } from 'src/stores/settings/settings-store-actions';
import { createDocument } from 'src/stores/settings/helpers/create-document';

export const persistActivePinnedSection = (
    store: Settings,
    action: PersistActivePinnedSectionAction,
) => {
    const path = action.payload.filePath;
    let document = store.documents[path];
    if (!document) {
        document = createDocument(
            store,
            path,
            store.general.defaultDocumentFormat,
        );
        store.documents[path] = document;
    }
    if (!document.pinnedSections) {
        document.pinnedSections = {
            sections: [],
            activeSection: null,
        };
    }
    document.pinnedSections.activeSection = action.payload.section;
};
