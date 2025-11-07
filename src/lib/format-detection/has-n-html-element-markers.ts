import { parseHtmlElementMarker } from 'src/lib/formats/helpers/html-element-marker/parse-html-element-marker';

export const hasNHtmlElementMarker = (input: string, n = 2): boolean => {
    const lines = input.split('\n');
    let count = 0;
    for (const line of lines) {
        if (parseHtmlElementMarker(line)) {
            count++;
            if (count >= n) return true;
        }
    }
    return false;
};
