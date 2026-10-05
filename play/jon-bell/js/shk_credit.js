import { game } from './gstate.js';
import { ESHK } from './const.js';
import { pline } from './display.js';
import { currency } from './cmd.js';

/* C shk.c:628 credit_report: snapshot credit, debit and loan around an
 * operation, then report the first applicable change in that order. */
export async function credit_report(shkp, idx, silent) {
    const eshk = ESHK(shkp);
    const snapshots = game._credit_report_snapshots
        ||= [[0, 0, 0], [0, 0, 0]];
    if (!idx) {
        snapshots[0] = [0, 0, 0];
        snapshots[1] = [0, 0, 0];
    } else {
        idx = 1;
    }
    snapshots[idx] = [eshk.credit || 0, eshk.debit || 0, eshk.loan || 0];
    if (idx && !silent) {
        const [before, now] = snapshots;
        let amount = 0, message = 'debt has increased';
        if (now[0] < before[0]) {
            amount = before[0] - now[0];
            message = 'credit has been reduced';
        } else if (now[1] > before[1]) {
            amount = now[1] - before[1];
        } else if (now[2] > before[2]) {
            amount = now[2] - before[2];
        }
        if (amount)
            await pline(`Your ${message} by ${amount} ${currency(amount)}.`);
    }
}
