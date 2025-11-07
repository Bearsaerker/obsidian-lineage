import { findHighestHeadingLevel } from 'src/lib/formats/helpers/find-highest-heading-level';

export const correctHeadings = (markdown: string): string => {
    const lines = markdown.split('\n');
    const headingRegex = /^(#+) +(.*)$/;

    const highestHeadingLevel = findHighestHeadingLevel(lines);
    const state: {
        previousLevel: number;
        previousCorrectedLevel: number;
        previousLevels: { level: number; correctedLevel: number }[];
        isInCodeBlock: boolean;
    } = {
        previousLevel: 0,
        previousCorrectedLevel: 0,
        previousLevels: [],
        isInCodeBlock: false,
    };
    const updatedLines: string[] = [];
    for (const line of lines) {
        if (line.startsWith('```')) {
            state.isInCodeBlock = !state.isInCodeBlock;
        }
        const match = state.isInCodeBlock ? null : line.match(headingRegex);
        let updatedLine: string | null = null;
        if (match) {
            const level = match[1].length;
            const text = match[2];

            let correctedLevel: number;
            const parentIndex = state.previousLevels.findLastIndex(
                (l) => l.level < level,
            );
            const parent = state.previousLevels[parentIndex];
            if (!parent) {
                correctedLevel = highestHeadingLevel;
            } else if (level > state.previousLevel) {
                // make sure headings are incremented by 1
                correctedLevel = state.previousCorrectedLevel + 1;
            } else if (level < state.previousLevel) {
                correctedLevel = Math.min(
                    highestHeadingLevel,
                    level,
                    state.previousCorrectedLevel - 1,
                );
                // make sure headings stay under their previous parent
                if (parent) {
                    if (
                        correctedLevel <= parent.level &&
                        level > parent.level
                    ) {
                        correctedLevel = parent.correctedLevel + 1;
                    }
                }
            } else if (level === state.previousLevel) {
                correctedLevel = state.previousCorrectedLevel;
            } else {
                correctedLevel = level;
            }

            updatedLine = `${'#'.repeat(correctedLevel)} ${text}`;

            state.previousLevel = level;
            state.previousCorrectedLevel = correctedLevel;
            state.previousLevels.push({ level, correctedLevel });
        }
        if (updatedLine) updatedLines.push(updatedLine);
        else updatedLines.push(line);
    }
    return updatedLines.join('\n');
};
