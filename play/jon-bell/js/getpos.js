// Cursor targeting helpers from NetHack 5.0 getpos.c.
import { docrt_flags } from './display.js';

// C getpos.c:30-38: HiliteNormalMap, HiliteGoodposSymbol, HiliteBackground.
// The cursor loops and callback installation currently live in cmd.js.
export const getpos_hilite_state = { current: 0, default: 0 };

// C getpos.c:752-768. Refresh the existing glyph buffer after help or redraw;
// do not regenerate terrain or vision (which would discard detection maps).
// Callbacks are supplied by the cursor owner, including its existing
// getpos_sethilite implementation. Validity callbacks can be async in JS.
export async function getpos_refresh(hilitefunc, getvalid, sethilite) {
    if (hilitefunc && getpos_hilite_state.current === 1) {
        await hilitefunc(false);
        getpos_hilite_state.current = getpos_hilite_state.default;
    }

    // display.js currently encodes docrtRefresh as 0x04 (C uses 1).
    docrt_flags(0x04);

    if (hilitefunc && getpos_hilite_state.current === 2)
        await sethilite(hilitefunc, getvalid);
}
