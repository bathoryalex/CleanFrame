/* Kifli: the next grocery delivery (time slot, Kifli's estimated arrival and delay notice) from
   Kifli's official MCP server. Read only: the TV only ever calls the `fetch_orders` tool. ES5 only.

   Sign-in is OAuth 2.1 with PKCE against identity.kifli.hu, the authorization server that
   mcp.kifli.hu names in its protected-resource metadata. The TV registers itself once as a public
   client ("Frame Home", dynamic client registration, no secret). The QR code opens docs/kifli/ with
   the channel, the PKCE challenge and the client id in the fragment; that page sends you to Kifli's
   sign-in, and Kifli returns there with a one-time code that the page posts to the TV's ntfy.sh
   channel. The code is useless without the verifier that stays on the TV.

   The MCP server speaks JSON-RPC over HTTP (Streamable HTTP transport): initialize once, then
   tools/call. Answers come as JSON or as a short event stream; both are read. */
(function () {
  'use strict';
  var P = window.FramePKCE, cfg = window.FrameFork && window.FrameFork.kifli || {};
  var STORE = 'cleanframe.kifli.v1', MCP = 'https://mcp.kifli.hu/mcp', ID = 'https://identity.kifli.hu';
  var TOKEN = ID + '/oauth2/token', REGISTER = ID + '/connect/register', PROTOCOL = '2025-06-18', SCOPE = 'openid email roles';
  if (!P) return;

  /* { client: registered client id, redirect: the page it was registered for, refresh, access, until } */
  var state = (function () { try { return JSON.parse(localStorage.getItem(STORE) || 'null'); } catch (e) { return null; } }()) || {};
  if (typeof state.client !== 'string') state.client = '';
  if (typeof state.refresh !== 'string') state.refresh = '';
  function persist() { try { localStorage.setItem(STORE, JSON.stringify(state)); return true; } catch (e) { return false; } }
  var session = '', sessionBusy = null;

  /* One registration per TV and sign-in page; kept after a sign-out so it is not repeated. */
  function client(done) {
    if (state.client && state.redirect === cfg.page) { done(null, state.client); return; }
    P.request({ method: 'POST', url: REGISTER, headers: { 'Content-Type': 'application/json', 'Accept': 'application/json' },
      body: JSON.stringify({ client_name: 'Frame Home', redirect_uris: [cfg.page], grant_types: ['authorization_code', 'refresh_token'],
        response_types: ['code'], token_endpoint_auth_method: 'none', scope: SCOPE }) }, function (r) {
      var id = r.json && r.json.client_id;
      if (typeof id === 'string' && /^[A-Za-z0-9._~:-]{4,200}$/.test(id)) { state.client = id; state.redirect = cfg.page; persist(); done(null, id); return; }
      done('register ' + P.why(r));
    });
  }
  function pair(relay, onUrl, onCode, done) {
    var stopped = false, stop = null;
    client(function (err, id) {
      if (stopped) return;
      if (err) { done(err); return; }
      var pk = P.pkce(), topic = P.topic('framehome-kifli-');
      onUrl(cfg.page + '#t=' + topic + '&c=' + pk.challenge + '&i=' + encodeURIComponent(id));
      stop = P.listen(relay, topic, function (msg) {
        onCode();
        tokenRequest({ grant_type: 'authorization_code', code: msg.code, redirect_uri: cfg.page, client_id: id, code_verifier: pk.verifier, resource: MCP }, function (e) { done(e); });
        return true;
      });
    });
    return function () { stopped = true; if (stop) stop(); };
  }
  function tokenRequest(fields, done) {
    P.request({ method: 'POST', url: TOKEN, headers: { 'Content-Type': 'application/x-www-form-urlencoded', 'Accept': 'application/json' }, body: P.form(fields) }, function (r) {
      var j = r.json;
      if (j && j.access_token) {
        state.refresh = j.refresh_token || state.refresh; state.access = j.access_token;
        state.until = Date.now() + Math.max(60, (j.expires_in || 3600) - 120) * 1000;
        session = ''; persist(); done(null, state.access); return;
      }
      done(j && (j.error === 'invalid_grant' || j.error === 'invalid_client') ? 'revoked' : 'token ' + P.why(r));
    });
  }
  function token(force, done) {
    if (!state.refresh) { done('signed out'); return; }
    if (!force && state.access && Date.now() < state.until) { done(null, state.access); return; }
    tokenRequest({ grant_type: 'refresh_token', refresh_token: state.refresh, client_id: state.client, resource: MCP }, done);
  }
  function forget() { state.refresh = ''; state.access = ''; state.until = 0; session = ''; persist(); }

  /* A JSON-RPC answer, as JSON or as server-sent events (the last `data:` line with our id). */
  function rpcAnswer(r, id) {
    if (r.json && (r.json.result || r.json.error)) return r.json;
    var lines = String(r.text || '').split(/\r?\n/), i, m, out = null;
    for (i = 0; i < lines.length; i++) {
      if (lines[i].indexOf('data:') !== 0) continue;
      try { m = JSON.parse(lines[i].slice(5)); } catch (e) { continue; }
      if (m && m.id === id) out = m;
    }
    return out;
  }
  var seq = 0;
  function post(body, access, done) {
    var headers = { 'Authorization': 'Bearer ' + access, 'Content-Type': 'application/json', 'Accept': 'application/json, text/event-stream', 'MCP-Protocol-Version': PROTOCOL };
    if (session) headers['Mcp-Session-Id'] = session;
    P.request({ method: 'POST', url: MCP, headers: headers, body: JSON.stringify(body), timeout: 20000 }, done);
  }
  function initialize(access, done) {
    var id = ++seq;
    post({ jsonrpc: '2.0', id: id, method: 'initialize', params: { protocolVersion: PROTOCOL, capabilities: {}, clientInfo: { name: 'Frame Home', version: '1' } } }, access, function (r) {
      var a = rpcAnswer(r, id);
      if (r.status === 401) { done('401'); return; }
      if (!a || !a.result) { done('mcp ' + P.why(r)); return; }
      session = r.header && r.header('Mcp-Session-Id') || '';
      post({ jsonrpc: '2.0', method: 'notifications/initialized' }, access, function () { done(null); });
    });
  }
  /* tools/call with one retry: a fresh token on 401, a fresh session when the server dropped ours. */
  function call(name, args, done, retried) {
    token(retried === 'token', function (err, access) {
      if (err) { done(err); return; }
      function go() {
        var id = ++seq;
        post({ jsonrpc: '2.0', id: id, method: 'tools/call', params: { name: name, arguments: args } }, access, function (r) {
          var a = rpcAnswer(r, id);
          if (r.status === 401 && !retried) { session = ''; call(name, args, done, 'token'); return; }
          if (r.status === 401) { done('revoked'); return; }
          if ((r.status === 404 || r.status === 400) && session && !retried) { session = ''; call(name, args, done, 'session'); return; }
          if (r.status === 429) { done('busy'); return; }
          if (!a) { done('mcp ' + P.why(r)); return; }
          if (a.error) { done('mcp ' + (a.error.code || '') + ' ' + (a.error.message || '')); return; }
          done(null, toolData(a.result));
        });
      }
      if (session) { go(); return; }
      initialize(access, function (e) {
        if (e === '401' && !retried) { call(name, args, done, 'token'); return; }
        if (e) { done(e === '401' ? 'revoked' : e); return; }
        go();
      });
    });
  }
  /* The tool's JSON: structuredContent when the server sends it, else the text content. Kifli wraps it
     in { result: … } in some answers. */
  function toolData(res) {
    var j = res && res.structuredContent || null, c = res && res.content || [], i;
    for (i = 0; !j && i < c.length; i++) if (c[i] && c[i].type === 'text') { try { j = JSON.parse(c[i].text); } catch (e) { j = null; } }
    if (j && j.result && typeof j.result === 'object' && !j.orders) j = j.result;
    return j || {};
  }

  /* ---------- What the TV keeps: no items, no address, no notes ---------- */
  function plain(html) { return String(html || '').replace(/<br\s*\/?>/gi, ' ').replace(/<[^>]*>/g, '').replace(/&nbsp;/g, ' ').replace(/&amp;/g, '&').replace(/\s+/g, ' ').trim(); }
  /* "2026-11-26 17:30-17:45" → { day: '2026-11-26', from: '17:30', to: '17:45' }. */
  function slotOf(o) {
    var m = /^(\d{4}-\d{2}-\d{2})\s+(\d{1,2}:\d{2})\s*-\s*(\d{1,2}:\d{2})/.exec(o && o.deliverySlot && o.deliverySlot.timeRange || '');
    return m ? { day: m[1], from: pad(m[2]), to: pad(m[3]), type: String(o.deliverySlot.type || '') } : null;
  }
  function pad(t) { return t.length === 4 ? '0' + t : t; }
  /* Kifli's estimate is free text ("…várhatóan <span>17:22-kor</span> kézbesíti a futár…"): the time in
     the highlighted part, else the first time in the message. */
  function etaOf(content) {
    var span = /<span[^>]*>([^<]*)<\/span>/i.exec(content || ''), m = /\b(\d{1,2})[:.](\d{2})\b/.exec(span ? span[1] : '') || /\b(\d{1,2})[:.](\d{2})\b/.exec(plain(content));
    return m && +m[1] < 24 && +m[2] < 60 ? pad(m[1] + ':' + m[2]) : '';
  }
  function announcementFor(list, id, only) {
    var hit = null;
    (list || []).forEach(function (a) {
      var links = (a && a.buttons || []).map(function (b) { return String(b && b.link || ''); }).join(' ');
      if (!hit && new RegExp('[?&](?:orderId|id)=' + id + '\\b').test(links)) hit = a;
    });
    return hit || (only && list && list[0]) || null;
  }
  function summary(o, list, only) {
    var a = announcementFor(list, o.id, only), slot = slotOf(o);
    return { id: +o.id || 0, state: String(o.state || ''), slot: slot, items: +o.itemsCount || 0,
      eta: a ? etaOf(a.content) : '', title: a ? plain(a.title) : '', message: a ? plain(a.content) : '',
      delayed: !!(a && a.isDelayed), tone: a ? String(a.type || '') : '', updated: a && a.updatedAt || '' };
  }
  /* done(err, next) with next null when nothing is on its way. The soonest upcoming order wins. */
  function next(done) {
    call('fetch_orders', { order_type: 'upcoming', limit: 3, context: 'Show the next delivery time on the TV home screen.' }, function (err, j) {
      if (err) { done(err); return; }
      var orders = (j.orders || []).filter(function (o) { return o && o.id && slotOf(o); }), list = j.deliveryAnnouncements || [];
      orders.sort(function (a, b) { var x = slotOf(a), y = slotOf(b); return (x.day + x.from) < (y.day + y.from) ? -1 : 1; });
      done(null, orders.length ? summary(orders[0], list, orders.length === 1) : null);
    });
  }
  /* After an order leaves the upcoming list: was it delivered (and not cancelled)? */
  function delivered(id, done) {
    call('fetch_orders', { order_id: id, context: 'Check whether the delivery shown on the TV has arrived.' }, function (err, j) {
      if (err) { done(err); return; }
      var o = (j.orders || [])[0];
      done(null, !!(o && +o.id === +id && /DELIVERED/i.test(o.state || '')));
    });
  }

  window.FrameKifli = {
    configured: !!cfg.page,
    connected: function () { return !!state.refresh; },
    pair: pair, forget: forget, next: next, delivered: delivered,
    _test: { etaOf: etaOf, plain: plain, toolData: toolData }
  };
}());
