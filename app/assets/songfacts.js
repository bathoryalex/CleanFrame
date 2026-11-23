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
    /* The artist must be named in the first sentence ("… is a song by X"): an article about an earlier
       original that only mentions this artist's cover further on is not this recording's story. */
    var first = fold(sentences(page.extract || '')[0] || ''), who = fold(artist);
    return !!who && (' ' + first + ' ').indexOf(' ' + who + ' ') >= 0 && /\b(song|single|track|ballad|anthem)\b/.test(first);
  }

  /* Sentences, without splitting at "Mr." or initials. */
  function sentences(text) {
    var parts = String(text || '').replace(/\s+/g, ' ').match(/[^.!?]+(?:[.!?]+["”’)]?|$)/g) || [], out = [], cur = '', i, p;
    for (i = 0; i < parts.length; i++) {
      p = parts[i];
      cur += p;
      if (/(?:\b(?:Mr|Mrs|Ms|Dr|St|Jr|Sr|No|vs|Vol|Inc|Ltd|Co|Bros|Mt|Ft|Corp|Ave|Sgt|Capt|Gen|Rev|Prof)|\b[A-Z])\.$/.test(cur.replace(/\s+$/, ''))) continue;
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
  /* A sentence scores by how much of a story it tells: strong signs (originally, inspired, last-minute,
     turned down, by accident, a shower or a dream, looped …) count three, plain ones (wrote, recorded,
     idea …) one. Sentences that start with a pronoun lose a point, since they lean on the sentence before;
     sentences too long for two lines on screen lose one too. */
  var STRONG = /\b(originally|initially|inspir\w*|last[- ]minute|turned (?:it |them |the [a-z]+ )?down|rejected|refused|by accident|accidental\w*|by chance|shower|dream\w*|loop(?:ed|ing)?|almost|never intended|on a whim|spontaneous\w*|napkin|nicknamed|in (?:about |just |only |under )?(?:\d+|ten|fifteen|twenty|thirty|five) minutes)\b/gi;
  var PLAIN = /\b(wrote|written|writing|idea|came up|came to|based on|dedicated|named after|tribute|demo|recorded in|story)\b/gi;
  function tidy(s) { return s.replace(/\s*\([^)]*\b(?:listen|pronounced|IPA)\b[^)]*\)/g, '').replace(/\s+([,.;:])/g, '$1').replace(/\s{2,}/g, ' '); }
  function usable(s) { return s.length >= 40 && s.length <= 220 && !/\{|\}|\|/.test(s); }
  function score(s) {
    var strong = (s.match(STRONG) || []).length, plain = (s.match(PLAIN) || []).length;
    if (!strong && !plain) return 0;
    return strong * 3 + plain - (/^(he|she|they|it|its|this|these|those|their|his|her)\b/i.test(s) ? 1 : 0) - (s.length > 150 ? 1 : 0);
  }
  /* People the article names in full ("Kevin Parker") and later by surname only ("Parker stated …"). A
     sentence that uses such a bare surname means nothing on its own, unless the name is the artist's. */
  var NOT_FIRST = /^(The|A|An|In|On|At|Of|For|From|By|With|After|Before|When|While|His|Her|Their|Its|This|That|These|Those|It|As|And|But|Or|To|New|Los|San|Las|Saint|St|United|North|South|East|West|Great)$/;
  function surnames(full, artist) {
    var out = {}, re = /(^|[^A-Za-zÀ-ɏ])([A-ZÀ-Þ][a-zß-ɏ]+(?:-[A-Z][a-zß-ɏ]+)?)\s+([A-ZÀ-Þ][a-zß-ɏ]+(?:-[A-Z][a-zß-ɏ]+)?)(?![A-Za-zÀ-ɏ])/g, m, who = ' ' + fold(artist) + ' ';
    while ((m = re.exec(full))) { re.lastIndex = m.index + m[1].length + m[2].length; if (!NOT_FIRST.test(m[2]) && who.indexOf(' ' + fold(m[3]) + ' ') < 0) (out[m[3]] = out[m[3]] || {})[m[2]] = true; }
    return out;
  }
  function dangling(s, names) {
    var last, re, m, ok;
    for (last in names) if (names.hasOwnProperty(last)) {
      re = new RegExp('(\\S+\\s+)?' + last + '(?![A-Za-z\\u00C0-\\u024F])', 'g');
      while ((m = re.exec(s))) {
        if (m.index > 0 && !m[1] && /[A-Za-z\u00C0-\u024F]/.test(s.charAt(m.index - 1))) continue;
        ok = m[1] && names[last][m[1].replace(/[^A-Za-z\u00C0-\u024F-]/g, '')]; if (!ok) return true;
      }
    }
    return false;
  }
  /* From the article's plain text with "== Heading ==" lines: the sentence that tells the most about how
     the song came about, from Background / Writing / Recording … sections or the introduction (never its
     first sentence, which only says what the song is); nothing when no sentence scores at least 2. Returns
     { text, more } where more is that sentence with the one or two after it, for the "read more" panel. */
  function pickFull(full, artist) {
    var lines = String(full || '').split('\n'), sections = [{ head: '', text: '' }], i, m, j, k, s, best = null, bestScore = 0, sc;
    var names = surnames(String(full || ''), artist || '');
    for (i = 0; i < lines.length; i++) {
      m = /^(={2,})\s*(.*?)\s*\1\s*$/.exec(lines[i]);
      if (m) sections.push({ head: m[2], text: '' }); else sections[sections.length - 1].text += lines[i] + '\n';
    }
    var good = sections.filter(function (x) { return x.head && GOOD.test(x.head) && !SKIP.test(x.head); });
    function withMore(list, k) {
      var more = tidy(list[k]), n;
      for (n = k + 1; n < list.length && n <= k + 2; n++) { if ((more + ' ' + list[n]).length > 520) break; more += ' ' + tidy(list[n]); }
      return { text: tidy(list[k]), more: more };
    }
    function consider(list, from) {
      for (k = from; k < list.length; k++) {
        s = tidy(list[k]);
        if (!usable(s) || dangling(s, names)) continue;
        sc = score(s);
        if (sc > bestScore) { best = withMore(list, k); bestScore = sc; }
      }
    }
    consider(sentences(sections[0].text), 1);
    for (j = 0; j < good.length; j++) consider(sentences(good[j].text), 0);
    /* A sentence that only says who wrote or produced it is not worth a line on screen: none rather than a dull one. */
    return best && bestScore >= 2 ? best : { text: '', more: '' };
  }
  function pick(full, artist) { return pickFull(full, artist).text; }
  function earliestYear(claims) {
    var best = 0;
    ((claims && claims.P577) || []).forEach(function (c) {
      var t = c && c.mainsnak && c.mainsnak.datavalue && c.mainsnak.datavalue.value && c.mainsnak.datavalue.value.time, y = /^\+(\d{4})-/.exec(t || '');
      if (y && (!best || +y[1] < best)) best = +y[1];
    });
    return best;
  }
  function q(params) { var out = [], k; for (k in params) if (params.hasOwnProperty(k)) out.push(encodeURIComponent(k) + '=' + encodeURIComponent(params[k])); return out.join('&'); }

  /* lookup({ id, title, artist }, done) → done({ year, text, more, title, url }) with year 0 / text '' when unknown. */
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
        var got = p2 && p2.extract ? pickFull(p2.extract, track.artist) : { text: '', more: '' };
        info.text = got.text; info.more = got.more; info.title = page.title.replace(/\s*\([^)]*\)\s*$/, '');
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

  window.FrameSongFacts = { lookup: lookup, _cleanTitle: cleanTitle, _matches: matches, _pick: pick, _pickFull: pickFull, _sentences: sentences };
}());
