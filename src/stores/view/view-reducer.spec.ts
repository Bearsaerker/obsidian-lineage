import { describe, expect, it } from 'vitest';
import { viewReducer } from 'src/stores/view/view-reducer';
import { defaultViewState } from 'src/stores/view/default-view-state';
import { LineageDocument } from 'src/stores/document/document-state-type';
import { ViewState } from 'src/stores/view/view-state-type';

const emptyContext: LineageDocument = {
    columns: [],
    content: {},
};

const createState = (): ViewState => {
    const state = defaultViewState();
    state.ui.controls = {
        showHistorySidebar: false,
        showHelpSidebar: false,
        showSettingsSidebar: false,
        showStyleRulesModal: false,
        showLeftSidebar: false,
        zenMode: false,
    };
    return state;
};

describe('view/zen/toggle', () => {
    it('flips zenMode from false to true', () => {
        const state = createState();
        viewReducer(state, { type: 'view/zen/toggle' }, emptyContext);
        expect(state.ui.controls.zenMode).toBe(true);
    });

    it('flips zenMode from true back to false', () => {
        const state = createState();
        state.ui.controls.zenMode = true;
        viewReducer(state, { type: 'view/zen/toggle' }, emptyContext);
        expect(state.ui.controls.zenMode).toBe(false);
    });
});

describe('modal branches preserve zenMode', () => {
    it('view/close-modals preserves zenMode', () => {
        const state = createState();
        state.ui.controls.zenMode = true;
        viewReducer(
            state,
            { type: 'view/close-modals', payload: { closeAllModals: true } },
            emptyContext,
        );
        expect(state.ui.controls.zenMode).toBe(true);
    });

    it('view/settings/toggle-modal preserves zenMode', () => {
        const state = createState();
        state.ui.controls.zenMode = true;
        viewReducer(
            state,
            { type: 'view/settings/toggle-modal' },
            emptyContext,
        );
        expect(state.ui.controls.zenMode).toBe(true);
    });

    it('view/snapshots/toggle-modal preserves zenMode', () => {
        const state = createState();
        state.ui.controls.zenMode = true;
        viewReducer(
            state,
            { type: 'view/snapshots/toggle-modal' },
            emptyContext,
        );
        expect(state.ui.controls.zenMode).toBe(true);
    });

    it('view/hotkeys/toggle-modal preserves zenMode', () => {
        const state = createState();
        state.ui.controls.zenMode = true;
        viewReducer(
            state,
            { type: 'view/hotkeys/toggle-modal' },
            emptyContext,
        );
        expect(state.ui.controls.zenMode).toBe(true);
    });
});
