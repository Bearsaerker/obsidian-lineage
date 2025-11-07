import Lineage from 'src/main';
import { TFile } from 'obsidian';
import { TreeNode } from 'src/lib/formats/x-to-json/columns-to-json';
import { verifyJsonFile } from 'src/obsidian/events/workspace/effects/import-from-gingko/helpers/verify-json-file';
import { GingkoFile } from 'src/obsidian/events/workspace/effects/import-from-gingko/import-from-gingko';

export const mapFilesToGingkoFiles = async (
    plugin: Lineage,
    files: TFile[],
) => {
    const gingkoFiles: GingkoFile[] = [];
    for (const file of files) {
        const content = await plugin.app.vault.read(file);
        const tree = JSON.parse(content) as TreeNode[];

        const isValid = verifyJsonFile(tree);
        if (!isValid)
            throw new Error(
                `File "${file.basename}" does not seem to be valid a Gingko file`,
            );
        gingkoFiles.push({
            basename: file.basename,
            tree: tree,
        });
    }
    return gingkoFiles;
};
