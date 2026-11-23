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
- Considered and rejected (not attempted on this TV): a published method remaps the dedicated branded remote buttons (e.g. Netflix) by grabbing the physical input device (`evdev`/`uinput`) and persists across reboot with a raw write to the TV's root partition at a firmware-specific byte offset. It needs a separate root exploit this fork does not have (our helper only reaches the restricted UID 901, which is already closed on this firmware), was demonstrated on a 2020 Tizen 5.5 set, and the author states the partition offset is not portable between models. The bricking risk on a mismatched offset is not worth the convenience; not pursued.
| Web engine | Exact Chromium/WebKit version has not been recorded; keep runtime JavaScript ES5-compatible |

Developer Mode, signing material, the TV's network address and recovery files are private local configuration in ignored `.local/`.

## App and identity

- Package: `AlexFrmH01`
- Application: `AlexFrmH01.FrameHome`
- Display name: `Frame Home`

The app is signed with my own author and distributor certificates. Keep this identity stable: the native Home assignment and the app's self-filter in `app/fork.js` depend on it.

Signing with Apps2Samsung on this TV: use **Level = Automatic** (which resolves to the **Public** certificate, since Frame Home needs no restricted privilege). An in-place update only works when the new package is signed with the **same** certificate as the installed copy, and Public and Partner are different certificates — forcing **Partner** makes the TV refuse the update and offer only remove-and-install (which erases the app's settings and sign-ins). Keep "Always create a new certificate" off and "Install over installed version" on. Observed 23 November 2026: the 0.34 update was refused on Partner and succeeded in place on Automatic/Public with no data loss.

## Known on this TV

- Frame Home installs and opens from the app list.
- The HDMI tiles switch input with `tizen.tvwindow` and open Samsung's TV viewer (`org.tizen.tv-viewer`). If the viewer cannot open, the input is shown inside Frame Home and Back returns to the Home row.
- Nuvio Legacy is the native `.tpk` build (`NuvioTV002.Nuvio`), signed for this TV.
- Backup and restore (0.34) was verified on the TV on 23 November 2026: a backup was made, saved to the phone from the backup page, and restored. A change-then-restore check also passed — the layout was changed, then restoring from the backup reverted it to the saved state.

## Still to check physically

Record the app version, firmware and the observed result when one of these is confirmed:

1. Remote Home routing to Frame Home after the optional native Home step ([alex-native-home.md](alex-native-home.md)), and the Settings → Samsung Home escape.
2. Normal power-on after a streaming app or Art Mode.
3. Readability of the Hungarian interface, 12-hour clock and weather caption from the sofa.

Browser and package checks establish source behaviour and archive contents only; they are not TV results. See [testing](testing.md).
