<script lang="ts">
	import { getView } from '../../../../../../../context';
	import { ActiveStatus } from 'src/view/components/container/column/components/group/components/active-status.enum';
	import { lang } from 'src/lang/lang';
	import Pin from './pin-indicator.svelte';
	import { isMacLike } from 'src/view/actions/keyboard-shortcuts/helpers/keyboard-events/mod-key';
	import {
		openFileByCtime
	} from 'src/view/components/container/column/components/group/components/card/components/card-buttons/helpers/open-file-by-ctime';
	import {
		revealSectionInEditor
	} from 'src/view/components/container/column/components/group/components/card/components/card-buttons/helpers/reveal-section-in-editor';

	const view = getView();
    export let nodeId: string;
    export let activeStatus: ActiveStatus | null;
    export let section: string;
    export let pinned: boolean;

    // eslint-disable-next-line no-undef
    const openFile = async (e: MouseEvent) => {
        if (!view.file) return;
		const modKey = isMacLike ? e.metaKey : e.ctrlKey;
		if(view.isTree){
			openFileByCtime(view, nodeId, modKey)
		} else {
			revealSectionInEditor(view, nodeId, modKey)
      	}
    };
    const classes: Partial<Record<ActiveStatus, string>> = {
        [ActiveStatus.node]: 'is-active',
        [ActiveStatus.child]: 'is-active-child',
        [ActiveStatus.parent]: 'is-active-parent',
        [ActiveStatus.sibling]: 'is-active-parent',
    };
</script>

<div class={'tree-index ' + (activeStatus ? classes[activeStatus] : '')}>
    {#if pinned}
        <Pin />
    {/if}
    <span aria-label={lang.card_btn_reveal_in_editor} on:click={openFile}>
        {section}
    </span>
</div>

<style>
    .tree-index {
        position: absolute;
        bottom: 3px;
        right: 8px;
        opacity: 0.8;
        font-size: 12px;
        cursor: pointer;

    }
    .is-active {
        opacity: 0.3;
    }

    .is-active-child {
        opacity: 0.3;
    }

    .is-active-parent {
        opacity: 0.6;
    }



</style>
