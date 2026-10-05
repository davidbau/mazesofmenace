// C ref: pline.c
import { game } from './gstate.js';
import * as input from './input.js';
import { CLR_GRAY } from './terminal.js';

function sprintf(format, ...args) {
    let i = 0;
    return format.replace(/%%|%[sd]/g, (match) => {
        if (match === '%%') return '%';
        const val = args[i++];
        return val !== undefined ? String(val) : '';
    });
}

export async function pline(msgOrFormat, ...args) {
    const msg = (args.length > 0 || msgOrFormat.includes('%')) ? sprintf(msgOrFormat, ...args) : msgOrFormat;

    if (!game.nhDisplay) {
        game._pending_message = msg;
        return;
    }

    const display = game.nhDisplay;
    if (display.toplin === 1) { // TOPLINE_NEED_MORE
        await more();
    }
    display.putstr_message(msg);
}

export async function more() {
    const display = game.nhDisplay;
    if (!display) return;

    // Add --More-- to current message
    let current = display.topMessage || '';
    const suffix = current.length > 0 ? " --More--" : "--More--";

    // Ensure we don't overflow the 80 column terminal
    if (current.length + suffix.length > 80) {
        current = current.substring(0, 80 - suffix.length);
    }

    const moreStr = current + suffix;

    display.clearRow(0);
    display.putstr(0, 0, moreStr, CLR_GRAY);
    display.setCursor(moreStr.length, 0);

    // Wait for input
    // Any key dismisses the more prompt
    let c = await input.nhgetch();

    display.clearRow(0);
    display.toplin = 0; // TOPLINE_EMPTY
    display.topMessage = null;
}

export async function You(msgOrFormat, ...args) {
    const msg = (args.length > 0 || msgOrFormat.includes('%')) ? sprintf(msgOrFormat, ...args) : msgOrFormat;
    return await pline(`You ${msg}`);
}

export async function verbalize(msgOrFormat, ...args) {
    const msg = (args.length > 0 || msgOrFormat.includes('%')) ? sprintf(msgOrFormat, ...args) : msgOrFormat;
    return await pline(`"${msg}"`);
}
