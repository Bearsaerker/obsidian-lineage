import Lineage from 'src/main';

/**
 * Body class applied while global zen mode is on. The matching CSS lives in
 * src/styles/zen.css and hides Obsidian's native workspace chrome (view
 * header, tab bar, left ribbon, left/right docks, titlebar buttons, status
 * bar).
 */
export const ZEN_MODE_CLASS = 'lineage-zen-mode';

/**
 * Subscribes to the plugin store and toggles the zen body class on <body>
 * while global zen mode is on. Returns an unsubscribe function that the
 * plugin registers for cleanup on unload.
 */
export const subscribeZenModeToBody = (plugin: Lineage) => {
    return plugin.store.subscribe((state) => {
        if (state.zenMode) {
            document.body.addClass(ZEN_MODE_CLASS);
        } else {
            document.body.removeClass(ZEN_MODE_CLASS);
        }
    });
};