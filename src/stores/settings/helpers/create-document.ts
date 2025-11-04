import {
    DocumentPreferences,
    LineageDocumentFormat,
    Settings,
} from 'src/stores/settings/settings-type';

export const createDocument = (
    store: Settings,
    path: string,
    format: LineageDocumentFormat,
) => {
    return {
        documentFormat: format,
        viewType: 'lineage',
        activeSection: null,
        pinnedSections: {
            sections: [],
            activeSection: null,
        },
        outline: {
            collapsedSections: [],
        },
    } satisfies DocumentPreferences;
};
