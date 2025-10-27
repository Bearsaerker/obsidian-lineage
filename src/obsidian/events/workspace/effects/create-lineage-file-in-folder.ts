import Lineage from 'src/main';
import { TFolder } from 'obsidian';
import {
    LineageFileExtension,
    createNewFile,
} from 'src/obsidian/events/workspace/effects/create-new-file';
import { openFileInLineage } from 'src/obsidian/events/workspace/effects/open-file-in-lineage';

export const createLineageFileInFolder = async (
    plugin: Lineage,
    folder: TFolder,
    extension: LineageFileExtension = 'md',
) => {
    const newFile = await createNewFile(plugin, folder, '', 'index', extension);
    if (newFile) {
        const format =
            extension === 'tree'
                ? 'outline'
                : plugin.settings.getValue().general.defaultDocumentFormat;
        await openFileInLineage(plugin, newFile, format, 'tab');
    }
};
