import { id } from 'src/helpers/id';
import {
    LineageDocument,
    Snapshot,
    SnapshotContext,
} from 'src/stores/document/document-state-type';

export const createSnapshot = (
    document: LineageDocument,
    context: SnapshotContext,
) => {
    return {
        data: {
            columns: JSON.stringify(document.columns),
            content: JSON.stringify(document.content),
            meta: JSON.stringify(document.meta ?? {}),
        },
        context,
        created: Date.now(),
        id: id.snapshot(),
    } satisfies Snapshot;
};
