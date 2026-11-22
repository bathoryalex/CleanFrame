/* Alexa Check: one-off diagnostic for the TV web runtime. ES5 only.
   It answers, without signing in to anything:
   - can the app read answers from Amazon hosts that send no CORS headers?
   - does the runtime let the app set a Cookie / csrf / User-Agent header?
   - does the runtime keep third-party cookies between requests?
   Every request goes to public endpoints; no account data is involved. */
(function () {
  'use strict';
  var list = document.getElementById('list');
  var verdict = document.getElementById('verdict');
  document.getElementById('agent').textContent = 'Runtime: ' + navigator.userAgent + ' · origin: ' + location.protocol + '//' + location.host;

  document.addEventListener('keydown', function (e) {
    if (e.keyCode === 10009 || e.keyCode === 27) {
      try { tizen.application.getCurrentApplication().exit(); } catch (err) { /* browser preview */ }
    }
  });

  function row(name) {
    var li = document.createElement('li'), tag = document.createElement('span'), title = document.createElement('span'), detail = document.createElement('span');
    tag.className = 'tag wait'; tag.textContent = '…';
    title.className = 'name'; title.textContent = name;
    detail.className = 'detail';
    li.appendChild(tag); li.appendChild(title); li.appendChild(detail);
    list.appendChild(li);
    return function (ok, text) {
      tag.className = 'tag ' + (ok ? 'yes' : 'no');
      tag.textContent = ok ? 'YES' : 'NO';
      detail.textContent = text;
    };
  }

  function request(o, done) {
    var x = new XMLHttpRequest(), finished = false, refused = [];
    function finish() {
      if (finished) return; finished = true;
      var text = '';
      try { text = x.responseText || ''; } catch (e) { text = ''; }
      done({ status: x.status, text: text, refused: refused });
    }
    try {
      x.open(o.method || 'GET', o.url, true);
      x.timeout = 15000;
      if (o.credentials) x.withCredentials = true;
      var headers = o.headers || {};
      for (var k in headers) {
        if (!headers.hasOwnProperty(k)) continue;
        try { x.setRequestHeader(k, headers[k]); } catch (e) { refused.push(k); }
      }
      x.onload = finish; x.onerror = finish; x.ontimeout = finish; x.onabort = finish;
      x.send(o.body || null);
    } catch (e) {
      finished = true;
      done({ status: 0, text: '', refused: refused, error: String(e) });
    }
  }

  function snippet(r) {
    var t = (r.text || '').replace(/\s+/g, ' ').slice(0, 90);
    return 'HTTP ' + r.status + (t ? ' · ' + t : ' · no readable body') + (r.error ? ' · ' + r.error : '');
  }
  function readable(r) { return r.status > 0 && (r.text || '').length > 0; }
  function lower(obj) { var out = {}, k; for (k in obj) if (obj.hasOwnProperty(k)) out[k.toLowerCase()] = obj[k]; return out; }
  function parse(text) { try { return JSON.parse(text); } catch (e) { return null; } }

  var R = {};
  var steps = [
    function (next) {
      var mark = row('Read alexa.amazon.de (no CORS headers)');
      request({ url: 'https://alexa.amazon.de/api/bootstrap?version=0' }, function (r) { R.de = readable(r); mark(R.de, snippet(r)); next(); });
    },
    function (next) {
      var mark = row('Read alexa.amazon.com (no CORS headers)');
      request({ url: 'https://alexa.amazon.com/api/bootstrap?version=0' }, function (r) { R.com = readable(r); mark(R.com, snippet(r)); next(); });
    },
    function (next) {
      var mark = row('Read alexa.amazon.de with credentials');
      request({ url: 'https://alexa.amazon.de/api/bootstrap?version=0', credentials: true }, function (r) { R.deCred = readable(r); mark(R.deCred, snippet(r)); next(); });
    },
    function (next) {
      var mark = row('POST to api.amazon.com/auth/token (expects an error answer)');
      request({ method: 'POST', url: 'https://api.amazon.com/auth/token',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: 'source_token=invalid&source_token_type=refresh_token&requested_token_type=access_token&app_name=AlexaCheck' },
        function (r) { R.post = readable(r); mark(R.post, snippet(r)); next(); });
    },
    function (next) {
      var mark = row('Set Cookie, csrf and User-Agent headers');
      var headers = { 'Cookie': 'fhcheck=1', 'csrf': '12345', 'User-Agent': 'AlexaCheck/1' };
      function judge(r, source) {
        var body = parse(r.text), h = body && body.headers ? lower(body.headers) : null;
        if (!h) return false;
        R.cookieHeader = String(h.cookie || '').indexOf('fhcheck=1') >= 0;
        R.csrfHeader = String(h.csrf || '') === '12345';
        R.uaHeader = String(h['user-agent'] || '') === 'AlexaCheck/1';
        mark(R.cookieHeader, source + ' · Cookie: ' + (R.cookieHeader ? 'sent' : 'dropped') + ' · csrf: ' + (R.csrfHeader ? 'sent' : 'dropped') +
          ' · User-Agent: ' + (R.uaHeader ? 'sent' : 'dropped') + (r.refused.length ? ' · refused: ' + r.refused.join(', ') : ''));
        return true;
      }
      request({ url: 'https://httpbin.org/headers', headers: headers }, function (r) {
        if (judge(r, 'httpbin')) { next(); return; }
        request({ url: 'https://postman-echo.com/headers', headers: headers }, function (r2) {
          if (!judge(r2, 'postman-echo')) { R.cookieHeader = false; mark(false, 'Echo services unreachable · ' + snippet(r) + ' · ' + snippet(r2)); }
          next();
        });
      });
    },
    function (next) {
      var mark = row('Keep third-party cookies between requests');
      var value = String(Math.floor(Math.random() * 1e9));
      function attempt(base, source, fallback) {
        request({ url: base + '/cookies/set?fhjar=' + value, credentials: true }, function () {
          request({ url: base + '/cookies', credentials: true }, function (r) {
            var body = parse(r.text), cookies = body && body.cookies;
            if (!cookies) { if (fallback) { fallback(); return; } R.jar = false; mark(false, source + ' · ' + snippet(r)); next(); return; }
            R.jar = cookies.fhjar === value;
            mark(R.jar, source + ' · ' + (R.jar ? 'cookie kept' : 'cookie not kept'));
            next();
          });
        });
      }
      attempt('https://httpbin.org', 'httpbin', function () { attempt('https://postman-echo.com', 'postman-echo', null); });
    }
  ];

  function run(i) {
    if (i < steps.length) { steps[i](function () { run(i + 1); }); return; }
    var reads = (R.de || R.com) && R.post;
    if (!R.de && !R.com && !R.post) { verdict.className = 'no'; verdict.textContent = 'Result: the TV blocks Amazon’s answers. Direct access from the TV is not possible.'; }
    else if (reads && R.cookieHeader) { verdict.className = 'yes'; verdict.textContent = 'Result: direct access looks possible (route A).'; }
    else if (reads && R.jar) { verdict.className = 'yes'; verdict.textContent = 'Result: direct access looks possible, with the TV keeping the cookies itself (route B).'; }
    else { verdict.className = 'no'; verdict.textContent = 'Result: mixed. Send a photo of this screen.'; }
  }
  run(0);
}());
