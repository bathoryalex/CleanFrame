/* Public Tizen application APIs. No Mac server, network address or credentials. */
(function () {
  'use strict';
  var IDS = {
    youtube: '9Ur5IzDKqV.TizenYouTube',
    spotify: 'rJeHak5zRg.Spotify',
    hbomax: '5b8c3eb16b.BeamCTVDev',
    browser: 'org.tizen.browser',
    nuvio: 'NuvioTV002.Nuvio',
    nuvioWgt: 'NuvioTV002.NuvioNative',
    smartthings: 'com.samsung.tv.SmartThingsApp'
  };
  var HDMI_VIEWER = 'org.tizen.tv-viewer';
  var HDMI_FULL = ['0px', '0px', '1920px', '1080px'];
  var STREAMING = ['5b8c3eb16b.BeamCTVDev', 'rJeHak5zRg.Spotify', 'tjusFNQffm.HBOMAX',
    '3202301029760', '3201601007230', '3202311033054', '3201910019378', '3201710015016'];
  var CONSUMER_SYSTEM = ['org.tizen.browser', 'com.microsoft.copilot'];
  var EXTRA_BRANDS = {
    'rJeHak5zRg.Spotify': 'spotify',
    '5b8c3eb16b.BeamCTVDev': 'hbomax',
    'tjusFNQffm.HBOMAX': 'hbomax',
    'NuvioTV002.Nuvio': 'nuvio',
    'NuvioTV002.NuvioNative': 'nuvio',
    'com.samsung.tv.SmartThingsApp': 'smartthings'
  };
  var INTERNAL = ['adplatform.ADPlayer', 'WykOS4t4F0.cmsWebApp', '25emanual3.emanual',
    'ZODRT12q2l.WebAccountExtension', 'ByJlgt0XeD.CastSettingsApp', 'tv6pbVMQFF.PrivacyChoices'];
  var SELF = 'AlexFrmH01.FrameHome';
  /* Mirror PRIMARY_APPS in main.js so the browser preview lists the same home shortcuts. */
  var PREVIEW_APPS = [
    { appId: 'hdmi-1', name: 'Xbox', brand: 'xbox', icon: '' },
    { appId: 'hdmi-2', name: 'Nintendo Switch', brand: 'nintendoswitch', icon: '' },
    { appId: 'NuvioTV002.Nuvio', name: 'Nuvio Legacy', brand: 'nuvio', icon: '' },
    { appId: '9Ur5IzDKqV.TizenYouTube', name: 'YouTube', brand: 'youtube', icon: '' },
    { appId: 'rJeHak5zRg.Spotify', name: 'Spotify', brand: 'spotify', icon: '' },
    { appId: '5b8c3eb16b.BeamCTVDev', name: 'HBO Max', brand: 'hbomax', icon: '' },
    { appId: 'com.samsung.tv.SmartThingsApp', name: 'SmartThings', brand: 'smartthings', icon: '' },
    { appId: 'org.tizen.browser', name: 'Internet', brand: 'browser', icon: '' }
  ];
  var hdmiInApp = false;
  function api() { return window.tizen && window.tizen.application; }
  function forkName() { return window.FrameFork && window.FrameFork.displayName || 'CleanFrame'; }
  function unavailable(done) {
    done({ message: 'Open ' + forkName() + ' on the TV to use this control.', detail: 'The web preview cannot control the TV.' });
  }
  function failure(err) {
    return { message: 'The TV could not open this screen.', detail: err && (err.message || err.name) || 'Try again, or press the remote’s Home button to return to CleanFrame.' };
  }
  function bounded(done) {
    var finished = false, timer = setTimeout(function () { finish({ message: 'The TV did not respond. Please try again.' }); }, 12000);
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
          message: 'Could not open ' + hdmiPortLabel(port) + '.',
          detail: 'The TV did not report that HDMI port. Check the cable, then try again.'
        });
        return;
      }
      setHdmiSource(source, function (switched) {
        if (!switched) {
          finish({
            message: 'Could not open ' + hdmiPortLabel(port) + '.',
            detail: 'The TV could not switch to that input. Try again in a moment.'
          });
          return;
        }
        launchHdmiViewer(function (viewerOk) {
          if (viewerOk) { finish(null, { mode: 'viewer' }); return; }
          showHdmiFullscreen(function (shown) {
            if (!shown) {
              finish({
                message: 'Could not show ' + hdmiPortLabel(port) + '.',
                detail: 'The input changed, but the TV could not open the viewer or full-screen window.'
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
    if (!port) { done({ message: 'This HDMI shortcut is not configured.' }); return; }
    openHdmiPort(port, bounded(done));
  }
  function launchApp(id, done) {
    if (hdmiPort(id)) { launchHdmi(id, done); return; }
    if (!api()) { unavailable(done); return; }
    var finish = bounded(done);
    try { api().launch(id, function () { finish(null); }, function (err) { finish(failure(err)); }); }
    catch (err) { finish(failure(err)); }
  }
  function launch(brand, done) {
    if (!IDS[brand]) { done({message: 'This app has no launch target.'}); return; }
    launchApp(IDS[brand], done);
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
        var known = {}, seen = {}, result = [];
        Object.keys(IDS).forEach(function (brand) { known[IDS[brand]] = brand; });
        list.forEach(function (a) {
          var primary = !!known[a.id], stream = STREAMING.indexOf(a.id) >= 0;
          var nuvio = a.id === IDS.nuvio || a.id === IDS.nuvioWgt;
          var consumer = /^[A-Za-z0-9]{10}\.[A-Za-z0-9_-]+$/.test(a.id) || CONSUMER_SYSTEM.indexOf(a.id) >= 0;
          if (a.id === SELF || INTERNAL.indexOf(a.id) >= 0 || seen[a.id] || !a.name || (!primary && !stream && !nuvio && (!a.show || !consumer))) return;
          if (!primary && !nuvio && /(?:service|worker|preview|promotion|plugin|launcher|test|sdk|^ep[ -]|factory|daemon)/i.test(a.name + ' ' + a.id)) return;
          if (/-dummy$/.test(a.id) || a.id === 'com.samsung.tv.cobalt-yt') return;
          seen[a.id] = true;
          result.push({ appId: a.id, name: a.name, brand: known[a.id] || EXTRA_BRANDS[a.id] || (nuvio ? 'nuvio' : ''), icon: a.iconPath || '', rank: primary ? Object.keys(IDS).indexOf(known[a.id]) : (nuvio ? 5 : (stream ? 20 : 30)) });
        });
        result.sort(function (a, b) { return a.rank - b.rank || a.name.toLowerCase().localeCompare(b.name.toLowerCase()); });
        finish(null, result);
      }, function (err) { finish(failure(err)); });
    } catch (err) { finish(failure(err)); }
  }
  window.FrameDevice = { launch: launch, launchApp: launchApp, home: home, settings: settings, apps: apps,
    hideHdmiView: hideHdmiView, hdmiInAppActive: hdmiInAppActive };
}());
