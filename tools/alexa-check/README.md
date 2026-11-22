# Alexa Check

A diagnostic app for the TV, separate from Frame Home (own package `AlexAlxChk`).
It finds out whether the Tizen web runtime on this TV can read Alexa smart-home devices
(for example a Matter temperature sensor paired to an Echo) directly, without extra hardware
and without a computer.

## 0.1 (no sign-in)

Checked whether the runtime reads answers from Amazon hosts without CORS headers, whether it lets
the app set `Cookie` / `csrf` / `User-Agent` headers, and whether it keeps third-party cookies.
Result on a 2025 Samsung TV (Tizen 9.0): answers readable, `Cookie` and `User-Agent` refused,
custom headers sent, third-party cookies kept.

## 0.2 (sign-in from the phone)

1. The TV makes a PKCE pair and shows a QR code to `docs/alexa/` (GitHub Pages) with the channel
   name, the challenge and the client id in the URL fragment.
2. On the phone you sign in on Amazon's own page, then paste the address of the empty page Amazon
   lands on. The page forwards only the one-time authorization code through ntfy.sh.
3. The TV registers itself (`api.amazon.com/auth/register`, same flow as the Alexa iOS app, after
   aioamazondevices) and keeps the refresh token in its local storage.
4. It then tries Bearer, `x-amz-access-token` and cookie-jar access to `alexa.amazon.<site>` and,
   with the first that works, lists devices with a temperature or an on/off state.

Result on the same TV: registration worked, `Authorization: Bearer` worked for `api/users/me` and the
GraphQL device list, `x-amz-access-token` and the cookie-jar routes did not. All 76 devices were listed
with their temperatures and on/off states. Frame Home's `app/assets/alexa.js` uses the Bearer route.

The registration shows up in the Amazon account as a device named "<first name>'s Frame Home" and can
be removed there. Uninstalling the app deletes the saved sign-in. Red button: forget it and start again.

Build the unsigned package with `python3 scripts/package-alexa-check.py` and sign it like Frame Home.
