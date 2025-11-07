export const findHighestHeadingLevel = (lines: string[]) => {
    let isInCodeBlock = false;
    return lines.reduce((acc, val) => {
        if (val.startsWith('```')) {
            isInCodeBlock = !isInCodeBlock;
        }
        if (isInCodeBlock) return acc;
        const match = val.match(/^(#+) +(.*)$/);
        if (match) {
            const level = match[1].length;
            if (level < acc) acc = level;
        }
        return acc;
    }, 6);
};
