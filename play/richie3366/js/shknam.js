// shknam.js — Shop types, shopkeeper init, and room stocking.
// C ref: shknam.c shtypes[] / shkinit / stock_room / mkshobj_at / get_shop_item.
// Named omissions: shkveg/mkveggy_at; Orcus mongone; wizard SHOPTYPE;
// Izchak minetown light-shk; irregular-shop edge cases; platform ifdef
// shktools names.

import { game } from './gstate.js';
import { rn2, rnd } from './rng.js';
import { depth as depth_of_level } from './hacklib.js';
import {
    RANDOM_CLASS,
    ARMOR_CLASS,
    SCROLL_CLASS,
    POTION_CLASS,
    WEAPON_CLASS,
    FOOD_CLASS,
    RING_CLASS,
    WAND_CLASS,
    TOOL_CLASS,
    SPBOOK_CLASS,
    GEM_CLASS,
    AMULET_CLASS,
    MAXOCLASSES,
    objectNames,
} from './objects.js';
import {
    SHOPBASE, ROOMOFFSET, MM_ESHK, CORR, SDOOR, ROOM,
    D_NODOOR, D_ISOPEN, D_LOCKED, D_TRAPPED, DUST,
    IS_ROOM, isok, ESHK,
} from './const.js';
import { makemon, mkmonmoney, mongets, mkclass, neweshk } from './makemon.js';
import { mksobj_at, mkobj_at } from './mkobj.js';
import { mons, monsterNames } from './monsters.js';
import { make_engr_at } from './engrave.js';
import { cvt_sdoor_to_door } from './detect.js';
import { newsym } from './display.js';

const VEGETARIAN_CLASS = MAXOCLASSES + 1;
const PM_SHOPKEEPER = monsterNames.indexOf('PM_SHOPKEEPER');
const SPE_NOVEL = objectNames.indexOf('SPE_NOVEL');
const TOUCHSTONE = objectNames.indexOf('TOUCHSTONE');
const SCR_CHARGING = objectNames.indexOf('SCR_CHARGING');

function otypNeg(name) {
    return -objectNames.indexOf(name);
}

const shkliquors = [
    'Njezjin', 'Tsjernigof', 'Ossipewsk', 'Gorlowka', 'Gomel',
    'Konosja', 'Weliki Oestjoeg', 'Syktywkar', 'Sablja', 'Narodnaja', 'Kyzyl',
    'Walbrzych', 'Swidnica', 'Klodzko', 'Raciborz', 'Gliwice', 'Brzeg',
    'Krnov', 'Hradec Kralove',
    'Leuk', 'Brig', 'Brienz', 'Thun', 'Sarnen', 'Burglen', 'Elm', 'Flims',
    'Vals', 'Schuls', 'Zum Loch',
];
const shkbooks = [
    'Skibbereen', 'Kanturk', 'Rath Luirc', 'Ennistymon',
    'Lahinch', 'Kinnegad', 'Lugnaquillia', 'Enniscorthy',
    'Gweebarra', 'Kittamagh', 'Nenagh', 'Sneem',
    'Ballingeary', 'Kilgarvan', 'Cahersiveen', 'Glenbeigh',
    'Kilmihil', 'Kiltamagh', 'Droichead Atha', 'Inniscrone',
    'Clonegal', 'Lisnaskea', 'Culdaff', 'Dunfanaghy',
    'Inishbofin', 'Kesh',
];
const shkarmors = [
    'Demirci', 'Kalecik', 'Boyabai', 'Yildizeli', 'Gaziantep',
    'Siirt', 'Akhalataki', 'Tirebolu', 'Aksaray', 'Ermenak',
    'Iskenderun', 'Kadirli', 'Siverek', 'Pervari', 'Malasgirt',
    'Bayburt', 'Ayancik', 'Zonguldak', 'Balya', 'Tefenni',
    'Artvin', 'Kars', 'Makharadze', 'Malazgirt', 'Midyat',
    'Birecik', 'Kirikkale', 'Alaca', 'Polatli', 'Nallihan',
];
const shkwands = [
    'Yr Wyddgrug', 'Trallwng', 'Mallwyd', 'Pontarfynach', 'Rhaeader',
    'Llandrindod', 'Llanfair-ym-muallt', 'Y-Fenni', 'Maesteg', 'Rhydaman',
    'Beddgelert', 'Curig', 'Llanrwst', 'Llanerchymedd', 'Caergybi',
    'Nairn', 'Turriff', 'Inverurie', 'Braemar', 'Lochnagar', 'Kerloch',
    'Beinn a Ghlo', 'Drumnadrochit', 'Morven', 'Uist', 'Storr',
    'Sgurr na Ciche', 'Cannich', 'Gairloch', 'Kyleakin', 'Dunvegan',
];
const shkrings = [
    'Feyfer', 'Flugi', 'Gheel', 'Havic', 'Haynin',
    'Hoboken', 'Imbyze', 'Juyn', 'Kinsky', 'Massis',
    'Matray', 'Moy', 'Olycan', 'Sadelin', 'Svaving',
    'Tapper', 'Terwen', 'Wirix', 'Ypey',
    'Rastegaisa', 'Varjag Njarga', 'Kautekeino', 'Abisko', 'Enontekis',
    'Rovaniemi', 'Avasaksa', 'Haparanda', 'Lulea', 'Gellivare',
    'Oeloe', 'Kajaani', 'Fauske',
];
const shkfoods = [
    'Djasinga', 'Tjibarusa', 'Tjiwidej', 'Pengalengan',
    'Bandjar', 'Parbalingga', 'Bojolali', 'Sarangan',
    'Ngebel', 'Djombang', 'Ardjawinangun', 'Berbek',
    'Papar', 'Baliga', 'Tjisolok', 'Siboga',
    'Banjoewangi', 'Trenggalek', 'Karangkobar', 'Njalindoeng',
    'Pasawahan', 'Pameunpeuk', 'Patjitan', 'Kediri',
    'Pemboeang', 'Tringanoe', 'Makin', 'Tipor',
    'Semai', 'Berhala', 'Tegal', 'Samoe',
];
const shkweapons = [
    'Voulgezac', 'Rouffiac', 'Lerignac', 'Touverac', 'Guizengeard',
    'Melac', 'Neuvicq', 'Vanzac', 'Picq', 'Urignac',
    'Corignac', 'Fleac', 'Lonzac', 'Vergt', 'Queyssac',
    'Liorac', 'Echourgnac', 'Cazelon', 'Eypau', 'Carignan',
    'Monbazillac', 'Jonzac', 'Pons', 'Jumilhac', 'Fenouilledes',
    'Laguiolet', 'Saujon', 'Eymoutiers', 'Eygurande', 'Eauze',
    'Labouheyre',
];
const shktools = [
    'Ymla', 'Eed-morra', 'Elan Lapinski', 'Cubask', 'Nieb', 'Bnowr Falr',
    'Sperc', 'Noskcirdneh', 'Yawolloh', 'Hyeghu', 'Niskal', 'Trahnil',
    'Htargcm', 'Enrobwem', 'Kachzi Rellim', 'Regien', 'Donmyar', 'Yelpur',
    'Nosnehpets', 'Stewe', 'Renrut', 'Senna Hut', '-Zlaw', 'Nosalnef',
    'Rewuorb', 'Rellenk', 'Yad', 'Cire Htims', 'Y-crad', 'Nenilukah',
    'Corsh', 'Aned', 'Dark Eery', 'Niknar', 'Lapu', 'Lechaim',
    'Rebrol-nek', 'AlliWar Wickson', 'Oguhmk', 'Telloc Cyaj',
];
const shklight = [
    'Zarnesti', 'Slanic', 'Nehoiasu', 'Ludus', 'Sighisoara', 'Nisipitu',
    'Razboieni', 'Bicaz', 'Dorohoi', 'Vaslui', 'Fetesti', 'Tirgu Neamt',
    'Babadag', 'Zimnicea', 'Zlatna', 'Jiu', 'Eforie', 'Mamaia',
    'Silistra', 'Tulovo', 'Panagyuritshte', 'Smolyan', 'Kirklareli', 'Pernik',
    'Lom', 'Haskovo', 'Dobrinishte', 'Varvara', 'Oryahovo', 'Troyan',
    'Lovech', 'Sliven',
];
const shkgeneral = [
    'Hebiwerie', 'Possogroenoe', 'Asidonhopo', 'Manlobbi',
    'Adjama', 'Pakka Pakka', 'Kabalebo', 'Wonotobo',
    'Akalapi', 'Sipaliwini',
    'Annootok', 'Upernavik', 'Angmagssalik',
    'Aklavik', 'Inuvik', 'Tuktoyaktuk', 'Chicoutimi',
    'Ouiatchouane', 'Chibougamau', 'Matagami', 'Kipawa',
    'Kinojevis', 'Abitibi', 'Maganasipi',
    'Akureyri', 'Kopasker', 'Budereyri', 'Akranes',
    'Bordeyri', 'Holmavik',
];
const shkhealthfoods = [
    "Ga'er", 'Zhangmu', 'Rikaze', 'Jiangji', 'Changdu',
    'Linzhi', 'Shigatse', 'Gyantse', 'Ganden', 'Tsurphu',
    'Lhasa', 'Tsedong', 'Drepung',
    '=Azura', '=Blaze', '=Breanna', '=Breezy', '=Dharma',
    '=Feather', '=Jasmine', '=Luna', '=Melody', '=Moonjava',
    '=Petal', '=Rhiannon', '=Starla', '=Tranquilla', '=Windsong',
    '=Zennia', '=Zoe', '=Zora',
];

/** C ref: shknam.c shtypes[] */
export const shtypes = [
    {
        name: 'general store', symb: RANDOM_CLASS, prob: 42, shknms: shkgeneral,
        iprobs: [{ iprob: 100, itype: RANDOM_CLASS }],
    },
    {
        name: 'used armor dealership', symb: ARMOR_CLASS, prob: 14, shknms: shkarmors,
        iprobs: [
            { iprob: 90, itype: ARMOR_CLASS },
            { iprob: 10, itype: WEAPON_CLASS },
        ],
    },
    {
        name: 'second-hand bookstore', symb: SCROLL_CLASS, prob: 10, shknms: shkbooks,
        iprobs: [
            { iprob: 90, itype: SCROLL_CLASS },
            { iprob: 10, itype: SPBOOK_CLASS },
        ],
    },
    {
        name: 'liquor emporium', symb: POTION_CLASS, prob: 10, shknms: shkliquors,
        iprobs: [{ iprob: 100, itype: POTION_CLASS }],
    },
    {
        name: 'antique weapons outlet', symb: WEAPON_CLASS, prob: 5, shknms: shkweapons,
        iprobs: [
            { iprob: 90, itype: WEAPON_CLASS },
            { iprob: 10, itype: ARMOR_CLASS },
        ],
    },
    {
        name: 'delicatessen', symb: FOOD_CLASS, prob: 5, shknms: shkfoods,
        iprobs: [
            { iprob: 83, itype: FOOD_CLASS },
            { iprob: 5, itype: otypNeg('POT_FRUIT_JUICE') },
            { iprob: 4, itype: otypNeg('POT_BOOZE') },
            { iprob: 5, itype: otypNeg('POT_WATER') },
            { iprob: 3, itype: otypNeg('ICE_BOX') },
        ],
    },
    {
        name: 'jewelers', symb: RING_CLASS, prob: 3, shknms: shkrings,
        iprobs: [
            { iprob: 85, itype: RING_CLASS },
            { iprob: 10, itype: GEM_CLASS },
            { iprob: 5, itype: AMULET_CLASS },
        ],
    },
    {
        name: 'quality apparel and accessories', symb: WAND_CLASS, prob: 3,
        shknms: shkwands,
        iprobs: [
            { iprob: 90, itype: WAND_CLASS },
            { iprob: 5, itype: otypNeg('LEATHER_GLOVES') },
            { iprob: 5, itype: otypNeg('ELVEN_CLOAK') },
        ],
    },
    {
        name: 'hardware store', symb: TOOL_CLASS, prob: 3, shknms: shktools,
        iprobs: [{ iprob: 100, itype: TOOL_CLASS }],
    },
    {
        name: 'rare books', symb: SPBOOK_CLASS, prob: 3, shknms: shkbooks,
        iprobs: [
            { iprob: 90, itype: SPBOOK_CLASS },
            { iprob: 10, itype: SCROLL_CLASS },
        ],
    },
    {
        name: 'health food store', symb: FOOD_CLASS, prob: 2, shknms: shkhealthfoods,
        iprobs: [
            { iprob: 70, itype: VEGETARIAN_CLASS },
            { iprob: 20, itype: otypNeg('POT_FRUIT_JUICE') },
            { iprob: 4, itype: otypNeg('POT_HEALING') },
            { iprob: 3, itype: otypNeg('POT_FULL_HEALING') },
            { iprob: 2, itype: otypNeg('SCR_FOOD_DETECTION') },
            { iprob: 1, itype: otypNeg('LUMP_OF_ROYAL_JELLY') },
        ],
    },
    {
        name: 'lighting store', symb: TOOL_CLASS, prob: 0, shknms: shklight,
        iprobs: [
            { iprob: 30, itype: otypNeg('WAX_CANDLE') },
            { iprob: 44, itype: otypNeg('TALLOW_CANDLE') },
            { iprob: 5, itype: otypNeg('BRASS_LANTERN') },
            { iprob: 9, itype: otypNeg('OIL_LAMP') },
            { iprob: 3, itype: otypNeg('MAGIC_LAMP') },
            { iprob: 5, itype: otypNeg('POT_OIL') },
            { iprob: 2, itype: otypNeg('WAN_LIGHT') },
            { iprob: 1, itype: otypNeg('SCR_LIGHT') },
            { iprob: 1, itype: otypNeg('SPE_LIGHT') },
        ],
    },
];

function distmin(x0, y0, x1, y1) {
    return Math.max(Math.abs(x0 - x1), Math.abs(y0 - y1));
}

function m_at(x, y) {
    for (const m of (game.fmon || [])) {
        if (m && m.mx === x && m.my === y) return m;
    }
    return null;
}

function inside_shop(x, y) {
    const loc = game.level?.at?.(x, y);
    if (!loc) return false;
    const rmno = (loc.roomno | 0) - ROOMOFFSET;
    if (rmno < 0) return false;
    const room = game.level.rooms?.[rmno];
    return !!(room && (room.rtype | 0) >= SHOPBASE);
}

function ledger_no(lev) {
    const dun = game.dungeons?.[lev?.dnum | 0];
    return ((dun?.ledger_start | 0) + (lev?.dlevel | 0)) | 0;
}

/** C ref: shknam.c get_shop_item */
export function get_shop_item(type) {
    const shp = shtypes[type];
    if (!shp) return RANDOM_CLASS;
    let j = rnd(100);
    let i = 0;
    const probs = shp.iprobs || [];
    for (; i < probs.length && (j -= probs[i].iprob) > 0; i++)
        continue;
    return probs[Math.min(i, probs.length - 1)]?.itype ?? RANDOM_CLASS;
}

/** C ref: shknam.c neweshk — re-export from makemon (MM_ESHK allocator). */
export { neweshk };

/** C ref: shknam.c nameshk */
function nameshk(shk, nlpIn) {
    const eshk = ESHK(shk) || neweshk(shk);
    let nlp = nlpIn;
    const nseed = Math.trunc((Number(game.ubirthday) || 0) / 257);
    let nameWanted = (shk.m_id | 0) + ledger_no(game.u?.uz)
        + (nseed % 13) - (nseed % 5);
    if (nameWanted < 0) nameWanted += 13 + 5;
    shk.female = nameWanted & 1 ? 1 : 0;

    let namesAvail = nlp.length;
    nameWanted = nameWanted % namesAvail;
    let shname = '';

    for (let trycnt = 0; trycnt < 50; trycnt++) {
        if (nlp === shktools) {
            shname = nlp[rn2(namesAvail)];
            shk.female = 0;
        } else if (nameWanted < namesAvail) {
            shname = nlp[nameWanted];
        } else {
            const i = rn2(namesAvail);
            if (i !== 0) {
                shname = nlp[i - 1];
            } else if (nlp !== shkgeneral) {
                nlp = shkgeneral;
                namesAvail = nlp.length;
                continue;
            } else {
                shname = shk.female ? '-Lucrezia' : '+Dirk';
            }
        }
        if (shname[0] === '_' || shname[0] === '-') shk.female = 1;
        else if (shname[0] === '|' || shname[0] === '+') shk.female = 0;

        let clash = null;
        for (const mtmp of (game.fmon || [])) {
            if (!mtmp || mtmp === shk || !mtmp.isshk) continue;
            if ((ESHK(mtmp)?.shknam || '') === shname) {
                nameWanted = namesAvail;
                clash = mtmp;
                break;
            }
        }
        if (!clash) break;
    }
    eshk.shknam = String(shname || '').slice(0, 31);
}

/** C ref: shknam.c good_shopdoor */
function good_shopdoor(sroom, out) {
    const doors = game.level?.doors;
    if (!doors) return -1;
    for (let i = 0; i < (sroom.doorct | 0); i++) {
        const di = (sroom.fdoor | 0) + i;
        let sx = doors[di]?.x;
        let sy = doors[di]?.y;
        if (sx == null || sy == null) continue;

        if (sroom.irregular) {
            const rmno = game.level.rooms.indexOf(sroom) + ROOMOFFSET;
            if (isok(sx - 1, sy) && !game.level.at(sx - 1, sy)?.edge
                && (game.level.at(sx - 1, sy)?.roomno | 0) === rmno) sx--;
            else if (isok(sx + 1, sy) && !game.level.at(sx + 1, sy)?.edge
                && (game.level.at(sx + 1, sy)?.roomno | 0) === rmno) sx++;
            else if (isok(sx, sy - 1) && !game.level.at(sx, sy - 1)?.edge
                && (game.level.at(sx, sy - 1)?.roomno | 0) === rmno) sy--;
            else if (isok(sx, sy + 1) && !game.level.at(sx, sy + 1)?.edge
                && (game.level.at(sx, sy + 1)?.roomno | 0) === rmno) sy++;
            else continue;
        } else if (sx === sroom.lx - 1) {
            sx++;
        } else if (sx === sroom.hx + 1) {
            sx--;
        } else if (sy === sroom.ly - 1) {
            sy++;
        } else if (sy === sroom.hy + 1) {
            sy--;
        } else {
            continue;
        }
        out.x = sx;
        out.y = sy;
        return di;
    }
    return -1;
}

/** C ref: shknam.c mkshobj_at */
function mkshobj_at(shp, sx, sy, mkspecl) {
    if (mkspecl && (shp.name === 'rare books'
        || shp.name === 'second-hand bookstore')) {
        const novel = mksobj_at(SPE_NOVEL, sx, sy, false, false);
        if (novel) {
            if (!game.context) game.context = {};
            if (!game.context.tribute) game.context.tribute = {};
            game.context.tribute.bookstock = true;
        }
        return;
    }

    const dep = Math.abs(depth_of_level(game.u?.uz) | 0);
    if (rn2(100) < dep && !m_at(sx, sy)) {
        const ptr = mkclass('S_MIMIC', 0);
        if (ptr && makemon(ptr, sx, sy, 0)) return;
    }

    const atype = get_shop_item(shtypes.indexOf(shp));
    if (atype === VEGETARIAN_CLASS) {
        // Named omission: shkveg/mkveggy_at — food-class stand-in
        mkobj_at(FOOD_CLASS, sx, sy, true);
    } else if (atype < 0) {
        mksobj_at(-atype, sx, sy, true, true);
    } else {
        mkobj_at(atype, sx, sy, true);
    }
}

function stock_room_goodpos(sroom, rmno, sh, sx, sy) {
    const door = game.level?.doors?.[sh];
    if (sroom.irregular) {
        const loc = game.level.at(sx, sy);
        if (!loc || loc.edge || (loc.roomno | 0) !== rmno
            || !door || distmin(sx, sy, door.x, door.y) <= 1) {
            return false;
        }
    } else if (door && (
        (sx === sroom.lx && door.x === sx - 1)
        || (sx === sroom.hx && door.x === sx + 1)
        || (sy === sroom.ly && door.y === sy - 1)
        || (sy === sroom.hy && door.y === sy + 1)
    )) {
        return false;
    }
    const loc = game.level?.at?.(sx, sy);
    return !!(loc && IS_ROOM(loc.typ));
}

/** C ref: shknam.c shkinit */
function shkinit(shp, sroom) {
    const pos = { x: 0, y: 0 };
    const sh = good_shopdoor(sroom, pos);
    if (sh < 0) return -1;
    const sx = pos.x;
    const sy = pos.y;

    const blocker = m_at(sx, sy);
    if (blocker) {
        blocker.mx = 0;
        blocker.my = 0;
    }

    const shk = makemon(mons(PM_SHOPKEEPER), sx, sy, MM_ESHK);
    if (!shk) return -1;

    const eshkp = ESHK(shk) || neweshk(shk);
    shk.isshk = 1;
    shk.mpeaceful = 1;
    shk.msleeping = 0;
    shk.mtrapseen = ~0; // ALL_TRAPS
    eshkp.shoproom = game.level.rooms.indexOf(sroom) + ROOMOFFSET;
    sroom.resident = shk;
    eshkp.shoptype = sroom.rtype;
    eshkp.shoplevel = {
        dnum: game.u?.uz?.dnum | 0,
        dlevel: game.u?.uz?.dlevel | 0,
    };
    const door = game.level.doors[sh];
    eshkp.shd = { x: door?.x | 0, y: door?.y | 0 };
    eshkp.shk = { x: sx, y: sy };
    eshkp.robbed = eshkp.credit = eshkp.debit = eshkp.loan = 0;
    eshkp.following = eshkp.surcharge = eshkp.dismiss_kops = false;
    eshkp.billct = eshkp.visitct = 0;
    eshkp.bill_p = null;
    eshkp.customer = '';

    mkmonmoney(shk, 1000 + 30 * rnd(100));
    if (shp.shknms === shkrings) mongets(shk, TOUCHSTONE);
    if (shp.shknms === shktools || shp.shknms === shkwands
        || (shp.shknms === shkrings && rn2(2))
        || (shp.shknms === shkgeneral && rn2(5))) {
        mongets(shk, SCR_CHARGING);
    }
    nameshk(shk, shp.shknms);
    return sh;
}

/**
 * C ref: shknam.c stock_room — shkinit, door cleanup, tribute spot, stock.
 */
export function stock_room(shp_indx, sroom) {
    const shp = shtypes[shp_indx];
    if (!shp) return;

    const sh = shkinit(shp, sroom);
    if (sh < 0) return;

    const rmno = game.level.rooms.indexOf(sroom) + ROOMOFFSET;
    let sx = game.level.doors[sroom.fdoor]?.x | 0;
    let sy = game.level.doors[sroom.fdoor]?.y | 0;
    const loc = game.level.at(sx, sy);
    if (loc) {
        const mask = loc.doormask ?? loc.flags ?? D_NODOOR;
        if (mask === D_NODOOR) {
            loc.doormask = D_ISOPEN;
            loc.flags = D_ISOPEN;
            newsym(sx, sy);
        }
        if (loc.typ === SDOOR) {
            cvt_sdoor_to_door(loc);
            newsym(sx, sy);
        }
        if ((loc.doormask ?? loc.flags ?? 0) & D_TRAPPED) {
            loc.doormask = D_LOCKED;
            loc.flags = D_LOCKED;
        }
        if ((loc.doormask ?? loc.flags) === D_LOCKED) {
            let m = sx;
            let n = sy;
            if (inside_shop(sx + 1, sy)) m--;
            else if (inside_shop(sx - 1, sy)) m++;
            if (inside_shop(sx, sy + 1)) n--;
            else if (inside_shop(sx, sy - 1)) n++;
            make_engr_at(m, n, 'Closed for inventory', null, 0, DUST);
            const eloc = game.level.at(m, n);
            if (eloc && eloc.typ !== CORR && eloc.typ !== ROOM) {
                // Is_special / in_rooms deferred → prefer ROOM
                eloc.typ = ROOM;
            }
        }
    }

    let stockcount = 0;
    let specialspot = 0;
    const trib = game.context?.tribute;
    if (trib?.enabled && !trib.bookstock) {
        for (sx = sroom.lx; sx <= sroom.hx; sx++) {
            for (sy = sroom.ly; sy <= sroom.hy; sy++) {
                if (stock_room_goodpos(sroom, rmno, sh, sx, sy)) stockcount++;
            }
        }
        specialspot = rnd(stockcount);
        stockcount = 0;
    }

    for (sx = sroom.lx; sx <= sroom.hx; sx++) {
        for (sy = sroom.ly; sy <= sroom.hy; sy++) {
            if (stock_room_goodpos(sroom, rmno, sh, sx, sy)) {
                stockcount++;
                mkshobj_at(shp, sx, sy,
                    !!(stockcount && stockcount === specialspot));
            }
        }
    }

    if (game.level?.flags) game.level.flags.has_shop = true;
}
