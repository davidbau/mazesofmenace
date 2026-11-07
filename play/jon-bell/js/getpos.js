// Cursor targeting helpers from NetHack 5.0 getpos.c.
import { docrt_flags, docrtRefresh } from './display.js';

// C getpos.c:30-38: HiliteNormalMap, HiliteGoodposSymbol, HiliteBackground.
export const HiliteNormalMap = 0;
export const HiliteGoodposSymbol = 1;
export const HiliteBackground = 2;

// The cursor loops and callback installation currently live in cmd.js.
export const getpos_hilite_state = { current: HiliteNormalMap, default: HiliteNormalMap };

// C getpos.c:752-768. Refresh the existing glyph buffer after help or redraw;
// do not regenerate terrain or vision (which would discard detection maps).
// Callbacks are supplied by the cursor owner, including its existing
// getpos_sethilite implementation. Validity callbacks can be async in JS.
export async function getpos_refresh(hilitefunc, getvalid, sethilite) {
    if (hilitefunc && getpos_hilite_state.current === HiliteGoodposSymbol) {
        await hilitefunc(false);
        getpos_hilite_state.current = getpos_hilite_state.default;
    }

    docrt_flags(docrtRefresh);

    if (hilitefunc && getpos_hilite_state.current === HiliteBackground)
        await sethilite(hilitefunc, getvalid);
}
