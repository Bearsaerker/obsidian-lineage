export const level = (parentNumber: string, index: number) =>
    `${parentNumber ? parentNumber + '.' : ''}${index}`;
export const createHtmlCommentMarker = (parentNumber: string, index: number) =>
    `\n<!--section: ${level(parentNumber, index)}-->`;
