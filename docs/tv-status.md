# TV status

This records what is known about the TV this fork is built for. Other models, firmware and operating systems need their own checks. Repo-only work must not contact the TV.

## Hardware and OS

| Item | This setup |
| --- | --- |
| TV | Samsung UE75U8072 |
| OS | Tizen 9 |
| Firmware | Not recorded yet; note it here before any native Home work |
| Web engine | Exact Chromium/WebKit version has not been recorded; keep runtime JavaScript ES5-compatible |

Developer Mode, signing material, the TV's network address and recovery files are private local configuration in ignored `.local/`.

## App and identity

- Package: `AlexFrmH01`
- Application: `AlexFrmH01.FrameHome`
- Display name: `Frame Home`

The app is signed with my own author and distributor certificates. Keep this identity stable: the native Home assignment and the app's self-filter in `app/fork.js` depend on it.

## Known on this TV

- Frame Home installs and opens from the app list.
- The HDMI tiles switch input with `tizen.tvwindow` and open Samsung's TV viewer (`org.tizen.tv-viewer`). If the viewer cannot open, the input is shown inside Frame Home and Back returns to the Home row.
- Nuvio Legacy is the native `.tpk` build (`NuvioTV002.Nuvio`), signed for this TV.

## Still to check physically

Record the app version, firmware and the observed result when one of these is confirmed:

1. Remote Home routing to Frame Home after the optional native Home step ([alex-native-home.md](alex-native-home.md)), and the Settings → Samsung Home escape.
2. Normal power-on after a streaming app or Art Mode.
3. Readability of the Hungarian interface, 12-hour clock and weather caption from the sofa.

Browser and package checks establish source behaviour and archive contents only; they are not TV results. See [testing](testing.md).
