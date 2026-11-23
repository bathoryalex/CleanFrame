// Production UI checks. Mock only the public Tizen boundary; never contact a TV.
import { createHash } from 'node:crypto';
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { openPreview, root } from './browser.mjs';

const KEY = 'cleanframe.home.v1';
const PRIMARY = ['hdmi-1', 'hdmi-2', 'nuvio', 'youtube', 'spotify', 'hbomax', 'smartthings', 'browser'];
const IDS = ['hdmi-1', 'hdmi-2', 'NuvioTV002.Nuvio', '9Ur5IzDKqV.TizenYouTube', 'rJeHak5zRg.Spotify', '5b8c3eb16b.BeamCTVDev', 'com.samsung.tv.SmartThingsApp', 'org.tizen.browser'];
const NAMES = ['Xbox', 'Nintendo Switch', 'Nuvio Legacy', 'YouTube', 'Spotify', 'HBO Max', 'SmartThings', 'Internet'];
const EXTRA = 'AbCdEf1234.FamilyApp', SPOTIFY = 'rJeHak5zRg.Spotify';
const UNSAFE_NAME = 'Family <img src=x onerror="window.__catalogXss=1"> & TV';
const CATALOG = IDS.map((id, i) => ({ id, name: NAMES[i], show: true, iconPath: '' })).concat([
  { id: EXTRA, name: UNSAFE_NAME, show: true, iconPath: '' },
  { id: SPOTIFY, name: 'Spotify', show: true, iconPath: '' },
  { id: '5b8c3eb16b.BeamCTVDev', name: 'HBO Max', show: true, iconPath: '' },
  { id: 'AlexFrmH01.FrameHome', name: 'CleanFrame', show: true },
  { id: 'AbCdEf1234.worker', name: 'Background worker', show: true },
  { id: 'com.samsung.tv.cobalt-yt', name: 'YouTube', show: true }
]);
const walls = JSON.parse(readFileSync(root + 'app/assets/wallpapers/SOURCES.json', 'utf8'));
const out = root + '.local/qa/';
mkdirSync(out, { recursive: true });
const sourceFiles = ['app/main.js', 'app/device.js', 'app/index.html', 'app/style.css', 'app/config.xml', 'app/assets/wallpapers/SOURCES.json', 'app/assets/wallpapers/catalog.js', 'app/assets/adaptive-ink.js', 'app/assets/icons/metrics.js'];
const hashes = () => Object.fromEntries(sourceFiles.map(f => [f, createHash('sha256').update(readFileSync(root + f)).digest('hex')]));
const report = { scope: 'Production UI in Chromium; mock public Tizen API only; no TV contacted.', sourceBefore: hashes(), checks: [], failures: [], pageErrors: [], expectedNetworkFailures: [] };
const same = (a, b) => JSON.stringify(a) === JSON.stringify(b);
const baseline = (patch = {}) => ({ dock: PRIMARY.slice(), wallpaper: walls[0].id, mode: 'fixed', lastApp: 'youtube', theme: 'shore', ...patch });
let preview, current, section = '';

function check(name, pass, detail) {
  const result = { section, name, passed: !!pass, ...(pass ? {} : { detail }) };
  report.checks.push(result);
  if (!pass) { report.failures.push(result); throw Error(name + (detail ? ': ' + JSON.stringify(detail).slice(0, 500) : '')); }
}
async function run(name, fn) {
  if (process.env.CHECK_SECTION && !name.toLowerCase().includes(process.env.CHECK_SECTION.toLowerCase())) return;
  section = name;
  try { await fn(); console.log(name + ': passed'); }
  catch (error) { if (!report.failures.some(f => f.section === name)) report.failures.push({ section: name, error: error.stack }); console.error(name + ': ' + error.message); }
  finally { await closePage(); }
}
async function closePage() { if (current) { current.__closing = true; await current.close(); current = null; } }

// Production still calls its unmodified device.js adapter.
function installHarness({ seed, legacy, mock, catalog, minuteMs, catalogFailure, noFontAPI, storageFailure }) {
  if (!sessionStorage.getItem('__cleanframe_seeded')) {
    if (seed !== undefined) localStorage.setItem('cleanframe.home.v1', typeof seed === 'string' ? seed : JSON.stringify(seed));
    if (legacy !== undefined) localStorage.setItem('cleanframe.shore.v1', typeof legacy === 'string' ? legacy : JSON.stringify(legacy));
    sessionStorage.setItem('__cleanframe_seeded', '1');
  }
  window.ShoreQA = { minuteMs };
  window.__failWrites = !!storageFailure;
  window.__storageAttempts = 0;
  const set = Storage.prototype.setItem;
  Storage.prototype.setItem = function (key, value) {
    if (key === 'cleanframe.home.v1') window.__storageAttempts++;
    if (window.__failWrites && key === 'cleanframe.home.v1') throw new DOMException('QA storage failure', 'QuotaExceededError');
    return set.call(this, key, value);
  };
  window.__setHidden = value => {
    Object.defineProperty(document, 'hidden', { configurable: true, get: () => value });
    Object.defineProperty(document, 'visibilityState', { configurable: true, get: () => value ? 'hidden' : 'visible' });
    document.dispatchEvent(new Event('visibilitychange'));
  };
  if (noFontAPI) Object.defineProperty(document, 'fonts', { configurable: true, value: undefined });
  if (!mock) return;
  window.__tv = { catalog, catalogFailure: !!catalogFailure, launchFailure: false, holdCatalog: false, pending: [], calls: [], catalogCalls: 0 };
  window.tizen = {
    ApplicationControlData: function (key, value) { this.key = key; this.value = value; },
    ApplicationControl: function (operation, uri, mime, category, data) { Object.assign(this, { operation, uri, mime, category, data }); },
    application: {
      getAppsInfo(ok, fail) {
        const tv = window.__tv;
        tv.catalogCalls++;
        const finish = () => tv.catalogFailure ? fail({ name: 'UnknownError', message: 'Catalogue unavailable for QA' }) : ok(tv.catalog.map(a => ({ ...a })));
        if (tv.holdCatalog) tv.pending.push({ ok, fail }); else setTimeout(finish, 0);
      },
      launch(id, ok, fail) {
        const tv = window.__tv; tv.calls.push({ method: 'launch', id });
        setTimeout(() => tv.launchFailure ? fail({ name: 'NotFoundError', message: 'App unavailable for QA' }) : ok(), 0);
      },
      launchAppControl(control, id, ok, fail) {
        const tv = window.__tv; tv.calls.push({ method: 'launchAppControl', id, control });
        setTimeout(() => tv.launchFailure ? fail({ name: 'UnknownError', message: 'Screen unavailable for QA' }) : ok(), 0);
      }
    }
  };
}
async function page(options = {}) {
  current = await preview.browser.newPage({ viewport: { width: 1920, height: 1080 } });
  const owner = current;
  current.setDefaultTimeout(10000);
  const expected = [];
  current.__expectedFailures = expected;
  current.on('pageerror', error => report.pageErrors.push({ section, error: error.message }));
  current.on('response', response => { if (response.status() >= 400 && !expected.some(s => response.url().includes(s))) report.pageErrors.push({ section, status: response.status(), url: response.url() }); });
  current.on('requestfailed', request => {
    if (owner.__closing) return;
    const failure = { section, url: request.url(), error: request.failure()?.errorText };
    if (expected.some(s => request.url().includes(s))) report.expectedNetworkFailures.push(failure);
    else if (failure.error !== 'net::ERR_ABORTED') report.pageErrors.push(failure);
  });
  // Your picture's relay: an empty channel unless a check publishes into it.
  current.__relay = null;
  await current.route('https://ntfy.sh/**', route => {
    const url = route.request().url(), relay = current.__relay;
    const list = relay ? relay.messages || [{ id: relay.id, image: relay.image, type: relay.type, name: relay.name }] : [];
    if (url.includes('/file/')) { const m = list.find(x => url.includes('/file/' + x.id + '.')); return m ? route.fulfill({ contentType: m.type || 'image/jpeg', headers: { 'Access-Control-Allow-Origin': '*' }, body: m.slice ? readFileSync(root + m.image).subarray(m.slice[0], m.slice[1]) : readFileSync(root + m.image) }) : route.fulfill({ status: 404 }); }
    if (url.includes('/framehome-cal-')) return route.fulfill({ contentType: 'application/x-ndjson', headers: { 'Access-Control-Allow-Origin': '*' }, body: current.__calMsg ? JSON.stringify({ id: 'c1', event: 'message', message: current.__calMsg }) + '\n' : '' });
    if (url.includes('/framehome-spotify-')) return route.fulfill({ contentType: 'application/x-ndjson', headers: { 'Access-Control-Allow-Origin': '*' }, body: current.__spotify && current.__spotify.code ? JSON.stringify({ id: 's1', event: 'message', message: JSON.stringify({ code: 'SPcode123' }) }) + '\n' : '' });
    if (url.includes('/framehome-alexa-')) return route.fulfill({ contentType: 'application/x-ndjson', headers: { 'Access-Control-Allow-Origin': '*' }, body: current.__alexa && current.__alexa.code ? JSON.stringify({ id: 'a1', event: 'message', message: JSON.stringify({ code: 'ANtestCode123', domain: 'com' }) }) + '\n' : '' });
    const open = url.includes('poll=1') ? '' : JSON.stringify({ event: 'open' }) + '\n';
    const body = open + (relay && relay.ready() ? list.map(m => JSON.stringify({ id: m.id, time: 1, event: 'message', topic: 't', message: 'photo', tags: m.tags, title: m.title, attachment: { name: m.name || 'IMG_0001.jpg', type: m.type || 'image/jpeg', size: 1, url: 'https://ntfy.sh/file/' + m.id + '.jpg' } }) + '\n').join('') : '');
    return route.fulfill({ contentType: 'application/x-ndjson', headers: { 'Access-Control-Allow-Origin': '*' }, body });
  });
  // Alexa: a local stand-in for Amazon's sign-in, token and GraphQL endpoints.
  current.__alexa = { code: false, register: null, sets: [], devices: [
    { id: 'amzn1.alexa.endpoint.temp-1', name: 'TIMMERFLOTTE', temp: 22.43, humidity: 45 },
    { id: 'amzn1.alexa.endpoint.lamp-1', name: 'Left lamp', power: 'OFF' },
    { id: 'amzn1.alexa.endpoint.lamp-2', name: 'Right lamp', power: 'OFF' },
    { id: 'amzn1.alexa.endpoint.lamp-3', name: 'Piano lamp', power: 'OFF' },
    { id: 'amzn1.alexa.endpoint.echo-1', name: 'Alex\'s Echo Dot Max', temp: 26.3 },
    { id: 'amzn1.alexa.endpoint.plug-1', name: 'Fan', power: 'ON' },
    { id: 'amzn1.alexa.endpoint.none-1', name: 'Speaker group' }] };
  const amazon = { 'Access-Control-Allow-Origin': '*', 'Access-Control-Allow-Headers': 'content-type, authorization, accept-language', 'Access-Control-Allow-Methods': 'GET, POST' };
  await current.route('https://api.amazon.com/**', route => {
    const r = route.request(), A = current.__alexa;
    if (r.method() === 'OPTIONS') return route.fulfill({ status: 204, headers: amazon });
    if (r.url().endsWith('/auth/register')) { A.register = JSON.parse(r.postData()); return route.fulfill({ headers: amazon, contentType: 'application/json', body: JSON.stringify({ response: { success: { tokens: { bearer: { access_token: 'Atza|test', refresh_token: 'Atzr|test', expires_in: 3600 } } } } }) }); }
    return route.fulfill({ headers: amazon, contentType: 'application/json', body: JSON.stringify({ access_token: 'Atza|renewed', expires_in: 3600 }) });
  });
  await current.route('https://alexa.amazon.com/**', route => {
    const r = route.request(), A = current.__alexa;
    if (r.method() === 'OPTIONS') return route.fulfill({ status: 204, headers: amazon });
    if (!/^Bearer Atza\|/.test(r.headers()['authorization'] || '')) return route.fulfill({ status: 401, headers: amazon, body: '' });
    if (r.url().endsWith('/api/users/me')) return route.fulfill({ headers: amazon, contentType: 'application/json', body: JSON.stringify({ marketPlaceDomainName: 'https://www.amazon.com' }) });
    const body = JSON.parse(r.postData()), op = Array.isArray(body) ? body[0] : body;
    const wrap = data => route.fulfill({ headers: amazon, contentType: 'application/json', body: JSON.stringify(Array.isArray(body) ? [{ data }] : { data }) });
    if (op.operationName === 'getDevicesBaseData') return wrap({ listEndpoints: { endpoints: A.devices.map(d => ({ endpointId: d.id, friendlyNameObject: { value: { text: d.name } } })) } });
    if (op.operationName === 'getEndpointFeatures') return wrap({ listEndpoints: { endpoints: A.devices.filter(d => op.variables.endpointIds.includes(d.id)).map(d => ({ endpointId: d.id, features: [].concat(
      d.temp !== undefined ? [{ name: 'temperatureSensor', properties: [{ __typename: 'TemperatureSensor', name: 'temperature', value: { value: d.temp, scale: 'CELSIUS' } }] }] : [],
      d.humidity !== undefined ? [{ name: 'range', instance: 'Humidity', configuration: { __typename: 'RangeConfiguration', friendlyName: { value: { text: 'Humidity' } }, unitOfMeasure: { value: { text: 'Alexa.Unit.Percent' } } }, properties: [{ __typename: 'RangeValue', name: 'rangeValue', rangeValue: { value: d.humidity } }] }] : [],
      d.power ? [{ name: 'power', operations: [{ name: 'turnOn' }, { name: 'turnOff' }], properties: [{ __typename: 'Power', name: 'powerState', powerStateValue: d.power }] }] : []) })) } });
    if (op.operationName === 'setEndpointFeatures') {
      const reqs = op.variables.setEndpointFeaturesInput.featureControlRequests;
      A.sets.push(reqs);
      reqs.forEach(req => { const d = A.devices.find(x => x.id === req.endpointId); if (d) d.power = req.featureOperationName === 'turnOn' ? 'ON' : 'OFF'; });
      return wrap({ setEndpointFeatures: { featureControlResponses: reqs.map(req => ({ endpointId: req.endpointId, code: 'SUCCESS' })), errors: [] } });
    }
    return route.fulfill({ status: 400, headers: amazon, body: '' });
  });
  // Spotify: token endpoint and the player API, answered locally.
  current.__spotify = { code: false, tokens: [], calls: [], playing: true, refuse: '' };
  const sp = { 'Access-Control-Allow-Origin': '*', 'Access-Control-Allow-Headers': 'content-type, authorization', 'Access-Control-Allow-Methods': 'GET, POST, PUT' };
  await current.route('https://accounts.spotify.com/**', route => {
    const r = route.request();
    if (r.method() === 'OPTIONS') return route.fulfill({ status: 204, headers: sp });
    current.__spotify.tokens.push(Object.fromEntries(new URLSearchParams(r.postData())));
    return route.fulfill({ headers: sp, contentType: 'application/json', body: JSON.stringify({ access_token: 'BQtest', refresh_token: 'AQtest', expires_in: 3600, token_type: 'Bearer' }) });
  });
  await current.route('https://api.spotify.com/**', route => {
    const r = route.request(), Q = current.__spotify, path = new URL(r.url()).pathname;
    if (r.method() === 'OPTIONS') return route.fulfill({ status: 204, headers: sp });
    if (r.headers()['authorization'] !== 'Bearer BQtest') return route.fulfill({ status: 401, headers: sp, contentType: 'application/json', body: '{"error":{"status":401}}' });
    if (r.method() === 'GET' && path.endsWith('/devices') && Q.slowDevices) { setTimeout(() => route.fulfill({ headers: sp, contentType: 'application/json', body: JSON.stringify({ devices: [{ id: 'dev-echo', is_active: true, is_restricted: false, name: 'Echo Dot Max', type: 'Speaker' }, { id: 'dev-pc', is_active: false, is_restricted: false, name: 'Desk PC', type: 'Computer' }, { id: 'dev-car', is_active: false, is_restricted: true, name: 'Car', type: 'Automobile' }] }) }), 900); return; }
    if (r.method() === 'GET' && path.endsWith('/devices')) return route.fulfill({ headers: sp, contentType: 'application/json', body: JSON.stringify({ devices: [
      { id: 'dev-echo', is_active: true, is_restricted: false, name: 'Echo Dot Max', type: 'Speaker' }, { id: 'dev-pc', is_active: false, is_restricted: false, name: 'Desk PC', type: 'Computer' },
      { id: 'dev-car', is_active: false, is_restricted: true, name: 'Car', type: 'Automobile' }, { id: null, name: 'Ghost', type: 'Speaker' }]
      .concat(Q.many ? Array.from({ length: 11 }, (_, i) => ({ id: 'dev-x' + i, is_active: false, is_restricted: false, name: 'Echo ' + (i + 1), type: 'Speaker' })) : []) }) });
    if (r.method() === 'GET') return route.fulfill({ headers: sp, contentType: 'application/json', body: JSON.stringify({ is_playing: Q.playing, device: { name: Q.device || 'Echo Dot Max' },
      progress_ms: 61000, item: { id: 't1', name: Q.title || 'Song A', duration_ms: 210000, artists: Q.artists || [{ name: 'Artist A' }, { name: 'Guest B' }], album: { name: 'Album A', images: [{ url: 'https://i.scdn.co/image/big', width: 640 }, { url: 'https://i.scdn.co/image/small', width: 64 }] } } }) });
    Q.calls.push(r.method() + ' ' + path); if (/seek/.test(path)) Q.seekUrl = r.url();
    if (r.method() === 'PUT' && path === '/v1/me/player') { Q.transfer = JSON.parse(r.postData() || '{}'); Q.device = 'Desk PC'; return route.fulfill({ status: 204, headers: sp, body: '' }); }
    if (Q.refuse) return route.fulfill({ status: 403, headers: sp, contentType: 'application/json', body: JSON.stringify({ error: { status: 403, message: 'Player command failed: Premium required', reason: Q.refuse } }) });
    if (path.endsWith('/pause')) Q.playing = false; if (path.endsWith('/play')) Q.playing = true;
    return route.fulfill({ status: 204, headers: sp, body: '' });
  });
  current.__lyrics = [];
  await current.route('https://lrclib.net/**', route => { current.__lyrics.push(route.request().url()); return route.fulfill({ headers: { 'Access-Control-Allow-Origin': '*' }, contentType: 'application/json',
    body: JSON.stringify({ trackName: 'Song A', duration: 210, instrumental: false, plainLyrics: 'First line\nSecond line\nThird line', syncedLyrics: '[00:50.00] First line\n[01:00.00] Second line\n[01:50.00] Third line' }) }); });
  await current.route('https://date.nager.at/**', route => { const d = new Date(), iso = d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0');
    return route.fulfill({ headers: { 'Access-Control-Allow-Origin': '*' }, contentType: 'application/json', body: JSON.stringify([{ date: iso, localName: 'Próbaünnep', name: 'Test holiday' }]) }); });
  await current.route('https://calendar.google.com/**', route => { const d = new Date(Date.now() + 40 * 60000), z = n => String(n).padStart(2, '0');
    const stamp = d.getUTCFullYear() + z(d.getUTCMonth() + 1) + z(d.getUTCDate()) + 'T' + z(d.getUTCHours()) + z(d.getUTCMinutes()) + '00Z';
    current.__icsFetched = route.request().url();
    return route.fulfill({ headers: { 'Access-Control-Allow-Origin': '*' }, contentType: 'text/calendar', body: ['BEGIN:VCALENDAR', 'BEGIN:VEVENT', 'UID:x', 'SUMMARY:Fogorvos', 'DTSTART:' + stamp, 'DURATION:PT1H', 'END:VEVENT', 'END:VCALENDAR'].join('\r\n') }); });
  await current.route('https://i.scdn.co/**', route => route.fulfill({ contentType: 'image/jpeg', body: readFileSync(root + 'scripts/fixtures/still-red.jpg') }));
  // The weather caption is optional; answer it locally so checks never leave the machine.
  await current.route('https://api.open-meteo.com/**', route => route.fulfill({ contentType: 'application/json',
    body: JSON.stringify({ current: { temperature_2m: 12, weather_code: 2, is_day: 1 }, daily: { temperature_2m_max: [15], temperature_2m_min: [7] } }) }));
  await current.addInitScript(installHarness, { mock: true, catalog: CATALOG, minuteMs: 60000, seed: baseline(), ...options });
  await current.goto(preview.baseURL + '/home/');
  await ready();
  await current.waitForLoadState('networkidle');
  return current;
}
const state = () => current.evaluate(() => ShoreQA.state());
const stored = () => current.evaluate(key => JSON.parse(localStorage.getItem(key)), KEY);
const call = (method, ...args) => current.evaluate(([m, a]) => ShoreQA[m](...a), [method, args]);
const ready = () => current.waitForFunction(() => window.ShoreQA && typeof ShoreQA.ready === 'function' && ShoreQA.ready(), null, { timeout: 15000 });
const nav = (...keys) => call('nav', keys);
async function act(action) { const result = await call('activate', action); if (result === null || result === false) throw Error('Action unavailable: ' + action); return result; }
async function scene(name) { await call('scene', name); await current.evaluate(() => new Promise(r => requestAnimationFrame(() => requestAnimationFrame(r)))); }
async function look(patch) { await call('look', patch); await ready(); }
async function group(name) {
  if (name === 'focus') name = 'typography'; // Focus lives on the Style page since 0.32
  await scene('settings'); await act('settings.group.' + name);
  await current.waitForFunction(expected => ShoreQA.state().settingsGroup === expected, name);
}
const settingsSnapshot = () => current.evaluate(() => {
  const s = ShoreQA.state();
  const rendered = [...document.getElementById('stage').classList].filter(c => /^(bg|l|a|u|f|m|font)-/.test(c)).sort();
  return { stored: localStorage.getItem('cleanframe.home.v1'), committed: s.committed, shown: s.shown, rendered, writes: s.writes, storageAttempts: window.__storageAttempts };
});
const choice = (axis, value) => act('choice.' + axis + '.' + value);
const radios = () => current.evaluate(() => [...document.querySelectorAll('#stage [role="radio"]')].filter(e => e.getAttribute('data-drop') || e.getClientRects().length && getComputedStyle(e).visibility !== 'hidden').map(e => ({ action: e.getAttribute('data-action'), checked: e.getAttribute('aria-checked'), disabled: e.getAttribute('aria-disabled') === 'true', focused: e.classList.contains('is-focus'), text: e.textContent.trim() })));
async function focusedChoice() {
  const action = (await state()).focusAction;
  return (await radios()).find(r => r.action === action);
}
// Settings pages show each setting as a select row; OK opens its list, where Up/Down reach the choices.
async function unselectedChoice() {
  for (let row = 0; row < 8; row++) {
    await nav('down');
    const select = (await state()).focusAction;
    if (!/^select\./.test(select)) continue;
    await nav('ok');
    for (let step = 0; step < 6; step++) {
      const radio = await focusedChoice();
      if (radio && radio.checked === 'false' && !radio.disabled) return { ...radio, select };
      await nav(step < 3 ? 'down' : 'up');
    }
    await nav('back');
  }
  throw Error('Remote could not reach an unselected choice');
}
async function walkEnabledChoices() {
  const visited = [];
  for (const direction of ['down', 'down', 'right', 'right', 'up', 'left', 'left', 'down', 'down', 'up', 'up']) {
    await nav(direction);
    const focus = await current.evaluate(() => {
      const action = ShoreQA.state().focusAction;
      const el = [...document.querySelectorAll('#stage [data-action]')].find(e => e.getAttribute('data-action') === action && e.getClientRects().length && getComputedStyle(e).visibility !== 'hidden');
      return { action, exists: !!el, disabled: el?.getAttribute('aria-disabled') === 'true', count: ShoreQA.where().focusCount };
    });
    visited.push(focus.action);
    if (!focus.exists || focus.disabled || focus.count !== 1) throw Error('Remote ' + direction + ' focused an unavailable choice: ' + JSON.stringify(focus));
  }
  return visited;
}
async function wallpaper() {
  await group('background'); await act('background.wallpaper');
  await current.waitForFunction(() => ShoreQA.state().view === 'wallpaper' && ShoreQA.state().settingsGroup === 'wallpaper');
}
const wallpaperSettled = id => current.waitForFunction(expected => !ShoreQA.state().pending && ShoreQA.state().shown.wall === expected, id);
const wallpaperRowVisible = id => current.waitForFunction(expected => {
  const list = document.querySelector('.wallpaper-list'), row = document.querySelector('[data-action="wallpaper.choose.' + expected + '"]');
  if (!list || !row || getComputedStyle(row).visibility === 'hidden') return false;
  const bounds = list.getBoundingClientRect(), r = row.getBoundingClientRect();
  return r.top >= bounds.top - 1 && r.bottom <= bounds.bottom + 1;
}, id);
const wallpaperSaved = () => current.evaluate(() => {
  const s = ShoreQA.state(), bg = document.getElementById('sheetBg'), veil = document.querySelector('.sheet-veil');
  const bgStyle = getComputedStyle(bg), veilStyle = getComputedStyle(veil);
  return { stored: localStorage.getItem('cleanframe.home.v1'), committed: s.committed, writes: s.writes, attempts: window.__storageAttempts,
    backdrop: { src: bg.currentSrc || bg.src, opacity: bgStyle.opacity, filter: bgStyle.filter, veil: veilStyle.background, veilOpacity: veilStyle.opacity } };
});
const wallpaperApplied = () => current.locator('.wallpaper-choice[aria-checked="true"]').evaluateAll(elements => elements.map(e => e.getAttribute('data-action')));
const wallpaperBundle = () => current.evaluate(() => Object.fromEntries(['photo', 'matImg'].map(id => [id, document.getElementById(id).currentSrc || document.getElementById(id).src])));
const previewFrame = () => current.evaluate(() => {
  const e = document.getElementById('scene'), r = e.getBoundingClientRect(), css = getComputedStyle(e);
  return { x: r.x, y: r.y, width: r.width, height: r.height, radius: css.borderRadius, transform: css.transform };
});
const wallpaperListGeometry = () => current.evaluate(() => {
  const list = document.querySelector('.wallpaper-list'), bounds = list.getBoundingClientRect(), rows = [...list.querySelectorAll('.wallpaper-choice')];
  const fullyVisible = [], partlyVisible = [], clippedParts = [];
  rows.forEach(row => {
    const r = row.getBoundingClientRect(), action = row.getAttribute('data-action');
    const visible = getComputedStyle(row).visibility !== 'hidden';
    if (visible && r.bottom > bounds.top + 1 && r.top < bounds.bottom - 1) partlyVisible.push(action);
    if (visible && r.top >= bounds.top - 1 && r.bottom <= bounds.bottom + 1) fullyVisible.push(action);
    const parts = [...row.querySelectorAll('.setting-name, .setting-tick svg')].map(e => e.getBoundingClientRect());
    if (parts.some(p => p.x < r.x - 1 || p.right > r.right + 1 || p.y < r.y - 1 || p.bottom > r.bottom + 1)) clippedParts.push(action);
    const name = row.querySelector('.setting-name'), tick = row.querySelector('.setting-tick svg');
    if (name && tick && name.getBoundingClientRect().right > tick.getBoundingClientRect().left + 1) clippedParts.push(action);
  });
  return { fullyVisible, partlyVisible, clippedParts, focus: ShoreQA.state().focusAction, bounds: { x: bounds.x, y: bounds.y, width: bounds.width, height: bounds.height }, top: ShoreQA.state().wallpaperPicker.top };
});
async function editor() { await scene('settings'); await act('settings.editor'); await current.waitForFunction(() => document.querySelector('[data-action^="editor.move."]')); await current.waitForFunction(() => !ShoreQA.state().catalog.loading); }
async function remove(id) { await act('editor.move.' + id); await nav('back', 'right', 'ok'); }
async function library() { await scene('home'); await act('util.apps'); await current.waitForFunction(() => !ShoreQA.state().catalog.loading); }
async function noLiveFilters() {
  return current.evaluate(() => [...document.querySelectorAll('#stage, #stage *')].filter(e => e.getClientRects().length).map(e => {
    const s = getComputedStyle(e); return { tag: e.tagName, cls: e.className, filter: s.filter, backdrop: s.backdropFilter || s.webkitBackdropFilter || 'none' };
  }).filter(s => /blur|url\(/.test(s.filter) || s.backdrop !== 'none'));
}

try {
  preview = await openPreview();
  await run('Legacy preference migration', async () => {
    for (const theme of ['list', 'shore', 'grid']) {
      await page({ seed: baseline({ theme, dock: ['youtube', 'spotify'], wallpaper: walls[1].id, lastApp: 'youtube', mode: '15' }) });
      const s = await state();
      check(theme + ' preserves order, wallpaper and rotation', same(s.dock, ['youtube', 'spotify']) && s.wallpaper === walls[1].id && s.mode === '15' && s.lastApp === 'youtube', s);
      check(theme + ' opens the Dock on a photo (the List layout is gone)', s.look.layout === 'dock' && s.look.bg === 'photo', s.look);
      await closePage();
    }
    await page({ seed: undefined, legacy: baseline({ theme: 'list', dock: ['youtube'], lastApp: 'youtube' }) });
    check('Old shore key is read', (await state()).dock.length === 1 && (await state()).look.layout === 'dock');
    await look({ controls: 'text' });
    check('Next completed edit writes stable home key', (await stored()).dock[0] === 'youtube');
    await current.reload(); await ready();
    check('Migrated preferences survive reload', (await state()).look.controls === 'text' && (await state()).dock[0] === 'youtube');
    await closePage();
    await page({ seed: baseline({ look: { layout: 'list', bg: 'photo', apps: 'text', controls: 'both', focus: 'glass', material: 'soft', font: 'manrope', wall: walls[0].id } }) });
    await closePage(); await page({ seed: baseline({ look: { bg: 'light', layout: 'dock', apps: 'both', controls: 'both', focus: 'glass', material: 'soft', font: 'manrope', wall: walls[0].id } }) });
    check('A saved Light background opens as the photo', (await state()).look.bg === 'photo');
    check('A saved List layout opens as the Dock', (await state()).look.layout === 'dock' && await current.evaluate(() => /\bl-dock\b/.test(document.getElementById('stage').className)));
  });
  await run('Invalid preferences and saved native pins', async () => {
    await page({ seed: '{broken', legacy: baseline({ dock: ['youtube'], lastApp: 'youtube' }) });
    check('Malformed primary recovers valid legacy key', same((await state()).dock, ['youtube']));
    await closePage();
    await page({ seed: { dock: [], wallpaper: 'missing', mode: 'constructor', theme: 'constructor' } });
    const s = await state();
    check('Invalid values recover usable bounded Home', s.dock.length >= 1 && s.dock.length <= 9 && walls.some(w => w.id === s.wallpaper) && ['fixed', 'open', '5', '15', '60'].includes(s.mode), s);
    await closePage();
    await page({ seed: baseline({ dock: [EXTRA, 'youtube'], lastApp: EXTRA }), catalogFailure: true });
    await library();
    check('Discovery failure preserves saved native pin', (await state()).dock.includes(EXTRA));
  });
  await run('Startup fallbacks remain usable', async () => {
    await page({ noFontAPI: true });
    check('Missing font-loading API has usable baseline Home', (await state()).look.font === 'manrope' && (await call('where')).focusCount === 1);
    await closePage();
    await page({ seed: baseline({ mode: 'open' }), storageFailure: true });
    check('Failed open-mode write retains prior photo', (await state()).wallpaper === walls[0].id && (await stored()).wallpaper === walls[0].id);
  });
  await run('Real catalogue and native launch boundary', async () => {
    await page(); await library();
    const names = await current.locator('[data-action^="apps.open."] .label').allTextContents();
    check('Consumer catalogue excludes services, self and duplicate YouTube', names.length === 12 && names.filter(n => n === 'YouTube').length === 1 && !names.includes('CleanFrame') && !names.includes('Background worker'), names);
    check('Installed names stay text, including HTML punctuation', names.includes(UNSAFE_NAME) && !(await current.evaluate(() => window.__catalogXss)));
    check('Exploration fixtures do not appear', !names.includes('Plex') && !names.includes('Jellyfin'));
    await act('apps.open.' + SPOTIFY); await current.waitForFunction(() => __tv.calls.length > 0);
    check('Extra-brand app launches native ID', (await current.evaluate(() => __tv.calls.at(-1))).id === SPOTIFY);
    await current.evaluate(() => window.dispatchEvent(new Event('focus')));
    await scene('home'); await act('home.app.youtube'); await current.waitForFunction(() => __tv.calls.length === 2);
    check('Primary app keeps verified target', (await current.evaluate(() => __tv.calls.at(-1))).id === IDS[3]);
    await current.evaluate(() => window.dispatchEvent(new Event('focus'))); await scene('settings'); await act('settings.samsung-home');
    await current.waitForFunction(() => __tv.calls.length === 3);
    check('Samsung escape keeps CSFS target', (await current.evaluate(() => __tv.calls.at(-1))).id === 'com.samsung.tv.csfs');
    await current.evaluate(() => { window.dispatchEvent(new Event('focus')); __tv.launchFailure = true; });
    await scene('home'); await act('home.app.youtube'); await current.waitForFunction(() => ShoreQA.where().view === 'message');
    check('Launch failure is shown', /could not|unavailable|try again/i.test(await current.locator('#stage').innerText()));
  });
  await run('Catalogue failure and retry', async () => {
    await page({ catalogFailure: true }); await library();
    check('Catalogue failure leaves Home intact', same((await state()).dock, PRIMARY));
    await current.evaluate(() => { __tv.catalogFailure = false; }); await act('apps.retry');
    await current.waitForSelector('[data-action="apps.open.' + EXTRA + '"]');
    check('Retry displays real installed names', (await current.locator('[data-action^="apps.open."]').count()) === 12);
  });
  await run('Native icon and failed-image fallback', async () => {
    await page({ catalog: CATALOG.map(a => a.id === EXTRA ? { ...a, iconPath: '/home/assets/icons/youtube.svg' } : a) });
    await library();
    await current.waitForFunction(id => { const row = document.querySelector('[data-action="apps.open.' + id + '"]'); const img = row && row.querySelector('img'); return img && img.complete && img.naturalWidth > 0; }, EXTRA);
    check('Unbranded installed app uses its native icon', await current.evaluate(id => { const img = document.querySelector('[data-action="apps.open.' + id + '"] img'); return img && getComputedStyle(img).display !== 'none' && img.parentNode.classList.contains('has-native-icon'); }, EXTRA));
    current.__expectedFailures.push('/missing-native-icon.png');
    await current.evaluate(id => { __tv.catalog.find(a => a.id === id).iconPath = '/home/assets/icons/missing-native-icon.png'; }, EXTRA);
    await library();
    await current.waitForFunction(id => { const img = document.querySelector('[data-action="apps.open.' + id + '"] img'); return img && img.src.includes('/missing-native-icon.png') && img.complete; }, EXTRA);
    const fallback = await current.evaluate(id => {
      const row = document.querySelector('[data-action="apps.open.' + id + '"]'), mark = row.querySelector('.native-icon'), img = mark && mark.querySelector('img');
      return { html: row.innerHTML, src: img && img.src, imageDisplay: img && getComputedStyle(img).display, initialsVisibility: mark && getComputedStyle(mark.firstChild).visibility, complete: img && img.complete, width: img && img.naturalWidth, text: row.textContent };
    }, EXTRA);
    check('Failed native icon leaves readable initials and app name', fallback.imageDisplay === 'none' && fallback.initialsVisibility === 'visible' && fallback.text.includes('Family'), fallback);
  });
  await run('Catalogue response after closing and reopening', async () => {
    await page();
    await current.evaluate(() => { __tv.holdCatalog = true; });
    await act('util.apps'); await nav('back'); await act('util.apps');
    const count = await current.evaluate(() => __tv.pending.length);
    check('Concurrent catalogue entry is coalesced', count === 1, count);
    await current.evaluate(() => { __tv.holdCatalog = false; __tv.pending.shift().ok(__tv.catalog); });
    await current.waitForFunction(() => !ShoreQA.state().catalog.loading);
    check('Delayed catalogue safely fills reopened view', (await call('where')).view === 'apps' && (await state()).catalog.ids.includes(EXTRA) && (await call('where')).focusCount === 1);
  });
  await run('Immediate edits, undo, move cancellation and limits', async () => {
    await page(); await editor();
    const start = (await state()).dock;
    await remove('youtube');
    check('Remove persists membership and keeps installation', !(await stored()).dock.includes('youtube') && (await current.evaluate(() => __tv.catalog.some(a => a.id === '9Ur5IzDKqV.TizenYouTube'))));
    check('Focus follows removal into addable apps', (await state()).focusAction === 'editor.add.youtube', (await state()).focusAction);
    await nav('ok'); check('Second OK restores same position', same((await stored()).dock, start));
    await remove('youtube'); await act('editor.undo'); check('Undo persists previous membership', same((await stored()).dock, start));
    await act('editor.move.youtube'); await nav('down'); check('Unfinished move does not write', same((await stored()).dock, start));
    await nav('back'); check('Back cancels unfinished move', same((await state()).dock, start));
    await act('editor.move.youtube'); await nav('down', 'ok');
    const moved = start.slice(); [moved[1], moved[2]] = [moved[2], moved[1]];
    check('Placed move persists immediately', same((await stored()).dock, moved));
    await act('editor.add.' + EXTRA); check('Nine-app cap prevents addition', (await state()).dock.length === 9 && !(await state()).dock.includes(EXTRA));
    await remove('nuvio'); await act('editor.add.' + EXTRA);
    check('Native app can be pinned with stable ID', (await stored()).dock.includes(EXTRA) && (await state()).dock.length === 9);
    check('Native pin retains readable metadata for failed discovery', (await stored()).appRecords.some(a => a.id === EXTRA && a.name === UNSAFE_NAME));
    await current.reload(); await ready(); check('Native pin survives reload', (await state()).dock.includes(EXTRA));
    await editor(); const ids = (await state()).dock;
    for (const id of ids.slice(1)) await remove(id);
    await remove(ids[0]); check('Last Home app cannot be removed', same((await state()).dock, [ids[0]]) && same((await stored()).dock, [ids[0]]));
    check('Editor has no Save action', !(await current.locator('#stage').innerText()).match(/\bSave\b/));
  });
  await run('Actual storage failures are atomic', async () => {
    await page(); await editor(); const before = await stored();
    await current.evaluate(() => { window.__failWrites = true; }); await remove('youtube');
    check('Failed removal changes neither committed state nor storage', same((await state()).dock, before.dock) && same(await stored(), before));
    check('Failed write gives visible feedback', /not saved|couldn.t save|tries again/i.test(await current.locator('#stage').innerText()));
    await current.evaluate(() => { window.__failWrites = false; }); await nav('ok');
    check('Retry commits through same action', !(await stored()).dock.includes('youtube'));
    await scene('home'); const old = await state(), oldStored = await stored();
    await current.evaluate(() => { window.__failWrites = true; }); await call('look', { bg: old.look.bg === 'dark' ? 'photo' : 'dark' });
    await current.waitForFunction(() => !ShoreQA.state().pending);
    check('Failed appearance write keeps display and preferences', (await state()).look.bg === old.look.bg && same(await stored(), oldStored));
  });
  await run('Appearance axes, fonts, scaling and matching materials', async () => {
    await page();
    for (const bg of ['dark', 'photo']) for (const layout of ['dock']) for (const focus of ['type', 'glass']) {
      await look({ bg, layout, focus }); const s = await state();
      check('Independent axes ' + [bg, layout, focus].join('/'), s.look.bg === bg && s.look.layout === layout && s.look.focus === focus && s.shown.bg === bg, s.look);
    }
    for (const axis of ['apps', 'controls']) for (const value of ['icons', 'both', 'text']) { await look({ [axis]: value }); check(axis + ' ' + value + ' persists', (await state()).look[axis] === value); }
    await look({ bg: 'photo', layout: 'dock', focus: 'glass', apps: 'both', controls: 'icons' });
    for (const material of ['soft', 'frost', 'tint']) { await look({ material }); check(material + ' matches displayed bundle', (await state()).shown.material === material && (await state()).look.material === material); }
    const fonts = (await state()).fonts.available; check('Font catalogue includes default', fonts.includes('manrope'));
    for (const font of fonts) {
      await look({ font }); check('Font ' + font + ' settles', (await state()).look.font === font && (await state()).shown.font === font);
      if (font === 'newsreader') {
        for (const layout of ['dock']) for (const controls of ['icons', 'both', 'text']) {
          await look({ layout, controls });
          const wrong = await current.evaluate(() => [...document.querySelectorAll('.home .clock, .home .u, .home .u-label, .home .tile .label, .home .util-focus-label, .home .wall-keep')].filter(e => !/Newsreader/.test(getComputedStyle(e).fontFamily)).map(e => ({ cls: e.className, font: getComputedStyle(e).fontFamily })));
          check('Newsreader covers Home text ' + layout + '/' + controls, wrong.length === 0, wrong);
        }
      }
    }
    await look({ font: 'manrope' });
    for (const wall of walls) { await look({ wall: wall.id }); check('Wallpaper ' + wall.id + ' has matching bundle', (await state()).shown.wall === wall.id && (await state()).wallpaper === wall.id); }
    for (const layout of ['dock']) for (const width of [1920, 1280]) {
      await current.setViewportSize({ width, height: width * 9 / 16 }); await look({ layout });
      await current.waitForFunction(w => Math.abs(document.getElementById('stage').getBoundingClientRect().width - w) < 1, width);
      const g = await current.evaluate(() => { const b = document.getElementById('stage').getBoundingClientRect(); return { x: b.x, y: b.y, width: b.width, height: b.height, focus: ShoreQA.where().focusCount }; });
      check(layout + ' fits ' + width + ' with one focus', Math.abs(g.x) < 1 && Math.abs(g.y) < 1 && Math.abs(g.width - width) < 1 && Math.abs(g.height - width * 9 / 16) < 1 && g.focus === 1, g);
      await current.screenshot({ path: out + 'production-' + layout + '-' + width + '.jpg', quality: 90 });
    }
    check('No live blur/backdrop filters', (await noLiveFilters()).length === 0, await noLiveFilters());
    check('No prototype lab controls in production', await current.evaluate(() => !document.querySelector('[data-lab], #lab, #side') && !document.querySelector('script[src*="prototype"]')));
    const before = (await state()).look; await current.reload(); await ready(); check('Appearance survives reload', same((await state()).look, before));
  });
  await run('Settings overview and visible choices', async () => {
    await page(); await scene('settings');
    const expected = ['settings.group.background', 'settings.group.layout', 'settings.group.typography', 'settings.editor', 'settings.group.wifiqr', 'settings.group.region', 'settings.group.lang', 'settings.samsung-home'];
    check('Overview has all eight settings cards', same((await call('actions')).filter(a => expected.includes(a)).sort(), expected.slice().sort()));
    const specs = {
      background: { bg: ['dark', 'photo'] },
      layout: { layoutView: ['dock', 'tiles', 'modern'], apps: ['icons', 'both', 'text'], controls: ['icons', 'both', 'text'] },
      typography: { font: (await state()).fonts.available },
      focus: { focus: ['type', 'glass'], material: ['soft', 'frost', 'tint'] }
    };
    for (const [name, axes] of Object.entries(specs)) {
      await group(name);
      const options = await radios(), committed = (await state()).committed;
      for (const [axis, values] of Object.entries(axes)) {
        const rows = options.filter(r => r.action?.startsWith('choice.' + axis + '.'));
        check(name + ' shows every ' + axis + ' choice together', same(rows.map(r => r.action).sort(), values.map(v => 'choice.' + axis + '.' + v).sort()), rows);
        check(axis + ' checked state identifies only the applied choice', same(rows.filter(r => r.checked === 'true').map(r => r.action), ['choice.' + axis + '.' + committed[axis]]), rows);
      }
      check(name + ' detail has no persistent category rail', !(await call('actions')).some(a => a.startsWith('settings.group.')));
      await nav('back');
      check(name + ' Back restores overview category focus', (await state()).view === 'settings' && (await state()).focusAction === 'settings.group.' + (name === 'focus' ? 'typography' : name), await call('where'));
    }
    await group('background');
    const backgroundActions = await call('actions');
    check('Photo tools are reachable from Background', backgroundActions.includes('background.wallpaper') && backgroundActions.includes('background.rotation'), backgroundActions);
    await act('background.rotation');
    const rotationRows = await radios();
    check('All five rotation modes are visible together', same(rotationRows.map(r => r.action).sort(), ['fixed', 'open', '5', '15', '60'].map(v => 'rotation.' + v).sort()), rotationRows);
    await nav('back');
    check('Rotation Back restores its Background row', (await state()).settingsGroup === 'background' && (await state()).focusAction === 'background.rotation', await call('where'));
    await scene('settings');
    check('Samsung Home is the last Settings row', (await call('actions')).filter(a => a.indexOf('settings.') === 0).pop() === 'settings.samsung-home');
  });
  await run('Language, clock and weather preferences', async () => {
    await page(); await group('region');
    const actions = await call('actions');
    check('Date and time offers every choice', ['choice.clock.24', 'choice.clock.12', 'choice.weather.off', 'choice.weather.now', 'choice.weather.day', 'choice.clockPos.corner', 'choice.clockPos.center', 'choice.clockPos.large'].every(a => actions.includes(a)), actions);
    await nav('back'); await act('settings.group.lang');
    check('The Language tile switches to Hungarian at once', (await state()).lang === 'hu' && (await state()).view === 'settings' && await current.evaluate(() => document.documentElement.lang === 'hu' && /Magyar/.test(document.querySelector('.settings-card.card-lang').textContent)));
    await act('settings.group.region');
    check('Date and time is titled in Hungarian', await current.evaluate(() => document.getElementById('appearanceTitle').textContent === 'Dátum és idő'));
    await act('choice.clock.12');
    const clock = await current.evaluate(() => document.querySelector('#caption .clock').textContent);
    check('12-hour clock shows the Hungarian period first', /^(de\.|du\.)\d{1,2}:\d{2}$/.test(clock) && Number(clock.replace(/^\D+/, '').split(':')[0]) <= 12, clock);
    await current.waitForFunction(() => !!document.querySelector('#caption .weather .wx-range'));
    check('Weather shows icon, temperature and range', await current.evaluate(() => { const w = document.querySelector('#caption .weather'); return !!w.querySelector('.wx-icon') && w.querySelector('.wx-temp').textContent === '12°' && w.querySelector('.wx-range').textContent === '15° / 7°'; }));
    await act('choice.date.on');
    const dated = await current.evaluate(() => document.querySelector('#caption .cap-date').textContent);
    check('Date shows month name first in Hungarian', /^(Január|Február|Március|Április|Május|Június|Július|Augusztus|Szeptember|Október|November|December) \d{1,2}$/.test(dated), dated);
    await act('choice.weather.off');
    check('Weather can be hidden', await current.evaluate(() => !document.querySelector('#caption .weather')));
    await act('choice.clockPos.large');
    check('Large centred clock is applied and saved', (await state()).clockPos === 'large' && await current.evaluate(() => document.getElementById('stage').classList.contains('clock-large')));
    await scene('home');
    check('Home controls follow the language', await current.evaluate(() => [...document.querySelectorAll('#utils .u-label')].map(e => e.textContent).join('|') === 'Wi‑Fi QR|Összes app|Beállítások'));
    await current.reload(); await ready();
    const after = await state();
    check('Preferences survive a restart', after.lang === 'hu' && after.clock === '12' && after.weather === 'off' && after.clockPos === 'large', after);
  });
  await run('Alexa: phone sign-in, readings, switches, groups and colour buttons', async () => {
    await page(); await scene('settings');
    const cards = await current.evaluate(() => [...document.querySelectorAll('.settings-card')].map(e => { return { id: e.getAttribute('data-id'), left: e.offsetLeft, top: e.offsetTop, bottom: e.offsetTop + e.offsetHeight + e.offsetParent.getBoundingClientRect().top }; }));
    const cardGroups = await current.evaluate(() => [...document.querySelectorAll('.settings-group')].map(g => [...g.querySelectorAll('.settings-card')].map(e => e.getAttribute('data-id'))));
    check('Settings shows three equal columns of three equal cards, Connections before Samsung Home', cardGroups.length === 3 && cardGroups[0].join() === 'background,layout,typography' && cardGroups[1].join() === 'editor,wifiqr,region' && cardGroups[2].join() === 'lang,connections,samsung' && await current.evaluate(() => new Set([...document.querySelectorAll('.settings-card')].map(e => e.offsetWidth + 'x' + e.offsetHeight)).size === 1 && new Set([...document.querySelectorAll('.settings-group')].map(e => e.offsetWidth + 'x' + e.offsetHeight)).size === 1) && cards.every(c => c.bottom <= 1000), cardGroups);
    await nav('down', 'down', 'right', 'right');
    check('Arrows move down a column and across to the same place in the next', await current.evaluate(() => document.querySelector('.settings-card.is-focus').getAttribute('data-id')) === 'samsung');
    await act('settings.group.connections'); await current.waitForFunction(() => ShoreQA.state().settingsGroup === 'connections');
    await act('conn.alexa'); await current.waitForFunction(() => ShoreQA.state().settingsGroup === 'alexa');
    await act('alexa.connect');
    await current.waitForFunction(() => document.querySelector('.phone-qr') && document.querySelector('.phone-qr')._payload);
    const url = await current.evaluate(() => document.querySelector('.phone-qr')._payload);
    const frag = new URLSearchParams(url.split('#')[1]);
    check('The QR code opens the Alexa sign-in page with a channel, a challenge and a client id', /\/alexa\/#t=framehome-alexa-/.test(url) && /^[A-Za-z0-9_-]{43}$/.test(frag.get('c')) && Buffer.from(frag.get('i'), 'hex').toString().endsWith('#A2IVLV5VM2W81'), url);
    current.__alexa.code = true;
    await current.waitForFunction(() => /Connected|Csatlakoztatva/.test(document.querySelector('.phone-status').textContent), null, { timeout: 15000 });
    const reg = current.__alexa.register;
    check('Registration sends the code with the verifier that matches the challenge', reg && reg.auth_data.authorization_code === 'ANtestCode123' && createHash('sha256').update(reg.auth_data.code_verifier).digest('base64url') === frag.get('c'));
    check('The refresh token is stored apart from the preferences', await current.evaluate(() => /Atzr\|test/.test(localStorage.getItem('cleanframe.alexa.v1') || '') && !/Atzr/.test(localStorage.getItem('cleanframe.home.v1'))));
    await nav('ok');
    check('Done returns to the Alexa settings', (await state()).settingsGroup === 'alexa');
    const rowsText = () => current.evaluate(() => [...document.querySelectorAll('.alexa-row')].map(e => e.textContent));
    // Lists show seven rows at a time: move down until the row is in view.
    const pick = async re => { let rows = [], r; for (let n = 0; n < 40; n++) { rows = await current.evaluate(() => [...document.querySelectorAll('.alexa-row')].map(e => [e.textContent, e.getAttribute('data-action')])); r = rows.find(x => re.test(x[0])); if (r) break; await nav('down'); } if (!r) throw Error('No row ' + re + ' in ' + rows.map(x => x[0])); await act(r[1]); };
    await act('alexa.list.readings');
    await current.waitForFunction(() => document.querySelectorAll('.alexa-row').length >= 3);
    const readings = await rowsText();
    check('Readings list every temperature and the humidity', readings.some(t => /TIMMERFLOTTE.*Temperature.*22.4°/.test(t)) && readings.some(t => /TIMMERFLOTTE.*Humidity.*45%/.test(t)) && readings.some(t => /Echo Dot Max/.test(t)) && !readings.some(t => /lamp/.test(t)), readings);
    await pick(/TIMMERFLOTTE.*Temperature/); await pick(/TIMMERFLOTTE.*Humidity/);
    check('Both readings are saved', (await stored()).alexaReadings.map(r => r.key).join() === 'temp,range:Humidity', (await stored()).alexaReadings);
    await nav('back');
    await act('alexa.list.groups'); await act('alexa.row.0');
    check('New group opens the name keyboard', (await state()).view === 'wifitype');
    const chars = await current.evaluate(() => [...document.querySelectorAll('[data-action^="wifi.char."]')].map(e => e.textContent));
    for (const ch of 'Nappali') await act('wifi.char.' + chars.indexOf(ch));
    check('The keyboard has Hungarian letters', ['á', 'ő', 'Ű'].every(c => chars.includes(c)));
    await act('wifi.act.1');
    await current.waitForFunction(() => ShoreQA.state().view === 'alexalist' && document.querySelectorAll('.alexa-row').length >= 3);
    await pick(/Left lamp/); await pick(/Right lamp/);
    const groups = (await stored()).alexaGroups;
    check('The named group keeps its lights', groups.length === 1 && groups[0].name === 'Nappali' && groups[0].members.map(m => m.name).join() === 'Left lamp,Right lamp', groups);
    await nav('back', 'back', 'back');
    check('Back returns to the Alexa settings', (await state()).settingsGroup === 'alexa', await state());
    await act('alexa.list.switches');
    await current.waitForFunction(() => document.querySelectorAll('.alexa-row').length >= 4);
    await pick(/Left lamp/); await pick(/^.?Nappali/);
    check('A light and a group are on Home', (await stored()).alexaSwitches.map(x => x.id).join() === 'amzn1.alexa.endpoint.lamp-1,group:' + groups[0].id, (await stored()).alexaSwitches);
    await nav('back');
    check('Remote buttons are only in Connections, not repeated under Alexa', await current.evaluate(() => !document.querySelector('[data-action="alexa.list.keys"]')));
    await group('connections'); await act('alexa.list.keys'); await act('alexa.row.1');
    await current.waitForFunction(() => document.querySelectorAll('.alexa-row').length >= 4);
    await pick(/Piano lamp/);
    check('The green button switches the piano lamp', (await stored()).alexaKeys.green.id === 'amzn1.alexa.endpoint.lamp-3' && (await state()).view === 'alexalist');
    await scene('home');
    await current.waitForFunction(() => document.querySelectorAll('.weather.indoor').length === 2);
    check('Home shows the temperature and the humidity', await current.evaluate(() => [...document.querySelectorAll('.weather.indoor')].map(e => e.textContent).join(' ')) === '22.4° 45%');
    check('The remote-button legend names the green button', /Piano lamp/.test(await current.locator('#keyLegend').textContent()) && await current.locator('#keyLegend .key-green').count() === 1);
    check('Home controls start with the light and the group', await current.evaluate(() => [...document.querySelectorAll('#utils .u')].map(b => b.getAttribute('data-action')).join()) === 'util.sw0,util.sw1,util.wifi,util.apps,util.settings');
    await act('util.sw1');
    await current.waitForFunction(() => document.querySelectorAll('.u-lamp.is-lit').length === 2);
    const groupSet = current.__alexa.sets[0];
    check('The group switches both lights in one request', groupSet.length === 2 && groupSet.every(r => r.featureOperationName === 'turnOn'), groupSet);
    check('A toast says what happened', /Nappali · On/.test(await current.locator('#alexaToast').textContent()));
    await act('util.sw0');
    await current.waitForFunction(() => document.querySelectorAll('.u-lamp.is-lit').length === 0);
    check('The left lamp alone goes off, and the group no longer shows as on with one light off', current.__alexa.sets[1].length === 1 && current.__alexa.sets[1][0].featureOperationName === 'turnOff');
    await current.evaluate(() => document.dispatchEvent(new KeyboardEvent('keydown', { keyCode: 404, bubbles: true })));
    await current.waitForFunction(() => /Piano lamp · On/.test(document.getElementById('alexaToast').textContent));
    check('The green remote button turns the piano lamp on', current.__alexa.sets[2][0].endpointId === 'amzn1.alexa.endpoint.lamp-3' && current.__alexa.sets[2][0].featureOperationName === 'turnOn');
    await current.evaluate(() => document.dispatchEvent(new KeyboardEvent('keydown', { keyCode: 403, bubbles: true })));
    check('An unassigned colour button says how to assign it', /Red button.*Connections/.test(await current.locator('#alexaToast').textContent()) && current.__alexa.sets.length === 3);
    await group('connections'); await act('conn.alexa'); await act('alexa.signout');
    await current.waitForFunction(() => ShoreQA.where().view === 'message');
    await act('message.alexaout');
    const out = await stored();
    check('Sign out forgets the sign-in, readings, switches and buttons', !out.alexaReadings.length && !out.alexaSwitches.length && !out.alexaKeys.green && await current.evaluate(() => !localStorage.getItem('cleanframe.alexa.v1')));
    await scene('home');
    check('Home has no Alexa values after sign-out', await current.evaluate(() => !document.querySelector('.weather.indoor') && !document.querySelector('[data-action^="util.sw"]')));
  });
  await run('Spotify: phone sign-in, now playing and the remote', async () => {
    await page(); await group('connections');
    check('Connections lists Alexa and Spotify', same(await current.evaluate(() => [...document.querySelectorAll('[data-action^="conn."]')].map(e => e.getAttribute('data-action'))), ['conn.alexa', 'conn.spotify']));
    await act('conn.spotify'); await current.waitForFunction(() => ShoreQA.state().settingsGroup === 'spotify');
    check('Spotify settings go back to Connections', /Connections|Kapcsolatok/.test(await current.locator('.setting-back').first().textContent()));
    await act('spotify.connect');
    await current.waitForFunction(() => document.querySelector('.phone-qr') && document.querySelector('.phone-qr')._payload);
    const url = await current.evaluate(() => document.querySelector('.phone-qr')._payload), frag = new URLSearchParams(url.split('#')[1]);
    check('The QR code opens the Spotify page with a channel, a challenge and the client id', url.startsWith('https://bathoryalex.github.io/CleanFrame/spotify/#t=framehome-spotify-') && /^[A-Za-z0-9_-]{43}$/.test(frag.get('c')) && frag.get('i') === '46baaffd46624e648beec0c38bc3d070', url);
    current.__spotify.code = true;
    await current.waitForFunction(() => /Connected|Csatlakoztatva/.test(document.querySelector('.phone-status').textContent), null, { timeout: 15000 });
    const tok = current.__spotify.tokens[0];
    check('The code is exchanged with the verifier, the redirect URI and no secret', tok.grant_type === 'authorization_code' && tok.code === 'SPcode123' && tok.redirect_uri === 'https://bathoryalex.github.io/CleanFrame/spotify/'
      && tok.client_id === '46baaffd46624e648beec0c38bc3d070' && createHash('sha256').update(tok.code_verifier).digest('base64url') === frag.get('c') && !tok.client_secret, tok);
    check('Tokens are stored apart from the preferences', await current.evaluate(() => /AQtest/.test(localStorage.getItem('cleanframe.spotify.v1') || '') && !/AQtest/.test(localStorage.getItem('cleanframe.home.v1'))));
    await nav('ok');
    check('Done returns to the Spotify settings', (await state()).settingsGroup === 'spotify');
    await scene('home');
    await current.waitForFunction(() => document.querySelector('.cap-music'));
    check('Home shows the song, the artists and the small cover', await current.evaluate(() => { const m = document.querySelector('.cap-music'); return /Song A/.test(m.querySelector('.music-title').textContent) && m.querySelector('.music-artist').textContent === 'Artist A, Guest B' && /\/small$/.test(m.querySelector('.music-art').src); }));
    check('The song shows its progress and length', await current.evaluate(() => /^\d+:\d\d$/.test(document.querySelector('[data-music-pos]').textContent) && /3:30/.test(document.querySelector('.music-progress').textContent)));
    await nav('up', 'left');
    check('Left from the first Home control focuses the song', (await current.evaluate(() => ShoreQA.where())).zone === 'music' && await current.evaluate(() => !!document.querySelector('.cap-music.is-focus')), await state());
    await nav('ok');
    await current.waitForFunction(() => ShoreQA.where().view === 'nowplaying');
    check('OK opens Now playing with the large cover, three controls and Lyrics', await current.evaluate(() => /\/big$/.test(document.querySelector('.np-art').src) && /Song A/.test(document.querySelector('.np-title').textContent) && document.querySelectorAll('.np-btn').length === 4 && document.querySelector('.np-btn.is-focus').getAttribute('data-action') === 'np.toggle'));
    await nav('right', 'ok');
    await current.waitForFunction(() => /Next track|Következő/.test(document.getElementById('alexaToast').textContent));
    check('Its controls drive Spotify', current.__spotify.calls[0] === 'POST /v1/me/player/next');
    current.__spotify.calls.length = 0;
    await current.waitForTimeout(400); await nav('up', 'right');
    await current.waitForFunction(() => document.querySelector('.np-progress.is-focus'));
    await current.waitForTimeout(1200);
    const seekAt = Number(new URL(current.__spotify.seekUrl || 'http://x/?position_ms=0').searchParams.get('position_ms'));
    check('Up focuses the progress bar and Right moves ten seconds into the song', current.__spotify.calls[0] === 'PUT /v1/me/player/seek' && seekAt > 68000 && seekAt < 80000, [current.__spotify.calls, seekAt]);
    current.__spotify.calls.length = 0; await nav('down');
    await current.waitForTimeout(400); await nav('right', 'ok');
    await current.waitForFunction(() => document.querySelector('.np.is-lyrics .lyric.is-now'));
    check('Lyrics load from LRCLIB and the current line follows the song', await current.evaluate(() => document.querySelector('.lyric.is-now').textContent) === 'Second line' && current.__lyrics.length === 1 && /track_name=Song%20A&artist_name=Artist%20A/.test(current.__lyrics[0]), current.__lyrics);
    await nav('back');
    check('Back returns to Home', (await state()).view === 'home');
    const key = code => current.evaluate(c => { document.dispatchEvent(new KeyboardEvent('keydown', { keyCode: c, bubbles: true })); document.dispatchEvent(new KeyboardEvent('keyup', { keyCode: c, bubbles: true })); }, code);
    await key(10252);
    await current.waitForFunction(() => document.querySelector('.cap-music.is-paused') && /Paused|Szünet/.test(document.getElementById('alexaToast').textContent));
    check('Play/Pause pauses', current.__spotify.calls[0] === 'PUT /v1/me/player/pause');
    await current.waitForTimeout(100); await key(10252);
    await current.waitForFunction(() => document.querySelector('.cap-music.is-playing') && /Playing|Lejátszás/.test(document.getElementById('alexaToast').textContent));
    check('Play/Pause again plays', current.__spotify.calls[1] === 'PUT /v1/me/player/play');
    await key(417); await current.waitForFunction(() => /Next track|Következő/.test(document.getElementById('alexaToast').textContent));
    check('Fast-forward skips to the next track', current.__spotify.calls[2] === 'POST /v1/me/player/next');
    await group('connections'); await act('conn.spotify');
    check('Remote buttons are not repeated under Spotify', await current.evaluate(() => !document.querySelector('[data-action="alexa.list.keys"]')));
    await group('connections'); await act('alexa.list.keys'); await act('alexa.row.3');
    const rows = await current.evaluate(() => [...document.querySelectorAll('.alexa-row')].map(e => [e.textContent, e.getAttribute('data-action')]));
    await act(rows.find(t => /previous track|előző/.test(t[0]))[1]);
    check('A colour button can skip back, even without Alexa', (await stored()).alexaKeys.blue.id === 'spotify:prev', rows);
    await scene('home'); await key(406);
    await current.waitForFunction(() => /Previous track|Előző/.test(document.getElementById('alexaToast').textContent));
    check('The blue button goes to the previous track', current.__spotify.calls[3] === 'POST /v1/me/player/previous');
    current.__spotify.refuse = 'PREMIUM_REQUIRED'; current.__expectedFailures.push('api.spotify.com/v1/me/player/pause');
    await current.waitForTimeout(100); await key(10252);
    await current.waitForFunction(() => /Premium/.test(document.getElementById('alexaToast').textContent));
    check('Without Premium the remote says so and the state reverts', await current.evaluate(() => !!document.querySelector('.cap-music.is-playing')));
    await group('connections'); await act('conn.spotify'); await act('choice.spotifyShow.off');
    await scene('home');
    check('Now playing can be hidden', await current.evaluate(() => !document.querySelector('.cap-music')));
    await group('connections'); await act('conn.spotify'); await act('spotify.signout');
    await current.waitForFunction(() => ShoreQA.where().view === 'message');
    await act('message.spotifyout');
    check('Sign out forgets the tokens and the Spotify colour button', await current.evaluate(() => !localStorage.getItem('cleanframe.spotify.v1')) && !(await stored()).alexaKeys.blue);
  });
  await run('Spotify: choose the device it plays on', async () => {
    await page();
    await current.evaluate(() => localStorage.setItem('cleanframe.spotify.v1', JSON.stringify({ refresh: 'AQtest', access: 'BQtest', until: Date.now() + 3600000 })));
    await current.reload(); await ready();
    await current.waitForFunction(() => document.querySelector('.cap-music'));
    await nav('up', 'left', 'ok');
    await current.waitForFunction(() => ShoreQA.where().view === 'nowplaying');
    await nav('up', 'up');
    check('Up from the progress bar focuses "Playing on"', await current.evaluate(() => document.querySelector('.np-device.is-focus') && /Echo Dot Max/.test(document.querySelector('.np-device').textContent)));
    current.__spotify.slowDevices = true;
    await nav('ok');
    await current.waitForFunction(() => document.querySelector('.np-devices.is-open .np-dev-note'));
    await current.waitForTimeout(350);
    const loadingTop = await current.evaluate(() => document.querySelector('.np-devices').getBoundingClientRect().top);
    await current.evaluate(() => { const p = document.querySelector('.np-devices'), h = window.__devGrow = [], t0 = performance.now(); const tick = () => { const m = getComputedStyle(p, '::before').transform, v = m === 'none' ? 1 : Math.round(parseFloat(m.split(',')[3]) * 1000) / 1000; if (h[h.length - 1] !== v) h.push(v); if (performance.now() - t0 < 1800) requestAnimationFrame(tick); }; tick(); });
    current.__spotify.slowDevices = false;
    await current.waitForFunction(() => document.querySelectorAll('.np-dev-row').length > 0);
    await current.waitForTimeout(1500);
    const listTop = await current.evaluate(() => document.querySelector('.np-devices').getBoundingClientRect().top);
    const grow = await current.evaluate(() => window.__devGrow);
    check('The card grows smoothly to the list with a transform, not a jump', grow.length > 4 && grow[grow.length - 1] === 1 && grow.slice(1).every((v, i) => v >= grow[i] || grow[i] === 1), grow);
    check('The list keeps its top edge when the devices arrive (no jump)', Math.abs(loadingTop - listTop) < 1, { loadingTop, listTop });
    const rows = await current.evaluate(() => [...document.querySelectorAll('.np-dev-row')].map(e => e.textContent + (e.classList.contains('is-focus') ? '*' : '') + (e.classList.contains('is-restricted') ? '!' : '')));
    check('OK lists the devices Spotify reports, the current one focused and restricted ones marked', rows.length === 3 && /Echo Dot Max\*/.test(rows[0]) && /Desk PC/.test(rows[1]) && /!$/.test(rows[2]), rows);
    await nav('down', 'ok');
    await current.waitForFunction(() => !document.querySelector('.np-devices.is-open'));
    const tr = current.__spotify.transfer;
    check('OK moves playback there and keeps it playing', tr && tr.device_ids[0] === 'dev-pc' && tr.play === true, tr);
    await current.waitForFunction(() => /Desk PC/.test(document.querySelector('.np-device').textContent));
    check('Now playing shows the new device', true);
    current.__spotify.many = true;
    await nav('ok'); await current.waitForFunction(() => document.querySelectorAll('.np-dev-row').length > 0);
    await nav('down', 'down', 'down', 'down', 'down', 'down', 'down', 'down', 'down', 'down');
    await current.waitForTimeout(450);
    const box = await current.evaluate(() => { const p = document.querySelector('.np-devices').getBoundingClientRect(), f = document.querySelector('.np-dev-row.is-focus').getBoundingClientRect(), s = document.getElementById('stage').getBoundingClientRect();
      return { rows: document.querySelectorAll('.np-dev-row').length, top: p.top - s.top, bottom: p.bottom - s.top, focusIn: f.top >= p.top && f.bottom <= p.bottom, count: document.querySelector('.np-dev-count') && document.querySelector('.np-dev-count').textContent }; });
    check('A long device list shows seven rows on screen and follows the focus', box.rows === 7 && box.top >= 0 && box.bottom <= 1080 && box.focusIn && box.count === '11 / 14', box);
    current.__spotify.many = false;
    await nav('back');
    check('Back closes the list and keeps Now playing', (await current.evaluate(() => ShoreQA.where().view)) === 'nowplaying' && await current.evaluate(() => !document.querySelector('.np-devices.is-open')));
  });
  await run('Spotify phone page sends the code back to the TV', async () => {
    const phone = await preview.browser.newPage({ viewport: { width: 390, height: 844 } }), posts = [];
    await phone.route('https://ntfy.sh/**', async route => { const r = route.request(); posts.push({ url: r.url(), body: r.postData(), tags: r.headers()['tags'] }); await route.fulfill({ status: 200, headers: { 'Access-Control-Allow-Origin': '*' }, body: '{}' }); });
    const pageUrl = 'file://' + root + 'docs/spotify/index.html', topic = 'framehome-spotify-abcdefghijklmnopqrst', challenge = 'A'.repeat(43);
    try {
      await phone.goto(pageUrl + '#t=' + topic + '&c=' + challenge + '&i=46baaffd46624e648beec0c38bc3d070');
      const go = new URL(await phone.getAttribute('#go', 'href'));
      check('The sign-in link asks Spotify for a PKCE code with the TV channel as state', go.origin + go.pathname === 'https://accounts.spotify.com/authorize' && go.searchParams.get('code_challenge') === challenge
        && go.searchParams.get('code_challenge_method') === 'S256' && go.searchParams.get('state') === topic && go.searchParams.get('response_type') === 'code' && /user-modify-playback-state/.test(go.searchParams.get('scope')));
      await phone.goto(pageUrl + '?code=AQcode-123_x&state=' + topic);
      await phone.waitForFunction(() => /Done|Kész/.test(document.getElementById('status').textContent));
      check('Back from Spotify the page posts only the code to the channel', posts.length === 1 && posts[0].url === 'https://ntfy.sh/' + topic && posts[0].body === '{"code":"AQcode-123_x"}', posts);
      await phone.goto(pageUrl + '?code=AQcode&state=someone-else');
      check('A code for another channel is not sent', posts.length === 1 && /not from Frame Home|nem a Frame Home/.test(await phone.textContent('#status')));
    } finally { await phone.close(); }
  });
  await run('Clock styles, seconds and the Tiles layout', async () => {
    await page({ seed: baseline({ clockPos: 'center', seconds: 'on', clockStyle: 'flip' }) });
    check('Flip shows a card per digit, seconds included', await current.evaluate(() => document.querySelectorAll('.caption .flip').length === (new Date().getHours() < 10 ? 5 : 6)));
    const before = await current.evaluate(() => document.querySelector('.caption .clock').textContent);
    await current.waitForTimeout(2200);
    check('Seconds tick without re-rendering the caption', await current.evaluate(() => document.querySelector('.caption .clock').textContent) !== before);
    await group('typography'); await act('choice.clockStyle.led'); await scene('home');
    check('LED draws seven segments per digit', await current.evaluate(() => (n => document.querySelectorAll('.caption .clock-led .clock-glyph').length === n && document.querySelectorAll('.caption .clock-led .clock-glyph polygon').length === n * 7)(new Date().getHours() < 10 ? 5 : 6)));
    await group('typography'); await act('choice.clockStyle.thin'); await scene('home');
    check('Thin draws stroked digits', await current.evaluate(() => document.querySelectorAll('.caption .clock-thin .clock-glyph').length === (new Date().getHours() < 10 ? 5 : 6)));
    await group('layout'); await act('choice.layoutView.tiles');
    await current.waitForFunction(() => ShoreQA.ready && ShoreQA.ready());
    check('Layout offers Dock, Tiles and Modern dock', same(await current.evaluate(() => [...document.querySelectorAll('[data-action^="choice.layoutView."]')].map(e => e.getAttribute('data-action'))), ['choice.layoutView.dock', 'choice.layoutView.tiles', 'choice.layoutView.modern']));
    check('Tiles is saved as the Dock with separate tiles', (await stored()).dockStyle === 'tiles' && (await stored()).layout === 'dock' && await current.evaluate(() => document.getElementById('stage').className.indexOf('dock-tiles') >= 0));
    await scene('home');
    const ring = async () => current.evaluate(() => getComputedStyle(document.querySelector('.dock .tile.is-focus'), '::before').boxShadow);
    const glassRing = await ring();
    await group('focus'); await act('choice.focus.type'); await scene('home'); await current.waitForTimeout(400);
    const typeLook = { ring: await ring(), dim: await current.evaluate(() => getComputedStyle(document.querySelector('.dock .tile:not(.is-focus) .tile-content')).opacity) };
    check('Settings → Focus changes how a focused tile looks', glassRing !== typeLook.ring && typeLook.dim === '0.6', { glassRing, typeLook });
    check('Wi-Fi, All apps and Settings share one card in the top row', await current.evaluate(() => { const g = document.querySelector('.utils .u-group'); return !!g && ['util.wifi', 'util.apps', 'util.settings'].every(a => !document.querySelector('[data-action="' + a + '"]') || g.contains(document.querySelector('[data-action="' + a + '"]'))); }));
    await nav('up');
    check('With focus in the top row no app looks selected', await current.evaluate(() => !document.querySelector('.dock .tile.is-sel') && !document.querySelector('.dock .tile.is-focus')));
  });
  await run('Date details: holidays, name days and a calendar from the phone', async () => {
    await page({ seed: baseline({ date: 'on' }) });
    await group('region');
    const fit = await current.evaluate(() => { const rows = document.getElementById('appearanceRows').getBoundingClientRect(), hint = document.getElementById('appearanceDesc').getBoundingClientRect(); return { rows: Math.round(rows.bottom), hint: Math.round(hint.top) }; });
    check('Date and time still fits above the OK hint', fit.rows <= fit.hint, fit);
    await act('region.dateinfo');
    check('Date details open from Date and time', (await state()).settingsGroup === 'dateinfo');
    await act('choice.holidays.on'); await act('choice.namedays.on');
    await act('calendar.connect');
    await current.waitForFunction(() => document.querySelector('.phone-qr') && document.querySelector('.phone-qr')._payload);
    const url = await current.evaluate(() => document.querySelector('.phone-qr')._payload), frag = new URLSearchParams(url.split('#')[1]);
    check('The QR code carries a channel and a 32-byte key in the fragment', url.startsWith('https://bathoryalex.github.io/CleanFrame/calendar/#t=framehome-cal-') && /^[A-Za-z0-9_-]{43}$/.test(frag.get('k')), url);
    const phone = await preview.browser.newPage({ viewport: { width: 390, height: 844 } }), posts = [];
    await phone.route('https://ntfy.sh/**', async route => { posts.push(route.request().postData()); await route.fulfill({ status: 200, headers: { 'Access-Control-Allow-Origin': '*' }, body: '{}' }); });
    const secret = 'https://calendar.google.com/calendar/ical/me%40example.com/private-abc123/basic.ics';
    try {
      await phone.goto('file://' + root + 'docs/calendar/index.html#' + url.split('#')[1]);
      await phone.fill('#paste', secret); await phone.click('#send');
      await phone.waitForFunction(() => /Sent|Elküldve/.test(document.getElementById('status').textContent));
    } finally { await phone.close(); }
    check('The phone sends the address encrypted, never in the clear', posts.length === 1 && !posts[0].includes('calendar.google') && !posts[0].includes('abc123') && /"code":"[A-Za-z0-9_-]+"/.test(posts[0]), posts);
    current.__calMsg = posts[0];
    await current.waitForFunction(() => /Connected|Összekötve/.test(document.querySelector('.phone-status').textContent), null, { timeout: 15000 });
    check('The TV decrypts the address and reads the calendar', current.__icsFetched === secret);
    check('The address is kept apart from the preferences', await current.evaluate(() => /abc123/.test(localStorage.getItem('cleanframe.calendar.v1') || '') && !/abc123/.test(localStorage.getItem('cleanframe.home.v1'))));
    await nav('ok'); await scene('home');
    await current.waitForFunction(() => document.querySelector('.cap-cal'));
    check('Home shows the next event', /Fogorvos/.test(await current.evaluate(() => document.querySelector('.cap-cal').textContent)));
    await current.waitForFunction(() => document.querySelector('.cap-holiday'));
    const line = await current.evaluate(() => document.querySelector('.cap-date').textContent);
    const nd = await current.evaluate(() => { const d = new Date(); return (window.FrameNamedaysHU[d.getMonth()][d.getDate() - 1] || [])[0] || ''; });
    const panel = await current.evaluate(() => [...document.querySelectorAll('.cap-panel > .cap-row')].map(e => e.className.replace('cap-row ', '') + ':' + e.textContent));
    check('One panel under the date: the holiday, then the name days without a label, then the calendar', /^cap-holiday:.*Próbaünnep/.test(panel[0]) && (!nd || panel.some(r => /^cap-nameday:/.test(r) && r.includes(nd))) && /^cap-cal:/.test(panel[panel.length - 1]) && !/Name day|Névnap/.test(panel.join()) && !/Próbaünnep/.test(line), { line, panel });
  });
  await run('Two calendars, each named and marked on Home', async () => {
    await page({ seed: baseline({ date: 'on' }) });
    await current.evaluate(() => localStorage.setItem('cleanframe.calendar.v1', JSON.stringify({ url: 'https://calendar.google.com/calendar/ical/a/private-1/basic.ics' })));
    await current.reload(); await ready(); await current.waitForFunction(() => document.querySelector('.cap-cal'));
    check('A 0.22 calendar carries over as the first one', await current.evaluate(() => FrameCalendar.list().length === 1 && !document.querySelector('.cap-cal-who')));
    await current.evaluate(() => localStorage.setItem('cleanframe.calendar.v1', JSON.stringify({ cals: [{ id: 'c1', url: 'https://calendar.google.com/calendar/ical/a/private-1/basic.ics', name: '' }, { id: 'c2', url: 'https://calendar.google.com/calendar/ical/b/private-2/basic.ics', name: 'Ági' }] })));
    await current.reload(); await ready(); await current.waitForFunction(() => document.querySelectorAll('.cap-cal').length === 2);
    const rows = await current.evaluate(() => [...document.querySelectorAll('.cap-cal')].map(e => [e.querySelector('.cap-cal-who') && e.querySelector('.cap-cal-who').textContent, e.querySelector('.cap-cal-dot') && getComputedStyle(e.querySelector('.cap-cal-dot')).backgroundColor]));
    check('With two calendars each event shows its calendar by name and colour', rows.length === 2 && rows.some(r => r[0] === 'Ági') && rows.some(r => /Calendar 1|1\. naptár/.test(r[0])) && rows[0][1] !== rows[1][1], rows);
    await group('region'); await act('region.dateinfo');
    check('Date details lists the calendars and offers another', await current.evaluate(() => !!document.querySelector('[data-action="calendar.item.c1"]') && !!document.querySelector('[data-action="calendar.item.c2"]') && !!document.querySelector('[data-action="calendar.connect"]')));
    await act('calendar.item.c1'); await act('alexa.row.0');
    for (let i = 0; i < 4; i++) await act('wifi.act.0');
    const typed = async ch => { const a = await current.evaluate(c => { const e = [...document.querySelectorAll('[data-action^="wifi.char."]')].find(x => x.textContent === c); return e && e.getAttribute('data-action'); }, ch); await act(a); };
    for (const ch of 'Alex') await typed(ch);
    await act('wifi.act.1');
    check('The first calendar can be named', await current.evaluate(() => FrameCalendar.list()[0].name === 'Alex'));
    await scene('home');
    check('Home shows both names', await current.evaluate(() => [...document.querySelectorAll('.cap-cal-who')].map(e => e.textContent).sort().join() === 'Alex,Ági'));
  });
  await run('Remote buttons can open apps and use CH and Guide', async () => {
    await page({ seed: baseline({ alexaKeys: { chup: { id: 'app:9Ur5IzDKqV.TizenYouTube', name: 'YouTube' } } }) });
    await current.evaluate(() => { document.dispatchEvent(new KeyboardEvent('keydown', { keyCode: 427, bubbles: true })); document.dispatchEvent(new KeyboardEvent('keyup', { keyCode: 427, bubbles: true })); });
    await current.waitForTimeout(300);
    check('CH + opens the app assigned to it', (await current.evaluate(() => __tv.calls.filter(c => /launch/i.test(c.method)).map(c => c.id))).includes('9Ur5IzDKqV.TizenYouTube'));
    check('The legend shows CH + with the app', /CH\+/.test(await current.locator('#keyLegend').textContent()) && /YouTube/.test(await current.locator('#keyLegend').textContent()));
  });
  await run('Remote buttons legend only when a button is pressed', async () => {
    await page({ seed: baseline({ keyHints: 'pressed', alexaKeys: { chup: { id: 'app:9Ur5IzDKqV.TizenYouTube', name: 'YouTube' } } }) });
    await current.waitForTimeout(300);
    check('Opening Home does not show the legend', await current.evaluate(() => !document.getElementById('keyLegend').classList.contains('is-on')));
    await current.evaluate(() => { document.dispatchEvent(new KeyboardEvent('keydown', { keyCode: 427, bubbles: true })); document.dispatchEvent(new KeyboardEvent('keyup', { keyCode: 427, bubbles: true })); });
    await current.waitForTimeout(300);
    check('An assigned button shows it', await current.evaluate(() => document.getElementById('keyLegend').classList.contains('is-on')));
    await group('connections'); await act('alexa.list.keys');
    await nav('down', 'down', 'down', 'down', 'down', 'down', 'down', 'down', 'down');
    check('The setting names the choice', /Only when a button is pressed|Csak gombnyomáskor/.test(await current.evaluate(() => document.querySelector('.alexa-pick').textContent)));
  });
  await run('Remote test lists what the TV sends', async () => {
    await page({ seed: baseline({ alexaKeys: { red: { id: 'spotify:next', name: '' } } }) });
    await current.evaluate(() => localStorage.setItem('cleanframe.spotify.v1', JSON.stringify({ refresh: 'AQtest', access: 'BQtest', until: Date.now() + 3600000 })));
    await current.reload(); await ready();
    await group('connections'); await act('alexa.list.keys');
    await nav('down', 'down', 'down', 'down', 'down', 'down', 'down', 'down', 'down');
    check('The last row is the remote test', /Test the remote|tesztje/.test(await current.evaluate(() => document.querySelector('.alexa-row.is-focus').textContent)));
    await nav('ok');
    check('The remote test opens', (await state()).view === 'remotetest');
    await current.evaluate(() => { document.dispatchEvent(new KeyboardEvent('keydown', { keyCode: 404, bubbles: true })); window.dispatchEvent(new Event('blur')); });
    const log = await current.evaluate(() => document.querySelector('.rt-log').textContent);
    check('Keys and focus changes are listed, and keys do nothing else', /keydown\s+404/.test(log) && /window blur/.test(log) && !(await current.evaluate(() => document.getElementById('alexaToast').textContent)), log);
    await current.evaluate(() => { for (let i = 0; i < 2; i++) { document.dispatchEvent(new KeyboardEvent('keydown', { keyCode: 27, bubbles: true })); document.dispatchEvent(new KeyboardEvent('keyup', { keyCode: 27, bubbles: true })); } });
    check('Back twice leaves the test', (await state()).view === 'alexalist');
  });
  await run('Top bar: separate widgets or one Dock bar', async () => {
    await page({ seed: baseline({ clockPos: 'center', controls: 'icons', alexaTemp: 'amzn1.alexa.endpoint.temp-1', alexaTempName: 'Living room', alexaLamp: 'amzn1.alexa.endpoint.lamp-1', alexaLampName: 'Floor lamp' }) });
    await current.evaluate(() => { localStorage.setItem('cleanframe.alexa.v1', JSON.stringify({ serial: 'X', domain: 'com', site: 'com', refresh: 'Atzr|test', access: 'Atza|test', at: Date.now() }));
      localStorage.setItem('cleanframe.spotify.v1', JSON.stringify({ refresh: 'AQtest', access: 'BQtest', until: Date.now() + 3600000 })); });
    await current.reload(); await ready(); await current.waitForFunction(() => document.querySelector('.cap-music') && document.querySelector('.u-lamp'));
    await group('layout');
    const heads = await current.evaluate(() => [...document.querySelectorAll('.set-card-head')].map(e => e.textContent));
    check('Layout has a bottom bar card and a top bar card', heads.length === 2 && /Bottom bar/i.test(heads[0]) && /Top bar/i.test(heads[1]), heads);
    check('The top bar style offers separate widgets and Dock', same(await current.evaluate(() => [...document.querySelectorAll('[data-action^="choice.topStyle."]')].map(e => e.getAttribute('data-action'))), ['choice.topStyle.cards', 'choice.topStyle.bar']));
    const fit = await current.evaluate(() => { const rows = document.querySelector('#appearanceRows .set-card:last-child').getBoundingClientRect(), hint = document.getElementById('appearanceDesc').getBoundingClientRect(); return { rows: Math.round(rows.bottom), hint: Math.round(hint.top) }; });
    check('Layout still fits above the OK hint', fit.rows <= fit.hint, fit);
    await act('choice.topStyle.bar'); await scene('home'); await current.waitForTimeout(300);
    const g = await current.evaluate(() => { const s = document.getElementById('stage').getBoundingClientRect(), r = e => { const b = e.getBoundingClientRect(); return { top: b.top - s.top, bottom: b.bottom - s.top, left: b.left - s.left, right: b.right - s.left, height: b.height }; };
      return { stage: document.getElementById('stage').className.indexOf('top-bar') >= 0, bar: r(document.getElementById('topBar')), music: r(document.querySelector('.cap-music')), tiles: [...document.querySelectorAll('.utils .u')].map(e => r(e)) }; });
    check('Dock: one bar across the top edge, with the song and every control inside at the same height', g.stage && g.bar.top === 0 && g.bar.left === 0 && g.bar.right === 1920 && g.music.top >= 0 && g.music.bottom <= g.bar.bottom
      && g.tiles.length === 4 && g.tiles.every(t => Math.abs(t.height - g.music.height) < 1 && t.bottom <= g.bar.bottom), g);
    check('The bar content keeps the same margin at the screen edges as above and below', Math.abs(g.music.left - g.music.top) < 1.5 && Math.abs((1920 - g.tiles[g.tiles.length - 1].right) - g.music.top) < 1.5, g);
    check('The bar fades out at its lower edge (no hard line)', await current.evaluate(() => { const st = getComputedStyle(document.getElementById('topBar')); return /rgba\(12, 16, 18, 0\) 100%/.test(st.backgroundImage) && st.boxShadow === 'none'; }));
    await nav('up');
    check('Icons only shows no name under the focused icon', await current.evaluate(() => { const l = document.getElementById('utilFocusLabel'); return !l.classList.contains('is-on'); }));
    await nav('left');
    check('The song in the bar is still reached with Left', (await call('where')).zone === 'music');
  });
  await run('Alexa switches can show another icon', async () => {
    await page({ seed: baseline({ alexaLamp: 'amzn1.alexa.endpoint.lamp-1', alexaLampName: 'Left lamp' }) });
    await current.evaluate(() => localStorage.setItem('cleanframe.alexa.v1', JSON.stringify({ serial: 'X', domain: 'com', site: 'com', refresh: 'Atzr|test', access: 'Atza|test', at: Date.now() })));
    await current.reload(); await ready();
    await group('connections'); await act('conn.alexa'); await act('alexa.list.icons');
    check('Switch icons lists the switches with their icon', /Left lamp/.test(await current.evaluate(() => document.querySelector('.alexa-list').textContent)));
    await act('alexa.row.0');
    const names = await current.evaluate(() => [...document.querySelectorAll('.alexa-row .alexa-name')].map(e => e.textContent));
    check('Name on Home comes first, then the icons', /Name on Home/.test(names[0]) && names[1] === 'Light bulb' && names.length >= 5, names);
    await act('alexa.row.3');
    check('The choice is saved for that light', (await stored()).alexaIcons['amzn1.alexa.endpoint.lamp-1'] === 'fan', (await stored()).alexaIcons);
    await scene('home');
    check('Home shows the fan icon on the switch', await current.evaluate(() => document.querySelector('[data-action="util.sw0"]').innerHTML.indexOf('rotate(120 12 12)') >= 0));
  });
  await run('Top Dock: fixed Alexa tiles and an even divider', async () => {
    await page({ seed: baseline({ topStyle: 'bar', controls: 'icons', switchStyle: 'both', alexaSwitches: [{ id: 'amzn1.alexa.endpoint.lamp-1', name: 'Lamp' }, { id: 'group:gabc', name: '' }], alexaGroups: [{ id: 'gabc', name: 'Living room', members: [{ id: 'amzn1.alexa.endpoint.lamp-1', name: 'Lamp' }] }] }) });
    await current.evaluate(() => localStorage.setItem('cleanframe.alexa.v1', JSON.stringify({ serial: 'X', domain: 'com', site: 'com', refresh: 'Atzr|test', access: 'Atza|test', at: Date.now() })));
    await current.reload(); await ready(); await current.waitForFunction(() => document.querySelectorAll('.u-lamp').length === 2);
    const m = await current.evaluate(() => { const lamps = [...document.querySelectorAll('.u-lamp')].map(e => e.getBoundingClientRect()), g = document.querySelector('.utils .u-group'), gr = g.getBoundingClientRect(), first = g.querySelector('.u').getBoundingClientRect(), lab = [...document.querySelectorAll('.u-lamp .u-label')].map(e => e.scrollWidth <= e.clientWidth + 1 || getComputedStyle(e).textOverflow === 'ellipsis');
      return { widths: lamps.map(r => Math.round(r.width)), left: Math.round(gr.left - lamps[lamps.length - 1].right), right: Math.round(first.left - gr.left), labels: lab }; });
    check('Alexa tiles share one width, names fit or end with an ellipsis', m.widths[0] === m.widths[1] && m.labels.every(Boolean), m);
    check('The divider has the same space on both sides', Math.abs(m.left - m.right) <= 1, m);
  });
  await run('Six switches with the top Dock bar, four with separate widgets', async () => {
    const gs = ['ga', 'gb', 'gc', 'gd', 'ge', 'gf'].map((id, i) => ({ id, name: 'Room ' + (i + 1), members: [{ id: 'amzn1.alexa.endpoint.lamp-1', name: 'Lamp' }] }));
    await page({ seed: baseline({ topStyle: 'bar', controls: 'icons', alexaGroups: gs, alexaSwitches: gs.map(g => ({ id: 'group:' + g.id, name: '' })) }) });
    await current.evaluate(() => localStorage.setItem('cleanframe.alexa.v1', JSON.stringify({ serial: 'X', domain: 'com', site: 'com', refresh: 'Atzr|test', access: 'Atza|test', at: Date.now() })));
    await current.reload(); await ready();
    const bar = await current.evaluate(() => { const r = [...document.querySelectorAll('.utils .u')].map(e => e.getBoundingClientRect()), s = document.getElementById('stage').getBoundingClientRect(); return { lamps: document.querySelectorAll('.u-lamp').length, inside: r.every(x => x.left >= s.left && x.right <= s.right) }; });
    check('The Dock bar shows six switches, all on screen', bar.lamps === 6 && bar.inside, bar);
    await group('connections'); await act('conn.alexa'); await act('alexa.list.switches');
    await current.waitForFunction(() => !/Loading|betölt/i.test(document.querySelector('.alexa-pick .s-sub').textContent));
    check('The Switches text says devices, up to 6', /up to 6 devices or groups|Legfeljebb 6 eszközt/.test(await current.evaluate(() => document.querySelector('.alexa-pick').textContent)));
    await group('layout'); await act('choice.topStyle.cards'); await scene('home');
    check('Separate widgets show the first four', await current.evaluate(() => document.querySelectorAll('.u-lamp').length) === 4);
  });
  await run('Switches: chosen ones first, and they can be reordered', async () => {
    await page({ seed: baseline({ alexaSwitches: [{ id: 'amzn1.alexa.endpoint.lamp-1', name: 'Left lamp' }, { id: 'amzn1.alexa.endpoint.lamp-3', name: 'Piano lamp' }] }) });
    await current.evaluate(() => localStorage.setItem('cleanframe.alexa.v1', JSON.stringify({ serial: 'X', domain: 'com', site: 'com', refresh: 'Atzr|test', access: 'Atza|test', at: Date.now() })));
    await current.reload(); await ready();
    await group('connections'); await act('conn.alexa'); await act('alexa.list.switches');
    await current.waitForFunction(() => document.querySelectorAll('.alexa-row').length >= 3);
    const names = async () => current.evaluate(() => [...document.querySelectorAll('.alexa-row .alexa-name')].map(e => e.textContent));
    const first = await names();
    check('The chosen switches come first, in their Home order', first[0] === 'Left lamp' && first[1] === 'Piano lamp' && await current.evaluate(() => !!document.querySelector('.alexa-head')), first);
    await nav('right', 'down', 'ok');
    check('Right, then Down moves the first switch below the second', (await stored()).alexaSwitches.map(x => x.name).join() === 'Piano lamp,Left lamp' && (await names())[0] === 'Piano lamp', (await stored()).alexaSwitches);
    await scene('home');
    check('Home shows them in the new order', await current.evaluate(() => document.querySelector('[data-action="util.sw0"]').getAttribute('aria-label').indexOf('Piano lamp') === 0));
  });
  await run('Modern dock: a bottom bar like the top Dock bar', async () => {
    await page(); await group('layout'); await act('choice.layoutView.modern'); await scene('home'); await current.waitForTimeout(300);
    const m = await current.evaluate(() => { const st = document.getElementById('stage'), b = document.getElementById('bottomBar'), r = b.getBoundingClientRect(), s = st.getBoundingClientRect(), tile = document.querySelector('.dock .tile.is-focus');
      return { cls: st.className.indexOf('dock-modern') >= 0, shown: getComputedStyle(b).display === 'block', bottom: Math.round(r.bottom - s.bottom), left: Math.round(r.left - s.left), width: Math.round(r.width), fade: /rgba\(12, 16, 18, 0\) 100%/.test(getComputedStyle(b).backgroundImage), ring: tile ? getComputedStyle(tile, '::before').boxShadow : '' }; });
    check('Modern dock is saved and draws a full-width bar from the bottom edge that fades upwards', (await stored()).dockStyle === 'modern' && m.cls && m.shown && m.bottom === 0 && m.left === 0 && m.width === 1920 && m.fade, m);
    const t = await current.evaluate(() => { const s = document.getElementById('stage').getBoundingClientRect(), r = [...document.querySelectorAll('.dock .tile')].map(e => e.getBoundingClientRect()), d = document.querySelector('.dock .tile.is-focus').getBoundingClientRect();
      return { bottom: Math.round(s.bottom - Math.max(...r.map(x => x.bottom))), h: Math.round(d.height) }; });
    check('Modern dock tiles are low (96 px) and sit 14 px above the bottom edge', Math.abs(t.bottom - 14) <= 1 && Math.abs(t.h - 96) <= 1, t);
    const both = await current.evaluate(() => { const tiles = [...document.querySelectorAll('.dock .tile')].slice(0, 4), r = tiles.map(e => e.getBoundingClientRect());
      return { widths: r.map(x => Math.round(x.width)), beside: tiles.every(e => { const i = e.querySelector('.dock-icon .mark').getBoundingClientRect(), l = e.querySelector('.label').getBoundingClientRect(); return i.right <= l.left + 1 && Math.abs((i.top + i.bottom) / 2 - (l.top + l.bottom) / 2) < 6; }) }; });
    check('Both: the name sits beside the icon, in tiles of one width', new Set(both.widths).size === 1 && both.beside, both);
    const row = await current.evaluate(() => { const s = document.getElementById('stage').getBoundingClientRect(), vis = [...document.querySelectorAll('.dock .tile')].filter(e => { const r = e.getBoundingClientRect(); return r.left >= s.left && r.right <= s.right; });
      const cues = [...document.querySelectorAll('.cue.is-on')].map(e => e.getBoundingClientRect()).every(r => r.left >= s.left && r.right <= s.right);
      const mid = vis.every(t => { const r = t.getBoundingClientRect(), c = e => { const b = e.getBoundingClientRect(); return (b.top + b.bottom) / 2; }; return Math.abs(c(t.querySelector('.dock-icon .mark')) - (r.top + r.bottom) / 2) < 2 && Math.abs(c(t.querySelector('.label-ink')) - (r.top + r.bottom) / 2) < 2; });
      return { count: vis.length, cues, mid, names: vis.map(e => e.querySelector('.label-ink').textContent) }; });
    check('Both shows seven apps with short names, icon and name centred, cues on screen', row.count === 7 && row.cues && row.mid && row.names[1] === 'Nintendo' && row.names[2] === 'Nuvio', row);
    await group('layout'); await act('choice.apps.icons'); await scene('home'); await current.waitForTimeout(300);
    const ic = await current.evaluate(() => { const t = document.querySelector('.dock .tile.is-focus'); return { h: Math.round(t.getBoundingClientRect().height), name: getComputedStyle(t.querySelector('.label.icon-name')).opacity }; });
    check('Icons only keeps the Tiles row at 80 % and shows the name of the focused app', Math.abs(ic.h - 156 * 0.8) <= 1 && ic.name === '1', ic);
    check('Its focused app has the same white ring as the top widgets', /255, 255, 255\) 0px 0px 0px 3px inset|inset 0px 0px 0px 3px rgb\(255, 255, 255\)/.test(m.ring), m.ring);
  });
  await run('A Home switch can get its own short name', async () => {
    await page({ seed: baseline({ alexaSwitches: [{ id: 'amzn1.alexa.endpoint.plug-1', name: 'Air conditioner' }] }) });
    await current.evaluate(() => localStorage.setItem('cleanframe.alexa.v1', JSON.stringify({ serial: 'X', domain: 'com', site: 'com', refresh: 'Atzr|test', access: 'Atza|test', at: Date.now() })));
    await current.reload(); await ready();
    await group('connections'); await act('conn.alexa'); await act('alexa.list.icons'); await act('alexa.row.0'); await act('alexa.row.0');
    check('Name on Home opens the keyboard with the current name', (await state()).view === 'wifitype' && /Air conditi/.test(await current.evaluate(() => document.querySelector('.wifi-field-value').textContent)));
    await current.evaluate(() => { const t = ShoreQA.state(); });
    for (let i = 0; i < 12; i++) await act('wifi.act.0');
    await current.evaluate(() => {});
    const typed = async ch => { const a = await current.evaluate(c => { const e = [...document.querySelectorAll('[data-action^="wifi.char."]')].find(x => x.textContent === c); return e && e.getAttribute('data-action'); }, ch); await act(a); };
    await typed('A'); await typed('C'); await act('wifi.act.1');
    check('The short name is saved apart from the Alexa name', (await stored()).alexaNames['amzn1.alexa.endpoint.plug-1'] === 'AC' && (await stored()).alexaSwitches[0].name === 'Air conditioner', (await stored()).alexaNames);
    await scene('home');
    check('Home shows the short name on the tile', await current.evaluate(() => document.querySelector('[data-action="util.sw0"] .u-label').textContent === 'AC'));
  });
  await run('A remote button can open the Home screen', async () => {
    await page({ seed: baseline({ alexaKeys: { red: { id: 'frame:home', name: '' } } }) });
    await group('layout');
    await current.evaluate(() => { document.dispatchEvent(new KeyboardEvent('keydown', { keyCode: 403, bubbles: true })); document.dispatchEvent(new KeyboardEvent('keyup', { keyCode: 403, bubbles: true })); });
    check('The red button set to Home screen closes Settings', (await state()).view === 'home');
  });
  await run('Settings pages: cards, lists that open with OK, preview only where it helps', async () => {
    await page(); await group('layout');
    const cards = await current.evaluate(() => [...document.querySelectorAll('.set-card')].map(c => [c.querySelector('.set-card-head') && c.querySelector('.set-card-head').textContent, c.querySelectorAll('.set-row').length]));
    check('Layout is two cards: bottom bar and top bar', cards.length === 2 && cards[0][1] === 3 && cards[1][1] >= 2, cards);
    const before = await settingsSnapshot();
    await nav('up', 'up', 'up', 'up', 'down', 'down');
    check('Each setting is one row with its value', (await state()).focusAction === 'select.apps' && /Icons and text/.test(await current.evaluate(() => document.querySelector('.set-row.is-focus .set-value').textContent)));
    await nav('left', 'right');
    check('Left and Right do not change a setting', same(await settingsSnapshot(), before));
    await nav('ok');
    check('OK opens the list with the applied choice focused', await current.evaluate(() => !!document.querySelector('.set-select-wrap.is-open') && document.querySelector('.select-opt.is-focus').getAttribute('aria-checked') === 'true' && ShoreQA.where().focusCount === 1));
    const over = await current.evaluate(() => { const next = document.querySelector('.set-row[data-action="select.iconStyle"]').getBoundingClientRect(), pop = document.querySelector('.set-select-wrap.is-open .select-pop').getBoundingClientRect(), card = document.querySelector('.set-card').getBoundingClientRect(), scene = document.getElementById('scene').getBoundingClientRect(); return { nextTop: Math.round(next.top), popTop: Math.round(pop.top), popBottom: Math.round(pop.bottom), card: Math.round(card.top), scene: Math.round(scene.top) }; });
    check('The list opens over the rows below instead of pushing them down', over.nextTop < over.popBottom && over.nextTop > over.popTop - 120, over);
    check('The preview lines up with the first card', Math.abs(over.card - over.scene) <= 6, over);
    await nav('up', 'back');
    check('Back closes the list without applying', same(await settingsSnapshot(), before) && await current.evaluate(() => !document.querySelector('.set-select-wrap.is-open')) && (await state()).view === 'appearance');
    await nav('ok', 'up', 'ok');
    check('OK in the list applies the choice and closes it', (await stored()).look ? (await stored()).look.apps === 'icons' : (await stored()).apps === 'icons');
    check('Layout keeps the live preview', await current.evaluate(() => document.getElementById('stage').className.indexOf('no-preview') < 0));
    await group('wifiqr');
    check('Wi‑Fi settings drop the preview and use the width', await current.evaluate(() => /no-preview/.test(document.getElementById('stage').className) && document.getElementById('appearanceRows').getBoundingClientRect().width > 1000 * (document.getElementById('stage').getBoundingClientRect().width / 1920)));
    await group('background');
    check('Background offers Photo and Dark only', same(await current.evaluate(() => [...document.querySelectorAll('[data-action^="choice.bg."]')].map(e => e.getAttribute('data-action'))), ['choice.bg.photo', 'choice.bg.dark']));
  });
  await run('Alexa: 0.13 choices carry over', async () => {
    await page({ seed: baseline({ alexaTemp: 'amzn1.alexa.endpoint.temp-1', alexaTempName: 'TIMMERFLOTTE', alexaLamp: 'amzn1.alexa.endpoint.lamp-1', alexaLampName: 'Left lamp' }) });
    await current.evaluate(() => localStorage.setItem('cleanframe.alexa.v1', JSON.stringify({ serial: 'X', domain: 'com', site: 'com', refresh: 'Atzr|test', access: 'Atza|test', at: Date.now() })));
    await current.reload(); await ready();
    const s = await stored();
    check('The old sensor and light become a reading and a switch', s.alexaReadings.length === 1 && s.alexaReadings[0].key === 'temp' && s.alexaSwitches[0].id === 'amzn1.alexa.endpoint.lamp-1' && s.alexaTemp === undefined, s);
    await current.waitForFunction(() => document.querySelector('.weather.indoor'));
    check('Home shows them at once', /22.4°/.test(await current.evaluate(() => document.querySelector('.weather.indoor').textContent)) && await current.evaluate(() => !!document.querySelector('[data-action="util.sw0"]')));
  });
  await run('Your picture arrives from a phone', async () => {
    await page(); await group('background');
    let polls = 0;
    current.__relay = { id: 'Ab12Cd34Ef56', image: 'app/assets/wallpapers/golden.jpg', ready: () => ++polls > 1 };
    await act('background.custom');
    const opened = await state();
    check('Opening creates a private channel and shows its QR code', /^framehome-[a-z0-9]{20}$/.test(opened.relayTopic) && opened.view === 'phone' && await current.evaluate(() => /github\.io\/CleanFrame\/send|ntfy\.sh\/framehome-/.test(document.querySelector('.phone-url').textContent)));
    await current.waitForFunction(() => ShoreQA.state().wall === 'custom' && ShoreQA.ready(), null, { timeout: 30000 });
    const after = await state();
    check('The picture becomes the saved photo background', after.bg === 'photo' && after.customAt > 0 && after.relaySince === 'Ab12Cd34Ef56', after);
    await current.waitForTimeout(3500);
    check('An already handled message is not processed again', (await state()).customAt === after.customAt && !(await state()).pending);
    check('Every material is generated on the TV', await current.evaluate(() => ['photo', 'matImg', 'sheetBg'].every(id => { const im = document.getElementById(id); return im && /^blob:/.test(im.src) && im.naturalWidth > 0; })));
    await current.waitForFunction(() => /Done|Kész/.test(document.querySelector('.phone-status').textContent));
    await nav('ok');
    check('Done returns to Background', (await state()).settingsGroup === 'background');
    await act('background.wallpaper');
    const picker = await current.evaluate(() => ({ view: ShoreQA.state().view, ids: [...document.querySelectorAll('[data-action^="wallpaper.choose."]')].map(e => e.getAttribute('data-action')) }));
    check('Your picture is in the wallpaper list', picker.ids.includes('wallpaper.choose.custom'), picker);
    current.__relay = null;
    await current.reload(); await ready();
    check('The picture is restored after a restart', (await state()).wall === 'custom' && await current.evaluate(() => /^blob:/.test(document.getElementById('photo').src) && document.getElementById('photo').naturalWidth === 1920));
  });
  await run('Your picture arrives after the screen is closed', async () => {
    await page(); await group('background');
    await act('background.custom');
    await current.waitForFunction(() => /Waiting|Várakozás/.test(document.querySelector('.phone-status').textContent));
    await nav('ok');
    check('Closing returns to Background', (await state()).settingsGroup === 'background');
    await act('background.custom');
    check('Reopening still shows the QR code', await current.evaluate(() => { const c = document.querySelector('.phone-qr'), d = c.getContext('2d').getImageData(0, 0, c.width, c.height).data; let dark = 0; for (let i = 0; i < d.length; i += 4) if (d[i] < 64) dark++; return dark > 5000; }));
    await nav('ok');
    current.__relay = { id: 'Bg12Cd34Ef56', image: 'app/assets/wallpapers/golden.jpg', ready: () => true };
    await current.waitForFunction(() => ShoreQA.state().wall === 'custom' && ShoreQA.ready(), null, { timeout: 30000 });
    check('The TV keeps listening and applies the picture', (await state()).relaySince === 'Bg12Cd34Ef56');
  });
  await run('Your picture plays a short video', async () => {
    await page(); await group('background');
    current.__relay = { id: 'Vd12Cd34Ef56', image: 'scripts/fixtures/loop.mp4', type: 'video/mp4', name: 'aurora.mp4', ready: () => true };
    await act('background.custom');
    await current.waitForFunction(() => ShoreQA.state().wall === 'custom' && ShoreQA.ready(), null, { timeout: 30000 });
    check('The first frame becomes the photo and glass', await current.evaluate(() => { const photo = document.getElementById('photo'), mat = document.getElementById('matImg'); return /^blob:/.test(photo.src) && photo.naturalWidth === 1920 && /^blob:/.test(mat.src) && mat.naturalWidth > 0; }));
    check('The video waits while a sheet covers Home', await current.evaluate(() => { const v = document.getElementById('photoVideo'); return /^blob:/.test(v.src) && v.paused; }));
    await nav('ok'); await scene('home');
    await current.waitForFunction(() => { const v = document.getElementById('photoVideo'); return !v.paused && v.loop && v.muted && /is-playing/.test(v.className); }, null, { timeout: 10000 });
    check('On Home the video loops muted over the photo', true);
    await scene('settings');
    check('Opening Settings pauses it', await current.evaluate(() => document.getElementById('photoVideo').paused));
    current.__relay = null;
    await current.reload(); await ready();
    await current.waitForFunction(() => { const v = document.getElementById('photoVideo'); return /^blob:/.test(v.src) && !v.paused; }, null, { timeout: 10000 });
    check('The video is restored after a restart', (await state()).wall === 'custom');
    await look({ wall: 'misty' });
    check('Another wallpaper releases the video', await current.evaluate(() => !document.getElementById('photoVideo').getAttribute('src')));
  });
  await run('Your picture uses the cover of a video when the TV cannot read frames', async () => {
    await page(); await group('background');
    // Samsung TVs draw video on a hardware plane: a canvas copy of a frame is black.
    await current.evaluate(() => { const draw = CanvasRenderingContext2D.prototype.drawImage; CanvasRenderingContext2D.prototype.drawImage = function (source) { if (source instanceof HTMLVideoElement) { this.fillStyle = '#000'; this.fillRect(0, 0, this.canvas.width, this.canvas.height); return; } return draw.apply(this, arguments); }; });
    current.__relay = { id: 'Cv12Cd34Ef56', image: 'scripts/fixtures/loop-cover.mp4', type: 'video/mp4', name: 'aurora.mp4', ready: () => true };
    await act('background.custom');
    await current.waitForFunction(() => ShoreQA.state().wall === 'custom' && ShoreQA.ready(), null, { timeout: 30000 });
    const red = await current.evaluate(() => { const im = document.getElementById('photo'), c = document.createElement('canvas'); c.width = 16; c.height = 9; const x = c.getContext('2d'); x.drawImage(im, 0, 0, 16, 9); const d = x.getImageData(0, 0, 16, 9).data; let r = 0, g = 0; for (let i = 0; i < d.length; i += 4) { r += d[i]; g += d[i + 1]; } return r > g * 3; });
    check('The embedded cover becomes the photo, not a black frame', red);
    await current.waitForFunction(() => /Done|Kész/.test(document.querySelector('.phone-status').textContent));
  });
  await run('Your picture keeps neutral glass when a video has no readable still', async () => {
    await page(); await group('background');
    await current.evaluate(() => { const draw = CanvasRenderingContext2D.prototype.drawImage; CanvasRenderingContext2D.prototype.drawImage = function (source) { if (source instanceof HTMLVideoElement) { this.fillStyle = '#000'; this.fillRect(0, 0, this.canvas.width, this.canvas.height); return; } return draw.apply(this, arguments); }; });
    current.__relay = { id: 'Ns12Cd34Ef56', image: 'scripts/fixtures/loop.mp4', type: 'video/mp4', name: 'clip.mp4', ready: () => true };
    await act('background.custom');
    await current.waitForFunction(() => ShoreQA.state().wall === 'custom' && ShoreQA.ready(), null, { timeout: 30000 });
    await current.waitForFunction(() => /neutral|semleges/.test(document.querySelector('.phone-status').textContent), null, { timeout: 10000 });
    const lit = await current.evaluate(() => { const im = document.getElementById('matImg'), c = document.createElement('canvas'); c.width = 16; c.height = 9; const x = c.getContext('2d'); x.drawImage(im, 0, 0, 16, 9); const d = x.getImageData(0, 0, 16, 9).data; let s = 0; for (let i = 0; i < d.length; i += 4) s += d[i] + d[i + 1] + d[i + 2]; return s / (d.length / 4 * 3); });
    check('The glass is a neutral tint, not black', lit > 8, lit);
  });
  await run('Your picture uses the still the send page puts before a video', async () => {
    await page(); await group('background');
    await current.evaluate(() => { const draw = CanvasRenderingContext2D.prototype.drawImage; CanvasRenderingContext2D.prototype.drawImage = function (source) { if (source instanceof HTMLVideoElement) { this.fillStyle = '#000'; this.fillRect(0, 0, this.canvas.width, this.canvas.height); return; } return draw.apply(this, arguments); }; });
    current.__relay = { ready: () => true, messages: [
      { id: 'St12Cd34Ef56', image: 'scripts/fixtures/still-red.jpg', type: 'image/jpeg', name: 'still.jpg', tags: ['frame-home-still'] },
      { id: 'Vs12Cd34Ef56', image: 'scripts/fixtures/loop.mp4', type: 'video/mp4', name: 'clip.mp4' }] };
    await act('background.custom');
    await current.waitForFunction(() => ShoreQA.state().wall === 'custom' && ShoreQA.ready(), null, { timeout: 30000 });
    await current.waitForFunction(() => /Done|Kész/.test(document.querySelector('.phone-status').textContent)).catch(async e => { throw Error('status: ' + await current.evaluate(() => document.querySelector('.phone-status') && document.querySelector('.phone-status').textContent + ' view=' + ShoreQA.state().view)); });
    const red = await current.evaluate(() => { const im = document.getElementById('photo'), c = document.createElement('canvas'); c.width = 16; c.height = 9; const x = c.getContext('2d'); x.drawImage(im, 0, 0, 16, 9); const d = x.getImageData(0, 0, 16, 9).data; let r = 0, g = 0; for (let i = 0; i < d.length; i += 4) { r += d[i]; g += d[i + 1]; } return r > g * 3; });
    check('The still sent before the video becomes the photo', red);
    check('The still alone does not become the background', (await state()).relaySince === 'Vs12Cd34Ef56');
  });
  await run('Send page prepares photos and videos within 1.9 MB', async () => {
    const phone = await preview.browser.newPage({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 1 });
    const puts = [];
    await phone.route('https://ntfy.sh/**', async route => { const r = route.request(); puts.push({ method: r.method(), url: r.url(), filename: r.headers()['filename'], tags: r.headers()['tags'] || '', size: (r.postDataBuffer() || Buffer.alloc(0)).length, jpeg: (r.postDataBuffer() || Buffer.alloc(2))[0] === 0xff }); await route.fulfill({ status: 200, headers: { 'Access-Control-Allow-Origin': '*' }, body: '{}' }); });
    const pageUrl = 'file://' + root + 'docs/send/index.html';
    try {
      await phone.goto(pageUrl);
      check('Without a channel the page explains where to open it', await phone.evaluate(() => document.body.className === 'no-channel'));
      await phone.goto(pageUrl + '#framehome-abcdefghijk234567890'); await phone.reload();
      // A noisy 3000 x 2000 bitmap: about 18 MB raw, well over the limit as a plain JPEG.
      const w = 3000, h = 2000, row = w * 3 + ((4 - w * 3 % 4) % 4), bmp = Buffer.alloc(54 + row * h);
      bmp.write('BM'); bmp.writeUInt32LE(bmp.length, 2); bmp.writeUInt32LE(54, 10); bmp.writeUInt32LE(40, 14); bmp.writeInt32LE(w, 18); bmp.writeInt32LE(h, 22); bmp.writeUInt16LE(1, 26); bmp.writeUInt16LE(24, 28);
      for (let i = 54; i < bmp.length; i++) bmp[i] = (i * 2654435761 >>> 24) ^ (i >> 7);
      await phone.setInputFiles('#file', { name: 'IMG_0001.bmp', mimeType: 'image/bmp', buffer: bmp });
      await phone.waitForFunction(() => !document.getElementById('send').disabled, null, { timeout: 30000 });
      await phone.click('#send'); await phone.waitForFunction(() => /Sent|Elküldve/.test(document.getElementById('status').textContent));
      check('A large photo is resized to a JPEG under 1.9 MB', puts.length === 1 && puts[0].method === 'PUT' && puts[0].jpeg && puts[0].size <= 1900000 && /\/framehome-abcdefghijk234567890$/.test(puts[0].url) && puts[0].filename === 'IMG_0001.jpg', puts);
      puts.length = 0;
      await phone.setInputFiles('#file', { name: 'broken.mp4', mimeType: 'video/mp4', buffer: Buffer.alloc(2000000) });
      await phone.waitForFunction(() => /cannot open|nem tudja megnyitni/.test(document.getElementById('status').textContent));
      check('A file that is not a playable video is refused before sending', puts.length === 0 && await phone.evaluate(() => document.getElementById('send').disabled));
      await phone.setInputFiles('#file', root + 'scripts/fixtures/loop.mp4');
      await phone.waitForFunction(() => !document.getElementById('send').disabled, null, { timeout: 30000 });
      await phone.click('#send'); await phone.waitForFunction(() => /Sent|Elküldve/.test(document.getElementById('status').textContent));
      check('A video goes after a tagged still of its first frame', puts.length === 2 && puts[0].tags === 'frame-home-still' && puts[0].jpeg && puts[1].filename === 'loop.mp4' && puts[1].tags === '', puts);
    } finally { await phone.close(); }
  });
  await run('Send page sends a larger video unchanged, in parts', async () => {
    const phone = await preview.browser.newPage({ viewport: { width: 390, height: 844 } });
    const puts = [];
    // A 200 kB part size splits the 483 kB fixture into three parts.
    await phone.addInitScript(() => { window.__frameHomeLimit = 200000; });
    await phone.route('https://ntfy.sh/**', async route => { const r = route.request(); puts.push({ filename: r.headers()['filename'], tags: r.headers()['tags'] || '', title: r.headers()['title'] || '', data: r.postDataBuffer() || Buffer.alloc(0) }); await route.fulfill({ status: 200, headers: { 'Access-Control-Allow-Origin': '*' }, body: '{}' }); });
    try {
      await phone.goto('file://' + root + 'docs/send/index.html#framehome-abcdefghijk234567890');
      await phone.setInputFiles('#file', root + 'scripts/fixtures/big.mp4');
      await phone.waitForFunction(() => !document.getElementById('send').disabled, null, { timeout: 30000 });
      check('A video within the total goes in original quality', /original|eredeti/.test(await phone.textContent('#meta')), await phone.textContent('#meta'));
      await phone.click('#send'); await phone.waitForFunction(() => /Sent|Elküldve/.test(document.getElementById('status').textContent));
      const parts = puts.slice(1), original = readFileSync(root + 'scripts/fixtures/big.mp4');
      check('The still goes first, then three numbered parts', puts.length === 4 && puts[0].tags === 'frame-home-still' && parts.every((x, i) => new RegExp('^frame-home-part,u-[a-z0-9]{10},i-' + i + ',n-3$').test(x.tags) && x.data.length <= 200000 && x.title === 'big.mp4'), puts.map(x => [x.filename, x.tags, x.data.length]));
      check('The parts join back into the original file', Buffer.concat(parts.map(x => x.data)).equals(original));
    } finally { await phone.close(); }
  });
  await run('Send page compresses only videos over the total, at good quality', async () => {
    const phone = await preview.browser.newPage({ viewport: { width: 390, height: 844 } });
    const puts = [];
    // A 400 kB total forces the 483 kB fixture through the encoder; the bitrate floor is lowered to match.
    await phone.addInitScript(() => { window.__frameHomeLimit = 200000; window.__frameHomeTotal = 400000; window.__frameHomeMinRate = 100000; });
    await phone.route('https://ntfy.sh/**', async route => { const r = route.request(); puts.push({ tags: r.headers()['tags'] || '', data: r.postDataBuffer() || Buffer.alloc(0) }); await route.fulfill({ status: 200, headers: { 'Access-Control-Allow-Origin': '*' }, body: '{}' }); });
    try {
      await phone.goto('file://' + root + 'docs/send/index.html#framehome-abcdefghijk234567890');
      await phone.setInputFiles('#file', root + 'scripts/fixtures/big.mp4');
      await phone.waitForFunction(() => !document.getElementById('send').disabled || /cannot|nem|could not/i.test(document.getElementById('status').textContent), null, { timeout: 60000 });
      const metaText = await phone.textContent('#meta');
      check('The page re-encodes at 720p or better', /→.*(720|1080)p/.test(metaText), metaText + ' | ' + await phone.textContent('#status'));
      await phone.click('#send'); await phone.waitForFunction(() => /Sent|Elküldve/.test(document.getElementById('status').textContent));
      const video = Buffer.concat(puts.slice(1).map(x => x.data));
      check('The result is an MP4 within the total', puts[0].tags === 'frame-home-still' && video.slice(4, 8).toString() === 'ftyp' && video.length <= 400000, puts.map(x => [x.tags, x.data.length]));
      await phone.addInitScript(() => { window.__frameHomeMinRate = 50000000; });
      await phone.reload(); await phone.setInputFiles('#file', root + 'scripts/fixtures/big.mp4');
      await phone.waitForFunction(() => /good quality|jó minőségben/.test(document.getElementById('status').textContent), null, { timeout: 30000 });
      check('When the quality floor cannot be kept the video is refused, not degraded', await phone.evaluate(() => document.getElementById('send').disabled));
    } finally { await phone.close(); }
  });
  await run('Your picture joins a video sent in parts', async () => {
    await page(); await group('background');
    await current.evaluate(() => { const draw = CanvasRenderingContext2D.prototype.drawImage; CanvasRenderingContext2D.prototype.drawImage = function (source) { if (source instanceof HTMLVideoElement) { this.fillStyle = '#000'; this.fillRect(0, 0, this.canvas.width, this.canvas.height); return; } return draw.apply(this, arguments); }; });
    const size = readFileSync(root + 'scripts/fixtures/loop-cover.mp4').length, cut = [0, 15000, 30000, size];
    current.__relay = { ready: () => true, messages: [0, 1, 2].map(i => ({ id: 'Pt' + i + 'aCd34Ef56', image: 'scripts/fixtures/loop-cover.mp4', slice: [cut[i], cut[i + 1]], type: 'application/octet-stream', name: 'abcdefghij-' + i + '.part', title: 'holiday.mp4', tags: ['frame-home-part', 'u-abcdefghij', 'i-' + i, 'n-3'] })) };
    await act('background.custom');
    await current.waitForFunction(() => ShoreQA.state().wall === 'custom' && ShoreQA.ready(), null, { timeout: 30000 });
    await current.waitForFunction(() => /Done|Kész/.test(document.querySelector('.phone-status').textContent));
    const red = await current.evaluate(() => { const im = document.getElementById('photo'), c = document.createElement('canvas'); c.width = 16; c.height = 9; const x = c.getContext('2d'); x.drawImage(im, 0, 0, 16, 9); const d = x.getImageData(0, 0, 16, 9).data; let r = 0, g = 0; for (let i = 0; i < d.length; i += 4) { r += d[i]; g += d[i + 1]; } return r > g * 3; });
    check('The joined file is the original video with its cover', red && (await state()).relaySince === 'Pt2aCd34Ef56');
    await nav('ok'); await scene('home');
    await current.waitForFunction(() => { const v = document.getElementById('photoVideo'); return !v.paused && /is-playing/.test(v.className); }, null, { timeout: 10000 });
    check('The joined video plays on Home', true);
  });
  await run('Your picture survives slow or failing storage at power-on', async () => {
    await page(); await group('background');
    current.__relay = { id: 'Sl12Cd34Ef56', image: 'app/assets/wallpapers/golden.jpg', ready: () => true };
    await act('background.custom');
    await current.waitForFunction(() => ShoreQA.state().wall === 'custom' && ShoreQA.ready(), null, { timeout: 30000 });
    current.__relay = null;
    const savedWall = () => current.evaluate(() => JSON.parse(localStorage.getItem('cleanframe.home.v1')).look.wall);
    // Power-on with storage answering only after 9 s: Home starts on borrowed files, and a write
    // made meanwhile (a launched app, a changed setting) must not replace the saved choice.
    await current.addInitScript(() => { let v; Object.defineProperty(window, 'FrameCustomWallpaper', { configurable: true, get() { return v; }, set(x) { const load = x.load; x.load = cb => setTimeout(() => load(cb), 9000); v = x; } }); });
    await current.reload();
    await current.waitForFunction(() => window.ShoreQA && ShoreQA.ready && ShoreQA.ready(), null, { timeout: 15000 });
    check('Home starts on the first wallpaper while storage is slow', await current.evaluate(() => /wallpapers\//.test(document.getElementById('photo').src)) && (await state()).wall === 'custom');
    await scene('settings'); await act('settings.group.region'); await act('choice.date.on');
    check('A write while waiting keeps the saved picture', await savedWall() === 'custom', await savedWall());
    await current.waitForFunction(() => /^blob:/.test(document.getElementById('photo').src), null, { timeout: 20000 });
    check('The picture comes back once storage answers', (await state()).wall === 'custom' && await savedWall() === 'custom');
    // Storage that errors twice before answering.
    await current.addInitScript(() => { let v, n = 0; Object.defineProperty(window, 'FrameCustomWallpaper', { configurable: true, get() { return v; }, set(x) { const load = x.load; x.load = cb => (++n <= 2 ? setTimeout(() => cb(null, true), 50) : load(cb)); v = x; } }); });
    await current.reload();
    await current.waitForFunction(() => window.ShoreQA && /^blob:/.test(document.getElementById('photo').src), null, { timeout: 30000 });
    check('Failing storage is retried, not treated as a lost picture', (await state()).wall === 'custom' && await savedWall() === 'custom');
  });
  await run('Your picture that is really gone says so', async () => {
    await page(); await group('background');
    current.__relay = { id: 'Gn12Cd34Ef56', image: 'app/assets/wallpapers/golden.jpg', ready: () => true };
    await act('background.custom');
    await current.waitForFunction(() => ShoreQA.state().wall === 'custom' && ShoreQA.ready(), null, { timeout: 30000 });
    current.__relay = null;
    await current.evaluate(() => new Promise(done => { const r = indexedDB.open('framehome', 1); r.onsuccess = () => { const tx = r.result.transaction('files', 'readwrite'); tx.objectStore('files').clear(); tx.oncomplete = () => { r.result.close(); done(); }; }; }));
    await current.reload(); await ready();
    const after = await state();
    check('A missing picture switches to the first wallpaper and is saved that way', after.wall !== 'custom' && !after.customAt, after.wall);
    await group('background'); await act('background.custom');
    await current.waitForFunction(() => /no longer|már nem/.test(document.querySelector('.phone-status').textContent), null, { timeout: 10000 });
    check('The Your picture screen asks to send it again', true);
  });
  await run('Your picture ignores files that are not pictures', async () => {
    await page(); await group('background');
    current.__relay = { id: 'Zz98Yy76Xx54', image: 'app/assets/wallpapers/golden.jpg', type: 'application/pdf', name: 'tickets.pdf', ready: () => true };
    await act('background.custom');
    await current.waitForFunction(() => /picture|kép/.test(document.querySelector('.phone-status').textContent) && ShoreQA.state().relaySince === 'Zz98Yy76Xx54');
    check('A PDF leaves the background unchanged', (await state()).wall !== 'custom' && !(await state()).customAt);
  });
  await run('Settings focus never changes the applied Home', async () => {
    await page();
    for (const name of ['background', 'layout', 'typography', 'focus', 'region']) {
      await group(name); const before = await settingsSnapshot();
      const visited = new Set();
      for (const direction of ['right', 'right', 'down', 'left', 'left', 'down', 'right', 'right', 'down', 'left', 'up', 'up', 'up', 'right']) {
        await nav(direction); visited.add((await state()).focusAction);
        const after = await settingsSnapshot();
        if (!same(after, before)) throw Error(name + ' navigation changed committed state, Home preview or storage: ' + JSON.stringify({ before, after }));
        if ((await call('where')).focusCount !== 1) throw Error(name + ' navigation did not keep one focus');
      }
      check(name + ' arrows browse choices without preview or storage writes', visited.size > 1, [...visited]);
      const firstRadio = (await radios())[0];
      if (firstRadio) {
        await current.locator('[data-action="' + firstRadio.action + '"]').dispatchEvent('mouseover');
        check(name + ' pointer hover does not apply a choice', same(await settingsSnapshot(), before));
      }
      await nav('back');
      check(name + ' Back cancels the unconfirmed choice', same(await settingsSnapshot(), before) && (await state()).focusAction === 'settings.group.' + (name === 'focus' ? 'typography' : name));
    }
    check('Browsing Settings does not launch a native app', (await current.evaluate(() => __tv.calls.length)) === 0);
    await group('background'); await act('background.rotation'); const before = await settingsSnapshot();
    await nav('down', 'down', 'up', 'right', 'left');
    check('Rotation arrows do not save a mode', same(await settingsSnapshot(), before));
    await nav('back'); check('Unconfirmed Rotation choice is cancelled', same(await settingsSnapshot(), before) && (await state()).settingsGroup === 'background');
  });
  await run('Settings on-screen Back preserves choice focus', async () => {
    await page(); await group('layout'); const before = await settingsSnapshot();
    const candidate = await unselectedChoice();
    await act('settings.back');
    check('On-screen Back returns to the matching overview category', (await state()).view === 'settings' && (await state()).focusAction === 'settings.group.layout');
    check('On-screen Back keeps unconfirmed choice unapplied', same(await settingsSnapshot(), before));
    await act('settings.group.layout');
    check('Reopening restores the last real setting after on-screen Back', (await state()).focusAction === candidate.select, { expected: candidate.select, actual: (await state()).focusAction });
    await nav('back'); await act('settings.group.layout');
    check('Physical Back also preserves the last real setting', (await state()).focusAction === candidate.select);
  });
  await run('Settings OK applies explicit choices atomically', async () => {
    await page();
    const specs = [
      ['background', 'bg', ['dark', 'photo']],
      ['layout', 'apps', ['icons', 'text', 'both']],
      ['layout', 'controls', ['text', 'both', 'icons']],
      ['typography', 'font', (await state()).fonts.available],
      ['focus', 'focus', ['type', 'glass']],
      ['focus', 'material', ['frost', 'tint', 'soft']]
    ];
    for (const [name, axis, values] of specs) {
      await group(name);
      const selected = await settingsSnapshot(); await choice(axis, selected.committed[axis]); await ready();
      check(axis + ' OK on applied choice does not write again', same(await settingsSnapshot(), selected));
      for (const value of values) {
        const before = await settingsSnapshot(); await choice(axis, value); await ready();
        const after = await settingsSnapshot(), rows = await radios();
        const expectedWrites = before.writes + (before.committed[axis] === value ? 0 : 1);
        const untouched = { ...after.committed, [axis]: before.committed[axis] };
        const prefix = { bg: 'bg', layout: 'l', apps: 'a', controls: 'u', focus: 'f', material: 'm', font: 'font' }[axis];
        const shown = !Object.hasOwn(after.shown, axis) || after.shown[axis] === value;
        check(axis + ' OK applies ' + value + ' once', after.committed[axis] === value && shown && after.rendered.includes(prefix + '-' + value) && same(untouched, before.committed) && expectedWrites === after.writes && after.storageAttempts - before.storageAttempts === expectedWrites - before.writes && rows.some(r => r.action === 'choice.' + axis + '.' + value && r.checked === 'true'), { before, after, rows });
      }
      const applied = await settingsSnapshot(); await nav('back');
      check(axis + ' applied choice survives Back', same(await settingsSnapshot(), applied) && (await state()).focusAction === 'settings.group.' + (name === 'focus' ? 'typography' : name));
    }
    await group('background'); await act('background.rotation');
    const selected = await settingsSnapshot(); await act('rotation.' + selected.committed.mode);
    check('Rotation OK on applied mode does not write again', same(await settingsSnapshot(), selected));
    for (const value of ['open', '5', '15', '60', 'fixed']) {
      const before = await settingsSnapshot(); await act('rotation.' + value);
      check('Rotation OK applies ' + value + ' once', (await state()).mode === value && (await stored()).mode === value && (await state()).writes === before.writes + 1 && (await radios()).some(r => r.action === 'rotation.' + value && r.checked === 'true'));
    }
    await group('layout'); const before = await settingsSnapshot(), candidate = await unselectedChoice();
    const [, axis, value] = candidate.action.split('.');
    await current.keyboard.down('Enter'); await current.keyboard.down('Enter'); await ready();
    check('Held physical OK applies the focused choice once', (await state()).committed[axis] === value && (await state()).writes === before.writes + 1);
    await current.keyboard.up('Enter');
    await current.keyboard.down('Escape'); await current.keyboard.down('Escape');
    check('Held physical Back closes one settings layer', (await state()).view === 'settings' && (await state()).focusAction === 'settings.group.layout');
    await current.keyboard.up('Escape');
  });
  await run('Settings inactive Material retains its choice', async () => {
    await page(); await look({ material: 'tint' });
    for (const patch of [{ bg: 'dark' }]) {
      await look(patch); await group('focus'); const before = await settingsSnapshot();
      const materials = (await radios()).filter(r => r.action.startsWith('choice.material.'));
      check('Material stays visible but inactive for ' + JSON.stringify(patch), materials.length === 3 && materials.every(r => r.disabled) && materials.some(r => r.action === 'choice.material.tint' && r.checked === 'true'), materials);
      const focusBefore = (await state()).focusAction;
      await current.locator('[data-action="choice.material.frost"]').dispatchEvent('click');
      check('Inactive Material ignores pointer focus and application', same(await settingsSnapshot(), before) && (await state()).focusAction === focusBefore);
      await walkEnabledChoices();
      check('Remote navigation skips inactive Material', same(await settingsSnapshot(), before));
      const reason = await current.locator('.set-note:visible').allTextContents();
      check('Inactive Material has a visible explanation', reason.some(text => /material/i.test(text) && text.length > 20), reason);
    }
    await look({ bg: 'photo', layout: 'dock', focus: 'glass' }); await group('focus');
    const materials = (await radios()).filter(r => r.action.startsWith('choice.material.'));
    check('Applicable Material restores the remembered selection', materials.every(r => !r.disabled) && materials.some(r => r.action === 'choice.material.tint' && r.checked === 'true'));
  });
  await run('Settings inactive photo tools retain wallpaper preferences', async () => {
    await page();
    for (const bg of ['dark']) {
      await look({ bg }); await group('background'); const before = await settingsSnapshot();
      for (const action of ['background.wallpaper', 'background.rotation']) {
        check(bg + ' marks ' + action + ' inactive', await current.locator('[data-action="' + action + '"]').getAttribute('aria-disabled') === 'true');
        const focusBefore = (await state()).focusAction;
        await current.locator('[data-action="' + action + '"]').click({ force: true });
        check('Inactive ' + action + ' ignores pointer focus and keeps preferences', same(await settingsSnapshot(), before) && (await state()).settingsGroup === 'background' && (await state()).focusAction === focusBefore);
      }
      await walkEnabledChoices();
      check(bg + ' remote navigation skips inactive photo tools', same(await settingsSnapshot(), before));
      const reason = await current.locator('.set-note:visible').allTextContents();
      check(bg + ' explains how to enable photo tools', reason.some(text => /photo/i.test(text) && /wallpaper|rotation/i.test(text)), reason);
    }
  });
  await run('Settings normalises remembered inactive focus', async () => {
    await page(); await group('focus'); await choice('material', 'tint'); await ready();
    await nav('back'); await act('settings.group.background'); await choice('bg', 'dark'); await ready();
    await nav('back'); await act('settings.group.typography');
    const focus = (await state()).focusAction;
    check('Inactive remembered Material returns to an enabled setting on the Style page', /^select\./.test(focus) && focus !== 'select.material', focus);
    check('Changing Background preserves remembered Material', (await state()).look.material === 'tint');
    await look({ bg: 'photo' }); await group('background'); await act('background.rotation'); await act('rotation.fixed');
    await look({ bg: 'dark' }); const before = await settingsSnapshot();
    check('All-inactive Rotation restores its enabled Back action', (await state()).focusAction === 'settings.back');
    const visited = await walkEnabledChoices();
    check('All-inactive Rotation traps focus on its enabled Back action', visited.every(a => a === 'settings.back') && same(await settingsSnapshot(), before), visited);
    await current.locator('[data-action="rotation.5"]').dispatchEvent('click');
    check('Inactive Rotation ignores pointer clicks', (await state()).focusAction === 'settings.back' && same(await settingsSnapshot(), before));
    await nav('back');
    const returned = (await state()).focusAction;
    check('Rotation Back skips its now-inactive Background row', (await state()).settingsGroup === 'background' && returned === 'select.bg', returned);
  });
  await run('Settings Back cancels pending assets and late callbacks', async () => {
    await page(); await group('focus'); const before = await settingsSnapshot();
    const held = [], pattern = '**/*-field-frost.jpg';
    let releaseImages;
    const blocked = new Promise(resolve => { releaseImages = resolve; });
    await current.route(pattern, async route => { held.push(route.request().url()); await blocked; await route.continue(); });
    try {
      await choice('material', 'frost'); await current.waitForFunction(() => !!ShoreQA.state().pending);
      check('Pending choice keeps the committed Home and storage', same(await settingsSnapshot(), before));
      await nav('back'); await ready();
      check('Back cancels pending choice and restores category focus', same(await settingsSnapshot(), before) && (await state()).view === 'settings' && (await state()).focusAction === 'settings.group.typography');
      releaseImages();
      await current.waitForLoadState('networkidle');
      check('Late image completion cannot commit a cancelled choice', held.length > 0 && same(await settingsSnapshot(), before) && !(await state()).pending);
    } finally { releaseImages(); await current.unroute(pattern); }
  });
  await run('Settings Back cancels a delayed font choice', async () => {
    await page(); await group('typography'); const before = await settingsSnapshot();
    const held = [], pattern = '**/fonts/newsreader/*';
    let releaseFont;
    const blocked = new Promise(resolve => { releaseFont = resolve; });
    await current.route(pattern, async route => { held.push(route.request().url()); await blocked; await route.continue(); });
    try {
      await choice('font', 'newsreader'); await current.waitForFunction(() => !!ShoreQA.state().pending);
      check('Loading a font keeps applied typography and its checked choice', same(await settingsSnapshot(), before) && (await radios()).some(r => r.action === 'choice.font.manrope' && r.checked === 'true'));
      await nav('back'); await ready();
      check('Back cancels the font choice and restores Typography focus', same(await settingsSnapshot(), before) && (await state()).focusAction === 'settings.group.typography');
      releaseFont(); await current.waitForLoadState('networkidle');
      check('Late font completion cannot apply the cancelled choice', held.length > 0 && same(await settingsSnapshot(), before) && !(await state()).pending);
      await group('typography'); await choice('font', 'newsreader'); await ready();
      check('Cancelled font remains available for a fresh explicit apply', (await state()).look.font === 'newsreader' && (await state()).shown.font === 'newsreader' && (await state()).writes === before.writes + 1);
    } finally { releaseFont(); await current.unroute(pattern); }
  });
  await run('Settings choice failure and explicit retry', async () => {
    await page(); await group('focus'); const original = await settingsSnapshot();
    current.__expectedFailures.push('-field-frost.jpg');
    await current.route('**/*-field-frost.jpg', route => route.abort('failed'));
    await choice('material', 'frost'); await current.waitForFunction(() => !ShoreQA.state().pending);
    check('Failed image keeps the applied radio and Home', same(await settingsSnapshot(), original) && (await radios()).some(r => r.action === 'choice.material.soft' && r.checked === 'true'));
    check('Failed explicit choice exposes Retry', (await call('actions')).includes('settings.retry'));
    await current.unroute('**/*-field-frost.jpg'); await act('settings.retry'); await ready();
    check('Retry applies the same failed choice', (await state()).look.material === 'frost' && (await state()).shown.material === 'frost' && (await state()).writes === original.writes + 1);
    await group('background'); const before = await settingsSnapshot();
    await current.evaluate(() => { __failWrites = true; }); await choice('bg', 'dark');
    await current.waitForFunction(() => !ShoreQA.state().pending);
    const failed = await settingsSnapshot();
    check('Failed choice write keeps the committed radio and preview', same(failed.committed, before.committed) && same(failed.shown, before.shown) && failed.stored === before.stored && failed.writes === before.writes && (await radios()).some(r => r.action === 'choice.bg.photo' && r.checked === 'true'));
    await current.evaluate(() => { __failWrites = false; }); await act('settings.retry'); await ready();
    check('Storage Retry applies once through the explicit choice', (await state()).look.bg === 'dark' && (await state()).shown.bg === 'dark' && (await state()).writes === before.writes + 1);
  });
  await run('Settings choices fit both target viewports', async () => {
    await page();
    for (const width of [1920, 1280]) {
      await current.setViewportSize({ width, height: width * 9 / 16 });
      await current.waitForFunction(w => Math.abs(document.getElementById('stage').getBoundingClientRect().width - w) < 1, width);
      for (const name of ['background', 'layout', 'typography', 'focus', 'region', 'rotation']) {
        await group(name === 'rotation' ? 'background' : name);
        if (name === 'rotation') await act('background.rotation');
        const geometry = await current.evaluate(() => {
          const stage = document.getElementById('stage').getBoundingClientRect();
          const actions = ShoreQA.actions();
          return [...document.querySelectorAll('#stage [data-action]')].filter(e => actions.includes(e.getAttribute('data-action')) && e.getClientRects().length).map(e => {
            const r = e.getBoundingClientRect();
            const parts = [...e.querySelectorAll('.setting-name, .setting-tick svg')].map(part => part.getBoundingClientRect());
            const partsFit = parts.every(p => p.x >= r.x - 1 && p.y >= r.y - 1 && p.right <= r.right + 1 && p.bottom <= r.bottom + 1);
            const name = e.querySelector('.setting-name'), tick = e.querySelector('.setting-tick svg');
            const noOverlap = !name || !tick || name.getBoundingClientRect().right <= tick.getBoundingClientRect().left + 1;
            return { action: e.getAttribute('data-action'), inside: r.x >= stage.x - 1 && r.y >= stage.y - 1 && r.right <= stage.right + 1 && r.bottom <= stage.bottom + 1, fits: e.scrollWidth <= e.clientWidth + 1 && e.scrollHeight <= e.clientHeight + 1 && partsFit && noOverlap, width: r.width, height: r.height };
          });
        });
        check(name + ' choices fit ' + width + ' without clipping', geometry.length > 0 && geometry.every(g => g.inside && g.fits) && (await call('where')).focusCount === 1, geometry);
        await current.screenshot({ path: out + 'settings-' + name + '-' + width + '.jpg', quality: 90 });
      }
    }
    check('Settings retains pre-rendered materials without live blur', (await noLiveFilters()).length === 0, await noLiveFilters());
  });
  await run('Wallpaper failure, preview cancellation and lazy loading', async () => {
    await page();
    const resources = await current.evaluate(() => performance.getEntriesByType('resource').map(r => r.name));
    check('No wallpaper thumbnails loaded at startup', !resources.some(u => /-thumb\./.test(u)), resources.filter(u => /thumb/.test(u)));
    await wallpaper();
    const original = (await stored()).wallpaper;
    await nav('down'); await wallpaperSettled(walls[1].id);
    check('Preview leaves saved photo unchanged', (await stored()).wallpaper === original);
    await nav('back'); await ready(); check('Back restores committed photo', (await state()).shown.wall === original);
    check('Wallpaper Back returns to its Background row', (await state()).settingsGroup === 'background' && (await state()).focusAction === 'background.wallpaper');
    await scene('home'); const target = walls.find(w => w.id !== original && w.id !== walls[1].id).id;
    current.__expectedFailures.push('/' + target + '-');
    await current.route('**/*' + target + '-*.jpg', route => route.abort('failed'));
    const before = await stored(); await call('look', { wall: target });
    await current.waitForFunction(() => !ShoreQA.state().pending, null, { timeout: 15000 });
    check('Failed load keeps saved and displayed photo', same(await stored(), before) && (await state()).shown.wall === original);
    await current.unroute('**/*' + target + '-*.jpg'); await look({ wall: target });
    check('Material can recover after failure', (await state()).shown.wall === target);
  });
  await run('Wallpaper child keeps the Settings frame at both sizes', async () => {
    await page();
    for (const width of [1920, 1280]) for (const layout of ['dock']) {
      await scene('home'); await look({ layout });
      await current.setViewportSize({ width, height: width * 9 / 16 });
      await current.waitForFunction(w => Math.abs(document.getElementById('stage').getBoundingClientRect().width - w) < 1, width);
      await group('background'); const frame = await previewFrame(), before = await wallpaperSaved();
      await act('background.wallpaper');
      await current.waitForFunction(() => ShoreQA.state().view === 'wallpaper');
      const names = await current.locator('.wallpaper-choice .setting-name').allTextContents();
      check(layout + ' Wallpaper shows all fifteen named choices at ' + width, same(names, walls.map(w => w.name)), names);
      check('Wallpaper entry keeps the existing Home frame ' + layout + '/' + width, same(await previewFrame(), frame));
      const first = await wallpaperListGeometry();
      check('Wallpaper list shows about six rows with contained labels ' + layout + '/' + width, first.fullyVisible.length >= 5 && first.fullyVisible.length <= 6 && first.partlyVisible.length <= 7 && first.clippedParts.length === 0 && first.fullyVisible.includes(first.focus) && (await call('where')).focusCount === 1, first);
      await nav('down', 'down'); await wallpaperSettled(walls[2].id);
      check('Browsing preserves saved photo and Settings backdrop ' + layout + '/' + width, same(await wallpaperSaved(), before));
      check('Browsing stays in the same right Home frame ' + layout + '/' + width, same(await previewFrame(), frame));
      check('Applied tick stays separate from preview focus ' + layout + '/' + width, same(await wallpaperApplied(), ['wallpaper.choose.' + before.committed.wall]) && (await state()).focusAction === 'wallpaper.choose.' + walls[2].id && (await state()).shown.wall === walls[2].id && (await call('where')).focusCount === 1);
      await current.screenshot({ path: out + 'wallpaper-' + layout + '-' + width + '.jpg', quality: 90 });
      await nav('back'); await ready();
      check('Wallpaper Back restores its Background row ' + layout + '/' + width, (await state()).settingsGroup === 'background' && (await state()).focusAction === 'background.wallpaper' && (await state()).shown.wall === before.committed.wall && same(await previewFrame(), frame));
    }
  });
  await run('Wallpaper applies in place and Back keeps the latest applied photo', async () => {
    await page(); await wallpaper(); const before = await wallpaperSaved();
    check('Applied wallpaper omits the redundant Apply hint', !/apply.*photo/i.test(await current.locator('#appearanceDesc').innerText()));
    await nav('down'); await wallpaperSettled(walls[1].id);
    check('A browsed photo is not saved by focus', same(await wallpaperSaved(), before));
    check('Unsaved preview explains the OK action', /apply.*photo/i.test(await current.locator('#appearanceDesc').innerText()));
    await nav('ok'); await ready();
    const applied = await wallpaperSaved();
    check('OK applies once while staying inside Wallpaper', (await state()).view === 'wallpaper' && applied.committed.wall === walls[1].id && applied.writes === before.writes + 1 && applied.attempts === before.attempts + 1 && same(await wallpaperApplied(), ['wallpaper.choose.' + walls[1].id]));
    check('Successful apply clears its redundant Apply hint', !/apply.*photo/i.test(await current.locator('#appearanceDesc').innerText()));
    check('Applied photo updates the committed Settings backdrop', applied.backdrop.src.includes('/' + walls[1].id + '-panel.jpg'));
    await nav('ok'); await current.keyboard.down('Enter'); await current.keyboard.down('Enter'); await current.keyboard.up('Enter');
    check('Repeated OK on the applied photo is a no-op', same(await wallpaperSaved(), applied));
    await nav('down'); await wallpaperSettled(walls[2].id); await nav('back'); await ready();
    check('Back after apply restores the latest applied photo', (await state()).shown.wall === walls[1].id && same(await wallpaperSaved(), applied) && (await state()).focusAction === 'background.wallpaper');
    await act('background.wallpaper');
    check('Reopening starts at the applied photo', (await state()).focusAction === 'wallpaper.choose.' + walls[1].id && (await state()).wallpaperPicker.candidate === walls[1].id);
    await current.locator('[data-action="wallpaper.choose.' + walls[3].id + '"]').hover();
    check('Pointer hover does not apply or preview another photo', same(await wallpaperSaved(), applied) && (await state()).shown.wall === walls[1].id);
    await current.locator('[data-action="wallpaper.choose.' + walls[3].id + '"]').click(); await ready();
    check('A pointer row click applies that photo once', (await state()).committed.wall === walls[3].id && (await state()).writes === applied.writes + 1 && (await state()).view === 'wallpaper');
    await act('wallpaper.back'); await ready();
    check('On-screen Wallpaper Back restores Background focus', (await state()).settingsGroup === 'background' && (await state()).focusAction === 'background.wallpaper' && (await state()).shown.wall === walls[3].id);
  });
  await run('Wallpaper navigation is bounded and scrolls the catalogue', async () => {
    await page(); await wallpaper(); const before = await wallpaperSaved();
    await nav('up');
    check('Up from the first wallpaper reaches Back without wrapping', (await state()).focusAction === 'wallpaper.back' && (await state()).shown.wall === walls[0].id);
    check('Back still shows its return hint', /background|return/i.test(await current.locator('#appearanceDesc').innerText()));
    await nav('down');
    check('Down from Back restores the current candidate', (await state()).focusAction === 'wallpaper.choose.' + walls[0].id);
    await nav(...Array(walls.length - 1).fill('down')); await wallpaperSettled(walls.at(-1).id); await wallpaperRowVisible(walls.at(-1).id);
    const end = await wallpaperListGeometry();
    check('Last wallpaper scrolls fully into view', end.fullyVisible.includes('wallpaper.choose.' + walls.at(-1).id) && end.top > 0 && end.clippedParts.length === 0, end);
    await nav('down', 'down');
    check('Down at the catalogue end does not wrap', (await state()).focusAction === 'wallpaper.choose.' + walls.at(-1).id && same(await wallpaperSaved(), before));
    await nav('left'); check('Left from a scrolled row reaches Back', (await state()).focusAction === 'wallpaper.back');
    await nav('right'); check('Right from Back restores the scrolled candidate', (await state()).focusAction === 'wallpaper.choose.' + walls.at(-1).id);
    const top = (await state()).wallpaperPicker.top;
    await nav(...Array(walls.length - 1 - top).fill('up')); await wallpaperSettled(walls[top].id);
    await nav('up'); await wallpaperSettled(walls[top - 1].id);
    check('Up from a scrolled top row continues the catalogue', (await state()).focusAction === 'wallpaper.choose.' + walls[top - 1].id && (await state()).view === 'wallpaper');
    await nav(...Array(top - 1).fill('up')); await wallpaperSettled(walls[0].id); await wallpaperRowVisible(walls[0].id);
    const start = await wallpaperListGeometry();
    check('Returning to the first wallpaper resets scrolling', start.top === 0 && start.fullyVisible.includes('wallpaper.choose.' + walls[0].id), start);
    await nav('up', 'up');
    check('Repeated Up stops at Back with no preference writes', (await state()).focusAction === 'wallpaper.back' && same(await wallpaperSaved(), before));
  });
  await run('Wallpaper rapid browsing debounces work and OK is never lost', async () => {
    await page(); await wallpaper(); const before = await wallpaperSaved();
    const immediate = await current.evaluate(() => {
      const at = performance.now(); ShoreQA.nav('down', 'down', 'down');
      return { at, action: ShoreQA.state().focusAction, shown: ShoreQA.state().shown.wall };
    });
    check('Rapid browsing updates row focus before loading the preview', immediate.action === 'wallpaper.choose.' + walls[3].id && immediate.shown === walls[0].id, immediate);
    await wallpaperSettled(walls[3].id);
    const resources = await current.evaluate(() => performance.getEntriesByType('resource').map(r => ({ name: r.name, start: r.startTime })));
    const latest = resources.find(r => r.name.endsWith('/wallpapers/' + walls[3].id + '.jpg'));
    check('Preview work waits for focus to settle', latest && latest.start - immediate.at >= 100, { delay: latest && latest.start - immediate.at });
    check('Fast skipped rows do not load their full wallpaper bundles', !resources.some(r => [walls[1].id, walls[2].id].some(id => r.name.endsWith('/wallpapers/' + id + '.jpg') || r.name.includes('/materials/' + id + '-'))));
    check('Debounced preview never saves from focus', same(await wallpaperSaved(), before));
    await nav('down', 'ok');
    await current.waitForFunction(id => ShoreQA.state().committed.wall === id && !ShoreQA.state().pending, walls[4].id);
    check('OK during focus debounce applies the current candidate once', (await state()).writes === before.writes + 1 && (await state()).shown.wall === walls[4].id && (await state()).view === 'wallpaper');
  });
  await run('Wallpaper newer previews cancel older queued applies', async () => {
    await page(); await wallpaper(); const before = await wallpaperSaved();
    const first = walls[1].id, latest = walls[2].id, pattern = '**/wallpapers/' + first + '.jpg', held = [];
    let release;
    const blocked = new Promise(resolve => { release = resolve; });
    await current.route(pattern, async route => { held.push(route.request().url()); await blocked; await route.continue(); });
    try {
      await nav('down'); await current.waitForFunction(id => ShoreQA.state().pending && ShoreQA.state().pending.target.wall === id, first);
      await nav('ok'); check('OK while loading records one explicit apply request', !!(await state()).wallpaperPicker.applyPending && same(await wallpaperSaved(), before));
      await nav('down'); await wallpaperSettled(latest);
      check('Browsing away cancels the queued apply', !(await state()).wallpaperPicker.applyPending && same(await wallpaperSaved(), before));
      check('Latest preview installs a matching photo and material bundle', Object.values(await wallpaperBundle()).every(src => src.includes('/' + latest)), await wallpaperBundle());
      release(); await current.waitForLoadState('networkidle');
      check('Older completion cannot overwrite or apply the latest preview', held.length > 0 && (await state()).shown.wall === latest && Object.values(await wallpaperBundle()).every(src => src.includes('/' + latest)) && same(await wallpaperSaved(), before));
      await nav('back'); await ready();
      check('Back restores the complete committed bundle after rapid browsing', Object.values(await wallpaperBundle()).every(src => src.includes('/' + before.committed.wall)));
    } finally { release(); await current.unroute(pattern); }
  });
  await run('Wallpaper Back cancels loading and queued applies', async () => {
    await page(); await wallpaper();
    await current.locator('[data-action="wallpaper.choose.' + walls[1].id + '"]').click(); await ready();
    const applied = await wallpaperSaved();
    for (const [index, back] of [[2, 'remote'], [3, 'pointer']]) {
      if ((await state()).view !== 'wallpaper') await act('background.wallpaper');
      const target = walls[index].id, pattern = '**/wallpapers/' + target + '.jpg', held = [];
      let release;
      const blocked = new Promise(resolve => { release = resolve; });
      await current.route(pattern, async route => { held.push(route.request().url()); await blocked; await route.continue(); });
      try {
        await act('wallpaper.choose.' + target);
        await current.waitForFunction(() => !!ShoreQA.state().pending && !!ShoreQA.state().wallpaperPicker.applyPending);
        if (back === 'remote') await nav('back'); else await current.locator('[data-action="wallpaper.back"]').click();
        await ready();
        check(back + ' Back cancels pending apply and returns to Wallpaper row', (await state()).focusAction === 'background.wallpaper' && (await state()).shown.wall === applied.committed.wall && same(await wallpaperSaved(), applied));
        release(); await current.waitForLoadState('networkidle');
        check(back + ' Back ignores late completion and keeps latest applied photo', held.length > 0 && (await state()).shown.wall === applied.committed.wall && same(await wallpaperSaved(), applied));
      } finally { release(); await current.unroute(pattern); }
    }
  });
  await run('Wallpaper preview failure restores committed photo and retries preview only', async () => {
    await page(); await wallpaper(); const before = await wallpaperSaved();
    await nav('down'); await wallpaperSettled(walls[1].id);
    const target = walls[2].id, pattern = '**/wallpapers/' + target + '.jpg';
    current.__expectedFailures.push('/wallpapers/' + target + '.jpg');
    await current.route(pattern, route => route.abort('failed'));
    await nav('down'); await current.waitForFunction(() => ShoreQA.actions().includes('wallpaper.retry'));
    check('Failed browse restores the committed frame rather than another unsaved preview', (await state()).shown.wall === before.committed.wall && same(await wallpaperSaved(), before) && same(await wallpaperApplied(), ['wallpaper.choose.' + before.committed.wall]));
    check('Failed candidate remains identified for retry', (await state()).wallpaperPicker.candidate === target && /couldn.t|failed|try again/i.test(await current.locator('#appearance').innerText()));
    await current.unroute(pattern); await act('wallpaper.retry'); await wallpaperSettled(target);
    check('Retrying a failed browse does not authorise a save', same(await wallpaperSaved(), before) && !(await state()).wallpaperPicker.applyPending);
    check('Successful preview Retry returns focus to its candidate', (await state()).focusAction === 'wallpaper.choose.' + target);
    await nav('ok'); await ready();
    check('Explicit OK can apply the recovered preview', (await state()).committed.wall === target && (await state()).writes === before.writes + 1);
  });
  await run('Wallpaper explicit apply and storage failures preserve applied state', async () => {
    await page(); await wallpaper(); const before = await wallpaperSaved();
    const target = walls[2].id, pattern = '**/wallpapers/' + target + '.jpg';
    current.__expectedFailures.push('/wallpapers/' + target + '.jpg');
    await current.route(pattern, route => route.abort('failed'));
    await act('wallpaper.choose.' + target); await current.waitForFunction(() => ShoreQA.actions().includes('wallpaper.retry'));
    check('Failed explicit apply changes no committed photo, tick or storage', same(await wallpaperSaved(), before) && same(await wallpaperApplied(), ['wallpaper.choose.' + before.committed.wall]));
    await current.unroute(pattern); await act('wallpaper.retry'); await ready();
    check('Retry preserves explicit apply intent and stays in the picker', (await state()).committed.wall === target && (await state()).writes === before.writes + 1 && (await state()).view === 'wallpaper');
    const applied = await wallpaperSaved(), requests = [];
    current.on('request', request => { if (request.url().endsWith('/wallpapers/' + walls[3].id + '.jpg') || request.url().includes('/materials/' + walls[3].id + '-')) requests.push(request.url()); });
    await nav('down'); await wallpaperSettled(walls[3].id);
    const loadedRequests = requests.length;
    await current.evaluate(() => { __failWrites = true; }); await nav('ok');
    await current.waitForFunction(() => ShoreQA.actions().includes('wallpaper.retry'));
    const failed = await wallpaperSaved();
    check('Failed wallpaper save preserves applied photo, tick and backdrop', failed.stored === applied.stored && same(failed.committed, applied.committed) && same(failed.backdrop, applied.backdrop) && failed.writes === applied.writes && same(await wallpaperApplied(), ['wallpaper.choose.' + target]));
    check('Storage failure restores the committed frame and names the failed candidate', (await state()).shown.wall === target && Object.values(await wallpaperBundle()).every(src => src.includes('/' + target)) && (await state()).wallpaperPicker.candidate === walls[3].id && (await current.locator('#appearance').innerText()).includes(walls[3].name));
    await current.evaluate(() => { __failWrites = false; }); await act('wallpaper.retry'); await ready();
    check('Storage Retry applies the candidate exactly once', (await state()).committed.wall === walls[3].id && (await state()).writes === applied.writes + 1 && (await state()).view === 'wallpaper');
    check('Storage Retry reuses the already-loaded wallpaper bundle', loadedRequests > 0 && requests.length === loadedRequests, requests);
  });
  await run('Wallpaper thumbnails fail without breaking the list or full photo', async () => {
    await page(); const target = walls[5], pattern = '**/wallpapers/' + target.id + '-thumb.jpg';
    current.__expectedFailures.push('/wallpapers/' + target.id + '-thumb.jpg');
    await current.route(pattern, route => route.abort('failed'));
    await wallpaper();
    await current.waitForFunction(id => {
      const slot = document.querySelector('[data-action="wallpaper.choose.' + id + '"] .wallpaper-thumb');
      return slot && slot.classList.contains('is-missing');
    }, target.id);
    await nav(...Array(5).fill('down')); await wallpaperSettled(target.id);
    const fallback = await current.evaluate(id => {
      const row = document.querySelector('[data-action="wallpaper.choose.' + id + '"]'), slot = row.querySelector('.wallpaper-thumb'), img = slot.querySelector('img');
      const r = row.getBoundingClientRect(), b = slot.getBoundingClientRect();
      return { name: row.textContent, slotVisible: getComputedStyle(slot).display !== 'none' && b.width > 0 && b.height > 0,
        ratio: b.width / b.height, inside: b.left >= r.left && b.right <= r.right && b.top >= r.top && b.bottom <= r.bottom,
        imageHidden: !img || getComputedStyle(img).display === 'none' || getComputedStyle(img).visibility === 'hidden' };
    }, target.id);
    check('Broken thumbnail keeps its named 16:9 slot without a broken image glyph', fallback.name.includes(target.name) && fallback.slotVisible && fallback.inside && Math.abs(fallback.ratio - 16 / 9) < 0.05 && fallback.imageHidden, fallback);
    await nav('ok'); await ready();
    check('A missing thumbnail does not prevent applying its full photo', (await state()).committed.wall === target.id && Object.values(await wallpaperBundle()).every(src => src.includes('/' + target.id)));
  });
  await run('Physical-key repeats and Back hierarchy', async () => {
    await page(); await editor(); await remove('youtube');
    await current.keyboard.down('Enter'); await current.keyboard.down('Enter');
    check('Held OK restores once without removing again', (await state()).dock.includes('youtube') && (await state()).dock.length === 9);
    await current.keyboard.up('Enter');
    await current.keyboard.down('Escape'); await current.keyboard.down('Escape');
    check('Held Back closes one layer only', (await call('where')).view === 'settings' && (await state()).focusAction === 'settings.editor');
    await current.keyboard.up('Escape'); await current.keyboard.press('Escape');
    check('Released Back reaches Home', (await call('where')).view === 'home');
  });
  await run('Rotation pauses and warm return', async () => {
    await page({ minuteMs: 120 });
    await group('background'); await act('background.rotation'); await act('rotation.5'); await scene('home');
    const first = (await state()).wallpaper;
    await current.waitForFunction(id => ShoreQA.state().wallpaper !== id, first, { timeout: 4000 });
    check('Timed rotation advances on photo Home', (await state()).mode === '5');
    await scene('settings'); const paused = (await state()).wallpaper; await current.waitForTimeout(850);
    check('Rotation pauses in settings', (await state()).wallpaper === paused);
    await scene('home'); await current.evaluate(() => __setHidden(true)); const hidden = (await state()).wallpaper; await current.waitForTimeout(850);
    check('Rotation pauses when hidden', (await state()).wallpaper === hidden);
    await current.evaluate(() => __setHidden(false));
    await current.waitForFunction(id => ShoreQA.state().wallpaper !== id, hidden, { timeout: 4000 });
    await look({ bg: 'dark' }); const flat = (await state()).wallpaper; await current.waitForTimeout(850);
    check('Flat background retains photo without rotation', (await state()).wallpaper === flat);
    await look({ bg: 'photo' }); const photoAgain = (await state()).wallpaper;
    await current.waitForFunction(id => ShoreQA.state().wallpaper !== id, photoAgain, { timeout: 4000 });
    check('Photo background rotates again', (await state()).look.bg === 'photo');
    await current.evaluate(() => { __setHidden(true); document.getElementById('stage').blur(); __setHidden(false); window.dispatchEvent(new Event('focus')); });
    const focus = (await state()).focusAction; await current.keyboard.press('ArrowUp');
    check('Warm return restores remote focus', (await state()).focusAction !== focus && (await call('where')).focusCount === 1);
    const clock = await current.locator('#caption .clock').textContent();
    check('Live 12-hour clock has no AM/PM', /^\s*\d{1,2}:\d{2}\s*$/.test(clock), clock);
  });
  await run('Returning to the app always shows the Home screen', async () => {
    await page(); await group('layout');
    check('Settings are open before leaving', (await state()).view !== 'home');
    await current.evaluate(() => { __setHidden(true); __setHidden(false); });
    check('Coming back (Home button) shows Home with the apps focused', (await state()).view === 'home' && (await call('where')).zone === 'apps' && (await call('where')).focusCount === 1, await call('where'));
    await scene('apps');
    await current.evaluate(() => { __setHidden(true); __setHidden(false); });
    check('All apps is closed too', (await state()).view === 'home');
  });
  await run('Open rotation and browser fallback', async () => {
    await page({ seed: baseline({ mode: 'open' }) }); check('Open mode advances at cold start', (await state()).wallpaper === walls[1].id);
    const first = (await state()).wallpaper;
    await current.evaluate(() => { __setHidden(true); __setHidden(false); window.dispatchEvent(new Event('focus')); });
    check('Warm return does not repeat open rotation', (await state()).wallpaper === first);
    await current.reload(); await ready(); check('Next cold start advances again', (await state()).wallpaper === walls[2].id);
    await closePage();
    await page({ mock: false }); await act('home.app.youtube'); await current.waitForFunction(() => ShoreQA.where().view === 'message');
    check('Browser launch honestly requires TV', /TV/.test(await current.locator('#stage').innerText()));
    await nav('back'); await library();
    check('Browser All Apps has no installed fixtures', /TV/.test(await current.locator('#stage').innerText()) && !(await current.locator('[data-action^="apps.open."]').count()));
  });
  section = 'Run integrity';
  report.sourceAfter = hashes();
  check('No unexpected browser/resource failures', report.pageErrors.length === 0, report.pageErrors);
  check('Sources stayed stable during run', same(report.sourceBefore, report.sourceAfter));
} catch (error) { report.failures.push({ section, error: error.stack }); }
finally {
  await closePage();
  if (preview) await preview.close();
  report.finishedAt = new Date().toISOString();
  writeFileSync(out + 'checks.json', JSON.stringify(report, null, 2) + '\n');
}
console.log(report.checks.filter(c => c.passed).length + ' checks passed; ' + report.failures.length + ' failure(s). Report: .local/qa/checks.json');
if (report.failures.length) process.exitCode = 1;
