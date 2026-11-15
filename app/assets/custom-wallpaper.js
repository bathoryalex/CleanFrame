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
        photo = canvas(W, H); scale = Math.max(W / image.naturalWidth, H / image.naturalHeight);
        photo.getContext('2d').drawImage(image, (W - image.naturalWidth * scale) / 2, (H - image.naturalHeight * scale) / 2, image.naturalWidth * scale, image.naturalHeight * scale);
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
  /* Newest image attachment published after `since` (a message ID or unix seconds). */
  function poll(relay, topic, since, done) {
    var xhr = new XMLHttpRequest(), finished = false;
    function finish(err, value) { if (!finished) { finished = true; done(err, value); } }
    xhr.timeout = 10000;
    xhr.open('GET', relay + '/' + encodeURIComponent(topic) + '/json?poll=1&since=' + encodeURIComponent(since), true);
    xhr.onload = function () {
      var lines, j, m, latest = null, last = null;
      if (xhr.status < 200 || xhr.status >= 300) { finish({ code: 'relay' }); return; }
      lines = String(xhr.responseText || '').split('\n');
      for (j = 0; j < lines.length; j++) {
        if (!lines[j]) continue;
        try { m = JSON.parse(lines[j]); } catch (e) { continue; }
        if (m.event !== 'message' || m.id === since) continue;
        last = m.id;
        if (m.attachment && m.attachment.url) latest = m;
      }
      finish(null, { message: latest, lastId: last });
    };
    xhr.onerror = xhr.ontimeout = function () { finish({ code: 'relay' }); };
    try { xhr.send(); } catch (e) { finish({ code: 'relay' }); }
  }
  function isImage(attachment) {
    return /^image\//i.test(attachment.type || '') || /\.(jpe?g|png|webp|gif|bmp)$/i.test(attachment.name || '');
  }
  /* The relay serves files with CORS, so the decoded picture can be read back from canvas. */
  function download(url, done) {
    var image = new Image(), finished = false, timer = setTimeout(function () { finish({ code: 'download' }); }, 60000);
    function finish(err) { if (finished) return; finished = true; clearTimeout(timer); done(err, err ? null : image); }
    image.crossOrigin = 'anonymous';
    image.onload = function () { finish(image.naturalWidth ? null : { code: 'decode' }); };
    image.onerror = function () { finish({ code: 'decode' }); };
    image.src = url;
  }

  window.FrameCustomWallpaper = { processImage: processImage, save: save, load: load, urls: urls, randomTopic: randomTopic, poll: poll, isImage: isImage, download: download };
}());
