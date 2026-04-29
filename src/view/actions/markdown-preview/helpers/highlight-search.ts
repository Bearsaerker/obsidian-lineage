/**
 * Finds all occurrences of a search term in the content (case-insensitive).
 * Returns an array of [start, end] indices for each match.
 */
function findSubstringMatches(content: string, searchTerm: string): [number, number][] {
    if (!searchTerm) return [];

    const matches: [number, number][] = [];
    const lowerContent = content.toLowerCase();
    const lowerSearch = searchTerm.toLowerCase();

    let startPos = 0;
    while (true) {
        const index = lowerContent.indexOf(lowerSearch, startPos);
        if (index === -1) break;
        matches.push([index, index + searchTerm.length - 1]);
        startPos = index + 1; // Find overlapping matches
    }

    return matches;
}

/**
 * Wraps matched character ranges in the content with <mark> tags.
 * Uses exact substring matching (case-insensitive).
 */
export function highlightSearch(
    content: string,
    searchQuery: string
): string {
    if (!searchQuery) {
        return content;
    }

    // Find exact substring matches
    const matches = findSubstringMatches(content, searchQuery);
    if (matches.length === 0) return content;

    // Build a set of character indices that are matched
    const matchedIndices = new Set<number>();
    for (const [start, end] of matches) {
        for (let i = start; i <= end; i++) {
            matchedIndices.add(i);
        }
    }

    // Build result by wrapping contiguous matched ranges with <mark>
    let result = '';
    let inMark = false;
    let markStart = 0;

    for (let i = 0; i <= content.length; i++) {
        const isMatched = i < content.length && matchedIndices.has(i);

        if (isMatched && !inMark) {
            // Start of a matched range
            inMark = true;
            markStart = i;
        } else if (!isMatched && inMark) {
            // End of a matched range
            inMark = false;
            result += `<mark class="search-highlight">${content.slice(markStart, i)}</mark>`;
        }

        if (!inMark && i < content.length) {
            result += content[i];
        }
    }

    // Handle case where match extends to end of string
    if (inMark) {
        result += `<mark class="search-highlight">${content.slice(markStart)}</mark>`;
    }

    return result;
}
