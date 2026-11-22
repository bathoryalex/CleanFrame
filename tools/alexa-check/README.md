# Alexa Check

A one-off diagnostic app for the TV, separate from Frame Home (own package `AlexAlxChk`).
It finds out whether the Tizen web runtime on this TV can talk to Amazon's Alexa servers
directly, which decides whether Frame Home can show Alexa smart-home values
(for example a Matter temperature sensor) without any extra hardware or a computer running.

It signs in to nothing and sends no account data. It only checks:

1. Can the app read answers from `alexa.amazon.de` / `alexa.amazon.com` / `api.amazon.com`,
   which send no CORS headers?
2. Can the app set `Cookie`, `csrf` and `User-Agent` request headers (echoed by httpbin.org or postman-echo.com)?
3. Does the runtime keep third-party cookies between requests?

Build the unsigned package with `python3 scripts/package-alexa-check.py`, sign it like Frame Home,
install, open it once and read the result line. Uninstall it afterwards.
