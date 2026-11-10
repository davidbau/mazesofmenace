/* NetHack 5.0	shknam.c	$NHDT-Date: 1764109114 2025/11/25 22:18:34 $  $NHDT-Branch: NetHack-3.7 $:$NHDT-Revision: 1.86 $ */
/* Copyright (c) Stichting Mathematisch Centrum, Amsterdam, 1985. */
/*-Copyright (c) Robert Patrick Rankin, 2011. */
/* NetHack may be freely redistributed.  See license for details. */

import { C } from './c-runtime.js';
import layouts from '../wasm/tu-layouts.json' with { type: 'json' };
const constants = { ...layouts.shknam, VEGETARIAN_CLASS: layouts.shknam.MAXOCLASSES + 1 };

/* shknam.c -- initialize a shop */





/*
 *  Name prefix codes:
 *      dash          -  female, personal name
 *      underscore    _  female, general name
 *      plus          +  male, personal name
 *      vertical bar  |  male, general name (implied for most of shktools)
 *      equals        =  gender not specified, personal name
 *
 *  Personal names do not receive the honorific prefix "Mr." or "Ms.".
 */

export const shkliquors = [
    /* Ukraine */
    "Njezjin", "Tsjernigof", "Ossipewsk", "Gorlowka",
    /* Belarus */
    "Gomel",
    /* N. Russia */
    "Konosja", "Weliki Oestjoeg", "Syktywkar", "Sablja", "Narodnaja", "Kyzyl",
    /* Silezie */
    "Walbrzych", "Swidnica", "Klodzko", "Raciborz", "Gliwice", "Brzeg",
    "Krnov", "Hradec Kralove",
    /* Schweiz */
    "Leuk", "Brig", "Brienz", "Thun", "Sarnen", "Burglen", "Elm", "Flims",
    "Vals", "Schuls", "Zum Loch", 0
];

export const shkbooks = [
    /* Eire */
    "Skibbereen",  "Kanturk",   "Rath Luirc",     "Ennistymon",
    "Lahinch",     "Kinnegad",  "Lugnaquillia",   "Enniscorthy",
    "Gweebarra",   "Kittamagh", "Nenagh",         "Sneem",
    "Ballingeary", "Kilgarvan", "Cahersiveen",    "Glenbeigh",
    "Kilmihil",    "Kiltamagh", "Droichead Atha", "Inniscrone",
    "Clonegal",    "Lisnaskea", "Culdaff",        "Dunfanaghy",
    "Inishbofin",  "Kesh",      0
];

export const shkarmors = [
    /* Turquie */
    "Demirci",    "Kalecik",    "Boyabai",    "Yildizeli", "Gaziantep",
    "Siirt",      "Akhalataki", "Tirebolu",   "Aksaray",   "Ermenak",
    "Iskenderun", "Kadirli",    "Siverek",    "Pervari",   "Malasgirt",
    "Bayburt",    "Ayancik",    "Zonguldak",  "Balya",     "Tefenni",
    "Artvin",     "Kars",       "Makharadze", "Malazgirt", "Midyat",
    "Birecik",    "Kirikkale",  "Alaca",      "Polatli",   "Nallihan",
    0
];

export const shkwands = [
    /* Wales */
    "Yr Wyddgrug", "Trallwng", "Mallwyd", "Pontarfynach", "Rhaeader",
    "Llandrindod", "Llanfair-ym-muallt", "Y-Fenni", "Maesteg", "Rhydaman",
    "Beddgelert", "Curig", "Llanrwst", "Llanerchymedd", "Caergybi",
    /* Scotland */
    "Nairn", "Turriff", "Inverurie", "Braemar", "Lochnagar", "Kerloch",
    "Beinn a Ghlo", "Drumnadrochit", "Morven", "Uist", "Storr",
    "Sgurr na Ciche", "Cannich", "Gairloch", "Kyleakin", "Dunvegan", 0
];

export const shkrings = [
    /* Hollandse familienamen */
    "Feyfer",     "Flugi",         "Gheel",      "Havic",   "Haynin",
    "Hoboken",    "Imbyze",        "Juyn",       "Kinsky",  "Massis",
    "Matray",     "Moy",           "Olycan",     "Sadelin", "Svaving",
    "Tapper",     "Terwen",        "Wirix",      "Ypey",
    /* Skandinaviske navne */
    "Rastegaisa", "Varjag Njarga", "Kautekeino", "Abisko",  "Enontekis",
    "Rovaniemi",  "Avasaksa",      "Haparanda",  "Lulea",   "Gellivare",
    "Oeloe",      "Kajaani",       "Fauske",     0
];

export const shkfoods = [
    /* Indonesia */
    "Djasinga",    "Tjibarusa",   "Tjiwidej",      "Pengalengan",
    "Bandjar",     "Parbalingga", "Bojolali",      "Sarangan",
    "Ngebel",      "Djombang",    "Ardjawinangun", "Berbek",
    "Papar",       "Baliga",      "Tjisolok",      "Siboga",
    "Banjoewangi", "Trenggalek",  "Karangkobar",   "Njalindoeng",
    "Pasawahan",   "Pameunpeuk",  "Patjitan",      "Kediri",
    "Pemboeang",   "Tringanoe",   "Makin",         "Tipor",
    "Semai",       "Berhala",     "Tegal",         "Samoe",
    0
];

export const shkweapons = [
    /* Perigord */
    "Voulgezac",   "Rouffiac",   "Lerignac",   "Touverac",  "Guizengeard",
    "Melac",       "Neuvicq",    "Vanzac",     "Picq",      "Urignac",
    "Corignac",    "Fleac",      "Lonzac",     "Vergt",     "Queyssac",
    "Liorac",      "Echourgnac", "Cazelon",    "Eypau",     "Carignan",
    "Monbazillac", "Jonzac",     "Pons",       "Jumilhac",  "Fenouilledes",
    "Laguiolet",   "Saujon",     "Eymoutiers", "Eygurande", "Eauze",
    "Labouheyre",  0
];

export const shktools = [
    /* Spmi */
    "Ymla", "Eed-morra", "Elan Lapinski", "Cubask", "Nieb", "Bnowr Falr",
    "Sperc", "Noskcirdneh", "Yawolloh", "Hyeghu", "Niskal", "Trahnil",
    "Htargcm", "Enrobwem", "Kachzi Rellim", "Regien", "Donmyar", "Yelpur",
    "Nosnehpets", "Stewe", "Renrut", "Senna Hut", "-Zlaw", "Nosalnef",
    "Rewuorb", "Rellenk", "Yad", "Cire Htims", "Y-crad", "Nenilukah",
    "Corsh", "Aned", "Dark Eery", "Niknar", "Lapu", "Lechaim",
    "Rebrol-nek", "AlliWar Wickson", "Oguhmk", "Telloc Cyaj",
    0
];

export const shklight = [
    /* Romania */
    "Zarnesti", "Slanic", "Nehoiasu", "Ludus", "Sighisoara", "Nisipitu",
    "Razboieni", "Bicaz", "Dorohoi", "Vaslui", "Fetesti", "Tirgu Neamt",
    "Babadag", "Zimnicea", "Zlatna", "Jiu", "Eforie", "Mamaia",
    /* Bulgaria */
    "Silistra", "Tulovo", "Panagyuritshte", "Smolyan", "Kirklareli", "Pernik",
    "Lom", "Haskovo", "Dobrinishte", "Varvara", "Oryahovo", "Troyan",
    "Lovech", "Sliven", 0
];

export const shkgeneral = [
    /* Suriname */
    "Hebiwerie",    "Possogroenoe", "Asidonhopo",   "Manlobbi",
    "Adjama",       "Pakka Pakka",  "Kabalebo",     "Wonotobo",
    "Akalapi",      "Sipaliwini",
    /* Greenland */
    "Annootok",     "Upernavik",    "Angmagssalik",
    /* N. Canada */
    "Aklavik",      "Inuvik",       "Tuktoyaktuk",  "Chicoutimi",
    "Ouiatchouane", "Chibougamau",  "Matagami",     "Kipawa",
    "Kinojevis",    "Abitibi",      "Maganasipi",
    /* Iceland */
    "Akureyri",     "Kopasker",     "Budereyri",    "Akranes",
    "Bordeyri",     "Holmavik",     0
];

export const shkhealthfoods = [
    /* Tibet */
    "Ga'er",    "Zhangmu",   "Rikaze",   "Jiangji",     "Changdu",
    "Linzhi",   "Shigatse",  "Gyantse",  "Ganden",      "Tsurphu",
    "Lhasa",    "Tsedong",   "Drepung",
    /* Hippie names */
    "=Azura",   "=Blaze",    "=Breanna", "=Breezy",     "=Dharma",
    "=Feather", "=Jasmine",  "=Luna",    "=Melody",     "=Moonjava",
    "=Petal",   "=Rhiannon", "=Starla",  "=Tranquilla", "=Windsong",
    "=Zennia",  "=Zoe",      "=Zora",    0
];

/*
 * To add new shop types, all that is necessary is to edit the shtypes[]
 * array.  See mkroom.h for the structure definition.  Typically, you'll
 * have to lower some or all of the probability fields in old entries to
 * free up some percentage for the new type.
 *
 * The placement type field is not yet used but might be someday.
 *
 * The iprobs array in each entry defines the probabilities for various kinds
 * of objects to be present in the given shop type.  You can associate with
 * each percentage either a generic object type (represented by one of the
 * *_CLASS enum value) or a specific object enum value.
 * In the latter case, prepend it with a unary minus so the code can know
 * (by testing the sign) whether to use mkobj() or mksobj().
 * shtypes[] is externally referenced from mkroom.c, mon.c and shk.c.
 *
 * The second, usually shorter, store type name is used in automatically
 * generated annotations for #overview.  If Null, the first name gets used.
 */
export const shtypes = [
    { name: "general store", annotation: 0,
      symb: constants.RANDOM_CLASS, prob: 42, shdist: constants.D_SHOP,
      iprobs: [{ iprob: 100, itype: constants.RANDOM_CLASS }, { iprob: 0, itype: 0 }, { iprob: 0, itype: 0 }, { iprob: 0, itype: 0 }, { iprob: 0, itype: 0 }, { iprob: 0, itype: 0 }, { iprob: 0, itype: 0 }, { iprob: 0, itype: 0 }, { iprob: 0, itype: 0 }],
      shknms: shkgeneral },
    { name: "used armor dealership", annotation: "armor shop",
      symb: constants.ARMOR_CLASS, prob: 14, shdist: constants.D_SHOP,
      iprobs: [{ iprob: 90, itype: constants.ARMOR_CLASS }, { iprob: 10, itype: constants.WEAPON_CLASS }, { iprob: 0, itype: 0 }, { iprob: 0, itype: 0 }, { iprob: 0, itype: 0 }, { iprob: 0, itype: 0 }, { iprob: 0, itype: 0 }, { iprob: 0, itype: 0 }, { iprob: 0, itype: 0 }],
      shknms: shkarmors },
    { name: "second-hand bookstore", annotation: "scroll shop",
      symb: constants.SCROLL_CLASS, prob: 10, shdist: constants.D_SHOP,
      iprobs: [{ iprob: 90, itype: constants.SCROLL_CLASS }, { iprob: 10, itype: constants.SPBOOK_CLASS }, { iprob: 0, itype: 0 }, { iprob: 0, itype: 0 }, { iprob: 0, itype: 0 }, { iprob: 0, itype: 0 }, { iprob: 0, itype: 0 }, { iprob: 0, itype: 0 }, { iprob: 0, itype: 0 }],
      shknms: shkbooks },
    { name: "liquor emporium", annotation: "potion shop",
      symb: constants.POTION_CLASS, prob: 10, shdist: constants.D_SHOP,
      iprobs: [{ iprob: 100, itype: constants.POTION_CLASS }, { iprob: 0, itype: 0 }, { iprob: 0, itype: 0 }, { iprob: 0, itype: 0 }, { iprob: 0, itype: 0 }, { iprob: 0, itype: 0 }, { iprob: 0, itype: 0 }, { iprob: 0, itype: 0 }, { iprob: 0, itype: 0 }],
      shknms: shkliquors },
    { name: "antique weapons outlet", annotation: "weapon shop",
      symb: constants.WEAPON_CLASS, prob: 5, shdist: constants.D_SHOP,
      iprobs: [{ iprob: 90, itype: constants.WEAPON_CLASS }, { iprob: 10, itype: constants.ARMOR_CLASS }, { iprob: 0, itype: 0 }, { iprob: 0, itype: 0 }, { iprob: 0, itype: 0 }, { iprob: 0, itype: 0 }, { iprob: 0, itype: 0 }, { iprob: 0, itype: 0 }, { iprob: 0, itype: 0 }],
      shknms: shkweapons },
    { name: "delicatessen", annotation: "food shop",
      symb: constants.FOOD_CLASS, prob: 5, shdist: constants.D_SHOP,
      iprobs: [{ iprob: 83, itype: constants.FOOD_CLASS }, { iprob: 5, itype: -constants.POT_FRUIT_JUICE }, { iprob: 4, itype: -constants.POT_BOOZE }, { iprob: 5, itype: -constants.POT_WATER }, { iprob: 3, itype: -constants.ICE_BOX }, { iprob: 0, itype: 0 }, { iprob: 0, itype: 0 }, { iprob: 0, itype: 0 }, { iprob: 0, itype: 0 }],
      shknms: shkfoods },
    { name: "jewelers", annotation: "ring shop",
      symb: constants.RING_CLASS, prob: 3, shdist: constants.D_SHOP,
      iprobs: [{ iprob: 85, itype: constants.RING_CLASS }, { iprob: 10, itype: constants.GEM_CLASS }, { iprob: 5, itype: constants.AMULET_CLASS }, { iprob: 0, itype: 0 }, { iprob: 0, itype: 0 }, { iprob: 0, itype: 0 }, { iprob: 0, itype: 0 }, { iprob: 0, itype: 0 }, { iprob: 0, itype: 0 }],
      shknms: shkrings },
    { name: "quality apparel and accessories", annotation: "wand shop",
      symb: constants.WAND_CLASS, prob: 3, shdist: constants.D_SHOP,
      iprobs: [{ iprob: 90, itype: constants.WAND_CLASS }, { iprob: 5, itype: -constants.LEATHER_GLOVES }, { iprob: 5, itype: -constants.ELVEN_CLOAK }, { iprob: 0, itype: 0 }, { iprob: 0, itype: 0 }, { iprob: 0, itype: 0 }, { iprob: 0, itype: 0 }, { iprob: 0, itype: 0 }, { iprob: 0, itype: 0 }],
      shknms: shkwands },
    { name: "hardware store", annotation: "tool shop",
      symb: constants.TOOL_CLASS, prob: 3, shdist: constants.D_SHOP,
      iprobs: [{ iprob: 100, itype: constants.TOOL_CLASS }, { iprob: 0, itype: 0 }, { iprob: 0, itype: 0 }, { iprob: 0, itype: 0 }, { iprob: 0, itype: 0 }, { iprob: 0, itype: 0 }, { iprob: 0, itype: 0 }, { iprob: 0, itype: 0 }, { iprob: 0, itype: 0 }],
      shknms: shktools },
    { name: "rare books", annotation: "bookstore",
      symb: constants.SPBOOK_CLASS, prob: 3, shdist: constants.D_SHOP,
      iprobs: [{ iprob: 90, itype: constants.SPBOOK_CLASS }, { iprob: 10, itype: constants.SCROLL_CLASS }, { iprob: 0, itype: 0 }, { iprob: 0, itype: 0 }, { iprob: 0, itype: 0 }, { iprob: 0, itype: 0 }, { iprob: 0, itype: 0 }, { iprob: 0, itype: 0 }, { iprob: 0, itype: 0 }],
      shknms: shkbooks },
    { name: "health food store", annotation: "vegetarian food shop",
      symb: constants.FOOD_CLASS, prob: 2, shdist: constants.D_SHOP,
      iprobs: [{ iprob: 70, itype: constants.VEGETARIAN_CLASS }, { iprob: 20, itype: -constants.POT_FRUIT_JUICE }, { iprob: 4, itype: -constants.POT_HEALING }, { iprob: 3, itype: -constants.POT_FULL_HEALING }, { iprob: 2, itype: -constants.SCR_FOOD_DETECTION }, { iprob: 1, itype: -constants.LUMP_OF_ROYAL_JELLY }, { iprob: 0, itype: 0 }, { iprob: 0, itype: 0 }, { iprob: 0, itype: 0 }],
      shknms: shkhealthfoods },
/* Shops below this point are "unique".  That is they must all have a
     * probability of zero.  They are only created via the special level
     * loader.
     */
    { name: "lighting store", annotation: "lighting shop",
      symb: constants.TOOL_CLASS, prob: 0, shdist: constants.D_SHOP,
      iprobs: [{ iprob: 30, itype: -constants.WAX_CANDLE }, { iprob: 44, itype: -constants.TALLOW_CANDLE }, { iprob: 5, itype: -constants.BRASS_LANTERN }, { iprob: 9, itype: -constants.OIL_LAMP }, { iprob: 3, itype: -constants.MAGIC_LAMP }, { iprob: 5, itype: -constants.POT_OIL }, { iprob: 2, itype: -constants.WAN_LIGHT }, { iprob: 1, itype: -constants.SCR_LIGHT }, { iprob: 1, itype: -constants.SPE_LIGHT }],
      shknms: shklight },
/* sentinel */
    { name: 0, annotation: 0,
      symb: 0, prob: 0, shdist: 0,
      iprobs: [{ iprob: 0, itype: 0 }, { iprob: 0, itype: 0 }, { iprob: 0, itype: 0 }, { iprob: 0, itype: 0 }, { iprob: 0, itype: 0 }, { iprob: 0, itype: 0 }, { iprob: 0, itype: 0 }, { iprob: 0, itype: 0 }, { iprob: 0, itype: 0 }],
      shknms: 0 },
];

/* validate shop probabilities; otherwise incorrect local changes could
   end up provoking infinite loops or wild subscripts fetching garbage */
/*0*/

/* decide whether an object or object type is considered vegetarian;
   for types, items which might go either way are assumed to be veggy */
export function veggy_item(obj, otyp /* used iff obj is null */)
{
    otyp = C.int(otyp);
    let corpsenm;
    let oclass;

    if (obj) {
        /* actual object; will check tin content and corpse species */
        otyp = obj.otyp;
        oclass = obj.oclass;
        corpsenm = obj.corpsenm;
    } else {
        /* just a type; caller will have to handle tins and corpses */
        oclass = C.objects[otyp].oc_class;
        corpsenm = C.PM_LICHEN; /* veggy standin */
    }

    if (oclass == C.FOOD_CLASS) {
        if (C.objects[otyp].oc_material == C.VEGGY || otyp == C.EGG)
            return 1;
        if (otyp == C.TIN && corpsenm == C.NON_PM) /* implies obj is non-null */
            return (obj.spe == 1); /* 0 = empty, 1 = spinach */
        if (otyp == C.TIN || otyp == C.CORPSE)
            return (C.ismnum(corpsenm) && C.vegetarian(C.mons[corpsenm]));
    }
    return 0;
}

export function shkveg()
{
    let i, j, maxprob, prob;
    let oclass = C.FOOD_CLASS;
    let ok = C.intArrayLocal(C.NUM_OBJECTS);

    C.memset(ok, 0, C.NUM_OBJECTS * C.intSize); /* lint suppression */
    j = maxprob = 0;
    for (i = C.svb.bases[oclass]; i < C.NUM_OBJECTS; ++i) {
        if (C.objects[i].oc_class != oclass)
            break;

        if (veggy_item(0, i)) {
            ok[j++] = i;
            maxprob += C.objects[i].oc_prob;
        }
    }
    if (maxprob < 1)
        C.panic("shkveg no veggy objects");
    prob = C.rnd(maxprob, 427, 0);

    j = 0;
    i = ok[0];
    while ((prob -= C.objects[i].oc_prob) > 0) {
        j++;
        i = ok[j];
    }

    if (C.objects[i].oc_class != oclass || !C.OBJ_NAME(C.objects[i]))
        C.panic("shkveg probtype error, oclass=%d i=%d", oclass, i);
    return i;
}

/* make a random item for health food store */
export function mkveggy_at(sx, sy)
{
    sx = C.int(sx);
    sy = C.int(sy);
    let obj = C.mksobj_at(C.callLocal(shkveg), sx, sy, 1, 1);

    if (obj && obj.otyp == C.TIN)
        C.set_tin_variety(obj, C.HEALTHY_TIN);
    return;
}

/* make an object of the appropriate type for a shop square */
export function mkshobj_at(shp, sx, sy, mkspecl)
{
    mkspecl = C.boolean(mkspecl);
    sx = C.int(sx);
    sy = C.int(sy);
    let mtmp;
    let ptr;
    let atype;

    /* 3.6 tribute */
    if (mkspecl && (!C.strcmp(shp.name, "rare books")
                    || !C.strcmp(shp.name, "second-hand bookstore"))) {
        let novel = C.mksobj_at(C.SPE_NOVEL, sx, sy, 0, 0);

        if (novel)
            C.svc.context.tribute.bookstock = 1;
        return;
    }

    if (C.rn2(100, 470, 1) < C.depth(C.u.uz) && !C.MON_AT(sx, sy)
        && (ptr = C.mkclass(C.S_MIMIC, 0)) != 0
        && (mtmp = C.makemon(ptr, sx, sy, C.NO_MM_FLAGS)) != 0) {
        /* nothing */
    } else {
        atype = get_shop_item(C.shopIndex(shp));
        if (atype == C.VEGETARIAN_CLASS)
            mkveggy_at(sx, sy);
        else if (atype < 0)
            C.mksobj_at(-atype, sx, sy, 1, 1);
        else
            C.mkobj_at(atype, sx, sy, 1);
    }
}

/* extract a shopkeeper name for the given shop type */
export function nameshk(shk, nlp)
{
    let i, trycnt, names_avail;
    let shname = 0;
    let mtmp;
    let name_wanted = C.int(shk.m_id);
    let sptr;

    if (nlp == shklight && C.In_mines(C.u.uz)
        && (sptr = C.Is_special(C.u.uz)) != 0 && sptr.flags.town) {
        /* special-case minetown lighting shk */
        shname = "+Izchak";
        shk.female = 0;
    } else {
        /* We want variation from game to game, without needing the save
           and restore support which would be necessary for randomization;
           try not to make too many assumptions about time_t's internals;
           use ledger_no rather than depth to keep minetown distinct. */
        let nseed = C.int(C.long(C.ubirthday) / 257n);

        name_wanted = C.int(name_wanted + C.ledger_no(C.u.uz) + (nseed % 13) - (nseed % 5));
        if (name_wanted < 0)
            name_wanted = C.int(name_wanted + (13 + 5));
        shk.female = name_wanted & 1;

        for (names_avail = 0; nlp[names_avail]; names_avail++)
            continue;
        C.assert(names_avail > 0, 0);
        name_wanted = name_wanted % names_avail;

        for (trycnt = 0; trycnt < 50; trycnt++) {
            if (nlp == shktools) {
                shname = shktools[C.rn2(names_avail, 519, 2)];
                shk.female = 0; /* reversed below for '_' prefix */
            } else if (name_wanted < names_avail) {
                shname = nlp[name_wanted];
            } else if ((i = C.rn2(names_avail, 523, 2)) != 0) {
                shname = nlp[i - 1];
            } else if (nlp != shkgeneral) {
                nlp = shkgeneral; /* try general names */
                for (names_avail = 0; nlp[names_avail]; names_avail++)
                    continue;
                continue; /* next `trycnt' iteration */
            } else {
                shname = shk.female ? "-Lucrezia" : "+Dirk";
            }
            if (C.loadChar(shname) == '_'.charCodeAt(0) || C.loadChar(shname) == '-'.charCodeAt(0))
                shk.female = 1;
            else if (C.loadChar(shname) == '|'.charCodeAt(0) || C.loadChar(shname) == '+'.charCodeAt(0))
                shk.female = 0;

            /* is name already in use on this level? */
            for (mtmp = C.fmon; mtmp; mtmp = mtmp.nmon) {
                if (C.DEADMONSTER(mtmp) || (mtmp.address == shk.address) || !mtmp.isshk)
                    continue;
                C.assert(C.has_eshk(mtmp), 1);
                if (C.strcmp(C.ESHK(mtmp).shknam, shname))
                    continue;
                name_wanted = names_avail; /* try a random name */
                break;
            }
            if (!mtmp)
                break; /* new name */
        }
    }
    C.strncpy(C.ESHK(shk).shknam, shname, C.PL_NSIZ);
    C.storeChar(C.ESHK(shk).shknam + C.PL_NSIZ - 1, 0);
}

export function neweshk(mtmp)
{
    if (!mtmp.mextra)
        mtmp.mextra = C.newmextra();
    if (!C.ESHK(mtmp))
        mtmp.mextra.eshk = C.eshk(C.alloc(C.eshkSize));
    C.memset(C.ESHK(mtmp), 0, C.eshkSize);
    C.ESHK(mtmp).parentmid = mtmp.m_id;
    C.ESHK(mtmp).bill_p = 0;
}

export function free_eshk(mtmp)
{
    if (mtmp.mextra && C.ESHK(mtmp)) {
        C.free(C.ESHK(mtmp));
        mtmp.mextra.eshk = 0;
    }
    mtmp.isshk = 0;
}

/* find a door in room sroom which is good for shop entrance.
   returns -1 if no good door found, or the svd.doors index
   and the door coordinates in sx, sy */
export function good_shopdoor(sroom, sx, sy)
{
    let i;

    for (i = 0; i < sroom.doorct; i++) {
        let di = sroom.fdoor + i;

        sx.value = C.svd.doors[di].x;
        sy.value = C.svd.doors[di].y;

        /* check that the shopkeeper placement is sane */
        if (sroom.irregular) {
            let rmno = (C.roomIndex(sroom) + C.ROOMOFFSET);

            if (C.isok(sx.value - 1, sy.value) && !C.levl[sx.value - 1][sy.value].edge
                && C.levl[sx.value - 1][sy.value].roomno == rmno)
                (sx.value)--;
            else if (C.isok(sx.value + 1, sy.value) && !C.levl[sx.value + 1][sy.value].edge
                     && C.levl[sx.value + 1][sy.value].roomno == rmno)
                (sx.value)++;
            else if (C.isok(sx.value, sy.value - 1) && !C.levl[sx.value][sy.value - 1].edge
                     && C.levl[sx.value][sy.value - 1].roomno == rmno)
                (sy.value)--;
            else if (C.isok(sx.value, sy.value + 1) && !C.levl[sx.value][sy.value + 1].edge
                     && C.levl[sx.value][sy.value + 1].roomno == rmno)
                (sy.value)++;
            else
                continue;
        } else if (sx.value == sroom.lx - 1) {
            (sx.value)++;
        } else if (sx.value == sroom.hx + 1) {
            (sx.value)--;
        } else if (sy.value == sroom.ly - 1) {
            (sy.value)++;
        } else if (sy.value == sroom.hy + 1) {
            (sy.value)--;
        } else {
            continue;
        }
        return di;
    }
    return -1;
}

/* create a new shopkeeper in the given room */
export function shkinit(shp, sroom)
{
    let sh;
    let sx = C.coordLocal(), sy = C.coordLocal();
    let shk;
    let eshkp;

    /* place the shopkeeper in the given room */
    sh = good_shopdoor(sroom, sx, sy);
    if (sh < 0) {
        /* Said to happen sometimes, but I have never seen it. */
        /* Supposedly fixed by fdoor change in mklev.c */
        if (C.wizard) {
            let j = sroom.doorct;

            C.impossible("Where is shopdoor?");
            C.pline("Room at (%d,%d),(%d,%d).", sroom.lx, sroom.ly, sroom.hx,
                  sroom.hy);
            C.pline("doormax=%d doorct=%d fdoor=%d", C.gd.doorindex, sroom.doorct,
                  sh);
            while (j--) {
                C.pline("door [%d,%d]", C.svd.doors[sh].x, C.svd.doors[sh].y);
                sh++;
            }
            C.display_nhwindow(C.WIN_MESSAGE, 0);
        }
        return -1;
    }

    if (C.MON_AT(sx.value, sy.value))
        C.rloc(C.m_at(sx.value, sy.value), C.RLOC_NOMSG); /* insurance */

    /* now initialize the shopkeeper monster structure */
    if (!(shk = C.makemon(C.mons[C.PM_SHOPKEEPER], sx.value, sy.value, C.MM_ESHK)))
        return -1;
    eshkp = C.ESHK(shk); /* makemon(...,MM_ESHK) allocates this */
    shk.isshk = shk.mpeaceful = 1;
    C.set_malign(shk);
    shk.msleeping = 0;
    C.mon_learns_traps(shk, C.ALL_TRAPS); /* we know all the traps already */
    eshkp.shoproom = C.char(C.roomIndex(sroom) + C.ROOMOFFSET);
    sroom.resident = shk;
    eshkp.shoptype = sroom.rtype;
    C.assign_level(eshkp.shoplevel, C.u.uz);
    eshkp.shd = C.svd.doors[sh];
    eshkp.shk.x = sx.value;
    eshkp.shk.y = sy.value;
    eshkp.robbed = eshkp.credit = eshkp.debit = eshkp.loan = 0n;
    eshkp.following = eshkp.surcharge = eshkp.dismiss_kops = 0;
    eshkp.billct = eshkp.visitct = 0;
    eshkp.bill_p = 0;
    C.HEAPU8[eshkp.customer] = '\0'.charCodeAt(0);
    C.mkmonmoney(shk, 1000n + 30n * C.long(C.rnd(100, 682, 3))); /* initial capital */
    if (shp.shknms == shkrings)
        C.mongets(shk, C.TOUCHSTONE);
    if (shp.shknms == shktools || shp.shknms == shkwands ||
        (shp.shknms == shkrings && C.rn2(2, 686, 3)) ||
        (shp.shknms == shkgeneral && C.rn2(5, 687, 3)))
        C.mongets(shk, C.SCR_CHARGING);
    nameshk(shk, shp.shknms);

    return sh;
}

export function stock_room_goodpos(sroom, rmno, sh, sx, sy)
{
    rmno = C.int(rmno);
    sh = C.int(sh);
    sx = C.int(sx);
    sy = C.int(sy);
    if (sroom.irregular) {
        if (C.levl[sx][sy].edge
            || C.levl[sx][sy].roomno != rmno
            || C.distmin(sx, sy, C.svd.doors[sh].x, C.svd.doors[sh].y) <= 1)
            return 0;
    } else if ((sx == sroom.lx && C.svd.doors[sh].x == sx - 1)
               || (sx == sroom.hx && C.svd.doors[sh].x == sx + 1)
               || (sy == sroom.ly && C.svd.doors[sh].y == sy - 1)
               || (sy == sroom.hy && C.svd.doors[sh].y == sy + 1))
        return 0;

    /* only generate items on solid floor squares */
    if (!C.IS_ROOM(C.levl[sx][sy].typ)) {
        return 0;
    }

    return 1;
}

/* stock a newly-created room with objects */
export function stock_room(shp_indx, sroom)
{
    shp_indx = C.int(shp_indx);
    /*
     * Someday soon we'll dispatch on the shdist field of shclass to do
     * different placements in this routine. Currently it only supports
     * shop-style placement (all squares except a row nearest the first
     * door get objects).
     */
    let sx, sy, sh;
    let stockcount = 0, specialspot = 0;
    let buf = C.stackAlloc(C.BUFSZ);
    let rmno = (C.roomIndex(sroom) + C.ROOMOFFSET);
    let shp = shtypes[shp_indx];

    /* first, try to place a shopkeeper in the room */
    if ((sh = C.callLocal(shkinit, shp, sroom)) < 0)
        return;

    /* make sure no doorways without doors, and no trapped doors, in shops */
    sx = C.svd.doors[sroom.fdoor].x;
    sy = C.svd.doors[sroom.fdoor].y;
    if (C.levl[sx][sy].doormask == C.D_NODOOR) {
        C.levl[sx][sy].doormask = C.D_ISOPEN;
        C.newsym(sx, sy);
    }
    if (C.levl[sx][sy].typ == C.SDOOR) {
        C.cvt_sdoor_to_door(C.levl[sx][sy]); /* .typ = DOOR */
        C.newsym(sx, sy);
    }
    if (C.levl[sx][sy].doormask & C.D_TRAPPED)
        C.levl[sx][sy].doormask = C.D_LOCKED;

    if (C.levl[sx][sy].doormask == C.D_LOCKED) {
        let m = sx, n = sy;

        if (C.inside_shop(sx + 1, sy))
            m--;
        else if (C.inside_shop(sx - 1, sy))
            m++;
        if (C.inside_shop(sx, sy + 1))
            n--;
        else if (C.inside_shop(sx, sy - 1))
            n++;
        C.Sprintf(buf, "Closed for inventory");
        C.make_engr_at(m, n, buf, 0, 0n, C.DUST);
        if (C.levl[m][n].typ != C.CORR && C.levl[m][n].typ != C.ROOM)
            C.levl[m][n].typ = (C.Is_special(C.u.uz)
                              || C.loadChar(C.in_rooms(m, n, 0))) ? C.ROOM : C.CORR;
    }

    if (C.svc.context.tribute.enabled && !C.svc.context.tribute.bookstock) {
        /*
         * Out of the number of spots where we're actually
         * going to put stuff, randomly single out one in particular.
         */
        for (sx = sroom.lx; sx <= sroom.hx; sx++)
            for (sy = sroom.ly; sy <= sroom.hy; sy++)
                if (stock_room_goodpos(sroom, rmno, sh, sx,sy))
                    stockcount++;
        specialspot = C.rnd(stockcount, 777, 4);
        stockcount = 0;
    }

    for (sx = sroom.lx; sx <= sroom.hx; sx++)
        for (sy = sroom.ly; sy <= sroom.hy; sy++)
            if (stock_room_goodpos(sroom, rmno, sh, sx,sy)) {
                stockcount++;
                mkshobj_at(shp, sx, sy,
                           ((stockcount) && (stockcount == specialspot)));
            }

    /*
     * Special monster placements (if any) should go here: that way,
     * monsters will sit on top of objects and not the other way around.
     */

    /* Hack for Orcus's level: it's a ghost town, get rid of shopkeepers */
    if (C.on_level(C.u.uz, C.orcus_level)) {
        let mtmp = C.shop_keeper(rmno);
        C.mongone(mtmp);
    }

    C.svl.level.flags.has_shop = 1;
}

/* does shkp's shop stock this item type? */
export function saleable(shkp, obj)
{
    let i, shp_indx = C.ESHK(shkp).shoptype - C.SHOPBASE;
    let shp = shtypes[shp_indx];

    if (shp.symb == C.RANDOM_CLASS)
        return 1;
    for (i = 0; i < C.iprobCount && shp.iprobs[i].iprob; i++) {
        /* pseudo-class needs special handling */
        if (shp.iprobs[i].itype == C.VEGETARIAN_CLASS) {
            if (veggy_item(obj, 0))
                return 1;
        } else if ((shp.iprobs[i].itype < 0)
                       ? shp.iprobs[i].itype == -obj.otyp
                       : shp.iprobs[i].itype == obj.oclass)
            return 1;
    }
    /* not found */
    return 0;
}

/* positive value: class; negative value: specific object type.
   can also return non-existing object class (eg. VEGETARIAN_CLASS) */
export function get_shop_item(type)
{
    type = C.int(type);
    let shp = shtypes[type];
    let i, j;

    /* select an appropriate object type at random */
    for (j = C.rnd(100, 835, 5), i = 0; (j -= shp.iprobs[i].iprob) > 0; i++)
        continue;

    return shp.iprobs[i].itype;
}

/* version of shkname() for beginning of sentence */
export function Shknam(mtmp)
{
    let nam = shkname(mtmp);

    /* 'nam[]' is almost certainly already capitalized, but be sure */
    C.storeChar(nam, C.highc(C.loadChar(nam)));
    return nam;
}

/* shopkeeper's name, without any visibility constraint; if hallucinating,
   will yield some other shopkeeper's name (not necessarily one residing
   in the current game's dungeon, or who keeps same type of shop) */
export function shkname(mtmp)
{
    let nam;
    let save_isshk = mtmp.isshk;

    mtmp.isshk = 0; /* don't want mon_nam() calling shkname() */
    /* get a modifiable name buffer along with fallback result */
    nam = C.noit_mon_nam(mtmp);
    mtmp.isshk = save_isshk;

    if (!mtmp.isshk) {
        C.impossible("shkname: \"%s\" is not a shopkeeper.", nam);
    } else if (!C.has_eshk(mtmp)) {
        C.panic("shkname: shopkeeper \"%s\" lacks 'eshk' data.", nam);
    } else {
        let shknm = C.ESHK(mtmp).shknam;

        if (C.Hallucination && !C.program_state.gameover) {
            let nlp;
            let num;

            /* count the number of non-unique shop types;
               pick one randomly, ignoring shop generation probabilities;
               pick a name at random from that shop type's list */
            for (num = 0; num < shtypes.length; num++)
                if (shtypes[num].prob == 0)
                    break;
            if (num > 0) {
                nlp = shtypes[C.rn2(num, 884, 6)].shknms;
                for (num = 0; nlp[num]; num++)
                    continue;
                if (num > 0)
                    shknm = C.cString(nlp[C.rn2(num, 888, 6)]);
            }
        }
        /* strip prefix if present */
        if (!C.letter(C.loadChar(shknm)))
            ++shknm;
        C.Strcpy(nam, shknm);
    }
    return nam;
}

export function shkname_is_pname(mtmp)
{
    let shknm = C.ESHK(mtmp).shknam;

    return (C.loadChar(shknm) == '-'.charCodeAt(0) || C.loadChar(shknm) == '+'.charCodeAt(0) || C.loadChar(shknm) == '='.charCodeAt(0));
}

export function is_izchak(shkp, override_hallucination)
{
    override_hallucination = C.boolean(override_hallucination);
    let shknm;

    if (C.Hallucination && !override_hallucination)
        return 0;
    if (!shkp.isshk)
        return 0;
    /* outside of town, Izchak becomes just an ordinary shopkeeper */
    if (!C.in_town(shkp.mx, shkp.my))
        return 0;
    shknm = C.ESHK(shkp).shknam;
    /* skip "+" prefix */
    if (!C.letter(C.loadChar(shknm)))
        ++shknm;
    return !C.strcmp(shknm, "Izchak");
}



/*shknam.c*/
