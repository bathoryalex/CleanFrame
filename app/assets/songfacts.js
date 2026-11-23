/* Song facts for Now playing: the year a song came out and, when English Wikipedia has an article about
   that exact song, one short sentence from it, preferably about how the song came about. ES5 only.

   Nothing is made up. A fact is only shown when the article's title is the song's title and its
   introduction names the artist and calls it a song, single or track; otherwise only the year is shown.
   The year comes from Wikidata's publication date for that article's item when there is one, otherwise
   from the album Spotify reports (left out for compilations, whose year is not the song's).
   Text is from Wikipedia (CC BY-SA) and is labelled as such on screen. */
(function () {
  'use strict';
  var P = window.FramePKCE;
  if (!P) return;
  var WIKI = 'https://en.wikipedia.org/w/api.php', WIKIDATA = 'https://www.wikidata.org/w/api.php';
  var cache = {};

  function fold(s) {
    s = String(s || '').toLowerCase();
    try { s = s.normalize('NFD').replace(/[̀-ͯ]/g, ''); } catch (e) { /* older engines: keep accents */ }
    return s.replace(/&/g, ' and ').replace(/[^a-z0-9]+/g, ' ').replace(/^\s+|\s+$/g, '');
  }
  /* "Song - Remastered 2011", "Song (feat. X)", "Song - Live at Wembley" → "Song". */
  function cleanTitle(t) {
    t = String(t || '');
    t = t.replace(/\s+-\s+.*$/, '');
    t = t.replace(/\s*[\(\[][^\)\]]*\b(feat|ft|with|remaster|remastered|live|edit|version|mix|remix|mono|stereo|acoustic|demo|bonus|deluxe|single|radio)\b[^\)\]]*[\)\]]/gi, '');
    return t.replace(/^\s+|\s+$/g, '');
  }
  /* A search result is the song's own article only when all of this holds. */
  function matches(page, title, artist) {
    if (!page || !page.title || (page.pageprops && page.pageprops.disambiguation !== undefined)) return false;
    var m = /^(.*?)\s*\(([^)]*)\)\s*$/.exec(page.title), base = m ? m[1] : page.title, paren = m ? m[2] : '';
    if (paren && !/\b(song|single)\b/i.test(paren)) return false;
    if (fold(base) !== fold(title)) return false;
    var intro = fold(page.extract || ''), who = fold(artist);
    return !!who && (' ' + intro + ' ').indexOf(' ' + who + ' ') >= 0 && /\b(song|single|track|ballad|anthem)\b/.test(intro);
  }

  /* Sentences, without splitting at "Mr." or initials. */
  function sentences(text) {
    var parts = String(text || '').replace(/\s+/g, ' ').match(/[^.!?]+(?:[.!?]+["”’)]?|$)/g) || [], out = [], cur = '', i, p;
    for (i = 0; i < parts.length; i++) {
      p = parts[i];
      cur += p;
      if (/(?:\b(?:Mr|Mrs|Ms|Dr|St|Jr|Sr|No|vs|Vol|Inc|Ltd|Co)|\b[A-Z])\.$/.test(cur.replace(/\s+$/, ''))) continue;
      cur = cur.replace(/^\s+|\s+$/g, '');
      if (cur) out.push(cur);
      cur = '';
    }
    cur = cur.replace(/^\s+|\s+$/g, '');
    if (cur) out.push(cur);
    return out;
  }
  var GOOD = /\b(background|writing|written|composition|recording|inspiration|origins?|conception|history|development|production|lyrics|meaning|music and lyrics)\b/i;
  var SKIP = /\b(charts?|track listings?|personnel|credits|certifications?|references|external links|see also|notes|release history|music video|live performances?|cover versions?|accolades|formats)\b/i;
  var STORY = /\b(inspir\w*|wrote|written|writing|idea|came up|came to|originally|based on|dedicated|named after|tribute|dream\w*|shower|in (?:about |just )?(?:\d+|ten|twenty|thirty|fifteen|five) minutes|demo|recorded in|story|about (?:his|her|their)|after (?:his|her|their))\b/i;
  function tidy(s) { return s.replace(/\s*\([^)]*\b(?:listen|pronounced|IPA)\b[^)]*\)/g, '').replace(/\s+([,.;:])/g, '$1').replace(/\s{2,}/g, ' '); }
  function usable(s) { return s.length >= 40 && s.length <= 240 && !/\{|\}|\|/.test(s); }
  /* From the article's plain text with "== Heading ==" lines: one sentence on how the song came about. */
  function pick(full) {
    var lines = String(full || '').split('\n'), sections = [{ head: '', text: '' }], i, m, j, s, list, k;
    for (i = 0; i < lines.length; i++) {
      m = /^(={2,})\s*(.*?)\s*\1\s*$/.exec(lines[i]);
      if (m) sections.push({ head: m[2], text: '' }); else sections[sections.length - 1].text += lines[i] + '\n';
    }
    var good = sections.filter(function (x) { return x.head && GOOD.test(x.head) && !SKIP.test(x.head); });
    /* 1. a story sentence from Background / Writing / Recording …; 2. a story sentence in the introduction
       (not its first, which only says what the song is); 3. the first sentence of such a section. */
    for (j = 0; j < good.length; j++) {
      list = sentences(good[j].text);
      for (k = 0; k < list.length; k++) { s = tidy(list[k]); if (usable(s) && STORY.test(s)) return s; }
    }
    list = sentences(sections[0].text);
    for (k = 1; k < list.length; k++) { s = tidy(list[k]); if (usable(s) && STORY.test(s)) return s; }
    for (j = 0; j < good.length; j++) {
      list = sentences(good[j].text);
      if (list.length) { s = tidy(list[0]); if (usable(s)) return s; }
    }
    return '';
  }
  function earliestYear(claims) {
    var best = 0;
    ((claims && claims.P577) || []).forEach(function (c) {
      var t = c && c.mainsnak && c.mainsnak.datavalue && c.mainsnak.datavalue.value && c.mainsnak.datavalue.value.time, y = /^\+(\d{4})-/.exec(t || '');
      if (y && (!best || +y[1] < best)) best = +y[1];
    });
    return best;
  }
  function q(params) { var out = [], k; for (k in params) if (params.hasOwnProperty(k)) out.push(encodeURIComponent(k) + '=' + encodeURIComponent(params[k])); return out.join('&'); }

  /* lookup({ id, title, artist }, done) → done({ year, text, url }) with year 0 / text '' when unknown. */
  function lookup(track, done) {
    var key = track.id || (track.title + '|' + track.artist), title = cleanTitle(track.title), hit = cache[key];
    if (hit) { if (hit.info) done(hit.info); else hit.waiting.push(done); return; }
    hit = cache[key] = { info: null, waiting: [done] };
    function finish(info) { hit.info = info; var w = hit.waiting; hit.waiting = []; w.forEach(function (f) { f(info); }); }
    if (!title || !track.artist) { finish({ year: 0, text: '', url: '' }); return; }
    P.request({ url: WIKI + '?' + q({ action: 'query', format: 'json', origin: '*', generator: 'search', gsrsearch: title + ' ' + track.artist + ' song', gsrlimit: 6,
      prop: 'extracts|pageprops', exintro: 1, explaintext: 1, exlimit: 6, ppprop: 'wikibase_item|disambiguation' }), timeout: 12000 }, function (r) {
      var pages = r.json && r.json.query && r.json.query.pages, list = [], k, page = null;
      for (k in pages || {}) if (pages.hasOwnProperty(k)) list.push(pages[k]);
      list.sort(function (a, b) { return (a.index || 0) - (b.index || 0); });
      for (k = 0; k < list.length && !page; k++) if (matches(list[k], title, track.artist)) page = list[k];
      if (r.status !== 200) { var w = hit.waiting; delete cache[key]; w.forEach(function (f) { f({ year: 0, text: '', url: '' }); }); return; }
      if (!page) { finish({ year: 0, text: '', url: '' }); return; }
      var info = { year: 0, text: '', url: 'https://en.wikipedia.org/wiki/' + encodeURIComponent(page.title.replace(/ /g, '_')) }, left = 2;
      function one() { if (!--left) finish(info); }
      P.request({ url: WIKI + '?' + q({ action: 'query', format: 'json', origin: '*', prop: 'extracts', explaintext: 1, exsectionformat: 'wiki', pageids: page.pageid }), timeout: 12000 }, function (r2) {
        var p2 = r2.json && r2.json.query && r2.json.query.pages && r2.json.query.pages[page.pageid];
        info.text = p2 && p2.extract ? pick(p2.extract) : '';
        one();
      });
      var qid = page.pageprops && page.pageprops.wikibase_item;
      if (!qid || !/^Q\d+$/.test(qid)) { one(); return; }
      P.request({ url: WIKIDATA + '?' + q({ action: 'wbgetclaims', format: 'json', origin: '*', entity: qid, property: 'P577' }), timeout: 12000 }, function (r3) {
        info.year = earliestYear(r3.json && r3.json.claims);
        one();
      });
    });
  }

  window.FrameSongFacts = { lookup: lookup, _cleanTitle: cleanTitle, _matches: matches, _pick: pick, _sentences: sentences };
}());
