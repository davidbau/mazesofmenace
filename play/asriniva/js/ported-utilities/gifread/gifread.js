import {C} from '../../ported/c-runtime.js';

export const std_args = ["tilemap", "monsters.gif", "monsters.txt", "objects.gif", "objects.txt", "other.gif", "other.txt"];

export function GetDataBlock(fd, buf)
{
    const count = C.cell("Uint8");
    if (Number(!((Number(C.fread(count.address, C.cast("BigUint64", 1), C.cast("BigUint64", 1), fd) != C.cast("BigUint64", 0))))))
        {
            C.fprintf((C.stderr), C.literal("error in getting DataBlock size\n"), C.va());
            return (-1);
        }
    (C.ZeroDataBlock = C.cast("Int32", (Number(C.cast("Int32", count.value) == 0))));
    if (Number(!!((Number(C.cast("Int32", count.value) != 0))) && !!((Number(!((Number(C.fread(buf, C.cast("BigUint64", C.cast("Int32", count.value)), C.cast("BigUint64", 1), fd) != C.cast("BigUint64", 0)))))))))
        {
            C.fprintf((C.stderr), C.literal("error in reading DataBlock\n"), C.va());
            return (-1);
        }
    return C.cast("Int32", count.value);
}

export function DoExtension(fd, label)
{
    const buf = C.staticBuffer("DoExtension.buf", (1 * 256));
    let str;
    switch (label)
    {
        case (1):
            /* Plain Text Extension */
            (str = C.literal("Plain Text Extension"));
        break;
        case (255):
            /* Application Extension */
            (str = C.literal("Application Extension"));
        break;
        case (254):
            /* Comment Extension */
            (str = C.literal("Comment Extension"));
        while (Number(C.callLocal(GetDataBlock , fd, buf) != 0))
            {
                C.fprintf((C.stderr), C.literal("gif comment: %s\n"), C.va(["Pointer", buf]));
            }
        return;
        case (249):
            /* Graphic Control Extension */
            (str = C.literal("Graphic Control Extension"));
        C.callLocal(GetDataBlock , fd, buf);
        (C.Gif89.disposal = C.cast("Int32", (((C.cast("Int32", C.load("Int8", (buf + Number(0) * 1))) >> 2)) & 7)));
        (C.Gif89.inputFlag = C.cast("Int32", (((C.cast("Int32", C.load("Int8", (buf + Number(0) * 1))) >> 1)) & 1)));
        (C.Gif89.delayTime = C.cast("Int32", ((((C.cast("Int32", (C.load("Int8", (buf + Number(2) * 1)))) << 8)) | C.cast("Int32", (C.load("Int8", (buf + Number(1) * 1))))))));
        if (Number(((C.cast("Int32", C.load("Int8", (buf + Number(0) * 1))) & 1)) != 0))
            (C.Gif89.transparent = C.cast("Int32", C.cast("Int32", C.load("Int8", (buf + Number(3) * 1)))));
        while (Number(C.callLocal(GetDataBlock , fd, buf) != 0))
            ;
        return;
        default:
            (str = buf);
        C.sprintf(buf, C.literal("UNKNOWN (0x%02x)"), C.va(["Int32", label]));
        break;
    }
    C.fprintf((C.stderr), C.literal("got a '%s' extension\n"), C.va(["Pointer", str]));
    while (Number(C.callLocal(GetDataBlock , fd, buf) != 0))
        ;
}

export function ReadColorMap(fd, number)
{
    let i;
    const rgb = C.stackAlloc((1 * 3));
    for ((i = C.cast("Int32", 0)); Number(i < number); (++i))
        {
            if (Number(!((Number(C.fread(rgb, C.cast("BigUint64", C.cast("Int32", BigInt((1 * 3)))), C.cast("BigUint64", 1), fd) != C.cast("BigUint64", 0))))))
                {
                    return ((C.cast("Int8", 0)));
                }
            C.store("Uint8", ((C.ColorMap + Number(0) * (1 * 256)) + Number(i) * 1), C.cast("Uint8", C.load("Uint8", (rgb + Number(0) * 1))));
            C.store("Uint8", ((C.ColorMap + Number(1) * (1 * 256)) + Number(i) * 1), C.cast("Uint8", C.load("Uint8", (rgb + Number(1) * 1))));
            C.store("Uint8", ((C.ColorMap + Number(2) * (1 * 256)) + Number(i) * 1), C.cast("Uint8", C.load("Uint8", (rgb + Number(2) * 1))));
        }
    (C.colorsinmap = C.cast("Int32", number));
    return (C.cast("Int8", 1));
}

export function read_header(fd)
{
    const buf = C.stackAlloc((1 * 16));
    const c = C.cell("Uint8");
    const version = C.stackAlloc((1 * 4));
    if (Number(!((Number(C.fread(buf, C.cast("BigUint64", 6), C.cast("BigUint64", 1), fd) != C.cast("BigUint64", 0))))))
        {
            C.fprintf((C.stderr), C.literal("error reading magic number\n"), C.va());
            C.exit(1);
        }
    if (Number(C.strncmp(buf, C.literal("GIF"), C.cast("BigUint64", 3)) != 0))
        {
            C.fprintf((C.stderr), C.literal("not a GIF file\n"), C.va());
            C.exit(1);
        }
    C.strncpy(version, (buf + Number(3) * 1), C.cast("BigUint64", 3));
    C.store("Int8", (version + Number(3) * 1), C.cast("Int8", C.cast("Int8", 0)));
    if (Number(!!((Number(C.strcmp(version, C.literal("87a")) != 0))) && !!((Number(C.strcmp(version, C.literal("89a")) != 0)))))
        {
            C.fprintf((C.stderr), C.literal("bad version number, not '87a' or '89a'\n"), C.va());
            C.exit(1);
        }
    if (Number(!((Number(C.fread(buf, C.cast("BigUint64", 7), C.cast("BigUint64", 1), fd) != C.cast("BigUint64", 0))))))
        {
            C.fprintf((C.stderr), C.literal("failed to read screen descriptor\n"), C.va());
            C.exit(1);
        }
    (C.GifScreen.Width = C.cast("Int32", ((((C.cast("Int32", (C.load("Uint8", (buf + Number(1) * 1)))) << 8)) | C.cast("Int32", (C.load("Uint8", (buf + Number(0) * 1))))))));
    (C.GifScreen.Height = C.cast("Int32", ((((C.cast("Int32", (C.load("Uint8", (buf + Number(3) * 1)))) << 8)) | C.cast("Int32", (C.load("Uint8", (buf + Number(2) * 1))))))));
    (C.GifScreen.Colors = C.cast("Int32", (2 << ((C.cast("Int32", C.load("Uint8", (buf + Number(4) * 1))) & 7)))));
    (C.GifScreen.ColorResolution = C.cast("Int32", ((((((C.cast("Int32", C.load("Uint8", (buf + Number(4) * 1))) & 112)) >> 3)) + 1))));
    (C.GifScreen.Background = C.cast("Int32", C.cast("Int32", C.load("Uint8", (buf + Number(5) * 1)))));
    (C.GifScreen.AspectRatio = C.cast("Int32", C.cast("Int32", C.load("Uint8", (buf + Number(6) * 1)))));
    if ((Number(((C.cast("Int32", (C.load("Uint8", (buf + Number(4) * 1)))) & (128))) == (128))))
        {
            /* Global Colormap */
            if (Number(!(C.callLocal(ReadColorMap , fd, C.GifScreen.Colors))))
                {
                    C.fprintf((C.stderr), C.literal("error reading global colormap\n"), C.va());
                    C.exit(1);
                }
        }
    if (Number(!!(Number(C.GifScreen.AspectRatio != 0)) && !!(Number(C.GifScreen.AspectRatio != 49))))
        {
            C.fprintf((C.stderr), C.literal("warning - non-square pixels\n"), C.va());
        }
    for (; ; )
        {
            if (Number(!((Number(C.fread(c.address, C.cast("BigUint64", 1), C.cast("BigUint64", 1), fd) != C.cast("BigUint64", 0))))))
                {
                    C.fprintf((C.stderr), C.literal("EOF / read error on image data\n"), C.va());
                    C.exit(1);
                }
            if (Number(C.cast("Int32", c.value) == 59))
                {
                    /* GIF terminator */
                    return;
                }
            if (Number(C.cast("Int32", c.value) == 33))
                {
                    /* Extension */
                    if (Number(!((Number(C.fread(c.address, C.cast("BigUint64", 1), C.cast("BigUint64", 1), fd) != C.cast("BigUint64", 0))))))
                        {
                            C.fprintf((C.stderr), C.literal("EOF / read error on extension function code\n"), C.va());
                            C.exit(1);
                        }
                    C.callLocal(DoExtension , fd, C.cast("Int32", c.value));
                    continue;
                }
            if (Number(C.cast("Int32", c.value) != 44))
                {
                    /* Not a valid start character */
                    C.fprintf((C.stderr), C.literal("bogus character 0x%02x, ignoring\n"), C.va(["Int32", C.cast("Int32", c.value)]));
                    continue;
                }
            if (Number(!((Number(C.fread(buf, C.cast("BigUint64", 9), C.cast("BigUint64", 1), fd) != C.cast("BigUint64", 0))))))
                {
                    C.fprintf((C.stderr), C.literal("couldn't read left/top/width/height\n"), C.va());
                    C.exit(1);
                }
            if ((Number(((C.cast("Int32", (C.load("Uint8", (buf + Number(8) * 1)))) & (128))) == (128))))
                {
                    /* replace global color map with local */
                    (C.GifScreen.Colors = C.cast("Int32", (1 << ((((C.cast("Int32", C.load("Uint8", (buf + Number(8) * 1))) & 7)) + 1)))));
                    if (Number(!(C.callLocal(ReadColorMap , fd, C.GifScreen.Colors))))
                        {
                            C.fprintf((C.stderr), C.literal("error reading local colormap\n"), C.va());
                            C.exit(1);
                        }
                }
            if (Number(C.GifScreen.Width != ((((C.cast("Int32", (C.load("Uint8", (buf + Number(5) * 1)))) << 8)) | C.cast("Int32", (C.load("Uint8", (buf + Number(4) * 1))))))))
                {
                    C.fprintf((C.stderr), C.literal("warning: widths don't match\n"), C.va());
                    (C.GifScreen.Width = C.cast("Int32", ((((C.cast("Int32", (C.load("Uint8", (buf + Number(5) * 1)))) << 8)) | C.cast("Int32", (C.load("Uint8", (buf + Number(4) * 1))))))));
                }
            if (Number(C.GifScreen.Height != ((((C.cast("Int32", (C.load("Uint8", (buf + Number(7) * 1)))) << 8)) | C.cast("Int32", (C.load("Uint8", (buf + Number(6) * 1))))))))
                {
                    C.fprintf((C.stderr), C.literal("warning: heights don't match\n"), C.va());
                    (C.GifScreen.Height = C.cast("Int32", ((((C.cast("Int32", (C.load("Uint8", (buf + Number(7) * 1)))) << 8)) | C.cast("Int32", (C.load("Uint8", (buf + Number(6) * 1))))))));
                }
            (C.GifScreen.Interlace = C.cast("Int32", (Number(((C.cast("Int32", (C.load("Uint8", (buf + Number(8) * 1)))) & (64))) == (64)))));
            return;
        }
}

export function GetCode(fd, code_size, flag)
{
    const buf = C.staticBuffer("GetCode.buf", (1 * 280));
    const curbit = C.staticCell("GetCode.curbit", "Int32");
    const lastbit = C.staticCell("GetCode.lastbit", "Int32");
    const done = C.staticCell("GetCode.done", "Int32");
    const last_byte = C.staticCell("GetCode.last_byte", "Int32");
    let i;
    let j;
    let ret;
    let count;
    if (flag)
        {
            (curbit.value = C.cast("Int32", 0));
            (lastbit.value = C.cast("Int32", 0));
            (done.value = C.cast("Int32", C.cast("Int32", (C.cast("Int8", 0)))));
            return 0;
        }
    if (Number(((curbit.value + code_size)) >= lastbit.value))
        {
            if (done.value)
                {
                    if (Number(curbit.value >= lastbit.value))
                        C.fprintf((C.stderr), C.literal("ran off the end of my bits\n"), C.va());
                    return (-1);
                }
            C.store("Uint8", (buf + Number(0) * 1), C.cast("Uint8", C.load("Uint8", (buf + Number((last_byte.value - 2)) * 1))));
            C.store("Uint8", (buf + Number(1) * 1), C.cast("Uint8", C.load("Uint8", (buf + Number((last_byte.value - 1)) * 1))));
            if (Number(C.cast("Int32", ((count = C.cast("Uint8", C.cast("Uint8", C.callLocal(GetDataBlock , fd, (buf + Number(2) * 1))))))) == 0))
                (done.value = C.cast("Int32", C.cast("Int32", (C.cast("Int8", 1)))));
            (last_byte.value = C.cast("Int32", (2 + C.cast("Int32", count))));
            (curbit.value = C.cast("Int32", (((curbit.value - lastbit.value)) + 16)));
            (lastbit.value = C.cast("Int32", (((2 + C.cast("Int32", count))) * 8)));
        }
    (ret = C.cast("Int32", 0));
    for (((i = C.cast("Int32", curbit.value)) , (j = C.cast("Int32", 0))); Number(j < code_size); ((++i) , (++j)))
        (ret = C.cast("Int32", (ret | ((Number(((C.cast("Int32", C.load("Uint8", (buf + Number(Math.trunc((i / 8))) * 1))) & ((1 << ((i % 8)))))) != 0)) << j))));
    (curbit.value = C.cast("Int32", (curbit.value + code_size)));
    return ret;
}

export function LWZReadByte(fd, flag)
/*, int input_code_size)*/
{
    const fresh = C.staticCell("LWZReadByte.fresh", "Int32", C.cast("Int32", (C.cast("Int8", 0))));
    let code;
    let incode;
    const code_size = C.staticCell("LWZReadByte.code_size", "Int32");
    const set_code_size = C.staticCell("LWZReadByte.set_code_size", "Int32");
    const max_code = C.staticCell("LWZReadByte.max_code", "Int32");
    const max_code_size = C.staticCell("LWZReadByte.max_code_size", "Int32");
    const firstcode = C.staticCell("LWZReadByte.firstcode", "Int32");
    const oldcode = C.staticCell("LWZReadByte.oldcode", "Int32");
    const clear_code = C.staticCell("LWZReadByte.clear_code", "Int32");
    const end_code = C.staticCell("LWZReadByte.end_code", "Int32");
    const table = C.staticBuffer("LWZReadByte.table", ((4 * 2) * 4096));
    const stack = C.staticBuffer("LWZReadByte.stack", (4 * 8192));
    const sp = C.staticCell("LWZReadByte.sp", "Pointer");
    let i;
    if (flag)
        {
            (set_code_size.value = C.cast("Int32", C.cast("Int32", C.input_code_size.value)));
            (code_size.value = C.cast("Int32", (set_code_size.value + 1)));
            (clear_code.value = C.cast("Int32", (1 << set_code_size.value)));
            (end_code.value = C.cast("Int32", (clear_code.value + 1)));
            (max_code_size.value = C.cast("Int32", (2 * clear_code.value)));
            (max_code.value = C.cast("Int32", (clear_code.value + 2)));
            C.callLocal(GetCode , fd, 0, C.cast("Int32", (C.cast("Int8", 1))));
            (fresh.value = C.cast("Int32", C.cast("Int32", (C.cast("Int8", 1)))));
            for ((i = C.cast("Int32", 0)); Number(i < clear_code.value); (++i))
                {
                    C.store("Int32", ((table + Number(0) * (4 * 4096)) + Number(i) * 4), C.cast("Int32", 0));
                    C.store("Int32", ((table + Number(1) * (4 * 4096)) + Number(i) * 4), C.cast("Int32", i));
                }
            for (; Number(i < ((1 << 12))); (++i))
                C.store("Int32", ((table + Number(0) * (4 * 4096)) + Number(i) * 4), C.cast("Int32", C.store("Int32", ((table + Number(1) * (4 * 4096)) + Number(0) * 4), C.cast("Int32", 0))));
            (sp.value = stack);
            return 0;
        }
    else
        if (fresh.value)
            {
                (fresh.value = C.cast("Int32", C.cast("Int32", (C.cast("Int8", 0)))));
                do
                    {
                        (firstcode.value = C.cast("Int32", (oldcode.value = C.cast("Int32", C.callLocal(GetCode , fd, code_size.value, C.cast("Int32", (C.cast("Int8", 0))))))));
                    }
                while (Number(firstcode.value == clear_code.value));
                return firstcode.value;
            }
    if (Number(sp.value > stack))
        return C.load("Int32", (sp.value -= 4));
    while (Number(((code = C.cast("Int32", C.callLocal(GetCode , fd, code_size.value, C.cast("Int32", (C.cast("Int8", 0))))))) >= 0))
        {
            if (Number(code == clear_code.value))
                {
                    for ((i = C.cast("Int32", 0)); Number(i < clear_code.value); (++i))
                        {
                            C.store("Int32", ((table + Number(0) * (4 * 4096)) + Number(i) * 4), C.cast("Int32", 0));
                            C.store("Int32", ((table + Number(1) * (4 * 4096)) + Number(i) * 4), C.cast("Int32", i));
                        }
                    for (; Number(i < ((1 << 12))); (++i))
                        C.store("Int32", ((table + Number(0) * (4 * 4096)) + Number(i) * 4), C.cast("Int32", C.store("Int32", ((table + Number(1) * (4 * 4096)) + Number(i) * 4), C.cast("Int32", 0))));
                    (code_size.value = C.cast("Int32", (set_code_size.value + 1)));
                    (max_code_size.value = C.cast("Int32", (2 * clear_code.value)));
                    (max_code.value = C.cast("Int32", (clear_code.value + 2)));
                    (sp.value = stack);
                    (firstcode.value = C.cast("Int32", (oldcode.value = C.cast("Int32", C.callLocal(GetCode , fd, code_size.value, C.cast("Int32", (C.cast("Int8", 0))))))));
                    return firstcode.value;
                }
            else
                if (Number(code == end_code.value))
                    {
                        let count;
                        const buf = C.stackAlloc((1 * 260));
                        if (C.ZeroDataBlock)
                            return (-2);
                        while (Number(((count = C.cast("Int32", C.callLocal(GetDataBlock , fd, buf)))) > 0))
                            ;
                        if (Number(count != 0))
                            C.fprintf((C.stderr), C.literal("missing EOD in data stream (common occurrence)\n"), C.va());
                        return (-2);
                    }
            (incode = C.cast("Int32", code));
            if (Number(code >= max_code.value))
                {
                    C.store("Int32", ((sp.value += 4) - 4), C.cast("Int32", firstcode.value));
                    (code = C.cast("Int32", oldcode.value));
                }
            while (Number(code >= clear_code.value))
                {
                    C.store("Int32", ((sp.value += 4) - 4), C.cast("Int32", C.load("Int32", ((table + Number(1) * (4 * 4096)) + Number(code) * 4))));
                    if (Number(code == C.load("Int32", ((table + Number(0) * (4 * 4096)) + Number(code) * 4))))
                        {
                            C.fprintf((C.stderr), C.literal("circular table entry BIG ERROR\n"), C.va());
                            C.exit(1);
                        }
                    (code = C.cast("Int32", C.load("Int32", ((table + Number(0) * (4 * 4096)) + Number(code) * 4))));
                }
            C.store("Int32", ((sp.value += 4) - 4), C.cast("Int32", (firstcode.value = C.cast("Int32", C.load("Int32", ((table + Number(1) * (4 * 4096)) + Number(code) * 4))))));
            if (Number(((code = C.cast("Int32", max_code.value))) < ((1 << 12))))
                {
                    C.store("Int32", ((table + Number(0) * (4 * 4096)) + Number(code) * 4), C.cast("Int32", oldcode.value));
                    C.store("Int32", ((table + Number(1) * (4 * 4096)) + Number(code) * 4), C.cast("Int32", firstcode.value));
                    (++max_code.value);
                    if (Number(!!((Number(max_code.value >= max_code_size.value))) && !!((Number(max_code_size.value < ((1 << 12)))))))
                        {
                            (max_code_size.value = C.cast("Int32", (max_code_size.value * 2)));
                            (++code_size.value);
                        }
                }
            (oldcode.value = C.cast("Int32", incode));
            if (Number(sp.value > stack))
                return C.load("Int32", (sp.value -= 4));
        }
    return code;
}

export function ReadInterleavedImage(fd, len, height)
{
    let v;
    let xpos = C.cast("Int32", 0);
    let ypos = C.cast("Int32", 0);
    let pass = C.cast("Int32", 0);
    fini: while (Number(((v = C.cast("Int32", C.callLocal(LWZReadByte , fd, C.cast("Int32", (C.cast("Int8", 0))))))) >= 0))
        /*, (int) input_code_size*/
        {
            do
                {
                    (C.record(((C.load("Pointer", (C.image + Number(ypos) * 8)) + Number(xpos) * C.sizes["struct pixel_s"])), "struct pixel_s").r = C.cast("Uint8", (C.load("Uint8", ((C.ColorMap + Number(0) * (1 * 256)) + Number(v) * 1)))));
                    (C.record(((C.load("Pointer", (C.image + Number(ypos) * 8)) + Number(xpos) * C.sizes["struct pixel_s"])), "struct pixel_s").g = C.cast("Uint8", (C.load("Uint8", ((C.ColorMap + Number(1) * (1 * 256)) + Number(v) * 1)))));
                    (C.record(((C.load("Pointer", (C.image + Number(ypos) * 8)) + Number(xpos) * C.sizes["struct pixel_s"])), "struct pixel_s").b = C.cast("Uint8", (C.load("Uint8", ((C.ColorMap + Number(2) * (1 * 256)) + Number(v) * 1)))));
                }
            while (0);
            (++xpos);
            if (Number(xpos == len))
                {
                    (xpos = C.cast("Int32", 0));
                    switch (pass)
                    {
                        case (0):
                            case (1):
                                (ypos = C.cast("Int32", (ypos + 8)));
                        break;
                        case (2):
                            (ypos = C.cast("Int32", (ypos + 4)));
                        break;
                        case (3):
                            (ypos = C.cast("Int32", (ypos + 2)));
                        break;
                    }
                    if (Number(ypos >= height))
                        {
                            (++pass);
                            switch (pass)
                            {
                                case (1):
                                    (ypos = C.cast("Int32", 4));
                                break;
                                case (2):
                                    (ypos = C.cast("Int32", 2));
                                break;
                                case (3):
                                    (ypos = C.cast("Int32", 1));
                                break;
                                default:
                                    break fini;
                            }
                        }
                }
            if (Number(ypos >= height))
                break;
        }
    if (Number(C.callLocal(LWZReadByte , fd, C.cast("Int32", (C.cast("Int8", 0)))) >= 0))
        /*, (int) input_code_size*/
        C.fprintf((C.stderr), C.literal("too much input data, ignoring extra...\n"), C.va());
}

export function ReadTileStrip(fd, len)
{
    let v;
    let xpos = C.cast("Int32", 0);
    let ypos = C.cast("Int32", 0);
    while (Number(((v = C.cast("Int32", C.callLocal(LWZReadByte , fd, C.cast("Int32", (C.cast("Int8", 0))))))) >= 0))
        /*, (int) input_code_size*/
        {
            do
                {
                    (C.record(((C.load("Pointer", (C.image + Number(ypos) * 8)) + Number(xpos) * C.sizes["struct pixel_s"])), "struct pixel_s").r = C.cast("Uint8", (C.load("Uint8", ((C.ColorMap + Number(0) * (1 * 256)) + Number(v) * 1)))));
                    (C.record(((C.load("Pointer", (C.image + Number(ypos) * 8)) + Number(xpos) * C.sizes["struct pixel_s"])), "struct pixel_s").g = C.cast("Uint8", (C.load("Uint8", ((C.ColorMap + Number(1) * (1 * 256)) + Number(v) * 1)))));
                    (C.record(((C.load("Pointer", (C.image + Number(ypos) * 8)) + Number(xpos) * C.sizes["struct pixel_s"])), "struct pixel_s").b = C.cast("Uint8", (C.load("Uint8", ((C.ColorMap + Number(2) * (1 * 256)) + Number(v) * 1)))));
                }
            while (0);
            (++xpos);
            if (Number(xpos == len))
                {
                    (xpos = C.cast("Int32", 0));
                    (++ypos);
                }
            if (Number(ypos >= 16))
                break;
        }
}

export function fopen_gif_file(filename, type)
{
    let i;
    if (C.strcmp(type, C.literal("r")))
        {
            C.fprintf((C.stderr), C.literal("using reading routine for non-reading?\n"), C.va());
            return (C.cast("Int8", 0));
        }
    (C.gif_file = C.fopen(filename, type));
    if (Number(C.gif_file == 0))
        {
            C.fprintf((C.stderr), C.literal("cannot open gif file %s\n"), C.va(["Pointer", filename]));
            return (C.cast("Int8", 0));
        }
    C.callLocal(read_header , C.gif_file);
    if ((C.GifScreen.Width % 16))
        {
            C.fprintf((C.stderr), C.literal("error: width %d not divisible by %d\n"), C.va(["Int32", C.GifScreen.Width], ["Int32", 16]));
            C.exit(1);
        }
    (C.tiles_across = C.cast("Int32", Math.trunc((C.GifScreen.Width / 16))));
    (C.curr_tiles_across = C.cast("Int32", 0));
    if ((C.GifScreen.Height % 16))
        {
            C.fprintf((C.stderr), C.literal("error: height %d not divisible by %d\n"), C.va(["Int32", C.GifScreen.Height], ["Int32", 16]));
            /* exit(EXIT_FAILURE) */
            ;
        }
    (C.tiles_down = C.cast("Int32", Math.trunc((C.GifScreen.Height / 16))));
    (C.curr_tiles_down = C.cast("Int32", 0));
    if (C.GifScreen.Interlace)
        {
            /* sigh -- hope this doesn't happen on micros */
            (C.image = C.alloc(C.cast("Uint32", (C.cast("BigUint64", C.GifScreen.Height) * BigInt(8)))));
            for ((i = C.cast("Int32", 0)); Number(i < C.GifScreen.Height); (i++))
                {
                    C.store("Pointer", (C.image + Number(i) * 8), C.alloc(C.cast("Uint32", (C.cast("BigUint64", C.GifScreen.Width) * BigInt(C.sizes["struct pixel_s"])))));
                }
        }
    else
        {
            (C.image = C.alloc(C.cast("Uint32", (C.cast("BigUint64", 16) * BigInt(8)))));
            for ((i = C.cast("Int32", 0)); Number(i < 16); (i++))
                {
                    C.store("Pointer", (C.image + Number(i) * 8), C.alloc(C.cast("Uint32", (C.cast("BigUint64", C.GifScreen.Width) * BigInt(C.sizes["struct pixel_s"])))));
                }
        }
    /*
    **  Initialize the Compression routines
    */
    if (Number(!((Number(C.fread(C.input_code_size.address, C.cast("BigUint64", 1), C.cast("BigUint64", 1), C.gif_file) != C.cast("BigUint64", 0))))))
        {
            C.fprintf((C.stderr), C.literal("EOF / read error on image data\n"), C.va());
            C.exit(1);
        }
    if (Number(C.callLocal(LWZReadByte , C.gif_file, C.cast("Int32", (C.cast("Int8", 1)))) < 0))
        /*, (int) input_code_size*/
        {
            C.fprintf((C.stderr), C.literal("error reading image\n"), C.va());
            C.exit(1);
        }
    /* read first section */
    if (C.GifScreen.Interlace)
        {
            C.callLocal(ReadInterleavedImage , C.gif_file, C.GifScreen.Width, C.GifScreen.Height);
        }
    else
        {
            C.callLocal(ReadTileStrip , C.gif_file, C.GifScreen.Width);
        }
    return (C.cast("Int8", 1));
}

export function read_gif_tile(pixels)
{
    let i;
    let j;
    if (Number(C.curr_tiles_down >= C.tiles_down))
        return (C.cast("Int8", 0));
    if (Number(C.curr_tiles_across == C.tiles_across))
        {
            (C.curr_tiles_across = C.cast("Int32", 0));
            (C.curr_tiles_down++);
            if (Number(C.curr_tiles_down >= C.tiles_down))
                return (C.cast("Int8", 0));
            if (Number(!(C.GifScreen.Interlace)))
                C.callLocal(ReadTileStrip , C.gif_file, C.GifScreen.Width);
        }
    if (C.GifScreen.Interlace)
        {
            for ((j = C.cast("Int32", 0)); Number(j < 16); (j++))
                {
                    for ((i = C.cast("Int32", 0)); Number(i < 16); (i++))
                        {
                            C.copy(((pixels + Number(j) * (C.sizes["struct pixel_s"] * 16)) + Number(i) * C.sizes["struct pixel_s"]), (C.load("Pointer", (C.image + Number(((C.curr_tiles_down * 16) + j)) * 8)) + Number(((C.curr_tiles_across * 16) + i)) * C.sizes["struct pixel_s"]), C.sizes["struct pixel_s"]);
                        }
                }
        }
    else
        {
            for ((j = C.cast("Int32", 0)); Number(j < 16); (j++))
                {
                    for ((i = C.cast("Int32", 0)); Number(i < 16); (i++))
                        {
                            C.copy(((pixels + Number(j) * (C.sizes["struct pixel_s"] * 16)) + Number(i) * C.sizes["struct pixel_s"]), (C.load("Pointer", (C.image + Number(j) * 8)) + Number(((C.curr_tiles_across * 16) + i)) * C.sizes["struct pixel_s"]), C.sizes["struct pixel_s"]);
                        }
                }
        }
    (C.curr_tiles_across++);
    /* check for "filler" tile */
    for ((j = C.cast("Int32", 0)); Number(j < 16); (j++))
        {
            for ((i = C.cast("Int32", 0)); Number(!!(Number(i < 16)) && !!(Number(i < 4))); (i = C.cast("Int32", (i + 2))))
                {
                    if (Number(!!(Number(!!(Number(!!(Number(!!(Number(!!(Number(C.cast("Int32", C.record(((pixels + Number(j) * (C.sizes["struct pixel_s"] * 16)) + Number(i) * C.sizes["struct pixel_s"]), "struct pixel_s").r) != C.cast("Int32", C.load("Uint8", ((C.ColorMap + Number(0) * (1 * 256)) + Number(0) * 1))))) || !!(Number(C.cast("Int32", C.record(((pixels + Number(j) * (C.sizes["struct pixel_s"] * 16)) + Number(i) * C.sizes["struct pixel_s"]), "struct pixel_s").g) != C.cast("Int32", C.load("Uint8", ((C.ColorMap + Number(1) * (1 * 256)) + Number(0) * 1))))))) || !!(Number(C.cast("Int32", C.record(((pixels + Number(j) * (C.sizes["struct pixel_s"] * 16)) + Number(i) * C.sizes["struct pixel_s"]), "struct pixel_s").b) != C.cast("Int32", C.load("Uint8", ((C.ColorMap + Number(2) * (1 * 256)) + Number(0) * 1))))))) || !!(Number(C.cast("Int32", C.record(((pixels + Number(j) * (C.sizes["struct pixel_s"] * 16)) + Number((i + 1)) * C.sizes["struct pixel_s"]), "struct pixel_s").r) != C.cast("Int32", C.load("Uint8", ((C.ColorMap + Number(0) * (1 * 256)) + Number(1) * 1))))))) || !!(Number(C.cast("Int32", C.record(((pixels + Number(j) * (C.sizes["struct pixel_s"] * 16)) + Number((i + 1)) * C.sizes["struct pixel_s"]), "struct pixel_s").g) != C.cast("Int32", C.load("Uint8", ((C.ColorMap + Number(1) * (1 * 256)) + Number(1) * 1))))))) || !!(Number(C.cast("Int32", C.record(((pixels + Number(j) * (C.sizes["struct pixel_s"] * 16)) + Number((i + 1)) * C.sizes["struct pixel_s"]), "struct pixel_s").b) != C.cast("Int32", C.load("Uint8", ((C.ColorMap + Number(2) * (1 * 256)) + Number(1) * 1)))))))
                        return (C.cast("Int8", 1));
                }
        }
    return (C.cast("Int8", 0));
}

export function fclose_gif_file()
{
    let i;
    if (C.GifScreen.Interlace)
        {
            for ((i = C.cast("Int32", 0)); Number(i < C.GifScreen.Height); (i++))
                {
                    C.free(C.load("Pointer", (C.image + Number(i) * 8)));
                }
            C.free(C.image);
        }
    else
        {
            for ((i = C.cast("Int32", 0)); Number(i < 16); (i++))
                {
                    C.free(C.load("Pointer", (C.image + Number(i) * 8)));
                }
            C.free(C.image);
        }
    return (C.fclose(C.gif_file));
}

export function main(argc, argv)
{
    const pixels = C.stackAlloc(((C.sizes["struct pixel_s"] * 16) * 16));
    if (Number(argc == 1))
        {
            (argc = C.cast("Int32", C.cast("Int32", ((BigInt((8 * 7)) / BigInt(8))))));
            (argv = C.std_args);
        }
    else
        if (Number(argc != 3))
            {
                C.fprintf((C.stderr), C.literal("usage: gif2txt giffile txtfile\n"), C.va());
                C.exit(1);
            }
    while (Number(argc > 1))
        {
            if (Number(!(C.callLocal(fopen_gif_file , C.load("Pointer", (argv + Number(1) * 8)), C.literal("r")))))
                C.exit(1);
            C.init_colormap();
            if (Number(!(C.fopen_text_file(C.load("Pointer", (argv + Number(2) * 8)), C.literal("w+")))))
                {
                    C.callLocal(fclose_gif_file);
                    C.exit(1);
                }
            while (C.callLocal(read_gif_tile , pixels))
                C.write_text_tile(pixels);
            C.callLocal(fclose_gif_file);
            C.fclose_text_file();
            (argc = C.cast("Int32", (argc - 2)));
            (argv = (argv + Number(2) * 8));
        }
    C.exit(0);
    /*NOTREACHED*/
    return 0;
}

/* GIF reading routines based on those in pbmplus:ppm/giftoppm.c, bearing
 * following copyright notice:
 */
/* +-------------------------------------------------------------------+ */
/* | Copyright 1990, David Koblas.                                     | */
/* |   Permission to use, copy, modify, and distribute this software   | */
/* |   and its documentation for any purpose and without fee is hereby | */
/* |   granted, provided that the above copyright notice appear in all | */
/* |   copies and that both that copyright notice and this permission  | */
/* |   notice appear in supporting documentation.  This software is    | */
/* |   provided "as is" without express or implied warranty.           | */
/* +-------------------------------------------------------------------+ */
/*
 * $NHDT-Date: 1432512803 2015/05/25 00:13:23 $  $NHDT-Branch: master $:$NHDT-Revision: 1.5 $
 */
/*, int input_code_size);*/
/* These should be in gif.h, but there isn't one. */
/*
 * Read gif header, including colormaps.  We expect only one image per
 * file, so if that image has a local colormap, overwrite the global one.
 */
/* Read a tile.  Returns FALSE when there are no more tiles */
/* dummy argv[0] */
