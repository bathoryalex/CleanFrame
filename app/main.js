/* CleanFrame Home. Static materials, local preferences and public Tizen app controls. */
(function () {
  'use strict';

  /* ---------- Bundled data ---------- */
  var ASSETS = 'assets/', ICONS = ASSETS + 'icons/', WP = ASSETS + 'wallpapers/';
  var APP_VERSION = '0.45.0';
  var CAP = 9, SCRIM_Y = 560, DOCK_BOTTOM = 1032; // the Dock sits 48 px above the bottom edge; names and actions go above it
  var DOCK_MODES = { both: { tw: 288, th: 200, pitch: 296 }, text: { tw: 288, th: 104, pitch: 296 }, icons: { tw: 200, th: 156, pitch: 206 } }; // icons-only tiles leave room under the icon for the focused app's name
  var GRID_ROW = 240, GRID_COL = 344, COLS = 5;
  var ED_ROW = 80, ED_SEP = 56, ED_VIEW = 752, STRIP_PITCH = 188;
  var WALL_VISIBLE = 6, WALL_ROW = 92, WALL_DELAY = 200;
  var KEYS = { 37: 'left', 38: 'up', 39: 'right', 40: 'down', 13: 'ok', 27: 'back', 8: 'back', 10009: 'back', 461: 'back', 403: 'red', 404: 'green', 405: 'yellow', 406: 'blue', 427: 'chup', 428: 'chdown', 458: 'guide',
    10252: 'playpause', 179: 'playpause', 415: 'play', 19: 'pause', 417: 'ffwd', 412: 'rew', 10233: 'tracknext', 176: 'tracknext', 10232: 'trackprev', 177: 'trackprev' };
  var FULL = 'Home holds nine apps. Remove one first.', LAST = 'Home needs one app';

  /* Default Home row: configured in fork.js. */
  var PRIMARY_APPS = ((window.FrameFork && window.FrameFork.apps) || []).map(function (a) {
    return { id: a.id, name: a.name, mark: true, brand: a.brand || a.id, appId: a.appId };
  });
  var MARK_BRANDS = ['hbomax', 'spotify', 'tubi', 'xbox', 'nintendoswitch', 'youtube', 'smartthings', 'browser', 'nuvio'];
  var PRIMARY = PRIMARY_APPS.map(function (a) { return a.id; }), APPS = PRIMARY_APPS.slice(), ALPHA = [];
  var WALLS = window.CleanFrameWallpapers || [{ id: 'misty', name: 'Misty coast', tone: 'light', ut: { tr: 'mist', br: 'mist' }, frostVeil: .20 }];
  var ADAPTIVE_INK = window.CleanFrameAdaptiveInk || {};
  /* Interface text: English keys, translated through assets/i18n.js. {0}, {1} … are arguments. */
  var I18N = window.CleanFrameI18n || {};
  function T(text) {
    var dict = S && S.c && I18N[S.c.lang], out = dict && dict.hasOwnProperty(text) ? dict[text] : text, args = arguments;
    return args.length > 1 ? out.replace(/\{(\d)\}/g, function (m, n) { return args[+n + 1]; }) : out;
  }
  window.FrameText = T;
  /* Saved preferences outside the appearance bundle: they apply at once and load nothing. */
  var PREF_VALUES = { lang: ['en', 'hu'], clock: ['24', '12'], date: ['off', 'on'], clockPos: ['corner', 'center', 'large'], weather: ['off', 'now', 'day'], spotifyShow: ['on', 'off'], keyHints: ['auto', 'pressed', 'always', 'off'], switchStyle: ['both', 'icons', 'text'], clockStyle: ['classic', 'thin', 'led', 'flip'], seconds: ['off', 'on'], layoutView: ['dock', 'tiles', 'modern'], holidays: ['off', 'on'], namedays: ['off', 'on'], calShow: ['on', 'off'], topStyle: ['cards', 'bar'], settingsLook: ['original', 'metro'] };
  var PREF_NAMES = { en: 'English', hu: 'Magyar', '24': '24-hour', '12': '12-hour', corner: 'Corner', center: 'Centre', large: 'Large', off: 'Off', on: 'On', now: 'Basic', day: 'Full', both: 'Both', icons: 'Icons', text: 'Text', classic: 'Classic', thin: 'Thin', led: 'LED', flip: 'Flip', list: 'List', dock: 'Dock', tiles: 'Tiles', modern: 'Modern dock', cards: 'Separate widgets', bar: 'Dock', original: 'Original', metro: 'Metro' };
  WALLS.forEach(function (w) { w.ut = w.ut || { tr: 'light', br: 'light' }; w.frostVeil = w.frostVeil || .12; });
  var MODES = [
    { id: 'fixed', name: 'Fixed', min: 0 }, { id: 'open', name: 'Each time Home opens', min: 0 },
    { id: '5', name: 'Every 5 minutes', min: 5 }, { id: '15', name: 'Every 15 minutes', min: 15 },
    { id: '60', name: 'Every hour', min: 60 }
  ];
  var KEY = 'cleanframe.home.v1', storageOk = true, catalog = { loading: false, loaded: false, error: null, request: 0, revision: 0 };
  /* Your picture: one wallpaper slot that a phone fills through an ntfy.sh topic (assets/custom-wallpaper.js). */
  var CUSTOM = 'custom', STILL_TAG = 'frame-home-still', PART_TAG = 'frame-home-part', SEND_PAGE = window.FrameFork && window.FrameFork.sendPage || '', FCW = window.FrameCustomWallpaper, RELAY = (window.FrameFork && window.FrameFork.relay) || 'https://ntfy.sh';
  var ALEXA_PAGE = window.FrameFork && window.FrameFork.alexaPage || '', FA = ALEXA_PAGE && window.FrameAlexa ? window.FrameAlexa : null;
  var CAL_PAGE = window.FrameFork && window.FrameFork.calendarPage || '';
  var BACKUP_PAGE = window.FrameFork && window.FrameFork.backupPage || '', FB = window.FrameBackup || null;
  var SPOTIFY_PAGE = window.FrameFork && window.FrameFork.spotify && window.FrameFork.spotify.page || '', FS = window.FrameSpotify && window.FrameSpotify.configured ? window.FrameSpotify : null;
  var custom = { urls: null, stamp: 0, phase: 'idle', name: '', busy: false, queued: null, seen: {}, sets: {}, lost: false, percent: 0, stillMsg: null, link: 'idle', detail: '', relay: null };
  function addCustomWall(tone) {
    var w = wall(CUSTOM);
    if (!w) { w = { id: CUSTOM, name: 'Your picture', ut: { tr: 'light', br: 'light' }, frostVeil: .2 }; WALLS.push(w); }
    w.tone = tone === 'light' ? 'light' : 'dark';
  }
  // The slot joins the gallery before preferences are read, so a saved choice of it survives.
  (function () { try { var saved = JSON.parse(localStorage.getItem(KEY) || 'null'); if (FCW && saved && saved.customAt) addCustomWall(saved.customTone); } catch (e) { /* none saved */ } }());
  var QA = window.ShoreQA = { minuteMs: window.ShoreQA && window.ShoreQA.minuteMs || 60000 };
  var FONTS = {
    manrope: { name: 'Manrope', family: 'Manrope', display: 600, ui: 500, clock: 500 },
    montreal: { name: 'Neue Montreal', family: 'Study Montreal', display: 300, ui: 400, clock: 300 },
    mori: { name: 'Mori', family: 'Study Mori', display: 200, ui: 400, clock: 200 },
    pangram: { name: 'Pangram Sans', family: 'Study Pangram', display: 300, ui: 400, clock: 300 },
    geist: { name: 'Geist', family: 'Study Geist', display: 300, ui: 400, clock: 300 },
    newsreader: { name: 'Newsreader', family: 'Study Newsreader', display: 400, ui: 400, clock: 400 }
  };
  var PRIVATE_FONTS = window.CleanFramePrivateFontIDs || [], fontMetrics = {}, unavailableFonts = {}, widthCache = {}, fontsReady = false;
  var LOOK_KEYS = ['bg', 'layout', 'apps', 'iconStyle', 'font', 'controls', 'focus', 'material'];
  var LOOK_VALUES = { bg: ['dark', 'photo'], layout: ['dock'], apps: ['icons', 'both', 'text'], iconStyle: ['color', 'minimal'], font: Object.keys(FONTS).filter(function (id) { return id === 'manrope' || PRIVATE_FONTS.indexOf(id) >= 0; }), controls: ['icons', 'both', 'text'], focus: ['type', 'glass'], material: ['soft', 'frost', 'tint'] };
  var LOOK_NAMES = { bg: 'Background', layout: 'Layout', apps: 'Apps', font: 'Font', controls: 'Home controls', focus: 'Focus', material: 'Material' };
  var VALUE_NAMES = { dark: 'Dark', photo: 'Photo', list: 'List', dock: 'Dock', type: 'Type', glass: 'Glass', soft: 'Soft', frost: 'Frost', tint: 'Clear tint', icons: 'Icons', both: 'Icons and text', text: 'Text', color: 'Color', minimal: 'Minimal' };
  var UTIL = { art: ['Art Mode', 'art'], wifi: ['Wi‑Fi QR', 'wifiqr'], apps: ['All apps', 'apps'], arrange: ['Arrange', 'arrange'], settings: ['Settings', 'settings'] };
  var KEYBOARD_COLS = 26; // the on-screen keyboard is a fixed grid, so Up and Down move by a row
  var WIFI_CHARS = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789-_. !@#$%&*+';
  var MSG = {
    leave: { title: 'Leave Home?', line: 'Open Samsung Home?', note: '', actions: [['stay', 'Stay'], ['samsung', 'Samsung Home']] },
    wifiSetup: { title: 'Wi‑Fi QR not set up', line: 'Add your network name in Settings → Wifi QR code settings.', note: '', actions: [['settings', 'Open Settings'], ['stay', 'Close']] },
    groupDelete: { title: 'Delete this group?', line: 'The lights stay in Alexa; only the group is removed.', note: '', actions: [['stay', 'Cancel'], ['groupdel', 'Delete']] },
    calendarOut: { title: 'Disconnect the calendar?', line: 'Frame Home forgets your calendar address.', note: 'To stop the address working anywhere, reset it in Google Calendar or Outlook.', actions: [['stay', 'Cancel'], ['calendarout', 'Disconnect']] },
    spotifyOut: { title: 'Sign out of Spotify?', line: 'Frame Home forgets your Spotify sign-in.', note: 'You can also remove its access in your Spotify account settings.', actions: [['stay', 'Cancel'], ['spotifyout', 'Sign out']] },
    alexaOut: { title: 'Sign out of Alexa?', line: 'Frame Home forgets your Alexa sign-in.', note: 'You can also remove “Frame Home” from the devices in your Amazon account.', actions: [['stay', 'Cancel'], ['alexaout', 'Sign out']] }
  };
  var SVG = {
    art: '<rect x="3.5" y="4.5" width="17" height="15" rx="2"/><circle cx="9" cy="9.8" r="1.5"/><path d="m4.5 17.5 4.5-4.5 3 3 2.5-2.5 5 5"/>',
    apps: '<rect x="4" y="4" width="6.5" height="6.5" rx="1.6"/><rect x="13.5" y="4" width="6.5" height="6.5" rx="1.6"/><rect x="4" y="13.5" width="6.5" height="6.5" rx="1.6"/><rect x="13.5" y="13.5" width="6.5" height="6.5" rx="1.6"/>',
    wifiqr: '<path d="M2.2 9.4a10.6 10.6 0 0 1 13.6 0"/><path d="M5 12.5a6.4 6.4 0 0 1 8 0"/><circle cx="9" cy="15.6" r="1" fill="currentColor" stroke="none"/><rect x="14.4" y="14.4" width="7.4" height="7.4" rx="1.5"/><path d="M17 17h.01M19.2 17h.01M17 19.2h.01M19.2 19.2h.01" stroke-width="1.9" stroke-linecap="round"/>',
    wifi: '<path d="M2.5 8.2a14 14 0 0 1 19 0"/><path d="M5.8 11.6a9.2 9.2 0 0 1 12.4 0"/><path d="M9.1 15a4.5 4.5 0 0 1 5.8 0"/><circle cx="12" cy="18.4" r="1.2"/>',
    arrange: '<path d="M4 8.5h14M15 5.5l3 3-3 3M20 15.5H6M9 12.5l-3 3 3 3"/>',
    settings: '<path d="m9 3-.6 2.4-2 1.2L4 6l-2 3.5L3.8 11v2L2 14.5 4 18l2.4-.6 2 1.2L9 21h6l.6-2.4 2-1.2 2.4.6 2-3.5-1.8-1.5v-2L22 9.5 20 6l-2.4.6-2-1.2L15 3Z"/><circle cx="12" cy="12" r="3.2"/>',
    home: '<path d="M4 11 12 4.5l8 6.5v8a1 1 0 0 1-1 1h-4.5v-6h-5v6H5a1 1 0 0 1-1-1Z"/>',
    fan: '<circle cx="12" cy="12" r="1.7"/><path d="M12 10.3c-.3-3.4.9-6.3 3.1-6.3 2.6 0 2.7 3.6-1.6 7"/><path d="M12 10.3c-.3-3.4.9-6.3 3.1-6.3 2.6 0 2.7 3.6-1.6 7" transform="rotate(120 12 12)"/><path d="M12 10.3c-.3-3.4.9-6.3 3.1-6.3 2.6 0 2.7 3.6-1.6 7" transform="rotate(240 12 12)"/>',
    snow: '<path d="M12 3v18M4.2 7.5l15.6 9M4.2 16.5l15.6-9"/><path d="M9.6 4.6 12 6.2l2.4-1.6M9.6 19.4 12 17.8l2.4 1.6M4.4 10.4l2.5-.3.9-2.4M19.6 13.6l-2.5.3-.9 2.4M4.4 13.6l2.5.3.9 2.4M19.6 10.4l-2.5-.3-.9-2.4"/>',
    flame: '<path d="M12 21c-3.5 0-6-2.4-6-5.7 0-3.5 2.6-5.2 3.4-8.6 2.2 1.3 3.3 3.2 3.3 5.1.9-.8 1.4-1.9 1.5-3.1 1.9 1.6 3.8 4.1 3.8 6.6 0 3.3-2.5 5.7-6 5.7z"/>',
    plug: '<path d="M9 3v5M15 3v5M6.5 8h11v3.6a5.5 5.5 0 0 1-11 0zM12 17.1V21"/>',
    power: '<path d="M12 3.2v8"/><path d="M7.2 6.5a7.2 7.2 0 1 0 9.6 0"/>',
    lamp: '<path d="M9 17.5h6M10 20.5h4"/><path d="M12 3.5a5.6 5.6 0 0 0-3.4 10.05c.6.46.9 1.1.9 1.85v.6h5v-.6c0-.75.3-1.39.9-1.85A5.6 5.6 0 0 0 12 3.5Z"/>',
    lampOn: '<path d="M9 17.5h6M10 20.5h4"/><path class="lamp-fill" d="M12 3.5a5.6 5.6 0 0 0-3.4 10.05c.6.46.9 1.1.9 1.85v.6h5v-.6c0-.75.3-1.39.9-1.85A5.6 5.6 0 0 0 12 3.5Z"/><path d="M12 .8v.9M3.6 4.3l.7.6M20.4 4.3l-.7.6M1.6 10h.9M21.5 10h.9"/>',
    alexa: '<path d="M3.5 11.2 12 4.5l8.5 6.7"/><path d="M5.8 9.6V19a1 1 0 0 0 1 1h10.4a1 1 0 0 0 1-1V9.6"/><path d="M9.4 14.6a3.7 3.7 0 0 1 5.2 0"/><path d="M7.6 12.6a6.2 6.2 0 0 1 8.8 0"/><circle cx="12" cy="16.9" r=".9"/>',
    calendar: '<rect x="3.5" y="5" width="17" height="15.5" rx="2.5"/><path d="M3.5 10h17M8 3v4M16 3v4"/>',
    note: '<path d="M9 17.5V6l10-2v11.5"/><circle cx="6.5" cy="17.5" r="2.5"/><circle cx="16.5" cy="15.5" r="2.5"/>',
    pause: '<path d="M8.5 5.5v13M15.5 5.5v13"/>',
    play: '<path d="M8 5.2v13.6L19 12Z"/>',
    prev: '<path d="M6.5 5.5v13"/><path d="M18 5.8 9 12l9 6.2Z"/>',
    next: '<path d="M17.5 5.5v13"/><path d="M6 5.8 15 12l-9 6.2Z"/>',
    lyrics: '<path d="M4.5 6.5h11M4.5 11h8M4.5 15.5h6"/><path d="M17 18.2V9.5l3.5-1"/><circle cx="15.2" cy="18.3" r="1.9"/>',
    drop: '<path d="M12 3.6c-3.2 4-5.6 7.3-5.6 10.1a5.6 5.6 0 0 0 11.2 0c0-2.8-2.4-6.1-5.6-10.1Z"/>',
    plus: '<path d="M12 5v14M5 12h14"/>',
    minus: '<path d="M5 12h14"/>',
    indoor: '<path d="M4 11 12 4.5l8 6.5v8a1 1 0 0 1-1 1H5a1 1 0 0 1-1-1Z"/><path d="M12 10.5v5.2"/><circle cx="12" cy="16.6" r="1.4"/>',
    undo: '<path d="M9 6 5 10l4 4"/><path d="M5 10h9.5a4.5 4.5 0 0 1 0 9H11"/>',
    check: '<path d="m5.5 12.5 4 4 9-9"/>',
    left: '<path d="m14.5 5-7 7 7 7"/>',
    right: '<path d="m9.5 5 7 7-7 7"/>',
    up: '<path d="m5 15.5 7-7 7 7"/>',
    down: '<path d="m5 8.5 7 7 7-7"/>',
    updown: '<path d="m7.5 9.5 4.5-4.5 4.5 4.5M7.5 14.5l4.5 4.5 4.5-4.5"/>',
    tv: '<rect x="3" y="4.5" width="18" height="12" rx="2"/><path d="M8.5 20h7"/>',
    speaker: '<rect x="6" y="2.8" width="12" height="18.4" rx="2.4"/><circle cx="12" cy="14.5" r="3.2"/><circle cx="12" cy="7.2" r="1"/>',
    volume: '<path d="M3.5 9.6h3.6L12 5.4v13.2l-4.9-4.2H3.5z"/><path d="M15.6 9.2a4 4 0 0 1 0 5.6"/><path d="M18.2 6.6a7.6 7.6 0 0 1 0 10.8"/>',
    mute: '<path d="M3.5 9.6h3.6L12 5.4v13.2l-4.9-4.2H3.5z"/><path d="M16 9.5l5 5M21 9.5l-5 5"/>',
    heart: '<path d="M12 20s-7.8-4.7-7.8-10.4A4.4 4.4 0 0 1 12 6.8a4.4 4.4 0 0 1 7.8 2.8C19.8 15.3 12 20 12 20z"/>',
    computer: '<rect x="4" y="5" width="16" height="10.5" rx="1.6"/><path d="M2.5 19h19"/>',
    warn: '<path d="M12 4 2.8 19.5h18.4Z"/><path d="M12 10v4.5M12 17.3v.1"/>',
    phone: '<rect x="7" y="2.8" width="10" height="18.4" rx="2.2"/><path d="M10.8 18h2.4"/>',
    layout: '<rect x="3" y="4" width="18" height="16" rx="2.5"/><rect x="6" y="13" width="3.4" height="3.6" rx=".9"/><rect x="10.3" y="13" width="3.4" height="3.6" rx=".9"/><rect x="14.6" y="13" width="3.4" height="3.6" rx=".9"/>',
    focus: '<path d="M4 9V6.5A2.5 2.5 0 0 1 6.5 4H9M15 4h2.5A2.5 2.5 0 0 1 20 6.5V9M20 15v2.5a2.5 2.5 0 0 1-2.5 2.5H15M9 20H6.5A2.5 2.5 0 0 1 4 17.5V15"/><rect x="8.5" y="8.5" width="7" height="7" rx="1.6"/>',
    clock: '<circle cx="12" cy="12" r="8.5"/><path d="M12 7.2V12l3.2 2"/>'
  };

  /* ---------- State ---------- */
  var REDUCED_MOTION = !!(window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches);
  var S = {
    c: null, stack: null,
    sel: null, selIdx: 0, lastUtil: 0, appsFocus: null, settingsFocus: 'background', appearanceFocus: 'bg', detailFocus: {},
    undo: [], removedAt: {}, note: null, err: null,
    writes: 0, failed: 0, log: [], logN: 0, lastLaunch: null, press: null,
    wallShown: null, wallPending: null, wallError: null,
    shown: null, pending: null, lookError: null, bundleKey: null, previewBundle: null, reflow: false, fontSwitch: false, hdmiInApp: false
  };
  var scroll = { first: 0 };
  function pick(v, list, fallback) {
    v = String(v || '').toLowerCase();
    for (var i = 0; i < list.length; i++) if (list[i].toLowerCase() === v) return list[i];
    return fallback;
  }
  function lookOf(c) { return { bg: c.bg, wall: c.wall, layout: c.layout, apps: c.apps, iconStyle: c.iconStyle, font: c.font, controls: c.controls, focus: c.focus, material: c.material }; }
  function materialApplies(c) { c = c || S.c; return c.bg === 'photo'; }
  function derivedTheme() { return 'shore'; }

  /* ---------- Helpers ---------- */
  function app(id) { for (var i = 0; i < APPS.length; i++) if (APPS[i].id === id) return APPS[i]; return null; }
  function wall(id) { for (var i = 0; i < WALLS.length; i++) if (WALLS[i].id === id) return WALLS[i]; return null; }
  function wallIndex(id) { for (var i = 0; i < WALLS.length; i++) if (WALLS[i].id === id) return i; return 0; }
  function frostClass(w) { var i = [.12, .20, .30, .36, .44].indexOf(w.frostVeil); return i > 0 ? ' fv-' + (i + 1) : ''; }
  function wallClasses(w) { return frostClass(w) + (w.dockQuiet ? ' db-quiet' : '') + (w.clockMist ? ' tl-mist' : ''); }
  function clamp(v, a, b) { return Math.max(a, Math.min(b, v)); }
  function without(list, id) { return list.filter(function (x) { return x !== id; }); }
  function same(a, b) { if (a.length !== b.length) return false; for (var i = 0; i < a.length; i++) if (a[i] !== b[i]) return false; return true; }
  function esc(s) { return String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;'); }
  function onHome(id) { return S.c.home.indexOf(id) >= 0; }
  function top() { return S.stack[S.stack.length - 1]; }
  function inStack(id) { for (var i = S.stack.length - 1; i >= 0; i--) if (S.stack[i].id === id) return S.stack[i]; return null; }
  function push(e) { S.stack.push(e); return e; }
  function pop() { if (S.stack.length > 1) S.stack.pop(); }
  function px(n) { return n.toFixed(2) + 'px'; }
  function icon(name, cls, underlay) {
    return '<svg class="ico' + (cls ? ' ' + cls : '') + '" viewBox="0 0 24 24" aria-hidden="true">'
      + (underlay ? '<g class="ut-underlay" transform="translate(0 .5)">' + SVG[name] + '</g><g class="ut-ink">' + SVG[name] + '</g>' : SVG[name]) + '</svg>';
  }
  function badge(on) {
    return on
      ? '<svg class="badge is-on" viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="12" r="10" fill="currentColor"/><path class="badge-tick" d="m7.6 12.4 3 3 5.8-6.2" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/></svg>'
      : '<svg class="badge is-off" viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="12" r="9" fill="none" stroke="currentColor" stroke-width="1.8"/></svg>';
  }
  function log(text) { S.log.unshift('#' + (++S.logN) + ' ' + text); if (S.log.length > 10) S.log.pop(); }

  var maskSupport = 'webkitMaskImage' in document.documentElement.style || 'maskImage' in document.documentElement.style, markProbes = {};
  function probeMark(id) {
    if (markProbes[id]) return;
    var im = new Image(); markProbes[id] = 'loading';
    im.onload = function () { markProbes[id] = 'ok'; };
    im.onerror = function () {
      markProbes[id] = 'bad';
      Array.prototype.forEach.call(document.querySelectorAll('[data-mark="' + id + '"]'), function (el) { el.className += ' is-bad'; });
    };
    im.src = ICONS + id + '.svg';
  }
  /* Optical placement is identical for the CSS mask and the image fallback. */
  function markHtml(id, w, h, size) {
    var m = window.FrameIconMetrics && window.FrameIconMetrics[id], st;
    if (m) {
      var weight = clamp(Math.pow(0.45 / m.fill, 0.3), 0.84, 1.25);
      var k = Math.min(w / m.w, h / m.h, size * weight / Math.sqrt(m.w * m.h)), s = m.n * k;
      st = 'width:' + px(s) + ';height:' + px(s) + ';left:' + px(w / 2 - (m.x + m.w / 2) * k) + ';top:' + px(h / 2 - (m.y + m.h / 2) * k);
    } else st = 'width:' + w + 'px;height:' + h + 'px;left:0;top:0;object-fit:contain';
    probeMark(id);
    return '<span class="mark' + (markProbes[id] === 'bad' ? ' is-bad' : '') + '" data-mark="' + id + '" style="width:' + w + 'px;height:' + h + 'px">'
      + (maskSupport ? '<span class="mk" style="' + st + ';-webkit-mask-image:url(' + ICONS + id + '.svg);mask-image:url(' + ICONS + id + '.svg)"></span>' : '<img alt="" src="' + ICONS + id + '.svg" style="' + st + '">') + '</span>';
  }
  function colorMarkImg(src, w, h) {
    return '<span class="mark mark-color" style="width:' + w + 'px;height:' + h + 'px"><img alt="" src="' + esc(src) + '" style="width:100%;height:100%;object-fit:contain"></span>';
  }
  /* Optical size match for the traced minimal marks beside the metric-placed white SVGs. */
  var DOCK_MINIMAL_BOOST = { nuvio: 1.14, smartthings: 1.32 };
  function colorInkSideCap(w, h) {
    var ref = window.FrameIconMetrics && window.FrameIconMetrics.nuvio, k;
    if (!ref) return 0;
    k = h / ref.h;
    if (ref.w * k > w) k = w / ref.w;
    return ref.n * k;
  }
  function markInkScale(id, slotW, inkH) {
    var m = window.FrameIconMetrics && window.FrameIconMetrics[id];
    if (!m) return 0;
    var k = inkH / m.h;
    if (m.w * k > slotW) k = slotW / m.w;
    return k;
  }
  function colorMarkSide(brand, w, h) {
    var cap = colorInkSideCap(w, h), k = markInkScale(brand, w, h), m, side;
    if (!k || !cap) return 0;
    m = window.FrameIconMetrics[brand];
    side = m.n * k;
    if (side > cap) side = cap;
    return side;
  }
  function colorMarkImgInk(brand, w, h) {
    var src = colorIconSrc(brand), side, ih;
    side = colorMarkSide(brand, w, h);
    if (!side) return colorMarkImg(src, w, h);
    if (brand === 'xbox' && src.indexOf('.png') >= 0) {
      side = colorMarkSide('spotify', w, h);
      if (!side) return colorMarkImg(src, w, h);
      side = Math.min(w, Math.round(side * 1.29));
      return '<span class="mark mark-color ink-fit" style="width:' + w + 'px;height:' + h + 'px">'
        + '<img alt="" src="' + esc(src) + '" style="width:' + px(side) + ';height:' + px(side) + ';object-fit:contain"></span>';
    }
    if (src.indexOf('.png') >= 0) {
      ih = Math.round(side);
      return '<span class="mark mark-color ink-fit" style="width:' + w + 'px;height:' + h + 'px">'
        + '<img alt="" src="' + esc(src) + '" style="height:' + px(ih) + ';width:auto;max-width:' + px(w) + ';object-fit:contain"></span>';
    }
    return '<span class="mark mark-color ink-fit" style="width:' + w + 'px;height:' + h + 'px">'
      + '<img alt="" src="' + esc(src) + '" style="width:' + px(side) + ';height:' + px(side) + ';object-fit:contain"></span>';
  }
  function dockMinimalMarkImg(src, w, h, brand) {
    var boost = DOCK_MINIMAL_BOOST[brand] || 1;
    if (boost === 1) return colorMarkImg(src, w, h);
    var ih = Math.round(h * boost);
    return '<span class="mark mark-color ink-fit" style="width:' + w + 'px;height:' + h + 'px">'
      + '<img alt="" src="' + esc(src) + '" style="height:' + px(ih) + ';width:auto;max-width:' + px(w) + ';object-fit:contain"></span>';
  }
  function markHtmlDock(id, w, h) {
    var m = window.FrameIconMetrics && window.FrameIconMetrics[id], k = markInkScale(id, w, h), st, s;
    if (!m || !k) return markHtml(id, w, h, h);
    s = m.n * k;
    st = 'width:' + px(s) + ';height:' + px(s) + ';left:' + px(w / 2 - (m.x + m.w / 2) * k) + ';top:' + px(h / 2 - (m.y + m.h / 2) * k);
    probeMark(id);
    return '<span class="mark' + (markProbes[id] === 'bad' ? ' is-bad' : '') + '" data-mark="' + id + '" style="width:' + w + 'px;height:' + h + 'px">'
      + (maskSupport ? '<span class="mk" style="' + st + ';-webkit-mask-image:url(' + ICONS + id + '.svg);mask-image:url(' + ICONS + id + '.svg)"></span>' : '<img alt="" src="' + ICONS + id + '.svg" style="' + st + '">') + '</span>';
  }
  /* Bundled full-colour logos in assets/icons/color/. Other apps use their native icon, white mark or monogram. */
  var COLOR_BRANDS = ['xbox', 'nintendoswitch', 'nuvio', 'youtube', 'spotify', 'hbomax', 'smartthings', 'browser'];
  function colorIconSrc(brand) {
    if (brand === 'xbox' || brand === 'nuvio') return ICONS + 'color/' + brand + '.png';
    return ICONS + 'color/' + brand + '.svg';
  }
  var DOCK_MARK_H = 72;
  function minimalIconSrc(brand) {
    if (brand === 'nuvio' || brand === 'hbomax' || brand === 'browser' || brand === 'smartthings') return ICONS + 'minimal/' + brand + '.svg';
    return '';
  }
  function withDockMark(html) {
    return html.indexOf('class="mark') >= 0 ? html.replace('class="mark', 'class="mark is-dock-mark') : html;
  }
  function dockAppMark(a) {
    var w = S.c.apps === 'icons' ? 128 : 112, h = DOCK_MARK_H;
    /* Modern dock, Both: a small mark beside the name. */
    if (S.c.dockStyle === 'modern' && S.c.apps === 'both') { w = 56; h = 44; }
    return withDockMark(appMark(a, w, h, h, true));
  }
  function prefersBundledColor(a) {
    var brand = a.brand || a.id;
    return S.c.iconStyle !== 'minimal' && !!a.mark && COLOR_BRANDS.indexOf(brand) >= 0;
  }
  function appMark(a, w, h, size, dock) {
    var brand = a.brand || a.id, minimal = S.c.iconStyle === 'minimal';
    if (!minimal) {
      if (prefersBundledColor(a)) return colorMarkImgInk(brand, w, h);
      if (a.nativeIcon || a.icon) return '<span class="mark mark-color native-icon" style="width:' + w + 'px;height:' + h + 'px"><img alt="" data-native-icon="true" src="' + esc(a.nativeIcon || a.icon) + '" style="width:100%;height:100%;object-fit:contain"></span>';
      if (COLOR_BRANDS.indexOf(brand) >= 0) return colorMarkImgInk(brand, w, h);
    }
    if (minimalIconSrc(brand)) return dock ? dockMinimalMarkImg(minimalIconSrc(brand), w, h, brand) : colorMarkImg(minimalIconSrc(brand), w, h);
    if (a.mark) return dock ? markHtmlDock(brand, w, h) : markHtml(brand, w, h, size);
    var words = a.name.split(/\s+/), letters = words[0].charAt(0) + (words.length > 1 ? words[1].charAt(0) : '');
    return '<span class="mark monogram' + (a.icon ? ' native-icon' : '') + '" style="width:' + w + 'px;height:' + h + 'px;font-size:' + Math.round(size * .65) + 'px"><span>' + esc(letters.toUpperCase()) + '</span>'
      + (a.icon ? '<img alt="" data-native-icon="true" src="' + esc(a.icon) + '">' : '') + '</span>';
  }
  function smallMark(a) { return appMark(a, 56, 44, 36); }
  var measureCanvas = document.createElement('canvas'), measureContext = measureCanvas.getContext('2d'), measureSpan = document.createElement('span');
  measureSpan.setAttribute('aria-hidden', 'true');
  measureSpan.style.cssText = 'position:absolute;left:-10000px;top:0;visibility:hidden;white-space:pre;font-synthesis:none;';
  document.body.appendChild(measureSpan);
  function homeFont() { return S.shown && S.shown.font || 'manrope'; }
  function fontRole(id, role, size) {
    var f = FONTS[id], serif = id === 'newsreader';
    return { family: f.family,
      weight: role === 'display' ? f.display : role === 'clock' ? f.clock : serif ? 400 : f.ui,
      opsz: serif ? role === 'display' ? 72 : role === 'clock' ? 48 : role === 'ui' && (!size || size === 28) ? 28 : 36 : 0 };
  }
  function measureFace(id, faces) {
    var result = { roles: {}, digits: [], digitCell: 0 }, roles = { display: [88, 76, 56], clock: [48], primary: [30, 32, 34, 36, 40], ui: [28, 30, 48] };
    var face = id === 'newsreader' ? faces[0][0] : null, original = face ? face.variationSettings : '', r, widths, min, max;
    Object.keys(roles).forEach(function (role) {
      result.roles[role] = {};
      // Canvas has no optical-size property. Set this face's default only while measuring;
      // CSS specifies each rendered role explicitly, and the descriptor is restored below.
      roles[role].forEach(function (size) {
        r = fontRole(id, role, size);
        if (face) face.variationSettings = r.opsz ? '"opsz" ' + r.opsz : original;
        measureContext.font = r.weight + ' ' + size + 'px "' + r.family + '"';
        var m = measureContext.measureText('H'), d = measureContext.measureText('gjpqy');
        result.roles[role][size] = { cap: m.actualBoundingBoxAscent || size * .72, ascent: m.fontBoundingBoxAscent || size * 1.066, descent: m.fontBoundingBoxDescent || size * .3, lower: d.actualBoundingBoxDescent || size * .255 };
      });
    });
    if (face) face.variationSettings = original;
    r = fontRole(id, 'clock');
    measureSpan.style.font = r.weight + ' 48px/64px "' + r.family + '"';
    measureSpan.style.letterSpacing = '0'; measureSpan.style.fontVariantNumeric = 'tabular-nums';
    measureSpan.style.fontVariationSettings = r.opsz ? '"opsz" ' + r.opsz : 'normal';
    widths = '0123456789'.split('').map(function (n) { measureSpan.textContent = n; return measureSpan.getBoundingClientRect().width; });
    min = Math.min.apply(Math, widths); max = Math.max.apply(Math, widths);
    result.digits = widths; result.digitCell = max - min > .02 ? max : 0;
    return result;
  }
  function fontChoices() {
    LOOK_VALUES.font = Object.keys(FONTS).filter(function (id) { return id === 'manrope' || PRIVATE_FONTS.indexOf(id) >= 0 && !unavailableFonts[id]; });
  }
  function retryFontFaces(id) {
    // A rejected CSS FontFace cannot load again. Recreate only that failed family's
    // rules; the displayed family's faces and the rest of the stylesheet stay intact.
    Array.prototype.forEach.call(document.styleSheets, function (sheet) {
      var rules, i, rule, family, css;
      try { rules = sheet.cssRules; } catch (e) { return; }
      if (!rules) return;
      for (i = 0; i < rules.length; i++) {
        rule = rules[i];
        if (rule.type !== 5) continue;
        family = rule.style.getPropertyValue('font-family').replace(/["']/g, '').trim();
        if (family !== FONTS[id].family) continue;
        css = rule.cssText; sheet.deleteRule(i); sheet.insertRule(css, i);
      }
    });
  }
  function loadFont(id, done) {
    var f = FONTS[id], weights = [f.display], timer, ended = false;
    if (fontMetrics[id]) { done(true); return; }
    if (!document.fonts || !document.fonts.load) { if (id === 'manrope') { fontMetrics.manrope = measureFace('manrope', []); fontsReady = true; done(true); } else done(false, 'unsupported'); return; }
    if (unavailableFonts[id]) retryFontFaces(id);
    if (id !== 'newsreader' && weights.indexOf(f.ui) < 0) weights.push(f.ui);
    function finish(ok, reason, faces) {
      if (ended) return;
      ended = true; clearTimeout(timer);
      if (ok) {
        fontMetrics[id] = measureFace(id, faces); delete unavailableFonts[id];
        if (id === 'manrope') fontsReady = true;
      } else if (reason !== 'timeout') unavailableFonts[id] = true;
      fontChoices(); done(ok, reason);
    }
    timer = setTimeout(function () { finish(false, 'timeout'); }, 3000);
    Promise.all(weights.map(function (weight) { return document.fonts.load(weight + ' 88px "' + f.family + '"'); })).then(function (faces) {
      finish(faces.every(function (list) { return list.length > 0 && list.every(function (face) { return face.status === 'loaded'; }); }), 'load', faces);
    }, function () { finish(false, 'load'); });
  }
  var baselineRecovery = false;
  function ensureFont(id, done) {
    loadFont('manrope', function (ok, reason) {
      if (!ok && id === 'manrope') {
        // The local fallback keeps Home usable if the baseline face is slow or missing.
        fontMetrics.manrope = measureFace('manrope', []); fontMetrics.manrope.fallback = true; fontsReady = true;
        done(true, reason);
        if (!baselineRecovery && document.fonts && document.fonts.ready) {
          baselineRecovery = true;
          document.fonts.ready.then(function () {
            delete fontMetrics.manrope; delete unavailableFonts.manrope;
            loadFont('manrope', function (loaded) {
              if (!loaded) { fontMetrics.manrope = measureFace('manrope', []); fontMetrics.manrope.fallback = true; fontsReady = true; }
              render();
            });
          });
        }
        return;
      }
      if (!ok || id === 'manrope') done(ok, reason); else loadFont(id, done);
    });
  }
  function fontShift(role, size) {
    var id = homeFont(), base = fontMetrics.manrope, metrics = fontMetrics[id], a, b;
    if (id === 'manrope' || !base || !metrics) return 0;
    a = base.roles[role][size]; b = metrics.roles[role][size];
    return (a.ascent - a.descent - a.cap - b.ascent + b.descent + b.cap) / 2;
  }
  function textWidth(text, size, weight, spacing, role) {
    var id = homeFont(), r = fontRole(id, role || 'ui', size), key, width;
    if (id !== 'manrope') { weight = r.weight; spacing = role === 'display' ? -size * .01 : 0; }
    key = [id, role || 'ui', text, size, weight, spacing].join('|');
    if (widthCache.hasOwnProperty(key)) return widthCache[key];
    if (r.opsz) {
      measureSpan.style.font = weight + ' ' + size + 'px "' + r.family + '"';
      measureSpan.style.fontVariationSettings = '"opsz" ' + r.opsz;
      measureSpan.style.fontVariantNumeric = 'normal'; measureSpan.style.letterSpacing = '0'; measureSpan.textContent = text;
      width = measureSpan.getBoundingClientRect().width;
    } else {
      measureContext.font = (weight || 500) + ' ' + size + 'px "' + r.family + '", Arial, sans-serif';
      width = measureContext.measureText(text).width;
    }
    width += Math.max(0, text.length - 1) * (spacing || 0);
    // Do not retain fallback measurements made before the baseline font is ready.
    if (fontMetrics[id]) widthCache[key] = width;
    return width;
  }
  function dockLabelSize(id) { return S.c.apps === 'text' ? (textWidth(app(id).name, 40, 600, -.8, 'primary') > 264 ? 34 : 40) : textWidth(app(id).name, 36, 500, -.8, 'primary') > 280 ? 32 : 36; }
  function reducedDockLabel(id) { return S.c.apps !== 'icons' && dockLabelSize(id) === (S.c.apps === 'text' ? 34 : 32); }
  function actionWidth(text) { return clamp(Math.ceil(textWidth(text, 30, 500, -.3) + 40), 288, 400); }

  /* Keyed children: elements persist by key so transforms animate instead of re-creating.
     Children are absolutely positioned, so DOM order never needs to change. */
  function keyed(parent, items, update) {
    var map = parent._k || (parent._k = {}), seen = {}, i, it, el, isNew, k;
    for (i = 0; i < items.length; i++) {
      it = items[i]; el = map[it.key]; isNew = !el;
      if (isNew) { el = document.createElement('div'); map[it.key] = el; }
      update(el, it, i);
      if (isNew) parent.appendChild(el);
      seen[it.key] = 1;
    }
    for (k in map) if (map.hasOwnProperty(k) && !seen[k]) { if (map[k].parentNode === parent) parent.removeChild(map[k]); delete map[k]; }
  }
  function setContent(el, sig, html) {
    sig += '|' + catalog.revision + '|' + S.c.lang;
    if (el._sig === sig) return;
    el._sig = sig; el.innerHTML = html;
    Array.prototype.forEach.call(el.querySelectorAll('[data-native-icon]'), function (img) {
      function ready() { img.parentNode.classList.add('has-native-icon'); }
      function failed() { img.style.display = 'none'; img.parentNode.classList.remove('has-native-icon'); }
      img.onload = ready; img.onerror = failed;
      if (img.complete) { if (img.naturalWidth) ready(); else failed(); }
    });
  }
  function setHTML(el, html) { if (el._html !== html) { el._html = html; el.innerHTML = html; } }
  function attrs(el, z, i, action) { el.setAttribute('data-z', z); el.setAttribute('data-i', String(i)); el.setAttribute('data-action', action); }

  /* ---------- Saved preferences ---------- */
  function safeId(id) { return typeof id === 'string' && /^[A-Za-z0-9][A-Za-z0-9._-]{0,160}$/.test(id) && ['constructor', 'prototype', '__proto__'].indexOf(id) < 0; }
  function endpointId(id) { return typeof id === 'string' && /^[A-Za-z0-9][A-Za-z0-9._:#@-]{0,200}$/.test(id); }
  function prefText(v, n) { return typeof v === 'string' ? v.slice(0, n) : ''; }
  function prefTarget(t) { return t && typeof t === 'object' && (endpointId(t.id) || /^group:g[a-z0-9]{1,16}$/.test(t.id) || /^spotify:(toggle|next|prev)$/.test(t.id) || t.id === 'frame:home' || /^app:[A-Za-z0-9][A-Za-z0-9._-]{0,160}$/.test(t.id)) ? { id: t.id, name: prefText(t.name, 80) } : null; }
  /* 0.13 kept one sensor and one light; they become the first reading and switch. */
  function cleanReadings(s) {
    var list = Array.isArray(s.alexaReadings) ? s.alexaReadings : endpointId(s.alexaTemp) ? [{ id: s.alexaTemp, key: 'temp', name: s.alexaTempName, label: 'Temperature' }] : [];
    return list.filter(function (r) { return r && endpointId(r.id) && typeof r.key === 'string' && r.key.length < 120; }).slice(0, 3)
      .map(function (r) { return { id: r.id, key: r.key, name: prefText(r.name, 80), label: prefText(r.label, 40) || 'Value' }; });
  }
  function cleanSwitches(s) {
    var list = Array.isArray(s.alexaSwitches) ? s.alexaSwitches : endpointId(s.alexaLamp) ? [{ id: s.alexaLamp, name: s.alexaLampName }] : [];
    return list.map(prefTarget).filter(function (t) { return t && !/^(spotify|app):/.test(t.id); }).slice(0, 6);
  }
  /* A switch's icon, per light or group id; the bulb unless chosen. */
  var SWITCH_ICONS = ['light', 'fan', 'snow', 'flame', 'plug', 'tv', 'speaker', 'power'];
  var SWITCH_ICON_NAMES = { light: 'Light bulb', fan: 'Fan', snow: 'Air conditioning', flame: 'Heating', plug: 'Plug', tv: 'TV', speaker: 'Speaker', power: 'Switch' };
  function cleanIcons(o) {
    var out = {}, n = 0;
    if (o && typeof o === 'object') Object.keys(o).forEach(function (id) { if (n < 64 && typeof id === 'string' && id.length <= 200 && SWITCH_ICONS.indexOf(o[id]) > 0) { out[id] = o[id]; n++; } });
    return out;
  }
  /* Names chosen for Home switches, per light or group id (short, so they fit a tile). */
  function cleanNames(o) {
    var out = {}, n = 0;
    if (o && typeof o === 'object') Object.keys(o).forEach(function (id) { var v = typeof o[id] === 'string' ? o[id].replace(/\s+/g, ' ').trim().slice(0, GROUP_NAME_MAX) : ''; if (n < 64 && id.length <= 200 && v) { out[id] = v; n++; } });
    return out;
  }
  function switchIcon(id) { return S.c.alexaIcons && S.c.alexaIcons[id] || 'light'; }
  function cleanGroups(list) {
    return (Array.isArray(list) ? list : []).filter(function (g) { return g && /^g[a-z0-9]{1,16}$/.test(g.id) && typeof g.name === 'string' && g.name.trim(); }).slice(0, 12)
      .map(function (g) { return { id: g.id, name: g.name.slice(0, 24), members: (Array.isArray(g.members) ? g.members : []).map(prefTarget).filter(function (m) { return m && endpointId(m.id); }).slice(0, 20) }; });
  }
  function cleanKeys(k) { var out = {}; ['red', 'green', 'yellow', 'blue', 'chup', 'chdown', 'guide'].forEach(function (c) { out[c] = k && typeof k === 'object' ? prefTarget(k[c]) : null; }); return out; }
  function safeIcon(path) { return typeof path === 'string' && path.length < 2048 && /^(?:\/[^\/]|file:\/\/\/|wgt-package:\/\/\/)/.test(path) ? path : ''; }
  function load() {
    var keys = [KEY, 'cleanframe.shore.v1'], raw, saved, i;
    for (i = 0; i < keys.length; i++) {
      try {
        raw = localStorage.getItem(keys[i]);
        if (!raw) continue;
        saved = JSON.parse(raw);
        if (saved && typeof saved === 'object' && !Array.isArray(saved)) return saved;
      } catch (e) { storageOk = false; }
    }
    return null;
  }
  function clean(saved) {
    var s = saved && typeof saved === 'object' ? saved : {}, modern = s.look && typeof s.look === 'object' ? s.look : s;
    var h = [], recent = [], records = Array.isArray(s.appRecords) ? s.appRecords : [];
    records.slice(0, 256).forEach(function (a) {
      if (!a || !safeId(a.id) || !safeId(a.appId) || typeof a.name !== 'string' || !a.name.trim() || app(a.id)) return;
      APPS.push({ id: a.id, appId: a.appId, name: a.name.slice(0, 160), brand: MARK_BRANDS.indexOf(a.brand) >= 0 ? a.brand : '', mark: MARK_BRANDS.indexOf(a.brand) >= 0, icon: safeIcon(a.icon) });
    });
    (Array.isArray(s.home) ? s.home : Array.isArray(s.dock) ? s.dock : []).forEach(function (id) {
      if (!safeId(id) || h.indexOf(id) >= 0 || h.length >= CAP) return;
      if (!app(id) && id.indexOf('.') > 0) APPS.push({ id: id, appId: id, name: id.split('.').pop(), mark: false });
      if (app(id)) h.push(id);
    });
    if (!h.length) h = PRIMARY.slice();
    (Array.isArray(s.recent) ? s.recent : []).forEach(function (id) { if (safeId(id) && app(id) && h.indexOf(id) < 0 && recent.indexOf(id) < 0 && recent.length < 5) recent.push(id); });
    return {
      bg: pick(modern.bg, LOOK_VALUES.bg, 'photo'), layout: 'dock',
      apps: pick(modern.apps, LOOK_VALUES.apps, 'both'), iconStyle: pick(modern.iconStyle, LOOK_VALUES.iconStyle, 'color'), controls: pick(modern.controls, LOOK_VALUES.controls, 'both'),
      focus: pick(modern.focus, LOOK_VALUES.focus, 'glass'), material: pick(modern.material, LOOK_VALUES.material, 'soft'),
      font: pick(modern.font, LOOK_VALUES.font, 'manrope'), wall: wall(modern.wall || s.wallpaper) ? modern.wall || s.wallpaper : WALLS[0].id,
      home: h, recent: recent, lastApp: h.indexOf(s.lastApp) >= 0 ? s.lastApp : h[0],
      mode: pick(s.mode, MODES.map(function (m) { return m.id; }), 'fixed'),
      wifiSsid: typeof s.wifiSsid === 'string' ? s.wifiSsid.slice(0, 32) : '',
      wifiPass: typeof s.wifiPass === 'string' ? s.wifiPass.slice(0, 63) : '',
      wifiSec: s.wifiSec === 'nopass' ? 'nopass' : 'WPA',
      lang: pick(s.lang, PREF_VALUES.lang, 'en'), clock: pick(s.clock, PREF_VALUES.clock, '24'), clockPos: pick(s.clockPos, PREF_VALUES.clockPos, 'corner'), date: pick(s.date, PREF_VALUES.date, 'off'), weather: pick(s.weather, PREF_VALUES.weather, 'day'),
      customAt: typeof s.customAt === 'number' && wall(CUSTOM) ? s.customAt : 0, customTone: s.customTone === 'light' ? 'light' : 'dark',
      relayTopic: safeId(s.relayTopic) ? s.relayTopic : '', relayAt: typeof s.relayAt === 'number' ? s.relayAt : 0, relaySince: safeId(s.relaySince) ? s.relaySince : '',
      alexaReadings: cleanReadings(s), alexaSwitches: cleanSwitches(s), alexaGroups: cleanGroups(s.alexaGroups), alexaKeys: cleanKeys(s.alexaKeys), alexaIcons: cleanIcons(s.alexaIcons), alexaNames: cleanNames(s.alexaNames),
      spotifyShow: pick(s.spotifyShow, PREF_VALUES.spotifyShow, 'on'), keyHints: pick(s.keyHints === 'on' || s.keyHints === 'top' ? 'auto' : s.keyHints, PREF_VALUES.keyHints, 'auto'), switchStyle: pick(s.switchStyle, PREF_VALUES.switchStyle, 'both'),
      clockStyle: pick(s.clockStyle, PREF_VALUES.clockStyle, 'classic'), seconds: pick(s.seconds, PREF_VALUES.seconds, 'off'), dockStyle: s.dockStyle === 'tiles' || s.dockStyle === 'modern' ? s.dockStyle : 'shelf',
      holidays: pick(s.holidays, PREF_VALUES.holidays, 'off'), namedays: pick(s.namedays, PREF_VALUES.namedays, 'off'), calShow: pick(s.calShow, PREF_VALUES.calShow, 'on'), topStyle: pick(s.topStyle, PREF_VALUES.topStyle, 'cards'), settingsLook: pick(s.settingsLook, PREF_VALUES.settingsLook, 'original')
    };
  }
  function serialise(c) {
    var out = {}, id;
    Object.keys(c).forEach(function (key) { out[key] = c[key]; });
    out.version = 2; out.look = lookOf(c); out.dock = c.home.slice(); out.wallpaper = c.wall;
    out.theme = 'shore';
    out.appRecords = [];
    c.home.concat(c.recent).forEach(function (key) {
      var a = app(key);
      if (a && PRIMARY.indexOf(key) < 0 && !out.appRecords.some(function (r) { return r.id === key; })) out.appRecords.push({ id: a.id, appId: a.appId, name: a.name, brand: a.brand || '', icon: a.icon || '' });
    });
    return out;
  }
  function initialise() {
    var saved = load(), initial; S.c = clean(saved); initial = next(S.c.home.slice(), S.c.recent.slice());
    S.stack = [{ id: 'home', f: { zone: 'apps', u: 0 } }];
    S.sel = S.c.lastApp; S.selIdx = S.c.home.indexOf(S.sel);
    if (saved && initial.mode === 'open') initial.wall = WALLS[(wallIndex(initial.wall) + 1) % WALLS.length].id;
    // Keep the old schema keys alongside the builder values for in-place updates.
    try { localStorage.setItem(KEY, JSON.stringify(serialise(initial))); S.c = initial; storageOk = true; } catch (e) { storageOk = false; }
    registerTvKeys(); syncSlotKeys();
    loadWeatherCache();
  }
  function registerTvKeys() {
    if (!window.tizen || !tizen.tvinputdevice) return;
    try {
      if (tizen.tvinputdevice.registerKeyBatch) tizen.tvinputdevice.registerKeyBatch(['Back', 'XF86Back']);
      else { tizen.tvinputdevice.registerKey('Back'); tizen.tvinputdevice.registerKey('XF86Back'); }
    } catch (e) { /* optional on preview */ }
    /* Colour buttons switch Alexa lights; registered one by one so a missing key cannot block the rest. */
    if (FS) ['MediaPlayPause', 'MediaPlay', 'MediaPause', 'MediaFastForward', 'MediaRewind', 'MediaTrackNext', 'MediaTrackPrevious'].forEach(function (name) { try { tizen.tvinputdevice.registerKey(name); } catch (e) { /* not on this remote */ } });
    if (FA || FS) ['ColorF0Red', 'ColorF1Green', 'ColorF2Yellow', 'ColorF3Blue'].forEach(function (name) { try { tizen.tvinputdevice.registerKey(name); } catch (e) { /* not on this remote */ } });
  }
  function clearSession() { S.undo = []; S.removedAt = {}; S.note = null; S.err = null; }
  function begin() { S.note = null; }
  function next(home, recent) {
    var c = lookOf(S.c);
    c.home = home; c.recent = recent; c.lastApp = S.c.lastApp; c.mode = S.c.mode;
    c.wifiSsid = S.c.wifiSsid; c.wifiPass = S.c.wifiPass; c.wifiSec = S.c.wifiSec;
    c.lang = S.c.lang; c.clock = S.c.clock; c.clockPos = S.c.clockPos; c.date = S.c.date; c.weather = S.c.weather;
    c.customAt = S.c.customAt; c.customTone = S.c.customTone; c.relayTopic = S.c.relayTopic; c.relayAt = S.c.relayAt; c.relaySince = S.c.relaySince;
    c.alexaReadings = S.c.alexaReadings; c.alexaSwitches = S.c.alexaSwitches; c.alexaGroups = S.c.alexaGroups; c.alexaKeys = S.c.alexaKeys; c.alexaIcons = S.c.alexaIcons; c.alexaNames = S.c.alexaNames; c.spotifyShow = S.c.spotifyShow; c.keyHints = S.c.keyHints; c.switchStyle = S.c.switchStyle; c.clockStyle = S.c.clockStyle; c.seconds = S.c.seconds; c.dockStyle = S.c.dockStyle; c.holidays = S.c.holidays; c.namedays = S.c.namedays; c.calShow = S.c.calShow; c.topStyle = S.c.topStyle; c.settingsLook = S.c.settingsLook;
    return c;
  }
  function snap() { return { home: S.c.home.slice(), recent: S.c.recent.slice() }; }
  function pushRecent(list, id) { return [id].concat(without(list, id)).slice(0, 5); }
  function write(c, label) {
    try { localStorage.setItem(KEY, JSON.stringify(serialise(c))); }
    catch (e) { storageOk = false; S.failed++; S.err = label; log('Not saved: ' + label); return false; }
    if (c.wall !== S.c.wall || c.mode !== S.c.mode) resetRotation();
    storageOk = true; S.c = c; S.writes++; S.err = null; log('Saved: ' + label);
    return true;
  }
  function statusHtml(def) {
    if (S.err) return '<span class="warn error-chip">' + esc(T('Couldn’t save. Nothing changed.')) + '</span>';
    return esc(T(S.note || def));
  }

  function ensureSel() {
    var h = S.c.home, i;
    if (!h.length) { S.sel = null; return -1; }
    i = h.indexOf(S.sel);
    if (i < 0) { i = clamp(S.selIdx, 0, h.length - 1); S.sel = h[i]; }
    S.selIdx = i;
    return i;
  }
  function setSel(id) { S.sel = id; S.selIdx = S.c.home.indexOf(id); }

  /* Membership and order operations shared by B and C. A works on slots (below). */
  function homeRemove(id) {
    var a = app(id), i = S.c.home.indexOf(id), before = snap(), h;
    if (i < 0) return false;
    if (S.c.home.length <= 1) { S.note = LAST; return false; }
    h = S.c.home.slice(); h.splice(i, 1);
    if (!write(next(h, pushRecent(S.c.recent, id)), 'Remove ' + a.name + ' from Home')) return false;
    S.removedAt[id] = i;
    S.undo.push({ label: 'Remove ' + a.name, text: T('Remove {0}', a.name), snap: before });
    return true;
  }
  function homeAdd(id) {
    var a = app(id), before = snap(), h = S.c.home.slice(), at;
    if (h.length >= CAP) { S.note = FULL; return false; }
    at = S.removedAt.hasOwnProperty(id) ? Math.min(S.removedAt[id], h.length) : h.length;
    h.splice(at, 0, id);
    if (!write(next(h, without(S.c.recent, id)), 'Add ' + a.name + ' to Home')) return false;
    S.undo.push({ label: 'Add ' + a.name, text: T('Add {0}', a.name), snap: before });
    return true;
  }
  function homeMove(order, id, before) {
    var a = app(id);
    if (!write(next(order, S.c.recent.slice()), 'Move ' + a.name)) return false;
    S.undo.push({ label: 'Move ' + a.name, text: T('Move {0}', a.name), snap: before });
    return true;
  }
  function undoLast(arr) {
    var u = S.undo[S.undo.length - 1];
    if (!u) { S.note = 'Nothing to undo'; return false; }
    if (!write(next(u.snap.home.slice(), u.snap.recent.slice()), 'Undo ' + u.label)) return false;
    S.undo.pop();
    S.note = T('Undone: {0}.', u.text);
    return true;
  }
  function undoCaption() {
    var u = S.undo[S.undo.length - 1];
    if (!u) return T('Nothing to undo');
    return T('Undo {0}', S.c.lang === 'en' ? u.text.charAt(0).toLowerCase() + u.text.slice(1) : u.text);
  }
  function editStatus(hint, move) {
    if (S.err) return statusHtml('');
    if (S.note === FULL || S.note === LAST) return '<span class="warn">' + esc(T(S.note)) + '</span>';
    if (hint === FULL || hint === LAST) return '<span class="warn">' + esc(T(hint)) + '</span>';
    return esc(move || hint || T(S.note || ''));
  }

  var busy = false, busyTimer = 0;
  function release() { busy = false; clearTimeout(busyTimer); S.press = null; }
  function message(title, line, note) {
    push({ id: 'message', msg: 'error', content: { title: title, line: T(line), note: T(note || ''), actions: [['back', 'Back']] }, f: { b: 0 } });
  }
  function perform(title, run) {
    if (busy) return;
    busy = true; busyTimer = setTimeout(release, 10000);
    run(function (err, meta) {
      release();
      if (!err && meta && meta.mode === 'inapp') S.hdmiInApp = true;
      if (err) message(T(title), err.message || 'The TV could not open this screen.', err.detail || '');
      render(); syncRotation();
    });
  }
  function exitHdmiInApp() {
    if (!S.hdmiInApp) return;
    S.hdmiInApp = false;
    if (FrameDevice.hideHdmiView) FrameDevice.hideHdmiView(function () { render(); syncRotation(); });
    else { render(); syncRotation(); }
  }
  function hdmiBack(k) {
    if (!S.hdmiInApp || k !== 'back') return false;
    exitHdmiInApp();
    return true;
  }
  function launch(id) {
    var a = app(id), c;
    if (!a || busy) return;
    if (S.c.home.indexOf(id) >= 0) { c = next(S.c.home.slice(), S.c.recent.slice()); c.lastApp = id; write(c, 'Last app'); }
    S.press = id; S.lastLaunch = a.name;
    perform(a.name, function (done) { FrameDevice.launchApp(a.appId, done); });
  }
  function refreshCatalog() {
    var request, oldFocus;
    if (catalog.loading) return;
    request = ++catalog.request; catalog.loading = true; catalog.error = null;
    FrameDevice.apps(function (err, entries) {
      if (request !== catalog.request) return;
      catalog.loading = false;
      if (err) { catalog.error = err.message || T('Could not read installed apps.'); if (!catalog.loaded) ALPHA = []; render(); return; }
      oldFocus = top().id === 'apps' ? ALPHA[top().f.i] : null;
      ALPHA = [];
      entries.forEach(function (entry) {
        var id = PRIMARY.indexOf(entry.brand) >= 0 ? entry.brand : entry.appId, a;
        if (!safeId(id) || !safeId(entry.appId) || ALPHA.indexOf(id) >= 0) return;
        a = app(id);
        if (!a) { a = { id: id }; APPS.push(a); }
        if (PRIMARY.indexOf(id) >= 0) {
          var meta = PRIMARY_APPS[PRIMARY.indexOf(id)];
          a.appId = meta.appId || entry.appId; a.brand = meta.brand || entry.brand || ''; a.mark = meta.mark;
          a.name = meta.name;
        } else {
          a.appId = entry.appId; a.brand = entry.brand || ''; a.mark = !!entry.brand;
          a.name = String(entry.name).slice(0, 160);
        }
        a.nativeIcon = safeIcon(entry.icon);
        a.icon = a.nativeIcon;
        ALPHA.push(id);
      });
      ALPHA.sort(function (a, b) { return app(a).name.toLowerCase().localeCompare(app(b).name.toLowerCase()); });
      catalog.loaded = true; catalog.error = null; catalog.revision++;
      if (top().id === 'apps' && oldFocus && ALPHA.indexOf(oldFocus) >= 0) top().f.i = ALPHA.indexOf(oldFocus);
      norm(); render();
    });
  }

  /* ---------- Navigation targets ---------- */
  function utils() { return (alexaOn() ? liveTargets().map(function (t, i) { return 'sw' + i; }) : []).concat(['wifi', 'apps', 'settings']); }
  /* prev/next run along the apps; out goes to the controls, inn comes back (or to a per-app action). */
  function axes() { return { prev: 'left', next: 'right', out: 'up', inn: 'down' }; }
  function wifiReady() { return !!(S.c.wifiSsid && String(S.c.wifiSsid).trim()); }
  function wifiQrPayload() {
    var ssid = String(S.c.wifiSsid || '').trim(), pass = String(S.c.wifiPass || ''), sec = S.c.wifiSec === 'nopass' ? 'nopass' : 'WPA';
    function esc(s) { return s.replace(/([\\;,":])/g, '\\$1'); }
    if (sec === 'nopass' || !pass) return 'WIFI:T:nopass;S:' + esc(ssid) + ';;';
    return 'WIFI:T:' + sec + ';S:' + esc(ssid) + ';P:' + esc(pass) + ';;';
  }
  function openWifiQr() {
    if (!wifiReady()) { push({ id: 'message', msg: 'wifiSetup', f: { b: 0 } }); return; }
    push({ id: 'wifiqr', f: {} });
  }
  function utilAction(u) {
    if (/^sw\d+$/.test(u)) { if (liveTargets()[+u.slice(2)]) toggleTarget(liveTargets()[+u.slice(2)]); }
    else if (u === 'wifi') openWifiQr();
    else if (u === 'apps') openApps();
    else openSettings();
  }
  function addAppsRoute() { openEditor('home'); }
  function openSettings() { push({ id: 'settings', f: { id: S.settingsFocus } }); }
  function openAppearance(group) {
    var axis = { background: 'bg', layout: 'layout', typography: 'font', focus: 'focus', region: 'lang' }[group];
    var action = S.detailFocus[group] || (axis ? 'choice.' + axis + '.' + S.c[axis] : group === 'rotation' ? 'rotation.' + S.c.mode : group === 'alexa' ? (alexaOn() ? 'alexa.list.readings' : 'alexa.connect') : group === 'spotify' ? (spotifyOn() ? 'choice.spotifyShow.' + S.c.spotifyShow : 'spotify.connect') : group === 'connections' ? (FA ? 'conn.alexa' : 'conn.spotify') : group === 'dateinfo' ? 'choice.holidays.' + S.c.holidays : group === 'calendar' ? (FC && FC.connected() ? 'choice.calShow.' + S.c.calShow : 'calendar.connect') : group === 'system' ? (FB && BACKUP_PAGE ? 'backup.create' : 'system.samsung') : 'wifi.edit.ssid');
    push({ id: 'appearance', group: group, f: { action: action } });
  }
  function openWifiField(field) {
    push({ id: 'wifitype', field: field, draft: field === 'ssid' ? S.c.wifiSsid : S.c.wifiPass, f: { zone: 'char', ci: 0, ai: 0 } });
  }
  function saveWifiDraft(field, draft) {
    var c = next(S.c.home.slice(), S.c.recent.slice());
    if (field === 'ssid') c.wifiSsid = String(draft || '').slice(0, 32);
    else c.wifiPass = String(draft || '').slice(0, 63);
    if (!write(c, 'Wi‑Fi QR settings')) { S.err = 'Wi‑Fi QR settings'; return false; }
    return true;
  }
  function applyWifiSec(value) {
    var c = next(S.c.home.slice(), S.c.recent.slice());
    c.wifiSec = value === 'nopass' ? 'nopass' : 'WPA';
    if (!write(c, 'Wi‑Fi security')) S.lookError = { type: 'save', patch: { wifiSec: value }, row: 'wifiSec', transient: false };
  }
  function openMessage(key) { push({ id: 'message', msg: key, f: { b: 0 } }); }
  function openApps() {
    var e = { id: 'apps', mode: 'browse', top: 0, f: { zone: 'grid', i: Math.max(0, ALPHA.indexOf(S.appsFocus)), h: 0 } };
    push(e); refreshCatalog(); return e;
  }
  function openEditor(origin) {
    var i = ensureSel();
    clearSession();
    refreshCatalog();
    push({ id: 'editor', origin: origin, lifted: null, top: 0, otherReturn: { id: otherList()[0] || null, index: 0, top: 0 }, f: { zone: S.c.home.length ? 'home' : 'other', i: Math.max(0, i), part: 'name', h: 1, j: 0 } });
  }
  function openWallpaper() {
    var i = wallIndex(S.c.wall);
    S.err = null; S.wallError = null;
    push({ id: 'wallpaper', i: i, top: clamp(i - 2, 0, Math.max(0, WALLS.length - WALL_VISIBLE)), f: { zone: 'photo' },
      previewTimer: 0, previewDue: null, applyPending: null, failedId: null, failedApply: false, retryBundle: null });
  }
  function isSettingsDetail(t) { return t.id === 'appearance' || t.id === 'wallpaper'; }

  var V = {};

  /* ---------- Home (browse) ---------- */
  V.home = {
    key: function (t, k) {
      var f = t.f, h = S.c.home, U = utils(), x = axes(), i = ensureSel();
      if (hdmiBack(k)) return;
      if (f.zone === 'music') {
        if (!musicVisible()) f.zone = 'apps';
        else {
          if (k === 'ok') openNowPlaying();
          else if (k === 'right') { f.zone = 'util'; f.u = 0; }
          else if (k === 'down' || k === 'back') f.zone = 'apps';
          return;
        }
      }
      if (f.zone === 'util') {
        f.u = clamp(f.u, 0, U.length - 1);
        if (k === x.prev && f.u > 0) f.u--;
        else if (k === x.prev && musicVisible()) f.zone = 'music';
        else if (k === x.next && f.u < U.length - 1) f.u++;
        else if (k === x.inn || k === 'back') f.zone = 'apps';
        else if (k === 'ok') { S.lastUtil = f.u; utilAction(U[f.u]); return; }
        S.lastUtil = f.u;
        return;
      }
      f.zone = 'apps';
      if (k === x.out) { f.zone = 'util'; f.u = clamp(S.lastUtil, 0, U.length - 1); }
      else if (k === 'back') openMessage('leave');
      else if (!h.length) { if (k === 'ok') addAppsRoute(); }
      else if (k === x.prev && i > 0) setSel(h[i - 1]);
      else if (k === x.next && i < h.length - 1) setSel(h[i + 1]);
      else if (k === 'ok') launch(S.sel);
    },
    point: function (t, z, i) {
      if (z === 'music') { t.f.zone = 'music'; openNowPlaying(); return; }
      if (z === 'util') { t.f.zone = 'util'; t.f.u = i; S.lastUtil = i; }
      else if (z === 'app') { t.f.zone = 'apps'; setSel(S.c.home[i]); }
      else if (z === 'empty') t.f.zone = 'apps';
      else return;
      this.key(t, 'ok');
    }
  };
  /* ---------- Wallpaper child: focus previews, activation applies ---------- */
  function cancelWallpaperTimer(t) {
    clearTimeout(t.previewTimer); t.previewTimer = 0; t.previewDue = null;
  }
  function failWallpaper(t, id, apply, bundle) {
    t.applyPending = null; t.failedId = id; t.failedApply = apply; t.retryBundle = bundle || null;
    restoreLook();
    if (!bundle) S.wallError = id;
  }
  function applyWallpaper(t, prepared) {
    var w = WALLS[t.i], c, bundle = prepared || S.previewBundle;
    if (!prepared && (S.wallPending || t.previewDue || S.wallShown !== w.id || S.wallError)) {
      t.applyPending = w.id;
      if (t.previewDue || S.wallPending !== w.id) { cancelWallpaperTimer(t); loadWallpaperPreview(t); }
      return;
    }
    t.applyPending = null;
    if (w.id === S.c.wall) { S.err = null; t.failedId = null; t.failedApply = false; t.retryBundle = null; return; }
    if (!bundle || bundle.key !== bundleKey({ wall: w.id, material: S.c.material })) { t.applyPending = w.id; loadWallpaperPreview(t); return; }
    c = next(S.c.home.slice(), S.c.recent.slice()); c.wall = w.id;
    if (!write(c, 'Wallpaper ' + w.name)) { failWallpaper(t, w.id, true, bundle); return; }
    installBundle(bundle, c); committedBundle = bundle; S.previewBundle = null;
    t.failedId = null; t.failedApply = false; t.retryBundle = null;
  }
  function loadWallpaperPreview(t) {
    var id = WALLS[t.i].id;
    cancelWallpaperTimer(t);
    showWall(id, function (ok) {
      if (top() !== t || WALLS[t.i].id !== id) return;
      if (!ok) failWallpaper(t, id, t.applyPending === id, null);
      else if (t.applyPending === id) applyWallpaper(t);
      render(); syncRotation();
    });
  }
  function previewWallpaper(t, index, apply, immediate) {
    var id, target;
    cancelWallpaperTimer(t); cancelLook();
    t.i = index; t.f.zone = 'photo'; id = WALLS[index].id;
    t.applyPending = apply ? id : null; t.failedId = null; t.failedApply = false; t.retryBundle = null;
    S.err = null; S.wallError = null;
    if (id === S.c.wall && committedBundle) {
      installBundle(committedBundle, S.c); S.previewBundle = null;
      if (apply) applyWallpaper(t);
      return;
    }
    if (S.wallShown === id && S.previewBundle && S.previewBundle.key === bundleKey({ wall: id, material: S.c.material })) {
      if (apply) applyWallpaper(t);
      return;
    }
    if (apply || immediate) { loadWallpaperPreview(t); return; }
    target = lookOf(S.c); target.wall = id;
    S.pending = { patch: { wall: id }, target: target, row: 'bg', preview: true, transient: false, deferred: true };
    t.previewDue = id;
    t.previewTimer = setTimeout(function () { if (top() === t && WALLS[t.i].id === id) loadWallpaperPreview(t); }, WALL_DELAY);
  }
  function retryWallpaper(t) {
    var apply = t.failedApply, bundle = t.retryBundle;
    t.f.zone = 'photo';
    if (bundle && apply) applyWallpaper(t, bundle);
    else previewWallpaper(t, t.i, apply, true);
  }
  function closeWallpaper(t) {
    cancelWallpaperTimer(t); t.applyPending = null; S.err = null; pop(); restoreLook();
    if (top().id === 'appearance' && top().group === 'background') detailFocus(top(), { action: 'background.wallpaper' }, 0);
  }
  V.wallpaper = {
    norm: function (t) {
      t.i = clamp(t.i, 0, WALLS.length - 1);
      if (t.f.zone === 'retry' && !t.failedId) t.f.zone = 'photo';
      if (t.i < t.top) t.top = t.i;
      if (t.i >= t.top + WALL_VISIBLE) t.top = t.i - WALL_VISIBLE + 1;
      t.top = clamp(t.top, 0, Math.max(0, WALLS.length - WALL_VISIBLE));
    },
    key: function (t, k) {
      if (k === 'back') { closeWallpaper(t); return; }
      if (t.f.zone === 'back') {
        if (k === 'ok') closeWallpaper(t);
        else if (k === 'down' || k === 'right') t.f.zone = 'photo';
        return;
      }
      if (t.f.zone === 'retry') {
        if (k === 'ok') retryWallpaper(t);
        else if (k === 'up' || k === 'left') t.f.zone = 'photo';
        return;
      }
      if (k === 'left' || k === 'up' && t.i === 0) { t.f.zone = 'back'; t.applyPending = null; }
      else if (k === 'up' && t.i > 0) previewWallpaper(t, t.i - 1, false);
      else if (k === 'down' && t.i < WALLS.length - 1) previewWallpaper(t, t.i + 1, false);
      else if ((k === 'right' || k === 'down') && t.failedId) t.f.zone = 'retry';
      else if (k === 'ok') { if (t.retryBundle) applyWallpaper(t, t.retryBundle); else applyWallpaper(t); }
    },
    point: function (t, z, i) {
      if (z === 'wall-back') closeWallpaper(t);
      else if (z === 'wall-retry') retryWallpaper(t);
      else if (z === 'wall-choice' && i >= 0 && i < WALLS.length) {
        if (i === t.i) { t.f.zone = 'photo'; this.key(t, 'ok'); }
        else previewWallpaper(t, i, true);
      }
    }
  };

  /* ---------- Installed apps ---------- */
  function appsItems() { return catalog.error ? [] : ALPHA; }
  function appsHead() { return catalog.error ? [['retry', T('Try again'), '', '']] : [['editor', T('Apps on Home'), '', 'home']]; }
  V.apps = {
    sheet: true,
    norm: function (t) {
      var n = appsItems().length;
      t.f.i = clamp(t.f.i, 0, Math.max(0, n - 1));
      if (!n) t.f.zone = 'head';
    },
    key: function (t, k) {
      var f = t.f, items = appsItems(), n = items.length, col = f.i % COLS, row = Math.floor(f.i / COLS);
      if (k === 'back') { pop(); return; }
      if (f.zone === 'head') {
        if (k === 'down' && n) f.zone = 'grid';
        else if (k === 'ok') { if (catalog.error) refreshCatalog(); else openEditor('apps'); }
        return;
      }
      if (k === 'left' && col > 0) f.i--;
      else if (k === 'right' && col < COLS - 1 && f.i < n - 1) f.i++;
      else if (k === 'down' && row < Math.ceil(n / COLS) - 1) f.i = Math.min(f.i + COLS, n - 1);
      else if (k === 'up') { if (row > 0) f.i -= COLS; else f.zone = 'head'; }
      else if (k === 'ok' && n) launch(items[f.i]);
      S.appsFocus = items[f.i] || null;
    },
    point: function (t, z, i) { if (z === 'grid') { t.f.zone = 'grid'; t.f.i = i; } else if (z === 'head') t.f.zone = 'head'; else return; this.key(t, 'ok'); }
  };

  /* ---------- B: two-zone Home editor ---------- */
  function otherGroups() {
    var rec = S.c.recent.filter(function (id) { return !onHome(id) && app(id); });
    return { recent: rec, rest: ALPHA.filter(function (id) { return !onHome(id) && rec.indexOf(id) < 0; }) };
  }
  function otherList() { var o = otherGroups(); return o.recent.concat(o.rest); }
  /* Where Home starts to scroll: as many apps as the current dock shows at once (seven in the Modern
     dock, five in the Dock …); with no more apps than that the line is not shown at all. */
  function editorCut() { return Math.max(1, dockGeom(S.c.home.length).vis); }
  function editorHomeY(i) { return i * ED_ROW + (i >= editorCut() ? 24 : 0); }
  function editorOtherY(j) {
    var o = otherGroups();
    return j * ED_ROW + (o.recent.length ? ED_SEP : 0) + (o.recent.length && j >= o.recent.length ? ED_SEP : 0);
  }
  function rememberOther(t) {
    var list = otherList();
    t.otherReturn = { id: list[t.f.j] || null, index: t.f.j, top: t.top };
  }
  function returnOther(t) {
    var list = otherList(), memory = t.otherReturn, i = memory ? list.indexOf(memory.id) : -1;
    t.f.zone = 'other';
    t.f.j = i >= 0 ? i : clamp(memory ? memory.index : 0, 0, Math.max(0, list.length - 1));
    if (memory) t.top = memory.top;
  }
  function nearestHome(t, count) {
    var target = editorOtherY(t.f.j) - t.top + 36, best = 0, distance = Infinity, i, d;
    for (i = 0; i < count; i++) {
      d = Math.abs(editorHomeY(i) + 36 - target);
      if (d < distance) { best = i; distance = d; }
    }
    return best;
  }
  V.editor = {
    sheet: true,
    norm: function (t) {
      var f = t.f, nh = (t.lifted ? t.lifted.order : S.c.home).length, no = otherList().length;
      f.i = clamp(f.i, 0, Math.max(0, nh - 1));
      f.j = clamp(f.j, 0, Math.max(0, no - 1));
      if (f.zone === 'home' && !nh) f.zone = no ? 'other' : 'head';
      if (f.zone === 'other' && !no) f.zone = nh ? 'home' : 'head';
    },
    key: function (t, k) {
      var f = t.f, H = t.lifted ? t.lifted.order : S.c.home, O = otherList(), nh = H.length, no = O.length, d, tmp;
      if (t.lifted) {
        d = k === 'up' ? -1 : k === 'down' ? 1 : 0;
        if (d && f.i + d >= 0 && f.i + d < nh) { tmp = H[f.i + d]; H[f.i + d] = H[f.i]; H[f.i] = tmp; f.i += d; S.err = null; }
        else if (k === 'ok') editorPlace(t);
        else if (k === 'back') { f.i = t.lifted.from; t.lifted = null; S.err = null; }
        return;
      }
      if (k === 'back') { closeEditor(t); return; }
      /* Metro look: Right past the right edge (Done, Not on Home, or Remove with nothing to add) goes on
         along the pivot to Wi‑Fi QR. */
      if (metroOn() && k === 'right' && (f.zone === 'other' || (f.zone === 'head' && f.h === 1) || (f.zone === 'home' && f.part === 'remove' && !no)) && pivotTo(t, 1)) return;
      if (f.zone === 'head') {
        if (k === 'left' && f.h > 0) f.h--;
        else if (k === 'right' && f.h < 1) f.h++;
        else if (k === 'down') { if (no) returnOther(t); else if (nh) f.zone = 'home'; }
        else if (k === 'ok') { begin(); if (f.h === 0) undoLast(null); else closeEditor(t); }
      } else if (f.zone === 'home') {
        if (k === 'up') { if (f.i > 0) f.i--; else f.zone = 'head'; }
        else if (k === 'down') { if (f.i < nh - 1) f.i++; }
        else if (k === 'right') { if (f.part === 'name') f.part = 'remove'; else if (no) returnOther(t); }
        else if (k === 'left') { if (f.part === 'remove') f.part = 'name'; }
        else if (k === 'ok') {
          begin();
          if (f.part === 'name') t.lifted = { id: H[f.i], from: f.i, order: H.slice(), snap: snap() };
          else editorRemove(t, H[f.i]);
        }
      } else {
        if (k === 'up') { if (f.j > 0) { f.j--; rememberOther(t); } else f.zone = 'head'; }
        else if (k === 'down') { if (f.j < no - 1) { f.j++; rememberOther(t); } }
        else if (k === 'left') { if (nh) { rememberOther(t); f.i = nearestHome(t, nh); f.zone = 'home'; f.part = 'name'; } }
        else if (k === 'ok') { begin(); editorAdd(t, O[f.j]); }
      }
    },
    point: function (t, z, i) {
      if (t.lifted) { if (z === 'name' && i === t.f.i) this.key(t, 'ok'); return; }
      if (z === 'name' || z === 'remove') { t.f.zone = 'home'; t.f.i = i; t.f.part = z; }
      else if (z === 'other') { t.f.zone = 'other'; t.f.j = i; rememberOther(t); }
      else if (z === 'head') { t.f.zone = 'head'; t.f.h = i; }
      else return;
      this.key(t, 'ok');
    }
  };
  /* Focus follows the app between zones, so a repeated OK toggles the same app. */
  function editorRemove(t, id) {
    if (!homeRemove(id)) return;
    t.f.zone = 'other'; t.f.j = otherList().indexOf(id);
    S.note = T('{0} is in Recently removed. OK puts it back.', app(id).name);
  }
  function editorAdd(t, id) {
    rememberOther(t);
    if (!homeAdd(id)) return;
    var remaining = otherList(), at = clamp(t.otherReturn.index, 0, Math.max(0, remaining.length - 1));
    t.otherReturn.id = remaining[at] || null; t.otherReturn.index = at;
    t.f.zone = 'home'; t.f.i = S.c.home.indexOf(id); t.f.part = 'remove';
    S.note = T('{0} is on Home, position {1}.', app(id).name, t.f.i + 1);
  }
  function editorPlace(t) {
    var L = t.lifted;
    begin();
    if (same(L.order, S.c.home)) { t.lifted = null; return; }
    if (!homeMove(L.order.slice(), L.id, L.snap)) return;
    t.lifted = null;
    S.note = T('{0} moved to position {1}.', app(L.id).name, t.f.i + 1);
  }
  function closeEditor() { clearSession(); pop(); }

  /* ---------- Settings, Layout and messages ---------- */
  function mode() { for (var i = 0; i < MODES.length; i++) if (MODES[i].id === S.c.mode) return MODES[i]; return MODES[0]; }
  function settingsRows() {
    var n = S.c.home.length;
    return [{ id: 'background', icon: 'art', label: T('Background'), value: S.c.bg === 'photo' ? T(wall(S.c.wall).name) : T(VALUE_NAMES[S.c.bg]) },
      { id: 'layout', icon: 'layout', label: T('Layout'), value: T(S.c.dockStyle === 'tiles' ? 'Tiles' : S.c.dockStyle === 'modern' ? 'Modern dock' : 'Dock') + (S.c.topStyle === 'bar' ? ', ' + T('Top dock') : '') },
      { id: 'typography', icon: 'type', label: T('Style'), value: FONTS[S.c.font].name + ' · ' + T(VALUE_NAMES[S.c.focus]) },
      { id: 'editor', icon: 'apps', label: T('Apps on Home'), value: T(n === 1 ? '{0} app' : '{0} apps', n) },
      { id: 'wifiqr', icon: 'wifiqr', label: T('Wifi QR code'), value: wifiReady() ? S.c.wifiSsid : T('Not set') },
      { id: 'region', icon: 'clock', label: T('Date and time'), value: T(PREF_NAMES[S.c.clock]) + (S.c.clockPos === 'corner' ? '' : ', ' + T(PREF_NAMES[S.c.clockPos])) },
      /* Two languages: OK on the tile switches between them, no page needed. */
      { id: 'lang', icon: 'lang', label: T('Language'), value: PREF_NAMES[S.c.lang], toggle: true }
    ].concat(FA || FS || FC ? [{ id: 'connections', icon: 'alexa', label: T('Connections'), value: connectionsSummary() }] : []).concat([
      { id: 'system', icon: 'home', label: T('System'), value: FB && BACKUP_PAGE ? T('Backup, Samsung Home') : T('Samsung Home') }]);
  }
  function settingsIds() { return settingsRows().map(function (r) { return r.id; }); }
  /* Three columns of three equal cards. */
  var SETTINGS_GROUPS = [{ id: 'personal', label: 'Personalization', ids: ['background', 'layout', 'typography'] },
    { id: 'home', label: 'Home and time', ids: ['editor', 'wifiqr', 'region'] },
    { id: 'system', label: 'System', ids: ['lang', 'connections', 'system'] }];
  function settingsGroups() {
    var have = settingsIds();
    return SETTINGS_GROUPS.map(function (g) { return { id: g.id, label: g.label, ids: g.ids.filter(function (id) { return have.indexOf(id) >= 0; }) }; }).filter(function (g) { return g.ids.length; });
  }
  function settingsLayout() { return settingsGroups().map(function (g) { return g.ids; }); }
  var SETTINGS_COLS = 4;
  function settingsCols() { return settingsIds().length > 8 ? 3 : SETTINGS_COLS; }
  /* Metro look (Settings → Style → Settings look): the same groups as live tiles of three sizes on a
     two-column grid per group: [column, row, width, height]. The remote moves to the nearest tile in
     the pressed direction across all groups. */
  var METRO_TILES = { background: [0, 0, 2, 2], layout: [0, 2, 1, 1], typography: [1, 2, 1, 1], editor: [0, 0, 2, 1], wifiqr: [0, 1, 2, 1], region: [0, 2, 2, 1],
    lang: [0, 0, 1, 1], system: [1, 0, 1, 1], connections: [0, 1, 2, 2] };
  var METRO_TINT = { layout: '157,184,232', typography: '231,179,200', editor: '159,208,207', wifiqr: '232,184,150', region: '196,178,230', lang: '169,211,184', system: '227,163,160', connections: '170,188,214' };
  function metroOn() { return S.c.settingsLook === 'metro'; }
  function metroRects() {
    var out = {};
    settingsGroups().forEach(function (g, gi) { g.ids.forEach(function (id) { var m = METRO_TILES[id] || [0, 0, 1, 1]; out[id] = { x: gi * 3 + m[0], y: m[1], w: m[2], h: m[3] }; }); });
    return out;
  }
  function metroMove(id, k) {
    var R = metroRects(), a = R[id], best = null, bestScore = 1e9;
    if (!a) return id;
    Object.keys(R).forEach(function (other) {
      var b = R[other], gap, over, score;
      if (other === id) return;
      if (k === 'right') gap = b.x - (a.x + a.w); else if (k === 'left') gap = a.x - (b.x + b.w); else if (k === 'down') gap = b.y - (a.y + a.h); else gap = a.y - (b.y + b.h);
      if (gap < 0) return;
      over = k === 'left' || k === 'right' ? Math.min(a.y + a.h, b.y + b.h) - Math.max(a.y, b.y) : Math.min(a.x + a.w, b.x + b.w) - Math.max(a.x, b.x);
      score = gap * 10 + (over > 0 ? 0 : 100) + Math.abs((k === 'left' || k === 'right' ? (b.y + b.h / 2) - (a.y + a.h / 2) : (b.x + b.w / 2) - (a.x + a.w / 2)));
      if (score < bestScore) { bestScore = score; best = other; }
    });
    return best || id;
  }
  V.settings = {
    sheet: true,
    norm: function (t) { var ids = settingsIds(); if (ids.indexOf(t.f.id) < 0) t.f.id = ids[0]; },
    key: function (t, k) {
      if (metroOn() && (k === 'up' || k === 'down' || k === 'left' || k === 'right')) { t.f.id = S.settingsFocus = metroMove(t.f.id, k); return; }
      /* Three columns: Up/Down move within a column, Left/Right to the same place in the next one. */
      var cols = settingsLayout(), c = 0, r = 0, id = t.f.id;
      cols.forEach(function (ids, ci) { var ri = ids.indexOf(id); if (ri >= 0) { c = ci; r = ri; } });
      if (k === 'up' && r > 0) id = cols[c][r - 1];
      else if (k === 'down' && r < cols[c].length - 1) id = cols[c][r + 1];
      else if (k === 'left' && c > 0) id = cols[c - 1][Math.min(r, cols[c - 1].length - 1)];
      else if (k === 'right' && c < cols.length - 1) id = cols[c + 1][Math.min(r, cols[c + 1].length - 1)];
      else if (k === 'back') { pop(); return; }
      t.f.id = id; S.settingsFocus = id;
      if (k === 'ok') settingsOk(id);
    },
    point: function (t, z, i, id) { if (z === 'row' && id) { t.f.id = id; this.key(t, 'ok'); } }
  };
  function settingsOk(id) {
    if (id === 'lang') { applyPref('lang', S.c.lang === 'hu' ? 'en' : 'hu'); return; }
    if (id === 'focus') id = 'typography';
    if (id === 'editor') openEditor('settings');
    else if (id === 'system') openAppearance('system');
    else openAppearance(id);
  }
  /* Metro look: pages of one Settings group sit side by side as a pivot; Left and Right on a row move to
     the page before or after, in the order the tiles read (System sits above Connections). Pages opened
     from another page (Rotation, Alexa, Calendar …) stand alone. */
  var pivotSlide = { dir: '', n: 0, until: 0 };
  /* Short page names for the pivot strip (the page titles can be longer). */
  var PIVOT_NAMES = { editor: 'Apps on Home', wifiqr: 'Wi‑Fi QR', region: 'Date and time' };
  function pivotName(id) { return T(PIVOT_NAMES[id] || DETAIL_NAMES[id]); }
  var METRO_PIVOTS = [['background', 'layout', 'typography'], ['editor', 'wifiqr', 'region'], ['system', 'connections'], ['alexa', 'spotify', 'calendar']];
  function pivotAvailable(id) { return id === 'connections' ? !!(FA || FS || FC) : id === 'alexa' ? !!FA : id === 'spotify' ? !!FS : id === 'calendar' ? !!FC : true; }
  function pivotOf(group) { var g = group === 'focus' ? 'typography' : group, out = [g]; METRO_PIVOTS.forEach(function (p) { if (p.indexOf(g) >= 0) out = p.filter(pivotAvailable); }); return out; }
  function pivotTo(t, dir) {
    var here = t.id === 'editor' ? 'editor' : t.group === 'focus' ? 'typography' : t.group, list = pivotOf(here), to = list[list.indexOf(here) + dir], below;
    if (!to) return false;
    if (t.id === 'editor') closeEditor(t); else { cancelLook(); S.err = null; pop(); }
    below = top();
    if (below && below.id === 'settings') { below.f.id = to; S.settingsFocus = to; }
    /* Alexa · Spotify · Calendar: back on Connections, the row of the page you ended on is focused. */
    if (below && below.id === 'appearance' && below.group === 'connections') { below.f.action = 'conn.' + to; S.detailFocus.connections = 'conn.' + to; }
    if (to === 'editor') openEditor('settings'); else openAppearance(to);
    /* The rows of the new page slide a little from the side moved towards; the pivot header stays and
       only its highlight and underline move (renderPivotHead). */
    pivotSlide = { dir: dir > 0 ? 'next' : 'prev', n: (pivotSlide.n || 0) + 1, until: Date.now() + 400 };
    return true;
  }
  /* Metro look: one pivot header for every Settings page and Apps on Home. It stays in place while you
     move along a pivot, so the names do not jump: the current name brightens and the underline slides to
     it. Above it, on Apps on Home, a SETTINGS label in the place where the Back row is on the other pages. */
  var pivotHead = null;
  function renderPivotHead(t) {
    var cur = null, list, key, strip, items, bar, el, i;
    if (!pivotHead) {
      pivotHead = document.createElement('div'); pivotHead.className = 'pivot-head'; pivotHead.setAttribute('aria-hidden', 'true');
      pivotHead.innerHTML = '<span class="pivot-label"></span><span class="pivot-strip"></span>';
      stage.appendChild(pivotHead);
    }
    if (metroOn() && t.id === 'editor') cur = 'editor';
    else if (metroOn() && t.id === 'appearance') cur = t.group === 'focus' ? 'typography' : t.group;
    if (!cur) { pivotHead.className = 'pivot-head'; pivotHead._key = ''; return; }
    list = pivotOf(cur); key = list.join('|') + '|' + S.c.lang;
    strip = pivotHead.lastChild;
    pivotHead.firstChild.textContent = t.id === 'editor' ? T('Settings') : '';
    if (pivotHead._key !== key) {
      pivotHead._key = key;
      strip.innerHTML = list.map(function (id) { return '<span class="pivot-item" data-id="' + id + '">' + esc(pivotName(id)) + '</span>'; }).join('') + '<i class="pivot-bar"></i>';
      strip.className = 'pivot-strip is-fresh';
    } else strip.className = 'pivot-strip';
    items = strip.querySelectorAll('.pivot-item'); bar = strip.querySelector('.pivot-bar');
    for (i = 0; i < items.length; i++) {
      el = items[i];
      el.className = 'pivot-item' + (el.getAttribute('data-id') === cur ? ' is-current' : '');
      if (el.getAttribute('data-id') === cur) bar.style.transform = 'translate3d(' + (el.offsetLeft + 4) + 'px,0,0)';
    }
    pivotHead.className = 'pivot-head is-on' + (t.id === 'editor' ? ' has-label' : '');
  }
  var DETAIL_NAMES = { editor: 'Apps on Home', calendar: 'Calendar', background: 'Background', layout: 'Layout', typography: 'Style', focus: 'Style', rotation: 'Rotation', region: 'Date and time', wifiqr: 'Wifi QR code settings', alexa: 'Alexa', spotify: 'Spotify', connections: 'Connections', dateinfo: 'Date details', system: 'System' };
  var PARENT = { rotation: 'background', alexa: 'connections', spotify: 'connections', calendar: 'connections', dateinfo: 'region' };
  function backLabel(t) { return T(PARENT[t.group] ? DETAIL_NAMES[PARENT[t.group]] : 'Settings'); }
  function choice(axis, value, disabled) {
    return { action: axis === 'mode' ? 'rotation.' + value : axis === 'wifiSec' ? 'wifi.sec.' + value : 'choice.' + axis + '.' + value, axis: axis, value: value, disabled: !!disabled,
      label: axis === 'font' ? FONTS[value].name : axis === 'mode' ? T(MODES.filter(function (m) { return m.id === value; })[0].name) : axis === 'wifiSec' ? (value === 'nopass' ? T('Open network') : 'WPA/WPA2') : PREF_VALUES[axis] ? T(PREF_NAMES[value]) : value === 'both' ? T('Both') : T(VALUE_NAMES[value]) };
  }
  function detailSections(t) {
    var flat = S.c.bg !== 'photo', inactive = !materialApplies();
    function options(axis, values, disabled) { return values.map(function (value) { return choice(axis, value, disabled); }); }
    if (t.group === 'background') return [
      { id: 'bg', title: T('Background type'), items: options('bg', ['photo', 'dark']) },
      { id: 'wall', title: T('Wallpaper'), items: [{ action: 'background.wallpaper', label: T(wall(S.c.wall).name), thumbnail: true, disabled: flat }]
        .concat(FCW ? [{ action: 'background.custom', label: T('Picture from phone'), phone: true }] : []) },
      { id: 'rotation', title: T('Rotation'), items: [{ action: 'background.rotation', label: T(mode().name), disabled: flat }], reason: flat ? T('Choose Photo to use wallpaper and rotation.') : '' }
    ];
    if (t.group === 'layout') return [
      { id: 'layout', group: T('Bottom bar: apps'), title: T('Layout'), horizontal: true, items: options('layoutView', PREF_VALUES.layoutView) },
      { id: 'apps', title: T('App display'), horizontal: true, items: options('apps', ['text', 'icons', 'both']) },
      { id: 'iconStyle', title: T('Icon style'), horizontal: true, items: options('iconStyle', ['color', 'minimal']) },
      { id: 'topStyle', group: T('Top bar: widgets and controls'), title: T('Style'), horizontal: true, items: options('topStyle', PREF_VALUES.topStyle) },
      { id: 'controls', title: T('Wi‑Fi, All apps and Settings'), horizontal: true, items: options('controls', ['text', 'icons', 'both']) }
    ].concat(FA ? [{ id: 'switchStyle', title: T('Alexa switches'), horizontal: true, items: options('switchStyle', ['text', 'icons', 'both']) }] : []);
    function focusSections() { return [
      { id: 'focus', title: T('Focus style'), horizontal: true, items: options('focus', ['type', 'glass']) },
      { id: 'material', title: T('Material'), horizontal: true, items: options('material', ['soft', 'frost', 'tint'], inactive),
        reason: inactive ? T('Materials are available with a Photo background.') : '' }
    ]; }
    if (t.group === 'typography' || t.group === 'focus') return [{ id: 'clockStyle', title: T('Clock style'), horizontal: true, items: options('clockStyle', PREF_VALUES.clockStyle) },
      { id: 'font', title: T('Font'), items: options('font', LOOK_VALUES.font) }].concat(focusSections())
      .concat([{ id: 'settingsLook', title: T('Settings look'), horizontal: true, items: options('settingsLook', PREF_VALUES.settingsLook) }]);
    if (t.group === 'rotation') return [{ id: 'mode', title: '', items: options('mode', MODES.map(function (m) { return m.id; }), flat),
      reason: flat ? T('Choose Photo in Background to use rotation.') : T('Timed changes pause while Settings or another panel is open.') }];
    if (t.group === 'region') return [
      { id: 'clock', title: T('Time format'), horizontal: true, items: options('clock', PREF_VALUES.clock) },
      { id: 'date', title: T('Date'), horizontal: true, items: options('date', PREF_VALUES.date) },
      { id: 'clockPos', title: T('Clock'), horizontal: true, items: options('clockPos', PREF_VALUES.clockPos) },
      { id: 'seconds', title: T('Seconds'), horizontal: true, items: options('seconds', PREF_VALUES.seconds) },
      { id: 'weather', title: T('Weather') + ' · ' + WEATHER_PLACE.name, horizontal: true, items: options('weather', PREF_VALUES.weather) },
      { id: 'dateinfo', title: '', items: [{ action: 'region.dateinfo', label: T('Date details'), description: dateInfoSummary() }] }
    ];
    if (t.group === 'system') return [
      { id: 'backup', items: FB && BACKUP_PAGE ? [
        { action: 'backup.create', label: T('Create a backup'), description: T('Save all your settings to your phone') },
        { action: 'backup.restore', label: T('Restore from a backup'), description: T('Load settings from a saved file') }] : [] },
      { id: 'thistv', items: [{ action: 'system.samsung', label: T('Samsung Home'), description: T('Leave Frame Home') }] }
    ];
    if (t.group === 'alexa') return alexaSections();
    if (t.group === 'spotify') return spotifySections();
    if (t.group === 'connections') return connectionsSections();
    if (t.group === 'dateinfo') return dateinfoSections();
    if (t.group === 'calendar') return calendarSections();
    if (t.group === 'wifiqr') return [
      { id: 'ssid', title: T('Network name'), items: [{ action: 'wifi.edit.ssid', label: S.c.wifiSsid || T('Add network name'), description: T('SSID shown in the QR code') }] },
      { id: 'pass', title: T('Password'), items: [{ action: 'wifi.edit.pass', label: S.c.wifiPass ? T('Change password') : T('Add password'), description: S.c.wifiPass ? T('Saved (hidden)') : T('Optional for open networks') }] },
      { id: 'sec', title: T('Security'), horizontal: true, items: [choice('wifiSec', 'WPA'), choice('wifiSec', 'nopass')] }
    ];
    return [];
  }
  /* A section whose items are all choices of one setting is shown as one select row (OK opens its list,
     Left/Right step through it); other items are rows of their own. */
  function isSelect(section) { return section.items.length > 0 && section.items.every(function (item) { return !!item.axis; }); }
  function selectItem(section) {
    var enabled = section.items.filter(function (item) { return !item.disabled; });
    return { action: 'select.' + section.id, select: section, label: section.title, disabled: !enabled.length };
  }
  function detailRows(t) {
    var rows = [[{ action: 'settings.back', label: backLabel(t) }]];
    detailCards(t).forEach(function (card) { card.sections.forEach(function (section) {
      if (isSelect(section)) { var it = selectItem(section); if (!it.disabled) rows.push([it]); return; }
      section.items.filter(function (item) { return !item.disabled; }).forEach(function (item) { rows.push([item]); });
    }); });
    if (S.lookError) rows.push([{ action: 'settings.retry', label: T('Try again') }]);
    return rows;
  }
  function detailLocation(t) {
    var rows = detailRows(t), row = 0, column = 0;
    rows.forEach(function (items, r) { items.forEach(function (item, c) { if (item.action === t.f.action) { row = r; column = c; } }); });
    return { rows: rows, row: row, column: column, item: rows[row][column] };
  }
  function detailFocus(t, item, column) {
    t.f.action = item.action;
    if (item.action !== 'settings.back') S.detailFocus[t.group] = item.action;
    if (column !== undefined) t.f.column = column;
    if (item.axis) S.appearanceFocus = item.axis;
    if (item.select) S.appearanceFocus = item.select.items[0].axis;
  }
  function applyRotation(value) {
    var c;
    if (S.c.bg !== 'photo') return;
    S.err = null; S.lookError = null;
    if (value === S.c.mode) return;
    c = next(S.c.home.slice(), S.c.recent.slice()); c.mode = value;
    if (!write(c, 'Wallpaper rotation')) S.lookError = { type: 'save', patch: { mode: value }, row: 'mode', transient: false };
  }
  /* Dock or Tiles: Tiles is the Dock with a separate glass tile per app instead of the shelf. */
  function applyLayoutView(value) {
    S.err = null; S.lookError = null;
    savePrefs({ dockStyle: value === 'tiles' || value === 'modern' ? value : 'shelf' }, 'Dock style');
  }
  function applyPref(axis, value) {
    var c = next(S.c.home.slice(), S.c.recent.slice()), patch = {};
    if (axis === 'layoutView') { applyLayoutView(value); return; }
    S.err = null; S.lookError = null;
    if (S.c[axis] === value) return;
    c[axis] = value; patch[axis] = value;
    if (!write(c, 'Preference ' + axis)) { S.lookError = { type: 'save', patch: patch, row: axis, transient: false }; return; }
    if (axis === 'lang') applyLanguage();
    if (axis === 'weather' && value !== 'off') refreshWeather(function () { render(); });
    if (axis === 'clockStyle' || axis === 'seconds') updateClock();
    if (axis === 'holidays' && value === 'on') loadHolidays(new Date().getFullYear(), function () { render(); });
    if (axis === 'spotifyShow') { if (value === 'off') spot.now = null; spotifyPoll(true); }
  }
  function applyLanguage() {
    document.documentElement.lang = S.c.lang === 'hu' ? 'hu' : 'en';
    if (wifiQrTitle) wifiQrTitle.textContent = T('Scan to join Wi‑Fi');
  }
  function detailBack() { cancelLook(); S.err = null; pop(); }
  function detailOk(t, item) {
    var patch = {}, error = S.lookError;
    if (item.action === 'settings.back') { detailBack(); return; }
    if (item.disabled || S.pending) return;
    if (item.action === 'settings.retry') {
      if (error && error.patch[error.row] !== undefined) detailFocus(t, choice(error.row, error.patch[error.row]), 0);
      if (error && error.row === 'mode') applyRotation(error.patch.mode);
      else if (error && error.row === 'wifiSec') applyWifiSec(error.patch.wifiSec);
      else if (error && PREF_VALUES[error.row]) applyPref(error.row, error.patch[error.row]);
      else if (error) setLook(error.patch, { row: error.row });
    } else if (item.axis === 'mode') applyRotation(item.value);
    else if (item.axis === 'wifiSec') applyWifiSec(item.value);
    else if (PREF_VALUES[item.axis]) applyPref(item.axis, item.value);
    else if (item.axis) { patch[item.axis] = item.value; setLook(patch, { row: item.axis }); }
    else if (item.action === 'background.wallpaper') openWallpaper();
    else if (item.action === 'background.rotation') openAppearance('rotation');
    else if (item.action === 'background.custom') openPhone();
    else if (item.action === 'alexa.connect') openPair('alexa');
    else if (item.action === 'spotify.connect') openPair('spotify');
    else if (item.action === 'spotify.signout') openMessage('spotifyOut');
    else if (item.action === 'conn.alexa') openAppearance('alexa');
    else if (item.action === 'region.dateinfo') openAppearance('dateinfo');
    else if (item.action === 'calendar.connect') openPair('calendar');
    else if (item.action === 'calendar.signout') openMessage('calendarOut');
    else if (/^calendar\.item\./.test(item.action)) openAlexaList('calendar', { cal: item.action.slice(14) });
    else if (item.action === 'conn.spotify') openAppearance('spotify');
    else if (item.action === 'conn.calendar') openAppearance('calendar');
    else if (item.action === 'dateinfo.calendars') openCalendarSettings();
    else if (/^alexa\.list\./.test(item.action)) openAlexaList(item.action.slice(11));
    else if (item.action === 'alexa.signout') alexaSignOut();
    else if (item.action === 'wifi.edit.ssid') openWifiField('ssid');
    else if (item.action === 'wifi.edit.pass') openWifiField('pass');
    else if (item.action === 'backup.create') startBackup('export');
    else if (item.action === 'backup.restore') startBackup('import');
    else if (item.action === 'system.samsung') perform('Samsung Home', FrameDevice.home);
  }
  V.appearance = {
    norm: function (t) {
      var rows = detailRows(t), exists = false, applied = null;
      if (t.f.action && !/^select\./.test(t.f.action)) t.f.action = selectFor(t, t.f.action) || t.f.action;
      if (S.detailFocus[t.group]) S.detailFocus[t.group] = selectFor(t, S.detailFocus[t.group]) || S.detailFocus[t.group];
      rows.forEach(function (items) { items.forEach(function (item) { if (item.select && !applied && item.select.items.some(function (x) { return x.axis && S.c[x.axis] === x.value && x.axis === S.appearanceFocus; })) applied = item; }); });
      rows.forEach(function (items) { items.forEach(function (item) {
        if (item.action === t.f.action) exists = true;
      }); });
      if (!exists) {
        var saved = S.detailFocus[t.group], row = saved && rows.some(function (items) { return items.some(function (item) { return item.action === saved; }); }) ? saved : null;
        rows.some(function (items, r) { return items.some(function (item, c) {
          if (item.action !== (row || (applied && applied.action))) return false;
          detailFocus(t, item, c); return true;
        }); });
        if (!row && !applied) detailFocus(t, (rows[1] || rows[0])[0], 0);
      }
      if (t.f.column === undefined) t.f.column = detailLocation(t).column;
    },
    key: function (t, k) {
      var at = detailLocation(t), row = at.row, column = at.column, opts, i;
      if (t.drop) {
        /* An open list: Up/Down move, OK applies and closes, Back or Left closes. */
        opts = dropOptions(t);
        if (k === 'up' || k === 'down') { i = t.drop.i; do { i += k === 'up' ? -1 : 1; } while (opts[i] && opts[i].disabled); if (opts[i]) t.drop.i = i; }
        else if (k === 'ok') { var pick = opts[t.drop.i]; t.drop = null; if (pick && !pick.disabled) detailOk(t, pick); }
        else if (k === 'back' || k === 'left') t.drop = null;
        return;
      }
      if (k === 'back') { detailBack(); return; }
      if (k === 'ok' && at.item.select) { if (!S.pending && !at.item.disabled) { opts = at.item.select.items; t.drop = { id: at.item.select.id, i: Math.max(0, opts.map(function (x) { return S.c[x.axis] === x.value; }).indexOf(true)) }; } return; }
      if (k === 'ok') { detailOk(t, at.item); return; }
      if (k === 'up' || k === 'down') {
        row = clamp(row + (k === 'up' ? -1 : 1), 0, at.rows.length - 1);
        column = Math.min(t.f.column || 0, at.rows[row].length - 1);
        detailFocus(t, at.rows[row][column]);
      } else if (k === 'left' || k === 'right') {
        if (metroOn() && at.rows[row].length === 1 && t.id === 'appearance') { pivotTo(t, k === 'left' ? -1 : 1); return; }
        column = clamp(column + (k === 'left' ? -1 : 1), 0, at.rows[row].length - 1);
        detailFocus(t, at.rows[row][column], column);
      }
    },
    point: function (t, z, i, action) {
      var choiceItem = null;
      if (z !== 'detail') return;
      if (detailRows(t).some(function (items) { return items.some(function (item, column) {
        if (item.action !== action) return false;
        detailFocus(t, item, column);
        if (item.select) this.key(t, 'ok'); else detailOk(t, item);
        return true;
      }, this); }, this)) return;
      /* A choice inside a select's list (also when the list is closed): apply it directly. */
      detailSections(t).forEach(function (section) { section.items.forEach(function (item) { if (item.action === action) choiceItem = { item: item, section: section }; }); });
      if (!choiceItem || choiceItem.item.disabled) return;
      t.drop = null; detailFocus(t, selectItem(choiceItem.section), 0); detailOk(t, choiceItem.item);
    }
  };
  function selectFor(t, action) {
    var out = null;
    detailSections(t).forEach(function (section) { if (isSelect(section) && section.items.some(function (item) { return item.action === action; })) out = 'select.' + section.id; });
    return out;
  }
  function dropOptions(t) {
    var out = [];
    detailSections(t).forEach(function (section) { if (t.drop && section.id === t.drop.id) out = section.items; });
    return out;
  }
  function messageContent(t) { return t.content || MSG[t.msg]; }
  V.message = {
    sheet: true,
    key: function (t, k) {
      var A = messageContent(t).actions, a;
      if (k === 'left') t.f.b = Math.max(0, t.f.b - 1);
      else if (k === 'right') t.f.b = Math.min(A.length - 1, t.f.b + 1);
      else if (k === 'back') pop();
      else if (k === 'ok') {
        a = A[t.f.b][0]; pop();
        if (a === 'samsung') perform('Samsung Home', FrameDevice.home);
        else if (a === 'settings') { S.settingsFocus = 'wifiqr'; openSettings(); openAppearance('wifiqr'); }
        else if (a === 'alexaout') alexaForget();
        else if (a === 'spotifyout') spotifyForget();
        else if (a === 'calendarout') calendarForget();
        else if (a === 'groupdel' && S.deleteGroup) { deleteGroup(S.deleteGroup); S.deleteGroup = null; }
      }
    },
    point: function (t, z, i) { if (z === 'act') { t.f.b = i; this.key(t, 'ok'); } }
  };
  /* ---------- Alexa: readings, switches, groups and colour buttons ---------- */
  /* Everything on Home is a target: an Alexa device id, or 'group:<id>' for a named group of lights.
     Values are read every two minutes while the TV shows Frame Home; nothing runs while hidden. */
  var alexa = { list: null, loading: false, listErr: '', err: '', vals: {}, busy: {}, failed: {}, timer: null, pair: null, phase: 'idle', url: '', detail: '', toast: '', toastTimer: null };
  var ALEXA_POLL = 2 * 60 * 1000, ALEXA_SWITCH_POLL = 5000, MAX_READINGS = 3, MAX_SWITCHES = 6, MAX_GROUPS = 12, MAX_MEMBERS = 20;
  var COLOURS = ['red', 'green', 'yellow', 'blue'], SLOTS = COLOURS.concat(['chup', 'chdown', 'guide']);
  var COLOUR_NAMES = { red: 'Red button', green: 'Green button', yellow: 'Yellow button', blue: 'Blue button', chup: 'CH +', chdown: 'CH −', guide: 'Guide' };
  /* CH+, CH− and Guide keep the TV's own function unless something is assigned to them. */
  var SLOT_KEYS = { chup: 'ChannelUp', chdown: 'ChannelDown', guide: 'Guide' }, slotRegistered = {};
  function syncSlotKeys() {
    if (!window.tizen || !tizen.tvinputdevice) return;
    Object.keys(SLOT_KEYS).forEach(function (slot) {
      var want = !!S.c.alexaKeys[slot];
      if (want === !!slotRegistered[slot]) return;
      try { if (want) tizen.tvinputdevice.registerKey(SLOT_KEYS[slot]); else tizen.tvinputdevice.unregisterKey(SLOT_KEYS[slot]); slotRegistered[slot] = want; } catch (e) { /* not on this TV */ }
    });
  }
  var NAME_CHARS = 'ABCDEFGHIJKLMNOPQRSTUVWXYZÁÉÍÓÖŐÚÜŰabcdefghijklmnopqrstuvwxyzáéíóöőúüű0123456789 -\'&+';
  function alexaOn() { return !!(FA && FA.connected()); }
  function alexaErrText(err) { return err === 'revoked' ? T('The Alexa sign-in no longer works. Sign out and connect again.') : T('Can’t reach Alexa ({0}).', err); }
  function fmtNumber(v) { var r = Math.round(v * 10) / 10; return String(r).replace('.', S.c.lang === 'hu' ? ',' : '.'); }
  function fmtReading(r) { return r.kind === 'temp' ? fmtNumber(r.value) + '°' : r.unit === '%' ? Math.round(r.value) + '%' : fmtNumber(r.value) + (r.unit ? r.unit : ''); }
  function groupOf(target) { var id = String(target).replace(/^group:/, ''), i; for (i = 0; i < S.c.alexaGroups.length; i++) if (S.c.alexaGroups[i].id === id) return S.c.alexaGroups[i]; return null; }
  function isGroup(target) { return /^group:/.test(target); }
  function targetName(t) {
    if (!t) return '';
    if (/^app:/.test(t.id)) return t.name || t.id.slice(4);
    if (SPOTIFY_ACTIONS[t.id]) return T(SPOTIFY_ACTIONS[t.id]);
    if (t.id === 'frame:home') return T('Home screen');
    if (S.c.alexaNames && S.c.alexaNames[t.id]) return S.c.alexaNames[t.id];
    if (isGroup(t.id)) { var g = groupOf(t.id); return g ? g.name : ''; }
    return t.name || '';
  }
  /* The name Alexa (or the group) gives, without the name chosen for Home. */
  function originalName(t) { var keep = S.c.alexaNames, n; S.c.alexaNames = null; n = targetName(t); S.c.alexaNames = keep; return n; }
  /* Alexa devices behind a Home switch or remote button. Spotify, apps and Frame Home's own Home screen
     are not Alexa devices: asked for as one, Alexa answered the whole read with nothing (0.38.3). */
  function targetMembers(id) { var g; if (/^(spotify|app|frame):/.test(id)) return []; if (!isGroup(id)) return [id]; g = groupOf(id); return g ? g.members.map(function (m) { return m.id; }) : []; }
  /* On when any member is on; null while nothing is known yet. */
  /* A light is on when Alexa says so; a group only when every one of its lights is on. */
  function targetPower(id) {
    var known = false, all = true;
    targetMembers(id).forEach(function (m) { var v = alexa.vals[m]; if (v && v.power !== null) { known = true; if (!v.power) all = false; } });
    return known ? all : null;
  }
  /* Six switches fit the top Dock bar; the separate widget row keeps four. */
  function maxSwitches() { return S.c.topStyle === 'bar' ? MAX_SWITCHES : 4; }
  function liveTargets() {
    var out = S.c.alexaSwitches.filter(function (t) { return !isGroup(t.id) || groupOf(t.id); });
    return out.slice(0, maxSwitches());
  }
  function alexaIds() {
    var ids = [];
    function add(id) { if (id && ids.indexOf(id) < 0) ids.push(id); }
    S.c.alexaReadings.forEach(function (r) { add(r.id); });
    S.c.alexaSwitches.forEach(function (t) { targetMembers(t.id).forEach(add); });
    SLOTS.forEach(function (c) { var t = S.c.alexaKeys[c]; if (t) targetMembers(t.id).forEach(add); });
    return ids;
  }
  /* Battery sensors often answer a read without their value (asleep, or between reports). A reading
     missing from one answer keeps its last value for up to an hour instead of vanishing from Home. */
  var KEEP_READING_MS = 60 * 60 * 1000;
  function storeVals(vals) {
    var id, now = Date.now();
    for (id in vals) if (vals.hasOwnProperty(id) && !alexa.busy[id]) (function (prev, next) {
      next.readings.forEach(function (r) { r.at = now; });
      if (prev && prev.readings) prev.readings.forEach(function (r) {
        if (!next.readings.some(function (x) { return x.key === r.key; }) && now - (r.at || 0) < KEEP_READING_MS) next.readings.push(r);
      });
      alexa.vals[id] = next;
    }(alexa.vals[id], vals[id]));
  }
  /* Schedules the next read: now (true), after ms (number) or after the regular interval. */
  function alexaPoll(when) {
    clearTimeout(alexa.timer); alexa.timer = null;
    if (!alexaOn() || document.hidden || !alexaIds().length) return;
    alexa.timer = setTimeout(function () {
      alexa.timer = null;
      var asked = alexaIds();
      alexa.asked = Date.now();
      FA.read(asked, function (err, vals) {
        alexa.answered = Date.now();
        if (err) { alexa.err = err; alexa.lastErr = err; } else { alexa.err = ''; alexa.lastOk = alexa.answered; alexa.missing = asked.filter(function (id) { return !vals[id]; }); storeVals(vals); }
        /* The next read is scheduled before drawing, so an error while drawing cannot stop the polling. */
        if (!alexa.timer) alexaPoll(err === 'revoked' ? 10 * 60 * 1000 : undefined);
        render();
      });
    }, when === true ? 0 : typeof when === 'number' ? when : liveTargets().length || legendRows().length ? ALEXA_SWITCH_POLL : ALEXA_POLL);
  }
  function showToast(text) {
    alexa.toast = text; clearTimeout(alexa.toastTimer);
    alexa.toastTimer = setTimeout(function () { alexa.toast = ''; render(); }, 3200);
    render();
  }
  /* Switches a light or a group: a fully lit group goes off; otherwise every light goes on. */
  function toggleTarget(target) {
    var id = target.id, members = targetMembers(id), missing, name = targetName(target);
    if (!alexaOn() || !members.length) { if (alexaOn() && isGroup(id)) showToast(T('{0} has no lights yet.', name)); return; }
    if (members.some(function (m) { return alexa.busy[m]; })) return;
    missing = members.filter(function (m) { return !alexa.vals[m]; });
    if (missing.length) {
      members.forEach(function (m) { alexa.busy[m] = true; });
      FA.read(missing, function (err, vals) {
        members.forEach(function (m) { delete alexa.busy[m]; });
        if (err) { alexa.failed[id] = true; if (err === 'revoked') alexa.err = err; showToast(T('{0}: couldn’t switch', name)); return; }
        storeVals(vals);
        if (members.every(function (m) { return alexa.vals[m]; })) toggleTarget(target); else { alexa.failed[id] = true; showToast(T('{0}: couldn’t switch', name)); }
      });
      return;
    }
    var devices = members.map(function (m) { return alexa.vals[m]; }).filter(function (d) { return d.power !== null; });
    var want = !targetPower(id), before = {};
    if (!devices.length) { showToast(T('{0}: couldn’t switch', name)); return; }
    devices.forEach(function (d) { before[d.id] = d.power; d.power = want; alexa.busy[d.id] = true; });
    delete alexa.failed[id];
    render();
    FA.setPower(devices, want, function (err, failedIds) {
      devices.forEach(function (d) { delete alexa.busy[d.id]; });
      if (err) {
        devices.forEach(function (d) { d.power = before[d.id]; });
        alexa.failed[id] = true; if (err === 'revoked') alexa.err = err;
        showToast(T('{0}: couldn’t switch', name));
      } else {
        (failedIds || []).forEach(function (m) { if (alexa.vals[m]) alexa.vals[m].power = before[m]; });
        showToast(name + ' · ' + T(want ? 'On' : 'Off') + (failedIds && failedIds.length ? ' · ' + T('{0} didn’t switch', failedIds.length) : ''));
      }
      alexaPoll(3000);
    });
  }
  function slotShort(slot) { return COLOURS.indexOf(slot) >= 0 ? T(slot.charAt(0).toUpperCase() + slot.slice(1)) : T(COLOUR_NAMES[slot]); }
  /* A remote button: a light or group, a Spotify action, or an app on the TV. */
  function colourKey(colour) {
    var t = S.c.alexaKeys[colour], a, appId;
    if (t) showLegend(5000);
    if (t && /^app:/.test(t.id)) {
      appId = t.id.slice(4); a = APPS.filter(function (x) { return x.appId === appId || x.id === appId; })[0];
      if (a) launch(a.id); else perform(t.name || appId, function (done) { FrameDevice.launchApp(appId, done); });
      return;
    }
    if (t && isSpotify(t.id)) { if (spotifyOn()) spotifyKey(t.id.slice(8)); return; }
    if (t && t.id === 'frame:home') { goHome(); focusStage(); return; }
    if (!t || !alexaOn() || (isGroup(t.id) && !groupOf(t.id))) { showToast(T('{0} has nothing assigned. Settings → Connections → Remote buttons.', T(COLOUR_NAMES[colour]))); return; }
    toggleTarget(t);
  }
  function switchLabel(t) {
    var p = targetPower(t.id), state = alexa.failed[t.id] ? T('couldn’t switch') : p === null ? '' : T(p ? 'On' : 'Off');
    return targetName(t) + (state ? ' · ' + state : '');
  }
  function readingsCaptionHtml() {
    if (!alexaOn()) return '';
    return S.c.alexaReadings.map(function (r) {
      var v = alexa.vals[r.id], found = null;
      if (!v) return '';
      v.readings.forEach(function (x) { if (x.key === r.key) found = x; });
      if (!found) return '';
      return '<span class="weather indoor" aria-label="' + esc(r.name + ', ' + T(found.label)) + '"><svg class="ico wx-icon" viewBox="0 0 24 24" aria-hidden="true">' + SVG[found.kind === 'humidity' ? 'drop' : 'indoor'] + '</svg>'
        + '<span class="wx-temp">' + esc(fmtReading(found)) + '</span></span>';
    }).join('');
  }
  function summary(list, empty) { return list.length ? list.join(', ') : T(empty); }
  function alexaSections() {
    if (!alexaOn()) return [{ id: 'alexa-account', title: T('Account'), items: [{ action: 'alexa.connect', label: T('Connect Alexa'), description: T('Sign in on your phone') }],
      reason: T('Unofficial: Frame Home talks to Alexa the way the Alexa app does.') }];
    return [
      { id: 'alexa-home', title: T('On Home'), items: [
        { action: 'alexa.list.readings', label: T('Readings'), description: summary(S.c.alexaReadings.map(function (r) { return r.name + ' (' + T(r.label) + ')'; }), 'Beside the clock') },
        { action: 'alexa.list.switches', label: T('Switches'), description: summary(liveTargets().map(targetName), 'Beside Wi‑Fi') },
        { action: 'alexa.list.icons', label: T('Switch names and icons'), description: summary(liveTargets().map(function (x) { return targetName(x) + ': ' + T(SWITCH_ICON_NAMES[switchIcon(x.id)]); }), 'Choose switches first') }] },
      { id: 'alexa-remote', title: T('Groups'), items: [
        { action: 'alexa.list.groups', label: T('Groups'), description: S.c.alexaGroups.length ? summary(S.c.alexaGroups.map(function (g) { return g.name; }), '') : T('Switch several lights together') }] },
      { id: 'alexa-account', title: T('Account'), items: [
        { action: 'alexa.list.details', label: T('Device details'), description: T('What Alexa reports for each device') },
        { action: 'alexa.signout', label: T('Sign out of Alexa'), description: T('Frame Home forgets the sign-in') }],
        reason: alexa.err ? alexaErrText(alexa.err) : '' }
    ];
  }
  /* ---------- Spotify: now playing and the remote's media keys ---------- */
  var spot = { now: null, err: '', timer: null, busy: false, pair: null, phase: 'idle', url: '', detail: '' };
  var SPOTIFY_ACTIONS = { 'spotify:toggle': 'Spotify: play or pause', 'spotify:next': 'Spotify: next track', 'spotify:prev': 'Spotify: previous track' };
  var MEDIA = { playpause: 'toggle', play: 'play', pause: 'pause', ffwd: 'next', rew: 'prev', tracknext: 'next', trackprev: 'prev' };
  function spotifyOn() { return !!(FS && FS.connected()); }
  function isSpotify(id) { return /^spotify:/.test(id); }
  function spotifyErrText(err) {
    return err === 'premium' ? T('Spotify Premium is needed to control playback.') : err === 'no device' ? T('Nothing is playing on Spotify. Start it on a device first.')
      : err === 'revoked' ? T('The Spotify sign-in no longer works. Connect again in Settings.') : T('Spotify didn’t answer ({0}).', err);
  }
  /* Every 10 seconds while music plays, every 30 while paused or idle; nothing while hidden. */
  function spotifyPoll(when) {
    clearTimeout(spot.timer); spot.timer = null;
    if (!spotifyOn() || document.hidden || S.c.spotifyShow === 'off') return;
    spot.timer = setTimeout(function () {
      spot.timer = null;
      FS.nowPlaying(function (err, now) {
        if (err) spot.err = err; else { spot.err = ''; volumeSeen(now); spot.now = now; }
        if (!spot.timer) spotifyPoll(err === 'revoked' ? 10 * 60 * 1000 : err ? 60000 : now && now.playing ? 10000 : 30000);
        render();
      });
    }, when === true ? 0 : typeof when === 'number' ? when : 30000);
  }
  function spotifyKey(action) {
    var act;
    if (!spotifyOn() || spot.busy) return;
    if (action === 'toggle' && !spot.now) {
      spot.busy = true;
      FS.nowPlaying(function (err, now) {
        spot.busy = false;
        if (err) { showToast(spotifyErrText(err)); return; }
        spot.now = now;
        if (!now) { showToast(spotifyErrText('no device')); return; }
        spotifyKey('toggle');
      });
      return;
    }
    act = action === 'toggle' ? (spot.now.playing ? 'pause' : 'play') : action;
    spot.busy = true;
    if (spot.now && (act === 'play' || act === 'pause')) { spot.now.playing = act === 'play'; render(); }
    FS.control(act, function (err) {
      spot.busy = false;
      if (err) { if (spot.now && (act === 'play' || act === 'pause')) spot.now.playing = act !== 'play'; showToast(spotifyErrText(err)); }
      else showToast(T({ play: 'Playing', pause: 'Paused', next: 'Next track', prev: 'Previous track' }[act]));
      spotifyPoll(act === 'next' || act === 'prev' ? 800 : 1500);
    });
  }
  function musicVisible() { return !!(spotifyOn() && S.c.spotifyShow !== 'off' && spot.now && spot.now.title); }
  function musicPos(n) { var p = n.progress + (n.playing ? Date.now() - n.at : 0); return Math.max(0, Math.min(n.duration || p, p)); }
  function fmtTime(ms) { var sec = Math.floor(ms / 1000), m = Math.floor(sec / 60); return m + ':' + (sec % 60 < 10 ? '0' : '') + sec % 60; }
  function progressHtml(n) {
    if (!n.duration) return '';
    return '<span class="music-progress"><span class="music-time" data-music-pos></span><span class="music-bar"><i data-music-bar></i></span><span class="music-time">' + fmtTime(n.duration) + '</span></span>';
  }
  function paintProgress() {
    var n = spot.now, pos, i, els, w;
    if (!n || !n.duration) return;
    pos = seek.at !== null && top().id === 'nowplaying' ? seek.at : musicPos(n); w = (pos / n.duration * 100).toFixed(2) + '%';
    els = document.querySelectorAll('[data-music-pos]');
    for (i = 0; i < els.length; i++) if (els[i].textContent !== fmtTime(pos)) els[i].textContent = fmtTime(pos);
    els = document.querySelectorAll('[data-music-bar]');
    for (i = 0; i < els.length; i++) els[i].style.width = w;
  }
  /* Text that does not fit runs like a news ticker: after a second it moves left at a steady pace, out of
     the box and back in from the right, followed by a copy of itself so the loop never jumps. The speed is
     in font sizes per second, so large and small text read alike. The edges fade (a mask on the small text
     box only); while the text still waits at its start only the right edge fades, so the first letter is
     not dimmed. The copy is added only while the text moves, so textContent is the plain text otherwise. */
  var MQ_SPEED = 1.8, MQ_WAIT = 1200;
  function marquee(root) {
    var els = root ? root.querySelectorAll('.mq') : [], i, box, inner, text, copy, over, key, fs, gap;
    for (i = 0; i < els.length; i++) {
      box = els[i]; inner = box.firstChild; text = inner && inner.firstChild;
      if (!text || text.nodeType !== 1) continue;
      over = text.offsetWidth - box.clientWidth;
      if (over > 2) {
        key = text.offsetWidth + '|' + box.clientWidth;
        if (box._key === key) continue;
        box._key = key;
        fs = parseFloat(window.getComputedStyle(box).fontSize) || 30; gap = Math.round(fs * 2.5);
        copy = inner.childNodes[1];
        if (!copy) { copy = document.createElement('span'); copy.className = 'mq-t mq-copy'; copy.setAttribute('aria-hidden', 'true'); copy.textContent = text.textContent; inner.appendChild(copy); }
        copy.style.paddingLeft = gap + 'px';
        inner.style.setProperty('--mq-shift', -(text.offsetWidth + gap) + 'px');
        inner.style.animationDuration = ((text.offsetWidth + gap) / (fs * MQ_SPEED)).toFixed(2) + 's';
        box.className = 'mq is-moving';
        clearTimeout(box._t);
        box._t = setTimeout((function (b) { return function () { if (b.className === 'mq is-moving') b.className = 'mq is-moving is-run'; }; }(box)), MQ_WAIT);
      } else if (box._key) {
        box._key = ''; clearTimeout(box._t); box.className = 'mq';
        if (inner.childNodes[1]) inner.removeChild(inner.childNodes[1]);
      }
    }
  }
  /* Alone in the corner the song shares the top row with the Home controls, so it stops 40 px short of
     them; under the clock it may use up to 760 px. Then long titles scroll. */
  var MUSIC_W = 570;
  /* The song sits in the top row when the clock is centred, and always in the top Dock bar. */
  function musicOnTop() { return S.c.clockPos !== 'corner' || S.c.topStyle === 'bar'; }
  function fitMusic(inCorner) {
    var box = stage.querySelector('.cap-music'), first = utilsEl.querySelector('.u'), sr, scale, limit = MUSIC_W;
    if (!box) return;
    if (inCorner && first) {
      sr = sceneEl.getBoundingClientRect(); scale = sr.width / 1920 || 1;
      limit = Math.max(320, Math.min(MUSIC_W, Math.floor((first.getBoundingClientRect().left - sr.left) / scale) - (S.c.topStyle === 'bar' ? 14 : 112) - 40));
    }
    /* Always the same width, whatever the title, so the progress bar keeps its length. */
    if (box._limit !== limit) { box._limit = limit; box.style.width = limit + 'px'; box.style.maxWidth = limit + 'px'; }
    paintProgress(); marquee(box);
  }
  function mq(text) { return '<span class="mq"><span class="mq-in"><span class="mq-t">' + esc(text) + '</span></span></span>'; }
  /* The Home widget: OK on it opens the large Now playing screen. */
  function musicHtml(focus) {
    var n = spot.now;
    if (!musicVisible()) return '';
    return '<span class="cap-music' + (n.playing ? ' is-playing' : ' is-paused') + (n.duration ? ' has-progress' : '') + (focus ? ' is-focus' : '') + '" data-z="music" data-i="0" data-action="home.music" role="button" aria-label="' + esc(T(n.playing ? 'Playing' : 'Paused') + ': ' + n.title + (n.artist ? ', ' + n.artist : '')) + '">'
      + (n.art ? '<img class="music-art" src="' + esc(n.art) + '" alt="">' : '<span class="music-art music-art-empty">' + icon('note') + '</span>')
      + '<span class="music-text"><span class="music-title">' + (n.playing ? '' : icon('pause', 'music-paused')) + mq(n.title) + '</span>' + (n.artist ? '<span class="music-artist">' + mq(n.artist) + '</span>' : '') + progressHtml(n) + '</span></span>';
  }
  /* Progress moves every second without a full render; a finished song asks Spotify for the next one. */
  var musicTicker = setInterval(function () {
    var n = spot.now;
    if (!n || !n.playing || !n.duration || document.hidden) return;
    paintProgress();
    if (musicPos(n) >= n.duration && !n.ended) { n.ended = true; spotifyPoll(1500); }
  }, 1000);
  function openNowPlaying() { seek.at = null; push({ id: 'nowplaying', lyrics: false, f: { b: 1, row: 'controls' } }); spotifyPoll(true); }
  /* Lyrics: fetched once per song while the Lyrics view is open; synced lines follow the music. */
  var lyr = { key: '', state: 'idle', data: null, err: '', line: -1 };
  function lyricKey(n) { return n ? n.id || n.title + '|' + n.mainArtist : ''; }
  function loadLyrics() {
    var n = spot.now, key = lyricKey(n);
    if (!n || key === lyr.key) return;
    lyr.key = key; lyr.state = 'loading'; lyr.data = null; lyr.err = ''; lyr.line = -1;
    FS.lyrics(n, function (err, data) {
      if (lyr.key !== key) return;
      lyr.state = err ? (err === 'none' ? 'none' : 'error') : 'ready'; lyr.err = err || ''; lyr.data = data || null;
      render();
    });
  }
  function lyricIndex(n) {
    var lines = lyr.data && lyr.data.synced, pos = musicPos(n), i, at = -1;
    if (!lines || !lines.length) return -1;
    for (i = 0; i < lines.length; i++) { if (lines[i].t <= pos + 250) at = i; else break; }
    return at;
  }
  /* No mask for the fade: on the TV a mask lets the video plane show through, so lines fade by
     their distance from the current one instead. */
  function lyricClass(i, at) { var d = Math.abs(i - at); return 'lyric' + (i === at ? ' is-now' : d === 1 ? ' is-near' : d === 2 ? ' is-mid' : d <= 4 ? ' is-far' : ' is-gone'); }
  function lyricsHtml(n) {
    var lines, at;
    if (!n) return '';
    if (lyr.state === 'loading' || lyr.key !== lyricKey(n)) return '<p class="lyrics-note">' + esc(T('Loading lyrics…')) + '</p>';
    if (lyr.state === 'none') return '<p class="lyrics-note">' + esc(T('No lyrics found for this song.')) + '</p>';
    if (lyr.state === 'error') return '<p class="lyrics-note">' + esc(T('Couldn’t load lyrics ({0}).', lyr.err)) + '</p>';
    if (lyr.data.instrumental) return '<p class="lyrics-note">' + esc(T('Instrumental')) + '</p>';
    lines = lyr.data.synced;
    if (lines.length) {
      at = lyricIndex(n);
      return '<div class="lyrics-track" data-lyrics-track>' + lines.map(function (l, i) {
        return '<p class="' + lyricClass(i, at) + '" data-lyric="' + i + '">' + (esc(l.text) || '♪') + '</p>';
      }).join('') + '</div>';
    }
    return '<div class="lyrics-track is-plain" data-lyrics-plain>' + lyr.data.plain.split(/\r?\n/).map(function (l) { return '<p class="lyric">' + (esc(l) || '&nbsp;') + '</p>'; }).join('') + '</div><p class="lyrics-source">' + esc(T('Not synced to the music')) + '</p>';
  }
  /* Keeps the current line in the middle of the panel; plain lyrics scroll with the song's progress. */
  function placeLyrics() {
    var panel = stage.querySelector('.np-lyrics'), track, n = spot.now, at, el, i, els, frac;
    if (!panel || !n || !panel.firstChild) return;
    track = panel.querySelector('[data-lyrics-track]');
    if (track) {
      at = lyricIndex(n);
      if (at !== lyr.line) {
        els = track.querySelectorAll('[data-lyric]');
        for (i = 0; i < els.length; i++) els[i].className = lyricClass(i, at);
        lyr.line = at;
        el = at >= 0 ? els[at] : null;
        /* A freshly built track jumps straight to its place; only line changes glide. */
        if (lyr.snap) { track.style.transition = 'none'; for (i = 0; i < els.length; i++) els[i].style.transition = 'none'; }
        track.style.transform = 'translate3d(0,' + Math.round(panel.clientHeight / 2 - (el ? el.offsetTop + el.offsetHeight / 2 : 0)) + 'px,0)';
        if (lyr.snap) { track.offsetHeight; track.style.transition = ''; for (i = 0; i < els.length; i++) els[i].style.transition = ''; lyr.snap = false; }
      }
      return;
    }
    track = panel.querySelector('[data-lyrics-plain]');
    if (track && n.duration) { frac = Math.min(1, musicPos(n) / n.duration); track.style.transform = 'translate3d(0,' + Math.round(-Math.max(0, track.offsetHeight - panel.clientHeight + 80) * frac) + 'px,0)'; }
  }
  setInterval(function () { if (!document.hidden && top().id === 'nowplaying' && top().lyrics) placeLyrics(); }, 250);

  /* Not a sheet: like the Wi‑Fi QR code it fades in over Home on the pre-blurred panel image,
     and fades out again on Back, so opening and closing move instead of cutting. */
  /* Song facts (assets/songfacts.js): looked up once per song while the large Now playing screen shows
     without lyrics; the year joins the album line and one Wikipedia sentence sits above the progress bar. */
  var FF = window.FrameSongFacts || null, facts = { key: '', info: null };
  function songFacts(n) {
    if (!FF || !n || n.episode || !n.title) return null;
    var key = n.id || n.title + '|' + n.mainArtist;
    if (facts.key !== key) {
      facts.key = key; facts.info = null;
      FF.lookup({ id: key, title: n.title, artist: n.mainArtist }, function (info) { if (facts.key === key) { facts.info = info; render(); } });
    }
    return facts.info;
  }
  /* Two lines at most; one, or none, if more would push the buttons off the cover. */
  function fitFact(el, focus) {
    var copy = el && el.parentNode, row = copy && copy.querySelector('.np-ctl-row'), base = 'np-fact' + (focus ? ' is-focus' : '');
    if (!row) return;
    /* Layout boxes, not scrollHeight: a focused button is scaled up and would always count as overflow.
       The fact's own focus ring is a box-shadow, so it does not change the layout either. */
    function fits() { return row.getBoundingClientRect().bottom <= copy.getBoundingClientRect().bottom + 1; }
    el.className = base;
    if (!el.textContent || fits()) return;
    el.className = base + ' is-one';
    if (!fits()) el.className = 'np-fact is-hidden';
  }
  /* Fade the Now playing layout out, switch lyrics on or off, fade it back in. */
  function toggleLyrics(t) {
    if (t.switching) return;
    t.switching = true;
    setTimeout(function () { t.lyrics = !t.lyrics; if (t.lyrics) loadLyrics(); t.switching = false; render(); }, 200);
  }
  /* Liked Songs: the heart after the volume pill is white when the song is not in your Liked Songs and
     green when it is, wherever it was added; OK adds or removes it. Checked when the song changes and
     again every 30 seconds while the big screen shows, so a like from the phone turns it green too. */
  var likes = { id: '', on: null, at: 0, asking: false, busy: false, scope: true };
  function likeAvailable(n) { return !!(FS && FS.saved && spotifyOn() && n && !n.episode && /^[A-Za-z0-9]{22}$/.test(n.id || '')); }
  function likeState(n) {
    if (!likeAvailable(n) || likes.asking || likes.busy) return;
    if (likes.id === n.id && Date.now() - likes.at < 30000) return;
    var id = n.id;
    if (likes.id !== id) likes.on = null;
    likes.id = id; likes.at = Date.now(); likes.asking = true;
    FS.saved(id, function (err, on) {
      likes.asking = false;
      if (likes.id !== id) return;
      if (err === 'scope') likes.scope = false; else if (!err) { likes.on = on; likes.scope = true; }
      render();
    });
  }
  var LIKE_SCOPE_TEXT = 'To save songs, Frame Home needs one more Spotify permission. Sign out of Spotify in Settings and connect again.';
  function toggleLike(n) {
    if (!likeAvailable(n) || likes.busy || likes.id !== n.id) return;
    if (!likes.scope) { showToast(T(LIKE_SCOPE_TEXT)); return; }
    var id = n.id, want = !likes.on;
    likes.busy = true; likes.on = want; render();
    FS.save(id, want, function (err) {
      likes.busy = false;
      if (likes.id !== id) return;
      if (err) { likes.on = !want; if (err === 'scope') likes.scope = false; showToast(err === 'scope' ? T(LIKE_SCOPE_TEXT) : spotifyErrText(err)); }
      else { likes.at = Date.now(); showToast(T(want ? 'Added to Liked Songs' : 'Removed from Liked Songs')); }
      render();
    });
  }
  /* What Up reaches from the button rows (without lyrics): the progress bar, else the fact, else the device. */
  function npAbove(t, n) { return n && n.duration ? 'bar' : t.factOk && !t.lyrics ? 'fact' : 'device'; }
  V.nowplaying = {
    sheet: false,
    norm: function (t) {
      var n = spot.now;
      if (t.f.row === 'volume' && !volumeAvailable(n)) t.f.row = 'controls';
      if (t.f.row === 'like' && !likeAvailable(n)) t.f.row = 'controls';
      if (t.f.row === 'fact' && (t.lyrics || !t.factOk)) { t.f.row = npAbove(t, n) === 'fact' ? 'device' : npAbove(t, n); t.fact = false; }
    },
    key: function (t, k) {
      var n = spot.now, vol = volumeAvailable(n), like = likeAvailable(n);
      if (t.dev) { deviceKey(t, k); return; }
      if (t.fact) {
        /* The fact's panel: Back or OK closes it. */
        if (k === 'back' || k === 'ok') t.fact = false;
        return;
      }
      if (t.f.row === 'device') {
        /* "Playing on …": OK lists your Spotify devices to move the music to. */
        if (k === 'back') pop();
        else if (k === 'down') t.f.row = t.factOk && !t.lyrics ? 'fact' : n && n.duration ? 'bar' : 'controls';
        else if (k === 'ok') openDevices(t);
        return;
      }
      if (t.f.row === 'fact') {
        /* The Wikipedia fact: OK opens it whole, with the sentences after it. */
        if (k === 'back') pop();
        else if (k === 'up') t.f.row = 'device';
        else if (k === 'down') t.f.row = n && n.duration ? 'bar' : 'controls';
        else if (k === 'ok') t.fact = true;
        return;
      }
      if (t.f.row === 'bar') {
        /* The progress bar: Left/Right move 10 seconds, the song jumps there once you stop. */
        if (k === 'back') { seek.at = null; pop(); }
        else if (k === 'up') t.f.row = t.factOk && !t.lyrics ? 'fact' : 'device';
        else if (k === 'down' || !n || !n.duration) { t.f.row = 'controls'; if (t.lyrics && t.f.b === 3) t.f.b = typeof t.f.top === 'number' ? t.f.top : 1; }
        else if (k === 'left' || k === 'right') seekBy(n, k === 'left' ? -10000 : 10000);
        else if (k === 'ok') commitSeek();
        return;
      }
      if (t.f.row === 'volume' || t.f.row === 'like') {
        /* The volume pill and the heart follow Lyrics: in the button row without lyrics, in the row under
           the buttons with lyrics. − and + are buttons like the others; OK steps 5 %. */
        if (k === 'back') pop();
        else if (k === 'up') { if (t.lyrics) { t.f.row = 'controls'; t.f.b = typeof t.f.top === 'number' ? t.f.top : 1; } else t.f.row = npAbove(t, n); }
        else if (t.f.row === 'like') {
          if (k === 'ok') toggleLike(n);
          else if (k === 'left' && vol) { t.f.row = 'volume'; t.f.v = 1; }
          else if (k === 'left') { t.f.row = 'controls'; t.f.b = 3; }
        }
        else if (k === 'ok') setVolume((n && typeof n.volume === 'number' ? n.volume : 0) + (t.f.v ? 5 : -5));
        else if (k === 'right' && !t.f.v) t.f.v = 1;
        else if (k === 'right' && like) t.f.row = 'like';
        else if (k === 'left' && t.f.v) t.f.v = 0;
        else if (k === 'left') { t.f.row = 'controls'; t.f.b = 3; }
        return;
      }
      if (t.lyrics) {
        /* With lyrics open the buttons are two centred rows: previous, play/pause, next above;
           Lyrics, the volume and the heart below. Up and Down move between the rows. */
        if (k === 'back') pop();
        else if (t.f.b < 3) {
          if (k === 'up') t.f.row = n && n.duration ? 'bar' : 'device';
          else if (k === 'left' && t.f.b > 0) t.f.b--;
          else if (k === 'right' && t.f.b < 2) t.f.b++;
          else if (k === 'down') { t.f.top = t.f.b; t.f.b = 3; }
          else if (k === 'ok') spotifyKey(['prev', 'toggle', 'next'][t.f.b]);
        } else {
          if (k === 'up') t.f.b = typeof t.f.top === 'number' ? t.f.top : 1;
          else if (k === 'right' && vol) { t.f.row = 'volume'; t.f.v = 0; }
          else if (k === 'right' && like) t.f.row = 'like';
          else if (k === 'ok') toggleLyrics(t);
        }
        return;
      }
      if (k === 'back') pop();
      else if (k === 'up') t.f.row = npAbove(t, n);
      else if (k === 'left' && t.f.b > 0) t.f.b--;
      else if (k === 'right' && t.f.b < 3) t.f.b++;
      else if (k === 'right' && vol) { t.f.row = 'volume'; t.f.v = 0; }
      else if (k === 'right' && like) t.f.row = 'like';
      else if (k === 'ok' && t.f.b === 3) toggleLyrics(t);
      else if (k === 'ok') spotifyKey(['prev', 'toggle', 'next'][t.f.b]);
    },
    point: function (t, z, i) {
      if (z === 'npdevrow' && t.dev) { t.dev.i = i; deviceKey(t, 'ok'); }
      else if (t.dev) return;
      else if (t.fact) t.fact = false;
      else if (z === 'np') { t.f.row = 'controls'; t.f.b = i; this.key(t, 'ok'); } else if (z === 'npbar') t.f.row = 'bar';
      else if (z === 'npvol') { t.f.row = 'volume'; t.f.v = i ? 1 : 0; this.key(t, 'ok'); }
      else if (z === 'nplike') { t.f.row = 'like'; this.key(t, 'ok'); }
      else if (z === 'npfact' && t.factOk) { t.f.row = 'fact'; t.fact = true; }
      else if (z === 'npdev') { t.f.row = 'device'; openDevices(t); }
    }
  };
  /* Spotify Connect devices: a list over Now playing. Only devices that are on and signed in to
     Spotify appear; OK moves the music there and keeps it playing (or paused). */
  function openDevices(t) {
    if (!spotifyOn()) return;
    t.dev = { list: null, err: '', i: 0, top: 0, busy: '' };
    render();
    FS.devices(function (err, list) {
      if (top() !== t || !t.dev) return;
      t.dev.err = err || ''; t.dev.list = list || [];
      t.dev.i = Math.max(0, t.dev.list.map(function (d) { return d.active; }).indexOf(true));
      render();
    });
  }
  function deviceKey(t, k) {
    var d = t.dev, list = d.list || [], dev = list[d.i], play;
    if (k === 'back') { t.dev = null; return; }
    if (d.busy) return;
    if (k === 'up' && d.i > 0) d.i--;
    else if (k === 'down' && d.i < list.length - 1) d.i++;
    else if (k === 'ok' && d.err) openDevices(t);
    else if (k === 'ok' && dev) {
      if (dev.active) { t.dev = null; return; }
      if (dev.restricted) { showToast(T('Spotify doesn’t let apps control {0}.', dev.name)); return; }
      d.busy = dev.id; play = spot.now ? spot.now.playing : true;
      FS.transfer(dev.id, play, function (err) {
        if (top() === t) t.dev = null;
        if (err) showToast(spotifyErrText(err));
        else { showToast(T('Playing on {0}', dev.name)); if (spot.now) { spot.now.device = dev.name; spot.now.deviceId = dev.id; } }
        render(); spotifyPoll(1500);
      });
    }
  }
  function deviceIcon(type) { type = String(type).toLowerCase(); return icon(type === 'smartphone' || type === 'tablet' ? 'phone' : type === 'computer' ? 'computer' : type === 'tv' || type === 'castvideo' || type === 'stb' || type === 'gameconsole' ? 'tv' : 'speaker'); }
  /* When the devices arrive the panel grows from the loading frame to the list's height and the rows
     fade in one after another; later renders (focus moves) neither animate nor resize. */
  function growDevices(box, t) {
    var d = t.dev, from = box.className.indexOf('is-open') >= 0 ? box.offsetHeight : 0, arrived = d && d.list && !d.shown, to;
    /* While the rows are fading in, later renders wait, so a key press or a poll cannot restart them. */
    if (d && box._entering && !arrived) { box._pending = true; return; }
    if (arrived) { d.shown = true; d.enter = !REDUCED_MOTION; }
    box.className = 'np-devices' + (d ? ' is-open' : '');
    setHTML(box, devicesHtml(t));
    if (d) d.enter = false;
    if (!arrived || REDUCED_MOTION) return;
    box._entering = true; clearTimeout(box._grow);
    box._grow = setTimeout(function () { box._entering = false; if (box._pending) { box._pending = false; render(); } }, 460);
    /* The card behind the list grows with a transform only (no layout per frame on the TV). */
    to = box.offsetHeight;
    if (!from || to - from < 2) return;
    box.style.setProperty('--grow', (from / to).toFixed(4));
    box.className += ' grow-start'; box.offsetHeight;
    box.className = box.className.replace(/\s*grow-start/g, '');
  }
  /* At most DEV_VISIBLE rows show at once; the window follows the focus, with cues above and below. */
  var DEV_VISIBLE = 7;
  function devicesHtml(t) {
    var d = t.dev, rows, n, from, to;
    var head = '<h3 class="np-dev-title">' + esc(T('Play on')) + '</h3>';
    if (!d) return '';
    if (!d.list) return head + '<p class="np-dev-note is-wait">' + esc(T('Looking for your Spotify devices…')) + '</p>';
    if (d.err) return head + '<p class="np-dev-note">' + esc(spotifyErrText(d.err)) + '</p><p class="np-dev-hint">' + esc(T('OK tries again.')) + '</p>';
    if (!d.list.length) return head + '<p class="np-dev-note">' + esc(T('No Spotify devices are on right now. Open Spotify on the device you want, then try again.')) + '</p>';
    n = d.list.length;
    if (d.i < d.top) d.top = d.i;
    if (d.i > d.top + DEV_VISIBLE - 1) d.top = d.i - DEV_VISIBLE + 1;
    d.top = clamp(d.top, 0, Math.max(0, n - DEV_VISIBLE));
    from = d.top; to = Math.min(n, from + DEV_VISIBLE);
    rows = d.list.slice(from, to).map(function (v, k) {
      var i = from + k, entering = d.enter;
      return '<button type="button" tabindex="-1" class="np-dev-row' + (entering ? ' is-entering' : '') + (i === d.i ? ' is-focus' : '') + (v.active ? ' is-active' : '') + (v.restricted ? ' is-restricted' : '') + (d.busy === v.id ? ' is-busy' : '') + '"' + (entering ? ' style="animation-delay:' + (60 + k * 25) + 'ms"' : '') + ' data-z="npdevrow" data-i="' + i + '">'
        + deviceIcon(v.type) + '<span class="np-dev-name">' + esc(v.name) + (v.restricted ? '<small>' + esc(T('Can’t be controlled here')) + '</small>' : '') + '</span>'
        + (v.active ? icon('check', 'np-dev-tick') : d.busy === v.id ? '<span class="np-dev-wait">…</span>' : '') + '</button>';
    }).join('');
    return '<h3 class="np-dev-title">' + esc(T('Play on')) + (n > DEV_VISIBLE ? '<span class="np-dev-count">' + (d.i + 1) + ' / ' + n + '</span>' : '') + '</h3>'
      + '<div class="np-dev-cue' + (from > 0 ? ' is-on' : '') + '" aria-hidden="true">' + icon('up') + '</div>'
      + '<div class="np-dev-list">' + rows + '</div>'
      + '<div class="np-dev-cue' + (to < n ? ' is-on' : '') + '" aria-hidden="true">' + icon('down') + '</div>';
  }
  var seek = { at: null, timer: null };
  function seekBy(n, delta) {
    var from = seek.at !== null ? seek.at : musicPos(n);
    seek.at = Math.max(0, Math.min(n.duration - 1000, from + delta));
    clearTimeout(seek.timer); seek.timer = setTimeout(commitSeek, 700);
    paintProgress();
  }
  function commitSeek() {
    var n = spot.now, to = seek.at;
    clearTimeout(seek.timer); seek.timer = null;
    if (to === null || !n) return;
    FS.control('seek', function (err) {
      seek.at = null;
      if (err) showToast(spotifyErrText(err));
      else { n.progress = to; n.at = Date.now(); n.ended = false; lyr.line = -2; lyr.snap = true; }
      render(); spotifyPoll(1200);
    }, to);
  }
  /* Volume of the device the music plays on, set with the − and + of the volume pill. The change shows
     at once and the PUT is sent shortly after, so repeated presses do not flood the API. */
  var volState = { v: null, timer: null, want: null, dev: '' };
  function volumeAvailable(n) { return !!(n && n.supportsVolume && typeof n.volume === 'number'); }
  function setVolume(v) {
    var n = spot.now; if (!n) return;
    volState.v = Math.max(0, Math.min(100, Math.round(v)));
    n.volume = volState.v;
    volState.want = null;
    clearTimeout(volState.timer); volState.timer = setTimeout(commitVolume, 350);
    render();
  }
  function commitVolume() {
    var to = volState.v; clearTimeout(volState.timer); volState.timer = null;
    if (to === null) return;
    FS.control('volume', function (err) {
      volState.v = null;
      if (err) { volState.want = null; showToast(spotifyErrText(err)); } else { volState.want = to; volState.dev = spot.now && spot.now.deviceId || ''; }
      render(); spotifyPoll(1200);
    }, to);
  }
  /* Speakers report back a volume near, not at, the one that was set: an Echo set to 42 % answers 38, then
     41, while it plays at the new level. Showing each report made the presses look miscounted, so after a
     change the pill keeps the value you chose as long as Spotify's reports stay within 8 % of it on the
     same device. A report further off means the volume was changed elsewhere (the phone, Alexa by voice),
     and from then on the pill shows Spotify's value again. */
  var VOLUME_SLACK = 8;
  function volumeSeen(now) {
    if (!now) { volState.want = null; return; }
    if (volState.v !== null) { now.volume = volState.v; return; }
    if (volState.want === null || typeof now.volume !== 'number') return;
    if ((now.deviceId || '') !== volState.dev || Math.abs(now.volume - volState.want) > VOLUME_SLACK) volState.want = null;
    else now.volume = volState.want;
  }
  /* Colour-button legend: bottom left, beside where the remote's colour picker appears. */
  /* The remote's on-screen colour picker does not reach the app (checked with the remote test), so the
     legend shows with the top row, always, or never; a colour key also shows it for four seconds. */
  var legend = { until: 0, timer: null };
  /* onOpen: Home opened or came back; 'pressed' shows the legend only after a button. */
  function showLegend(ms, onOpen) { if (onOpen && S.c.keyHints === 'pressed') return; legend.until = Date.now() + ms; clearTimeout(legend.timer); legend.timer = setTimeout(render, ms + 50); render(); }
  function keyBadge(slot) { return COLOURS.indexOf(slot) >= 0 ? '<span class="key-dot key-' + slot + '"></span>' : '<span class="key-text">' + esc({ chup: 'CH+', chdown: 'CH−', guide: 'GUIDE' }[slot]) + '</span>'; }
  /* The remote's on-screen colour picker does not reach the app, so the legend is a row of chips above
     the Dock, near where the eye already is: for a few seconds when Home opens and after a button, or
     always. Only assigned buttons appear. */
  function legendRows() {
    return SLOTS.filter(function (c) { var t = S.c.alexaKeys[c]; return t && (/^app:/.test(t.id) || (isSpotify(t.id) ? spotifyOn() : alexaOn() && targetName(t))); });
  }
  function legendOn() { return S.c.keyHints === 'always' || (S.c.keyHints === 'auto' || S.c.keyHints === 'pressed') && Date.now() < legend.until; }
  function keyLegendHtml() {
    if (S.c.keyHints === 'off') return '';
    return legendRows().map(function (c) {
      var t = S.c.alexaKeys[c], p = /^(spotify|app):/.test(t.id) ? null : targetPower(t.id);
      return '<span class="legend-chip' + (p ? ' is-on' : '') + '">' + keyBadge(c) + '<span class="legend-name">' + esc(targetName(t)) + '</span></span>';
    }).join('');
  }
  function spotifySections() {
    if (!spotifyOn()) return [{ id: 'spotify-account', title: T('Account'), items: [{ action: 'spotify.connect', label: T('Connect Spotify'), description: T('Sign in on your phone') }],
      reason: T('Shows what is playing on any of your Spotify devices. Play/Pause on the remote controls it (Spotify Premium).') }];
    return [
      { id: 'spotifyShow', title: T('Now playing on Home'), horizontal: true, items: [choice('spotifyShow', 'on'), choice('spotifyShow', 'off')],
        reason: T('Play/Pause plays or pauses. Fast-forward and Rewind skip tracks, where the remote has them. More buttons: Connections → Remote buttons.') },
      { id: 'spotify-account', title: T('Account'), items: [{ action: 'spotify.signout', label: T('Sign out of Spotify'), description: T('Frame Home forgets the sign-in') }],
        reason: spot.err && spot.err !== 'no device' ? spotifyErrText(spot.err) : '' }
    ];
  }
  function connectionsSections() {
    return [{ id: 'connections', title: '', items: [].concat(FA ? [{ action: 'conn.alexa', label: 'Alexa', description: !alexaOn() ? T('Not connected') : summary(S.c.alexaReadings.map(function (r) { return r.name; }).concat(liveTargets().map(targetName)).filter(function (n, i, a) { return n && a.indexOf(n) === i; }), 'Connected') }] : [])
      .concat(FS ? [{ action: 'conn.spotify', label: 'Spotify', description: !spotifyOn() ? T('Not connected') : spot.now ? spot.now.title + (spot.now.artist ? ' · ' + spot.now.artist : '') : T('Connected') }] : [])
      .concat(FC ? [{ action: 'conn.calendar', label: T('Calendar'), description: !FC.connected() ? T('Not connected') : summary(FC.list().map(function (c) { return c.name || T('Calendar {0}', c.index + 1); }), 'Connected') }] : [])
      .concat([{ action: 'alexa.list.keys', label: T('Remote buttons'), description: summary(SLOTS.filter(function (c) { return S.c.alexaKeys[c]; }).map(function (c) { return slotShort(c) + ': ' + targetName(S.c.alexaKeys[c]); }), 'Colour buttons, CH +, CH −, Guide') }]) }];
  }
  function connectionsSummary() { var on = []; if (alexaOn()) on.push('Alexa'); if (spotifyOn()) on.push('Spotify'); if (FC && FC.connected()) on.push(T('Calendar')); return on.length ? on.join(', ') : T('Not connected'); }
  function spotifyForget() {
    var keys = {};
    FS.forget(); clearTimeout(spot.timer); spot.timer = null; spot.now = null; spot.err = '';
    SLOTS.forEach(function (c) { keys[c] = S.c.alexaKeys[c] && isSpotify(S.c.alexaKeys[c].id) ? null : S.c.alexaKeys[c]; });
    savePrefs({ alexaKeys: keys }, 'Spotify sign-out');
  }

  /* ---------- Phone sign-in screen, shared by Alexa and Spotify ---------- */
  function pairInfo(svc) {
    if (svc === 'calendar') return { st: cal, page: CAL_PAGE, title: 'Connect a calendar',
      steps: ['Scan the code with your phone.', 'Copy your calendar’s secret iCal address; the page shows where to find it in Google Calendar and Outlook.', 'Paste it on the page and send it.'],
      note: 'Your phone encrypts the address with a key from this QR code before it passes through ntfy.sh, so only this TV can read it. Frame Home only reads the calendar.',
      done: 'Connected. Your next events show under the date.' };
    return svc === 'spotify' ? { st: spot, page: SPOTIFY_PAGE, title: 'Connect Spotify',
      steps: ['Scan the code with your phone.', 'Sign in to Spotify on the page that opens and allow access.', 'Spotify returns to the page, which sends the sign-in to the TV by itself.'],
      note: 'Your password goes only to Spotify. You can remove Frame Home’s access in your Spotify account settings.', done: 'Connected. What you play on Spotify now shows on Home.' }
      : { st: alexa, page: ALEXA_PAGE, title: 'Connect Alexa',
      steps: ['Scan the code with your phone.', 'Sign in to Amazon on the page that opens.', 'Paste the address of the empty page Amazon shows, then send it.'],
      note: 'Your password goes only to Amazon. Frame Home appears among the devices in your Amazon account and can be removed there. Unofficial: it uses the same connection as the Alexa app.',
      done: 'Connected. Choose readings and switches in Alexa settings.' };
  }
  function openPair(svc) {
    var p = pairInfo(svc), st = p.st;
    if (svc === 'calendar' ? !FC : svc === 'spotify' ? !FS : !FA) return;
    if (st.pair) st.pair();
    st.phase = 'waiting'; st.url = ''; st.detail = '';
    if (!(top().id === 'pair' && top().mode === svc)) push({ id: 'pair', mode: svc, f: {} });
    function onUrl(url) { st.url = url; render(); }
    function onCode() { st.phase = 'registering'; render(); }
    function done(err, id) {
      st.pair = null; st.phase = err ? 'failed' : 'done'; st.detail = err || ''; st.err = ''; st.added = err ? null : id || null;
      if (svc === 'alexa') alexa.list = null; else if (svc === 'calendar') { if (!err) calendarPoll(15 * 60 * 1000); } else if (!err) spotifyPoll(true);
      render();
    }
    st.pair = svc === 'calendar' ? FC.pair(CAL_PAGE, RELAY, onUrl, onCode, done) : svc === 'spotify' ? FS.pair(RELAY, onUrl, onCode, done) : FA.pair(ALEXA_PAGE, RELAY, onUrl, onCode, done);
  }
  function closePair(svc) { var st = pairInfo(svc).st; if (st.pair) { st.pair(); st.pair = null; } pop(); }
  V.pair = {
    sheet: true,
    key: function (t, k) {
      if (k === 'ok' && pairInfo(t.mode).st.phase === 'failed') { openPair(t.mode); return; }
      var st = pairInfo(t.mode).st, added = t.mode === 'calendar' && st.phase === 'done' ? st.added : null;
      if (k === 'back' || k === 'ok') { closePair(t.mode); st.added = null; if (added && FC.list().length > 1 && !(calById(added) || {}).name) openCalName(added); }
    },
    point: function (t, z) { if (z === 'act') this.key(t, 'ok'); }
  };

  /* ---------- Backup and restore ----------
     Export: enter a pass-phrase, the TV encrypts everything and sends the file to the phone to save.
     Restore: the phone sends a saved file back, the TV asks for the pass-phrase and writes it back. */
  var bk = { mode: '', phase: '', topic: '', text: '', url: '', detail: '', send: null, recv: null };
  function stopBackup() { if (bk.send) { bk.send.stop(); bk.send = null; } if (bk.recv) { bk.recv.stop(); bk.recv = null; } }
  function startBackup(mode) {
    if (!FB || !BACKUP_PAGE) return;
    stopBackup();
    if (mode === 'export') { openBkPass('export'); return; }
    bk.mode = 'import'; bk.phase = 'waiting'; bk.text = ''; bk.detail = ''; bk.topic = FB.topic();
    bk.url = BACKUP_PAGE + '#t=' + bk.topic + '&r=1';
    push({ id: 'backup', mode: 'import', f: { b: 0 } });
    bk.recv = FB.receive(RELAY, bk.topic, function (text) {
      bk.recv = null; bk.text = text; bk.phase = 'got';
      openBkPass('import'); render();
    });
  }
  function openBkPass(mode) { push({ id: 'wifitype', field: 'bkpass', bkmode: mode, draft: '', max: 64, f: { zone: 'char', ci: 0, ai: 0 } }); }
  function commitBkPass(t) {
    var pass = String(t.draft || '');
    if (pass.length < 1) return false;
    if (t.bkmode === 'export') {
      var text = FB.make(pass, APP_VERSION);
      pop();
      if (!text) { bk.mode = 'export'; bk.phase = 'empty'; bk.url = ''; push({ id: 'backup', mode: 'export', f: { b: 0 } }); return true; }
      bk.mode = 'export'; bk.phase = 'sending'; bk.detail = ''; bk.topic = FB.topic(); bk.text = text;
      bk.url = BACKUP_PAGE + '#t=' + bk.topic;
      bk.send = FB.send(RELAY, bk.topic, text);
      push({ id: 'backup', mode: 'export', f: { b: 0 } });
      return true;
    }
    var res = FB.read(pass, bk.text);
    if (!res.ok) { bk.phase = 'badpass'; bk.detail = res.code; pop(); render(); return true; }
    pop();
    FB.apply(res.keys); bk.phase = 'done'; bk.detail = ''; render();
    setTimeout(reloadApp, 900);
    return true;
  }
  function reloadApp() { if (QA.noReload) { bk.phase = 'reloaded'; render(); return; } try { location.reload(); } catch (e) { /* ignore */ } }
  function closeBackup() { stopBackup(); bk.phase = ''; pop(); }
  V.backup = {
    sheet: true,
    key: function (t, k) {
      if (k === 'ok' && t.mode === 'export' && bk.phase !== 'empty') { openBkPass('export'); return; }
      if (k === 'ok' && t.mode === 'import' && (bk.phase === 'badpass' || bk.phase === 'got')) { openBkPass('import'); return; }
      if (k === 'back' || k === 'ok') closeBackup();
    },
    point: function (t, z) { if (z === 'act') this.key(t, 'ok'); }
  };

  /* One list screen for every Alexa choice. t.mode picks the rows and what OK does. */
  var LIST_NEEDS_DEVICES = { readings: 1, switches: 1, keytarget: 1, members: 1, details: 1 };
  function openAlexaList(mode, extra) {
    var e = { id: 'alexalist', mode: mode, top: 0, f: { i: 0 } }, k;
    for (k in extra || {}) if (extra.hasOwnProperty(k)) e[k] = extra[k];
    push(e);
    if (LIST_NEEDS_DEVICES[mode] && alexaOn()) loadAlexaList();
    if (mode === 'keytarget') refreshCatalog();
  }
  function loadAlexaList() {
    alexa.loading = true; alexa.listErr = '';
    FA.devices(function (err, list) {
      var t = top(), keep = t.id === 'alexalist' ? alexaRows(t)[t.f.i] : null, rows, i;
      alexa.loading = false;
      if (err) { alexa.listErr = err; if (err === 'revoked') alexa.err = err; }
      else { alexa.list = list; list.forEach(function (d) { if (!alexa.busy[d.id]) alexa.vals[d.id] = d; }); }
      if (t.id === 'alexalist' && keep) { rows = alexaRows(t); for (i = 0; i < rows.length; i++) if (rows[i].id === keep.id) t.f.i = i; }
      render();
    });
  }
  function devicesWith(test) { return (alexa.list || []).filter(test); }
  function switchRows(selected) {
    var rows = S.c.alexaGroups.map(function (g) { return { id: 'group:' + g.id, label: g.name, value: T(g.members.length === 1 ? 'Group · {0} light' : 'Group · {0} lights', g.members.length), group: true }; });
    return rows.concat(devicesWith(function (d) { return d.power !== null; }).map(function (d) { return { id: d.id, label: d.name, value: T(d.power ? 'On' : 'Off') }; }))
      .map(function (r) { r.ticked = selected(r.id); return r; });
  }
  function alexaRows(t) {
    var rows = [];
    if (t.mode === 'readings') {
      devicesWith(function (d) { return d.readings.length; }).forEach(function (d) {
        d.readings.forEach(function (r) {
          rows.push({ id: d.id + '|' + r.key, dev: d, reading: r, label: d.name, value: T(r.label) + ' · ' + fmtReading(r),
            ticked: S.c.alexaReadings.some(function (x) { return x.id === d.id && x.key === r.key; }) });
        });
      });
    } else if (t.mode === 'calendar') {
      var cc = calById(t.cal);
      if (cc) rows = [{ id: 'rename', label: T('Name'), value: cc.name || T('Not set'), forward: true }, { id: 'forget', label: T('Disconnect this calendar'), value: '' }, { id: 'h-colour', label: T('Colour on Home'), header: true }]
        .concat(CAL_PALETTE.map(function (c) { return { id: 'colour:' + c[0], label: T(c[2]), swatch: c[1], ticked: calColourName(cc.colour, cc.index) === c[0] }; }));
    } else if (t.mode === 'icons') rows = liveTargets().map(function (x) { return { id: x.id, label: targetName(x), value: (S.c.alexaNames[x.id] ? originalName(x) + ' · ' : '') + T(SWITCH_ICON_NAMES[switchIcon(x.id)]), forward: true, icon: switchIcon(x.id) }; });
    else if (t.mode === 'icon') {
      var tg = S.c.alexaSwitches.filter(function (x) { return x.id === t.target; })[0] || { id: t.target };
      rows = [{ id: 'rename', label: T('Name on Home'), value: targetName(tg), forward: true }]
        .concat(S.c.alexaNames[t.target] ? [{ id: 'unname', label: T('Use the Alexa name'), value: originalName(tg) }] : [])
        .concat([{ id: 'h-icon', label: T('Icon'), header: true }])
        .concat(SWITCH_ICONS.map(function (name) { return { id: name, label: T(SWITCH_ICON_NAMES[name]), ticked: switchIcon(t.target) === name, icon: name }; }));
    }
    else if (t.mode === 'switches') {
      /* The switches on Home come first, in their Home order; the rest follow under a heading. */
      var all = switchRows(function (id) { return S.c.alexaSwitches.some(function (x) { return x.id === id; }); });
      rows = S.c.alexaSwitches.map(function (sw, n) {
        var r = all.filter(function (x) { return x.id === sw.id; })[0] || { id: sw.id, label: targetName(sw) || sw.id, value: '', ticked: true, group: isGroup(sw.id) };
        r.order = n + 1; r.lifted = t.lift === sw.id; if (r.lifted) r.value = T('Up and Down move it · OK places it'); return r;
      });
      var rest = all.filter(function (x) { return !x.ticked; });
      if (rest.length) rows = rows.concat([{ id: 'h-more', label: T('More devices and groups'), header: true }]).concat(rest);
    }
    else if (t.mode === 'keys') rows = SLOTS.map(function (c) { var tg = S.c.alexaKeys[c]; return { id: c, colour: c, label: T(COLOUR_NAMES[c]), value: tg && targetName(tg) || T('Not set') }; })
      .concat([{ id: 'hints', label: T('Show the buttons on Home'), value: T({ auto: 'When Home opens and a button is pressed', pressed: 'Only when a button is pressed', always: 'Always', off: 'Off' }[S.c.keyHints]) }])
      .concat([{ id: 'test', label: T('Test the remote buttons'), value: '', forward: true }]);
    else if (t.mode === 'keytarget') {
      var cur = S.c.alexaKeys[t.colour], is = function (id) { return !!cur && cur.id === id; };
      rows = [{ id: '', label: T('Nothing'), ticked: !cur }, { id: 'h-frame', label: 'Frame Home', header: true }, { id: 'frame:home', label: T('Home screen'), ticked: is('frame:home'), spotify: true }];
      if (spotifyOn()) rows = rows.concat([{ id: 'h-spotify', label: 'Spotify', header: true }]).concat(Object.keys(SPOTIFY_ACTIONS).map(function (id) { return { id: id, label: T(SPOTIFY_ACTIONS[id]), ticked: is(id), spotify: true }; }));
      if (alexaOn()) rows = rows.concat([{ id: 'h-alexa', label: 'Alexa', header: true }]).concat(switchRows(is));
      rows = rows.concat([{ id: 'h-apps', label: T('Apps on the TV'), header: true }]).concat(appTargets().map(function (a) { return { id: 'app:' + a.appId, label: a.name, ticked: is('app:' + a.appId), app: true }; }));
    } else if (t.mode === 'groups') {
      rows = [{ id: 'new', label: T('New group'), add: true, disabled: S.c.alexaGroups.length >= MAX_GROUPS }].concat(S.c.alexaGroups.map(function (g) {
        return { id: g.id, label: g.name, value: T(g.members.length === 1 ? '{0} light' : '{0} lights', g.members.length), forward: true };
      }));
    } else if (t.mode === 'group') {
      var g = groupOf(t.gid);
      if (g) rows = [{ id: 'members', label: T('Lights in this group'), value: summary(g.members.map(function (m) { return m.name; }), 'None yet'), forward: true },
        { id: 'rename', label: T('Rename'), value: g.name, forward: true }, { id: 'delete', label: T('Delete group') }];
    } else if (t.mode === 'members') {
      var grp = groupOf(t.gid);
      if (grp) rows = devicesWith(function (d) { return d.power !== null; }).map(function (d) {
        return { id: d.id, dev: d, label: d.name, value: T(d.power ? 'On' : 'Off'), ticked: grp.members.some(function (m) { return m.id === d.id; }) };
      });
    } else if (t.mode === 'details') rows = (alexa.list || []).map(function (d) { return { id: d.id, dev: d, label: d.name, value: T(d.props.length === 1 ? '{0} value' : '{0} values', d.props.length), forward: true }; });
    else if (t.mode === 'detail') {
      var dev = null; (alexa.list || []).forEach(function (d) { if (d.id === t.dev) dev = d; });
      if (dev) rows = dev.props.map(function (p, i) {
        return { id: 'p' + i, label: (p.label ? p.label + ' · ' : '') + p.feature, value: p.type + (p.value !== null && p.value !== undefined ? ' = ' + p.value : '') + (p.unit ? ' ' + p.unit : ''), info: true };
      });
    }
    return rows;
  }
  function alexaListText(t) {
    var g = t.gid ? groupOf(t.gid) : null;
    return {
      readings: [T('Readings'), T('Choose up to {0} values to show beside the clock.', MAX_READINGS)],
      switches: [T('Switches'), T('Choose up to {0} devices or groups for the Home controls.', maxSwitches()) + (S.c.topStyle === 'bar' ? '' : ' ' + T('Up to {0} with the top Dock bar.', MAX_SWITCHES)) + ' ' + T('Right on a chosen one moves it with Up and Down.')],
      calendar: [(calById(t.cal) || {}).name || T('Calendar {0}', ((calById(t.cal) || {}).index || 0) + 1), T('Its name and colour show beside its events on Home, so you can tell whose they are.')],
      icons: [T('Switch names and icons'), T('Give a switch a short name for Home (for example AC) and choose its icon.')],
      icon: [t.tname || T('Switch names and icons'), T('Name and icon of this switch on Home.')],
      keys: [T('Remote buttons'), T('The colour buttons, CH +, CH − and Guide can each switch a light or group, control Spotify or open an app. CH and Guide keep their usual job until you assign them.')],
      keytarget: [T(COLOUR_NAMES[t.colour] || 'Remote buttons'), T('Choose what this button does.')],
      groups: [T('Groups'), T('A group switches all its lights at once. It shows as on only when every light is on.')],
      group: [g ? g.name : T('Groups'), T('Group settings')],
      members: [g ? g.name : T('Groups'), T('Choose the lights in this group.')],
      details: [T('Device details'), T('What Alexa reports for each device. Useful when a value is missing.') + ' ' + alexaPollStatus()],
      detail: [t.devName || T('Device details'), T('Feature, type and value as Alexa reports them.')]
    }[t.mode] || ['', ''];
  }
  /* For Device details: how often Home reads Alexa and when it last got an answer, to tell a stalled
     read from Alexa reporting an old state. */
  function alexaDeviceName(id) {
    var d = (alexa.list || []).filter(function (x) { return x.id === id; })[0], r = S.c.alexaReadings.filter(function (x) { return x.id === id; })[0], w = S.c.alexaSwitches.filter(function (x) { return x.id === id; })[0];
    return d ? d.name : r ? r.name : w ? w.name : id.replace(/^.*\./, '…');
  }
  function alexaPollStatus() {
    var every = liveTargets().length || legendRows().length ? ALEXA_SWITCH_POLL : ALEXA_POLL, ago = function (t) { return Math.max(0, Math.round((Date.now() - t) / 1000)); };
    var text = T('Home reads Alexa every {0} s.', Math.round(every / 1000));
    text += ' ' + (alexa.lastOk ? T('Last answer {0} s ago.', ago(alexa.lastOk)) : T('No answer yet.'));
    if (alexa.lastErr && alexa.answered && alexa.answered > (alexa.lastOk || 0)) text += ' ' + T('Last read failed: {0}', alexaErrText(alexa.lastErr));
    if (alexa.missing && alexa.missing.length) text += ' ' + T('No answer for: {0}', alexa.missing.map(alexaDeviceName).join(', '));
    if (drawErr.text) text += ' ' + T('Drawing error {0} s ago: {1}', ago(drawErr.at), drawErr.text);
    return text;
  }
  function saveAlexa(patch, label) { if (!savePrefs(patch, label)) { showToast(T('Couldn’t save this change.')); return false; } alexaPoll(true); return true; }
  function toggleIn(list, item, same, max) {
    var out = list.filter(function (x) { return !same(x); });
    if (out.length === list.length) { if (list.length >= max) return null; out = list.concat([item]); }
    return out;
  }
  /* Apps for remote buttons: the Home row first, then everything installed, by name. */
  function appTargets() {
    var seen = {}, out = [];
    S.c.home.concat(ALPHA).forEach(function (id) { var a = app(id); if (a && a.appId && !seen[a.appId]) { seen[a.appId] = true; out.push(a); } });
    return out;
  }
  function alexaListOk(t, row) {
    var next, g;
    if (!row || row.info || row.disabled || row.header) return;
    if (t.mode === 'readings') {
      next = toggleIn(S.c.alexaReadings, { id: row.dev.id, key: row.reading.key, name: row.dev.name.slice(0, 80), label: row.reading.label.slice(0, 40) }, function (x) { return x.id === row.dev.id && x.key === row.reading.key; }, MAX_READINGS);
      if (!next) { showToast(T('Up to {0}. Remove one first.', MAX_READINGS)); return; }
      storeVals((function () { var o = {}; o[row.dev.id] = row.dev; return o; }()));
      saveAlexa({ alexaReadings: next }, 'Alexa readings');
    } else if (t.mode === 'switches') {
      next = toggleIn(S.c.alexaSwitches, { id: row.id, name: row.group ? '' : row.label.slice(0, 80) }, function (x) { return x.id === row.id; }, maxSwitches());
      if (!next) { showToast(T('Up to {0}. Remove one first.', maxSwitches())); return; }
      saveAlexa({ alexaSwitches: next }, 'Alexa switches');
    } else if (t.mode === 'keys') { if (row.id === 'test') openRemoteTest(); else if (row.id === 'hints') savePrefs({ keyHints: { auto: 'pressed', pressed: 'always', always: 'off', off: 'auto' }[S.c.keyHints] }, 'Remote button hints'); else openAlexaList('keytarget', { colour: row.colour }); }
    else if (t.mode === 'keytarget') {
      next = {}; SLOTS.forEach(function (c) { next[c] = S.c.alexaKeys[c]; });
      next[t.colour] = row.id ? { id: row.id, name: row.group || row.spotify ? '' : row.label.slice(0, 80) } : null;
      if (row.header) return;
      if (saveAlexa({ alexaKeys: next }, 'Remote button')) { syncSlotKeys(); pop(); }
    } else if (t.mode === 'groups') {
      if (row.add) openNameEntry('');
      else openAlexaList('group', { gid: row.id });
    } else if (t.mode === 'group') {
      g = groupOf(t.gid);
      if (!g) return;
      if (row.id === 'members') openAlexaList('members', { gid: g.id });
      else if (row.id === 'rename') openNameEntry(g.id);
      else { S.deleteGroup = g.id; openMessage('groupDelete'); }
    } else if (t.mode === 'members') {
      g = groupOf(t.gid);
      if (!g) return;
      next = toggleIn(g.members, { id: row.dev.id, name: row.dev.name.slice(0, 80) }, function (m) { return m.id === row.dev.id; }, MAX_MEMBERS);
      if (!next) { showToast(T('Up to {0}. Remove one first.', MAX_MEMBERS)); return; }
      saveAlexa({ alexaGroups: S.c.alexaGroups.map(function (x) { return x.id === g.id ? { id: x.id, name: x.name, members: next } : x; }) }, 'Alexa group lights');
    } else if (t.mode === 'details') openAlexaList('detail', { dev: row.id, devName: row.label });
    else if (t.mode === 'icons') openAlexaList('icon', { target: row.id, tname: row.label });
    else if (t.mode === 'calendar' && row.id === 'rename') openCalName(t.cal);
    else if (t.mode === 'calendar' && row.id === 'forget') { S.forgetCal = t.cal; openMessage('calendarOut'); }
    else if (t.mode === 'calendar' && /^colour:/.test(row.id)) { if (!FC.recolour(t.cal, row.id.slice(7))) showToast(T('Couldn’t save this change.')); }
    else if (t.mode === 'icon' && row.id === 'rename') openSwitchName(t.target);
    else if (t.mode === 'icon' && row.id === 'unname') { next = {}; Object.keys(S.c.alexaNames).forEach(function (k) { if (k !== t.target) next[k] = S.c.alexaNames[k]; }); saveAlexa({ alexaNames: next }, 'Switch name'); }
    else if (t.mode === 'icon') {
      next = {}; Object.keys(S.c.alexaIcons || {}).forEach(function (k) { next[k] = S.c.alexaIcons[k]; });
      if (row.id === 'light') delete next[t.target]; else next[t.target] = row.id;
      if (saveAlexa({ alexaIcons: next }, 'Switch icon')) pop();
    }
  }
  var ALEXA_VISIBLE = 7;
  V.alexalist = {
    sheet: true,
    norm: function (t) { var rows = alexaRows(t); t.f.i = clamp(t.f.i, 0, Math.max(0, rows.length - 1)); while (rows[t.f.i] && rows[t.f.i].header && t.f.i < rows.length - 1) t.f.i++; },
    key: function (t, k) {
      var rows = alexaRows(t), row = rows[t.f.i], id, i;
      if (t.mode === 'switches' && t.lift) {
        /* Moving a switch: Up/Down change its place on Home; OK, Back, Left or Right put it down. */
        i = S.c.alexaSwitches.map(function (x) { return x.id; }).indexOf(t.lift);
        if ((k === 'up' && i > 0) || (k === 'down' && i >= 0 && i < S.c.alexaSwitches.length - 1)) {
          var list = S.c.alexaSwitches.slice(), j = k === 'up' ? i - 1 : i + 1, tmp = list[i];
          list[i] = list[j]; list[j] = tmp;
          if (saveAlexa({ alexaSwitches: list }, 'Alexa switch order')) t.f.i = j;
        } else if (k === 'ok' || k === 'back' || k === 'left' || k === 'right') t.lift = null;
        return;
      }
      if (t.mode === 'switches' && k === 'right' && row && row.ticked) { t.lift = row.id; return; }
      if (t.mode === 'switches' && k === 'ok' && row && !row.header) {
        id = row.id; alexaListOk(t, row); rows = alexaRows(t);
        for (i = 0; i < rows.length; i++) if (rows[i].id === id) t.f.i = i;
        return;
      }
      if (k === 'back') pop();
      else if (k === 'up' && t.f.i > 0) { t.f.i--; while (t.f.i > 0 && rows[t.f.i].header) t.f.i--; }
      else if (k === 'down' && t.f.i < rows.length - 1) { t.f.i++; while (t.f.i < rows.length - 1 && rows[t.f.i].header) t.f.i++; }
      else if (k === 'ok') alexaListOk(t, rows[t.f.i]);
    },
    point: function (t, z, i) { if (z === 'pick') { t.f.i = i; this.key(t, 'ok'); } }
  };
  function deleteGroup(id) {
    var keys = {}, gid = 'group:' + id;
    SLOTS.forEach(function (c) { keys[c] = S.c.alexaKeys[c] && S.c.alexaKeys[c].id === gid ? null : S.c.alexaKeys[c]; });
    if (!saveAlexa({ alexaGroups: S.c.alexaGroups.filter(function (g) { return g.id !== id; }), alexaSwitches: S.c.alexaSwitches.filter(function (x) { return x.id !== gid; }), alexaKeys: keys }, 'Alexa group deleted')) return;
    if (top().id === 'alexalist' && top().mode === 'group') pop();
  }
  /* Group names are typed with the same on-screen keyboard as the Wi‑Fi name, and kept short enough
     to fit a Home switch tile (longer device names from Alexa are cut with an ellipsis there). */
  var GROUP_NAME_MAX = 12;
  function openNameEntry(gid) {
    var g = gid ? groupOf(gid) : null;
    push({ id: 'wifitype', field: 'group', gid: gid, draft: g ? g.name : '', chars: NAME_CHARS, max: GROUP_NAME_MAX, f: { zone: 'char', ci: 0, ai: 0 } });
  }
  function openSwitchName(id) {
    var sw = S.c.alexaSwitches.filter(function (x) { return x.id === id; })[0] || { id: id };
    push({ id: 'wifitype', field: 'swname', target: id, draft: targetName(sw).slice(0, GROUP_NAME_MAX), chars: NAME_CHARS, max: GROUP_NAME_MAX, f: { zone: 'char', ci: 0, ai: 0 } });
  }
  function saveSwitchName(t) {
    var name = String(t.draft || '').replace(/\s+/g, ' ').trim().slice(0, GROUP_NAME_MAX), next = {};
    Object.keys(S.c.alexaNames).forEach(function (k) { if (k !== t.target) next[k] = S.c.alexaNames[k]; });
    if (name && name !== originalName(S.c.alexaSwitches.filter(function (x) { return x.id === t.target; })[0] || { id: t.target })) next[t.target] = name;
    return saveAlexa({ alexaNames: next }, 'Switch name');
  }
  function saveGroupName(t) {
    var name = String(t.draft || '').replace(/\s+/g, ' ').trim().slice(0, GROUP_NAME_MAX), id, groups;
    if (!name) { showToast(T('Type a name first.')); return false; }
    if (t.gid) return saveAlexa({ alexaGroups: S.c.alexaGroups.map(function (g) { return g.id === t.gid ? { id: g.id, name: name, members: g.members } : g; }) }, 'Alexa group renamed');
    id = 'g' + Date.now().toString(36);
    groups = S.c.alexaGroups.concat([{ id: id, name: name, members: [] }]);
    if (!saveAlexa({ alexaGroups: groups }, 'Alexa group added')) return false;
    pop(); openAlexaList('group', { gid: id }); openAlexaList('members', { gid: id });
    return 'opened';
  }
  function alexaSignOut() { openMessage('alexaOut'); }
  function alexaForget() {
    FA.forget(); clearTimeout(alexa.timer); alexa.timer = null;
    alexa.vals = {}; alexa.err = ''; alexa.list = null; alexa.failed = {};
    var keys = {}; SLOTS.forEach(function (c) { keys[c] = S.c.alexaKeys[c] && /^(spotify|app):/.test(S.c.alexaKeys[c].id) ? S.c.alexaKeys[c] : null; });
    savePrefs({ alexaReadings: [], alexaSwitches: [], alexaKeys: keys }, 'Alexa sign-out');
  }
  /* ---------- Remote test: shows every signal the TV gives the app ---------- */
  /* Diagnostic for the colour picker: while open, every key the TV supports is registered and every
     key, focus, visibility and size event is listed. Back twice within two seconds leaves. */
  var rt = { log: [], names: {}, registered: [], started: 0, lastBack: 0, supported: 0 };
  var KEEP_KEYS = ['Back', 'XF86Back', 'ColorF0Red', 'ColorF1Green', 'ColorF2Yellow', 'ColorF3Blue', 'MediaPlayPause', 'MediaPlay', 'MediaPause', 'MediaFastForward', 'MediaRewind', 'MediaTrackNext', 'MediaTrackPrevious'];
  function rtLog(text) {
    if (top().id !== 'remotetest') return;
    rt.log.unshift('+' + ((Date.now() - rt.started) / 1000).toFixed(1) + ' s  ' + text);
    rt.log = rt.log.slice(0, 14);
    render();
  }
  function openRemoteTest() {
    var keys = [];
    rt.log = []; rt.started = Date.now(); rt.registered = []; rt.names = {}; rt.supported = 0;
    try { keys = tizen.tvinputdevice.getSupportedKeys() || []; } catch (e) { keys = []; }
    rt.supported = keys.length;
    keys.forEach(function (k) {
      rt.names[k.code] = k.name;
      if (KEEP_KEYS.indexOf(k.name) >= 0) return;
      try { tizen.tvinputdevice.registerKey(k.name); rt.registered.push(k.name); } catch (e) { /* not registrable */ }
    });
    push({ id: 'remotetest', f: {} });
  }
  function closeRemoteTest() {
    rt.registered.forEach(function (name) { try { tizen.tvinputdevice.unregisterKey(name); } catch (e) { /* already gone */ } });
    rt.registered = []; slotRegistered = {};
    syncSlotKeys();
    pop();
  }
  V.remotetest = { sheet: true, key: function () { /* handled in the keydown listener */ } };
  ['keydown', 'keyup'].forEach(function (type) {
    document.addEventListener(type, function (ev) {
      if (top().id !== 'remotetest') return;
      rtLog(type + '  ' + ev.keyCode + '  ' + (rt.names[ev.keyCode] || ev.key || ''));
      ev.preventDefault(); ev.stopImmediatePropagation();
      if (type === 'keydown' && (ev.keyCode === 10009 || ev.keyCode === 27 || ev.keyCode === 8)) {
        if (Date.now() - rt.lastBack < 2000) closeRemoteTest(); else rt.lastBack = Date.now();
        render();
      }
    }, true);
  });
  window.addEventListener('blur', function () { rtLog('window blur'); }, true);
  window.addEventListener('focus', function () { rtLog('window focus'); }, true);
  window.addEventListener('resize', function () { rtLog('resize ' + window.innerWidth + ' x ' + window.innerHeight); });
  document.addEventListener('visibilitychange', function () { rtLog('visibility ' + (document.hidden ? 'hidden' : 'visible')); });
  window.addEventListener('pagehide', function () { rtLog('pagehide'); });
  window.addEventListener('pageshow', function () { rtLog('pageshow'); });
  window.addEventListener('tizenhwkey', function (ev) { rtLog('tizenhwkey ' + (ev.keyName || '')); });
  /* What a relaunch (the Home button while Frame Home is already open) brings, if anything. */
  function requestedOperation() {
    try { var rc = tizen.application.getCurrentApplication().getRequestedAppControl(); return rc && rc.appControl ? rc.appControl.operation : ''; } catch (e) { return ''; }
  }
  window.addEventListener('appcontrol', function () { rtLog('appcontrol (window) ' + requestedOperation()); });
  document.addEventListener('appcontrol', function () { rtLog('appcontrol (document) ' + requestedOperation()); });
  /* ---------- Your picture: receive a photo from a phone ---------- */
  function relaySince() { return S.c.relaySince || String(S.c.relayAt || Math.floor(Date.now() / 1000) - 600); }
  function savePrefs(patch, label) {
    var c = next(S.c.home.slice(), S.c.recent.slice()), k;
    for (k in patch) if (patch.hasOwnProperty(k)) c[k] = patch[k];
    return write(c, label);
  }
  function openPhone() {
    if (!S.c.relayTopic && !savePrefs({ relayTopic: FCW.randomTopic(), relayAt: Math.floor(Date.now() / 1000) - 60, relaySince: '' }, 'Picture channel')) return;
    if (!custom.busy) { custom.phase = 'idle'; custom.name = ''; }
    push({ id: 'phone', f: { b: 0 } });
    startRelay();
  }
  function closePhone() { pop(); }
  /* Once a channel exists the TV keeps listening while it is in use, so a photo sent after
     the QR screen closes still arrives. Hidden apps disconnect and replay on return. */
  function startRelay() {
    if (!FCW || !S.c.relayTopic || custom.relay || document.hidden) return;
    custom.link = 'connecting'; custom.detail = '';
    custom.relay = FCW.listen(RELAY, S.c.relayTopic, relaySince, {
      state: function (state, detail) { custom.link = state; custom.detail = detail || ''; if (top().id === 'phone') render(); },
      message: function (m) {
        // Replays repeat earlier messages; each one is handled once per session.
        if (!safeId(m.id) || m.id === S.c.relaySince || custom.seen[m.id]) return;
        custom.seen[m.id] = true;
        // The send page puts a still of a video first, tagged, because the TV cannot read video frames.
        if (m.attachment && m.attachment.url && m.tags && m.tags.indexOf(STILL_TAG) >= 0) { custom.stillMsg = m; savePrefs({ relaySince: m.id }, 'Video still'); return; }
        // A larger video arrives as numbered parts; it is queued once every part is here.
        var part = partOf(m), set;
        if (part) {
          set = custom.sets[part.uid] || (custom.sets[part.uid] = { n: part.n, urls: [], got: 0 });
          if (!set.urls[part.i]) { set.urls[part.i] = m.attachment.url; set.got++; }
          if (set.got === set.n) {
            custom.sets = {};
            custom.queued = { id: m.id, time: m.time, parts: set.urls, attachment: { name: String(m.title || 'video.mp4').slice(0, 80), type: 'video/mp4' } };
            drainPictures();
          }
          return;
        }
        if (m.attachment && m.attachment.url) custom.queued = m;
        else savePrefs({ relaySince: m.id }, 'Channel message');
        drainPictures();
      }
    });
  }
  function partOf(m) {
    var tags = m.tags || [], out = { uid: '', i: -1, n: 0 }, j, tag;
    if (tags.indexOf(PART_TAG) < 0 || !m.attachment || !m.attachment.url) return null;
    for (j = 0; j < tags.length; j++) {
      tag = String(tags[j]);
      if (/^u-[a-z0-9]{6,20}$/.test(tag)) out.uid = tag.slice(2);
      else if (/^i-\d{1,2}$/.test(tag)) out.i = +tag.slice(2);
      else if (/^n-\d{1,2}$/.test(tag)) out.n = +tag.slice(2);
    }
    return out.uid && out.n >= 1 && out.n <= 12 && out.i >= 0 && out.i < out.n ? out : null;
  }
  function stopRelay() { if (custom.relay) { custom.relay.stop(); custom.relay = null; custom.link = 'idle'; } }
  function drainPictures() {
    // A replay can hold several photos; only the newest one is prepared.
    var m = custom.queued;
    if (!m || custom.busy) return;
    custom.queued = null;
    receivePicture(m);
  }
  function pictureFailed(phase, detail) {
    custom.busy = false; custom.phase = phase; custom.detail = detail || '';
    render(); drainPictures();
  }
  function receivePicture(message) {
    var attachment = message.attachment;
    savePrefs({ relaySince: message.id }, 'Picture received');
    var video = !!message.parts || FCW.isVideo(attachment);
    if (!video && !FCW.isImage(attachment)) { custom.phase = 'notimage'; render(); return; }
    custom.busy = true; custom.phase = 'downloading'; custom.percent = 0; custom.name = String(attachment.name || '').slice(0, 80); render();
    var fetched = function (err, got) {
      if (err) { pictureFailed(err.code === 'decode' ? 'unreadable' : 'unreachable', err.detail); return; }
      var still = video && got.source !== 'cover' && custom.stillMsg && Math.abs((custom.stillMsg.time || 0) - (message.time || 0)) < 900 ? custom.stillMsg : null;
      custom.stillMsg = null;
      if (still) FCW.download(still.attachment.url, function (failed, image) { if (!failed) { got.frame = image; got.source = 'still'; } prepare(); });
      else prepare();
      function prepare() {
        custom.phase = 'processing'; render();
        // Let the status paint before the one-time image work starts.
        setTimeout(function () {
          FCW.processImage(video ? got.frame || neutralFrame() : got, function (failure, record) {
            if (failure) { pictureFailed('unreadable'); return; }
            if (video) record.files.video = got.blob;
            custom.still = !video || !!got.frame;
            FCW.save(record, function (stored) {
              FCW.persist(); custom.lost = false;
              installCustom(record);
              savePrefs({ customAt: record.stamp, customTone: record.tone }, 'Your picture');
              custom.busy = false; custom.phase = !stored ? 'unsaved' : custom.still ? 'done' : 'nostill';
              setLook({ bg: 'photo', wall: CUSTOM }, { row: 'bg', reload: true });
              render(); drainPictures();
            });
          });
        }, 60);
      }
    };
    if (message.parts) FCW.downloadParts(message.parts, function (f) { custom.percent = Math.round(f * 100); render(); }, function (err, buffer) { if (err) fetched(err); else FCW.videoFromBuffer(buffer, fetched); });
    else (video ? FCW.downloadVideo : FCW.download)(attachment.url, fetched);
  }
  /* A video picture plays muted and looped over its first-frame photo, only while Home or a
     Settings preview shows it and the app is visible; otherwise it is paused or released. */
  var photoVideo = document.getElementById('photoVideo');
  function syncVideo() {
    var url = custom.urls && custom.urls.video, t = top(), visible = !document.hidden && !V[t.id].sheet && t.id !== 'wifiqr' && t.id !== 'nowplaying',
      wanted = !!url && S.c.bg === 'photo' && !!S.shown && S.shown.wall === CUSTOM;
    if (!photoVideo) return;
    if (!wanted) {
      if (photoVideo._src) { photoVideo.pause(); photoVideo.removeAttribute('src'); photoVideo.load(); photoVideo._src = ''; photoVideo.className = 'photo photo-video'; }
      return;
    }
    if (photoVideo._src !== url) { photoVideo._src = url; photoVideo.className = 'photo photo-video'; photoVideo.src = url; }
    if (visible && photoVideo.paused) { try { var played = photoVideo.play(); if (played && played.catch) played.catch(function () { /* stays on the photo */ }); } catch (e) { /* photo stays */ } }
    else if (!visible && !photoVideo.paused) photoVideo.pause();
  }
  if (photoVideo) photoVideo.addEventListener('playing', function () { photoVideo.className = 'photo photo-video is-playing'; });
  /* No still from the video: a quiet dark field keeps the glass and Settings neutral, not black. */
  function neutralFrame() {
    var c = document.createElement('canvas'), x = c.getContext('2d'), g;
    c.width = 1920; c.height = 1080; g = x.createLinearGradient(0, 0, 0, 1080);
    g.addColorStop(0, '#2a3439'); g.addColorStop(1, '#11171a'); x.fillStyle = g; x.fillRect(0, 0, 1920, 1080);
    return c;
  }
  function installCustom(record) {
    var old = custom.urls;
    custom.urls = FCW.urls(record); custom.stamp = record.stamp;
    addCustomWall(record.tone);
    if (old) setTimeout(function () { Object.keys(old).forEach(function (k) { URL.revokeObjectURL(old[k]); }); }, 5000);
  }
  /* Storage can be slow or briefly unavailable right after the TV powers on. Home starts after a
     few seconds regardless, showing the first wallpaper's files in the slot while it waits, but the
     saved choice is never changed: the picture appears as soon as storage answers. Only a picture
     that is really gone switches the background, and the Your picture screen says so. */
  function loadCustom(done) {
    var started = false, tries = 0, timer = setTimeout(begin, 4000);
    function begin() { if (!started) { started = true; clearTimeout(timer); done(); } }
    function attempt() {
      FCW.load(function (record, failed) {
        if (record) {
          installCustom(record);
          if (started && S.c.bg === 'photo' && S.c.wall === CUSTOM) setLook({}, { row: 'bg', reload: true, transient: true });
          begin(); return;
        }
        if (failed) { tries++; if (tries >= 3) begin(); setTimeout(attempt, Math.min(30000, 3000 * tries)); return; }
        custom.lost = true;
        if (!started) { if (S.c.wall === CUSTOM) S.c.wall = WALLS[0].id; S.c.customAt = 0; savePrefs({}, 'Your picture is gone'); begin(); }
        else { savePrefs({ customAt: 0 }, 'Your picture is gone'); if (S.c.wall === CUSTOM) setLook({ wall: WALLS[0].id }, { row: 'bg' }); }
      });
    }
    attempt();
  }
  V.phone = {
    sheet: true,
    key: function (t, k) { if (k === 'back' || k === 'ok') closePhone(); },
    point: function (t, z) { if (z === 'act') closePhone(); }
  };
  V.wifiqr = {
    sheet: false,
    key: function (t, k) { if (k === 'back' || k === 'ok') pop(); }
  };
  V.wifitype = {
    sheet: true,
    norm: function (t) {
      t.draft = typeof t.draft === 'string' ? t.draft : '';
      t.f.ci = clamp(t.f.ci, 0, (t.chars || WIFI_CHARS).length - 1);
      t.f.ai = clamp(t.f.ai, 0, 2);
      if (t.f.zone !== 'char' && t.f.zone !== 'act') t.f.zone = 'char';
    },
    key: function (t, k) {
      var f = t.f;
      if (f.zone === 'char') {
        if (k === 'left' && f.ci > 0) f.ci--;
        else if (k === 'right' && f.ci < (t.chars || WIFI_CHARS).length - 1) f.ci++;
        else if (k === 'up' && f.ci >= KEYBOARD_COLS) f.ci -= KEYBOARD_COLS;
        else if (k === 'down' && f.ci + KEYBOARD_COLS < (t.chars || WIFI_CHARS).length) f.ci += KEYBOARD_COLS;
        else if (k === 'down') f.zone = 'act';
        else if (k === 'ok') {
          if (t.field === 'pass' && t.draft.length >= 63) return;
          if (t.field === 'ssid' && t.draft.length >= 32) return;
          if (t.max && t.draft.length >= t.max) return;
          t.draft += (t.chars || WIFI_CHARS).charAt(f.ci);
        } else if (k === 'back') pop();
        return;
      }
      if (k === 'up') { f.zone = 'char'; return; }
      if (k === 'left' && f.ai > 0) f.ai--;
      else if (k === 'right' && f.ai < 2) f.ai++;
      else if (k === 'back') pop();
      else if (k === 'ok') {
        if (f.ai === 0) t.draft = t.draft.slice(0, -1);
        else if (f.ai === 1 && t.field === 'group') { if (saveGroupName(t) === true) pop(); }
        else if (f.ai === 1 && t.field === 'swname') { if (saveSwitchName(t)) pop(); }
        else if (f.ai === 1 && t.field === 'calname') { FC.rename(t.target, t.draft); pop(); }
        else if (f.ai === 1 && t.field === 'bkpass') { commitBkPass(t); }
        else if (f.ai === 1) { if (saveWifiDraft(t.field, t.draft)) pop(); }
        else pop();
      }
    },
    point: function (t, z, i) {
      if (z === 'char') { t.f.zone = 'char'; t.f.ci = i; this.key(t, 'ok'); }
      else if (z === 'act') { t.f.zone = 'act'; t.f.ai = i; this.key(t, 'ok'); }
    }
  };

  /* ---------- Dispatch ---------- */
  function norm() { var t = top(), v = V[t.id]; if (v.norm) v.norm(t); }
  function press(k) {
    if (hdmiBack(k)) return;
    norm();
    var t = top();
    V[t.id].key(t, k);
    norm();
    render();
    syncRotation();
  }

  /* ---------- Rendering ---------- */
  var $ = function (id) { return document.getElementById(id); };
  var alexaToast = $('alexaToast'), musicEl = $('music'), keyLegend = $('keyLegend');
  var stage = $('stage'), buildVersion = $('buildVersion'), homeEl = $('home'), caption = $('caption'), utilsEl = $('utils');
  var utilFocusLabel = $('utilFocusLabel'), utilFocusKey = '';
  var dock = $('dock'), shelf = $('shelf'), track = $('track'), plate = $('plate'), matScrim = $('matScrim'), dockEmpty = $('dockEmpty');
  var cueL = $('cueL'), cueR = $('cueR'), dockAction = $('dockAction');
  var focusStatus = $('focusStatus'), sceneEl = $('scene'), appearanceEl = $('appearance'), appearanceRows = $('appearanceRows'), appearanceDesc = $('appearanceDesc');
  var appearanceBack = $('appearanceBack'), appearanceTitle = $('appearanceTitle'), appearanceStatus = $('appearanceStatus');
  var sheetEl = $('sheet'), sheetView = $('sheetView');
  var wifiQrEl = $('wifiQr'), wifiQrCanvas = $('wifiQrCanvas'), wifiQrSsid = $('wifiQrSsid'), wifiQrCard = $('wifiQrCard'), wifiQrTitle = $('wifiQrTitle'), wifiQrBg = $('wifiQrBg');
  var IMG = { photo: $('photo'), mat: $('matImg'), bg: $('sheetBg') };
  var sheetKey = '', slotEls = {}, dockAnchorCenter = 960;
  var appliedPalette = null, appliedPhoto = null, appliedFont = null, appliedFontMetrics = null;

  /* Curated locked palettes keep the existing rendering path exactly. */
  function applyAdaptiveInk(palette) {
    var active = S.c.bg === 'photo' && palette && !palette.locked && palette.light && palette.tl && palette.tr && palette.br;
    if (appliedPalette === palette && appliedPhoto === (S.c.bg === 'photo')) return !!active;
    appliedPalette = palette; appliedPhoto = S.c.bg === 'photo';
    ['tl', 'tr', 'br'].forEach(function (zone) {
      var r = active ? palette[zone] : null;
      var values = r ? { ink: r.ink, 'clock-ink': r.clockInk || r.ink, 'rest-ink': r.restInk, 'peer-ink': r.peerInk, rest: r.restAlpha, peer: r.peerAlpha, under: r.halo, shadow: r.shadow } : {};
      ['ink', 'clock-ink', 'rest-ink', 'peer-ink', 'rest', 'peer', 'under', 'shadow'].forEach(function (key) {
        var name = '--' + zone + '-' + key, value = values[key];
        if (value !== undefined && value !== null) stage.style.setProperty(name, String(value));
        else stage.style.removeProperty(name);
      });
    });
    if (active && palette.light) stage.style.setProperty('--home-app-ink', palette.light);
    else stage.style.removeProperty('--home-app-ink');
    return !!active;
  }
  function inkRungClasses(palette, active) {
    if (!active) return '';
    return ['tl', 'tr', 'br'].map(function (zone) {
      var rung = palette[zone].rung;
      return ['light', 'mist', 'mist-high', 'dark', 'dark-halo'].indexOf(rung) >= 0 ? ' ink-' + zone + '-' + rung : '';
    }).join('');
  }
  function render() {
    var t = top(), sheet = !!V[t.id].sheet, shown = wall(S.shown ? S.shown.wall : S.c.wall), palette = ADAPTIVE_INK[shown.id];
    var adaptive = applyAdaptiveInk(palette), tr = adaptive && palette.tr ? palette.tr.pol : shown.ut.tr, br = adaptive && palette.br ? palette.br.pol : shown.ut.br;
    S.c.layoutView = S.c.dockStyle === 'shelf' ? 'dock' : S.c.dockStyle;
    stage.className = 'stage bg-' + S.c.bg + ' l-dock dock-' + S.c.dockStyle + ' clockstyle-' + S.c.clockStyle + ' m-' + (materialApplies() ? S.c.material : 'none') + ' f-' + S.c.focus + ' a-' + S.c.apps + ' i-' + S.c.iconStyle + ' u-' + S.c.controls + ' clock-' + S.c.clockPos + (S.c.clockPos !== 'corner' ? ' clock-big' : '') + ' top-' + S.c.topStyle + ' tone-' + shown.tone + ' tr-' + tr + ' br-' + br + wallClasses(shown) + inkRungClasses(palette, adaptive) + ' at-' + t.id + (Date.now() < sheetOpenUntil ? ' sheet-opening' : '') + ' look-' + S.c.settingsLook + ' font-' + homeFont() + (homeFont() !== 'manrope' ? ' font-custom' : '') + (S.fontSwitch ? ' is-font-switch' : '') + (adaptive ? ' has-adaptive-ink adaptive-tl-' + palette.tl.pol : '') + (!adaptive && shown.clockInk ? ' has-clock-ink' : '') + (!adaptive && shown.dockClockInk ? ' has-dock-clock-ink' : '') + (registeredMaterial(shown.id) ? ' registered-material' : '') + (sheet ? ' is-sheet' : '') + (t.id === 'wifiqr' ? ' is-wifi-qr' : '') + (t.id === 'appearance' && !PREVIEW_GROUPS[t.group] ? ' no-preview' : '') + (S.hdmiInApp ? ' is-hdmi-input' : '') + (S.reflow ? ' is-reflow' : '');
    if (!adaptive && shown.clockInk) stage.style.setProperty('--clock-ink', shown.clockInk);
    else stage.style.removeProperty('--clock-ink');
    if (!adaptive && shown.dockClockInk) stage.style.setProperty('--dock-clock-ink', shown.dockClockInk);
    else stage.style.removeProperty('--dock-clock-ink');
    applyHomeFont();
    if (!sheet) renderHome(t);
    renderSheet(t, sheet);
    renderAppearance(t);
    renderPivotHead(t);
    renderWifiOverlay(t);
    renderNowPlayingOverlay(t);
    renderFocusStatus(t);
    if (alexaToast) { if (alexa.toast && alexaToast.textContent !== alexa.toast) alexaToast.textContent = alexa.toast; alexaToast.className = 'alexa-toast' + (alexa.toast ? ' is-on' : ''); }
    syncVideo();
  }

  function drawQr(target, payload) {
    var qr = qrcode(0, 'M'), n, cell, ctx = target.getContext('2d'), size = target.width, r, c;
    qr.addData(payload); qr.make(); n = qr.getModuleCount(); cell = size / (n + 8);
    ctx.fillStyle = '#ffffff'; ctx.fillRect(0, 0, size, size); ctx.fillStyle = '#0e0a06';
    for (r = 0; r < n; r++) for (c = 0; c < n; c++) if (qr.isDark(r, c)) ctx.fillRect((c + 4) * cell, (r + 4) * cell, Math.ceil(cell), Math.ceil(cell));
  }
  /* The QR code is drawn once per network payload, ahead of time, so opening the overlay
     only changes opacity and transform. */
  var wifiQrDrawn = '';
  function drawWifiQrCanvas() {
    var payload, qr, n, cells, size, cell, ctx, r, c, x, y;
    if (!window.qrcode || !wifiQrCanvas) return;
    payload = wifiQrPayload();
    if (payload === wifiQrDrawn) return;
    wifiQrDrawn = payload;
    qr = qrcode(0, 'M');
    qr.addData(payload);
    qr.make();
    n = qr.getModuleCount();
    cells = n + 8;
    size = 388;
    cell = size / cells;
    ctx = wifiQrCanvas.getContext('2d');
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, 420, 420);
    ctx.fillStyle = '#0e0a06';
    for (r = 0; r < n; r++) for (c = 0; c < n; c++) {
      if (!qr.isDark(r, c)) continue;
      x = 16 + (c + 4) * cell;
      y = 16 + (r + 4) * cell;
      ctx.fillRect(x, y, Math.ceil(cell), Math.ceil(cell));
    }
  }
  function renderWifiOverlay(t) {
    var on = t.id === 'wifiqr';
    if (!wifiQrEl) return;
    if (wifiReady()) drawWifiQrCanvas();
    // The backdrop is the pre-blurred panel image already loaded for Settings: no live blur.
    if (wifiQrBg && S.c.bg === 'photo' && IMG.bg.src && wifiQrBg._src !== IMG.bg.src) { wifiQrBg._src = IMG.bg.src; wifiQrBg.src = IMG.bg.src; }
    if (wifiQrSsid.textContent !== S.c.wifiSsid) wifiQrSsid.textContent = S.c.wifiSsid;
    wifiQrEl.className = 'wifi-qr-overlay' + (on ? ' is-on' : '');
    wifiQrEl.setAttribute('aria-hidden', on ? 'false' : 'true');
  }
  var npOverlay = $('npOverlay'), npBg = $('npBg'), npStage = $('npStage'), npSlots = null;
  function renderNowPlayingOverlay(t) {
    var on = t.id === 'nowplaying';
    if (!npOverlay) return;
    if (on && !npSlots) {
      npStage.innerHTML = FRAMES.nowplaying(t); npSlots = {};
      Array.prototype.forEach.call(npStage.querySelectorAll('[data-slot]'), function (el) { npSlots[el.getAttribute('data-slot')] = el; });
    }
    if (npBg && S.c.bg === 'photo' && IMG.bg.src && npBg._src !== IMG.bg.src) { npBg._src = IMG.bg.src; npBg.src = IMG.bg.src; }
    /* While closing, the last content stays and fades out with the overlay. */
    if (on) FILLS.nowplaying(t, npSlots);
    npOverlay.className = 'np-overlay' + (on ? ' is-on' : '');
    npOverlay.setAttribute('aria-hidden', on ? 'false' : 'true');
  }
  function wifiDraftDisplay(t) {
    if (t.field === 'pass' || t.field === 'bkpass') return t.draft ? Array(t.draft.length + 1).join('•') : T(t.field === 'bkpass' ? 'Choose a pass-phrase' : 'No password');
    if (t.field === 'group') return t.draft || T('Group name');
    if (t.field === 'swname') return t.draft || T('Name on Home');
    if (t.field === 'calname') return t.draft || T('For example: Ági');
    return t.draft || T('Network name');
  }

  function applyHomeFont() {
    var id = homeFont(), f = FONTS[id], primary = fontRole(id, 'primary'), ui = fontRole(id, 'ui'), metrics = fontMetrics[id];
    if (appliedFont === id && appliedFontMetrics === metrics) return;
    appliedFont = id; appliedFontMetrics = metrics;
    var values = { 'display-family': '"' + f.family + '"', 'ui-family': '"' + ui.family + '"', 'primary-family': '"' + primary.family + '"', 'display-weight': f.display, 'ui-weight': ui.weight, 'primary-weight': primary.weight, 'clock-weight': f.clock,
      'clock-shift': (fontShift('clock', 48) / 48).toFixed(4) + 'em', 'utility-shift': px(fontShift('ui', 28)), 'action-shift': px(fontShift('ui', 30)), 'heading-shift': px(fontShift('ui', 48)), 'full-name-shift': px(fontShift('primary', 30)), 'clock-digit': (metrics ? metrics.digitCell / 48 : 0).toFixed(4) + 'em' };
    Object.keys(values).forEach(function (key) { homeEl.style.setProperty('--font-' + key, String(values[key])); });
  }

  function homeState(t) {
    var h = S.c.home, hs = { mode: 'browse', zone: null, i: Math.max(0, ensureSel()), u: -1, lifted: false, from: -1, arr: null, items: h.map(function (id) { return { key: id, kind: 'app', id: id }; }) };
    if (isSettingsDetail(t)) hs.zone = 'preview';
    else if (t.id === 'home') { hs.zone = t.f.zone; hs.u = t.f.u; }
    return hs;
  }

  /* Each part of Home is drawn on its own: an error in one (say the song widget) must not leave the
     others, such as the Alexa switches, showing an old state. The error is kept for Device details. */
  var drawErr = { text: '', at: 0 };
  function noteError(where, e) {
    drawErr.text = where + ': ' + (e && (e.message || e) || 'error') + (e && e.lineNumber ? ' (line ' + e.lineNumber + ')' : '');
    drawErr.at = Date.now();
    try { if (window.console && console.error) console.error(e); } catch (x) { /* nothing */ }
  }
  window.addEventListener('error', function (ev) { if (!(ev.error && ev.error.noted)) noteError('script', { message: ev.message, lineNumber: ev.lineno }); });
  /* The error is still thrown afterwards (on its own), so it shows in the console and in the checks. */
  function guarded(where, fn) { try { fn(); } catch (e) { noteError(where, e); try { e.noted = true; } catch (x) { /* frozen */ } setTimeout(function () { throw e; }, 0); } }
  function renderHome(t) {
    var hs = homeState(t);
    guarded('caption', function () { renderCaption(t, hs); });
    guarded('switches', function () { renderUtils(hs); });
    guarded('music', function () { fitMusic(musicOnTop()); });
    renderDock(hs); keyLegend.style.bottom = (1080 - dockTopY + 18) + 'px'; alexaToast.style.bottom = (1080 - dockTopY + 18 + 64) + 'px';
  }

  /* Weather: Open-Meteo current conditions plus today's range, cached for an hour per place. */
  var WEATHER_PLACE = (window.FrameFork && window.FrameFork.weather) || { name: 'Budapest', latitude: 47.4979, longitude: 19.0402 };
  var WEATHER_KEY = 'cleanframe.weather.' + WEATHER_PLACE.latitude + ',' + WEATHER_PLACE.longitude, WEATHER_TTL = 3600000;
  var weather = { temp: null, code: null, day: true, high: null, low: null, at: 0 };
  /* Line icons on the 24-unit utility grid, drawn with the clock's ink. */
  var WX = {
    sun: '<circle cx="12" cy="12" r="4"/><path d="M12 2.5v2.2M12 19.3v2.2M2.5 12h2.2M19.3 12h2.2M5.3 5.3l1.6 1.6M17.1 17.1l1.6 1.6M5.3 18.7l1.6-1.6M17.1 6.9l1.6-1.6"/>',
    moon: '<path d="M19.5 14.6A7.8 7.8 0 0 1 9.4 4.5a7.8 7.8 0 1 0 10.1 10.1Z"/>',
    partly: '<path d="M8.6 7.6V5.2M4.1 9.4 2.4 8.6M5 4.6l1.3 1.3M13.1 4.6l-1.3 1.3"/><path d="M5.5 12.6a3.8 3.8 0 0 1 6.9-2.4"/><path d="M8.5 20h9.2a3.8 3.8 0 0 0 .3-7.6 5 5 0 0 0-9.6 1.2A3.2 3.2 0 0 0 8.5 20Z"/>',
    partlyNight: '<path d="M11.8 8.4A4.6 4.6 0 0 1 6 2.7a4.6 4.6 0 1 0 5.8 5.7Z"/><path d="M8.5 20h9.2a3.8 3.8 0 0 0 .3-7.6 5 5 0 0 0-9.6 1.2A3.2 3.2 0 0 0 8.5 20Z"/>',
    cloud: '<path d="M7 19h10.5a4.2 4.2 0 0 0 .4-8.4 5.8 5.8 0 0 0-11.1 1.6A3.5 3.5 0 0 0 7 19Z"/>',
    fog: '<path d="M7 14.5h10.5a4.2 4.2 0 0 0 .4-8.4 5.8 5.8 0 0 0-11.1 1.6"/><path d="M3.5 18h17M6.5 21h11"/>',
    rain: '<path d="M7 15h10.5a4.2 4.2 0 0 0 .4-8.4 5.8 5.8 0 0 0-11.1 1.6A3.5 3.5 0 0 0 7 15Z"/><path d="m8.5 17.5-1 3M12.5 17.5l-1 3M16.5 17.5l-1 3"/>',
    snow: '<path d="M7 15h10.5a4.2 4.2 0 0 0 .4-8.4 5.8 5.8 0 0 0-11.1 1.6A3.5 3.5 0 0 0 7 15Z"/><path d="M8 18.5h.1M12 20.5h.1M16 18.5h.1M10 21.5h.1M14 17.5h.1"/>',
    storm: '<path d="M7 15h10.5a4.2 4.2 0 0 0 .4-8.4 5.8 5.8 0 0 0-11.1 1.6A3.5 3.5 0 0 0 7 15Z"/><path d="m12.5 15-2.5 4h3.5l-2 3.5"/>'
  };
  /* WMO weather interpretation codes, as used by Open-Meteo. */
  function weatherIcon(code, day) {
    if (code === 0 || code === 1) return day ? 'sun' : 'moon';
    if (code === 2) return day ? 'partly' : 'partlyNight';
    if (code === 3) return 'cloud';
    if (code === 45 || code === 48) return 'fog';
    if (code >= 95) return 'storm';
    if (code >= 71 && code <= 77 || code === 85 || code === 86) return 'snow';
    if (code >= 51) return 'rain';
    return 'cloud';
  }
  function loadWeatherCache() {
    try {
      var s = JSON.parse(localStorage.getItem(WEATHER_KEY));
      if (s && typeof s.temp === 'number' && s.at > Date.now() - WEATHER_TTL) weather = s;
    } catch (e) { /* optional */ }
  }
  function saveWeatherCache() {
    try { localStorage.setItem(WEATHER_KEY, JSON.stringify(weather)); } catch (e) { /* optional */ }
  }
  function refreshWeather(done) {
    if (S.c.weather === 'off' || weather.at && Date.now() - weather.at < WEATHER_TTL && weather.temp !== null) { if (done) done(); return; }
    var xhr = new XMLHttpRequest();
    xhr.timeout = 8000;
    xhr.open('GET', 'https://api.open-meteo.com/v1/forecast?latitude=' + WEATHER_PLACE.latitude + '&longitude=' + WEATHER_PLACE.longitude
      + '&current=temperature_2m,weather_code,is_day&daily=temperature_2m_max,temperature_2m_min&forecast_days=1&timezone=auto', true);
    xhr.onload = function () {
      if (xhr.status >= 200 && xhr.status < 300) {
        try {
          var d = JSON.parse(xhr.responseText), now = d && d.current, daily = d && d.daily;
          if (now && typeof now.temperature_2m === 'number') {
            weather = { temp: Math.round(now.temperature_2m), code: typeof now.weather_code === 'number' ? now.weather_code : null, day: now.is_day !== 0,
              high: daily && daily.temperature_2m_max && typeof daily.temperature_2m_max[0] === 'number' ? Math.round(daily.temperature_2m_max[0]) : null,
              low: daily && daily.temperature_2m_min && typeof daily.temperature_2m_min[0] === 'number' ? Math.round(daily.temperature_2m_min[0]) : null,
              at: Date.now() };
            saveWeatherCache();
          }
        } catch (e) { /* optional */ }
      }
      if (done) done();
    };
    xhr.onerror = xhr.ontimeout = function () { if (done) done(); };
    try { xhr.send(); } catch (e) { if (done) done(); }
  }
  function weatherCaptionHtml() {
    if (S.c.weather === 'off' || weather.temp === null) return '';
    var html = '<span class="weather" aria-label="' + esc(T('{0} weather', WEATHER_PLACE.name)) + '">';
    if (weather.code !== null) html += '<svg class="ico wx-icon" viewBox="0 0 24 24" aria-hidden="true">' + WX[weatherIcon(weather.code, weather.day)] + '</svg>';
    html += '<span class="wx-temp">' + weather.temp + '°</span>';
    if (S.c.weather === 'day' && weather.high !== null && weather.low !== null) html += '<span class="wx-range">' + weather.high + '° / ' + weather.low + '°</span>';
    return html + '</span>';
  }
  function clockParts() {
    var d = new Date(), h = d.getHours(), m = d.getMinutes(), sec = d.getSeconds(), suffix = '';
    if (S.c.clock === '12') { suffix = h < 12 ? 'AM' : 'PM'; h = h % 12 || 12; }
    return { text: h + ':' + (m < 10 ? '0' : '') + m + (S.c.seconds === 'on' ? ':' + (sec < 10 ? '0' : '') + sec : ''), suffix: suffix };
  }
  var MONTHS = { en: ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'],
    hu: ['Január', 'Február', 'Március', 'Április', 'Május', 'Június', 'Július', 'Augusztus', 'Szeptember', 'Október', 'November', 'December'] };
  /* "15 November" in English, "November 15" in Hungarian. */
  function dateText() {
    var d = new Date(), month = (MONTHS[S.c.lang] || MONTHS.en)[d.getMonth()];
    return S.c.lang === 'hu' ? month + ' ' + d.getDate() : d.getDate() + ' ' + month;
  }
  /* ---------- Date details: Hungarian holidays, name days and your calendar ---------- */
  /* Holidays come from the public Nager.Date API (date.nager.at), cached per year; name days are bundled
     (assets/namedays-hu.js); the calendar is your own secret iCal address (assets/calendar.js). */
  var FC = window.FrameCalendar && CAL_PAGE ? window.FrameCalendar : null;
  var cal = { err: '', timer: null, pair: null, phase: 'idle', url: '', detail: '' }, holidays = {};
  function nameday(d) {
    var list = window.FrameNamedaysHU, m = d.getMonth(), day = d.getDate(), y = d.getFullYear(), leap = y % 4 === 0 && (y % 100 !== 0 || y % 400 === 0), names;
    if (!list) return '';
    /* In leap years 24 February is the leap day and the names of 24-28 move one day later. */
    if (leap && m === 1) { if (day === 24) return ''; if (day > 24) day -= 1; }
    names = list[m] && list[m][day - 1] || [];
    return names.slice(0, 3).join(', ');
  }
  function holidayKey(y) { return 'cleanframe.holidays.HU.' + y; }
  var holidayTried = {};
  function loadHolidays(y, done) {
    var cached = null;
    if (holidays[y]) { if (done) done(); return; }
    try { cached = JSON.parse(localStorage.getItem(holidayKey(y)) || 'null'); } catch (e) { cached = null; }
    if (cached && cached.list) { holidays[y] = cached.list; if (done) done(); return; }
    holidayTried[y] = Date.now();
    var x = new XMLHttpRequest();
    x.open('GET', 'https://date.nager.at/api/v3/PublicHolidays/' + y + '/HU', true); x.timeout = 10000;
    x.onload = function () {
      var list = null;
      try { list = JSON.parse(x.responseText); } catch (e) { list = null; }
      if (x.status === 200 && Array.isArray(list)) {
        holidays[y] = list.map(function (h) { return { date: String(h.date), name: String(h.localName || h.name || '') }; });
        try { localStorage.setItem(holidayKey(y), JSON.stringify({ list: holidays[y] })); } catch (e) { /* cache only */ }
      }
      if (done) done();
    };
    x.onerror = x.ontimeout = function () { if (done) done(); };
    try { x.send(); } catch (e) { if (done) done(); }
  }
  function holidayToday(d) {
    var y = d.getFullYear(), key, hit = '';
    /* A new year (or an earlier failure, retried hourly) loads that year's list. */
    if (!holidays[y] && !(Date.now() - (holidayTried[y] || 0) < 3600000)) loadHolidays(y, function () { if (holidays[y]) setTimeout(render, 0); });
    key = y + '-' + (d.getMonth() < 9 ? '0' : '') + (d.getMonth() + 1) + '-' + (d.getDate() < 10 ? '0' : '') + d.getDate();
    (holidays[y] || []).forEach(function (h) { if (h.date === key) hit = h.name; });
    return hit;
  }
  /* The date line: the date (when on), today's holiday and today's name days. */
  function dateLineHtml() {
    var parts = [];
    if (S.c.date === 'on') parts.push(esc(dateText()));
    return parts.length ? '<span class="cap-date">' + parts.join('<span class="cap-dot"> · </span>') + '</span>' : '';
  }
  function fmtHM(t) { var d = new Date(t), h = d.getHours(), m = d.getMinutes(); if (S.c.clock === '12') h = h % 12 || 12; return h + ':' + (m < 10 ? '0' : '') + m; }
  /* Under the date and weather, one soft glass panel holds what today brings, each on its own line:
     the Hungarian holiday, the name days, then the calendar events (now and next today, otherwise
     tomorrow's first). With more than one calendar each event carries its calendar's colour and name.
     The panel is only as tall as its lines and is not drawn when there is nothing to show. */
  /* Dot colours a calendar can have (Date details → the calendar → Colour); by default the first
     calendar is blue, the second pink, the third green. */
  /* Soft pastels: on Home they only tint the name chip (36 % over the glass), with the panel's light text on it. */
  var CAL_PALETTE = [['blue', '#9db8e8', 'Blue'], ['pink', '#e7b3c8', 'Pink'], ['green', '#a9d3b8', 'Green'], ['yellow', '#e9d39c', 'Yellow'],
    ['orange', '#e8b896', 'Orange'], ['red', '#e3a3a0', 'Red'], ['purple', '#c4b2e6', 'Purple'], ['teal', '#9fd0cf', 'Teal'], ['white', '#e9e4da', 'White']];
  function calTint(hex, alpha) { var n = parseInt(hex.slice(1), 16); return 'rgba(' + (n >> 16 & 255) + ', ' + (n >> 8 & 255) + ', ' + (n & 255) + ', ' + alpha + ')'; }
  function calColour(name, index) {
    var i, hit = null;
    for (i = 0; i < CAL_PALETTE.length; i++) if (CAL_PALETTE[i][0] === name) hit = CAL_PALETTE[i];
    return (hit || CAL_PALETTE[index % 3])[1];
  }
  function calColourName(name, index) {
    var i;
    for (i = 0; i < CAL_PALETTE.length; i++) if (CAL_PALETTE[i][0] === name) return CAL_PALETTE[i][0];
    return CAL_PALETTE[index % 3][0];
  }
  /* Today's events that are still on (all-day ones count all day), at most three. From 18:00 tomorrow's
     first two follow under a "Tomorrow" heading, with at most two of today's above them; when today has
     nothing left, tomorrow's first three show at any time. */
  var CAL_EVENING = 18;
  function calendarEvents(at) {
    var now = at || Date.now(), day = new Date(now), end, today, next, evening;
    if (!FC || !FC.connected() || S.c.calShow === 'off') return { today: [], tomorrow: [] };
    end = new Date(day.getFullYear(), day.getMonth(), day.getDate() + 1).getTime();
    today = FC.upcoming(now, end).filter(function (e) { return e.end > now || e.allDay; });
    evening = day.getHours() >= CAL_EVENING;
    if (today.length && !evening) return { today: today.slice(0, 3), tomorrow: [] };
    next = FC.upcoming(end, end + 86400000).filter(function (e) { return e.start >= end || e.allDay; });
    return today.length ? { today: today.slice(0, 2), tomorrow: next.slice(0, 2) } : { today: [], tomorrow: next.slice(0, 3) };
  }
  QA.calendarEvents = function (at) { var ev = calendarEvents(at); return { today: ev.today.map(function (e) { return e.title; }), tomorrow: ev.tomorrow.map(function (e) { return e.title; }) }; };
  function calName(e) { return e.calName || T('Calendar {0}', e.calIndex + 1); }
  /* The day panel, in sections split by thin lines: the holiday (warm) and the name days; then TODAY
     and, when there are any, TOMORROW, each with its events. Events sit in one grid so the calendar
     names, times and titles line up in columns; with several calendars each event starts with its
     calendar's name on a chip in the calendar's colour. All-day events say so in the time column.
     Sections with nothing in them are left out. */
  function dayPanelHtml() {
    var d = new Date(), h = S.c.holidays === 'on' ? holidayToday(d) : '', n = S.c.namedays === 'on' ? nameday(d) : '', ev = calendarEvents(), many = FC && FC.list && FC.list().length > 1;
    var top = '', cells = '';
    if (h) top += '<span class="cap-row cap-holiday">' + esc(h) + '</span>';
    if (n) top += '<span class="cap-row cap-nameday" aria-label="' + esc(T('Name day: {0}', n)) + '">' + esc(n) + '</span>';
    function eventRow(e) {
      return '<span class="cap-row cap-cal">' + (many ? '<span class="cap-cal-who" style="background:' + calTint(calColour(e.calColour, e.calIndex), 0.36) + ';box-shadow:inset 0 0 0 1px ' + calTint(calColour(e.calColour, e.calIndex), 0.55) + '">' + esc(calName(e)) + '</span>' : '')
        + (e.allDay ? '<span class="cap-cal-time is-allday">' + esc(T('All day')) + '</span>' : '<b class="cap-cal-time">' + fmtHM(e.start) + '</b>') + '<span class="cap-cal-title">' + esc(e.title || T('Busy')) + '</span></span>';
    }
    function section(label, list) { return list.length ? (cells ? '<span class="cap-sep" aria-hidden="true"></span>' : '') + '<span class="cap-row cap-when">' + esc(T(label)) + '</span>' + list.map(eventRow).join('') : ''; }
    cells += section('Today', ev.today);
    cells += section('Tomorrow', ev.tomorrow);
    if (!top && !cells) return '';
    return '<span class="cap-panel">' + (top ? '<span class="cap-day">' + top + '</span>' : '') + (top && cells ? '<span class="cap-sep" aria-hidden="true"></span>' : '')
      + (cells ? '<span class="cap-events' + (many ? ' has-who' : '') + '">' + cells + '</span>' : '') + '</span>';
  }
  function calendarPoll(when) {
    clearTimeout(cal.timer); cal.timer = null;
    if (!FC || !FC.connected() || document.hidden) return;
    cal.timer = setTimeout(function () {
      cal.timer = null;
      FC.refresh(function (err) { cal.err = err || ''; render(); calendarPoll(15 * 60 * 1000); });
    }, when === true ? 0 : typeof when === 'number' ? when : 15 * 60 * 1000);
  }
  function dateDetails() {
    if (S.c.holidays === 'on') { loadHolidays(new Date().getFullYear(), function () { render(); }); }
    calendarPoll(true);
  }
  /* Date details: holidays and name days. Calendars are set up under Connections (0.42); a row here says
     so and takes you there. */
  function dateinfoSections() {
    var sections = [
      { id: 'holidays', title: T('Hungarian holidays'), horizontal: true, items: options('holidays', PREF_VALUES.holidays) },
      { id: 'namedays', title: T('Name days'), horizontal: true, items: options('namedays', PREF_VALUES.namedays) }
    ];
    function options(axis, values) { return values.map(function (v) { return choice(axis, v); }); }
    if (FC) sections.push({ id: 'calendarlink', title: T('Calendars'), items: [{ action: 'dateinfo.calendars', label: T('Calendars'), description: T('Set in Connections') }] });
    return sections;
  }
  /* Connections → Calendar: whether events show on Home, the calendars (name, colour, disconnect) and adding one. */
  function calendarSections() {
    function options(axis, values) { return values.map(function (v) { return choice(axis, v); }); }
    if (!FC.connected()) return [{ id: 'calendar', title: T('Calendar'), items: [{ action: 'calendar.connect', label: T('Connect a calendar'), description: T('Google or Outlook, from your phone') }] }];
    return [{ id: 'calShow', title: T('Calendar on Home'), horizontal: true, items: options('calShow', PREF_VALUES.calShow) },
      { id: 'calendars', title: T('Calendars'), items: FC.list().map(function (c) { return { action: 'calendar.item.' + c.id, label: c.name || T('Calendar {0}', c.index + 1), description: c.name ? '' : T('Give it a name') }; })
        .concat(FC.list().length < FC.max ? [{ action: 'calendar.connect', label: T('Add another calendar') }] : []),
        reason: cal.err ? T('Couldn’t read the calendar ({0}).', cal.err) : FC.loadedAt() ? T('Read at {0}', fmtHM(FC.loadedAt())) : T('Reading…') }];
  }
  /* From Date details to Connections → Calendar, as if opened from the Settings overview, so Back leads
     through Connections to Settings. */
  function openCalendarSettings() {
    var t;
    cancelLook(); S.err = null;
    while (S.stack.length > 1 && (t = top()) && t.id !== 'settings') pop();
    if (top().id === 'settings') top().f.id = 'connections';
    S.settingsFocus = 'connections';
    openAppearance('connections'); openAppearance('calendar');
  }
  function dateInfoSummary() {
    var on = [];
    if (S.c.holidays === 'on') on.push(T('Holidays')); if (S.c.namedays === 'on') on.push(T('Name days')); if (FC && FC.connected()) on.push(T('Calendar'));
    return on.length ? on.join(', ') : T('Off');
  }
  function calendarForget() { FC.forget(S.forgetCal || undefined); S.forgetCal = null; if (!FC.connected()) clearTimeout(cal.timer); cal.err = ''; if (top().id === 'alexalist' && top().mode === 'calendar') pop(); render(); }
  function calById(id) { return FC ? FC.list().filter(function (c) { return c.id === id; })[0] : null; }
  function openCalName(id) {
    var c = calById(id);
    if (!c) return;
    push({ id: 'wifitype', field: 'calname', target: id, draft: c.name || '', chars: NAME_CHARS, max: 16, f: { zone: 'char', ci: 0, ai: 0 } });
  }
  /* ---------- Clock styles: Classic (the font), Thin and LED (drawn as SVG), Flip (cards) ---------- */
  /* Thin numerals: single-stroke geometric digits in a 60 x 100 box, drawn with currentColor. */
  var THIN = {
    '0': '<rect x="7" y="4" width="46" height="92" rx="23"/>',
    '1': '<path d="M18 20 34 5v91"/>',
    '2': '<path d="M9 26C9 12 19 4 31 4s22 9 22 22c0 14-11 24-44 70h45"/>',
    '3': '<path d="M10 15c4-7 11-11 20-11 13 0 21 8 21 21s-10 21-24 21c15 0 27 9 27 25 0 16-11 25-25 25-10 0-18-5-22-13"/>',
    '4': '<path d="M42 96V4L5 69h51"/>',
    '5': '<path d="M50 4H15l-4 42c5-5 12-8 20-8 14 0 23 12 23 28 0 18-11 30-25 30-10 0-18-5-22-13"/>',
    '6': '<path d="M47 11c-5-5-10-7-17-7C15 4 7 22 7 50c0 30 8 46 23 46 14 0 24-11 24-26S44 44 30 44c-11 0-19 6-23 18"/>',
    '7': '<path d="M6 4h48L22 96"/>',
    '8': '<circle cx="30" cy="25" r="21"/><circle cx="30" cy="71" r="25"/>',
    '9': '<path d="M13 89c5 5 10 7 17 7 15 0 23-18 23-46C53 20 45 4 30 4 16 4 6 15 6 30s10 26 24 26c11 0 19-6 23-18"/>'
  };
  /* LED: seven segments; unlit ones stay faintly visible, like a real display. */
  var SEG_ON = { '0': 'abcdef', '1': 'bc', '2': 'abged', '3': 'abgcd', '4': 'fgbc', '5': 'afgcd', '6': 'afgedc', '7': 'abc', '8': 'abcdefg', '9': 'abcdfg' };
  function hSeg(y) { return '12,' + y + ' 16,' + (y - 4) + ' 44,' + (y - 4) + ' 48,' + y + ' 44,' + (y + 4) + ' 16,' + (y + 4); }
  function vSeg(x, a, b) { return x + ',' + a + ' ' + (x + 4) + ',' + (a + 4) + ' ' + (x + 4) + ',' + (b - 4) + ' ' + x + ',' + b + ' ' + (x - 4) + ',' + (b - 4) + ' ' + (x - 4) + ',' + (a + 4); }
  var SEGS = { a: hSeg(8), g: hSeg(50), d: hSeg(92), f: vSeg(8, 10, 48), b: vSeg(52, 10, 48), e: vSeg(8, 52, 90), c: vSeg(52, 52, 90) };
  function ledDigit(d) {
    return '<svg class="clock-glyph" viewBox="0 0 60 100" aria-hidden="true">' + 'abcdefg'.split('').map(function (k) {
      return '<polygon class="' + (SEG_ON[d].indexOf(k) >= 0 ? 'on' : 'off') + '" points="' + SEGS[k] + '"/>';
    }).join('') + '</svg>';
  }
  function thinDigit(d) { return '<svg class="clock-glyph" viewBox="0 0 60 100" aria-hidden="true">' + THIN[d] + '</svg>'; }
  function sepGlyph() { return '<svg class="clock-sep" viewBox="0 0 20 100" aria-hidden="true"><circle cx="10" cy="32" r="5"/><circle cx="10" cy="70" r="5"/></svg>'; }
  /* Flip: one card per digit. The caption holds an empty clock; patchClock fills it and, for a flip
     clock, rewrites only the cards whose digit changed, so the fold always starts on time. */
  var flip = { at: 0 };
  function flipCard(digit, old) {
    var turn = old !== undefined && old !== digit;
    return '<span class="flip-half flip-top"><b>' + digit + '</b></span><span class="flip-half flip-bottom"><b>' + (turn ? old : digit) + '</b></span>'
      + (turn ? '<span class="flip-half flip-top flip-leaf-top"><b>' + old + '</b></span><span class="flip-half flip-bottom flip-leaf-bottom"><b>' + digit + '</b></span>' : '');
  }
  function flipCards(text) {
    return '<span class="flip-clock">' + text.split('').map(function (ch) {
      return ch === ':' ? '<span class="flip-sep" aria-hidden="true"><i></i><i></i></span>' : '<span class="flip" data-d="' + ch + '" aria-hidden="true">' + flipCard(ch) + '</span>';
    }).join('') + '</span>';
  }
  function patchFlip(el) {
    var parts = clockParts(), shape = parts.text.replace(/\d/g, '0') + '|' + parts.suffix + '|' + S.c.lang, cards, digits = parts.text.replace(/\D/g, ''), i;
    if (el._flipShape !== shape || !el.querySelector('.flip-clock')) {
      el.innerHTML = clockHtml(); el._flipShape = shape; el._html = ''; return;
    }
    cards = el.querySelectorAll('.flip');
    for (i = 0; i < cards.length; i++) {
      if (cards[i].getAttribute('data-d') === digits.charAt(i)) continue;
      cards[i].innerHTML = flipCard(digits.charAt(i), cards[i].getAttribute('data-d'));
      cards[i].setAttribute('data-d', digits.charAt(i));
    }
  }
  function styledTime(text) {
    var st = S.c.clockStyle;
    if (st === 'flip') return flipCards(text);
    if (st === 'thin' || st === 'led') return '<span class="clock-svg clock-' + st + '">' + text.split('').map(function (ch) { return ch === ':' ? sepGlyph() : st === 'led' ? ledDigit(ch) : thinDigit(ch); }).join('') + '</span>';
    return null;
  }
  /* Only the time is repainted each second or minute, never the whole caption. */
  function patchClock() {
    var els = caption.querySelectorAll('.clock'), html, i;
    for (i = 0; i < els.length; i++) {
      if (S.c.clockStyle === 'flip') { patchFlip(els[i]); continue; }
      html = html || clockHtml();
      if (els[i]._html !== html) { els[i].innerHTML = html; els[i]._html = html; els[i]._flipShape = ''; }
    }
  }
  function clockHtml() {
    var parts = clockParts(), text = styledTime(parts.text) || parts.text, metrics = fontMetrics[homeFont()], suffix;
    if (S.c.clockStyle === 'classic' && metrics && metrics.digitCell) text = text.replace(/[0-9]/g, function (digit) { return '<span class="clock-digit">' + digit + '</span>'; });
    if (!parts.suffix) return text;
    // Hungarian writes the period first ("du. 3:07"); English after ("3:07 PM").
    suffix = '<span class="clock-period">' + esc(T(parts.suffix)) + '</span>';
    return S.c.lang === 'hu' ? suffix + text : text + suffix;
  }
  function renderCaption(t, hs) {
    var ch = '';
    var weatherHtml = weatherCaptionHtml() + readingsCaptionHtml(), date = dateLineHtml(), html;
    // Centred: date and weather share one smaller line under the clock. Corner: the date is a quiet second line.
    if (S.c.clockPos !== 'corner') html = '<span class="caption-head"><span class="clock">' + ch + '</span>' + (date || weatherHtml ? '<span class="caption-sub">' + date + weatherHtml + '</span>' : '') + '</span>';
    else html = '<span class="caption-head"><span class="clock">' + ch + '</span>' + weatherHtml + '</span>' + date;
    html += dayPanelHtml();
    /* With the clock in the centre, the song sits alone in the top-left corner. */
    var musicInCorner = musicOnTop();
    if (musicInCorner) setHTML(musicEl, musicHtml(hs.zone === 'music'));
    else { setHTML(musicEl, ''); html += musicHtml(hs.zone === 'music'); }
    setHTML(keyLegend, keyLegendHtml());
    keyLegend.className = 'key-legend' + (legendOn() && legendRows().length ? ' is-on' : '');
    caption.setAttribute('data-weather', S.c.weather === 'off' || weather.temp === null ? '' : String(weather.temp));
    if (S.c.apps !== 'icons' && S.c.clockPos === 'corner' && hs.items[hs.i] && hs.zone === 'apps' && reducedDockLabel(hs.items[hs.i].id)) html += '<span class="cap-line full-name">' + esc(app(hs.items[hs.i].id).name) + '</span>';
    setHTML(caption, html);
    patchClock();
    fitMusic(musicInCorner);
  }

  function utilBtn(z, i, action, inner, extra, name) {
    return '<button type="button" tabindex="-1" class="u' + (extra || '') + '" data-z="' + z + '" data-i="' + i + '" data-action="' + action + '" aria-label="' + esc(name) + '"><span class="u-content">' + inner + '</span></button>';
  }
  function renderUtils(hs) {
    var html = '', style = hs.mode === 'arrange' && S.c.controls !== 'text' ? 'both' : S.c.controls;
    var iconsOnly = style === 'icons', U = utils(), focused = null;
    utilsEl.className = 'utils quiet-utils is-' + style + (hs.zone === 'util' || hs.zone === 'ctl' ? ' is-awake' : '');
    var grouped = false;
    /* Wi-Fi, All apps and Settings share one frame; each Alexa switch is its own tile. */
    U.forEach(function (u, i) {
      var isSw = /^sw\d+$/.test(u);
      if (isSw && grouped) { html += '</span>'; grouped = false; }
      if (!isSw && !grouped) { html += '<span class="u-group">'; grouped = true; }
      if (isSw) {
        var sw = liveTargets()[+u.slice(2)], lit = targetPower(sw.id) === true;
        /* Alexa switches have their own style (Settings → Layout); icons only uses the focus label. */
        html += utilBtn('util', i, 'util.' + u, icon(switchIcon(sw.id) === 'light' ? (lit ? 'lampOn' : 'lamp') : switchIcon(sw.id), '', true) + '<span class="u-label">' + esc(targetName(sw)) + '</span><span class="sw-track" aria-hidden="true"></span>', ' u-lamp sw-' + S.c.switchStyle + (lit ? ' is-lit' : '') + (S.c.switchStyle === 'icons' ? ' u-compact' : ''), switchLabel(sw));
        return;
      }
      html += utilBtn('util', i, 'util.' + u, icon(UTIL[u][1], '', true) + '<span class="u-label">' + esc(T(UTIL[u][0])) + '</span>', '', T(UTIL[u][0]));
    });
    if (grouped) html += '</span>';
    setHTML(utilsEl, html);
    Array.prototype.forEach.call(utilsEl.querySelectorAll('.u'), function (b) {
      var z = b.getAttribute('data-z'), focus = hs.zone === z && hs.u === Number(b.getAttribute('data-i'));
      b.className = b.className.replace(/\s+is-focus/g, '') + (focus ? ' is-focus' : '');
      if (focus) focused = b;
    });
    /* Icons only: no name under the focused icon while moving (only a save error is spelled out). */
    renderUtilFocusLabel(focused && S.err && (/ u-compact/.test(focused.className) || iconsOnly && !/ u-lamp/.test(focused.className)) ? focused : null);
  }
  function renderUtilFocusLabel(button) {
    var text, key, r, sr, scale, width, x;
    if (!button) { utilFocusLabel.className = 'util-focus-label'; utilFocusKey = ''; return; }
    text = S.err ? T('Not saved. OK tries again.') : button.getAttribute('aria-label');
    key = button.getAttribute('data-action') + '|' + text + '|' + homeFont();
    if (key !== utilFocusKey) {
      utilFocusLabel.className = 'util-focus-label'; utilFocusLabel.textContent = text;
      utilFocusLabel.offsetWidth;
      utilFocusKey = key;
    }
    r = button.getBoundingClientRect(); sr = sceneEl.getBoundingClientRect(); scale = sr.width / 1920 || 1;
    width = Math.ceil(textWidth(text, 28, 500, -.2) + 8); x = (r.left + r.width / 2 - sr.left) / scale - width / 2;
    utilFocusLabel.style.width = width + 'px'; utilFocusLabel.style.left = clamp(x, 112, 1808 - width) + 'px';
    utilFocusLabel.style.top = ((S.c.topStyle === 'bar' ? 124 : 116) + fontShift('ui', 28)) + 'px';
    utilFocusLabel.className = 'util-focus-label is-on';
  }
  var dockTopY = 776;

  /* Everything on one shelf when it fits. Otherwise show five whole tiles and move the
     window one tile when focus passes an edge; the side cues show that more apps exist. */
  /* Tiles: the same row with a gap between separate tiles. */
  /* Modern dock: low tiles like the top bar's widgets. Both puts the name beside the icon, in tiles of one width. */
  /* Icons only keeps the tile row of Tiles, drawn at 80 % (the name rises in on focus); Both and Text
     use low tiles, seven Both tiles across. */
  var MODERN_MODES = { both: { tw: 236, th: 96, pitch: 246 }, text: { tw: 232, th: 96, pitch: 244 } }, MODERN_ICON_SCALE = 0.8;
  function modernScale() { return S.c.dockStyle === 'modern' && S.c.apps === 'icons' ? MODERN_ICON_SCALE : 1; }
  function dockMode() { var m = DOCK_MODES[S.c.apps]; return S.c.dockStyle === 'modern' && MODERN_MODES[S.c.apps] ? MODERN_MODES[S.c.apps] : S.c.dockStyle !== 'shelf' ? { tw: m.tw, th: m.th, pitch: m.pitch + 12 } : m; }
  function dockGeom(n) {
    var m = dockMode(), contentW = n > 0 ? (n - 1) * m.pitch + m.tw : 0, fits = n > 0 && contentW <= (S.c.dockStyle === 'modern' ? (modernScale() !== 1 ? 1760 / modernScale() : 1792) : S.c.dockStyle !== 'shelf' ? 1760 : 1696);
    var vis = fits ? n : Math.max(1, Math.min(S.c.dockStyle === 'modern' ? Math.floor((1792 + m.pitch - m.tw) / m.pitch) : 5, n)), shelfW = fits ? contentW : vis * m.pitch - 8, w = shelfW + 32;
    if (n < 0) { w = 912; shelfW = 880; vis = 0; }
    var g = { x: Math.round((1920 - w) / 2), y: DOCK_BOTTOM - m.th - 32, h: m.th + 32, w: w, shelf: shelfW, vis: vis, empty: n < 0, tw: m.tw, th: m.th, pitch: m.pitch, s: 1 };
    /* Modern dock: the tiles end 14 px above the bottom edge, like the top bar's widgets 14 px below the top. */
    if (S.c.dockStyle === 'modern') { g.s = modernScale(); g.y = Math.round(1080 - 14 + 16 * g.s - g.h); }
    return g;
  }
  /* An eased fade: solid glass up to `solid` %, then thinning out without a visible step. */
  var FADE_STEPS = [[0, 1], [.08, .92], [.17, .8], [.27, .65], [.37, .5], [.47, .36], [.57, .24], [.68, .14], [.79, .07], [.9, .025], [1, 0]];
  function fadeGradient(dir, solid, alpha, rgb) {
    return 'linear-gradient(' + dir + ',rgba(' + rgb + ',' + alpha + ') 0,' + FADE_STEPS.map(function (p) {
      return 'rgba(' + rgb + ',' + (alpha * p[1]).toFixed(3) + ') ' + (solid + (100 - solid) * p[0]).toFixed(1) + '%';
    }).join(',') + ')';
  }
  var bottomBarKey = '';
  function paintBottomBar(top) {
    var el = $('bottomBar'), solidH = 1080 - top - 2, h = solidH * 2, key = h + '|' + S.c.bg;
    if (!el || key === bottomBarKey) return;
    bottomBarKey = key;
    el.style.height = h + 'px';
    el.style.background = S.c.bg === 'dark' ? fadeGradient('0deg', solidH / h * 100, .07, '255,255,255') : fadeGradient('0deg', solidH / h * 100, .62, '12,16,18');
  }
  /* Where the (possibly scaled) dock is on screen; scaling is about the bottom centre. */
  function dockVisual(g) { var b = g.y + g.h; return { x: 960 + (g.x - 960) * g.s, y: b - g.h * g.s, w: g.w * g.s, h: g.h * g.s, map: function (x) { return 960 + (x - 960) * g.s; } }; }
  function dockOffset(n, i, g) {
    var first = clamp(scroll.first, 0, Math.max(0, n - g.vis));
    if (i < first) first = i;
    if (i > first + g.vis - 1) first = i - g.vis + 1;
    if (!S.reflow) scroll.first = first;
    return first * g.pitch;
  }
  /* Shorter names for the narrow Modern dock tiles. */
  var SHORT_NAMES = { 'Nintendo Switch': 'Nintendo', 'Nuvio Legacy': 'Nuvio' };
  function shortName(name) { return SHORT_NAMES[name] || name; }
  function dockTileHtml(it, full) {
    var a, body;
    if (it.kind === 'add') return '<span class="add">' + icon('plus') + '</span><span class="label">' + T(full ? 'Home is full' : 'Add app') + '</span>';
    a = app(it.id);
    var name = S.c.dockStyle === 'modern' && S.c.apps !== 'icons' ? shortName(a.name) : a.name;
    body = S.c.apps === 'text' ? '' : dockAppMark(a);
    if (S.c.apps !== 'text') body = '<span class="dock-icon' + (S.c.apps === 'icons' ? ' dock-icon-solo' : '') + '">' + body + '</span>';
    return body + (S.c.apps === 'icons' ? '<span class="label icon-name"><span class="label-ink">' + esc(a.name) + '</span></span>' : '<span class="label' + (S.c.apps === 'both' ? ' dock-label' : '') + '" style="font-size:' + dockLabelSize(a.id) + 'px' + (S.c.apps === 'text' ? ';top:' + (28 + fontShift('primary', dockLabelSize(a.id))) + 'px' : '') + '"><span class="label-ink">' + esc(name) + '</span></span>') + '<span class="nudge nudge-l">' + icon('left') + '</span><span class="nudge nudge-r">' + icon('right') + '</span>';
  }
  function renderDock(hs) {
    var items = hs.items, n = items.length, empty = hs.mode !== 'arrange' && !n, g = dockGeom(empty ? -1 : n);
    var anchor = clamp(hs.i, 0, Math.max(0, n - 1)), off = empty ? 0 : dockOffset(n, anchor, g);
    var full = hs.arr ? live(hs.arr.slots).length >= CAP : false, ns = hs.arr ? hs.arr.slots.length : n;
    /* With focus up in the Home controls or on the song, no tile looks selected; Down still returns to it. */
    var tileFocus = hs.zone === 'apps' || hs.zone === 'tiles', tileSel = hs.zone === 'act' || hs.zone === 'ctl' || hs.zone === 'preview';
    var focusItem = items[anchor], s, ax, label, width;

    dock.className = 'dock' + (empty ? ' is-empty' : '');
    dock.style.left = g.x + 'px'; dock.style.top = g.y + 'px'; dock.style.width = g.w + 'px'; dock.style.height = g.h + 'px';
    dock.style.setProperty('--tile-w', g.tw + 'px'); dock.style.setProperty('--tile-h', g.th + 'px'); dock.style.setProperty('--dock-h', g.h + 'px');
    dock.style.setProperty('--nudge-top', ((g.th - 48) / 2) + 'px');
    var vg = dockVisual(g);
    dock.style.transformOrigin = '50% 100%'; dock.style.transform = g.s !== 1 ? 'scale(' + g.s + ')' : '';
    dockAnchorCenter = vg.map(g.x + 16 + anchor * g.pitch - off + g.tw / 2); dockTopY = Math.round(vg.y);
    dockAction.style.top = (vg.y - 80) + 'px';
    if (S.c.dockStyle === 'modern') paintBottomBar(vg.y);
    IMG.mat.style.left = (-g.x) + 'px'; IMG.mat.style.top = (-g.y) + 'px';
    IMG.mat.style.transformOrigin = '960px ' + (g.y + g.h / 2) + 'px';
    matScrim.style.left = (-g.x) + 'px'; matScrim.style.top = (SCRIM_Y - g.y) + 'px';
    matScrim.style.transformOrigin = '960px ' + (g.y + g.h / 2 - SCRIM_Y) + 'px';
    shelf.style.width = g.shelf + 'px';

    keyed(track, empty ? [] : items, function (el, it, i) {
      var a = it.id ? app(it.id) : null, left = i * g.pitch, focus = tileFocus && i === anchor, sel = tileSel && i === anchor;
      var lifted = hs.lifted && i === anchor;
      setContent(el, it.kind + '|' + (it.id || '') + '|' + (it.id ? dockLabelSize(it.id) : full) + '|' + S.c.bg + '|' + S.c.apps + '|' + S.c.iconStyle + '|' + S.c.dockStyle + '|' + homeFont(), '<span class="tile-content">' + dockTileHtml(it, full) + '</span>');
      el.className = 'tile k-' + it.kind + (focus ? ' is-focus' : '') + (sel ? ' is-sel' : '') + (lifted ? ' is-lifted' : '')
        + (a && !a.mark ? ' is-text' : '') + (it.kind === 'add' && full ? ' is-full' : '') + (it.kind === 'app' && S.press === it.id ? ' is-press' : '')
        + (lifted && i === 0 ? ' no-l' : '') + (lifted && i >= ns - 1 ? ' no-r' : '');
      el.style.transform = 'translate3d(' + left + 'px,0,0)';
      el.setAttribute('role', 'button');
      if (a) el.setAttribute('aria-label', a.name);
      if (hs.mode === 'arrange') attrs(el, 'tile', i, 'arrange.' + (it.kind === 'add' ? 'add' : (it.kind === 'ph' ? 'placeholder.' : 'tile.') + it.id));
      else attrs(el, 'app', i, 'home.app.' + it.id);
    });
    track.style.transform = 'translate3d(' + (-off) + 'px,0,0)';
    plate.className = 'plate' + (!n || empty || hs.zone === null ? '' : hs.lifted ? ' on-lift' : tileFocus ? ' on-focus' : tileSel ? ' on-sel' : '');
    plate.style.transform = 'translate3d(' + (anchor * g.pitch) + 'px,0,0)';

    cueL.style.left = (vg.x - 72) + 'px'; cueR.style.left = (vg.x + vg.w + 24) + 'px';
    cueL.style.top = cueR.style.top = (vg.y + vg.h / 2 - 24) + 'px';
    cueL.className = 'cue' + (!empty && scroll.first > 0 ? ' is-on' : '');
    cueR.className = 'cue' + (!empty && scroll.first + g.vis < n ? ' is-on' : '');

    ax = g.x + 16 + anchor * g.pitch - off;
    if (hs.mode === 'arrange' && !hs.lifted && (hs.zone === 'tiles' || hs.zone === 'act') && focusItem && focusItem.kind !== 'add') {
      s = hs.arr.slots[anchor];
      label = T(s.removed ? 'Restore {0}' : 'Remove {0}', app(s.id).name); width = actionWidth(label);
      ax = clamp(vg.map(ax) + (g.tw * g.s - width) / 2, 112, 1808 - width);
      setHTML(dockAction, '<span>' + esc(label) + '</span>');
      dockAction.className = 'dock-action is-on' + (hs.zone === 'act' ? ' is-focus' : '');
      dockAction.style.width = width + 'px';
      dockAction.style.transform = 'translate3d(' + ax + 'px,0,0)';
      attrs(dockAction, 'act', anchor, 'arrange.' + (s.removed ? 'restore.' : 'remove.') + s.id);
    } else {
      dockAction.className = 'dock-action';
      dockAction.removeAttribute('data-z'); dockAction.removeAttribute('data-action');
    }
    setHTML(dockEmpty, empty ? '<p>' + T('No apps on Home') + '</p><button type="button" tabindex="-1" class="btn' + (hs.zone === 'empty' ? ' is-focus' : '') + '" data-z="empty" data-i="0" data-action="home.add-apps">' + icon('plus') + '<span>' + T('Add apps') + '</span></button>' : '');
  }

  /* Sheets: a frame is built once per view/mode; fill() updates its slots. Persistent
     scrollers let transforms animate. */
  /* Opening a sheet from Home (Settings, All apps, a message …) fades it in over Home and lets its content
     settle into place, like the Wi‑Fi QR card, instead of cutting. Opacity and transform only. */
  var sheetOpenTimer = null, sheetOpenUntil = 0;
  function renderSheet(t, sheet) {
    var v = V[t.id], key, wasHidden = sheetEl.hidden;
    sheetEl.hidden = !(sheet || isSettingsDetail(t));
    if (sheetEl.hidden && sheetOpenUntil) { clearTimeout(sheetOpenTimer); sheetOpenUntil = 0; stage.classList.remove('sheet-opening'); sheetEl.classList.remove('is-opening'); sheetEl.classList.remove('is-pre'); }
    if (wasHidden && !sheetEl.hidden) {
      /* The sheet waits invisible for two frames, so its content is laid out and painted before the fade
         starts; then only opacity and a translate animate, on layers of their own. */
      clearTimeout(sheetOpenTimer);
      sheetEl.classList.remove('is-opening'); sheetEl.classList.add('is-pre');
      sheetOpenUntil = Date.now() + 700; stage.classList.add('sheet-opening');
      var raf = window.requestAnimationFrame || function (f) { return setTimeout(f, 16); };
      raf(function () { raf(function () { sheetEl.classList.remove('is-pre'); sheetEl.classList.add('is-opening'); }); });
      sheetOpenTimer = setTimeout(function () { sheetEl.classList.remove('is-opening'); sheetEl.classList.remove('is-pre'); stage.classList.remove('sheet-opening'); }, 760);
    }
    sheetView.hidden = !sheet;
    if (sheet) sheetView.setAttribute('aria-modal', 'true');
    else sheetView.removeAttribute('aria-modal');
    sceneEl.setAttribute('aria-hidden', sheet || isSettingsDetail(t) ? 'true' : 'false');
    if (!sheet) { sheetView.innerHTML = ''; sheetKey = ''; return; }
    key = t.id + '|' + (t.mode || '') + '|' + (t.msg || '') + '|' + (t.field || '') + '|' + S.c.lang + '|' + S.c.bg;
    if (key !== sheetKey) {
      sheetView.innerHTML = FRAMES[t.id](t);
      sheetKey = key; slotEls = {};
      Array.prototype.forEach.call(sheetView.querySelectorAll('[data-slot]'), function (el) { slotEls[el.getAttribute('data-slot')] = el; });
    }
    if (t.id !== 'editor') sheetView.className = 'view';
    FILLS[t.id](t, slotEls);
  }
  /* Settings pages are cards of rows. The heading of each card, by page and section. */
  var CARD_HEADS = {
    background: { bg: 'Background', wall: 'Background', rotation: 'Background' },
    layout: { layout: 'Bottom bar: apps', apps: 'Bottom bar: apps', iconStyle: 'Bottom bar: apps', topStyle: 'Top bar: widgets and controls', controls: 'Top bar: widgets and controls', switchStyle: 'Top bar: widgets and controls' },
    typography: { clockStyle: 'Clock', font: 'Home text', focus: 'Focus', material: 'Focus', settingsLook: 'Settings' },
    focus: { clockStyle: 'Clock', font: 'Home text', focus: 'Focus', material: 'Focus', settingsLook: 'Settings' },
    region: { clock: 'Clock', clockPos: 'Clock', seconds: 'Clock', date: 'Date and weather', weather: 'Date and weather', dateinfo: 'Date and weather' },
    rotation: { mode: 'Rotation' },
    wifiqr: { ssid: 'Network', pass: 'Network', sec: 'Network' },
    system: { backup: 'Backup', thistv: 'This TV' }
  };
  /* Pages whose changes show on Home keep the live preview on the right; the others use the width. */
  var PREVIEW_GROUPS = { background: 1, layout: 1, typography: 1, focus: 1, region: 1, dateinfo: 1 };
  /* Sections with the same heading share one card, in the order the headings first appear. */
  function detailCards(t) {
    var heads = CARD_HEADS[t.group] || {}, cards = [], byHead = {};
    detailSections(t).forEach(function (section, n) {
      var head = heads[section.id] !== undefined ? T(heads[section.id]) : section.group || (isSelect(section) ? '' : section.title || ''), key = heads[section.id] !== undefined || section.group ? 'h:' + head : 's:' + n;
      if (!byHead[key]) { byHead[key] = { head: head, sections: [] }; cards.push(byHead[key]); }
      byHead[key].sections.push(section);
    });
    return cards;
  }
  function detailCardsHtml(t, command) {
    var cards = detailCards(t).map(function (c) { return { head: c.head, sections: c.sections, html: '' }; });
    cards.forEach(function (card) { card.sections.forEach(function (section) {
      card.html += isSelect(section) ? selectRowHtml(t, section, command) : section.items.map(function (item) { return linkRowHtml(t, item, command, section, card.head); }).join('')
        + (section.reason ? '<p class="set-note">' + esc(section.reason) + '</p>' : '');
    }); });
    return '<div class="set-scroll">' + cards.map(function (c) { return '<section class="set-card">' + (c.head ? '<h3 class="set-card-head">' + esc(c.head) + '</h3>' : '') + c.html + '</section>'; }).join('') + '</div>';
  }
  function optionLabel(item) { return item.axis && item.value === 'both' ? T('Icons and text') : item.label; }
  function selectRowHtml(t, section, command) {
    var it = selectItem(section), open = t.drop && t.drop.id === section.id, cur = section.items.filter(function (x) { return S.c[x.axis] === x.value; })[0];
    var value = cur ? optionLabel(cur) : '';
    return '<div class="set-select-wrap' + (open ? ' is-open' : '') + '">'
      + command(it, '<span class="set-label">' + esc(section.title || '') + '</span><span class="set-value">' + esc(value) + '</span>' + icon('down', 'set-chev'), 'set-row set-select')
      + '<div class="select-pop" role="radiogroup" aria-label="' + esc(section.title || '') + '">' + section.items.map(function (item, i) {
        var applied = S.c[item.axis] === item.value;
        return '<button type="button" tabindex="-1" class="setting-choice select-opt' + (open && t.drop.i === i ? ' is-focus' : '') + (applied ? ' is-applied' : '') + (item.disabled ? ' is-disabled' : '') + '" role="radio" aria-checked="' + applied + '" aria-disabled="' + !!item.disabled + '"'
          + ' data-drop="1" data-z="detail" data-i="0" data-id="' + item.action + '" data-action="' + item.action + '"><span class="setting-name">' + esc(optionLabel(item)) + '</span><span class="setting-tick" aria-hidden="true">' + (applied ? icon('check') : '') + '</span></button>';
      }).join('') + '</div>' + (section.reason ? '<p class="set-note">' + esc(section.reason) + '</p>' : '') + '</div>';
  }
  function linkRowHtml(t, item, command, section, head) {
    /* A one-item section reads as "Title  value": Wallpaper · Misty coast, Rotation · Fixed. */
    var titled = section && section.title && section.title !== head && (section.items.length === 1 || item.thumbnail);
    var label = titled ? section.title : item.label, value = titled ? item.label : item.description || '', body = '';
    body += '<span class="set-label">' + esc(label) + '</span>';
    if (item.phone) body += '<span class="setting-swatch setting-phone" aria-hidden="true">' + icon('phone') + '</span>';
    if (item.thumbnail) body += '<img class="setting-swatch" src="' + esc(wallAsset(S.c.wall, 'thumb')) + '" alt="">';
    body += (value ? '<span class="set-value">' + esc(value) + '</span>' : '') + icon('right', 'set-chev');
    return command(item, body, 'set-row set-link');
  }
  /* Long pages scroll so the focused row (or an open list) stays in view. */
  function placeDetailRows() {
    var box = appearanceRows, el = box.querySelector('.set-scroll'), f, max = box.clientHeight || 740, y = 0, top, bottom, r0;
    if (!el) return;
    f = el.querySelector('.set-select-wrap.is-open') || el.querySelector('.set-row.is-focus');
    if (f) {
      r0 = el.getBoundingClientRect(); var rf = f.getBoundingClientRect(), sc = (stage.getBoundingClientRect().width / 1920) || 1;
      top = (rf.top - r0.top) / sc; bottom = top + rf.height / sc + (f.classList.contains('is-open') ? f.querySelector('.select-pop').getBoundingClientRect().height / sc : 0);
      var card = f.closest ? f.closest('.set-card') : null, ctop = card ? (card.getBoundingClientRect().top - r0.top) / sc : top;
      if (bottom - ctop <= max - 8) top = ctop;
      y = box._scroll || 0; if (bottom - y > max - 8) y = bottom - max + 8; if (top - y < 0) y = top;
    }
    y = Math.max(0, Math.min(y, Math.max(0, Math.max(el.offsetHeight, (bottom || 0) + 8) - max)));
    box._scroll = y; el.style.transform = y ? 'translate3d(0,' + (-Math.round(y)) + 'px,0)' : '';
  }
  function renderAppearance(t) {
    appearanceEl.hidden = !isSettingsDetail(t);
    if (appearanceEl.hidden) { appearanceEl.removeAttribute('aria-modal'); return; }
    appearanceEl.setAttribute('aria-modal', 'true');
    if (t.id === 'wallpaper') { renderWallpaper(t); return; }
    V.appearance.norm(t);
    appearanceEl.className = 'appearance settings-v2 detail-' + t.group + (PREVIEW_GROUPS[t.group] ? '' : ' no-preview') + (metroOn() ? ' is-metro' : '') + (metroOn() && Date.now() < pivotSlide.until ? ' slide-' + pivotSlide.dir + (pivotSlide.n % 2) : '');
    appearanceRows.className = 'appearance-rows';
    /* With the Metro look the pivot header (renderPivotHead) shows the page's name instead. */
    appearanceTitle._html = null; appearanceTitle.textContent = T(DETAIL_NAMES[t.group]);
    var at = detailLocation(t), selected = at.item, error = S.lookError, status = '', hint;
    function command(item, inner, cls) {
      var applied = item.axis && S.c[item.axis] === item.value;
      var loading = !!(item.axis && S.pending && S.pending.target[item.axis] === item.value && S.pending.row === item.axis);
      return '<button type="button" tabindex="-1" class="setting-choice' + (cls ? ' ' + cls : '') + (t.f.action === item.action && !t.drop ? ' is-focus' : '') + (item.disabled ? ' is-disabled' : '') + (applied ? ' is-applied' : '') + (loading ? ' is-loading' : '') + '"'
        + (item.axis ? ' role="radio" aria-checked="' + !!applied + '"' : '') + ' aria-label="' + esc(item.axis && item.value === 'both' ? T('Icons and text') : item.label) + '" aria-disabled="' + !!item.disabled + '" aria-busy="' + loading + '"'
        + ' data-z="detail" data-i="0" data-id="' + item.action + '" data-action="' + item.action + '">' + inner
        + (item.axis ? '<span class="setting-tick" aria-hidden="true">' + (applied ? icon('check') : '') + '</span>' : '') + '</button>';
    }
    setHTML(appearanceBack, command({ action: 'settings.back', label: backLabel(t) }, icon('left') + '<span>' + backLabel(t) + '</span>', 'setting-back'));
    setHTML(appearanceRows, detailCardsHtml(t, command));
    placeDetailRows();
    if (S.pending) status = '<p>' + esc(S.pending.row === 'font' ? T('Loading {0}…', FONTS[S.pending.target.font].name) : T('Loading your choice…')) + '</p><p>' + T('Back cancels this change.') + '</p>';
    else if (error) {
      status = '<p class="setting-error">' + esc(error.type === 'save' ? T('Couldn’t save this change.') : error.type === 'font' ? T('Couldn’t load {0}.', FONTS[error.font].name) : T('Couldn’t load this appearance.')) + ' ' + T('Your current choice is kept.') + '</p>'
        + command({ action: 'settings.retry', label: T('Try again') }, '<span>' + T('Try again') + '</span>', 'setting-retry');
    }
    setHTML(appearanceStatus, status);
    hint = t.drop ? T('Apply · Back closes the list') : selected.select ? T('Show the choices') : '';
    if (!hint) hint = selected.disabled ? '' : selected.action === 'settings.back' ? T('Return to {0}', backLabel(t)) : T(selected.action === 'settings.retry' ? 'Retry this change' : selected.axis ? 'Apply selected setting' : selected.action === 'background.wallpaper' ? 'Choose a wallpaper' : selected.action === 'background.rotation' ? 'Choose a rotation interval' : selected.action === 'background.custom' || selected.action === 'alexa.connect' || selected.action === 'spotify.connect' ? 'Show the QR code' : /^(alexa\.list|conn)\./.test(selected.action) || selected.action === 'region.dateinfo' || selected.action === 'dateinfo.calendars' ? 'Open' : selected.action === 'calendar.connect' ? 'Show the QR code' : selected.action === 'spotify.signout' ? 'Sign out of Spotify' : selected.action === 'alexa.signout' ? 'Sign out of Alexa' : 'Open on the TV');
    setHTML(appearanceDesc, (hint ? '<span class="remote-key">OK</span><span>' + esc(hint) + '</span>' : '')
      + (metroOn() && !t.drop && pivotOf(t.group).length > 1 ? '<span class="remote-key pivot-key">◀ ▶</span><span>' + esc(T('Other pages')) + '</span>' : ''));
  }
  /* The Metro Settings overview: live tiles. Background shows the picture, Style the font, Date and time
     the time, Language its code, Apps on Home the first app icons and Connections what is connected. */
  function fillMetroSettings(t, el) {
    var rows = {}, R = metroRects();
    settingsRows().forEach(function (r) { rows[r.id] = r; });
    function live(r) {
      var n;
      if (r.id === 'background') return S.c.bg === 'photo' ? '<img class="mt-photo" src="' + esc(wallAsset(S.c.wall, 'thumb')) + '" alt="">' : '<span class="mt-photo card-flat-' + S.c.bg + '"></span>';
      if (r.id === 'typography') return '<span class="mt-big" style="font-family:\'' + FONTS[S.c.font].family + '\',Manrope,sans-serif">Aa</span>';
      if (r.id === 'lang') return '<span class="mt-big">' + (S.c.lang === 'hu' ? 'HU' : 'EN') + '</span>';
      if (r.id === 'region') return '<span class="mt-big mt-time">' + fmtHM(Date.now()) + '</span>';
      if (r.id === 'editor') return '<span class="mt-apps">' + S.c.home.slice(0, 7).map(function (id) { return app(id) ? smallMark(app(id)) : ''; }).join('') + '</span>';
      if (r.id === 'connections') {
        n = FC && FC.list ? FC.list().length : 0;
        return '<span class="mt-list">' + [FA ? [T('Alexa'), alexaOn()] : null, FS ? [T('Spotify'), spotifyOn()] : null, FC ? [n > 1 ? T('Calendars · {0}', n) : T('Calendar'), n > 0] : null]
          .filter(Boolean).map(function (x) { return '<span class="mt-item' + (x[1] ? ' is-on' : '') + '"><i></i>' + esc(x[0]) + (x[1] ? '' : '<em>' + esc(T('Not connected')) + '</em>') + '</span>'; }).join('') + '</span>';
      }
      return '<span class="mt-icon">' + icon(r.icon) + '</span>';
    }
    var html = settingsGroups().map(function (g) {
      return '<section class="metro-group group-' + g.id + '"><h3 class="metro-head">' + esc(T(g.label)) + '</h3><div class="metro-grid">' + g.ids.map(function (id) {
        var r = rows[id], m = METRO_TILES[id] || [0, 0, 1, 1], size = m[2] === 2 && m[3] === 2 ? 'is-large' : m[2] === 2 ? 'is-wide' : 'is-small';
        return '<button type="button" tabindex="-1" class="settings-card metro-tile ' + size + ' card-' + id + (id === t.f.id ? ' is-focus' : '') + '" style="grid-column:' + (m[0] + 1) + ' / span ' + m[2] + ';grid-row:' + (m[1] + 1) + ' / span ' + m[3] + (METRO_TINT[id] ? ';--tint:' + METRO_TINT[id] : '') + '"'
          + ' data-z="row" data-i="0" data-id="' + id + '" data-action="settings.' + (id === 'editor' ? 'editor' : 'group.' + id) + '" aria-label="' + esc(r.label + ', ' + r.value) + '">'
          + live(r) + '<span class="mt-copy"><span class="mt-value">' + esc(r.value) + '</span><span class="mt-name">' + esc(r.label) + '</span></span></button>';
      }).join('') + '</div></section>';
    }).join('');
    setHTML(el.list, html);
    el.list.className = 'settings-grid is-metro';
    setHTML(el.hint, T(t.f.id === 'lang' ? 'Switch the language' : 'Open selected group'));
    void R;
  }
  function renderWallpaper(t) {
    V.wallpaper.norm(t);
    appearanceEl.className = 'appearance detail-wallpaper';
    appearanceTitle.textContent = T('Wallpaper');
    appearanceRows.className = 'appearance-rows wallpaper-picker';
    setHTML(appearanceBack, '<button type="button" tabindex="-1" class="setting-choice setting-back' + (t.f.zone === 'back' ? ' is-focus' : '') + '" data-z="wall-back" data-action="wallpaper.back">' + icon('left') + '<span>' + T('Background') + '</span></button>');
    setHTML(appearanceRows, '<div class="wallpaper-edge wallpaper-before" aria-hidden="true">' + icon('up') + '</div><div class="wallpaper-list" role="radiogroup" aria-label="Wallpaper"><div class="wallpaper-rows"></div></div><div class="wallpaper-edge wallpaper-after" aria-hidden="true">' + icon('down') + '</div>');
    var rows = appearanceRows.querySelector('.wallpaper-rows'), shown = wall(S.wallShown) || wall(S.c.wall), candidate = WALLS[t.i], status, note, hint;
    keyed(rows, WALLS.map(function (w) { return { key: w.id, wall: w }; }), function (row, item, i) {
      var visible = i >= t.top && i < t.top + WALL_VISIBLE, w = item.wall, image;
      setContent(row, w.id + '|' + visible + '|' + (w.id === CUSTOM ? custom.stamp : ''), '<span class="wallpaper-thumb">' + (visible ? '<img src="' + esc(wallAsset(w.id, 'thumb')) + '" alt="">' : '') + '</span><span class="setting-copy"><span class="setting-name">' + esc(T(w.name)) + '</span></span><span class="setting-tick" aria-hidden="true"></span>');
      row.className = 'setting-choice wallpaper-choice' + (t.f.zone === 'photo' && t.i === i ? ' is-focus' : '') + (w.id === S.c.wall ? ' is-applied' : '');
      row.style.transform = 'translate3d(0,' + (i * WALL_ROW) + 'px,0)'; row.style.visibility = visible ? 'visible' : 'hidden';
      row.setAttribute('role', 'radio'); row.setAttribute('tabindex', '-1'); row.setAttribute('aria-label', T(w.name));
      row.setAttribute('aria-checked', String(w.id === S.c.wall)); row.setAttribute('aria-posinset', String(i + 1)); row.setAttribute('aria-setsize', String(WALLS.length));
      row.setAttribute('aria-busy', String(t.previewDue === w.id || S.wallPending === w.id));
      attrs(row, 'wall-choice', i, 'wallpaper.choose.' + w.id);
      setHTML(row.querySelector('.setting-tick'), w.id === S.c.wall ? icon('check') : '');
      image = row.querySelector('img');
      if (image && !image._wallBound) {
        image._wallBound = true;
        image.onerror = function () { this.parentNode.className = 'wallpaper-thumb is-missing'; };
        if (image.complete && !image.naturalWidth) image.onerror();
      }
    });
    rows.style.transform = 'translate3d(0,' + (-t.top * WALL_ROW) + 'px,0)';
    appearanceRows.querySelector('.wallpaper-before').className = 'wallpaper-edge wallpaper-before' + (t.top > 0 ? ' is-on' : '');
    appearanceRows.querySelector('.wallpaper-after').className = 'wallpaper-edge wallpaper-after' + (t.top + WALL_VISIBLE < WALLS.length ? ' is-on' : '');
    note = t.previewDue ? T('Preparing {0}…', T(candidate.name)) : S.wallPending ? T(t.applyPending ? 'Applying {0}…' : 'Loading {0}…', T(candidate.name)) : T(shown.id === S.c.wall ? 'Applied' : 'Preview');
    if (t.failedId) note = T(S.err ? 'Couldn’t save {0}.' : 'Couldn’t load {0}.', T(wall(t.failedId).name));
    status = '<p class="wallpaper-preview-name"><span>' + esc(T(shown.name)) + '</span><span class="wallpaper-count">' + T('{0} of {1}', wallIndex(shown.id) + 1, WALLS.length) + '</span></p><p class="wallpaper-preview-state' + (t.failedId ? ' setting-error' : '') + '">' + esc(note) + '</p>';
    if (t.failedId) status += '<button type="button" tabindex="-1" class="setting-choice setting-retry' + (t.f.zone === 'retry' ? ' is-focus' : '') + '" data-z="wall-retry" data-action="wallpaper.retry">' + T('Try again') + '</button>';
    setHTML(appearanceStatus, status);
    hint = t.f.zone === 'back' ? T('Return to {0}', T('Background')) : T(t.f.zone === 'retry' ? 'Retry this photo' : 'Apply selected photo');
    if (t.f.zone === 'photo' && candidate.id === S.c.wall && !S.pending && !t.failedId) hint = '';
    setHTML(appearanceDesc, hint ? '<span class="remote-key">OK</span><span>' + hint + '</span>' : '');
  }
  /* Keep the retry or membership state on the focused control. The stage-level line
     shares its position without changing the control's identity or key behaviour. */
  function renderFocusStatus(t) {
    if (isSettingsDetail(t)) { focusStatus.className = 'focus-status'; return; }
    var root = isSettingsDetail(top()) ? appearanceEl : sheetEl.hidden ? homeEl : sheetEl, active = root.querySelectorAll('.is-focus[data-action]'), target = null, text = S.err ? T('Not saved. OK tries again.') : '', i, r, sr, scale, x, y, w, action, solid;
    Array.prototype.forEach.call(stage.querySelectorAll('.has-local-status'), function (el) { el.className = el.className.replace(/\s+has-local-status/g, ''); });
    for (i = 0; i < active.length; i++) if (renderedAction(active[i])) { target = active[i]; break; }
    if (!text && t.id === 'arrange' && (t.f.zone === 'act' || t.f.zone === 'tiles')) {
      var slot = t.slots[t.f.i];
      if (slot && !slot.removed && t.f.zone === 'act' && S.c.home.length === 1) text = T(LAST);
    }
    if (!text && S.note === LAST && t.id === 'arrange') text = T(LAST);
    if (!target || !text) { focusStatus.className = 'focus-status'; return; }
    if (utilsEl.contains(target) && utilsEl.className.indexOf('is-icons') >= 0) { renderUtilFocusLabel(target); focusStatus.className = 'focus-status'; return; }
    target.className += ' has-local-status';
    action = target.getAttribute('data-action');
    r = target.getBoundingClientRect(); sr = stage.getBoundingClientRect(); scale = sr.width / 1920 || 1;
    x = (r.left - sr.left) / scale; y = (r.top - sr.top) / scale; w = r.width / scale;
    if (action.indexOf('home.app.') === 0 || action.indexOf('arrange.tile.') === 0 || action.indexOf('arrange.placeholder.') === 0) y += 171;
    else if (action.indexOf('apps.order.') === 0) y += 86;
    else if (action.indexOf('apps.toggle.') === 0 || action.indexOf('apps.add.') === 0) y += 164;
    else if (action.indexOf('layout.') === 0) y += 54;
    else y += action.indexOf('arrange.remove.') === 0 || action.indexOf('arrange.restore.') === 0 ? 43 : 40;
    solid = /(?:^|\s)(?:u|btn|er-rm|dock-action|set-row)(?:\s|$)/.test(target.className) && !utilsEl.contains(target) && target.parentNode.className.indexOf('s-head') < 0;
    focusStatus.className = 'focus-status is-on' + (solid ? ' dark-ink' : '');
    focusStatus.textContent = text;
    focusStatus.style.left = clamp(x + 8, 112, 1808 - Math.min(w - 16, 800)) + 'px';
    focusStatus.style.top = clamp(y, 72, 988) + 'px';
    focusStatus.style.width = Math.min(w - 16, 800) + 'px';
  }
  function headButtons(list, fi, prefix) {
    return list.map(function (b, i) {
      return '<button type="button" tabindex="-1" class="btn' + (i === fi ? ' is-focus' : '') + (b[2] ? ' ' + b[2] : '') + '" data-z="head" data-i="' + i + '" data-action="' + prefix + '.' + b[0] + '" aria-label="' + esc(b[0] === 'undo' ? undoCaption() : b[1]) + '">' + (b[3] ? icon(b[3]) : '') + '<span>' + b[1] + '</span></button>';
    }).join('');
  }
  var FRAMES = {
    apps: function () {
      return '<h2 class="s-title" data-slot="title"></h2><p class="s-sub" data-slot="sub"></p><div class="s-head" data-slot="head"></div>'
        + '<div class="grid-view" data-slot="view"><div class="grid-in" data-slot="grid"></div></div>'
        + '<div class="row-cue grid-before" data-slot="before" aria-hidden="true">' + icon('up') + '</div><div class="row-cue grid-after" data-slot="after" aria-hidden="true">' + icon('down') + '</div>';
    },
    editor: function () {
      return '<h2 class="s-title editor-title" data-slot="title">' + T('Apps on Home') + '</h2><p class="s-sub" data-slot="sub"></p><div class="s-head" data-slot="head"></div>'
        + '<p class="s-label z-home" data-slot="lh"></p><p class="s-label z-other">' + T('Not on Home') + '</p>'
        + '<div class="ed-home" data-slot="home"></div><div class="ed-order-break" data-slot="break">' + T('Then scroll') + '</div><div class="ed-other-view" data-slot="ov"><div class="ed-other" data-slot="other"></div></div><div class="ed-origin" data-slot="origin"></div>'
        + '<div class="row-cue editor-before" data-slot="otherBefore" aria-hidden="true">' + icon('up') + '</div><div class="row-cue editor-after" data-slot="otherAfter" aria-hidden="true">' + icon('down') + '</div>';
    },
    settings: function () { return '<h2 class="s-title settings-page-title">' + T('Settings') + '</h2><div class="settings-grid" data-slot="list"></div><p class="settings-overview-hint"><span class="remote-key">OK</span><span data-slot="hint"></span></p>'; },
    message: function (t) {
      var m = messageContent(t);
      return '<h2 class="msg-title">' + esc(T(m.title)) + '</h2><p class="msg-line">' + esc(T(m.line)) + '</p><p class="msg-note">' + esc(T(m.note)) + '</p><div class="msg-acts" data-slot="acts"></div>';
    },
    phone: function () {
      return '<div class="phone-panel"><h2 class="s-title">' + T('Your picture') + '</h2>'
        + '<div class="phone-body"><div class="phone-qr-card"><canvas class="phone-qr" width="360" height="360" data-slot="qr"></canvas><p class="phone-url" data-slot="url"></p></div>'
        + '<div class="phone-copy"><ol class="phone-steps"><li>' + T('Scan the code with your phone.') + '</li><li>' + (SEND_PAGE ? T('On the page that opens, choose a photo or a short video.') : T('On the page that opens, tap ^ beside the message field, then “Attach local file” and choose a photo or a short video.')) + '</li><li>' + T('Send it. The TV sets it as your background in a few seconds.') + '</li></ol>'
        + '<p class="phone-hint">' + T('You can close this screen: the TV keeps listening while it is on.') + '</p>'
        + '<p class="phone-status" data-slot="status" aria-live="polite"></p><p class="phone-note">' + T('The photo passes through ntfy.sh on a private channel and is deleted there after a few hours. The TV keeps its own copy.') + '</p>'
        + '<div class="phone-acts" data-slot="acts"></div></div></div></div>';
    },
    pair: function (t) {
      var p = pairInfo(t.mode);
      return '<div class="phone-panel alexa-pair"><h2 class="s-title">' + T(p.title) + '</h2>'
        + '<div class="phone-body"><div class="phone-qr-card"><canvas class="phone-qr" width="360" height="360" data-slot="qr"></canvas><p class="phone-url" data-slot="url"></p></div>'
        + '<div class="phone-copy"><ol class="phone-steps">' + p.steps.map(function (step) { return '<li>' + T(step) + '</li>'; }).join('') + '</ol>'
        + '<p class="phone-status" data-slot="status" aria-live="polite"></p><p class="phone-note">' + T(p.note) + '</p>'
        + '<div class="phone-acts" data-slot="acts"></div></div></div></div>';
    },
    backup: function (t) {
      var exp = t.mode === 'export';
      var steps = exp
        ? ['Scan the code with your phone.', 'On the page that opens, save the backup file (for example to Google Drive or Files).', 'Keep the file and your pass-phrase safe. You need both to restore.']
        : ['Scan the code with your phone.', 'On the page that opens, choose your saved backup file and send it.', 'The TV then asks for your pass-phrase and writes your settings back.'];
      return '<div class="phone-panel"><h2 class="s-title">' + T(exp ? 'Create a backup' : 'Restore from a backup') + '</h2>'
        + '<div class="phone-body"><div class="phone-qr-card"><canvas class="phone-qr" width="360" height="360" data-slot="qr"></canvas><p class="phone-url" data-slot="url"></p></div>'
        + '<div class="phone-copy"><ol class="phone-steps">' + steps.map(function (s) { return '<li>' + T(s) + '</li>'; }).join('') + '</ol>'
        + '<p class="phone-status" data-slot="status" aria-live="polite"></p>'
        + '<p class="phone-note">' + T('The file is encrypted with your pass-phrase. Only the encrypted file passes through ntfy.sh, on a private channel, and is deleted there after a few hours.') + '</p>'
        + '<div class="phone-acts" data-slot="acts"></div></div></div></div>';
    },
    remotetest: function () {
      return '<div class="rt"><h2 class="s-title">' + T('Remote test') + '</h2><p class="s-sub">' + T('Press the colour button and the other buttons. Everything the TV tells Frame Home appears here. Press Back twice to leave.') + '</p>'
        + '<p class="rt-meta" data-slot="meta"></p><ol class="rt-log" data-slot="log"></ol></div>';
    },
    nowplaying: function () {
      return '<div class="np" data-slot="np"><div class="np-art-wrap" data-slot="artwrap"><img class="np-art" data-slot="art" alt=""></div>'
        + '<div class="np-copy"><p class="np-device" data-slot="device" data-z="npdev" data-i="0"></p><h2 class="np-title" data-slot="title"></h2><p class="np-artist" data-slot="artist"></p><p class="np-album" data-slot="album"></p><p class="np-fact" data-slot="fact" data-z="npfact" data-i="0"></p>'
        + '<div class="np-progress" data-slot="progress"></div><div class="np-ctl-row"><div class="np-controls" data-slot="controls"></div><div class="np-volume" data-slot="volume"></div><div class="np-like-wrap" data-slot="like"></div></div></div>'
        + '<div class="np-lyrics" data-slot="lyrics" aria-live="off"></div><div class="np-devices" data-slot="devices" role="dialog"></div>'
        + '<div class="np-factpanel" data-slot="factpanel" role="dialog" data-z="npfact" data-i="0"></div></div>';
    },
    alexalist: function () {
      return '<div class="alexa-pick"><h2 class="s-title" data-slot="title"></h2><p class="s-sub" data-slot="sub"></p><div class="alexa-list" data-slot="list"></div>'
        + '<div class="row-cue alexa-before" data-slot="before" aria-hidden="true">' + icon('up') + '</div><div class="row-cue alexa-after" data-slot="after" aria-hidden="true">' + icon('down') + '</div></div>';
    },
    wifitype: function () {
      return '<div class="wifi-field-panel"><h2 class="s-title" data-slot="title"></h2><p class="wifi-field-value" data-slot="value"></p><div class="wifi-char-row" data-slot="chars"></div><div class="wifi-field-actions" data-slot="acts"></div></div>';
    }
  };
  function gridTileHtml(id) {
    var a = app(id), state = onHome(id) ? badge(true) + '<span>' + T('On Home') + '</span>' : '';
    return '<span class="panel-content">' + appMark(a, 120, 72, 58) + '<span class="label">' + esc(a.name) + '</span></span><span class="state">' + state + '</span>';
  }
  var FILLS = {
    apps: function (t, el) {
      var f = t.f, items = appsItems(), n = items.length, rows = Math.ceil(n / COLS), vis = 3, row = Math.floor(f.i / COLS);
      setHTML(el.title, T('All apps'));
      el.title.className = 's-title apps-title';
      setHTML(el.sub, esc(catalog.loading ? T('Loading installed apps…') : catalog.error || (!n ? T('No installed apps found.') : '')));
      setHTML(el.head, headButtons(appsHead(), f.zone === 'head' ? 0 : -1, 'apps'));
      el.head.className = 's-head' + (f.zone === 'head' ? ' is-awake' : '');
      if (f.zone === 'grid') { if (row < t.top) t.top = row; if (row > t.top + vis - 1) t.top = row - vis + 1; }
      t.top = clamp(t.top, 0, Math.max(0, rows - vis));
      keyed(el.grid, items.map(function (id) { return { key: id, id: id }; }), function (tile, it, i) {
        var focus = f.zone === 'grid' && i === f.i;
        setContent(tile, [it.id, app(it.id).name, onHome(it.id), S.c.iconStyle].join('|'), gridTileHtml(it.id));
        tile.className = 'gt' + (focus ? ' is-focus' : '');
        tile.style.transform = 'translate3d(' + ((i % COLS) * GRID_COL) + 'px,' + (Math.floor(i / COLS) * GRID_ROW) + 'px,0)';
        tile.setAttribute('role', 'button'); tile.setAttribute('aria-label', app(it.id).name);
        attrs(tile, 'grid', i, 'apps.open.' + it.id);
      });
      el.grid.style.transform = 'translate3d(0,' + (-t.top * GRID_ROW) + 'px,0)';
      el.view.className = 'grid-view' + (t.top > 0 ? ' more-before' : '') + (rows - t.top > vis ? ' more-after' : '');
      el.before.className = 'row-cue grid-before' + (t.top > 0 ? ' is-on' : '');
      el.after.className = 'row-cue grid-after' + (rows - t.top > vis ? ' is-on' : '');
    },
    editor: function (t, el) {
      var f = t.f, H = t.lifted ? t.lifted.order : S.c.home, O = otherGroups(), list = O.recent.concat(O.rest), full = S.c.home.length >= CAP;
      var entries = [], ys = [], y = 0, yf, minTop, maxTop = 0, rowEnd, before = false, afterRows = false;
      var hint = catalog.error ? catalog.error : catalog.loading ? T('Loading installed apps…') : f.zone === 'head' && f.h === 0 ? undoCaption() : f.zone === 'home' && f.part === 'remove' ? (H.length <= 1 ? LAST : T('{0} stays installed.', app(H[f.i]).name)) : '';
      setHTML(el.sub, editStatus(hint, t.lifted ? T('Moving {0}. OK places it, Back puts it back.', app(t.lifted.id).name) : ''));
      setHTML(el.title, esc(T('Apps on Home')));
      sheetView.className = 'view' + (metroOn() ? ' is-metro' : '') + (metroOn() && Date.now() < pivotSlide.until ? ' slide-' + pivotSlide.dir + (pivotSlide.n % 2) : '');
      setHTML(el.head, headButtons([['undo', T('Undo'), S.undo.length ? '' : 'is-idle', 'undo'], ['done', T('Done'), '', 'check']], f.zone === 'head' ? f.h : -1, 'editor'));
      el.head.className = 's-head' + (f.zone === 'head' ? ' is-awake' : '');
      setHTML(el.lh, T('On Home') + ' <span class="s-count">' + T('{0} of {1}', S.c.home.length, CAP) + '</span>');
      el['break'].className = 'ed-order-break' + (H.length > editorCut() ? ' is-on' : '');
      el['break'].style.top = (264 + editorCut() * ED_ROW) + 'px';

      keyed(el.home, H.map(function (id) { return { key: id, id: id }; }), function (row, it, i) {
        var a = app(it.id), here = f.zone === 'home' && i === f.i, lifted = !!t.lifted && i === f.i;
        setContent(row, it.id, '<div class="er-name" role="button"><span class="panel-content"><span class="er-num"></span>' + smallMark(a) + '<span class="er-text">' + esc(a.name) + '</span><span class="er-move">' + icon('updown') + '</span></span></div><div class="er-rm" role="button"><span></span></div>');
        row.className = 'er' + (here ? ' is-active' : '') + (lifted ? ' is-lifted' : '');
        row.style.transform = 'translate3d(' + (lifted ? 16 : 0) + 'px,' + editorHomeY(i) + 'px,0)';
        row.querySelector('.er-num').textContent = String(i + 1);
        row.firstChild.className = 'er-name' + (here && (f.part === 'name' || lifted) ? ' is-focus' : '');
        row.lastChild.className = 'er-rm' + (here && f.part === 'remove' && !lifted ? ' is-focus' : '') + (H.length <= 1 ? ' is-limit' : '');
        row.lastChild.firstChild.textContent = T(H.length <= 1 ? LAST : 'Remove from Home');
        attrs(row.firstChild, 'name', i, 'editor.move.' + it.id);
        attrs(row.lastChild, 'remove', i, 'editor.remove.' + it.id);
      });
      el.origin.className = 'ed-origin' + (t.lifted && t.lifted.from !== f.i ? ' is-on' : '');
      if (t.lifted) el.origin.style.transform = 'translate3d(0,' + (264 + editorHomeY(t.lifted.from) + 16) + 'px,0)';

      if (O.recent.length) { entries.push({ key: 'sep-recent', sep: T('Recently removed'), y: y }); y += ED_SEP; }
      O.recent.forEach(function (id) { entries.push({ key: id, id: id, y: y }); ys.push(y); y += ED_ROW; });
      if (O.recent.length && O.rest.length) { entries.push({ key: 'sep-rest', sep: T('Other installed apps'), y: y }); y += ED_SEP; }
      O.rest.forEach(function (id) { entries.push({ key: id, id: id, y: y }); ys.push(y); y += ED_ROW; });
      if (f.zone === 'other' && ys.length) {
        yf = ys[f.j] - (O.recent.length && (f.j === 0 || f.j === O.recent.length) ? ED_SEP : 0);
        if (yf < t.top) t.top = yf;
        if (ys[f.j] + 72 > t.top + ED_VIEW) {
          minTop = ys[f.j] + 72 - ED_VIEW;
          entries.some(function (it) { if (it.y < minTop) return false; t.top = it.y; return true; });
        }
      }
      entries.some(function (it) { if (it.y < Math.max(0, y - ED_VIEW)) return false; maxTop = it.y; return true; });
      t.top = clamp(t.top, 0, maxTop);
      keyed(el.other, entries, function (row, it) {
        var j, focus, a;
        row.style.transform = 'translate3d(0,' + it.y + 'px,0)';
        rowEnd = it.y + (it.sep ? ED_SEP : 72);
        row.style.visibility = it.y >= t.top && rowEnd <= t.top + ED_VIEW ? 'visible' : 'hidden';
        before = before || it.y < t.top; afterRows = afterRows || rowEnd > t.top + ED_VIEW;
        if (it.sep) { setContent(row, 'sep|' + it.sep, esc(it.sep)); row.className = 'eo-sep'; return; }
        j = list.indexOf(it.id); focus = f.zone === 'other' && j === f.j; a = app(it.id);
        setContent(row, it.id, '<span class="panel-content">' + smallMark(a) + '<span class="eo-text">' + esc(a.name) + '</span><span class="eo-verb"></span></span>');
        row.querySelector('.eo-verb').innerHTML = focus ? '<span class="verb' + (full ? ' is-off' : '') + '">' + T(full ? 'Home is full' : 'Add to Home') + '</span>' : '';
        row.className = 'eo' + (focus ? ' is-focus' : '');
        row.setAttribute('role', 'button');
        attrs(row, 'other', j, 'editor.add.' + it.id);
      });
      el.other.style.transform = 'translate3d(0,' + (-t.top) + 'px,0)';
      el.ov.className = 'ed-other-view';
      el.otherBefore.className = 'row-cue editor-before' + (before ? ' is-on' : '');
      el.otherAfter.className = 'row-cue editor-after' + (afterRows ? ' is-on' : '');
    },
    settings: function (t, el) {
      var html = '', byId = {};
      if (metroOn()) { fillMetroSettings(t, el); return; }
      settingsRows().forEach(function (r) {
        var visual;
        if (r.id === 'background') visual = S.c.bg === 'photo' ? '<img class="card-photo" src="' + esc(wallAsset(S.c.wall, 'thumb')) + '" alt="">' : '<span class="card-photo card-flat-' + S.c.bg + '"></span>';
        else if (r.id === 'typography') visual = '<span class="card-chip card-type" style="font-family:\'' + FONTS[S.c.font].family + '\',Manrope,sans-serif">Aa</span>';
        else if (r.id === 'lang') visual = '<span class="card-chip card-type">' + (S.c.lang === 'hu' ? 'HU' : 'EN') + '</span>';
        else visual = '<span class="card-chip">' + icon(r.icon) + '</span>';
        byId[r.id] = '<button type="button" tabindex="-1" class="settings-card card-' + r.id + (r.id === t.f.id ? ' is-focus' : '') + (r.direct ? ' is-direct' : '') + '" data-z="row" data-i="0" data-id="' + r.id + '" data-action="settings.' + (r.id === 'editor' ? 'editor' : r.direct ? 'samsung-home' : 'group.' + r.id) + '" aria-label="' + esc(r.label + ', ' + r.value) + '">'
          + '<span class="card-visual">' + visual + '</span><span class="card-copy"><span class="card-name">' + esc(r.label) + '</span><span class="card-value">' + esc(r.value) + '</span></span>'
          + (r.direct ? '<span class="card-go">' + icon('right') + '</span>' : '') + '</button>';
      });
      html = settingsGroups().map(function (g) {
        return '<section class="settings-group group-' + g.id + '"><h3 class="settings-group-head">' + esc(T(g.label)) + '</h3><div class="settings-group-cards">' + g.ids.map(function (id) { return byId[id]; }).join('') + '</div></section>';
      }).join('');
      setHTML(el.list, html);
      el.list.className = 'settings-grid is-columns';
      setHTML(el.hint, T(t.f.id === 'lang' ? 'Switch the language' : 'Open selected group'));
    },
    message: function (t, el) {
      setHTML(el.acts, messageContent(t).actions.map(function (a, i) {
        return '<button type="button" tabindex="-1" class="btn' + (i === t.f.b ? ' is-focus' : '') + '" data-z="act" data-i="' + i + '" data-action="message.' + a[0] + '"><span>' + esc(T(a[1])) + '</span></button>';
      }).join(''));
    },
    phone: function (t, el) {
      var url = SEND_PAGE ? SEND_PAGE + '#' + S.c.relayTopic : RELAY + '/' + S.c.relayTopic, phase = custom.phase !== 'idle' ? custom.phase : custom.lost ? 'lost' : custom.link === 'retry' ? 'offline' : custom.link === 'open' ? 'waiting' : 'connecting', text = {
        connecting: T('Connecting to ntfy.sh…'), waiting: T('Waiting for a photo…'), offline: T('Can’t reach ntfy.sh ({0}). Trying again…', custom.detail || '?'),
        notimage: T('That file isn’t a picture or a video. Send a JPG, PNG or MP4.'), downloading: T('Receiving {0}…', (custom.name || T('photo')) + (custom.percent ? ' · ' + custom.percent + '%' : '')), processing: T('Preparing your background…'),
        unreadable: T('Couldn’t open that file. Send a JPG, PNG or MP4.'), unreachable: T('Couldn’t download the photo ({0}). Send it again.', custom.detail || '?'),
        lost: T('The TV no longer had your last picture. Send it again.'),
        done: T('Done. Your picture is the background now.'), nostill: T('Done. The TV couldn’t take a still from this video, so the glass uses a neutral tint.'), unsaved: T('Done for now, but the TV couldn’t store it for next time.')
      }[phase];
      // The sheet is rebuilt on every visit, so the drawn code belongs to the canvas, not the session.
      if (el.qr._payload !== url && window.qrcode) { drawQr(el.qr, url); el.qr._payload = url; }
      setHTML(el.url, esc((SEND_PAGE || url).replace(/^https:\/\//, '').replace(/\/$/, '')));
      setHTML(el.status, '<span class="phone-dot is-' + phase + '"></span>' + esc(text));
      setHTML(el.acts, '<button type="button" tabindex="-1" class="btn is-focus" data-z="act" data-i="0" data-action="phone.done"><span>' + T(custom.phase === 'done' ? 'Done' : 'Close') + '</span></button>');
    },
    pair: function (t, el) {
      var p = pairInfo(t.mode), st = p.st;
      var text = { waiting: T('Waiting for the phone…'), registering: T('Signing in…'), done: T(p.done), failed: T('Sign-in didn’t work ({0}). OK tries again.', st.detail || '?') }[st.phase] || '';
      var dot = { waiting: 'waiting', registering: 'processing', done: 'done', failed: 'offline' }[st.phase] || 'connecting';
      if (st.url && el.qr._payload !== st.url && window.qrcode) { drawQr(el.qr, st.url); el.qr._payload = st.url; }
      setHTML(el.url, esc(p.page.replace(/^https:\/\//, '').replace(/\/$/, '')));
      setHTML(el.status, '<span class="phone-dot is-' + dot + '"></span>' + esc(text));
      setHTML(el.acts, '<button type="button" tabindex="-1" class="btn is-focus" data-z="act" data-i="0" data-action="pair.ok"><span>' + T(st.phase === 'done' ? 'Done' : st.phase === 'failed' ? 'Try again' : 'Close') + '</span></button>');
    },
    backup: function (t, el) {
      var exp = t.mode === 'export';
      var text = {
        sending: T('Saving to your phone… scan the code and save the file.'),
        empty: T('There is nothing to back up yet.'),
        waiting: T('Waiting for your backup file from the phone…'),
        got: T('File received. Enter your pass-phrase on the TV.'),
        badpass: T(bk.detail === 'bad-version' ? 'This backup is from a newer version of Frame Home.' : bk.detail === 'bad-file' ? 'That file is not a Frame Home backup.' : 'Wrong pass-phrase, or the file is damaged. OK tries again.'),
        done: T('Restored. Frame Home is reloading…'), reloaded: T('Restored.')
      }[bk.phase] || (exp ? T('Saving to your phone…') : T('Waiting for your backup file from the phone…'));
      var dot = { sending: 'waiting', waiting: 'waiting', got: 'processing', badpass: 'offline', empty: 'offline', done: 'done', reloaded: 'done' }[bk.phase] || 'connecting';
      if (bk.url && el.qr._payload !== bk.url && window.qrcode) { drawQr(el.qr, bk.url); el.qr._payload = bk.url; }
      setHTML(el.url, bk.url ? esc(BACKUP_PAGE.replace(/^https:\/\//, '').replace(/\/$/, '')) : '');
      setHTML(el.status, '<span class="phone-dot is-' + dot + '"></span>' + esc(text));
      var act = bk.phase === 'badpass' || (bk.phase === 'got' && !exp) ? T('Try again') : bk.phase === 'done' ? T('Done') : T('Close');
      setHTML(el.acts, '<button type="button" tabindex="-1" class="btn is-focus" data-z="act" data-i="0" data-action="backup.ok"><span>' + esc(act) + '</span></button>');
    },
    remotetest: function (t, el) {
      setHTML(el.meta, esc(T('{0} keys supported, {1} registered for this test.', rt.supported, rt.registered.length)));
      setHTML(el.log, rt.log.length ? rt.log.map(function (l) { return '<li>' + esc(l) + '</li>'; }).join('') : '<li class="rt-empty">' + esc(T('Nothing yet.')) + '</li>');
    },
    nowplaying: function (t, el) {
      var n = spot.now, art = n && (n.artBig || n.art) || '', lyricsNow, bare;
      if (t.lyrics) loadLyrics();
      el.np.className = 'np' + (t.lyrics ? ' is-lyrics' : '') + (t.switching ? ' is-switching' : '');
      lyricsNow = t.lyrics ? lyricsHtml(n) : ''; bare = lyricsNow.replace(/ is-(now|near|mid|far|gone)/g, '');
      if (el.lyrics._html !== bare) { el.lyrics.innerHTML = lyricsNow; el.lyrics._html = bare; lyr.line = -2; lyr.snap = true; }
      if (el.art.getAttribute('src') !== art) { if (art) el.art.setAttribute('src', art); else el.art.removeAttribute('src'); }
      el.artwrap.className = 'np-art-wrap' + (art ? '' : ' is-empty');
      setHTML(el.device, spotifyOn() ? icon('speaker') + '<span>' + esc(n && n.device ? T('Playing on {0}', n.device) : T('Choose a device')) + '</span>' + icon('right', 'np-dev-more') : '');
      el.device.className = 'np-device' + (t.f.row === 'device' && !t.dev ? ' is-focus' : '');
      growDevices(el.devices, t);
      setHTML(el.title, mq(n ? n.title : T('Nothing is playing on Spotify.')));
      setHTML(el.artist, n ? mq(n.artist) : '');
      var info = !t.lyrics ? songFacts(n) : null, year = info && info.year || (n && n.albumType !== 'compilation' ? n.albumYear : 0);
      setHTML(el.album, esc(n ? n.album + (year ? ' · ' + year : '') : ''));
      setHTML(el.fact, info && info.text ? '<span class="np-fact-tag">' + esc(T('From Wikipedia')) + '</span>' + esc(info.text) : '');
      setHTML(el.progress, n ? progressHtml(n) : ''); paintProgress();
      el.progress.className = 'np-progress' + (t.f.row === 'bar' ? ' is-focus' : '') + (seek.at !== null ? ' is-seeking' : '');
      el.progress.setAttribute('data-z', 'npbar'); el.progress.setAttribute('data-i', '0');
      el.progress.setAttribute('data-hint', T('Left and Right move 10 seconds'));
      marquee(el.np);
      setHTML(el.controls, ['prev', n && n.playing ? 'pause' : 'play', 'next', 'lyrics'].map(function (name, i) {
        var label = T(i === 0 ? 'Previous track' : i === 2 ? 'Next track' : i === 3 ? 'Lyrics' : name === 'pause' ? 'Pause' : 'Play');
        return '<button type="button" tabindex="-1" class="np-btn' + (i === 1 ? ' np-main' : '') + (i === 3 ? ' np-lyrics-btn' + (t.lyrics ? ' is-active' : '') : '') + (t.f.row === 'controls' && !t.dev && t.f.b === i ? ' is-focus' : '') + '" data-z="np" data-i="' + i + '" data-action="np.' + ['prev', 'toggle', 'next', 'lyrics'][i] + '"'
          + (i === 3 ? ' aria-pressed="' + !!t.lyrics + '"' : '') + ' aria-label="' + esc(label) + '">' + icon(name) + (i === 3 ? '<span>' + esc(label) + '</span>' : '') + '</button>';
      }).join(''));
      var volOn = volumeAvailable(n), vpct = volOn ? Math.max(0, Math.min(100, Math.round(n.volume))) : 0, vmuted = volOn && vpct === 0;
      el.volume.className = 'np-volume' + (volOn ? '' : ' is-off') + (t.f.row === 'volume' && !t.dev ? ' is-focus' : '');
      if (volOn) {
        var vbtn = function (i) {
          return '<button type="button" tabindex="-1" class="np-vol-btn' + (t.f.row === 'volume' && !t.dev && (t.f.v || 0) === i ? ' is-focus' : '') + '" data-z="npvol" data-i="' + i + '" data-action="np.vol' + (i ? 'up' : 'down') + '" aria-label="' + esc(T(i ? 'Volume up' : 'Volume down')) + '">' + icon(i ? 'plus' : 'minus') + '</button>';
        };
        setHTML(el.volume, vbtn(0) + '<span class="np-vol-val" aria-label="' + esc(T('Volume') + ' ' + vpct + '%') + '">' + icon(vmuted ? 'mute' : 'volume') + '<span class="np-vol-pct">' + vpct + '%</span></span>' + vbtn(1));
      } else setHTML(el.volume, '');
      likeState(n);
      var likeOn = likeAvailable(n);
      setHTML(el.like, likeOn ? '<button type="button" tabindex="-1" class="np-btn np-like' + (likes.on ? ' is-on' : '') + (t.f.row === 'like' && !t.dev ? ' is-focus' : '') + '" data-z="nplike" data-i="0" data-action="np.like"'
        + ' aria-pressed="' + !!likes.on + '" aria-label="' + esc(T(likes.on ? 'Remove from Liked Songs' : 'Add to Liked Songs')) + '">' + icon('heart') + '</button>' : '');
      placeLyrics(); fitFact(el.fact, t.f.row === 'fact' && !t.dev && !t.lyrics && !t.fact);
      t.factOk = !t.lyrics && !!(info && info.text) && !/is-hidden/.test(el.fact.className);
      var panel = !!(t.fact && t.factOk && info);
      el.factpanel.className = 'np-factpanel' + (panel ? ' is-open' : '');
      setHTML(el.factpanel, info && info.text ? '<p class="np-fp-tag">' + esc(T('From Wikipedia')) + '</p><h3 class="np-fp-title">' + esc(info.title || (n && n.title) || '') + '</h3>'
        + '<p class="np-fp-text">' + esc(info.more || info.text) + '</p><p class="np-fp-foot">' + esc(T('Wikipedia, CC BY-SA 4.0 · Back closes')) + '</p>' : '');
    },
    alexalist: function (t, el) {
      var rows = alexaRows(t), words = alexaListText(t), html = '', i, r, sub;
      setHTML(el.title, esc(words[0]));
      sub = LIST_NEEDS_DEVICES[t.mode] && alexaOn() && alexa.loading && !alexa.list ? T('Loading your Alexa devices…') : alexa.listErr && LIST_NEEDS_DEVICES[t.mode] ? alexaErrText(alexa.listErr) : words[1];
      setHTML(el.sub, esc(sub));
      if (t.f.i < t.top) t.top = t.f.i;
      if (t.f.i > t.top + ALEXA_VISIBLE - 1) t.top = t.f.i - ALEXA_VISIBLE + 1;
      t.top = clamp(t.top, 0, Math.max(0, rows.length - ALEXA_VISIBLE));
      for (i = t.top; i < Math.min(rows.length, t.top + ALEXA_VISIBLE); i++) {
        r = rows[i];
        if (r.header) { html += '<div class="alexa-head">' + esc(r.label) + '</div>'; continue; }
        html += '<button type="button" tabindex="-1" class="alexa-row' + (r.lifted ? ' is-lifted' : '') + (i === t.f.i ? ' is-focus' : '') + (r.ticked ? ' is-applied' : '') + (r.disabled ? ' is-disabled' : '') + (r.info ? ' is-info' : '') + '" data-z="pick" data-i="' + i + '" data-action="alexa.row.' + i + '"'
          + (r.ticked !== undefined ? ' role="checkbox" aria-checked="' + !!r.ticked + '"' : '') + '>'
          + '<span class="alexa-tick" aria-hidden="true">' + (r.lifted ? icon('updown') : r.colour ? keyBadge(r.colour) : r.add ? icon('plus') : r.ticked ? icon('check') : '') + '</span>'
          + (r.order ? '<span class="alexa-order" aria-hidden="true">' + r.order + '</span>' : '')
          + (r.icon ? '<span class="alexa-icon" aria-hidden="true">' + icon(r.icon === 'light' ? 'lamp' : r.icon) + '</span>' : '')
          + (r.swatch ? '<span class="alexa-icon" aria-hidden="true"><span class="cal-swatch" style="background:' + r.swatch + '"></span></span>' : '')
          + '<span class="alexa-name">' + esc(r.label) + '</span><span class="alexa-value">' + esc(r.value || '') + '</span>' + (r.forward ? icon('right', 'alexa-forward') : '') + '</button>';
      }
      setHTML(el.list, html);
      el.before.className = 'row-cue alexa-before' + (t.top > 0 ? ' is-on' : '');
      el.after.className = 'row-cue alexa-after' + (t.top + ALEXA_VISIBLE < rows.length ? ' is-on' : '');
    },
    wifitype: function (t, el) {
      var f = t.f, chars = '', acts = [T('Delete last'), T('Save'), T('Cancel')], i;
      setHTML(el.title, T(t.field === 'ssid' ? 'Network name' : t.field === 'group' ? 'Group name' : t.field === 'swname' ? 'Name on Home' : t.field === 'calname' ? 'Calendar name' : t.field === 'bkpass' ? (t.bkmode === 'import' ? 'Pass-phrase of this backup' : 'Pass-phrase for this backup') : 'Password'));
      setHTML(el.value, esc(wifiDraftDisplay(t)));
      var set = t.chars || WIFI_CHARS;
      for (i = 0; i < set.length; i++) chars += '<button type="button" tabindex="-1" class="btn' + (f.zone === 'char' && f.ci === i ? ' is-focus' : '') + '" data-z="char" data-i="' + i + '" data-action="wifi.char.' + i + '"' + (set.charAt(i) === ' ' ? ' aria-label="' + T('Space') + '"' : '') + '>' + (set.charAt(i) === ' ' ? '␣' : esc(set.charAt(i))) + '</button>';
      setHTML(el.chars, chars);
      setHTML(el.acts, acts.map(function (label, ai) {
        return '<button type="button" tabindex="-1" class="btn' + (f.zone === 'act' && f.ai === ai ? ' is-focus' : '') + '" data-z="act" data-i="' + ai + '" data-action="wifi.act.' + ai + '"><span>' + esc(label) + '</span></button>';
      }).join(''));
    }
  };

  /* ---------- Atomic appearance bundles ---------- */
  var wallToken = 0, committedBundle = null, reflowToken = 0, fontSwitchToken = 0;
  function registeredMaterial(id) { return S.c.bg === 'photo' && S.c.material === 'soft' && !!wall(id); }
  /* Bundled wallpapers are files; Your picture is a set of object URLs made on the TV. */
  function wallAsset(id, kind) {
    // Until stored files are ready the slot borrows the first wallpaper, so Home never starts black.
    if (id === CUSTOM) return custom.urls && custom.urls[kind] || (custom.urls ? '' : wallAsset(WALLS[0].id, kind));
    if (kind === 'photo') return WP + id + '.jpg';
    if (kind === 'thumb' || kind === 'panel') return WP + id + '-' + kind + '.jpg';
    return 'assets/materials/' + id + '-' + kind + '.jpg';
  }
  function matSrc(id, material) { return wallAsset(id, material === 'soft' ? 'study-soft' : material === 'tint' ? 'field-clear' : 'field-frost'); }
  function makeImg(cls, src, key) {
    var im = document.createElement('img'); im.className = cls; im.alt = ''; im._src = src;
    im.src = key && !/^(?:blob|data):/.test(src) ? src + (src.indexOf('?') >= 0 ? '&' : '?') + 'cf=' + encodeURIComponent(key) : src;
    return im;
  }
  function whenReady(im, done) {
    var fin = false, timer = setTimeout(function () { finish(false); }, 8000);
    function finish(ok) { if (fin) return; fin = true; clearTimeout(timer); done(ok); }
    function ready() { if (im.decode) im.decode().then(function () { finish(true); }, function () { finish(false); }); else finish(true); }
    if (im.complete) { if (im.naturalWidth) ready(); else finish(false); }
    else { im.onload = ready; im.onerror = function () { finish(false); }; }
  }
  function swapImg(k, im) { var old = IMG[k]; if (old === im) return; im.style.cssText = old.style.cssText; if (old.id) im.id = old.id; old.parentNode.replaceChild(im, old); IMG[k] = im; }
  function bundleKey(look) { return look.wall + '|' + look.material + (look.wall === CUSTOM ? '|' + custom.stamp : ''); }
  function loadBundle(look, token, done) {
    var key = bundleKey(look), imgs = { photo: makeImg('photo', wallAsset(look.wall, 'photo'), key), bg: makeImg('sheet-bg', wallAsset(look.wall, 'panel'), key) }, keys, left, allOk = true;
    imgs.mat = makeImg('mat-img', matSrc(look.wall, look.material), key);
    keys = Object.keys(imgs); left = keys.length;
    keys.forEach(function (k) { whenReady(imgs[k], function (ok) {
      allOk = allOk && ok;
      if (--left || token !== wallToken) return;
      done(allOk ? { key: bundleKey(look), imgs: imgs } : null);
    }); });
  }
  function installBundle(bundle, look) {
    if (bundle) {
      Object.keys(bundle.imgs).forEach(function (k) { swapImg(k, bundle.imgs[k]); });
      S.bundleKey = bundle.key;
    }
    S.shown = { bg: look.bg, wall: look.wall, material: look.material, font: look.font };
    S.wallShown = look.wall; S.wallPending = null; S.wallError = null;
  }
  function cleanPatch(patch) {
    var out = {}, k;
    if (!patch || typeof patch !== 'object') throw new Error('look needs an appearance patch');
    for (k in patch) if (patch.hasOwnProperty(k)) {
      if (k === 'wall') { if (!wall(patch[k])) throw new Error('Unknown wallpaper: ' + patch[k]); }
      else if (k === 'font') { if (!FONTS[patch[k]] || patch[k] !== 'manrope' && PRIVATE_FONTS.indexOf(patch[k]) < 0) throw new Error('Unavailable font: ' + patch[k]); }
      else if (!LOOK_VALUES[k] || LOOK_VALUES[k].indexOf(patch[k]) < 0) throw new Error('Invalid appearance value: ' + k);
      out[k] = patch[k];
    }
    return out;
  }
  function cancelLook() { wallToken++; S.pending = null; S.wallPending = null; S.lookError = null; }
  function setLook(patch, options) {
    var opts = options || {}, changes = cleanPatch(patch), target = lookOf(S.c), k, token, needs, needsFont, changed, loadedBundle = null, imageDone, fontDone, failed = false;
    for (k in changes) if (changes.hasOwnProperty(k)) target[k] = changes[k];
    changed = Object.keys(target).some(function (key) { return target[key] !== S.c[key]; });
    cancelLook(); S.err = null; token = wallToken;
    function finish(bundle) {
      var c = next(S.c.home.slice(), S.c.recent.slice()), fontChanged = target.font !== S.c.font, reflow = target.apps !== S.c.apps || target.controls !== S.c.controls || target.iconStyle !== S.c.iconStyle || fontChanged, frame, fontFrame;
      Object.keys(target).forEach(function (key) { c[key] = target[key]; });
      S.pending = null; S.wallPending = null;
      if (!opts.transient && changed && !write(c, 'Appearance')) { S.lookError = { type: 'save', patch: changes, row: opts.row || S.appearanceFocus, transient: false }; render(); syncRotation(); return; }
      if (opts.transient) S.c = c;
      if (reflow) { S.reflow = true; frame = ++reflowToken; }
      if (fontChanged) { S.fontSwitch = true; fontFrame = ++fontSwitchToken; }
      installBundle(bundle, target);
      if (bundle) committedBundle = bundle;
      S.lookError = null; S.previewBundle = null;
      render(); syncRotation();
      if (reflow) window.requestAnimationFrame(function () { window.requestAnimationFrame(function () {
        if (frame !== reflowToken) return;
        S.reflow = false; stage.className = stage.className.replace(/\s+is-reflow/g, '');
      }); });
      if (fontChanged) setTimeout(function () {
        if (fontFrame !== fontSwitchToken) return;
        S.fontSwitch = false; stage.className = stage.className.replace(/\s+is-font-switch/g, '');
      }, REDUCED_MOTION ? 130 : 170);
    }
    function fail(type, reason) {
      if (token !== wallToken || failed) return;
      failed = true; S.pending = null; S.wallPending = null;
      if (type === 'load') S.wallError = target.wall;
      S.lookError = { type: type, reason: reason || null, patch: changes, row: opts.row || (type === 'font' ? 'font' : S.appearanceFocus), transient: !!opts.transient, wall: target.wall, font: target.font };
      if (type === 'font') log((opts.startup ? 'font fallback: ' : 'Font kept: ') + (opts.startup ? target.font : FONTS[S.c.font].name) + (opts.startup ? '' : ' (' + reason + ')'));
      if (type === 'font' && opts.startup && target.font !== 'manrope') { setLook({ font: 'manrope' }, { transient: true }); return; }
      render(); syncRotation();
    }
    function complete() {
      if (!imageDone || !fontDone || failed || token !== wallToken) return;
      window.requestAnimationFrame(function () { if (!failed && token === wallToken) finish(loadedBundle); });
    }
    needs = target.bg === 'photo' && S.bundleKey !== bundleKey(target) && (opts.reload || !S.shown || S.shown.bg !== 'photo' || target.wall !== S.c.wall || materialApplies(target));
    needsFont = !fontMetrics[target.font]; imageDone = !needs; fontDone = !needsFont;
    if (!needs && !needsFont) { finish(null); return; }
    S.pending = { patch: changes, target: target, row: opts.row || (needsFont ? 'font' : S.appearanceFocus), transient: !!opts.transient, preview: false };
    if (needs) {
      S.wallPending = target.wall;
      loadBundle(target, token, function (bundle) {
        if (!bundle) { fail('load'); return; }
        loadedBundle = bundle; imageDone = true; complete();
      });
    }
    if (needsFont) ensureFont(target.font, function (ok, reason) {
      if (!ok) { fail('font', reason); return; }
      fontDone = true; complete();
    });
    render();
  }
  function showWall(id, done) {
    var target = lookOf(S.c), token;
    target.bg = 'photo'; target.wall = id;
    cancelLook(); token = wallToken; S.wallError = null;
    S.pending = { patch: { wall: id }, target: target, row: 'bg', preview: true, transient: false }; S.wallPending = id;
    loadBundle(target, token, function (bundle) {
      S.pending = null; S.wallPending = null;
      if (!bundle) { S.wallError = id; done(false); return; }
      S.previewBundle = bundle; installBundle(bundle, target); done(true);
    });
    render();
  }
  function restoreLook() {
    cancelLook(); S.previewBundle = null;
    if (S.c.bg === 'photo' && committedBundle && committedBundle.key === bundleKey(S.c)) installBundle(committedBundle, S.c);
    else if (S.c.bg !== 'photo' || S.bundleKey === bundleKey(S.c)) installBundle(null, S.c);
    else setLook({}, { transient: true });
  }

  /* ---------- Lifecycle and remote input ---------- */
  var clockTimer = 0, rotationTimer = 0, activeSince = 0, activeMs = 0, rotationKey = '';
  function rotationActive() { return !document.hidden && top().id === 'home' && S.c.bg === 'photo' && !S.pending && mode().min > 0; }
  function pauseRotation() {
    if (activeSince) { activeMs += Date.now() - activeSince; activeSince = 0; }
    clearTimeout(rotationTimer); rotationTimer = 0;
  }
  function resetRotation() { pauseRotation(); activeMs = 0; rotationKey = ''; }
  function syncRotation() {
    var key = S.c.wall + '|' + S.c.mode;
    pauseRotation();
    if (key !== rotationKey) { activeMs = 0; rotationKey = key; }
    if (!rotationActive()) return;
    activeSince = Date.now();
    rotationTimer = setTimeout(function () {
      pauseRotation(); activeMs = 0;
      if (rotationActive()) setLook({ wall: WALLS[(wallIndex(S.c.wall) + 1) % WALLS.length].id }, { row: 'bg' });
    }, Math.max(10, mode().min * QA.minuteMs - activeMs));
  }
  /* Seconds (and a flip clock finishing its turn) repaint only the time, every second. */
  var secondTimer = null;
  function secondTick() {
    clearTimeout(secondTimer);
    if (document.hidden || S.c.seconds !== 'on') return;
    secondTimer = setTimeout(function () { if (top().id === 'home' || isSettingsDetail(top())) patchClock(); secondTick(); }, 1000 - (Date.now() % 1000) + 8);
  }
  function updateClock() {
    clearTimeout(clockTimer);
    if (document.hidden) return;
    function paintCaption() {
      if (top().id === 'home' || isSettingsDetail(top())) renderCaption(top(), homeState(top()));
      else if (top().id === 'settings' && metroOn()) render();
    }
    paintCaption();
    refreshWeather(paintCaption);
    clockTimer = setTimeout(updateClock, 60000 - (Date.now() % 60000) + 30);
    secondTick();
  }
  function focusStage() { try { stage.focus({ preventScroll: true }); } catch (e) { stage.focus(); } }
  function after() { norm(); render(); syncRotation(); }
  function goScene(name) {
    if (top().id === 'wallpaper') cancelWallpaperTimer(top());
    S.stack = [S.stack[0]]; S.stack[0].f.zone = 'apps'; clearSession(); restoreLook();
    if (name === 'apps') openApps();
    else if (name === 'settings') openSettings();
    else if (name === 'appearance') { openSettings(); top().f.id = 'background'; S.settingsFocus = 'background'; openAppearance('background'); }
    else if (name === 'editor') { openSettings(); openEditor('settings'); }
    after();
  }
  function fit() {
    var scale = Math.min(window.innerWidth / 1920, window.innerHeight / 1080);
    stage.style.transform = 'scale(' + scale + ')';
    stage.style.left = ((window.innerWidth - 1920 * scale) / 2) + 'px';
    stage.style.top = ((window.innerHeight - 1080 * scale) / 2) + 'px';
  }
  function renderedAction(el) {
    return el.getClientRects().length > 0 && window.getComputedStyle(el).visibility !== 'hidden';
  }
  function focusedAction() {
    var root = isSettingsDetail(top()) ? appearanceEl : sheetEl.hidden ? homeEl : sheetEl, els = root.querySelectorAll('.is-focus[data-action]'), i;
    for (i = 0; i < els.length; i++) if (renderedAction(els[i])) return els[i].getAttribute('data-action');
    return null;
  }
  function activate(action) {
    var root = isSettingsDetail(top()) ? appearanceEl : sheetEl.hidden ? homeEl : sheetEl, els = root.querySelectorAll('[data-action]'), i;
    if (action === 'appearance.bg' && top().id === 'appearance' && top().group === 'background') action = 'background.wallpaper';
    if (action === 'settings.appearance' && top().id === 'settings') action = 'settings.group.background';
    for (i = 0; i < els.length; i++) if ((renderedAction(els[i]) || els[i].getAttribute('data-drop')) && els[i].getAttribute('data-action') === action) { pointAt(els[i]); return true; }
    return false;
  }
  function pointAt(el) {
    var t = top(), v = V[t.id];
    norm();
    if (v.point) v.point(t, el.getAttribute('data-z'), +el.getAttribute('data-i'), el.getAttribute('data-id'));
    norm();
    render();
    syncRotation();
  }

  utilsEl.addEventListener('mouseover', function (ev) {
    var b = ev.target, t = top(), z, i;
    if (utilsEl.className.indexOf('quiet-utils') < 0 || t.lifted) return;
    while (b && b !== utilsEl && !(b.getAttribute && b.getAttribute('data-z'))) b = b.parentNode;
    if (!b || b === utilsEl || (ev.relatedTarget && b.contains(ev.relatedTarget))) return;
    z = b.getAttribute('data-z'); i = Number(b.getAttribute('data-i'));
    if ((t.id !== 'home' || z !== 'util') && (t.id !== 'arrange' || z !== 'ctl')) return;
    if (t.f.zone === z && t.f.u === i) return;
    t.f.zone = z; t.f.u = i;
    if (z === 'util') S.lastUtil = i;
    render();
  });
  stage.addEventListener('click', function (ev) {
    var el = ev.target;
    while (el && el !== stage && !(el.getAttribute && el.getAttribute('data-z'))) el = el.parentNode;
    focusStage();
    if (!el || el === stage) return;
    pointAt(el);
  });
  var heldKeys = {};
  document.addEventListener('keydown', function (ev) {
    var code = ev.keyCode, k = KEYS[code];
    if (code === 9) { ev.preventDefault(); return; }
    if (!k || ev.metaKey || ev.ctrlKey || ev.altKey) return;
    ev.preventDefault();
    if (k === 'ok' || k === 'back' || SLOTS.indexOf(k) >= 0 || MEDIA[k]) { if (ev.repeat || heldKeys[code]) return; heldKeys[code] = true; }
    if (SLOTS.indexOf(k) >= 0) { if (top().id !== 'wifitype') colourKey(k); return; }
    if (MEDIA[k]) { if (top().id !== 'wifitype') spotifyKey(MEDIA[k]); return; }
    press(k);
  });
  document.addEventListener('keyup', function (ev) { delete heldKeys[ev.keyCode]; });
  window.addEventListener('blur', function () { heldKeys = {}; });
  window.addEventListener('focus', function () { release(); focusStage(); after(); updateClock(); });
  document.addEventListener('visibilitychange', function () {
    heldKeys = {};
    if (document.hidden) {
      pauseRotation(); clearTimeout(clockTimer); stopRelay(); syncVideo(); clearTimeout(alexa.timer); alexa.timer = null; clearTimeout(spot.timer); spot.timer = null; clearTimeout(secondTimer); clearTimeout(cal.timer);
      if (S.hdmiInApp) { S.hdmiInApp = false; if (FrameDevice.hideHdmiView) FrameDevice.hideHdmiView(); }
    }
    else { goHome(); release(); after(); updateClock(); focusStage(); startRelay(); alexaPoll(true); spotifyPoll(true); showLegend(6000, true); dateDetails(); }
  });
  /* The remote's Home button (and any return to the app) always lands on the Home screen: every open
     panel is closed the way Back would close it, and focus goes to the apps (the last app stays
     selected). The remote test stays open, since it is there to watch these events. */
  function goHome() {
    var guard = 16, t, before;
    if (top().id === 'remotetest') return;
    while (S.stack.length > 1 && guard--) {
      t = top(); before = S.stack.length;
      try { V[t.id].key(t, 'back'); } catch (e) { /* fall through to a plain pop */ }
      norm();
      if (S.stack.length >= before && top() === t) S.stack.pop();
    }
    S.stack.length = 1;
    top().f.zone = 'apps';
    render(); syncRotation();
  }
  /* Tizen relaunches a running app with an app control when it is started again (Home button). */
  function relaunched(ev) { if (ev && ev.__home) return; if (ev) ev.__home = true; if (!document.hidden) { goHome(); focusStage(); } }
  window.addEventListener('appcontrol', relaunched);
  document.addEventListener('appcontrol', relaunched);
  window.addEventListener('tizenhwkey', function (ev) { if (/home/i.test(ev.keyName || '')) relaunched(); });
  window.addEventListener('resize', fit);
  if (wifiQrEl) wifiQrEl.addEventListener('click', function () {
    if (top().id !== 'wifiqr') return;
    pop(); render(); syncRotation();
  });

  /* Readable browser checks use the real state and actions, without fake outcomes. */
  var NAV = { left: 'left', right: 'right', up: 'up', down: 'down', ok: 'ok', enter: 'ok', back: 'back', escape: 'back' };
  QA.state = function () {
    var out = serialise(S.c), t = top(), item = t.id === 'appearance' ? detailLocation(t).item : null;
    out.committed = S.c; out.shown = S.shown; out.pending = S.pending; out.view = t.id; out.selected = S.sel;
    out.focusAction = focusedAction(); out.writes = S.writes; out.failedWrites = S.failed; out.error = S.err;
    out.catalog = { loading: catalog.loading, loaded: catalog.loaded, error: catalog.error, ids: ALPHA.slice() };
    out.fonts = { available: LOOK_VALUES.font.slice(), loaded: Object.keys(fontMetrics).filter(function (id) { return !fontMetrics[id].fallback; }), baselineFallback: !!(fontMetrics.manrope && fontMetrics.manrope.fallback), error: S.lookError && S.lookError.type === 'font' ? S.lookError : null };
    out.rotation = { activeMs: activeMs + (activeSince ? Date.now() - activeSince : 0), active: !!activeSince };
    out.draft = t.lifted ? { id: t.lifted.id, order: t.lifted.order.slice() } : null;
    out.settingsGroup = t.id === 'wallpaper' ? 'wallpaper' : t.id === 'appearance' ? t.group : null;
    out.wifiQr = { ssid: S.c.wifiSsid, ready: wifiReady(), sec: S.c.wifiSec };
    out.focusedChoice = item && item.axis ? { axis: item.axis, value: item.value, action: item.action, disabled: item.disabled } : null;
    out.candidate = out.focusedChoice ? { axis: item.axis, value: item.value, action: item.action, pending: !!S.pending, pendingTarget: S.pending ? S.pending.target : null } : null;
    out.wallpaperPicker = t.id === 'wallpaper' ? { candidate: WALLS[t.i].id, applied: S.c.wall, shown: S.wallShown, pending: t.previewDue || S.wallPending,
      queuedApplying: !!t.applyPending, applyPending: t.applyPending, failed: t.failedId, zone: t.f.zone, top: t.top, visible: WALL_VISIBLE, backdrop: IMG.bg.src } : null;
    out.undo = S.undo.map(function (u) { return u.label; }); out.storageOk = storageOk;
    out.backup = { phase: bk.phase, mode: bk.mode, url: bk.url, detail: bk.detail, hasFile: !!bk.text };
    out.appVersion = APP_VERSION;
    return JSON.parse(JSON.stringify(out));
  };
  QA.where = function () {
    var action = focusedAction(), active = stage.querySelectorAll('.is-focus[data-action]'), count = 0, name = '';
    /* While a sheet fades in, Home is only the picture underneath: its focus does not count. */
    Array.prototype.forEach.call(active, function (el) { if (stage.classList.contains('sheet-opening') && !sheetEl.hidden && homeEl.contains(el)) return; if (renderedAction(el)) { count++; if (el.getAttribute('data-action') === action) name = el.getAttribute('aria-label') || el.textContent.replace(/\s+/g, ' ').trim(); } });
    return { view: top().id, settingsGroup: top().id === 'wallpaper' ? 'wallpaper' : top().id === 'appearance' ? top().group : null, focus: name, focusAction: action, focusCount: count, wallpaper: S.wallShown, zone: top().f.zone || null };
  };
  QA.ready = function () { return fontsReady && !S.pending && !!S.shown && S.shown.bg === S.c.bg && S.shown.wall === S.c.wall && S.shown.font === S.c.font; };
  QA.nav = function () { var keys = arguments.length === 1 && Array.isArray(arguments[0]) ? arguments[0] : Array.prototype.slice.call(arguments); keys.forEach(function (key) { if (!NAV[key]) throw new Error('Unknown key'); press(NAV[key]); }); return QA.state(); };
  QA.look = function (patch) { setLook(patch, {}); return QA.state(); };
  QA.scene = function (name) { if (['home', 'apps', 'settings', 'appearance', 'editor'].indexOf(name) < 0) throw new Error('Unknown view'); goScene(name); return QA.state(); };
  QA.activate = function (action) { return activate(action) ? QA.state() : null; };
  QA.actions = function () { var view = isSettingsDetail(top()) ? appearanceEl : sheetEl.hidden ? homeEl : sheetEl; return Array.prototype.filter.call(view.querySelectorAll('[data-action]'), function (el) { return renderedAction(el) || !!el.getAttribute('data-drop'); }).map(function (el) { return el.getAttribute('data-action'); }); };

  /* ---------- Start ---------- */
  cueL.innerHTML = icon('left'); cueR.innerHTML = icon('right');
  function forkMeta() { return window.FrameFork || { displayName: 'CleanFrame', previewHint: '' }; }
  function showBuildVersion() {
    var fork = forkMeta();
    if (fork.displayName) document.title = fork.displayName;
    if (!buildVersion) return;
    if (window.tizen && window.tizen.application) { buildVersion.hidden = true; buildVersion.setAttribute('aria-hidden', 'true'); return; }
    buildVersion.textContent = fork.displayName + ' · v' + APP_VERSION;
    buildVersion.hidden = false;
    buildVersion.removeAttribute('aria-hidden');
  }
  initialise();
  applyLanguage();
  showBuildVersion();
  function start() {
    setLook({}, { transient: true, startup: true });
    norm(); render(); fit(); focusStage(); updateClock(); syncRotation();
    refreshWeather(function () { render(); syncRotation(); });
    alexaPoll(true); spotifyPoll(true); showLegend(6000, true); dateDetails();
  }
  if (FCW && S.c.customAt) { FCW.persist(); loadCustom(function () { start(); startRelay(); }); } else { start(); startRelay(); }
})();
