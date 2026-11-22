/* Alexa: read smart-home values and switch lights through the Alexa account, signed in once
   from the phone. ES5 only.

   Unofficial: this uses the same endpoints as the Alexa mobile app (flow and queries after
   aioamazondevices, Apache-2.0). Sign-in is OAuth with PKCE: the TV keeps the code verifier, the
   phone page (docs/alexa/) only sees the challenge and forwards the one-time authorization code
   through ntfy.sh. The TV then registers itself as an app device and keeps the refresh token in
   its own storage. Requests use "Authorization: Bearer" (the TV runtime cannot set a Cookie header;
   Bearer was verified on a Tizen 9 TV with tools/alexa-check). */
(function () {
  'use strict';
  var STORE = 'cleanframe.alexa.v1';
  var DEVICE_TYPE = 'A2IVLV5VM2W81', APP_NAME = 'Frame Home', APP_VERSION = '2.2.663733.0';
  var TOKEN_TTL = 50 * 60 * 1000;
  var DEVICES_QUERY = 'query getDevicesBaseData { listEndpoints(listEndpointsInput: { includeHouseholdDevices: true }) { endpoints { endpointId: id ' +
    'friendlyNameObject { value { text } } displayCategories { primary { value } } } } }';
  var FEATURES_QUERY = 'query getEndpointFeatures($endpointIds: [String]!) { listEndpoints(listEndpointsInput: { latencyTolerance: LOW, endpointIds: $endpointIds, includeHouseholdDevices: true }) ' +
    '{ endpoints { endpointId: id features { name instance operations { name } properties { name __typename ' +
    '... on TemperatureSensor { value { value scale } timeOfSample } ... on Power { powerStateValue timeOfSample } ' +
    '... on Reachability { reachabilityStatusValue } } } } } }';
  var SET_MUTATION = 'mutation setEndpointFeatures($setEndpointFeaturesInput: SetEndpointFeaturesInput!) { setEndpointFeatures(setEndpointFeaturesInput: $setEndpointFeaturesInput) ' +
    '{ featureControlResponses { endpointId featureName instance featureOperationName code } errors { endpointId featureName instance featureOperationName code message } } }';

  /* ---------- storage ---------- */
  var state = (function () { try { return JSON.parse(localStorage.getItem(STORE) || 'null'); } catch (e) { return null; } }());
  if (!state || typeof state.refresh !== 'string' || !state.refresh) state = null;
  function persist() { try { if (state) localStorage.setItem(STORE, JSON.stringify(state)); else localStorage.removeItem(STORE); return true; } catch (e) { return false; } }

  /* ---------- http ---------- */
  function request(o, done) {
    var x = new XMLHttpRequest(), finished = false;
    function finish() {
      if (finished) return; finished = true;
      var text = '', json = null;
      try { text = x.responseText || ''; } catch (e) { text = ''; }
      try { json = JSON.parse(text); } catch (e) { json = null; }
      done({ status: x.status, json: json, text: text });
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

  /* ---------- sign-in ---------- */
  /* Shows a QR code (through onUrl), waits for the code from the phone page and registers.
     Returns a cancel function. done(error) with error null on success. */
  function pair(sendPage, relay, onUrl, onCode, done) {
    var serial = hex(randomBytes(16)).toUpperCase();
    var client = hex(asciiBytes(serial + '#' + DEVICE_TYPE));
    var verifier = b64url(randomBytes(32));
    var challenge = b64url(sha256(asciiBytes(verifier)));
    var topic = 'framehome-alexa-' + b64url(randomBytes(15)).replace(/[-_]/g, 'x');
    var since = Math.floor(Date.now() / 1000) - 5, stopped = false, timer = null;
    onUrl(sendPage + '#t=' + topic + '&c=' + challenge + '&i=' + client);
    function poll() {
      if (stopped) return;
      request({ url: relay + '/' + topic + '/json?poll=1&since=' + since }, function (r) {
        if (stopped) return;
        var lines = (r.text || '').split('\n'), i, m, msg;
        for (i = 0; i < lines.length; i++) {
          try { m = JSON.parse(lines[i]); } catch (e) { continue; }
          if (!m || m.event !== 'message') continue;
          try { msg = JSON.parse(m.message || ''); } catch (e) { msg = null; }
          if (msg && typeof msg.code === 'string' && /^[A-Za-z0-9_-]{6,400}$/.test(msg.code)) {
            stopped = true;
            onCode();
            register(serial, client, verifier, msg.code, msg.domain === 'com' ? 'com' : 'de', done);
            return;
          }
        }
        timer = setTimeout(poll, r.status === 429 ? 15000 : 4000);
      });
    }
    poll();
    return function () { stopped = true; clearTimeout(timer); };
  }
  function register(serial, client, verifier, code, domain, done) {
    var body = {
      requested_extensions: ['device_info', 'customer_info'],
      cookies: { website_cookies: [], domain: '.amazon.' + domain },
      registration_data: { domain: 'Device', app_version: APP_VERSION, device_type: DEVICE_TYPE, device_name: '%FIRST_NAME%\'s%DUPE_STRATEGY_1ST%' + APP_NAME,
        os_version: '18.5', device_serial: serial, device_model: 'iPhone', app_name: APP_NAME, software_version: '35602678' },
      auth_data: { use_global_authentication: 'true', client_id: client, authorization_code: code, code_verifier: verifier, code_algorithm: 'SHA-256', client_domain: 'DeviceLegacy' },
      user_context_map: { frc: b64(randomBytes(313)).replace(/=+$/, '') },
      requested_token_type: ['bearer', 'mac_dms', 'website_cookies', 'store_authentication_cookie']
    };
    request({ method: 'POST', url: 'https://api.amazon.com/auth/register', headers: { 'Content-Type': 'application/json; charset=utf-8', 'Accept-Language': 'en-US' }, body: JSON.stringify(body) }, function (r) {
      var s = r.json && r.json.response && r.json.response.success, bearer = s && s.tokens && s.tokens.bearer;
      if (!bearer || !bearer.refresh_token) { done(why(r)); return; }
      state = { serial: serial, domain: domain, site: domain, refresh: bearer.refresh_token, access: bearer.access_token || '', at: Date.now() };
      persist();
      /* The Alexa site can differ from the sign-in site; users/me tells which one serves this account. */
      call({ url: '/api/users/me' }, function (err, json) {
        var host = json && typeof json.marketPlaceDomainName === 'string' ? json.marketPlaceDomainName : '';
        var m = /amazon\.(com|de|co\.uk)$/.exec(host.replace(/^https?:\/\/(www\.)?/, '').replace(/\/$/, ''));
        if (m && m[1] !== state.site) { state.site = m[1]; persist(); }
        done(null);
      });
    });
  }
  function forget() { state = null; persist(); }

  /* ---------- authorised calls ---------- */
  function token(force, done) {
    if (!state) { done('signed out'); return; }
    if (!force && state.access && Date.now() - state.at < TOKEN_TTL) { done(null, state.access); return; }
    request({ method: 'POST', url: 'https://api.amazon.com/auth/token', headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: form({ app_name: APP_NAME, app_version: APP_VERSION, 'di.sdk.version': '6.12.4', source_token: state.refresh, package_name: 'com.amazon.echo',
        'di.hw.version': 'iPhone', platform: 'iOS', requested_token_type: 'access_token', source_token_type: 'refresh_token',
        'di.os.name': 'iOS', 'di.os.version': '18.5', current_version: '6.12.4', previous_version: '6.12.4', domain: 'www.amazon.' + state.domain }) }, function (r) {
      if (!state) { done('signed out'); return; }
      if (r.json && r.json.access_token) { state.access = r.json.access_token; state.at = Date.now(); persist(); done(null, state.access); return; }
      /* A refused refresh token means the device was removed in the Amazon account. */
      if (r.status === 400 || r.status === 401) { done('revoked'); return; }
      done(why(r));
    });
  }
  function unauthenticated(r) {
    if (r.status === 401 || r.status === 403) return true;
    var errs = r.json && (r.json.errors || r.json[0] && r.json[0].errors);
    return !!(errs && errs.length && /unauthenticated|forbidden/i.test(JSON.stringify(errs)));
  }
  function call(o, done, retried) {
    token(!!retried, function (err, access) {
      if (err) { done(err); return; }
      request({ method: o.method || 'GET', url: 'https://alexa.amazon.' + state.site + o.url, timeout: o.timeout,
        headers: { 'Content-Type': 'application/json; charset=utf-8', 'Authorization': 'Bearer ' + access }, body: o.body ? JSON.stringify(o.body) : null }, function (r) {
        if (unauthenticated(r) && !retried) { call(o, done, true); return; }
        if (r.status !== 200 || !r.json) { done(unauthenticated(r) ? 'revoked' : why(r)); return; }
        done(null, r.json);
      });
    });
  }
  function graph(body, done) {
    call({ method: 'POST', url: '/nexus/v1/graphql', body: body }, function (err, json) {
      if (err) { done(err); return; }
      var data = (json && (Array.isArray(json) ? json[0] : json) || {}).data;
      if (!data) { done('no data'); return; }
      done(null, data);
    });
  }

  /* ---------- devices ---------- */
  function describe(e) {
    var d = { id: e.endpointId, temp: null, power: null, power_feature: '', instance: null, on: 'turnOn', off: 'turnOff', reachable: true };
    (e.features || []).forEach(function (f) {
      (f.properties || []).forEach(function (p) {
        if (p.__typename === 'TemperatureSensor' && p.value && typeof p.value.value === 'number' && p.value.value > -280) d.temp = p.value.scale === 'FAHRENHEIT' ? (p.value.value - 32) * 5 / 9 : p.value.value;
        if (p.__typename === 'Power' && p.powerStateValue) {
          d.power = p.powerStateValue === 'ON'; d.power_feature = f.name || 'power'; d.instance = f.instance || null;
          (f.operations || []).forEach(function (op) {
            if (/^turn_?on$/i.test(op.name)) d.on = op.name;
            if (/^turn_?off$/i.test(op.name)) d.off = op.name;
          });
        }
        if (p.__typename === 'Reachability' && p.reachabilityStatusValue) d.reachable = p.reachabilityStatusValue !== 'NOT_REACHABLE';
      });
    });
    return d;
  }
  /* Current values for the given endpoint ids: done(err, { id: description }). */
  function read(ids, done) {
    var out = {}, batches = [], i;
    for (i = 0; i < ids.length; i += 25) batches.push(ids.slice(i, i + 25));
    (function nextBatch(b) {
      if (b >= batches.length) { done(null, out); return; }
      graph([{ operationName: 'getEndpointFeatures', variables: { endpointIds: batches[b] }, query: FEATURES_QUERY }], function (err, data) {
        if (err) { done(err); return; }
        ((data.listEndpoints || {}).endpoints || []).forEach(function (e) { out[e.endpointId] = describe(e); });
        nextBatch(b + 1);
      });
    }(0));
  }
  /* All devices with a temperature or an on/off state: done(err, [{ id, name, temp, power, ... }]). */
  function devices(done) {
    graph({ operationName: 'getDevicesBaseData', query: DEVICES_QUERY }, function (err, data) {
      if (err) { done(err); return; }
      var names = {}, ids = [];
      ((data.listEndpoints || {}).endpoints || []).forEach(function (e) {
        if (!e || typeof e.endpointId !== 'string') return;
        names[e.endpointId] = { name: e.friendlyNameObject && e.friendlyNameObject.value && e.friendlyNameObject.value.text || '', category: e.displayCategories && e.displayCategories.primary && e.displayCategories.primary.value || '' };
        ids.push(e.endpointId);
      });
      read(ids, function (err2, states) {
        if (err2) { done(err2); return; }
        var list = [];
        ids.forEach(function (id) {
          var d = states[id];
          if (!d || (d.temp === null && d.power === null)) return;
          d.name = names[id].name || id; d.category = names[id].category;
          list.push(d);
        });
        list.sort(function (a, b) { return a.name.toLowerCase() < b.name.toLowerCase() ? -1 : a.name.toLowerCase() > b.name.toLowerCase() ? 1 : 0; });
        done(null, list);
      });
    });
  }
  function setPower(device, on, done) {
    var req = { endpointId: device.id, featureName: device.power_feature || 'power', featureOperationName: on ? device.on || 'turnOn' : device.off || 'turnOff' };
    if (device.instance) req.instance = device.instance;
    graph([{ operationName: 'setEndpointFeatures', variables: { setEndpointFeaturesInput: { featureControlRequests: [req] } }, query: SET_MUTATION }], function (err, data) {
      if (err) { done(err); return; }
      var result = data.setEndpointFeatures || {};
      if (result.errors && result.errors.length) { done(result.errors[0].code || 'refused'); return; }
      if (!result.featureControlResponses || !result.featureControlResponses.length) { done('no answer'); return; }
      done(null);
    });
  }

  window.FrameAlexa = {
    connected: function () { return !!state; },
    pair: pair, forget: forget, devices: devices, read: read, setPower: setPower,
    _sha256hex: function (s) { return hex(sha256(asciiBytes(s))); }
  };
}());
