import { TreeNode } from 'src/lib/formats/x-to-json/columns-to-json';
import { Notice, TFile } from 'obsidian';
import Lineage from 'src/main';
import { onPluginError } from 'src/lib/store/on-plugin-error';
import { mapFilesToGingkoFiles } from 'src/obsidian/events/workspace/effects/import-from-gingko/helpers/map-files-to-gingko-files';
import { createLineageDocumentsFromGingkoFiles } from 'src/obsidian/events/workspace/effects/import-from-gingko/helpers/create-lineage-documents-from-gingko-files';

export type GingkoFile = {
    basename: string;
    tree: TreeNode[];
};

export const importFromGingko = async (plugin: Lineage, files: TFile[]) => {
    try {
        const parentFolder = files[0].parent?.path;
        if (!parentFolder) return;
        const gingkoFiles = await mapFilesToGingkoFiles(plugin, files);
        await createLineageDocumentsFromGingkoFiles(
            plugin,
            gingkoFiles,
            parentFolder,
        );
        new Notice(
            `Imported ${gingkoFiles.length} Gingko file${gingkoFiles.length === 1 ? '' : 's'}`,
        );
    } catch (e) {
        onPluginError(e, 'command', { files });
    }
};
