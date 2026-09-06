// C: artifact.c touch_artifact(), retouch_object(), and hack_artifacts().
import { game } from './gstate.js';
import { d, rn2, rnd } from './rng.js';
import { A_WIS, A_CON } from './const.js';
import { artifactDefinitionForName } from './mklev.js';
import { pmOf } from './mhitm.js';
import { M2_ELF, M2_ORC, M2_DEMON, M2_WERE, M2_GIANT, M2_UNDEAD,
    S_DRAGON, S_OGRE, S_TROLL, S_VAMPIRE, S_IMP, PM_SHADE, PM_TENGU } from './permonst.js';

const ARTIFACT_ALIGN_TYPE = { lawful: 1, neutral: 0, chaotic: -1 };
const ARTIFACT_TOUCH_METADATA = Object.freeze({
    Excalibur: { restricted: true, selfWilled: true, alignment: 1, role: 'Knight' },
    Stormbringer: { restricted: true, selfWilled: true, alignment: -1 },
    Mjollnir: { restricted: true, alignment: 0, role: 'Valkyrie' },
    Cleaver: { restricted: true, alignment: 0, role: 'Barbarian' },
    Grimtooth: { restricted: true, alignment: -1 },
    Magicbane: { restricted: true, alignment: 0, role: 'Wizard' },
    'Frost Brand': { restricted: true, alignment: null },
    'Fire Brand': { restricted: true, alignment: null },
    Dragonbane: { restricted: true, alignment: null },
    Demonbane: { restricted: true, alignment: 1 },
    Werebane: { restricted: true, alignment: null },
    Grayswandir: { restricted: true, alignment: 1 },
    Giantslayer: { restricted: true, alignment: 0 },
    Ogresmasher: { restricted: true, alignment: null },
    Trollsbane: { restricted: true, alignment: null },
    'Vorpal Blade': { restricted: true, alignment: 0 },
    Snickersnee: { restricted: true, alignment: 1, role: 'Samurai' },
    Sunsword: { restricted: true, alignment: 1 },
    'The Orb of Detection': { restricted: true, selfWilled: true, alignment: 1, role: 'Archeologist' },
    'The Heart of Ahriman': { restricted: true, selfWilled: true, alignment: 0, role: 'Barbarian' },
    'The Sceptre of Might': { restricted: true, selfWilled: true, alignment: 1, role: 'Caveman' },
    'The Staff of Aesculapius': { restricted: true, selfWilled: true, alignment: 0, role: 'Healer' },
    'The Magic Mirror of Merlin': { restricted: true, selfWilled: true, alignment: 1, role: 'Knight' },
    'The Eyes of the Overworld': { restricted: true, selfWilled: true, alignment: 0, role: 'Monk' },
    'The Mitre of Holiness': { restricted: true, selfWilled: true, alignment: 1, role: 'Priest' },
    'The Longbow of Diana': { restricted: true, selfWilled: true, alignment: -1, role: 'Ranger' },
    'The Master Key of Thievery': { restricted: true, selfWilled: true, alignment: -1, role: 'Rogue' },
    'The Tsurugi of Muramasa': { restricted: true, selfWilled: true, alignment: 1, role: 'Samurai' },
    'The Platinum Yendorian Express Card': { restricted: true, selfWilled: true, alignment: 0, role: 'Tourist' },
    'The Orb of Fate': { restricted: true, selfWilled: true, alignment: 0, role: 'Valkyrie' },
    'The Eye of the Aethiopica': { restricted: true, selfWilled: true, alignment: 0, role: 'Wizard' },
});

const BANE_FLAGS = { Grimtooth: M2_ELF, Orcrist: M2_ORC, Sting: M2_ORC,
    Demonbane: M2_DEMON, Werebane: M2_WERE, Giantslayer: M2_GIANT,
    Sunsword: M2_UNDEAD, 'The Mitre of Holiness': M2_UNDEAD };
const BANE_CLASSES = { Dragonbane: S_DRAGON, Ogresmasher: S_OGRE, Trollsbane: S_TROLL };

export function artifactTouchStatus(def) {
    const u = game.u || {};
    const metadata = ARTIFACT_TOUCH_METADATA[def?.name] || {};
    const form = u._polyself_form || u.youmonst?.data || u.data || {};
    const species = pmOf({ data: form }) || {};
    const lycanthrope = Number.isInteger(u.ulycn) && u.ulycn >= 0 || !!u.lycanthrope;
    const hatesSilver = lycanthrope || !!(species.m2 & (M2_WERE | M2_DEMON))
        || species.mlet === S_VAMPIRE || species.pm === PM_SHADE
        || (species.mlet === S_IMP && species.pm !== PM_TENGU);
    const selfWilled = !!def?.questArtifact || !!metadata.selfWilled;
    const heroRole = String(game._startup_role || game.urole?.name?.m || '')
        .replace(/^Cavewoman$/, 'Caveman').replace(/^Priestess$/, 'Priest');
    let role = def?.questRole || metadata.role || '';
    let alignment = ARTIFACT_ALIGN_TYPE[def?.alignment] ?? metadata.alignment ?? null;
    // These changes are made once at C startup, using the original alignment.
    if (role === heroRole && alignment !== null)
        alignment = ARTIFACT_ALIGN_TYPE[game._startup_align] ?? alignment;
    if (def?.name === 'Excalibur' && heroRole !== 'Knight') role = '';
    const badClass = selfWilled && !!role && role !== heroRole;
    const baseRace = !u._polyself_form
        ? game.urace?.selfmask || ({ elf: M2_ELF, orc: M2_ORC }[game._startup_race] || 0) : 0;
    const targetFlags = (species.m2 || 0) | baseRace | (lycanthrope ? M2_WERE : 0);
    const bane = !!(BANE_FLAGS[def?.name] & targetFlags)
        || (BANE_CLASSES[def?.name] != null && BANE_CLASSES[def.name] === species.mlet)
        || (def?.name === 'The Sceptre of Might' && u.ualign?.type !== alignment);
    const restricted = !!def?.restricted || !!def?.questArtifact || !!metadata.restricted;
    const badAlign = bane || (restricted && alignment !== null
        && (alignment !== (u.ualign?.type ?? 0) || (u.ualign?.record ?? 0) < 0));
    return { selfWilled, badClass, badAlign, bane, hatesSilver };
}

// A fatal damage call suspends inside losehp. On revival, resume after that
// exact call so its damage and exercise draws are never performed twice.
export async function retouchArtifactObject(item, D, { resume = false } = {}) {
    const messages = [];
    const definition = artifactDefinitionForName(item?.artifact || item?.oartifact);
    const state = resume ? game._artifact_touch_state : { phase: 'touch', item, definition,
        status: artifactTouchStatus(definition), blasted: false };
    const result = extra => ({ ok: false, messages, ...extra });
    if (!state || state.item !== item) throw new Error('Missing artifact touch continuation');
    if (state.phase === 'touch') {
        if (D.invocationBellAllowed(item)) return result({ ok: true });
        const { badClass, badAlign, selfWilled, hatesSilver } = state.status;
        if (((badClass || badAlign) && selfWilled) || (badAlign && !rn2(4))) {
            const name = (definition?.name || D.objectName(item)).replace(/^The /, 'the ');
            messages.push(`You are blasted by ${name}'s power!`);
            state.blasted = true;
            let damage = d(D.antimagic() ? 2 : 4, selfWilled ? 10 : 4);
            if (D.isSilver(item) && hatesSilver) damage += D.halfPhysical(rnd(10));
            state.phase = 'afterBlast';
            const damageResult = await D.damageHero(messages, damage, `touching ${definition.name}`);
            if (damageResult.fatal || damageResult.lifeSaving || damageResult.pending) {
                game._artifact_touch_state = state;
                return result({ ...damageResult, pending: true });
            }
        } else state.phase = 'handling';
    }
    if (state.phase === 'afterBlast') {
        D.exercise(A_WIS, false);
        state.phase = 'handling';
    }
    if (state.phase === 'handling') {
        const { badClass, badAlign, selfWilled } = state.status;
        if (badClass && badAlign && selfWilled) {
            messages.push(`${definition.name} ${(game.inventory || []).includes(item)
                ? 'is beyond your control!' : 'evades your grasp!'}`);
        } else {
            const current = artifactTouchStatus(definition);
            const silver = D.isSilver(item) && current.hatesSilver;
            if (!silver && !current.bane) {
                game._artifact_touch_state = null;
                return result({ ok: true });
            }
            messages.push(`You can't handle ${D.objectName(item)}${D.isWorn(item) ? ' anymore' : ''}!`);
            if (!state.blasted) {
                let damage = silver ? D.halfPhysical(rnd(10)) : 0;
                if (current.bane) damage += rnd(10);
                state.phase = 'afterHandlingDamage';
                const name = silver && !definition
                    ? item.cls === 'ring' ? 'a silver ring' : item.cls === 'wand' ? 'a silver wand' : D.killerName(item)
                    : D.killerName(item);
                const damageResult = await D.damageHero(messages, damage, `handling ${name}`);
                if (damageResult.fatal || damageResult.lifeSaving || damageResult.pending) {
                    game._artifact_touch_state = state;
                    return result({ ...damageResult, pending: true });
                }
            }
        }
        if (state.phase === 'handling') state.phase = 'unwear';
    }
    if (state.phase === 'afterHandlingDamage') {
        D.exercise(A_CON, false);
        state.phase = 'unwear';
    }
    if (state.phase === 'unwear') {
        state.phase = 'done';
        const removed = await D.unwear(item, messages);
        if (removed?.fatal || removed?.lifeSaving || removed?.pending) {
            game._artifact_touch_state = state;
            return result({ ...removed, pending: true });
        }
    }
    game._artifact_touch_state = null;
    return result();
}
