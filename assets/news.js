// assets/news.js — single source of truth for the contest news feed.
//
// Both the front page and /leaderboard/ render their News section from
// NEWS_ITEMS below. To post news, add ONE entry to the TOP of this list:
//
//   { date: 'YYYY-MM-DD', dateText: 'Month D, YYYY',
//     href: '/my-article/',            // optional: makes the card clickable
//     html: `<strong>Title:</strong> body html...` },
//
// The first entry renders as the featured item; the rest fold into
// "Older news". Do not use backticks or ${ } inside html bodies.

const NEWS_ITEMS = [
    {
        date: '2026-07-16',
        dateText: 'July 16, 2026',
        href: '/hunting-zombies/',
        html: `<strong>Hunting Zombies:</strong>
        a code review of two contest entries finds a zombie that
        vanishes without ever being killed &mdash; what one pony
        fight reveals about testing, hidden state, and large-scale
        AI coding, and the oracle technique lockwo uses to keep its
        port honest.`,
    },
    {
        date: '2026-05-21',
        dateText: 'May 21, 2026',
        href: '/first-mimic/',
        html: `<strong>The First Mimic:</strong>
        a brief report from Berkeley on serteal&rsquo;s near-perfect
        transpilation score, the first in the qualifying round, and
        the unofficial trophy he took home. The contest remains
        wide open.`,
    },
    {
        date: '2026-05-12',
        dateText: 'May 12, 2026',
        html: `<strong>Several teleport-contest bugs fixed</strong>
        thanks to careful reports from
        <a href="https://github.com/xeophon">@xeophon</a>
        (<a href="https://github.com/davidbau/teleport-contest/issues/5">#5</a>)
        and <a href="https://github.com/serteal">@serteal</a>
        (<a href="https://github.com/davidbau/teleport-contest/issues/6">#6</a>):
        the public session corpus is back in sync between contest
        and judge (38 files re-recorded), <code>seed0030</code>'s
        seg-0 character mismatch is fixed, and the scorer now
        requires the cursor to land in the recorded position for a
        screen to count as matched. Pull the latest template and
        re-run <code>bash frozen/score.sh</code> to pick up the
        corrections.`,
    },
    {
        date: '2026-05-09',
        dateText: 'May 9, 2026',
        html: `<strong>Contest updates:</strong> several improvements. Forks
        now declare a category &mdash; <em>agentic</em>,
        <em>transpiled</em>, or <em>other</em> &mdash; by running
        <code>set-category.sh</code> once before it will be scored.
        Animation-frame parity is scored as a supplemental metric,
        supported by a new API. <a href="/play/">/play/&lt;owner&gt;/</a>
        now supports saving, loading, and an in-browser options editor
        at <a href="/nethackrc/">/nethackrc/</a>, and the persistence
        API was simplified to a single <code>opts.storage</code> handle
        so save/restore survives a browser reload. (serteal&rsquo;s
        port hasn&rsquo;t regressed; their sessions just need a small
        migration to fit the new API.) The corpus was re-recorded with
        instrumentation fixes. Phase 2 is clarified as a test of
        maintainability.`,
    },
    {
        date: '2026-05-08',
        dateText: 'May 8, 2026',
        html: `<strong>serteal</strong> has submitted the first transpiled solution &mdash;
        an Emscripten compilation of the C source into a JavaScript emulation of
        the C state machine, including a simulated C heap. Click serteal&rsquo;s
        name to inspect the JavaScript, and <strong>Play</strong> to play the
        working game in the browser. It is not yet a readable JS port, and there
        is still plenty of time to write one! <em>Can you build a port that beats
        the transpiler in Phase 2?</em>`,
    },
];

function newsItemHTML(n) {
    const timeEl = `<time datetime="${n.date}">${n.dateText}</time>`;
    if (n.href) {
        return `<article class="news-item news-item-link">
    <a href="${n.href}" class="news-item-link-wrap">
        ${timeEl}
        <p>${n.html} <span class="news-arrow" aria-hidden="true">&rarr;</span></p>
    </a>
</article>`;
    }
    return `<article class="news-item">
    ${timeEl}
    <p>${n.html}</p>
</article>`;
}

function newsFeedHTML(headingTag) {
    const h = headingTag || 'h3';
    const [first, ...rest] = NEWS_ITEMS;
    return `<${h}>News</${h}>
${newsItemHTML(first)}
<details class="news-older">
    <summary>Older news</summary>
${rest.map(newsItemHTML).join('\n')}
</details>`;
}

if (typeof document !== 'undefined') {
    const mount = document.querySelector('section.news-feed[data-news]');
    if (mount) {
        mount.innerHTML = newsFeedHTML(mount.getAttribute('data-heading') || 'h3');
    }
}
