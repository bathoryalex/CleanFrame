'use strict';

/*
 * On-device Home watcher. It only relaunches CleanFrame after seeing it visible
 * and later receiving a positive Samsung Home visibility reply from the TV API.
 */
var http = require('http');
var SELF_ID = 'AlexFrmH01.FrameHome';
var SAMSUNG_HOME_ID = 'com.samsung.tv.csfs';
var API_HOST = '127.0.0.1';
var API_PORT = 8001;
var API_PREFIX = '/api/v2/applications/';
var POLL_MS = 1000;
var REQUEST_TIMEOUT_MS = 1500;
var HOME_GRACE_MS = 1100;
var LAUNCH_COOLDOWN_MS = 4000;
var MAX_REPLY_CHARS = 16384;
var armed = false;
var homeSince = 0;
var lastLaunch = 0;
var stopped = false;

function getStatus(appId, done) {
  var settled = false;
  var request = null;
  var body = '';
  var timer = setTimeout(function () { finish(null); }, REQUEST_TIMEOUT_MS);
  function finish(value) {
    if (settled) return;
    settled = true;
    clearTimeout(timer);
    done(value);
  }
  try {
    request = http.get({
      host: API_HOST,
      port: API_PORT,
      path: API_PREFIX + encodeURIComponent(appId)
    }, function (response) {
      response.on('data', function (chunk) {
        body += chunk.toString();
        if (body.length > MAX_REPLY_CHARS) {
          finish(null);
          if (request) request.destroy();
        }
      });
      response.on('error', function () { finish(null); });
      response.on('end', function () {
        if (response.statusCode !== 200) { finish(null); return; }
        try {
          var value = JSON.parse(body);
          if (!value || typeof value.running !== 'boolean' || typeof value.visible !== 'boolean') {
            finish(null);
            return;
          }
          finish({ running: value.running, visible: value.visible });
        } catch (error) { finish(null); }
      });
    });
    request.on('error', function () { finish(null); });
  } catch (error) { finish(null); }
}

function scheduleNext() {
  if (!stopped) setTimeout(poll, POLL_MS);
}

function tryLaunch() {
  var now = Date.now();
  if (!armed || now - lastLaunch < LAUNCH_COOLDOWN_MS) return;
  lastLaunch = now;
  try {
    tizen.application.launch(SELF_ID, function () {
      /* Wait for the TV to confirm CleanFrame is visible before re-arming. */
    }, function () {
      /* Keep armed; a later poll may retry while Samsung Home stays visible. */
    });
  } catch (error) {
    /* Keep armed; the cooldown prevents a tight retry loop. */
  }
}

function poll() {
  if (stopped) return;
  getStatus(SELF_ID, function (self) {
    if (!self) {
      scheduleNext();
      return;
    }
    if (self.visible) {
      armed = true;
      homeSince = 0;
      scheduleNext();
      return;
    }
    if (!armed) {
      scheduleNext();
      return;
    }
    getStatus(SAMSUNG_HOME_ID, function (home) {
      if (!home) {
        homeSince = 0;
      } else if (home.visible) {
        if (!homeSince) homeSince = Date.now();
        if (Date.now() - homeSince >= HOME_GRACE_MS) tryLaunch();
      } else {
        /* Another app, HDMI input or unknown foreground: stand aside. */
        homeSince = 0;
      }
      scheduleNext();
    });
  });
}

/* No boot-time launch: wait until the user has opened CleanFrame once. */
setTimeout(poll, POLL_MS);
