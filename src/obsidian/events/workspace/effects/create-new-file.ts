import Lineage from 'src/main';
import { TFile, TFolder } from 'obsidian';
import invariant from 'tiny-invariant';
import { getUniqueFileName } from 'src/obsidian/events/workspace/effects/get-unique-file-name';

export type LineageFileExtension = 'md' | 'tree';

export const createNewFile = async (
    plugin: Lineage,
    folder: TFolder,
    data = '',
    basename = 'Untitled',
    extension: LineageFileExtension = 'md',
) => {
    invariant(folder);
    const children = folder.children
        .map((c) =>
            c instanceof TFile && c.extension === extension ? c.basename : null,
        )
        .filter((f) => f) as string[];
    const path = getUniqueFileName(folder.path, children, basename);
    const newFilePath = path + '.' + extension;

    const file = await plugin.app.vault.create(newFilePath, data);
    invariant(file);
    return file;
};
