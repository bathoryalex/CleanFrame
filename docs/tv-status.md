# TV status

This records what is known about the TV this fork is built for. Other models, firmware and operating systems need their own checks. Repo-only work must not contact the TV.

## Hardware and OS

| Item | This setup |
| --- | --- |
| TV | Samsung UE75U8072 |
| OS | Samsung One UI 9 (Tizen) until November 2026; updated to One UI 10 (Tizen) on 23 November 2026 |
| Firmware | S/W version `T-KSU2EFDEUC-0100-2103.1` (A0710200), read 23 November 2026 after the One UI 10 update (model code UE75U8072FUXXH). The pre-update version was not recorded; the TV's update screen had shown "current 1300 / new 6500", which appear to be a different internal field, not the S/W version. |

## After the One UI 10 update (S/W T-KSU2EFDEUC-0100-2103.1), 23 November 2026

- Right after the update, opening Frame Home showed Samsung's system message "The server is down for maintenance. Please try again later. (1544007)". The app was never reached; the text is not from Frame Home.
- Shortly afterwards both sideloaded apps, Frame Home and Nuvio Legacy, were gone from the TV. The cause is not known (Developer Mode state after the update was not recorded). They need to be installed again; their stored preferences and sign-ins are assumed lost.
- Both apps were reinstalled under the same identity (Frame Home `AlexFrmH01.FrameHome`, same author certificate; Nuvio from its own `.tpk`). Their earlier preferences and sign-ins were lost and set up again.
- **Native Home does not work on this firmware.** SDB connects and authorises the TV (`sdb devices` shows `device`, model UE75U8072), and installing `.wgt`/`.tpk` still works, but `sdb shell` runs no command — `echo HELLO` and `ls /` return no output. The native-home helper runs through an `sdb shell` privilege path and reports back over a reverse TCP connection, so it never executes and `run-device.py query/apply` times out waiting for the callback (confirmed with the firewall off, 23 November 2026). The `os.path.expandvars` fix in `run-device.py` was needed to get that far. Cursor on the user's PC reached the same result independently: `apply` is closed on this firmware.
- Observed behaviour after the update: **power-on still lands on Frame Home** (the startup/autostart path still points to it), but the **physical Home button opens Samsung Home** (`home_appid` / native Home operation reverted to `com.samsung.tv.csfs`). Settings → Samsung Home is still the escape.
- Practical workaround, no PC needed: Settings → Connections → Remote buttons → assign a colour button (or CH+/CH−/Guide) the **Home screen** action, which opens Frame Home from anywhere. Revisit the physical Home button if a working One UI 10 developer path appears.
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
