/* Public Tizen application APIs. No Mac server, network address or credentials. */
(function () {
  'use strict';
  var FORK = window.FrameFork || {}, CONFIGURED = FORK.apps || [];
  var HDMI_VIEWER = 'org.tizen.tv-viewer';
  var HDMI_FULL = ['0px', '0px', '1920px', '1080px'];
  /* Store IDs of other streaming services: listed in All apps even when the TV hides them. */
  var STREAMING = ['3202301029760', '3201601007230', '3202311033054', '3201910019378', '3201710015016'];
  var CONSUMER_SYSTEM = ['org.tizen.browser', 'com.microsoft.copilot'];
  var INTERNAL = ['adplatform.ADPlayer', 'WykOS4t4F0.cmsWebApp', '25emanual3.emanual',
    'ZODRT12q2l.WebAccountExtension', 'ByJlgt0XeD.CastSettingsApp', 'tv6pbVMQFF.PrivacyChoices'];
  var SELF = FORK.selfAppId || '';
  /* Installed app ID → configured Home app: `primary` for its launch target, `alt` for other installs. */
  var KNOWN = {};
  CONFIGURED.forEach(function (a, rank) {
    if (a.appId.indexOf('hdmi-') === 0) return;
    KNOWN[a.appId] = { id: a.id, brand: a.brand || a.id, rank: rank, primary: true };
    (a.altAppIds || []).forEach(function (alt) { KNOWN[alt] = { id: a.id, brand: a.brand || a.id, rank: rank, primary: false }; });
  });
  /* The browser preview lists the configured Home shortcuts as its installed apps. */
  var PREVIEW_APPS = CONFIGURED.map(function (a) { return { appId: a.appId, name: a.name, brand: a.brand || a.id, icon: '' }; });
  var hdmiInApp = false;
  function api() { return window.tizen && window.tizen.application; }
  /* main.js installs the translator; messages fall back to English before it loads. */
  function t(text) {
    var args = arguments;
    if (window.FrameText) return window.FrameText.apply(null, args);
    return text.replace(/\{(\d)\}/g, function (m, n) { return args[+n + 1]; });
  }
  function forkName() { return window.FrameFork && window.FrameFork.displayName || 'CleanFrame'; }
  function unavailable(done) {
    done({ message: t('Open {0} on the TV to use this control.', forkName()), detail: t('The web preview cannot control the TV.') });
  }
  function failure(err) {
    return { message: t('The TV could not open this screen.'), detail: err && (err.message || err.name) || t('Try again, or press the remote’s Home button.') };
  }
  function bounded(done) {
    var finished = false, timer = setTimeout(function () { finish({ message: t('The TV did not respond. Please try again.') }); }, 12000);
    function finish(err, value) { if (finished) return; finished = true; clearTimeout(timer); done(err, value); }
    return finish;
  }
  function hdmiPort(appId) {
    if (typeof appId !== 'string' || appId.indexOf('hdmi-') !== 0) return 0;
    var n = parseInt(appId.slice(5), 10);
    return n > 0 && n < 10 ? n : 0;
  }
  function hdmiPortLabel(port) {
    return 'HDMI ' + port;
  }
  function videoSourceForPort(port, done) {
    if (!window.tizen || !tizen.systeminfo) { done(null); return; }
    try {
      tizen.systeminfo.getPropertyValue('VIDEOSOURCE', function (info) {
        var all = (info.connected || []).concat(info.disconnected || []), i, s;
        for (i = 0; i < all.length; i++) {
          s = all[i];
          if (s && String(s.type || '').toUpperCase() === 'HDMI' && Number(s.number) === port) {
            done(s);
            return;
          }
        }
        done(null);
      }, function () { done(null); });
    } catch (err) { done(null); }
  }
  function setHdmiSource(source, done) {
    if (!window.tizen || !tizen.tvwindow) { done(false); return; }
    try {
      tizen.tvwindow.setSource(source, function () { done(true); }, function () { done(false); }, 'MAIN');
    } catch (err) { done(false); }
  }
  function showHdmiFullscreen(done) {
    if (!window.tizen || !tizen.tvwindow) { done(false); return; }
    try {
      tizen.tvwindow.show(function () { done(true); }, function () { done(false); }, HDMI_FULL, 'MAIN');
    } catch (err) { done(false); }
  }
  function launchHdmiViewer(done) {
    if (!api()) { done(false); return; }
    try {
      api().launch(HDMI_VIEWER, function () { done(true); }, function () { done(false); });
    } catch (err) { done(false); }
  }
  function hideHdmiView(done) {
    hdmiInApp = false;
    if (!window.tizen || !tizen.tvwindow) { if (done) done(); return; }
    try {
      tizen.tvwindow.hide(function () { if (done) done(); }, function () { if (done) done(); }, 'MAIN');
    } catch (err) { if (done) done(); }
  }
  function hdmiInAppActive() {
    return hdmiInApp;
  }
  /* switch + Samsung TV viewer (works on this TV); in-app fullscreen only if viewer cannot open. */
  function openHdmiPort(port, finish) {
    videoSourceForPort(port, function (source) {
      if (!source) {
        finish({
          message: t('Could not open {0}.', hdmiPortLabel(port)),
          detail: t('The TV did not report that HDMI port. Check the cable, then try again.')
        });
        return;
      }
      setHdmiSource(source, function (switched) {
        if (!switched) {
          finish({
            message: t('Could not open {0}.', hdmiPortLabel(port)),
            detail: t('The TV could not switch to that input. Try again in a moment.')
          });
          return;
        }
        launchHdmiViewer(function (viewerOk) {
          if (viewerOk) { finish(null, { mode: 'viewer' }); return; }
          showHdmiFullscreen(function (shown) {
            if (!shown) {
              finish({
                message: t('Could not show {0}.', hdmiPortLabel(port)),
                detail: t('The input changed, but the TV could not open the viewer or full-screen window.')
              });
              return;
            }
            hdmiInApp = true;
            finish(null, { mode: 'inapp' });
          });
        });
      });
    });
  }
  function launchHdmi(id, done) {
    var port = hdmiPort(id);
    if (!port) { done({ message: t('This HDMI shortcut is not configured.') }); return; }
    openHdmiPort(port, bounded(done));
  }
  function launchApp(id, done) {
    if (hdmiPort(id)) { launchHdmi(id, done); return; }
    if (!api()) { unavailable(done); return; }
    var finish = bounded(done);
    try { api().launch(id, function () { finish(null); }, function (err) { finish(failure(err)); }); }
    catch (err) { finish(failure(err)); }
  }
  function home(done) { launchApp('com.samsung.tv.csfs', done); }
  function settings(done) { launchApp('com.samsung.tv.coba.setting', done); }
  function apps(done) {
    if (!api()) {
      bounded(done)(null, PREVIEW_APPS.map(function (a) { return { appId: a.appId, name: a.name, brand: a.brand, icon: a.icon, rank: 0 }; }));
      return;
    }
    var finish = bounded(done);
    try {
      api().getAppsInfo(function (list) {
        var seen = {}, result = [];
        list.forEach(function (a) {
          var known = KNOWN[a.id], primary = !!(known && known.primary), stream = STREAMING.indexOf(a.id) >= 0;
          var consumer = /^[A-Za-z0-9]{10}\.[A-Za-z0-9_-]+$/.test(a.id) || CONSUMER_SYSTEM.indexOf(a.id) >= 0;
          if (a.id === SELF || INTERNAL.indexOf(a.id) >= 0 || seen[a.id] || !a.name || (!known && !stream && (!a.show || !consumer))) return;
          if (!known && /(?:service|worker|preview|promotion|plugin|launcher|test|sdk|^ep[ -]|factory|daemon)/i.test(a.name + ' ' + a.id)) return;
          if (/-dummy$/.test(a.id) || a.id === 'com.samsung.tv.cobalt-yt') return;
          seen[a.id] = true;
          // A primary install reports its Home ID as `brand`, which main.js uses to merge it with the shortcut.
          result.push({ appId: a.id, name: a.name, brand: primary ? known.id : known ? known.brand : '', icon: a.iconPath || '', rank: known ? known.rank : (stream ? 20 : 30) });
        });
        result.sort(function (a, b) { return a.rank - b.rank || a.name.toLowerCase().localeCompare(b.name.toLowerCase()); });
        finish(null, result);
      }, function (err) { finish(failure(err)); });
    } catch (err) { finish(failure(err)); }
  }
  window.FrameDevice = { launchApp: launchApp, home: home, settings: settings, apps: apps,
    hideHdmiView: hideHdmiView, hdmiInAppActive: hdmiInAppActive };
}());
