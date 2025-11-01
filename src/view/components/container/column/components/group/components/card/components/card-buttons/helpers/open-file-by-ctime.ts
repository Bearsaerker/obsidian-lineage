import { LineageView } from 'src/view/view';
import invariant from 'tiny-invariant';
import { Notice, TAbstractFile, TFile, TFolder } from 'obsidian';
import { handleFileLink } from 'src/view/components/container/column/components/group/components/card/components/content/event-handlers/handle-links/file-link/handle-file-link';

const getFileByCtime = (folder: TFolder, ctime: number): TFile | null => {
    const queue: TAbstractFile[] = [...folder.children];
    for (const child of queue) {
        if (child instanceof TFile) {
            if (child.stat.ctime === ctime) return child;
        } else if (child instanceof TFolder) {
            if (child.children.length > 0) {
                queue.push(...child.children);
            }
        }
    }
    return null;
};

export const openFileByCtime = (
    view: LineageView,
    nodeId: string,
    modeKey: boolean,
) => {
    invariant(view.file?.parent);
    const documentState = view.documentStore.getValue();

    const meta = documentState.document.meta?.[nodeId];
    invariant(meta, 'metadata of node is undefined');
    let file: TFile | null = null;
    if (meta.ctime > 0) {
        file = getFileByCtime(view.file?.parent, meta.ctime);
    }
    if (file) {
        handleFileLink(view.plugin, view.file.path, file.basename, modeKey);
    } else {
        new Notice('Could not find associated file');
    }
};
