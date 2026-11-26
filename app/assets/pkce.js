/* Shared helpers for the phone sign-ins (Alexa, Spotify): XHR, PKCE (SHA-256, base64url) and
   waiting for a one-time code that the phone page posts to an ntfy.sh topic. ES5 only. */
(function () {
  'use strict';
  /* ---------- http ---------- */
  function request(o, done) {
    var x = new XMLHttpRequest(), finished = false;
    function finish() {
      if (finished) return; finished = true;
      var text = '', json = null;
      try { text = x.responseText || ''; } catch (e) { text = ''; }
      try { json = JSON.parse(text); } catch (e) { json = null; }
      done({ status: x.status, json: json, text: text, header: function (n) { try { return x.getResponseHeader(n); } catch (e) { return null; } } });
    }
    try {
      x.open(o.method || 'GET', o.url, true);
      x.timeout = o.timeout || 15000;
      var h = o.headers || {}, k;
      for (k in h) if (h.hasOwnProperty(k)) { try { x.setRequestHeader(k, h[k]); } catch (e) { /* refused by the runtime */ } }
      x.onload = finish; x.onerror = finish; x.ontimeout = finish; x.onabort = finish;
      x.send(o.body || null);
    } catch (e) { finished = true; done({ status: 0, json: null, text: String(e) }); }
  }
  function form(obj) { var out = [], k; for (k in obj) if (obj.hasOwnProperty(k)) out.push(encodeURIComponent(k) + '=' + encodeURIComponent(obj[k])); return out.join('&'); }
  function why(r) { return r.status ? 'HTTP ' + r.status : 'offline'; }

  function randomBytes(n) {
    var a = new Uint8Array(n), i;
    if (window.crypto && crypto.getRandomValues) { for (i = 0; i < n; i += 65536) crypto.getRandomValues(a.subarray(i, Math.min(n, i + 65536))); }
    else for (i = 0; i < n; i++) a[i] = Math.floor(Math.random() * 256);
    return a;
  }
  function hex(bytes) { var s = '', i; for (i = 0; i < bytes.length; i++) s += (bytes[i] < 16 ? '0' : '') + bytes[i].toString(16); return s; }
  function asciiBytes(str) { var a = new Uint8Array(str.length), i; for (i = 0; i < str.length; i++) a[i] = str.charCodeAt(i) & 255; return a; }
  function b64(bytes) { var s = '', i; for (i = 0; i < bytes.length; i++) s += String.fromCharCode(bytes[i]); return btoa(s); }
  function b64url(bytes) { return b64(bytes).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, ''); }
  /* SHA-256 (FIPS 180-4) for the PKCE challenge; WebCrypto is not guaranteed on a file:// origin. */
  function sha256(msg) {
    var K = [0x428a2f98, 0x71374491, 0xb5c0fbcf, 0xe9b5dba5, 0x3956c25b, 0x59f111f1, 0x923f82a4, 0xab1c5ed5, 0xd807aa98, 0x12835b01, 0x243185be, 0x550c7dc3,
      0x72be5d74, 0x80deb1fe, 0x9bdc06a7, 0xc19bf174, 0xe49b69c1, 0xefbe4786, 0x0fc19dc6, 0x240ca1cc, 0x2de92c6f, 0x4a7484aa, 0x5cb0a9dc, 0x76f988da,
      0x983e5152, 0xa831c66d, 0xb00327c8, 0xbf597fc7, 0xc6e00bf3, 0xd5a79147, 0x06ca6351, 0x14292967, 0x27b70a85, 0x2e1b2138, 0x4d2c6dfc, 0x53380d13,
      0x650a7354, 0x766a0abb, 0x81c2c92e, 0x92722c85, 0xa2bfe8a1, 0xa81a664b, 0xc24b8b70, 0xc76c51a3, 0xd192e819, 0xd6990624, 0xf40e3585, 0x106aa070,
      0x19a4c116, 0x1e376c08, 0x2748774c, 0x34b0bcb5, 0x391c0cb3, 0x4ed8aa4a, 0x5b9cca4f, 0x682e6ff3, 0x748f82ee, 0x78a5636f, 0x84c87814, 0x8cc70208,
      0x90befffa, 0xa4506ceb, 0xbef9a3f7, 0xc67178f2];
    var H = [0x6a09e667, 0xbb67ae85, 0x3c6ef372, 0xa54ff53a, 0x510e527f, 0x9b05688c, 0x1f83d9ab, 0x5be0cd19];
    var len = msg.length, total = ((len + 9 + 63) >> 6) << 6, p = new Uint8Array(total), w = new Array(64), i, j, t, bits = len * 8;
    p.set(msg); p[len] = 0x80;
    p[total - 4] = (bits >>> 24) & 255; p[total - 3] = (bits >>> 16) & 255; p[total - 2] = (bits >>> 8) & 255; p[total - 1] = bits & 255;
    p[total - 5] = Math.floor(len / 0x20000000) & 255;
    function rotr(x, n) { return (x >>> n) | (x << (32 - n)); }
    for (i = 0; i < total; i += 64) {
      for (j = 0; j < 16; j++) w[j] = (p[i + j * 4] << 24) | (p[i + j * 4 + 1] << 16) | (p[i + j * 4 + 2] << 8) | p[i + j * 4 + 3];
      for (j = 16; j < 64; j++) w[j] = (w[j - 16] + (rotr(w[j - 15], 7) ^ rotr(w[j - 15], 18) ^ (w[j - 15] >>> 3)) + w[j - 7] + (rotr(w[j - 2], 17) ^ rotr(w[j - 2], 19) ^ (w[j - 2] >>> 10))) | 0;
      var a = H[0], b = H[1], c = H[2], d = H[3], e = H[4], f = H[5], g = H[6], h = H[7];
      for (j = 0; j < 64; j++) {
        var t1 = (h + (rotr(e, 6) ^ rotr(e, 11) ^ rotr(e, 25)) + ((e & f) ^ (~e & g)) + K[j] + w[j]) | 0;
        var t2 = ((rotr(a, 2) ^ rotr(a, 13) ^ rotr(a, 22)) + ((a & b) ^ (a & c) ^ (b & c))) | 0;
        h = g; g = f; f = e; e = (d + t1) | 0; d = c; c = b; b = a; a = (t1 + t2) | 0;
      }
      H[0] = (H[0] + a) | 0; H[1] = (H[1] + b) | 0; H[2] = (H[2] + c) | 0; H[3] = (H[3] + d) | 0;
      H[4] = (H[4] + e) | 0; H[5] = (H[5] + f) | 0; H[6] = (H[6] + g) | 0; H[7] = (H[7] + h) | 0;
    }
    var out = new Uint8Array(32);
    for (i = 0; i < 8; i++) { t = H[i]; out[i * 4] = (t >>> 24) & 255; out[i * 4 + 1] = (t >>> 16) & 255; out[i * 4 + 2] = (t >>> 8) & 255; out[i * 4 + 3] = t & 255; }
    return out;
  }

  /* Polls an ntfy topic until accept(message) returns true. The message body is JSON from the phone page.
     Returns a cancel function. */
  function listen(relay, topic, accept) {
    var since = Math.floor(Date.now() / 1000) - 5, stopped = false, timer = null;
    function poll() {
      if (stopped) return;
      request({ url: relay + '/' + topic + '/json?poll=1&since=' + since }, function (r) {
        if (stopped) return;
        var lines = (r.text || '').split('\n'), i, m, msg;
        for (i = 0; i < lines.length; i++) {
          try { m = JSON.parse(lines[i]); } catch (e) { continue; }
          if (!m || m.event !== 'message') continue;
          try { msg = JSON.parse(m.message || ''); } catch (e) { msg = null; }
          if (msg && typeof msg.code === 'string' && /^[A-Za-z0-9_.~-]{6,1000}$/.test(msg.code) && accept(msg)) { stopped = true; return; }
        }
        timer = setTimeout(poll, r.status === 429 ? 15000 : 4000);
      });
    }
    poll();
    return function () { stopped = true; clearTimeout(timer); };
  }
  function topic(prefix) { return prefix + b64url(randomBytes(15)).replace(/[-_]/g, 'x'); }
  /* A PKCE pair: the verifier stays on the TV, the challenge goes into the QR code. */
  function pkce() { var verifier = b64url(randomBytes(32)); return { verifier: verifier, challenge: b64url(sha256(asciiBytes(verifier))) }; }

  window.FramePKCE = { request: request, form: form, why: why, randomBytes: randomBytes, hex: hex, asciiBytes: asciiBytes, b64: b64, b64url: b64url, sha256: sha256,
    listen: listen, topic: topic, pkce: pkce };
}());
