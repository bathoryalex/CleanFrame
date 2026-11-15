/* CleanFrame Home. Static materials, local preferences and public Tizen app controls. */
(function () {
  'use strict';

  /* ---------- Bundled data ---------- */
  var ASSETS = 'assets/', ICONS = ASSETS + 'icons/', WP = ASSETS + 'wallpapers/';
  var APP_VERSION = '0.10.0';
  var CAP = 9, SCRIM_Y = 560;
  var DOCK_MODES = { both: { tw: 288, th: 200, pitch: 296 }, text: { tw: 288, th: 104, pitch: 296 }, icons: { tw: 176, th: 144, pitch: 184 } };
  var GRID_ROW = 240, GRID_COL = 344, COLS = 5;
  var ED_ROW = 80, ED_SEP = 56, ED_VIEW = 752, STRIP_PITCH = 188;
  var PH_TOP = 220, PH_PITCH = 128, PH_FULL = 5, PH_HEIGHT = 944, PH_COMPACT_TOP = 144, PH_COMPACT_PITCH = 88, PH_COMPACT_VISIBLE = 9;
  var WALL_VISIBLE = 6, WALL_ROW = 92, WALL_DELAY = 200;
  var KEYS = { 37: 'left', 38: 'up', 39: 'right', 40: 'down', 13: 'ok', 27: 'back', 8: 'back', 10009: 'back', 461: 'back' };
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
  var PREF_VALUES = { lang: ['en', 'hu'], clock: ['24', '12'], date: ['off', 'on'], clockPos: ['corner', 'center', 'large'], weather: ['off', 'now', 'day'] };
  var PREF_NAMES = { en: 'English', hu: 'Magyar', '24': '24-hour', '12': '12-hour', corner: 'Corner', center: 'Centre', large: 'Large', off: 'Off', on: 'On', now: 'Basic', day: 'Full' };
  WALLS.forEach(function (w) { w.ut = w.ut || { tr: 'light', br: 'light' }; w.frostVeil = w.frostVeil || .12; });
  var MODES = [
    { id: 'fixed', name: 'Fixed', min: 0 }, { id: 'open', name: 'Each time Home opens', min: 0 },
    { id: '5', name: 'Every 5 minutes', min: 5 }, { id: '15', name: 'Every 15 minutes', min: 15 },
    { id: '60', name: 'Every hour', min: 60 }
  ];
  var KEY = 'cleanframe.home.v1', storageOk = true, catalog = { loading: false, loaded: false, error: null, request: 0, revision: 0 };
  /* Your picture: one wallpaper slot that a phone fills through an ntfy.sh topic (assets/custom-wallpaper.js). */
  var CUSTOM = 'custom', FCW = window.FrameCustomWallpaper, RELAY = (window.FrameFork && window.FrameFork.relay) || 'https://ntfy.sh';
  var custom = { urls: null, stamp: 0, phase: 'idle', name: '', busy: false, queued: null, link: 'idle', detail: '', relay: null };
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
  var LOOK_VALUES = { bg: ['dark', 'light', 'photo'], layout: ['list', 'dock'], apps: ['icons', 'both', 'text'], iconStyle: ['color', 'minimal'], font: Object.keys(FONTS).filter(function (id) { return id === 'manrope' || PRIVATE_FONTS.indexOf(id) >= 0; }), controls: ['icons', 'both', 'text'], focus: ['type', 'glass'], material: ['soft', 'frost', 'tint'] };
  var LOOK_NAMES = { bg: 'Background', layout: 'Layout', apps: 'Apps', font: 'Font', controls: 'Home controls', focus: 'Focus', material: 'Material' };
  var VALUE_NAMES = { dark: 'Dark', light: 'Light', photo: 'Photo', list: 'List', dock: 'Dock', type: 'Type', glass: 'Glass', soft: 'Soft', frost: 'Frost', tint: 'Clear tint', icons: 'Icons', both: 'Icons and text', text: 'Text', color: 'Color', minimal: 'Minimal' };
  var UTIL = { art: ['Art Mode', 'art'], wifi: ['Wi‑Fi', 'wifi'], apps: ['All apps', 'apps'], arrange: ['Arrange', 'arrange'], settings: ['Settings', 'settings'] };
  var WIFI_CHARS = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789-_. !@#$%&*+';
  var MSG = {
    leave: { title: 'Leave Home?', line: 'Open Samsung Home?', note: '', actions: [['stay', 'Stay'], ['samsung', 'Samsung Home']] },
    wifiSetup: { title: 'Wi‑Fi QR not set up', line: 'Add your network name in Settings → Wifi QR code settings.', note: '', actions: [['settings', 'Open Settings'], ['stay', 'Close']] }
  };
  var SVG = {
    art: '<rect x="3.5" y="4.5" width="17" height="15" rx="2"/><circle cx="9" cy="9.8" r="1.5"/><path d="m4.5 17.5 4.5-4.5 3 3 2.5-2.5 5 5"/>',
    apps: '<rect x="4" y="4" width="6.5" height="6.5" rx="1.6"/><rect x="13.5" y="4" width="6.5" height="6.5" rx="1.6"/><rect x="4" y="13.5" width="6.5" height="6.5" rx="1.6"/><rect x="13.5" y="13.5" width="6.5" height="6.5" rx="1.6"/>',
    wifi: '<path d="M2.5 8.2a14 14 0 0 1 19 0"/><path d="M5.8 11.6a9.2 9.2 0 0 1 12.4 0"/><path d="M9.1 15a4.5 4.5 0 0 1 5.8 0"/><circle cx="12" cy="18.4" r="1.2"/>',
    arrange: '<path d="M4 8.5h14M15 5.5l3 3-3 3M20 15.5H6M9 12.5l-3 3 3 3"/>',
    settings: '<path d="m9 3-.6 2.4-2 1.2L4 6l-2 3.5L3.8 11v2L2 14.5 4 18l2.4-.6 2 1.2L9 21h6l.6-2.4 2-1.2 2.4.6 2-3.5-1.8-1.5v-2L22 9.5 20 6l-2.4.6-2-1.2L15 3Z"/><circle cx="12" cy="12" r="3.2"/>',
    home: '<path d="M4 11 12 4.5l8 6.5v8a1 1 0 0 1-1 1h-4.5v-6h-5v6H5a1 1 0 0 1-1-1Z"/>',
    undo: '<path d="M9 6 5 10l4 4"/><path d="M5 10h9.5a4.5 4.5 0 0 1 0 9H11"/>',
    check: '<path d="m5.5 12.5 4 4 9-9"/>',
    plus: '<path d="M12 5v14M5 12h14"/>',
    left: '<path d="m14.5 5-7 7 7 7"/>',
    right: '<path d="m9.5 5 7 7-7 7"/>',
    up: '<path d="m5 15.5 7-7 7 7"/>',
    down: '<path d="m5 8.5 7 7 7-7"/>',
    updown: '<path d="m7.5 9.5 4.5-4.5 4.5 4.5M7.5 14.5l4.5 4.5 4.5-4.5"/>',
    tv: '<rect x="3" y="4.5" width="18" height="12" rx="2"/><path d="M8.5 20h7"/>',
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
  var scroll = { first: 0, photo: 0, photoArrange: 0 };
  function pick(v, list, fallback) {
    v = String(v || '').toLowerCase();
    for (var i = 0; i < list.length; i++) if (list[i].toLowerCase() === v) return list[i];
    return fallback;
  }
  function lookOf(c) { return { bg: c.bg, wall: c.wall, layout: c.layout, apps: c.apps, iconStyle: c.iconStyle, font: c.font, controls: c.controls, focus: c.focus, material: c.material }; }
  function materialApplies(c) { c = c || S.c; return c.bg === 'photo' && (c.layout === 'dock' || c.focus === 'glass'); }
  function derivedTheme() { return S.c.layout === 'list' ? 'list' : 'shore'; }

  /* ---------- Helpers ---------- */
  function app(id) { for (var i = 0; i < APPS.length; i++) if (APPS[i].id === id) return APPS[i]; return null; }
  function wall(id) { for (var i = 0; i < WALLS.length; i++) if (WALLS[i].id === id) return WALLS[i]; return null; }
  function wallIndex(id) { for (var i = 0; i < WALLS.length; i++) if (WALLS[i].id === id) return i; return 0; }
  function frostClass(w) { var i = [.12, .20, .30, .36, .44].indexOf(w.frostVeil); return i > 0 ? ' fv-' + (i + 1) : ''; }
  function wallClasses(w) { return frostClass(w) + (w.listColumn ? ' lc-' + w.listColumn : '') + (w.dockQuiet ? ' db-quiet' : '') + (w.clockMist ? ' tl-mist' : ''); }
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
    var w = S.c.apps === 'icons' ? 128 : 112;
    return withDockMark(appMark(a, w, DOCK_MARK_H, DOCK_MARK_H, true));
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
    if (a.mark && (maskSupport || S.c.bg !== 'light')) return dock ? markHtmlDock(brand, w, h) : markHtml(brand, w, h, size);
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
  function photoLabel(id, compact) {
    var text = app(id).name, size = compact ? 56 : 88, limit = compact ? 640 : 992, width = textWidth(text, size, 600, -1.8, 'display');
    if (!compact && width > limit) { size = 76; width = textWidth(text, size, 600, -1.8, 'display'); }
    // Newsreader's ninth compact Type row otherwise enters the lower fade by .63px.
    return { size: size, top: (compact ? 10.66 : size === 76 ? 10.36 : 9.68) + fontShift('display', size) - (compact && homeFont() === 'newsreader' ? .7 : 0), width: Math.min(limit, width), ellipsis: width > limit };
  }
  function listPlateWidth(id, compact) {
    if (S.c.apps === 'icons') return compact ? 120 : 144;
    var text = S.c.apps === 'text';
    return clamp(Math.ceil(photoLabel(id, compact).width + (text ? 84 : compact ? 156 : 184)), text ? 280 : 360, text ? compact ? 724 : 1076 : compact ? 796 : 1176);
  }

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
    var legacyList = s.theme === 'list', h = [], recent = [], records = Array.isArray(s.appRecords) ? s.appRecords : [];
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
      bg: pick(modern.bg, LOOK_VALUES.bg, legacyList ? 'dark' : 'photo'), layout: pick(modern.layout, LOOK_VALUES.layout, legacyList ? 'list' : 'dock'),
      apps: pick(modern.apps, LOOK_VALUES.apps, legacyList ? 'text' : 'both'), iconStyle: pick(modern.iconStyle, LOOK_VALUES.iconStyle, 'color'), controls: pick(modern.controls, LOOK_VALUES.controls, 'both'),
      focus: pick(modern.focus, LOOK_VALUES.focus, legacyList ? 'type' : 'glass'), material: pick(modern.material, LOOK_VALUES.material, 'soft'),
      font: pick(modern.font, LOOK_VALUES.font, 'manrope'), wall: wall(modern.wall || s.wallpaper) ? modern.wall || s.wallpaper : WALLS[0].id,
      home: h, recent: recent, lastApp: h.indexOf(s.lastApp) >= 0 ? s.lastApp : h[0],
      mode: pick(s.mode, MODES.map(function (m) { return m.id; }), 'fixed'),
      wifiSsid: typeof s.wifiSsid === 'string' ? s.wifiSsid.slice(0, 32) : '',
      wifiPass: typeof s.wifiPass === 'string' ? s.wifiPass.slice(0, 63) : '',
      wifiSec: s.wifiSec === 'nopass' ? 'nopass' : 'WPA',
      lang: pick(s.lang, PREF_VALUES.lang, 'en'), clock: pick(s.clock, PREF_VALUES.clock, '24'), clockPos: pick(s.clockPos, PREF_VALUES.clockPos, 'corner'), date: pick(s.date, PREF_VALUES.date, 'off'), weather: pick(s.weather, PREF_VALUES.weather, 'day'),
      customAt: typeof s.customAt === 'number' && wall(CUSTOM) ? s.customAt : 0, customTone: s.customTone === 'light' ? 'light' : 'dark',
      relayTopic: safeId(s.relayTopic) ? s.relayTopic : '', relayAt: typeof s.relayAt === 'number' ? s.relayAt : 0, relaySince: safeId(s.relaySince) ? s.relaySince : ''
    };
  }
  function serialise(c) {
    var out = {}, id;
    Object.keys(c).forEach(function (key) { out[key] = c[key]; });
    out.version = 2; out.look = lookOf(c); out.dock = c.home.slice(); out.wallpaper = c.wall;
    out.theme = c.layout === 'list' ? 'list' : 'shore';
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
    registerTvKeys();
    loadWeatherCache();
  }
  function registerTvKeys() {
    if (!window.tizen || !tizen.tvinputdevice) return;
    try {
      if (tizen.tvinputdevice.registerKeyBatch) tizen.tvinputdevice.registerKeyBatch(['Back', 'XF86Back']);
      else { tizen.tvinputdevice.registerKey('Back'); tizen.tvinputdevice.registerKey('XF86Back'); }
    } catch (e) { /* optional on preview */ }
  }
  function clearSession() { S.undo = []; S.removedAt = {}; S.note = null; S.err = null; }
  function begin() { S.note = null; }
  function next(home, recent) {
    var c = lookOf(S.c);
    c.home = home; c.recent = recent; c.lastApp = S.c.lastApp; c.mode = S.c.mode;
    c.wifiSsid = S.c.wifiSsid; c.wifiPass = S.c.wifiPass; c.wifiSec = S.c.wifiSec;
    c.lang = S.c.lang; c.clock = S.c.clock; c.clockPos = S.c.clockPos; c.date = S.c.date; c.weather = S.c.weather;
    c.customAt = S.c.customAt; c.customTone = S.c.customTone; c.relayTopic = S.c.relayTopic; c.relayAt = S.c.relayAt; c.relaySince = S.c.relaySince;
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
  function utils() { return ['wifi', 'apps', 'settings']; }
  /* prev/next run along the apps; out goes to the controls, inn comes back (or to a per-app action). */
  function axes() {
    var v = S.c.layout === 'list';
    return { prev: v ? 'up' : 'left', next: v ? 'down' : 'right', out: v ? 'right' : 'up', inn: v ? 'left' : 'down' };
  }
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
    if (u === 'wifi') openWifiQr();
    else if (u === 'apps') openApps();
    else openSettings();
  }
  function addAppsRoute() { openEditor('home'); }
  function openSettings() { push({ id: 'settings', f: { id: S.settingsFocus } }); }
  function openAppearance(group) {
    var axis = { background: 'bg', layout: 'layout', typography: 'font', focus: 'focus', region: 'lang' }[group];
    var action = S.detailFocus[group] || (axis ? 'choice.' + axis + '.' + S.c[axis] : group === 'rotation' ? 'rotation.' + S.c.mode : 'wifi.edit.ssid');
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
      if (S.c.layout === 'list') { listHomeKey(t, k, i, U); return; }
      if (f.zone === 'util') {
        f.u = clamp(f.u, 0, U.length - 1);
        if (k === x.prev && f.u > 0) f.u--;
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
      if (z === 'util') { t.f.zone = 'util'; t.f.u = i; S.lastUtil = i; }
      else if (z === 'app') { t.f.zone = 'apps'; setSel(S.c.home[i]); }
      else if (z === 'empty') t.f.zone = 'apps';
      else return;
      this.key(t, 'ok');
    }
  };
  function listHomeKey(t, k, i, U) {
    var f = t.f, h = S.c.home;
    if (hdmiBack(k)) return;
    if (f.zone === 'util') {
      f.u = clamp(f.u, 0, U.length - 1);
      if (k === 'up' && f.u > 0) f.u--;
      else if (k === 'down' && f.u < U.length - 1) f.u++;
      else if (k === 'left' || k === 'back') f.zone = 'apps';
      else if (k === 'ok') { S.lastUtil = f.u; utilAction(U[f.u]); return; }
      S.lastUtil = f.u;
      return;
    }
    f.zone = 'apps';
    if (k === 'up' && i > 0) setSel(h[i - 1]);
    else if (k === 'right') { f.zone = 'util'; f.u = clamp(S.lastUtil, 0, U.length - 1); }
    else if (k === 'down' && i < h.length - 1) setSel(h[i + 1]);
    else if (k === 'back') openMessage('leave');
    else if (k === 'ok') { if (h.length) launch(S.sel); else addAppsRoute(); }
  }

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
  function editorCut() { return 5; }
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
      { id: 'layout', icon: 'layout', label: T('Layout'), value: T(VALUE_NAMES[S.c.layout]) },
      { id: 'typography', icon: 'type', label: T('Typography'), value: FONTS[S.c.font].name },
      { id: 'focus', icon: 'focus', label: T('Focus'), value: T(VALUE_NAMES[S.c.focus]) + (materialApplies() ? ', ' + T(VALUE_NAMES[S.c.material]) : '') },
      { id: 'editor', icon: 'apps', label: T('Apps on Home'), value: T(n === 1 ? '{0} app' : '{0} apps', n) },
      { id: 'region', icon: 'clock', label: T('Language and clock'), value: PREF_NAMES[S.c.lang] + ', ' + T(PREF_NAMES[S.c.clock]) + (S.c.clockPos === 'corner' ? '' : ', ' + T(PREF_NAMES[S.c.clockPos])) },
      { id: 'wifiqr', icon: 'wifi', label: T('Wifi QR code'), value: wifiReady() ? S.c.wifiSsid : T('Not set') },
      { id: 'samsung', icon: 'home', label: T('Samsung Home'), value: T('Leave Frame Home'), direct: true }];
  }
  function settingsIds() { return settingsRows().map(function (r) { return r.id; }); }
  var SETTINGS_COLS = 4;
  V.settings = {
    sheet: true,
    norm: function (t) { var ids = settingsIds(); if (ids.indexOf(t.f.id) < 0) t.f.id = ids[0]; },
    key: function (t, k) {
      var ids = settingsIds(), i = Math.max(0, ids.indexOf(t.f.id)), col = i % SETTINGS_COLS;
      // A 4 x 2 card grid: each arrow moves to the neighbouring card.
      if (k === 'left' && col > 0) i--;
      else if (k === 'right' && col < SETTINGS_COLS - 1 && i < ids.length - 1) i++;
      else if (k === 'up' && i >= SETTINGS_COLS) i -= SETTINGS_COLS;
      else if (k === 'down' && i + SETTINGS_COLS < ids.length) i += SETTINGS_COLS;
      else if (k === 'back') { pop(); return; }
      t.f.id = ids[i]; S.settingsFocus = ids[i];
      if (k === 'ok') settingsOk(ids[i]);
    },
    point: function (t, z, i, id) { if (z === 'row' && id) { t.f.id = id; this.key(t, 'ok'); } }
  };
  function settingsOk(id) {
    if (id === 'editor') openEditor('settings');
    else if (id === 'samsung') perform('Samsung Home', FrameDevice.home);
    else openAppearance(id);
  }
  var DETAIL_NAMES = { background: 'Background', layout: 'Layout', typography: 'Typography', focus: 'Focus', rotation: 'Rotation', region: 'Language and clock', wifiqr: 'Wifi QR code settings' };
  function choice(axis, value, disabled) {
    return { action: axis === 'mode' ? 'rotation.' + value : axis === 'wifiSec' ? 'wifi.sec.' + value : 'choice.' + axis + '.' + value, axis: axis, value: value, disabled: !!disabled,
      label: axis === 'font' ? FONTS[value].name : axis === 'mode' ? T(MODES.filter(function (m) { return m.id === value; })[0].name) : axis === 'wifiSec' ? (value === 'nopass' ? T('Open network') : 'WPA/WPA2') : PREF_VALUES[axis] ? T(PREF_NAMES[value]) : value === 'both' ? T('Both') : T(VALUE_NAMES[value]) };
  }
  function detailSections(t) {
    var flat = S.c.bg !== 'photo', inactive = !materialApplies();
    function options(axis, values, disabled) { return values.map(function (value) { return choice(axis, value, disabled); }); }
    if (t.group === 'background') return [
      { id: 'bg', title: T('Background type'), items: options('bg', ['photo', 'light', 'dark']) },
      { id: 'wall', title: T('Wallpaper'), items: [{ action: 'background.wallpaper', label: T(wall(S.c.wall).name), thumbnail: true, disabled: flat }]
        .concat(FCW ? [{ action: 'background.custom', label: T('Picture from phone'), phone: true }] : []) },
      { id: 'rotation', title: T('Rotation'), items: [{ action: 'background.rotation', label: T(mode().name), disabled: flat }], reason: flat ? T('Choose Photo to use wallpaper and rotation.') : '' }
    ];
    if (t.group === 'layout') return [
      { id: 'layout', title: T('Layout'), horizontal: true, items: options('layout', ['list', 'dock']) },
      { id: 'apps', title: T('App display'), horizontal: true, items: options('apps', ['text', 'icons', 'both']) },
      { id: 'iconStyle', title: T('Icon style'), horizontal: true, items: options('iconStyle', ['color', 'minimal']) },
      { id: 'controls', title: T('Home controls'), horizontal: true, items: options('controls', ['text', 'icons', 'both']) }
    ];
    if (t.group === 'typography') return [{ id: 'font', title: '', items: options('font', LOOK_VALUES.font) }];
    if (t.group === 'focus') return [
      { id: 'focus', title: T('Focus style'), horizontal: true, items: options('focus', ['type', 'glass']) },
      { id: 'material', title: T('Material'), horizontal: true, items: options('material', ['soft', 'frost', 'tint'], inactive),
        reason: inactive ? flat ? T('Materials are available with a Photo background.') : T('Choose Glass focus or the Dock layout to use materials.') : '' }
    ];
    if (t.group === 'rotation') return [{ id: 'mode', title: '', items: options('mode', MODES.map(function (m) { return m.id; }), flat),
      reason: flat ? T('Choose Photo in Background to use rotation.') : T('Timed changes pause while Settings or another panel is open.') }];
    if (t.group === 'region') return [
      { id: 'lang', title: T('Language'), horizontal: true, items: options('lang', PREF_VALUES.lang) },
      { id: 'clock', title: T('Time format'), horizontal: true, items: options('clock', PREF_VALUES.clock) },
      { id: 'date', title: T('Date'), horizontal: true, items: options('date', PREF_VALUES.date) },
      { id: 'clockPos', title: T('Clock'), horizontal: true, items: options('clockPos', PREF_VALUES.clockPos) },
      { id: 'weather', title: T('Weather') + ' · ' + WEATHER_PLACE.name, horizontal: true, items: options('weather', PREF_VALUES.weather) }
    ];
    if (t.group === 'wifiqr') return [
      { id: 'ssid', title: T('Network name'), items: [{ action: 'wifi.edit.ssid', label: S.c.wifiSsid || T('Add network name'), description: T('SSID shown in the QR code') }] },
      { id: 'pass', title: T('Password'), items: [{ action: 'wifi.edit.pass', label: S.c.wifiPass ? T('Change password') : T('Add password'), description: S.c.wifiPass ? T('Saved (hidden)') : T('Optional for open networks') }] },
      { id: 'sec', title: T('Security'), horizontal: true, items: [choice('wifiSec', 'WPA'), choice('wifiSec', 'nopass')] }
    ];
    return [];
  }
  function detailRows(t) {
    var rows = [[{ action: 'settings.back', label: T(t.group === 'rotation' ? 'Background' : 'Settings') }]];
    detailSections(t).forEach(function (section) {
      var enabled = section.items.filter(function (item) { return !item.disabled; });
      if (section.horizontal && enabled.length) rows.push(enabled);
      else enabled.forEach(function (item) { rows.push([item]); });
    });
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
  }
  function applyRotation(value) {
    var c;
    if (S.c.bg !== 'photo') return;
    S.err = null; S.lookError = null;
    if (value === S.c.mode) return;
    c = next(S.c.home.slice(), S.c.recent.slice()); c.mode = value;
    if (!write(c, 'Wallpaper rotation')) S.lookError = { type: 'save', patch: { mode: value }, row: 'mode', transient: false };
  }
  function applyPref(axis, value) {
    var c = next(S.c.home.slice(), S.c.recent.slice()), patch = {};
    S.err = null; S.lookError = null;
    if (S.c[axis] === value) return;
    c[axis] = value; patch[axis] = value;
    if (!write(c, 'Preference ' + axis)) { S.lookError = { type: 'save', patch: patch, row: axis, transient: false }; return; }
    if (axis === 'lang') applyLanguage();
    if (axis === 'weather' && value !== 'off') refreshWeather(function () { render(); });
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
    else if (item.action === 'wifi.edit.ssid') openWifiField('ssid');
    else if (item.action === 'wifi.edit.pass') openWifiField('pass');
  }
  V.appearance = {
    norm: function (t) {
      var rows = detailRows(t), exists = false, applied = null;
      rows.forEach(function (items) { items.forEach(function (item) {
        if (item.action === t.f.action) exists = true;
        if (item.axis && item.value === S.c[item.axis]) applied = item;
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
      var at = detailLocation(t), row = at.row, column = at.column;
      if (k === 'back') { detailBack(); return; }
      if (k === 'ok') { detailOk(t, at.item); return; }
      if (k === 'up' || k === 'down') {
        row = clamp(row + (k === 'up' ? -1 : 1), 0, at.rows.length - 1);
        column = Math.min(t.f.column || 0, at.rows[row].length - 1);
        detailFocus(t, at.rows[row][column]);
      } else if (k === 'left' || k === 'right') {
        column = clamp(column + (k === 'left' ? -1 : 1), 0, at.rows[row].length - 1);
        detailFocus(t, at.rows[row][column], column);
      }
    },
    point: function (t, z, i, action) {
      if (z !== 'detail') return;
      detailRows(t).some(function (items) { return items.some(function (item, column) {
        if (item.action !== action) return false;
        detailFocus(t, item, column); detailOk(t, item); return true;
      }); });
    }
  };
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
      }
    },
    point: function (t, z, i) { if (z === 'act') { t.f.b = i; this.key(t, 'ok'); } }
  };
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
        if (!safeId(m.id) || m.id === S.c.relaySince) return;
        if (m.attachment && m.attachment.url) custom.queued = m;
        else savePrefs({ relaySince: m.id }, 'Channel message');
        drainPictures();
      }
    });
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
    var video = FCW.isVideo(attachment);
    if (!video && !FCW.isImage(attachment)) { custom.phase = 'notimage'; render(); return; }
    custom.busy = true; custom.phase = 'downloading'; custom.name = String(attachment.name || '').slice(0, 80); render();
    (video ? FCW.downloadVideo : FCW.download)(attachment.url, function (err, got) {
      if (err) { pictureFailed(err.code === 'decode' ? 'unreadable' : 'unreachable', err.detail); return; }
      custom.phase = 'processing'; render();
      // Let the status paint before the one-time image work starts.
      setTimeout(function () {
        FCW.processImage(video ? got.frame : got, function (failure, record) {
          if (failure) { pictureFailed('unreadable'); return; }
          if (video) record.files.video = got.blob;
          FCW.save(record, function (stored) {
            installCustom(record);
            savePrefs({ customAt: record.stamp, customTone: record.tone }, 'Your picture');
            custom.busy = false; custom.phase = stored ? 'done' : 'unsaved';
            setLook({ bg: 'photo', wall: CUSTOM }, { row: 'bg', reload: true });
            render(); drainPictures();
          });
        });
      }, 60);
    });
  }
  /* A video picture plays muted and looped over its first-frame photo, only while Home or a
     Settings preview shows it and the app is visible; otherwise it is paused or released. */
  var photoVideo = document.getElementById('photoVideo');
  function syncVideo() {
    var url = custom.urls && custom.urls.video, t = top(), visible = !document.hidden && !V[t.id].sheet && t.id !== 'wifiqr',
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
  function installCustom(record) {
    var old = custom.urls;
    custom.urls = FCW.urls(record); custom.stamp = record.stamp;
    addCustomWall(record.tone);
    if (old) setTimeout(function () { Object.keys(old).forEach(function (k) { URL.revokeObjectURL(old[k]); }); }, 5000);
  }
  function loadCustom(done) {
    var finished = false, timer = setTimeout(function () { finish(null); }, 4000);
    function finish(record) {
      if (finished) return; finished = true; clearTimeout(timer);
      if (record) installCustom(record);
      else if (S.c.wall === CUSTOM) S.c.wall = WALLS[0].id;
      done();
    }
    FCW.load(finish);
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
      t.f.ci = clamp(t.f.ci, 0, WIFI_CHARS.length - 1);
      t.f.ai = clamp(t.f.ai, 0, 2);
      if (t.f.zone !== 'char' && t.f.zone !== 'act') t.f.zone = 'char';
    },
    key: function (t, k) {
      var f = t.f;
      if (f.zone === 'char') {
        if (k === 'left' && f.ci > 0) f.ci--;
        else if (k === 'right' && f.ci < WIFI_CHARS.length - 1) f.ci++;
        else if (k === 'down') f.zone = 'act';
        else if (k === 'ok') {
          if (t.field === 'pass' && t.draft.length >= 63) return;
          if (t.field === 'ssid' && t.draft.length >= 32) return;
          t.draft += WIFI_CHARS.charAt(f.ci);
        } else if (k === 'back') pop();
        return;
      }
      if (k === 'up') { f.zone = 'char'; return; }
      if (k === 'left' && f.ai > 0) f.ai--;
      else if (k === 'right' && f.ai < 2) f.ai++;
      else if (k === 'back') pop();
      else if (k === 'ok') {
        if (f.ai === 0) t.draft = t.draft.slice(0, -1);
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
  var stage = $('stage'), buildVersion = $('buildVersion'), homeEl = $('home'), caption = $('caption'), utilsEl = $('utils');
  var utilFocusLabel = $('utilFocusLabel'), utilFocusKey = '', appFocusName = $('appFocusName');
  var dock = $('dock'), shelf = $('shelf'), track = $('track'), plate = $('plate'), matScrim = $('matScrim'), dockEmpty = $('dockEmpty');
  var cueL = $('cueL'), cueR = $('cueR'), dockAction = $('dockAction');
  var focusStatus = $('focusStatus'), sceneEl = $('scene'), appearanceEl = $('appearance'), appearanceRows = $('appearanceRows'), appearanceDesc = $('appearanceDesc');
  var appearanceBack = $('appearanceBack'), appearanceTitle = $('appearanceTitle'), appearanceStatus = $('appearanceStatus');
  var phScene = $('phScene'), phPlate = $('phPlate'), phField = $('phField'), phList = $('phList'), phRows = $('phRows'), phAction = $('phAction'), phEmpty = $('phEmpty');
  var phPlates = [phPlate, $('phPlateAlt')], phFields = [phField, $('phFieldAlt')], photoPlateIndex = 0, photoPlateKey = null;
  var utPlates = [$('utLens'), $('utLensAlt')], utFields = [$('utField'), $('utFieldAlt')], utPlateIndex = 0, utPlateKey = null;
  var photoMode = null, photoTransitionToken = 0;
  var sheetEl = $('sheet'), sheetView = $('sheetView');
  var wifiQrEl = $('wifiQr'), wifiQrCanvas = $('wifiQrCanvas'), wifiQrSsid = $('wifiQrSsid'), wifiQrCard = $('wifiQrCard'), wifiQrTitle = $('wifiQrTitle'), wifiQrBg = $('wifiQrBg');
  var IMG = { photo: $('photo'), mat: $('matImg'), bg: $('sheetBg'), field: $('phFieldImg'), fieldAlt: $('phFieldImgAlt'), utility: $('utFieldImg'), utilityAlt: $('utFieldImgAlt') };
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
    stage.className = 'stage bg-' + S.c.bg + ' l-' + S.c.layout + ' m-' + (materialApplies() ? S.c.material : 'none') + ' f-' + S.c.focus + ' a-' + S.c.apps + ' i-' + S.c.iconStyle + ' u-' + S.c.controls + ' clock-' + S.c.clockPos + (S.c.clockPos !== 'corner' ? ' clock-big' : '') + ' tone-' + shown.tone + ' tr-' + tr + ' br-' + br + wallClasses(shown) + inkRungClasses(palette, adaptive) + ' at-' + t.id + ' font-' + homeFont() + (homeFont() !== 'manrope' ? ' font-custom' : '') + (S.fontSwitch ? ' is-font-switch' : '') + (adaptive ? ' has-adaptive-ink adaptive-tl-' + palette.tl.pol : '') + (!adaptive && shown.clockInk ? ' has-clock-ink' : '') + (!adaptive && shown.dockClockInk ? ' has-dock-clock-ink' : '') + (registeredMaterial(shown.id) ? ' registered-material' : '') + (sheet ? ' is-sheet' : '') + (t.id === 'wifiqr' ? ' is-wifi-qr' : '') + (S.hdmiInApp ? ' is-hdmi-input' : '') + (S.reflow ? ' is-reflow' : '');
    if (!adaptive && shown.clockInk) stage.style.setProperty('--clock-ink', shown.clockInk);
    else stage.style.removeProperty('--clock-ink');
    if (!adaptive && shown.dockClockInk) stage.style.setProperty('--dock-clock-ink', shown.dockClockInk);
    else stage.style.removeProperty('--dock-clock-ink');
    applyHomeFont();
    if (!sheet) renderHome(t);
    renderSheet(t, sheet);
    renderAppearance(t);
    renderWifiOverlay(t);
    renderFocusStatus(t);
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
  function wifiDraftDisplay(t) {
    if (t.field === 'pass') return t.draft ? Array(t.draft.length + 1).join('•') : T('No password');
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

  function renderHome(t) {
    var hs = homeState(t);
    renderCaption(t, hs);
    renderUtils(hs);
    if (S.c.layout === 'list') renderList(hs);
    else { photoMode = null; renderDock(hs); }
    renderAppFocusName(hs);
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
    var d = new Date(), h = d.getHours(), m = d.getMinutes(), suffix = '';
    if (S.c.clock === '12') { suffix = h < 12 ? 'AM' : 'PM'; h = h % 12 || 12; }
    return { text: h + ':' + (m < 10 ? '0' : '') + m, suffix: suffix };
  }
  var MONTHS = { en: ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'],
    hu: ['Január', 'Február', 'Március', 'Április', 'Május', 'Június', 'Július', 'Augusztus', 'Szeptember', 'Október', 'November', 'December'] };
  /* "15 November" in English, "November 15" in Hungarian. */
  function dateText() {
    var d = new Date(), month = (MONTHS[S.c.lang] || MONTHS.en)[d.getMonth()];
    return S.c.lang === 'hu' ? month + ' ' + d.getDate() : d.getDate() + ' ' + month;
  }
  function clockHtml() {
    var parts = clockParts(), text = parts.text, metrics = fontMetrics[homeFont()], suffix;
    if (metrics && metrics.digitCell) text = text.replace(/[0-9]/g, function (digit) { return '<span class="clock-digit">' + digit + '</span>'; });
    if (!parts.suffix) return text;
    // Hungarian writes the period first ("du. 3:07"); English after ("3:07 PM").
    suffix = '<span class="clock-period">' + esc(T(parts.suffix)) + '</span>';
    return S.c.lang === 'hu' ? suffix + text : text + suffix;
  }
  function renderCaption(t, hs) {
    var weatherHtml = weatherCaptionHtml(), date = S.c.date === 'on' ? '<span class="cap-date">' + esc(dateText()) + '</span>' : '', html;
    // Centred: date and weather share one smaller line under the clock. Corner: the date is a quiet second line.
    if (S.c.clockPos !== 'corner' && S.c.layout === 'dock') html = '<span class="caption-head"><span class="clock">' + clockHtml() + '</span>' + (date || weatherHtml ? '<span class="caption-sub">' + date + weatherHtml + '</span>' : '') + '</span>';
    else html = '<span class="caption-head"><span class="clock">' + clockHtml() + '</span>' + weatherHtml + '</span>' + date;
    caption.setAttribute('data-weather', S.c.weather === 'off' || weather.temp === null ? '' : String(weather.temp));
    if (S.c.apps !== 'icons' && !(S.c.clockPos !== 'corner' && S.c.layout === 'dock') && hs.items[hs.i] && (S.c.layout === 'list' ? photoLabel(hs.items[hs.i].id, false).size < 88 || photoLabel(hs.items[hs.i].id, false).ellipsis : hs.zone === 'apps' && reducedDockLabel(hs.items[hs.i].id))) html += '<span class="cap-line full-name">' + esc(app(hs.items[hs.i].id).name) + '</span>';
    setHTML(caption, html);
  }

  function utilBtn(z, i, action, inner, extra, name) {
    return '<button type="button" tabindex="-1" class="u' + (extra || '') + '" data-z="' + z + '" data-i="' + i + '" data-action="' + action + '" aria-label="' + esc(name) + '"><span class="u-content">' + inner + '</span></button>';
  }
  function renderUtils(hs) {
    var html = '', style = hs.mode === 'arrange' && S.c.controls !== 'text' ? 'both' : S.c.controls;
    var iconsOnly = style === 'icons', U = utils(), focused = null;
    utilsEl.className = 'utils quiet-utils is-' + style + (hs.zone === 'util' || hs.zone === 'ctl' ? ' is-awake' : '');
    U.forEach(function (u, i) { html += utilBtn('util', i, 'util.' + u, icon(UTIL[u][1], '', true) + '<span class="u-label">' + esc(T(UTIL[u][0])) + '</span>', '', T(UTIL[u][0])); });
    setHTML(utilsEl, html);
    Array.prototype.forEach.call(utilsEl.querySelectorAll('.u'), function (b) {
      var z = b.getAttribute('data-z'), focus = hs.zone === z && hs.u === Number(b.getAttribute('data-i'));
      b.className = b.className.replace(/\s+is-focus/g, '') + (focus ? ' is-focus' : '');
      if (focus) focused = b;
    });
    renderUtilFocusLabel(iconsOnly ? focused : null);
    renderUtilityLens(focused, iconsOnly);
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
    if (S.c.layout === 'list') x = 1730 - width;
    utilFocusLabel.style.width = width + 'px'; utilFocusLabel.style.left = clamp(x, 112, 1808 - width) + 'px';
    utilFocusLabel.style.top = ((S.c.layout === 'list' ? (r.top + r.height / 2 - sr.top) / scale - 19 : 140) + fontShift('ui', 28)) + 'px';
    utilFocusLabel.className = 'util-focus-label is-on';
  }
  function renderUtilityLens(button, iconsOnly) {
    var r, label, sr, scale, x, y, width, key, el;
    if (!button || S.c.focus !== 'glass') {
      utPlates.forEach(function (plateEl) { plateEl.className = 'ph-plate ut-lens is-outgoing'; });
      utPlateKey = null;
      return;
    }
    r = button.getBoundingClientRect(); sr = sceneEl.getBoundingClientRect(); scale = sr.width / 1920 || 1;
    y = (r.top - sr.top) / scale + 2;
    if (S.c.layout === 'list') {
      label = iconsOnly ? utilFocusLabel : button.querySelector('.u-label');
      x = (label.getBoundingClientRect().left - sr.left) / scale - 24;
      width = 1800 - x;
    } else {
      // Dock icons keep a fixed lens; the separate caption cannot overlap its neighbours.
      x = (r.left - sr.left) / scale; width = r.width / scale;
    }
    key = button.getAttribute('data-action') + '|' + x + '|' + y + '|' + width;
    if (key !== utPlateKey) {
      utPlates[utPlateIndex].className = 'ph-plate ut-lens is-outgoing';
      utPlateIndex = 1 - utPlateIndex; el = utPlates[utPlateIndex];
      el.className = 'ph-plate ut-lens is-preparing';
      el.style.width = width + 'px'; el.style.transform = 'translate3d(' + x + 'px,' + y + 'px,0)';
      fieldTransform(utFields[utPlateIndex], x, y, width, 60);
      el.offsetWidth;
      utPlateKey = key;
    }
    fieldTransform(utFields[utPlateIndex], x, y, width, 60);
    utPlates[utPlateIndex].className = 'ph-plate ut-lens is-current on-focus';
  }
  function renderAppFocusName(hs) {
    var it = hs.items[hs.i], width, x, y, placement;
    if (S.c.apps !== 'icons' || hs.mode !== 'browse' || hs.zone !== 'apps' || !it) { appFocusName.className = 'app-focus-name'; return; }
    appFocusName.textContent = app(it.id).name;
    width = Math.min(S.c.layout === 'list' ? 1056 : 1640, Math.ceil(textWidth(app(it.id).name, S.c.layout === 'list' ? 40 : 36, 500, -.6, 'primary') + 8));
    appFocusName.style.width = width + 'px';
    if (S.c.layout === 'list') {
      x = 280; placement = phFields[photoPlateIndex]._placement;
      y = placement.y + placement.height / 2 - 24;
    } else {
      x = clamp(dockAnchorCenter - width / 2, 140, 1780 - width); y = 932;
    }
    appFocusName.style.left = x + 'px'; appFocusName.style.top = (y + fontShift('primary', S.c.layout === 'list' ? 40 : 36)) + 'px';
    appFocusName.className = 'app-focus-name is-on';
  }

  /* Everything on one shelf when it fits. Otherwise show five whole tiles and move the
     window one tile when focus passes an edge; the side cues show that more apps exist. */
  function dockGeom(n) {
    var m = DOCK_MODES[S.c.apps], contentW = n > 0 ? (n - 1) * m.pitch + m.tw : 0, fits = n > 0 && contentW <= 1696;
    var vis = fits ? n : Math.max(1, Math.min(5, n)), shelfW = fits ? contentW : vis * m.pitch - 8, w = shelfW + 32;
    if (n < 0) { w = 912; shelfW = 880; vis = 0; }
    return { x: Math.round((1920 - w) / 2), y: 908 - m.th - 32, h: m.th + 32, w: w, shelf: shelfW, vis: vis, empty: n < 0, tw: m.tw, th: m.th, pitch: m.pitch };
  }
  function dockOffset(n, i, g) {
    var first = clamp(scroll.first, 0, Math.max(0, n - g.vis));
    if (i < first) first = i;
    if (i > first + g.vis - 1) first = i - g.vis + 1;
    if (!S.reflow) scroll.first = first;
    return first * g.pitch;
  }
  function dockTileHtml(it, full) {
    var a, body;
    if (it.kind === 'add') return '<span class="add">' + icon('plus') + '</span><span class="label">' + T(full ? 'Home is full' : 'Add app') + '</span>';
    a = app(it.id);
    body = S.c.apps === 'text' ? '' : dockAppMark(a);
    if (S.c.apps !== 'text') body = '<span class="dock-icon' + (S.c.apps === 'icons' ? ' dock-icon-solo' : '') + '">' + body + '</span>';
    return body + (S.c.apps === 'icons' ? '' : '<span class="label' + (S.c.apps === 'both' ? ' dock-label' : '') + '" style="font-size:' + dockLabelSize(a.id) + 'px' + (S.c.apps === 'text' ? ';top:' + (28 + fontShift('primary', dockLabelSize(a.id))) + 'px' : '') + '"><span class="label-ink">' + esc(a.name) + '</span></span>') + '<span class="nudge nudge-l">' + icon('left') + '</span><span class="nudge nudge-r">' + icon('right') + '</span>';
  }
  function renderDock(hs) {
    var items = hs.items, n = items.length, empty = hs.mode !== 'arrange' && !n, g = dockGeom(empty ? -1 : n);
    var anchor = clamp(hs.i, 0, Math.max(0, n - 1)), off = empty ? 0 : dockOffset(n, anchor, g);
    var full = hs.arr ? live(hs.arr.slots).length >= CAP : false, ns = hs.arr ? hs.arr.slots.length : n;
    var tileFocus = hs.zone === 'apps' || hs.zone === 'tiles', tileSel = hs.zone === 'util' || hs.zone === 'act' || hs.zone === 'ctl' || hs.zone === 'preview';
    var focusItem = items[anchor], s, ax, label, width;

    dock.className = 'dock' + (empty ? ' is-empty' : '');
    dock.style.left = g.x + 'px'; dock.style.top = g.y + 'px'; dock.style.width = g.w + 'px'; dock.style.height = g.h + 'px';
    dock.style.setProperty('--tile-w', g.tw + 'px'); dock.style.setProperty('--tile-h', g.th + 'px'); dock.style.setProperty('--dock-h', g.h + 'px');
    dock.style.setProperty('--nudge-top', ((g.th - 48) / 2) + 'px');
    dockAnchorCenter = g.x + 16 + anchor * g.pitch - off + g.tw / 2;
    IMG.mat.style.left = (-g.x) + 'px'; IMG.mat.style.top = (-g.y) + 'px';
    IMG.mat.style.transformOrigin = '960px ' + (g.y + g.h / 2) + 'px';
    matScrim.style.left = (-g.x) + 'px'; matScrim.style.top = (SCRIM_Y - g.y) + 'px';
    matScrim.style.transformOrigin = '960px ' + (g.y + g.h / 2 - SCRIM_Y) + 'px';
    shelf.style.width = g.shelf + 'px';

    keyed(track, empty ? [] : items, function (el, it, i) {
      var a = it.id ? app(it.id) : null, left = i * g.pitch, focus = tileFocus && i === anchor, sel = tileSel && i === anchor;
      var lifted = hs.lifted && i === anchor;
      setContent(el, it.kind + '|' + (it.id || '') + '|' + (it.id ? dockLabelSize(it.id) : full) + '|' + S.c.bg + '|' + S.c.apps + '|' + S.c.iconStyle + '|' + homeFont(), '<span class="tile-content">' + dockTileHtml(it, full) + '</span>');
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

    cueL.style.left = (g.x - 72) + 'px'; cueR.style.left = (g.x + g.w + 24) + 'px';
    cueL.style.top = cueR.style.top = (g.y + g.h / 2 - 24) + 'px';
    cueL.className = 'cue' + (!empty && scroll.first > 0 ? ' is-on' : '');
    cueR.className = 'cue' + (!empty && scroll.first + g.vis < n ? ' is-on' : '');

    ax = g.x + 16 + anchor * g.pitch - off;
    if (hs.mode === 'arrange' && !hs.lifted && (hs.zone === 'tiles' || hs.zone === 'act') && focusItem && focusItem.kind !== 'add') {
      s = hs.arr.slots[anchor];
      label = T(s.removed ? 'Restore {0}' : 'Remove {0}', app(s.id).name); width = actionWidth(label);
      ax = clamp(ax + (g.tw - width) / 2, 112, 1808 - width);
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

  function photoModeTransition(compact) {
    if (photoMode !== null && photoMode !== compact) {
      var ghost = phScene.cloneNode(true), token = ++photoTransitionToken;
      ghost.removeAttribute('id'); ghost.setAttribute('aria-hidden', 'true');
      Array.prototype.forEach.call(ghost.querySelectorAll('[id],[data-action],[data-z]'), function (el) {
        el.removeAttribute('id'); el.removeAttribute('data-action'); el.removeAttribute('data-z');
      });
      ghost.className = 'ph-scene ph-ghost';
      phScene.parentNode.appendChild(ghost);
      phScene.className = 'ph-scene ph-incoming';
      setTimeout(function () {
        if (ghost.parentNode) ghost.parentNode.removeChild(ghost);
        if (token === photoTransitionToken) phScene.className = 'ph-scene';
      }, 180);
    }
    photoMode = compact;
  }
  /* Each plate keeps a stationary, stage-registered field while its opacity changes.
     Reuse the hidden group for the next label; never animate plate width or position. */
  function renderPhotoPlate(id, width, height, y, state) {
    var key = id + '|' + width + '|' + height + '|' + y, plateEl, fieldEl;
    if (key !== photoPlateKey) {
      phPlates[photoPlateIndex].className = phPlates[photoPlateIndex].className.replace(' is-current', '') + ' is-outgoing';
      photoPlateIndex = 1 - photoPlateIndex;
      plateEl = phPlates[photoPlateIndex]; fieldEl = phFields[photoPlateIndex];
      plateEl.className = 'ph-plate is-preparing';
      plateEl.style.width = width + 'px'; plateEl.style.height = height + 'px';
      plateEl.style.transform = 'translate3d(0,' + y + 'px,0)';
      fieldTransform(fieldEl, 112, y, width, height);
      plateEl.offsetWidth; // Establish zero opacity before the incoming crossfade.
      photoPlateKey = key;
    }
    fieldTransform(phFields[photoPlateIndex], 112, y, width, height);
    phPlates[photoPlateIndex].className = 'ph-plate is-current' + (state ? ' ' + state : '');
  }
  function fieldTransform(el, x, y, width, height) {
    el._placement = { x: x, y: y, width: width, height: height };
    el.style.transformOrigin = (x + width / 2) + 'px ' + (y + height / 2) + 'px';
    el.style.transform = 'translate3d(' + (-x) + 'px,' + (-y) + 'px,0)' + (S.c.bg === 'photo' && S.c.material === 'tint' && !REDUCED_MOTION ? ' scale(1.04)' : '');
  }
  function renderList(hs) {
    var items = hs.items, n = items.length, compact = hs.mode === 'arrange', pitch = compact ? PH_COMPACT_PITCH : PH_PITCH;
    var anchor = clamp(hs.i, 0, Math.max(0, n - 1)), first, off, width, slot, y, s, label, aw, plateState;
    var rowFocus = hs.zone === 'apps' || hs.zone === 'tiles', remembered = hs.zone === 'util' || hs.zone === 'act' || hs.zone === 'ctl' || hs.zone === 'preview';
    photoModeTransition(compact);
    if (compact) {
      first = clamp(scroll.photoArrange, anchor - 7, anchor - 1);
      first = clamp(first, 0, Math.max(0, n - PH_COMPACT_VISIBLE));
      scroll.photoArrange = first;
    } else {
      first = clamp(scroll.photo, anchor - 3, anchor - 1);
      first = clamp(first, 0, Math.max(0, n - PH_FULL));
      scroll.photo = first;
    }
    off = first * pitch; slot = anchor - first;
    width = items[anchor] ? listPlateWidth(items[anchor].id, compact) : 360;
    phList.className = 'ph-list' + (compact ? ' is-compact' : '');
    phList.style.height = PH_HEIGHT + 'px';
    phRows.style.top = (compact ? 72 : 148) + 'px';
    keyed(phRows, items, function (row, it, i) {
      var typography = photoLabel(it.id, compact), focus = rowFocus && i === anchor, lifted = hs.lifted && i === anchor, markImage, body = '';
      if (S.c.apps !== 'text') body += appMark(app(it.id), S.c.apps === 'icons' ? compact ? 64 : 88 : compact ? 60 : 84, S.c.apps === 'icons' ? compact ? 64 : 88 : compact ? 44 : 64, S.c.apps === 'icons' ? compact ? 52 : 72 : compact ? 42 : 54);
      if (S.c.apps !== 'icons') body += '<span class="ph-name" style="font-size:' + typography.size + 'px;top:' + typography.top + 'px">' + esc(app(it.id).name) + '</span>';
      setContent(row, it.id + '|' + typography.size + '|' + S.c.bg + '|' + S.c.apps + '|' + S.c.iconStyle + '|' + homeFont(), '<span class="ph-group">' + body + '</span><span class="ph-move ph-move-up">' + icon('up') + '</span><span class="ph-move ph-move-down">' + icon('down') + '</span>');
      markImage = row.querySelector('.mark img');
      if (markImage) {
        markImage.onerror = function () { this.style.visibility = 'hidden'; };
        if (markImage.complete && !markImage.naturalWidth) markImage.style.visibility = 'hidden';
      }
      row.className = 'ph-row k-' + it.kind + (focus ? ' is-focus' : '') + (remembered && i === anchor ? ' is-sel' : '') + (lifted ? ' is-lifted' : '')
        + (lifted && i === 0 ? ' no-up' : '') + (lifted && i === n - 1 ? ' no-down' : '')
        + (it.kind === 'app' && S.press === it.id ? ' is-press' : '');
      row.style.width = (compact ? listPlateWidth(it.id, compact) : 1200) + 'px'; row.style.height = pitch + 'px';
      row.style.transform = 'translate3d(0,' + (i * pitch) + 'px,0)';
      row.setAttribute('role', 'button'); row.setAttribute('aria-label', app(it.id).name);
      attrs(row, compact ? 'tile' : 'app', i, compact ? 'arrange.' + (it.kind === 'ph' ? 'placeholder.' : 'tile.') + it.id : 'home.app.' + it.id);
    });
    phRows.style.transform = 'translate3d(0,' + (-off) + 'px,0)';
    y = (compact ? PH_COMPACT_TOP + 2 : PH_TOP + 1) + slot * pitch;
    plateState = !n || hs.zone === null ? '' : hs.lifted ? 'on-lift' : S.c.focus === 'glass' && rowFocus ? 'on-focus' : S.c.focus === 'glass' && remembered ? 'on-sel' : '';
    renderPhotoPlate(items[anchor] ? items[anchor].id : '', width, compact ? 88 : 134, y, plateState);
    if (compact && !hs.lifted && (hs.zone === 'tiles' || hs.zone === 'act') && items[anchor]) {
      s = hs.arr.slots[anchor]; label = T(s.removed ? 'Restore {0}' : 'Remove {0}', app(s.id).name); aw = actionWidth(label);
      setHTML(phAction, '<span>' + esc(label) + '</span>');
      phAction.className = 'ph-action is-on' + (hs.zone === 'act' ? ' is-focus' : '');
      phAction.style.width = aw + 'px';
      phAction.style.transform = 'translate3d(' + (112 + width + 24) + 'px,' + (PH_COMPACT_TOP + slot * pitch + 12) + 'px,0)';
      attrs(phAction, 'act', anchor, 'arrange.' + (s.removed ? 'restore.' : 'remove.') + s.id);
    } else { phAction.className = 'ph-action'; phAction.removeAttribute('data-z'); phAction.removeAttribute('data-action'); }
    phEmpty.className = 'ph-empty' + (!compact && !n ? ' is-on' : '');
    setHTML(phEmpty, !compact && !n ? '<p>No apps on Home</p><button type="button" tabindex="-1" class="btn' + (hs.zone === 'empty' ? ' is-focus' : '') + '" data-z="empty" data-i="0" data-action="home.add-apps">' + icon('plus') + '<span>Add apps</span></button>' : '');
  }

  /* Sheets: a frame is built once per view/mode; fill() updates its slots. Persistent
     scrollers let transforms animate. */
  function renderSheet(t, sheet) {
    var v = V[t.id], key;
    sheetEl.hidden = !(sheet || isSettingsDetail(t));
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
    FILLS[t.id](t, slotEls);
  }
  function renderAppearance(t) {
    appearanceEl.hidden = !isSettingsDetail(t);
    if (appearanceEl.hidden) { appearanceEl.removeAttribute('aria-modal'); return; }
    appearanceEl.setAttribute('aria-modal', 'true');
    if (t.id === 'wallpaper') { renderWallpaper(t); return; }
    V.appearance.norm(t);
    appearanceEl.className = 'appearance detail-' + t.group;
    appearanceRows.className = 'appearance-rows';
    appearanceTitle.textContent = T(DETAIL_NAMES[t.group]);
    var at = detailLocation(t), selected = at.item, error = S.lookError, status = '', hint;
    function command(item, inner, cls) {
      var applied = item.axis && S.c[item.axis] === item.value;
      var loading = !!(item.axis && S.pending && S.pending.target[item.axis] === item.value && S.pending.row === item.axis);
      return '<button type="button" tabindex="-1" class="setting-choice' + (cls ? ' ' + cls : '') + (t.f.action === item.action ? ' is-focus' : '') + (item.disabled ? ' is-disabled' : '') + (applied ? ' is-applied' : '') + (loading ? ' is-loading' : '') + '"'
        + (item.axis ? ' role="radio" aria-checked="' + !!applied + '"' : '') + ' aria-label="' + esc(item.axis && item.value === 'both' ? T('Icons and text') : item.label) + '" aria-disabled="' + !!item.disabled + '" aria-busy="' + loading + '"'
        + ' data-z="detail" data-i="0" data-id="' + item.action + '" data-action="' + item.action + '">' + inner
        + (item.axis ? '<span class="setting-tick" aria-hidden="true">' + (applied ? icon('check') : '') + '</span>' : '') + '</button>';
    }
    setHTML(appearanceBack, command({ action: 'settings.back', label: T(t.group === 'rotation' ? 'Background' : 'Settings') }, icon('left') + '<span>' + T(t.group === 'rotation' ? 'Background' : 'Settings') + '</span>', 'setting-back'));
    setHTML(appearanceRows, detailSections(t).map(function (section) {
      return '<section class="setting-section' + (section.horizontal ? ' is-horizontal' : '') + ' section-' + section.id + '">'
        + (section.title ? '<h3 class="setting-label" id="setting-' + section.id + '">' + section.title + '</h3>' : '')
        + '<div class="setting-options"' + (section.items[0].axis ? ' role="radiogroup" aria-label="' + esc(section.title || T(LOOK_NAMES[section.id] || DETAIL_NAMES[t.group])) + '"' : '') + '>'
        + section.items.map(function (item) {
          var swatch = item.axis === 'bg', body = '';
          if (item.phone) body += '<span class="setting-swatch setting-phone" aria-hidden="true">' + icon('phone') + '</span>';
          if (swatch || item.thumbnail) body += item.value === 'light' || item.value === 'dark'
            ? '<span class="setting-swatch swatch-' + item.value + '" aria-hidden="true"></span>'
            : '<img class="setting-swatch" src="' + esc(wallAsset(S.c.wall, 'thumb')) + '" alt="">';
          body += '<span class="setting-copy"><span class="setting-name">' + esc(item.label) + '</span>'
            + (item.description ? '<span class="setting-description">' + esc(item.description) + '</span>' : '') + '</span>';
          if (!item.axis) body += icon('right', 'setting-forward');
          return command(item, body, item.description ? 'has-description' : '');
        }).join('') + '</div>'
        + (section.reason ? '<p class="setting-reason">' + esc(section.reason) + '</p>' : '') + '</section>';
    }).join(''));
    if (S.pending) status = '<p>' + esc(S.pending.row === 'font' ? T('Loading {0}…', FONTS[S.pending.target.font].name) : T('Loading your choice…')) + '</p><p>' + T('Back cancels this change.') + '</p>';
    else if (error) {
      status = '<p class="setting-error">' + esc(error.type === 'save' ? T('Couldn’t save this change.') : error.type === 'font' ? T('Couldn’t load {0}.', FONTS[error.font].name) : T('Couldn’t load this appearance.')) + ' ' + T('Your current choice is kept.') + '</p>'
        + command({ action: 'settings.retry', label: T('Try again') }, '<span>' + T('Try again') + '</span>', 'setting-retry');
    }
    setHTML(appearanceStatus, status);
    hint = selected.disabled ? '' : selected.action === 'settings.back' ? T('Return to {0}', T(t.group === 'rotation' ? 'Background' : 'Settings')) : T(selected.action === 'settings.retry' ? 'Retry this change' : selected.axis ? 'Apply selected setting' : selected.action === 'background.wallpaper' ? 'Choose a wallpaper' : selected.action === 'background.rotation' ? 'Choose a rotation interval' : selected.action === 'background.custom' ? 'Show the QR code' : 'Open on the TV');
    setHTML(appearanceDesc, hint ? '<span class="remote-key">OK</span><span>' + esc(hint) + '</span>' : '');
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
    var root = isSettingsDetail(top()) ? appearanceEl : sheetEl.hidden ? homeEl : sheetEl, active = root.querySelectorAll('.is-focus[data-action]'), target = null, text = S.err ? T('Not saved. OK tries again.') : '', i, r, sr, scale, x, y, w, action, solid, photoRow = false, photoFree = false;
    Array.prototype.forEach.call(stage.querySelectorAll('.has-local-status'), function (el) { el.className = el.className.replace(/\s+has-local-status/g, ''); });
    for (i = 0; i < active.length; i++) if (renderedAction(active[i])) { target = active[i]; break; }
    if (!text && t.id === 'arrange' && (t.f.zone === 'act' || t.f.zone === 'tiles')) {
      var slot = t.slots[t.f.i];
      if (slot && !slot.removed && t.f.zone === 'act' && S.c.home.length === 1) text = T(LAST);
    }
    if (!text && S.note === LAST && t.id === 'arrange') text = T(LAST);
    if (!target || !text) { focusStatus.className = 'focus-status'; return; }
    if (target.parentNode === utilsEl && utilsEl.className.indexOf('is-icons') >= 0) { renderUtilFocusLabel(target); focusStatus.className = 'focus-status'; return; }
    // Photo action pills stay on one line; the header already carries this status.
    if (S.c.layout === 'list' && t.id === 'arrange' && !t.lifted && (t.f.zone === 'act' || t.f.zone === 'tiles')) { focusStatus.className = 'focus-status'; return; }
    photoRow = S.c.layout === 'list' && target.className.indexOf('ph-row') >= 0;
    if (photoRow && phAction.className.indexOf('is-on') >= 0) target = phAction;
    else if (photoRow) photoFree = true;
    target.className += ' has-local-status';
    action = target.getAttribute('data-action');
    r = target.getBoundingClientRect(); sr = stage.getBoundingClientRect(); scale = sr.width / 1920 || 1;
    x = (r.left - sr.left) / scale; y = (r.top - sr.top) / scale; w = r.width / scale;
    if (photoFree) { x = 112 + parseFloat(phPlates[photoPlateIndex].style.width) + 24; y += (r.height / scale - 28) / 2; w = 400; }
    else if (action.indexOf('home.app.') === 0 || action.indexOf('arrange.tile.') === 0 || action.indexOf('arrange.placeholder.') === 0) y += 171;
    else if (action.indexOf('apps.order.') === 0) y += 86;
    else if (action.indexOf('apps.toggle.') === 0 || action.indexOf('apps.add.') === 0) y += 164;
    else if (action.indexOf('layout.') === 0) y += 54;
    else y += action.indexOf('arrange.remove.') === 0 || action.indexOf('arrange.restore.') === 0 ? 43 : 40;
    solid = /(?:^|\s)(?:u|btn|er-rm|dock-action|set-row|ph-action)(?:\s|$)/.test(target.className) && target.parentNode !== utilsEl && target.parentNode.className.indexOf('s-head') < 0;
    if (target === phAction && target.className.indexOf('is-focus') < 0) solid = false;
    focusStatus.className = 'focus-status is-on' + (solid ? ' dark-ink' : '') + (photoFree ? ' photo-status' : '');
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
      return '<h2 class="s-title">' + T('Apps on Home') + '</h2><p class="s-sub" data-slot="sub"></p><div class="s-head" data-slot="head"></div>'
        + '<p class="s-label z-home" data-slot="lh"></p><p class="s-label z-other">' + T('Not on Home') + '</p>'
        + '<div class="ed-home" data-slot="home"></div><div class="ed-order-break" data-slot="break">' + T('Then scroll') + '</div><div class="ed-other-view" data-slot="ov"><div class="ed-other" data-slot="other"></div></div><div class="ed-origin" data-slot="origin"></div>'
        + '<div class="row-cue editor-before" data-slot="otherBefore" aria-hidden="true">' + icon('up') + '</div><div class="row-cue editor-after" data-slot="otherAfter" aria-hidden="true">' + icon('down') + '</div>';
    },
    settings: function () { return '<h2 class="s-title">' + T('Settings') + '</h2><div class="settings-grid" data-slot="list"></div><p class="settings-overview-hint"><span class="remote-key">OK</span><span data-slot="hint"></span></p>'; },
    message: function (t) {
      var m = messageContent(t);
      return '<h2 class="msg-title">' + esc(T(m.title)) + '</h2><p class="msg-line">' + esc(T(m.line)) + '</p><p class="msg-note">' + esc(T(m.note)) + '</p><div class="msg-acts" data-slot="acts"></div>';
    },
    phone: function () {
      return '<div class="phone-panel"><h2 class="s-title">' + T('Your picture') + '</h2>'
        + '<div class="phone-body"><div class="phone-qr-card"><canvas class="phone-qr" width="360" height="360" data-slot="qr"></canvas><p class="phone-url" data-slot="url"></p></div>'
        + '<div class="phone-copy"><ol class="phone-steps"><li>' + T('Scan the code with your phone.') + '</li><li>' + T('On the page that opens, tap ^ beside the message field, then “Attach local file” and choose a photo or a short video.') + '</li><li>' + T('Send it. The TV sets it as your background in a few seconds.') + '</li></ol>'
        + '<p class="phone-hint">' + T('You can close this screen: the TV keeps listening while it is on.') + '</p>'
        + '<p class="phone-status" data-slot="status" aria-live="polite"></p><p class="phone-note">' + T('The photo passes through ntfy.sh on a private channel and is deleted there after a few hours. The TV keeps its own copy.') + '</p>'
        + '<div class="phone-acts" data-slot="acts"></div></div></div></div>';
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
      var html = '';
      settingsRows().forEach(function (r) {
        var visual;
        if (r.id === 'background') visual = S.c.bg === 'photo' ? '<img class="card-photo" src="' + esc(wallAsset(S.c.wall, 'thumb')) + '" alt="">' : '<span class="card-photo card-flat-' + S.c.bg + '"></span>';
        else if (r.id === 'typography') visual = '<span class="card-chip card-type" style="font-family:\'' + FONTS[S.c.font].family + '\',Manrope,sans-serif">Aa</span>';
        else visual = '<span class="card-chip">' + icon(r.icon) + '</span>';
        html += '<button type="button" tabindex="-1" class="settings-card card-' + r.id + (r.id === t.f.id ? ' is-focus' : '') + (r.direct ? ' is-direct' : '') + '" data-z="row" data-i="0" data-id="' + r.id + '" data-action="settings.' + (r.id === 'editor' ? 'editor' : r.direct ? 'samsung-home' : 'group.' + r.id) + '" aria-label="' + esc(r.label + ', ' + r.value) + '">'
          + '<span class="card-visual">' + visual + '</span><span class="card-copy"><span class="card-name">' + esc(r.label) + '</span><span class="card-value">' + esc(r.value) + '</span></span>'
          + (r.direct ? '<span class="card-go">' + icon('right') + '</span>' : '') + '</button>';
      });
      setHTML(el.list, html);
      setHTML(el.hint, T(t.f.id === 'samsung' ? 'Open Samsung’s Home screen' : 'Open selected group'));
    },
    message: function (t, el) {
      setHTML(el.acts, messageContent(t).actions.map(function (a, i) {
        return '<button type="button" tabindex="-1" class="btn' + (i === t.f.b ? ' is-focus' : '') + '" data-z="act" data-i="' + i + '" data-action="message.' + a[0] + '"><span>' + esc(T(a[1])) + '</span></button>';
      }).join(''));
    },
    phone: function (t, el) {
      var url = RELAY + '/' + S.c.relayTopic, phase = custom.phase !== 'idle' ? custom.phase : custom.link === 'retry' ? 'offline' : custom.link === 'open' ? 'waiting' : 'connecting', text = {
        connecting: T('Connecting to ntfy.sh…'), waiting: T('Waiting for a photo…'), offline: T('Can’t reach ntfy.sh ({0}). Trying again…', custom.detail || '?'),
        notimage: T('That file isn’t a picture or a video. Send a JPG, PNG or MP4.'), downloading: T('Receiving {0}…', custom.name || T('photo')), processing: T('Preparing your background…'),
        unreadable: T('Couldn’t open that file. Send a JPG, PNG or MP4.'), unreachable: T('Couldn’t download the photo ({0}). Send it again.', custom.detail || '?'),
        done: T('Done. Your picture is the background now.'), unsaved: T('Done for now, but the TV couldn’t store it for next time.')
      }[phase];
      // The sheet is rebuilt on every visit, so the drawn code belongs to the canvas, not the session.
      if (el.qr._payload !== url && window.qrcode) { drawQr(el.qr, url); el.qr._payload = url; }
      setHTML(el.url, esc(url.replace(/^https:\/\//, '')));
      setHTML(el.status, '<span class="phone-dot is-' + phase + '"></span>' + esc(text));
      setHTML(el.acts, '<button type="button" tabindex="-1" class="btn is-focus" data-z="act" data-i="0" data-action="phone.done"><span>' + T(custom.phase === 'done' ? 'Done' : 'Close') + '</span></button>');
    },
    wifitype: function (t, el) {
      var f = t.f, chars = '', acts = [T('Delete last'), T('Save'), T('Cancel')], i;
      setHTML(el.title, T(t.field === 'ssid' ? 'Network name' : 'Password'));
      setHTML(el.value, esc(wifiDraftDisplay(t)));
      for (i = 0; i < WIFI_CHARS.length; i++) chars += '<button type="button" tabindex="-1" class="btn' + (f.zone === 'char' && f.ci === i ? ' is-focus' : '') + '" data-z="char" data-i="' + i + '" data-action="wifi.char.' + i + '">' + esc(WIFI_CHARS.charAt(i)) + '</button>';
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
    if (id === CUSTOM) return custom.urls && custom.urls[kind] || '';
    if (kind === 'photo') return WP + id + '.jpg';
    if (kind === 'thumb' || kind === 'panel') return WP + id + '-' + kind + '.jpg';
    return 'assets/materials/' + id + '-' + kind + '.jpg';
  }
  function matSrc(id, material) { return wallAsset(id, material === 'soft' ? 'study-soft' : material === 'tint' ? 'field-clear' : 'field-frost'); }
  function fieldSrc(id, material) { return wallAsset(id, material === 'soft' ? 'field-blur' : material === 'tint' ? 'field-clear' : 'field-frost'); }
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
    imgs.field = makeImg('ph-field-img', fieldSrc(look.wall, look.material), key);
    imgs.fieldAlt = makeImg('ph-field-img', fieldSrc(look.wall, look.material), key);
    imgs.utility = makeImg('ph-field-img', fieldSrc(look.wall, look.material), key);
    imgs.utilityAlt = makeImg('ph-field-img', fieldSrc(look.wall, look.material), key);
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
    phFields.concat(utFields).forEach(function (el) { var p = el._placement; if (p) fieldTransform(el, p.x, p.y, p.width, p.height); });
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
  function updateClock() {
    clearTimeout(clockTimer);
    if (document.hidden) return;
    function paintCaption() {
      if (top().id === 'home' || isSettingsDetail(top())) renderCaption(top(), homeState(top()));
    }
    paintCaption();
    refreshWeather(paintCaption);
    clockTimer = setTimeout(updateClock, 60000 - (Date.now() % 60000) + 30);
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
    for (i = 0; i < els.length; i++) if (renderedAction(els[i]) && els[i].getAttribute('data-action') === action) { pointAt(els[i]); return true; }
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
    if (k === 'ok' || k === 'back') { if (ev.repeat || heldKeys[code]) return; heldKeys[code] = true; }
    press(k);
  });
  document.addEventListener('keyup', function (ev) { delete heldKeys[ev.keyCode]; });
  window.addEventListener('blur', function () { heldKeys = {}; });
  window.addEventListener('focus', function () { release(); focusStage(); after(); updateClock(); });
  document.addEventListener('visibilitychange', function () {
    heldKeys = {};
    if (document.hidden) {
      pauseRotation(); clearTimeout(clockTimer); stopRelay(); syncVideo();
      if (S.hdmiInApp) { S.hdmiInApp = false; if (FrameDevice.hideHdmiView) FrameDevice.hideHdmiView(); }
    }
    else { release(); after(); updateClock(); focusStage(); startRelay(); }
  });
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
    out.appVersion = APP_VERSION;
    return JSON.parse(JSON.stringify(out));
  };
  QA.where = function () {
    var action = focusedAction(), active = stage.querySelectorAll('.is-focus[data-action]'), count = 0, name = '';
    Array.prototype.forEach.call(active, function (el) { if (renderedAction(el)) { count++; if (el.getAttribute('data-action') === action) name = el.getAttribute('aria-label') || el.textContent.replace(/\s+/g, ' ').trim(); } });
    return { view: top().id, settingsGroup: top().id === 'wallpaper' ? 'wallpaper' : top().id === 'appearance' ? top().group : null, focus: name, focusAction: action, focusCount: count, wallpaper: S.wallShown, zone: top().f.zone || null };
  };
  QA.ready = function () { return fontsReady && !S.pending && !!S.shown && S.shown.bg === S.c.bg && S.shown.wall === S.c.wall && S.shown.font === S.c.font; };
  QA.nav = function () { var keys = arguments.length === 1 && Array.isArray(arguments[0]) ? arguments[0] : Array.prototype.slice.call(arguments); keys.forEach(function (key) { if (!NAV[key]) throw new Error('Unknown key'); press(NAV[key]); }); return QA.state(); };
  QA.look = function (patch) { setLook(patch, {}); return QA.state(); };
  QA.scene = function (name) { if (['home', 'apps', 'settings', 'appearance', 'editor'].indexOf(name) < 0) throw new Error('Unknown view'); goScene(name); return QA.state(); };
  QA.activate = function (action) { return activate(action) ? QA.state() : null; };
  QA.actions = function () { var view = isSettingsDetail(top()) ? appearanceEl : sheetEl.hidden ? homeEl : sheetEl; return Array.prototype.filter.call(view.querySelectorAll('[data-action]'), renderedAction).map(function (el) { return el.getAttribute('data-action'); }); };

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
  }
  if (FCW && S.c.customAt) loadCustom(function () { start(); startRelay(); }); else { start(); startRelay(); }
})();
