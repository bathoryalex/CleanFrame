/* Calendar: your next events from the secret iCal (ICS) address that Google Calendar and Outlook give
   every calendar. ES5 only.

   The address is a long-lived secret, so the phone page (docs/calendar/) encrypts it before it passes
   through ntfy.sh: the 32-byte key travels only in the QR code's URL fragment, and the keystream is
   SHA-256(key | nonce | counter). The TV keeps the address in its own storage and only reads it. */
(function () {
  'use strict';
  var P = window.FramePKCE, STORE = 'cleanframe.calendar.v1';
  if (!P) return;
  var state = (function () { try { return JSON.parse(localStorage.getItem(STORE) || 'null'); } catch (e) { return null; } }());
  if (!state || typeof state.url !== 'string' || !/^https:\/\//.test(state.url)) state = null;
  function persist() { try { if (state) localStorage.setItem(STORE, JSON.stringify(state)); else localStorage.removeItem(STORE); return true; } catch (e) { return false; } }

  /* ---------- decrypting what the phone sent ---------- */
  function fromB64url(s) {
    var b = atob(s.replace(/-/g, '+').replace(/_/g, '/') + '===='.slice(s.length % 4 || 4)), a = new Uint8Array(b.length), i;
    for (i = 0; i < b.length; i++) a[i] = b.charCodeAt(i);
    return a;
  }
  function keystream(key, nonce, n) {
    var out = new Uint8Array(n), block, i = 0, j, input = new Uint8Array(key.length + nonce.length + 4);
    input.set(key); input.set(nonce, key.length);
    for (var ctr = 0; i < n; ctr++) {
      input[input.length - 4] = (ctr >>> 24) & 255; input[input.length - 3] = (ctr >>> 16) & 255; input[input.length - 2] = (ctr >>> 8) & 255; input[input.length - 1] = ctr & 255;
      block = P.sha256(input);
      for (j = 0; j < 32 && i < n; j++, i++) out[i] = block[j];
    }
    return out;
  }
  function decrypt(key, msg) {
    var nonce = fromB64url(msg.n || ''), data = fromB64url(msg.code), ks = keystream(key, nonce, data.length), s = '', i;
    for (i = 0; i < data.length; i++) s += String.fromCharCode(data[i] ^ ks[i]);
    try { return decodeURIComponent(escape(s)); } catch (e) { return ''; }
  }
  function cleanUrl(url) {
    url = String(url || '').trim().replace(/^webcals?:\/\//i, 'https://');
    return /^https:\/\/[^\s]+$/.test(url) && url.length < 2000 ? url : '';
  }
  function pair(page, relay, onUrl, onCode, done) {
    var key = P.randomBytes(32), topic = P.topic('framehome-cal-');
    onUrl(page + '#t=' + topic + '&k=' + P.b64url(key));
    return P.listen(relay, topic, function (msg) {
      var url = cleanUrl(decrypt(key, msg));
      if (!url) return false;
      onCode();
      state = { url: url }; persist();
      fetchIcs(function (err) { done(err); });
      return true;
    });
  }
  function forget() { state = null; cache = null; persist(); }

  /* ---------- ICS ---------- */
  var cache = null;
  function fetchIcs(done) {
    if (!state) { done('signed out'); return; }
    P.request({ url: state.url, timeout: 20000 }, function (r) {
      if (r.status !== 200 || !/BEGIN:VCALENDAR/.test(r.text || '')) { done(r.status ? 'HTTP ' + r.status : 'offline'); return; }
      cache = parse(r.text); cache.at = Date.now();
      done(null);
    });
  }
  function unfold(text) { return text.replace(/\r\n[ \t]/g, '').replace(/\n[ \t]/g, '').split(/\r?\n/); }
  function unescapeText(v) { return v.replace(/\\n/gi, ' ').replace(/\\([,;\\])/g, '$1'); }
  /* A date-time: UTC with Z, otherwise local wall time (the TV is set to the calendar's zone). */
  function parseTime(value, params) {
    var m = /^(\d{4})(\d{2})(\d{2})(?:T(\d{2})(\d{2})(\d{2})(Z)?)?$/.exec(value || '');
    if (!m) return null;
    if (!m[4] || /VALUE=DATE(?!-)/.test(params)) return { t: new Date(+m[1], +m[2] - 1, +m[3]).getTime(), allDay: true };
    return { t: m[7] ? Date.UTC(+m[1], +m[2] - 1, +m[3], +m[4], +m[5], +m[6]) : new Date(+m[1], +m[2] - 1, +m[3], +m[4], +m[5], +m[6]).getTime(), allDay: false };
  }
  function parse(text) {
    var lines = unfold(text), events = [], ev = null;
    lines.forEach(function (line) {
      var i = line.indexOf(':'), head, value, name, params;
      if (i < 0) return;
      head = line.slice(0, i); value = line.slice(i + 1);
      name = head.split(';')[0].toUpperCase(); params = head.slice(name.length).toUpperCase();
      if (name === 'BEGIN' && value === 'VEVENT') { ev = { exdates: [] }; return; }
      if (name === 'END' && value === 'VEVENT') { if (ev && ev.start && ev.status !== 'CANCELLED') events.push(ev); ev = null; return; }
      if (!ev) return;
      if (name === 'SUMMARY') ev.summary = unescapeText(value);
      else if (name === 'DTSTART') ev.start = parseTime(value, params);
      else if (name === 'DTEND') ev.end = parseTime(value, params);
      else if (name === 'DURATION') ev.duration = value;
      else if (name === 'RRULE') ev.rrule = value;
      else if (name === 'UID') ev.uid = value;
      else if (name === 'STATUS') ev.status = value.toUpperCase();
      else if (name === 'RECURRENCE-ID') ev.recurrence = parseTime(value, params);
      else if (name === 'EXDATE') value.split(',').forEach(function (v) { var x = parseTime(v, params); if (x) ev.exdates.push(x.t); });
    });
    return { events: events };
  }
  function durationMs(d) {
    var m = /^P(?:(\d+)W)?(?:(\d+)D)?(?:T(?:(\d+)H)?(?:(\d+)M)?(?:(\d+)S)?)?$/.exec(d || '');
    return m ? ((+m[1] || 0) * 7 * 86400 + (+m[2] || 0) * 86400 + (+m[3] || 0) * 3600 + (+m[4] || 0) * 60 + (+m[5] || 0)) * 1000 : 0;
  }
  var WD = { SU: 0, MO: 1, TU: 2, WE: 3, TH: 4, FR: 5, SA: 6 };
  /* Occurrence starts of an event between from and to. Daily, weekly (BYDAY), monthly (BYMONTHDAY or
     BYDAY like 2MO / -1FR) and yearly rules, with INTERVAL, COUNT, UNTIL and EXDATE. */
  function occurrences(ev, from, to) {
    var start = ev.start.t, out = [], rule = {}, n = 0, guard = 0, d, until, count, interval, freq, days, i, cand, base;
    if (!ev.rrule) return start < to ? [start] : [];
    ev.rrule.split(';').forEach(function (p) { var kv = p.split('='); rule[kv[0].toUpperCase()] = kv[1]; });
    freq = rule.FREQ; interval = Math.max(1, +rule.INTERVAL || 1); count = +rule.COUNT || 0;
    until = rule.UNTIL ? (parseTime(rule.UNTIL, '') || {}).t : 0;
    days = rule.BYDAY ? rule.BYDAY.split(',') : null;
    base = new Date(start);
    /* Without COUNT, jump close to the window instead of walking from a start years ago. */
    var fromD = new Date(from), skip = 0;
    if (!count && from > start) {
      if (freq === 'DAILY') skip = Math.floor((from - start) / (86400000 * interval)) - 1;
      else if (freq === 'WEEKLY') skip = Math.floor((from - start) / (7 * 86400000 * interval)) - 1;
      else if (freq === 'MONTHLY') skip = Math.floor(((fromD.getFullYear() - base.getFullYear()) * 12 + fromD.getMonth() - base.getMonth()) / interval) - 1;
      else if (freq === 'YEARLY') skip = Math.floor((fromD.getFullYear() - base.getFullYear()) / interval) - 1;
      skip = Math.max(0, skip);
    }
    function push(t) {
      if (t < start) return true;
      if (until && t > until) return false;
      if (count && n >= count) return false;
      n++;
      if (t >= from - 86400000 && t < to && ev.exdates.indexOf(t) < 0) out.push(t);
      return t < to;
    }
    function at(y, m, day) { return new Date(y, m, day, base.getHours(), base.getMinutes(), base.getSeconds()).getTime(); }
    function nthWeekday(y, m, spec) {
      var mm = /^([+-]?\d+)?(SU|MO|TU|WE|TH|FR|SA)$/.exec(spec), k, first, last, dd;
      if (!mm) return null;
      k = mm[1] ? +mm[1] : 1;
      if (k > 0) { first = new Date(y, m, 1).getDay(); dd = 1 + (WD[mm[2]] - first + 7) % 7 + (k - 1) * 7; }
      else { last = new Date(y, m + 1, 0); dd = last.getDate() - (last.getDay() - WD[mm[2]] + 7) % 7 + (k + 1) * 7; }
      return dd >= 1 && dd <= new Date(y, m + 1, 0).getDate() ? dd : null;
    }
    while (guard++ < 3000) {
      if (freq === 'DAILY') { d = new Date(base.getFullYear(), base.getMonth(), base.getDate() + (guard - 1 + skip) * interval); if (!push(at(d.getFullYear(), d.getMonth(), d.getDate()))) break; }
      else if (freq === 'WEEKLY') {
        d = new Date(base.getFullYear(), base.getMonth(), base.getDate() - base.getDay() + (guard - 1 + skip) * 7 * interval);
        cand = (days || [Object.keys(WD)[base.getDay()]]).map(function (x) { return WD[x.replace(/^[+-]?\d+/, '')]; }).sort();
        var go = true;
        for (i = 0; i < cand.length && go; i++) go = push(at(d.getFullYear(), d.getMonth(), d.getDate() + cand[i]));
        if (!go) break;
      } else if (freq === 'MONTHLY') {
        var y = base.getFullYear(), m = base.getMonth() + (guard - 1 + skip) * interval, list = [];
        y += Math.floor(m / 12); m = (m % 12 + 12) % 12;
        if (days) days.forEach(function (x) { var dd = nthWeekday(y, m, x); if (dd) list.push(dd); });
        else (rule.BYMONTHDAY ? rule.BYMONTHDAY.split(',').map(Number) : [base.getDate()]).forEach(function (dd) { var max = new Date(y, m + 1, 0).getDate(); dd = dd < 0 ? max + dd + 1 : dd; if (dd >= 1 && dd <= max) list.push(dd); });
        list.sort(function (a, b) { return a - b; });
        var ok = true;
        for (i = 0; i < list.length && ok; i++) ok = push(at(y, m, list[i]));
        if (!ok) break;
      } else if (freq === 'YEARLY') { if (!push(at(base.getFullYear() + (guard - 1 + skip) * interval, base.getMonth(), base.getDate()))) break; }
      else break;
    }
    return out;
  }
  /* Events overlapping [from, to), sorted: { start, end, allDay, title }. */
  function upcoming(from, to) {
    var list = [], moved = {};
    if (!cache) return list;
    cache.events.forEach(function (ev) { if (ev.recurrence && ev.uid) moved[ev.uid + '|' + ev.recurrence.t] = true; });
    cache.events.forEach(function (ev) {
      var len = ev.end ? ev.end.t - ev.start.t : ev.duration ? durationMs(ev.duration) : ev.start.allDay ? 86400000 : 0;
      (ev.recurrence ? [ev.start.t] : occurrences(ev, from, to)).forEach(function (t) {
        if (!ev.recurrence && ev.uid && moved[ev.uid + '|' + t]) return;
        if (t + Math.max(len, 1) > from && t < to) list.push({ start: t, end: t + len, allDay: ev.start.allDay, title: ev.summary || '' });
      });
    });
    return list.sort(function (a, b) { return a.allDay !== b.allDay ? (a.allDay ? -1 : 1) : a.start - b.start; });
  }

  window.FrameCalendar = {
    connected: function () { return !!state; },
    pair: pair, forget: forget, refresh: fetchIcs, upcoming: upcoming,
    loadedAt: function () { return cache ? cache.at : 0; },
    _parse: function (text) { cache = parse(text); cache.at = Date.now(); }
  };
}());
