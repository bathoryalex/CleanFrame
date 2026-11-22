/* Spotify: what is playing on any of your Spotify devices, and play/pause/skip from the remote.
   Official Spotify Web API with Authorization Code + PKCE (no client secret). ES5 only.

   The QR code opens docs/spotify/ with the channel, the PKCE challenge and the client id in the
   fragment. That page sends you to Spotify's sign-in; Spotify returns to the same page with a
   one-time code, which the page posts to the TV's ntfy.sh channel. The code is useless without the
   verifier that stays on the TV. Playback control needs Spotify Premium. */
(function () {
  'use strict';
  var P = window.FramePKCE, cfg = window.FrameFork && window.FrameFork.spotify || {};
  var STORE = 'cleanframe.spotify.v1', API = 'https://api.spotify.com/v1', ACCOUNTS = 'https://accounts.spotify.com/api/token';
  var SCOPES = 'user-read-currently-playing user-read-playback-state user-modify-playback-state';
  if (!P) return;

  var state = (function () { try { return JSON.parse(localStorage.getItem(STORE) || 'null'); } catch (e) { return null; } }());
  if (!state || typeof state.refresh !== 'string' || !state.refresh) state = null;
  function persist() { try { if (state) localStorage.setItem(STORE, JSON.stringify(state)); else localStorage.removeItem(STORE); return true; } catch (e) { return false; } }

  function pair(relay, onUrl, onCode, done) {
    var pk = P.pkce(), topic = P.topic('framehome-spotify-');
    onUrl(cfg.page + '#t=' + topic + '&c=' + pk.challenge + '&i=' + cfg.clientId + '&s=' + encodeURIComponent(SCOPES));
    return P.listen(relay, topic, function (msg) {
      onCode();
      tokenRequest({ grant_type: 'authorization_code', code: msg.code, redirect_uri: cfg.page, client_id: cfg.clientId, code_verifier: pk.verifier }, function (err) { done(err); });
      return true;
    });
  }
  /* Token endpoint for both the first exchange and refreshes. Spotify may rotate the refresh token. */
  function tokenRequest(fields, done) {
    P.request({ method: 'POST', url: ACCOUNTS, headers: { 'Content-Type': 'application/x-www-form-urlencoded' }, body: P.form(fields) }, function (r) {
      var j = r.json;
      if (j && j.access_token) {
        state = { refresh: j.refresh_token || state && state.refresh, access: j.access_token, until: Date.now() + Math.max(60, (j.expires_in || 3600) - 300) * 1000 };
        persist(); done(null, state.access); return;
      }
      done(j && j.error === 'invalid_grant' ? 'revoked' : P.why(r));
    });
  }
  function token(force, done) {
    if (!state) { done('signed out'); return; }
    if (!force && state.access && Date.now() < state.until) { done(null, state.access); return; }
    tokenRequest({ grant_type: 'refresh_token', refresh_token: state.refresh, client_id: cfg.clientId }, done);
  }
  function forget() { state = null; persist(); }

  /* done(err, json) with json null for 204. Errors: 'revoked', 'premium', 'no device', 'busy' or HTTP n. */
  function api(method, path, done, retried, json) {
    token(!!retried, function (err, access) {
      if (err) { done(err); return; }
      var headers = { 'Authorization': 'Bearer ' + access };
      if (json) headers['Content-Type'] = 'application/json';
      P.request({ method: method, url: API + path, headers: headers, body: method === 'GET' ? null : json ? JSON.stringify(json) : '' }, function (r) {
        var reason = r.json && r.json.error && (r.json.error.reason || r.json.error.message) || '';
        if (r.status === 401 && !retried) { api(method, path, done, true, json); return; }
        if (r.status === 204 || (r.status >= 200 && r.status < 300 && !r.text)) { done(null, null); return; }
        if (r.status >= 200 && r.status < 300) { done(null, r.json); return; }
        if (r.status === 401) { done('revoked'); return; }
        if (r.status === 403 && /premium/i.test(reason)) { done('premium'); return; }
        if (r.status === 404 || /no_active_device/i.test(reason)) { done('no device'); return; }
        if (r.status === 429) { done('busy'); return; }
        done(P.why(r) + (reason ? ' ' + reason : ''));
      });
    });
  }
  /* The smallest cover of at least `min` pixels (or the largest there is). */
  function artUrl(images, min) {
    var ok = (images || []).filter(function (im) { return im && /^https:\/\/i\.scdn\.co\//.test(im.url); }), best = null;
    ok.forEach(function (im) { if (!best || (best.width < min ? im.width > best.width : im.width >= min && im.width < best.width)) best = im; });
    return best ? best.url : '';
  }
  /* done(err, now) with now null when nothing is playing anywhere. */
  function nowPlaying(done) {
    api('GET', '/me/player?additional_types=episode', function (err, j) {
      if (err) { done(err); return; }
      var item = j && j.item;
      if (!item) { done(null, null); return; }
      done(null, {
        id: item.id || item.uri || '', playing: !!j.is_playing, title: item.name || '',
        artist: (item.artists || []).map(function (a) { return a.name; }).join(', ') || item.show && item.show.name || '',
        mainArtist: item.artists && item.artists[0] ? item.artists[0].name : '', episode: !item.artists,
        art: artUrl(item.album ? item.album.images : item.images, 64), artBig: artUrl(item.album ? item.album.images : item.images, 600),
        album: item.album && item.album.name || '', device: j.device && j.device.name || '', deviceId: j.device && j.device.id || '',
        progress: typeof j.progress_ms === 'number' ? j.progress_ms : 0, duration: item.duration_ms || 0, at: Date.now()
      });
    });
  }
  var CONTROL = { play: ['PUT', '/me/player/play'], pause: ['PUT', '/me/player/pause'], next: ['POST', '/me/player/next'], prev: ['POST', '/me/player/previous'] };
  function control(action, done, arg) {
    var c = CONTROL[action];
    /* Seek within the song: PUT /me/player/seek?position_ms= (Premium, like every playback control). */
    if (action === 'seek') { api('PUT', '/me/player/seek?position_ms=' + Math.max(0, Math.round(arg || 0)), function (err) { done(err); }); return; }
    if (!c) { done('unknown'); return; }
    api(c[0], c[1], function (err) { done(err); });
  }

  /* Spotify Connect: the devices Spotify can play on right now (GET /me/player/devices) and moving
     playback to one of them (PUT /me/player). Only devices that are on and signed in to Spotify are
     listed; restricted ones cannot be controlled through the Web API. Premium is needed to move. */
  function devices(done) {
    api('GET', '/me/player/devices', function (err, j) {
      if (err) { done(err); return; }
      done(null, ((j && j.devices) || []).filter(function (d) { return d && d.id; }).map(function (d) {
        return { id: String(d.id), name: String(d.name || ''), type: String(d.type || ''), active: !!d.is_active, restricted: !!d.is_restricted };
      }));
    });
  }
  function transfer(id, play, done) { api('PUT', '/me/player', function (err) { done(err); }, false, { device_ids: [id], play: !!play }); }

  /* Lyrics from LRCLIB (lrclib.net), an open community database: Spotify's own API has no lyrics.
     done(err, { synced: [{ t: ms, text }], plain: '' }); err 'none' when the song is not there. */
  var LRCLIB = 'https://lrclib.net/api', lyricCache = {};
  function parseLrc(lrc) {
    var out = [];
    String(lrc || '').split(/\r?\n/).forEach(function (line) {
      var times = [], m, re = /\[(\d+):(\d+(?:[.:]\d+)?)\]/g, text;
      while ((m = re.exec(line))) times.push((+m[1] * 60 + parseFloat(m[2].replace(':', '.'))) * 1000);
      text = line.replace(/\[[^\]]*\]/g, '').trim();
      times.forEach(function (t) { out.push({ t: Math.round(t), text: text }); });
    });
    return out.sort(function (a, b) { return a.t - b.t; });
  }
  function lyricResult(j) { return j && (j.syncedLyrics || j.plainLyrics) ? { synced: parseLrc(j.syncedLyrics), plain: j.plainLyrics || '', instrumental: !!j.instrumental } : null; }
  function lyrics(now, done) {
    var key = now.id || now.title + '|' + now.mainArtist, q;
    if (lyricCache[key]) { done(null, lyricCache[key]); return; }
    if (now.episode || !now.mainArtist) { done('none'); return; }
    q = 'track_name=' + encodeURIComponent(now.title) + '&artist_name=' + encodeURIComponent(now.mainArtist);
    P.request({ url: LRCLIB + '/get?' + q + (now.album ? '&album_name=' + encodeURIComponent(now.album) : '') + (now.duration ? '&duration=' + Math.round(now.duration / 1000) : '') }, function (r) {
      var found = r.status === 200 && lyricResult(r.json);
      if (found) { lyricCache[key] = found; done(null, found); return; }
      if (r.status && r.status !== 404) { done(P.why(r)); return; }
      /* Not an exact match: search by title and artist and take the closest length. */
      P.request({ url: LRCLIB + '/search?' + q }, function (r2) {
        var best = null, list = r2.status === 200 && Array.isArray(r2.json) ? r2.json : [];
        list.forEach(function (j) {
          if (!lyricResult(j)) return;
          var diff = Math.abs((j.duration || 0) * 1000 - (now.duration || 0));
          if (!best || (j.syncedLyrics && !best.j.syncedLyrics) || (!!j.syncedLyrics === !!best.j.syncedLyrics && diff < best.diff)) best = { j: j, diff: diff };
        });
        if (!best) { done(r2.status && r2.status !== 200 ? P.why(r2) : 'none'); return; }
        lyricCache[key] = lyricResult(best.j); done(null, lyricCache[key]);
      });
    });
  }

  window.FrameSpotify = {
    configured: !!(cfg.clientId && /^[0-9a-f]{32}$/.test(cfg.clientId) && cfg.page),
    connected: function () { return !!state; },
    pair: pair, forget: forget, nowPlaying: nowPlaying, control: control, lyrics: lyrics, devices: devices, transfer: transfer
  };
}());
