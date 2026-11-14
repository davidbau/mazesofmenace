// rumors.js — C ref: rumors.c.
import { exercise } from './attrib.js';
import { display_text_window, verbalize, SetVoice } from './cmd.js';
import { A_WIS } from './const.js';
import { rumor_file_open, rumor_rnd_line } from './display.js';
import { is_fainted } from './eat.js';
import { game } from './gstate.js';
import { BY_COOKIE, BY_ORACLE, BY_PAPER, _Blind_mk } from './mklev.js';
import { impossible as lifecycle_impossible, pline } from './pline.js';
import { rn2, rnd } from './rnd.js';
import { BUFSZ } from './const.js'; // relocate-fns
import { dat_content } from './dat_source.js'; // relocate-fns
import { rumor_couldnt_open_file, rumor_fgets } from './display.js'; // relocate-fns
import { xcrypt } from './hacklib.js'; // relocate-fns
import { yn_function } from './cmd.js';
import { currency } from './invent.js';
import { record_achievement } from './insight.js'; // relocate-fns
import { ACH_ORCL, ECMD_OK, ECMD_TIME } from './const.js'; // relocate-fns
import { money_cnt } from './hack.js'; // relocate-fns
import { Monnam } from './mcastu.js'; // relocate-fns
import { _money2mon } from './sounds.js'; // relocate-fns
import { more_experienced } from './uhitm.js';
import { newexplevel } from './exper.js'; // relocate-fns

/* C rumors.c:114 `static const char *cookie_marker = "[cookie] "` — makedefs
   tags the fortune-cookie-only rumors with this prefix.  17 of the 397 false
   rumors carry it; no true rumor does. */
const cookie_marker = '[cookie] ';
const voice_oracle = 0x0008; /* C sndprocs.h:164 */

// C ref: rumors.c:117 getrumor(truth, rumor_buf, exclude_cookie)
//
// THE do-while IS LOAD-BEARING, NOT DECORATION.  When exclude_cookie is set
// (every caller except the BY_COOKIE/BY_PAPER reading path) and the line just
// drawn is cookie-tagged, C throws it away and rolls the WHOLE selection
// again — a fresh rn2(2) adjtruth AND a fresh rn2(section_size) offset.  The
// re-roll can land in the other pool, so the second draw's modulus differs
//
// RNG per iteration, in order: rn2(2) [rumors.c:151] then rn2(section_size)
// [rumors.c:167 -> get_rnd_line:465, itself up to 10 draws for pad rejection].
// After the loop, and only if it didn't run away, C exercises Wisdom — but
// NOT during level generation (`else if (!gi.in_mklev)`, rumors.c:174), which
// is why graffiti draw no exercise RNG and a fortune cookie does.
//
// truth: 1 = true rumor, -1 = false rumor, 0 = either (rn2(2) decides).
export async function getrumor(truth, exclude_cookie) {
    let rumor_buf = '';
    if ((game.true_rumor_size ?? 0) < 0) return rumor_buf;
    const rumors = await rumor_file_open();
    if (!rumors) return rumor_buf;
    let count = 0;
    let adjtruth = 0;
    do {
        rumor_buf = '';
        if ((game.true_rumor_size ?? 0) === 0 && !init_rumors(rumors))
            return 'Error reading "rumors".'; /* C rumors.c:142 */
        /*
         *  C rumors.c:145-150 —
         *  input:      1    0   -1
         *   rn2 \ +1  2=T  1=T  0=F
         *   adj./ +0  1=T  0=F -1=F
         */
        adjtruth = truth + rn2(2);
        switch (adjtruth) {
            case 2: /*(might let a bogus input arg sneak thru)*/
            case 1:
                rumor_buf = rumor_rnd_line(rumors, true, rn2);
                break;
            case 0: /* once here, 0 => false rather than "either" */
            case -1:
                rumor_buf = rumor_rnd_line(rumors, false, rn2);
                break;
            default:
                await lifecycle_impossible('strange truth value for rumor');
                return 'Oops...';
        }
    } while (count++ < 50 && exclude_cookie && rumor_buf.startsWith(cookie_marker));
    /* C rumors.c:172-175 — if (count >= 50) impossible(...); else if
       (!gi.in_mklev) exercise(A_WIS, (adjtruth > 0)).  The in_mklev guard is
       C's own comment "avoid exercising wisdom for graffiti". */
    if (count >= 50)
        await lifecycle_impossible("Can't find non-cookie rumor?");
    else if (!game.in_mklev)
        exercise(A_WIS, adjtruth > 0);
    /* C rumors.c:180-189 — the reading paths keep a cookie rumor but show it
       without its marker. */
    if (!exclude_cookie && rumor_buf.startsWith(cookie_marker))
        rumor_buf = rumor_buf.slice(cookie_marker.length);
    return rumor_buf;
}

export async function outrumor(truth, mechanism) {
    const fortune_msg = 'This cookie has a scrap of paper inside.';
    const reading = (mechanism === BY_COOKIE || mechanism === BY_PAPER);

    if (reading) {
        /* deal with various things that prevent reading */
        if (is_fainted() && mechanism === BY_COOKIE) {
            return;
        } else if (_Blind_mk()) {
            if (mechanism === BY_COOKIE)
                await pline(fortune_msg);
            await pline('What a pity that you cannot read it!');
            return;
        }
    }

    let line = await getrumor(truth, reading ? false : true);
    if (!line)
        line = 'NetHack rumors file closed for renovation.';
    switch (mechanism) {
    case BY_ORACLE:
        await pline('True to her word, the Oracle %ssays: ',
                    (!rn2(4) ? 'offhandedly '
                             : (!rn2(3) ? 'casually '
                                        : (rn2(2) ? 'nonchalantly ' : ''))));
        SetVoice(null, 0, 80, voice_oracle);
        await verbalize('%s', line);
        /* [WIS exercised by getrumor()] */
        return;
    case BY_COOKIE:
        await pline(fortune_msg);
        /* FALLTHRU */
    case BY_PAPER:
        await pline('It reads:');
        break;
    }
    await pline(line);      /* C pline1(line) */
}

const ORACLE_RECORDS = [
    ["If thy wand hath run out of charges, thou mayst zap it again and again; though",
     "naught will happen at first, verily, thy persistence shall be rewarded, as",
     "one last charge may yet be wrested from it!"],
    ["Though the shopkeepers be wary, thieves have nevertheless stolen much by using",
     "their digging wands to hasten exits through the pavement."],
    ["If thou hast had trouble with rust on thine armor or weapons, thou shouldst",
     "know that thou canst prevent this by, while in a confused state, reading the",
     "magical parchments which normally are used to cause their enchantment.",
     "Unguents of lubrication may provide similar protection, albeit of a",
     "transitory nature."],
    ["Behold the cockatrice, whose diminutive stature belies its hidden might.  The",
     "cockatrice can petrify any ordinary being it contacts--save those wise",
     "adventurers who eat a dead lizard or blob of acid when they feel themselves",
     "slowly turning to stone."],
    ["While some wayfarers rely on scrounging finished armour in the dungeon, the",
     "resourceful know the mystical means by which mail may be fashioned out of",
     "scales from a dragon's hide."],
    ["It is customarily known among travelers that extra-healing draughts may clear",
     "thy senses when thou art addled by delusory visions.  But never forget, the",
     "lowly potion which makes one sick may be used for the same purpose."],
    ["While the consumption of lizard flesh or water beloved of the gods may clear",
     "the muddled head, the application of the horn of a creature of utmost purity",
     "can alleviate many other afflictions as well."],
    ["If thou wouldst travel quickly between distant locations, thou must be",
     "able to control thy teleports, and in a confused state misread the scroll",
     "which usually teleports thyself locally.  Daring adventurers have also",
     "performed the same feat sans need for scrolls or potions by stepping into",
     "a particular ambuscade."],
    ["Almost all adventurers who come this way hope to pass the dread Medusa.  To",
     "do this, the best advice is to keep thine eyes blindfolded and to cause the",
     "creature to espy its own reflection in a mirror."],
    ["And where it is written \"ad aerarium\", diligent searching will often reveal",
     "the way to a trap which sends one to the Magic Memory Vault, where the riches",
     "of Croesus are stored; however, escaping from the vault with its gold is much",
     "harder than getting in."],
    ["It is well known that wily shopkeepers raise their prices whene'er they",
     "espy the garish apparel of the approaching tourist or the countenance of a",
     "disfavored patron.  They favor the gentle of manner and the fair of face.",
     "The boor may expect unprofitable transactions."],
    ["The cliche of the kitchen sink swallowing any unfortunate rings that contact",
     "its pernicious surface reflecteth greater truth than many homilies, yet",
     "even so, few have developed the skill to identify enchanted rings by the",
     "transfigurations effected upon the voracious device's frame."],
    ["The meat of enchanted creatures ofttimes conveyeth magical properties",
     "unto the consumer.  A fresh corpse of floating eye doth fetch a high",
     "price among wizards for its utility in conferring Telepathy, by which",
     "the sightless may locate surrounding minds."],
    ["The detection of blessings and curses is in the domain of the gods.  They will",
     "make this information available to mortals who request it at their places of",
     "worship, or elsewhere for those mortals who devote themselves to the service",
     "of the gods."],
    ["At times, the gods may favor worthy supplicants with named blades whose",
     "powers echo throughout legend.  Learned wayfarers can reproduce blades of",
     "elven lineage, hated of the orcs, without the need for such intervention."],
    ["There are many stories of a mighty amulet, the origins of which are said",
     "to be ancient Yendor.  This amulet doth have awesome power, and the gods",
     "desire it greatly.  Mortals mayst tap only portions of its terrible",
     "abilities.  The stories tell of mortals seeing what their eyes cannot",
     "see and seeking places of magical transportation, while having this",
     "amulet in their possession.  Others say a mortal must wear the amulet to",
     "obtain these powers.  But verily, such power comes at great cost, to",
     "preserve the balance."],
    ["It is said that thou mayst gain entry to Moloch's sanctuary, if thou",
     "darest, from a place where the ground vibrateth in the deepest depths of",
     "Gehennom.  Thou needs must have the aid of three magical items.  The",
     "pure sound of a silver bell shall announce thee.  The terrible runes,",
     "read from Moloch's book, shall cause the earth to tremble mightily.  The",
     "light of an enchanted candelabrum shall show thee the way."],
    ["In the deepest recesses of the Dungeons of Doom, guarding access to the",
     "nether regions, there standeth a castle, wherein lieth a wand of wishes.",
     "If thou wouldst gain entry, bear with thee an instrument of music, for the",
     "pontlevis may be charmed down with the proper melody.  What notes comprise",
     "it only the gods know, but a musical mastermind may yet succeed by witful",
     "improvisation.  However, the less perspicacious are not without recourse,",
     "should they be prepared to circumambulate the castle to the postern."],
    ["The gods are said to be pleased when offerings are given to the",
     "priests who attend their temples, and they may grant various favors to",
     "those who do so.  But beware!  To be young and frugal is better than to",
     "be old and miserly."],
    ["The name of Elbereth may strike fear into the hearts of thine enemies, if",
     "thou dost write it upon the ground at thy feet.  If thou maintainest the",
     "utmost calm, thy safety will be aided greatly, but beware lest thy clumsy",
     "feet scuff the inscription, cancelling its potence, or thy wayward",
     "sword-arm break the truce."],
];

const SPECIAL_ORACLE = [
    '"...it is rather disconcerting to be confronted with the',
    'following theorem from [Baker, Gill, and Solovay, 1975].',
    '',
    'Theorem 7.18  There exist recursive languages A and B such that',
    '  (1)  P(A) == NP(A), and',
    '  (2)  P(B) != NP(B)',
    '',
    'This provides impressive evidence that the techniques that are',
    'currently available will not suffice for proving that P != NP or' + '          ',
    'that P == NP."  [Garey and Johnson, p. 185.]',
];

export async function outoracle(special, delphi) {
    const g = game;
    /* early return if all the oracularities are already exhausted */
    if ((g.oracle_flg | 0) < 0 || ((g.oracle_flg | 0) > 0 && !g.oracle_cnt))
        return;

    if ((g.oracle_flg | 0) === 0) {
        g.oracle_loc = [SPECIAL_ORACLE, ...ORACLE_RECORDS];
        g.oracle_cnt = g.oracle_loc.length;
        g.oracle_flg = 1;
        if (g.oracle_cnt === 0)
            return;
    }
    if (g.oracle_cnt <= 1 && !special)
        return; /*(shouldn't happen)*/
    const oracle_idx = special ? 0 : rnd(g.oracle_cnt - 1);
    const rec = g.oracle_loc[oracle_idx];
    if (!special) /* move offset of very last one into this slot */
        g.oracle_loc[oracle_idx] = g.oracle_loc[--g.oracle_cnt];

    const lines = [];
    if (delphi)
        lines.push(special
                   ? 'The Oracle scornfully takes all your gold and says:'
                   : 'The Oracle meditates for a moment and then intones:');
    else
        lines.push('The message reads:');
    lines.push('');
    for (const l of rec) {
        if (l === '---') break; /* C rumors.c:680 stop at terminator */
        lines.push(l);
    }
    await display_text_window(lines);   /* display_nhwindow(tmpwin, TRUE) */
}

export function init_rumors(file) {
    rumor_fgets(file); /* skip "don't edit" comment */
    const line = rumor_fgets(file) || '';
    const dec = '\\s*([+-]?\\d+)', hex = '\\s*([+-]?(?:0[xX])?[0-9a-fA-F]+)';
    const header = new RegExp(`^${dec},${dec},${hex};${dec},${dec},${hex};0,0,${hex}`).exec(line);
    if (header) {
        game.true_rumor_size = Number(header[2]);
        game.true_rumor_start = parseInt(header[3], 16);
        game.false_rumor_size = Number(header[5]);
        game.false_rumor_start = parseInt(header[6], 16);
        if (game.true_rumor_size > 0 && game.false_rumor_size > 0) {
            game.true_rumor_end = game.true_rumor_start + game.true_rumor_size;
            game.false_rumor_end = game.false_rumor_start + game.false_rumor_size;
            return true;
        }
    }
    /* C rumors.c:105 (void) dlb_fclose(fp) — no-op; file cursor is an in-memory object */
    game.true_rumor_size = -1;
    return false;
}

/* C rumors.c:308-408; out is the lazily created text window's line buffer. */
export async function others_check(ftype, fname, out) {
    const text = dat_content(fname);
    if (text === null) {
        await rumor_couldnt_open_file(fname);
        return;
    }
    out.push('');
    out.push(ftype);
    let pos = 0;
    /* dlb_fgets() includes the newline and reads at most BUFSZ-1 bytes. */
    function fgets() {
        if (pos >= text.length) return null;
        const nl = text.indexOf('\n', pos);
        const end = Math.min(pos + BUFSZ - 1, nl < 0 ? text.length : nl + 1);
        const line = text.slice(pos, end).split('\0', 1)[0];
        pos = end;
        return line;
    }
    const error = (message) => out.push(`others_check("${fname}"): ${message}`);
    let line = fgets();
    if (line === null) {
        error("error; can't read comment line");
        return;
    }
    if (line[0] !== '#') {
        error('malformed; first line is not a comment line:');
        line = line.split('\n', 1)[0];
        out.push('- first line, as is', line, '- xcrypt of first line', xcrypt(line));
        return;
    }
    line = fgets();
    if (line === null || line[0] === '\n') {
        error(!line ? "can't read first non-comment line" : 'first non-comment line is empty');
        return;
    }
    out.push(xcrypt(line.split('\n', 1)[0]));
    line = fgets();
    if (line === null) {
        out.push('(no second entry)');
        return;
    }
    let entrycount = 2;
    let xbuf = xcrypt(line.split('\n', 1)[0]);
    out.push(xbuf);
    while ((line = fgets()) !== null) {
        ++entrycount;
        xbuf = xcrypt(line.split('\n', 1)[0]);
    }
    if (entrycount === 2) {
        out.push('(only two entries)');
    } else {
        if (entrycount > 3) out.push(' ...');
        out.push(xbuf);
    }
}

export async function doconsult(oracl) {
    const g = game;
    const u = g.u;
    const minor_cost = 50, major_cost = 500 + 50 * (u.ulevel | 0);
    let u_pay;
    g.multi = 0;
    const umoney = money_cnt(g.invent);
    if (!oracl) {
        await pline('There is no one here to consult.');
        return ECMD_OK;
    } else if (!oracl.mpeaceful) {
        await pline('%s is in no mood for consultations.', Monnam(oracl));
        return ECMD_OK;
    } else if (!umoney) {
        await pline('You have no gold.');
        return ECMD_OK;
    }
    let qbuf = `"Wilt thou settle for a minor consultation?" (${minor_cost} ${currency(minor_cost)})`;
    const ans = await yn_function(qbuf, 'ynq', 'q');
    if (ans === 'y') {
        if (umoney < minor_cost) {
            await pline("You don't even have enough gold for that!");
            return ECMD_OK;
        }
        u_pay = minor_cost;
    } else if (ans === 'n') {
        const oc = g.oracle_cnt;
        if (umoney <= minor_cost || oc === 1 || (g.oracle_flg | 0) < 0) {
            /* C rumors.c:731-733 returns without clearing WIN_MESSAGE;
             * tty_yn_function leaves this prompt painted (topl.c:544-548),
             * just as on the other consultation cancellation paths. */
            g._topl_sticky = `${qbuf} [ynq] (q)`;
            return ECMD_OK;
        }
        qbuf = `"Then dost thou desire a major one?" (${major_cost} ${currency(major_cost)})`;
        if ((await yn_function(qbuf, 'yn', 'n')) !== 'y') {
            /* C rumors.c:733-737 returns without clear_nhwindow, so the
             * answered prompt stays physically on the topline (tty leaves
             * TOPLINE_NON_EMPTY); keep it painted via the sticky fallback. */
            g._topl_sticky = `${qbuf} [yn] (n)`;
            return ECMD_OK;
        }
        u_pay = umoney < major_cost ? umoney : major_cost;
    } else {
        /* C rumors.c:719-721: 'q'/default returns with no clear_nhwindow, so
         * the answered prompt stays on the topline (as for the major prompt). */
        g._topl_sticky = `${qbuf} [ynq] (q)`;
        return ECMD_OK;
    }
    await _money2mon(oracl, u_pay);
    if (g.disp) g.disp.botl = true;
    u.uevent = u.uevent || {};
    if (!u.uevent.major_oracle && !u.uevent.minor_oracle)
        record_achievement(ACH_ORCL);
    let add_xpts = 0;
    if (u_pay === minor_cost) {
        await outrumor(1, BY_ORACLE); /* C rumors.c:746 */
        if (!u.uevent.minor_oracle)
            add_xpts = Math.trunc(u_pay / (u.uevent.major_oracle ? 25 : 10));
        u.uevent.minor_oracle = true;
    } else {
        const cheapskate = u_pay < major_cost;
        await outoracle(cheapskate, true); /* C rumors.c:755 */
        if (!cheapskate && !u.uevent.major_oracle)
            add_xpts = Math.trunc(u_pay / (u.uevent.minor_oracle ? 25 : 10));
        u.uevent.major_oracle = true;
        exercise(A_WIS, !cheapskate);
    }
    if (add_xpts) {
        more_experienced(add_xpts, Math.trunc(u_pay / 50));
        await newexplevel();
    }
    return ECMD_TIME;
}
