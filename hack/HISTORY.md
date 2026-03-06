# The History of Hack

> *"This is export hack, my first semester programming project."*
> -- Jay Fenlason, READ_ME, 1982

---

## The Original README

The original `READ_ME` distributed with Hack is reproduced here in full, because
its voice captures the era perfectly -- a teenager sharing his work with the
world, giving his home phone number but warning you about his modem and his
teenage sister. The source text is preserved in
[`hack-c/upstream/READ_ME`](hack-c/upstream/READ_ME) and in the
[GitHub mirror](https://github.com/Sustainable-Games/fenlason-hack) of the
original USENIX distribution:

```
This is export hack, my first semester programming project.
It's just like rogue (Sort of).

To set it up for your system, you will have to do the following:
	1: create a hack uid, to own the top ten list, etc.
	2: create a hack directory "/usr/lib/game/hack" is the default.
	3: make the subdirectory save.
	4: make the directory 700 mode.	/* sav files go in there...*/
	5: create perm (0 length regular file)
	6: modify hack.main.c to use the new directory.
	7: make other changes (like default terminal now vt100)
	7: If you don't have a hack gid (Create one..) remove all
           refrences to getgid()==42 or compile it -UMAGIC to get
           rid of magic mode.
	8: recompile hack.
	9: put it in games after making it set-uid hack.
	10: fix the bugs I undobtedly left in it.
	11: tell me what you think of it.

	Hack uses the UCB file /etc/termcap to get your terminal
escape codes.  If you only have one kind of terminal you can change
the escape codes in hack.pri.c and cm(), then recompile everything
-DVTONL.

If you find any bugs (That you think I don't know about), or have
any awesome new changes (Like a better save (One that works!)), or
have ANY questions, write me
		Jay Fenlason
		29 East St.
		Sudbury Mass.
			01776

or call me at (617) 443-5036.  Since I have both a modem and a
teen-age sister, Good Luck.


Hack is split (roughly) into several source files that do different
things.  I have tried to fit all the procedures having to do with a
certain segment of the game into a single file, but the job is not
the best in the world.  The rough splits are:

hack.c		General random stuff and things I never got around
		to moving.
hack.main.c	main() and other random procedures, also the lock
		file stuff.
hack.mon.c	Monsters, moving, attacking, etc.
hack.do.c	drink, eat, read, wield, save, etc.
hack.do1.c	zap, wear, remove, etc...
hack.pri.c	stuff having to do with the screen, most of the
		terminal independant stuff is in here.
hack.lev.c	temp files and calling of mklev.

Because of the peculiar restraints on our system, I make mklev
(create a level) a separate procedure execd by hack when needed.
The source for mklev is (Naturaly) mklev.c.  You may want to put
mklev back into hack.  Good luck.

Most of hack was written by me, with help from
		Kenny Woodland (KW)	(general random things
			including the original BUZZ())
		Mike Thome	(MT)	(The original chamelian)
	and	Jon Payne	(JP)	(The original lock file
			kludge and the massive CURS())

This entire program would not have been possible without the SFSU
Logo Workshop.  I am eternally grateful to all of our students
(Especially K.L.), without whom I would never have seen Rogue.  I
am especially grateful to Mike Clancy, without whose generous help
I would never have gotten to play ROGUE.

	To make hack fit on a non split I/D machine.  #define SMALL
	and VTONL, modify the escape sequences in hack.pri.c, and
	re-copmile it.  Note that you lose a lot by doing this,
	including the top ten list, save, two wands, and several
	commands.


			Good Luck...
```

---

## The Machine

In 1979, [Brian Harvey](https://en.wikipedia.org/wiki/Brian_Harvey_(lecturer))
was hired as Computer Director at
[Lincoln-Sudbury Regional High School](https://en.wikipedia.org/wiki/Lincoln-Sudbury_Regional_High_School)
(LSRHS) in Sudbury, Massachusetts. The school already had a
[PDP-8](https://en.wikipedia.org/wiki/PDP-8) run by the math department, but
Harvey had a grander vision: he wanted to create an environment "as similar as
possible" to the MIT and Stanford AI labs -- "a powerful computer system, with
lots of software tools, an informal community spirit."
([Harvey, "Case Study: LSRHS"](https://people.eecs.berkeley.edu/~bh/lsrhs.html))

He obtained a **[PDP-11/70](https://en.wikipedia.org/wiki/PDP-11) running
[Version 7 Unix](https://en.wikipedia.org/wiki/Version_7_Unix)**. The cost was
covered 75% by a grant from
[Digital Equipment Corporation](https://en.wikipedia.org/wiki/Digital_Equipment_Corporation)
and 25% by a special school bond issue.
([Harvey, "Case Study: LSRHS"](https://people.eecs.berkeley.edu/~bh/lsrhs.html))
DEC's headquarters was in
[Maynard, Massachusetts](https://en.wikipedia.org/wiki/Maynard,_Massachusetts)
-- just a few miles from Lincoln and Sudbury. DEC's co-founder
[Ken Olsen](https://en.wikipedia.org/wiki/Ken_Olsen) had worked at
[MIT Lincoln Laboratory](https://en.wikipedia.org/wiki/MIT_Lincoln_Laboratory)
before founding DEC in 1957, and lived in Lincoln until his death in 2011.
The proximity made DEC unusually generous with local schools, and Lincoln-Sudbury
was the beneficiary.

The [PDP-11/70](https://gunkies.org/wiki/PDP-11/70) was a serious machine --
one of the most powerful minicomputers of its era, with a 2KB cache and support
for up to 4MB of main memory. Over 600,000 PDP-11s of all models were
manufactured; the PDP-11/70 was the top of the line. Lincoln-Sudbury became a
Unix source licensee and served as an **alpha test site for
[2.9BSD](https://en.wikipedia.org/wiki/History_of_the_Berkeley_Software_Distribution)**,
the PDP-11 version of Berkeley Unix. The installation, testing, and debugging of
2.9BSD was carried out entirely by students.
([Harvey](https://people.eecs.berkeley.edu/~bh/lsrhs.html))

## The Culture

Harvey deliberately built a culture modeled on the
[MIT AI Lab](https://en.wikipedia.org/wiki/MIT_Computer_Science_and_Artificial_Intelligence_Laboratory)
ethos of the era. The Computer Center Users Society, a group of about 50
students and teachers, administered the facility. Members had keys to the
computer room and could use it evenings and weekends without adult supervision.
Courses weren't graded. Students connected remotely via modems from home. The
result was a place where teenagers taught themselves Unix systems programming,
wrote production software, and distributed it to the world.
([Harvey](https://people.eecs.berkeley.edu/~bh/lsrhs.html);
[LS Alumni Association, "Computer Pioneers"](http://www.lincolnsudburyalumni.org/lsrhs/publications/bitsnpieces/computerpioneers.html))

This was extraordinary for 1980. Most American high schools had no computers at
all. Those that did typically had a single terminal connected to a time-sharing
service, or perhaps an [Apple II](https://en.wikipedia.org/wiki/Apple_II) running
BASIC. Lincoln-Sudbury had a multi-user Unix system running the same operating
system used at [Bell Labs](https://en.wikipedia.org/wiki/Bell_Labs) and
UC Berkeley, with students who were alpha-testing the latest BSD release. It was,
by any measure, one of the most advanced high school computing environments in
the country.

## The Era

The early 1980s were a pivotal moment in the history of computing and education.
[Seymour Papert](https://en.wikipedia.org/wiki/Seymour_Papert) at MIT had
co-created the [Logo](https://en.wikipedia.org/wiki/Logo_(programming_language))
programming language in 1967 (with
[Wally Feurzeig](https://en.wikipedia.org/wiki/Wally_Feurzeig) and
[Cynthia Solomon](https://en.wikipedia.org/wiki/Cynthia_Solomon) at
[Bolt, Beranek and Newman](https://en.wikipedia.org/wiki/BBN_Technologies)),
and by the late 1970s Logo was being used to introduce children to programming
through "[turtle graphics](https://en.wikipedia.org/wiki/Turtle_graphics)" --
commanding a cursor (or a physical robot) to draw shapes on screen. Papert's
1980 book
[*Mindstorms: Children, Computers, and Powerful Ideas*](https://en.wikipedia.org/wiki/Mindstorms_(book))
argued that computers could fundamentally transform how children learn. Brian
Harvey was deeply influenced by this movement. He would later write the
three-volume
[*Computer Science Logo Style*](https://people.eecs.berkeley.edu/~bh/logo.html)
(MIT Press), develop
[Berkeley Logo](https://people.eecs.berkeley.edu/~bh/logo.html), and co-create
the [Snap!](https://en.wikipedia.org/wiki/Snap!_(programming_language)) visual
programming language -- a "Scheme disguised as Scratch" -- used in UC Berkeley's
[*Beauty and Joy of Computing*](https://bjc.edc.org/) course.

At the same time, the MIT AI Lab and the broader
[hacker culture](https://en.wikipedia.org/wiki/Hacker_culture) were at their
peak. [Richard Stallman](https://en.wikipedia.org/wiki/Richard_Stallman) was
still at the AI Lab (he would leave MIT in 1984 and found the
[Free Software Foundation](https://en.wikipedia.org/wiki/Free_Software_Foundation)
in 1985). The culture of sharing code, building tools, and treating software as
a communal resource was the water these students swam in. When Jay Fenlason
finished Hack, it was natural to give it away on a
[USENIX](https://en.wikipedia.org/wiki/USENIX) tape -- not because of any
licensing ideology, but because that was simply what you did with software you
wrote.

## The Game

[Jay Fenlason](https://nethackwiki.com/wiki/Jay_Fenlason) was a junior at
Lincoln-Sudbury when he began writing Hack in 1981.
([NetHack Wiki](https://nethackwiki.com/wiki/Jay_Fenlason%27s_Hack))
The inspiration was
**[Rogue](https://en.wikipedia.org/wiki/Rogue_(video_game))**, the
procedurally generated dungeon game created in 1980 by
[Michael Toy](https://en.wikipedia.org/wiki/Michael_Toy) and
[Glenn Wichman](https://en.wikipedia.org/wiki/Glenn_Wichman) at UC Santa Cruz
(later improved by [Ken Arnold](https://en.wikipedia.org/wiki/Ken_Arnold) at
UC Berkeley). Fenlason encountered Rogue through a connection to the SFSU Logo
Workshop -- a San Francisco State University program where Lincoln-Sudbury
students participated. As he wrote in the README: "This entire program would not
have been possible without the SFSU Logo Workshop. I am eternally grateful to
all of our students (Especially K.L.), without whom I would never have seen
Rogue."

Fenlason's account from a
[2000 interview](https://www.linux.com/news/train-life-nethacks-papa/) fills
in the story: after being denied access to Rogue's source code, he decided to
write his own version. The result was Hack -- approximately 6,200 lines of C
across 10 source files, implementing a dungeon-crawling game with 56 monster
types, items, combat, and procedurally generated levels.

Three classmates contributed
([LS Alumni Association](http://www.lincolnsudburyalumni.org/lsrhs/publications/bitsnpieces/computerpioneers.html)):

- **Kenny Woodland** -- "general random things including the original BUZZ()"
  (the wand/beam zapping function)
- **Mike Thome** -- "The original chamelian" (the chameleon monster, which could
  change form)
- **[Jon Payne](https://en.wikipedia.org/wiki/JOVE)** -- "The original lock
  file kludge and the massive CURS()" (the cursor-positioning display routine)

By the first half of 1982, Hack was complete enough to distribute. Brian Harvey
submitted it to USENIX, and it was included on the **USENIX 82-1 software
distribution tape** -- distributed at the Summer 1982 USENIX conference in
Boston.
([Hack 1.0.3 page](https://homepages.cwi.nl/~aeb/games/hack/hack.html);
[Wikipedia](https://en.wikipedia.org/wiki/Hack_(video_game)))
Fenlason described it as "my silly game"
([Linux.com interview](https://www.linux.com/news/train-life-nethacks-papa/)).
It would become the ancestor of one of the most complex and long-lived games
in computing history.

## What Happened Next

### Hack's Descendants

In December 1984,
[Andries Brouwer](https://en.wikipedia.org/wiki/Andries_Brouwer), a Dutch
mathematician at [CWI Amsterdam](https://en.wikipedia.org/wiki/Centrum_Wiskunde_%26_Informatica),
obtained Fenlason's source code, substantially rewrote it, and posted
**[Hack 1.0](https://nethackwiki.com/wiki/Hack_1.0)** to the Usenet newsgroup
`net.sources`.
([Brouwer's Hack page](https://homepages.cwi.nl/~aeb/games/hack/hack.html))
Brouwer's version added player roles, the Amulet of Yendor, a pet system,
shops, and many new mechanics.
([NetHack Wiki](https://nethackwiki.com/wiki/Hack_1.0))
The response was overwhelming. Multiple variant versions proliferated: Don
Kneller's PC HACK for MS-DOS, R. Black's ST Hack for the Atari ST, and others.
([Game history, NetHack Wiki](https://nethackwiki.com/wiki/Game_history))

Mike Stephenson then merged the variants together, incorporating many added
features, and -- collaborating with Izchak Miller and Janet Walz over the
Internet -- published **[NetHack](https://en.wikipedia.org/wiki/NetHack)
version 1.4** on July 28, 1987.
([NetHack Wiki: Game history](https://nethackwiki.com/wiki/Game_history))
They called themselves the
[DevTeam](https://nethackwiki.com/wiki/DevTeam), and the name "NetHack"
reflected their collaboration over the nascent Internet. Nearly four decades
later, NetHack remains under active development, with the 3.7 branch -- the
most ambitious set of gameplay changes in the game's history -- still unreleased
as of early 2026.

### Jay Fenlason

After Lincoln-Sudbury, Fenlason attended UC Berkeley.
([Linux.com](https://www.linux.com/news/train-life-nethacks-papa/))
He went on to work at the
**[Free Software Foundation](https://en.wikipedia.org/wiki/Free_Software_Foundation)**
for five years, where he became a significant contributor to the GNU ecosystem.
He is the original author of the
**[GNU implementation of gprof](https://sourceware.org/binutils/docs/gprof/)**
(the profiler, written in 1988 with
[Richard Stallman](https://en.wikipedia.org/wiki/Richard_Stallman)),
co-authored **[gawk](https://www.gnu.org/software/gawk/)** (with Paul Rubin,
in 1986), drafted the first
**[GNU tar](https://www.gnu.org/software/tar/manual/html_node/Authors.html)**
manual, and served as maintainer of both GNU tar and GNU sed.
He departed the FSF over disagreements about the organization's commitment to
the [Hurd](https://en.wikipedia.org/wiki/GNU_Hurd) kernel project versus
building on BSD.
([Linux.com interview](https://www.linux.com/news/train-life-nethacks-papa/))
As of that 2000 interview, he was working as a software engineer in the
Boston area.

### Jonathan Payne

Jon Payne -- credited in the README for "the massive CURS()" -- went on to write
**[JOVE](https://en.wikipedia.org/wiki/JOVE)** (Jonathan's Own Version of Emacs)
during his senior year at Lincoln-Sudbury, also on the PDP-11.
([Wikipedia](https://en.wikipedia.org/wiki/JOVE);
[GitHub](https://github.com/jonmacs/jove))
JOVE was a fast, small Emacs clone that was distributed with several releases
of BSD Unix
([2.9BSD](https://en.wikipedia.org/wiki/History_of_the_Berkeley_Software_Distribution),
4.3BSD-Reno, 4.4BSD-Lite2) and brought Payne recognition from around the world
while still a teenager.

After Lincoln-Sudbury, Payne worked at
[Bolt, Beranek and Newman](https://en.wikipedia.org/wiki/BBN_Technologies),
then the University of Rochester, and then
**[Sun Microsystems](https://en.wikipedia.org/wiki/Sun_Microsystems)**, where
in 1992 he joined the secret
**["Green" project](https://en.wikipedia.org/wiki/Java_(programming_language)#History)**
-- the team led by [James Gosling](https://en.wikipedia.org/wiki/James_Gosling)
that produced the
**[Java programming language](https://en.wikipedia.org/wiki/Java_(programming_language))**.
([LS Alumni Association](http://www.lincolnsudburyalumni.org/lsrhs/publications/bitsnpieces/computerpioneers.html))
In 1996, he co-founded
**[Marimba](https://en.wikipedia.org/wiki/Marimba_(software))**, one of the
first Internet-based software management companies, with former Sun colleagues
[Arthur van Hoff](https://en.wikipedia.org/wiki/Arthur_van_Hoff),
[Sami Shaio](https://en.wikipedia.org/wiki/Sami_Shaio), and
[Kim Polese](https://en.wikipedia.org/wiki/Kim_Polese). Marimba grew to 300+
employees and went public in 1999.
([Wikipedia](https://en.wikipedia.org/wiki/Arthur_van_Hoff))
He later worked at [TiVo](https://en.wikipedia.org/wiki/TiVo) and
[Flipboard](https://en.wikipedia.org/wiki/Flipboard).
From a high school game's cursor routine to the Java programming language: not
a bad trajectory.

### Brian Harvey

Harvey left Lincoln-Sudbury in the early 1980s to pursue his PhD at UC Berkeley,
where he stayed for the rest of his career as a Teaching Professor in the
[EECS department](https://www2.eecs.berkeley.edu/Faculty/Homepages/harvey.html).
He wrote
[*Computer Science Logo Style*](https://people.eecs.berkeley.edu/~bh/logo.html)
(MIT Press, three volumes), developed
**[Berkeley Logo](https://people.eecs.berkeley.edu/~bh/logo.html)**, and
co-created the
**[Snap!](https://en.wikipedia.org/wiki/Snap!_(programming_language))** visual
programming language with
[Jens Moenig](https://github.com/jmoenig/Snap).
He co-developed
**[The Beauty and Joy of Computing](https://bjc.edc.org/)**, a widely adopted
CS breadth course. In 2025, ACM recognized him as a
[Person of ACM](https://www.acm.org/articles/people-of-acm/2025/brian-harvey)
for his contributions to computing education. His proudest achievement, he has
said, remains the computer center he built at Lincoln-Sudbury -- "where courses
weren't graded and kids had keys to the room."
([Harvey](https://people.eecs.berkeley.edu/~bh/lsrhs.html))

### Kenny Woodland and Mike Thome

Less is known about the subsequent careers of Kenny Woodland and Mike Thome.
Their contributions to Hack -- the beam-zapping code and the chameleon monster --
are preserved in the [source code](https://github.com/Sustainable-Games/fenlason-hack)
and in Fenlason's README acknowledgment. If you know more about their stories,
the dungeon would welcome an update.

---

## Sources

### Primary Sources

- Jay Fenlason, `READ_ME`, Hack source distribution (USENIX 82-1 tape, 1982) --
  preserved in [`hack-c/upstream/READ_ME`](hack-c/upstream/READ_ME)
- Brian Harvey,
  ["Case Study: LSRHS"](https://people.eecs.berkeley.edu/~bh/lsrhs.html) --
  Harvey's own account of the Lincoln-Sudbury computer center
- ["On the Train of Life with NetHack's Papa"](https://www.linux.com/news/train-life-nethacks-papa/),
  Linux.com, 2000 -- the only known published interview with Jay Fenlason
- Lincoln-Sudbury Alumni Association,
  ["Computer Pioneers of Lincoln-Sudbury"](http://www.lincolnsudburyalumni.org/lsrhs/publications/bitsnpieces/computerpioneers.html) --
  alumni retrospective naming Fenlason, Payne, and Harvey
- [Andries Brouwer, Hack 1.0.3 page](https://homepages.cwi.nl/~aeb/games/hack/hack.html) --
  Brouwer's own account of obtaining and rewriting Hack

### Source Code

- [Sustainable-Games/fenlason-hack](https://github.com/Sustainable-Games/fenlason-hack) --
  GitHub mirror of the original USENIX 82-1 tape source
- [Critlist/protoHack](https://github.com/Critlist/protoHack) --
  restoration of Fenlason's Hack to run on modern Linux
- [Hack v1.03 on Internet Archive](https://archive.org/details/HACK103) --
  Andries Brouwer's expanded version

### Wiki and Encyclopedia Articles

- [NetHack Wiki: Jay Fenlason](https://nethackwiki.com/wiki/Jay_Fenlason)
- [NetHack Wiki: Jay Fenlason's Hack](https://nethackwiki.com/wiki/Jay_Fenlason%27s_Hack)
- [NetHack Wiki: Hack 1.0](https://nethackwiki.com/wiki/Hack_1.0)
- [NetHack Wiki: Game history](https://nethackwiki.com/wiki/Game_history)
- [NetHack Wiki: Andries Brouwer](https://nethackwiki.com/wiki/Andries_Brouwer)
- [Wikipedia: Hack (video game)](https://en.wikipedia.org/wiki/Hack_(video_game))
- [Wikipedia: NetHack](https://en.wikipedia.org/wiki/NetHack)
- [Wikipedia: Rogue (video game)](https://en.wikipedia.org/wiki/Rogue_(video_game))
- [Wikipedia: JOVE](https://en.wikipedia.org/wiki/JOVE)
- [Wikipedia: Brian Harvey (lecturer)](https://en.wikipedia.org/wiki/Brian_Harvey_(lecturer))
- [Wikipedia: Andries Brouwer](https://en.wikipedia.org/wiki/Andries_Brouwer)
- [Wikipedia: Digital Equipment Corporation](https://en.wikipedia.org/wiki/Digital_Equipment_Corporation)
- [Wikipedia: Ken Olsen](https://en.wikipedia.org/wiki/Ken_Olsen)
- [Wikipedia: Logo (programming language)](https://en.wikipedia.org/wiki/Logo_(programming_language))
- [Wikipedia: Mindstorms (book)](https://en.wikipedia.org/wiki/Mindstorms_(book))
- [Wikipedia: Snap! (programming language)](https://en.wikipedia.org/wiki/Snap!_(programming_language))
- [Wikipedia: Java (programming language)](https://en.wikipedia.org/wiki/Java_(programming_language))
- [Wikipedia: Arthur van Hoff](https://en.wikipedia.org/wiki/Arthur_van_Hoff)

### Biographical and Career Sources

- [ACM People of ACM: Brian Harvey](https://www.acm.org/articles/people-of-acm/2025/brian-harvey) (2025)
- [Brian Harvey, UC Berkeley EECS](https://www2.eecs.berkeley.edu/Faculty/Homepages/harvey.html)
- [Brian Harvey home page](https://people.eecs.berkeley.edu/~bh/)
- [JOVE on GitHub](https://github.com/jonmacs/jove) -- Jonathan Payne's editor, maintained since 1983
- [GNU gprof manual](https://sourceware.org/binutils/docs/gprof/) -- credits Jay Fenlason
- [GNU tar Authors](https://www.gnu.org/software/tar/manual/html_node/Authors.html) -- credits Jay Fenlason
- [GNU Awk (gawk)](https://www.gnu.org/software/gawk/) -- co-authored by Paul Rubin and Jay Fenlason
- [Jay Fenlason on GitHub](https://github.com/dajt)
- [Jonathan Payne on Keybase](https://keybase.io/jpayne)

### Historical Context

- [Computer History Museum: PDP-11/70](https://www.computerhistory.org/collections/catalog/102670832)
- [Computer History Museum: Ken Olsen](https://computerhistory.org/profile/ken-olsen/)
- [Logo Foundation: Logo History](https://el.media.mit.edu/logo-foundation/what_is_logo/history.html)
- [History of the Berkeley Software Distribution](https://en.wikipedia.org/wiki/History_of_the_Berkeley_Software_Distribution)
- [NetHack license history](https://www.nethack.org/download/LICENSE_HISTORY.html)
- [IEEE-USA: "Going Rogue: A Brief History of the Computerized Dungeon Crawl"](https://insight.ieeeusa.org/articles/going-rogue-a-brief-history-of-the-computerized-dungeon-crawl/)
- [Hack on RogueBasin](https://www.roguebasin.com/index.php/Hack)
- [The CRPG Addict: Game 186: Hack (1984)](http://crpgaddict.blogspot.com/2015/04/game-186-hack-1984.html) --
  detailed play-through and historical analysis
