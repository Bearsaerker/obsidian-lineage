<script lang="ts">
    import VerticalToolbar from './toolbar-vertical/vertical-toolbar.svelte';
    import ZoomButtons from './toolbar-vertical/zoom-buttons/zoom-buttons.svelte';
    import Container from './container-wrapper.svelte';
    import Breadcrumbs from './breadcrumbs/breadcrumbs.svelte';
    import Toolbar from './toolbar/toolbar.svelte';
    import Settings from 'src/view/components/container/modals/settings/settings.svelte';
    import FileHistory from 'src/view/components/container/modals/snapshots-list/file-histoy.svelte';
    import Hotkeys from 'src/view/components/container/modals/hotkeys/hotkeys.svelte';
    import { LineageView } from '../../view';
    import Lineage from '../../../main';
    import { setContext, onMount, onDestroy } from 'svelte';
    import { uiControlsStore } from 'src/stores/view/derived/ui-controls-store';
    import { viewHotkeysAction } from 'src/view/actions/keyboard-shortcuts/view-hotkeys-action';
    import { mouseWheelZoom } from 'src/view/actions/mouse-wheel-zoom';
    import RightSidebar from './right-sidebar/right-sidebar.svelte';
    import { clickAndDrag } from 'src/view/actions/click-and-drag/click-and-drag';
    import LeftSidebar from 'src/view/components/container/left-sidebar/left-sidebar.svelte';
    import { showContextMenu } from 'src/view/actions/context-menu/show-context-menu';
    import DNDEdges from './dnd/dnd-edges.svelte';
    import StyleRules from './style-rules/style-rules.svelte';

    export let plugin: Lineage;
    export let view: LineageView;
    setContext('plugin', plugin);
    setContext('view', view);
    const controls = uiControlsStore(view);

    // When this view is BOTH active and in zen mode, hide Obsidian's own UI
    // chrome (tabs, nav arrows, ribbon, sidebars, status bar) by adding a
    // class to <body>. The matching CSS lives in src/styles/zen.css.
    const ZEN_MODE_CLASS = 'lineage-zen-mode';
    // Incremented on active-leaf-change (and once in onMount) to force the
    // reactive block below to re-evaluate. We deliberately derive the active
    // state fresh via getActiveViewOfType inside the block rather than relying
    // on a stored boolean, so toggling zen always re-checks the current view
    // (the active-leaf-change event does not fire when the view is already
    // active and the leaf never changes).
    let activeLeafVersion = 0;

    onMount(() => {
        plugin.registerEvent(
            plugin.app.workspace.on('active-leaf-change', () => {
                activeLeafVersion++;
            }),
        );
        // The listener only fires on change; bump once so the initial state is
        // evaluated immediately.
        activeLeafVersion++;
    });

    $: {
        // Referencing the counter registers it as a reactive dependency, so
        // the block re-runs whenever the active leaf changes (and once at
        // mount via the onMount bump).
        void activeLeafVersion;
        const isActive =
            plugin.app.workspace.getActiveViewOfType(LineageView) === view;
        const shouldHide =
            isActive && Boolean($controls) && $controls.zenMode === true;
        if (shouldHide) {
            console.log('[zen-mode] adding body class', ZEN_MODE_CLASS, {
                isActive,
                zenMode: $controls?.zenMode,
                bodyHasClass: document.body.hasClass(ZEN_MODE_CLASS),
                bodyClassList: document.body.className,
            });
            document.body.addClass(ZEN_MODE_CLASS);
        } else {
            if (document.body.hasClass(ZEN_MODE_CLASS)) {
                console.log('[zen-mode] removing body class', ZEN_MODE_CLASS, {
                    isActive,
                    zenMode: $controls?.zenMode,
                    currentView: view.file?.path,
                });
            }
            document.body.removeClass(ZEN_MODE_CLASS);
        }
    }

    // If this view is destroyed while zen mode is active (e.g. the tab is
    // closed), make sure the global body class is removed so Obsidian's UI
    // is not left hidden.
    onDestroy(() => {
        document.body.removeClass(ZEN_MODE_CLASS);
    });
</script>

<div
    class="lineage-view"
    use:viewHotkeysAction={{ view }}
    use:showContextMenu={view}
    tabindex="0"
>
    <LeftSidebar />

    <div class={`lineage-main`} use:mouseWheelZoom={view} use:clickAndDrag="{view}">
        <Container />
        {#if !$controls.zenMode}
            <Toolbar />
            <Breadcrumbs />
            <VerticalToolbar />
            <ZoomButtons />
        {/if}
        {#if $controls.showHistorySidebar}
            <FileHistory />
        {:else if $controls.showHelpSidebar}
            <Hotkeys />
        {:else if $controls.showSettingsSidebar}
            <Settings />
        {:else if $controls.showStyleRulesModal}
            <StyleRules />
        {/if}

        <DNDEdges />
    </div>
    {#if !$controls.zenMode}
        <RightSidebar />
    {/if}
</div>

<style>
    .lineage-main {
        --z-index-breadcrumbs: 10;

        display: flex;
        height: 100%;
        flex: 1 1 auto;
        width: 0; /* ensures it shrinks properly when the minimap is visible */
        position: relative;
    }



    .lineage-view {
        background-color: var(--background-container);
        display: flex;
        height: 100%;
        width: 100%;
    }
</style>
