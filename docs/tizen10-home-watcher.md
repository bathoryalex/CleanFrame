# Tizen Home watcher: build, install and test

> **Experimental; not verified on Tizen 10.** The target UE75U8072 was updated to One UI 10 / Tizen on 23 November 2026. The watcher source in this branch has not been built for or run on that TV. Treat every step below as a test plan, not a compatibility claim.

This is an on-device WRT service based on the useful parts of [AeroTizen's watcher](https://github.com/helalaou/AeroTizen): start a service at boot, query the TV's local applications API, wait for Samsung Home to remain visible, then launch the target app. CleanFrame uses the fixed target ID **AlexFrmH01.FrameHome** and Samsung Home ID **com.samsung.tv.csfs**.

The watcher does **not** intercept the Home key. It waits until the TV reports Samsung Home visible after CleanFrame has been visible, then asks Tizen to launch CleanFrame. It does not launch CleanFrame at boot, does not write native Home/startup settings, and stands aside when status is missing or a different app/input is visible. It can only react when the TV reports the relevant app visibility through its local API.

## Build and install

1. Check out this branch and install the repository's development dependencies:

   ```sh
   git clone https://github.com/bathoryalex/CleanFrame.git
   cd CleanFrame
   git switch feature/tizen10-home-watcher
   npm ci
   ```

2. Run the repository source check:

   ```sh
   npm run check
   ```

   This checks the app source. It does not emulate the Tizen service or prove TV compatibility.

3. Build a signed widget with the same CleanFrame application ID and author certificate already used on the TV. On the maintainer's configured machine, the command is:

   ```sh
   npm run package
   ```

   Do not change AlexFrmH01.FrameHome or the signing identity for an in-place update. Keep private certificates and generated .wgt files local. If your checkout does not have the existing signing setup, use your own Tizen Studio signing profile and the repository's setup guide.

4. Install the signed widget using the configured TV connection:

   ```sh
   npm run tv:install
   ```

   The TV must be in Developer Mode and reachable through the existing SDB setup. This step updates the app package; it does not invoke scripts/native-home/run-device.py and does not change the native Home assignment.

5. Fully restart the TV after installation so Tizen can start the on-boot service. Open Frame Home once; the watcher arms only after it observes Frame Home as visible.

## Test plan for a physical TV

Record the TV model, full firmware version, date, and each observed result. Do not mark the Tizen 10 row as passed until it has been repeated after a full restart.

| Check | Expected result | Result |
| --- | --- | --- |
| Install/update same ID and certificate | Frame Home opens and its saved settings remain present | Not tested |
| Cold boot without opening Frame Home first | Watcher does not open Frame Home by itself | Not tested |
| Open Frame Home, launch a regular app, then press the physical Home button | If Samsung Home is reported visible, Frame Home opens after a short delay | Not tested |
| Open Frame Home, launch YouTube/Prime Video, then press Home | Frame Home opens only if the TV API reports Samsung Home visible; record app-specific behavior | Not tested |
| Open Frame Home, switch to another app without returning to Samsung Home | Watcher stays aside | Not tested |
| Open Settings → System → Samsung Home | Samsung Home stays open unless a later app-visible transition causes a new watcher event | Not tested |
| Check native Home/startup values before and after | Values are unchanged by the watcher | Not tested |
| Restart again and repeat the Home check | Service resumes and behavior matches the first run | Not tested |

AeroTizen documents similar limits: some apps do not report visibility, so a watcher cannot reliably distinguish Samsung Home from those apps. If AlexFrmH01.FrameHome never returns, inspect logs and verify whether /api/v2/applications/com.samsung.tv.csfs reports visible: true on that firmware. An absent, malformed, timed-out, or different response is intentionally treated as “do nothing.”

## Disable and recover

To disable the watcher while keeping Frame Home installed, remove the tizen:service block with ID AlexFrmH01.HomeWatcher from app/config.xml, rebuild with the same signing identity, and install that update. This removes the background service on the next package update. The app's Home UI, preferences, app identity and native Home helper are separate.

The current UE75U8072 record says its native Home route is Samsung Home after the One UI 10 update, and the existing SDB shell-based native helper did not run on that firmware. This watcher makes no claim to repair that native route. Keep the Samsung Home escape available in Frame Home, and use the existing private original snapshot only if the native Home helper had previously changed settings and its restore path is available.
