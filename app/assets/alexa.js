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
    '{ endpoints { endpointId: id features { name instance operations { name } properties { name type __typename ' +
    '... on TemperatureSensor { value { value scale } timeOfSample } ... on Power { powerStateValue timeOfSample } ' +
    '... on RangeValue { rangeValue { value } } ... on ToggleState { toggleStateValue } ... on Brightness { brightnessStateValue } ' +
    '... on Reachability { reachabilityStatusValue } } ' +
    'configuration { __typename ... on RangeConfiguration { friendlyName { value { text } } unitOfMeasure { value { text } } } } } } } }';
  var SET_MUTATION = 'mutation setEndpointFeatures($setEndpointFeaturesInput: SetEndpointFeaturesInput!) { setEndpointFeatures(setEndpointFeaturesInput: $setEndpointFeaturesInput) ' +
    '{ featureControlResponses { endpointId featureName instance featureOperationName code } errors { endpointId featureName instance featureOperationName code message } } }';

  /* ---------- storage ---------- */
  var state = (function () { try { return JSON.parse(localStorage.getItem(STORE) || 'null'); } catch (e) { return null; } }());
  if (!state || typeof state.refresh !== 'string' || !state.refresh) state = null;
  function persist() { try { if (state) localStorage.setItem(STORE, JSON.stringify(state)); else localStorage.removeItem(STORE); return true; } catch (e) { return false; } }

  var P = window.FramePKCE, request = P.request, form = P.form, why = P.why, randomBytes = P.randomBytes, hex = P.hex, asciiBytes = P.asciiBytes, b64 = P.b64;

  /* ---------- sign-in ---------- */
  /* Shows a QR code (through onUrl), waits for the code from the phone page and registers.
     Returns a cancel function. done(error) with error null on success. */
  function pair(sendPage, relay, onUrl, onCode, done) {
    var serial = hex(randomBytes(16)).toUpperCase();
    var client = hex(asciiBytes(serial + '#' + DEVICE_TYPE));
    var pk = P.pkce(), topic = P.topic('framehome-alexa-');
    onUrl(sendPage + '#t=' + topic + '&c=' + pk.challenge + '&i=' + client);
    return P.listen(relay, topic, function (msg) {
      onCode();
      register(serial, client, pk.verifier, msg.code, msg.domain === 'com' ? 'com' : 'de', done);
      return true;
    });
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
  /* One device: on/off state and every reading (temperature, and range values such as humidity).
     `props` lists every property by feature and type, for the device details screen. */
  function unitOf(text) {
    if (/percent/i.test(text)) return '%';
    if (/celsius|temperature/i.test(text)) return '°';
    if (/fahrenheit/i.test(text)) return '°F';
    return '';
  }
  function describe(e) {
    var d = { id: e.endpointId, temp: null, power: null, power_feature: '', instance: null, on: 'turnOn', off: 'turnOff', reachable: true, readings: [], props: [] };
    (e.features || []).forEach(function (f) {
      var conf = f.configuration || {}, confName = conf.friendlyName && conf.friendlyName.value && conf.friendlyName.value.text || '';
      var unit = conf.unitOfMeasure && conf.unitOfMeasure.value && conf.unitOfMeasure.value.text || '';
      (f.properties || []).forEach(function (p) {
        var value = null, label;
        if (p.__typename === 'TemperatureSensor' && p.value && typeof p.value.value === 'number' && p.value.value > -280) {
          d.temp = p.value.scale === 'FAHRENHEIT' ? (p.value.value - 32) * 5 / 9 : p.value.value;
          d.readings.push({ key: 'temp', label: 'Temperature', value: d.temp, unit: '°', kind: 'temp' });
          value = d.temp;
        }
        if (p.__typename === 'RangeValue' && p.rangeValue && typeof p.rangeValue.value === 'number') {
          value = p.rangeValue.value;
          label = confName || f.instance || f.name || p.name || 'Value';
          var humid = /humid|nedvess|páratart/i.test(label + ' ' + (f.instance || '') + ' ' + (f.name || ''));
          d.readings.push({ key: 'range:' + (f.instance || f.name || p.name), label: humid ? 'Humidity' : label, value: value, unit: humid ? '%' : unitOf(unit), kind: humid ? 'humidity' : 'range' });
        }
        if (p.__typename === 'Power' && p.powerStateValue) {
          d.power = p.powerStateValue === 'ON'; d.power_feature = f.name || 'power'; d.instance = f.instance || null; value = p.powerStateValue;
          (f.operations || []).forEach(function (op) {
            if (/^turn_?on$/i.test(op.name)) d.on = op.name;
            if (/^turn_?off$/i.test(op.name)) d.off = op.name;
          });
        }
        if (p.__typename === 'ToggleState') value = p.toggleStateValue;
        if (p.__typename === 'Brightness') value = p.brightnessStateValue;
        if (p.__typename === 'Reachability' && p.reachabilityStatusValue) { d.reachable = p.reachabilityStatusValue !== 'NOT_REACHABLE'; value = p.reachabilityStatusValue; }
        d.props.push({ feature: (f.name || '') + (f.instance ? '/' + f.instance : ''), type: p.__typename || p.type || '', name: p.name || '', value: value, label: confName, unit: unit });
      });
    });
    return d;
  }
  /* Current values for the given endpoint ids: done(err, { id: description }). */
  /* done(err, { id: device }) for the ids asked. Alexa may answer a batch with no endpoints at all, and no
     error, when one id in it is no longer known (a device removed, or added again under a new id): one
     bad id would then freeze every value on Home. So when a batch of several ids comes back empty, each id
     is asked on its own, and an id that gets no answer on its own either is left out for ten minutes. */
  var dead = {}, DEAD_MS = 10 * 60 * 1000;
  function read(ids, done) {
    var out = {}, batches = [], now = Date.now(), live = ids.filter(function (id) { return !(dead[id] && now - dead[id] < DEAD_MS); }), i;
    for (i = 0; i < live.length; i += 25) batches.push(live.slice(i, i + 25));
    function ask(list, cb) {
      graph([{ operationName: 'getEndpointFeatures', variables: { endpointIds: list }, query: FEATURES_QUERY }], function (err, data) {
        var n = 0;
        if (!err) ((data.listEndpoints || {}).endpoints || []).forEach(function (e) { if (e && typeof e.endpointId === 'string') { out[e.endpointId] = describe(e); delete dead[e.endpointId]; n++; } });
        cb(err, n);
      });
    }
    (function nextBatch(b) {
      if (b >= batches.length) { done(null, out); return; }
      ask(batches[b], function (err, n) {
        /* 'no data': Alexa answered, but with errors only, which a bad id can also cause. */
        if (err && !(err === 'no data' && batches[b].length > 1)) { done(err); return; }
        if (n || batches[b].length < 2) { nextBatch(b + 1); return; }
        (function one(k) {
          if (k >= batches[b].length) { nextBatch(b + 1); return; }
          ask([batches[b][k]], function (err2, n2) { if (!n2 && (!err2 || err2 === 'no data')) dead[batches[b][k]] = Date.now(); one(k + 1); });
        }(0));
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
          if (!d || (!d.readings.length && d.power === null && !d.props.length)) return;
          d.name = names[id].name || id; d.category = names[id].category;
          list.push(d);
        });
        list.sort(function (a, b) { return a.name.toLowerCase() < b.name.toLowerCase() ? -1 : a.name.toLowerCase() > b.name.toLowerCase() ? 1 : 0; });
        done(null, list);
      });
    });
  }
  /* Switches one or more devices in a single request. */
  function setPower(devices, on, done) {
    var reqs = (Array.isArray(devices) ? devices : [devices]).map(function (device) {
      var req = { endpointId: device.id, featureName: device.power_feature || 'power', featureOperationName: on ? device.on || 'turnOn' : device.off || 'turnOff' };
      if (device.instance) req.instance = device.instance;
      return req;
    });
    if (!reqs.length) { done('nothing to switch'); return; }
    graph([{ operationName: 'setEndpointFeatures', variables: { setEndpointFeaturesInput: { featureControlRequests: reqs } }, query: SET_MUTATION }], function (err, data) {
      if (err) { done(err); return; }
      var result = data.setEndpointFeatures || {};
      if (!result.featureControlResponses || !result.featureControlResponses.length) { done(result.errors && result.errors.length ? result.errors[0].code || 'refused' : 'no answer'); return; }
      /* Some members may fail while others switch: report the failures, keep the rest. */
      done(null, (result.errors || []).map(function (e) { return e.endpointId; }));
    });
  }

  window.FrameAlexa = {
    connected: function () { return !!state; },
    pair: pair, forget: forget, devices: devices, read: read, setPower: setPower
  };
}());
