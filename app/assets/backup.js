/* Settings backup and restore. ES5 only.

   Everything the TV keeps for you — the look and layout, the Wi‑Fi QR, and the Alexa, Spotify and
   calendar sign-ins — is read from its storage, wrapped in one JSON file and encrypted with a
   pass-phrase you type on the TV. Only the encrypted file travels: it goes to your phone through a
   private ntfy.sh channel (in small numbered parts, since a channel message is short), and your phone
   saves it wherever you like. Restore sends the file back the same way; the TV decrypts it with the
   same pass-phrase and writes the settings back. The pass-phrase and the readable settings never
   leave the TV, and the relay and the saved file only ever hold ciphertext.

   The cipher is the project's keystream = SHA-256(key | nonce | counter), XORed over the bytes, the
   same construction the calendar uses; the key is stretched from the pass-phrase with repeated
   SHA-256 over a random salt. A short MAC over (key | plaintext) catches a wrong pass-phrase or a
   damaged file. All of it runs on the TV with the bundled SHA-256 (WebCrypto is not guaranteed on a
   file:// origin). */
(function () {
  'use strict';
  var P = window.FramePKCE;
  if (!P) return;

  /* The storage keys that make up a backup. Weather and holiday caches are left out (they refill on
     their own), and only these exact names are ever written back on restore. */
  var KEYS = ['cleanframe.home.v1', 'cleanframe.alexa.v1', 'cleanframe.spotify.v1', 'cleanframe.calendar.v1'];
  var MAGIC = 'FHBK', VERSION = 1, ITERS = 20000, CHUNK = 1200;

  /* ---------- bytes and text ---------- */
  function utf8Bytes(str) {
    var bin = unescape(encodeURIComponent(str)), a = new Uint8Array(bin.length), i;
    for (i = 0; i < bin.length; i++) a[i] = bin.charCodeAt(i) & 255;
    return a;
  }
  function utf8String(bytes) {
    var bin = '', i;
    for (i = 0; i < bytes.length; i++) bin += String.fromCharCode(bytes[i]);
    try { return decodeURIComponent(escape(bin)); } catch (e) { return null; }
  }
  function concat(a, b) { var out = new Uint8Array(a.length + b.length); out.set(a); out.set(b, a.length); return out; }
  function fromB64url(s) {
    s = String(s || '');
    var b = atob(s.replace(/-/g, '+').replace(/_/g, '/') + '===='.slice(s.length % 4 || 4)), a = new Uint8Array(b.length), i;
    for (i = 0; i < b.length; i++) a[i] = b.charCodeAt(i);
    return a;
  }

  /* ---------- cipher ---------- */
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
  function deriveKey(passBytes, salt, iters) {
    var h = P.sha256(concat(passBytes, salt)), i;
    for (i = 0; i < iters; i++) h = P.sha256(concat(h, salt));
    return h;
  }
  function xor(data, ks) { var out = new Uint8Array(data.length), i; for (i = 0; i < data.length; i++) out[i] = data[i] ^ ks[i]; return out; }

  /* ---------- the file ---------- */
  function collect() {
    var keys = {}, i, v;
    for (i = 0; i < KEYS.length; i++) { try { v = localStorage.getItem(KEYS[i]); } catch (e) { v = null; } if (typeof v === 'string') keys[KEYS[i]] = v; }
    return keys;
  }
  /* make(pass) → the encrypted file text, or '' if there is nothing worth saving. */
  function make(pass, version) {
    var keys = collect();
    var names = [], k; for (k in keys) if (keys.hasOwnProperty(k)) names.push(k);
    if (!names.length) return '';
    var payload = MAGIC + JSON.stringify({ at: Date.now(), app: version || '', keys: keys });
    var plain = utf8Bytes(payload);
    var salt = P.randomBytes(16), nonce = P.randomBytes(16), key = deriveKey(utf8Bytes(String(pass || '')), salt, ITERS);
    var cipher = xor(plain, keystream(key, nonce, plain.length));
    var mac = P.sha256(concat(key, plain)).subarray(0, 16);
    return JSON.stringify({ v: VERSION, at: Date.now(), app: version || '', kdf: { s: P.b64url(salt), it: ITERS }, n: P.b64url(nonce), d: P.b64url(cipher), m: P.b64url(mac) });
  }
  /* read(pass, text) → { ok:true, keys, at, app } or { ok:false, code:'bad-file'|'bad-version'|'bad-pass' }. */
  function read(pass, text) {
    var file, iters, salt, nonce, cipher, mac;
    try { file = JSON.parse(text); } catch (e) { return { ok: false, code: 'bad-file' }; }
    if (!file || typeof file !== 'object' || !file.kdf || !file.d || !file.n || !file.m) return { ok: false, code: 'bad-file' };
    if (file.v !== VERSION) return { ok: false, code: 'bad-version' };
    iters = file.kdf.it | 0;
    if (iters < 1 || iters > 500000) return { ok: false, code: 'bad-file' };
    try { salt = fromB64url(file.kdf.s); nonce = fromB64url(file.n); cipher = fromB64url(file.d); mac = fromB64url(file.m); }
    catch (e2) { return { ok: false, code: 'bad-file' }; }
    var key = deriveKey(utf8Bytes(String(pass || '')), salt, iters);
    var plain = xor(cipher, keystream(key, nonce, cipher.length));
    var want = P.sha256(concat(key, plain)).subarray(0, 16), i;
    for (i = 0; i < 16; i++) if (want[i] !== mac[i]) return { ok: false, code: 'bad-pass' };
    var str = utf8String(plain);
    if (!str || str.slice(0, 4) !== MAGIC) return { ok: false, code: 'bad-pass' };
    var payload; try { payload = JSON.parse(str.slice(4)); } catch (e3) { return { ok: false, code: 'bad-file' }; }
    if (!payload || !payload.keys || typeof payload.keys !== 'object') return { ok: false, code: 'bad-file' };
    return { ok: true, keys: payload.keys, at: +payload.at || 0, app: String(payload.app || '') };
  }
  /* apply(keys) writes back only the known keys, and returns how many it wrote. The caller reloads. */
  function apply(keys) {
    var n = 0, i, k, v;
    if (!keys || typeof keys !== 'object') return 0;
    for (i = 0; i < KEYS.length; i++) {
      k = KEYS[i]; v = keys[k];
      if (typeof v !== 'string' || v.length > 1000000) continue;
      try { localStorage.setItem(k, v); n++; } catch (e) { /* out of space or blocked */ }
    }
    return n;
  }
  /* What a restore would change, for a short summary before the reload. */
  function describe(keys) {
    return { settings: !!(keys && keys['cleanframe.home.v1']), alexa: !!(keys && keys['cleanframe.alexa.v1']),
      spotify: !!(keys && keys['cleanframe.spotify.v1']), calendar: !!(keys && keys['cleanframe.calendar.v1']) };
  }

  /* ---------- relay: small numbered parts ---------- */
  function parts(text) {
    var body = P.b64url(utf8Bytes(text)), id = P.b64url(P.randomBytes(9)).replace(/[^A-Za-z0-9]/g, '').slice(0, 12),
      n = Math.max(1, Math.ceil(body.length / CHUNK)), out = [], i;
    for (i = 0; i < n; i++) out.push({ id: id, i: i, n: n, code: body.slice(i * CHUNK, (i + 1) * CHUNK) || '.' });
    return out;
  }
  function validPart(m) {
    return m && typeof m.id === 'string' && /^[A-Za-z0-9]{1,16}$/.test(m.id) && typeof m.code === 'string'
      && m.code.length <= CHUNK + 1 && /^[A-Za-z0-9_.-]+$/.test(m.code)
      && typeof m.n === 'number' && m.n >= 1 && m.n <= 400 && typeof m.i === 'number' && m.i >= 0 && m.i < m.n;
  }
  /* send(relay, topic, text) posts the parts and returns resend()/stop() so a late phone still catches them. */
  function send(relay, topic, text) {
    var ps = parts(text), stopped = false, timer = 0;
    function post() { ps.forEach(function (p) { if (!stopped) P.request({ method: 'POST', url: relay + '/' + encodeURIComponent(topic), body: JSON.stringify(p) }, function () {}); }); }
    function loop() { if (stopped) return; post(); timer = setTimeout(loop, 8000); }
    loop();
    return { stop: function () { stopped = true; clearTimeout(timer); } };
  }
  /* receive(relay, topic, onText) collects the parts of one transfer, joins them and calls onText(text). */
  function receive(relay, topic, onText) {
    var since = Math.floor(Date.now() / 1000) - 5, stopped = false, timer = 0, sets = {};
    function take(m) {
      if (!validPart(m)) return false;
      var set = sets[m.id] || (sets[m.id] = { n: m.n, parts: [], got: 0 });
      if (set.n !== m.n) return false;
      if (set.parts[m.i] === undefined) { set.parts[m.i] = m.code; set.got++; }
      if (set.got < set.n) return false;
      var body = set.parts.join('').replace(/\.$/, ''), text = utf8String(fromB64url(body));
      if (text) { onText(text); return true; }
      return false;
    }
    function poll() {
      if (stopped) return;
      P.request({ url: relay + '/' + encodeURIComponent(topic) + '/json?poll=1&since=' + since }, function (r) {
        if (stopped) return;
        var lines = String(r.text || '').split('\n'), i, env, msg, done = false;
        for (i = 0; i < lines.length && !done; i++) {
          try { env = JSON.parse(lines[i]); } catch (e) { continue; }
          if (!env || env.event !== 'message') continue;
          try { msg = JSON.parse(env.message || ''); } catch (e2) { msg = null; }
          if (msg && take(msg)) { done = true; stopped = true; return; }
        }
        timer = setTimeout(poll, r.status === 429 ? 15000 : 4000);
      });
    }
    poll();
    return { stop: function () { stopped = true; clearTimeout(timer); } };
  }

  window.FrameBackup = {
    KEYS: KEYS, make: make, read: read, apply: apply, describe: describe,
    topic: function () { return P.topic('framehome-bk-'); },
    send: send, receive: receive,
    _parts: parts
  };
}());
