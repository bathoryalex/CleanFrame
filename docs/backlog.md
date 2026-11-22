# Ideas for later

Agreed with the owner, not started. Each note says enough to pick the work up again.

## Your picture without ntfy.sh (local send)

Send photos and videos from the phone straight to the TV over the home Wi‑Fi, with no external relay.

- A Tizen web **service** app inside the package runs a small HTTP server on the TV. It serves the send page itself and receives uploads; the QR code shows the TV's local address (for example `http://192.168.1.50:8085`).
- No 2 MB parts or phone-side compression; videos in original quality, with an upload limit of about **40 MB**. Larger files risk the app's memory and storage while the upload is received and stored, not playback (playback is hardware-decoded and costs the same whatever the file size).
- Only works when the phone is on the same network as the TV.
- Keep ntfy.sh as the fallback: if the local server does not start, the QR code switches to the current send page.
- Risks: the service app type and the server are untested on this TV (UE75U8072, Tizen 9) and may need a few install rounds; signing with a service app included may need checking.

## Animations setting (reduced motion on the TV)

An in-app switch for the TV, because the system "reduce motion" signal may never reach the app there.

- Today the app only follows the browser/OS `prefers-reduced-motion` media query (`REDUCED_MOTION` in `app/main.js` and the `@media (prefers-reduced-motion: reduce)` rules in `app/style.css`). Whether Tizen 9 on the UE75U8072 exposes such a setting to web apps is not known or tested.
- Proposal: Settings → Focus → **Animations: On / Reduced**, saved with the other preferences. Reduced adds a stage class (for example `motion-reduced`) that applies the same rules as the media query, and sets `REDUCED_MOTION` for the script-driven animations (flip clock, Spotify device list growth, lyrics, dock and focus transitions).
- Keep the media query too, so either source turns animations down.
