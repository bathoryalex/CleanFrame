/* Your picture: one wallpaper slot filled from a phone through an ntfy.sh topic.
   Everything here runs once per received picture, never on the navigation path:
   download, the same material recipe as scripts/build-materials.mjs (at half
   resolution for the blurred layers), and IndexedDB storage. ES5 only. */
(function () {
  'use strict';
  var W = 1920, H = 1080, HW = 960, HH = 540, DB = 'framehome', STORE = 'files', KEY = 'custom-wallpaper';

  function canvas(w, h) { var c = document.createElement('canvas'); c.width = w; c.height = h; return c; }
  var filterSupport = (function () {
    try { var x = canvas(1, 1).getContext('2d'); x.filter = 'blur(2px)'; return x.filter === 'blur(2px)'; } catch (e) { return false; }
  }());
  /* Blur with the canvas filter where available; otherwise a downscale/upscale blur. */
  function blurred(source, w, h, radius, saturation) {
    var out = canvas(w, h), ctx = out.getContext('2d'), small, sw, sh;
    if (filterSupport) {
      ctx.filter = 'blur(' + radius + 'px) saturate(' + saturation + ')';
      ctx.drawImage(source, 0, 0, w, h);
      ctx.filter = 'none';
      return out;
    }
    sw = Math.max(8, Math.round(w / Math.max(2, radius / 1.5))); sh = Math.max(8, Math.round(h / Math.max(2, radius / 1.5)));
    small = canvas(sw, sh); small.getContext('2d').drawImage(source, 0, 0, sw, sh);
    ctx.imageSmoothingEnabled = true; ctx.drawImage(small, 0, 0, w, h);
    return out;
  }
  /* Mirror the edges so blur does not darken the frame (as the build recipe does). */
  function padded(source, w, h, pad) {
    var out = canvas(w + 2 * pad, h + 2 * pad), ctx = out.getContext('2d'), x, y;
    for (y = -1; y <= 1; y++) for (x = -1; x <= 1; x++) {
      ctx.save(); ctx.translate(pad + (x === 1 ? 2 * w : 0), pad + (y === 1 ? 2 * h : 0));
      ctx.scale(x === 0 ? 1 : -1, y === 0 ? 1 : -1); ctx.drawImage(source, 0, 0, w, h); ctx.restore();
    }
    return out;
  }
  function crop(source, w, h, pad) { var out = canvas(w, h); out.getContext('2d').drawImage(source, pad, pad, w, h, 0, 0, w, h); return out; }
  var LINEAR = [], i;
  for (i = 0; i < 256; i++) LINEAR[i] = i / 255 <= .04045 ? i / 255 / 12.92 : Math.pow((i / 255 + .055) / 1.055, 2.4);
  function encode(v) { return 255 * (v <= .0031308 ? 12.92 * v : 1.055 * Math.pow(v, 1 / 2.4) - .055); }
  /* Compress highlights so white text stays readable on the glass. */
  function softenHighlights(c) {
    var ctx = c.getContext('2d'), px = ctx.getImageData(0, 0, c.width, c.height), d = px.data, j, r, g, b, l, k;
    for (j = 0; j < d.length; j += 4) {
      r = LINEAR[d[j]]; g = LINEAR[d[j + 1]]; b = LINEAR[d[j + 2]]; l = .2126 * r + .7152 * g + .0722 * b;
      if (l > .82) { k = (.82 + .4 * (l - .82)) / l; d[j] = encode(r * k); d[j + 1] = encode(g * k); d[j + 2] = encode(b * k); }
    }
    ctx.putImageData(px, 0, 0);
  }
  function toBlob(c, quality, done) {
    if (c.toBlob) { c.toBlob(function (blob) { done(blob); }, 'image/jpeg', quality); return; }
    var data = atob(c.toDataURL('image/jpeg', quality).split(',')[1]), bytes = new Uint8Array(data.length), j;
    for (j = 0; j < data.length; j++) bytes[j] = data.charCodeAt(j);
    done(new Blob([bytes], { type: 'image/jpeg' }));
  }
  /* Each step yields to the event loop so the screen keeps updating while a picture is prepared. */
  function steps(list, done) {
    var n = 0;
    (function nextStep() {
      if (n >= list.length) { done(); return; }
      try { list[n++](function () { setTimeout(nextStep, 0); }); } catch (e) { done(e); }
    }());
  }

  /* Produce every file a bundled wallpaper has: photo, thumb, panel and four materials. */
  function processImage(image, done) {
    var files = {}, photo, half, tone, scale, fr;
    steps([
      function (next) {
        var iw = image.naturalWidth || image.videoWidth || image.width, ih = image.naturalHeight || image.videoHeight || image.height;
        photo = canvas(W, H); scale = Math.max(W / iw, H / ih);
        photo.getContext('2d').drawImage(image, (W - iw * scale) / 2, (H - ih * scale) / 2, iw * scale, ih * scale);
        half = canvas(HW, HH); half.getContext('2d').drawImage(photo, 0, 0, HW, HH);
        // Light pictures get the darker top shade the bundled light photos use.
        var d = half.getContext('2d').getImageData(0, 0, HW, 180).data, sum = 0, j;
        for (j = 0; j < d.length; j += 16) sum += .2126 * LINEAR[d[j]] + .7152 * LINEAR[d[j + 1]] + .0722 * LINEAR[d[j + 2]];
        tone = sum / (d.length / 16) > .28 ? 'light' : 'dark';
        toBlob(photo, .88, function (b) { files.photo = b; next(); });
      },
      function (next) { var t = canvas(512, 288); t.getContext('2d').drawImage(photo, 0, 0, 512, 288); toBlob(t, .82, function (b) { files.thumb = b; next(); }); },
      function (next) {
        var p = padded(half, HW, HH, 48), c = crop(blurred(p, HW + 96, HH + 96, 14, .92), HW, HH, 48);
        softenHighlights(c); toBlob(c, .82, function (b) { files['field-blur'] = b; next(); });
      },
      function (next) {
        var p = padded(half, HW, HH, 48);
        fr = crop(blurred(p, HW + 96, HH + 96, 21, .92), HW, HH, 48);
        softenHighlights(fr); toBlob(fr, .82, function (b) { files['field-frost'] = b; next(); });
      },
      function (next) { var pn = canvas(320, 180); pn.getContext('2d').drawImage(fr, 0, 0, 320, 180); toBlob(pn, .85, function (b) { files.panel = b; next(); }); },
      function (next) { toBlob(blurred(photo, W, H, 2, 1.06), .86, function (b) { files['field-clear'] = b; next(); }); },
      function (next) {
        // Soft: darker, low-detail dock material with a density chosen from the dock band.
        var base = canvas(HW, HH), bc = base.getContext('2d'), grad, soft, sc, px, d, mean = [0, 0, 0], count = 0, x, y, j, k, lumas = [], high, tint;
        bc.drawImage(half, 0, 0);
        grad = bc.createLinearGradient(0, 280, 0, HH);
        grad.addColorStop(0, 'rgba(4,10,12,0)'); grad.addColorStop(.7, 'rgba(4,10,12,.42)'); grad.addColorStop(1, 'rgba(4,10,12,.52)');
        bc.fillStyle = grad; bc.fillRect(0, 280, HW, 260);
        soft = blurred(base, HW, HH, 7, 1.12); sc = soft.getContext('2d');
        px = sc.getImageData(0, 0, HW, HH); d = px.data;
        for (y = 338; y < 454; y += 2) for (x = 48; x < 912; x += 2) { j = (y * HW + x) * 4; for (k = 0; k < 3; k++) mean[k] += d[j + k]; count++; }
        for (k = 0; k < 3; k++) mean[k] /= count;
        for (j = 0; j < d.length; j += 4) for (k = 0; k < 3; k++) d[j + k] = d[j + k] * .65 + mean[k] * .35;
        for (y = 360; y < 454; y += 2) for (x = 56; x < 904; x += 2) { j = (y * HW + x) * 4; lumas.push(.2126 * d[j] + .7152 * d[j + 1] + .0722 * d[j + 2]); }
        lumas.sort(function (a, b) { return a - b; });
        high = lumas[Math.floor(lumas.length * .95)];
        tint = Math.max(.28, Math.min(.6, (high - 94) / (high - 8.87)));
        sc.putImageData(px, 0, 0); sc.fillStyle = 'rgba(4,10,12,' + tint + ')'; sc.fillRect(0, 0, HW, HH);
        toBlob(soft, .9, function (b) { files['study-soft'] = b; next(); });
      }
    ], function (err) {
      if (err) { done({ code: 'process', message: String(err && err.message || err) }); return; }
      done(null, { files: files, tone: tone, stamp: Date.now() });
    });
  }

  /* ---------- IndexedDB ---------- */
  function open(done) {
    var request;
    if (!window.indexedDB) { done(null); return; }
    try { request = indexedDB.open(DB, 1); } catch (e) { done(null); return; }
    request.onupgradeneeded = function () { request.result.createObjectStore(STORE); };
    request.onsuccess = function () { done(request.result); };
    request.onerror = request.onblocked = function () { done(null); };
  }
  function save(record, done) {
    open(function (db) {
      if (!db) { done(false); return; }
      try {
        var tx = db.transaction(STORE, 'readwrite');
        tx.objectStore(STORE).put(record, KEY);
        tx.oncomplete = function () { db.close(); done(true); };
        tx.onerror = tx.onabort = function () { db.close(); done(false); };
      } catch (e) { done(false); }
    });
  }
  function load(done) {
    open(function (db) {
      if (!db) { done(null); return; }
      try {
        var get = db.transaction(STORE, 'readonly').objectStore(STORE).get(KEY);
        get.onsuccess = function () { db.close(); done(get.result && get.result.files ? get.result : null); };
        get.onerror = function () { db.close(); done(null); };
      } catch (e) { done(null); }
    });
  }
  function urls(record) {
    var out = {};
    Object.keys(record.files).forEach(function (kind) { out[kind] = URL.createObjectURL(record.files[kind]); });
    return out;
  }

  /* ---------- ntfy.sh relay ---------- */
  function randomTopic() {
    var chars = 'abcdefghijkmnopqrstuvwxyz23456789', bytes = [], out = 'framehome-', j;
    if (window.crypto && crypto.getRandomValues) bytes = Array.prototype.slice.call(crypto.getRandomValues(new Uint8Array(20)));
    else for (j = 0; j < 20; j++) bytes.push(Math.floor(Math.random() * 256));
    for (j = 0; j < 20; j++) out += chars.charAt(bytes[j] % chars.length);
    return out;
  }
  /* Listen to the channel. One streaming request stays open (ntfy.sh allows about one request
     every five seconds per visitor, so frequent polling gets refused); old messages since
     getSince() are replayed on each connection. If the stream never opens, poll every 15 s. */
  function listen(relay, topic, getSince, on) {
    var xhr = null, timer = 0, openTimer = 0, renewTimer = 0, stopped = false, failures = 0, streaming = true, opened = false, offset = 0;
    function address(poll) { return relay + '/' + encodeURIComponent(topic) + '/json?' + (poll ? 'poll=1&' : '') + 'since=' + encodeURIComponent(getSince()); }
    function lines(text) {
      var end = text.lastIndexOf('\n'), parts, j, m;
      if (end < offset) return;
      parts = text.slice(offset, end).split('\n'); offset = end + 1;
      for (j = 0; j < parts.length; j++) {
        if (!parts[j]) continue;
        try { m = JSON.parse(parts[j]); } catch (e) { continue; }
        if (m.event === 'open') ready();
        else if (m.event === 'message') on.message(m);
      }
    }
    function ready() { if (!opened) { opened = true; failures = 0; clearTimeout(openTimer); on.state('open'); } }
    function cleanup() {
      clearTimeout(openTimer); clearTimeout(renewTimer);
      if (xhr) { var old = xhr; xhr = null; old.onprogress = old.onload = old.onerror = old.ontimeout = null; try { old.abort(); } catch (e) { /* closed */ } }
    }
    function schedule(delay) { clearTimeout(timer); if (!stopped) timer = setTimeout(connect, delay); }
    function fail(detail) {
      cleanup(); failures++; opened = false;
      on.state('retry', detail);
      schedule(Math.min(60000, 5000 * Math.pow(2, Math.min(failures - 1, 4))));
    }
    function connect() {
      var poll = !streaming, req;
      cleanup(); if (stopped) return;
      offset = 0; opened = false; req = xhr = new XMLHttpRequest();
      try { req.open('GET', address(poll), true); } catch (e) { fail('open'); return; }
      if (poll) req.timeout = 15000;
      req.onprogress = function () { if (req === xhr) lines(String(req.responseText || '')); };
      req.onload = function () {
        if (req !== xhr) return;
        if (req.status < 200 || req.status >= 300) { fail('HTTP ' + req.status); return; }
        lines(String(req.responseText || '') + '\n');
        if (poll) { ready(); opened = false; schedule(15000); } else schedule(1000);
      };
      req.onerror = function () { if (req === xhr) fail(req.status ? 'HTTP ' + req.status : 'network'); };
      req.ontimeout = function () { if (req === xhr) fail('timeout'); };
      if (!poll) {
        // ntfy starts every stream with an "open" event; a buffering network never shows it.
        openTimer = setTimeout(function () { if (req === xhr && !opened) { streaming = false; connect(); } }, 15000);
        renewTimer = setTimeout(function () { if (req === xhr) connect(); }, 600000);
      }
      try { req.send(); } catch (e) { fail('send'); }
    }
    connect();
    return { stop: function () { stopped = true; clearTimeout(timer); cleanup(); } };
  }
  function isVideo(attachment) {
    return /^video\//i.test(attachment.type || '') || /\.(mp4|m4v|webm|mov)$/i.test(attachment.name || '');
  }
  /* A cover image stored in the MP4 (moov/udta/meta/ilst/covr/data), as written by
     scripts/animate-glow.py or by ffmpeg -disposition attached_pic. */
  function coverImage(buffer) {
    // Cover art sits in the header; looking at the first 3 MB keeps large files quick.
    var b = new Uint8Array(buffer), n = Math.min(b.length - 24, 3000000), i, size, type;
    for (i = 4; i < n; i++) {
      if (b[i] !== 0x63 || b[i + 1] !== 0x6f || b[i + 2] !== 0x76 || b[i + 3] !== 0x72) continue;            // covr
      if (b[i + 8] !== 0x64 || b[i + 9] !== 0x61 || b[i + 10] !== 0x74 || b[i + 11] !== 0x61) continue;      // data
      size = ((b[i + 4] << 24) | (b[i + 5] << 16) | (b[i + 6] << 8) | b[i + 7]) >>> 0;
      type = b[i + 15];
      if (size < 24 || i + 4 + size > b.length) continue;
      return new Blob([b.subarray(i + 20, i + 4 + size)], { type: type === 14 ? 'image/png' : 'image/jpeg' });
    }
    return null;
  }
  function dark(c) {
    var d = c.getContext('2d').getImageData(0, 0, c.width, c.height).data, sum = 0, n = 0, j;
    for (j = 0; j < d.length; j += 4 * 97) { sum += d[j] + d[j + 1] + d[j + 2]; n++; }
    return sum / (n * 3) < 3;
  }
  /* A short looping video: keep the file, and find a still for the photo and glass. Samsung TVs
     play video on a hardware plane, so drawing a video frame on canvas returns black there; the
     embedded cover comes first, a canvas grab second, and `frame: null` means neither worked. */
  function fetchBuffer(url, done) {
    var xhr = new XMLHttpRequest(), finished = false, timer = setTimeout(function () { try { xhr.abort(); } catch (e) { /* gone */ } finish({ code: 'download', detail: 'timeout' }); }, 120000);
    function finish(err, value) { if (finished) return; finished = true; clearTimeout(timer); done(err, value); }
    try { xhr.open('GET', url, true); xhr.responseType = 'arraybuffer'; } catch (e) { finish({ code: 'download', detail: 'open' }); return; }
    xhr.onload = function () {
      if (xhr.status < 200 || xhr.status >= 300 || !xhr.response) finish({ code: 'download', detail: 'HTTP ' + xhr.status });
      else finish(null, xhr.response);
    };
    xhr.onerror = function () { finish({ code: 'download', detail: 'network' }); };
    try { xhr.send(); } catch (e) { finish({ code: 'download', detail: 'send' }); }
  }
  /* A file the send page split into parts (ntfy.sh takes 2 MB per attachment): fetch them in
     order and join them back into the original bytes. */
  function downloadParts(urls, progress, done) {
    var buffers = [], i = 0;
    (function next() {
      var total = 0, out, at = 0, j;
      if (i < urls.length) {
        fetchBuffer(urls[i], function (err, buffer) {
          if (err) { done(err); return; }
          buffers.push(buffer); i++; progress(i / urls.length); next();
        });
        return;
      }
      for (j = 0; j < buffers.length; j++) total += buffers[j].byteLength;
      out = new Uint8Array(total);
      for (j = 0; j < buffers.length; j++) { out.set(new Uint8Array(buffers[j]), at); at += buffers[j].byteLength; }
      done(null, out.buffer);
    }());
  }
  function downloadVideo(url, done) {
    fetchBuffer(url, function (err, buffer) { if (err) done(err); else videoFromBuffer(buffer, done); });
  }
  function videoFromBuffer(buffer, done) {
    var finished = false, timer = setTimeout(function () { finish({ code: 'decode' }); }, 60000);
    var blob = new Blob([buffer], { type: 'video/mp4' }), cover = coverImage(buffer), still;
    function finish(err, value) { if (finished) return; finished = true; clearTimeout(timer); done(err, value); }
    if (cover) {
      still = new Image();
      still.onload = function () { finish(null, { frame: still, blob: blob, source: 'cover' }); };
      still.onerror = function () { grabFrame(blob); };
      still.src = URL.createObjectURL(cover);
    } else grabFrame(blob);
    function grabFrame(blob) {
      var video = document.createElement('video'), src = URL.createObjectURL(blob), tries = 0;
      video.muted = true; video.preload = 'auto'; video.setAttribute('playsinline', '');
      function release() { video.pause(); video.removeAttribute('src'); video.load(); URL.revokeObjectURL(src); }
      function grab() {
        var frame;
        if (finished || !video.videoWidth) return;
        frame = canvas(video.videoWidth, video.videoHeight);
        try { frame.getContext('2d').drawImage(video, 0, 0); } catch (e) { /* treated as black */ }
        if (!dark(frame)) { release(); finish(null, { frame: frame, blob: blob, source: 'frame' }); return; }
        if (++tries < 3) { try { video.play(); } catch (e) { /* ignore */ } setTimeout(grab, 700); return; }
        release(); finish(null, { frame: null, blob: blob, source: 'none' });
      }
      video.onloadeddata = function () { try { video.currentTime = Math.min(.05, (video.duration || 1) / 2); } catch (e) { grab(); } };
      video.onseeked = function () { video.onseeked = null; grab(); };
      video.onerror = function () { release(); finish({ code: 'decode' }); };
      video.src = src;
    }
  }
  function isImage(attachment) {
    return /^image\//i.test(attachment.type || '') || /\.(jpe?g|png|webp|gif|bmp)$/i.test(attachment.name || '');
  }
  /* The relay serves files with CORS, so the decoded picture can be read back from canvas.
     If the direct image request fails, fetch the bytes and decode them from a local blob. */
  function download(url, done) {
    var finished = false, timer = setTimeout(function () { finish({ code: 'download', detail: 'timeout' }); }, 90000);
    function finish(err, image) { if (finished) return; finished = true; clearTimeout(timer); done(err, err ? null : image); }
    function decode(src, crossOrigin, fail) {
      var image = new Image();
      if (crossOrigin) image.crossOrigin = 'anonymous';
      image.onload = function () { if (image.naturalWidth) finish(null, image); else fail(); };
      image.onerror = fail;
      image.src = src;
    }
    decode(url, true, function () {
      var xhr = new XMLHttpRequest();
      try { xhr.open('GET', url, true); xhr.responseType = 'blob'; } catch (e) { finish({ code: 'download', detail: 'open' }); return; }
      xhr.onload = function () {
        if (xhr.status < 200 || xhr.status >= 300 || !xhr.response) { finish({ code: 'download', detail: 'HTTP ' + xhr.status }); return; }
        decode(URL.createObjectURL(xhr.response), false, function () { finish({ code: 'decode' }); });
      };
      xhr.onerror = function () { finish({ code: 'download', detail: 'network' }); };
      try { xhr.send(); } catch (e) { finish({ code: 'download', detail: 'send' }); }
    });
  }

  window.FrameCustomWallpaper = { processImage: processImage, save: save, load: load, urls: urls, randomTopic: randomTopic, listen: listen, isImage: isImage, isVideo: isVideo, download: download, downloadVideo: downloadVideo, downloadParts: downloadParts, videoFromBuffer: videoFromBuffer };
}());
