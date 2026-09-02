// mail.js, the scroll of mail.
// C ref: src/mail.c
import { game } from './gstate.js';
import { rn2 } from './rng.js';
import { Blind } from './youprop.js';
import { pline } from './display.js';

/* include/hack.h:1556 DEVTEAM_EMAIL, :1557 DEVTEAM_URL */
const DEVTEAM_EMAIL = 'devteam@nethack.org';
const DEVTEAM_URL = 'https://www.nethack.org/';

/* src/mail.c:487 readmail()'s junk_templates[] (the AMIGA-only entries are
   not compiled into the recorder) */
const junk_templates = [
    '%sReport bugs to <%s>.%s', /*** must be first entry ***/
    'Please disregard previous letter.',
    'Welcome to NetHack.',
    'This mail complies with the Yendorian Anti-Spam Act (YASA)',
    'Please find enclosed a small token to represent your Owlbear',
    '**FR33 P0T10N 0F FULL H34L1NG**',
    'Please return to sender (Asmodeus)',
    'Buy a potion of gain level for only $19.99!  Guaranteed to be blessed!',
    '%sInvitation: Visit the NetHack web site at %s%s',
];

// src/mail.c:487 readmail(), a scroll of mail's junk mail.
export async function readmail(otmp) {
    let i;
    const normal_delivery = 0, subst_delivery = 1, faulty_delivery = 2;
    let delivery = normal_delivery;
    let recipient = null;
    const it_reads = 'It reads:  "';

    i = rn2(junk_templates.length);
    if (junk_templates[i].includes('%')) {
        if (i === 0) {
            recipient = DEVTEAM_EMAIL;
            delivery = subst_delivery;
        } else if (junk_templates[i].toLowerCase().includes('web site')) {
            recipient = DEVTEAM_URL;
            delivery = subst_delivery;
        } else {
            /* impossible("fake mail #%d has undefined substitution", i); */
            delivery = faulty_delivery;
        }
    }
    if (Blind()) {
        await pline('Unfortunately you cannot see what it says.');
    } else {
        if (delivery === subst_delivery)
            await pline(junk_templates[i].replace('%s', it_reads)
                        .replace('%s', recipient).replace('%s', '"'));
        else if (delivery === normal_delivery)
            await pline(`${it_reads}${junk_templates[i]}"`);
    }
}
