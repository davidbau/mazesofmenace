// topten.js — High-score record + end-of-game score panel (partial).
// C ref: topten.c topten / outheader / outentry / readentry / writeentry.

import { game } from './gstate.js';
import { vfsReadFile, vfsWriteFile } from './storage.js';
import { yyyymmdd } from './calendar.js';
import { deepest_lev_reached, depth, ordin, strNsubst, lcase } from './hacklib.js';
import {
    genders, aligns, roles, str2role, str2race,
    rank_of, rank_to_xlev,
} from './roles.js';
import {
    BUFSZ, COLNO, VERSION_MAJOR, VERSION_MINOR, PATCHLEVEL,
    PERSMAX, POINTSMIN, ENTRYMAX, PERS_IS_UID,
    PANICKED,
    ACH_UWIN, ACH_ASTR, ACH_ENDG, ACH_AMUL, ACH_INVK, ACH_BOOK,
    ACH_BELL, ACH_CNDL, ACH_HELL, ACH_MEDU, ACH_MINE_PRIZE,
    ACH_SOKO_PRIZE, ACH_ORCL, ACH_NOVL, ACH_MINE, ACH_TOWN, ACH_SHOP,
    ACH_TMPL, ACH_SOKO, ACH_BGRM, ACH_TUNE,
    ACH_RNK1, ACH_RNK2, ACH_RNK3, ACH_RNK4,
    ACH_RNK5, ACH_RNK6, ACH_RNK7, ACH_RNK8,
} from './const.js';
import { ATR_BOLD, NO_COLOR } from './terminal.js';
import { formatkiller } from './end.js';
import { money_cnt } from './shk.js';
import { hidden_gold } from './vault.js';
import { num_genocides, sokoban_in_play } from './insight.js';
import { timet_to_seconds } from './allmain.js';

const NAMSZ = 10;
const ROLESZ = 3;
const DTHSZ = 100;
const RECORD_VFS = 'record';

function sysopt() {
    return {
        persmax: PERSMAX,
        pointsmin: POINTSMIN,
        entrymax: ENTRYMAX,
        pers_is_uid: !!PERS_IS_UID,
    };
}

function copynchars(src, n) {
    return String(src || '').slice(0, n);
}

function highc_first(s) {
    const t = String(s || '');
    if (!t) return t;
    return t[0].toUpperCase() + t.slice(1);
}

function onlyspace(s) {
    return !String(s || '').trim();
}

function observable_depth(lev) {
    return depth(lev);
}

/* deepest_lev_reached: canonical import from hacklib.js (dungeon.c:1338–1371). */

function newttentry() {
    return {
        points: 0,
        deathdnum: 0,
        deathlev: 0,
        maxlvl: 0,
        hp: 0,
        maxhp: 0,
        deaths: 0,
        ver_major: VERSION_MAJOR,
        ver_minor: VERSION_MINOR,
        patchlevel: PATCHLEVEL,
        deathdate: 0,
        birthdate: 0,
        uid: 0,
        plrole: '',
        plrace: '',
        plgend: '',
        plalign: '',
        name: '',
        death: '',
    };
}

function writeentry_line(tt) {
    const name = onlyspace(tt.name) ? '_' : tt.name;
    return `${tt.ver_major}.${tt.ver_minor}.${tt.patchlevel} `
        + `${tt.points} ${tt.deathdnum} ${tt.deathlev} ${tt.maxlvl} `
        + `${tt.hp} ${tt.maxhp} ${tt.deaths} ${tt.deathdate} `
        + `${tt.birthdate} ${tt.uid} `
        + `${tt.plrole} ${tt.plrace} ${tt.plgend} ${tt.plalign} `
        + `${name},${tt.death}\n`;
}

/* XLOGFILE family (C topten.c:340–610, `#ifdef XLOGFILE` — defined in this
 * build). C streams tab-separated `key=value` fields at FILE *rfile; there
 * is no xlogfile VFS consumer (D-2585 names the `:702–718` append arm in
 * topten()), so writexlentry builds and returns the full line (trailing
 * `\n` included) instead of taking a FILE *. The out-param `char *buf`
 * callees likewise return their string (JS strings are immutable).
 * XLOG_SEP (`:343`) is '\t'. */

/**
 * C ref: topten.c writexlentry `:340–391` — whole body in C order.
 * `:347–356` version/points/deathdnum/deathlev/maxlvl/hp/maxhp/deaths/
 * deathdate/birthdate/uid (one Fprintf flush of buf[]); `:357–359`
 * role/race/gender/align; `:360–364` formatkiller(how, FALSE) death (the
 * ", while helpless" copy is formatkiller's incl_helpless arm, not taken
 * here); `:365–367` multi<0 while= arm (multi_reason or "helpless");
 * `:368–370` conduct/turns/achieve; `:371–372` achieveX; `:373–374`
 * conductX (C reuses buf[] — sequential build here); `:375–378`
 * realtime/starttime/endtime; `:379–381` gender0/align0 filecodes;
 * `:382` flags; `:383–384` gold (invent + hidden); `:385–388`
 * wish/arti-wish/bones/reroll counts; `:389` newline.
 * @param {object} tt toptenentry shape (newttentry/readentry)
 * @param {number} how death reason code
 * @returns {string} the xlog line with trailing newline
 */
export function writexlentry(tt, how) {
    const e = tt || {};
    const u = game.u || {};
    const flags = game.flags || {};
    const SEP = '\t'; // C `:343` XLOG_SEP
    // C `:347–356`
    let line = `version=${e.ver_major}.${e.ver_minor}.${e.patchlevel}`
        + `${SEP}points=${e.points | 0}`
        + `${SEP}deathdnum=${e.deathdnum | 0}${SEP}deathlev=${e.deathlev | 0}`
        + `${SEP}maxlvl=${e.maxlvl | 0}`
        + `${SEP}hp=${e.hp | 0}${SEP}maxhp=${e.maxhp | 0}`
        + `${SEP}deaths=${e.deaths | 0}`
        + `${SEP}deathdate=${e.deathdate | 0}`
        + `${SEP}birthdate=${e.birthdate | 0}${SEP}uid=${e.uid | 0}`;
    // C `:357–359`
    line += `${SEP}role=${e.plrole}${SEP}race=${e.plrace}`
        + `${SEP}gender=${e.plgend}${SEP}align=${e.plalign}`;
    // C `:360–364` — formatkiller(tmpbuf, sizeof tmpbuf, how, FALSE).
    const tmpbuf = formatkiller(how, false);
    line += `${SEP}name=${String(game.plname ?? '')}${SEP}death=${tmpbuf}`;
    // C `:365–367` — gm.multi<0 while= arm.
    if ((game.multi | 0) < 0) {
        line += `${SEP}while=${game.multi_reason ? game.multi_reason : 'helpless'}`;
    }
    // C `:368–370` — svm.moves is game.moves.
    line += `${SEP}conduct=0x${(encodeconduct() >>> 0).toString(16)}`
        + `${SEP}turns=${game.moves | 0}`
        + `${SEP}achieve=0x${(encodeachieve(false) >>> 0).toString(16)}`;
    // C `:371–372` — encode_extended_achievements(achbuf).
    line += `${SEP}achieveX=${encode_extended_achievements()}`;
    // C `:373–374` — encode_extended_conducts(buf) (buf[] reuse).
    line += `${SEP}conductX=${encode_extended_conducts()}`;
    // C `:375–378`
    const rt = game.urealtime || {};
    line += `${SEP}realtime=${rt.realtime | 0}`
        + `${SEP}starttime=${timet_to_seconds(game.ubirthday)}`
        + `${SEP}endtime=${timet_to_seconds(rt.finish_time)}`;
    // C `:379–381` — genders[flags.initgend] + aligns[1-u.ualignbase[A_ORIGINAL]].
    const initgend = flags.initgend ? 1 : 0;
    const wbOrig = u.ualignbase?.original ?? u.ualign?.type ?? 0;
    line += `${SEP}gender0=${genders[initgend]?.filecode || (initgend ? 'Fem' : 'Mal')}`
        + `${SEP}align0=${aligns[1 - wbOrig]?.filecode || 'Neu'}`;
    // C `:382`
    line += `${SEP}flags=0x${(encodexlogflags() >>> 0).toString(16)}`;
    // C `:383–384` — gi.invent is the invent array; hidden_gold(TRUE).
    line += `${SEP}gold=${(money_cnt(game.invent) + hidden_gold(true)) | 0}`;
    // C `:385–388`
    const uc = u.uconduct || {};
    const urp = u.uroleplay || {};
    line += `${SEP}wish_cnt=${uc.wishes | 0}`;
    line += `${SEP}arti_wish_cnt=${uc.wisharti | 0}`;
    line += `${SEP}bones=${urp.numbones | 0}`;
    line += `${SEP}rerolls=${urp.numrerolls | 0}`;
    // C `:389`
    line += '\n';
    return line;
}

/**
 * C ref: topten.c encodexlogflags `:393–408` — wizard/discover/nobones/
 * reroll bits 0–3. wizard/discover read flags the same way topten() does
 * (`flags.debug||flags.wizard`, `flags.explore||flags.discover`).
 * @returns {number}
 */
export function encodexlogflags() {
    const flags = game.flags || {};
    const u = game.u || {};
    let e = 0;
    if (flags.debug || flags.wizard) e |= 1 << 0; // C `:398` wizard
    if (flags.explore || flags.discover) e |= 1 << 1; // C `:400` discover
    if (!(u.uroleplay?.numbones | 0)) e |= 1 << 2; // C `:402`
    if (u.uroleplay?.reroll) e |= 1 << 3; // C `:404`
    return e | 0;
}

/**
 * C ref: topten.c encodeconduct `:410–452` — kept-conduct bits 0–13.
 * The sokoban bit (`:439–447`) is set only when sokoban is in play; the
 * comment's post-processor caveat rides along unchanged.
 * @returns {number}
 */
export function encodeconduct() {
    const u = game.u || {};
    const c = u.uconduct || {};
    let e = 0;
    if (!((c.food | 0))) e |= 1 << 0; // C `:415`
    if (!((c.unvegan | 0))) e |= 1 << 1; // C `:417`
    if (!((c.unvegetarian | 0))) e |= 1 << 2; // C `:419`
    if (!((c.gnostic | 0))) e |= 1 << 3; // C `:421`
    if (!((c.weaphit | 0))) e |= 1 << 4; // C `:423`
    if (!((c.killer | 0))) e |= 1 << 5; // C `:425`
    if (!((c.literate | 0))) e |= 1 << 6; // C `:427`
    if (!((c.polypiles | 0))) e |= 1 << 7; // C `:429`
    if (!((c.polyselfs | 0))) e |= 1 << 8; // C `:431`
    if (!((c.wishes | 0))) e |= 1 << 9; // C `:433`
    if (!((c.wisharti | 0))) e |= 1 << 10; // C `:435`
    if (!num_genocides()) e |= 1 << 11; // C `:437`
    if (!((c.sokocheat | 0)) && sokoban_in_play()) e |= 1 << 12; // C `:446–447`
    if (!((c.pets | 0))) e |= 1 << 13; // C `:448`
    return e | 0;
}

/**
 * C ref: topten.c encodeachieve `:454–476` — u.uachieved bit packing.
 * secondlong FALSE packs achievements 1..31 into bits 0..30, TRUE packs
 * 32..62 the same way (offset 31); the signed-31-bit portability comment
 * (`:461–468`) holds — JS bitwise ops are 32-bit, bit 30 is the top set.
 * @param {boolean} secondlong
 * @returns {number}
 */
export function encodeachieve(secondlong) {
    const ach = game.u?.uachieved || [];
    const offset = secondlong ? (32 - 1) : 0; // C `:469`
    let r = 0;
    for (let i = 0; ach[i]; ++i) { // C `:470` — 0-terminated list
        const achidx = (ach[i] | 0) - offset; // C `:471`
        if (achidx > 0 && achidx < 32) r |= 1 << (achidx - 1); // C `:472–473`
    }
    return r | 0;
}

/* C ref: topten.c add_achieveX `:478–488` — comma-join one name when the
 * condition holds. C appends into char *buf; JS returns the new string. */
function add_achieveX(buf, achievement, condition) {
    if (!condition) return buf;
    return buf !== '' ? `${buf},${achievement}` : String(achievement);
}

/**
 * C ref: topten.c encode_extended_achievements `:490–581` — whole body in
 * C order. Walks the 0-terminated u.uachieved list; negative entries use
 * abs() for the switch but keep the sign for the rank male/female pick.
 * The rank arm (`:565–572`) builds "attained_the_rank_of_<title>" via
 * rank_of(rank_to_xlev(1..8), Role_switch=game.urole.mnum, achidx<0),
 * spaces → underscores (strNsubst n=0: every match), lowercased.
 * default: skip the entry (continue). Returns the comma-joined string.
 * (ACH_BLND/ACH_NUDE have no C arm — they fall into default, as in C.)
 * @returns {string}
 */
export function encode_extended_achievements() {
    const ach = game.u?.uachieved || [];
    let buf = ''; // C `:497` buf[0] = '\0'
    for (let i = 0; ach[i]; i++) { // C `:498`
        const achidx = ach[i] | 0; // C `:499`
        const absidx = Math.abs(achidx); // C `:500` abs()
        let achievement = null;
        switch (absidx) { // C `:501`
        case ACH_UWIN: // C `:502–504`
            achievement = 'ascended';
            break;
        case ACH_ASTR: // C `:505–507`
            achievement = 'entered_astral_plane';
            break;
        case ACH_ENDG: // C `:508–510`
            achievement = 'entered_elemental_planes';
            break;
        case ACH_AMUL: // C `:511–513`
            achievement = 'obtained_the_amulet_of_yendor';
            break;
        case ACH_INVK: // C `:514–516`
            achievement = 'performed_the_invocation_ritual';
            break;
        case ACH_BOOK: // C `:517–519`
            achievement = 'obtained_the_book_of_the_dead';
            break;
        case ACH_BELL: // C `:520–522`
            achievement = 'obtained_the_bell_of_opening';
            break;
        case ACH_CNDL: // C `:523–525`
            achievement = 'obtained_the_candelabrum_of_invocation';
            break;
        case ACH_HELL: // C `:526–528`
            achievement = 'entered_gehennom';
            break;
        case ACH_MEDU: // C `:529–531`
            achievement = 'defeated_medusa';
            break;
        case ACH_MINE_PRIZE: // C `:532–534`
            achievement = 'obtained_the_luckstone_from_the_mines';
            break;
        case ACH_SOKO_PRIZE: // C `:535–537`
            achievement = 'obtained_the_sokoban_prize';
            break;
        case ACH_ORCL: // C `:538–540`
            achievement = 'consulted_the_oracle';
            break;
        case ACH_NOVL: // C `:541–543`
            achievement = 'read_a_discworld_novel';
            break;
        case ACH_MINE: // C `:544–546`
            achievement = 'entered_the_gnomish_mines';
            break;
        case ACH_TOWN: // C `:547–549`
            achievement = 'entered_mine_town';
            break;
        case ACH_SHOP: // C `:550–552`
            achievement = 'entered_a_shop';
            break;
        case ACH_TMPL: // C `:553–555`
            achievement = 'entered_a_temple';
            break;
        case ACH_SOKO: // C `:556–558`
            achievement = 'entered_sokoban';
            break;
        case ACH_BGRM: // C `:559–561`
            achievement = 'entered_bigroom';
            break;
        case ACH_TUNE: // C `:562–564`
            achievement = 'learned_castle_drawbridge_tune';
            break;
        /* C `:565` — rank 0 is the starting condition, not an
         * achievement; 8 is Xp 30. */
        case ACH_RNK1: case ACH_RNK2: case ACH_RNK3: case ACH_RNK4:
        case ACH_RNK5: case ACH_RNK6: case ACH_RNK7: case ACH_RNK8: {
            // C `:568–570` — Role_switch is gu.urole.mnum.
            const rnk = 'attained_the_rank_of_'
                + rank_of(
                    rank_to_xlev(absidx - (ACH_RNK1 - 1)),
                    game.urole?.mnum | 0,
                    achidx < 0,
                );
            const underscored = strNsubst(rnk, ' ', '_', 0); // C `:571`
            achievement = lcase(underscored); // C `:572`
            break;
        }
        default:
            continue; // C `:574–575`
        }
        buf = add_achieveX(buf, achievement, true); // C `:577`
    }
    return buf; // C `:580`
}

/**
 * C ref: topten.c encode_extended_conducts `:583–610` — whole body in C
 * order. "bonesless" reads !flags.bones; C defaults bones TRUE (unset in
 * JS means enabled — bones.js:651 treats `=== false` as the off state —
 * so the condition is `=== false`, not `!`, which would misread unset).
 * The sokoban name is only eligible when sokoban is in play (`:599–600`).
 * @returns {string}
 */
export function encode_extended_conducts() {
    const u = game.u || {};
    const c = u.uconduct || {};
    const rp = u.uroleplay || {};
    const flags = game.flags || {};
    let buf = ''; // C `:586` buf[0] = '\0'
    buf = add_achieveX(buf, 'foodless', !((c.food | 0))); // C `:587`
    buf = add_achieveX(buf, 'vegan', !((c.unvegan | 0))); // C `:588`
    buf = add_achieveX(buf, 'vegetarian', !((c.unvegetarian | 0))); // C `:589`
    buf = add_achieveX(buf, 'atheist', !((c.gnostic | 0))); // C `:590`
    buf = add_achieveX(buf, 'weaponless', !((c.weaphit | 0))); // C `:591`
    buf = add_achieveX(buf, 'pacifist', !((c.killer | 0))); // C `:592`
    buf = add_achieveX(buf, 'illiterate', !((c.literate | 0))); // C `:593`
    buf = add_achieveX(buf, 'polyless', !((c.polypiles | 0))); // C `:594`
    buf = add_achieveX(buf, 'polyselfless', !((c.polyselfs | 0))); // C `:595`
    buf = add_achieveX(buf, 'wishless', !((c.wishes | 0))); // C `:596`
    buf = add_achieveX(buf, 'artiwishless', !((c.wisharti | 0))); // C `:597`
    buf = add_achieveX(buf, 'genocideless', !num_genocides()); // C `:598`
    if (sokoban_in_play()) { // C `:599–600`
        buf = add_achieveX(buf, 'sokoban', !((c.sokocheat | 0))); // C `:600`
    }
    buf = add_achieveX(buf, 'blind', !!rp.blind); // C `:601`
    buf = add_achieveX(buf, 'deaf', !!rp.deaf); // C `:602`
    buf = add_achieveX(buf, 'nudist', !!rp.nudist); // C `:603`
    buf = add_achieveX(buf, 'pauper', !!rp.pauper); // C `:604`
    buf = add_achieveX(buf, 'bonesless', flags.bones === false); // C `:605`
    buf = add_achieveX(buf, 'petless', !((c.pets | 0))); // C `:606`
    buf = add_achieveX(buf, 'unrerolled', !rp.reroll); // C `:607`
    return buf; // C `:609`
}

/* SCANBUFSZ (C topten.c:59) — room for every string field at once, plus a
   separating space or trailing newline and the string terminator. */
const SCANBUFSZ = 4 * (ROLESZ + 1) + (NAMSZ + 1) + (DTHSZ + 1) + 1;

/**
 * C ref: topten.c readentry `:220–298` — whole body in C order.
 *
 * C streams (FILE *rfile, struct toptenentry *tt); the VFS record is
 * already split into lines by read_record_entries, so one call parses one
 * record line into a fresh (newttentry-zeroed) entry: `:238–245` fscanf of
 * the 13 numeric fields (mismatch → points = 0); `:246–257` fgets of the
 * remainder with the SCANBUFSZ implicit length limit (overlong remainder
 * is cut at SCANBUFSZ-2 + newline); `:259–276` pre-3.3 fmt32 two-char
 * role/gender + name,death with the str2role→roles filecode fixup and the
 * Mal/Fem + "?" defaults; `:277–287` fmt33 six-field modern arm (fail →
 * points = 0); `:293–297` Y2K birthdate/deathdate fixup.
 *
 * Live callees: newttentry (file-local), copynchars (file-local clone of
 * hacklib.c:286 — fields never carry '\n' post-split, so the slice equals
 * C's newline stop), str2role + roles[].filecode (roles.js, same module
 * as the pre-existing edge — no new import edge).
 * Named omissions: discardexcess (topten.c:207 — FILE-streaming only; a
 * VFS line carries no excess past its newline, and every fail arm still
 * sets points = 0); UPDATE_RECORD_IN_PLACE fpos (`:235–237`, VMS-only —
 * no fpos field in this build; whole-record VFS writes per D-2585);
 * NO_SCAN_BRACK fmts + nsb_unmung_line (`:225–233`, `:283–292` — ifdef
 * never defined in this build; unmunging '|'→' ' would corrupt modern
 * record text); alloc (GC — fresh object per call).
 */
export function readentry(line) {
    const tt = newttentry();
    if (!line || !String(line).trim()) {
        tt.points = 0;
        return tt;
    }
    // C `:238–245` — fscanf(fmt, 13 fields) != TTFIELDS(13) → points = 0
    // (C's discardexcess of the rest of the line is the named omit above).
    const m = String(line).match(
        /^(\d+)\.(\d+)\.(\d+) (-?\d+) (-?\d+) (-?\d+) (-?\d+) (-?\d+) (-?\d+) (-?\d+) (-?\d+) (-?\d+) (-?\d+) ?(.*)$/,
    );
    if (!m) {
        tt.points = 0;
        return tt;
    }
    tt.ver_major = +m[1];
    tt.ver_minor = +m[2];
    tt.patchlevel = +m[3];
    tt.points = +m[4];
    tt.deathdnum = +m[5];
    tt.deathlev = +m[6];
    tt.maxlvl = +m[7];
    tt.hp = +m[8];
    tt.maxhp = +m[9];
    tt.deaths = +m[10];
    tt.deathdate = +m[11];
    tt.birthdate = +m[12];
    tt.uid = +m[13];
    // C `:246–257` — fgets remainder into inbuf[SCANBUFSZ]; a remainder
    // with no newline in SCANBUFSZ is cut at [SCANBUFSZ-2] + '\n' and the
    // excess discarded (same named omit as discardexcess).
    let inbuf = `${m[14] ?? ''}\n`;
    if (inbuf.length > SCANBUFSZ - 1) inbuf = `${inbuf.slice(0, SCANBUFSZ - 2)}\n`;
    // C `:259–276` — backwards-compatibility arm (ver < 3.3):
    // fmt32 "%c%c %[^,],%[^\n]" (the two role/gender chars read via %c).
    if (tt.ver_major < 3 || (tt.ver_major === 3 && tt.ver_minor < 3)) {
        const om = inbuf.match(/^(.)(.) ([^,]*),([^\n]*)\n?$/);
        if (om) {
            // C `:264` — plrole[1] = plgend[1] = '\0' (one char each).
            tt.plrole = om[1];
            tt.plgend = om[2];
            tt.name = copynchars(om[3], NAMSZ);
            tt.death = copynchars(om[4], DTHSZ);
        } else {
            tt.points = 0;
        }
        // C `:267–276` — unconditional: re-truncate role, str2role fixup
        // to roles[].filecode, race "?", gender Mal/Fem, align "?".
        const i = str2role(tt.plrole);
        if (i >= 0) tt.plrole = copynchars(roles[i].filecode, ROLESZ);
        tt.plrace = '?';
        tt.plgend = tt.plgend[0] === 'M' ? 'Mal' : 'Fem';
        tt.plalign = '?';
    } else {
        // C `:277–287` — fmt33 "%s %s %s %s %[^,],%[^\n]"; fail → 0.
        const sm = inbuf.match(/^(\S+)\s+(\S+)\s+(\S+)\s+(\S+)\s+([^,]*),([^\n]*)\n?$/);
        if (!sm) {
            tt.points = 0;
            return tt;
        }
        tt.plrole = copynchars(sm[1], ROLESZ);
        tt.plrace = copynchars(sm[2], ROLESZ);
        tt.plgend = copynchars(sm[3], ROLESZ);
        tt.plalign = copynchars(sm[4], ROLESZ);
        tt.name = copynchars(sm[5], NAMSZ);
        tt.death = copynchars(sm[6], DTHSZ);
    }
    // C `:293–297` — Y2K fixup on old score entries with points.
    if (tt.points > 0) {
        if (tt.birthdate < 19000000) tt.birthdate += 19000000;
        if (tt.deathdate < 19000000) tt.deathdate += 19000000;
    }
    return tt;
}

function readentry_line(line) {
    return readentry(line);
}

function read_record_entries() {
    const raw = vfsReadFile(RECORD_VFS);
    if (raw == null || raw === '') return [];
    const entries = [];
    for (const line of String(raw).split('\n')) {
        if (!line) continue;
        const tt = readentry(line);
        entries.push(tt);
        if (!(tt.points > 0)) break;
    }
    return entries;
}

function write_record_entries(list) {
    let body = '';
    for (const tt of list) {
        if (!(tt.points > 0)) break;
        body += writeentry_line(tt);
    }
    vfsWriteFile(RECORD_VFS, body);
}

function gender_filecode() {
    const idx = game.flags?.female ? 1 : 0;
    return genders[idx]?.filecode || (idx ? 'Fem' : 'Mal');
}

function align_filecode() {
    const t = game.u?.ualign?.type | 0;
    return aligns[1 - t]?.filecode || 'Neu';
}

/**
 * Raw topten panel (!toptenwin): clear + lines; bold pads to COLNO-1.
 * C ref: topten_print / topten_print_bold after exit_nhwindows.
 */
function render_topten_lines(lines) {
    const disp = game.nhDisplay;
    if (!disp) return;
    disp.clearScreen();
    let row = 0;
    for (const item of lines) {
        const text = item.text ?? '';
        const bold = !!item.bold;
        const attr = bold ? ATR_BOLD : 0;
        const width = bold ? (COLNO - 1) : Math.min(text.length, COLNO);
        for (let i = 0; i < width; i++) {
            const ch = i < text.length ? text[i] : ' ';
            disp.setCell(i, row, ch, NO_COLOR, attr);
        }
        row++;
    }
    disp.setCursor(0, row);
}

/**
 * C ref: end.c really_done trailing raw_print("") x2 when done_stopprint.
 */
export function raw_print_blanks(n) {
    const disp = game.nhDisplay;
    if (!disp?.setCursor) return;
    // Prefer cursorRow (GameDisplay delegates); getCursor may be absent.
    const row = (disp.cursorRow != null)
        ? (disp.cursorRow | 0)
        : (disp.getCursor?.()?.[1] | 0);
    disp.setCursor(0, row + (n | 0));
}

function outheader(emit) {
    let line = ' No  Points     Name';
    while (line.length < COLNO - 9) line += ' ';
    line += 'Hp [max]';
    emit(line, false);
}

/**
 * C ref: topten.c outentry :946–1107.
 * Named omissions: none (astral-plane text + choked/poisoned/crushed/
 * petrified arms ported; wrap/Hp columns were already live).
 */
function outentry(rank, t1, so, emit) {
    let second_line = true;
    let linebuf = rank ? String(rank).padStart(3, ' ') : '   ';
    const pts = t1.points ? t1.points : (game.u?.urexp | 0);
    linebuf += ` ${String(pts).padStart(10, ' ')}  ${copynchars(t1.name, NAMSZ)}`;
    linebuf += `-${t1.plrole}`;
    if (t1.plrace[0] !== '?') linebuf += `-${t1.plrace}`;
    linebuf += `-${t1.plgend}`;
    if (t1.plalign[0] !== '?') linebuf += `-${t1.plalign} `;
    else linebuf += ' ';

    const death = String(t1.death || '');
    if (death.startsWith('escaped')) {
        // C topten.c:973-980 — "escaped the dungeon %s[max level %d]"; %s
        // is the " (with ...)" tail past "escaped" (amulet), then the
        // closing-paren fixup (truncate on astral, blank elsewhere).
        const amulet = death.slice(7, 9) === ' (' ? death.slice(9) : '';
        linebuf += `escaped the dungeon ${amulet}[max level ${t1.maxlvl | 0}]`;
        const paren = linebuf.indexOf(')');
        if (paren >= 0) {
            const astralDnum = game.astral_level?.dnum;
            linebuf = (astralDnum != null && (t1.deathdnum | 0) === (astralDnum | 0))
                ? linebuf.slice(0, paren)
                : `${linebuf.slice(0, paren)} ${linebuf.slice(paren + 1)}`;
        }
        second_line = false;
    } else if (death.startsWith('ascended')) {
        linebuf += `ascended to demigod${t1.plgend[0] === 'F' ? 'dess' : ''}-hood`;
        second_line = false;
    } else {
        // second_line TRUE (quit/starved above set it FALSE) and share the
        // location append below. strncmp lengths: quit 4, "died of st" 10,
        // "choked" 6, "poisoned" 8, "crushed" 7, "petrified by " 13.
        if (death.startsWith('quit')) {
            linebuf += 'quit';
            second_line = false;
        } else if (death.startsWith('died of st')) {
            linebuf += 'starved to death';
            second_line = false;
        } else if (death.slice(0, 6) === 'choked') {
            linebuf += `choked on h${t1.plgend?.[0] === 'F' ? 'er' : 'is'} food`;
        } else if (death.slice(0, 8) === 'poisoned') {
            linebuf += 'was poisoned';
        } else if (death.slice(0, 7) === 'crushed') {
            linebuf += 'was crushed to death';
        } else if (death.slice(0, 13) === 'petrified by ') {
            linebuf += 'turned to stone';
        } else {
            linebuf += 'died';
        }

        // C topten.c:1004–1035 — astral plane text vs dungeon/level append.
        const astralDnum = game.astral_level?.dnum;
        if (astralDnum != null && (t1.deathdnum | 0) === (astralDnum | 0)) {
            let fmt = ' on the Plane of %s';
            let arg = 'Void';
            switch (t1.deathlev | 0) {
            case -5:
                fmt = ' on the %s Plane';
                arg = 'Astral';
                break;
            case -4:
                arg = 'Water';
                break;
            case -3:
                arg = 'Fire';
                break;
            case -2:
                arg = 'Air';
                break;
            case -1:
                arg = 'Earth';
                break;
            default:
                arg = 'Void';
                break;
            }
            linebuf += fmt.replace('%s', arg);
        } else {
            const dname = game.dungeons?.[t1.deathdnum | 0]?.dname
                || 'The Dungeons of Doom';
            linebuf += ` in ${dname}`;
            const knoxDnum = game.knox_level?.dnum;
            if (knoxDnum == null || (t1.deathdnum | 0) !== (knoxDnum | 0)) {
                linebuf += ` on level ${t1.deathlev | 0}`;
            }
            if ((t1.deathlev | 0) !== (t1.maxlvl | 0)) {
                linebuf += ` [max ${t1.maxlvl | 0}]`;
            }
        }

        // C: kludge for "quit while already on Charon's boat"
        if (death.startsWith('quit ')) {
            linebuf += death.slice(4);
        }
    }
    linebuf += '.';

    if (second_line) {
        let bp = `  ${highc_first(death)}.`;
        bp = bp.replace(/; the /g, ', the ');
        linebuf += bp;
    }

    const hpbuf = (t1.hp | 0) <= 0 ? '-' : String(t1.hp | 0);
    const hpposWrap = COLNO - ('  Hp [max]'.length);

    let lngr = linebuf.length;
    while (lngr >= hpposWrap) {
        let bp = linebuf.length - 1;
        while (bp > 0 && !(linebuf[bp] === ' ' && bp < hpposWrap)) bp--;
        if (bp <= 15) bp = hpposWrap - 1;
        if (bp > 5 && linebuf.slice(bp - 5, bp) === ' [max') bp -= 5;
        const rest = linebuf[bp] === ' ' ? linebuf.slice(bp + 1) : linebuf.slice(bp);
        let first = linebuf.slice(0, bp);
        if (so) {
            while (first.length < COLNO - 1) first += ' ';
            emit(first, true);
        } else emit(first, false);
        linebuf = `${' '.repeat(15)} ${rest}`;
        lngr = linebuf.length;
    }

    const hppos = COLNO - 7 - hpbuf.length;
    let out = linebuf;
    if (out.length <= hppos) {
        while (out.length < hppos) out += ' ';
        out += hpbuf;
        const maxhp = t1.maxhp | 0;
        const pad = maxhp < 10 ? '  ' : maxhp < 100 ? ' ' : '';
        out += ` ${pad}[${maxhp}]`;
    }
    if (so) {
        while (out.length < COLNO - 1) out += ' ';
        emit(out, true);
    } else emit(out, false);
}

/**
 * C ref: topten.c topten `:628–926` — whole body in C order.
 * @param {number} how
 * @param {number} when  C time_t; yyyymmdd(when) deathdate (0 → getlt)
 * @param {string} deathStr formatkiller(how, TRUE) from caller (avoid cycle;
 * C `:694` runs formatkiller into the entry inline)
 *
 * Live callees: deepest_lev_reached + ordin (hacklib.js), yyyymmdd
 * (calendar.js), formatkiller (end.js, via deathStr), outheader/outentry +
 * newttentry/writeentry file-local analogues + exported readentry below, copynchars /
 * observable_depth pre-existing file-local clones.
 * Named omissions: LOGFILE/XLOGFILE append arms (`:702–718`, unix
 * config.h default — no VFS consumer reads logfile/xlogfile);
 * lock_file/unlock_file/fopen_datafile (VFS read_record_entries/
 * write_record_entries never lock or fail; a null record reads as the
 * shipped-empty RECORD an installed C game always has, not the missing-file
 * "Cannot open record file!" `:749` arm); toptenwin NHW_TEXT create/
 * display/destroy (`:656`, showwin/destroywin — render_topten_lines is the
 * !toptenwin raw panel); UPDATE_RECORD_IN_PLACE fpos mechanics (`:14` —
 * VFS exact-write carries the same bytes, no fpos/sentinel/TRUNCATE);
 * free_ttlist/dealloc_ttentry (GC); TOS restore_colors (platform ifdef).
 * (`prscore` lives in this file now, below.)
 */
export function topten(how, when = 0, deathStr = '') {
    // C `:652` — mid-panic: cut out topten entirely (alloc use).
    if (game.program_state?.panicking) return;

    const opt = sysopt();
    const done_stopprint = game.program_state?.done_stopprint | 0;
    // C `:659–661` — HANGUPHANDLING is defined for UNIX, so HUP is live:
    // every topten_print/raw_print below is gated on !done_hup
    // (showwin/destroywin are not).
    const hup_ok = !game.program_state?.done_hup;
    const flags = game.flags || {};
    const u = game.u || {};

    // C `:725–736` wizard||discover arm — message then goto showwin
    // (RECORD never touched; `:656` toptenwin create is a named omit).
    const wizard = !!(flags.debug || flags.wizard);
    const discover = !!(flags.explore || flags.discover);
    if (wizard || discover) {
        if (how !== PANICKED && hup_ok) {
            const mode = wizard ? 'wizard' : 'discover';
            // C topten_print is not gated by done_stopprint; showwin is.
            render_topten_lines([
                { text: '', bold: false },
                {
                    text: `Since you were in ${mode} mode, the score list will not be checked.`,
                    bold: false,
                },
            ]);
        }
        return;
    }

    const end_top = flags.end_top != null ? (flags.end_top | 0) : 3;
    const end_around = flags.end_around != null ? (flags.end_around | 0) : 2;
    const end_own = !!flags.end_own;

    // C `:670–699` — build the new entry (newttentry + zerott; version
    // fields ride along from newttentry above, as *t0 = zerott keeps them).
    const t0 = newttentry();
    t0.points = u.urexp | 0; // C `:675`
    t0.deathdnum = u.uz?.dnum | 0;
    // C `:679–684` comment — death level is reported in observable depth()
    // terms, like the player sees on screen.
    t0.deathlev = observable_depth(u.uz);
    t0.maxlvl = deepest_lev_reached(true);
    t0.hp = u.uhp | 0;
    t0.maxhp = u.uhpmax | 0;
    t0.deaths = u.umortality | 0;
    t0.uid = getuid(); // C `:639` — file-local getuid, always 0 here
    t0.plrole = copynchars(game.urole?.filecode || 'Tou', ROLESZ);
    t0.plrace = copynchars(game.urace?.filecode || 'Hum', ROLESZ);
    t0.plgend = copynchars(gender_filecode(), ROLESZ);
    t0.plalign = copynchars(align_filecode(), ROLESZ);
    t0.name = copynchars(game.plname || 'Player', NAMSZ);
    t0.death = copynchars(deathStr, DTHSZ);
    // C `:695` — birthdate is game-start time (u_init sets ubirthday).
    t0.birthdate = yyyymmdd(game.ubirthday ?? 0);
    t0.deathdate = yyyymmdd(when || 0); // C `:696`

    const outLines = [];
    const emit = (text, bold) => {
        outLines.push({ text, bold: !!bold });
    };

    // C `:739–754` — lock RECORD + fopen "r" (VFS: infallible, named
    // above). C `:754` HUP topten_print("") follows the open.
    if (hup_ok) emit('', false);

    // C `:757` — assure minimum number of points.
    if (t0.points < opt.pointsmin) t0.points = 0;

    const fileEntries = read_record_entries();
    const tt_head = [];
    let rank0 = -1;
    let rank1 = 0;
    let occ_cnt = opt.persmax;
    let flg = 0;
    let t0_used = false;
    let rank = 1;
    let fi = 0;

    // C `:760–814` — rank loop over readentry(rfile, t1). The list links
    // (tprev/tt_head/tt_next with t0 spliced before t1) read here as array
    // pushes in the same order; the occ-excess `continue` re-reads into the
    // same t1 in C, which reads here as popping the pushed entry.
    for (;;) {
        const t1 = fi < fileEntries.length
            ? { ...fileEntries[fi++] }
            : newttentry();
        // C `:765` — sub-minimum file points read as 0 (sentinel).
        if (t1.points < opt.pointsmin) t1.points = 0;

        if (rank0 < 0 && t1.points < t0.points) {
            rank0 = rank++;
            tt_head.push(t0);
            t0_used = true;
            occ_cnt--;
            flg++;
            if (t1.points !== 0) tt_head.push(t1);
        } else if (t1.points !== 0) {
            tt_head.push(t1);
        }

        if (t1.points === 0) break;

        const samePerson = opt.pers_is_uid
            ? t1.uid === t0.uid
            : t1.name.slice(0, NAMSZ) === t0.name.slice(0, NAMSZ);
        if (samePerson
            && t1.plrole.slice(0, ROLESZ) === t0.plrole.slice(0, ROLESZ)
            && --occ_cnt <= 0) {
            if (rank0 < 0) {
                rank0 = 0;
                rank1 = rank;
                // C `:791–799` HUP pair.
                if (hup_ok) {
                    emit(`You didn't beat your previous score of ${t1.points} points.`, false);
                    emit('', false);
                }
            }
            if (occ_cnt < 0) {
                flg++;
                tt_head.pop(); // discard excess personal entry
                continue;
            }
        }

        if (rank <= opt.entrymax) {
            rank++;
        }
        // C `:811–814` caps the list with a zero-points sentinel; the
        // array ends instead and the display loop below stops the same way.
        if (rank > opt.entrymax) break;
    }

    // C `:815–842` — rewrite when flg. Non-UPDATE_RECORD_IN_PLACE C
    // reopens RECORD "w" (the `:821–826` cannot-write arm is VFS-named);
    // the in-place fpos/sentinel mechanics (`:14`, `:885–904`) collapse to
    // one exact VFS write of the same rank-ordered bytes.
    if (flg) {
        if (!done_stopprint && rank0 > 0) {
            if (rank0 <= 10) emit('You made the top ten list!', false);
            else {
                // C `:836–837` — ordin suffix: "the 13th place".
                emit(
                    `You reached the ${rank0}${ordin(rank0)} place on the top ${opt.entrymax} list.`,
                    false,
                );
            }
            emit('', false);
        }
        write_record_entries(tt_head);
    }

    // C `:843–849`.
    const skip_scores = !end_top && !end_around && !end_own;
    if (rank0 === 0) rank0 = rank1;
    if (rank0 <= 0) rank0 = rank;

    if (!skip_scores && !done_stopprint) outheader(emit);

    // C `:850–882` — display loop doubles as the record writer (in-place
    // C writes rank >= rank0 here (`:854–856`); the VFS write above did).
    rank = 1;
    for (const t1 of tt_head) {
        if (!(t1.points > 0)) break;
        if (!skip_scores && !done_stopprint) {
            const show = rank <= end_top
                || (rank >= rank0 - end_around && rank <= rank0 + end_around)
                || (end_own && (opt.pers_is_uid
                    ? t1.uid === t0.uid
                    : t1.name.slice(0, NAMSZ) === t0.name.slice(0, NAMSZ)));
            if (show) {
                if (rank === rank0 - end_around
                    && rank0 > end_top + end_around + 1
                    && !end_own) {
                    emit('', false);
                }
                if (rank !== rank0) outentry(rank, t1, false, emit);
                else if (!rank1) outentry(rank, t1, true, emit);
                else {
                    outentry(rank, t1, true, emit);
                    outentry(0, t0, true, emit);
                }
            }
        }
        rank++;
    }
    // C `:880–882` — t0 never made the visible list: show it alone.
    if (rank0 >= rank) {
        if (!skip_scores && !done_stopprint) outentry(0, t0, true, emit);
    }

    void t0_used; // C `:919` dealloc_ttentry is GC here

    // C showwin `:908–917` — the !toptenwin path is a no-op `;`, so the
    // collected panel goes out here; destroywin `:919–925` needs nothing
    // (no window was created).
    if (!done_stopprint) render_topten_lines(outLines);
}

/**
 * C ref: topten.c score_wanted :1112–1192 (staticfn) — whole body in C order.
 * Union (not intersection) of -u/-p/-r/all/role-letter/maxrank criteria;
 * the C FIXME comment above the loop is kept verbatim in spirit (union).
 */
function score_wanted(current_ver, rank, t1, playerct, players, uid) {
    // C :1124–1127 — current-version gate.
    if (current_ver
        && (t1.ver_major !== VERSION_MAJOR
            || t1.ver_minor !== VERSION_MINOR
            || t1.patchlevel !== PATCHLEVEL)) {
        return 0;
    }
    // C :1129–1130 — uid identity when no names were given.
    if (sysopt().pers_is_uid && !playerct && t1.uid === uid) return 1;
    for (let i = 0; i < playerct; i++) {
        let arg = players[i];
        // C :1161–1162 — handle '-uname' by skipping the '-u'.
        if (ch(arg, 0) === '-' && ch(arg, 1) === 'u' && ch(arg, 2) !== '\0') {
            arg = arg.slice(2);
        }
        // C :1164–1174 — '-p role' / '-r race' / '-u name' take the next arg.
        // strchr("pru", c) also matches the NUL terminator, mirrored by the
        // '\0' in the includes below (ch() reads OOB as NUL, as C does).
        if (ch(arg, 0) === '-' && 'pru\0'.includes(ch(arg, 1))
            && ch(arg, 2) === '\0' && i + 1 < playerct) {
            const nxt = players[i + 1];
            if ((ch(arg, 1) === 'p' && str2role(nxt) === str2role(t1.plrole))
                || (ch(arg, 1) === 'r' && str2race(nxt) === str2race(t1.plrace))
                || (ch(arg, 1) === 'u'
                    && (nxt === 'all'
                        || String(t1.name).slice(0, NAMSZ) === String(nxt).slice(0, NAMSZ)))) {
                return 1;
            }
            i++;
        // C :1175–1179 — 'all' / name prefix / '-<roleletter>' / maxrank.
        } else if (arg === 'all'
            || String(t1.name).slice(0, NAMSZ) === String(arg).slice(0, NAMSZ)
            || (ch(arg, 0) === '-' && ch(arg, 1) === (t1.plrole || '')[0]
                && ch(arg, 2) === '\0')
            || (ch(arg, 0) >= '0' && ch(arg, 0) <= '9'
                && rank <= parseInt(arg, 10))) {
            return 1;
        }
    }
    return 0;
}

/**
 * C NUL-terminated string indexing: reads past the end yield '\0'.
 * Every ch() use below mirrors a C `arg[k]` read on a NUL-terminated arg.
 */
function ch(s, k) {
    const t = String(s || '');
    return k < t.length ? t[k] : '\0';
}

/**
 * C getuid() (POSIX uid, read at topten.c:1265 when sysopt.pers_is_uid).
 * No browser counterpart; topten() records uid 0 for every entry it writes,
 * so 0 is the identity that matches the player's own entries.
 */
function getuid() {
    return 0;
}

/**
 * C ref: topten.c prscore :1194–1353 — whole body in C order.
 * `nethack -s` score-subset display: arg validation, record read, -v gate,
 * player selector, wanted scan, header + entry lines or the cannot-find +
 * usage arms. All output funnels through the file's render_topten_lines
 * panel idiom (C routes via topten_print → raw_print with toptenwin==WIN_ERR
 * on this path; raw_print/raw_printf have no scored window surface, D-2471).
 *
 * @param {number} argc C argc for the -s argv (argv[0] untrustworthy, as in C)
 * @param {string[]} argv C argv slice starting at the program name
 */
export async function prscore(argc, argv) {
    const outLines = [];
    const emit = (text, bold) => {
        outLines.push({ text: String(text), bold: !!bold });
    };
    // C raw_print / raw_printf — named-omit mechanisms; same line surface.
    const raw_print = (s) => emit(s, false);
    const show = () => render_topten_lines(outLines);

    // C :1204–1217 — expect "-s" or "--scores"; "-s<anything>" is accepted.
    // ln is the length of argv[1] up to the first space (or the whole arg).
    const a1 = argc < 2 ? null : String(argv[1]);
    const ln = a1 === null
        ? 0
        : (() => { const sp = a1.indexOf(' '); return sp >= 0 ? sp : a1.length; })();
    if (ln < 2 || (a1.slice(0, 2) !== '-s' && a1 !== '--scores')) {
        // C raw_printf("prscore: bad arguments (%d)", argc).
        raw_print(`prscore: bad arguments (${argc})`);
        show();
        return;
    }

    // C :1219–1223 — fopen_datafile(RECORD, "r", SCOREPREFIX). Rule #2 VFS
    // analogue: a missing record is the failed open; an empty one reads on
    // into the cannot-find arm below, as C's first readentry does.
    if (vfsReadFile(RECORD_VFS) == null) {
        raw_print('Cannot open record file!');
        show();
        return;
    }
    // C :1225–1232 AMIGA window scaffolding — named omit (platform).

    // C :1236–1240 — without prior initialization, set up the dungeon table
    // (outentry resolves dungeon names from it).
    let init_done = false;
    if (((game.wiz1_level?.dlevel) | 0) === 0) {
        // C dlb_init() — named omit (no DLB data library in JS; the dungeon
        // table is embedded via js/generated, D-0477 pattern).
        const { init_dungeons } = await import('./dungeon.js');
        init_dungeons();
        init_done = true;
    }

    // C :1244–1251 — consume "-s"/"--scores"; "-s<anything>" keeps argc
    // and advances past the "-s" (argv is local, so slice-copies are exact).
    let args = argv.slice();
    if (args[1][1] === '-' || args[1].length <= 2) {
        argc--;
        args = args.slice(1);
    } else {
        args[1] = args[1].slice(2);
    }
    // C :1255–1260 — "-v" means all versions present, not just current.
    let current_ver = true;
    if (argc > 1 && args[1] === '-v') {
        current_ver = false;
        argc--;
        args = args.slice(1);
    }

    // C :1262–1277 — default selector (own uid, or own plname) vs the
    // explicit argv remainder.
    let uid = -1;
    let playerct;
    let players;
    if (argc <= 1) {
        if (sysopt().pers_is_uid) {
            uid = getuid();
            playerct = 0;
            players = [];
        } else {
            let player0 = game.plname || '';
            if (!player0) player0 = 'all';
            playerct = 1;
            players = [player0];
        }
    } else {
        playerct = --argc;
        players = args.slice(1);
    }
    raw_print('');

    // C :1279–1291 — read the whole record (readentry/newttentry mechanics
    // live as read_record_entries/readentry above: same zeroed shape,
    // same points==0 terminator); note the first wanted entry.
    const tt_head = [];
    let match_found = false;
    let rank = 1;
    for (const t1 of read_record_entries()) {
        if (t1.points === 0) break;
        tt_head.push(t1);
        if (!match_found
            && score_wanted(current_ver, rank, t1, playerct, players, uid)) {
            match_found = true;
        }
        rank++;
    }

    // C (void) fclose(rfile) — no-op (VFS snapshots the whole record).
    // C :1293–1296 — free_dungeons()/dlb_cleanup() when init_done: named
    // omits (no dungeon-free/DLB layer; the table persists in game state).
    void init_done;

    if (match_found) {
        // C :1298–1303 — header, then one line per wanted entry (rank counts
        // every record entry, displayed or not).
        outheader(emit);
        let rank2 = 1;
        for (const t1 of tt_head) {
            if (score_wanted(current_ver, rank2, t1, playerct, players, uid)) {
                outentry(rank2, t1, false, emit);
            }
            rank2++;
        }
    } else {
        // C :1305–1345 — "Cannot find any ..." + usage. BUFSZ overflow arms
        // kept exact (Strcat/Strcpy truncation at BUFSZ-1).
        let pbuf = `Cannot find any ${current_ver ? 'current ' : ''}entries for `;
        if (playerct < 1) {
            pbuf += 'you';
        } else {
            // C minor bug kept: '-u name' lists still say "any of".
            if (playerct > 1) pbuf += 'any of ';
            for (let i = 0; i < playerct; i++) {
                // Accept '-u name' and '-uname' in the feedback, as C does.
                let nm = players[i];
                if (nm.slice(0, 2) === '-u') {
                    if (nm.length <= 2) continue;
                    nm = nm.slice(2);
                    players[i] = nm;
                }
                // C :1323–1330 — stop printing players too many to fit.
                if (pbuf.length + nm.length + 2 >= BUFSZ) {
                    if (pbuf.length < BUFSZ - 4) pbuf += '...';
                    else pbuf = pbuf.slice(0, pbuf.length - 4) + '...';
                    break;
                }
                pbuf += nm;
                if (i < playerct - 1) {
                    if (nm[0] === '-' && 'pr\0'.includes(ch(nm, 1))
                        && ch(nm, 2) === '\0') pbuf += ' ';
                    else pbuf += ':';
                }
            }
        }
        // C :1339–1340 — end-of-sentence punctuation when there is room.
        if (pbuf.length < BUFSZ - 1) pbuf += '.';
        raw_print(pbuf);
        // C raw_printf("Usage: %s -s ...", gh.hname): gh.hname is the
        // argv[0]-derived program name; no argv[0] in JS.
        raw_print('Usage: nethack -s [-v] <playertypes> [maxrank] [playernames]');
        raw_print('Player types are: [-p role] [-r race]');
    }
    // C free_ttlist(tt_head) — named omit (GC; tt_head is a plain array).
    // C AMIGA display/destroy tail — named omit (platform).
    show();
}

/** C ref: end.c nh_terminate + contest post-topten input-boundary capture. */
export function nh_terminate_capture() {
    const capture = game._captureInputBoundary;
    if (typeof capture === 'function') capture();
}
