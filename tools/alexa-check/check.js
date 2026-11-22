/* Alexa Check 0.2: sign in to Alexa from the phone, then find out which way this TV can read
   Alexa smart-home devices. ES5 only.

   The sign-in follows the Alexa iOS app flow used by aioamazondevices (Apache-2.0):
   OAuth authorization code + PKCE, then POST api.amazon.com/auth/register.
   The phone page (docs/alexa/) gets only the PKCE challenge; the verifier stays on the TV, so the
   authorization code relayed through ntfy.sh is useless to anyone else.

   Test 0.1 showed: the runtime reads Amazon answers, refuses a hand-set Cookie header, sends custom
   headers and keeps third-party cookies. So this version tries Bearer / x-amz-access-token headers
   and getting Amazon to put the cookies into the runtime's own cookie jar. */
(function () {
  'use strict';
  var STORE = 'alexaCheck.v2';
  var SEND_PAGE = 'https://bathoryalex.github.io/CleanFrame/alexa/';
  var RELAY = 'https://ntfy.sh';
  var DEVICE_TYPE = 'A2IVLV5VM2W81', APP_NAME = 'Frame Home', APP_VERSION = '2.2.663733.0';
  var list = document.getElementById('list'), verdict = document.getElementById('verdict');
  var sideTitle = document.getElementById('sideTitle'), qrCanvas = document.getElementById('qr');
  var pairText = document.getElementById('pairText'), deviceList = document.getElementById('devices');

  /* ---------- keys ---------- */
  try { tizen.tvinputdevice.registerKey('ColorF0Red'); } catch (e) { /* browser preview */ }
  document.addEventListener('keydown', function (e) {
    if (e.keyCode === 10009 || e.keyCode === 27) {
      try { tizen.application.getCurrentApplication().exit(); } catch (err) { /* browser preview */ }
    }
    if (e.keyCode === 403 || e.key === 'r') { forget(); location.reload(); }
  });

  /* ---------- storage ---------- */
  function load() { try { return JSON.parse(localStorage.getItem(STORE) || 'null'); } catch (e) { return null; } }
  function save(v) { try { localStorage.setItem(STORE, JSON.stringify(v)); } catch (e) { /* ignore */ } }
  function forget() { try { localStorage.removeItem(STORE); } catch (e) { /* ignore */ } }

  /* ---------- rows ---------- */
  function row(name) {
    var li = document.createElement('li'), tag = document.createElement('span'), title = document.createElement('span'), detail = document.createElement('span');
    tag.className = 'tag wait'; tag.textContent = '…';
    title.className = 'name'; title.textContent = name;
    detail.className = 'detail';
    li.appendChild(tag); li.appendChild(title); li.appendChild(detail);
    list.appendChild(li);
    return function (ok, text) {
      tag.className = 'tag ' + (ok ? 'yes' : 'no');
      tag.textContent = ok ? 'YES' : 'NO';
      detail.textContent = text || '';
    };
  }
  function say(text, ok) { verdict.textContent = text; verdict.className = ok === undefined ? 'wait' : ok ? 'yes' : 'no'; }

  /* ---------- http ---------- */
  function request(o, done) {
    var x = new XMLHttpRequest(), finished = false;
    function finish() {
      if (finished) return; finished = true;
      var text = '';
      try { text = x.responseText || ''; } catch (e) { text = ''; }
      done({ status: x.status, text: text, json: parse(text) });
    }
    try {
      x.open(o.method || 'GET', o.url, true);
      x.timeout = 20000;
      if (o.credentials) x.withCredentials = true;
      var h = o.headers || {}, k;
      for (k in h) if (h.hasOwnProperty(k)) { try { x.setRequestHeader(k, h[k]); } catch (e) { /* refused */ } }
      x.onload = finish; x.onerror = finish; x.ontimeout = finish; x.onabort = finish;
      x.send(o.body || null);
    } catch (e) { finished = true; done({ status: 0, text: String(e), json: null }); }
  }
  function parse(text) { try { return JSON.parse(text); } catch (e) { return null; } }
  function form(obj) { var out = [], k; for (k in obj) if (obj.hasOwnProperty(k)) out.push(encodeURIComponent(k) + '=' + encodeURIComponent(obj[k])); return out.join('&'); }
  function snippet(r) { var t = (r.text || '').replace(/\s+/g, ' ').slice(0, 110); return 'HTTP ' + r.status + (t ? ' · ' + t : ''); }

  /* ---------- crypto helpers ---------- */
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
  /* SHA-256 (FIPS 180-4), bytes in, bytes out. */
  function sha256(msg) {
    var K = [0x428a2f98, 0x71374491, 0xb5c0fbcf, 0xe9b5dba5, 0x3956c25b, 0x59f111f1, 0x923f82a4, 0xab1c5ed5, 0xd807aa98, 0x12835b01, 0x243185be, 0x550c7dc3,
      0x72be5d74, 0x80deb1fe, 0x9bdc06a7, 0xc19bf174, 0xe49b69c1, 0xefbe4786, 0x0fc19dc6, 0x240ca1cc, 0x2de92c6f, 0x4a7484aa, 0x5cb0a9dc, 0x76f988da,
      0x983e5152, 0xa831c66d, 0xb00327c8, 0xbf597fc7, 0xc6e00bf3, 0xd5a79147, 0x06ca6351, 0x14292967, 0x27b70a85, 0x2e1b2138, 0x4d2c6dfc, 0x53380d13,
      0x650a7354, 0x766a0abb, 0x81c2c92e, 0x92722c85, 0xa2bfe8a1, 0xa81a664b, 0xc24b8b70, 0xc76c51a3, 0xd192e819, 0xd6990624, 0xf40e3585, 0x106aa070,
      0x19a4c116, 0x1e376c08, 0x2748774c, 0x34b0bcb5, 0x391c0cb3, 0x4ed8aa4a, 0x5b9cca4f, 0x682e6ff3, 0x748f82ee, 0x78a5636f, 0x84c87814, 0x8cc70208,
      0x90befffa, 0xa4506ceb, 0xbef9a3f7, 0xc67178f2];
    var H = [0x6a09e667, 0xbb67ae85, 0x3c6ef372, 0xa54ff53a, 0x510e527f, 0x9b05688c, 0x1f83d9ab, 0x5be0cd19];
    var len = msg.length, total = ((len + 9 + 63) >> 6) << 6, p = new Uint8Array(total), w = new Array(64), i, j, t;
    p.set(msg); p[len] = 0x80;
    var bits = len * 8;
    p[total - 4] = (bits >>> 24) & 255; p[total - 3] = (bits >>> 16) & 255; p[total - 2] = (bits >>> 8) & 255; p[total - 1] = bits & 255;
    p[total - 5] = Math.floor(len / 0x20000000) & 255;
    function rotr(x, n) { return (x >>> n) | (x << (32 - n)); }
    for (i = 0; i < total; i += 64) {
      for (j = 0; j < 16; j++) w[j] = (p[i + j * 4] << 24) | (p[i + j * 4 + 1] << 16) | (p[i + j * 4 + 2] << 8) | p[i + j * 4 + 3];
      for (j = 16; j < 64; j++) {
        var s0 = rotr(w[j - 15], 7) ^ rotr(w[j - 15], 18) ^ (w[j - 15] >>> 3);
        var s1 = rotr(w[j - 2], 17) ^ rotr(w[j - 2], 19) ^ (w[j - 2] >>> 10);
        w[j] = (w[j - 16] + s0 + w[j - 7] + s1) | 0;
      }
      var a = H[0], b = H[1], c = H[2], d = H[3], e = H[4], f = H[5], g = H[6], h = H[7];
      for (j = 0; j < 64; j++) {
        var S1 = rotr(e, 6) ^ rotr(e, 11) ^ rotr(e, 25), ch = (e & f) ^ (~e & g), t1 = (h + S1 + ch + K[j] + w[j]) | 0;
        var S0 = rotr(a, 2) ^ rotr(a, 13) ^ rotr(a, 22), maj = (a & b) ^ (a & c) ^ (b & c), t2 = (S0 + maj) | 0;
        h = g; g = f; f = e; e = (d + t1) | 0; d = c; c = b; b = a; a = (t1 + t2) | 0;
      }
      H[0] = (H[0] + a) | 0; H[1] = (H[1] + b) | 0; H[2] = (H[2] + c) | 0; H[3] = (H[3] + d) | 0;
      H[4] = (H[4] + e) | 0; H[5] = (H[5] + f) | 0; H[6] = (H[6] + g) | 0; H[7] = (H[7] + h) | 0;
    }
    var out = new Uint8Array(32);
    for (i = 0; i < 8; i++) { t = H[i]; out[i * 4] = (t >>> 24) & 255; out[i * 4 + 1] = (t >>> 16) & 255; out[i * 4 + 2] = (t >>> 8) & 255; out[i * 4 + 3] = t & 255; }
    return out;
  }
  window.__alexaCheckSha256 = function (s) { return hex(sha256(asciiBytes(s))); };

  /* ---------- QR ---------- */
  function drawQr(payload) {
    var qr = qrcode(0, 'L'), n, cell, ctx = qrCanvas.getContext('2d'), size = qrCanvas.width, r, c;
    qr.addData(payload); qr.make(); n = qr.getModuleCount(); cell = size / (n + 8);
    ctx.fillStyle = '#ffffff'; ctx.fillRect(0, 0, size, size); ctx.fillStyle = '#0e0a06';
    for (r = 0; r < n; r++) for (c = 0; c < n; c++) if (qr.isDark(r, c)) ctx.fillRect((c + 4) * cell, (r + 4) * cell, Math.ceil(cell), Math.ceil(cell));
    qrCanvas.style.display = 'block';
  }

  /* ---------- pairing ---------- */
  function pair() {
    var serial = hex(randomBytes(16)).toUpperCase();
    var client = hex(asciiBytes(serial + '#' + DEVICE_TYPE));
    var verifier = b64url(randomBytes(32));
    var challenge = b64url(sha256(asciiBytes(verifier)));
    var topic = 'fh-alexa-' + b64url(randomBytes(15)).replace(/[-_]/g, 'x');
    var url = SEND_PAGE + '#t=' + topic + '&c=' + challenge + '&i=' + client;
    window.__alexaCheckPairUrl = url;
    var since = Math.floor(Date.now() / 1000) - 5, mark = row('Waiting for the sign-in code from the phone');
    sideTitle.textContent = 'Scan with your phone';
    pairText.textContent = 'Sign in to Amazon on the page that opens, then paste the address as it asks.';
    drawQr(url);
    say('Waiting for the phone…');
    var done = false;
    function poll() {
      if (done) return;
      request({ url: RELAY + '/' + topic + '/json?poll=1&since=' + since }, function (r) {
        var lines = (r.text || '').split('\n'), i, m, msg;
        for (i = 0; i < lines.length && !done; i++) {
          m = parse(lines[i]);
          if (!m || m.event !== 'message') continue;
          msg = parse(m.message || '');
          if (msg && msg.code) {
            done = true;
            qrCanvas.style.display = 'none'; pairText.textContent = ''; sideTitle.textContent = '';
            mark(true, 'code received for amazon.' + (msg.domain === 'com' ? 'com' : 'de'));
            register(serial, client, verifier, msg.code, msg.domain === 'com' ? 'com' : 'de');
          }
        }
        if (!done) setTimeout(poll, r.status === 429 ? 15000 : 4000);
      });
    }
    poll();
  }

  function register(serial, client, verifier, code, domain) {
    var mark = row('Register this TV with Amazon (auth/register)');
    var body = {
      requested_extensions: ['device_info', 'customer_info'],
      cookies: { website_cookies: [], domain: '.amazon.' + domain },
      registration_data: {
        domain: 'Device', app_version: APP_VERSION, device_type: DEVICE_TYPE,
        device_name: '%FIRST_NAME%\'s%DUPE_STRATEGY_1ST%' + APP_NAME,
        os_version: '18.5', device_serial: serial, device_model: 'iPhone', app_name: APP_NAME, software_version: '35602678'
      },
      auth_data: {
        use_global_authentication: 'true', client_id: client, authorization_code: code,
        code_verifier: verifier, code_algorithm: 'SHA-256', client_domain: 'DeviceLegacy'
      },
      user_context_map: { frc: b64(randomBytes(313)).replace(/=+$/, '') },
      requested_token_type: ['bearer', 'mac_dms', 'website_cookies', 'store_authentication_cookie']
    };
    request({ method: 'POST', url: 'https://api.amazon.com/auth/register',
      headers: { 'Content-Type': 'application/json; charset=utf-8', 'Accept-Language': 'en-US' }, body: JSON.stringify(body) }, function (r) {
      var s = r.json && r.json.response && r.json.response.success, tokens = s && s.tokens, bearer = tokens && tokens.bearer;
      if (!bearer || !bearer.refresh_token) { mark(false, snippet(r)); say('Sign-in failed. Red button: try again.', false); return; }
      var cookies = (tokens.website_cookies || []).map(function (c) { return c.Name; });
      var store = tokens.store_authentication_cookie && tokens.store_authentication_cookie.cookie;
      var name = s.extensions && s.extensions.device_info && s.extensions.device_info.device_name;
      mark(true, 'registered as “' + (name || '?') + '” · website cookies: ' + (cookies.join(', ') || 'none'));
      var state = { serial: serial, domain: domain, refresh: bearer.refresh_token, access: bearer.access_token, at: Date.now(),
        cookies: tokens.website_cookies || [], store: store || '' };
      save(state);
      tests(state);
    });
  }

  function refreshAccess(state, done) {
    var mark = row('Renew the access token (auth/token)');
    request({ method: 'POST', url: 'https://api.amazon.com/auth/token', headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: form({ app_name: APP_NAME, app_version: APP_VERSION, 'di.sdk.version': '6.12.4', source_token: state.refresh, package_name: 'com.amazon.echo',
        'di.hw.version': 'iPhone', platform: 'iOS', requested_token_type: 'access_token', source_token_type: 'refresh_token',
        'di.os.name': 'iOS', 'di.os.version': '18.5', current_version: '6.12.4', previous_version: '6.12.4', domain: 'www.amazon.' + state.domain }) }, function (r) {
      var token = r.json && r.json.access_token;
      mark(!!token, token ? 'ok, valid ' + Math.round((r.json.expires_in || 0) / 60) + ' min' : snippet(r));
      if (token) { state.access = token; state.at = Date.now(); save(state); }
      done(!!token);
    });
  }

  /* ---------- tests ---------- */
  var DEVICES_QUERY = 'query getDevicesBaseData { listEndpoints(listEndpointsInput: { includeHouseholdDevices: true }) { endpoints { endpointId: id ' +
    'friendlyNameObject { value { text } } displayCategories { primary { value } } } } }';
  var FEATURES_QUERY = 'query getEndpointFeatures($endpointIds: [String]!) { listEndpoints(listEndpointsInput: { latencyTolerance: LOW, endpointIds: $endpointIds, includeHouseholdDevices: true }) ' +
    '{ endpoints { endpointId: id features { name instance properties { name type __typename ' +
    '... on TemperatureSensor { value { value scale } timeOfSample } ... on Power { powerStateValue timeOfSample } ' +
    '... on Brightness { brightnessStateValue } ... on Reachability { reachabilityStatusValue } } } } } }';

  function tests(state) {
    var d = state.domain, alexa = 'https://alexa.amazon.' + d;
    var bearer = { 'Authorization': 'Bearer ' + state.access };
    var xamz = { 'x-amz-access-token': state.access };
    var graphHeaders = function (extra) { var h = { 'Content-Type': 'application/json; charset=utf-8' }, k; for (k in extra) h[k] = extra[k]; return h; };
    var R = {};
    function me(label, opts, key) {
      return function (next) {
        var mark = row(label);
        request({ url: alexa + '/api/users/me', credentials: opts.credentials, headers: opts.headers }, function (r) {
          R[key] = r.status === 200 && !!r.json;
          mark(R[key], R[key] ? 'signed in · market ' + (r.json.marketPlaceDomainName || '?') : snippet(r));
          next();
        });
      };
    }
    function graph(label, opts, key) {
      return function (next) {
        var mark = row(label);
        request({ method: 'POST', url: alexa + '/nexus/v1/graphql', credentials: opts.credentials, headers: graphHeaders(opts.headers || {}),
          body: JSON.stringify({ operationName: 'getDevicesBaseData', query: DEVICES_QUERY }) }, function (r) {
          var eps = r.json && r.json.data && r.json.data.listEndpoints && r.json.data.listEndpoints.endpoints;
          R[key] = !!eps;
          if (eps && !R.devices) R.devices = { endpoints: eps, opts: opts };
          mark(R[key], eps ? eps.length + ' devices' : snippet(r));
          next();
        });
      };
    }
    var tokenForm = { app_name: APP_NAME, app_version: APP_VERSION, 'di.sdk.version': '6.12.4', source_token: state.refresh, package_name: 'com.amazon.echo',
      'di.hw.version': 'iPhone', platform: 'iOS', requested_token_type: 'auth_cookies', source_token_type: 'refresh_token',
      'di.os.name': 'iOS', 'di.os.version': '18.5', current_version: '6.12.4', previous_version: '6.12.4', domain: '.amazon.' + d };
    var steps = [
      me('Alexa: TV cookie jar, before exchange', { credentials: true }, 'jar0'),
      me('Alexa: Authorization: Bearer', { headers: bearer }, 'bearer'),
      me('Alexa: x-amz-access-token', { headers: xamz }, 'xamz'),
      graph('Device list: Bearer', { headers: bearer }, 'gBearer'),
      graph('Device list: x-amz-access-token', { headers: xamz }, 'gXamz'),
      function (next) {
        var mark = row('Cookie exchange on www.amazon.' + d + ' (credentials)');
        request({ method: 'POST', url: 'https://www.amazon.' + d + '/ap/exchangetoken/cookies', credentials: true,
          headers: { 'Content-Type': 'application/x-www-form-urlencoded', 'x-amzn-identity-auth-domain': 'api.amazon.' + d }, body: form(tokenForm) }, function (r) {
          var c = r.json && r.json.response && r.json.response.tokens && r.json.response.tokens.cookies;
          var names = []; if (c) for (var k in c) if (c.hasOwnProperty(k)) names.push(k + ': ' + (c[k] || []).length);
          mark(!!c, c ? 'cookies in body · ' + names.join(', ') : snippet(r));
          next();
        });
      },
      me('Alexa: TV cookie jar, after www exchange', { credentials: true }, 'jar1'),
      function (next) {
        var mark = row('Cookie exchange on api.amazon.com (credentials)');
        request({ method: 'POST', url: 'https://api.amazon.com/auth/token', credentials: true,
          headers: { 'Content-Type': 'application/x-www-form-urlencoded' }, body: form(tokenForm) }, function (r) {
          var c = r.json && r.json.response && r.json.response.tokens && r.json.response.tokens.cookies;
          mark(!!c, c ? 'cookies in body' : snippet(r));
          next();
        });
      },
      me('Alexa: TV cookie jar, after api exchange', { credentials: true }, 'jar2'),
      graph('Device list: TV cookie jar', { credentials: true }, 'gJar')
    ];
    function run(i) {
      if (i < steps.length) { steps[i](function () { run(i + 1); }); return; }
      if (R.devices) { say('Reading device states…'); readStates(alexa, R.devices); }
      else say('No way to read devices yet. Send a photo of this screen.', false);
    }
    run(0);
  }

  function readStates(alexa, found) {
    var names = {}, ids = [], mark = row('Device states (temperature, on/off)');
    found.endpoints.forEach(function (e) {
      names[e.endpointId] = e.friendlyNameObject && e.friendlyNameObject.value && e.friendlyNameObject.value.text || e.endpointId;
      ids.push(e.endpointId);
    });
    var shown = [], batches = [], i;
    for (i = 0; i < ids.length; i += 25) batches.push(ids.slice(i, i + 25));
    var opts = found.opts, headers = { 'Content-Type': 'application/json; charset=utf-8' }, k;
    for (k in (opts.headers || {})) headers[k] = opts.headers[k];
    function nextBatch(b) {
      if (b >= batches.length) { finish(); return; }
      request({ method: 'POST', url: alexa + '/nexus/v1/graphql', credentials: opts.credentials, headers: headers,
        body: JSON.stringify([{ operationName: 'getEndpointFeatures', variables: { endpointIds: batches[b] }, query: FEATURES_QUERY }]) }, function (r) {
        var data = r.json && (r.json[0] || r.json).data, eps = data && data.listEndpoints && data.listEndpoints.endpoints || [];
        if (!eps.length) mark(false, snippet(r));
        eps.forEach(function (e) {
          var temp = null, power = null;
          (e.features || []).forEach(function (f) {
            (f.properties || []).forEach(function (p) {
              if (p.__typename === 'TemperatureSensor' && p.value && p.value.value > -280) temp = p.value;
              if (p.__typename === 'Power' && p.powerStateValue) power = p.powerStateValue;
            });
          });
          if (temp) shown.push([names[e.endpointId], (Math.round(temp.value * 10) / 10) + (temp.scale === 'FAHRENHEIT' ? ' °F' : ' °C')]);
          if (power) shown.push([names[e.endpointId], power === 'ON' ? 'on' : 'off']);
        });
        nextBatch(b + 1);
      });
    }
    function finish() {
      sideTitle.textContent = 'Your Alexa devices';
      shown.slice(0, 14).forEach(function (s) {
        var li = document.createElement('li'), n = document.createElement('span'), v = document.createElement('span');
        n.textContent = s[0]; v.className = 'val'; v.textContent = s[1];
        li.appendChild(n); li.appendChild(v); deviceList.appendChild(li);
      });
      mark(shown.length > 0, shown.length + ' values from ' + ids.length + ' devices');
      say(shown.length ? 'It works. Send a photo of this screen.' : 'Devices found but no values. Send a photo of this screen.', shown.length > 0);
    }
    nextBatch(0);
  }

  /* ---------- start ---------- */
  var state = load();
  if (state && state.refresh) refreshAccess(state, function (ok) { if (ok) tests(state); else say('Saved sign-in no longer works. Red button: sign in again.', false); });
  else pair();
}());
