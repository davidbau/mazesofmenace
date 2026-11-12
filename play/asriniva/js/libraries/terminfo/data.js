/*
 * Copyright 2018-2023,2024 Thomas E. Dickey
 * Copyright 1998-2017,2018 Free Software Foundation, Inc.
 * 
 * Permission is hereby granted, free of charge, to any person obtaining a
 * copy of this software and associated documentation files (the
 * "Software"), to deal in the Software without restriction, including
 * without limitation the rights to use, copy, modify, merge, publish,
 * distribute, distribute with modifications, sublicense, and/or sell
 * copies of the Software, and to permit persons to whom the Software is
 * furnished to do so, subject to the following conditions:
 * 
 * The above copyright notice and this permission notice shall be included
 * in all copies or substantial portions of the Software.
 * 
 * THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS
 * OR IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF
 * MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT.
 * IN NO EVENT SHALL THE ABOVE COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM,
 * DAMAGES OR OTHER LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR
 * OTHERWISE, ARISING FROM, OUT OF OR IN CONNECTION WITH THE SOFTWARE OR
 * THE USE OR OTHER DEALINGS IN THE SOFTWARE.
 * 
 * Except as contained in this notice, the name(s) of the above copyright
 * holders shall not be used in advertising or otherwise to promote the
 * sale, use or other dealings in this Software without prior written
 * authorization.
 */

/**
 * Capability index/code tables: ncurses 6.5 include/Caps (standard and legacy).
 * Embedded database: nethack-c/wasm/terminfo/x/xterm-256color, copied verbatim
 * from macOS 26.6.2 /usr/share/terminfo/78/xterm-256color. Database provenance
 * and license caveat: the historical originating database version is unknown;
 * the neighboring LICENSE.ncurses preserves the ncurses distribution notice.
 * No decoded escape sequence or recorded game output is substituted here.
 */
export const PINNED_ENTRY_SHA256 = 'e2525d133091a1ac38b2ad4eecd8df48eee31789c8fafac0ed99bcd6b746d8ce';
export const PINNED_ENTRY_PROVENANCE = 'macOS 26.6.2 (25G83), /usr/share/terminfo/78/xterm-256color; native infocmp ncurses 6.0.20150808';

export const BOOLEAN_CODES = Object.freeze(["bw","am","xb","xs","xn","eo","gn","hc","km","hs","in","da","db","mi","ms","os","es","xt","hz","ul","xo","nx","5i","HC","NR","NP","ND","cc","ut","hl","YA","YB","YC","YD","YE","YF","YG","bs","ns","nc","MT","NL","pt","xr"]);
export const NUMBER_CODES = Object.freeze(["co","it","li","lm","sg","pb","vt","ws","Nl","lh","lw","ma","MW","Co","pa","NC","Ya","Yb","Yc","Yd","Ye","Yf","Yg","Yh","Yi","Yj","Yk","Yl","Ym","Yn","BT","Yo","Yp","ug","dC","dN","dB","dT","kn"]);
export const STRING_CODES = Object.freeze(["bt","bl","cr","cs","ct","cl","ce","cd","ch","CC","cm","do","ho","vi","le","CM","ve","nd","ll","up","vs","dc","dl","ds","hd","as","mb","md","ti","dm","mh","im","mk","mp","mr","so","us","ec","ae","me","te","ed","ei","se","ue","vb","ff","fs","i1","is","i3","if","ic","al","ip","kb","ka","kC","kt","kD","kL","kd","kM","kE","kS","k0","k1","k;","k2","k3","k4","k5","k6","k7","k8","k9","kh","kI","kA","kl","kH","kN","kP","kr","kF","kR","kT","ku","ke","ks","l0","l1","la","l2","l3","l4","l5","l6","l7","l8","l9","mo","mm","nw","pc","DC","DL","DO","IC","SF","AL","LE","RI","SR","UP","pk","pl","px","ps","pf","po","rp","r1","r2","r3","rf","rc","cv","sc","sf","sr","sa","st","wi","ta","ts","uc","hu","iP","K1","K3","K2","K4","K5","pO","rP","ac","pn","kB","SX","RX","SA","RA","XN","XF","eA","LO","LF","@1","@2","@3","@4","@5","@6","@7","@8","@9","@0","%1","%2","%3","%4","%5","%6","%7","%8","%9","%0","&1","&2","&3","&4","&5","&6","&7","&8","&9","&0","*1","*2","*3","*4","*5","*6","*7","*8","*9","*0","#1","#2","#3","#4","%a","%b","%c","%d","%e","%f","%g","%h","%i","%j","!1","!2","!3","RF","F1","F2","F3","F4","F5","F6","F7","F8","F9","FA","FB","FC","FD","FE","FF","FG","FH","FI","FJ","FK","FL","FM","FN","FO","FP","FQ","FR","FS","FT","FU","FV","FW","FX","FY","FZ","Fa","Fb","Fc","Fd","Fe","Ff","Fg","Fh","Fi","Fj","Fk","Fl","Fm","Fn","Fo","Fp","Fq","Fr","cb","MC","ML","MR","Lf","SC","DK","RC","CW","WG","HU","DI","QD","TO","PU","fh","PA","WA","u0","u1","u2","u3","u4","u5","u6","u7","u8","u9","op","oc","Ic","Ip","sp","Sf","Sb","ZA","ZB","ZC","ZD","ZE","ZF","ZG","ZH","ZI","ZJ","ZK","ZL","ZM","ZN","ZO","ZP","ZQ","ZR","ZS","ZT","ZU","ZV","ZW","ZX","ZY","ZZ","Za","Zb","Zc","Zd","Ze","Zf","Zg","Zh","Zi","Zj","Zk","Zl","Zm","Zn","Zo","Zp","Zq","Zr","Zs","Zt","Zu","Zv","Zw","Zx","Zy","Km","Mi","RQ","Gm","AF","AB","xl","dv","ci","s0","s1","s2","s3","ML","MT","Xy","Zz","Yv","Yw","Yx","Yy","Yz","YZ","S1","S2","S3","S4","S5","S6","S7","S8","Xh","Xl","Xo","Xr","Xt","Xv","sA","YI","i2","rs","nl","bc","ko","ma","G2","G3","G1","G4","GR","GL","GU","GD","GH","GV","GC","ml","mu","bx"]);

// Hex is decoded without Node Buffer or browser-specific base64 helpers.
const ENTRY_HEX =
  "1a01250026000f009d01c405787465726d2d323536636f6c6f727c787465726d20776974682032353620636f6c6f727300000100000100000001000000000101" +
  "000000000000000100000100010100000000000000000100500008001800ffffffffffffffffffffffffffffffffffffffff0001ff7f00000400060008001900" +
  "1e0026002a002e00ffff39004a004c0050005700ffff59006600ffff6a006e0078007c00ffffffff8000840089008e00ffff97009c00a100ffffa600ab00b000" +
  "b500be00c200c900ffffd200d700dd00e300fffffffffffff500ffffffffffff0701ffff0b01ffffffffffff0d01ffff1201ffffffffffffffff16011a012001" +
  "240128012c01320138013e0144014a014e01ffff5301ffff57015c01610165016c01ffff730177017f01ffffffffffffffffffffffffffffffffffffffffffff" +
  "87019001ffffffff9901a201ab01b401bd01c601cf01d801e101ea01fffffffffffff301f701fc01ffff01020402ffffffff160219022402270229022c028902" +
  "ffff8c02ffffffffffffffffffffffff8e02ffffffffffffffff9202ffffc702ffffffffcb02d102ffffffffffffffffffffffffffffffffffffffffffffd702" +
  "db02ffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffdf02ffffffffe602ffffffff" +
  "ffffffffed02f402fb02ffffffff0203ffff0903ffffffffffff1003ffffffffffffffffffff17031d0323032a03310338033f0347034f0357035f0367036f03" +
  "77037f0386038d0394039b03a303ab03b303bb03c303cb03d303db03e203e903f003f703ff0307040f0417041f0427042f0437043e0445044c0453045b046304" +
  "6b0473047b0483048b0493049a04a104a804ffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffff" +
  "ad04b804bd04c504c904ffffd204ffffffffffffffffffffffffffffffffffffffffffff3005ffffffffffffffffffffffffffffffffffff3505ffffffffffff" +
  "ffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffff3b05ffff" +
  "ffffffff3f057e05ffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffff" +
  "ffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffbe05c1051b5b5a0007000d001b5b256925703125" +
  "643b257032256472001b5b3367001b5b481b5b324a001b5b4b001b5b4a001b5b2569257031256447001b5b256925703125643b257032256448000a001b5b4800" +
  "1b5b3f32356c0008001b5b3f31326c1b5b3f323568001b5b43001b5b41001b5b3f31323b323568001b5b50001b5b4d001b2830001b5b356d001b5b316d001b5b" +
  "3f3130343968001b5b326d001b5b3468001b5b386d001b5b376d001b5b376d001b5b346d001b5b257031256458001b2842001b28421b5b6d001b5b3f31303439" +
  "6c001b5b346c001b5b32376d001b5b32346d001b5b3f3568243c3130302f3e1b5b3f356c001b5b21701b5b3f333b346c1b5b346c1b3e001b5b4c0008001b5b33" +
  "7e001b4f42001b4f50001b5b32317e001b4f51001b4f52001b4f53001b5b31357e001b5b31377e001b5b31387e001b5b31397e001b5b32307e001b4f48001b5b" +
  "327e001b4f44001b5b367e001b5b357e001b4f43001b5b313b3242001b5b313b3241001b4f41001b5b3f316c1b3e001b5b3f31681b3d001b5b3f313033346c00" +
  "1b5b3f3130333468001b5b257031256450001b5b25703125644d001b5b257031256442001b5b257031256440001b5b257031256453001b5b25703125644c001b" +
  "5b257031256444001b5b257031256443001b5b257031256454001b5b257031256441001b5b69001b5b3469001b5b3569001b63001b5b21701b5b3f333b346c1b" +
  "5b346c1b3e001b38001b5b2569257031256464001b37000a001b4d00253f25703925741b283025651b2842253b1b5b30253f25703625743b31253b253f257035" +
  "25743b32253b253f25703225743b34253b253f257031257033257c25743b37253b253f25703425743b35253b253f25703725743b38253b6d001b480009001b4f" +
  "4500606061616666676769696a6a6b6b6c6c6d6d6e6e6f6f70707171727273737474757576767777787879797a7a7b7b7c7c7d7d7e7e001b5b5a001b5b3f3768" +
  "001b5b3f376c001b4f46001b4f4d001b5b333b327e001b5b313b3246001b5b313b3248001b5b323b327e001b5b313b3244001b5b363b327e001b5b353b327e00" +
  "1b5b313b3243001b5b32337e001b5b32347e001b5b313b3250001b5b313b3251001b5b313b3252001b5b313b3253001b5b31353b327e001b5b31373b327e001b" +
  "5b31383b327e001b5b31393b327e001b5b32303b327e001b5b32313b327e001b5b32333b327e001b5b32343b327e001b5b313b3550001b5b313b3551001b5b31" +
  "3b3552001b5b313b3553001b5b31353b357e001b5b31373b357e001b5b31383b357e001b5b31393b357e001b5b32303b357e001b5b32313b357e001b5b32333b" +
  "357e001b5b32343b357e001b5b313b3650001b5b313b3651001b5b313b3652001b5b313b3653001b5b31353b367e001b5b31373b367e001b5b31383b367e001b" +
  "5b31393b367e001b5b32303b367e001b5b32313b367e001b5b32333b367e001b5b32343b367e001b5b313b3350001b5b313b3351001b5b313b3352001b5b313b" +
  "3353001b5b31353b337e001b5b31373b337e001b5b31383b337e001b5b31393b337e001b5b32303b337e001b5b32313b337e001b5b32333b337e001b5b32343b" +
  "337e001b5b313b3450001b5b313b3451001b5b313b3452001b5b314b001b5b256925643b256452001b5b366e001b5b3f313b3263001b5b63001b5b33393b3439" +
  "6d001b5d343b25703125643b7267623a257032257b3235357d252a257b313030307d252f25322e32582f257033257b3235357d252a257b313030307d252f2532" +
  "2e32582f257034257b3235357d252a257b313030307d252f25322e32581b5c001b5b336d001b5b32336d001b5b4d001b5b253f257031257b387d253c25743325" +
  "703125642565257031257b31367d253c257439257031257b387d252d2564256533383b353b2570312564253b6d001b5b253f257031257b387d253c2574342570" +
  "3125642565257031257b31367d253c25743130257031257b387d252d2564256534383b353b2570312564253b6d001b6c001b6d000300010040008400fa020100" +
  "0100ffff00000700ffff13001800ffff2a0030003a00410048004f0056005d0064006b0072007900800087008e0095009c00a300aa00b100b800bf00c600cd00" +
  "d400db00e200e900f000f700fe0005010c0113011a01210128012f0136013d0144014b0152015901600167016e0175017c0183018a01910198019f01ffffffff" +
  "ffffffff00000300060009000c000f001200150018001b001e002100240029002e00330038003d00410046004b00500055005a00600066006c00720078007e00" +
  "84008a00900096009b00a000a500aa00af00b500bb00c100c700cd00d300d900df00e500eb00f100f700fd00030109010f0115011b01210127012b0130013501" +
  "3a013f01440148014c0150011b5d31313207001b5d31323b257031257307001b5b334a001b5d35323b25703125733b257032257307001b5b322071001b5b2570" +
  "3125642071001b5b333b337e001b5b333b347e001b5b333b357e001b5b333b367e001b5b333b377e001b5b313b3242001b5b313b3342001b5b313b3442001b5b" +
  "313b3542001b5b313b3642001b5b313b3742001b5b313b3346001b5b313b3446001b5b313b3546001b5b313b3646001b5b313b3746001b5b313b3348001b5b31" +
  "3b3448001b5b313b3548001b5b313b3648001b5b313b3748001b5b323b337e001b5b323b347e001b5b323b357e001b5b323b367e001b5b323b377e001b5b313b" +
  "3344001b5b313b3444001b5b313b3544001b5b313b3644001b5b313b3744001b5b363b337e001b5b363b347e001b5b363b357e001b5b363b367e001b5b363b37" +
  "7e001b5b353b337e001b5b353b347e001b5b353b357e001b5b353b367e001b5b353b377e001b5b313b3343001b5b313b3443001b5b313b3543001b5b313b3643" +
  "001b5b313b3743001b5b313b3241001b5b313b3341001b5b313b3441001b5b313b3541001b5b313b3641001b5b313b3741004158004730005854005538004372" +
  "004373004530004533004d73005330005365005373006b444333006b444334006b444335006b444336006b444337006b444e006b444e33006b444e34006b444e" +
  "35006b444e36006b444e37006b454e4433006b454e4434006b454e4435006b454e4436006b454e4437006b484f4d33006b484f4d34006b484f4d35006b484f4d" +
  "36006b484f4d37006b494333006b494334006b494335006b494336006b494337006b4c465433006b4c465434006b4c465435006b4c465436006b4c465437006b" +
  "4e585433006b4e585434006b4e585435006b4e585436006b4e585437006b50525633006b50525634006b50525635006b50525636006b50525637006b52495433" +
  "006b52495434006b52495435006b52495436006b52495437006b5550006b555033006b555034006b555035006b555036006b555037006b6132006b6231006b62" +
  "33006b633200";

export function pinnedXterm256color() {
  const bytes = new Uint8Array(ENTRY_HEX.length / 2);
  for (let i = 0; i < bytes.length; i++) bytes[i] = Number.parseInt(ENTRY_HEX.slice(i * 2, i * 2 + 2), 16);
  return bytes;
}
